'use strict';

/**
 * Lucy AI chat proxy for petsinmycity.com.
 *
 * Forwards browser messages to api.anthropic.com using the ANTHROPIC_API_KEY
 * environment variable. The browser must never see the key, and must never see
 * a provider error message either (Anthropic error bodies can echo request
 * details, and a leaked 401 body tells an attacker exactly what to probe).
 *
 * Hardening applied here:
 *   - POST/OPTIONS only, 16 KB body cap enforced before JSON.parse;
 *   - CORS restricted to petsinmycity.com plus approved preview origins;
 *   - full validation of the message array (roles, types, counts, lengths);
 *   - durable per-client and site-wide rate limits;
 *   - a hard timeout on the paid upstream call;
 *   - a DETERMINISTIC veterinary safety layer that runs BEFORE the model call
 *     and answers emergencies itself, so emergency advice is never delayed by,
 *     or overridable by, the model.
 *
 * Runtime: Node 20 (netlify.toml / .nvmrc). Uses the built-in global fetch.
 */

const cors = require('../lib/cors');
const guard = require('../lib/request-guard');
const { errorResponse, jsonResponse } = require('../lib/errors');
const rateLimit = require('../lib/rate-limit');
const log = require('../lib/log');
const validate = require('../lib/validate');
const safety = require('../lib/safety/vet-safety');
const { SYSTEM_PROMPT } = require('../lib/lucy-system-prompt');
const { fetchWithTimeout, UpstreamTimeoutError } = require('../lib/fetch-timeout');

const ENDPOINT = 'lucy-chat';
const MAX_BODY_BYTES = 16 * 1024;
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 4000;
const MODEL = process.env.LUCY_MODEL || 'claude-sonnet-4-5';
const MAX_TOKENS = 1000;
const UPSTREAM_TIMEOUT_MS = 25000;

function limits(env) {
  return {
    client: [
      { name: 'minute', windowSeconds: 60, max: rateLimit.envLimit(env, 'LUCY_CLIENT_PER_MIN', 8) },
      { name: 'hour', windowSeconds: 3600, max: rateLimit.envLimit(env, 'LUCY_CLIENT_PER_HOUR', 60) },
      { name: 'day', windowSeconds: 86400, max: rateLimit.envLimit(env, 'LUCY_CLIENT_PER_DAY', 200) },
    ],
    global: [
      { name: 'minute', windowSeconds: 60, max: rateLimit.envLimit(env, 'LUCY_GLOBAL_PER_MIN', 120) },
      { name: 'day', windowSeconds: 86400, max: rateLimit.envLimit(env, 'LUCY_GLOBAL_PER_DAY', 5000) },
    ],
  };
}

/**
 * Validate the conversation array.
 *
 * Only `user` and `assistant` roles are accepted, only string content, and the
 * array is capped at MAX_MESSAGES entries of MAX_MESSAGE_CHARS each - both to
 * bound the paid token spend and to stop a caller stuffing an arbitrary
 * document through our key.
 */
function readMessages(body) {
  if (!Array.isArray(body.messages)) return { ok: false, reason: 'messages_not_array' };
  if (body.messages.length === 0) return { ok: false, reason: 'messages_empty' };
  if (body.messages.length > 200) return { ok: false, reason: 'messages_too_many' };

  const out = [];
  for (const raw of body.messages.slice(-MAX_MESSAGES)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'message_not_object' };
    if (raw.role !== 'user' && raw.role !== 'assistant') return { ok: false, reason: 'bad_role' };
    if (typeof raw.content !== 'string') return { ok: false, reason: 'content_not_string' };
    const content = validate.boundedString(raw.content, { min: 1, max: MAX_MESSAGE_CHARS, maxRaw: MAX_MESSAGE_CHARS * 2 });
    if (!content.ok) {
      // An empty assistant turn is dropped rather than rejected: the widget can
      // produce one after a failed request.
      if (content.reason === 'too_short') continue;
      return { ok: false, reason: 'content_' + content.reason };
    }
    out.push({ role: raw.role, content: content.value });
  }
  if (!out.length) return { ok: false, reason: 'messages_empty' };
  if (out[out.length - 1].role !== 'user') return { ok: false, reason: 'last_message_not_user' };
  return { ok: true, value: out };
}

/** Optional ZIP hint used only to anchor the emergency search link. */
function readZipHint(body) {
  if (body.zip == null) return null;
  const zip = validate.usZip(body.zip);
  return zip.ok ? zip.value : null;
}

async function callAnthropic(apiKey, messages) {
  const payload = JSON.stringify({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: messages,
  });

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: payload,
  }, UPSTREAM_TIMEOUT_MS);

  if (!res.ok) {
    // The provider body is read but never returned to the browser.
    return { ok: false, code: res.status === 429 ? 'rate_limited' : 'upstream_unavailable', httpStatus: res.status };
  }
  let data;
  try {
    data = await res.json();
  } catch (_) {
    return { ok: false, code: 'upstream_unavailable' };
  }
  const block = data && Array.isArray(data.content) ? data.content.find(function (c) { return c && c.type === 'text'; }) : null;
  const text = block && typeof block.text === 'string' ? block.text : '';
  if (!text) return { ok: false, code: 'upstream_unavailable' };
  return { ok: true, text: text };
}

exports.handler = async function handler(event) {
  const env = process.env;
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

  const messages = readMessages(checked.body);
  if (!messages.ok) {
    log.emit({ endpoint: ENDPOINT, outcome: 'invalid_request', reason: messages.reason });
    return errorResponse('invalid_request', corsResult.headers);
  }

  const lastUserText = messages.value[messages.value.length - 1].content;
  const zipHint = readZipHint(checked.body);

  /* ---------------------------------------------------------------- *
   * DETERMINISTIC SAFETY LAYER - runs before the model call.
   * A red flag is answered here and now. No network round-trip, so the
   * emergency advice is never delayed, and no model output exists that
   * could contradict it.
   * ---------------------------------------------------------------- */
  const classification = safety.classify(lastUserText);
  if (classification.emergency) {
    const emergency = safety.buildEmergencyResponse(classification, { zip: zipHint });
    log.emit({
      endpoint: ENDPOINT, outcome: 'safety_emergency', status: 200,
      category: classification.categories.map(function (c) { return c.id; }).join('+'),
    });
    return jsonResponse(200, { ok: true, reply: emergency.text, safety: emergency }, corsResult.headers);
  }

  const refused = safety.refusedTopic(lastUserText);
  if (refused) {
    const advisory = safety.buildAdvisory(classification);
    log.emit({ endpoint: ENDPOINT, outcome: 'safety_refused', status: 200, category: refused.id });
    return jsonResponse(200, {
      ok: true,
      reply: refused.response + '\n\n_' + advisory.disclaimer + '_',
      safety: advisory,
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
    const result = await callAnthropic(apiKey, messages.value);
    if (!result.ok) {
      log.emit({ endpoint: ENDPOINT, outcome: result.code, upstream_status: result.httpStatus });
      return errorResponse(result.code, corsResult.headers);
    }
    log.emit({ endpoint: ENDPOINT, outcome: 'ok', status: 200 });
    // The advisory envelope is attached server-side, after the model call, so a
    // prompt-injected reply cannot strip the disclaimer or the emergency path.
    return jsonResponse(200, {
      ok: true,
      reply: result.text,
      safety: safety.buildAdvisory(classification),
    }, corsResult.headers);
  } catch (err) {
    const timedOut = err instanceof UpstreamTimeoutError || (err && err.timeout === true);
    log.emit({ endpoint: ENDPOINT, outcome: timedOut ? 'upstream_timeout' : 'upstream_error', error_class: log.errorClass(err) });
    return errorResponse(timedOut ? 'upstream_timeout' : 'upstream_unavailable', corsResult.headers);
  }
};

exports._internal = { readMessages, readZipHint, limits, MAX_BODY_BYTES };
