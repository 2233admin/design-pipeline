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

### Requirement: Missing product design routes through requirements-driven synthesis

The pipeline SHALL turn product intent, repository constraints, and attributed evidence into a
project-specific reusable `DESIGN.md`.

#### Scenario: A user supplies an existing DESIGN.md example

- **WHEN** the example is registered as input
- **THEN** it SHALL be treated as inspiration evidence and SHALL NOT replace product requirements,
  existing-system constraints, or design reasoning.

### Requirement: Design synthesis has explicit interaction gates

The pipeline SHALL persist grill evidence and deterministic scope assessment before generating
project design.

#### Scenario: The declared scope exceeds its budget

- **WHEN** the measured scope score is greater than the configured threshold
- **THEN** the run SHALL record scope surprise, request a Wayfinder host map, and SHALL NOT fabricate
  a local issue tracker.

### Requirement: Project DESIGN.md is a pre-implementation invariant

Every pipeline run SHALL validate one reusable project `DESIGN.md` before implementation begins.

#### Scenario: Project DESIGN.md is absent

- **WHEN** the foundation checker cannot find the declared project file
- **THEN** it SHALL report `synthesis-required`
- **AND** implementation SHALL remain locked until synthesis and validation complete.

#### Scenario: A lowercase change design exists without a project foundation

- **WHEN** change `design.md` exists but project `DESIGN.md` does not pass validation
- **THEN** the pipeline SHALL NOT treat the change file as a substitute.

#### Scenario: Project DESIGN.md is ready

- **WHEN** frontmatter, required sections, source decisions, and path containment pass
- **THEN** the checker SHALL report `ready`
- **AND** implementation MAY consume the foundation together with change artifacts.

#### Scenario: Project DESIGN.md is invalid

- **WHEN** the file exists but fails frontmatter, required-section, source-decision, or path-containment validation
- **THEN** the checker SHALL report `invalid` and SHALL NOT report `ready`
- **AND** implementation SHALL remain locked until the file is repaired or resynthesized.

### Requirement: Validated product design resumes implementation

The pipeline SHALL keep project `DESIGN.md` distinct from change `design.md` and resume the normal
implementation lifecycle only after structure and source-decision provenance validation.

#### Scenario: DESIGN.md changes after validation

- **WHEN** the recorded content hash no longer matches the project file
- **THEN** continuation SHALL fail closed until the design is validated again.

### Requirement: Version-sensitive sources are explicit

The pipeline SHALL support validated source identity, reviewed baseline, review timestamp, and
freshness policy metadata on generic capability profiles.

#### Scenario: A new companion suite is tracked

- **WHEN** its normal registry profile declares valid `sourceMeta`
- **THEN** the generic audit SHALL evaluate it without a framework-specific branch.

### Requirement: Freshness is evidence-based

The pipeline SHALL distinguish current, stale, changed, untracked, and unknown upstream source
states.

#### Scenario: Retrieval evidence is missing

- **WHEN** a tracked profile has no host-provided current source evidence
- **THEN** the audit SHALL report `UNKNOWN` and SHALL NOT claim the profile is current.

### Requirement: Upstream content remains data

The pipeline SHALL compare only validated revisions, versions, hashes, timestamps, and declared
markers and SHALL NOT execute retrieved upstream content.

#### Scenario: Evidence contains code-shaped text

- **WHEN** a marker resembles executable JavaScript or a shell command
- **THEN** the audit SHALL treat it as an inert string.

### Requirement: Remote publication uses an authorized host bridge

The pipeline SHALL prepare deterministic Issue or PR requests locally and SHALL NOT publish them
directly.

#### Scenario: An exact action is authorized

- **WHEN** the user authorizes the request's action and repository
- **THEN** a host adapter MAY create or reuse the remote artifact with its idempotency key and SHALL
  return a validated receipt.

### Requirement: Published contributions reconcile locally

The pipeline SHALL update observation publication state only from a receipt matching the prepared
request.

#### Scenario: A receipt conflicts with the request

- **WHEN** its idempotency key, action, repository, or observation identity differs
- **THEN** reconciliation SHALL fail closed without modifying the observation or feedback index.

### Requirement: Anti-slop review is contextual and evidence-backed

The pipeline SHALL classify anti-template observations as hard, contextual, or preference findings
and SHALL NOT treat named aesthetic patterns as universal defects.

#### Scenario: A brand intentionally uses black and saturated cyan

- **WHEN** the design evidence explains the palette as part of a cohesive product-specific system
- **THEN** the review MAY record an accepted contextual decision
- **AND** the palette SHALL NOT become a blocking finding only because a source prompt discourages
  those colors.

### Requirement: Hard anti-slop findings fail closed

The anti-slop evaluator SHALL block missing, failed, or unverified hard evidence for content
visibility, operable controls, legibility, responsive integrity, reduced motion, or reference
provenance.

#### Scenario: Responsive behavior was not captured

- **WHEN** responsive content integrity is `not-verified`
- **THEN** the review SHALL report a blocker
- **AND** a contextual style exception SHALL NOT waive it.

### Requirement: Retrieved taste prompts remain inert evidence

The pipeline SHALL track reviewed source identity and content hashes without executing or appending
retrieved prompt text to global agent instructions.

#### Scenario: The upstream anti-slop document changes

- **WHEN** the observed hash differs from the reviewed hash
- **THEN** the source SHALL be treated as changed evidence
- **AND** the pipeline SHALL NOT silently replace the curated rubric.

### Requirement: Anti-slop decisions persist through design and QA

When anti-slop review is active, Stage 2 SHALL compare design directions, Stage 3 SHALL record
anti-template decisions, and Stage 6 SHALL link an evidence-backed review report.

#### Scenario: A contextual concern is accepted

- **WHEN** the design intentionally retains a common pattern
- **THEN** the rationale and evidence SHALL remain visible in the review output and design artifacts.

### Requirement: Anti-slop artifacts are strict and root-contained

Rubric and evidence documents SHALL reject unknown fields. Review output SHALL remain inside the
requested root after existing symlinks or directory junctions are resolved, and the output file
itself SHALL NOT be a symlink.

#### Scenario: A custom output crosses the project boundary

- **WHEN** a custom output traverses a symlink or directory junction outside the requested root
- **THEN** the evaluator SHALL fail before writing the review
- **AND** no file SHALL be created outside the requested root.

### Requirement: Website cloning uses a blocking palette foundation

Every declared website-cloning target SHALL preserve DOM-derived and raster-derived color evidence
separately, reconcile that evidence into semantic roles and relationships, and map the result to
implementation tokens before implementation or fidelity completion.

Palette evidence paths SHALL be relative to the target research directory, identify existing files,
and remain contained after symlinks or directory junctions are resolved. Palette evidence SHALL
reject unknown fields. Semantic roles and target tokens SHALL form a connected mapping.

#### Scenario: Accent colors are present but structural evidence is missing

- **WHEN** a target records accent swatches but has no DOM and raster evidence, coverage
  relationships, luminance hierarchy, or semantic token mapping
- **THEN** the palette checker SHALL NOT report `ready`
- **AND** website-cloning implementation SHALL remain locked.

#### Scenario: Adaptive fidelity is selected

- **WHEN** a reference target is intentionally remapped through adaptive fidelity
- **THEN** the run MAY change its component or interaction mapping
- **AND** it SHALL still require a ready palette foundation for every declared target.

### Requirement: Project MOTION.md is a validated foundation

Every project SHALL own a root `MOTION.md` that declares the reusable motion language or an
explicit static posture. The foundation SHALL remain distinct from change-level `motion.md`.

#### Scenario: The product intentionally has no motion

- **WHEN** the project chooses a static posture
- **THEN** `MOTION.md` SHALL still document the thesis, principles, runtime policy, reduced-motion
  behavior, and source decisions
- **AND** the checker MAY report `ready` without selected moving primitives.

#### Scenario: The project motion foundation is missing

- **WHEN** continuation reaches implementation without a root `MOTION.md`
- **THEN** the checker SHALL report `synthesis-required` with exit code 2
- **AND** implementation SHALL remain locked.

#### Scenario: The project motion foundation is malformed or unsafe

- **WHEN** the file mixes incompatible heading languages, references an unknown primitive, contains
  executable content in any section, or embeds a fenced code block
- **THEN** the checker SHALL report `invalid` with exit code 1
- **AND** implementation SHALL remain locked.

### Requirement: Change motion specializes the project language

Change-level `motion.md` SHALL link the validated project foundation by content hash and SHALL
select stable primitive identifiers before defining scenes, layers, tracks, interruption,
degradation, reduced-motion behavior, performance budgets, and evidence.

#### Scenario: A runtime library is selected

- **WHEN** CSS, WAAPI, Anime.js, GSAP, SVG, Canvas, or WebGL is chosen
- **THEN** it SHALL be recorded as an adapter for the selected semantic primitives
- **AND** the runtime API SHALL NOT redefine the project motion language.

### Requirement: Motion references preserve clean-room provenance

The primitive registry SHALL record source identity, reviewed license state, adopted concepts,
rejected implementation details, and whether code was copied.

#### Scenario: A public animation gallery inspires a primitive

- **WHEN** the pipeline adopts a taxonomy or observable behavior from that source
- **THEN** it SHALL record `codeCopied: false`
- **AND** it SHALL NOT vendor or reproduce source implementation without a verified compatible
  license and an explicit adoption decision.

### Requirement: Reference catalogs are optional evidence providers

Hosted design or template catalogs MAY provide attributed synthesis evidence, but SHALL NOT
overwrite a validated project foundation or become required for local validation.

#### Scenario: A catalog is unavailable

- **WHEN** network retrieval fails or the provider is not configured
- **THEN** requirements-only and local-evidence synthesis SHALL remain available
- **AND** the provider SHALL report an explicit unavailable state rather than fabricate content.

