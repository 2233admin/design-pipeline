## Why

Outside a HyperFrames project, `composition capture` and the other browser-backed commands fail with
`puppeteer-core not found`. The error says to run `npm i hyperframes`, which is wrong for a project
that does not use HyperFrames. The concepts-stage instruction in `workflows/directions.cjs` (and the
failure hints in `directions-core.cjs`) give the capture command without `--puppeteer-module`, so an
agent following them stops at the thumbnail capture. Tracked in 2233admin/design-pipeline#198.

The reference docs were corrected in `docs: say when composition capture needs --puppeteer-module`;
the runtime text still needs the same fix.

## What Changes

- The `puppeteer-core not found` error names both fixes: `npm i puppeteer-core` in the project, or
  `--puppeteer-module <absolute path to puppeteer-core>`. The HyperFrames hint stays only where a
  HyperFrames project is detected.
- The concepts-stage instruction and the direction failure hints give capture commands that work in
  a project without HyperFrames: they name `--puppeteer-module` with the path `doctor` reports.
- `doctor` reports whether `puppeteer-core` resolves from the project and, when it does, its path.

## Capabilities

- `design-pipeline`: ADDED `Browser capture errors name both fixes`, `Direction capture instructions
  run without HyperFrames`.

## Reuse

- The existing `resolvePuppeteer` in `film-capture-core.cjs` and `capture-composition.cjs`; no new
  resolver.
- `doctor` and its tool report; the direction failure hints in `directions-core.cjs`.

## Impact

- Error text and instruction strings only; no change to capture results, receipts or gates.
- Affects `composition capture`, `film capture-timeline`, `verify interaction`, `art-motion render`,
  and the direction-preview instructions.
