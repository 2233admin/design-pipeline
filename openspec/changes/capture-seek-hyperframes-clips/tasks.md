# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `composition` spec delta.
- [x] 1.2 `npm exec -- openspec validate capture-seek-hyperframes-clips --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `film-capture-core.cjs`: `resolveHyperframesRuntime` beside `resolvePuppeteer`.
- [x] 2.2 `capture-composition.cjs`: runtime injection for local HyperFrames compositions, `seekPage` through `__player.renderSeek`, refusal with the PNG-sequence render command, `seek` in the result, `--seek` validation.

## 3. Tests and docs

- [x] 3.1 `tests/composition-capture-seek.test.cjs` (real `hyperframes render` frames vs captures, missing runtime local and served, timeline-only page, invalid time); registered in `scripts/test-manifest.json`.
- [x] 3.2 `references/composition-gate.md`: what `--seek` drives and when it refuses.
- [x] 3.3 CHANGELOG entry.

## 4. Verification

- [x] 4.1 Reproduced and fixed on a `film scaffold` project against `hyperframes render --format png-sequence` frames and through `hyperframes preview`.
- [x] 4.2 `npm test`: all files pass; failures in the shared run were disk-full (ENOSPC) and load timeouts, rerun file by file green.
