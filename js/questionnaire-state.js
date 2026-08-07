import { QUESTION_ORDER, getQuestionDefinition } from "./questionnaire-definition.js";
import {
  createInitialAnswers,
  deepFreeze,
  deriveQuestionnaireProfile,
  getVisibleQuestionIds,
  previewQuestionnaireAnswerChange,
  validateQuestionnaireAnswers,
} from "./questionnaire-profile.js";
import { APPLICATION_VERSION, QUESTIONNAIRE_SCHEMA_VERSION } from "./version.js";

function createInitialState() {
  return {
    applicationVersion: APPLICATION_VERSION,
    questionnaireSchemaVersion: QUESTIONNAIRE_SCHEMA_VERSION,
    status: "in-progress",
    currentQuestionId: QUESTION_ORDER[0],
    answers: createInitialAnswers(),
    validation: {
      attemptedQuestionIds: [],
    },
    editing: {
      active: false,
      originQuestionId: null,
      returnToResults: false,
    },
    pendingChange: null,
  };
}

let state = createInitialState();
let answersBeforeEditing = null;

function snapshot() {
  return deepFreeze(structuredClone(state));
}

function requireKnownQuestion(questionId) {
  const definition = getQuestionDefinition(questionId);
  if (!definition) throw new Error(`Unknown questionnaire question: ${questionId}`);
  return definition;
}

function ensureCurrentQuestionIsVisible(nextState) {
  const visibleQuestionIds = getVisibleQuestionIds(nextState.answers);
  if (!visibleQuestionIds.includes(nextState.currentQuestionId)) {
    nextState.currentQuestionId = visibleQuestionIds[0] ?? QUESTION_ORDER[0];
  }
}

function applyPreview(preview) {
  state = {
    ...state,
    answers: structuredClone(preview.nextAnswers),
    pendingChange: null,
  };
  ensureCurrentQuestionIsVisible(state);
  return snapshot();
}

export function getState() {
  return snapshot();
}

export function getCurrentProfile() {
  return deriveQuestionnaireProfile(state.answers);
}

export function setCurrentQuestion(questionId) {
  requireKnownQuestion(questionId);
  if (!getVisibleQuestionIds(state.answers).includes(questionId)) {
    throw new RangeError(`Question is not currently applicable: ${questionId}`);
  }
  state = { ...state, currentQuestionId: questionId };
  return snapshot();
}

export function markQuestionAttempted(questionId) {
  requireKnownQuestion(questionId);
  const attemptedQuestionIds = state.validation.attemptedQuestionIds.includes(questionId)
    ? [...state.validation.attemptedQuestionIds]
    : [...state.validation.attemptedQuestionIds, questionId];
  state = {
    ...state,
    validation: { attemptedQuestionIds },
  };
  return snapshot();
}

export function requestAnswerChange(questionId, value) {
  requireKnownQuestion(questionId);
  const preview = previewQuestionnaireAnswerChange(state.answers, questionId, value);

  if (preview.clearedQuestionIds.length > 0) {
    state = {
      ...state,
      pendingChange: {
        questionId,
        value: structuredClone(value),
        clearedQuestionIds: [...preview.clearedQuestionIds],
      },
    };
    return snapshot();
  }

  return applyPreview(preview);
}

export function confirmPendingAnswerChange() {
  if (!state.pendingChange) return snapshot();
  const { questionId, value } = state.pendingChange;
  return applyPreview(previewQuestionnaireAnswerChange(state.answers, questionId, value));
}

export function cancelPendingAnswerChange() {
  state = { ...state, pendingChange: null };
  return snapshot();
}

export function beginEditing(questionId, { returnToResults = true } = {}) {
  if (state.status !== "complete") {
    throw new Error("Questionnaire answers can only be edited after completion.");
  }
  setCurrentQuestion(questionId);
  answersBeforeEditing = structuredClone(state.answers);
  state = {
    ...state,
    status: "editing",
    editing: {
      active: true,
      originQuestionId: questionId,
      returnToResults,
    },
  };
  return snapshot();
}

export function finishEditing() {
  if (!state.editing.active) return snapshot();
  const visibleQuestionIds = getVisibleQuestionIds(state.answers);
  answersBeforeEditing = null;
  state = {
    ...state,
    status: "complete",
    currentQuestionId:
      visibleQuestionIds[visibleQuestionIds.length - 1] ?? state.currentQuestionId,
    editing: {
      active: false,
      originQuestionId: null,
      returnToResults: false,
    },
  };
  return snapshot();
}

export function cancelEditing() {
  if (!state.editing.active) return snapshot();
  state = {
    ...state,
    status: "complete",
    answers: structuredClone(answersBeforeEditing ?? state.answers),
    editing: {
      active: false,
      originQuestionId: null,
      returnToResults: false,
    },
    pendingChange: null,
  };
  answersBeforeEditing = null;
  ensureCurrentQuestionIsVisible(state);
  return snapshot();
}

export function completeQuestionnaire() {
  const validation = validateQuestionnaireAnswers(state.answers);
  if (!validation.valid) {
    throw new Error(`Questionnaire cannot be completed: ${validation.errors.join(" ")}`);
  }
  state = { ...state, status: "complete", pendingChange: null };
  return snapshot();
}

export function resetQuestionnaire() {
  state = createInitialState();
  answersBeforeEditing = null;
  return snapshot();
}
