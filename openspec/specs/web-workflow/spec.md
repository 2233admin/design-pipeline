# web-workflow Specification

## Purpose
The web workflow: how `next` and `decide` take a web page from the owner's first words to a delivered page, through the playback, variants, decisions, description and section-by-section build, with the creative layer (treatment, section briefs, review rules) kept apart from technical gates.

## Requirements

### Requirement: Web intake asks about a page

`next` for a standard or full web project SHALL open intake with one ask whose `question` is the skip line and one open, concrete question about the page (in replicate mode, about what must stay as it is). The opening SHALL contain exactly one `?`, carry no `first`, question list, options or recommended answer, and carry the conversation rules in its `instruction`. No web intake text SHALL ask for a duration or use the words film, promo, video, footage or beat.

#### Scenario: The opening uses its fixed wording

- **WHEN** `next` opens a standard web intake
- **THEN** the skip line SHALL read "If you'd rather skip these questions, say so: I'll tell you what I assumed, then show you options."
- **AND** the question SHALL read "What site have you seen recently that felt the way this page should, and what about it?", or in replicate mode "What must stay exactly as it is in the page you want reproduced?"


#### Scenario: A web intake has no film or duration wording

- **WHEN** `next` runs for a standard web project with no intake recorded
- **THEN** the action SHALL be an `ask` with no `first`, whose `question` is the skip line followed by one open question about the page
- **AND** it SHALL have no `questions`, `options` or `recommended` field
- **AND** its `record`, `correction` and `skip` commands SHALL record `--stage intake` with `--verdict accept`, `--verdict reject` and `--choice skip`
- **AND** the serialized action SHALL NOT match `how long`, `duration`, `film`, `promo`, `video`, `footage` or `beat` (case-insensitive).

#### Scenario: The intake instruction carries the conversation rules

- **WHEN** `next` returns the standard web intake ask
- **THEN** its `instruction` SHALL tell the agent to look up facts instead of asking for them, ask one open question per message, and play the page back as a short card, one line each (three intent lines, the open uncertainties and the delegation line), that marks what the owner said apart from what the agent guessed
- **AND** it SHALL tell the agent to send the opening question as its own message and to add each anti-goal to the record or skip command as its own `--anti-goal "<text>"`
- **AND** the `question` SHALL contain exactly one `?`.

#### Scenario: `first` is a step for the agent

- **WHEN** a web ask follows a playback correction, or a variants, description or section rejection of work that has not changed since
- **THEN** its `first` SHALL tell the agent what to do before asking, and its `question` SHALL be the text the owner is asked.

#### Scenario: A replicate intake asks about the reference

- **WHEN** `next` runs for a standard web project in replicate mode with no intake recorded
- **THEN** the `question` SHALL be the skip line followed by one open question asking what must stay exactly as it is in the page the owner wants reproduced
- **AND** it SHALL contain exactly one `?`, and the ask SHALL have no `first`.

### Requirement: Web concepts ask for a section arc and a treatment

The web `concepts` run action SHALL ask for `concepts.md` with three cards A, B and C whose first-screen structures differ, each with its central idea, a one-line skeleton and its section arc, and for `concepts.html` showing those first screens one at a time by `?variant=` with the packaged variant switcher. It SHALL say that the chosen card is extended with a `## Treatment`.

#### Scenario: A web concepts step asks for a treatment

- **WHEN** `next` runs for a standard web project with a confirmed playback, a reference decision and no `concepts.html`
- **THEN** the `run` action SHALL name the section arc, `concepts.html`, `?variant=`, the variant switcher and `## Treatment`
- **AND** it SHALL NOT mention "between beats" or the picture.

### Requirement: Web prompts keep the shared stage contract

Web stage ids SHALL be: quick `intake, components, build, probe`; quick replicate `intake, reference, components, build, probe`; standard and full `intake, reference, concepts, components, description, build, probe, review, deliver`; standard and full replicate the same without `concepts`. Every web stage SHALL keep a guide anchor. Film, edit and `ui` prompts, stages and records SHALL NOT change.

#### Scenario: Film, edit and ui intake and film concepts are unchanged

- **WHEN** `next` runs at intake for film, edit and ui projects and at concepts for a film project (edit and ui have no concepts stage)
- **THEN** each action's question, questions (including the `duration` question), recommended, record and reason text SHALL deep-equal the corresponding shared `INTAKE` or `CONCEPTS` action.

#### Scenario: Web keeps its stage order

- **WHEN** the web stages are listed for the quick, standard and full tiers, in brief, freeform and replicate modes
- **THEN** the ids and their order SHALL equal the lists in this requirement
- **AND** `workflow-web.md` SHALL have a `## <stage id>` heading for each.

### Requirement: The treatment lives under the chosen concept card

The web guide SHALL define the treatment as a `## Treatment` section under the chosen card of
`concepts.md`, written before `index.html`, with the fields premise, section arc (job, dominant
element, ground, density and escalation role per section), style-bible seed with a must-not-copy
line from `reference.md` when it exists, motion language (driver, response, primitive,
reduced-motion substitute), and escalation and negative space.

#### Scenario: The guide defines the treatment

- **WHEN** `references/web-direction.md` is read
- **THEN** its `## Treatment` section SHALL list the five fields
- **AND** the `concepts` and `build` sections of `workflow-web.md` SHALL point to it.

### Requirement: The treatment feeds existing foundations

The style-bible seed SHALL be documented as feeding the project `DESIGN.md` sections and the motion language as feeding `MOTION.md` and `motion.md`, without adding sections to either. No `finished` condition SHALL read the content of `concepts.md`, and the treatment SHALL add no artifact.

#### Scenario: Nothing checks the treatment

- **WHEN** a standard web project's description is approved and its `concepts.md` has no `## Treatment`
- **THEN** `next` SHALL return the `build` stage as it does when the treatment is present.

### Requirement: The web build action asks for the treatment first

The first web `build` action at the standard and full tiers outside replicate mode SHALL tell the agent to extend the chosen card with `## Treatment` and write the section briefs before building the first screen. The `build` actions of the quick tier and of `replicate` mode SHALL NOT mention a treatment. The treatment's section arc SHALL list exactly the approved section ids in the approved order; a different arc SHALL be raised with the owner as a description correction before building.

#### Scenario: The build action asks for the treatment

- **WHEN** `next` runs for a standard web project whose description is approved and that has no `index.html`, or an `index.html` whose first section is not marked yet
- **THEN** the `build` action SHALL tell the agent to extend the chosen card with `## Treatment` first and to build only the first screen
- **AND** it SHALL say that the treatment's section arc lists exactly the sections of the approved description, in that order, and that a different arc goes back to the owner as a description correction.

#### Scenario: The quick tier and replicate mode are unchanged

- **WHEN** `next` runs for a quick web project, or a standard web project in `replicate` mode, with no `index.html`
- **THEN** the `build` action SHALL NOT mention a treatment.

### Requirement: Section briefs use existing fields

The web guide SHALL define a section brief whose keys map onto existing artifacts: dominant element
and supporting layers onto `design.md` Component inventory rows; ground and density onto its Layout
grid and Color tokens; states onto `component-state-matrix.json` entries; driver and response onto
`motion.md` Interaction Inventory rows; proof of response onto an `interaction.json` probe; the first
viewport's signature onto the direction-preview signature; the landing line onto the Layout grid.

#### Scenario: A brief maps onto existing artifacts

- **WHEN** the section-brief table of `references/web-direction.md` is read
- **THEN** every brief key SHALL name one of those artifacts and an existing field of it.

### Requirement: Section briefs need no new schema

Section briefs SHALL use only fields that the mapped artifacts already define, including the seven
state names `component-state-matrix.json` requires. The guide SHALL state that a section with no
driver has no Interaction Inventory row and no probe, and that the page keeps at least one probe.

#### Scenario: A brief needs no new schema

- **WHEN** a section brief's probe is written with the documented mapping
- **THEN** it SHALL validate against `design-pipeline.interaction-probe.v1` unchanged
- **AND** the interaction probe, component-state-matrix and direction-preview schema identifiers SHALL equal those before this change.

### Requirement: Review rules W1 to W7 are Visual Acceptance guidance

The web references SHALL document W1 one dominant element per section and a first-viewport signal;
W2 adjacent sections differ in density; W3 one section is deliberately empty; W4 each section
changes ground or structure; W5 scroll pacing builds, then lands; W6 motion answers a named driver,
with no opacity-only entrance; W7 type and colour stay inside the style seed. Each rule SHALL name
the existing evidence a reviewer reads and SHALL be reported only under Visual Acceptance in `qa.md`.

#### Scenario: Acceptance stays pending

- **WHEN** this change's `qa.md` is written
- **THEN** its Visual Acceptance section SHALL read pending with no reviewer recorded
- **AND** Component Conformance results SHALL be listed separately.

### Requirement: Review rules change no gate

Where a rule overlaps an existing gate finding (`no-focal-point`, `flat-hierarchy`, `dead-band`,
`clutter`, `weak-separation`, `palette-sprawl`, `type-scale-sprawl`, `opacity-only`,
`dead-interaction`, `linear-response`, the `template-pattern-density` rubric item), that finding
SHALL keep its meaning and severity as a Conformance finding. The rules SHALL NOT add a finding
code, change a gate status, or record or imply a Visual Acceptance result.

#### Scenario: Gate output is unchanged

- **WHEN** the composition and interaction gates run on the same inputs before and after this change
- **THEN** their finding codes, statuses and hints SHALL be equal
- **AND** `component-first` `visualAcceptance` statuses SHALL be unchanged.

### Requirement: The web review links the rules

The `review` section of `workflow-web.md`, which the web review action links through its `guide`
anchor, SHALL point the reviewer to W1 to W7 for builds that used a treatment; the review action
itself SHALL stay the shared checked-page review. Agents SHALL NOT record Visual Acceptance.

#### Scenario: The web review links to the rules

- **WHEN** `next` runs for a standard web project whose `index.html` exists and whose `interaction` gate passed
- **THEN** the action's `stage` SHALL be `review` and its `guide` SHALL be `references/workflow-web.md#review`
- **AND** that section of `workflow-web.md` SHALL name `web-direction.md` and W1 to W7.

### Requirement: The guidance is packaged and reachable

The new reference `references/web-direction.md` SHALL be listed in the package `required` resources.
`workflow-web.md` SHALL keep one `##` section per web stage id so that every `next` `guide` anchor
resolves, and its `intake` and `concepts` sections SHALL describe the web prompts of this change. The
skill front door SHALL name the new reference in one line.

#### Scenario: Every web guide anchor resolves

- **WHEN** the web stages for each tier are listed
- **THEN** `workflow-web.md` SHALL have a `## <stage id>` heading for each.

#### Scenario: The package carries the reference

- **WHEN** the package is built
- **THEN** it SHALL contain `references/web-direction.md`.

### Requirement: No new gate, receipt schema or analyzer

The web conversation, the treatment, the section briefs and review rules W1 to W7 SHALL NOT add a gate, a `state.gates` entry, a receipt, a schema identifier, a feedback record format, or a field on the interaction probe, component-state-matrix, direction-preview or motion contracts. Their records SHALL live under `decisions` in `.design-pipeline/state.json` and in `state.rules`. The only new finding codes SHALL be `variants-incomplete`, `variant-switcher-missing` and `variant-switcher-shipped`.

#### Scenario: A section verdict cites Feedback by reference

- **WHEN** a section rejection cites runtime-review Feedback
- **THEN** the verdict SHALL record the Feedback's path, hash, object id and category under `decisions.sections`, and no new record format


#### Scenario: Contracts are unchanged

- **WHEN** the schema identifiers and finding-code sets of the interaction, composition, component-state-matrix and direction-preview contracts, and the workflow-state schema identifier, are compared with the previous release
- **THEN** they SHALL be equal.

### Requirement: Web intake ends in a confirmed playback or a stated skip

Web intake SHALL finish only when decide records the playback the owner confirmed (`--verdict accept`) or a skip (`--choice skip`) whose answer states what the agent decided for the owner. A skip completes intake only; the variant pick still asks, and the decision round, description and section checkpoints follow the delegation map. A correction (`--verdict reject`) SHALL become a rule and reopen intake. Web intake SHALL NOT write `brief.md`.

#### Scenario: Corrections loop until the owner confirms

- **WHEN** decide records a playback correction for a standard web project
- **THEN** a rule SHALL hold the correction and `next` SHALL stay at intake, with a `first` step to play the page back again and a question asking what is still wrong or missing
- **AND** after `--verdict accept` with the confirmed playback, `next` SHALL move past intake.

#### Scenario: The playback is confirmed before concepts

- **WHEN** a standard web project has only corrections recorded
- **THEN** `next` SHALL NOT return the concepts stage.

#### Scenario: A skip needs a stated decision

- **WHEN** decide records `--stage intake --choice skip` with no answer
- **THEN** it SHALL fail and leave the state unchanged
- **AND** with a one-line statement of the decisions it SHALL complete intake and keep that line.

#### Scenario: A skip completes intake only

- **WHEN** a standard web project records a stated skip
- **THEN** `next` SHALL move past intake
- **AND** it SHALL still ask the owner about the variants, while the decision round, the description and each section follow the delegation map (agent self-checks by default).

### Requirement: Recorded answers carry content

Under the minimum-content rule, a stated decision (the confirmed playback, or a skip line at any tier) SHALL hold at least six words, and every reason (a correction, a rejection, the notes of a combination or an anti-goal) at least three. A word is a run of letters or digits, an apostrophe inside it ("don't") keeps it one word, and two CJK characters count as one. A shorter answer SHALL be refused with `CONTRACT_INVALID` and leave the state unchanged.

#### Scenario: A stated decision needs six words

- **WHEN** decide records a confirmed playback or a skip line of fewer than six words, such as `OK, start.`, `proceed`, `do it`, `just start`, `yes, build it as shown`, `默认` or `直接开始吧`
- **THEN** it SHALL fail with `CONTRACT_INVALID`, its message ending "(at least 6 words; two CJK characters count as one)", and leave the state unchanged.

#### Scenario: A no must say what is wrong

- **WHEN** a playback correction, a variant rejection, the notes of a combination, a decision-round correction, a description rejection, a section rejection's `--answer` or an `--anti-goal` is `no`, `nope`, `Too dark` or `首屏太暗了`
- **THEN** decide SHALL fail with `CONTRACT_INVALID` and leave the state unchanged
- **AND** `No stock photos` and `The hero is too dark` SHALL be recorded.

#### Scenario: A section rejection may cite only Feedback

- **WHEN** a section rejection cites a recorded runtime-review Feedback with `--evidence` and has no `--answer`
- **THEN** decide SHALL record it and add the Feedback's project rule.

### Requirement: Anti-goals become project rules

Each `--anti-goal "<text>"` given with a web intake's confirmed playback or skip, the quick skip included, SHALL become a project rule unless a project rule with the same text exists. `--anti-goal` given with a correction, at another stage, or on a film, edit or ui project SHALL be refused with `CONTRACT_INVALID` before any state change.

#### Scenario: Anti-goals become rules once

- **WHEN** decide records the confirmed playback with two `--anti-goal` texts, one of which is already a project rule
- **THEN** `state.rules` SHALL gain one rule, `anti-goal N`, for the other text
- **AND** `--anti-goal` with a correction, at the concept stage or on a film project SHALL fail with `CONTRACT_INVALID` and record nothing.

### Requirement: Returned intake commands carry the anti-goal flag

The intake `record` and `skip` commands and the quick intake `command` that `next` returns SHALL end in the optional repeatable `[--anti-goal "<anti-goal>" ...]`, so running a returned command keeps every anti-goal. The `correction` command SHALL NOT carry it.

#### Scenario: A returned intake command keeps every anti-goal

- **WHEN** the agent fills the `record` or `skip` command of the standard intake ask, or the quick intake `command`, with its answer and two anti-goals and runs it with the CLI
- **THEN** `state.rules` SHALL hold both anti-goals, `anti-goal 1` and `anti-goal 2`, and intake SHALL be finished.

### Requirement: Quick web work states its decisions

The quick web workflow SHALL start with a `run` action telling the agent to tell the owner in one line what it decided for them and to record that line with `decide --stage intake --choice skip`; the components ask SHALL wait for that record. Quick keeps its short path (owner-approved): it states its decisions (point 4) and asks only the component sources; it has no opening question, playback, variants, description approval or section reviews.

#### Scenario: Quick work cannot start silently

- **WHEN** `next` runs for a new quick web project
- **THEN** it SHALL return the intake `run` action with a `--choice skip` command, and its instruction SHALL tell the agent to add each thing the request rules out as an `--anti-goal`
- **AND** a line of fewer than six words, such as `proceed` or `do it`, SHALL be refused
- **AND** after the stated line is recorded it SHALL return the components ask.

#### Scenario: Quick has no conversational checkpoints

- **WHEN** a quick web project runs from its stated line to probe
- **THEN** `next` SHALL ask the owner only the component sources, with the `components` question alone
- **AND** decide SHALL refuse a variant pick, a description verdict or a section verdict for it.

### Requirement: Web variants are switchable first screens

Before the concept ask, `concepts.html` SHALL mark first screens `data-variant` A, B and C and contain the variant switcher, outside HTML comments; otherwise `next` SHALL return a `run` action with findings. The switcher SHALL show only the selected variant, whatever `display` the page's own CSS sets. The pick SHALL be `--choice` A, B or C, or several comma-separated with an answer saying what to combine. A rejection SHALL become a project rule and reopen the pick.

#### Scenario: An incomplete variants page is not shown

- **WHEN** `concepts.md` exists but `concepts.html` lacks a variant marker or the switcher, or carries them only inside HTML comments
- **THEN** `next` SHALL return a `run` action whose findings name what is missing.

#### Scenario: Hidden variants stay hidden

- **WHEN** `concepts.html` gives its variant panels their own `display` (a type rule such as `section { display: grid }`, an id rule or an inline style) and is opened at `?variant=B`
- **THEN** only variant B SHALL be rendered.

#### Scenario: The owner combines variants

- **WHEN** decide records `--stage concept --choice B,C --answer "B's header with C's layout"`
- **THEN** decisions.concept SHALL be `B,C` and the answer SHALL be kept
- **AND** a combination without an answer or with fewer than three words of notes, an unknown key or a number SHALL be rejected.

#### Scenario: The owner rejects the variants

- **WHEN** decide records `--stage concept --verdict reject --answer "<reason>"`
- **THEN** the reason SHALL become a project rule and the concepts ask SHALL return
- **AND** while `concepts.html` is unchanged the ask SHALL tell the agent to redo the variants first.

#### Scenario: Variants the owner has not seen cannot be picked or rejected

- **WHEN** decide records a variant pick or rejection before `next` asks about the variants page
- **THEN** it SHALL fail with `WORKFLOW_NOT_READY` and record nothing.

### Requirement: The variant switcher never ships

The built `index.html` SHALL carry no part of the variant switcher: no `data-variant` or `data-variant-name` panels, and no switcher markup or script, whether inline, named by a `<script src>` or copied into a local script under another name. HTML comments SHALL be ignored. Until the switcher is removed, build SHALL stay unfinished with the error finding `variant-switcher-shipped`.

#### Scenario: The switcher never ships

- **WHEN** `index.html` carries `data-variant` or `data-variant-name` panels, the switcher's markup or inline script, a `<script src>` that names the switcher, or a local `<script src>` file that contains it under another name
- **THEN** build SHALL stay unfinished with the error finding `variant-switcher-shipped` telling the agent to remove it
- **AND** the same text inside an HTML comment SHALL NOT count.

### Requirement: Web concrete decisions are asked in numbered rounds

At standard and full the components step SHALL open a round of numbered questions, the sections in build order and the component sources, each with a recommended answer, and SHALL tell the agent to look up facts instead of asking for them. The agent MAY ask further numbered rounds (each question with a recommended answer) for questions that depended on earlier answers, and SHALL record `components` once, after the last round; the settled answers go into the description.

#### Scenario: The round carries recommendations

- **WHEN** `next` returns the components step for a standard web project, as the agent's self-check by default or the owner's ask when kept
- **THEN** its `questions` SHALL be `sections` and `components`, each with a recommended answer
- **AND** for a quick project they SHALL be `components` alone.

#### Scenario: Dependent questions wait for a further round

- **WHEN** `next` asks components for a standard web project
- **THEN** its instruction SHALL tell the agent to ask a question that depends on one still open in a further numbered round, asked the same way
- **AND** to record the components decision once, after the last round.

### Requirement: Component sources are offered in plain words

The components step SHALL offer the component sources as `{choice, label}` options in plain words, in the order project, github, index, discover, scratch, and its recommended answer SHALL name labels only; the ids SHALL stay in its record command.

#### Scenario: The sources are offered in plain words

- **WHEN** `next` asks components
- **THEN** the options SHALL be `project` "Components this project already has", `github` "A GitHub library you name", `index` "This skill's component index", `discover` "Let me find open-source libraries" and `scratch` "Write from scratch"
- **AND** the recommended answer SHALL be "Components this project already has first, then this skill's component index, then let me find open-source libraries."
- **AND** the record command (`record` on an owner ask, `command` on a self-check) SHALL take the ids.

### Requirement: A no in a decision round becomes a rule

Each "no" the owner gives in a decision round SHALL be recorded with the components ask's `correction` command, `decide --stage components --verdict reject --answer "<…>"`. It SHALL append the correction to `decisions.rounds` and add a rule bound to the result under review, and SHALL NOT record or change the components decision.

#### Scenario: A no in a round becomes a rule

- **WHEN** decide records `--stage components --verdict reject --answer "No icon fonts, only inline SVG"`
- **THEN** `decisions.rounds` SHALL hold the correction and `state.rules` SHALL gain the rule `decisions 1`, bound to the result under review
- **AND** the components decision SHALL stay as it was
- **AND** a correction before `next` reaches components SHALL fail with `WORKFLOW_NOT_READY`, and `--verdict accept`, or a correction with `--choice`, SHALL fail with `CONTRACT_INVALID`.

### Requirement: Web build waits for an approved description

At standard and full, `next` SHALL NOT return a build action until `brief.md` is approved as the one-page description with `decide --stage description --verdict accept --choice <section ids>`, by the agent's self-check by default or by the owner when kept. The approval SHALL bind the brief's bytes, the confirmed playback, the variant pick and the component decision; changing any of them SHALL ask again. A rejection SHALL become a rule.

#### Scenario: Build is blocked until approval

- **WHEN** a standard web project has its components decision but no current description approval
- **THEN** `next` SHALL return the description stage, never build
- **AND** a section verdict SHALL be refused with `WORKFLOW_NOT_READY`.

#### Scenario: A changed brief or decision asks again

- **WHEN** `brief.md` changes, or a different variant pick or component decision is recorded, after approval
- **THEN** `next` SHALL return the description ask again before any further section or probe.

### Requirement: The description lists its sections

`brief.md` SHALL carry a `## Sections` heading followed by one top-level list item per section, in build order, each starting with its id (lowercase letters, digits and hyphens), and the approval's `--choice` SHALL equal that list exactly, in its order. Once `next` has reached the description, the approval MAY be recorded again: the identical approval SHALL keep the section verdicts, and a different one SHALL ask every section again.

#### Scenario: The description names its sections

- **WHEN** `brief.md` has no `## Sections` list, lists an item that does not start with a valid id or lists an id twice, or the approval's `--choice` differs from the list in its ids or their order
- **THEN** decide SHALL fail with `CONTRACT_INVALID`, naming the list where there is one, and record nothing
- **AND** a word that appears only in the prose of `brief.md` SHALL NOT count as a section id.

#### Scenario: An approval can be recorded again

- **WHEN** the identical approval is recorded again after `next` has moved on to build
- **THEN** decide SHALL accept it, and the section verdicts given under it SHALL still count.

### Requirement: Project rules stay out of the description

The description instruction SHALL tell the agent not to copy the project rules into `brief.md`, because the rules stay in `state.rules` and return with every action. A rule recorded after the approval SHALL leave the approval current, while any change to `brief.md` still asks for the approval and every section review again.

#### Scenario: Rules stay out of the description

- **WHEN** `next` asks for the description
- **THEN** its instruction SHALL tell the agent not to copy the project rules into `brief.md`
- **AND** a rule recorded after the approval, such as a section rejection, SHALL leave the approval current.

### Requirement: Web pages are built and reviewed one section at a time

At standard and full the build SHALL follow the approved section order: the first section first, each marked `data-section` in `index.html`. A marker inside an HTML comment SHALL NOT count. `next` SHALL return the review of each built section (the agent's self-check by default, the owner's ask when kept) before the next is built, and build SHALL finish only when every approved section is accepted under the current approval. A section verdict SHALL NOT claim Visual Acceptance.

#### Scenario: Sections advance only after review

- **WHEN** the first section is built and the manifest is valid
- **THEN** `next` SHALL return the review of that section, and SHALL return the build of the second section only after decide records `--stage section --choice <first> --verdict accept`.

#### Scenario: Out-of-order acceptance is refused

- **WHEN** decide accepts a section other than the one `next` asks about
- **THEN** it SHALL fail with `WORKFLOW_NOT_READY` and record nothing.

#### Scenario: A rejected section is revised

- **WHEN** the owner rejects a built section with comments
- **THEN** each comment SHALL become a rule bound to that section and `next` SHALL return that section's review again, telling the agent to revise it while the page is unchanged.

#### Scenario: Re-approval asks the sections again

- **WHEN** the description is approved again after a change
- **THEN** section verdicts given under the earlier approval SHALL NOT count.

#### Scenario: A marker inside a comment is not a built section

- **WHEN** `index.html` carries `data-section="<id>"` only inside an HTML comment
- **THEN** `next` SHALL treat that section as unbuilt
- **AND** decide SHALL refuse a verdict on it with `WORKFLOW_NOT_READY`.

### Requirement: Section comments may cite runtime-review Feedback

A section verdict MAY cite runtime-review Feedback records with `--evidence`; `runtime-review check` SHALL remain the authority on bundle lineage. In this change the owner comments on a section in text that names each element by its text, label or place. Clicking elements on the page is a planned follow-up change that extends runtime-review (for example, clickable regions on a captured screenshot of the section). Until that change lands, no web prompt SHALL claim element picking.

#### Scenario: Section comments name elements in text

- **WHEN** `next` asks the owner to review a built section
- **THEN** its instruction SHALL ask the owner to name each element they comment on by its text, label or place
- **AND** it SHALL NOT offer clicking elements on the page.

### Requirement: Cited Feedback is a valid runtime-review record

Decide SHALL accept only contained files that validate against the `Record` definition in `references/runtime-review.schema.json`, using the validator runtime-review uses, store each path and hash with the verdict and, on a rejection, record each Feedback's object, actual and expected text as a project rule.

#### Scenario: Recorded Feedback becomes rules

- **WHEN** a section rejection cites a runtime-review Feedback record
- **THEN** the verdict SHALL store its path and hash and a project rule SHALL carry its object, actual and expected text.

#### Scenario: Anything else is refused

- **WHEN** `--evidence` names a missing file, a file outside the project, or JSON that does not validate as a runtime-review `Record`, such as a hand-written record with an empty `contextAtRecord`
- **THEN** decide SHALL fail and record nothing.

### Requirement: Every web rejection becomes a rule

Every "no" the owner gives in the web conversation SHALL append `{text, from, scope}` to `state.rules`, scoped as owner-attention-asks defines, with `from` naming the checkpoint and its count: `playback N`, `anti-goal N`, `variants N`, `decisions N`, `description N`, `section <id> N` or `draft N`. An anti-goal whose text is already a rule SHALL NOT be added again. Every later action before `done` SHALL return the open rule texts.

#### Scenario: Rules accumulate across checkpoints

- **WHEN** the owner corrects a playback, confirms it with an anti-goal, rejects the variants, turns down a recommendation in the decision round, and rejects the description and a section
- **THEN** `state.rules` SHALL hold one entry per "no" with `from` `playback 1`, `anti-goal 1`, `variants 1`, `decisions 1`, `description 1` and `section <id> 1`
- **AND** the next action SHALL list the open ones in `rules`.
