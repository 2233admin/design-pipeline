# Tasks

## 1. Planning

- [x] 1.1 Proposal, `web-workflow` delta, design and tasks; `npm exec -- openspec validate owner-attention-page-review --strict`.
- [x] 1.2 Independent review; answer every finding; re-validate.

## 2. Review copy and overlay (Decisions 1, 2)

- [x] 2.1 `skill/tools/page-review/overlay.js` and `workflows/page-review.cjs` (build); `evidence review-page`; verify with a browser test that clicking inside a numbered element in comment mode and submitting produces the block, that `index.html` is unchanged, and the refusals.

## 3. Recording (Decisions 3, 4)

- [x] 3.1 `decide --page-review`: validation, mapping, the kept block, `via` on the role entry and in the statement; verify in `workflow-next` (reject with and without references, final accept, stale page, other ask, invalid block, conflicting flags).
- [x] 3.2 `refsStep` offers the review page; verify in `workflow-next`.

## 4. Docs and integration

- [x] 4.1 `workflow-web.md`, CLI reference and help, CHANGELOG, `design-owner-attention` (3d); register the test and the new skill files; `npm test`, `npm run specs:check`.

## Workflow follow-up

- Open the PR, address review findings that normal use can hit, merge when CI is green.
