# Tasks

## 1. Planning

- [x] 1.1 Proposal, `web-workflow` delta, design and tasks; verify with `npm exec -- openspec validate owner-attention-page-compare --strict`.
- [x] 1.2 Independent review by an agent that did not write them, with every finding answered; re-validate.

## 2. Fingerprints (Decision 1)

- [x] 2.1 `measureSections`, `regionPixels` and the clean screenshot in `captureRefs`; verify with browser tests that an unchanged page gives identical fingerprints, and that content pushed down keeps its fingerprints.

## 3. Comparison (Decision 3)

- [x] 3.1 `workflows/page-compare.cjs`; verify in `tests/page-compare.test.cjs`: insertion before an unchanged element, a text edit, a removal, a pixel-only change, a section change with no element change, a capture without fingerprints, and the `m:` prefix kept; register the test and the file.

## 4. Records and the page tier (Decisions 2, 4, 5)

- [x] 4.1 `captures` as `{png, refs}` with the json copy; `compareStep` reads `.png`; verify the 3b tests.
- [x] 4.2 The page tier in `sectionProgress` and the reopened ask text and `pageChanges`; verify in `workflow-next`: changed, unchanged, unknown, a self-checked section, a re-accept that stands.
- [x] 4.3 The final review's changed list; verify in `workflow-next`.

## 5. Docs and integration

- [x] 5.1 `workflow-web.md`, CHANGELOG, `design-owner-attention` (3c split into 3c and 3d); `npm test` and `npm run specs:check`.

## 6. Review follow-up (PR #142)

- [x] 6.1 CodeRabbit: an element outside the picture on both captures (null fingerprint) is unchanged, one that moved in or out is changed (rather than making the whole capture not comparable, which would reopen the section on every change); verify in `page-compare`.
- [x] 6.2 CodeRabbit: a 3b record's plain-hash screenshot is still shown as the earlier picture; verify in `workflow-next`.

- [x] 6.3 Codex: a section stays accepted without comparison only while both the page digest and every file the kept captures loaded are unchanged, since a font or image named only in CSS is outside the digest; verify in `workflow-next`.

## Workflow follow-up

- Open the PR, address review findings, merge when CI is green.
