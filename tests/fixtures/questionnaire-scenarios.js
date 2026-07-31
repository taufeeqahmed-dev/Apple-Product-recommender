export const everydayPortableAnswers = Object.freeze({
  maximumBudget: "up-to-1500",
  primaryUses: Object.freeze(["everyday-study"]),
  screenSize: "compact",
  portabilityPerformance: "portability-first",
  workloadIntensity: "light",
  minimumStorage: "256gb",
  externalDisplays: "one",
  ownershipPeriod: "3-to-4",
});

export const demandingCodingAnswers = Object.freeze({
  maximumBudget: "up-to-2500",
  primaryUses: Object.freeze(["coding", "office-business"]),
  screenSize: "compact",
  portabilityPerformance: "lean-performance",
  workloadIntensity: "demanding",
  minimumStorage: "1tb",
  externalDisplays: "two",
  ownershipPeriod: "5-to-6",
});

export const noMatchAnswers = Object.freeze({
  maximumBudget: "up-to-1000",
  primaryUses: Object.freeze(["video-3d"]),
  screenSize: "large",
  portabilityPerformance: "performance-first",
  workloadIntensity: "very-demanding",
  minimumStorage: "2tb-plus",
  externalDisplays: "three-plus",
  ownershipPeriod: "7-plus",
});

export function cloneAnswers(answers = everydayPortableAnswers) {
  return { ...answers, primaryUses: [...answers.primaryUses] };
}
