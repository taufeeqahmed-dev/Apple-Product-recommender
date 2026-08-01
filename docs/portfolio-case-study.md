# Northstar portfolio case study

## One-line summary

Northstar is a dependency-free, accessible MacBook recommender that validates dated official
product facts, applies explainable project-authored rules and returns a deterministic shortlist.

## The problem

Laptop buying guides often begin with specifications, while many buyers begin with a budget, daily
tasks, portability and the number of displays they need. The project goal was to translate those
plain-language needs into a small, defensible shortlist without presenting internal suitability
judgements as manufacturer claims.

## Constraints

- Version one is MacBook-only and uses 10 approved exact base configurations.
- Facts must come from official Apple UK product, buying, specification or support pages.
- Exact prices are dated snapshots; missing facts cannot be inferred.
- The recommendation engine must remain pure, deterministic and separate from rendering.
- The site must work without a framework, runtime dependency, backend or build step.
- Accessibility and transparent failure states are part of the implementation, not afterthoughts.

## Approach

I split the application into explicit boundaries:

- a validated and deeply frozen product catalogue;
- separate Northstar rules and suitability matrices;
- a pure engine that validates, filters, scores and sorts;
- private questionnaire state and DOM behaviour; and
- accessible result rendering.

Hard requirements run before scoring. This prevents a high soft score from hiding a missed budget,
storage, display or workload minimum. Optional preferences are omitted and normalized rather than
assigned invented values. The engine returns matches, exclusions, tie groups and diagnostics so the
interface can explain both success and no-match outcomes.

## Accessibility decisions

The questionnaire uses native radios, checkboxes and selects inside fieldsets. Errors are associated
with their questions, exposed as alerts and reflected through `aria-invalid`. Focus moves to step
headings, invalid controls and the results heading at deliberate moments. Result cards are semantic
articles with configuration-specific accessible names, and a polite status message announces when
results are ready. Reduced motion and responsive reflow are built into the CSS.

## A quality issue found during release testing

A scenario audit revealed that an everyday user with flexible budget and balanced preferences could
receive a £4,099 M5 Max as the first recommendation. The underlying light/moderate workload matrix
treated all higher capability bands as equally perfect, so a small performance-component advantage
rewarded excessive headroom.

I first added a failing regression test, then revised only the light/moderate project-judgement
scores. A balanced everyday user now receives a right-sized 13-inch Air, while explicitly choosing
performance-first can still rank maximum capability first. Product facts did not change. This is a
useful example of why recommendation correctness needs scenario review as well as unit tests.

## Verification evidence

- 22 dependency-free Node tests after Stage 4 additions.
- Syntax checks across all project JavaScript.
- Complete questionnaire-to-results browser journey.
- Exact 390×844, 768×1024 and 1440×900 responsive checks without horizontal overflow.
- Local Lighthouse baseline of 100 Performance, 100 Accessibility, 96 Best Practices and 100 SEO on
  both mobile and desktop.
- Eighteen official source links and the GitHub Pages repository subpath checked.

Final production Lighthouse and the user-assisted Safari, physical-device, screen-reader and
physical-keyboard checks remain release gates until the branch is approved and deployed.

## Outcome

Northstar demonstrates data modelling, schema validation, deterministic algorithms, accessible
stateful interfaces, defensive error handling, responsive design, automated testing and deployment
planning in a small project whose decisions remain inspectable.

## CV-ready wording

Use measured wording only after the final release checks are complete.

### Compact bullet

- Built Northstar, a dependency-free accessible MacBook recommender using validated Apple UK data,
  deterministic hard filtering and explainable weighted scoring; covered 10 exact configurations
  with 22 Node tests and a GitHub Pages deployment workflow.

### Two-bullet version

- Designed an eight-step responsive questionnaire and pure JavaScript recommendation engine that
  separates verified product facts from project-authored suitability rules and explains up to three
  ranked matches, compromises or a no-match result.
- Added schema validation, deterministic tie-breaking, accessibility-focused focus/error handling,
  22 dependency-free tests, scenario-quality regression coverage and release checks across three
  target viewports.

### Interview summary

“I wanted to show more than a polished landing page, so I treated the recommender as a small decision
system. I validate and freeze the full dataset, apply non-negotiable requirements before scoring,
normalize only applicable preferences, and return enough diagnostics to explain a no-match. During
scenario testing I found an overpowered recommendation that unit tests had missed, wrote a failing
quality test, and corrected the right-sizing matrix without touching verified product facts.”

## Future opportunities

- A scheduled, evidence-reviewed product-data refresh process.
- An explicitly designed value-for-money preference rather than inferring one from budget.
- More approved configurations or other Apple product categories.
- Optional answer persistence with clear privacy boundaries.
- Repeatable browser automation if development dependencies are later approved.
