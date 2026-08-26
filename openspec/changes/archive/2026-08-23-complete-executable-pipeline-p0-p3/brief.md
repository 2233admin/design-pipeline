# Brief

## Problem

The pipeline has strong written guidance but several claims are not machine-checkable, two legacy
state dialects coexist, Scene Runtime has no normative sidecar, and new adapters can outpace evidence.

## Outcome

Ship a resumable CLI and versioned contracts for P0 control-plane consistency, P1 evidence, P2
interoperability/evaluation, and P3 replaceable adapters/governance.

## Constraints

- Node built-ins only in the packaged core.
- No implicit downloads, publication, or ambient adapter resolution.
- Preserve v1 state and the existing PixiJS/Phaser/graphics overlay.
