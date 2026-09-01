'use strict';

/* eslint-disable max-len */

/**
 * ============================================================================
 * VETERINARY SAFETY CONFIGURATION - REQUIRES LICENSED VETERINARY REVIEW
 * ============================================================================
 *
 * This file is the single reviewable place where every clinical policy decision
 * used by the deterministic safety layer lives. It is intentionally data-only:
 * no request handling, no model calls, no formatting logic. A licensed
 * veterinarian should be able to read this file end to end and sign off on it
 * without reading any other file in the repository.
 *
 * REVIEW STATUS
 * -------------
 * Every entry below carries a `review` field:
 *
 *   'pending_vet_review'  - drafted by engineering from the audit brief and NOT
 *                           yet approved by a licensed veterinarian. Ship-blocking
 *                           for any claim of clinical accuracy.
 *   'vet_approved'        - reviewed and approved. Record the reviewer, their
 *                           licence jurisdiction and the date in `reviewed_by`.
 *
 * As of this commit EVERY entry is `pending_vet_review`. See
 * docs/VETERINARY_SAFETY_REVIEW.md for the sign-off checklist.
 *
 * HARD RULES ENCODED HERE
 * -----------------------
 *  1. No medication dosing of any kind appears in this file, and the safety
 *     layer must never emit any. Dosing is a licensed act.
 *  2. No diagnosis. Copy says "these signs can mean an emergency", never
 *     "your pet has X".
 *  3. No invented clinical thresholds. Where a numeric bound appears it is an
 *     INPUT PLAUSIBILITY bound for form validation (rejecting a 900 lb cat),
 *     explicitly not a clinical cut-off, and is marked as such.
 *  4. Red-flag recognition is pattern-based and deliberately over-inclusive.
 *     A false positive costs a wasted vet call; a false negative can cost a
 *     life. Tune toward recall.
 */

const POLICY_VERSION = 'vet-safety.v1';

/**
 * Shown with every health-adjacent response, emergency or not.
 * Legal/marketing review required in addition to veterinary review.
 */
const DISCLAIMER = {
  review: 'pending_vet_review',
  reviewed_by: null,
  text: 'PetsInMyCity provides general pet care information only. This is not veterinary advice, not a diagnosis, and not a substitute for examination by a licensed veterinarian. We do not provide medication dosing. If you are worried about your pet, contact a veterinarian.',
};

/**
 * US animal poison control services.
 *
 * Fee disclosure is mandatory and must appear wherever these numbers appear:
 * both services charge a consultation fee. We deliberately do NOT quote a
 * dollar amount, because published fees change and a stale number in our copy
 * would be a misrepresentation.
 */
const POISON_CONTROL = {
  review: 'pending_vet_review',
  reviewed_by: null,
  fee_disclosure: 'Both services charge a consultation fee, payable by you, not by PetsInMyCity. Ask about the current fee when you call.',
  services: [
    {
      name: 'ASPCA Animal Poison Control Center',
      phone: '(888) 426-4435',
      availability: '24/7',
    },
    {
      name: 'Pet Poison Helpline',
      phone: '(855) 764-7661',
      availability: '24/7',
    },
  ],
};

/**
 * Emergency-search pathway. `zip` is optional; when absent we fall back to a
 * "near me" search, which resolves against the browser's own location.
 */
const EMERGENCY_SEARCH = {
  review: 'pending_vet_review',
  reviewed_by: null,
  internal_path: '/tools/emergency-finder/',
  maps_base: 'https://www.google.com/maps/search/emergency+vet+near+',
  label: 'Find an emergency vet near you',
};

/**
 * Red-flag categories.
 *
 * `patterns` are matched case-insensitively against the raw user text BEFORE
 * any model call. `guidance` is the deterministic copy shown to the user.
 * `poison_control` adds the poison-control block and its fee disclosure.
 *
 * Patterns are written to favour recall. Adding a pattern is cheap; removing
 * one requires veterinary sign-off.
 */
const RED_FLAGS = [
  {
    id: 'difficulty_breathing',
    label: 'Difficulty breathing',
    review: 'pending_vet_review',
    reviewed_by: null,
    patterns: [
      /\b(can'?t|cannot|unable to|trouble|difficulty|struggling to|hard time)\s+breath/i,
      /\b(labou?red|laboured|rapid|shallow|noisy|open[\s-]?mouth)\s+breathing\b/i,
      /\bgasping|choking|suffocat|wheez(e|ing)|blue (gums|tongue|lips)|cyanotic|not breathing\b/i,
      /\brespiratory distress\b/i,
    ],
    guidance: [
      'Breathing trouble in a pet is treated as an emergency.',
      'Call the nearest emergency veterinary hospital now and tell them you are on your way.',
      'Keep your pet calm and cool. Do not restrain, wrap, or force anything into their mouth.',
      'Do not wait to see whether it improves on its own.',
    ],
    poison_control: false,
  },
  {
    id: 'collapse_or_unconscious',
    label: 'Collapse or unconsciousness',
    review: 'pending_vet_review',
    reviewed_by: null,
    patterns: [
      /\bcollapse(d|ing)?\b/i,
      /\b(unconscious|unresponsive|won'?t wake|not waking|passed out|fainted|fainting)\b/i,
      /\b(limp|lifeless)\b.*\b(body|dog|cat|pet)\b/i,
      /\bcan'?t stand( up)?\b|\bwon'?t stand\b|\blegs? gave out\b/i,
    ],
    guidance: [
      'Collapse or loss of consciousness is treated as an emergency.',
      'Call the nearest emergency veterinary hospital now and go straight there.',
      'Keep your pet flat, warm and quiet during transport. Do not give food or water.',
    ],
    poison_control: false,
  },
  {
    id: 'seizure',
    label: 'Active or repeated seizures',
    review: 'pending_vet_review',
    reviewed_by: null,
    patterns: [
      /\bseiz(e|ing|ure|ures)\b/i,
      /\bconvuls(e|ing|ion|ions)\b/i,
      /\b(fit|fitting)\b.*\b(dog|cat|pet)\b/i,
      /\btwitching uncontrollab/i,
      /\bparadd?ling\b.*\blegs?\b/i,
    ],
    guidance: [
      'Seizures are treated as an emergency, especially a seizure that is still happening, one lasting more than a few minutes, or more than one seizure in a day.',
      'Call the nearest emergency veterinary hospital now.',
      'Do not put your hands or anything else near your pet’s mouth. Clear hard objects away, dim the lights, and note the time the seizure started.',
    ],
    poison_control: false,
  },
  {
    id: 'uncontrolled_bleeding',
    label: 'Uncontrolled bleeding',
    review: 'pending_vet_review',
    reviewed_by: null,
    patterns: [
      /\b(bleeding|blood)\b.*\b(won'?t stop|will not stop|does ?n'?t stop|is not stopping|not stopping|can'?t stop|cannot stop|uncontrolled|heav(y|ily)|profuse(ly)?|gushing|pouring|spurting|soaked)\b/i,
      /\b(won'?t stop|will not stop|not stopping|uncontrolled|heavy|profuse|gushing)\b.*\b(bleeding|blood)\b/i,
      /\b(keeps|still)\s+bleeding\b/i,
      /\bhemorrhag|haemorrhag\b/i,
      /\bblood (everywhere|all over)\b/i,
      /\bvomiting blood|coughing up blood|blood in (vomit|stool|urine|pee)\b/i,
    ],
    guidance: [
      'Bleeding that will not stop is treated as an emergency.',
      'Call the nearest emergency veterinary hospital now and go straight there.',
      'Press a clean cloth firmly over the wound on the way. Do not remove it to look, and do not apply a tourniquet.',
    ],
    poison_control: false,
  },
  {
    id: 'suspected_poisoning',
    label: 'Suspected poisoning or toxic ingestion',
    review: 'pending_vet_review',
    reviewed_by: null,
    patterns: [
      /\b(poison(ed|ing)?|toxic|toxin|overdose|od'?d)\b/i,
      /\b(ate|eaten|ingested|swallowed|got into|licked|chewed)\b[^.?!]{0,60}\b(chocolate|xylitol|grape|grapes|raisin|raisins|onion|onions|garlic|antifreeze|rat poison|rodenticide|slug bait|marijuana|cannabis|thc|edible|edibles|ibuprofen|acetaminophen|tylenol|advil|aspirin|adderall|pill|pills|medication|meds|lily|lilies|sago palm|mushroom|mushrooms|bleach|detergent|pesticide|insecticide|fertili[sz]er|alcohol|nicotine|vape|batter(y|ies)|antidepressant)\b/i,
      /\b(chocolate|xylitol|antifreeze|rat poison|rodenticide|lily|lilies|sago palm)\b[^.?!]{0,40}\b(ate|eaten|ingested|swallowed)\b/i,
    ],
    guidance: [
      'A suspected poisoning is treated as an emergency, even if your pet still seems fine.',
      'Call an emergency veterinary hospital now, and call an animal poison control service.',
      'If you can do it safely, have the packaging or plant with you when you call, along with your pet’s weight and roughly when and how much they took.',
      'Do not try to make your pet vomit unless a veterinarian or poison control tells you to. With some substances that causes more harm.',
    ],
    poison_control: true,
  },
  {
    id: 'urinary_obstruction',
    label: 'Urinary obstruction or inability to urinate',
    review: 'pending_vet_review',
    reviewed_by: null,
    patterns: [
      /\b(can'?t|cannot|unable to|not able to|trying to|straining to)\s*(pee|urinate|wee)\b/i,
      /\b(no|not|has ?n'?t|have ?n'?t|is ?n'?t|did ?n'?t)\s+(been\s+)?(pee|peed|peeing|urinat(e|ed|ing))\b/i,
      /\b(blocked|obstruct(ed|ion))\b[^.?!]{0,30}\b(bladder|urethra|urinary)\b/i,
      /\bstraining in the litter ?box\b/i,
      /\bcrying (in|when)[^.?!]{0,20}(litter ?box|pee|urinat)/i,
      /\b(blocked|obstructed)\s+(cat|tom ?cat)\b/i,
      /\b(cat|tom ?cat)\b\s*(is|might be|may be|seems|appears)?\s*(blocked|obstructed)\b/i,
    ],
    guidance: [
      'A pet that cannot urinate is treated as an emergency. This is especially urgent in male cats, where it can become life-threatening within hours.',
      'Call the nearest emergency veterinary hospital now and go straight there.',
      'Do not press on your pet’s belly and do not wait overnight to see if it clears.',
    ],
    poison_control: false,
  },
  {
    id: 'severe_trauma',
    label: 'Severe trauma',
    review: 'pending_vet_review',
    reviewed_by: null,
    patterns: [
      /\b(hit|struck|run over)\b[^.?!]{0,25}\b(car|truck|vehicle|bike|bicycle)\b/i,
      /\bhit by a car\b|\bhbc\b/i,
      /\b(fell|fall|jumped)\b[^.?!]{0,25}\b(window|balcony|roof|stairs|height|storey|story)\b/i,
      /\b(attacked|mauled|bitten|bite)\b[^.?!]{0,25}\b(dog|coyote|animal|another dog)\b/i,
      /\b(broken|fractured?)\b[^.?!]{0,20}\b(leg|bone|back|jaw|pelvis|spine)\b/i,
      /\b(leg|bone|back|jaw|pelvis|spine|paw|hip)\b\s*(is|looks|might be|may be|seems|appears)?\s*(broken|fractured)\b/i,
      /\b(impaled|gunshot|shot|stabbed|crushed|degloved)\b/i,
      /\bbone (is )?(sticking|showing) out\b/i,
    ],
    guidance: [
      'Serious injury is treated as an emergency, even when your pet gets up and seems normal afterwards. Internal bleeding and chest injuries are often invisible at first.',
      'Call the nearest emergency veterinary hospital now and tell them what happened.',
      'Move your pet as little as possible. Support the whole body on a flat, firm surface such as a board or a rigid blanket for transport.',
    ],
    poison_control: false,
  },
  {
    id: 'heatstroke',
    label: 'Heatstroke',
    review: 'pending_vet_review',
    reviewed_by: null,
    patterns: [
      /\bheat ?stroke\b|\bheat ?exhaustion\b|\boverheat(ed|ing)?\b|\bhyperthermi/i,
      /\b(left|locked|stuck|trapped)\b[^.?!]{0,25}\b(in the|in a)\b[^.?!]{0,15}\b(car|vehicle)\b/i,
      /\b(hot|heat)\b[^.?!]{0,25}\b(panting heavily|collapsed|bright red gums|drooling heavily)\b/i,
    ],
    guidance: [
      'Suspected heatstroke is treated as an emergency and can worsen quickly even after your pet looks cooler.',
      'Call the nearest emergency veterinary hospital now and go straight there.',
      'On the way, move your pet somewhere cool and out of the sun, offer small sips of cool water if they are fully awake and swallowing, and use cool - not ice-cold - water on the body. Do not cover them in wet towels or use ice.',
    ],
    poison_control: false,
  },
  {
    id: 'severe_allergic_reaction',
    label: 'Severe allergic reaction',
    review: 'pending_vet_review',
    reviewed_by: null,
    patterns: [
      /\banaphyla/i,
      /\b(face|muzzle|throat|tongue|eyes?|lips?)\b[^.?!]{0,25}\b(swell(ing|ed|s)?|swollen|puffy)\b/i,
      /\b(swollen|swelling)\b[^.?!]{0,25}\b(face|muzzle|throat|tongue|eyes?|lips?)\b/i,
      /\b(hives|welts)\b/i,
      /\ballergic reaction\b/i,
      /\b(bee|wasp|hornet|snake|spider)\b[^.?!]{0,25}\b(sting|stung|bit|bite|bitten)\b/i,
      /\b(sting|stung|bit|bite|bitten)\b[^.?!]{0,25}\b(bee|wasp|hornet|snake|spider)\b/i,
    ],
    guidance: [
      'A swelling face or throat, hives, or a suspected sting or bite reaction is treated as an emergency because the airway can close.',
      'Call the nearest emergency veterinary hospital now and go straight there.',
      'Do not give any human allergy medicine. We cannot give dosing, and the wrong product or amount is dangerous.',
    ],
    poison_control: false,
  },
  {
    id: 'bloat_or_unproductive_retching',
    label: 'Persistent unproductive retching or suspected bloat',
    review: 'pending_vet_review',
    reviewed_by: null,
    patterns: [
      /\bbloat(ed|ing)?\b/i,
      /\bgdv\b|\bgastric dilat/i,
      /\btwisted stomach\b|\bstomach (has )?(flipped|twisted)\b/i,
      /\b(retching|heaving|gagging|dry heav\w*)\b[^.?!]{0,40}\b(nothing|no vomit|not bringing|unproductive|but nothing)\b/i,
      /\b(trying|tries|attempting)\b[^.?!]{0,25}\bto (vomit|throw up|be sick)\b[^.?!]{0,25}\b(nothing|can'?t|cannot|could ?n'?t|unable|without success|no luck)\b/i,
      /\b(hard|tight|distended|swollen|bloated|drum)\b[^.?!]{0,20}\b(belly|abdomen|stomach|tummy)\b/i,
      /\b(belly|abdomen|stomach|tummy)\b[^.?!]{0,25}\b(hard|tight|distended|swollen|drum[\s-]?like)\b/i,
    ],
    guidance: [
      'Repeated retching that brings nothing up, especially with a swollen or tight belly, is treated as an emergency. In deep-chested dogs this can be a twisted stomach, which is rapidly life-threatening.',
      'Call the nearest emergency veterinary hospital now and go straight there.',
      'Do not offer food or water and do not wait to see if it settles.',
    ],
    poison_control: false,
  },
];

/**
 * Explicit negation guards.
 *
 * Deliberately narrow. Only an unambiguous negation IMMEDIATELY before the
 * matched phrase suppresses a red flag, and only for the phrase it precedes.
 * Anything vaguer (past tense, "last week", hypotheticals) is NOT suppressed:
 * we would rather over-trigger.
 */
const NEGATION_PREFIXES = [
  /\b(no|not|never|without|isn'?t|is not|wasn'?t|was not|hasn'?t|has not|aren'?t|are not|doesn'?t|does not|didn'?t|did not)\s+$/i,
];

/**
 * INPUT PLAUSIBILITY BOUNDS - NOT CLINICAL THRESHOLDS.
 *
 * These exist so a form cannot submit nonsense (a 900 lb cat, a 400 year old
 * dog) and so a hostile caller cannot push unbounded text into a paid model
 * call. They are not, and must never be presented as, clinical guidance.
 */
const INPUT_BOUNDS = {
  review: 'pending_vet_review',
  reviewed_by: null,
  note: 'Input plausibility bounds for form validation only. NOT clinical thresholds.',
  species: ['dog', 'cat', 'both'],
  weight_units: ['lb', 'kg'],
  weight_lb: { min: 0.2, max: 300 },
  weight_kg: { min: 0.1, max: 140 },
  age_units: ['weeks', 'months', 'years'],
  age_years: { min: 0, max: 40 },
  age_months: { min: 0, max: 480 },
  age_weeks: { min: 0, max: 2080 },
  symptom_text: { min: 2, max: 1000 },
  food_text: { min: 2, max: 120 },
  food_quantity: { min: 0, max: 10000, units: ['g', 'oz', 'lb', 'kg', 'ml', 'cups', 'pieces'] },
  activity_levels: ['low', 'moderate', 'high', 'working'],
  body_conditions: ['underweight', 'ideal', 'overweight'],
};

/**
 * Categories of request the safety layer refuses outright, regardless of what
 * the model would have said. Dosing is a licensed act; we do not do it.
 */
const REFUSED_TOPICS = [
  {
    id: 'medication_dosing',
    review: 'pending_vet_review',
    reviewed_by: null,
    patterns: [
      /\bhow (much|many)\b[^.?!]{0,40}\b(benadryl|diphenhydramine|ibuprofen|advil|tylenol|acetaminophen|aspirin|pepto|imodium|melatonin|gabapentin|trazodone|prednisone|metronidazole|amoxicillin|medication|medicine|dose|dosage)\b/i,
      /\b(dose|dosage|dosing|mg\/kg|mg per (kg|lb|pound))\b/i,
      /\b(can i give|is it ok to give|should i give|safe to give)\b[^.?!]{0,40}\b(benadryl|diphenhydramine|ibuprofen|advil|tylenol|acetaminophen|aspirin|pepto|imodium|melatonin|gabapentin|trazodone|prednisone|human (medicine|medication|pills?))\b/i,
    ],
    response: 'We cannot give medication doses. Dosing depends on your pet’s exact weight, age, other medications and health conditions, and getting it wrong can be fatal - several common human medicines are toxic to pets. Please call your veterinarian, or an emergency veterinary hospital if this is urgent. They can give you a safe amount over the phone.',
  },
];

module.exports = {
  POLICY_VERSION,
  DISCLAIMER,
  POISON_CONTROL,
  EMERGENCY_SEARCH,
  RED_FLAGS,
  NEGATION_PREFIXES,
  INPUT_BOUNDS,
  REFUSED_TOPICS,
};
