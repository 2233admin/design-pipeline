# Tasks

- [x] Add failing contract tests for a `pending` source: contract valid, `reference check` blocked with reason `source-pending`.
- [x] Add `availability`, `pendingReason`, `requestedFrom`, `requestedAt`, `resolvedAt` to `reference-evidence.schema.json` with conditional requirements.
- [x] Default absent `availability` to `resolved` so existing v2 documents stay valid.
- [x] Allow null `path`, `width`, `height`, `sha256` only when `availability` is `pending`.
- [x] Add the `source-pending` blocked reason to `reference-evidence-core.cjs` and `check-reference-evidence.cjs`.
- [x] Refuse `reconstruction check --stage geometry|final` against a pending source; report `blocked`, never `fidelity-limited`.
- [x] Keep `intent.requestedFidelity` and `intent.downgrade` untouched by a pending source.
- [ ] Record `resolvedAt` when a source later lands so pending-origin runs stay identifiable. The
      contract accepts and validates `resolvedAt` and forbids it while pending, and `reference-spec.md`
      tells the agent to write it, but nothing records it and no gate or report reads it, so a
      pending-origin run is not in fact identifiable.
- [x] Update `reference-spec.md` and `reconstruction-spec.md`.
- [x] Run focused tests, full tests, and package QA.
