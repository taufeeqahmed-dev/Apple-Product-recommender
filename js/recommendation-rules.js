import { RECOMMENDATION_RULES_VERSION } from "./version.js";

export const SCORING_WEIGHTS = Object.freeze({
  workload: 30,
  primaryUses: 25,
  portabilityPerformance: 20,
  screenSize: 15,
  ownershipPeriod: 10,
});

export const MAXIMUM_SCORE = 100;

export const ANSWER_IDS = Object.freeze({
  maximumBudget: Object.freeze([
    "up-to-1000",
    "up-to-1500",
    "up-to-2000",
    "up-to-2500",
    "over-2500",
    "flexible",
  ]),
  primaryUses: Object.freeze([
    "everyday-study",
    "office-business",
    "coding",
    "photo-design",
    "audio-music",
    "video-3d",
  ]),
  screenSize: Object.freeze(["compact", "large", "no-preference"]),
  portabilityPerformance: Object.freeze([
    "portability-first",
    "lean-portability",
    "balanced",
    "lean-performance",
    "performance-first",
  ]),
  workloadIntensity: Object.freeze(["light", "moderate", "demanding", "very-demanding"]),
  minimumStorage: Object.freeze(["256gb", "512gb", "1tb", "2tb-plus", "unsure"]),
  externalDisplays: Object.freeze(["none", "one", "two", "three-plus", "unsure"]),
  ownershipPeriod: Object.freeze(["up-to-2", "3-to-4", "5-to-6", "7-plus", "unsure"]),
});

export const BUDGET_LIMITS_MINOR = Object.freeze({
  "up-to-1000": 100000,
  "up-to-1500": 150000,
  "up-to-2000": 200000,
  "up-to-2500": 250000,
  "over-2500": null,
  flexible: null,
});

export const STORAGE_MINIMUMS_GB = Object.freeze({
  "256gb": 256,
  "512gb": 512,
  "1tb": 1000,
  "2tb-plus": 2000,
  unsure: null,
});

export const EXTERNAL_DISPLAY_MINIMUMS = Object.freeze({
  none: 0,
  one: 1,
  two: 2,
  "three-plus": 3,
  unsure: null,
});

export const CAPABILITY_BANDS = Object.freeze({
  "a18-pro": 1,
  m5: 2,
  "m5-pro": 3,
  "m5-max": 4,
});

export const WORKLOAD_MINIMUM_BANDS = Object.freeze({
  light: 1,
  moderate: 1,
  demanding: 2,
  "very-demanding": 3,
});

export const WORKLOAD_SCORES = Object.freeze({
  // Higher capability remains available when a visitor explicitly prioritises
  // performance, but light and moderate workloads reward a right-sized fit.
  light: Object.freeze([100, 100, 85, 70]),
  moderate: Object.freeze([40, 100, 95, 85]),
  demanding: Object.freeze([0, 55, 100, 100]),
  "very-demanding": Object.freeze([0, 0, 70, 100]),
});

export const PRIMARY_USE_SCORES = Object.freeze({
  "everyday-study": Object.freeze([100, 100, 100, 100]),
  "office-business": Object.freeze([100, 100, 100, 100]),
  coding: Object.freeze([40, 80, 100, 100]),
  "photo-design": Object.freeze([25, 75, 100, 100]),
  "audio-music": Object.freeze([40, 80, 100, 100]),
  "video-3d": Object.freeze([0, 35, 80, 100]),
});

export const PORTABILITY_PERFORMANCE_BLEND = Object.freeze({
  "portability-first": Object.freeze({ portability: 1, performance: 0 }),
  "lean-portability": Object.freeze({ portability: 0.75, performance: 0.25 }),
  balanced: Object.freeze({ portability: 0.5, performance: 0.5 }),
  "lean-performance": Object.freeze({ portability: 0.25, performance: 0.75 }),
  "performance-first": Object.freeze({ portability: 0, performance: 1 }),
});

export const OWNERSHIP_SCORES = Object.freeze({
  "up-to-2": Object.freeze([100, 100, 100, 100]),
  "3-to-4": Object.freeze([60, 100, 100, 100]),
  "5-to-6": Object.freeze([20, 65, 100, 100]),
  "7-plus": Object.freeze([0, 30, 70, 100]),
});

export function getPortabilityBand(weightKg) {
  if (weightKg <= 1.25) return 5;
  if (weightKg <= 1.55) return 4;
  if (weightKg <= 1.75) return 3;
  if (weightKg <= 2.05) return 2;
  return 1;
}

export function getMemoryBand(memoryGb) {
  if (memoryGb < 16) return 1;
  if (memoryGb < 24) return 2;
  if (memoryGb < 36) return 3;
  return 4;
}

export function getStorageBand(storageGb) {
  if (storageGb < 512) return 1;
  if (storageGb < 1000) return 2;
  if (storageGb < 2000) return 3;
  return 4;
}

export function getHeadroomBand(product) {
  return Math.min(
    CAPABILITY_BANDS[product.facts.chip.id],
    getMemoryBand(product.facts.unifiedMemoryGb),
    getStorageBand(product.facts.storageGb),
  );
}

export const RULES_VERSION = RECOMMENDATION_RULES_VERSION;

// All capability bands and scores above are Northstar project judgements.
// They are not specifications, performance claims or recommendations from Apple.
