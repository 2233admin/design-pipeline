# Requirements-Driven DESIGN.md Synthesis

## Purpose

Every project using the pipeline must have reusable `DESIGN.md` and `MOTION.md` foundations before
implementation. Use this module when `DESIGN.md` is missing or no longer covers the requested
product direction; synthesize or validate `MOTION.md` from the same requirements and evidence
before the final continuation gate.

This is a synthesis workflow, not a template picker. A public DESIGN.md collection, a live website,
or an existing component library can supply evidence. The target product's requirements, users,
workflows, constraints, and existing code determine the result.

Check the invariant first:

```powershell
node <design-pipeline>/scripts/check-design-foundation.cjs `
  --project-root . `
  --json

node <design-pipeline>/scripts/check-motion-foundation.cjs `
  --project-root . `
  --json
```

- `ready`: reuse the foundation and link it from the active change.
- `synthesis-required`: initialize this workflow; implementation remains locked.
- `invalid`: repair or resynthesize the file before implementation.

The motion checker uses the same status names. An intentionally motionless product still authors a
`static` foundation with accessibility, runtime, and source decisions.

The official DESIGN.md format separates machine-readable tokens from human-readable design
rationale. Preserve both, but optimize first for clear, specific intent. “Modern, clean, premium”
is not a direction. A concrete product world, audience, operating pressure, and set of exclusions is.

## Quick Start

From the target project:

```powershell
node <design-pipeline>/scripts/init-design-synthesis.cjs `
  --change-id create-product-design-system `
  --problem "Design an operations console for support leads handling urgent escalations" `
  --reference-url https://example.com `
  --template "awesome-design-md:linear" `
  --framework nextjs `
  --budget session
```

The initializer creates or augments one OpenSpec/design change and prints the first interaction:

```text
/grill-with-docs <problem>
```

The bundled scripts do not invoke a model, scrape a URL, or create tracker issues. The host agent
performs those capabilities and records their evidence through the transition command.

## Source Modes

Runs may combine these modes:

- `requirements-only`: product intent and repository constraints are sufficient.
- `reference-site`: an authorized page supplies measured visual or interaction evidence.
- `template-evidence`: an existing DESIGN.md supplies patterns to consider.
- `hybrid`: requirements, repository evidence, references, and examples are synthesized together.

Every source has a role:

| Role | Authority |
| --- | --- |
| `requirement` | Product intent and acceptance constraints |
| `existing-system` | Current framework, components, tokens, and behavior |
| `reference-site` | Measured patterns that may be selectively adopted |
| `template` | Inspiration only; never the target product identity |
| `official-spec` | DESIGN.md structure and lint behavior |

Do not merge brands by averaging their colors and radii. Record each adopted property, its
project-specific reason, and the properties deliberately rejected.

## Interaction State Machine

### 1. Grill with docs

Run `/grill-with-docs <problem>` with repository docs, requirements, glossary, and existing
architecture in scope. Resolve product language and decisions that materially affect design:

- audience and operating pressure;
- primary workflows and failure states;
- information density and hierarchy;
- brand posture and prohibited visual registers;
- accessibility, platform, performance, and asset constraints;
- reusable component-system expectations.

Write the resulting ADR, glossary, or decision document inside the active change, then record it:

```powershell
node <design-pipeline>/scripts/advance-design-synthesis.cjs `
  --change-root openspec/changes/create-product-design-system `
  --event grill-completed `
  --evidence decisions/grill.md
```

Do not invent the user's side of a material decision. In a non-interactive run, persist the pending
question in `handoff.md` and stop at the interaction gate.

### 2. Assess scope

Count independently meaningful surfaces, workflows, external integrations, unresolved unknowns,
and design decision points:

```powershell
node <design-pipeline>/scripts/advance-design-synthesis.cjs `
  --change-root openspec/changes/create-product-design-system `
  --event scope-assessed `
  --surface-count 4 `
  --workflow-count 3 `
  --integration-count 2 `
  --unknown-count 6 `
  --decision-count 9
```

The command calculates:

```text
score = surfaces*2 + workflows*3 + integrations*3 + unknowns + decisions
```

Budget thresholds are `small=8`, `session=24`, and `program=60`.

If the score fits, continue to synthesis. If it exceeds the selected budget, say:

```text
哦，天哪，这比我预期的要大得多。
```

Then request:

```text
/wayfinder 为此制作一张地图
```

This is a scope transition, not a failure. Do not show the surprise message merely because the
problem sounds ambitious; use the recorded counts and budget.

### 3. Link a real Wayfinder map

Wayfinder owns a shared issue-tracker map and decision tickets. The bundled validator accepts
credential-free GitHub Issues/Projects, GitLab Issues, Linear, and Jira URLs. If no supported tracker
adapter is configured, leave the run at `awaiting-wayfinder`; do not synthesize a fake local issue
map.

After the host creates the map:

```powershell
node <design-pipeline>/scripts/advance-design-synthesis.cjs `
  --change-root openspec/changes/create-product-design-system `
  --event wayfinder-linked `
  --map-url https://github.com/org/repo/issues/123
```

The map clarifies decisions. It does not become a second design source of truth.

### 4. Synthesize the product design

Create 2-3 directions in change `directions.md`, select one, and write:

- change `design.md`: implementation decisions for this change;
- project `DESIGN.md`: reusable product identity for future coding agents.
- project `MOTION.md`: reusable motion language, or an explicit static posture.

The project DESIGN.md must contain YAML frontmatter with `name` and these level-two sections:

1. Product Context
2. Overview
3. Colors
4. Typography
5. Layout
6. Components
7. Do's and Don'ts
8. Source Decisions

`Source Decisions` must explicitly identify adopted and rejected source properties and link the
active change id or artifact path.

Project `MOTION.md` follows `references/motion-foundation.md`. It must declare timing and
choreography principles, primitive vocabulary, procedural and runtime policy, reduced-motion
substitutions, and source decisions. Change `motion.md` then selects from that foundation.

Record and validate it:

```powershell
node <design-pipeline>/scripts/advance-design-synthesis.cjs `
  --change-root openspec/changes/create-product-design-system `
  --event design-generated `
  --design-file DESIGN.md
```

### 5. Continue

After both project foundations validate, the host should immediately continue unless another
material decision is pending:

```powershell
node <design-pipeline>/scripts/advance-design-synthesis.cjs `
  --change-root openspec/changes/create-product-design-system `
  --event continue
```

Implementation reads project `DESIGN.md`, project `MOTION.md`, change `design.md`, change
`motion.md`, and `tasks.md`, then uses the normal visual, UX, accessibility, motion, responsive,
engineering, manual QA, and headless-state gates.

## Component Library Output

DESIGN.md is not the component implementation. After synthesis:

1. map tokens into the repository's existing theme surface;
2. map component contracts into the existing framework and library;
3. generate Tailwind, CSS, React, Next.js, or another target-native implementation only when the
   active project uses it;
4. preserve states, accessibility, responsive behavior, and motion decisions;
5. verify the implementation against the synthesized product identity.

Do not install a framework or component library only because a source example used it.

## Completion

Report:

- problem and input modes;
- grill evidence path;
- scope score, budget, and whether Wayfinder was required;
- Wayfinder map URL when used;
- selected direction and project DESIGN.md path;
- project MOTION.md path, content hash, posture, and selected primitive ids;
- adopted and rejected source evidence;
- target framework/component implementation;
- QA evidence and remaining gaps.
