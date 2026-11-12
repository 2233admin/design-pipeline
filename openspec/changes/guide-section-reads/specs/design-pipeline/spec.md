## ADDED Requirements

### Requirement: `skill` returns one section of a packaged guide

`designer-pipeline skill --reference <name> --section <heading-or-anchor>` SHALL return that heading
and its subsections from `references/<name>.md`, with the heading path, line range, line count of
the file, file SHA-256 and `partial: true`. Without `--json` it SHALL print only the section
Markdown. A heading inside a fenced code block SHALL NOT be a section.

#### Scenario: A section is read by anchor or by heading text

- **WHEN** `skill --reference stages --section stage-4-tasks` and `skill --reference stages --section "stage 4: tasks"` run
- **THEN** both SHALL return the lines from `## Stage 4: Tasks` through the last non-blank line before `## Stage 5: Implementation`
- **AND** the result SHALL name `references/stages.md`, `partial: true` and a heading path ending in `Stage 4: Tasks`.

#### Scenario: A subsection stops at the next heading of its level

- **WHEN** the section is a `###` heading
- **THEN** the result SHALL end before the next heading of the same or a shallower level (`###`, `##` or `#`)
- **AND** its own `####` subsections SHALL be included.

#### Scenario: A comment line in a code block is not a heading

- **WHEN** a guide has `# note` inside a fenced block
- **THEN** it SHALL NOT appear in `skill --reference <name> --list` and SHALL NOT end a section.

#### Scenario: JSON output

- **WHEN** the command runs with `--json`
- **THEN** the output SHALL be the result object with `markdown`, `sha256`, `startLine`, `endLine` and `totalLines`
- **AND** `sha256` SHALL equal the SHA-256 of the guide file's bytes.

### Requirement: `skill` lists guides and headings

`skill --list` SHALL list every `.md` file under `references/` with its name, title and heading
count, sorted by name. `skill --reference <name> --list` SHALL list that guide's headings with level
and anchor. Both SHALL be read-only and SHALL give repeated headings distinct numbered anchors.

#### Scenario: All guides are listed

- **WHEN** `skill --list --json` runs
- **THEN** it SHALL list every packaged `references/**/*.md` file once, by `/`-separated name without `.md`.

#### Scenario: Repeated headings get numbered anchors

- **WHEN** a guide has two headings that give the same anchor
- **THEN** the list SHALL show the first as `anchor` and the second as `anchor-1`
- **AND** `--section anchor-1` SHALL return the second.

### Requirement: `skill` rejects unusable requests

`skill` SHALL fail with exit code 1 and a stable code when the request cannot be served:
`REFERENCE_INVALID`, `REFERENCE_NOT_FOUND`, `SECTION_NOT_FOUND`, `SECTION_AMBIGUOUS`,
`OPTION_REQUIRED` (no `--list` or `--section`), `OPTION_CONFLICT` (both). It SHALL NOT read outside
`references/` and SHALL NOT write any file.

#### Scenario: The request names no target

- **WHEN** `skill` runs with no option, `--reference stages` alone, or `--section x` without `--reference`
- **THEN** it SHALL fail with `OPTION_REQUIRED` and print nothing from a guide
- **AND** `--list` with `--section` SHALL fail with `OPTION_CONFLICT`.

#### Scenario: A name escapes the references directory

- **WHEN** `--reference ../scripts/cli-core`, an absolute path, a backslash path, an empty name, or a symlink resolving outside `references/` is given
- **THEN** the command SHALL fail with `REFERENCE_INVALID` and read nothing.

#### Scenario: The guide or section is missing

- **WHEN** the guide file does not exist, or no heading matches the section
- **THEN** the codes SHALL be `REFERENCE_NOT_FOUND` and `SECTION_NOT_FOUND`
- **AND** the section error SHALL list up to five headings that share words with the request.

#### Scenario: Two headings share one title

- **WHEN** `--section` matches the text of more than one heading and no anchor
- **THEN** the command SHALL fail with `SECTION_AMBIGUOUS` and list the anchors that tell them apart.

### Requirement: `describe` returns one command's usage

`designer-pipeline describe <command> [action]` SHALL return the `--help` entries for that command,
taken from the lines `publicHelp()` builds, plus the exit-code line. It SHALL add no usage text of
its own: every line it returns SHALL be a line of `--help`, and `--help` SHALL list `skill` and
`describe`.

#### Scenario: A command with actions

- **WHEN** `describe fonts` runs, then `describe fonts query`
- **THEN** the first SHALL return the `fonts query`, `fonts measure` and `fonts refresh` entries
- **AND** the second SHALL return only `fonts query`.

#### Scenario: A command that shares a help line

- **WHEN** `describe status` runs
- **THEN** it SHALL return the line that also holds `doctor`, because that line has a `status` segment.

#### Scenario: Every command can be described

- **WHEN** repository QA reads the keys of the command table
- **THEN** each key SHALL match at least one help entry
- **AND** a key with no entry SHALL fail QA and name the key.

#### Scenario: Unknown or missing command

- **WHEN** `describe nonesuch` or `describe fonts nonesuch` runs
- **THEN** it SHALL fail with `UNKNOWN_COMMAND` and exit code 1
- **AND** `describe` with no command SHALL fail with `OPTION_REQUIRED`.

#### Scenario: Every line comes from the help

- **WHEN** `describe` runs for each key of the command table
- **THEN** each returned entry line SHALL appear verbatim in the `--help` output.
