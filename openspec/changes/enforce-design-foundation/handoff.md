# Handoff

## Current State

- Change id: `enforce-design-foundation`
- Status: active
- Stage: verification

## Decision

Project `DESIGN.md` is mandatory before implementation. Missing files route to synthesis; invalid
files fail closed; valid files become the reusable product foundation.

## Next Action

Commit the locally verified implementation, run Code Intel against the committed tree, and complete
GitHub CI, review, merge, and release verification.
