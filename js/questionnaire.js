import { getQuestionDefinition } from "./questionnaire-definition.js";
import {
  getAnswerValue,
  getAvailableAbsoluteBudgetIds,
  getVisibleQuestionIds,
} from "./questionnaire-profile.js";
import {
  completeQuestionnaire,
  confirmPendingAnswerChange,
  getState,
  markQuestionAttempted,
  requestAnswerChange,
  resetQuestionnaire,
  setCurrentQuestion,
} from "./questionnaire-state.js";

const CONNECTION_EXCLUSIVE_IDS = new Set(["no-specific-need", "unsure"]);

function createElement(tagName, className = "", text = undefined) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function isAnswered(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== "" && value !== undefined;
}

export function validateQuestionValue(definition, value) {
  if (!definition.required && !isAnswered(value)) {
    return { valid: true, message: "" };
  }

  if (definition.type === "checkbox") {
    const count = Array.isArray(value) ? value.length : 0;
    if (definition.minimumSelections && count < definition.minimumSelections) {
      return {
        valid: false,
        message:
          definition.id === "primaryUses"
            ? "Choose one or two primary uses before continuing."
            : "Choose at least one answer before continuing.",
      };
    }
    if (definition.maximumSelections && count > definition.maximumSelections) {
      return {
        valid: false,
        message: `Choose no more than ${definition.maximumSelections} answers.`,
      };
    }
    return { valid: true, message: "" };
  }

  if (!isAnswered(value)) {
    return { valid: false, message: "Choose an answer before continuing." };
  }
  return { valid: true, message: "" };
}

export function getQuestionProgress(answers, currentQuestionId) {
  const visibleQuestionIds = getVisibleQuestionIds(answers);
  const currentIndex = visibleQuestionIds.indexOf(currentQuestionId);
  return {
    visibleQuestionIds,
    currentIndex,
    questionNumber: currentIndex + 1,
    totalQuestions: visibleQuestionIds.length,
  };
}

export function getNextCheckboxValue(definition, currentValue, optionId, checked) {
  const selected = new Set(Array.isArray(currentValue) ? currentValue : []);

  if (!checked) {
    selected.delete(optionId);
    return [...selected];
  }

  if (definition.id === "connectionNeeds") {
    if (CONNECTION_EXCLUSIVE_IDS.has(optionId)) {
      return [optionId];
    }
    CONNECTION_EXCLUSIVE_IDS.forEach((exclusiveId) => selected.delete(exclusiveId));
  }

  selected.add(optionId);
  return [...selected];
}

function getQuestionOptions(definition, answers) {
  if (definition.id !== "absoluteBudget") return definition.options;
  const allowed = new Set(getAvailableAbsoluteBudgetIds(answers.budget.target));
  return definition.options.filter(({ id }) => allowed.has(id));
}

function getQuestionHelp(definition) {
  const messages = [];
  if (!definition.required) {
    messages.push("Optional — you can continue without answering.");
  }
  if (definition.maximumSelections) {
    messages.push(`Choose up to ${definition.maximumSelections}.`);
  }
  if (definition.id === "batteryImportance") {
    messages.push(
      "This answer is recorded for explanation but cannot affect ranking because model-specific battery runtime is not verified in the catalogue.",
    );
  }
  if (definition.id === "connectionNeeds") {
    messages.push(
      "These answers cannot affect ranking because a verified model-specific port inventory is not present in the catalogue.",
    );
  }
  return messages.join(" ");
}

function controlId(questionId, optionId) {
  return `question-${questionId}-option-${optionId}`;
}

function renderQuestionContent(container, state, { moveFocus = true } = {}) {
  const definition = getQuestionDefinition(state.currentQuestionId);
  const value = getAnswerValue(state.answers, definition.answerPath);
  const section = createElement("section", "questionnaire-step");
  section.dataset.questionId = definition.id;

  const heading = createElement(
    "h3",
    "questionnaire-step-heading",
    definition.required ? "Required question" : "Optional question",
  );
  heading.id = `question-heading-${definition.id}`;
  heading.tabIndex = -1;

  const fieldset = document.createElement("fieldset");
  const legend = createElement("legend", "", definition.prompt);
  const helpText = getQuestionHelp(definition);
  const helpId = `question-help-${definition.id}`;
  const errorId = `question-error-${definition.id}`;
  const describedBy = [];

  fieldset.append(legend);
  if (helpText) {
    const help = createElement("p", "questionnaire-help", helpText);
    help.id = helpId;
    fieldset.append(help);
    describedBy.push(helpId);
  }
  describedBy.push(errorId);
  fieldset.setAttribute("aria-describedby", describedBy.join(" "));

  const optionGrid = createElement(
    "div",
    definition.options.length > 4 ? "option-grid" : "option-grid option-grid-single",
  );
  const options = getQuestionOptions(definition, state.answers);
  options.forEach((option) => {
    const label = createElement("label", "option-card");
    const input = document.createElement("input");
    input.id = controlId(definition.id, option.id);
    input.type = definition.type;
    input.name = `question-${definition.id}`;
    input.value = option.id;
    input.dataset.questionId = definition.id;
    input.checked =
      definition.type === "checkbox"
        ? Array.isArray(value) && value.includes(option.id)
        : value === option.id;
    if (definition.required && definition.type === "radio") input.required = true;
    const optionText = createElement("span", "", option.label);
    label.append(input, optionText);
    optionGrid.append(label);
  });

  const error = createElement("p", "questionnaire-error");
  error.id = errorId;
  error.role = "alert";
  error.hidden = true;
  fieldset.append(optionGrid, error);
  section.append(heading, fieldset);
  container.replaceChildren(section);

  if (moveFocus) heading.focus();
}

function setLiveText(element, message) {
  element.textContent = "";
  element.hidden = false;
  window.requestAnimationFrame(() => {
    element.textContent = message;
  });
}

export function initialiseQuestionnaire({ onComplete = null, onRestart = null } = {}) {
  const form = document.querySelector("#questionnaire-form");
  const questionContainer = document.querySelector("#questionnaire-question");
  const progress = document.querySelector("#questionnaire-progress");
  const progressText = document.querySelector("#questionnaire-progress-text");
  const changeSummary = document.querySelector("#questionnaire-change-summary");
  const backButton = document.querySelector("#questionnaire-back");
  const submitButton = document.querySelector("#questionnaire-continue");
  const completionPanel = document.querySelector("#questionnaire-complete");
  const restartConfirmation = document.querySelector("#restart-confirmation");
  const restartConfirmationTitle = document.querySelector("#restart-confirmation-title");
  const confirmRestartButton = document.querySelector("#confirm-restart");
  const cancelRestartButton = document.querySelector("#cancel-restart");
  const restartButtons = [...document.querySelectorAll("[data-restart-questionnaire]")];
  let restartReturnTarget = null;

  if (
    !form ||
    !questionContainer ||
    !progress ||
    !progressText ||
    !changeSummary ||
    !backButton ||
    !submitButton ||
    !completionPanel ||
    !restartConfirmation ||
    !restartConfirmationTitle ||
    !confirmRestartButton ||
    !cancelRestartButton
  ) {
    return;
  }

  const updateProgress = () => {
    const state = getState();
    const current = getQuestionProgress(state.answers, state.currentQuestionId);
    const label = `Question ${current.questionNumber} of ${current.totalQuestions} based on your answers`;
    progress.value = current.questionNumber;
    progress.max = current.totalQuestions;
    progress.setAttribute("value", String(current.questionNumber));
    progress.setAttribute("max", String(current.totalQuestions));
    progress.textContent = `${current.questionNumber} of ${current.totalQuestions}`;
    progressText.textContent = label;
    backButton.hidden = current.currentIndex <= 0;
    submitButton.textContent =
      current.currentIndex === current.totalQuestions - 1 ? "See recommendations" : "Continue";
    return current;
  };

  const currentElements = () => ({
    section: questionContainer.querySelector(".questionnaire-step"),
    error: questionContainer.querySelector(".questionnaire-error"),
    controls: [...questionContainer.querySelectorAll("input[data-question-id]")],
  });

  const clearError = () => {
    const { error, controls } = currentElements();
    if (error) {
      error.textContent = "";
      error.hidden = true;
    }
    controls.forEach((control) => control.removeAttribute("aria-invalid"));
  };

  const announceError = (message, { focusInvalid = false } = {}) => {
    const { error, controls } = currentElements();
    if (!error) return;
    controls.forEach((control) => control.setAttribute("aria-invalid", "true"));
    setLiveText(error, message);
    if (focusInvalid) controls[0]?.focus();
  };

  const renderCurrentQuestion = ({ moveFocus = true } = {}) => {
    renderQuestionContent(questionContainer, getState(), { moveFocus });
    updateProgress();
  };

  const syncCurrentControls = () => {
    const state = getState();
    const definition = getQuestionDefinition(state.currentQuestionId);
    const value = getAnswerValue(state.answers, definition.answerPath);
    currentElements().controls.forEach((control) => {
      control.checked =
        definition.type === "checkbox"
          ? Array.isArray(value) && value.includes(control.value)
          : value === control.value;
    });
  };

  const announceAdaptiveChange = (clearedQuestionIds, beforeTotal, afterTotal) => {
    const messages = [];
    if (clearedQuestionIds.length > 0) {
      const prompts = clearedQuestionIds.map(
        (questionId) => getQuestionDefinition(questionId).prompt,
      );
      messages.push(
        `${clearedQuestionIds.length === 1 ? "One answer was" : `${clearedQuestionIds.length} answers were`} cleared because ${clearedQuestionIds.length === 1 ? "it is" : "they are"} no longer relevant: ${prompts.join("; ")}`,
      );
    }
    if (beforeTotal !== afterTotal) {
      messages.push(
        `The questionnaire now has ${afterTotal} questions based on your answers, previously ${beforeTotal}.`,
      );
    }
    if (messages.length > 0) setLiveText(changeSummary, messages.join(" "));
  };

  form.addEventListener("change", (event) => {
    const control = event.target.closest("input[data-question-id]");
    if (!control) return;

    const before = getState();
    const definition = getQuestionDefinition(control.dataset.questionId);
    const beforeProgress = getQuestionProgress(before.answers, before.currentQuestionId);
    const currentValue = getAnswerValue(before.answers, definition.answerPath);
    const nextValue =
      definition.type === "checkbox"
        ? getNextCheckboxValue(definition, currentValue, control.value, control.checked)
        : control.value;

    if (
      definition.maximumSelections &&
      Array.isArray(nextValue) &&
      nextValue.length > definition.maximumSelections
    ) {
      control.checked = false;
      announceError(`Choose no more than ${definition.maximumSelections} answers.`, {
        focusInvalid: true,
      });
      return;
    }

    const requested = requestAnswerChange(definition.id, nextValue);
    const clearedQuestionIds = requested.pendingChange?.clearedQuestionIds ?? [];
    if (requested.pendingChange) confirmPendingAnswerChange();

    syncCurrentControls();
    const validation = validateQuestionValue(
      definition,
      getAnswerValue(getState().answers, definition.answerPath),
    );
    if (validation.valid) clearError();

    const afterProgress = updateProgress();
    announceAdaptiveChange(
      clearedQuestionIds,
      beforeProgress.totalQuestions,
      afterProgress.totalQuestions,
    );
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const state = getState();
    const definition = getQuestionDefinition(state.currentQuestionId);
    markQuestionAttempted(definition.id);
    const validation = validateQuestionValue(
      definition,
      getAnswerValue(state.answers, definition.answerPath),
    );
    if (!validation.valid) {
      announceError(validation.message, { focusInvalid: true });
      return;
    }
    clearError();

    const current = getQuestionProgress(state.answers, state.currentQuestionId);
    if (current.currentIndex === current.totalQuestions - 1) {
      try {
        completeQuestionnaire();
      } catch {
        announceError(
          "Some required answers are incomplete. Use Back to review the questionnaire.",
          { focusInvalid: true },
        );
        return;
      }
      form.hidden = true;
      completionPanel.hidden = false;
      const completionHandled = onComplete?.(getState().answers) === true;
      if (!completionHandled) {
        completionPanel.querySelector(".questionnaire-step-heading")?.focus();
      }
      return;
    }

    setCurrentQuestion(current.visibleQuestionIds[current.currentIndex + 1]);
    renderCurrentQuestion();
  });

  backButton.addEventListener("click", () => {
    const state = getState();
    const current = getQuestionProgress(state.answers, state.currentQuestionId);
    if (current.currentIndex <= 0) return;
    setCurrentQuestion(current.visibleQuestionIds[current.currentIndex - 1]);
    renderCurrentQuestion();
  });

  const hideRestartConfirmation = ({ restoreFocus = false } = {}) => {
    restartConfirmation.hidden = true;
    restartButtons.forEach((button) => button.setAttribute("aria-expanded", "false"));
    if (restoreFocus && restartReturnTarget) restartReturnTarget.focus();
  };

  restartButtons.forEach((button) => {
    button.addEventListener("click", () => {
      restartReturnTarget = button;
      restartConfirmation.hidden = false;
      restartButtons.forEach((restartButton) => restartButton.setAttribute("aria-expanded", "true"));
      restartConfirmationTitle.focus();
    });
  });

  cancelRestartButton.addEventListener("click", () => {
    hideRestartConfirmation({ restoreFocus: true });
  });

  restartConfirmation.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideRestartConfirmation({ restoreFocus: true });
  });

  confirmRestartButton.addEventListener("click", () => {
    resetQuestionnaire();
    onRestart?.();
    hideRestartConfirmation();
    completionPanel.hidden = true;
    form.hidden = false;
    changeSummary.hidden = true;
    changeSummary.textContent = "";
    renderCurrentQuestion();
  });

  renderCurrentQuestion({ moveFocus: false });
}
