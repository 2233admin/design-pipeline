# Extend the project-owned animation runtime contract

## Goal

Make reusable animation behavior a first-class project-owned contract without adopting an external renderer or introducing a second runtime or gate. The contract extends the existing motion foundation and motion-verification receipt with an authored-time Animation Job/MotionGraph, renderer-neutral lifecycle ownership, deterministic sampling inputs, and fail-closed performance budgets.

## Scope

This change owns:

- `design-pipeline.animation-job.v1` and `design-pipeline.motion-graph.v1` validation and deterministic sampling;
- authored-time `sample`, `seek`, `settle`, `reset`, and `dispose` semantics;
- deterministic seed, input, viewport, DPR, and reduced-motion fields;
- mechanism-versus-skin separation and renderer-neutral graph shape;
- lifecycle adapter contracts for DOM, SVG, Canvas2D, WebGL, and 3D-capable renderers;
- resource ownership, containment, cleanup observability, and object/particle/texture/frame budgets;
- structured frame budgets require maxMs, maxLongFrames, maxInputLatencyMs, maxCpuMs, with finite/non-negative values, targetFps >= 1, and fail-closed overruns;
- optional bindings in the existing motion-verification evidence receipt.

## Boundaries

This is a contract and small deterministic sampler, not a new renderer, physics engine, package dependency, probe system, or gate. Existing execution-target, route, toolchain, receipt, and Probe/Gate authorities remain authoritative. The independent `extend-animation-verification` change owns probes, oracles, fixtures, and runtime evidence workflows; this change does not duplicate those behaviors.

A 3D-capable lifecycle adapter is a contract surface only. It does not implement or install a 3D renderer.

## Non-goals

- Do not modify `fix-motion-web-provenance`.
- Do not copy or import motion-web code, cases, assets, prompts, workflow, or runtime.
- Do not change existing target output or create a parallel animation runtime/gate.
- Do not claim renderer implementation where only an adapter contract exists.
