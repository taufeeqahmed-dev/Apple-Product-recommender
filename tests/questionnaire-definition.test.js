import test from "node:test";
import assert from "node:assert/strict";

import {
  QUESTION_DEFINITIONS,
  QUESTION_DEPENDENCIES,
  QUESTION_ORDER,
} from "../js/questionnaire-definition.js";
import {
  createInitialAnswers,
  deriveQuestionnaireProfile,
  deriveWorkloadProfile,
  getVisibleQuestionIds,
  reconcileQuestionnaireAnswers,
  validateQuestionnaireAnswers,
} from "../js/questionnaire-profile.js";
import {
  APPLICATION_VERSION,
  QUESTIONNAIRE_SCHEMA_VERSION,
  RECOMMENDATION_RULES_VERSION,
} from "../js/version.js";

function minimalValidAnswers() {
  const answers = createInitialAnswers();
  answers.budget.target = "no-fixed-target";
  answers.primaryUses = ["study-productivity"];
  answers.multitasking = "light";
  answers.workloadRequirementMode = "preference";
  answers.mobility.portabilityPerformance = "balanced";
  answers.screen.size = "no-preference";
  answers.minimumStorage = "unsure";
  answers.externalDisplays.count = "none";
  answers.ownership.period = "unsure";
  return answers;
}

test("application, questionnaire schema and recommendation rules are independently versioned", () => {
  assert.equal(APPLICATION_VERSION, "1.1.0");
  assert.equal(QUESTIONNAIRE_SCHEMA_VERSION, 2);
  assert.equal(RECOMMENDATION_RULES_VERSION, "1.1.0");
});

test("the declarative question model has stable unique IDs and explicit dependencies", () => {
  assert.equal(new Set(QUESTION_ORDER).size, QUESTION_ORDER.length);
  assert.deepEqual(QUESTION_ORDER, QUESTION_DEFINITIONS.map(({ id }) => id));
  assert.ok(QUESTION_DEPENDENCIES.primaryUses.includes("cybersecurityVmDetail"));
  assert.ok(QUESTION_DEPENDENCIES.primaryUses.includes("sustainedDuration"));
  assert.ok(Object.isFrozen(QUESTION_DEFINITIONS));
  assert.ok(Object.isFrozen(QUESTION_DEFINITIONS[0].options));
});

test("visible questions adapt in stable order to budget and selected uses", () => {
  const answers = minimalValidAnswers();
  answers.budget.target = "up-to-1500";
  answers.budget.mode = "flexible";
  answers.budget.absoluteMaximum = "up-to-2000";
  answers.primaryUses = ["software-development", "cybersecurity-vms"];

  const visible = getVisibleQuestionIds(answers);
  assert.ok(visible.includes("budgetMode"));
  assert.ok(visible.includes("absoluteBudget"));
  assert.ok(visible.includes("softwareDevelopmentDetail"));
  assert.ok(visible.includes("cybersecurityVmDetail"));
  assert.ok(visible.includes("sustainedDuration"));
  assert.equal(visible.includes("photoEditingDetail"), false);
  assert.ok(visible.indexOf("softwareDevelopmentDetail") < visible.indexOf("cybersecurityVmDetail"));
});

test("reconciliation removes hidden and invalid dependent answers", () => {
  const answers = minimalValidAnswers();
  answers.primaryUses = ["software-development"];
  answers.workloadDetails.softwareDevelopment = "containers-large-builds";
  answers.workloadDetails.cybersecurityVms = "two-vms";
  answers.screen.size = "no-preference";
  answers.screen.requirementMode = "exact-size-required";
  answers.budget.target = "up-to-2000";
  answers.budget.mode = "flexible";
  answers.budget.absoluteMaximum = "up-to-1500";

  const reconciled = reconcileQuestionnaireAnswers(answers);
  assert.equal(reconciled.workloadDetails.softwareDevelopment, "containers-large-builds");
  assert.equal(reconciled.workloadDetails.cybersecurityVms, null);
  assert.equal(reconciled.screen.requirementMode, null);
  assert.equal(reconciled.budget.absoluteMaximum, null);
});

test("validation distinguishes missing, optional, invalid and hidden answers", () => {
  assert.equal(validateQuestionnaireAnswers(createInitialAnswers()).valid, false);

  const validAnswers = minimalValidAnswers();
  assert.deepEqual(validateQuestionnaireAnswers(validAnswers), { valid: true, errors: [] });

  const invalidConnections = structuredClone(validAnswers);
  invalidConnections.connections.needs = ["hdmi-without-adapter", "no-specific-need"];
  invalidConnections.connections.importance = "preference";
  assert.ok(
    validateQuestionnaireAnswers(invalidConnections).errors.some((error) =>
      error.includes("Specific connection needs"),
    ),
  );

  const hiddenAnswer = structuredClone(validAnswers);
  hiddenAnswer.screen.requirementMode = "exact-size-required";
  assert.ok(
    validateQuestionnaireAnswers(hiddenAnswer).errors.includes(
      "Hidden answer retained for screenRequirementMode.",
    ),
  );
});

test("the pure workload profile uses the strongest applicable visible signals", () => {
  const answers = minimalValidAnswers();
  answers.primaryUses = ["cybersecurity-vms"];
  answers.workloadDetails.cybersecurityVms = "two-vms";
  answers.workloadDetails.sustainedDuration = "hours-most-days";
  answers.multitasking = "heavy";

  const workload = deriveWorkloadProfile(answers);
  assert.equal(workload.capabilityBand, 4);
  assert.equal(workload.memoryGb, 24);
  assert.ok(workload.evidence.some(({ source }) => source === "multitasking"));
});

test("hard requirements are derived only from explicit mandatory answers", () => {
  const answers = minimalValidAnswers();
  answers.primaryUses = ["cybersecurity-vms"];
  answers.workloadDetails.cybersecurityVms = "two-vms";
  answers.multitasking = "heavy";
  answers.mobility.weightTarget = "up-to-1.55kg";
  answers.mobility.weightRequirementMode = "preference";
  answers.externalDisplays.count = "two";
  answers.externalDisplays.requirementMode = "preference";

  let profile = deriveQuestionnaireProfile(answers);
  assert.equal(profile.hardRequirements.memoryMinimumGb, null);
  assert.equal(profile.hardRequirements.weightMaximumKg, null);
  assert.equal(profile.hardRequirements.externalDisplayMinimum, null);

  answers.workloadRequirementMode = "mandatory";
  answers.mobility.weightRequirementMode = "must-not-exceed";
  answers.externalDisplays.requirementMode = "must-support";
  profile = deriveQuestionnaireProfile(answers);
  assert.equal(profile.hardRequirements.workloadCapabilityBand, 3);
  assert.equal(profile.hardRequirements.memoryMinimumGb, 24);
  assert.equal(profile.hardRequirements.weightMaximumKg, 1.55);
  assert.equal(profile.hardRequirements.externalDisplayMinimum, 2);
});

test("battery and connection answers remain explicitly unavailable for ranking", () => {
  const answers = minimalValidAnswers();
  answers.mobility.batteryImportance = "long-travel-day";
  answers.connections.needs = ["hdmi-without-adapter"];
  answers.connections.importance = "must-have";

  const profile = deriveQuestionnaireProfile(answers);
  assert.deepEqual(profile.unusedForRanking, {
    batteryImportance: "long-travel-day",
    connectionNeeds: ["hdmi-without-adapter"],
    connectionImportance: "must-have",
  });
  assert.equal(Object.hasOwn(profile.hardRequirements, "battery"), false);
  assert.equal(Object.hasOwn(profile.hardRequirements, "connections"), false);
});
