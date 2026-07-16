'use strict';

/**
 * Transport-layer request parsing and validation for the Knowledge API.
 *
 * Validates BEFORE the delivery service is called. Parsing lives here, separate
 * from the delivery service, so the same normalized shape can be produced from an
 * HTTP body, a query string, or a direct test call.
 */

const { KNOWN_CONSUMERS } = require('../delivery');

/** Max accepted request body in bytes (reject oversized bodies before parsing). */
const MAX_BODY_BYTES = 16 * 1024;

class RequestParseError extends Error {
  constructor(message, httpStatus) {
    super(message);
    this.name = 'RequestParseError';
    this.httpStatus = httpStatus || 400;
  }
}

function byteLength(str) {
  if (str == null) return 0;
  return Buffer.byteLength(String(str), 'utf8');
}

/** Parse and validate a raw JSON body string into a normalized delivery request. */
function parseBody(raw) {
  if (raw == null || raw === '') {
    throw new RequestParseError('request body is required', 400);
  }
  if (byteLength(raw) > MAX_BODY_BYTES) {
    throw new RequestParseError('request body too large', 413);
  }
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (err) {
    throw new RequestParseError('malformed JSON body', 400);
  }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new RequestParseError('request body must be a JSON object', 400);
  }
  return normalize(obj);
}

/** Normalize + validate a request object (shared by body and direct callers). */
function normalize(obj) {
  const allowed = new Set(['subjectId', 'predicate', 'asOf', 'consumer', 'context', 'includeDiagnostics']);
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new RequestParseError('unknown field: ' + key, 400);
    }
  }

  const subjectId = obj.subjectId;
  if (typeof subjectId !== 'string' || subjectId.trim() === '') {
    throw new RequestParseError('subjectId is required and must be a nonempty string', 400);
  }
  const predicate = obj.predicate;
  if (typeof predicate !== 'string' || predicate.trim() === '') {
    throw new RequestParseError('predicate is required and must be a nonempty string', 400);
  }

  const out = { subjectId: subjectId.trim(), predicate: predicate.trim() };

  if (obj.asOf !== undefined) {
    if (typeof obj.asOf !== 'string' || Number.isNaN(Date.parse(obj.asOf))) {
      throw new RequestParseError('asOf must be a valid ISO-8601 timestamp', 400);
    }
    out.asOf = obj.asOf;
  }

  if (obj.consumer !== undefined) {
    if (typeof obj.consumer !== 'string' || !KNOWN_CONSUMERS.has(obj.consumer)) {
      throw new RequestParseError('consumer is not a supported identifier', 400);
    }
    out.consumer = obj.consumer;
  } else {
    out.consumer = 'internal';
  }

  if (obj.context !== undefined) {
    if (obj.context === null || typeof obj.context !== 'object' || Array.isArray(obj.context)) {
      throw new RequestParseError('context must be an object when present', 400);
    }
    out.context = obj.context;
  }

  return out;
}

/** Build a normalized request from GET query params (limited form). */
function parseQuery(query) {
  const q = query || {};
  const obj = {};
  if (q.subjectId !== undefined) obj.subjectId = q.subjectId;
  if (q.predicate !== undefined) obj.predicate = q.predicate;
  if (q.asOf !== undefined) obj.asOf = q.asOf;
  if (q.consumer !== undefined) obj.consumer = q.consumer;
  return normalize(obj);
}

module.exports = { parseBody, parseQuery, normalize, RequestParseError, MAX_BODY_BYTES };
