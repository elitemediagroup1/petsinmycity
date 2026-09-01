// Lucy AI floating widget for petsinmycity.com
// Calls /.netlify/functions/lucy-chat which proxies api.anthropic.com.
(function () {
  if (window.__lucyLoaded) return;
  window.__lucyLoaded = true;

  var LUCY_AVATAR = 'https://media1.tenor.com/m/W_U_UgAgw3oAAAAC/doggy-golde.gif';
  var ENDPOINT = '/.netlify/functions/lucy-chat';
  var PLACES_ENDPOINT = '/.netlify/functions/places-search';

  var STYLES = [
      '#lucy-widget-btn{position:fixed;bottom:24px;right:24px;z-index:9999;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font-family:Inter,system-ui,sans-serif}',
      '#lucy-avatar-ring{width:72px;height:72px;border-radius:50%;border:3px solid var(--amber,#F59E0B);overflow:hidden;position:relative;box-shadow:0 6px 22px rgba(245,158,11,.45);animation:lucyPulse 2.4s ease-in-out infinite;background:#fff}',
      '#lucy-avatar-ring img{width:100%;height:100%;object-fit:cover;border-radius:50%}',
      '@keyframes lucyPulse{0%,100%{box-shadow:0 6px 22px rgba(245,158,11,.4)}50%{box-shadow:0 6px 34px rgba(245,158,11,.7)}}',
      '#lucy-label{background:var(--charcoal,#1C1917);color:#fff;font-family:Nunito,sans-serif;font-weight:700;font-size:.75rem;padding:4px 12px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.15)}',
      '#lucy-notif{position:absolute;top:0;right:0;width:16px;height:16px;background:var(--coral,#FB7185);border-radius:50%;border:2px solid #fff;animation:notifPulse 1.8s ease-in-out infinite}',
      '@keyframes notifPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}',
      '#lucy-panel{position:fixed;bottom:24px;right:24px;width:380px;height:560px;background:#fff;border-radius:22px;box-shadow:0 20px 70px rgba(0,0,0,.24);z-index:9999;display:none;flex-direction:column;overflow:hidden;border:1px solid var(--border,#E7E5E4);animation:slideUp .32s cubic-bezier(.22,1,.36,1);font-family:Inter,system-ui,sans-serif}',
      '#lucy-panel.open{display:flex}',
      '@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}',
      '#lucy-head{background:linear-gradient(135deg,var(--charcoal,#1C1917),#33302d);padding:16px 18px;display:flex;align-items:center;gap:12px;color:#fff}',
      '#lucy-head .avatar{width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid var(--amber,#F59E0B);flex:none;position:relative}',
      '#lucy-head .avatar img{width:100%;height:100%;object-fit:cover}',
      '#lucy-head .avatar::after{content:\'\';position:absolute;bottom:1px;right:1px;width:10px;height:10px;background:var(--sage-dark,#22C55E);border:2px solid var(--charcoal,#1C1917);border-radius:50%}',
      '#lucy-head .meta{flex:1;min-width:0}',
      '#lucy-head .name{font-family:Nunito,sans-serif;font-weight:800;font-size:1.02rem;line-height:1.2}',
      '#lucy-head .role{font-size:.74rem;opacity:.8;display:flex;align-items:center;gap:5px}',
      '#lucy-head .role::before{content:\'\';width:6px;height:6px;border-radius:50%;background:var(--sage-dark,#22C55E)}',
      '#lucy-close{background:rgba(255,255,255,.12);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:15px;cursor:pointer;flex:none;display:flex;align-items:center;justify-content:center;transition:background .15s}',
      '#lucy-close:hover{background:rgba(255,255,255,.25)}',
      '#lucy-messages{flex:1;overflow-y:auto;padding:18px 16px;display:flex;flex-direction:column;gap:14px;background:var(--cream,#FFFBF5);scroll-behavior:smooth}',
      '#lucy-messages::-webkit-scrollbar{width:7px}',
      '#lucy-messages::-webkit-scrollbar-thumb{background:rgba(0,0,0,.14);border-radius:99px}',
      '.lucy-row{display:flex;gap:9px;align-items:flex-end;max-width:100%}',
      '.lucy-row.user{flex-direction:row-reverse}',
      '.lucy-msg-avatar{width:30px;height:30px;border-radius:50%;overflow:hidden;flex:none;border:1.5px solid var(--amber-light,#FEF3C7);background:#fff}',
      '.lucy-msg-avatar img{width:100%;height:100%;object-fit:cover}',
      '.lucy-col{display:flex;flex-direction:column;max-width:78%;min-width:0}',
      '.lucy-row.user .lucy-col{align-items:flex-end}',
      '.lucy-msg{font-size:.9rem;line-height:1.6;padding:11px 15px;word-wrap:break-word;overflow-wrap:anywhere;box-shadow:0 1px 2px rgba(0,0,0,.05)}',
      '.lucy-msg.bot{background:#fff;border:1px solid var(--border,#E7E5E4);border-radius:4px 16px 16px 16px;color:var(--charcoal,#1C1917)}',
      '.lucy-msg.user{background:linear-gradient(135deg,var(--amber,#F59E0B),var(--amber-dark,#D97706));color:#fff;border-radius:16px 4px 16px 16px}',
      '.lucy-msg.bot p{margin:0 0 7px}',
      '.lucy-msg.bot p:last-child{margin-bottom:0}',
      '.lucy-msg.bot strong{color:var(--amber-dark,#B45309)}',
      '.lucy-msg.bot a{color:var(--amber-dark,#B45309);font-weight:600}',
      '.lucy-time{font-size:.66rem;color:var(--gray,#78716C);margin:4px 6px 0;font-family:Inter,system-ui,sans-serif}',
      '.lucy-typing-msg{padding:13px 16px}',
      '.lucy-typing{display:inline-flex;gap:5px;align-items:center}',
      '.lucy-typing span{width:7px;height:7px;background:var(--amber,#F59E0B);border-radius:50%;animation:typingBounce 1.2s ease-in-out infinite}',
      '.lucy-typing span:nth-child(2){animation-delay:.15s}',
      '.lucy-typing span:nth-child(3){animation-delay:.3s}',
      '@keyframes typingBounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}',
      '.lucy-quick-replies{display:flex;flex-wrap:wrap;gap:7px;margin:2px 0 0 39px;max-width:85%}',
      '.lucy-quick-btn{background:#fff;border:1.5px solid var(--amber,#F59E0B);color:var(--amber-dark,#B45309);border-radius:999px;padding:6px 13px;font-size:.78rem;font-family:Nunito,sans-serif;font-weight:700;cursor:pointer;transition:all .15s}',
      '.lucy-quick-btn:hover{background:var(--amber,#F59E0B);color:#fff}',
      '.lucy-suggestions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:4px 0 2px 39px}',
      '.lucy-suggestion-card{display:flex;align-items:center;gap:8px;text-align:left;background:#fff;border:1px solid var(--border,#E7E5E4);border-radius:13px;padding:11px 12px;font-family:Nunito,sans-serif;font-weight:700;font-size:.8rem;color:var(--charcoal,#1C1917);cursor:pointer;transition:transform .12s,box-shadow .12s,border-color .12s}',
      '.lucy-suggestion-card:hover{border-color:var(--amber,#F59E0B);box-shadow:0 4px 14px rgba(245,158,11,.18);transform:translateY(-1px)}',
      '.lucy-suggestion-card:focus-visible{outline:2px solid var(--amber,#F59E0B);outline-offset:2px}',
      '.lucy-suggestion-icon{font-size:1.05rem;line-height:1;flex:none}',
      '.lucy-suggestion-label{line-height:1.25}',
      '.lucy-link-btn{display:inline-block;background:var(--amber,#F59E0B);color:#fff;padding:8px 16px;border-radius:999px;font-family:Nunito,sans-serif;font-weight:700;font-size:.85rem;text-decoration:none;margin-top:4px}',
      '.lucy-link-btn:hover{background:var(--amber-dark,#D97706)}',
      '#lucy-input-wrap{padding:12px 14px;border-top:1px solid var(--border,#E7E5E4);display:flex;gap:8px;background:#fff;align-items:center}',
      '#lucy-input{flex:1;padding:11px 16px;border:1.5px solid var(--border,#E7E5E4);border-radius:999px;font-size:.9rem;font-family:Inter,system-ui,sans-serif;outline:none;transition:border-color .15s,box-shadow .15s}',
      '#lucy-input:focus{border-color:var(--amber,#F59E0B);box-shadow:0 0 0 3px rgba(245,158,11,.15)}',
      '#lucy-send{width:42px;height:42px;background:linear-gradient(135deg,var(--amber,#F59E0B),var(--amber-dark,#D97706));border:none;border-radius:50%;color:#fff;font-size:1.05rem;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:transform .12s,opacity .15s}',
      '#lucy-send:hover{transform:scale(1.06)}',
      '#lucy-send:disabled{opacity:.5;cursor:not-allowed;transform:none}',
      '@media (max-width:768px){#lucy-panel{width:100vw;height:80vh;bottom:0;right:0;border-radius:18px 18px 0 0}.lucy-suggestions{grid-template-columns:1fr 1fr}.lucy-col{max-width:80%}}',
      '@media (max-width:380px){.lucy-suggestions{grid-template-columns:1fr}}',
      '@media (prefers-reduced-motion:reduce){#lucy-panel,#lucy-avatar-ring,#lucy-notif,.lucy-typing span,.lucy-suggestion-card,#lucy-send{animation:none!important;transition:none!important}}'
    ].join('\n');

  function injectStyles() {
    if (document.getElementById('lucy-styles')) return;
    var s = document.createElement('style');
    s.id = 'lucy-styles';
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  function ensureMount() {
    if (document.getElementById('lucy-widget-btn')) return;
    var btn = document.createElement('div');
    btn.id = 'lucy-widget-btn';
    btn.innerHTML = '<div id="lucy-avatar-ring"><div id="lucy-notif"></div><img src="' + LUCY_AVATAR + '" alt="Ask Lucy AI"></div><span id="lucy-label">Ask Lucy AI \u{1F43E}</span>';
    btn.addEventListener('click', openLucy);
    document.body.appendChild(btn);
    var panel = document.createElement('div');
    panel.id = 'lucy-panel';
    panel.innerHTML = [
      '<div id="lucy-head">',
      '  <div class="avatar"><img src="' + LUCY_AVATAR + '" alt="Lucy"></div>',
      '  <div class="meta"><div class="name">Lucy</div><div class="role">AI Pet Advisor</div></div>',
      '  <button id="lucy-close" aria-label="Close">\u2715</button>',
      '</div>',
      '<div id="lucy-messages" aria-live="polite"></div>',
      '<div id="lucy-input-wrap">',
      '  <input id="lucy-input" type="text" placeholder="Ask Lucy anything..." autocomplete="off">',
      '  <button id="lucy-send" aria-label="Send">\u27A4</button>',
      '</div>'
    ].join('\n');
    document.body.appendChild(panel);
    panel.querySelector('#lucy-close').addEventListener('click', closeLucy);
    panel.querySelector('#lucy-send').addEventListener('click', sendCurrent);
    panel.querySelector('#lucy-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); sendCurrent(); } });
  }

  var conversation = [];
  var started = false;
  var sending = false;
  var pendingLocalSearch = null;

  /**
   * Markdown-lite rendering is delegated to assets/safe-markdown.js, which
   * builds DOM nodes instead of HTML strings and validates every URL with the
   * URL API against an allow-list. Lucy's replies are model output and can be
   * steered by whatever a visitor types, so they must never reach innerHTML.
   *
   * safe-markdown.js is loaded on demand so a page that only includes lucy.js
   * still gets the safe path.
   */
  function ensureSafeMarkdown(cb) {
    if (window.PIMCSafeMarkdown) { cb(); return; }
    var existing = document.getElementById('pimc-safe-markdown-tag');
    if (existing) { existing.addEventListener('load', cb); return; }
    var tag = document.createElement('script');
    tag.id = 'pimc-safe-markdown-tag';
    tag.src = '/assets/safe-markdown.js';
    tag.addEventListener('load', cb);
    tag.addEventListener('error', cb);
    document.head.appendChild(tag);
  }

  /** Render `text` into `element` without ever building an HTML string. */
  function renderMessageInto(element, text) {
    if (window.PIMCSafeMarkdown) {
      window.PIMCSafeMarkdown.renderInto(element, text);
      return;
    }
    // Not loaded yet: show the words as plain text now, upgrade when it lands.
    element.textContent = String(text == null ? '' : text);
    ensureSafeMarkdown(function () {
      if (window.PIMCSafeMarkdown) window.PIMCSafeMarkdown.renderInto(element, text);
    });
  }

  // ---- Local-service search (reuses /.netlify/functions/places-search) ----
  var LUCY_LOCAL_CATEGORIES = [
    { cat: 'emergency vet', type: 'emergency-veterinarian', emergency: true, re: /\b(emergency\s*vet|emergency\s*veterinar|er\s*vet|24[\s-]*hour\s*vet|urgent\s*(care\s*)?vet|animal\s*er)/i },
    { cat: 'veterinarian', type: 'veterinarian', re: /\b(vet|veterinar|animal\s*hospital|animal\s*clinic)/i },
    { cat: 'pet groomer', type: 'grooming', re: /\b(groomer|grooming|groom)/i },
    { cat: 'dog boarding', type: 'boarding', re: /\b(boarding|board\s*my|kennel|overnight\s*(care|stay)|pet\s*hotel|doggy\s*daycare|dog\s*daycare|daycare)/i },
    { cat: 'dog trainer', type: 'training', re: /\b(trainer|training|obedience|puppy\s*class)/i },
        { cat: 'animal shelter', type: 'shelter', re: /\b(shelter|rescue|humane\s*society|adopt|adoption\s*center|spca)/i },
    { cat: 'pet store', type: 'pet-store', re: /\b(pet\s*store|pet\s*shop|pet\s*supply|pet\s*supplies|pet\s*food\s*store)/i }
  ];

  function detectLocalCategory(text) {
    for (var i = 0; i < LUCY_LOCAL_CATEGORIES.length; i++) {
      if (LUCY_LOCAL_CATEGORIES[i].re.test(text)) return LUCY_LOCAL_CATEGORIES[i];
    }
    return null;
  }
  function extractZip(text) {
    var m = text.match(/\b(\d{5})\b/);
    return m ? m[1] : null;
  }
  function extractCity(text) {
    var m = text.match(/\bnear\s+([A-Za-z][A-Za-z.\-' ]{1,40}?)(?:[?!.,]|$)/i);
    if (m && m[1]) {
      var c = m[1].trim();
      if (!/\b(me|here|my\s*area|my\s*location|us|you)\b/i.test(c)) return c;
    }
    m = text.match(/\bin\s+([A-Za-z][A-Za-z.\-' ]{1,40}?)(?:[?!.,]|$)/i);
    if (m && m[1]) {
      var c2 = m[1].trim();
      if (!/\b(me|here|my\s*area|my\s*location|the\s*area)\b/i.test(c2)) return c2;
    }
    return null;
  }
  function trackLocalSearch(category, locationKey, locationVal, count) {
    try {
      if (window.gtag) {
        var base = { search_category: category, result_count: count };
        base[locationKey] = locationVal;
        window.gtag('event', 'lucy_local_search', base);
        window.gtag('event', 'tool_usage', {
          tool_name: 'lucy_local_search',
          search_category: category,
          zip_code: locationKey === 'zip_code' ? locationVal : undefined,
          city: locationKey === 'city' ? locationVal : undefined,
          result_count: count
        });
      }
    } catch (e) {}
  }
  function buildResultsMarkdown(category, isEmergency, data) {
    var cityLabel = data.city || 'your area';
    var lines = [];
    var heading = category.charAt(0).toUpperCase() + category.slice(1);
    lines.push('Here are real ' + category + ' options near ' + cityLabel + ' \u{1F43E}');
    if (isEmergency) lines.push('\n**If this is urgent, call the nearest emergency vet before driving.**');
    lines.push('');
    data.results.forEach(function (p) {
      var parts = [];
      parts.push('**' + p.name + '**');
      if (p.address) parts.push('\u{1F4CD} ' + p.address);
      if (p.phone) parts.push('\u{1F4DE} ' + p.phone);
      var meta = [];
      if (p.rating) meta.push('\u2B50 ' + p.rating + (p.total_ratings ? ' (' + p.total_ratings + ')' : ''));
      if (p.open_now !== undefined && p.open_now !== null) meta.push(p.open_now ? 'Open now' : 'Closed');
      if (meta.length) parts.push(meta.join(' \u00B7 '));
      if (p.maps_url) parts.push('[View on Google Maps](' + p.maps_url + ')');
      lines.push(parts.join('\n'));
      lines.push('');
    });
    return lines.join('\n').trim();
  }
  function runLocalSearch(match, zip, city) {
    var locationKey = zip ? 'zip_code' : 'city';
    var locationVal = zip || city;
    showTyping();
    // The server accepts a 5-digit ZIP or a validated city string, and a
    // category id from its closed allow-list - never a free-text keyword.
    var body = zip ? { zip: zip, category: match.type } : { location: city, category: match.type };
    fetch(PLACES_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        hideTyping();
        if (!data || data.error || data.ok === false) {
          if (data && data.fallback && data.fallback.message) {
            var fb = data.fallback.message + ' [Search on Google Maps](' + data.fallback.maps_url + ')';
            trackLocalSearch(match.cat, locationKey, locationVal, 0);
            appendBot(fb);
            conversation.push({ role: 'assistant', content: fb });
            return;
          }
          trackLocalSearch(match.cat, locationKey, locationVal, 0);
          appendBot('I couldn\u2019t find that location. Could you double-check the ZIP code or city for me? \u{1F43E}');
          conversation.push({ role: 'assistant', content: 'Could not resolve location for local search.' });
          return;
        }
        var results = (data && data.results) || [];
        trackLocalSearch(match.cat, locationKey, locationVal, results.length);
        if (!results.length) {
          var none = 'I didn\u2019t find any ' + match.cat + ' within range of ' + (data.city || locationVal) + '. Try a nearby ZIP code and I\u2019ll search again. \u{1F43E}';
          if (match.emergency) none += '\n\n**If this is urgent, call the nearest emergency vet before driving.**';
          appendBot(none);
          conversation.push({ role: 'assistant', content: none });
          return;
        }
        var md = buildResultsMarkdown(match.cat, match.emergency, data);
        appendBot(md);
        conversation.push({ role: 'assistant', content: md });
      })
      .catch(function () {
        hideTyping();
        trackLocalSearch(match.cat, locationKey, locationVal, 0);
        var err = 'I had trouble reaching the local search just now. Give it another try in a moment, or you can search [' + match.cat + ' near ' + locationVal + '](https://www.google.com/maps/search/' + encodeURIComponent(match.type + ' near ' + locationVal) + ') directly.';
        appendBot(err);
        conversation.push({ role: 'assistant', content: err });
      });
  }
  // Returns true if the message was handled as a local search (or a prompt for location).
  /* Routing hint only - NOT a clinical classifier.
   *
   * The authoritative red-flag classification lives server-side in
   * netlify/lib/safety/vet-safety-config.js. This regex exists purely so a
   * message that sounds urgent is sent to /lucy-chat (where that classifier
   * runs and answers deterministically) instead of being short-circuited into
   * a Places lookup. Over-matching here is harmless: it just means the server
   * decides. */
  var LUCY_URGENT_HINT = /\b(breath|breathing|choking|gasping|collaps|unconscious|unresponsive|seizure|seizing|convuls|bleeding|blood|poison|toxic|ate\s+(chocolate|xylitol|grapes|raisins|rat\s*poison|antifreeze|a\s+pill|pills|ibuprofen|tylenol|advil)|can'?t\s*(pee|urinate)|hit\s+by\s+a?\s*car|heat\s*stroke|overheat|anaphyla|swollen\s+(face|muzzle|throat)|bloat|retching|dry\s*heav)/i;

  function handleLocalIntent(text) {
    // Anything that sounds urgent goes to the server, which runs the
    // deterministic veterinary safety layer and answers immediately.
    if (LUCY_URGENT_HINT.test(text)) return false;
    var zip = extractZip(text);
    var city = extractCity(text);
    var match = detectLocalCategory(text);

    // If we previously asked for a location and now got one, resume the pending search.
    if (pendingLocalSearch && (zip || city)) {
      var pend = pendingLocalSearch;
      pendingLocalSearch = null;
      runLocalSearch(pend, zip, city);
      return true;
    }
    if (!match) return false;
    if (zip || city) {
      runLocalSearch(match, zip, city);
      return true;
    }
    // Local intent but no location yet: ask for ZIP/city and remember the category.
    pendingLocalSearch = match;
    var ask = 'I can find real ' + match.cat + ' options near you \u{1F43E} What\u2019s your ZIP code or city?';
    if (match.emergency) ask = 'I can find the nearest emergency vets right away \u{1F43E} What\u2019s your ZIP code or city?\n\n**If this is urgent, call the nearest emergency vet before driving.**';
    appendBot(ask);
    conversation.push({ role: 'assistant', content: ask });
    return true;
  }

  function appendBot(text, opts) {
    var box = document.getElementById('lucy-messages');
    var row = document.createElement('div');
    row.className = 'lucy-row bot';
    var av = document.createElement('div');
    av.className = 'lucy-msg-avatar';
    av.innerHTML = '<img src="' + LUCY_AVATAR + '" alt="">';
    var col = document.createElement('div');
    col.className = 'lucy-col';
    var d = document.createElement('div');
    d.className = 'lucy-msg bot';
    renderMessageInto(d, text);
    col.appendChild(d);
    var t = document.createElement('div');
    t.className = 'lucy-time';
    t.textContent = nowTime();
    col.appendChild(t);
    row.appendChild(av);
    row.appendChild(col);
    box.appendChild(row);
    if (opts && opts.quickReplies) {
      var qr = document.createElement('div');
      qr.className = 'lucy-quick-replies';
      opts.quickReplies.forEach(function (q) {
        var bn = document.createElement('button');
        bn.className = 'lucy-quick-btn';
        bn.type = 'button';
        bn.textContent = q.label;
        bn.addEventListener('click', function () { send(q.text || q.label); });
        qr.appendChild(bn);
      });
      box.appendChild(qr);
    }
    box.scrollTop = box.scrollHeight;
  }

  function nowTime() {
    try {
      return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) { return ''; }
  }
  function appendUser(text) {
    var box = document.getElementById('lucy-messages');
    var sg = document.getElementById('lucy-suggestions');
    if (sg && sg.parentNode) sg.parentNode.removeChild(sg);
    var row = document.createElement('div');
    row.className = 'lucy-row user';
    var col = document.createElement('div');
    col.className = 'lucy-col';
    var d = document.createElement('div');
    d.className = 'lucy-msg user';
    d.textContent = text;
    col.appendChild(d);
    var t = document.createElement('div');
    t.className = 'lucy-time';
    t.textContent = nowTime();
    col.appendChild(t);
    row.appendChild(col);
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }
  function showTyping() {
    var box = document.getElementById('lucy-messages');
    var row = document.createElement('div');
    row.id = 'lucy-typing-bubble';
    row.className = 'lucy-row bot';
    row.setAttribute('aria-label', 'Lucy is typing');
    row.innerHTML = '<div class="lucy-msg-avatar"><img src="' + LUCY_AVATAR + '" alt=""></div>' +
      '<div class="lucy-col"><div class="lucy-msg bot lucy-typing-msg"><div class="lucy-typing"><span></span><span></span><span></span></div></div></div>';
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }
  function hideTyping() {
    var t = document.getElementById('lucy-typing-bubble');
    if (t) t.remove();
  }
  function openLucy() {
    ensureMount();
    var p = document.getElementById('lucy-panel');
    p.classList.add('open');
    var b = document.getElementById('lucy-widget-btn');
    if (b) b.style.display = 'none';
    try { if (window.pimcTrack) { window.pimcTrack('lucy_chat_opened', {}); } else if (window.gtag) { window.gtag('event', 'lucy_chat_opened', {}); } } catch (e) {}
    if (!started) {
      started = true;
      appendBot('Hi! \u{1F43E} I\u2019m Lucy, your trusted AI pet companion. Ask me anything \u2014 finding local vets, groomers and boarding, food safety, emergencies, or just a question about your pet. Pick a starting point below, or type your own.');
      renderSuggestions();
    }
    setTimeout(function () { var i = document.getElementById('lucy-input'); if (i) i.focus(); }, 100);
  }

  function renderSuggestions() {
    var box = document.getElementById('lucy-messages');
    if (!box) return;
    if (document.getElementById('lucy-suggestions')) return;
    var suggestions = [
      { icon: '\u{1F691}', label: 'Find an emergency vet', text: 'Find an emergency vet near me' },
      { icon: '\u{1F36C}', label: 'Is this food safe?', text: 'Is this food safe for my pet?' },
      { icon: '\u2702\uFE0F', label: 'Find a groomer', text: 'Help me find a groomer near me' },
      { icon: '\u{1F415}', label: 'Help me choose dog food', text: 'Help me choose dog food' },
      { icon: '\u{1F436}', label: 'Puppy checklist', text: 'What should be on my new puppy checklist?' },
      { icon: '\u2708\uFE0F', label: 'Traveling with my pet', text: 'How do I travel with my pet?' },
      { icon: '\u{1F4AC}', label: 'Ask anything', text: '' }
    ];
    var wrap = document.createElement('div');
    wrap.id = 'lucy-suggestions';
    wrap.className = 'lucy-suggestions';
    wrap.setAttribute('role', 'list');
    wrap.setAttribute('aria-label', 'Suggested questions');
    suggestions.forEach(function (s) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'lucy-suggestion-card';
      card.setAttribute('role', 'listitem');
      card.innerHTML = '<span class="lucy-suggestion-icon" aria-hidden="true">' + s.icon + '</span><span class="lucy-suggestion-label"></span>';
      card.querySelector('.lucy-suggestion-label').textContent = s.label;
      card.addEventListener('click', function () {
        try { if (window.pimcTrack) { window.pimcTrack('lucy_suggestion_clicked', { suggestion: s.label }); } else if (window.gtag) { window.gtag('event', 'lucy_suggestion_clicked', { suggestion: s.label }); } } catch (e) {}
        var input = document.getElementById('lucy-input');
        if (input) {
          input.value = s.text;
          input.focus();
          try { var len = input.value.length; input.setSelectionRange(len, len); } catch (e) {}
        }
      });
      wrap.appendChild(card);
    });
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  }
  function closeLucy() {
    var p = document.getElementById('lucy-panel');
    p.classList.remove('open');
    var b = document.getElementById('lucy-widget-btn');
    if (b) b.style.display = 'flex';
    // Conversation memory is in-session only. Closing the chat ends the
    // session, so clear it \u2014 nothing is persisted.
    try { if (window.PIMCLucy && window.PIMCLucy.reset) window.PIMCLucy.reset(); } catch (e) {}
  }
    // Veterinary Care Engine integration: Lucy runs a natural consultation
  // BEFORE recommending any provider. The architecture (vet-care-engine.js)
  // is unchanged; this only improves the conversation experience.
  // Flow: warm acknowledgement -> one optional clarifying question ->
  // short education -> recommend the right care pathway -> only then
  // introduce Dutch (online path only) -> end with a helpful follow-up.
  // Lucy never diagnoses, never replaces emergency or in-person care, and
  // never recommends a provider in an emergency. See docs/lucy-brain.md.
  var carePending = null; // truthy while awaiting a clarifying reply

  // Heuristic: does the message describe a concrete concern yet, or is it
  // just a vague request to 'talk to a vet'? Used to decide whether ONE
  // clarifying question adds value or only adds friction.
  function careConcernIsClear(text) {
    var t = String(text || '').toLowerCase();
    if (t.split(/\s+/).filter(Boolean).length >= 8) return true;
    return /(vomit|throw|diarrhea|stool|poop|pee|urinat|limp|paw|leg|ear|eye|skin|itch|scratch|rash|lump|bump|cough|sneez|breath|appetite|eating|drink|letharg|tired|weight|flea|tick|worm|teeth|tooth|gum|bleed|swell|pain|hurt|fever|seizure|shak|allerg|medication|prescription|refill|behav|anxiet|aggress|spay|neuter|vaccin|wound|cut|hot spot|infection)/.test(t);
  }

  function handleCarePathway(text) {
    // Phase 2.3: when the Lucy Decision Engine is present, it becomes the
    // single brain \u2014 it remembers what was shared this session and
    // orchestrates the full consultation (understand, urgency, minimal
    // clarifying question, pathway, explanation, recommendation, follow-up).
    // We keep the original self-contained logic below as a graceful fallback
    // in case the engine fails to load, so Lucy never breaks.
    var LDE = window.PIMCLucy;
    if (LDE && typeof LDE.orchestrate === 'function') {
      try { LDE.remember(text); } catch (e) {}
      var plan = null;
      try { plan = LDE.orchestrate(text); } catch (e) { plan = null; }
      if (!plan) return false; // not a care conversation \u2014 let Lucy handle it
      var msg = plan.lines.join('\n');
      appendBot(msg);
      conversation.push({ role: 'assistant', content: msg });
      if (plan.analytics && plan.analytics.event) {
        try { if (window.pimcTrack) window.pimcTrack(plan.analytics.event, plan.analytics.params || {}); } catch (e) {}
      }
      return true;
    }
    // ---- Fallback (engine unavailable): original in-file logic ----
    var VC = window.PIMCVetCare;
    if (!VC || typeof VC.recommend !== 'function') return false;
    var rec = VC.recommend(text);
    if (!rec || !rec.path) return false;
    var p = rec.path;
    var lines = [];

    // Emergencies and poison control ALWAYS escalate immediately. Lucy never
    // pauses to clarify and never mentions a provider in these cases.
    if (rec.isEmergency) {
      carePending = null;
      lines.push('I want to make sure your pet stays safe \u2014 this may be an emergency.');
      lines.push('');
      lines.push(rec.reason);
      lines.push('');
      lines.push('Please contact your nearest emergency vet right away. You can [find an emergency vet](/tools/emergency-finder/) near you, and for a suspected poisoning, call an animal poison control hotline as well.');
      appendBot(lines.join('\n'));
      conversation.push({ role: 'assistant', content: lines.join('\n') });
      try { if (window.pimcTrack) window.pimcTrack('lucy_care_pathway', { path: p.id, emergency: true }); } catch (e) {}
      return true;
    }

    // Step 1 + 2: for non-urgent care questions, open warmly and ask ONE
    // brief clarifying question first \u2014 but only when the concern isn't
    // already clear, and only once (carePending guards against re-asking).
    if (!carePending && !careConcernIsClear(text)) {
      carePending = { intent: true };
      var ack = [];
      ack.push("I'd be happy to help \u2014 let's figure out the best option together.");
      ack.push('');
      ack.push('So I can point you in the right direction, can you tell me a little more about what\u2019s going on with your pet?');
      appendBot(ack.join('\n'));
      conversation.push({ role: 'assistant', content: ack.join('\n') });
      return true;
    }

    // We're now resolving the recommendation. Clear any pending state.
    carePending = null;

    // Step 3: a short, balanced explanation BEFORE naming any provider.
    lines.push('Thanks for sharing that.');
    lines.push('');
    lines.push(rec.reason);
    lines.push('');
    // Step 4: recommend the right care pathway, and explain why.
    lines.push('Based on that, ' + p.label + ' is usually the right fit here. [Learn more](' + p.link + ').');

    // Step 5: only on the online path, and only after the guidance above,
    // does Lucy gently introduce a provider \u2014 as a trusted option, never
    // as the hero, and always with the affiliate disclosure intact.
    if (rec.providers && rec.providers.length) {
      lines.push('');
      lines.push('If you\u2019d like to talk with a licensed vet online for a non-urgent question, [our Online Vet guide](/online-vet/) explains how it works.');
      rec.providers.forEach(function (pr) {
        lines.push('One online veterinary service we trust is ' + pr.name + '. (' + pr.name + ' is an affiliate partner; PetsInMyCity may earn a small commission, at no extra cost to you. This never changes our guidance.)');
      });
    }

    // Step 6: always end with an open, helpful follow-up question.
    lines.push('');
    if (rec.providers && rec.providers.length) {
      lines.push('Would you like me to explain how online vets work, or help you decide whether this is something that should be seen in person?');
    } else {
      lines.push('Would you like help finding the right place near you, or is there anything else I can walk you through?');
    }

    appendBot(lines.join('\n'));
    conversation.push({ role: 'assistant', content: lines.join('\n') });
    try { if (window.pimcTrack) window.pimcTrack('lucy_care_pathway', { path: p.id, emergency: false, providers: (rec.providers||[]).length }); } catch (e) {}
    return true;
  }
/* Public copy for each stable error code returned by /lucy-chat. The server
 * never sends a provider message, and we never render one. */
var LUCY_ERROR_COPY = {
  rate_limited: 'You have sent quite a few messages in a short time \u{1F43E} Give it a minute and try again.',
  invalid_request: 'Something about that message did not come through. Try rephrasing it.',
  payload_too_large: 'That message was a bit long for me. Could you shorten it?',
  service_unavailable: 'I am temporarily unavailable. Please try again shortly.',
  upstream_timeout: 'That took too long to come back. Try asking me again.',
  upstream_unavailable: 'I could not reach my brain just now. Try again in a moment.',
  origin_not_allowed: 'I could not run from this page.'
};
function lucyErrorCopy(code) {
  var base = LUCY_ERROR_COPY[code] || 'Sorry, I had trouble responding just now.';
  return base + ' In the meantime you can visit [Pet Insurance](/pet-insurance/) or [Find a Vet](/find-a-vet/) directly.';
}

async function send(text) {
    if (sending) return;
    text = String(text || '').trim();
    if (!text) return;
    sending = true;
    var sendBtn = document.getElementById('lucy-send');
    if (sendBtn) sendBtn.disabled = true;
    appendUser(text);
    conversation.push({ role: 'user', content: text });
    try { if (window.gtag) window.gtag('event', 'lucy_message_sent', { message_count: conversation.length }); } catch (e) {}

    // Care pathway triage FIRST: determine urgency and the right kind of care
    // (emergency, poison, local, specialist, online, behavioral) before anything
    // else. The engine returns no path for pure 'find X near me' requests, so
    // those fall through to local search exactly as before.
    var handledCare = false;
    try { handledCare = handleCarePathway(text); } catch (e) { handledCare = false; }
    if (handledCare) {
      sending = false;
      if (sendBtn) sendBtn.disabled = false;
      return;
    }

    // Local-service intent: use the working Google Places endpoint instead of a generic chat answer.
    var handledLocally = false;
    try { handledLocally = handleLocalIntent(text); } catch (e) { handledLocally = false; }
    if (handledLocally) {
      sending = false;
      if (sendBtn) sendBtn.disabled = false;
      return;
    }

    showTyping();
    try {
      var r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: conversation }) });
      var j = await r.json();
      hideTyping();
      if (j && j.reply) {
        conversation.push({ role: 'assistant', content: j.reply });
        appendBot(j.reply);
      } else {
        appendBot(lucyErrorCopy(j && j.error));
      }
    } catch (e) {
      hideTyping();
      appendBot('Connection trouble. Try again in a moment, or visit [Pet Insurance](/pet-insurance/) or [Find a Vet](/find-a-vet/) directly.');
    }
    sending = false;
    if (sendBtn) sendBtn.disabled = false;
  }
  function sendCurrent() {
    var i = document.getElementById('lucy-input');
    if (!i) return;
    var v = i.value;
    i.value = '';
    send(v);
  }
  window.Lucy = { open: openLucy, close: closeLucy, send: send };
  function boot() {
    injectStyles();
    ensureMount();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
