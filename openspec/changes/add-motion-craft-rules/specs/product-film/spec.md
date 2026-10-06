# Product film delta

## ADDED Requirements

### Requirement: one time source per property
The timeline gate SHALL fail two tweens that drive the same property of the same element at
overlapping times, and SHALL warn on linear easing for travelling elements.

#### Scenario: Two tweens overlap on one property
- **WHEN** two tweens drive the same property of the same element at overlapping times
- **THEN** the timeline gate SHALL fail

#### Scenario: Travelling element uses linear easing
- **WHEN** a travelling element uses linear easing
- **THEN** the timeline gate SHALL warn

### Requirement: declared endings and action arcs
When a storyboard declares `endState: rest`, the render SHALL end on its opening frame within
codec tolerance; when it declares `loop`, the last-to-first step SHALL NOT jump. Beats with
`arc: anticipate-act-settle` SHALL be warned when they start at full speed or stop without
settling.

#### Scenario: Storyboard declares rest ending
- **WHEN** a storyboard declares `endState: rest`
- **THEN** the render SHALL end on its opening frame within codec tolerance

#### Scenario: Storyboard declares loop ending
- **WHEN** a storyboard declares `endState: loop`
- **THEN** the last-to-first step SHALL NOT jump

#### Scenario: Action arc starts or stops abruptly
- **WHEN** a beat declares `arc: anticipate-act-settle` and starts at full speed or stops without settling
- **THEN** the gate SHALL warn

### Requirement: capture integrity
A film check SHALL NOT pass on a timeline captured before the current run when capture fails.

#### Scenario: Current timeline capture fails
- **WHEN** the timeline capture fails and only a capture from before the current run is available
- **THEN** the film check SHALL NOT pass
