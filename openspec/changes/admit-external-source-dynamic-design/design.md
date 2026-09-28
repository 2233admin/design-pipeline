# Governed external source and Dynamic Design contract

## Architecture alignment

This change SHALL NOT replace the architecture spine or add another runtime; it is a contract for AD-18 through AD-21. Existing AD-1 through AD-17 remain binding, especially:

- AD-2 keeps external sources `reference-only` until a separate governed admission decision.
- AD-5 keeps persisted source, artifact, and evidence paths contained.
- AD-8 and AD-15 keep blocked, review, invalid, and unverified states from becoming executable `ready`.
- AD-9 carries source/artifact identity, route, owner, and execution-input hashes across handoffs.
- AD-12 keeps envelopes and failure states deterministic and observable.
- AD-14 requires an explicit operational envelope.

The implementation SHALL reuse the existing execution-target, route, toolchain, and receipt authorities. Probe/Gate remains the existing readiness authority; this change SHALL NOT create a parallel gate.

## Capability-domain boundaries

The capability domains have one-way authority boundaries:

| Domain | Owns | SHALL NOT own |
| --- | --- | --- |
| Intake/Provenance | Source identity, revision/content identity, provenance, license/status, and admission decision | Executable materialization, runtime launch, composition, capture, or publication |
| Deploy/Runtime | Materialization of an approved source into an isolated snapshot and availability of a governed live endpoint or built static artifact | Admission policy, Dynamic Design composition, capture, gate decisions, or final publication |
| Dynamic Design | Structured motion/interaction composition and references to evidence | Cloning, building, starting, capturing, probing, packaging, or publishing |
| Capture | Rendered observation/capture | Source admission, runtime construction, gate decisions, or final publication |
| Probe/Gate | Verification evidence and readiness outcome | Source mutation, runtime construction, composition, or final-artifact assembly |
| Package/Publish | Final-artifact assembly and publication after the required gate outcome | Rewriting source identity, bypassing Probe/Gate, or changing upstream receipts |

Cross-domain handoffs remain bound by the existing route, execution-target, toolchain, and receipt contracts.

## Governed promotion and sandbox boundary

An external source starts as `reference-only`. Promotion SHALL be a distinct, explicit governed decision that binds the source's revision/content identity, provenance and license status, admission outcome, declared deploy profile, and sandbox allowlist. For a VCS-backed source, its VCS revision/commit SHALL be bound as part of the source identity; a non-VCS source SHALL use its applicable revision/content identity and SHALL NOT require Git. The contract SHALL NOT turn the presence of a repository into permission to execute it.

Only a promoted source SHALL be materialized as an isolated executable snapshot. Deploy/Runtime SHALL use the declared and allowlisted sandboxed deploy profile, and SHALL reject any command, lifecycle hook, package script, or other execution request that is not authorized by that profile. Untrusted repository instructions SHALL NOT expand the allowlist or change the sandbox boundary. Missing, stale, unverified, or mismatched promotion evidence SHALL remain blocked or review-only under AD-8 and AD-15.

## Companion workspace boundary

Deploy/Runtime SHALL own a disposable/companion workspace for each promoted external source. The workspace MUST be outside both the source tree and the target tree, bound to the execution-target and declared deploy profile, and isolated and contained. The workspace MUST NOT write back, push, or commit to the source location, and MUST NOT mutate the target tree. Any such writeback or target-tree mutation SHALL be rejected or remain blocked. Lifecycle, cleanup, retention, disposal, and recovery policy SHALL be explicit; concrete policy details remain deferred to bmad-spec. This boundary reuses the existing execution-target, route, toolchain, receipt, and Probe/Gate authorities and SHALL NOT add a parallel gate.

## Dynamic Design boundary

Dynamic Design SHALL consume one of two governed inputs: a live endpoint made available by Deploy/Runtime or a built static artifact. It SHALL emit a structured motion/interaction composition and references to the evidence supporting that composition. It SHALL NOT clone a source, build an artifact, start a runtime, capture the endpoint, run Probe/Gate, assemble a package, or publish a final artifact. Those actions SHALL stay with their owning domains.

## Lineage and final publish gate

Lineage SHALL remain resolvable across the complete path:

```text
source revision/content identity
  -> admitted source snapshot
  -> execution target and declared deploy profile
  -> governed live endpoint or built static artifact
  -> Dynamic Design composition
  -> Capture observation
  -> Probe/Gate evidence and readiness outcome
  -> Package/Publish final artifact
```

Each handoff SHALL reuse the existing identity, hash, route, execution-target, toolchain, and receipt authorities. Package/Publish SHALL publish only when the lineage is complete, identities and hashes agree, and the required existing gate outcome permits publication. It SHALL NOT repair a missing upstream identity by inventing a source commit or replacing a receipt.

## Motion-web parity fixture boundary

The reviewed motion-web revision SHALL be used only to compare general capability expectations and parity evidence. It SHALL NOT be a dependency, runtime, namespace, or source of copied code or assets. The CC BY-NC license SHALL remain a restriction on reuse, not an implementation permission; upstream code, assets, fonts, case names, prompts, CLI, tests, workflow, and recognizable one-for-one motifs SHALL remain excluded.
