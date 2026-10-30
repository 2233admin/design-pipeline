## ADDED Requirements

### Requirement: Composition comparison separates perceptual change from rasterisation noise

`composition compare` SHALL report, beside its existing metrics, an anti-aliasing-aware changed fraction, the count of anti-aliased pixels and a mean SSIM, and SHALL write a perceptual difference image. The existing metrics and images SHALL be unchanged. No metric SHALL be presented as a pass, fail or quality score.

#### Scenario: Same text, different rasterisation

- **WHEN** the reference and candidate render the same text with different anti-aliasing
- **THEN** `perceptualChangedFraction` SHALL be lower than `changedFraction`, the difference SHALL be counted in `antialiasedPixels`, and `ssim` SHALL be above 0.95

#### Scenario: Moved block

- **WHEN** a solid block is moved 40 px in the candidate
- **THEN** `perceptualChangedFraction` SHALL equal the union of the vacated and destination pixels divided by the image area, and `difference-perceptual.png` SHALL mark them red

#### Scenario: Identical images

- **WHEN** both images are identical
- **THEN** both changed fractions SHALL be 0 and `ssim` SHALL be 1

#### Scenario: Existing consumers

- **WHEN** a caller reads `metrics.changedFraction` or `difference.png`
- **THEN** their values SHALL be the same as before this change
