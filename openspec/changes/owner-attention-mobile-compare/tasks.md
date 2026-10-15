# Tasks

## 1. Planning

- [x] 1.1 Write the proposal, the `web-workflow` delta, the design and these tasks; verify with `npm exec -- openspec validate owner-attention-mobile-compare --strict`.
- [x] 1.2 Independent review by an agent that did not write the artifacts, with every finding answered in them; verify by re-running strict validation after the revision.

## 2. Phone capture (Decisions 1–3)

- [x] 2.1 `page-refs-core.cjs`: `PROFILES`, `settle` by profile height, `captureRefs` with `{profile}` (mobile and touch emulation, prefixed references before the badges); verify with a browser test that the phone capture lists `m:` references with phone boxes, applies a `(pointer: coarse)` rule the desktop capture does not, and that the desktop results are unchanged.
- [x] 2.2 Kernel `--viewport`; `evidence refs` checks and captures each profile on its own; verify that a replaced `refs-mobile.png` recaptures only the phone (desktop files byte-identical), that a second run reports both current, and that a phone failure exits 1 after writing the desktop capture only.
- [x] 2.3 `refsCurrent`/`refsCapture` per viewport; `citedRefs` routes `m:` references; verify in `workflow-next`: an `m:` reference is stored with its selector, and the refusals (missing phone capture, stale phone capture, another section's `m:` reference).

## 3. Reviews (Decisions 4–6)

- [x] 3.1 `refsStep` shows both pngs when both are current, and falls back per capture; verify in `workflow-next`.
- [x] 3.2 Archive at a section verdict by the owner or the art director and at a final-review verdict: copies under `evidence/reviewed/`, `captures` on the record, nothing for a self-check or without a current capture; verify each in `workflow-next`.
- [x] 3.3 `compareStep` in `nextAction`: shown after a revised rejection at a section and at the final review, absent when unchanged, without copies or with a tampered copy; verify each in `workflow-next`.

## 4. Docs

- [x] 4.1 `workflow-web.md` (Element references: the phone capture, `m:` references, before/after), the CLI reference, CHANGELOG `[Unreleased]`; `design-owner-attention`: phase 3 split into 3a, 3b (this change) and 3c; verify with `npm run specs:check`.

## 5. Integration

- [x] 5.1 `npm test` and `npm run specs:check` pass locally (the ff-tracking-hud ffmpeg sound test fails only in this sandbox); verify both outputs.

## 6. Review follow-up (PR #141)

- [x] 6.1 Codex: storing the reviewed copies is all or nothing (staged from the hashed bytes, published together, removed on failure); verify in `workflow-next` that a copy whose name is taken by a directory fails the verdict with no file or state change.
- [x] 6.2 Codex: a viewport's png and json are staged together and the png is put back when the json cannot be published; verify with a browser test whose phone json path is a directory.

## Workflow follow-up

- Open the PR, address review findings, merge when CI is green.
- Archive after `owner-attention-page-refs` archives.
