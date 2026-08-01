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

test("an exact budget boundary is eligible and one penny over is excluded", () => {
  const boundary = cloneProduct();
  boundary.id = "boundary-product";
  boundary.price.amountMinor = 100000;
  const over = cloneProduct();
  over.id = "over-product";
  over.price.amountMinor = 100001;
  const answers = cloneAnswers();
  answers.maximumBudget = "up-to-1000";
  const output = recommendMacBooks({
    catalogue: catalogueWith([boundary, over]),
    answers,
  });

  assert.equal(output.status, "ok");
  assert.deepEqual(output.matches.map((match) => match.productId), ["boundary-product"]);
  assert.equal(output.exclusions[0].productId, "over-product");
  assert.ok(output.exclusions[0].failedFilters.some((failure) => failure.code === "budget"));
});

test("a no-match case reports exclusions and blockers without near matches", () => {
  const output = recommendMacBooks({
    catalogue: productCatalogue,
    answers: cloneAnswers(noMatchAnswers),
  });

  assert.equal(output.status, "no-match");
  assert.deepEqual(output.matches, []);
  assert.equal(output.exclusions.length, productCatalogue.products.length);
  assert.ok(output.diagnostics.blockerCounts.budget > 0);
  assert.ok(output.diagnostics.blockerCounts["workload-capability"] > 0);
});

test("score ties use workload, primary use, balance, compromises, price, then ID", () => {
  const zExpensive = cloneProduct(2);
  zExpensive.id = "z-expensive";
  zExpensive.price.amountMinor = 140000;
  const bCheap = structuredClone(zExpensive);
  bCheap.id = "b-cheap";
  bCheap.price.amountMinor = 130000;
  const aCheap = structuredClone(bCheap);
  aCheap.id = "a-cheap";
  const answers = cloneAnswers();
  answers.maximumBudget = "flexible";

  const output = recommendMacBooks({
    catalogue: catalogueWith([zExpensive, bCheap, aCheap]),
    answers,
  });

  assert.deepEqual(output.matches.map((match) => match.productId), ["a-cheap", "b-cheap", "z-expensive"]);
  assert.deepEqual(output.ties, [
    {
      basisPoints: output.matches[0].score.basisPoints,
      productIds: ["a-cheap", "b-cheap", "z-expensive"],
    },
  ]);
});

test("invalid answer IDs stop recommendation safely", () => {
  const answers = cloneAnswers();
  answers.maximumBudget = "about-1200";
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });

  assert.equal(output.status, "invalid-input");
  assert.deepEqual(output.matches, []);
  assert.match(output.diagnostics.validationErrors[0], /maximumBudget/);
});

test("one and two primary-use IDs are accepted", () => {
  const one = validateRecommendationAnswers(cloneAnswers());
  const twoAnswers = cloneAnswers(demandingCodingAnswers);
  const two = validateRecommendationAnswers(twoAnswers);

  assert.equal(one.valid, true);
  assert.equal(two.valid, true);
  assert.equal(recommendMacBooks({ catalogue: productCatalogue, answers: twoAnswers }).status, "ok");
});

test("zero, three, duplicate and unknown primary uses are rejected", () => {
  const cases = [
    [],
    ["coding", "office-business", "audio-music"],
    ["coding", "coding"],
    ["coding", "quantum-simulation"],
  ];

  cases.forEach((primaryUses) => {
    const answers = cloneAnswers();
    answers.primaryUses = primaryUses;
    assert.equal(validateRecommendationAnswers(answers).valid, false);
  });
});

test("a null recommendation-critical field excludes a record as incomplete", () => {
  const incomplete = cloneProduct();
  incomplete.id = "incomplete-product";
  incomplete.facts.storageGb = null;
  const output = recommendMacBooks({
    catalogue: catalogueWith([incomplete]),
    answers: cloneAnswers(),
  });

  assert.equal(output.status, "no-match");
  assert.equal(output.exclusions[0].failedFilters[0].code, "incomplete-data");
  assert.deepEqual(output.exclusions[0].failedFilters[0].details.fields, ["facts.storageGb"]);
});

test("a structurally missing product field invalidates the whole catalogue", () => {
  const invalid = cloneProduct();
  delete invalid.facts.storageGb;
  const output = recommendMacBooks({
    catalogue: catalogueWith([invalid]),
    answers: cloneAnswers(),
  });

  assert.equal(output.status, "invalid-catalog");
  assert.deepEqual(output.matches, []);
  assert.ok(output.diagnostics.validationErrors.some((error) => error.includes("storageGb is required")));
});

test("duplicate stable product IDs invalidate the whole catalogue", () => {
  const first = cloneProduct();
  const duplicate = cloneProduct(1);
  duplicate.id = first.id;
  const output = recommendMacBooks({
    catalogue: catalogueWith([first, duplicate]),
    answers: cloneAnswers(),
  });
  assert.equal(output.status, "invalid-catalog");
});

test("recommendations are deterministic and inputs are not mutated", () => {
  const answers = cloneAnswers(demandingCodingAnswers);
  const beforeAnswers = structuredClone(answers);
  const beforeCatalogue = structuredClone(productCatalogue);
  const first = recommendMacBooks({ catalogue: productCatalogue, answers });
  const second = recommendMacBooks({ catalogue: productCatalogue, answers });

  assert.deepEqual(first, second);
  assert.deepEqual(answers, beforeAnswers);
  assert.deepEqual(productCatalogue, beforeCatalogue);
  assert.ok(Object.isFrozen(first));
});

test("the scoring scale is capped at 100 and can reach its documented maximum", () => {
  const answers = {
    maximumBudget: "flexible",
    primaryUses: ["video-3d"],
    screenSize: "compact",
    portabilityPerformance: "performance-first",
    workloadIntensity: "very-demanding",
    minimumStorage: "2tb-plus",
    externalDisplays: "three-plus",
    ownershipPeriod: "7-plus",
  };
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.equal(output.matches[0].score.percent, 100);
  output.matches.forEach((match) => assert.ok(match.score.percent <= 100));
});

test("structured matches include reasons, compromises, exclusions and diagnostics", () => {
  const output = recommendMacBooks({
    catalogue: productCatalogue,
    answers: cloneAnswers(demandingCodingAnswers),
  });
  const match = output.matches[0];

  assert.equal(output.status, "ok");
  assert.equal(typeof match.score.basisPoints, "number");
  assert.ok(match.reasons.length > 0);
  assert.ok(Array.isArray(match.compromises));
  assert.ok(Array.isArray(output.exclusions));
  assert.equal(output.diagnostics.counts.catalogue, 10);
  assert.equal(output.catalogue.rulesVersion, "1.1.0");
});
