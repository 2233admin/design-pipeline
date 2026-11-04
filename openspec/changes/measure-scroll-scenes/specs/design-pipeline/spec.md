## ADDED Requirements

### Requirement: Scroll scenes are measured across their progress
A `scroll` interaction probe SHALL photograph its target at fixed points of its scroll progress on
each declared viewport, with motion allowed and with reduced motion. It SHALL fail
`scroll-never-started` when, with motion allowed, no point after 0 % differs from 0 %, and
`scroll-never-rests` when a held position still moves after the settle time. Each finding SHALL
carry a fix.

#### Scenario: Scene script never ran
- **WHEN** a pinned scene's driving script throws or is missing and the scene measures the same from 0 % to 100 %
- **THEN** `verify interaction` SHALL fail with `scroll-never-started` for the motion pass at that viewport and name the page errors it saw

#### Scenario: Scene keeps easing after scrolling stops
- **WHEN** a scene still moves more than 0.5 px, changes opacity by more than 0.01 or changes more than 0.5 % of its visible pixels during the rest window at a held position
- **THEN** `verify interaction` SHALL fail with `scroll-never-rests` for that viewport and pass

#### Scenario: Loop only under reduced motion
- **WHEN** a scene rests with motion allowed but runs an infinite animation under `prefers-reduced-motion: reduce`
- **THEN** only the reduced pass SHALL fail with `scroll-never-rests`

#### Scenario: Static reduced-motion substitute
- **WHEN** the reduced pass shows the same state at every progress point and rests
- **THEN** no finding SHALL be added for that pass

#### Scenario: Canvas scene on a scaled phone page
- **WHEN** a canvas scene is drawn from scroll progress on a phone page without a viewport meta tag
- **THEN** its canvas pixels SHALL be compared in screenshot pixels with a tolerance, so a drawn scene passes and a static canvas fails with `scroll-never-started`

#### Scenario: Probe outside its bounds
- **WHEN** a scroll probe has an unknown field, a value out of range or more than 120 s of planned waiting
- **THEN** validation SHALL reject it before the browser starts

#### Scenario: Native completion over a failed scroll row
- **WHEN** a scroll result row is missing a pass, or claims a pass for a motion pass with no changed point or a pass with a moving point
- **THEN** native completion SHALL refuse it
