'use strict';

/**
 * Paw Tools AI endpoint for petsinmycity.com.
 *
 * Hardening applied here:
 *   - POST/OPTIONS only, 8 KB body cap enforced before JSON.parse;
 *   - CORS restricted to petsinmycity.com plus approved preview origins;
 *   - a closed tool allow-list, and per-tool STRUCTURED input validation
 *     (species, weight + unit, age + unit, symptoms, food quantity) instead of
 *     an arbitrary free-text `message`;
 *   - durable per-client and site-wide rate limits;
 *   - a hard timeout on the paid upstream call;
 *   - stable JSON error codes; provider messages never reach the browser;
 *   - a DETERMINISTIC veterinary safety layer that answers red-flag inputs
 *     itself, before and instead of the model call.
 *
 * Runtime: Node 20 (netlify.toml / .nvmrc).
 */

const Anthropic = require('@anthropic-ai/sdk');

const cors = require('../lib/cors');
const guard = require('../lib/request-guard');
const { errorResponse, jsonResponse } = require('../lib/errors');
const rateLimit = require('../lib/rate-limit');
const log = require('../lib/log');
const validate = require('../lib/validate');
const safety = require('../lib/safety/vet-safety');
const schema = require('../lib/pet-tools-schema');

const ENDPOINT = 'pet-tools';
const MAX_BODY_BYTES = 8 * 1024;
const MODEL = process.env.PET_TOOLS_MODEL || 'claude-sonnet-4-5';
const MAX_TOKENS = 1000;
const UPSTREAM_TIMEOUT_MS = 25000;

function limits(env) {
  return {
    client: [
      { name: 'minute', windowSeconds: 60, max: rateLimit.envLimit(env, 'PET_TOOLS_CLIENT_PER_MIN', 6) },
      { name: 'hour', windowSeconds: 3600, max: rateLimit.envLimit(env, 'PET_TOOLS_CLIENT_PER_HOUR', 40) },
      { name: 'day', windowSeconds: 86400, max: rateLimit.envLimit(env, 'PET_TOOLS_CLIENT_PER_DAY', 120) },
    ],
    global: [
      { name: 'minute', windowSeconds: 60, max: rateLimit.envLimit(env, 'PET_TOOLS_GLOBAL_PER_MIN', 90) },
      { name: 'day', windowSeconds: 86400, max: rateLimit.envLimit(env, 'PET_TOOLS_GLOBAL_PER_DAY', 4000) },
    ],
  };
}

/**
 * Injectable for tests. Defaults to the Anthropic SDK with an explicit key,
 * an upstream timeout and no silent retries (a retry storm on a paid endpoint
 * is its own outage).
 */
async function defaultCreateMessage(apiKey, systemPrompt, userText) {
  const client = new Anthropic({ apiKey: apiKey, timeout: UPSTREAM_TIMEOUT_MS, maxRetries: 1 });
  return client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userText }],
  });
}

exports.handler = async function handler(event, context, deps) {
  const env = process.env;
  const createMessage = (deps && deps.createMessage) || defaultCreateMessage;
  const corsResult = cors.evaluate(event, env);

  if (!corsResult.allowed) {
    log.emit({ endpoint: ENDPOINT, outcome: 'origin_rejected', status: 403 });
    return errorResponse('origin_not_allowed', corsResult.headers);
  }

  const checked = guard.guard(event, { maxBodyBytes: MAX_BODY_BYTES });
  if (checked.preflight) return { statusCode: 204, headers: corsResult.headers, body: '' };
  if (checked.error) {
    log.emit({ endpoint: ENDPOINT, outcome: checked.error });
    return errorResponse(checked.error, corsResult.headers);
  }

  const body = checked.body;

  const tool = validate.enumValue(body.tool, schema.TOOL_IDS);
  if (!tool.ok) {
    log.emit({ endpoint: ENDPOINT, outcome: 'invalid_request', reason: 'unknown_tool' });
    return errorResponse('invalid_request', corsResult.headers, { field: 'tool' });
  }
  const toolId = tool.value;

  // Structured input for the clinical tools, a single bounded string otherwise.
  const request = schema.buildRequest(toolId, body.input && typeof body.input === 'object' ? body.input : body);
  if (!request.ok) {
    log.emit({ endpoint: ENDPOINT, outcome: 'invalid_request', reason: toolId + ':' + request.field + ':' + request.reason });
    return errorResponse('invalid_request', corsResult.headers, { field: request.field });
  }

  const isHealthTool = schema.HEALTH_TOOLS.indexOf(toolId) !== -1;
  const zipHint = (function () {
    const zip = validate.usZip(body.zip == null ? '' : body.zip);
    return zip.ok ? zip.value : null;
  }());

  /* ---------------------------------------------------------------- *
   * DETERMINISTIC SAFETY LAYER - before the model call.
   * `request.subject` is the owner's own words only, so our template copy
   * cannot trip the classifier, and a prompt-injected instruction inside
   * those words is treated as data, not as an instruction.
   * ---------------------------------------------------------------- */
  const classification = safety.classify(request.subject);
  if (classification.emergency) {
    const emergency = safety.buildEmergencyResponse(classification, { zip: zipHint });
    log.emit({
      endpoint: ENDPOINT, outcome: 'safety_emergency', status: 200,
      category: toolId + ':' + classification.categories.map(function (c) { return c.id; }).join('+'),
    });
    return jsonResponse(200, {
      ok: true,
      tool: toolId,
      text: emergency.text,
      safety: emergency,
      // Back-compat with the existing front-end result renderer.
      content: [{ type: 'text', text: emergency.text }],
    }, corsResult.headers);
  }

  const refused = safety.refusedTopic(request.subject);
  if (refused) {
    const advisory = safety.buildAdvisory(classification);
    const text = refused.response;
    log.emit({ endpoint: ENDPOINT, outcome: 'safety_refused', status: 200, category: refused.id });
    return jsonResponse(200, {
      ok: true, tool: toolId, text: text, safety: advisory,
      content: [{ type: 'text', text: text }],
    }, corsResult.headers);
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    log.emit({ endpoint: ENDPOINT, outcome: 'missing_configuration', status: 503 });
    return errorResponse('service_unavailable', corsResult.headers);
  }

  const rules = limits(env);
  const globalCheck = await rateLimit.consume({
    endpoint: ENDPOINT, scope: 'global', identifier: 'all', rules: rules.global, env: env,
  });
  if (!globalCheck.allowed) {
    log.emit({ endpoint: ENDPOINT, outcome: 'rate_limited', limit_scope: 'global', status: 429 });
    return errorResponse('rate_limited',
      Object.assign({ 'Retry-After': String(globalCheck.retryAfterSeconds) }, corsResult.headers),
      { retry_after_seconds: globalCheck.retryAfterSeconds });
  }
  const clientCheck = await rateLimit.consume({
    endpoint: ENDPOINT, scope: 'client', identifier: guard.clientKey(event, env), rules: rules.client, env: env,
  });
  if (!clientCheck.allowed) {
    log.emit({ endpoint: ENDPOINT, outcome: 'rate_limited', limit_scope: 'client', status: 429 });
    return errorResponse('rate_limited',
      Object.assign({ 'Retry-After': String(clientCheck.retryAfterSeconds) }, corsResult.headers),
      { retry_after_seconds: clientCheck.retryAfterSeconds });
  }

  try {
    const response = await createMessage(apiKey, schema.TOOL_PROMPTS[toolId], request.text);
    const blocks = response && Array.isArray(response.content) ? response.content : [];
    const text = blocks
      .filter(function (b) { return b && b.type === 'text' && typeof b.text === 'string'; })
      .map(function (b) { return b.text; })
      .join('\n')
      .trim();

    if (!text) {
      log.emit({ endpoint: ENDPOINT, outcome: 'upstream_empty' });
      return errorResponse('upstream_unavailable', corsResult.headers);
    }

    log.emit({ endpoint: ENDPOINT, outcome: 'ok', status: 200, category: toolId });
    return jsonResponse(200, {
      ok: true,
      tool: toolId,
      text: text,
      // Attached server-side AFTER the model call: a prompt-injected reply
      // cannot remove the disclaimer or downgrade the classification.
      safety: isHealthTool ? safety.buildAdvisory(classification) : null,
      content: [{ type: 'text', text: text }],
    }, corsResult.headers);
  } catch (err) {
    const status = err && typeof err.status === 'number' ? err.status : null;
    const timedOut = !!(err && (err.name === 'APIConnectionTimeoutError' || err.name === 'AbortError' || err.timeout === true));
    const code = timedOut ? 'upstream_timeout' : (status === 429 ? 'rate_limited' : 'upstream_unavailable');
    log.emit({ endpoint: ENDPOINT, outcome: code, upstream_status: status, error_class: log.errorClass(err) });
    return errorResponse(code, corsResult.headers);
  }
};

exports._internal = { limits, defaultCreateMessage, MAX_BODY_BYTES };
