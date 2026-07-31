## ADDED Requirements

### Requirement: A reconstruction spec is written against a render, not a reading

For a `primary-target` reference, the pipeline SHALL produce the graybox capture before change
`design.md` is authored.

#### Scenario: A primary-target reconstruction begins

- **WHEN** reference role is `primary-target`
- **THEN** the graybox capture SHALL be produced before change `design.md`
- **AND** `design.md` SHALL cite the capture it was written against.

#### Scenario: A non-primary reference is used

- **WHEN** reference role is `constraint` or `inspiration`
- **THEN** the existing stage order SHALL be preserved
- **AND** a reconciliation pass SHALL follow the first render.

### Requirement: Specified and implemented values are reconciled

Every change with a reference SHALL record the difference between the values written in
`design.md` and the values the implementation actually used.

#### Scenario: The implementation departs from the spec

- **WHEN** implementation changes a value that `design.md` specified
- **THEN** `design.md` SHALL record the specified value, the implemented value, and an observed
  cause
- **AND** the recorded cause SHALL describe an observation rather than a preference.

#### Scenario: The spec survived unchanged

- **WHEN** no specified value changed during implementation
- **THEN** an empty reconciliation table SHALL be a valid result.

#### Scenario: Reconciliation is absent

- **WHEN** a change has a reference
- **AND** `design.md` contains no reconciliation section
- **THEN** the gate review SHALL report `blocked`.
