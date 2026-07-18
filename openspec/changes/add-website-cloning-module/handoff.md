# Handoff

## Current State

- Change id: `add-website-cloning-module`
- Status: complete
- Phase: stage 6 gate review
- Last updated: 2026-07-15T23:01:29.1534577+08:00

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
- Use Node standard-library initializer and evaluator CLIs for deterministic artifact creation and fidelity state transitions.
- Keep Browser, Builder, and Evidence adapters provider-neutral and record actual capabilities plus probe results.
- A replacement reference mapping requires adaptive mode and is fidelity to a mixed contract, never global 1:1.

## Missing Capabilities / Fallbacks

- GBrain is not enabled; OpenSpec remains the durable source of truth.

## Evidence

- Final `node scripts/qa.cjs`: pass, including temporary installation.
- Final targeted test suite: 16/16 pass.
- `quick_validate.py skill`: pass.
- Independent standards review: pass.
- Independent specification review: pass.
- Independent forward test: pass after exact/adaptive and per-mapping evidence fixes.
- Final code-intel pipeline: exit 0, zero effective failures; Understand graph and Sentrux governance remain manual/unconfigured.

## Blockers

None.

## Next Actions

1. Install or publish the updated skill only when explicitly authorized.
2. For real clone runs, resolve Browser/Builder/Evidence adapters and confirm authorization before evaluation.
