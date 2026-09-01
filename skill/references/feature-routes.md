# Feature Routes Reference

This reference is sectioned by route. Read only the module section selected by the front-door route, plus the explicitly named contracts inside that section; do not load unrelated module instructions.

## Static Reference Reconstruction Module

When the user supplies an image and asks for an identical, exact, 1:1, pixel-accurate, cloned, or
faithfully reproduced result:

A missing source downgrades the verification claim, never the requested fidelity. Requested fidelity
changes only through explicit user approval recorded in the non-destructive downgrade field. An
unavailable file, a schedule, and implementation convenience are not approval.

1. Resolve the reference source to a file path before writing any artifact. When the reference is
   not a resolvable path, ask the user for one and state what the path unlocks: rectification,
   camera calibration, landmark error, and the fidelity receipt.
2. When the user cannot or will not supply a path, record `source.availability: pending` with
   `pendingReason` and `requestedFrom` in `reference-evidence.json`, then continue. Do not block the
   remaining work, and never write a fabricated path, dimension, or hash. When the raster later
   lands, run `designer-pipeline reference resolve --path "<file>" --json` instead of hand-editing
   measurements.
3. Read `references/reference-spec.md` and `references/reconstruction-spec.md` completely.
4. Record the image as `role: primary-target`, with both requested and effective fidelity set to
   `exact-reconstruction` in `reference-evidence.json` v2. A reference is inspiration only when the
   user says it is inspiration.
5. Do not generate alternative design directions. The reference already determines the direction.
6. Record the per-region structure table in `reference.md` and the matching `composition` block in
   `reference-evidence.json` before any layout is authored.
7. Separate image, canonical/object, world, and camera spaces. Rectify the source into a canonical
   front view, author the front elevation there, then solve and lock the output camera. A pending
   source blocks rectification and the camera solve; the rest of the module still runs.
8. Run `designer-pipeline reference check`. `blocked` with reason `source-pending` is a recorded
   state with `contractValid: true`, not a contract failure. Exact and adaptive reconstruction
   remain blocked until the geometry stage of `reconstruction.json` passes. Read the exit code as
   returned: `0` success, `1` invalid or error, `2` blocked, `3` a measured fidelity mismatch. `3`
   is a real outcome that reaches the caller and prints `fidelity-limited`; it is not success.
9. Render the layout-only graybox and run
   `designer-pipeline reconstruction check --stage graybox`. This gate precedes change `design.md`
   and precedes materials, glow, bloom, depth of field, scanlines, and cinematic grading. It is the
   only gate on that optical treatment.
10. Write change `design.md` against the graybox capture and cite that capture in it.
11. Before detail geometry, type treatment, or any measured fidelity claim, run
    `designer-pipeline reconstruction check --stage geometry`. It independently recomputes
    distributed landmark error. Against a pending source it reports `blocked` with reason
    `source-pending`, never `fidelity-limited`. This stage does not gate optical treatment; when it
    is blocked and the graybox stage is `ready`, continue.
12. After final rendering, an independent EvidencePort must produce reference, implementation, and
    diff images plus a hash-bound fidelity receipt. Run
    `designer-pipeline reconstruction check --stage final`.
13. Missing evidence is `blocked`; complete measured evidence outside thresholds is
    `fidelity-limited`. Neither state may be described as exact, identical, pixel-perfect, or done.
14. Record the verification claim in `qa.md` from the whole `--stage final` result - its top-level
    status and its `stages` map together: `verified` only when the top-level status is `ready` and
    every reported stage is `ready`, `fidelity-limited` when the top-level status is
    `fidelity-limited` and no stage is `blocked`, and `unverified` for everything else, including a
    single blocked stage and a pending or unresolvable source. Requested fidelity does not move with
    it. Only that complete output is evidence for the claim. `reconstruction check` defaults to
    `--stage geometry`, and no stage-scoped result - the default run, an explicit `--stage geometry`
    or `--stage graybox` run, or a bare `stages.graybox` reading lifted out of any result - may be
    cited as evidence for `verified`.
15. Report the unlock action whenever the source is still pending: supplying the source file path
    and running `designer-pipeline reference resolve --path "<file>" --json` stamps `resolvedAt`
    and unlocks rectification, camera calibration, landmark error, and the fidelity receipt.

## Website Cloning Module

When the user asks to clone, reproduce, rebuild, reverse-engineer, or use one or more live pages as implementation references:

1. Read this Website Cloning Module section, `references/website-cloning.md`, and
   `references/website-clone-component-spec.md`. For authenticated, multi-page, whole-site,
   template-discovery, or reverse-analysis work, also read `references/deepclonewebsite.md` and use
   its direct/structure/full capture boundary.
2. Initialize the run with `scripts/init-website-clone.cjs`; pass direct clone targets with `--url` and supporting inspiration/comparison pages with `--reference-url`. When one target is the user-designated structure or motion template, pass it as the primary `--url`/`--authority-url`, enumerate every allowed difference, protect the required invariants, and select `actual-browser` when live-tab interaction is part of acceptance.
3. Treat `references/website-cloning-manifest.schema.json` as the machine-readable Browser/Builder/Evidence port and fidelity contract.
4. Complete `targets/<target-id>/research/palette-evidence.json` from both DOM/computed-style
   evidence and screenshot/raster-media evidence, then reflect the same roles and values in
   `design-tokens.md`.
5. Run `scripts/check-website-clone-foundations.cjs --change-root <change-root> --json` before
   synthesizing the implementation design or starting BuilderPort work. Project `DESIGN.md`,
   project `MOTION.md`, and every target palette must be `ready`; adaptive mode does not bypass
   this gate.
6. Keep the URL-first user experience, but record each adapter, its available capabilities, and a successful capability probe before claiming exact fidelity.
7. After EvidencePort writes its measured report, run `scripts/evaluate-website-clone.cjs`; this is the only path that may move the manifest to `complete`. The evaluator must also verify implementation-authority identity, protected invariants, allowed differences, replay provenance, and the declared interaction environment; adaptive fidelity does not bypass these checks.
8. If a required port or measurement is missing, keep `blocked`; if complete measurements miss a threshold, use `fidelity-limited`. Never fill missing measurements by visual guesswork.

The website-cloning module is a design-pipeline superset capability. It adds live evidence capture and convergence gates while preserving all existing accessibility, motion, responsive, engineering, and headless-state requirements.

## Requirements-Driven DESIGN.md Synthesis

When the target project has no reusable `DESIGN.md`, or the existing file cannot express the
requested product direction:

1. Read this Requirements-Driven DESIGN.md Synthesis section and `references/design-synthesis.md`.
2. Initialize with `scripts/init-design-synthesis.cjs`, using `--problem` as the primary input.
3. Register live pages with `--reference-url` and existing DESIGN.md examples with `--template`.
   Both are attributed evidence; templates are always inspiration-only.
4. Run `/grill-with-docs <problem>` when material product decisions remain unresolved, persist its
   ADR/glossary/decision evidence, then record `grill-completed`.
5. Run the deterministic scope assessment. Only when the score exceeds the selected budget, say
   “哦，天哪，这比我预期的要大得多。” and request `/wayfinder 为此制作一张地图`.
6. Wayfinder must use a configured issue-tracker host. Never invent a local issue map when that host
   is unavailable.
7. Synthesize 2-3 product-specific directions from requirements, repository constraints, and cited
   evidence. Select one and write the reusable project `DESIGN.md`.
8. Validate it through `scripts/advance-design-synthesis.cjs`, then immediately continue into the
   normal implementation and QA stages unless another material decision is pending.

Keep the artifacts distinct:

- lowercase change `design.md` defines how the active change will be implemented;
- project `DESIGN.md` defines reusable product identity for future coding agents.

The bundled scripts manage deterministic state and validation. The host design agent performs the
creative synthesis; do not disguise a copied template or token dump as generated product design.

## Companion Skills

Reference file: `references/companion-skills.md`.
Capability routing reference: `references/capability-routing.md`.
Machine-readable companion registry: `references/companion-capabilities.json`.
Requirements-driven synthesis reference: `references/design-synthesis.md`.
Feedback and contribution reference: `references/feedback-loop.md`.
Upstream capability sync reference: `references/upstream-capability-sync.md`.
Development compatibility reference: `references/development-compatibility.md`.
Self-check reference: `references/self-check.md`.
QA checklist reference: `references/qa-checklist.md`.
Direct plain-language contract: `references/plain-language.md`.
CJK typography contract: `references/cjk-typography.md`.
Visual direction preview contract: `references/direction-preview.md`.
Governed Playground contract: `references/playground.md`.
Evidence-gated layered adaptation contract: `references/adaptation.md`.
Machine-readable adaptation contract: `references/adaptation-contract.schema.json`.
Framework-agnostic component contract: `references/component-capabilities.md`.
Project motion foundation reference: `references/motion-foundation.md`.
Machine-readable motion foundation schema: `references/motion-foundation.schema.json`.
Motion primitive registry: `references/motion-primitives.json`.
Motion spec reference: `references/motion-spec.md`.
Animation opportunity and review reference: `references/animation-opportunity-and-review.md`.
Reference evidence and spatial-routing spec: `references/reference-spec.md`.
Change visual/screen-space design spec: `references/design-spec.md`.
Change 3D world spec: `references/3d-spec.md`.
Graphics runtime routing reference: `references/graphics-runtime-routing.md`.
Machine-readable graphics runtime catalog: `references/graphics-runtime-catalog.json`.
XY Python charting reference: `references/xy-charting.md`.
Change scene/runtime spec reference: `references/scene-runtime-spec.md`.
Phaser v4 game runtime reference: `references/phaser-v4.md`.
Game UI and narrative profile reference: `references/game-ui-and-narrative.md`.
Curation policy reference: `references/curation-policy.md`.
Contextual anti-slop review reference: `references/anti-slop-review.md`.
Machine-readable anti-slop rubric: `references/anti-slop-rubric.json`.
Impeccable design contract: `references/impeccable-contract.md`.
Impeccable product-design capability map: `references/impeccable-product-design.json` and
`references/impeccable-product-design.md`.

If these design skills are installed, use them as lenses in this order:

1. `impeccable`: command vocabulary, surface modes, refinement semantics, bounded verification, and design-detector workflow.
2. `frontend-design`: visual direction, composition, strong first impression, avoiding generic AI aesthetics.
3. `design-taste-frontend`: anti-template discipline, typography taste, language and visual restraint.
4. `ui-ux-pro-max`: UX heuristics, design-system selection, color and type pairing, stable repeatability.
5. `web-design-guidelines`: production UI rules, layout, semantics, accessibility, responsive behavior.
6. `emil-design-eng`: motion, transitions, input feedback, perceived quality, interaction details.

For dynamic UI, interaction motion, and animation-specific work, apply these motion skills:

- `design-motion-principles`: primary create/audit workflow for purposeful UI motion.
- `emil-design-eng`: design-engineering judgment for animation and interaction polish.
- `animation-vocabulary`: translate vague motion intent into precise timing, easing, choreography, and behavior language.
- `review-animations`: strict post-implementation animation review.
- `references/animation-opportunity-and-review.md`: project-owned gate for screening opportunities before implementation, naming vocabulary/curves, and recording review evidence.
- `apple-design`: Apple HIG-inspired interface principles and fluid system UI motion for web (WWDC-informed).
- `vercel-react-view-transitions`: React and Next.js view-transition implementation patterns.

Choose companions by capability, not by the presence of a familiar skill name. Classify the brief
with `designer-pipeline route` first. Read `references/capability-routing.md` and
`references/job-registry.json` when the change crosses evidence capture, design systems, assets,
motion runtimes, editable design handoff, or hosted delivery. For 2D, 3D, data visualization,
geospatial, GPU, game, or narrative surfaces, also read `references/graphics-runtime-routing.md`
and select a capability family before selecting an adapter.

For product UI, flows, design-system work, user-visible UI changes, or interface reviews, always
apply the bundled interface discipline in `references/interface-discipline.md`. It is present in
the package and does not require a global skill installation. Start with its `better-interface`
router, use full coverage unless a narrow repair qualifies for quick coverage, and use its
change-scoped review protocol for changed UI.

Catalog CLIs are escape hatches. Open them only when `designer-pipeline route` selects that catalog
as the primary knowledge door, or when a listed secondary is needed as reference. Do not search
MengTo, Prism, Astryx, shadcnio, DesignMD, iart, and holosticker as peer Stage 0 searches.

For visual direction, web technique, motion, WebGL, reference analysis, asset, or game work, when
the job dispatcher selects MengTo as primary, search the bundled library before inventing a
workflow:

```bash
designer-pipeline mengto search --query "<capability or brief>" --json
```

Read the narrowest returned `SKILL.md` and only the linked supporting files needed for the task.
Apply its workflow, numeric guidance, pitfalls, and verification gates through the target project's
`DESIGN.md`, `MOTION.md`, OpenSpec artifacts, existing stack, accessibility rules, and budgets.
Never treat a bundled demo, runtime asset, dependency choice, account workflow, or publishing recipe
as automatic project authority. The activation and adaptation rules live in
`references/mengto-skills.md`; explicit-only entries still require the user's matching request and
normal side-effect authority.

For web motion, WebGL motion, kinetic type, or motion-graphics/video craft, when the job
dispatcher selects iart as primary, route before implementing. A domain brief is enough; do not
wait for a skill id:

```bash
designer-pipeline iart route --query "<motion or video brief>" --json
designer-pipeline iart search --query "<narrow playbook>" --json
```

Read `references/iart-motion-skills.md`. Record the selected playbook, alternatives, and runtime,
then load only that `SKILL.md`. Keep project `MOTION.md` authoritative. HTML video, reels,
captions, overlays, and explainers use HyperFrames unless the brief names Remotion, Manim, or
After Effects. A route result is a selection, not install or execution authority.

For product-design intake, Design DNA, token governance, design-corpus learning, or handoff work,
when the job dispatcher selects Prism as primary, route through the bundled Prism System layer
before loading a broad recipe set:

```bash
designer-pipeline prism route --query "<design request>" --json
designer-pipeline prism search --query "<narrow capability>" --json
```

Read `references/prism-system.md`, load only the returned local skill sequence, and execute it
inside the native brief, directions, implementation, and QA stages. Reuse the pipeline's existing
design tokens, catalogs, adapters, evidence, `DESIGN.md`, and `MOTION.md`; never create a parallel
Prism runtime or treat upstream autonomy metadata as side-effect authority.

For an explicit holographic sticker, holofoil, die-cut, pointer-tilt, peel, or matching export
request, when the job dispatcher selects holosticker as primary, inspect the bundled
implementation before creating another shader or geometry path:

```bash
designer-pipeline holosticker inspect --capability "<capability>" --json
```

Read `references/holosticker.md`, adapt only the returned source files, and route them through the
project-pinned `threejs` adapter with `scene.json`, `3d.md`, `motion.md`, and browser evidence. Do not
add the full Studio UI or optional dependencies for an unselected capability.

When `web-design/build-threejs-scroll-worlds` is selected, or Kage is supplied as a reference, also
read `references/kage-scroll-world.md`. It adds the current Kage repository's license boundary and
post-snapshot responsive lessons without importing its unlicensed code or artwork.

For animation implementation, choose library skills by job:

- Use `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-react`, `gsap-plugins`, `gsap-utils`, `gsap-performance`, and `gsap-frameworks` for advanced choreography, scroll-driven animation, timeline control, React integration, SVG/plugin-heavy work, or when GSAP is already in the project.
- Use `animejs` v4.5 for modular timelines, layout transitions, accessible text splitting, SVG, draggable interactions, scroll observers, WAAPI, deterministic stagger, or adapter-driven targets such as Three.js.
- Use the built-in `reflex-xy` route for Python-native charts, notebooks, static chart export, Reflex applications, or large datasets that need screen-bounded rendering. Read `references/xy-charting.md`; pin the alpha version in the target project and keep a semantic data-table path.
- Use the official `pixijs` router and the matching PixiJS v8 sub-skills only for justified interactive 2D render surfaces such as sprite fields, particles, filters, shaders, canvas editors, or high-object-count scenes. Read `references/pixijs-rendering.md` before selecting it.
- Use the built-in Phaser v4 route for a complete 2D game runtime with scenes, game-loop ownership, input, audio, physics, cameras, scaling, and game-state transitions. Read `references/phaser-v4.md`; do not depend on an unverified community skill pack.
- Use Three.js or React Three Fiber for focused 3D scene rendering; use Babylon.js or PlayCanvas when a fuller 3D engine is justified. Existing project runtimes still win when they meet the capability and budget.
- For explicit holographic sticker work, use `references/holosticker.md` as the pinned Three.js implementation route and select only the required material, die-cut, tilt, peel, or export slice.
- Use `references/game-ui-and-narrative.md` for HUDs, game menus, dialogue systems, visual novels, and Galgame surfaces. Keep dialogue, choice, backlog, save/load, skip, autoplay, and accessibility state independent of animation timing.
- If no animation or rendering library is already present, prefer semantic DOM plus CSS transitions/keyframes for simple state changes; choose Anime.js, GSAP, PixiJS, Phaser, or a 3D runtime only when the required capability justifies it.
- Do not add overlapping runtimes unless `design.md`, `motion.md`, and when required `scene.md` or
  `3d.md` assign distinct responsibilities. One adapter owns each render loop, clock, property,
  lifecycle, and cleanup path.
- Treat an installed but stale `animejs` companion as a warning. Use official v4.5 documentation for missing markers and record the fallback in `qa.md`.
- Treat a partial or stale PixiJS suite as a warning. Use the canonical PixiJS v8 documentation index for missing APIs and record the fallback in `qa.md`.

For React and Next.js work, also apply the installed Vercel / Next.js engineering skills listed in `references/companion-skills.md`:

- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `vercel-react-view-transitions`
- `next-cache-components-adoption`
- `next-cache-components-optimizer`
- `next-dev-loop`

If a companion skill is missing, continue with the same gate manually and note the missing skill in `qa.md`. Do not block the user unless the requested output depends on a missing asset, credential, or external service.
