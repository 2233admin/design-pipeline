## MODIFIED Requirements

### Requirement: text and layout checks
When element data is supplied, the pipeline SHALL fail text below WCAG AA contrast against a known
opaque background and text outside the viewport, and SHALL warn on near-miss edge alignment, flat
type hierarchy and excessive distinct text sizes. When a text's background is an image, gradient
or texture, `composition capture` SHALL sample the screenshot pixels under the text box with all
text hidden, and the same `text-contrast` check SHALL judge the text against the worst 5% of those
pixels; text whose background is unknown and unsampled SHALL be reported as
`contrast-unmeasured`, never skipped.

#### Scenario: Text fails a measurable constraint
- **WHEN** supplied element data shows text below WCAG AA contrast against a known opaque background or text outside the viewport
- **THEN** the pipeline SHALL fail with a concrete fix

#### Scenario: Text on a textured ground
- **WHEN** captured text sits on a background image or gradient and the 5th percentile of its contrast against the ground pixels under it (text hidden) is below 4.5:1, or 3:1 for large text
- **THEN** the pipeline SHALL fail with `text-contrast`, stating the worst-5% and mean contrast, and a fix that names lowering the texture's strength or backing the text

#### Scenario: Ground not sampled
- **WHEN** element data has text with an unknown background and no ground sample
- **THEN** the pipeline SHALL warn `contrast-unmeasured` with the recapture fix

#### Scenario: Layout has a near miss
- **WHEN** supplied element data shows near-miss edge alignment, flat type hierarchy, or excessive distinct text sizes
- **THEN** the pipeline SHALL warn with a concrete fix
