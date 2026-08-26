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
behavior, and unchanged repository status.

#### Scenario: Packaging fails after a previous successful build

- **WHEN** a required resource is missing or invalid
- **THEN** packaging SHALL fail without corrupting the prior artifacts
- **AND** no source-tree mutation SHALL be introduced by QA.

### Requirement: Contribution standards

The repository SHALL document how contributors propose changes, validate changes, and handle external skill intake.

#### Scenario: Contributor proposes an external skill

- **WHEN** a contributor proposes a new external skill source
- **THEN** the contribution SHALL classify it using the curation policy outcomes before it can be accepted.

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

The design-pipeline self-check MUST detect the full companion set when installed via the team `design` profile:

**Visual taste**

- `frontend-design`
- `design-taste-frontend`
- `ui-ux-pro-max`
- `web-design-guidelines`
- `emil-design-eng`

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

Missing optional companions remain fallback-safe; missing required `design-pipeline` skill still fails the check.

#### Scenario: The full design profile is installed

- **WHEN** self-check runs with every companion listed above installed
- **THEN** it SHALL detect every companion in its corresponding capability group
- **AND** the required core pipeline check SHALL pass.

#### Scenario: An optional companion is missing

- **WHEN** one or more optional companions are unavailable
- **THEN** self-check SHALL report `WARN`, identify the missing capability or marker, preserve the
  documented fallback, and remain usable
- **AND** a missing required `design-pipeline` skill SHALL still fail the check.

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
versioned, inspectable artifacts. Effective compatible guidance SHALL resolve in the order current
task > project > user > defaults, with mutually exclusive values keyed by collaboration dimension
rather than caller-defined rule id. Project constraints and quality gates SHALL NOT be weakened,
suppressed, or bypassed by any adaptation layer.

#### Scenario: Conflicting scoped guidance is resolved

- **WHEN** a current task, project skill, user skill, and defaults offer conflicting compatible
  workflow choices
- **THEN** the resolver SHALL select the current-task value before project, user, and defaults
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
instructions. The pipeline SHALL evaluate every candidate independently
on a held-out set and replay set against the incumbent using a pinned common manifest. It SHALL
promote only if all required gates pass, evidence is complete, and the predeclared primary metric is
strictly improved in its declared direction against the incumbent in every required comparison. The pipeline SHALL reject, revert,
expire, or forget candidates that do not qualify.

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

