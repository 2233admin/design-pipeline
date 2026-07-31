# Design: Fixed-Camera Spatial Routing

## Decision

Reference classification becomes a four-axis contract:

1. object dimensionality,
2. camera model,
3. interaction model,
4. output surface.

The canonical fixed-shot route is:

`3d + fixed-perspective + none + locked-cinematic-frame`

That combination maps to `fixed-camera-cinematic-3d`. It uses real scene geometry and a real camera,
but the camera is production apparatus rather than a user control.

## Evidence

The classifier records six spatial cues: thickness, occlusion, contact shadows, bevel highlights,
perspective convergence, and depth of field. Two or more present cues make a `2d` route contradictory.
Evidence text is required for every cue marked present.

## Readiness

Schema-valid evidence remains `blocked` until its approval status is `approved`. A 3D route is invalid
unless its declared artifact set includes `reference.md`, `scene.json`, `3d.md`, and `graybox.png`.

## Runtime

The runtime catalog gains a dedicated family and a Three.js adapter profile with no required camera
navigation. The existing general 3D renderer route remains available for inspectable or navigable
scenes.
