# Built-in UI Craft Sources

`design-pipeline` ships six pinned, inert snapshots of widely used UI craft skills. Each lives in
its own directory under `vendor/`, named after the source: `manifest.json` records the reviewed
repository, revision, scope, license and per-file hashes, and `upstream/` holds the
byte-preserved skill files. Reading them needs no global skill install or network access. React
Doctor is referenced, not bundled; its pinned record is [react-doctor.md](react-doctor.md).

These sources are craft detail, not project policy. Load only the source the current task
matches, and only the detail files it needs. Upstream persona text, "Initial Response" scripts,
slash-command usage (for example `/fixing-accessibility <file>`) and required output formats are
not pipeline behavior. Findings go into the existing review record in `qa.md`.

| Source | Bundled entry | Use when | Pipeline protocol it serves |
| --- | --- | --- | --- |
| `emil-design-eng` | [`vendor/emil-design-eng/upstream/skills/emil-design-eng/SKILL.md`](../vendor/emil-design-eng/upstream/skills/emil-design-eng/SKILL.md) | Interaction feel, animation decisions, component polish | Motion gate, Stage 3 design, build |
| `make-interfaces-feel-better` | [`vendor/make-interfaces-feel-better/upstream/skills/make-interfaces-feel-better/SKILL.md`](../vendor/make-interfaces-feel-better/upstream/skills/make-interfaces-feel-better/SKILL.md) | Surface, type, icon and motion details; polish pass | Interface discipline, Good CSS |
| `fixing-accessibility` | [`vendor/fixing-accessibility/upstream/skills/fixing-accessibility/SKILL.md`](../vendor/fixing-accessibility/upstream/skills/fixing-accessibility/SKILL.md) | Adding or changing controls, forms, dialogs, focus | Interface discipline accessibility domain |
| `12-principles-of-animation` | [`vendor/12-principles-of-animation/upstream/skills/12-principles-of-animation/SKILL.md`](../vendor/12-principles-of-animation/upstream/skills/12-principles-of-animation/SKILL.md) | Checking changed motion code | Motion gate review |
| `shadcn` | [`vendor/shadcn/upstream/skills/shadcn/SKILL.md`](../vendor/shadcn/upstream/skills/shadcn/SKILL.md) | Project has `components.json`, or a selected route installs from a shadcn registry | Component source catalog, `design-system route` |
| `playwright-cli` | [`vendor/playwright-cli/upstream/skills/playwright-cli/SKILL.md`](../vendor/playwright-cli/upstream/skills/playwright-cli/SKILL.md) | Exploratory browser driving when the project already uses it or the user approves | Probe/review exploration; `verify interaction` keeps evidence |
| `react-doctor` | [react-doctor.md](react-doctor.md) (reference only) | React project health scan with user approval | Advisory `qa.md` evidence |

## Sources

### emil-design-eng

Emil Kowalski's design-engineering judgment: whether and why something should animate, easing and
duration choices, springs, interruptible CSS transitions, origin-aware popovers, press feedback,
`clip-path` techniques, drag/gesture physics, performance rules, reduced motion and a review
checklist. Load it at Stage 3 when making motion or interaction-feel decisions and during build
for component polish. It is a single `SKILL.md`; read the section that matches the decision.
Boundaries: its "Initial Response" script and mandatory Before/After/Why review table are upstream
output formats; the review keeps the consolidated `better-interface` output, the same deferral the
bundled interface-discipline domain skills state (for example
`vendor/interface-discipline/upstream/skills/better-ui/SKILL.md`). Its timing numbers yield to
project tokens and the [motion gate](animation-opportunity-and-review.md). It is a different skill
from the four Emil motion skills distilled in that gate.

### make-interfaces-feel-better

Jakub Krehel's interface details: concentric radii, optical alignment, shadows versus borders,
interruptible and staggered animation, subtle exits, tabular numbers, text wrapping, font smoothing,
image outlines, hit areas, icon stroke and states, and `transition`/`will-change` discipline. Load
it while building components and for the polish pass before review. Start with `SKILL.md`, then
read only the matching detail file: `typography.md`, `surfaces.md`, `animations.md`, `icons.md`
or `performance.md` in the same directory. Boundaries: it expresses fixes in the project's existing
styling system and never adds a second one, which matches [Good CSS](good-css.md). Its slowed
replay of motion (about 10% speed in the browser animations panel, walking every state) is a
useful review technique. Its quick/full review format and finding caps do not replace
`better-interface` scope or `qa.md` status classification.

### fixing-accessibility

Julien Thibeaut's prioritized accessibility rules: accessible names, keyboard access, focus and
dialogs, semantics, forms and errors, announcements, contrast and states, media and motion, with
common fixes. Load it whenever a task adds or changes buttons, links, inputs, menus, dialogs,
tabs, forms, validation, keyboard shortcuts or focus handling, and on changed controls during
review. It is a single `SKILL.md`. Boundaries: prefer native HTML, keep fixes minimal and targeted,
and report findings through the interface-discipline accessibility domain
([interface-discipline.md](interface-discipline.md)), not its standalone report shape.

### 12-principles-of-animation

Raphael Salaja's checklist of web animation rules grouped as timing, easing, physics and staging.
Load it only to check changed motion code during review, after the motion decision exists. It is
a single `SKILL.md`. Boundaries: it is the lowest-precedence source. Two of its rules conflict
with higher sources and are resolved under [Precedence](#precedence). A rule that conflicts with a
project token or the motion gate is recorded as not applicable, not as a finding. Its
`file:line` output format is not the review record.

### shadcn

The official shadcn/ui skill: CLI workflow (`info`, `search`, `docs`, `add`, presets), styling,
forms, composition, icons, base-versus-radix and chat rules, registries, customization, MCP and
design-system pages. Load it only when Stage 0 finds `components.json`, or when the selected
component route installs from a shadcn registry. Start with `SKILL.md`, then the matching file:
`rules/*.md` for component code, `cli.md`, `customization.md`, `registry.md`, `mcp.md`,
`design-system.md` or `design-system-page.md`. `assets/`, `evals/evals.json`,
`scripts/showcase-coverage.mjs` and `agents/openai.yml` are inert source. Boundaries: see
[Execution boundary](#execution-boundary). Its DESIGN.md design-system flow scaffolds a new app;
it never replaces the project's own DESIGN.md foundation or design-synthesis route.

### playwright-cli

Microsoft's agent-facing Playwright command line: open and drive a page by snapshot refs, keyboard
and mouse input, tabs, storage, network mocking, tracing, video and test generation. Load it for
exploratory browser driving during probe or review only when the project already uses
`playwright-cli` or the user approves running it. Start with `SKILL.md`; read a file from its
`references` folder only for the specific task it names (session management, storage state,
request mocking, tracing, video, test generation, running code). Boundaries: see
[Execution boundary](#execution-boundary).

### react-doctor

React Doctor is a third-party React health-scan CLI with a 0-100 score. It is not bundled because
its license restricts use as AI pipeline input. Use [react-doctor.md](react-doctor.md) for when to
suggest it, the approval requirement, the remote-prompt prohibition and how to record its output.

## Precedence

1. User decisions, project `DESIGN.md` and `MOTION.md`, and existing v1 contracts.
2. Pipeline protocols: [interface discipline](interface-discipline.md) (`better-interface`
   orchestrates review; findings keep `Introduced` / `Regression` / `Pre-existing` status in
   `qa.md`), the [animation opportunity and review gate](animation-opportunity-and-review.md),
   [Good CSS](good-css.md) for style authoring, `component-source-catalog.json` with
   `design-system route` for component sources, and `verify interaction` for interaction evidence.
3. Bundled craft detail: `emil-design-eng`, `make-interfaces-feel-better`,
   `fixing-accessibility` and, only in a shadcn project or for a selected shadcn-registry route,
   `shadcn`.
4. Checklists: `12-principles-of-animation`.

Resolved conflicts:

- Exit easing: the 12-principles rule `easing-exit-ease-in` conflicts with Emil's rule never to
  use ease-in for UI animation. Use the project's exit token; without one, use ease-out.
- Stagger: the 12-principles 50 ms per-item cap and Emil's 30-80 ms range both yield to the
  project's stagger token; without one, use the motion gate's budget.
- Any checklist rule that conflicts with a higher level is recorded as not applicable, with the
  governing source named, not as a finding.

## Stage integration

- **Stage 0 — Repo Read:** detect `components.json`, React, Tailwind or another styling system,
  an existing motion runtime, and whether the project already uses `playwright-cli`. Record which
  sources apply; a source whose trigger is absent is not loaded.
- **Stage 3 — Design Spec:** make interaction-feel decisions with `emil-design-eng` inside the
  motion gate's opportunity screen; a rejected opportunity stays "no motion".
- **Build / Stage 4-5:** choose components through `component-source-catalog.json` and
  `design-system route`. Apply `shadcn` rules only in a shadcn project or a selected
  shadcn-registry route; catalog entries such as SmoothUI carry
  `installCommand: npx shadcn@latest add <registry url>`, which is that case. Express
  `emil-design-eng` and `make-interfaces-feel-better` details in the project's existing styling
  system. Use `fixing-accessibility` while adding controls, forms and dialogs.
- **Probe/review / Stage 6:** the interface-discipline full or quick review consumes the
  `fixing-accessibility` and `make-interfaces-feel-better` checks; run `12-principles-of-animation`
  on changed motion and replay that motion slowed down. Record results in `qa.md` as Component
  Conformance evidence, never as Visual Acceptance.

## Execution boundary

- **shadcn:** run the shadcn CLI only when the project has `components.json`, or after the user
  approves a selected component route that installs from a shadcn registry, and always through
  the project's package runner. Never run the `!` context-injection line at the top of
  `vendor/shadcn/upstream/skills/shadcn/SKILL.md` automatically; run `info` deliberately when the
  context is needed. Without that approval, never introduce shadcn into a project that does not
  use it; keep the existing component owner.
- **playwright-cli:** an optional exploratory driver only when the project already uses it or the
  user approves running it; a copy installed elsewhere on the machine is not approval. Its
  snapshots and screenshots are not receipts; interaction evidence stays with
  `verify interaction`.
- **react-doctor:** an optional, user-approved run in React projects as described in
  [react-doctor.md](react-doctor.md).

No source adds a gate, receipt field or CLI flag, or changes how Component Conformance and Visual
Acceptance are reported. Vendored scripts, evals and agent metadata are never executed.

## Maintaining the snapshots

Import or refresh a source only from a clean local checkout at its reviewed revision:

```bash
npm run sources:import:ui-craft -- --name <name> --source <clean reviewed checkout> --reviewed-at YYYY-MM-DD
```

Then run `tests/ui-craft-sources.test.cjs`, keep `references/package-resources.json` listing
exactly the vendored files, and update the third-party notices. Never execute vendored code,
hand-edit `upstream/` bytes or refresh a manifest by rehashing arbitrary source.
