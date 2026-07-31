# Repository guidance

This repository contains Northstar, an unofficial student portfolio project that helps people choose a MacBook based on their needs.

## Current scope and stage

- Version one covers MacBook recommendations only.
- Stages 1, 2 and 3 are complete, verified, committed and pushed.
- The working implementation includes verified product data, the recommendation engine, accessible results and automated tests.
- Stage 4 has not started and requires explicit user approval.
- Read `PROJECT_STATUS.md` before making changes.

## Architecture boundaries

- Keep verified Apple facts in `js/products.js` and schema validation in `js/product-schema.js`.
- Keep hard thresholds and project suitability matrices in `js/recommendation-rules.js`.
- Keep the recommendation engine pure and deterministic in `js/recommendation-engine.js`.
- Keep result rendering in `js/results.js` and questionnaire state private to `js/questionnaire-state.js`.
- Validate the entire catalogue before calculating recommendations.
- Treat all suitability bands, fit scores, reasons and compromises as independent project judgements, never Apple claims.

## Product-data rules

- Use only official Apple UK product, buying, technical-specification and relevant support pages.
- Verify each exact configuration and price; never apply a family starting price to multiple models.
- Record stable IDs, `GB`/`GBP`, source URLs, availability and verification dates.
- Use `null` for genuinely unavailable information and do not infer missing facts.
- Prices are dated snapshots that may later change.
- Do not add configurable upgrades outside an explicitly approved dataset.

## Working rules

- Use semantic HTML, responsive CSS and JavaScript modules without external frameworks or libraries.
- Preserve keyboard access, visible focus states, readable contrast and reduced-motion support.
- Maintain an original visual identity; do not copy Apple's website or imply affiliation with Apple.
- Treat `sources/` as read-only local reference material. Do not edit, rename, move or delete its contents.
- Keep `.agents/`, `.codex/` and `sources/` out of version control.
- Run the dependency-free test suite with `node --test` and perform proportionate browser/accessibility checks.
- Keep changes within the currently approved development stage and update documentation when behaviour or scope changes.
