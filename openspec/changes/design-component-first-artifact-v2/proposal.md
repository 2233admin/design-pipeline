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

## Dependency

This change is design-only until `../decouple-component-first-gate/` is complete and its v1 goldens
are frozen.
