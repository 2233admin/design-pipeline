# S01: Land direction-lock and component-fit matrix

**Risk:** high  
**Depends:** none  
**Status:** ready

## What to build

Finish the component-fit vertical path from an approved direction to a per-capability decision. Use the existing `component-fit-core.cjs` kernel and expose it through the public CLI without duplicating catalog or provider logic.

## Acceptance criteria

- [ ] `createDirectionLock` emits deterministic `design-pipeline.direction-lock.v1` output with a valid `directionLockHash`.
- [ ] `buildComponentFitMatrix` evaluates each requested capability against project, provider, and catalog candidates.
- [ ] Every candidate records `behavior`, `accessibility`, `framework`, `license`, `visualFit`, and `provenance` statuses.
- [ ] Decisions are restricted to `reuse`, `adopt`, `substitute`, `custom`, and `blocked`, with valid candidate references.
- [ ] Reference-only, unverified, incompatible, or visually unapproved candidates cannot become direct adoption decisions.
- [ ] Split ready foundation candidates block until one foundation is explicitly locked.
- [ ] `component lock`, `component fit`, and `component validate-fit` use the existing JSON CLI envelope and fail closed on stale hashes or bindings.
- [ ] `tests/component-fit-matrix.test.cjs` covers unit and CLI behavior with zero failures, skips, or todos.

## Files

- `skill/scripts/component-fit-core.cjs`
- `skill/scripts/cli-core.cjs`
- `skill/references/package-resources.json`
- `tests/component-fit-matrix.test.cjs`

## Blocked by

None. Existing catalog and provider registries are inputs, not new dependencies.
