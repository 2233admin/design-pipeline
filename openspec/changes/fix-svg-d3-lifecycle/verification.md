# Verification

Recorded on 2026-10-19 on a Windows host with Node v26.3.1, on branch `fix/svg-d3-lifecycle` in a
separate local clone, based on `6e3b695`. The lifecycle rows were verified at `4d21d2b`; the
target package directory rows were verified on the tree committed with the `targetRoot` change,
which replaced the short-lived CLI-only probe directory option of `bff5cb8`. The third regression
table and the checks marked "core-derived directory" were verified on the tree that moved the
probe directory derivation into `toolchain-core.cjs` after `27d2a27`.

## Regressions

| Case | Before (`6e3b695` registry) | After |
| --- | --- | --- |
| React request with brief "Build a React analytics dashboard with D3 SVG charts" selecting `svg-d3` | `blocked`: `svg-d3 has no probe/plan/invoke/verify lifecycle` | `ready`, no blockers; guide `references/graphics-runtime-routing.md#svg-d3-project-lifecycle`, `npm run dev`, evidence `dom`, `screenshot`, `accessibility` |
| `svg-d3` registry entry has the four lifecycle stages and verifies its own evidence types | Fails: no lifecycle keys | Passes |
| Probe on a temporary project with exact `d3` 7.9.0 in `dependencies` or `devDependencies`, an ESM `node_modules/d3` and `scripts.dev` | No probe command | `ready`, `d3=7.9.0`; target `package.json` unchanged; `scripts.dev` not run |
| Missing `package.json`, missing `node_modules/d3`, empty dependencies, `^7.9.0`, `7.8.5`, missing or blank `scripts.dev`, no `select` export, import error, wrong package name | No probe command | `blocked` with the concrete cause for each |

`node --test tests/adapter-registry.test.cjs tests/toolchain-routing.test.cjs` before the registry
change: 18 tests, 16 pass, 2 fail (the two new cases). After: 18 pass, 0 fail.

| Case | Before (`bff5cb8` tree) | After |
| --- | --- | --- |
| Request from a stack input with `targetRoot: "app"` | `toolchain request` fails: `request has unsupported properties: targetRoot` | Request and plan carry `targetRoot: "app"` |
| Pipeline root with job plan but no `package.json`; pinned `d3` 7.9.0 in `app`; `toolchain probe` with no directory option | Not reachable (request rejected) | `ready`, exit 0, `d3=7.9.0`; `planSha256` equals the hash of the written plan; `--write` output under `--root`; `app` unchanged |
| Stack input without `targetRoot` | Plan has no `targetRoot` | Request bytes unchanged; plan `targetRoot: "."`; probe `blocked`, exit 2, `Cannot read the target project package.json (probed in .)` |
| `app/`, `./app`, `app\`, `./app/`, `app/./`; `.`, `./`, `.\` | Rejected as unsupported | Same request bytes, plan bytes and plan hash as `app`; the root spellings give `.`; `apps/web` gives a different hash |
| `targetRoot` `../outside`, `app/../other`, `/srv/app`, `\\server\share`, `C:/x`, `C:\x`, `app:web`, empty, blank, a number | Rejected as unsupported | Request validation fails with `'..' segments are not allowed`, `absolute paths are not allowed`, `drive letters and ':' are not allowed` or `must be a non-empty string`, in `toolchain request` and in `resolveToolchain` for hand-edited requests |
| Hand-edited request with `targetRoot` `missing`, `app/package.json`, or a junction inside `--root` to a valid outside package | Rejected as unsupported | `toolchain resolve` and `toolchain probe` exit 1 with `targetRoot does not exist`, `targetRoot must be a directory`, `targetRoot resolves outside`; no `--write` output; outside package unchanged |
| `--project-root` on `toolchain resolve` or `toolchain probe` | `probe`: used as the probe directory; `resolve`: silently ignored | Exit 1, `UNKNOWN_OPTION`: `toolchain <action> does not accept --project-root; set targetRoot ... in the stack input` |
| Failed command probe | Message is the last stderr line only | Message ends with `(probed in <directory>)`, the directory the probe ran in relative to `--root` |
| `jobPlanPath` `a/../job-plan.json` | Normalised to `job-plan.json` and accepted | Rejected: `'..' segments are not allowed` (shared normaliser) |

`node --test --test-name-pattern="targetRoot|failed probes|request preparation"
tests/toolchain-routing.test.cjs tests/designer-pipeline-cli.test.cjs` before the implementation:
4 tests, 0 pass, 4 fail (`request has unsupported properties: targetRoot`; `undefined !== '.'`;
the old `jobPlanPath must be a contained relative file path` message for `../job-plan.json`; a
probe message without `(probed in .)`). After: 4 pass, 0 fail.

| Case | Before (`27d2a27` core) | After |
| --- | --- | --- |
| `probeToolchain(plan, { root, runner })` on a temporary root with plans whose `targetRoot` is `.` and `app`, and a failing runner that records its working directory | `root` ignored: both probes ran in the caller's working directory (`D:\projects\design-pipeline-svg-d3-lifecycle`) while the messages named `.` and `app` | Probes run in `<root>` and `<root>\app`; the messages end with `(probed in .)` and `(probed in app)` |
| `probeToolchain` with `projectRoot`, without `root`, or with `targetRoot` `missing`, `file.txt`, or a junction to an outside directory | The core ran the probe in `projectRoot` or the process working directory; only the CLI checked the directory | Fails before any probe runs: `probe options has unsupported properties: projectRoot`, `probe options is missing root`, `targetRoot does not exist`, `targetRoot must be a directory`, `targetRoot resolves outside` |
| Three.js and React + `svg-d3` probes on temporary projects, called with `{ root }` | Ran in the clone instead of the temporary project: Three.js `blocked` where `ready` was expected; `svg-d3` reported `Declare an exact d3 version in the target package.json (probed in .)` where `Cannot read the target project package.json` was expected | Run in the temporary project and report every expected cause and version |

`node --test --test-name-pattern="probes run only|trusted probes|SVG/D3|Three.js routes"
tests/toolchain-routing.test.cjs` with the new tests on the `27d2a27` core: 4 tests, 1 pass, 3
fail. With the core-derived directory, the same tests pass in the 36-test run below.

## Checks

| Check | Result |
| --- | --- |
| `node --test tests/adapter-registry.test.cjs tests/toolchain-routing.test.cjs tests/graphics-runtime-catalog.test.cjs tests/designer-pipeline-cli.test.cjs` | At `4d21d2b`: 34 pass, 0 fail. With `targetRoot`: 36 pass, 0 fail. With the core-derived directory: 36 pass, 0 fail. |
| Probe through `probeToolchain` on a real pnpm project (`d3` 7.9.0 pinned, `node_modules/d3` linked into `.pnpm`, `scripts.dev` `vite`) | `ready`, `svg-d3` reports `d3=7.9.0`. |
| `toolchain resolve` CLI on that project's `award-redesign` request | `ready`, no blockers; one review, `wevm/frog is review`, from the frontend stack. |
| `toolchain request` → `toolchain resolve --write` → `toolchain probe` through the clone CLI on a temporary pipeline root (`E:\tmp\dp-target-root\e2e\pipeline`) with a routed job plan, a stack input with `"targetRoot": "app"`, and `app/package.json` pinning `d3` 7.9.0 with `app/node_modules/d3` | Request and plan `targetRoot: "app"`; plan `ready`; probe `ready`, exit 0, `svg-d3` `d3=7.9.0`, `planSha256` equal to the SHA-256 of the written `toolchain-plan.json`. `toolchain probe ... --project-root app`: exit 1, `UNKNOWN_OPTION`. With the core-derived directory, `toolchain probe` on the same root: `ready`, exit 0, `d3=7.9.0`. |
| `toolchain request --write` → `toolchain resolve --write` → `toolchain probe --write` through the clone CLI, core-derived directory, on the real workbench (`--root E:\projects\ShinkaEvolve\shinka\research\webui`, change `award-redesign`, stack input `"targetRoot": "app"`, pnpm-installed `d3` 7.9.0 in `app`) | Request and plan `targetRoot: "app"`; plan `ready`, no blockers; probe `ready`, exit 0, `svg-d3` `d3=7.9.0`, one review route (`wevm/frog`) not probed; `planSha256` `4bcec74983b8cb70a5af5ef634fbadfa4a998817f2935dddcef57949568e4242` equals the SHA-256 of the written `toolchain-plan.json`; `git status -- shinka/research/webui/app` is empty afterwards. |
| `node scripts/qa.cjs` with `TEMP` and `TMP` on `E:\tmp\dp-target-root`, with `targetRoot` | Repository tests: 1483, 1410 pass, 10 fail, 63 skipped, 136 files. The hermetic package build, reproducibility, the installed-package CLI smoke (13/13) pass, and QA leaves repository status byte-identical. The 10 failures are the known set below. With the core-derived directory: the same counts and the same 10 failures; the hermetic build, reproducible `tgz`, `zip` and `checksums.txt`, the installed-package CLI smoke (13/13) and the byte-identical status pass. |
| The 10 failing tests' files on an unmodified `6e3b695` worktree, `TEMP` on `E:\tmp\dp-qa-svg-d3` (recorded with the `4d21d2b` run) | The same 10 tests fail: `puppeteer-core` and `gsap` are not installed in a fresh clone, and Git's GNU `tar` reads the `E:` archive path as a remote host. None touch the toolchain or registry. |
| `openspec validate --all --strict` | 28 passed, 0 failed, including this change, with `targetRoot` and again with the core-derived directory. |

## Not Verified

- `npm run test:browser` was not run; the fresh clone has no workspace dependencies installed.
- No chart was rendered and no DOM, screenshot or accessibility evidence was collected. The probe
  proves only that the pinned package is installed and importable.
