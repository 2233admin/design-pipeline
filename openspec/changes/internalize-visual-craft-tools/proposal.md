# Internalize visual craft tools

## Why

The user clarified that design-pipeline assists an agent's graphics, imagery, drawing, frontend,
design, typography and rendering judgment across deliverables. The prior animation change is one
part of that capability. huashu-art-motion contains useful executable craft beyond film grammar;
linking it or repeating its advice does not make those tools available to a smaller model.

## Changes

- Put the capabilities in `skill/tools/`, with a short index, per-tool guides, and source/example
  files disclosed only when needed. Keep 17 reviewed library modules and seven utility scripts
  locally with pinned hashes and their MIT notice for selective adaptation.
- Adapt useful drawing, deterministic texture, path, typography and image-placement primitives
  into a small local Canvas library with explicit inputs and no upstream scene/font/character globals.
- Add image comparison diagnostics to the existing composition namespace and spatial motion maps
  to the existing video-reference analysis. Reuse PNG, capture, containment and evidence contracts.
- Provide a runnable cross-surface study and concrete invocation guidance; retain DOM text and
  existing runtime selection for frontend work. No compulsory film, soundtrack or artist preset.
- Record source-level adoption decisions for the upstream libraries and utilities, including what
  our current tools already cover and what remains specialized or dependent on supplied assets.

## Boundaries

Upstream: alchaincyf/huashu-art-motion at 26dba25b2b495c2138848c29a2c90df356a20325 (MIT),
confirmed against remote HEAD on 2026-10-06. Preserve attribution for adapted code. Do not import
upstream instructions, personal character art, font binaries, or a second film/render runtime.
No new gate, receipt schema, target resolver, policy digest, dependency installation or model ID.
Technical diagnostics do not grant Visual Acceptance or predict quality across models.
