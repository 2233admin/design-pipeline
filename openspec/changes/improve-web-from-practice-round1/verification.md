# Practice round 1 verification

## Review fixes round 2 tested revision

- Tested implementation commit: `af7c0acbeae7b71046cefe6fa6fef5367e7f5cc2`.
- Tested Git tree: `02adfa47ec83010e62275438efdb5105864c830d`.
- Full QA: `cmd /d /c "set FONTTOOLS_PYTHON=D:/Temp/dp-fonttools-venv/Scripts/python.exe&&npm test"`, exit 0; 130 registered files, 1256 tests, 1252 passed, 0 failed, 4 skipped.
- Installed-package CLI smoke: 12 passed, 0 failed, 0 skipped; browser adapter and BuilderPort self-tests passed.
- `npm run specs:check`: exit 0, 70 passed, 0 failed.
- Parent integrated actual-CLI regressions: 6 passed, 0 failed, 0 skipped.
- All tracked files were frozen during this final QA. The subsequent evidence-only commit updates only this verification record; it was not itself full-QA tested. Its runtime/test bytes are unchanged from the tested implementation. The external report records the final delivery SHA.
- No push. No Component Conformance or Visual Acceptance claim.

## Original practice tested revision (historical)

- Branch: `fix/web-practice-round1`; no push performed.
- Implementation commit: `e3ffb1c4192a35f7e8df3d81937c0a36ed40b90c`.
- Tested Git tree: `328e5427908e48a4c1179d7fe77e46c366553866`.
- Runtime and test bytes remained frozen throughout the successful full QA run. The final evidence commit changes only this verification record and `tasks.md`; the external report records the delivery SHA.

## Results

| Command/check | Observed result |
| --- | --- |
| `npm ci` | pinned maintenance dependencies installed |
| `npm test`, with the requested task-local `FONTTOOLS_PYTHON` | exit 0 |
| Repository tests | 126 registered files; 1,227 tests; 1,223 passed; 0 failed; 4 skipped |
| Installed-package public CLI smoke | 12 passed; 0 failed; 0 skipped |
| Browser-tool workspace | prewalk pipeline adapter and BuilderPort self-tests both OK |
| Packaging | reproducible `.tgz`, `.zip` and checksums |
| Worktree integrity | QA reported byte-identical repository status |
| `npm exec -- openspec validate improve-web-from-practice-round1 --strict` | valid; exit 0 |
| `npm run specs:check` | 70 passed; 0 failed; exit 0 |
| Integrated A/B/C focused tests | 33 tests; 32 passed; 0 failed; 1 skipped |
| `node --test tests/film-project.test.cjs` | 13 passed; 0 failed |

The first full QA run failed two obsolete film handoff text assertions (1,221 passed, 2 failed, 4 skipped). Those incidental assertions were deleted, not re-pinned to new command spellings. The corrected full rerun above passed. Exact red/green commands, excerpts and local A/B log paths are in `tasks.md`.

## Public CLI smoke

A project containing only user-owned `BRIEF.md` asked for intake and showed no completed stages. Recording intake refused with exit 1 / `OUTPUT_COLLISION`; the assignment and empty decisions remained unchanged. After an explicit assignment rename, the returned record command executed successfully from outside the project, wrote the generated brief with digest-bound ownership, and the reference waiver returned the structurally divergent/pre-screened concepts instruction. No visual output or owner acceptance was recorded.

The focused command regressions additionally execute film/edit/web/UI records against spaced project paths, a storyboard validator, a product scaffold and real local-video resampling from unrelated temporary directories.

## Boundaries

- Three optional native GEPA tests skipped because no task-local `GEPA_PYTHON` runtime was prepared.
- One separate-case duplicate-brief test skipped because this Windows filesystem aliases case variants. Both uppercase/lowercase user-name collisions and symlink refusal were exercised.
- Legacy truthy intake decisions remain complete but cannot authorize overwriting an existing brief without digest-bound provenance. Move or rename the existing brief before re-recording.
- Film/edit media-production command roots were audited, but this practice change did not execute every media render/install command. Existing shell quoting was preserved, not broadened.
- C/D are operational guidance. These checks do not measure improved creative quality and do not grant Visual Acceptance.
- Film product-source/sample admission logic, `references/mechanisms/`, gate/receipt schemas and policy/target lineage were not changed.
