/*!
 * PetsInMyCity — Veterinary Care Engine v1
 * Permanent, provider-agnostic veterinary care decision engine.
 *
 * PURPOSE
 *   Lucy and future platform features use this module to determine the correct
 *   CARE PATH for a pet owner's situation BEFORE recommending any provider.
 *   Providers (e.g. Dutch) are registered in a reusable PROVIDER REGISTRY so new
 *   providers can be added without changing the engine or the rest of the site.
 *
 * SAFETY (see docs/lucy-brain.md §6–§8)
 *   - Educational only. Never diagnoses, prescribes, or promises outcomes.
 *   - Never delays or replaces emergency or in-person veterinary care.
 *   - Never recommends an online provider in an emergency.
 *
 * AFFILIATE
 *   - Affiliate links never determine the recommended care path.
 *   - The highest-paying option is never automatically chosen.
 *   - Affiliate URLs live in ONE place per provider (see DUTCH_AFFILIATE_URL).
 *
 * NO BACKEND. NO DEPENDENCIES. Client-only, static-safe.
 */
(function (global) {
  'use strict';

  /* =========================================================================
   * 1. CARE PATHS — the permanent set of veterinary care pathways.
   *    Order matters: higher-urgency paths are evaluated first.
   * ====================================================================== */
  var CARE_PATHS = {
    EMERGENCY: {
      id: 'emergency',
      label: 'Emergency Veterinary Care',
      urgency: 'emergency',
      summary: 'Life-threatening or rapidly worsening situations that need an emergency vet now.',
      action: 'Contact the nearest emergency vet or animal hospital immediately.',
      link: '/tools/emergency-finder/',
      allowProviders: false
    },
    POISON_CONTROL: {
      id: 'poison-control',
      label: 'Poison Control',
      urgency: 'emergency',
      summary: 'Known or suspected ingestion of a toxic substance, plant, food, or medication.',
      action: 'Call an animal poison control hotline and your nearest emergency vet right away.',
      link: '/tools/emergency-finder/',
      allowProviders: false
    },
    LOCAL_PRIMARY: {
      id: 'local-primary',
      label: 'Local Primary Veterinarian',
      urgency: 'routine',
      summary: 'Hands-on exams, vaccines, dentistry, bloodwork, and anything needing a physical exam.',
      action: 'See your local veterinarian for in-person care.',
      link: '/find-a-vet/',
      allowProviders: false
    },
    SPECIALIST: {
      id: 'specialist',
      label: 'Veterinary Specialists',
      urgency: 'routine',
      summary: 'Conditions that may need a board-certified specialist (e.g. cardiology, oncology, surgery, dermatology).',
      action: 'Ask your veterinarian for a referral to a board-certified specialist.',
      link: '/find-a-vet/',
      allowProviders: false
    },
    ONLINE: {
      id: 'online',
      label: 'Online Veterinary Care',
      urgency: 'routine',
      summary: 'Guidance questions, minor non-urgent concerns, follow-ups, and general advice from a licensed vet by video or message.',
      action: 'Online veterinary care can be a convenient option for non-emergency questions.',
      link: '/online-vet/',
      allowProviders: true
    },
    BEHAVIORAL: {
      id: 'behavioral',
      label: 'Behavioral Support',
      urgency: 'routine',
      summary: 'Training, anxiety, and behavior concerns that benefit from a trainer, behaviorist, or veterinary guidance.',
      action: 'Consider a qualified trainer or behaviorist, and ask your vet to rule out medical causes.',
      link: '/training/',
      allowProviders: false
    }
  };

  /* =========================================================================
   * 2. URGENCY SIGNALS — conservative keyword detection used to triage.
   *    These are intentionally cautious: when in doubt, escalate to safety.
   *    (See docs/lucy-brain.md §8 Emergency Escalation.)
   * ====================================================================== */
  var EMERGENCY_SIGNALS = /(can'?t|cannot|trouble|difficulty|labou?red)\s+breath|not\s+breathing|collaps|seizure|convuls|unconscious|unrespons|won'?t\s+wake|suspected\s+poison|bloat|distend|hard\s+abdomen|severe\s+trauma|hit\s+by|heavy\s+bleed|won'?t\s+stop\s+bleed|can'?t\s+urinate|unable\s+to\s+(?:pee|urinate)|blocked\s+cat|heatstroke|overheat|repeated\s+vomit|nonstop\s+vomit|blue\s+gums|pale\s+gums|choking|broken\s+bone|is\s+this\s+an\s+emergency/i;

  var POISON_SIGNALS = /poison|toxic|chocolate|xylitol|grapes?|raisin|antifreeze|rodenticide|rat\s+bait/i;

  var ATE_SIGNALS = /(ate|eaten|ingest|swallow|got\s+into|chewed|licked)/i;

  var SPECIALIST_SIGNALS = /specialist|cardiolog|oncolog|chemo|tumou?r|cancer|neurolog|dermatolog|ophthalmolog|orthopedic|referral|board[\s-]?certified/i;

  var BEHAVIOR_SIGNALS = /behavio|training|anxiet|aggress|biting|barking|destructive|separation|house[\s-]?train|potty/i;

  var IN_PERSON_SIGNALS = /exam|vaccin|shot|spay|neuter|dental|teeth\s+clean|x-?ray|surgery|bloodwork|blood\s+test|wound|stitches|in[\s-]?person|physical/i;

  var ONLINE_SIGNALS = /online\s+vet|virtual\s+vet|telehealth|telemedicine|video\s+call|chat\s+with\s+a\s+vet|from\s+home|quick\s+question|non[\s-]?urgent|advice|second\s+opinion|follow[\s-]?up/i;

  /* =========================================================================
   * 3. DECISION ENGINE — returns a structured recommendation.
   *    NEVER returns a diagnosis. Returns a care PATH + plain-language reason.
   * ====================================================================== */
  function decideCarePath(text) {
    var t = String(text || '').toLowerCase();
    var result = { path: null, reason: '', isEmergency: false, allowProviders: false };

    // 1) Emergencies and poison ALWAYS win. Safety first; never delayed.
    if (EMERGENCY_SIGNALS.test(t)) {
      result.path = CARE_PATHS.EMERGENCY;
      result.isEmergency = true;
      result.reason = 'What you are describing can be serious, so the safest step is emergency care right now \u2014 not waiting for an online visit.';
      return result;
    }
    if (POISON_SIGNALS.test(t) && ATE_SIGNALS.test(t)) {
      result.path = CARE_PATHS.POISON_CONTROL;
      result.isEmergency = true;
      result.reason = 'If your pet may have eaten something toxic, this can become an emergency quickly, so please treat it as urgent.';
      return result;
    }

    // 2) Routine paths.
    if (SPECIALIST_SIGNALS.test(t)) {
      result.path = CARE_PATHS.SPECIALIST;
      result.reason = 'This may benefit from a board-certified specialist, usually through a referral from your regular vet.';
      return result;
    }
    if (IN_PERSON_SIGNALS.test(t)) {
      result.path = CARE_PATHS.LOCAL_PRIMARY;
      result.reason = 'This usually needs a hands-on exam, so a local veterinarian is the right place to start.';
      return result;
    }
    if (BEHAVIOR_SIGNALS.test(t) && !ONLINE_SIGNALS.test(t)) {
      result.path = CARE_PATHS.BEHAVIORAL;
      result.reason = 'Behavior questions often improve with training support, and a vet can help rule out any medical causes.';
      return result;
    }
    if (ONLINE_SIGNALS.test(t)) {
      result.path = CARE_PATHS.ONLINE;
      result.allowProviders = true;
      result.reason = 'For a non-urgent question like this, online veterinary care can be a convenient way to talk with a licensed vet.';
      return result;
    }

    // 3) No strong signal: stay neutral and educational. Do not push a provider.
    result.path = null;
    result.reason = '';
    return result;
  }

  /* =========================================================================
   * 4. PROVIDER REGISTRY — reusable, provider-agnostic configuration.
   *
   *    Add a new provider by pushing a config object into PROVIDERS. Nothing
   *    else in the platform needs to change. Each provider declares which
   *    care path it serves; only ONLINE-path providers are ever surfaced, and
   *    never during an emergency.
   *
   *    >>> SINGLE SOURCE OF TRUTH FOR THE DUTCH AFFILIATE LINK <<<
   *    DUTCH_AFFILIATE_URL is a PLACEHOLDER. Replace it in this ONE location
   *    with the official Impact affiliate tracking link when provided. Until
   *    then it points to the plain Dutch homepage (no fabricated tracking).
   * ====================================================================== */

  // TODO(affiliate): replace with the official Dutch tracking link (one place).
  var DUTCH_AFFILIATE_URL = 'https://www.dutch.com/';

  var PROVIDERS = [
    {
      id: 'dutch',
      name: 'Dutch',
      carePath: 'online',
      // Conservative, category-level description ONLY. No pricing, coverage,
      // availability, or prescription guarantees — those require verification.
      blurb: 'Dutch is an online veterinary care service that connects pet owners with licensed veterinarians.',
      url: DUTCH_AFFILIATE_URL,
      affiliate: true,            // requires disclosure + rel="sponsored"
      rel: 'sponsored noopener',  // applied to outbound links
      pending: true               // true until live link + Dutch-specific content confirmed
    }
    // Future providers (Vetster, AirVet, BetterVet, Pawp, …) plug in here with
    // the SAME shape. No engine or template changes required.
  ];

  // Affiliate disclosure text reused wherever a provider link appears.
  var AFFILIATE_DISCLOSURE = 'PetsInMyCity may earn a small commission if you sign up through some partner links, at no extra cost to you. This never affects which care path we recommend.';

  function providersForPath(pathId) {
    return PROVIDERS.filter(function (p) { return p.carePath === pathId; });
  }

  function onlineProviders() {
    return providersForPath('online');
  }

  /* =========================================================================
   * 5. RECOMMENDATION ASSEMBLY — care path first, provider only if allowed.
   * ====================================================================== */
  function recommend(text) {
    var decision = decideCarePath(text);
    var out = {
      path: decision.path,
      reason: decision.reason,
      isEmergency: decision.isEmergency,
      providers: []
    };
    // Providers are ONLY ever attached to the online path, and NEVER in an
    // emergency. This is a hard safety rule, enforced here in one place.
    if (decision.path && decision.path.allowProviders && !decision.isEmergency) {
      out.providers = onlineProviders();
    }
    return out;
  }

  /* =========================================================================
   * 6. PUBLIC API
   * ====================================================================== */
  var VetCare = {
    version: 1,
    paths: CARE_PATHS,
    decide: decideCarePath,
    recommend: recommend,
    providers: function () { return PROVIDERS.slice(); },
    providersForPath: providersForPath,
    onlineProviders: onlineProviders,
    disclosure: AFFILIATE_DISCLOSURE,
    DUTCH_AFFILIATE_URL: DUTCH_AFFILIATE_URL
  };

  global.PIMCVetCare = VetCare;

})(typeof window !== 'undefined' ? window : this);
