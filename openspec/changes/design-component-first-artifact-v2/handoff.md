# Handoff: Component-First Artifact V2

Change B is implemented and ready for the Design Skill layer.

- Core: `skill/scripts/component-first-v2-core.cjs`
- CLI: `component-first-v2 check|migrate|select|promote`
- Contracts: `component-first-artifact-v2.schema.json`, plus selection and promotion receipt shapes.
- Downstream rule: use the v2 selection/promotion receipts; do not duplicate target or policy gates
  in skill manifests.
- Production writes remain outside the Design Skill layer and require an explicit executor.
