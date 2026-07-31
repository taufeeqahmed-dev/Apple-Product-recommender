# Northstar

Northstar is an unofficial student portfolio project that helps people choose a MacBook based on their needs. It uses a short, plain-language questionnaire and an explainable scoring system to produce up to three focused recommendations.

> **Disclaimer:** Northstar is an independent educational project. It is not affiliated with, endorsed by or sponsored by Apple Inc. Apple and MacBook are trademarks of Apple Inc. Product facts come from official Apple UK pages; suitability scores, reasons and compromises are Northstar project judgements.

## Current status

Stages 1, 2 and 3 are complete locally. The website now includes:

- an accessible, responsive landing page and navigation;
- an eight-step, MacBook-only questionnaire using native controls;
- required-answer alerts, deliberate focus movement, answer preservation and Restart confirmation;
- a validated catalogue of 10 exact MacBook configurations available from Apple UK;
- UK price snapshots and specifications verified on 31 July 2026;
- hard eligibility rules for budget, storage, external displays and workload capability;
- a documented, deterministic 100-point scoring system;
- explicit handling for invalid input, invalid catalogues, ties, incomplete data and no-match cases;
- accessible top-three results with reasons, compromises, dated prices and official source links; and
- dependency-free automated tests using Node's built-in test runner.

Stage 3 is not committed or pushed yet. Stage 4 has not begun.

## Product-data scope

The Stage 3 snapshot covers exact base configurations of the current MacBook Neo, MacBook Air and MacBook Pro range included in the approved dataset. It does not add configurable upgrades.

Every record stores a stable ID, exact configuration, region `GB`, currency `GBP`, availability, a dated price snapshot, verified facts and field-level official source references. Records are validated and frozen before the recommendation engine can use them.

Only official Apple UK product, buying, technical-specification and relevant support pages were used. Prices can change after the recorded verification date.

## Recommendation method

Hard requirements are applied before scoring. Products are excluded if they fail availability/market checks, lack comparison-critical data, exceed the selected budget, miss the minimum storage or display requirement, or fall below the project's workload capability minimum.

Eligible products are scored using these independent Northstar weights:

- workload fit: 30 points;
- primary-use fit: 25 points;
- portability versus performance: 20 points;
- screen-size preference: 15 points; and
- ownership-period headroom: 10 points.

When a visitor selects “no preference” or “unsure” for an optional scoring preference, that component is omitted and the score is normalized over the remaining applicable weight. Tie-breaking is deterministic: score, workload component, primary-use component, balance component, fewer compromises, lower price, then product ID.

The complete matrices and thresholds live in `js/recommendation-rules.js`. These internal suitability assessments are not Apple performance claims.

## Technology stack

- **HTML5** for semantic structure, native forms and accessible status regions.
- **CSS3** for the original visual identity, responsive layouts, focus styles and reduced-motion support.
- **JavaScript modules** for separate state, data, validation, rules, engine and rendering concerns.
- **Node.js built-in test runner** for dependency-free automated tests.
- **Git and GitHub** for version control and project history.

No external frameworks, component libraries or runtime dependencies are used.

## Project structure

```text
.
├── index.html                         # Landing page, questionnaire and results structure
├── package.json                       # Dependency-free Node test command
├── README.md                          # Project documentation
├── PROJECT_STATUS.md                  # Detailed implementation status
├── css/
│   └── styles.css                     # Visual design and responsive behaviour
├── js/
│   ├── app.js                         # Application entry point and feature wiring
│   ├── product-schema.js              # Catalogue schema validation and freezing
│   ├── products.js                    # Verified Apple UK product snapshot
│   ├── questionnaire-state.js         # Encapsulated questionnaire state
│   ├── questionnaire.js               # Questionnaire validation and interface behaviour
│   ├── recommendation-rules.js        # Hard thresholds and scoring matrices
│   ├── recommendation-engine.js       # Pure deterministic matching engine
│   ├── results.js                     # Accessible recommendation rendering
│   └── ui.js                          # Responsive navigation behaviour
├── tests/
│   ├── fixtures/questionnaire-scenarios.js
│   ├── product-data.test.js
│   └── recommendation-engine.test.js
└── sources/                           # Read-only local references; never modified
```

## Development stages

### Stage 1 — Foundation (complete)

Created the landing page, responsive navigation, original visual system, disclaimer and initial project structure.

### Stage 2 — Questionnaire (complete)

Implemented the accessible multi-step questionnaire with controlled state, validation, progress, Back/Continue navigation, answer preservation, Restart confirmation and focus management.

### Stage 3 — Data and recommendations (complete locally)

Added the verified catalogue, schema validation, hard filters, weighted scoring, deterministic recommendations, accessible results, no-match/error handling and automated tests.

### Stage 4 — Testing and refinement (not started)

Broaden cross-browser, physical-device, keyboard and assistive-technology testing, then refine content and presentation where evidence supports a change.

### Stage 5 — Documentation and deployment (not started)

Add final project media and design documentation, complete release checks and deploy the static site.

## Running locally

Because the site uses JavaScript modules, serve it from the repository root instead of opening `index.html` directly. No installation or build step is required.

```text
python -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. On Windows, `py` can be used instead of `python` when that launcher is configured. Stop the server with `Ctrl+C`.

## Running tests

With Node.js available on the command line:

```text
npm test
```

The script runs the required dependency-free command:

```text
node --test
```

## Known limitations

- Product facts and prices are a 31 July 2026 snapshot and can become outdated.
- Only the 10 approved exact configurations are compared; configurable upgrades are outside the dataset.
- Questionnaire answers are stored only in memory and are cleared on reload.
- The engine does not silently relax hard requirements or show near matches when no product qualifies.
- There is no backend, account system, analytics or persistent storage.
- Automated browser verification used a Chromium-based in-app browser; Firefox, Safari, physical-device, full manual keyboard and screen-reader testing remain outstanding.
- The repository has not been deployed.
