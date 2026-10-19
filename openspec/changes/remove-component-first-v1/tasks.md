# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Relates to #151.
- [x] 1.2 `npm exec -- openspec validate remove-component-first-v1 --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 Merge `component-first-v2-core.cjs` into `component-first-core.cjs`; build the artifact from gate results; delete the v1 serializers, `migrateV1ToV2` and `createV2Artifact`.
- [x] 2.2 CLI: `component-first check|stack|components|playground|page|verify|select|promote`; delete `component-first-v2` and `high-fidelity`.
- [x] 2.3 Rename `CF_V2_*` to `CF_*`; replace the schema files with `component-first-gate.schema.json`.

## 3. Consumers and docs

- [x] 3.1 Update runtime review, design-skill promotion, package resources, QA smoke, references, docs and README.
- [x] 3.2 CHANGELOG entry.

## 4. Verification

- [x] 4.1 Run `node --test` on `tests/component-first*.test.cjs`, `design-skill-layer` and `runtime-review`.
- [x] 4.2 Run `npm run specs:check` and `node scripts/qa.cjs`.
