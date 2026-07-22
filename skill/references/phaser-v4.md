# Phaser 4 Game Runtime Route

Use Phaser when a web product needs an integrated 2D game framework: scenes, cameras, input,
audio, physics, asset loading, game objects, time, scale, and game-state lifecycle. Use PixiJS when
the need is primarily rendering and the project should own the surrounding systems itself.

Reviewed baseline: Phaser 4.2.1 on 2026-07-23. Phaser is MIT licensed.

## Selection Boundary

Prefer Phaser for:

- playable 2D games, minigames, game-like interactions, and game UI;
- scene/state transitions, cameras, tilemaps, input, audio, timing, or physics;
- Galgame/narrative projects that want Phaser to own backgrounds, characters, effects, and scene
  state while semantic DOM owns dialogue and controls;
- an existing Phaser 3/4 repository whose conventions should be preserved.

Prefer PixiJS for a custom 2D visualization or effect that does not need a full game framework.
Prefer DOM/CSS for primarily textual application UI. Prefer Three.js/Babylon.js/PlayCanvas for true
3D requirements.

## Required Artifacts

Before implementation:

- validate project `DESIGN.md` and `MOTION.md`;
- create change `design.md`, `motion.md`, and `scene.md`;
- use `references/scene-runtime-spec.md`;
- use `references/game-ui-and-narrative.md` for HUD, menu, dialogue, choice, backlog, save/load,
  skip, auto-play, localization, or Galgame work.

## Phaser Ownership

`scene.md` must define:

- the single `Phaser.Game` owner and boot/destroy path;
- scene preload/create/update/shutdown transitions and preserved state;
- renderer mode and fallback, Scale Manager/aspect policy, cameras, layers, and coordinates;
- asset packs, loading/error states, cache ownership, audio unlock, and disposal;
- input actions across keyboard, pointer/touch, and gamepad, including rebinding and modal capture;
- physics ownership and fixed/variable timestep when physics is used;
- DOM overlay ownership for accessible menus, dialogue, settings, text input, and forms;
- pause/visibility/route/unmount behavior and listener/timer/tween cleanup;
- deterministic seeds, save data, replay fixtures, and capture conditions;
- mobile, low-end, DPR, frame-time, draw-call, memory, and effect budgets.

## DOM And Game UI

Phaser DOM Elements can align HTML above the canvas, but they remain a separate DOM layer with
camera, clipping, nesting, and input limitations. Use them deliberately. Critical UI should remain
semantic, keyboard-operable, and screen-reader understandable.

For complex menus, dialogue, backlog, save/load, configuration, account, or commerce UI, prefer a
framework/DOM overlay synchronized with explicit game-state events. Do not rasterize readable UI
into the canvas only to make it visually consistent.

## Version And Skill Policy

Phaser 3 and Phaser 4 APIs and renderer behavior are not interchangeable. Record the installed
version and verify against version-matched official documentation.

The official Phaser Game Agent MCP is an optional credentialed, metered host. It is never required
for local pipeline use and must not be installed or invoked without explicit authority, cost, and
data-boundary review.

Community Phaser skill packs remain `curation-candidate` until license, scripts, version coverage,
security, and failure guidance pass review. The native Phaser route works from these pipeline
contracts plus official documentation even when no companion skill exists.

## QA Minimum

Verify boot/loading failure, every scene transition, repeated input, pause/resume, route exit,
remount, orientation/DPR changes, mobile safe areas, audio unlock, reduced motion/effects,
keyboard/screen-reader UI, save/load compatibility, localization expansion, deterministic replay,
and measured low-end performance.

## Official Sources

- Phaser repository: https://github.com/phaserjs/phaser
- Phaser documentation: https://docs.phaser.io/
- Phaser 4 releases: https://phaser.io/download/phaser4
- Phaser Game Agent MCP: https://phaser.io/news/2026/07/phaser-game-agent-mcp-setup
