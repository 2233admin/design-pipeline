# A structured critique, asked for and never automatic

## Why

Closes #157. The review rules W1 to W7 and the `UC-` checklist find problems, but the owner gets them
in no fixed shape and cannot see which matter most. The vendored design direction library (#172)
has a critique method: scored dimensions with written level criteria, the concept as the first and
heaviest dimension, and a fixed Keep, Fix, Quick Wins output.

## What Changes

- `web-direction.md` gains "Critique on request": six dimensions scored 0 to 10 (Concept, Direction
  fidelity, Hierarchy and pacing, Craft, Function, Originality), level criteria, a concept veto that
  caps the overall score at 6.0 when Concept is 5 or lower, and a fixed output of Scores, Keep, Fix
  (fatal, important, polish, each with a numeric fix) and Quick Wins.
- The dimensions are mapped to W1 to W7 (see design.md); the critique reads the rules as evidence and
  changes none of them.
- `qa-checklist.md`, `workflow-web.md` and `design-direction-library.md` point to it; the adoption
  note for #157 is updated.
- It runs only when the owner asks for a critique. Nothing schedules it.

## Capabilities

- `web-workflow`: ADDED the critique-on-request requirements.

## Boundaries

Guidance only. No existing receipt or check carries critique output (`qa.md` is free text that no
code reads), so no validation is added and no gate, receipt schema, finding code or CLI command is
introduced. A critique score is never Visual Acceptance and the owner's choice outranks it; gate
findings and `UC-` ids stay Component Conformance.
