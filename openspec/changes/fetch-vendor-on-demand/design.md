# Design: download large upstream bundles on demand

## Context

| Bundle | Size | Files | Runtime readers |
|---|---|---|---|
| mengto-skills | 136 MB | 1313 | search, verify, `doctor`, frontend-stack routing (manifest only) |
| iart-motion-skills | 68 MB | 342 (7 repositories) | search, route, verify, `doctor` |
| 18 others | 23 MB | | guides, film methods, HUD scaffold, good-css study |

Mature patterns checked:

- **Playwright** ships no browsers. `playwright install` downloads into a per-user cache
  (`~/.cache/ms-playwright`, `%LOCALAPPDATA%\ms-playwright`), overridable with
  `PLAYWRIGHT_BROWSERS_PATH`; a missing browser fails with the install command.
- **HyperFrames** `browser ensure` does the same for its headless shell.
- **Go modules** fetch pinned versions into a module cache and verify each against recorded hashes
  before use.

## Decisions

- **Scope:** MengTo and iart only. They are 90% of the size, are reached only through their own
  search and route commands, and already record every file. Bundles that guides link to directly
  stay packaged, so default work stays offline.
- **Transport:** one HTTPS GET per file from
  `https://raw.githubusercontent.com/<owner>/<repo>/<revision>/<upstream path>`, at most 8 at a
  time, with Node's `fetch`. Tarball endpoints (`codeload`, the API tarball) are blocked by some
  sandboxes where raw files are allowed; per-file fetch also reuses the manifest's file list.
- **Verification:** each file's Git blob id and size must match the manifest before it is written;
  then the existing verifier runs on the finished directory.
- **Atomic install:** download into `<cache>/<bundle>/.partial-<random>/`, verify, then rename to
  `<cache>/<bundle>/<revision>/`. A failure removes the partial directory.
- **Cache location:** `$DESIGN_PIPELINE_CACHE` if set, else `$XDG_CACHE_HOME/design-pipeline`,
  `~/.cache/design-pipeline` (Linux), `~/Library/Caches/design-pipeline` (macOS),
  `%LOCALAPPDATA%\design-pipeline\Cache` (Windows). The override exists for tests and offline
  copies.
- **Resolution:** `skill/vendor/<bundle>/upstream` when it exists (the repository), else the cache
  entry for the manifest's revision. A revision change in the manifest therefore needs a new fetch.
- **Explicit fetch:** search and route do not download on their own; they fail with `TOOL_MISSING`
  and the command. Network side effects stay visible and approvable.
- **Packaging:** `package.cjs` leaves out `skill/vendor/{mengto-skills,iart-motion-skills}/upstream`
  and their two LICENSE entries leave `package-resources.json` `required`. `doctor` reports a
  missing bundle under `downloads` without blocking; search and route fail with `TOOL_MISSING`.
- **Command:** `sources fetch --bundle <name>|--all` runs in a kernel process (the CLI is
  synchronous) and verifies each bundle after download.

## Owner decisions (2026-10-14)

1. Scope: only MengTo and iart (package 253 MB → about 51 MB extracted).
2. Not answered; default taken: `doctor` lists the bundles and their fetch command, it does not
   download.
3. Not answered; default taken: no separate full archive. An offline machine receives a copy of the
   cache directory or sets `DESIGN_PIPELINE_CACHE`.

## Found while implementing

Fetching iart at its recorded pack revisions exposed nine GIFs whose bundled bytes had been
rewritten by `text=auto`; that is fixed separately (`restore-upstream-snapshot-bytes`, #126), which
this change depends on.
