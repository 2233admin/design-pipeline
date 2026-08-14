# Koboyo Icon Source Requirements

## Requirement: explicit low-frequency routing

The pipeline MUST route Koboyo only when a brief or capability explicitly requests Koboyo or a
hand-drawn icon style.

### Scenario: explicit request

Given a Koboyo hand-drawn icon brief, `resolve-stack` emits `koboyo/icons` as a reviewed route with
its license and access constraints intact.

### Scenario: ordinary request

Given an ordinary frontend brief without hand-drawn icon intent, `resolve-stack` does not emit
`koboyo/icons`.

## Requirement: preset separation

The pipeline MUST NOT treat Koboyo as a shadcn icon-library preset.

## Requirement: authority preservation

The route MUST distinguish public per-icon SVG access from credentialed read-only MCP discovery,
MUST warn against URL/log key persistence, and MUST require separate authority for canvas mutation.
