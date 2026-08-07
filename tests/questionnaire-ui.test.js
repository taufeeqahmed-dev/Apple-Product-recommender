import test from "node:test";
import assert from "node:assert/strict";

import { getQuestionControl } from "../js/questionnaire-definition.js";
import { createInitialAnswers } from "../js/questionnaire-profile.js";
import {
  getAdaptiveChangeMessage,
  getNextCheckboxValue,
  getProgressStageLabel,
  getQuestionProgress,
  getUnansweredRequiredQuestionIds,
  validateQuestionValue,
} from "../js/questionnaire.js";
import { cloneAnswers, everydayPortableAnswers } from "./fixtures/questionnaire-scenarios.js";

test("adaptive progress contains seven core steps", () => {
  const answers = createInitialAnswers();
  let progress = getQuestionProgress(answers, "budget");
  assert.equal(progress.questionNumber, 1);
  assert.equal(progress.totalQuestions, 7);

  progress = getQuestionProgress(answers, "essentialRequirements");
  assert.equal(progress.questionNumber, 7);
});

test("only selected essential detail steps increase progress", () => {
  const answers = cloneAnswers();
  assert.equal(getQuestionProgress(answers, "essentialRequirements").totalQuestions, 7);
  answers.essentialRequirements = ["maximum-weight"];
  assert.equal(getQuestionProgress(answers, "maximumWeight").totalQuestions, 8);
  answers.essentialRequirements = ["maximum-weight", "external-displays"];
  assert.equal(getQuestionProgress(answers, "externalDisplayCount").totalQuestions, 9);
});

test("visible progress uses calm stage labels while exact counts remain available", () => {
  assert.equal(getProgressStageLabel(1, 7), "Getting to know your needs");
  assert.equal(getProgressStageLabel(3, 7), "A few details left");
  assert.equal(getProgressStageLabel(5, 7), "Almost ready");
  assert.equal(getProgressStageLabel(8, 9), "Almost ready");
});

test("required and optional compound controls validate independently", () => {
  const target = getQuestionControl("budgetTarget");
  const absolute = getQuestionControl("absoluteBudget");
  assert.equal(validateQuestionValue(target, "").valid, false);
  assert.equal(validateQuestionValue(target, "up-to-1500").valid, true);
  assert.equal(validateQuestionValue(absolute, null).valid, true);
});

test("exclusive multi-select answers clear other selections", () => {
  const activities = getQuestionControl("activities");
  assert.deepEqual(
    getNextCheckboxValue(activities, ["docker-containers"], "unsure", true),
    ["unsure"],
  );
  assert.deepEqual(
    getNextCheckboxValue(activities, ["unsure"], "local-databases", true),
    ["local-databases"],
  );

  const essentials = getQuestionControl("essentialRequirements");
  assert.deepEqual(
    getNextCheckboxValue(essentials, ["maximum-weight"], "none", true),
    ["none"],
  );
});

test("adaptive announcements name cleared selections without repeating changing totals", () => {
  const message = getAdaptiveChangeMessage(
    [
      {
        controlId: "activities",
        prompt: "Which activities do you expect to do locally on the MacBook?",
        labels: ["Docker or containers"],
      },
    ],
  );
  assert.ok(message.includes("Docker or containers"));
  assert.equal(message.includes("questionnaire now has"), false);
  assert.equal(message.includes("questions based on your answers"), false);
});

test("editing a compound trigger identifies its newly required detail step", () => {
  const answers = cloneAnswers(everydayPortableAnswers);
  answers.essentialRequirements = ["maximum-weight"];
  const unanswered = getUnansweredRequiredQuestionIds(answers);
  assert.deepEqual(unanswered, ["maximumWeight"]);
});
