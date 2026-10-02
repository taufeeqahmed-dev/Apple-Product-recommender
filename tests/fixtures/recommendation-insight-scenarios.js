import { deepFreeze } from "../../js/product-schema.js";
import {
  cloneAnswers,
  demandingCodingAnswers,
  everydayPortableAnswers,
} from "./questionnaire-scenarios.js";

function varied(base, change) {
  const answers = cloneAnswers(base);
  change(answers);
  return answers;
}

const development = varied(demandingCodingAnswers, (answers) => {
  answers.primaryUses = ["software-development"];
  answers.activities = ["docker-containers", "local-databases"];
  answers.essentialRequirements = ["none"];
  answers.essentialDetails.externalDisplayCount = null;
});

// Expectations are from the unchanged rules 2.1.0 engine at c133db9, before
// implementing insights. These fixtures add no product records or product facts.
export const insightScenarios = deepFreeze([
  {
    id: "everyday",
    answers: cloneAnswers(everydayPortableAnswers),
    expected: {
      leaderId: "macbook-air-13-m5-10cpu-8gpu-16gb-512gb",
      matchType: "exact", basisPoints: 10000, confidencePoints: 84,
      decidingFactor: "tie-compromises",
      engineDigest: "5d4ecd0fa67ee2aa2744507358cb0642815b1a1713736fbe05969d6597f5d554",
    },
  },
  {
    id: "development",
    answers: development,
    expected: {
      leaderId: "macbook-pro-14-m5-pro-15cpu-16gpu-24gb-1tb",
      matchType: "exact", basisPoints: 9493, confidencePoints: 100,
      decidingFactor: "ranking-score",
      engineDigest: "d7a9b4815b626aa04d33a6f1f8ef2c4f2da21273d36e846fbe0d160681230287",
    },
  },
  {
    id: "cybersecurity",
    answers: varied(development, (answers) => {
      answers.primaryUses = ["cybersecurity-vms"];
      answers.activities = ["three-plus-virtual-machines"];
      answers.budget.target = "up-to-4500";
      answers.multitasking = "very-heavy";
    }),
    expected: {
      leaderId: "macbook-pro-14-m5-max-18cpu-32gpu-36gb-2tb",
      matchType: "exact", basisPoints: 9824, confidencePoints: 100,
      decidingFactor: "ranking-score",
      engineDigest: "82537e645af5901d7d2432a9727e5d610f9c3629f6b0ff42e2578a6a62593c28",
    },
  },
  {
    id: "creative",
    answers: varied(demandingCodingAnswers, (answers) => {
      answers.budget.target = "up-to-4500";
      answers.primaryUses = ["photo-editing", "video-editing"];
      answers.activities = ["regular-raw-editing", "4k-single-stream"];
      answers.devicePreferences.screenSize = "16-inch";
      answers.essentialRequirements = ["workload"];
      answers.essentialDetails.externalDisplayCount = null;
    }),
    expected: {
      leaderId: "macbook-pro-16-m5-max-18cpu-32gpu-36gb-2tb",
      matchType: "exact", basisPoints: 9647, confidencePoints: 94,
      decidingFactor: "ranking-score",
      engineDigest: "67e0c97f8cf6d8b851826d93a6c7beeecc551611c359543e01adf9737c31cbe8",
    },
  },
  {
    id: "hard-workload",
    answers: varied(development, (answers) => {
      answers.essentialRequirements = ["workload"];
    }),
    expected: {
      leaderId: "macbook-pro-14-m5-pro-15cpu-16gpu-24gb-1tb",
      matchType: "exact", basisPoints: 9493, confidencePoints: 90,
      decidingFactor: null,
      engineDigest: "617818542c0728de4211837bed9fac45c81e88dbd8b1e14e802e294b211346bd",
    },
  },
  {
    id: "portability-compromise",
    answers: varied(demandingCodingAnswers, (answers) => {
      answers.essentialRequirements = ["workload"];
      answers.essentialDetails.externalDisplayCount = null;
      answers.devicePreferences.portabilityPerformance = "portability-first";
      answers.devicePreferences.screenSize = "13-inch";
    }),
    expected: {
      leaderId: "macbook-pro-14-m5-pro-15cpu-16gpu-24gb-1tb",
      matchType: "closest", basisPoints: 8941, confidencePoints: 86,
      decidingFactor: null,
      engineDigest: "0acca45924309aae5c4f78a8bfb00050ce2faa6cb91f83487e8b5b50eb8e33ed",
    },
  },
  {
    id: "uncertain",
    answers: varied(everydayPortableAnswers, (answers) => {
      answers.activities = ["unsure"];
      answers.multitasking = "varies-unsure";
      answers.budget.target = "no-fixed-target";
      answers.budget.mode = null;
      answers.minimumStorage = "unsure";
      answers.devicePreferences.screenSize = "no-preference";
      answers.devicePreferences.portabilityPerformance = "let-northstar-decide";
    }),
    expected: {
      leaderId: "macbook-neo-13-a18-pro-8gb-256gb",
      matchType: "exact", basisPoints: 10000, confidencePoints: 57,
      decidingFactor: "tie-price",
      engineDigest: "d5152a19d21a14ce7e017c370cb75ee5d37a87b8668336258a6ad86e1d880513",
    },
  },
  {
    id: "close-ranking",
    answers: varied(everydayPortableAnswers, (answers) => {
      answers.devicePreferences.screenSize = "16-inch";
    }),
    expected: {
      leaderId: "macbook-air-15-m5-10cpu-10gpu-16gb-512gb",
      matchType: "exact", basisPoints: 9294, confidencePoints: 88,
      decidingFactor: "ranking-score",
      engineDigest: "26c9066b7e1569f044b79830ee117beb616ce0a521127a27e27324f29c7024ad",
    },
  },
]);

export function insightAnswers(id) {
  const scenario = insightScenarios.find((candidate) => candidate.id === id);
  if (!scenario) throw new TypeError(`Unknown insight scenario: ${id}`);
  return cloneAnswers(scenario.answers);
}
