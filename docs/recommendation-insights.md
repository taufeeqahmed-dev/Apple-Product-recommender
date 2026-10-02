# Recommendation insights: pure-layer contract

Implementation phase: v1.3 Decision Clarity, pure builder and tests only. The application does not
import or render this module yet. The v1.2.0 production baseline, catalogue, rules, questionnaires,
scores, ordering, confidence, persistence and shared URLs are unchanged.

## Boundary and input

```js
import { buildRecommendationInsights } from "./js/recommendation-insights.js";

const insights = buildRecommendationInsights({ output, catalogue });
```

`output` is an existing `recommendMacBooks` result. For `ok`, `catalogue` must be the **same validated
catalogue used to calculate that result**, including source records. The builder consumes
`output.input.answers`, `output.profile`, selected matches and existing ranking/confidence
annotations. It does not invoke the engine, derive a profile, validate imported state, apply rules,
sort candidates or calculate hypothetical recommendations. It has no DOM, storage, URL or network
access and adds no production dependency.

The result is a newly constructed, recursively frozen object, including every nested array, signal,
comparison and reference. Input objects are neither mutated nor frozen by the builder. The result
contains structured IDs, paths, numeric evidence and codes, without HTML or new narrative copy.
It is transient internal data, not another persisted or shared schema.

The builder checks catalogue metadata, selected product IDs/prices and supported engine fields.
Inconsistent or unsupported successful contracts throw `TypeError`. These checks cannot prove
that all catalogue facts match an earlier calculation: the current engine does not include a full
catalogue fingerprint. Supplying the original pair remains a caller precondition. No upstream
contract changes are required. Error handling for future UI integration is outside this phase.

## Root contract

All fields below are always present. JSDoc types are also provided in the module.

| Field | Meaning and source |
| --- | --- |
| `status` | Existing engine status: `ok`, `budget-limited`, `no-match`, `invalid-input`, `invalid-catalog`. The last spelling is the current engine contract. |
| `leadingMatch` | Match reference for the first primary result, or first stretch alternative if primary results are empty; otherwise `null`. |
| `evidence` | Ordered evidence nodes with unique IDs and explicit provenance kinds. Empty for terminal outcomes. |
| `leadingReasons` | IDs of Northstar assessment nodes referencing the leader's existing reasons, in engine order; no extra or reselected reasons. |
| `requirementChecks` | IDs of assessment nodes for the leader's user-dependent passed hard filters, in engine order. Catalogue-wide availability, market and complete-data checks are omitted. |
| `mainCompromise` | `{status, evidenceId}`. `identified` references the first existing leader compromise, including a minor one; `none-identified` means the eligible leader has no listed compromise; `not-applicable` is terminal. The ID is `null` for the latter two states. |
| `runnerUpComparison` | Existing annotations and contextual fact references for candidate two in the same group, or `null` when that candidate is absent. |
| `confidence` | Existing `{label, points, detailCoverage, reasonCodes}`; label is `high`, `moderate` or `low`, and reason codes retain engine order. No recalculation or new confidence threshold. Terminal outcomes use `null`. |
| `refinementOpportunities` | Ordered `{code, answerEvidenceId, questionId}` objects for selected reduced-specificity answers. No predicted improvement or result change. |

A match reference is `{productId, resultGroup, rank, matchType}`. `resultGroup` is `primary` or
`stretch-alternative`; `rank` copies the applicable engine `rank` or `stretchRank`; `matchType` copies
`exact`, `closest` or `stretch`. A Stretch-mode candidate can have group `primary` and type `stretch`.
Selection never compares the two groups, even when a stretch alternative has a higher fit.

Every terminal status returns exactly this shape, with the relevant status substituted:

```js
{
  status: "no-match",
  leadingMatch: null,
  evidence: [],
  leadingReasons: [],
  requirementChecks: [],
  mainCompromise: { status: "not-applicable", evidenceId: null },
  runnerUpComparison: null,
  confidence: null,
  refinementOpportunities: []
}
```

Terminal projection does not read the catalogue. Even the numeric low-confidence fallback present
in invalid engine outputs is suppressed. Budget-limited alternatives and blockers are not turned
into eligible recommendations, evidence or suggestions by this layer.

## Evidence provenance

Each node has `id` and one of four `kind` values. References connect evidence; they do not establish
counterfactual causes or claim that every referenced answer independently changed the ranking.

| Kind | Additional fields | Interpretation |
| --- | --- | --- |
| `user-answer` | `controlId`, `optionId` | One selected option from the engine's validated answer snapshot. IDs resolve through existing questionnaire definitions. |
| `derived-need` | `path`, numeric `value`, `requirementMode`, `inputRefs`, `signals` | Existing Northstar-derived numeric profile field. `path` is relative to `output.profile`; mode is `preference` or `mandatory`. Null profile fields produce no node. |
| `verified-fact` | `productId`, `path`, `sourceIndexes` | Contextual reference into that catalogue product. Fact values, prices, dates and URLs are not copied into a new data source. |
| `northstar-assessment` | `path`, `inputRefs` | Existing engine component, score, adjustment, filter, reason, compromise or deciding factor. `path` is relative to `output`, such as `matches.0.score.components.workload`. |

IDs use `answer:<control>:<option>`, `need:<profile-path>`, `fact:<product>:<catalogue-path>` and
`assessment:<group>:<product>:<assessment-key>`. All `inputRefs`, signal `answerRef` values and root
evidence selectors resolve within the result's evidence array. IDs remain stable for their meaning;
paths identify their location in the supplied calculation and must not be persisted across runs.

Workload need nodes copy **all** existing `profile.workload.evidence` signals for capability or
memory as `{source, answerRef, value, attainsTarget}`. `attainsTarget` means equality with the existing
maximum target, not sole causation: Docker and heavy multitasking can both attain 24 GB. Removing
either answer has no predicted effect here. Other needs have `signals: []`. Hard workload/memory,
weight, exact-screen and display nodes explicitly reference the corresponding Essential choice.
Budget and storage retain the current engine's existing hard-requirement semantics.

Derived need units come from their existing paths: budget amounts in GBP minor units, memory and
storage in GB, weight in kg, screen size in inches, display count as a count, and capability band as
a Northstar ordinal assessment. No unit or price conversion is introduced.

Verified-fact nodes require a non-null catalogue value and at least one source whose
`supportsFields` covers that exact path or a dot-separated ancestor. For example, `facts.chip`
supports `facts.chip.id`, while `facts.weight` cannot support `facts.weightKg`. `sourceIndexes` retain
the product's original source-array order. Missing provenance omits that contextual node and any
pair requiring it; the builder never invents a source. These checks preserve existing catalogue
provenance and do not constitute fresh verification of Apple's pages or current prices.

An engine reason such as “meets budget” can be marked `verified-fact` in the original engine
contract. Its insight wrapper is a **Northstar assessment**, since comparing a sourced price with
a user's limit is a compound judgement. Its referenced price remains a separate verified fact and
the original reason is unchanged. Capability suitability, component scores, confidence and
classifications always remain Northstar assessments, never Apple claims.

## Runner-up comparison

Only the first two candidates from the chosen group are used. A single primary candidate produces
`null`, even when multiple stretch alternatives exist. A stretch-only result compares its first and
second stretch candidates. The runner's `comparedWithProductId` must identify that group's leader.

| Field | Source and meaning |
| --- | --- |
| `evidenceId` | Assessment reference to the runner's existing `rankingExplanation.decidingFactor`. This explicit reference completes the comparison's evidence connection. |
| `runnerUp` | Same-group match reference, rank two. |
| `decidingFactor` | Existing factor code and numeric payload only; no copied message or new causal narrative. |
| `leaderAdvantage` | Existing runner annotation `largestDeficit`, reduced to `{component, difference}`, or `null`. |
| `runnerUpAdvantage` | Existing runner annotation `advantage`, reduced to `{component, difference}`, or `null`. |
| `fitGapBasisPoints` | Leader's existing fit basis points minus runner's. Can be negative when the existing budget adjustment decides ranking. |
| `rankingGapBasisPoints` | Difference between existing budget-adjusted ranking basis points. |
| `closeRanking` | Whether the existing confidence reason codes include `close-ranking`; not a new gap threshold. High confidence and a close ranking can coexist. |
| `factPairs` | Differing, source-supported facts for context: `{path, leadingFactId, runnerUpFactId}`. Equal facts and unsupported pairs are omitted. |

Supported deciding factors are `ranking-score`, `total-score`, six `tie-<component>` codes,
`tie-compromises`, `tie-price`, `tie-product-id` and `stretch-budget-adjustment`. The builder copies
`difference`, `differenceMinor` or `adjustment` according to the existing code. It does not rerun the
engine's comparator. Score/adjustment differences are in existing percentage points; component
differences are component points; compromise differences are counts; price differences are minor
currency units. Gaps explicitly ending in `BasisPoints` use integer basis points.

Component advantages are existing unweighted component comparisons, not necessarily the factor
that decided ordering. In particular, `portabilityWeight` blends performance and portability: a
leader can score better on that component while being heavier. A weight fact pair cannot justify
calling it lighter. Fact pairs never independently explain the ranking. A price-related ranking
claim requires the engine's corresponding annotation; the existence of a price pair is insufficient.

## Deterministic ordering

There is no semantic reliance on object-key enumeration. Fixed lists and existing ordered arrays
determine all output arrays. The same calculation/catalogue pair produces equal output regardless
of object insertion order or catalogue product-array order.

`evidence` consists of these contiguous groups:

1. **User answers:** questionnaire definition-array order, then each question's control-array order,
   then each control's option-array order. Multi-select click order does not determine this group.
2. **Derived needs:** the following fixed path order, skipping null values:
   `workload.capabilityBand`, `workload.memoryGb`, `preferences.budgetTargetMinor`,
   `preferences.weightTargetKg`, `preferences.screenSizeInches`, `preferences.externalDisplayCount`,
   `hardRequirements.budgetMaximumMinor`, `hardRequirements.storageMinimumGb`,
   `hardRequirements.workloadCapabilityBand`, `hardRequirements.memoryMinimumGb`,
   `hardRequirements.weightMaximumKg`, `hardRequirements.exactScreenSizeInches`,
   `hardRequirements.externalDisplayMinimum`.
3. **Verified facts:** leader then runner, each in this fixed path order:
   `price.amountMinor`, `facts.chip.id`, `facts.unifiedMemoryGb`, `facts.storageGb`,
   `facts.marketedScreenSizeInches`, `facts.displayDiagonalInches`, `facts.weightKg`,
   `facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive`. Unsupported/null fields are skipped.
4. **Assessments:** leader then runner. Each uses components in fixed order `workload`, `primaryUses`,
   `multitaskingMemory`, `portabilityWeight`, `screenSize`, `externalDisplays`; then fit score,
   budget adjustment, ranking score, user-dependent passed filters, reasons and compromises.
   Filters, reasons and compromises keep their engine-array order. The comparison deciding-factor
   node, when present, is last in the runner's assessments.

`leadingReasons` and `requirementChecks` preserve the corresponding leader engine-array order.
`mainCompromise` selects the first existing compromise without another severity sort.
`refinementOpportunities` follows the same definition/control/option order as answer evidence.
Confidence reason codes and workload signals keep their original engine/profile array order.
`inputRefs` retain first occurrence in explicit construction order: selected answers in definition
order, workload signals in profile order, and need/fact or assessment links in the documented field
order. Duplicate links are removed without sorting. Catalogue source indexes retain source order.

Fact pairs have a separate fixed order: price, weight, marketed screen size, memory, storage.
They do not inherit arbitrary catalogue object order or determine either candidate's rank.

## Non-predictive refinements

| Selected control/option | Code | Existing question edit destination |
| --- | --- | --- |
| `budgetTarget` / `no-fixed-target` | `no-budget-target` | `budget` |
| `activities` / `unsure` | `unspecified-activities` | `activities` |
| `multitasking` / `varies-unsure` | `uncertain-multitasking` | `multitasking` |
| `portabilityPerformance` / `let-northstar-decide` | `delegated-device-balance` | `devicePreferences` |
| `screenSize` / `no-preference` | `no-screen-preference` | `devicePreferences` |
| `minimumStorage` / `unsure` | `unsure-storage` | `minimumStorage` |

These identify existing reduced-specificity choices and a place to review them. They contain no
recommended replacement, projected score, confidence increase or promise of a different product.
They can exist at high confidence. Missing optional absolute budget and “None” for Essentials are
not treated as uncertainty. No extra contribution is fabricated for an `unsure` workload activity.

## Representative regression scenarios

The fixtures in `tests/fixtures/recommendation-insight-scenarios.js` use the unchanged dated
catalogue. These are test observations, not freshly verified prices or new suitability rules.

| Scenario | Evidence and retained result |
| --- | --- |
| Everyday study and portability | Selected study/activity answers and moderate multitasking support the existing 16 GB target; Air 13 remains first at 100.00. Equal-fit runner ordering uses the existing compromise-count tie. |
| Docker and local databases | Docker supplies 24 GB, databases 16 GB and heavy multitasking 24 GB. Both 24 GB signals attain the target. M5 Pro 14 remains first at 94.93; workload preference remains soft without an Essential choice. |
| Multiple cybersecurity VMs | Three-plus VMs and very-heavy multitasking support the existing stronger workload/memory needs. M5 Max 14 remains first at 98.24; the runner's annotation identifies the screen component advantage. |
| Photo and video | The creative activities and heavy multitasking remain separate signals. Heavy multitasking attains the 24 GB memory target. M5 Max 16 remains first at 96.47, with its existing blended portability/performance advantage; a contextual weight pair does not claim it is lighter. |
| Essential workload | Hard capability/memory nodes link the workload needs to `essentialRequirements:workload`. The eligible M5 Pro 14 retains its 94.93 score; the single candidate has no runner comparison. |
| Portability compromise | M5 Pro 14 remains a Closest match at 89.41. The first major portability compromise is referenced directly. A soft 13-inch preference is not described as an exact-screen hard requirement. |
| Uncertain answers | The Neo 13 result retains moderate confidence, 57 points. Six refinement opportunities refer to existing choices; none predicts a new result. |
| Close ranking | Air 15 leads Air 13 by 353 fit basis points. Existing screen and portability advantages are preserved alongside high confidence, 88 points, and the existing close-ranking flag. |

## Verification and phase boundary

Unit tests cover deterministic ordering, all evidence references, deep freezing and detachment,
source coverage, workload contributors, hard versus soft needs, classifications/compromises,
unapplied components, same-group selection, negative raw-fit gaps, ties, non-predictive refinements,
all terminal outcomes and explicit contract failures. Synthetic duplicate configurations and rare
annotation fixtures are labelled as tests; they do not modify production facts or ranking rules.

Eight quality regressions pair readable expected leaders, fits, classifications, confidence and
deciding-factor codes with SHA-256 digests of the **complete** engine JSON output captured at the
unchanged `c133db9` baseline before the builder was implemented. They also compare full outputs
before/after projection and a fresh calculation. Digest changes require inspecting the full engine
change; do not refresh them merely to make an insight test pass.

Current local results are recorded in [testing.md](testing.md). Existing browser tests are regression
checks for the unchanged application, not tests of a visible insight interface. Rendering, focus,
announcements, responsive presentation and edit actions require a separately approved phase and
future UI/browser coverage. No results module or application wiring changes belong in this phase.
