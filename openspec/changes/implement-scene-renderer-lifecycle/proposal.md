# Implement the project-owned scene renderer lifecycle factory

## Goal

Provide a deterministic, dependency-free scene lifecycle implementation factory for the existing WebGL and 3D renderer kinds. The factory composes the established `design-pipeline.animation-lifecycle-adapter.v1` contract rather than defining another lifecycle schema, validator, status vocabulary, renderer package, or gate.

## Scope

This change owns:

- a Node-testable scene/renderer factory under `skill/scripts/` built on `createLifecycleAdapter`;
- explicit camera, viewport, DPR, root containment, and resource-registry inputs;
- deterministic authored-time `init`, `resize`, `update`, `render`, and idempotent `dispose` behavior;
- release ownership for buffers, textures, programs, framebuffers, render loops, observers, and listeners;
- fail-closed enforcement of the existing structured object, particle, texture, and frame budgets;
- blocked cleanup/context-loss/fallback reporting through the existing probe-compatible cleanup observation;
- focused tests using `createAnimationJob`, `probeLifecycle`, and `evaluatePerformanceBudget`.

## Boundaries

The factory does not install or claim to implement a WebGL/3D renderer, does not require a DOM, and does not add runtime dependencies. Existing motion-foundation lifecycle and budget validators remain authoritative. Context loss, fallback, and unreleased resources never report readiness.
