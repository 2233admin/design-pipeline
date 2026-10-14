# Tasks

## 1. Planning

- [x] 1.1 Write the proposal, the `web-workflow` delta, the design and these tasks from `openspec instructions <artifact>`; verified with `npm exec -- openspec validate owner-attention-change-tiers --strict`.
- [x] 1.2 Independent review by an agent that did not write the artifacts, with every finding answered in them; verify by re-running strict validation after the revision.

## 2. Approval inputs and section keys (Decisions 1, 2)

- [x] 2.1 `briefSections` returns `{id, job}` (the rest of the item line, leading separator stripped, whitespace collapsed; empty allowed), and `recordDescription` stores `inputs` in place of `upstream`; verify with `workflow-next` tests that the approval record holds `inputs` and no `upstream`, and that `hero: x`, `hero - x` and `hero — x` give the same job.
- [x] 2.2 `recordSection` stores the section key, and `sectionProgress` takes each section's latest verdict and counts it only as an accept under the current key; verify that a prose typo plus a `bytes` re-approval keeps every accepted section, that a changed job line reopens only that section, that a re-picked variant reopens all of them, that a rejected-then-reverted line stays rejected, that a removed-and-re-added section is reviewed again, that a reorder keeps verdicts and builds in the new order, and that a re-approval mid-build keeps the accepted prefix.
- [x] 2.3 Update the existing tests that assert the old cascade (a changed description re-asks every section), and add one for a legacy project (an accept without `inputs`, verdicts without `key`: one first-style re-approval, every section reviewed once); verify with `node --test tests/workflow-next.test.cjs tests/workflow-components.test.cjs`.

## 3. Change tier on re-approval (Decision 3)

- [x] 3.1 `cli-core.cjs`: register `--revision` and `--affects`, pass them to `decide`, and add help lines; verify that the flags parse and an unlisted flag still fails with `UNKNOWN_OPTION`.
- [x] 3.2 `recordDescription` checks `--revision` and `--affects` against `diffInputs`; verify each refusal with no state change: a missing tier on a changed approval, a tier on a first or identical approval, `bytes` on a structural diff including a playback reword (the message names it), `--affects` with an unknown id or without `commitment`, and either flag on another stage.
- [x] 3.3 `commitment --affects` reopens exactly the named sections (`all` every one, `none` only those whose key changed); verify with tests that reopen hero and keep proof, and that `none` after a reorder keeps both.

## 4. Kept description carry-forward (Decision 4)

- [x] 4.1 `recordRole` takes an `allowAgent` option used only for a `bytes` accept of the description whose latest entry is an accept; `stampRecord` keeps `revision`; verify in `workflow-next` that a bytes carry-forward passes, and that `commitment --by agent` and a carry-forward after an owner reject are each refused with no change.
- [x] 4.2 The statement lists a carry-forward on its own line ("carried forward a byte-only change to the owner's description"), without the "delegated by the owner" suffix; verify the line in a `workflow-next` statement test.

## 5. Stale description text (Decision 5)

- [x] 5.1 The description step's `first` names the changed inputs and the tier they allow, and says when the earlier approval predates change tiers; verify for a prose change (`--revision bytes`), a job-line change (`--revision commitment --affects <id>`) and a legacy accept.

## 6. Docs

- [x] 6.1 `workflow-web.md`: replace the description section's paragraph that says a changed brief re-asks every section, and the build section's "a different approval makes every section ask again", with inputs, keys, tiers, the carry-forward and the stale text; add a CHANGELOG `[Unreleased]` entry; verify with the `workflow-next` test "film, edit and web actions name a guide section that exists for every stage" and by grepping the guide for `--revision bytes` and `--affects`.

## 7. Integration

- [x] 7.1 `npm test` and `npm run specs:check` pass locally, except the ff-tracking-hud ffmpeg sound test, which fails in this sandbox and passes in CI; verify both outputs.
- [x] 7.2 Mark design-owner-attention task 2.2 done and note the page tier's move to phase 3 there; verify with `npm exec -- openspec validate design-owner-attention --strict`.

## 8. Review follow-up

- [x] 8.1 Codex P1: the description step's `record` and `accept` carry the tier of a stale approval, so the command `next` returns runs as given; verify with a `workflow-next` test that runs the returned command in a shell.
- [x] 8.2 Codex P2: a byte-only change to a kept description, whose latest record is an accept, comes back from `next` as the agent's carry-forward run; verify that the run's command records the approval and that a changed section line on the kept description stays an owner ask.
- [x] 8.3 CodeRabbit: `--revision` and `--affects` are refused on a description rejection, with nothing recorded; verify in the misplaced-tier refusal test.
- [x] 8.4 Codex P1 (second pass): the returned tier is measured against the last accept with inputs, as `revisionOf` measures it, so a reject, revise, approve flow returns a runnable command; verify with a `workflow-next` test that runs it.
- [x] 8.5 Codex P2: `all` and `none` are refused as section ids, since `--affects` reads them; verify with a `workflow-next` refusal test.
- [x] 8.6 Codex P2 (third pass): after a reject and a revision, the description step's text still names what changed since the last accept and the tier it allows; verify in the reject, revise, approve test.

## Workflow follow-up

- Open the PR, address review findings, merge when CI is green.
- Archive after `adopt-ai-fluency-decision-roles` and `owner-attention-asks` archive.
