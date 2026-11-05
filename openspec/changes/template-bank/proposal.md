# Template bank: parameterised layout templates, rendered by id and audited on render

## Why

Closes #261. Covers, key visuals, cards, banners and UI panels are laid out by eye every time. The owner
asked for the earshot sound-bank model applied to layout: structures kept as code, rendered by id with
knobs, measured when rendered, each with its provenance, so small improvements accumulate in one place
instead of being rediscovered per job. A measured study of official Arknights / Endfield promotional art
(119 sampled images, 63 layout-annotated) produced nine structural skeletons, a code-drawn condensed
lettering set and the numbers behind them; it lived outside the repository in Python.

Without a bank, an agent has no measured starting structure, no check that copy fits the slot it was
written for, and no record of where a layout's proportions came from.

## What Changes

- `skill/tools/template-bank/`: nine templates (`templates/<id>/manifest.json`, the default render
  `template.svg`, and the measured `spec.md`), the layout geometry ported from the study's `build.py` to
  Node CommonJS (`layouts.cjs`), the study's `lettering.py` ported to `lettering.cjs` (the study's 53 glyphs, same
  path data and widths, plus `, ; " &` and the euro sign), `bank.cjs` / `measure.cjs` for rendering and
  measuring, and `skill/scripts/template-sample.cjs`, a browser kernel that samples rendered pixels and
  measures text widths for calibration.
- A manifest per template: id, family, sizes and aspect, slots (kind, default, character budget, line
  budget, size parameter, title / decoration / bleed flags), parameters with defaults, measured ranges and
  a class (`proportion`, `rhythm`, `decoration`), palette roles with their use, accent roles and budget,
  relations, decoration, named fonts, provenance (corpus, URL, access date, sample ids, measured facts),
  and the changes made where the study failed its own check.
- CLI in the existing `template` command (beside the region-template actions):
  `template list [--family]`, `template render <id> --set slot=value --param k=v [--seed n] [--size WxH]
  -o out.svg [--png out.png]` and `template check <file.svg>`. Render runs the check on its output.
  New flags `--set`, `--param`, `--tone` (repeatable), `--size`, `--seed`, `--png`, `--family`, `-o`; `template
  render` and `template check` take one positional operand.
- `template check` measures the rendered SVG: text fit against each slot's box and line budget,
  character budget, minimum type size, contrast against the composited ground, title overlap with a
  declared figure zone, listed slots inside a crop zone, accent-colour area, shared alignment lines,
  lettering that fell back to the font, and geometry it cannot measure (a failure, never a pass). Text on a
  real image is judged on rendered pixels sampled in a browser, or on a `--tone` the caller declares;
  with neither it fails as `contrast-unverified`. Every finding carries a fix. Exit 0 pass, 2 failed check, 1 usage or contract error.
- Guide `skill/references/template-bank.md`, routed in one line from `SKILL.md` and
  `capability-routing.md`. Research and provenance in `docs/research/`; ablation candidates for #260
  (accent budget, title not over the figure, shared left line) in
  `docs/research/template-bank-ablation-candidates.md`. Reference owners and the named OFL fonts in
  `THIRD_PARTY_NOTICES.md`.

## Capabilities

- `design-pipeline`: a new supporting tool (template bank) and three `template` CLI actions. No stage,
  gate, receipt or workflow state changes.

## Impact

- New: `skill/tools/template-bank/**`, `skill/scripts/template-sample.cjs`, `skill/references/template-bank.md`,
  `tests/template-bank.test.cjs`, `tests/template-bank-browser.test.cjs`,
  `docs/research/{arknights-endfield-template-study.md, arknights-endfield-provenance.csv,
  ignoredone-arknights-design.md, template-bank-ablation-candidates.md}`.
- Changed: `skill/scripts/cli-core.cjs` (actions, flags, help, one-operand dispatch),
  `skill/SKILL.md`, `skill/references/capability-routing.md`, `skill/references/package-resources.json`,
  `scripts/test-manifest.json`, `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md`.
- Existing `template inventory|search|select|adapt|review|approve` behave as before; other commands
  still reject a third positional argument. No migration.
