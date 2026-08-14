# Initiative: Framework-Agnostic Component Engine

Status: in-progress
Owner: design-pipeline
Started: 2026-08-14

## Product outcome

Turn component requirements into stable behavior capabilities, select compatible project/provider
implementations only after the capabilities are known, and verify the rendered behavior independently
of framework APIs. Frameworks and component libraries are replaceable adapters; capability IDs and
evidence remain durable.

## Non-negotiable boundaries

- Preserve the target repository's framework, installed packages, components, and design system.
- Never install a provider or rewrite project configuration during discovery or resolution.
- Keep accessibility, keyboard, focus, states, and recovery behavior in the capability contract.
- Report partial coverage and missing evidence explicitly.
- Require admission review before a community provider can become an automatic runtime route.

## Roadmap

### Phase 1 — Capability IR and provider resolution

Change: `openspec/changes/add-framework-agnostic-component-capabilities/`

- Governed capability vocabulary and dependency closure.
- Provider registry for project DOM, Vuetify0, React Aria, and Ark UI.
- Read-only project package probing.
- Public `component decompose|providers|resolve|verify` CLI.
- Hash-bound behavior verification receipts.

### Phase 2 — Framework bindings

Status: core seams implemented

- Versioned Vue, React, Svelte, Solid, Nuxt, and project-DOM binding plans.
- Read-only project component inventory with explicit capability declarations.
- Explicit `reuse`, `adopt`, `substitute`, and `custom` decisions.
- Empty-source implementation plans without automatic dependency mutation.

### Phase 3 — Live documentation and evidence

- Provider documentation, SKILL.md, API, and optional MCP discovery.
- Browser-generated keyboard, focus, ARIA, state, and responsive receipts.
- Vite DevTools, Playwright, and accessibility evidence correlation.

### Phase 4 — Provider SDK and governance

- External provider manifest and conformance suite.
- Version, provenance, license, maintenance, security, and permission admission.
- Compatibility fixtures and degradation policy.

## Resume rule

Completing one phase does not complete this initiative. Every phase must update the next-phase file
in its change folder. When work resumes, read this initiative, the latest `next-phase.md`, the
component capability reference, and the open tasks before selecting new implementation work.

## Completion definition

The initiative is complete only when all four phases are implemented, packaged, documented, and
verified against at least one Vue, React, Svelte, Solid, and project-owned DOM fixture.
