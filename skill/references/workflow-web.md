# Web workflow

Motion-first websites and pages. `designer-pipeline next` names the current stage; read only that
section. Stage order:

- `quick` brief/freeform: build, probe; `quick` replicate: reference, build, probe.
- `standard` and `full`: intake, reference, concepts, build, probe, review, deliver.
  Replicate keeps the reference direction and omits replacement concepts.

## intake

Ask the four intake questions in one numbered round, each with its recommendation; record the
reply with `decide --stage intake`.

## reference

For a local video run `reference analyze-video --path <contained-video> --output <new-dir>`.
Inspect ordered timed windows, record named target/property/state observations and uncertainties,
and bind `videoAnalysis` in the existing reference carrier. A note alone does not finish temporal
observation. Resample uncertain intervals with `--start <sec> --end <sec> --fps 12`; a local range
does not replace whole-source observation. In an existing project use `project inspect` and trace
the observed targets to actual renderer/component/material/animation source evidence.

Watch 1-3 moving web references at full speed and write `reference.md`: observed motion, timing,
easing, structure, and what to transfer. In `replicate` mode the reference is the thing being
reproduced and cannot be skipped. Otherwise the user may decline references
(`decide --stage reference --answer none`).

Use `reference-spec.md` for observed regions, invariants and unknowns; for reconstruction read
`reconstruction-spec.md` and applicable `3d-spec.md`. Record animation observations against timed
frames when supplied, and mark missing timestamps or uncertain motion. `reference.md` records
document delivery, not verified understanding. Full reference checks include graybox evidence;
do not require that aggregate to be ready before building the bounded graybox.

## concepts

Write `concepts.md` with three cards whose central ideas differ, not the same layout restyled
three ways. Each card starts with the central idea as one sentence about the page, then what
carries attention, look, tools in one line, and any missing license. Render one key frame per
card. The user picks one (`decide --stage concept --choice 1|2|3`).

## build

Build `index.html` from the chosen concept, or from the reference and its invariants in replicate
mode. Motion follows `web-motion.md` (spring-damper
parameters, stepped motion as a style); design tokens and components come from
`pipeline-reference.md`. At the `full` tier, open an OpenSpec change under
`openspec/changes/<id>/` first and build inside it.

Use `tools/README.md` when a bounded visual task needs drawing, image placement, text fitting,
material techniques or pixel comparison. Load only that tool, preserve the existing DOM/runtime,
and inspect the resulting surface at its real viewport. Source tools support the chosen direction;
their example styles, coordinates and characters do not define the product.

For page/component styles, follow `good-css.md` and its matched original entries across CSS,
utility classes and CSS-in-JS. Prefer a fitting intrinsic/native solution, preserve project
DESIGN/MOTION tokens, and verify target-browser support and usable fallbacks. Use the bundled
offline specimen builder for a bounded study; keep film seeking and interaction evidence on
their existing routes. In probe/review, record applied entries and actual fallback, focus,
content/viewport and reduced-motion observations in the existing QA evidence.

Use the task fields in `stages.md#stage-4-tasks`: one visual goal with explicit inputs, scope,
outputs, checks and repair path. For references, first render bounded structure/occlusion in a
graybox. Then read complete `reference check`, `reconstruction check` and applicable `scene check`
results before dependent material, polish or motion; repair the reported prerequisite failures.
Follow reconstruction's existing permissions: graybox readiness releases optical treatment even
if geometry is blocked; detail geometry and fidelity claims still require their own readiness.
Creating files or passing engineering checks does not grant visual acceptance.

## probe

If `interaction.json` is missing, write it: one probe per key interaction, schema
`design-pipeline.interaction-probe.v1`.

```json
{
  "schema": "design-pipeline.interaction-probe.v1",
  "id": "hero-card-tilt",
  "url": "index.html",
  "viewport": { "width": 1280, "height": 800 },
  "probes": [
    {
      "id": "card-follows-pointer",
      "target": "#card",
      "input": { "kind": "pointer-sweep", "from": [200, 400], "to": [1080, 400], "durationMs": 600 },
      "expect": { "responds": true, "settleWithinMs": 1200, "returnsToRest": true, "response": "spring" }
    }
  ]
}
```

Then `verify interaction --probe interaction.json`. Apply each finding's `fix` and rerun; editing
`interaction.json` or the page afterwards reopens this stage.

## review

Show the page, its motion at full speed and a one-paragraph gate summary. The user accepts, or
rejects with one sentence (`decide --stage review --verdict accept|reject`). A rejection reopens
`probe` for the rebuilt page and becomes a project rule.

## deliver

`decide --stage deliver --answer <url or path>`.
