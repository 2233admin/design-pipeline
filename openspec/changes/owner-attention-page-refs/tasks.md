# Tasks

## 1. Planning

- [x] 1.1 Write the proposal, the `web-workflow` delta, the design and these tasks; verify with `npm exec -- openspec validate owner-attention-page-refs --strict`.
- [ ] 1.2 Independent review by an agent that did not write the artifacts, with every finding answered in them; verify by re-running strict validation after the revision.

## 2. Numbered capture (Decisions 1–3)

- [ ] 2.1 `page-refs-core.cjs`: the in-page numbering (candidates, visibility, nesting, selector, text) and the badge layer; verify with a browser test on a fixture page with two sections, a hidden element, a link inside a paragraph and a wrapper `div` that the numbers, selectors and text match, and that each selector finds its element.
- [ ] 2.2 `capture-refs.cjs` kernel and `evidence refs` in `cli-core.cjs` (registered flags, help text): writes `evidence/refs.json` with the page digest and `evidence/refs.png`; verify that `index.html` is byte-identical after a capture, and that no `data-section` or no browser exits 1 and writes nothing.
- [ ] 2.3 Export `pageDigest` from `web.cjs`; register the new test file in `scripts/test-manifest.json` and the new skill files in `skill/references/package-resources.json`.

## 3. Feedback by number (Decision 4)

- [ ] 3.1 `--ref` (repeatable) in `cli-core.cjs`, passed to decide; validated in `recordSection` and the review branch; verify each refusal with no state change: unknown number, missing `refs.json`, an old page digest, an accept, another stage.
- [ ] 3.2 Rules keep `refs: [{ref, selector, text}]` on their object and `statementLine` prints them; verify in `workflow-next` that a section rejection with `--ref hero-2` stores the rule and the statement shows the number and text.

## 4. Quoted final acceptance (Decisions 5, 6)

- [ ] 4.1 Web owner accept at the final review requires `--answer`; the returned command has the placeholder and the instruction says to record only the owner's words; verify the refusal, the returned command, and that film/edit reviews are unchanged.
- [ ] 4.2 The statement's acceptance line names the reviewed version; `first` says when the owner accepted an earlier version; verify both in `workflow-next`.
- [ ] 4.3 The kept section review and the final review offer the numbered capture (`first`, `show`), with the text fallback; the delegated self-check does not; verify in `workflow-next`, and update the test that asserts the section instruction text.

## 5. Docs

- [ ] 5.1 `workflow-web.md` (section review, final review, an "Element numbers" part for `evidence refs`), the CLI reference for `evidence refs` and `--ref`, a CHANGELOG `[Unreleased]` entry; `design-owner-attention`: split phase 3 into 3a (this change) and 3b; verify with the guide-section test in `workflow-next` and `npm run specs:check`.

## 6. Integration

- [ ] 6.1 `npm test` and `npm run specs:check` pass locally (the ff-tracking-hud ffmpeg sound test fails only in this sandbox); verify both outputs.

## Workflow follow-up

- Open the PR, address review findings, merge when CI is green.
- Archive after `adopt-ai-fluency-decision-roles`, `owner-attention-asks` and `owner-attention-change-tiers` archive.
