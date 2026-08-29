# Northstar portfolio case study

## One-line summary

Northstar is a framework-free, accessible MacBook recommender that turns an adaptive needs interview
into a deterministic shortlist using validated official facts and explainable project-authored rules,
with versioned local resume and shareable decision state.

## The problem

Laptop buying guides often begin with specifications, while buyers begin with a budget, daily work,
multitasking, portability and practical constraints. The first adaptive v1.1 design distinguished
those workloads, but manual testing showed that repeated follow-ups and treatment-mode questions
could exceed 18 screens.

The revised v1.1 design uses seven core steps and no more than two essential-detail follow-ups. A
tailored activity multi-select captures local databases, containers, virtual machines, media and
professional work in one screen; one final Essentials step controls every non-budget/storage hard
requirement.

## Constraints

- MacBook-only, using 10 approved exact base configurations.
- Facts must come from official Apple UK product, buying, specification or support pages.
- Prices are dated snapshots and missing facts cannot be inferred.
- Battery and port needs cannot affect rank without verified model-specific data.
- Hidden answers must be cleared and must never affect recommendation logic.
- The engine must remain pure, deterministic and separate from rendering.
- The production site must remain framework-free with no backend, account, analytics or runtime
  dependency.
- Accessibility, transparent compromises and safe failure states are core behavior.

## Architecture and approach

The application uses explicit boundaries:

- a declarative question schema with stable IDs and dependencies;
- private state that returns immutable snapshots and reconciles hidden answers;
- a profile layer that derives the strongest applicable workload and memory signals;
- a validated, deeply frozen product catalogue;
- separate Northstar rule matrices and hard thresholds;
- a pure engine that validates, filters, scores, classifies and sorts;
- accessible results rendering with review, editing and comparison;
- strict canonical serialization containing stable questionnaire decision IDs only;
- resilient browser-local persistence and explicit resume/adoption choices;
- versioned URL transport with URL-before-local precedence and hostile-input rejection; and
- an accessible results-sharing controller with Clipboard API fallback.

Application version `1.2.0`, questionnaire schema `3`, questionnaire-state schema `1`, URL transport
`1` and rules `2.1.0` are versioned independently. This makes compatibility decisions explicit
instead of treating every interface or transport change as an algorithm change.

## Key product decisions

### Preferences do not silently become filters

Storage and strict/absolute budget remain hard requirements. Workload/memory, weight, exact screen
size and external displays become hard only through the final Essential requirements multi-select.
Portability balance and ordinary screen size remain preferences.

### Unknown facts remain unknown

Battery, port/connection and ownership-period questions were removed after manual testing because the
current catalogue cannot use them meaningfully enough to justify questionnaire time. Legacy values do
not affect rank or confidence. Verified Apple facts and Northstar assessments remain labelled
separately in cards and comparison.

### Adaptivity includes deletion

Changing a triggering answer identifies and clears only activity option IDs or essential details that
are no longer relevant. The live region names the cleared selections. Essential detail count changes
are announced once on Continue rather than after every checkbox toggle.

### Results remain revisable

The results page presents five compact summaries for budget, workload, device, storage and
essentials. Targeted edit actions open the relevant compound step. New required details are completed
before refreshing; focus moves deliberately between edit control, step heading and refreshed results.

### Portable state is not cached output

Version 1.2 serializes a minimal sparse record of validated question/control and option IDs. Partial
and complete states have distinct proofs, canonical answer/selection order and a 4,096-byte bound.
Unknown fields, stale hidden answers, impossible dependencies, unsafe object shapes and incompatible
versions are rejected rather than merged or guessed.

The same contract backs best-effort local persistence and `#northstar=v1.<base64url>` links. Startup
examines recognized URL state before local storage; a visitor explicitly chooses whether to adopt a
valid shared session. Invalid links cannot destroy valid local progress. Restored answers always run
through the compatible current engine and verified catalogue, so the URL never needs recommendation
scores, confidence, product selections or Apple facts.

Completed results expose Share results and Copy link. Clipboard failure is a normal progressive-
enhancement path: Northstar presents a labelled readonly URL field, focuses it and selects its text
for manual copying. Visible copy explains that browser storage is not cloud/secure storage and that
anyone with a share link can recover the encoded choices.

## Explainability

The engine distinguishes exact, closest and stretch-budget matches. Each card includes verified
facts, Northstar reasons, compromises and a lower-rank explanation based on the deterministic sort.
Confidence combines evaluated answer coverage, leading fit, separation and match alignment, with
documented High, Moderate or Low thresholds behind a secondary methodology disclosure. Terminal
budget/no-match outcomes do not display confidence; they explain the hard requirements that blocked
eligible recommendations instead of presenting a misleading numeric zero.

The leading recommendation is visually dominant. Comparison remains readily available, while
classification counts and confidence diagnostics no longer appear before the recommendation itself.
Each card keeps its numeric score and deterministic ranking explanation available in a native
disclosure, so technical evidence remains inspectable without dominating the initial result.

The top-three comparison is a semantic table with verified facts and Northstar assessments in
separate row groups. Its dialog is keyboard operable, restores focus and contains horizontal scrolling
within the table at smaller widths.

## Quality issues found through testing

The v1.0 scenario audit found that everyday flexible-budget input could over-reward maximum
capability. A failing recommendation-quality test led to a project-rule correction without changing
product facts.

The v1.1 Phase 4 pre-commit review found that an edit could leave completed progress at an
intermediate question and that comparison row groups used incorrect table scope. Both were fixed and
regression-tested before the phase was committed.

Manual v1.1 usability testing then found an 18-plus-step path and a misleading zero-confidence
no-match presentation. That evidence led to schema 3, rules 2.1 and new seven-to-nine-step bounds.

These examples show why recommendation quality needs scenario tests, while accessible stateful UI
needs rendered keyboard and focus tests.

The v1.2 release-candidate review found documentation drift rather than a product defect: Phase 4
still described itself as uncommitted and the README ended with an unfinished result-hierarchy code
block. Phase 5 reconciled release status and architecture/testing evidence and strengthened the
shared-result browser journey to include editing, canonical re-persistence and comparison.

## Verification evidence

- 167 Node tests, including v1/v2 migration, recommendation-quality scenarios, strict state
  validation, persistence failures and hostile URL input.
- 39 JavaScript files passing `node --check`.
- 36 Playwright executions across 1440×900, 768×1024 and 390×844 viewports.
- Automated adaptive branching, resume/restart, URL precedence, imported editing, recalculation,
  comparison, copy/fallback, focus and responsive-containment coverage.
- Local v1.2 Lighthouse mobile scores of 93/100/100/100 and desktop scores of 94/100/100/100 in
  Performance/Accessibility/Best Practices/SEO order.
- Frozen development lockfile and a Pages workflow gated by unit, syntax and browser tests.

Safari, VoiceOver, representative Windows screen-reader, physical-device and deployed-production
verification remain explicit manual release checks rather than automated claims.

## Outcome

Northstar demonstrates data modelling, independent schema evolution, deterministic algorithms,
untrusted-input validation, resilient client persistence, safe URL transport, accessible state
restoration/sharing, responsive rendering and release-driven testing in a project whose decisions
remain inspectable.

## CV-ready wording

Use the v1.2 release wording only after it has been reviewed, merged, deployed and released.

### Compact bullet

- Built Northstar, a framework-free accessible MacBook recommender using an adaptive questionnaire,
  validated Apple UK facts, deterministic explainable ranking and strictly validated resumable/shareable
  client state; covered 10 exact configurations with 167 Node tests and 36 browser executions.

### Two-bullet version

- Designed an adaptive responsive questionnaire and pure JavaScript recommendation engine that
  separates verified facts from project-authored assessments, applies only explicit hard
  requirements and explains exact, closest, stretch and no-match outcomes.
- Added versioned canonical state, resilient local resume, hostile-input-safe share URLs, progressive
  clipboard fallback, editable/comparable imported results and 36 browser executions across desktop,
  tablet and mobile.

### Interview summary

“I treated the recommender as a small decision system rather than a product-card filter. Its
questionnaire clears hidden dependants and centralises hard requirements, while v1.2 adds a separate
versioned state contract for local resume and share URLs. Imported data is allowlist-validated and
recommendations are recalculated, not cached. Browser tests cover the persistence, precedence, focus
and clipboard transitions that unit tests alone cannot prove.”

## Future opportunities

- Optional Web Share API enhancement while retaining Copy link and manual fallback.
- Deliberate migration only when a future questionnaire/state/transport version requires it.
- A scheduled, evidence-reviewed product-data refresh process.
- More approved configurations or other Apple product categories.
- Additional verified battery/connection fields before those answers can affect ranking.
- Continued physical-device and assistive-technology verification.
