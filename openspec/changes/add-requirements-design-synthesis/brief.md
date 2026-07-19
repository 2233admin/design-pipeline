# Brief: requirements-driven DESIGN.md synthesis

## Goal

Allow a user with a product request, optional reference websites, and optional template examples to
obtain a new, implementation-ready `DESIGN.md` and continue building with the normal pipeline.

## Audience

Developers and AI coding agents that need design direction but do not already have a product design
system or access to a paid design-generation service.

## Surfaces

- CLI initialization and state transitions.
- OpenSpec/design artifacts and headless handoff.
- Interactive grill and scope-surprise messages.
- Wayfinder host handoff for oversized work.
- Project-root `DESIGN.md` validation and implementation continuation.

## Constraints

- Local-first, deterministic, resumable, and network-optional.
- Existing website-cloning evidence may be reused with provenance.
- Template sources are inspiration evidence only.
- No new runtime dependency.
- A real issue tracker is required before a Wayfinder map is claimed.

## Acceptance Checks

- Requirements-only and hybrid reference inputs initialize atomically.
- Scope assessment deterministically selects direct synthesis or Wayfinder.
- Invalid transitions and evidence outside the allowed roots fail closed.
- A generated DESIGN.md must contain the official core sections and project-specific provenance.
- Successful validation moves the run to implementation without rewriting event history.
