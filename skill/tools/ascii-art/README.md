# ASCII art

Animated ASCII art from [ascii.rest](https://github.com/bas3line/ascii) 0.4.0 (MIT, by bas3line) as a
capture-ready composition. The page draws a piece's `frame(t, env)` for an explicit time: mono pieces
as text in a `<pre>`, pieces with a palette onto a canvas. No package installation, network or build.

## Start in a project

```sh
SKILL_ROOT="/absolute/path/to/installed/design-pipeline"
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" \
  composition scaffold --root "$PWD" --template ascii-art --output "ascii-art"
```

The new directory holds `index.html`, `ascii-art.js` (the player), `presets.js` (the preset table),
`pieces.js` (the exact text of each vendored piece module) and `LICENSE.ascii-rest`. Open
`index.html` straight from disk: `ascii-art.js` evaluates each piece through a `data:` URL import,
because Chromium refuses ES-module files on `file://` pages. No request leaves the directory.

## Presets

| Preset | Piece | fps | Grid | Drawn as |
| --- | --- | --- | --- | --- |
| `donut` | donut | 30 | 40 × 22 | light text on a dark ground |
| `donut-paper` | donut | 30 | 40 × 22 | dark text on paper; the piece flips its shading ramp |
| `doom-fire` | doom-fire | 24 | 60 × 18 | text |
| `fireworks` | fireworks | 30 | 64 × 24 | text |
| `matrix-rain` | matrix-rain | 20 | 63 × 24 | text |
| `rotozoomer` | rotozoomer | 30 | 64 × 24 | text |
| `sparks` | sparks | 30 | 64 × 20 | text |
| `synthwave` | synthwave | 20 | 65 × 28 | text |
| `tunnel` | tunnel | 30 | 64 × 24 | text |
| `tv-static` | tv-static | 20 | 58 × 26 | text, with the test card (`set: true`) |
| `night-coast` | night-coast | 15 | 200 × 100 | canvas, the piece's 30-colour palette |
| `ocean-sunset` | ocean-sunset | 15 | 200 × 100 | canvas, the piece's 43-colour palette |

Choose one without editing code: `index.html#night-coast`, `index.html?preset=night-coast`, the
Preset control, or `data-preset` on `<html>` (the default when the URL names none; `donut` as
shipped). A hash wins over the query. Each row of `presets.js` has `name`, `piece`, `options`
(overrides of the piece's option defaults), `fps` (the sample rate), `cols`/`rows` (must equal the
piece's grid), `ink` (text colour of a mono piece and of the controls), `ground` (the colour behind
the art) and `duration` (the seconds `renderStudy` and the live loop cover; duration × fps ≤ 3600).
An unknown field, piece or preset, or a grid mismatch, is shown on the page and makes the capture
hooks throw.

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

`--composition` opens the file without a query, so it captures the `data-preset` default. For
another preset, copy `index.html` and change `data-preset`, or serve the directory on this machine
(for example `python -m http.server 8123 --bind 127.0.0.1` run inside it) and pass
`--url "http://127.0.0.1:8123/index.html?preset=night-coast"`.

## Time

Frames sit on the preset's sample grid at k / fps seconds. A seek replays a fresh piece from 0 to
that frame with one persistent `env`, as ascii.rest's own `mount()` would have played it: seeking
forward continues, seeking back starts again. The same time therefore gives the same frame after
cold, repeated and reordered seeks, including `doom-fire`, whose frame advances an internal
simulation, and the coloured scenes, whose colours come from a cache filled by earlier frames
(`../../vendor/ascii-rest/manifest.json` records each piece's behaviour). A cold seek costs up to
duration × fps frames; to the end of `ocean-sunset`, the slowest shipped preset, it took about
0.6 s in Node on the development machine.

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
runtime, so neither belongs in an offline capture.

To play another of the package's 217 pieces here, add a `pieces.js` entry whose `source` is the
module file's text as a string (for example `JSON.stringify(fs.readFileSync(file, "utf8"))`), then a
preset row. A piece that reads the real time (`meta.clock`) is refused because it cannot be seeked.

## Limits

- Glyphs come from the system monospace font (`ui-monospace, SFMono-Regular, Menlo, Consolas,
  monospace`), so captures differ between operating systems; compare pixels from one machine.
- A box-drawing or block character missing from that font falls back to another face and may not
  line up.
- Canvas cells are whole device pixels; a small viewport makes the 200 × 100 scenes' dots small.
- Determinism and a passing capture are technical results. They do not grant visual acceptance.

The pieces and the canvas glyph atlas adapted from `dist/mount.js` come from the vendored ascii.rest
bundle in `../../vendor/ascii-rest/`; its `manifest.json` records the npm tarball, upstream revision
and per-file hashes. `LICENSE.ascii-rest` travels with every scaffold.
