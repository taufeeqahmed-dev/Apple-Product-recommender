import { cloneAnswers, noMatchAnswers } from "./questionnaire-scenarios.js";

export function recoveryAnswers(name) {
  const answers = cloneAnswers();
  if (name === "multiple") return cloneAnswers(noMatchAnswers);
  if (name === "budget") {
    answers.budget.target = "up-to-1000";
    answers.minimumStorage = "1tb";
    return answers;
  }
  answers.budget = { target: "no-fixed-target", mode: null, absoluteMaximum: null };
  answers.minimumStorage = "1tb";
  if (["storage", "screen"].includes(name)) answers.essentialRequirements = ["exact-screen"];
  else if (name === "weight") {
    answers.essentialRequirements = ["maximum-weight"];
    answers.essentialDetails.maximumWeight = "up-to-1.25kg";
  } else if (name === "monitors") {
    answers.minimumStorage = "256gb";
    answers.essentialRequirements = ["exact-screen", "external-displays"];
    answers.essentialDetails.externalDisplayCount = "four-plus";
  } else throw new Error(`Unknown recovery scenario: ${name}`);
  return answers;
}
