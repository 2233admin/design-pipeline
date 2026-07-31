# Handoff

## Status

Implementation and verification are complete. The change remains in `verification` so it can be
reviewed and released together with the pending fixed-camera spatial-routing work.

## What changed

- `reference-evidence.json` v2 records primary target, constraint, or inspiration roles and
  requested/effective fidelity.
- Exact fidelity cannot be silently downgraded.
- `reconstruction.json` enforces rectification, canonical elevation, locked camera, distributed
  landmark overlay, independently recomputed error, and final EvidencePort comparison.
- `designer-pipeline reconstruction check --stage geometry|final` returns `0` ready, `2` blocked,
  or `3` fidelity-limited.
- Final comparison receipts are bound to the reference, implementation, and diff image hashes.

## Next action

Review this change with `harden-fixed-camera-spatial-routing`, then advance to release readiness and
archive through the public state CLI.
