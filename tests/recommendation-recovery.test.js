import test from "node:test";
import assert from "node:assert/strict";
import { productCatalogue } from "../js/products.js";
import { recommendMacBooks } from "../js/recommendation-engine.js";
import { buildRecommendationRecovery } from "../js/recommendation-recovery.js";
import { getAnswerValue, getVisibleQuestionIds } from "../js/questionnaire-profile.js";
import { recoveryAnswers } from "./fixtures/recommendation-recovery-scenarios.js";
import { cloneAnswers } from "./fixtures/questionnaire-scenarios.js";

const calculate = (name) => recommendMacBooks({ catalogue: productCatalogue, answers: recoveryAnswers(name) });
const build = (output) => buildRecommendationRecovery({ output });
function assertDeepFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.ok(Object.isFrozen(value));
  Object.values(value).forEach(assertDeepFrozen);
}

test("recovery is deterministic, detached and deeply immutable without mutating or freezing input", () => {
  const output = structuredClone(calculate("multiple"));
  const before = structuredClone(output);
  const model = build(output);
  assert.deepEqual(build(output), model);
  assert.deepEqual(build(Object.fromEntries(Object.entries(output).toReversed())), model);
  assert.deepEqual(output, before);
  assertDeepFrozen(model);
  assert.equal(Object.isFrozen(output), false);
  assert.equal(Object.isFrozen(output.input.answers), false);
  assert.throws(() => model.actions.push({}), TypeError);
  output.input.answers.activities.push("not-in-model");
  assert.ok(!model.blockers.flatMap(({ answerReferences }) => answerReferences)
    .some(({ value }) => Array.isArray(value) && value.includes("not-in-model")));
});

test("no-match blockers preserve applied-filter order without using counts as importance", () => {
  const output = structuredClone(calculate("multiple"));
  const expected = ["budget", "storage", "workload-capability", "workload-memory", "weight", "screen-size", "external-displays"];
  assert.deepEqual(build(output).blockers.map(({ code }) => code), expected);
  output.diagnostics.blockerCounts = Object.fromEntries(expected.toReversed().map((code, i) => [code, i + 1]));
  assert.deepEqual(build(output).blockers.map(({ code }) => code), expected);
  for (const blocker of build(output).blockers) {
    for (const reference of blocker.evidenceReferences) {
      const filter = reference.path.reduce((value, key) => value[key], output);
      assert.equal(filter.code, blocker.code);
      assert.equal(filter.judgement, reference.judgement);
      assert.equal(output.exclusions[reference.path[1]].productId, reference.productId);
    }
  }
});

test("all seven supported filters map to existing visible questions and original answer controls", () => {
  const output = calculate("multiple");
  const model = build(output);
  assert.deepEqual(model.blockers.map(({ questionId }) => questionId), ["budget", "minimumStorage", "essentialRequirements", "essentialRequirements", "maximumWeight", "devicePreferences", "externalDisplayCount"]);
  for (const blocker of model.blockers) {
    assert.ok(getVisibleQuestionIds(output.input.answers).includes(blocker.questionId));
    for (const ref of blocker.answerReferences) {
      assert.equal(ref.kind, "user-answer");
      assert.deepEqual(ref.value, getAnswerValue(output.input.answers, ref.answerPath));
      assert.ok(ref.label.length > 0);
    }
    assert.equal(blocker.requirement.kind, blocker.code.startsWith("workload-") ? "northstar-assessment" : "user-answer");
  }
  const memory = model.blockers.find(({ code }) => code === "workload-memory");
  assert.equal(memory.requirement.value, output.profile.hardRequirements.memoryMinimumGb);
  assert.deepEqual(memory.answerReferences.map(({ controlId }) => controlId), ["essentialRequirements", "primaryUses", "activities", "multitasking"]);
});

test("related Essentials share a deduplicated action while specific value editors remain available", () => {
  const model = build(calculate("multiple"));
  assert.deepEqual(model.actions.map(({ questionId }) => questionId), ["budget", "minimumStorage", "essentialRequirements", "maximumWeight", "devicePreferences", "externalDisplayCount"]);
  assert.deepEqual(model.actions.find(({ questionId }) => questionId === "essentialRequirements").blockerCodes,
    ["workload-capability", "workload-memory", "weight", "screen-size", "external-displays"]);
  assert.equal(new Set(model.actions.map(({ questionId }) => questionId)).size, model.actions.length);
  const screen = build(calculate("screen"));
  assert.deepEqual(screen.actions.map(({ label }) => label), ["Edit storage requirement", "Review screen size"]);
});

for (const mode of ["strict", "flexible", "stretch"]) {
  test(`${mode} budget-limited recovery preserves target/maximum and excluded context`, () => {
    const answers = recoveryAnswers("budget");
    answers.budget.mode = mode;
    if (mode !== "strict") answers.budget.absoluteMaximum = "up-to-1500";
    const output = recommendMacBooks({ catalogue: productCatalogue, answers });
    assert.equal(output.status, "budget-limited");
    const model = build(output);
    assert.equal(model.status, output.status);
    assert.deepEqual(model.blockers.map(({ code }) => code), ["budget"]);
    assert.deepEqual(model.actions.map(({ label }) => label), ["Review budget"]);
    assert.equal(model.budgetContext.preferredTargetMinor, 100000);
    assert.equal(model.budgetContext.maximumMinor, mode === "strict" ? 100000 : 150000);
    assert.deepEqual(model.budgetContext.alternatives, output.budgetLimitedAlternatives);
    assert.match(model.blockers[0].summary, mode === "strict" ? /strict budget maximum/ : /preferred target.*explicit absolute maximum/);
    assert.match(model.explanation, /remain excluded, not recommendations/);
  });
}

test("eligible stretch results and invalid outcomes have no recovery content", () => {
  const answers = recoveryAnswers("budget");
  answers.budget.mode = "flexible";
  answers.budget.absoluteMaximum = "up-to-4500";
  const ok = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.equal(ok.status, "ok");
  assert.ok(ok.stretchMatches.length > 0);
  const invalidInput = recommendMacBooks({ catalogue: productCatalogue, answers: {} });
  const invalidCatalog = recommendMacBooks({ catalogue: {}, answers });
  for (const output of [ok, invalidInput, invalidCatalog]) {
    assert.deepEqual(build(output), { status: output.status, explanation: null, blockers: [], actions: [], notices: [], budgetContext: null });
  }
});

test("catalogue limitations stay separate from user requirements and never get actions", () => {
  const output = structuredClone(calculate("multiple"));
  output.exclusions = [{ productId: "context-only", failedFilters: ["availability", "market", "incomplete-data", "complete-data", "future-filter"].map((code) => ({ code })) }];
  output.diagnostics.blockerCounts = { availability: 10 };
  const model = build(output);
  assert.deepEqual(model.blockers, []);
  assert.deepEqual(model.actions, []);
  assert.deepEqual(model.notices.map(({ code }) => code), ["availability", "market", "incomplete-data", "complete-data", "unsupported-filter"]);
  assert.match(model.explanation, /could not identify a reliable answer-edit route/);
});

test("a real availability-only terminal result does not blame answers or offer requirement edits", () => {
  const catalogue = structuredClone(productCatalogue);
  catalogue.products.forEach((product) => { product.availability.status = "unavailable"; });
  const answers = cloneAnswers();
  answers.budget = { target: "no-fixed-target", mode: null, absoluteMaximum: null };
  const output = recommendMacBooks({ catalogue, answers });
  assert.equal(output.status, "no-match");
  const model = build(output);
  assert.deepEqual(model.blockers, []);
  assert.deepEqual(model.actions, []);
  assert.deepEqual(model.notices.map(({ code }) => code), ["availability"]);
  assert.match(model.explanation, /keep your answers/);
});

test("absent or inactive requirements cannot manufacture blockers or inaccessible actions", () => {
  const output = structuredClone(calculate("multiple"));
  output.input.answers = cloneAnswers();
  const model = build(output);
  assert.ok(!model.blockers.some(({ code }) => ["weight", "screen-size", "workload-capability", "workload-memory", "external-displays"].includes(code)));
  assert.ok(!model.actions.some(({ questionId }) => ["maximumWeight", "externalDisplayCount"].includes(questionId)));
  const invalid = structuredClone(calculate("multiple"));
  invalid.input.answers.essentialDetails.maximumWeight = null;
  assert.deepEqual(build(invalid).actions, []);
  output.profile.hardRequirements = {};
  assert.deepEqual(build(output).blockers, []);
});

test("a failed code alone, a count alone or a preference does not justify recovery", () => {
  const output = structuredClone(calculate("screen"));
  output.diagnostics.appliedFilterCodes = [];
  assert.deepEqual(build(output).actions, []);
  output.diagnostics.appliedFilterCodes = ["screen-size", "storage"];
  output.exclusions = [];
  assert.deepEqual(build(output).actions, []);
  output.profile.hardRequirements = {};
  assert.deepEqual(build(output).actions, []);
});

test("uncapped budget and unsure storage answers cannot be presented as hard constraints", () => {
  const output = structuredClone(calculate("multiple"));
  output.input.answers.budget = { target: "no-fixed-target", mode: null, absoluteMaximum: null };
  output.input.answers.minimumStorage = "unsure";
  assert.ok(!build(output).blockers.some(({ code }) => ["budget", "storage"].includes(code)));
});

test("budget-limited output without contextual alternatives does not invent budget advice", () => {
  const output = structuredClone(calculate("budget"));
  output.budgetLimitedAlternatives = [];
  assert.deepEqual(build(output).actions, []);
  assert.equal(build(output).budgetContext, null);
});

test("malformed outcomes fail at the optional recovery boundary", () => {
  assert.throws(() => build(null), TypeError);
  assert.throws(() => build({ status: "future-outcome" }), TypeError);
});

test("contradictory answer/profile requirements are omitted rather than described as selected answers", () => {
  const cases = [
    ["budget", "budgetMaximumMinor", 150000],
    ["storage", "storageMinimumGb", 512],
    ["workload-capability", "workloadCapabilityBand", 2],
    ["workload-memory", "memoryMinimumGb", 16],
    ["weight", "weightMaximumKg", 1.75],
    ["screen-size", "exactScreenSizeInches", 14],
    ["external-displays", "externalDisplayMinimum", 2],
  ];
  for (const [code, key, value] of cases) {
    const output = structuredClone(calculate("multiple"));
    output.profile.hardRequirements[key] = value;
    const before = structuredClone(output);
    const model = build(output);
    assert.ok(!model.blockers.some((blocker) => blocker.code === code), code);
    assert.ok(!model.actions.some(({ blockerCodes }) => blockerCodes.includes(code)), code);
    assert.ok(model.blockers.length > 0, "Other corroborated requirements remain usable");
    assert.deepEqual(output, before);
  }
  const storage = structuredClone(calculate("storage"));
  storage.profile.hardRequirements.storageMinimumGb = 512;
  storage.exclusions.forEach(({ failedFilters }) => failedFilters.forEach((filter) => {
    if (filter.code === "storage") filter.details.minimumGb = 512;
  }));
  assert.ok(!build(storage).blockers.some(({ code }) => code === "storage"),
    "Agreement between profile and filters cannot override the original 1 TB answer");
});

test("a contradictory failed-filter threshold cannot support a recovery claim or action", () => {
  const thresholds = [
    ["budget", "limitMinor"], ["storage", "minimumGb"], ["workload-capability", "minimumBand"],
    ["workload-memory", "minimumGb"], ["weight", "maximumKg"],
    ["screen-size", "requiredInches"], ["external-displays", "minimumCount"],
  ];
  for (const [code, key] of thresholds) {
    const output = structuredClone(calculate("multiple"));
    const filter = output.exclusions.flatMap(({ failedFilters }) => failedFilters).find((item) => item.code === code);
    filter.details[key] += 1;
    const model = build(output);
    assert.ok(!model.blockers.some((blocker) => blocker.code === code), code);
    assert.ok(!model.actions.some(({ blockerCodes }) => blockerCodes.includes(code)), code);
  }
});

for (const [name, change] of [
  ["negative over-limit amount", (output) => { output.budgetLimitedAlternatives[0].amountOverLimitMinor = -1; }],
  ["non-finite over-limit amount", (output) => { output.budgetLimitedAlternatives[0].amountOverLimitMinor = Infinity; }],
  ["incorrect over-limit amount", (output) => { output.budgetLimitedAlternatives[0].amountOverLimitMinor += 1; }],
  ["unrelated product reference", (output) => { output.budgetLimitedAlternatives[0].productId = "unknown-configuration"; }],
  ["price inconsistent with exclusion", (output) => { output.budgetLimitedAlternatives[0].priceMinor += 100; output.budgetLimitedAlternatives[0].amountOverLimitMinor += 100; }],
  ["another failed requirement", (output) => {
    const alternative = output.budgetLimitedAlternatives[0];
    output.exclusions.find(({ productId }) => productId === alternative.productId).failedFilters
      .push({ code: "availability", details: {}, judgement: "verified-fact" });
  }],
  ["incorrect preferred target", (output) => { output.profile.preferences.budgetTargetMinor = 50000; }],
]) {
  test(`budget context rejects ${name} without manufacturing replacement advice`, () => {
    const output = structuredClone(calculate("budget"));
    change(output);
    const before = structuredClone(output);
    const model = build(output);
    assert.equal(model.status, "budget-limited");
    assert.equal(model.budgetContext, null);
    assert.deepEqual(model.blockers, []);
    assert.deepEqual(model.actions, []);
    assert.match(model.explanation, /keep your answers/);
    assert.deepEqual(output, before);
  });
}
