import { getQuestionControl } from "./questionnaire-definition.js";
import { getAnswerValue } from "./questionnaire-profile.js";

const priceFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeZone: "UTC",
});

const MATCH_TYPE_DETAILS = Object.freeze({
  exact: Object.freeze({
    label: "Exact match",
    description: "Meets every must-have with no major preference trade-off.",
  }),
  closest: Object.freeze({
    label: "Closest match",
    description: "Meets every must-have, with one or more preference trade-offs to review.",
  }),
  stretch: Object.freeze({
    label: "Stretch-budget match",
    description: "Meets every must-have but costs more than your preferred budget.",
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
    description: "The result is useful, but limited detail or close scores reduce certainty.",
  }),
  low: Object.freeze({
    label: "Low",
    range: "0–54",
    description: "Limited answer detail, a lower leading fit or close rankings reduce support for the result.",
  }),
  "not-applicable": Object.freeze({
    label: "Not applicable",
    range: null,
    description: "Confidence is calculated only when an eligible ranked recommendation exists.",
  }),
});

const BLOCKER_LABELS = Object.freeze({
  availability: "current availability",
  market: "UK market data",
  "incomplete-data": "complete verified comparison data",
  budget: "maximum budget",
  storage: "minimum storage",
  "external-displays": "external monitors",
  "workload-capability": "performance needed for selected activities",
  "workload-memory": "memory needed for selected activities",
  weight: "maximum weight",
  "screen-size": "exact screen size",
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

function answerLabel(controlId, value) {
  const control = getQuestionControl(controlId);
  const labels = new Map(control.options.map((option) => [option.id, option.label]));
  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map((answerId) => labels.get(answerId) ?? answerId).join(", ")
      : "Not answered";
  }
  if (value === null || value === "" || value === undefined) {
    return control.required ? "Not answered" : "No absolute maximum";
  }
  return labels.get(value) ?? String(value);
}

export function buildAnswerReview(answers) {
  const value = (controlId) => {
    const control = getQuestionControl(controlId);
    return answerLabel(controlId, getAnswerValue(answers, control.answerPath));
  };
  const budgetParts = [value("budgetTarget")];
  if (answers.budget.mode) budgetParts.push(value("budgetMode"));
  if (answers.budget.absoluteMaximum) budgetParts.push(`Absolute maximum: ${value("absoluteBudget")}`);

  const workloadParts = [value("primaryUses"), value("activities"), value("multitasking")];
  const deviceParts = [value("portabilityPerformance"), value("screenSize")];
  const essentials = answers.essentialRequirements.includes("none")
    ? ["No additional must-haves"]
    : [value("essentialRequirements")];
  if (answers.essentialDetails.maximumWeight) {
    essentials.push(`Weight limit: ${value("maximumWeight")}`);
  }
  if (answers.essentialDetails.externalDisplayCount) {
    essentials.push(`External monitors: ${value("externalDisplayCount")}`);
  }

  return [
    {
      id: "budget",
      title: "Budget",
      summary: budgetParts.join(" · "),
      editActions: [{ questionId: "budget", label: "Edit budget" }],
    },
    {
      id: "workload",
      title: "Uses and activities",
      summary: workloadParts.join(" · "),
      editActions: [
        { questionId: "primaryUses", label: "Edit uses" },
        { questionId: "activities", label: "Edit activities" },
        { questionId: "multitasking", label: "Edit multitasking" },
      ],
    },
    {
      id: "device",
      title: "Preferences",
      summary: deviceParts.join(" · "),
      editActions: [{ questionId: "devicePreferences", label: "Edit device preferences" }],
    },
    {
      id: "storage",
      title: "Storage",
      summary:
        answers.minimumStorage === "unsure"
          ? value("minimumStorage")
          : `At least ${value("minimumStorage")}`,
      editActions: [{ questionId: "minimumStorage", label: "Edit storage" }],
    },
    {
      id: "essentials",
      title: "Must-haves",
      summary: essentials.join(" · "),
      editActions: [{ questionId: "essentialRequirements", label: "Edit must-haves" }],
    },
  ];
}

export function getMatchTypeDetails(matchType) {
  return MATCH_TYPE_DETAILS[matchType] ?? MATCH_TYPE_DETAILS.closest;
}

export function getConfidenceDetails(confidence) {
  const detail = CONFIDENCE_DETAILS[confidence?.label] ?? CONFIDENCE_DETAILS.low;
  return {
    ...detail,
    points: confidence?.points ?? null,
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
  const panel = element("details", "ranking-explanation");
  panel.append(element("summary", "", "Score and ranking details"));
  const content = element("div", "ranking-explanation-content");
  const messages = formatRankingExplanation(match);
  if (messages.length === 0) {
    content.append(element("p", "", "No ranking explanation is available."));
    panel.append(content);
    return panel;
  }
  const list = element("ul");
  list.append(
    element("li", "", `Northstar fit score: ${match.score.percent.toFixed(2)} out of 100.`),
  );
  messages.forEach((message) => list.append(element("li", "", message)));
  content.append(list);
  panel.append(content);
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
  header.append(rank, title, price, createClassificationBadge(match.matchType));

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
          "No significant trade-off was identified for your answers.",
        );

  const source = element(
    "a",
    "recommendation-source",
    "View this MacBook option on Apple UK",
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
  if (details.points === null) {
    panel.append(element("p", "", details.description));
  } else {
    panel.append(
      element("p", "confidence-score", `${details.points} out of 100 confidence points.`),
      element("p", "", details.description),
      element(
        "p",
        "confidence-thresholds",
        "Documented labels: High 80–100; Moderate 55–79; Low 0–54.",
      ),
    );
  }
  if (details.reasons.length > 0) {
    const list = element("ul", "confidence-reasons");
    details.reasons.forEach(({ message }) => list.append(element("li", "", message)));
    panel.append(list);
  }
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
      "Edit any group below. Answers that no longer apply will be cleared automatically.",
    ),
  );

  buildAnswerReview(answers).forEach((group) => {
    const groupSection = element("section", "answer-review-group");
    const groupTitle = element("h4", "", group.title);
    groupTitle.id = `answer-group-${group.id}`;
    groupSection.setAttribute("aria-labelledby", groupTitle.id);
    const summary = element("p", "answer-review-value", group.summary);
    const actions = element("div", "answer-review-actions");
    group.editActions.forEach((action) => {
      const button = element("button", "button button-secondary answer-edit-button", action.label);
      button.type = "button";
      button.dataset.editQuestionId = action.questionId;
      button.addEventListener("click", () => onEditAnswer?.(action.questionId, button));
      actions.append(button);
    });
    groupSection.append(groupTitle, summary, actions);
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

function createMethodDisclosure(output) {
  const disclosure = element("details", "results-method-details");
  const summary = element("summary", "results-method-summary", "How Northstar reached this result");
  const content = element("div", "results-method-content");
  content.append(createConfidencePanel(output.confidence), createClassificationSummary(output));
  disclosure.append(summary, content);
  return disclosure;
}

function createNoMatch(output) {
  const panel = element("div", "results-message results-message-warning");
  panel.append(
    element("h3", "", "Why no exact match was found"),
    element(
      "p",
      "",
      "No MacBook in Northstar’s verified list meets all of your must-have requirements. Nothing was relaxed automatically.",
    ),
  );
  const blockers = Object.entries(output.diagnostics.blockerCounts);
  if (blockers.length > 0) {
    panel.append(element("h4", "", "Requirements that blocked matches"));
    const list = element("ul", "results-blockers");
    blockers.forEach(([code, count]) => {
      const label = BLOCKER_LABELS[code] ?? code;
      list.append(
        element("li", "", `${label}: ${count} MacBook option${count === 1 ? "" : "s"}`),
      );
    });
    panel.append(list);
  }
  return panel;
}

function createBudgetLimited(output, catalogue) {
  const panel = element("div", "results-message results-message-warning");
  panel.append(
    element("h3", "", "No MacBook fits your maximum budget"),
    element(
      "p",
      "",
      "These MacBooks meet your other must-haves but cost more than your maximum budget. They are shown for context, not as recommendations.",
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
        : "The verified product information did not pass validation, so no recommendations were calculated.",
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

  if (output.status === "ok") {
    const primaryMatches = output.matches.slice(0, 3).map((match, index) =>
      normaliseMatch(match, index + 1, "primary"),
    );
    const stretchMatches = output.stretchMatches.slice(0, 3).map((match, index) =>
      normaliseMatch(match, index + 1, "stretch-alternative"),
    );
    const mainMatches = primaryMatches.length > 0 ? primaryMatches : stretchMatches;
    stageLabel.textContent = isRefresh ? "Recommendations refreshed" : "Your recommendations";
    summary.textContent = `${mainMatches.length} recommended MacBook option${
      mainMatches.length === 1 ? "" : "s"
    } shown with clear reasons and trade-offs.`;
    const comparisonCandidates = getComparisonCandidates(output);
    const comparisonButton = createComparisonButton(comparisonCandidates, catalogue);
    container.append(
      createRecommendationGroup(mainMatches, catalogue, {
        stretch: primaryMatches.length === 0,
      }),
    );
    if (comparisonButton) container.append(comparisonButton);
    if (primaryMatches.length > 0 && stretchMatches.length > 0) {
      container.append(createRecommendationGroup(stretchMatches, catalogue, { stretch: true }));
    }
    container.append(createMethodDisclosure(output));
    announcement.textContent = isRefresh
      ? `${mainMatches.length} recommendation${mainMatches.length === 1 ? " was" : "s were"} refreshed after your edit. Focus moved to the results heading.`
      : `${mainMatches.length} recommendation${mainMatches.length === 1 ? " is" : "s are"} ready. Focus moved to the results heading.`;
  } else if (output.status === "no-match") {
    stageLabel.textContent = isRefresh ? "Edited answers produced no exact match" : "No exact match";
    summary.textContent = "No MacBook in Northstar’s verified list meets all of your must-haves.";
    container.append(createNoMatch(output));
    announcement.textContent = isRefresh
      ? "Recommendations were refreshed after your edit, but no exact match was found. Focus moved to the results heading."
      : "No exact match was found. Focus moved to the results heading.";
  } else if (output.status === "budget-limited") {
    stageLabel.textContent = "No match within budget";
    summary.textContent = "MacBooks that meet your other must-haves cost more than your maximum budget.";
    container.append(createBudgetLimited(output, catalogue));
    announcement.textContent = isRefresh
      ? "Recommendations were refreshed after your edit, but no MacBook fit the maximum budget. Focus moved to the results heading."
      : "No MacBook fit the maximum budget. Focus moved to the results heading.";
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
