# Directions

## Direction A: template picker

Select the closest existing DESIGN.md and copy it into the project.

- Fit: very fast.
- Risk: does not solve the user's problem; product requirements remain unmodeled.
- Decision: rejected.

## Direction B: unconstrained prose generator

Ask an agent to write DESIGN.md directly from one prompt.

- Fit: minimal tooling.
- Risk: generic output, no evidence trail, no resumable interaction state, and no scope control.
- Decision: rejected.

## Direction C: evidence-backed synthesis state machine

Normalize requirements and evidence, grill unresolved decisions, assess scope, hand oversized
efforts to Wayfinder, synthesize a project-specific design direction, validate DESIGN.md, and
continue through the normal implementation gates.

- Fit: solves requirements-driven generation while preserving the pipeline's headless contract.
- Risk: creative synthesis still belongs to the host agent, so deterministic scripts can validate
  and transition state but cannot replace design judgment.
- Decision: selected.

