/* PetsInMyCity - shared client for /.netlify/functions/pet-tools.
 *
 * Replaces the per-page copies of _callTool/_render. Two things changed that
 * matter:
 *
 * 1. Requests now send STRUCTURED, named fields instead of a sentence the page
 *    glued together. The server validates species, weight, units, age, symptoms
 *    and food quantity, and composes the model prompt itself.
 *
 * 2. Emergency handling is server-side and deterministic. When the response
 *    carries `safety.emergency`, this file renders that block FIRST and marks
 *    the result as an emergency. The page no longer guesses urgency by
 *    regex-matching the model's prose, so a model that phrases things oddly -
 *    or that a visitor has tried to prompt-inject - cannot downgrade an
 *    emergency.
 *
 * All rendering goes through PIMCSafeMarkdown (DOM nodes, validated URLs).
 */
(function (global) {
  'use strict';

  var ENDPOINT = '/.netlify/functions/pet-tools';
  var TIMEOUT_MS = 40000;

  function clear(el) { while (el && el.firstChild) { el.removeChild(el.firstChild); } }

  function renderText(el, text) {
    if (global.PIMCSafeMarkdown) { global.PIMCSafeMarkdown.renderInto(el, text); }
    else { el.textContent = String(text == null ? '' : text); }
    return el;
  }

  function track(name, params) {
    try {
      if (typeof global.pimcTrack === 'function') { global.pimcTrack(name, params || {}); }
      else if (typeof global.gtag === 'function') { global.gtag('event', name, params || {}); }
    } catch (e) { /* analytics never breaks a tool */ }
  }

  function setBusy(button, busy, busyLabel) {
    if (!button) { return; }
    if (busy) {
      button.dataset.pimcLabel = button.dataset.pimcLabel || button.textContent;
      button.textContent = busyLabel || 'Thinking...';
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
    } else {
      if (button.dataset.pimcLabel) { button.textContent = button.dataset.pimcLabel; }
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }

  /** Public, non-technical copy for each stable server error code. */
  var ERROR_COPY = {
    rate_limited: 'You have run this tool a lot in a short time. Please wait a minute and try again.',
    invalid_request: 'Please check the form - one of the answers was missing or outside the range we accept.',
    payload_too_large: 'That was too long. Please shorten it and try again.',
    service_unavailable: 'This tool is temporarily unavailable. Please try again shortly.',
    upstream_timeout: 'That took too long to come back. Please try again.',
    upstream_unavailable: 'We could not reach the service that powers this tool. Please try again shortly.',
    origin_not_allowed: 'This tool could not run from this page.',
    method_not_allowed: 'This tool could not run from this page.'
  };

  function errorMessage(body) {
    if (body && body.error && ERROR_COPY[body.error]) { return ERROR_COPY[body.error]; }
    if (body && typeof body.message === 'string' && body.message) { return body.message; }
    return 'Sorry, something went wrong. Please try again.';
  }

  /**
   * Render a completed response into `resultEl`.
   *
   * @param {object} opts { classify: fn(text) -> {cls, heading} } for the
   *        non-emergency presentation each tool already had.
   */
  function renderResult(resultEl, body, opts) {
    var options = opts || {};
    clear(resultEl);
    var safety = body && body.safety;

    if (safety && safety.emergency) {
      var emergency = document.createElement('div');
      emergency.className = 'tool-result-card danger';
      emergency.setAttribute('role', 'alert');
      var banner = document.createElement('div');
      banner.style.cssText = 'font-size:1.4rem;font-weight:800;margin-bottom:10px';
      banner.textContent = '🔴 EMERGENCY - contact an emergency vet now';
      emergency.appendChild(banner);
      var bodyEl = document.createElement('div');
      renderText(bodyEl, body.text || (body.content && body.content[0] && body.content[0].text) || '');
      emergency.appendChild(bodyEl);
      resultEl.appendChild(emergency);
      track('safety_emergency_shown', {
        tool_name: options.toolName || '',
        categories: (safety.categories || []).map(function (c) { return c.id; }).join('|')
      });
      return;
    }

    var text = body && (body.text || (body.content && body.content[0] && body.content[0].text)) || '';
    var classification = options.classify ? options.classify(text) : null;
    var card = document.createElement('div');
    card.className = 'tool-result-card' + (classification && classification.cls ? ' ' + classification.cls : '');
    if (classification && classification.heading) {
      var h = document.createElement('h3');
      h.textContent = classification.heading;
      card.appendChild(h);
    }
    var textEl = document.createElement('div');
    renderText(textEl, text);
    card.appendChild(textEl);

    if (safety && safety.disclaimer) {
      var note = document.createElement('p');
      note.className = 'tool-vet-disclaimer';
      note.style.cssText = 'margin-top:14px;font-size:0.8rem;line-height:1.5;color:#6b7280';
      note.textContent = safety.disclaimer;
      card.appendChild(note);
    }
    resultEl.appendChild(card);
  }

  function renderError(resultEl, message) {
    clear(resultEl);
    var card = document.createElement('div');
    card.className = 'tool-result-card danger';
    card.setAttribute('role', 'alert');
    card.textContent = message;
    resultEl.appendChild(card);
  }

  /**
   * @param {object} req { tool, input, gaEvent, gaParams, button, resultEl, classify, toolName }
   */
  function run(req) {
    var resultEl = req.resultEl || document.getElementById('tool-result');
    var button = req.button || document.getElementById('tool-submit');
    setBusy(button, true);
    if (req.gaEvent) { track(req.gaEvent, req.gaParams || {}); }

    var options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: req.tool, input: req.input || {}, zip: req.zip })
    };
    if (typeof AbortController === 'function') {
      var controller = new AbortController();
      options.signal = controller.signal;
      setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
    }

    return fetch(ENDPOINT, options)
      .then(function (r) { return r.json().then(function (b) { return { status: r.status, body: b }; }); })
      .then(function (res) {
        setBusy(button, false);
        if (res.status >= 400 || (res.body && res.body.ok === false)) {
          renderError(resultEl, errorMessage(res.body));
          return null;
        }
        renderResult(resultEl, res.body, { classify: req.classify, toolName: req.toolName || req.tool });
        return res.body;
      })
      .catch(function () {
        setBusy(button, false);
        renderError(resultEl, 'Sorry, something went wrong. Please try again.');
        return null;
      });
  }

  global.PIMCTools = {
    run: run,
    renderResult: renderResult,
    renderError: renderError,
    renderText: renderText,
    setBusy: setBusy,
    track: track,
    ERROR_COPY: ERROR_COPY
  };
}(typeof window !== 'undefined' ? window : globalThis));
