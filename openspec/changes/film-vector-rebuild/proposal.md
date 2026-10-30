## Why

Relates to #215 (motion2code internalization, phase 2). Film replicate mode can rebuild a reference clip, but for
flat motion design rebuilt as vector code (routes `dom`, `canvas2d`, `css3d`) four things that lovisdotio/motion2code
(MIT, `0f00328`) treats as hard rules are unchecked here:

- **Determinism.** Frame-pair comparison and exact-frame export assume `seek(t)` draws the same frame however the
  timeline got to `t`. A `requestAnimationFrame` loop, `Date.now()` or unseeded randomness breaks that silently, and
  the comparison then measures a frame the film never shows.
- **No copying the source.** An agent can "rebuild" a clip by embedding the reference video, its decoded frames or a
  traced bitmap. Every comparison then passes and nothing was rebuilt.
- **Exact words.** Generated references misspell text; the rebuild must use the brief's words, not the video's.
- **Same timing.** Compressing or padding beats changes the film; durations must stay the reference's.

## What Changes

- In film replicate mode with a vector route and a declared `referenceAnalysis` (from `film-gate-reference-compare`),
  `film check` adds:
  - `seek-nondeterministic`: frames captured at sampled times by cold load + seek, by forward seeks and by a backward
    seek from the end must be pixel-identical; failing times are listed.
  - `reference-embedded`: the composition and its local assets must not load the reference source, any file from its
    analysis directory, or any raster whose sha256 matches one of them; `<video>`, `<img>`, SVG `<image>`, CSS
    `url()` and raster data URIs are allowed only when listed in `storyboard.rendering.assets` with a source that is
    not the reference.
  - `text-mismatch`: strings declared in `storyboard.reference.text` must appear exactly in the composition's visible
    text at their declared times.
  - `duration-compressed`: the storyboard duration must equal the reference duration within one frame.
- `reference analyze-video --palette` adds the clip's flat palette (hex, share, first and last time seen) to the
  study, colours within ΔE2000 2 merged.
- `references/film-vector-rebuild.md`: the method in our words (study and shot list, stage at source resolution,
  shapes drawn around their own origin, one timeline plus a pure `draw(t)` for procedural parts, loop closed in code,
  fix the worst frame pairs first, report differences honestly).

## Capabilities

- `design-pipeline`: ADDED `Vector film rebuilds are deterministic, original and faithful to the reference's words and timing`.

## Reuse

- `film check`, HyperFrames `window.__timelines` seek, `capture-composition.cjs`, the reference analysis and its
  hash binding, `loop-seam-jump`. No `window.anim` contract and no Python scripts.

## Dependencies

- `film-gate-reference-compare` (`referenceAnalysis` in the storyboard).
