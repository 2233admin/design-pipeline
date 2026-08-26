# Tasks

## Contracts

- [x] Define the synthesis boundary, evidence roles, and interaction state machine.
- [x] Add the design-synthesis JSON schema and reference guide.
- [x] Extend the agent state/event vocabulary without breaking existing runs.

## Runtime

- [x] Add an atomic, resumable design-synthesis initializer.
- [x] Add guarded transitions for grill completion, scope assessment, Wayfinder linking,
  DESIGN.md validation, and implementation continuation.
- [x] Validate project containment, evidence paths, and required DESIGN.md sections.

## Integration

- [x] Route missing-DESIGN.md work through synthesis in SKILL.md.
- [x] Add core resources to capability self-check and package QA.
- [x] Document requirements-only, reference-site, template-evidence, and hybrid usage.

## Verification

- [x] Add regression tests for initialization, idempotency, scope surprise, Wayfinder, validation,
  unsafe paths, and continuation.
- [x] Run repository tests, QA, package checks, installed self-check, and structural analysis.
