---
sourceMeta:
  id: motion-web-capability-reference
  kind: github
  url: https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115
  reviewedRevision: 5f4e40f1253e11e28850d08dce28b9b7e4320115
  reviewedContentHash: 68945441b0bbd6b79f2849206c019c2c7bc01a13a2bbd5c267c9c3d5c069c1b4
  contentHashScope: ordered UTF-8 sourceFiles with path-and-newline separators
  sourceFiles: README.md, LICENSE
  reviewedAt: 2026-09-18T00:00:00.000Z
  freshnessDays: 30
  license: CC-BY-NC-4.0
  useBoundary: reference-only; project-authored distillation; do not install, execute, copy, or bundle upstream content
  codeCopied: false
---

# Motion-first Capability Reference

This is a project-owned design and tooling reference for motion-heavy work. It extracts general
engineering goals from an inspected motion reference and binds them to this repository's existing
motion foundation, primitive registry, GSAP/HyperFrames adapters, Animation Job/MotionGraph runtime
contracts, and evidence gates. It is not an upstream skill, a source mirror, or an ungoverned runtime dependency.

Use this reference when a target needs animation to communicate material, continuity, physical
response, or a time-based explanation rather than merely fade a component in.

- **Motion has a job**: state, hierarchy, spatial continuity, physical response, or explanation.
- **The material is explicit**: choose semantic DOM/SVG, a 2D renderer, or a 3D renderer from the
  object count, geometry, lighting, filter, and accessibility requirement; do not choose Canvas or
  WebGL because a showcase used it.
- **Response is authored**: a spring, drag, orbit, trace, or camera move has bounded parameters,
  an interruption policy, a reduced-motion substitute, and a named runtime owner.
- **The object remains legible**: motion may expose or connect content, but it cannot replace the
  semantic carrier, source attribution, focus order, or error state.
- **Evidence is part of the capability**: a rendered frame sequence or real playback, runtime
  instrumentation, cleanup check, and reduced-motion check are required for non-trivial motion.

## Public runtime and evidence bindings

Use this reference through the existing `motion-graphics` route; it adds no new public route. A
non-trivial animation declares an Animation Job with a semantic MotionGraph, deterministic input
trace, authored-time and lifecycle probes, reduced-motion substitution, and performance budgets.
The graph records subject, purpose, anchors, tracks, and bounded responses; the input trace records
seed, viewport/DPR, reduced-motion mode, and replayable keyboard/pointer/touch/drag events.

The public CLI checks the contract and then packages only a lineage-complete change:

```bash
designer-pipeline verify motion --receipt motion-verification.json --json
designer-pipeline verify --gate <gate> --artifact <gate-receipt.json> --json
designer-pipeline package --change-root <change-root> --output package/animation-package.json --json
```

Native capture evidence binds execution receipt/plan, composition receipt/hash, source-admission
receipt/content hash, route id, and toolchain plan hash. When the plan declares animation lineage,
`package` validates the native chain and accepts declared workspace, artifact, and evidence roots
via `--workspace-root`, `--artifact-root`, and `--evidence-root`. A fixture-style native chain is
acceptable only when a real target capture cannot be produced, and that limitation must remain
explicit in the walkthrough. Motion conformance remains distinct from Visual Acceptance.

## Motion-first planning card

Before implementation, record one row per moving subject:

| Field | Required decision |
| --- | --- |
| Subject | The semantic object or relationship that moves |
| Purpose | Feedback, state, spatial continuity, physical response, or explanation |
| Material | DOM, SVG, Canvas, WebGL/WebGPU, or video; name why |
| Anchor | Origin, shared element key, camera target, or path reference |
| Response | Enter/exit, settle, drag/inertia, trace, orbit, or camera shift |
| Parameters | Duration or bounded physical parameters, distance, scale, opacity, and delay/stagger |
| Interruption | Reverse, cancel, retarget, route exit, resize, unmount |
| Reduced motion | Static end state or discrete state change preserving meaning |
| Evidence | Runtime/frames/trace and the artifact path |

Reject a motion opportunity when its only purpose is decoration, when it delays frequent work, or
when the same meaning is already clear without motion.

## Deterministic physical response

“Physics-like” describes the response, not a permission to add an uncontrolled render loop. The
pipeline has two valid owners:

1. **Authored-time owner** — GSAP/WAAPI/CSS or a deterministic adapter maps a sampled time `t` to
   the same state on every seek. This is the required owner for HyperFrames and offline output.
2. **Interactive owner** — a live input loop may update the same semantic state during drag or
   pointer work, but it must hand off to an authored settle timeline and release all listeners,
   observers, tickers, and render contexts on interruption/unmount.

`requestAnimationFrame`, wall-clock time, unseeded randomness, network data, and input history MUST
NOT be the source of truth for an offline-rendered composition. If an equation or procedural path
is needed, record its bounded parameters, seed, sampling resolution, loop/phase policy, surface,
performance budget, and reduced-motion fallback in change-level `motion.md` or `scene.json`.

## Surface selection

| Need | Default surface | Escalate only when |
| --- | --- | --- |
| Semantic state, focus, text, small transitions | DOM + CSS/WAAPI | A timeline or choreography materially benefits from GSAP |
| Paths, connectors, line reveal, geometry with accessible DOM mirror | SVG | Object count or filter workload exceeds SVG budget |
| Many sprites, procedural fields, filters, or shader-like texture | Canvas/PixiJS | A real renderer and performance budget are owned by the target |
| Depth, lighting, camera, volumetric or world-space material | Three.js/WebGL/WebGPU | The scene contract, fallback, DPR, disposal, and semantic overlay are present |
| Finite authored film | HTML + one paused seekable timeline | A different renderer is explicitly required and still exposes deterministic sampling |

One surface may own the render loop. Mixed surfaces require an explicit z-order, coordinate-space,
resize, accessibility, and cleanup boundary; do not add a second animation runtime just to obtain a
new easing preset.

## Evidence card

For each non-trivial motion, preserve:

- selected primitive id and foundation hash;
- trigger, target, start/end state, purpose, duration/physical parameters, easing, and interruption;
- observed duration, frame cadence, long-frame budget, and deterministic seek result;
- cleanup result in the existing runtime/lifecycle QA evidence; do not add a cleanup key to the motion-verification receipt;
- normal and reduced-motion captures, plus mobile/desktop state where applicable;
- whether each statement is `measured`, `instrumented`, `inferred`, or `authored`.

Use the existing `design-pipeline.motion-verification.v1` receipt for its declared timing/determinism fields and
record cleanup in the corresponding QA/runtime lifecycle artifact. Use `references/motion-spec.md` for the full contract.
Do not turn a screenshot, a benchmark, or a reference repository into proof of product behavior.

## Reference boundary

Adopted: the general practice of treating motion as a first-class material/behavior problem,
bounding physical responses, selecting a renderer by need, and proving deterministic output.

Rejected: upstream source code, assets, fonts, copy, case names, prompts, CLI shape, test fixtures,
workflow text, and one-for-one visual motifs. `codeCopied: false`; this file is an authored project
reference. Existing project `MOTION.md`, change `motion.md`, OpenSpec, and current gates remain
authoritative.
