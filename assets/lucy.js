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
    '#lucy-avatar-ring{width:80px;height:80px;border-radius:50%;border:3px solid var(--amber, #F59E0B);overflow:hidden;position:relative;box-shadow:0 4px 20px rgba(245,158,11,0.4);animation:lucyPulse 2s ease-in-out infinite;background:#fff}',
    '#lucy-avatar-ring img{width:100%;height:100%;object-fit:cover;border-radius:50%}',
    '@keyframes lucyPulse{0%,100%{box-shadow:0 4px 20px rgba(245,158,11,0.4)}50%{box-shadow:0 4px 32px rgba(245,158,11,0.7)}}',
    '#lucy-label{background:var(--charcoal, #1C1917);color:#fff;font-family:Nunito,sans-serif;font-weight:700;font-size:0.75rem;padding:4px 12px;border-radius:999px;white-space:nowrap}',
    '#lucy-notif{position:absolute;top:0;right:0;width:18px;height:18px;background:var(--coral, #FB7185);border-radius:50%;border:2px solid #fff;animation:notifPulse 1.5s ease-in-out infinite;z-index:2}',
    '@keyframes notifPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}',
    '#lucy-panel{position:fixed;bottom:24px;right:24px;width:360px;height:520px;background:#fff;border-radius:20px;box-shadow:0 16px 60px rgba(0,0,0,0.2);z-index:9999;display:none;flex-direction:column;overflow:hidden;border:2px solid var(--amber-light, #FEF3C7);animation:slideUp 0.3s ease-out;font-family:Inter,system-ui,sans-serif}',
    '#lucy-panel.open{display:flex}',
    '@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}',
    '#lucy-head{background:linear-gradient(135deg,var(--charcoal, #1C1917),#2d2d2d);padding:16px 20px;display:flex;align-items:center;gap:12px;color:#fff}',
    '#lucy-head .avatar{width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid var(--amber, #F59E0B);flex:none}',
    '#lucy-head .avatar img{width:100%;height:100%;object-fit:cover}',
    '#lucy-head .meta{flex:1}',
    '#lucy-head .name{font-family:Nunito,sans-serif;font-weight:700;font-size:1rem;line-height:1.2}',
    '#lucy-head .role{color:rgba(255,255,255,0.6);font-size:0.75rem}',
    '#lucy-close{background:none;border:none;color:#fff;opacity:0.7;font-size:1.2rem;cursor:pointer;padding:4px 8px}',
    '#lucy-close:hover{opacity:1}',
    '#lucy-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#fafafa}',
    '.lucy-msg{max-width:85%;font-size:0.875rem;line-height:1.6;padding:10px 14px;word-wrap:break-word}',
    '.lucy-msg.bot{background:#fff;border:1px solid var(--border, #E7E5E4);border-radius:0 12px 12px 12px;color:var(--charcoal, #1C1917);align-self:flex-start}',
    '.lucy-msg.user{background:var(--amber, #F59E0B);color:#fff;border-radius:12px 0 12px 12px;align-self:flex-end}',
    '.lucy-msg.bot p{margin:0 0 6px}',
    '.lucy-msg.bot p:last-child{margin-bottom:0}',
    '.lucy-typing{display:inline-flex;gap:4px;align-items:center;padding:4px 0}',
    '.lucy-typing span{width:7px;height:7px;background:var(--gray, #57534E);border-radius:50%;animation:typingBounce 1.2s ease-in-out infinite}',
    '.lucy-typing span:nth-child(2){animation-delay:0.15s}',
    '.lucy-typing span:nth-child(3){animation-delay:0.3s}',
    '@keyframes typingBounce{0%,60%,100%{transform:translateY(0);opacity:0.4}30%{transform:translateY(-6px);opacity:1}}',
    '.lucy-quick-replies{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;align-self:flex-start;max-width:85%}',
    '.lucy-quick-btn{background:#fff;border:1.5px solid var(--amber, #F59E0B);color:var(--amber-dark, #B45309);border-radius:999px;padding:5px 12px;font-size:0.8rem;font-family:Nunito,sans-serif;font-weight:600;cursor:pointer;transition:all 0.15s}',
    '.lucy-quick-btn:hover{background:var(--amber, #F59E0B);color:#fff}',
    '.lucy-link-btn{display:inline-block;background:var(--amber, #F59E0B);color:#fff;padding:8px 16px;border-radius:999px;font-family:Nunito,sans-serif;font-weight:700;font-size:0.85rem;text-decoration:none;margin:6px 4px 0 0}',
    '.lucy-link-btn:hover{background:var(--amber-dark, #B45309)}',
    '#lucy-input-wrap{padding:12px 16px;border-top:1px solid var(--border, #E7E5E4);display:flex;gap:8px;background:#fff}',
    '#lucy-input{flex:1;padding:10px 16px;border:1.5px solid var(--border, #E7E5E4);border-radius:999px;font-size:0.9rem;font-family:Inter,system-ui,sans-serif;outline:none}',
    '#lucy-input:focus{border-color:var(--amber, #F59E0B)}',
    '#lucy-send{width:40px;height:40px;background:var(--amber, #F59E0B);border:none;border-radius:50%;color:#fff;font-size:1rem;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center}',
    '#lucy-send:disabled{opacity:0.5;cursor:not-allowed}',
    '@media (max-width:768px){#lucy-panel{width:100vw;height:75vh;bottom:0;right:0;border-radius:20px 20px 0 0}}'
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

  function escapeHTML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function renderMarkdownLite(text) {
    var safe = escapeHTML(text);
    var links = [];
    safe = safe.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, function (m, label, url) {
      links.push({ label: label, url: url });
      return '\u0000LINK' + (links.length - 1) + '\u0000';
    });
    safe = safe.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    safe = '<p>' + safe + '</p>';
    safe = safe.replace(/\u0000LINK(\d+)\u0000/g, function (m, i) {
      var l = links[Number(i)];
      var rel = l.url.indexOf('http') === 0 ? ' rel="sponsored noopener" target="_blank"' : '';
      return '<a class="lucy-link-btn" href="' + l.url + '"' + rel + ' onclick="window.__lucyTrackLink && window.__lucyTrackLink(\'' + l.url + '\')">' + l.label + ' \u2192</a>';
    });
    return safe;
  }
  window.__lucyTrackLink = function (url) {
    try { if (window.gtag) window.gtag('event', 'lucy_link_clicked', { url: url }); } catch (e) {}
  };

  // ---- Local-service search (reuses /.netlify/functions/places-search) ----
  var LUCY_LOCAL_CATEGORIES = [
    { cat: 'emergency vet', type: 'emergency vet', emergency: true, re: /\b(emergency\s*vet|emergency\s*veterinar|er\s*vet|24[\s-]*hour\s*vet|urgent\s*(care\s*)?vet|animal\s*er)\b/i },
    { cat: 'veterinarian', type: 'veterinarian', re: /\b(vet|vets|veterinar|veterinarian|animal\s*hospital|animal\s*clinic)\b/i },
    { cat: 'pet groomer', type: 'pet groomer', re: /\b(groomer|grooming|groom)\b/i },
    { cat: 'dog boarding', type: 'dog boarding', re: /\b(boarding|board\s*my|kennel|kennels|overnight\s*(care|stay)|pet\s*hotel|doggy\s*daycare|dog\s*daycare|daycare)\b/i },
    { cat: 'dog trainer', type: 'dog trainer', re: /\b(trainer|training|obedience|puppy\s*class)\b/i },
    { cat: 'dog park', type: 'dog park', re: /\b(dog\s*park|dog\s*parks|off[\s-]*leash)\b/i },
    { cat: 'animal shelter', type: 'animal shelter', re: /\b(shelter|shelters|rescue|rescues|humane\s*society|adopt\b|adoption\s*center|spca)\b/i },
    { cat: 'pet store', type: 'pet store', re: /\b(pet\s*store|pet\s*shop|pet\s*supply|pet\s*supplies|pet\s*food\s*store)\b/i }
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
    var body = { zip: zip || city, type: match.type };
    fetch(PLACES_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        hideTyping();
        if (data && data.error) {
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
  function handleLocalIntent(text) {
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
    var d = document.createElement('div');
    d.className = 'lucy-msg bot';
    d.innerHTML = renderMarkdownLite(text);
    box.appendChild(d);
    if (opts && opts.quickReplies) {
      var qr = document.createElement('div');
      qr.className = 'lucy-quick-replies';
      opts.quickReplies.forEach(function (q) {
        var b = document.createElement('button');
        b.className = 'lucy-quick-btn';
        b.textContent = q.label;
        b.addEventListener('click', function () { send(q.text || q.label); });
        qr.appendChild(b);
      });
      box.appendChild(qr);
    }
    box.scrollTop = box.scrollHeight;
  }
  function appendUser(text) {
    var box = document.getElementById('lucy-messages');
    var d = document.createElement('div');
    d.className = 'lucy-msg user';
    d.textContent = text;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }
  function showTyping() {
    var box = document.getElementById('lucy-messages');
    var d = document.createElement('div');
    d.id = 'lucy-typing-bubble';
    d.className = 'lucy-msg bot';
    d.innerHTML = '<div class="lucy-typing"><span></span><span></span><span></span></div>';
    box.appendChild(d);
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
    try { if (window.gtag) window.gtag('event', 'lucy_chat_opened', {}); } catch (e) {}
    if (!started) {
      started = true;
      appendBot('Hi! \u{1F43E} I\u2019m Lucy, your AI pet advisor. Ask me anything \u2014 insurance, vets, dog walking, adoption, health questions, food recommendations \u2014 I\u2019m here to help!', {
        quickReplies: [
          { label: '\u{1F3E5} Pet Insurance', text: 'What pet insurance do you recommend?' },
          { label: '\u{1FA7A} Find a Vet', text: 'How do I find a vet near me?' },
          { label: '\u{1F9AE} Dog Walking', text: 'How do I find a dog walker?' },
          { label: '\u{1F43E} Adoption', text: 'I want to adopt a pet' },
          { label: '\u{1F6D2} Shop Pet Supplies', text: 'Shop Pet Supplies' },
          { label: '\u2753 Something else', text: 'I have a different question' }
        ]
      });
    }
    setTimeout(function () { var i = document.getElementById('lucy-input'); if (i) i.focus(); }, 100);
  }
  function closeLucy() {
    var p = document.getElementById('lucy-panel');
    p.classList.remove('open');
    var b = document.getElementById('lucy-widget-btn');
    if (b) b.style.display = 'flex';
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
      if (j.reply) {
        conversation.push({ role: 'assistant', content: j.reply });
        appendBot(j.reply);
      } else {
        appendBot('Sorry, I had trouble responding just now. ' + (j.error ? ('(' + j.error + ')') : '') + ' Try again in a moment, or visit [Pet Insurance](/pet-insurance/) or [Find a Vet](/find-a-vet/) directly.');
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
