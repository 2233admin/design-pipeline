# Proposal: measure oklch() tokens in the design-system package check

## Why

`design-system check` accepts `oklch()` as a colour token value, but its contrast measurement reads
only hex, `rgb()` and `hsl()`. A `contrast` pair with an `oklch()` colour fails with "both colours
must exist and be hex, rgb() or hsl()", so the package cannot become `ready`. The bundled guidance
recommends oklch for new systems (the vendored `better-colors/color-formats.md` and Good CSS), so a
project that follows it is blocked and has to write its tokens back in hex. Closes #357.

The brand design-system catalogue already converts `oklch()` to sRGB, and clamps a value outside
sRGB without saying so.

## What changes

- `design-system check` measures `oklch()` colours in contrast pairs, through the catalogue's
  existing conversion (`parseColor` in `brand-design-systems-core.cjs`); no second converter.
- An `oklch()` token value outside sRGB is reported as `out-of-gamut`, once per token with the
  themes it applies to; its pairs are measured on the colour clamped to sRGB. An alias of that
  token adds no second finding.
- `designmd inspect` lists catalogue colours that were clamped in `clampedTokens`, beside
  `omittedTokens`.
- The message for a colour space the check cannot measure (`lab()`, `lch()`, `oklab()`, `color()`)
  names the four it can.

## Impact

- Affected capability: `design-pipeline` (design-system package check, brand catalogue inspect).
- No new command, flag, gate or receipt schema. `out-of-gamut` uses the existing coded finding shape
  (`file`, `code`, `severity`, `message`, `fix`).
- A package with an `oklch()` token outside sRGB, which passed before when the token was in no
  contrast pair, now reports `invalid` until the chroma is lowered.
