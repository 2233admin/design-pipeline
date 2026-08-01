# Design: Pending Source State

## Schema Delta

`reference-evidence.schema.json`, `source` object:

```json
"source": {
  "availability": "resolved" | "pending",
  "path": "design/changes/<id>/source.png" | null,
  "kind": "image",
  "width": 722 | null,
  "height": 406 | null,
  "sha256": "<64 hex>" | null,
  "pendingReason": "supplied in conversation transcript; not written to disk",
  "requestedFrom": "user",
  "requestedAt": "<iso8601>",
  "resolvedAt": "<iso8601>"
}
```

Conditional requirements:

- `availability: resolved` requires non-null `path`, `width`, `height`, `sha256`, and forbids
  `pendingReason`.
- `availability: pending` requires `pendingReason` and `requestedFrom`, allows null `path`,
  `width`, `height`, `sha256`, and forbids `resolvedAt`.
- `resolvedAt` present implies `availability: resolved` and records that the run began pending. The
  graybox stage now reads it; nothing writes it. See `resolvedAt: Reader Shipped, Writer Missing`
  below.

Existing v2 documents with no `availability` field default to `resolved`, so nothing already written
becomes invalid.

## Three Separate Questions

The first draft of this design collapsed three questions into one and got the status table wrong as
a result. They are independent, they are answered by different code, and they are answered from
different evidence.

1. **Contract validity** - is the document well formed? Answered by `validateReferenceEvidence` in
   `reference-evidence-core.cjs` from the document alone. No file on disk is opened. A `resolved`
   document naming a raster that was never written is contract-valid.
2. **Measurability** - can anything actually be measured against the source? Answered by
   `referenceSourceState` in `reconstruction-core.cjs` from the disk:
   `measurable = availability === "resolved" && resolvable === true`, where `resolvable` means the
   declared `source.path` resolves inside the change root and the bytes there are a raster whose
   size can be read - existence is necessary, not sufficient. Measurability is a property of the
   disk, not of the declaration.
3. **Stage readiness** - is the stage the agent is standing in allowed to pass? Answered per stage,
   and it does not reduce to measurability. What blocks `geometry` and `final` is the *declaration*:
   `geometryResult` short-circuits on `source.invalid` and on `availability === "pending"`, and on
   nothing else about the source. It never consults `source.resolvable` or the raster, so a
   `resolved` declaration whose raster is absent or unreadable leaves `geometry` free to be `ready`
   on its own evidence. The raster matters to the graybox stage, and only when the comparison
   claims `measured`: a qualitative comparison needs no raster, so the graybox stage can be `ready`
   while the source is unmeasurable, and a `measured` comparison against a pending or unreadable
   source blocks the graybox stage for its own reason at the same time as the declaration blocks
   `geometry` for a different one.

A document can be valid and unmeasurable. A stage can be ready while the aggregate gate is blocked.
Neither implies the others. Freshness - was the evidence captured after the thing it claims to have
measured? - is a fourth question, answered from the timestamps rather than from the document or the
disk, and it is answered in `resolvedAt: Reader Shipped, Writer Missing` below.

Two readers open `reference-evidence.json`, and they fail differently on purpose. The reference
contract is strict: an out-of-enum `source.availability`, a `source` that is not an object, or an
unparseable document raises a contract failure, so `reference check` errors rather than reporting a
status. The reconstruction stages are lenient readers of the same file: they report `blocked` with
`reference-source-availability-invalid`, `reference-source-malformed`, or
`reference-source-unparseable` and `measurements: null`, because a declaration they cannot read is
not a licence to measure. Absent is not invalid: an absent field, and an absent document, both keep
the legacy `resolved` availability with `resolvable: false`, reported as
`reference-source-undeclared` and `reference-source-unrecorded`.

## Status Semantics

`designer-pipeline reference check` runs the graybox stage first, then the approval gate, then the
source gate, then the reconstruction stage when `intent.effectiveFidelity` is a reconstruction
fidelity. `foldReconciliation` in `cli-core.cjs` then wraps the whole result with the reconciliation
stage, so the CLI aggregate carries `stages.graybox` and `stages.reconciliation` while the library
function `checkReferenceEvidence` carries only the first. A block from either stage propagates into
every outcome, so an approved, resolved, measurable source is not by itself `ready`.

The reconciliation column below is `n/a` wherever the row is decided before it is reached. It is
reached last, so it is the gate that turns an otherwise-passing run into a block:

| Source on disk | Contract | Graybox stage | Reconciliation | `reference check` | Meaning |
| --- | --- | --- | --- | --- | --- |
| resolved, raster present | valid, approved | ready | ready | `ready` | the only unqualified pass |
| resolved, raster present | valid, approved | ready | blocked, `reconciliation-section-missing` | `blocked` | the spec was never reconciled against the render |
| resolved, raster present | valid, approved | blocked | n/a | `blocked`, graybox reason | the graybox stage is a gate, not a report |
| resolved, raster absent | valid, approved | ready, comparison qualitative | ready | `ready`, `measurable: false` | ordering discipline proven, fidelity not |
| resolved, raster absent | valid, approved | blocked, `reference-source-raster-missing` | n/a | `blocked` | a measured claim with no raster to measure |
| resolved, path names non-raster bytes | valid, approved | blocked, `reference-source-not-raster` | n/a | `blocked` | a measured claim against something that was never an image |
| resolved, raster present, capture predates `resolvedAt` | valid, approved | blocked, `graybox-capture-predates-source` | n/a | `blocked` | a measured claim by an artifact authored before the source landed |
| pending | valid, approved | ready, comparison qualitative | ready | `blocked`, reason `source-pending` | classification is usable, measurement is not |
| pending | valid, approved | blocked, `graybox-comparison-unmeasurable` | n/a | `blocked`, reason `source-pending`, graybox blockers trail | a measured claim against a pending source |
| any | valid, approval pending or rejected | any | n/a | `blocked`, reason `approval-pending` or `approval-rejected` | unchanged |
| any | invalid | not reached | not reached | contract failure | `reference check` raises rather than reporting |

A reconciliation block never overwrites an existing `reason`: `foldReconciliation` keeps
`result.reason` when one is already set and appends its blockers, so a run blocked on
`source-pending` with reconciliation also missing still reports `source-pending` at the top level
and carries both blockers. The `stages` map is where the second reason survives.

Every blocked outcome carries `contractValid: true`. `blocked` on `source-pending` is explicitly not
a failure of the change. It is the correct resting state for a run whose reference lives outside the
repository. The distinction matters because `blocked` reads as "something went wrong", and this
state is "something is known to be missing and has been asked for".

## Interaction With Other Gates

- The graybox stage runs on every route and every fidelity, including a `pending` source. It needs
  no raster, so a pending source does not stop it - but it does bound it. A `qualitative`
  comparison can reach `ready`; a comparison declaring `measured` mode blocks while the source is
  pending (`graybox-comparison-unmeasurable`) or while its raster is not a readable raster on disk,
  under whichever of the `reference-source-raster-*` reasons names the actual fault. The declared
  mode is reported as declared and never quietly rewritten, and `fidelityEvidence` is true only when
  the stage is ready, the source is measurable, and the mode is `measured`. So the original claim
  that "the graybox is unaffected by the raster" is wrong in one direction: the stage is unaffected,
  the fidelity claim it can carry is not.
- The graybox stage is also the only stage that can check freshness, because `graybox.capturedAt` is
  the only capture timestamp any carrier in this contract records. A `measured` graybox whose
  capture predates `source.resolvedAt` blocks with `graybox-capture-predates-source`.
- A reference document that cannot be read blocks the graybox stage on every path, qualitative
  included, because the stage reads its region binding out of that same document.
- `reconstruction check --stage geometry` and `--stage final` SHALL refuse to run against a
  `pending` source and report `blocked` with reason `source-pending` and `measurements: null`,
  never `fidelity-limited`. A threshold miss cannot be claimed when nothing was measured. An
  unreadable source declaration blocks the same stages under its own reason.
- `intent.requestedFidelity` remains whatever the user asked for. A pending source is not a
  downgrade trigger, and `intent.downgrade.status` stays `not-requested`.

## resolvedAt: Reader Shipped, Writer Missing

The field is kept, and this section is what it is kept against. The half of the gap this section
described as hypothetical - "reader, when built" - is now built. The other half is not.

### The reader, as shipped

`reconstruction-core.cjs` carries the declared value onto the source state in `resolvedSourceState`,
and `grayboxStalenessIssue(graybox, source)` compares `Date.parse(graybox.capturedAt)` against
`Date.parse(source.resolvedAt)` in the graybox stage. A capture strictly earlier than the resolution
blocks with **`graybox-capture-predates-source`**, whose blocker names both timestamps and says the
comparison has to be re-run rather than re-labelled. Equal timestamps pass. So the thing the
proposal asked for holds: a run that flipped `availability` to `resolved` after its evidence was
captured is no longer indistinguishable from one that always had the file.

The scope was deliberately narrowed, and each narrowing is a claim this design is now making:

- **Only a `measured` claim is compared.** A `qualitative` capture is the documented output of the
  pending phase, never claimed to have measured against the source, and never fidelity evidence, so
  a late-landing source does not retroactively invalidate it. Blocking it would break the pending
  workflow this proposal exists to support while catching no dishonest claim.
- **`measurable` stays a property of the disk.** A stale capture leaves `measurable: true` and
  blocks anyway, so "there is a raster" and "the evidence is newer than it" stay separate facts in
  the report. `fidelityEvidence` is false because the stage is blocked.
- **An uncomparable pair blocks rather than passing.** A `capturedAt` that will not parse reports
  `graybox-capture-uncomparable`. `validateGraybox` already rejects that, so this is a guard rather
  than a reachable path; it is kept because a freshness check that answers "fresh" when it could not
  compare is worse than no check.
- **An absent `resolvedAt` is untouched.** A document that never went through a pending phase is not
  compared - the legacy default, not a silent pass.
- **A present but unusable `resolvedAt` is a loud failure.** It is read in `sourceShapeFault`, so it
  blocks every stage the way the other source-declaration faults do:
  `reference-source-resolved-at-invalid` when the value is not an ISO 8601 timestamp, and
  `reference-source-resolved-at-contradictory` when `availability: pending` sits alongside a
  timestamp recording the source landing - the reconstruction stages read
  `reference-evidence.json` raw and never call `validateReferenceEvidence`, so both are reachable
  in practice rather than theoretical duplicates of the contract check.

The graybox stage is the only stage that can ask this question. `graybox.capturedAt` is the only
capture timestamp any carrier in this contract records; `rectification.artifact`,
`landmarks.overlayArtifact`, and the final renders have none, so the geometry and final stages
cannot be checked for freshness at all. Closing that needs a new timestamp field plus the matching
change in `reconstruction-contract.cjs`, and is not in this change.

### The writer, still missing

No script stamps the field. `designer-pipeline` exposes only `check` verbs, so the writer remains
the agent hand-editing `reference-evidence.json` per the source-availability rule in
`reference-spec.md`. The consequence is exact and worth stating rather than glossing: the reader is
honest about every document that records `resolvedAt`, and silent about every document that should
have and did not. Nothing detects the omission, because a source that always had its raster and a
source that landed late with no timestamp are the same document.

Writer, when built: the transition from `pending` to `resolved` is the one moment the value can be
known, so it belongs to whatever performs that transition. The tool shape would be a
`designer-pipeline reference resolve` verb that fills `path`, `width`, `height`, `sha256` from the
landed file and stamps `resolvedAt`, keeping `requestedFrom` and `requestedAt`.

The alternative was to delete the field and its promises from the proposal. It was rejected: the
field is already shipped in `reference-evidence.schema.json` and validated, with a test asserting
it is forbidden while pending, so removing it from the proposal alone would replace a documented
gap with an undocumented one. That judgement is now vindicated - the field was kept long enough to
grow the reader.

## Why Not A Sentinel Hash

A reserved value such as sixty-four zeroes was rejected. It keeps the field's shape but makes every
consumer responsible for recognising the sentinel, and any consumer that forgets will treat an
unmeasured reference as measured. An explicit `availability` discriminator fails loudly instead.
