# Proposal: Harden Fixed-Camera Spatial Routing

## Problem

The current reference route couples authored 3D depth to camera navigation. A reference can therefore
contain real thickness, occlusion, contact shadows, perspective convergence, and depth of field while
still being misclassified as 2D because the final product does not expose orbit, pan, or dolly controls.
The route is also recorded only in prose, so the pipeline cannot reject a spatially contradictory
classification or block implementation before user approval.

## Change

- Separate object dimensionality, camera model, interaction model, and output surface.
- Add `fixed-camera-cinematic-3d` as a first-class graphics capability family.
- Add a machine-checkable `reference-evidence.json` contract and public `reference check` command.
- Reject 2D routes when multiple strong spatial cues are present.
- Require `scene.json`, `3d.md`, and a graybox capture for every 3D route.
- Make explicit reference-route approval a readiness gate.

## Non-goals

- Inferring artistic intent from pixels without authored evidence.
- Requiring end-user camera controls for all 3D work.
- Choosing Three.js, Blender, or another runtime before capability routing.
