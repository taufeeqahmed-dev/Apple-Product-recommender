import { createInitialAnswers, deepFreeze } from "../../js/questionnaire-profile.js";

function scenario(mutator) {
  const answers = createInitialAnswers();
  mutator(answers);
  return deepFreeze(answers);
}

export const everydayPortableAnswers = scenario((answers) => {
  answers.budget.target = "up-to-1500";
  answers.budget.mode = "strict";
  answers.primaryUses = ["study-productivity"];
  answers.workloadDetails.studyProductivity = "documents-browsing-calls";
  answers.multitasking = "moderate";
  answers.workloadRequirementMode = "preference";
  answers.mobility.portabilityPerformance = "portability-first";
  answers.mobility.weightTarget = "up-to-1.55kg";
  answers.mobility.weightRequirementMode = "preference";
  answers.screen.size = "13-inch";
  answers.screen.requirementMode = "preference-only";
  answers.minimumStorage = "256gb";
  answers.externalDisplays.count = "one";
  answers.externalDisplays.requirementMode = "must-support";
  answers.ownership.period = "3-to-4";
  answers.ownership.requirementMode = "preference";
});

export const demandingCodingAnswers = scenario((answers) => {
  answers.budget.target = "up-to-2500";
  answers.budget.mode = "strict";
  answers.primaryUses = ["software-development", "study-productivity"];
  answers.workloadDetails.softwareDevelopment = "containers-large-builds";
  answers.workloadDetails.studyProductivity = "research-spreadsheets-tabs";
  answers.workloadDetails.sustainedDuration = "15-to-60-minutes";
  answers.multitasking = "heavy";
  answers.workloadRequirementMode = "mandatory";
  answers.mobility.portabilityPerformance = "lean-performance";
  answers.screen.size = "14-inch";
  answers.screen.requirementMode = "nearby-size-acceptable";
  answers.minimumStorage = "1tb";
  answers.externalDisplays.count = "two";
  answers.externalDisplays.requirementMode = "must-support";
  answers.ownership.period = "5-to-6";
  answers.ownership.requirementMode = "preference";
});

export const noMatchAnswers = scenario((answers) => {
  answers.budget.target = "up-to-1000";
  answers.budget.mode = "strict";
  answers.primaryUses = ["video-editing", "3d-engineering"];
  answers.workloadDetails.videoEditing = "6k-8k-sustained";
  answers.workloadDetails.threeDEngineering = "sustained-rendering-simulation";
  answers.workloadDetails.sustainedDuration = "hours-most-days";
  answers.multitasking = "very-heavy";
  answers.workloadRequirementMode = "mandatory";
  answers.mobility.portabilityPerformance = "performance-first";
  answers.mobility.weightTarget = "up-to-1.25kg";
  answers.mobility.weightRequirementMode = "must-not-exceed";
  answers.screen.size = "13-inch";
  answers.screen.requirementMode = "exact-size-required";
  answers.minimumStorage = "2tb-plus";
  answers.externalDisplays.count = "four-plus";
  answers.externalDisplays.requirementMode = "must-support";
  answers.ownership.period = "7-plus";
  answers.ownership.requirementMode = "essential-headroom";
});

export function cloneAnswers(answers = everydayPortableAnswers) {
  return structuredClone(answers);
}
