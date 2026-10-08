# QA repair and publication evidence

Date: 2026-10-08. User authorized repairing full QA before pushing Good CSS to GitHub.

## Root causes and repairs

- Windows `fs.realpathSync` retained `ADMINI~1` while Git returned `Administrator`. Native task authorization then looked outside its own Git root. Repository/common-Git roots and native workflow context now use `fs.realpathSync.native`. Existing `resolveInside` retains caller coordinates and checks native physical containment; aliases require matching nonzero BigInt inode/device identity and no linked ancestors. Exact-case physical checks also reject distinct NTFS case-sensitive siblings. External, broken, inbound and ancestor junctions still fail.
- Component-eval failures were blocked by that missing Git baseline. Undefined assertion messages hid the actual error on Node 26; existing expected states remain unchanged and failures now include retained task/attempt diagnostics. No component-eval business behavior was changed.
- Pointer input interpolated coordinates by elapsed wall time. A delayed native move caused the next input to skip intermediate positions. The driver now waits between completed moves and delivers every planned native coordinate, retaining actual browser timestamps, observed duration and the existing safety bound. An expired-deadline implementation was also rejected because it burst-delivered inputs after a stall. No measurement/evaluator threshold was loosened and no samples are fabricated.
- The Good CSS study builder had the same source/output alias mismatch. Its existing preserved-source guard now uses native real paths for both sides; a regression uses only a temporary source copy and verifies rejection leaves every byte intact.

## Observed red/green evidence

| Check | Before | After |
| --- | --- | --- |
| Native goal dispatch and workflow | 25 failures, mostly missing baseline | Shared fix passes 74/78; remaining four test coordinate expectations/hooks repaired and pass 4/4 |
| execution-target-routing | 27/29; snapshot spelling and concurrent hashing hook failed | Initial full group 30/30; final physical/link/NTFS/root/history focus 15/15 and separate live UNC boundary probe pass |
| Shared helper boundary checks | Known Windows alias mismatch | Final existing adaptation/component/CLI caller checks 5/5 |
| component-eval | Six original failures; hidden TASK_BLOCKED diagnostic | All six observed green; full group 16/17 with one Git timeout, that remaining scenario independently passes 1/1 without timeout changes |
| Delayed native pointer regression | Original driver skips coordinates; expired deadline variant has 0.0082ms pause | Final three live browser checks pass, retaining step spacing, actual jump observations and inert-target failure |
| Good CSS source/output alias guard | Expected rejection missing; nested output written into temporary source copy | Good CSS group 5/5; rejected output absent and temporary source bytes unchanged |

Focused logs and traces are ignored under `.design-pipeline/`; original failures remain in the Good CSS integration's QA history.

## Publication scope and verification

Publication uses an isolated managed worktree/branch `codex/good-css-qa` based on already-published `d45370d60703b8a08beab8fc7d7d7edd56ced727` (`codex/harness-verification`), which includes the remote CI/browser fixture fixes. Only Good CSS hunks/new files and these QA repairs are transferred. Unrelated local frontend redesign, film, model evaluation, Matt skill review and host instructions remain in the original working tree.

The final isolated code tree passes:

| Command/check | Result |
| --- | --- |
| `npm ci` | Exit 0; locked maintenance dependencies installed |
| `npm test` | Exit 0; 110 files, 1,036/1,036 repository tests, 0 failures, 0 skipped |
| Package checks inside QA | TGZ, ZIP and checksum reproducibility; all required resources; invalid-input preservation; isolated install/replacement/doctor pass |
| Installed public CLI inside QA | 12/12, 0 failures, 0 skipped |
| Browser workspace inside QA | Adapter and BuilderPort self-tests both pass |
| Working-tree preservation inside QA | Repository status byte-identical before/after |
| Final `npm run sources:check` | 39/39, 0 failures, 0 skipped |
| Final `npm run specs:check` | Strict validation: 51/51, 0 failures |
| Independent final read-only audit | No actionable findings; complete source/blob/license/resource integrity and publication scope verified |
| `git diff --check` | Exit 0 |

This full run supersedes every partial or failed run above, including the component-eval Git timeout. Runtime files remained frozen for the full run. Only change reports, task completion markers, the changelog and one provenance-only Git attribute are updated afterward. Complete output is ignored at `.design-pipeline/good-css-publication-npm-test.log`, SHA-256 `c727dcd0ac0061be97e901fcf5c1270cd45e294753360fcf2d6c7f9bf32b87b2`.

Staged whitespace checking detected the reviewed Geist Mono OFL file's original trailing space. Its bytes remain intact; a path-specific `-whitespace` attribute applies only to that preserved license. All other files retain normal whitespace checks. The staged vendor blob/mode verification still requires all 133 exact original identities.

The delayed pointer regression verifies a new pause of at least 15ms after each delivered input, input steps at most 25px and observed direct-follower movement below `travel/10`. Actual discontinuity remains at or above that threshold; the inert target still fails with `dead-interaction`. These are asserted observed bounds; the temporary successful trace is cleaned, so no unretained exact minimum/maximum is claimed.

Implementation commit: [`853249ba5121ae1243fe53c772bf15dd30df9bf6`](https://github.com/2233admin/design-pipeline/commit/853249ba5121ae1243fe53c772bf15dd30df9bf6), Git tree `883a0ad81427852ede4db9aeec774025a112b111`. It contains exactly the audited Good CSS integration and QA repairs, including all 133 original staged vendor blob/mode identities. `git push -u origin codex/good-css-qa` exits 0; `git ls-remote` independently confirms the same implementation commit on the new remote branch. This close-out update changes only the two QA reports and this change's task checklist.

GitHub branch: [codex/good-css-qa](https://github.com/2233admin/design-pipeline/tree/codex/good-css-qa). Original working tree remains on `improve-beta-motion` at `77f6baf6b4f820443e5cced814b7233df7fa40c0` with unrelated local changes preserved. Publication is a branch push; the existing GitHub Actions configuration does not trigger CI on this feature branch push. The passing results above are the complete local publication-tree QA, not a remote CI claim.

Multica lookup remains temporarily unavailable; implementation and verification continue under the canonical host policy, with evidence retained in this change. Code-Intel's earlier recorded failure is reused; diagnosis used bounded source/caller reads.

Component Conformance: repository/native technical verification only, not downstream product conformance. Visual Acceptance: not requested or granted by repository QA.
