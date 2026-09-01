/* PetsInMyCity - safe Markdown-lite renderer.
 *
 * Lucy's replies are AI-generated, and an AI reply can be steered by anything a
 * visitor types. So no model output is ever concatenated into an HTML string
 * here. Everything is built with DOM methods, text goes in through textContent,
 * and every link is parsed with the URL API and checked against an allow-list
 * before an <a> is created at all.
 *
 * What this blocks, by construction:
 *   - attribute-injection via a crafted URL (there is no HTML string to break
 *     out of);
 *   - javascript:, data:, vbscript:, file: and any other non-http(s) scheme;
 *   - URLs carrying embedded credentials (https://user:pass@host);
 *   - control characters and whitespace tricks inside a URL;
 *   - off-allow-list external destinations, including ones a prompt injection
 *     asked the model to emit;
 *   - inline event handlers - click tracking is a normal addEventListener.
 *
 * Supported syntax: [label](url), **bold**, blank-line paragraphs, single
 * newlines as line breaks. Everything else is literal text.
 *
 * Exposes window.PIMCSafeMarkdown = { render, renderInto, isAllowedUrl, createLink }.
 */
(function (global) {
  'use strict';

  var CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F\\u2028\\u2029]');

  /* Hosts Lucy is allowed to link to. Exact host or a subdomain of it.
   * Keep in sync with the partner list in the Lucy system prompt. */
  var ALLOWED_HOSTS = [
    'petsinmycity.com',
    'google.com',
    'maps.google.com',
    'aspca.org',
    'petfinder.com',
    'adoptapet.com',
    'amazon.com',
    'chewy.com',
    'chewy.sjv.io',
    'petco.com',
    'barkbox.com',
    'kitnipbox.com',
    'embarkvet.com',
    'wisdompanel.com',
    'trupanion.com',
    'fetchpet.com',
    'healthypaws.com',
    'petsbest.com',
    'petinsurer.com',
    'rover.com',
    'wagwalking.com',
    'dutch.com'
  ];

  /* Destinations that are commercial relationships and must carry rel="sponsored". */
  var SPONSORED_HOSTS = [
    'amazon.com', 'chewy.com', 'chewy.sjv.io', 'petco.com', 'barkbox.com', 'kitnipbox.com',
    'embarkvet.com', 'wisdompanel.com', 'trupanion.com', 'fetchpet.com', 'healthypaws.com',
    'petsbest.com', 'petinsurer.com', 'rover.com', 'wagwalking.com', 'dutch.com'
  ];

  function hostMatches(hostname, list) {
    var h = String(hostname || '').toLowerCase();
    for (var i = 0; i < list.length; i++) {
      var allowed = list[i];
      if (h === allowed || h.slice(-(allowed.length + 1)) === '.' + allowed) return true;
    }
    return false;
  }

  /**
   * Parse and classify a candidate URL.
   * @returns {null | {href: string, external: boolean, sponsored: boolean}}
   */
  function isAllowedUrl(raw) {
    if (typeof raw !== 'string') return null;
    var candidate = raw.trim();
    if (!candidate || candidate.length > 2000) return null;
    if (CONTROL_CHARS.test(candidate)) return null;
    // A scheme-relative URL (//evil.com) is not a same-origin path.
    if (candidate.indexOf('//') === 0) return null;

    var base;
    try {
      base = global.location && global.location.href ? global.location.href : 'https://petsinmycity.com/';
    } catch (e) {
      base = 'https://petsinmycity.com/';
    }

    var url;
    if (candidate.charAt(0) === '/') {
      // Same-origin relative path only. Resolved against the page so it can
      // never become a different origin.
      try { url = new URL(candidate, base); } catch (e) { return null; }
      var here;
      try { here = new URL(base); } catch (e) { return null; }
      if (url.origin !== here.origin) return null;
      if (url.username || url.password) return null;
      return { href: url.pathname + url.search + url.hash, external: false, sponsored: false };
    }

    try {
      url = new URL(candidate);
    } catch (e) {
      return null;
    }
    if (url.protocol !== 'https:') return null;          // no http:, javascript:, data:, mailto:, ...
    if (url.username || url.password) return null;        // no embedded credentials
    if (!hostMatches(url.hostname, ALLOWED_HOSTS)) return null;

    var sameSite = hostMatches(url.hostname, ['petsinmycity.com']);
    return {
      href: url.toString(),
      external: !sameSite,
      sponsored: hostMatches(url.hostname, SPONSORED_HOSTS)
    };
  }

  /** Report a link click to analytics. No inline handler, no eval. */
  function trackLink(href) {
    try {
      if (typeof global.pimcTrack === 'function') {
        global.pimcTrack('lucy_link_clicked', { destination_url: href });
      } else if (typeof global.gtag === 'function') {
        global.gtag('event', 'lucy_link_clicked', { destination_url: href });
      }
    } catch (e) { /* analytics must never break rendering */ }
  }

  /**
   * Build an <a> for an allowed URL, or a plain text node when the URL is not
   * allowed. Either way the label is inserted as text, never as markup.
   */
  function createLink(label, rawUrl) {
    var text = String(label == null ? '' : label);
    var checked = isAllowedUrl(rawUrl);
    if (!checked) {
      // Rejected destination: keep the words, drop the link entirely.
      return document.createTextNode(text);
    }
    var a = document.createElement('a');
    a.className = 'lucy-link-btn';
    a.setAttribute('href', checked.href);
    a.textContent = text + ' →';
    if (checked.external) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', checked.sponsored ? 'sponsored noopener noreferrer' : 'noopener noreferrer');
    }
    a.addEventListener('click', function () { trackLink(checked.href); });
    return a;
  }

  var LINK_RE = /\[([^\]\n]{1,200})\]\(([^\s)]{1,2000})\)/g;
  var BOLD_RE = /\*\*([^*\n]{1,300})\*\*/g;

  /** Append inline content (links + bold + text) to a parent node. */
  function appendInline(parent, text) {
    var remaining = String(text == null ? '' : text);
    LINK_RE.lastIndex = 0;
    var cursor = 0;
    var match;
    while ((match = LINK_RE.exec(remaining)) !== null) {
      if (match.index > cursor) appendBold(parent, remaining.slice(cursor, match.index));
      parent.appendChild(createLink(match[1], match[2]));
      cursor = match.index + match[0].length;
    }
    if (cursor < remaining.length) appendBold(parent, remaining.slice(cursor));
  }

  function appendBold(parent, text) {
    var remaining = String(text);
    BOLD_RE.lastIndex = 0;
    var cursor = 0;
    var match;
    while ((match = BOLD_RE.exec(remaining)) !== null) {
      if (match.index > cursor) parent.appendChild(document.createTextNode(remaining.slice(cursor, match.index)));
      var strong = document.createElement('strong');
      strong.textContent = match[1];
      parent.appendChild(strong);
      cursor = match.index + match[0].length;
    }
    if (cursor < remaining.length) parent.appendChild(document.createTextNode(remaining.slice(cursor)));
  }

  /** @returns {DocumentFragment} */
  function render(text) {
    var fragment = document.createDocumentFragment();
    var source = String(text == null ? '' : text);
    var blocks = source.split(/\n{2,}/);
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      if (!block.trim()) continue;
      var p = document.createElement('p');
      var lines = block.split('\n');
      for (var j = 0; j < lines.length; j++) {
        if (j > 0) p.appendChild(document.createElement('br'));
        appendInline(p, lines[j]);
      }
      fragment.appendChild(p);
    }
    return fragment;
  }

  /** Replace an element's children with the rendered content. */
  function renderInto(element, text) {
    if (!element) return element;
    while (element.firstChild) element.removeChild(element.firstChild);
    element.appendChild(render(text));
    return element;
  }

  global.PIMCSafeMarkdown = {
    render: render,
    renderInto: renderInto,
    isAllowedUrl: isAllowedUrl,
    createLink: createLink,
    ALLOWED_HOSTS: ALLOWED_HOSTS,
    SPONSORED_HOSTS: SPONSORED_HOSTS
  };
}(typeof window !== 'undefined' ? window : globalThis));

/* Node/CommonJS export for the test suite (harmless in the browser). */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined' ? window : globalThis).PIMCSafeMarkdown;
}
