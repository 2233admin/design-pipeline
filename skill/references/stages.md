# Stage Workflow Reference

This reference contains detailed stage instructions moved out of the front door.

## Stage 0: Repo Read

Before writing design artifacts or code:

- Classify the brief into exactly one primary job, then persist the plan before opening a catalog:

```bash
designer-pipeline route --query "<brief>" --write --output job-plan.json --json
```

  Open only the returned primary knowledge door. Kernel steps in `next` always run. Secondaries
  stay reference-only and do not become a second primary. Do not search every catalog. Add a new
  capability by registering a job in `references/job-registry.json`, not by adding another
  mandatory Stage 0 search. Status `needs-clarification` asks one question that distinguishes the
  top jobs; it does not pick a primary or write a plan. Put `jobPlanSha256` and `jobPlanPath` on
  the toolchain request, and the same `jobPlanSha256` on the execution request. Job id and
  toolchain `primaryRouteId` are different identifiers. Plan presence does not make an `inert`
  or `reference-only` catalog executable-ready.

- For HTML video, reels, motion graphics, captions, overlays, slideshows, explainers, voiceovers,
  or Remotion ports, route through `references/hyperframes.md` before choosing a runtime. HyperFrames
  uses HTML as the source of truth and a deterministic, paused, seekable timeline; ordinary UI
  motion remains on the normal motion route. Load only the matched workflow/domain skill when the
  upstream HyperFrames skill tree is available.

- For read-only pull-request orientation, review-thread inspection, or CI failure drilldown, use
  `node <design-pipeline>/scripts/github.cjs pr-snapshot|pr-threads|ci-failures`. The commands
  collapse repeated `gh` calls into bounded reports, preserve valid `gh` failure statuses, keep
  review resolution state through GraphQL, and write full CI logs to the OS temp directory. They
  require `gh` on `PATH` and an authenticated session; they never create or mutate GitHub
  artifacts. Use raw `gh` for workflows these commands do not cover, and never pipe `gh` into
  `head`.

- Run `node <design-pipeline>/scripts/check-deps.cjs` from the target repo root, or manually perform the same checks from `references/self-check.md` if Node is unavailable.
- Read `references/companion-capabilities.json` as the source of truth for install groups, suite requirements, capability markers, and upstream sources. Do not add another hard-coded companion list.
- Read capability-profile warnings separately from install status. `installed` means discoverable; `WARN` means the companion surface does not advertise the current capability baseline.
- Treat missing optional/enhancement companion skills as a fallback path, not a blocker. Record missing capabilities in `qa.md`.
- When a warning represents a reusable pipeline or companion gap, run self-check with `--record-feedback` or call `scripts/record-feedback.cjs` immediately. This writes a local, redacted, deduplicated draft; it does not publish remotely.
- When version-sensitive upstream freshness matters, read
  `references/upstream-capability-sync.md`. The host retrieves source evidence; the bundled audit
  compares it without executing remote content. Missing evidence is `UNKNOWN`, never current.
- Never append a retrieved taste prompt to global agent instructions. Curate reviewed observations
  into `references/anti-slop-rubric.json`, preserve source hashes, and keep the remote text inert.
- Prepare Issue or PR publication requests locally. Remote creation requires explicit authority for
  the exact action and repository, followed by a validated receipt and local reconciliation.
- Initialize or update `state.json`, `events.jsonl`, and `handoff.md` using `references/agent-interface.md`.
- Use `scripts/designer-pipeline.cjs` for v2 state initialization, migration, CAS-protected
  transitions, consistency checks, and explicit repair. Do not independently rewrite state and
  event history.
- Identify the app framework, styling system, component library, routing, existing design tokens, and test/QA surface.
- Write `toolchain-request.json` that includes `jobPlanSha256` and `jobPlanPath` from the Stage 0
  job plan, then run `designer-pipeline toolchain resolve --artifact
  toolchain-request.json --write --output toolchain-plan.json`. This is mandatory for every
  frontend change, including a project-owned `none` UI-library choice. The request records the
  framework, current and requested stack, brief, capabilities, and any graphics family or adapter.
  The plan owns the joined frontend/tool/graphics selection plus `probe`, `invoke`, and `verify`
  descriptors. Do not infer a library from taste alone. A blocked plan stops the run. The older
  `design-system resolve-stack` command remains a narrower compatibility surface.
- Run `designer-pipeline toolchain probe --artifact toolchain-request.json` before invoking a
  selected external runtime. Probes are read-only and registry-owned; they never install or update
  a package. Record every invocation as `design-pipeline.toolchain-receipt.v1`, binding the plan
  hash, actual tool version, command, exit code, artifacts, hashes, and linked evidence receipts.
- Before BuilderPort work, write `execution-request.json` with the toolchain plan hash, the same
  `jobPlanSha256` as the toolchain plan, plus explicit slice owner and literal project-relative
  scope, then run `designer-pipeline execution route` and
  `execution prepare`. `auto` routes one clean slice in place, multiple clean slices sequentially,
  and dirty or isolation-required work to a `codex/*` worktree. Finalize with a structured outcome.
  A successful worktree must be committed, clean, and in scope before it is removed; failures,
  dirty results, scope violations, and cleanup failures retain the worktree and block completion.
- Run `designer-pipeline design-system decompose --query "<product brief>" --write --output
  capability-inventory.json`, then `designer-pipeline design-system route --query "<product
  brief>" --platform <platform>`. Record the selected routes and unavailable capabilities in the
  design-system decision. This closes the gap between a required Stage 0 search and the actual CLI.
- External tool entries are governed routes, never installation instructions. `deepclonewebsite`
  may be proposed for cloning only after its browser login and model credential requirements are
  explicit; Frog may be proposed for GitHub issue sync only after repository/workflow authority is
  explicit. The bundled cloning and feedback routes remain executable fallbacks. The bundled
  MengTo, SmoothUI, and React Bits catalogs are inert metadata; use only the named routed
  components or techniques, never auto-install or execute upstream source text. Preserve the
  recorded MIT/Commons Clause boundaries and adapt into project-owned components.
- Treat Koboyo as a low-frequency governed icon-asset route, not a shadcn preset or default icon
  library. Route it only for explicit Koboyo or hand-drawn-icon intent. Public per-icon SVG use is
  subject to the recorded license constraints; MCP icon search requires a key, should use header
  authentication, and must not persist keys in URLs or logs. Canvas mutations are outside the icon
  route and require separate explicit authority. Recheck the published license before bulk use.
- Search the design-system catalog when reusable component, hook, template, documentation, or token
  knowledge could prevent reinvention. Record the adoption mode instead of silently importing a
  candidate system.
- Run `designer-pipeline design-system decide` with both the ready `frontendStackDecision` and the
  complete `capabilityInventory` embedded in the request, or reference their contained artifact
  paths with `frontendStackDecisionPath` and `capabilityInventoryPath`. A non-custom decision
  without either artifact is blocked; custom mode still requires the frontend-stack decision.
- Inspect existing UI patterns before inventing new ones.
- Check whether the project already has source-of-truth design docs or OpenSpec-style folders.
- Confirm the graphics selection in `toolchain-plan.json` against
  `references/graphics-runtime-catalog.json`. Preserve an accepted existing adapter when it
  satisfies the capability and budget; a selected adapter without a trusted lifecycle blocks the
  unified plan instead of becoming an implied execution path.
- Resolve the reference source to a file path here, before any reference artifact is written -
  before `reference.md`, before `reference-evidence.json`, and before `reconstruction.json`. Ask
  the user for the path when it is not resolvable and name what it unlocks: rectification, camera
  calibration, landmark error, and the fidelity receipt. When no path arrives, record
  `source.availability: pending` with `pendingReason` and `requestedFrom` and report it now. A
  pending source surfaces at Stage 0, not at gate review. Asking for the path after the artifacts
  already exist is the defect this step exists to prevent. When the file later lands, run
  `designer-pipeline reference resolve --path "<file>" --json`; do not invent a hash by hand.
- Then, when visual references influence the change, create `reference.md` and normative
  `reference-evidence.json` from `references/reference-spec.md`. Record object dimensionality,
  camera model, interaction model, and output surface separately before selecting `2d`, `2.5d`,
  `3d`, or `hybrid`. Perspective, occlusion, near/far scale, volumetric containers, and camera
  behavior are spatial evidence; glow and transparency alone are not. Run
  `designer-pipeline reference check` and stop unless it reports `ready`, with exactly one
  exception: a standalone `source-pending`, meaning the top-level `reason` is `source-pending` and
  every entry in the `stages` map reports `ready`. A run blocked for `source-pending` and anything
  else is still a stop.
- When exact static-reference language is present, use reference-evidence v2 and
  `reconstruction.json`; do not silently treat the image as a mood board or style direction.
- Check for project `DESIGN.md`. If it is missing or materially incompatible with the request, route
  through the requirements-driven synthesis module before implementation.
- Run `node <design-pipeline>/scripts/check-design-foundation.cjs --project-root . --json`.
  Status `synthesis-required` is the mandatory route into synthesis; only `ready` unlocks
  implementation.
- Check for project `MOTION.md`. If it is missing or incompatible with the requested interaction
  language, synthesize it from product requirements and `references/motion-foundation.md`.
- When the brief includes non-trivial motion, read `references/animation-opportunity-and-review.md`
  and complete its opportunity screen before selecting a runtime. Keep `prototype` on its existing
  route; do not turn platform-specific or library-specific companions into default web capabilities.
- Run `node <design-pipeline>/scripts/check-motion-foundation.cjs --project-root . --json`.
  Status `synthesis-required` is the mandatory route into motion-foundation synthesis; only
  `ready` unlocks implementation.
- Check whether the project has OpenSpec, GBrain, or Matt Pocock skill artifacts and use the compatibility rules in `references/development-compatibility.md`.
- Note constraints such as no external images, single-file HTML, mobile-first, accessibility, or brand rules.
- Resolve the surface mode (`Persuade`, `Operate`, `Read`, or `Experience`) and whether the work is
  an extension, refinement, or redesign before choosing a visual direction.

## Stage 1: Guided Design Intake

The guided first-wave flow is:

```text
ordinary-language input → DesignBrief confirmation → directions → Surface templates → adaptation review → tasks
```

The live design panel is the reviewable projection, not the chat transcript. The first wave is
limited to project-contained Web and Mobile evidence and metadata; it does not claim screenshot,
URL, visual embedding, or Game support.

Create or update `brief.md` with:

- Goal: what UI outcome the user wants.
- Audience: who uses it and under what pressure.
- Visitor mode: `Persuade`, `Operate`, `Read`, or `Experience`, with the mode-specific success condition.
- Surface: pages, components, states, and screen sizes.
- Constraints: tech stack, assets, data, accessibility, performance, deadlines.
- Non-goals: what should not change.
- Real content ranges: minimum, typical, maximum, long, missing, localized, and permission-limited cases where relevant.
- Acceptance checks: observable behavior and visual qualities.
- Playground applicability: whether an interactive representation would express or tune the
  product problem better than prose, with a supported required reason or waiver.

Keep this short. It is an execution contract, not a product essay.

### Form sanity backstop

Before choosing a visual direction, declare the deliverable form from the user's or controller's
language, then state the reader action in plain terms. Apply the single-canvas counterfactual: if
the proposed carrier were all the reader received, could it perform that action without the author
explaining it? If the brief implies a sequence, set, or state flow, do not compress it to one canvas
for production convenience. Record unresolved form uncertainty in the brief and take the
least-assumptive path; a model-written concept cannot approve its own form.

When the brief, handoff, or interface copy asks a person to decide or act, read
`references/plain-language.md`. Put the exact consequence or available action first, then preserve
scope, limits, exclusions, uncertainty, unchanged state, and recovery actions in the second pass.

## Stage 2: Design Directions

Read `references/direction-preview.md` and write `direction-preview.json` before selecting a
direction. For an open whole-surface request, produce three candidates by default in one comparable
`direction-previews/index.html`; two candidates require a real product/reference constraint, and
four are for an explicit broader exploration. Use the same real content fixture, state coverage,
and viewport, then capture and hash one screenshot per candidate.

Run `designer-pipeline direction check --stage preview --change-root <change-root> --json` while
the decision is pending. Only after it reports `ready` may the user or an autonomous run select a
candidate. Record the selected ID and product/visitor-fit rationale, then run `direction check
--stage selection`. A narrow change, established surface, non-visual change, exact primary target,
or user-specified single direction records an explicit supported waiver. Missing evidence is not a
waiver.

Create `directions.md` from the selected, verified preview before implementation. Present the
committed direction and at most two honest alternates. When a waiver inherits an established or
user-selected direction, record that inheritance instead of inventing alternatives.

When references are present, directions must preserve the route and fidelity invariants recorded in
`reference.md`. A `3d` or `hybrid` route cannot be downgraded to flat card composition for
implementation convenience.

For a `primary-target` exact reconstruction, do not produce alternative directions. Record that
`directions.md` is intentionally bypassed because the supplied reference is the selected direction,
then proceed through rectification, camera calibration, and the graybox capture.

Each direction must include:

- Visual thesis: layout, density, rhythm, typography, color posture.
- Interaction thesis: motion, feedback, empty/loading/error states.
- Fit: why it suits this product and audience.
- Risk: where it may fail or feel wrong.

Choose the carrier and visual language from the subject, audience task, and viewing context,
not from a style label alone. Every major visual technique must name its subject or reference cause
and its intended viewer effect. Anti-template work has two sides: reject generic AI grammar and
reject under-designed output; a title over an untreated asset with faint decorative furniture is
not a finished direction.

When anti-template risk matters, use `references/anti-slop-review.md` to compare cohesion,
product-grounded signature, specificity, and template-pattern density. Named colors, fonts,
punctuation, shapes, effects, or common layout families are not automatic rejection criteria.

Default decision rule:

- Product dashboards and operational tools: choose the quietest direction that maximizes scanability and repeated use.
- Marketing pages and portfolios: choose the direction with the strongest first-viewport signal and least generic composition.
- Components and app flows: choose the direction with the clearest states, accessibility, and interaction feedback.

Read `references/playground.md` when the user requests a Playground or an interactive
representation would express the problem better than prose. A Playground may tune an accepted
visual system, visualize code architecture or concepts, explore data, critique a document or diff,
or tune game balance when that work directly supports product design, frontend implementation,
scene/runtime design, or QA. Generate the self-contained HTML and run `designer-pipeline
playground check --stage build`. Read the matching blueprint under
`references/playground-templates/` before generating the HTML. When no built-in route fits, create
a hash-bound change Blueprint using the open protocol and record its governed integration target.
Persist the accepted full state and natural-language prompt,
exercise every control and preset in a browser, persist the hash-bound verification report, and run
`playground check --stage selection`. Do not use a design Playground to replace honest direction
comparison. A supported waiver remains explicit and machine-readable.

## Stage 3: Design Spec

Create lowercase change `design.md` using `references/design-spec.md`. It is the selected source of
truth for visual language and screen-space UI.

Order this stage by reference role. For `primary-target`, capture and pass the graybox first, then
write `design.md` against it and cite that capture; a spec written from a reading alone propagates
the misreading into the implementation. For `constraint` and `inspiration`, keep the existing order
and reconcile `design.md` against the first render afterwards. Reconciliation is required for every
change that has a reference; the role decides *when* it happens, never *whether* it happens, and
there is no role for which it is optional, `inspiration` included. Every change with a reference
records a `Spec Reconciliation` section; an empty table is a valid result, an absent section is not.

`design.md` records:

- Layout grid and responsive behavior.
- Color tokens and contrast posture. For website references, these must cite the ready
  `palette-evidence.json`, preserve DOM and raster-media sources separately, and record coverage,
  luminance, saturation, and temperature relationships rather than listing accents alone.
- Type scale and font constraints.
- When shipped copy contains CJK text, the system/project font stack, CJK body size and line height,
  punctuation/mixed-script convention, and decorative subset evidence required by
  `references/cjk-typography.md`.
- User-facing copy follows `references/plain-language.md`: titles name the smallest accurate scope,
  the first useful sentence exposes the consequence or action, and controls name only real actions.
- Component inventory and states.
- Motion rules and reduced-motion fallback.
- Accessibility requirements: semantic structure, focus order, keyboard behavior, labels, announcements, contrast.
- Interface-discipline decisions: selected review scope; layout, type, color, writing, surface,
  and accessibility constraints affected by the change; and downstream consumers of changed shared
  components or tokens.
- Asset strategy: real assets, generated bitmap images, icons, or no-assets justification.
- Anti-template decisions when the contextual anti-slop review is active: deliberately avoided
  patterns, retained common patterns, product-specific rationale, and non-applicable rules.
- Spec reconciliation when the change has a reference: the cited graybox capture, the reconciliation
  timestamp, and every value the implementation changed with an observed cause.
- Design Playground integration when applicable: the accepted instruction plus `playground-kind`,
  `playground-artifact-sha256`, `playground-state-sha256`, and `playground-prompt-sha256` bindings.
  Non-design modes use the purpose-aware target in `references/playground.md`: `motion.md`,
  `handoff.md`, `brief.md`, `qa.md`, or `scene.md`. Run `designer-pipeline playground check --stage
  integration` after writing the target; a later selection invalidates it and requires reintegration.

Do not define camera projection, world coordinates, geometry, lighting, world-space UI, or spatial
navigation in `design.md`. Those belong in `3d.md` for 3D families.

When requirements-driven synthesis is active, also write the project `DESIGN.md` according to
`references/design-synthesis.md`. Link it from change `design.md`; do not duplicate the entire file.

Use concrete values when implementation will need them. Avoid vague style words without implementation consequences.

Create `motion.md` when the change includes animation, transitions, gesture feedback, loading motion, scroll-linked motion, route transitions, hover/focus motion, or micro-interactions. Use `references/motion-spec.md`.

Change `motion.md` must record the validated project `MOTION.md` hash, selected primitive IDs,
authored or observed provenance, runtime capability status, and any degradation. It may not silently
invent a parallel motion vocabulary.

`motion.md` is required for:

- GSAP or Anime.js usage.
- PixiJS, Canvas, WebGL, or WebGPU render surfaces.
- React view transitions.
- Scroll-triggered animation.
- Multi-step choreography.
- Motion that affects navigation, focus, loading, data updates, or user confidence.

Simple CSS hover/focus transitions can stay in `design.md`, but still need reduced-motion behavior and QA notes.

Create normative `scene.json` plus its family-specific readable projection using
`references/scene-runtime-spec.md` when the change has persistent spatial
state or an engine-owned lifecycle: Canvas/WebGL/WebGPU scenes, cameras, coordinate transforms,
asset manifests, render or game loops, physics, world input, procedural state, save/load state, or
runtime-specific degradation. The pair binds design and motion semantics to a selected adapter; it
does not replace `design.md` or `motion.md`.

Fixed-camera cinematic 3D, Three.js, React Three Fiber, Babylon.js, PlayCanvas, CesiumJS, and
equivalent 3D families require `scene.json` plus `3d.md` from `references/3d-spec.md`. Phaser,
PixiJS, persistent 2D editors,
WebGPU/WGSL effects without a 3D family, and stateful narrative runtimes use `scene.json` plus
`scene.md`. A narrative UI without a scene renderer may remain DOM-first, but still requires the
pair when it owns dialogue state, save/load, backlog, autoplay, or another persistent game-state
lifecycle.

Every change with a `reference-evidence.json` implements and verifies the actual-runtime graybox
gate before materials, glow, bloom, depth of field, scanlines, or cinematic grading. The gate is
unconditional: it applies to `2d` and `2.5d` as well as `3d` and `hybrid`, to every fidelity mode,
and to runs whose source is `pending`. `3d` and `hybrid` routes record the graybox contract in
`3d.md` and `reconstruction.json`; `2d` and `2.5d` routes without a `reconstruction.json` record it
in `reference-evidence.json`. Camera navigation is required only when the approved interaction model
is inspectable or navigable.

## Stage 4: Tasks

Create `tasks.md` with a checkbox list grouped by implementation surface:

- Tokens/theme
- Layout
- Components
- States
- Playground build, selection, and purpose-aware integration when required
- Motion opportunity screen and static-alternative decision
- Motion vocabulary, curve, runtime, and spec
- Motion review and evidence capture
- Scene/runtime spec when required
- Accessibility
- Responsive QA
- Browser/manual QA
- Interface discipline review for changed UI: scope, selected domains, consumer expansion, and
  finding status classification.

Tasks must be small enough to verify independently. Update checkboxes as implementation proceeds.

## Stage 5: Implementation

Implement directly from `design.md` and `tasks.md`.

Rules:

- When `playground.json` records required applicability, run `designer-pipeline playground check
  --stage integration --change-root <change-root> --json` and stop unless it reports `ready`.
  Implementation consumes the bound purpose-aware artifact, never unbound browser state or an
  earlier copied prompt.

- Re-run `design-system resolve-stack`, `design-system decompose`, `design-system route`, and
  `design-system decide` against the final brief and installed project stack. Stop if the stack or
  design-system decision is not `ready`, or if its registry hash/selected routes differ from the
  artifacts approved at Stage 0 without a recorded design change.
- For website-cloning changes, run `scripts/check-website-clone-foundations.cjs --change-root
  <change-root> --json` first and stop unless it reports `ready`.
- Re-run `scripts/check-design-foundation.cjs` and stop unless it reports `ready`.
- Re-run `scripts/check-motion-foundation.cjs` and stop unless it reports `ready`.
- When references influence the change, run `designer-pipeline reference check` and stop unless it
  reports `ready`, with exactly one exception: a standalone `source-pending`. Standalone means the
  top-level `reason` is `source-pending` **and** every entry in the `stages` map reports `ready`.
  Only then continue - through the graybox gate, with the measured gates kept blocked. A run blocked
  for `source-pending` *and* anything else - a blocked `stages.graybox`, a blocked
  `stages.reconciliation`, any other reason - is still a stop. The aggregate reports one top-level
  `reason`, so `source-pending` on that line is not by itself evidence that the stages are clear;
  read the `stages` map before continuing. This command now carries three
  stages - `stages.graybox`, `stages.reconciliation`, and the aggregate's own contract checks - and
  reports `blocked` when any of them is not `ready`, so a change that passed it before the fold can
  block on a `Spec Reconciliation` section that was never written.
- The two reconstruction gates block different work and do not overlap. The graybox gate blocks
  optical treatment: materials, glow, bloom, depth of field, scanlines, and grading. The geometry
  gate blocks detail geometry, type treatment, and any measured fidelity claim. Optical treatment is
  released by the graybox gate alone; a blocked geometry stage is not a reason to withhold it.
- For every change with a `reference-evidence.json`, run
  `designer-pipeline reconstruction check --stage graybox` and stop unless it reports `ready`
  before authoring materials, glow, bloom, depth of field, scanlines, or cinematic grading. This
  gate is unconditional across `2d`, `2.5d`, `3d`, and `hybrid`, across every fidelity mode, and
  across runs whose source is `pending`. Read the three stages independently: a blocked `geometry`
  never implies a passed `graybox`, and both blocked at once is a process failure, not an
  environmental one.
- For exact or adaptive static-reference reconstruction, run
  `designer-pipeline reconstruction check --stage geometry` and stop unless it reports `ready`
  before detail geometry, type treatment, or any claim that the frame measurably matches the source.
  This gate must pass on rectification, front elevation, locked camera, distributed landmarks, and
  overlay evidence. A pending source reports `blocked` with reason `source-pending` and never
  `fidelity-limited`; an unreadable source declaration reports `reference-source-unparseable`,
  `reference-source-malformed`, or `reference-source-availability-invalid`. A missing measurement is
  a status, never a filled-in value. Reopening the camera invalidates the gate and requires a new
  calibration pass.
- A source nobody wrote down is not a resolved source. An absent `reference-evidence.json` and a
  document with no `source` field keep the legacy `resolved` availability, so geometry on an older
  change is untouched, but neither resolves anything: a `measured` graybox comparison on such a
  change blocks with `reference-source-unrecorded` or `reference-source-undeclared`. Declare
  `comparison.mode: qualitative` instead, which is what a comparison with no source to measure
  against actually is.
- A blocked geometry stage does not stop the run. When the graybox stage is `ready`, continue into
  optical treatment and record the verification claim as `unverified`. For a `2.5d` primary-target
  exact reconstruction with a pending source the geometry stage can never report `ready`, so
  treating it as a full stop would stop the run permanently; that is a misreading of this gate, not
  a safe default.
- Link the validated project `DESIGN.md` from the active lowercase change `design.md`.
- Link the validated project `MOTION.md` and its hash from active lowercase change `motion.md` when
  the change includes non-trivial motion.
- Link `scene.json` and its required `scene.md` or `3d.md` projection from the active change when a
  graphics, game, or persistent narrative runtime is selected. Run `designer-pipeline scene check`
  and verify that capability
  family, adapter, version, lifecycle, assets, input,
  accessibility, performance, determinism, degradation, and cleanup owners are complete.
- If the repo uses OpenSpec, keep the design-pipeline artifacts linked to the active OpenSpec change and do not create a parallel source of truth.
- If the repo uses GBrain, sync or reference the design decision artifacts through the repo's established GBrain surface instead of inventing a new memory format.
- If Matt Pocock engineering skills are installed, use `codebase-design`, `grill-with-docs`, `implement`, and `matt-tdd` where they fit the current implementation stage.
- Prefer existing components, tokens, icons, and layout primitives.
- Apply the Impeccable craft floor: real controls and states, readable contrast and measure,
  keyboard and reduced-motion paths, intentional browser surfaces, and no content hidden behind
  entrance motion.
- Do not add a design dependency unless the user explicitly requested it or the repo already uses it.
- Do not create nested cards, decorative gradient orbs, generic purple/blue gradients, or marketing-style hero layouts for operational tools.
- Use real visual assets or generated bitmap assets when the task is a website, landing page, portfolio, or visual product surface.
- Use stable dimensions for fixed-format UI elements so hover, labels, icons, loading states, and dynamic text do not shift layout.
- Ensure mobile and desktop text fits without overlap.

## Stage 6: Gate Review

Before claiming completion, write `qa.md` using `references/qa-checklist.md` with the result of these gates:

- Visual gate: composition is non-generic, brand/product signal is clear, palette is not one-note, typography fits the surface.
- Impeccable gate: the selected visitor mode is explicit, refinement has not become a hidden
  redesign, anti-default exceptions are justified, and critique/audit/polish claims are supported
  by separate evidence.
- UX gate: primary workflow is obvious, states are complete, destructive actions are guarded, recovery paths exist.
- Playground gate: when interactive exploration is required, the self-contained build, selected
  typed state, natural-language prompt, and purpose-aware target bindings all pass `playground
  check --stage integration`; browser/manual QA exercises every control and preset and confirms
  that representation, prompt, and copied text stay synchronized. Otherwise a supported waiver is
  recorded.
- Plain-language gate: user-facing copy puts the exact consequence or available action first, then
  passes the fact-scope review in `references/plain-language.md`; a shorter rewrite cannot widen a
  partial failure, remove a limit, strengthen uncertainty, or invent an action.
- Engineering gate: existing patterns are respected, no unnecessary dependency or abstraction was added.
- Accessibility gate: keyboard navigation, focus behavior, labels, reduced motion, and contrast are checked.
- Interface-discipline gate: the bundled full or quick protocol was applied to the actual UI;
  changed UI has an `interface-review` scope, consumer expansion, removed-signal inspection where
  applicable, and `Introduced` / `Regression` / `Pre-existing` status for every finding in `qa.md`.
- Motion gate: interaction feedback is intentional, not decorative, and has reduced-motion fallback.
- Animation opportunity/review gate: non-trivial motion passed the frequency, purpose, function, and
  budget screen before implementation; its vocabulary/curve/runtime decision and actual-surface
  review evidence are recorded, including interruption, performance, accessibility, and cleanup.
- Motion foundation gate: project `MOTION.md` is `ready`, its hash is recorded, and selected
  primitive IDs exist in the bundled registry.
- Motion spec gate: `motion.md` exists for any non-trivial motion and includes trigger, purpose, timing, easing, choreography, interruption behavior, implementation library, performance budget, and reduced-motion fallback.
- Reference-routing gate: when references influence the change, `reference.md` records evidence and
  normative `reference-evidence.json` separates reference role, requested/effective fidelity,
  geometry, camera, interaction, and output; selects `2d`, `2.5d`, `3d`, or `hybrid`; names the
  required artifact set; records source availability; and records approval. Every route names
  `graybox.png` in `requiredArtifacts`, and v2 documents carry a `composition` block. A document
  declaring `design-pipeline.reference-evidence.v1` while carrying `intent` or a `graybox` block is
  current work wearing a stale version label: it is validated as v2 and owes `intent` and
  `composition`, failing with `schema era mismatch:` until both are recorded. A v1 document that
  carries neither stays exempt.
- Verification claim gate: `qa.md` records the claim as `verified`, `fidelity-limited`, or
  `unverified`, derived from one command - `reconstruction check --stage final` - read in full, its
  top-level status together with every entry in its `stages` map. `verified` requires the top-level
  status *and* every reported stage to be `ready`; the top-level status alone is not the derivation,
  because a `final` stage can report `ready` beside a `blocked` `stages.graybox`. Only that complete
  output is evidence for the claim: `reconstruction check` defaults to `--stage geometry`, and a
  stage-scoped result - the default run, an explicit `--stage geometry` or `--stage graybox` run, or
  a bare `stages.graybox` reading lifted out of any result - is rejected as evidence for `verified`,
  because it answers only for the stage that was asked for. A `--stage final` result that is
  missing, unreadable, or incomplete records `unverified`. A pending or
  unresolvable source records `unverified` by blocking a stage, and nothing in `qa.md`, `design.md`,
  or the final response describes an `unverified` run as verified, exact, identical, pixel-perfect,
  or complete.
- Reference composition gate: `reference.md` carries the per-region structure table, an explicitly
  answered uniformity question, and named exceptions; `composition` in `reference-evidence.json`
  matches it and does not contradict itself. When two or more `rows x columns` structures tie for
  most-common there is no norm to follow, so every region records what it breaks from or is named by
  one that does; otherwise validation fails with `composition ambiguity:`. The modal structure is
  read from the counts, so reordering the table cannot change the verdict.
- Graybox gate: `designer-pipeline reconstruction check --stage graybox` reports `ready` for every
  change with a `reference-evidence.json`, on every route and in every fidelity mode. The capture is
  layout-only, its suppression comes from a declared runtime graybox mode that names the layers it
  disables - a bare token blocks with `graybox-mode-unverifiable` - and its comparison
  addresses the recorded region ids by name. Exactly one carrier holds the block - two is
  `graybox-carrier-conflict` and neither block is validated. A comparison that names regions while
  no `composition` was recorded anywhere is `graybox-composition-unrecorded` or
  `graybox-composition-undeclared`, not a pass. A reference document the contract cannot read blocks
  this stage too, with the reason that names the fault. A `qualitative` comparison proves ordering
  discipline and is never fidelity evidence. A run whose `geometry` stage is blocked on a missing
  source must still show `graybox: ready`; both blocked is a process gap, not an environmental
  limitation.
- Reference raster gate: a `measured` comparison is refused unless the bytes behind `source.path`
  are a PNG the stage can read a width and height out of. Existence is not enough; the gate reads
  the first 24 bytes and checks the PNG signature and the IHDR dimensions. Each failure keeps its
  own reason - `reference-source-path-undeclared`, `reference-source-raster-uncontained`,
  `reference-source-raster-missing`, `reference-source-raster-unreadable`,
  `reference-source-not-raster`, `reference-source-raster-truncated` - and a `video` or `live-page`
  source reaches `measured` only by exporting the compared frame as a PNG and naming that.
- Reference freshness gate: when `source.resolvedAt` is recorded, a `measured` graybox capture taken
  before it blocks with `graybox-capture-predates-source` and has to be re-run rather than
  re-labelled; a `capturedAt` that will not parse is `graybox-capture-uncomparable`, never counted
  as fresh. An absent `resolvedAt` is the legacy default and is not compared. A `resolvedAt` that is
  not an ISO 8601 timestamp is `reference-source-resolved-at-invalid`, and one recorded beside
  `availability: pending` is `reference-source-resolved-at-contradictory`; both block every stage.
- Spec reconciliation gate: change `design.md` carries a `Spec Reconciliation` section citing a
  graybox capture that exists on disk. An empty table is `ready`; an absent section is `blocked`.
  Every `Cause` entry describes an observation, not an intention. This gate is folded into
  `designer-pipeline reference check` and reported under `stages.reconciliation`, so the aggregate
  returns `blocked` whenever it is not `ready`; `reconciliation check` on its own is still
  available. A reconciliation that cannot be evaluated is `reconciliation-unverifiable`, never
  `ready`. Applicability no longer waits for a hand-authored carrier: a valid `website-cloning.json`
  with targets, or a `design-synthesis.json` recording reference inputs, makes the gate apply from
  `change init`. An absent manifest keeps the carrier-only default; a manifest that is present but
  unreadable, malformed, or self-contradictory blocks with
  `reconciliation-manifest-unreadable`, `reconciliation-manifest-malformed`, or
  `reconciliation-manifest-contradictory`, because a broken manifest leaves applicability itself
  undecidable.
- Exact reconstruction gate: `reconstruction.json` separates image/canonical/world/camera spaces;
  binds rectification, front elevation, locked camera, distributed landmarks, and overlay; and
  passes `designer-pipeline reconstruction check --stage geometry`.
- Final fidelity gate: an independent EvidencePort has the required comparison capabilities and a
  successful probe; its receipt hashes match the reference, implementation, and diff images; and
  `designer-pipeline reconstruction check --stage final` reports `ready`. Exact mode permits no
  intentional mismatch masks.
- Scene/runtime gate: `scene.json` and matching `3d.md` exist for 3D families; `scene.json` and
  matching `scene.md` exist for persistent non-3D spatial, game-engine, GPU, or stateful narrative
  surfaces. They record the capability family, adapter,
  version, scene/camera and
  coordinate model, lifecycle, assets, input, accessibility, budgets, deterministic evidence,
  degradation, and cleanup ownership.
- Responsive gate: mobile and desktop layouts have no overlap or clipped text.
- Manual QA gate: browser or matching surface was used to inspect the actual UI.
- Bounded verification gate: one batched desktop/mobile inspection and detector pass was completed,
  one repair batch was applied, and no open-ended polish loop is being used as a completion claim.
- Contextual anti-slop gate when active: run `scripts/evaluate-anti-slop.cjs`, repair hard
  blockers, resolve contextual warnings or record accepted context, and link the report from
  `qa.md`. Preference findings never block completion.
- Scorecard gate: visual taste, UX clarity, accessibility, responsiveness, motion quality, engineering fit, and performance risk are scored 0-5 with notes.
- Evidence gate: browser/tool output is represented by a validated receipt with explicit status,
  hashes, redaction, and missing-artifact states; visual guessing never fills missing evidence.
- Interoperability gate: tokens, UI IR, design-to-code mappings, pattern IDs, and design-tool
  receipts pass their public schemas when used.
- Benchmark gate: every required responsive, accessibility, palette, motion, scene, component-state,
  and evidence scenario passes; aggregates cannot hide a required failure.
- Adaptation gate when active: read `references/adaptation.md`; keep the Methodology Kernel frozen;
  keep task policy ephemeral; admit exactly one inert `add`, `replace`, or `delete` candidate; and
  require independent, hash-bound, disjoint replay and held-out evidence with strict improvement,
  complete invariants, and explicit approval before a project or user skill is promoted. A shadow
  candidate, tie, unknown, regression, scope mismatch, or missing evidence never changes effective
  guidance.
- Adapter governance gate: catalog routes resolve through the registry and new adapters pass pinned
  provenance, license, maintenance, security, permission, degradation, and admission review.

If a gate cannot be run, record why and use the next-best check.
