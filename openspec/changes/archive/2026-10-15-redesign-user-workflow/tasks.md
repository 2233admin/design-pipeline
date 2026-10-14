# Tasks

## Step 1 (this change)

- [x] Add workflow state (`.design-pipeline/state.json`) with deliverable, tier, mode, stage and decisions.
- [x] Add `designer-pipeline next` returning one run, ask or done action per call.
- [x] Add `designer-pipeline decide` for the concept pick and the draft verdict.
- [x] Add quick, standard and full tiers; OpenSpec only in full.
- [x] Replace skill/SKILL.md with a front door under 5 KB; move the previous content to references/pipeline-reference.md.
- [x] Make tests that required SKILL.md text require it to be reachable from the front door.
- [x] Write the migration note in CHANGELOG [Unreleased]; update the Claude Code router.
- [x] Bump VERSION to 0.12.0-beta.1 at release time (release contract ties VERSION, CHANGELOG and tag): moved to #128 when this change was archived.
- [x] Run repository QA and record results.

## Later steps (separate changes)

- [x] 2 Split `film` and `edit` sub-workflows.
- [x] 3 Concept and review stages; two-brief comparison round: moved to #129.
- [x] 4 `film reference analyze`: moved to #130.
- [x] 5 motion-web and onetake idea port (provenance pinned by `pin-film-reference-provenance`; next review due 2026-10-28): moved to #131.
- [x] 6 Case library with golden cases (moved to #132) (in progress: product PV and logo sting accepted in `add-golden-case-library`; UI promo and explainer accepted in `add-ui-promo-and-explainer-cases`; MAD needs a footage source).
- [x] 7 Full comparison evaluation: moved to #133.
