const priceFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeZone: "UTC",
});

function formatSnapshotDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

const BLOCKER_LABELS = Object.freeze({
  availability: "current availability",
  market: "UK market data",
  "incomplete-data": "complete verified data",
  budget: "maximum budget",
  storage: "minimum storage",
  "external-displays": "external displays",
  "workload-capability": "expected workload",
});

function element(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function productById(catalogue, productId) {
  return catalogue.products.find((product) => product.id === productId);
}

function createList(items, className) {
  const list = element("ul", className);
  items.forEach((item) => list.append(element("li", "", item.message)));
  return list;
}

function createResultCard(match, product) {
  const card = element("article", "recommendation-card");

  const header = element("div", "recommendation-card-header");
  const rank = element("p", "recommendation-rank", `Recommendation ${match.rank}`);
  rank.id = `recommendation-rank-${match.rank}`;
  const title = element("h3", "", product.displayName);
  title.id = `recommendation-title-${match.rank}`;
  const price = element(
    "p",
    "recommendation-price",
    `${priceFormatter.format(product.price.amountMinor / 100)} verified on ${formatSnapshotDate(product.price.snapshotDate)}`,
  );
  const score = element(
    "p",
    "recommendation-score",
    `Northstar fit score: ${match.score.percent.toFixed(2)} out of 100`,
  );
  header.append(rank, title, price, score);

  const configuration = element("p", "recommendation-configuration", product.configurationName);
  configuration.id = `recommendation-configuration-${match.rank}`;
  card.setAttribute(
    "aria-labelledby",
    `${rank.id} ${title.id} ${configuration.id}`,
  );
  const facts = element("ul", "recommendation-facts");
  [
    `${product.facts.displayDiagonalInches}-inch diagonal display`,
    `${product.facts.unifiedMemoryGb}GB unified memory`,
    `${product.facts.storageGb >= 1000 ? `${product.facts.storageGb / 1000}TB` : `${product.facts.storageGb}GB`} storage`,
    `${product.facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive} external display${
      product.facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive === 1 ? "" : "s"
    } with the built-in display active`,
  ].forEach((fact) => facts.append(element("li", "", fact)));

  const reasonsHeading = element("h4", "", "Why it matches");
  const reasons = createList(match.reasons, "recommendation-reasons");
  const compromisesHeading = element("h4", "", "What to consider");
  const compromises =
    match.compromises.length > 0
      ? createList(match.compromises, "recommendation-compromises")
      : element(
          "p",
          "recommendation-no-compromises",
          "No significant compromise was identified by the applied project rules.",
        );

  const source = element("a", "recommendation-source", "View this verified configuration on Apple UK");
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
    facts,
    reasonsHeading,
    reasons,
    compromisesHeading,
    compromises,
    source,
  );
  return card;
}

function createNoMatch(output) {
  const panel = element("div", "results-message results-message-warning");
  panel.append(
    element("h3", "", "No suitable configuration found"),
    element(
      "p",
      "",
      "Every verified configuration missed at least one hard requirement. Northstar has not shown a near match because that could silently ignore a requirement.",
    ),
  );

  const blockers = Object.entries(output.diagnostics.blockerCounts);
  if (blockers.length > 0) {
    panel.append(element("h4", "", "Requirements that blocked matches"));
    const list = element("ul", "results-blockers");
    blockers.forEach(([code, count]) => {
      const label = BLOCKER_LABELS[code] ?? code;
      list.append(element("li", "", `${label}: ${count} configuration${count === 1 ? "" : "s"}`));
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

export function renderRecommendationResults(output, catalogue) {
  const section = document.querySelector("#results");
  const title = document.querySelector("#results-title");
  const stageLabel = document.querySelector("#results-stage-label");
  const summary = document.querySelector("#results-summary");
  const announcement = document.querySelector("#results-announcement");
  const container = document.querySelector("#recommendation-output");
  const restartButton = document.querySelector("#results-restart");

  if (!section || !title || !stageLabel || !summary || !announcement || !container) return false;

  container.replaceChildren();
  restartButton?.removeAttribute("hidden");

  if (output.status === "ok") {
    const topMatches = output.matches.slice(0, 3);
    stageLabel.textContent = "Your recommendations";
    summary.textContent = `${topMatches.length} verified configuration${
      topMatches.length === 1 ? "" : "s"
    } ranked using your answers.`;
    const cards = element("div", "recommendation-list");
    topMatches.forEach((match) => {
      const product = productById(catalogue, match.productId);
      if (product) cards.append(createResultCard(match, product));
    });
    container.append(cards);
    announcement.textContent = `${topMatches.length} recommendation${
      topMatches.length === 1 ? " is" : "s are"
    } ready. Focus moved to the results heading.`;
  } else if (output.status === "no-match") {
    stageLabel.textContent = "No suitable match";
    summary.textContent = "No verified configuration passed every hard requirement.";
    container.append(createNoMatch(output));
    announcement.textContent = "No suitable configuration was found. Focus moved to the results heading.";
  } else {
    stageLabel.textContent = "Recommendation unavailable";
    summary.textContent = "Northstar stopped safely instead of calculating from invalid information.";
    container.append(createDataError(output));
    announcement.textContent = "Recommendations could not be calculated. Focus moved to the results heading.";
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

  section.dataset.state = "empty";
  stageLabel.textContent = "Complete the questionnaire first";
  summary.textContent = "Your top verified matches will appear here after all eight answers are complete.";
  announcement.textContent = "";
  container.replaceChildren();
  restartButton?.setAttribute("hidden", "");
}
