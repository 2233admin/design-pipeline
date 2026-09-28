# Animation runtime contract tasks

- [x] Add stable Animation Job and renderer-neutral MotionGraph schemas/constants and fail-closed validation.
- [x] Implement deterministic authored-time graph sampling and reusable sample/seek/settle/reset/dispose job semantics.
- [x] Require explicit seed, input, viewport, DPR, reduced-motion, mechanism/skin, and renderer binding fields.
- [x] Add lifecycle adapter validation/factory for DOM, SVG, Canvas2D, WebGL, and 3D-capable renderer contracts, including init/resize/update/render/dispose, resource ownership, containment, and cleanup observability.
- [x] Add fail-closed object, particle, texture, and frame performance budgets with observed-overrun comparisons.
- [x] Extend the existing motion-verification receipt with optional validated animation contract and authored sample bindings.
- [x] Add core-owned runtime tests for lifecycle semantics, reduced-motion sampling, graph bounds/IDs, and budget overruns; register the test in the declared manifest.
- [ ] Keep probes, oracles, fixtures, and runtime verification workflows in the independent `extend-animation-verification` change.
- [ ] Run final integrated review after the independent verification change lands; do not claim 3D renderer implementation from this contract.
