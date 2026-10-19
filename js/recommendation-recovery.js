import { getQuestionControl, getQuestionDefinition, getQuestionStepForControl } from "./questionnaire-definition.js";
import { deepFreeze, deriveQuestionnaireProfile, getAnswerValue, getVisibleControls, getVisibleQuestionIds,
  validateQuestionnaireAnswers } from "./questionnaire-profile.js";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const money = (minor) => currency.format(minor / 100);
const supported = new Map([
  ["budget", { key: "budgetMaximumMinor", label: "Maximum budget", unit: "GBP-minor", controls: ["budgetTarget", "budgetMode", "absoluteBudget"], questionId: "budget", action: "Review budget" }],
  ["storage", { key: "storageMinimumGb", label: "Minimum storage", unit: "GB", controls: ["minimumStorage"], questionId: "minimumStorage", action: "Edit storage requirement" }],
  ["workload-capability", { key: "workloadCapabilityBand", label: "Mandatory workload capability", unit: "Northstar-band", essential: "workload", controls: ["essentialRequirements", "primaryUses", "activities", "multitasking"], questionId: "essentialRequirements", action: "Review must-haves" }],
  ["workload-memory", { key: "memoryMinimumGb", label: "Mandatory workload memory", unit: "GB", essential: "workload", controls: ["essentialRequirements", "primaryUses", "activities", "multitasking"], questionId: "essentialRequirements", action: "Review must-haves" }],
  ["weight", { key: "weightMaximumKg", label: "Maximum weight", unit: "kg", essential: "maximum-weight", controls: ["essentialRequirements", "maximumWeight"], questionId: "maximumWeight", action: "Review weight limit" }],
  ["screen-size", { key: "exactScreenSizeInches", label: "Exact screen size", unit: "inches", essential: "exact-screen", controls: ["essentialRequirements", "screenSize"], questionId: "devicePreferences", action: "Review screen size" }],
  ["external-displays", { key: "externalDisplayMinimum", label: "External monitors", unit: "count", essential: "external-displays", controls: ["essentialRequirements", "externalDisplayCount"], questionId: "externalDisplayCount", action: "Review monitor requirement" }],
]);

// Names in existing engine evidence, not another set of requirement values or eligibility rules.
const thresholdKeys = new Map([
  ["budget", "limitMinor"], ["storage", "minimumGb"], ["workload-capability", "minimumBand"],
  ["workload-memory", "minimumGb"], ["weight", "maximumKg"],
  ["screen-size", "requiredInches"], ["external-displays", "minimumCount"],
]);

const catalogueNotices = [
  ["availability", "Some configurations were excluded because their availability was not verified."],
  ["market", "Some configurations were excluded because they lack verified UK market data."],
  ["incomplete-data", "Some configurations lack the verified data needed for a safe comparison."],
  ["complete-data", "Some configurations did not pass the engine’s complete-data check."],
];

function answerReference(controlId, answers, visibleQuestionIds) {
  const control = getQuestionControl(controlId);
  const question = getQuestionStepForControl(controlId);
  if (!control || !question || !visibleQuestionIds.includes(question.id) ||
      !getVisibleControls(question, answers).some(({ id }) => id === controlId)) return null;
  const value = getAnswerValue(answers, control.answerPath);
  if (value === null || value === undefined || value === "") return null;
  const values = Array.isArray(value) ? value : [value];
  const labels = values.map((id) => control.options.find((option) => option.id === id)?.label);
  if (labels.some((label) => !label)) return null;
  return { kind: "user-answer", controlId, answerPath: control.answerPath,
    value: structuredClone(value), label: labels.join(", ") };
}

function requirementSummary(code, value, output) {
  switch (code) {
    case "budget": {
      const { mode } = output.input.answers.budget;
      const target = output.profile.preferences.budgetTargetMinor;
      return mode === "strict"
        ? `Your strict budget maximum is ${money(value)}.`
        : `Your preferred target is ${money(target)}; your explicit absolute maximum is ${money(value)} (${mode} budget mode).`;
    }
    case "storage": return `Your selected minimum built-in storage is ${value >= 1000 ? `${value / 1000} TB` : `${value} GB`}.`;
    case "workload-capability": return `Workload is a must-have. Northstar’s derived capability target is band ${value}, based on your uses, activities and multitasking.`;
    case "workload-memory": return `Workload is a must-have. Northstar’s derived memory target is ${value} GB, based on your uses, activities and multitasking.`;
    case "weight": return `Your selected mandatory maximum weight is ${value} kg.`;
    case "screen-size": return `Your selected screen size must be exactly ${value}-inch.`;
    case "external-displays": return `Your requirement is at least ${value} external monitors used with the built-in screen active.`;
    default: return "";
  }
}

function budgetContext(output) {
  const alternatives = output.budgetLimitedAlternatives;
  if (!Array.isArray(alternatives) || alternatives.length === 0) return null;
  const maximum = output.profile.hardRequirements.budgetMaximumMinor;
  const seen = new Set();
  for (const alternative of alternatives) {
    if (!alternative || typeof alternative.productId !== "string" || !alternative.productId ||
        seen.has(alternative.productId) || !Number.isSafeInteger(alternative.priceMinor) ||
        alternative.priceMinor <= 0 || !Number.isSafeInteger(alternative.amountOverLimitMinor) ||
        alternative.amountOverLimitMinor <= 0 ||
        alternative.amountOverLimitMinor !== alternative.priceMinor - maximum) return null;
    seen.add(alternative.productId);
    const exclusions = output.exclusions.filter(({ productId }) => productId === alternative.productId);
    if (exclusions.length !== 1) return null;
    const failures = exclusions[0].failedFilters;
    // The engine's own recorded failures must say budget only; do not rerun any filter.
    if (failures.length !== 1 || failures[0].code !== "budget" ||
        failures[0].details?.limitMinor !== maximum ||
        failures[0].details?.actualMinor !== alternative.priceMinor) return null;
  }
  return {
    mode: output.input.answers.budget.mode,
    preferredTargetMinor: output.profile.preferences.budgetTargetMinor,
    maximumMinor: maximum,
    alternatives: alternatives.map(({ productId, priceMinor, amountOverLimitMinor }) =>
      ({ productId, priceMinor, amountOverLimitMinor })),
  };
}

/**
 * A transient downstream projection of an existing engine result, never an eligibility calculation.
 * Blockers follow diagnostics.appliedFilterCodes; references follow exclusions/failedFilters order.
 * Actions follow first blocker occurrence, deduplicated by existing question ID. Related Essentials
 * share one selection action, followed by their available specific value editors. No counts rank them.
 * All returned values are detached and deeply frozen; the caller's output is untouched.
 */
export function buildRecommendationRecovery({ output }) {
  if (!output || !["ok", "budget-limited", "no-match", "invalid-input", "invalid-catalog"].includes(output.status)) {
    throw new TypeError("Recovery requires a supported recommendation outcome.");
  }
  const model = { status: output.status, explanation: null, blockers: [], actions: [], notices: [], budgetContext: null };
  if (!["budget-limited", "no-match"].includes(output.status)) return deepFreeze(model);

  model.explanation = "Northstar could not identify a reliable answer-edit route from this result. You can keep your answers or review them below.";
  const exclusions = Array.isArray(output.exclusions) ? output.exclusions : [];
  const failedCodes = new Set(exclusions.flatMap(({ failedFilters = [] }) => failedFilters.map(({ code }) => code)));
  model.notices = catalogueNotices.filter(([code]) => failedCodes.has(code))
    .map(([code, message]) => ({ code, message }));
  if ([...failedCodes].some((code) => !supported.has(code) && !catalogueNotices.some(([known]) => known === code))) {
    model.notices.push({ code: "unsupported-filter", message: "Some engine checks have no supported answer-edit route." });
  }
  const answers = output.input?.answers;
  if (!validateQuestionnaireAnswers(answers).valid || !output.profile?.hardRequirements) return deepFreeze(model);
  // Validate against the existing source of answer-to-requirement mappings. Never substitute this
  // profile into the result or use it to calculate eligibility, scores or alternative outcomes.
  const expectedProfile = deriveQuestionnaireProfile(answers);
  const visible = getVisibleQuestionIds(answers);

  const applied = output.diagnostics?.appliedFilterCodes ?? [];
  for (const code of applied) {
    const mapping = supported.get(code);
    if (!mapping || model.blockers.some((blocker) => blocker.code === code)) continue;
    // In budget-limited results the engine has already found configurations meeting other must-haves.
    if (output.status === "budget-limited" && code !== "budget") continue;
    const value = output.profile.hardRequirements[mapping.key];
    if (!Number.isFinite(value) || value <= 0 || !failedCodes.has(code) ||
        !(output.diagnostics?.blockerCounts?.[code] > 0)) continue;
    if (value !== expectedProfile.hardRequirements[mapping.key]) continue;
    if (code === "budget" && output.profile.preferences?.budgetTargetMinor !==
        expectedProfile.preferences.budgetTargetMinor) continue;
    if (code === "budget" && (answers.budget.target === "no-fixed-target" ||
        !["strict", "flexible", "stretch"].includes(answers.budget.mode) ||
        (answers.budget.mode !== "strict" && [null, "no-absolute-limit"].includes(answers.budget.absoluteMaximum)))) continue;
    if (code === "storage" && answers.minimumStorage === "unsure") continue;
    if (mapping.essential && !answers.essentialRequirements.includes(mapping.essential)) continue;
    const answerReferences = mapping.controls.map((id) => answerReference(id, answers, visible)).filter(Boolean);
    if (!answerReferences.length) continue;
    let questionId = visible.includes(mapping.questionId) && getQuestionDefinition(mapping.questionId)
      ? mapping.questionId : null;
    if (!questionId && mapping.essential && visible.includes("essentialRequirements")) questionId = "essentialRequirements";
    const evidenceReferences = [];
    let consistent = true;
    exclusions.forEach(({ productId, failedFilters = [] }, exclusionIndex) => {
      failedFilters.forEach((filter, filterIndex) => {
        if (filter.code !== code) return;
        if (typeof productId !== "string" || !productId || filter.details?.[thresholdKeys.get(code)] !== value ||
            filter.judgement !== (code.startsWith("workload-") ? "northstar-assessment" : "verified-fact")) {
          consistent = false;
          return;
        }
        evidenceReferences.push({ productId,
          path: ["exclusions", exclusionIndex, "failedFilters", filterIndex], judgement: filter.judgement });
      });
    });
    if (!consistent || evidenceReferences.length === 0) continue;
    if (output.status === "budget-limited") {
      const context = budgetContext(output);
      if (!context) continue;
      model.budgetContext = context;
    }
    model.blockers.push({ code, label: mapping.label,
      requirement: { kind: code.startsWith("workload-") ? "northstar-assessment" : "user-answer",
        value, unit: mapping.unit },
      summary: requirementSummary(code, value, output), answerReferences, evidenceReferences, questionId });
  }

  const essentialBlockers = model.blockers.filter(({ code }) => supported.get(code).essential);
  const essentialSelections = new Set(essentialBlockers.map(({ code }) => supported.get(code).essential));
  const groupEssentials = essentialSelections.size > 1;
  const addAction = (questionId, label, codes) => {
    if (!questionId) return;
    const existing = model.actions.find((action) => action.questionId === questionId);
    if (existing) {
      codes.forEach((code) => { if (!existing.blockerCodes.includes(code)) existing.blockerCodes.push(code); });
    } else model.actions.push({ questionId, label, blockerCodes: [...codes] });
  };
  for (const blocker of model.blockers) {
    const mapping = supported.get(blocker.code);
    if (groupEssentials && mapping.essential) {
      addAction("essentialRequirements", "Review must-haves", essentialBlockers.map(({ code }) => code));
    }
    addAction(blocker.questionId, blocker.questionId === "essentialRequirements" ? "Review must-haves" : mapping.action, [blocker.code]);
  }
  if (model.blockers.length > 0) {
    model.explanation = output.status === "budget-limited"
      ? "The engine found configurations meeting your other must-haves above the permitted budget maximum. They remain excluded, not recommendations."
      : "These active requirements excluded configurations in this catalogue. A configuration may fail several checks; this does not identify any one requirement as the only blocker.";
  }
  return deepFreeze(model);
}
