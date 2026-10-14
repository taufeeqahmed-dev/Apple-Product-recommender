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
  restoreQuestionnaireState,
  setCurrentQuestion,
} from "../js/questionnaire-state.js";
import {
  createQuestionnaireState,
  serializeQuestionnaireState,
} from "../js/questionnaire-serialization.js";
import {
  createResultsShareUrl,
  isCompleteQuestionnaireStateShareable,
} from "../js/results-share.js";
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

test("cancelling an earlier edit preserves a canonically reconstructable completed state", () => {
  const before = createQuestionnaireState({
    status: "complete",
    currentQuestionId: "essentialRequirements",
    answers: everydayPortableAnswers,
  });
  restoreQuestionnaireState(before);
  beginEditing("budget");
  const cancelled = cancelEditing();
  assert.deepEqual(cancelled.answers, everydayPortableAnswers);
  const after = createQuestionnaireState(cancelled);
  assert.equal(after.currentQuestionId, "essentialRequirements");
  assert.equal(serializeQuestionnaireState(after), serializeQuestionnaireState(before));
});

const adaptiveCompletedAnswers = cloneAnswers();
adaptiveCompletedAnswers.essentialRequirements = ["exact-screen", "maximum-weight", "external-displays"];
adaptiveCompletedAnswers.essentialDetails = { maximumWeight: "up-to-1.55kg", externalDisplayCount: "two" };

const cancellationCases = [
  {
    name: "budget controls hidden by a draft target",
    questionId: "budget",
    changes: [["budgetTarget", "no-fixed-target"]],
    checkDraft(draft) {
      assert.equal(draft.answers.budget.mode, null);
    },
  },
  {
    name: "activities cleared by a draft primary use",
    questionId: "primaryUses",
    changes: [["primaryUses", ["software-development"]]],
    checkDraft(draft) {
      assert.deepEqual(draft.answers.activities, []);
    },
  },
  {
    name: "changed draft activities",
    questionId: "activities",
    changes: [["activities", ["research-spreadsheets-tabs"]]],
  },
  {
    name: "an exact-screen Essential cleared by a draft screen preference",
    questionId: "devicePreferences",
    changes: [["screenSize", "no-preference"]],
    checkDraft(draft) {
      assert.ok(!draft.answers.essentialRequirements.includes("exact-screen"));
    },
  },
  {
    name: "Essential details hidden and cleared by a draft requirement",
    questionId: "essentialRequirements",
    changes: [["essentialRequirements", ["none"]]],
    checkDraft(draft) {
      assert.deepEqual(draft.answers.essentialDetails, { maximumWeight: null, externalDisplayCount: null });
      assert.equal(getVisibleQuestionIds(draft.answers).at(-1), "essentialRequirements");
    },
  },
  {
    name: "a newly revealed Essential detail and its temporary edit position",
    answers: everydayPortableAnswers,
    questionId: "essentialRequirements",
    changes: [["essentialRequirements", ["maximum-weight"]], ["maximumWeight", "up-to-1.55kg"]],
    checkDraft(draft) {
      assert.ok(getVisibleQuestionIds(draft.answers).includes("maximumWeight"));
      setCurrentQuestion("maximumWeight");
    },
  },
];

for (const { name, answers = adaptiveCompletedAnswers, questionId, changes, checkDraft } of cancellationCases) {
  test(`cancelling restores canonical completed answers after ${name}`, () => {
    const before = createQuestionnaireState({
      status: "complete",
      currentQuestionId: getVisibleQuestionIds(answers).at(-1),
      answers,
    });
    restoreQuestionnaireState(before);
    const originalAnswers = getState().answers;
    const baseUrl = "https://example.test/northstar/?source=review";
    const originalShareUrl = createResultsShareUrl(before, baseUrl);
    beginEditing(questionId);
    for (const [controlId, value] of changes) {
      const requested = requestAnswerChange(controlId, value);
      if (requested.pendingChange) confirmPendingAnswerChange();
    }
    const draft = getState();
    assert.notDeepEqual(draft.answers, originalAnswers);
    checkDraft?.(draft);

    const cancelled = cancelEditing();
    assert.equal(cancelled.status, "complete");
    assert.equal(cancelled.editing.active, false);
    assert.equal(cancelled.pendingChange, null);
    assert.deepEqual(cancelled.answers, originalAnswers);
    assert.equal(cancelled.currentQuestionId, getVisibleQuestionIds(originalAnswers).at(-1));
    const after = createQuestionnaireState(cancelled);
    assert.equal(serializeQuestionnaireState(after), serializeQuestionnaireState(before));
    assert.ok(isCompleteQuestionnaireStateShareable(after));
    assert.equal(createResultsShareUrl(after, baseUrl), originalShareUrl);
  });
}

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
