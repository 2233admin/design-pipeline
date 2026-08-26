# Proposal: add a bounded PixiJS v8 rendering route

## Why

The official PixiJS project now publishes a broad Agent Skills suite for PixiJS v8. The pipeline
can currently reason about Canvas and WebGL as generic motion surfaces, but it cannot distinguish a
justified PixiJS scene from ordinary DOM animation, verify whether the companion suite is complete,
or require the lifecycle, performance, accessibility, and fallback evidence needed for production
2D rendering.

## What

- Register the full official PixiJS skill suite as an optional companion group.
- Add a bounded production capability profile for the router, Application, accessibility,
  performance, ticker, and environment skills.
- Add a focused PixiJS rendering reference with selection, sub-skill routing, runtime ownership,
  Motion MD, accessibility, reduced-motion, performance, and QA requirements.
- Update runtime routing, project documentation, stable specification, and packaging QA.
- Preserve deterministic tests for absent, partial, and production-ready suite states.

## Non-Goals

- Do not vendor the upstream PixiJS skill suite.
- Do not add `pixi.js` to this repository or to a target application.
- Do not use PixiJS as the default animation runtime.
- Do not replace semantic HTML, project DESIGN/MOTION foundations, or target-repository
  conventions.
- Do not publish, push, or release as part of this change.

## Impact

Agents can select PixiJS only when a dedicated 2D renderer is justified, load the smallest official
sub-skill set, and produce an auditable rendering plan. Missing or partial optional skills remain
non-blocking and fall back to canonical PixiJS documentation with an explicit QA record.
