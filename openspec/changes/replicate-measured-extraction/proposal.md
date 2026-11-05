## Why

In replicate mode the reference step has the agent write `reference.md` from looking at a screenshot or a
capture: "the observed structure, layout rhythm, type scale, colour, motion parameters". The extract step then
writes `DESIGN.md` and `MOTION.md` from that text. `reference extract` (change `reference-palette-extract`)
now measures a live page's palette, type scale and spacing, but radii, shadows, breakpoints and motion are still
the agent's estimates (a 300 ms ease that was really a 450 ms custom cubic-bezier), a local HTML reference
cannot be measured, and `foundation check` validates the format, not whether the values came from the
reference, so the owner confirms an extraction whose numbers no one compared.

Manavarya09/design-extract (designlang, MIT, v13, reviewed at `d2c28da`) measures radii, shadows, breakpoints
and CSS and runtime motion from computed styles; its method is the source for the additions below.

## What Changes

This change extends the `reference extract` action added by `reference-palette-extract`; it adds no second
extractor, collector or output path. Archive `reference-palette-extract` first.

- `reference extract` gains `--path <index.html>` (a contained local page, loaded over file://) beside `--url`,
  and repeatable `--width/--height` breakpoints. The same single page walk (`measureStyles` in
  `reference-extract-core.cjs`) also collects radii, shadows, transition and animation properties and the Web
  Animations inventory.
- The same output files gain fields, with unchanged meaning for the existing ones: `extraction.json` adds
  `radii`, `shadows`, `breakpoints` and `motion` (each value with its count and sample selectors);
  `design-md-draft.md` adds `rounded` tokens and a MOTION.md draft section; `palette-evidence.json` is
  unchanged. One new file, `tokens.dtcg.json` (DTCG draft), is written beside them.
- The replicate reference step runs it for a live-page or HTML reference and records `extraction.json` in
  `reference-evidence.json`. For an image-only reference the step says no measurement is possible and the
  existing observed path stays.
- `foundation check` in replicate mode with a measured extraction: every colour, font family, font size,
  spacing and radius token in `DESIGN.md` and every duration and easing in `MOTION.md` SHALL match an
  extraction entry (colour within ΔE2000 2, sizes within 0.5 px, durations within 10 ms) or be listed under
  Source Decisions as added with a reason. Otherwise `token-not-measured` with the nearest measured value.
- The owner's extraction confirmation shows the measured palette and scales next to the chosen tokens, and its
  digest binds `extraction.json` with the other reference files.

## Capabilities

- `design-pipeline`: MODIFIED `Reference pages are measured before they are judged` (local pages, motion,
  radii and shadows); ADDED `Replicate tokens match the measured extraction`.

## Reuse

- `reference extract`, its kernel, collector, block-page, HTTP-status and empty-page refusals, and its output
  files from `reference-palette-extract`; the confirmation digest and the stale-extraction re-ask in
  `workflows/replicate.cjs`; `foundation check` findings.
- design-extract is a method source, ported into the existing collector and analysis as project code with its
  credit in `THIRD_PARTY_NOTICES.md`; its crawler, formatters other than DTCG, MCP server and CLI are not used.

## Impact

- More fields in the existing `reference extract` outputs and one new file; image-only replicate projects are
  unchanged.
- Replicate projects whose DESIGN.md uses unmeasured values now get findings until each is matched or declared.
