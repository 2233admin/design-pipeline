## ADDED Requirements

### Requirement: Film render is checked for photosensitive flashes

`verify film-render` SHALL count general and red flashes on the decoded render using the WCAG 2.3.1 definitions and an area threshold of 25 % of a 10° field scaled to the render. Any one-second window with more than three flashes of either kind SHALL fail the gate. The report SHALL state the method and that it is not a certified analyzer result.

#### Scenario: Strobe fails

- **WHEN** a render alternates full-frame black and white five times per second for two seconds
- **THEN** the gate SHALL fail with `photosensitive-flash`, naming the window start time, the flash count and the kind `general`

#### Scenario: Red flicker fails

- **WHEN** a render alternates saturated red and dark grey four times per second over half the frame
- **THEN** the gate SHALL fail with `photosensitive-flash` of kind `red`

#### Scenario: Small flashing area passes

- **WHEN** only an area smaller than the scaled 10° field threshold flashes six times per second
- **THEN** the render SHALL NOT receive a `photosensitive-flash` finding

#### Scenario: Slow change passes

- **WHEN** a render fades from black to white over one second and back over one second
- **THEN** the render SHALL NOT receive a `photosensitive-flash` finding

#### Scenario: Passing render still reports

- **WHEN** a render has no failing window
- **THEN** the report SHALL include `photosensitivity` with the thresholds, the worst window and the statement that it is an automated approximation
