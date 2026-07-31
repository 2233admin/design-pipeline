# Change Scene And Runtime Contract

Create normative `scene.json` plus one readable projection when a change owns persistent 2D/3D
state, a render/game loop, Canvas/WebGL/WebGPU resources, cameras/coordinates, geospatial state, or
persistent narrative game state.

`scene.json` is normative and uses `design-pipeline.scene-runtime.v1`. Use `3d.md` for
`scene-renderer-3d`, `game-engine-3d`, and `geospatial-3d`; use `scene.md` for other persistent
families. Neither replaces project `DESIGN.md`, project `MOTION.md`, or change `reference.md`,
`design.md`, or `motion.md`.

## Normative Sidecar

The sidecar must contain exactly these top-level fields:

- `schema`, `id`, and capability `family`;
- `adapter`: registry ID, explicit version, support state, and honest availability;
- `foundations`: SHA-256 of project DESIGN and MOTION foundations;
- `lifecycle`: owner, clock, update-loop owner, and cleanup owner;
- `coordinateSystem`: model and camera policy;
- `assets`: source, license, and optional content hash;
- `input`: pointer, keyboard, touch, and focus mappings;
- `accessibility`: semantic overlay, keyboard fallback, announcements, reduced-motion substitute;
- `budgets`: target FPS, long-frame threshold, memory, and draw-call ceiling;
- `evidence`: deterministic flag, fixed seed, and receipt paths;
- `degradation`: status and usable fallback;
- `cleanup`: named owners and verifiable checks.

Use support values from the adapter registry: `native`, `generic-workflow`, `companion`,
`reference-only`, `unsupported`, or `out-of-scope`. Availability is `available`, `unavailable`,
`blocked`, or `unknown`. An honest non-available value is schema-valid but blocks execution.

Authored ownership, input, accessibility, fallback, asset provenance, and cleanup prose cannot use
placeholders. Adapter IDs/versions must be concrete. Foundation links must be 64-character SHA-256
values. Evidence must be deterministic and cite at least one receipt.

## Readable Projection

The selected `scene.md` or `3d.md` projection must link `scene.json` and begin with matching identity
markers:

```md
Scene ID: `<scene-id>`
DESIGN SHA-256: `<64-hex>`
MOTION SHA-256: `<64-hex>`
Adapter: `<adapter-id>@<version>`
Sidecar: [scene.json](./scene.json)
```

It must contain these exact second-level headings:

1. `Runtime Thesis`
2. `Lifecycle`
3. `Coordinates and Camera`
4. `Assets and Provenance`
5. `Input`
6. `Accessibility`
7. `Performance Budgets`
8. `Deterministic Evidence`
9. `Degradation`
10. `Cleanup Ownership`

Explain concrete decisions under every heading. The Markdown projection may include richer tables
for boot/pause/resume/destroy, scene/camera/layer mappings, asset ownership, input conflicts, and
QA scenarios, but it cannot contradict the sidecar.

For 3D families, `3d.md` must additionally satisfy `references/3d-spec.md`, including perspective,
spatial navigation, scene graph, volumetric construction, world/screen-space ownership, and the
pre-polish graybox gate. A legacy 3D `scene.md` is reported as `upgrade-required` with a
deterministic rename preview; the checker does not rewrite it.

## Gate

```powershell
node skill/scripts/designer-pipeline.cjs scene check --root . --change-root <change> --json
```

- `ready` / exit `0`: sidecar and projection agree, adapter is available, degradation is not blocked.
- `blocked` / exit `2`: contract is valid but the adapter/degradation cannot execute.
- `upgrade-required` / exit `2`: a projection exists without `scene.json`, or a 3D family still
  uses legacy `scene.md`; a deterministic preview is returned and no file is written.
- invalid / exit `1`: schema, identity, placeholder, foundation, or projection mismatch.

The selected adapter owns one render/update clock and cleanup path. Multiple runtimes require
non-overlapping property, input, lifecycle, and disposal ownership. Critical information retains a
semantic, reduced-motion, and unsupported-renderer fallback.
