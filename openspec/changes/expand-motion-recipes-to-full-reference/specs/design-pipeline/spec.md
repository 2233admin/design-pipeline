## ADDED Requirements

### Requirement: Full reference inventory is independently reconciled

The packaged recipe index SHALL enumerate every unique entry in the observed fully merged Motion Reference catalogue, retain source IDs/links and short factual metadata, and record category counts, advertised-versus-observed totals and text membership. It SHALL NOT fabricate rows, force advertised counts, redistribute upstream implementation/assets or treat written metadata as playback evidence.

#### Scenario: Text entries appear in the full listing

- **WHEN** the live catalogue merges general and text entries
- **THEN** the inventory SHALL identify overlap or subset membership using actual IDs
- **AND** category totals SHALL reconcile with unique observed entries without counting text twice.

#### Scenario: The source catalogue changes

- **WHEN** observed counts differ from published labels or a previously captured snapshot
- **THEN** the index SHALL retain the observed membership and explain the discrepancy
- **AND** unmatched entries SHALL NOT be silently dropped or replaced with synthetic IDs.

### Requirement: Every source entry maps to an executable mechanism variant

Every indexed entry SHALL map to an existing original recipe implementation and explicit supported variant parameters. Mechanisms may share an implementation only when parameters express their relevant differences. Principles/easing demos, all text categories and scene/film effects SHALL remain covered. Generic fallback mappings, name-only implementations and unsupported variants SHALL fail coverage validation.

#### Scenario: An entry only changes a supported parameter

- **WHEN** two source entries share an implemented mechanism and differ in direction, timing, easing, spacing or another supported control
- **THEN** the index MAY map them to the same recipe with distinct explicit parameter sets
- **AND** selecting either variant SHALL drive those parameters in the runnable study.

#### Scenario: Mechanisms differ structurally

- **WHEN** entries require different state, text segmentation, path, deformation, spatial or compositing behavior
- **THEN** their mappings SHALL select genuine implementation branches or separate recipes
- **AND** a generic translate/fade fallback SHALL NOT count as coverage.

#### Scenario: A mapping is missing or unsupported

- **WHEN** a source entry has no recipe, its referenced implementation is absent, or its parameters are unsupported
- **THEN** coverage validation SHALL report the exact source ID and unresolved behavior
- **AND** neither full coverage nor a successful preview SHALL be claimed.

### Requirement: Full recipe studies integrate existing discovery and routes

Original offline studies SHALL support exact indexed-variant selection, playback, interruption/reset and reduced motion. Existing catalogue doc/method search SHALL expose matching Chinese/English scenarios and valid local guides/previews through canonical project ownership, without altering component-only filtering. Guidance SHALL distinguish web/game UI/text/film adaptation and preserve existing primitives, tokens and evidence authority.

#### Scenario: A practitioner selects a catalogue variant

- **WHEN** a practitioner finds a source scenario through the existing documentation search or recipe index
- **THEN** its exact mapped variant SHALL be selectable in a locally runnable original study
- **AND** no external fetch, copied demo, film conversion or additional production runtime SHALL be required.

#### Scenario: A scene mechanism is reused in a film

- **WHEN** a scene or compositing study supplies a film technique
- **THEN** the guide SHALL describe adaptation into the existing scene/film renderer and temporal workflow
- **AND** browser study playback SHALL NOT claim production film-render verification or owner Visual Acceptance.

#### Scenario: A full coverage report is issued

- **WHEN** the implementation claims complete source coverage
- **THEN** inventory membership, executable mapping validity and exercised mechanism branches SHALL be reported separately
- **AND** existing catalogue hashes, receipt lineage and review records SHALL remain authoritative without another gate or schema.
