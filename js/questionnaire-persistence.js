import {
  createQuestionnaireState,
  parseQuestionnaireState,
  serializeQuestionnaireState,
} from "./questionnaire-serialization.js";
import { QUESTION_ORDER } from "./questionnaire-definition.js";
import { createInitialAnswers } from "./questionnaire-profile.js";

export const QUESTIONNAIRE_STORAGE_KEY = "northstar.questionnaire-state.v1";

const EMPTY_STATE_SERIALIZED = serializeQuestionnaireState(
  createQuestionnaireState({
    status: "in-progress",
    currentQuestionId: QUESTION_ORDER[0],
    answers: createInitialAnswers(),
  }),
);

function result(status, details = {}) {
  return Object.freeze({ status, ...details });
}

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function hasStorageMethod(storage, methodName) {
  try {
    return typeof storage?.[methodName] === "function";
  } catch {
    return false;
  }
}

function clearResolvedStorage(storage) {
  if (!hasStorageMethod(storage, "removeItem")) {
    return result("unavailable", { cleared: false });
  }
  try {
    storage.removeItem(QUESTIONNAIRE_STORAGE_KEY);
    return result("cleared", { cleared: true });
  } catch {
    if (hasStorageMethod(storage, "setItem")) {
      try {
        storage.setItem(QUESTIONNAIRE_STORAGE_KEY, EMPTY_STATE_SERIALIZED);
        return result("cleared-with-empty-state", { cleared: true });
      } catch {
        // The application remains usable even when the browser refuses both operations.
      }
    }
    return result("remove-failed", { cleared: false });
  }
}

export function saveQuestionnaireState(input, { storage } = {}) {
  let serialized;
  try {
    serialized = serializeQuestionnaireState(input);
  } catch {
    return result("invalid", { saved: false });
  }

  const resolvedStorage = resolveStorage(storage);
  if (!hasStorageMethod(resolvedStorage, "setItem")) {
    return result("unavailable", { saved: false });
  }

  if (hasStorageMethod(resolvedStorage, "getItem")) {
    try {
      if (resolvedStorage.getItem(QUESTIONNAIRE_STORAGE_KEY) === serialized) {
        return result("unchanged", { saved: true, serialized });
      }
    } catch {
      // A failed comparison should not prevent a best-effort write.
    }
  }

  try {
    resolvedStorage.setItem(QUESTIONNAIRE_STORAGE_KEY, serialized);
    return result("saved", { saved: true, serialized });
  } catch {
    return result("write-failed", { saved: false });
  }
}

export function loadQuestionnaireState({ storage } = {}) {
  const resolvedStorage = resolveStorage(storage);
  if (!hasStorageMethod(resolvedStorage, "getItem")) {
    return result("unavailable", { loaded: false });
  }

  let serialized;
  try {
    serialized = resolvedStorage.getItem(QUESTIONNAIRE_STORAGE_KEY);
  } catch {
    return result("read-failed", { loaded: false });
  }

  if (serialized === null) return result("empty", { loaded: false });

  const parsed = parseQuestionnaireState(serialized);
  if (!parsed.valid) {
    const clearing = clearResolvedStorage(resolvedStorage);
    return result("invalid", {
      loaded: false,
      cleared: clearing.cleared,
      clearStatus: clearing.status,
    });
  }

  if (
    parsed.state.status === "in-progress" &&
    parsed.state.currentQuestionId === QUESTION_ORDER[0] &&
    Object.keys(parsed.state.answers).length === 0
  ) {
    return result("empty", { loaded: false });
  }

  const canonicalSerialized = serializeQuestionnaireState(parsed.state);
  let canonicalized = canonicalSerialized === serialized;
  if (!canonicalized && hasStorageMethod(resolvedStorage, "setItem")) {
    try {
      resolvedStorage.setItem(QUESTIONNAIRE_STORAGE_KEY, canonicalSerialized);
      canonicalized = true;
    } catch {
      // A valid state can still be resumed when storage has become read-only.
    }
  }

  return result("loaded", {
    loaded: true,
    canonicalized,
    state: parsed.state,
    questionnaireAnswers: parsed.questionnaireAnswers,
  });
}

export function clearQuestionnaireState({ storage } = {}) {
  return clearResolvedStorage(resolveStorage(storage));
}
