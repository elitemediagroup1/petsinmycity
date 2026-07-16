'use strict';

/**
 * API transport codes and result-state -> HTTP mapping for the internal Knowledge API.
 *
 * This module owns ONLY transport concerns. It duplicates NO delivery policy:
 * admission, freshness, ranking, conflict, provenance and safety all live in the
 * delivery layer (PR #10). Here we translate the delivery layer's typed outcomes
 * (ResultState / DeliveryError codes) into stable HTTP responses.
 */

const { ResultState, ErrorCode } = require('../delivery');

/** Transport version for the HTTP boundary. Distinct from the kdp.v1 envelope. */
const API_VERSION = 'knowledge-api.v1';

/** Stable machine-readable API result codes returned in every response body. */
const ApiCode = Object.freeze({
  OK: 'ok',
  CONFLICT: 'conflict',
  NOT_FOUND: 'not_found',
  INADMISSIBLE: 'inadmissible',
  EXPIRED: 'expired',
  INVALID_REQUEST: 'invalid_request',
  UNSUPPORTED_METHOD: 'unsupported_method',
  UNAUTHORIZED: 'unauthorized',
  PAYLOAD_TOO_LARGE: 'payload_too_large',
  INTERNAL_ERROR: 'internal_error',
});

/**
 * Map a delivery ResultState to { status, code }.
 * inadmissible defaults to 404 so the API does not disclose suppressed knowledge
 * to ordinary consumers; an authorized diagnostic mode may surface 422 separately.
 */
function mapResultState(state, opts) {
  const diagnostic = !!(opts && opts.diagnostic);
  switch (state) {
    case ResultState.CONFLICT:
      return { status: 409, code: ApiCode.CONFLICT };
    case ResultState.NOT_FOUND:
      return { status: 404, code: ApiCode.NOT_FOUND };
    case ResultState.EXPIRED:
      return { status: 410, code: ApiCode.EXPIRED };
    case ResultState.INADMISSIBLE:
      return diagnostic
        ? { status: 422, code: ApiCode.INADMISSIBLE }
        : { status: 404, code: ApiCode.NOT_FOUND };
    default:
      return { status: 500, code: ApiCode.INTERNAL_ERROR };
  }
}

/** Map a delivery DeliveryError code to { status, code }. */
function mapErrorCode(code) {
  switch (code) {
    case ErrorCode.INVALID_REQUEST:
      return { status: 400, code: ApiCode.INVALID_REQUEST };
    case ErrorCode.STORAGE_FAILURE:
      return { status: 500, code: ApiCode.INTERNAL_ERROR };
    default:
      return { status: 500, code: ApiCode.INTERNAL_ERROR };
  }
}

module.exports = { API_VERSION, ApiCode, mapResultState, mapErrorCode };
