## ADDED Requirements

### Requirement: Interaction audit measures reading

The audit probe SHALL fail declared running text (`declare.bodyText`) whose widest rendered line exceeds `thresholds.maxLineCh` (default 80ch of its font) or whose line-height is below `thresholds.minLineHeight` (default 1.3), and SHALL fail a heading more than one level below the heading before it. Both reading checks SHALL be optional; the heading check SHALL always run.

#### Scenario: Running text is too long and too tight

- **WHEN** declared running text sets lines wider than 80ch, or a line-height of 1.1 or `normal` below 1.3
- **THEN** `audit.line-length` or `audit.line-height` SHALL fail with the measured value and a fix
- **AND** a probe with `maxLineCh` or `minLineHeight` from DESIGN.md SHALL be judged against those values instead.

#### Scenario: Running text is not declared

- **WHEN** an audit probe has no `declare.bodyText`
- **THEN** both reading checks SHALL report `not-declared`, never passed and never failing
- **AND** a declared selector that matches nothing SHALL fail both.

#### Scenario: A heading level is skipped

- **WHEN** an `h4` or `aria-level="4"` heading follows an `h2`
- **THEN** `audit.heading-levels` SHALL fail at that heading with the previous heading as related element
- **AND** going back up a level, screen-reader-only headings and `hidden` headings SHALL NOT fail.

### Requirement: Interaction audit measures reduced motion

At each viewport the audit SHALL also load the page with `prefers-reduced-motion: reduce`, reading both loads one second after load. `audit.reduced-motion` SHALL fail content visible without the preference at that moment but hidden under it, and any running animation moving more than opacity or color, except on loading indicators. It SHALL always run.

#### Scenario: Content is lost under reduced motion

- **WHEN** content starts at opacity 0, hidden or translated off the page and the reduce query removes only its entrance animation
- **THEN** `audit.reduced-motion` SHALL fail once per hiding element with the reason and a fix that sets the end state under the query
- **AND** content hidden in both renderings, such as a closed menu, SHALL NOT fail.

#### Scenario: Motion keeps running under reduced motion

- **WHEN** an infinite or longer than one second transform animation still runs with the preference set
- **THEN** `audit.reduced-motion` SHALL fail naming the animation and its moving properties
- **AND** an opacity or color animation, or a reduce rendering that keeps only a fade, SHALL pass
- **AND** motion on or inside `role="status"`, `role="progressbar"`, `role="alert"` or `aria-busy="true"` SHALL pass, while an auto-advancing carousel SHALL fail.

#### Scenario: Script timers run the same in both renderings

- **WHEN** a preloader or toast is dismissed by a timer, or a rotator crossfades, the same way with or without the preference
- **THEN** `audit.reduced-motion` SHALL NOT fail it, because both loads are read at the same moment
- **AND** a finding's fix SHALL say to show the final state and skip the entrance, never to force the element visible.

### Requirement: Interaction audit measures state contrast

After the resting audit, the audit SHALL force `:hover` and `:focus-visible` on every control through the DevTools protocol. `audit.state-contrast` SHALL fail text whose colors a state changes below the text-contrast floors, and a focusable control without a `:focus-visible` indicator of at least `thresholds.contrastFocus` (default 3:1). It SHALL always run.

#### Scenario: A state drops contrast

- **WHEN** a button's hover text color or background color falls below 4.5:1
- **THEN** `audit.state-contrast` SHALL fail naming the state, the ratio and both colors
- **AND** text whose colors a state leaves unchanged (a hover that only filters, fades, lifts or scales) SHALL be judged only by `audit.text-contrast`.

#### Scenario: A state cannot be measured

- **WHEN** a state changes a color and also applies a filter or translucency
- **THEN** the coverage SHALL list it under `notMeasured` with the reason
- **AND** it SHALL NOT fail the check.

#### Scenario: Presses are not judged

- **WHEN** a link has the browser's default `:active` color
- **THEN** `audit.state-contrast` SHALL NOT report it, because `:active` is not forced.

#### Scenario: Focus is invisible or faint

- **WHEN** a control's `:focus-visible` removes the outline with no replacement, or draws a ring below 3:1 against what it sits on
- **THEN** `audit.state-contrast` SHALL fail with a fix naming an outline of sufficient contrast
- **AND** the browser's `outline-style: auto` ring, or a ring of at least `contrastFocus`, SHALL pass.

#### Scenario: A row without the state passes is incomplete

- **WHEN** an audit result reaches the summary without the measured state check
- **THEN** the summary SHALL reject the row as incomplete instead of passing it.
