## ADDED Requirements

### Requirement: Intake completion preserves user briefs

Workflow intake SHALL finish only from its recorded state decision. Intake writing SHALL refuse case-insensitive collisions with brief files it did not write, return a contract error explaining recovery, and preserve the user's file and workflow state. This applies to web and the shared film/edit/UI intake without adding an ownership schema.

#### Scenario: Only an assignment brief exists

- **WHEN** a project contains user-owned `BRIEF.md` but no intake decision
- **THEN** `next` SHALL ask intake and SHALL NOT list intake as completed

#### Scenario: Intake would overwrite a user brief

- **WHEN** intake is recorded with an unowned case-insensitive `brief.md` collision
- **THEN** it SHALL refuse with a contract error explaining how to move or rename the file, preserving both bytes and state

#### Scenario: Intake wrote the existing brief

- **WHEN** a project has the recorded intake decision and its generated brief
- **THEN** intake SHALL remain complete and an explicit subsequent intake answer MAY update its own brief

### Requirement: Workflow commands bind the selected project

Every runnable command and record template returned by a workflow or project helper SHALL bind the selected absolute project root using shell-path quoting and the installed CLI. Commands SHALL remain correct outside that project, including paths with spaces. Edit handoffs SHALL use `film-edit`; invalid/stale plan recovery SHALL preserve the plan file and existing arguments.

#### Scenario: A returned record runs outside the project

- **WHEN** the returned decision command is executed from an unrelated temporary directory
- **THEN** it SHALL record the selected project's decision without initializing or changing the unrelated directory

#### Scenario: A returned verifier uses contained inputs

- **WHEN** a workflow returns a verification command naming project-local inputs
- **THEN** executing it outside the project SHALL resolve those inputs within the selected absolute project root

#### Scenario: An invalid or stale plan has a spaced filename

- **WHEN** a plan in `plans/job plan with spaces.json` is invalid or its bound bytes become stale
- **THEN** the error SHALL provide a complete `next` retry with absolute `--root` and `--project-root` and a quoted plan path; after repair it SHALL rebind that file from an unrelated directory

#### Scenario: Edit results hand off to the next command

- **WHEN** analyze returns an auto template, auto returns render, or render returns check
- **THEN** each SHALL use the installed `film-edit` command group and absolute root bindings; executing the filled analyze/auto handoffs outside the project SHALL write only to the selected project

#### Scenario: Other project helpers return recovery commands

- **WHEN** score, Blender, foundation, catalog or reference analysis returns an executable command
- **THEN** it SHALL use the installed script and the selected absolute root wherever supported, quote file paths and preserve command arguments instead of relying on PATH or the shell's current directory

### Requirement: Windows command paths fail closed at generation

On win32, shell-path command generation SHALL reject `$`, backtick, double quote, `%`, `!` and control characters with existing `CONTRACT_INVALID`, naming the path and requiring a safe project/installation move or rename. Importing an unsafe installation SHALL NOT throw; validation SHALL occur lazily during command generation. Platform injection SHALL allow Windows tests on any OS. POSIX escaping SHALL remain unchanged.

#### Scenario: A Windows path could expand inside double quotes

- **WHEN** a generated path contains `$(x)`, a backtick, `%PATH%`, `!x!`, a double quote or a control character
- **THEN** generation SHALL refuse it with `CONTRACT_INVALID` and path-specific move/rename remediation before returning a shell command

#### Scenario: The Windows path only contains spaces

- **WHEN** a normal Windows project or installation path contains spaces
- **THEN** it SHALL remain quoted and its returned command SHALL run from an unrelated directory

#### Scenario: The installation path itself is unsafe

- **WHEN** the shared command module is imported from an unsafe installation path
- **THEN** import SHALL succeed but Windows command generation SHALL fail closed; POSIX generation SHALL retain its existing escaping

#### Scenario: Windows frame review does not require a shell percent pattern

- **WHEN** film scaffolding or the checked-draft review returns its per-second frame-review command on Windows
- **THEN** it SHALL use the existing bound reference-video analyzer with contained relative inputs instead of an unsafe ffmpeg percent-pattern path; a later review SHALL preserve existing evidence in a distinct available directory

### Requirement: Web concept screening precedes the user choice

Web concept guidance and action text SHALL require three different first-screen structures and a one-line skeleton per card. The agent SHALL render equal-size first screens into one contact sheet, pre-screen for same skeletons, common templates and collapsed hierarchy, and redo failed cards before asking. Screening SHALL NOT grant Visual Acceptance or add a gate/schema.

#### Scenario: Cards differ only in copy and colour

- **WHEN** concepts share layout skeleton, focal placement, type position and image role
- **THEN** the agent SHALL redo the failed cards rather than present them as divergent options

#### Scenario: The concept document exists

- **WHEN** `next` returns the concept-choice ask
- **THEN** its guidance SHALL still require the agent's contact-sheet pre-screen before showing the options, without claiming acceptance

### Requirement: Reference layout learning preserves coupled relations

Reference layout guidance SHALL measure the native aspect ratio and separate adaptation. It SHALL record subject position/scale, lockup scene region and minimum lockup–subject distance/no-overlap together; preserve reading order and legibility; and require same-size thumbnail pre-screening. Metrics SHALL support, never replace, visual judgement or acceptance.

#### Scenario: A reference is adapted to another ratio

- **WHEN** a 16:10 reference is studied for a 16:9 deliverable
- **THEN** relations SHALL first be studied at 16:10 and the 16:9 composition SHALL be a separately reviewed adaptation

#### Scenario: Text metrics match but the composition breaks

- **WHEN** size matching splits reading order, hollows the scene or pushes the subject away
- **THEN** the agent SHALL redo the composition after thumbnail review rather than treat zero metric error as a pass
