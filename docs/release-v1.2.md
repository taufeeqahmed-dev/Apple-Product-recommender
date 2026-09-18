# Northstar v1.2 release checklist

Status: v1.2.0's main feature set from PR #3 and final UX polish from PR #4 are merged into `main`,
deployed through GitHub Pages and production-smoke verified; the formal v1.2.0 tag and GitHub release
remain pending

Documentation branch: `docs/v1.2-release-finalisation`

Current stable production version: `v1.2.0`

Previous tagged release: `v1.1.0` (preserved)

This checklist records completed evidence and remaining gates. It does not authorize a documentation
commit or push, or creation of the pending v1.2.0 tag and GitHub release.

## Release metadata

| Concern | v1.2.0 value |
| --- | --- |
| Package/application version | `1.2.0` |
| Questionnaire schema | `3` |
| Questionnaire-state schema | `1` |
| URL transport | `1` (`#northstar=v1.<base64url>`) |
| Recommendation rules | `2.1.0` |
| Browser storage key | `northstar.questionnaire-state.v1` |
| Product catalogue verification date | `2026-07-31` (unchanged) |
| Production architecture | Static, framework-free HTML/CSS/JavaScript |
| Development browser dependency | `@playwright/test` `1.62.0` only |

## Protected-scope confirmation

- [x] `js/products.js` unchanged during v1.2.
- [x] `sources/` unchanged and read-only.
- [x] Verified Apple facts and catalogue snapshot unchanged.
- [x] Recommendation weights, rules, ranking and classification unchanged in v1.2.
- [x] Questionnaire schema, wording and seven-to-nine-step bound unchanged in v1.2.
- [x] No backend, account, analytics or production runtime dependency added.

## Local automated gates

- [x] `pnpm test`: 167 passed, 0 failed, 0 skipped, 0 cancelled.
- [x] `pnpm check:syntax`: 39 JavaScript files passed, 0 failed.
- [x] Playwright desktop 1440×900: 12 passed.
- [x] Playwright tablet 768×1024: 12 passed.
- [x] Playwright mobile 390×844: 12 passed.
- [x] Local Lighthouse mobile: 93/100/100/100.
- [x] Local Lighthouse desktop: 94/100/100/100.
- [x] `git diff --check` passed for the Phase 5 verification diff.
- [x] Protected-file diff is empty.

Lighthouse category order is Performance, Accessibility, Best Practices and SEO. The accepted local
reports used Lighthouse 13.4.1 and installed Microsoft Edge 153.0.4234.8 against
`http://127.0.0.1:4180/`. Both complete JSON reports were written outside the repository. The CLI
then reported the known Windows temporary-profile cleanup `EPERM`; the reports contain the requested
and final URL, timestamps, user agent, audit data and category scores.

## Integrated journeys

- [x] Fresh questionnaire → recommendations → Share results → Copy link success.
- [x] Partial progress → reload → explicit Continue → restored adaptive progress → recommendations.
- [x] Saved progress → reload → Start again → storage cleared → no later resume.
- [x] Completed questionnaire → reload → Continue → current recommendations recalculated.
- [x] Complete shared link → explicit adoption → shared notice → edit → refreshed canonical local
  state/share fragment → top-three comparison.
- [x] Different local and URL state → shared precedence/adoption messaging → no silent substitution.
- [x] Invalid shared link → friendly recovery → valid local state preserved → normal use continues.
- [x] Confirmed Restart clears persistence; cancelled Restart preserves it.
- [x] Partial share import continues at the validated adaptive step.
- [x] GitHub Pages `/apple-product-recommender/` import/export path works locally.

## Privacy and security

- [x] Local copy states browser/device only, no Northstar upload, account or cloud sync.
- [x] Documentation identifies browser storage as non-secure storage.
- [x] Shared-link copy states that anyone with the link can recover questionnaire choices.
- [x] Documentation states base64url is encoding, not encryption or private storage.
- [x] State excludes recommendation output, scores, confidence, selected recommendation product IDs,
  labels, product facts, browser metadata, accounts and timestamps.
- [x] Malformed JSON/base64url/UTF-8, oversized payloads, unsupported versions, unknown IDs, duplicate
  selections, stale/hidden answers, unsafe keys and injected recommendation/product fields are tested.
- [x] Complete local/shared restoration recalculates against the compatible current engine and
  verified catalogue.

## URL-length evidence

Measured against the production repository-subpath base
`https://taufeeqahmed-dev.github.io/Apple-Product-recommender/`:

| Fixture | Total URL | Encoded payload | Canonical UTF-8 state |
| --- | ---: | ---: | ---: |
| Empty initial partial | 235 characters | 160 characters | 120 bytes |
| Realistic adaptive partial | 463 characters | 388 characters | 291 bytes |
| Typical complete | 625 characters | 550 characters | 412 bytes |
| Broadest current valid complete | 1,234 characters | 1,159 characters | 869 bytes |

All measured payloads are below the 5,462-character encoded and 4,096-byte decoded bounds. No
compression or transport change is required for the current questionnaire.

## Local accessibility and visual review

- [x] Lighthouse accessibility: 100 mobile and 100 desktop.
- [x] Automated semantic heading, landmark, native-control, label/help and live-region checks pass.
- [x] Keyboard/focus tests cover validation, adaptive navigation, resume choices, editing,
  comparison, restart, sharing, Copy link, fallback and recovery controls.
- [x] 1440×900, 768×1024 and 390×844 tests report no page-level horizontal overflow in the covered
  result/comparison/share states.
- [x] Local 320 px reflow review (400% equivalent for a 1280 px layout) found no horizontal overflow;
  share controls remained 46–53 px high.
- [x] Reduced-motion and visible-focus CSS remain present.

## Manual accessibility and device sign-off still pending

Record date, browser/device/assistive-technology version, result and notes before checking an item.

- [ ] Safari on a target iPhone in portrait and landscape.
- [ ] Physical iPhone touch targets, Dynamic Type/system text sizing and long-URL fallback.
- [ ] VoiceOver on iPhone through resume, shared adoption, editing, comparison, sharing and restart.
- [ ] VoiceOver on macOS/Safari where available.
- [ ] Narrator or another representative Windows screen reader through the complete v1.2 journey.
- [ ] Complete physical-keyboard journey including Shift+Tab, Escape, manual copy and comparison
  scrolling.
- [ ] Current Chrome smoke test.
- [ ] Current Firefox smoke test where available.
- [ ] JavaScript-disabled/module-load-failure fallback.

Playwright emulation, local Edge and Lighthouse do not complete these checks.

## Review, integration and remaining release gates

- [x] Phase 5 documentation and verification reviewed.
- [x] Original feature work committed and pushed on historical branch
  `feature/shareable-results-v1.2`.
- [x] PR #3 reviewed and merged the main v1.2 feature set into `main` without rewriting v1.1.0
  history.
- [x] PR #4 reviewed and merged the final v1.2 UX polish into `main`.
- [x] GitHub Pages deployment completed successfully from the final `main` state.
- [x] Listed production smoke journeys completed successfully.
- [ ] Review the release-finalisation documentation diff.
- [ ] Approve and commit the release-finalisation documentation.
- [ ] Approve and push `docs/v1.2-release-finalisation`.
- [ ] Create tag and GitHub release `v1.2.0` only after separate approval.

## Post-deployment verification

- [x] GitHub Pages workflow and deployment completed successfully.
- [x] Public URL serves v1.2 over HTTPS from `/Apple-Product-recommender/`.
- [x] Homepage loads successfully on the deployed origin.
- [ ] CSS, modules, images, crawler files and module imports are individually verified under the
  production repository subpath.
- [x] Questionnaire completion works on the deployed origin.
- [x] Partial progress survives reload and presents Continue where you left off.
- [x] Recommendation results render after the deployed questionnaire is completed.
- [ ] Start again and confirmed Restart prevent a later deployed-site resume.
- [x] A deployed complete result can use Share results and Copy link.
- [ ] The deployed Clipboard fallback is usable where clipboard permission/support is unavailable.
- [x] A deployed shared result opens successfully in a fresh browser context.
- [ ] A deployed complete shared URL is edited and compared after import.
- [ ] A deployed partial shared URL resumes at its validated adaptive step.
- [x] A malformed deployed shared link shows friendly recovery and leaves the application usable.
- [ ] A malformed deployed link is confirmed to preserve a separate valid local session.
- [x] The deployed 390×844 layout passes responsive smoke review.
- [x] **Keep my saved questionnaire** appears correctly on the deployed shared-questionnaire panel.
- [x] At mobile width, **Close sharing** appears directly beneath the **Share this result** heading as
  intended.
- [x] Keyboard-only navigation passes a deployed production smoke journey.
- [ ] Privacy text matches the reviewed release wording.
- [ ] Production console has no unexpected errors.
- [ ] Run and record production Lighthouse mobile and desktop.
- [ ] Confirm v1.1.0 tag/release and prior immutable releases remain unchanged.
- [x] Reconcile `PROJECT_STATUS.md` to the merged/deployed production state in this documentation diff.

## Rollback approach

Do not move or rewrite the `v1.1.0` or earlier tags. If a material v1.2 deployment defect is found,
prepare an explicit reviewed revert commit on `main` and let the Pages workflow redeploy the prior
static site. Preserve failed-link examples and test reports, document the defect and add regression
coverage before preparing a corrected release.

## Release notes draft

Northstar v1.2 adds resumable browser-local questionnaire progress and shareable recommendation
links through a versioned, strictly validated decision-state contract. Shared and restored answers
are reconciled through the existing adaptive state model, while recommendations are recalculated
against the compatible current engine and verified catalogue. The results UI adds accessible Copy
link feedback and a manual-copy fallback without adding a backend, account or production dependency.
