## Why

HyperFrames, the film runtime, is at v0.8.221; the package scaffolds 0.8.137 (after `refresh-upstream-snapshots`
unifies the pins). Upstream retired the eight workflow skills our route list points at (`motion-graphics`,
`product-launch-video`, `pr-to-video`, `faceless-explainer`, `general-video`, `music-to-video`, `embedded-captions`,
`talking-head-recut`) in favour of one `hyperframes` skill with type references; `check` gained a craft section
(`line_unread`, `dead_stretch`, `text_below_floor`, `first_frame_empty`, `film_silent`) and lost-audio detection;
new rules require footage treatment through `media-treatment` instead of CSS filters, `@font-face` for non-bundled
fonts, no `crossorigin` on media and scene styles inside `<template>`; timelines may be wrapped (`__hfReal`,
`seekGsapTimeline`); encoder settings changed, so golden render bytes will differ. New tools are useful to us:
`snapshot --review` (beat sheet, seam strips, phone sheet), `timeline --json`, `beats`, `normalize-audio`,
`media-treatment` with `.cube` LUTs.

Owner decision (2026-10-30): our product-film contract leads. HyperFrames is the runtime; its creative flow
(SPEC.md-first, three storylines) is not adopted, and its new checks become evidence inside our gates.

## What Changes

- Bump to 0.8.221 (`f4bbbe1`) in `HYPERFRAMES_VERSION`, the evals, the notice and every document that names the
  version.
- `references/hyperframes.md`: replace the retired route list with upstream's single skill and its type references,
  stating that our storyboard and gates decide the film and upstream type files are read as technique.
- `verify film-render` and `film check` run `hyperframes check --json` and record its craft and audio sections as
  findings: lost audio and `first_frame_empty` are errors (they are broken output); the other craft items are
  warnings. `snapshot --review` output is added to the evidence directory for the owner's review.
- Scaffold templates and golden cases follow the new composition rules; `<audio>` elements get ids.
- Seek paths in `film-capture-core.cjs`, `film-timeline-core.cjs` and `capture-composition.cjs` unwrap `__hfReal`
  and use the runtime's seek when present.
- Golden renders are re-baselined; frame comparisons, not byte hashes, decide whether a golden still passes.

## Capabilities

- `design-pipeline`: ADDED `Film runtime upgrade keeps the pipeline's contract in charge`.

## Dependencies

- `refresh-upstream-snapshots` (one pinned version before this bump).
