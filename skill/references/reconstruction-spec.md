# Static Reference Reconstruction Contract

Use this contract when a supplied still image is the primary target rather than inspiration. It
closes the gap between “the medium is correctly classified” and “the rendered frame actually
matches.”

## Verification claim versus requested fidelity

These are two different records and they move for different reasons.

- The **verification claim** is what the evidence supports right now. It has exactly three values:
  `verified`, `fidelity-limited`, and `unverified`. An unavailable source lowers it to `unverified`,
  and a measured threshold miss lowers it to `fidelity-limited`.
- The **requested fidelity** is what the user asked for. It changes only through explicit user
  approval recorded in the non-destructive downgrade field.

A missing source therefore downgrades the claim, never the request. `intent.requestedFidelity` and
`intent.effectiveFidelity` stay at `exact-reconstruction` and `intent.downgrade.status` stays
`not-requested` while `source.availability` is `pending`. Progress pressure is not approval.

### Where the verification claim is recorded

No contract field carries the claim. It is derived from the gate output and written to `qa.md`, on
one line, under `## Reference And Spatial Routing`:

```markdown
- Verification claim: `unverified`
```

Derive it from one command - `designer-pipeline reconstruction check --stage final` - and read the
whole result that command returns: its top-level status **and** every entry in its `stages` map.
That one invocation already reports `stages.graybox`, `stages.geometry`, and `stages.final` side by
side, so reading all of them costs nothing extra.

| `--stage final` result | Verification claim |
| --- | --- |
| top-level `ready` and every reported stage `ready` | `verified` |
| top-level `fidelity-limited` and no reported stage `blocked` | `fidelity-limited` |
| anything else, including any reported stage `blocked` | `unverified` |

The top-level status alone is not the input, and a rule that said so would recreate the defect this
record exists to prevent. The stages are deliberately independent and no stage infers another's
result, so a `final` stage can report `ready` beside a `blocked` `stages.graybox` - a claim read off
the top-level status alone would call that run `verified` on evidence the graybox gate refused.

Nothing outside that one result is an input, and each familiar case reaches `unverified` through a
stage rather than through a rule of its own:

- a pending source blocks the geometry stage, and the final stage returns the geometry result, so
  both stages read `blocked`;
- an unreadable source declaration blocks the same two stages, with the reason that names the fault;
- a source that is declared but is not on disk blocks `stages.graybox` the moment the comparison
  claims `measured`;
- a run with no `reconstruction.json` at all produces no result to read, so there is nothing that
  could reach `verified`.

`unverified` is the default, not a penalty: it is what the record says until a measurement replaces
it.

An `unverified` claim may never be reported as verified, exact, identical, 1:1, pixel-perfect,
faithful, or complete - not in `qa.md`, not in change `design.md`, and not in the final response. A
`qualitative` graybox that reached `ready` does not raise the claim; it proves ordering discipline,
not equivalence. Never substitute a default, a placeholder, or a declaration for the missing
measurement.

## Ordering by reference role

The numbered order below is the `primary-target` order. Reference role selects the ordering, and the
role is read from `intent.role` in `reference-evidence.json`:

| Role | Ordering | Reconciliation |
| --- | --- | --- |
| `primary-target` | graybox captured and passed **before** change `design.md` | required |
| `constraint` | existing order retained: change `design.md` in its usual place | required after the first render |
| `inspiration` | existing order retained: change `design.md` in its usual place | required after the first render |

Only the position of change `design.md` moves. The graybox gate itself is unconditional on every
role, route, and fidelity mode - see "Graybox gate" below.

Reconciliation is required for **every** change that has a reference. The role decides *when* it
happens, never *whether* it happens; there is no role for which it is optional, `inspiration`
included. For `constraint` and `inspiration`, write change `design.md` where it already sits and
reconcile it against the first render afterwards. Every such change records a `Spec Reconciliation`
section in change `design.md`; an empty table is a valid result, an absent section is not.

## Required order

1. Resolve the source to a file path, or record `source.availability: pending` with `pendingReason`
   and `requestedFrom` and continue. Never fabricate a path, dimension, or hash.
2. Preserve the source image, dimensions, and SHA-256 identity when it is resolved.
3. Separate image space, canonical/object space, world space, and camera space.
4. Render the layout-only graybox as `graybox.png` and record its structural comparison.
5. Pass the graybox gate.
6. Write change `design.md` against the graybox capture and cite it. This position is conditional on
   `intent.role: primary-target`; `constraint` and `inspiration` keep their existing `design.md`
   position and reconcile against the first render instead.
7. Rectify the relevant source plane into `rectified-reference.png`.
8. Build `front-elevation.svg` in canonical space.
9. Construct shallow or full geometry from that elevation.
10. Solve the camera and write `camera-calibration.json`.
11. Lock the camera and output viewport.
12. Create `landmark-overlay.png`.
13. Pass the geometry gate.
14. Add detail geometry and type treatment.
15. Author materials, light, depth of field, bloom, scanlines, and grading.
16. Produce source/render/diff evidence through an independent EvidencePort.
17. Pass the final gate.

Steps 7 to 14 and steps 16 to 17 require a resolved source. A pending source suspends them and
leaves the rest of the order intact; it does not suspend the graybox.

Step 15 is released by step 5, not by step 13. Optical treatment waits on the graybox gate only, so
a run whose geometry stage is blocked on a missing source still reaches it. Step 14 waits on the
geometry gate, because detail geometry and type treatment are measured against landmarks.

Do not start from a hand-authored oblique layout. Perspective is the output of object geometry and a
camera, not a substitute for either.

## Stages

`designer-pipeline reconstruction check` runs three stages. They are reported independently and no
stage infers another's result.

| Stage | Requires source raster | Blocks | Evidence |
| --- | --- | --- | --- |
| `graybox` | no | materials, glow, bloom, depth of field, scanlines, grading | layout-only capture plus structural comparison |
| `geometry` | yes | detail geometry, type treatment, measured fidelity claims | landmark error recomputation |
| `final` | yes | completion claims | hash-bound EvidencePort receipt |

The two Blocks entries partition the work and do not overlap:

- the graybox gate blocks optical treatment: materials, glow, bloom, depth of field, scanlines, and
  grading;
- the geometry gate blocks detail geometry, type treatment, and any measured fidelity claim.

Optical treatment is released by the graybox gate alone. The geometry stage does not gate it, and a
blocked geometry stage is not a reason to withhold it. This matters most for the case the graybox
gate was written for: a `2.5d` primary-target exact reconstruction with a pending source can never
reach a ready geometry stage, so a rule that made optical treatment wait for geometry would stop the
run permanently. A `qualitative` graybox that reports `ready` releases materials, glow, bloom, depth
of field, scanlines, and grading while the measured gates stay blocked beside it.

`--stage geometry` and `--stage final` report the graybox summary alongside their own result. A
blocked `geometry` never means the graybox passed, and a ready graybox never means geometry passed.

Exit codes are `0` for `ready`, `3` for `fidelity-limited`, and `2` for `blocked`. The public
`designer-pipeline` CLI propagates those codes unchanged. It previously collapsed everything that
was not `2` to `0`, which reported a measured threshold miss as success; `3` now reaches the caller
and the command's own status line reads `fidelity-limited` rather than `complete` or `captured`.

## Normative artifact

`reconstruction.json` uses `design-pipeline.reconstruction.v1` and records:

- `mode`: `exact-reconstruction` or `adaptive-reconstruction`;
- four named coordinate spaces;
- rectification method, source/canonical viewports, at least four anchors, the rectified raster, and
  canonical front elevation;
- a locked perspective or orthographic camera with lens/frustum, clipping, pose, target, up vector,
  roll, calibration artifact, and render viewport;
- distributed source/render landmarks, thresholds, and overlay evidence;
- geometry approval;
- final comparison artifacts, thresholds, measurements, EvidencePort capability/probe state,
  hash-bound receipt, and final approval;
- the `graybox` block described below.

## Graybox gate

The graybox gate is unconditional. It applies to every route, including `2d` and `2.5d`, to every
fidelity mode, including `directional-inspiration`, and to runs whose source is `pending`. Any
change with a `reference-evidence.json` must pass it before materials, glow, bloom, depth of field,
scanlines, or cinematic grading are authored. It needs no source raster and costs one screenshot.

Record the block in `reconstruction.json`. When the change has no `reconstruction.json`, record it
in `reference-evidence.json` instead, so a graybox does not force the heavier contract into
existence.

Exactly one carrier holds it. Two carriers each holding a `graybox` block can disagree about the
very thing the gate reports, so no winner is picked and neither block is validated: the stage is
`blocked` with reason `graybox-carrier-conflict` and names both files. Delete one.

A `graybox` block inside `reference-evidence.json` is a v2-era construct. A document that declares
`design-pipeline.reference-evidence.v1` while carrying one is validated as v2 and must record
`intent` and `composition`; see the schema era rule in `reference-spec.md`.

```json
"graybox": {
  "capture": "graybox.png",
  "capturedAt": "<iso8601>",
  "viewport": { "width": 1280, "height": 720 },
  "runtimeMode": {
    "mechanism": "root-attribute",
    "token": "data-graybox",
    "disables": ["emissive", "optical", "texture"]
  },
  "suppressed": ["materials", "glow", "bloom", "depth-of-field", "scanlines", "grading"],
  "comparison": {
    "mode": "measured",
    "regions": [
      { "id": "register-1", "finding": "label sits above the readout, not beside it", "status": "corrected" }
    ]
  },
  "approval": { "status": "approved", "evidence": "<text>" }
}
```

Rules:

- suppression is asserted at the source, not inferred from the PNG. The runtime exposes a documented
  graybox mode - a root attribute, query parameter, build flag, or runtime API - that disables the
  emissive, optical, and texture layers, and the capture records which mode produced it. A capture
  claiming suppression without a declared mode is `blocked` with reason `graybox-mode-undeclared`.
- `runtimeMode` must be the expanded `{mechanism, token, disables}` form. A bare token string such as
  `"?graybox=1"` stays contract-valid, so archived documents keep reading, but it names no disabled
  layers and the gate has nothing to check it against: it is `blocked` with reason
  `graybox-mode-unverifiable`. A declaration the gate cannot verify is not evidence that the layers
  were off. Expanding the token into the object form clears it. A mode that is expanded but leaves
  one of `emissive`, `optical`, or `texture` enabled is `graybox-mode-incomplete`.
- `suppressed` must list `materials`, `glow`, `bloom`, `depth-of-field`, `scanlines`, and `grading`.
- `comparison.regions[]` addresses the region ids recorded in `composition` by name, whichever
  carrier holds the block, and at whichever schema version records it: a `composition` that is
  present is applied, v1 or v2. Every declared region id must be addressed, and no region id may be
  named that `composition` does not declare. Region status is `matches`, `corrected`,
  `accepted-deviation`, or `open`; an `open` finding blocks.
- a comparison that names regions while no `composition` was recorded anywhere is not bound to
  anything, so it is `blocked` rather than passed, and the report names the repair. No
  `reference-evidence.json` exists to record a composition: `graybox-composition-unrecorded`. The
  document exists but records no `composition`: `graybox-composition-undeclared`. This is a blocked
  stage, not a contract failure, so a v1 document that never carried a composition does not
  retroactively become invalid - it is only barred from claiming a region comparison it cannot bind.
- `comparison.mode` is `measured` only when the source is measurable, and measurability is read from
  disk rather than from the document: the reference contract must resolve `source.availability` to
  `resolved` and the raster named by `source.path` must actually exist inside the change root. A
  `measured` claim the evidence cannot support is a blocking reason - not a validation error and not
  a silent rewrite to `qualitative`. The declared mode is reported as declared; the separate
  `measurable` field says whether the evidence could have supported it. Four different failures keep
  four different reasons, so a refused `measured` claim is never explained by some other change's
  problem:

  | Why the measured claim cannot stand | Reason |
  | --- | --- |
  | `source.availability` is `pending` | `graybox-comparison-unmeasurable` |
  | the declared `source.path` is not present in the change root | `graybox-comparison-unmeasurable` |
  | no `reference-evidence.json` records a source at all | `reference-source-unrecorded` |
  | the document is present but declares no `source` | `reference-source-undeclared` |

- a reference document the contract cannot read blocks the graybox stage on every path, qualitative
  included, before a single field of the block is examined. The stage reads its region binding out
  of that same document, so the fault surfaces here with the reason that names it -
  `reference-source-unparseable`, `reference-source-malformed`, or
  `reference-source-availability-invalid` - and is not re-reported as a measurability failure. These
  are the same three strings the geometry stage uses: one fault, one reason, on every stage and
  carrier.
- against a pending or unresolvable source the mode is `qualitative`. A `qualitative` graybox can
  reach `ready`, and it is never fidelity evidence: it proves ordering discipline, not equivalence.
  Only a `ready` graybox whose comparison is both `measured` and `measurable` sets
  `fidelityEvidence: true`.
- approval is `pending`, `approved`, or `rejected`. `approved` is invalid while any finding is
  `open`, on both carriers.

Run:

```powershell
node <skill-root>/scripts/designer-pipeline.cjs reconstruction check `
  --root <project-root> `
  --change-root <change-root> `
  --stage graybox `
  --json
```

The stage reports `ready` or `blocked` and never `fidelity-limited`. Blocking reasons are
`graybox-missing`, `graybox-carrier-conflict`, `graybox-carrier-uncontained`,
`graybox-capture-missing`, `graybox-mode-undeclared`,
`graybox-mode-unverifiable`, `graybox-mode-incomplete`,
`graybox-suppression-incomplete`, `graybox-comparison-missing`, `graybox-comparison-unmeasurable`,
`graybox-composition-unrecorded`, `graybox-composition-undeclared`,
`graybox-region-open`, `graybox-approval-pending`, and `graybox-approval-rejected`. The stage also
reports the reference-document reasons it shares with the geometry gate:
`reference-source-unparseable`, `reference-source-malformed`,
`reference-source-availability-invalid`, `reference-source-unrecorded`,
`reference-source-undeclared`, and `reference-source-uncontained`. A change written
before this gate existed reports `graybox-missing` rather than failing validation, so archived
changes stay readable.

A carrier path that does not resolve inside the change root is refused before it is read, and the
refusal is reported as itself rather than as absence: `graybox-carrier-uncontained` for the primary
artifact, `reference-source-uncontained` for the reference document. A refused path is named once.
The reference carrier's containment failure is reported only as `reference-source-uncontained`, so
one refusal never surfaces as two blockers.

A graybox block that cannot be validated at all - an invalid block, or a comparison naming a region
id `composition` never declared - surfaces through the aggregate `reference check` as `blocked` with
reason `graybox-invalid` and the validator message as its blocker. A gate that cannot verify its own
evidence reports `blocked`, never `ready`.

The gate is also enforced by the artifact set, not only by the stage command. Every route records
`graybox.png` in `requiredArtifacts`, including `2d` and `2.5d`; omitting it fails validation with
`reference evidence: every reference route requires graybox.png`. And every change with a
`reference-evidence.json` carries the graybox stage in its aggregate `reference check` result under
`stages.graybox`, on every route and both schema versions, so the stage cannot go unasked.

A run whose `geometry` stage is blocked on a missing source must still show `graybox: ready`. Both
stages blocked at once is a process gap - nobody looked before polishing - not an environmental
limitation, and `qa.md` records it that way.

## Geometry gate

Run:

```powershell
node <skill-root>/scripts/designer-pipeline.cjs reconstruction check `
  --root <project-root> `
  --change-root <change-root> `
  --stage geometry `
  --json
```

The validator recomputes Euclidean source/render error. Exact mode requires:

- at least 8 landmarks;
- at least 4 named regions across the frame;
- mean error no greater than 1.5 px;
- maximum point error no greater than 3 px;
- existing rectified reference, front elevation, camera calibration, and overlay artifacts;
- explicit geometry approval.

Landmarks should include outer panel corners, major internal frame corners, title anchors, digit
centers/baselines, lower separators, and the near rail. Clustering all points around the easy center
is invalid.

Missing evidence or pending approval is `blocked`. Complete measurements outside thresholds are
`fidelity-limited`. Materials and cinematic effects cannot compensate for either result.

A `pending` source refuses the stage before any landmark math: the result is `blocked` with reason
`source-pending` and `measurements: null`. `fidelity-limited` is unreachable there, because a
threshold miss cannot be claimed when nothing was measured. The same refusal applies at the final
stage.

A reference document the contract cannot read gets the same refusal, with its own reason, so the
report names the malformed field instead of a fabricated default. All three also produce
`measurements: null`:

- `reference-source-unparseable`: `reference-evidence.json` exists but is not parseable JSON, or
  parses to something other than an object.
- `reference-source-malformed`: the document records `source` as `null`, an array, or a non-object.
- `reference-source-availability-invalid`: `source.availability` is present but is not one of
  `resolved` or `pending` - for example `"Pending"` or `"unavailable"`.

Absent is not invalid, and it is not resolved either. An absent `reference-evidence.json`, and a
present document with no `source` field, both keep the legacy `availability: resolved`, so the
geometry and final stages on a document written before the pending state existed behave exactly as
they did. What they do not do is make anything resolvable: no path was named and no file was opened,
so `resolvable` stays `false` and nothing on disk was consulted. A `measured` graybox comparison on
such a change therefore blocks, with `reference-source-unrecorded` when no document records a source
and `reference-source-undeclared` when the document is there but declares none. Absence of evidence
was never evidence; the previous behaviour reported `resolvable: true` for a source nobody had ever
written down.

A field that is present and says something the contract does not recognise is a loud
failure: an unreadable declaration is not evidence that the source was supplied.

## Final comparison gate

The EvidencePort must provide:

- `render-reference`;
- `render-implementation`;
- `pixel-diff`;
- `ssim`;
- a successful capability probe;
- `fidelity-receipt.json` using
  `design-pipeline.reconstruction-evidence.v1`.

The receipt binds the source render, implementation render, and diff image by SHA-256, records the
locked viewport, and repeats the submitted pixel-difference and SSIM measurements. The validator
checks the hashes and measurement identity before applying thresholds.

Exact mode defaults to thresholds no weaker than:

- pixel difference ratio at most `0.03`;
- SSIM at least `0.97`;
- no intentional masks.

Run:

```powershell
node <skill-root>/scripts/designer-pipeline.cjs reconstruction check `
  --root <project-root> `
  --change-root <change-root> `
  --stage final `
  --json
```

Only `ready` may be described as exact or complete. `fidelity-limited` means the measurements are
real but the frame still differs. `blocked` means the comparison is unavailable or untrusted.

These three statuses feed the verification claim recorded in `qa.md`, but they are not the whole
input: the claim reads this result's `stages` map as well, so `verified` requires a `ready` final
status *and* a `ready` `stages.graybox` and `stages.geometry`. See "Where the verification claim is
recorded" above for the single derivation rule.

## Invalidation

Changing camera model, FOV/frustum, pose, target, roll, output viewport, canonical elevation, or
major geometry after geometry approval invalidates the overlay. Re-run calibration; never
counter-distort geometry to hide camera drift.
