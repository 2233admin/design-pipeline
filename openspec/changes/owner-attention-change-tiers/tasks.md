# Tasks

## 1. Planning

- [x] 1.1 Write the proposal, the `web-workflow` delta, the design and these tasks from `openspec instructions <artifact>`; verified with `npm exec -- openspec validate owner-attention-change-tiers --strict`.
- [x] 1.2 Independent review by an agent that did not write the artifacts, with every finding answered in them; verify by re-running strict validation after the revision.

## 2. Approval inputs and section keys (Decisions 1, 2)

- [ ] 2.1 `briefSections` returns `{id, job}` (the rest of the item line, leading separator stripped, whitespace collapsed; empty allowed), and `recordDescription` stores `inputs` in place of `upstream`; verify with `workflow-next` tests that the approval record holds `inputs` and no `upstream`, and that `hero: x`, `hero - x` and `hero — x` give the same job.
- [ ] 2.2 `recordSection` stores the section key, and `sectionProgress` takes each section's latest verdict and counts it only as an accept under the current key; verify that a prose typo plus a `bytes` re-approval keeps every accepted section, that a changed job line reopens only that section, that a re-picked variant reopens all of them, that a rejected-then-reverted line stays rejected, that a removed-and-re-added section is reviewed again, that a reorder keeps verdicts and builds in the new order, and that a re-approval mid-build keeps the accepted prefix.
- [ ] 2.3 Update the existing tests that assert the old cascade (a changed description re-asks every section), and add one for a legacy project (an accept without `inputs`, verdicts without `key`: one first-style re-approval, every section reviewed once); verify with `node --test tests/workflow-next.test.cjs tests/workflow-components.test.cjs`.

## 3. Change tier on re-approval (Decision 3)

- [ ] 3.1 `cli-core.cjs`: register `--revision` and `--affects`, pass them to `decide`, and add help lines; verify that the flags parse and an unlisted flag still fails with `UNKNOWN_OPTION`.
- [ ] 3.2 `recordDescription` checks `--revision` and `--affects` against `diffInputs`; verify each refusal with no state change: a missing tier on a changed approval, a tier on a first or identical approval, `bytes` on a structural diff including a playback reword (the message names it), `--affects` with an unknown id or without `commitment`, and either flag on another stage.
- [ ] 3.3 `commitment --affects` reopens exactly the named sections (`all` every one, `none` only those whose key changed); verify with tests that reopen hero and keep proof, and that `none` after a reorder keeps both.

## 4. Kept description carry-forward (Decision 4)

- [ ] 4.1 `recordRole` takes an `allowAgent` option used only for a `bytes` accept of the description whose latest entry is an accept; `stampRecord` keeps `revision`; verify in `workflow-next` that a bytes carry-forward passes, and that `commitment --by agent` and a carry-forward after an owner reject are each refused with no change.
- [ ] 4.2 The statement lists a carry-forward on its own line ("carried forward a byte-only change to the owner's description"), without the "delegated by the owner" suffix; verify the line in a `workflow-next` statement test.

## 5. Stale description text (Decision 5)

- [ ] 5.1 The description step's `first` names the changed inputs and the tier they allow, and says when the earlier approval predates change tiers; verify for a prose change (`--revision bytes`), a job-line change (`--revision commitment --affects <id>`) and a legacy accept.

## 6. Docs

- [ ] 6.1 `workflow-web.md`: replace the description section's paragraph that says a changed brief re-asks every section, and the build section's "a different approval makes every section ask again", with inputs, keys, tiers, the carry-forward and the stale text; add a CHANGELOG `[Unreleased]` entry; verify with the `workflow-next` test "film, edit and web actions name a guide section that exists for every stage" and by grepping the guide for `--revision bytes` and `--affects`.

## 7. Integration

- [ ] 7.1 `npm test` and `npm run specs:check` pass locally, except the ff-tracking-hud ffmpeg sound test, which fails in this sandbox and passes in CI; verify both outputs.
- [ ] 7.2 Mark design-owner-attention task 2.2 done and note the page tier's move to phase 3 there; verify with `npm exec -- openspec validate design-owner-attention --strict`.

## Workflow follow-up

- Open the PR, address review findings, merge when CI is green.
- Archive after `adopt-ai-fluency-decision-roles` and `owner-attention-asks` archive.
