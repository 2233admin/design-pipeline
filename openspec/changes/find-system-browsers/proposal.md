## Why

Every browser-backed tool (film timeline and layout capture, composition capture, score render,
interaction probes, Art Motion render and tests) resolves its browser with `resolveChrome`:
`--chrome`, then `PUPPETEER_EXECUTABLE_PATH`, then the HyperFrames `chrome-headless-shell`
download cache. It never looks at the browsers already installed on the machine.

- **A user with a browser is told there is none.** Without the HyperFrames download, a machine
  with Chrome or Edge (Edge ships with every Windows 10/11 install) gets `headless Chrome not
  found` and must find and pass the executable path by hand.
- **Three Art Motion tests fail instead of skipping** when no browser is found
  (`art-motion-runtime`, two in `art-motion-tools`); every other browser test skips.
- **The FF tracking HUD probe has its own copy** of the cache scan and alone reads
  `HYPERFRAMES_BROWSER_PATH`, so it can choose a different browser from every other tool.
- **Nothing records which browser rendered.** Once a system browser can be used, evidence from
  Edge and from the pinned headless shell must be told apart.

## What Changes

- One shared resolver in `skill/scripts/browser-locate.cjs`, replacing `resolveChrome`:
  `--chrome`, then `PUPPETEER_EXECUTABLE_PATH`, then the HyperFrames headless shell (pinned, the
  most reproducible), then system Chrome, Edge and Chromium. Owner decision (2026-10-14):
  download first, system browsers as fallback.
- The not-found error lists every location checked and the fixes (install Chrome or Edge, run
  `npx hyperframes browser ensure`, or pass `--chrome`).
- The Art Motion `render-report.json` and the interaction capture record the browser executable
  and its version.
- The FF tracking HUD probe uses the shared resolver; `HYPERFRAMES_BROWSER_PATH` is dropped.
- The three Art Motion tests skip on `TOOL_MISSING` like the others.

## Capabilities

- `design-pipeline`: ADDED `Browser-backed tools find an installed Chromium browser`.

## Reuse

- System install locations follow Puppeteer's `@puppeteer/browsers` Chrome paths and Playwright's
  `msedge` channel paths; no dependency is added (puppeteer-core still comes from the project).
- The existing `--chrome` flag and `TOOL_MISSING` code; callers and tests keep their skip logic.

## Impact

- Users with Chrome, Edge or Chromium installed can capture, probe and render without a download.
- Reports name the browser, so a render from a system browser is distinguishable from one made
  with the pinned headless shell.
- Issue #116.
