# Project status

Last updated: 7 August 2026

## Project goal

Northstar is an unofficial Computer Science portfolio project that helps people choose a MacBook
without requiring them to understand chip names or benchmarks. Version 1.1 asks an adaptive set of
plain-language questions, distinguishes preferences from explicit requirements and explains up to
three deterministic recommendations, their compromises and the confidence in the shortlist.

Northstar is independent and is not affiliated with, endorsed by or sponsored by Apple Inc.
Verified Apple facts remain separate from Northstar's internal suitability judgements.

## Current branch and release state

- Current branch: `feature/adaptive-questionnaire-v1.1`.
- v1.0.0 remains tagged, released and deployed from the unchanged v1.0 main history.
- v1.1 Phases 1–4 were reviewed, committed and pushed.
- Phase 5 testing, release-readiness and documentation changes are implemented locally and await
  review. They are not committed, pushed, merged, tagged or deployed.
- Optional Phase 6 shareable results have not begun.

## Independent version metadata

| Concern | Version |
| --- | --- |
| Application/package | `1.1.0` |
| Questionnaire schema | `2` |
| Recommendation rules | `2.0.0` |
| Verified catalogue | Unchanged 31 July 2026 snapshot |

## v1.1 implementation complete through Phase 4

- Declarative adaptive questionnaire with stable IDs and explicit dependencies.
- Workload follow-ups for study/productivity, software development, cybersecurity/VMs, photography,
  video, music production, 3D/engineering and sustained work.
- Multitasking, flexible/stretch budgets and explicit preference-versus-requirement choices.
- More precise portability, weight, screen, storage and verified external-display requirements.
- Immediate clearing and accessible announcement of newly irrelevant dependent answers.
- Compatibility helpers and deliberately migrated v1.0 fixtures.
- Pure deterministic engine output with exact, closest, stretch-budget, budget-limited and genuine
  no-match distinctions.
- Rich reasons, compromises, lower-rank explanations and documented confidence.
- Disclosures for collected battery/connection answers that cannot be ranked safely.
- Grouped answer review, individual editing and accessible top-three comparison.

## Phase 5 review candidate

- Added exact-version development-only Playwright testing; production remains framework-free.
- Added nine browser tests across desktop, tablet and mobile target viewports.
- Added a dependency-free static preview server and cross-platform JavaScript syntax runner.
- Updated the Pages workflow to gate deployment on unit, syntax and browser tests.
- Re-ran all unit, migration, engine and recommendation-quality scenarios.
- Recorded local Lighthouse mobile and desktop results and remaining manual checks.
- Updated the algorithm, testing, README, repository guidance, release checklist and portfolio case
  study for v1.1.

## Verification summary

| Check | Result |
| --- | --- |
| Full `node --test` suite | 59 passed, 0 failed |
| v1.0 migration scenarios within the suite | 4 passed, 0 failed |
| Recommendation-quality scenarios within the suite | 9 passed, 0 failed |
| JavaScript syntax | 30 files passed, 0 failed |
| Playwright browser suite | 9 passed, 0 failed |
| Local Lighthouse mobile | 100 / 100 / 100 / 100 |
| Local Lighthouse desktop | 100 / 100 / 100 / 100 |

Lighthouse category order is Performance, Accessibility, Best Practices and SEO. Accepted audits
used Lighthouse 13.4.1 with Microsoft Edge 151.0.4129.21 against the verified local review candidate.
Production Lighthouse is intentionally unclaimed until a reviewed deployment exists.

## Protected boundaries confirmed

- `js/products.js` is unchanged.
- `js/product-schema.js` is unchanged.
- `sources/` is unchanged and remains read-only.
- Verified Apple facts are unchanged.
- Production code has no framework or runtime dependency.
- Recommendation weights and rules are unchanged during Phase 5.

## Remaining release work

Phase 5 must be reviewed before any commit or push. After approval, the release checklist still
requires the approved commit/merge/tag/deployment sequence, production smoke tests and production
Lighthouse. Safari, VoiceOver, representative Windows screen-reader and physical-device checks are
manual environment-dependent verification rather than claims made from emulation.

No Phase 6 work is authorized before the core v1.1 release is complete, stable and separately
reviewed.
