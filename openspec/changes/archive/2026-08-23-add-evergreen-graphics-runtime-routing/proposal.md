# Proposal: Add evergreen graphics runtime routing

## Why

Design Pipeline needs durable support for 2D, 3D, game UI, Galgame, data visualization,
geospatial, and GPU surfaces without coupling the workflow to whichever library or model is
currently popular. PixiJS covers a specialized renderer route, but a full game runtime and an
engine-independent spatial contract are still missing.

## What changes

- Add stable graphics capability families and a machine-readable adapter catalog.
- Add change `scene.md` as the runtime-neutral contract for spatial state, lifecycle, assets,
  input, performance, accessibility, degradation, determinism, and cleanup.
- Add native Phaser v4 routing for complete browser-based 2D game work.
- Add game UI and narrative/Galgame rules for dialogue, choices, backlog, skip, autoplay,
  save/load, localization, and accessibility.
- Keep credentialed hosts optional and unverified community packs outside automatic install paths.

## Non-goals

- Installing every 2D or 3D library.
- Replacing a target repository's accepted renderer or engine.
- Turning runtime APIs into the design or motion language.
- Vendoring community prompt or skill content.
