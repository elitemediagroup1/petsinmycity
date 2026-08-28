'use strict';

/**
 * Deterministic veterinary safety layer.
 *
 * Runs BEFORE any model call, on the raw user text. Nothing the model returns,
 * and nothing the user writes as an instruction, can change the outcome:
 *
 *  - the classifier only ever looks at `text` as data, never as instruction;
 *  - when a red flag matches, the handler returns the emergency payload and the
 *    model is never called, so there is no AI response to wait for and no AI
 *    response that could contradict the classification;
 *  - `classification` and `disclaimer` are attached server-side after any model
 *    call too, so a prompt-injected reply cannot remove them.
 *
 * All clinical copy and all patterns live in vet-safety-config.js.
 */

const config = require('./vet-safety-config');
const { INPUT_BOUNDS } = config;
const validate = require('../validate');

/**
 * Was the match immediately preceded by an explicit negation?
 * Deliberately narrow - see NEGATION_PREFIXES in the config.
 */
function isNegated(text, matchIndex) {
  const before = text.slice(Math.max(0, matchIndex - 24), matchIndex);
  return config.NEGATION_PREFIXES.some(function (re) { return re.test(before); });
}

function matchCategory(text, category) {
  for (const pattern of category.patterns) {
    // Patterns are authored without /g, so lastIndex never carries over.
    const m = pattern.exec(text);
    if (m && !isNegated(text, m.index)) return true;
  }
  return false;
}

/**
 * Classify free text against the red-flag catalogue.
 *
 * @param {string} text
 * @returns {{ emergency: boolean, categories: Array<{id,label}> }}
 */
function classify(text) {
  if (typeof text !== 'string' || !text.trim()) return { emergency: false, categories: [] };
  const haystack = text.slice(0, 4000);
  const categories = [];
  for (const category of config.RED_FLAGS) {
    if (matchCategory(haystack, category)) {
      categories.push({ id: category.id, label: category.label });
    }
  }
  return { emergency: categories.length > 0, categories: categories };
}

/** Does the text ask for a medication dose? */
function refusedTopic(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const haystack = text.slice(0, 4000);
  for (const topic of config.REFUSED_TOPICS) {
    for (const pattern of topic.patterns) {
      if (pattern.test(haystack)) return { id: topic.id, response: topic.response };
    }
  }
  return null;
}

/** Google Maps emergency-vet search, optionally anchored on a validated ZIP. */
function emergencySearchUrl(zip) {
  const suffix = zip && /^\d{5}$/.test(String(zip)) ? String(zip) : 'me';
  return config.EMERGENCY_SEARCH.maps_base + suffix;
}

/**
 * Build the full deterministic emergency payload.
 *
 * This is the entire user-facing answer for a red-flagged request. It is
 * produced without any network call so it is returned immediately.
 *
 * @param {{categories: Array}} classification
 * @param {{zip?: string}} [context]
 */
function buildEmergencyResponse(classification, context) {
  const ctx = context || {};
  const ids = classification.categories.map(function (c) { return c.id; });
  const entries = config.RED_FLAGS.filter(function (f) { return ids.indexOf(f.id) !== -1; });

  const lines = [];
  lines.push('**This may be an emergency. Contact an emergency veterinarian now.**');
  lines.push('');

  const seen = new Set();
  for (const entry of entries) {
    lines.push('**' + entry.label + '**');
    for (const step of entry.guidance) {
      if (seen.has(step)) continue;
      seen.add(step);
      lines.push('- ' + step);
    }
    lines.push('');
  }

  const needsPoisonControl = entries.some(function (e) { return e.poison_control; });
  if (needsPoisonControl) {
    lines.push('**Animal poison control (US)**');
    for (const service of config.POISON_CONTROL.services) {
      lines.push('- ' + service.name + ' - ' + service.phone + ' (' + service.availability + ')');
    }
    lines.push('- ' + config.POISON_CONTROL.fee_disclosure);
    lines.push('');
  }

  const url = emergencySearchUrl(ctx.zip);
  lines.push('[' + config.EMERGENCY_SEARCH.label + '](' + url + ')');
  lines.push('');
  lines.push('_' + config.DISCLAIMER.text + '_');

  return {
    emergency: true,
    policy_version: config.POLICY_VERSION,
    categories: classification.categories,
    poison_control: needsPoisonControl
      ? { services: config.POISON_CONTROL.services, fee_disclosure: config.POISON_CONTROL.fee_disclosure }
      : null,
    emergency_search: { url: url, label: config.EMERGENCY_SEARCH.label, internal_path: config.EMERGENCY_SEARCH.internal_path },
    disclaimer: config.DISCLAIMER.text,
    text: lines.join('\n'),
  };
}

/** The non-emergency envelope attached to every health-adjacent response. */
function buildAdvisory(classification) {
  return {
    emergency: false,
    policy_version: config.POLICY_VERSION,
    categories: (classification && classification.categories) || [],
    disclaimer: config.DISCLAIMER.text,
    emergency_search: {
      url: emergencySearchUrl(null),
      label: config.EMERGENCY_SEARCH.label,
      internal_path: config.EMERGENCY_SEARCH.internal_path,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Structured field validation (species / weight / age / symptoms / food)
 * ------------------------------------------------------------------ */

function species(value) {
  return validate.enumValue(value, INPUT_BOUNDS.species);
}

function weightUnit(value) {
  return validate.enumValue(value, INPUT_BOUNDS.weight_units);
}

/** Validate a weight against the plausibility bound for its unit. */
function weight(value, unit) {
  const u = weightUnit(unit);
  if (!u.ok) return validate.fail('bad_weight_unit');
  const bounds = u.value === 'kg' ? INPUT_BOUNDS.weight_kg : INPUT_BOUNDS.weight_lb;
  const n = validate.numberInRange(value, bounds.min, bounds.max);
  if (!n.ok) return n;
  return validate.pass({ value: n.value, unit: u.value });
}

function ageUnit(value) {
  return validate.enumValue(value, INPUT_BOUNDS.age_units);
}

function age(value, unit) {
  if (value === '' || value == null) return validate.pass(null); // age is optional
  const u = ageUnit(unit || 'years');
  if (!u.ok) return validate.fail('bad_age_unit');
  const key = 'age_' + u.value;
  const bounds = INPUT_BOUNDS[key];
  const n = validate.numberInRange(value, bounds.min, bounds.max);
  if (!n.ok) return n;
  return validate.pass({ value: n.value, unit: u.value });
}

function symptoms(value) {
  return validate.boundedString(value, {
    min: INPUT_BOUNDS.symptom_text.min,
    max: INPUT_BOUNDS.symptom_text.max,
  });
}

function foodItem(value) {
  return validate.boundedString(value, {
    min: INPUT_BOUNDS.food_text.min,
    max: INPUT_BOUNDS.food_text.max,
  });
}

function foodQuantity(value, unit) {
  if (value === '' || value == null) return validate.pass(null); // optional
  const u = validate.enumValue(unit || 'g', INPUT_BOUNDS.food_quantity.units);
  if (!u.ok) return validate.fail('bad_quantity_unit');
  const n = validate.numberInRange(value, INPUT_BOUNDS.food_quantity.min, INPUT_BOUNDS.food_quantity.max);
  if (!n.ok) return n;
  return validate.pass({ value: n.value, unit: u.value });
}

module.exports = {
  classify,
  refusedTopic,
  buildEmergencyResponse,
  buildAdvisory,
  emergencySearchUrl,
  fields: { species, weight, weightUnit, age, ageUnit, symptoms, foodItem, foodQuantity },
  config: config,
};
