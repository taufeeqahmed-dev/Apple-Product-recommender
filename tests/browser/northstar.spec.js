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

  await page.locator("body").focus();
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
