# Handoff: Decouple Component-First Gate

## Current State

Implementation and verification are complete. The public synchronous facade delegates to a single
orchestrator, effectful discovery is isolated in adapters, gate modules consume only resolved
values, and serializers own the aggregate/stage wire formats. The v1 compatibility boundary is
frozen by tests and JSON Schemas.

The CLI now exposes `component-first check`, four stage commands, and the `high-fidelity check`
readiness alias. Exit codes are 0 for passed, 1 for invalid input/evaluation, and 2 for blocked.

See `qa.md` for the exact evidence. Focused tests, all 496 declared repository tests, strict
OpenSpec validation, and hermetic package/install QA pass.

## Compatibility Note

Do not describe the change as behavior-preserving relative to an older component-first core: none
exists in repository or remote history. Preserve the new v1 goldens and all unrelated existing CLI
behavior.

The same limitation applies to CICADA: this repository contains no CICADA production target, so no
CICADA regression result is claimed.

## Deferred Changes

- `../design-component-first-artifact-v2/` owns target/snapshot/freshness binding and visual-gate
  separation.
- `../add-design-skill-layer/` owns manifests, effect enforcement, handoff artifacts, and prototype
  promotion.
