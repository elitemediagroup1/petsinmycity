/* PetsInMyCity — Lucy Care Companion(TM) Notification Engine
   Unified, provider-agnostic communication foundation for Lucy.
   ----------------------------------------------------------------------------
   Goal: let Lucy proactively help owners across Email, SMS, Browser, and (future)
   Mobile Push through ONE engine that shares scheduling, preference, and tone logic.

   Design principles (see docs/platform-architecture.md, docs/lucy-brain.md):
     - Static-web today (localStorage), but a CLOUD-SHAPED schema so static -> PWA
       -> native -> API is an evolution, not a rewrite.
     - Providers (Resend/SendGrid, Twilio/Telnyx, Firebase/OneSignal/APNs) are
       swapped behind a common ChannelProvider interface. NO provider is hardcoded;
       none are bundled. Sending is delegated to a future transport layer.
     - Every message sounds like Lucy: warm, encouraging, helpful. Never spammy,
       never fear-based, never overly promotional.
     - Analytics are non-identifying (no PII). Reuse window.pimcTrack.

   Privacy: preferences live only in this browser under a namespaced, versioned key.
   No message bodies, contact details, or PII are ever sent to analytics. */
(function (global) {
  'use strict';

  var KEY = 'pimc-notifications-v1';
  var SCHEMA_VERSION = 1;

  /* =====================================================================
     Analytics — non-identifying events only
     ===================================================================== */
  function track(name, params) {
    try {
      var p = (params && typeof params === 'object') ? params : {};
      /* Strip anything that could be PII before it ever leaves the engine. */
      var safe = {};
      var allow = ['channel', 'type', 'enabled', 'count', 'reason', 'source', 'category'];
      for (var i = 0; i < allow.length; i++) {
        if (p[allow[i]] !== undefined) { safe[allow[i]] = p[allow[i]]; }
      }
      if (typeof global.pimcTrack === 'function') { global.pimcTrack(name, safe); }
      else if (typeof global.gtag === 'function') { global.gtag('event', name, safe); }
    } catch (e) { /* never block UX on analytics */ }
  }

  /* =====================================================================
     Notification type catalog — extensible by design.
     Add a new type by appending one object here; UI + engine pick it up.
     ===================================================================== */
  var TYPES = [
    { id: 'medication',   label: 'Medication reminders',   icon: '\u{1F48A}', desc: 'Gentle nudges so a dose is never missed. Reminders only \u2014 never dosing advice.', defaultOn: true,  critical: false },
    { id: 'birthday',     label: 'Birthday reminders',     icon: '\u{1F382}', desc: 'A little heads-up for birthdays and gotcha-days worth celebrating.',                 defaultOn: true,  critical: false },
    { id: 'grooming',     label: 'Grooming reminders',     icon: '\u2702\uFE0F', desc: 'Nail trims, baths, and coat care, right when they come due.',                       defaultOn: true,  critical: false },
    { id: 'vaccination',  label: 'Vaccination reminders',  icon: '\u{1F489}', desc: 'A friendly reminder when a wellness vaccine may be coming up.',                      defaultOn: true,  critical: false },
    { id: 'wellness',     label: 'Wellness check-ins',     icon: '\u{1FA7A}', desc: 'Occasional check-ins to see how your pet is doing.',                                 defaultOn: true,  critical: false },
    { id: 'seasonal',     label: 'Seasonal safety alerts', icon: '\u{1F341}', desc: 'Plain, helpful guidance for seasonal hazards \u2014 no scare tactics.',              defaultOn: true,  critical: false },
    { id: 'weather',      label: 'Weather alerts',         icon: '\u26C5',     desc: 'Heads-up on heat, cold, and weather that affects your pet\u2019s comfort.',           defaultOn: true,  critical: false },
    { id: 'recall',       label: 'Product recalls',        icon: '\u{1F4E6}', desc: 'Timely word if a food or product your pet may use is recalled.',                    defaultOn: true,  critical: false },
    { id: 'emergency',    label: 'Emergency alerts',       icon: '\u{1F6A8}', desc: 'Important safety alerts. We keep these rare and only when they truly matter.',       defaultOn: true,  critical: true },
    { id: 'educational',  label: 'Educational tips',       icon: '\u{1F4A1}', desc: 'Bite-sized, trustworthy tips to help you care with confidence.',                    defaultOn: true,  critical: false }
  ];

  /* =====================================================================
     Channel catalog — Email, SMS, Browser today; Mobile Push (architecture only).
     'optIn' channels require explicit consent (SMS, Push).
     ===================================================================== */
  var CHANNELS = [
    { id: 'email',   label: 'Email',                icon: '\u2709\uFE0F', optIn: false, available: true,  desc: 'Calm, well-written notes from Lucy.' },
    { id: 'sms',     label: 'Text message (SMS)',   icon: '\u{1F4AC}',     optIn: true,  available: true,  desc: 'Short reminders by text. Opt-in, and easy to stop anytime.' },
    { id: 'browser', label: 'Browser notifications',icon: '\u{1F514}',     optIn: true,  available: true,  desc: 'Quick nudges in this browser, only if you allow them.' },
    { id: 'push',    label: 'Mobile push',          icon: '\u{1F4F1}',     optIn: true,  available: false, desc: 'Coming with the PetsInMyCity app.' }
  ];

  /* =====================================================================
     Storage — versioned, cloud-shaped, multi-pet-ready.
     ===================================================================== */
  function defaults() {
    var typePrefs = {};
    for (var i = 0; i < TYPES.length; i++) { typePrefs[TYPES[i].id] = !!TYPES[i].defaultOn; }
    return {
      schemaVersion: SCHEMA_VERSION,
      /* Master switch. Channels start OFF until the owner sets up delivery. */
      enabled: false,
      channels: { email: false, sms: false, browser: false, push: false },
      types: typePrefs,
      /* Contact + quiet hours are placeholders the dashboard/account layer fills later. */
      contact: { email: '', phone: '' },
      quietHours: { enabled: false, start: '22:00', end: '07:00' },
      updatedAt: null
    };
  }

  function load() {
    try {
      var raw = global.localStorage ? global.localStorage.getItem(KEY) : null;
      if (!raw) { return defaults(); }
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') { return defaults(); }
      var base = defaults();
      /* Forward-compatible merge: unknown keys are kept, missing keys are filled. */
      data.schemaVersion = data.schemaVersion || SCHEMA_VERSION;
      data.channels = Object.assign({}, base.channels, data.channels || {});
      var t = Object.assign({}, base.types, data.types || {});
      /* Ensure every catalog type has an entry, even newly added ones. */
      for (var i = 0; i < TYPES.length; i++) { if (t[TYPES[i].id] === undefined) { t[TYPES[i].id] = !!TYPES[i].defaultOn; } }
      data.types = t;
      data.contact = Object.assign({}, base.contact, data.contact || {});
      data.quietHours = Object.assign({}, base.quietHours, data.quietHours || {});
      if (typeof data.enabled !== 'boolean') { data.enabled = false; }
      return data;
    } catch (e) { return defaults(); }
  }

  function save(state) {
    try {
      state.updatedAt = new Date().toISOString();
      if (global.localStorage) { global.localStorage.setItem(KEY, JSON.stringify(state)); }
    } catch (e) { /* private mode / quota: fail quietly */ }
    return state;
  }

  /* =====================================================================
     Public surface (part 1): catalog + state. Part 2 augments this object.
     ===================================================================== */
  function getState() { return load(); }
  function setEnabled(on) {
    var s = load(); s.enabled = !!on; save(s);
    track(on ? 'notification_enabled' : 'notification_disabled', { source: 'master' });
    return s;
  }
  function setChannel(channel, on) {
    var s = load();
    if (!s.channels.hasOwnProperty(channel)) { return s; }
    s.channels[channel] = !!on;
    /* Turning on any channel implies the system is active. */
    if (on) { s.enabled = true; }
    save(s);
    track(on ? 'notification_enabled' : 'notification_disabled', { channel: channel, source: 'channel' });
    return s;
  }
  function setType(typeId, on) {
    var s = load();
    s.types[typeId] = !!on;
    save(s);
    track(on ? 'notification_enabled' : 'notification_disabled', { type: typeId, source: 'type' });
    return s;
  }
  function setContact(patch) {
    var s = load(); s.contact = Object.assign({}, s.contact, patch || {}); save(s); return s;
  }
  function setQuietHours(patch) {
    var s = load(); s.quietHours = Object.assign({}, s.quietHours, patch || {}); save(s); return s;
  }
  function reset() {
    try { if (global.localStorage) { global.localStorage.removeItem(KEY); } } catch (e) {}
    return defaults();
  }

  global.PimcNotify = Object.assign(global.PimcNotify || {}, {
    KEY: KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    TYPES: TYPES,
    CHANNELS: CHANNELS,
    getState: getState,
    setEnabled: setEnabled,
    setChannel: setChannel,
    setType: setType,
    setContact: setContact,
    setQuietHours: setQuietHours,
    reset: reset
  });
})(typeof window !== 'undefined' ? window : this);

/* ===========================================================================
   Provider abstraction + engine (separate IIFE, shares the same global namespace)
   =========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'pimc-notifications-v1';

  /* re-read helpers so this block is self-contained if loaded independently */
  function loadState() {
    try { var r = global.localStorage ? global.localStorage.getItem(KEY) : null; return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }
  function track(name, params) {
    try {
      var p = (params && typeof params === 'object') ? params : {};
      var safe = {}, allow = ['channel', 'type', 'enabled', 'count', 'reason', 'source', 'category'], i;
      for (i = 0; i < allow.length; i++) { if (p[allow[i]] !== undefined) { safe[allow[i]] = p[allow[i]]; } }
      if (typeof global.pimcTrack === 'function') { global.pimcTrack(name, safe); }
      else if (typeof global.gtag === 'function') { global.gtag('event', name, safe); }
    } catch (e) {}
  }

  /* -------------------------------------------------------------------------
     ChannelProvider — the common interface EVERY provider must implement.
     Swapping Resend->SendGrid or Twilio->Telnyx means registering a different
     object that satisfies this shape. The engine never references a vendor.
     ------------------------------------------------------------------------- */
  function ChannelProvider(config) {
    config = config || {};
    this.name = config.name || 'abstract';
    this.channel = config.channel || 'email';   /* email | sms | browser | push */
    /* send(message) -> Promise<{ ok, id }>. Default is a no-op stub so the app
       runs with zero providers configured (static site has no transport yet). */
    this._send = typeof config.send === 'function' ? config.send : null;
    this._supports = typeof config.supports === 'function' ? config.supports : function () { return true; };
  }
  ChannelProvider.prototype.supports = function (message) { return this._supports(message); };
  ChannelProvider.prototype.send = function (message) {
    if (this._send) { return Promise.resolve(this._send(message)); }
    /* No transport configured: resolve as a queued no-op. Future server/edge
       function performs the real delivery. We never block or throw. */
    return Promise.resolve({ ok: true, queued: true, provider: this.name, id: null });
  };

  /* -------------------------------------------------------------------------
     Provider registry — one active provider per channel, swappable at runtime.
     ------------------------------------------------------------------------- */
  var registry = { email: null, sms: null, browser: null, push: null };

  function registerProvider(provider) {
    if (!provider || !provider.channel) { return false; }
    registry[provider.channel] = provider;
    return true;
  }
  function getProvider(channel) { return registry[channel] || null; }

  /* A built-in browser provider IS available client-side today (no vendor needed).
     Email/SMS/Push intentionally have NO default provider on the static site \u2014
     they are wired server-side later. This proves the no-hardcoded-provider rule. */
  registerProvider(new ChannelProvider({
    name: 'web-notifications',
    channel: 'browser',
    supports: function () {
      return typeof global.Notification !== 'undefined';
    },
    send: function (message) {
      try {
        if (typeof global.Notification === 'undefined') { return { ok: false, reason: 'unsupported' }; }
        if (global.Notification.permission === 'granted') {
          var n = new global.Notification(message.title || 'PetsInMyCity', {
            body: message.body || '', icon: '/assets/logo.png', tag: message.type || 'pimc'
          });
          n.onclick = function () { track('notification_clicked', { channel: 'browser', type: message.type }); };
          return { ok: true, queued: false, provider: 'web-notifications' };
        }
        return { ok: false, reason: 'permission' };
      } catch (e) { return { ok: false, reason: 'error' }; }
    }
  }));

  /* -------------------------------------------------------------------------
     Message factory \u2014 guarantees a Lucy-voiced, non-fear-based message.
     Copy lives here so every channel shares ONE source of truth for tone.
     ------------------------------------------------------------------------- */
  var COPY = {
    medication:  { title: 'A gentle medication reminder \u{1F48A}', body: 'Just a friendly nudge from Lucy \u2014 it may be time for {pet}\u2019s medication. You\u2019ve got this.' },
    birthday:    { title: 'Someone has a big day \u{1F382}', body: 'Lucy here! {pet}\u2019s special day is coming up. A little extra love (and maybe a treat) goes a long way.' },
    grooming:    { title: 'Grooming time soon \u2702\uFE0F', body: '{pet} may be due for a little grooming. A quick brush or trim keeps them comfy and happy.' },
    vaccination: { title: 'A wellness reminder \u{1F489}', body: 'Lucy here \u2014 {pet} may have a wellness vaccine coming up. Your vet is the best guide on timing.' },
    wellness:    { title: 'How\u2019s {pet} doing? \u{1FA7A}', body: 'Just checking in. Take a moment to notice how {pet} is feeling today \u2014 you know them best.' },
    seasonal:    { title: 'A seasonal heads-up \u{1F341}', body: 'Lucy here with a little seasonal tip to help keep {pet} comfortable and safe. No alarm \u2014 just good-to-knows.' },
    weather:     { title: 'Weather worth noting \u26C5', body: 'Today\u2019s weather may affect {pet}\u2019s comfort. A few small tweaks can make their day easier.' },
    recall:      { title: 'Worth a quick look \u{1F4E6}', body: 'Lucy here \u2014 a product {pet} may use has a recall notice. Here\u2019s what to know so you can decide.' },
    emergency:   { title: 'An important safety note \u{1F6A8}', body: 'Lucy here with something time-sensitive for {pet}\u2019s safety. If you\u2019re ever unsure, please contact your vet.' },
    educational: { title: 'A little tip from Lucy \u{1F4A1}', body: 'Here\u2019s a small, trustworthy tip to help you care for {pet} with confidence. Learn at your own pace.' }
  };

  function buildMessage(type, ctx) {
    ctx = ctx || {};
    var base = COPY[type] || { title: 'A note from Lucy \u{1F43E}', body: 'Lucy has something helpful for you.' };
    var pet = ctx.petName || 'your pet';
    return {
      type: type,
      title: base.title.replace('{pet}', pet),
      body: base.body.replace('{pet}', pet),
      createdAt: Date.now()
    };
  }

  /* -------------------------------------------------------------------------
     Scheduler \u2014 ONE place that decides whether + how a notification goes out.
     Channels share this logic (preference gating, quiet hours, critical bypass).
     On the static site it routes to the browser provider or queues a no-op;
     server/edge transport plugs in later with zero call-site changes.
     ------------------------------------------------------------------------- */
  function shouldSend(state, type) {
    if (!state || !state.enabled) { return false; }
    if (state.types && state.types[type] === false) { return false; }
    return true;
  }

  function inQuietHours(state, date) {
    try {
      if (!state.quietHours || !state.quietHours.enabled) { return false; }
      var d = date || new Date();
      var cur = d.getHours() * 60 + d.getMinutes();
      function toMin(s) { var p = String(s).split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
      var start = toMin(state.quietHours.start), end = toMin(state.quietHours.end);
      if (start === end) { return false; }
      if (start < end) { return cur >= start && cur < end; }
      return cur >= start || cur < end; /* overnight window */
    } catch (e) { return false; }
  }

  function activeChannels(state, type) {
    var typeObj = null, i;
    for (i = 0; i < (global.PimcNotify ? global.PimcNotify.TYPES.length : 0); i++) {
      if (global.PimcNotify.TYPES[i].id === type) { typeObj = global.PimcNotify.TYPES[i]; }
    }
    var critical = !!(typeObj && typeObj.critical);
    var out = [];
    var ch = state.channels || {};
    ['email', 'sms', 'browser', 'push'].forEach(function (c) {
      if (ch[c]) { out.push(c); }
    });
    /* Critical (emergency) alerts may use any enabled channel even in quiet hours. */
    return { channels: out, critical: critical };
  }

  /* dispatch(type, ctx) -> Promise<results>. The unified entry point. */
  function dispatch(type, ctx) {
    var state = loadState();
    if (!shouldSend(state, type)) {
      return Promise.resolve({ sent: false, reason: 'disabled' });
    }
    var info = activeChannels(state, type);
    if (!info.critical && inQuietHours(state)) {
      return Promise.resolve({ sent: false, reason: 'quiet-hours' });
    }
    var message = buildMessage(type, ctx);
    var jobs = info.channels.map(function (channel) {
      var provider = getProvider(channel);
      var msg = Object.assign({}, message, { channel: channel, to: (ctx && ctx.to) || null });
      if (!provider) {
        /* No provider for this channel yet (e.g. email transport not wired).
           Queue it conceptually; a future server flushes the queue. */
        return Promise.resolve({ channel: channel, ok: true, queued: true });
      }
      if (!provider.supports(msg)) { return Promise.resolve({ channel: channel, ok: false, reason: 'unsupported' }); }
      return provider.send(msg).then(function (res) {
        track('notification_sent', { channel: channel, type: type });
        return Object.assign({ channel: channel }, res);
      });
    });
    return Promise.all(jobs).then(function (results) {
      return { sent: true, type: type, results: results };
    });
  }

  /* -------------------------------------------------------------------------
     Browser permission helper (opt-in only; never auto-requested).
     ------------------------------------------------------------------------- */
  function requestBrowserPermission() {
    try {
      if (typeof global.Notification === 'undefined') { return Promise.resolve('unsupported'); }
      if (global.Notification.permission === 'granted') { return Promise.resolve('granted'); }
      return global.Notification.requestPermission().then(function (p) { return p; });
    } catch (e) { return Promise.resolve('error'); }
  }

  /* -------------------------------------------------------------------------
     Public engine surface
     ------------------------------------------------------------------------- */
  var existing = global.PimcNotify || {};
  global.PimcNotify = Object.assign(existing, {
    KEY: KEY,
    ChannelProvider: ChannelProvider,
    registerProvider: registerProvider,
    getProvider: getProvider,
    buildMessage: buildMessage,
    dispatch: dispatch,
    requestBrowserPermission: requestBrowserPermission,
    inQuietHours: inQuietHours,
    track: track
  });
})(typeof window !== 'undefined' ? window : this);
