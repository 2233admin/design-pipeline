## 1. Change records

- [x] 1.1 Proposal, design and spec delta (draft for owner review).
- [x] 1.2 Owner answers (2026-10-14): only MengTo and iart are downloaded on demand. Questions 2 and
  3 were left open; this change takes the design's defaults: `doctor` prints the fetch command and
  does not download, and there is no separate full archive (an offline machine copies the cache).

## 2. Implementation (after 1.2)

- [x] 2.1 Cache resolution and `sources fetch` with per-file verification and atomic install.
- [x] 2.2 MengTo and iart resolve their bundle root through it; `TOOL_MISSING` with the command.
- [x] 2.3 Packaging omits the two upstream trees; `optional` resources in `doctor` and
  `check-deps`.
- [x] 2.4 Tests with an injected mirror (`tests/vendor-cache.test.cjs`); QA checks the installed
  package before and after a fetch; docs, README, CHANGELOG, MODIFIED spec requirements.
- [x] 2.5 A real fetch of MengTo (1313 files, 136 MB) from `raw.githubusercontent.com` verified
  ready in about 25 s; a mismatching file left no partial directory.

## 3. Verification

- [x] 3.1 `npm test` locally passes except the environment-only ffmpeg filter test; `npm run
  specs:check` passes; CI green on the PR.
