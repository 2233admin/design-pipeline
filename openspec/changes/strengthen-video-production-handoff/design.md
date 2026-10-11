# Design

## Context

See proposal.md. Existing reference reports preserve decoded frame PTS, hashes and sampling windows; visual tasks already have an artifact.v1 invalidation chain. Reuse those mechanisms. Sampling windows are not shots, and file hashes cannot prove that an agent has understood pixels.

## Goals / Non-Goals

**Goals:** close the sampling, production-inventory and task-consumption gaps using current v1 carriers. Produce the user-authorized whole-film structural sample through the repaired entry points.

**Non-Goals:** automatic semantic segmentation, original character recovery, a new evaluation workbench, model comparisons, new rendering dependencies or automatic visual acceptance.

## Decisions

1. Use local prominence and per-window candidate selection instead of the global median times three/top-eight cutoff. Keep scene-cut hints, source PTS and bounded frame selection. Sample candidate neighborhoods at up to source/24fps cadence; never interpolate evidence. Lowering the global scene threshold alone produced excessive candidates and still missed the phone transition.
2. Add optional `shots` to the current video report: `{id,startSec,endSec,frameIds,targets:[{target,properties:["geometry.logo-outline"]}]}`. Validate distinct IDs, ordered contiguous coverage and local frame bounds. `checkVideoAnalysis(..., {requireProduction:true})` requires a nonempty inventory and matching observed evidence for each declared target/property. Historical inspection remains supported without shots. All three production checker callers opt in. Missing production observations return existing next actions with actual local PNG inputs.
3. Add optional `visual.sourceObservation:{report,shotId,observationIds}` to design-plan.v1. Video report references require this binding. Resolve it in the existing workflow input path, verify target/property and shot-local evidence, and return the resolved observation context to the dispatched task. Validate through the shared video checker; no new gate or receipt. Any per-invocation memoization is confined to one read and cannot conceal file changes across next/decide calls.
4. Hash `visual.guides`, the bound report, source media and bound frame files alongside current inputs/references/dependency outputs. Materials and rebuilt assets remain ordinary task inputs or preceding task outputs; no parallel asset registry. Method entry files use guides; adaptation and limits use goal.
5. Integration QA found the current Art Motion reference pinned import under `upstream/scripts/engine/lib/` while package requirements and method links still named `upstream/lib/`. Update those existing consumers and synchronize the retained MIT license copy byte for byte. Keep the current upstream tree and provenance manifest intact; do not restore the obsolete tree or relax the existing source-byte checks.

## Ownership

- Reference implementation: `reference-video-core.cjs`, its existing registered tests, production checker call sites in `reference-evidence-core.cjs` and `workflows/shared.cjs`, and targeted reference guidance.
- Task implementation: `plan-core.cjs`, `workflow-core.cjs`, existing plan/workflow tests. This owner consumes the shared `resolveVideoObservation(root,binding,{target,property})` helper, which returns confirmed shot, selected observed records, selected frames and report source after validation.
- Evaluation caller repair: `scripts/component-eval.cjs` and its existing tests copy frozen, real guide bytes into the task root before dispatch, rejecting conflicting existing inputs. The runner previously located a guide but did not deliver it to the model; existing attempt input hashes and read-only checks handle it after this repair.
- Root: this OpenSpec change, private sample assets/composition, real-source comparison and final QA. No worker resets, commits or overwrites unrelated edits.

## Risks / Trade-offs

- Pixel-change peaks include texture flicker → keep candidates explicitly uncertain and allow local resampling.
- Authored inventories can omit undeclared objects → structural readiness stays distinct from semantic and visual acceptance; actual pixel review is recorded separately.
- Old reports no longer unlock new video production → retain reading and original artifacts, request shot decomposition and refresh the adopted report hash.
- Rechecking source evidence costs I/O → only reuse a result within one workflow invocation, never between mutations or user decisions.

## Migration Plan

Preserve old reports and prepare a new sampling directory. Fill confirmed shots and atomic observations after viewing pixels; update the current reference carrier hash. Add source bindings to video visual tasks and rebuild stale receipts. Existing static-image and non-video plans retain their format. Rollback restores prior code while retaining private evidence; no user source is overwritten.
