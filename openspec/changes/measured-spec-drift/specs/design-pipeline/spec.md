## ADDED Requirements

### Requirement: The built page is measured against DESIGN.md tokens

`reconciliation measure` SHALL record the computed colours and font families the built page paints, bound to the page digest and DESIGN.md hash. When that record exists, the reconciliation gate SHALL compare it with DESIGN.md front-matter tokens by CIEDE2000 and block on major drift that no reconciliation row names, each finding with a fix.

#### Scenario: A repainted colour is not reconciled

- **WHEN** the page paints a colour further than CIEDE2000 2 from every `colors` token over 1% or more of its text or painted area
- **AND** no Spec Reconciliation row's `Implemented` cell names that hex
- **THEN** `reconciliation check` SHALL report `blocked` with `reconciliation-measured-drift` and a fix.

#### Scenario: The drift is recorded

- **WHEN** a row's `Implemented` cell names the measured hex or family
- **THEN** the drift SHALL stay in `specDrift.measured` with `coveredBy` and SHALL NOT block.

#### Scenario: A token font never loads

- **WHEN** the page names a token family the browser cannot render over 1% or more of its text
- **THEN** the gate SHALL report `reconciliation-measured-drift` naming the fallback that renders.

#### Scenario: A stray value

- **WHEN** an off-token colour or family covers less than 1% of its kind, or a token is unused
- **THEN** the gate SHALL warn `reconciliation-measured-minor` and SHALL NOT block.

#### Scenario: The page or DESIGN.md changed after measuring

- **WHEN** the page digest or the DESIGN.md hash differs from the measurement
- **THEN** the gate SHALL report `reconciliation-measurement-stale` and SHALL NOT compare it.

#### Scenario: An empty baseline

- **WHEN** DESIGN.md front matter has no hex colour token or no `typography` `fontFamily`
- **THEN** `reconciliation measure` SHALL refuse with `BASELINE_EMPTY` and write nothing
- **AND** the gate SHALL report `reconciliation-baseline-empty`, never `ready` by comparison.

#### Scenario: Hidden content

- **WHEN** an element is `display:none`, `visibility:hidden` or has a zero-opacity ancestor
- **THEN** its colours and fonts SHALL NOT be measured.

#### Scenario: No measurement yet

- **WHEN** an applicable change's project has `index.html` and DESIGN.md tokens but no `built-styles.json`
- **THEN** the gate SHALL warn `reconciliation-unmeasured` with the measure command.
