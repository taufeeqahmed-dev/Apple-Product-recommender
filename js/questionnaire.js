import {
  getQuestionControl,
  getQuestionDefinition,
} from "./questionnaire-definition.js";
import {
  getAnswerValue,
  getAvailableControlOptions,
  getVisibleControls,
  getVisibleQuestionIds,
} from "./questionnaire-profile.js";
import {
  beginEditing,
  cancelEditing,
  completeQuestionnaire,
  confirmPendingAnswerChange,
  finishEditing,
  getState,
  markQuestionAttempted,
  requestAnswerChange,
  resetQuestionnaire,
  setCurrentQuestion,
} from "./questionnaire-state.js";

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

export function validateQuestionValue(control, value) {
  if (!control.required && !isAnswered(value)) return { valid: true, message: "" };
  if (control.type === "checkbox") {
    const count = Array.isArray(value) ? value.length : 0;
    if (control.minimumSelections && count < control.minimumSelections) {
      return {
        valid: false,
        message:
          control.id === "primaryUses"
            ? "Choose one or two primary uses before continuing."
            : "Choose at least one answer before continuing.",
      };
    }
    if (control.maximumSelections && count > control.maximumSelections) {
      return { valid: false, message: `Choose up to ${control.maximumSelections} answers.` };
    }
    return { valid: true, message: "" };
  }
  return isAnswered(value)
    ? { valid: true, message: "" }
    : { valid: false, message: "Choose an answer before continuing." };
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

export function getProgressStageLabel(questionNumber, totalQuestions) {
  if (questionNumber <= 2) return "Getting to know your needs";
  if (totalQuestions - questionNumber <= 2) return "Almost ready";
  return "A few details left";
}

function validateStep(question, answers) {
  return getVisibleControls(question, answers).map((control) => ({
    control,
    ...validateQuestionValue(control, getAnswerValue(answers, control.answerPath)),
  }));
}

export function getUnansweredRequiredQuestionIds(answers) {
  return getVisibleQuestionIds(answers).filter((questionId) => {
    const question = getQuestionDefinition(questionId);
    return validateStep(question, answers).some(({ valid }) => !valid);
  });
}

function normaliseClearedAnswers(clearedAnswers) {
  return clearedAnswers.map((item) => {
    if (typeof item !== "string") return item;
    const control = getQuestionControl(item);
    return { controlId: item, prompt: control?.prompt ?? item, labels: [] };
  });
}

export function getAdaptiveChangeMessage(clearedAnswersInput) {
  const messages = [];
  const clearedAnswers = normaliseClearedAnswers(clearedAnswersInput);
  if (clearedAnswers.length > 0) {
    const details = clearedAnswers.map(({ prompt, labels }) =>
      labels?.length ? `${prompt}: ${labels.join(", ")}` : prompt,
    );
    messages.push(
      `${clearedAnswers.length === 1 ? "One answer was" : `${clearedAnswers.length} answers were`} cleared because ${clearedAnswers.length === 1 ? "it is" : "they are"} no longer relevant: ${details.join("; ")}.`,
    );
  }
  return messages.join(" ");
}

export function getNextCheckboxValue(control, currentValue, optionId, checked) {
  const selected = new Set(Array.isArray(currentValue) ? currentValue : []);
  const exclusiveIds = new Set(control.options.filter(({ exclusive }) => exclusive).map(({ id }) => id));
  if (!checked) {
    selected.delete(optionId);
    return [...selected];
  }
  if (exclusiveIds.has(optionId)) return [optionId];
  exclusiveIds.forEach((exclusiveId) => selected.delete(exclusiveId));
  selected.add(optionId);
  return [...selected];
}

function controlId(controlIdValue, optionId) {
  return `question-${controlIdValue}-option-${optionId}`;
}

function renderOptions(control, options, value) {
  const grid = createElement(
    "div",
    options.length > 4 ? "option-grid" : "option-grid option-grid-single",
  );
  options.forEach((option) => {
    const label = createElement("label", "option-card");
    const input = document.createElement("input");
    input.id = controlId(control.id, option.id);
    input.type = control.type;
    input.name = `question-${control.id}`;
    input.value = option.id;
    input.dataset.controlId = control.id;
    input.checked =
      control.type === "checkbox"
        ? Array.isArray(value) && value.includes(option.id)
        : value === option.id;
    if (control.required && control.type === "radio") input.required = true;
    label.append(input, createElement("span", "", option.label));
    grid.append(label);
  });
  return grid;
}

function renderControl(control, answers) {
  const value = getAnswerValue(answers, control.answerPath);
  const fieldset = document.createElement("fieldset");
  fieldset.dataset.controlId = control.id;
  const legend = createElement("legend", "", control.prompt);
  const helpId = `question-help-${control.id}`;
  const errorId = `question-error-${control.id}`;
  const describedBy = [];
  fieldset.append(legend);
  if (control.help || !control.required) {
    const help = createElement(
      "p",
      "questionnaire-help",
      [!control.required ? "Optional." : "", control.help ?? ""].filter(Boolean).join(" "),
    );
    help.id = helpId;
    fieldset.append(help);
    describedBy.push(helpId);
  }
  describedBy.push(errorId);
  fieldset.setAttribute("aria-describedby", describedBy.join(" "));

  const options = getAvailableControlOptions(control, answers);
  const grouped = new Map();
  options.forEach((option) => {
    const group = option.group ?? "";
    const values = grouped.get(group) ?? [];
    values.push(option);
    grouped.set(group, values);
  });
  if (grouped.size > 1 || (grouped.size === 1 && !grouped.has(""))) {
    grouped.forEach((groupOptions, groupName) => {
      const group = createElement("div", "option-subgroup");
      if (groupName) {
        const heading = createElement("h4", "option-subgroup-title", groupName);
        heading.id = `question-${control.id}-group-${groupName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        group.setAttribute("role", "group");
        group.setAttribute("aria-labelledby", heading.id);
        group.append(heading);
      }
      group.append(renderOptions(control, groupOptions, value));
      fieldset.append(group);
    });
  } else {
    fieldset.append(renderOptions(control, options, value));
  }

  const error = createElement("p", "questionnaire-error");
  error.id = errorId;
  error.dataset.controlError = control.id;
  error.role = "alert";
  error.hidden = true;
  fieldset.append(error);
  return fieldset;
}

function renderQuestionContent(container, state, { moveFocus = true, restoreControl = null } = {}) {
  const question = getQuestionDefinition(state.currentQuestionId);
  const section = createElement("section", "questionnaire-step");
  section.dataset.questionId = question.id;
  const heading = createElement("h3", "questionnaire-step-heading", question.prompt);
  heading.id = `question-heading-${question.id}`;
  heading.tabIndex = -1;
  heading.setAttribute(
    "aria-describedby",
    "questionnaire-progress-text questionnaire-progress-detail",
  );
  section.append(heading);
  getVisibleControls(question, state.answers).forEach((control) =>
    section.append(renderControl(control, state.answers)),
  );
  container.replaceChildren(section);
  if (restoreControl) {
    container.querySelector(`[data-control-id="${restoreControl}"]:checked`)?.focus();
  } else if (moveFocus) {
    heading.focus();
  }
}

function setLiveText(element, message) {
  element.textContent = "";
  element.hidden = false;
  window.requestAnimationFrame(() => {
    element.textContent = message;
  });
}

export function initialiseQuestionnaire({
  onComplete = null,
  onRestart = null,
  onEditCancelled = null,
} = {}) {
  const form = document.querySelector("#questionnaire-form");
  const questionContainer = document.querySelector("#questionnaire-question");
  const progress = document.querySelector("#questionnaire-progress");
  const progressText = document.querySelector("#questionnaire-progress-text");
  const progressDetail = document.querySelector("#questionnaire-progress-detail");
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
  let editingReturnTarget = null;

  if (
    !form || !questionContainer || !progress || !progressText || !progressDetail || !changeSummary ||
    !backButton || !submitButton || !completionPanel ||
    !restartConfirmation || !restartConfirmationTitle || !confirmRestartButton ||
    !cancelRestartButton
  ) return;

  const updateProgress = () => {
    const state = getState();
    const current = getQuestionProgress(state.answers, state.currentQuestionId);
    progress.value = current.questionNumber;
    progress.max = current.totalQuestions;
    progress.textContent = `${current.questionNumber} of ${current.totalQuestions}`;
    const stepDetail = `Step ${current.questionNumber} of ${current.totalQuestions}`;
    progressText.textContent = getProgressStageLabel(
      current.questionNumber,
      current.totalQuestions,
    );
    progressDetail.textContent = stepDetail;
    progress.setAttribute("aria-valuetext", stepDetail);
    if (state.editing.active) {
      backButton.hidden = false;
      backButton.textContent = "Cancel edit";
      submitButton.textContent = "Save changes";
    } else {
      backButton.hidden = current.currentIndex <= 0;
      backButton.textContent = "Back";
      submitButton.textContent =
        current.currentIndex === current.totalQuestions - 1 ? "See recommendations" : "Continue";
    }
    return current;
  };

  const renderCurrentQuestion = (options = {}) => {
    renderQuestionContent(questionContainer, getState(), options);
    updateProgress();
  };

  const controlElements = (controlIdValue) => [
    ...questionContainer.querySelectorAll(`input[data-control-id="${controlIdValue}"]`),
  ];

  const clearError = (controlIdValue) => {
    const error = questionContainer.querySelector(`[data-control-error="${controlIdValue}"]`);
    if (error) {
      error.textContent = "";
      error.hidden = true;
    }
    controlElements(controlIdValue).forEach((element) => element.removeAttribute("aria-invalid"));
  };

  const announceError = (controlIdValue, message, { focusInvalid = false } = {}) => {
    const error = questionContainer.querySelector(`[data-control-error="${controlIdValue}"]`);
    const elements = controlElements(controlIdValue);
    elements.forEach((element) => element.setAttribute("aria-invalid", "true"));
    if (error) setLiveText(error, message);
    if (focusInvalid) elements[0]?.focus();
  };

  const syncCurrentControls = () => {
    const state = getState();
    const question = getQuestionDefinition(state.currentQuestionId);
    getVisibleControls(question, state.answers).forEach((control) => {
      const value = getAnswerValue(state.answers, control.answerPath);
      controlElements(control.id).forEach((element) => {
        element.checked =
          control.type === "checkbox"
            ? Array.isArray(value) && value.includes(element.value)
            : value === element.value;
      });
    });
  };

  form.addEventListener("change", (event) => {
    const input = event.target.closest("input[data-control-id]");
    if (!input) return;
    const before = getState();
    const question = getQuestionDefinition(before.currentQuestionId);
    const control = getQuestionControl(input.dataset.controlId);
    const beforeVisibleControls = getVisibleControls(question, before.answers).map(({ id }) => id);
    const currentValue = getAnswerValue(before.answers, control.answerPath);
    const nextValue =
      control.type === "checkbox"
        ? getNextCheckboxValue(control, currentValue, input.value, input.checked)
        : input.value;
    if (control.maximumSelections && nextValue.length > control.maximumSelections) {
      input.checked = false;
      announceError(control.id, `Choose up to ${control.maximumSelections} answers.`);
      return;
    }

    const requested = requestAnswerChange(control.id, nextValue);
    const clearedAnswers = requested.pendingChange?.clearedAnswers ?? [];
    if (requested.pendingChange) confirmPendingAnswerChange();
    const after = getState();
    const afterVisibleControls = getVisibleControls(question, after.answers).map(({ id }) => id);
    if (beforeVisibleControls.join("|") !== afterVisibleControls.join("|")) {
      renderCurrentQuestion({ moveFocus: false, restoreControl: control.id });
    } else {
      syncCurrentControls();
      updateProgress();
    }
    const validation = validateQuestionValue(control, getAnswerValue(after.answers, control.answerPath));
    if (validation.valid) clearError(control.id);
    const message = getAdaptiveChangeMessage(clearedAnswers);
    if (message) setLiveText(changeSummary, message);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const state = getState();
    const question = getQuestionDefinition(state.currentQuestionId);
    markQuestionAttempted(question.id);
    const validations = validateStep(question, state.answers);
    validations.forEach(({ control, valid, message }) => {
      if (valid) clearError(control.id);
      else announceError(control.id, message);
    });
    const firstInvalid = validations.find(({ valid }) => !valid);
    if (firstInvalid) {
      controlElements(firstInvalid.control.id)[0]?.focus();
      return;
    }

    if (state.editing.active) {
      const unansweredRequired = getUnansweredRequiredQuestionIds(getState().answers);
      if (unansweredRequired.length > 0) {
        setCurrentQuestion(unansweredRequired[0]);
        renderCurrentQuestion();
        setLiveText(
          changeSummary,
          "Your edit made another related answer required before recommendations can be refreshed.",
        );
        return;
      }
      try {
        completeQuestionnaire();
        finishEditing();
      } catch {
        announceError(validations[0].control.id, "Some related answers are incomplete.", { focusInvalid: true });
        return;
      }
      form.hidden = true;
      completionPanel.hidden = false;
      const completionHandled = onComplete?.(getState().answers, { isEdit: true }) === true;
      editingReturnTarget = null;
      if (!completionHandled) completionPanel.querySelector(".questionnaire-step-heading")?.focus();
      return;
    }

    const current = getQuestionProgress(state.answers, state.currentQuestionId);
    if (current.currentIndex === current.totalQuestions - 1) {
      try {
        completeQuestionnaire();
      } catch {
        announceError(validations[0].control.id, "Some required answers are incomplete. Use Back to review the questionnaire.", { focusInvalid: true });
        return;
      }
      form.hidden = true;
      completionPanel.hidden = false;
      const completionHandled = onComplete?.(getState().answers, { isEdit: false }) === true;
      if (!completionHandled) completionPanel.querySelector(".questionnaire-step-heading")?.focus();
      return;
    }
    if (question.id === "essentialRequirements" && current.totalQuestions > 7) {
      const detailCount = current.totalQuestions - 7;
      setLiveText(
        changeSummary,
        `${detailCount === 1 ? "One essential-detail question follows" : `${detailCount} essential-detail questions follow`} so Northstar can apply your must-haves.`,
      );
    }
    setCurrentQuestion(current.visibleQuestionIds[current.currentIndex + 1]);
    renderCurrentQuestion();
  });

  backButton.addEventListener("click", () => {
    const state = getState();
    if (state.editing.active) {
      cancelEditing();
      form.hidden = true;
      completionPanel.hidden = false;
      changeSummary.hidden = true;
      changeSummary.textContent = "";
      const returnTarget = editingReturnTarget;
      editingReturnTarget = null;
      onEditCancelled?.();
      returnTarget?.focus();
      return;
    }
    const current = getQuestionProgress(state.answers, state.currentQuestionId);
    if (current.currentIndex <= 0) return;
    setCurrentQuestion(current.visibleQuestionIds[current.currentIndex - 1]);
    renderCurrentQuestion();
  });

  const hideRestartConfirmation = ({ restoreFocus = false } = {}) => {
    if (restartConfirmation.open) restartConfirmation.close();
    restartButtons.forEach((button) => button.setAttribute("aria-expanded", "false"));
    if (restoreFocus && restartReturnTarget) restartReturnTarget.focus();
  };
  restartButtons.forEach((button) => {
    button.addEventListener("click", () => {
      restartReturnTarget = button;
      restartConfirmation.showModal();
      restartButtons.forEach((restartButton) => restartButton.setAttribute("aria-expanded", "true"));
      restartConfirmationTitle.focus();
    });
  });
  cancelRestartButton.addEventListener("click", () => hideRestartConfirmation({ restoreFocus: true }));
  restartConfirmation.addEventListener("cancel", (event) => {
    event.preventDefault();
    hideRestartConfirmation({ restoreFocus: true });
  });
  confirmRestartButton.addEventListener("click", () => {
    resetQuestionnaire();
    editingReturnTarget = null;
    onRestart?.();
    hideRestartConfirmation();
    completionPanel.hidden = true;
    form.hidden = false;
    changeSummary.hidden = true;
    changeSummary.textContent = "";
    renderCurrentQuestion();
  });

  renderCurrentQuestion({ moveFocus: false });
  return {
    editQuestion(questionId, { returnTarget = null } = {}) {
      beginEditing(questionId);
      editingReturnTarget = returnTarget;
      completionPanel.hidden = true;
      form.hidden = false;
      changeSummary.hidden = true;
      changeSummary.textContent = "";
      renderCurrentQuestion();
    },
  };
}
