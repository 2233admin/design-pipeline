# Tool guidance delta

## ADDED Requirements

### Requirement: Commands named by film-edit exist

Every command that a `film-edit` result or error tells the author to run SHALL be written as
`film-edit <verb>` and SHALL resolve to a command the CLI knows. The scope label of a `film-edit`
error SHALL be `film-edit`, the command's name.

#### Scenario: An error names a command that resolves

- **WHEN** `film-edit auto` runs in a project with no `edit/analysis.json`
- **THEN** the error text SHALL name `film-edit analyze` as the fix
- **AND** running the two words it names through the CLI SHALL NOT return `UNKNOWN_COMMAND` or `UNKNOWN_ARGUMENT`
- **AND** the error text SHALL NOT contain the words `film edit`.

#### Scenario: A next step names a command that resolves

- **WHEN** `film-edit analyze`, `auto` or `render` succeeds, or `film-edit check` finds no render
- **THEN** each command it names in `next` or in the skipped step SHALL be written `film-edit <verb>`
- **AND** running those two words through the CLI SHALL NOT return `UNKNOWN_COMMAND` or `UNKNOWN_ARGUMENT`.

#### Scenario: The label matches the command

- **WHEN** a `film-edit` command fails
- **THEN** the message SHALL start with `film-edit:`.

### Requirement: The ui intake asks about what is built

`next` for the `ui` deliverable at the `intake` stage (standard and full tiers) SHALL ask four
questions with ids `product`, `audience`, `scope` and `assets`, defined in
`skill/scripts/workflow-core.cjs`. The questions SHALL be about a screen, a set of components or a
design system: what it is and what a person does with it, who uses it and on which devices, which
screens, components or states are in scope and what a person does first, and which existing code,
design system, brand rules, copy or images can be used and under what licence. No `ui` intake
question, recommendation, reason or record text SHALL ask for a duration or use the words film,
promo, video, footage, beat or music. The stage id, the finish rule (a `brief.md` exists), the
`record` command, the `question` line and the `why` line SHALL equal the shared intake's. The
`film`, `edit` and `web` intake SHALL NOT change because of this requirement, and the `ui` stage
ids and their order per tier SHALL NOT change.

#### Scenario: A ui intake has no duration or film wording

- **WHEN** `next` runs for a standard `ui` project with no `brief.md`
- **THEN** the action's question ids SHALL equal `product`, `audience`, `scope`, `assets`
- **AND** the serialized action SHALL NOT match `how long`, `duration`, `film`, `promo`, `video`, `footage`, `beat`, `music` or `launch event` (case-insensitive)
- **AND** its `record`, `question` and `why` SHALL equal the shared intake's.

#### Scenario: The ui stages do not move

- **WHEN** a `ui` project is created at the quick, standard and full tiers and `decide --stage intake` runs at standard
- **THEN** the stage ids SHALL be `work` at quick, and `intake` then `work` at standard and full
- **AND** after the intake answer the standard project SHALL be at `work` with `completed` equal to `["intake"]`.

#### Scenario: Film and edit intake keep the duration question

- **WHEN** `next` runs at intake for a `film` project and for an `edit` project
- **THEN** each action SHALL still include a question with id `duration`.

### Requirement: The help for film check names every gate it runs

The `film check` line of `designer-pipeline --help` SHALL name every gate the command reports:
storyboard, the score grid (only when `score-grid.json` exists), timeline, render, audio (only
when the film has sound), the composition of each beat's frame, and the carry check. It SHALL say
which of these run only under a condition.

#### Scenario: Help covers what a run reports

- **WHEN** `film check` runs on a project that has a storyboard and a render with sound
- **THEN** every gate id in the result's `steps` SHALL appear by name in the `film check` help line, with the carry check named as `carry` or `continuity`.

### Requirement: The film guide states what film check covers

The `## check` section of `references/workflow-film.md` SHALL list the gates `film check` runs
(as in the help requirement), SHALL say that its composition check reads pixels only and does not
read text boxes, and SHALL present `composition capture` then `verify composition` as an optional
extra that adds the text checks (text contrast, text leaving the frame, near-miss alignment, flat
hierarchy, type-scale sprawl). `references/composition-gate.md` SHALL say the same about the
`film check` composition step. No behaviour of `film check` or `verify composition` SHALL change.

#### Scenario: The guide separates what runs from what is optional

- **WHEN** an author reads `## check` in `references/workflow-film.md`
- **THEN** it SHALL name the gates that `film check` runs, including audio and composition
- **AND** it SHALL NOT tell the author to run `composition capture` or `verify composition` as a required step of `check`
- **AND** it SHALL say what the optional step adds.

### Requirement: The written command surface matches the CLI

The "Command Surface" list in `docs/cli-and-reference-providers.md` SHALL name every top-level
command that `designer-pipeline --help` lists, including `next`, `decide`, `film`, `film-edit`,
`film-eval`, `audio`, `composition`, `source` and every `verify` form. The comment at the top of
`skill/scripts/workflows/shared.cjs` SHALL name every deliverable that imports it.

#### Scenario: No listed command is missing from the surface list

- **WHEN** the top-level command names in `designer-pipeline --help` are compared with those in the Command Surface list
- **THEN** every help command SHALL appear in the list.

### Requirement: Pointers and tier text say what is true

`references/pipeline-reference.md` SHALL NOT tell the reader that `references/pipeline-method.md`
holds the state, artifact and invalidation contract for `plan`, `run`, `resume`, `status`,
`explain-block` and `package`; it SHALL point to the file that lists the phases, their gates,
inputs, outputs and what each invalidates (`references/pipeline-phases.json`). The tier table and
the decision line of `skill/SKILL.md` SHALL say that concepts and the draft review are steps of
`film`, `edit` and `web`, and that `ui` at standard asks for the brief and then goes to the work.
`skill/SKILL.md` SHALL stay under 5120 bytes and under 500 lines.

#### Scenario: The named file holds what the pointer promises

- **WHEN** the file `references/pipeline-reference.md` names for the `plan` and `run` contract is opened
- **THEN** it SHALL list the phases with their gates, inputs, outputs and invalidations.

#### Scenario: The front door does not overstate ui

- **WHEN** `skill/SKILL.md` describes what standard tier asks of the user
- **THEN** it SHALL limit the concepts and draft review decisions to `film`, `edit` and `web`
- **AND** it SHALL stay under 5120 bytes.
