# Change Reference Evidence And Spatial Routing

Create `reference.md` before design directions whenever screenshots, films, games, live pages,
concept art, diagrams, or other visual references influence the change. The file records observable
evidence; it must not jump directly from mood words to implementation.

## Required Decision

Record four independent decisions before selecting exactly one route:

- object dimensionality: `2d`, `2.5d`, or `3d`;
- camera model: none, fixed orthographic, fixed perspective, or navigable perspective;
- interaction model: none, bounded parallax, inspectable, or navigable;
- output surface: screen-space UI, locked cinematic frame, or interactive scene.

Then select exactly one route:

- `2d`: flat screen-space composition; no authored depth or spatial navigation.
- `2.5d`: planar UI with bounded perspective, parallax, or pseudo-volume; no navigable world.
- `3d`: a perspective or orthographic world with authored depth. Camera navigation is independent
  and may be absent for a fixed-camera cinematic shot.
- `hybrid`: a 3D world plus screen-space UI or DOM accessibility layers.

Evidence that activates the spatial route includes:

- near/far scale change, foreshortening, occlusion, vanishing lines, or camera-dependent overlap;
- volumetric containers, meshes, world-space labels, lights, shadows, reflections, or depth fog;
- orbit, pan, dolly/zoom, fly, inspect, or Blender/Maya-like viewport behavior, when exposed;
- UI whose hierarchy is attached to objects or planes in world coordinates.

Glow, blur, transparency, scanlines, and cinematic color grading are not 3D evidence by
themselves.

## Required Sections

`reference.md` must state:

1. source inventory and provenance;
2. observable composition, type, color, material, lighting, and motion evidence;
3. spatial evidence for and against 3D;
4. selected route (`2d`, `2.5d`, `3d`, or `hybrid`) and confidence;
5. fidelity invariants that must survive implementation;
6. uncertain or missing evidence and how it will be tested;
7. resulting artifact requirements.

Write the same classification and evidence to normative `reference-evidence.json`, then run
`designer-pipeline reference check`. A valid contract remains blocked until its approval status is
`approved`. Two or more recorded spatial cues make a `2d` classification invalid.

Version 2 also records the reference role and the fidelity contract:

- `primary-target`: the implementation is compared back to this exact source.
- `constraint`: selected properties constrain the implementation but the whole frame is not a
  pixel baseline.
- `inspiration`: the reference informs direction only.
- `exact-reconstruction`: measured equivalence is required and cannot be silently downgraded.
- `adaptive-reconstruction`: measured comparison is required, with explicit documented
  adaptations.
- `directional-inspiration`: comparison is qualitative and must never be described as 1:1.

Words such as identical, exact, 一模一样, 1:1, reproduce, clone, pixel-accurate, and faithful copy
select `primary-target` plus `exact-reconstruction`. In that mode, `reference check` also runs the
geometry stage of the declared `reconstruction.json`; approval of the medium alone is not enough.
Only explicit user approval may downgrade requested exact fidelity, and the original request remains
recorded.

For `3d` and `hybrid`, require `scene.json` plus `3d.md` and an actual-runtime graybox before visual
polish. Navigation is required only when the interaction model is inspectable or navigable. For
persistent non-3D renderers or narrative runtimes, require `scene.json` plus
`scene.md`. For ordinary `2d`, neither runtime artifact is required unless a persistent engine owns
state.

For exact or adaptive static-reference reconstruction, also require
`rectified-reference.png`, `front-elevation.svg`, `camera-calibration.json`,
`landmark-overlay.png`, and `reconstruction.json`. Follow `reconstruction-spec.md`.

## Anti-Shortcut Gate

Do not satisfy a spatial reference by arranging flat cards and adding bloom. Before polishing,
verify perspective, near/far scale, occlusion, the declared camera constraints, object pivots,
world/screen-space ownership, and a usable non-3D fallback. Do not add orbit, pan, or dolly controls
when the approved output is a locked cinematic frame.
