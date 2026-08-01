# Tasks

- [x] Add failing contract tests for a `pending` source: contract valid, `reference check` blocked with reason `source-pending`.
- [x] Add `availability`, `pendingReason`, `requestedFrom`, `requestedAt`, `resolvedAt` to `reference-evidence.schema.json` with conditional requirements.
- [x] Default absent `availability` to `resolved` so existing v2 documents stay valid.
- [x] Allow null `path`, `width`, `height`, `sha256` only when `availability` is `pending`.
- [x] Add the `source-pending` blocked reason to `reference-evidence-core.cjs` and `check-reference-evidence.cjs`.
- [x] Refuse `reconstruction check --stage geometry|final` against a pending source; report `blocked`, never `fidelity-limited`.
- [x] Keep `intent.requestedFidelity` and `intent.downgrade` untouched by a pending source.
- [ ] Record `resolvedAt` when a source later lands so pending-origin runs stay identifiable.
      Still unchecked, but for half the reason it was before. The reading half shipped: the graybox
      stage compares `source.resolvedAt` against `graybox.capturedAt` and blocks a `measured` claim
      whose capture predates the source with `graybox-capture-predates-source`, an unparseable
      `resolvedAt` blocks with `reference-source-resolved-at-invalid`, and a `pending` source that
      also records one blocks with `reference-source-resolved-at-contradictory`. So a run that
      records `resolvedAt` is now identifiable, and its stale evidence cannot claim to be measured.
      The writing half did not: no script stamps the field, so it remains an agent hand-edit per
      `reference-spec.md`, and a document that should have recorded `resolvedAt` but did not is
      still indistinguishable from one that never went through a pending phase. The task says
      `Record`, and nothing records it, so the box stays open. `design.md`, section
      `resolvedAt: Reader Shipped, Writer Missing`, documents the shipped reader exactly and names
      the writer that would close this.
- [x] Update `reference-spec.md` and `reconstruction-spec.md`.
- [x] Run focused tests, full tests, and package QA.
