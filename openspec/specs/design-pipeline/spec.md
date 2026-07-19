# design-pipeline Specification

## ADDED Requirements

### Requirement: Design-first scope

The pipeline SHALL optimize for design outcomes and SHALL NOT become a general-purpose skill marketplace.

#### Scenario: External engineering skill considered

- **WHEN** an external engineering skill is proposed
- **THEN** it SHALL be accepted only if it supports design implementation, validation, artifact lifecycle, or design QA.

### Requirement: OpenSpec-aligned artifact lifecycle

The pipeline SHALL use durable artifacts for each change and SHALL map them to OpenSpec proposal, design, tasks, and spec delta concepts.

#### Scenario: New design change starts

- **WHEN** a new design change starts
- **THEN** the pipeline SHALL create or use a change folder with brief, directions, design, motion, tasks, QA, state, events, and handoff artifacts.

### Requirement: Optional companion skill fallback

The pipeline SHALL not fail only because optional companion skills are missing.

#### Scenario: User has only design-pipeline installed

- **WHEN** self-check runs with only the core pipeline installed
- **THEN** required checks SHALL pass and missing optional skills SHALL report warnings with fallbacks.

### Requirement: Motion is first-class

The pipeline SHALL require explicit motion documentation for non-trivial animation and interaction motion.

#### Scenario: GSAP animation is planned

- **WHEN** GSAP, Anime.js, React View Transitions, scroll animation, route transition, or multi-step choreography is planned
- **THEN** the pipeline SHALL require `motion.md` using the motion spec template.

### Requirement: Capability-first companion routing

The pipeline SHALL select companion skills from the required design capability and the target repository's existing stack rather than from skill-folder presence alone.

#### Scenario: Animation runtime is selected

- **WHEN** a change needs runtime animation
- **THEN** the pipeline SHALL compare CSS, Anime.js, GSAP, React View Transitions, and the existing project runtime against the documented motion requirements and SHALL NOT add overlapping runtimes without distinct responsibilities.

### Requirement: Version-sensitive capability profile

The pipeline SHALL report install discovery separately from version-sensitive capability compatibility.

#### Scenario: Installed Anime.js companion is stale

- **WHEN** `animejs` is installed but lacks one or more Anime.js v4.5 capability markers
- **THEN** self-check SHALL report a non-blocking warning with the missing markers and an official-documentation fallback.

### Requirement: Explicit multi-root skill discovery

The pipeline SHALL support explicit skill discovery across more than one filesystem root without inferring host-specific plugin-cache layouts.

#### Scenario: Companion skills use separate roots

- **WHEN** `DESIGN_PIPELINE_SKILL_ROOTS` or `CODEX_SKILLS_DIR` contains multiple platform-delimited roots
- **THEN** self-check SHALL search each root for companion skills and bundled resources.

### Requirement: Headless agent handoff

The pipeline SHALL expose enough machine-readable state for another AI agent to resume without the original UI or conversation.

#### Scenario: Agent resumes a change

- **WHEN** another agent resumes a design-pipeline change
- **THEN** it SHALL read `state.json`, recent `events.jsonl`, and `handoff.md` before continuing.

### Requirement: Open-source readiness gate

The pipeline SHALL define release criteria for open-source publication.

#### Scenario: Maintainer prepares release

- **WHEN** a maintainer prepares to publish
- **THEN** all MUST checks in the open-source readiness reference SHALL pass or the release SHALL be marked not ready.

### Requirement: Website-cloning requests use a focused superset module

The pipeline SHALL route authorized live-page clone, rebuild, reproduction, and reverse-engineering requests to a progressively disclosed module that preserves all existing design-pipeline gates.

#### Scenario: User supplies a primary live URL

- **WHEN** the user asks for a high-fidelity implementation of a live page
- **THEN** the pipeline SHALL initialize an isolated, resumable target and SHALL preserve the target project's established framework and conventions.

### Requirement: Website-cloning uses three internal ports

The URL-first interface SHALL hide Browser, Builder, and Evidence ports with machine-readable capability contracts.

#### Scenario: Exact fidelity is requested

- **WHEN** the run uses exact fidelity
- **THEN** BrowserPort SHALL capture measured evidence, BuilderPort SHALL build from complete component contracts, and EvidencePort SHALL independently compare the implementation.

#### Scenario: Required evidence capability is missing

- **WHEN** no adapter can provide a required exact-mode capability
- **THEN** the run SHALL become blocked and SHALL NOT claim pixel-perfect or 1:1 output; `fidelity-limited` is reserved for measured mismatches.

#### Scenario: Exact completion is evaluated

- **WHEN** measured verification evidence is submitted
- **THEN** the bundled evaluator SHALL require successful port probes and all required capabilities, distinguish unavailable measurements from measured mismatches, and be the only bundled command that marks the website-cloning manifest complete.

#### Scenario: Reference behavior intentionally differs

- **WHEN** a reference mapping replaces primary behavior
- **THEN** the run SHALL use an adaptive mixed contract, record and replay the mapping, and SHALL NOT describe the whole result as 1:1.

### Requirement: Primary and reference targets are distinct

The pipeline SHALL compare a primary target against its own normalized capture and SHALL use reference targets only through explicit design mappings.

#### Scenario: A reference page inspires one component

- **WHEN** a reference target contributes design or interaction properties
- **THEN** `design.md` SHALL map the source region and state to the destination component and SHALL record adopted and rejected properties.

### Requirement: Exact cloning is a convergence gate

The pipeline SHALL measure text, asset, interaction, pixel, layout, responsive, and state fidelity under recorded rendering conditions.

#### Scenario: Static pixels match but interaction differs

- **WHEN** screenshot comparison passes but a discovered interaction model or state differs
- **THEN** the run SHALL remain incomplete and SHALL create an evidence-linked repair task.

### Requirement: Website-cloning runs preserve headless history

The initializer SHALL validate input atomically, isolate targets, resume identical requests idempotently, and augment existing OpenSpec state without discarding prior decisions, events, or handoff notes.

#### Scenario: Existing OpenSpec change adopts website cloning

- **WHEN** the initializer targets an existing change without a website-cloning manifest
- **THEN** it SHALL preserve current state/history and add the module surfaces, manifest, event, and resume guidance.

### Requirement: Data-driven companion compatibility

The pipeline SHALL keep companion install groups and capability profiles in a machine-readable registry and SHALL evaluate both single-skill and multi-skill suites.

#### Scenario: A suite is only partially installed

- **WHEN** at least one skill in a capability suite is installed but another required skill or marker is missing
- **THEN** self-check SHALL report `WARN`, identify the missing skill or marker, and preserve the documented fallback.

### Requirement: Synchronous local feedback

The pipeline SHALL be able to record a finding during the command that detects it without requiring a daemon or remote service.

#### Scenario: A stale installed companion is recorded

- **WHEN** self-check runs with explicit feedback recording enabled
- **THEN** it SHALL write a redacted, deduplicated observation and local contribution draft.

### Requirement: Safe contribution boundary

Normal self-check and feedback recording SHALL NOT publish remote Issues, PRs, comments, pushes, or releases.

#### Scenario: A draft is ready for upstream contribution

- **WHEN** a user wants to publish the draft
- **THEN** an authorized GitHub or ship workflow SHALL review the remote, evidence, privacy boundary, and verification before creating the remote artifact.

### Requirement: Self-hosted improvement loop

Pipeline maintainers SHALL use the pipeline's own artifact, feedback, review, QA, and contribution gates when changing the pipeline.

#### Scenario: A downstream observation is accepted

- **WHEN** the accepted fix changes durable companion compatibility
- **THEN** the maintainer SHALL update the companion registry, preserve a regression test, verify the package, and resolve or supersede the observation.

### Requirement: Feedback state corruption fails closed

The recorder SHALL validate existing observation and index state before writing an update and SHALL
NOT overwrite corrupt evidence.

### Requirement: Specific paths are redacted first

The recorder SHALL redact longer path scopes before their parent scopes so nested feedback roots
retain the correct privacy placeholder.

### Requirement: Capability registry patterns are validated before evaluation

Self-check SHALL reject invalid profile, requirement, or regular-expression structures before
producing compatibility results.

