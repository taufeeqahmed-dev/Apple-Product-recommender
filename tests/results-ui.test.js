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

test("answer review exposes five compact grouped summaries with targeted edit actions", () => {
  const groups = buildAnswerReview(everydayPortableAnswers);
  assert.deepEqual(
    groups.map(({ id }) => id),
    ["budget", "workload", "device", "storage", "essentials"],
  );
  assert.ok(groups[0].summary.includes("Up to £1,500"));
  assert.ok(groups[1].summary.includes("Documents, notes, email and video calls"));
  assert.equal(groups[1].editActions.length, 3);
  assert.equal(groups[3].summary, "At least 256 GB");
  assert.equal(groups[4].summary, "No additional must-haves");
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
      getConfidenceDetails({ label: "not-applicable", points: null }).label,
    ],
    ["80–100", "55–79", "0–54", "Not applicable"],
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

test("terminal engine confidence remains non-numeric for the results renderer to suppress", () => {
  const answers = cloneAnswers();
  answers.budget.target = "up-to-1000";
  answers.budget.mode = "strict";
  answers.minimumStorage = "2tb-plus";
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });
  assert.notEqual(output.status, "ok");
  assert.equal(getConfidenceDetails(output.confidence).label, "Not applicable");
  assert.equal(getConfidenceDetails(output.confidence).points, null);
});
