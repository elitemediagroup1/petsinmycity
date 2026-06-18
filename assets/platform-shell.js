/* =========================================================================
   PetsInMyCity — Platform Shell v1 (platform-shell.js)
   Dependency-free application shell + lightweight client state.
   - Mounts a top app bar + persistent platform navigation (5 anchors)
     and a persistent Emergency affordance on any page that opts in via
     <body data-pimc-shell> (and optional data-pimc-active="home|lucy|mypets|discover|me").
   - Exposes window.PIMC: a small read-mostly state layer over existing
     localStorage (no schema changes, no backend). Cloud-sync ready shape.
   - Never alters the marketing homepage; never changes existing schemas.
   ========================================================================= */
(function () {
  'use strict';

  /* ---------------- Constants ---------------- */
  var MY_PETS_KEY = 'pimc-my-pets-v1';          // existing My Pets store (unchanged)
  var NOTIF_PREF_KEY = 'pimc-notification-prefs-v1'; // existing prefs (if present)

  var NAV = [
    { id:'home',     label:'Home',     ico:'\uD83C\uDFE0', href:'/today/' },
    { id:'lucy',     label:'Lucy',     ico:'\uD83D\uDC3E', href:'/lucy/' },
    { id:'mypets',   label:'My Pets',  ico:'\u2764\uFE0F', href:'/my-pets/' },
    { id:'discover', label:'Discover', ico:'\uD83D\uDCCD', href:'/find-a-vet/' },
    { id:'me',       label:'Me',       ico:'\uD83D\uDC64', href:'/notifications/' }
  ];
  var EMERGENCY_HREF = '/pet-emergency-planner/';

  /* ---------------- Safe helpers ---------------- */
  function track(name, params){
    try{
      var p = params && typeof params==='object' ? params : {};
      if (typeof window.pimcTrack==='function'){ window.pimcTrack(name, p); }
      else if (typeof window.gtag==='function'){ window.gtag('event', name, p); }
    }catch(e){/* analytics must never block UX */}
  }
  function readJSON(key){
    try{ var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch(e){ return null; }
  }
  function el(tag, attrs, html){
    var n = document.createElement(tag);
    if (attrs){ for (var k in attrs){ if (attrs[k]!=null) n.setAttribute(k, attrs[k]); } }
    if (html!=null) n.innerHTML = html;
    return n;
  }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  /* =====================================================================
     window.PIMC — lightweight client-side platform state
     Read-mostly facade over existing localStorage. No schema changes.
     Shape is sync-ready: { source:'local', schemaVersion, data } so a
     future cloud layer can swap the loader without touching callers.
     ===================================================================== */
  var subscribers = [];
  function notify(){ for (var i=0;i<subscribers.length;i++){ try{ subscribers[i](PIMC.snapshot()); }catch(e){} } }

  function loadPets(){
    var store = readJSON(MY_PETS_KEY);
    if (!store || !Array.isArray(store.pets)) return { schemaVersion: (store&&store.schemaVersion)||1, pets: [], scores: (store&&store.score)||{} };
    return { schemaVersion: store.schemaVersion||1, pets: store.pets, scores: store.score||{} };
  }

  function nonEmpty(v){ return v!=null && String(v).trim()!==''; }

  /* Derive a Care Journey % for a pet from the stored score, if present.
     Mirrors the My Pets total (0-100). Never recomputes or mutates. */
  function journeyFor(petId, scores){
    var s = scores && scores[petId];
    if (s && typeof s.total==='number') return Math.max(0, Math.min(100, s.total));
    return null;
  }

  var PIMC = {
    /* Returns the active (first) pet, or null. */
    activePet: function(){ var p = loadPets(); return p.pets.length ? p.pets[0] : null; },
    pets: function(){ return loadPets().pets; },
    petCount: function(){ return loadPets().pets.length; },

    /* Care Journey summary for the active pet (or null when no pets). */
    careJourney: function(){
      var p = loadPets(); if (!p.pets.length) return null;
      var pet = p.pets[0];
      var pct = journeyFor(pet.id, p.scores);
      return { petName: pet.name||'your pet', pct: pct };
    },

    /* Upcoming reminders. Reads existing data if available; else []. */
    reminders: function(){
      var prefs = readJSON(NOTIF_PREF_KEY);
      var out = [];
      var pets = loadPets().pets;
      pets.forEach(function(pet){
        if (nonEmpty(pet.birthday)){
          out.push({ id:'bday-'+pet.id, ico:'\uD83C\uDF82', title:(pet.name||'Your pet')+'\u2019s birthday', meta:'On file: '+esc(pet.birthday) });
        }
      });
      return out;
    },

    /* Recent activity, derived from pet updatedAt timestamps. */
    recentActivity: function(){
      var pets = loadPets().pets.slice();
      pets.sort(function(a,b){ return new Date(b.updatedAt||0) - new Date(a.updatedAt||0); });
      return pets.slice(0,4).map(function(pet){
        return { id:'act-'+pet.id, ico:'\uD83D\uDC3E', title:(pet.name||'A pet')+' profile updated', meta: pet.updatedAt ? timeAgo(pet.updatedAt) : 'Saved on this device' };
      });
    },

    /* Full snapshot for subscribers / debugging. */
    snapshot: function(){
      var p = loadPets();
      return { source:'local', schemaVersion:p.schemaVersion, petCount:p.pets.length,
               hasPets:p.pets.length>0, careJourney:this.careJourney() };
    },

    subscribe: function(fn){ if (typeof fn==='function'){ subscribers.push(fn); } return function(){ var i=subscribers.indexOf(fn); if(i>=0) subscribers.splice(i,1); }; },
    refresh: function(){ notify(); }
  };

  function timeAgo(iso){
    try{
      var d = new Date(iso); var diff = (Date.now()-d.getTime())/1000;
      if (diff < 60) return 'Just now';
      if (diff < 3600) return Math.floor(diff/60)+'m ago';
      if (diff < 86400) return Math.floor(diff/3600)+'h ago';
      if (diff < 604800) return Math.floor(diff/86400)+'d ago';
      return d.toLocaleDateString();
    }catch(e){ return ''; }
  }

  /* Keep state fresh across tabs without a backend. */
  try{ window.addEventListener('storage', function(e){ if (e.key===MY_PETS_KEY) notify(); }); }catch(e){}

  window.PIMC = PIMC;

  /* =====================================================================
     Application shell mounter
     ===================================================================== */
  function activeId(){
    var b = document.body.getAttribute('data-pimc-active');
    if (b) return b;
    var path = location.pathname.replace(/\/+$/,'') + '/';
    if (path === '/' || path.indexOf('/today/')===0) return 'home';
    if (path.indexOf('/lucy/')===0) return 'lucy';
    if (path.indexOf('/my-pets/')===0) return 'mypets';
    if (path.indexOf('/notifications/')===0) return 'me';
    if (path.indexOf('/find-a-vet/')===0 || path.indexOf('/grooming/')===0 || path.indexOf('/boarding/')===0) return 'discover';
    return '';
  }

  function buildBar(opts){
    var bar = el('header', { 'class':'pshell-bar', role:'banner' });
    var brand = el('a', { 'class':'pshell-bar__brand', href:'/today/', 'aria-label':'PetsInMyCity home' });
    brand.appendChild(el('img', { src:'/assets/logo.png', alt:'', 'aria-hidden':'true', loading:'eager', decoding:'async' }));
    bar.appendChild(brand);
    if (opts.title){ bar.appendChild(el('h1', { 'class':'pshell-bar__title' }, esc(opts.title))); }
    bar.appendChild(el('div', { 'class':'pshell-bar__spacer' }));
    /* Persistent Emergency affordance — reachable from anywhere. */
    var emg = el('a', { 'class':'pshell-bar__action pshell-bar__action--emergency', href:EMERGENCY_HREF,
      'aria-label':'Emergency: open the Pet Emergency Planner' }, '\uD83D\uDEA8 <span>Emergency</span>');
    emg.addEventListener('click', function(){ track('platform_emergency_click', { from:'app_bar' }); });
    bar.appendChild(emg);
    return bar;
  }

  function buildNav(curr){
    var nav = el('nav', { 'class':'pshell-nav', role:'navigation', 'aria-label':'Platform' });
    NAV.forEach(function(item){
      var a = el('a', { 'class':'pshell-nav__item', href:item.href, 'data-nav':item.id });
      if (item.id===curr){ a.setAttribute('aria-current','page'); }
      a.appendChild(el('span', { 'class':'pshell-nav__ico', 'aria-hidden':'true' }, item.ico));
      a.appendChild(el('span', { 'class':'pshell-nav__label' }, esc(item.label)));
      a.addEventListener('click', function(){ track('platform_nav_click', { to:item.id }); });
      nav.appendChild(a);
    });
    var emg = el('a', { 'class':'pshell-nav__item pshell-nav__emergency', href:EMERGENCY_HREF, 'aria-label':'Emergency' });
    emg.appendChild(el('span', { 'class':'pshell-nav__ico', 'aria-hidden':'true' }, '\uD83D\uDEA8'));
    emg.appendChild(el('span', { 'class':'pshell-nav__label' }, 'Emergency'));
    emg.addEventListener('click', function(){ track('platform_emergency_click', { from:'rail' }); });
    nav.appendChild(emg);
    return nav;
  }

  /* Non-destructive mount: prepend a top bar, append persistent nav, and
     (optionally) move a single declared content host into a shell main.
     Existing site header/footer, Lucy widget, and scripts are left in place. */
  function mount(){
    var body = document.body;
    if (!body || !body.hasAttribute('data-pimc-shell')) return;     // opt-in only
    if (body.getAttribute('data-pimc-shell-mounted')==='1') return; // idempotent
    body.setAttribute('data-pimc-shell-mounted','1');

    var title = body.getAttribute('data-pimc-title') || '';
    var curr = activeId();

    var skip = el('a', { 'class':'pds-skip', href:'#pshell-main' }, 'Skip to main content');
    var bar = buildBar({ title:title });
    var nav = buildNav(curr);

    /* Optional: wrap a declared content host as the labelled main landmark. */
    var hostSel = body.getAttribute('data-pimc-content');
    if (hostSel){
      var host = document.querySelector(hostSel);
      if (host && host.tagName !== 'MAIN'){
        host.classList.add('pshell-main'); host.id = host.id || 'pshell-main';
        host.setAttribute('role','main'); host.setAttribute('tabindex','-1');
      } else if (host){
        host.classList.add('pshell-main'); host.id = host.id || 'pshell-main'; host.setAttribute('tabindex','-1');
      }
    }

    body.insertBefore(nav, null);              // append persistent nav last
    body.insertBefore(bar, body.firstChild);   // top bar first
    body.insertBefore(skip, body.firstChild);  // skip link very first

    track('platform_shell_view', { section: curr || 'unknown' });
  }

  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', mount); }
  else { mount(); }

  window.PIMCShell = { mount: mount, nav: NAV };
})();
