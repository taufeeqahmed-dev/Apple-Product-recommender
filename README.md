Northstar

Northstar is an accessible, explainable MacBook recommendation web application that helps
people choose a MacBook based on what they actually need — without requiring them to decode chip
names, benchmark charts or technical specification tables.

Version 1.2.0 is currently a release candidate on the feature branch. It adds validated browser-local
resume and shareable recommendation links to the v1.1 adaptive questionnaire without persisting or
transporting recommendation output or product data.

> Independent project: Northstar is an unofficial student portfolio project and is not
> affiliated with, endorsed by or sponsored by Apple Inc. Apple and MacBook are trademarks of
> Apple Inc. Product facts are sourced from official Apple UK pages. Suitability assessments,
> confidence, ranking logic, reasons and compromises are independent Northstar project judgements.

[Northstar landing page](docs/images/northstar-overview.jpg)

Live application

Production:  
[https://taufeeqahmed-dev.github.io/apple-product-recommender/](https://taufeeqahmed-dev.github.io/apple-product-recommender/)

Current stable release: `v1.1.0`

Release candidate: `v1.2.0` on `feature/shareable-results-v1.2`

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
- Explicit browser-local resume for partial and completed questionnaires.
- Shareable completed-result links containing validated questionnaire decision IDs only.
- Current-engine/current-catalogue recalculation after local restore or shared-link import.
- Clipboard copy with a labelled manual-copy fallback.
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

---

Resume and sharing

Northstar can save validated questionnaire progress in the current browser and device. A returning
visitor is asked whether to Continue or Start again; saved state is never silently adopted. This is
browser storage, not an account, cloud sync or secure storage.

Completed results expose a secondary Share results action. The resulting URL contains canonical,
versioned questionnaire decision IDs—not recommendation results, scores, confidence, product facts,
labels or browser metadata. Anyone with the link can recover those choices, and base64url encoding
is not encryption.

Opening a valid link requires explicit adoption before it replaces locally saved progress. Northstar
then reconstructs the adaptive answers and recalculates recommendations using the compatible current
engine and verified catalogue. Invalid, oversized, incompatible or tampered links fail safely without
destroying browser-local progress. If automatic clipboard copying is unavailable, a labelled readonly
field presents the URL for manual copying.

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
```

Recommendation output is never cached in local or shared state. This means the same compatible link
may produce a different result after a future verified catalogue or recommendation-rules update.

---

Architecture

Northstar remains a static, framework-free HTML/CSS/JavaScript application with no backend or
production runtime dependency. Its main boundaries are:

- declarative questionnaire definitions and private immutable questionnaire state;
- strict schema-versioned canonical serialization of stable decision IDs;
- a dedicated best-effort local-persistence boundary;
- startup orchestration that resolves shared URLs before local resume state;
- a versioned dependency-free URL transport compatible with the GitHub Pages repository subpath;
- a pure deterministic recommendation engine over a validated product catalogue;
- results rendering, answer editing and accessible comparison; and
- a dedicated results-sharing controller for complete-state eligibility, copy feedback and fallback.

See [architecture](docs/architecture.md), [state serialization](docs/state-serialization.md),
[local persistence](docs/local-persistence.md), [shareable URLs](docs/shareable-urls.md) and
[share UX](docs/share-ux.md).

---

Release-candidate verification

The current v1.2 candidate has:

- 167 passing Node tests;
- 39 JavaScript files passing syntax checks;
- 36 passing Playwright executions across 1440×900, 768×1024 and 390×844;
- local Lighthouse scores of 93/100/100/100 mobile and 94/100/100/100 desktop, ordered as
  Performance/Accessibility/Best Practices/SEO; and
- no production dependency beyond browser platform APIs.

Automated coverage includes serialization and hostile-input rejection, storage failures, resume and
restart behavior, partial/complete URL import, URL/local precedence, current recommendation
recalculation, imported-state editing and comparison, Clipboard API fallback, keyboard focus and
responsive containment.

Safari, physical iPhone, VoiceOver, a representative Windows screen reader, physical-device input
and deployed-site checks remain pending and are not claimed by viewport automation. See the
[v1.2 release checklist](docs/release-v1.2.md) and [testing report](docs/testing.md).
