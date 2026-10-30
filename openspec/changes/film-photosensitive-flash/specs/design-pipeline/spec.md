## ADDED Requirements

### Requirement: Film render is checked for photosensitive flashes

`verify film-render` SHALL count general and red flashes on the decoded render using the WCAG 2.3.1 definitions and an area threshold of 25 % of a 10° field scaled to the render. Any one-second window with more than three flashes of either kind SHALL fail the gate. The report SHALL state the method and that it is not a certified analyzer result.

#### Scenario: Strobe fails

- **WHEN** a render shows five complete black-white-black flashes per second (ten transitions) for two seconds
- **THEN** the gate SHALL fail with `photosensitive-flash`, naming the window start time, the flash count and the kind `general`

#### Scenario: Red flicker fails

- **WHEN** a render shows four complete saturated-red to dark-grey flashes per second over half the frame
- **THEN** the gate SHALL fail with `photosensitive-flash` listing kind `red`; general and red flashes are counted independently and the finding lists every kind that exceeds the limit

#### Scenario: Small flashing area passes

- **WHEN** only an area smaller than the scaled 10° field threshold flashes six times per second
- **THEN** the render SHALL NOT receive a `photosensitive-flash` finding

#### Scenario: Slow change passes

- **WHEN** a render fades from black to white over one second and back over one second
- **THEN** the render SHALL NOT receive a `photosensitive-flash` finding

#### Scenario: One-frame flashes at high frame rate

- **WHEN** a 120 fps render has single-frame full-frame white flashes five times in one second
- **THEN** the gate SHALL fail with `photosensitive-flash`

#### Scenario: Held frames between transitions

- **WHEN** a render goes white, holds for three frames, returns to black, and repeats four times in one second
- **THEN** each white-and-back SHALL count as one flash and the gate SHALL fail

#### Scenario: Passing render still reports

- **WHEN** a render has no failing window
- **THEN** the report SHALL include `photosensitivity` with the thresholds, the worst window and the statement that it is an automated approximation
