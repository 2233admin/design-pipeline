# Graphics Runtime Routing

This reference routes semantic UI, 2D/3D rendering, games, geospatial surfaces, GPU effects, and
narrative UI. `graphics-runtime-catalog.json` owns stable capability-family taxonomy and adapter
IDs; `adapter-registry.json` is the sole authority for adapter facts, trust, support, provenance,
security, degradation, and benchmark admission.

## Stable Layers

1. Project `DESIGN.md` owns visual language, layout, components, type, color, and product identity.
2. Project `MOTION.md` owns motion semantics, timing, interruption, and reduced-motion behavior.
3. Change `scene.json` owns the normative spatial/runtime contract; `scene.md` explains it.
4. Runtime libraries, companion skills, and external hosts implement replaceable adapters.
5. Evidence receipts and `qa.md` prove the adapter preserved the contracts and budgets.

Model capability can improve implementation quality; it does not replace these contracts.

## Selection Order

1. Identify product profile and primary user loop.
2. Select the smallest catalog family that expresses the surface.
3. Preserve an established project runtime when it satisfies the contract.
4. Read the registry entry and require compatible support, license, security, evidence, and degradation.
5. Use a companion/host only under its declared host policy and availability.
6. Record the exact adapter/version in `scene.json` and verify it through receipts.

Do not select a library because it is popular, installed, or visually impressive.

## Families

| Family | Typical route | Primary fit |
| --- | --- | --- |
| `semantic-ui` | DOM/CSS/WAAPI | Text, forms, navigation, workflows, semantic accessibility |
| `vector-data` | SVG/D3/ECharts | Data marks, labels, axes, inspectability |
| `canvas-editor-2d` | Canvas/Konva/Fabric | Selection, transforms, drawing, infinite canvas |
| `scene-renderer-2d` | PixiJS | Sprites, particles, filters, high object counts |
| `game-engine-2d` | Phaser | Scenes, cameras, input, audio, physics, game state |
| `scene-renderer-3d` | Three.js/R3F | Focused product 3D and custom scenes |
| `game-engine-3d` | Babylon.js/PlayCanvas | Integrated entities, physics, audio, simulation lifecycle |
| `geospatial-3d` | CesiumJS/MapLibre | Maps, terrain, globes, tiles, spatial coordinates |
| `gpu-shader` | WebGPU/WGSL | Compute, custom materials, procedural/post effects |
| `narrative-game-ui` | semantic DOM / existing engine | Dialogue, choices, backlog, save/load, skip/auto |

## Support And Trust

- `native`: the pipeline owns and tests the generic contract.
- `generic-workflow`: a replaceable host/workflow can implement the port.
- `companion`: a reviewed local skill augments the native contract.
- `reference-only`: information is cataloged but no trusted execution path is claimed.
- `unsupported` / `out-of-scope`: the pipeline must choose a fallback or stop.

Only an intake-reviewed, license-verified companion may expose an install source. Credentialed hosts
remain explicit and optional. Unverified licenses, unknown network behavior, or missing evidence
keep benchmark admission blocked and never trigger automatic installation.

## Required Artifacts

Create `scene.json` plus `scene.md` for persistent PixiJS, Phaser, Three.js/R3F, Babylon.js,
PlayCanvas, CesiumJS, raw WebGPU, spatial editor, or game/narrative state. Motion stays in
`motion.md`; runtime structure cannot redefine the project motion language.

Audit current routing with:

```powershell
node skill/scripts/designer-pipeline.cjs adapter audit --root . --json
```

New candidates enter through `adapter-intake.schema.json` and `adapter intake`, with pinned source
revision/hash, license evidence, maintenance evidence, permission/network review, adoption mode,
update/removal policy, and score provenance. A registry change requires deterministic tests.
