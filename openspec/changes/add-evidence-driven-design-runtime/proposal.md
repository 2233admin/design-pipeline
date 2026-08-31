# Proposal: Evidence-Driven Design Compiler and Verification Runtime

## Why

The repository already has durable v2 pipeline state, hash-bound receipts, palette and motion gates,
component routing, Browser/Builder/Evidence boundaries, and fail-closed capability handling. It still
lacks one controller that turns product intent into an executable phase graph and propagates artifact
freshness through that graph. As a result, a visually complete page can be treated as ready without
proving structure, content, interaction state, or runtime verification.

## What Changes

- Add a deterministic design-plan compiler for intent, constraints, required artifacts, phases, gates,
  dependencies, and invalidation rules.
- Add a controller layer that reuses the existing v2 state/event ledger and records phase status and
  pipeline outcome separately in the existing extension boundary.
- Add artifact metadata and input-hash freshness checks with downstream stale propagation.
- Add a mandatory interaction-state coverage gate. Core interactions must cover `default` plus the
  applicable non-default states; static default-only evidence is never sufficient.
- Expose `plan`, `run --to`, `resume`, `verify --gate`, `status`, `explain-block`, and `package`
  through the existing CLI envelope and exit-code contract.
- Preserve Component Conformance as separate from Visual Acceptance, and preserve all existing v1/v2
  receipt and gate contracts.

## Scope of This Change

This is the P0 control skeleton plus the state-coverage contract. Evidence question-led retrieval,
direction candidate synthesis, and full runtime screenshot comparison remain follow-up changes. This
change must provide their stable inputs and extension points without pretending to implement them.

## Non-Goals

- Replacing existing gates, receipts, or external Browser/Builder/Evidence runners.
- Generating complete page families before an Anchor Screen gate exists.
- Selecting visual directions automatically without evidence and a lock.
- Installing dependencies, starting target runtimes, or writing target project code from the controller.
- Treating `catalog_unavailable` as `no_match`.

## Compatibility

Existing `state.json`, `events.jsonl`, v1 migrations, receipt lineage, and public command behavior
remain readable. New controller data is hash-bound and stored under the v2 state's extension boundary;
legacy state without controller data remains valid and reports the legacy lifecycle only.
