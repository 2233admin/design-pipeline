## MODIFIED Requirements

### Requirement: single next step
The pipeline SHALL provide a `next` command that reads project state and returns exactly one action: run a command, ask the user one decision with a recommended answer or, in a web intake conversation, one open question, or report done with evidence. Completed steps SHALL NOT be repeated.

#### Scenario: Work has a next action
- **WHEN** project state contains unfinished work
- **THEN** `next` SHALL return exactly one action to run a command or to ask the user one decision with a recommended answer or one open question
- **AND** it SHALL NOT repeat completed steps

#### Scenario: A web conversation asks an open question
- **WHEN** `next` opens the intake of a standard or full web project
- **THEN** the ask SHALL carry one open question with no recommended answer, option list or numbered question list

#### Scenario: Work is done
- **WHEN** project state shows all steps complete
- **THEN** `next` SHALL report done with evidence

### Requirement: two human decisions
Standard film and edit work SHALL ask the user to pick a concept and to accept or reject a draft that has passed all error gates. Standard and full web work SHALL instead ask the owner to confirm the playback, pick the variant and accept the final page; the decision rounds, the description approval and each section review SHALL be agent self-checks unless the owner keeps them. Every rejection SHALL be recorded with its reason as a rule; in web work, so SHALL each decision-round correction and each anti-goal (a project rule) stated with the confirmed playback or a skip.

#### Scenario: Standard work reaches decision points
- **WHEN** standard film or edit work reaches concept choice and draft review
- **THEN** the pipeline SHALL ask the user to pick a concept and to accept or reject a draft that passed all error gates
- **AND** it SHALL record a rejection with its reason

#### Scenario: Standard web work reaches its checkpoints
- **WHEN** standard or full web work runs from intake to delivery
- **THEN** it SHALL ask the owner to confirm a playback, pick or combine first-screen variants (except in replicate mode) and accept or reject the checked page, while the concrete decisions, the description and each section are settled by agent self-checks unless the owner kept them
- **AND** every rejection or correction at these checkpoints SHALL be recorded as a rule, and each anti-goal stated with the playback or a skip as a project rule

### Requirement: Web build follows an explicit component source decision

Every web tier and mode SHALL settle components before build (the agent's self-check by default, the owner's ask when kept): at quick immediately before it, at standard and full in the decision rounds before the description. Decide SHALL require explicit comma-separated choices from project, github, index, discover and scratch, keep the answer and store canonical deduplicated componentSources. Scratch SHALL be exclusive; github SHALL need an HTTPS GitHub owner/repo URL in the answer. The step SHALL offer the sources in plain words, with the canonical ids in its record command, and SHALL recommend the project's components, then the index, then discovery.

#### Scenario: Next reaches a build boundary

- **WHEN** earlier prerequisites are complete and no components decision is recorded
- **THEN** next SHALL return the components step before the description and the build
- **AND** at standard and full the step SHALL open a round of numbered questions, the sections in build order and the component sources, each with a recommended answer
- **AND** at quick it SHALL ask only the component sources, immediately before build
- **AND** its decide command SHALL bind the absolute project path and work outside that directory.

#### Scenario: Decide validates and records explicit sources

- **WHEN** decide uses `--stage components --choice index,project,index --answer "<the owner's reply>"`
- **THEN** decisions.componentSources SHALL be `["project","index"]` and decisions.components SHALL preserve the answer unchanged
- **AND** canonical ordering SHALL be project, github, index, discover, scratch, restricted to selected choices.
- **AND** missing or unknown choices, scratch combined with another choice (discover included), or github without an HTTPS GitHub owner/repo URL in the answer SHALL be rejected
- **AND** a components decision on a film, edit or ui workflow SHALL be rejected before any state or evidence changes.

#### Scenario: The owner lets the agent discover sources

- **WHEN** next asks components
- **THEN** the ask SHALL offer letting the agent find maintained open-source component libraries and icon sets on GitHub beyond the index, as the plain-words option "Let me find open-source libraries" with the id `discover` in its record command, and SHALL recommend the project's components, then the index, then discovery
- **AND** decide with `--choice discover,index,project` SHALL store `["project","index","discover"]` without requiring a URL in the answer.

#### Scenario: Legacy answer-only decision reaches build

- **WHEN** a web state has a components answer but no explicit componentSources set
- **THEN** next SHALL ask components again rather than infer sources from the answer.

#### Scenario: Build follows a recorded reply

- **WHEN** decide records the owner's components reply with a valid explicit `--choice` set
- **THEN** the build instruction SHALL follow that reply and explicitly name references/component-source-catalog.json
- **AND** index discovery SHALL use design-system route and design-system search with the page brief and platform web
- **AND** the instruction SHALL require component-manifest.json before index.html
- **AND** it SHALL search the index first, route font choice through tools/fonts.md without silently defaulting to the system stack, and keep discovered code and fonts bundled or self-hosted inside the project with their notices, with no CDN scripts or remote fonts at runtime.

#### Scenario: Build guidance with discover selected

- **WHEN** the recorded componentSources include discover
- **THEN** the build instruction SHALL tell the agent, when nothing indexed fits, to find maintained open-source component libraries or icon sets on GitHub, check each license at a pinned revision, record the manifest entry before use and prefer genuine reuse over hand-writing
- **AND** without discover the instruction SHALL NOT offer discovery beyond the selected sources.

#### Scenario: Changed decision invalidates checked evidence

- **WHEN** a different components answer or source set is recorded after interaction, review or delivery evidence exists, or a first explicit decision is recorded on a legacy state that already holds such evidence
- **THEN** the interaction pass and delivery SHALL be invalidated
- **AND** at quick next SHALL return to the probe boundary, while at standard and full the description approval SHALL no longer be current, so next SHALL ask for it and for each section review again before probe
- **AND** recorded review verdicts SHALL stay unchanged but SHALL NOT complete review for the new decision
- **AND** re-recording an identical decision SHALL leave the evidence intact
- **AND** adding or removing discover SHALL count as a different source set.
