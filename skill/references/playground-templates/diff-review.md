# Diff Review Playground Blueprint

Use for bounded review of a real commit, pull request, or supplied patch. This surface records
feedback; it does not apply code changes or publish review comments.

## Required Surface

- Commit/change metadata and files rendered as hunks with old/new line numbers.
- Clear context/addition/deletion/hunk styling that does not rely on color alone.
- Click-or-keyboard line commenting with edit, save, cancel, and delete.
- Comment indicators, file navigation, filters for commented files/lines, and copy output.

## State And Output

Each comment binds file path, side, line number, hunk identity, and displayed code text so line
drift is visible. The output prompt contains only saved feedback, grouped by file, with exact line
context and user wording. Never interpret an empty comment as approval.

## QA

Verify binary/renamed/deleted files degrade honestly, long lines scroll without losing line
identity, keyboard selection works, and stale diff hashes invalidate comments rather than silently
reattaching them.
