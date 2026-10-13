## ADDED Requirements

### Requirement: Composition structure is enumerated per region

The pipeline SHALL require a per-region structural breakdown for every change with a visual
reference, authored independently for each region.

#### Scenario: A reference contains repeated regions

- **WHEN** a reference contains two or more comparable regions
- **THEN** `reference.md` SHALL record rows, columns, left-to-right contents, and what each region
  breaks from
- **AND** each region SHALL be described from the reference rather than by reference to another
  region.

#### Scenario: Uniformity is claimed

- **WHEN** a per-region breakdown is recorded
- **THEN** it SHALL answer explicitly whether every region shares the same row and column structure
- **AND** any exception SHALL be named in the same table as the regions it breaks from.

#### Scenario: The uniformity claim contradicts the regions

- **WHEN** `composition.uniform` is `true`
- **AND** any region records a non-empty `breaksFrom`, or regions differ in rows or columns
- **THEN** reference validation SHALL fail with a composition contradiction.

#### Scenario: A structural claim is compared to a render

- **WHEN** a graybox capture exists for the change
- **THEN** the graybox comparison SHALL address the recorded region ids by name.
