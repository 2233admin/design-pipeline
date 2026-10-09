# Design

## Existing contracts

Reuse `windowsRootAlias`, `resolveInside`, and artifact v1 creation/validation. Accepted physical aliases still return caller-root coordinates. Directory identity remains a nonzero inode and matching device; outside junctions, linked ancestors, unresolved links, distinct case-sensitive roots and relative traversal remain rejected.

Terminal namespace drive roots need their ordinary drive spelling before filesystem probes because Windows rejects `lstatSync` of that namespace root. This substitution applies only to the exact terminal drive-root spelling; every lower ancestor still receives its link check. Artifact physical checks use the same native realpath already used by the shared resolver; stored metadata remains a relative path with unchanged hashes and dependencies.

Direct namespace `--root` CLI input, raw namespace volume-root inputs and namespace UNC paths remain outside this bounded fix. CLI entry points still use their existing default realpath behavior. Both namespace failures reproduce in original PR #85, so retaining that CLI boundary is not a new caller regression.

## Ownership and compatibility

This change owns `skill/scripts/contract-utils.cjs`, `skill/scripts/artifact-core.cjs`, `tests/execution-target-routing.test.cjs` and this directory in the consolidation worktree. Other agents own workflow/component fixes. No migration or artifact shape change is needed. Original dirty workspace edits stay untouched.

## Verification

Reproduce with focused subtests before runtime edits. Run the single explicit registered test file and strict validation of this change after the repair. The consolidation owner runs canonical full repository/browser QA afterward. These technical checks do not grant Component Conformance or Visual Acceptance to product output.
