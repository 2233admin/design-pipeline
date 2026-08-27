# QA: Component-First Artifact V2

## Result

Implementation passes the focused and declared repository suites. The v2 layer consumes the frozen
v1 aggregate and does not alter the existing five v1 Gate modules.

| Check | Result |
| --- | --- |
| v2 focused tests | 4 passed |
| Design Skill layer focused tests | 5 passed |
| Focused B/C tests | 9 passed |
| Project test suite (`tests/*.test.cjs`) | 561 passed, 0 failed |
| Target/snapshot/policy binding | covered |
| Parent receipt stale invalidation | covered |
| Receipt expiration | covered |
| Selection/promotion and duplicate promotion | covered |
| Hash drift and path escape | covered |
| Visual acceptance separation | covered |
| Hermetic package/install QA | passed; see final handoff |

## Compatibility Boundary

`component-first-gate.v1` remains the input and compatibility contract. v2 adds strict snapshot and
receipt chaining; it does not reinterpret a v1 result as visual acceptance.

The bundled upstream security test passes when invoked from its own root:
`Push-Location skill/references/mengto-skills/upstream; node scripts/test-sync-neuform-security.mjs`.
Running bare `node --test` from the repository root is not the project test entry because Node also
auto-discovers that nested `test-*.mjs` file with the wrong working directory.
