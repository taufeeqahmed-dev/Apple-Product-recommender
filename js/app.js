import { productCatalogue } from "./products.js";
import { initialiseQuestionnaire } from "./questionnaire.js";
import {
  clearQuestionnaireState,
  loadQuestionnaireState,
  saveQuestionnaireState,
} from "./questionnaire-persistence.js";
import { createQuestionnaireState } from "./questionnaire-serialization.js";
import { recommendMacBooks } from "./recommendation-engine.js";
import { clearRecommendationResults, renderRecommendationResults } from "./results.js";
import { initialiseNavigation } from "./ui.js";

document.documentElement.classList.add("js");

initialiseNavigation();
let questionnaireController = null;
const storedQuestionnaire = loadQuestionnaireState();

const saveStableQuestionnaireState = (state) => {
  try {
    const canonicalState = createQuestionnaireState({
      status: state.status,
      currentQuestionId: state.currentQuestionId,
      answers: state.answers,
    });
    return saveQuestionnaireState(canonicalState);
  } catch {
    return Object.freeze({ status: "invalid", saved: false });
  }
};

const renderResults = (answers, { isEdit = false } = {}) => {
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });
  return renderRecommendationResults(output, productCatalogue, {
    isRefresh: isEdit,
    onEditAnswer(questionId, returnTarget) {
      questionnaireController?.editQuestion(questionId, { returnTarget });
    },
  });
};

questionnaireController = initialiseQuestionnaire({
  storedState: storedQuestionnaire.loaded ? storedQuestionnaire.state : null,
  onComplete(answers, { isEdit = false } = {}) {
    return renderResults(answers, { isEdit });
  },
  onRestart: clearRecommendationResults,
  onStableStateChange: saveStableQuestionnaireState,
  onClearSavedState: clearQuestionnaireState,
});
