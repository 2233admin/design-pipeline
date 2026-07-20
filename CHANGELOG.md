# Changelog

All notable changes to Design Pipeline are documented here.

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
