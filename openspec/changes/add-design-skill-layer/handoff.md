# Handoff: Manifest-Driven Design Skill Layer

The initial Design Skill layer is complete.

- Core: `skill/scripts/design-skill-core.cjs`
- CLI: `design-skill route|manifest|run|select|promote`
- Routes: `design.prototype`, `design.review`, `design.audit`, `design.pick-library`
- Promotion: consumes Change B selection/conformance receipts and emits an explicit target-write
  handoff; it does not mutate a production target.
