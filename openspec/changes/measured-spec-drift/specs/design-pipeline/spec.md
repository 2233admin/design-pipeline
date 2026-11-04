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
- **AND** the colour is not loud
- **THEN** the gate SHALL warn `reconciliation-measured-minor` and SHALL NOT block.

#### Scenario: A loud colour on a small area

- **WHEN** a colour is more than CIEDE2000 10 from every token
- **AND** it is the page background, on an interactive element, or a surface or border on 3 or more elements
- **THEN** the gate SHALL report `reconciliation-measured-drift` whatever its share.

#### Scenario: A token family reached through the stack

- **WHEN** the first family named is unavailable and a token family later in the stack renders
- **THEN** the text SHALL be compared by the rendered family and SHALL NOT be drift.

#### Scenario: A row names a similar family

- **WHEN** a row's `Implemented` cell names `sans-serif` and the measured family is `serif`
- **THEN** the row SHALL NOT cover the drift; a font is covered only by a whole comma-separated entry.

#### Scenario: The page or DESIGN.md changed after measuring

- **WHEN** the page digest, the hash of any local file the page loaded (font, CSS) or the DESIGN.md hash differs from the measurement
- **THEN** the gate SHALL report `reconciliation-measurement-stale` and SHALL NOT compare it.

#### Scenario: An empty baseline

- **WHEN** DESIGN.md front matter has no hex colour token or no `typography` `fontFamily`
- **THEN** `reconciliation measure` SHALL refuse with `BASELINE_EMPTY` and write nothing
- **AND** the gate SHALL report `reconciliation-baseline-empty`, never `ready` by comparison.

#### Scenario: Hidden content

- **WHEN** an element is `display:none`, `visibility:hidden` or has a zero-opacity ancestor
- **THEN** its colours and fonts SHALL NOT be measured.

#### Scenario: Measuring a change without a reference

- **WHEN** `reconciliation measure` runs on a change with no reference
- **THEN** its output SHALL report `applicable: false` and a note that drift will only warn.

#### Scenario: What was not measured

- **WHEN** a measurement is recorded
- **THEN** it SHALL carry a `scope` listing what it does not measure, including canvas and image pixels, shadows, the dark scheme and per-glyph font fallback.

#### Scenario: No measurement yet

- **WHEN** an applicable change's project has `index.html` and DESIGN.md tokens but no `built-styles.json`
- **THEN** the gate SHALL warn `reconciliation-unmeasured` with the measure command.
