## Why

Component discovery mixes source identities with components and methods, omits packaged sources, and retains a stale MengTo projection. Web build instructions do not ask which component sources the owner wants or require an auditable component manifest.

## What Changes

- Extend the existing component-source catalog and v1 normalization/routing contracts into the single discovery index, preserving IDs and namespace.
- Connect external registry entries with canonical sourceId references; preserve their execution contracts and upstream vendor bytes.
- Record explicit availability, provenance, local package pointers and license evidence; keep uncertain/commercial sources reference-only and film/GEPA outside web ranking.
- Make the MengTo projection equivalent to the pinned vendor manifest rather than a hard-coded count.
- Ask for component sources immediately before web build, and for equivalent UI code builds. Require recorded decisions, index-guided instructions and a valid component-manifest.json alongside index.html as existing stage completion conditions.
- Add independent completeness and behavior regressions and update maintained workflow documentation.

## Capabilities

### Modified Capabilities

- `design-pipeline`: component source discovery, catalog provenance and web/UI workflow completion.

## Impact

Existing catalog/schema/core, frontend/provider/companion registries, MengTo projection, web/UI workflows, maintained skill guides, tests and package resources. No additional gate, resolver, receipt schema or policy digest. No vendor source changes, dependency installation policy changes or visual acceptance claims.
