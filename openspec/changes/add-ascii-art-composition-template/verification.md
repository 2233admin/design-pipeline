# Verification — 2026-10-13

- Implementation commit: `9fc502ee75cbe1124cc9a1c9324535d0084f6bb6`
- Tested tree: `181dea36040bc72d2a860bc9255f55c627a66325` (base `origin/main` `27be052`)

This record was committed afterwards; it and the task checkboxes are the only later changes.

## Component Conformance

Not evaluated. The checks below are technical results.

| Check | Command | Result |
| --- | --- | --- |
| Focused tests | `node --test tests/ascii-art.test.cjs tests/designer-pipeline-cli.test.cjs` | 21 passed, 0 failed, 0 skipped |
| Full QA | `FONTTOOLS_PYTHON=<fonttools-python> npm test` | exit 0; repository tests 1265: 1261 passed, 0 failed, 4 skipped (three GEPA tests without the optional pinned GEPA runtime, one case-collision test on a case-aliasing filesystem); all nine `tests/ascii-art.test.cjs` tests ran and passed; installed-package CLI tests 12/12; browser self-tests passed |
| OpenSpec | `npm run specs:check` | exit 0; 71 passed, 0 failed |

## Scenario evidence

| Scenario | Evidence |
| --- | --- |
| Scaffold an offline project | `ascii-art scaffold writes a self-contained project with the exact vendored pieces`; `the scaffolded page plays offline from file:// and redraws the same frame for the same time` (no flag, no request outside the directory) |
| Preserve authored work and refuse altered sources | the scaffold test's refusal check; `a changed vendored piece stops the scaffold instead of shipping altered art` |
| Verify the snapshot | `vendored ascii.rest 0.4.0 bytes match manifest.json and keep the MIT notice`; `manifest piece records match each module and its call-history behaviour` |
| Seek a piece that carries a simulation | `a seek into doom fire shows the fire as played, not a fresh piece's frozen first moment` |
| Seek a coloured scene | `every preset gives the same frame …` (text and palette indices) and the page test's cold/reordered canvas pixels |
| Reject an inconsistent preset | `presets that disagree with the table's fields or with their piece are refused`; the page test's unknown preset |
| Capture a seeked frame | `composition capture --seek photographs the seeked frame of a mono and a coloured preset` (1 s twice identical, 2 s differs, glyphs in the preset ink) |
| Capture another preset without editing code | same test, `--url …?preset=night-coast`: ground plus at least eight palette colours |
| Fail instead of capturing an empty page | same test: unknown preset and a copy without `ascii-art.js` exit 1 with no screenshot |
| Reduced motion is preferred / live viewing then capture | the page test's reduced-motion and no-preference pages |

## Real CLI smoke

From a separate project directory (local evidence `.design-pipeline/ascii-template/` with
`report.md`, `smoke.cjs`, `smoke-results.json`): the scaffold wrote five files (125,601 bytes);
`composition capture --seek` wrote 1920×1080 stills of donut (`--composition`), doom-fire,
synthwave, tv-static, night-coast and ocean-sunset (`--url` from a local static server), each
passing `verify composition --profile frame` with warnings only; a repeated night-coast capture
was byte-identical. No existing tool renders the page to video, so a labelled 2 s night-coast clip
was assembled from 30 seek captures with ffmpeg (1280×720, 15 fps, 30 frames).

## Limits and Visual Acceptance

Vendored size: 15 files, 108,359 bytes. Mono pieces render in the system monospace font; in the
synthwave still two rows run past the grid where a glyph fell back to a wider face. Pixels differ
between machines. Visual Acceptance is not evaluated and belongs to the user.
