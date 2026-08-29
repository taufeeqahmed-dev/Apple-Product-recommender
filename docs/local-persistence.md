# Northstar local questionnaire persistence

Status: v1.2 Phase 2 internal contract; implemented locally, uncommitted and awaiting review

## Boundary and storage key

`js/questionnaire-persistence.js` is the only production module that accesses browser storage. It
uses the fixed, namespaced key:

```text
northstar.questionnaire-state.v1
```

The key is not derived from user input. The suffix identifies the storage contract generation;
the payload still carries the independent questionnaire-state and questionnaire-schema versions
defined by Phase 1.

The stored value is the canonical JSON returned by `serializeQuestionnaireState`. No second local
format exists. It contains only stable questionnaire/control and option IDs, the current stable
question ID, `in-progress` or `complete` status, and the two compatibility versions. It excludes
DOM state, focus, validation messages, editing state, labels, recommendation output, scores,
confidence, product IDs chosen by the engine, product records and Apple facts.

## Save policy

Northstar makes a best-effort save after meaningful stable questionnaire changes: valid answer
changes, forward/back navigation, completion and a completed results edit. The active state is
first reconstructed and validated through the Phase 1 contract. `editing`, malformed or otherwise
invalid state is not written. Equal canonical JSON is detected and does not cause another write.

Storage failures never block answering, navigation, completion or recommendation calculation.
No initial empty questionnaire is auto-saved.

When more than one tab is open, the most recently saved valid state wins. Phase 2 does not listen
for storage events or synchronize live tabs. A still-open older tab can therefore overwrite a
newer state after its next meaningful change.

## Load, resume and completion

On a fresh page load, a stored value is read once and parsed by the Phase 1 size, syntax,
compatibility and state validators. A valid non-empty snapshot produces an explicit “Continue
where you left off?” choice; it is not adopted silently. Valid but non-canonical JSON is rewritten
to the canonical Phase 1 representation when storage remains writable.

- **Continue:** the validated state is reconstructed through the questionnaire-state restore API.
  An in-progress questionnaire returns to its stored adaptive step. A complete questionnaire
  restores only its answers and recalculates recommendations using the current compatible engine
  and verified catalogue.
- **Start again:** stored state is cleared and a fresh questionnaire is focused at the first step.
- **Confirmed Restart questionnaire:** stored state is cleared before the normal reset.
- **Cancelled Restart questionnaire:** neither active nor stored state is cleared.

Completed answer state deliberately remains saved, so a later visit can offer to restore that
session. Recommendation output is never cached.

## Corruption and failure policy

Missing storage, denied access, quota failures and exceptions from read/write/remove operations are
returned as small status results rather than thrown into the application.

Malformed, oversized, incompatible or stale stored values are ignored. Northstar attempts to
remove them so the visitor is not repeatedly offered broken progress. If removal fails but writing
is available, explicit clearing replaces the old value with a canonical empty initial state; that
state is treated as empty and never produces a resume prompt. If a browser refuses both removal
and writing, the current questionnaire still starts clean and an accessible status message avoids
claiming that browser data was cleared.

Arbitrary stored objects are never merged into private questionnaire state, and decoded text is
never rendered as labels or HTML. All displayed wording continues to come from trusted internal
markup and questionnaire definitions.

## Privacy model

The resume prompt states:

> Your questionnaire progress is saved only in this browser on this device. It is not uploaded to
> Northstar and is not linked to an account or cloud sync.

This is browser persistence, not secure storage. Anyone with access to the same browser profile or
its site data may be able to inspect the stable answer IDs. Northstar stores no account identifier
and no information beyond the minimum decision state needed to resume.

Browser storage is scoped to the page origin rather than a URL path. The fixed Northstar key and
relative application assets remain compatible with GitHub Pages subdirectory deployment; no root
path, repository path or shared-URL behavior is encoded into the persistence boundary.

## Phase boundary

Phase 2 adds no URL import/export, shared-link adoption, Clipboard API use or copy/share controls.
Those concerns remain outside this implementation.
