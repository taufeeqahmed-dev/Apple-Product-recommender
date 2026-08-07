Northstar

Northstar is an unofficial student portfolio project that helps people choose a MacBook based on
what they actually need, without requiring them to decode chip names, benchmark charts or technical
specification tables.

The v1.1 experience uses a streamlined adaptive questionnaire that changes according to the user's
answers. It gathers richer information through multi-select workload questions, separates ordinary
preferences from genuine must-have requirements, and explains up to three recommendations using a
transparent and deterministic recommendation model.

> Independent project: Northstar is not affiliated with, endorsed by or sponsored by Apple Inc.
> Apple and MacBook are trademarks of Apple Inc. Product facts come from official Apple UK sources.
> Suitability assessments, recommendation logic, confidence labels, reasons and
> compromises are independent Northstar project judgements.

![Northstar landing page](docs/images/northstar-overview.jpg)

Live website:
[`taufeeqahmed-dev.github.io/apple-product-recommender`](https://taufeeqahmed-dev.github.io/apple-product-recommender/)

The production site is deployed automatically from `main` using GitHub Pages.

Why this project exists

MacBook ranges are usually presented through processors, memory, display specifications and other
technical details. Those specifications are useful, but they do not directly answer the question
most buyers have:

Which MacBook best fits what I actually want to do?

Northstar starts with the user's budget, main uses, workload, multitasking, portability, screen,
storage and genuinely essential requirements.

The recommendation system keeps verified Apple facts separate from Northstar-authored suitability
judgements and explains:

- why a MacBook ranked highly;
- where it may involve a compromise;
- why another model ranked lower;
- whether the result is an Exact, Closest or Stretch match;
- and why no exact match exists when explicit requirements cannot all be satisfied.

Features

- Streamlined adaptive questionnaire designed to keep typical journeys short.
- Multi-select primary-use and workload questions for richer answers with fewer screens.
- Plain-language questions with technical clarification moved into supporting help text.
- Explicit `No preference`, `I'm not sure` and equivalent options where appropriate.
- Separate ordinary preferences from user-selected must-have requirements.
- Keyboard-accessible navigation, validation, focus management and answer preservation.
- Dependent answers are cleared when they become irrelevant and never remain hidden in scoring.
- Validated catalogue of 10 exact Apple UK MacBook configurations, verified on 31 July 2026.
- Deterministic recommendation engine with documented filtering, scoring and tie-breaking.
- Exact, Closest and Stretch recommendation handling before a genuine No Match.
- Up to three explainable recommendation results with dated product facts, reasons and compromises.
- Recommendation-confidence labels only where an actual recommendation can be assessed.
- Compact grouped answer review with individual-answer editing.
- Recommendations recalculate after an answer is edited.
- Accessible top-three comparison experience.
- Safe invalid-input, invalid-catalogue and genuine no-match states.
- Responsive and reduced-motion-aware interface.
- Framework-free production application with no runtime dependency.
- Unit, recommendation-quality and Playwright browser-test coverage.

Interface

| Mobile questionnaire | Explainable desktop results |
| --- | --- |
| ![Northstar questionnaire at a mobile viewport](docs/images/northstar-questionnaire-mobile.jpg) | ![Three Northstar recommendation cards at a desktop viewport](docs/images/northstar-results-desktop.jpg) |

Questionnaire design

Northstar v1.1 replaces the original fixed eight-question flow with a shorter adaptive experience.

A typical journey covers:

1. Budget and flexibility
2. Main uses
3. Relevant workload activities
4. Multitasking
5. Portability/performance and screen preference
6. Storage
7. Essential requirements

Additional detail is shown only when it is relevant to the user's answers.

For example, someone selecting programming or cybersecurity may be asked about activities such as
development tools, containers or virtual machines, while a creative user may receive different
workload options.

Where several related activities can apply, Northstar uses multi-select controls rather than
forcing the user through several separate questionnaire screens.

The questionnaire aims to gather enough information for a useful recommendation without requiring
the user to understand Northstar's internal scoring system.

How recommendations work

Northstar validates the catalogue and questionnaire input before producing recommendations.

Ordinary preferences influence ranking but do not automatically eliminate otherwise suitable
MacBooks. Only requirements the user explicitly identifies as must-haves can act as hard
constraints where the necessary product data is available.

The result hierarchy is:

```text
Exact match
    ↓
Closest match
    ↓
Stretch match
    ↓
Genuine no match
