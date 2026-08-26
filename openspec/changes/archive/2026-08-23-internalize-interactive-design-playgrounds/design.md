# Design: Governed Multi-Mode Playground Interaction

## Contract Boundary

`playground.json` makes a hard-to-express problem manipulable through a standalone HTML surface.
Design tuning remains downstream of `direction-preview.json`; code maps, concept maps, data
exploration, critique, diff review, and game balance use the same interaction mechanism without
pretending that every accepted output is a visual design specification.

## Receipt And Gates

The `design-pipeline.playground.v1` receipt binds a self-contained HTML artifact, typed controls,
three to five complete presets, selected state, derived non-default control IDs, natural-language
prompt artifact, and a purpose-aware consuming artifact.

- `build` validates containment, hashes, markers, control/preset bindings, live-update wiring,
  Clipboard API use, and absence of external dependencies.
- `selection` validates the full state, derives non-default controls, binds the prompt, and rejects
  obvious JSON or key/value dumps. It also requires a hash-bound browser verification report for
  every control, preset, live preview, prompt, copy result, and keyboard operation. The report binds
  the current HTML hash plus the canonical control and preset contract, so later edits make it stale.
- `integration` routes design to `design.md`, motion to `motion.md`, code maps to `handoff.md`,
  concept/data exploration to `brief.md`, critique/review to `qa.md`, and game balance to
  `scene.md`. Change Blueprints explicitly select one target from that governed set. The target
  cites the kind and accepted HTML, state, and prompt hashes.

## Extension Protocol

The bundled registry owns reviewed default routes. `surface.kind` is path-safe rather than an enum.
A built-in selection binds a registry Blueprint id; a change-local selection binds a contained
Markdown artifact and one allowed integration target. Change Blueprints require `Required Surface`,
`State And Output`, and `QA` sections. Their hashes participate in the canonical surface hash, so
changing a Blueprint invalidates browser evidence. Neither built-in nor change Blueprints are
executed by the checker.

## Security And Runtime

The checker reads HTML and Markdown bytes but never executes the playground or fetches a resource.
All paths remain inside the change root after link resolution. The playground uses project-neutral
HTML, CSS, and JavaScript and adds no package dependency or animation runtime.

## Source Boundary

The Anthropic skill is mechanism evidence only. No upstream template, prompt body, source file, or
plugin runtime is copied. Original packaged blueprints preserve the reviewed template categories
while adding Design Pipeline containment, evidence, accessibility, and QA rules. The repository
notice records the reviewed source and Apache-2.0 license.
