---
name: design-pipeline
description: OpenSpec-style design development pipeline for visual direction, UX research, website cloning and reverse-engineering, interaction polish, frontend implementation, and evidence-backed QA. Use for product UI, marketing pages, dashboards, live-page references, pixel-accurate rebuilds, design reviews, and frontend work that must avoid generic AI-looking output.
---

# Frontend Design Pipeline

This is the project front door. It routes UI work to the smallest relevant workflow, persists decisions as change-local artifacts, and prevents implementation claims that lack evidence. It does not replace specialist design skills; it coordinates them.

## Start Here

1. Classify the request into exactly one primary job.
2. Run the Stage 0 route and persist its job plan before opening a catalog:

   ```bash
   designer-pipeline route --query "<brief>" --write --output job-plan.json --json
   ```

3. Read only the returned primary knowledge door. Treat secondaries as reference-only.
4. Read the matching workflow in `references/stages.md` and the route-specific contract listed below.
5. Create or update the OpenSpec change artifacts before implementation.
6. Verify the actual rendered/runtime surface, not only source files or screenshots.

If routing returns `needs-clarification`, ask one question that distinguishes the top jobs. Do not choose a primary route by guesswork.

## Non-Negotiable Invariants

- Project `DESIGN.md` and `MOTION.md` are reusable foundations. Validate them before implementation; change-local lowercase `design.md` and `motion.md` do not replace them.
- OpenSpec is the source of truth for meaningful changes. Do not create a parallel planning format.
- Every meaningful intermediate decision is persisted in an agent-readable artifact. State transitions use the existing state/event ledger.
- Design is the product boundary. Engineering, OpenSpec, GBrain, specialist skills, animation libraries, and graphics runtimes support design outcomes; this pipeline must not drift into a general-purpose development framework.
- Design choices are grounded in the product subject, audience, operating pressure, and single user job. Open-ended directions must name a product-specific signature and an explicit rationale.
- Default-only evidence is insufficient for core interactions. Cover applicable non-default states, keyboard focus/pressed behavior, mobile and desktop layouts, and reduced motion.
- Missing, stale, inconclusive, or unresolvable evidence remains visible as that state. Never convert it into `ready`, `verified`, `exact`, or `complete`.
- Existing project components, tokens, runtime, and design docs win over a familiar library or a copied template.
- Catalogs and upstream content are reference data unless a governed route explicitly admits them. Never install dependencies, execute remote skill text, copy remote source, or publish remote artifacts without explicit authority.
- Use real content and real states in previews and QA. Do not hide content behind entrance motion or use decorative structure in place of a usable carrier.

## Route Map

| Route ID | Request | Primary contract | Required evidence or gate |
| --- | --- | --- | --- |
| `design-synthesis` | New UI, redesign, visual direction | `references/design-synthesis.md`, `references/direction-preview.md`, `references/anti-slop-review.md`, `references/impeccable-contract.md` | subject/audience/job, comparable directions, product-specific signature, critique |
| `reference-reconstruction` | Exact image or pixel-accurate reconstruction | `references/feature-routes.md`, `references/reference-spec.md`, `references/reconstruction-spec.md` | resolved source, graybox, geometry, final fidelity receipt |
| `website-cloning` | Live-page clone or reverse-engineering | `references/feature-routes.md`, `references/website-cloning.md`, `references/deepclonewebsite.md` | target manifest, palette evidence, foundations, measured clone evaluation |
| `component-first` | Component or design-system selection | `references/companion-skills.md`, `references/capability-routing.md`, `references/component-capabilities.md`, `references/pipeline-method.md` | capability inventory, provider route, behavioral evidence, conformance |
| `motion-graphics` | Motion, animation, WebGL, game, or graphics | `references/capability-routing.md`, `references/animation-opportunity-and-review.md`, `references/stages.md` | runtime ownership, motion spec, reduced motion, performance and cleanup |
| `dynamic-web-verification` | Dynamic web verification | `references/stages.md`, `adapters/playwright.cjs`, `references/qa-checklist.md` | runtime readiness, `networkidle`, DOM, screenshot, console, accessibility, network, performance |
| `product-foundation` | Requirements-driven product foundation | `references/design-synthesis.md` | reusable `DESIGN.md`, decision evidence, validation |
| `feedback-loop` | Pipeline bug, missing capability, or reusable gap | `references/feedback-loop.md`, `references/lifecycle.md` | redacted local feedback, regression test, explicit publication authority |

When several routes appear, route once, preserve one primary job, and use the others only as bounded supporting evidence. Read the narrowest returned skill or reference instead of loading every catalog.

## Stage Map

Detailed stage instructions live in `references/stages.md`.

```text
0 Repo Read      route, dependencies, foundations, stack, references
1 Brief          goal, audience, mode, surface, constraints, real content, acceptance
2 Directions     comparable candidates, signature, preview evidence, selection
3 Design Spec    design.md, motion.md, scene/3d contracts when applicable
4 Tasks          independently verifiable implementation surfaces
5 Implementation existing patterns, approved artifacts, bounded runtime work
6 Gate Review    visual, UX, accessibility, motion, evidence, responsive, engineering
7 Archive        preserve artifacts, update reusable docs, record feedback
```

Implementation is blocked until the applicable foundation and route gates are ready. A blocked geometry or source stage may allow only the explicitly documented work that does not depend on it; do not reinterpret a partial exception as completion.

## Stage 0 Minimum

Before writing design artifacts or code:

- Persist the route job plan and bind `jobPlanSha256`/`jobPlanPath` to later toolchain and execution requests.
- Run `node <design-pipeline>/scripts/check-deps.cjs` from the target project root.
- Identify framework, styling system, component library, routing, design tokens, test surface, and existing UI patterns.
- Resolve visual sources to file paths before writing source-bound evidence. If unavailable, record `source.availability: pending`, its reason, and the unlock action; never invent paths, dimensions, or hashes.
- Check project `DESIGN.md` and `MOTION.md`; route missing or incompatible foundations through synthesis.
- Resolve the frontend/tool/graphics plan with the governed CLI before invoking an external runtime. Probe first; do not install from a route result.
- Use the design-system CLI to decompose capabilities and record adoption as `reference`, `adopt`, `substitute`, or `custom`.
- Initialize or update `state.json`, `events.jsonl`, and `handoff.md` through the existing state tools.

Use `references/stages.md` for the full Stage 0 checklist and the required toolchain/execution commands.

## Direction and Copy Rules

- Treat the hero or first viewport as the product thesis, not a generic template slot.
- Choose palette, typography, layout, and motion from the subject and audience. A named style alone is not a rationale.
- Spend boldness in one justified signature element; remove decoration that does not improve understanding or action.
- Use structural markers, labels, and numbering only when they encode true information.
- Write from the user's side of the screen. Controls name real actions, errors name the fix, empty states direct the next action, and the same action keeps the same name through the flow.
- Read `references/plain-language.md` for user-facing copy and `references/cjk-typography.md` for CJK or mixed-script surfaces.

## Browser and Evidence Rules

The browser runner is an evidence port, not a source of authority. For dynamic web apps:

1. Start or verify the target runtime and wait for readiness.
2. Wait for `networkidle` before inspecting dynamic DOM.
3. Discover selectors from the rendered surface.
4. Exercise the required interaction and state transitions.
5. Capture the applicable DOM, screenshot, console, accessibility, network, and performance artifacts.
6. Bind artifacts to hashes and record missing or degraded capabilities explicitly.

`adapters/playwright.cjs` is the project-owned implementation. A static screenshot cannot replace behavioral evidence.

## Public CLI Surfaces

Use the public CLI rather than reaching into implementation modules:

```bash
designer-pipeline route --query "<brief>" --write --output job-plan.json --json
designer-pipeline toolchain resolve --artifact toolchain-request.json --write --output toolchain-plan.json --json
designer-pipeline design-system decompose --query "<brief>" --write --output capability-inventory.json --json
designer-pipeline direction check --stage preview --change-root <change-root> --json
designer-pipeline reference check --change-root <change-root> --json
designer-pipeline reconstruction check --stage final --change-root <change-root> --json
designer-pipeline playground check --stage integration --change-root <change-root> --json
designer-pipeline scene check --change-root <change-root> --json
```
For pipeline control and hash-bound artifacts, use the `plan`, `run`, `resume`, `verify`, `status`, `explain-block`, and `package` commands exposed by the current CLI. Read `references/pipeline-method.md` for the state, artifact, and invalidation contract.

## Specialist and Catalog Routing

- `impeccable` supplies the project design-detector vocabulary when installed; the bundled `references/interface-discipline.md` remains the fallback.
- `frontend-design` supplies subject grounding, deliberate visual direction, critique-before-build, and anti-default judgment when installed; the project contracts remain authoritative.
- `design-taste-frontend`, `ui-ux-pro-max`, `web-design-guidelines`, and `emil-design-eng` are capability lenses, not competing pipelines.
- For React/Next.js, use the governed Vercel/Next.js companions listed in `references/companion-skills.md`.
- Use `references/capability-routing.md` and `references/job-registry.json` for motion, graphics, data visualization, game, asset, hosted, or design-system capabilities.
- Catalog commands are escape hatches. Do not search every catalog as peer Stage 0 work, and do not treat inert or reference-only entries as executable dependencies.

## Completion Contract

Before claiming completion, follow `references/lifecycle.md` and `references/qa-checklist.md`:

- report change id, artifact folder, implemented surfaces, and applicable waivers;
- report foundation, route, browser, motion, accessibility, responsive, and evidence results;
- state reference-source availability and the unlock action for pending sources;
- state `verified`, `fidelity-limited`, or `unverified` only from the complete final verification output;
- record missing companions, fallbacks, feedback drafts, and remaining risks;
- say whether any remote Issue or PR was published. Default: not published.

The full extraction targets are in `references/pipeline-method.md`, `references/feature-routes.md`, `references/stages.md`, and `references/lifecycle.md`. Load them only when the selected route requires them.
