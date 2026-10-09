# Fix Windows namespace artifacts

## Why

Windows extended namespace paths identify valid files within an authorized root, but the existing alias ancestor walk probes the namespace drive root with `lstatSync`, which throws `EISDIR`. Artifact creation also uses non-native realpath and fails for a namespace caller root. Both failures reproduce on the consolidation candidate and its original inputs.

## What Changes

- Repair terminal volume-root handling in the existing physical alias walk.
- Use native realpath consistently in the existing artifact physical containment checks.
- Extend the registered execution-target regression with namespace paths in both directions and artifact create/validate coverage.
- Preserve caller-root coordinates, inode/device identity, external junction rejection and relative escape rejection.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: existing physical containment and artifact v1 metadata support Windows namespace aliases.

## Impact

Only `contract-utils.cjs`, `artifact-core.cjs`, the existing `execution-target-routing.test.cjs` and this change. No new schema, resolver, dependency, command or source cache. Full repository QA remains the consolidation owner's final check.
