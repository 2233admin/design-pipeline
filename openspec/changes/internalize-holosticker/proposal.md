# Proposal: internalize Holosticker

## Why

The pipeline needs a real, offline implementation route for holographic sticker rendering instead
of repeatedly recreating foil shaders, die-cut masks, peel geometry, and export behavior from a
visual reference.

## What

- Preserve the complete pinned MIT-licensed `jal-co/holosticker` repository.
- Expose its eight implementation slices through deterministic local inspection.
- Route selected slices through the existing Three.js scene contract without automatically adding
  the full Studio UI or optional export dependencies.
- Add provenance, integrity checking, package inclusion, capability routing, and tests.

## Boundary

The source is bundled as an inert implementation reference. Design Pipeline does not install or
run the upstream Vite application, does not add analytics, fonts, shadcn controls, or `gifenc` by
default, and does not replace target-project design, motion, accessibility, or runtime contracts.
