const TOTAL_STEPS = 8;

const ANSWER_KEYS = new Set([
  "maximumBudget",
  "primaryUses",
  "screenSize",
  "portabilityPerformance",
  "workloadIntensity",
  "minimumStorage",
  "externalDisplays",
  "ownershipPeriod",
]);

function createInitialState() {
  return {
    currentStep: 0,
    status: "in-progress",
    answers: {
      maximumBudget: "",
      primaryUses: [],
      screenSize: "",
      portabilityPerformance: "",
      workloadIntensity: "",
      minimumStorage: "",
      externalDisplays: "",
      ownershipPeriod: "",
    },
    validation: {
      attemptedSteps: Array(TOTAL_STEPS).fill(false),
    },
  };
}

let state = createInitialState();

function createSnapshot() {
  const answers = Object.freeze({
    ...state.answers,
    primaryUses: Object.freeze([...state.answers.primaryUses]),
  });
  const validation = Object.freeze({
    attemptedSteps: Object.freeze([...state.validation.attemptedSteps]),
  });

  return Object.freeze({
    currentStep: state.currentStep,
    status: state.status,
    answers,
    validation,
  });
}

export function getState() {
  return createSnapshot();
}

export function setAnswer(answerId, value) {
  if (!ANSWER_KEYS.has(answerId)) {
    throw new Error(`Unknown questionnaire answer: ${answerId}`);
  }

  const nextValue = answerId === "primaryUses" ? [...value] : value;
  state = {
    ...state,
    answers: {
      ...state.answers,
      [answerId]: nextValue,
    },
  };

  return createSnapshot();
}

export function setCurrentStep(stepIndex) {
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= TOTAL_STEPS) {
    throw new RangeError(`Questionnaire step must be between 0 and ${TOTAL_STEPS - 1}.`);
  }

  state = {
    ...state,
    currentStep: stepIndex,
  };

  return createSnapshot();
}

export function markStepAttempted(stepIndex) {
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= TOTAL_STEPS) {
    throw new RangeError(`Questionnaire step must be between 0 and ${TOTAL_STEPS - 1}.`);
  }

  const attemptedSteps = [...state.validation.attemptedSteps];
  attemptedSteps[stepIndex] = true;
  state = {
    ...state,
    validation: {
      attemptedSteps,
    },
  };

  return createSnapshot();
}

export function completeQuestionnaire() {
  state = {
    ...state,
    status: "complete",
  };

  return createSnapshot();
}

export function resetQuestionnaire() {
  state = createInitialState();
  return createSnapshot();
}
