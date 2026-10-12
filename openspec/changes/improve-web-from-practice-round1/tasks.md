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
Subsequent changes are verification records only; they do not change runtime or test bytes.
