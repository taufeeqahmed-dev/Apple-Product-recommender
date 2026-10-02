import { deepFreeze } from "./product-schema.js";
import { QUESTION_DEFINITIONS } from "./questionnaire-definition.js";

// These ordered lists describe existing output fields and evidence connections.
// They contain no scoring weights, suitability matrices or ranking thresholds.
const COMPONENT_ORDER = Object.freeze([
  "workload", "primaryUses", "multitaskingMemory", "portabilityWeight",
  "screenSize", "externalDisplays",
]);
const FACT_PATHS = Object.freeze([
  "price.amountMinor", "facts.chip.id", "facts.unifiedMemoryGb", "facts.storageGb",
  "facts.marketedScreenSizeInches", "facts.displayDiagonalInches", "facts.weightKg",
  "facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive",
]);
const FACT_PAIR_PATHS = Object.freeze([
  "price.amountMinor", "facts.weightKg", "facts.marketedScreenSizeInches",
  "facts.unifiedMemoryGb", "facts.storageGb",
]);
const FILTER_LINKS = deepFreeze([
  ["budget", "hardRequirements.budgetMaximumMinor", "price.amountMinor"],
  ["storage", "hardRequirements.storageMinimumGb", "facts.storageGb"],
  ["workload-capability", "hardRequirements.workloadCapabilityBand", "facts.chip.id"],
  ["workload-memory", "hardRequirements.memoryMinimumGb", "facts.unifiedMemoryGb"],
  ["weight", "hardRequirements.weightMaximumKg", "facts.weightKg"],
  ["screen-size", "hardRequirements.exactScreenSizeInches", "facts.marketedScreenSizeInches"],
  ["external-displays", "hardRequirements.externalDisplayMinimum",
    "facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive"],
]);
const REASON_FILTER_LINKS = deepFreeze([
  ["meets-budget", "budget"], ["meets-storage", "storage"],
  ["meets-external-displays", "external-displays"],
  ["meets-workload-minimum", "workload-capability"],
]);
const REFINEMENT_TRIGGERS = deepFreeze([
  ["budgetTarget", "no-fixed-target", "no-budget-target"],
  ["activities", "unsure", "unspecified-activities"],
  ["multitasking", "varies-unsure", "uncertain-multitasking"],
  ["portabilityPerformance", "let-northstar-decide", "delegated-device-balance"],
  ["screenSize", "no-preference", "no-screen-preference"],
  ["minimumStorage", "unsure", "unsure-storage"],
]);
const TERMINAL_STATUSES = Object.freeze([
  "budget-limited", "no-match", "invalid-input", "invalid-catalog",
]);

/** @typedef {{productId: string, resultGroup: "primary"|"stretch-alternative", rank: number, matchType: "exact"|"closest"|"stretch"}} MatchReference */
/** @typedef {{id: string, kind: "user-answer", controlId: string, optionId: string}} AnswerEvidence */
/** @typedef {{source: string, answerRef: string, value: number, attainsTarget: boolean}} WorkloadSignal */
/** @typedef {{id: string, kind: "derived-need", path: string, value: number, requirementMode: "preference"|"mandatory", inputRefs: string[], signals: WorkloadSignal[]}} NeedEvidence */
/** @typedef {{id: string, kind: "verified-fact", productId: string, path: string, sourceIndexes: number[]}} FactEvidence */
/** @typedef {{id: string, kind: "northstar-assessment", path: string, inputRefs: string[]}} AssessmentEvidence */
/** @typedef {AnswerEvidence|NeedEvidence|FactEvidence|AssessmentEvidence} Evidence */
/** @typedef {{code: string, answerEvidenceId: string, questionId: string}} RefinementOpportunity */
/** @typedef {{label: string, points: number, detailCoverage: number, reasonCodes: string[]}} InsightConfidence */
/** @typedef {{path: string, leadingFactId: string, runnerUpFactId: string}} FactPair */
/** @typedef {{component: string, difference: number}} ComponentAdvantage */
/** @typedef {{code: string, difference?: number, differenceMinor?: number, adjustment?: number}} DecidingFactor */
/** @typedef {{evidenceId: string, runnerUp: MatchReference, decidingFactor: DecidingFactor, leaderAdvantage: ComponentAdvantage|null, runnerUpAdvantage: ComponentAdvantage|null, fitGapBasisPoints: number, rankingGapBasisPoints: number, closeRanking: boolean, factPairs: FactPair[]}} RunnerUpComparison */
/**
 * @typedef {object} RecommendationInsights
 * @property {"ok"|"budget-limited"|"no-match"|"invalid-input"|"invalid-catalog"} status
 * @property {MatchReference|null} leadingMatch
 * @property {Evidence[]} evidence
 * @property {string[]} leadingReasons
 * @property {string[]} requirementChecks
 * @property {{status: "identified"|"none-identified"|"not-applicable", evidenceId: string|null}} mainCompromise
 * @property {RunnerUpComparison|null} runnerUpComparison
 * @property {InsightConfidence|null} confidence
 * @property {RefinementOpportunity[]} refinementOpportunities
 */

function requireContract(condition, message) {
  if (!condition) throw new TypeError(`Recommendation insights: ${message}`);
}

// Only module-generated, known paths reach this reader. No input strings are evaluated.
const read = (value, path) => path.split(".").reduce((current, key) => current?.[key], value);
const unique = (values) => [...new Set(values)];
const answerId = (controlId, optionId) => `answer:${controlId}:${optionId}`;
const needId = (path) => `need:${path}`;
const factId = (productId, path) => `fact:${productId}:${path}`;

function emptyInsights(status) {
  return {
    status,
    leadingMatch: null,
    evidence: [],
    leadingReasons: [],
    requirementChecks: [],
    mainCompromise: { status: "not-applicable", evidenceId: null },
    runnerUpComparison: null,
    confidence: null,
    refinementOpportunities: [],
  };
}

function collectAnswers(answers) {
  const evidence = [];
  const refinements = [];
  // Definition, control and option arrays are the canonical presentation order.
  for (const question of QUESTION_DEFINITIONS) {
    for (const control of question.controls) {
      const value = read(answers, control.answerPath);
      if (value === null || value === undefined || value === "") continue;
      const selected = Array.isArray(value) ? value : [value];
      requireContract(selected.every((id) => control.options.some((option) => option.id === id)),
        `unknown answer for ${control.id}.`);
      for (const option of control.options) {
        if (!selected.includes(option.id)) continue;
        const id = answerId(control.id, option.id);
        evidence.push({ id, kind: "user-answer", controlId: control.id, optionId: option.id });
        const trigger = REFINEMENT_TRIGGERS.find(([controlId, optionId]) =>
          controlId === control.id && optionId === option.id);
        if (trigger) {
          refinements.push({ code: trigger[2], answerEvidenceId: id, questionId: question.id });
        }
      }
    }
  }
  return { evidence, refinements };
}

function collectNeeds(profile, answers, answerEvidence) {
  const evidence = [];
  const refsFor = (controlId) => answerEvidence
    .filter((item) => item.controlId === controlId).map(({ id }) => id);
  const essential = (optionId) => answerId("essentialRequirements", optionId);
  const add = (path, requirementMode, getRefs, signals = []) => {
    const value = read(profile, path);
    requireContract(value !== undefined, `missing profile field ${path}.`);
    if (value === null) return;
    requireContract(Number.isFinite(value), `non-numeric need ${path}.`);
    evidence.push({
      id: needId(path), kind: "derived-need", path, value, requirementMode,
      inputRefs: unique(getRefs()), signals,
    });
  };

  requireContract(["preference", "mandatory"].includes(profile.workload.requirementMode),
    "unknown workload requirement mode.");
  for (const field of ["capabilityBand", "memoryGb"]) {
    const signals = profile.workload.evidence.map((signal) => {
      let answerRef;
      if (signal.source === "multitasking") {
        [answerRef] = refsFor("multitasking");
      } else {
        const [controlId, optionId, ...rest] = signal.source.split(".");
        requireContract(["primaryUses", "activities"].includes(controlId) && rest.length === 0,
          `unknown workload source ${signal.source}.`);
        answerRef = answerId(controlId, optionId);
      }
      requireContract(Number.isFinite(signal[field]), `missing ${field} signal.`);
      return {
        source: signal.source, answerRef, value: signal[field],
        attainsTarget: signal[field] === profile.workload[field],
      };
    });
    add(`workload.${field}`, profile.workload.requirementMode,
      () => signals.map(({ answerRef }) => answerRef), signals);
  }

  // Fixed need order; never enumerate profile object keys.
  add("preferences.budgetTargetMinor", "preference", () => refsFor("budgetTarget"));
  add("preferences.weightTargetKg", "preference",
    () => [essential("maximum-weight"), ...refsFor("maximumWeight")]);
  add("preferences.screenSizeInches", "preference", () => refsFor("screenSize"));
  add("preferences.externalDisplayCount", "preference",
    () => [essential("external-displays"), ...refsFor("externalDisplayCount")]);
  add("hardRequirements.budgetMaximumMinor", "mandatory", () =>
    answers.budget.mode === "strict"
      ? [...refsFor("budgetTarget"), ...refsFor("budgetMode")]
      : [...refsFor("budgetMode"), ...refsFor("absoluteBudget")]);
  add("hardRequirements.storageMinimumGb", "mandatory", () => refsFor("minimumStorage"));
  add("hardRequirements.workloadCapabilityBand", "mandatory",
    () => [needId("workload.capabilityBand"), essential("workload")]);
  add("hardRequirements.memoryMinimumGb", "mandatory",
    () => [needId("workload.memoryGb"), essential("workload")]);
  add("hardRequirements.weightMaximumKg", "mandatory",
    () => [needId("preferences.weightTargetKg"), essential("maximum-weight")]);
  add("hardRequirements.exactScreenSizeInches", "mandatory",
    () => [needId("preferences.screenSizeInches"), essential("exact-screen")]);
  add("hardRequirements.externalDisplayMinimum", "mandatory",
    () => [needId("preferences.externalDisplayCount"), essential("external-displays")]);
  return evidence;
}

function collectFacts(product) {
  const evidence = [];
  for (const path of FACT_PATHS) {
    if (read(product, path) === null || read(product, path) === undefined) continue;
    const sourceIndexes = [];
    product.sources.forEach((source, index) => {
      if (source.supportsFields.some((supported) =>
        path === supported || path.startsWith(`${supported}.`))) sourceIndexes.push(index);
    });
    // A source for a neighbouring field cannot establish this fact's provenance.
    if (sourceIndexes.length > 0) {
      evidence.push({ id: factId(product.id, path), kind: "verified-fact",
        productId: product.id, path, sourceIndexes });
    }
  }
  return evidence;
}

function componentInputs(key, component, context) {
  const { answers, profile, answerRefs, factRef } = context;
  if (!component.applied) {
    if (key === "screenSize") return answerRefs("screenSize");
    if (key === "portabilityWeight") return answerRefs("portabilityPerformance");
    return [];
  }
  switch (key) {
    case "workload":
      return [needId("workload.capabilityBand"), factRef("facts.chip.id")];
    case "primaryUses":
      return [...answerRefs("primaryUses"), factRef("facts.chip.id")];
    case "multitaskingMemory":
      return [needId("workload.memoryGb"), factRef("facts.unifiedMemoryGb")];
    case "screenSize":
      return [needId("preferences.screenSizeInches"), factRef("facts.marketedScreenSizeInches")];
    case "externalDisplays":
      return [needId("preferences.externalDisplayCount"),
        factRef("facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive")];
    case "portabilityWeight": {
      const refs = answerRefs("portabilityPerformance");
      const balance = answers.devicePreferences.portabilityPerformance;
      if (balance !== "let-northstar-decide") {
        if (balance !== "performance-first") refs.push(factRef("facts.weightKg"));
        if (balance !== "portability-first") refs.push(factRef("facts.chip.id"));
      }
      if (profile.preferences.weightTargetKg !== null) {
        refs.push(needId("preferences.weightTargetKg"), factRef("facts.weightKg"));
      }
      return refs;
    }
    default:
      throw new TypeError(`Recommendation insights: unknown component ${key}.`);
  }
}

function collectAssessments(match, index, group, output, answerEvidence, factEvidence) {
  const root = `${group === "primary" ? "matches" : "stretchMatches"}.${index}`;
  const prefix = `assessment:${group}:${match.productId}`;
  const evidence = [];
  const factRef = (path) => factEvidence.some((item) => item.id === factId(match.productId, path))
    ? factId(match.productId, path) : null;
  const answerRefs = (controlId) => answerEvidence
    .filter((item) => item.controlId === controlId).map(({ id }) => id);
  const add = (suffix, path, refs) => {
    requireContract(read(output, path) !== undefined, `missing assessment ${path}.`);
    const id = `${prefix}:${suffix}`;
    evidence.push({ id, kind: "northstar-assessment", path,
      inputRefs: unique(refs.filter((ref) => ref !== null)) });
    return id;
  };
  const componentRefs = new Map();
  for (const key of COMPONENT_ORDER) {
    const component = match.score.components[key];
    requireContract(component && typeof component.applied === "boolean",
      `missing component ${key}.`);
    componentRefs.set(key, add(`component:${key}`, `${root}.score.components.${key}`,
      componentInputs(key, component, {
        answers: output.input.answers, profile: output.profile, answerRefs, factRef,
      })));
  }
  const scoreRef = add("fit-score", `${root}.score.basisPoints`,
    COMPONENT_ORDER.filter((key) => match.score.components[key].applied)
      .map((key) => componentRefs.get(key)));
  const adjustmentRefs = answerRefs("budgetMode");
  if (output.profile.preferences.budgetTargetMinor !== null) {
    adjustmentRefs.push(needId("preferences.budgetTargetMinor"), factRef("price.amountMinor"));
  }
  const adjustmentRef = add("budget-adjustment", `${root}.rankingAdjustmentBasisPoints`, adjustmentRefs);
  const rankingRef = add("ranking-score", `${root}.rankingBasisPoints`, [scoreRef, adjustmentRef]);

  const filterRefs = new Map();
  match.passedFilters.forEach((code, filterIndex) => {
    if (["availability", "market", "complete-data"].includes(code)) return;
    const link = FILTER_LINKS.find(([filterCode]) => filterCode === code);
    requireContract(link, `unknown passed filter ${code}.`);
    filterRefs.set(code, add(`requirement:${code}`, `${root}.passedFilters.${filterIndex}`,
      [needId(link[1]), factRef(link[2])]));
  });

  const reasonRefs = match.reasons.map((reason, reasonIndex) => {
    let ref;
    if (reason.code.startsWith("strong-")) {
      ref = componentRefs.get(reason.code.slice("strong-".length));
    } else {
      const filterCode = REASON_FILTER_LINKS.find(([code]) => code === reason.code)?.[1];
      ref = filterRefs.get(filterCode);
    }
    requireContract(ref, `unsupported reason ${reason.code}.`);
    return add(`reason:${reason.code}`, `${root}.reasons.${reasonIndex}`, [ref]);
  });
  const compromiseRefs = match.compromises.map((compromise, compromiseIndex) => {
    let refs;
    if (compromise.code.startsWith("weaker-")) {
      const componentRef = componentRefs.get(compromise.code.slice("weaker-".length));
      requireContract(componentRef, `unsupported compromise ${compromise.code}.`);
      refs = [componentRef];
    } else if (["over-preferred-budget", "near-preferred-budget"].includes(compromise.code)) {
      refs = [needId("preferences.budgetTargetMinor"), factRef("price.amountMinor")];
    } else {
      requireContract(compromise.code === "storage-at-minimum",
        `unsupported compromise ${compromise.code}.`);
      refs = [needId("hardRequirements.storageMinimumGb"), factRef("facts.storageGb")];
    }
    return add(`compromise:${compromise.code}`, `${root}.compromises.${compromiseIndex}`, refs);
  });
  return { evidence, root, add, factRef, componentRefs, scoreRef, adjustmentRef, rankingRef,
    reasonRefs, requirementRefs: [...filterRefs.values()], compromiseRefs };
}

function copyDecidingFactor(factor) {
  requireContract(factor && typeof factor.code === "string", "missing deciding factor.");
  const { code } = factor;
  if (code === "tie-product-id") return { code };
  if (code === "tie-price") {
    requireContract(Number.isFinite(factor.differenceMinor), "missing price tie difference.");
    return { code, differenceMinor: factor.differenceMinor };
  }
  if (code === "stretch-budget-adjustment") {
    requireContract(Number.isFinite(factor.adjustment), "missing budget adjustment.");
    return { code, adjustment: factor.adjustment };
  }
  requireContract(["ranking-score", "total-score", "tie-compromises",
    ...COMPONENT_ORDER.map((key) => `tie-${key}`)].includes(code),
  `unsupported deciding factor ${code}.`);
  requireContract(Number.isFinite(factor.difference), "missing ranking difference.");
  return { code, difference: factor.difference };
}

function copyAdvantage(advantage) {
  if (advantage === null) return null;
  requireContract(advantage && COMPONENT_ORDER.includes(advantage.component)
    && Number.isFinite(advantage.difference), "invalid component comparison.");
  return { component: advantage.component, difference: advantage.difference };
}

function compareRunnerUp(matches, contexts, products, group, confidence) {
  if (matches.length < 2) return null;
  const [leader, runner] = matches;
  const [first, second] = contexts;
  const explanation = runner.rankingExplanation;
  requireContract(explanation?.comparedWithProductId === leader.productId,
    "runner-up annotation does not refer to this group's leader.");
  const factor = copyDecidingFactor(explanation.decidingFactor);
  let refs;
  if (factor.code === "ranking-score") refs = [first.rankingRef, second.rankingRef];
  else if (factor.code === "total-score") refs = [first.scoreRef, second.scoreRef];
  else if (factor.code === "stretch-budget-adjustment") {
    refs = [first.scoreRef, second.scoreRef, first.adjustmentRef, second.adjustmentRef];
  } else if (factor.code === "tie-compromises") {
    refs = [...first.compromiseRefs, ...second.compromiseRefs];
  } else if (factor.code === "tie-price") {
    refs = [first.factRef("price.amountMinor"), second.factRef("price.amountMinor")];
  } else if (factor.code === "tie-product-id") refs = [];
  else {
    const key = factor.code.slice("tie-".length);
    refs = [first.componentRefs.get(key), second.componentRefs.get(key)];
  }
  const evidenceId = second.add("ranking-decision", `${second.root}.rankingExplanation.decidingFactor`, refs);
  const factPairs = FACT_PAIR_PATHS.flatMap((path) => {
    const leadingFactId = first.factRef(path);
    const runnerUpFactId = second.factRef(path);
    return leadingFactId && runnerUpFactId && read(products[0], path) !== read(products[1], path)
      ? [{ path, leadingFactId, runnerUpFactId }] : [];
  });
  return {
    evidenceId,
    runnerUp: matchReference(runner, group),
    decidingFactor: factor,
    leaderAdvantage: copyAdvantage(explanation.largestDeficit),
    runnerUpAdvantage: copyAdvantage(explanation.advantage),
    fitGapBasisPoints: leader.score.basisPoints - runner.score.basisPoints,
    rankingGapBasisPoints: leader.rankingBasisPoints - runner.rankingBasisPoints,
    closeRanking: confidence.reasons.some(({ code }) => code === "close-ranking"),
    factPairs,
  };
}

function matchReference(match, resultGroup) {
  return { productId: match.productId, resultGroup,
    rank: resultGroup === "primary" ? match.rank : match.stretchRank,
    matchType: match.matchType };
}

/**
 * Project an existing engine result into immutable, structured insight evidence.
 * Requires the same validated catalogue used for the calculation. This is an
 * internal consumer, not a validator for imported state or a second recommender.
 * Terminal engine outcomes need no catalogue access. Inconsistent/unsupported
 * successful-output contracts throw TypeError instead of inventing explanations.
 *
 * Fact/assessment paths are references into the supplied pair, not copies of facts
 * or new judgements. Source indexes retain the original catalogue source order.
 * See docs/recommendation-insights.md for the complete contract and array ordering.
 * @param {{output: object, catalogue?: object}} input
 * @returns {Readonly<RecommendationInsights>} All nested objects and arrays are also frozen.
 */
export function buildRecommendationInsights({ output, catalogue } = {}) {
  requireContract(output && (output.status === "ok" || TERMINAL_STATUSES.includes(output.status)),
    "expected a supported engine outcome.");
  const result = emptyInsights(output.status);
  if (output.status !== "ok") return deepFreeze(result);

  requireContract(output.profile && output.input?.answers && Array.isArray(output.matches)
    && Array.isArray(output.stretchMatches), "incomplete successful output.");
  requireContract(Array.isArray(catalogue?.products), "the calculation's catalogue is required.");
  for (const key of ["schemaVersion", "region", "currency", "verifiedOn"]) {
    requireContract(output.catalogue?.[key] === catalogue[key], `catalogue ${key} mismatch.`);
  }
  requireContract(["high", "moderate", "low"].includes(output.confidence?.label)
    && Number.isFinite(output.confidence.points) && Number.isFinite(output.confidence.detailCoverage)
    && Array.isArray(output.confidence.reasons), "missing ranked confidence.");
  const group = output.matches.length > 0 ? "primary" : "stretch-alternative";
  const matches = (group === "primary" ? output.matches : output.stretchMatches).slice(0, 2);
  requireContract(matches.length > 0, "successful output has no eligible leader.");
  const products = matches.map((match, index) => {
    const reference = matchReference(match, group);
    requireContract(reference.rank === index + 1 && ["exact", "closest", "stretch"].includes(reference.matchType),
      "invalid same-group rank or classification.");
    const records = catalogue.products.filter(({ id }) => id === match.productId);
    requireContract(records.length === 1, `missing or ambiguous product ${match.productId}.`);
    requireContract(records[0].price.amountMinor === match.priceMinor, "catalogue price mismatch.");
    return records[0];
  });
  const answers = collectAnswers(output.input.answers);
  const needs = collectNeeds(output.profile, output.input.answers, answers.evidence);
  const facts = products.flatMap(collectFacts);
  const contexts = matches.map((match, index) =>
    collectAssessments(match, index, group, output, answers.evidence, facts));
  const comparison = compareRunnerUp(matches, contexts, products, group, output.confidence);
  const evidence = [...answers.evidence, ...needs, ...facts,
    ...contexts.flatMap((context) => context.evidence)];
  const ids = new Set(evidence.map(({ id }) => id));
  requireContract(ids.size === evidence.length, "duplicate evidence ID.");
  evidence.forEach((item) => {
    (item.inputRefs ?? []).forEach((id) => requireContract(ids.has(id), `unresolved evidence ${id}.`));
  });
  const [leading] = contexts;
  return deepFreeze({
    ...result,
    leadingMatch: matchReference(matches[0], group),
    evidence,
    leadingReasons: leading.reasonRefs,
    requirementChecks: leading.requirementRefs,
    mainCompromise: { status: leading.compromiseRefs.length > 0 ? "identified" : "none-identified",
      evidenceId: leading.compromiseRefs[0] ?? null },
    runnerUpComparison: comparison,
    confidence: { label: output.confidence.label, points: output.confidence.points,
      detailCoverage: output.confidence.detailCoverage,
      reasonCodes: output.confidence.reasons.map(({ code }) => code) },
    refinementOpportunities: answers.refinements,
  });
}
