import test from "node:test";
import assert from "node:assert/strict";

import { productCatalogue } from "../js/products.js";
import { recommendMacBooks, validateRecommendationAnswers } from "../js/recommendation-engine.js";
import {
  cloneAnswers,
  demandingCodingAnswers,
  everydayPortableAnswers,
  noMatchAnswers,
} from "./fixtures/questionnaire-scenarios.js";

const cloneCatalogue = () => structuredClone(productCatalogue);
const catalogueWith = (products) => ({ ...cloneCatalogue(), products });
const cloneProduct = (index = 0) => structuredClone(productCatalogue.products[index]);

function preferenceScenario() {
  const answers = cloneAnswers(everydayPortableAnswers);
  answers.budget.target = "no-fixed-target";
  answers.budget.mode = null;
  answers.minimumStorage = "unsure";
  answers.devicePreferences.screenSize = "no-preference";
  answers.essentialRequirements = ["none"];
  return answers;
}

test("an exact strict-budget boundary is eligible and one penny over is excluded", () => {
  const boundary = cloneProduct();
  boundary.id = "boundary-product";
  boundary.price.amountMinor = 150000;
  const over = cloneProduct();
  over.id = "over-product";
  over.price.amountMinor = 150001;
  const output = recommendMacBooks({
    catalogue: catalogueWith([boundary, over]),
    answers: cloneAnswers(everydayPortableAnswers),
  });
  assert.equal(output.status, "ok");
  assert.deepEqual(output.matches.map(({ productId }) => productId), ["boundary-product"]);
  assert.ok(output.exclusions[0].failedFilters.some(({ code }) => code === "budget"));
});

test("a strict-budget-only failure is distinguished from a genuine no-match", () => {
  const over = cloneProduct(2);
  over.id = "compatible-over-budget";
  over.price.amountMinor = 150001;
  const output = recommendMacBooks({
    catalogue: catalogueWith([over]),
    answers: cloneAnswers(everydayPortableAnswers),
  });
  assert.equal(output.status, "budget-limited");
  assert.equal(output.confidence.label, "not-applicable");
  assert.equal(output.confidence.points, null);
  assert.equal(output.budgetLimitedAlternatives[0].amountOverLimitMinor, 1);
});

test("conflicting explicit essentials produce a genuine no-match with blockers", () => {
  const output = recommendMacBooks({ catalogue: productCatalogue, answers: cloneAnswers(noMatchAnswers) });
  assert.equal(output.status, "no-match");
  assert.deepEqual(output.matches, []);
  assert.ok(output.diagnostics.blockerCounts.budget > 0);
  assert.ok(output.diagnostics.blockerCounts["workload-memory"] > 0);
  assert.ok(output.diagnostics.blockerCounts["screen-size"] > 0);
  assert.equal(output.confidence.label, "not-applicable");
});

test("activity-derived workload filters only when explicitly essential", () => {
  const answers = preferenceScenario();
  answers.primaryUses = ["cybersecurity-vms"];
  answers.activities = ["two-virtual-machines"];
  answers.multitasking = "heavy";
  let output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.equal(output.status, "ok");
  assert.equal(output.diagnostics.appliedFilterCodes.includes("workload-memory"), false);

  answers.essentialRequirements = ["workload"];
  output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.ok(output.diagnostics.appliedFilterCodes.includes("workload-memory"));
  output.matches.forEach((match) => {
    const product = productCatalogue.products.find(({ id }) => id === match.productId);
    assert.ok(product.facts.unifiedMemoryGb >= 24);
  });
});

test("screen and weight remain soft until explicitly selected as essential", () => {
  const answers = preferenceScenario();
  answers.devicePreferences.portabilityPerformance = "portability-first";
  answers.devicePreferences.screenSize = "16-inch";
  let output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.equal(output.diagnostics.counts.eligible, productCatalogue.products.length);

  answers.essentialRequirements = ["exact-screen", "maximum-weight"];
  answers.essentialDetails.maximumWeight = "up-to-1.25kg";
  output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.equal(output.status, "no-match");
  assert.ok(output.diagnostics.blockerCounts.weight > 0);
  assert.ok(output.diagnostics.blockerCounts["screen-size"] > 0);
});

test("Let Northstar decide omits the portability dimension without filtering products", () => {
  const answers = preferenceScenario();
  answers.devicePreferences.portabilityPerformance = "let-northstar-decide";
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });

  assert.equal(output.status, "ok");
  assert.equal(output.diagnostics.counts.eligible, productCatalogue.products.length);
  assert.equal(output.profile.hardRequirements.weightMaximumKg, null);
  output.matches.forEach((match) => {
    assert.equal(match.score.components.portabilityWeight.applied, false);
    assert.equal(match.score.components.portabilityWeight.appliedWeight, 0);
  });
});

test("external displays filter only after an explicit essential selection", () => {
  const answers = preferenceScenario();
  let output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.equal(output.diagnostics.appliedFilterCodes.includes("external-displays"), false);

  answers.essentialRequirements = ["external-displays"];
  answers.essentialDetails.externalDisplayCount = "four-plus";
  output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.ok(output.diagnostics.appliedFilterCodes.includes("external-displays"));
  output.matches.forEach((match) => {
    const product = productCatalogue.products.find(({ id }) => id === match.productId);
    assert.ok(product.facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive >= 4);
  });
});

test("flexible budgets keep over-target products in a separate stretch group", () => {
  const answers = cloneAnswers(everydayPortableAnswers);
  answers.budget.mode = "flexible";
  answers.budget.absoluteMaximum = "up-to-2000";
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.equal(output.status, "ok");
  assert.ok(output.matches.every(({ budgetRelation }) => budgetRelation === "within-target"));
  assert.ok(output.stretchMatches.length > 0);
  assert.ok(output.stretchMatches.every(({ matchType }) => matchType === "stretch"));
});

test("stretch budgets allow over-target products into the primary ranked list", () => {
  const answers = cloneAnswers(everydayPortableAnswers);
  answers.budget.mode = "stretch";
  answers.budget.absoluteMaximum = "up-to-2000";
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.equal(output.status, "ok");
  assert.deepEqual(output.stretchMatches, []);
  assert.ok(output.matches.some(({ matchType }) => matchType === "stretch"));
});

test("the five-point stretch adjustment remains deterministic", () => {
  const withinTarget = cloneProduct(2);
  withinTarget.id = "within-target";
  withinTarget.price.amountMinor = 140000;
  const overTarget = structuredClone(withinTarget);
  overTarget.id = "over-target";
  overTarget.price.amountMinor = 160000;
  const answers = cloneAnswers(everydayPortableAnswers);
  answers.budget.mode = "stretch";
  answers.budget.absoluteMaximum = "up-to-2000";
  const output = recommendMacBooks({ catalogue: catalogueWith([overTarget, withinTarget]), answers });
  assert.deepEqual(output.matches.map(({ productId }) => productId), ["within-target", "over-target"]);
  assert.equal(output.matches[1].rankingAdjustmentBasisPoints, -500);
});

test("hidden stale essential details stop recommendation safely", () => {
  const answers = cloneAnswers(everydayPortableAnswers);
  answers.essentialDetails.maximumWeight = "up-to-1.55kg";
  const validation = validateRecommendationAnswers(answers);
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes("Hidden answer retained for maximumWeight."));
  assert.equal(output.status, "invalid-input");
});

test("recommendations are deterministic, frozen and do not mutate inputs", () => {
  const answers = cloneAnswers(demandingCodingAnswers);
  const beforeAnswers = structuredClone(answers);
  const beforeCatalogue = structuredClone(productCatalogue);
  const first = recommendMacBooks({ catalogue: productCatalogue, answers });
  const second = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.deepEqual(first, second);
  assert.deepEqual(answers, beforeAnswers);
  assert.deepEqual(productCatalogue, beforeCatalogue);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.profile.hardRequirements));
});

test("structured results expose v2.1 rules, classifications and ranked confidence", () => {
  const output = recommendMacBooks({
    catalogue: productCatalogue,
    answers: cloneAnswers(demandingCodingAnswers),
  });
  const match = output.matches[0];
  assert.equal(output.status, "ok");
  assert.equal(output.catalogue.rulesVersion, "2.1.0");
  assert.ok(["exact", "closest", "stretch"].includes(match.matchType));
  assert.equal(typeof match.score.basisPoints, "number");
  assert.ok(match.reasons.length > 0);
  assert.ok(Array.isArray(match.compromises));
  assert.ok(["high", "moderate", "low"].includes(output.confidence.label));
});

test("legacy unsupported fields cannot affect ranking or confidence", () => {
  const baseline = recommendMacBooks({
    catalogue: productCatalogue,
    answers: cloneAnswers(everydayPortableAnswers),
  });
  const legacy = cloneAnswers(everydayPortableAnswers);
  legacy.mobility = { batteryImportance: "long-travel-day" };
  legacy.connections = { needs: ["hdmi-without-adapter"], importance: "must-have" };
  const output = recommendMacBooks({ catalogue: productCatalogue, answers: legacy });
  assert.deepEqual(output.matches, baseline.matches);
  assert.deepEqual(output.confidence, baseline.confidence);
  assert.equal(Object.hasOwn(output, "unassessedAnswers"), false);
});

test("diagnostics list only hard filters actually applied", () => {
  const output = recommendMacBooks({ catalogue: productCatalogue, answers: preferenceScenario() });
  assert.deepEqual(output.diagnostics.appliedFilterCodes, ["availability", "market", "complete-data"]);
  assert.deepEqual(output.matches[0].passedFilters, output.diagnostics.appliedFilterCodes);
});

test("a structurally invalid catalogue still invalidates the whole calculation", () => {
  const invalid = cloneProduct();
  delete invalid.facts.storageGb;
  const output = recommendMacBooks({
    catalogue: catalogueWith([invalid]),
    answers: cloneAnswers(everydayPortableAnswers),
  });
  assert.equal(output.status, "invalid-catalog");
  assert.deepEqual(output.matches, []);
  assert.ok(output.diagnostics.validationErrors.some((error) => error.includes("storageGb is required")));
});
