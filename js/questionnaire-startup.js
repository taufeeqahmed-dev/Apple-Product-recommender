import { loadQuestionnaireState } from "./questionnaire-persistence.js";
import { parseQuestionnaireShareUrl } from "./questionnaire-url.js";

function result(mode, shared, stored) {
  return Object.freeze({ mode, shared, stored });
}

export function resolveQuestionnaireStartup({ url, storage } = {}) {
  const shared = parseQuestionnaireShareUrl(url);

  if (shared.present) {
    return result(shared.valid ? "shared" : "invalid-shared", shared, null);
  }

  const stored = loadQuestionnaireState({ storage });
  return result(stored.loaded ? "local-resume" : "fresh", shared, stored);
}
