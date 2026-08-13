# Built-in Interface Discipline

`design-pipeline` ships a complete, inert snapshot of the interface-quality suite from
[`jakubkrehel/skills`](https://github.com/jakubkrehel/skills). It is a core reference, not an
optional companion: a clean `design-pipeline` install contains every skill and supporting
reference listed below. Do not depend on an ambient global skill installation or network access.

The pinned source, license, file count, and canonical tree hash live in
`references/interface-discipline/manifest.json`. The byte-preserved source is under
`references/interface-discipline/upstream/`; update it atomically with its manifest, third-party
notice, and integrity test.

## Coverage And Ownership

| Concern | Bundled source | Pipeline responsibility |
| --- | --- | --- |
| Review orchestration | `upstream/skills/better-interface/SKILL.md` | Select `full` or `quick` review scope, then keep the final scope and result in `qa.md`. |
| Accessibility | `upstream/skills/better-accessibility/` | Semantic structure, keyboard/focus behavior, forms, hit areas, zoom, screen-reader behavior, and reduced motion. |
| Layout | `upstream/skills/better-layout/` | Grouping, alignment, spacing, responsive composition, and density. |
| Typography | `upstream/skills/better-typography/` | Font choice, scale, spacing, wrapping, punctuation, OpenType, and accessible reading. |
| Color | `upstream/skills/better-colors/` | Palette roles, contrast, conversion, gamut, and color-token usage. |
| UI polish | `upstream/skills/better-ui/` | Surfaces, iconography, animation, and UI-performance constraints. |
| Product writing | `upstream/skills/better-writing/SKILL.md` | Actionable, concise, consistent UI copy. |
| Change-scoped review | `upstream/skills/interface-review/` | Diff scope, consumer expansion, removed-signal inspection, and `Introduced` / `Regression` / `Pre-existing` finding status. |

The bundled source is authoritative for the detailed rules. This document wires it into the
pipeline; it does not paraphrase or weaken individual checks.

## Operating Protocol

1. For product UI, flows, design-system work, reviews, or user-visible UI changes, start with
   `upstream/skills/better-interface/SKILL.md`.
2. Use its `full` mode by default: assess all six quality domains. Use `quick` only for a
   genuinely narrow repair, inspect the dominant issue deeply, and fast-scan the other domains.
   Widen back to `full` when the change affects a flow, shared component, token, layout pattern,
   interaction model, or multiple domains.
3. Read the selected domain `SKILL.md` and only the referenced detail files relevant to the
   change. Keep existing project design-system and framework conventions unless the design change
   explicitly replaces them.
4. For a diff, review `upstream/skills/interface-review/SKILL.md` before judging results. Resolve
   the affected UI and its consumers, inspect removed lines where applicable, and classify every
   finding as `Introduced`, `Regression`, or `Pre-existing`. Do not make a pre-existing problem
   look caused by the current change.
5. Record in the change `qa.md`: mode, inspected domains, affected flows/components, evidence,
   findings with status and severity, repairs, remaining pre-existing items, and final verdict.

## Pipeline Stage Integration

- **Stage 0 — Repo Read:** discover shared components, token owners, routes, affected flows, and
  test/browser surfaces. Select review mode and domain scope before changing code.
- **Stage 3 — Design Spec:** make consequential layout, type, color, content, motion, focus,
  semantics, and responsive decisions explicit in `design.md`. A new token or shared component
  needs its downstream consumers considered here.
- **Stage 4/5 — Tasks and implementation:** add independently verifiable interface-discipline
  tasks; preserve semantic HTML, keyboard behavior, motion preferences, and established tokens.
- **Stage 6 — Gate Review:** run the selected domain checks against the actual UI. For changed UI,
  include `interface-review` scope and status classification in the final QA evidence.

## Maintaining The Snapshot

When updating this source, pin one upstream revision, mirror `LICENSE`, `README.md`, and every
file under `skills/`, then update the manifest's tree hash and date. Run
`tests/interface-discipline.test.cjs` and package verification. Never execute vendored skill code,
silently replace the source with a partial summary, or make its availability depend on global
agent directories.
