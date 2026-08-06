import {
  QUESTION_DEFINITIONS,
  QUESTION_ORDER,
  getQuestionDefinition,
} from "./questionnaire-definition.js";

const BUDGET_VALUES_MINOR = Object.freeze({
  "up-to-1000": 100000,
  "up-to-1500": 150000,
  "up-to-2000": 200000,
  "up-to-2500": 250000,
  "up-to-3000": 300000,
  "up-to-4500": 450000,
});

const STORAGE_VALUES_GB = Object.freeze({
  "256gb": 256,
  "512gb": 512,
  "1tb": 1000,
  "2tb-plus": 2000,
  unsure: null,
});

const WEIGHT_VALUES_KG = Object.freeze({
  "up-to-1.25kg": 1.25,
  "up-to-1.55kg": 1.55,
  "up-to-1.75kg": 1.75,
  "up-to-2.05kg": 2.05,
});

const SCREEN_VALUES_INCHES = Object.freeze({
  "13-inch": 13,
  "14-inch": 14,
  "15-inch": 15,
  "16-inch": 16,
});

const DISPLAY_VALUES = Object.freeze({
  none: 0,
  one: 1,
  two: 2,
  three: 3,
  "four-plus": 4,
  unsure: null,
});

const BASE_WORKLOAD = Object.freeze({
  "study-productivity": Object.freeze({ capabilityBand: 1, memoryGb: 8 }),
  "software-development": Object.freeze({ capabilityBand: 2, memoryGb: 16 }),
  "cybersecurity-vms": Object.freeze({ capabilityBand: 2, memoryGb: 16 }),
  "photo-editing": Object.freeze({ capabilityBand: 2, memoryGb: 16 }),
  "video-editing": Object.freeze({ capabilityBand: 2, memoryGb: 16 }),
  "music-production": Object.freeze({ capabilityBand: 2, memoryGb: 16 }),
  "3d-engineering": Object.freeze({ capabilityBand: 3, memoryGb: 16 }),
});

const WORKLOAD_SIGNALS = Object.freeze({
  studyProductivity: Object.freeze({
    "documents-browsing-calls": Object.freeze([1, 8]),
    "research-spreadsheets-tabs": Object.freeze([2, 16]),
    "statistics-analysis-local-tools": Object.freeze([3, 24]),
  }),
  softwareDevelopment: Object.freeze({
    "learning-scripts-small-sites": Object.freeze([2, 8]),
    "web-mobile-local-services": Object.freeze([2, 16]),
    "containers-large-builds": Object.freeze([3, 24]),
    "native-ml-heavy-builds": Object.freeze([4, 36]),
  }),
  cybersecurityVms: Object.freeze({
    "no-local-vms": Object.freeze([2, 16]),
    "one-vm": Object.freeze([3, 16]),
    "two-vms": Object.freeze([3, 24]),
    "three-plus-vms": Object.freeze([4, 36]),
  }),
  photoEditing: Object.freeze({
    "jpeg-light-edits": Object.freeze([2, 16]),
    "regular-raw-editing": Object.freeze([3, 16]),
    "large-raw-batches-panoramas": Object.freeze([3, 24]),
    "professional-sustained-photo": Object.freeze([4, 36]),
  }),
  videoEditing: Object.freeze({
    "1080p-light": Object.freeze([2, 16]),
    "4k-single-stream": Object.freeze([3, 16]),
    "4k-multicam-effects": Object.freeze([4, 24]),
    "6k-8k-sustained": Object.freeze([4, 36]),
  }),
  musicProduction: Object.freeze({
    "small-projects-few-plugins": Object.freeze([2, 16]),
    "medium-projects": Object.freeze([3, 16]),
    "large-sample-libraries-many-plugins": Object.freeze([3, 24]),
    "professional-low-latency": Object.freeze([4, 36]),
  }),
  threeDEngineering: Object.freeze({
    "2d-light-models": Object.freeze([2, 16]),
    "moderate-3d-models": Object.freeze([3, 24]),
    "complex-cad-simulation": Object.freeze([4, 36]),
    "sustained-rendering-simulation": Object.freeze([4, 36]),
  }),
});

const MULTITASKING_SIGNALS = Object.freeze({
  light: Object.freeze([1, 8]),
  moderate: Object.freeze([2, 16]),
  heavy: Object.freeze([3, 24]),
  "very-heavy": Object.freeze([4, 36]),
});

const V1_PRIMARY_USE_MAP = Object.freeze({
  "everyday-study": "study-productivity",
  "office-business": "study-productivity",
  coding: "software-development",
  "photo-design": "photo-editing",
  "audio-music": "music-production",
});

function clone(value) {
  return structuredClone(value);
}

export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function getAnswerValue(answers, path) {
  return path.split(".").reduce((value, key) => value?.[key], answers);
}

export function setAnswerValue(answers, path, value) {
  const keys = path.split(".");
  let target = answers;
  keys.slice(0, -1).forEach((key) => {
    target = target[key];
  });
  target[keys.at(-1)] = clone(value);
}

export function createInitialAnswers() {
  return {
    budget: {
      target: "",
      mode: null,
      absoluteMaximum: null,
    },
    primaryUses: [],
    workloadDetails: {
      studyProductivity: null,
      softwareDevelopment: null,
      cybersecurityVms: null,
      photoEditing: null,
      videoEditing: null,
      musicProduction: null,
      threeDEngineering: null,
      sustainedDuration: null,
    },
    multitasking: "",
    workloadRequirementMode: "",
    mobility: {
      portabilityPerformance: "",
      weightTarget: null,
      weightRequirementMode: null,
      batteryImportance: null,
    },
    screen: {
      size: "",
      requirementMode: null,
    },
    minimumStorage: "",
    externalDisplays: {
      count: "",
      requirementMode: null,
    },
    connections: {
      needs: [],
      importance: null,
    },
    ownership: {
      period: "",
      requirementMode: null,
    },
  };
}

function mergeKnownAnswers(input) {
  const answers = createInitialAnswers();
  if (!input || typeof input !== "object" || Array.isArray(input)) return answers;

  QUESTION_DEFINITIONS.forEach(({ answerPath }) => {
    const value = getAnswerValue(input, answerPath);
    if (value !== undefined) setAnswerValue(answers, answerPath, value);
  });
  return answers;
}

function conditionMatches(condition, answers) {
  if (!condition) return true;
  if (condition.all) return condition.all.every((item) => conditionMatches(item, answers));
  if (condition.any) return condition.any.some((item) => conditionMatches(item, answers));

  const value = getAnswerValue(answers, condition.path);
  switch (condition.operator) {
    case "in":
      return condition.values.includes(value);
    case "not-in":
      return !condition.values.includes(value);
    case "includes":
      return Array.isArray(value) && value.includes(condition.value);
    case "includes-any":
      return Array.isArray(value) && condition.values.some((item) => value.includes(item));
    case "minimum-length":
      return Array.isArray(value) && value.length >= condition.value;
    default:
      throw new Error(`Unsupported questionnaire visibility operator: ${condition.operator}`);
  }
}

export function getVisibleQuestionIds(answers) {
  return QUESTION_DEFINITIONS
    .filter(({ visibility }) => conditionMatches(visibility, answers))
    .map(({ id }) => id);
}

export function getAvailableAbsoluteBudgetIds(targetId) {
  const target = BUDGET_VALUES_MINOR[targetId];
  if (!target) return [];
  return [
    ...Object.entries(BUDGET_VALUES_MINOR)
      .filter(([, amount]) => amount > target)
      .sort(([, a], [, b]) => a - b)
      .map(([id]) => id),
    "no-absolute-limit",
  ];
}

function answersEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function reconcileQuestionnaireAnswers(input) {
  let answers = mergeKnownAnswers(input);
  const defaults = createInitialAnswers();

  for (let pass = 0; pass < QUESTION_DEFINITIONS.length; pass += 1) {
    const previous = clone(answers);
    const visible = new Set(getVisibleQuestionIds(answers));

    QUESTION_DEFINITIONS.forEach(({ id, answerPath }) => {
      if (!visible.has(id)) {
        setAnswerValue(answers, answerPath, getAnswerValue(defaults, answerPath));
      }
    });

    const allowedAbsoluteBudgets = getAvailableAbsoluteBudgetIds(answers.budget.target);
    if (
      answers.budget.absoluteMaximum !== null &&
      !allowedAbsoluteBudgets.includes(answers.budget.absoluteMaximum)
    ) {
      answers.budget.absoluteMaximum = null;
    }

    if (answersEqual(previous, answers)) break;
  }

  return answers;
}

function isAnswered(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== "" && value !== undefined;
}

export function previewQuestionnaireAnswerChange(input, questionId, value) {
  const definition = getQuestionDefinition(questionId);
  if (!definition) throw new Error(`Unknown questionnaire question: ${questionId}`);

  const currentAnswers = reconcileQuestionnaireAnswers(input);
  const changedAnswers = clone(currentAnswers);
  setAnswerValue(changedAnswers, definition.answerPath, value);
  const nextAnswers = reconcileQuestionnaireAnswers(changedAnswers);
  const clearedQuestionIds = QUESTION_ORDER.filter((candidateId) => {
    if (candidateId === questionId) return false;
    const candidate = getQuestionDefinition(candidateId);
    const before = getAnswerValue(currentAnswers, candidate.answerPath);
    const after = getAnswerValue(nextAnswers, candidate.answerPath);
    return isAnswered(before) && !isAnswered(after);
  });

  return deepFreeze({
    questionId,
    value: clone(value),
    clearedQuestionIds,
    nextAnswers,
  });
}

function validateOptionValue(definition, value, errors) {
  const allowed = new Set(definition.options.map(({ id }) => id));
  if (definition.type === "checkbox") {
    if (!Array.isArray(value)) {
      errors.push(`${definition.id} must be an array.`);
      return;
    }
    if (new Set(value).size !== value.length) {
      errors.push(`${definition.id} cannot contain duplicate answer IDs.`);
    }
    value.forEach((item) => {
      if (!allowed.has(item)) errors.push(`Invalid answer ID for ${definition.id}: ${String(item)}.`);
    });
    if (definition.minimumSelections && value.length < definition.minimumSelections) {
      errors.push(`${definition.id} requires at least ${definition.minimumSelections} answer.`);
    }
    if (definition.maximumSelections && value.length > definition.maximumSelections) {
      errors.push(`${definition.id} allows no more than ${definition.maximumSelections} answers.`);
    }
    return;
  }

  if (!allowed.has(value)) errors.push(`Invalid answer ID for ${definition.id}: ${String(value)}.`);
}

export function validateQuestionnaireAnswers(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return deepFreeze({ valid: false, errors: ["Questionnaire answers must be an object."] });
  }

  const answers = mergeKnownAnswers(input);
  const reconciled = reconcileQuestionnaireAnswers(answers);
  const visible = new Set(getVisibleQuestionIds(reconciled));

  QUESTION_DEFINITIONS.forEach((definition) => {
    const rawValue = getAnswerValue(answers, definition.answerPath);
    const value = getAnswerValue(reconciled, definition.answerPath);

    if (!visible.has(definition.id)) {
      if (isAnswered(rawValue)) errors.push(`Hidden answer retained for ${definition.id}.`);
      return;
    }

    if (!isAnswered(value)) {
      if (definition.required) errors.push(`Missing answer: ${definition.id}.`);
      return;
    }
    validateOptionValue(definition, value, errors);
  });

  const specificConnections = reconciled.connections.needs.filter(
    (id) => id !== "no-specific-need" && id !== "unsure",
  );
  if (
    specificConnections.length > 0 &&
    reconciled.connections.needs.some((id) => id === "no-specific-need" || id === "unsure")
  ) {
    errors.push("Specific connection needs cannot be combined with no-specific-need or unsure.");
  }
  if (
    reconciled.connections.needs.includes("no-specific-need") &&
    reconciled.connections.needs.includes("unsure")
  ) {
    errors.push("no-specific-need and unsure cannot be selected together.");
  }

  return deepFreeze({ valid: errors.length === 0, errors });
}

export function deriveWorkloadProfile(input) {
  const answers = reconcileQuestionnaireAnswers(input);
  let capabilityBand = null;
  let memoryGb = null;
  const evidence = [];

  const applySignal = (source, signal) => {
    if (!signal) return;
    const [nextCapability, nextMemory] = signal;
    capabilityBand = Math.max(capabilityBand ?? 0, nextCapability);
    memoryGb = Math.max(memoryGb ?? 0, nextMemory);
    evidence.push({ source, capabilityBand: nextCapability, memoryGb: nextMemory });
  };

  answers.primaryUses.forEach((useId) => {
    const baseline = BASE_WORKLOAD[useId];
    if (baseline) applySignal(`primaryUses.${useId}`, [baseline.capabilityBand, baseline.memoryGb]);
  });

  Object.entries(WORKLOAD_SIGNALS).forEach(([key, signals]) => {
    const answer = answers.workloadDetails[key];
    applySignal(`workloadDetails.${key}`, signals[answer]);
  });
  applySignal("multitasking", MULTITASKING_SIGNALS[answers.multitasking]);

  if (answers.workloadDetails.sustainedDuration === "15-to-60-minutes") {
    capabilityBand = Math.max(capabilityBand ?? 0, 3);
    evidence.push({ source: "workloadDetails.sustainedDuration", capabilityBand: 3, memoryGb: null });
  } else if (answers.workloadDetails.sustainedDuration === "hours-most-days") {
    capabilityBand = Math.max(capabilityBand ?? 0, 4);
    evidence.push({ source: "workloadDetails.sustainedDuration", capabilityBand: 4, memoryGb: null });
  }

  return deepFreeze({
    capabilityBand,
    memoryGb,
    requirementMode: answers.workloadRequirementMode || null,
    evidence,
  });
}

export function deriveQuestionnaireProfile(input) {
  const answers = reconcileQuestionnaireAnswers(input);
  const validation = validateQuestionnaireAnswers(answers);
  const workload = deriveWorkloadProfile(answers);
  const budgetTargetMinor = BUDGET_VALUES_MINOR[answers.budget.target] ?? null;
  const absoluteBudgetMinor =
    answers.budget.mode === "strict"
      ? budgetTargetMinor
      : BUDGET_VALUES_MINOR[answers.budget.absoluteMaximum] ?? null;
  const connectionNeeds = answers.connections.needs.filter(
    (id) => id !== "no-specific-need" && id !== "unsure",
  );

  return deepFreeze({
    answers,
    visibleQuestionIds: getVisibleQuestionIds(answers),
    validation,
    workload,
    hardRequirements: {
      budgetMaximumMinor: absoluteBudgetMinor,
      storageMinimumGb: STORAGE_VALUES_GB[answers.minimumStorage] ?? null,
      workloadCapabilityBand:
        answers.workloadRequirementMode === "mandatory" ? workload.capabilityBand : null,
      memoryMinimumGb: answers.workloadRequirementMode === "mandatory" ? workload.memoryGb : null,
      weightMaximumKg:
        answers.mobility.weightRequirementMode === "must-not-exceed"
          ? WEIGHT_VALUES_KG[answers.mobility.weightTarget] ?? null
          : null,
      exactScreenSizeInches:
        answers.screen.requirementMode === "exact-size-required"
          ? SCREEN_VALUES_INCHES[answers.screen.size] ?? null
          : null,
      externalDisplayMinimum:
        answers.externalDisplays.requirementMode === "must-support"
          ? DISPLAY_VALUES[answers.externalDisplays.count]
          : null,
      ownershipPeriod:
        answers.ownership.requirementMode === "essential-headroom"
          ? answers.ownership.period
          : null,
    },
    preferences: {
      budgetTargetMinor,
      primaryUses: [...answers.primaryUses],
      workloadCapabilityBand: workload.capabilityBand,
      memoryGb: workload.memoryGb,
      portabilityPerformance: answers.mobility.portabilityPerformance,
      weightTargetKg: WEIGHT_VALUES_KG[answers.mobility.weightTarget] ?? null,
      screenSizeInches: SCREEN_VALUES_INCHES[answers.screen.size] ?? null,
      externalDisplayCount: DISPLAY_VALUES[answers.externalDisplays.count],
      ownershipPeriod: answers.ownership.period === "unsure" ? null : answers.ownership.period,
    },
    unusedForRanking: {
      batteryImportance: answers.mobility.batteryImportance,
      connectionNeeds,
      connectionImportance: answers.connections.importance,
    },
  });
}

export function migrateV1Answers(v1Answers) {
  const answers = createInitialAnswers();
  const issues = [];

  if (!v1Answers || typeof v1Answers !== "object" || Array.isArray(v1Answers)) {
    return deepFreeze({
      answers,
      issues: [{ field: "answers", code: "invalid-v1-input", message: "V1 answers must be an object." }],
      requiresReview: true,
    });
  }

  if (Object.hasOwn(BUDGET_VALUES_MINOR, v1Answers.maximumBudget)) {
    answers.budget.target = v1Answers.maximumBudget;
    answers.budget.mode = "strict";
  } else if (["over-2500", "flexible"].includes(v1Answers.maximumBudget)) {
    answers.budget.target = "no-fixed-target";
  }

  if (Array.isArray(v1Answers.primaryUses)) {
    v1Answers.primaryUses.forEach((useId) => {
      if (useId === "video-3d") {
        issues.push({
          field: "primaryUses",
          code: "ambiguous-video-3d",
          message: "The former video/3D answer must be reviewed because v1.1 separates those uses.",
        });
        return;
      }
      const mapped = V1_PRIMARY_USE_MAP[useId];
      if (mapped && !answers.primaryUses.includes(mapped)) answers.primaryUses.push(mapped);
    });
  }

  if (v1Answers.screenSize === "no-preference") {
    answers.screen.size = "no-preference";
  } else if (["compact", "large"].includes(v1Answers.screenSize)) {
    issues.push({
      field: "screenSize",
      code: "ambiguous-screen-group",
      message: "The former screen-size group must be reviewed because v1.1 asks for an exact size.",
    });
  }

  if (getQuestionDefinition("portabilityPerformance").options.some(({ id }) => id === v1Answers.portabilityPerformance)) {
    answers.mobility.portabilityPerformance = v1Answers.portabilityPerformance;
  }

  if (v1Answers.workloadIntensity) {
    issues.push({
      field: "workloadIntensity",
      code: "adaptive-workload-review",
      message: "The former global workload answer must be reviewed against the adaptive workload questions.",
    });
  }
  if (answers.primaryUses.length > 0) answers.workloadRequirementMode = "preference";

  if (Object.hasOwn(STORAGE_VALUES_GB, v1Answers.minimumStorage)) {
    answers.minimumStorage = v1Answers.minimumStorage;
  }

  const displayMap = { none: "none", one: "one", two: "two", "three-plus": "three", unsure: "unsure" };
  if (displayMap[v1Answers.externalDisplays]) {
    answers.externalDisplays.count = displayMap[v1Answers.externalDisplays];
    if (["one", "two", "three-plus"].includes(v1Answers.externalDisplays)) {
      answers.externalDisplays.requirementMode = "must-support";
    }
  }

  const ownershipOptions = getQuestionDefinition("ownershipPeriod").options.map(({ id }) => id);
  if (ownershipOptions.includes(v1Answers.ownershipPeriod)) {
    answers.ownership.period = v1Answers.ownershipPeriod;
    if (v1Answers.ownershipPeriod !== "unsure") answers.ownership.requirementMode = "preference";
  }

  return deepFreeze({
    answers: reconcileQuestionnaireAnswers(answers),
    issues,
    requiresReview: issues.length > 0,
  });
}
