# design-pipeline Website Cloning Delta

## ADDED Requirements

### Requirement: Website-cloning intent routes to a focused module

The pipeline SHALL route requests to clone, reproduce, rebuild, or reverse-engineer one or more live websites to a progressively disclosed website-cloning module.

#### Scenario: User supplies one live URL

- **WHEN** the user asks to clone a live web page
- **THEN** the pipeline SHALL use the website-cloning protocol while preserving the target project's framework and the existing design-pipeline gates.

### Requirement: Website-cloning runs are resumable and target-isolated

The pipeline SHALL initialize website-cloning runs inside the active OpenSpec change and SHALL isolate each normalized URL under a stable target id.

#### Scenario: User supplies multiple URLs

- **WHEN** a run is initialized with multiple distinct URLs
- **THEN** each URL SHALL have an isolated research, evidence, and asset tree under the same change.

#### Scenario: An interrupted run resumes

- **WHEN** another agent resumes an initialized website-cloning run
- **THEN** it SHALL read the change state, recent events, handoff, and website-cloning manifest before continuing from recorded next actions.

### Requirement: Extraction precedes bounded implementation

The pipeline SHALL capture the target's interaction model, exact relevant styles, real content, assets, responsive behavior, and component specification before dispatching implementation for that component.

#### Scenario: A stateful section is prepared for implementation

- **WHEN** a section changes on scroll, click, hover, time, or viewport width
- **THEN** its component specification SHALL record triggers, states, transitions, content, assets, and responsive behavior before a builder starts.

### Requirement: Website-cloning completion uses existing quality gates

The pipeline SHALL require build evidence, desktop/mobile visual comparison, interaction verification, accessibility, motion, responsive, engineering, and headless-state gates before declaring a clone complete.

#### Scenario: Visual appearance matches but interaction differs

- **WHEN** the clone passes a static screenshot comparison but uses a different interaction model
- **THEN** the run SHALL remain incomplete and SHALL record a repair action.

### Requirement: Website-cloning integration remains provider-neutral

The distributable module SHALL NOT require the upstream Next.js scaffold, Redis cache, a specific browser provider, or a specific builder runtime.

#### Scenario: Preferred browser provider is unavailable

- **WHEN** a website-cloning run cannot access a capable browser tool
- **THEN** it SHALL record a blocker and a resumable next action without producing fabricated extraction evidence.

### Requirement: Website-cloning uses capture, build, and evidence ports

The pipeline SHALL expose machine-readable Browser, Builder, and Evidence port capability contracts behind the URL-first interface.

#### Scenario: Exact fidelity is requested

- **WHEN** the run is configured for exact fidelity
- **THEN** BrowserPort SHALL capture measured observations, BuilderPort SHALL build only from complete component contracts, and EvidencePort SHALL independently compare the result.

#### Scenario: A required port capability is missing

- **WHEN** no adapter can provide a required exact-mode capability
- **THEN** the run SHALL be blocked and SHALL NOT claim pixel-perfect or 1:1 output; `fidelity-limited` is reserved for measured mismatches.

#### Scenario: Completion is evaluated

- **WHEN** the EvidencePort report is submitted to the bundled evaluator
- **THEN** the evaluator SHALL require successful probes and all required capabilities for every port, SHALL distinguish missing measurements from measured mismatches, and SHALL be the only bundled command that marks the run complete.

#### Scenario: A reference replaces primary behavior

- **WHEN** a reference target intentionally supplies an interaction that differs from the primary target
- **THEN** the run SHALL use an adaptive mixed contract, record the mapping in machine-readable form, verify every required mapped state, and SHALL NOT claim global 1:1 fidelity.
