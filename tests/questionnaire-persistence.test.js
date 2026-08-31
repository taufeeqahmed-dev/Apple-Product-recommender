import test from "node:test";
import assert from "node:assert/strict";

import {
  QUESTIONNAIRE_STORAGE_KEY,
  clearQuestionnaireState,
  loadQuestionnaireState,
  saveQuestionnaireState,
} from "../js/questionnaire-persistence.js";
import {
  createQuestionnaireState,
  parseQuestionnaireState,
} from "../js/questionnaire-serialization.js";
import { createInitialAnswers } from "../js/questionnaire-profile.js";
import { productCatalogue } from "../js/products.js";
import { recommendMacBooks } from "../js/recommendation-engine.js";
import {
  restoreQuestionnaireState,
  getState,
  resetQuestionnaire,
} from "../js/questionnaire-state.js";
import {
  demandingCodingAnswers,
  everydayPortableAnswers,
} from "./fixtures/questionnaire-scenarios.js";

function createMemoryStorage({ failRead = false, failWrite = false, failRemove = false } = {}) {
  const values = new Map();
  const calls = { get: 0, set: 0, remove: 0 };
  return {
    calls,
    values,
    getItem(key) {
      calls.get += 1;
      if (failRead) throw new Error("read refused");
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      calls.set += 1;
      if (failWrite) throw new Error("write refused");
      values.set(key, String(value));
    },
    removeItem(key) {
      calls.remove += 1;
      if (failRemove) throw new Error("remove refused");
      values.delete(key);
    },
  };
}

function partialState() {
  const answers = createInitialAnswers();
  answers.budget.target = "no-fixed-target";
  return createQuestionnaireState({
    status: "in-progress",
    currentQuestionId: "primaryUses",
    answers,
  });
}

function completeState(answers = everydayPortableAnswers, currentQuestionId = "essentialRequirements") {
  return createQuestionnaireState({ status: "complete", currentQuestionId, answers });
}

test("the storage key is stable and namespaced", () => {
  assert.equal(QUESTIONNAIRE_STORAGE_KEY, "northstar.questionnaire-state.v1");
});

test("a valid partial state is saved in the Phase 1 canonical format", () => {
  const storage = createMemoryStorage();
  const saved = saveQuestionnaireState(partialState(), { storage });
  assert.equal(saved.status, "saved");
  assert.equal(saved.saved, true);
  assert.equal(storage.values.get(QUESTIONNAIRE_STORAGE_KEY), saved.serialized);
  assert.deepEqual(parseQuestionnaireState(saved.serialized).state, partialState());
});

test("a valid complete state is saved", () => {
  const storage = createMemoryStorage();
  const saved = saveQuestionnaireState(completeState(), { storage });
  assert.equal(saved.status, "saved");
  assert.equal(parseQuestionnaireState(saved.serialized).state.status, "complete");
});

test("invalid state is not persisted", () => {
  const storage = createMemoryStorage();
  const saved = saveQuestionnaireState({ ...partialState(), currentQuestionId: "unknown" }, { storage });
  assert.equal(saved.status, "invalid");
  assert.equal(saved.saved, false);
  assert.equal(storage.calls.set, 0);
});

test("transient editing state is not persisted", () => {
  const storage = createMemoryStorage();
  const saved = saveQuestionnaireState({ ...completeState(), status: "editing" }, { storage });
  assert.equal(saved.status, "invalid");
  assert.equal(storage.calls.set, 0);
});

test("saving the same canonical state avoids an unnecessary write", () => {
  const storage = createMemoryStorage();
  assert.equal(saveQuestionnaireState(partialState(), { storage }).status, "saved");
  assert.equal(saveQuestionnaireState(structuredClone(partialState()), { storage }).status, "unchanged");
  assert.equal(storage.calls.set, 1);
});

test("a saved partial state loads through Phase 1 validation", () => {
  const storage = createMemoryStorage();
  saveQuestionnaireState(partialState(), { storage });
  const loaded = loadQuestionnaireState({ storage });
  assert.equal(loaded.status, "loaded");
  assert.deepEqual(loaded.state, partialState());
  assert.equal(loaded.questionnaireAnswers.budget.target, "no-fixed-target");
});

test("valid non-canonical stored JSON is rewritten canonically", () => {
  const storage = createMemoryStorage();
  const state = partialState();
  const nonCanonical = JSON.stringify({
    answers: state.answers,
    currentQuestionId: state.currentQuestionId,
    status: state.status,
    questionnaireSchemaVersion: state.questionnaireSchemaVersion,
    stateSchemaVersion: state.stateSchemaVersion,
  });
  storage.values.set(QUESTIONNAIRE_STORAGE_KEY, nonCanonical);
  const loaded = loadQuestionnaireState({ storage });
  assert.equal(loaded.status, "loaded");
  assert.equal(loaded.canonicalized, true);
  assert.equal(storage.values.get(QUESTIONNAIRE_STORAGE_KEY), JSON.stringify(state));
});

test("the most recently saved valid state wins", () => {
  const storage = createMemoryStorage();
  saveQuestionnaireState(partialState(), { storage });
  saveQuestionnaireState(completeState(), { storage });
  const loaded = loadQuestionnaireState({ storage });
  assert.equal(loaded.state.status, "complete");
  assert.deepEqual(loaded.questionnaireAnswers, everydayPortableAnswers);
});

test("a completed state restores answers and recommendations are recalculated", () => {
  const storage = createMemoryStorage();
  saveQuestionnaireState(completeState(), { storage });
  const loaded = loadQuestionnaireState({ storage });
  resetQuestionnaire();
  const restored = restoreQuestionnaireState(loaded.state);
  const recalculated = recommendMacBooks({ catalogue: productCatalogue, answers: restored.answers });
  const direct = recommendMacBooks({ catalogue: productCatalogue, answers: everydayPortableAnswers });
  assert.equal(restored.status, "complete");
  assert.deepEqual(recalculated, direct);
});

test("persisted state excludes recommendation, product and display data", () => {
  const storage = createMemoryStorage();
  const saved = saveQuestionnaireState(completeState(), { storage });
  const stored = JSON.parse(saved.serialized);
  assert.deepEqual(Object.keys(stored), [
    "stateSchemaVersion",
    "questionnaireSchemaVersion",
    "status",
    "currentQuestionId",
    "answers",
  ]);
  assert.equal(saved.serialized.includes("MacBook"), false);
  assert.equal(saved.serialized.includes("recommendation"), false);
  assert.equal(saved.serialized.includes("confidence"), false);
  assert.equal(saved.serialized.includes(productCatalogue.products[0].id), false);
});

test("malformed stored data is ignored and cleared", () => {
  const storage = createMemoryStorage();
  storage.values.set(QUESTIONNAIRE_STORAGE_KEY, "not json");
  const loaded = loadQuestionnaireState({ storage });
  assert.equal(loaded.status, "invalid");
  assert.equal(loaded.loaded, false);
  assert.equal(loaded.cleared, true);
  assert.equal(storage.values.has(QUESTIONNAIRE_STORAGE_KEY), false);
});

test("an unsupported state-schema version is ignored and cleared", () => {
  const storage = createMemoryStorage();
  storage.values.set(
    QUESTIONNAIRE_STORAGE_KEY,
    JSON.stringify({ ...partialState(), stateSchemaVersion: 999 }),
  );
  const loaded = loadQuestionnaireState({ storage });
  assert.equal(loaded.status, "invalid");
  assert.equal(storage.values.has(QUESTIONNAIRE_STORAGE_KEY), false);
});

test("stale adaptive state is ignored and cleared", () => {
  const storage = createMemoryStorage();
  storage.values.set(
    QUESTIONNAIRE_STORAGE_KEY,
    JSON.stringify({
      ...completeState(demandingCodingAnswers, "externalDisplayCount"),
      currentQuestionId: "essentialRequirements",
      answers: {
        ...completeState(demandingCodingAnswers, "externalDisplayCount").answers,
        essentialRequirements: ["none"],
      },
    }),
  );
  const loaded = loadQuestionnaireState({ storage });
  assert.equal(loaded.status, "invalid");
  assert.equal(storage.values.has(QUESTIONNAIRE_STORAGE_KEY), false);
});

test("a storage read failure does not throw or load state", () => {
  const loaded = loadQuestionnaireState({ storage: createMemoryStorage({ failRead: true }) });
  assert.deepEqual(loaded, Object.freeze({ status: "read-failed", loaded: false }));
});

test("a storage write failure does not throw or report a save", () => {
  const saved = saveQuestionnaireState(partialState(), {
    storage: createMemoryStorage({ failWrite: true }),
  });
  assert.equal(saved.status, "write-failed");
  assert.equal(saved.saved, false);
});

test("missing storage does not block save, load or clear operations", () => {
  assert.equal(saveQuestionnaireState(partialState(), { storage: null }).status, "unavailable");
  assert.equal(loadQuestionnaireState({ storage: null }).status, "unavailable");
  assert.equal(clearQuestionnaireState({ storage: null }).status, "unavailable");
});

test("clearing removes stored state", () => {
  const storage = createMemoryStorage();
  saveQuestionnaireState(partialState(), { storage });
  const cleared = clearQuestionnaireState({ storage });
  assert.equal(cleared.status, "cleared");
  assert.equal(cleared.cleared, true);
  assert.equal(loadQuestionnaireState({ storage }).status, "empty");
});

test("a remove failure falls back to a validated empty state", () => {
  const storage = createMemoryStorage({ failRemove: true });
  saveQuestionnaireState(partialState(), { storage });
  const cleared = clearQuestionnaireState({ storage });
  assert.equal(cleared.status, "cleared-with-empty-state");
  assert.equal(cleared.cleared, true);
  assert.equal(loadQuestionnaireState({ storage }).status, "empty");
  assert.equal(parseQuestionnaireState(storage.values.get(QUESTIONNAIRE_STORAGE_KEY)).valid, true);
});

test("a remove and fallback write failure is reported without throwing", () => {
  const storage = createMemoryStorage({ failWrite: true, failRemove: true });
  storage.values.set(QUESTIONNAIRE_STORAGE_KEY, JSON.stringify(partialState()));
  const cleared = clearQuestionnaireState({ storage });
  assert.equal(cleared.status, "remove-failed");
  assert.equal(cleared.cleared, false);
});

test("restoring a saved partial state rebuilds private adaptive state", () => {
  resetQuestionnaire();
  const restored = restoreQuestionnaireState(partialState());
  assert.equal(restored.status, "in-progress");
  assert.equal(restored.currentQuestionId, "primaryUses");
  assert.equal(restored.answers.budget.target, "no-fixed-target");
  assert.deepEqual(restored.validation.attemptedQuestionIds, []);
  assert.equal(restored.pendingChange, null);
  assert.equal(restored.editing.active, false);
  assert.deepEqual(getState(), restored);
});
