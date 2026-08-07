import { productCatalogue } from "./products.js";
import { initialiseQuestionnaire } from "./questionnaire.js";
import { recommendMacBooks } from "./recommendation-engine.js";
import { clearRecommendationResults, renderRecommendationResults } from "./results.js";
import { initialiseNavigation } from "./ui.js";

document.documentElement.classList.add("js");

initialiseNavigation();
let questionnaireController = null;

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
  onComplete(answers, { isEdit = false } = {}) {
    return renderResults(answers, { isEdit });
  },
  onRestart: clearRecommendationResults,
});
