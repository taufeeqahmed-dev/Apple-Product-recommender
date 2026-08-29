# Northstar v1.2 release checklist

Status: Phase 5 release-candidate review; uncommitted and not approved for push, PR, merge, tag,
release or deployment

Branch: `feature/shareable-results-v1.2`

Intended release/tag: `v1.2.0`

Current production release: `v1.1.0` from `main`

This checklist records evidence and remaining gates. It does not authorize a commit, push, pull
request, merge, tag, release or deployment.

## Release metadata

| Concern | Release-candidate value |
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
- [x] `git diff --check` passes for the Phase 5 candidate.
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
`https://taufeeqahmed-dev.github.io/apple-product-recommender/`:

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

## Reviewer and pre-PR gates

- [ ] Review the complete Phase 5 diff.
- [ ] Confirm documentation accurately preserves v1.1.0 as current production.
- [ ] Confirm Playwright remains development-only and the Pages artifact excludes development tools.
- [ ] Confirm the URL/privacy language is acceptable for release.
- [ ] Confirm no critical/high defect remains.
- [ ] Approve the Phase 5 commit.
- [ ] Approve the feature-branch push separately.
- [ ] Re-run required gates on the reviewed commit if it differs from this candidate.
- [ ] Create a pull request only after explicit approval.

## Approved release sequence

Do not perform these steps without separate user approval.

1. Commit the reviewed Phase 5 changes on `feature/shareable-results-v1.2`.
2. Push the reviewed feature branch.
3. Review the complete branch diff and pull-request checks against `main`.
4. Merge through the approved process without rewriting the v1.1.0 release.
5. Confirm the `main` Pages workflow passes unit, syntax and all browser projects.
6. Complete the deployed-site checks below.
7. Create tag/release `v1.2.0` only after the merged/deployed commit is confirmed.

## Post-deployment verification

- [ ] GitHub Pages workflow passed unit, syntax and all browser projects.
- [ ] Public URL serves v1.2 over HTTPS from `/apple-product-recommender/`.
- [ ] CSS, modules, images, crawler files and module imports resolve under the repository subpath.
- [ ] Partial progress persists and presents the resume choice on the deployed origin.
- [ ] Start again and confirmed Restart prevent a later deployed-site resume.
- [ ] A deployed complete result can generate and copy a canonical share URL.
- [ ] The deployed Clipboard fallback is usable where clipboard permission/support is unavailable.
- [ ] A deployed complete shared URL imports, recalculates, edits and compares successfully.
- [ ] A deployed partial shared URL resumes at its validated adaptive step.
- [ ] Invalid/tampered deployed links preserve local state and show friendly recovery.
- [ ] Privacy text matches the reviewed release wording.
- [ ] Production console has no unexpected errors.
- [ ] Run and record production Lighthouse mobile and desktop.
- [ ] Confirm v1.1.0 tag/release and prior immutable releases remain unchanged.
- [ ] Reconcile `PROJECT_STATUS.md` to released/deployed in a separate reviewed change if needed.

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
