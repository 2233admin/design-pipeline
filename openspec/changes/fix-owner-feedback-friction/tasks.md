## 1. Change records

- [x] 1.1 Write proposal.md and the `design-pipeline` spec delta (ADDED requirements only).
- [x] 1.2 `npm exec -- openspec validate fix-owner-feedback-friction --strict` is valid and
  `npm run specs:check` passes (29 passed, 0 failed).
- [ ] 1.3 Archive after `make-web-workflow-conversational` and `adopt-ai-fluency-decision-roles`;
  this change edits the minimum-content rule and statement they add.

## 2. Behaviour

- [x] 2.1 `contract-utils.cjs`: `wordCount` takes a `cjkWeight` option (default two CJK characters
  per word); `reason()` needs two words with each CJK character as one. It lives in
  `workflows/shared.cjs` so the shared final-review and film-sample rejections use it too
  (Codex review on #114).
- [x] 2.2 `workflows/web.cjs`: `rejectedUnchanged` keeps build open after a final-review rejection
  at every tier.
- [x] 2.3 `workflows/roles.cjs`: the statement lists each rule's text and origin.

## 3. Tests and docs

- [x] 3.1 `workflow-next`: short CJK and English feedback recorded, bare "no"/"ok" refused, stated
  decisions keep six words; standard rejection returns to build until the page changes; the
  statement quotes the owner's rule.
- [x] 3.2 `workflow-web.md` minimum-content and review sections, `stages.md` statement contents,
  CHANGELOG `[Unreleased]`.

## 4. Verification

- [ ] 4.1 Affected suites pass locally; CI green on the PR.
