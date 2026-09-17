# Stage 0 Binding Design

## Decision and scope
The approved implementation spec is the source of intent. The controller supplies and persists the original route query; toolchain callers carry its actual plan hash, id, path, and form. Maintainers implement and verify this contract before accepting the change.

## Binding flow
route(query) -> hash-bound job-plan(query, deliverableForm) -> toolchain request -> contained CLI plan read -> bindJobPlan -> capability resolution -> toolchain plan -> execution request with the same jobPlanSha256.

One deterministic classifier supplies product-launch-video, motion-graphics-video, scrollytelling-page, interactive-page, or ui-motion. Explicit scrollytelling and interactive-page signals take precedence over product terms; generic motion/video follows product-video terms; otherwise the form is ui-motion. The toolchain brief is classified independently. A request cannot change the persisted form, and a plan with an inconsistent query/form is invalid even if rehashed.

## Alternatives and consequences
| Option | Enforcement | Compatibility | Decision |
| --- | --- | --- | --- |
| Optional binding | Allows an unbound ready result | No migration | Rejected |
| CLI-only check | Direct resolver callers bypass it | Partial migration | Rejected |
| Shared binding validation | Direct and CLI callers fail closed | Requires real plans and fixture migration | Selected |

Hashing remains the existing canonical JSON/SHA-256 contract, not a signature. A caller that lies before Stage 0 can still misstate user intent; this change cannot recover a query never supplied by the trusted controller. It prevents drift relative to the persisted query/form, not arbitrary natural-language intent fraud.

## Affected assets and verification
- job-route-core and route/plan schemas: persist/classify form and validate hash; verify hash-tampering and query/form conflict regressions.
- toolchain-core and request/plan schemas: enforce complete binding; verify public resolve/probe failures and valid lineage.
- job/frontend registries: generic product-promotion routing; verify English/Chinese video and ordinary hover cases.
- maintained tests and public usage documentation: regenerate fixtures through route/buildJobPlan and retain execution lineage.

Rollback would revert this coordinated source/schema/documentation change and regenerate downstream artifacts. Do not restore an optional-binding shim. OpenAlice, runtime installations, render authorization, Component Conformance, and Visual Acceptance are non-goals.

## Acceptance gates
Run the focused tests declared in the implementation spec, strict OpenSpec validation, and node scripts/qa.cjs. Keep this change active; do not archive it or modify the excluded showcase.
