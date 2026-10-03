import test from "node:test";
import assert from "node:assert/strict";
import { productCatalogue } from "../js/products.js";
import { recommendMacBooks } from "../js/recommendation-engine.js";
import { buildRecommendationInsights } from "../js/recommendation-insights.js";
import { buildRecommendationInsightPresentation } from "../js/recommendation-insight-presentation.js";
import { insightAnswers, insightScenarios } from "./fixtures/recommendation-insight-scenarios.js";

function build(answers = insightAnswers("everyday"), catalogue = productCatalogue) {
  const output = recommendMacBooks({ catalogue, answers });
  const insights = buildRecommendationInsights({ output, catalogue });
  return { output, insights, catalogue,
    model: buildRecommendationInsightPresentation({ insights, output, catalogue }) };
}
function flexible(storage = "256gb") {
  const answers = insightAnswers("everyday");
  answers.budget = { target: "up-to-1000", mode: "flexible", absoluteMaximum: "up-to-4500" };
  answers.minimumStorage = storage;
  return answers;
}
function frozen(value) {
  if (!value || typeof value !== "object") return;
  assert.ok(Object.isFrozen(value));
  Object.values(value).forEach(frozen);
}

test("presentation is deterministic with canonical evidence order despite object and catalogue insertion order", () => {
  const { output, insights, model } = build();
  const catalogue = { ...productCatalogue, products: [...productCatalogue.products].reverse() };
  const reordered = Object.fromEntries(Object.entries(insights).reverse());
  assert.deepEqual(buildRecommendationInsightPresentation({ insights: reordered, output, catalogue }), model);
  assert.deepEqual(model.details.evidence.map(({ evidenceId }) => evidenceId),
    insights.evidence.filter(({ id }) => model.details.evidence.some((row) => row.evidenceId === id)).map(({ id }) => id));
});

test("presentation is deeply immutable, detached and does not mutate or freeze its input pair", () => {
  const original = build();
  const input = structuredClone({ insights: original.insights, output: original.output, catalogue: original.catalogue });
  const snapshot = structuredClone(input);
  const model = buildRecommendationInsightPresentation(input);
  frozen(model);
  assert.deepEqual(input, snapshot);
  assert.equal(Object.isFrozen(input.output), false);
  assert.throws(() => model.reasons.push({}), TypeError);
  input.output.matches[0].reasons[0].message = "Changed input";
  input.catalogue.products[0].displayName = "Changed product";
  assert.deepEqual(model, original.model);
});

test("exact no-compromise leader shows the first two existing reasons and preserves the remaining reason", () => {
  const { model, output } = build();
  assert.equal(model.leadingMatch.matchType, "exact");
  assert.deepEqual(model.reasons.map(({ message }) => message), output.matches[0].reasons.slice(0, 2).map(({ message }) => message));
  assert.deepEqual(model.details.remainingReasons.map(({ message }) => message), output.matches[0].reasons.slice(2).map(({ message }) => message));
  assert.equal(model.consideration.status, "none-identified");
  assert.equal(model.consideration.evidenceId, null);
  assert.match(model.consideration.message, /Northstar identified no significant compromise/);
});

test("exact minor compromises remain considerations without changing the classification", () => {
  const { model, output } = build(insightAnswers("development"));
  assert.equal(model.leadingMatch.matchType, "exact");
  assert.equal(output.matches[0].compromises[0].severity, "minor");
  assert.equal(model.consideration.message, output.matches[0].compromises[0].message);
  assert.deepEqual(model.details.remainingConsiderations.map(({ message }) => message), output.matches[0].compromises.slice(1).map(({ message }) => message));
});

test("closest leader retains its major compromise and all further considerations", () => {
  const { model, output } = build(insightAnswers("portability-compromise"));
  assert.equal(model.leadingMatch.matchType, "closest");
  assert.equal(output.matches[0].compromises[0].severity, "major");
  assert.equal(model.consideration.message, output.matches[0].compromises[0].message);
  assert.equal(model.details.remainingConsiderations.length, output.matches[0].compromises.length - 1);
});

test("stretch leader distinguishes preferred target from absolute permitted maximum", () => {
  const answers = flexible();
  answers.budget.mode = "stretch";
  const { model } = build(answers);
  assert.equal(model.leadingMatch.matchType, "stretch");
  assert.match(model.consideration.message, /above your preferred budget target/);
  const needs = model.details.evidence.filter(({ kind }) => kind === "derived-need");
  assert.ok(needs.some(({ text }) => text.includes("£1,000.00 preferred budget target")));
  assert.ok(needs.some(({ text }) => text.includes("£4,500.00 maximum permitted budget")));
});

for (const [name, answers, group, root] of [
  ["primary", flexible(), "primary", "matches"],
  ["stretch-alternative", flexible("1tb"), "stretch-alternative", "stretchMatches"],
]) {
  test(`${name} comparison resolves the exact same-group deciding-factor annotation`, () => {
    const { model, output, insights } = build(answers);
    assert.equal(model.leadingMatch.resultGroup, group);
    assert.equal(model.runnerUp.evidenceId, insights.runnerUpComparison.evidenceId);
    assert.equal(insights.evidence.find(({ id }) => id === model.runnerUp.evidenceId).path,
      `${root}.1.rankingExplanation.decidingFactor`);
    assert.equal(model.runnerUp.message, output[root][1].rankingExplanation.decidingFactor.message);
  });
}

test("one primary candidate never uses a separate stretch alternative as runner-up", () => {
  const { model, output } = build(flexible("512gb"));
  assert.equal(output.matches.length, 1);
  assert.ok(output.stretchMatches.length > 1);
  assert.equal(model.runnerUp, null);
});

test("single eligible workload result has no comparison", () => {
  assert.equal(build(insightAnswers("hard-workload")).model.runnerUp, null);
});

test("close-ranking qualification comes from existing annotation and coexists with high confidence", () => {
  const { model, output } = build(insightAnswers("close-ranking"));
  assert.equal(model.confidenceQualifier, null);
  assert.equal(model.runnerUp.closeRankingMessage, output.confidence.reasons.find(({ code }) => code === "close-ranking").message);
});

test("complete stable-ID tie does not imply a substantively better leading product", () => {
  const leader = build().model.leadingMatch.productId;
  const product = productCatalogue.products.find(({ id }) => id === leader);
  const catalogue = structuredClone(productCatalogue);
  catalogue.products = ["presentation-tie-b", "presentation-tie-a"].map((id) => ({ ...structuredClone(product), id }));
  const { model } = build(insightAnswers("everyday"), catalogue);
  assert.match(model.runnerUp.message, /remain tied/);
  assert.match(model.runnerUp.message, /does not indicate a stronger fit/);
});

test("moderate confidence is qualified without points, thresholds or predictions", () => {
  const { model } = build(insightAnswers("uncertain"));
  assert.match(model.confidenceQualifier, /Northstar confidence: Moderate/);
  assert.doesNotMatch(model.confidenceQualifier, /57|55|improv|change/i);
});

test("low confidence uses the supplied label without recalculating it", () => {
  // A presentation-contract fixture, not an alternative confidence calculation.
  const { output, insights, catalogue } = build();
  const changed = structuredClone(insights);
  changed.confidence.label = "low";
  const model = buildRecommendationInsightPresentation({ insights: changed, output, catalogue });
  assert.match(model.confidenceQualifier, /Northstar confidence: Low/);
});

test("all workload contributors survive including both signals attaining the memory target", () => {
  const answers = insightAnswers("development");
  answers.budget = { target: "up-to-1500", mode: "strict", absoluteMaximum: null };
  answers.minimumStorage = "256gb";
  const { model } = build(answers);
  const memory = model.details.evidence.find(({ evidenceId }) => evidenceId === "need:workload.memoryGb");
  assert.ok(memory);
  assert.equal(memory.signals.length, 4);
  assert.deepEqual(memory.signals.filter(({ attainsTarget }) => attainsTarget).map(({ answer }) => answer),
    ["Docker or containers", "Heavy — demanding apps, development tools or one virtual machine"]);
  assert.equal(memory.text, "24 GB memory target (preference).");
  assert.doesNotMatch(JSON.stringify(model), /Docker requires|caused this|will improve/);
});

test("missing optional contextual fact is omitted without fabricating evidence", () => {
  const catalogue = structuredClone(productCatalogue);
  catalogue.products.forEach((product) => product.sources.forEach((source) => {
    source.supportsFields = source.supportsFields.filter((path) => path !== "facts.weightKg");
  }));
  const { model } = build(insightAnswers("portability-compromise"), catalogue);
  assert.equal(model.details.evidence.some(({ evidenceId }) => evidenceId.endsWith("facts.weightKg")), false);
  assert.match(model.consideration.message, /portability/);
});

test("supported fact sources retain recorded dates and descriptive link labels", () => {
  const { model } = build();
  const price = model.details.evidence.find(({ evidenceId }) => evidenceId.endsWith("price.amountMinor"));
  assert.match(price.text, /31 July 2026 price snapshot/);
  assert.ok(price.sources.length > 0);
  for (const source of price.sources) {
    assert.equal(source.recordedDate, "31 July 2026");
    assert.match(source.url, /^https:\/\/.*apple.com/);
    assert.match(source.label, /Apple buying source for MacBook/);
    assert.doesNotMatch(source.label, /https:|fresh|today/);
  }
});

test("compound budget reason is a Northstar assessment while price remains a verified fact", () => {
  const { model } = build();
  assert.equal(model.reasons[0].label, "Northstar assessment");
  assert.equal(model.details.evidence.find(({ evidenceId }) => evidenceId.endsWith("price.amountMinor")).label, "Verified Apple fact");
  assert.ok(model.details.evidence.some(({ label }) => label === "Your answer"));
  assert.ok(model.details.evidence.some(({ label }) => label === "Northstar-derived need"));
});

test("comparison facts, advantages, gaps and refinement opportunities are not presentation fields", () => {
  const { model } = build(insightAnswers("creative"));
  assert.doesNotMatch(JSON.stringify(model), /factPairs|Advantage|GapBasisPoints|refinementOpportunities|fit-score|ranking-score/);
});

test("only evidence connected to retained reasons and considerations is exposed", () => {
  const { model } = build();
  assert.equal(model.details.evidence.some(({ evidenceId }) => evidenceId.includes("minimumStorage")), false);
  assert.equal(model.details.evidence.some(({ evidenceId }) => evidenceId.includes("screenSize")), false);
});

for (const status of ["budget-limited", "no-match", "invalid-input", "invalid-catalog"]) {
  test(`${status} has no presentation or catalogue access`, () => {
    assert.equal(buildRecommendationInsightPresentation({
      insights: { status }, output: { status },
      get catalogue() { throw new Error("Catalogue should not be accessed"); },
    }), null);
  });
}

test("mismatched evidence fails explicitly for the orchestration fallback to contain", () => {
  const { output, insights, catalogue } = build();
  const changed = structuredClone(insights);
  changed.runnerUpComparison.evidenceId = changed.leadingReasons[0];
  assert.throws(() => buildRecommendationInsightPresentation({ insights: changed, output, catalogue }),
    /runner-up deciding-factor reference mismatch/);
});

test("presentation preserves the complete engine output for all eight regression scenarios", () => {
  for (const scenario of insightScenarios) {
    const { output, insights, catalogue } = build(scenario.answers);
    const snapshot = structuredClone(output);
    buildRecommendationInsightPresentation({ insights, output, catalogue });
    assert.deepEqual(output, snapshot);
    assert.deepEqual(recommendMacBooks({ catalogue, answers: scenario.answers }), snapshot);
  }
});
