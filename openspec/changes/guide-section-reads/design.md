# Design: guide section reads

## File ownership

| File | Change |
| --- | --- |
| `skill/scripts/guide-core.cjs` | New. Owns `parseHeadings` (which carries the anchor rule), `listReferences`, `listHeadings`, `readSection`, `splitHelp`, `describeCommand` and the text renderers. No CLI parsing. |
| `skill/scripts/cli-core.cjs` | Two `COMMANDS` entries (`skill`, `describe`), two help lines, `--section` in `KNOWN_OPTIONS`, `--list` in `BOOLEAN_OPTIONS`, `COMMANDS` exported for the QA check. `publicHelp()` is called by `describe` and is otherwise unchanged. |
| `tests/impeccable-product-design.test.cjs` | Takes anchors from `parseHeadings`; its local `headingAnchors` copy is deleted. |
| `tests/guide-section-reads.test.cjs` | New; added to `scripts/test-manifest.json`. |
| `skill/references/package-resources.json` | `required` gains `scripts/guide-core.cjs`. |
| `skill/SKILL.md` | One sentence. |

No guide file moves or is renamed, so every existing `file.md#anchor` link keeps resolving.

## Heading model

- Only ATX headings (`#` to `######`) outside fenced blocks (``` or ~~~; a fence closes on the
  same character and at least the same length) are sections. The fence rule is needed: `workflow-film.md` has `# 12 consecutive frames …` comment lines inside a bash
  block.
- Heading text is the title with link targets, backticks and asterisks removed. The anchor is its
  lower-case text with punctuation dropped (letters, digits, `_`, `-` and spaces kept) and spaces
  turned to hyphens; a repeated anchor in one file gets `-1`, `-2`.
- A section runs from its heading line to the line before the next heading of the same or a higher
  level, or to the end of the file, without trailing blank lines. Subsections are inside it.
- The result carries the heading path (ancestors, then the heading), 1-based inclusive line range,
  the line count of the file, the file SHA-256 and `partial: true`.

## Matching `--section`

A leading `#` to `######` and the space after it are ignored, so `#stage-4-tasks` and
`## Stage 4: Tasks` work.

1. Exact anchor match.
2. Else case-insensitive match of the heading text.
3. One match is returned. Several matches at step 2 fail with `SECTION_AMBIGUOUS` and list the
   anchors that tell them apart. None fails with `SECTION_NOT_FOUND` and lists up to five headings
   whose text shares the most words with the request.

## Reference names

A name is a path under `references/` without `.md` (`stages`, `motion-recipes/families/web`); a
trailing `.md` is accepted. It is rejected as `REFERENCE_INVALID` when it is empty, absolute,
has an empty, `.` or `..` segment, a backslash, a drive prefix or a NUL, or resolves (after
`realpath`, checked with `pathInside`) outside `references/` or to something that is not a file. A
missing file is `REFERENCE_NOT_FOUND`. All failures are exit 1.

`skill` needs `--list`, or `--reference` with `--list` or `--section`; anything else is
`OPTION_REQUIRED`, and `--list` with `--section` is `OPTION_CONFLICT`.

## Output

- `skill --reference r --section s`: stdout is the section Markdown (`text`); with `--json` the
  result object `{ reference, file, headingPath, anchor, level, startLine, endLine, totalLines,
  sha256, partial, markdown }`.
- `skill --list`: text lines `name<TAB>title<TAB>headings`; `--json` gives the array.
- `skill --reference r --list`: text lines `level<TAB>anchor<TAB>heading`; `--json` the array.
- `describe`: text is the matching help lines verbatim plus the exit-code line; `--json` gives
  `{ command, action, entries: [entry text…], exitCodes }`; an entry is its help lines joined by
  newlines.

## Help splitting

`publicHelp()` is a list of lines. An entry starts at a line indented two spaces under `Commands:`;
lines indented four or more spaces continue the entry before them. One entry line may hold several
commands joined by ` | ` (`doctor … | status …`, `foundation check … | direction check …`). A
command word matches an entry when any ` | ` segment starts with it. An action word matches when
the segment's second word equals it or is one alternative of an `a|b|c` group. A command with no
matching entry fails as `UNKNOWN_COMMAND`. A test checks that every key of `COMMANDS` has an entry
today (57 of 57), so `describe` cannot silently miss a new command.

## Compatibility and migration

Additive. The diff of `publicHelp()` is the two new lines only. The anchor rule was checked against
the copy it replaces on all 183 packaged guides (1,453 headings, 0 files differ) before the copy
was deleted. No artifact shape, schema or path changes, so there is nothing to migrate.

## Risks

- A partial read can miss a prerequisite stated earlier in the file. Mitigated by the heading path,
  `partial: true` and the unchanged "open the file" meaning of routing rows.
- Heading renames change anchors. Existing link checks already cover guides that are linked; an
  unlinked anchor used only by an agent's habit fails with a message that lists near matches.
