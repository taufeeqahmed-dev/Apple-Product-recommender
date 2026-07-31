import { productCatalogue } from "./products.js";
import { initialiseQuestionnaire } from "./questionnaire.js";
import { recommendMacBooks } from "./recommendation-engine.js";
import { clearRecommendationResults, renderRecommendationResults } from "./results.js";
import { initialiseNavigation } from "./ui.js";

document.documentElement.classList.add("js");

initialiseNavigation();
initialiseQuestionnaire({
  onComplete(answers) {
    const output = recommendMacBooks({ catalogue: productCatalogue, answers });
    return renderRecommendationResults(output, productCatalogue);
  },
  onRestart: clearRecommendationResults,
});
