# Proposal

## Why

Correctness verification reproduced interaction reports overwriting the measured page or workflow state through a filesystem alias, and default evidence output escaping the project through a directory junction. These writes can destroy input or advance a workflow using a hash of the replacement report.

## What Changes

- Extend the existing pre-capture output collision guard to the probe, resolved local page and existing workflow state.
- Apply the existing contained-path check to both default and explicit output directories and the final report file before browser capture.
- Reject unresolved filesystem links in that shared check, including a report link whose external target does not yet exist.
- Preserve existing public commands, result schemas, exit codes, gate bindings and normal contained output behavior.
- Add focused public CLI regressions and retain independent real-browser reproductions and verification limits.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: Interaction input preservation and the existing public CLI path-containment contract.

## Impact

Existing `skill/scripts/cli-core.cjs`, the existing page URL helper export in `interaction-capture-core.cjs`, shared `contract-utils.cjs` path containment, and `tests/workflow-next.test.cjs`. Reuse `contained`/`resolveInside`, filesystem identity checks and the already exported `workflow.STATE`. No dependency, new gate, receipt schema, target resolver, runner or machine configuration is added. Native check-report producer authenticity and actual modification-scope enforcement remain separately audited architecture limits.
