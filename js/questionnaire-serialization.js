import {
  getAllQuestionControls,
  getQuestionControl,
  getQuestionDefinition,
  getQuestionStepForControl,
} from "./questionnaire-definition.js";
import {
  createInitialAnswers,
  deepFreeze,
  getAnswerValue,
  getAvailableControlOptions,
  getVisibleControls,
  getVisibleQuestionIds,
  reconcileQuestionnaireAnswers,
  setAnswerValue,
  validateQuestionnaireAnswers,
} from "./questionnaire-profile.js";
import {
  QUESTIONNAIRE_SCHEMA_VERSION,
  QUESTIONNAIRE_STATE_SCHEMA_VERSION,
} from "./version.js";

export const MAX_SERIALIZED_QUESTIONNAIRE_STATE_BYTES = 4096;

const STATE_STATUSES = new Set(["in-progress", "complete"]);
const TOP_LEVEL_FIELDS = [
  "stateSchemaVersion",
  "questionnaireSchemaVersion",
  "status",
  "currentQuestionId",
  "answers",
];
const TOP_LEVEL_FIELD_SET = new Set(TOP_LEVEL_FIELDS);
const DANGEROUS_PROPERTY_NAMES = new Set(["__proto__", "prototype", "constructor"]);
const QUESTION_CONTROLS = getAllQuestionControls();
const CONTROL_IDS = new Set(QUESTION_CONTROLS.map(({ id }) => id));

function issue(code, path, message) {
  return { code, path, message };
}

function invalidResult(errors) {
  return deepFreeze({ valid: false, state: null, questionnaireAnswers: null, errors });
}

function validResult(state, questionnaireAnswers) {
  return deepFreeze({ valid: true, state, questionnaireAnswers, errors: [] });
}

function inspectRecord(value, path, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(issue("invalid-object", path, "Expected an object containing data properties."));
    return null;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    errors.push(
      issue("unsafe-object-prototype", path, "Objects with unexpected prototypes are not accepted."),
    );
    return null;
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string") {
      errors.push(issue("invalid-property-key", path, "Symbol properties are not accepted."));
      continue;
    }
    if (DANGEROUS_PROPERTY_NAMES.has(key)) {
      errors.push(
        issue("dangerous-property", path, "Prototype-related property names are not accepted."),
      );
      continue;
    }
    const descriptor = descriptors[key];
    if (!("value" in descriptor) || !descriptor.enumerable) {
      errors.push(
        issue("invalid-property-descriptor", path, "Only enumerable data properties are accepted."),
      );
    }
  }
  return descriptors;
}

function inspectArray(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(issue("invalid-answer-type", path, "Expected an array of option IDs."));
    return null;
  }
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    errors.push(
      issue("unsafe-array-prototype", path, "Arrays with unexpected prototypes are not accepted."),
    );
    return null;
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const length = descriptors.length?.value;
  if (!Number.isSafeInteger(length) || length < 0) {
    errors.push(issue("invalid-selection-array", path, "The selection array is invalid."));
    return null;
  }

  const values = [];
  for (const key of Reflect.ownKeys(descriptors)) {
    if (key === "length") continue;
    if (typeof key !== "string") {
      errors.push(issue("invalid-property-key", path, "Symbol properties are not accepted."));
      continue;
    }
    if (DANGEROUS_PROPERTY_NAMES.has(key)) {
      errors.push(
        issue("dangerous-property", path, "Prototype-related property names are not accepted."),
      );
      continue;
    }
    if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= length) {
      errors.push(issue("invalid-array-property", path, "Selection arrays cannot contain extra properties."));
      continue;
    }
    const descriptor = descriptors[key];
    if (!("value" in descriptor) || !descriptor.enumerable) {
      errors.push(
        issue("invalid-property-descriptor", path, "Only enumerable data properties are accepted."),
      );
    }
  }

  if (length > QUESTION_CONTROLS.reduce((maximum, control) => Math.max(maximum, control.options.length), 0)) {
    errors.push(issue("excessive-selection-array", path, "The selection array is unreasonably large."));
    return null;
  }

  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      errors.push(issue("sparse-selection-array", path, "Sparse selection arrays are not accepted."));
      return null;
    }
    values.push(descriptor.value);
  }
  return values;
}

function getDescriptorValue(descriptors, key) {
  return descriptors && Object.hasOwn(descriptors, key) ? descriptors[key].value : undefined;
}

function canonicalOptionValues(control, values) {
  const optionOrder = new Map(control.options.map(({ id }, index) => [id, index]));
  return [...values].sort((left, right) => optionOrder.get(left) - optionOrder.get(right));
}

function validateAnswerValue(control, value, errors) {
  const path = `answers.${control.id}`;
  const knownOptionIds = new Set(control.options.map(({ id }) => id));

  if (control.type === "radio") {
    if (typeof value !== "string" || value.length === 0) {
      errors.push(issue("invalid-answer-type", path, "Expected one non-empty option ID."));
      return null;
    }
    if (!knownOptionIds.has(value)) {
      errors.push(issue("unknown-option-id", path, "The answer contains an unknown option ID."));
      return null;
    }
    return value;
  }

  const values = inspectArray(value, path, errors);
  if (!values) return null;
  if (values.length === 0) {
    errors.push(issue("empty-selection", path, "Empty selections must be omitted from serialized state."));
    return null;
  }
  if (control.minimumSelections && values.length < control.minimumSelections) {
    errors.push(issue("too-few-selections", path, "The answer has too few selections."));
  }
  if (control.maximumSelections && values.length > control.maximumSelections) {
    errors.push(issue("too-many-selections", path, "The answer has too many selections."));
  }

  const uniqueValues = new Set();
  values.forEach((optionId) => {
    if (typeof optionId !== "string" || !knownOptionIds.has(optionId)) {
      errors.push(issue("unknown-option-id", path, "The answer contains an unknown option ID."));
      return;
    }
    if (uniqueValues.has(optionId)) {
      errors.push(issue("duplicate-option-id", path, "Duplicate option IDs are not accepted."));
    }
    uniqueValues.add(optionId);
  });

  const exclusiveIds = new Set(control.options.filter(({ exclusive }) => exclusive).map(({ id }) => id));
  if (values.length > 1 && values.some((optionId) => exclusiveIds.has(optionId))) {
    errors.push(
      issue("exclusive-option-combination", path, "An exclusive option cannot be combined with another selection."),
    );
  }
  if (errors.some((error) => error.path === path)) return null;
  return canonicalOptionValues(control, values);
}

function isAnswered(value) {
  return Array.isArray(value)
    ? value.length > 0
    : value !== null && value !== "" && value !== undefined;
}

function canonicalAnswersFromQuestionnaireAnswers(questionnaireAnswers) {
  const answers = {};
  QUESTION_CONTROLS.forEach((control) => {
    const value = getAnswerValue(questionnaireAnswers, control.answerPath);
    if (!isAnswered(value)) return;
    answers[control.id] = Array.isArray(value)
      ? canonicalOptionValues(control, value)
      : value;
  });
  return answers;
}

function questionIsComplete(questionId, questionnaireAnswers) {
  const question = getQuestionDefinition(questionId);
  return getVisibleControls(question, questionnaireAnswers).every((control) => {
    if (!control.required) return true;
    return isAnswered(getAnswerValue(questionnaireAnswers, control.answerPath));
  });
}

function validateStateUnsafe(input, expectedStatus = null) {
  const errors = [];
  const descriptors = inspectRecord(input, "state", errors);
  if (!descriptors) return invalidResult(errors);

  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key === "string" && !DANGEROUS_PROPERTY_NAMES.has(key) && !TOP_LEVEL_FIELD_SET.has(key)) {
      errors.push(issue("unknown-property", "state", "The state contains an unknown top-level property."));
    }
  }
  TOP_LEVEL_FIELDS.forEach((field) => {
    if (!Object.hasOwn(descriptors, field)) {
      errors.push(issue("missing-property", `state.${field}`, "A required state property is missing."));
    }
  });

  const stateSchemaVersion = getDescriptorValue(descriptors, "stateSchemaVersion");
  if (!Number.isSafeInteger(stateSchemaVersion)) {
    errors.push(
      issue("invalid-state-schema-version", "state.stateSchemaVersion", "The state-schema version must be an integer."),
    );
  } else if (stateSchemaVersion !== QUESTIONNAIRE_STATE_SCHEMA_VERSION) {
    errors.push(
      issue("unsupported-state-schema-version", "state.stateSchemaVersion", "The state-schema version is not supported."),
    );
  }

  const questionnaireSchemaVersion = getDescriptorValue(descriptors, "questionnaireSchemaVersion");
  if (!Number.isSafeInteger(questionnaireSchemaVersion)) {
    errors.push(
      issue("invalid-questionnaire-schema-version", "state.questionnaireSchemaVersion", "The questionnaire-schema version must be an integer."),
    );
  } else if (questionnaireSchemaVersion !== QUESTIONNAIRE_SCHEMA_VERSION) {
    errors.push(
      issue("unsupported-questionnaire-schema-version", "state.questionnaireSchemaVersion", "The questionnaire-schema version is not supported."),
    );
  }

  const status = getDescriptorValue(descriptors, "status");
  if (typeof status !== "string" || !STATE_STATUSES.has(status)) {
    errors.push(issue("invalid-status", "state.status", "The questionnaire status is invalid."));
  } else if (expectedStatus && status !== expectedStatus) {
    errors.push(issue("status-mismatch", "state.status", "The state has the wrong questionnaire status for this validator."));
  }

  const currentQuestionId = getDescriptorValue(descriptors, "currentQuestionId");
  if (typeof currentQuestionId !== "string" || currentQuestionId.length === 0) {
    errors.push(issue("invalid-current-question", "state.currentQuestionId", "The current question ID is invalid."));
  } else if (!getQuestionDefinition(currentQuestionId)) {
    errors.push(issue("unknown-current-question", "state.currentQuestionId", "The current question ID is unknown."));
  }

  const answersInput = getDescriptorValue(descriptors, "answers");
  const answerDescriptors = inspectRecord(answersInput, "state.answers", errors);
  const validatedAnswerValues = new Map();
  if (answerDescriptors) {
    for (const controlId of Reflect.ownKeys(answerDescriptors)) {
      if (typeof controlId !== "string" || DANGEROUS_PROPERTY_NAMES.has(controlId)) continue;
      if (!CONTROL_IDS.has(controlId)) {
        errors.push(issue("unknown-answer-id", "state.answers", "The state contains an unknown answer ID."));
        continue;
      }
      const control = getQuestionControl(controlId);
      const value = validateAnswerValue(control, answerDescriptors[controlId].value, errors);
      if (value !== null) validatedAnswerValues.set(controlId, value);
    }
  }

  if (errors.length > 0) return invalidResult(errors);

  const canonicalAnswers = {};
  QUESTION_CONTROLS.forEach((control) => {
    if (validatedAnswerValues.has(control.id)) {
      canonicalAnswers[control.id] = validatedAnswerValues.get(control.id);
    }
  });

  const questionnaireAnswers = createInitialAnswers();
  QUESTION_CONTROLS.forEach((control) => {
    if (Object.hasOwn(canonicalAnswers, control.id)) {
      setAnswerValue(questionnaireAnswers, control.answerPath, canonicalAnswers[control.id]);
    }
  });

  const visibleQuestionIds = getVisibleQuestionIds(questionnaireAnswers);
  if (!visibleQuestionIds.includes(currentQuestionId)) {
    errors.push(
      issue("hidden-current-question", "state.currentQuestionId", "The current question is not visible for these answers."),
    );
  }

  QUESTION_CONTROLS.forEach((control) => {
    if (!Object.hasOwn(canonicalAnswers, control.id)) return;
    const question = getQuestionStepForControl(control.id);
    const visibleControls = visibleQuestionIds.includes(question.id)
      ? getVisibleControls(question, questionnaireAnswers)
      : [];
    if (!visibleControls.some(({ id }) => id === control.id)) {
      errors.push(issue("hidden-answer", `state.answers.${control.id}`, "The state retains an answer that is not visible."));
      return;
    }
    const availableOptionIds = new Set(
      getAvailableControlOptions(control, questionnaireAnswers).map(({ id }) => id),
    );
    const values = Array.isArray(canonicalAnswers[control.id])
      ? canonicalAnswers[control.id]
      : [canonicalAnswers[control.id]];
    if (values.some((optionId) => !availableOptionIds.has(optionId))) {
      errors.push(
        issue("unavailable-option", `state.answers.${control.id}`, "The answer is incompatible with the state's triggering answers."),
      );
    }
  });

  const reconciledAnswers = reconcileQuestionnaireAnswers(questionnaireAnswers);
  if (
    JSON.stringify(canonicalAnswersFromQuestionnaireAnswers(reconciledAnswers)) !==
    JSON.stringify(canonicalAnswers)
  ) {
    errors.push(
      issue("stale-dependent-answer", "state.answers", "The state contains stale dependent answers and was rejected."),
    );
  }

  const currentIndex = visibleQuestionIds.indexOf(currentQuestionId);
  if (status === "in-progress" && currentIndex >= 0) {
    const missingEarlierQuestion = visibleQuestionIds
      .slice(0, currentIndex)
      .find((questionId) => !questionIsComplete(questionId, questionnaireAnswers));
    if (missingEarlierQuestion) {
      errors.push(
        issue("unreachable-current-question", "state.currentQuestionId", "Earlier required questions are incomplete."),
      );
    }
  }

  if (status === "complete") {
    if (!validateQuestionnaireAnswers(questionnaireAnswers).valid) {
      errors.push(
        issue("incomplete-questionnaire", "state.answers", "A complete state must answer every currently required visible question."),
      );
    }
    if (currentQuestionId !== visibleQuestionIds.at(-1)) {
      errors.push(
        issue("invalid-complete-current-question", "state.currentQuestionId", "A complete state must identify its final visible question."),
      );
    }
  }

  if (errors.length > 0) return invalidResult(errors);

  const state = deepFreeze({
    stateSchemaVersion: QUESTIONNAIRE_STATE_SCHEMA_VERSION,
    questionnaireSchemaVersion: QUESTIONNAIRE_SCHEMA_VERSION,
    status,
    currentQuestionId,
    answers: canonicalAnswers,
  });
  return validResult(state, deepFreeze(questionnaireAnswers));
}

function validateState(input, expectedStatus = null) {
  try {
    return validateStateUnsafe(input, expectedStatus);
  } catch {
    return invalidResult([
      issue("unsafe-input", "state", "The state could not be inspected safely."),
    ]);
  }
}

export function validatePartialQuestionnaireState(input) {
  return validateState(input, "in-progress");
}

export function validateCompleteQuestionnaireState(input) {
  return validateState(input, "complete");
}

export function validateQuestionnaireState(input) {
  return validateState(input);
}

export class QuestionnaireStateValidationError extends TypeError {
  constructor(errors) {
    super("Questionnaire state did not pass validation.");
    this.name = "QuestionnaireStateValidationError";
    this.errors = errors;
  }
}

export function serializedQuestionnaireStateByteLength(serialized) {
  return new TextEncoder().encode(serialized).byteLength;
}

export function serializeQuestionnaireState(input) {
  const validation = validateQuestionnaireState(input);
  if (!validation.valid) throw new QuestionnaireStateValidationError(validation.errors);
  const serialized = JSON.stringify(validation.state);
  if (serializedQuestionnaireStateByteLength(serialized) > MAX_SERIALIZED_QUESTIONNAIRE_STATE_BYTES) {
    throw new QuestionnaireStateValidationError([
      issue("payload-too-large", "serializedState", "The serialized questionnaire state is too large."),
    ]);
  }
  return serialized;
}

export function parseQuestionnaireState(serialized) {
  if (typeof serialized !== "string") {
    return invalidResult([
      issue("invalid-serialized-type", "serializedState", "Serialized questionnaire state must be a string."),
    ]);
  }
  if (serializedQuestionnaireStateByteLength(serialized) > MAX_SERIALIZED_QUESTIONNAIRE_STATE_BYTES) {
    return invalidResult([
      issue("payload-too-large", "serializedState", "The serialized questionnaire state is too large."),
    ]);
  }

  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return invalidResult([
      issue("invalid-json", "serializedState", "Serialized questionnaire state is not valid JSON."),
    ]);
  }
  return validateQuestionnaireState(parsed);
}

export function createQuestionnaireState({ status, currentQuestionId, answers }) {
  const state = {
    stateSchemaVersion: QUESTIONNAIRE_STATE_SCHEMA_VERSION,
    questionnaireSchemaVersion: QUESTIONNAIRE_SCHEMA_VERSION,
    status,
    currentQuestionId,
    answers: canonicalAnswersFromQuestionnaireAnswers(answers),
  };
  const validation = validateQuestionnaireState(state);
  if (!validation.valid) throw new QuestionnaireStateValidationError(validation.errors);
  return validation.state;
}
