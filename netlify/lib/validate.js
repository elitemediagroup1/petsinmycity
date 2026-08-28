'use strict';

/**
 * Shared request-shape validation helpers.
 *
 * Every helper is total: it never throws, and returns either
 * `{ ok: true, value }` or `{ ok: false, reason }`. The reason is an internal
 * label for logs - callers map it to the public `invalid_request` code.
 */

// Reject C0/C1 control characters and the Unicode line/paragraph separators.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F\\u2028\\u2029]');

function fail(reason) { return { ok: false, reason: reason }; }
function pass(value) { return { ok: true, value: value }; }

function isPlainString(value) {
  return typeof value === 'string';
}

/**
 * A bounded, control-character-free, trimmed string.
 *
 * `maxRaw` is checked before anything else so a multi-megabyte string is
 * rejected without being trimmed or regex-scanned.
 */
function boundedString(value, opts) {
  const o = opts || {};
  if (!isPlainString(value)) return fail('not_a_string');
  if (value.length > (o.maxRaw || 20000)) return fail('too_long');
  const trimmed = value.trim();
  if (CONTROL_CHARS.test(trimmed)) return fail('control_characters');
  if (trimmed.length < (o.min == null ? 1 : o.min)) return fail('too_short');
  if (trimmed.length > (o.max == null ? 2000 : o.max)) return fail('too_long');
  if (o.pattern && !o.pattern.test(trimmed)) return fail('pattern');
  return pass(trimmed);
}

/** One of a fixed list of permitted values (compared lower-cased). */
function enumValue(value, allowed) {
  if (!isPlainString(value)) return fail('not_a_string');
  const v = value.trim().toLowerCase();
  if (!allowed.includes(v)) return fail('not_allowed');
  return pass(v);
}

/** A finite number inside an inclusive range. */
function numberInRange(value, min, max) {
  let n;
  if (typeof value === 'number') n = value;
  else if (isPlainString(value) && value.trim() !== '') n = Number(value);
  else n = NaN;
  if (!Number.isFinite(n)) return fail('not_a_number');
  if (n < min || n > max) return fail('out_of_range');
  return pass(n);
}

/** A US ZIP code: 5 digits, or ZIP+4 reduced to its 5-digit prefix. */
function usZip(value) {
  if (!isPlainString(value)) return fail('not_a_string');
  const trimmed = value.trim();
  const m = /^(\d{5})(?:-\d{4})?$/.exec(trimmed);
  if (!m) return fail('not_a_zip');
  return pass(m[1]);
}

/**
 * A tightly validated US city / locality string.
 *
 * Letters, single spaces, hyphens, apostrophes and periods only, optionally
 * followed by a two-letter state code. Digits and any other punctuation that
 * could steer a provider query are rejected.
 */
function cityName(value) {
  const base = boundedString(value, { min: 2, max: 60 });
  if (!base.ok) return base;
  const m = /^([A-Za-z][A-Za-z .'-]{0,47}[A-Za-z.])(?:,\s*([A-Za-z]{2}))?$/.exec(base.value);
  if (!m) return fail('not_a_city');
  if (/\s{2,}/.test(m[1])) return fail('not_a_city');
  return pass(m[2] ? m[1] + ', ' + m[2].toUpperCase() : m[1]);
}

module.exports = {
  CONTROL_CHARS,
  boundedString,
  enumValue,
  numberInRange,
  usZip,
  cityName,
  fail,
  pass,
};
