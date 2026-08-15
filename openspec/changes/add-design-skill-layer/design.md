# Design: Manifest-Driven Design Skill Layer

`SKILL.md` owns decision order and expert practice. A manifest owns invocation, input schema, target
scope, effects, capability requirements, policy references, outputs, human gates, handoffs, and
verification profile. A runner mechanically enforces `reference-only`, `repository-read`,
`artifact-write`, `plan-write`, `sandbox-write`, `target-write`, `browser-execute`,
`dependency-install`, and `external-execute`.

Skill completion and gate outcome are independent. Skills produce typed artifacts such as
`implementation-plan.v1`, `review-report.v1`, `prototype-set.v1`, and
`prototype-selection.v1`; deterministic gates evaluate evidence refs. `design.prototype` writes
only an isolated sandbox, explores three genuinely distinct directions by default, and waits for a
human selection. `design.promote` is a later target-write operation requiring a selection receipt.

Global accessibility/component/evidence baselines remain separate from project-selected taste
profiles. Library-specific skills declare package semver and source digest, returning
`stale_or_inapplicable` outside that range.

No skill runner or manifest schema is implemented by this planning change.
