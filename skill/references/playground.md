# Governed Playground Contract

A Playground is a model-interaction surface for work that is hard to understand or tune in prose.
It is a self-contained HTML file with controls, a live representation, cohesive presets, and a
natural-language output prompt that can be copied back into the coding agent.

Use it to explore product and frontend work such as component design, layout composition, motion,
codebase architecture, concept relationships, data, document or diff critique, and game balance.
These examples share one interaction mechanism but do not define a closed taxonomy.

This contract internalizes the mechanism reviewed from Anthropic's
[`playground` skill](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/playground/skills/playground)
without vendoring its templates or making its plugin a runtime dependency. Design Pipeline adds a
resumable receipt, hash-bound browser verification, selection, and purpose-aware integration gates.

## Product Boundary

Playground is general as an interaction mechanism and bounded by Design Pipeline as a product
capability. Use non-visual modes only when they directly support product design, frontend
implementation, a scene/game runtime, or design QA. Unrelated general-purpose analysis belongs in
another tool.

Direction preview and Playground remain distinct:

- direction preview compares distinct visual systems and chooses one;
- a design Playground tunes an accepted system;
- a code map, concept map, explorer, critique, or balance surface externalizes a relationship that
  prose does not express or manipulate well.

## Applicability

Write `playground.json` when the user explicitly requests a Playground or when interactive state is
a better reasoning medium than text. Supported required reasons are `explicit-playground`,
`interaction-better-than-text`, `high-dimensional-visual`, and `parameter-sensitive`.

A deterministic waiver may record `narrow-change`, `non-visual`, `exact-primary-target`,
`fixed-design-spec`, or `direction-preview-sufficient`. Missing artifacts are not a waiver.

## Surface Contract

Create one change-local, self-contained HTML file containing:

- grouped, keyboard-operable native controls;
- a live, production-shaped representation updated on every input or change event;
- three to five cohesive full-state presets and an intentional default;
- a contextual natural-language output instruction, never a raw value dump;
- a Copy control with visible feedback, responsive layout, readable labels, visible focus, and no
  motion-only meaning.

Inline CSS and JavaScript. Do not load external scripts, styles, fonts, images, or other runtime
dependencies. Keep one state object and route every control and preset through one `updateAll()`
path so the representation and prompt cannot disagree.

The restrictive Content Security Policy allows only inline script/style and data images; every
network, navigation, frame, object, base, font, media, worker, and manifest route is `'none'`.
Additional override directives are invalid. Bind every declared control and preset, and copy the
current `[data-playground-prompt].textContent`, not cached output.

Required markers:

```text
data-design-playground
data-playground-controls
data-playground-preview
data-playground-prompt
data-playground-copy
data-playground-control="<control-id>"
data-playground-preset="<preset-id>"
```

## Open Blueprint Protocol

Built-in templates are reviewed defaults, not the set of possible Playgrounds. A new change-local
Blueprint may introduce any lowercase path-safe `kind`. It is an inert, hash-bound Markdown
artifact with three required sections: `Required Surface`, `State And Output`, and `QA`.

The receipt declares `surface.blueprint` as either:

- `source: builtin` plus a registered Blueprint id; or
- `source: change` plus its id, contained Markdown artifact, and one allowed integration target.

Change-local Blueprints may target only `design.md`, `motion.md`, `handoff.md`, `brief.md`, `qa.md`,
or `scene.md`. They cannot execute code, fetch content, change the HTML safety contract, or invent
an arbitrary output path. Their content hash participates in browser-verification freshness.

## Purpose-Aware Integration

The accepted prompt is integrated into exactly one governed change artifact:

| Playground kind | Generation blueprint | Integration target |
| --- | --- | --- |
| `design-system`, `component`, `layout`, `color`, `typography`, `motion` | `playground-templates/design-playground.md` | `design.md` (`motion` uses `motion.md`) |
| `code-map` | `playground-templates/code-map.md` | `handoff.md` |
| `concept-map` | `playground-templates/concept-map.md` | `brief.md` |
| `data-explorer` | `playground-templates/data-explorer.md` | `brief.md` |
| `document-critique` | `playground-templates/document-critique.md` | `qa.md` |
| `diff-review` | `playground-templates/diff-review.md` | `qa.md` |
| `game-balance` | `playground-templates/game-balance.md` | `scene.md` |
| any new change-local kind | its hash-bound change Blueprint | one explicitly declared allowed target |

This routing is deliberate: an architecture map is resumable agent context, a concept map shapes
the brief, a critique becomes QA evidence, and game balance belongs with persistent runtime state.
A change Blueprint chooses only from the same allowed target set and binds that choice into its
surface contract.

## Artifact Lifecycle And Gates

```text
playground.json
playground/index.html
playground/verification.json
playground/selection-prompt.md
<purpose-aware integration target>.md
```

`playground.json` uses `design-pipeline.playground.v1`. Before selection, exercise every control and
preset in a browser and write a hash-bound `design-pipeline.playground-verification.v1` report. It
binds the HTML, controls, and presets and confirms live representation, prompt, Copy result, and
keyboard operation. Any surface change invalidates it.

Run gates in order:

```bash
designer-pipeline playground check --stage build --change-root <change-root> --json
designer-pipeline playground check --stage selection --change-root <change-root> --json
designer-pipeline playground check --stage integration --change-root <change-root> --json
```

The integration target must bind the purpose and accepted bytes:

```text
playground-kind: <kind>
playground-artifact-sha256: <html sha256>
playground-state-sha256: <canonical selected-state sha256>
playground-prompt-sha256: <selection prompt sha256>
```

Only the integration gate authorizes downstream use. When a selection changes, regenerate the
canonical state hash and prompt, update the governed target, and rerun the gate.
