# Design: requirements to implementation-ready DESIGN.md

## Boundary

The bundled scripts own deterministic initialization, transition validation, artifact checks, and
headless state. The host design agent owns questioning, research, direction synthesis, and prose.

This separation avoids pretending a Node template renderer is a designer.

## Artifact distinction

- `openspec/changes/<change-id>/design.md` records the decisions for one change.
- `<project>/DESIGN.md` records reusable product identity for future coding agents.

The synthesis manifest links the two without treating them as interchangeable.

## State machine

```text
awaiting-grill
  -> scope-assessment
    -> ready-for-synthesis
      -> design-validation
        -> ready-to-implement
    -> awaiting-wayfinder
      -> ready-for-synthesis
```

The initializer prints `/grill-with-docs <problem>`. After grill evidence exists, the transition
command calculates a scope score from declared surfaces, workflows, integrations, unknowns, and
decision points.

If the score exceeds the selected budget, the run records a scope-surprise event, prints
“哦，天哪，这比我预期的要大得多。” and requests `/wayfinder 为此制作一张地图`. It does not invent a
local map. A configured host records the real map URL before synthesis continues.

## Evidence roles

- `requirement`: user or repository product constraints; authoritative for product intent.
- `reference-site`: observed visual or interaction evidence; adopt selectively.
- `template`: analyzed example or library entry; inspiration only.
- `existing-system`: current tokens, components, and framework; authoritative unless explicitly
  changed.
- `official-spec`: format and validation requirements.

Every adopted template or reference property needs a project-specific reason. Rejected properties
are recorded so a future agent does not drift back toward the source brand.

## DESIGN.md gate

The transition command verifies that the chosen file:

- stays inside the target project and is not a symlink escape;
- contains YAML frontmatter with a non-empty `name`;
- contains Overview, Colors, Typography, Layout, Components, and Do's and Don'ts sections;
- names the target audience and product context;
- links the active change artifact as provenance;
- contains explicit adopted and rejected source decisions.

These are structural and provenance checks. Visual quality remains subject to the normal pipeline
gate review.

