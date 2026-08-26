# Design: Framework-Agnostic Component Capabilities

## Foundation

This non-visual CLI change preserves the project [DESIGN.md](../../../DESIGN.md) and
[MOTION.md](../../../MOTION.md). It adds no rendered interface and has no non-trivial motion.

## Architecture

```text
brief or capability ids
  -> capability dependency closure
  -> read-only project/provider probe
  -> per-capability provider resolution
  -> required behavior checks
  -> hash-bound verification receipt
```

Capability records own keywords, dependencies, and verification checks. Provider records only map
those capabilities to frameworks, packages, and interfaces. Resolution prefers an explicit
provider, then an installed provider, then the project-owned fallback. It never treats a candidate
package as installed and never edits the target project.

## Compatibility

The new `component` command is additive. Existing `design-system decompose`, `design-system route`,
frontend-stack, toolchain, component-source, and component-state behavior remains unchanged.

## Playground applicability

Waived: this change adds machine-readable CLI contracts and no interactive exploration surface.

## Spec reconciliation

| Observation | Cause | Resolution |
| --- | --- | --- |
| Existing component routing starts from source catalogs | The earlier contract predates a stable behavior IR | Keep source routing and add the capability layer before it |
