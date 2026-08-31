import { productCatalogue } from "./products.js";
import { initialiseQuestionnaire } from "./questionnaire.js";
import {
  clearQuestionnaireState,
  loadQuestionnaireState,
  saveQuestionnaireState,
} from "./questionnaire-persistence.js";
import { createQuestionnaireState } from "./questionnaire-serialization.js";
import { getState } from "./questionnaire-state.js";
import { resolveQuestionnaireStartup } from "./questionnaire-startup.js";
import {
  createQuestionnaireShareUrl,
  parseQuestionnaireShareUrl,
  removeQuestionnaireShareStateFromUrl,
} from "./questionnaire-url.js";
import { recommendMacBooks } from "./recommendation-engine.js";
import { initialiseResultsShare } from "./results-share.js";
import { clearRecommendationResults, renderRecommendationResults } from "./results.js";
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
  const rendered = renderRecommendationResults(output, productCatalogue, {
    isRefresh: isEdit,
    isShared,
    onEditAnswer(questionId, returnTarget) {
      resultsShareController.hide();
      questionnaireController?.editQuestion(questionId, { returnTarget });
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
