## ADDED Requirements

### Requirement: Reference video analysis can segment by detected shot

`reference analyze-video --shots` SHALL segment the sampled interval at detected cuts, merging cuts closer than the minimum shot length. Each segment SHALL be marked `detected-shot`, carry its pixel-change summary and, when the source has sound, its onsets and silences. Detected shots SHALL remain inspection candidates and SHALL NOT fill the confirmed shot inventory. Without `--shots` the output SHALL be unchanged.

#### Scenario: Three hard cuts become three shots

- **WHEN** `reference analyze-video --shots` runs on a source with three solid-colour shots
- **THEN** the report SHALL have three segments with `reason: "detected-shot"` whose bounds fall within one source frame of the cuts
- **AND** `report.shots` SHALL stay absent.

#### Scenario: Sound is placed inside its shot

- **WHEN** the source has a tone starting inside the second shot and a silence inside the third
- **THEN** the second shot SHALL list an onset within 0.05 s of the tone start, with a relative strength
- **AND** the third shot SHALL list the silence interval.

#### Scenario: Flashes shorter than the minimum shot

- **WHEN** detected cuts are closer together than `--min-shot`
- **THEN** they SHALL merge into the earlier shot instead of producing shots shorter than the minimum.

#### Scenario: Window mode is unchanged

- **WHEN** the same source is analysed without `--shots`
- **THEN** segments SHALL remain 2 s `ordered-window` segments and the report SHALL carry no shot-mode fields.

#### Scenario: Invalid detection settings

- **WHEN** `--cut-threshold` is outside (0, 1) or `--min-shot` is not positive
- **THEN** the command SHALL exit 1 with a contract error and write no output.

### Requirement: Shot analysis spends its frame budget per shot

In shot mode every shot SHALL first receive its first, middle and last decoded frames, middles before ends when the budget is short. A shot left with fewer than three distinct sampled frames SHALL be named in the sampling limitations with a rerun that covers it; it SHALL NOT be omitted silently. The overview SHALL show each shot's middle frame labelled with its id and range.

#### Scenario: Enough budget

- **WHEN** the frame budget is at least three frames per shot
- **THEN** every shot SHALL have at least three distinct sampled frames and the overview SHALL show one labelled frame per shot.

#### Scenario: Budget too small

- **WHEN** the frame budget is smaller than three frames per shot
- **THEN** every shot SHALL still get its middle frame while the budget allows
- **AND** `sampling.budgetLimited` SHALL be true with a limitation naming each short shot and the rerun.
