# Brief: Decouple Component-First Gate

## Goal

Introduce the component-first conformance gate as a stable CJS public surface backed by effect
adapters, pure domain gates, one orchestrator, and versioned v1 serializers.

## Scope

- Preserve synchronous `checkComponentFirstGate()` behavior from the first committed v1 golden.
- Provide aggregate and stage CLI commands with exit codes `0`, `1`, and `2`.
- Reuse `frontend-stack-core`, `component-capability-core`, and `playground-core` only through
  adapters.
- Express prototype versus production page readiness without implementing promotion or snapshot
  freshness.

## Constraints

- CJS and Node standard library only.
- No target-project dependency installation or browser execution.
- No state/event migration change, CICADA production change, visual demo work, artifact v2, or
  Design Skill runner.
- The repository contains no prior component-first implementation. The first golden fixtures in
  this change therefore establish the v1 compatibility baseline; they are not represented as a
  differential match against nonexistent code.

## Acceptance

The facade is thin, gates are pure, results are deterministic, stage commands are read-only, the
v1 golden is stable, and focused plus package/install regression suites pass.
