# Web workflow delta

## MODIFIED Requirements

### Requirement: Web intake asks about a page

`next` for a standard or full web project SHALL open intake with one ask whose `first` offers to skip the questions and start, and whose `question` is one open, concrete question about the page, about the reference in replicate mode. The ask SHALL carry no question list, options or recommended answer. No web intake text SHALL ask for a duration or use the words film, promo, video, footage or beat.

#### Scenario: A web intake opens with one open question

- **WHEN** `next` runs for a standard web project with no intake recorded
- **THEN** the action SHALL be an `ask` whose `first` offers to skip the questions and start and whose `question` is one open question
- **AND** it SHALL have no `questions`, `options` or `recommended` field
- **AND** its `record`, `correction` and `skip` commands SHALL record `--stage intake` with `--verdict accept`, `--verdict reject` and `--choice skip`
- **AND** the serialized action SHALL NOT match `how long`, `duration`, `film`, `promo`, `video`, `footage` or `beat` (case-insensitive).

#### Scenario: A replicate intake asks about the reference

- **WHEN** `next` runs for a standard web project in replicate mode with no intake recorded
- **THEN** the opening question SHALL ask what must stay as it is and what the owner would change.

### Requirement: Web concepts ask for a section arc and a treatment

The web `concepts` run action SHALL ask for `concepts.md` with three cards A, B and C whose first-screen structures differ, each with its central idea, a one-line skeleton and its section arc, and for `concepts.html` showing those first screens one at a time by `?variant=` with the packaged variant switcher. It SHALL say that the chosen card is extended with a `## Treatment`.

#### Scenario: A web concepts step asks for the variants page and a treatment

- **WHEN** `next` runs for a standard web project with a confirmed playback, a reference decision and no `concepts.html`
- **THEN** the `run` action SHALL name the section arc, `concepts.html`, `?variant=`, the variant switcher and `## Treatment`
- **AND** it SHALL NOT mention "between beats" or the picture.

### Requirement: Web prompts keep the shared stage contract

Web stage ids SHALL be: quick `intake, components, build, probe`; quick replicate `intake, reference, components, build, probe`; standard and full `intake, reference, concepts, components, description, build, probe, review, deliver`; standard and full replicate the same without `concepts`. Every web stage SHALL keep a guide anchor. Film, edit and `ui` prompts, stages and records SHALL NOT change.

#### Scenario: Film, edit and ui intake and film concepts are unchanged

- **WHEN** `next` runs at intake for film, edit and ui projects and at concepts for a film project (edit and ui have no concepts stage)
- **THEN** each action's question, questions (including the `duration` question), recommended, record and reason text SHALL deep-equal the corresponding shared `INTAKE` or `CONCEPTS` action.

#### Scenario: Web stage order per tier and mode

- **WHEN** the web stages are listed for the quick, standard and full tiers, in brief, freeform and replicate modes
- **THEN** the ids and their order SHALL equal the lists in this requirement
- **AND** `workflow-web.md` SHALL have a `## <stage id>` heading for each.

### Requirement: The treatment feeds existing foundations

The style-bible seed SHALL be documented as feeding the project `DESIGN.md` sections and the motion language as feeding `MOTION.md` and `motion.md`, without adding sections to either. No `finished` condition SHALL read the content of `concepts.md`, and the treatment SHALL add no artifact.

#### Scenario: Nothing checks the treatment

- **WHEN** a standard web project's description is approved and its `concepts.md` has no `## Treatment`
- **THEN** `next` SHALL return the `build` stage as it does when the treatment is present.

### Requirement: The web build action asks for the treatment first

The first web `build` action at the standard and full tiers outside replicate mode SHALL tell the agent to extend the chosen card with `## Treatment` and write the section briefs before building the first screen. The `build` actions of the quick tier and of `replicate` mode SHALL NOT mention a treatment.

#### Scenario: The build action asks for the treatment

- **WHEN** `next` runs for a standard web project whose description is approved and that has no `index.html`
- **THEN** the `build` action SHALL tell the agent to extend the chosen card with `## Treatment` first and to build only the first screen.

#### Scenario: The quick tier and replicate mode name no treatment

- **WHEN** `next` runs for a quick web project, or a standard web project in `replicate` mode, with no `index.html`
- **THEN** the `build` action SHALL NOT mention a treatment.

### Requirement: No new gate, receipt schema or analyzer

The treatment, the section briefs and the review rules W1 to W7 SHALL NOT add a gate, a finding code, a receipt, an analysis schema, or a field on the interaction probe, component-state-matrix, direction-preview or motion contracts.

#### Scenario: Contracts are unchanged

- **WHEN** the schema identifiers and finding-code sets of the interaction, composition, component-state-matrix and direction-preview contracts, and the workflow-state schema identifier, are compared with the previous release
- **THEN** they SHALL be equal.

## ADDED Requirements

### Requirement: Web intake ends in a confirmed playback or a stated skip

Web intake SHALL finish only when decide records the playback the owner confirmed (`--verdict accept`) or a skip (`--choice skip`) whose answer states what the agent decided for the owner. A correction (`--verdict reject`) SHALL become a project rule and reopen intake. A bare go-ahead such as `default` SHALL be refused, and web intake SHALL NOT write `brief.md`.

#### Scenario: Corrections loop until the owner confirms

- **WHEN** decide records a playback correction for a standard web project
- **THEN** a project rule SHALL hold the correction and `next` SHALL stay at intake, asking what is still wrong
- **AND** after `--verdict accept` with the confirmed playback, `next` SHALL move past intake.

#### Scenario: The playback is confirmed before concepts

- **WHEN** a standard web project has only corrections recorded
- **THEN** `next` SHALL NOT return the concepts stage.

#### Scenario: A skip needs a stated decision

- **WHEN** decide records `--stage intake --choice skip` with no answer or a bare go-ahead
- **THEN** it SHALL fail and leave the state unchanged
- **AND** with a one-line statement of the decisions it SHALL complete intake and keep that line.

#### Scenario: An earlier intake still completes

- **WHEN** a web state holds an intake recorded by the earlier question form
- **THEN** `next` SHALL treat intake as finished.

### Requirement: Quick web work states its decisions

The quick web workflow SHALL start with a `run` action telling the agent to tell the owner in one line what it decided on their behalf and to record that line with `decide --stage intake --choice skip`; the components ask SHALL wait for that record.

#### Scenario: Quick work cannot start silently

- **WHEN** `next` runs for a new quick web project
- **THEN** it SHALL return the intake `run` action with a `--choice skip` command
- **AND** after the stated line is recorded it SHALL return the components ask.

### Requirement: Web variants are switchable first screens

Before the concept ask, `concepts.html` SHALL mark first screens `data-variant` A, B and C and contain the variant switcher; otherwise `next` SHALL return a `run` action with findings. The pick SHALL be `--choice` A, B or C, or several comma-separated with an answer saying what to combine. A rejection SHALL become a project rule and reopen the pick.

#### Scenario: An incomplete variants page is not shown

- **WHEN** `concepts.md` exists but `concepts.html` lacks a variant marker or the switcher
- **THEN** `next` SHALL return a `run` action whose findings name what is missing.

#### Scenario: The owner combines variants

- **WHEN** decide records `--stage concept --choice B,C --answer "B's header with C's layout"`
- **THEN** decisions.concept SHALL be `B,C` and the answer SHALL be kept
- **AND** a combination without an answer, an unknown key or a number SHALL be rejected.

#### Scenario: The owner rejects the variants

- **WHEN** decide records `--stage concept --verdict reject --answer "<reason>"`
- **THEN** the reason SHALL become a project rule and the concepts ask SHALL return
- **AND** while `concepts.html` is unchanged the ask SHALL tell the agent to redo the variants first.

#### Scenario: Variants the owner has not seen cannot be picked or rejected

- **WHEN** decide records a variant pick or rejection before `next` asks about the variants page
- **THEN** it SHALL fail with `WORKFLOW_NOT_READY` and record nothing.

#### Scenario: The switcher never ships

- **WHEN** `index.html` contains `data-variant-switcher`
- **THEN** build SHALL stay unfinished with an error finding telling the agent to remove it.

### Requirement: Web concrete decisions are asked in one round

At standard and full the components ask SHALL be one round of numbered questions, the sections in build order and the component sources, each with a recommended answer, and SHALL tell the agent to look up facts instead of asking for them and to leave dependent questions for a later round.

#### Scenario: The round carries recommendations

- **WHEN** `next` asks components for a standard web project
- **THEN** its `questions` SHALL be `sections` and `components`, each with a recommended answer
- **AND** for a quick project they SHALL be `components` alone.

### Requirement: Web build waits for an approved description

At standard and full, `next` SHALL NOT return a build action until the owner approves `brief.md` as the one-page description with `decide --stage description --verdict accept --choice <section ids>`, each id named in `brief.md`. The approval SHALL bind the brief's bytes, the confirmed playback, the variant pick and the component decision; changing any of them SHALL ask again. A rejection SHALL become a project rule.

#### Scenario: Build is blocked until approval

- **WHEN** a standard web project has its components decision but no current description approval
- **THEN** `next` SHALL return the description stage, never build
- **AND** a section verdict SHALL be refused with `WORKFLOW_NOT_READY`.

#### Scenario: The description names its sections

- **WHEN** an approval lists a section id that `brief.md` does not name
- **THEN** decide SHALL fail and record nothing.

#### Scenario: A changed brief or decision asks again

- **WHEN** `brief.md` changes, or a different variant pick or component decision is recorded, after approval
- **THEN** `next` SHALL return the description ask again before any further section or probe.

### Requirement: Web pages are built and reviewed one section at a time

At standard and full the build SHALL follow the approved section order: the first section first, each marked `data-section` in `index.html`. `next` SHALL ask the owner to review each built section before the next is built, and build SHALL finish only when every approved section is accepted under the current approval. A section verdict SHALL NOT claim Visual Acceptance.

#### Scenario: Sections advance only after review

- **WHEN** the first section is built and the manifest is valid
- **THEN** `next` SHALL ask the owner to review that section, and SHALL return the build of the second section only after decide records `--stage section --choice <first> --verdict accept`.

#### Scenario: Out-of-order acceptance is refused

- **WHEN** decide accepts a section other than the one `next` asks about
- **THEN** it SHALL fail with `WORKFLOW_NOT_READY` and record nothing.

#### Scenario: A rejected section is revised

- **WHEN** the owner rejects a built section with comments
- **THEN** each comment SHALL become a project rule and `next` SHALL ask about that section again, telling the agent to revise it while the page is unchanged.

#### Scenario: Re-approval asks the sections again

- **WHEN** the description is approved again after a change
- **THEN** section verdicts given under the earlier approval SHALL NOT count.

### Requirement: Section comments may cite runtime-review Feedback

A section verdict MAY cite runtime-review Feedback records with `--evidence`. Decide SHALL accept only contained `design-pipeline.runtime-review-record.v1` records holding a recorded Feedback, store each path and hash with the verdict and, on a rejection, record each Feedback's object, actual and expected text as a project rule. `runtime-review check` SHALL remain the authority on bundle lineage.

#### Scenario: Recorded Feedback becomes rules

- **WHEN** a section rejection cites a runtime-review Feedback record
- **THEN** the verdict SHALL store its path and hash and a project rule SHALL carry its object, actual and expected text.

#### Scenario: Anything else is refused

- **WHEN** `--evidence` names a missing file, a file outside the project or JSON that is not a recorded runtime-review Feedback
- **THEN** decide SHALL fail and record nothing.

### Requirement: Every web rejection becomes a project rule

Each playback correction, variant rejection, description rejection, section rejection and draft rejection SHALL append `{text, from, scope: "project"}` to `state.rules`, with `from` naming the checkpoint and its count, and every later `next` action SHALL return the rule texts.

#### Scenario: Rules accumulate across checkpoints

- **WHEN** the owner rejects a playback, the variants, the description and a section
- **THEN** `state.rules` SHALL hold one entry per rejection with `from` `playback 1`, `variants 1`, `description 1` and `section <id> 1`
- **AND** the next action SHALL list their texts in `rules`.
