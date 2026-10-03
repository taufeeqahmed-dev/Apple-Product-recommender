import { expect, test } from "@playwright/test";
import { createQuestionnaireState } from "../../js/questionnaire-serialization.js";
import { createQuestionnaireShareUrl } from "../../js/questionnaire-url.js";
import { QUESTIONNAIRE_STORAGE_KEY } from "../../js/questionnaire-persistence.js";
import { insightAnswers } from "../fixtures/recommendation-insight-scenarios.js";
import { choose, completeBaselineJourney, editAnswer, expectNoRuntimeErrors,
  openNorthstar, watchForRuntimeErrors } from "./helpers.js";

async function restoreAnswers(page, answers) {
  const state = createQuestionnaireState({ status: "complete", currentQuestionId: "essentialRequirements", answers });
  await page.addInitScript(({ key, serialized }) => localStorage.setItem(key, serialized),
    { key: QUESTIONNAIRE_STORAGE_KEY, serialized: JSON.stringify(state) });
  await openNorthstar(page);
  await page.getByRole("region", { name: "Continue where you left off?", exact: true })
    .getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("#results-title")).toBeFocused();
  return state;
}

test("normal completion shows one leading brief with native keyboard disclosure and no legacy duplication", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await openNorthstar(page);
  await completeBaselineJourney(page);
  const brief = page.getByRole("region", { name: "Why this fits", exact: true });
  await expect(brief).toHaveCount(1);
  await expect(page.locator(".recommendation-card").first().locator(".decision-brief")).toHaveCount(1);
  await expect(page.locator(".recommendation-card").first().locator(".recommendation-reasons, .recommendation-compromises")).toHaveCount(0);
  await expect(page.locator(".recommendation-card").nth(1).locator(".decision-brief")).toHaveCount(0);
  await expect(page.locator(".recommendation-card").nth(1).locator(".recommendation-reasons")).toHaveCount(1);
  await expect(brief.getByRole("heading", { name: "Why this fits", level: 4 })).toBeVisible();
  const disclosure = brief.locator("details");
  const summary = disclosure.locator("summary");
  await expect(disclosure).not.toHaveAttribute("open", "");
  await expect(brief.locator("dl")).toBeHidden();
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    if (await summary.evaluate((node) => node === document.activeElement)) break;
  }
  await expect(summary).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(disclosure).toHaveAttribute("open", "");
  await expect(summary).toBeFocused();
  for (const label of ["Your answer", "Northstar-derived need", "Verified Apple fact"]) {
    await expect(brief.locator("dt").filter({ hasText: label }).first()).toBeVisible();
  }
  const sourceLinks = disclosure.getByRole("link", { name: /^Apple .+ source for .+ \(opens in a new tab\)$/ });
  const reachSourceLinks = async () => {
    await expect(sourceLinks.first()).toBeVisible();
    const count = await sourceLinks.count();
    for (let index = 0; index < count; index += 1) {
      await page.keyboard.press("Tab");
      await expect(sourceLinks.nth(index)).toBeFocused();
    }
    for (let index = 0; index < count; index += 1) await page.keyboard.press("Shift+Tab");
    await expect(summary).toBeFocused();
  };
  await reachSourceLinks();
  await page.keyboard.press("Space");
  await expect(disclosure).toHaveJSProperty("open", false);
  await expect(summary).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  expect(await disclosure.evaluate((node) => node.contains(document.activeElement))).toBe(false);
  expect(await page.locator(":focus").evaluate((node) => node.tabIndex)).toBeGreaterThanOrEqual(0);
  await expect(sourceLinks).toHaveCount(0);
  await page.keyboard.press("Shift+Tab");
  await expect(summary).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(disclosure).toHaveJSProperty("open", true);
  await reachSourceLinks();
  await expectNoRuntimeErrors(errors);
});

test("exact leader preserves snapshot provenance and reflows at 320px with reduced motion", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await restoreAnswers(page, insightAnswers("everyday"));
  const brief = page.locator(".decision-brief");
  await expect(page.locator(".recommendation-card").first()).toHaveAttribute("data-match-type", "exact");
  await expect(brief).toContainText("Northstar identified no significant compromise for these answers.");
  await expect(brief).toContainText("The leading recommendations have similar fit scores.");
  await expect(brief.locator(".decision-brief-confidence")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 844 });
  await brief.locator("summary").click();
  await expect(brief).toContainText("31 July 2026");
  const source = brief.getByRole("link").first();
  await expect(source).toHaveAccessibleName(/Apple buying source.*opens in a new tab/);
  const layout = await page.evaluate(() => {
    const brief = document.querySelector(".decision-brief");
    const rect = brief.getBoundingClientRect();
    const controls = [...brief.querySelectorAll("summary, a")].map((node) => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height };
    });
    return { pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
      briefOverflow: brief.scrollWidth > brief.clientWidth,
      contained: rect.left >= 0 && rect.right <= window.innerWidth,
      controls, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      scrollBehaviour: getComputedStyle(document.documentElement).scrollBehavior };
  });
  expect(layout.pageOverflow).toBe(false);
  expect(layout.briefOverflow).toBe(false);
  expect(layout.contained).toBe(true);
  expect(layout.reduced).toBe(true);
  expect(layout.scrollBehaviour).toBe("auto");
  layout.controls.forEach(({ width, height }) => {
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  });
  await expectNoRuntimeErrors(errors);
});

test("closest leader keeps its main compromise visible and has no fabricated runner-up", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await restoreAnswers(page, insightAnswers("portability-compromise"));
  const brief = page.locator(".decision-brief");
  await expect(page.locator(".recommendation-card").first()).toHaveAttribute("data-match-type", "closest");
  await expect(brief.locator(".decision-brief-consideration")).toContainText("weaker fit for your portability and weight preferences");
  await expect(brief.locator(".decision-brief-runner")).toHaveCount(0);
  await expect(brief.locator(".decision-brief-more-count")).toBeVisible();
  await brief.locator("summary").click();
  await expect(brief).toContainText("Its storage meets your minimum without extra built-in space.");
  await expectNoRuntimeErrors(errors);
});

test("stretch-only leader receives the brief and compares only within its stretch group", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  const answers = insightAnswers("everyday");
  answers.budget = { target: "up-to-1000", mode: "flexible", absoluteMaximum: "up-to-4500" };
  answers.minimumStorage = "1tb";
  await restoreAnswers(page, answers);
  await expect(page.locator(".primary-results")).toHaveCount(0);
  await expect(page.locator(".stretch-results .recommendation-card").first().locator(".decision-brief")).toHaveCount(1);
  const brief = page.locator(".decision-brief");
  await expect(brief).toContainText("above your preferred budget target");
  await expect(brief.locator(".decision-brief-runner")).toContainText("Next in the same result group:");
  await brief.locator("summary").click();
  await expect(brief).toContainText("£1,000.00 preferred budget target");
  await expect(brief).toContainText("£4,500.00 maximum permitted budget");
  await expectNoRuntimeErrors(errors);
});

test("saving an edit rebuilds the brief while cancelling preserves the existing disclosure", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await openNorthstar(page);
  await completeBaselineJourney(page);
  const brief = page.locator(".decision-brief");
  await brief.locator("summary").click();
  const before = await brief.textContent();
  await editAnswer(page, "Edit storage");
  await choose(page, "button", "Cancel edit");
  await expect(brief.locator("details")).toHaveAttribute("open", "");
  expect(await brief.textContent()).toBe(before);
  await editAnswer(page, "Edit storage");
  await choose(page, "radio", "1 TB");
  await choose(page, "button", "Save changes");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(brief.locator("details")).not.toHaveAttribute("open", "");
  expect(await brief.textContent()).not.toBe(before);
  await brief.locator("summary").click();
  await expect(brief).toContainText("1000 GB minimum built-in storage");
  await expect(brief).not.toContainText("512 GB minimum built-in storage");
  await expectNoRuntimeErrors(errors);
});

test("restored and shared answers reconstruct the same brief without serializing its evidence", async ({ page, browser }) => {
  const errors = watchForRuntimeErrors(page);
  const state = await restoreAnswers(page, insightAnswers("everyday"));
  const expected = await page.locator(".decision-brief").textContent();
  const sharedUrl = createQuestionnaireShareUrl(state, page.url());
  const context = await browser.newContext({ viewport: page.viewportSize() });
  const shared = await context.newPage();
  const sharedErrors = watchForRuntimeErrors(shared);
  await shared.goto(sharedUrl);
  await shared.getByRole("button", { name: "Continue with shared answers", exact: true }).click();
  await expect(shared.locator("#results-title")).toBeFocused();
  expect(await shared.locator(".decision-brief").textContent()).toBe(expected);
  await expect(shared.locator(".decision-brief details")).not.toHaveAttribute("open", "");
  const stored = await shared.evaluate((key) => localStorage.getItem(key), QUESTIONNAIRE_STORAGE_KEY);
  expect(stored).not.toMatch(/evidence|assessment|recommendation|confidence|MacBook/);
  await shared.reload();
  await shared.getByRole("button", { name: "Continue with shared answers", exact: true }).click();
  expect(await shared.locator(".decision-brief").textContent()).toBe(expected);
  await expectNoRuntimeErrors(errors);
  await expectNoRuntimeErrors(sharedErrors);
  await context.close();
});

for (const module of ["recommendation-insights", "recommendation-insight-presentation"]) {
  test(`${module} failure retains valid recommendation cards and legacy explanations`, async ({ page }) => {
    const errors = watchForRuntimeErrors(page);
    const functionName = module === "recommendation-insights"
      ? "buildRecommendationInsights" : "buildRecommendationInsightPresentation";
    await page.route(`**/js/${module}.js`, (route) => route.fulfill({
      contentType: "application/javascript",
      body: `export function ${functionName}() { throw new TypeError('Synthetic explanation failure'); }`,
    }));
    await restoreAnswers(page, insightAnswers("development"));
    await expect(page.locator("#results")).toHaveAttribute("data-state", "ok");
    await expect(page.locator(".decision-brief")).toHaveCount(0);
    const leader = page.locator(".recommendation-card").first();
    await expect(leader.locator(".recommendation-reasons")).toBeVisible();
    await expect(leader.locator(".recommendation-compromises")).toBeVisible();
    await expect(page.locator("#recommendation-title-macbook-pro-14-m5-pro-15cpu-16gpu-24gb-1tb")).toBeVisible();
    await expectNoRuntimeErrors(errors);
  });
}
