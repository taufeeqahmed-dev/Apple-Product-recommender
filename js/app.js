import { productCatalogue } from "./products.js";
import { initialiseQuestionnaire } from "./questionnaire.js";
import {
  clearQuestionnaireState,
  loadQuestionnaireState,
  saveQuestionnaireState,
} from "./questionnaire-persistence.js";
import { createQuestionnaireState } from "./questionnaire-serialization.js";
import { getState } from "./questionnaire-state.js";
import { getVisibleQuestionIds } from "./questionnaire-profile.js";
import { resolveQuestionnaireStartup } from "./questionnaire-startup.js";
import {
  createQuestionnaireShareUrl,
  parseQuestionnaireShareUrl,
  removeQuestionnaireShareStateFromUrl,
} from "./questionnaire-url.js";
import { recommendMacBooks } from "./recommendation-engine.js";
import { buildRecommendationInsights } from "./recommendation-insights.js";
import { buildRecommendationInsightPresentation } from "./recommendation-insight-presentation.js";
import { buildRecommendationRecovery } from "./recommendation-recovery.js";
import { initialiseResultsShare } from "./results-share.js";
import { clearRecommendationResults, renderRecommendationResults, restoreResultsEditFocus,
  setResultsEditing } from "./results.js";
import { initialiseNavigation } from "./ui.js";

document.documentElement.classList.add("js");

initialiseNavigation();
let questionnaireController = null;
let sharedUrlSessionActive = false;
const questionnaireStartup = resolveQuestionnaireStartup({ url: window.location.href });

const getCanonicalQuestionnaireState = () => {
  const state = getState();
  return createQuestionnaireState({
    status: state.status,
    currentQuestionId: state.currentQuestionId,
    answers: state.answers,
  });
};

const resultsShareController = initialiseResultsShare({
  getQuestionnaireState: getCanonicalQuestionnaireState,
});

const replaceCurrentUrl = (url) => {
  try {
    if (url !== window.location.href) {
      window.history.replaceState(window.history.state, "", url);
    }
    return true;
  } catch {
    return false;
  }
};

const leaveSharedUrlSession = () => {
  sharedUrlSessionActive = false;
  try {
    replaceCurrentUrl(removeQuestionnaireShareStateFromUrl(window.location.href));
  } catch {
    // URL cleanup must not interrupt the questionnaire.
  }
};

if (questionnaireStartup.mode === "shared") {
  replaceCurrentUrl(questionnaireStartup.shared.canonicalUrl);
} else if (questionnaireStartup.mode === "invalid-shared") {
  leaveSharedUrlSession();
}

const saveStableQuestionnaireState = (state) => {
  try {
    const canonicalState = createQuestionnaireState({
      status: state.status,
      currentQuestionId: state.currentQuestionId,
      answers: state.answers,
    });
    const saved = saveQuestionnaireState(canonicalState);
    if (sharedUrlSessionActive) {
      const currentShare = parseQuestionnaireShareUrl(window.location.href);
      if (currentShare.valid) {
        replaceCurrentUrl(createQuestionnaireShareUrl(canonicalState, window.location.href));
      } else {
        sharedUrlSessionActive = false;
      }
    }
    return saved;
  } catch {
    return Object.freeze({ status: "invalid", saved: false });
  }
};

const renderResults = (answers, { isEdit = false, isShared = false } = {}) => {
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });
  let decisionBrief = null;
  let recovery = null;
  if (output.status === "ok") {
    try {
      const insights = buildRecommendationInsights({ output, catalogue: productCatalogue });
      decisionBrief = buildRecommendationInsightPresentation({ insights, output, catalogue: productCatalogue });
    } catch {
      // An explanation failure retains the existing recommendation presentation.
      // Calculation and DOM rendering deliberately remain outside this boundary.
    }
  }
  if (["budget-limited", "no-match"].includes(output.status)) {
    try {
      recovery = buildRecommendationRecovery({ output });
    } catch {
      // Optional recovery must not replace an existing terminal result or its answer review.
    }
  }
  const rendered = renderRecommendationResults(output, productCatalogue, {
    decisionBrief,
    recovery,
    isRefresh: isEdit,
    isShared,
    onEditAnswer(questionId, returnTarget) {
      const state = getState();
      if (!questionnaireController || state.status !== "complete" || state.editing.active ||
          !returnTarget?.isConnected || returnTarget.disabled ||
          !returnTarget.closest("#recommendation-output") ||
          returnTarget.dataset.editQuestionId !== questionId ||
          !getVisibleQuestionIds(state.answers).includes(questionId)) return;
      resultsShareController.hide();
      questionnaireController.editQuestion(questionId, {
        returnTarget: { focus: () => restoreResultsEditFocus(returnTarget) },
      });
      setResultsEditing(true);
    },
  });
  if (rendered) resultsShareController.show();
  return rendered;
};

questionnaireController = initialiseQuestionnaire({
  sharedImport: questionnaireStartup.shared.present ? questionnaireStartup.shared : null,
  storedState: questionnaireStartup.stored?.loaded ? questionnaireStartup.stored.state : null,
  onComplete(answers, { isEdit = false, isShared = false } = {}) {
    return renderResults(answers, { isEdit, isShared });
  },
  onEditCancelled() {
    setResultsEditing(false);
    resultsShareController.show();
  },
  onRestart() {
    leaveSharedUrlSession();
    resultsShareController.clear();
    clearRecommendationResults();
  },
  onStableStateChange: saveStableQuestionnaireState,
  onClearSavedState: clearQuestionnaireState,
  onLoadSavedState: loadQuestionnaireState,
  onSharedStateAdopted(state) {
    sharedUrlSessionActive = true;
    return saveStableQuestionnaireState(state);
  },
  onSharedImportDismissed: leaveSharedUrlSession,
});
