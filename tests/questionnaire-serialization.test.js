import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_SERIALIZED_QUESTIONNAIRE_STATE_BYTES,
  QuestionnaireStateValidationError,
  createQuestionnaireState,
  parseQuestionnaireState,
  serializeQuestionnaireState,
  serializedQuestionnaireStateByteLength,
  validateCompleteQuestionnaireState,
  validatePartialQuestionnaireState,
  validateQuestionnaireState,
} from "../js/questionnaire-serialization.js";
import {
  QUESTIONNAIRE_SCHEMA_VERSION,
  QUESTIONNAIRE_STATE_SCHEMA_VERSION,
} from "../js/version.js";
import {
  cloneAnswers,
  demandingCodingAnswers,
  everydayPortableAnswers,
} from "./fixtures/questionnaire-scenarios.js";

function state({
  status = "in-progress",
  currentQuestionId = "budget",
  answers = {},
  ...overrides
} = {}) {
  return {
    stateSchemaVersion: QUESTIONNAIRE_STATE_SCHEMA_VERSION,
    questionnaireSchemaVersion: QUESTIONNAIRE_SCHEMA_VERSION,
    status,
    currentQuestionId,
    answers,
    ...overrides,
  };
}

function completeState(answers = everydayPortableAnswers, currentQuestionId = "essentialRequirements") {
  return createQuestionnaireState({ status: "complete", currentQuestionId, answers });
}

function hasCode(validation, code) {
  return validation.errors.some((error) => error.code === code);
}

function padSerializedState(serialized, byteLength) {
  const currentLength = serializedQuestionnaireStateByteLength(serialized);
  assert.ok(currentLength <= byteLength);
  return `${serialized}${" ".repeat(byteLength - currentLength)}`;
}

test("the empty initial questionnaire is a valid partial state", () => {
  const validation = validatePartialQuestionnaireState(state());
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.state.answers, {});
  assert.equal(validation.questionnaireAnswers.budget.target, "");
  assert.ok(Object.isFrozen(validation.state));
});

test("a minimally answered reachable partial state is valid", () => {
  const validation = validatePartialQuestionnaireState(
    state({
      currentQuestionId: "primaryUses",
      answers: { budgetMode: "strict", budgetTarget: "up-to-1500" },
    }),
  );
  assert.equal(validation.valid, true);
  assert.deepEqual(Object.keys(validation.state.answers), ["budgetTarget", "budgetMode"]);
});

test("a richer adaptive partial state can stop before required detail answers", () => {
  const validation = validatePartialQuestionnaireState(
    state({
      currentQuestionId: "maximumWeight",
      answers: {
        budgetTarget: "up-to-2500",
        budgetMode: "strict",
        primaryUses: ["software-development", "cybersecurity-vms"],
        activities: ["docker-containers", "two-virtual-machines"],
        multitasking: "heavy",
        portabilityPerformance: "lean-performance",
        screenSize: "14-inch",
        minimumStorage: "1tb",
        essentialRequirements: ["maximum-weight", "external-displays"],
      },
    }),
  );
  assert.equal(validation.valid, true);
  assert.equal(validation.questionnaireAnswers.essentialDetails.maximumWeight, null);
  assert.equal(validation.questionnaireAnswers.essentialDetails.externalDisplayCount, null);
});

test("a complete state reconstructs only trusted questionnaire IDs", () => {
  const validation = validateCompleteQuestionnaireState(completeState());
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.questionnaireAnswers, everydayPortableAnswers);
  assert.equal(Object.hasOwn(validation.state, "matches"), false);
  assert.equal(Object.hasOwn(validation.state, "products"), false);
});

test("a complete adaptive state accepts multi-select activities and dependent answers", () => {
  const complete = completeState(demandingCodingAnswers, "externalDisplayCount");
  const validation = validateCompleteQuestionnaireState(complete);
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.state.answers.primaryUses, [
    "study-productivity",
    "software-development",
  ]);
  assert.deepEqual(validation.state.answers.activities, [
    "research-spreadsheets-tabs",
    "docker-containers",
  ]);
  assert.equal(validation.state.answers.externalDisplayCount, "two");
});

test("neutral and no-preference option IDs remain valid decision state", () => {
  const answers = cloneAnswers();
  answers.budget.target = "no-fixed-target";
  answers.budget.mode = null;
  answers.devicePreferences.portabilityPerformance = "let-northstar-decide";
  answers.devicePreferences.screenSize = "no-preference";
  answers.minimumStorage = "unsure";
  const validation = validateCompleteQuestionnaireState(completeState(answers));
  assert.equal(validation.valid, true);
  assert.equal(validation.state.answers.budgetTarget, "no-fixed-target");
  assert.equal(Object.hasOwn(validation.state.answers, "budgetMode"), false);
  assert.equal(validation.state.answers.screenSize, "no-preference");
});

test("an optional absolute-budget answer is valid only as a stable visible option ID", () => {
  const answers = cloneAnswers();
  answers.budget.mode = "flexible";
  answers.budget.absoluteMaximum = "up-to-2500";
  const validation = validateCompleteQuestionnaireState(completeState(answers));
  assert.equal(validation.valid, true);
  assert.equal(validation.state.answers.absoluteBudget, "up-to-2500");
});

test("valid state has a deterministic serialize-parse-validate round trip", () => {
  const original = completeState(demandingCodingAnswers, "externalDisplayCount");
  const serialized = serializeQuestionnaireState(original);
  const parsed = parseQuestionnaireState(serialized);
  assert.equal(parsed.valid, true);
  assert.deepEqual(parsed.state, original);
  assert.equal(serializeQuestionnaireState(parsed.state), serialized);
});

test("equivalent input ordering serializes to one canonical representation", () => {
  const first = state({
    currentQuestionId: "activities",
    answers: {
      activities: ["docker-containers", "general-programming"],
      primaryUses: ["cybersecurity-vms", "software-development"],
      budgetMode: "strict",
      budgetTarget: "up-to-2500",
    },
  });
  const second = state({
    currentQuestionId: "activities",
    answers: {
      budgetTarget: "up-to-2500",
      primaryUses: ["software-development", "cybersecurity-vms"],
      budgetMode: "strict",
      activities: ["general-programming", "docker-containers"],
    },
  });
  assert.equal(serializeQuestionnaireState(first), serializeQuestionnaireState(second));
});

test("the active-answer factory emits the exact versioned sparse contract", () => {
  const created = completeState();
  assert.deepEqual(Object.keys(created), [
    "stateSchemaVersion",
    "questionnaireSchemaVersion",
    "status",
    "currentQuestionId",
    "answers",
  ]);
  assert.deepEqual(Object.keys(created.answers), [
    "budgetTarget",
    "budgetMode",
    "primaryUses",
    "activities",
    "multitasking",
    "portabilityPerformance",
    "screenSize",
    "minimumStorage",
    "essentialRequirements",
  ]);
});

test("malformed JSON fails safely", () => {
  const validation = parseQuestionnaireState("{not-json");
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "invalid-json"), true);
});

test("a non-string serialized input fails safely", () => {
  const validation = parseQuestionnaireState({});
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "invalid-serialized-type"), true);
});

test("wrong top-level JSON types are rejected", () => {
  for (const serialized of ["null", "[]", '"state"', "42", "true"]) {
    const validation = parseQuestionnaireState(serialized);
    assert.equal(validation.valid, false);
    assert.equal(hasCode(validation, "invalid-object"), true);
  }
});

test("a missing state-schema version is rejected", () => {
  const input = state();
  delete input.stateSchemaVersion;
  const validation = validatePartialQuestionnaireState(input);
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "missing-property"), true);
  assert.equal(hasCode(validation, "invalid-state-schema-version"), true);
});

test("a missing questionnaire-schema version is rejected", () => {
  const input = state();
  delete input.questionnaireSchemaVersion;
  const validation = validatePartialQuestionnaireState(input);
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "missing-property"), true);
  assert.equal(hasCode(validation, "invalid-questionnaire-schema-version"), true);
});

test("an unsupported state-schema version is rejected", () => {
  const validation = validatePartialQuestionnaireState(
    state({ stateSchemaVersion: QUESTIONNAIRE_STATE_SCHEMA_VERSION + 1 }),
  );
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "unsupported-state-schema-version"), true);
});

test("an unsupported questionnaire-schema version is rejected", () => {
  const validation = validatePartialQuestionnaireState(
    state({ questionnaireSchemaVersion: QUESTIONNAIRE_SCHEMA_VERSION + 1 }),
  );
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "unsupported-questionnaire-schema-version"), true);
});

test("unknown top-level properties are rejected", () => {
  const validation = validatePartialQuestionnaireState(state({ recommendationResults: [] }));
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "unknown-property"), true);
});

test("unknown current question IDs are rejected", () => {
  const validation = validatePartialQuestionnaireState(
    state({ currentQuestionId: "invented-question" }),
  );
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "unknown-current-question"), true);
});

test("invalid questionnaire statuses are rejected", () => {
  const validation = validateQuestionnaireState(state({ status: "editing" }));
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "invalid-status"), true);
});

test("unknown answer control IDs are rejected", () => {
  const validation = validatePartialQuestionnaireState(
    state({ answers: { inventedControl: "up-to-1500" } }),
  );
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "unknown-answer-id"), true);
});

test("unknown option IDs are rejected", () => {
  const validation = validatePartialQuestionnaireState(
    state({ answers: { budgetTarget: "unlimited-money" } }),
  );
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "unknown-option-id"), true);
});

test("wrong radio and multi-select answer types are rejected", () => {
  const radio = validatePartialQuestionnaireState(
    state({ answers: { budgetTarget: ["up-to-1500"] } }),
  );
  const multi = validatePartialQuestionnaireState(
    state({ answers: { primaryUses: "study-productivity" } }),
  );
  assert.equal(hasCode(radio, "invalid-answer-type"), true);
  assert.equal(hasCode(multi, "invalid-answer-type"), true);
});

test("duplicate multi-select option IDs are rejected", () => {
  const validation = validatePartialQuestionnaireState(
    state({ answers: { primaryUses: ["study-productivity", "study-productivity"] } }),
  );
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "duplicate-option-id"), true);
});

test("maximum-selection limits are enforced", () => {
  const validation = validatePartialQuestionnaireState(
    state({
      answers: {
        primaryUses: ["study-productivity", "software-development", "photo-editing"],
      },
    }),
  );
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "too-many-selections"), true);
});

test("mutually exclusive multi-select combinations are rejected", () => {
  const validation = validatePartialQuestionnaireState(
    state({ answers: { essentialRequirements: ["none", "workload"] } }),
  );
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "exclusive-option-combination"), true);
});

test("activity answers impossible for the selected use are rejected", () => {
  const validation = validatePartialQuestionnaireState(
    state({
      currentQuestionId: "activities",
      answers: {
        budgetTarget: "no-fixed-target",
        primaryUses: ["study-productivity"],
        activities: ["docker-containers"],
      },
    }),
  );
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "unavailable-option"), true);
});

test("stale hidden essential-detail answers are rejected", () => {
  const complete = completeState();
  const tampered = structuredClone(complete);
  tampered.answers.maximumWeight = "up-to-1.55kg";
  const validation = validateQuestionnaireState(tampered);
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "hidden-answer"), true);
});

test("hidden budget-dependent answers are rejected rather than reinterpreted", () => {
  const validation = validatePartialQuestionnaireState(
    state({
      answers: { budgetTarget: "no-fixed-target", budgetMode: "strict" },
    }),
  );
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "hidden-answer"), true);
});

test("an adaptive current question must be visible", () => {
  const validation = validatePartialQuestionnaireState(
    state({ currentQuestionId: "maximumWeight" }),
  );
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "hidden-current-question"), true);
});

test("an in-progress current question must be reachable through completed earlier steps", () => {
  const validation = validatePartialQuestionnaireState(
    state({ currentQuestionId: "minimumStorage" }),
  );
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "unreachable-current-question"), true);
});

test("the complete validator does not accept an in-progress state", () => {
  const validation = validateCompleteQuestionnaireState(state());
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "status-mismatch"), true);
});

test("complete status cannot disguise incomplete answers", () => {
  const validation = validateCompleteQuestionnaireState(
    state({ status: "complete", currentQuestionId: "essentialRequirements" }),
  );
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "incomplete-questionnaire"), true);
});

test("a complete state must identify its final visible question", () => {
  const complete = completeState();
  const validation = validateCompleteQuestionnaireState({
    ...complete,
    currentQuestionId: "budget",
  });
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "invalid-complete-current-question"), true);
});

test("dangerous prototype-related property names are rejected at every record boundary", () => {
  for (const property of ["__proto__", "prototype", "constructor"]) {
    const serialized = JSON.stringify(state()).replace(
      '"answers":{}',
      `"answers":{"${property}":"tampered"}`,
    );
    const validation = parseQuestionnaireState(serialized);
    assert.equal(validation.valid, false);
    assert.equal(hasCode(validation, "dangerous-property"), true);
  }
});

test("unexpected object prototypes, accessors and array properties are rejected", () => {
  const inherited = Object.assign(Object.create({ polluted: true }), state());
  assert.equal(hasCode(validateQuestionnaireState(inherited), "unsafe-object-prototype"), true);

  const accessor = state();
  Object.defineProperty(accessor, "status", { enumerable: true, get: () => "in-progress" });
  assert.equal(hasCode(validateQuestionnaireState(accessor), "invalid-property-descriptor"), true);

  const extraArrayProperty = state({ answers: { primaryUses: ["study-productivity"] } });
  extraArrayProperty.answers.primaryUses.extra = "content";
  assert.equal(hasCode(validateQuestionnaireState(extraArrayProperty), "invalid-array-property"), true);
});

test("tampered display, product and recommendation data cannot enter the contract", () => {
  for (const property of ["questionLabel", "productId", "confidence", "html"]) {
    const input = structuredClone(completeState());
    input.answers[property] = "untrusted";
    const validation = validateQuestionnaireState(input);
    assert.equal(validation.valid, false);
    assert.equal(hasCode(validation, "unknown-answer-id"), true);
  }
});

test("serialized payload size is accepted immediately below and at the limit", () => {
  const serialized = serializeQuestionnaireState(state());
  const below = padSerializedState(serialized, MAX_SERIALIZED_QUESTIONNAIRE_STATE_BYTES - 1);
  const at = padSerializedState(serialized, MAX_SERIALIZED_QUESTIONNAIRE_STATE_BYTES);
  assert.equal(parseQuestionnaireState(below).valid, true);
  assert.equal(parseQuestionnaireState(at).valid, true);
});

test("the broadest current compatible complete fixture remains well below the payload limit", () => {
  const answers = cloneAnswers();
  answers.budget.target = "up-to-1000";
  answers.budget.mode = "flexible";
  answers.budget.absoluteMaximum = "up-to-4500";
  answers.primaryUses = ["study-productivity", "software-development"];
  answers.activities = [
    "documents-browsing-calls",
    "research-spreadsheets-tabs",
    "statistics-analysis-local-tools",
    "general-programming",
    "web-mobile-development",
    "local-development-servers",
    "local-databases",
    "docker-containers",
    "one-virtual-machine",
    "two-virtual-machines",
    "three-plus-virtual-machines",
    "larger-local-ai-models",
  ];
  answers.multitasking = "very-heavy";
  answers.devicePreferences.portabilityPerformance = "performance-first";
  answers.devicePreferences.screenSize = "16-inch";
  answers.minimumStorage = "2tb-plus";
  answers.essentialRequirements = [
    "workload",
    "exact-screen",
    "maximum-weight",
    "external-displays",
  ];
  answers.essentialDetails.maximumWeight = "up-to-2.05kg";
  answers.essentialDetails.externalDisplayCount = "four-plus";
  const serialized = serializeQuestionnaireState(
    createQuestionnaireState({
      status: "complete",
      currentQuestionId: "externalDisplayCount",
      answers,
    }),
  );
  assert.ok(serializedQuestionnaireStateByteLength(serialized) < 1024);
});

test("serialized payload size above the limit is rejected before parsing", () => {
  const serialized = serializeQuestionnaireState(state());
  const above = padSerializedState(serialized, MAX_SERIALIZED_QUESTIONNAIRE_STATE_BYTES + 1);
  const validation = parseQuestionnaireState(above);
  assert.equal(validation.valid, false);
  assert.equal(hasCode(validation, "payload-too-large"), true);
});

test("serializing invalid state throws a typed validation error", () => {
  assert.throws(
    () => serializeQuestionnaireState(state({ status: "editing" })),
    QuestionnaireStateValidationError,
  );
});

test("serialized state contains stable IDs and excludes labels, results and product facts", () => {
  const serialized = serializeQuestionnaireState(completeState());
  assert.ok(serialized.includes('"study-productivity"'));
  assert.equal(serialized.includes("University, studying"), false);
  assert.equal(serialized.includes("recommendation"), false);
  assert.equal(serialized.includes("confidence"), false);
  assert.equal(serialized.includes("MacBook"), false);
  assert.equal(serialized.includes("price"), false);
});
