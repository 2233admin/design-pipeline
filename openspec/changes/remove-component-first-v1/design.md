# Design

## File ownership

- `skill/scripts/component-first-core.cjs` owns the receipt chain: target, policy and snapshot
  digests, `createComponentFirstArtifact`, `checkComponentFirstGate`, `checkComponentFirstStage`,
  `verifyComponentFirstArtifact`, `selectionReceipt` and `promotionReceipt`.
- `skill/scripts/component-first/**` keeps adapters, pure gates, policy and the orchestrator. The
  `serializers/` directory is deleted; the orchestrator returns a `failure` for a request it cannot
  evaluate, which the core raises as a contract error.
- `cli-core.cjs` wires `component-first check|stack|components|playground|page|verify|select|promote`.
  `--write`, `--output`, `--approve`, `--approval`, `--selection` and `--promotion` were already
  registered.

## Compatibility and migration

None. Callers drop the request's `schema` field, add `target.snapshotDigest`, replace
`component-first-v2 check` with `component-first verify`, and regenerate stored v1 aggregates and v2
artifacts with `component-first check --write`. A request carrying a schema id and an artifact whose
schema is not `component-first-gate.v2` are rejected.

## Stage commands

A stage command evaluates only that stage and its dependencies and returns
`{ stage, status, reasonCodes, findings, receipt }`. Parent hashes of stages it did not evaluate are
`null`; only the receipts inside a `check` artifact form a complete chain.
