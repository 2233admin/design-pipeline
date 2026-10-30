## Why

In replicate mode the reference step has the agent write `reference.md` from looking at a screenshot or a
capture: "the observed structure, layout rhythm, type scale, colour, motion parameters". The extract step then
writes `DESIGN.md` and `MOTION.md` from that text. Nothing measures the live page, so token values are the
agent's estimates: a near-miss grey, a type scale rounded to familiar numbers, a 300 ms ease that was really
a 450 ms custom cubic-bezier. `foundation check` validates the format, not whether the values came from the
reference, so the owner confirms an extraction whose numbers no one measured.

Manavarya09/design-extract (designlang, MIT, v13, reviewed at `d2c28da`) measures this from computed styles:
colours with role, area and usage counts, type and spacing scales, radii, shadows, CSS variables, breakpoints,
and CSS and runtime motion. Its extractors are pure functions over collected styles; only its crawler is tied to
Playwright.

## What Changes

- New `reference extract --path <index.html> | --url <url> --output <new-dir> [--width --height]`: opens the
  page with the existing browser resolver, collects computed styles, CSS variables and the Web Animations
  inventory in one page walk, and runs the vendored extractors. Writes `extraction.json` (each value with its
  count, area share and sample selectors) and `tokens.dtcg.json` (DTCG draft).
- The replicate reference step runs it for a live-page or HTML reference and records the extraction file in
  `reference-evidence.json`. For an image-only reference the step says no measurement is possible and the
  existing observed path stays.
- `foundation check` in replicate mode with a measured extraction: every colour, font family, font size,
  spacing and radius token in `DESIGN.md` and every duration and easing in `MOTION.md` SHALL match an
  extraction entry (colour within ΔE2000 2, sizes within 0.5 px, durations within 10 ms) or be listed under
  Source Decisions as added with a reason. Otherwise `token-not-measured` with the nearest measured value.
- The owner's extraction confirmation shows the measured palette and scales next to the chosen tokens, and its
  digest binds `extraction.json` with the other reference files.

## Capabilities

- `design-pipeline`: ADDED `Replicate extraction is measured from the reference page`.

## Reuse

- Browser resolution and capture conventions from `capture-composition.cjs`; the confirmation digest and the
  stale-extraction re-ask in `workflows/replicate.cjs`; `foundation check` findings.
- Vendored, unmodified: the design-extract extractors needed (colors, color-ramps, typography, spacing, borders,
  shadows, variables, breakpoints, animations, motion, motion-runtime) and `utils.js`, with LICENSE, under
  `skill/vendor/design-extract/`. Its crawler, formatters other than DTCG, MCP server and CLI are not vendored.

## Impact

- New `reference extract` action and output files; image-only replicate projects are unchanged.
- Replicate projects whose DESIGN.md uses unmeasured values now get findings until each is matched or declared.
