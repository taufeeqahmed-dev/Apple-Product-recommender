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
- A focused post-Phase-5 usability revision is implemented locally and awaits review. It shortens
  the questionnaire before release work resumes and is not committed, pushed, merged, tagged or deployed.
- Optional Phase 6 shareable results have not begun.

## Independent version metadata

| Concern | Version |
| --- | --- |
| Application/package | `1.1.0` |
| Questionnaire schema | `3` |
| Recommendation rules | `2.1.0` |
| Verified catalogue | Unchanged 31 July 2026 snapshot |

## Focused questionnaire usability revision

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

The focused usability revision must be reviewed before any commit or push. Release preparation is
paused; earlier local Lighthouse measurements predate this revision and must not be treated as its
release evidence. Safari, VoiceOver, representative Windows screen-reader and physical-device checks
remain manual environment-dependent verification.

No Phase 6 work is authorized before the core v1.1 release is complete, stable and separately
reviewed.
