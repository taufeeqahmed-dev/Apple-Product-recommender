import test from "node:test";
import assert from "node:assert/strict";

import {
  QUESTION_DEFINITIONS,
  QUESTION_DEPENDENCIES,
  QUESTION_ORDER,
  getAllQuestionControls,
  getQuestionControl,
} from "../js/questionnaire-definition.js";
import {
  createInitialAnswers,
  deriveQuestionnaireProfile,
  deriveWorkloadProfile,
  getAvailableControlOptions,
  getVisibleQuestionIds,
  reconcileQuestionnaireAnswers,
  validateQuestionnaireAnswers,
} from "../js/questionnaire-profile.js";
import {
  APPLICATION_VERSION,
  QUESTIONNAIRE_SCHEMA_VERSION,
  QUESTIONNAIRE_STATE_SCHEMA_VERSION,
  RECOMMENDATION_RULES_VERSION,
} from "../js/version.js";

function minimalValidAnswers() {
  const answers = createInitialAnswers();
  answers.budget.target = "up-to-1500";
  answers.budget.mode = "strict";
  answers.primaryUses = ["study-productivity"];
  answers.activities = ["documents-browsing-calls"];
  answers.multitasking = "moderate";
  answers.devicePreferences.portabilityPerformance = "balanced";
  answers.devicePreferences.screenSize = "no-preference";
  answers.minimumStorage = "unsure";
  answers.essentialRequirements = ["none"];
  return answers;
}

test("application, questionnaire schema and recommendation rules are independently versioned", () => {
  assert.equal(APPLICATION_VERSION, "1.2.0");
  assert.equal(QUESTIONNAIRE_SCHEMA_VERSION, 3);
  assert.equal(QUESTIONNAIRE_STATE_SCHEMA_VERSION, 1);
  assert.equal(RECOMMENDATION_RULES_VERSION, "2.1.0");
});

test("the declarative model has nine stable steps and unique controls", () => {
  assert.equal(QUESTION_DEFINITIONS.length, 9);
  assert.equal(new Set(QUESTION_ORDER).size, QUESTION_ORDER.length);
  const controls = getAllQuestionControls();
  assert.equal(new Set(controls.map(({ id }) => id)).size, controls.length);
  assert.deepEqual(QUESTION_DEPENDENCIES.primaryUses, ["activities"]);
  assert.deepEqual(QUESTION_DEPENDENCIES.essentialRequirements, [
    "maximumWeight",
    "externalDisplayCount",
  ]);
});

test("the streamlined flow has seven core steps and no more than nine", () => {
  const answers = minimalValidAnswers();
  assert.equal(getVisibleQuestionIds(answers).length, 7);

  answers.essentialRequirements = ["maximum-weight"];
  assert.equal(getVisibleQuestionIds(answers).length, 8);

  answers.essentialRequirements = ["maximum-weight", "external-displays"];
  assert.equal(getVisibleQuestionIds(answers).length, 9);
  assert.deepEqual(getVisibleQuestionIds(answers).slice(-2), [
    "maximumWeight",
    "externalDisplayCount",
  ]);
});

test("plain-language clarification is stored as associated control help", () => {
  assert.equal(
    getQuestionControl("budgetTarget").help,
    "Choose the most you’d ideally like to spend.",
  );
  assert.equal(
    getQuestionControl("externalDisplayCount").help,
    "This means external monitors used at the same time as the MacBook’s built-in screen.",
  );
  assert.equal(getQuestionControl("primaryUses").help, "Choose up to two.");
  assert.match(getQuestionControl("activities").help, /Select all that apply/);
});

test("activity options are tailored to one or two selected uses", () => {
  const answers = minimalValidAnswers();
  const control = getQuestionControl("activities");
  let ids = getAvailableControlOptions(control, answers).map(({ id }) => id);
  assert.ok(ids.includes("documents-browsing-calls"));
  assert.ok(ids.includes("unsure"));
  assert.equal(ids.includes("docker-containers"), false);

  answers.primaryUses = ["software-development", "cybersecurity-vms"];
  ids = getAvailableControlOptions(control, answers).map(({ id }) => id);
  assert.equal(ids.filter((id) => id === "docker-containers").length, 1);
  assert.ok(ids.includes("three-plus-virtual-machines"));
  assert.equal(ids.includes("regular-raw-editing"), false);
});

test("reconciliation clears only activities and essential details that become irrelevant", () => {
  const answers = minimalValidAnswers();
  answers.primaryUses = ["study-productivity", "software-development"];
  answers.activities = ["documents-browsing-calls", "docker-containers"];
  answers.devicePreferences.screenSize = "14-inch";
  answers.essentialRequirements = ["exact-screen", "maximum-weight", "external-displays"];
  answers.essentialDetails.maximumWeight = "up-to-1.55kg";
  answers.essentialDetails.externalDisplayCount = "two";

  answers.primaryUses = ["software-development"];
  answers.essentialRequirements = ["maximum-weight"];
  const reconciled = reconcileQuestionnaireAnswers(answers);
  assert.deepEqual(reconciled.activities, ["docker-containers"]);
  assert.equal(reconciled.essentialDetails.maximumWeight, "up-to-1.55kg");
  assert.equal(reconciled.essentialDetails.externalDisplayCount, null);
});

test("changing a flexible target clears an absolute maximum that is no longer valid", () => {
  const answers = minimalValidAnswers();
  answers.budget.mode = "flexible";
  answers.budget.absoluteMaximum = "up-to-2000";
  answers.budget.target = "up-to-2500";
  const reconciled = reconcileQuestionnaireAnswers(answers);
  assert.equal(reconciled.budget.absoluteMaximum, null);
});

test("validation rejects incomplete, exclusive, invalid and hidden answers", () => {
  assert.equal(validateQuestionnaireAnswers(createInitialAnswers()).valid, false);

  const valid = minimalValidAnswers();
  assert.equal(validateQuestionnaireAnswers(valid).valid, true);

  const exclusive = structuredClone(valid);
  exclusive.activities = ["documents-browsing-calls", "unsure"];
  assert.ok(
    validateQuestionnaireAnswers(exclusive).errors.some((error) => error.includes("exclusive")),
  );

  const hidden = structuredClone(valid);
  hidden.essentialDetails.maximumWeight = "up-to-1.55kg";
  assert.ok(
    validateQuestionnaireAnswers(hidden).errors.includes("Hidden answer retained for maximumWeight."),
  );
});

test("workload derives the strongest selected activity and multitasking signals", () => {
  const answers = minimalValidAnswers();
  answers.primaryUses = ["software-development", "cybersecurity-vms"];
  answers.activities = ["local-databases", "docker-containers", "two-virtual-machines"];
  answers.multitasking = "heavy";
  let workload = deriveWorkloadProfile(answers);
  assert.equal(workload.capabilityBand, 3);
  assert.equal(workload.memoryGb, 24);
  assert.equal(workload.requirementMode, "preference");

  answers.activities.push("larger-local-ai-models");
  answers.essentialRequirements = ["workload"];
  workload = deriveWorkloadProfile(answers);
  assert.equal(workload.capabilityBand, 4);
  assert.equal(workload.memoryGb, 36);
  assert.equal(workload.requirementMode, "mandatory");
});

test("only explicitly essential options create workload, screen, weight or display filters", () => {
  const answers = minimalValidAnswers();
  answers.primaryUses = ["software-development"];
  answers.activities = ["docker-containers"];
  answers.devicePreferences.screenSize = "14-inch";
  let profile = deriveQuestionnaireProfile(answers);
  assert.equal(profile.hardRequirements.workloadCapabilityBand, null);
  assert.equal(profile.hardRequirements.exactScreenSizeInches, null);
  assert.equal(profile.hardRequirements.weightMaximumKg, null);
  assert.equal(profile.hardRequirements.externalDisplayMinimum, null);

  answers.essentialRequirements = [
    "workload",
    "exact-screen",
    "maximum-weight",
    "external-displays",
  ];
  answers.essentialDetails.maximumWeight = "up-to-1.55kg";
  answers.essentialDetails.externalDisplayCount = "two";
  profile = deriveQuestionnaireProfile(answers);
  assert.equal(profile.hardRequirements.workloadCapabilityBand, 3);
  assert.equal(profile.hardRequirements.memoryMinimumGb, 24);
  assert.equal(profile.hardRequirements.exactScreenSizeInches, 14);
  assert.equal(profile.hardRequirements.weightMaximumKg, 1.55);
  assert.equal(profile.hardRequirements.externalDisplayMinimum, 2);
});

test("neutral answers remain valid and never create hard requirements", () => {
  const answers = minimalValidAnswers();
  answers.devicePreferences.portabilityPerformance = "let-northstar-decide";
  answers.devicePreferences.screenSize = "no-preference";
  answers.minimumStorage = "unsure";
  const validation = validateQuestionnaireAnswers(answers);
  const profile = deriveQuestionnaireProfile(answers);

  assert.equal(validation.valid, true);
  assert.equal(profile.preferences.portabilityPerformance, "let-northstar-decide");
  assert.equal(profile.preferences.screenSizeInches, null);
  assert.equal(profile.hardRequirements.storageMinimumGb, null);
  assert.equal(profile.hardRequirements.weightMaximumKg, null);
  assert.equal(profile.hardRequirements.exactScreenSizeInches, null);
});

test("the v3 state contains no battery, connection or ownership answers", () => {
  const answers = createInitialAnswers();
  assert.equal(Object.hasOwn(answers, "connections"), false);
  assert.equal(Object.hasOwn(answers, "ownership"), false);
  assert.equal(Object.hasOwn(answers.devicePreferences, "batteryImportance"), false);
});
