import test from "node:test";
import assert from "node:assert/strict";

import { productCatalogue } from "../js/products.js";
import { recommendMacBooks } from "../js/recommendation-engine.js";
import {
  buildAnswerReview,
  buildComparisonRows,
  formatRankingExplanation,
  getComparisonCandidates,
  getConfidenceDetails,
  getMatchTypeDetails,
} from "../js/results.js";
import {
  cloneAnswers,
  everydayPortableAnswers,
} from "./fixtures/questionnaire-scenarios.js";

test("answer review groups only currently visible questionnaire answers", () => {
  const groups = buildAnswerReview(everydayPortableAnswers);
  const rows = groups.flatMap((group) => group.answers);
  const questionIds = rows.map(({ questionId }) => questionId);

  assert.deepEqual(
    groups.map(({ id }) => id),
    ["budget", "workload", "mobility", "display-storage", "connections-ownership"],
  );
  assert.ok(questionIds.includes("studyProductivityDetail"));
  assert.equal(questionIds.includes("softwareDevelopmentDetail"), false);
  assert.equal(questionIds.includes("absoluteBudget"), false);
  assert.equal(questionIds.includes("connectionImportance"), false);
  assert.equal(
    rows.find(({ questionId }) => questionId === "batteryImportance").answer,
    "Not answered (optional)",
  );
});

test("result classifications and confidence labels expose their documented meaning", () => {
  assert.equal(getMatchTypeDetails("exact").label, "Exact match");
  assert.equal(getMatchTypeDetails("closest").label, "Closest match");
  assert.equal(getMatchTypeDetails("stretch").label, "Stretch-budget match");

  assert.deepEqual(
    [
      getConfidenceDetails({ label: "high", points: 84 }).range,
      getConfidenceDetails({ label: "moderate", points: 67 }).range,
      getConfidenceDetails({ label: "low", points: 30 }).range,
    ],
    ["80–100", "55–79", "0–54"],
  );
});

test("comparison candidates and rows keep verified facts separate from assessments", () => {
  const output = recommendMacBooks({
    catalogue: productCatalogue,
    answers: everydayPortableAnswers,
  });
  const candidates = getComparisonCandidates(output);
  const comparison = buildComparisonRows(candidates, productCatalogue);

  assert.equal(candidates.length, 3);
  assert.deepEqual(
    comparison.groups.map(({ id }) => id),
    ["verified-facts", "northstar-assessments"],
  );
  assert.ok(
    comparison.groups[0].rows.some(({ label }) => label === "Verified price"),
  );
  assert.ok(
    comparison.groups[1].rows.some(({ label }) => label === "Why it ranked here"),
  );
  assert.equal(comparison.columns[0].productId, output.matches[0].productId);
});

test("flexible-budget comparisons place within-target matches before stretch alternatives", () => {
  const answers = cloneAnswers();
  answers.budget.target = "up-to-1000";
  answers.budget.mode = "flexible";
  answers.budget.absoluteMaximum = "up-to-4500";
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });
  const candidates = getComparisonCandidates(output);

  assert.ok(output.matches.length > 0);
  assert.ok(output.stretchMatches.length > 0);
  assert.equal(candidates[0].resultGroup, "primary");
  if (output.matches.length < 3) {
    assert.ok(candidates.some(({ resultGroup }) => resultGroup === "stretch-alternative"));
  }
});

test("lower-ranked products expose deciding factors, deficits and advantages", () => {
  const output = recommendMacBooks({
    catalogue: productCatalogue,
    answers: everydayPortableAnswers,
  });
  const explanation = formatRankingExplanation(output.matches[1]);

  assert.ok(explanation.length >= 1);
  assert.equal(explanation[0], output.matches[1].rankingExplanation.decidingFactor.message);
  if (output.matches[1].rankingExplanation.largestDeficit) {
    assert.ok(explanation.some((message) => message.includes("largest deficit")));
  }
});

test("unassessed battery and connection answers remain available for results disclosures", () => {
  const answers = cloneAnswers();
  answers.mobility.batteryImportance = "long-travel-day";
  answers.connections.needs = ["hdmi-without-adapter"];
  answers.connections.importance = "must-have";
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });

  assert.deepEqual(
    output.unassessedAnswers.map(({ code }) => code),
    ["battery-runtime-unverified", "connections-unverified"],
  );
  assert.equal(getConfidenceDetails(output.confidence).label, "Low");
});
