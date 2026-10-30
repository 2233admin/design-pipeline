## ADDED Requirements

### Requirement: Vector film rebuilds are deterministic, original and faithful to the reference's words and timing

In film replicate mode with a vector route and a declared reference analysis, `film check` SHALL fail when seeking the same time by different paths draws different frames, when the composition loads the reference or its frames, when declared reference text is not shown exactly, or when the storyboard duration differs from the reference by more than one frame.

#### Scenario: Animation loop outside the timeline

- **WHEN** a composition moves a shape from `requestAnimationFrame` using elapsed wall time
- **THEN** `film check` SHALL fail with `seek-nondeterministic` naming the sampled times

#### Scenario: Reference embedded

- **WHEN** the composition plays the reference video behind its shapes
- **THEN** `film check` SHALL fail with `reference-embedded` naming the element and file

#### Scenario: Declared asset allowed

- **WHEN** a raster texture is listed in `storyboard.rendering.assets` with a source other than the reference
- **THEN** it SHALL NOT produce a finding

#### Scenario: Misspelled word copied

- **WHEN** the reference shows "THNIK" and `storyboard.reference.text` declares "THINK" for 2-4 s, and the composition shows "THNIK"
- **THEN** `film check` SHALL fail with `text-mismatch`

#### Scenario: Compressed timing

- **WHEN** the reference lasts 15.1 s and the storyboard declares 12 s
- **THEN** `film check` SHALL fail with `duration-compressed`

#### Scenario: Palette

- **WHEN** `reference analyze-video --palette` runs on a clip with four flat colours
- **THEN** the study SHALL list the four colours with their shares
