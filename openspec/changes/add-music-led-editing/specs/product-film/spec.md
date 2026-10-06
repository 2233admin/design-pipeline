# Product film delta

## ADDED Requirements

### Requirement: music analysis
The pipeline SHALL derive a beat grid, downbeats and per-bar energy from a music file, or use a
score grid when one exists.

#### Scenario: Music file has no score grid
- **WHEN** a music file is provided without a score grid
- **THEN** the pipeline SHALL derive a beat grid, downbeats, and per-bar energy from the file

#### Scenario: Music file has a score grid
- **WHEN** a score grid exists for the music
- **THEN** the pipeline MAY use that score grid instead of deriving the beat grid, downbeats, and per-bar energy from the file

### Requirement: edit on the grid
Every cut in an edit SHALL fall within one frame of a beat. The edit check SHALL report timeline
gaps and overlaps, off-grid cuts, non-commercial footage in a commercial edit and reads outside a
source, and SHALL warn on shots under one beat or over sixteen, monotone shot lengths, reused
footage ranges, extreme speed and cuts that are not visible in the render.

#### Scenario: Cut is off grid
- **WHEN** a cut falls more than one frame from a beat
- **THEN** the edit check SHALL report it

#### Scenario: Edit contains a delivery defect
- **WHEN** the timeline has gaps or overlaps, footage is non-commercial in a commercial edit, or a read is outside its source
- **THEN** the edit check SHALL report each defect

#### Scenario: Edit has a warning condition
- **WHEN** a shot is under one beat or over sixteen beats, shot lengths are monotone, footage ranges are reused, speed is extreme, or a cut is not visible in the render
- **THEN** the edit check SHALL warn

### Requirement: shared delivery gates
The rendered edit SHALL be checked by the render, audio and composition gates.

#### Scenario: Rendered edit is checked
- **WHEN** an edit is rendered
- **THEN** the render, audio, and composition gates SHALL check the rendered edit
