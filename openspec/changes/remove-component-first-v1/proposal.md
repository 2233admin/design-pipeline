# Remove the component-first v1 artifact and its migration path

## Why

Component-first conformance shipped two artifacts: the `component-first-gate.v1` aggregate and the
`component-first-gate.v2` receipt chain built from it by `component-first-v2 migrate`, plus a
`high-fidelity check` alias. The owner wants one artifact and no backward compatibility, so every
deprecated path is deleted rather than aliased or migrated. Relates to #151.

## What Changes

- `component-first check` evaluates the request with the existing gates and orchestrator and returns
  the receipt-chain artifact (`component-first-gate.v2`) plus aggregate `status`, `reasonCodes` and
  `findings`; `--write --output` stores the artifact. The request's `target.snapshotDigest`
  (`sha256:<hex>`) is required; a missing one is a contract error (exit 1).
- `component-first stack|components|playground|page` return that stage's receipt and findings.
- `component-first verify|select|promote` are the former `component-first-v2 check|select|promote`.
- **BREAKING** Deleted: `component-first-v2`, `component-first-v2 migrate`, `high-fidelity`,
  `migrateV1ToV2`, `createV2Artifact`, the v1 aggregate and stage serializers, the
  `component-first-gate.v1` and `component-first-stage-result.v1` ids and schemas. Requests no
  longer carry a schema id.
- `component-first-v2-core.cjs` is merged into `component-first-core.cjs`;
  `component-first-artifact-v2.schema.json` becomes `component-first-gate.schema.json`. `CF_V2_*`
  reason codes become `CF_*` and the `component-first-v2:` error prefix becomes `component-first:`.

## Capabilities

- `design-pipeline`: MODIFIED `Component-first conformance has layered deterministic boundaries` and
  `Website-cloning requests use a focused superset module`; RENAMED and MODIFIED the stage-command and
  v2-receipt requirements, which removes the migration and alias behaviour with them.

## Boundaries

Reuse the existing gates, orchestrator, policy digest, target resolver and receipt lineage. No new
gate, schema id, resolver or digest. Component Conformance stays separate from Visual Acceptance.
