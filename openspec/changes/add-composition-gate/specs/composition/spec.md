# Composition delta

## Requirement: frame measurement
The pipeline SHALL measure any rendered PNG frame, SHALL fail frames that are blank or have no
luminance contrast, and SHALL warn on weak subject separation, off-balance visual weight, empty
third bands, competing focal masses, clutter, saturated hue sprawl and edge crowding.

## Requirement: text and layout checks
When element data is supplied, the pipeline SHALL fail text below WCAG AA contrast against a known
opaque background and text outside the viewport, and SHALL warn on near-miss edge alignment, flat
type hierarchy and excessive distinct text sizes.

## Requirement: actionable and bounded
Every finding SHALL carry a concrete fix. Warnings MAY be allowed per run. The result SHALL NOT
report creative acceptance.
