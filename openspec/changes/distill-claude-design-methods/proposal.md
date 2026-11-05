## Why

Issue #254. The owner wants the design methods of two public collections learned, not their prompts
copied: `JimLiu/baoyu-design` (local builds of claude.ai's Design System, Slides, Dashboard and
Design artifact types, Claude Design's archived built-in skills, and its own MIT `motion-director`)
and `nexu-io/open-design` (Apache-2.0 skills and craft side files). Our counterparts already cover
much of it (`design-system-package.md` is modelled on the Design System artifact), but several
concrete mechanisms are missing: an inventory-first build, measured `on-` and focus colours, a cover
that stays still and fixed, deck rules beyond the PPTX constraints, dashboard composition, how
direction versions are put to the owner, and which film frames a self-review must look at.

## What Changes

- Record the gap analysis per source skill in `design.md`, with what lands, where, and what is left
  out and why.
- `design-system check` gains two measured rules in one separate function: `on-<fill>` and focus-ring
  colours (named `on-<fill>`, `focus-ring`, `focus-outline`) must be measured in `contrast` at 3:1
  or more (`on-token-unmeasured`, `on-token-floor`, `focus-ring-unmeasured`, `focus-ring-floor`), and the cover preview must have no picture, gradient, motion or responsive
  layout, including `bundle.css` rules that reach the cover (`cover-picture`, `cover-gradient`,
  `cover-motion`, `cover-responsive`). Each finding
  carries its fix.
- Advisory guidance lands in the existing guides: inventory first and accessibility-ask
  definitions (`design-system-package.md`), deck rules for PowerPoint decks (`editable-pptx-html.md`), dashboard and
  chart composition (`xy-charting.md`, routed from `graphics-runtime-routing.md` and `stages.md`),
  version presentation (`direction-preview.md`), film frame review (`workflow-film.md`).
- Provenance in `design.md` and `THIRD_PARTY_NOTICES.md`.

## Capabilities

- `design-pipeline`: ADDED `Design-system role colours are measured`, `The design-system cover is
  checked for its fixed form`, `Distilled design methods stay advisory and keep provenance`.

## Reuse

- `design-system check` and its findings shape `{file, code, severity, message, fix}` (as the brand
  findings already use); no new gate, command, flag or schema.
- Existing guides; no new reference file.

## Impact

- A package with an `on-…` or `focus…` colour token that `contrast` does not measure, or a cover
  with a picture, gradient, motion or responsive rule, now reports `invalid` until fixed.
- Everything else is guidance; taste stays with the owner and Visual Acceptance.
