# Proposal: Enforce the project DESIGN.md foundation

## Why

The pipeline can synthesize a missing `DESIGN.md`, but generic and website-cloning entry paths do not
share one machine-enforced foundation gate. This leaves room for implementation to start without the
reusable project identity that the pipeline is supposed to establish.

## Change

- Make project `DESIGN.md` a required invariant before implementation.
- Add one reusable validator used by synthesis and by a standalone Stage 0 gate.
- Distinguish `synthesis-required`, invalid, and ready states.
- Make the design-pipeline repository comply with its own invariant.

## Non-goals

- Automatically write creative design content from deterministic code.
- Replace change-level lowercase `design.md`.
- Require a specific frontend framework, palette, or component library.
