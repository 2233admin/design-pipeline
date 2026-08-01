## Context

See `proposal.md` for motivation. The current manifest distinguishes primary and reference targets but does not express which source is normative for implementation structure, which differences are permitted, or whether interaction evidence must come from a user-visible browser. Adaptive fidelity and aggregate interaction coverage can therefore hide the exact drift the user prohibited.

## Goals / Non-Goals

**Goals:**

- Add an evaluator-enforced authority contract without silently guessing authority from prose.
- Keep existing v1 manifests parseable while preventing them from newly reaching `complete` without the contract.
- Make interaction-environment provenance and invariant verification explicit in evidence.
- Preserve the existing blocked-versus-fidelity-limited distinction.

**Non-Goals:**

- Compare arbitrary source trees or generate project-specific AST rules inside the generic pipeline.
- Require an actual interactive browser for every clone; the contract selects that stricter environment when the user or design requires it.
- Infer user intent from target URL order after initialization.

## Decisions

### Add an optional manifest field that becomes mandatory at evaluation

`implementationAuthority` is accepted as an optional root property for backward parsing. New initializations emit a conservative contract whose normative target is the explicit authority URL or, when omitted, the lexicographically first normalized primary URL so idempotency does not depend on argument order. The evaluator blocks completion when the field is absent. This avoids rejecting stored manifests at read time while preventing stale manifests from being grandfathered into new completion claims.

Alternative: bump the entire manifest to v2 and reject v1. Rejected because it turns a behavioral hardening into an unnecessary format migration and prevents the evaluator from producing an actionable blocked result.

### Separate allowed differences from protected invariants

The contract records `authorityTargetId`, `designRecord`, `allowedDifferences`, `protectedInvariants`, and `requiredInteractionEnvironment`. Verification records the same authority target, verified invariants, observed differences, replay status/environment, and contained evidence paths. The evaluator checks set inclusion and target identity.

Alternative: reuse `referenceMappings`. Rejected because mappings describe contributions from reference targets to a destination region, while implementation authority governs the whole build and can be the primary target itself.

### Preserve blocked versus measured mismatch semantics

Missing contract/evidence, wrong authority identity, missing replay, wrong interaction environment, and absent evidence paths are blockers. Complete measurements showing an unapproved difference or failed protected invariant are fidelity mismatches. This retains the pipeline's existing meaning: unavailable evidence is not the same as measured failure.

## Risks / Trade-offs

- [Existing callers construct passing evidence without authority results] → Update initializer defaults, fixtures, public references, and regression tests together; older manifests receive an actionable blocked reason.
- [String labels can be vague] → Require non-empty unique values and exact set verification; project-specific structural checks remain Builder/Evidence adapter responsibilities.
- [A caller could label headless evidence as actual-browser] → Require provenance evidence paths and adapter probe capabilities; this change establishes the contract but does not add browser attestation hardware.

## Migration Plan

1. Emit `implementationAuthority` for new manifests.
2. Allow old manifests to parse, but block their evaluation with a migration-oriented reason.
3. Update documentation and examples with the required evidence result.
4. Preserve rollback by removing the optional field and evaluator inspection without changing stored target data.
