# Verification

Recorded on 2026-10-22 on a Windows host, on branch `fix/provider-license-from-catalog` in a
separate local clone based on `516cdfb`, after `npm ci` at the repository root.

## Regressions

| Case | Before (`516cdfb` core) | After |
| --- | --- | --- |
| `provider:react-aria` (`sourceId` `adobe/react-spectrum`) on `overlay.dialog` against the bundled catalog | `license: null`, license `fail` (`source has no license declaration`), `blocked` | `license: "Apache-2.0"`, license `pass`, `requiresLicense: false`; status `review` from `visualFit` only; decision still `reuse` of `provider:project-dom` |
| `provider:ark-ui` and `provider:project-dom` on the same row | Ark UI `null`/`fail`; project DOM `project-owned`/`pass` | Ark UI `MIT`/`pass`; project DOM `project-owned`/`pass` |
| React Spectrum source record relicensed to MIT in a catalog copy | Not reachable | Candidate license `MIT`; `validateComponentFitMatrix(matrix, { catalog })` fails with `catalog binding is stale` |
| Source record state `unverified` with a specific license; `unverified` placeholder; state `commercial` with `LicenseRef-Example`; no `license` object and provenance ` Mixed ` | Not reachable | License dimension `review` in each case; candidate not `ready` |
| React Aria `sourceId` changed to `example/unindexed`; providers without `sourceId` | `null`/`fail`/`blocked` | Unchanged: `null`, `{ status: "fail", reason: "source has no license declaration" }`, `blocked` |
| A second source record with `sourceId` `adobe/react-spectrum` | Not checked | `component fit` fails: `catalog has 2 source records for provider react-aria sourceId adobe/react-spectrum` |

`node --test tests/component-fit-matrix.test.cjs` with the new tests on a detached `516cdfb`
worktree: 18 tests, 16 pass, 2 fail (`includes governed framework providers ...` and
`resolves provider licenses only from the catalog source record named by sourceId`, both
`actual: null, expected: 'Apache-2.0'`). After the change: 18 tests, 18 pass, 0 fail.

## Checks

| Check | Result |
| --- | --- |
| `node --test tests/component-fit-matrix.test.cjs` | 18 tests, 18 pass, 0 fail. |
| `node scripts/qa.cjs` with `TEMP` and `TMP` on `E:\tmp\pipeline-license-fix` | Repository tests: 1484, 1477 pass, 3 fail, 4 skipped; exit 1. The installed-package CLI smoke (13/13) passes and QA leaves repository status byte-identical. The 3 failures are `isolated release archive carries every film source blob without ambient source installations` (`tests/film-sources.test.cjs`), `release archive carries every UI craft source blob and no React Doctor bundle` and `UI craft guides and vendor index resolve every local reference inside the packaged skill` (`tests/ui-craft-sources.test.cjs`): Git's GNU `tar` reads the `E:` archive path as a remote host (`tar (child): Cannot connect to E: resolve failed`), and the third reads the archive the second could not extract. The `fix-svg-d3-lifecycle` run (1483 tests, 1410 pass, 10 fail, 63 skipped) attributes its 10 known failures to this `tar` behaviour and to `puppeteer-core` and `gsap` missing from a clone without `npm ci`; this clone ran `npm ci`, and 59 fewer tests were skipped. No other test failed. The one extra test is the new regression. |
| `node --test tests/film-sources.test.cjs tests/ui-craft-sources.test.cjs` on an unmodified detached `516cdfb` worktree, `TEMP` on `E:\tmp\pipeline-license-fix` | 28 tests, 25 pass, 3 fail: the same three tests with the same `tar (child): Cannot connect to E: resolve failed` and `ENOENT` causes. |
| `npm exec -- openspec validate fix-provider-license-from-catalog --strict` | `Change 'fix-provider-license-from-catalog' is valid`. |
| `component fit --artifact openspec/changes/award-redesign/component-fit-request.json --json`, read-only, no `--write`, from `ShinkaEvolve/shinka/research/webui` with the clone CLI | Before: `provider:react-aria` `license: null`, license `fail`, `blocked` on all 13 capabilities. After: `license: "Apache-2.0"`, license `pass`, status `review` (only `visualFit` is `review`) on all 13 capabilities; Ark UI `MIT`, Vuetify0 `MIT` (still `blocked` by its framework and readiness dimensions). Matrix `ready`; every decision is still `reuse` of `provider:project-dom`; `catalogHash` and `providerHash` are unchanged. |

## Not Verified

- `npm run test:browser` was not run.
- No component was adopted or rendered; the matrix status says nothing about visual acceptance.
