## ADDED Requirements

### Requirement: Playground interaction is resumable and purpose-bound

The pipeline SHALL provide a self-contained interactive Playground when a product-design,
frontend, scene/runtime, or design-QA problem is poorly suited to prose. It SHALL persist typed
controls, full-state presets, the accepted state, and a natural-language handoff, then bind the
accepted artifacts into the governed target selected by Playground kind.

#### Scenario: Interactive exploration is required

- **WHEN** the user explicitly requests a Playground or interactive state represents the problem
  better than text
- **THEN** build, selection, and integration gates SHALL pass in order
- **AND** downstream use SHALL remain blocked until the purpose-aware target cites the kind,
  Playground, state, and prompt hashes.

#### Scenario: Interactive exploration is not applicable

- **WHEN** a narrow, exact-target, fixed-spec, or direction-preview-sufficient change does not
  benefit from a Playground
- **THEN** the receipt SHALL record a supported waiver and rationale.

#### Scenario: A project defines a new Playground kind

- **WHEN** the built-in Blueprint defaults do not represent the interaction
- **THEN** the change MAY bind a contained Markdown Blueprint with required surface, state/output,
  and QA sections
- **AND** it SHALL select only a governed integration target
- **AND** changing the Blueprint SHALL invalidate prior browser verification.
