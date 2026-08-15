# QA: Decouple Component-First Gate

## Result

Pass. The component-first v1 facade, stage commands, schemas, pure-boundary rules, deterministic
serialization, isolated package installation, and the existing declared regression suite all pass.

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Foundations and source package | `node skill/scripts/designer-pipeline.cjs doctor --root . --json` | pass; package ready, no missing resources |
| Component-first focused tests | `node --test tests/component-first.test.cjs tests/component-first-gates.test.cjs tests/component-first-boundaries.test.cjs` | 19 passed, 0 failed |
| JSON Schema round trip | Python `jsonschema` validation of passing and invalid aggregate/stage fixtures | 4 fixtures valid |
| Change validation | `npx --no-install openspec validate <change-id> --strict` for Change A, B, and C | all 3 valid |
| Declared repository suite | test files from `scripts/test-manifest.json` passed to `node --test` | 496 passed, 0 failed |
| Hermetic package/install QA | `node scripts/qa.cjs` | exit 0; archive, isolated install, self-check, CLI smoke, and byte-identical repository status pass |
| Patch hygiene | `git diff --check` | pass |

The hermetic smoke explicitly exercised the installed component-first facade and a staged CLI
result. The facade is synchronous and frozen, the aggregate artifact is deterministic and
self-contained, and `high-fidelity check` is a compatibility alias for readiness rather than a
visual-acceptance claim.

## Compatibility Boundary

Repository branches, tags, remote refs, and history contain no earlier component-first core,
public function, CLI, artifact schema, or reason-code registry. Therefore an old-versus-new
differential run is impossible. This change establishes the first `component-first-gate.v1` golden
contract and proves that all unrelated declared tests remain green; it does not claim zero diff
against a nonexistent predecessor.

The repository also has no CICADA application or production regression target. State-machine and
migration coverage ran as part of the existing suite, while CICADA production verification is
recorded as not applicable rather than fabricated.

## Deferred Scope

Artifact v2 freshness/snapshot binding and visual acceptance remain in
`../design-component-first-artifact-v2/`. Design Skill manifest/effect enforcement remains in
`../add-design-skill-layer/`.
