'use strict';

/**
 * Public surface of the internal Knowledge API transport layer.
 *
 * This is the HTTP boundary over the delivery read path. It NEVER re-implements
 * delivery policy; it wraps KnowledgeDeliveryService.getKnowledge() and maps typed
 * outcomes to HTTP. Consumers of the runtime endpoint go through the Netlify
 * function (netlify/functions/knowledge.js), which delegates here.
 */

const handler = require('./http-handler');
const request = require('./request');
const auth = require('./auth');
const errors = require('./errors');
const bootstrap = require('./bootstrap');
const diagnostics = require('./diagnostics');

module.exports = {
  handle: handler.handle,
  isEnvelope: handler.isEnvelope,
  API_VERSION: errors.API_VERSION,
  ApiCode: errors.ApiCode,
  mapResultState: errors.mapResultState,
  mapErrorCode: errors.mapErrorCode,
  parseBody: request.parseBody,
  parseQuery: request.parseQuery,
  normalize: request.normalize,
  RequestParseError: request.RequestParseError,
  authorize: auth.authorize,
  diagnosticAllowed: auth.diagnosticAllowed,
  build: bootstrap.build,
  getService: bootstrap.getService,
  makeDiagnostics: diagnostics.makeDiagnostics,
};
