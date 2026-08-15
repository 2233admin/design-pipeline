# Proposal: Decouple Component-First Gate

## Why

Component conformance needs a governed public gate before artifact v2 or a Design Skill layer can
depend on it. The repository already owns stack, component-capability, and Playground kernels, but
has no aggregate component-first surface. Adding that surface as one core would immediately create
the God Core this change is meant to avoid.

## What Changes

- Add internal contracts, a versioned policy, effect adapters, five pure gates, an orchestrator,
  and aggregate/stage serializers under `skill/scripts/component-first/`.
- Add a thin `component-first-core.cjs` public facade.
- Add `component-first check|stack|components|playground|page` and the compatibility alias
  `high-fidelity check` without restructuring the rest of `cli-core.cjs`.
- Establish API, CLI, and artifact goldens before the implementation is treated as stable.
- Add separate OpenSpec changes for artifact v2 and the Design Skill layer; do not implement them
  here.

## Compatibility Baseline

Repository and remote history were searched before implementation. No `component-first-core.cjs`,
`checkComponentFirstGate()`, `component-first-gate.v1`, `component-first` CLI, `high-fidelity`
command, CICADA implementation, or prior CF reason-code registry exists. Compatibility therefore
means preserving the first committed v1 contract and every existing unrelated CLI behavior. The QA
report must continue to state this fact instead of claiming an old-versus-new zero diff.

## Non-Goals

Artifact v2, strict target/snapshot/freshness binding, multiple receipts, visual acceptance, skill
manifests/routing, production promotion, signature/attestation, browser execution, and target
dependency installation.
