## ADDED Requirements

### Requirement: Reduced motion is measured, not only declared

`composition capture --reduced-motion` SHALL capture the page under `prefers-reduced-motion: reduce` and `no-preference`, recording running animations and frame-to-frame pixel change one to two seconds after load. `verify composition --image <png> --reduced-motion <file>` SHALL reject an artifact whose target has changed and SHALL fail when the reduce pass still moves; opacity and colour changes SHALL be reported without failing.

#### Scenario: Infinite animation ignores the preference

- **WHEN** a page runs an infinite `transform` animation with no reduced-motion media query
- **THEN** `verify composition --reduced-motion` SHALL fail with `reduced-motion-still-moving` naming the animation

#### Scenario: Page honours the preference

- **WHEN** the same animation is disabled inside `@media (prefers-reduced-motion: reduce)`
- **THEN** the gate SHALL pass and the report SHALL list the animation as present only in the no-preference pass

#### Scenario: Canvas loop is caught by pixels

- **WHEN** a canvas redraws a moving shape every frame regardless of the preference
- **THEN** the reduce pass SHALL record pixel change above 0.5 % and the gate SHALL fail

#### Scenario: Cross-fade substitute

- **WHEN** under reduce the page only changes opacity
- **THEN** the gate SHALL pass and report the opacity animation

#### Scenario: Stale artifact

- **WHEN** the captured file changed after `reduced-motion.json` was written
- **THEN** `verify composition` SHALL reject the artifact as stale

#### Scenario: Loop period equal to a fixed sampling interval

- **WHEN** a canvas loop repeats every 250 ms regardless of the preference
- **THEN** the reduce pass SHALL still record pixel change above 0.5 %

#### Scenario: Static page

- **WHEN** neither pass has running animations or pixel change
- **THEN** the gate SHALL pass and state that no motion was measured
