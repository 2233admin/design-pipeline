# Tasks

## 1. Source

- [x] 1.1 Fetch npm `ascii.rest@0.4.0`, rebuild upstream `1848fa5` with its lock-pinned TypeScript 7.0.2 and confirm the tarball's `dist/`, `LICENSE` and `package.json` are byte-identical; confirm the fork 2233admin/ascii is at the same revision.
- [x] 1.2 Vendor `LICENSE`, `package.json`, `dist/types.d.ts`, `dist/mount.js` and the eleven curated piece modules under `skill/vendor/ascii-rest/upstream/`, with `manifest.json` (version, tarball integrity, repository, revision, fork alias, per-file sha256, snapshot hash, piece behaviour), a `.gitignore` exception for its `dist/` layout and `-text` in `.gitattributes`.
- [x] 1.3 Measure each curated piece's call-history behaviour (doom fire's simulation, the scenes' colour cache) and the cost of replaying it.

## 2. Template

- [x] 2.1 Add `skill/tools/ascii-art/ascii-art.js`: preset and piece validation, the sample-grid replay, the `<pre>` and canvas renderers, the capture hooks and the reduced-motion live preview.
- [x] 2.2 Add `presets.js` (twelve presets) and `study.html` with throwing capture hooks until the first frame.
- [x] 2.3 Add `scaffold.cjs` writing `pieces.js` from the hash-checked vendor bundle, and register `ascii-art` in the `composition scaffold` template list (help text follows it).

## 3. Documentation

- [x] 3.1 Write `skill/tools/ascii-art/README.md` (presets, capture, time, live sites through npm/CDN, limits) and add rows to `skill/tools/README.md` and `skill/vendor/README.md`, plus the installation note.
- [x] 3.2 Add the `THIRD_PARTY_NOTICES.md` section, the CHANGELOG `[Unreleased]` entry and the load-bearing files to `skill/references/package-resources.json`.

## 4. Verification

- [x] 4.1 Add `tests/ascii-art.test.cjs` to `scripts/test-manifest.json` and `npm run sources:check`, and update the CLI help assertion in `tests/designer-pipeline-cli.test.cjs`.
- [x] 4.2 Run `node --test tests/ascii-art.test.cjs tests/designer-pipeline-cli.test.cjs`, then full `npm test` (with `FONTTOOLS_PYTHON` set to `<fonttools-python>`) and `npm run specs:check` on the committed tree; record the results in `verification.md`.
- [x] 4.3 Smoke the real CLI from a project directory: scaffold, capture stills of at least four presets including both coloured scenes with `composition capture --seek`, and record the commands, outputs and limits in local `.design-pipeline/` evidence.
- [x] 4.4 Report Component Conformance and Visual Acceptance separately; visual acceptance belongs to the user.

## 5. Cell grid

- [x] 5.1 Choose between drawing mono pieces on the canvas grid and bundling a font; record the choice and the reason in `design.md` (Bundled font).
- [x] 5.2 Subset JetBrains Mono 2.304 Regular (OFL 1.1) to printable ASCII and the 42 non-ASCII characters of the eleven pieces into `skill/tools/ascii-art/fonts/` with `OFL.txt` and `LICENSES.md`; add the files to `package-resources.json`, `.gitattributes` and `THIRD_PARTY_NOTICES.md`.
- [x] 5.3 Write `font.js` (a `data:` URL) and `LICENSE.font` from `scaffold.cjs`; load the face in `ascii-art.js` before the first frame for both renderers and fail without it.
- [x] 5.4 Add the regression `every preset draws each row on the cell grid, whatever monospace fonts the host has` (each preset at progress 0.1, 0.45 and 0.8; every `<pre>` row against a `'0'.repeat(cols)` probe within 0.1 px; whole-pixel canvas cells) and `the bundled font covers every character the pieces contain or draw, at one cell wide` (including a copy without `font.js`).

Regression run with `node --test --test-name-pattern="cell grid" tests/ascii-art.test.cjs`
(Windows host whose monospace font is Consolas, viewport 1280 × 720).

Before, the new test file against the player at `ae32602`: fails with 34 rows off the grid.

```text
✖ every preset draws each row on the cell grid, whatever monospace fonts the host has (2531.3473ms)
ℹ tests 1
ℹ pass 0
ℹ fail 1
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + [
  +   'sparks at 0.8s: row 6 is 981.89px, the 64-cell grid is 971.19px ("▜█▒")',
  +   'sparks at 0.8s: row 8 is 981.89px, the 64-cell grid is 971.19px ("▝▀▄▄▄▄▄▄·")',
  +   'sparks at 0.8s: row 9 is 992.61px, the 64-cell grid is 971.19px ("▗▄▓▓▀▀▀▀▀▀▓▓▄▖")',
  …   (27 more sparks rows at 0.8 s, 3.6 s and 6.4 s, 981.89 to 1046.17 px)
  +   'synthwave at 0.8s: row 19 is 1165.22px, the 65-cell grid is 704.03px ("▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔│▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔")',
  +   'synthwave at 3.6s: row 17 is 1165.22px, the 65-cell grid is 704.03px ("▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔│▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔")',
  +   'synthwave at 3.6s: row 20 is 821.16px, the 65-cell grid is 704.03px ("▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁│▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁")',
  +   'synthwave at 6.4s: row 22 is 825.48px, the 65-cell grid is 704.03px ("▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁│▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁")'
  + ]
  - []
```

After, with the bundled font:

```text
✔ every preset draws each row on the cell grid, whatever monospace fonts the host has (3302.659ms)
ℹ tests 1
ℹ pass 1
ℹ fail 0
```

## 6. Coloured glyphs by default

- [x] 6.1 Record why the template read as monochrome (ascii.rest's colour comes from its full-colour scenes; nine of the eleven presets were one-ink text) and the colour design in `design.md` (Colour), including the reversal of the `<pre>` default.
- [x] 6.2 Add `paint` rules (`glyphs`, `rows`, `by` glyph/row/column, `colours`) and `mono` to the preset fields in `ascii-art.js`: validate them, compile a text preset's paint into a palette and a per-cell fill, draw every coloured frame on the canvas atlas, keep `?mono` / `mono: true` as the one-ink `<pre>`, take `paper` from the ground in both modes, and refuse paint or mono on a scene and a text preset with neither.
- [x] 6.3 Place canvas glyphs as a `<pre>` line box places them (ascent-to-descent box centred on the cell) and draw block elements half a pixel wider on each side, so block glyphs tile without seams.
- [x] 6.4 Give each text preset in `presets.js` a palette mapped by glyph, row or column (doom fire by heat, synthwave sun and floor by row, fireworks by column, the rest by glyph).
- [x] 6.5 Vendor `dist/pieces/aurora-fjord.js` from the same integrity-checked `ascii.rest@0.4.0` tarball (bytes equal to the `1848fa5` build), with its manifest record (`palette-cache`, confirmed by the history test), snapshot counts, package resource and preset row; it adds no character to the font subset.
- [x] 6.6 Add the regressions `in colour, the default, every preset draws at least three palette colours among its drawn cells mid-sequence` (each on at least 2% of the drawn cells at duration / 2, and no glyph a text preset draws in its duration falling back to the ink), `mono draws a text preset as the same text in one ink, by preset field or by option, and a scene refuses it` and `the page draws every preset in its palette colours, and a text preset with ?mono in its ink alone`; run the grid test in both modes with each mode's renderer asserted; update the page, capture and refusal tests for the coloured default.
- [x] 6.7 Update the tool README, spec delta, proposal, CHANGELOG, third-party notice, font provenance, installation note and tools index.

Regression run with `node --test --test-name-pattern="in colour, the default|mono draws a text preset|palette colours, and a text preset" tests/ascii-art.test.cjs`
(same Windows host, viewport 1280 × 720).

Before, the new test file against the player and presets at `5527373`: every text preset draws its
one ink, on the `<pre>`, and there is no mono option to ask for.

```text
✖ in colour, the default, every preset draws at least three palette colours among its drawn cells mid-sequence (1005.0319ms)
✖ mono draws a text preset as the same text in one ink, by preset field or by option, and a scene refuses it (0.4982ms)
✖ the page draws every preset in its palette colours, and a text preset with ?mono in its ink alone (2520.4194ms)
ℹ tests 3
ℹ pass 0
ℹ fail 3
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + [
  +   'donut at 4s: 1 colour(s) on 2% or more of 474 drawn cells (#f4efe6 ×474)',
  +   'donut-paper at 4s: 1 colour(s) on 2% or more of 474 drawn cells (#22201c ×474)',
  +   'doom-fire at 4s: 1 colour(s) on 2% or more of 383 drawn cells (#ff8a3d ×383)',
  +   'fireworks at 4s: 1 colour(s) on 2% or more of 52 drawn cells (#fff3d6 ×52)',
  +   'matrix-rain at 4s: 1 colour(s) on 2% or more of 320 drawn cells (#5dfc8d ×320)',
  +   'rotozoomer at 4s: 1 colour(s) on 2% or more of 1275 drawn cells (#e0c9a6 ×1275)',
  +   'sparks at 4s: 1 colour(s) on 2% or more of 480 drawn cells (#ffc861 ×480)',
  +   'synthwave at 4s: 1 colour(s) on 2% or more of 880 drawn cells (#ff5fd2 ×880)',
  +   'tunnel at 4s: 1 colour(s) on 2% or more of 1531 drawn cells (#8fd3ff ×1531)',
  +   'tv-static at 4s: 1 colour(s) on 2% or more of 871 drawn cells (#e8e8e8 ×871)'
  + ]
  - []
  AssertionError [ERR_ASSERTION]: donut is coloured by default
  false !== true
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + [
  +   'donut at 4s: drawn on the pre, 0 palette colour(s) on the canvas',
  …   (the same line for donut-paper, doom-fire, fireworks, matrix-rain, rotozoomer, sparks, synthwave and tunnel)
  +   'tv-static at 4s: drawn on the pre, 0 palette colour(s) on the canvas'
  + ]
  - []
```

After, with paint rules and the mono option:

```text
✔ in colour, the default, every preset draws at least three palette colours among its drawn cells mid-sequence (1842.1975ms)
✔ mono draws a text preset as the same text in one ink, by preset field or by option, and a scene refuses it (1331.545ms)
✔ the page draws every preset in its palette colours, and a text preset with ?mono in its ink alone (3138.1376ms)
ℹ tests 3
ℹ pass 3
ℹ fail 0
```
