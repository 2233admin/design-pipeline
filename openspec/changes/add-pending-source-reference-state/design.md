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
- `resolvedAt` present implies `availability: resolved` and records that the run began pending.
  Nothing writes it yet; see `resolvedAt Has No Writer` below.

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
   declared `source.path` exists as a file inside the change root. Measurability is a property of
   the disk, not of the declaration.
3. **Stage readiness** - is the stage the agent is standing in allowed to pass? Answered per stage.
   The graybox stage can be `ready` while the source is unmeasurable, because a qualitative
   comparison needs no raster. The geometry and final stages cannot.

A document can be valid and unmeasurable. A stage can be ready while the aggregate gate is blocked.
Neither implies the others.

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
fidelity. A graybox block propagates into every outcome, so an approved, resolved, measurable source
is not by itself `ready`.

| Source on disk | Contract | Graybox stage | `reference check` | Meaning |
| --- | --- | --- | --- | --- |
| resolved, raster present | valid, approved | ready | `ready` | the only unqualified pass |
| resolved, raster present | valid, approved | blocked | `blocked`, graybox reason | the graybox stage is a gate, not a report |
| resolved, raster absent | valid, approved | ready, comparison qualitative | `ready`, `measurable: false` | ordering discipline proven, fidelity not |
| resolved, raster absent | valid, approved | blocked, `graybox-comparison-unmeasurable` | `blocked` | a measured claim with no raster to measure |
| pending | valid, approved | ready, comparison qualitative | `blocked`, reason `source-pending` | classification is usable, measurement is not |
| pending | valid, approved | blocked, `graybox-comparison-unmeasurable` | `blocked`, reason `source-pending`, graybox blockers trail | a measured claim against a pending source |
| any | valid, approval pending or rejected | any | `blocked`, reason `approval-pending` or `approval-rejected` | unchanged |
| any | invalid | not reached | contract failure | `reference check` raises rather than reporting |

Every blocked outcome carries `contractValid: true`. `blocked` on `source-pending` is explicitly not
a failure of the change. It is the correct resting state for a run whose reference lives outside the
repository. The distinction matters because `blocked` reads as "something went wrong", and this
state is "something is known to be missing and has been asked for".

## Interaction With Other Gates

- The graybox stage runs on every route and every fidelity, including a `pending` source. It needs
  no raster, so a pending source does not stop it - but it does bound it. A `qualitative`
  comparison can reach `ready`; a comparison declaring `measured` mode blocks with
  `graybox-comparison-unmeasurable` while the source is pending or its raster is not on disk. The
  declared mode is reported as declared and never quietly rewritten, and `fidelityEvidence` is true
  only when the stage is ready, the source is measurable, and the mode is `measured`. So the
  original claim that "the graybox is unaffected by the raster" is wrong in one direction: the
  stage is unaffected, the fidelity claim it can carry is not.
- A reference document that cannot be read blocks the graybox stage on every path, qualitative
  included, because the stage reads its region binding out of that same document.
- `reconstruction check --stage geometry` and `--stage final` SHALL refuse to run against a
  `pending` source and report `blocked` with reason `source-pending` and `measurements: null`,
  never `fidelity-limited`. A threshold miss cannot be claimed when nothing was measured. An
  unreadable source declaration blocks the same stages under its own reason.
- `intent.requestedFidelity` remains whatever the user asked for. A pending source is not a
  downgrade trigger, and `intent.downgrade.status` stays `not-requested`.

## resolvedAt Has No Writer

The field is kept, and this section is what it is kept against. Today the contract validates
`resolvedAt` as an ISO 8601 timestamp, forbids it while the source is pending, and stops there. No
script writes it - `designer-pipeline` exposes only `check` verbs, so the writer is the agent
hand-editing `reference-evidence.json` per the source-availability rule in `reference-spec.md` -
and no gate or report reads it. Until a reader exists the field is a promise nothing keeps, so the
corresponding task stays unchecked rather than being quietly ticked off.

Writer, when built: the transition from `pending` to `resolved` is the one moment the value can be
known, so it belongs to whatever performs that transition. That is an agent edit today; the tool
shape would be a `designer-pipeline reference resolve` verb that fills `path`, `width`, `height`,
`sha256` from the landed file and stamps `resolvedAt`, keeping `requestedFrom` and `requestedAt`.

Reader, when built: the graybox stage. Artifacts authored while the source was pending were
authored without the raster, and resolution does not retroactively make them measured. A stage that
compares `source.resolvedAt` against `graybox.capturedAt` can say the one thing no other field can:
this capture predates the source it now claims to have been measured against, so the comparison
needs to be re-run rather than re-labelled. That is a distinct blocked state and would need its own
greppable reason. Without it, a run that flips `availability` to `resolved` after the fact is
indistinguishable from one that always had the file - which is exactly the distinction the proposal
asked for.

The alternative was to delete the field and its promises from the proposal. It was rejected: the
field is already shipped in `reference-evidence.schema.json` and validated, with a test asserting
it is forbidden while pending, so removing it from the proposal alone would replace a documented
gap with an undocumented one.

## Why Not A Sentinel Hash

A reserved value such as sixty-four zeroes was rejected. It keeps the field's shape but makes every
consumer responsible for recognising the sentinel, and any consumer that forgets will treat an
unmeasured reference as measured. An explicit `availability` discriminator fails loudly instead.
