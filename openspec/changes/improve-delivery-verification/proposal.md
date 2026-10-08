## Why

The integration retrospective found Windows-only regressions outside Ubuntu CI, late PR-base reconciliation, buffered full-test output, and stale verification commands in the PR template. Contributors need visible, platform-relevant evidence tied to the actual proposed tree.

## What Changes

- Extend the existing CI workflow with a focused Windows regression job that exercises physical path identity and storyboard routing; report unavailable filesystem capabilities explicitly.
- Stream the long repository-test subprocess through the existing QA runner while preserving hermetic execution, failure exit status, packaging checks and repository-status protection.
- Move target-branch reconciliation and scope review before the full-QA freeze in CONTRIBUTING, and align the PR template with the existing npm commands.
- Reproduce and repair the existing PR's six Ubuntu CI failures discovered after restoring CI visibility, preserving the real-browser assertions and dependency isolation.

## Capabilities

### Modified Capabilities

- `design-pipeline`: release QA and contribution standards.

## Impact

Only maintenance workflow, existing regression tests and contributor documentation change. No product CLI, dependency, receipt, gate, target resolver or packaged source changes. The separately installed host GitHub skill's missing helper is repaired outside this repository and is not added to the shipped design skill.
