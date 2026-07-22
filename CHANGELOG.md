# Changelog

All notable changes to Design Pipeline are documented here.

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
