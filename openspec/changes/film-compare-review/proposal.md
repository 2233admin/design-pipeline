## Why

Relates to #215 (motion2code internalization, phase 3). Phases 1 and 2 give the agent frame pairs and rebuild
rules, but the owner still judges a replicate film by watching the draft alone and remembering the reference.
Small timing and alignment differences (a beat two frames late, a shape a few pixels off) are invisible that way,
and the owner cannot point at a moment except by describing it. lovisdotio/motion2code (MIT, `0f00328`) answers
both with a synced compare page (frame stepping, onion skin) and a side-by-side proof video. Video review tools
do the same: Frame.io and SyncSketch play two versions on one clock with frame stepping, overlay and wipe, and
let the reviewer cite a frame.

## What Changes

- New `film compare --project-root <dir>`: for a storyboard with `referenceAnalysis`, writes
  `evidence/compare/index.html` (self-contained, opens from disk, no server) and `evidence/compare/compare.json`.
  The page plays the reference source and the draft render on one clock: space plays and pauses, arrows step one
  frame, Shift+arrows one second, an overlay slider (onion skin), a wipe divider, an A/B toggle, cut ticks for
  both videos and the five worst frame pairs as jump markers. It shows the frame number and time and copies a
  citation (`f082 @ 3.417 s`) for the owner's feedback.
- New `film proof --project-root <dir>`: writes `renders/side-by-side.mp4` (reference left, render right, label
  band, portrait layout for portrait sources, length of the render, the render's audio) and a sidecar with both
  input hashes. Evidence for sharing; never an acceptance.
- In film replicate mode with `referenceAnalysis`, the owner review step requires a current compare page (its
  recorded hashes match the reference, the analysis and the draft) and names the page and the proof video in the
  ask. A stale or missing page is a `run` step (`film compare`), like the product sample cut.
- No new gate and no score: the page and the proof measure nothing; frame-pair scores still only rank.

## Capabilities

- `design-pipeline`: ADDED `Owner reviews a replicate film against its reference on one clock`.

## Reuse

- `referenceAnalysis` and its bound source (`film-gate-reference-compare`); the frame-pair report for markers.
- `draftRender` and the film review step in `workflows/film.cjs`; FFmpeg probe/encode helpers already used by
  `reference-video-core.cjs`; the existing browser launcher for the label band.
- No live-composition sync: the owner judges what ships (the render), and the agent already has frame pairs.

## Impact

- `skill/scripts/film-compare-core.cjs` (new: page, proof), `cli-core.cjs` (two film subcommands, options),
  `workflows/film.cjs` (review precondition and ask text), `references/workflow-film.md`, CHANGELOG,
  `THIRD_PARTY_NOTICES.md` (concept credit), tests registered in `scripts/test-manifest.json`.
