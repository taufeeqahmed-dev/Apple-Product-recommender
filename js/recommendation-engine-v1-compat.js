import { deepFreeze, validateProductCatalogue } from "./product-schema.js";
import {
  ANSWER_IDS,
  BUDGET_LIMITS_MINOR,
  CAPABILITY_BANDS,
  EXTERNAL_DISPLAY_MINIMUMS,
  MAXIMUM_SCORE,
  OWNERSHIP_SCORES,
  PORTABILITY_PERFORMANCE_BLEND,
  PRIMARY_USE_SCORES,
  RULES_VERSION,
  SCORING_WEIGHTS,
  STORAGE_MINIMUMS_GB,
  WORKLOAD_MINIMUM_BANDS,
  WORKLOAD_SCORES,
  getHeadroomBand,
  getPortabilityBand,
} from "./recommendation-rules-v1-compat.js";

const REQUIRED_ANSWER_KEYS = Object.freeze(Object.keys(ANSWER_IDS));

const COMPONENT_LABELS = Object.freeze({
  workload: "expected workload",
  primaryUses: "main uses",
  portabilityPerformance: "portability and performance balance",
  screenSize: "preferred screen size",
  ownershipPeriod: "planned ownership period",
});

function catalogueMetadata(catalogue) {
  return {
    schemaVersion: catalogue?.schemaVersion ?? null,
    rulesVersion: RULES_VERSION,
    region: catalogue?.region ?? null,
    currency: catalogue?.currency ?? null,
    verifiedOn: catalogue?.verifiedOn ?? null,
  };
}

function baseDiagnostics(catalogue, validationErrors = []) {
  return {
    counts: {
      catalogue: Array.isArray(catalogue?.products) ? catalogue.products.length : 0,
      available: 0,
      eligible: 0,
      recommended: 0,
      excluded: 0,
    },
    validationErrors: [...validationErrors],
    appliedFilterCodes: [],
    blockerCounts: {},
  };
}

function createTerminalOutput(status, catalogue, answers, validationErrors) {
  return deepFreeze({
    status,
    catalogue: catalogueMetadata(catalogue),
    input: answers ? { answers: structuredClone(answers) } : { answers: null },
    matches: [],
    exclusions: [],
    ties: [],
    diagnostics: baseDiagnostics(catalogue, validationErrors),
  });
}

export function validateRecommendationAnswers(answers) {
  const errors = [];

  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return { valid: false, errors: ["Questionnaire answers must be an object."] };
  }

  REQUIRED_ANSWER_KEYS.forEach((key) => {
    if (!Object.hasOwn(answers, key)) errors.push(`Missing answer: ${key}.`);
  });

  REQUIRED_ANSWER_KEYS.filter((key) => key !== "primaryUses").forEach((key) => {
    if (Object.hasOwn(answers, key) && !ANSWER_IDS[key].includes(answers[key])) {
      errors.push(`Invalid answer ID for ${key}: ${String(answers[key])}.`);
    }
  });

  if (Object.hasOwn(answers, "primaryUses")) {
    if (!Array.isArray(answers.primaryUses)) {
      errors.push("primaryUses must be an array.");
    } else {
      if (answers.primaryUses.length < 1 || answers.primaryUses.length > 2) {
        errors.push("primaryUses must contain one or two answer IDs.");
      }
      if (new Set(answers.primaryUses).size !== answers.primaryUses.length) {
        errors.push("primaryUses cannot contain duplicate answer IDs.");
      }
      answers.primaryUses.forEach((answerId) => {
        if (!ANSWER_IDS.primaryUses.includes(answerId)) {
          errors.push(`Invalid primary use answer ID: ${String(answerId)}.`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
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

function applyHardFilters(product, answers) {
  const failures = [];
  const addFailure = (code, message, details = {}) => failures.push({ code, message, details });

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

  const budgetLimit = BUDGET_LIMITS_MINOR[answers.maximumBudget];
  if (budgetLimit !== null && product.price.amountMinor > budgetLimit) {
    addFailure("budget", "The verified price is above the selected maximum budget.", {
      limitMinor: budgetLimit,
      actualMinor: product.price.amountMinor,
    });
  }

  const storageMinimum = STORAGE_MINIMUMS_GB[answers.minimumStorage];
  if (storageMinimum !== null && product.facts.storageGb < storageMinimum) {
    addFailure("storage", "The built-in storage is below the selected minimum.", {
      minimumGb: storageMinimum,
      actualGb: product.facts.storageGb,
    });
  }

  const displayMinimum = EXTERNAL_DISPLAY_MINIMUMS[answers.externalDisplays];
  const displayCount = product.facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive;
  if (displayMinimum !== null && displayCount < displayMinimum) {
    addFailure("external-displays", "The configuration supports fewer external displays than required.", {
      minimumCount: displayMinimum,
      actualCount: displayCount,
    });
  }

  const capabilityBand = CAPABILITY_BANDS[product.facts.chip.id];
  const workloadMinimum = WORKLOAD_MINIMUM_BANDS[answers.workloadIntensity];
  if (capabilityBand < workloadMinimum) {
    addFailure("workload-capability", "The project capability band is below the workload minimum.", {
      minimumBand: workloadMinimum,
      actualBand: capabilityBand,
    });
  }

  return failures;
}

function scoreProduct(product, answers) {
  const capabilityBand = CAPABILITY_BANDS[product.facts.chip.id];
  const portabilityBand = getPortabilityBand(product.facts.weightKg);
  const blend = PORTABILITY_PERFORMANCE_BLEND[answers.portabilityPerformance];
  const workload = WORKLOAD_SCORES[answers.workloadIntensity][capabilityBand - 1];
  const primaryUses =
    answers.primaryUses.reduce(
      (total, useId) => total + PRIMARY_USE_SCORES[useId][capabilityBand - 1],
      0,
    ) / answers.primaryUses.length;
  const portabilityPerformance =
    (portabilityBand / 5) * 100 * blend.portability +
    (capabilityBand / 4) * 100 * blend.performance;

  let screenSize = null;
  if (answers.screenSize !== "no-preference") {
    const productScreenGroup = product.facts.marketedScreenSizeInches <= 14 ? "compact" : "large";
    screenSize = productScreenGroup === answers.screenSize ? 100 : 0;
  }

  const ownershipPeriod =
    answers.ownershipPeriod === "unsure"
      ? null
      : OWNERSHIP_SCORES[answers.ownershipPeriod][getHeadroomBand(product) - 1];

  const values = { workload, primaryUses, portabilityPerformance, screenSize, ownershipPeriod };
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

function buildReasons(product, answers, score) {
  const candidates = [];
  const hard = (code, message, evidence) =>
    candidates.push({ code, message, evidence, priority: 0, contribution: 0 });
  const preference = (code, message, componentKey) =>
    candidates.push({
      code,
      message,
      evidence: { component: componentKey, value: score.components[componentKey].value },
      priority: 1,
      contribution: score.components[componentKey].weightedPoints,
    });

  const budgetLimit = BUDGET_LIMITS_MINOR[answers.maximumBudget];
  if (budgetLimit !== null) {
    hard("meets-budget", "Its verified price is within your maximum budget.", {
      priceMinor: product.price.amountMinor,
      limitMinor: budgetLimit,
    });
  }

  const storageMinimum = STORAGE_MINIMUMS_GB[answers.minimumStorage];
  if (storageMinimum !== null) {
    hard("meets-storage", `It includes at least ${formatStorage(storageMinimum)} of built-in storage.`, {
      actualGb: product.facts.storageGb,
      minimumGb: storageMinimum,
    });
  }

  const displayMinimum = EXTERNAL_DISPLAY_MINIMUMS[answers.externalDisplays];
  if (displayMinimum !== null && displayMinimum > 0) {
    hard("meets-external-displays", "It meets your external-display requirement.", {
      actualCount: product.facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive,
      minimumCount: displayMinimum,
    });
  }

  hard("meets-workload-minimum", "It passes this project's minimum for your expected workload.", {
    capabilityBand: CAPABILITY_BANDS[product.facts.chip.id],
    minimumBand: WORKLOAD_MINIMUM_BANDS[answers.workloadIntensity],
  });

  Object.entries(score.components).forEach(([key, component]) => {
    if (component.applied && component.value >= 75) {
      preference(
        `strong-${key}`,
        `It scores strongly for your ${COMPONENT_LABELS[key]} in Northstar's assessment.`,
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

  return [...selectedHardReasons, ...selectedPreferences]
    .map(({ priority, contribution, ...reason }) => reason);
}

function buildCompromises(product, answers, score) {
  const candidates = [];
  const add = (code, message, lostPoints, evidence) =>
    candidates.push({ code, message, evidence, lostPoints });

  Object.entries(score.components).forEach(([key, component]) => {
    if (component.applied && component.value < 70) {
      add(
        `weaker-${key}`,
        `It is a weaker fit for your ${COMPONENT_LABELS[key]} in Northstar's assessment.`,
        component.configuredWeight - component.weightedPoints,
        { component: key, value: component.value },
      );
    }
  });

  const storageMinimum = STORAGE_MINIMUMS_GB[answers.minimumStorage];
  if (storageMinimum !== null && product.facts.storageGb === storageMinimum) {
    add(
      "storage-at-minimum",
      "Its storage meets your minimum without extra built-in headroom.",
      0,
      { storageGb: product.facts.storageGb },
    );
  }

  const displayMinimum = EXTERNAL_DISPLAY_MINIMUMS[answers.externalDisplays];
  const actualDisplays = product.facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive;
  if (displayMinimum !== null && displayMinimum > 0 && actualDisplays === displayMinimum) {
    add(
      "displays-at-minimum",
      "Its external-display support meets your minimum without extra capacity.",
      0,
      { displayCount: actualDisplays },
    );
  }

  const budgetLimit = BUDGET_LIMITS_MINOR[answers.maximumBudget];
  if (
    budgetLimit !== null &&
    product.price.amountMinor <= budgetLimit &&
    product.price.amountMinor >= budgetLimit * 0.9
  ) {
    add(
      "near-budget-limit",
      "Its verified price uses at least 90% of your maximum budget.",
      0,
      { priceMinor: product.price.amountMinor, limitMinor: budgetLimit },
    );
  }

  return candidates
    .sort((a, b) => b.lostPoints - a.lostPoints || a.code.localeCompare(b.code))
    .slice(0, 2)
    .map(({ lostPoints, ...compromise }) => compromise);
}

function compareMatches(a, b) {
  return (
    b.score.basisPoints - a.score.basisPoints ||
    b.score.components.workload.value - a.score.components.workload.value ||
    b.score.components.primaryUses.value - a.score.components.primaryUses.value ||
    b.score.components.portabilityPerformance.value -
      a.score.components.portabilityPerformance.value ||
    a.compromises.length - b.compromises.length ||
    a.priceMinor - b.priceMinor ||
    a.productId.localeCompare(b.productId)
  );
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

export function recommendMacBooks({ catalogue, answers }) {
  const catalogueValidation = validateProductCatalogue(catalogue);
  if (!catalogueValidation.valid) {
    return createTerminalOutput("invalid-catalog", catalogue, answers, catalogueValidation.errors);
  }

  const answerValidation = validateRecommendationAnswers(answers);
  if (!answerValidation.valid) {
    return createTerminalOutput("invalid-input", catalogue, answers, answerValidation.errors);
  }

  const matches = [];
  const exclusions = [];

  catalogue.products.forEach((product) => {
    const failedFilters = applyHardFilters(product, answers);
    if (failedFilters.length > 0) {
      exclusions.push({ productId: product.id, failedFilters });
      return;
    }

    const score = scoreProduct(product, answers);
    const compromises = buildCompromises(product, answers, score);
    matches.push({
      productId: product.id,
      priceMinor: product.price.amountMinor,
      score,
      passedFilters: [
        "availability",
        "market",
        "complete-data",
        "budget",
        "storage",
        "external-displays",
        "workload-capability",
      ],
      reasons: buildReasons(product, answers, score),
      compromises,
    });
  });

  matches.sort(compareMatches);
  const rankedMatches = matches.map(({ priceMinor, ...match }, index) => ({
    rank: index + 1,
    ...match,
  }));
  const availableCount = catalogue.products.filter(
    (product) => product.availability.status === "available",
  ).length;

  const output = {
    status: rankedMatches.length > 0 ? "ok" : "no-match",
    catalogue: catalogueMetadata(catalogue),
    input: { answers: structuredClone(answers) },
    matches: rankedMatches,
    exclusions,
    ties: collectTies(rankedMatches),
    diagnostics: {
      counts: {
        catalogue: catalogue.products.length,
        available: availableCount,
        eligible: rankedMatches.length,
        recommended: Math.min(rankedMatches.length, 3),
        excluded: exclusions.length,
      },
      validationErrors: [],
      appliedFilterCodes: [
        "availability",
        "market",
        "complete-data",
        "budget",
        "storage",
        "external-displays",
        "workload-capability",
      ],
      blockerCounts: countBlockers(exclusions),
    },
  };

  return deepFreeze(output);
}
