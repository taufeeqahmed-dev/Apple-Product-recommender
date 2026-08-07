import { getQuestionDefinition } from "./questionnaire-definition.js";
import { getAnswerValue, getVisibleQuestionIds } from "./questionnaire-profile.js";

const priceFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeZone: "UTC",
});

const ANSWER_GROUPS = Object.freeze([
  Object.freeze({
    id: "budget",
    title: "Budget",
    questionIds: Object.freeze(["budgetTarget", "budgetMode", "absoluteBudget"]),
  }),
  Object.freeze({
    id: "workload",
    title: "Uses, workload and multitasking",
    questionIds: Object.freeze([
      "primaryUses",
      "studyProductivityDetail",
      "softwareDevelopmentDetail",
      "cybersecurityVmDetail",
      "photoEditingDetail",
      "videoEditingDetail",
      "musicProductionDetail",
      "threeDEngineeringDetail",
      "sustainedDuration",
      "multitasking",
      "workloadRequirementMode",
    ]),
  }),
  Object.freeze({
    id: "mobility",
    title: "Portability and battery",
    questionIds: Object.freeze([
      "portabilityPerformance",
      "weightTarget",
      "weightRequirementMode",
      "batteryImportance",
    ]),
  }),
  Object.freeze({
    id: "display-storage",
    title: "Screen, storage and external displays",
    questionIds: Object.freeze([
      "screenSize",
      "screenRequirementMode",
      "minimumStorage",
      "externalDisplays",
      "externalDisplayRequirementMode",
    ]),
  }),
  Object.freeze({
    id: "connections-ownership",
    title: "Connections and ownership",
    questionIds: Object.freeze([
      "connectionNeeds",
      "connectionImportance",
      "ownershipPeriod",
      "ownershipRequirementMode",
    ]),
  }),
]);

const MATCH_TYPE_DETAILS = Object.freeze({
  exact: Object.freeze({
    label: "Exact match",
    description: "Passed every hard requirement without a major scored compromise.",
  }),
  closest: Object.freeze({
    label: "Closest match",
    description: "Passed every hard requirement, with one or more preference compromises to review.",
  }),
  stretch: Object.freeze({
    label: "Stretch-budget match",
    description: "Passed the applicable hard requirements but is above the preferred budget target.",
  }),
});

const CONFIDENCE_DETAILS = Object.freeze({
  high: Object.freeze({
    label: "High",
    range: "80–100",
    description: "Detailed answers, a strong leading fit and useful separation support the result.",
  }),
  moderate: Object.freeze({
    label: "Moderate",
    range: "55–79",
    description: "The result is useful, but missing detail, close scores or an unassessed need limits certainty.",
  }),
  low: Object.freeze({
    label: "Low",
    range: "0–54",
    description: "The result has limited support or an important requirement could not be evaluated.",
  }),
});

const BLOCKER_LABELS = Object.freeze({
  availability: "current availability",
  market: "UK market data",
  "incomplete-data": "complete verified data",
  budget: "maximum budget",
  storage: "minimum storage",
  "external-displays": "external displays",
  "workload-capability": "expected workload",
  "workload-memory": "workload memory",
  weight: "maximum weight",
  "screen-size": "exact screen size",
  "ownership-headroom": "Northstar ownership headroom",
});

let comparisonReturnTarget = null;

function formatSnapshotDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

function formatPrice(amountMinor) {
  return priceFormatter.format(amountMinor / 100);
}

function formatStorage(storageGb) {
  return storageGb >= 1000 ? `${storageGb / 1000}TB` : `${storageGb}GB`;
}

function element(tagName, className = "", text = undefined) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function productById(catalogue, productId) {
  return catalogue.products.find((product) => product.id === productId);
}

function answerLabel(definition, value) {
  const labels = new Map(definition.options.map((option) => [option.id, option.label]));
  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map((answerId) => labels.get(answerId) ?? answerId).join(", ")
      : "Not answered (optional)";
  }
  if (value === null || value === "" || value === undefined) {
    return definition.required ? "Not answered" : "Not answered (optional)";
  }
  return labels.get(value) ?? String(value);
}

export function buildAnswerReview(answers) {
  const visible = new Set(getVisibleQuestionIds(answers));
  return ANSWER_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    answers: group.questionIds
      .filter((questionId) => visible.has(questionId))
      .map((questionId) => {
        const definition = getQuestionDefinition(questionId);
        return {
          questionId,
          prompt: definition.prompt,
          answer: answerLabel(definition, getAnswerValue(answers, definition.answerPath)),
          required: definition.required,
          rankingUse: definition.rankingUse ?? "available",
        };
      }),
  })).filter((group) => group.answers.length > 0);
}

export function getMatchTypeDetails(matchType) {
  return MATCH_TYPE_DETAILS[matchType] ?? MATCH_TYPE_DETAILS.closest;
}

export function getConfidenceDetails(confidence) {
  const detail = CONFIDENCE_DETAILS[confidence?.label] ?? CONFIDENCE_DETAILS.low;
  return {
    ...detail,
    points: confidence?.points ?? 0,
    detailCoverage: confidence?.detailCoverage ?? 0,
    topScore: confidence?.topScore ?? null,
    topLead: confidence?.topLead ?? null,
    cap: confidence?.cap ?? null,
    reasons: confidence?.reasons ?? [],
  };
}

function normaliseMatch(match, displayRank, group) {
  return {
    ...match,
    displayRank,
    resultGroup: group,
  };
}

export function getComparisonCandidates(output, limit = 3) {
  const candidates = [];
  output.matches.forEach((match) => {
    candidates.push(normaliseMatch(match, candidates.length + 1, "primary"));
  });
  output.stretchMatches.forEach((match) => {
    if (!candidates.some(({ productId }) => productId === match.productId)) {
      candidates.push(normaliseMatch(match, candidates.length + 1, "stretch-alternative"));
    }
  });
  return candidates.slice(0, limit);
}

export function formatRankingExplanation(match) {
  const explanation = match.rankingExplanation;
  if (!explanation) return [];
  const leadingStretchAlternative =
    match.resultGroup === "stretch-alternative" &&
    explanation.decidingFactor.code === "highest-ranked";
  const messages = [
    leadingStretchAlternative
      ? "This is the highest-ranked stretch-budget alternative."
      : explanation.decidingFactor.message,
  ];
  if (explanation.largestDeficit) {
    messages.push(
      `Its largest deficit against the leading match is ${explanation.largestDeficit.label.toLowerCase()} (${explanation.largestDeficit.difference} points).`,
    );
  }
  if (explanation.advantage) {
    messages.push(
      `It has an advantage in ${explanation.advantage.label.toLowerCase()} (${explanation.advantage.difference} points).`,
    );
  }
  return messages;
}

export function buildComparisonRows(matches, catalogue) {
  const columns = matches.map((match) => {
    const product = productById(catalogue, match.productId);
    return {
      productId: match.productId,
      displayName: product.displayName,
      configurationName: product.configurationName,
    };
  });
  const values = (callback) =>
    matches.map((match) => callback(match, productById(catalogue, match.productId)));

  return {
    columns,
    groups: [
      {
        id: "verified-facts",
        title: "Verified Apple facts",
        rows: [
          {
            label: "Verified price",
            values: values((match, product) =>
              `${formatPrice(product.price.amountMinor)} on ${formatSnapshotDate(product.price.snapshotDate)}`,
            ),
          },
          {
            label: "Built-in display",
            values: values(
              (match, product) =>
                `${product.facts.marketedScreenSizeInches}-inch marketed size; ${product.facts.displayDiagonalInches}-inch diagonal`,
            ),
          },
          {
            label: "Weight",
            values: values((match, product) => `${product.facts.weightKg}kg`),
          },
          {
            label: "Chip",
            values: values((match, product) => product.facts.chip.displayName),
          },
          {
            label: "Unified memory",
            values: values((match, product) => `${product.facts.unifiedMemoryGb}GB`),
          },
          {
            label: "Built-in storage",
            values: values((match, product) => formatStorage(product.facts.storageGb)),
          },
          {
            label: "External displays",
            values: values(
              (match, product) => product.facts.externalDisplaySupport.summary,
            ),
          },
        ],
      },
      {
        id: "northstar-assessments",
        title: "Northstar assessments",
        rows: [
          {
            label: "Result classification",
            values: values((match) => getMatchTypeDetails(match.matchType).label),
          },
          {
            label: "Fit score",
            values: values((match) => `${match.score.percent.toFixed(2)} out of 100`),
          },
          {
            label: "Strongest reason",
            values: values((match) => match.reasons[0]?.message ?? "No reason available."),
          },
          {
            label: "Main compromise",
            values: values(
              (match) =>
                match.compromises[0]?.message ?? "No significant compromise identified.",
            ),
          },
          {
            label: "Why it ranked here",
            values: values((match) => formatRankingExplanation(match).join(" ")),
          },
        ],
      },
    ],
  };
}

function createAssessmentList(items, className) {
  const list = element("ul", className);
  items.forEach((item) => {
    const listItem = element("li");
    const kind = element(
      "span",
      `evidence-label evidence-label-${item.kind}`,
      item.kind === "verified-fact" ? "Verified fact" : "Northstar assessment",
    );
    listItem.append(kind, document.createTextNode(` ${item.message}`));
    list.append(listItem);
  });
  return list;
}

function createClassificationBadge(matchType) {
  const details = getMatchTypeDetails(matchType);
  const wrapper = element("div", `match-classification match-classification-${matchType}`);
  wrapper.append(
    element("strong", "", details.label),
    element("span", "", details.description),
  );
  return wrapper;
}

function createRankingExplanation(match) {
  const panel = element("div", "ranking-explanation");
  panel.append(element("h4", "", "Why it ranked here"));
  const messages = formatRankingExplanation(match);
  if (messages.length === 0) {
    panel.append(element("p", "", "No ranking explanation is available."));
    return panel;
  }
  const list = element("ul");
  messages.forEach((message) => list.append(element("li", "", message)));
  panel.append(list);
  return panel;
}

function createResultCard(match, product, { labelPrefix = "Recommendation" } = {}) {
  const card = element("article", "recommendation-card");
  card.dataset.matchType = match.matchType;
  const stableId = product.id.replace(/[^a-z0-9-]/g, "-");

  const header = element("div", "recommendation-card-header");
  const rank = element("p", "recommendation-rank", `${labelPrefix} ${match.displayRank}`);
  rank.id = `recommendation-rank-${stableId}`;
  const title = element("h3", "", product.displayName);
  title.id = `recommendation-title-${stableId}`;
  const price = element(
    "p",
    "recommendation-price",
    `${formatPrice(product.price.amountMinor)} verified on ${formatSnapshotDate(product.price.snapshotDate)}`,
  );
  const score = element(
    "p",
    "recommendation-score",
    `Northstar fit score: ${match.score.percent.toFixed(2)} out of 100`,
  );
  header.append(rank, title, price, score, createClassificationBadge(match.matchType));

  const configuration = element("p", "recommendation-configuration", product.configurationName);
  configuration.id = `recommendation-configuration-${stableId}`;
  card.setAttribute("aria-labelledby", `${rank.id} ${title.id} ${configuration.id}`);

  const factsHeading = element("h4", "", "Verified Apple facts");
  const facts = element("ul", "recommendation-facts");
  [
    `${product.facts.displayDiagonalInches}-inch diagonal display`,
    `${product.facts.weightKg}kg`,
    `${product.facts.chip.displayName}`,
    `${product.facts.unifiedMemoryGb}GB unified memory`,
    `${formatStorage(product.facts.storageGb)} storage`,
    product.facts.externalDisplaySupport.summary,
  ].forEach((fact) => facts.append(element("li", "", fact)));

  const reasonsHeading = element("h4", "", "Why it matches");
  const reasons = createAssessmentList(match.reasons, "recommendation-reasons");
  const compromisesHeading = element("h4", "", "What to consider");
  const compromises =
    match.compromises.length > 0
      ? createAssessmentList(match.compromises, "recommendation-compromises")
      : element(
          "p",
          "recommendation-no-compromises",
          "No significant compromise was identified by the applied Northstar rules.",
        );

  const source = element(
    "a",
    "recommendation-source",
    "View this verified configuration on Apple UK",
  );
  source.href = product.price.sourceUrl;
  source.target = "_blank";
  source.rel = "noreferrer";
  source.setAttribute(
    "aria-label",
    `View ${product.displayName}, ${product.configurationName}, on Apple UK (opens in a new tab)`,
  );

  card.append(
    header,
    configuration,
    factsHeading,
    facts,
    reasonsHeading,
    reasons,
    compromisesHeading,
    compromises,
    createRankingExplanation(match),
    source,
  );
  return card;
}

function createConfidencePanel(confidence) {
  const details = getConfidenceDetails(confidence);
  const panel = element("section", `confidence-panel confidence-${confidence.label}`);
  panel.setAttribute("aria-labelledby", "confidence-title");
  panel.append(
    element("p", "stage-label", "Northstar assessment"),
    element("h3", "", `Recommendation confidence: ${details.label}`),
  );
  panel.querySelector("h3").id = "confidence-title";
  panel.append(
    element("p", "confidence-score", `${details.points} out of 100 confidence points.`),
    element("p", "", details.description),
    element(
      "p",
      "confidence-thresholds",
      "Documented labels: High 80–100; Moderate 55–79; Low 0–54.",
    ),
  );
  if (details.reasons.length > 0) {
    const list = element("ul", "confidence-reasons");
    details.reasons.forEach(({ message }) => list.append(element("li", "", message)));
    panel.append(list);
  }
  return panel;
}

function createUnassessedPanel(unassessedAnswers) {
  if (unassessedAnswers.length === 0) return null;
  const panel = element("section", "unassessed-panel");
  panel.setAttribute("aria-labelledby", "unassessed-title");
  const title = element("h3", "", "Answers not used in ranking");
  title.id = "unassessed-title";
  const intro = element(
    "p",
    "",
    "Northstar recorded these answers but did not infer capabilities missing from the verified catalogue.",
  );
  const list = element("ul");
  unassessedAnswers.forEach(({ message }) => list.append(element("li", "", message)));
  panel.append(title, intro, list);
  return panel;
}

function createAnswerReview(answers, onEditAnswer) {
  const section = element("section", "answer-review");
  section.id = "answer-review";
  section.setAttribute("aria-labelledby", "answer-review-title");
  const title = element("h3", "", "Review your answers");
  title.id = "answer-review-title";
  section.append(
    title,
    element(
      "p",
      "answer-review-intro",
      "Edit one answer at a time. If an edit makes another answer irrelevant, Northstar clears and announces only that dependent answer.",
    ),
  );

  buildAnswerReview(answers).forEach((group) => {
    const groupSection = element("section", "answer-review-group");
    const groupTitle = element("h4", "", group.title);
    groupTitle.id = `answer-group-${group.id}`;
    groupSection.setAttribute("aria-labelledby", groupTitle.id);
    const list = element("ul", "answer-review-list");
    group.answers.forEach((answer) => {
      const row = element("li", "answer-review-row");
      const content = element("div", "answer-review-content");
      const prompt = element("p", "answer-review-prompt", answer.prompt);
      const value = element("p", "answer-review-value", answer.answer);
      const requirement = element(
        "span",
        "answer-requirement",
        answer.required ? "Required" : "Optional",
      );
      content.append(prompt, value, requirement);
      const button = element("button", "button button-secondary answer-edit-button", "Edit answer");
      button.type = "button";
      button.dataset.editQuestionId = answer.questionId;
      button.setAttribute("aria-label", `Edit answer for: ${answer.prompt}`);
      button.addEventListener("click", () => onEditAnswer?.(answer.questionId, button));
      row.append(content, button);
      list.append(row);
    });
    groupSection.append(groupTitle, list);
    section.append(groupSection);
  });
  return section;
}

function createClassificationSummary(output) {
  const panel = element("section", "classification-summary");
  panel.setAttribute("aria-labelledby", "classification-summary-title");
  const title = element("h3", "", "How to read these results");
  title.id = "classification-summary-title";
  const types = ["exact", "closest", "stretch"];
  const list = element("ul", "classification-list");
  types.forEach((type) => {
    const details = getMatchTypeDetails(type);
    const count = output.diagnostics.categoryCounts[type] ?? 0;
    const item = element("li", `classification-item classification-item-${type}`);
    item.append(
      element("strong", "", `${details.label}: ${count}`),
      element("span", "", details.description),
    );
    list.append(item);
  });
  panel.append(title, list);
  return panel;
}

function createNoMatch(output) {
  const panel = element("div", "results-message results-message-warning");
  panel.append(
    element("h3", "", "No suitable configuration found"),
    element(
      "p",
      "",
      "Every verified configuration missed at least one hard requirement. Northstar has not silently relaxed those requirements.",
    ),
  );
  const blockers = Object.entries(output.diagnostics.blockerCounts);
  if (blockers.length > 0) {
    panel.append(element("h4", "", "Requirements that blocked matches"));
    const list = element("ul", "results-blockers");
    blockers.forEach(([code, count]) => {
      const label = BLOCKER_LABELS[code] ?? code;
      list.append(
        element("li", "", `${label}: ${count} configuration${count === 1 ? "" : "s"}`),
      );
    });
    panel.append(list);
  }
  return panel;
}

function createBudgetLimited(output, catalogue) {
  const panel = element("div", "results-message results-message-warning");
  panel.append(
    element("h3", "", "No configuration fits the permitted budget"),
    element(
      "p",
      "",
      "These configurations met the other hard requirements but were excluded by the verified price limit. They are shown for context, not ranked as recommendations.",
    ),
  );
  if (output.budgetLimitedAlternatives.length > 0) {
    const list = element("ul", "budget-alternative-list");
    output.budgetLimitedAlternatives.slice(0, 3).forEach((alternative) => {
      const product = productById(catalogue, alternative.productId);
      if (!product) return;
      list.append(
        element(
          "li",
          "",
          `${product.displayName}, ${product.configurationName}: ${formatPrice(product.price.amountMinor)}, ${formatPrice(alternative.amountOverLimitMinor)} above the limit.`,
        ),
      );
    });
    panel.append(list);
  }
  return panel;
}

function createDataError(output) {
  const panel = element("div", "results-message results-message-warning");
  const isInputError = output.status === "invalid-input";
  panel.append(
    element("h3", "", isInputError ? "Questionnaire answers could not be used" : "Product data could not be used"),
    element(
      "p",
      "",
      isInputError
        ? "One or more answer IDs were invalid or incomplete. Restart the questionnaire and try again."
        : "The catalogue did not pass validation, so no recommendations were calculated.",
    ),
  );
  return panel;
}

function createComparisonTable(matches, catalogue) {
  const model = buildComparisonRows(matches, catalogue);
  const wrapper = element("div", "comparison-table-wrap");
  wrapper.tabIndex = 0;
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", "Scrollable recommendation comparison");
  const table = element("table", "comparison-table");
  table.append(element("caption", "", `Top ${matches.length} recommendation comparison`));

  const head = document.createElement("thead");
  const headingRow = document.createElement("tr");
  const measureHeading = element("th", "", "Comparison measure");
  measureHeading.scope = "col";
  headingRow.append(measureHeading);
  model.columns.forEach((column, index) => {
    const heading = document.createElement("th");
    heading.scope = "col";
    heading.append(
      element("span", "comparison-rank", `Recommendation ${index + 1}`),
      element("strong", "", column.displayName),
      element("span", "", column.configurationName),
    );
    headingRow.append(heading);
  });
  head.append(headingRow);
  table.append(head);

  model.groups.forEach((group) => {
    const body = document.createElement("tbody");
    const groupRow = document.createElement("tr");
    groupRow.className = "comparison-group-row";
    const groupHeading = element("th", "", group.title);
    groupHeading.colSpan = matches.length + 1;
    groupHeading.scope = "rowgroup";
    groupRow.append(groupHeading);
    body.append(groupRow);
    group.rows.forEach((row) => {
      const tableRow = document.createElement("tr");
      const rowHeading = element("th", "", row.label);
      rowHeading.scope = "row";
      tableRow.append(rowHeading);
      row.values.forEach((value) => tableRow.append(element("td", "", value)));
      body.append(tableRow);
    });
    table.append(body);
  });
  wrapper.append(table);
  return wrapper;
}

function closeComparison({ restoreFocus = false } = {}) {
  const dialog = document.querySelector("#comparison-dialog");
  if (dialog?.open) dialog.close();
  comparisonReturnTarget?.setAttribute("aria-expanded", "false");
  if (restoreFocus && comparisonReturnTarget?.isConnected) comparisonReturnTarget.focus();
  if (!restoreFocus) comparisonReturnTarget = null;
}

function createComparisonButton(matches, catalogue) {
  if (matches.length < 2) return null;
  const dialog = document.querySelector("#comparison-dialog");
  const content = document.querySelector("#comparison-content");
  const title = document.querySelector("#comparison-title");
  const closeButton = document.querySelector("#comparison-close");
  if (!dialog || !content || !title || !closeButton) return null;

  const button = element(
    "button",
    "button button-primary comparison-open-button",
    `Compare top ${matches.length}`,
  );
  button.type = "button";
  button.setAttribute("aria-controls", "comparison-dialog");
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", () => {
    comparisonReturnTarget = button;
    content.replaceChildren(createComparisonTable(matches, catalogue));
    button.setAttribute("aria-expanded", "true");
    dialog.showModal();
    title.focus();
  });
  closeButton.onclick = () => closeComparison({ restoreFocus: true });
  dialog.oncancel = (event) => {
    event.preventDefault();
    closeComparison({ restoreFocus: true });
  };
  return button;
}

function createRecommendationGroup(matches, catalogue, { stretch = false } = {}) {
  const section = element("section", stretch ? "stretch-results" : "primary-results");
  const title = element(
    "h3",
    "results-group-title",
    stretch ? "Stretch-budget alternatives" : "Ranked recommendations",
  );
  section.append(title);
  if (stretch) {
    section.append(
      element(
        "p",
        "results-group-intro",
        "These options are above your preferred target but remain within any absolute maximum you supplied.",
      ),
    );
  }
  const cards = element("div", "recommendation-list");
  matches.forEach((match) => {
    const product = productById(catalogue, match.productId);
    if (product) {
      cards.append(
        createResultCard(match, product, {
          labelPrefix: stretch ? "Stretch alternative" : "Recommendation",
        }),
      );
    }
  });
  section.append(cards);
  return section;
}

export function renderRecommendationResults(
  output,
  catalogue,
  { onEditAnswer = null, isRefresh = false } = {},
) {
  const section = document.querySelector("#results");
  const title = document.querySelector("#results-title");
  const stageLabel = document.querySelector("#results-stage-label");
  const summary = document.querySelector("#results-summary");
  const announcement = document.querySelector("#results-announcement");
  const container = document.querySelector("#recommendation-output");
  const restartButton = document.querySelector("#results-restart");
  if (!section || !title || !stageLabel || !summary || !announcement || !container) return false;

  closeComparison();
  container.replaceChildren();
  restartButton?.removeAttribute("hidden");

  if (output.profile) {
    container.append(createConfidencePanel(output.confidence));
    const unassessedPanel = createUnassessedPanel(output.unassessedAnswers);
    if (unassessedPanel) container.append(unassessedPanel);
  }

  if (output.status === "ok") {
    const primaryMatches = output.matches.slice(0, 3).map((match, index) =>
      normaliseMatch(match, index + 1, "primary"),
    );
    const stretchMatches = output.stretchMatches.slice(0, 3).map((match, index) =>
      normaliseMatch(match, index + 1, "stretch-alternative"),
    );
    const mainMatches = primaryMatches.length > 0 ? primaryMatches : stretchMatches;
    stageLabel.textContent = isRefresh ? "Recommendations refreshed" : "Your recommendations";
    summary.textContent = `${mainMatches.length} leading verified configuration${
      mainMatches.length === 1 ? "" : "s"
    } shown with Northstar classifications and ranking explanations.`;
    container.append(createClassificationSummary(output));
    const comparisonCandidates = getComparisonCandidates(output);
    const comparisonButton = createComparisonButton(comparisonCandidates, catalogue);
    if (comparisonButton) container.append(comparisonButton);
    container.append(
      createRecommendationGroup(mainMatches, catalogue, {
        stretch: primaryMatches.length === 0,
      }),
    );
    if (primaryMatches.length > 0 && stretchMatches.length > 0) {
      container.append(createRecommendationGroup(stretchMatches, catalogue, { stretch: true }));
    }
    announcement.textContent = isRefresh
      ? `${mainMatches.length} recommendation${mainMatches.length === 1 ? " was" : "s were"} refreshed after your edit. Focus moved to the results heading.`
      : `${mainMatches.length} recommendation${mainMatches.length === 1 ? " is" : "s are"} ready. Focus moved to the results heading.`;
  } else if (output.status === "no-match") {
    stageLabel.textContent = isRefresh ? "Edited answers produced no match" : "No suitable match";
    summary.textContent = "No verified configuration passed every hard requirement.";
    container.append(createNoMatch(output));
    announcement.textContent = isRefresh
      ? "Recommendations were refreshed after your edit, but no suitable configuration was found. Focus moved to the results heading."
      : "No suitable configuration was found. Focus moved to the results heading.";
  } else if (output.status === "budget-limited") {
    stageLabel.textContent = "No match within budget";
    summary.textContent = "Matching verified configurations were above the permitted maximum budget.";
    container.append(createBudgetLimited(output, catalogue));
    announcement.textContent = isRefresh
      ? "Recommendations were refreshed after your edit, but no configuration fit the permitted budget. Focus moved to the results heading."
      : "No configuration fit the permitted budget. Focus moved to the results heading.";
  } else {
    stageLabel.textContent = "Recommendation unavailable";
    summary.textContent = "Northstar stopped safely instead of calculating from invalid information.";
    container.append(createDataError(output));
    announcement.textContent = "Recommendations could not be calculated. Focus moved to the results heading.";
  }

  if (output.profile && output.input.answers) {
    container.append(createAnswerReview(output.input.answers, onEditAnswer));
  }
  section.dataset.state = output.status;
  title.focus();
  return true;
}

export function clearRecommendationResults() {
  const section = document.querySelector("#results");
  const stageLabel = document.querySelector("#results-stage-label");
  const summary = document.querySelector("#results-summary");
  const announcement = document.querySelector("#results-announcement");
  const container = document.querySelector("#recommendation-output");
  const restartButton = document.querySelector("#results-restart");
  if (!section || !stageLabel || !summary || !announcement || !container) return;

  closeComparison();
  section.dataset.state = "empty";
  stageLabel.textContent = "Complete the questionnaire first";
  summary.textContent =
    "Your top verified matches will appear here after the adaptive questionnaire is complete.";
  announcement.textContent = "";
  container.replaceChildren();
  restartButton?.setAttribute("hidden", "");
}
