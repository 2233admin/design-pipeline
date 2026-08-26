# Design: Evergreen graphics runtime routing

## Decision

Use four durable layers:

1. Project `DESIGN.md` owns visual identity, layout, components, typography, and accessibility
   posture.
2. Project `MOTION.md` and change `motion.md` own temporal semantics, primitives, choreography,
   interruption, and reduced-motion substitution.
3. Change `scene.md` owns spatial and engine runtime details: coordinates, cameras, layers,
   lifecycle, state, assets, input, adapter/version, budgets, determinism, degradation, and
   cleanup.
4. `qa.md` owns evidence that the selected adapter satisfies the contracts.

The graphics catalog classifies the capability before the implementation adapter. Support states
distinguish built-in routes, reviewed companions, optional official hosts, reference-only adapters,
and curation candidates. A catalog entry never authorizes a dependency change.

## Phaser boundary

Phaser v4 is a native route because a browser game often needs one runtime to own scenes, cameras,
scaling, input, audio, physics, the game loop, and game state. PixiJS remains the specialized 2D
renderer route. The official Phaser Game Agent MCP is optional because it requires credentials and
is metered. The reviewed community Phaser pack has no verified repository license, so it has no
install route.

## Narrative boundary

Game UI remains semantic DOM where practical. Dialogue, choice, backlog, skip, autoplay,
save/load, localization, and accessibility are deterministic state transitions, not animation
callbacks. A renderer may decorate or present this state but must not become its source of truth.

## Verification

- Schema-independent catalog tests assert required families and Phaser routing.
- Repository QA parses the catalog, rejects unsafe unverified install routes, and checks routing
  markers and references.
- Full tests, packaging QA, installed self-check, and static quality gates must pass.
