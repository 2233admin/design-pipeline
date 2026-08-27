# Proposal: Manifest-Driven Design Skill Layer

## Why

Expert design workflows need routable, bounded skills, but prose instructions cannot enforce write,
browser, dependency, or promotion authority and must never replace deterministic gates.

## What Changes

- Define machine-readable manifests, effect enforcement, version applicability, policy references,
  typed handoffs, and human gates.
- Start with `design.prototype`, `design.review`, `design.audit`, and `design.pick-library`.
- Keep prototype work isolated and require a selection receipt before any future promotion.

## Implementation Status

Implemented in `skill/scripts/design-skill-core.cjs` and exposed through the `design-skill` CLI.
The layer consumes Change B receipts and never performs a production target write itself.

## Dependency

Change A is the archived v1 Gate implementation and Change B is the completed
`design-component-first-artifact-v2` receipt contract.
