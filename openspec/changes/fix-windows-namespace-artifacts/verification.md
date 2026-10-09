# Verification

## Red and green evidence

Host: Windows, Node.js v26.3.1. The existing registered execution-target-routing file gained two independent subtests under `contained paths keep lexical coordinates for Windows namespace artifacts`; that prefix also matches the existing Windows CI filter.

Before runtime changes, the focused regression failed both subtests with `EISDIR: illegal operation on a directory, lstat 'C:'`: reverse namespace containment failed in `windowsRootAlias`, and artifact creation failed at the default `realpathSync` in `artifactPath`. The initial red command used the test's provisional name `Windows namespace aliases`.

After the minimal repair, the final focused command passed 3/3 tests, with no skips:

```text
node --test --test-name-pattern "contained paths keep lexical coordinates for Windows namespace artifacts" tests/execution-target-routing.test.cjs
```

The single complete explicit file passed 34/34 tests, with no skips, in 61.43 seconds:

```text
node --test tests/execution-target-routing.test.cjs
```

That run executed the existing zero-inode, device-mismatch, external junction, linked ancestor, unresolved link, relative traversal, caller-root artifact and Git/snapshot lineage checks. Its NTFS case-sensitive distinct-root subtest ran and passed. New assertions cover both namespace directions for existing and future descendants, terminal drive-root observation, unrelated namespace target rejection, and relative artifact creation/validation with namespace caller coordinates.

Strict validation passed:

```text
npm exec -- openspec validate fix-windows-namespace-artifacts --strict
```

The scoped diff check passed without whitespace errors. An independent read-only review confirmed that terminal-only drive-root spelling substitution retains nonzero inode/device equality and every lower ancestor's link check; it does not widen containment.

## Limits and remaining owner check

Original PR #85 reproduces the same namespace failures, so this repairs inherited defects rather than a merge-only regression. Direct namespace `--root` CLI input, raw namespace volume-root inputs and UNC namespace behavior remain outside this bounded change. The CLI was not changed.

The consolidation owner still runs canonical full repository/browser QA before publication. No full QA, commit, push, external comment or source cache was produced by this change. Technical checks do not grant product Component Conformance or Visual Acceptance.
