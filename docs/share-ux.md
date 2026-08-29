# Northstar share and copy-link experience

Status: v1.2 Phase 4 review candidate; implemented locally, uncommitted and awaiting review

## Product policy

Northstar exposes sharing only after a questionnaire reaches validated `complete` state. The visible
action is **Share results**. Phase 3 continues to support valid partial links for transport,
integration and future use, but Phase 4 adds no partial-sharing control to the questionnaire. This
keeps the main journey focused on reaching a recommendation and avoids presenting an unfinished set
of choices as a result.

The results UI does not define another state or URL format. `js/results-share.js` accepts only a
Phase 1-valid complete state and delegates URL creation to the Phase 3 exporter. Recommendation
output, scores, confidence, product IDs, catalogue records and display labels remain outside the
link.

## Visible flow

The secondary **Share results** action follows the recommendation, comparison, explanation and
answer-review content. Activating it reveals a named inline region rather than a modal. The region
contains the privacy explanation and a primary **Copy link** button.

When the Clipboard API succeeds, the interface displays and politely announces:

> Recommendation link copied.

Focus remains on **Copy link**. Starting another copy attempt, closing sharing, editing answers,
rendering a new result or restarting clears the previous feedback and generated field value.

When the Clipboard API is missing, throws or rejects, questionnaire use continues normally. The
interface displays and announces:

> Copy this link manually.

A labelled readonly textarea then receives the generated URL. Focus moves to that field and its
contents are selected so keyboard users can use the browser or operating-system copy command. The
URL is assigned through the field's value property and is never interpreted as HTML.

## Privacy wording

The primary disclosure is:

> Anyone with this link can view the questionnaire choices included in it.

Supporting text explains that the link contains no account or saved browser metadata, is encoded
rather than encrypted/private, and causes Northstar to recalculate recommendations when opened.
The link is therefore a portable copy of validated decision IDs, not private storage or a frozen
historical recommendation.

## Imported and invalid links

A valid shared link retains Phase 3's explicit adoption step. If a browser already contains saved
progress, the panel states that it remains untouched until the visitor continues with the shared
answers; adoption then makes those choices the active locally saved session.

After a partial link is adopted, the live questionnaire message says that the answers came from a
shared link and invites the visitor to continue. After a complete link is adopted, results include
the visible notice **Shared recommendation loaded** and explain that the current verified catalogue
was used to recalculate the result. The result announcement includes the same loaded-state cue.

An invalid, malformed, incompatible, oversized or tampered link shows **This shared link couldn’t be
used** without exposing the payload or parser details. Browser-local progress remains untouched
until the visitor chooses to continue normally, preserving the Phase 3 precedence contract.

## Accessibility and responsive behavior

- Share controls are native buttons with visible focus styles and an `aria-expanded` relationship to
  the inline share region.
- Opening sharing moves focus to its heading; closing it with **Close sharing** returns focus to the
  trigger. There is no focus trap.
- Copy feedback uses a polite, atomic status region. Successful copying does not move focus; manual
  fallback focus is deliberate and its textarea has a programmatic label and instructions.
- The panel is part of normal document flow and inherits Northstar's reduced-motion behavior.
- At narrow widths, actions reflow to comfortable full-width targets. The readonly URL wraps inside
  its container and cannot introduce page-level horizontal scrolling.
- Playwright viewport projects verify keyboard use and containment, but representative screen-reader,
  zoom/reflow, physical-device and Safari testing remain manual release checks.

## Progressive enhancement decision

Phase 4 does not use `navigator.share`. Native share sheets have platform-specific cancellation and
automation behavior but do not remove the need for Copy link or its fallback. Omitting the Web Share
API keeps this phase focused and gives every supported browser the same complete path. It can be
evaluated later as an optional enhancement without changing the state or URL contracts.
