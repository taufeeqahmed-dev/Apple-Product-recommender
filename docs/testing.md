# Northstar v1.1 Phase 5 test report

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
- Optional shareable URLs are outside Phase 5 and untested because they are not implemented.

## Focused revision conclusion

All updated unit, syntax and browser checks available in this environment pass. Verified product
facts, product schema and suitability matrices remain unchanged. Questionnaire schema 3 and rules
2.1 are deliberate behavior changes described in `docs/algorithm.md`. Release preparation remains
paused, and the revision must be reviewed before any commit or push.

## v1.2 Phase 2 verification addendum

Date: 29 August 2026

Branch: `feature/shareable-results-v1.2`

Status: local persistence and resume review candidate; uncommitted and not pushed, merged, tagged,
released or deployed

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
