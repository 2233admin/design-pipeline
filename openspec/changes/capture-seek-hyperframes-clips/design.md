## Decisions

1. **Use the runtime, not a copy of its rules.** The renderer's frame bridge defines `__hf.seek(t)` as
   `__player.renderSeek(t)`; `renderSeek` applies clip visibility (`visibility: hidden` outside the window, the
   window is `[start, start + duration)`), seeks the registered timelines and syncs media. Calling it gives the same
   frame the render captures, including future runtime behaviour, so no clip-window logic is re-implemented here.
   The clip-window emulation in `layout-probe.js` stays the fallback for `film check` only.
2. **Where the runtime comes from.** A local composition gets `hyperframes/dist/hyperframe.runtime.iife.js` from the
   project's install via `page.evaluateOnNewDocument`, before any page script, as the renderer injects it at the
   head start. Resolution bases are the composition directory then the working directory (same as `puppeteer-core`).
   The pinned film scaffold (0.8.137) and the workspace (0.8.164) both ship that file. Pages are recognised by a
   `data-composition-id` attribute in the file (local) or in the DOM (URL).
3. **Refuse instead of guessing.** No runtime file, or a served page whose runtime never reports ready
   (`__renderReady` and `__player.renderSeek`, 30 s while a runtime is present; immediately when none is), fails with
   `TOOL_MISSING` and names `npx --no-install hyperframes render --format png-sequence --output <dir>` and how frame
   numbers map to seconds. The refusal happens before the browser launches for local files.
4. **Only `--seek` changes.** Without `--seek` the capture is the page's load state as before; `appearance-ledger`
   and the design-system previews call capture without it and are unaffected.
5. **Result shape.** `seek: {atSec, clock}` is added to the CLI result only (not to `elements.json`), so
   `verify composition` and existing `elements.json` readers see no change.
6. **Compatibility with open work.** PR #266 turns the kernel's IIFE into `main()` and exports `extract`; this change
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
