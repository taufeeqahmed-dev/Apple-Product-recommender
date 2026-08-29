import { expect, test } from "@playwright/test";
import { QUESTIONNAIRE_STORAGE_KEY } from "../../js/questionnaire-persistence.js";

import {
  choose,
  completeBaselineJourney,
  continueQuestionnaire,
  editAnswer,
  expectNoRuntimeErrors,
  openNorthstar,
  watchForRuntimeErrors,
} from "./helpers.js";

async function createShareUrlFromStoredState(page, baseUrl = null) {
  return page.evaluate(
    async ({ key, requestedBaseUrl }) => {
      const serialized = localStorage.getItem(key);
      if (!serialized) throw new Error("No saved questionnaire state is available for export.");
      const moduleUrl = new URL("js/questionnaire-url.js", document.baseURI).href;
      const { createQuestionnaireShareUrl } = await import(moduleUrl);
      return createQuestionnaireShareUrl(
        JSON.parse(serialized),
        requestedBaseUrl ?? window.location.href,
      );
    },
    { key: QUESTIONNAIRE_STORAGE_KEY, requestedBaseUrl: baseUrl },
  );
}

async function openAbsoluteNorthstar(page, url) {
  await page.goto(url);
  await expect(page).toHaveTitle(/Northstar/);
  await expect(page.getByRole("main")).toHaveCount(1);
}

async function tabTo(page, locator, maximumTabs = 60) {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await locator.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Could not reach ${await locator.getAttribute("id")} using Tab.`);
}

test("the seven-step branch preserves answers and clears only obsolete activities", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await openNorthstar(page);

  await expect(page.locator("#questionnaire-progress-text")).toHaveText(
    "Getting to know your needs",
  );
  await expect(page.locator("#questionnaire-progress-detail")).toHaveText("Step 1 of 7");
  await expect(page.locator("#questionnaire-progress")).toHaveAttribute(
    "aria-valuetext",
    "Step 1 of 7",
  );
  await expect(page.locator("#questionnaire-progress-text")).not.toHaveAttribute("aria-live");
  const budgetFieldset = page.locator('fieldset[data-control-id="budgetTarget"]');
  await expect(budgetFieldset).toHaveAttribute(
    "aria-describedby",
    /question-help-budgetTarget/,
  );
  await expect(page.locator("#question-help-budgetTarget")).toHaveText(
    "Choose the most you’d ideally like to spend.",
  );
  await expect(page.locator("#question-heading-budget")).toHaveAttribute(
    "aria-describedby",
    "questionnaire-progress-text questionnaire-progress-detail",
  );
  await choose(page, "button", "Continue");
  await expect(page.getByRole("alert")).toHaveText("Choose an answer before continuing.");
  await expect(page.getByRole("radio", { name: "Up to £1,000", exact: true })).toBeFocused();

  await choose(page, "radio", "I’m not sure yet");
  await continueQuestionnaire(page);
  await expect(page.getByRole("heading", { name: "Choose your main uses", exact: true })).toBeFocused();

  await choose(page, "checkbox", "University, studying and general productivity");
  await continueQuestionnaire(page);
  await expect(page.locator("#questionnaire-progress-text")).toHaveText(
    "A few details left",
  );
  await expect(page.locator("#questionnaire-progress-detail")).toHaveText("Step 3 of 7");
  await choose(page, "checkbox", "Research, large spreadsheets and many browser tabs");
  await continueQuestionnaire(page);
  await choose(page, "button", "Back");
  await expect(
    page.getByRole("checkbox", {
      name: "Research, large spreadsheets and many browser tabs",
      exact: true,
    }),
  ).toBeChecked();
  await choose(page, "button", "Back");
  await choose(page, "checkbox", "Programming and software development");
  await choose(page, "checkbox", "University, studying and general productivity");
  await expect(page.locator("#questionnaire-change-summary")).toContainText(
    "Research, large spreadsheets and many browser tabs",
  );
  await expect(page.locator("#questionnaire-progress-text")).toHaveText(
    "Getting to know your needs",
  );

  await continueQuestionnaire(page);
  await expect(page.getByRole("heading", { name: "Tell us what you’ll do", exact: true })).toBeFocused();
  await expect(page.getByRole("checkbox", { name: "Docker or containers", exact: true })).toBeVisible();
  await expect(
    page.getByRole("checkbox", {
      name: "Research, large spreadsheets and many browser tabs",
      exact: true,
    }),
  ).toHaveCount(0);

  await choose(page, "checkbox", "Docker or containers");
  await continueQuestionnaire(page);
  await choose(page, "radio", "Heavy — demanding apps, development tools or one virtual machine");
  await continueQuestionnaire(page);
  await choose(page, "radio", "A balance of both");
  await choose(page, "radio", "14-inch");
  await continueQuestionnaire(page);
  await choose(page, "radio", "512 GB");
  await continueQuestionnaire(page);
  await choose(page, "checkbox", "Stay within a strict weight limit");
  await choose(
    page,
    "checkbox",
    "Support the number of external monitors I need",
  );
  await expect(page.locator("#questionnaire-change-summary")).not.toContainText(
    "essential-detail question was added",
  );
  await continueQuestionnaire(page);
  await expect(page.locator("#questionnaire-progress-text")).toHaveText(
    "Almost ready",
  );
  await expect(page.locator("#questionnaire-progress-detail")).toHaveText("Step 8 of 9");
  await expect(page.locator("#questionnaire-change-summary")).toContainText(
    "2 essential-detail questions follow so Northstar can apply your must-haves.",
  );
  await expect(page.locator("#questionnaire-change-summary")).not.toContainText(
    "questions based on your answers",
  );

  await choose(page, "radio", "1.25 kg");
  await continueQuestionnaire(page);
  const monitorFieldset = page.locator('fieldset[data-control-id="externalDisplayCount"]');
  await expect(monitorFieldset).toHaveAttribute(
    "aria-describedby",
    /question-help-externalDisplayCount/,
  );
  await expect(page.locator("#question-help-externalDisplayCount")).toHaveText(
    "This means external monitors used at the same time as the MacBook’s built-in screen.",
  );
  await choose(page, "radio", "Four or more");
  await choose(page, "button", "See recommendations");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(page.getByRole("heading", { name: "Why no exact match was found" })).toBeVisible();
  await expect(page.getByRole("region", { name: /Recommendation confidence:/ })).toHaveCount(0);
  await expect(page.locator(".results-blockers")).toContainText("maximum weight:");
  await expect(page.locator(".results-blockers")).toContainText("external monitors:");
  await expectNoRuntimeErrors(errors);
});

test("grouped results editing refreshes recommendations without stale state", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await openNorthstar(page);
  await completeBaselineJourney(page);
  await expect(page.locator("#results-title")).toBeFocused();

  await editAnswer(page, "Edit uses");
  await expect(page.getByRole("heading", { name: "Choose your main uses", exact: true })).toBeFocused();
  await choose(page, "checkbox", "Programming and software development");
  await choose(page, "checkbox", "University, studying and general productivity");
  await expect(page.locator("#questionnaire-change-summary")).toContainText(
    "Research, large spreadsheets and many browser tabs",
  );
  await choose(page, "button", "Save changes");

  await expect(page.getByRole("heading", { name: "Tell us what you’ll do", exact: true })).toBeFocused();
  await choose(page, "checkbox", "Docker or containers");
  await choose(page, "button", "Save changes");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(page.locator("#results-stage-label")).toHaveText("Recommendations refreshed");

  const review = page.getByRole("region", { name: "Review your answers", exact: true });
  await expect(review).toContainText("Programming and software development");
  await expect(review).toContainText("Docker or containers");
  await expect(review).not.toContainText("Research, large spreadsheets and many browser tabs");

  await editAnswer(page, "Edit storage");
  await choose(page, "radio", "1 TB");
  await choose(page, "button", "Save changes");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(review).toContainText("At least 1 TB");

  await editAnswer(page, "Edit must-haves");
  await choose(page, "checkbox", "Stay within a strict weight limit");
  await choose(page, "button", "Save changes");
  await expect(page.getByRole("heading", { name: "Set your weight limit", exact: true })).toBeFocused();
  await choose(page, "radio", "1.55 kg");
  await choose(page, "button", "Save changes");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(review).toContainText("Weight limit: 1.55 kg");

  await editAnswer(page, "Edit must-haves");
  await choose(page, "checkbox", "None — find the best overall balance");
  await expect(page.locator("#questionnaire-change-summary")).toContainText("1.55 kg");
  await choose(page, "button", "Save changes");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(review).toContainText("No additional must-haves");
  await expect(review).not.toContainText("Weight limit: 1.55 kg");
  await expectNoRuntimeErrors(errors);
});

test("classifications, confidence and comparison remain accessible and responsive", async ({
  page,
}, testInfo) => {
  const errors = watchForRuntimeErrors(page);
  await openNorthstar(page);
  await completeBaselineJourney(page);

  const confidence = page.getByRole("region", { name: /Recommendation confidence:/ });
  const methodDetails = page.locator(".results-method-details");
  await expect(methodDetails).not.toHaveAttribute("open", "");
  await expect(confidence).toBeHidden();
  await page.getByText("How Northstar reached this result", { exact: true }).click();
  await expect(confidence).toBeVisible();
  await expect(confidence).toContainText("Documented labels: High 80–100; Moderate 55–79; Low 0–54.");
  const classifications = page.getByRole("region", { name: "How to read these results", exact: true });
  await expect(classifications).toContainText("Exact match:");
  await expect(classifications).toContainText("Closest match:");
  await expect(classifications).toContainText("Stretch-budget match:");
  await expect(page.getByRole("article")).toHaveCount(3);
  const rankingDetails = page.getByText("Score and ranking details", { exact: true });
  await expect(rankingDetails).toHaveCount(3);
  await expect(page.getByText(/Northstar fit score:/).first()).toBeHidden();
  await page.getByText("How Northstar reached this result", { exact: true }).click();

  const cardWidths = await page.locator(".primary-results .recommendation-card").evaluateAll(
    (cards) => cards.map((card) => card.getBoundingClientRect().width),
  );
  expect(cardWidths).toHaveLength(3);
  if (testInfo.project.name === "desktop") {
    expect(cardWidths[0]).toBeGreaterThan(cardWidths[1]);
  } else {
    expect(Math.abs(cardWidths[0] - cardWidths[1])).toBeLessThan(2);
  }

  const methodSummary = page.getByText("How Northstar reached this result", { exact: true });
  await expect(methodSummary).toBeFocused();
  const compareButton = page.getByRole("button", { name: "Compare top 3", exact: true });
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press("Shift+Tab");
    if (await compareButton.evaluate((button) => button === document.activeElement)) break;
  }
  await expect(compareButton).toBeFocused();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Compare recommendations", exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.locator("#comparison-title")).toBeFocused();
  await expect(dialog.getByRole("table", { name: "Top 3 recommendation comparison" })).toBeVisible();
  await expect(dialog.getByRole("columnheader")).toHaveCount(4);
  const scrollRegion = dialog.getByRole("region", {
    name: "Scrollable recommendation comparison",
    exact: true,
  });

  const layout = await page.evaluate(() => {
    const dialogRect = document.querySelector("#comparison-dialog").getBoundingClientRect();
    const scroll = document.querySelector(".comparison-table-wrap");
    return {
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
      dialogWithinViewport:
        dialogRect.left >= 0 && dialogRect.right <= window.innerWidth &&
        dialogRect.top >= 0 && dialogRect.bottom <= window.innerHeight,
      tableOverflow: scroll.scrollWidth > scroll.clientWidth,
    };
  });
  expect(layout.pageOverflow).toBe(false);
  expect(layout.dialogWithinViewport).toBe(true);
  expect(layout.tableOverflow).toBe(testInfo.project.name !== "desktop");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(compareButton).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close comparison", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(scrollRegion).toBeFocused();
  if (testInfo.project.name !== "desktop") {
    const before = await scrollRegion.evaluate((element) => element.scrollLeft);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => scrollRegion.evaluate((element) => element.scrollLeft)).toBeGreaterThan(before);
  }
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(compareButton).toBeFocused();
  await expectNoRuntimeErrors(errors);
});

test("completed results can be shared and copied with accessible keyboard feedback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async writeText(value) {
          window.__northstarCopiedUrl = value;
        },
      },
    });
  });
  const errors = watchForRuntimeErrors(page);
  await openNorthstar(page);
  await completeBaselineJourney(page);

  const shareTrigger = page.getByRole("button", { name: "Share results", exact: true });
  await expect(shareTrigger).toBeVisible();
  await tabTo(page, shareTrigger);
  await expect(shareTrigger).toBeFocused();
  await page.keyboard.press("Enter");

  const sharePanel = page.getByRole("region", { name: "Share this result", exact: true });
  await expect(sharePanel).toBeVisible();
  await expect(page.locator("#results-share-title")).toBeFocused();
  await expect(sharePanel).toContainText(
    "Anyone with this link can view the questionnaire choices included in it.",
  );
  await expect(sharePanel).toContainText("no account or saved browser metadata");
  await expect(sharePanel).toContainText("recalculates recommendations");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close sharing", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  const copyButton = page.getByRole("button", { name: "Copy link", exact: true });
  await expect(copyButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#results-share-status")).toHaveText("Recommendation link copied.");
  await expect(page.locator("#results-share-fallback")).toBeHidden();

  const copiedUrl = await page.evaluate(() => window.__northstarCopiedUrl);
  expect(new URL(copiedUrl).hash).toMatch(/^#northstar=v1\./);
  expect(copiedUrl).not.toContain("MacBook");
  await page.getByRole("button", { name: "Close sharing", exact: true }).click();
  await expect(shareTrigger).toBeFocused();
  await expect(page.locator("#results-share-status")).toBeHidden();
  await expect(page.locator("#results-share-url")).toHaveValue("");
  await expectNoRuntimeErrors(errors);
});

test("clipboard failure exposes a selected manual-copy field without mobile overflow", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async writeText() {
          throw new DOMException("Clipboard permission denied", "NotAllowedError");
        },
      },
    });
  });
  const errors = watchForRuntimeErrors(page);
  await openNorthstar(page);
  await completeBaselineJourney(page);
  await page.getByRole("button", { name: "Share results", exact: true }).click();
  await page.getByRole("button", { name: "Copy link", exact: true }).click();

  await expect(page.locator("#results-share-status")).toHaveText("Copy this link manually.");
  const fallback = page.locator("#results-share-fallback");
  const urlField = page.getByRole("textbox", { name: "Recommendation link", exact: true });
  await expect(fallback).toBeVisible();
  await expect(urlField).toBeFocused();
  await expect(urlField).toHaveAttribute("readonly", "");
  await expect(urlField).toHaveValue(/^http:\/\/127\.0\.0\.1:4173\/#northstar=v1\./);
  expect(
    await urlField.evaluate((field) =>
      field.selectionStart === 0 && field.selectionEnd === field.value.length,
    ),
  ).toBe(true);

  const layout = await page.evaluate(() => {
    const panel = document.querySelector("#results-share-panel").getBoundingClientRect();
    const field = document.querySelector("#results-share-url").getBoundingClientRect();
    const copy = document.querySelector("#results-share-copy").getBoundingClientRect();
    return {
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
      panelWithinPage: panel.left >= 0 && panel.right <= window.innerWidth,
      fieldWithinPanel: field.left >= panel.left && field.right <= panel.right,
      copyHeight: copy.height,
    };
  });
  expect(layout.pageOverflow).toBe(false);
  expect(layout.panelWithinPage).toBe(true);
  expect(layout.fieldWithinPanel).toBe(true);
  expect(layout.copyHeight).toBeGreaterThanOrEqual(44);

  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Copy link", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Close sharing", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Share results", exact: true })).toBeFocused();
  await expectNoRuntimeErrors(errors);
});

test("saved partial progress is offered explicitly and can be continued or discarded", async ({
  page,
}) => {
  const errors = watchForRuntimeErrors(page);
  await openNorthstar(page);
  await choose(page, "radio", "I’m not sure yet");
  await continueQuestionnaire(page);
  await choose(page, "checkbox", "University, studying and general productivity");

  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), QUESTIONNAIRE_STORAGE_KEY))
    .not.toBeNull();
  await page.reload();

  const resume = page.getByRole("region", { name: "Continue where you left off?", exact: true });
  const continueSaved = resume.getByRole("button", { name: "Continue", exact: true });
  await expect(resume).toBeVisible();
  await expect(resume).toContainText("saved only in this browser on this device");
  await expect(resume).toContainText("not uploaded to Northstar");
  await expect(page.locator("#questionnaire-form")).toBeHidden();

  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press("Tab");
    if (await continueSaved.evaluate((button) => button === document.activeElement)) break;
  }
  await expect(continueSaved).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Choose your main uses", exact: true })).toBeFocused();
  await expect(
    page.getByRole("checkbox", {
      name: "University, studying and general productivity",
      exact: true,
    }),
  ).toBeChecked();
  await expect(page.locator("#questionnaire-change-summary")).toContainText(
    "Saved progress restored",
  );

  await page.reload();
  await expect(resume).toBeVisible();
  const startAgain = resume.getByRole("button", { name: "Start again", exact: true });
  await startAgain.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Set your budget", exact: true })).toBeFocused();
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(page.locator("#questionnaire-change-summary")).toContainText("Saved progress cleared");
  expect(await page.evaluate((key) => localStorage.getItem(key), QUESTIONNAIRE_STORAGE_KEY)).toBeNull();

  await page.reload();
  await expect(resume).toBeHidden();
  await expect(page.locator("#questionnaire-form")).toBeVisible();
  await expectNoRuntimeErrors(errors);
});

test("completed progress is recalculated on restore and confirmed restart prevents another resume", async ({
  page,
}) => {
  const errors = watchForRuntimeErrors(page);
  await openNorthstar(page);
  await completeBaselineJourney(page);
  const firstResultBeforeReload = await page.locator(".recommendation-card h3").first().textContent();
  const storedBeforeReload = await page.evaluate(
    (key) => localStorage.getItem(key),
    QUESTIONNAIRE_STORAGE_KEY,
  );
  expect(storedBeforeReload).not.toBeNull();
  expect(storedBeforeReload).not.toContain("MacBook");
  expect(storedBeforeReload).not.toContain("recommendation");
  expect(storedBeforeReload).not.toContain("confidence");

  await page.reload();
  const resume = page.getByRole("region", { name: "Continue where you left off?", exact: true });
  await expect(resume).toBeVisible();
  await resume.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.locator(".recommendation-card h3").first()).toHaveText(firstResultBeforeReload);

  await page.getByRole("button", { name: "Restart questionnaire", exact: true }).last().click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), QUESTIONNAIRE_STORAGE_KEY))
    .toBe(storedBeforeReload);

  await page.getByRole("button", { name: "Restart questionnaire", exact: true }).last().click();
  await page.getByRole("button", { name: "Yes, restart", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Set your budget", exact: true })).toBeFocused();
  expect(await page.evaluate((key) => localStorage.getItem(key), QUESTIONNAIRE_STORAGE_KEY)).toBeNull();

  await page.reload();
  await expect(resume).toBeHidden();
  await expect(page.locator("#questionnaire-form")).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  await expectNoRuntimeErrors(errors);
});

test("a partial share URL restores an adaptive journey in a fresh browser context", async ({
  page,
  browser,
}) => {
  const sourceErrors = watchForRuntimeErrors(page);
  await openNorthstar(page);
  await choose(page, "radio", "I’m not sure yet");
  await continueQuestionnaire(page);
  await choose(page, "checkbox", "University, studying and general productivity");
  await continueQuestionnaire(page);
  await choose(page, "checkbox", "Research, large spreadsheets and many browser tabs");
  const shareUrl = await createShareUrlFromStoredState(page);

  const freshContext = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const sharedPage = await freshContext.newPage();
  const sharedErrors = watchForRuntimeErrors(sharedPage);
  await openAbsoluteNorthstar(sharedPage, shareUrl);
  const importedUrl = sharedPage.url();

  const importRegion = sharedPage.getByRole("region", {
    name: "Open shared questionnaire?",
    exact: true,
  });
  await expect(importRegion).toBeVisible();
  await expect(importRegion).toContainText("Anyone with the link can recover its questionnaire choices");
  const adoptButton = importRegion.getByRole("button", {
    name: "Continue with shared answers",
    exact: true,
  });
  await adoptButton.focus();
  await sharedPage.keyboard.press("Enter");

  await expect(sharedPage.getByRole("heading", { name: "Tell us what you’ll do", exact: true })).toBeFocused();
  await expect(
    sharedPage.getByRole("checkbox", {
      name: "Research, large spreadsheets and many browser tabs",
      exact: true,
    }),
  ).toBeChecked();
  await expect(sharedPage.locator("#questionnaire-change-summary")).toContainText(
    "These answers came from a shared link",
  );
  await continueQuestionnaire(sharedPage);
  await expect(sharedPage.getByRole("heading", { name: "Tell us about multitasking", exact: true })).toBeFocused();
  expect(sharedPage.url()).not.toBe(importedUrl);
  expect(new URL(sharedPage.url()).hash).toMatch(/^#northstar=v1\./);
  const adoptedStorage = await sharedPage.evaluate(
    (key) => localStorage.getItem(key),
    QUESTIONNAIRE_STORAGE_KEY,
  );
  expect(adoptedStorage).toMatch(/^\{/);
  expect(adoptedStorage).not.toContain("northstar=v1");
  await expectNoRuntimeErrors(sourceErrors);
  await expectNoRuntimeErrors(sharedErrors);
  await freshContext.close();
});

test("a complete share URL recalculates recommendations in a fresh browser context", async ({
  page,
  browser,
}) => {
  const sourceErrors = watchForRuntimeErrors(page);
  await openNorthstar(page);
  await completeBaselineJourney(page);
  const expectedFirstResult = await page.locator(".recommendation-card h3").first().textContent();
  const shareUrl = await createShareUrlFromStoredState(page);

  const freshContext = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const sharedPage = await freshContext.newPage();
  const sharedErrors = watchForRuntimeErrors(sharedPage);
  await openAbsoluteNorthstar(sharedPage, shareUrl);
  await sharedPage.getByRole("button", { name: "Continue with shared answers", exact: true }).click();

  await expect(sharedPage.locator("#results-title")).toBeFocused();
  await expect(sharedPage.locator("#results-shared-notice")).toContainText(
    "Shared recommendation loaded",
  );
  await expect(sharedPage.locator("#results-shared-notice")).toContainText(
    "recalculated the result using its current verified catalogue",
  );
  await expect(sharedPage.locator("#results-announcement")).toContainText(
    "Shared recommendation loaded",
  );
  await expect(sharedPage.getByRole("article")).toHaveCount(3);
  await expect(sharedPage.locator(".recommendation-card h3").first()).toHaveText(expectedFirstResult);
  const stored = await sharedPage.evaluate(
    (key) => localStorage.getItem(key),
    QUESTIONNAIRE_STORAGE_KEY,
  );
  expect(stored).not.toContain("MacBook");
  expect(stored).not.toContain("recommendation");
  expect(stored).not.toContain("confidence");
  await expectNoRuntimeErrors(sourceErrors);
  await expectNoRuntimeErrors(sharedErrors);
  await freshContext.close();
});

test("valid shared state takes precedence without touching different local progress", async ({
  page,
  browser,
}) => {
  await openNorthstar(page);
  await choose(page, "radio", "I’m not sure yet");
  await continueQuestionnaire(page);
  await choose(page, "checkbox", "University, studying and general productivity");
  await continueQuestionnaire(page);
  const shareUrl = await createShareUrlFromStoredState(page);

  const localContext = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const localPage = await localContext.newPage();
  const localErrors = watchForRuntimeErrors(localPage);
  await openAbsoluteNorthstar(localPage, "http://127.0.0.1:4173/");
  await choose(localPage, "radio", "I’m not sure yet");
  await continueQuestionnaire(localPage);
  await choose(localPage, "checkbox", "Programming and software development");
  const localBeforeShare = await localPage.evaluate(
    (key) => localStorage.getItem(key),
    QUESTIONNAIRE_STORAGE_KEY,
  );

  await localPage.goto("about:blank");
  await openAbsoluteNorthstar(localPage, shareUrl);
  await expect(localPage.getByRole("region", { name: "Open shared questionnaire?", exact: true })).toBeVisible();
  await expect(localPage.locator("#questionnaire-shared")).toContainText(
    "saved in this browser stays untouched",
  );
  expect(await localPage.evaluate((key) => localStorage.getItem(key), QUESTIONNAIRE_STORAGE_KEY))
    .toBe(localBeforeShare);
  await localPage.getByRole("button", { name: "Continue with shared answers", exact: true }).click();
  const localAfterAdoption = await localPage.evaluate(
    (key) => localStorage.getItem(key),
    QUESTIONNAIRE_STORAGE_KEY,
  );
  expect(localAfterAdoption).not.toBe(localBeforeShare);
  expect(localAfterAdoption).toContain("study-productivity");
  expect(localAfterAdoption).not.toContain("software-development");
  await expect(localPage.getByRole("heading", { name: "Tell us what you’ll do", exact: true })).toBeFocused();
  await expectNoRuntimeErrors(localErrors);
  await localContext.close();
});

test("an invalid share link shows accessible recovery and preserves local progress", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await openNorthstar(page);
  await choose(page, "radio", "I’m not sure yet");
  await continueQuestionnaire(page);
  await choose(page, "checkbox", "University, studying and general productivity");
  const localBeforeInvalidLink = await page.evaluate(
    (key) => localStorage.getItem(key),
    QUESTIONNAIRE_STORAGE_KEY,
  );

  await page.goto("about:blank");
  await page.goto("/#northstar=v1.!!!!");
  const recovery = page.getByRole("region", {
    name: "This shared link couldn’t be used",
    exact: true,
  });
  await expect(recovery).toBeVisible();
  await expect(recovery).toContainText("No progress saved in this browser was changed");
  await expect(recovery).not.toContainText("!!!!");
  expect(new URL(page.url()).hash).toBe("");
  expect(await page.evaluate((key) => localStorage.getItem(key), QUESTIONNAIRE_STORAGE_KEY))
    .toBe(localBeforeInvalidLink);

  const continueButton = recovery.getByRole("button", {
    name: "Continue without shared link",
    exact: true,
  });
  await continueButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Continue where you left off?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose your main uses", exact: true })).toBeFocused();
  await expectNoRuntimeErrors(errors);
});

test("share URLs import correctly from the GitHub Pages repository subpath", async ({
  page,
  browser,
}) => {
  const errors = watchForRuntimeErrors(page);
  await openAbsoluteNorthstar(page, "http://127.0.0.1:4173/apple-product-recommender/");
  await choose(page, "radio", "I’m not sure yet");
  await continueQuestionnaire(page);
  await choose(page, "checkbox", "University, studying and general productivity");
  const shareUrl = await createShareUrlFromStoredState(page);
  expect(new URL(shareUrl).pathname).toBe("/apple-product-recommender/");

  const freshContext = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const sharedPage = await freshContext.newPage();
  const sharedErrors = watchForRuntimeErrors(sharedPage);
  await openAbsoluteNorthstar(sharedPage, shareUrl);
  await expect(sharedPage.getByRole("region", { name: "Open shared questionnaire?", exact: true })).toBeVisible();
  await sharedPage.getByRole("button", { name: "Continue with shared answers", exact: true }).click();
  await expect(sharedPage.getByRole("heading", { name: "Choose your main uses", exact: true })).toBeFocused();
  await expect(
    sharedPage.getByRole("checkbox", {
      name: "University, studying and general productivity",
      exact: true,
    }),
  ).toBeChecked();
  await expectNoRuntimeErrors(errors);
  await expectNoRuntimeErrors(sharedErrors);
  await freshContext.close();
});
