# Northstar testing and verification report

## v1.2 Phase 5 release-candidate verification

Date: 29 August 2026

Branch: `feature/shareable-results-v1.2`

Status: Phase 5 verified local review candidate; uncommitted and not pushed, merged, tagged,
released or deployed

### Automated results

| Check | Result |
| --- | --- |
| Complete `pnpm test` suite | 167 passed, 0 failed, 0 skipped, 0 cancelled |
| `pnpm check:syntax` | 39 JavaScript files passed, 0 failed |
| Playwright desktop 1440×900 | 12 passed |
| Playwright tablet 768×1024 | 12 passed |
| Playwright mobile 390×844 | 12 passed |
| Complete Playwright suite | 36 passed, 0 failed |
| `git diff --check` | Passed |
| Protected `js/products.js` and `sources/` diff | Empty |

The 167-test suite covers the v1.1 catalogue, schema, migration, recommendation-engine and quality
baseline plus v1.2 canonical serialization, separate partial/complete validation, size boundaries,
dangerous object shapes, malformed/tampered state, persistence failures, trusted restoration,
versioned URL transport, startup precedence, deterministic sharing and Clipboard API outcomes.

### Integrated browser journeys

The same 12 browser cases run in every viewport project. Together they verify:

- a fresh adaptive questionnaire, required errors, dependency clearing and no-match result;
- completed results, Share results, keyboard-only Copy link and polite success status;
- missing/rejected clipboard behavior through a labelled, focused and selected readonly fallback;
- partial save → reload → Continue → finish with restored answers → reload → Start again → no later
  resume;
- complete save → reload → current recommendation recalculation;
- confirmed Restart clearing and cancelled Restart preservation;
- partial share import and continuation at the validated adaptive step;
- complete share import, recalculation, imported-state notice, answer editing, canonical local
  persistence/share-fragment refresh and top-three comparison after the edit;
- valid URL precedence over different local progress with explicit adoption wording;
- invalid-link recovery without payload echo or local-state loss; and
- import/export at `/apple-product-recommender/` as well as the local root.

Result cards, answer review, comparison, resume/adoption/recovery panels, sharing and long-URL fallback
remain within the page at 1440×900, 768×1024 and 390×844. The automated Copy link target is at
least 44 px high; the 320×800 reflow review measured both sharing controls at 46–53 px high. The
comparison table, rather than the page, owns horizontal scrolling at tablet/mobile widths.
No console errors or uncaught page errors were recorded.

### Keyboard, focus and semantics

Automated flows verify native controls and deliberate focus for validation errors, adaptive steps,
Continue, Start again, result headings, answer editing, comparison open/close/Escape, restart
confirmation/cancellation, shared adoption/recovery, Share results, Copy link, fallback selection and
Close sharing. Named regions, headings, fieldsets/legends, labels/help, table headers and polite live
regions are asserted where applicable. No custom focus trap is introduced.

A local rendered review also inspected the imported-result share panel at the normal browser size and
at a 320×800 viewport, used as a practical 400% reflow equivalent for a 1280 px layout. The 320 px
state had no page-level horizontal overflow; the share panel remained inside the viewport and its
controls measured approximately 46–53 px high. Reduced-motion rules and visible-focus styling remain
present. This is not a substitute for browser zoom with assistive technology.

### Lighthouse

Accepted local reports ran against `http://127.0.0.1:4180/` with Lighthouse 13.4.1 and installed
Microsoft Edge 153.0.4234.8:

| Run | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| v1.2 mobile | 93 | 100 | 100 | 100 |
| v1.2 desktop | 94 | 100 | 100 | 100 |

Both JSON reports were written outside the repository and verified to contain the requested/final
URL, timestamps, Lighthouse version, Edge user agent, category data and scores. After report
generation, the CLI returned the same Windows temporary-profile cleanup `EPERM` documented for the
earlier v1.1 audits. The cleanup warning does not change the completed audit evidence. Production
Lighthouse is unclaimed until deployment.

### URL-length measurements

Lengths use the production repository-subpath base URL:

| Valid state fixture | Total URL | Encoded payload | Canonical state |
| --- | ---: | ---: | ---: |
| Empty initial partial | 235 characters | 160 characters | 120 UTF-8 bytes |
| Realistic adaptive partial | 463 characters | 388 characters | 291 UTF-8 bytes |
| Typical complete | 625 characters | 550 characters | 412 UTF-8 bytes |
| Broadest current valid complete | 1,234 characters | 1,159 characters | 869 UTF-8 bytes |

The encoded bound remains 5,462 payload characters and the decoded bound remains 4,096 UTF-8 bytes.
The current valid fixtures leave substantial headroom, so Phase 5 adds no compression or transport
change.

### Privacy and hostile-input evidence

Local-state tests confirm the fixed namespaced key, canonical decision-state-only writes, no
recommendation/product/display data, unavailable/throwing storage handling and corruption cleanup.
URL tests reject malformed base64url and UTF-8, oversized payloads, unsupported versions, unknown or
stale IDs, duplicates, impossible dependencies, prototype-related keys, arbitrary HTML and injected
recommendation/product fields. Browser tests confirm rejected link content is not echoed and valid
local state remains untouched.

Visible copy and documentation state that local progress stays in the current browser/device, has no
account/cloud sync and is not secure storage. Share copy states that anyone with the link can recover
the encoded choices; encoding is not encryption. Accounts, browser metadata, recommendations,
scores, confidence and product facts are absent, and recommendations are recalculated after restore.

### Manual checks still pending

The following were not completed locally and remain explicit release gates or documented
limitations:

- Safari on a target iPhone in portrait and landscape;
- physical iPhone touch targets, Dynamic Type/system text sizing and long-URL fallback;
- VoiceOver on iPhone and macOS/Safari;
- Narrator or another representative Windows screen reader;
- a complete physical-keyboard/device journey including manual copy and comparison scrolling;
- current Chrome and Firefox smoke tests where available;
- JavaScript-disabled and module-load-failure behavior; and
- deployed GitHub Pages persistence, sharing, subpath, clipboard/fallback and production Lighthouse.

Automation, viewport emulation, local Edge and Lighthouse do not establish these results.

## Historical v1.1 Phase 5 report

Date: 7 August 2026

Branch: `feature/adaptive-questionnaire-v1.1`

Status: focused questionnaire-simplification review candidate; not committed, pushed, merged,
tagged or deployed; release preparation paused

## Acceptance targets

- Preserve all unit, catalogue, migration, engine and recommendation-quality coverage.
- Add repeatable browser tests without adding a production dependency or framework.
- Exercise 1440×900 desktop, 768×1024 tablet and 390×844 mobile viewports.
- Preserve keyboard operation, deliberate focus, semantic structure and responsive containment.
- Reach at least 90 Performance and 95 Accessibility, Best Practices and SEO in valid local
  Lighthouse runs.
- Keep `js/products.js`, verified Apple facts and `sources/` unchanged.
- Prove every schema-3 journey contains seven to nine steps and unsupported legacy answers cannot
  affect ranking or confidence.

Automation does not substitute for physical-device and assistive-technology testing. Those checks
remain explicit rather than being marked complete from emulation.

## Test environment

| Tool | Version/use |
| --- | --- |
| Operating system | Windows |
| Node.js | 24.14.0 |
| pnpm | 11.16.0 |
| Playwright Test | 1.62.0, development-only |
| Local browser | Microsoft Edge 151.0.4129.21 via Playwright Chromium API |
| Lighthouse | 13.4.1 using the same installed Edge executable |

GitHub Actions uses Node 24, frozen pnpm dependencies and Playwright Chromium installed in the CI
job. The production Pages artifact still contains only static site files.

## Automated verification

| Check | Result |
| --- | --- |
| Full `node --test` suite | 67 passed, 0 failed, 0 skipped, 0 cancelled |
| v1/v2 compatibility and migration tests within the suite | 5 passed, 0 failed |
| Recommendation-quality tests within the suite | 11 passed, 0 failed |
| JavaScript `node --check` scan | 30 files passed, 0 failed |
| Playwright browser suite | 9 passed, 0 failed |
| Protected product/schema paths | Unmodified |
| Read-only `sources/` directory | Unmodified |

The 67-test suite covers:

- exact product IDs, dated prices, facts, official sources, schema validation and immutability;
- independent application, questionnaire-schema and rules versions;
- declarative visibility, reconciliation, hidden-answer rejection and adaptive state;
- deliberate migration of v1 fixtures and the former schema-2 state, including dropped concepts;
- seven core steps, nine-step maximum and tailored one/two-use activity options;
- granular activity and essential-detail dependency clearing;
- strict/flexible/stretch budget boundaries and budget-limited outcomes;
- essentials-only workload, memory, weight, screen and verified-display filtering;
- removal and non-influence of legacy battery, connection and ownership answers;
- deterministic ranking, ties, classifications, confidence and explanations;
- representative exact, closest, stretch, budget-limited and genuine no-match cases; and
- right-sized university, programming, cybersecurity/virtual-machine, photo/video and demanding
  development scenarios, plus monotonic hard-requirement behavior.

## Playwright browser coverage

The Playwright configuration starts the dependency-free local static server, uses one isolated page
per test and runs the same three tests in every viewport project.

| Project | Viewport | Tests | Result |
| --- | ---: | ---: | --- |
| Desktop | 1440×900 | 3 | Passed |
| Tablet | 768×1024 | 3 | Passed |
| Mobile | 390×844 | 3 | Passed |
| **Total** | — | **9** | **9 passed, 0 failed** |

### Streamlined branching and no-match test

- Initial “Getting to know your needs” state with an associated `Step 1 of 7` accessible detail.
- Required-answer alert, `aria-invalid` behavior and focus on the first invalid radio.
- One tailored activity step with programming/cybersecurity shared options shown once.
- Back navigation and preserved multi-select activity answers.
- Removing study clears only its obsolete activity while preserving programming selections.
- Calm stage labels with exact seven-to-nine-step values retained for assistive technology.
- One contextual message after leaving Essentials without repeatedly announcing changing totals.
- A genuine conflicting weight/display path explains its blockers and renders no confidence panel.
- No console or uncaught page errors.

### Results editing test

- Completion focus on the results heading.
- Grouped primary-use editing and heading focus.
- Clearing/announcing a newly irrelevant activity selection.
- Required activity completion after an edited use invalidates the previous activity.
- Compact refreshed answer summaries without stale state.
- Storage editing and essential maximum-weight addition/removal.
- Dependent weight detail clearing when Essentials returns to “None”.
- No console or uncaught page errors.

### Results and comparison test

- High/Moderate/Low threshold documentation for eligible rankings.
- Exact, closest and stretch-budget classification explanations.
- A visually dominant first recommendation with responsive single-column reflow.
- Confidence and classification diagnostics inside a closed-by-default native disclosure.
- Per-product score and ranking detail inside native closed-by-default disclosures.
- Three semantic recommendation articles and lower-rank explanations.
- Keyboard-only Tab/Enter opening, Escape closing and close-button operation.
- Focus on dialog title when opened and comparison trigger when closed.
- Named scrollable comparison region, four column headers and correct row-group scope.
- Horizontal table scrolling at tablet/mobile widths and containment at desktop width.
- Dialog within the viewport and no page-level horizontal overflow in all projects.
- No console or uncaught page errors.

## Lighthouse

Accepted audits ran against the verified local Phase 5 candidate at
`http://127.0.0.1:4180/`. Before each accepted audit, the response was confirmed as HTTP 200 with
Northstar's title, meta description and `<main>` landmark. Reports were saved outside the repository.

| Run | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Local v1.1 mobile | 100 | 100 | 100 | 100 |
| Local v1.1 desktop | 100 | 100 | 100 | 100 |
| Deployed v1.1 mobile | Pending reviewed deployment |
| Deployed v1.1 desktop | Pending reviewed deployment |

Lighthouse wrote valid JSON reports, then its Windows browser launcher returned a temporary-profile
cleanup `EPERM` while trying to remove its already-used temporary directory. The same known cleanup
behavior occurred after both accepted reports and does not change their URL, timestamps, audit data
or category scores.

An earlier report on port 4174 was rejected because that port was already occupied by an unrelated
directory-listing server. It is not part of the results above.

Accepted report locations outside the repository:

- `northstar-v1.1-lighthouse-mobile.json`
- `northstar-v1.1-lighthouse-desktop.json`

Production scores are intentionally unclaimed until the reviewed branch is merged and Pages deploys.
These local Lighthouse results predate the schema-3 simplification and are retained only as prior
Phase 5 evidence. Lighthouse has not yet been rerun for this focused revision because release
preparation is paused.

## Accessibility review

Automated and rendered checks confirm:

- one main landmark, logical headings, fieldsets, legends and native controls;
- associated help/error text and polite adaptive/result status regions;
- plain-language control labels with selection rules and requirement clarifications associated through
  `aria-describedby`;
- calm visible progress stages with accurate seven-to-nine-step values exposed to assistive technology;
- native grouped checkboxes for tailored activities and Essential requirements;
- one contextual essential-detail announcement after leaving Essentials rather than repeated total-change announcements;
- deliberate focus on questions, invalid controls, results and dialog title;
- focus restoration after comparison closes;
- no positive `tabindex` values;
- keyboard-operable dialog and horizontally scrollable comparison region;
- verified facts separated from Northstar assessments;
- evaluated-evidence confidence and classifications behind a secondary disclosure for eligible results;
- no confidence panel for terminal outcomes, which explain blocking requirements instead;
- responsive containment and no page-level horizontal overflow; and
- reduced-motion and visible-focus CSS retained.

## Manual verification still required

These checks require hardware, browsers or assistive technology not genuinely represented by the
automated environment:

- Safari on the target iPhone in portrait and landscape.
- Dynamic Type/system text sizing and touch-target behavior on a physical phone.
- VoiceOver on iPhone through branching, validation, edits, comparison and restart.
- VoiceOver on macOS/Safari where available.
- Narrator or another representative Windows screen reader through the same flow.
- A complete physical-keyboard journey including Shift+Tab, Escape and horizontal comparison scroll.
- Current Chrome and Firefox smoke tests where installed.
- JavaScript-disabled and module-load-failure fallback in a user-controlled browser.
- Deployed v1.1 smoke tests, internal asset paths and production Lighthouse after approval/merge.

Record browser/device versions, date, result and any accepted limitation in
`docs/release-v1.1.md` before marking the corresponding release item complete.

## Known limitations

- Playwright viewport projects are emulations, not physical devices.
- Local Edge coverage does not establish Safari/WebKit or screen-reader behavior.
- Lighthouse audits the initial page state, while interactive accessibility is covered separately by
  Playwright and still requires representative assistive-technology checks.
- Product facts/prices remain a dated snapshot and were not re-verified in Phase 5.
- The historical v1.1 Phase 5 report predates v1.2 sharing; current coverage is recorded in the
  addenda below.

## Focused revision conclusion

All updated unit, syntax and browser checks available in this environment pass. Verified product
facts, product schema and suitability matrices remain unchanged. Questionnaire schema 3 and rules
2.1 are deliberate behavior changes described in `docs/algorithm.md`. Release preparation remains
paused, and the revision must be reviewed before any commit or push.

## v1.2 Phase 2 verification addendum

Date: 29 August 2026

Branch: `feature/shareable-results-v1.2`

Status: reviewed, committed and pushed on the v1.2 feature branch; not merged, tagged, released or
deployed

| Check | Result |
| --- | --- |
| Complete `node --test` suite | 130 passed, 0 failed, 0 skipped, 0 cancelled |
| New Phase 2 unit tests | 21 passed, 0 failed |
| JavaScript syntax scan | 34 files passed, 0 failed |
| Playwright browser suite | 15 passed, 0 failed |
| New Phase 2 browser cases | 2 cases × 3 viewport projects = 6 passed |
| `git diff --check` | Passed |

The new unit coverage exercises canonical partial/complete saves, duplicate-write avoidance,
canonicalization on load, trusted restoration, recommendation recalculation, removal of transient
and protected data, most-recent-save behavior, malformed/unsupported/stale data and every
read/write/remove/unavailable-storage failure path.

The browser additions run at 1440×900, 768×1024 and 390×844. They cover an explicit resume prompt,
browser/device-only privacy wording, keyboard Continue and Start again activation, deliberate focus,
restored adaptive progress, completed-session recalculation, cancelled-restart preservation and
confirmed-restart clearing across reloads. The prior branching, editing, comparison, result and
responsive tests continue to pass in all projects.

Playwright viewport projects do not replace manual review with Safari, physical mobile devices or a
representative screen reader. Browser settings that refuse both removal and replacement of existing
site data also require manual confirmation of the displayed failure message.

## v1.2 Phase 3 verification addendum

Date: 29 August 2026

Branch: `feature/shareable-results-v1.2`

Status: reviewed, committed and pushed on the v1.2 feature branch; not merged, tagged, released or
deployed

| Check | Result |
| --- | --- |
| Complete `node --test` suite | 155 passed, 0 failed, 0 skipped, 0 cancelled |
| New Phase 3 unit tests | 25 passed, 0 failed |
| JavaScript syntax scan | 37 files passed, 0 failed |
| Playwright browser suite | 30 passed, 0 failed |
| New Phase 3 browser cases | 5 cases × 3 viewport projects = 15 passed |
| `git diff --check` | Passed |

The Phase 3 unit coverage exercises partial/complete export, deterministic transport, canonical
round trips, malformed base64url and UTF-8, independent transport/state compatibility, encoded-size
bounds, hostile IDs and object fields, adaptive inconsistencies, recommendation recalculation,
URL-before-local startup precedence, deliberate canonical persistence and repository-subpath/query
preservation.

Browser coverage opens generated partial and complete links in fresh contexts, verifies explicit
adoption and current recommendation calculation, preserves different local progress until adoption,
recovers from invalid links without exposing their payload, and serves/imports the same state from
`/apple-product-recommender/`. All five cases run at desktop, tablet and mobile viewports alongside
the Phase 2 and v1.1 regression journeys.

The minimal Phase 3 adoption/recovery controls use native buttons and named regions with deliberate
focus after interaction. Manual screen-reader, physical-device and real shared-link target testing
remain necessary before release.

## v1.2 Phase 4 verification addendum

Date: 29 August 2026

Branch: `feature/shareable-results-v1.2`

Status: reviewed, committed and pushed on the v1.2 feature branch; not merged, tagged, released or
deployed

| Check | Result |
| --- | --- |
| Complete `node --test` suite | 167 passed, 0 failed, 0 skipped, 0 cancelled |
| New Phase 4 unit tests | 12 passed, 0 failed |
| JavaScript syntax scan | 39 files passed, 0 failed |
| Playwright browser suite | 36 passed, 0 failed |
| New Phase 4 browser cases | 2 cases × 3 viewport projects = 6 passed |
| `git diff --check` | Passed |

The Phase 4 unit coverage verifies complete-state eligibility, rejection of partial UI export,
delegation to the canonical Phase 3 format, deterministic generation, Clipboard API success,
unavailable and rejected Clipboard behavior, fallback presentation, trusted wording and readonly
URL-field semantics.

The two browser additions cover keyboard-only opening and copying with polite success feedback, and
a rejected Clipboard API followed by a labelled, focused and selected manual-copy field. Both run at
1440×900, 768×1024 and 390×844 and assert comfortable button height and page/panel/field
containment. Existing Phase 3 browser journeys now also verify the complete imported-state notice,
partial imported-state guidance, local/shared-state explanation and friendly invalid-link recovery.

A local visual pass at the default desktop viewport and 390×844 confirmed the share panel follows
the answer review, remains secondary to the recommendation and introduces no page-level horizontal
overflow. Automation and viewport inspection do not replace VoiceOver/Narrator, 200–400% zoom,
Safari or physical-device checks before release.
