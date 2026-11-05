# Game style packs: six owner-approved cases as reusable packs and templates

## Why

Closes #308. Owner, on the six game and anime cases: 「这个效果还不错 都可以作为模板保存」.

The cases (gacha event, esports broadcast, Steam capsules, pixel RPG UI, tactical HUD, trading cards)
each found a strong borrowed grammar after a "too ordinary" first round, and each passed the browser
check at 0 findings. But every screen was hand-written HTML in the case folder: the next game brief
starts from zero, and the grammar, its measured traps (white on fluorescent pink, text on a brushed
cyanotype edge, a lifebuoy that reads as a stop inside 15:00) and its lineage live only in Chinese case
notes. The template bank (#271) and style packs (#291) are the place for them.

## What Changes

- **Six style packs** in `skill/tools/template-bank/styles/`: `citypop-sleeve`, `xerox-flyer`,
  `cassandre-litho`, `woodblock-pixel`, `acid-print-hud`, `cyanotype-specimen`, in the existing
  `design-pipeline.template-bank-style.v1` shape: font roles (catalog family plus fallbacks, and the
  `fonts query` / `fonts measure` command that resolves them), layout grammar, materials (procedural
  parts and `materials fetch / cut / process / generate` recipes with their parameters), motion grammar,
  checks (with the 64 px distinctiveness test as guidance, not a gate), provenance (case, lineage,
  "borrow grammar, never assets", rounds, measured traps) and `examples`: the case screens that stay
  example renders and why.
- **18 templates** rendered from parameters with original placeholder copy: `cover.event-kv`,
  `ui.gacha-recruit`, `ui.tenpull-wall`; `broadcast.scorebug` (`scale=half` reflows it), `broadcast.bp-board`,
  `poster.tour-flyer`; the `steam.*` set (header, small, main, vertical, library, event cover, event
  header: one composition re-laid per Steam size); `pixel.title-screen`, `pixel.inventory` (480 x 270 grid
  scaled by a whole number); `hud.combat`; `card.tcg-frame` (four rarities by `rarity`), `ui.pack-open`.
  Every default render passes the static check at each size and for 50 seeds, and the browser check.
- **Small fixes the packs needed**, inside the existing check (no new gate, rule set or schema):
  - static geometry reads `H V C S Q T A` path commands (an unparsed arc added a phantom triangle
    reaching the origin and darkened the ground of a title far away);
  - the browser half measures a `data-chk` element drawn with paths (no text) as lettering, by its
    `.lettering` paths and by the stroke when a glyph is stroked (the cases declared such frames
    `data-no-text`); stroked glyphs paint their stroke in the ink shots;
  - `Doc.lettering` takes an offset shadow plate (`shadow`) that belongs to the slot; `Doc.text`
    takes `italic` and `filter`; `Doc.image` takes `labelAt`, and a placeholder label switches to black or
    white when its grey falls under 4.5:1 on its hatch (seven Arknights / Endfield renders change);
  - a path outside `--root` (`--font-dir`, `--project-root`, ...) now says to pass `--root`.
- Follow-ups not done here (each needs more than a small fix): `materials cut --finish ink` needs a
  local paper estimate, the placeholder-overlap rule, a browser `type-size` rule, and the chamfered 8.

## Capabilities

- `design-pipeline`: the template bank gains six style packs and 18 templates; `template check` reads
  more path geometry and measures drawn numerals. No stage, gate, receipt or workflow state changes.

## Reuse

- `template list|render|check`, the style and manifest schemas, `BankError` codes, the finding shape,
  exit codes 0 / 2 / 1, `lettering.cjs` (stencil, chamfered and wide Latin lettering), `page-check.cjs`.
- The cases' own code (`common.cjs`, `poster.cjs`, `pix.cjs`, `hud2.js`, `cards.js`) ported to layouts.

## Impact

- New: `tools/template-bank/{layout-kit.cjs, layouts-citypop.cjs, layouts-xerox.cjs, layouts-litho.cjs,
  layouts-pixel.cjs, layouts-hud.cjs, layouts-cyanotype.cjs}`, six `styles/<id>/style.json`, 18 template
  folders, `tests/template-game-packs.test.cjs`.
- Changed: `bank.cjs` (layout registry, `italic`, `filter`, lettering `shadow`, `labelAt`, label colour),
  `measure.cjs` (path commands), `page-check.cjs` (drawn lettering), `cli-core.cjs` (the `--root` fix,
  help families), seven Arknights / Endfield `template.svg`, the guide, package resources, test manifest,
  changelog; `tests/template-bank.test.cjs` and `tests/template-style-pack.test.cjs` counts.
