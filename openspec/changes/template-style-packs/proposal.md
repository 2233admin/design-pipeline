# Template style packs, the shinbo style, and a browser half for template check

## Why

Closes #288. Stacked on #271 (template bank).

The Nocturne Corridor (夜想回廊) experiment produced a full set in the shinbo / SHAFT style in one
round from a written grammar, good materials and templates: the first pass was about 80% of the
final. Between the two rounds, most changes were problems a check could have found (a collage key
over the tagline, a vertical line run off the frame, 13 texts below contrast); only three places
needed taste. So a good first round comes from a mature style grammar, good materials and these
checks run while generating, not from rounds of hill climbing.

The template bank (#271) has templates, but no notion of a style, its check reads only the SVG it
wrote (layers injected afterwards and hand-written SVG are not checked), text overlap is not checked
at all, its contrast uses a model of the ground rather than its pixels, and nothing stops a font from
falling back glyph by glyph (the experiment's Japanese Mincho fonts lack simplified-only hanzi).

## What Changes

- **Style packs** in the template bank: `skill/tools/template-bank/styles/<id>/style.json` (schema
  `design-pipeline.template-bank-style.v1`) groups font roles (stacks and weights), layout grammar,
  materials (procedural, collage rules, sources, effect budget), motion grammar and the check rules
  its renders must pass. Every template names its style (`style` in the manifest); templates use
  font roles instead of a per-manifest font list. The nine Arknights / Endfield templates become the
  `arknights-endfield` pack; `shinbo` is the first new one. `template list --style <id>` shows a pack.
- **Shinbo templates** (11): `card.onechar-bleed`, `card.episode-number`, `card.vertical-sentence`,
  `card.bracket-quote`, `card.giant-crop`, `card.collide`, `card.void-line`,
  `kv.vertical-band-corridor`, `ui.door-grid`, `ui.specimen-codex` and `motion.title-card-cut`
  (a rhythm table of flashes, holds and blacks drawn as a storyboard, with its EDL in the result).
  Collage image slots are drawn only when filled, at the image's aspect, rotated; the corridor,
  door and butterfly are procedural material in the layouts.
- **`template check` extended, no new gate**: the same command, rules and finding shape gain a
  browser half (`tools/template-bank/page-check.cjs`) that loads the SVG or HTML in headless Chrome:
  text units by `data-chk` / `data-slot` and any other text (including layers injected by script),
  grouped by `data-grp`; `text-overlap` by ink (each unit painted alone in black and white, so the
  glyphs, not the em box, and plates above the text count); `off-canvas`; `collage-cover` by the
  alpha pixels a collage layer paints in a text's ink zone, above or under it (not its rotated
  frame); `contrast` against the ground rendered with the text hidden, 10th percentile under the
  ink; `glyph-coverage` (a string whose first font lacks a character). It runs on `--browser`, on
  any file without template metadata (HTML, hand-written SVG), and on every render of a style whose
  checks ask for it (shinbo). The browser contrast replaces the static estimate when both run.
- **Whole-string glyph coverage**: `tools/template-bank/coverage.cjs` reads cmaps (TTF, OTF, TTC,
  WOFF) and takes a registered provider first (the font catalog of #286 plugs in with
  `registerProvider`). `template render --font-dir <dir>` finds the style's font files, switches a
  whole string to the next font of its role that covers it, records the switch, embeds the faces
  for the browser check, and the static check reports `glyph-coverage` when no font of the role
  covers a string.
- **Rhythm rule** in the static check for motion templates: flash 2-6, hold 12-32, black 4-14
  frames, flash groups of 3-6 on one ground tone, repeats 2-3, 10-15 s, and at most three
  ground-tone flashes per second (WCAG 2.3.1, as the pending film flash check measures on video).
- Every new finding carries a concrete fix (move by N px, which colour reaches the ratio or that
  only a plate helps, which font covers the string, which frames to change).
- Acceptance fixtures from the experiment in `tests/fixtures/style-pack-shinbo/` (first pass and
  final pages with subset OFL fonts and downscaled CC0 collage, 2.2 MB).

## Capabilities

- `design-pipeline`: the template bank gains style packs, the shinbo pack, whole-string glyph
  coverage, the rhythm rule and the browser half of `template check`. No stage, gate, receipt or
  workflow state changes; the template check stays a supporting-tool check.

## Reuse

- `template list|render|check`, the manifest and check metadata schemas, `BankError` codes, the
  finding shape (`rule`, `slot`, `measured`, `limit`, `message`, `fix`), exit codes 0 / 2 / 1.
- `resolvePuppeteer` and `resolveBrowser` (film capture, browser locate), `png-core.decodePng`,
  `--chrome` / `--puppeteer-module` as in `composition capture`.
- The Nocturne Corridor prototype checks (`render.cjs`, `check.py`) and the overlap prototype
  (`svgraster.cjs`), ported and corrected (ink instead of em boxes, alpha instead of frames).

## Impact

- New: `skill/tools/template-bank/{coverage.cjs, page-check.cjs, layouts-shinbo.cjs, styles/**}`,
  11 template folders, `tests/template-style-pack.test.cjs`, `tests/fixtures/style-pack-shinbo/**`.
- Changed: `bank.cjs` (styles, font roles, coverage, collage and derived slots, rhythm and glyph
  rules), `measure.cjs` (collage layers are left to the browser), the nine manifests (`fonts`
  replaced by `style`) and their default renders (`data-font-role`), `cli-core.cjs` (`--browser`,
  `--font-dir`, `--style` on list, HTML and hand-written SVG in `check`), the guide, package
  resources, test manifest, notices, changelog.
- Behaviour change for #271's contract: `template check` on an SVG without template metadata no
  longer exits 1 `CONTRACT_INVALID`; it runs the browser check (exit 1 `TOOL_MISSING` when no
  browser). A malformed template metadata block still exits 1 `CONTRACT_INVALID`.
