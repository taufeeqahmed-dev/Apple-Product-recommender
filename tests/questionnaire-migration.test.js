import test from "node:test";
import assert from "node:assert/strict";

import { migrateV1Answers } from "../js/questionnaire-profile.js";
import {
  demandingCodingAnswers,
  everydayPortableAnswers,
  noMatchAnswers,
} from "./fixtures/questionnaire-scenarios.js";

test("a v1 everyday fixture preserves unambiguous constraints and flags changed concepts", () => {
  const migration = migrateV1Answers(everydayPortableAnswers);

  assert.equal(migration.answers.budget.target, "up-to-1500");
  assert.equal(migration.answers.budget.mode, "strict");
  assert.deepEqual(migration.answers.primaryUses, ["study-productivity"]);
  assert.equal(migration.answers.minimumStorage, "256gb");
  assert.equal(migration.answers.externalDisplays.count, "one");
  assert.equal(migration.answers.externalDisplays.requirementMode, "must-support");
  assert.equal(migration.answers.ownership.requirementMode, "preference");
  assert.equal(migration.requiresReview, true);
  assert.ok(migration.issues.some(({ code }) => code === "ambiguous-screen-group"));
  assert.ok(migration.issues.some(({ code }) => code === "adaptive-workload-review"));
});

test("the v1 coding and office fixture maps deliberately without duplicate new uses", () => {
  const migration = migrateV1Answers(demandingCodingAnswers);
  assert.deepEqual(migration.answers.primaryUses, ["software-development", "study-productivity"]);
  assert.equal(migration.answers.externalDisplays.count, "two");
  assert.equal(migration.answers.externalDisplays.requirementMode, "must-support");
});

test("the combined v1 video and 3D answer is never silently assigned to one new use", () => {
  const migration = migrateV1Answers(noMatchAnswers);
  assert.deepEqual(migration.answers.primaryUses, []);
  assert.ok(migration.issues.some(({ code }) => code === "ambiguous-video-3d"));
  assert.equal(migration.requiresReview, true);
});

test("invalid v1 input fails safely and requires review", () => {
  const migration = migrateV1Answers(null);
  assert.equal(migration.requiresReview, true);
  assert.equal(migration.issues[0].code, "invalid-v1-input");
});
