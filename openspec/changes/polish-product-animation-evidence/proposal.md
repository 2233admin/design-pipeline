# Polish product-animation evidence

Trace: CERE-482 Tasks 1–3 from `_bmad-output/implementation-artifacts/spec-cere-482-animation-polish.md`.

## Why

The product-animation target needs a final evidence-focused polish without widening its public runtime surface or confusing historical artifacts with current proof. It needs a controls-safe review receipt for four user-facing surfaces, a non-public way for its verifier to inspect the authored motion graph after removal of `window.__motionGraph`, and a reproducible 7.5-second sample with accurate sequential frame evidence for all six narrative beats.

## Change

- Define the target-local controls-safe evidence contract for desktop, mobile, reduced-motion, and native-controls surfaces, including a bottom 210 authored-pixel region reserved for native media controls and two terminal review strings above that region.
- Define the private graph-verification seam: `window.__motionGraph` is not a public mount; the verifier reaches the lexical graph only through a target-local, test-only hook and retains graph, beat-boundary, and spring-settle assertions.
- Define a deterministic target-local 7.5-second derivative of the canonical composition and its sequential, accurate six-beat frame evidence, playback proof, and receipt fields.

## Boundaries

- This change governs only CERE-482 Tasks 1–3 in `experiments/openalice-product-animation/` and its target-local documentation/evidence contracts.
- `openspec/changes/integrate-product-animation/` is historical/done and MUST NOT be reopened.
- Task 4 is exclusively governed by `openspec/changes/fix-motion-web-provenance/`; this change does not alter provenance, registry, source-governance, or shared-pipeline contracts.
- `output/sample-approved/` is an archive boundary: it is neither an input nor a replacement receipt for this polish. Existing archived artifacts and `baseline/optimization-before-final/` remain preserved/frozen and MUST NOT be overwritten, deleted, or represented as current evidence.
- Component Conformance remains distinct from Visual Acceptance. Passing this technical contract is not user visual acceptance; that decision remains pending.

## Success evidence

The implementing owner can run the target verifier and produce a target-local receipt that records the four-surface review, private graph/public-surface checks, normal-speed ended playback, sequential six-beat frame proof, sample SHA256, and wall-clock sampling. The resulting evidence has clear lineage without modifying archived output or frozen baseline material.
