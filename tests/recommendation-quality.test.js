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

const RIGHT_SIZED_EVERYDAY_ANSWERS = Object.freeze({
  maximumBudget: "flexible",
  primaryUses: Object.freeze(["everyday-study"]),
  screenSize: "no-preference",
  portabilityPerformance: "balanced",
  workloadIntensity: "light",
  minimumStorage: "unsure",
  externalDisplays: "unsure",
  ownershipPeriod: "unsure",
});

function recommend(answers) {
  return recommendMacBooks({
    catalogue: productCatalogue,
    answers: cloneAnswers(answers),
  });
}

test("light and moderate everyday scenarios favour a right-sized MacBook Air", () => {
  ["light", "moderate"].forEach((workloadIntensity) => {
    const answers = {
      ...RIGHT_SIZED_EVERYDAY_ANSWERS,
      primaryUses: [...RIGHT_SIZED_EVERYDAY_ANSWERS.primaryUses],
      workloadIntensity,
    };
    const output = recommend(answers);

    assert.equal(output.status, "ok");
    assert.equal(output.matches[0].productId, "macbook-air-13-m5-10cpu-8gpu-16gb-512gb");
    assert.notEqual(output.matches[0].productId, "macbook-pro-14-m5-max-18cpu-32gpu-36gb-2tb");
  });
});

test("an explicit performance-first preference can still favour maximum capability", () => {
  const answers = {
    ...RIGHT_SIZED_EVERYDAY_ANSWERS,
    primaryUses: [...RIGHT_SIZED_EVERYDAY_ANSWERS.primaryUses],
    portabilityPerformance: "performance-first",
  };
  const output = recommend(answers);

  assert.equal(output.matches[0].productId, "macbook-pro-14-m5-max-18cpu-32gpu-36gb-2tb");
});

test("recommendation reasons explain scored preferences as well as hard requirements", () => {
  const output = recommend(everydayPortableAnswers);
  const reasonCodes = output.matches[0].reasons.map(({ code }) => code);

  assert.ok(reasonCodes.includes("strong-workload"));
  assert.ok(reasonCodes.includes("strong-primaryUses"));
  assert.equal(reasonCodes.length, 3);
});

test("raising a budget never removes a previously eligible product", () => {
  const budgetOrder = ["up-to-1000", "up-to-1500", "up-to-2000", "up-to-2500", "flexible"];
  let previousEligible = new Set();

  budgetOrder.forEach((maximumBudget) => {
    const answers = cloneAnswers(everydayPortableAnswers);
    answers.maximumBudget = maximumBudget;
    const eligible = new Set(recommend(answers).matches.map(({ productId }) => productId));

    previousEligible.forEach((productId) => assert.ok(eligible.has(productId)));
    previousEligible = eligible;
  });
});

test("harder storage and display requirements cannot expand eligibility", () => {
  const answers = cloneAnswers(demandingCodingAnswers);
  answers.maximumBudget = "flexible";

  const eligibleFor = (minimumStorage, externalDisplays) => {
    const scenario = { ...answers, minimumStorage, externalDisplays };
    return new Set(recommend(scenario).matches.map(({ productId }) => productId));
  };

  const broad = eligibleFor("512gb", "one");
  const narrowStorage = eligibleFor("1tb", "one");
  const narrowStorageAndDisplays = eligibleFor("1tb", "three-plus");

  narrowStorage.forEach((productId) => assert.ok(broad.has(productId)));
  narrowStorageAndDisplays.forEach((productId) => assert.ok(narrowStorage.has(productId)));
});

test("representative scenarios retain explainable expected outcomes", () => {
  const demanding = recommend(demandingCodingAnswers);
  const impossible = recommend(noMatchAnswers);

  assert.equal(demanding.matches[0].productId, "macbook-pro-14-m5-pro-15cpu-16gpu-24gb-1tb");
  assert.equal(impossible.status, "no-match");
  assert.deepEqual(impossible.matches, []);
  assert.ok(impossible.diagnostics.blockerCounts.budget > 0);
  assert.ok(impossible.diagnostics.blockerCounts["workload-capability"] > 0);
});
