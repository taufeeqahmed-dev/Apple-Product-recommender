# Stage 4 test report

Date: 1 August 2026  
Branch: `stage-4-final-polish`  
Status: in review; not committed, pushed, merged or deployed

## Acceptance targets

Production Lighthouse must reach at least 90 Performance and at least 95 for Accessibility, Best
Practices and SEO. The requested local viewport matrix is 390×844, 768×1024 and 1440×900.

Safari/iPhone, physical-device behaviour, VoiceOver, a representative Windows screen reader and
physical keyboard-only testing are deliberately user-assisted checks. They are not marked complete
from emulation or source inspection.

## Automated verification

| Check | Result |
| --- | --- |
| `node --test` baseline | 16/16 passed |
| Stage 4 recommendation-quality additions | 6 tests added |
| Current full suite | 22/22 passed |
| `node --check` baseline | 12/12 JavaScript files passed |
| Current syntax check | 13/13 JavaScript files passed |
| Protected product catalogue | Unmodified |
| Read-only `sources/` directory | Unmodified |

Coverage includes exact product facts, catalogue validation, immutability, boundary prices, no
match, ties, malformed input, determinism, normalization, output structure, right-sized everyday
scenarios and monotonic budget/storage/display requirements.

## Lighthouse

Lighthouse `13.4.1` used installed Microsoft Edge `151.0.4129.21`. Reports were saved outside the
repository. The CLI produced valid reports but returned a Windows temporary-profile cleanup warning
after writing each file; this did not alter the recorded audit results.

| Run | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Local baseline — mobile | 100 | 100 | 96 | 100 |
| Local baseline — desktop | 100 | 100 | 96 | 100 |
| Local post-fix — mobile | 99 | 100 | 100 | 100 |
| Local post-fix — desktop | 100 | 100 | 100 | 100 |
| Deployed production — mobile | Requires reviewed deployment |
| Deployed production — desktop | Requires reviewed deployment |

Baseline Best Practices lost points because the browser requested a missing `/favicon.ico`. The
same audit also reported accessible-name/visible-label mismatch on the two Northstar home links.
The post-fix reports contain no console errors or label-content-name failures and exceed every local
acceptance target. Production scores remain unclaimed until deployment is approved.

## Functional end-to-end matrix

| Journey or state | Result |
| --- | --- |
| Initial load, landmarks and skip-link target | Passed |
| Missing required budget answer | Passed; alert shown and first radio focused |
| One and two primary uses | Passed |
| Third primary use | Passed; selection rejected and limit announced |
| Back/Continue and answer preservation | Passed |
| Progress from step 1 through step 8 | Passed |
| Complete questionnaire and render top three | Passed |
| Result heading focus and polite announcement | Passed |
| Restart cancellation and focus return | Passed |
| Restart confirmation and full reset | Passed |
| Mobile navigation open/close and Escape | Passed |
| No-match engine output | Passed through automated scenario |
| Invalid-input and invalid-catalogue output | Passed through automated tests |
| Console warnings/errors during interactive journey | None observed |
| Internal anchors | All targets present |
| Official external links | All 18 URLs resolved; two support links reached Apple's human-verification page |
| Repository-subdirectory CSS/modules/assets | Passed at `/apple-product-recommender/` |

Post-fix regression passed for the affected focus, invalid-state, restart, result-name, explanation,
date-formatting and responsive states.

## Browser and viewport matrix

| Environment | Coverage | Result |
| --- | --- | --- |
| In-app Chromium-based browser | Full interactive journey and post-fix regression | Passed |
| Microsoft Edge 151 on Windows | Lighthouse mobile and desktop page load | Passed |
| Chrome on Windows | Not installed in this environment | Manual verification required |
| Firefox on Windows | Not installed in this environment | Manual verification where available |
| 390×844 emulation | Navigation, controls, one-column actions, overflow | Passed baseline |
| 768×1024 emulation | Navigation, two-column options, overflow | Passed baseline |
| 1440×900 | Navigation, three-column process layout, overflow | Passed baseline |

No horizontal overflow was found at the three requested viewports. Screenshots are captured after
the final regression pass so they represent the review candidate rather than the baseline.

## Accessibility review

Baseline checks passed for semantic landmarks, heading order, native labels, fieldsets, error
association, progress semantics, results status, reduced-motion CSS, focus placement, visible focus
and responsive reflow. Lighthouse Accessibility scored 100 on mobile and desktop.

Confirmed improvements in the review branch:

- remove the two visible-label/accessibility-name mismatches;
- expose custom invalid states with `aria-invalid`;
- give repeated product families configuration-specific article and link names;
- return focus when restart is cancelled with Escape;
- explain when JavaScript is unavailable.

Automated focus and key activation do not substitute for the pending physical keyboard and
screen-reader checks below.

## Recommendation-quality scenarios

| Scenario | Expected leading outcome | Baseline result |
| --- | --- | --- |
| Student, portable, up to £1,500 | 13-inch Air | Passed |
| Coding, moderate, up to £1,000 | Neo with explicit compromises | Passed |
| Large-screen office, up to £1,500 | 15-inch Air | Passed |
| Demanding coding, two displays, 1TB | 14-inch M5 Pro | Passed |
| Photo/design, demanding, up to £2,000 | Eligible Air/Pro shortlist with trade-offs | Passed |
| Audio production, demanding, two displays | 14-inch M5 Pro | Passed |
| Video/3D, very demanding, 2TB, 3+ displays | 16-inch M5 Max | Passed |
| Contradictory £1,000 professional requirements | No match | Passed |
| Everyday, flexible, balanced, optional answers unsure | Right-sized 13-inch Air | Failed baseline; fixed and regression-tested |
| Everyday, light, explicitly performance-first | Maximum capability remains possible | Passed after correction |

The right-sizing correction changes only Northstar workload judgements for light and moderate work;
no Apple fact or product record changed. Rules version is now `1.1.0`.

## Defects and resolution status

| Severity | Defect | Status |
| --- | --- | --- |
| High | Flexible light/moderate everyday input ranked a £4,099 M5 Max first | Fixed with failing-then-passing regression test |
| Medium | Reasons omitted scoring preferences when hard reasons filled all slots | Fixed with regression test |
| Medium | Repeated Air cards and source links had indistinguishable accessible names | Fixed; final browser regression passed |
| Medium | Brand-link accessible names failed label-content-name check | Fixed; local Lighthouse rerun passed |
| Medium | Missing favicon caused the only console 404 | Fixed; local 200 check and Lighthouse rerun passed |
| Medium | No usable explanation when JavaScript/modules are unavailable | Fixed; static fallback verified, browser test with JavaScript disabled remains manual |
| Medium | README contradicted Git/project status | Fixed in review documentation |
| Low | Internal stage/future wording and legacy placeholder CSS | Fixed |
| Low | Canonical/social/crawler metadata absent | Added; production verification pending |

## User-assisted manual verification

Before Stage 4 can be marked complete, the project owner should verify:

- Safari on the target iPhone;
- portrait and landscape on a physical phone;
- touch behaviour and system text sizing;
- VoiceOver on iPhone through the questionnaire, errors, results and restart;
- Narrator or another representative Windows screen reader;
- a complete physical keyboard-only journey including Shift+Tab and Escape;
- the JavaScript-disabled/module-load-failure fallback in a browser;
- current Chrome on Windows;
- current Firefox on Windows where available; and
- the deployed production URL and production Lighthouse after approval/merge.

Record the browser/device versions, date, outcome and any accepted limitation before changing the
Stage 4 status to complete.
