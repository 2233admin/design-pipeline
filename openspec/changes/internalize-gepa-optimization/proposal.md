# Internalize independent GEPA optimization

## Why

Design Pipeline records feedback and supports artifact repair, but does not execute a search that turns repeated task failures into tested improvements to its guidance. The user approved an independently runnable offline optimizer and asked to internalize it into the packaged pipeline.

## What Changes

- Bundle the complete official `gepa-optimize-anything` skill from a deliberately reviewed GEPA revision, with original bytes, license and scoped Git provenance.
- Add a small independently callable Python tool using the native GEPA engine to optimize one guidance text against a caller-owned evaluator and frozen, disjoint training, validation and final-test cases. Require an explicit reflection callable/model, finite evaluation budget and fresh output directory.
- Preserve the seed and fixtures; write candidates, a reviewable diff, native search history and final-test results into local experiment output. Existing quality checks and actual rendered feedback remain the evaluator's authority.
- Route explicit optimization requests through the existing supporting-tool path and connect reusable findings to the feedback/OpenSpec maintainer loop. Packaged guidance changes remain reviewed OpenSpec changes; bounded project/user adaptation keeps its current contract.
- Verify source integrity, request rejection, a genuine credential-free native optimization and relocated package use. The synthetic check proves integration, not better design quality.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: packaged GEPA supporting-tool execution, source provenance, frozen experiment inputs and explicit adoption boundaries.

## Impact

New maintained files live in `skill/tools/gepa/`, the original source skill in `skill/vendor/gepa/`, and task guidance in `skill/references/gepa.md`. Reuse `scripts/git-tree-snapshot.cjs`, the supporting-tool entry, existing feedback, v1 gates/receipts, benchmark fairness, package resources and registered QA. Python and the exact reviewed GEPA runtime are optional task-local dependencies; root npm/runtime contracts remain compatible. No new public CLI command, gate, receipt schema, target resolver, policy digest, model default or installed-skill mutation is introduced.
