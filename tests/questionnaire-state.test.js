import test from "node:test";
import assert from "node:assert/strict";

import {
  cancelPendingAnswerChange,
  confirmPendingAnswerChange,
  getState,
  markQuestionAttempted,
  requestAnswerChange,
  resetQuestionnaire,
  setCurrentQuestion,
} from "../js/questionnaire-state.js";

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
