# Design

## Source and provenance

The vendored bytes come from the npm tarball `ascii.rest@0.4.0` (integrity
`sha512-lqKc…Ivw==`). Its `dist/` is byte-identical to `tsc -p tsconfig.build.json` run at upstream
revision `1848fa567573e922caa76f95a158b3b7a19043dc` with the lock-pinned TypeScript 7.0.2, and the
user's fork 2233admin/ascii sits at the same revision with no commits of its own, so the manifest
records the upstream repository as the source and the fork as an alias. Pieces are self-contained
ES modules (`export const meta`, `export default function (options) → frame(t, env)`) with no
imports, no `Math.random`, no `Date` and no DOM, so the eleven curated pieces need no other runtime
module. `dist/types.d.ts` (the contract) and `dist/mount.js` (the renderer whose canvas glyph atlas
the player adapts) are kept as reference; the rest of the package is not bundled. The bundle keeps
the package's `dist/` layout, which needs a `.gitignore` exception because the repository ignores
`dist/` directories, and `-text` in `.gitattributes` keeps the bytes exact on every checkout.
Vendored size: 15 files, 108,359 bytes.

## File ownership

| Path | Owner | Notes |
| --- | --- | --- |
| `skill/vendor/ascii-rest/upstream/**` | upstream bytes | never edited; refreshed only from a reviewed revision |
| `skill/vendor/ascii-rest/manifest.json` | this repository | provenance, per-file hashes, piece behaviour |
| `skill/tools/ascii-art/study.html`, `ascii-art.js`, `presets.js` | this repository | copied unchanged as `index.html`, `ascii-art.js`, `presets.js` |
| `skill/tools/ascii-art/scaffold.cjs` | this repository | writes `pieces.js` from the vendor bundle, verifying each hash |
| `skill/tools/visual-craft/scaffold.cjs` | this repository | owns the template list for `composition scaffold` |

The visual-craft and art-motion templates keep their files and behaviour. No artifact shape, path or
public command changes, so nothing migrates.

## Loading offline

Chromium refuses ES-module files on a `file://` page unless it runs with
`--allow-file-access-from-files`; a person opening `index.html` from disk has no such flag, while a
`data:` URL import works on any page (both checked in headless Chrome 152). The existing templates
open from disk, so this one keeps that property: every script is classic, `pieces.js` holds each
piece's exact module text as an ASCII-escaped string, and the player imports it through a `data:`
URL. One copy of the bytes travels with the project, its hashes are checked at scaffold time and by
the tests, and no server is needed. An ES-module page with verbatim files was rejected because it
works only through a server or the capture flag.

## Time and determinism

Upstream promises that the same `t` gives the same frame, which holds for a fresh piece played
through the same calls but not for arbitrary call orders. Measured on the vendored pieces:
doom fire advances its simulation by the time since the previous call, clamped to 0.25 s, so a
fresh piece shows the same frame for 1 s and 2 s; the coloured scenes' text depends on `t` alone,
but their `env.color` comes from a nearest-colour cache filled by the first exact colour in each
bucket, so colour indices depend on earlier frames. The other nine pieces do not depend on call
history.

The player therefore puts frames on the preset's sample grid, frame k at k / fps seconds, and
evaluates frame k as the k-th call of a fresh piece played from 0 with one persistent `env`
(`paper` from the ink or ground, one `Uint8Array` for colour), as `mount()` would have played it.
A forward seek continues the current piece; a backward seek starts a fresh one. This is uniform for
all pieces, needs no per-piece flag, and makes a seeked frame equal the live preview's frame at the
same grid time. The cost is linear in the seek time, bounded by `duration × fps ≤ 3600` per preset;
a cold seek to the end of the slowest shipped preset (ocean-sunset, 8 s at 15 fps) took about 0.6 s
in Node. The manifest records each piece's call-history class so the tests can confirm it.

## Capture contract and preset selection

The page keeps the existing contract: `window.renderStudy(progress)` draws `progress × duration`,
and `window.__timelines["ascii-art"]` exposes `seek(t)`, `time()`, `duration()` and `pause()`, the
seek that `composition capture --seek` calls. Both stop the live preview and set capture mode,
which hides the controls so the image and `elements.json` hold only the art on its ground. An
inline script registers hooks that throw until the player draws its first frame, and the player's
hooks throw while it cannot draw, so a capture fails instead of photographing an empty page.

A preset is chosen by URL hash, then `?preset=`, then `data-preset` on `<html>`, then the first
row. `composition capture --composition` opens a file without a query, so it captures the
`data-preset` default; another preset is captured through `--url` from a local static server, or
from a copy of `index.html` with another `data-preset`. Adding a capture flag or URL fragments to
`--composition` would change a shared CLI contract for one template, and generated per-preset entry
pages would duplicate the page and drift.

## Drawing

A mono piece is text in a `<pre>` in the preset's ink, `line-height: 1.2` and the font stack
ascii.rest uses, sized from the measured advance to fit the stage. A piece with a palette is drawn
on a canvas as ascii.rest's `mount()` does: each (character, colour) pair is drawn once into an atlas
slot and copied into its cell. Cells are whole device pixels, so they tile exactly, and every frame
is redrawn in full on the preset's ground, so the pixels depend only on the frame, not on what was
drawn before.

## Live preview

Without a reduced-motion preference the page plays a looping preview over the preset's duration on
`requestAnimationFrame`, pausing while the document is hidden; looping back starts a fresh piece,
so it stays on the same grid as a seek. With `prefers-reduced-motion: reduce` it holds the first
frame and the play control reads "Play anyway", following ascii.rest's own guidance. The preview's
clock never reaches the capture path.

## Visual direction and technical conformance

The presets' inks and grounds are starting points chosen for contrast; they are not a style
decision for any project. Tests and captures establish technical behaviour: determinism, offline
loading, the capture contract and non-blank frames. Visual acceptance stays with the user.
