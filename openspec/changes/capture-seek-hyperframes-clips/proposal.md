## Why

`composition capture --seek <t>` seeks only the GSAP timelines registered in `window.__timelines`. A HyperFrames
composition also has clip windows (`data-start`/`data-duration` on `.clip` elements), which the HyperFrames runtime
applies when it seeks; a bare `index.html` loaded in the capture browser has no runtime, so every clip stays visible.
Reproduced on a `film scaffold` project with a 5-8 s clip: `--seek 0.5` and `--seek 11` both show the clip, while
`hyperframes render --format png-sequence` draws nothing there (#269). Layout, contrast and overlap checks on such a
capture measure content that never appears in the film.

## What Changes

- On a page with a `data-composition-id` root, `--seek` seeks through the HyperFrames runtime's `__player.renderSeek`,
  the call the renderer's frame bridge makes for every frame, then waits for the runtime's seek completion and fonts.
- For `--composition <file>` the runtime is the project's own (`hyperframes/dist/hyperframe.runtime.iife.js`,
  resolved from the composition directory then the working directory, like `puppeteer-core`), loaded before the
  page's scripts as the renderer injects it. A `--url` (the HyperFrames preview) already carries its runtime.
- Without a runtime, `--seek` on a HyperFrames page is refused (`TOOL_MISSING`) with the fix: install the project, or
  take the frame from `hyperframes render --format png-sequence`.
- The page is recognised by a `[data-composition-id]` element in its loaded DOM, then reloaded with the render
  frame rate (`data-fps`, else 30) set before the runtime starts, as the renderer does.
- The runtime snaps the time to that frame rate; the result records `seek: {atSec, appliedSec, fps, durationSec,
  clock}`. A time at or past the duration fails with `SEEK_OUT_OF_RANGE`: the render has no frame there.
- Pages without such an element keep the timeline seek (`clock: timeline`), the vocabulary the film layout probe uses.
- `--seek` must be a non-negative number. The CLI keeps the kernel's `TOOL_MISSING` and `SEEK_OUT_OF_RANGE` codes
  instead of `KERNEL_FAILED`.

## Reused

- `film-capture-core.cjs` gains `resolveHyperframesRuntime` beside `resolvePuppeteer`; no new gate, schema or flag.
- `runKernel` code propagation uses the allow-list mechanism of PR #251.
- The layout probe (`film check`) keeps emulating clip windows when it has no runtime; this change does not touch it.

## Out of scope

- A capture without `--seek` is unchanged (the page's load state).
- Film frame checks in the film guides stay on the PNG-sequence render (#267); this change makes `--seek` agree with
  it rather than replacing it.
