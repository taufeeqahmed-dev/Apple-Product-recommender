import { expect } from "@playwright/test";

export function watchForRuntimeErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

export async function expectNoRuntimeErrors(errors) {
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
}

export async function openNorthstar(page) {
  await page.goto("/");
  await expect(page).toHaveTitle(/Northstar/);
  await expect(page.getByRole("main")).toHaveCount(1);
}

export async function choose(page, role, name) {
  const control = page.getByRole(role, { name, exact: true });
  await expect(control).toHaveCount(1);
  await control.click();
  return control;
}

export async function continueQuestionnaire(page) {
  await choose(page, "button", "Continue");
}

export async function completeBaselineJourney(page) {
  await choose(page, "radio", "I do not have a fixed target yet");
  await continueQuestionnaire(page);
  await choose(page, "checkbox", "University, studying and general productivity");
  await continueQuestionnaire(page);
  await choose(page, "radio", "Research, larger spreadsheets and many browser tabs");
  await continueQuestionnaire(page);
  await choose(page, "radio", "4–7 applications and around 11–30 tabs");
  await continueQuestionnaire(page);
  await choose(page, "radio", "Use it as a preference and explain weaker matches");
  await continueQuestionnaire(page);
  await choose(page, "radio", "Carry it regularly; balance weight and performance");
  await continueQuestionnaire(page);
  await choose(page, "radio", "No weight preference");
  await continueQuestionnaire(page);
  await choose(page, "radio", "A full work or study day");
  await continueQuestionnaire(page);
  await choose(page, "radio", "No preference");
  await continueQuestionnaire(page);
  await choose(page, "radio", "512 GB");
  await continueQuestionnaire(page);
  await choose(page, "radio", "One");
  await continueQuestionnaire(page);
  await choose(page, "radio", "Preference");
  await continueQuestionnaire(page);
  await choose(page, "checkbox", "HDMI without an adapter");
  await continueQuestionnaire(page);
  await choose(page, "radio", "Must-have");
  await continueQuestionnaire(page);
  await choose(page, "radio", "I’m not sure");
  await choose(page, "button", "See recommendations");
  await expect(page.locator("#results-title")).toBeFocused();
}

export async function editAnswer(page, prompt) {
  const button = page.getByRole("button", {
    name: `Edit answer for: ${prompt}`,
    exact: true,
  });
  await expect(button).toHaveCount(1);
  await button.click();
  return button;
}
