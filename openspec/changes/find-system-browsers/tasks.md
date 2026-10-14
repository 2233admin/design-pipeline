## 1. Change records

- [x] 1.1 Issue #116; proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate find-system-browsers --strict` is valid and
  `npm run specs:check` passes.

## 2. Behaviour

- [x] 2.1 `skill/scripts/browser-locate.cjs`: `resolveBrowser` with the documented order and the
  system tables; `resolveChrome` removed and every caller renamed.
- [x] 2.2 `skill/tools/ff-tracking-hud/probe.cjs` uses `resolveBrowser`.
- [x] 2.3 Art Motion `render-report.json` and the interaction capture record
  `browser: {executable, version}`.

## 3. Tests and docs

- [x] 3.1 `browser-locate` tests: order, explicit-path failure, system fallback per platform with
  fake executables, the not-found message; registered in `scripts/test-manifest.json`.
- [x] 3.2 `art-motion-runtime` and `art-motion-tools` skip on `TOOL_MISSING`.
- [x] 3.3 `browser-locate` launches each installed system browser through puppeteer-core; the
  Windows CI job runs it without the HyperFrames download and requires both Chrome and Edge.
  Interaction and Art Motion tests assert the recorded browser.
- [x] 3.4 `installation.md`, `composition-gate.md`, `film-score.md`, the probe header and
  CHANGELOG.

## 4. Verification

- [ ] 4.1 A real launch through the fallback with a system Chromium; affected suites and
  `npm test` pass locally; CI green on the PR.
