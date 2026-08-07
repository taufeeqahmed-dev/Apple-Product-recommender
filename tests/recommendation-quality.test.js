import test from "node:test";
import assert from "node:assert/strict";

import { productCatalogue } from "../js/products.js";
import { recommendMacBooks } from "../js/recommendation-engine.js";
import {
  cloneAnswers,
  demandingCodingAnswers,
  everydayPortableAnswers,
  noMatchAnswers,
} from "./fixtures/questionnaire-scenarios.js";

function recommend(answers) {
  return recommendMacBooks({ catalogue: productCatalogue, answers: cloneAnswers(answers) });
}

test("an everyday portable profile still favours a right-sized 13-inch MacBook Air", () => {
  const output = recommend(everydayPortableAnswers);
  assert.equal(output.status, "ok");
  assert.equal(output.matches[0].productId, "macbook-air-13-m5-10cpu-8gpu-16gb-512gb");
  assert.notEqual(output.matches[0].productId, "macbook-pro-14-m5-max-18cpu-32gpu-36gb-2tb");
});

test("the migrated demanding development profile leads with the eligible 14-inch M5 Pro", () => {
  const output = recommend(demandingCodingAnswers);
  assert.equal(output.status, "ok");
  assert.equal(output.matches[0].productId, "macbook-pro-14-m5-pro-15cpu-16gpu-24gb-1tb");
  assert.equal(output.profile.hardRequirements.memoryMinimumGb, 24);
  assert.equal(output.profile.hardRequirements.workloadCapabilityBand, 3);
});

test("primary reasons describe scored preferences as Northstar assessments", () => {
  const output = recommend(everydayPortableAnswers);
  const assessmentReasons = output.matches[0].reasons.filter(
    ({ kind }) => kind === "northstar-assessment",
  );
  assert.ok(assessmentReasons.length > 0);
  assert.ok(assessmentReasons.some(({ code }) => code.startsWith("strong-")));
});

test("raising a strict budget cannot remove a previously eligible product", () => {
  const budgetOrder = ["up-to-1000", "up-to-1500", "up-to-2000", "up-to-2500", "up-to-3000", "up-to-4500"];
  let previousEligible = new Set();

  budgetOrder.forEach((target) => {
    const answers = cloneAnswers(everydayPortableAnswers);
    answers.budget.target = target;
    answers.budget.mode = "strict";
    const eligible = new Set(recommend(answers).matches.map(({ productId }) => productId));
    previousEligible.forEach((productId) => assert.ok(eligible.has(productId)));
    previousEligible = eligible;
  });
});

test("harder mandatory storage and display requirements cannot expand eligibility", () => {
  const answers = cloneAnswers(demandingCodingAnswers);
  answers.budget.target = "no-fixed-target";
  answers.budget.mode = null;
  answers.externalDisplays.requirementMode = "must-support";

  const eligibleFor = (minimumStorage, displayCount) => {
    const scenario = cloneAnswers(answers);
    scenario.minimumStorage = minimumStorage;
    scenario.externalDisplays.count = displayCount;
    return new Set(recommend(scenario).matches.map(({ productId }) => productId));
  };

  const broad = eligibleFor("512gb", "one");
  const narrowStorage = eligibleFor("1tb", "one");
  const narrowStorageAndDisplays = eligibleFor("1tb", "three");
  narrowStorage.forEach((productId) => assert.ok(broad.has(productId)));
  narrowStorageAndDisplays.forEach((productId) => assert.ok(narrowStorage.has(productId)));
});

test("preference-only constraints create closest matches rather than unnecessary no-match results", () => {
  const answers = cloneAnswers(everydayPortableAnswers);
  answers.budget.target = "no-fixed-target";
  answers.budget.mode = null;
  answers.mobility.weightTarget = "up-to-1.25kg";
  answers.mobility.weightRequirementMode = "preference";
  answers.screen.size = "16-inch";
  answers.screen.requirementMode = "preference-only";
  answers.externalDisplays.count = "four-plus";
  answers.externalDisplays.requirementMode = "preference";

  const output = recommend(answers);
  assert.equal(output.status, "ok");
  assert.ok(output.matches.length > 0);
  assert.ok(output.matches.some(({ matchType }) => matchType === "closest"));
});

test("representative impossible requirements remain a genuine no-match", () => {
  const output = recommend(noMatchAnswers);
  assert.equal(output.status, "no-match");
  assert.deepEqual(output.matches, []);
  assert.ok(output.diagnostics.blockerCounts.budget > 0);
  assert.ok(output.diagnostics.blockerCounts["workload-capability"] > 0);
});

test("confidence improves with complete detail and a well-separated exact leader", () => {
  const detailed = recommend(everydayPortableAnswers);
  const sparseAnswers = cloneAnswers(everydayPortableAnswers);
  sparseAnswers.workloadDetails.studyProductivity = "unsure";
  const sparse = recommend(sparseAnswers);

  assert.ok(detailed.confidence.detailCoverage > sparse.confidence.detailCoverage);
  assert.ok(detailed.confidence.points >= sparse.confidence.points);
});

test("representative exact and no-match scenarios receive documented confidence labels", () => {
  assert.equal(recommend(everydayPortableAnswers).confidence.label, "high");
  assert.equal(recommend(noMatchAnswers).confidence.label, "low");
});
