# Handoff

## Current State

- Change id: `add-website-cloning-module`
- Status: in progress
- Phase: stage 4 tasks
- Last updated: 2026-07-15T22:19:53.9035175+08:00

## Goal

Internalize the reusable website-reconstruction protocol from `UHolli/ai-website-cloner` as a design-first, provider-neutral module.

## Artifacts

- Brief: `brief.md`
- Directions: `directions.md`
- Design: `design.md`
- Motion: `motion.md`
- Tasks: `tasks.md`
- QA: `qa.md`
- State: `state.json`
- Events: `events.jsonl`

## Decisions

- Route natural-language cloning intent from the main skill.
- Keep the detailed protocol in `skill/references/website-cloning.md`.
- Use a Node standard-library initializer for validation and artifact creation.
- Keep browser and builder provider selection in the execution protocol, not a speculative runtime abstraction.

## Missing Capabilities / Fallbacks

- GBrain is not enabled; OpenSpec remains the durable source of truth.

## Evidence

- Baseline `node scripts/qa.cjs`: pass.
- Baseline `node skill/scripts/check-deps.cjs --json`: result `OK`.

## Blockers

None.

## Next Actions

1. Write failing tests at the initializer CLI seam.
2. Implement the initializer and workflow reference.
3. Update routing, QA, attribution, and stable spec.
