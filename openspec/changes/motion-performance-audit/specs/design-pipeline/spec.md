## ADDED Requirements

### Requirement: Interaction audit measures motion properties

The audit probe SHALL report `audit.motion-properties`, which always runs. It SHALL fail a timed `transition-property: all`, a timed transition or a held animation of a layout property, an infinite animation of `filter` or `backdrop-filter` `blur()`, and an infinite animation running on an element wholly outside the viewport when the page is read. Motion on or inside a loading indicator SHALL be exempt.

#### Scenario: A transition names every property

- **WHEN** an element, a hidden element or a `::before`/`::after` with content has `transition: all 200ms`
- **THEN** `audit.motion-properties` SHALL fail with the selector, the duration and a fix that names the properties to list
- **AND** `transition: opacity 200ms, transform 200ms` and `transition: all 0s` SHALL pass.

#### Scenario: A layout property is animated

- **WHEN** a transition names `height`, `margin` or another box size, inset, margin or padding property, or a keyframe or script animation the document holds animates one
- **THEN** `audit.motion-properties` SHALL fail naming the properties and the transform that replaces them
- **AND** a transition or animation of `transform` or `opacity` SHALL pass
- **AND** `max-height`, a border width and a grid track SHALL NOT be judged.

#### Scenario: A blur never ends

- **WHEN** an infinite animation has a `blur()` value in a `filter` or `backdrop-filter` keyframe
- **THEN** `audit.motion-properties` SHALL fail naming the animation
- **AND** a blur animated a finite number of times SHALL pass.

#### Scenario: A loop runs off screen

- **WHEN** an infinite animation is running on an element whose box lies wholly outside the viewport one second after load
- **THEN** `audit.motion-properties` SHALL fail with the distance from the viewport and a fix that pauses the loop out of view
- **AND** a paused loop, a loop an IntersectionObserver has paused and a loop skipped by `content-visibility: auto` SHALL pass
- **AND** a loop that leaves the viewport only after scrolling SHALL NOT be measured; review row `UC-43` covers it.

#### Scenario: Loading indicators are exempt

- **WHEN** the motion is on or inside `role="status"`, `role="progressbar"`, `role="alert"` or `aria-busy="true"`
- **THEN** `audit.motion-properties` SHALL count it as checked and SHALL NOT fail it.

#### Scenario: A page has no motion

- **WHEN** no element has a timed transition and the document holds no animation
- **THEN** `audit.motion-properties` SHALL report `not-applicable` with zero checked, never `passed`
- **AND** the audit row SHALL be able to pass.

#### Scenario: A result without the check is rejected

- **WHEN** an audit result reaches the summary without `audit.motion-properties`, or an audit pass reaches the page without the motion property lists
- **THEN** the summary or the page SHALL raise an error instead of passing the row.
