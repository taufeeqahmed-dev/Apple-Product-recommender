import { deepFreeze } from "./product-schema.js";
import { getQuestionControl } from "./questionnaire-definition.js";

const LABELS = Object.freeze({
  "user-answer": "Your answer",
  "derived-need": "Northstar-derived need",
  "verified-fact": "Verified Apple fact",
  "northstar-assessment": "Northstar assessment",
});
const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" });
const read = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);

function requireValue(condition, message) {
  if (!condition) throw new TypeError(`Insight presentation: ${message}`);
}

function formatDate(value) {
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(value), "missing recorded source date.");
  return date.format(new Date(`${value}T00:00:00Z`));
}

function needText(node) {
  const mode = node.requirementMode === "mandatory" ? "must-have" : "preference";
  const value = node.value;
  switch (node.path) {
    case "workload.capabilityBand":
    case "hardRequirements.workloadCapabilityBand":
      return `Workload target from your selected uses, activities and multitasking (${mode}).`;
    case "workload.memoryGb":
    case "hardRequirements.memoryMinimumGb":
      return `${value} GB memory target (${mode}).`;
    case "preferences.budgetTargetMinor":
      return `${money.format(value / 100)} preferred budget target.`;
    case "hardRequirements.budgetMaximumMinor":
      return `${money.format(value / 100)} maximum permitted budget (must-have).`;
    case "hardRequirements.storageMinimumGb":
      return `${value} GB minimum built-in storage (must-have).`;
    case "preferences.weightTargetKg":
    case "hardRequirements.weightMaximumKg":
      return `${value} kg weight limit (${mode}).`;
    case "preferences.screenSizeInches":
    case "hardRequirements.exactScreenSizeInches":
      return `${value}-inch marketed screen size (${mode}).`;
    case "preferences.externalDisplayCount":
    case "hardRequirements.externalDisplayMinimum":
      return `${value} external monitor${value === 1 ? "" : "s"} with the built-in screen active (${mode}).`;
    default:
      throw new TypeError(`Insight presentation: unsupported need ${node.path}.`);
  }
}

function factText(node, product) {
  const value = read(product, node.path);
  requireValue(value !== null && value !== undefined, "referenced fact is missing.");
  switch (node.path) {
    case "price.amountMinor":
      return `${money.format(value / 100)} in the ${formatDate(product.price.snapshotDate)} price snapshot.`;
    case "facts.chip.id": return `${product.facts.chip.displayName} chip.`;
    case "facts.unifiedMemoryGb": return `${value} GB unified memory.`;
    case "facts.storageGb": return `${value} GB built-in storage.`;
    case "facts.marketedScreenSizeInches": return `${value}-inch marketed screen size.`;
    case "facts.displayDiagonalInches": return `${value}-inch display diagonal.`;
    case "facts.weightKg": return `${value} kg weight.`;
    case "facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive":
      return `Up to ${value} external monitor${value === 1 ? "" : "s"} with the built-in screen active.`;
    default: throw new TypeError(`Insight presentation: unsupported fact ${node.path}.`);
  }
}

/**
 * Present the approved transient insight contract. The original output is read
 * only to resolve existing assessment messages; it is never rescored or derived.
 * No DOM, storage, transport or engine invocation belongs in this module.
 */
export function buildRecommendationInsightPresentation(input) {
  const { insights, output } = input;
  requireValue(insights && output && insights.status === output.status, "outcome mismatch.");
  if (insights.status !== "ok") return null;
  const { catalogue } = input;
  const leader = insights.leadingMatch;
  requireValue(leader && Array.isArray(insights.evidence), "missing eligible leader.");
  const root = leader.resultGroup === "primary" ? "matches.0" : "stretchMatches.0";
  requireValue(read(output, root)?.productId === leader.productId, "leader reference mismatch.");
  const nodes = new Map(insights.evidence.map((node) => [node.id, node]));
  const products = new Map(catalogue.products.map((product) => [product.id, product]));
  const nodeFor = (id) => {
    const node = nodes.get(id);
    requireValue(node, `unresolved evidence ${id}.`);
    return node;
  };
  const assessmentFor = (id) => {
    const node = nodeFor(id);
    requireValue(node.kind === "northstar-assessment", "expected an assessment reference.");
    const annotation = read(output, node.path);
    requireValue(annotation !== undefined, "unresolved assessment path.");
    return { node, annotation };
  };
  const itemFor = (id, prefix) => {
    const { node, annotation } = assessmentFor(id);
    requireValue(node.path.startsWith(prefix) && typeof annotation.message === "string",
      "unsupported reason or consideration reference.");
    return { evidenceId: id, message: annotation.message, label: LABELS[node.kind] };
  };

  const reasons = insights.leadingReasons.map((id) => itemFor(id, `${root}.reasons.`));
  // Existing compromise nodes already follow the leader's engine array order.
  const considerations = insights.evidence
    .filter((node) => node.kind === "northstar-assessment" && node.path.startsWith(`${root}.compromises.`))
    .map((node) => itemFor(node.id, `${root}.compromises.`));
  const main = insights.mainCompromise;
  requireValue((main.status === "identified" && main.evidenceId === considerations[0]?.evidenceId)
    || (main.status === "none-identified" && main.evidenceId === null && considerations.length === 0),
  "main consideration reference mismatch.");
  const consideration = main.status === "identified"
    ? { status: main.status, ...considerations[0] }
    : { status: main.status, evidenceId: null, label: LABELS["northstar-assessment"],
      message: "Northstar identified no significant compromise for these answers." };

  let runnerUp = null;
  const comparison = insights.runnerUpComparison;
  if (comparison) {
    requireValue(comparison.runnerUp.resultGroup === leader.resultGroup, "cross-group comparison.");
    const runnerRoot = leader.resultGroup === "primary" ? "matches.1" : "stretchMatches.1";
    const runner = read(output, runnerRoot);
    const { node, annotation } = assessmentFor(comparison.evidenceId);
    requireValue(node.path === `${runnerRoot}.rankingExplanation.decidingFactor`
      && runner?.productId === comparison.runnerUp.productId
      && runner.rankingExplanation.comparedWithProductId === leader.productId,
    "runner-up deciding-factor reference mismatch.");
    requireValue(typeof annotation.message === "string", "missing deciding-factor wording.");
    const product = products.get(comparison.runnerUp.productId);
    requireValue(product, "missing runner-up product label.");
    const closeReason = comparison.closeRanking
      ? output.confidence.reasons.find(({ code }) => code === "close-ranking") : null;
    requireValue(!comparison.closeRanking || typeof closeReason?.message === "string",
      "missing close-ranking qualification.");
    runnerUp = {
      evidenceId: comparison.evidenceId,
      productLabel: `${product.displayName}, ${product.configurationName}`,
      message: annotation.code === "tie-product-id"
        ? "These options remain tied in Northstar’s assessment; their order does not indicate a stronger fit."
        : annotation.message,
      closeRankingMessage: closeReason?.message ?? null,
      label: LABELS["northstar-assessment"],
    };
  }

  const reachable = new Set();
  const visit = (id) => {
    if (reachable.has(id)) return;
    const node = nodeFor(id);
    reachable.add(id);
    (node.inputRefs ?? []).forEach(visit);
    (node.signals ?? []).forEach(({ answerRef }) => visit(answerRef));
  };
  [...reasons, ...considerations].forEach(({ evidenceId }) => visit(evidenceId));
  // Ranking facts/components are kept in existing ranking details. The brief's
  // runner sentence resolves its annotation, without displaying causal fact pairs.
  const evidence = insights.evidence.filter((node) => reachable.has(node.id)
    && node.kind !== "northstar-assessment").map((node) => {
    const row = { evidenceId: node.id, kind: node.kind, label: LABELS[node.kind],
      text: "", sources: [], signals: [] };
    requireValue(row.label, "unsupported provenance kind.");
    if (node.kind === "user-answer") {
      const control = getQuestionControl(node.controlId);
      const option = control?.options.find(({ id }) => id === node.optionId);
      requireValue(option, "missing answer label.");
      row.text = `${control.prompt} — ${option.label}`;
    } else if (node.kind === "derived-need") {
      row.text = needText(node);
      row.signals = node.signals.map((signal) => {
        const answer = nodeFor(signal.answerRef);
        const control = getQuestionControl(answer.controlId);
        const option = control?.options.find(({ id }) => id === answer.optionId);
        requireValue(option, "missing contributor label.");
        return { answerEvidenceId: signal.answerRef, answer: option.label,
          text: node.path === "workload.memoryGb" ? `${signal.value} GB memory signal`
            : "Workload signal",
          attainsTarget: signal.attainsTarget };
      });
    } else if (node.kind === "verified-fact") {
      const product = products.get(node.productId);
      requireValue(product, "missing evidence product.");
      row.text = factText(node, product);
      row.sources = node.sourceIndexes.map((index) => {
        const source = product.sources[index];
        requireValue(source?.supportsFields.some((path) =>
          node.path === path || node.path.startsWith(`${path}.`)), "unsupported fact source.");
        requireValue(/^https:\/\//.test(source.url), "unsupported source URL.");
        return { url: source.url, label: `Apple ${source.type.replaceAll("-", " ")} source for ${product.displayName}`,
          recordedDate: formatDate(source.verifiedOn) };
      });
      requireValue(row.sources.length > 0, "missing fact provenance.");
    }
    return row;
  });

  const confidenceLabel = insights.confidence?.label;
  requireValue(["high", "moderate", "low"].includes(confidenceLabel), "missing confidence label.");
  return deepFreeze({
    leadingMatch: { productId: leader.productId, resultGroup: leader.resultGroup,
      rank: leader.rank, matchType: leader.matchType },
    heading: "Why this fits",
    reasons: reasons.slice(0, 2),
    consideration,
    runnerUp,
    confidenceQualifier: confidenceLabel === "high" ? null
      : `Northstar confidence: ${confidenceLabel === "moderate" ? "Moderate" : "Low"}. See “How Northstar reached this result” below.`,
    details: { remainingReasons: reasons.slice(2), remainingConsiderations: considerations.slice(1), evidence },
  });
}
