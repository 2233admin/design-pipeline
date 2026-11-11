## ADDED Requirements

### Requirement: The package contrast check measures oklch colours

`design-system check` SHALL measure a declared contrast pair whose colours are hex, `rgb()`, `hsl()` or `oklch()`, converting `oklch()` with the brand catalogue's existing conversion. An `oklch()` token value outside sRGB SHALL be reported as `out-of-gamut` with its fix and SHALL NOT be clamped silently; its pairs SHALL be measured on the clamped colour.

#### Scenario: An oklch pair meets its minimum

- **WHEN** a contrast pair's text and ground are `oklch()` colours inside sRGB and the ratio meets the minimum in every theme
- **THEN** the check SHALL report the measured ratio for each theme
- **AND** the package SHALL be `ready` with exit code 0 when nothing else is wrong.

#### Scenario: An oklch pair is below its minimum

- **WHEN** a contrast pair of `oklch()` colours measures below its minimum in a theme
- **THEN** the check SHALL name the pair, the theme, the ratio and the minimum
- **AND** the command SHALL exit with code 2.

#### Scenario: The same colours written two ways

- **WHEN** a pair is written once as hex and once as the equivalent `oklch()` values
- **THEN** the two measured ratios SHALL differ by at most 0.05.

#### Scenario: An oklch token outside sRGB

- **WHEN** a colour token's own value is an `oklch()` colour outside the sRGB gamut
- **THEN** the check SHALL add one `out-of-gamut` finding for that token naming the value and the themes, with the fix
- **AND** a token that only aliases it SHALL add no further finding
- **AND** contrast pairs that use it SHALL still report a ratio, measured on the clamped colour.

#### Scenario: A colour space the check cannot measure

- **WHEN** a contrast pair uses `lab()`, `lch()`, `oklab()` or `color()`
- **THEN** the finding SHALL say the colours must be hex, `rgb()`, `hsl()` or `oklch()`.

### Requirement: Catalogue colours clamped to sRGB are listed

`designmd inspect` SHALL list in `clampedTokens` every catalogue colour token whose value, directly or through a `color-mix()` that uses it, lies outside sRGB and was written to hex as the clamped colour.

#### Scenario: A catalogue accent outside sRGB

- **WHEN** a brand system's `--accent` is an `oklch()` colour outside sRGB and `--accent-hover` mixes it
- **THEN** `clampedTokens` SHALL contain `--accent` and `--accent-hover`
- **AND** a system whose colours all fit sRGB SHALL report an empty `clampedTokens`.
