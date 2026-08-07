# Northstar v1.1 Phase 5 test report

Date: 7 August 2026

Branch: `feature/adaptive-questionnaire-v1.1`

Status: local Phase 5 review candidate; not committed, pushed, merged, tagged or deployed

## Acceptance targets

- Preserve all unit, catalogue, migration, engine and recommendation-quality coverage.
- Add repeatable browser tests without adding a production dependency or framework.
- Exercise 1440×900 desktop, 768×1024 tablet and 390×844 mobile viewports.
- Preserve keyboard operation, deliberate focus, semantic structure and responsive containment.
- Reach at least 90 Performance and 95 Accessibility, Best Practices and SEO in valid local
  Lighthouse runs.
- Keep `js/products.js`, verified Apple facts and `sources/` unchanged.

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
| Full `node --test` suite | 59 passed, 0 failed, 0 skipped, 0 cancelled |
| v1.0 compatibility/migration tests within the suite | 4 passed, 0 failed |
| Recommendation-quality tests within the suite | 9 passed, 0 failed |
| JavaScript `node --check` scan | 30 files passed, 0 failed |
| Playwright browser suite | 9 passed, 0 failed |
| Protected product/schema paths | Unmodified |
| Read-only `sources/` directory | Unmodified |

The 59-test suite covers:

- exact product IDs, dated prices, facts, official sources, schema validation and immutability;
- independent application, questionnaire-schema and rules versions;
- declarative visibility, reconciliation, hidden-answer rejection and adaptive state;
- deliberate migration of all existing v1.0 fixtures, including ambiguous concepts;
- strict/flexible/stretch budget boundaries and budget-limited outcomes;
- explicit mandatory workload, memory, weight, screen, display and ownership behavior;
- battery and connection non-ranking behavior;
- deterministic ranking, ties, classifications, confidence and explanations;
- representative exact, closest, stretch, budget-limited and genuine no-match cases; and
- right-sized everyday, demanding development and monotonic hard-requirement scenarios.

## Playwright browser coverage

The Playwright configuration starts the dependency-free local static server, uses one isolated page
per test and runs the same three tests in every viewport project.

| Project | Viewport | Tests | Result |
| --- | ---: | ---: | --- |
| Desktop | 1440×900 | 3 | Passed |
| Tablet | 768×1024 | 3 | Passed |
| Mobile | 390×844 | 3 | Passed |
| **Total** | — | **9** | **9 passed, 0 failed** |

### Adaptive branching test

- Initial `Question 1 of 11 based on your answers` state.
- Required-answer alert, `aria-invalid` behavior and focus on the first invalid radio.
- Study follow-up changing the total to 13 with an accessible announcement.
- Back navigation and preserved selected answers.
- Adding programming, removing study and clearing only the obsolete study detail.
- Updated total and focus on the newly applicable programming follow-up.
- No console or uncaught page errors.

### Results editing test

- Completion focus on the results heading.
- Individual primary-use editing and heading focus.
- Clearing/announcing a newly irrelevant study answer.
- Refreshed recommendations and completed adaptive progress.
- Hidden study detail absent from answer review; new programming follow-ups visible as optional.
- Repeated 512GB → 1TB → 512GB storage edits without stale selection state.
- Clearing a connection trigger and its importance answer.
- Connection disclosure removed while the still-unassessed battery disclosure remains.
- No console or uncaught page errors.

### Results and comparison test

- High/Moderate/Low threshold documentation and Low confidence disclosure for the chosen profile.
- Exact, closest and stretch-budget classification explanations.
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

## Accessibility review

Automated and rendered checks confirm:

- one main landmark, logical headings, fieldsets, legends and native controls;
- associated help/error text and polite adaptive/result status regions;
- accurate `Question X of Y based on your answers` progress;
- deliberate focus on questions, invalid controls, results and dialog title;
- focus restoration after comparison closes;
- no positive `tabindex` values;
- keyboard-operable dialog and horizontally scrollable comparison region;
- verified facts separated from Northstar assessments;
- visible classification, confidence and unused-ranking disclosures;
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

## Phase 5 conclusion

All automated release-candidate gates available in this environment pass. No production code,
verified product fact, scoring weight or recommendation rule changed during Phase 5. The branch must
still be reviewed before commit, merge, tag or deployment.
