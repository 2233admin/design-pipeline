# OpenSpec Project

## Purpose

`design-pipeline` raises an agent's overall art and design literacy — visual direction, composition, UI, motion, animation and promotional film — and carries that capability in code so that any capable model, not only the strongest one, can produce work that meets the user's need. Frontend/UI work remains its first surface. It converts scattered design, UX, motion, animation, frontend, and QA skills into a governed pipeline with durable artifacts.

## Capability Model

Creative judgment is transferred to agents through three code layers, not through prose alone:

- **Gates** reject known failure shapes deterministically and give each finding a concrete fix.
- **Templates** encode proven structures (choreography, composition, tokens) as parameterized code an agent selects and fills.
- **Evals** measure across models, with the same briefs and gates, whether a change actually raises output quality.

Gates, templates and evals never grant creative acceptance. Creative review and user acceptance remain separate, recorded states.

## Product Boundary

The project exists to improve design outcomes:

- visual quality
- UX clarity
- design systems
- motion design
- animation and promotional film
- composition and art direction
- accessibility
- frontend implementation fidelity
- QA evidence
- agent-readable handoff
- model-independent output quality

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

