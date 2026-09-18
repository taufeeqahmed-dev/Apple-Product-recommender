# Project status

Last updated: 18 September 2026

## Project goal

Northstar is an unofficial Computer Science portfolio project that helps people choose a MacBook
without requiring them to understand chip names or benchmarks. Version 1.2 adds shareable and
resumable recommendation decision state while retaining local deterministic recommendation
calculation against the compatible current engine and verified catalogue.

Northstar is independent and is not affiliated with, endorsed by or sponsored by Apple Inc.
Verified Apple facts remain separate from Northstar's internal suitability judgements.

## Current branch and release state

- Current documentation branch: `docs/v1.2-release-finalisation`.
- Northstar v1.2.0 is the current stable production version. PR #3 introduced the main v1.2 feature
  set; PR #4 added the final production UX polish. Both are merged into `main`, deployed through
  GitHub Pages and covered by the recorded production smoke checks.
- Northstar v1.1.0 remains preserved as the previous tagged release.
- v1.2 Phases 1–5 are reviewed, committed and included in the merged production version.
- The formal v1.2.0 tag and GitHub release have not yet been created.
- This final documentation reconciliation is local and awaiting review; it has not been committed or
  pushed.

## Independent version metadata

| Concern | Version |
| --- | --- |
| Application/package | `1.2.0` production |
| Questionnaire schema | `3` |
| Questionnaire-state schema | `1` |
| URL transport | `1` |
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

## v1.2 Phase 2 foundation

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

## v1.2 release assessment

- All Phase 1–4 state, persistence, transport and share UX works together in the complete regression
  suite.
- The shared-complete browser journey now verifies current recalculation, editing, canonical local
  re-persistence/share-fragment refresh and top-three comparison.
- Local Lighthouse achieved 93/100/100/100 mobile and 94/100/100/100 desktop in
  Performance/Accessibility/Best Practices/SEO order.
- Production-base URL measurements range from 235 characters for an initial partial link to 1,234
  characters for the broadest current valid complete link.
- Local 320 px reflow review found no horizontal overflow; Safari, physical iPhone, VoiceOver,
  representative Windows screen-reader and production Lighthouse checks remain pending.
- Production smoke testing passed for homepage loading, questionnaire completion, partial-progress
  reload and Continue, recommendation results, Share results / Copy link, opening a shared link in a
  fresh browser context, malformed-link recovery, the 390×844 layout and keyboard-only navigation.
- The final post-PR #4 production smoke check confirmed **Keep my saved questionnaire** on the
  deployed shared-questionnaire panel and placed **Close sharing** beneath the **Share this result**
  heading at mobile width as intended.
- README, architecture, testing, portfolio, project status and the v1.2 release checklist are being
  reconciled with the deployed production status on the documentation branch.
- No critical or high product defect was found. Phase 5 fixed documentation drift; PR #4 then made
  the reviewed wording and narrow-layout UX polish without changing v1.2 state or recommendation
  behaviour.

## v1.2 release verification

| Check | Result |
| --- | --- |
| Complete `node --test` suite | 167 passed, 0 failed |
| JavaScript syntax | 39 files passed, 0 failed |
| Playwright browser suite | 36 passed, 0 failed |
| Local Lighthouse mobile | 93 / 100 / 100 / 100 |
| Local Lighthouse desktop | 94 / 100 / 100 / 100 |
| `git diff --check` | Passed |
| Protected product/source paths | Unmodified |

The current architecture is documented in `docs/architecture.md`, complete verification evidence in
`docs/testing.md`, and remaining manual and formal-release gates in `docs/release-v1.2.md`.

## v1.2 Phase 4 foundation

- Complete-results-only **Share results** action over the reviewed Phase 3 exporter.
- Clipboard API copy with visible and politely announced success.
- Labelled readonly manual-copy fallback for missing, throwing or rejected Clipboard APIs.
- Concise privacy wording that identifies recoverable choices, excludes browser metadata/accounts
  and explains current-engine/current-catalogue recalculation.
- Visible and announced complete-import feedback plus clearer partial-import and invalid-link recovery
  wording.
- Keyboard focus management, inline non-modal disclosure and responsive long-URL containment.
- No Web Share API dependency and no state-schema, transport or recommendation changes.

The full user-interface, privacy, accessibility and fallback behavior is documented in
`docs/share-ux.md`.

## v1.2 Phase 4 verification

| Check | Result |
| --- | --- |
| New Phase 4 unit tests | 12 passed, 0 failed |
| Complete `node --test` suite | 167 passed, 0 failed |
| JavaScript syntax | 39 files passed, 0 failed |
| Playwright browser suite | 36 passed, 0 failed |
| New Phase 4 browser cases | 2 cases × 3 viewport projects = 6 passed |
| `git diff --check` | Passed |
| Protected product/source paths | Unmodified |

## v1.2 Phase 3 foundation

- Versioned dependency-free `#northstar=v1.<base64url>` URL transport.
- Independent 5,462-character encoded and 4,096-byte decoded bounds.
- Strict transport, UTF-8 and Phase 1 state validation before reconstruction.
- Valid shared state precedence without startup access to local questionnaire storage.
- Explicit shared-state adoption before canonical Phase 2 persistence can replace local progress.
- Accessible recovery for malformed, incompatible, oversized, stale or tampered links.
- Canonical `replaceState` URL hygiene without additional history entries.
- Partial adaptive resume and complete current-engine/current-catalogue recalculation.
- Root and GitHub Pages repository-subpath compatibility.

The full transport, precedence, privacy and failure contract is documented in
`docs/shareable-urls.md`.

## v1.2 Phase 3 verification

| Check | Result |
| --- | --- |
| New Phase 3 unit tests | 25 passed, 0 failed |
| Complete `node --test` suite | 155 passed, 0 failed |
| JavaScript syntax | 37 files passed, 0 failed |
| Playwright browser suite | 30 passed, 0 failed |
| `git diff --check` | Passed |
| Protected product/source paths | Unmodified |

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

Lighthouse category order is Performance, Accessibility, Best Practices and SEO. These historical
v1.1 audits used Lighthouse 13.4.1 with Microsoft Edge 151.0.4129.21 against the verified local
candidate; this report does not claim a production Lighthouse result for v1.1.

## Protected boundaries confirmed

- `js/products.js` is unchanged.
- `js/product-schema.js` is unchanged.
- `sources/` is unchanged and remains read-only.
- Verified Apple facts are unchanged.
- Production code has no framework or runtime dependency.
- Verified product facts and capability/fit matrices are unchanged. Rules 2.1 removes ownership
  from active scoring and removes unsupported confidence caps; remaining numeric weights are unchanged.

## Remaining release work

The release-finalisation documentation diff must be reviewed before any commit or push. Remaining
manual device, assistive-technology, browser and production Lighthouse checks stay explicitly open in
`docs/release-v1.2.md`. Creating the `v1.2.0` tag and GitHub release requires separate approval. Do
not begin v1.3 work.
