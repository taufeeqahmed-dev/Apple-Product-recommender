import { deepFreeze as freezeCatalogueOutput, validateProductCatalogue } from "./product-schema.js";
import { getQuestionDefinition } from "./questionnaire-definition.js";
import {
  deriveQuestionnaireProfile,
  getAnswerValue,
  validateQuestionnaireAnswers,
} from "./questionnaire-profile.js";
import {
  CAPABILITY_BANDS,
  COMPONENT_LABELS,
  COMPROMISE_COMPONENT_THRESHOLD,
  EXACT_MATCH_COMPONENT_THRESHOLD,
  MAXIMUM_SCORE,
  MEMORY_FIT_SCORES,
  OWNERSHIP_MINIMUM_BANDS,
  OWNERSHIP_SCORES,
  PORTABILITY_PERFORMANCE_BLEND,
  PRIMARY_USE_SCORES,
  RULES_VERSION,
  SCORING_WEIGHTS,
  STRETCH_BUDGET_RANKING_ADJUSTMENT_BASIS_POINTS,
  STRONG_COMPONENT_THRESHOLD,
  WORKLOAD_FIT_SCORES,
  getExternalDisplayFit,
  getHeadroomBand,
  getMemoryBand,
  getPortabilityBand,
  getScreenSizeFit,
  getWeightPreferenceFit,
} from "./recommendation-rules.js";

const OPTIONAL_SCORING_FOLLOW_UPS = Object.freeze([
  "studyProductivityDetail",
  "softwareDevelopmentDetail",
  "cybersecurityVmDetail",
  "photoEditingDetail",
  "videoEditingDetail",
  "musicProductionDetail",
  "threeDEngineeringDetail",
  "sustainedDuration",
]);

function deepFreeze(value) {
  return freezeCatalogueOutput(value);
}

function catalogueMetadata(catalogue) {
  return {
    schemaVersion: catalogue?.schemaVersion ?? null,
    rulesVersion: RULES_VERSION,
    region: catalogue?.region ?? null,
    currency: catalogue?.currency ?? null,
    verifiedOn: catalogue?.verifiedOn ?? null,
  };
}

function emptyConfidence(reasonCode, message) {
  return {
    label: "low",
    points: 0,
    uncappedPoints: 0,
    detailCoverage: 0,
    topScore: null,
    topLead: null,
    cap: null,
    reasons: [{ code: reasonCode, message }],
  };
}

function baseDiagnostics(catalogue, validationErrors = []) {
  return {
    counts: {
      catalogue: Array.isArray(catalogue?.products) ? catalogue.products.length : 0,
      available: 0,
      eligible: 0,
      recommended: 0,
      stretchAlternatives: 0,
      excluded: 0,
    },
    categoryCounts: { exact: 0, closest: 0, stretch: 0 },
    validationErrors: [...validationErrors],
    appliedFilterCodes: [],
    blockerCounts: {},
  };
}

function createTerminalOutput(status, catalogue, answers, validationErrors, confidence) {
  return deepFreeze({
    status,
    catalogue: catalogueMetadata(catalogue),
    input: answers ? { answers: structuredClone(answers) } : { answers: null },
    profile: null,
    matches: [],
    stretchMatches: [],
    budgetLimitedAlternatives: [],
    exclusions: [],
    ties: [],
    confidence,
    unassessedAnswers: [],
    diagnostics: baseDiagnostics(catalogue, validationErrors),
  });
}

export function validateRecommendationAnswers(answers) {
  return validateQuestionnaireAnswers(answers);
}

function getIncompleteFields(product) {
  const requiredFacts = [
    ["price.amountMinor", product.price?.amountMinor],
    ["facts.marketedScreenSizeInches", product.facts?.marketedScreenSizeInches],
    ["facts.displayDiagonalInches", product.facts?.displayDiagonalInches],
    ["facts.weightKg", product.facts?.weightKg],
    ["facts.chip.id", product.facts?.chip?.id],
    ["facts.unifiedMemoryGb", product.facts?.unifiedMemoryGb],
    ["facts.storageGb", product.facts?.storageGb],
    [
      "facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive",
      product.facts?.externalDisplaySupport?.maxCountWithBuiltInDisplayActive,
    ],
  ];

  const missing = requiredFacts.filter(([, value]) => value === null || value === undefined);
  if (product.facts?.chip?.id && !CAPABILITY_BANDS[product.facts.chip.id]) {
    missing.push(["internal capability mapping", null]);
  }
  return missing.map(([field]) => field);
}

function applyHardFilters(product, profile, { ignoreBudget = false } = {}) {
  const failures = [];
  const addFailure = (code, message, details = {}, judgement = "verified-fact") =>
    failures.push({ code, message, details, judgement });

  if (product.availability.status !== "available") {
    addFailure("availability", "This configuration was not verified as currently available.");
  }
  if (product.region !== "GB" || product.currency !== "GBP") {
    addFailure("market", "This configuration is not a verified GB/GBP record.");
  }

  const incompleteFields = getIncompleteFields(product);
  if (incompleteFields.length > 0) {
    addFailure("incomplete-data", "This record lacks data required for a safe comparison.", {
      fields: incompleteFields,
    });
    return failures;
  }

  const hard = profile.hardRequirements;
  if (
    !ignoreBudget &&
    hard.budgetMaximumMinor !== null &&
    product.price.amountMinor > hard.budgetMaximumMinor
  ) {
    addFailure("budget", "The verified price is above the permitted maximum budget.", {
      limitMinor: hard.budgetMaximumMinor,
      actualMinor: product.price.amountMinor,
    });
  }
  if (hard.storageMinimumGb !== null && product.facts.storageGb < hard.storageMinimumGb) {
    addFailure("storage", "The built-in storage is below the selected verified minimum.", {
      minimumGb: hard.storageMinimumGb,
      actualGb: product.facts.storageGb,
    });
  }

  const capabilityBand = CAPABILITY_BANDS[product.facts.chip.id];
  if (hard.workloadCapabilityBand !== null && capabilityBand < hard.workloadCapabilityBand) {
    addFailure(
      "workload-capability",
      "The Northstar capability band is below the mandatory workload target.",
      { minimumBand: hard.workloadCapabilityBand, actualBand: capabilityBand },
      "northstar-assessment",
    );
  }
  if (hard.memoryMinimumGb !== null && product.facts.unifiedMemoryGb < hard.memoryMinimumGb) {
    addFailure(
      "workload-memory",
      "The verified memory is below the mandatory Northstar workload target.",
      { minimumGb: hard.memoryMinimumGb, actualGb: product.facts.unifiedMemoryGb },
      "northstar-assessment",
    );
  }
  if (hard.weightMaximumKg !== null && product.facts.weightKg > hard.weightMaximumKg) {
    addFailure("weight", "The verified weight is above the selected mandatory maximum.", {
      maximumKg: hard.weightMaximumKg,
      actualKg: product.facts.weightKg,
    });
  }
  if (
    hard.exactScreenSizeInches !== null &&
    product.facts.marketedScreenSizeInches !== hard.exactScreenSizeInches
  ) {
    addFailure("screen-size", "The marketed screen size does not meet the exact-size requirement.", {
      requiredInches: hard.exactScreenSizeInches,
      actualInches: product.facts.marketedScreenSizeInches,
    });
  }
  const actualDisplays = product.facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive;
  if (hard.externalDisplayMinimum !== null && actualDisplays < hard.externalDisplayMinimum) {
    addFailure(
      "external-displays",
      "Verified external-display support is below the mandatory count.",
      { minimumCount: hard.externalDisplayMinimum, actualCount: actualDisplays },
    );
  }
  if (hard.ownershipPeriod !== null) {
    const minimumBand = OWNERSHIP_MINIMUM_BANDS[hard.ownershipPeriod];
    const actualBand = getHeadroomBand(product);
    if (actualBand < minimumBand) {
      addFailure(
        "ownership-headroom",
        "Northstar’s headroom band is below the explicitly essential ownership target.",
        { minimumBand, actualBand },
        "northstar-assessment",
      );
    }
  }

  return failures;
}

function getAppliedFilterCodes(profile) {
  const hard = profile.hardRequirements;
  const codes = ["availability", "market", "complete-data"];
  if (hard.budgetMaximumMinor !== null) codes.push("budget");
  if (hard.storageMinimumGb !== null) codes.push("storage");
  if (hard.workloadCapabilityBand !== null) codes.push("workload-capability");
  if (hard.memoryMinimumGb !== null) codes.push("workload-memory");
  if (hard.weightMaximumKg !== null) codes.push("weight");
  if (hard.exactScreenSizeInches !== null) codes.push("screen-size");
  if (hard.externalDisplayMinimum !== null) codes.push("external-displays");
  if (hard.ownershipPeriod !== null) codes.push("ownership-headroom");
  return codes;
}

function scoreProduct(product, profile) {
  const { answers, preferences, workload } = profile;
  const capabilityBand = CAPABILITY_BANDS[product.facts.chip.id];
  const memoryBand = getMemoryBand(product.facts.unifiedMemoryGb);
  const portabilityBand = getPortabilityBand(product.facts.weightKg);
  const workloadValue = WORKLOAD_FIT_SCORES[workload.capabilityBand][capabilityBand - 1];
  const primaryUsesValue =
    answers.primaryUses.reduce(
      (total, useId) => total + PRIMARY_USE_SCORES[useId][capabilityBand - 1],
      0,
    ) / answers.primaryUses.length;
  const memoryValue = MEMORY_FIT_SCORES[workload.memoryGb][memoryBand - 1];

  const blend = PORTABILITY_PERFORMANCE_BLEND[answers.mobility.portabilityPerformance];
  const portabilityPerformance =
    (portabilityBand / 5) * 100 * blend.portability +
    (capabilityBand / 4) * 100 * blend.performance;
  const weightFit = getWeightPreferenceFit(product.facts.weightKg, preferences.weightTargetKg);
  const portabilityWeight =
    weightFit === null ? portabilityPerformance : portabilityPerformance * 0.7 + weightFit * 0.3;

  const screenSize = getScreenSizeFit(
    product.facts.marketedScreenSizeInches,
    preferences.screenSizeInches,
  );
  const ownershipPeriod =
    preferences.ownershipPeriod === null
      ? null
      : OWNERSHIP_SCORES[preferences.ownershipPeriod][getHeadroomBand(product) - 1];
  const externalDisplays = getExternalDisplayFit(
    product.facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive,
    preferences.externalDisplayCount,
  );

  const values = {
    workload: workloadValue,
    primaryUses: primaryUsesValue,
    multitaskingMemory: memoryValue,
    portabilityWeight,
    screenSize,
    ownershipPeriod,
    externalDisplays,
  };
  let applicableWeight = 0;
  let weightedTotal = 0;
  const components = {};

  Object.entries(SCORING_WEIGHTS).forEach(([key, configuredWeight]) => {
    const applied = values[key] !== null;
    const weight = applied ? configuredWeight : 0;
    const weightedPoints = applied ? (values[key] * configuredWeight) / 100 : 0;
    applicableWeight += weight;
    weightedTotal += weightedPoints;
    components[key] = {
      value: values[key],
      configuredWeight,
      appliedWeight: weight,
      weightedPoints: Math.round(weightedPoints * 100) / 100,
      applied,
    };
  });

  const unroundedPercent = (weightedTotal / applicableWeight) * MAXIMUM_SCORE;
  const basisPoints = Math.round(unroundedPercent * 100);
  return {
    basisPoints,
    percent: basisPoints / 100,
    applicableWeight,
    maximum: MAXIMUM_SCORE,
    components,
  };
}

function formatStorage(storageGb) {
  return storageGb >= 1000 ? `${storageGb / 1000}TB` : `${storageGb}GB`;
}

function buildReasons(product, profile, score) {
  const candidates = [];
  const hard = (code, message, evidence, kind = "verified-fact") =>
    candidates.push({ code, message, evidence, kind, priority: 0, contribution: 0 });
  const preference = (code, message, componentKey) =>
    candidates.push({
      code,
      message,
      evidence: { component: componentKey, value: score.components[componentKey].value },
      kind: "northstar-assessment",
      priority: 1,
      contribution: score.components[componentKey].weightedPoints,
    });

  const hardRequirements = profile.hardRequirements;
  if (hardRequirements.budgetMaximumMinor !== null) {
    hard("meets-budget", "Its verified price is within your permitted maximum budget.", {
      priceMinor: product.price.amountMinor,
      limitMinor: hardRequirements.budgetMaximumMinor,
    });
  }
  if (hardRequirements.storageMinimumGb !== null) {
    hard(
      "meets-storage",
      `It includes at least ${formatStorage(hardRequirements.storageMinimumGb)} of built-in storage.`,
      { actualGb: product.facts.storageGb, minimumGb: hardRequirements.storageMinimumGb },
    );
  }
  if (hardRequirements.externalDisplayMinimum !== null) {
    hard("meets-external-displays", "It meets your mandatory external-display count.", {
      actualCount: product.facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive,
      minimumCount: hardRequirements.externalDisplayMinimum,
    });
  }
  if (hardRequirements.workloadCapabilityBand !== null) {
    hard(
      "meets-workload-minimum",
      "It meets Northstar’s mandatory workload capability target.",
      {
        capabilityBand: CAPABILITY_BANDS[product.facts.chip.id],
        minimumBand: hardRequirements.workloadCapabilityBand,
      },
      "northstar-assessment",
    );
  }

  Object.entries(score.components).forEach(([key, component]) => {
    if (component.applied && component.value >= STRONG_COMPONENT_THRESHOLD) {
      preference(
        `strong-${key}`,
        `It scores strongly for your ${COMPONENT_LABELS[key]} in Northstar’s assessment.`,
        key,
      );
    }
  });

  const hardReasons = candidates
    .filter(({ priority }) => priority === 0)
    .sort((a, b) => a.code.localeCompare(b.code));
  const preferenceReasons = candidates
    .filter(({ priority }) => priority === 1)
    .sort((a, b) => b.contribution - a.contribution || a.code.localeCompare(b.code));
  const selectedPreferences = preferenceReasons.slice(0, 2);
  const selectedHardReasons = hardReasons.slice(0, 3 - selectedPreferences.length);

  return [...selectedHardReasons, ...selectedPreferences].map(
    ({ priority, contribution, ...reason }) => reason,
  );
}

function buildCompromises(product, profile, score) {
  const candidates = [];
  const add = (code, message, lostPoints, evidence, severity = "major", kind = "northstar-assessment") =>
    candidates.push({ code, message, evidence, severity, kind, lostPoints });

  Object.entries(score.components).forEach(([key, component]) => {
    if (component.applied && component.value < COMPROMISE_COMPONENT_THRESHOLD) {
      add(
        `weaker-${key}`,
        `It is a weaker fit for your ${COMPONENT_LABELS[key]} in Northstar’s assessment.`,
        component.configuredWeight - component.weightedPoints,
        { component: key, value: component.value },
      );
    }
  });

  const preferredBudget = profile.preferences.budgetTargetMinor;
  if (preferredBudget !== null && product.price.amountMinor > preferredBudget) {
    add(
      "over-preferred-budget",
      "Its verified price is above your preferred budget target.",
      0,
      { priceMinor: product.price.amountMinor, targetMinor: preferredBudget },
      "major",
      "verified-fact",
    );
  } else if (
    preferredBudget !== null &&
    product.price.amountMinor >= preferredBudget * 0.9
  ) {
    add(
      "near-preferred-budget",
      "Its verified price uses at least 90% of your preferred budget.",
      0,
      { priceMinor: product.price.amountMinor, targetMinor: preferredBudget },
      "minor",
      "verified-fact",
    );
  }

  const storageMinimum = profile.hardRequirements.storageMinimumGb;
  if (storageMinimum !== null && product.facts.storageGb === storageMinimum) {
    add(
      "storage-at-minimum",
      "Its storage meets your minimum without additional built-in headroom.",
      0,
      { storageGb: product.facts.storageGb },
      "minor",
      "verified-fact",
    );
  }

  return candidates
    .sort(
      (a, b) =>
        (a.severity === b.severity ? 0 : a.severity === "major" ? -1 : 1) ||
        b.lostPoints - a.lostPoints ||
        a.code.localeCompare(b.code),
    )
    .slice(0, 3)
    .map(({ lostPoints, ...compromise }) => compromise);
}

function budgetRelation(product, profile) {
  const target = profile.preferences.budgetTargetMinor;
  if (target === null) return "no-target";
  return product.price.amountMinor <= target ? "within-target" : "over-target";
}

function classifyMatch(product, profile, score, compromises) {
  if (budgetRelation(product, profile) === "over-target") return "stretch";
  const hasWeakComponent = Object.values(score.components).some(
    ({ applied, value }) => applied && value < EXACT_MATCH_COMPONENT_THRESHOLD,
  );
  const hasMajorCompromise = compromises.some(({ severity }) => severity === "major");
  const unassessedMustHaveConnection =
    profile.unusedForRanking.connectionNeeds.length > 0 &&
    profile.unusedForRanking.connectionImportance === "must-have";
  return hasWeakComponent || hasMajorCompromise || unassessedMustHaveConnection
    ? "closest"
    : "exact";
}

function componentSortValue(match, key) {
  const component = match.score.components[key];
  return component?.applied ? component.value : -1;
}

function compareMatches(a, b) {
  return (
    b.rankingBasisPoints - a.rankingBasisPoints ||
    b.score.basisPoints - a.score.basisPoints ||
    componentSortValue(b, "workload") - componentSortValue(a, "workload") ||
    componentSortValue(b, "primaryUses") - componentSortValue(a, "primaryUses") ||
    componentSortValue(b, "multitaskingMemory") - componentSortValue(a, "multitaskingMemory") ||
    componentSortValue(b, "portabilityWeight") - componentSortValue(a, "portabilityWeight") ||
    componentSortValue(b, "screenSize") - componentSortValue(a, "screenSize") ||
    componentSortValue(b, "ownershipPeriod") - componentSortValue(a, "ownershipPeriod") ||
    componentSortValue(b, "externalDisplays") - componentSortValue(a, "externalDisplays") ||
    a.compromises.length - b.compromises.length ||
    a.priceMinor - b.priceMinor ||
    a.productId.localeCompare(b.productId)
  );
}

function decidingFactor(higher, lower) {
  if (higher.rankingBasisPoints !== lower.rankingBasisPoints) {
    if (
      higher.score.basisPoints <= lower.score.basisPoints &&
      lower.rankingAdjustmentBasisPoints < higher.rankingAdjustmentBasisPoints
    ) {
      return {
        code: "stretch-budget-adjustment",
        message: "The over-target alternative did not improve fit by the five points required to rank higher.",
        adjustment: Math.abs(lower.rankingAdjustmentBasisPoints) / 100,
      };
    }
    return {
      code: "ranking-score",
      message: "Its budget-adjusted ranking score is lower.",
      difference: (higher.rankingBasisPoints - lower.rankingBasisPoints) / 100,
    };
  }
  if (higher.score.basisPoints !== lower.score.basisPoints) {
    return {
      code: "total-score",
      message: "Its overall Northstar fit score is lower.",
      difference: (higher.score.basisPoints - lower.score.basisPoints) / 100,
    };
  }

  const componentOrder = [
    "workload",
    "primaryUses",
    "multitaskingMemory",
    "portabilityWeight",
    "screenSize",
    "ownershipPeriod",
    "externalDisplays",
  ];
  for (const key of componentOrder) {
    const difference = componentSortValue(higher, key) - componentSortValue(lower, key);
    if (difference !== 0) {
      return {
        code: `tie-${key}`,
        message: `A tie was resolved by the ${COMPONENT_LABELS[key]} component.`,
        difference,
      };
    }
  }
  if (higher.compromises.length !== lower.compromises.length) {
    return {
      code: "tie-compromises",
      message: "A tie was resolved by the number of identified compromises.",
      difference: lower.compromises.length - higher.compromises.length,
    };
  }
  if (higher.priceMinor !== lower.priceMinor) {
    return {
      code: "tie-price",
      message: "A tie was resolved by lower verified price.",
      differenceMinor: lower.priceMinor - higher.priceMinor,
    };
  }
  return {
    code: "tie-product-id",
    message: "A complete tie was resolved by stable product ID.",
  };
}

function componentComparison(higher, lower, direction) {
  const comparisons = Object.keys(SCORING_WEIGHTS)
    .map((key) => ({
      component: key,
      difference: componentSortValue(higher, key) - componentSortValue(lower, key),
    }))
    .filter(({ difference }) => (direction === "deficit" ? difference > 0 : difference < 0))
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference) || a.component.localeCompare(b.component));
  if (comparisons.length === 0) return null;
  const comparison = comparisons[0];
  return {
    component: comparison.component,
    label: COMPONENT_LABELS[comparison.component],
    difference: Math.abs(comparison.difference),
  };
}

function annotateRanking(matches, rankKey = "rank") {
  if (matches.length === 0) return [];
  const top = matches[0];
  return matches.map((match, index) => ({
    ...match,
    [rankKey]: index + 1,
    rankingExplanation:
      index === 0
        ? {
            comparedWithProductId: null,
            decidingFactor: { code: "highest-ranked", message: "This is the highest-ranked match in this group." },
            largestDeficit: null,
            advantage: null,
          }
        : {
            comparedWithProductId: top.productId,
            decidingFactor: decidingFactor(top, match),
            largestDeficit: componentComparison(top, match, "deficit"),
            advantage: componentComparison(top, match, "advantage"),
          },
  }));
}

function collectTies(matches) {
  const byScore = new Map();
  matches.forEach((match) => {
    const group = byScore.get(match.score.basisPoints) ?? [];
    group.push(match.productId);
    byScore.set(match.score.basisPoints, group);
  });
  return [...byScore.entries()]
    .filter(([, productIds]) => productIds.length > 1)
    .sort(([scoreA], [scoreB]) => scoreB - scoreA)
    .map(([basisPoints, productIds]) => ({ basisPoints, productIds }));
}

function countBlockers(exclusions) {
  const counts = {};
  exclusions.forEach(({ failedFilters }) => {
    failedFilters.forEach(({ code }) => {
      counts[code] = (counts[code] ?? 0) + 1;
    });
  });
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function buildUnassessedAnswers(profile) {
  const unassessed = [];
  const battery = profile.unusedForRanking.batteryImportance;
  if (battery && battery !== "unsure") {
    unassessed.push({
      code: "battery-runtime-unverified",
      answerId: battery,
      message: "Battery importance was not used because model-specific runtime is not verified in the catalogue.",
    });
  }
  if (profile.unusedForRanking.connectionNeeds.length > 0) {
    unassessed.push({
      code: "connections-unverified",
      answerIds: [...profile.unusedForRanking.connectionNeeds],
      importance: profile.unusedForRanking.connectionImportance,
      message: "Connection needs were not used because a verified port inventory is not present in the catalogue.",
    });
  }
  return unassessed;
}

function detailCoverage(profile) {
  const visible = new Set(profile.visibleQuestionIds);
  const applicable = OPTIONAL_SCORING_FOLLOW_UPS.filter((questionId) => visible.has(questionId));
  if (applicable.length === 0) return 1;
  const answered = applicable.filter((questionId) => {
    const definition = getQuestionDefinition(questionId);
    const value = getAnswerValue(profile.answers, definition.answerPath);
    return value !== null && value !== "" && value !== "unsure";
  });
  return answered.length / applicable.length;
}

function calculateConfidence(profile, primaryMatches, stretchMatches, status) {
  const topGroup = primaryMatches.length > 0 ? primaryMatches : stretchMatches;
  const top = topGroup[0] ?? null;
  const coverage = detailCoverage(profile);
  const coveragePoints = Math.round(coverage * 40);
  let fitPoints = 0;
  if (top) {
    if (top.score.percent >= 85) fitPoints = 30;
    else if (top.score.percent >= 75) fitPoints = 22;
    else if (top.score.percent >= 65) fitPoints = 12;
  }

  let topLead = null;
  let separationPoints = 0;
  if (topGroup.length === 1) {
    separationPoints = 10;
  } else if (topGroup.length > 1) {
    topLead = (topGroup[0].score.basisPoints - topGroup[1].score.basisPoints) / 100;
    if (topLead >= 8) separationPoints = 20;
    else if (topLead >= 4) separationPoints = 14;
    else if (topLead > 0) separationPoints = 8;
    else separationPoints = 4;
  }

  const alignmentPoints = top
    ? top.matchType === "exact"
      ? 10
      : top.matchType === "closest"
        ? 6
        : 2
    : 0;
  const uncappedPoints = status === "ok" ? coveragePoints + fitPoints + separationPoints + alignmentPoints : 0;
  let points = uncappedPoints;
  let cap = null;
  const reasons = [];

  if (coverage < 0.5) {
    reasons.push({ code: "limited-detail", message: "Fewer than half of the applicable workload details were answered." });
  } else if (coverage >= 0.8) {
    reasons.push({ code: "strong-detail", message: "Most applicable workload details were answered." });
  }
  if (topLead !== null && topLead < 4) {
    reasons.push({ code: "close-ranking", message: "The leading recommendations have similar fit scores." });
  }
  if (top?.matchType === "stretch") {
    reasons.push({ code: "stretch-leading", message: "The leading match is above the preferred budget target." });
  }
  if (status !== "ok") {
    reasons.push({ code: status, message: "No eligible ranked recommendation is available." });
  }

  const battery = profile.unusedForRanking.batteryImportance;
  if (["full-work-or-study-day", "long-travel-day"].includes(battery)) {
    points = Math.min(points, 79);
    cap = "moderate-unverified-battery";
    reasons.push({
      code: "unverified-battery",
      message: "Confidence is capped because the stated battery need could not be evaluated.",
    });
  }
  if (
    profile.unusedForRanking.connectionNeeds.length > 0 &&
    profile.unusedForRanking.connectionImportance === "must-have"
  ) {
    points = Math.min(points, 54);
    cap = "low-unverified-connections";
    reasons.push({
      code: "unverified-must-have-connection",
      message: "Confidence is capped because a must-have connection could not be evaluated.",
    });
  }

  const label = points >= 80 ? "high" : points >= 55 ? "moderate" : "low";
  return {
    label,
    points,
    uncappedPoints,
    detailCoverage: Math.round(coverage * 100) / 100,
    topScore: top?.score.percent ?? null,
    topLead,
    cap,
    reasons,
  };
}

function categoryCounts(matches, stretchMatches) {
  const counts = { exact: 0, closest: 0, stretch: stretchMatches.length };
  matches.forEach(({ matchType }) => {
    counts[matchType] += 1;
  });
  return counts;
}

export function recommendMacBooks({ catalogue, answers }) {
  const catalogueValidation = validateProductCatalogue(catalogue);
  if (!catalogueValidation.valid) {
    return createTerminalOutput(
      "invalid-catalog",
      catalogue,
      answers,
      catalogueValidation.errors,
      emptyConfidence("invalid-catalog", "The catalogue did not pass validation."),
    );
  }

  const answerValidation = validateRecommendationAnswers(answers);
  if (!answerValidation.valid) {
    return createTerminalOutput(
      "invalid-input",
      catalogue,
      answers,
      answerValidation.errors,
      emptyConfidence("invalid-input", "The questionnaire answers did not pass validation."),
    );
  }

  const profile = deriveQuestionnaireProfile(answers);
  const appliedFilterCodes = getAppliedFilterCodes(profile);
  const candidates = [];
  const exclusions = [];
  const budgetLimitedAlternatives = [];

  catalogue.products.forEach((product) => {
    const failedFilters = applyHardFilters(product, profile);
    if (failedFilters.length > 0) {
      exclusions.push({ productId: product.id, failedFilters });
      const withoutBudget = applyHardFilters(product, profile, { ignoreBudget: true });
      if (
        failedFilters.some(({ code }) => code === "budget") &&
        withoutBudget.length === 0
      ) {
        budgetLimitedAlternatives.push({
          productId: product.id,
          priceMinor: product.price.amountMinor,
          amountOverLimitMinor:
            product.price.amountMinor - profile.hardRequirements.budgetMaximumMinor,
        });
      }
      return;
    }

    const score = scoreProduct(product, profile);
    const compromises = buildCompromises(product, profile, score);
    const relation = budgetRelation(product, profile);
    const rankingAdjustmentBasisPoints =
      profile.answers.budget.mode === "stretch" && relation === "over-target"
        ? -STRETCH_BUDGET_RANKING_ADJUSTMENT_BASIS_POINTS
        : 0;
    candidates.push({
      productId: product.id,
      priceMinor: product.price.amountMinor,
      score,
      rankingAdjustmentBasisPoints,
      rankingBasisPoints: score.basisPoints + rankingAdjustmentBasisPoints,
      budgetRelation: relation,
      matchType: classifyMatch(product, profile, score, compromises),
      passedFilters: [...appliedFilterCodes],
      reasons: buildReasons(product, profile, score),
      compromises,
    });
  });

  candidates.sort(compareMatches);
  const isFlexible = profile.answers.budget.mode === "flexible";
  const primaryCandidates = isFlexible
    ? candidates.filter(({ matchType }) => matchType !== "stretch")
    : candidates;
  const separateStretchCandidates = isFlexible
    ? candidates.filter(({ matchType }) => matchType === "stretch")
    : [];
  const matches = annotateRanking(primaryCandidates);
  const stretchMatches = annotateRanking(separateStretchCandidates, "stretchRank");

  let status = "ok";
  if (matches.length === 0 && stretchMatches.length === 0) {
    status = budgetLimitedAlternatives.length > 0 ? "budget-limited" : "no-match";
  }

  const availableCount = catalogue.products.filter(
    (product) => product.availability.status === "available",
  ).length;
  const confidence = calculateConfidence(profile, matches, stretchMatches, status);
  const unassessedAnswers = buildUnassessedAnswers(profile);
  const blockerCounts = countBlockers(exclusions);

  return deepFreeze({
    status,
    catalogue: catalogueMetadata(catalogue),
    input: { answers: structuredClone(profile.answers) },
    profile: {
      workload: profile.workload,
      hardRequirements: profile.hardRequirements,
      preferences: profile.preferences,
    },
    matches,
    stretchMatches,
    budgetLimitedAlternatives: budgetLimitedAlternatives.sort(
      (a, b) => a.amountOverLimitMinor - b.amountOverLimitMinor || a.productId.localeCompare(b.productId),
    ),
    exclusions,
    ties: collectTies(matches),
    confidence,
    unassessedAnswers,
    diagnostics: {
      counts: {
        catalogue: catalogue.products.length,
        available: availableCount,
        eligible: candidates.length,
        recommended: Math.min(matches.length, 3),
        stretchAlternatives: stretchMatches.length,
        excluded: exclusions.length,
      },
      categoryCounts: categoryCounts(matches, stretchMatches),
      validationErrors: [],
      appliedFilterCodes,
      blockerCounts,
    },
  });
}
