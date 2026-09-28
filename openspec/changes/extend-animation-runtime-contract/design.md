# Animation runtime contract design

## Existing authorities

The implementation extends `skill/scripts/motion-foundation-core.cjs` and `skill/scripts/motion-evidence-core.cjs`. It reuses the existing motion foundation, `design-pipeline.motion-verification.v1` receipt, and current gate/receipt conventions. No second gate or renderer package is introduced.

## Contract shape

`AnimationJob` uses `design-pipeline.animation-job.v1` and contains:

- `motionGraph`: `design-pipeline.motion-graph.v1`, with declarative tracks and bounded responses;
- `deterministic`: integer/string seed, explicit input object, positive viewport width/height, DPR, and reduced-motion flag;
- `mechanism` and `skin` as separate authored objects;
- renderer binding (`dom`, `svg`, `canvas2d`, `webgl`, or `3d`);
- lifecycle ownership and structured object/particle/texture/frame budgets; frame budgets require maxMs, maxLongFrames, maxInputLatencyMs, and maxCpuMs.

The graph itself is renderer-neutral. Sampling is a pure authored-time mapping with bounded linear/eased tracks. A reduced-motion sample resolves to the graph's authored resting endpoint. A runtime job delegates `seek` to update/render, `settle` to the graph duration, `reset` to zero, and `dispose` exactly once.

## Lifecycle adapter

`design-pipeline.animation-lifecycle-adapter.v1` requires `init`, `resize`, `update`, `render`, and `dispose` capabilities plus explicit resource ownership, containment boundary, and observable cleanup checks. `createLifecycleAdapter` wraps callbacks and records initialized/disposed/resource-release state. DOM, SVG, Canvas2D, WebGL, and 3D-capable values share this shape; only a contract is implemented for 3D.

## Performance and evidence

All four budget classes are explicitly declared as applicable or not applicable. Applicable frame budgets require maxMs, maxLongFrames, maxInputLatencyMs, and maxCpuMs; every limit and observation is finite and non-negative, targetFps is finite and at least 1, and observations are compared against their matching limit so missing fields or overruns throw rather than reporting ready. Existing motion evidence MAY bind validated job/graph/input/lifecycle/budget records and monotonic authored sample frames, while the separate verification change owns probes, oracles, and fixtures.
