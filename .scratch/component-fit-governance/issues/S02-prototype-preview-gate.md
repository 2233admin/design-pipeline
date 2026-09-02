# S02: Bind Design Skill prototypes to verified previews

**Risk:** medium  
**Depends:** none  
**Status:** ready

## What to build

Make `design.prototype` consume a project-contained direction-preview artifact before creating isolated prototype directions. Preserve the existing target-write prohibition and use the shared direction-preview checker.

## Acceptance criteria

- [ ] `design.prototype` resolves `changeRoot` inside the supplied project root.
- [ ] Missing, malformed, escaped, waived, or inapplicable previews return `blocked` rather than an empty selectable set.
- [ ] Successful prototype output contains the preview artifact path, SHA-256, viewport, content fixture hash, and state coverage.
- [ ] Prototype selection rejects stale or missing prototype and preview hashes.
- [ ] Prototype effects cannot request `target-write`.
- [ ] `tests/design-skill-layer.test.cjs` covers success and all blocked preview paths with zero failures, skips, or todos.

## Files

- `skill/scripts/design-skill-core.cjs`
- `skill/scripts/cli-core.cjs`
- `tests/design-skill-layer.test.cjs`

## Blocked by

None. This slice consumes the existing direction-preview contract.
