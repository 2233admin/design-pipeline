# Delivery verification QA — 2026-10-08

## Tested scope

- Publication baseline: `origin/main` at `7205ee80f1328ce85550bc3fd18a1f8d3f91f799`; fetched before work and again before the test freeze, with no incoming commits.
- Frozen implementation: `125375a8314fcbf77b6c9e0785485b2b8bcfadb2`, Git tree `94b84104a73651429f7ff0be576baeff307b2677`.
- Runtime: Windows, Node `22.23.2`, isolated Python with `fonttools==4.66.1`; repository-locked maintenance dependencies and existing browser/Blender tools.
- Repository changes are CI, QA output, contributor guidance and test fixtures. Product runtime, receipt schemas, gate thresholds and source bundles are unchanged by this maintenance commit.

## Before and after

The previous PR head `363b6f5c86cdd94d07296dabe78b60fe185afab9` had a failed Ubuntu run [37735968494](https://github.com/2233admin/design-pipeline/actions/runs/37735968494): 1,054 tests, 1,012 passed, six failed and 36 skipped. The earlier 1,042-test local result predates that integration and does not override the failed hosted result.

1. Windows path identity and storyboard checks now run in their own existing-workflow job. A real namespace-root alias forces the physical-identity branches to execute. The exact Node22 CI command passed 3/3 locally. A no-match control produced Node's successful empty-file results but the CI completion-marker checks rejected it. An unavailable-NTFS control reported two passes and one explicit skip while both required completion markers remained present.
2. Full QA streams the repository test subprocess's output while it runs. Other subprocesses retain captured JSON/output, and the original hermetic environment, concurrency bound, exit-status checks and repository-status protection remain intact. Live output was observed through both the active process and its growing redirected log before completion.
3. CONTRIBUTING reconciles the actual PR target and reviews its divergent commits/diff before freezing full QA. The PR template now uses `npm test` and `npm run specs:check` and records tested revision plus later integration evidence separately.
4. Five native public-CLI fixtures now pass the parent-resolved Puppeteer module path through the existing flag. A real public-CLI counterexample in a temporary directory outside user ancestor dependencies failed with `TOOL_MISSING`; the same fixture passed after adding only that module argument. The final five regressions passed 5/5, zero skipped, on Node22 with an isolated temporary root, empty `NODE_PATH` and a relative configured module resolved before the child changes cwd.
5. The delayed-pointer fixture now ignores Chrome's stationary startup mouse event, consistently with the existing live specimen. The regression injects that event through real native input, waits for a real animation frame and asserts the injection executed. Final focused test: 1/1 passed. Removing only the guard from the final source caused the same smoothness assertion to fail with a 200px jump across 1,080px travel and a 16.6ms frame interval. Original driver pacing, position steps, stall assertion and genuine-jump negative check remain unchanged. The old Ubuntu log lacks sample values, so this controlled reproduction does not claim to exclude every possible cause of that older run.

## Evidence

- Strict specifications: 55/55 passed.
- Independent read-only review: no blocking findings in QA stdio, Windows coverage enforcement, native dependency forwarding or pointer positive/negative assertions.
- Local logs, retained outside Git: `windows-path-focused-node22.log`, `windows-path-zero-match-node22.log`, `windows-path-ntfs-unavailable-node22.log`, `native-module-public-cli-proof.json`, `native-puppeteer-five-isolated-node22.log`, `pointer-review/final-focused.log`, `pointer-review/final-without-guard.log`, and `delivery-npm-test-node22.log`, under `.design-pipeline/`.

Full `npm test` exited 0 on the frozen implementation: **1,055/1,055 tests passed across 112 files, zero failed and zero skipped** (repository test batch: 504,429.7683ms). Installed-package CLI: **12/12**, zero skipped. Both browser-tool self-tests passed. TGZ, ZIP and checksums were reproducible, isolated install/replacement/doctor passed, and QA left Git status byte-identical. Complete log SHA-256: `fa55e71403bdbe2d2f3eaca9cfd946de486a1dca75cd9887b48e8073cc51cc19`.

The implementation was pushed to PR #85 and its description was updated with these results. Hosted run [37768589630](https://github.com/2233admin/design-pipeline/actions/runs/37768589630) was in progress when this local record was prepared. The PR's latest check suite records the exact published head's Windows and Ubuntu outcomes; no hosted pass is inferred from local success. Later documentation commits do not change the implementation verified above.

## Host companion repair

The missing CI helper was restored outside this repository from the unchanged MIT source blob in `gsd-build/gsd-2@33c00aaffa56e5d394bccce1c8df59fb842e84c5`. Helper Git blob: `43179245a30d94785876d2d60744bcc6221d6b95`; SHA-256: `6d815ade3be9ba0d77ea75a25987eb1993939ac402a1543578b22d0c955d1e93`. The original eight compatibility files are unchanged, with a backup, license and provenance preserved. A canonical host wrapper points to the installed helper and provides an installation self-check: 50/50 deterministic checks passed. Real read-only CI queries recovered the failed run above. The external skills inventory still lists the compatibility entry; automatic discovery of the new canonical wrapper was not claimed. This host repair is not a new packaged dependency or repository source intake.

## Limits and tracking

Local Linux browser reproduction was unavailable because the existing Linux environment lacked Chrome and its dynamic libraries; no system packages or Docker settings were changed. Hosted Ubuntu results are reported separately. The Windows namespace-root regression does not promise support for every namespaced target spelling. Technical verification grants neither Component Conformance nor Visual Acceptance.

Multica returned a service error during issue lookup. Authorized work continued with scope, progress and evidence recorded in this change and existing PR #85; the tracker can be reconciled from that record when available. The original dirty checkout was left untouched.
