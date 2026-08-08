import test from "node:test";
import assert from "node:assert/strict";

import { migrateV1Answers, migrateV2Answers } from "../js/questionnaire-profile.js";
import {
  demandingCodingAnswers as v1DemandingCodingAnswers,
  everydayPortableAnswers as v1EverydayPortableAnswers,
  noMatchAnswers as v1NoMatchAnswers,
} from "./fixtures/v1-questionnaire-scenarios.js";

test("a v1 everyday fixture preserves unambiguous fields and flags concepts needing review", () => {
  const migration = migrateV1Answers(v1EverydayPortableAnswers);
  assert.equal(migration.answers.budget.target, "up-to-1500");
  assert.equal(migration.answers.budget.mode, "strict");
  assert.deepEqual(migration.answers.primaryUses, ["study-productivity"]);
  assert.deepEqual(migration.answers.activities, ["unsure"]);
  assert.equal(migration.answers.minimumStorage, "256gb");
  assert.equal(migration.answers.essentialDetails.externalDisplayCount, "one");
  assert.ok(migration.issues.some(({ code }) => code === "ambiguous-screen-group"));
  assert.ok(migration.issues.some(({ code }) => code === "ownership-removed"));
  assert.equal(migration.requiresReview, true);
});

test("the v1 coding fixture maps uses without duplicating shared activity groups", () => {
  const migration = migrateV1Answers(v1DemandingCodingAnswers);
  assert.deepEqual(migration.answers.primaryUses, ["software-development", "study-productivity"]);
  assert.deepEqual(migration.answers.activities, ["unsure"]);
  assert.equal(migration.answers.essentialDetails.externalDisplayCount, "two");
  assert.ok(migration.issues.some(({ code }) => code === "activity-review"));
});

test("the combined v1 video and 3D use is never guessed", () => {
  const migration = migrateV1Answers(v1NoMatchAnswers);
  assert.deepEqual(migration.answers.primaryUses, []);
  assert.ok(migration.issues.some(({ code }) => code === "ambiguous-video-3d"));
});

test("v2 activity and mandatory fields migrate deliberately into v3 essentials", () => {
  const migration = migrateV2Answers({
    budget: { target: "up-to-2500", mode: "strict", absoluteMaximum: null },
    primaryUses: ["software-development", "cybersecurity-vms"],
    workloadDetails: {
      softwareDevelopment: "containers-large-builds",
      cybersecurityVms: "two-vms",
      sustainedDuration: "hours-most-days",
    },
    multitasking: "heavy",
    workloadRequirementMode: "mandatory",
    mobility: {
      portabilityPerformance: "lean-performance",
      weightTarget: "up-to-1.55kg",
      weightRequirementMode: "must-not-exceed",
      batteryImportance: "long-travel-day",
    },
    screen: { size: "14-inch", requirementMode: "exact-size-required" },
    minimumStorage: "1tb",
    externalDisplays: { count: "two", requirementMode: "must-support" },
    connections: { needs: ["hdmi-without-adapter"], importance: "must-have" },
    ownership: { period: "5-to-6", requirementMode: "preference" },
  });

  assert.deepEqual(migration.answers.activities, ["docker-containers", "two-virtual-machines"]);
  assert.deepEqual(migration.answers.essentialRequirements, [
    "workload",
    "exact-screen",
    "maximum-weight",
    "external-displays",
  ]);
  assert.equal(migration.answers.essentialDetails.maximumWeight, "up-to-1.55kg");
  assert.equal(migration.answers.essentialDetails.externalDisplayCount, "two");
  assert.ok(migration.issues.some(({ code }) => code === "workload-detail-review"));
  assert.ok(migration.issues.some(({ code }) => code === "battery-removed"));
  assert.ok(migration.issues.some(({ code }) => code === "connections-removed"));
  assert.ok(migration.issues.some(({ code }) => code === "ownership-removed"));
});

test("invalid legacy input fails safely and requires review", () => {
  for (const migrate of [migrateV1Answers, migrateV2Answers]) {
    const migration = migrate(null);
    assert.equal(migration.requiresReview, true);
    assert.deepEqual(migration.answers.primaryUses, []);
  }
});
