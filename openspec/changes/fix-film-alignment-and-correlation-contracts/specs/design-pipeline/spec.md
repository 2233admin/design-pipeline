## MODIFIED Requirements

### Requirement: Tracker picture and sound share one camera and event source

The template's tracks module SHALL be the only source of shot timing, typed glyph cells, tracker boxes, lock events and per-frame camera. The flat pass, lens uniforms, overlay, storyboard and sound SHALL read it. Tracker labels SHALL state the real projected output pixel of their box, computed with the lens camera, and a config whose targets leave the frame or whose lines leave the screen SHALL be refused.

#### Scenario: A label is checked against the filmed glyph

- **WHEN** the self-test films a target glyph through the camera stage with and without that glyph, before LED quantization and artistic lens effects
- **THEN** the measured glyph centre SHALL lie within the declared 3 px tolerance of the projected glyph ink centre, and filmed box-centre markers SHALL lie within 1 px of their labelled projection
- **AND** a larger camera-stage error SHALL fail the self-test, and no camera-projection alignment SHALL be claimed for the film
- **AND** LED sampling and full-lens glyph centroid shifts SHALL be measured and reported separately, not treated as full-lens alignment acceptance; full-lens pixels remain subject to the determinism check.

#### Scenario: A config breaks the camera or screen invariants

- **WHEN** an edited config puts a tracked target outside the safe frame area or a typed line past the screen edge
- **THEN** the build SHALL fail with the shot and frame and write no storyboard, composition or sound.

#### Scenario: The port is compared with the reference

- **WHEN** the default config is evaluated
- **THEN** its focus, camera and projected focus for every frame SHALL match the vendored reference fixtures within their print precision and the declared single-precision error.

### Requirement: Planned hard cuts are found regardless of brightness

The render gate SHALL count a planned hard or match cut that the scene threshold and the one-step pixel detector miss when, within one frame of the boundary, a frame shares less than half its structure with the frame before (r² < 0.5) and the step before is at least four times calmer. It SHALL NOT count a dissolve or a camera that ramps into the boundary.

#### Scenario: A cut between two dark, grainy, moving shots is planned

- **WHEN** the scene score at the boundary stays under 0.3 and grain keeps every 10 fps pixel step busy
- **THEN** the render gate SHALL report the cut in `cuts.structureCutsSec` and SHALL NOT count it as missed.

#### Scenario: A planned cut renders as a dissolve or a whip

- **WHEN** the change at a planned boundary builds up over several frames, as in a 0.3 s dissolve or a camera that accelerates into a match cut
- **THEN** the cut SHALL stay missed and `planned-cuts-missing` SHALL apply as before.

#### Scenario: A contrast inversion retains the frame structure

- **WHEN** consecutive frames retain their structure with negative correlation whose squared value is at least 0.5
- **THEN** the structure-cut detector SHALL NOT count the step as a planned cut, even when the preceding step is calm.

#### Scenario: Correlation lies at the strict boundary or just inside it

- **WHEN** the consecutive-frame correlation is exactly either `sqrt(0.5)` or `-sqrt(0.5)`
- **THEN** the structural detector SHALL NOT count that step because the squared correlation equals 0.5
- **AND** only a correlation strictly between those two bounds SHALL satisfy the structural-change criterion; timing, preceding-step adjacency and at-least-four-times calmness SHALL still be required.
