# OpenSpec Project

## Purpose

`design-pipeline` is a design-first AI workflow for frontend/UI work. It converts scattered design, UX, motion, animation, frontend, and QA skills into a governed pipeline with durable artifacts.

## Product Boundary

The project exists to improve design outcomes:

- visual quality
- UX clarity
- design systems
- motion design
- accessibility
- frontend implementation fidelity
- QA evidence
- agent-readable handoff

Engineering integrations are supporting surfaces, not the product itself.

## OpenSpec Workflow

Use OpenSpec-style changes for all meaningful modifications:

1. Create `openspec/changes/<change-id>/`.
2. Write `proposal.md`.
3. Write `design.md` when architecture, artifact shape, compatibility, or QA behavior changes.
4. Write `tasks.md`.
5. Add spec deltas under `openspec/changes/<change-id>/specs/<capability>/spec.md`.
6. Implement from tasks.
7. Archive completed changes and merge stable behavior into `openspec/specs/`.

