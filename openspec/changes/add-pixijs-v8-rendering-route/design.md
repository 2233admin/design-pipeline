# Design: PixiJS v8 capability integration

## Source Decision

Reviewed `pixijs/pixijs-skills` at commit
`6aae70d76cf410432dd144029c07a1ad4bb12793` on 2026-07-23. The upstream suite is MIT licensed.
This change records source identity and capability markers but does not copy or vendor upstream
implementation guidance.

## Capability Boundary

PixiJS is modeled as a 2D renderer and scene runtime. The pipeline chooses it for interactive scene
graphs, high object counts, particles, filters, shaders, sprites, or Canvas/WebGL/WebGPU surfaces.
Normal component motion remains on DOM/CSS/WAAPI or an existing accepted runtime.

## Registry Shape

The install group lists every official PixiJS skill so self-check exposes suite completeness. The
bounded compatibility profile evaluates only the production baseline needed by every serious
rendering change:

1. official v8 router and canonical documentation fallback;
2. Application async initialization and destruction;
3. accessibility system and keyboard metadata;
4. performance guidance for draw calls, GPU memory, and pooling;
5. ticker timing and priority control;
6. Worker, SSR, OffscreenCanvas, and CSP boundaries.

Scene-object and effect skills are task-specific and remain routed on demand.

## Motion And Ownership

Every PixiJS surface requires change `motion.md`, including mostly static scenes, because renderer
lifecycle, assets, update loops, resolution, performance, reduced motion, and accessibility still
need explicit ownership. If another choreography runtime is used, it may not compete for the same
property, clock, lifecycle, or cleanup path.

## Failure And Fallback

- No PixiJS skills installed: `INFO`, pipeline continues.
- Only part of the suite installed: `WARN`, record the missing surface and use official docs.
- Production baseline present: `OK`, then load task-specific sub-skills as needed.
- PixiJS not justified by product requirements: keep semantic DOM and the existing runtime.
