# Product film delta

## ADDED Requirements

### Requirement: score as code
The pipeline SHALL render a Strudel pattern for the storyboard's duration to a WAV file offline,
SHALL export the pattern's onsets and beat grid, and SHALL record the score as a commercially
usable asset only when no sample libraries are used.

#### Scenario: Storyboard uses a Strudel score
- **WHEN** the pipeline scores a storyboard of a declared duration
- **THEN** it SHALL render the Strudel pattern offline to WAV and export its onsets and beat grid
- **AND** it SHALL record the score as commercially usable only when no sample libraries are used

### Requirement: grid alignment
Hard and match cuts and downbeat, accent and impact cues SHALL be within one frame of a beat or
pattern onset, and each finding SHALL give the nearest grid time.

#### Scenario: Score event is off grid
- **WHEN** a hard cut, match cut, downbeat, accent, or impact cue is more than one frame from a beat or pattern onset
- **THEN** the pipeline SHALL report the finding and nearest grid time

### Requirement: license boundary
The package SHALL NOT include Strudel code. Strudel SHALL be installed into the user's project on
first use and invoked in a separate process.

#### Scenario: Strudel is first used
- **WHEN** Strudel is first used in a user's project
- **THEN** it SHALL be installed into that project and invoked in a separate process
- **AND** the package SHALL NOT include Strudel code
