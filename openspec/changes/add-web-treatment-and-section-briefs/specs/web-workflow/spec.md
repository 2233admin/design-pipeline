# Web workflow delta

## ADDED Requirements

### Requirement: The web workflow has its own intake and concepts prompts

`next` for the `web` deliverable SHALL return web-specific actions at the `intake` and `concepts`
stages, defined in `skill/scripts/workflows/web.cjs`. The intake SHALL ask four questions with ids
`product`, `audience`, `scope` and `assets`; `scope` asks which pages or sections the page needs and
what the visitor should be able to do first. No web intake question, recommendation, reason or record
text SHALL ask for a duration or use the words film, promo, video, footage or beat. The concepts
`run` action SHALL ask for three cards whose central ideas differ, each stating a central idea about
the page and its section arc, and SHALL say that the chosen card is extended with a `## Treatment`.
The stage ids, the `finished` conditions, the `record` command strings and the `guide` anchors of
both stages SHALL equal the shared ones. The film, edit and `ui` prompts SHALL NOT change.

#### Scenario: A web intake has no film or duration wording

- **WHEN** `next` runs for a standard web project with no `brief.md`
- **THEN** the action's question ids SHALL equal `product`, `audience`, `scope`, `assets`
- **AND** the serialized action SHALL NOT match `how long`, `duration`, `film`, `promo`, `video`, `footage` or `beat` (case-insensitive)
- **AND** its `record` string SHALL equal the shared intake's.

#### Scenario: A web concepts step asks for a treatment

- **WHEN** `next` runs for a standard web project with a brief, a reference decision and no `concepts.md`
- **THEN** the `run` action's command SHALL name the section arc and `## Treatment`
- **AND** it SHALL NOT mention "between beats" or the picture.

#### Scenario: Film, edit and ui intake and film concepts are unchanged

- **WHEN** `next` runs at intake for film, edit and ui projects and at concepts for a film project (edit and ui have no concepts stage)
- **THEN** each action's question, questions (including the `duration` question), recommended, record and reason text SHALL deep-equal the corresponding shared `INTAKE` or `CONCEPTS` action.

#### Scenario: Web keeps its stage order

- **WHEN** the web stages are listed for the quick, standard and full tiers
- **THEN** the ids and their order SHALL equal those before this change.

### Requirement: The web review stage asks about a page

`next` for the `web` deliverable at the `review` stage SHALL return a web-specific `ask` action,
defined in `skill/scripts/workflows/web.cjs`. It SHALL name the page and show it at the screenshots
375x812, 768x1024 and 1440x900, its motion at full speed and the gate summary, and SHALL point the
reviewer to W1 to W7 in `references/web-direction.md` for Visual Acceptance. No field of the action
SHALL contain the words video, contact sheet (or `contact-sheet`), footage or beat. The stage id
`review`, the `finished` condition (a recorded draft with verdict `accept`), the `record` command
string and the `guide` anchor SHALL equal the shared ones, and `decide --stage review` SHALL keep
its behaviour, including reopening `probe` after a rejection. The film and edit review output
SHALL NOT change (the `ui` deliverable has no review stage).

#### Scenario: A web review names the page and its viewports

- **WHEN** `next` runs for a standard web project whose `index.html` exists and whose `interaction` gate passed
- **THEN** the action `type` SHALL be `ask` and its `stage` SHALL be `review`
- **AND** the serialized action SHALL contain `375x812`, `768x1024`, `1440x900` and `web-direction.md`
- **AND** it SHALL NOT match `video`, `contact.sheet`, `footage` or `beat` (case-insensitive)
- **AND** its `record` string SHALL equal the shared review's.

#### Scenario: Review decisions behave as before

- **WHEN** a web draft is rejected with a reason and then a rebuilt draft is accepted
- **THEN** the rejection SHALL clear the `interaction` gate and add a project rule, so `next` returns to `probe`
- **AND** the accepted draft SHALL finish the `review` stage.

#### Scenario: Film and edit review output is unchanged

- **WHEN** `next` runs at the review stage for film and edit projects
- **THEN** each action's question, show, recommended, record and reason text SHALL deep-equal the shared `REVIEW` action.

### Requirement: The treatment lives under the chosen concept card

The web guide SHALL define the treatment as a `## Treatment` section under the chosen card of
`concepts.md`, written before `index.html` at the standard and full tiers, with the fields premise,
section arc (per section: job, dominant element, ground, density, escalation role), style-bible seed
(with a must-not-copy line from `reference.md`), motion language (driver, response, primitive,
reduced-motion substitute) and escalation and negative space. The web `build` action at the standard
and full tiers SHALL tell the agent to write it first; the quick tier's `build` action SHALL NOT
change. No stage SHALL be added, no `finished` condition SHALL read the content of `concepts.md`, and
no new artifact SHALL be introduced. The style-bible seed SHALL be documented as feeding the project
`DESIGN.md` sections and the motion language as feeding `MOTION.md` and `motion.md`, without adding
sections to either.

#### Scenario: The build action asks for the treatment

- **WHEN** `next` runs for a standard web project whose concept is chosen and that has no `index.html`
- **THEN** the `build` action SHALL tell the agent to extend the chosen card with `## Treatment` first
- **AND** the action's stage id SHALL be `build` and `remaining` SHALL equal the count before this change.

#### Scenario: The quick tier is unchanged

- **WHEN** `next` runs for a quick web project with no `index.html`
- **THEN** the `build` action SHALL NOT mention a treatment.

### Requirement: Section briefs use existing fields

The web guide SHALL define a section brief whose keys map onto existing artifacts: the dominant
element and supporting layers onto `design.md` Component inventory rows (component ids from the
component-first flow where a catalogued component is used); ground and density onto the `design.md`
Layout grid and Color tokens; required states onto `component-state-matrix.json` entries; driver and
response onto `motion.md` Interaction Inventory rows; proof of response onto an `interaction.json`
probe; the first viewport's signature onto the direction-preview signature; and the escalation or
landing line onto the section's Layout grid row. The guidance SHALL use only fields those artifacts
already define, and SHALL state that a section with no driver has no Interaction Inventory row and
no probe.

#### Scenario: A brief needs no new schema

- **WHEN** a section brief's probe is written with the documented mapping
- **THEN** it SHALL validate against `design-pipeline.interaction-probe.v1` unchanged
- **AND** the interaction probe, component-state-matrix and direction-preview schema identifiers SHALL equal those before this change.

### Requirement: Review rules W1 to W7 are Visual Acceptance guidance

The web references SHALL document these rules: W1 one dominant element per section and a
first-viewport signal; W2 adjacent sections differ in density; W3 one section is deliberately empty;
W4 each section changes ground or structure; W5 scroll pacing builds, then lands; W6 motion answers a
named driver, with no opacity-only entrance; W7 type and colour voices stay inside the style seed.
Each rule SHALL name the existing evidence a reviewer reads (composition findings, the 375x812,
768x1024 and 1440x900 screenshots, the interaction probe result, `motion.md` rows, the treatment and
briefs) and SHALL be reported only under Visual Acceptance in `qa.md`. Where a rule overlaps an
existing gate finding (`no-focal-point`, `flat-hierarchy`, `dead-band`, `clutter`, `weak-separation`,
`palette-sprawl`, `type-scale-sprawl`, `opacity-only`, `dead-interaction`, `linear-response`, the
`template-pattern-density` rubric item) that finding SHALL keep its meaning and severity as a
Conformance finding. The rules SHALL NOT add a finding code, SHALL NOT change a gate status, and SHALL
NOT record or imply a Visual Acceptance result; agents SHALL NOT record Visual Acceptance.

#### Scenario: Gate output is unchanged

- **WHEN** the composition and interaction gates run on the same inputs before and after this change
- **THEN** their finding codes, statuses and hints SHALL be equal
- **AND** `component-first` `visualAcceptance` statuses SHALL be unchanged.

#### Scenario: Acceptance stays pending

- **WHEN** this change's `qa.md` is written
- **THEN** its Visual Acceptance section SHALL read pending with no reviewer recorded
- **AND** Component Conformance results SHALL be listed separately.

### Requirement: The guidance is packaged and reachable

The new reference `references/web-direction.md` SHALL be listed in the package `required` resources.
`workflow-web.md` SHALL keep one `##` section per web stage id so that every `next` `guide` anchor
resolves, and its `intake` and `concepts` sections SHALL describe the web prompts of this change. The
skill front door SHALL name the new reference in one line and SHALL stay under 5 KB.

#### Scenario: Every web guide anchor resolves

- **WHEN** the web stages for each tier are listed
- **THEN** `workflow-web.md` SHALL have a `## <stage id>` heading for each.

#### Scenario: The package carries the reference

- **WHEN** the package is built
- **THEN** it SHALL contain `references/web-direction.md`.

### Requirement: No new gate, receipt schema or analyzer

This change SHALL NOT add a gate, a finding code, a receipt, an analysis schema, a workflow stage, a
workflow-state field, or a field on the interaction probe, component-state-matrix, direction-preview
or motion contracts. It SHALL add only the web intake, concepts and review prompts, the `build`
action sentence, documentation, tests and packaging registration.

#### Scenario: Contracts are unchanged

- **WHEN** the schema identifiers and finding-code sets of the interaction, composition,
  component-state-matrix, direction-preview and workflow-state contracts are compared with the
  previous release
- **THEN** they SHALL be equal.
