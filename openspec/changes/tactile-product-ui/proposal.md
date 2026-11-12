# Proposal: tactile product UI, an opt-in design direction from tactile-design

## Why

The owner asked to take `kosta4a/tactile-design` (MIT, a design-engineering skill for product UI) in
and use it to improve this tool.

The upstream is a complete, internally consistent look: decision order, surfaces that take their
fill, edge and drop from the surface under them, a role-based token system with contrast gates,
control and motion defaults, and a never-ship list. It is also a generic UI rule pack distilled from
one dashboard, it overlaps the Emil and interface-feel layers already carried in `ui-craft-sources`,
and the owner holds generic UI rule layers until the ablation in #372 shows a gain. So it enters as
a **named, opt-in direction**, not as a default rule layer.

## What changes

- New guide `references/tactile-product-ui.md`, written for this project: where the direction sits
  (the project's `DESIGN.md` governs, the measured audit stays the gate), the decision order,
  parent-borrowed surfaces, token roles with contrast gates, controls, layout and states, the motion
  gate, phone, remap steps, the never-ship list, a checklist, and what was not adopted.
- `sources.lock.json` pins the upstream (`tactile-design`, kind `adapted-reference`) at
  `30495a2db7cb`; `THIRD_PARTY_NOTICES.md` names it; `tests/source-governance.test.cjs` pins the
  guide's evidence (revision, content hash, nine source files).
- `references/job-registry.json` gains the scored job `tactile-product-ui` (priority 50) with
  keywords that name the direction (`tactile-design`, `tactile ui`, `tactile, layered`, 触感界面,
  触感设计, 触感风); no dispatcher source changes.
- `SKILL.md` and `capability-routing.md` gain one routing row each; `package-resources.json`
  requires the guide.

## Reused, not added

- Routing: `route`, `job-registry.v1`, `job-route.v1`, `job-plan.v1`; the primary step is the
  kernel's `toolchain resolve`.
- Source governance: `adapted-reference` lock entries, `sourceMeta` frontmatter, the content hash
  scope `ordered UTF-8 sourceFiles with path-and-newline separators`.
- Existing gates: `verify interaction` and its `audit.*` rules judge the page; the guide's 36 / 44 px
  control heights and 16 px field text are the direction's values, not new gates.

## Boundaries

- Opt-in only: a plain product brief such as "design a settings page for the dashboard" keeps
  `product-design`; the bare word "tactile" does not select the job.
- No upstream skill file, reference text, CSS template or Tailwind mapping ships.
- No gate, receipt schema, finding code, CLI command or flag; no new check. The measurable parts
  (touch target, field size, hairline width) are not turned into rules before the ablation reports.
- Guidance and routing only: a routed job grants no visual or creative acceptance.
- The guide is a candidate variant for the ablation (#372), not evidence that it helps.

## Capabilities

- `design-pipeline`: ADDED two requirements (named tactile briefs route to the direction and nothing
  else does; the direction's source is locked, hashed and unbundled).
