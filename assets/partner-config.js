/*!
 * PetsInMyCity — Partner Configuration (Phase 2.5)
 * SINGLE SOURCE OF TRUTH for affiliate partner links and disclosures.
 *
 * WHY THIS FILE EXISTS
 * Affiliate URLs must NOT be hardcoded throughout the site. Every CTA and
 * every module reads partner data from window.PIMCPartners so that future
 * updates (e.g. swapping in the live Dutch tracking link) require changing
 * the URL in ONE place only — right here.
 *
 * RULES (see docs/brand-bible.md, docs/lucy-brain.md)
 * - Provider-agnostic: a provider is data, never "the engine".
 * - Affiliate links never determine the recommended care path.
 * - The highest-paying option is never automatically chosen.
 * - Every affiliate link is disclosed and uses rel="sponsored".
 * - No fabricated pricing, coverage, availability, or guarantees.
 *
 * NO BACKEND. NO DEPENDENCIES. Loads before the engines (see script.js).
 */
(function (global) {
  'use strict';
  if (global.PIMCPartners) return; // singleton

  /* =======================================================================
   * AFFILIATE PARTNERS — one entry per partner. URLs live ONLY here.
   *
   * >>> REPLACE THE DUTCH url BELOW WITH THE OFFICIAL IMPACT TRACKING LINK <<<
   * It is currently a PLACEHOLDER pointing at the plain Dutch homepage so
   * nothing is fabricated. Changing it here updates every CTA site-wide.
   * ==================================================================== */
  var PARTNERS = {
    dutch: {
      id: 'dutch',
      name: 'Dutch',
      category: 'online-vet',
      // Conservative, category-level description only. No pricing/coverage.
      blurb: 'Dutch is an online veterinary care service that connects pet owners with licensed veterinarians.',
      // TODO(affiliate): replace with the official Dutch tracking link (one place).
      url: 'https://www.dutch.com/',
      affiliate: true,
      rel: 'sponsored noopener',
      pending: true // true until the live link + Dutch-specific content are confirmed
    }
    // Future partners (Vetster, AirVet, BetterVet, Pawp, …) plug in here with
    // the SAME shape. Nothing else in the platform needs to change.
  };

  // Reused wherever any affiliate partner link appears. Verbatim, single source.
  var AFFILIATE_DISCLOSURE = 'PetsInMyCity may earn a small commission if you sign up through some partner links, at no extra cost to you. This never affects which care path we recommend.';

  function get(id) { return PARTNERS[id] || null; }
  function url(id) { var p = PARTNERS[id]; return p ? p.url : null; }
  function byCategory(cat) {
    return Object.keys(PARTNERS).map(function (k) { return PARTNERS[k]; })
      .filter(function (p) { return p.category === cat; });
  }

  global.PIMCPartners = {
    version: 1,
    get: get,
    url: url,
    byCategory: byCategory,
    all: function () { return JSON.parse(JSON.stringify(PARTNERS)); },
    disclosure: AFFILIATE_DISCLOSURE,
    // Convenience accessor used across CTAs and the Veterinary Care Engine.
    DUTCH_AFFILIATE_URL: PARTNERS.dutch.url
  };
})(typeof window !== 'undefined' ? window : this);
