# Tasks

## Step 1 (this change)

- [x] Add workflow state (`.design-pipeline/state.json`) with deliverable, tier, mode, stage and decisions.
- [x] Add `designer-pipeline next` returning one run, ask or done action per call.
- [x] Add `designer-pipeline decide` for the concept pick and the draft verdict.
- [x] Add quick, standard and full tiers; OpenSpec only in full.
- [x] Replace skill/SKILL.md with a front door under 5 KB; move the previous content to references/pipeline-reference.md.
- [x] Make tests that required SKILL.md text require it to be reachable from the front door.
- [x] Write the migration note in CHANGELOG [Unreleased]; update the Claude Code router.
- [ ] Bump VERSION to 0.12.0-beta.1 at release time (release contract ties VERSION, CHANGELOG and tag).
- [x] Run repository QA and record results.

## Later steps (separate changes)

- [ ] 2 Split `film` and `edit` sub-workflows.
- [ ] 3 Concept and review stages; two-brief comparison round.
- [ ] 4 `film reference analyze`.
- [ ] 5 motion-web and onetake idea port (provenance before 2026-10-18).
- [ ] 6 Case library with golden cases.
- [ ] 7 Full comparison evaluation.
