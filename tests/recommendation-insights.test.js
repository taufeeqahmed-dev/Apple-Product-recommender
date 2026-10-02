import test from "node:test";
import assert from "node:assert/strict";

import { productCatalogue } from "../js/products.js";
import { recommendMacBooks } from "../js/recommendation-engine.js";
import { buildRecommendationInsights } from "../js/recommendation-insights.js";
import { QUESTION_DEFINITIONS } from "../js/questionnaire-definition.js";
import { insightAnswers, insightScenarios } from "./fixtures/recommendation-insight-scenarios.js";
import { cloneAnswers, noMatchAnswers } from "./fixtures/questionnaire-scenarios.js";

const read = (value, path) => path.split(".").reduce((current, key) => current?.[key], value);
const byId = (model, id) => model.evidence.find((item) => item.id === id);
const resolve = (model, output, id) => read(output, byId(model, id).path);
const needs = (model) => model.evidence.filter(({ kind }) => kind === "derived-need");
const facts = (model) => model.evidence.filter(({ kind }) => kind === "verified-fact");
const group = (output) => output.matches.length ? output.matches : output.stretchMatches;

function build(answers = insightAnswers("everyday"), catalogue = productCatalogue) {
  const output = recommendMacBooks({ catalogue, answers });
  assert.equal(output.status, "ok");
  return { output, model: buildRecommendationInsights({ output, catalogue }) };
}

function flexibleAnswers(storage = "256gb") {
  const answers = insightAnswers("everyday");
  answers.budget = { target: "up-to-1000", mode: "flexible", absoluteMaximum: "up-to-4500" };
  answers.minimumStorage = storage;
  return answers;
}

function allRequirementsAnswers() {
  const answers = insightAnswers("everyday");
  answers.budget.target = "up-to-4500";
  answers.devicePreferences.screenSize = "14-inch";
  answers.essentialRequirements = ["workload", "maximum-weight", "exact-screen", "external-displays"];
  answers.essentialDetails = { maximumWeight: "up-to-1.75kg", externalDisplayCount: "two" };
  return answers;
}

function assertDeepFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.ok(Object.isFrozen(value));
  Object.values(value).forEach(assertDeepFrozen);
}

function reverseObjectKeys(value) {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).reverse()
    .map(([key, child]) => [key, reverseObjectKeys(child)]));
}

test("repeated projections ignore object insertion order and catalogue record order", () => {
  const { output, model } = build(insightAnswers("development"));
  assert.deepEqual(buildRecommendationInsights({ output, catalogue: productCatalogue }), model);
  const catalogue = reverseObjectKeys(productCatalogue);
  catalogue.products.reverse();
  const reordered = reverseObjectKeys(output);
  reordered.input.answers.activities.reverse();
  assert.deepEqual(buildRecommendationInsights({ output: reordered, catalogue }), model);
});

test("output is deeply frozen, detached, and does not freeze or mutate caller-owned inputs", () => {
  const catalogue = structuredClone(productCatalogue);
  const output = structuredClone(build(insightAnswers("development")).output);
  const before = structuredClone({ output, catalogue });
  const model = buildRecommendationInsights({ output, catalogue });
  const snapshot = structuredClone(model);
  assertDeepFrozen(model);
  assert.deepEqual({ output, catalogue }, before);
  assert.equal(Object.isFrozen(output), false);
  assert.equal(Object.isFrozen(catalogue.products[0]), false);
  assert.throws(() => model.evidence.push({}), TypeError);
  assert.throws(() => needs(model)[0].signals[0].value = 999, TypeError);
  assert.throws(() => model.runnerUpComparison.decidingFactor.code = "invented", TypeError);
  output.profile.workload.evidence[0].memoryGb = 999;
  output.matches[1].rankingExplanation.decidingFactor.difference = 999;
  catalogue.products[0].sources[0].supportsFields.push("invented");
  assert.deepEqual(model, snapshot);
});

test("answer and need evidence follow explicit definition and profile-path order", () => {
  const { model } = build();
  assert.deepEqual(model.evidence.filter(({ kind }) => kind === "user-answer").map(({ id }) => id), [
    "answer:budgetTarget:up-to-1500", "answer:budgetMode:strict",
    "answer:primaryUses:study-productivity", "answer:activities:documents-browsing-calls",
    "answer:multitasking:moderate", "answer:portabilityPerformance:portability-first",
    "answer:screenSize:13-inch", "answer:minimumStorage:256gb", "answer:essentialRequirements:none",
  ]);
  assert.deepEqual(needs(model).map(({ path }) => path), [
    "workload.capabilityBand", "workload.memoryGb", "preferences.budgetTargetMinor",
    "preferences.screenSizeInches", "hardRequirements.budgetMaximumMinor",
    "hardRequirements.storageMinimumGb",
  ]);
  const categories = model.evidence.map(({ kind }) => kind)
    .filter((kind, index, kinds) => index === 0 || kind !== kinds[index - 1]);
  assert.deepEqual(categories, ["user-answer", "derived-need", "verified-fact", "northstar-assessment"]);
});

test("fact and component evidence order is stable within leader then runner-up", () => {
  const { output, model } = build();
  const factOrder = ["price.amountMinor", "facts.chip.id", "facts.unifiedMemoryGb", "facts.storageGb",
    "facts.marketedScreenSizeInches", "facts.displayDiagonalInches", "facts.weightKg",
    "facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive"];
  const components = ["workload", "primaryUses", "multitaskingMemory", "portabilityWeight",
    "screenSize", "externalDisplays"];
  assert.deepEqual(facts(model).map(({ productId }) => productId),
    output.matches.slice(0, 2).flatMap(({ productId }) => factOrder.map(() => productId)));
  for (const match of output.matches.slice(0, 2)) {
    assert.deepEqual(facts(model).filter(({ productId }) => productId === match.productId)
      .map(({ path }) => path), factOrder);
  }
  assert.deepEqual(model.evidence.filter(({ path = "" }) => path.includes(".score.components."))
    .map(({ path }) => path), [0, 1].flatMap((index) => components
    .map((key) => `matches.${index}.score.components.${key}`)));
});

test("all evidence paths, input references and workload-signal references resolve", () => {
  for (const { answers } of insightScenarios) {
    const { output, model } = build(answers);
    assert.equal(new Set(model.evidence.map(({ id }) => id)).size, model.evidence.length);
    for (const evidence of model.evidence) {
      for (const id of evidence.inputRefs ?? []) assert.ok(byId(model, id), id);
      for (const signal of evidence.signals ?? []) assert.equal(byId(model, signal.answerRef).kind, "user-answer");
      if (evidence.kind === "derived-need") assert.equal(read(output.profile, evidence.path), evidence.value);
      if (evidence.kind === "northstar-assessment") assert.notEqual(read(output, evidence.path), undefined);
    }
  }
});

test("workload signals preserve all contributors without treating each as the maximum or sole cause", () => {
  const { model } = build(insightAnswers("development"));
  const memory = byId(model, "need:workload.memoryGb");
  assert.equal(memory.value, 24);
  assert.equal(memory.requirementMode, "preference");
  assert.deepEqual(memory.signals.map(({ source, value, attainsTarget }) => ({ source, value, attainsTarget })), [
    { source: "primaryUses.software-development", value: 16, attainsTarget: false },
    { source: "activities.docker-containers", value: 24, attainsTarget: true },
    { source: "activities.local-databases", value: 16, attainsTarget: false },
    { source: "multitasking", value: 24, attainsTarget: true },
  ]);
  const creative = byId(build(insightAnswers("creative")).model, "need:workload.memoryGb");
  assert.deepEqual(creative.signals.filter(({ attainsTarget }) => attainsTarget)
    .map(({ source }) => source), ["multitasking"]);
});

test("only existing explicit essentials yield workload, weight, screen and display requirement checks", () => {
  const soft = build(insightAnswers("development")).model;
  assert.equal(needs(soft).some(({ path }) => path === "hardRequirements.memoryMinimumGb"), false);
  const { output, model } = build(allRequirementsAnswers());
  assert.deepEqual(model.requirementChecks.map((id) => resolve(model, output, id)), [
    "budget", "storage", "workload-capability", "workload-memory", "weight", "screen-size", "external-displays",
  ]);
  assert.deepEqual(byId(model, "need:hardRequirements.memoryMinimumGb").inputRefs,
    ["need:workload.memoryGb", "answer:essentialRequirements:workload"]);
  assert.equal(byId(model, "need:workload.memoryGb").requirementMode, "mandatory");
  assert.deepEqual(byId(model, "need:hardRequirements.budgetMaximumMinor").inputRefs,
    ["answer:budgetTarget:up-to-4500", "answer:budgetMode:strict"]);
  const flexible = build(flexibleAnswers()).model;
  assert.deepEqual(byId(flexible, "need:hardRequirements.budgetMaximumMinor").inputRefs,
    ["answer:budgetMode:flexible", "answer:absoluteBudget:up-to-4500"]);
});

test("leading reasons and passed requirements retain engine array order, including compound assessments", () => {
  const output = structuredClone(build(allRequirementsAnswers()).output);
  output.matches[0].reasons.reverse();
  output.matches[0].passedFilters.reverse();
  const model = buildRecommendationInsights({ output, catalogue: productCatalogue });
  assert.deepEqual(model.leadingReasons.map((id) => resolve(model, output, id)), output.matches[0].reasons);
  assert.deepEqual(model.requirementChecks.map((id) => resolve(model, output, id)),
    output.matches[0].passedFilters.filter((code) => !["availability", "market", "complete-data"].includes(code)));
  assert.ok(output.matches[0].reasons.some(({ kind }) => kind === "verified-fact"));
  for (const id of [...model.leadingReasons, ...model.requirementChecks]) {
    assert.equal(byId(model, id).kind, "northstar-assessment");
  }
});

test("verified facts contain catalogue references with exact or parent-field provenance, not copied claims", () => {
  const { model } = build(insightAnswers("development"));
  for (const evidence of facts(model)) {
    assert.deepEqual(Object.keys(evidence).sort(), ["id", "kind", "path", "productId", "sourceIndexes"]);
    const product = productCatalogue.products.find(({ id }) => id === evidence.productId);
    assert.notEqual(read(product, evidence.path), null);
    assert.notEqual(read(product, evidence.path), undefined);
    assert.ok(evidence.sourceIndexes.length);
    for (const index of evidence.sourceIndexes) {
      assert.ok(product.sources[index].supportsFields.some((path) =>
        path === evidence.path || evidence.path.startsWith(`${path}.`)));
    }
  }
  assert.deepEqual(facts(model).find(({ path }) => path === "facts.chip.id").sourceIndexes, [1, 2]);
});

test("missing or lookalike provenance omits contextual facts without inventing support or a new ranking cause", () => {
  const catalogue = structuredClone(productCatalogue);
  const baseline = build(insightAnswers("development"));
  const product = catalogue.products.find(({ id }) => id === baseline.model.leadingMatch.productId);
  for (const source of product.sources) {
    source.supportsFields = source.supportsFields.map((path) => path === "facts.weightKg" ? "facts.weight" : path);
  }
  const { model } = build(insightAnswers("development"), catalogue);
  assert.equal(facts(model).some(({ productId, path }) => productId === product.id && path === "facts.weightKg"), false);
  assert.equal(model.runnerUpComparison.factPairs.some(({ path }) => path === "facts.weightKg"), false);
  assert.deepEqual(model.runnerUpComparison.decidingFactor, baseline.model.runnerUpComparison.decidingFactor);
});

test("fact pairs remain contextual and ordered even when the leader is heavier or more expensive", () => {
  const { output, model } = build(insightAnswers("creative"));
  const comparison = model.runnerUpComparison;
  assert.deepEqual(comparison.decidingFactor, { code: "ranking-score", difference: 5.66 });
  assert.deepEqual(comparison.leaderAdvantage, { component: "portabilityWeight", difference: 18.75 });
  assert.deepEqual(comparison.factPairs.map(({ path }) => path),
    ["price.amountMinor", "facts.weightKg", "facts.unifiedMemoryGb", "facts.storageGb"]);
  const leading = productCatalogue.products.find(({ id }) => id === output.matches[0].productId);
  const runner = productCatalogue.products.find(({ id }) => id === output.matches[1].productId);
  assert.ok(leading.facts.weightKg > runner.facts.weightKg);
  assert.ok(leading.price.amountMinor > runner.price.amountMinor);
  for (const pair of comparison.factPairs) {
    assert.deepEqual(Object.keys(pair).sort(), ["leadingFactId", "path", "runnerUpFactId"]);
    assert.equal(byId(model, pair.leadingFactId).kind, "verified-fact");
    assert.equal(byId(model, pair.runnerUpFactId).kind, "verified-fact");
  }
  assert.deepEqual(byId(model, comparison.evidenceId).inputRefs.map((id) => byId(model, id).kind),
    ["northstar-assessment", "northstar-assessment"]);
});

test("exact results preserve both the absence of compromises and an existing minor compromise", () => {
  assert.deepEqual(build().model.mainCompromise, { status: "none-identified", evidenceId: null });
  const { output, model } = build(insightAnswers("development"));
  assert.equal(model.leadingMatch.matchType, "exact");
  assert.equal(model.mainCompromise.status, "identified");
  assert.deepEqual(resolve(model, output, model.mainCompromise.evidenceId), output.matches[0].compromises[0]);
  assert.equal(output.matches[0].compromises[0].severity, "minor");
});

test("closest and stretch results keep the first engine compromise without reselection", () => {
  const answers = flexibleAnswers();
  answers.budget.mode = "stretch";
  for (const [scenario, type] of [[insightAnswers("portability-compromise"), "closest"], [answers, "stretch"]]) {
    const { output, model } = build(scenario);
    assert.equal(model.leadingMatch.matchType, type);
    assert.deepEqual(resolve(model, output, model.mainCompromise.evidenceId), group(output)[0].compromises[0]);
    assert.equal(resolve(model, output, model.mainCompromise.evidenceId).severity, "major");
  }
});

test("omitted components retain their unapplied engine assessment and do not create needs or strong reasons", () => {
  const { output, model } = build(insightAnswers("uncertain"));
  for (const key of ["screenSize", "portabilityWeight", "externalDisplays"]) {
    const item = model.evidence.find(({ path }) => path === `matches.0.score.components.${key}`);
    assert.equal(read(output, item.path).applied, false);
    assert.equal(read(output, item.path).value, null);
    assert.equal(model.leadingReasons.some((id) => resolve(model, output, id).code === `strong-${key}`), false);
  }
  assert.deepEqual(needs(model).map(({ path }) => path), ["workload.capabilityBand", "workload.memoryGb"]);
});

test("runner-up is the second primary match even when a stretch alternative has higher fit", () => {
  const { output, model } = build(flexibleAnswers());
  assert.ok(output.stretchMatches[0].score.basisPoints > output.matches[0].score.basisPoints);
  assert.equal(model.leadingMatch.resultGroup, "primary");
  assert.equal(model.runnerUpComparison.runnerUp.productId, output.matches[1].productId);
  assert.equal(model.runnerUpComparison.runnerUp.resultGroup, "primary");
  const comparisonEvidence = byId(model, model.runnerUpComparison.evidenceId);
  assert.equal(comparisonEvidence.kind, "northstar-assessment");
  assert.equal(comparisonEvidence.path, "matches.1.rankingExplanation.decidingFactor");
  assert.strictEqual(resolve(model, output, model.runnerUpComparison.evidenceId),
    output.matches[1].rankingExplanation.decidingFactor);
  assert.equal(facts(model).some(({ productId }) => productId === output.stretchMatches[0].productId), false);
});

test("a lone primary match has no runner-up even when stretch alternatives exist", () => {
  const { output, model } = build(flexibleAnswers("512gb"));
  assert.equal(output.matches.length, 1);
  assert.ok(output.stretchMatches.length > 1);
  assert.equal(model.runnerUpComparison, null);
  assert.ok(facts(model).every(({ productId }) => productId === output.matches[0].productId));
  assert.equal(build(insightAnswers("hard-workload")).model.runnerUpComparison, null);
});

test("stretch-only results retain stretch ranks and compare only the second stretch candidate", () => {
  const { output, model } = build(flexibleAnswers("1tb"));
  assert.deepEqual(output.matches, []);
  assert.deepEqual(model.leadingMatch, { productId: output.stretchMatches[0].productId,
    resultGroup: "stretch-alternative", rank: 1, matchType: "stretch" });
  assert.deepEqual(model.runnerUpComparison.runnerUp, { productId: output.stretchMatches[1].productId,
    resultGroup: "stretch-alternative", rank: 2, matchType: "stretch" });
  assert.ok(byId(model, model.leadingReasons[0]).path.startsWith("stretchMatches.0."));
  const comparisonEvidence = byId(model, model.runnerUpComparison.evidenceId);
  assert.equal(comparisonEvidence.kind, "northstar-assessment");
  assert.equal(comparisonEvidence.path, "stretchMatches.1.rankingExplanation.decidingFactor");
  assert.strictEqual(resolve(model, output, model.runnerUpComparison.evidenceId),
    output.stretchMatches[1].rankingExplanation.decidingFactor);
});

test("close ranking and component advantages use existing annotations, even with high confidence", () => {
  const { output, model } = build(insightAnswers("close-ranking"));
  assert.equal(model.confidence.label, "high");
  assert.equal(model.runnerUpComparison.closeRanking, true);
  assert.equal(model.runnerUpComparison.fitGapBasisPoints, 353);
  assert.deepEqual(model.runnerUpComparison.leaderAdvantage, { component: "screenSize", difference: 60 });
  assert.deepEqual(model.runnerUpComparison.runnerUpAdvantage, { component: "portabilityWeight", difference: 20 });
  assert.deepEqual(model.confidence, { label: output.confidence.label, points: output.confidence.points,
    detailCoverage: output.confidence.detailCoverage, reasonCodes: output.confidence.reasons.map(({ code }) => code) });
});

test("budget-adjusted ordering preserves a negative raw-fit gap without attributing a higher fit to the leader", () => {
  const answers = insightAnswers("everyday");
  answers.budget.mode = "stretch";
  answers.budget.absoluteMaximum = "up-to-4500";
  answers.devicePreferences = { portabilityPerformance: "lean-performance", screenSize: "16-inch" };
  const { model } = build(answers);
  assert.deepEqual(model.runnerUpComparison.decidingFactor, { code: "stretch-budget-adjustment", adjustment: 5 });
  assert.equal(model.runnerUpComparison.fitGapBasisPoints, -272);
  assert.equal(model.runnerUpComparison.rankingGapBasisPoints, 228);
});

test("equal-fit comparisons retain compromise and price tie annotations without an invented performance lead", () => {
  for (const [id, factor] of [["everyday", "tie-compromises"], ["uncertain", "tie-price"]]) {
    const comparison = build(insightAnswers(id)).model.runnerUpComparison;
    assert.equal(comparison.decidingFactor.code, factor);
    assert.equal(comparison.fitGapBasisPoints, 0);
    assert.equal(comparison.leaderAdvantage, null);
    assert.equal(comparison.runnerUpAdvantage, null);
  }
});

test("a complete tie preserves the engine's stable product-ID decision", () => {
  // Synthetic duplicate configurations exercise a tie; these are not catalogue additions.
  const original = productCatalogue.products.find(({ id }) => id === build().model.leadingMatch.productId);
  const catalogue = structuredClone(productCatalogue);
  catalogue.products = ["insight-tie-b", "insight-tie-a"].map((id) => ({ ...structuredClone(original), id }));
  const { model } = build(insightAnswers("everyday"), catalogue);
  assert.equal(model.leadingMatch.productId, "insight-tie-a");
  assert.deepEqual(model.runnerUpComparison.decidingFactor, { code: "tie-product-id" });
  assert.deepEqual(model.runnerUpComparison.factPairs, []);
  assert.deepEqual(byId(model, model.runnerUpComparison.evidenceId).inputRefs, []);
});

test("remaining supported tie annotations are projected without recalculating or reinterpreting them", () => {
  // Contract fixtures for rare engine annotations, not alternative ranking logic.
  for (const code of ["total-score", "tie-workload", "tie-primaryUses", "tie-multitaskingMemory",
    "tie-portabilityWeight", "tie-screenSize", "tie-externalDisplays"]) {
    const output = structuredClone(build().output);
    output.matches[1].rankingExplanation.decidingFactor = { code, difference: 2.5, message: "Engine wording" };
    const model = buildRecommendationInsights({ output, catalogue: productCatalogue });
    assert.deepEqual(model.runnerUpComparison.decidingFactor, { code, difference: 2.5 });
    assert.equal(byId(model, model.runnerUpComparison.evidenceId).inputRefs.length, 2);
  }
});

test("refinements identify reduced-specificity answers in definition order with existing edit destinations only", () => {
  const { model } = build(insightAnswers("uncertain"));
  assert.deepEqual(model.refinementOpportunities.map(({ code, questionId }) => [code, questionId]), [
    ["no-budget-target", "budget"], ["unspecified-activities", "activities"],
    ["uncertain-multitasking", "multitasking"], ["delegated-device-balance", "devicePreferences"],
    ["no-screen-preference", "devicePreferences"], ["unsure-storage", "minimumStorage"],
  ]);
  for (const opportunity of model.refinementOpportunities) {
    assert.deepEqual(Object.keys(opportunity).sort(), ["answerEvidenceId", "code", "questionId"]);
    const answer = byId(model, opportunity.answerEvidenceId);
    assert.equal(answer.kind, "user-answer");
    assert.ok(QUESTION_DEFINITIONS.find(({ id }) => id === opportunity.questionId)
      .controls.some(({ id }) => id === answer.controlId));
  }
  assert.equal(byId(model, "need:workload.memoryGb").signals.some(({ source }) => source === "activities.unsure"), false);
});

test("refinements are not promises or confidence gates, and optional omissions are not uncertainty", () => {
  const answers = insightAnswers("development");
  answers.minimumStorage = "unsure";
  const { model } = build(answers);
  assert.equal(model.confidence.label, "high");
  assert.deepEqual(model.refinementOpportunities.map(({ code }) => code), ["unsure-storage"]);
  const flexible = flexibleAnswers();
  flexible.budget.absoluteMaximum = null;
  assert.deepEqual(build(flexible).model.refinementOpportunities, []);
  assert.deepEqual(build().model.refinementOpportunities, []);
});

for (const status of ["budget-limited", "no-match", "invalid-input", "invalid-catalog"]) {
  test(`${status} yields an empty terminal insight without reading catalogue data or fabricating confidence`, () => {
    const answers = status === "no-match" ? cloneAnswers(noMatchAnswers) : insightAnswers("everyday");
    if (status === "budget-limited") { answers.budget.target = "up-to-1000"; answers.minimumStorage = "2tb-plus"; }
    if (status === "invalid-input") answers.primaryUses = [];
    const catalogue = structuredClone(productCatalogue);
    if (status === "invalid-catalog") catalogue.products[0].price.amountMinor = -1;
    const output = recommendMacBooks({ answers, catalogue });
    assert.equal(output.status, status);
    const unreadableCatalogue = { get products() { throw new Error("Must not access terminal catalogue"); } };
    const model = buildRecommendationInsights({ output, catalogue: unreadableCatalogue });
    assert.deepEqual(model, { status, leadingMatch: null, evidence: [], leadingReasons: [], requirementChecks: [],
      mainCompromise: { status: "not-applicable", evidenceId: null }, runnerUpComparison: null,
      confidence: null, refinementOpportunities: [] });
    assertDeepFrozen(model);
    assert.deepEqual(buildRecommendationInsights({ output }), model);
  });
}

test("hidden essential details are rejected upstream and do not leak into insight evidence", () => {
  const answers = insightAnswers("everyday");
  answers.essentialDetails.externalDisplayCount = "four-plus";
  const output = recommendMacBooks({ answers, catalogue: productCatalogue });
  assert.equal(output.status, "invalid-input");
  assert.deepEqual(buildRecommendationInsights({ output }).evidence, []);
});

test("inconsistent or unsupported successful contracts fail explicitly instead of inventing insight", () => {
  assert.throws(() => buildRecommendationInsights(), TypeError);
  assert.throws(() => buildRecommendationInsights({ output: { status: "future-status" } }), TypeError);
  const original = build().output;
  assert.throws(() => buildRecommendationInsights({ output: original }), /catalogue is required/);
  for (const change of [
    (output) => { output.matches = []; output.stretchMatches = []; },
    (output) => { output.matches[0].rank = 2; },
    (output) => { output.matches[0].productId = "unknown"; },
    (output) => { output.matches[1].rankingExplanation.comparedWithProductId = "another-group"; },
    (output) => { output.matches[1].rankingExplanation.decidingFactor.code = "invented"; },
    (output) => { output.matches[0].reasons[0].code = "invented"; },
    (output) => { output.confidence = null; },
  ]) {
    const output = structuredClone(original);
    change(output);
    assert.throws(() => buildRecommendationInsights({ output, catalogue: productCatalogue }), TypeError);
  }
  for (const change of [
    (catalogue) => { catalogue.verifiedOn = "2000-01-01"; },
    (catalogue) => { catalogue.products.find(({ id }) => id === original.matches[0].productId).price.amountMinor += 1; },
  ]) {
    const catalogue = structuredClone(productCatalogue);
    change(catalogue);
    assert.throws(() => buildRecommendationInsights({ output: original, catalogue }), /mismatch/);
  }
});
