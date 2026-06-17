/*
 * Lucy First-Visit Welcome Experience - PetsInMyCity
 * Self-contained, client-only. No backend, no API keys, no external services.
 * Shows a premium welcome modal once per browser (localStorage: pimc-lucy-welcome-seen).
 * Media area uses brand logo + CSS Lucy avatar today; includes an easy-to-swap
 * <video> slot for a hosted, approved MP4 URL later (autoplay muted; Hear Lucy after interaction).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'pimc-lucy-welcome-seen';

  // Optional: set a hosted, approved MP4 URL here later to enable video.
  var LUCY_VIDEO_URL = '';      // e.g. 'https://cdn.example.com/lucy-welcome.mp4'
  var LUCY_CAPTIONS_URL = '';   // e.g. 'https://cdn.example.com/lucy-welcome.vtt'
  var LUCY_POSTER_URL = '/assets/logo.png';

  var lastFocused = null;
  var overlay = null;

  function track(name, params) {
    try {
      if (typeof window.pimcTrack === 'function') { window.pimcTrack(name, params || {}); return; }
      if (typeof window.gtag === 'function') { window.gtag('event', name, params || {}); }
    } catch (e) { /* analytics must never break UX */ }
  }

  function alreadySeen() {
    try { return window.localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
  }

  // ---- styles ----------------------------------------------------------
  function injectStyles() {
    if (document.getElementById('pimc-lucy-welcome-styles')) return;
    var css = '';
    css += '#pimc-lucy-welcome-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(17,24,39,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;transition:opacity .25s ease;}';
    css += '#pimc-lucy-welcome-overlay.is-open{opacity:1;}';
    css += '.pimc-lw-dialog{position:relative;width:100%;max-width:460px;max-height:calc(100vh - 32px);overflow:auto;background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.28);transform:translateY(12px) scale(.98);transition:transform .25s ease;}';
    css += '#pimc-lucy-welcome-overlay.is-open .pimc-lw-dialog{transform:translateY(0) scale(1);}';
    css += '.pimc-lw-media{position:relative;background:linear-gradient(135deg,#0ea5a4 0%,#0d9488 45%,#0f766e 100%);padding:28px 20px 22px;text-align:center;border-radius:20px 20px 0 0;}';
    css += '.pimc-lw-avatar{width:108px;height:108px;margin:0 auto;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(0,0,0,.18);overflow:hidden;}';
    css += '.pimc-lw-avatar img{width:78%;height:78%;object-fit:contain;}';
    css += '.pimc-lw-avatar .pimc-lw-paw{font-size:54px;line-height:1;}';
    css += '.pimc-lw-video{width:100%;max-width:300px;border-radius:14px;display:block;margin:0 auto;background:#000;}';
    css += '.pimc-lw-demo-badge{display:inline-block;margin-top:14px;font-size:11px;font-weight:600;letter-spacing:.02em;color:#fff;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);padding:4px 10px;border-radius:999px;}';
    css += '.pimc-lw-hear{margin-top:12px;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#0f766e;background:#fff;border:0;border-radius:999px;padding:7px 14px;cursor:pointer;}';
    css += '.pimc-lw-body{padding:22px 22px 24px;}';
    css += '.pimc-lw-body h2{margin:0 0 8px;font-size:22px;line-height:1.2;color:#0f172a;font-weight:800;}';
    css += '.pimc-lw-sub{margin:0 0 12px;font-size:15px;font-weight:600;color:#0f766e;}';
    css += '.pimc-lw-text{margin:0 0 20px;font-size:14px;line-height:1.55;color:#475569;}';
    css += '.pimc-lw-actions{display:flex;flex-direction:column;gap:10px;}';
    css += '.pimc-lw-btn{display:block;width:100%;text-align:center;font-size:15px;font-weight:700;border-radius:12px;padding:13px 16px;cursor:pointer;text-decoration:none;border:0;box-sizing:border-box;transition:transform .08s ease,box-shadow .15s ease;}';
    css += '.pimc-lw-btn:active{transform:translateY(1px);}';
    css += '.pimc-lw-btn--primary{background:#0d9488;color:#fff;box-shadow:0 6px 16px rgba(13,148,136,.32);}';
    css += '.pimc-lw-btn--primary:hover{background:#0f766e;}';
    css += '.pimc-lw-btn--secondary{background:#f1f5f9;color:#0f172a;}';
    css += '.pimc-lw-btn--secondary:hover{background:#e2e8f0;}';
    css += '.pimc-lw-btn--tertiary{background:transparent;color:#64748b;font-weight:600;font-size:14px;padding:8px;}';
    css += '.pimc-lw-btn--tertiary:hover{color:#0f172a;}';
    css += '.pimc-lw-close{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.9);color:#0f172a;font-size:20px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.15);}';
    css += '.pimc-lw-close:hover{background:#fff;}';
    css += '.pimc-lw-btn:focus-visible,.pimc-lw-close:focus-visible,.pimc-lw-hear:focus-visible{outline:3px solid #14b8a6;outline-offset:2px;}';
    css += '@media (max-width:480px){.pimc-lw-dialog{max-width:100%;border-radius:16px;}.pimc-lw-body h2{font-size:20px;}}';
    css += '@media (prefers-reduced-motion:reduce){#pimc-lucy-welcome-overlay,.pimc-lw-dialog{transition:none;}}';
    var el = document.createElement('style');
    el.id = 'pimc-lucy-welcome-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ---- media area ------------------------------------------------------
  function buildMediaInner() {
    if (LUCY_VIDEO_URL) {
      var capTrack = LUCY_CAPTIONS_URL
        ? '<track kind="captions" srclang="en" label="English" src="' + LUCY_CAPTIONS_URL + '" default>'
        : '';
      return '' +
        '<video id="pimc-lw-video" class="pimc-lw-video" autoplay muted playsinline loop ' +
        'poster="' + LUCY_POSTER_URL + '" preload="metadata">' +
        '<source src="' + LUCY_VIDEO_URL + '" type="video/mp4">' + capTrack +
        '</video>' +
        '<div><button type="button" id="pimc-lw-hear" class="pimc-lw-hear">\uD83D\uDD0A Hear Lucy</button></div>';
    }
    // Image / placeholder avatar (brand logo). Easy to swap to video by setting LUCY_VIDEO_URL.
    return '' +
      '<div class="pimc-lw-avatar">' +
      '<img src="/assets/logo.png" alt="Lucy, the PetsInMyCity pet guide" ' +
      'onerror="this.style.display=\'none\';this.parentNode.innerHTML=&quot;<span class=\'pimc-lw-paw\'>\uD83D\uDC3E</span>&quot;;">' +
      '</div>';
  }

  // ---- build + open ----------------------------------------------------
  function buildModal() {
    overlay = document.createElement('div');
    overlay.id = 'pimc-lucy-welcome-overlay';
    overlay.setAttribute('role', 'presentation');
    var html = '';
    html += '<div class="pimc-lw-dialog" role="dialog" aria-modal="true" aria-labelledby="pimc-lw-title" aria-describedby="pimc-lw-desc">';
    html += '<div class="pimc-lw-media">';
    html += '<button type="button" class="pimc-lw-close" id="pimc-lw-close" aria-label="Close welcome">\u00D7</button>';
    html += buildMediaInner();
    html += '<div class="pimc-lw-demo-badge">Demo only \u2014 no live AI connected</div>';
    html += '</div>';
    html += '<div class="pimc-lw-body">';
    html += '<h2 id="pimc-lw-title">Hi, I\u2019m Lucy \uD83D\uDC3E</h2>';
    html += '<p class="pimc-lw-sub">Your friendly pet guide for trusted advice, local resources, and smarter pet care.</p>';
    html += '<p class="pimc-lw-text" id="pimc-lw-desc">I can help you find nearby vets, groomers, boarding, dog parks, pet tools, helpful guides, and trusted resources for your pet.</p>';
    html += '<div class="pimc-lw-actions">';
    html += '<button type="button" class="pimc-lw-btn pimc-lw-btn--primary" id="pimc-lw-ask">Ask Lucy</button>';
    html += '<a class="pimc-lw-btn pimc-lw-btn--secondary" id="pimc-lw-mypets" href="/my-pets/">Create My Pets Profile</a>';
    html += '<button type="button" class="pimc-lw-btn pimc-lw-btn--tertiary" id="pimc-lw-explore">Explore PetsInMyCity</button>';
    html += '</div></div></div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
  }

  function getFocusable() {
    if (!overlay) return [];
    return Array.prototype.slice.call(
      overlay.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return el.offsetParent !== null; });
  }

  function onKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close('escape'); return; }
    if (e.key === 'Tab') {
      var f = getFocusable();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function open() {
    lastFocused = document.activeElement;
    injectStyles();
    buildModal();
    document.body.style.overflow = 'hidden';
    // listeners
    document.getElementById('pimc-lw-close').addEventListener('click', function () { close('close_button'); });
    document.getElementById('pimc-lw-explore').addEventListener('click', function () { close('explore'); });
    document.getElementById('pimc-lw-ask').addEventListener('click', onAskLucy);
    document.getElementById('pimc-lw-mypets').addEventListener('click', onMyPets);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close('backdrop'); });
    document.addEventListener('keydown', onKeydown, true);
    var hear = document.getElementById('pimc-lw-hear');
    if (hear) hear.addEventListener('click', onHearLucy);
    // open animation + focus primary CTA
    requestAnimationFrame(function () {
      overlay.classList.add('is-open');
      var primary = document.getElementById('pimc-lw-ask');
      if (primary) primary.focus();
    });
    markSeen();
    track('lucy_welcome_shown', { page_path: location.pathname });
  }

  function teardown() {
    if (!overlay) return;
    document.removeEventListener('keydown', onKeydown, true);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') { try { lastFocused.focus(); } catch (e) {} }
  }

  function close(reason) {
    if (!overlay) return;
    track('lucy_welcome_closed', { reason: reason || 'unknown' });
    overlay.classList.remove('is-open');
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    if (prefersReduced) { teardown(); } else { setTimeout(teardown, 220); }
  }

  // ---- CTA handlers ----------------------------------------------------
  function onAskLucy() {
    track('lucy_welcome_ask_lucy_click', {});
    var opened = false;
    try {
      if (window.Lucy && typeof window.Lucy.open === 'function') { window.Lucy.open(); opened = true; }
    } catch (e) { opened = false; }
    if (opened) { close('ask_lucy'); }
    else { window.location.href = '/lucy/'; }
  }

  function onMyPets() {
    // navigation proceeds via the anchor href to /my-pets/
    track('lucy_welcome_my_pets_click', {});
  }

  function onHearLucy() {
    var v = document.getElementById('pimc-lw-video');
    if (!v) return;
    try { v.muted = false; v.volume = 1; var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }

  // ---- init ------------------------------------------------------------
  function init() {
    if (alreadySeen()) return;
    // Small delay so the page paints first; feels premium, not spammy.
    setTimeout(open, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose a tiny API for testing/manual triggering (no PII, no secrets).
  window.pimcLucyWelcome = { open: open, close: close, reset: function () { try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {} } };
})();
