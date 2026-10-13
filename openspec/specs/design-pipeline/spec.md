# design-pipeline Specification

## Purpose

Define the durable, design-first contracts used to plan, implement, validate, package, and improve
the design pipeline without making optional tools or hosted integrations part of the core runtime.

## Requirements

### Requirement: Design-first scope

The pipeline SHALL optimize for design outcomes and SHALL NOT become a general-purpose skill marketplace.

#### Scenario: External engineering skill considered

- **WHEN** an external engineering skill is proposed
- **THEN** it SHALL be accepted only if it supports design implementation, validation, artifact lifecycle, or design QA.

### Requirement: OpenSpec-aligned artifact lifecycle

The pipeline SHALL use durable artifacts for each change and SHALL map them to OpenSpec proposal, design, tasks, and spec delta concepts.

#### Scenario: New design change starts

- **WHEN** a new design change starts
- **THEN** the pipeline SHALL create or use a change folder with brief, directions, design, motion, tasks, QA, state, events, and handoff artifacts
- **AND** it SHALL add `reference.md` plus normative `reference-evidence.json` when visual
  references influence the change
- **AND** it SHALL add normative `scene.json` plus family-selected `scene.md` or `3d.md` when
  persistent spatial, graphics-engine, game-engine, GPU, or stateful narrative runtime ownership
  exists.

### Requirement: Optional companion skill fallback

The pipeline SHALL not fail only because optional companion skills are missing.

#### Scenario: User has only design-pipeline installed

- **WHEN** self-check runs with only the core pipeline installed
- **THEN** required checks SHALL pass and missing optional skills SHALL report warnings with fallbacks.

### Requirement: Visual directions are previewed before selection

Every change SHALL record whether a visual direction preview is required or waived. An open
whole-surface design, material visual redesign, or explicit comparison request SHALL render two to
four real miniature candidates with a shared content fixture, state coverage, and viewport before
selecting a direction. A narrow, inherited, non-visual, exact-primary-target, or user-fixed
direction MAY record a supported waiver.

#### Scenario: An open interface has no selected style

- **WHEN** Stage 2 must choose the product's visual direction
- **THEN** the pipeline SHALL hash-bind one comparison page and one screenshot per candidate
- **AND** every candidate pair SHALL differ on at least four declared axes, including luminance or era
- **AND** `directions.md` SHALL NOT commit a direction until the preview and selection gates pass.

#### Scenario: The change has one authoritative direction

- **WHEN** the user supplied a single direction or an exact primary target already decides it
- **THEN** `direction-preview.json` SHALL record the supported waiver and rationale
- **AND** the pipeline SHALL NOT invent alternatives merely to satisfy a candidate count.

### Requirement: CJK typography is explicit and bounded

Interfaces containing Chinese, Japanese, or Korean text SHALL record a system/project font stack,
CJK size and line-height posture, punctuation and mixed-script convention, and representative real
strings. Full CJK webfonts SHALL NOT be introduced for routine body or control copy; a justified
decorative heading font SHALL be subset to its known glyphs and retain a tested system fallback.

#### Scenario: A Chinese product surface is designed

- **WHEN** change `design.md` includes Chinese interface copy
- **THEN** it SHALL record the resolved stack, available weights, body line height, punctuation,
  overflow behavior, and any decorative subset's bytes, glyph scope, license, and fallback
- **AND** Stage 6 SHALL verify real CJK and mixed-script strings at responsive widths, 200% zoom,
  and font-load failure.

### Requirement: Playground interaction is resumable and purpose-bound

When a product-design, frontend, scene/runtime, or design-QA problem is poorly suited to prose, the
pipeline SHALL provide a self-contained interactive Playground with typed controls, complete
presets, an immediate representation, and a natural-language handoff. The selected state SHALL be
hash-bound into the governed change artifact selected by Playground kind.

#### Scenario: A problem benefits from interactive representation

- **WHEN** the user requests a Playground or interactive state is a better reasoning medium than text
- **THEN** the pipeline SHALL validate the self-contained HTML, declared controls and presets,
  live-update path, prompt output, and copy behavior
- **AND** it SHALL persist the complete selected state and exact non-default controls
- **AND** the integration target SHALL be `design.md`, `motion.md`, `handoff.md`, `brief.md`,
  `qa.md`, or `scene.md` according to Playground kind
- **AND** downstream use SHALL remain blocked until that target binds the kind, Playground, state,
  and prompt hashes.

#### Scenario: Interactive exploration does not improve the decision

- **WHEN** the change is narrow, non-visual, exact-target, fixed-spec, or fully resolved by the
  direction preview
- **THEN** the pipeline MAY record a supported waiver with rationale
- **AND** missing playground evidence SHALL NOT silently become a waiver.

#### Scenario: A project needs a new Playground kind

- **WHEN** none of the built-in Blueprint routes represents the interactive problem
- **THEN** the change MAY declare a lowercase path-safe kind and a contained, hash-bound Markdown
  Blueprint with required surface, state/output, and QA sections
- **AND** it SHALL select only a governed integration target
- **AND** Blueprint drift SHALL invalidate browser verification.

### Requirement: User-facing language is direct without changing scope

User-facing interface copy and human decision artifacts SHALL put the first useful consequence or
available action before internal implementation detail. A second pass SHALL preserve the source's
affected group, event, scope/count, uncertainty, time/limit, exclusions, unchanged state, and
available actions.

#### Scenario: Direct wording would widen a partial failure

- **WHEN** only part of an operation failed or remains pending
- **THEN** the title and first sentence SHALL name that exact scope instead of declaring a total failure
- **AND** controls SHALL name only actions the current interface actually provides.

#### Scenario: A notice carries a bounded possibility

- **WHEN** the source says an effect may last up to a stated limit
- **THEN** the rewrite SHALL expose the user-visible effect early
- **AND** it SHALL preserve both the uncertainty and the upper bound.

### Requirement: Motion is first-class

The pipeline SHALL require explicit motion documentation for non-trivial animation and interaction motion.

#### Scenario: GSAP animation is planned

- **WHEN** GSAP, Anime.js, PixiJS, Phaser, a 3D runtime, React View Transitions, scroll animation, route transition, or multi-step choreography is planned
- **THEN** the pipeline SHALL require `motion.md` using the motion spec template.

### Requirement: Capability-first companion routing

The pipeline SHALL select companion skills from the required design capability and the target repository's existing stack rather than from skill-folder presence alone.

#### Scenario: Animation runtime is selected

- **WHEN** a change needs runtime animation
- **THEN** the pipeline SHALL compare CSS, Anime.js, GSAP, PixiJS, Phaser, applicable 3D runtimes, React View Transitions, and the existing project runtime against the documented motion and rendering requirements and SHALL NOT add overlapping runtimes without distinct responsibilities.

### Requirement: PixiJS is a bounded 2D rendering route

The pipeline SHALL treat PixiJS as an optional interactive 2D renderer and scene runtime rather
than as the default animation choice or a replacement for semantic HTML.

#### Scenario: A PixiJS render surface is justified

- **WHEN** sprites, particles, filters, shaders, Canvas/WebGL/WebGPU rendering, or high object counts require a dedicated 2D renderer
- **THEN** the pipeline SHALL route through the official PixiJS v8 skill suite
- **AND** change `motion.md` SHALL define temporal semantics and reduced-motion substitution
- **AND** change `scene.md` SHALL define renderer, scene graph, lifecycle, ticker, asset,
  performance, accessibility, fallback, and cleanup ownership.

#### Scenario: Ordinary UI motion is requested

- **WHEN** semantic DOM, CSS, or the target repository's existing runtime can satisfy the change
- **THEN** the pipeline SHALL NOT select PixiJS only because the interface contains motion.

#### Scenario: PixiJS and a choreography runtime are combined

- **WHEN** PixiJS is used with CSS, WAAPI, Anime.js, or GSAP
- **THEN** `design.md`, `motion.md`, and `scene.md` SHALL assign non-overlapping render, property,
  clock, lifecycle, and cleanup ownership.

### Requirement: Graphics capabilities are stable before adapters

The pipeline SHALL classify a graphics, game, data, geospatial, GPU, or narrative surface by a
durable capability family before selecting a library, skill, MCP host, or framework adapter.

#### Scenario: A project already has a suitable renderer

- **WHEN** the accepted project runtime satisfies the selected capability, accessibility, and
  performance contract
- **THEN** the pipeline SHALL preserve it rather than add another adapter only because a companion
  skill exists.

#### Scenario: A scene runtime is selected

- **WHEN** persistent spatial state, cameras, coordinates, assets, input, a render/game loop,
  physics, procedural state, or save/load lifecycle is required
- **THEN** the change SHALL include normative `scene.json`
- **AND** 3D families SHALL include `3d.md` while persistent non-3D families SHALL include
  `scene.md`
- **AND** the selected projection SHALL bind `DESIGN.md` and `MOTION.md` semantics to one versioned
  adapter with explicit lifecycle, budgets, degradation, deterministic evidence, and cleanup
  ownership.

### Requirement: Frontend tools resolve through one executable plan

The pipeline SHALL join frontend-stack, governed tool, and graphics-runtime decisions into one
deterministic `design-pipeline.toolchain-plan.v1` before external tools are invoked.

#### Scenario: A frontend toolchain is resolved

- **WHEN** a valid request declares framework, brief, current/requested stack, capabilities, and an
  optional graphics family or adapter
- **THEN** `designer-pipeline toolchain resolve` SHALL emit the selected styling, UI library,
  graphics adapter, tools, probes, invocations, verification requirements, blockers, and hashes of
  every governing registry
- **AND** a catalog-only adapter or an adapter without a trusted `probe`, `plan`, `invoke`, and
  `verify` lifecycle SHALL block the unified plan rather than imply execution support.

#### Scenario: Tool availability is checked

- **WHEN** `designer-pipeline toolchain probe` evaluates a ready plan
- **THEN** it SHALL execute only bundled read-only probe commands with a timeout and bounded output
- **AND** it SHALL NOT install, update, download, or start the selected project runtime
- **AND** an unavailable required tool SHALL produce a blocked probe result.

#### Scenario: An external tool invocation completes

- **WHEN** the selected tool is invoked by the target project or agent host
- **THEN** the result SHALL use `design-pipeline.toolchain-receipt.v1`
- **AND** the receipt SHALL bind the plan hash, actual tool version, command, exit code, timestamps,
  artifact paths and hashes, and linked evidence receipts
- **AND** a complete receipt with a failed command or no evidence SHALL be invalid.

#### Scenario: Reflex selects the XY chart route

- **WHEN** framework is `reflex` and the requested graphics family is `vector-data`
- **THEN** the unified resolver SHALL select `reflex-xy`
- **AND** its lifecycle SHALL probe installed `xy` and `reflex` package metadata without importing
  or installing them
- **AND** the invocation SHALL remain owned by the target Reflex project.

### Requirement: Execution targets are routed and receipted before Builder work

The pipeline SHALL bind the resolved toolchain plan to an explicit execution target, branch,
owner, and literal project-relative file scope without implementing the external Builder itself.

#### Scenario: A clean frontend change is routed

- **WHEN** one ready execution slice requests `auto` mode from a clean attached Git branch
- **THEN** `designer-pipeline execution route` SHALL select `in-place`
- **AND** multiple clean slices SHALL select `sequential`
- **AND** required isolation or an already-dirty repository SHALL select a new `codex/*` worktree.

#### Scenario: A worktree is prepared and finalized

- **WHEN** a ready worktree plan is prepared
- **THEN** the worktree SHALL start from the bound base HEAD on the declared branch and root
- **AND** completion SHALL compare committed, staged, unstaged, and untracked files with the
  declared scopes
- **AND** only a successful, clean, in-scope result SHALL remove the worktree without force
- **AND** failure, dirtiness, scope escape, branch drift, or cleanup failure SHALL retain the
  worktree and prevent a complete receipt.

#### Scenario: Execution evidence is handed to the gate

- **WHEN** execution is finalized
- **THEN** `design-pipeline.execution-receipt.v1` SHALL bind both execution-plan and toolchain-plan
  hashes, target branch/root, base and final HEAD, invocation, changed files, evidence receipts,
  timestamps, blockers, and cleanup result.

### Requirement: Reference evidence selects the spatial route

The pipeline SHALL separate observed reference evidence from design treatment and runtime
implementation.

#### Scenario: A visual reference contains spatial evidence

- **WHEN** references show near/far scale, foreshortening, occlusion, volumetric containers,
  world-space UI, or camera-dependent perspective
- **THEN** `reference.md` SHALL classify the change as `3d` or `hybrid`
- **AND** `reference-evidence.json` SHALL separately record object dimensionality, camera model,
  interaction model, output surface, confidence, spatial cues, required artifacts, and approval
- **AND** the change SHALL require `scene.json` plus `3d.md`
- **AND** an actual-runtime graybox SHALL pass before bloom, glow, transparency, scanlines, or
  cinematic grading are treated as fidelity evidence
- **AND** camera navigation SHALL be required only when the approved interaction model is
  inspectable or navigable.

#### Scenario: A 3D reference is a locked cinematic frame

- **WHEN** object dimensionality is `3d`
- **AND** the camera is fixed
- **AND** the interaction model is `none`
- **THEN** the pipeline SHALL preserve the `3d` route
- **AND** it SHALL select the `fixed-camera-cinematic-3d` capability family
- **AND** it SHALL NOT require orbit, pan, dolly, or other end-user navigation.

#### Scenario: Spatial evidence contradicts a 2D route

- **WHEN** at least two strong spatial cues are present
- **AND** the route or object dimensionality is `2d`
- **THEN** `designer-pipeline reference check` SHALL fail before implementation.

#### Scenario: Reference-route approval is pending

- **WHEN** `reference-evidence.json` is schema-valid
- **AND** approval status is not `approved`
- **THEN** `designer-pipeline reference check` SHALL report `blocked`.

#### Scenario: A reference is cinematic but flat

- **WHEN** the observed evidence is limited to glow, blur, transparency, color grading, or scanlines
- **THEN** the pipeline SHALL NOT infer a 3D route without additional spatial evidence.

### Requirement: Change design owns screen-space presentation

Change `design.md` SHALL own visual language and screen-space UI and SHALL NOT silently own the 3D
world contract.

#### Scenario: A hybrid HUD is specified

- **WHEN** a change combines a 3D world with DOM or screen-space HUD
- **THEN** `design.md` SHALL define visual treatment, component semantics, safe areas, and
  screen-space hierarchy
- **AND** `3d.md` SHALL define projection, coordinates, geometry, lights, world-space UI, camera
  navigation, and spatial interaction.

### Requirement: Phaser is a native 2D game-engine route

The pipeline SHALL support Phaser v4 as a built-in routing contract independent of any community
skill pack or credentialed host.

#### Scenario: A complete browser 2D game runtime is justified

- **WHEN** scenes, cameras, scaling, game-loop ownership, input, audio, physics, assets, and game
  state must operate as one runtime
- **THEN** the pipeline SHALL select the Phaser route or preserve an equivalent accepted project
  engine
- **AND** change `scene.md` and `motion.md` SHALL remain authoritative over runtime APIs.

#### Scenario: An optional Phaser host or community pack is unavailable

- **WHEN** the official credentialed MCP is not configured or a community pack lacks verified
  licensing
- **THEN** local Phaser routing SHALL remain available from the built-in contract and official
  documentation
- **AND** the unavailable or unverified surface SHALL NOT be automatically installed or required.

### Requirement: XY is a native Python charting route

The pipeline SHALL support XY as a built-in `vector-data` routing contract for Python charts,
notebooks, static exports, Reflex applications, and large datasets without automatically installing
or vendoring its runtime.

#### Scenario: XY is justified by the target surface

- **WHEN** the project uses Python and requires interactive charts, notebook display, Reflex
  integration, static chart export, or screen-bounded rendering for large datasets
- **THEN** the pipeline SHALL select `reflex-xy` or preserve an equivalent accepted project runtime
- **AND** the target project SHALL pin the selected pre-1.0 version and verify its actual output,
  accessibility, performance, CSP, and hosting boundaries.

#### Scenario: Interactive XY cannot provide a complete semantic path

- **WHEN** WebGL, the Python host, direct-point keyboard navigation, or aggregated-bin navigation is
  unavailable or incomplete for the required user path
- **THEN** the product SHALL provide a tested static export and semantic data table or equivalent
  accessible representation
- **AND** the pipeline SHALL NOT treat XY's built-in routing contract as proof that its runtime is
  installed or that the chart is accessible.

### Requirement: Narrative game UI preserves product state semantics

The pipeline SHALL support HUD, menu, dialogue, visual-novel, and Galgame surfaces without binding
product state to animation timing.

#### Scenario: Dialogue and choice UI is implemented

- **WHEN** the surface includes dialogue, choices, backlog, skip, autoplay, save/load,
  localization, character layers, or CG state
- **THEN** those states SHALL be represented as deterministic data and explicit transitions
- **AND** keyboard operation, readable text, focus, announcements, reduced motion, and recovery
  SHALL remain available even when the scene renderer or animation adapter is degraded.

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

### Requirement: Static reference fidelity is explicit and non-downgradable

The pipeline SHALL distinguish a primary reconstruction target from a constraint or inspiration,
and SHALL preserve requested fidelity independently from effective fidelity.

#### Scenario: The user requests an identical result from a supplied image

- **WHEN** the user requests identical, exact, 1:1, pixel-accurate, cloned, reproduced, or faithful
  output from a supplied still image
- **THEN** `reference-evidence.json` SHALL use `primary-target` and `exact-reconstruction`
- **AND** the pipeline SHALL NOT generate alternative design directions
- **AND** exact fidelity SHALL NOT become adaptive or directional without explicit user approval.

#### Scenario: Exact reference geometry is prepared

- **WHEN** an exact or adaptive static-reference implementation is about to begin
- **THEN** the pipeline SHALL rectify the source into a canonical front view
- **AND** SHALL record a canonical elevation, locked camera/lens/viewport, distributed
  source/render landmarks, and overlay evidence in `reconstruction.json`
- **AND** `designer-pipeline reconstruction check --stage geometry` SHALL independently recompute
  landmark error and block material or cinematic polish until it reports `ready`.

#### Scenario: Exact reference completion is claimed

- **WHEN** a static-reference reconstruction is submitted as complete
- **THEN** an independent EvidencePort SHALL provide reference, implementation, and diff images,
  required comparison capabilities, a successful probe, and a receipt bound to all three hashes
- **AND** `designer-pipeline reconstruction check --stage final` SHALL distinguish missing evidence
  as `blocked` from measured threshold misses as `fidelity-limited`
- **AND** neither result SHALL be described as exact, identical, pixel-perfect, or complete.

### Requirement: Website-cloning requests use a focused superset module

The pipeline SHALL route authorized live-page clone, rebuild, reproduction, and reverse-engineering requests to a progressively disclosed module that preserves all existing design-pipeline gates.

#### Scenario: User supplies a primary live URL

- **WHEN** the user asks for a high-fidelity implementation of a live page
- **THEN** the pipeline SHALL initialize an isolated, resumable target and SHALL preserve the target project's established framework and conventions.

### Requirement: Site-wide cloning separates templates from data

The pipeline SHALL ship a pinned, MIT-attributed `hi5jeff/deepclonewebsite` feature-slice snapshot
as passive reference material and SHALL adapt its site-wide mechanics through the existing
Browser/Builder/Evidence ports without adding the Open Lovable runtime.

#### Scenario: An authenticated surface is in scope

- **WHEN** authorized capture requires login
- **THEN** BrowserPort SHALL use a user-visible browser for the user-controlled login step
- **AND** credentials, profiles, and storage state SHALL remain ignored runtime material rather than
  design, package, or repository artifacts.

#### Scenario: The user needs site structure rather than repeated data

- **WHEN** capture mode is `structure`
- **THEN** discovery SHALL stay within explicitly allowed hosts and finite limits
- **AND** SHALL group normalized URLs using rendered template evidence such as URL patterns and DOM
  fingerprints before selecting representative pages
- **AND** an LLM MAY label or merge deterministic groups but SHALL NOT invent captured pages,
  assets, states, or measurements.

#### Scenario: Every authorized page is required

- **WHEN** capture mode is `full`
- **THEN** the user SHALL have explicitly requested whole-site coverage
- **AND** allowed hosts, exclusions, page/depth/asset limits, and stop conditions SHALL be recorded
  before navigation.

#### Scenario: Product or backend documentation is inferred

- **WHEN** visible UI evidence is used to produce product structure, data model, backend API, or
  design-system documents
- **THEN** every output SHALL cite observed evidence, label inference and confidence, and list
  unknowns
- **AND** it SHALL NOT be presented as recovered backend truth.

#### Scenario: The bundled feature slice drifts

- **WHEN** a reviewed source file is missing, added, or normalized-content altered
- **THEN** deterministic verification SHALL block on file count, normalized byte count, or canonical
  tree hash
- **AND** a valid update SHALL change revision, Git tree, scope, attribution, and hash together.

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

#### Scenario: Existing feedback JSON is corrupt

- **WHEN** a matching observation or the feedback index cannot be parsed or validated
- **THEN** recording SHALL fail with a contextual error and SHALL NOT overwrite or increment the
  existing observation.

### Requirement: Specific paths are redacted first

The recorder SHALL redact longer path scopes before their parent scopes so nested feedback roots
retain the correct privacy placeholder.

#### Scenario: Feedback root is nested under the project root

- **WHEN** evidence contains the exact nested feedback root
- **THEN** it SHALL be represented as `<FEEDBACK_ROOT>` rather than a partial
  `<PROJECT_ROOT>` path.

### Requirement: Capability registry patterns are validated before evaluation

Self-check SHALL reject invalid profile, requirement, or regular-expression structures before
producing compatibility results.

#### Scenario: A registry pattern is invalid

- **WHEN** a capability requirement contains an invalid regular expression
- **THEN** self-check SHALL fail with the profile and requirement identity instead of reporting a
  false compatibility result.

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

#### Scenario: Palette evidence is submitted

- **WHEN** a target submits palette evidence
- **THEN** its paths SHALL be relative to the target research directory, identify existing files,
  and remain contained after symlinks or directory junctions are resolved
- **AND** palette evidence SHALL reject unknown fields
- **AND** semantic roles and target tokens SHALL form a connected mapping.

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

- **WHEN** CSS, WAAPI, Anime.js, GSAP, PixiJS, Phaser, Three.js, Babylon.js, PlayCanvas, SVG, Canvas, WebGL, or WebGPU is chosen
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

### Requirement: Design-system knowledge is normalized and searchable

The pipeline SHALL normalize supplied or bundled design-system snapshots into a deterministic,
namespaced catalog covering components, hooks, templates, and documentation. Entries SHALL retain
license, source, revision, rich usage guidance, states, props, theming, localized/dense forms, and
content hashes when upstream provides them.

#### Scenario: An agent needs a reusable component pattern

- **WHEN** the agent searches by query, kind, category, or stability status
- **THEN** the CLI SHALL return deterministic local catalog results without executing provider code
- **AND** Astryx entries SHALL remain attributed candidate knowledge rather than project authority.

#### Scenario: A snapshot is malformed or active

- **WHEN** the snapshot has an unknown schema/version, duplicate ID, escaping path, executable
  value, prototype-pollution key, or tampered entry hash
- **THEN** normalization SHALL fail closed before writing output
- **AND** no network, install, import, or project mutation SHALL occur.

### Requirement: Component sources route by capability and platform

The pipeline SHALL expose a deterministic component route over attributed source metadata. A route
SHALL match the requested capability to a compatible platform, report the integration mode and
provenance, and preserve a project-owned fallback when a source is unavailable, unverified, or
license-gated.

#### Scenario: A project needs a component from a referenced source

- **WHEN** `design-system route` receives a product brief and target platform
- **THEN** it SHALL return the recognized capabilities, one best compatible route per capability,
  alternatives, source URL, license, and fallback information
- **AND** it SHALL be deterministic without executing or importing remote source code.

#### Scenario: A route is commercial, user-supplied, or unverified

- **WHEN** the selected source requires a license or its source evidence is not verified
- **THEN** the route SHALL report `review`
- **AND** it SHALL NOT claim that the source is installable or copy its implementation.

#### Scenario: No compatible route exists

- **WHEN** no catalog entry advertises a requested capability on the target platform
- **THEN** the route SHALL report the unavailable capability and use `blocked` only when no
  recognized capability has a selected route.

#### Scenario: A local component snapshot provides concrete implementation candidates

- **WHEN** a web brief matches a catalog source with a local component inventory, such as SmoothUI
- **THEN** the route SHALL expose the inventory count, recommended component names, documentation
  URLs, and the source's registry installation template
- **AND** the route SHALL remain deterministic without fetching a live API or vendoring source.

### Requirement: Astryx knowledge is bundled but runtime adoption is optional

The package SHALL include an inert, MIT-attributed snapshot of the pinned stable public Astryx
surface. Private, charts, lab, Vega, canary, and other non-stable package surfaces SHALL remain
excluded from the default catalog.

#### Scenario: Astryx is unavailable or incompatible in a target project

- **WHEN** the local Astryx CLI is absent or React, React DOM, or StyleX constraints do not match
- **THEN** bundled search and reference use SHALL remain available
- **AND** runtime adoption SHALL remain blocked without changing the target project.

### Requirement: Provider acquisition is bounded and read-only

Live design-system acquisition SHALL execute only an explicit root-contained local adapter or the
bundled Astryx adapter against an existing root-contained Astryx CLI. The runner SHALL use a fixed
read-only command allowlist, bounded timeout and output, no shell, a credential/proxy-stripped
environment, validated JSON envelopes, atomic contained output, and a hash-bearing receipt.

#### Scenario: A provider requests a mutating or escaping operation

- **WHEN** the operation is install, init, swizzle, upgrade, theme build, agent-instruction
  injection, or references a path outside the root
- **THEN** the request SHALL be denied before provider execution or output mutation
- **AND** the failure SHALL remain machine-readable.

### Requirement: Token projection and adoption decisions preserve loss and authority

Provider tokens SHALL project to the public DTCG-compatible token contract with light/dark modes,
semantic roles, source hashes, and explicit loss reporting. Adoption SHALL use a deterministic
`reference`, `adopt`, `substitute`, or `custom` decision and SHALL keep the validated project
DESIGN/system as project authority.

#### Scenario: Runtime adoption is requested

- **WHEN** `adopt` or `substitute` is selected
- **THEN** React, React DOM, and StyleX constraints SHALL be compatible and adapter intake SHALL be
  admitted before the decision reports ready
- **AND** the evaluator SHALL never install packages or modify project files.

#### Scenario: Token semantics cannot be preserved

- **WHEN** token type, role, path, mode, or value cannot be projected without interpretation
- **THEN** the projection SHALL report review or blocked with a loss item
- **AND** it SHALL NOT claim a lossless ready state.

### Requirement: Lifecycle state is versioned, atomic, and resumable

The pipeline SHALL use state/event v2 with a versioned phase registry, compare-and-swap mutation,
one-writer locking, crash-safe state/event commits, and explicit consistency diagnostics.

#### Scenario: Two agents attempt the same transition

- **WHEN** the second writer presents an obsolete state SHA-256
- **THEN** the mutation SHALL fail without changing state or events
- **AND** the caller SHALL reread current state before retrying.

#### Scenario: A v1 run is resumed

- **WHEN** either supported v1 state spelling is discovered
- **THEN** migration SHALL be deterministic and preserve unknown legacy fields
- **AND** no file SHALL change without explicit write authority and the expected source hash.

### Requirement: Scene runtime has a normative machine contract

Persistent spatial, engine-owned, GPU, or narrative runtime state SHALL use normative `scene.json`
plus a matching family-selected projection linked to DESIGN and MOTION foundation hashes. 3D
renderer, engine, and geospatial families SHALL use `3d.md`; other persistent families SHALL use
`scene.md`.

#### Scenario: Adapter availability is unknown

- **WHEN** a valid scene records honest `unknown`, `unavailable`, or `blocked` availability
- **THEN** the document SHALL remain representable without placeholder fabrication
- **AND** scene execution SHALL remain blocked.

### Requirement: The public CLI is a safe orchestration facade

The pipeline SHALL expose stable JSON results and exit semantics for lifecycle, foundation, scene,
evidence, motion/component, interoperability, benchmark, adapter, style-signal, and feedback gates.
All project paths SHALL remain below explicit `--root` after link resolution.

#### Scenario: A command receives an escaping artifact path

- **WHEN** a caller references an artifact outside `--root`
- **THEN** the command SHALL fail before reading or writing it
- **AND** the JSON error envelope SHALL remain machine-readable.

#### Scenario: Interaction output escapes through a default directory or report link

- **WHEN** the default or explicit interaction output directory, or its final report file, resolves outside `--root`
- **THEN** verification SHALL reject the destination before capture or writing the report
- **AND** no gate pass or external report SHALL be produced

#### Scenario: A destination contains an unresolved filesystem link

- **WHEN** a project destination contains a filesystem link whose target does not exist
- **THEN** the CLI SHALL reject it as an unresolved containment boundary before reading or writing that destination
- **AND** interaction verification SHALL NOT start capture or record a gate pass

### Requirement: Runtime evidence is explicit and adapter-neutral

Browser/tool adapters SHALL produce validated receipts with adapter identity, capability probe,
explicit status, artifact paths, hashes, redaction, and environment metadata. The kernel SHALL run
only an explicitly selected trusted local adapter with a bounded process environment and timeout.

#### Scenario: Exact evidence is incomplete

- **WHEN** any required artifact or measurement is missing
- **THEN** the receipt SHALL report partial, blocked, or unknown
- **AND** the pipeline SHALL NOT replace missing evidence with visual inference.

### Requirement: Motion and component states are executable gates

Non-trivial motion SHALL carry deterministic timing, cadence, interruption, long-frame, and
reduced-motion evidence. Reusable components SHALL cover required visual/input/viewport states.

#### Scenario: A component looks correct only at rest

- **WHEN** hover, focus, pressed, disabled, loading, empty, error, keyboard, touch, or required
  viewport evidence is absent
- **THEN** component verification SHALL fail or block
- **AND** a static screenshot SHALL NOT satisfy the missing states.

### Requirement: Component capability is resolved before framework provider selection

The pipeline SHALL express reusable component requirements through a governed, framework-neutral
capability IR. Dependency closure SHALL add required keyboard, focus, ARIA, state, and recovery
behavior before selecting any provider.

#### Scenario: The same data-grid requirement targets different frameworks

- **WHEN** Vue, React, Svelte, Solid, or project-owned DOM projects request the same filtering,
  sorting, pagination, and selection behavior
- **THEN** they SHALL share the same capability and verification contract
- **AND** framework libraries SHALL appear only in replaceable provider routes.

### Requirement: Component provider discovery is contained and non-mutating

Provider probing SHALL inspect existing project metadata without installing packages or rewriting
configuration. Resolution SHALL distinguish project-owned, installed, and adoption-required
candidate routes and SHALL report uncovered capabilities explicitly.

#### Scenario: A compatible provider is not installed

- **WHEN** Vuetify0, React Aria, Ark UI, or another provider is compatible but absent
- **THEN** it MAY be returned as an adoption-required candidate only when explicitly preferred
- **AND** the project-owned route SHALL remain available without hidden dependency mutation.

### Requirement: Component verification is provider-independent and hash-bound

Every resolved component capability SHALL produce required behavior checks. Verification SHALL
match the exact resolution hash and SHALL remain blocked when a required check is missing, failed,
or lacks evidence.

#### Scenario: Framework code exists without keyboard evidence

- **WHEN** the implementation uses a named component library but the keyboard check has no passing
  evidence
- **THEN** verification SHALL remain blocked
- **AND** library identity or a static screenshot SHALL NOT satisfy the behavior contract.

### Requirement: Design artifacts interoperate through public data contracts

Design tokens, UI IR, pattern catalog IDs, design-to-code mappings, and design-tool receipts SHALL
use strict machine-readable contracts with provenance and editable/source mappings where relevant.

#### Scenario: A hosted design tool is unavailable

- **WHEN** Figma, Penpot, Onlook, or another host cannot be used
- **THEN** local DESIGN/MOTION/tokens/UI IR workflows SHALL remain available
- **AND** the host SHALL be a replaceable adapter rather than a pipeline dependency.

### Requirement: Benchmarks preserve required failures

Generate, edit, and repair benchmarks SHALL cover responsive, accessibility, palette, motion,
scene, component-state, and evidence dimensions. A required failed or unknown scenario SHALL decide
the gate independently of the aggregate score.

#### Scenario: One required scenario fails under a high aggregate

- **WHEN** the aggregate passes but one required scenario fails
- **THEN** the benchmark SHALL fail
- **AND** the failure MAY be recorded through the redacted, deduplicated local feedback loop.

#### Scenario: Multiple design systems are compared

- **WHEN** a v2 benchmark evaluates Astryx, another library, or a custom system
- **THEN** identical prompts and environment class, blind evaluation, hidden private expectations,
  fresh contexts, and representative delivery SHALL all be verified
- **AND** any unverified fairness invariant SHALL block the benchmark rather than produce a score
- **AND** stable and prerelease system channels SHALL not be mixed unless the manifest records an
  explicit canary-mix allowance.

### Requirement: Adapter facts have one governed authority

The adapter registry SHALL be the sole authority for support, version policy, provenance, license,
security, host policy, evidence types, degradation, install eligibility, and benchmark admission.
Graphics catalogs SHALL reference registry IDs rather than duplicate facts.

#### Scenario: An unverified community adapter is proposed

- **WHEN** pinned revision/hash, license, maintenance, security, permission, or score provenance is
  absent or unverified
- **THEN** it SHALL NOT be promoted to native/companion or expose automatic installation
- **AND** intake SHALL keep benchmark admission blocked.

### Requirement: Release QA is hermetic and reproducible

Release QA SHALL prove manifest parity, syntax, complete tests, deterministic package bytes,
archive completeness, failure atomicity, isolated package installation, installed public CLI
behavior, and unchanged repository status. Long test batches SHALL expose progress before completion. CI SHALL exercise Windows path identity and storyboard regressions, with unavailable optional filesystem capabilities explicitly skipped.

#### Scenario: Packaging fails after a previous successful build

- **WHEN** a required resource is missing or invalid
- **THEN** packaging SHALL fail without corrupting the prior artifacts
- **AND** no source-tree mutation SHALL be introduced by QA.

#### Scenario: Full test batch is running

- **WHEN** the repository tests emit output before exiting
- **THEN** that output SHALL be visible through QA and available to the caller's redirected log
- **AND** a failed test batch SHALL still fail QA.

#### Scenario: Windows physical path spelling differs

- **WHEN** CI runs the Windows path-identity regression
- **THEN** it SHALL exercise a distinct spelling of the same physical root and reject a different physical identity
- **AND** absent optional filesystem capabilities SHALL be reported explicitly rather than counted as successful assertions.

### Requirement: Contribution standards

The repository SHALL document how contributors propose changes, reconcile the PR target and review scope before freezing a full-QA tree, validate changes with canonical maintenance commands, and handle external skill intake. Evidence SHALL identify its tested revision and SHALL NOT be presented as covering later integrated code without verification.

#### Scenario: Contributor proposes an external skill

- **WHEN** a contributor proposes a new external skill source
- **THEN** the contribution SHALL classify it using the curation policy outcomes before it can be accepted.

#### Scenario: Contributor prepares full QA

- **WHEN** a contributor prepares the publication tree for full QA
- **THEN** they SHALL fetch the intended PR target and review divergent commits and the proposed diff before freezing the tested revision
- **AND** contribution guidance and the PR template SHALL use `npm test` and `npm run specs:check`.

#### Scenario: Integration changes the tested code

- **WHEN** target-branch integration changes code after a successful full-QA run
- **THEN** the old full-QA result SHALL remain scoped to its tested revision
- **AND** verification of the integrated code SHALL be reported separately.

### Requirement: Security guidance

The repository SHALL document that secrets and private data must not be written into pipeline artifacts or QA evidence.

#### Scenario: Agent state captures a run

- **WHEN** `state.json`, `events.jsonl`, or `handoff.md` are written
- **THEN** they SHALL NOT include secrets, tokens, cookies, private credentials, or raw proprietary data.

### Requirement: Component requirements are framework-agnostic before provider selection

The pipeline SHALL express component behavior as governed capabilities and dependency closure before
selecting a framework or library provider.

#### Scenario: A user requests a selectable data table

- **WHEN** a brief requests filtering, sorting, pagination, and multiple selection
- **THEN** the inventory SHALL include those data and selection capabilities
- **AND** it SHALL add required keyboard, focus, ARIA, loading, empty, and error behavior.

### Requirement: Component providers are replaceable and non-mutating

Provider discovery SHALL inspect only existing project metadata. Resolution SHALL distinguish
project-owned, installed, and candidate routes and SHALL NOT install packages or rewrite project
configuration.

#### Scenario: Vuetify0 is installed in a Vue project

- **WHEN** Vuetify0 covers a requested capability
- **THEN** it SHALL be preferred over a project-owned custom implementation
- **AND** uncovered states SHALL retain an explicit fallback rather than being reported as covered.

#### Scenario: A compatible provider is not installed

- **WHEN** it is explicitly preferred
- **THEN** the route SHALL record that adoption is required
- **AND** resolution SHALL NOT execute a package manager.

### Requirement: Component verification is behavior- and evidence-based

Verification SHALL be bound to the exact resolution hash. Every required behavior check SHALL pass
with non-empty evidence before the result can be verified.

#### Scenario: A component looks correct but has no keyboard evidence

- **WHEN** the required keyboard check is absent, missing, or failed
- **THEN** component verification SHALL remain blocked
- **AND** framework source code or a static screenshot SHALL NOT fill the missing evidence.

### Requirement: DESIGN.md synthesis is requirement-driven

The pipeline SHALL synthesize a project-specific `DESIGN.md` from product intent, repository
constraints, and attributed evidence instead of copying a library template.

#### Scenario: A user provides a template example

- **WHEN** the template is registered as synthesis input
- **THEN** it SHALL have an inspiration-only evidence role and SHALL NOT override product
  requirements or the existing target system implicitly.

### Requirement: unresolved product decisions are interactive

The pipeline SHALL route material ambiguity through a grill-with-docs gate and persist its evidence.

#### Scenario: grill evidence is missing

- **WHEN** a run attempts scope assessment
- **THEN** the transition SHALL fail closed and preserve the current state.

### Requirement: oversized efforts use a real Wayfinder handoff

The pipeline SHALL calculate scope against an explicit budget and require a configured host map for
oversized efforts.

#### Scenario: scope exceeds the session budget

- **WHEN** the deterministic scope score exceeds the budget
- **THEN** the run SHALL record scope surprise, request Wayfinder, and SHALL NOT fabricate a local
  issue map.

### Requirement: synthesis resumes into implementation

The pipeline SHALL validate the generated `DESIGN.md` and transition the active change back into the
normal implementation phase.

#### Scenario: a valid project DESIGN.md is accepted

- **WHEN** its structure and provenance satisfy the synthesis gate
- **THEN** state, events, handoff, and tasks SHALL point to implementation as the next action.

### Requirement: change design and product design remain distinct

The pipeline SHALL keep lowercase change `design.md` and project-root `DESIGN.md` as separate linked
artifacts.

#### Scenario: both files exist

- **WHEN** another agent resumes the run
- **THEN** the handoff SHALL identify which file defines the current change and which defines
  reusable product identity.

### Requirement: Structural proof precedes optical treatment on every route

The pipeline SHALL require a layout-only graybox capture and a recorded structural comparison before
materials, glow, bloom, depth of field, scanlines, or cinematic grading are authored, on every route
and in every fidelity mode.

#### Scenario: A flat or planar reference route

- **WHEN** the selected route is `2d` or `2.5d`
- **AND** a `reference-evidence.json` exists for the change
- **THEN** `designer-pipeline reconstruction check --stage graybox` SHALL be required
- **AND** it SHALL report `blocked` until a graybox capture and structural comparison exist
- **AND** optical treatment SHALL NOT be authored while it reports `blocked`.

#### Scenario: The source raster is unavailable

- **WHEN** the reference source is not a resolvable file
- **AND** the measured geometry stage therefore cannot run
- **THEN** the graybox stage SHALL still be required
- **AND** its comparison mode SHALL be recorded as `qualitative`
- **AND** a `qualitative` graybox SHALL NOT be accepted as fidelity evidence.

#### Scenario: A capture claims suppression without a declared mode

- **WHEN** a graybox capture is submitted
- **AND** the change declares no runtime graybox mode that disables emissive, optical, and texture
  layers
- **THEN** the graybox stage SHALL report `blocked`.

### Requirement: Reconstruction stages are reported independently

The pipeline SHALL report the graybox, geometry, and final stages as separate results and SHALL NOT
infer one stage's status from another.

#### Scenario: Geometry is blocked but graybox passed

- **WHEN** the geometry stage is `blocked` on a missing source raster
- **AND** the graybox stage is `ready`
- **THEN** the reported result SHALL show both statuses separately
- **AND** the change SHALL be permitted to continue into optical treatment.

#### Scenario: Both stages are blocked

- **WHEN** the geometry stage is `blocked` on a missing source raster
- **AND** the graybox stage is also `blocked`
- **THEN** `qa.md` SHALL record the graybox blocker as a process gap rather than an environmental
  limitation.

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

### Requirement: Repository QA validates distributable skill metadata

The repository QA SHALL fail when `skill/SKILL.md` is missing valid `name` or `description` frontmatter.

#### Scenario: Skill frontmatter is missing

- **WHEN** `node scripts/qa.cjs` runs
- **THEN** it SHALL report a failure for missing or invalid `skill/SKILL.md` frontmatter.

### Requirement: Repository QA validates skill references

The repository QA SHALL check that referenced `references/*` and `scripts/*` files exist.

#### Scenario: Referenced skill file is missing

- **WHEN** a skill document references a missing file
- **THEN** `node scripts/qa.cjs` SHALL fail and report the missing reference.

### Requirement: Local install script uses `CODEX_SKILLS_DIR` as a skills root

The local install script SHALL interpret `CODEX_SKILLS_DIR` as the directory containing skill folders.

#### Scenario: User installs to a temporary skills root

- **WHEN** `CODEX_SKILLS_DIR=/tmp/skills node scripts/install-local.cjs` runs
- **THEN** the skill SHALL be installed to `/tmp/skills/design-pipeline`.

### Requirement: Repository distributes the skill under `skill/`

The repository SHALL place the distributable Codex skill under `skill/`.

#### Scenario: User installs from repository

- **WHEN** a user copies `skill/*` into their Codex skill root
- **THEN** `design-pipeline` SHALL be installable without copying `openspec/`.

### Requirement: Repository includes OpenSpec source of truth

The repository SHALL include `openspec/project.md`, `openspec/specs/`, and `openspec/changes/`.

#### Scenario: Maintainer reviews project direction

- **WHEN** a maintainer needs the durable product contract
- **THEN** they SHALL read `openspec/specs/design-pipeline/spec.md`.

### Requirement: Executable control plane

The pipeline SHALL expose versioned machine contracts and deterministic CLI validators for state,
Scene Runtime, evidence, motion/component states, tokens/UI IR/source maps, benchmarks, adapters,
design-tool receipts, intake, and style signals.

#### Scenario: Optional integration availability is unknown

- **WHEN** a requested host adapter is not explicitly configured and cannot be successfully probed
- **THEN** the pipeline SHALL return `unknown`
- **AND** it SHALL NOT resolve ambient modules, download dependencies, fabricate evidence, or claim
  installed support.

#### Scenario: Optional integration is configured but unavailable

- **WHEN** a requested host adapter is explicitly configured and its probe confirms that it cannot
  execute
- **THEN** the pipeline SHALL return `blocked`
- **AND** it SHALL NOT resolve ambient modules, download dependencies, fabricate evidence, or claim
  installed support.

#### Scenario: Existing state is resumed

- **WHEN** either supported v1 state dialect is read
- **THEN** status SHALL be inspectable without mutation
- **AND** mutation SHALL require deterministic explicit migration with crash-safe write semantics.

### Requirement: Component-first conformance has layered deterministic boundaries

The pipeline SHALL expose synchronous `checkComponentFirstGate()` and aggregate/stage CLI commands
through a thin facade. Filesystem, path, hash, PNG, and existing-core work SHALL occur only in
adapters. Stack/runtime, component contract, Playground, page usage, and evidence gates SHALL be
pure, SHALL NOT import one another, and SHALL return one versioned GateResult shape. The
orchestrator SHALL resolve context once and the serializers SHALL contain no domain decisions.

#### Scenario: Independent requirements fail

- **WHEN** multiple independently evaluable component-first requirements are unmet
- **THEN** every independent finding SHALL be collected in stable gate and reason-code order
- **AND** invalid SHALL take precedence over blocked, and blocked over passed
- **AND** an invalid dependency SHALL mark only dependent work `not_evaluated`.

### Requirement: Component-first v1 preserves explicit component and readiness semantics

The v1 policy SHALL require the five baseline roles `action`, `form-control`, `selection`,
`overlay`, and `feedback`, while keeping route-specific page requirements separate. Component
origin SHALL be modeled independently from runtime stack. A project-owned component SHALL NOT pass
without source, symbol, contract, token, keyboard, focus, state, Playground, and page-use evidence.
Readiness SHALL contain both level and prototype/production scope.

#### Scenario: Prototype evidence is evaluated for a production target

- **WHEN** a sandbox reaches `page-ready` with `scope: prototype`
- **AND** the target requires production readiness
- **THEN** the page gate SHALL remain blocked
- **AND** it SHALL NOT reinterpret the prototype receipt as production evidence.

### Requirement: Component-first evidence is externally produced and byte-verified

Component-first gates SHALL NOT execute a browser or target project. An adapter SHALL read external
evidence, verify contained paths and actual byte hashes, and fully decode PNG screenshots before a
pure gate evaluates them. Hash binding SHALL be documented as mismatch/staleness protection, not
producer authenticity.

#### Scenario: A file only has a PNG suffix

- **WHEN** screenshot bytes cannot be completely decoded as PNG
- **THEN** the evidence gate SHALL return invalid with a stable reason code
- **AND** the aggregate SHALL exit `1` without browser execution or state mutation.

### Requirement: Component-first stage commands are read-only compatibility surfaces

The CLI SHALL provide `component-first check|stack|components|playground|page` and SHALL keep
`high-fidelity check` as an aggregate delegation alias. Stage JSON SHALL use
`component-first-stage-result.v1`. Exit codes SHALL be `0` passed, `1` invalid, and `2` blocked.

#### Scenario: A stage is blocked

- **WHEN** a valid stage input lacks required conformance evidence
- **THEN** the command SHALL write its versioned result to stdout and exit `2`
- **AND** it SHALL NOT write pipeline state, generate browser evidence, or install dependencies.

### Requirement: Project design foundation is mandatory

The pipeline SHALL require a reusable project `DESIGN.md` before any implementation stage begins.

#### Scenario: Foundation is missing

- **WHEN** a pipeline run cannot find project `DESIGN.md`
- **THEN** it SHALL report `synthesis-required`
- **AND** route through requirements-driven synthesis before implementation

#### Scenario: Foundation is invalid

- **WHEN** project `DESIGN.md` lacks required structure or source decisions
- **THEN** the pipeline SHALL fail closed
- **AND** SHALL NOT treat change-level lowercase `design.md` as a substitute

#### Scenario: Foundation is ready

- **WHEN** project `DESIGN.md` passes structure, provenance, and containment validation
- **THEN** the pipeline MAY continue into implementation
- **AND** change artifacts SHALL link or specialize the project foundation

### Requirement: Website-cloning completion preserves declared implementation authority

The pipeline SHALL require a machine-readable implementation-authority contract before a website-cloning evaluator can mark a run complete. The contract SHALL identify the normative target, enumerate allowed implementation differences and protected invariants, and declare the required interaction evidence environment.

#### Scenario: A local template and a content source have different authority

- **WHEN** the user designates one target as the component, topology, responsive, or motion authority and another target as a content source
- **THEN** the manifest SHALL identify the template target as implementation authority
- **AND** the evaluator SHALL block completion when that target is absent, demoted, or contradicted by verification evidence.

#### Scenario: Adaptive fidelity permits only named differences

- **WHEN** an implementation-authority contract allows copy, route, palette, or asset differences
- **THEN** verification SHALL enumerate observed differences and protected invariants
- **AND** the evaluator SHALL classify an unapproved difference or unverified invariant as a measured fidelity mismatch rather than silently accepting adaptive mode.

#### Scenario: Actual-browser interaction evidence is required

- **WHEN** the implementation-authority contract requires an actual-browser replay
- **THEN** verification SHALL record the interaction environment, replay result, and evidence paths
- **AND** headless, simulated-event-only, or missing replay evidence SHALL keep the run blocked.

### Requirement: Companion self-check covers the design profile

The design-pipeline self-check MUST detect the companion set when installed via the team `design` profile and detect bundled Taste through the required core package. Missing optional companions remain fallback-safe; missing required `design-pipeline` resources still fail the check.

#### Scenario: The full design profile is installed

- **WHEN** self-check runs with every companion listed below installed
- **THEN** it SHALL detect every companion in its corresponding capability group
- **AND** the required core pipeline check SHALL pass.

**Visual taste**

- `frontend-design`
- `ui-ux-pro-max`
- `web-design-guidelines`
- `emil-design-eng`
- The complete Taste-Skill suite is built into `design-pipeline`; a separate `design-taste-frontend` installation is not required.

**Motion design**

- `design-motion-principles` (source: `kylezantos/design-motion-principles`)
- `animation-vocabulary`
- `review-animations`
- `apple-design`
- `vercel-react-view-transitions`

**Animation implementation**

- All `gsap-*` skills from `greensock/gsap-skills`
- `animejs` from `BowTiedSwan/animejs-skills`

**React / Next.js**

- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `next-dev-loop`
- `next-cache-components-adoption`
- `next-cache-components-optimizer`

**Matt Pocock**

- `codebase-design`
- `grill-with-docs`
- `implement`
- `matt-tdd` (local rename of `tdd`)
- `matt-code-review` (local rename of `code-review`)

#### Scenario: An optional companion is missing

- **WHEN** one or more optional companions are unavailable
- **THEN** self-check SHALL report `WARN`, identify the missing capability or marker, preserve the documented fallback, and remain usable
- **AND** a missing required `design-pipeline` skill SHALL still fail the check.

#### Scenario: Ambient Taste skills are absent

- **WHEN** a complete packaged pipeline is installed in an otherwise empty skill root
- **THEN** its existing visual-direction profile SHALL check the built-in Taste entry
- **AND** it SHALL NOT request an external Taste installation to provide that coverage.

### Requirement: Reference classification separates geometry, camera, interaction, and output

The pipeline SHALL record object dimensionality, camera model, interaction model, and output surface
as separate decisions before implementation.

#### Scenario: Fixed-camera cinematic 3D

- **WHEN** a reference contains authored 3D geometry under a fixed perspective camera
- **AND** the final surface exposes no camera navigation
- **THEN** the route SHALL remain 3D
- **AND** the runtime family SHALL be `fixed-camera-cinematic-3d`

### Requirement: Spatial evidence is machine-checkable

The pipeline SHALL validate a `reference-evidence.json` artifact and reject a 2D classification when
multiple strong spatial cues are recorded.

#### Scenario: Spatially contradictory 2D route

- **WHEN** at least two of thickness, occlusion, contact shadows, bevel highlights, perspective
  convergence, or depth of field are present
- **AND** the selected route or object dimensionality is 2D
- **THEN** reference validation SHALL fail with a spatial-route contradiction

### Requirement: Reference approval blocks implementation

The pipeline SHALL report schema-valid reference evidence as blocked until explicit approval is
recorded.

#### Scenario: Approval is pending

- **WHEN** reference evidence is valid
- **AND** approval status is `pending`
- **THEN** `reference check` SHALL exit with blocked status

### Requirement: 3D work proves geometry before polish

Every 3D route SHALL declare `reference.md`, `scene.json`, `3d.md`, and `graybox.png`.

#### Scenario: Graybox evidence is absent

- **WHEN** a 3D route omits `graybox.png`
- **THEN** reference validation SHALL fail before material and optical polish

### Requirement: Design-system snapshots normalize as inert data

The pipeline SHALL accept `design-pipeline.design-system-snapshot.v1` artifacts and normalize them
into deterministic `design-pipeline.design-system-catalog.v1` artifacts without executing snapshot
content or mutating the input.

#### Scenario: The same supplied snapshot is normalized twice

- **WHEN** the same valid snapshot is normalized twice
- **THEN** both catalogs SHALL have the same canonical ordering, namespaced IDs, provenance, entry
  hashes, and serialized content
- **AND** the source snapshot SHALL remain unchanged.

#### Scenario: Snapshot content is unsafe

- **WHEN** a snapshot contains an unknown schema, executable value, cycle, prototype-pollution key,
  absolute path, parent traversal, duplicate namespaced ID, or invalid provenance
- **THEN** normalization SHALL fail closed
- **AND** no catalog SHALL be published.

### Requirement: Catalog search is pure and provider-neutral

`design-system search` SHALL filter a validated catalog by query, kind, category, and status without
mutating, executing, installing, or re-ranking entries by bundled-provider identity.

#### Scenario: An Agent searches a supplied catalog

- **WHEN** the Agent supplies a valid catalog and any supported search filters
- **THEN** the command SHALL return deterministic matching entries
- **AND** it SHALL NOT contact a provider, modify the catalog, or copy results into the UI pattern
  catalog.

### Requirement: Provider acquisition is explicit and locally bounded

`design-system acquire` SHALL invoke only the bundled read-only provider translator over an explicit
contained provider CLI path, or a caller-selected local adapter within the explicit working root,
through a supported provider profile/API version, and SHALL publish results only below the explicit
output root.

#### Scenario: The bundled Astryx translator is selected

- **WHEN** the caller supplies `--provider astryx`, an existing root-contained
  `--provider-cli-path`, a supported `--api-version`, and a contained `--output-root`
- **THEN** the bundled adapter SHALL translate only read-only manifest, component, docs, template,
  and hook JSON commands from the local Astryx CLI
- **AND** it SHALL validate provider identity, license, versioned JSON envelopes, content hashes,
  losses, and failures in a provider receipt.

#### Scenario: A reviewed custom adapter is supplied

- **WHEN** the caller supplies a root-contained `--adapter-path` instead of the bundled translator
- **THEN** the custom adapter SHALL be subject to the same command allowlist, envelope validation,
  timeout, output, provenance, and containment gates.

#### Scenario: Acquisition is not explicitly authorized

- **WHEN** neither a usable contained provider CLI path nor a custom local adapter is supplied, a
  path escapes the working root, the API version is unknown, the command is mutating, or canary is
  not explicitly allowed
- **THEN** acquisition SHALL fail closed
- **AND** it SHALL NOT discover an ambient executable, install a package, fetch a remote resource,
  or publish a partial successful snapshot.

#### Scenario: Provider documentation contains executable modules

- **WHEN** Astryx or another provider exposes `.doc.mjs`, integration, template, hook, codemod, or
  other executable modules
- **THEN** the Design Pipeline kernel SHALL treat them as non-executable provider content
- **AND** it SHALL NOT import or evaluate them to build the catalog.

### Requirement: Astryx is an optional attributed candidate profile

The built-in Astryx profile SHALL record official source identity, repository, MIT license,
supported provider API, compatibility constraints, and deny-by-default canary policy, but SHALL NOT
make Astryx a dependency or default project runtime.

#### Scenario: Astryx is absent

- **WHEN** Astryx is not installed or a local adapter is unavailable
- **THEN** `design-system profiles` SHALL still expose the candidate metadata
- **AND** the pinned inert snapshot, supplied-snapshot, requirements-only, project-owned, and custom
  workflows SHALL remain available
- **AND** the pinned snapshot SHALL NOT be described as a live view of local or upstream state.

#### Scenario: Profile license conflicts with adapter output

- **WHEN** an adapter reports a license or provider identity that conflicts with the selected
  profile
- **THEN** acquisition SHALL fail
- **AND** the output SHALL NOT be eligible for adoption.

### Requirement: Token projection preserves provenance and loss

`design-system project-tokens` SHALL project representable provider tokens into
`design-pipeline.design-tokens.v1` and SHALL return a
`design-pipeline.design-system-token-projection.v1` artifact with explicit loss.

#### Scenario: Token semantics are not fully representable

- **WHEN** a token type, semantic role, mode, or normalized path cannot be mapped without ambiguity
- **THEN** the projection SHALL record a `review` or `blocked` loss with code, path, and message
- **AND** it SHALL NOT invent semantic certainty or report `ready` while blocking loss remains.

#### Scenario: A projected token is representable

- **WHEN** source value, type, semantic role, and modes can be represented safely
- **THEN** the projection SHALL preserve source identity, license, source hash, and representable
  mode metadata
- **AND** the emitted token artifact SHALL pass the existing token validator before `ready`.

### Requirement: Runtime use is an explicit four-mode decision

`design-system decide` SHALL record exactly one of `reference`, `adopt`, `substitute`, or `custom`
in `design-pipeline.design-system-decision.v1` with selected, rejected, rationale, and evidence
fields.

#### Scenario: A project already owns a design system

- **WHEN** the project has an existing design system or an authoritative `DESIGN.md` decision
- **THEN** the project-owned system SHALL remain the governing project authority
- **AND** `reference` MAY select provider evidence alongside that authority
- **AND** `adopt` or `substitute` MAY select a candidate only when the mode is explicit and all
  compatibility, intake, status, canary, and provenance gates pass.

#### Scenario: Adoption is requested

- **WHEN** `adopt` is requested
- **THEN** the candidate SHALL require compatible project runtime constraints and admissible intake
  evidence
- **AND** an incompatible, unverified, or unapproved-canary candidate SHALL be rejected with
  evidence.

#### Scenario: No candidate is eligible

- **WHEN** no candidate satisfies the selected mode, status, compatibility, intake, and canary
  constraints
- **THEN** the decision SHALL be `blocked`
- **AND** it SHALL NOT silently select Astryx or downgrade the requested mode.

### Requirement: Project design and motion foundations remain authoritative

Provider snapshots, catalogs, token projections, decisions, and benchmark results SHALL be
attributed evidence and SHALL NOT overwrite or supersede validated project `DESIGN.md` or
`MOTION.md`.

#### Scenario: Provider guidance conflicts with a project foundation

- **WHEN** provider docs, templates, tokens, or examples conflict with a validated project
  foundation
- **THEN** the project foundation SHALL remain authoritative
- **AND** the conflict SHALL be rejected, substituted, or recorded for review rather than applied
  implicitly.

### Requirement: The design-system CLI is Agent-discoverable and write-explicit

The public CLI help SHALL expose
`design-system profiles|normalize|acquire|search|project-tokens|decide` with stable JSON
envelopes, exit semantics, and the documented flag surface.

#### Scenario: A transform command omits write authority

- **WHEN** normalize, token projection, or decision receives `--output` without `--write`
- **THEN** the command SHALL return the validated artifact without writing it
- **AND** no existing file SHALL be modified.

#### Scenario: A write is explicit

- **WHEN** `--write` and a contained output path are both supplied
- **THEN** the command MAY publish the validated artifact atomically
- **AND** an escaping path or unsafe parent SHALL fail before replacement.

### Requirement: Benchmark v2 enforces candidate-neutral fairness

`benchmark evaluate` SHALL accept v1 inputs for compatibility and SHALL admit a v2 manifest only
when it affirms same prompts, same environment class, evaluator blindness, hidden expected answers,
fresh context, and representative delivery.

#### Scenario: All candidates receive equivalent evaluation

- **WHEN** Astryx, another provider, a substitute, and a custom system are compared
- **THEN** the same required scenarios, thresholds, evidence rules, environment class, and evaluator
  SHALL apply to every candidate
- **AND** bundled-profile identity SHALL NOT add score or admission privilege.

#### Scenario: Fairness is invalid

- **WHEN** any required v2 fairness condition is false, missing, or contradicted by evidence
- **THEN** evaluation SHALL NOT report `passed`
- **AND** the result SHALL preserve fairness validation and invalid reasons.

#### Scenario: Aggregate score hides a required failure

- **WHEN** an aggregate score passes but a required scenario fails or lacks evidence
- **THEN** the benchmark SHALL remain `failed` or `blocked` respectively
- **AND** canary results SHALL not be mixed into stable admission without explicit allowance.

### Requirement: Provider provenance and licenses remain auditable

Snapshots, catalog entries, provider receipts, token projections, and decisions SHALL preserve the
available source, provider version, license, attribution, and content-hash evidence needed to audit
their origin.

#### Scenario: Attribution is incomplete

- **WHEN** required source or license provenance is missing, conflicting, or unverifiable
- **THEN** normalization or acquisition SHALL fail, or the candidate SHALL remain ineligible for
  adoption
- **AND** a built-in profile SHALL NOT be treated as a license grant for unrelated third-party
  content.

### Requirement: Provider data cannot gain global instruction authority

The design-system workflow SHALL NOT inject provider content into `AGENTS.md` or another global
Agent instruction file.

#### Scenario: Provider content suggests instruction installation

- **WHEN** a provider manifest, document, template, hook, or adapter output requests instruction
  injection
- **THEN** the request SHALL be ignored or rejected
- **AND** provider discovery SHALL remain limited to the public CLI help and profile output.

### Requirement: Bundled Holosticker preserves executable capability boundaries

The pipeline SHALL ship every tracked file from one pinned, MIT-attributed `jal-co/holosticker`
revision as a byte-verified offline implementation source. It SHALL expose the holographic
material, die-cut mask, pointer tilt, peel/layers, static export, animated export, React component
export, and Studio settings as separately selectable capability slices.

#### Scenario: A holographic sticker is requested

- **WHEN** a change explicitly needs holographic foil, a die-cut sticker, pointer tilt, or peel
  behavior
- **THEN** the pipeline SHALL route the minimum matching local source files through the
  `scene-renderer-3d` family and project-pinned `threejs` adapter
- **AND** it SHALL require `scene.json`, `3d.md`, `motion.md`, accessible controls or static parity,
  reduced-motion behavior, cleanup ownership, performance budgets, and real-browser evidence.

#### Scenario: An optional output is not requested

- **WHEN** the selected capability does not require GIF/video, GLB, React component export, upload,
  or the full Studio UI
- **THEN** the pipeline SHALL not copy those modules or add their dependencies
- **AND** it SHALL preserve the target project's existing framework, controls, and Three.js
  version when they satisfy the contract.

#### Scenario: The bundled source snapshot drifts

- **WHEN** any tracked upstream file is missing, added, or byte-altered
- **THEN** deterministic verification SHALL block on file count, byte count, canonical tree hash,
  or missing capability source
- **AND** a valid update SHALL change revision, Git tree, version, inventory, attribution, and hash
  together.

### Requirement: Bundled interface discipline

The pipeline SHALL ship a complete, pinned, license-attributed interface-discipline source snapshot
as a core package resource. It SHALL apply that protocol to product UI, flows, shared
component/token changes, and interface reviews without depending on globally installed skills or
network access.

#### Scenario: Fresh standalone installation reviews UI

- **WHEN** a user installs only `design-pipeline` and starts product UI work
- **THEN** the package SHALL contain the interface router, six quality-domain skills, and
  change-scoped review skill with their supporting references
- **AND** the pipeline SHALL select full coverage by default, allowing quick coverage only for a
  narrow repair with documented scope.

#### Scenario: Changed UI is reviewed

- **WHEN** a change affects user-visible UI
- **THEN** Stage 0 SHALL identify affected flows, shared components/tokens, and consumers
- **AND** Stage 6 SHALL record review scope, domains, evidence, and every finding's
  `Introduced`, `Regression`, or `Pre-existing` status in `qa.md`.

#### Scenario: Source snapshot is changed

- **WHEN** the bundled interface source is updated or altered
- **THEN** its source revision, license, import scope, file count, and canonical tree hash SHALL be
  updated together
- **AND** a deterministic integrity test SHALL fail for a partial or byte-drifted snapshot.

### Requirement: Layered adaptation preserves frozen methodology and explicit authority

The pipeline SHALL keep the Methodology Kernel frozen during layered adaptation. The Kernel SHALL
remain the authority for durable method, quality gates, and safety boundaries. Task Session Policy
SHALL be ephemeral. Project Adaptation Skill and User Collaboration Skill SHALL be external,
versioned, inspectable artifacts. Project constraints and quality gates SHALL NOT be weakened,
suppressed, or bypassed by any adaptation layer.

#### Scenario: Conflicting scoped guidance is resolved

- **WHEN** a current task, project skill, user skill, and defaults offer conflicting compatible
  workflow choices
- **THEN** the resolver SHALL select the current-task value before project, user, and defaults
- **AND** mutually exclusive values SHALL be keyed by collaboration dimension rather than
  caller-defined rule id
- **AND** it SHALL preserve every applicable project constraint and Kernel quality gate
- **AND** it SHALL record dropped invalid or unsafe guidance in an inspectable receipt.

#### Scenario: Task guidance expires

- **WHEN** a task ends
- **THEN** its Task Session Policy SHALL cease to be effective
- **AND** it SHALL NOT become durable evidence or external-skill guidance without a separately
  evaluated candidate lifecycle.

### Requirement: Adaptation candidates are bounded, independently evaluated, and strictly promoted

Experience-derived adaptation SHALL create only bounded `add`, `replace`, or `delete` candidates
against an exact external-skill path, version, and incumbent content hash. Candidate guidance SHALL
select from a finite contract of collaboration dimensions and SHALL NOT contain free-form behavioral
instructions. The pipeline SHALL reject, revert, expire, or forget candidates that do not qualify.

#### Scenario: A candidate enters evaluation

- **WHEN** a bounded candidate is evaluated for promotion
- **THEN** the pipeline SHALL evaluate it independently on a held-out set and replay set against
  the incumbent using a pinned common manifest
- **AND** it SHALL promote only if all required gates pass, evidence is complete, and the
  predeclared primary metric is strictly improved in its declared direction against the incumbent
  in every required comparison.

#### Scenario: A candidate ties or lacks evidence

- **WHEN** either held-out or replay evaluation ties the incumbent, has partial/unknown evidence,
  fails a required gate, or shows a required regression
- **THEN** the candidate SHALL NOT promote
- **AND** the incumbent SHALL remain effective
- **AND** the receipt SHALL state the disposition and preserve a rollback/rejection audit record.

#### Scenario: A candidate strictly improves independently

- **WHEN** a bounded candidate passes every required gate and shows strict primary-metric
  improvement over the incumbent on both independently evaluated held-out and replay sets
- **THEN** the pipeline MAY create a new immutable external-skill version linked to the evidence
  receipt
- **AND** the prior version SHALL remain available for rollback
- **AND** an interrupted promotion or rollback SHALL deterministically recover from its durable
  prepare record without exposing mixed ledger and skill state
- **AND** a live process owner SHALL exclude competing recovery or mutation, while a dead owner's
  journal SHALL be safely recoverable.

### Requirement: Adaptation is transparent, user-controlled, and non-RL

The pipeline SHALL default to shadow learning: candidates may be recorded and evaluated but SHALL
NOT change live task behavior. Users SHALL be able to inspect candidate diffs, scope, evidence,
decision, and rollback target; reject candidates; and request scoped forgetting. The pipeline SHALL
NOT use reinforcement learning, model-weight training, hidden profiles, inferred personal traits, or
silent adaptation.

#### Scenario: A candidate is proposed under default settings

- **WHEN** task experience yields an adaptation candidate and the user has not explicitly enabled a
  reviewed version
- **THEN** the candidate SHALL remain shadow-only
- **AND** the current task's effective policy SHALL remain unchanged
- **AND** the user SHALL be able to review or reject it before any promotion or use.

#### Scenario: A user requests forgetting

- **WHEN** a user requests forgetting for a declared project or user scope
- **THEN** the pipeline SHALL remove the candidate or version from usable guidance, revoke its live
  selection, and retain only the minimum non-sensitive tombstone required for audit and prevention
  of accidental reinstatement
- **AND** if successor snapshots still contain that guidance, it SHALL require their safe rollback
  before scrubbing every rolled-back dependent snapshot
- **AND** it SHALL NOT alter the Methodology Kernel, project constraints, or shipped artifacts.

### Requirement: MengTo skills are completely internalized

The pipeline SHALL ship a complete, pinned, MIT-attributed `MengTo/skills` source tree and a
machine-readable catalog as core offline package resources.

#### Scenario: A design technique is needed offline

- **WHEN** the user has only the packaged design pipeline and requests a matching visual, motion,
  reference, WebGL, or game workflow
- **THEN** local search SHALL return candidates from all bundled skills with exact source paths
- **AND** the selected source SHALL be adapted through project DESIGN, MOTION, dependency, and QA
  contracts rather than copied as project authority.

#### Scenario: The upstream snapshot is partial or altered

- **WHEN** a tracked file is missing, added, or byte-drifted
- **THEN** deterministic verification SHALL block
- **AND** revision, Git tree, counts, and canonical hash SHALL be updated together for a valid sync.

#### Scenario: A bundled workflow crosses an authority boundary

- **WHEN** a skill involves credentials, paid services, private accounts, publication, social
  posting, or other external side effects
- **THEN** bundling SHALL NOT grant authority
- **AND** the workflow SHALL remain explicit-only and subject to normal host boundaries.

#### Scenario: Kage is used as a scroll-world reference

- **WHEN** a task cites the separately published `MengTo/kage` repository
- **THEN** the pipeline SHALL route through the bundled `web-design/build-threejs-scroll-worlds`
  playbook plus the clean-room Kage case study
- **AND** it SHALL preserve the current repository's no-license boundary by importing no source,
  font, generated image, foreground artwork, or other project asset.

### Requirement: DesignMD GitHub examples are internalized

The pipeline SHALL ship a pinned, MIT-attributed `dimabraven/design-md` source tree as an offline
example catalog. Directory ingest SHALL remain a separate live snapshot.

#### Scenario: Offline example search

- **WHEN** `designmd search` or `inspect` runs without a directory catalog
- **THEN** local search SHALL return bundled example DESIGN.md files with exact source paths
- **AND** every result SHALL remain `reference-only`
- **AND** the pipeline SHALL NOT install those files as a product `DESIGN.md`

#### Scenario: The bundled DesignMD snapshot drifts

- **WHEN** a tracked file is missing, added, or byte-altered
- **THEN** deterministic verification SHALL block
- **AND** revision, Git tree, counts, and canonical hash SHALL be updated together for a valid sync.

### Requirement: iart motion skills are internalized with activation boundaries

The pipeline SHALL ship pinned, MIT-attributed iart-ai motion-skill packs that include a LICENSE,
plus the index repository, as core offline package resources. Packs without a LICENSE SHALL be
recorded as excluded, not copied.

#### Scenario: A web-motion technique is needed offline

- **WHEN** the user has only the packaged design pipeline and requests a matching web, WebGL, or
  kinetic-typography workflow
- **THEN** local search SHALL return candidates from bundled automatic skills with exact source paths
- **AND** the selected source SHALL be adapted through project DESIGN, MOTION, dependency, and QA
  contracts rather than copied as project authority.

#### Scenario: A named motion-graphics domain is selected

- **WHEN** the user names a video, motion-graphics, Remotion, Manim, or After Effects domain
- **THEN** `iart route` SHALL return a selected playbook, ranked alternatives, and a runtime
- **AND** it SHALL NOT require the user to name a skill id
- **AND** the result SHALL remain a selection: not executable-ready and not an install grant
- **AND** HTML video SHALL default to the HyperFrames runtime unless Remotion, Manim, or After
  Effects was named.

#### Scenario: The iart snapshot is partial or altered

- **WHEN** a tracked file is missing, added, or byte-drifted, or a discovered SKILL.md is not
  catalogued
- **THEN** deterministic verification SHALL block
- **AND** pack revisions, counts, and canonical hash SHALL be updated together for a valid sync.

### Requirement: Bundled shadcnio component index preserves implementation authority

The pipeline SHALL ship the complete reviewed `shadcnio/react-shadcn-components` repository as a
pinned, MIT-attributed offline resource and expose its README component and hook entries through
deterministic local search. It SHALL distinguish the bundled index from linked webpage
implementation code that is not present in the source repository.

#### Scenario: A React component pattern is needed offline

- **WHEN** a change needs an AI-chat, button, hook, or text component pattern
- **THEN** local search SHALL return matching README entries with their source URLs and local source
  file
- **AND** every result SHALL be marked `reference-adaptation` and `review` with implementation
  license `unverified` until primary source evidence is recorded.

#### Scenario: The bundled source snapshot drifts

- **WHEN** its LICENSE or README is missing, added to, or byte-altered
- **THEN** deterministic verification SHALL block on file count, byte count, or canonical tree hash
- **AND** a valid update SHALL change revision, scope, index counts, attribution, and hash together.

#### Scenario: A linked implementation is selected

- **WHEN** a user selects a page linked by the README index
- **THEN** the pipeline SHALL NOT install dependencies, execute a generator, or copy webpage code
  solely because it was indexed
- **AND** it SHALL verify the linked implementation's license, dependencies, accessibility, and
  target-project fit before adaptation.

### Requirement: Source resolution is requested before reference artifacts are written

The pipeline SHALL resolve the reference source to a file path, or explicitly record it as pending,
before any reference or reconstruction artifact is authored.

#### Scenario: The reference is not a resolvable file

- **WHEN** a reconstruction request supplies a reference that is not a resolvable file path
- **THEN** the pipeline SHALL request a file path from the user before writing reference artifacts
- **AND** the request SHALL state that the path unlocks rectification, camera calibration, landmark
  error, and the fidelity receipt.

#### Scenario: The user does not supply a path

- **WHEN** the user cannot or does not supply a resolvable path
- **THEN** the pipeline SHALL record `source.availability` as `pending` and continue
- **AND** it SHALL NOT block all remaining work.

### Requirement: Missing measurement downgrades the claim, not the request

The pipeline SHALL treat an unavailable source as a limit on the verification claim and SHALL NOT
treat it as grounds to change requested fidelity.

#### Scenario: Progress pressure meets a missing source

- **WHEN** requested fidelity is `exact-reconstruction`
- **AND** the source is pending
- **THEN** the recorded verification claim SHALL be `unverified`
- **AND** requested fidelity SHALL remain `exact-reconstruction`
- **AND** a fidelity downgrade SHALL require explicit user approval recorded in the downgrade field.

#### Scenario: A pending source later lands

- **WHEN** `source.availability` is `pending`
- **AND** the user supplies a contained PNG path
- **THEN** `designer-pipeline reference resolve` SHALL set `availability` to `resolved`
- **AND** it SHALL fill `path`, `width`, `height`, and `sha256` from the file
- **AND** it SHALL record `resolvedAt`
- **AND** it SHALL keep `requestedFrom` and `requestedAt`.

#### Scenario: The run is reported

- **WHEN** a run completes with a pending source
- **THEN** the final report SHALL name the action that unlocks the measured gates.

### Requirement: Stage 0 dispatches through one job registry

The pipeline SHALL classify each brief into exactly one primary job from a versioned job registry
before opening a knowledge catalog. A new capability SHALL be added by registering a job, not by
adding another mandatory Stage 0 search.

#### Scenario: A clone brief is dispatched

- **WHEN** the brief asks to clone, rebuild, or 1:1 replicate a live page
- **THEN** `designer-pipeline route` SHALL select the website-clone job as the only primary
- **AND** other catalogs SHALL remain secondary or unused

#### Scenario: Two exclusive jobs tie

- **WHEN** an explicit job and another explicit job of equal score and priority both match
- **THEN** the route SHALL report `needs-clarification`
- **AND** it SHALL NOT pick a primary or search every catalog

#### Scenario: A new capability is registered

- **WHEN** a valid job object is added to the job registry
- **THEN** matching briefs SHALL route to that job without changing dispatcher source
- **AND** an invalid registry SHALL fail closed

#### Scenario: Kernel commands stay attached

- **WHEN** a route is `ready`
- **THEN** the result SHALL include foundation and toolchain kernel steps
- **AND** knowledge-catalog hits SHALL NOT become executable ready by being selected

### Requirement: A ready job route persists as a hash-bound plan

A `ready` result from `designer-pipeline route` SHALL be writable as
`design-pipeline.job-plan.v1`. The plan SHALL bind the query, job id, registry hash, route hash,
primary knowledge, secondaries, admission, kernel steps, next steps, and `planSha256`.

#### Scenario: A ready route is written

- **WHEN** `designer-pipeline route --query "<brief>" --write --output job-plan.json` classifies a
  unique primary job
- **THEN** the file SHALL use schema `design-pipeline.job-plan.v1`
- **AND** it SHALL contain `jobId`, `registrySha256`, `routeSha256`, `planSha256`, and frozen
  `primaryKnowledge.admission`
- **AND** `planSha256` SHALL be the SHA-256 of the canonical plan without that field

#### Scenario: A clarification cannot become a plan

- **WHEN** the route status is `needs-clarification` or `blocked`
- **AND** `--write` is requested
- **THEN** the command SHALL fail closed
- **AND** it SHALL NOT write a job-plan file

### Requirement: Toolchain and execution consume the job plan fail-closed

When a toolchain request or execution request includes `jobPlanSha256`, the consumer SHALL load
the plan, verify the hash, and refuse drift. Job id and toolchain `primaryRouteId` SHALL remain
distinct identifiers.

#### Scenario: Toolchain resolve binds a matching plan

- **WHEN** `toolchain resolve` is given a contained job plan whose hash matches `jobPlanSha256`
- **THEN** the toolchain plan SHALL record `jobId` and `jobPlanSha256`
- **AND** it SHALL NOT copy the job id into `primaryRouteId`

#### Scenario: A drifted job plan is rejected

- **WHEN** `jobPlanSha256` does not match the file
- **OR** the plan `jobId` does not match a supplied `jobId`
- **OR** the plan schema is not `design-pipeline.job-plan.v1`
- **THEN** toolchain or execution SHALL fail closed
- **AND** it SHALL NOT produce a ready plan or execution target

#### Scenario: Execution must carry the same job plan as toolchain

- **WHEN** the toolchain plan records `jobPlanSha256`
- **AND** the execution request omits it or supplies a different hash
- **THEN** `execution route` SHALL fail closed

#### Scenario: Callers without a job plan keep current behavior

- **WHEN** toolchain resolve or execution route is invoked without `jobPlanSha256`
- **THEN** existing hash and owner checks SHALL still apply
- **AND** the command SHALL NOT require a job plan

### Requirement: Selecting a job does not upgrade catalog admission

A job plan SHALL freeze the primary knowledge admission from the registry. Plan presence SHALL
NOT make an `inert`, `reference-only`, or `review` catalog executable-ready.

#### Scenario: An inert primary stays inert on the plan

- **WHEN** the classified job's `primaryKnowledge.admission` is `inert` or `reference-only`
- **THEN** the written plan SHALL record that same admission
- **AND** toolchain and execution SHALL NOT treat the plan as authority to execute that catalog

#### Scenario: The dispatcher does not search catalogs

- **WHEN** a job plan is written or consumed
- **THEN** the pipeline SHALL NOT search MengTo, Prism, Astryx, shadcnio, DesignMD, iart, or holosticker
  as a side effect of classify, write, or bind

### Requirement: Unmeasurable references are recorded, not omitted

The pipeline SHALL accept a schema-valid reference contract whose source is known but not resolvable
on disk, and SHALL distinguish that state from having no reference at all.

#### Scenario: The reference is supplied in conversation

- **WHEN** the user supplies a reference image that is not written to the repository
- **THEN** `reference-evidence.json` SHALL record `source.availability` as `pending`
- **AND** it SHALL record `pendingReason` and `requestedFrom`
- **AND** `sha256`, `width`, `height`, and `path` MAY be null
- **AND** route, classification, spatial cues, fidelity intent, required artifacts, and approval
  SHALL still be recorded.

#### Scenario: A pending source is checked

- **WHEN** `source.availability` is `pending`
- **AND** the contract is otherwise valid and approved
- **THEN** `designer-pipeline reference check` SHALL report `blocked` with reason `source-pending`
- **AND** the result SHALL NOT be reported as a contract failure.

### Requirement: A reconstruction spec is written against a render, not a reading

For a `primary-target` reference, the pipeline SHALL produce the graybox capture before change
`design.md` is authored.

#### Scenario: A primary-target reconstruction begins

- **WHEN** reference role is `primary-target`
- **THEN** the graybox capture SHALL be produced before change `design.md`
- **AND** `design.md` SHALL cite the capture it was written against.

### Requirement: Specified and implemented values are reconciled

Every change with a reference SHALL record the difference between the values written in
`design.md` and the values the implementation actually used.

#### Scenario: Reconciliation is absent

- **WHEN** a change has a reference
- **AND** `design.md` contains no reconciliation section
- **THEN** the gate review SHALL report `blocked`.

#### Scenario: The spec survived unchanged

- **WHEN** no specified value changed during implementation
- **THEN** an empty reconciliation table SHALL be a valid result.

### Requirement: Composition structure is enumerated per region

The pipeline SHALL require a per-region structural breakdown for every change with a visual
reference, authored independently for each region.

#### Scenario: A reference contains repeated regions

- **WHEN** a reference contains two or more comparable regions
- **THEN** `reference.md` SHALL record rows, columns, left-to-right contents, and what each region
  breaks from
- **AND** each region SHALL be described from the reference rather than by reference to another
  region.

#### Scenario: Uniformity is claimed

- **WHEN** a per-region breakdown is recorded
- **THEN** it SHALL answer explicitly whether every region shares the same row and column structure
- **AND** any exception SHALL be named in the same table as the regions it breaks from.

#### Scenario: The uniformity claim contradicts the regions

- **WHEN** `composition.uniform` is `true`
- **AND** any region records a non-empty `breaksFrom`, or regions differ in rows or columns
- **THEN** reference validation SHALL fail with a composition contradiction.

#### Scenario: A structural claim is compared to a render

- **WHEN** a graybox capture exists for the change
- **THEN** the graybox comparison SHALL address the recorded region ids by name.

### Requirement: Component-first v2 binds one target snapshot through chained receipts

The future v2 gate SHALL bind stack, component, Playground, page, and browser evidence to one target
identity, snapshot digest, and policy digest. An upstream digest change SHALL invalidate downstream
receipts. Prototype evidence SHALL require an explicit promotion receipt before satisfying a
production target. Component conformance SHALL remain distinct from visual acceptance.

#### Scenario: An upstream target snapshot changes

- **WHEN** a component or target snapshot digest differs from the digest bound by a downstream page
  or browser receipt
- **THEN** the downstream receipt SHALL become stale and SHALL NOT satisfy component conformance
- **AND** visual acceptance SHALL remain a separate result rather than being inferred.

### Requirement: Progressive skill entry point
The packaged skill MUST expose a concise `skill/SKILL.md` front door that is no more than 500 lines and routes each supported intent to the references required for that intent.

#### Scenario: Route-specific loading

- **WHEN** a user requests a supported design-pipeline route
- **THEN** the front door MUST identify the route and its required references
- **AND** it MUST NOT require reading unrelated module instructions

#### Scenario: Packaged references

- **WHEN** the skill is packaged and installed
- **THEN** every reference named by the front door MUST be present in the installed archive
- **AND** existing public command and reference paths MUST remain usable

### Requirement: Skill evaluation manifest
The repository MUST provide a versioned, offline-validatable evaluation manifest for representative skill prompts.

#### Scenario: Valid evaluation set

- **WHEN** `scripts/validate-evals.cjs` validates `evals/evals.json`
- **THEN** it MUST verify the schema, unique IDs, known workflow routes, canonical job IDs from the bundled job registry, expected downstream state, prompts, signals, and contained fixture paths
- **AND** it MUST return a deterministic passing result without network or model access

#### Scenario: Invalid evaluation set

- **WHEN** an evaluation has a duplicate ID, unknown route, empty prompt, empty required signal, or escaping fixture path
- **THEN** validation MUST fail with a machine-readable reason

### Requirement: Subject-grounded design routing
The front door MUST route open-ended visual work through the existing subject-grounding, audience, single-job, product-specific-signature, and iterative-critique contracts.

#### Scenario: Open visual direction

- **WHEN** a user requests a new visual direction or redesign
- **THEN** the route MUST point to the existing direction and synthesis contracts
- **AND** the route MUST require a product-specific signature decision before implementation
- **AND** it MUST preserve responsive, focus, and reduced-motion verification

### Requirement: Browser evidence routing
The front door MUST route dynamic web verification to the existing browser evidence adapter and its reconnaissance sequence.

#### Scenario: Dynamic local web application

- **WHEN** a target is a dynamic local web application
- **THEN** the route MUST wait for runtime readiness and network idle before DOM inspection
- **AND** it MUST capture or verify the applicable DOM, screenshot, console, accessibility, network, and performance evidence
- **AND** it MUST not replace behavioral verification with a static screenshot alone

### Requirement: Complete Stage 0 toolchain binding
Public toolchain resolve and probe requests MUST include jobId, jobPlanSha256, jobPlanPath, and deliverableForm. The CLI MUST read the referenced plan inside the declared root. The resolver MUST validate plan contents, the actual canonical plan hash, and job identity before producing a ready plan or probing tools.

#### Scenario: Missing or partial binding
- **WHEN** a toolchain request omits any required binding field
- **THEN** resolution MUST fail with a missing Stage 0 binding error and MUST NOT report ready

#### Scenario: Missing file or stale identity
- **WHEN** the plan file cannot be read, its content/hash is invalid, or jobId/hash differs from the request
- **THEN** resolve and probe MUST reject the request before capability execution

#### Scenario: Valid binding retains lineage
- **WHEN** a valid plan and matching request are resolved
- **THEN** the toolchain plan MUST retain that jobId, jobPlanSha256, and deliverableForm, without substituting jobId for primaryRouteId
- **AND** execution MUST continue using the same jobPlanSha256

### Requirement: Query-bound deliverable form
Route results and job plans MUST contain a deterministic deliverableForm from product-launch-video, motion-graphics-video, scrollytelling-page, interactive-page, or ui-motion. Job plans MUST preserve the original query and include query/form in their canonical hash. The toolchain request form and independently classified brief MUST match the plan form.

#### Scenario: Video rewritten as a page
- **GIVEN** a controller-generated product-launch-video plan
- **WHEN** an English or Chinese toolchain brief requests a scrollytelling or interactive page
- **THEN** resolution MUST fail with a deliverable-form conflict and MUST NOT report ready

#### Scenario: Query or form tampering
- **WHEN** a job plan query or form changes without updating its hash
- **THEN** plan validation MUST reject hash drift
- **AND** a rehashed plan whose query and form disagree MUST also be rejected

### Requirement: Generic product-promotion routing
English and Chinese HTML product launch/showcase video requests MUST select the existing motion-graphics job and include the HyperFrames frontend route using its existing product-launch-video contract. Routing MUST NOT depend on a project name.

#### Scenario: Product promotion in either language
- **WHEN** an English or Chinese HTML product-promotion video brief is routed
- **THEN** Stage 0 MUST select motion-graphics and frontend tool routes MUST include heygen-com/hyperframes

#### Scenario: Ordinary hover animation
- **WHEN** a dashboard requests a subtle hover animation without a video deliverable
- **THEN** it MUST remain on ordinary UI motion and MUST NOT activate HyperFrames

### Requirement: Film routes hand off to the film workflow
`route --write` for a film plan (product-launch-video or motion-graphics-video) MUST return a handoff to `next --deliverable film --job-plan` instead of a toolchain request, because a film has no stack choices; plans of other forms MUST keep the toolchain handoff. The handoff note MUST NOT claim that the tier follows the request: an omitted `--tier` defaults to standard.

#### Scenario: Persisted film route hands off to the film workflow
- **WHEN** `route --write` persists a plan whose form is `product-launch-video` or `motion-graphics-video`
- **THEN** its handoff is `command: "next"`, `action: "bind-film"` with an executable argv `next --root <root> --project-root <root> --deliverable film --job-plan <plan>`, and no `toolchain request` handoff or choices file
- **AND** running that argv binds the plan in film state, while a non-film plan keeps its `toolchain request` handoff

#### Scenario: Film handoff runs from any working directory
- **WHEN** the returned film handoff argv is run from a working directory outside the project
- **THEN** it MUST bind the plan in that project's film state, because the argv names the project as both `--root` and `--project-root`
- **AND** nothing is written to the working directory

### Requirement: code-carried capability
New design, composition, motion or film capability SHALL be delivered as at least one of:
a deterministic gate whose findings carry a concrete fix, a parameterized template, or a
cross-model evaluation under the existing benchmark contract.

#### Scenario: New capability is delivered
- **WHEN** a new design, composition, motion, or film capability is added
- **THEN** it SHALL include at least one of: a deterministic gate whose findings carry a concrete fix, a parameterized template, or a cross-model evaluation under the existing benchmark contract

### Requirement: acceptance separation
Gates, templates and evaluations SHALL NOT report creative or user acceptance. Those remain
separate recorded states.

#### Scenario: Capability evidence is reported
- **WHEN** a gate, template, or evaluation reports its result
- **THEN** it SHALL NOT report creative or user acceptance, which remain separate recorded states

### Requirement: deliverable sub-workflows
Film and edit work SHALL each follow a sub-workflow whose guide lists, per stage, only the
commands that stage needs, and every `next` action for these deliverables SHALL name its guide
section.

#### Scenario: Film or edit action is returned
- **WHEN** a `next` action is returned for film or edit work
- **THEN** the applicable guide SHALL list only the commands needed per stage
- **AND** the action SHALL name its guide section

### Requirement: fresh gate results
A recorded gate result SHALL count toward finishing a stage only when it is not older than the
files it checked.

#### Scenario: Gate result predates checked files
- **WHEN** a recorded gate result is older than any file it checked
- **THEN** it SHALL NOT count toward finishing the stage

### Requirement: replicate mode
In replicate mode a film SHALL NOT waive its reference study, and an edit SHALL study the
reference edit before cutting.

#### Scenario: Replicate film or edit work begins
- **WHEN** work is in replicate mode
- **THEN** a film SHALL NOT waive its reference study and an edit SHALL study the reference edit before cutting

### Requirement: named carriers
A storyboard beat joined to the previous beat by a carried handoff SHALL name what survives the
boundary.

#### Scenario: Carried handoff is declared
- **WHEN** a storyboard beat is joined to the previous beat by a carried handoff
- **THEN** the beat SHALL name what survives the boundary

### Requirement: rhythm
The storyboard gate SHALL reject near-uniform beat lengths in films of four or more beats and
films of eight seconds or more without any rest.

#### Scenario: Film rhythm violates a threshold
- **WHEN** a film has four or more beats with near-uniform lengths, or lasts eight seconds or more without any rest
- **THEN** the storyboard gate SHALL reject it

### Requirement: measured continuity
Film check SHALL report a continuity score over carried boundaries and SHALL fail when a planned
carry renders as a scene cut or when the score is below 0.6 with three or more carried boundaries.

#### Scenario: Planned carry renders as a cut
- **WHEN** a planned carry renders as a scene cut
- **THEN** film check SHALL fail and report continuity over carried boundaries

#### Scenario: Continuity score is too low
- **WHEN** at least three carried boundaries exist and their continuity score is below 0.6
- **THEN** film check SHALL fail and report the score

### Requirement: measured interaction
The pipeline SHALL verify declared web interactions by driving real input in a headless browser
and SHALL fail interactions that do not respond, do not settle, drift from their rest position, only
change opacity, or load resources from other origins.

#### Scenario: Interaction fails to behave correctly
- **WHEN** an interaction does not respond, does not settle, drifts from its rest position, changes only opacity, or loads resources from other origins
- **THEN** the pipeline SHALL fail the interaction

#### Scenario: Interaction is verified
- **WHEN** a declared web interaction is verified
- **THEN** the pipeline SHALL drive real input in a headless browser

### Requirement: web sub-workflow
Web work SHALL follow a sub-workflow whose guide lists each stage's commands, and SHALL not show a
draft before its interaction probe passes.

#### Scenario: Web workflow reaches draft review
- **WHEN** web work progresses toward showing a draft
- **THEN** its guide SHALL list each stage's commands and the interaction probe SHALL pass before the draft is shown

### Requirement: real interface captures in golden cases
A golden case that shows another product's interface SHALL declare its capture script, its pinned
source (repository, full commit and license) and its captured files. Captured files SHALL be
regenerated locally and SHALL NOT be committed. Repository QA SHALL fail when any captured file
is tracked.

#### Scenario: Golden case shows another interface
- **WHEN** a golden case shows another product's interface
- **THEN** it SHALL declare its capture script, pinned source repository, full commit, license, and captured files
- **AND** captured files SHALL be regenerated locally and SHALL NOT be committed

#### Scenario: Captured file is tracked
- **WHEN** any captured file is tracked
- **THEN** repository QA SHALL fail

### Requirement: cuts between still frames
The render gate SHALL treat a one-step change as an instant replacement when both of its
neighbouring steps are under a tenth of it. This applies in addition to steps that stand out from
their 2 s window.

#### Scenario: One-step replacement is isolated
- **WHEN** a one-step change has both neighboring steps under one tenth of its magnitude
- **THEN** the render gate SHALL treat it as an instant replacement, in addition to detecting steps that stand out from their two-second window

### Requirement: generated art in golden cases
A golden case that uses art made by an image model SHALL declare its generation script, the tool
and the generated files. Generated files SHALL NOT be committed, and render verification SHALL NOT
run the generation script implicitly. Repository QA SHALL fail when any generated file is tracked.

#### Scenario: Golden uses generated art
- **WHEN** a golden case uses art made by an image model
- **THEN** it SHALL declare its generation script, tool, and generated files
- **AND** generated files SHALL NOT be committed
- **AND** render verification SHALL NOT run the generation script implicitly

#### Scenario: Generated file is tracked
- **WHEN** any generated file is tracked
- **THEN** repository QA SHALL fail

### Requirement: mastering keeps section dynamics and codec headroom
`audio master` SHALL master under the target's true-peak ceiling by a codec headroom (1.5 dB by
default). When a linear gain to the target loudness would exceed that ceiling, it SHALL limit the
transients before the gain, by at most 10 dB, and report the limiting as `limiterDb`. It SHALL
measure the mastered output's true peak and increase the limiting while the peak is over the
ceiling.

#### Scenario: Linear gain would exceed the ceiling
- **WHEN** linear gain to target loudness would exceed the target's true-peak ceiling after the caller-selected codec headroom (1.5 dB by default)
- **THEN** `audio master` SHALL limit transients before the gain by at most 10 dB and report the limiting as `limiterDb`

#### Scenario: Mastered output is measured
- **WHEN** `audio master` finishes applying gain and limiting
- **THEN** it SHALL measure the mastered output's true peak
- **AND** it SHALL increase limiting while the measured peak is over the target's true-peak ceiling after codec headroom

### Requirement: The agent-browser adapter fills every web evidence artifact

The bundled `adapters/agent-browser.cjs` SHALL capture screenshot, trace, DOM, console,
network, accessibility and performance artifacts into the existing evidence receipt. It SHALL
run only the agent-browser executable and browser that the caller selected explicitly.

#### Scenario: Every measurement is captured

- **WHEN** every capture command succeeds
- **THEN** the receipt SHALL be `complete` with all seven artifacts hashed
- **AND** `accessibility.json` SHALL hold the axe-core violations and incomplete results.

#### Scenario: A measurement fails

- **WHEN** any capture command fails
- **THEN** its artifact SHALL be `null`, the receipt SHALL be `partial`
- **AND** the probe message SHALL name the failed commands.

#### Scenario: Network evidence may carry credentials

- **WHEN** network requests are recorded
- **THEN** request and response headers SHALL be removed
- **AND** the receipt redaction SHALL be `applied` with a note saying so.

#### Scenario: The tool is not selected explicitly

- **WHEN** `--agent-browser` is missing or resolves outside the project root
- **THEN** the capture SHALL fail closed without starting a browser.

### Requirement: Task-scoped skill guidance

The skill SHALL use one entry to select bounded supporting tools or a complete deliverable.
Supporting tool use SHALL retain the user's existing workflow. Stage documentation SHALL inherit
the selected scope and SHALL NOT impose OpenSpec on every downstream task.

#### Scenario: A caller needs text fitting only
- **WHEN** a caller selects the Canvas text-fitting helper for an existing project
- **THEN** guidance leads to that helper and its relevant check without initializing a film or full workflow

#### Scenario: A complete deliverable reads a stage guide
- **WHEN** the selected deliverable opens a detailed stage guide
- **THEN** the guide preserves the selected tier and links to one maintained body for each stage
- **AND** technical completion does not record visual acceptance

### Requirement: Attributed source bundles have a distinct location

The package SHALL keep original upstream bundles under `vendor/` and maintained callable helpers
under `tools/`. Moving a bundle SHALL preserve source bytes, revisions, licenses and manifest hashes.
Existing catalog commands SHALL resolve and verify the moved bundles in an installed skill.

#### Scenario: An installed catalog finds a source
- **WHEN** a catalog search or inspection returns a bundled source path
- **THEN** that path exists inside the installed skill and its existing integrity check passes

#### Scenario: A moved source is corrupted
- **WHEN** source bytes differ from the bundle's recorded manifest
- **THEN** the existing verifier rejects the bundle instead of treating relocation as verification

### Requirement: Current OpenSpec configuration carries project context

The repository SHALL maintain planning context and artifact rules in `openspec/config.yaml`, using
the installed stable OpenSpec schema. Active change specs SHALL pass strict validation. Generated
local agent instructions SHALL remain excluded from Git, and existing archives SHALL remain intact.

#### Scenario: An agent requests proposal instructions
- **WHEN** OpenSpec generates instructions for this change
- **THEN** the result includes this project's context and proposal rules from config.yaml

#### Scenario: Legacy active spec syntax is encountered
- **WHEN** an active change lacks a valid delta or scenario heading
- **THEN** migration repairs the syntax and preserves its stated behavior
- **AND** it does not bypass validation with skip_specs or archive the change to hide the failure

### Requirement: Installed visual tools work in the caller's project

The skill SHALL locate its bundled helpers from the installed root and write project outputs
through the existing contained-path contract, without requiring a deliverable workflow.

#### Scenario: Portable visual-craft study
- **Given** a source or installed skill and an independent project directory
- **When** `composition scaffold --template visual-craft --output <new-dir>` runs for that project
- **Then** it creates a runnable HTML entry, its local Canvas helper and license in that directory, without workflow state or dependencies.

#### Scenario: Preserve authored work
- **Given** an existing output, unsupported template or output outside the project
- **When** scaffolding is requested
- **Then** it fails without overwriting project contents or creating an out-of-scope output.

### Requirement: Skill installation is documented and verified

The project SHALL ship a single discoverable skill with on-demand tools, installation and
upgrade instructions, and evidence from the installed entry rather than source tests alone.

#### Scenario: Install the current local skill
- **Given** the user requests skill installation and a previous canonical installation exists
- **When** the existing installer replaces it after a preserved backup
- **Then** the installed entry and tool files match the intended source, doctor and project scaffolding work, and separate compatibility consumers remain intact.

#### Scenario: Select the skill explicitly
- **Given** a skills CLI installation from a local or published repository
- **When** the documented command selects `design-pipeline`
- **Then** the complete selected bundle is installed and nested third-party skills are not separately selected; documentation distinguishes current local changes from published versions.

### Requirement: Cross-surface visual craft is executable

The skill SHALL expose reusable, locally executable drawing, typography and image-placement
methods for graphics and frontend work without requiring a film deliverable or a fixed style.

#### Scenario: Progressive tool loading
- **Given** an existing graphics, drawing, image, layout or frontend task
- **When** an agent needs a supporting visual capability
- **Then** it can follow a short tools index to one guide and implementation without loading the whole source library or creating a film workflow.

#### Scenario: Bounded implementation by a smaller model
- **Given** an observed visual goal and supplied geometry, colors, text and dimensions
- **When** an agent selects the applicable bundled primitive
- **Then** it can render that goal with explicit inputs and obtain repeatable visual evidence.

#### Scenario: Invalid or unreadable authoring data
- **Given** non-finite geometry, excessive work or text that cannot fit above the minimum size
- **When** the helper runs
- **Then** it rejects invalid geometry before drawing or reports text overflow without a false success.

### Requirement: Visual differences are observable evidence

The system SHALL provide spatial image and sampled-motion diagnostics through the existing
composition and reference-analysis surfaces while preserving source lineage and acceptance boundaries.

#### Scenario: Compare equal-size images
- **Given** two contained PNG images with a local change
- **When** composition comparison runs
- **Then** it renders the original pair and localizes the change, records source digests, and grants no creative acceptance.

#### Scenario: Inspect motion in sampled reference frames
- **Given** a local video prepared by the existing reference analyzer
- **When** the agent opens a spatial motion map
- **Then** the map names its source frames and sampling limits without claiming object identity or full-frame-rate motion analysis.

#### Scenario: Preserve evidence integrity
- **Given** mismatched dimensions, unsafe or existing output paths, or a changed diagnostic file
- **When** the comparison or reference validator runs
- **Then** it refuses unsafe comparison/overwrite or invalidates the changed evidence using the existing report contract.

### Requirement: Blender discovery distinguishes absence from failure

The pipeline SHALL discover supported Blender executables through explicit configuration, PATH and
platform defaults. It SHALL keep custom paths outside shipped source and report detected executable
or rendering failures rather than hiding them as missing-tool skips.

#### Scenario: Blender is available on PATH

- **WHEN** no explicit executable is selected and PATH contains a supported Blender
- **THEN** the existing film adapter SHALL use it and the native render check SHALL run

#### Scenario: A selected executable fails

- **WHEN** the configured Blender cannot execute or its render fails
- **THEN** the check SHALL fail with the diagnostic cause instead of claiming Blender is uninstalled

### Requirement: Repository maintenance has one npm entry

The repository SHALL expose its maintained npm packages through a private root workspace, one
lockfile and root commands for dependency inspection, tests and existing capability/source checks.
Installing the packaged skill SHALL NOT require installing the repository maintenance workspace.

#### Scenario: Maintainer installs the toolchain

- **WHEN** a maintainer runs npm ci from the repository root
- **THEN** npm SHALL install the locked workspace dependencies without requiring separate installs
- **AND** root npm scripts SHALL invoke the maintained verification commands

#### Scenario: A user installs only the skill

- **WHEN** the skill is packaged and installed outside this repository
- **THEN** its callable tools SHALL retain their existing dependency and path contracts

#### Scenario: Continuous integration verifies the repository

- **WHEN** CI or the release workflow verifies a checkout
- **THEN** it SHALL install the root lockfile and required browser dependencies first
- **AND** it SHALL invoke the root specification, test and package commands

### Requirement: Frontend capability updates have bounded evidence

Frontend and animation updates SHALL record primary upstream provenance, preserve source licenses
and integrity, and verify affected runtime behavior before raising the supported baseline. A version
query or successful package install alone SHALL NOT establish API compatibility or visual acceptance.

#### Scenario: A runtime or source snapshot changes

- **WHEN** an integrated animation capability is refreshed
- **THEN** the update SHALL use its existing manifest/registry and run affected checks
- **AND** source revisions, compatibility limits and rendered evidence SHALL remain inspectable

#### Scenario: An update cannot be verified

- **WHEN** upstream behavior or required runtime evidence is unavailable
- **THEN** the capability SHALL remain unresolved or pinned with a stated reason
- **AND** existing approved visual evidence SHALL NOT be silently replaced

#### Scenario: Latest stable versions are requested

- **WHEN** the user requests current stable animation and graphics dependencies
- **THEN** maintained dependencies and optional adapter provenance SHALL use verified stable releases
- **AND** optional runtimes SHALL be tested without becoming unconditional packaged-skill dependencies

### Requirement: Referenced skills have portable local guidance

Reusable reference-skill methods SHALL enter the existing bundled guides and routes with source
provenance and applicable checks. Shipped guidance SHALL NOT claim host-specific installation
state. Optional companion presence, upstream currency and local capability coverage SHALL remain
separate observations.

#### Scenario: A companion is missing or stale

- **WHEN** a GSAP, Anime.js or PixiJS task lacks a current companion skill
- **THEN** the route SHALL start from its bundled guide or selected local source playbook
- **AND** remaining API uncertainty SHALL use version-matched primary documentation
- **AND** the companion diagnostic SHALL NOT be changed to current by the fallback

#### Scenario: A referenced upstream skill changes

- **WHEN** a maintainer reviews a new reference-skill revision
- **THEN** the review SHALL distinguish reusable methods, version-dependent APIs and source-specific assumptions
- **AND** an unchanged source-integrity check or npm version SHALL NOT prove the skill content current

### Requirement: Comparison reports identify their metric

The existing browser comparison report SHALL identify the library version, metric and options
used to calculate pixel differences. A metric upgrade SHALL preserve earlier evidence and SHALL
NOT make values from different metrics interchangeable or grant visual acceptance.

#### Scenario: Pixelmatch changes its color metric

- **WHEN** a new comparison runs with pixelmatch 8
- **THEN** its existing v1 report SHALL record the OKLab/HyAB metric and effective options
- **AND** prior reports and approved golden assets SHALL remain unchanged

#### Scenario: Comparison inputs contain a visible change

- **WHEN** the maintained comparator receives identical images or a known changed region
- **THEN** identical images SHALL produce zero difference and the changed region SHALL be detected

### Requirement: Motion is authored from intention and poses

The system SHALL support authored pose timing, spacing and holds in the existing choreography
runtime, with deterministic seeking and validation before timeline mutation.

#### Scenario: Independent timing and spacing
- **Given** two pose sequences with the same endpoints and duration but different intermediate keys
- **When** pose-to-pose adds them to a paused composition
- **Then** they follow their authored spacing and retain exact endpoint timing under arbitrary seeks.

#### Scenario: Held drawing and secondary action
- **Given** a held incoming key and a delayed sequence on a separate target
- **When** the scene is rendered
- **Then** the preceding pose stays until the authored key and the secondary action keeps its offset.

#### Scenario: Invalid authoring data
- **Given** non-finite values, unknown properties, inconsistent pose channels or non-increasing keys
- **When** a pattern is called
- **Then** it rejects before mutating the timeline.

#### Scenario: Held poses still act
- **Given** a sequence of zero-duration numeric transform sets on one subject
- **When** later poses change from an earlier pose
- **Then** the timeline gate recognizes discrete action, while initialization, identical poses,
  fade/scale-only changes and broken planned continuous carry remain insufficient.

### Requirement: Stylistic timing remains a creative decision

The system SHALL distinguish rhythm review heuristics from implementation failures and SHALL
keep technical gate results separate from creative acceptance.

#### Scenario: Deliberate rhythm
- **Given** a structurally valid film/edit with regular pulses, long holds, sparse sound accents
  or off-beat cuts
- **When** existing gates run
- **Then** heuristics produce actionable review warnings rather than claim that this style is invalid.

#### Scenario: Broken implementation
- **Given** a timeline gap, property conflict, absent subject action or broken planned carry
- **When** the same gates run
- **Then** the objective failure still blocks conformance.

#### Scenario: Authored sound accent
- **Given** an explicit downbeat, accent or impact cue and the score's event grid
- **When** the declared cue misses every event by more than one frame
- **Then** cue misalignment remains an error even though an off-grid picture cut is only a warning.

#### Scenario: Technical result is not acceptance
- **Given** passing checks and a rendered motion study
- **When** results are reported
- **Then** runtime evidence and visual acceptance are reported separately; user acceptance is not set.

### Requirement: Locally distributed video inspection candidates
Video sampling SHALL retain candidate context from locally prominent pixel changes across the requested interval, within the existing frame budget. Candidate times SHALL remain inspection hints, not confirmed shots. Omitted context SHALL be reported rather than silently treated as observed.

#### Scenario: Fast opening masks a later transition
- **WHEN** an opening has sustained large pixel changes and a later interval has a locally prominent transition
- **THEN** the later transition SHALL remain eligible for contextual sampling despite the global opening baseline.

#### Scenario: Frame budget cannot retain context
- **WHEN** candidate context exceeds the requested frame budget
- **THEN** sampling SHALL retain provenance and report omissions; it SHALL NOT assert complete production readiness.

### Requirement: Confirmed video production inventory
Production readiness for a video reference SHALL require confirmed shots covering the analyzed interval and an explicit inventory of applicable target properties. Every declared property SHALL have observed, local frame evidence. Historical reports SHALL remain readable, but coarse window observations alone SHALL NOT satisfy current production readiness.

#### Scenario: One observation hides another object
- **WHEN** a shot declares text geometry and camera motion but only text geometry is observed
- **THEN** production readiness SHALL remain pending and identify the missing camera property.

#### Scenario: A static graphic has no material animation
- **WHEN** a shot declares only the visible geometry properties of a static graphic and those properties have local evidence
- **THEN** the checker SHALL NOT invent a requirement for material, lighting or motion observations.

#### Scenario: Historical report starts new production
- **WHEN** a valid historical video report has no confirmed shot inventory
- **THEN** inspection SHALL remain available and production callers SHALL request decomposition instead of proceeding.

### Requirement: Evidence bound video visual tasks
Visual tasks referencing a video analysis SHALL bind a confirmed shot and observation IDs in the existing design plan. Dispatch and completion SHALL verify matching target, atomic property, time range and frame evidence. Declared guides, source report, source media and selected frames SHALL participate in existing input hashes and downstream invalidation.

#### Scenario: A task binds the wrong observation
- **WHEN** a task's observation belongs to another target, property or shot
- **THEN** dispatch and completion SHALL block with a concrete binding error.

#### Scenario: Method or source evidence changes
- **WHEN** a bound guide, source report or frame changes after technical completion
- **THEN** the existing receipt chain SHALL invalidate that completion and affected downstream work.

#### Scenario: A rebuilt asset is still unavailable
- **WHEN** a task declares an absent asset input or an unfinished dependency output
- **THEN** existing input checks SHALL block dispatch; a placeholder SHALL NOT count as the final asset.

#### Scenario: Structurally complete production evidence
- **WHEN** all required properties and task bindings pass their structural checks
- **THEN** the result SHALL keep semantic and visual acceptance unassessed until human review.

### Requirement: Usable preserved method entries
Declared bundled method paths and required packaging resources SHALL resolve to the current preserved source topology. License copies SHALL retain the same pinned bytes; repairing paths SHALL NOT alter upstream implementations or weaken provenance checks.

#### Scenario: Preserved upstream engine directory changes
- **WHEN** a preserved method is present under its current engine directory but an existing package requirement or method link names an obsolete directory
- **THEN** the existing requirement and link SHALL be updated to the preserved file while its source hash remains verified.

### Requirement: Agent-browser evidence can start from saved browser state

`evidence capture` SHALL accept `--agent-browser-state <file>`, an agent-browser state file inside
`--project-root`, and load it when the agent-browser session starts. The host SHALL read the file
once into a private copy outside the evidence and the adapter SHALL load that copy. The receipt
SHALL name the file and the sha256 of the copied bytes and SHALL NOT copy its contents.

#### Scenario: Saved state is preloaded

- **WHEN** `--agent-browser-state` names a file inside the project and `--agent-browser` is set
- **THEN** the adapter SHALL start the session with `--state` pointing at the host's copy
- **AND** the probe message SHALL name the file and its sha256
- **AND** the copy SHALL be removed after the capture, whether or not it succeeded.

#### Scenario: The state file changes during the capture

- **WHEN** the project's state file is rewritten after the host read it
- **THEN** the browser SHALL load the bytes the host read
- **AND** the probe message SHALL name the sha256 of those bytes.

#### Scenario: The state file is outside the project

- **WHEN** `--agent-browser-state` resolves outside `--project-root`
- **THEN** the capture SHALL fail closed without starting a browser.

#### Scenario: Another adapter would ignore the state

- **WHEN** `--agent-browser-state` is given with an `--adapter-path` other than the packaged
  `adapters/agent-browser.cjs`, or without `--agent-browser`
- **THEN** the capture SHALL fail closed without starting the adapter.

### Requirement: Native completion observes its required verification

Native task completion SHALL run each supported required verifier through its trusted public completion operation and use the observed result before promotion. Caller-written reports, receipt invocation fields and producer labels SHALL NOT substitute for that execution. Failed, missing, partial or unsupported verification SHALL block completion.

#### Scenario: Correctly hashed self-written evidence is submitted

- **WHEN** a caller submits a passed report or success receipt without observed verification
- **THEN** completion SHALL run the declared supported verifier or remain blocked
- **AND** the report alone SHALL NOT authorize technical completion or owner review

#### Scenario: The existing browser interaction check runs

- **WHEN** the current local web task has a supported interaction verification binding
- **THEN** completion SHALL use actual browser measurements and the existing evaluator verdict
- **AND** missing tools, failed capture, timeout or incomplete measurements SHALL block promotion

#### Scenario: The probe targets a different page

- **WHEN** the first-slice probe targets a remote URL or a local page other than its declared task output
- **THEN** native completion SHALL reject the verification binding
- **AND** the probe and actual output SHALL be included in the checked snapshot rather than substituting an unrelated default page

### Requirement: Native task scope uses a preserved observed baseline

Before native task work, the tool SHALL capture a task-bound baseline and at completion compare actual observable changes with that task's literal scope and explicitly declared artifact paths. Unchanged pre-existing edits SHALL NOT count as new task changes. A missing baseline or unobservable target SHALL block scope-verified completion.

#### Scenario: A pre-existing dirty file is unchanged

- **WHEN** another dirty file existed before dispatch and retains its exact content and status
- **THEN** it SHALL NOT be counted as a new out-of-scope task change
- **AND** modifying that same dirty file afterward SHALL be detected even if its Git status stays unchanged

#### Scenario: Only staged contents change

- **WHEN** a file's Git index contents change while its working bytes and porcelain status remain unchanged
- **THEN** the change SHALL be included in the observed task delta
- **AND** unresolved merge stages SHALL block scope-verified completion

#### Scenario: An out-of-scope commit is reverted

- **WHEN** the attempt commits an out-of-scope change and later reverts it in another visible commit
- **THEN** the changed paths in that commit history SHALL still block completion
- **AND** an unverifiable history replacement SHALL NOT establish a clean task delta

#### Scenario: Work escapes the current task scope

- **WHEN** the observed task delta contains an out-of-scope file, including a file belonging to a different task
- **THEN** completion SHALL be blocked before review and SHALL retain the changed files and diagnostic evidence
- **AND** another task's scope SHALL NOT authorize the change

#### Scenario: The caller repeats next or retries failed work

- **WHEN** next is repeated or an unfinished attempt fails
- **THEN** the original active baseline SHALL remain bound to that attempt
- **AND** repeating dispatch SHALL NOT adopt an out-of-scope edit into a fresh baseline

#### Scenario: A changed plan expands the allowed scope

- **WHEN** the plan changes while an attempt has unresolved changes
- **THEN** the tool SHALL inspect that attempt against its preserved original authorization before adopting a new window
- **AND** the new scope SHALL NOT retroactively authorize an old out-of-scope edit

### Requirement: Native verification commits one current evidence snapshot

Observed verification and scope results SHALL bind the current target, task, plan, inputs, outputs and artifacts. A changed binding during verification SHALL prevent completion. Upstream drift SHALL invalidate dependent technical evidence and review. Existing state/event transaction and artifact lineage SHALL remain authoritative.

#### Scenario: Output changes while verification runs

- **WHEN** an input, output, task or plan changes between verification start and completion commit
- **THEN** the observed result SHALL NOT be bound to the changed version
- **AND** completion SHALL return a repair or rerun action rather than passed

#### Scenario: The report destination aliases another bound file

- **WHEN** the proposed check report aliases any bound input, declared output, another check destination, active plan, native state or event ledger
- **THEN** completion SHALL reject the destination before capture and preserve those files

#### Scenario: Probe expectations change after a pass

- **WHEN** the probe bytes change after observed verification
- **THEN** the task's previous check and dependent review SHALL become stale and require verification of the new expectations

#### Scenario: Completion evidence changes after review

- **WHEN** a completed task's observed evidence or bound output changes
- **THEN** the task and affected downstream evidence SHALL become stale
- **AND** previous owner acceptance SHALL NOT authorize the changed version

### Requirement: Native verification exposes its coverage and recovery

Native next SHALL return one concrete supported action with missing prerequisites or verifier failure context. Technical results SHALL identify the observed check and scope coverage and SHALL NOT imply producer authentication outside the trusted execution boundary, complete filesystem write policing, Component Conformance or Visual Acceptance.

#### Scenario: An old plan has only report paths

- **WHEN** a native plan or completion record lacks an executable verification binding or task baseline
- **THEN** it SHALL remain readable and require explicit binding and fresh verification before advancement
- **AND** next SHALL identify the required repair without deleting history

#### Scenario: Verification is outside the supported first slice

- **WHEN** the task needs an unsupported verifier or its scope cannot be observed
- **THEN** next SHALL report blocked with the missing capability
- **AND** an agent narrative or an unknown result SHALL NOT substitute for a pass

#### Scenario: An observed technical check passes

- **WHEN** required verification and observable scope checks pass for the same snapshot
- **THEN** the existing exact-version owner review SHALL remain applicable
- **AND** Component Conformance and Visual Acceptance SHALL be reported separately from that technical pass

### Requirement: Workflow next preserves actionable check context

Project-root next SHALL return recovery context for its existing pending verification gate, identifying missing, unbound or changed files when evaluating a recorded pass with checked-file bindings and retaining available prior verifier findings, fixes and recovery instructions. Diagnostics SHALL NOT change pass criteria, grant acceptance or write state. Older gate records without diagnostics SHALL remain readable and resume through the existing action.

#### Scenario: A failed check is resumed in another command

- **WHEN** a public verifier records a failed check and next is called again
- **THEN** next SHALL retain that gate's actionable findings and fixes with its existing check command

#### Scenario: Checked bytes change

- **WHEN** a current pending gate's checked input changes after a pass
- **THEN** next SHALL name the changed input and require a fresh check without writing state

#### Scenario: A pass measured another input

- **WHEN** an existing pass lacks a required input binding
- **THEN** next SHALL identify that input and explain how to verify it rather than treating the old pass as current

#### Scenario: Required files are missing or unavailable

- **WHEN** a recorded pass with checked-file bindings references required inputs that cannot be read inside the project
- **THEN** next SHALL name the affected path and recovery action without advancing or exposing external file contents

### Requirement: Workflow review points to checked output files

Shared project-root review SHALL show the actual contained checked web page or film/edit video rather than generic placeholders. Supplemental evidence SHALL be listed only when it exists inside the project, and its existence SHALL NOT establish freshness, conformance or owner Visual Acceptance. Review decisions SHALL keep their existing snapshot bindings.

#### Scenario: Web draft awaits its owner

- **WHEN** the current web draft passes its check and awaits review
- **THEN** next SHALL show its actual checked page and request inspection of the affected interactions

#### Scenario: Multiple film renders exist

- **WHEN** a checked film draft awaits review with multiple render files present
- **THEN** next SHALL show the render bound to that current check

#### Scenario: Supplemental evidence is missing or escaping

- **WHEN** an optional review evidence file is missing or resolves outside the project
- **THEN** it SHALL NOT be listed as an available review file

### Requirement: Engineering guidance uses runnable vertical verification

Packaged QA guidance SHALL teach one observable behavior per implementation step, public-interface regression checks with independent expectations, observed failure before a fix, focused reruns and root-cause diagnosis before repeated retries. Existing user authorization and established project interfaces SHALL be reused; deterministic tests SHALL NOT substitute for visual acceptance.

#### Scenario: Agent changes a runtime behavior

- **WHEN** an agent fixes or extends a deterministic tool behavior
- **THEN** it SHALL exercise the relevant established public interface and complete one observed failing-check-to-fix cycle before adding another behavior

#### Scenario: A check repeats without progress

- **WHEN** the same command completes but the workflow remains blocked
- **THEN** the agent SHALL inspect returned recovery context and test a concrete cause before retrying unchanged inputs

### Requirement: Interaction verification preserves measurement inputs

Interaction verification SHALL reject a report destination that aliases its probe, resolved local page or existing workflow state before browser execution. Rejection SHALL preserve their bytes and SHALL NOT record a gate pass.

#### Scenario: Report aliases a measured page or state

- **WHEN** the report destination names the measured local page or workflow state through an exact path, hard link or symbolic link
- **THEN** verification SHALL return a machine-readable contract error before capture
- **AND** the probe, page and state SHALL remain unchanged

#### Scenario: A separate contained report is requested

- **WHEN** the report destination is contained and distinct from the measurement inputs and state
- **THEN** verification SHALL retain its existing capture, evaluation and measured-page binding behavior
- **AND** a gate pass SHALL NOT grant owner Visual Acceptance

### Requirement: Workflow passes bind current checked inputs

Workflow gate passes SHALL bind the current bytes of their declared checked files. Missing, changed or unbound required files SHALL reopen the existing check. The workflow and verifier SHALL use the same existing film render selection. A timestamp or a check of a different output SHALL NOT substitute for this binding.

#### Scenario: Changed content retains its timestamp

- **WHEN** a checked file changes while its original timestamp is restored
- **THEN** the workflow SHALL return the corresponding check rather than done

#### Scenario: Required input disappears or only legacy time is recorded

- **WHEN** a required checked file is missing or the stored pass contains only status and time
- **THEN** the workflow SHALL require fresh verification without deleting the old state

#### Scenario: A newer film render is present

- **WHEN** the existing verifier selects a newer nonempty film render
- **THEN** the workflow SHALL bind that same render and SHALL NOT reuse a check of an older video

#### Scenario: A custom edit output was checked

- **WHEN** a successful edit check targeted another output file
- **THEN** its pass SHALL NOT complete the default draft's check stage

#### Scenario: Interaction verification targets another page

- **WHEN** a probe measures a different local page or a remote URL
- **THEN** its pass SHALL NOT substitute an unrelated local index.html as the measured input

#### Scenario: Verification output would overwrite its input

- **WHEN** interaction output names the same file as its probe, including a filesystem alias
- **THEN** verification SHALL reject the output before capture and preserve the probe and workflow state

### Requirement: Workflow review belongs to the current draft

Draft acceptance SHALL bind the current checked-input snapshot and use the latest review decision. Rejection or a changed checked snapshot SHALL reopen review and any dependent standard delivery. Engineering checks SHALL NOT produce owner Visual Acceptance.

#### Scenario: An accepted draft is rejected

- **WHEN** the owner rejects the currently accepted draft with feedback
- **THEN** the workflow SHALL preserve both decisions and require a new review after rechecking

#### Scenario: Accepted output changes and passes another check

- **WHEN** an accepted draft changes and its new version passes engineering checks
- **THEN** the previous acceptance SHALL NOT authorize delivery of the new version

### Requirement: Delivery cannot bypass workflow prerequisites

Delivery recording SHALL reject unfinished prerequisites without writing state. Film and edit delivery SHALL name an existing contained file. Standard delivery SHALL bind its current check snapshot and local film/edit output. UI's existing work-stage declaration SHALL remain available with Visual Acceptance unevaluated; quick workflows MAY record delivery after all applicable stages finish.

#### Scenario: Delivery is recorded before verification

- **WHEN** delivery is requested while a prerequisite action remains
- **THEN** the command SHALL return a contract error naming that action and leave state unchanged

#### Scenario: Film or edit output is missing or escaping

- **WHEN** film/edit delivery names a missing file, directory or path outside the project
- **THEN** the command SHALL reject it without recording delivery

#### Scenario: A delivered standard output changes

- **WHEN** its check snapshot or bound delivery file changes
- **THEN** the previous delivery SHALL NOT complete the changed workflow

#### Scenario: Legacy UI records its bounded work

- **WHEN** UI reaches work after its intake and reference prerequisites
- **THEN** it MAY record the existing completion declaration and SHALL report Visual Acceptance as not evaluated

### Requirement: Agent verification instructions drive the real surface

The packaged QA guidance SHALL teach launch, readiness checks, real user-path verification, retained evidence, owned-process cleanup and failure recovery through existing commands. It SHALL distinguish partial capture, evidence integrity, functional checks and owner Visual Acceptance. The maintained instructions SHALL be exercised on at least one real public-command path before delivery.

#### Scenario: A partial capture validates structurally

- **WHEN** a capture is partial or an evidence validator exits successfully without exercising behavior
- **THEN** the agent SHALL retain that scope and SHALL NOT report full functional verification

#### Scenario: Verification cannot run

- **WHEN** a required instance, input, tool or observation is unavailable
- **THEN** the agent SHALL report the missing check and recovery action without inventing a passing result

### Requirement: Interaction journeys observe ordered business states

The existing interaction verifier SHALL support a bounded ordered DOM-state journey driven by real browser input in one page instance. It SHALL compare captured visible, text, attribute and focus values against declared literal expectations. Legacy motion probes SHALL retain their existing behavior and measurement requirements.

#### Scenario: Menu selection follows opening

- **WHEN** a journey observes initial closure, opens a menu, selects an item and closes it
- **THEN** the verifier SHALL retain state between steps and verify each declared result
- **AND** selection SHALL update the declared visible value and survive subsequent closing input

#### Scenario: Menu animates without applying selection

- **WHEN** the menu moves correctly but its selected value differs from the declared expectation
- **THEN** verification SHALL fail with the step, actual value, expected value and repair finding
- **AND** motion success SHALL NOT establish the missing business state

#### Scenario: Keyboard closes the menu

- **WHEN** the journey drives Escape on an open menu
- **THEN** the verifier SHALL observe closure and the declared focus recovery through real keyboard input

#### Scenario: State observations are incomplete or malformed

- **WHEN** a required step or assertion is missing, duplicated, reordered or has an invalid actual value
- **THEN** the verifier SHALL NOT return a passed journey
- **AND** a missing element SHALL NOT satisfy an expected false or null value

#### Scenario: A journey requests unbounded or executable assertions

- **WHEN** the request exceeds the step, assertion or observation budgets, mixes motion and journey shapes, or supplies an unsupported action or expression
- **THEN** contract validation SHALL reject it before browser execution

#### Scenario: A journey navigates elsewhere

- **WHEN** an ordered operation changes the actual local page to another target
- **THEN** capture SHALL retain the existing canonical-page rejection
- **AND** the other page's states SHALL NOT authorize native completion

#### Scenario: Missing journey provenance hides external requests

- **WHEN** a journey capture omits its page origin, declares another origin, or supplies an unsupported or mismatched capture URL
- **THEN** evaluation SHALL reject it before its values can establish a passed journey
- **AND** supported journey capture SHALL retain external-request checks while legacy-only capture compatibility remains unchanged

### Requirement: Native completion verifies declared journey coverage

Native completion SHALL validate the observed interaction result against the normalized original probe, including every ordered state assertion. It SHALL retain existing task/input/output/report binding, preserved scope, CAS and exact-version review. Journey results SHALL NOT fabricate motion frames or relax legacy motion completeness.

#### Scenario: A caller labels a partial report as state-only

- **WHEN** a caller supplies a state-only label without the complete declared journey observations
- **THEN** native completion SHALL remain blocked
- **AND** the original probe declaration SHALL determine required evidence

#### Scenario: The accepted probe changes

- **WHEN** a step input or literal expectation changes after observed completion
- **THEN** the completion and dependent review SHALL become stale under existing input invalidation

### Requirement: Native repair feedback is actionable and snapshot-bound

Native next SHALL expose actual verifier findings with concrete repair guidance while preserving legacy failure text. Consecutive observed failures SHALL bind the measured input/output snapshot; after three identical failures the returned action SHALL stop blind repetition. Recovery SHALL NOT bypass completion checks or reset a failed authorization window.

#### Scenario: The same failed snapshot is verified again

- **WHEN** actual verification fails repeatedly on identical bound input/output bytes
- **THEN** the stored observed attempt count SHALL increase
- **AND** the third failure SHALL return stop-repeating guidance with the failing check and repair action

#### Scenario: The implementation is repaired

- **WHEN** output bytes change before another observed failed verification
- **THEN** the consecutive count SHALL restart for that new snapshot
- **AND** a restored modification timestamp SHALL NOT hide the byte change

#### Scenario: Next is repeated without verification

- **WHEN** next is repeated, a tool is missing, scope is blocked or native CAS conflicts
- **THEN** no additional observed verifier attempt SHALL be claimed
- **AND** the existing active scope window and applicable recovery SHALL remain intact

### Requirement: Native task examples match supported proof

Native task templates and guides SHALL use an observable goal whose declared checks can establish it, and SHALL state uncovered behavior. A real menu trial SHALL retain agent-produced output, independent browser findings and repaired version evidence while keeping Component Conformance and owner Visual Acceptance separate.

#### Scenario: The agent follows the menu example

- **WHEN** the example task is dispatched, implemented and verified
- **THEN** its proof SHALL exercise actual open, selection, close and keyboard/focus states
- **AND** owner acceptance SHALL require a real reply on the exact displayed version

#### Scenario: A selection defect is deliberately injected

- **WHEN** a trial uses a fault injection to test repair feedback
- **THEN** the record SHALL identify it as an injected counterexample
- **AND** scripted fixtures SHALL NOT be described as real model-produced output

### Requirement: Publication preserves required tracked upstream source

Publication SHALL preserve required tracked upstream source bytes despite personal ignore patterns. Repository exceptions SHALL name exact source paths and SHALL retain the existing tracked-ignored-file audit without changing global preferences.

#### Scenario: A personal binary ignore hides required tracked source

- **WHEN** a published tracked upstream layout source matches a personal binary ignore rule
- **THEN** the repository SHALL explicitly include that exact source path without modifying its bytes or global preferences
- **AND** the existing tracked-ignored-file audit SHALL remain enforced

### Requirement: Physical path identity survives Windows aliases

Existing Git scope and native completion SHALL identify one physical repository consistently when Windows paths use long or short directory spellings, while retaining containment, link, root, branch and history checks.

#### Scenario: Equivalent root spellings reach a native task

- **WHEN** a task and Git root refer to the same physical directory through different Windows spellings
- **THEN** snapshot identity and change-to-Git coordinates SHALL remain consistent
- **AND** baseline capture and verified completion SHALL not be rejected solely for that alias.

#### Scenario: A path escapes its physical root

- **WHEN** an external link, different Git root or uncontained target is selected
- **THEN** the existing verifier SHALL reject the path and preserve prior evidence.

#### Scenario: Offline study output aliases the preserved source

- **WHEN** study source and nested output use different Windows spellings of one physical directory
- **THEN** the builder SHALL reject that output before writing and preserve every source byte.

### Requirement: Repository QA observes actual browser motion

Pointer capture SHALL apply every planned intermediate native input with step spacing after delayed delivery. Driver stalls SHALL not create elapsed-time catch-up jumps or bursts. Capture SHALL retain real browser samples, timestamps and safety bounds without weakening existing gate conditions.

#### Scenario: Pointer capture runs under variable frame scheduling

- **WHEN** the supported browser drives and observes the existing pointer specimen
- **THEN** the driver SHALL retain the intermediate coordinates rather than skip directly to a later elapsed-time position
- **AND** measurements SHALL reflect the actual input duration and observed frames.

#### Scenario: Motion is actually discontinuous or absent

- **WHEN** the specimen jumps or ignores the pointer
- **THEN** capture SHALL retain the actual discontinuity observations
- **AND** a motionless target SHALL retain its failed motion-response finding.

### Requirement: Complete pinned good-css source

The pipeline SHALL ship the complete reviewed good-css Git tree as byte-preserved source with
revision, Git tree, per-object identities, canonical hash and license evidence. It SHALL use the
existing snapshot, package-resource and source-check mechanisms without automatic upstream installation.

#### Scenario: Clean reviewed source is imported

- **WHEN** the selected clean revision is imported
- **THEN** every tracked file, practice, reference, specimen and attributed asset SHALL be packaged
- **AND** the snapshot SHALL match Git blob identities and the locked tree hash.

#### Scenario: Source evidence is incomplete or changed

- **WHEN** the source is dirty or a locked file is missing, added or modified
- **THEN** import or integrity verification SHALL fail without relabeling the source as current
- **AND** existing published artifacts SHALL not be silently overwritten by a failed import.

### Requirement: Reachable project-adapted CSS practices

CSS authoring and review SHALL route through the built-in good-css guide without requiring an
ambient skill. Every reviewed practice SHALL have a source link, relevant use, specimen and
verification/adaptation condition. Project tokens, semantics, browser support and existing v1
evidence and acceptance contracts SHALL remain authoritative.

#### Scenario: CSS is written through any authoring system

- **WHEN** a page or component uses CSS, utility classes, inline styles or CSS-in-JS
- **THEN** the agent SHALL load applicable original entries and adapt their complete conditions
- **AND** existing stage/web/tool and QA routes SHALL expose the guide offline.

#### Scenario: A technique cannot satisfy the target contract

- **WHEN** a feature lacks target-browser support or conflicts with accessibility, tokens or film seeking
- **THEN** the agent SHALL retain a usable verified fallback and record the limitation
- **AND** it SHALL NOT infer visual acceptance or deterministic playback from a CSS example.

### Requirement: Offline good-css specimen studies

The pipeline SHALL provide a maintained Node tool that builds all reviewed live specimens with
local assets into a new caller-owned directory without new dependencies or upstream deployment.
Existing output SHALL be preserved on rejection. Browser results SHALL remain scoped evidence.

#### Scenario: A clean isolated installation builds a study

- **WHEN** only the packaged skill and Node are available
- **THEN** every practice SHALL resolve to its runnable offline specimen and required assets
- **AND** a navigation specimen SHALL have its required second document.

#### Scenario: An output already exists or a feature is unsupported

- **WHEN** the builder receives an existing output or the browser cannot run an advanced feature
- **THEN** the builder SHALL refuse overwrite and the browser limitation SHALL remain explicit
- **AND** source/structural checks SHALL NOT be presented as Component Conformance or Visual Acceptance.

### Requirement: Native verification preserves physical root identity

The existing containment and Git snapshot helpers SHALL recognize equivalent physical Windows directory spellings without treating an outside link or a distinct case-sensitive directory as the same authorized root. Native task coordinates SHALL remain consistent with the observed Git baseline. Existing snapshot, scope and receipt lineage SHALL remain authoritative.

#### Scenario: A task root has a Windows short-name alias

- **WHEN** native dispatch and Git discovery use different spellings of the same physical directory
- **THEN** dispatch SHALL retain that directory's physical identity and interpret task scope within the observed Git root
- **AND** equivalent spelling SHALL NOT itself block task verification

#### Scenario: An artifact uses an absolute spelling of its junction-root directory

- **WHEN** an accepted absolute path identifies a file within the caller's physical root using another spelling
- **THEN** the existing resolver SHALL return its equivalent path in the caller-root coordinates
- **AND** generated artifact metadata SHALL remain a contained relative path without a parent-directory escape

#### Scenario: An alias crosses an unauthorized boundary

- **WHEN** a path uses an external junction, linked ancestor, unresolved link or distinct case-sensitive root
- **THEN** existing containment and identity checks SHALL reject that path
- **AND** spelling normalization SHALL NOT expand the task's authorization
- **AND** a relative path outside the caller's lexical root SHALL NOT be accepted as an absolute physical alias

### Requirement: Native QA reports actual failed observations

Native QA SHALL report the failed attempt's code and reason when a run has no notice, and SHALL distinguish a measured semantic failure from unavailable, incomplete or drifted verification. A failed verification SHALL NOT be interpreted as user visual acceptance or rewritten as passed by a successful focused rerun.

#### Scenario: A handled task failure has no run notice

- **WHEN** a component run fails and an assertion expects review or completion
- **THEN** the assertion SHALL retain its expected-status failure with the latest attempt's diagnostic code and reason
- **AND** an undefined message SHALL NOT mask it with a separate argument-type error

#### Scenario: Verification cannot observe a changed output

- **WHEN** a changed output's capture or tool operation blocks before a complete semantic measurement
- **THEN** native progress SHALL preserve the previous observed failure evidence and SHALL NOT count a new semantic attempt
- **AND** QA SHALL expose the blocking reason before interpreting the failure counter

### Requirement: Complete pinned Taste source

The pipeline SHALL ship the complete reviewed Taste-Skill Git tree with all thirteen skills, research and supporting files, preserving original bytes and modes. Provenance SHALL bind revision, Git tree, per-object identities, canonical hash and MIT license through existing snapshot and resource mechanisms.

#### Scenario: Reviewed source is internalized

- **WHEN** a clean explicitly reviewed revision is imported
- **THEN** the complete source inventory and all thirteen skill names SHALL match the preserved Git blobs
- **AND** required package resources SHALL include their complete local source.

#### Scenario: An import or snapshot cannot be trusted

- **WHEN** the source is dirty, unreviewed, incomplete or a locked blob is changed, missing or added
- **THEN** import or source verification SHALL fail without approving a new baseline
- **AND** a failed import SHALL preserve the prior snapshot.

### Requirement: Task-selected built-in Taste capability

The pipeline SHALL expose all thirteen Taste capabilities through a maintained local selection/adaptation guide and its existing entry, frontend, brand and visual-asset routes. Installed packages SHALL provide the source without external Taste skills. Every entry SHALL identify its output, project use and verification boundary.

#### Scenario: A clean installation selects a capability

- **WHEN** only the packaged design-pipeline skill is installed
- **THEN** existing entry/routing guidance SHALL reach the appropriate complete local skill
- **AND** source, guide and resource checks SHALL establish built-in availability independently of host Taste installations.

#### Scenario: A source preference conflicts with the task

- **WHEN** upstream style, framework, randomness, image-first or copy preferences conflict with user references, project design or accessibility requirements
- **THEN** the maintained guide SHALL adapt the selected method within the existing project contracts
- **AND** source availability or a successful gate SHALL NOT imply Visual Acceptance.

#### Scenario: An image-only capability is selected

- **WHEN** the request selects web concepts, mobile concepts or a brand board
- **THEN** the guide SHALL use the available image-generation capability and distinguish image output from implemented behavior
- **AND** lack of an image provider SHALL remain explicit rather than claiming images were produced.

### Requirement: Capability-selected engineering companions

The pipeline SHALL select engineering companions by the current framework and requested or required capability. Next.js methods SHALL require a Next.js project. Cache Components adoption SHALL require authorized adoption or demonstrated task need; optimization SHALL require affected existing cache boundaries.

#### Scenario: Ordinary UI work does not need specialized caching

- **WHEN** an ordinary React component or Next.js visual change has no cache adoption or optimization need
- **THEN** engineering guidance SHALL select only the capabilities needed for that task
- **AND** the presence of an installed companion SHALL NOT require its unrelated procedure.

#### Scenario: An applicable companion is absent

- **WHEN** a selected engineering companion is unavailable
- **THEN** the pipeline SHALL use applicable project and bundled guidance with a relevant fallback record
- **AND** only missing inputs or services required by the requested output SHALL block that work.

### Requirement: Observable skill eval coverage

The skill eval suite SHALL check actual state, observable behavior signals and nonempty artifacts for its named supporting CSS, quick Chinese UI and missing-reference cases. Deterministic fixture/CLI regressions SHALL be reported separately from independent-agent forward tests and other cases' manifest/routing coverage. Neither SHALL grant Visual Acceptance.

#### Scenario: Named behavior expectations are executed

- **WHEN** the supporting CSS or quick Chinese UI regression runs with available browser tooling
- **THEN** it SHALL execute the actual rendered fixture and applicable public workflow
- **AND** wrong expected state, a missing required signal or a missing required artifact SHALL fail
- **AND** quick UI completion SHALL retain `visualAcceptance: not-evaluated`.

#### Scenario: Required reference input is unavailable

- **WHEN** the missing-reference regression checks pending source input and attempts resolution without its file
- **THEN** the public check SHALL return blocked with exit 2 and source-pending reason
- **AND** failed resolution SHALL preserve the pending input bytes and null source path/hash.

#### Scenario: A browser prerequisite is absent

- **WHEN** a named rendered-fixture regression cannot obtain its existing browser tooling
- **THEN** the skipped case SHALL remain visible and SHALL NOT be reported as a behavioral pass.

### Requirement: Complete film method source snapshots

The packaged skill SHALL preserve both reviewed redistributable film-method Git trees with original bytes, file inventories, hashes and notices. Import SHALL reject an unreviewed revision or altered checkout and preserve the previous snapshot on failure.

#### Scenario: Complete sources travel with an isolated installation

- **WHEN** the package is installed without ambient Cinetic or product-film-skill
- **THEN** every reviewed tracked blob SHALL remain readable locally and match its locked identity
- **AND** excluded external media SHALL have a stated boundary.

#### Scenario: Arbitrary source refresh is refused

- **WHEN** an import uses an unreviewed revision or modified source
- **THEN** it SHALL fail without replacing the previous snapshot.

### Requirement: Film methods activate within existing task contracts

Film adaptations SHALL activate only for explicit applicable film or motion-loop tasks and map selected methods into existing artifacts and verification. Project brand, components, constraints and engine selection SHALL remain authoritative; source scripts SHALL not become runtime dependencies merely by being packaged.

#### Scenario: A product film is planned

- **WHEN** a product-film method is selected
- **THEN** planning SHALL discover real design/component sources, record provenance and produce an existing-contract plan suitable for actual rendering and validation
- **AND** it SHALL distinguish callable adaptations from source-only scripts and technical checks from Visual Acceptance.

#### Scenario: An ordinary interface task is selected

- **WHEN** the task is ordinary UI or CSS work
- **THEN** film methods SHALL NOT take over its workflow or require a soundtrack, storyboard, Remotion or higher frame rate.

#### Scenario: A short loop uses Cinetic methods

- **WHEN** an explicit short loop selects a technique and timing method
- **THEN** its plan SHALL preserve user constraints and use existing timeline/render verification
- **AND** randomness or upstream style bans SHALL NOT silently determine the result.

### Requirement: Prompt Motion references retain observation limits

Prompt Motion case references SHALL identify author, original repository, applicable tasks, transferable methods, observed content and observation limits. They SHALL enter the existing reference evidence flow without mirroring works lacking redistribution authority.

#### Scenario: Only a case page was read

- **WHEN** an agent has read page text without watching its video or hearing its soundtrack
- **THEN** motion and audio SHALL remain unobserved
- **AND** proposed transfers SHALL be labelled adaptations rather than measured case facts.

### Requirement: Maintained film tools have bounded execution evidence

New maintained film tools SHALL have reproducible selection, planning, actual artifact and existing validation evidence for a branded product task and a short motion task. Platform and provider claims SHALL be limited to executed environments and observed outputs.

#### Scenario: Windows execution evidence is reported

- **WHEN** a maintained helper and selected existing renderer pass on Windows
- **THEN** the claim SHALL cover those entries only
- **AND** unexecuted upstream scripts, WSL, cloud services and unheard audio SHALL remain explicitly unverified.

### Requirement: Maintained case and recipe library
The pipeline SHALL keep source-attributed Prompt Motion discovery candidates separate from curated recipe templates. Recipes SHALL state task fit, replaceable inputs, sequence, motion invariants and observation limits. Library inclusion SHALL NOT imply a runnable project or visual acceptance.

#### Scenario: Prompt becomes a maintained recipe
- **WHEN** a source prompt is reviewed
- **THEN** an authored recipe records the exact case source and adaptation, without mirroring its video or treating page text as observed motion

#### Scenario: Case is indexed but not reviewed
- **WHEN** a homepage card is inventoried
- **THEN** it is labelled a candidate and does not acquire a curated or rendered status

### Requirement: Offline read-only template access
The existing film CLI SHALL search curated recipes and show a selected template from the installed package without network access or writes. Discovery candidates SHALL require an explicit selection. Invalid IDs or malformed catalog data SHALL fail as contract errors.

#### Scenario: Relocated library selection
- **WHEN** a clean relocated installation searches or selects a template
- **THEN** it resolves bundled recipes and sources and retains recipe-only, unrendered and unobserved limits

#### Scenario: Unknown template
- **WHEN** a nonexistent template ID is requested
- **THEN** selection fails without modifying project files

### Requirement: Reviewable index maintenance
Refreshing source discovery SHALL produce reviewable added, changed and removed case metadata from a supplied homepage snapshot. It SHALL NOT execute source scripts, approve recipes, delete curated templates or overwrite existing output. Malformed or duplicate source entries SHALL be rejected.

#### Scenario: Upstream case changes or disappears
- **WHEN** the refreshed homepage changes metadata or omits a recorded case
- **THEN** the candidate diff records the change for review while curated recipes remain intact

#### Scenario: Unsafe refresh input
- **WHEN** source records are missing, malformed or duplicated, or the output already exists
- **THEN** maintenance fails without replacing the reviewed index or existing output

### Requirement: GEPA is a packaged independent supporting tool

The pipeline SHALL expose a separately runnable guidance optimizer through the supporting-tool path, with the complete pinned official source skill, license and byte-verifiable provenance. Optimization SHALL use the reviewed native engine and SHALL NOT become a mandatory production stage or require a global skill installation.

#### Scenario: Explicit guidance optimization

- **WHEN** a user requests offline improvement of a bounded design instruction
- **THEN** the supporting-tool route SHALL provide the packaged guide and callable optimizer
- **AND** ordinary design delivery SHALL retain its existing workflow.

#### Scenario: Source revision or bytes drift

- **WHEN** import receives a dirty or unreviewed source, or packaged source bytes drift
- **THEN** verification SHALL fail while preserving the previously imported snapshot.

#### Scenario: Installed runtime provenance is unknown or unreviewed

- **WHEN** the selected Python environment lacks the recorded Git commit matching the bundled source manifest, or imports GEPA from another location
- **THEN** optimization SHALL fail before invoking the native engine or creating experiment output
- **AND** a package version label alone SHALL NOT establish the reviewed runtime.

### Requirement: Optimization experiments freeze independent case splits

Each optimization SHALL require a seed, a trusted task evaluator, nonempty disjoint training, validation and final-test fixtures with unique ids, an explicit proposer or reflection model, and a finite positive evaluation budget. Inputs SHALL be validated before optimization and bound by hashes in the local experiment record.

#### Scenario: Missing or overlapping fixtures

- **WHEN** fixture ids overlap, a split is empty, or required inputs are missing
- **THEN** the request SHALL fail before optimization or output-directory creation.

#### Scenario: Final-test evidence remains independent

- **WHEN** candidates are generated and selected
- **THEN** final-test fixtures SHALL remain outside search and selection
- **AND** the seed and selected candidate SHALL be compared on final-test fixtures outside search, with the comparison available after search.

### Requirement: Native optimization produces reviewable candidates

The optimizer SHALL feed finite evaluator scores and diagnostic feedback into native candidate search, retain native history and parent relationships, and export the selected candidate and seed diff. Outputs SHALL use a fresh local experiment directory, preserve failed-run evidence and SHALL NOT overwrite the seed or frozen inputs.

#### Scenario: Synthetic native search succeeds

- **WHEN** a deterministic evaluator and proposer expose an improving candidate
- **THEN** native search SHALL evaluate and select it, export its diff and retain candidate lineage
- **AND** the result SHALL be identified as integration evidence rather than design-quality improvement.

#### Scenario: Invalid score or existing output

- **WHEN** an evaluator returns a non-finite score or output already exists
- **THEN** execution SHALL fail without replacing earlier results or reporting success.

### Requirement: Search results preserve existing adoption authority

Search outputs SHALL remain reviewable proposals. Packaged guidance adoption SHALL use the feedback/OpenSpec maintainer workflow; finite project/user adaptation SHALL retain its existing lifecycle. Component Conformance and Visual Acceptance SHALL remain separate; search scores SHALL NOT grant gate passage, visual acceptance or installed-skill promotion.

#### Scenario: Search score improves

- **WHEN** the optimizer selects a higher-scoring guidance candidate
- **THEN** its output SHALL remain proposed until independent applicable checks and review
- **AND** it SHALL NOT change evaluation criteria, constraints, gates, policy digests or live installed skills.

#### Scenario: Required evidence fails or is unknown

- **WHEN** candidate evaluation has failed or unknown required evidence
- **THEN** existing checks SHALL retain that outcome regardless of aggregate search score
- **AND** the evaluator SHALL not turn missing evidence into a successful observation.

### Requirement: Native completion requires task work beyond verifier evidence

Native completion SHALL observe at least one task-window change within the current task's source scope or declared outputs before verification writes and through snapshot rechecks. Exact verifier-owned check reports, completion metadata and native state/event controls SHALL NOT count as task work. Dispatch and scope repair SHALL preserve their existing baseline behavior.

#### Scenario: A pre-existing good page is submitted unchanged

- **WHEN** a dispatched task has a passing output but no new task change
- **THEN** completion SHALL remain blocked before browser execution or report/metadata writes
- **AND** repeating next or completion SHALL retain the original baseline

#### Scenario: Only verifier-owned files change inside a broad source scope

- **WHEN** the only task-window changes are exact reports, completion metadata or native state/event controls
- **THEN** completion SHALL remain blocked
- **AND** a real source or declared output edit in the same directory SHALL remain eligible

#### Scenario: A real task edit is measured repeatedly

- **WHEN** an actual scoped edit is retained while a failed verifier is rerun
- **THEN** existing observed failure evidence and counts SHALL remain valid for the measured snapshot
- **AND** a passing supported verifier SHALL complete that current snapshot without granting Visual Acceptance

### Requirement: Native contract rejection checks do not require a browser

Repository tests SHALL exercise browser-independent native contract failures without resolving Chrome. Scenarios that execute the browser SHALL use existing tool resolution and skip only when required tools are unavailable.

#### Scenario: Chrome is unavailable during contract rejection checks

- **WHEN** missing-plan, guide-conflict or report-only fixtures reject before browser execution
- **THEN** those checks SHALL run and assert their contract failures even if Chrome resolution would fail

### Requirement: Windows namespace aliases preserve contained artifact coordinates

The existing containment and artifact v1 helpers SHALL accept equivalent Windows namespace paths in either direction while retaining caller-root coordinates and physical identity checks. Namespace root traversal SHALL terminate safely. Artifact metadata and receipt lineage SHALL remain unchanged.

#### Scenario: Existing and future paths use the other namespace spelling

- **WHEN** an absolute existing or future path identifies a location within the caller's physical root using its equivalent namespace spelling
- **THEN** the resolver SHALL return that location within the caller's lexical root
- **AND** namespace volume-root traversal SHALL NOT throw an unrelated filesystem error

#### Scenario: An artifact caller uses a namespace root

- **WHEN** artifact creation or validation receives a namespace caller root and a contained file
- **THEN** metadata SHALL retain a relative contained path with the actual file hash
- **AND** subsequent validation SHALL retain its ready status without changing dependencies or input hashes

#### Scenario: Namespace spelling attempts to bypass containment

- **WHEN** a namespace path uses an external junction, linked ancestor, distinct physical directory, unavailable identity or relative parent traversal outside the caller's root
- **THEN** existing containment checks SHALL reject that path
- **AND** namespace handling SHALL NOT expand the authorized root
