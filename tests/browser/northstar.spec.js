import { expect, test } from "@playwright/test";

import {
  choose,
  completeBaselineJourney,
  continueQuestionnaire,
  editAnswer,
  expectNoRuntimeErrors,
  openNorthstar,
  watchForRuntimeErrors,
} from "./helpers.js";

test("adaptive branching preserves answers and clears obsolete dependants", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await openNorthstar(page);

  await expect(page.locator("#questionnaire-progress-text")).toHaveText(
    "Question 1 of 11 based on your answers",
  );
  await choose(page, "button", "Continue");
  await expect(page.getByRole("alert")).toHaveText("Choose an answer before continuing.");
  await expect(page.getByRole("radio", { name: "Up to £1,000", exact: true })).toBeFocused();

  await choose(page, "radio", "I do not have a fixed target yet");
  await continueQuestionnaire(page);
  await expect(
    page.getByRole("heading", {
      name: /Required question.*What will you mainly use your MacBook for/,
    }),
  ).toBeFocused();

  await choose(page, "checkbox", "University, studying and general productivity");
  await continueQuestionnaire(page);
  await expect(page.locator("#questionnaire-progress-text")).toHaveText(
    "Question 3 of 13 based on your answers",
  );
  await expect(page.locator("#questionnaire-change-summary")).toContainText(
    "The questionnaire now has 13 questions based on your answers, previously 11.",
  );

  await choose(page, "radio", "Research, larger spreadsheets and many browser tabs");
  await continueQuestionnaire(page);
  await choose(page, "button", "Back");
  await expect(
    page.getByRole("radio", {
      name: "Research, larger spreadsheets and many browser tabs",
      exact: true,
    }),
  ).toBeChecked();
  await choose(page, "button", "Back");
  await expect(
    page.getByRole("checkbox", {
      name: "University, studying and general productivity",
      exact: true,
    }),
  ).toBeChecked();

  await choose(page, "checkbox", "Programming and software development");
  await choose(page, "checkbox", "University, studying and general productivity");
  await expect(page.locator("#questionnaire-change-summary")).toContainText(
    "One answer was cleared because it is no longer relevant: What best describes your study or productivity work?",
  );
  await expect(page.locator("#questionnaire-progress-text")).toHaveText(
    "Question 2 of 14 based on your answers",
  );

  await continueQuestionnaire(page);
  await expect(
    page.getByRole("heading", {
      name: /Optional question.*What kind of development work do you expect/,
    }),
  ).toBeFocused();
  await expect(page.locator("#questionnaire-progress-text")).toHaveText(
    "Question 3 of 14 based on your answers",
  );
  await expectNoRuntimeErrors(errors);
});

test("results editing refreshes recommendations without stale or hidden answers", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await openNorthstar(page);
  await completeBaselineJourney(page);

  await editAnswer(page, "What will you mainly use your MacBook for? Choose one or two.");
  await expect(
    page.getByRole("heading", {
      name: /Required question.*What will you mainly use your MacBook for/,
    }),
  ).toBeFocused();
  await choose(page, "checkbox", "Programming and software development");
  await choose(page, "checkbox", "University, studying and general productivity");
  await expect(page.locator("#questionnaire-change-summary")).toContainText(
    "What best describes your study or productivity work?",
  );
  await choose(page, "button", "Save answer");

  await expect(page.locator("#results-title")).toBeFocused();
  await expect(page.locator("#results-stage-label")).toHaveText("Recommendations refreshed");
  await expect(page.locator("#questionnaire-progress-text")).toHaveText(
    "Question 16 of 16 based on your answers",
  );
  const review = page.getByRole("region", { name: "Review your answers", exact: true });
  await expect(review.getByText("Programming and software development", { exact: true })).toBeVisible();
  await expect(
    review.getByText("What best describes your study or productivity work?", { exact: true }),
  ).toHaveCount(0);
  await expect(
    review.getByText("What kind of development work do you expect?", { exact: true }),
  ).toBeVisible();

  await editAnswer(page, "How much built-in storage do you need at minimum?");
  await choose(page, "radio", "1 TB");
  await choose(page, "button", "Save answer");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(review.getByText("1 TB", { exact: true })).toBeVisible();

  await editAnswer(page, "How much built-in storage do you need at minimum?");
  await expect(page.getByRole("radio", { name: "1 TB", exact: true })).toBeChecked();
  await choose(page, "radio", "512 GB");
  await choose(page, "button", "Save answer");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(review.getByText("512 GB", { exact: true })).toBeVisible();
  await expect(review.getByText("1 TB", { exact: true })).toHaveCount(0);

  await editAnswer(
    page,
    "Are any of these connection needs important to you? Select all that apply.",
  );
  await choose(page, "checkbox", "HDMI without an adapter");
  await expect(page.locator("#questionnaire-change-summary")).toContainText(
    "Are those connections a preference or a must-have?",
  );
  await choose(page, "button", "Save answer");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(
    review.getByText("Are those connections a preference or a must-have?", { exact: true }),
  ).toHaveCount(0);
  const disclosure = page.getByRole("region", {
    name: "Answers not used in ranking",
    exact: true,
  });
  await expect(disclosure.getByRole("listitem")).toHaveCount(1);
  await expect(disclosure).toContainText("Battery importance was not used");
  await expect(disclosure).not.toContainText("Connection needs were not used");
  await expectNoRuntimeErrors(errors);
});

test("classifications, confidence and comparison remain accessible and responsive", async ({
  page,
}, testInfo) => {
  const errors = watchForRuntimeErrors(page);
  await openNorthstar(page);
  await completeBaselineJourney(page);

  const confidence = page.getByRole("region", {
    name: "Recommendation confidence: Low",
    exact: true,
  });
  await expect(confidence).toContainText("Documented labels: High 80–100; Moderate 55–79; Low 0–54.");
  const classifications = page.getByRole("region", {
    name: "How to read these results",
    exact: true,
  });
  await expect(classifications).toContainText("Exact match:");
  await expect(classifications).toContainText("Closest match:");
  await expect(classifications).toContainText("Stretch-budget match:");
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Why it ranked here" })).toHaveCount(3);

  await expect(page.locator("#results-title")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#results-restart")).toBeFocused();
  await page.keyboard.press("Tab");
  const compareButton = page.getByRole("button", { name: "Compare top 3", exact: true });
  await expect(compareButton).toBeFocused();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Compare recommendations", exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.locator("#comparison-title")).toBeFocused();
  await expect(dialog.getByRole("table", { name: "Top 3 recommendation comparison" })).toBeVisible();
  await expect(dialog.getByRole("columnheader")).toHaveCount(4);
  await expect(dialog.locator(".comparison-group-row th")).toHaveCount(2);
  await expect(dialog.locator(".comparison-group-row th").first()).toHaveAttribute(
    "scope",
    "rowgroup",
  );
  const scrollRegion = dialog.getByRole("region", {
    name: "Scrollable recommendation comparison",
    exact: true,
  });
  await expect(scrollRegion).toHaveCount(1);

  const layout = await page.evaluate(() => {
    const dialogRect = document.querySelector("#comparison-dialog").getBoundingClientRect();
    const scroll = document.querySelector(".comparison-table-wrap");
    return {
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
      dialogWithinViewport:
        dialogRect.left >= 0 &&
        dialogRect.right <= window.innerWidth &&
        dialogRect.top >= 0 &&
        dialogRect.bottom <= window.innerHeight,
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
