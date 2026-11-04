## ADDED Requirements

### Requirement: Seeked captures follow the HyperFrames clock

`composition capture --seek <t>` on a page whose DOM has a `data-composition-id` root SHALL seek through the HyperFrames runtime at the render frame rate, hiding clips outside their windows as the rendered frame does, and SHALL record the requested and applied time. A time at or past the duration SHALL fail with `SEEK_OUT_OF_RANGE`; a missing runtime with `TOOL_MISSING` naming the PNG-sequence render. Other pages SHALL seek their timelines.

#### Scenario: Clip outside its window

- **WHEN** a HyperFrames composition has a clip from 2 s to 3 s and is captured with `--seek 0.5` and `--seek 3.5`
- **THEN** neither capture SHALL show the clip, matching `hyperframes render` frames at those times
- **AND** the result SHALL record `seek.clock: hyperframes-runtime`

#### Scenario: Clip window end

- **WHEN** a clip runs from 0 s to 1 s and the capture seeks to 1 s
- **THEN** the clip SHALL NOT be shown

#### Scenario: Runtime missing

- **WHEN** `--seek` is given for a HyperFrames composition whose project has no `hyperframes` install, or a served HyperFrames page without the runtime
- **THEN** the CLI SHALL fail with error code `TOOL_MISSING`, write no screenshot, and name `hyperframes render --format png-sequence`

#### Scenario: Time snapped to the frame rate

- **WHEN** the root has `data-fps="24"` and the capture seeks to 3.99 s
- **THEN** the result SHALL record `atSec: 3.99`, `fps: 24` and `appliedSec` 95/24 s, the frame the render shows

#### Scenario: Time past the end

- **WHEN** a 4 s composition is captured with `--seek 4` or `--seek 11`
- **THEN** the CLI SHALL fail with error code `SEEK_OUT_OF_RANGE` naming the 4 s duration and the last frame time, and write no screenshot

#### Scenario: Mention outside the DOM

- **WHEN** a page without a `data-composition-id` element mentions the attribute in a comment or script string
- **THEN** the capture SHALL seek its timelines and record `seek.clock: timeline`

#### Scenario: Page without clips

- **WHEN** a page without a `data-composition-id` root registers a timeline and is captured with `--seek 1`
- **THEN** the timeline SHALL be at 1 s and the result SHALL record `seek.clock: timeline`

#### Scenario: Invalid seek time

- **WHEN** `--seek` is negative or not a number
- **THEN** the capture SHALL fail with a usage error
