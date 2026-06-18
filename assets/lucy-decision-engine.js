/*!
 * PetsInMyCity \u2014 Lucy Decision Engine v1 (Phase 2.3)
 * Parent orchestration layer for Lucy.
 *
 * PURPOSE
 *   Lucy is not a router. This engine lets her understand a pet parent's
 *   concern, determine urgency, ask only the minimum clarifying questions,
 *   select the right care pathway, explain why, recommend the appropriate
 *   next step, and keep the conversation open. The pet \u2014 never a provider
 *   \u2014 is always the focus.
 *
 * ARCHITECTURE
 *   This is the PARENT layer. The existing Veterinary Care Engine
 *   (window.PIMCVetCare, assets/vet-care-engine.js) is NOT replaced \u2014 it
 *   becomes one module within this engine. Modules are registered in a
 *   provider-agnostic registry so new capabilities (and new providers) can
 *   be added without rewriting Lucy or the rest of the platform.
 *   Dutch is a provider. Dutch is not the engine.
 *
 * MEMORY
 *   Lightweight, in-session only. Nothing is persisted; no account, no
 *   cookies, no storage. Memory lives in this closure for the page session
 *   and is cleared by reset() (called when the chat session ends).
 *
 * SAFETY (see docs/lucy-brain.md)
 *   Emergency and poison detection are delegated to the Veterinary Care
 *   Engine's existing logic \u2014 this layer never weakens or bypasses them.
 *   Educational only: never diagnoses, prescribes, or promises outcomes.
 */
(function (global) {
  'use strict';
  if (global.PIMCLucy) return; // singleton

  /* ============================================================
   * 1. CONVERSATION MEMORY (in-session only, never persisted)
   * ============================================================ */
  var memory = createMemory();

  function createMemory() {
    return {
      preferredName: null, // how the human likes to be addressed
      petName: null,
      species: null,       // dog | cat | other
      ageText: null,       // approximate age as the user phrased it
      symptoms: [],        // concerns mentioned so far
      city: null,
      zip: null,
      lastPathId: null,    // last care pathway Lucy selected
      lastUrgency: null,   // 'emergency' | 'routine' | null
      turns: 0
    };
  }

  // Reset is called when the chat session ends. No persistent data exists,
  // so this simply discards the in-memory object for a clean next session.
  function reset() { memory = createMemory(); }

  function getMemory() {
    // Return a shallow copy so callers can read but not mutate internals.
    return {
      preferredName: memory.preferredName,
      petName: memory.petName,
      species: memory.species,
      ageText: memory.ageText,
      symptoms: memory.symptoms.slice(),
      city: memory.city,
      zip: memory.zip,
      lastPathId: memory.lastPathId,
      lastUrgency: memory.lastUrgency,
      turns: memory.turns
    };
  }

  // A friendly word for the pet, using its name if we know it.
  function petWord() {
    if (memory.petName) return memory.petName;
    if (memory.species === 'dog') return 'your dog';
    if (memory.species === 'cat') return 'your cat';
    return 'your pet';
  }

  /* ============================================================
   * 2. MEMORY EXTRACTION (reads each user message, updates memory)
   * ============================================================ */

  var SYMPTOM_WORDS = ['vomit','throwing up','threw up','diarrhea','loose stool','limping','limp','itchy','itching','scratching','rash','hot spot','lump','bump','swelling','swollen','coughing','cough','sneezing','wheezing','not eating','loss of appetite','lethargic','tired','drinking a lot','weight loss','fleas','ticks','worms','bad breath','ear infection','eye discharge','bleeding','wound','cut','fever','shaking','allergies','anxiety','aggression','accident','straining','constipated'];

  // Light, conservative species detection. Only sets a value on a clear hit.
  function detectSpecies(t) {
    if (/\b(dog|puppy|pup|doggo)\b/.test(t)) return 'dog';
    if (/\b(cat|kitten|kitty)\b/.test(t)) return 'cat';
    return null;
  }

  // Approximate age as phrased, e.g. '3 years old', '6 months', 'a puppy'.
  function detectAge(t) {
    var m = t.match(/\b(\d{1,2})\s*(?:-|\s)?\s*(year|yr|yrs|years|month|months|mo|mos|week|weeks|wk|wks)s?\s*(?:old)?\b/);
    if (m) return m[0].trim();
    if (/\b(puppy|kitten)\b/.test(t)) return 'young (' + (/\bpuppy\b/.test(t) ? 'puppy' : 'kitten') + ')';
    if (/\b(senior|elderly|old)\s+(dog|cat|pet)\b/.test(t)) return 'senior';
    return null;
  }

  // Pet name: 'my dog Bella', 'his name is Max', 'named Luna'. Conservative
  // \u2014 only captures a single capitalized-ish token to avoid false positives.
  function detectPetName(raw) {
    var m = raw.match(/\b(?:[Dd]og|[Cc]at|[Pp]uppy|[Kk]itten|[Pp]up)\s+(?:named|called|Named|Called)\s+([A-Z][a-zA-Z'-]{1,20})/);
    if (!m) m = raw.match(/\b(?:[Nn]ame(?:'s| is)?|[Nn]amed|[Cc]alled)\s+([A-Z][a-zA-Z'-]{1,20})/);
    if (!m) m = raw.match(/\b[Mm]y\s+(?:dog|cat|puppy|kitten|pup|Dog|Cat|Puppy|Kitten|Pup)\s+([A-Z][a-zA-Z'-]{1,20})\b/);
    if (m) {
      var name = m[1];
      // avoid common non-name words that can follow 'my dog'
      if (/^(Is|Has|Was|Got|Keeps|Seems|Will|Wont|Can|Cant|Needs|Ate|Threw|The|A|An|Just|Really|Now|Still)$/i.test(name)) return null;
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return null;
  }

  // Preferred name for the human: 'I'm Sarah', 'call me Sarah', 'this is Sarah'.
  function detectPreferredName(raw) {
    var m = raw.match(/\b(?:[Ii]'?[Mm]|[Ii] [Aa][Mm]|[Cc]all me|[Tt]his is|[Mm]y name is|[Ii]t'?s)\s+([A-Z][a-zA-Z'-]{1,20})\b/);
    if (m) {
      var name = m[1];
      if (/^(Not|So|Just|Here|Good|Fine|Okay|Ok|Sure|Worried|Concerned|Trying|Looking|Wondering|Really|Very|Still)$/i.test(name)) return null;
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return null;
  }

  function detectSymptoms(t) {
    var found = [];
    for (var i = 0; i < SYMPTOM_WORDS.length; i++) {
      if (t.indexOf(SYMPTOM_WORDS[i]) !== -1) found.push(SYMPTOM_WORDS[i]);
    }
    return found;
  }

  // ZIP and city reuse simple, well-tested patterns (kept local so this
  // engine has no hard dependency on Lucy's own helpers).
  function detectZip(t) { var m = t.match(/\b(\d{5})\b/); return m ? m[1] : null; }

  function detectCity(raw) {
    var m = raw.match(/\b(?:in|near|around|from)\s+([A-Z][A-Za-z.\-]+(?:\s+[A-Z][A-Za-z.\-]+){0,2})\b/);
    if (m) {
      var c = m[1].trim();
      if (/^(Me|Here|My|The|Us|You|It|There)$/i.test(c)) return null;
      return c;
    }
    return null;
  }

  // Update memory from one user message. Returns the keys that were newly
  // learned this turn (useful for natural acknowledgements).
  function remember(raw) {
    raw = String(raw || '');
    var t = raw.toLowerCase();
    var learned = [];
    memory.turns++;

    var sp = detectSpecies(t);
    if (sp && !memory.species) { memory.species = sp; learned.push('species'); }

    var age = detectAge(t);
    if (age && !memory.ageText) { memory.ageText = age; learned.push('age'); }

    var pn = detectPetName(raw);
    if (pn && !memory.petName) { memory.petName = pn; learned.push('petName'); }

    var hn = detectPreferredName(raw);
    if (hn && !memory.preferredName) { memory.preferredName = hn; learned.push('preferredName'); }

    var zip = detectZip(t);
    if (zip && memory.zip !== zip) { memory.zip = zip; learned.push('zip'); }

    var city = detectCity(raw);
    if (city && !memory.city) { memory.city = city; learned.push('city'); }

    var syms = detectSymptoms(t);
    for (var i = 0; i < syms.length; i++) {
      if (memory.symptoms.indexOf(syms[i]) === -1) { memory.symptoms.push(syms[i]); learned.push('symptom'); }
    }

    return learned;
  }

  /* ============================================================
   * 3. MODULE REGISTRY (provider-agnostic)
   * ============================================================
   * Each module declares an id, a label, whether it is ready, and a
   * `consider(ctx)` method that returns either null (not its concern) or a
   * proposal { kind, urgency, ... } describing how Lucy should respond.
   * Modules never render UI and never name a provider as 'the engine'.
   */
  var modules = {};

  function registerModule(mod) {
    if (!mod || !mod.id) return;
    modules[mod.id] = mod;
  }

  function getModule(id) { return modules[id] || null; }
  function listModules() { return Object.keys(modules).map(function (k) {
    return { id: modules[k].id, label: modules[k].label, ready: !!modules[k].ready };
  }); }

  // ---- Veterinary Decision module: wraps the EXISTING vet care engine ----
  registerModule({
    id: 'veterinary',
    label: 'Veterinary Decision Engine',
    get ready() { return !!(global.PIMCVetCare && typeof global.PIMCVetCare.recommend === 'function'); },
    consider: function (ctx) {
      var VC = global.PIMCVetCare;
      if (!VC || typeof VC.recommend !== 'function') return null;
      var rec = VC.recommend(ctx.text);
      if (!rec || !rec.path) return null;
      // Emergencies are owned by the Emergency module below; defer to it.
      if (rec.isEmergency) return null;
      return {
        kind: 'care-pathway',
        moduleId: 'veterinary',
        urgency: 'routine',
        rec: rec
      };
    }
  });

  // ---- Emergency Decision module: also delegates to the vet engine's
  // emergency/poison detection so there is ONE source of truth for safety. ----
  registerModule({
    id: 'emergency',
    label: 'Emergency Decision Engine',
    get ready() { return !!(global.PIMCVetCare && typeof global.PIMCVetCare.recommend === 'function'); },
    consider: function (ctx) {
      var VC = global.PIMCVetCare;
      if (!VC || typeof VC.recommend !== 'function') return null;
      var rec = VC.recommend(ctx.text);
      if (!rec || !rec.isEmergency) return null;
      return {
        kind: 'emergency',
        moduleId: 'emergency',
        urgency: 'emergency',
        rec: rec
      };
    }
  });

  // ---- The remaining modules are registered as part of the unified
  // architecture. They expose a stable shape now; Lucy's existing handlers
  // (local search, learning links, products) continue to operate, and these
  // give the orchestrator a single place to grow without redesign. ----
  registerModule({ id: 'local-discovery', label: 'Local Discovery Engine', ready: true, consider: function () { return null; } });
  registerModule({ id: 'learning', label: 'Learning Engine', ready: true, consider: function () { return null; } });
  registerModule({ id: 'product-recommendation', label: 'Product Recommendation Engine', ready: false, consider: function () { return null; } });
  registerModule({ id: 'affiliate-recommendation', label: 'Affiliate Recommendation Engine', ready: true, consider: function () { return null; } });
  registerModule({ id: 'my-pets', label: 'My Pets Engine', ready: true, consider: function () { return null; } });
  registerModule({ id: 'care-journey', label: 'Lucy Care Journey Engine', ready: true, consider: function () { return null; } });
  registerModule({ id: 'notification', label: 'Notification Engine', ready: false, consider: function () { return null; } });

  /* ============================================================
   * 4. ORCHESTRATION (the decision philosophy, in order)
   * ============================================================
   * 1) Understand the concern   2) Determine urgency
   * 3) Ask the minimum clarifying questions   4) Select the pathway
   * 5) Explain why   6) Recommend the resource   7) End with a question
   *
   * orchestrate(text) returns a structured plan that Lucy renders, OR null
   * when no module claims the message (Lucy then falls through to her
   * existing local-search / chat behavior, unchanged).
   */

  var awaitingClarification = false; // in-session, single pending question

  // Does the message already describe a concrete concern, or is it a vague
  // 'I want to talk to a vet' that benefits from ONE clarifying question?
  function concernIsClear(text) {
    var t = String(text || '').toLowerCase();
    if (memory.symptoms.length > 0) return true;
    if (t.split(/\s+/).filter(Boolean).length >= 8) return true;
    return detectSymptoms(t).length > 0;
  }

  function orchestrate(text) {
    var ctx = { text: String(text || ''), memory: getMemory() };

    // Step 2 (safety-first): emergencies short-circuit everything. No
    // clarifying question, never a provider \u2014 owned by the Emergency module.
    var emergencyProposal = modules.emergency.consider(ctx);
    if (emergencyProposal) {
      awaitingClarification = false;
      memory.lastUrgency = 'emergency';
      memory.lastPathId = emergencyProposal.rec.path.id;
      return buildEmergencyPlan(emergencyProposal.rec);
    }

    // Otherwise, see if the Veterinary module recognizes a care concern.
    var vetProposal = modules.veterinary.consider(ctx);
    if (!vetProposal) return null; // not a care conversation \u2014 let Lucy handle it

    // Step 1 + 3: understand, then ask ONE clarifying question only when the
    // concern isn't clear yet and we haven't already asked this session-turn.
    if (!awaitingClarification && !concernIsClear(text)) {
      awaitingClarification = true;
      return buildClarifyPlan();
    }
    awaitingClarification = false;

    // Steps 4\u20137: select pathway, explain, recommend, follow up.
    memory.lastUrgency = 'routine';
    memory.lastPathId = vetProposal.rec.path.id;
    return buildCarePlan(vetProposal.rec);
  }

  /* ============================================================
   * 5. PLAN BUILDERS (produce natural, pet-focused message lines)
   * ============================================================
   * A plan is { kind, urgency, lines:[], analytics:{event,params} }.
   * Lucy joins `lines` with newlines and renders them; she fires the
   * analytics event EXACTLY as before (event name + params unchanged).
   */

  function buildEmergencyPlan(rec) {
    var lines = [];
    lines.push('I want to make sure ' + petWord() + ' stays safe \u2014 this may be an emergency.');
    lines.push('');
    lines.push(rec.reason);
    lines.push('');
    lines.push('Please contact your nearest emergency vet right away. You can [find an emergency vet](/tools/emergency-finder/) near you, and for a suspected poisoning, call an animal poison control hotline as well.');
    return {
      kind: 'emergency',
      urgency: 'emergency',
      lines: lines,
      analytics: { event: 'lucy_care_pathway', params: { path: rec.path.id, emergency: true } }
    };
  }

  function buildClarifyPlan() {
    var lines = [];
    var hi = memory.preferredName ? (', ' + memory.preferredName) : '';
    lines.push("I'd be happy to help" + hi + " \u2014 let's figure out the best option together.");
    lines.push('');
    lines.push('So I can point you in the right direction, can you tell me a little more about what\u2019s going on with ' + petWord() + '?');
    return { kind: 'clarify', urgency: 'routine', lines: lines, analytics: null };
  }

  function buildCarePlan(rec) {
    var p = rec.path;
    var lines = [];

    // Step 1 echo: a brief, warm acknowledgement that shows Lucy was
    // listening \u2014 referencing the pet and concern, not a provider.
    lines.push(acknowledge());
    lines.push('');

    // Step 5: short, balanced explanation before any recommendation.
    lines.push(rec.reason);
    lines.push('');

    // Step 4 + 6: the care pathway, with the reason and a learn-more link.
    lines.push('Based on that, ' + p.label + ' is usually the right fit here. [Learn more](' + p.link + ').');

    // Step 6 (online only): introduce a trusted provider softly, AFTER the
    // guidance, with the affiliate disclosure preserved verbatim.
    if (rec.providers && rec.providers.length) {
      lines.push('');
      lines.push('For a non-urgent question like this, our [Online Vet guide](/online-vet/) is the best place to start \u2014 it explains how online visits work, when they help, and when to choose in-person care instead.');
      rec.providers.forEach(function (pr) {
        lines.push('In that guide, one online service we trust is ' + pr.name + '. (' + pr.name + ' is an affiliate partner; PetsInMyCity may earn a small commission, at no extra cost to you. This never changes our guidance.)');
      });
    }

    // Step 7: always end with an open, helpful follow-up question.
    lines.push('');
    if (rec.providers && rec.providers.length) {
      lines.push('Would you like me to explain how online vets work, or help you decide whether this is something that should be seen in person?');
    } else {
      lines.push('Would you like help finding the right place near you, or is there anything else I can walk you through?');
    }

    return {
      kind: 'care-pathway',
      urgency: 'routine',
      lines: lines,
      analytics: { event: 'lucy_care_pathway', params: { path: p.id, emergency: false, providers: (rec.providers || []).length } }
    };
  }

  // A warm, pet-focused opener that quietly demonstrates memory.
  function acknowledge() {
    if (memory.petName && memory.symptoms.length) {
      return 'Thanks for telling me about ' + memory.petName + '.';
    }
    if (memory.symptoms.length) {
      return 'Thanks for sharing what ' + petWord() + ' is going through.';
    }
    return 'Thanks for sharing that.';
  }

  /* ============================================================
   * 6. PUBLIC API
   * ============================================================ */
  var LucyEngine = {
    version: 1,
    // memory
    remember: remember,
    getMemory: getMemory,
    reset: reset,
    petWord: petWord,
    // orchestration
    orchestrate: orchestrate,
    concernIsClear: concernIsClear,
    // module registry
    modules: listModules,
    getModule: getModule,
    registerModule: registerModule
  };

  global.PIMCLucy = LucyEngine;
})(typeof window !== 'undefined' ? window : this);
