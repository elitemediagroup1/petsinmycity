/* PetsInMyCity — My Pets + Lucy Care Journey(TM)
   MVP: localStorage only. No login, accounts, database, backend, cloud sync.
   Storage key: pimc-my-pets-v1 (versioned, multi-pet-ready).
   Privacy: all data stays in this browser; never uploaded; no PII sent to GA4. */
(function () {
  'use strict';

  var KEY = 'pimc-my-pets-v1';
  var SCHEMA_VERSION = 1;

  /* ---------- Analytics: non-identifying events only ---------- */
  function track(name, params) {
    try {
      var p = params && typeof params === 'object' ? params : {};
      if (typeof window.gtag === 'function') { window.gtag('event', name, p); }
      else if (typeof window.pimcTrack === 'function') { window.pimcTrack(name, p); }
    } catch (e) { /* never block UX on analytics */ }
  }

  /* ---------- Storage helpers ---------- */
  function emptyStore() { return { schemaVersion: SCHEMA_VERSION, pets: [], score: {} }; }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) { return emptyStore(); }
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || !Array.isArray(data.pets)) { return emptyStore(); }
      if (typeof data.score !== 'object' || data.score === null) { data.score = {}; }
      data.schemaVersion = data.schemaVersion || SCHEMA_VERSION;
      return data;
    } catch (e) { return emptyStore(); }
  }
  function save(store) {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
  }
  function genId() { return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }

  var store = load();
  var current = store.pets.length ? store.pets[0] : null;

  /* ---------- Onboarding steps (conversational) ---------- */
  var SPECIES = ['Dog','Cat','Rabbit','Bird','Fish','Reptile','Other'];
  var steps = [
    { key:'name',    type:'text',   label:"Your pet's name",  q:function(){ return "Hi, I'm Lucy. I'd love to meet your pet. What's their name?"; }, optional:false, hint:'' },
    { key:'species', type:'select', label:'Species', options:SPECIES, q:function(n){ return 'Lovely to meet ' + (n||'your pet') + '! Is ' + (n||'your pet') + ' a dog, cat, rabbit, bird, fish, reptile, or other?'; }, optional:false, hint:'' },
    { key:'breed',   type:'text',   label:'Breed', q:function(n){ return 'What breed is ' + nm(n) + '? You can skip if you are not sure.'; }, optional:true, hint:'Optional' },
    { key:'birthday',type:'date',   label:'Birthday', q:function(n){ return 'When is ' + nm(n) + "'s birthday? You can skip and add an age instead."; }, optional:true, hint:'Optional — helps with reminders later' },
    { key:'ageText', type:'text',   label:'Age', q:function(n){ return 'About how old is ' + nm(n) + '? (You can skip if you added a birthday.)'; }, optional:true, hint:'Optional' },
    { key:'weight',  type:'text',   label:'Weight', q:function(n){ return 'About how much does ' + nm(n) + ' weigh?'; }, optional:true, hint:'Optional' },
    { key:'favoriteFood', type:'text', label:'Favorite food', q:function(n){ return "What is " + nm(n) + "'s favorite food?"; }, optional:true, hint:'Optional' },
    { key:'veterinarian', type:'text', label:'Veterinarian', q:function(n){ return 'Who is ' + nm(n) + "'s veterinarian?"; }, optional:true, hint:'Optional' },
    { key:'emergencyContact', type:'text', label:'Emergency contact', q:function(n){ return 'Is there an emergency contact you would want on hand for ' + nm(n) + '?'; }, optional:true, hint:'Optional' },
    { key:'photoLocal', type:'photo', label:'Photo', q:function(n){ return 'Want to add a photo of ' + nm(n) + ', or skip for now? Photos stay only in this browser.'; }, optional:true, hint:'Optional — stored only on this device' }
  ];
  function nm(n){ return n || 'your pet'; }

  var draft = {};
  var stepIndex = 0;
  var editing = false;

  /* ---------- DOM refs ---------- */
  function $(id){ return document.getElementById(id); }
  var elOnboarding = $('mp-onboarding');
  var elHome = $('mp-home');
  var elQuestion = $('mp-question');
  var elLabel = $('mp-step-label');
  var elInput = $('mp-step-input');
  var elSelect = $('mp-step-select');
  var elHint = $('mp-step-hint');
  var elForm = $('mp-step-form');
  var elNext = $('mp-next');
  var elSkip = $('mp-skip');
  var elBack = $('mp-back');
  var elProgress = $('mp-progress-bar');

  /* ---------- Onboarding flow ---------- */
  function renderStep() {
    var step = steps[stepIndex];
    var name = draft.name || '';
    elQuestion.textContent = step.q(name);
    elLabel.textContent = step.label;
    elHint.textContent = step.hint || '';
    elProgress.style.width = Math.round((stepIndex / steps.length) * 100) + '%';
    // reset controls
    elInput.classList.add('mp-hidden');
    elSelect.classList.add('mp-hidden');
    elInput.value = '';
    if (step.type === 'select') {
      elSelect.classList.remove('mp-hidden');
      elSelect.innerHTML = '';
      var ph = document.createElement('option'); ph.value=''; ph.textContent='Choose…'; elSelect.appendChild(ph);
      step.options.forEach(function(o){ var op=document.createElement('option'); op.value=o; op.textContent=o; elSelect.appendChild(op); });
      elSelect.value = draft[step.key] || '';
      elSelect.setAttribute('aria-labelledby','mp-step-label');
    } else if (step.type === 'photo') {
      elInput.classList.remove('mp-hidden');
      elInput.type = 'file';
      elInput.accept = 'image/*';
    } else {
      elInput.classList.remove('mp-hidden');
      elInput.type = (step.type === 'date') ? 'date' : 'text';
      elInput.value = (step.type !== 'date' && draft[step.key]) ? draft[step.key] : '';
      if (step.type === 'date' && draft[step.key]) { elInput.value = draft[step.key]; }
    }
    elInput.setAttribute('aria-labelledby','mp-step-label');
    // skip / back visibility
    elSkip.classList.toggle('mp-hidden', !step.optional);
    elBack.classList.toggle('mp-hidden', stepIndex === 0);
    elNext.textContent = (stepIndex === steps.length - 1) ? 'Finish' : 'Continue';
    setTimeout(function(){ try{ (step.type==='select'?elSelect:elInput).focus(); }catch(e){} }, 30);
  }

  function readPhoto(file, cb){
    if(!file){ cb(null); return; }
    try {
      var reader = new FileReader();
      reader.onload = function(){
        // keep small: store as data URL only (local only, never uploaded)
        var img = new Image();
        img.onload = function(){
          var max = 320;
          var w = img.width, h = img.height;
          if (w > h && w > max){ h = Math.round(h * max / w); w = max; }
          else if (h >= w && h > max){ w = Math.round(w * max / h); h = max; }
          var c = document.createElement('canvas'); c.width=w; c.height=h;
          c.getContext('2d').drawImage(img,0,0,w,h);
          try { cb(c.toDataURL('image/jpeg', 0.8)); } catch(e){ cb(null); }
        };
        img.onerror = function(){ cb(null); };
        img.src = reader.result;
      };
      reader.onerror = function(){ cb(null); };
      reader.readAsDataURL(file);
    } catch(e){ cb(null); }
  }

  function advance(value){
    var step = steps[stepIndex];
    function next(){
      stepIndex++;
      if (stepIndex >= steps.length) { finishOnboarding(); }
      else { renderStep(); }
    }
    if (step.type === 'photo') {
      var f = elInput.files && elInput.files[0];
      if (f) { readPhoto(f, function(dataUrl){ draft.photoLocal = dataUrl; next(); }); return; }
      next(); return;
    }
    if (typeof value === 'string') { value = value.trim(); }
    if (!value && !step.optional) { elInput.focus(); return; } // name & species required
    if (value) { draft[step.key] = value; }
    next();
  }

  function finishOnboarding(){
    var isNew = !editing;
    var pet = editing && current ? current : { id: genId(), createdAt: new Date().toISOString() };
    ['name','species','breed','birthday','ageText','weight','favoriteFood','veterinarian','emergencyContact','photoLocal'].forEach(function(k){
      if (draft[k] !== undefined) { pet[k] = draft[k]; }
    });
    pet.medications = pet.medications || '';
    pet.allergies = pet.allergies || '';
    pet.notes = pet.notes || '';
    pet.updatedAt = new Date().toISOString();
    if (isNew) { store.pets = [pet]; }
    else { store.pets[0] = pet; }
    current = pet;
    editing = false;
    save(store);
    track('my_pets_profile_created', {});
    showHome();
  }

  /* ---------- Lucy Care Journey(TM) ----------
     Lifestyle, preparedness, and organization snapshot. NOT medical. No diagnosis.
     7 categories, each worth up to ~14-15 pts, total 100. This is Journey Progress, not a grade. */
  function nonEmpty(v){ return v !== undefined && v !== null && String(v).trim() !== ''; }
  function plannerDone(){ try { return !!localStorage.getItem('pimc-pet-emergency-planner'); } catch(e){ return false; } }

  function computeScore(pet){
    if(!pet) return { total:0, categories:{} };
    var c = {};
    // 1. Profile completeness (15) — core identity fields
    var core = ['name','species','breed','weight','favoriteFood']; var coreFilled = 0;
    core.forEach(function(k){ if(nonEmpty(pet[k])) coreFilled++; });
    var ageOk = nonEmpty(pet.birthday) || nonEmpty(pet.ageText);
    c.profile = Math.round((coreFilled + (ageOk?1:0)) / (core.length+1) * 15);
    // 2. Emergency preparedness (15) — emergency contact + planner
    c.emergency = (nonEmpty(pet.emergencyContact) ? 7 : 0) + (plannerDone() ? 8 : 0);
    // 3. Preventive care readiness (14) — vet on file + birthday known
    c.preventive = (nonEmpty(pet.veterinarian) ? 8 : 0) + (nonEmpty(pet.birthday) ? 6 : 0);
    // 4. Nutrition routine (14) — food recorded
    c.nutrition = nonEmpty(pet.favoriteFood) ? 14 : 0;
    // 5. Exercise / enrichment (14) — noted in notes (keyword) 
    var notes = (pet.notes||'').toLowerCase();
    c.exercise = /walk|play|exercise|enrich|run|fetch|active/.test(notes) ? 14 : 0;
    // 6. Grooming routine (14) — noted in notes (keyword)
    c.grooming = /groom|brush|bath|nail|coat|trim/.test(notes) ? 14 : 0;
    // 7. Local care setup (14) — local vet/emergency shortcut used
    c.local = localCareDone() ? 14 : 0;
    var total = 0; Object.keys(c).forEach(function(k){ total += c[k]; });
    return { total: Math.min(100, total), categories: c };
  }

  function localCareDone(){ try { return localStorage.getItem('pimc-my-pets-local')==='1'; } catch(e){ return false; } }
  function markLocalCare(){ try { localStorage.setItem('pimc-my-pets-local','1'); } catch(e){} }

  var CAT_META = {
    profile:    { label:'Profile completeness', max:15, why:'The basics about your pet so everything else can be tailored.' },
    emergency:  { label:'Emergency preparedness', max:15, why:'An emergency contact and a completed plan help you act fast.' },
    preventive: { label:'Preventive care readiness', max:14, why:'A known vet and birthday help you stay ahead of routine care.' },
    nutrition:  { label:'Nutrition routine', max:14, why:'Recording food helps keep feeding consistent.' },
    exercise:   { label:'Exercise & enrichment', max:14, why:'A note about activity captures your pet\u2019s routine.' },
    grooming:   { label:'Grooming routine', max:14, why:'A note about grooming captures your care routine.' },
    local:      { label:'Local care setup', max:14, why:'Finding a nearby vet means help is close when you need it.' }
  };

  function scoreMessage(total){
    if (total >= 100) return 'You’ve built a wonderful Care Journey — every step is complete.';
    if (total >= 80) return 'You’re doing great — just a few gentle steps to go.';
    if (total >= 50) return 'You’re making great progress. Let’s keep going together.';
    if (total >= 25) return 'You’re off to a wonderful start. Every small step helps.';
    return 'Welcome! Let’s begin your pet’s Care Journey together.';
  }

  /* ---------- Milestones (next steps in the Care Journey) ---------- */
  function buildMissions(pet, score){
    var m = [];
    if (!nonEmpty(pet.emergencyContact)) m.push({ pts:5, txt:'Add an emergency contact', field:'emergencyContact' });
    if (!nonEmpty(pet.veterinarian)) m.push({ pts:8, txt:'Add your veterinarian', field:'veterinarian' });
    if (!plannerDone()) m.push({ pts:6, txt:'Complete the Emergency Planner', link:'/pet-emergency-planner/' });
    if (!nonEmpty(pet.birthday)) m.push({ pts:7, txt:'Add a birthday', field:'birthday' });
    if (!nonEmpty(pet.favoriteFood)) m.push({ pts:6, txt:'Add a favorite food', field:'favoriteFood' });
    if (!localCareDone()) m.push({ pts:7, txt:'Find a nearby vet', link:'/find-a-vet/', local:true });
    if (score.categories.exercise === 0) m.push({ pts:4, txt:'Note an exercise routine in Notes', focusNotes:true });
    if (score.categories.grooming === 0) m.push({ pts:4, txt:'Note a grooming routine in Notes', focusNotes:true });
    return m;
  }

  /* ---------- Badges ---------- */
  function buildBadges(pet, score){
    var c = score.categories;
    return [
      { id:'prepared', ico:'\uD83C\uDFC5', label:'Prepared Parent', earned: score.total >= 80 },
      { id:'emergency', ico:'\uD83D\uDEA8', label:'Emergency Ready', earned: nonEmpty(pet.emergencyContact) && plannerDone() },
      { id:'preventive', ico:'\uD83E\uDE7A', label:'Preventive Care', earned: nonEmpty(pet.veterinarian) && nonEmpty(pet.birthday) },
      { id:'birthday', ico:'\uD83C\uDF82', label:'Birthday Ready', earned: nonEmpty(pet.birthday) },
      { id:'exercise', ico:'\uD83C\uDFC3', label:'Exercise Champion', earned: c.exercise > 0 },
      { id:'travel', ico:'\u2708\uFE0F', label:'Travel Ready', earned: /travel|trip|car|flight|vacation/.test((pet.notes||'').toLowerCase()) },
      { id:'nutrition', ico:'\uD83E\uDD63', label:'Nutrition Planner', earned: nonEmpty(pet.favoriteFood) },
      { id:'local', ico:'\uD83D\uDCCD', label:'Local Care Ready', earned: localCareDone() }
    ];
  }

  /* ---------- Rendering: home ---------- */
  function esc(s){ var d=document.createElement('div'); d.textContent = (s==null?'':String(s)); return d.innerHTML; }
  function ageFromBirthday(bd){
    if(!bd) return '';
    var d = new Date(bd); if(isNaN(d.getTime())) return '';
    var now = new Date(); var yrs = now.getFullYear()-d.getFullYear();
    var m = now.getMonth()-d.getMonth(); if(m<0||(m===0&&now.getDate()<d.getDate())) yrs--;
    if(yrs < 0) return '';
    if(yrs === 0) return 'Under 1 year';
    return yrs + (yrs===1?' year old':' years old');
  }

  function renderHome(){
    var pet = current; if(!pet) return;
    // summary
    $('mp-pet-name').textContent = pet.name || 'Your pet';
    var metaBits = [pet.species, pet.breed].filter(nonEmpty);
    $('mp-pet-meta').textContent = metaBits.join(' • ') || 'Pet profile';
    var photo = $('mp-pet-photo');
    if (pet.photoLocal) { photo.innerHTML = '<img alt="" src="' + pet.photoLocal + '">'; }
    else { photo.textContent = speciesEmoji(pet.species); }
    // detail grid
    var age = ageFromBirthday(pet.birthday) || pet.ageText || '';
    var rows = [
      ['Species', pet.species], ['Breed', pet.breed], ['Age', age], ['Weight', pet.weight],
      ['Favorite food', pet.favoriteFood], ['Veterinarian', pet.veterinarian],
      ['Emergency contact', pet.emergencyContact], ['Birthday', pet.birthday]
    ];
    var grid = $('mp-detail-grid'); grid.innerHTML = '';
    rows.forEach(function(r){ if(nonEmpty(r[1])){ var d=document.createElement('div'); d.innerHTML='<span>'+esc(r[0])+'</span>'+esc(r[1]); grid.appendChild(d); } });
    // score
    var score = computeScore(pet);
    store.score[pet.id] = { total:score.total, categories:score.categories, computedAt:new Date().toISOString() };
    save(store);
    $('mp-score-num').textContent = score.total;
    $('mp-score-msg').textContent = scoreMessage(score.total);
    var jb = $('mp-journey-bar'); if (jb) { jb.style.width = Math.max(0, Math.min(100, score.total)) + '%'; }
    var jp = $('mp-journey-pct'); if (jp) { jp.textContent = score.total + '%'; }
    var jt = $('mp-journey-track'); if (jt) { jt.setAttribute('aria-valuenow', score.total); }
    var cats = $('mp-cats'); cats.innerHTML = '';
    Object.keys(CAT_META).forEach(function(k){
      var meta = CAT_META[k]; var val = score.categories[k]||0; var pct = Math.round(val/meta.max*100);
      var li = document.createElement('li'); li.className='mp-cat';
      li.innerHTML = '<div class="mp-cat-head"><span>'+esc(meta.label)+'</span><span>'+val+'/'+meta.max+'</span></div>'+
        '<div class="mp-bar" role="img" aria-label="'+esc(meta.label)+': '+val+' of '+meta.max+'"><span style="width:'+pct+'%"></span></div>'+
        '<p class="mp-cat-why">'+esc(meta.why)+'</p>';
      cats.appendChild(li);
    });
    // missions
    var missions = buildMissions(pet, score); var ml = $('mp-missions'); ml.innerHTML = '';
    if(!missions.length){ var done=document.createElement('li'); done.className='mp-cat-why'; done.textContent='You’ve completed every milestone Lucy suggested — beautifully done!'; ml.appendChild(done); }
    missions.forEach(function(ms){
      var li=document.createElement('li');
      var btn=document.createElement('button'); btn.type='button'; btn.className='mp-mission';
      btn.innerHTML='<span class="pts">+'+ms.pts+'</span><span class="txt">'+esc(ms.txt)+'</span>';
      btn.addEventListener('click', function(){ onMission(ms); });
      li.appendChild(btn); ml.appendChild(li);
    });
    // badges
    var badges = buildBadges(pet, score); store.score[pet.id].badges = badges.filter(function(b){return b.earned;}).map(function(b){return b.id;}); save(store);
    var bl=$('mp-badges'); bl.innerHTML='';
    badges.forEach(function(b){
      var li=document.createElement('li'); li.className='mp-badge'+(b.earned?' earned':'');
      li.innerHTML='<span class="b-ico" aria-hidden="true">'+b.ico+'</span>'+esc(b.label)+(b.earned?' <span class="mp-sr">(earned)</span>':' <span class="mp-sr">(not yet earned)</span>');
      bl.appendChild(li);
    });
    // notes
    $('mp-notes').value = pet.notes || '';
  }

  function speciesEmoji(sp){ var s=(sp||'').toLowerCase(); if(s==='dog')return '\uD83D\uDC36'; if(s==='cat')return '\uD83D\uDC31'; if(s==='rabbit')return '\uD83D\uDC30'; if(s==='bird')return '\uD83D\uDC26'; if(s==='fish')return '\uD83D\uDC1F'; if(s==='reptile')return '\uD83E\uDD8E'; return '\uD83D\uDC3E'; }

  /* ---------- Interactions ---------- */
  function onMission(ms){
    track('lucy_care_score_improvement_click', {});
    if (ms.link){ if(ms.local){ markLocalCare(); } window.location.href = ms.link; return; }
    if (ms.focusNotes){ var n=$('mp-notes'); n.focus(); n.scrollIntoView({behavior:'smooth',block:'center'}); return; }
    if (ms.field){ startEdit(ms.field); return; }
  }

  function startEdit(focusField){
    editing = true;
    draft = {};
    ['name','species','breed','birthday','ageText','weight','favoriteFood','veterinarian','emergencyContact','photoLocal'].forEach(function(k){ if(current && current[k]!==undefined) draft[k]=current[k]; });
    stepIndex = 0;
    if (focusField){ for(var i=0;i<steps.length;i++){ if(steps[i].key===focusField){ stepIndex=i; break; } } }
    showOnboarding();
    renderStep();
    track('my_pets_edit', {});
  }

  function clearData(){
    if(!window.confirm('Delete your pet profile from this browser? This cannot be undone.')) return;
    try { localStorage.removeItem(KEY); localStorage.removeItem('pimc-my-pets-local'); } catch(e){}
    store = emptyStore(); current=null; draft={}; stepIndex=0; editing=false;
    track('my_pets_clear_data', {});
    showOnboarding(); renderStep();
  }

  function showOnboarding(){ elHome.classList.add('mp-hidden'); elOnboarding.classList.remove('mp-hidden'); }
  function showHome(){ elOnboarding.classList.add('mp-hidden'); elHome.classList.remove('mp-hidden'); renderHome(); track('my_pets_view', {}); track('lucy_care_score_view', {}); }

  /* ---------- Wire up ---------- */
  function init(){
    track('my_pets_start', {});
    if (elForm){
      elForm.addEventListener('submit', function(e){ e.preventDefault(); var step=steps[stepIndex]; var v = (step.type==='select')? elSelect.value : elInput.value; advance(v); });
    }
    if (elSkip){ elSkip.addEventListener('click', function(){ advance(''); }); }
    if (elBack){ elBack.addEventListener('click', function(){ if(stepIndex>0){ stepIndex--; renderStep(); } }); }
    var notes=$('mp-notes'); if(notes){ var t; notes.addEventListener('input', function(){ clearTimeout(t); t=setTimeout(function(){ if(current){ current.notes=notes.value; current.updatedAt=new Date().toISOString(); save(store); renderHome(); } }, 600); }); }
    var edit=$('mp-edit'); if(edit){ edit.addEventListener('click', function(){ startEdit(null); }); }
    var clr=$('mp-clear'); if(clr){ clr.addEventListener('click', clearData); }
    var sp=$('mp-sc-planner'); if(sp){ sp.addEventListener('click', function(){ track('emergency_planner_shortcut_click', {}); }); }
    var sv=$('mp-sc-vet'); if(sv){ sv.addEventListener('click', function(){ markLocalCare(); track('local_vet_shortcut_click', {}); }); }
    var se=$('mp-sc-emerg'); if(se){ se.addEventListener('click', function(){ markLocalCare(); track('local_emergency_vet_shortcut_click', {}); }); }
    // initial state
    if (current && nonEmpty(current.name)) { showHome(); }
    else { showOnboarding(); renderStep(); }
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
