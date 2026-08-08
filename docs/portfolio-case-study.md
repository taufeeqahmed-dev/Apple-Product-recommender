# Northstar portfolio case study

## One-line summary

Northstar is a framework-free, accessible MacBook recommender that turns an adaptive needs interview
into a deterministic shortlist using validated official facts and explainable project-authored rules.

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
- a pure engine that validates, filters, scores, classifies and sorts; and
- accessible results rendering with review, editing and comparison.

Application version `1.1.0`, questionnaire schema `3` and rules `2.1.0` are versioned independently.
This makes compatibility decisions explicit instead of treating every interface change as an
algorithm change.

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

## Verification evidence

- 67 dependency-free Node tests, including v1/v2 migration and 11 recommendation-quality
  scenarios.
- 30 JavaScript files passing `node --check`.
- Nine Playwright tests across 1440×900, 768×1024 and 390×844 viewports.
- Automated adaptive branching, dependency clearing, edit, focus, classification, confidence and
  comparison coverage.
- Earlier Phase 5 Lighthouse scores were 100/100/100/100 locally; they predate schema 3 and are not
  claimed as release evidence for this revision.
- Frozen development lockfile and a Pages workflow gated by unit, syntax and browser tests.

Safari, VoiceOver, representative Windows screen-reader, physical-device and deployed-production
verification remain explicit manual release checks rather than automated claims.

## Outcome

Northstar demonstrates data modelling, schema evolution, deterministic algorithms, accessible
state management, responsive rendering, defensive handling of missing evidence, automated browser
testing and release planning in a project whose decisions remain inspectable.

## CV-ready wording

Use the release wording only after v1.1 has been reviewed and deployed.

### Compact bullet

- Built Northstar, a framework-free accessible MacBook recommender using an adaptive questionnaire,
  validated Apple UK facts and deterministic explainable ranking; covered 10 exact configurations
  with 67 Node tests and nine cross-viewport Playwright tests.

### Two-bullet version

- Designed an adaptive responsive questionnaire and pure JavaScript recommendation engine that
  separates verified facts from project-authored assessments, applies only explicit hard
  requirements and explains exact, closest, stretch and no-match outcomes.
- Added schema migration, dependency-safe state, confidence labels, editable results, accessible
  top-three comparison, 67 unit/quality tests and nine browser tests across desktop, tablet and mobile.

### Interview summary

“I treated the recommender as a small decision system rather than a product-card filter. The
questionnaire uses a tailored activity multi-select, clears hidden dependants, and centralises hard
requirements in one final step. Manual testing exposed an 18-step path, so I simplified it to seven
core and at most nine total steps, then added browser tests for the state transitions that unit tests
cannot prove.”

## Future opportunities

- Optional Phase 6 shareable results using non-sensitive option IDs after separate approval.
- A scheduled, evidence-reviewed product-data refresh process.
- More approved configurations or other Apple product categories.
- Additional verified battery/connection fields before those answers can affect ranking.
- Continued physical-device and assistive-technology verification.
