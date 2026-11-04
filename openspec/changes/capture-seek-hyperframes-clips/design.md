## Decisions

1. **Use the runtime, not a copy of its rules.** The renderer's frame bridge defines `__hf.seek(t)` as
   `__player.renderSeek(t)`; `renderSeek` applies clip visibility (`visibility: hidden` outside the window, the
   window is `[start, start + duration)`), seeks the registered timelines and syncs media. Calling it gives the same
   frame the render captures, including future runtime behaviour, so no clip-window logic is re-implemented here.
   The clip-window emulation in `layout-probe.js` stays the fallback for `film check` only.
2. **Where the runtime comes from, and how the page is recognised.** After the first load the DOM is queried for
   `[data-composition-id]` (a mention in a comment or script string does not count; review of #277). A HyperFrames
   page is then reloaded with what the renderer installs before any script: `__HF_EXPORT_RENDER_SEEK_CONFIG`
   (the render-mode script's shape and defaults, with the render frame rate) and, when the page has no runtime of
   its own, the project's `hyperframes/dist/hyperframe.runtime.iife.js`. Resolution bases are the composition
   directory then the working directory (same as `puppeteer-core`). The runtime reads the config only at start
   (setting it after load left 30 fps in a measurement), hence the reload. The pinned film scaffold (0.8.137), the
   workspace (0.8.164) and 0.9.9 ship that file and behave the same (independent review).
3. **Frame rate, quantisation and range.** `hyperframes render` uses `--fps`, else the root's `data-fps`, else 30;
   the capture uses `data-fps` (integer, decimal or rational such as `30000/1001`) else 30. `renderSeek` snaps the
   time to that frame grid, so the result records `appliedSec` from `__player.getTime()` next to the requested
   `atSec`, plus `fps` and `durationSec`. Measured: `--seek 3.99` gives 95/24 s at 24 fps, 239/60 s at 60 fps,
   119/30 s with no `data-fps`. The duration is the renderer's (`__player.getDuration()`, else the root's
   `data-duration`); the runtime clamps later times to the end, a frame the render never produces, so `--seek` at
   or past it fails with `SEEK_OUT_OF_RANGE` naming the duration and the last frame time.
4. **Refuse instead of guessing.** No runtime file, a served page without a runtime, or a runtime that never
   reports ready (`__renderReady` and `__player.renderSeek`, 30 s) fails with `TOOL_MISSING` and names
   `npx --no-install hyperframes render --format png-sequence --output <dir>` and how frame numbers map to seconds.
5. **Error codes reach the caller.** `runKernel` turned every kernel exit 1 into `KERNEL_FAILED`. The kernel now also
   prints its JSON error on stdout, and `runKernel` keeps codes in `PROPAGATED_KERNEL_CODES` (`TOOL_MISSING`,
   `SEEK_OUT_OF_RANGE`), the mechanism PR #251 adds for `REFERENCE_*`; when both land the set is their union.
   `capture-web-evidence.cjs` is the only other kernel printing JSON errors, so its `TOOL_MISSING` is now kept too.
6. **Only `--seek` changes.** Without `--seek` the capture is the page's load state as before; `appearance-ledger`
   and the design-system previews call capture without it and are unaffected.
7. **Result shape.** `seek: {atSec, appliedSec, fps, durationSec, clock}` (only `atSec` and `clock` for timeline pages) is added to the CLI result only (not to `elements.json`), so
   `verify composition` and existing `elements.json` readers see no change.
8. **Compatibility with open work.** PR #266 turns the kernel's IIFE into `main()` and exports `extract`; this change
   adds `seekPage` beside `extract` and edits only the body, so the two merge cleanly. The planned
   `capture-stable-frames` order (navigate, seek, freeze, settle) still holds: seeking finishes before the
   screenshot.

## Evidence

- `film scaffold` project with `#world` 0-12 s, `#late` 5-8 s, `#early` 0-2 s, rendered with
  `hyperframes render --format png-sequence --fps 2`: before, every capture listed all three clips; after, 0.5 s
  shows world+early, 2 s world only (end of `[0, 2)`), 6 s world+late, 8 s and 11 s world only, matching the render
  frames (lit-pixel masks differ by under 0.5 %, text antialiasing).
- The same project served by `hyperframes preview`: `--url .../preview --seek 0.5|6` reports
  `clock: hyperframes-runtime` with the same visible clips.
- Regression test (`tests/composition-capture-seek.test.cjs`) renders a 4 s fixture with the workspace HyperFrames
  and compares captures at 0.5, 1, 2.5 and 3.5 s with the render frames: 0 unmatched lit pixels after the fix,
  3160 to 6945 before.

## Risks

- The runtime is a 0.5 MB script evaluated per capture; it only loads with `--seek` on HyperFrames pages.
- A project whose installed HyperFrames differs from the one used to render could differ in runtime behaviour; the
  capture uses the project's install, which is the one its `render` script runs.
