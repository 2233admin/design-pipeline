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

### Requirement: Bundled MengTo skills library

The pipeline SHALL ship every tracked file from one pinned, MIT-attributed `MengTo/skills`
revision as a core offline resource. It SHALL expose all skills through a machine-readable catalog
and deterministic local search while keeping target-project design and engineering contracts
authoritative.

#### Scenario: A matching design workflow exists upstream

- **WHEN** a change needs visual direction, motion, reference analysis, WebGL, assets, game design,
  implementation, or verification guidance
- **THEN** the pipeline SHALL search all bundled skills and return exact local source paths
- **AND** the selected workflow SHALL be adapted through project `DESIGN.md`, `MOTION.md`, existing
  dependencies, accessibility, performance, and QA requirements.

#### Scenario: The bundled source tree drifts

- **WHEN** any tracked upstream file is missing, added, or byte-altered
- **THEN** deterministic verification SHALL block on count, byte count, or canonical tree hash
- **AND** a valid update SHALL change revision, Git tree, inventory, attribution, and hash together.

#### Scenario: A bundled workflow needs external authority

- **WHEN** a playbook involves accounts, credentials, paid services, publication, private data,
  social posting, voice generation, or other external side effects
- **THEN** its presence in the package SHALL NOT grant authority
- **AND** the pipeline SHALL use it only for a matching explicit request under normal host
  boundaries.

#### Scenario: Kage is used as a scroll-world reference

- **WHEN** a task cites the separately published `MengTo/kage` repository
- **THEN** the pipeline SHALL route through the bundled `web-design/build-threejs-scroll-worlds`
  playbook plus the clean-room Kage case study
- **AND** it SHALL preserve the current repository's no-license boundary by importing no source,
  font, generated image, foreground artwork, or other project asset.

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

### Requirement: Bundled Prism System design intelligence reuses native contracts

The pipeline SHALL ship the complete design-skill subtree from one pinned, MIT-attributed
`appariciojunior/PrismSystem` revision. It SHALL expose all 107 skills through deterministic local
search and SHALL expose Prism's `prototype`, `ui-craft`, `new-experience`, `handoff`, and
`corpus-distill` intake routes without creating a second design-system runtime.

#### Scenario: A product-design request enters the pipeline

- **WHEN** the request concerns Design DNA, prototyping, UI craft, a new experience, handoff, or
  design-corpus learning
- **THEN** Stage 0 SHALL classify it through the five-route front door and load only the returned
  local skills
- **AND** those skills SHALL execute through the existing brief, directions, implementation, and
  QA artifacts with project `DESIGN.md`, `MOTION.md`, tokens, catalogs, and adapters authoritative.

#### Scenario: Brand evidence becomes design-system knowledge

- **WHEN** screenshots, Figma evidence, or other references teach the system about a brand
- **THEN** raw evidence SHALL remain attributable and separate from distilled, versioned rules
- **AND** semantic tokens and platform projections SHALL remain traceable to project-owned brand
  inputs and explicit derivation recipes.

#### Scenario: The bundled source or registry drifts

- **WHEN** any mirrored skill-layer file is missing, added, or byte-altered, or either registry no
  longer matches its declared skills and routes
- **THEN** deterministic verification SHALL block on file count, byte count, canonical hash, Git
  tree/blob identity, registry count, category count, or route references.

#### Scenario: An upstream skill declares autonomous execution

- **WHEN** a bundled recipe carries an upstream autonomy label
- **THEN** that label SHALL NOT grant paid, credentialed, destructive, publishing, messaging, or
  other external authority
- **AND** current workspace and project rules SHALL continue to govern all actions.

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

