## Why

In the 夜想回廊 (SHAFT-style) study the procedural corridor and checker floor carried three
compositions, but the procedural paper, halftone and cut-outs were weak: the paper texture was all
but invisible (0.23 L* RMS on the finished poster's blank ground, measured below), the halftone was
a perfect digital lattice and the SVG cut-outs were perfectly flat (L* standard deviation 0.01 inside
a black wing). Public-domain sources (#287) do not cover paper, screens or ink flats in usable form,
so much material has to be made. The skill has no seeded, recorded generators, no print-style
processing, no way to say how close a generated texture is to a real one, and no guide for the owner
to photograph or scan their own.

## What Changes

- `materials generate`: seeded generators in `tools/art-motion/procedural.cjs` for paper
  (fibre/tooth/laid lines from a calibrated spectrum, creases, wrinkle, ageing, foxing, stains),
  halftone (AM spot shapes, LPI/period, angle, coverage or ramps; FM; roughness, mottle, dot gain),
  print ink flats (measured grain, edge pile, rough edge, starvation, misregistered second ink),
  architecture line art (corridor, arcade, stairs, window wall, checker floor converging on an
  adjustable vanishing point; SVG) and geometric motifs (SVG). Files land in `materials/generated/`
  with `generator` {name, version, params, seed}; `--file` replays a record and exits 2 if the bytes
  differ.
- `materials process --effect woodcut|halftone|papercut|photocopy|duotone` turns any recorded PNG
  into a printed-looking variant with one parameter style, recorded in `materials/processed/` with
  `derivedFrom` lineage (operation `process`, effect, version, seed, params).
- `materials measure` reports texture statistics (`tools/art-motion/texture-stats.cjs`) and the
  distance to a calibration profile with two yardsticks measured on real scans; `--name` turns an
  owner scan into a project profile under `materials/calibration/`. `materials profiles` lists them.
- Built-in profiles (`references/material-calibration.json`) measured on CC0 / public-domain scans
  fetched with `materials fetch`: three papers, two ink flats, one halftone; each with provenance,
  px/mm evidence, fit region, held-out region and natural variation. Rebuilt by
  `scripts/build-material-calibration.cjs`.
- `materials fetch --params '{"region":[x,y,w,h]}'` takes a native-resolution detail from a IIIF
  source (Rijksmuseum), needed to resolve a halftone screen or paper tooth.
- `materials check` also requires generated files to carry name, version, params and seed, warns when
  the generator version moved, fails textures whose project calibration profile changed, and gives
  processed files the exact re-run command when their source changed.
- Owner capture guide `references/material-capture.md`: phone photos for cut-outs, flatbed scans of
  paper, ink flats and screentone (resolution, settings, regions), then `materials add` / `measure`.

## Capabilities

- `design-pipeline`: ADDED `Generated material is seeded, recorded and measured against real scans`,
  ADDED `Print-style processing keeps lineage to its source`.

## Reuse

- The materials catalog of `public-domain-materials` (#287, stacked on its branch): the same
  `materials/licenses.json` records, `relativeMaterial`, `fileFacts`, `derivedFrom` lineage and
  `materials check`; no new receipt schema or gate. Generated records are ordinary licence records
  with `license: "generated"` plus a `generator` field.
- `assets.cjs` Lab conversion, Gaussian blur and seeded random (now exported); the PNG codec; the
  existing `--params`, `--name`, `--replace`, `--effect`, `--kind`, `--title`, `--use`, `--file`
  flags. New flags: `--generator`, `--seed`, `--reference`.
- `visual-craft` `paperGrain` stays the live-canvas grain helper; this change makes files.

## Not taken

- Texture synthesis that reproduces phase structure (Portilla-Simoncelli, exemplar patch methods):
  spectrum + histogram matching is the measured baseline; single hairs and wood-grain lines are a
  known gap, stated in the guide.
- Committing the scans: only their hashes, regions and statistics are committed.
- Colour-separated CMYK halftone of photographs; `duotone` covers two-ink work.
