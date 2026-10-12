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

Every runnable command and record template returned by a workflow SHALL use the selected project's absolute root with the existing shell-path quoting convention. Film, edit, web and UI actions SHALL remain correct when copied into a shell outside that project, including project paths containing spaces.

#### Scenario: A returned record runs outside the project

- **WHEN** the returned decision command is executed from an unrelated temporary directory
- **THEN** it SHALL record the selected project's decision without initializing or changing the unrelated directory

#### Scenario: A returned verifier uses contained inputs

- **WHEN** a workflow returns a verification command naming project-local inputs
- **THEN** executing it outside the project SHALL resolve those inputs within the selected absolute project root

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
