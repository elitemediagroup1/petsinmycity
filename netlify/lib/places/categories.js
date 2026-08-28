'use strict';

/**
 * The closed set of pet-service categories the places-search endpoint will
 * search for.
 *
 * Arbitrary Google Places keywords are NOT accepted. The browser sends a
 * category id from this list; the server maps it to the provider query. That
 * means a caller can never use our billed Google key as a general-purpose
 * Places proxy, and can never inject query syntax into the provider request.
 *
 * `type` is a Google Places (legacy Nearby Search) place type where an exact one
 * exists; `keyword` is the free-text refinement we send alongside it.
 */

const CATEGORIES = Object.freeze({
  veterinarian: { label: 'Veterinarian', type: 'veterinary_care', keyword: 'veterinarian' },
  'emergency-veterinarian': { label: 'Emergency veterinarian', type: 'veterinary_care', keyword: 'emergency vet', emergency: true },
  grooming: { label: 'Pet grooming', type: 'pet_store', keyword: 'pet groomer' },
  boarding: { label: 'Pet boarding', type: null, keyword: 'dog boarding kennel' },
  training: { label: 'Dog training', type: null, keyword: 'dog trainer' },
  walking: { label: 'Dog walking', type: null, keyword: 'dog walker' },
  daycare: { label: 'Doggy daycare', type: null, keyword: 'doggy daycare' },
  shelter: { label: 'Animal shelter', type: null, keyword: 'animal shelter' },
  'pet-store': { label: 'Pet store', type: 'pet_store', keyword: 'pet store' },
});

const CATEGORY_IDS = Object.freeze(Object.keys(CATEGORIES));

/**
 * Accept a category id, tolerating the spellings the existing front-end already
 * sends (e.g. 'emergency vet', 'pet groomer') so no page breaks on deploy.
 */
const ALIASES = Object.freeze({
  vet: 'veterinarian',
  vets: 'veterinarian',
  veterinary: 'veterinarian',
  'emergency vet': 'emergency-veterinarian',
  'emergency-vet': 'emergency-veterinarian',
  'emergency veterinarian': 'emergency-veterinarian',
  groomer: 'grooming',
  'pet groomer': 'grooming',
  'pet grooming': 'grooming',
  'dog boarding': 'boarding',
  kennel: 'boarding',
  'dog trainer': 'training',
  'dog training': 'training',
  'dog walker': 'walking',
  'doggy daycare': 'daycare',
  'dog daycare': 'daycare',
  'animal shelter': 'shelter',
  rescue: 'shelter',
  'pet store': 'pet-store',
  'pet shop': 'pet-store',
  'pet supplies': 'pet-store',
  // 'dog park' is intentionally absent: it is not a pet SERVICE category and
  // was previously used to spend billed Places quota on a free Maps use case.
});

/**
 * @param {*} value
 * @returns {{ok: true, id: string, category: object} | {ok: false, reason: string}}
 */
function resolve(value) {
  if (typeof value !== 'string') return { ok: false, reason: 'not_a_string' };
  const raw = value.trim().toLowerCase();
  if (!raw || raw.length > 40) return { ok: false, reason: 'bad_length' };
  const id = Object.prototype.hasOwnProperty.call(CATEGORIES, raw)
    ? raw
    : (Object.prototype.hasOwnProperty.call(ALIASES, raw) ? ALIASES[raw] : null);
  if (!id) return { ok: false, reason: 'unsupported_category' };
  return { ok: true, id: id, category: CATEGORIES[id] };
}

module.exports = { CATEGORIES, CATEGORY_IDS, ALIASES, resolve };
