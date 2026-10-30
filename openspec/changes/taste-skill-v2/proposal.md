## Why

The vendored Taste suite is pinned at `b482f7a` (2026-10-07), just before upstream's v2 rewrite. Leonxlnx/taste-skill
is now v2.1.5 (`12af471`, MIT): one folder skill `skills/taste-skill/` with eleven references, nine JSON libraries,
assets and real tooling — `inspect.mjs` (real-Chrome page inspector with frame, tells and `--app` checks, `--film`
scroll capture), `lint.mjs`, `draw.mjs` (deals direction, palette and type from the library), `assets.mjs`
(open-licence photos, no API key) and `scenes.mjs` (ScrollTrigger/Lenis scroll scenes) — plus an app-screen route
measured from 23 products and rules distilled from studies of 347 award sites. Upstream also fixed real defects in the
files we ship (`transition: all` in motion rules, reduced-motion enforcement, an unquoted `: ` that broke skill loading,
an innerHTML escape in charts.js).

The older single-file styles we vendored and route to (minimalist, brutalist, soft, gpt-taste, stitch, v1) moved to
Leonxlnx/taste-skill-classics (`5e08c93`, MIT), and the image-generation skills (brandkit, image-to-code,
imagegen-frontend-web, imagegen-frontend-mobile) to Leonxlnx/imagegen-skills (`beb16b0`, MIT). Our guide routes to
all of them.

## What Changes

- Re-vendor the Taste suite as three pinned sources under `skill/vendor/taste-skill/`: `v2/` (taste-skill `12af471`,
  `skills/taste-skill/**`, LICENSE, README, CHANGELOG), `classics/` (taste-skill-classics `5e08c93`, all skills) and
  `imagegen/` (imagegen-skills `beb16b0`, all skills). One manifest records the three repositories, commits, trees
  and file inventories. Upstream bytes stay unmodified; `SKILL.md` files are stored as `UPSTREAM-SKILL.md`.
- Delete the pre-v2 snapshot (no compatibility path).
- `references/taste-skill.md` routes: new site, redesign and app screens → v2; a named classic style → classics;
  concept images and brand boards → imagegen; `full-output-enforcement` and `output-skill` are gone upstream and are
  removed from the route table.
- v2 tools run from the package as optional evidence producers: `taste inspect <url|file>` wraps `inspect.mjs`
  through the existing browser resolver and writes its report into the project's evidence directory; `taste draw`
  wraps `draw.mjs` as a draw pool for the existing style-roulette source; the direction stage keeps its three sources
  and six thumbnails.
  `lint.mjs` tells are recorded as advisory evidence; the hard mechanical lint stays the one in
  `anti-slop-mechanical-lint`, so the same defect is never gated twice.
- Taste evidence is advisory and is not a receipt: no gate consumes it, so it adds no receipt schema. Each
  `taste inspect` report records the target's sha256 (or URL and capture time) and the v2 source commit; a later
  report is stale when either differs from the current target or the pinned commit, and is shown as stale rather than
  reused. A `taste draw` ledger entry records the source commit with the draw.
- `assets.mjs` is offered only when the project has no supplied imagery, and every fetched photo keeps its licence and
  credit line in the project's asset manifest.

## Capabilities

- `design-pipeline`: ADDED `Taste suite tracks upstream v2, classics and image skills`.

## Reuse

- `scripts/import-taste-skill.cjs` (extended to three sources), the vendor manifest format, browser resolution, the
  direction stage and the appearance ledger.
