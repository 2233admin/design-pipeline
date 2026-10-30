## Why

The ui and web deliverables build one page (`index.html`, or sections of it). A request like "the sign-up flow",
"onboarding" or "the settings area" is several screens joined by actions, and today the agent either crams them
into one page or builds loose files that nothing ties together: a button that should open the next screen goes
nowhere, the third screen drifts from the first one's tokens, and the owner reviews screens one at a time without
seeing the path between them. Google Stitch and Figma's first-draft flows generate linked screens under one style;
Relume starts from a sitemap. The common mechanism is a declared screen list with transitions that all screens
share one design system.

## What Changes

- A ui project at standard or full can declare `flow.json` (`design-pipeline.flow.v1`): screens (`id`, `file`,
  `purpose`, `viewports`) and transitions (`from`, `trigger` CSS selector, `to`, optional `when`).
- The intake playback for ui offers a flow when the request names more than one screen or a path; the owner confirms
  the screen list and transitions as part of the brief.
- All screens are built under the same `DESIGN.md` and `MOTION.md`. The pipeline generates `flow.html`: a map of the
  screens as live thumbnails with the transitions drawn, each thumbnail opening its screen.
- `verify flow --flow flow.json`: every screen file exists; every trigger selector resolves on its `from` screen and,
  clicked in the browser, reaches the `to` screen; every screen passes the composition gate at its viewports;
  screens that no transition reaches are reported as orphans.
- Delivery names every screen file (with `ui-review-binds-delivered-files`), so changing any screen asks the owner
  again. The owner reviews `flow.html`.

## Capabilities

- `design-pipeline`: ADDED `Multi-screen ui flows are declared, linked and verified`.

## Reuse

- `capture-interaction.cjs` for clicking triggers, `verify composition` per screen, the ui intake playback and the
  delivery binding. No new deliverable type; quick tier is unchanged (one screen).

## Dependencies

- `ui-review-binds-delivered-files` (delivery binds files).
