# Web workflow

Motion-first websites and pages. `designer-pipeline next` names the current stage; read only that
section. Stage order:

- `quick`: build, probe.
- `standard` and `full`: intake, reference, concepts, build, probe, review, deliver.

## intake

Ask the four intake questions in one numbered round, each with its recommendation; record the
reply with `decide --stage intake`.

## reference

Watch 1-3 moving web references at full speed and write `reference.md`: observed motion, timing,
easing, structure, and what to transfer. In `replicate` mode the reference is the thing being
reproduced and cannot be skipped. Otherwise the user may decline references
(`decide --stage reference --answer none`).

## concepts

Write `concepts.md` with three cards whose central ideas differ, not the same layout restyled
three ways. Each card starts with the central idea as one sentence about the page, then what
carries attention, look, tools in one line, and any missing license. Render one key frame per
card. The user picks one (`decide --stage concept --choice 1|2|3`).

## build

Build `index.html` from the chosen concept. Motion follows `web-motion.md` (spring-damper
parameters, stepped motion as a style); design tokens and components come from
`pipeline-reference.md`. At the `full` tier, open an OpenSpec change under
`openspec/changes/<id>/` first and build inside it.

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
