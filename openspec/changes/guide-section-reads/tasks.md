# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate guide-section-reads --strict` and `npm run specs:check`.

## 2. Module

- [x] 2.1 `skill/scripts/guide-core.cjs`: `headingAnchors`, `parseHeadings` (fence-aware),
  `listReferences`, `readSection` (match order, rejection codes, containment through
  `resolveInside` plus `realpath`), `splitHelp`, `describeCommand`.
- [x] 2.2 `tests/impeccable-product-design.test.cjs` imports `headingAnchors` from the module; its
  local copy is deleted and its assertions still pass.

## 3. CLI wiring

- [x] 3.1 `cli-core.cjs`: `skill` and `describe` in `COMMANDS`; `--section` in `KNOWN_OPTIONS`,
  `--list` in `BOOLEAN_OPTIONS`; `skill` and `describe` accept no extra positional action; two
  lines in `publicHelp()`.
- [x] 3.2 Text output through the existing `outcome.text` path; `--json` gives the result object.
- [x] 3.3 `SKILL.md` sentence; `package-resources.json` `required` gains the module; CHANGELOG.

## 4. Checks

- [x] 4.1 `tests/guide-section-reads.test.cjs`, added to `scripts/test-manifest.json`:
  `stages` / `stage-4-tasks` equals the line range found by an independent line scan; heading text
  and anchor give the same result; a `###` section stops at the next `###` or higher; a `#` line in
  a fenced block is not listed; repeated headings get `-1`; `sha256` equals the file hash.
- [x] 4.2 Rejection cases: `../scripts/cli-core`, absolute path, backslash, empty name, a symlink
  out of `references/` (skipped where symlinks cannot be created, with the reason printed),
  missing guide, missing section, ambiguous title; none writes a file.
- [x] 4.3 `describe`: `fonts`, `fonts query`, `status` (shared line), unknown command, no command;
  every key of `COMMANDS` has an entry and every returned line is a line of `--help`.
- [x] 4.4 `node skill/scripts/designer-pipeline.cjs skill --reference stages --section stage-4-tasks`
  prints lines 620–836 (217 lines, 14,575 bytes of the 93,614-byte file); record this in the PR.
- [x] 4.5 `npm test` (repository QA).
