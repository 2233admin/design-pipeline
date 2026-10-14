## Why

Matt's v1.3 engineering skills changed domain-document conventions and parts of the engineering flow. This repository has recently installed a newer upstream revision, but its local naming, older skill forks and public introduction need a compatibility review. Usage recommendations need evidence from actual recent skill calls.

## What Changes

- Review v1.3.0, v1.3.1 and the installed upstream revision with fixed source identities; compare canonical, compatibility and renamed local skills without overwriting upstream files.
- Rename the existing `docs/glossary.md` to `docs/GLOSSARY.md` and update current consumer links. There is no project `CONTEXT.md` to rename.
- Document the existing setup choices and a small, composable Matt engineering flow alongside this repository's design harness.
- Correct the existing optional companion group to use official `tdd` and `code-review` install names, instead of requiring separately named local forks.
- Scan the latest 25 eligible local user sessions at a fixed cutoff; keep raw evidence local and publish only aggregate findings and limits.
- Rewrite the project introduction around concrete use, feedback and verification boundaries.

## Capabilities

### New Capabilities

- `matt-skills-guidance`: source-bound skill compatibility and workflow guidance for maintainers.

### Modified Capabilities

- `design-pipeline`: existing optional companion install-group compatibility.

## Impact

Maintainer documentation, agent consumer pointers and two skill names in the existing companion registry. Reuse `docs/agents/`, the existing glossary, OpenSpec decisions and installed skills. No release tag, version bump, tracker mutation or new dependency is implied by release preparation. Preserve other active work and historical change records. No new resolver, gate, receipt schema or invocation mechanism is added.
