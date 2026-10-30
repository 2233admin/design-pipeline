## ADDED Requirements

### Requirement: Film render is compared with a declared reference

When a storyboard declares `referenceAnalysis` with a path and sha256, `verify film-render` SHALL compare the rendered video with that analysis and report cut alignment, per-shot motion and sound-event sync. A storyboard without `referenceAnalysis` SHALL produce the same result as before this change.

#### Scenario: Cut alignment

- **WHEN** the rendered video has cuts and the reference analysis lists cuts
- **THEN** the report SHALL pair each rendered cut with a reference cut, give the offset in frames, and list unpaired cuts on either side

#### Scenario: Shot count far from the reference

- **WHEN** the rendered cut count differs from the reference cut count
- **THEN** the report SHALL state both counts and list the unpaired cuts as findings with a `fix`

#### Scenario: Per-shot motion

- **WHEN** a shot's rendered motion differs from its reference motion by more than the declared ratio
- **THEN** the shot SHALL be listed with both values

#### Scenario: Sound-event sync

- **WHEN** a reference sound event has no rendered visual change within ±2 frames
- **THEN** the event SHALL be reported as unsynced with its time

#### Scenario: Frame pairs

- **WHEN** the comparison runs and the reference source named in the analysis matches its recorded sha256
- **THEN** the evidence directory SHALL contain a reference|render image pair and a difference image for every 0.5 s of the render and for every render frame within 2 frames of each paired cut
- **AND** the report SHALL list each pair's time and mean difference, with the five largest first
- **AND** no frame-pair score SHALL change the gate's exit code

#### Scenario: Frame pairs narrowed to one range

- **WHEN** `verify film-render` is given `--start`, `--end` and `--fps`
- **THEN** frame pairs SHALL cover only that range at that step
- **AND** cut alignment, per-shot motion and sound-event sync SHALL be unchanged

#### Scenario: Frame pairs cannot be measured

- **WHEN** the reference source is missing, its hash differs from the analysis, or its aspect ratio differs from the render
- **THEN** frame pairs SHALL be reported as unmeasured with the reason, and the other checks SHALL still run

#### Scenario: Too many frame pairs

- **WHEN** the requested times exceed 1200 pairs
- **THEN** the report SHALL name the skipped range and a narrower `--start/--end/--fps` command that covers it

#### Scenario: Analysis hash mismatch

- **WHEN** the file at `referenceAnalysis.path` does not match `sha256`
- **THEN** the gate SHALL fail with a hash-mismatch finding and SHALL NOT compare against that file

#### Scenario: Pending or incomplete analysis

- **WHEN** the reference analysis is pending or has no sound events
- **THEN** the affected checks SHALL be reported as unmeasured, not passed

### Requirement: Reference comparison reports structure without claiming acceptance

The comparison report SHALL state that it measures structural difference from the reference, and SHALL NOT report creative or visual acceptance. A passing comparison SHALL NOT clear the owner's review.

#### Scenario: Every comparison run

- **WHEN** a comparison completes with no findings
- **THEN** the report SHALL still state "structural difference from reference; not a creative or visual acceptance"
