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
- **THEN** the run SHALL become blocked or fidelity-limited and SHALL NOT claim pixel-perfect or 1:1 output.

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

