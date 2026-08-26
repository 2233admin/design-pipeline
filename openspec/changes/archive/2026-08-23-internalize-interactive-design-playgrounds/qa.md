# QA

Verified on 2026-08-14.

## Contract And CLI

- `node skill/scripts/designer-pipeline.cjs playground check --root . --change-root openspec/changes/internalize-interactive-design-playgrounds --stage integration --json` -> `ready`, waiver `fixed-design-spec`.
- `node skill/scripts/designer-pipeline.cjs direction check --root . --change-root openspec/changes/internalize-interactive-design-playgrounds --stage selection --json` -> `ready`, waiver `non-visual`.
- `node --test tests/playground.test.cjs tests/designer-pipeline-cli.test.cjs` -> 28 passed, 0 failed.
- Syntax checks passed for `playground-core.cjs` and `cli-core.cjs`.
- `git diff --check` reported no whitespace errors.

## Release Verification

- `node scripts/qa.cjs` -> 468 tests passed across 59 files.
- Required-resource, JSON, and syntax checks passed.
- Tar and zip packages were byte-reproducible and contained the Playground checker, contract,
  schema, Blueprint registry, and all seven default generation blueprints.
- Isolated package installation passed.
- Installed-package `playground check` smoke passed.
- QA left repository status byte-identical.
- CSP, external-dependency, stale-evidence, canonical-state, and wrong-target regressions passed.

## Foundations And Scope

- Project `DESIGN.md` -> `ready`, SHA-256 `1126499915fb720ce0943afcba8b9327885c11a6ccc63160db96cd801a8cf88e`.
- Project `MOTION.md` -> `ready`, static posture, SHA-256 `5a23e0fcdb7d4ebddea2f8f446b91edbdaba3812baf44a7066034b5b2d8e7302`.
- Direction preview was waived as `non-visual`; Playground was waived as `fixed-design-spec` for
  this self-hosting CLI/contract change.
- No external dependency, runtime, upstream template, or upstream skill code was added.

## Self-Check And Feedback

The installed global skill copy predates current repository resources, so the initial dependency
self-check reported the installed copy as incomplete. Repository release QA and isolated package
installation are the authoritative checks for this change and both passed. The self-check updated
the existing local Anime.js capability-gap observation `dpf-976babc29a1a2fd0`; its Issue draft
remains local at `.design-pipeline/feedback/drafts/dpf-976babc29a1a2fd0-issue.md` and is unrelated
to the playground implementation.

No remote Issue or pull request was published.
