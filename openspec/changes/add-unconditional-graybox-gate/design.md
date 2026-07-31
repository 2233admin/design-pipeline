# Design: Unconditional Graybox Gate

## Stage Split

`designer-pipeline reconstruction check` gains `--stage graybox` alongside the existing `geometry`
and `final`. The three stages are reported independently; no stage infers another's result.

| Stage | Requires source raster | Blocks | Evidence |
| --- | --- | --- | --- |
| `graybox` | no | materials, glow, bloom, depth of field, scanlines, grading | layout-only capture + structural comparison |
| `geometry` | yes | detail geometry, type treatment, measured fidelity claims | landmark error recomputation |
| `final` | yes | completion claims | hash-bound EvidencePort receipt |

The two Blocks entries partition the work; they do not overlap:

- **the graybox gate blocks optical treatment: materials, glow, bloom, depth of field, scanlines,
  and grading;**
- **the geometry gate blocks detail geometry, type treatment, and any measured fidelity claim.**

`graybox` is evaluated for every change that has a `reference-evidence.json`, regardless of route or
fidelity. It is not part of the reconstruction module's source-dependent chain.

### Amendment: the geometry row no longer blocks optical polish

The `geometry` row originally read `detail geometry, type treatment, optical polish`. That was
wrong, and it was wrong in the exact case this change exists to serve. For a `2.5d` primary-target
exact reconstruction with a pending source, the geometry stage can never report `ready` - it blocks
with reason `source-pending` before any landmark math. Listing optical polish under geometry
therefore made optical treatment permanently unreachable for that run, which is the opposite of what
"Structural proof precedes optical treatment on every route" grants: a `qualitative` graybox that
reaches `ready` releases the optical treatment, and the measured gates stay blocked beside it.

Leaving the overlap in place also gave a reading agent two contradictory rules for the same action,
and the blocking one wins by default. The row now names only what geometry actually measures.
Optical treatment is released by the graybox gate alone; the geometry gate keeps detail geometry,
type treatment, and any claim that the frame measurably matches the source.

## Artifact Shape

New change artifact `graybox.png` and a `graybox` block inside `reconstruction.json`. For changes
with no `reconstruction.json` (ordinary `2d`/`2.5d` references at `directional-inspiration`), the
block lives in `reference-evidence.json` instead, so a graybox does not force the heavier contract
into existence.

```json
"graybox": {
  "capture": "graybox.png",
  "capturedAt": "<iso8601>",
  "viewport": { "width": 1280, "height": 720 },
  "suppressed": ["materials", "glow", "bloom", "depth-of-field", "scanlines", "grading"],
  "comparison": {
    "mode": "measured" | "qualitative",
    "regions": [
      { "id": "register-1", "finding": "label sits above the readout, not beside it", "status": "corrected" }
    ]
  },
  "approval": { "status": "pending" | "approved", "evidence": "<text>" }
}
```

`comparison.mode` is `measured` only when the source is resolvable. Otherwise it is `qualitative`,
and the validator records that the graybox proves ordering discipline, not fidelity.

Measurability is read from disk, not from the declaration: the reference contract must resolve and
the raster it names must actually be present in the change root. A `measured` claim the evidence
cannot support is a blocking reason - `graybox-comparison-unmeasurable` - not a silent rewrite to
`qualitative`. The declared mode is reported as declared, and a separate `measurable` field says
whether the evidence could have supported it.

## Suppression Contract

A capture qualifies as a graybox only when the listed treatments are actually absent. The validator
cannot inspect a PNG for glow, so the implementation asserts suppression at the source: the runtime
exposes a documented graybox mode (a root attribute or query parameter) that disables the emissive,
optical, and texture layers, and the capture records which mode produced it. A capture that claims
suppression without a declared mode is `blocked`, not `ready`.

## Compatibility

- Existing `3d`/`hybrid` graybox requirements are subsumed. `graybox.png` keeps its filename, so
  changes already producing it keep working.
- Existing changes with no graybox block report `blocked` with a `graybox-missing` reason rather
  than failing validation, so archived changes stay readable.
- `reconstruction check --stage geometry` continues to require its own artifacts and does not
  accept a graybox in their place.

## QA Behaviour

`qa.md` gains a Graybox gate row. A run whose `geometry` stage is blocked on a missing source must
still show `graybox: ready`; a run showing both as blocked is a process failure, not an
environmental one.
