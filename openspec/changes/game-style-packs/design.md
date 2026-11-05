# Design

## Decisions (made without asking)

- **One pack per case, named by the grammar, not the game**: `citypop-sleeve`, `xerox-flyer`,
  `cassandre-litho`, `woodblock-pixel`, `acid-print-hud`, `cyanotype-specimen`. Templates are named by
  what they are (`broadcast.scorebug`, `card.tcg-frame`), so a pack can serve another game.
- **Layouts in one file per pack** (`layouts-<pack>.cjs`) beside `layouts-shinbo.cjs`; `bank.cjs` merges
  the files it finds. Shared geometry (`rbox` for tilted slot boxes, `tilt`, `ngon`, `discStripes`,
  `rng`) is `layout-kit.cjs`. Geometry is in each case's own pixel units scaled to the canvas: the cases
  were measured at one size and their relations are what the owner approved.
- **Placeholder copy is the cases' own original fiction** (白昼公馆, 北线联赛, 远灯, 白垩驿路, 零点潮汐,
  藏珍匣); nothing in them is third-party. Public-domain images are not shipped: the card specimen, the
  palm, the copier crowd and the HUD scene are image slots, with a drawn stand-in (algae frond, fan-palm
  shadow, toner specks, hatch) and a `materials` recipe in the pack.
- **Steam set as a template family**: one template per Steam size, all drawn by one function from a
  table of per-size composition rows (the case's `final2.cjs`), because the bank keeps one aspect per
  template and Steam sizes differ in aspect. The text-free assets (library hero, background, icons,
  logo) are not templates: nothing to check, and they render from the same parts when needed.
- **Pixel grid**: canvas 1920 x 1080 = 480 x 270 x 4; other sizes must be 480 x 270 x n (else exit 1
  `OPTION_VALUE_INVALID`). The case drew on a canvas element; the template draws the same pixels as
  run-length paths per colour, and large ordered dithers as 4 x 4 Bayer patterns over a flat rect of
  their mean colour, so the static check sees a ground and the SVG stays small (125-180 KB). No font
  binary is committed: Fusion Pixel's licence reserves its name, so the PNG test excludes text boxes
  and checks the rest of the grid (0 mixed blocks, 0 off-palette blocks at x4).
- **Structure from slots, not hidden state**: the ten-pull rarity is the count of stars in the stars slot;
  HP and ammo slots fill their bars and switch colour at the case's thresholds; ransom notes are one slot
  per scrap. Repeated labels (`ban_waiting`, `wait_label`, `ban_word`) are one slot drawn several times.
- **Numerals that are drawn, measured**: the gacha striped numerals are a lettering slot whose group fill
  is the deep-teal cast shadow; the white tube alone is about 2.2:1 on pool, the shadow 4.9:1, and the
  relation says the shadow is not optional. The browser half measures any `data-chk` path group as
  lettering by its `.lettering` paths (stroke when stroked), so the shadow plate of `Doc.lettering`
  (`class="lettering-shadow"`) is part of the unit and never its ground.
- **Path geometry**: `measure.pathSubpaths` now reads every command; curves contribute their control
  points, arcs their end point. Existing templates' check results are unchanged (all 20 at every size,
  shinbo at 100 seeds); the Steam event cover's dome no longer darkens its title.
- **Placeholder labels**: a label whose grey falls under 4.5:1 on its slot's hatch becomes black or
  white (the browser check measures it as text). Seven Arknights / Endfield renders change bytes; their
  checks are unchanged.
- **Tool feedback**: folded in only the small, needed ones (drawn numerals, the `--root` message, the
  placeholder label colour and `labelAt`). Measured and left as follow-ups:
  - `materials cut --finish ink`: on the case prints the paper's lightness spans 90-96 L across a sheet
    (owl: p50 90.1, p92 95.7), so any global paper percentile leaves 59-69% of pixels non-zero; a
    floor from the paper spread was tried and reverted (no change). It needs a local paper estimate
    (background by morphological closing) and a trim to the ink.
  - the placeholder label overlapping a layout's copy: now movable with `labelAt`; a rule that fails
    such overlap in default renders is not added.
  - a browser `type-size` rule for hand-written pages (would change existing HTML fixtures' results).
  - the bank's chamfered 8 reads as B at HUD sizes (the tactical case rebuilt it from two O loops);
    `hud.combat` defaults to HP 74 until lettering gets a two-loop 8.

## Scope kept sane: example renders

Each pack's `examples` lists what stayed an example and why: the gacha stage-lanes screen and motion;
the esports player card, on-air composite and opening; the Steam hero, background, icons, logo, store
page and reel; the pixel main menu, dialogue, save and kit (the case found them generic at 64 px); the
HUD state sheet and motion; the card set sheet, the frame-breaking legendary and the pack motion. The
files are the README showcase images under `docs/cases/<case>/`.

## Files

| File | Owner |
| --- | --- |
| `skill/tools/template-bank/layout-kit.cjs`, `layouts-{citypop,xerox,litho,pixel,hud,cyanotype}.cjs` | this change |
| `skill/tools/template-bank/styles/{six}/style.json`, `templates/{18}/` | this change |
| `bank.cjs`, `measure.cjs`, `page-check.cjs` | extended in place (no new rule names) |
| `tests/template-game-packs.test.cjs` | new, in `scripts/test-manifest.json` |

## Visual direction and evidence

The renders follow the cases' approved finals (side-by-side reviewed while porting); the checks are
technical conformance only and grant no visual acceptance.
