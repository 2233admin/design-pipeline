# Web workflow delta

## ADDED Requirements

### Requirement: Web intake asks about a page

`next` for the `web` deliverable SHALL return a web-specific `intake` action, defined in
`skill/scripts/workflows/web.cjs`, with four questions whose ids are `product`, `audience`, `scope`
and `assets`; `scope` asks which pages or sections the page needs and what the visitor should be
able to do first. No web intake question, recommendation, reason or record text SHALL ask for a
duration or use the words film, promo, video, footage or beat.

#### Scenario: A web intake has no film or duration wording

- **WHEN** `next` runs for a standard web project with no `brief.md`
- **THEN** the action's question ids SHALL equal `product`, `audience`, `scope`, `assets`
- **AND** the serialized action SHALL NOT match `how long`, `duration`, `film`, `promo`, `video`, `footage` or `beat` (case-insensitive)
- **AND** its `record` string SHALL equal the shared intake's.

### Requirement: Web concepts ask for a section arc and a treatment

The web `concepts` `run` action, defined in `skill/scripts/workflows/web.cjs`, SHALL ask for three
cards whose central ideas differ, each stating a central idea about the page and its section arc,
and SHALL say that the chosen card is extended with a `## Treatment`.

#### Scenario: A web concepts step asks for a treatment

- **WHEN** `next` runs for a standard web project with a brief, a reference decision and no `concepts.md`
- **THEN** the `run` action's command SHALL name the section arc and `## Treatment`
- **AND** it SHALL NOT mention "between beats" or the picture.

### Requirement: Web prompts keep the shared stage contract

The web `intake` and `concepts` stages SHALL keep the stage ids, `finished` conditions, `record`
command strings and `guide` anchors of the shared ones, and the web stage ids and their order SHALL
NOT change for any tier or mode. The film, edit and `ui` prompts SHALL NOT change.

#### Scenario: Film, edit and ui intake and film concepts are unchanged

- **WHEN** `next` runs at intake for film, edit and ui projects and at concepts for a film project (edit and ui have no concepts stage)
- **THEN** each action's question, questions (including the `duration` question), recommended, record and reason text SHALL deep-equal the corresponding shared `INTAKE` or `CONCEPTS` action.

#### Scenario: Web keeps its stage order

- **WHEN** the web stages are listed for the quick, standard and full tiers, in each mode
- **THEN** the ids and their order SHALL equal those before this change.

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

The style-bible seed SHALL be documented as feeding the project `DESIGN.md` sections and the motion
language as feeding `MOTION.md` and `motion.md`, without adding sections to either. No stage SHALL
be added, no `finished` condition SHALL read the content of `concepts.md`, and no new artifact SHALL
be introduced.

#### Scenario: Nothing checks the treatment

- **WHEN** a standard web project's concept is chosen and its `concepts.md` has no `## Treatment`
- **THEN** `next` SHALL return the `build` stage as it does when the treatment is present.

### Requirement: The web build action asks for the treatment first

The web `build` action at the standard and full tiers SHALL tell the agent to extend the chosen card
with `## Treatment` and write the section briefs before `index.html`. The `build` action of the
quick tier and of `replicate` mode, which have no concepts stage, SHALL NOT change.

#### Scenario: The build action asks for the treatment

- **WHEN** `next` runs for a standard web project whose concept is chosen and that has no `index.html`
- **THEN** the `build` action SHALL tell the agent to extend the chosen card with `## Treatment` first
- **AND** the action's stage id SHALL be `build` and `remaining` SHALL equal the count before this change.

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

This change SHALL NOT add a gate, a finding code, a receipt, an analysis schema, a workflow stage, a
workflow-state field, or a field on the interaction probe, component-state-matrix, direction-preview
or motion contracts. It SHALL add only the web intake and concepts prompts, the `build` action
sentence, documentation, tests and packaging registration.

#### Scenario: Contracts are unchanged

- **WHEN** the schema identifiers and finding-code sets of the interaction, composition,
  component-state-matrix, direction-preview and workflow-state contracts are compared with the
  previous release
- **THEN** they SHALL be equal.
