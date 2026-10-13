# Design

## Context

See proposal.md for motivation. The project-root workflow is distinct from native implementation tasks and the governed control DAG. `recordGate` currently caches status/time; `gatePassed` compares file times. Shared REVIEW accepts any historical accept. `decide deliver` writes an arbitrary declaration. Native task artifacts and state/events already have stronger lineage and remain unchanged.

## Goals / Non-Goals

**Goals:** Close the observed workflow promotion gaps and provide practical verification instructions for an agent reading the package cold.

**Non-Goals:** Generalize the experiment executor, install pstack, add a second runner or receipt schema, or assert that hashing proves semantic correctness or that an agent's report proves a check ran. UI legacy delivery remains a declaration; native evidence is still the appropriate implementation-level mechanism.

## Decisions

1. Extend existing gate entries with `inputHashes`. Production CLI check handlers supply their actual contained primary files. `gatePassed` reads those files again and also requires every stage-declared input to be in the checked snapshot. Use the existing `sha256` and contained-path utilities, not timestamps. Bind active optional film inputs (composition, timeline, score grid) and edit analysis when they exist. Interaction uses the capture's actual file URL; other pages or remote checks do not prove the default local index. Reject interaction result/probe file identity before capture, including filesystem aliases. Compare input keys without case sensitivity only on Windows. This covers named inputs, not an inferred transitive graph of every project asset.
2. Export and reuse the existing film checker's `newestRender`. Workflow build/check and CLI gate recording refer to the same selected nonempty video. Custom edit checks bind their selected output and cannot prove the default workflow draft.
3. Shared REVIEW uses the latest decision and the gate's content snapshot. `decide` binds accepts and preserves rejects; a rejection clears dependent delivery and existing affected gates. Review decisions require the current review checkpoint, with a rejection also allowed for the still-current accepted draft at delivery/done.
4. Before writing delivery, ask the existing `nextAction` for unfinished prerequisites. Permit film/edit/web at deliver or completed quick workflows, and UI at work/done. Standard sub-workflow delivery stores the current input snapshot; film/edit also stores the contained file hash. Shared delivery completion compares those bindings. Do not reinterpret a UI declaration as native verification or visual acceptance.
5. Reuse `qa-checklist.md` for the agent verification recipe and link it from SKILL.md. Preserve its existing checklists and frontend work. Add its existing path to package required resources. Document the partial browser adapter and validator exit-code boundary instead of wrapping or silently upgrading it.

## File ownership

- Root agent: OpenSpec artifacts; workflow runtime and CLI handlers; film render helper export; workflow stage guidance; final verification.
- Test worker: only `tests/workflow-next.test.cjs`, preserving pre-existing edits and covering the new public behavior with real CLI reproduction where inexpensive.
- Guide worker: only `skill/SKILL.md`, `skill/references/qa-checklist.md`, `skill/references/package-resources.json`, preserving pre-existing edits.
- Review is read-only. No existing change, local installation, model configuration, experiment output or service is reset.

## Risks / Trade-offs

- Re-reading large videos costs I/O: the first slice uses the existing synchronous SHA-256 utility for correctness; add measured caching only if this cost becomes material.
- Timestamp-only old passes and unbound decisions stop advancing: rerun the same existing check and review the current draft. State remains readable; no migration or deletion is required.
- Primary input hashes do not prove external runtime dependency coverage: document and execute the actual applicable surface checks. The native check-report provenance gap is not silently declared solved.
- Local paths and custom output selection can differ: derive bindings from the actual public verifier call, not an assumed default artifact.

## Migration Plan

Keep workflow-state.v1 and all native schemas. On resume, legacy unbound cached evidence returns to its existing check/review/delivery action; new public checks populate the additive bindings. Preserve history. Rollback is a revert of this change's source edits, leaving the additive state fields readable as ordinary JSON.
