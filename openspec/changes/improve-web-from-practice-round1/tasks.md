# Practice round 1 tasks

## Implementation

- [x] 1. Implement A: state-recorded intake completion and case-insensitive user-brief collision refusal across web/shared routes; retain focused red/green output.
- [x] 2. Implement B: absolute project roots in every returned workflow command/record; execute from an unrelated cwd and retain focused red/green output.
- [x] 3. Implement C: divergent first-screen skeletons and contact-sheet agent pre-screen in existing guides and web action text; retain action regression red/green output.
- [x] 4. Implement D: native-ratio relational layout learning in the existing reference document, including legibility and visual review boundaries.

## Integrated verification and delivery

- [x] 5. Exercise the integrated public workflow CLI; run complete QA with the required FONTTOOLS_PYTHON and record totals.
- [x] 6. Run pinned strict OpenSpec change validation and `npm run specs:check`.
- [x] 7. Commit this change on `fix/web-practice-round1` without pushing and write the requested external report.

## Regression evidence

Technical QA and agent pre-screening do not grant Visual Acceptance.

### A — completion and protected brief ownership

Command: `node --test --test-name-pattern="intake" tests/workflow-action-commands.test.cjs`.

```text
Before: tests 14; pass 0; fail 14; skipped 0; exit 1
next returned reference instead of intake for user BRIEF.md/brief.md.
Legacy intake decisions allowed an overwrite: Missing expected exception.
Directory collision returned EISDIR rather than OUTPUT_COLLISION.
After: tests 14; pass 14; fail 0; skipped 0; exit 0
```

Actual logs: `.design-pipeline/practice-round1/a-red.log` and `a-green.log`.
Film/edit/web/UI cover both filename cases, state/file preservation, unchanged owned
re-recording, missing-brief recreation, changed-byte refusal and legacy decision safety.
The final action suite also exercises matching-byte symlink refusal; the duplicate-case
two-file test is skipped on this case-insensitive Windows filesystem.

### B — returned commands executed outside the selected project

Command: `node --test --test-name-pattern="project root" tests/workflow-action-commands.test.cjs`.

```text
Before: tests 6; pass 0; fail 6; skipped 0; exit 1
Four copied records failed INPUT_MISSING: workflow: no project state.
Returned start record contained --project-root .
Storyboard verification searched the unrelated cwd.
After (expanded cohort): tests 8; pass 8; fail 0; skipped 0; exit 0
```

Actual logs: `b-red.log` and `b-green.log` in the local practice log directory above.
Four records execute unchanged from unrelated cwd against projects with spaces; a returned
storyboard verifier persists its result only in the selected project. Root binding includes
both existing `--root` and absolute `--project-root` where needed, preserving CLI containment.
Route coverage includes start/UI, stale-plan recovery, shared reference/waiver/resample,
concept/style/sample/review/delivery, film scaffold/storyboard/render/check, edit
analyze/auto/render/check and web verification.

Additional defect-specific red/green evidence:

| Command (`node --test --test-name-pattern=… tests/workflow-action-commands.test.cjs`) | Before | After | Local logs |
| --- | --- | --- | --- |
| `"project root scaffold"` | 1 test, 0 pass, 1 fail, exit 1; runtime.install was unbound `npm install` | passes in expanded 8-test cohort and final action suite | `b-handoff-red.log`, `b-green.log` |
| `"project root reference resample"` | 1 test, 0 pass, 1 fail, exit 1; missing `--root` in attached arguments | passes in expanded cohort; real resample writes selected project | `b-resample-red.log`, `b-green.log` |
| `"project root recorded gate"` | 1 test, 0 pass, 1 fail, exit 1; bare catalog repair command | 1 test, 1 pass, 0 fail, exit 0 | `b-repair-red.log`, `b-repair-green.log` |

Worker's final action suite: `node --test tests/workflow-action-commands.test.cjs` →
29 tests, 28 passed, 0 failed, 1 skipped. Scoped affected workflow/source checks also passed;
these do not replace the parent-owned full QA.

### C — concept guidance through the public CLI

Command: `node --test tests/web-concept-screening.test.cjs`.

Before the action-text fix (corrected harness, CLI cwd set to its temporary project):

```text
✖ web standard concept production requires structural divergence and screening
✖ web standard concept choice still requires screening when concepts.md exists
✖ web full concept production requires structural divergence and screening
✖ web full concept choice still requires screening when concepts.md exists
tests 4; pass 0; fail 4; skipped 0; exit 1
AssertionError: first-screen structure must genuinely diverge (missing skeleton)
AssertionError: compare like-size first screens
actual ask guidance: The first of two human decisions.
```

The earlier harness attempt failed CLI root containment before reaching concepts, so it is not
the regression proof. The run above reaches both action branches and fails on the missing
requested guidance.

After the action-text fix, the same command:

```text
✔ web standard concept production requires structural divergence and screening
✔ web standard concept choice still requires screening when concepts.md exists
✔ web full concept production requires structural divergence and screening
✔ web full concept choice still requires screening when concepts.md exists
tests 4; pass 4; fail 0; skipped 0; exit 0
```

### D — method review

Read all six practice evidence files and reviewed the new section in
`skill/references/reference-spec.md`. It couples subject/scene/clearance relations, studies the
native ratio before adaptation, preserves legibility and requires thumbnail screening. D is
documentation-only; no runtime or new test is needed.

## Parent integration evidence

- Public CLI smoke: user-owned `BRIEF.md` returns an intake ask with no completed stages.
  Recording returns exit 1 / `OUTPUT_COLLISION`; the assignment bytes and empty decisions
  remain intact. After explicitly renaming the assignment, the returned intake command
  succeeds from a cwd outside the project, records the brief digest, and the reference
  waiver leads to the new concepts instruction. The fixture is local ignored evidence.
- Integrated focused check:
  `node --test tests/workflow-action-commands.test.cjs tests/web-concept-screening.test.cjs`
  → 33 tests, 32 passed, 0 failed, 1 skipped, exit 0.
- First full `npm test` with the requested local `FONTTOOLS_PYTHON`:
  repository suite → 1,227 tests, 1,221 passed, 2 failed, 4 skipped, exit 1.
  Installed-package CLI smoke → 12 passed, 0 failed; reproducible packaging and
  byte-identical repository-status checks passed. Browser workspace tests were not reached
  because repository QA failed.
- The two failures were obsolete assertions in `film-project.test.cjs`: comparing complete
  handoff prose between different temporary roots and pinning unrooted runtime commands.
  Removed incidental command/prose expectations rather than pinning new spellings.
  Product source/sample prerequisite ordering, gate behavior, dependency pins, authored-file
  preservation and the existing source/sample workflow regressions remain covered.
- A focused rerun exposed another obsolete adjacency regex (`decide --stage sample`);
  removed that spelling assertion, leaving real sample-stage behavior to its workflow tests.
  `node --test tests/film-project.test.cjs` → 13 passed, 0 failed, exit 0.
- Initial strict checks: pinned change validation passed; `npm run specs:check`
  → 70 passed, 0 failed. The corrected-tree full rerun is recorded below.
- Skipped cases: three optional native GEPA runtime tests (no prepared `GEPA_PYTHON`);
  one separate-case duplicate-brief test (this Windows filesystem aliases case variants).

## Frozen implementation full QA

Implementation commit: `e3ffb1c4192a35f7e8df3d81937c0a36ed40b90c`.
Tested Git tree: `328e5427908e48a4c1179d7fe77e46c366553866`.
The implementation and test bytes remained frozen during the full rerun.

| Check | Observed result |
| --- | --- |
| Complete `npm test` with requested local `FONTTOOLS_PYTHON` | exit 0 |
| Registered repository tests | 126 files; 1,227 tests; 1,223 passed; 0 failed; 4 skipped |
| Installed-package public CLI smoke | 12 passed; 0 failed; 0 skipped |
| Browser automation workspace | prewalk adapter self-test and BuilderPort self-test both OK |
| Reproducible packaging | `.tgz`, `.zip` and checksums all identical between builds |
| Repository status preservation | QA leaves repository status byte-identical |
| `npm run specs:check` | 70 passed; 0 failed; exit 0 |
| Pinned strict change validation | valid; exit 0 |

The four skips are the same explicit environment boundaries listed above, not failures.
Subsequent changes before the review fixes were verification records only. The review fixes below
change runtime and test bytes; the frozen QA figures above do not verify those new bytes.

## Review fix implementation

- [x] 8. Item 1: return the complete installed `next` retry for invalid/stale Stage 0 plans, with absolute `--root`/`--project-root` and the same quoted plan path; execute both retries outside the spaced project.
- [x] 9. Item 2: use `film-edit` for analyze/auto/render handoffs; execute analyze-to-auto and auto-to-render outside the selected project. Bind audited score, Blender, foundation, catalog, route-note and standalone reference-resample commands; remove the project-less validator's obsolete bare retry and the redundant workflow resample override. Extend runtime regressions and the existing changelog.
- [x] 10. Item 3: inject the shell-path platform, reject Windows expansion/control characters with existing `CONTRACT_INVALID`, name the path and safe move/rename remediation, and validate installation paths through lazy `cliCommand()` calls. Keep POSIX escaping unchanged; register the four returned-command test files.
- [x] 11. Item 4: retain the parent's accepted risk in `design.md`, section “Review fix: accepted intake interruption risk”: interruption recovery fails closed with `OUTPUT_COLLISION` and requires manually moving the file. No intake code change or new regression is needed.

## Review fix focused regression evidence

These are actual focused worker runs, not full repository QA or Visual Acceptance.

### Item 1 — complete invalid/stale plan retry

Command: `node --test tests/returned-command-safety.test.cjs`.

```text
Before: tests 2; pass 1; fail 1; skipped 0; exit 1
invalid plan: missing complete recovery command
actual error tail: then rerun next with --job-plan plans/job plan with spaces.json
stale recovery already passed before this fix.
After: tests 2; pass 2; fail 0; skipped 0; exit 0
```

Both extracted retry commands execute from an unrelated directory after repairing the plan.
The selected project retains the same job-plan path/id and bytes; the unrelated directory stays empty.

### Item 2 — edit handoff execution and command audit

Command: `node --test tests/returned-edit-commands.test.cjs`.

```text
Before: tests 1; pass 0; fail 1; skipped 0; exit 1
returned auto began with designer-pipeline film edit; shell execution returned exit 1.
After: tests 1; pass 1; fail 0; skipped 0; exit 0
```

The test supplies the advertised style/duration options, executes returned auto and render
against real ffmpeg-generated media from an unrelated directory, verifies the rendered file
and bound check handoff, and leaves the unrelated directory empty. An intermediate attempt
exposed a test-harness error (`.result` on the CLI's flat JSON envelope); corrected that reader
before recording the passing result. The initial red failed before JSON parsing, on the actual
unrunnable returned command.

Command: `node --test tests/returned-command-audit.test.cjs`.

```text
Before (foundation/audio cohort): tests 2; pass 0; fail 2; skipped 0; exit 1
foundation: node <design-pipeline>/scripts/init-design-synthesis.cjs ... --project-root .
audio: missing complete quoted repair; actual fix began designer-pipeline audio master.
After (same cohort): tests 2; pass 2; fail 0; skipped 0; exit 0
```

The foundation initializer and audio-master repair execute from unrelated directories against
spaced project/file names. Foundation initialization writes the selected change manifest;
mastering writes the selected `quiet score-mastered.wav`.

Command: `node --test --test-name-pattern="film score writes|film blender renders into|change init, status/resume" tests/film-score.test.cjs tests/film-blender.test.cjs tests/designer-pipeline-cli.test.cjs`.

```text
Before: tests 3; pass 0; fail 3; skipped 0; exit 1
foundation validator: designer-pipeline foundation check --kind design
Blender next: Run designer-pipeline film check --project-root .
score fixture: CONTRACT_INVALID for evidence/second-%03d.png after the Windows safety guard landed
After: tests 3; pass 3; fail 0; skipped 0; exit 0
```

The score fixture exposed an interaction with generated ffmpeg output patterns, not the bare
score handoff assertion itself. Windows scaffold frame review now uses the existing rooted
reference-video analyzer at 1 fps, so no percent-pattern path must enter a returned command;
POSIX retains the original ffmpeg extraction. Score/Blender use their existing injected-tool
fixtures to validate returned command binding; these runs do not claim real Strudel/Blender execution.

Command: `node --test --test-name-pattern="catalog is cached|a persisted plan whose query" tests/film-catalog-3d.test.cjs tests/job-route.test.cjs`.

```text
Before: tests 2; pass 0; fail 2; skipped 0; exit 1
catalog fix: designer-pipeline film blocks --query <action>
project-less plan validation advertised designer-pipeline route without a project binding.
```

Command: `node --test --test-name-pattern="catalog is cached|a persisted plan whose query|project root recorded gate" tests/film-catalog-3d.test.cjs tests/job-route.test.cjs tests/workflow-action-commands.test.cjs`.

```text
After (expanded cohort): tests 3; pass 3; fail 0; skipped 0; exit 0
```

The rooted catalog repair actually executes against the project's cached catalog from an
unrelated directory. The project-less plan validator retains its conflict/replan explanation
without advertising a misleading command; the workflow error owns the complete rooted retry.
Generated Markdown prose and scaffold source templates are not emitted bare commands:
the scaffold binds its templates before returning them. Capture error prose no longer
advertises a bare executable name. Typed route handoff argv remains unchanged.

Command: `node --test --test-name-pattern="direct reference video resample handoffs" tests/reference-video.test.cjs`.

```text
Before: tests 1; pass 0; fail 1; skipped 0; exit 1
observe-window must invoke the installed CLI without a PATH alias
actual command: designer-pipeline
After: tests 1; pass 1; fail 0; skipped 0; exit 0
```

All four direct-API resample kinds (`observe-window`, `observe-shot-property`,
`resample-budget`, `prepare-full-source`) execute outside the spaced selected project into
distinct new evidence directories. The original report bytes and sampling arguments stay
unchanged; semantic acceptance remains unassessed. The entire focused reference-video suite
also ran: `node --test tests/reference-video.test.cjs` → 8 tests, 8 passed, 0 failed,
0 skipped, exit 0. The shared workflow no longer adds a second root binding.

### Item 3 — injected Windows safety and lazy installation validation

Command: `node --test tests/returned-shell-paths.test.cjs`.

```text
Before: tests 15; pass 1; fail 14; skipped 0; exit 1
Windows unsafe paths: Missing expected exception.
platform injection was ignored; the lazy cliCommand API did not yet exist.
After: tests 15; pass 15; fail 0; skipped 0; exit 0
```

The Windows branch is explicitly injected, so Linux CI exercises the same rejection path.
Coverage includes `$(x)`, backtick, `%PATH%`, `!x!`, double quote, newline, carriage return,
tab, NUL, DEL and a C1 control; normal spaced paths remain usable and POSIX escaping is pinned.
The test imports actual copied production modules from an unsafe installation directory:
import succeeds and only Windows command generation fails with `CONTRACT_INVALID`, naming
the path and move/rename remediation. A normal spaced installation's generated command
executes from an unrelated directory.

### Integrated focused command verification

Exact command after all worker changes landed:

```text
node --test --test-name-pattern="plan recovery|edit analyze and auto|win32|POSIX|installation|missing foundation initialization|audio loudness|Windows scaffold|project root|direct reference video resample handoffs|film score writes|film blender renders into|change init, status/resume|catalog is cached|a persisted plan whose query" tests/returned-command-safety.test.cjs tests/returned-edit-commands.test.cjs tests/returned-shell-paths.test.cjs tests/returned-command-audit.test.cjs tests/workflow-action-commands.test.cjs tests/reference-video.test.cjs tests/film-score.test.cjs tests/film-blender.test.cjs tests/designer-pipeline-cli.test.cjs tests/film-catalog-3d.test.cjs tests/job-route.test.cjs
```

```text
First integration: tests 36; pass 34; fail 2; skipped 0; exit 1
Windows scaffold analyzer: CONTRACT_INVALID, path must be a contained relative path
Film review action: CONTRACT_INVALID for evidence/second-%03d.png
Corrected integration: tests 36; pass 36; fail 0; skipped 0; exit 0
```

The first run exposed the same unsafe percent-pattern in the film workflow's review action
and the analyzer's relative-path contract. Both Windows frame-review commands now bind the
absolute root and use contained relative inputs/outputs. The workflow selects a new available
review directory without overwriting existing evidence. The Windows regression executes the
scaffold's 1-fps analysis and the later review action from an unrelated directory, verifies
both real decoded reports/frames and preservation of the earlier review directory.
This added Windows-specific execution test is intentionally skipped on POSIX; injected
win32 shell-path safety tests are not skipped on Linux CI.

### Worker boundaries

The full repository QA, `npm run specs:check`, strict change validation, final commit and
external report are parent-owned and were not run or claimed by this worker. No tickets,
commit or push were performed; `design.md` was intentionally left to the parent.

### Integration QA fixture and assertion repairs

Parent-observed full QA before these repairs: tests 1249; pass 1243; fail 2;
skipped 4. These failures were not rerun to reconfirm:

- `tests/film-methods.test.cjs:83`: the isolated same-length tamper fixture failed
  with `MODULE_NOT_FOUND` because copied `film-hints.cjs` now requires
  `./workflows/shared.cjs`. The fixture now copies the actual production shared
  module; its eager local dependency, `contract-utils.cjs`, was already copied.
  The four source-byte mutations still assert `SOURCE_CHANGED` and no generated
  `film-methods.md`, so the tampering boundary remains exercised.
- `tests/workflow-next.test.cjs:165`: the exact command-text equality expected
  `undefined next --change-root <change> --plan <file>` via obsolete `shared.CLI`,
  while the actual command starts with the runnable Node CLI path. Deleted this
  incidental wording assertion and its unused import instead of repinning text.
  Concrete decomposition, supplied target/property/guides, observation
  instructions and absence of legacy workflow state remain asserted.

Symbol/reference migration check: structural `$OBJ.CLI` search and destructured
`CLI` require search across `tests/**/*.cjs` and `skill/scripts/**/*.cjs` found no
remaining obsolete references after the deletion. No production behavior or
`design.md` changes were made.

Exact targeted passing command:

```text
node --test --test-name-pattern="same-length tampering of consumed source bytes|native visual next asks for a concrete decomposition" tests/film-methods.test.cjs tests/workflow-next.test.cjs
```

Observed output (exit 0):

```text
✔ same-length tampering of consumed source bytes fails in an isolated package before writing (39.845ms)
✔ native visual next asks for a concrete decomposition without creating legacy workflow state (173.0435ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 300.5812
```

This focused pass verifies only these repaired integration boundaries. Full QA,
lint/build/format and OpenSpec validation remain parent-owned; no tickets,
commit or push were performed by this repair worker.

### Parent final verification

- Full QA after the integration repairs, with the requested local `FONTTOOLS_PYTHON`
  explicitly bound to the npm process: `npm test`, exit 0.
  Repository: 130 test files, 1249 tests, 1245 passed, 0 failed, 4 skipped.
  Installed-package public CLI smoke: 12 tests, 12 passed, 0 failed, 0 skipped.
  Browser adapter and BuilderPort self-tests passed. Package tarball, zip and
  checksums were reproducible; QA left repository status byte-identical.
- `npm run specs:check`: 70 passed, 0 failed, exit 0.
- `npm exec -- openspec validate improve-web-from-practice-round1 --strict`:
  change valid, exit 0.
- Additional actual CLI smoke: an invalid spaced plan filename produced
  `CONTRACT_INVALID` with complete quoted route/retry commands. After replanning
  and initializing the film state, the returned retry ran from an unrelated cwd,
  returned the film/quick plan action, and persisted the original spaced filename
  and plan digest in the selected project's state. The initial retry before state
  initialization correctly failed with `INPUT_MISSING`; this was a smoke setup
  omission, not a recovery regression. Removed both temporary smoke files.
- The first full-QA invocation used unsupported shell environment-assignment
  syntax and did not bind the requested override. Its observed two test failures
  are recorded above; the final full run used an explicit Windows `cmd` binding
  verified before execution.


## Review fixes round 2

- [x] 9.1 Refuse multiply-linked intake briefs and replace owned briefs through a same-directory temporary file and rename.
- [x] 9.2 Bind both roots in migrated catalog repair commands; execute the regression independently of ffmpeg.
- [x] 9.3 Audit all returned commands for required root bindings and repair omissions.
- [x] 9.4 Run full repository QA with the requested fonttools override and strict OpenSpec checks; commit without pushing and write the external report (commit SHA and report delivery recorded in the external report).

### Intake regression: red and green

Command for both runs:

```text
node --test --test-reporter=spec --test-name-pattern="intake hardlink|intake owned rewrite" tests/workflow-action-commands.test.cjs
```

Before implementation (exit 1):

```text
✖ intake hardlink collision preserves external bytes and state through the CLI (165.2846ms)
✖ intake owned rewrite replaces the brief entry through the CLI (157.2331ms)
ℹ tests 2
ℹ suites 0
ℹ pass 0
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1538.7603
```

The hard-link case changed the external file from 22 to 41 bytes. The owned rewrite
retained inode `26740122792498531n`, proving in-place mutation.

After implementation (exit 0):

```text
✔ intake hardlink collision preserves external bytes and state through the CLI (178.3898ms)
✔ intake owned rewrite replaces the brief entry through the CLI (180.3893ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 478.956
```

The tests exercise the actual CLI, external linked-file bytes, unchanged rejected
state, successful owned rewrite contents/state and replacement file identity.
Hard-link creation skips only on hosts that do not support it; neither case depends
on ffmpeg.

### Catalog projection regression

Command: `node --test --test-name-pattern="legacy catalog repair projection" tests/returned-command-audit.test.cjs`.

Before (exit 1):

```text
✖ legacy catalog repair projection runs from unrelated cwd without media tools (96.5855ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 205.3632
AssertionError [ERR_ASSERTION]: {"schema":"design-pipeline.cli-result.v1","ok":false,"error":{"code":"CONTRACT_INVALID","message":"cli: --project-root requires a path","details":{}}}
1 !== 0
```

After (exit 0):

```text
✔ legacy catalog repair projection runs from unrelated cwd without media tools (88.3089ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 195.3424
```

The projected CLI runs with Node-only PATH, a spaced project and cached catalog;
query, saved finding/state and unrelated directory remain intact.

### Returned-command audit

Audited installed CLI builders, historical templates, root flags, scaffold rewrites
and resampling argv in audio, Blender, CLI, design synthesis, edit, film hints/project,
reference video, score, workflow core, shared/film/edit/web workflows and skill/tools.
Three additional native visual templates lacked `--root`: decomposition `next`,
task completion `decide`, and review record. They now bind both `--root` and
`--change-root`. Native handlers do not use `--project-root`. Root-only media/toolchain
commands and standalone synthesis's project-root-only parser are intentional.
Scaffold guide rewrites and reference resampling argv already bind correctly.

Command: `node --test --test-name-pattern="native returned .* command selects" tests/workflow-next.test.cjs`.

Before (exit 1):

```text
✖ native returned decompose command selects its change from unrelated cwd without media tools (559.6701ms)
✖ native returned complete command selects its change from unrelated cwd without media tools (510.3873ms)
✖ native returned review command selects its change from unrelated cwd without media tools (1388.2342ms)
ℹ tests 3
ℹ suites 0
ℹ pass 0
ℹ fail 3
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2570.4664
```

All three failed `CONTRACT_INVALID: --change-root must stay inside <unrelated cwd>`.
After (exit 0):

```text
✔ native returned decompose command selects its change from unrelated cwd without media tools (288.3992ms)
✔ native returned complete command selects its change from unrelated cwd without media tools (1439.5129ms)
✔ native returned review command selects its change from unrelated cwd without media tools (1592.2929ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3429.4304
```

Completion reaches gate-blocked exit 2 rather than root-validation exit 1;
decomposition and review succeed without changing the unrelated directory.

### No-media command-contract verification

`cmd /d /c "set PATH=C:/Program Files/nodejs&&node --test tests/returned-command-audit.test.cjs"`:
exit 0, tests 5, pass 3, fail 0, skipped 2 (audio and real video decoding).
Pure Windows frame-review assertions remain exercised without media tools.
The real decode test now follows `hasFfmpeg`/skip: its no-media before run had
tests 2, pass 1, fail 1, skipped 0 (absent ffmpeg spawn); after had tests 2,
pass 1, fail 0, skipped 1.

`cmd /d /c "set PATH=C:/Program Files/nodejs;C:/Program Files/Git/cmd&&node --test --test-name-pattern=native.returned.*command.selects tests/workflow-next.test.cjs"`:
exit 0, tests 3, pass 3, fail 0, skipped 0, with no ffmpeg/ffprobe on PATH.

### Round 2 parent integration verification

- Integrated actual-CLI regressions: `node --test --test-name-pattern="intake hardlink|intake owned rewrite|legacy catalog repair projection|native returned .* command selects" tests/workflow-action-commands.test.cjs tests/returned-command-audit.test.cjs tests/workflow-next.test.cjs`; exit 0, tests 6, pass 6, fail 0, skipped 0.
- Full requested QA: `cmd /d /c "set FONTTOOLS_PYTHON=D:/Temp/dp-fonttools-venv/Scripts/python.exe&&npm test"`; exit 0. Repository: 130 files, 1256 tests, 1252 passed, 0 failed, 4 skipped. Installed public CLI smoke: 12 passed, 0 failed, 0 skipped. Browser adapter and BuilderPort self-tests passed; QA left repository status byte-identical.
- `npm run specs:check`: exit 0, 70 passed, 0 failed.
- These are technical/command-contract checks, not Component Conformance or Visual Acceptance claims.

### Final verification correction

The pure Windows frame-review contract now injects win32 and restores the original
platform descriptor; it has no OS or ffmpeg skip and runs on Linux CI too.
The actual decoding test retains its host/media prerequisites.
Node-only PATH audit rerun: exit 0, tests 5, pass 3, fail 0, skipped 2.
The earlier full QA began before documentation edits finished, so final delivery
uses a fresh full QA and specs run after freezing all committed files.
Final frozen-tree result and commit SHA are recorded in the external report.
