Northstar

Northstar is an accessible, explainable MacBook recommendation web application that helps
people choose a MacBook based on what they actually need — without requiring them to decode chip
names, benchmark charts or technical specification tables.

Version 1.1.0 introduces a streamlined adaptive questionnaire, richer workload modelling, 
explicit must-have requirements and transparent recommendation explanations to produce a focused
shortlist of suitable MacBooks.

> Independent project: Northstar is an unofficial student portfolio project and is not
> affiliated with, endorsed by or sponsored by Apple Inc. Apple and MacBook are trademarks of
> Apple Inc. Product facts are sourced from official Apple UK pages. Suitability assessments,
> confidence, ranking logic, reasons and compromises are independent Northstar project judgements.

[Northstar landing page](docs/images/northstar-overview.jpg)

Live application

Production:  
[https://taufeeqahmed-dev.github.io/Apple-Product-recommender/](https://taufeeqahmed-dev.github.io/Apple-Product-recommender/)

Current stable release: `v1.1.0`

Production is deployed automatically from `main` using GitHub Pages.

---

Why this project exists

MacBook ranges are usually presented through processors, memory, display specifications and
benchmark comparisons.

Northstar starts from a different question:

> What does the user actually need their MacBook to do?

The questionnaire focuses on budget, activities, multitasking, portability, screen preference,
storage and genuinely essential requirements.

Northstar deliberately separates verified Apple product facts from project-authored suitability
assessments.

Each recommendation explains:

- why a MacBook ranked highly;
- which needs it satisfies;
- where compromises exist;
- why alternatives ranked lower;
- and why an exact match may not exist.

The goal is not simply to produce a score, but to make the recommendation understandable.

---

Highlights

- Streamlined seven-step adaptive questionnaire with conditional follow-ups only when relevant.
- Multi-select workload modelling for study, programming, cybersecurity, creative work, music
  production and 3D/engineering workloads.
- Plain-language questions with technical clarification in accessible supporting help text.
- Strict, flexible and stretch-budget handling.
- Explicit must-have requirements separated from ordinary preferences.
- Deterministic recommendation engine with documented filtering, scoring and tie-breaking.
- Exact → Closest → Stretch → No Match result hierarchy.
- High, Moderate and Low confidence labels only when an eligible recommendation exists.
- Compact grouped answer review with individual-answer editing.
- Recommendations automatically recalculate after an answer is changed.
- Explainable reasons, compromises and lower-ranked-product explanations.
- Accessible comparison of the top three recommendations.
- Keyboard navigation, deliberate focus management, responsive layouts and reduced-motion support.
- Verified catalogue of 10 exact MacBook configurations.
- Automated unit, recommendation-quality and Playwright browser testing.
- Framework-free production application built with HTML, CSS and JavaScript.
- No backend, user account, analytics or production runtime dependency.

---

Questionnaire design

A typical journey covers:

1. Budget and flexibility
2. Main uses
3. Relevant workload activities
4. Multitasking
5. Portability/performance and screen preference
6. Storage
7. Essential requirements

Additional detail appears only when it is relevant.

For example, exact weight or external-monitor questions are shown only when the user explicitly
marks those requirements as essential.

Where several related activities can apply, Northstar uses multi-select controls rather than
forcing the user through multiple separate questionnaire screens.

Hidden, stale or newly irrelevant answers are cleared from active state and cannot continue to
influence recommendations.

Workload examples

The adaptive workload step can cover areas such as:

- university and general productivity;
- programming and software development;
- cybersecurity labs and virtual machines;
- photography and image editing;
- video editing and motion work;
- music and audio production;
- 3D, CAD, engineering and simulation workloads.

Battery, connection and ownership-period questions were removed from the main v1.1 questionnaire
because the current verified product dataset cannot use them strongly enough to justify the
additional questionnaire friction.

---

How recommendations work

Northstar validates the catalogue and all relevant questionnaire answer IDs before recommendation
logic begins.

Every product must first pass catalogue, market and data-completeness checks.

Explicit must-have requirements are then applied where the verified catalogue contains the
necessary product data.

Ordinary preferences influence ranking without automatically excluding an otherwise suitable
MacBook.

Result hierarchy

```text
Exact match
    ↓
Closest match
    ↓
Stretch match
    ↓
Genuine No Match