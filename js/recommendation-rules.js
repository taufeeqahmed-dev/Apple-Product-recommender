import { RECOMMENDATION_RULES_VERSION } from "./version.js";

export const SCORING_WEIGHTS = Object.freeze({
  workload: 25,
  primaryUses: 20,
  multitaskingMemory: 15,
  portabilityWeight: 15,
  screenSize: 10,
  externalDisplays: 5,
});

export const MAXIMUM_SCORE = 100;
export const STRONG_COMPONENT_THRESHOLD = 75;
export const COMPROMISE_COMPONENT_THRESHOLD = 70;
export const EXACT_MATCH_COMPONENT_THRESHOLD = 70;
export const STRETCH_BUDGET_RANKING_ADJUSTMENT_BASIS_POINTS = 500;

export const CAPABILITY_BANDS = Object.freeze({
  "a18-pro": 1,
  m5: 2,
  "m5-pro": 3,
  "m5-max": 4,
});

export const WORKLOAD_FIT_SCORES = Object.freeze({
  1: Object.freeze([100, 100, 85, 70]),
  2: Object.freeze([40, 100, 95, 85]),
  3: Object.freeze([0, 55, 100, 100]),
  4: Object.freeze([0, 0, 70, 100]),
});

export const PRIMARY_USE_SCORES = Object.freeze({
  "study-productivity": Object.freeze([100, 100, 100, 100]),
  "software-development": Object.freeze([40, 80, 100, 100]),
  "cybersecurity-vms": Object.freeze([15, 65, 95, 100]),
  "photo-editing": Object.freeze([25, 75, 100, 100]),
  "video-editing": Object.freeze([0, 35, 80, 100]),
  "music-production": Object.freeze([40, 80, 100, 100]),
  "3d-engineering": Object.freeze([0, 30, 80, 100]),
});

export const MEMORY_FIT_SCORES = Object.freeze({
  8: Object.freeze([100, 100, 95, 90]),
  16: Object.freeze([30, 100, 100, 95]),
  24: Object.freeze([0, 60, 100, 100]),
  36: Object.freeze([0, 20, 70, 100]),
});

export const PORTABILITY_PERFORMANCE_BLEND = Object.freeze({
  "portability-first": Object.freeze({ portability: 1, performance: 0 }),
  "lean-portability": Object.freeze({ portability: 0.75, performance: 0.25 }),
  balanced: Object.freeze({ portability: 0.5, performance: 0.5 }),
  "lean-performance": Object.freeze({ portability: 0.25, performance: 0.75 }),
  "performance-first": Object.freeze({ portability: 0, performance: 1 }),
});

export const COMPONENT_LABELS = Object.freeze({
  workload: "expected workload",
  primaryUses: "main uses",
  multitaskingMemory: "multitasking and memory needs",
  portabilityWeight: "portability and weight preferences",
  screenSize: "preferred screen size",
  externalDisplays: "external-display preference",
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

export function getWeightPreferenceFit(actualKg, targetKg) {
  if (targetKg === null) return null;
  if (actualKg <= targetKg) return 100;
  if (actualKg <= targetKg + 0.2) return 70;
  return 30;
}

export function getScreenSizeFit(actualInches, preferredInches) {
  if (preferredInches === null) return null;
  const difference = Math.abs(actualInches - preferredInches);
  if (difference === 0) return 100;
  if (difference === 1) return 70;
  if (difference === 2) return 35;
  return 10;
}

export function getExternalDisplayFit(actualCount, preferredCount) {
  if (preferredCount === null || preferredCount === 0) return null;
  if (actualCount >= preferredCount) return 100;
  if (actualCount === preferredCount - 1) return 40;
  return 0;
}

export const RULES_VERSION = RECOMMENDATION_RULES_VERSION;

// All capability, workload, memory, longevity and suitability values above are
// Northstar project judgements. They are not Apple performance or lifespan claims.
