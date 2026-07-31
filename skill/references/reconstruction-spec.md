# Static Reference Reconstruction Contract

Use this contract when a supplied still image is the primary target rather than inspiration. It
closes the gap between “the medium is correctly classified” and “the rendered frame actually
matches.”

## Required order

1. Preserve the source image, dimensions, and SHA-256 identity.
2. Separate image space, canonical/object space, world space, and camera space.
3. Rectify the relevant source plane into `rectified-reference.png`.
4. Build `front-elevation.svg` in canonical space.
5. Construct shallow or full geometry from that elevation.
6. Solve the camera and write `camera-calibration.json`.
7. Lock the camera and output viewport.
8. Render the graybox and create `landmark-overlay.png`.
9. Pass the geometry gate.
10. Add detail geometry, type, materials, light, depth of field, bloom, and grade.
11. Produce source/render/diff evidence through an independent EvidencePort.
12. Pass the final gate.

Do not start from a hand-authored oblique layout. Perspective is the output of object geometry and a
camera, not a substitute for either.

## Normative artifact

`reconstruction.json` uses `design-pipeline.reconstruction.v1` and records:

- `mode`: `exact-reconstruction` or `adaptive-reconstruction`;
- four named coordinate spaces;
- rectification method, source/canonical viewports, at least four anchors, the rectified raster, and
  canonical front elevation;
- a locked perspective or orthographic camera with lens/frustum, clipping, pose, target, up vector,
  roll, calibration artifact, and render viewport;
- distributed source/render landmarks, thresholds, and overlay evidence;
- geometry approval;
- final comparison artifacts, thresholds, measurements, EvidencePort capability/probe state,
  hash-bound receipt, and final approval.

## Geometry gate

Run:

```powershell
node <skill-root>/scripts/designer-pipeline.cjs reconstruction check `
  --root <project-root> `
  --change-root <change-root> `
  --stage geometry `
  --json
```

The validator recomputes Euclidean source/render error. Exact mode requires:

- at least 8 landmarks;
- at least 4 named regions across the frame;
- mean error no greater than 1.5 px;
- maximum point error no greater than 3 px;
- existing rectified reference, front elevation, camera calibration, and overlay artifacts;
- explicit geometry approval.

Landmarks should include outer panel corners, major internal frame corners, title anchors, digit
centers/baselines, lower separators, and the near rail. Clustering all points around the easy center
is invalid.

Missing evidence or pending approval is `blocked`. Complete measurements outside thresholds are
`fidelity-limited`. Materials and cinematic effects cannot compensate for either result.

## Final comparison gate

The EvidencePort must provide:

- `render-reference`;
- `render-implementation`;
- `pixel-diff`;
- `ssim`;
- a successful capability probe;
- `fidelity-receipt.json` using
  `design-pipeline.reconstruction-evidence.v1`.

The receipt binds the source render, implementation render, and diff image by SHA-256, records the
locked viewport, and repeats the submitted pixel-difference and SSIM measurements. The validator
checks the hashes and measurement identity before applying thresholds.

Exact mode defaults to thresholds no weaker than:

- pixel difference ratio at most `0.03`;
- SSIM at least `0.97`;
- no intentional masks.

Run:

```powershell
node <skill-root>/scripts/designer-pipeline.cjs reconstruction check `
  --root <project-root> `
  --change-root <change-root> `
  --stage final `
  --json
```

Only `ready` may be described as exact or complete. `fidelity-limited` means the measurements are
real but the frame still differs. `blocked` means the comparison is unavailable or untrusted.

## Invalidation

Changing camera model, FOV/frustum, pose, target, roll, output viewport, canonical elevation, or
major geometry after geometry approval invalidates the overlay. Re-run calibration; never
counter-distort geometry to hide camera drift.
