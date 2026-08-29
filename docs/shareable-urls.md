# Northstar shareable questionnaire URLs

Status: v1.2 Phase 3 internal contract; reviewed, committed and pushed on the feature branch

## Transport format

Northstar carries questionnaire decision state in this fragment format:

```text
#northstar=v1.<payload>
```

| Concern | Value |
| --- | --- |
| Fragment key | `northstar` |
| URL transport version | `1` |
| Encoding | Unpadded base64url of UTF-8 canonical JSON |
| Maximum encoded payload | 5,462 characters, excluding `northstar=v1.` |
| Maximum decoded state | 4,096 UTF-8 bytes |
| Questionnaire-state schema | Carried independently inside decoded JSON; currently `1` |
| Questionnaire schema | Carried independently inside decoded JSON; currently `3` |

Base64url is encoding, not encryption. Anyone with a link can decode and recover its questionnaire
choices.

The transport version describes how the URL fragment is structured and encoded. It does not replace
or imply support for a questionnaire-state schema. Transport version 1 still requires the Phase 1
state and questionnaire versions to pass their own compatibility checks.

## Export

`js/questionnaire-url.js` is the pure URL import/export boundary. Export first calls the Phase 1
validator and canonical serializer, encodes the resulting UTF-8 bytes with a dependency-free
base64url implementation, enforces the encoded bound and replaces the supplied application URL's
fragment. It does not mutate active questionnaire state.

The URL origin, pathname and query are retained. Only the fragment is replaced, so both of these
forms work without server routing:

```text
http://127.0.0.1:4173/#northstar=v1.<payload>
https://taufeeqahmed-dev.github.io/apple-product-recommender/#northstar=v1.<payload>
```

Equivalent valid state produces the same payload. The current base path and query remain part of
the surrounding URL and do not enter serialized state.

## Import and validation

Startup processes the URL in this order:

```text
fragment detection
→ transport-version and encoded-length checks
→ strict base64url decoding
→ fatal UTF-8 decoding
→ decoded 4,096-byte check
→ Phase 1 JSON parse and strict state validation
→ trusted questionnaire-state reconstruction
→ current recommendation calculation when complete
```

Malformed encoding, invalid UTF-8, unsupported transport/state/questionnaire versions, unknown IDs,
duplicate selections, impossible adaptive combinations, stale hidden answers, unsafe object keys and
unexpected display/product/recommendation fields are rejected. No decoded payload string is rendered
as HTML, a label or an error message.

Unsupported versions are rejected rather than speculatively migrated. Reconciliation remains a
strict consistency check under the Phase 1 policy.

## URL and local-state precedence

A recognized share fragment is inspected before local persistence. When a valid or invalid share
fragment is present, startup does not read, normalize, clear or write browser-local questionnaire
state.

- **Valid shared state:** an explicit “Open shared questionnaire?” panel takes precedence. Local
  state remains untouched until the visitor chooses an action.
- **Continue with shared answers:** the shared state is restored through the trusted state API and
  immediately saved using the normal Phase 2 canonical local format. From that deliberate adoption
  point, it becomes the active browser session.
- **Use this browser instead:** the share fragment is removed and Phase 2 local loading begins. A
  valid saved session receives the normal resume prompt; otherwise a fresh questionnaire begins.
- **Invalid shared state:** an accessible recovery panel explains that the link cannot be used and
  that browser progress was not changed. Local storage is not read until “Continue without shared
  link” is selected.

Invalid shared data can therefore neither replace nor cause cleanup of valid local progress.

## Partial and complete links

Valid `in-progress` links restore the validated current question and adaptive profile, then allow the
visitor to continue normally. Valid `complete` links restore answer IDs and recalculate results using
the compatible current recommendation engine and verified catalogue.

Recommendation output, scores, confidence, product selections and catalogue facts never enter the
URL. A complete link can produce different recommendations in the future if compatible rules or the
verified catalogue change; the link represents choices, not a frozen result.

## URL hygiene and history

Valid input is replaced with its canonical equivalent using `history.replaceState`, without adding a
history entry. Invalid recognized fragments are removed with the same mechanism after their one
startup processing attempt, while the recovery panel remains visible.

After a shared state is adopted, meaningful questionnaire changes update that existing share
fragment canonically with `replaceState`, so it does not become stale or add history entries. If
normal anchor navigation replaces the share fragment, the URL-backed session ends and later state
changes do not recreate it. Restart or choosing browser progress also removes a remaining share
fragment.

## Privacy and scope

Share URLs contain no local-storage metadata, timestamps, accounts, cloud identifiers, labels,
recommendations or product data. They do contain recoverable questionnaire choices and must not be
treated as private storage. Links may be retained in browser history, bookmarks, messages or any
service through which a user shares them; URL fragments are not sent in the HTTP request itself.

Phase 3 provides the transport, import and precedence contract. Phase 4's complete-results sharing,
Clipboard API fallback and imported-link messaging are documented in `docs/share-ux.md`; they reuse
this format without changing it.
