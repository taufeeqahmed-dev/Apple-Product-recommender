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

function cloneCatalogue() {
  return structuredClone(productCatalogue);
}

function catalogueWith(products) {
  const catalogue = cloneCatalogue();
  catalogue.products = products;
  return catalogue;
}

function cloneProduct(index = 0) {
  return structuredClone(productCatalogue.products[index]);
}

function preferenceScenario() {
  const answers = cloneAnswers(everydayPortableAnswers);
  answers.budget.target = "no-fixed-target";
  answers.budget.mode = null;
  answers.minimumStorage = "unsure";
  answers.externalDisplays.count = "none";
  answers.externalDisplays.requirementMode = null;
  answers.screen.size = "no-preference";
  answers.screen.requirementMode = null;
  answers.ownership.period = "unsure";
  answers.ownership.requirementMode = null;
  return answers;
}

test("an exact strict-budget boundary is eligible and one penny over is excluded", () => {
  const boundary = cloneProduct();
  boundary.id = "boundary-product";
  boundary.price.amountMinor = 150000;
  const over = cloneProduct();
  over.id = "over-product";
  over.price.amountMinor = 150001;
  const answers = cloneAnswers(everydayPortableAnswers);

  const output = recommendMacBooks({ catalogue: catalogueWith([boundary, over]), answers });
  assert.equal(output.status, "ok");
  assert.deepEqual(output.matches.map(({ productId }) => productId), ["boundary-product"]);
  assert.ok(output.exclusions[0].failedFilters.some(({ code }) => code === "budget"));
});

test("a strict-budget-only failure is distinguished from a genuine no-match", () => {
  const over = cloneProduct(2);
  over.id = "compatible-over-budget";
  over.price.amountMinor = 150001;
  const answers = cloneAnswers(everydayPortableAnswers);

  const output = recommendMacBooks({ catalogue: catalogueWith([over]), answers });
  assert.equal(output.status, "budget-limited");
  assert.deepEqual(output.matches, []);
  assert.deepEqual(output.budgetLimitedAlternatives, [
    {
      productId: "compatible-over-budget",
      priceMinor: 150001,
      amountOverLimitMinor: 1,
    },
  ]);
});

test("conflicting mandatory requirements produce a genuine no-match with blockers", () => {
  const output = recommendMacBooks({
    catalogue: productCatalogue,
    answers: cloneAnswers(noMatchAnswers),
  });

  assert.equal(output.status, "no-match");
  assert.deepEqual(output.matches, []);
  assert.deepEqual(output.stretchMatches, []);
  assert.ok(output.diagnostics.blockerCounts.budget > 0);
  assert.ok(output.diagnostics.blockerCounts["workload-memory"] > 0);
  assert.ok(output.diagnostics.blockerCounts["screen-size"] > 0);
});

test("workload and memory targets filter only when explicitly mandatory", () => {
  const preference = preferenceScenario();
  preference.primaryUses = ["cybersecurity-vms"];
  preference.workloadDetails.studyProductivity = null;
  preference.workloadDetails.cybersecurityVms = "two-vms";
  preference.multitasking = "heavy";
  preference.workloadRequirementMode = "preference";
  let output = recommendMacBooks({ catalogue: productCatalogue, answers: preference });
  assert.equal(output.status, "ok");
  assert.ok(output.matches.some(({ productId }) => productId.startsWith("macbook-neo")));

  preference.workloadRequirementMode = "mandatory";
  output = recommendMacBooks({ catalogue: productCatalogue, answers: preference });
  assert.ok(
    output.exclusions.some(({ failedFilters }) =>
      failedFilters.some(({ code }) => code === "workload-memory"),
    ),
  );
  output.matches.forEach((match) => {
    const product = productCatalogue.products.find(({ id }) => id === match.productId);
    assert.ok(product.facts.unifiedMemoryGb >= 24);
  });
});

test("weight, screen size and ownership are preferences until explicitly mandatory", () => {
  const answers = preferenceScenario();
  answers.mobility.weightTarget = "up-to-1.25kg";
  answers.mobility.weightRequirementMode = "preference";
  answers.screen.size = "16-inch";
  answers.screen.requirementMode = "preference-only";
  answers.ownership.period = "7-plus";
  answers.ownership.requirementMode = "preference";

  let output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.equal(output.diagnostics.counts.eligible, productCatalogue.products.length);

  answers.mobility.weightRequirementMode = "must-not-exceed";
  answers.screen.requirementMode = "exact-size-required";
  answers.ownership.requirementMode = "essential-headroom";
  output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.equal(output.status, "no-match");
  assert.ok(output.diagnostics.blockerCounts.weight > 0);
  assert.ok(output.diagnostics.blockerCounts["screen-size"] > 0);
  assert.ok(output.diagnostics.blockerCounts["ownership-headroom"] > 0);
});

test("external-display counts score as preferences and filter only when marked must-support", () => {
  const answers = preferenceScenario();
  answers.externalDisplays.count = "four-plus";
  answers.externalDisplays.requirementMode = "preference";
  let output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.equal(output.diagnostics.counts.eligible, productCatalogue.products.length);
  assert.ok(
    output.matches.some(
      ({ score }) => score.components.externalDisplays.applied && score.components.externalDisplays.value === 0,
    ),
  );

  answers.externalDisplays.requirementMode = "must-support";
  output = recommendMacBooks({ catalogue: productCatalogue, answers });
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
  assert.ok(output.matches.length > 0);
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
  output.matches
    .filter(({ matchType }) => matchType === "stretch")
    .forEach(({ rankingAdjustmentBasisPoints }) => assert.equal(rankingAdjustmentBasisPoints, -500));
});

test("the stretch adjustment requires an over-target match to improve fit by five points", () => {
  const withinTarget = cloneProduct(2);
  withinTarget.id = "within-target";
  withinTarget.price.amountMinor = 140000;
  const overTarget = structuredClone(withinTarget);
  overTarget.id = "over-target";
  overTarget.price.amountMinor = 160000;
  const answers = cloneAnswers(everydayPortableAnswers);
  answers.budget.mode = "stretch";
  answers.budget.absoluteMaximum = "up-to-2000";

  const output = recommendMacBooks({
    catalogue: catalogueWith([overTarget, withinTarget]),
    answers,
  });
  assert.deepEqual(output.matches.map(({ productId }) => productId), ["within-target", "over-target"]);
  assert.equal(output.matches[1].rankingAdjustmentBasisPoints, -500);
  assert.equal(
    output.matches[1].rankingExplanation.decidingFactor.code,
    "stretch-budget-adjustment",
  );
});

test("invalid, hidden and stale answers stop recommendation safely", () => {
  const answers = cloneAnswers(everydayPortableAnswers);
  answers.screen.size = "no-preference";
  answers.screen.requirementMode = "exact-size-required";
  const validation = validateRecommendationAnswers(answers);
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes("Hidden answer retained for screenRequirementMode."));
  assert.equal(output.status, "invalid-input");
  assert.deepEqual(output.matches, []);
});

test("recommendations are deterministic, deeply frozen and do not mutate inputs", () => {
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

test("structured results include classification, confidence and ranking explanations", () => {
  const output = recommendMacBooks({
    catalogue: productCatalogue,
    answers: cloneAnswers(demandingCodingAnswers),
  });
  const match = output.matches[0];

  assert.equal(output.status, "ok");
  assert.equal(output.catalogue.rulesVersion, "2.0.0");
  assert.ok(["exact", "closest", "stretch"].includes(match.matchType));
  assert.equal(typeof match.score.basisPoints, "number");
  assert.ok(match.reasons.length > 0);
  assert.ok(Array.isArray(match.compromises));
  assert.equal(match.rankingExplanation.decidingFactor.code, "highest-ranked");
  if (output.matches.length > 1) {
    assert.equal(output.matches[1].rankingExplanation.comparedWithProductId, match.productId);
  }
  assert.ok(["high", "moderate", "low"].includes(output.confidence.label));
});

test("unverified battery and connection needs never enter ranking and cap confidence", () => {
  const answers = cloneAnswers(everydayPortableAnswers);
  answers.mobility.batteryImportance = "long-travel-day";
  answers.connections.needs = ["hdmi-without-adapter"];
  answers.connections.importance = "must-have";
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });

  assert.equal(output.confidence.label, "low");
  assert.equal(output.confidence.cap, "low-unverified-connections");
  assert.deepEqual(
    output.unassessedAnswers.map(({ code }) => code),
    ["battery-runtime-unverified", "connections-unverified"],
  );
  assert.equal(output.diagnostics.appliedFilterCodes.includes("battery"), false);
  assert.equal(output.diagnostics.appliedFilterCodes.includes("connections"), false);
});

test("an important unverified battery need caps otherwise high confidence at moderate", () => {
  const answers = cloneAnswers(everydayPortableAnswers);
  answers.mobility.batteryImportance = "long-travel-day";
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });

  assert.equal(output.confidence.label, "moderate");
  assert.equal(output.confidence.points, 79);
  assert.equal(output.confidence.cap, "moderate-unverified-battery");
});

test("diagnostics list only hard filters that were actually applied", () => {
  const answers = preferenceScenario();
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });

  assert.deepEqual(output.diagnostics.appliedFilterCodes, [
    "availability",
    "market",
    "complete-data",
  ]);
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
