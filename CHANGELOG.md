# Changelog

All notable changes to Design Pipeline are documented here.

## Unreleased

### Added

- Added mandatory `reference.md` evidence routing for `2d`, `2.5d`, `3d`, and `hybrid` changes.
- Added normative `reference-evidence.json`, the public `reference check` command, and an approval
  gate that blocks implementation when spatial classification is unresolved.
- Added `fixed-camera-cinematic-3d` for authored 3D shots that intentionally expose no user camera
  navigation.
- Added `3d.md` as the direct readable spatial contract for 3D renderer, engine, and geospatial
  families, including an actual-runtime graybox gate before cinematic surface effects.
- Added an explicit change `design.md` boundary for visual language and screen-space UI.
- Added non-downgradable static-reference roles and fidelity modes in
  `reference-evidence.json` v2.
- Added `reconstruction.json`, the public `reconstruction check` command, rectified-front-view and
  camera-calibration gates, independently recomputed landmark error, and hash-bound EvidencePort
  receipts for exact still-frame reconstruction.
- Added an unconditional graybox gate as `reconstruction check --stage graybox`, covering every
  spatial route rather than only `3d` and `hybrid`, with a declared runtime suppression mode, a
  named per-region comparison, and an approval status that must pass before any optical treatment.
- Added `source.availability` to `reference-evidence.json` so a reference supplied only in
  conversation is recorded as `pending` with `pendingReason` and `requestedFrom` instead of being
  omitted, and added the `source-pending` blocked reason that reports `contractValid: true`.
- Added a required per-region structure table to `reference-spec.md` and a matching `composition`
  block in `reference-evidence.json`, so a uniformity claim that contradicts its own regions fails
  validation and the graybox comparison addresses those region ids by name.
- Added a required `Spec Reconciliation` section to change `design.md`, recording the specified
  value, the implemented value, and an observed cause for every value implementation changed.
- Added the public `reconciliation check` command, which reads that section, refuses a cause that
  states an intention rather than an observation, and emits a `design-pipeline.spec-drift.v1`
  record. Both scaffolders now generate the section and the task that fills it.
- Added `stages.graybox` to every `reference check` result, so the graybox verdict is reported on
  every route and in every fidelity mode rather than only when the stage is asked for by name.
- Added the `graybox-comparison-unmeasurable` blocked reason and the `measurable` field, so a
  measured comparison is refused unless the source raster it names is actually on disk.
- Added the `reference-source-unparseable`, `reference-source-malformed`, and
  `reference-source-availability-invalid` blocked reasons, so a source declaration that is present
  but unreadable blocks with `measurements: null` instead of defaulting to resolved.

### Changed

- Reference source resolution now happens at Stage 0: the pipeline resolves the source to a path,
  states what the path unlocks, and records a pending source rather than discovering the gap at
  gate review.
- For a `primary-target` reference, change `design.md` is now written after the graybox capture and
  cites the capture it was written against.
- `reconstruction check` now reports the `graybox`, `geometry`, and `final` stages independently, so
  a blocked measured stage never hides a passing or missing graybox.
- Scene validation now selects `3d.md` for 3D families and keeps `scene.md` for persistent non-3D
  runtimes. Legacy 3D `scene.md` files receive a deterministic upgrade-required rename preview.
- Spatial routing now separates object dimensionality, camera model, interaction model, and output
  surface instead of coupling 3D geometry to camera navigation.
- `reference check` now reports `blocked` whenever the graybox stage is not ready, including on the
  exact-reconstruction path where the geometry stage passes. The gate is no longer one an agent has
  to know to run.
- `graybox.png` is now a required artifact on every reference route rather than only `3d` and
  `hybrid`, matching the unconditional gate.
- `composition` is now a required root key of `reference-evidence.json` v2. A v1 document predates
  the per-region checklist and stays exempt.
- The graybox block now has exactly one contract, shared by `reconstruction.json` and
  `reference-evidence.json`, so a single block can never collect two verdicts from two carriers.
- The graybox comparison's binding to the recorded composition region ids now fires on whichever
  carrier holds the block, so moving the block does not release the binding.
- The geometry gate blocks detail geometry, type treatment, and measured fidelity claims. Optical
  treatment is released by the graybox gate alone, so a blocked geometry stage no longer reads as a
  reason to withhold it.

### Fixed

- Stopped reporting `fidelity-limited` for a reference whose source raster is unavailable. The
  `geometry` and `final` stages now report `blocked` with reason `source-pending` and no
  measurements, so a missing measurement is a status rather than a fabricated value.
- Stopped letting a pending source move `intent.requestedFidelity` or `intent.effectiveFidelity`.
  Only an explicitly approved downgrade changes the fidelity contract.
- Stopped accepting a declared source path as evidence that the source exists. Measurability is
  read from disk, so a `measured` comparison against a raster that was never written blocks and
  grants no fidelity evidence. The declared mode is still reported as declared rather than quietly
  rewritten.
- Stopped accepting a bare `runtimeMode` token as proof that the emissive, optical, and texture
  layers were disabled. A token that names no disabled layers is a declaration the gate cannot
  check, so it now blocks with `graybox-mode-unverifiable`. The document stays contract-valid;
  expanding the token into `{mechanism, token, disables}` clears the block.
- Stopped folding an unreadable reference document into the absent case. An absent file and an
  absent field still default to `resolved`; a document that is unparseable, records a non-object
  `source`, or declares an out-of-enum `source.availability` now blocks with its own reason before
  any landmark math runs.
- Stopped accepting one named exception as proof that a non-uniform composition is accounted for.
  Every region that departs from the modal row and column structure must now either record what it
  breaks from or be named by a region that does.
- Made packaging, installation, `doctor`, and dependency self-check use one required-resource
  manifest, so incomplete installations fail instead of reporting ready.
- Made local installation validate the staged package and Node.js 22+ before replacing an
  existing installation.
- Rejected non-SemVer release versions and stopped interpolating workflow-dispatch input into
  shell commands.

## [0.7.3] - 2026-07-28

### Changed

- Rewrote the README introduction in plain language around the user problem and outcome.
- Documented Node.js 22 as the supported runtime and added Windows release-install and upgrade
  commands.
- Ignored local MCP, OMX, Repowise, Understand Anything, and Sentrux runtime output without
  ignoring the tracked Sentrux rules.

## [0.7.2] - 2026-07-28

### Fixed

- Standardized Python guidance and validation on Python 3.13.
- Reframed LearnUI as an optional attributed reference instead of a native catalog roadmap.
- Ignored local .gstack runtime state so internal terminal tokens cannot be staged accidentally.

## [0.7.1] - 2026-07-23

### Fixed

- Packaged installers now default `--source` to the extracted package root, and release QA runs
  the documented no-`--source` installation path.
- Corrected the release install example so `--root` is the destination skills directory.

## [0.7.0] - 2026-07-23

### Added

- Added capability-first routing for the official PixiJS v8 skill suite, including a production
  compatibility profile and a focused rendering contract for scene ownership, lifecycle,
  performance, accessibility, reduced motion, and runtime fallback.
- Added deterministic self-check coverage for absent, partial, and production-ready PixiJS skill
  installations.
- Added a machine-readable graphics runtime catalog with stable capability families across
  semantic UI, data/vector graphics, 2D editors and renderers, 2D/3D game engines, geospatial 3D,
  GPU/shader work, and narrative game UI.
- Added the engine-independent change `scene.md` contract plus native Phaser v4 and game
  UI/Galgame routing. Credentialed hosts and unverified community packs remain optional and are
  never auto-installed.
- Added the unified `designer-pipeline` CLI with stable JSON envelopes and explicit success,
  invalid, and blocked exit semantics.
- Added state/event v2 with a versioned phase registry, deterministic v1 migration, CAS writes,
  writer locks, crash-safe two-file commits, append-only event hashes, and explicit repair.
- Added normative `scene.json`, evidence receipts and trusted local web-capture adapters, motion
  verification, component-state matrices, design tokens, UI IR, design-to-code maps, pattern
  catalogs, required-scenario benchmarks, and local benchmark feedback recording.
- Added a single adapter registry and intake policy for 2D/3D runtimes and design-tool hosts,
  including provenance, license, security, maintenance, degradation, and benchmark admission.

### Changed

- Motion and runtime selection now distinguish a dedicated PixiJS 2D render surface from ordinary
  DOM/SVG animation and require non-overlapping ownership when PixiJS is combined with CSS,
  Anime.js, or GSAP.
- Graphics selection now chooses a durable capability family before an adapter and preserves the
  target project's accepted runtime when it meets the design, accessibility, and performance
  contract.
- `graphics-runtime-catalog.json` now owns family taxonomy and routes only; adapter facts and
  support state live in `adapter-registry.json`.
- Release QA now runs hermetically, proves byte-reproducible archives, installs from the packaged
  artifact into an isolated target, and exercises the installed public CLI.

### Fixed

- Scene validation now distinguishes an honest unavailable/unknown adapter from placeholder prose:
  the document remains valid but execution is blocked.
- Required benchmark failures can no longer disappear inside aggregate scores and may enter the
  redacted, deduplicated local feedback loop without remote publication.

## [0.6.0] - 2026-07-20

### Added

- Added a required project `MOTION.md` foundation with deterministic validation, clean-room motion
  primitives, explicit static posture, runtime policy, reduced-motion substitutions, and
  change-level specialization.
- Added a blocking palette foundation for website-cloning runs, with separate DOM and raster
  evidence, semantic roles, palette relationships, connected implementation tokens, and
  evidence files that remain path-contained after symlink and directory-junction resolution.
- Added contextual anti-slop review that blocks verifiable product-quality failures while keeping
  subjective visual preferences advisory, rejects unknown schema fields, and protects review
  output from symlink and directory-junction escapes.
- Added OpenSpec contracts and guidance for a future orchestration CLI and optional attributed
  design-reference providers.

### Changed

- Design synthesis now requires both project foundations before implementation and records the
  motion foundation hash, posture, registry, and selected primitives in headless state.
- Website-cloning preflight and completion now fail closed when project DESIGN/MOTION foundations
  are missing, when the manifest violates its runtime schema, or when palette evidence is missing,
  disconnected, fabricated, or points outside the target research directory.
- Repository QA, package checks, installed self-check, release documentation, and companion
  resource discovery now cover the new foundations and review surfaces.

### Fixed

- Tightened runtime validation to reject malformed anti-slop policy/source metadata, schema-invalid
  website-cloning manifests, empty motion sections, executable motion content in any section, and
  contradictory static-motion selections.
- Made release archives host-independent and reproducible by deriving package metadata from
  `SOURCE_DATE_EPOCH` or the source commit and writing canonical TAR/GZIP/ZIP structures in Node.
- Made palette validation reject non-object JSON and malformed nested collections as normal
  blocking results instead of surfacing internal property-access or iteration errors.
- Split high-complexity validation paths into smaller helpers and added regression tests for the
  newly exposed edge cases.

[0.6.0]: https://github.com/2233admin/design-pipeline/compare/v0.5.0...v0.6.0
[0.7.0]: https://github.com/2233admin/design-pipeline/compare/v0.6.0...v0.7.0
[0.7.1]: https://github.com/2233admin/design-pipeline/compare/v0.7.0...v0.7.1
[0.7.2]: https://github.com/2233admin/design-pipeline/compare/v0.7.1...v0.7.2
[0.7.3]: https://github.com/2233admin/design-pipeline/compare/v0.7.2...v0.7.3
