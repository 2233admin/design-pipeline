# Design: Frontend Stack And Tool Routing

## Data Boundary

`frontend-stack-registry.json` owns styling, UI-library, shadcn-preset, and external-tool metadata.
`mengto-skills-catalog.json` owns the complete pinned name/category index and reviewed routes. Both
are inert JSON.

## Decision Chain

1. `options` exposes the governed surface and counts.
2. `resolve-stack` normalizes aliases, preserves existing choices by default, validates framework
   and styling requirements, fills a complete named shadcn preset, and routes tools/skills.
3. `decompose` maps a product brief to canonical UI capabilities and catalog evidence.
4. `route` chooses project-owned, platform, package, or attributed-reference component sources.
5. `decide` refuses a governed design-system decision without the ready stack decision and
   capability inventory.

## Trust Boundary

No route installs a package, executes upstream skill text, authenticates a browser, reads ambient
credentials, or mutates GitHub. Requirements and fallbacks are data in the decision receipt.

## Spec Reconciliation

No implementation values diverged from this design at the first verified pass.
