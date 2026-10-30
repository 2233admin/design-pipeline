## ADDED Requirements

### Requirement: Captures settle before measurement

Composition captures and `evidence refs` SHALL pause CSS and Web Animations, hide the text caret and wait for fonts before measuring, then repeat screenshots until two consecutive ones are identical, up to five attempts. The capture SHALL record whether it stabilised. An unstable capture SHALL still be written and SHALL be reported, not silently accepted.

#### Scenario: CSS animation is frozen

- **WHEN** a page runs an infinite CSS rotation and is captured once
- **THEN** the capture's consecutive screenshots SHALL be identical and it SHALL record `stabilization.stable: true`; separate captures may freeze at different phases

#### Scenario: Script-driven motion is reported

- **WHEN** a page moves an element every animation frame from its own script
- **THEN** the capture SHALL record `stable: false` with five attempts
- **AND** `verify composition` with that capture's elements SHALL report a `capture-unstable` warning

#### Scenario: Caret is hidden

- **WHEN** a focused text input is on the page
- **THEN** the caret SHALL NOT appear in the screenshot

#### Scenario: Seeked frames are unchanged

- **WHEN** `composition capture --seek 2` captures a HyperFrames composition
- **THEN** the screenshot SHALL show the timeline at 2 s and the capture SHALL record `stabilization`

#### Scenario: Refs from the earlier method

- **WHEN** `refs.json` was written before this change
- **THEN** it SHALL be treated as stale and recaptured, not compared with new fingerprints

#### Scenario: Older capture

- **WHEN** `verify composition` reads `elements.json` without `stabilization`
- **THEN** it SHALL add no stability finding
