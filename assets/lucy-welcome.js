/*
 * Lucy 2.0 — Premium First-Visit Welcome Experience · PetsInMyCity
 * Self-contained, client-only. No backend, no API keys, no external services.
 * Shows a premium welcome modal once per browser (localStorage: pimc-lucy-welcome-seen).
 *
 * Media container is future-proof: it shows the brand Lucy artwork today and is
 * ready to swap to a hosted MP4 (or HeyGen export) with NO redesign — just set
 * LUCY_VIDEO_URL below. The video uses autoplay+muted+playsinline+loop with a
 * "Hear Lucy" control to unmute after a user gesture (browser autoplay policy).
 *
 * Trust by design: education-first copy, no fear language, no affiliate language,
 * never diagnoses. Accessible: focus trap, Escape/backdrop close, aria roles,
 * reduced-motion aware, mobile-first.
 */
(function () {
  'use strict';

  /* ---- Config (single source of truth for the media slot) ---- */
  var STORAGE_KEY     = 'pimc-lucy-welcome-seen';
  var LUCY_VIDEO_URL  = '';                 // e.g. 'https://cdn.petsinmycity.com/lucy/welcome.mp4' (hosted MP4 / HeyGen export)
  var LUCY_CAPTIONS_URL = '';               // e.g. '/assets/lucy-welcome.vtt' (recommended when video is set)
  var LUCY_POSTER_URL = '/assets/logo.png'; // poster shown before the video paints
  var LUCY_IMAGE_URL  = '/assets/logo.png'; // static artwork used when no video is configured
  var OPEN_DELAY_MS   = 800;                // small delay so the page paints first (feels premium, not spammy)

  var overlay = null;
  var lastFocused = null;

  /* ---- Analytics (reuse the standardized framework; never break UX) ---- */
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

  function prefersReduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  }

  /* ---- Styles (scoped, injected once) ---- */
  function injectStyles() {
    if (document.getElementById('pimc-lucy-welcome-styles')) return;
    var css = [
      '#pimc-lw-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(28,25,23,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .28s ease;font-family:Inter,system-ui,-apple-system,sans-serif}',
      '#pimc-lw-overlay.is-open{opacity:1}',
      '#pimc-lw-dialog{position:relative;width:100%;max-width:440px;max-height:calc(100vh - 40px);overflow:auto;background:var(--white,#fff);border-radius:24px;box-shadow:0 24px 80px rgba(0,0,0,.28);transform:translateY(16px) scale(.98);transition:transform .28s cubic-bezier(.22,1,.36,1);-webkit-overflow-scrolling:touch}',
      '#pimc-lw-overlay.is-open #pimc-lw-dialog{transform:translateY(0) scale(1)}',
      '#pimc-lw-media{position:relative;background:linear-gradient(135deg,var(--amber-light,#FEF3C7),var(--coral-light,#FFF1F2));padding:28px 24px 20px;text-align:center;border-radius:24px 24px 0 0}',
      '#pimc-lw-avatar{width:104px;height:104px;margin:0 auto;border-radius:50%;overflow:hidden;background:#fff;border:4px solid var(--white,#fff);box-shadow:0 8px 28px rgba(245,158,11,.35);display:flex;align-items:center;justify-content:center}',
      '#pimc-lw-avatar img{width:100%;height:100%;object-fit:cover}',
      '.pimc-lw-paw{font-size:46px;line-height:1}',
      '#pimc-lw-media video{width:104px;height:104px;border-radius:50%;object-fit:cover;border:4px solid var(--white,#fff);box-shadow:0 8px 28px rgba(245,158,11,.35);background:#fff;display:block;margin:0 auto}',
      '.pimc-lw-mediawrap{display:inline-block}',
      '#pimc-lw-hear{margin-top:12px;background:var(--charcoal,#1C1917);color:#fff;border:none;border-radius:999px;padding:7px 16px;font-family:Nunito,sans-serif;font-weight:700;font-size:.78rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px}',
      '#pimc-lw-hear:hover{background:#2d2d2d}',
      '.pimc-lw-badge{display:inline-flex;align-items:center;gap:6px;margin-top:14px;background:rgba(255,255,255,.7);color:var(--amber-dark,#B45309);border:1px solid rgba(245,158,11,.4);border-radius:999px;padding:4px 12px;font-family:Nunito,sans-serif;font-weight:700;font-size:.72rem}',
      '#pimc-lw-close{position:absolute;top:12px;right:12px;width:34px;height:34px;border:none;border-radius:50%;background:rgba(255,255,255,.85);color:var(--charcoal,#1C1917);font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.12)}',
      '#pimc-lw-close:hover{background:#fff}',
      '#pimc-lw-body{padding:22px 26px 26px;text-align:center}',
      '#pimc-lw-title{margin:0 0 4px;font-family:Nunito,sans-serif;font-weight:800;font-size:1.6rem;line-height:1.15;color:var(--charcoal,#1C1917)}',
      '#pimc-lw-sub{margin:0 0 14px;font-family:Nunito,sans-serif;font-weight:700;font-size:1rem;color:var(--amber-dark,#B45309)}',
      '#pimc-lw-text{margin:0 0 8px;font-size:.95rem;line-height:1.6;color:var(--charcoal,#1C1917)}',
      '.pimc-lw-help{list-style:none;padding:0;margin:0 0 20px;display:flex;flex-wrap:wrap;gap:7px;justify-content:center}',
      '.pimc-lw-help li{background:var(--cream,#FFFBF5);border:1px solid var(--border,#E7E5E4);border-radius:999px;padding:5px 12px;font-size:.78rem;font-weight:600;color:var(--charcoal,#1C1917);font-family:Nunito,sans-serif}',
      '#pimc-lw-actions{display:flex;flex-direction:column;gap:10px}',
      '.pimc-lw-btn{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;border-radius:14px;padding:14px 18px;font-family:Nunito,sans-serif;font-weight:800;font-size:1rem;cursor:pointer;border:2px solid transparent;text-decoration:none;transition:transform .12s ease,box-shadow .12s ease,background .15s ease}',
      '.pimc-lw-btn:active{transform:translateY(1px)}',
      '.pimc-lw-btn-primary{background:linear-gradient(135deg,var(--amber,#F59E0B),var(--amber-dark,#D97706));color:#fff;box-shadow:0 6px 20px rgba(245,158,11,.4)}',
      '.pimc-lw-btn-primary:hover{box-shadow:0 8px 26px rgba(245,158,11,.55)}',
      '.pimc-lw-btn-secondary{background:#fff;color:var(--charcoal,#1C1917);border-color:var(--border,#E7E5E4)}',
      '.pimc-lw-btn-secondary:hover{border-color:var(--amber,#F59E0B);background:var(--cream,#FFFBF5)}',
      '.pimc-lw-btn-tertiary{background:var(--coral-light,#FFF1F2);color:var(--coral-dark,#F43F5E);border-color:rgba(244,63,94,.25)}',
      '.pimc-lw-btn-tertiary:hover{background:#fff;border-color:var(--coral,#FB7185)}',
      '#pimc-lw-foot{margin:16px 0 0;font-size:.72rem;color:var(--gray,#78716C);line-height:1.5}',
      '#pimc-lw-overlay:focus{outline:none}',
      '@media (max-width:480px){#pimc-lw-dialog{max-width:100%;border-radius:20px}#pimc-lw-title{font-size:1.4rem}#pimc-lw-media{padding:24px 18px 16px}}',
      '@media (prefers-reduced-motion:reduce){#pimc-lw-overlay,#pimc-lw-dialog{transition:none}.pimc-lw-btn{transition:none}}'
    ].join('\n');
    var el = document.createElement('style');
    el.id = 'pimc-lucy-welcome-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---- Media: video today-or-tomorrow, static artwork now ---- */
  function buildMediaInner() {
    if (LUCY_VIDEO_URL) {
      var cap = LUCY_CAPTIONS_URL
        ? '<track kind="captions" srclang="en" label="English" src="' + LUCY_CAPTIONS_URL + '" default>'
        : '';
      return '<span class="pimc-lw-mediawrap">' +
        '<video id="pimc-lw-video" autoplay muted playsinline loop preload="metadata" poster="' + LUCY_POSTER_URL + '" aria-label="Lucy, your AI pet companion, says hello">' +
          '<source src="' + LUCY_VIDEO_URL + '" type="video/mp4">' + cap +
        '</video></span>' +
        '<div><button type="button" id="pimc-lw-hear" class="pimc-lw-btn-hear">&#128266; Hear Lucy</button></div>';
    }
    return '<div id="pimc-lw-avatar">' +
      '<img src="' + LUCY_IMAGE_URL + '" alt="Lucy, your AI pet companion" ' +
      'onerror="this.style.display=&quot;none&quot;;this.parentNode.innerHTML=&quot;<span class=\\&quot;pimc-lw-paw\\&quot;>&#128062;</span>&quot;;"></div>';
  }

  function buildModal() {
    overlay = document.createElement('div');
    overlay.id = 'pimc-lw-overlay';
    overlay.setAttribute('role', 'presentation');

    overlay.innerHTML =
      '<div id="pimc-lw-dialog" role="dialog" aria-modal="true" aria-labelledby="pimc-lw-title" aria-describedby="pimc-lw-text">' +
        '<div id="pimc-lw-media">' +
          '<button type="button" id="pimc-lw-close" aria-label="Close welcome">&#10005;</button>' +
          buildMediaInner() +
          '<div><span class="pimc-lw-badge">&#128062; Your AI Pet Companion</span></div>' +
        '</div>' +
        '<div id="pimc-lw-body">' +
          '<h2 id="pimc-lw-title">Hi, I&#39;m Lucy &#128062;</h2>' +
          '<p id="pimc-lw-sub">Your trusted AI Pet Companion.</p>' +
          '<p id="pimc-lw-text">Welcome to PetsInMyCity! I&#39;m here to make caring for your pet calmer and clearer. Ask me anything &mdash; I&#39;ll point you to trusted guidance and the right next step.</p>' +
          '<ul class="pimc-lw-help" aria-label="Ways Lucy can help">' +
            '<li>Trusted pet advice</li>' +
            '<li>Local vets</li>' +
            '<li>Groomers</li>' +
            '<li>Boarding</li>' +
            '<li>Dog parks</li>' +
            '<li>Emergency resources</li>' +
            '<li>Pet tools</li>' +
            '<li>Product education</li>' +
            '<li>Answering your questions</li>' +
          '</ul>' +
          '<div id="pimc-lw-actions">' +
            '<button type="button" id="pimc-lw-ask" class="pimc-lw-btn pimc-lw-btn-primary">&#128062; Ask Lucy</button>' +
            '<button type="button" id="pimc-lw-explore" class="pimc-lw-btn pimc-lw-btn-secondary">&#10084;&#65039; Explore PetsInMyCity</button>' +
            '<a href="/my-pets/" id="pimc-lw-mypets" class="pimc-lw-btn pimc-lw-btn-tertiary">&#128203; Create My Pet Profile</a>' +
          '</div>' +
          '<p id="pimc-lw-foot">Education first, always. Lucy shares helpful guidance &mdash; never a diagnosis. For emergencies, contact your vet right away.</p>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
  }

  function getFocusable() {
    if (!overlay) return [];
    return Array.prototype.slice.call(
      overlay.querySelectorAll('a[href],button:not([disabled]),video,[tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return el.offsetParent !== null || el.tagName === 'VIDEO'; });
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
    if (overlay) return;
    lastFocused = document.activeElement;
    injectStyles();
    buildModal();
    document.body.style.overflow = 'hidden';
    markSeen();
    track('lucy_welcome_shown', {});

    document.getElementById('pimc-lw-close').addEventListener('click', function () { close('close_button'); });
    document.getElementById('pimc-lw-explore').addEventListener('click', function () { close('explore'); });
    document.getElementById('pimc-lw-ask').addEventListener('click', onAskLucy);
    document.getElementById('pimc-lw-mypets').addEventListener('click', onMyPets);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close('backdrop'); });
    document.addEventListener('keydown', onKeydown, true);

    var hear = document.getElementById('pimc-lw-hear');
    if (hear) hear.addEventListener('click', onHearLucy);
    var vid = document.getElementById('pimc-lw-video');
    if (vid) {
      vid.addEventListener('play', function once() { track('lucy_welcome_video_play', {}); vid.removeEventListener('play', once); });
    }

    // open animation + focus management
    requestAnimationFrame(function () {
      overlay.classList.add('is-open');
      var primary = document.getElementById('pimc-lw-ask');
      if (primary) { try { primary.focus(); } catch (e) {} }
    });
  }

  function teardown() {
    if (!overlay) return;
    document.removeEventListener('keydown', onKeydown, true);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} }
  }

  function close(reason) {
    if (!overlay) return;
    track('lucy_welcome_closed', { reason: reason || 'unknown' });
    overlay.classList.remove('is-open');
    if (prefersReduced()) { teardown(); } else { setTimeout(teardown, 260); }
  }

  function onAskLucy() {
    track('lucy_welcome_ask_lucy', {});
    var opened = false;
    try {
      if (window.Lucy && typeof window.Lucy.open === 'function') { window.Lucy.open(); opened = true; }
    } catch (e) { opened = false; }
    if (opened) { close('ask_lucy'); }
    else { window.location.href = '/lucy/'; }
  }

  function onMyPets() {
    // navigation proceeds via the anchor href to /my-pets/
    track('lucy_welcome_my_pets', {});
  }

  function onHearLucy() {
    var v = document.getElementById('pimc-lw-video');
    if (!v) return;
    try { v.muted = false; v.volume = 1; var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }

  function init() {
    if (alreadySeen()) return;            // never blocks returning visitors
    setTimeout(open, OPEN_DELAY_MS);
  }

  // Public API (handy for QA: window.pimcLucyWelcome.reset())
  window.pimcLucyWelcome = {
    open: open,
    close: close,
    reset: function () { try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {} }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
