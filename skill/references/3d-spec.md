# Change 3D World Contract

For `fixed-camera-cinematic-3d`, `scene-renderer-3d`, `game-engine-3d`, and `geospatial-3d`
families, create `3d.md` as the human-readable projection of normative `scene.json`. The direct name
is intentional: it makes the spatial contract visible and prevents `design.md` from silently
absorbing 3D responsibilities.

`3d.md` must link `reference.md`, `design.md`, `motion.md`, and `scene.json`.

## Required Spatial Decisions

- world thesis and intended camera experience;
- units, axes, origin, handedness, coordinate transforms, and depth bands;
- projection type, FOV/ortho scale, near/far planes, target, initial pose, and camera constraints;
- orbit, pan, dolly/zoom, fly, selection, reset, and input-conflict behavior; explicitly record
  `not exposed` for fixed-camera output rather than adding controls;
- scene graph, object hierarchy, transforms, pivots, bounding volumes, and occlusion policy;
- geometry and volumetric-container strategy, including 2D-on-3D plane ownership;
- material, transparency, depth-write/sort, lighting, shadow, fog, bloom, and tone-mapping policy;
- world-space versus screen-space UI boundary and semantic DOM/accessibility mirror;
- lifecycle, renderer/update-loop owner, loading, disposal, context loss, and remount behavior;
- performance budgets, level of detail, DPR, draw calls, texture/memory limits, and degradation;
- deterministic graybox and final evidence captures.

## Graybox Gate

Before surface polish, the actual runtime must demonstrate:

1. correct perspective and near/far scale;
2. at least two depth-separated objects with visible occlusion;
3. working orbit, pan, dolly/zoom, and reset only where the approved interaction model requires a
   navigable scene; for fixed-camera output, verify that the production camera is locked and no
   navigation handlers are exposed;
4. correct object pivots and camera target;
5. a declared screen-space/world-space UI boundary;
6. stable resize, reduced-motion/reduced-effects behavior, and cleanup.

Bloom, glow, transparency, scanlines, and color grading come after this gate. They cannot substitute
for spatial construction.
