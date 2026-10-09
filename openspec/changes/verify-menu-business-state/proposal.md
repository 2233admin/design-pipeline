# Proposal

## Why

Native browser completion currently measures geometry, transforms and opacity, but those observations cannot establish that a menu opens, updates the chosen value and closes. Its decomposition example also describes structural fidelity while binding only a motion check; a real menu task should expose this coverage gap and supply actionable repair evidence.

## What Changes

- Extend the existing interaction-probe.v1 and interaction-capture/result.v1 with a bounded ordered DOM-state journey, preserving legacy motion probes.
- Drive real selector clicks and keyboard input in one page instance and compare declared visible, text, attribute and focus states against captured values after each step.
- Validate native completion against the actual declared journey and retain all existing target, snapshot, scope, CAS and exact-version review requirements.
- Reuse native failure records and existing finding fields to return concrete repairs and identify repeated failures on the same measured input/output snapshot.
- Replace the misleading decomposition template with a supported behavior example and document a complete menu task.
- Execute that task with a real agent, retain independent browser proof of a broken selection and repair, and leave visual acceptance to the owner.
- Preserve the remote branch's tracked upstream layout source during publication with one exact Git-ignore exception; personal binary ignore rules must not make the existing repository audit fail.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: Ordered interaction-state verification, task-level coverage and actionable native recovery.

## Impact

Existing interaction evaluator/capture, native workflow/state validation, manifest-listed interaction/workflow/state tests and task/QA guides. The real trial reuses the existing installed agent execution and native CLI in owned ignored study storage; badge-specific component evaluation and film golden cases retain their existing scope.

No new gate, receipt schema, target resolver, policy digest, dependency or packaged agent runner. The trial is one menu component, not a complete autonomous development service or a claim of visual acceptance.
