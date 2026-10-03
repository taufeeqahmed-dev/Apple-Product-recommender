import test from "node:test";
import assert from "node:assert/strict";

import { productCatalogue } from "../js/products.js";
import { recommendMacBooks } from "../js/recommendation-engine.js";
import {
  buildAnswerReview,
  buildComparisonRows,
  createResultCard,
  formatRankingExplanation,
  getComparisonCandidates,
  getConfidenceDetails,
  getMatchTypeDetails,
} from "../js/results.js";
import {
  cloneAnswers,
  everydayPortableAnswers,
} from "./fixtures/questionnaire-scenarios.js";
import { buildRecommendationInsights } from "../js/recommendation-insights.js";
import { buildRecommendationInsightPresentation } from "../js/recommendation-insight-presentation.js";
import { insightAnswers } from "./fixtures/recommendation-insight-scenarios.js";

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

// This small DOM recorder tests the rendered content tree, not browser behaviour.
// Native disclosure, focus and layout are exercised in Playwright.
class RecordedElement {
  constructor(tagName = "#text", text = "") {
    this.tagName = tagName;
    this.text = text;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.className = "";
  }
  set textContent(value) { this.text = value; this.children = []; }
  get textContent() { return this.text + this.children.map((node) => node.textContent).join(""); }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(name, value) { this.attributes[name] = value; }
}
const descendants = (node) => [node, ...node.children.flatMap(descendants)];
const hasClass = (node, name) => node.className.split(" ").includes(name);
function renderedCards(answers, change = () => {}) {
  const output = recommendMacBooks({ catalogue: productCatalogue, answers });
  const insights = buildRecommendationInsights({ output, catalogue: productCatalogue });
  const brief = buildRecommendationInsightPresentation({ insights, output, catalogue: productCatalogue });
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: (tag) => new RecordedElement(tag),
    createTextNode: (text) => new RecordedElement("#text", text),
  };
  try {
    const group = insights.leadingMatch.resultGroup;
    const matches = group === "primary" ? output.matches : output.stretchMatches;
    const cards = matches.slice(0, 3).map((match, index) => createResultCard(
      { ...match, displayRank: index + 1, resultGroup: group },
      productCatalogue.products.find(({ id }) => id === match.productId),
      change({ decisionBrief: brief }),
    ));
    return { cards, output };
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
}

test("rendered brief belongs only to the leading card and replaces its legacy explanation blocks", () => {
  const { cards } = renderedCards(insightAnswers("everyday"), (options) => options);
  assert.equal(descendants(cards[0]).filter((node) => hasClass(node, "decision-brief")).length, 1);
  assert.equal(descendants(cards[0]).some((node) => hasClass(node, "recommendation-reasons")), false);
  assert.equal(descendants(cards[0]).some((node) => hasClass(node, "recommendation-compromises")), false);
  cards.slice(1).forEach((card) => {
    assert.equal(descendants(card).some((node) => hasClass(node, "decision-brief")), false);
    assert.ok(descendants(card).some((node) => hasClass(node, "recommendation-reasons")));
  });
});

test("brief has semantic heading, ordered placement, native closed disclosure and evidence labels", () => {
  const { cards } = renderedCards(insightAnswers("everyday"), (options) => options);
  const tree = descendants(cards[0]);
  const brief = tree.find((node) => hasClass(node, "decision-brief"));
  assert.equal(brief.children[0].tagName, "h4");
  assert.equal(brief.children[0].textContent, "Why this fits");
  assert.equal(brief.attributes["aria-labelledby"], brief.children[0].id);
  assert.ok(cards[0].children.indexOf(brief) > cards[0].children.findIndex((node) => hasClass(node, "recommendation-configuration")));
  assert.ok(cards[0].children.indexOf(brief) < cards[0].children.findIndex((node) => hasClass(node, "recommendation-facts")));
  const details = tree.find((node) => hasClass(node, "decision-brief-details"));
  assert.equal(details.tagName, "details");
  assert.equal(details.attributes.open, undefined);
  assert.equal(details.children[0].tagName, "summary");
  assert.equal(details.children[0].textContent, "Answers and evidence");
  assert.ok(tree.some((node) => node.tagName === "dl"));
  for (const label of ["Your answer", "Northstar-derived need", "Verified Apple fact"]) {
    assert.ok(tree.some((node) => node.tagName === "dt" && node.textContent === label));
  }
  assert.ok(brief.textContent.includes("Northstar assessment"));
});

test("rendered single-candidate leader omits the runner-up section", () => {
  const { cards } = renderedCards(insightAnswers("hard-workload"), (options) => options);
  assert.equal(descendants(cards[0]).some((node) => hasClass(node, "decision-brief-runner")), false);
});

test("stretch-only eligible leader receives exactly one brief", () => {
  const answers = insightAnswers("everyday");
  answers.budget = { target: "up-to-1000", mode: "flexible", absoluteMaximum: "up-to-4500" };
  answers.minimumStorage = "1tb";
  const { cards, output } = renderedCards(answers, (options) => options);
  assert.equal(output.matches.length, 0);
  assert.equal(cards.flatMap(descendants).filter((node) => hasClass(node, "decision-brief")).length, 1);
  assert.match(cards[0].textContent, /above your preferred budget target/);
});

test("missing presentation safely retains the original leader reasons and considerations", () => {
  const { cards, output } = renderedCards(insightAnswers("portability-compromise"), () => ({ decisionBrief: null }));
  assert.equal(descendants(cards[0]).some((node) => hasClass(node, "decision-brief")), false);
  assert.ok(descendants(cards[0]).some((node) => hasClass(node, "recommendation-reasons")));
  assert.ok(descendants(cards[0]).some((node) => hasClass(node, "recommendation-compromises")));
  assert.ok(cards[0].textContent.includes(output.matches[0].compromises[0].message));
});

test("a brief reference from another result group cannot replace this card's explanations", () => {
  const { cards } = renderedCards(insightAnswers("everyday"), ({ decisionBrief }) => ({
    decisionBrief: { ...decisionBrief, leadingMatch: { ...decisionBrief.leadingMatch, resultGroup: "stretch-alternative" } },
  }));
  assert.equal(descendants(cards[0]).some((node) => hasClass(node, "decision-brief")), false);
  assert.ok(descendants(cards[0]).some((node) => hasClass(node, "recommendation-reasons")));
});
