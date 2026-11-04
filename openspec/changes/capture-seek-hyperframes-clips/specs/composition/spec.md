## ADDED Requirements

### Requirement: Seeked captures follow the HyperFrames clock

`composition capture --seek <t>` on a page with a `data-composition-id` root SHALL seek through the HyperFrames runtime the renderer uses, so clips outside their `data-start`/`data-duration` window are hidden as in the rendered frame. Without that runtime it SHALL refuse and name the PNG-sequence render. Other pages SHALL seek their registered timelines. The result SHALL record which clock seeked.

#### Scenario: Clip outside its window

- **WHEN** a HyperFrames composition has a clip from 2 s to 3 s and is captured with `--seek 0.5` and `--seek 3.5`
- **THEN** neither capture SHALL show the clip, matching `hyperframes render` frames at those times
- **AND** the result SHALL record `seek.clock: hyperframes-runtime`

#### Scenario: Clip window end

- **WHEN** a clip runs from 0 s to 1 s and the capture seeks to 1 s
- **THEN** the clip SHALL NOT be shown

#### Scenario: Runtime missing

- **WHEN** `--seek` is given for a HyperFrames composition whose project has no `hyperframes` install, or a served HyperFrames page without the runtime
- **THEN** the capture SHALL fail with `TOOL_MISSING`, write no screenshot, and name `hyperframes render --format png-sequence`

#### Scenario: Page without clips

- **WHEN** a page without a `data-composition-id` root registers a timeline and is captured with `--seek 1`
- **THEN** the timeline SHALL be at 1 s and the result SHALL record `seek.clock: timeline`

#### Scenario: Invalid seek time

- **WHEN** `--seek` is negative or not a number
- **THEN** the capture SHALL fail with a usage error
