# Frontend Stack And Tool Routing Requirements

## Requirement: mandatory stack decision

Every frontend change MUST resolve and persist a framework, styling choice, UI-library choice,
applicable complete shadcn preset, and tool routes before governed design-system selection.

### Scenario: omitted decision

Given a governed design-system request without a ready frontend-stack decision, `design-system
decide` returns `blocked` and selects no candidate.

## Requirement: capability-level search

The pipeline MUST decompose product briefs before treating a direct catalog miss as exhaustion.

### Scenario: direct miss with capability hits

When the direct product query finds zero entries but a decomposed capability finds entries, the
inventory records the miss as inconclusive and preserves the matched IDs.

## Requirement: governed external sources

The pipeline MUST discover the three pinned upstream sources and MUST NOT auto-install or execute
them.

### Scenario: cloning brief

A cloning brief routes the built-in cloning module, `deepclonewebsite` as a reviewed candidate, the
MengTo technique index, and the built-in feedback loop. Frog is surfaced when friction/GitHub sync
is requested, with its repository authority requirement intact.
