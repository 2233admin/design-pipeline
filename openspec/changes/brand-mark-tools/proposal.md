## Why

design-pipeline has no route for a logo, wordmark, monogram or app icon. A request for one falls to general
drawing, which produces an SVG with live `<text>`, filters, a dozen colours and sub-pixel details that vanish at
16 px, and nothing checks it. kaankiziltug/logo-design-skill (MIT, reviewed at `7340903`) shows what a mark needs
to be checked against: a vector audit (live text, embedded raster, filters, gradients, colour count, anchor
complexity, near-miss angles, tiny details, overflow, centring) scored 0 to 100, and a proof sheet that shows each
concept at 16, 32 and 64 px, in one colour, reversed, blurred (squint test) and beside other marks (shelf test).

## What Changes

- New supporting tool `skill/tools/brand-mark/` (Node, no new dependency):
  - `brand-mark audit <mark.svg> [--bg <hex>]`: the vector audit with the upstream finding codes, levels and the
    same score (100 minus 25 per FAIL, 8 per WARN, 1 per INFO). Complexity is reported as anchor count with fixed
    thresholds; the upstream library statistics are not used.
  - `brand-mark sheet <mark.svg>... --output <new-dir>`: an HTML proof sheet per concept (sizes, mono, reversed,
    squint, light and dark grounds) and a side-by-side shelf of all concepts. Rendered with the existing browser
    capture so the sheet is also a PNG the owner can review.
  - `brand-mark export <mark.svg> --output <new-dir>`: favicon set, app-icon sizes (16 to 1024), mono and reversed
    SVGs with `<title>`.
- `skill/tools/README.md` and routing: logo, wordmark, monogram, favicon and app-icon requests go to this tool, with a
  short method guide (mark types, one idea per mark, test at 16 px first), written in this repository's words.
- The audit is technical conformance only; which concept is the logo is the owner's decision on the sheet.

## Capabilities

- `design-pipeline`: ADDED `Brand marks are audited and proofed before delivery`.

## Reuse

- Browser capture and PNG codec already in the package; the tool index and routing. No workflow stage is added.

## Not taken

- The upstream logo library (trademarked marks, reference-only) and its catalogue statistics; Python scripts are
  re-implemented, not vendored.
