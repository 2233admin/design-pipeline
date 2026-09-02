# S03: Publish and regression-test the component-fit contract

**Risk:** medium  
**Depends:** [S01, S02]  
**Status:** ready

## What to build

Make the component-fit workflow discoverable and package-complete, then prove the assembled CLI and Design Skill paths together without changing unrelated routes.

## Acceptance criteria

- [ ] README documents direction locking, matrix generation, binding validation, and the five decision actions.
- [ ] `skill/SKILL.md` and `skill/references/stages.md` state the component-fit ordering, six dimensions, foundation coherence rule, and reference-only boundary.
- [ ] `scripts/test-manifest.json` includes the component-fit regression suite.
- [ ] `docs/cli-and-reference-providers.md` and the relevant OpenSpec design record describe the contract consistently.
- [ ] A clean checkout can load every packaged component-fit resource listed by `skill/references/package-resources.json`.
- [ ] The focused component-fit and Design Skill suites pass.
- [ ] The complete repository test command passes with zero failures, skips, and todos.
- [ ] Existing guided multi-surface, direction-preview, component routing, and design-system behavior remains passing.

## Files

- `README.md`
- `skill/SKILL.md`
- `skill/references/stages.md`
- `skill/references/package-resources.json`
- `scripts/test-manifest.json`
- `docs/cli-and-reference-providers.md`
- `openspec/changes/add-design-skill-layer/design.md`
- `tests/component-fit-matrix.test.cjs`
- `tests/design-skill-layer.test.cjs`

## Blocked by

- Blocked by S01 for the CLI and matrix contract.
- Blocked by S02 for the prototype gate contract.
