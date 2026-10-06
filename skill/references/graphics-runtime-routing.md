# Graphics Runtime Routing

This reference routes semantic UI, 2D/3D rendering, games, geospatial surfaces, GPU effects, and
narrative UI. `graphics-runtime-catalog.json` owns stable capability-family taxonomy and adapter
IDs; `adapter-registry.json` is the sole authority for adapter facts, trust, support, provenance,
security, degradation, and benchmark admission.

## Stable Layers

1. Project `DESIGN.md` owns reusable product identity; change `design.md` owns visual language and
   screen-space UI.
2. Project `MOTION.md` owns motion semantics, timing, interruption, and reduced-motion behavior.
3. Change `reference.md` records observable spatial evidence while `reference-evidence.json`
   normatively separates geometry, camera, interaction, and output before selecting `2d`, `2.5d`,
   `3d`, or `hybrid`.
4. Change `scene.json` owns the normative spatial/runtime contract; `3d.md` explains 3D families
   and `scene.md` explains persistent non-3D families.
5. Runtime libraries, companion skills, and external hosts implement replaceable adapters.
6. Evidence receipts and `qa.md` prove the adapter preserved the contracts and budgets.

Model capability can improve implementation quality; it does not replace these contracts.

For drawing, image placement, type fitting, material techniques or visual diagnostics, load
`tools/README.md` and only the selected helper. These are supporting tools within the selected
runtime (for example native `canvas-2d`), not another runtime registry or a film requirement.
Keep interactive text, controls and accessibility in the project's semantic DOM where applicable.

## Selection Order

1. Identify product profile and primary user loop.
2. Select the smallest catalog family that expresses the surface.
3. Preserve an established project runtime when it satisfies the contract.
4. Read the registry entry and require compatible support, license, security, evidence, and degradation.
5. Use a companion/host only under its declared host policy and availability.
6. Record the exact adapter/version in `scene.json` and verify it through receipts.

Do not select a library because it is popular, installed, or visually impressive.

For Python charting, notebook, static-export, or Reflex application work where large-data
interaction is material, the built-in `reflex-xy` route is available. Read `xy-charting.md` before
selecting it. XY is alpha and project-installed-only: pin the target project's version, verify the
required export and accessibility surfaces, and preserve an accepted chart runtime when it already
satisfies the contract.

## Families

| Family | Typical route | Primary fit |
| --- | --- | --- |
| `semantic-ui` | DOM/CSS/WAAPI | Text, forms, navigation, workflows, semantic accessibility |
| `vector-data` | SVG/D3, XY, ECharts | Data marks, labels, axes, inspectability, large Python datasets |
| `canvas-editor-2d` | Canvas/Konva/Fabric | Selection, transforms, drawing, infinite canvas |
| `scene-renderer-2d` | PixiJS | Sprites, particles, filters, high object counts |
| `game-engine-2d` | Phaser | Scenes, cameras, input, audio, physics, game state |
| `fixed-camera-cinematic-3d` | Three.js fixed-camera profile | Authored 3D stills or sequences with no user camera navigation |
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

Create `reference.md` and `reference-evidence.json` first when visual references influence the
route, then require `designer-pipeline reference check` to report `ready`. Create `scene.json` plus
`3d.md` for fixed-camera cinematic output, Three.js/R3F, Babylon.js, PlayCanvas, CesiumJS, and other
3D families. Create
`scene.json` plus `scene.md` for persistent PixiJS, Phaser, raw WebGPU without a 3D family, spatial
editors, or game/narrative state. Motion stays in `motion.md`; runtime structure cannot redefine the
project motion language.

Audit current routing with:

```powershell
node skill/scripts/designer-pipeline.cjs adapter audit --root . --json
```

New candidates enter through `adapter-intake.schema.json` and `adapter intake`, with pinned source
revision/hash, license evidence, maintenance evidence, permission/network review, adoption mode,
update/removal policy, and score provenance. A registry change requires deterministic tests.

## Threejs Project Lifecycle

Reviewed runtime baseline: Three.js 0.186.1, source commit
`9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8` (r186), checked 2026-10-07. The r186 migration notes
that `BufferGeometryUtils.toTrianglesDrawMode()` now mutates its input geometry and that
`LightProbeGrid`/`LightProbeGridHelper` were renamed to their `WebGL` forms. Clone geometry before
conversion when the original must remain unchanged. This reviewed baseline does not pin or upgrade
a target project; verify that project's exact installed version before using an API.

Both `threejs` and `threejs-fixed-camera` use the target project's installed Three.js. Declare an
exact version in `dependencies.three` or `devDependencies.three` and provide a nonempty
`package.json#scripts.dev` for that project's development server. The existing toolchain probe
reads `node_modules/three/package.json`, checks the declared and installed versions match, and
imports that explicit local package. It never installs a package, searches global modules or
starts the server. Missing dependencies, version ranges, mismatches, missing dev scripts and
import errors remain blocked with their concrete cause.

The returned invocation is `npm run dev`, owned by the target project. If the project already has
a start command, its `dev` script can call that command. The agent must run and record the actual
invocation before supplying evidence. Package import proves availability only. The plan lists
scene, screenshot and performance evidence for `design-pipeline.toolchain-receipt.v1`; collect
those from the real browser, including shader compilation and deterministic sampling where
required. Receipt structure and file hashes do not prove runtime behavior or visual acceptance.

For an interactive component or VFX, also activate its play/trigger control and capture two
canvas frames during the active interval. Seeking to different times and observing an idle
endpoint do not prove playback. With a paused GSAP timeline, `timeline.pause(0)` only resets;
`timeline.restart()` starts it. Keep that timeline as the animation clock and check reduced-motion
initialization separately. Visual acceptance remains a separate user review.
