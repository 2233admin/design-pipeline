# Tasks

Words are used as in the glossary at the top of
`docs/superpowers/specs/2026-09-30-web-capability-skills.md`. Interfaces are fixed in `design.md` and
are not restated here or in the guides: guide paths and headings (section 4), routing text, the
description, the size budget, the `next` pointers and the tool-list entries (section 5), the procedure
and the record (section 6), the numbers N1 to N17 (section 7), the blind recipe (section 8).

## Order and prerequisites

Order of the three changes: (1) `fix-tool-guidance-errors`, (2) `add-capability-registry`, (3) this
change. `add-web-treatment-and-section-briefs` is committed as `b631fcd`. Neither (1) nor (2) is
committed yet, and this change starts only when both are (T0 checks). The registry change's section
"Rules for later changes" (in its `tasks.md`) applies to every guide this change adds; it is followed
here and not copied.

Order inside this change:

- Phase A, which ends with the changed-arm commit: T0 (gate, alone); wave 1, T1, T2, T3 and T4 in
  parallel; wave 2, T5; wave 3, T6.
- Phase B, which ends with the protocol commit: wave 1, T7; wave 2, T8.
- Phase C, the evaluation, is run by the user and is not a task.

Each worker edits only the files it owns. No file has two owners within a wave.

### Shared files: who edits what, by change and by task

Each of the three changes lands and is committed before the next starts, so these edits never happen at
the same time. The last change to land (this one) measures `skill/SKILL.md`.

| File | `fix-tool-guidance-errors` | `add-capability-registry` | this change |
| --- | --- | --- | --- |
| `skill/SKILL.md` | its `SKILL.md` task: the `standard` row of the tier table and the first sentence of "The user decides twice in standard work" (two lines, about +100 bytes) | its pointers task: one bullet under "Where the details are" (about +80 bytes) | T4 (Phase A) alone: the front-matter `description` (+124) and the web bullet (+130); nothing else. Measures `wc -c` and `wc -l`; limit 5,120 |
| `.claude/skills/design-pipeline/SKILL.md` (router) | none | its pointers task: one line under `<reference_guides>` | T7 (Phase B) alone: one `<intake>` bullet |
| `scripts/tool-list.json` (repository only, not shipped) | none | creates it | T5 (Phase A): two entries; T7 (Phase B): one entry |
| `skill/references/tool-map.md` (generated, shipped) | none | creates it | T5: rewritten by `--write`; T7: `--write` then `--check`, no change expected |
| `skill/references/package-resources.json` | none | its closure: adds `tool-map.md` | T6 (Phase A): the two web guides; T8 (Phase B): the evaluation guide and the briefs |
| `CHANGELOG.md` | its closure | its closure | T6, T8 |
| `scripts/test-manifest.json` | none | its test task: adds `tool-list.test.cjs` | none (this change adds no test file) |
| `tests/workflow-next.test.cjs` | its `ui` intake task | none | T3: link checks |
| `tests/claude-code-surface.test.cjs` | none | none | T3: four structure checks |
| `skill/scripts/workflows/web.cjs`, `skill/references/workflow-web.md`, `skill/references/web-direction.md`, `skill/references/qa-checklist.md` | none (its plan forbids editing the first three) | none | T3 |
| `skill/references/pipeline-reference.md` | one sentence | none | none |

## Verification protocol

The only sanctioned check is `node scripts/qa.cjs`, run directly with no pipe or redirect into the
repository (`AGENTS.md`: never bare `node --test`). It has no scoped mode. It compares
`scripts/test-manifest.json` with `tests/*.test.cjs`, packages `skill/` twice, installs from the archive,
runs the registry test, and fails unless `git status` is the same at the end as at the start. Workers do
not run it; T6 and T8 run it once each on a quiet tree and hand failures back to the owner. A worker may
check its own change with a throwaway script outside the repository; that is smoke evidence, not the
check. `node scripts/tool-list.cjs --check` never writes, so any worker may run it.

`qa.cjs` has no `puppeteer-core`, so it never runs capture. The capture smokes in T2, T6 and T7 use
`--puppeteer-module D:/projects/design-pipeline/tern-snapshot-1/runtime/node_modules/puppeteer-core` (the
copy found on this machine, Q12) on a page in a scratch folder outside the repository.

No new test file is added, so `scripts/test-manifest.json` does not change.

## Done in this slice

- [x] Read the packaging, discovery, benchmark and capture code; probed Codex discovery, the description
  limits, benchmark v2 and the capture path on this machine (`design.md` section 2).
- [x] Write the proposal, design, tasks, two spec deltas and the approval document
  `docs/superpowers/specs/2026-09-30-web-capability-skills.md`.
- [x] Amended after an audit: tool-list registration, the description rewrite, the evaluation guide moved
  to `skill/evals/web/README.md`, plain wording, stale facts, and the note in Q9.
- [x] `openspec validate add-web-capability-skills --strict` passes.

## Phase A: the changed arm

### T0 Gate (integrator, alone, size S)

Edits no file. Reports its findings to Main; T6 copies them into `qa.md`.

- [ ] `git log --oneline` shows `b631fcd` and the commits of `fix-tool-guidance-errors` and
  `add-capability-registry`. If one is missing, stop: this change does not start.
- [ ] The working tree holds nothing but this change's own documents.
- [ ] Read the registry change as it landed: the names of the tool list, the map, the script and the test;
  the entry fields; the guide-id rule; the section "Rules for later changes". If anything differs from
  `design.md` F14 and 5.6, correct `design.md` first, then T5 and T7.
- [ ] Run `node scripts/tool-list.cjs --check`. It must exit 0 on the clean tree, so the list is healthy
  before this change adds to it.
- [ ] Measure `skill/SKILL.md` with `wc -c` and `wc -l`. This is the baseline of `design.md` 5.3 (4,108
  bytes and 76 lines at `b631fcd`; about 4,290 expected with the two earlier changes).
- [ ] Record `git rev-parse HEAD`: the baseline arm of comparison A (the commit just before the first
  Phase A commit).
- Proves: the ground is as the documents assume. Nothing else.

### Wave 1

#### T1 `web-treatment.md` (size L)

Owns the new `skill/references/web-treatment.md`.

- [ ] Write it as `design.md` 4.1 fixes: the `## Contract` block (no list of trigger phrases) and the
  headings `## Concept cards`, `## Style table`, `## Before you say done`; the eight parameters with
  their value sets and the four-parameter rule with the pairwise count; the Style table slots; the ten
  default blacklist patterns with the exception rule; the `replicate` and `freeform` mode rules; the
  checklist; the "never" line. About 9 KB, under 10 KB.
- [ ] Point to the `web-direction.md` headings (`## Treatment`, `## Section briefs`); copy no table of
  it (the five treatment fields, the brief mapping, W1 to W7).
- Proves: nothing by test. Read-through against `design.md` 4.1 and `specs/web-workflow/spec.md`.

#### T2 `web-review.md` (size M)

Owns the new `skill/references/web-review.md`.

- [ ] Write it as `design.md` 4.2 fixes: the `## Contract` block (no trigger phrases) and the headings
  `## Capture`, `## First-viewport test`, `## Answering W1 to W7`, `## Report`, `## Secondary review`,
  `## Before you say done`. Give the capture commands as runnable lines (`composition capture --root
  <project> --composition index.html --output evidence/web/<w>x<h> --width <w> --height <h>
  [--puppeteer-module <path>] [--chrome <exe>]`, then `verify composition --root <project> --image ...
  --elements ... --profile ui`), the preflight rule that names a missing tool, the below-the-fold
  `text-off-canvas` rule, the per-section anchor recipe (marked as seen on a synthetic page only), the
  answer format, the report order and the secondary-review heading word for word.
- [ ] Copy no W table; each answer follows the "Looks right" cell of `web-direction.md`.
- [ ] Smoke, in the hand-off and not committed: with the sibling `puppeteer-core`, run the documented
  commands as printed on a fixture page at 375x812, 768x1024 and 1440x900; and once without
  `--puppeteer-module` to see the message the guide tells the reviewer to expect.
- Proves: nothing by test. The smoke shows the printed commands run; it does not show the review is good.

#### T3 Pointers and tests (size M)

Owns `skill/scripts/workflows/web.cjs`, `skill/references/workflow-web.md`,
`skill/references/web-direction.md`, `skill/references/qa-checklist.md`, `tests/workflow-next.test.cjs`
and `tests/claude-code-surface.test.cjs`.

- [ ] `web.cjs`: the three `next` pointers of `design.md` 5.5; every other word of the actions unchanged;
  the quick-tier `build` text byte-identical.
- [ ] `workflow-web.md`: one pointer in each of `## concepts`, `## build`, `## review`; one `##` heading
  per stage id kept. Keep every existing mention of `web-direction.md` in `## concepts`, `## build`,
  `## probe` and `## review`: the tool list claims `web-direction.md` for those four stages and the
  registry test checks the claims against these sections and the `next` actions.
- [ ] `web-direction.md`: the "Style-bible seed" row points to `## Style table` and lists no slots; one
  line in the review-rules intro names `web-review.md`. No other edit.
- [ ] `qa-checklist.md`: in the section "Web Treatment And Section Review (Visual Acceptance)" add rows
  for the first-viewport test and the blacklist line, and the line that a secondary review is labelled
  `SECONDARY REVIEW - model, NON-BLIND, NOT COUNTED`.
- [ ] `tests/workflow-next.test.cjs`: for a standard web project at `concepts`, `build` and `review`,
  every `references/...` path the serialized action names exists under `skill/`; the `concepts` and
  `build` actions name `references/web-treatment.md`; the `review` ask names `references/web-review.md`
  and `references/web-direction.md`; the quick `build` command does not name the treatment; no web
  action of any tier or stage contains `evals/`; the existing deep-equality tests for film, edit and ui
  stay as they are.
- [ ] `tests/claude-code-surface.test.cjs`: one new test with four structure checks: `skill/SKILL.md` is
  under 5,120 bytes and 500 lines; every backticked `references/...` path it names exists; the
  `SKILL.md` files under `skill/` outside `upstream` folders are exactly `skill/SKILL.md`; the front-matter
  `description` is one line of 1 to 1,024 characters with no colon followed by a space and no space
  followed by `#`. None of the four reads the wording of the description.
- Proves: the `next` output (paths exist, the quick tier and the other deliverables unchanged) and the
  four structure checks. Does not prove that an agent follows the pointers or that a host picks the skill.

#### T4 Front door (size S)

Owns `skill/SKILL.md` and nothing else.

- [ ] Replace the web bullet with the bullet of `design.md` 5.1.
- [ ] Replace the `description` line with the text of `design.md` 5.2, on one line: no line break, no
  colon followed by a space, no space followed by `#`, at most 1,024 characters (529 expected). Change
  neither `name` nor any other line: not the tier row or the decision line (guidance-fix change), not
  the registry's bullet.
- [ ] Report `wc -c` and `wc -l`: baseline + 254 expected, and under 5,120 bytes.
- [ ] Check, with a throwaway script outside the repository, that the front matter still parses: `name`
  is `design-pipeline`, the description is one line, and the value holds no colon-space or space-hash.
  (T3's test keeps this true from now on; the Codex smoke of T6 shows a real host reads it.)
- Proves: the byte and line counts and the description's structure. Not that any host triggers the skill
  for the right requests: that is the user's trigger table in T6.

### Wave 2

#### T5 Registration in the tool list (size S)

Owns `scripts/tool-list.json` and `skill/references/tool-map.md`. Runs after T1 to T4 have landed,
because the stage claims are proved by the `next` pointers (T3) and the front door names the guides (T4).

- [ ] Add the two entries of `design.md` 5.6 (`web-treatment`: `web:concepts`, `web:build`; `web-review`:
  `web:review`) next to `doc-web-direction`, with the ids and field names the landed registry uses.
- [ ] Run `node scripts/tool-list.cjs --write`, then `node scripts/tool-list.cjs --check`; the second
  must exit 0. Do not edit the map by hand.
- [ ] Read the diff of the map: only the rows of the stages `web:concepts`, `web:build` and `web:review`
  changed, and nothing else.
- Proves: the registry check passes with the new guides. It does not prove that the summaries are true.

### Wave 3

#### T6 Phase A closure (integrator, size M)

Owns `skill/references/package-resources.json`, `CHANGELOG.md` and the new
`openspec/changes/add-web-capability-skills/qa.md`; ticks the boxes of this file.

- [ ] `package-resources.json`: add `references/web-treatment.md` and `references/web-review.md` to
  `required`, next to `references/web-direction.md`.
- [ ] `CHANGELOG.md` under Unreleased: Added (the two web guides; four structure checks); Changed (the
  front-door description and web bullet; the web `concepts`, `build` and `review` `next` actions point to
  the guides), each naming the change id.
- [ ] Run `openspec validate add-web-capability-skills --strict`, then `node scripts/tool-list.cjs
  --check`, then `node scripts/qa.cjs` directly on a quiet tree; hand failures back to the owner and run
  again.
- [ ] Codex smoke (the check for the description). With a throwaway script outside the repository: package
  and install the skill with `install-local.cjs` into a temporary `CODEX_HOME`, start `codex app-server`
  with it, send `initialize`, `initialized` and `skills/list` with `forceReload: true`. Expected:
  `design-pipeline` is listed with the whole new description and the loader reports no error for its
  path. (Today, a description with a colon-space is dropped without any message to the user; `design.md`
  F13.) Record the output and Codex's version.
- [ ] Smoke of `next`: on temporary web projects outside the repository, `next` at `concepts`, `build` and
  `review` shows the pointers; a film project's text is unchanged.
- [ ] Smoke of capture: the commands printed in `web-review.md` run as printed with the sibling
  `puppeteer-core`.
- [ ] Trigger table, for the user. Write into `qa.md` a table of sample requests with a `Result` column
  left `pending`: must trigger the skill: "build a landing page for our app", "make a website for our
  product", "design system for our dashboard", "build a UI component for a settings page", "clone this
  website", "make a 15-second promo film for our tool", "cut a PV to this song", "make this page not
  look like a generic template", "review the page I just built"; must not: "review my pull request",
  "design the API of the billing module", "write a UX research plan". The user runs it against the
  host they use and fills the column. No agent fills it.
- [ ] Write `qa.md` (format of `openspec/changes/add-web-treatment-and-section-briefs/qa.md`):
  Conformance (verified, with the exit codes seen), open questions and answers, `Visual Acceptance:
  PENDING` with no reviewer, Not verified. Record the two hashes that fix the arms of comparison A: the
  baseline from T0, and the changed-arm commit once it exists.
- [ ] Main commits: the changed-arm commit. Nothing of Phase B is in it.

## Phase B: the evaluation guide

### Wave 1

#### T7 Evaluation guide, briefs, router bullet and registration (size L)

Owns the new `skill/evals/web/README.md` and `skill/evals/web/briefs.md`,
`.claude/skills/design-pipeline/SKILL.md` (one bullet) and `scripts/tool-list.json` (one entry). Runs
`--write` on `skill/references/tool-map.md`, which an internal entry does not change.

- [ ] Write the guide as `design.md` 4.3, 6, 7 and 8 fix: the `## Contract` block (no trigger phrases) and
  the headings of 4.3; the conditions table; arms and what counts as the change under test, for
  comparison A (default) and B (optional); the numbers table N1 to N17 marked provisional until the lock
  commit; the procedure E0 to E13 with the void and loss rules; the review rounds; the verdicts; the
  made-up-steps table; the record fields; the blind recipe of 8.1 with its `node -e` blocks word for
  word; a "Not covered" section (no visitors, no ablation, one reviewer, a held-out set works once). About
  12 KB.
- [ ] Check the recipe blocks on a fixture tree in a scratch folder outside the repository: the same seed
  gives the same pack and key; the two orientations differ by at most one per model; the order is a
  permutation; no arm label or model id remains in the pack; the leak scan finds a planted
  `design-pipeline` token; comments and generator metadata are stripped. Put the transcript in the
  hand-off.
- [ ] `briefs.md`: the two `dev` briefs (product, audience, scope, assets each; no dominant element,
  driver or layout named; no film wording; no duration); the proposed held-out page types listed as text
  for the user's approval, with no held-out brief written.
- [ ] Router: one `<intake>` bullet naming `skill/evals/web/README.md` (`design.md` 5.4); XML tags kept, no
  headings. Do not touch `skill/SKILL.md`: the front door names nothing under `evals/`.
- [ ] Register the guide as the internal entry of `design.md` 5.6, with a `reason`. Run
  `node scripts/tool-list.cjs --write`, then `--check`; it must exit 0. Without the entry the router
  bullet fails the registry test.
- Proves: nothing by test except the registry check. The fixture check shows the recipe is deterministic
  and hides the arm; it does not show the protocol is sound.

### Wave 2

#### T8 Phase B closure (integrator, size S)

Owns `skill/references/package-resources.json`, `CHANGELOG.md` and `qa.md` (append); ticks boxes.

- [ ] `required`: add `evals/web/README.md` and `evals/web/briefs.md`, next to `evals/film/README.md`.
- [ ] `CHANGELOG.md` under Unreleased: Added (the evaluation guide and the `dev` briefs).
- [ ] Run `openspec validate add-web-capability-skills --strict`, `node scripts/tool-list.cjs --check` and
  `node scripts/qa.cjs` once.
- [ ] Run E0 as the guide prints it on this machine and record the tools (Node, Chrome, `puppeteer-core`
  path and version) in `qa.md`.
- [ ] Append to `qa.md`: Conformance (verified), and `Visual Acceptance: PENDING`.
- [ ] Main commits: the protocol commit.

## Phase C: the evaluation (user-run, not a task)

Steps E0 to E13 of `design.md` 6.3, in order, with the arms of 6.1. Default: comparison A, the baseline
recorded by T0 against the changed-arm commit of T6. Comparison B (baseline `bbf7fa4`, same changed arm)
only if the user asks for it (Q13); it is recorded and reported separately and never combined with A. The
pilot, the amendment window, the lock commit, the held-out briefs commit, the confirmatory run, round 2,
the count and the verdicts are recorded by the operator in `qa.md` under `Visual Acceptance (capability
evaluation)`. Agents never record the verdict.

## Deferred

- [ ] T9 (only if the pilot shows the manual recipe is run more than once or breaks, Q9): move the code
  blocks of the evaluation guide into one file, `skill/evals/web/blind-pack.cjs`, as `design.md` 8.3
  fixes. Owns that file, a new test file, `scripts/test-manifest.json` and the code blocks of
  `skill/evals/web/README.md`; `package-resources.json` gets the new file in `required`. It is not a CLI
  command and not a gate. Needs its own spec delta.

## Pending (not done by any task above)

- [ ] Run the evaluation and record the result; until then Visual Acceptance stays pending.
- [ ] The user runs the trigger table of T6.
- [ ] Recalibrate W1 to W7 from the calibration table of step E12.
- [ ] Fix `verify composition` for pages taller than the window, or ship the multi-viewport capture
  (change 4 of `docs/superpowers/specs/2026-09-29-web-creative-layer.md`).
- [ ] Decide what to do about the eight vendored `interface-discipline` skills that Codex lists.
