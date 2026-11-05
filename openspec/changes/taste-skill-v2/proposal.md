## Why

The vendored Taste suite is pinned at `b482f7a` (2026-10-07), 83 commits before upstream's current head.
Leonxlnx/taste-skill is now v2.1.5 (`12af471`, 2026-10-25, MIT) and, since 2.1.3, one skill:
`skills/taste-skill/` (`design-taste-frontend`) with eleven references, nine JSON libraries, CSS/JS
assets and real tooling: `draw.mjs` (deals direction, type, palette, hero and section blueprints from
the library), `inspect.mjs` (real-browser checks at 1440/768/390, `--app`, `--film`), `lint.mjs`,
`assets.mjs` (open-licence pictures with credits, no API key) and `scenes.mjs` (scroll-scene sheets).
It adds an app-screen route measured from 23 product screens, critique caps and a dated tells
registry, and fixes defects in files we ship (an unquoted `: ` that broke skill loading, an
innerHTML escape in charts.js). The redesign method is now a route inside the one skill.

Our guide, `stages.md` and six other references still describe "thirteen" methods and "v2
experimental, excludes dense product UI". Seven classic styles moved to Leonxlnx/taste-skill-classics,
and brandkit, image-to-code and the two image-generation skills to Leonxlnx/imagegen-skills;
`full-output-enforcement` was removed. Our guide routes to all of them.

## What Changes

- Re-vendor Leonxlnx/taste-skill at `12af471` with the existing importer: the complete 72-file tree,
  one skill. The pre-v2 snapshot is replaced; no compatibility path.
- Rewrite `references/taste-skill.md` to four routes: new site, redesign, app screens, critique.
  Remove routes to methods no longer upstream and name the existing pipeline route for each
  (design direction library, design-synthesis, reference/reconstruction, image provider).
- Document `draw.mjs`, `inspect.mjs`, `lint.mjs`, `assets.mjs` and `scenes.mjs` as optional agent tools
  run from the packaged copy in the target project. The pipeline never runs them; findings about
  taste (palettes, eyebrows, monospace labels) are advisory and never a gate. A draw does not add a
  card to the three-source direction preview.
- Update every reference, the capability marker, catalog pins, notices and tests to the new tree.
- The importer reads the new entry's folded (`>-`) description itself; the shared frontmatter
  reader is unchanged because another bundle's build provenance pins its bytes.

Not in this change (follow-ups): vendoring Leonxlnx/taste-skill-classics and
Leonxlnx/imagegen-skills; CLI wrappers (`taste inspect`, `taste draw`), a `roulette/taste-draw` pool
and stale-report tracking.

## Capabilities

- `design-pipeline`: MODIFIED `Complete pinned Taste source`, MODIFIED `Task-selected built-in Taste
  capability`, ADDED `Taste tools stay advisory`.

## Reuse

- `scripts/import-taste-skill.cjs`, `scripts/git-tree-snapshot.cjs`, the vendor manifest format,
  `package-resources.json`, `sources:check` and the `visual-direction-review` profile. No new command,
  gate, receipt schema or resolver.
