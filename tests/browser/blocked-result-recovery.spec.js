import { expect, test } from "@playwright/test";
import { createQuestionnaireState, serializeQuestionnaireState } from "../../js/questionnaire-serialization.js";
import { getVisibleQuestionIds } from "../../js/questionnaire-profile.js";
import { QUESTIONNAIRE_STORAGE_KEY } from "../../js/questionnaire-persistence.js";
import { createQuestionnaireShareUrl } from "../../js/questionnaire-url.js";
import { recoveryAnswers } from "../fixtures/recommendation-recovery-scenarios.js";
import { choose, expectNoRuntimeErrors, openNorthstar, watchForRuntimeErrors } from "./helpers.js";

const recoveryPanel = (page) => page.getByRole("region", { name: "Review blocking requirements", exact: true });
const canonical = (answers) => createQuestionnaireState({ status: "complete",
  currentQuestionId: getVisibleQuestionIds(answers).at(-1), answers });
const savedBytes = (page) => page.evaluate((key) => localStorage.getItem(key), QUESTIONNAIRE_STORAGE_KEY);

async function restore(page, scenario, session = "saved") {
  const state = canonical(recoveryAnswers(scenario));
  if (session === "shared") {
    await page.goto(createQuestionnaireShareUrl(state, "http://127.0.0.1:4173/"));
    await choose(page, "button", "Continue with shared answers");
  } else {
    await openNorthstar(page);
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value),
      { key: QUESTIONNAIRE_STORAGE_KEY, value: serializeQuestionnaireState(state) });
    await page.reload();
    await page.getByRole("region", { name: "Continue where you left off?", exact: true })
      .getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(recoveryPanel(page)).toBeVisible();
  return state;
}

test("recovery edit entry prevents repeated and stale actions without replacing the active draft", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await restore(page, "multiple", "shared");
  const original = await page.evaluate(async () => (await import("/js/questionnaire-state.js")).getState());
  const bytes = await savedBytes(page);
  const url = page.url();
  const panel = recoveryPanel(page);
  const budget = panel.getByRole("button", { name: "Review budget", exact: true });
  const staleBudget = await budget.elementHandle();
  await budget.click();
  await expect(page.getByRole("heading", { name: "Set your budget", exact: true })).toBeFocused();
  await choose(page, "radio", "Up to £1,500");
  const draft = await page.evaluate(async () => (await import("/js/questionnaire-state.js")).getState());
  for (const button of await page.locator("#recommendation-output button[data-edit-question-id]").all()) {
    await expect(button).toBeDisabled();
  }
  await expect(panel.getByText(/Finish your current edit/)).toBeVisible();
  // Dispatch bypasses native disabled-click prevention to exercise the central entry guard as well.
  await panel.getByRole("button", { name: "Edit storage requirement", exact: true }).dispatchEvent("click");
  await page.getByRole("button", { name: "Edit budget", exact: true }).dispatchEvent("click");
  expect(await page.evaluate(async () => (await import("/js/questionnaire-state.js")).getState())).toEqual(draft);
  await expect(page.getByRole("radio", { name: "Up to £1,500", exact: true })).toBeChecked();
  expect(await savedBytes(page)).toBe(bytes);
  expect(page.url()).toBe(url);
  await choose(page, "button", "Cancel edit");
  await expect(budget).toBeFocused();
  await expect(budget).toBeEnabled();
  const restored = await page.evaluate(async () => (await import("/js/questionnaire-state.js")).getState());
  expect(restored.answers).toEqual(original.answers);
  expect(restored.currentQuestionId).toBe(original.currentQuestionId);
  await expect(panel.getByText(/Finish your current edit/)).toBeHidden();
  await panel.getByRole("button", { name: "Edit storage requirement", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose your storage", exact: true })).toBeFocused();
  await choose(page, "button", "Save changes");
  await expect(page.locator("#results-title")).toBeFocused();
  expect(await staleBudget.evaluate((node) => node.isConnected)).toBe(false);
  await staleBudget.evaluate(async (origin) => {
    (await import("/js/results.js")).restoreResultsEditFocus(origin);
  });
  await expect(page.locator("#results-title")).toBeFocused();
  await staleBudget.evaluate((node) => node.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await expect(page.locator("#results-title")).toBeFocused();
  expect((await page.evaluate(async () => (await import("/js/questionnaire-state.js")).getState())).status).toBe("complete");
  await expect(page.getByRole("button", { name: "Share results", exact: true })).toBeVisible();
  await budget.click();
  await expect(page.getByRole("heading", { name: "Set your budget", exact: true })).toBeFocused();
  await choose(page, "button", "Cancel edit");
  await expect(budget).toBeFocused();
  expect(await savedBytes(page)).toBe(bytes);
  expect(page.url()).toBe(url);
  await expectNoRuntimeErrors(errors);
});

for (const disclosureState of ["open", "closed", "reopened"]) {
  test(`recovery cancellation restores visible focus with the origin disclosure ${disclosureState}`, async ({ page }) => {
    const errors = watchForRuntimeErrors(page);
    await page.setViewportSize({ width: 320, height: 844 });
    await restore(page, "multiple");
    const panel = recoveryPanel(page);
    const disclosure = panel.locator("details");
    const summary = disclosure.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    const origin = panel.getByRole("button", { name: "Review weight limit", exact: true });
    await expect(origin).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Set your weight limit", exact: true })).toBeFocused();
    if (disclosureState !== "open") {
      await summary.focus();
      await page.keyboard.press("Space");
      await expect(disclosure).toHaveJSProperty("open", false);
    }
    if (disclosureState === "reopened") {
      await page.keyboard.press("Enter");
      await expect(disclosure).toHaveJSProperty("open", true);
    }
    await page.getByRole("button", { name: "Cancel edit", exact: true }).focus();
    await page.keyboard.press("Enter");
    const target = disclosureState === "closed" ? summary : origin;
    await expect(target).toBeFocused();
    await expect(target).toBeVisible();
    await expect(disclosure).toHaveJSProperty("open", disclosureState !== "closed");
    await page.keyboard.press("Tab");
    const next = disclosureState === "closed"
      ? page.getByRole("button", { name: "Edit budget", exact: true })
      : panel.getByRole("button", { name: "Review screen size", exact: true });
    await expect(next).toBeFocused();
    await expect(next).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await expectNoRuntimeErrors(errors);
  });
}

test("budget-limited recovery reviews existing values and recalculates only after a deliberate save", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await restore(page, "budget");
  await expect(page.locator("#results")).toHaveAttribute("data-state", "budget-limited");
  await expect(page.locator(".recommendation-card")).toHaveCount(0);
  const before = await savedBytes(page);
  await recoveryPanel(page).getByRole("button", { name: "Review budget", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Set your budget", exact: true })).toBeFocused();
  await expect(page.getByRole("radio", { name: "Up to £1,000", exact: true })).toBeChecked();
  await expect(page.getByRole("radio", { name: "No — do not go over my budget", exact: true })).toBeChecked();
  await choose(page, "radio", "Up to £2,500");
  expect(await savedBytes(page)).toBe(before);
  await expect(page.locator("#results")).toHaveAttribute("data-state", "budget-limited");
  await choose(page, "button", "Save changes");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(page.locator("#results")).toHaveAttribute("data-state", "ok");
  await expect(recoveryPanel(page)).toHaveCount(0);
  await expect(page.locator(".decision-brief")).toHaveCount(1);
  await expectNoRuntimeErrors(errors);
});

test("no-match storage recovery preserves the exact-screen must-have and refreshes the result", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await restore(page, "storage");
  await expect(page.locator("#results")).toHaveAttribute("data-state", "no-match");
  await recoveryPanel(page).getByRole("button", { name: "Edit storage requirement", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose your storage", exact: true })).toBeFocused();
  await expect(page.getByRole("radio", { name: "1 TB", exact: true })).toBeChecked();
  await choose(page, "radio", "512 GB");
  await choose(page, "button", "Save changes");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(page.locator("#results")).toHaveAttribute("data-state", "ok");
  await expect(recoveryPanel(page)).toHaveCount(0);
  const state = JSON.parse(await savedBytes(page));
  expect(state.answers.essentialRequirements).toEqual(["exact-screen"]);
  await expectNoRuntimeErrors(errors);
});

test("multiple blockers offer a grouped must-have editor and reconcile dependent details on save", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await restore(page, "multiple");
  const panel = recoveryPanel(page);
  await expect(panel.getByRole("button", { name: "Review must-haves", exact: true })).toHaveCount(1);
  await expect(panel.getByRole("heading", { level: 4 })).toHaveCount(7);
  await panel.getByRole("button", { name: "Review must-haves", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose your must-haves", exact: true })).toBeFocused();
  await expect(page.getByRole("checkbox", { name: "Comfortably handle all the activities I selected", exact: true })).toBeChecked();
  await choose(page, "checkbox", "None — find the best overall balance");
  await choose(page, "button", "Save changes");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(page.locator("#results")).toHaveAttribute("data-state", "budget-limited");
  await expect(panel.getByRole("button", { name: "Review budget", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Review must-haves", exact: true })).toHaveCount(0);
  const state = JSON.parse(await savedBytes(page));
  expect(state.answers.essentialRequirements).toEqual(["none"]);
  expect(state.answers).not.toHaveProperty("essentialDetails");
  await expectNoRuntimeErrors(errors);
});

for (const route of [
  { scenario: "weight", action: "Review weight limit", heading: "Set your weight limit", original: "1.25 kg", next: "1.75 kg" },
  { scenario: "screen", action: "Review screen size", heading: "Choose your device preferences", original: "13-inch", next: "14-inch" },
  { scenario: "monitors", action: "Review monitor requirement", heading: "Set your monitor requirement", original: "Four or more", next: "Two" },
]) {
  test(`direct recovery route: ${route.action}`, async ({ page }) => {
    const errors = watchForRuntimeErrors(page);
    await restore(page, route.scenario);
    await recoveryPanel(page).getByRole("button", { name: route.action, exact: true }).click();
    await expect(page.getByRole("heading", { name: route.heading, exact: true })).toBeFocused();
    await expect(page.getByRole("radio", { name: route.original, exact: true })).toBeChecked();
    await choose(page, "radio", route.next);
    await choose(page, "button", "Save changes");
    await expect(page.locator("#results-title")).toBeFocused();
    await expect(page.locator("#results")).toHaveAttribute("data-state", "ok");
    await expect(recoveryPanel(page)).toHaveCount(0);
    await expect(page.locator(".decision-brief")).toHaveCount(1);
    await expectNoRuntimeErrors(errors);
  });
}

for (const session of ["saved", "shared"]) {
  test(`cancelling recovery preserves ${session} terminal state, canonical sharing, bytes and focus`, async ({ page }) => {
    const errors = watchForRuntimeErrors(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true,
        value: { async writeText(value) { window.__recoveryCopiedUrl = value; } } });
    });
    const state = await restore(page, "budget", session);
    const before = await savedBytes(page);
    const beforeUrl = page.url();
    const beforeText = await recoveryPanel(page).textContent();
    const announcement = await page.locator("#results-announcement").textContent();
    await page.evaluate((key) => {
      window.__recoveryWrites = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (storageKey, value) {
        if (this === localStorage && storageKey === key) window.__recoveryWrites.push(value);
        return Reflect.apply(original, this, [storageKey, value]);
      };
    }, QUESTIONNAIRE_STORAGE_KEY);
    const action = recoveryPanel(page).getByRole("button", { name: "Review budget", exact: true });
    await action.click();
    await choose(page, "radio", "Up to £1,500");
    await page.getByRole("button", { name: "Cancel edit", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(action).toBeFocused();
    await expect(page.locator("#questionnaire-form")).toBeHidden();
    await expect(page.locator("#results")).toHaveAttribute("data-state", "budget-limited");
    expect(await recoveryPanel(page).textContent()).toBe(beforeText);
    expect(await savedBytes(page)).toBe(before);
    expect(page.url()).toBe(beforeUrl);
    expect(await page.evaluate(() => window.__recoveryWrites)).toEqual([]);
    expect(await page.locator("#results-announcement").textContent()).toBe(announcement);
    await choose(page, "button", "Share results");
    await choose(page, "button", "Copy link");
    expect(await page.evaluate(() => window.__recoveryCopiedUrl)).toBe(createQuestionnaireShareUrl(state, beforeUrl));
    await page.reload();
    if (session === "shared") await choose(page, "button", "Continue with shared answers");
    else await page.getByRole("region", { name: "Continue where you left off?", exact: true })
      .getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("#results-title")).toBeFocused();
    await expect(recoveryPanel(page)).toBeVisible();
    expect(await savedBytes(page)).toBe(before);
    expect(page.url()).toBe(beforeUrl);
    await expectNoRuntimeErrors(errors);
  });
}

test("unchanged recovery save recalculates once and may retain the same terminal outcome", async ({ page }) => {
  await page.route("**/js/recommendation-engine.js", async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({ response, body: source.replace(
      "export function recommendMacBooks({ catalogue, answers }) {",
      "export function recommendMacBooks({ catalogue, answers }) { globalThis.__recoveryCalculations = (globalThis.__recoveryCalculations ?? 0) + 1;",
    ) });
  });
  await restore(page, "budget");
  const before = await savedBytes(page);
  const count = await page.evaluate(() => window.__recoveryCalculations);
  expect(count).toBe(1);
  await recoveryPanel(page).getByRole("button", { name: "Review budget", exact: true }).click();
  await choose(page, "button", "Save changes");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(page.locator("#results")).toHaveAttribute("data-state", "budget-limited");
  await expect(recoveryPanel(page).getByRole("button", { name: "Review budget", exact: true })).toBeVisible();
  expect(await savedBytes(page)).toBe(before);
  expect(await page.evaluate(() => window.__recoveryCalculations)).toBe(count + 1);
});

test("cancelling grouped recovery restores dependent answers and the original must-have action", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await restore(page, "multiple", "shared");
  const before = await savedBytes(page);
  const beforeUrl = page.url();
  const text = await recoveryPanel(page).textContent();
  const action = recoveryPanel(page).getByRole("button", { name: "Review must-haves", exact: true });
  await action.click();
  await choose(page, "checkbox", "None — find the best overall balance");
  await expect(page.locator("#questionnaire-change-summary")).toContainText("1.25 kg");
  await choose(page, "button", "Cancel edit");
  await expect(action).toBeFocused();
  expect(await savedBytes(page)).toBe(before);
  expect(page.url()).toBe(beforeUrl);
  expect(await recoveryPanel(page).textContent()).toBe(text);
  await expect(page.getByRole("button", { name: "Share results", exact: true })).toBeVisible();
  await action.click();
  for (const name of ["Comfortably handle all the activities I selected", "Stay within a strict weight limit",
    "Have my preferred screen size", "Support the number of external monitors I need"]) {
    await expect(page.getByRole("checkbox", { name, exact: true })).toBeChecked();
  }
  await choose(page, "button", "Cancel edit");
  await expect(action).toBeFocused();
  await expectNoRuntimeErrors(errors);
});

test("recovery reflows at 320px and retains native keyboard, focus and reduced-motion behaviour", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 844 });
  await restore(page, "multiple");
  const panel = recoveryPanel(page);
  await expect(panel.getByRole("heading", { name: "Review blocking requirements", level: 3 })).toBeVisible();
  const action = panel.getByRole("button", { name: "Review budget", exact: true });
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    if (await action.evaluate((node) => node === document.activeElement)) break;
  }
  await expect(action).toBeFocused();
  expect(await action.evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Set your budget", exact: true })).toBeFocused();
  await choose(page, "button", "Cancel edit");
  await expect(action).toBeFocused();
  const disclosure = panel.locator("details");
  const summary = disclosure.locator("summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(disclosure).toHaveJSProperty("open", true);
  await page.keyboard.press("Tab");
  await expect(panel.getByRole("button", { name: "Review weight limit", exact: true })).toBeFocused();
  const layout = await panel.evaluate((node) => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    controls: [...node.querySelectorAll("button, summary")].map((control) => {
      const box = control.getBoundingClientRect();
      return { width: box.width, height: box.height, left: box.left, right: box.right };
    }),
    ids: [...document.querySelectorAll("[id]")].map((element) => element.id),
  }));
  expect(layout.overflow).toBe(false);
  expect(new Set(layout.ids).size).toBe(layout.ids.length);
  for (const control of layout.controls) {
    expect(control.width).toBeGreaterThanOrEqual(44);
    expect(control.height).toBeGreaterThanOrEqual(44);
    expect(control.left).toBeGreaterThanOrEqual(0);
    expect(control.right).toBeLessThanOrEqual(320);
  }
  await summary.focus();
  await page.keyboard.press("Space");
  await expect(disclosure).toHaveJSProperty("open", false);
  await expect(summary).toBeFocused();
  await page.keyboard.press("Tab");
  expect(await disclosure.evaluate((node) => node.contains(document.activeElement))).toBe(false);
  await expect(page.locator(":focus")).toBeVisible();
  await expectNoRuntimeErrors(errors);
});

test("optional recovery-model failure retains terminal output and existing answer editors", async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await page.route("**/js/recommendation-recovery.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(
      "export function buildRecommendationRecovery({ output }) {",
      "export function buildRecommendationRecovery({ output }) { throw new Error('test recovery failure');",
    ) });
  });
  const state = canonical(recoveryAnswers("multiple"));
  await page.goto(createQuestionnaireShareUrl(state, "http://127.0.0.1:4173/"));
  await choose(page, "button", "Continue with shared answers");
  await expect(page.locator("#results-title")).toBeFocused();
  await expect(page.locator("#results")).toHaveAttribute("data-state", "no-match");
  await expect(recoveryPanel(page)).toHaveCount(0);
  await expect(page.locator(".results-blockers")).toBeVisible();
  await choose(page, "button", "Edit budget");
  await expect(page.getByRole("heading", { name: "Set your budget", exact: true })).toBeFocused();
  await choose(page, "button", "Cancel edit");
  await expect(page.getByRole("button", { name: "Edit budget", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Share results", exact: true })).toBeVisible();
  await expectNoRuntimeErrors(errors);
});
