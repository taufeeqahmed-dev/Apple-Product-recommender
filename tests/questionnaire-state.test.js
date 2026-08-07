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
import { getAnswerValue, getVisibleQuestionIds } from "../js/questionnaire-profile.js";
import {
  cloneAnswers,
  everydayPortableAnswers,
} from "./fixtures/questionnaire-scenarios.js";

function completeWithAnswers(answers) {
  resetQuestionnaire();
  getVisibleQuestionIds(answers).forEach((questionId) => {
    const definition = getQuestionDefinition(questionId);
    const value = getAnswerValue(answers, definition.answerPath);
    const answered = Array.isArray(value)
      ? value.length > 0
      : value !== null && value !== "" && value !== undefined;
    if (!answered) return;
    const next = requestAnswerChange(questionId, value);
    if (next.pendingChange) confirmPendingAnswerChange();
  });
  completeQuestionnaire();
}

test("questionnaire state uses question IDs and returns deeply immutable snapshots", () => {
  resetQuestionnaire();
  setCurrentQuestion("primaryUses");
  markQuestionAttempted("primaryUses");
  const state = getState();

  assert.equal(state.currentQuestionId, "primaryUses");
  assert.deepEqual(state.validation.attemptedQuestionIds, ["primaryUses"]);
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.answers));
  assert.ok(Object.isFrozen(state.answers.workloadDetails));
  assert.ok(Object.isFrozen(state.answers.primaryUses));
  assert.throws(() => state.answers.primaryUses.push("software-development"), TypeError);
});

test("a trigger change waits for confirmation and clears only newly irrelevant answers", () => {
  resetQuestionnaire();
  requestAnswerChange("primaryUses", ["software-development", "cybersecurity-vms"]);
  requestAnswerChange("softwareDevelopmentDetail", "containers-large-builds");
  requestAnswerChange("cybersecurityVmDetail", "two-vms");
  requestAnswerChange("sustainedDuration", "hours-most-days");

  const pending = requestAnswerChange("primaryUses", ["cybersecurity-vms"]);
  assert.deepEqual(pending.pendingChange.clearedQuestionIds, ["softwareDevelopmentDetail"]);
  assert.deepEqual(pending.answers.primaryUses, ["software-development", "cybersecurity-vms"]);
  assert.equal(pending.answers.workloadDetails.softwareDevelopment, "containers-large-builds");

  const confirmed = confirmPendingAnswerChange();
  assert.deepEqual(confirmed.answers.primaryUses, ["cybersecurity-vms"]);
  assert.equal(confirmed.answers.workloadDetails.softwareDevelopment, null);
  assert.equal(confirmed.answers.workloadDetails.cybersecurityVms, "two-vms");
  assert.equal(confirmed.answers.workloadDetails.sustainedDuration, "hours-most-days");
  assert.equal(confirmed.pendingChange, null);
});

test("a pending dependency-clearing change can be cancelled without modifying answers", () => {
  resetQuestionnaire();
  requestAnswerChange("primaryUses", ["cybersecurity-vms"]);
  requestAnswerChange("cybersecurityVmDetail", "one-vm");
  requestAnswerChange("sustainedDuration", "15-to-60-minutes");

  requestAnswerChange("primaryUses", ["study-productivity"]);
  const cancelled = cancelPendingAnswerChange();
  assert.deepEqual(cancelled.answers.primaryUses, ["cybersecurity-vms"]);
  assert.equal(cancelled.answers.workloadDetails.cybersecurityVms, "one-vm");
  assert.equal(cancelled.answers.workloadDetails.sustainedDuration, "15-to-60-minutes");
  assert.equal(cancelled.pendingChange, null);
});

test("changing to an unrelated use identifies every dependent answer that will clear", () => {
  resetQuestionnaire();
  requestAnswerChange("primaryUses", ["cybersecurity-vms"]);
  requestAnswerChange("cybersecurityVmDetail", "three-plus-vms");
  requestAnswerChange("sustainedDuration", "hours-most-days");

  const pending = requestAnswerChange("primaryUses", ["study-productivity"]);
  assert.deepEqual(pending.pendingChange.clearedQuestionIds, [
    "cybersecurityVmDetail",
    "sustainedDuration",
  ]);
});

test("cancelling an individual-answer edit restores the complete answer snapshot", () => {
  completeWithAnswers(everydayPortableAnswers);
  beginEditing("budgetTarget");
  const pending = requestAnswerChange("budgetTarget", "no-fixed-target");
  assert.deepEqual(pending.pendingChange.clearedQuestionIds, ["budgetMode"]);
  confirmPendingAnswerChange();

  const cancelled = cancelEditing();
  assert.equal(cancelled.status, "complete");
  assert.equal(cancelled.editing.active, false);
  assert.deepEqual(cancelled.answers, everydayPortableAnswers);
});

test("finishing an individual-answer edit keeps the changed answers complete", () => {
  const expected = cloneAnswers();
  expected.screen.size = "15-inch";
  completeWithAnswers(everydayPortableAnswers);
  beginEditing("screenSize");
  requestAnswerChange("screenSize", "15-inch");
  completeQuestionnaire();
  const finished = finishEditing();

  assert.equal(finished.status, "complete");
  assert.equal(finished.editing.active, false);
  assert.equal(
    finished.currentQuestionId,
    getVisibleQuestionIds(expected)[getVisibleQuestionIds(expected).length - 1],
  );
  assert.deepEqual(finished.answers, expected);
});
