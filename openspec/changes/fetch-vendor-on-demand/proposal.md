## Why

The packaged skill is 253 MB; 226 MB is `skill/vendor/`. Two bundles are 203 MB of it: MengTo
skills (136 MB, 1313 files) and iart motion skills (68 MB, 342 files). Agents read their Markdown
(about 3.4 MB); the bulk is upstream demo pages, textures and GIFs. Every install copies all of it,
and the archive is unwieldy to upload or share. Issue #119; owner decision (2026-10-14): download
on demand.

## What Changes

- The release package carries the MengTo and iart manifests, not their upstream files.
- `designer-pipeline sources fetch <bundle>|--all` downloads a bundle's files at the pinned
  revision, verifies each against the manifest's Git blob id and size, and stores it in a user
  cache under the same layout (`UPSTREAM-SKILL.md` included). A partial or failed download leaves
  nothing in place.
- The bundle root is resolved once: the repository copy when present (development), else the
  cache. Search, route and verify use it.
- A missing bundle is a `TOOL_MISSING` result naming the fetch command; `doctor` and install
  report it as optional, not as a blocked core resource.
- The other 18 bundles (23 MB, used by default guides such as Taste, good-css and UI craft) stay in
  the package.

## Capabilities

- `design-pipeline`: ADDED `Large upstream bundles are downloaded on demand and verified`;
  MODIFIED the offline-catalog requirements for MengTo and iart so they apply after a fetch.

## Reuse

- Manifests already list every file with its upstream path, Git blob id and size, plus the
  repository and revision; verification already recomputes blob ids and tree hashes.
- `skill/scripts/upstream-path.cjs` (#121) maps stored and upstream names.
- The browser-cache pattern of HyperFrames (`browser ensure`) and Playwright (`playwright install`,
  `PLAYWRIGHT_BROWSERS_PATH`).

## Impact

- Package and install: about 253 MB → about 50 MB.
- MengTo and iart search need one `sources fetch` and network access to
  `raw.githubusercontent.com`; offline machines can copy the cache directory.
