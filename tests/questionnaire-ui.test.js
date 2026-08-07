import test from "node:test";
import assert from "node:assert/strict";

import { getQuestionDefinition } from "../js/questionnaire-definition.js";
import { createInitialAnswers } from "../js/questionnaire-profile.js";
import {
  getNextCheckboxValue,
  getQuestionProgress,
  validateQuestionValue,
} from "../js/questionnaire.js";

test("adaptive progress uses only the questions visible for the current answers", () => {
  const answers = createInitialAnswers();
  let progress = getQuestionProgress(answers, "budgetTarget");
  assert.equal(progress.questionNumber, 1);
  assert.equal(progress.totalQuestions, 11);

  answers.budget.target = "up-to-1500";
  progress = getQuestionProgress(answers, "budgetTarget");
  assert.equal(progress.totalQuestions, 12);
  assert.ok(progress.visibleQuestionIds.includes("budgetMode"));

  answers.budget.mode = "flexible";
  progress = getQuestionProgress(answers, "budgetTarget");
  assert.equal(progress.totalQuestions, 13);
  assert.ok(progress.visibleQuestionIds.includes("absoluteBudget"));
});

test("workload follow-ups enter progress only for selected primary uses", () => {
  const answers = createInitialAnswers();
  answers.primaryUses = ["software-development", "cybersecurity-vms"];

  const progress = getQuestionProgress(answers, "primaryUses");
  assert.equal(progress.questionNumber, 2);
  assert.equal(progress.totalQuestions, 15);
  assert.ok(progress.visibleQuestionIds.includes("softwareDevelopmentDetail"));
  assert.ok(progress.visibleQuestionIds.includes("cybersecurityVmDetail"));
  assert.ok(progress.visibleQuestionIds.includes("sustainedDuration"));
  assert.equal(progress.visibleQuestionIds.includes("photoEditingDetail"), false);
});

test("required and optional questions have distinct continuation validation", () => {
  const primaryUses = getQuestionDefinition("primaryUses");
  const optionalDetail = getQuestionDefinition("softwareDevelopmentDetail");
  const screenSize = getQuestionDefinition("screenSize");

  assert.equal(validateQuestionValue(primaryUses, []).valid, false);
  assert.equal(
    validateQuestionValue(primaryUses, ["study-productivity", "software-development"]).valid,
    true,
  );
  assert.equal(
    validateQuestionValue(primaryUses, [
      "study-productivity",
      "software-development",
      "cybersecurity-vms",
    ]).valid,
    false,
  );
  assert.deepEqual(validateQuestionValue(optionalDetail, null), { valid: true, message: "" });
  assert.equal(validateQuestionValue(screenSize, "").valid, false);
});

test("connection checkbox choices remain mutually exclusive without affecting other checkboxes", () => {
  const connectionNeeds = getQuestionDefinition("connectionNeeds");
  const primaryUses = getQuestionDefinition("primaryUses");

  assert.deepEqual(
    getNextCheckboxValue(connectionNeeds, ["hdmi-without-adapter"], "no-specific-need", true),
    ["no-specific-need"],
  );
  assert.deepEqual(
    getNextCheckboxValue(connectionNeeds, ["no-specific-need"], "hdmi-without-adapter", true),
    ["hdmi-without-adapter"],
  );
  assert.deepEqual(
    getNextCheckboxValue(
      primaryUses,
      ["study-productivity"],
      "software-development",
      true,
    ),
    ["study-productivity", "software-development"],
  );
});
