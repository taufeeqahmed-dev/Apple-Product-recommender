# Project status

Last updated: 2 August 2026

## Project goal

Northstar is an unofficial Computer Science portfolio project that helps people choose a MacBook without requiring them to understand chip names or benchmarks. It asks eight plain-language questions, checks hard needs against a small verified dataset and explains up to three deterministic recommendations.

Northstar is independent and is not affiliated with, endorsed by or sponsored by Apple Inc. Verified product facts are kept separate from Northstar's internal suitability judgements.

## Current stage

- Stages 1, 2, 3 and 4: complete, reviewed and merged into `main`.
- The GitHub Pages build and deployment succeeded.
- The public site is live at
  `https://taufeeqahmed-dev.github.io/apple-product-recommender/`.
- No further project changes are approved without a newly agreed scope.

## Completed Stage 4

- Added recommendation-quality scenarios and monotonic hard-filter tests.
- Identified a reproducible right-sizing defect for flexible-budget light/moderate everyday use,
  added a failing regression test, and corrected the Northstar workload matrix in rules `1.1.0`.
- Preserved an explicit performance-first path to maximum capability.
- Improved recommendation reasons so ranking preferences are not hidden by hard-filter confirmations.
- Added distinguishable result/link names, programmatic invalid states, Escape cancellation and
  JavaScript-failure guidance.
- Removed internal stage/future wording and unused placeholder CSS.
- Added release metadata, crawler files, a favicon and a GitHub Pages workflow that triggers only
  from `main` or manual dispatch.
- Added algorithm, testing and portfolio documentation plus desktop, mobile, results and social
  screenshots.
- All 22 Node tests and all 13 JavaScript syntax checks pass.
- Post-fix local Lighthouse scored 99/100/100/100 on mobile and 100/100/100/100 on desktop for
  Performance/Accessibility/Best Practices/SEO.
- Safari, VoiceOver, physical-device and production Lighthouse checks are optional post-launch
  verification rather than release gates.
- `js/products.js` and `sources/` remain unchanged.
- The reviewed changes were merged into `main`, and the GitHub Pages build and deployment
  completed successfully.

## Completed Stage 3 work

### Verified product data

- Added 10 exact MacBook Neo, MacBook Air and MacBook Pro configurations.
- Re-checked every exact buying/configuration page before recording its price and hardware.
- Recorded region `GB`, currency `GBP`, availability, exact price in pence and verification date `2026-07-31` on every record.
- Recorded exact model, marketed/display size, chip, CPU/GPU cores, memory, storage, weight, keyboard feature, external-display support and display finish where Apple's exact configuration label supplies it.
- Used `null` where a schema field cannot be verified; tax treatment and the unlabelled Neo/Air display-finish fields remain `null` rather than being inferred.
- Added official Apple UK product, buying, technical-specification and relevant support references with the fields each source supports.
- Corrected the final Air snapshot during per-record verification: the 13-inch M5 10-core CPU/10-core GPU configuration at £1,399 is 16GB/512GB, not 16GB/1TB. Apple's exact 16GB/1TB page was £1,599 on the verification date and is not included in the approved base dataset.
- Kept configurable upgrades out of the catalogue.

### Architecture

- `js/product-schema.js` validates catalogue structure, stable IDs, dates, official source URLs, product facts and duplicate IDs, then deep-freezes accepted data.
- `js/products.js` contains verified Apple facts only; no scoring values are stored with product records.
- `js/recommendation-rules.js` contains hard thresholds, suitability bands, scoring matrices and weights, all explicitly labelled as project judgements.
- `js/recommendation-engine.js` is pure and deterministic. It validates the full catalogue and answer IDs, applies hard filters, scores only eligible products and returns structured results.
- `js/results.js` renders accessible results separately from data and engine logic.
- `js/app.js` connects completed questionnaire answers to the engine and renderer.

### Hard eligibility rules

The engine rejects an invalid catalogue as a whole and rejects invalid questionnaire IDs without calculating recommendations. Per-product hard filters then require:

- verified availability;
- the `GB`/`GBP` market;
- complete recommendation-critical price and facts;
- price at or below a selected finite budget boundary;
- storage at or above the selected minimum;
- sufficient external-display support while the built-in display remains active; and
- a project capability band at or above the workload minimum.

No near match is substituted when all products fail.

### Scoring and tie-breaking

Eligible products can score a maximum of 100 points:

- workload: 30;
- primary uses: 25;
- portability versus performance: 20;
- screen size: 15; and
- ownership period: 10.

One or two primary uses are supported and averaged. Optional “no preference”/“unsure” scoring components are omitted and the score is normalized over the remaining applicable weight.

Ties are resolved deterministically by score basis points, workload component, primary-use component, balance component, fewer compromises, lower price and finally lexicographic stable product ID. Equal score groups are also returned explicitly in diagnostics.

### Structured results and accessible interface

- Returns `ok`, `no-match`, `invalid-input` or `invalid-catalog` status.
- Returns matches with rank, score, components, passed filters, reasons and compromises.
- Returns all exclusions with failed filters, explicit tie groups and diagnostics with counts and blocker totals.
- Shows up to three semantic recommendation articles with dated prices, verified facts, reasons, compromises and exact Apple UK configuration links.
- Labels fit scores and suitability explanations as independent Northstar judgements, not Apple claims.
- Places focus on the results heading (`tabindex="-1"`) and announces result availability through a polite status region.
- Shows explicit no-match and invalid-data messages rather than silently relaxing requirements.

## Existing Stage 1 and Stage 2 behaviour retained

- Original Northstar visual identity, responsive navigation, disclaimers and reduced-motion support.
- Eight-step MacBook-only questionnaire using native radios, checkboxes, selects and form submission.
- Numeric progress element plus visible “Step X of 8” text.
- Required-answer `role="alert"` messages associated through `aria-describedby`.
- Maximum-two primary uses, Back/Continue, preserved answers, controlled state and Restart confirm/cancel.
- Programmatic focus on `tabindex="-1"` step headings and the first invalid control.

## Automated verification

`package.json` provides the required dependency-free script:

```text
"test": "node --test"
```

Sixteen Node tests pass. They cover:

- catalogue/schema validation and immutability;
- every exact product ID, price, chip, CPU, GPU, memory and storage value;
- conservative display-finish IDs, including `null` when Apple does not label one;
- dated official sources on every record;
- exact-budget inclusion and one-penny-over exclusion;
- no-match behaviour and blocker diagnostics;
- score ties, price/ID tie-breaking and deterministic ordering;
- invalid answer IDs;
- one and two primary uses plus invalid primary-use counts/IDs;
- null critical facts and structurally missing fields;
- duplicate product IDs;
- input/catalogue non-mutation;
- the 100-point ceiling and reachable maximum; and
- the structured output contract.

The suite passes with the default `node --test` command.

All JavaScript files also pass `node --check`.

## Browser verification

The complete questionnaire-to-results journey was tested through the local preview at `http://127.0.0.1:4173/`. Verification covered:

- missing-answer alert announcement, association and invalid-control focus;
- selection of one/two uses and rejection/announcement of a third;
- Back/Continue and preserved answers;
- numeric progress values through all eight steps;
- completion and focus placement on the results heading;
- top-three, one-match and no-match rendering;
- reasons, compromises, dated prices and independent-judgement wording;
- Restart cancellation/focus return and Restart confirmation/full reset;
- native form controls, semantic articles, no positive `tabindex` values and visible focus styling;
- desktop 1440×900, tablet 768×1024 and mobile 390×844 layouts;
- one-column responsive result cards at tablet/mobile widths;
- no horizontal overflow at any tested width; and
- no browser console warnings or errors.

## Current limitations

- Product data and prices are snapshots verified on 31 July 2026 and may change.
- Only 10 approved exact configurations are included; no configurable upgrades are compared.
- Questionnaire state is memory-only and is cleared by reload.
- No-match handling deliberately does not relax hard requirements or calculate near matches.
- There is no backend, persistent storage, analytics or account system.
- The production site is live on GitHub Pages at
  `https://taufeeqahmed-dev.github.io/apple-product-recommender/`.
- Additional Safari, VoiceOver, physical-device, full manual keyboard, representative screen-reader
  and production Lighthouse checks are optional post-launch verification.

## Version-control state

Stages 1–4 are complete. Stage 4 was reviewed, merged into `main`, built and deployed successfully
through GitHub Pages. The public site is live at
`https://taufeeqahmed-dev.github.io/apple-product-recommender/`. The read-only `sources/` directory
and verified product catalogue were not modified. No further changes should be made without a newly
approved scope.
