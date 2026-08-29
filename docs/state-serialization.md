# Northstar questionnaire-state serialization

Status: v1.2 Phase 1 internal contract; implemented locally and awaiting review

| Versioned concern | Value |
| --- | --- |
| Application/package | `1.2.0` |
| Questionnaire schema | `3` |
| Questionnaire-state schema | `1` |
| Recommendation rules | `2.1.0` |

These versions are independent. The application version identifies the developing release, the
questionnaire schema identifies the meaning of questionnaire and option IDs, the state-schema
version identifies the persisted/shared envelope, and the recommendation-rules version identifies
scoring behaviour. A state-schema change does not implicitly change questionnaire meanings or
recommendation rules.

## Contract

State schema 1 is canonical JSON with this exact top-level shape and field order:

```json
{
  "stateSchemaVersion": 1,
  "questionnaireSchemaVersion": 3,
  "status": "in-progress",
  "currentQuestionId": "activities",
  "answers": {
    "budgetTarget": "up-to-2500",
    "budgetMode": "strict",
    "primaryUses": ["software-development", "cybersecurity-vms"],
    "activities": ["general-programming"]
  }
}
```

`status` is exactly `in-progress` or `complete`. `currentQuestionId` is a stable question ID. Each
`answers` key is a stable control ID from `js/questionnaire-definition.js`; each value is either one
stable option ID for a radio control or an array of stable option IDs for a checkbox control.
Unanswered controls are omitted, so an initial partial state has an empty `answers` object.

The serialized contract never contains labels, prompts, HTML, recommendation output, scores,
confidence, product IDs selected by the engine, Apple facts or catalogue data. After validation,
the application reconstructs its private questionnaire answer shape from trusted control
definitions. Display text continues to resolve from those definitions rather than serialized data.

## Partial and complete validation

The partial validator accepts only `in-progress` state. Every supplied answer must be fully valid,
but the current and future visible questions may remain unanswered. The current question must be
visible, and all visible questions before it must have their required answers, which prevents an
unreachable resume position. A fully answered questionnaire may remain `in-progress` until the
visitor explicitly completes it.

The complete validator accepts only `complete` state. Every required visible control must pass the
existing schema-3 questionnaire validation, and `currentQuestionId` must be the final visible
question. Incomplete answers cannot be relabelled as complete state.

## Untrusted input policy

Schema 1 uses strict rejection rather than silent repair. Validation rejects:

- missing, invalid or unsupported state/questionnaire versions;
- unknown or unexpected properties, question IDs, control IDs and option IDs;
- incorrect radio/checkbox types, sparse arrays, duplicate IDs and excessive selections;
- mutually exclusive combinations;
- answers or current questions hidden by the state's own adaptive triggers;
- options unavailable under the reconstructed answers;
- stale dependent values that reconciliation would remove;
- complete states with missing required answers; and
- objects with accessors, symbols, unexpected prototypes or prototype-related keys such as
  `__proto__`, `prototype` and `constructor`.

Untrusted records are inspected and then reconstructed from an allowlist. They are never merged
into application state. Reconciliation is used as a consistency check: if it would change a
current-schema payload, validation rejects that payload. A future schema migration may define a
different, explicit policy, but unsupported versions are not guessed or reinterpreted.

## Canonicalization

Successful validation constructs a new frozen state in this order:

1. `stateSchemaVersion`;
2. `questionnaireSchemaVersion`;
3. `status`;
4. `currentQuestionId`; and
5. `answers`.

Answer keys follow control-definition order. Multi-select values follow their option-definition
order because selection order has no semantic meaning in schema 3. Unanswered controls are omitted,
and JSON is emitted without insignificant whitespace. Equivalent valid states therefore serialize
to the same string regardless of input property or selection order.

Phase 1 deliberately uses plain canonical JSON as the state-to-string boundary. It is
dependency-free, inspectable and suitable for later local-storage or URL transport encoding. JSON
and any later base64-style transport encoding are not encryption.

## Payload bound

Serialized input is limited to 4,096 UTF-8 bytes before JSON parsing. This comfortably exceeds the
current schema-3 state while bounding allocation and parsing of tampered input and leaving several
times the present questionnaire size for compatible evolution. The serializer enforces the same
limit on canonical output. Tests cover valid payloads immediately below and exactly at the limit,
plus rejection one byte above it.

## Module API

`js/questionnaire-serialization.js` exposes:

- separate partial, complete and status-dispatching validators;
- a factory that converts trusted private questionnaire answers into the sparse state contract;
- deterministic serialization;
- size-bounded parse-and-validation that returns a failure result instead of exposing parser
  exceptions; and
- a typed error for attempts by trusted application code to serialize invalid state.

The module has no storage, URL, history, clipboard, rendering, catalogue or recommendation-engine
responsibility.
