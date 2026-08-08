# Northstar v1.1 release checklist

Status: Phase 5 local review candidate

Branch: `feature/adaptive-questionnaire-v1.1`

Intended release/tag: `v1.1.0`

This checklist does not authorize a commit, merge, tag, push or deployment.

## Release metadata

| Concern | Release value |
| --- | --- |
| Package/application version | `1.1.0` |
| Questionnaire schema | `2` |
| Recommendation rules | `2.0.0` |
| Product catalogue verification date | `2026-07-31` (unchanged) |
| Production architecture | Static, framework-free HTML/CSS/JavaScript |
| Development browser dependency | `@playwright/test` `1.62.0` only |
| Previous immutable release | `v1.0.0` |

## Protected-scope confirmation

- [x] `js/products.js` unchanged.
- [x] `js/product-schema.js` unchanged.
- [x] `sources/` unchanged.
- [x] Verified Apple facts unchanged.
- [x] Recommendation weights and rules unchanged during Phase 5.
- [x] No account, database, analytics or production framework added.
- [x] Optional Phase 6 shareable results not implemented.

## Local automated gates

- [x] `node --test`: 59 passed, 0 failed.
- [x] All four v1.0 migration scenarios rerun.
- [x] All nine recommendation-quality scenarios rerun.
- [x] `node scripts/check-javascript-syntax.mjs`: 30 files passed.
- [x] Playwright desktop 1440×900: 3 passed.
- [x] Playwright tablet 768×1024: 3 passed.
- [x] Playwright mobile 390×844: 3 passed.
- [x] Local Lighthouse mobile: 100/100/100/100.
- [x] Local Lighthouse desktop: 100/100/100/100.
- [x] `git diff --check` passes before review handoff.

Category order for Lighthouse is Performance, Accessibility, Best Practices and SEO. Local scores
used Lighthouse 13.4.1 and Microsoft Edge 151.0.4129.21 against a verified local server.

## Reviewer gates

- [ ] Review the complete Phase 5 diff.
- [ ] Confirm Playwright remains development-only and `node_modules/` is ignored.
- [ ] Confirm the Pages artifact copies only `index.html`, crawler files, assets, CSS, docs and JS.
- [ ] Confirm documentation does not claim v1.1 is deployed.
- [ ] Approve or request changes.
- [ ] Approve a commit and push separately.

## Manual accessibility and device sign-off

Record date, browser/device/assistive-technology version, result and notes before checking an item.

- [ ] Safari on target iPhone, portrait and landscape.
- [ ] Physical touch targets and system text sizing.
- [ ] VoiceOver on iPhone: branching, required errors, editing, comparison and restart.
- [ ] VoiceOver on macOS/Safari where available.
- [ ] Narrator or another representative Windows screen reader.
- [ ] Complete physical-keyboard journey including Shift+Tab, Escape and comparison scrolling.
- [ ] Current Chrome smoke test.
- [ ] Current Firefox smoke test where available.
- [ ] JavaScript-disabled/module-load-failure fallback.

Manual checks may be recorded as accepted post-release limitations only through explicit review; they
must not be silently marked complete from Playwright emulation.

## Approved release sequence

Do not perform these steps without separate user approval.

1. Re-run `pnpm install --frozen-lockfile`.
2. Run `pnpm test`.
3. Run `pnpm check:syntax`.
4. Run `pnpm test:browser`.
5. Confirm the protected-scope diff is empty.
6. Commit the reviewed Phase 5 changes on `feature/adaptive-questionnaire-v1.1`.
7. Push the feature branch.
8. Review the complete v1.1 branch diff against `main`.
9. Merge through the approved process.
10. Create tag/release `v1.1.0` only after the merged commit is confirmed.
11. Let the `main` GitHub Pages workflow run all gates and deploy.

## Post-deployment verification

- [ ] GitHub Pages workflow passed unit, syntax and all browser projects.
- [ ] Public URL serves the v1.1 application over HTTPS.
- [ ] CSS, modules, images, robots and sitemap resolve under the repository subpath.
- [ ] Complete one production questionnaire/edit/comparison smoke journey.
- [ ] Confirm production console has no unexpected errors.
- [ ] Run production Lighthouse mobile and record scores/date.
- [ ] Run production Lighthouse desktop and record scores/date.
- [ ] Verify `v1.0.0` tag and release remain unchanged.
- [ ] Update `PROJECT_STATUS.md` from review candidate to released/deployed in a separately reviewed
  documentation change if required.

## Rollback approach

Do not move or rewrite the `v1.0.0` tag. If a material v1.1 deployment defect is found, create an
explicit reviewed revert commit on `main` for the v1.1 merge and allow the Pages workflow to redeploy
the reverted static site. Preserve test reports and document the defect before preparing a corrected
release.

## Release notes draft

Northstar v1.1 adds an adaptive questionnaire with workload-specific follow-ups, explicit preference
versus requirement choices, multitasking and flexible-budget handling. Results now support grouped
answer review, individual editing, exact/closest/stretch classifications, documented confidence,
clearer compromises and an accessible top-three comparison. Battery and connection answers are
disclosed but remain outside ranking until verified model-specific facts exist. Production remains
framework-free; Playwright is development-only.
