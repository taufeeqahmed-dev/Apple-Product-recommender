import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createQuestionnaireState } from "../js/questionnaire-serialization.js";
import { parseQuestionnaireShareUrl } from "../js/questionnaire-url.js";
import {
  RESULTS_SHARE_ACTION_LABEL,
  RESULTS_SHARE_COPY_SUCCESS,
  RESULTS_SHARE_MANUAL_COPY,
  RESULTS_SHARE_PRIVACY_DISCLOSURE,
  copyShareUrl,
  createResultsShareUrl,
  getShareCopyPresentation,
  isCompleteQuestionnaireStateShareable,
} from "../js/results-share.js";
import { createInitialAnswers } from "../js/questionnaire-profile.js";
import { everydayPortableAnswers } from "./fixtures/questionnaire-scenarios.js";

const ROOT_URL = "http://127.0.0.1:4173/";

function completeState() {
  return createQuestionnaireState({
    status: "complete",
    currentQuestionId: "essentialRequirements",
    answers: everydayPortableAnswers,
  });
}

function partialState() {
  const answers = createInitialAnswers();
  answers.budget.target = "no-fixed-target";
  return createQuestionnaireState({
    status: "in-progress",
    currentQuestionId: "primaryUses",
    answers,
  });
}

test("only validated complete questionnaire state is eligible for the results share UI", () => {
  assert.equal(isCompleteQuestionnaireStateShareable(completeState()), true);
  assert.equal(isCompleteQuestionnaireStateShareable(partialState()), false);
  assert.equal(isCompleteQuestionnaireStateShareable({ status: "complete" }), false);
});

test("results sharing delegates complete state to the existing Phase 3 URL format", () => {
  const url = createResultsShareUrl(completeState(), ROOT_URL);
  const imported = parseQuestionnaireShareUrl(url);
  assert.match(new URL(url).hash, /^#northstar=v1\.[A-Za-z0-9_-]+$/);
  assert.equal(imported.valid, true);
  assert.deepEqual(imported.state, completeState());
});

test("results sharing cannot publicly export partial questionnaire state", () => {
  assert.throws(
    () => createResultsShareUrl(partialState(), ROOT_URL),
    /Only validated complete questionnaire state/,
  );
});

test("equivalent complete states create one deterministic results share URL", () => {
  const state = completeState();
  const reordered = {
    answers: Object.fromEntries(Object.entries(state.answers).reverse()),
    currentQuestionId: state.currentQuestionId,
    status: state.status,
    questionnaireSchemaVersion: state.questionnaireSchemaVersion,
    stateSchemaVersion: state.stateSchemaVersion,
  };
  assert.equal(
    createResultsShareUrl(reordered, ROOT_URL),
    createResultsShareUrl(state, ROOT_URL),
  );
});

test("successful Clipboard API copying writes the generated URL once", async () => {
  const writes = [];
  const result = await copyShareUrl("https://example.test/#northstar=v1.payload", {
    clipboard: { writeText: async (value) => writes.push(value) },
  });
  assert.deepEqual(result, { status: "copied" });
  assert.deepEqual(writes, ["https://example.test/#northstar=v1.payload"]);
});

test("missing Clipboard API support selects the manual-copy path", async () => {
  assert.deepEqual(await copyShareUrl("https://example.test/share", { clipboard: null }), {
    status: "unavailable",
  });
});

test("Clipboard API rejection is contained and selects the manual-copy path", async () => {
  const result = await copyShareUrl("https://example.test/share", {
    clipboard: { writeText: async () => { throw new Error("denied"); } },
  });
  assert.deepEqual(result, { status: "failed" });
});

test("invalid copy input fails safely without invoking Clipboard API", async () => {
  let calls = 0;
  const result = await copyShareUrl("", {
    clipboard: { writeText: async () => { calls += 1; } },
  });
  assert.deepEqual(result, { status: "failed" });
  assert.equal(calls, 0);
});

test("copy feedback distinguishes success from the shared manual fallback", () => {
  assert.deepEqual(getShareCopyPresentation("copied"), {
    message: RESULTS_SHARE_COPY_SUCCESS,
    showFallback: false,
  });
  for (const status of ["unavailable", "failed"]) {
    assert.deepEqual(getShareCopyPresentation(status), {
      message: RESULTS_SHARE_MANUAL_COPY,
      showFallback: true,
    });
  }
  assert.deepEqual(getShareCopyPresentation("idle"), { message: "", showFallback: false });
});

test("the share UI contract uses the approved action, privacy and confirmation wording", () => {
  assert.equal(RESULTS_SHARE_ACTION_LABEL, "Share results");
  assert.equal(
    RESULTS_SHARE_PRIVACY_DISCLOSURE,
    "Anyone with this link can view the questionnaire choices included in it.",
  );
  assert.equal(RESULTS_SHARE_COPY_SUCCESS, "Recommendation link copied.");
  assert.equal(RESULTS_SHARE_MANUAL_COPY, "Copy this link manually.");
});

test("the rendered share contract keeps fallback text selectable and payloads out of HTML", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="results-share-url"[\s\S]*readonly/);
  assert.match(html, /id="results-share-status"[\s\S]*role="status"[\s\S]*aria-live="polite"/);
  assert.ok(html.includes(RESULTS_SHARE_PRIVACY_DISCLOSURE));
  assert.equal(html.includes("innerHTML"), false);
});

test("imported and invalid link messages are friendly trusted interface text", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const resultsSource = await readFile(new URL("../js/results.js", import.meta.url), "utf8");
  assert.match(resultsSource, /Shared recommendation loaded\./);
  assert.match(html, /This shared link couldn’t be used/);
  assert.match(html, /No progress saved in this browser was[\s\S]*changed/);
});
