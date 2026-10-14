# Design: find installed browsers

## Context

`resolveChrome(explicit)` in `film-capture-core.cjs` is the shared resolver for every
puppeteer-core launch. `skill/tools/ff-tracking-hud/probe.cjs` keeps a private copy. The
Playwright adapter and `tools/browser-automation` use Playwright's own Chromium and are out of
scope.

Mature resolvers checked:

- **Puppeteer** (`@puppeteer/browsers`, `computeSystemExecutablePath`): Chrome only. Windows
  prefixes `PROGRAMFILES`, `ProgramW6432`, `ProgramFiles(x86)`, `LOCALAPPDATA`, with
  `Google\Chrome\Application\chrome.exe`; macOS `/Applications/Google Chrome.app/...`; Linux
  `/opt/google/chrome/chrome`.
- **Playwright** (`msedge` channel): Windows prefixes plus `Microsoft\Edge\Application\msedge.exe`;
  macOS `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`; Linux
  `/opt/microsoft/msedge/msedge`.
- **chrome-launcher / chromium-edge-launcher** (Lighthouse): an explicit option, then an env var,
  then detected installs. Separate packages for Chrome and Edge; neither is a dependency today.

## Decisions

- **Order:** `--chrome` → `PUPPETEER_EXECUTABLE_PATH` → HyperFrames headless shell → Chrome →
  Edge → Chromium. The pinned download stays first because film renders compare frames; a system
  browser auto-updates. Chrome precedes Edge because it is what the tools were built against.
- **Locations:** the Puppeteer and Playwright tables above, plus PATH names on Linux
  (`google-chrome-stable`, `google-chrome`, `microsoft-edge-stable`, `microsoft-edge`, `chromium`,
  `chromium-browser`), `/Applications/Chromium.app/...` on macOS and Chromium's installer location
  (`Chromium\Application\chrome.exe` under the Windows prefixes). PATH is scanned in-process. A
  discovered location must be an executable regular file, else discovery moves on; an explicit
  path that is absent fails with `TOOL_MISSING`, and any other filesystem error is raised as is.
  WSL lookups are not done.
- **No new dependency:** a static table of well-known paths is smaller than adding
  chrome-launcher and chromium-edge-launcher to a package that has no runtime dependencies.
- **Interface:** `resolveBrowser(explicit)` returns the executable path; `TOOL_MISSING` is kept.
  `resolveChrome` is removed and every caller renamed (no alias). An explicit path or env value
  that does not exist fails without falling through, so a typo is not silently replaced.
- **Recording:** reports that already exist gain `browser: {executable, version}` (`version` from
  puppeteer `browser.version()`). Only the Art Motion `render-report.json` and the in-memory
  interaction capture change shape; no receipt schema or gate changes. Technical evidence still
  never grants visual acceptance.
- **Probe:** `probe.cjs` uses `resolveBrowser`; `HYPERFRAMES_BROWSER_PATH` is dropped.

## Risks

- A system browser renders slightly differently from the pinned shell. Mitigation: the order
  prefers the pin, and reports name the browser.
- Edge's headless mode follows Chromium's; Puppeteer's `headless: true` uses the new headless mode,
  which Edge supports.
