# Proposal: Component-First Artifact V2

## Why

Aggregate v1 can establish deterministic component conformance, but cannot prove that stack,
components, page usage, and browser evidence describe the same target snapshot.

## What Changes

- Bind every result to target id/root/kind, entrypoints, routes, snapshot digest, and policy digest.
- Split stack/runtime, component-contract, Playground, page-use, and browser evidence into chained
  v2 receipts with freshness invalidation.
- Define explicit prototype-to-production promotion evidence.
- Separate Component Conformance Gate from Visual Acceptance Gate while retaining a compatibility
  aggregate.

## Implementation Status

Implemented in `skill/scripts/component-first-v2-core.cjs` and exposed through the
`component-first-v2` CLI. The implementation consumes the v1 aggregate and keeps the v1 Gate
unchanged.

## Dependency

The dependency is satisfied by the archived `../archive/2026-08-23-decouple-component-first-gate/`
change and its frozen v1 goldens.
