## ADDED Requirements

### Requirement: Owner reviews a replicate film against its reference on one clock

For a film storyboard that declares `referenceAnalysis`, the pipeline SHALL provide a compare page that plays the bound reference source and the draft render on one clock, and a side-by-side proof video. In replicate mode the owner review SHALL NOT be asked until a compare page bound to the current reference, analysis and draft exists. Neither the page nor the proof video SHALL report acceptance or a score.

#### Scenario: Compare page written

- **WHEN** `film compare` runs on a project whose storyboard declares `referenceAnalysis` and whose reference source matches its recorded sha256
- **THEN** it SHALL write `evidence/compare/index.html`, which opens from disk without a server, and `evidence/compare/compare.json` with the sha256 of the reference source, the analysis, the draft and the marker report (null when absent)

#### Scenario: Frame rate missing or mismatched

- **WHEN** `storyboard.fps` is absent, or the draft render has a variable frame rate or an encoded rate different from `storyboard.fps`
- **THEN** `film compare` SHALL exit 1 with a fix naming the field or the re-render, and SHALL NOT write a page

#### Scenario: Frame stepping stays in sync

- **WHEN** the owner steps one frame forward or back on the compare page
- **THEN** both videos SHALL show frame `n` of the storyboard frame rate and the page SHALL show `n` and its time

#### Scenario: Different aspect ratios

- **WHEN** the reference and the render differ in aspect ratio by more than 1 %
- **THEN** overlay and wipe SHALL be disabled with the reason shown and the videos SHALL play side by side

#### Scenario: Markers missing

- **WHEN** no `verify film-render` comparison report exists for the draft
- **THEN** the page SHALL still play and SHALL name the command that produces cut and worst-pair markers

#### Scenario: No reference analysis

- **WHEN** `film compare` or `film proof` runs on a storyboard without `referenceAnalysis`
- **THEN** it SHALL exit 1 with a fix naming the field

#### Scenario: Proof video

- **WHEN** `film proof` runs
- **THEN** it SHALL write `renders/side-by-side.mp4` with the reference left and the render right, the render's length and audio, the shorter input holding its last frame, and a sidecar recording both input hashes

#### Scenario: Review waits for a current page

- **WHEN** a replicate film with `referenceAnalysis` reaches the owner review and the compare page is missing or any of its recorded hashes differs from the current files
- **THEN** `next` SHALL return a `run` step for `film compare` instead of the review ask

#### Scenario: Review ask names the page

- **WHEN** the compare page is current
- **THEN** the review ask SHALL name the compare page and SHALL say that frame citations from the page may be quoted in the verdict

#### Scenario: Proof video stale or missing

- **WHEN** the compare page is current and the proof sidecar is missing or its hashes differ from the current reference or draft
- **THEN** the review ask SHALL NOT name the proof file and SHALL give the `film proof` command instead
