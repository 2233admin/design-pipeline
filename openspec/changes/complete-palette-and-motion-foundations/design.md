# Design: palette and motion foundations

## Palette Gate

Each website-cloning target owns `palette-evidence.json`. The contract keeps DOM-computed colors and
raster/media colors separate, then requires semantic roles, coverage relationships, luminance
hierarchy, saturation and temperature posture, and target-project tokens.
Evidence paths are portable, research-relative, path-contained, and must identify existing files.
Semantic roles and tokens are cross-validated instead of accepted as two disconnected lists.

Initialization writes a pending scaffold. The evaluator calls the same deterministic core checker
used by the standalone command. Exact and adaptive fidelity share the gate.

## Motion Foundation

The project root owns `MOTION.md` with:

- machine-readable frontmatter and one consistent required-heading language;
- an explicit posture, including `static`;
- principles, vocabulary, procedural policy, runtime policy, reduced-motion behavior, and source
  decisions;
- stable primitive IDs from `motion-primitives.json`;
- no executable procedural content.

The checker returns:

- `ready`, exit code 0;
- `invalid`, exit code 1;
- `synthesis-required`, exit code 2.

Design-synthesis continuation records the foundation path, status, content hash, posture, registry,
and selected primitives before implementation.

## Two-Level Motion Contract

Project `MOTION.md` defines reusable semantics. Change `motion.md` selects those semantics and adds
scenes, tracks, triggers, runtime bindings, interruption, degradation, accessibility, performance,
and evidence. Runtime libraries remain adapters.

## Provenance

The primitive registry is original metadata. Public projects may inform taxonomy or observable
behavior, but their implementation is not copied. Each registry entry records provenance and
`codeCopied: false`.

## CLI Boundary

The current scripts remain the kernel. A future `designer-pipeline` CLI owns orchestration and
evidence, while standalone document tools own `DESIGN.md` and `MOTION.md` semantics. Reference
catalogs are optional, attributed providers.
