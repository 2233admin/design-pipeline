## ADDED Requirements

### Requirement: Website-cloning completion preserves declared implementation authority

The pipeline SHALL require a machine-readable implementation-authority contract before a website-cloning evaluator can mark a run complete. The contract SHALL identify the normative target, enumerate allowed implementation differences and protected invariants, and declare the required interaction evidence environment.

#### Scenario: A local template and a content source have different authority

- **WHEN** the user designates one target as the component, topology, responsive, or motion authority and another target as a content source
- **THEN** the manifest SHALL identify the template target as implementation authority
- **AND** the evaluator SHALL block completion when that target is absent, demoted, or contradicted by verification evidence.

#### Scenario: Adaptive fidelity permits only named differences

- **WHEN** an implementation-authority contract allows copy, route, palette, or asset differences
- **THEN** verification SHALL enumerate observed differences and protected invariants
- **AND** the evaluator SHALL classify an unapproved difference or unverified invariant as a measured fidelity mismatch rather than silently accepting adaptive mode.

#### Scenario: Actual-browser interaction evidence is required

- **WHEN** the implementation-authority contract requires an actual-browser replay
- **THEN** verification SHALL record the interaction environment, replay result, and evidence paths
- **AND** headless, simulated-event-only, or missing replay evidence SHALL keep the run blocked.
