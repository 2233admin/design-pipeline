# Tasks

## 1. Planning

- [x] 1.1 Write the proposal, the `web-workflow` delta, the design and these tasks from `openspec instructions <artifact>`; verified with `npm exec -- openspec validate owner-attention-change-tiers --strict`.
- [ ] 1.2 Independent review by an agent that did not write the artifacts, with every finding answered in them; verify by re-running strict validation after the revision.

## 2. Approval inputs and section keys (Decisions 1, 2)

- [ ] 2.1 `briefSections` returns `{id, job}`, and `recordDescription` stores `inputs` (brief bytes, section lines, playback, direction and components hashes) in place of `upstream`; verify with a `workflow-next` test that the approval record holds `inputs` and no `upstream`.
- [ ] 2.2 `recordSection` stores the section key, and `sectionProgress` counts a verdict by key; verify that a prose typo plus a `bytes` re-approval keeps every accepted section, that a changed job line reopens only that section, and that a re-picked variant reopens all of them.
- [ ] 2.3 Update the existing tests that assert the old cascade (a changed description re-asks every section) to the new behaviour; verify with `node --test tests/workflow-next.test.cjs tests/workflow-components.test.cjs`.

## 3. Change tier on re-approval (Decision 3)

- [ ] 3.1 `cli-core.cjs`: register `--change` and `--affects`, pass them to `decide`, and add help lines; verify that the flags parse and an unlisted flag still fails with `UNKNOWN_OPTION`.
- [ ] 3.2 `recordDescription` checks `--change` and `--affects` against `diffInputs`; verify each refusal with no state change: a missing tier on a changed approval, a tier on a first or identical approval, `bytes` on a structural diff (the message names it), `--affects` with an unknown id or without `commitment`.
- [ ] 3.3 `commitment --affects` reopens exactly the named sections (or all); verify with a test that reopens hero and keeps proof.

## 4. Kept description carry-forward (Decision 4)

- [ ] 4.1 `decide` lets `--by agent` record a `bytes` re-approval of an owner-kept description, `recordRole` keeps refusing every other agent record there, and the role entry keeps `change`; verify that a bytes carry-forward passes and that `commitment --by agent` is refused with no change.
- [ ] 4.2 The statement lists a carry-forward as an agent decision with its tier; verify the statement line.

## 5. Stale description text (Decision 5)

- [ ] 5.1 The description step's `first` names the changed inputs and the tier they allow; verify for a prose change (`--change bytes`) and for a job-line change (`--change commitment --affects <id>`).

## 6. Docs

- [ ] 6.1 `workflow-web.md` description and build sections: inputs, keys, tiers, the carry-forward and the stale text, plus a CHANGELOG `[Unreleased]` entry; verify with the guide-sections test and by grepping the guide for `--change bytes` and `--affects`.

## 7. Integration

- [ ] 7.1 `npm test` and `npm run specs:check` pass locally (the known ffmpeg environment failure excepted); verify both exit codes.
- [ ] 7.2 Mark design-owner-attention task 2.2 done and note the page tier's move to phase 3 there; verify with `npm exec -- openspec validate design-owner-attention --strict`.

## Workflow follow-up

- Open the PR, address review findings, merge when CI is green.
- Archive after `adopt-ai-fluency-decision-roles` and `owner-attention-asks` archive.
