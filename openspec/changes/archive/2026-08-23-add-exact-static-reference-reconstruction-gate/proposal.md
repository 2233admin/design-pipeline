# Proposal: Add exact static-reference reconstruction gate

## Problem

The pipeline correctly classifies 2D, 2.5D, 3D, and hybrid references, but a supplied still image
can still be treated as directional inspiration when the user requested an identical result.
Graybox validation proves spatial depth, not projection fidelity. Final visual review can therefore
degrade into subjective “similar enough” approval.

## Change

- Add explicit reference roles and requested/effective fidelity.
- Make exact fidelity non-downgradable without explicit user approval.
- Add a canonical rectification, front-elevation, camera-calibration, and landmark-overlay contract.
- Add public geometry and final reconstruction gates.
- Bind independent pixel/SSIM evidence to source, implementation, and diff image hashes.

## Outcome

The pipeline fails closed when exact reconstruction evidence is absent and distinguishes unavailable
evidence from measured fidelity mismatch.
