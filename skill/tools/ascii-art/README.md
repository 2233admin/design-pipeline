# ASCII art

Animated ASCII art from [ascii.rest](https://github.com/bas3line/ascii) 0.4.0 (MIT, by bas3line) as a
capture-ready composition. The page draws a piece's `frame(t, env)` for an explicit time in coloured
glyphs, one colour a cell on a canvas: a scene in its own palette, a text piece in its preset's paint.
One-ink text in a `<pre>` is an option (`?mono`). No package installation, network or build.

## Start in a project

```sh
SKILL_ROOT="/absolute/path/to/installed/design-pipeline"
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" \
  composition scaffold --root "$PWD" --template ascii-art --output "ascii-art"
```

The new directory holds `index.html`, `ascii-art.js` (the player), `presets.js` (the preset table),
`pieces.js` (the exact text of each vendored piece module), `font.js` (the bundled monospace font
as a `data:` URL), `LICENSE.ascii-rest` and `LICENSE.font`. Open `index.html` straight from disk:
`ascii-art.js` evaluates each piece through a `data:` URL import and loads the font from a `data:`
URL, because Chromium refuses ES-module and font files on `file://` pages. No request leaves the
directory.

## Colour and mono

By default every preset is drawn on a canvas of whole-pixel cells, each glyph in its cell's colour.
A scene (a piece with a palette: `aurora-fjord`, `night-coast`, `ocean-sunset`) colours its own cells.
A text piece returns only text, so its preset's `paint` rules colour each drawn cell from the cell's
glyph, its row or its column. The first rule whose `glyphs` and `rows` hold a cell colours it:

| Rule field | Meaning |
| --- | --- |
| `glyphs` | the glyphs the rule holds, as an array of strings; every drawn glyph when left out |
| `rows` | `[first, last]` rows the rule holds; every row when left out |
| `by` | `"glyph"`: each `glyphs` string takes the colour at its place; `"row"`/`"column"`: the colours spread evenly down the rule's rows or across the columns; left out for one colour |
| `colours` | `#rrggbb` colours, never blended |

A cell no rule holds is drawn in `ink`. A frame's colours depend on its text and cell places only,
so they are as repeatable as the text. Colours in all, the ink included, are at most 64.

`index.html?mono` (or `?mono=1`, with any `#preset` or `?preset=`) draws a text preset as text in a
`<pre>` in its one ink, the same text as in colour; `mono: true` on a row does the same for that
preset, also when `composition capture --composition` opens the file without a query. A scene has no
one-ink form, so `?mono` or `mono: true` on a scene shows an error and the capture hooks throw.

## Font and grid

Both the canvas and the `<pre>` draw in a subset of JetBrains Mono 2.304 Regular (SIL Open Font
License 1.1; source, hashes and the subset command in [`fonts/LICENSES.md`](fonts/LICENSES.md)),
never a host font. It covers printable ASCII and every character the vendored pieces contain, each
one cell wide, so glyph shapes are the same on every machine and every row of a mono preset is
exactly `cols` cells. A host monospace font often lacks some box-drawing or block characters; the
browser then draws those in a wider face and the row runs past the grid. On the canvas a glyph sits
in its cell as in a `<pre>` line box and is cut at the cell's edges, and block elements (U+2580 to
U+259F) are drawn half a pixel wider on each side, so neighbouring blocks meet without a seam. The
page draws nothing until the font has loaded; without `font.js` it shows the error and the capture
hooks throw.

## Presets

| Preset | Piece | fps | Grid | Colour |
| --- | --- | --- | --- | --- |
| `donut` | donut | 30 | 40 × 22 | by light: plum, crimson, vermilion, orange, amber, cream |
| `donut-paper` | donut | 30 | 40 × 22 | on paper (the piece flips its shading ramp): ochre to aubergine |
| `doom-fire` | doom-fire | 24 | 60 × 18 | by heat: ember, deep red, red, orange, yellow, white |
| `fireworks` | fireworks | 30 | 64 × 24 | by column: violet, rose, gold, cyan, mint; white flashes |
| `matrix-rain` | matrix-rain | 20 | 63 × 24 | by glyph: near-white heads, bright collar, green body, dark trails |
| `rotozoomer` | rotozoomer | 30 | 64 × 24 | by brick surface: shadow, face, side-lit and top-lit bevels |
| `sparks` | sparks | 30 | 64 × 20 | sparks white to red by heat, steel-blue grinder, grey plate |
| `synthwave` | synthwave | 20 | 65 × 28 | sun rows yellow to magenta, violet ridge, pale stars, floor magenta to cyan |
| `tunnel` | tunnel | 30 | 64 × 24 | by depth (the piece shades by fog): violet far end to cyan-white walls |
| `tv-static` | tv-static | 20 | 58 × 26 | picture in a cold grey ramp, set and card lines in warm bakelite; test card (`set: true`) |
| `aurora-fjord` | aurora-fjord | 15 | 200 × 100 | the scene's 43-colour palette; the ascii.rest home page's hero |
| `night-coast` | night-coast | 15 | 200 × 100 | the scene's 30-colour palette |
| `ocean-sunset` | ocean-sunset | 15 | 200 × 100 | the scene's 43-colour palette |

Choose one without editing code: `index.html#night-coast`, `index.html?preset=night-coast`, the
Preset control, or `data-preset` on `<html>` (the default when the URL names none; `donut` as
shipped). A hash wins over the query. Each row of `presets.js` has `name`, `piece`, `options`
(overrides of the piece's option defaults), `fps` (the sample rate), `cols`/`rows` (must equal the
piece's grid), `ink` (the colour of a mono preset, of a cell no paint rule holds, and of the
controls), `ground` (the colour behind the art), `duration` (the seconds `renderStudy` and the live
loop cover; duration × fps ≤ 3600), `paint` (a text piece's colour rules; required unless the row
is mono) and optionally `mono`. An unknown field, piece or preset, a grid mismatch, a malformed
paint rule, or paint on a scene, is shown on the page and makes the capture hooks throw.

## Capture

```sh
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" composition capture --root "$PWD" \
  --composition ascii-art/index.html --seek 2.5 --output qa/ascii-donut
```

`--seek <s>` calls `window.__timelines["ascii-art"].seek(s)`; `window.renderStudy(progress)` draws
`progress × duration`. Either stops the live preview and hides the controls, so the image holds only
the art on its ground. Without `--seek` a capture shows whatever the page drew last. A page that
cannot draw (unknown preset, missing file) makes the hook throw, so the capture fails instead of
writing an empty image.

`--composition` opens the file without a query, so it captures the `data-preset` default, in colour
unless its row says `mono: true`. For another preset, copy `index.html` and change `data-preset`, or
serve the directory on this machine (for example `python -m http.server 8123 --bind 127.0.0.1` run
inside it) and pass `--url "http://127.0.0.1:8123/index.html?preset=night-coast"` (add `&mono` for
one ink).

## Time

Frames sit on the preset's sample grid at k / fps seconds. A seek replays a fresh piece from 0 to
that frame with one persistent `env`, as ascii.rest's own `mount()` would have played it: seeking
forward continues, seeking back starts again. The same time therefore gives the same frame after
cold, repeated and reordered seeks, including `doom-fire`, whose frame advances an internal
simulation, and the coloured scenes, whose colours come from a cache filled by earlier frames
(`../../vendor/ascii-rest/manifest.json` records each piece's behaviour). A cold seek costs up to
duration × fps frames; to the end of `ocean-sunset`, the slowest shipped preset, it took about
0.6 s in Node on the development machine (`aurora-fjord` about 0.45 s).

The page plays a looping preview on `requestAnimationFrame` only for a person watching. With
`prefers-reduced-motion: reduce` it holds the first frame, and Play reads "Play anyway", as
ascii.rest itself handles that preference. `window.asciiArt.renderAt(seconds)` draws an explicit time
without hiding the controls, for code that owns time itself; `window.asciiArt.select(name)` and
`window.asciiArt.ready` resolve once a preset's first frame is drawn.

## Live sites and other pieces

A live web page can use the upstream package instead: `npm install ascii.rest`, then
`mount(element, piece)` from `ascii.rest` with a piece from `ascii.rest/pieces`, or the
`<ascii-art piece="donut">` element from `https://ascii.rest/ascii.js`. Those advance on
`requestAnimationFrame` and cannot be seeked, and the element loads its modules from ascii.rest at
runtime, so neither belongs in an offline capture. Upstream draws a text piece in one ink.

To play another of the package's 217 pieces here, add a `pieces.js` entry whose `source` is the
module file's text as a string (for example `JSON.stringify(fs.readFileSync(file, "utf8"))`), then a
preset row: a text piece needs `paint` rules for the glyphs it draws (or `mono: true`), a scene
needs none. A piece that reads the real time (`meta.clock`) is refused because it cannot be seeked.
A piece that draws characters outside the bundled subset needs a new subset (see `fonts/LICENSES.md`);
otherwise those characters fall back to a host font and leave the grid.

## Limits

- Glyph shapes come from the bundled font, but the rasterizer is the host's: antialiasing can still
  differ slightly between operating systems and Chrome builds, so compare pixels from one machine.
- Paint sees only a cell's glyph and place. Two things drawn in the same glyphs take the same colour
  unless they sit in different rows or columns: every firework shell uses the same glyphs, so a
  shell's hue comes from where it bursts, and tv-static's snow and test card share one grey ramp.
- In a `<pre>` (mono), block and box-drawing glyphs are drawn at the font's own height (1.32 em) in a
  1.2 em row, so they overlap the next row slightly instead of leaving gaps, and neighbouring full
  blocks (`█`) can show a faint antialiased seam at cell edges. On either renderer, diagonals (`/`,
  `╱`) do not join across rows.
- Canvas cells are whole device pixels; a small viewport makes the 200 × 100 scenes' dots small.
- Determinism and a passing capture are technical results. They do not grant visual acceptance.

The pieces and the canvas glyph atlas adapted from `dist/mount.js` come from the vendored ascii.rest
bundle in `../../vendor/ascii-rest/`; its `manifest.json` records the npm tarball, upstream revision
and per-file hashes. `LICENSE.ascii-rest` travels with every scaffold.
