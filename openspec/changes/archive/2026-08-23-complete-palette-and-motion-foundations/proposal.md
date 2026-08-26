# Proposal: complete palette and motion foundations

## Why

The pipeline already requires project `DESIGN.md`, but two high-impact design decisions remained
under-specified:

- website-cloning work could begin from a few visible accent colors without proving the complete
  palette hierarchy;
- motion guidance existed only at change level, so an agent could invent timing, choreography, or
  runtime behavior without a reusable project language.

The pipeline needs blocking foundations for both concerns before it can reliably reproduce and
extend real products.

## What

- Add a palette-evidence contract that separates DOM and raster sources, semantic roles,
  relationships, and implementation tokens.
- Block website-cloning implementation and completion until every declared target has a ready
  palette foundation.
- Add a required project `MOTION.md`, a clean-room primitive registry, and a deterministic checker.
- Link change-level motion specifications to the project foundation by content hash and stable
  primitive identifiers.
- Document a future CLI and optional reference-provider boundary without replacing the current
  deterministic command kernel.

## Non-goals

- Shipping an animation runtime.
- Copying motion-gallery or loader implementation code.
- Treating an external design catalog as a project foundation.
- Publishing remote feedback without explicit authority.
