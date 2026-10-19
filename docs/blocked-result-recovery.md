# Blocked-result recovery

The approved Northstar v1.3 recovery phase adds deliberate answer-edit routes for `budget-limited`
and `no-match` results. It was developed from `main` at `5081aec` after PR #9. Northstar explains
existing constraints; only the user chooses whether to change an answer. No automatic relaxation,
budget increase, hypothetical preview, reranking or product substitution exists.

## Pure boundary

```js
const recovery = buildRecommendationRecovery({ output });
```

`js/recommendation-recovery.js` consumes the existing engine result. It has no DOM, engine invocation,
copied rules, catalogue calculations, storage, URL or network access. It uses the existing answer
validator and visibility helpers to check edit routes. For defensive consistency validation only,
it calls `deriveQuestionnaireProfile(answers)`, the existing source of answer-to-requirement mappings.
That checked profile never replaces supplied evidence or calculates recommendations or eligibility.

The output is newly constructed, detached and deeply frozen. The engine output is neither changed
nor frozen by this helper. This transient model is not a persistence or shared-state schema.

| Field | Contract |
| --- | --- |
| `status` | Original engine outcome, unchanged |
| `explanation` | Neutral terminal context; `null` for other outcomes |
| `blockers` | Active supported requirements with reported failed-filter evidence |
| `actions` | Existing question IDs, labels and related blocker codes, deduplicated by question |
| `notices` | Catalogue limitations or unsupported engine checks, with no edit actions |
| `budgetContext` | Original mode, preferred target, maximum and excluded budget alternatives; otherwise `null` |

Each blocker contains its engine `code`, display `label`, `summary`, numeric `requirement`
(`kind`, `value`, `unit`), `answerReferences`, `evidenceReferences` and nullable `questionId`.
Answer references retain original control IDs, answer paths, detached values and definition labels.
Failure references identify the original product, `exclusions[index].failedFilters[index]` path and
engine judgement. Workload targets are labelled Northstar assessments; selected answers remain
user answers. No Apple fact or new causal ranking claim is created.

A blocker requires an active hard requirement, a matching exclusion, a positive diagnostic blocker
count and inclusion in `diagnostics.appliedFilterCodes`. Essential filters also require the explicit
corresponding Essential selection. Counts corroborate failures; they never score importance or prove
that one answer is the only reason no product matched. Missing or invalid answers yield explanatory
content without manufactured actions. Unsupported outcome contracts throw at the optional boundary.

Each supplied requirement must agree with the existing profile helper's interpretation of the
validated answers and every matching failed-filter threshold. Filter references must also retain
the expected engine judgement. A contradictory blocker and its action are omitted; other supported
blockers remain available. No replacement value or evidence is fabricated.

## Supported edits and ordering

| Engine filter | Existing question destination | Action |
| --- | --- | --- |
| `budget` | `budget` | Review budget |
| `storage` | `minimumStorage` | Edit storage requirement |
| `workload-capability` | `essentialRequirements` | Review must-haves |
| `workload-memory` | `essentialRequirements` | Review must-haves |
| `weight` | `maximumWeight` | Review weight limit |
| `screen-size` | `devicePreferences` | Review screen size |
| `external-displays` | `externalDisplayCount` | Review monitor requirement |

For `no-match`, blockers follow the engine's applied-filter array: budget, storage, workload
capability, workload memory, weight, screen and monitors. Evidence references retain exclusion and
failed-filter array order; answer references use each mapping's explicit control order. Actions use
first blocker occurrence and deduplicate by destination. Object-key order is not an ordering rule.

When more than one Essential selection is implicated, one **Review must-haves** action groups them.
Specific visible value editors remain available. Hidden detail destinations are never manufactured;
the existing Essential selection editor is used only where safe, or the action is omitted. Invalid
dependent-answer states conservatively receive no actions.

Availability, market, incomplete-data, complete-data and unknown checks do not get edit actions.
Catalogue notices use a fixed order, with any unsupported-check notice last. Confidence labels,
preferences and reduced-specificity answers are not recovery blockers.

For `budget-limited`, only budget is offered: the engine already supplies configurations that meet
other must-haves above the permitted maximum. Its sorted `budgetLimitedAlternatives` are preserved
as excluded context. Strict mode uses the target as the maximum; flexible/stretch mode keeps the
preferred target separate from an explicit absolute maximum. No budget advice is inferred without
that context. Eligible stretch results remain `ok` and receive no terminal recovery panel.

Every budget alternative must identify one existing exclusion with budget as its only recorded
failure. Its price and limit must match that failure's details, and its over-limit amount must be a
positive safe integer equal to the recorded price minus the permitted maximum. Duplicate references,
negative/non-finite amounts and contradictory context cause the entire optional budget context and
budget action to be omitted. The original terminal result and general answer review remain available.

`ok`, `invalid-input` and `invalid-catalog` return explicit empty arrays and null context/explanation.
They keep their existing result behaviour. A recoverable terminal with no reliable route explains
that limitation without blaming an answer or promising that an edit will produce a match.

## Rendering, editing and state

`app.js` builds recovery after the engine calculation for supported terminals. `results.js` places
**Review blocking requirements** before **Review your answers**. Requirement explanations remain
visible. More than three actions place the specific value editors in a native closed **Review
individual requirements** disclosure; budget, storage and grouped must-have actions remain visible.
The panel replaces the old diagnostic count list, rather than repeating both explanations.

Every action calls the existing `onEditAnswer(questionId, button)` route. Existing answers are
selected; no replacement is preselected. Save uses existing reconciliation and recalculates once.
The new output replaces the previous panel and retains results-heading focus. Unchanged Save may
legitimately return the same terminal outcome.

The central edit-entry callback checks completed state, current question visibility and a connected,
enabled originating control in the current results. Repeated/stale callbacks cannot overwrite a draft.
During an edit, native recovery and general answer-edit buttons are disabled. A visible, non-live
instruction points to the existing Save/Cancel controls; it adds no announcement. Cancel re-enables
the buttons, while Save renders fresh enabled controls. No separate edit transaction or cache exists.

Cancel reuses PR #9: original answers and the canonical completed position return, existing terminal
DOM remains available, and focus returns to the originating button if visible. If its disclosure was
closed, focus returns to the visible summary without reopening it. A removed/replaced or otherwise
hidden origin falls back to the current results heading. The existing editor's return-focus slot
uses this results-layer focus adapter; questionnaire state and cancellation logic are unchanged.
Draft changes and cancellation do not write saved bytes or shared fragments. Recovery models, action
IDs and disclosure state never enter serialization, localStorage or shared URLs. Restoration and
shared adoption recalculate the engine output and reconstruct recovery through the normal completion path.

Optional model/panel construction failures retain the existing terminal explanation and answer
editors. Invalid results never become recommendations. Successful cards and the Decision Brief are
outside this recovery path.

## Accessibility and verification

The panel is a labelled section with an h3, h4 requirement headings, native buttons and optional
details/summary. It adds no live region, focus trap or custom keyboard navigation. New controls have
at least 44×44 CSS px targets; the layout stays single-column, wraps long content and uses existing
visible focus and reduced-motion rules.

Unit, recorded-DOM and Playwright coverage is documented in [testing.md](testing.md). Automated Edge
viewport and keyboard checks and screenshot inspection do not establish physical iPhone/Safari,
VoiceOver, Narrator or actual 200% browser zoom behaviour; those manual checks remain outstanding.

Recommendation rules, rankings, scores, eligibility, product data, questionnaire schema 3, state
schema 1, URL transport 1, persistence/share formats and application version 1.2.0 are unchanged.
Broader comparison redesign, successful-result refinement actions and scenario simulation remain
outside this phase.
