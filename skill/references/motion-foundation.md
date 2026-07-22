# Motion Foundation

`MOTION.md` is the project-level motion source of truth. It defines the product's reusable motion
language before an agent chooses CSS, WAAPI, Anime.js, GSAP, Canvas, SVG, or WebGL.

The foundation exists even when the intended motion posture is static. “No motion” must be an
authored accessibility and product decision, not an omitted decision.

## Two-Level Contract

Use the two files for different lifetimes:

| File | Lifetime | Responsibility |
| --- | --- | --- |
| project `MOTION.md` | reusable | thesis, principles, primitive vocabulary, procedural policy, runtime policy, reduced-motion substitutions, provenance |
| change `motion.md` | one active change | foundation hash, selected primitive IDs, scenes, layers, tracks, triggers, timelines, interruption, runtime bindings, evidence |

Change `motion.md` must not redefine the project language. It selects and specializes it.

## Required Foundation Shape

`motion-foundation.schema.json` describes the normalized foundation model. The authored source
remains Markdown with YAML frontmatter plus required sections; the checker normalizes and validates
that source without executing it.

Start `MOTION.md` with:

```yaml
---
schema: design-pipeline.motion-foundation.v0.1
name: Product motion language
posture: minimal
primitiveRegistry: design-pipeline.motion-primitives.v1
---
```

Use one language consistently for all required second-level headings. The checker accepts these
English or Chinese equivalents:

| English | Chinese |
| --- | --- |
| Motion Thesis | 动效主张 |
| Motion Principles | 动效原则 |
| Motion Vocabulary | 动效词汇 |
| Procedural Motion | 程序化动效 |
| Runtime Policy | 运行时策略 |
| Reduced Motion | 减弱动效 |
| Source Decisions | 来源决策 |

`posture` is one of `static`, `minimal`, `expressive`, `cinematic`, or `procedural`.
Every required section must contain an authored decision. A `static` foundation selects no moving
primitive; non-static foundations select at least one registered primitive.

## Motion Vocabulary

Use stable primitive IDs from `motion-primitives.json`. A primitive describes intent and observable
channels, not library syntax. The initial registry covers:

- transform: orbit;
- reveal: trim line;
- distortion: fractal noise and turbulent displacement;
- procedural paths: rose curve, Lissajous curve, and hypotrochoid.

For non-static postures, list at least one selected primitive as
`primitive: <registry-id>`. Components and scenes may compose primitives, but they may not silently
change the primitive's semantics.

## Procedural Motion

Procedural motion is parameterized behavior generated from a bounded declarative model:

- stable generator ID;
- parameter names, units, ranges, and defaults;
- deterministic seed when randomness is present;
- sampling rate or path resolution;
- loop and phase behavior;
- render surface and performance budget;
- reduced-motion substitute.

Equations are data. Do not place executable JavaScript, TypeScript, callbacks, imports, script
tags, or fenced code blocks in `MOTION.md`. Runtime adapters may compile a reviewed equation
DSL later.

## Runtime Capability Policy

Treat runtimes as adapters to the same semantic contract:

- `supported`: the adapter preserves the primitive, interruption, and accessibility semantics;
- `degraded`: it uses a documented approximation;
- `unsupported`: the selected primitive must not be emitted through that adapter.

CSS and WAAPI are preferred for small state transitions. Anime.js and GSAP are optional adapters
for choreography they materially simplify. PixiJS is an optional 2D rendering adapter only when a
scene, object count, particle field, filter, shader, or Canvas/WebGL/WebGPU requirement justifies a
dedicated renderer. Canvas, PixiJS, SVG filters, WebGL, and WebGPU require an explicit performance,
accessibility, lifecycle, and fallback owner.

## Evidence And Provenance

Every captured or authored motion fact is classified as:

- `measured`: derived from recorded frames, timestamps, computed styles, or geometry;
- `instrumented`: observed through runtime hooks or browser instrumentation;
- `inferred`: reasoned from incomplete evidence and paired with confidence;
- `authored`: deliberately created for the target product.

Benchmark sites validate whether the pipeline can observe and reproduce a class of behavior. They
do not become the product's motion foundation.

## Clean-Room And License Boundary

The bundled primitive registry is original metadata:

- `WebMotionTable` is credited as MIT-licensed taxonomy inspiration. Do not copy its React, CSS,
  SVG, or Anime.js implementation.
- `math-curve-loaders` is used only as public-behavior evidence and a prompt to support general
  mathematical curves. Its repository license is not treated as verified; do not copy or
  redistribute its code.
- Hypergryph pages are current benchmark inputs only.

When adapting any external source, record its URL, reviewed license state, the adopted concept, the
rejected implementation detail, and whether code was copied. The expected value for bundled
primitives is `codeCopied: false`.

## Validation

Run:

```bash
node <design-pipeline>/scripts/check-motion-foundation.cjs --project-root . --json
```

Only `ready` unlocks implementation. Missing foundations return `synthesis-required` with exit code
2; malformed or unsafe foundations return `invalid` with exit code 1.
