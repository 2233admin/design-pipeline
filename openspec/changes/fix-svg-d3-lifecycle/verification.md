# Verification

Recorded on 2026-10-19 on a Windows host with Node v26.3.1, on branch `fix/svg-d3-lifecycle` in a
separate local clone, based on `6e3b695`. The lifecycle rows were verified at `4d21d2b`; the
nested project root rows were verified on the tree committed with the `--project-root` follow-up.

## Regressions

| Case | Before (`6e3b695` registry) | After |
| --- | --- | --- |
| React request with brief "Build a React analytics dashboard with D3 SVG charts" selecting `svg-d3` | `blocked`: `svg-d3 has no probe/plan/invoke/verify lifecycle` | `ready`, no blockers; guide `references/graphics-runtime-routing.md#svg-d3-project-lifecycle`, `npm run dev`, evidence `dom`, `screenshot`, `accessibility` |
| `svg-d3` registry entry has the four lifecycle stages and verifies its own evidence types | Fails: no lifecycle keys | Passes |
| Probe on a temporary project with exact `d3` 7.9.0 in `dependencies` or `devDependencies`, an ESM `node_modules/d3` and `scripts.dev` | No probe command | `ready`, `d3=7.9.0`; target `package.json` unchanged; `scripts.dev` not run |
| Missing `package.json`, missing `node_modules/d3`, empty dependencies, `^7.9.0`, `7.8.5`, missing or blank `scripts.dev`, no `select` export, import error, wrong package name | No probe command | `blocked` with the concrete cause for each |

`node --test tests/adapter-registry.test.cjs tests/toolchain-routing.test.cjs` before the registry
change: 18 tests, 16 pass, 2 fail (the two new cases). After: 18 pass, 0 fail.

| Case | Before (`4d21d2b` CLI) | After |
| --- | --- | --- |
| Pipeline root with request and job plan but no `package.json`; pinned `d3` 7.9.0 in `app`; `toolchain probe --project-root app` (relative and absolute) | `--project-root` ignored: `blocked`, exit 2, `Cannot read the target project package.json` | `ready`, exit 0, `d3=7.9.0`; `--write` output lands under `--root`; `app` unchanged |
| Same root without `--project-root` | `blocked`, exit 2 | Unchanged: `blocked`, exit 2 |
| `--project-root` `../outside`, an absolute path outside `--root`, a junction inside `--root` to a valid outside package, a missing path, `app/package.json` | Ignored; probe ran in `--root` | Exit 1: `must stay inside`, `resolves outside`, `does not exist`, `must be a directory`; outside package unchanged |

`node --test --test-name-pattern="nested --project-root" tests/designer-pipeline-cli.test.cjs`
before `--project-root` was read: 1 test, 0 pass, 1 fail (`2 !== 0` for `--project-root app`).
After: 1 pass, 0 fail.

## Checks

| Check | Result |
| --- | --- |
| `node --test tests/adapter-registry.test.cjs tests/toolchain-routing.test.cjs tests/graphics-runtime-catalog.test.cjs tests/designer-pipeline-cli.test.cjs` | At `4d21d2b`: 34 pass, 0 fail. With `--project-root`: 35 pass, 0 fail. |
| Probe through `probeToolchain` on a real pnpm project (`d3` 7.9.0 pinned, `node_modules/d3` linked into `.pnpm`, `scripts.dev` `vite`) | `ready`, `svg-d3` reports `d3=7.9.0`. |
| `toolchain resolve` CLI on that project's `award-redesign` request | `ready`, no blockers; one review, `wevm/frog is review`, from the frontend stack. |
| `toolchain probe --root <workbench>/webui --artifact openspec/changes/award-redesign/toolchain-request.json --project-root app --json` on the same real project (pipeline root `webui`, package `webui/app`), no `--write` | `4d21d2b` CLI: `blocked`, exit 2, `svg-d3: Cannot read the target project package.json`. With `--project-root`: `ready`, exit 0, no blockers, `svg-d3` `d3=7.9.0`. `--project-root ../outside`: exit 1, `--project-root must stay inside`. |
| `node scripts/qa.cjs` with `TEMP` and `TMP` on `E:\tmp\dp-qa-svg-d3` (the system drive had 0.25 GB free), at `4d21d2b` | Repository tests: 1481, 1408 pass, 10 fail, 63 skipped, 136 files. The hermetic package build, reproducibility, the installed-package CLI smoke (12/12) pass, and QA leaves repository status byte-identical. Not rerun for the `--project-root` follow-up. |
| The 10 failing tests' files on an unmodified `6e3b695` worktree, same `TEMP` | The same 10 tests fail: `puppeteer-core` and `gsap` are not installed in a fresh clone, and Git's GNU `tar` reads the `E:` archive path as a remote host. None touch the toolchain or registry. |
| `openspec validate --all --strict` | 28 passed, 0 failed, including this change, before and after the `--project-root` follow-up. |

## Not Verified

- `npm run test:browser` was not run; the fresh clone has no workspace dependencies installed.
- The full `node scripts/qa.cjs` suite was not rerun after the `--project-root` follow-up; only
  the four test files above and `openspec validate --all --strict` were.
- No chart was rendered and no DOM, screenshot or accessibility evidence was collected. The probe
  proves only that the pinned package is installed and importable.
