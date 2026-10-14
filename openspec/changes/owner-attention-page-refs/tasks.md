# Tasks

## 1. Planning

- [x] 1.1 Write the proposal, the `web-workflow` delta, the design and these tasks; verify with `npm exec -- openspec validate owner-attention-page-refs --strict`.
- [x] 1.2 Independent review by an agent that did not write the artifacts, with every finding answered in them; verify by re-running strict validation after the revision.

## 2. Numbered capture (Decisions 1–3)

- [ ] 2.1 `page-refs-core.cjs`: settle (scroll through, fonts), the in-page numbering (candidates, visibility, nesting, references inside and outside sections, escaped selector, cleaned text) and the badge layer; verify with a browser test on a fixture page with a nav link outside sections, two sections, a hidden element, a link inside a paragraph, an image inside a link, a wrapper `div` and a scroll-revealed element: references, selectors (each finds its element) and text match; a sectionless page is numbered `1, 2, 3`. The test skips when no browser is found, as `interaction-capture.test.cjs` does.
- [ ] 2.2 `capture-refs.cjs` kernel and `evidence refs` in `evidenceCommand` (help text, contained writes): verify that `index.html` is byte-identical after a capture, that a second run on the same page reports `current` and leaves both files untouched, and that a missing browser exits 1 and writes nothing.
- [ ] 2.3 Export `pageDigest` from `web.cjs`; register the test file in `scripts/test-manifest.json` and both new scripts in `required` of `skill/references/package-resources.json`; verify with `npm test` (package check).

## 3. Feedback by reference (Decision 4)

- [ ] 3.1 `--ref` in `REPEATABLE_OPTIONS`, passed to decide, help text; validated for web section and review rejections; verify each refusal with no state change: unknown reference, missing `refs.json`, an old page digest, another section's reference, no `--answer`, an accept, another stage, and the CLI path.
- [ ] 3.2 The answer rule's `object` keeps deduplicated `refs: [{ref, selector, text}]`; `activeRules` and `statementLine` show them; verify in `workflow-next` that `--ref hero-2` is stored, appears in the next action's `rules` and in the statement, and that retiring and promoting the rule still work.

## 4. Quoted web final acceptance (Decisions 5, 6)

- [ ] 4.1 A web owner accept at `review` requires `--answer` passing `reason()` and without a placeholder; the web `REVIEW.action` returns the single-placeholder `record` and the instruction; verify the refusals (`no answer`, `"ok"`, placeholder text), that "可以" passes, that film, edit and ui accepts without `--answer` still record, and `tests/workflow-action-commands.test.cjs` (returned commands, the execution test).
- [ ] 4.2 `stampRecord` stores `version` on web review entries; the statement's acceptance line reads the latest owner review entry and shows words and version; `first` says when the owner accepted an earlier version; verify each in `workflow-next`.
- [ ] 4.3 The kept section review and the web final review offer the capture (`first` appended, `show` only with a current capture, text fallback); delegated self-checks do not; verify in `workflow-next`, updating the test that asserts the section instruction text.
- [ ] 4.4 Update the helpers (`tests/helpers/web-flow.cjs`) and every test that records a web review accept without `--answer` (`workflow-next`, `workflow-action-commands`, `workflow-components`, `interaction-audit`, `web-concept-screening`, `product-source-workflow`); verify with each file.

## 5. Docs

- [ ] 5.1 `workflow-web.md` (section review, final review, an "Element references" part for `evidence refs`), the CLI reference for `evidence refs` and `--ref`, a CHANGELOG `[Unreleased]` entry; `design-owner-attention`: split phase 3 into 3a (this change) and 3b, and note that G is narrowed here; verify with the guide-section test in `workflow-next` and `npm run specs:check`.

## 6. Integration

- [ ] 6.1 `npm test` and `npm run specs:check` pass locally (the ff-tracking-hud ffmpeg sound test fails only in this sandbox); verify both outputs.

## Workflow follow-up

- Open the PR, address review findings, merge when CI is green.
- Archive after `adopt-ai-fluency-decision-roles`, `owner-attention-asks` and `owner-attention-change-tiers` archive.
