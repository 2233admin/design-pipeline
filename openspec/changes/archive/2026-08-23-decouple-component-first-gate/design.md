# Design: Decouple Component-First Gate

## Foundation

This change inherits project [DESIGN.md](../../../DESIGN.md) and its non-visual CLI posture. It does
not create a new visual language.

## Boundary

The public facade preserves one synchronous function and delegates all work:

```text
CLI -> component-first-core facade -> orchestrator -> adapters + pure gates -> existing cores
                                      -> aggregate/stage serializers
```

Adapters own filesystem/path/hash/PNG work and are the only component-first modules allowed to call
`frontend-stack-core`, `component-capability-core`, or `playground-core`. Gates receive normalized
`EvaluationContext` data and never import filesystem, process, browser, another gate, or an existing
core. Serializers contain mapping only.

## V1 Input and Output

Because the repository has no prior aggregate, the v1 public function accepts an aggregate object
or a contained JSON artifact through facade options. The aggregate carries target, policy override,
stack/core artifacts, normalized component declarations, Playground location, page usage, and
evidence declarations. The serializer emits `component-first-gate.v1`; stage serializers emit
`component-first-stage-result.v1`. Input status fields are never trusted.

The five baseline roles are semantic and provider-neutral: `action`, `form-control`, `selection`,
`overlay`, and `feedback`. They are fixed in `component-first-default@1`; callers may add roles but
cannot remove the baseline. `pageRequirements` is separate, so no route is implicitly required to
render all five roles.

`project-owned` is a component origin, never a runtime stack. A project-owned declaration owes a
contained source, implementation symbol, component contract, token evidence, keyboard/focus
evidence, state evidence, component Playground evidence, and page-use evidence. Package and
workspace origins retain the evidence required by the v1 policy.

## Gate Semantics

Every gate returns the same internal `GateResult` with `passed`, `blocked`, `invalid`,
`not_evaluated`, or `not_applicable`. Aggregation is deterministic: invalid wins, then blocked,
then all required gates passed. Independent gates continue after blocked results; invalid upstream
data produces `not_evaluated` only where a declared dependency makes evaluation unreliable.

Readiness is `{ level, scope }`. `page-ready/prototype` is valid for a sandbox target but can never
satisfy `page-ready/production`. Automatic promotion is deferred.

## Evidence

The evidence adapter resolves contained paths once, hashes actual bytes, parses all PNG chunks,
validates chunk CRCs, inflates IDAT data, validates scanline/filter structure, and records decoded
dimensions/transparency. Gates only evaluate that normalized result. Ordinary hash binding detects
mismatch, staleness, or accidental evidence reuse; it does not prove that a receipt was not
fabricated. Trusted producers, signatures, and CI attestation are Change B concerns.

## CLI

`component-first check` returns the aggregate. `stack`, `components`, `playground`, and `page`
return only the requested stage plus required context resolution. All stage commands are read-only:
they do not write state, create browser receipts, install dependencies, or execute a target.
`high-fidelity check` delegates to the same v1 aggregate for compatibility but does not redefine
component conformance as visual acceptance.

## Spec Reconciliation

No visual reference applies to this change; there is no graybox-derived value to reconcile.
