# Reference distillation: a reference board becomes a style pack draft

## Why

Closes #293. Stacked on #291 (template style packs), itself stacked on #271 (template bank).

Both style packs were distilled by hand: the Arknights / Endfield pack from a measured study of 119
official images (look, measure colour, whitespace and margins, annotate title and figure boxes,
write templates), the shinbo pack from the Nocturne Corridor experiment. Every new style repeats that
work, and the thresholds a pack's templates use (accent budget, side margin, figure-zone overlap)
were picked by eye from tables. A designer also starts from references and extracts a grammar; the
bank has no tool for that step.

## What Changes

- `template distill <provenance.csv> --images <dir> -o <out-dir>` reads a **reference board**: the
  provenance list the template-bank guide already asks for (id, source URL, size, category), the
  local images (never copied, never written to the output), and optionally the study's layout
  annotations (`annotations.csv`: title box, figure range, logo corner; or `labels.jsonl`: text
  lines with box and size, figure box). `--category` selects categories.
- **Measurement** ports the study's model-free features to Node (`reference-measure.cjs`; decoding
  by ffmpeg): OKLab palette (k-means), ground lightness and chroma, main and neutral shares, hue
  spread, strong-colour share, visual-weight centre, mirror symmetry, whitespace cells, spectral
  texture; from annotations: title centre, side and area, text margins, type-size ratio, figure
  centre and width, title-over-figure overlap. The reference distribution (median and quartiles)
  of each feature is a threshold: `max` rules take p75, `min` rules p25, bands p25-p75; each says
  how many references support it (`measured` 8+, `thin` 3-7, `gap`).
- **Layout archetypes**: references grouped by aspect x title position x figure side (or
  symmetric / offset when not annotated) x whitespace; each archetype names the nearest bank
  template (measured on its default render) or, when none is within 0.25, a new template skeleton
  (median boxes as fractions, margins, type ratio).
- **Font roles**: annotated title and text crops at full resolution; stroke contrast (stem width /
  bar thickness, the ratio the open-font catalog of #290 measures on 十) and weight classify a role
  as mincho or gothic and give the lightest weight. When the catalog is installed
  (`font-catalog-core.cjs`), its candidates fill the draft's stacks; until then the draft keeps open
  defaults and prints the `fonts query` command (a clean hook, `useFontCatalog`).
- **Output**: `style.json` (the style pack shape, `draft: true`, thresholds in `checks.measured`,
  pooled palette roles, grammar sentences written from the data), `distill.json` (every reference's
  measures, hashes and source URLs) and `report.md` (what the data supports, the archetypes, font
  roles, and the gaps that need human judgement).
- `--compare <style-id>` diffs the draft against a hand-made pack (accent budget, ground chroma and
  lightness, side margin, figure-zone overlap, title and figure centres, hue spread and main-colour
  share where the pack states them, palette colours by OKLab distance) with a reason per row.
- `--ablate` renders the nearest templates (two seeds each) with the draft palette and with one rule
  removed at a time (measured palette, neutral ground, one theme hue), measures the renders the same
  way and reports each variant's distance to the reference distribution and its paired change.
- The style schema gains optional `checks.measured` (kind, support, basis per threshold), validated
  by the same `validateStyle` that `loadStyle` uses.

## Capabilities

- `design-pipeline`: the template bank gains `template distill`. No stage, gate, receipt, workflow
  state or check rule changes; the draft is not installed and grants no acceptance.

## Reuse

- The bank's provenance list format and the Arknights / Endfield study's annotation formats.
- `bank.render` / `bank.check` (template facts from the default render's measured slots and zones),
  the style schema `design-pipeline.template-bank-style.v1`, `BankError` codes, exit codes.
- ffmpeg decoding as film and reference-video tools do; the `composition capture` path (`templatePng`)
  for ablation renders.
- The study's `features.py` (ported; checked against it on 10 study images: ground L, accent share,
  weight centre, whitespace and spectrum agree to the third decimal) and the font catalog's stroke
  contrast definition.

## Impact

- New: `skill/tools/template-bank/{reference-measure.cjs, distill.cjs}`, `tests/template-distill.test.cjs`.
- Changed: `bank.cjs` (`validateStyle` factored out of `loadStyle`, `checks.measured`), `cli-core.cjs`
  (`template distill`, `--images`, `--annotations`, `--compare`, `--ablate`), the template-bank guide,
  package resources, test manifest, changelog.
