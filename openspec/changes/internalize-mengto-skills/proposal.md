# Proposal: internalize the complete MengTo skills library

## Why

The pipeline currently depends on scattered companion skills and summaries for many visual,
motion, WebGL, reference-analysis, and game-design workflows. `MengTo/skills` contains a coherent,
demo-backed library, but a network link or optional global install cannot provide a complete,
repeatable pipeline contract.

## What

- Pin and bundle every tracked file from one reviewed upstream revision.
- Preserve upstream bytes and MIT attribution instead of rewriting source files.
- Add a machine-readable catalog for all skills and a deterministic local search command.
- Overlay project-specific stage routing, activation boundaries, dependency discipline, and QA.
- Add a clean-room Kage case-study delta for the separately published, no-license repository rather
  than importing its newer source or artwork into the MIT snapshot.
- Prove completeness through revision, Git tree, file/byte counts, and a canonical tree hash.

## Boundary

The bundled library is inert reference material. Search does not execute demos, scripts, runtime
assets, install dependencies, or authorize paid, credentialed, privacy-sensitive, publication, or
other external actions.
