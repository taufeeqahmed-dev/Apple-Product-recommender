# Northstar portfolio case study

## One-line summary

Northstar is a framework-free, accessible MacBook recommender that turns an adaptive needs interview
into a deterministic shortlist using validated official facts and explainable project-authored rules.

## The problem

Laptop buying guides often begin with specifications, while buyers begin with a budget, daily work,
multitasking, portability and practical constraints. A fixed eight-question flow could ask the same
generic workload question of everyone, but it could not distinguish a student spreadsheet workload
from local virtual machines, sustained video work or large software builds.

Version 1.1 reframes the questionnaire as an adaptive decision interview. It asks relevant detail,
lets users decide which preferences are truly mandatory and explains exact matches, closest options,
stretch alternatives and genuine no-match outcomes without presenting Northstar judgements as Apple
claims.

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

Application version `1.1.0`, questionnaire schema `2` and rules `2.0.0` are versioned independently.
This makes compatibility decisions explicit instead of treating every interface change as an
algorithm change.

## Key product decisions

### Preferences do not silently become filters

Storage and strict/absolute budget remain hard requirements. Workload/memory, weight, exact screen
size, external displays and ownership headroom become hard only through an explicit mandatory
answer. Screen, weight and ownership otherwise shape rank and compromises, reducing unnecessary
no-match outcomes.

### Unknown facts remain unknown

Battery importance and connection needs are collected because they matter to people, but the current
catalogue cannot evaluate them safely. Results disclose that limitation and confidence can be capped;
rank does not change. Verified Apple facts and Northstar assessments are labelled separately in both
cards and comparison.

### Adaptivity includes deletion

Changing a triggering answer immediately identifies and clears only dependants that are no longer
visible. The live region names what was cleared and announces the new total. Hidden state is rejected
by profile validation, so navigation order cannot leak obsolete answers into the engine.

### Results remain revisable

The results page groups visible answers and lets users edit one answer at a time. New required
follow-ups are completed before refreshing. Focus moves deliberately between the edit control,
question heading and refreshed results, and cancel restores the complete pre-edit snapshot.

## Explainability

The engine distinguishes exact, closest and stretch-budget matches. Each card includes verified
facts, Northstar reasons, compromises and a lower-rank explanation based on the deterministic sort.
Confidence combines answer detail, leading fit, separation and match alignment, with visible High,
Moderate or Low thresholds and caps for important unassessed needs.

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

These examples show why recommendation quality needs scenario tests, while accessible stateful UI
needs rendered keyboard and focus tests.

## Verification evidence

- 59 dependency-free Node tests, including all migrated v1.0 fixtures and nine recommendation-quality
  scenarios.
- 30 JavaScript files passing `node --check`.
- Nine Playwright tests across 1440×900, 768×1024 and 390×844 viewports.
- Automated adaptive branching, dependency clearing, edit, focus, classification, confidence and
  comparison coverage.
- Local Lighthouse 13.4.1 scores of 100/100/100/100 on mobile and desktop in Edge 151.
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
  with 59 Node tests and nine cross-viewport Playwright tests.

### Two-bullet version

- Designed an adaptive responsive questionnaire and pure JavaScript recommendation engine that
  separates verified facts from project-authored assessments, applies only explicit hard
  requirements and explains exact, closest, stretch and no-match outcomes.
- Added schema migration, dependency-safe state, confidence labels, editable results, accessible
  top-three comparison, 59 unit/quality tests, nine browser tests and local 100/100/100/100
  Lighthouse verification.

### Interview summary

“I treated the recommender as a small decision system rather than a product-card filter. The
questionnaire adapts to selected work, clears hidden dependants, and asks whether a preference is
actually mandatory. The engine validates and freezes the dataset, filters before scoring and returns
enough diagnostics to explain rank and confidence. I kept unavailable battery and port evidence out
of scoring, then added browser tests for the state transitions that unit tests cannot prove.”

## Future opportunities

- Optional Phase 6 shareable results using non-sensitive option IDs after separate approval.
- A scheduled, evidence-reviewed product-data refresh process.
- More approved configurations or other Apple product categories.
- Additional verified battery/connection fields before those answers can affect ranking.
- Continued physical-device and assistive-technology verification.
