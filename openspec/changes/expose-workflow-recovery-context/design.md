# Design

## Context

See proposal.md. Current content hashes already enforce workflow freshness. Boolean gatePassed loses the reason for failure; recordGate omits actual findings. REVIEW.action returns placeholders even though current output keys exist in the checked snapshot. Native task feedback/lineage remain unchanged.

## Goals / Non-Goals

**Goals:** Make existing next sufficient to resume a check and open its actual draft, concentrating freshness knowledge in shared workflow logic.

**Non-Goals:** A second diagnostic runner, new receipt/gate schema, automatic test generation, copying/installing Matt skills, or proving creative quality with deterministic tests.

## Decisions

1. Add a diagnostic projection beside the existing content check. Keep gatePassed as a compatibility boolean over the same projection. Film/edit/web verification stages declare their existing gate name and required inputs; next computes that projection once, combines it with any additional stage prerequisites, and attaches it to the returned pending action. Avoid duplicated per-stage freshness implementations and repeated hashing within one check stage.
2. Extend existing gate entries with compact normalized findings/fixes and a textual next instruction from actual verifier results, including step error descriptions and blocked/stale capture causes. Do not persist captures, full reports, metrics or arbitrary unknown report fields. Failed and incomplete statuses retain actual diagnostics and remain blocked. Legacy records get an explicit rerun hint. When re-evaluating a bound pass, missing/changed/unbound files get named recovery findings; external/invalid paths fail closed using the existing resolver. Earlier missing-artifact stages keep their existing authoring action.
3. REVIEW.action derives primary page/video files from its checked input keys and resolves them with the existing contained-path helper. Optional known contact-sheet/interaction result files are shown only when present and contained. Presence is availability, not evidence freshness. Review acceptance bindings are unchanged.
4. Adapt engineering methods inside qa-checklist.md: public CLI seam, independent expected behavior, one red/green step, sharper runnable failure loop and shared-module fixes. Its SKILL entry link and packaging requirement already exist. Do not inherit upstream setup/confirmation loops when the user's authorization and established CLI seam already cover the task.

## Ownership

- Root: new OpenSpec change, workflow runtime/CLI/stage declarations, stages.md, final evidence.
- Test worker: tests/workflow-next.test.cjs only; one CLI regression cycle at a time, then broaden only for required branches.
- Guide worker: qa-checklist.md only, preserving all existing sections and changes.
- Review is read-only; unrelated working-tree edits and the earlier change stay intact.

## Risks / Trade-offs

- Declared primary files still omit transitive dependencies; diagnostics do not enlarge the earlier check's coverage.
- Last-check findings are historical observations and can describe the prior version; distinguish their recorded status from current stale-input findings.
- Optional evidence can be old; open the current primary output and retain the existing technical/visual distinction.
- Full repository QA uses the resolved host Node executable to avoid the previously observed transient NVM-alias spawn failure. This changes only the test shell PATH, never defaults or source configuration.

## Migration Plan

Keep workflow-state.v1 and existing commands/exit codes. New findings and next-action context are additive. Legacy records remain readable and rerun through existing checks. Revert this change's focused source edits to roll back; preserve diagnostic JSON and histories.
