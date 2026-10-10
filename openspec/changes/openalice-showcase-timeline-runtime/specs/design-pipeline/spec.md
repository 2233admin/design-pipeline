## ADDED Requirements

### Requirement: Ordered timeline structure

The showcase SHALL place its rail and ordered scene list as siblings inside a positioned timeline wrapper.

#### Scenario: Direct ordered-list children

- **WHEN** the showcase document is parsed and rendered
- **THEN** every direct child of `ol.scenes` SHALL be an `LI` scene
- **AND** the rail SHALL be a sibling of the list under `.timeline`.

### Requirement: Governed SVG progress

The showcase SHALL implement `reveal.trim-line` with an inline SVG path whose visible length is controlled by stroke-dashoffset and normalized between the first and last point centres.

#### Scenario: Smooth scroll end state

- **WHEN** a no-preference browser smoothly scrolls from the top to the document end
- **THEN** progress SHALL reach `1.0000` and all scenes SHALL be passed/reached.

### Requirement: Persistent and accessible states

The showcase SHALL keep reached scenes visible during back-scroll, settle all content under reduced motion, and keep the approval gate keyboard-operable.

#### Scenario: Back-scroll and reduced motion

- **WHEN** the reader returns to the top after reaching the end
- **THEN** all previously reached scenes SHALL remain reached
- **AND WHEN** reduced motion is enabled
- **THEN** progress SHALL be complete, reveals SHALL be visible, and document smooth scrolling SHALL be disabled.

#### Scenario: Keyboard approval controls

- **WHEN** the approval control receives Enter
- **THEN** the gate SHALL announce approval and disable approval
- **AND WHEN** the rejection control receives Space
- **THEN** the gate SHALL announce rejection and remain available.

### Requirement: Capture and QA evidence

The delivery SHALL include a fresh 1440×900 no-preference smooth-scroll WebM capture that decodes successfully, and repository QA SHALL pass.

#### Scenario: Fresh capture and repository QA

- **WHEN** the showcase is captured from a fresh 1440×900 no-preference browser state at scroll top
- **THEN** the WebM SHALL exercise smooth scrolling end-to-end and decode successfully
- **AND WHEN** `node scripts/qa.cjs` is run
- **THEN** repository QA SHALL exit successfully.
