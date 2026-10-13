# Composition delta

## ADDED Requirements

### Requirement: frame measurement
The pipeline SHALL measure any rendered PNG frame, SHALL fail frames that are blank or have no
luminance contrast, and SHALL warn on weak subject separation, off-balance visual weight, empty
third bands, competing focal masses, clutter, saturated hue sprawl and edge crowding.

#### Scenario: Frame is blank or has no contrast
- **WHEN** a rendered PNG frame is blank or has no luminance contrast
- **THEN** the pipeline SHALL fail the frame with a concrete fix

#### Scenario: Frame has a composition weakness
- **WHEN** a frame has weak subject separation, off-balance visual weight, empty third bands, competing focal masses, clutter, saturated hue sprawl, or edge crowding
- **THEN** the pipeline SHALL warn with a concrete fix

### Requirement: text and layout checks
When element data is supplied, the pipeline SHALL fail text below WCAG AA contrast against a known
opaque background and text outside the viewport, and SHALL warn on near-miss edge alignment, flat
type hierarchy and excessive distinct text sizes.

#### Scenario: Text fails a measurable constraint
- **WHEN** supplied element data shows text below WCAG AA contrast against a known opaque background or text outside the viewport
- **THEN** the pipeline SHALL fail with a concrete fix

#### Scenario: Layout has a near miss
- **WHEN** supplied element data shows near-miss edge alignment, flat type hierarchy, or excessive distinct text sizes
- **THEN** the pipeline SHALL warn with a concrete fix

### Requirement: actionable and bounded
Every finding SHALL carry a concrete fix. Warnings MAY be allowed per run. The result SHALL NOT
report creative acceptance.

#### Scenario: Findings and run policy are returned
- **WHEN** the composition gate returns findings
- **THEN** every finding SHALL include a concrete fix, warnings MAY be allowed per run, and the result SHALL NOT report creative acceptance
