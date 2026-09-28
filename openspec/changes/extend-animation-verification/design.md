# Generic animation verification design

## Reuse existing spine

`skill/scripts/animation-verification-core.cjs` is an adapter-neutral evidence helper. It invokes a target's existing authored-time `seek`, `settle`, `reset`, input, and lifecycle methods; it does not own a clock, animation runtime, renderer, or scheduler.

The fixed-step sampler emits 30/60/120 samples from authored milliseconds. Replay validates and persists a `design-pipeline.animation-input-trace.v1` envelope (`schema`, `version: 1`, source identity, viewport metadata, and ordered events) before applying events in memory. Validation requires monotonic timestamps, non-empty keyboard keys, legal pointer/touch phases, and drag `start` -> `move*` -> `end`; touch replay is covered by a focused test. Transition, reduced-motion, lifecycle, and performance functions are pure or callback-driven oracles; no-teleport requires a caller-declared scalar/vector extractor or per-channel thresholds and fails closed without one. Performance declaration validation is delegated to `validatePerformanceBudgets` from the core Animation Job contract, then the verifier only compares observations.

## Receipt and gate boundary

`The helper validates a complete native receipt chain. It requires admitted snapshot, execution-target, deploy profile, runtime/static artifact, Dynamic Design composition, capture, existing gate receipt, and final artifact references, alongside source identity/revision/content hash. Each binding is checked through the existing owner validator, with native receipt hashes, route/toolchain bindings, trusted roots, and upstream receipt ids. Missing, incomplete, mismatched, blocked, or invalid bindings return a blocked result; no parallel lineage schema or gate is created.`

## Fixtures

`tests/fixtures/animation-verification-fixture.cjs` provides two project-owned synthetic mechanisms with distinct skins. They exercise the same probe surface without external runtime or asset dependencies.
