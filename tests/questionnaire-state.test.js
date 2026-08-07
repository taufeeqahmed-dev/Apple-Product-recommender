import test from "node:test";
import assert from "node:assert/strict";

import {
  beginEditing,
  cancelEditing,
  cancelPendingAnswerChange,
  completeQuestionnaire,
  confirmPendingAnswerChange,
  finishEditing,
  getState,
  markQuestionAttempted,
  requestAnswerChange,
  resetQuestionnaire,
  setCurrentQuestion,
} from "../js/questionnaire-state.js";
import { getQuestionDefinition } from "../js/questionnaire-definition.js";
import {
  getAnswerValue,
  getVisibleControls,
  getVisibleQuestionIds,
} from "../js/questionnaire-profile.js";
import { cloneAnswers, everydayPortableAnswers } from "./fixtures/questionnaire-scenarios.js";

function completeWithAnswers(answers) {
  resetQuestionnaire();
  getVisibleQuestionIds(answers).forEach((questionId) => {
    const question = getQuestionDefinition(questionId);
    getVisibleControls(question, answers).forEach((control) => {
      const value = getAnswerValue(answers, control.answerPath);
      const requested = requestAnswerChange(control.id, value);
      if (requested.pendingChange) confirmPendingAnswerChange();
    });
  });
  completeQuestionnaire();
}

test("questionnaire state uses step IDs and returns deeply immutable snapshots", () => {
  resetQuestionnaire();
  setCurrentQuestion("primaryUses");
  markQuestionAttempted("primaryUses");
  const state = getState();
  assert.equal(state.questionnaireSchemaVersion, 3);
  assert.equal(state.currentQuestionId, "primaryUses");
  assert.deepEqual(state.validation.attemptedQuestionIds, ["primaryUses"]);
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.answers.activities));
  assert.throws(() => state.answers.primaryUses.push("software-development"), TypeError);
});

test("changing primary uses clears only activity selections that are no longer relevant", () => {
  resetQuestionnaire();
  requestAnswerChange("primaryUses", ["study-productivity", "software-development"]);
  requestAnswerChange("activities", ["documents-browsing-calls", "docker-containers"]);

  const pending = requestAnswerChange("primaryUses", ["software-development"]);
  assert.deepEqual(pending.pendingChange.clearedQuestionIds, ["activities"]);
  assert.deepEqual(pending.pendingChange.clearedAnswers[0].labels, [
    "Documents, notes, email and video calls",
  ]);
  assert.deepEqual(pending.answers.primaryUses, ["study-productivity", "software-development"]);

  const confirmed = confirmPendingAnswerChange();
  assert.deepEqual(confirmed.answers.primaryUses, ["software-development"]);
  assert.deepEqual(confirmed.answers.activities, ["docker-containers"]);
});

test("a pending dependency-clearing change can be cancelled", () => {
  resetQuestionnaire();
  requestAnswerChange("primaryUses", ["photo-editing"]);
  requestAnswerChange("activities", ["regular-raw-editing"]);
  requestAnswerChange("primaryUses", ["study-productivity"]);
  const cancelled = cancelPendingAnswerChange();
  assert.deepEqual(cancelled.answers.primaryUses, ["photo-editing"]);
  assert.deepEqual(cancelled.answers.activities, ["regular-raw-editing"]);
  assert.equal(cancelled.pendingChange, null);
});

test("removing an essential clears only its dependent detail", () => {
  resetQuestionnaire();
  requestAnswerChange("essentialRequirements", ["maximum-weight", "external-displays"]);
  requestAnswerChange("maximumWeight", "up-to-1.55kg");
  requestAnswerChange("externalDisplayCount", "two");
  const pending = requestAnswerChange("essentialRequirements", ["external-displays"]);
  assert.deepEqual(pending.pendingChange.clearedQuestionIds, ["maximumWeight"]);
  const confirmed = confirmPendingAnswerChange();
  assert.equal(confirmed.answers.essentialDetails.maximumWeight, null);
  assert.equal(confirmed.answers.essentialDetails.externalDisplayCount, "two");
});

test("cancelling a grouped results edit restores the complete answer snapshot", () => {
  completeWithAnswers(everydayPortableAnswers);
  beginEditing("budget");
  requestAnswerChange("budgetTarget", "no-fixed-target");
  const cancelled = cancelEditing();
  assert.equal(cancelled.status, "complete");
  assert.equal(cancelled.editing.active, false);
  assert.deepEqual(cancelled.answers, everydayPortableAnswers);
});

test("finishing a grouped edit retains complete changed answers", () => {
  const expected = cloneAnswers();
  expected.devicePreferences.screenSize = "15-inch";
  completeWithAnswers(everydayPortableAnswers);
  beginEditing("devicePreferences");
  requestAnswerChange("screenSize", "15-inch");
  completeQuestionnaire();
  const finished = finishEditing();
  assert.equal(finished.status, "complete");
  assert.equal(finished.editing.active, false);
  assert.deepEqual(finished.answers, expected);
});
