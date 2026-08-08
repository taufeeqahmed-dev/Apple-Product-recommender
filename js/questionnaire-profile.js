import {
  QUESTION_DEFINITIONS,
  QUESTION_ORDER,
  getAllQuestionControls,
  getQuestionControl,
  getQuestionDefinition,
  getQuestionStepForControl,
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

const DISPLAY_VALUES = Object.freeze({ one: 1, two: 2, three: 3, "four-plus": 4 });

const BASE_WORKLOAD = Object.freeze({
  "study-productivity": Object.freeze({ capabilityBand: 1, memoryGb: 8 }),
  "software-development": Object.freeze({ capabilityBand: 2, memoryGb: 16 }),
  "cybersecurity-vms": Object.freeze({ capabilityBand: 2, memoryGb: 16 }),
  "photo-editing": Object.freeze({ capabilityBand: 2, memoryGb: 16 }),
  "video-editing": Object.freeze({ capabilityBand: 2, memoryGb: 16 }),
  "music-production": Object.freeze({ capabilityBand: 2, memoryGb: 16 }),
  "3d-engineering": Object.freeze({ capabilityBand: 3, memoryGb: 16 }),
});

const ACTIVITY_SIGNALS = Object.freeze({
  "documents-browsing-calls": Object.freeze([1, 8]),
  "research-spreadsheets-tabs": Object.freeze([2, 16]),
  "statistics-analysis-local-tools": Object.freeze([3, 24]),
  "general-programming": Object.freeze([2, 16]),
  "web-mobile-development": Object.freeze([2, 16]),
  "local-development-servers": Object.freeze([2, 16]),
  "local-databases": Object.freeze([2, 16]),
  "docker-containers": Object.freeze([3, 24]),
  "one-virtual-machine": Object.freeze([3, 16]),
  "two-virtual-machines": Object.freeze([3, 24]),
  "three-plus-virtual-machines": Object.freeze([4, 36]),
  "larger-local-ai-models": Object.freeze([4, 36]),
  "jpeg-light-edits": Object.freeze([2, 16]),
  "regular-raw-editing": Object.freeze([3, 16]),
  "large-raw-batches-panoramas": Object.freeze([3, 24]),
  "professional-sustained-photo": Object.freeze([4, 36]),
  "1080p-light": Object.freeze([2, 16]),
  "4k-single-stream": Object.freeze([3, 16]),
  "4k-multicam-effects": Object.freeze([4, 24]),
  "6k-8k-sustained": Object.freeze([4, 36]),
  "small-projects-few-plugins": Object.freeze([2, 16]),
  "medium-music-projects": Object.freeze([3, 16]),
  "large-sample-libraries-many-plugins": Object.freeze([3, 24]),
  "professional-low-latency": Object.freeze([4, 36]),
  "2d-light-models": Object.freeze([2, 16]),
  "moderate-3d-models": Object.freeze([3, 16]),
  "complex-cad-simulation": Object.freeze([4, 24]),
  "sustained-rendering-simulation": Object.freeze([4, 36]),
});

const MULTITASKING_SIGNALS = Object.freeze({
  light: Object.freeze([1, 8]),
  moderate: Object.freeze([2, 16]),
  heavy: Object.freeze([3, 24]),
  "very-heavy": Object.freeze([4, 36]),
});

const V1_PRIMARY_USE_MAP = Object.freeze({
  "everyday-study": "study-productivity",
  coding: "software-development",
  "office-business": "study-productivity",
  photography: "photo-editing",
  "music-audio": "music-production",
});

const V2_ACTIVITY_MAP = Object.freeze({
  "documents-browsing-calls": "documents-browsing-calls",
  "research-spreadsheets-tabs": "research-spreadsheets-tabs",
  "statistics-analysis-local-tools": "statistics-analysis-local-tools",
  "learning-scripts-small-sites": "general-programming",
  "web-mobile-local-services": "web-mobile-development",
  "containers-large-builds": "docker-containers",
  "native-ml-heavy-builds": "larger-local-ai-models",
  "one-vm": "one-virtual-machine",
  "two-vms": "two-virtual-machines",
  "three-plus-vms": "three-plus-virtual-machines",
  "jpeg-light-edits": "jpeg-light-edits",
  "regular-raw-editing": "regular-raw-editing",
  "large-raw-batches-panoramas": "large-raw-batches-panoramas",
  "professional-sustained-photo": "professional-sustained-photo",
  "1080p-light": "1080p-light",
  "4k-single-stream": "4k-single-stream",
  "4k-multicam-effects": "4k-multicam-effects",
  "6k-8k-sustained": "6k-8k-sustained",
  "small-projects-few-plugins": "small-projects-few-plugins",
  "medium-projects": "medium-music-projects",
  "large-sample-libraries-many-plugins": "large-sample-libraries-many-plugins",
  "professional-low-latency": "professional-low-latency",
  "2d-light-models": "2d-light-models",
  "moderate-3d-models": "moderate-3d-models",
  "complex-cad-simulation": "complex-cad-simulation",
  "sustained-rendering-simulation": "sustained-rendering-simulation",
});

export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

const clone = (value) => structuredClone(value);
const isAnswered = (value) =>
  Array.isArray(value)
    ? value.length > 0
    : value !== null && value !== "" && value !== undefined;

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
    budget: { target: "", mode: null, absoluteMaximum: null },
    primaryUses: [],
    activities: [],
    multitasking: "",
    devicePreferences: { portabilityPerformance: "", screenSize: "" },
    minimumStorage: "",
    essentialRequirements: [],
    essentialDetails: { maximumWeight: null, externalDisplayCount: null },
  };
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
    default:
      return false;
  }
}

function mergeKnownAnswers(input) {
  const answers = createInitialAnswers();
  if (!input || typeof input !== "object" || Array.isArray(input)) return answers;
  getAllQuestionControls().forEach(({ answerPath }) => {
    const value = getAnswerValue(input, answerPath);
    if (value !== undefined) setAnswerValue(answers, answerPath, value);
  });
  return answers;
}

export function getAvailableAbsoluteBudgetIds(targetId) {
  const targets = Object.keys(BUDGET_VALUES_MINOR);
  const index = targets.indexOf(targetId);
  return index < 0 ? ["no-absolute-limit"] : [...targets.slice(index + 1), "no-absolute-limit"];
}

export function getAvailableControlOptions(control, answers) {
  if (!control) return [];
  if (control.id === "absoluteBudget") {
    const allowed = new Set(getAvailableAbsoluteBudgetIds(answers.budget.target));
    return control.options.filter(({ id }) => allowed.has(id));
  }
  if (control.id === "activities") {
    return control.options.filter(
      ({ relevantUses }) =>
        !relevantUses || relevantUses.some((useId) => answers.primaryUses.includes(useId)),
    );
  }
  return control.options.filter(({ visibility }) => conditionMatches(visibility, answers));
}

export function getVisibleQuestionIds(answersInput) {
  const answers = mergeKnownAnswers(answersInput);
  return QUESTION_ORDER.filter((questionId) =>
    conditionMatches(getQuestionDefinition(questionId).visibility, answers),
  );
}

export function getVisibleControls(question, answersInput) {
  const answers = mergeKnownAnswers(answersInput);
  return question.controls.filter((questionControl) =>
    conditionMatches(questionControl.visibility, answers),
  );
}

function retainUnknownAndRelevantIds(value, availableOptions, allOptions) {
  if (!Array.isArray(value)) return value;
  const known = new Set(allOptions.map(({ id }) => id));
  const available = new Set(availableOptions.map(({ id }) => id));
  return value.filter((id) => !known.has(id) || available.has(id));
}

export function reconcileQuestionnaireAnswers(input) {
  const answers = mergeKnownAnswers(input);

  if (answers.budget.target === "no-fixed-target" || answers.budget.target === "") {
    answers.budget.mode = null;
    answers.budget.absoluteMaximum = null;
  } else if (!(["flexible", "stretch"].includes(answers.budget.mode))) {
    answers.budget.absoluteMaximum = null;
  } else if (answers.budget.absoluteMaximum) {
    const absoluteControl = getQuestionControl("absoluteBudget");
    const knownIds = new Set(absoluteControl.options.map(({ id }) => id));
    const availableIds = new Set(getAvailableAbsoluteBudgetIds(answers.budget.target));
    if (
      knownIds.has(answers.budget.absoluteMaximum) &&
      !availableIds.has(answers.budget.absoluteMaximum)
    ) {
      answers.budget.absoluteMaximum = null;
    }
  }

  const activitiesControl = getQuestionControl("activities");
  answers.activities = retainUnknownAndRelevantIds(
    answers.activities,
    getAvailableControlOptions(activitiesControl, answers),
    activitiesControl.options,
  );

  const essentialControl = getQuestionControl("essentialRequirements");
  answers.essentialRequirements = retainUnknownAndRelevantIds(
    answers.essentialRequirements,
    getAvailableControlOptions(essentialControl, answers),
    essentialControl.options,
  );

  if (!answers.essentialRequirements.includes("maximum-weight")) {
    answers.essentialDetails.maximumWeight = null;
  }
  if (!answers.essentialRequirements.includes("external-displays")) {
    answers.essentialDetails.externalDisplayCount = null;
  }
  return answers;
}

function optionLabels(control, values) {
  const labels = new Map(control.options.map(({ id, label }) => [id, label]));
  return values.map((value) => labels.get(value) ?? value);
}

export function previewQuestionnaireAnswerChange(input, controlId, value) {
  const control = getQuestionControl(controlId);
  if (!control) throw new Error(`Unknown questionnaire control: ${controlId}`);
  const currentAnswers = reconcileQuestionnaireAnswers(input);
  const changedAnswers = clone(currentAnswers);
  setAnswerValue(changedAnswers, control.answerPath, value);
  const nextAnswers = reconcileQuestionnaireAnswers(changedAnswers);
  const clearedAnswers = [];

  getAllQuestionControls().forEach((candidate) => {
    if (candidate.id === controlId) return;
    const before = getAnswerValue(currentAnswers, candidate.answerPath);
    const after = getAnswerValue(nextAnswers, candidate.answerPath);
    if (Array.isArray(before)) {
      const afterIds = new Set(Array.isArray(after) ? after : []);
      const removed = before.filter((id) => !afterIds.has(id));
      if (removed.length > 0) {
        clearedAnswers.push({
          controlId: candidate.id,
          prompt: candidate.prompt,
          labels: optionLabels(candidate, removed),
        });
      }
    } else if (isAnswered(before) && before !== after) {
      clearedAnswers.push({
        controlId: candidate.id,
        prompt: candidate.prompt,
        labels: optionLabels(candidate, [before]),
      });
    }
  });

  return deepFreeze({
    nextAnswers,
    clearedQuestionIds: [...new Set(clearedAnswers.map(({ controlId: id }) => id))],
    clearedAnswers,
  });
}

function validateControlValue(control, value, answers, errors) {
  const availableOptions = getAvailableControlOptions(control, answers);
  const allowed = new Set(availableOptions.map(({ id }) => id));
  const values = Array.isArray(value) ? value : [value];
  if (control.required && !isAnswered(value)) {
    errors.push(`Required answer missing for ${control.id}.`);
    return;
  }
  if (!isAnswered(value)) return;
  if (control.type === "checkbox" && !Array.isArray(value)) {
    errors.push(`${control.id} must be an array.`);
    return;
  }
  values.forEach((id) => {
    if (!allowed.has(id)) errors.push(`Invalid or hidden answer for ${control.id}: ${id}.`);
  });
  if (control.minimumSelections && values.length < control.minimumSelections) {
    errors.push(`${control.id} needs at least ${control.minimumSelections} answer.`);
  }
  if (control.maximumSelections && values.length > control.maximumSelections) {
    errors.push(`${control.id} allows no more than ${control.maximumSelections} answers.`);
  }
  const exclusiveIds = new Set(availableOptions.filter(({ exclusive }) => exclusive).map(({ id }) => id));
  if (values.length > 1 && values.some((id) => exclusiveIds.has(id))) {
    errors.push(`${control.id} contains an exclusive answer with another selection.`);
  }
}

export function validateQuestionnaireAnswers(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return deepFreeze({ valid: false, errors: ["Questionnaire answers must be an object."] });
  }
  const rawAnswers = mergeKnownAnswers(input);
  const reconciled = reconcileQuestionnaireAnswers(rawAnswers);
  const errors = [];

  QUESTION_DEFINITIONS.forEach((question) => {
    const questionVisible = conditionMatches(question.visibility, rawAnswers);
    question.controls.forEach((questionControl) => {
      const value = getAnswerValue(rawAnswers, questionControl.answerPath);
      const visible = questionVisible && conditionMatches(questionControl.visibility, rawAnswers);
      if (!visible) {
        if (isAnswered(value)) errors.push(`Hidden answer retained for ${questionControl.id}.`);
        return;
      }
      validateControlValue(questionControl, value, rawAnswers, errors);
    });
  });

  if (JSON.stringify(rawAnswers.activities) !== JSON.stringify(reconciled.activities)) {
    errors.push("Hidden activity answer retained.");
  }
  if (
    JSON.stringify(rawAnswers.essentialRequirements) !==
    JSON.stringify(reconciled.essentialRequirements)
  ) {
    errors.push("Hidden essential requirement retained.");
  }
  return deepFreeze({ valid: errors.length === 0, errors: [...new Set(errors)] });
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
  answers.activities.forEach((activityId) =>
    applySignal(`activities.${activityId}`, ACTIVITY_SIGNALS[activityId]),
  );
  applySignal("multitasking", MULTITASKING_SIGNALS[answers.multitasking]);

  return deepFreeze({
    capabilityBand,
    memoryGb,
    requirementMode: answers.essentialRequirements.includes("workload")
      ? "mandatory"
      : "preference",
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
  const workloadEssential = answers.essentialRequirements.includes("workload");
  const weightEssential = answers.essentialRequirements.includes("maximum-weight");
  const displayEssential = answers.essentialRequirements.includes("external-displays");

  return deepFreeze({
    answers,
    visibleQuestionIds: getVisibleQuestionIds(answers),
    validation,
    workload,
    hardRequirements: {
      budgetMaximumMinor: absoluteBudgetMinor,
      storageMinimumGb: STORAGE_VALUES_GB[answers.minimumStorage] ?? null,
      workloadCapabilityBand: workloadEssential ? workload.capabilityBand : null,
      memoryMinimumGb: workloadEssential ? workload.memoryGb : null,
      weightMaximumKg: weightEssential
        ? WEIGHT_VALUES_KG[answers.essentialDetails.maximumWeight] ?? null
        : null,
      exactScreenSizeInches: answers.essentialRequirements.includes("exact-screen")
        ? SCREEN_VALUES_INCHES[answers.devicePreferences.screenSize] ?? null
        : null,
      externalDisplayMinimum: displayEssential
        ? DISPLAY_VALUES[answers.essentialDetails.externalDisplayCount] ?? null
        : null,
    },
    preferences: {
      budgetTargetMinor,
      primaryUses: [...answers.primaryUses],
      workloadCapabilityBand: workload.capabilityBand,
      memoryGb: workload.memoryGb,
      portabilityPerformance: answers.devicePreferences.portabilityPerformance,
      weightTargetKg: weightEssential
        ? WEIGHT_VALUES_KG[answers.essentialDetails.maximumWeight] ?? null
        : null,
      screenSizeInches: SCREEN_VALUES_INCHES[answers.devicePreferences.screenSize] ?? null,
      externalDisplayCount: displayEssential
        ? DISPLAY_VALUES[answers.essentialDetails.externalDisplayCount] ?? null
        : null,
    },
  });
}

function migrationIssue(field, code, message) {
  return { field, code, message };
}

export function migrateV2Answers(v2Answers) {
  const answers = createInitialAnswers();
  const issues = [];
  if (!v2Answers || typeof v2Answers !== "object" || Array.isArray(v2Answers)) {
    return deepFreeze({
      answers,
      issues: [migrationIssue("answers", "invalid-v2-input", "V2 answers must be an object.")],
      requiresReview: true,
    });
  }

  answers.budget.target = v2Answers.budget?.target ?? "";
  answers.budget.mode = v2Answers.budget?.mode ?? null;
  answers.budget.absoluteMaximum = v2Answers.budget?.absoluteMaximum ?? null;
  answers.primaryUses = Array.isArray(v2Answers.primaryUses) ? [...v2Answers.primaryUses] : [];
  answers.multitasking = v2Answers.multitasking ?? "";
  answers.devicePreferences.portabilityPerformance =
    v2Answers.mobility?.portabilityPerformance ?? "";
  answers.devicePreferences.screenSize = v2Answers.screen?.size ?? "";
  answers.minimumStorage = v2Answers.minimumStorage ?? "";

  Object.entries(v2Answers.workloadDetails ?? {}).forEach(([key, value]) => {
    if (!value || value === "unsure") return;
    if (key === "sustainedDuration" || value === "no-local-vms") {
      issues.push(
        migrationIssue(
          `workloadDetails.${key}`,
          "workload-detail-review",
          "This former workload answer has no exact activity equivalent and must be reviewed.",
        ),
      );
      return;
    }
    const mapped = V2_ACTIVITY_MAP[value];
    if (mapped && !answers.activities.includes(mapped)) answers.activities.push(mapped);
  });
  if (answers.activities.length === 0 && answers.primaryUses.length > 0) answers.activities = ["unsure"];

  if (v2Answers.workloadRequirementMode === "mandatory") {
    answers.essentialRequirements.push("workload");
  }
  if (v2Answers.screen?.requirementMode === "exact-size-required") {
    answers.essentialRequirements.push("exact-screen");
  }
  if (v2Answers.mobility?.weightRequirementMode === "must-not-exceed") {
    answers.essentialRequirements.push("maximum-weight");
    answers.essentialDetails.maximumWeight = v2Answers.mobility.weightTarget ?? null;
  } else if (
    v2Answers.mobility?.weightTarget &&
    !["no-weight-preference", "unsure"].includes(v2Answers.mobility.weightTarget)
  ) {
    issues.push(
      migrationIssue(
        "mobility.weightTarget",
        "soft-weight-removed",
        "The former soft numeric weight preference is replaced by the portability balance.",
      ),
    );
  }
  if (v2Answers.externalDisplays?.requirementMode === "must-support") {
    answers.essentialRequirements.push("external-displays");
    answers.essentialDetails.externalDisplayCount = v2Answers.externalDisplays.count ?? null;
  } else if (
    v2Answers.externalDisplays?.count &&
    !["none", "unsure"].includes(v2Answers.externalDisplays.count)
  ) {
    issues.push(
      migrationIssue(
        "externalDisplays.count",
        "soft-display-preference-removed",
        "External-display counts are now collected only when explicitly essential.",
      ),
    );
  }
  if (answers.essentialRequirements.length === 0) answers.essentialRequirements = ["none"];

  if (v2Answers.mobility?.batteryImportance && v2Answers.mobility.batteryImportance !== "unsure") {
    issues.push(migrationIssue("mobility.batteryImportance", "battery-removed", "Battery is no longer asked because it cannot be evaluated from verified data."));
  }
  if (Array.isArray(v2Answers.connections?.needs) && v2Answers.connections.needs.length > 0) {
    issues.push(migrationIssue("connections", "connections-removed", "Connection questions are no longer asked because the verified catalogue cannot rank them."));
  }
  if (v2Answers.ownership?.period && v2Answers.ownership.period !== "unsure") {
    issues.push(migrationIssue("ownership", "ownership-removed", "Ownership headroom was removed from the main questionnaire and active scoring."));
  }

  return deepFreeze({
    answers: reconcileQuestionnaireAnswers(answers),
    issues,
    requiresReview: issues.length > 0,
  });
}

export function migrateV1Answers(v1Answers) {
  const answers = createInitialAnswers();
  const issues = [];
  if (!v1Answers || typeof v1Answers !== "object" || Array.isArray(v1Answers)) {
    return deepFreeze({
      answers,
      issues: [migrationIssue("answers", "invalid-v1-input", "V1 answers must be an object.")],
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
        issues.push(migrationIssue("primaryUses", "ambiguous-video-3d", "The former video/3D answer must be reviewed because the uses are now separate."));
        return;
      }
      const mapped = V1_PRIMARY_USE_MAP[useId];
      if (mapped && !answers.primaryUses.includes(mapped)) answers.primaryUses.push(mapped);
    });
  }
  answers.activities = answers.primaryUses.length > 0 ? ["unsure"] : [];
  if (v1Answers.screenSize === "no-preference") {
    answers.devicePreferences.screenSize = "no-preference";
  } else if (["compact", "large"].includes(v1Answers.screenSize)) {
    issues.push(migrationIssue("screenSize", "ambiguous-screen-group", "The former screen-size group must be reviewed because the questionnaire asks for an exact preferred size."));
  }
  const portabilityIds = new Set(
    getQuestionControl("portabilityPerformance").options.map(({ id }) => id),
  );
  if (portabilityIds.has(v1Answers.portabilityPerformance)) {
    answers.devicePreferences.portabilityPerformance = v1Answers.portabilityPerformance;
  }
  if (v1Answers.workloadIntensity) {
    issues.push(migrationIssue("workloadIntensity", "activity-review", "The former global workload answer must be reviewed against the new activity selections."));
  }
  if (Object.hasOwn(STORAGE_VALUES_GB, v1Answers.minimumStorage)) {
    answers.minimumStorage = v1Answers.minimumStorage;
  }
  const displayMap = { one: "one", two: "two", "three-plus": "three" };
  if (displayMap[v1Answers.externalDisplays]) {
    answers.essentialRequirements.push("external-displays");
    answers.essentialDetails.externalDisplayCount = displayMap[v1Answers.externalDisplays];
  }
  if (answers.essentialRequirements.length === 0) answers.essentialRequirements = ["none"];
  if (v1Answers.ownershipPeriod && v1Answers.ownershipPeriod !== "unsure") {
    issues.push(migrationIssue("ownershipPeriod", "ownership-removed", "Ownership headroom is no longer part of the main questionnaire."));
  }

  return deepFreeze({
    answers: reconcileQuestionnaireAnswers(answers),
    issues,
    requiresReview: issues.length > 0,
  });
}
