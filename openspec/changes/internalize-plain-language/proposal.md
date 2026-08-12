# Proposal: Internalize Direct Plain Language

## Problem

User-facing copy often explains internal causes before the consequence or next action. A rewrite
can become easier to scan while silently widening a partial failure into a total failure.

## Decision

Add a small, portable plain-language contract that puts the first useful fact first and performs a
second fidelity pass over scope, limits, exclusions, uncertainty, unchanged state, and available
actions. Adapt only the conversational rewrite and completeness-review concepts from
`joeseesun/qiaomu-content-interpreter` at reviewed revision
`68adb343a0d61d344699f3c350a5920da85d4ddc`.

Do not import its personal writing voice, fixed long-form workflow, filesystem paths, image
generation, or Obsidian integration.

Intake outcome: `rejected-out-of-scope` as an installable companion because most of the upstream
workflow is general content production and depends on personal tooling. Only the UI-copy rewrite
and completeness-review concepts are adapted into the built-in contract, so no companion registry
entry or runtime dependency is added.

## Success Criteria

- Interface copy leads with the exact user consequence or available action.
- A more direct rewrite cannot broaden or strengthen the source claim.
- High-impact copy records an old/proposed comparison in `qa.md`.
- The contract ships in the package and is routed from the main skill.
