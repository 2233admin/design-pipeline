# Proposal: Manifest-Driven Design Skill Layer

## Why

Expert design workflows need routable, bounded skills, but prose instructions cannot enforce write,
browser, dependency, or promotion authority and must never replace deterministic gates.

## What Changes

- Define machine-readable manifests, effect enforcement, version applicability, policy references,
  typed handoffs, and human gates.
- Start with `design.prototype`, `design.review`, `design.audit`, and `design.pick-library`.
- Keep prototype work isolated and require a selection receipt before any future promotion.

## Dependency

This change is design-only until Change A establishes gates and Change B establishes strict target,
snapshot, and promotion receipts.
