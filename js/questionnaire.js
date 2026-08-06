import {
  completeQuestionnaire,
  getState,
  markStepAttempted,
  resetQuestionnaire,
  setAnswer,
  setCurrentStep,
} from "./questionnaire-state-v1-compat.js";

const MAXIMUM_PRIMARY_USES = 2;
const PRIMARY_USE_LIMIT_MESSAGE = "Choose no more than two primary uses.";

const STEP_CONFIG = [
  {
    answerId: "maximumBudget",
    errorId: "maximum-budget-error",
    missingMessage: "Choose your maximum budget before continuing.",
  },
  {
    answerId: "primaryUses",
    errorId: "primary-uses-error",
    missingMessage: "Choose at least one primary use before continuing.",
  },
  {
    answerId: "screenSize",
    errorId: "screen-size-error",
    missingMessage: "Choose your preferred screen size before continuing.",
  },
  {
    answerId: "portabilityPerformance",
    errorId: "portability-performance-error",
    missingMessage: "Choose how you balance portability and performance before continuing.",
  },
  {
    answerId: "workloadIntensity",
    errorId: "workload-intensity-error",
    missingMessage: "Choose your expected workload intensity before continuing.",
  },
  {
    answerId: "minimumStorage",
    errorId: "minimum-storage-error",
    missingMessage: "Choose your minimum storage requirement before continuing.",
  },
  {
    answerId: "externalDisplays",
    errorId: "external-displays-error",
    missingMessage: "Choose your external-display requirement before continuing.",
  },
  {
    answerId: "ownershipPeriod",
    errorId: "ownership-period-error",
    missingMessage: "Choose your expected ownership period before continuing.",
  },
];

function answerIsValid(answerId, value) {
  if (answerId === "primaryUses") {
    return value.length >= 1 && value.length <= MAXIMUM_PRIMARY_USES;
  }

  return value !== "";
}

export function initialiseQuestionnaire({ onComplete = null, onRestart = null } = {}) {
  const form = document.querySelector("#questionnaire-form");
  if (!form) return;

  const steps = [...form.querySelectorAll(".questionnaire-step")];
  const progress = document.querySelector("#questionnaire-progress");
  const progressText = document.querySelector("#questionnaire-progress-text");
  const backButton = form.querySelector("#questionnaire-back");
  const submitButton = form.querySelector("#questionnaire-continue");
  const completionPanel = document.querySelector("#questionnaire-complete");
  const restartConfirmation = document.querySelector("#restart-confirmation");
  const restartConfirmationTitle = document.querySelector("#restart-confirmation-title");
  const confirmRestartButton = document.querySelector("#confirm-restart");
  const cancelRestartButton = document.querySelector("#cancel-restart");
  const restartButtons = [...document.querySelectorAll("[data-restart-questionnaire]")];
  let restartReturnTarget = null;

  if (
    steps.length !== STEP_CONFIG.length ||
    !progress ||
    !progressText ||
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

  const getErrorElement = (stepIndex) =>
    document.querySelector(`#${STEP_CONFIG[stepIndex].errorId}`);

  const clearError = (stepIndex) => {
    const error = getErrorElement(stepIndex);
    if (!error) return;
    error.textContent = "";
    error.hidden = true;
    steps[stepIndex]
      .querySelectorAll("input, select")
      .forEach((control) => control.removeAttribute("aria-invalid"));
  };

  const announceError = (stepIndex, message) => {
    const error = getErrorElement(stepIndex);
    if (!error) return;
    error.textContent = "";
    error.hidden = false;
    steps[stepIndex]
      .querySelectorAll("input, select")
      .forEach((control) => control.setAttribute("aria-invalid", "true"));
    window.requestAnimationFrame(() => {
      error.textContent = message;
    });
  };

  const focusFirstControl = (stepIndex) => {
    const firstControl = steps[stepIndex].querySelector("input, select");
    if (firstControl) firstControl.focus();
  };

  const validateStep = (stepIndex, { focusInvalid = false } = {}) => {
    const { answerId, missingMessage } = STEP_CONFIG[stepIndex];
    const answer = getState().answers[answerId];

    if (!answerIsValid(answerId, answer)) {
      const message =
        answerId === "primaryUses" && answer.length > MAXIMUM_PRIMARY_USES
          ? PRIMARY_USE_LIMIT_MESSAGE
          : missingMessage;
      announceError(stepIndex, message);
      if (focusInvalid) focusFirstControl(stepIndex);
      return false;
    }

    clearError(stepIndex);
    return true;
  };

  const syncControlsFromState = () => {
    const { answers } = getState();

    form.querySelectorAll("input[type='radio']").forEach((control) => {
      control.checked = answers[control.dataset.answerId] === control.value;
    });

    form.querySelectorAll("input[type='checkbox']").forEach((control) => {
      control.checked = answers.primaryUses.includes(control.value);
    });

    form.querySelectorAll("select[data-answer-id]").forEach((control) => {
      control.value = answers[control.dataset.answerId];
    });
  };

  const showStep = (stepIndex, { moveFocus = true } = {}) => {
    setCurrentStep(stepIndex);

    steps.forEach((step, index) => {
      step.hidden = index !== stepIndex;
    });

    const visibleStepNumber = stepIndex + 1;
    progress.value = visibleStepNumber;
    progress.setAttribute("value", String(visibleStepNumber));
    progress.textContent = `${visibleStepNumber} of ${steps.length}`;
    progressText.textContent = `Step ${visibleStepNumber} of ${steps.length}`;
    backButton.hidden = stepIndex === 0;
    submitButton.textContent = stepIndex === steps.length - 1 ? "Complete questionnaire" : "Continue";

    if (moveFocus) {
      steps[stepIndex].querySelector(".questionnaire-step-heading")?.focus();
    }
  };

  const hideRestartConfirmation = ({ restoreFocus = false } = {}) => {
    restartConfirmation.hidden = true;
    restartButtons.forEach((button) => button.setAttribute("aria-expanded", "false"));
    if (restoreFocus && restartReturnTarget) restartReturnTarget.focus();
  };

  form.addEventListener("change", (event) => {
    const control = event.target.closest("[data-answer-id]");
    if (!control) return;

    const answerId = control.dataset.answerId;
    const stepIndex = Number(control.closest(".questionnaire-step").dataset.stepIndex);

    if (control.type === "checkbox") {
      const selectedValues = [
        ...form.querySelectorAll("input[data-answer-id='primaryUses']:checked"),
      ].map((checkbox) => checkbox.value);

      if (selectedValues.length > MAXIMUM_PRIMARY_USES) {
        control.checked = false;
        const allowedValues = selectedValues.filter((value) => value !== control.value);
        setAnswer(answerId, allowedValues);
        announceError(stepIndex, PRIMARY_USE_LIMIT_MESSAGE);
        return;
      }

      setAnswer(answerId, selectedValues);
    } else {
      setAnswer(answerId, control.value);
    }

    if (answerIsValid(answerId, getState().answers[answerId])) clearError(stepIndex);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const { currentStep } = getState();
    markStepAttempted(currentStep);

    if (!validateStep(currentStep, { focusInvalid: true })) return;

    if (currentStep === steps.length - 1) {
      completeQuestionnaire();
      form.hidden = true;
      completionPanel.hidden = false;
      const completionHandled = onComplete?.(getState().answers) === true;
      if (!completionHandled) {
        completionPanel.querySelector(".questionnaire-step-heading")?.focus();
      }
      return;
    }

    showStep(currentStep + 1);
  });

  backButton.addEventListener("click", () => {
    const { currentStep } = getState();
    if (currentStep > 0) showStep(currentStep - 1);
  });

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
    if (event.key === "Escape") {
      hideRestartConfirmation({ restoreFocus: true });
    }
  });

  confirmRestartButton.addEventListener("click", () => {
    resetQuestionnaire();
    onRestart?.();
    syncControlsFromState();
    STEP_CONFIG.forEach((_, stepIndex) => clearError(stepIndex));
    hideRestartConfirmation();
    completionPanel.hidden = true;
    form.hidden = false;
    showStep(0);
  });

  syncControlsFromState();
  showStep(getState().currentStep, { moveFocus: false });
}
