# Project status

Last updated: 29 August 2026

## Project goal

Northstar is an unofficial Computer Science portfolio project that helps people choose a MacBook
without requiring them to understand chip names or benchmarks. Version 1.2 is adding shareable and
resumable recommendation decision state while retaining local deterministic recommendation
calculation against the compatible current engine and verified catalogue.

Northstar is independent and is not affiliated with, endorsed by or sponsored by Apple Inc.
Verified Apple facts remain separate from Northstar's internal suitability judgements.

## Current branch and release state

- Current branch: `feature/shareable-results-v1.2`.
- Northstar v1.1.0 is the current stable release, tagged and deployed from `main`.
- v1.2 Phase 1 state schema, serialization and validation have been reviewed, committed and pushed
  on the feature branch.
- v1.2 Phase 2 local browser persistence and explicit resume behavior are implemented locally as an
  uncommitted review candidate.
- Phase 3 shared URLs, share/copy UI and Clipboard API work have not begun.
- No v1.2 work is merged to `main`, tagged, released or deployed.

## Independent version metadata

| Concern | Version |
| --- | --- |
| Application/package | `1.2.0` development branch |
| Questionnaire schema | `3` |
| Questionnaire-state schema | `1` |
| Recommendation rules | `2.1.0` |
| Verified catalogue | Unchanged 31 July 2026 snapshot |

## v1.2 Phase 1 foundation

- Minimal sparse state containing stable question/control and option IDs only.
- State-schema versioning independent from application, questionnaire and recommendation rules.
- Separate validation for resumable `in-progress` and fully answered `complete` state.
- Explicit allowlist reconstruction without merging imported objects.
- Strict rejection of unknown, stale, hidden, incompatible, duplicate and structurally unsafe data.
- Deterministic canonical JSON with definition-ordered answer keys and multi-select values.
- A 4,096 UTF-8 byte bound on serialized input and output.
- No labels, display content, product facts or recommendation output in serialized state.
- Focused unit coverage for valid, partial, complete, hostile, round-trip and size-boundary cases.

The full internal contract and rejection policy are documented in
`docs/state-serialization.md`.

## v1.2 Phase 2 review candidate

- A dedicated browser-storage boundary using `northstar.questionnaire-state.v1`.
- Best-effort canonical auto-save after stable valid answer, navigation, completion and saved-edit
  changes, with duplicate writes avoided.
- Explicit, keyboard-operable Continue/Start again prompt rather than silent restoration.
- Validated reconstruction through questionnaire-state invariants for partial and complete sessions.
- Current-engine/current-catalogue recalculation after completed-session restoration.
- Confirmed restart clearing and cancelled restart preservation.
- Safe handling of missing, throwing, malformed, incompatible and stale storage.
- Browser/device-only privacy wording and a documented most-recent-valid-save multi-tab policy.

The full persistence, privacy, restore and failure contract is documented in
`docs/local-persistence.md`.

## v1.2 Phase 2 verification

| Check | Result |
| --- | --- |
| New Phase 2 unit tests | 21 passed, 0 failed |
| Complete `node --test` suite | 130 passed, 0 failed |
| JavaScript syntax | 34 files passed, 0 failed |
| Playwright browser suite | 15 passed, 0 failed |
| `git diff --check` | Passed |
| Protected product/source paths | Unmodified |

## v1.2 Phase 1 verification

| Check | Result |
| --- | --- |
| Focused state-contract unit tests | 42 passed, 0 failed |
| Complete `node --test` suite | 109 passed, 0 failed |
| Pre-existing v1.1 tests within the suite | 67 passed, 0 failed |
| JavaScript syntax | 32 files passed, 0 failed |
| Playwright browser regression suite | 9 passed, 0 failed |
| `git diff --check` | Passed |
| Protected product/source paths | Unmodified |

## v1.1 questionnaire baseline

- Seven core steps and at most two conditional essential-detail steps.
- Budget amount/flexibility and portability/screen controls are combined into logical screens.
- Per-use radio follow-ups are replaced by one tailored multi-select activity step.
- One multitasking question derives a concurrent-memory signal without a separate duration question.
- A final Essential requirements step replaces repeated treatment-mode questions.
- Battery, connection and ownership questions are removed from the main questionnaire.
- Immediate clearing and accessible announcement of newly irrelevant dependent answers.
- Deliberate v1 and v2 compatibility migration into questionnaire schema 3.
- Pure deterministic engine output with exact, closest, stretch-budget, budget-limited and genuine
  no-match distinctions.
- Confidence uses evaluated dimensions only and appears only when an eligible recommendation exists;
  terminal outcomes explain blocking requirements instead of showing a confidence panel.
- Compact grouped answer summaries, targeted editing and accessible top-three comparison.
- A final plain-language pass keeps technical terms only where they name real activities or verified
  product facts, moves selection guidance into associated help and places score detail in disclosures.
- Calm visible progress labels avoid repeatedly foregrounding adaptive total changes while exact step
  counts remain available to assistive technology.

## v1.1 verification baseline

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
| Full `node --test` suite | 67 passed, 0 failed |
| Legacy migration scenarios within the suite | 5 passed, 0 failed |
| Recommendation-quality scenarios within the suite | 11 passed, 0 failed |
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
- Verified product facts and capability/fit matrices are unchanged. Rules 2.1 removes ownership
  from active scoring and removes unsupported confidence caps; remaining numeric weights are unchanged.

## Remaining release work

Phase 2 must be reviewed before any commit or push. Do not begin URL adoption, copy/share controls
or any later v1.2 phase without separate approval.
