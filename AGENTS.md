# Repository guidance

This repository contains Northstar, an unofficial student portfolio project that helps people
choose a MacBook based on their needs.

## Current scope and stage

- Version 1.0.0 is complete, tagged and deployed from `main`.
- Version 1.1 is being prepared on `feature/adaptive-questionnaire-v1.1`.
- v1.1 Phases 1–4 are reviewed, committed and pushed.
- A focused schema-3 questionnaire simplification is a local review candidate after Phase 5. Do not
  describe it as committed, merged, released or deployed, and do not resume release preparation yet.
- Optional Phase 6 shareable results are not approved to begin.
- Do not modify the project beyond an explicitly approved phase.
- Read `PROJECT_STATUS.md` before making changes.

## Architecture boundaries

- Keep verified Apple facts in `js/products.js` and schema validation in `js/product-schema.js`.
- Keep hard thresholds and project suitability matrices in `js/recommendation-rules.js`.
- Keep the recommendation engine pure and deterministic in `js/recommendation-engine.js`.
- Keep result rendering in `js/results.js` and questionnaire state private to
  `js/questionnaire-state.js`.
- Validate the entire catalogue before calculating recommendations.
- Reconcile hidden answers before validation or scoring; hidden answers must never affect results.
- Clear only dependent answers that become irrelevant and announce the change accessibly.
- Keep the questionnaire to seven core and at most nine total steps unless a new scope is approved.
- Keep visible progress stage-based; retain exact adaptive step counts for assistive technology without
  repeatedly announcing total changes.
- Only explicit Essential requirements may activate workload, exact-screen, weight or verified
  external-display hard filters.
- Do not display recommendation confidence when no eligible recommendation exists; explain the
  blocking hard requirements instead.
- Treat all suitability bands, fit scores, confidence, reasons and compromises as independent
  project judgements, never Apple claims.

## Product-data rules

- Use only official Apple UK product, buying, technical-specification and relevant support pages.
- Verify each exact configuration and price; never apply a family starting price to multiple models.
- Record stable IDs, `GB`/`GBP`, source URLs, availability and verification dates.
- Use `null` for genuinely unavailable information and do not infer missing facts.
- Prices are dated snapshots that may later change.
- Do not add configurable upgrades outside an explicitly approved dataset.
- Battery, port and connection capabilities may not be inferred.

## Working rules

- Use semantic HTML, responsive CSS and JavaScript modules without production frameworks or
  libraries.
- Playwright is development-only and must not be shipped in the Pages artifact.
- Preserve keyboard access, visible focus states, readable contrast and reduced-motion support.
- Maintain an original visual identity; do not copy Apple's website or imply affiliation with Apple.
- Treat `sources/` as read-only local reference material. Do not edit, rename, move or delete it.
- Keep `.agents/`, `.codex/` and `sources/` out of version control.
- Run `node --test`, `node scripts/check-javascript-syntax.mjs` and the relevant Playwright projects
  for approved changes.
- Document local versus production measurements precisely; automation does not replace physical
  device or assistive-technology testing.
- Do not commit, push, merge, tag, deploy or begin another phase without user approval.
