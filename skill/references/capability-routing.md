# Capability Routing

Route by the design capability the change needs, then use installed skills as implementation lenses. A green folder-presence check does not prove that a companion skill covers the current upstream API.

## Routing Order

1. Preserve the target repo's existing framework, design system, animation runtime, and delivery surface.
2. Identify the capability: evidence, direction, system, assets, motion, runtime animation, framework integration, or QA.
3. Select the smallest companion set that covers the capability.
4. Do not add two overlapping runtime libraries only to gain skills.
5. Record missing or stale companion coverage in `qa.md` and continue with official documentation plus the built-in pipeline gate.

## Capability Map

| Capability | Primary routes | Use when |
| --- | --- | --- |
| Requirements to reusable product design | design-synthesis module, `grill-with-docs`, visual direction/design-system skills, Wayfinder host when oversized | The project lacks a suitable DESIGN.md or needs a new product-specific design system |
| Live-page evidence and reconstruction | website-cloning module, `image-to-code`, Browser/Builder/Evidence ports | Rebuilding or adapting an authorized live reference |
| Visual direction and taste | `frontend-design`, `design-taste-frontend`, `ui-ux-pro-max`, `emil-design-eng` | Choosing composition, hierarchy, density, typography, and interaction posture |
| Design system and brand | `design-system`, `brand`, `brandkit`, `ui-styling` | Defining reusable tokens, components, state variants, and brand rules |
| Visual assets | `imagegen-frontend-web`, `imagegen-frontend-mobile`, image generation tools | A website, portfolio, campaign, or product surface needs real bitmap assets or visual references |
| Motion language and audit | `design-motion-principles`, `animation-vocabulary`, `review-animations`, `apple-design` | Writing `motion.md`, defining timing/easing, or reviewing implemented motion |
| Runtime animation | CSS, `animejs`, GSAP skill set, React View Transitions | Implementing DOM/SVG choreography with the smallest fitting runtime |
| Graphics and game runtime selection | `graphics-runtime-routing.md`, `graphics-runtime-catalog.json`, existing project adapter | Selecting a stable capability family before choosing a 2D, 3D, data, geospatial, GPU, game, or narrative runtime |
| Interactive 2D rendering | official `pixijs` v8 skill suite, `pixijs-rendering.md` | Sprites, particles, filters, shaders, Canvas/WebGL/WebGPU scenes, or high object counts justify a dedicated renderer |
| Complete 2D game runtime | built-in Phaser v4 route, `phaser-v4.md` | Scenes, game-loop ownership, input, cameras, scaling, audio, physics, and game-state transitions belong to one engine |
| Game UI and narrative | semantic DOM plus existing runtime, `game-ui-and-narrative.md` | HUDs, menus, dialogue, choices, backlog, skip, autoplay, save/load, localization, and Galgame interaction state |
| React / Next.js fit | Vercel React skills, Next.js skills, `frontend-patterns` | Protecting composition, rendering, caching, routing, and performance boundaries |
| Editable design handoff | Figma plugin skills when available | The user needs an editable Figma/FigJam/Slides artifact or code-connected design |
| Hosted design delivery | Sites building/hosting skills when available | The result must be published as a durable hosted site |
| Final validation | `design-review`, `review-animations`, browser QA, pipeline scorecard | Proving fidelity, accessibility, responsiveness, motion, and engineering fit |

Figma and Sites are runtime/plugin surfaces. Their absence is not an install-time failure for the standalone skill package.

## Runtime Animation Decision

| Candidate | Prefer when | Avoid when |
| --- | --- | --- |
| CSS transitions/keyframes | One-element state feedback, simple enter/exit, no timeline control | The behavior needs orchestration, interruption control, layout transitions, scroll synchronization, or reusable runtime state |
| Anime.js v4.5 | Modular timelines, layout transitions, text splitting, SVG, draggable interactions, scroll observers, WAAPI, deterministic stagger, or adapter-driven non-DOM targets | The project already standardizes on GSAP and Anime.js adds no unique capability |
| GSAP | Existing GSAP project, deep timeline choreography, ScrollTrigger, mature plugin workflows, or GSAP-specific framework integration | The task is a small isolated state transition that CSS or an existing runtime already handles |
| PixiJS v8 | Interactive 2D scenes, sprite or particle fields, filters, custom shaders, Canvas/WebGL/WebGPU rendering, or object counts beyond a practical DOM surface | The surface is primarily semantic text, navigation, forms, ordinary components, a small transition, or true 3D |
| Phaser v4 | A 2D game needs engine-owned scenes, loop, input, cameras, scaling, audio, physics, and deterministic game-state transitions | The task only needs a renderer, semantic application UI, a small effect, or true 3D |
| React View Transitions | Route/navigation continuity in a compatible React/Next.js surface | It is being used as a general animation engine |
| Existing project runtime | The repo already has an accepted animation library and it satisfies the motion spec | It cannot meet accessibility, performance, interruption, or fidelity requirements |

Never add overlapping runtimes for the same change unless `design.md`, `motion.md`, and when
required `scene.md` name distinct, non-overlapping responsibilities. PixiJS is a specialized
renderer; Phaser is a full 2D game runtime. If either is combined with GSAP, Anime.js, CSS, or
WAAPI, assign one render-loop owner and prevent two runtimes from driving the same property, clock,
lifecycle, or cleanup path.

For 3D, data visualization, geospatial, GPU, editor-canvas, and narrative surfaces, use
`references/graphics-runtime-routing.md`. The machine-readable
`references/graphics-runtime-catalog.json` records support state and trust boundaries. A listed
adapter is not an instruction to add that dependency; preserve an accepted existing runtime and
verify version-matched official documentation first.

## Anime.js v4.5 Profile

Verified against the official Anime.js documentation and v4.5.0 release on 2026-07-19.

The `animejs` route is no longer limited to small DOM/SVG tweens. Treat it as capable of:

- modular ESM/subpath imports and tree shaking;
- `createTimeline`, `createTimer`, and `createAnimatable`;
- `createDraggable` interaction physics;
- `createLayout` transitions across display, flex/grid, DOM order, and parent changes;
- `onScroll` event synchronization;
- `splitText` with accessible text handling;
- SVG drawing, morphing, and motion paths;
- `createScope` lifecycle and React cleanup;
- WAAPI-backed animation;
- adapters through `registerAdapter()`, including the official Three.js adapter;
- 3D stagger grids plus deterministic `jitter` and `seed`.

When the installed `animejs` companion skill lacks these markers:

1. Keep the pipeline run unblocked.
2. Use the official v4.5 documentation for the missing surface.
3. Record `stale companion surface: animejs` and the missing markers in `qa.md`.
4. Verify imports and behavior in the actual browser/build because Anime.js v3 and v4 APIs are not interchangeable.

## Motion And QA Consequences

- `motion.md` must name the selected Anime.js module/subpath, GSAP plugin set, or PixiJS sub-skills and render surface.
- Layout, text, draggable, scroll, adapter, and Three.js animation must include interruption and cleanup behavior.
- Split text must preserve accessible reading output.
- Scroll and layout behavior need reduced-motion alternatives.
- Adapter/non-DOM animation must name the render loop owner and cleanup path.
- Deterministic evidence runs should set Anime.js stagger `seed` when jitter or random ordering affects screenshots.

## PixiJS v8 Profile

Verified against the official `pixijs/pixijs-skills` suite at commit
`6aae70d76cf410432dd144029c07a1ad4bb12793` on 2026-07-23.

Treat PixiJS as a specialized 2D rendering route, not as the next step after CSS animation. Start
with `pixijs`, load only the required official sub-skills, and use
`https://pixijs.download/release/docs/llms.txt` when the suite does not cover an API.

Before implementation, `motion.md` must define:

- renderer choice and supported/degraded/unsupported fallback;
- Application init, resize, pause/resume, remount, and destroy ownership;
- scene graph, coordinate spaces, assets, ticker/manual loop, and deterministic procedural state;
- DPR, frame-rate, draw-call, object/particle, texture, filter, and GPU-memory budgets;
- keyboard and screen-reader semantics through an accessibility overlay or DOM equivalent;
- reduced-motion substitution and cleanup for tickers, listeners, textures, filters, and contexts.

Use `references/pixijs-rendering.md` for the complete selection, skill-routing, ownership, and QA
contract. Missing official sub-skills are non-blocking, but the fallback and unverified capability
must be recorded in `qa.md`.

## Phaser v4 Profile

Phaser is the native route for complete browser-based 2D game runtime work. Use it when one engine
must own scenes, cameras, scaling, the game loop, input, audio, physics, and state transitions. It
is not the default for ordinary application UI or a substitute for semantic DOM.

Create `scene.md` from `references/scene-runtime-spec.md`, then apply
`references/phaser-v4.md`. Keep game HUD, menus, and Galgame dialogue semantic where possible and
use `references/game-ui-and-narrative.md` for dialogue, choices, backlog, skip, autoplay, save/load,
localization, accessibility, and state ownership.

The official Phaser Game Agent MCP is an optional credentialed, metered host capability. Never
make it a required local dependency. The reviewed community Phaser skill pack has no verified
repository license, so it remains a curation candidate with no automatic install path.

## Sources

- Anime.js documentation: https://animejs.com/documentation/
- Anime.js module imports: https://animejs.com/documentation/getting-started/module-imports/
- Anime.js v4.5.0 release: https://github.com/juliangarnier/anime/releases/tag/v4.5.0
- Official PixiJS skills: https://github.com/pixijs/pixijs-skills
- PixiJS v8 API index: https://pixijs.download/release/docs/llms.txt
- Phaser repository: https://github.com/phaserjs/phaser
- Phaser v4 documentation: https://docs.phaser.io/phaser/concepts/game
- Phaser v4 releases: https://phaser.io/download/phaser4
- Phaser Game Agent MCP: https://phaser.io/news/2026/07/phaser-game-agent-mcp-setup
