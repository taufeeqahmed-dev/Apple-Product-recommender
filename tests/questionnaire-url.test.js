import test from "node:test";
import assert from "node:assert/strict";

import {
  QUESTIONNAIRE_STORAGE_KEY,
  loadQuestionnaireState,
  saveQuestionnaireState,
} from "../js/questionnaire-persistence.js";
import { createQuestionnaireState } from "../js/questionnaire-serialization.js";
import { resolveQuestionnaireStartup } from "../js/questionnaire-startup.js";
import {
  MAX_QUESTIONNAIRE_URL_PAYLOAD_LENGTH,
  QUESTIONNAIRE_URL_TRANSPORT_VERSION,
  createQuestionnaireShareUrl,
  parseQuestionnaireShareUrl,
  removeQuestionnaireShareStateFromUrl,
} from "../js/questionnaire-url.js";
import { createInitialAnswers } from "../js/questionnaire-profile.js";
import { getState, resetQuestionnaire, restoreQuestionnaireState } from "../js/questionnaire-state.js";
import { productCatalogue } from "../js/products.js";
import { recommendMacBooks } from "../js/recommendation-engine.js";
import {
  demandingCodingAnswers,
  everydayPortableAnswers,
} from "./fixtures/questionnaire-scenarios.js";

const ROOT_URL = "http://127.0.0.1:4173/";

function createMemoryStorage() {
  const values = new Map();
  const calls = { get: 0, set: 0, remove: 0 };
  return {
    calls,
    values,
    getItem(key) {
      calls.get += 1;
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      calls.set += 1;
      values.set(key, String(value));
    },
    removeItem(key) {
      calls.remove += 1;
      values.delete(key);
    },
  };
}

function partialState() {
  const answers = createInitialAnswers();
  answers.budget.target = "no-fixed-target";
  answers.primaryUses = ["study-productivity"];
  return createQuestionnaireState({
    status: "in-progress",
    currentQuestionId: "activities",
    answers,
  });
}

function completeState(answers = everydayPortableAnswers, currentQuestionId = "essentialRequirements") {
  return createQuestionnaireState({ status: "complete", currentQuestionId, answers });
}

function transportUrlForJson(json, baseUrl = ROOT_URL, transportVersion = 1) {
  const encoded = Buffer.from(json, "utf8").toString("base64url");
  return `${baseUrl.replace(/#.*$/, "")}#northstar=v${transportVersion}.${encoded}`;
}

test("transport version and encoded payload bound are explicit", () => {
  assert.equal(QUESTIONNAIRE_URL_TRANSPORT_VERSION, 1);
  assert.equal(MAX_QUESTIONNAIRE_URL_PAYLOAD_LENGTH, 5462);
});

test("a valid partial state exports at the local application root", () => {
  const shareUrl = createQuestionnaireShareUrl(partialState(), ROOT_URL);
  const url = new URL(shareUrl);
  assert.equal(url.origin, "http://127.0.0.1:4173");
  assert.equal(url.pathname, "/");
  assert.match(url.hash, /^#northstar=v1\.[A-Za-z0-9_-]+$/);
});

test("a valid complete state exports without recommendation or product data", () => {
  const shareUrl = createQuestionnaireShareUrl(completeState(), ROOT_URL);
  assert.equal(parseQuestionnaireShareUrl(shareUrl).state.status, "complete");
  assert.equal(shareUrl.includes("MacBook"), false);
  assert.equal(shareUrl.includes("recommendation"), false);
  assert.equal(shareUrl.includes(productCatalogue.products[0].id), false);
});

test("equivalent state ordering produces deterministic export", () => {
  const state = partialState();
  const reordered = {
    answers: {
      primaryUses: [...state.answers.primaryUses],
      budgetTarget: state.answers.budgetTarget,
    },
    currentQuestionId: state.currentQuestionId,
    status: state.status,
    questionnaireSchemaVersion: state.questionnaireSchemaVersion,
    stateSchemaVersion: state.stateSchemaVersion,
  };
  assert.equal(
    createQuestionnaireShareUrl(reordered, ROOT_URL),
    createQuestionnaireShareUrl(state, ROOT_URL),
  );
});

test("a valid share URL imports through the Phase 1 validator", () => {
  const imported = parseQuestionnaireShareUrl(createQuestionnaireShareUrl(partialState(), ROOT_URL));
  assert.equal(imported.status, "valid");
  assert.equal(imported.transportVersion, 1);
  assert.deepEqual(imported.state, partialState());
  assert.equal(imported.questionnaireAnswers.budget.target, "no-fixed-target");
});

test("export and import form a canonical deterministic round trip", () => {
  const firstUrl = createQuestionnaireShareUrl(completeState(), ROOT_URL);
  const imported = parseQuestionnaireShareUrl(firstUrl);
  assert.equal(imported.valid, true);
  assert.equal(imported.canonicalUrl, firstUrl);
  assert.equal(createQuestionnaireShareUrl(imported.state, ROOT_URL), firstUrl);
});

test("malformed transport and base64url encoding fail safely", () => {
  assert.equal(parseQuestionnaireShareUrl(`${ROOT_URL}#northstar=broken`).status, "malformed-transport");
  assert.equal(parseQuestionnaireShareUrl(`${ROOT_URL}#northstar=v1.!!!!`).status, "malformed-encoding");
  assert.equal(parseQuestionnaireShareUrl(`${ROOT_URL}#northstar=v1.A`).status, "malformed-encoding");
});

test("invalid decoded UTF-8 fails safely", () => {
  assert.equal(parseQuestionnaireShareUrl(`${ROOT_URL}#northstar=v1._w`).status, "invalid-utf8");
});

test("an unsupported transport version is rejected independently", () => {
  const url = transportUrlForJson(JSON.stringify(partialState()), ROOT_URL, 2);
  const imported = parseQuestionnaireShareUrl(url);
  assert.equal(imported.status, "unsupported-transport-version");
  assert.equal(imported.valid, false);
});

test("an unsupported questionnaire-state version is rejected", () => {
  const state = { ...partialState(), stateSchemaVersion: 999 };
  assert.equal(parseQuestionnaireShareUrl(transportUrlForJson(JSON.stringify(state))).status, "invalid-state");
});

test("an oversized encoded payload is rejected before decoding", () => {
  const payload = "A".repeat(MAX_QUESTIONNAIRE_URL_PAYLOAD_LENGTH + 1);
  assert.equal(parseQuestionnaireShareUrl(`${ROOT_URL}#northstar=v1.${payload}`).status, "payload-too-large");
  assert.equal(
    parseQuestionnaireShareUrl(`${ROOT_URL}#northstar=v${"9".repeat(6000)}.AA`).status,
    "payload-too-large",
  );
});

test("unknown question and option IDs are rejected", () => {
  const unknownQuestion = { ...partialState(), currentQuestionId: "invented-question" };
  const unknownOption = {
    ...partialState(),
    answers: { ...partialState().answers, budgetTarget: "invented-option" },
  };
  assert.equal(parseQuestionnaireShareUrl(transportUrlForJson(JSON.stringify(unknownQuestion))).valid, false);
  assert.equal(parseQuestionnaireShareUrl(transportUrlForJson(JSON.stringify(unknownOption))).valid, false);
});

test("duplicate selections and impossible adaptive combinations are rejected", () => {
  const duplicate = {
    ...partialState(),
    answers: { ...partialState().answers, primaryUses: ["study-productivity", "study-productivity"] },
  };
  const impossible = {
    ...partialState(),
    answers: {
      ...partialState().answers,
      primaryUses: ["study-productivity"],
      activities: ["docker-containers"],
    },
  };
  assert.equal(parseQuestionnaireShareUrl(transportUrlForJson(JSON.stringify(duplicate))).valid, false);
  assert.equal(parseQuestionnaireShareUrl(transportUrlForJson(JSON.stringify(impossible))).valid, false);
});

test("hidden stale dependent answers are rejected", () => {
  const state = completeState(demandingCodingAnswers, "externalDisplayCount");
  const stale = {
    ...state,
    currentQuestionId: "essentialRequirements",
    answers: { ...state.answers, essentialRequirements: ["none"] },
  };
  assert.equal(parseQuestionnaireShareUrl(transportUrlForJson(JSON.stringify(stale))).valid, false);
});

test("dangerous keys and arbitrary HTML never enter an imported result", () => {
  const dangerousJson = JSON.stringify(partialState()).replace(
    '"answers":{',
    '"answers":{"__proto__":{"polluted":true},',
  );
  const html = {
    ...partialState(),
    display: "<img src=x onerror=alert(1)>",
  };
  const dangerous = parseQuestionnaireShareUrl(transportUrlForJson(dangerousJson));
  const arbitrary = parseQuestionnaireShareUrl(transportUrlForJson(JSON.stringify(html)));
  assert.equal(dangerous.status, "invalid-state");
  assert.equal(arbitrary.status, "invalid-state");
  assert.equal(JSON.stringify(arbitrary).includes("onerror"), false);
});

test("recommendation and product fields injected into state are rejected", () => {
  const injected = {
    ...completeState(),
    recommendation: { productId: productCatalogue.products[0].id, score: 100, confidence: "high" },
  };
  assert.equal(parseQuestionnaireShareUrl(transportUrlForJson(JSON.stringify(injected))).valid, false);
});

test("a partial imported state restores its validated adaptive step", () => {
  const imported = parseQuestionnaireShareUrl(createQuestionnaireShareUrl(partialState(), ROOT_URL));
  resetQuestionnaire();
  const restored = restoreQuestionnaireState(imported.state);
  assert.equal(restored.status, "in-progress");
  assert.equal(restored.currentQuestionId, "activities");
  assert.deepEqual(restored.answers.primaryUses, ["study-productivity"]);
});

test("a complete imported state recalculates current recommendations", () => {
  const imported = parseQuestionnaireShareUrl(createQuestionnaireShareUrl(completeState(), ROOT_URL));
  resetQuestionnaire();
  const restored = restoreQuestionnaireState(imported.state);
  const recalculated = recommendMacBooks({ catalogue: productCatalogue, answers: restored.answers });
  const expected = recommendMacBooks({ catalogue: productCatalogue, answers: everydayPortableAnswers });
  assert.deepEqual(recalculated, expected);
});

test("valid shared state takes startup precedence without reading local storage", () => {
  const storage = createMemoryStorage();
  saveQuestionnaireState(completeState(demandingCodingAnswers, "externalDisplayCount"), { storage });
  const callsBeforeStartup = { ...storage.calls };
  const startup = resolveQuestionnaireStartup({
    url: createQuestionnaireShareUrl(partialState(), ROOT_URL),
    storage,
  });
  assert.equal(startup.mode, "shared");
  assert.deepEqual(startup.shared.state, partialState());
  assert.equal(startup.stored, null);
  assert.deepEqual(storage.calls, callsBeforeStartup);
});

test("an invalid shared URL preserves local state without reading or writing it", () => {
  const storage = createMemoryStorage();
  saveQuestionnaireState(completeState(), { storage });
  const storedBeforeStartup = storage.values.get(QUESTIONNAIRE_STORAGE_KEY);
  const callsBeforeStartup = { ...storage.calls };
  const startup = resolveQuestionnaireStartup({ url: `${ROOT_URL}#northstar=v1.!!!!`, storage });
  assert.equal(startup.mode, "invalid-shared");
  assert.equal(startup.stored, null);
  assert.equal(storage.values.get(QUESTIONNAIRE_STORAGE_KEY), storedBeforeStartup);
  assert.deepEqual(storage.calls, callsBeforeStartup);
});

test("without a share fragment normal local resume behavior remains active", () => {
  const storage = createMemoryStorage();
  saveQuestionnaireState(partialState(), { storage });
  const startup = resolveQuestionnaireStartup({ url: `${ROOT_URL}?from=test#questionnaire`, storage });
  assert.equal(startup.mode, "local-resume");
  assert.deepEqual(startup.stored.state, partialState());
});

test("deliberately adopted URL state uses canonical local persistence", () => {
  const storage = createMemoryStorage();
  saveQuestionnaireState(completeState(), { storage });
  const imported = parseQuestionnaireShareUrl(createQuestionnaireShareUrl(partialState(), ROOT_URL));
  resetQuestionnaire();
  const restored = restoreQuestionnaireState(imported.state);
  const activeCanonical = createQuestionnaireState({
    status: restored.status,
    currentQuestionId: restored.currentQuestionId,
    answers: restored.answers,
  });
  saveQuestionnaireState(activeCanonical, { storage });
  assert.deepEqual(loadQuestionnaireState({ storage }).state, partialState());
  assert.deepEqual(getState().answers.primaryUses, ["study-productivity"]);
});

test("repository subpath and unrelated query context are preserved during export", () => {
  const baseUrl = "https://example.github.io/apple-product-recommender/?campaign=portfolio#questionnaire";
  const shareUrl = new URL(createQuestionnaireShareUrl(partialState(), baseUrl));
  assert.equal(shareUrl.pathname, "/apple-product-recommender/");
  assert.equal(shareUrl.search, "?campaign=portfolio");
  assert.match(shareUrl.hash, /^#northstar=v1\./);
  assert.deepEqual(parseQuestionnaireShareUrl(shareUrl.href).state, partialState());
});

test("processed share fragments can be removed without changing path or query", () => {
  const shareUrl = createQuestionnaireShareUrl(
    partialState(),
    "https://example.github.io/apple-product-recommender/?campaign=portfolio#old",
  );
  assert.equal(
    removeQuestionnaireShareStateFromUrl(shareUrl),
    "https://example.github.io/apple-product-recommender/?campaign=portfolio",
  );
  assert.equal(
    removeQuestionnaireShareStateFromUrl(`${ROOT_URL}?campaign=portfolio#questionnaire`),
    `${ROOT_URL}?campaign=portfolio#questionnaire`,
  );
});

test("unrelated fragments are ignored and invalid export inputs throw", () => {
  assert.equal(parseQuestionnaireShareUrl(`${ROOT_URL}#questionnaire`).status, "absent");
  assert.throws(() => createQuestionnaireShareUrl({ unsafe: true }, ROOT_URL));
  assert.throws(() => createQuestionnaireShareUrl(partialState(), "javascript:alert(1)"), TypeError);
});
