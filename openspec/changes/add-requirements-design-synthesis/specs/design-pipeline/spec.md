# design-pipeline Specification Delta

## ADDED Requirements

### Requirement: DESIGN.md synthesis is requirement-driven

The pipeline SHALL synthesize a project-specific `DESIGN.md` from product intent, repository
constraints, and attributed evidence instead of copying a library template.

#### Scenario: A user provides a template example

- **WHEN** the template is registered as synthesis input
- **THEN** it SHALL have an inspiration-only evidence role and SHALL NOT override product
  requirements or the existing target system implicitly.

### Requirement: unresolved product decisions are interactive

The pipeline SHALL route material ambiguity through a grill-with-docs gate and persist its evidence.

#### Scenario: grill evidence is missing

- **WHEN** a run attempts scope assessment
- **THEN** the transition SHALL fail closed and preserve the current state.

### Requirement: oversized efforts use a real Wayfinder handoff

The pipeline SHALL calculate scope against an explicit budget and require a configured host map for
oversized efforts.

#### Scenario: scope exceeds the session budget

- **WHEN** the deterministic scope score exceeds the budget
- **THEN** the run SHALL record scope surprise, request Wayfinder, and SHALL NOT fabricate a local
  issue map.

### Requirement: synthesis resumes into implementation

The pipeline SHALL validate the generated `DESIGN.md` and transition the active change back into the
normal implementation phase.

#### Scenario: a valid project DESIGN.md is accepted

- **WHEN** its structure and provenance satisfy the synthesis gate
- **THEN** state, events, handoff, and tasks SHALL point to implementation as the next action.

### Requirement: change design and product design remain distinct

The pipeline SHALL keep lowercase change `design.md` and project-root `DESIGN.md` as separate linked
artifacts.

#### Scenario: both files exist

- **WHEN** another agent resumes the run
- **THEN** the handoff SHALL identify which file defines the current change and which defines
  reusable product identity.

