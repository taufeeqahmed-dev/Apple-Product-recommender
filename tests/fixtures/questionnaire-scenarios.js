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
  answers.activities = ["documents-browsing-calls"];
  answers.multitasking = "moderate";
  answers.devicePreferences.portabilityPerformance = "portability-first";
  answers.devicePreferences.screenSize = "13-inch";
  answers.minimumStorage = "256gb";
  answers.essentialRequirements = ["none"];
});

export const demandingCodingAnswers = scenario((answers) => {
  answers.budget.target = "up-to-2500";
  answers.budget.mode = "strict";
  answers.primaryUses = ["software-development", "study-productivity"];
  answers.activities = ["docker-containers", "research-spreadsheets-tabs"];
  answers.multitasking = "heavy";
  answers.devicePreferences.portabilityPerformance = "lean-performance";
  answers.devicePreferences.screenSize = "14-inch";
  answers.minimumStorage = "1tb";
  answers.essentialRequirements = ["workload", "external-displays"];
  answers.essentialDetails.externalDisplayCount = "two";
});

export const noMatchAnswers = scenario((answers) => {
  answers.budget.target = "up-to-1000";
  answers.budget.mode = "strict";
  answers.primaryUses = ["video-editing", "3d-engineering"];
  answers.activities = ["6k-8k-sustained", "sustained-rendering-simulation"];
  answers.multitasking = "very-heavy";
  answers.devicePreferences.portabilityPerformance = "performance-first";
  answers.devicePreferences.screenSize = "13-inch";
  answers.minimumStorage = "2tb-plus";
  answers.essentialRequirements = [
    "workload",
    "exact-screen",
    "maximum-weight",
    "external-displays",
  ];
  answers.essentialDetails.maximumWeight = "up-to-1.25kg";
  answers.essentialDetails.externalDisplayCount = "four-plus";
});

export function cloneAnswers(answers = everydayPortableAnswers) {
  return structuredClone(answers);
}
