## ADDED Requirements

### Requirement: Film storyboards can carry a cut list

`film-storyboard.v1` SHALL accept an optional `cuts` array. Each cut SHALL have a unique `no`, `startSec`, `endSec`, `picture` and `transition`, and MAY have `size`, `camera`, `action`, `dialogue`, `text`, `sound`, `energy`, `note`, `ref` and `thumb`. `size`, `camera`, `transition` and `energy` SHALL come from the closed cut-sheet vocabulary; a cut without `size` or `camera` is undescribed. Boards without `cuts` SHALL validate and check as before.

#### Scenario: Valid cut list

- **WHEN** a board has cuts that cover 0 to `durationSec` without gaps, each inside one beat
- **THEN** `film check` SHALL report no cut finding.

#### Scenario: Gap or overlap

- **WHEN** a cut starts more than one frame after the previous cut ends, or before it
- **THEN** `film check` SHALL fail with a `cut-gap` or `cut-overlap` finding naming both cut numbers.

#### Scenario: Cut crosses a beat

- **WHEN** a cut starts in one beat and ends in the next
- **THEN** `film check` SHALL fail with `cut-beat-span` naming the cut and both beats.

#### Scenario: Unknown vocabulary

- **WHEN** a cut uses `size`, `camera` or `transition` outside the vocabulary
- **THEN** `film check` SHALL fail with `cut-vocabulary` naming the field, the value and the allowed list.

#### Scenario: Undescribed cut

- **WHEN** a cut has an empty or placeholder `picture`, no `size` or no `camera`
- **THEN** `film check` SHALL fail with `cut-undescribed`.

### Requirement: Cuts render as a cut sheet

`film cut-sheet --project-root <dir>` SHALL write a printable cut sheet with one row per cut in the column order CUT, 画, アクション, セリフ・文字, 音, 秒+コマ, adding a thumbnail column when any cut has `thumb`. Time SHALL show seconds plus frames at the board fps. The command SHALL NOT modify the storyboard.

#### Scenario: Sheet from cuts

- **WHEN** the command runs on a board with 3 cuts
- **THEN** the sheet SHALL contain 3 rows in cut order and the time of a 3.5 s cut at 24 fps SHALL read `3+12`.

#### Scenario: No cuts

- **WHEN** the board has no `cuts`
- **THEN** the command SHALL exit 1 with a contract error that names `--from-reference`.

### Requirement: Cuts can be seeded from a reference shot analysis

`film cut-sheet --from-reference <analysis-dir>` SHALL create one cut per detected shot of a `--shots` analysis, carrying `startSec`, `endSec`, `ref`, `thumb`, `energy`, a motion note and the sound events, and SHALL copy the analysis report into the project as `referenceCuts`. Descriptive fields SHALL stay empty, and the command SHALL refuse to overwrite existing `cuts`.

#### Scenario: Seed from three shots

- **WHEN** the analysis has three detected shots and the board has no cuts
- **THEN** the board SHALL gain three cuts whose bounds equal the shots and whose `picture` is empty.

#### Scenario: Existing cuts

- **WHEN** the board already has cuts
- **THEN** the command SHALL exit 1 and leave the board unchanged.

#### Scenario: Not a shot analysis

- **WHEN** the analysis has no `detected-shot` segments
- **THEN** the command SHALL exit 1 and name `reference analyze-video --shots`.

### Requirement: Reference parity is reported apart from structure

When a board names `referenceCuts`, `film check` SHALL compare each cut with its reference shot and report cut alignment, motion class and sound onset timing, with reference shots lacking a cut and cuts lacking a reference shot. Parity findings SHALL be warnings under `parity` unless `parityStrict` is true. Parity SHALL NOT claim visual or creative acceptance.

#### Scenario: Aligned remake

- **WHEN** every cut starts within 2 frames of its reference shot and motion classes match
- **THEN** `parity` SHALL report zero findings.

#### Scenario: Missing and extra cuts

- **WHEN** the reference has 90 shots and the board has 88 cuts with `ref` set to 88 distinct shots
- **THEN** `parity` SHALL list the 2 reference shots with no cut.

#### Scenario: Drifted cut

- **WHEN** a cut starts 0.5 s from its reference shot
- **THEN** `parity` SHALL report `parity-cut-drift` with both times, as a warning unless `parityStrict` is true.

#### Scenario: Reference changed

- **WHEN** the analysis named by `referenceCuts` changes after a recorded pass
- **THEN** the recorded storyboard pass SHALL be invalidated.
