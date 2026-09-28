# Design pipeline delta

## Requirement: single next step
The pipeline SHALL provide a `next` command that reads project state and returns exactly one
action: run a command, ask the user one decision with a recommended answer, or report done with
evidence. Completed steps SHALL NOT be repeated.

## Requirement: project state
The pipeline SHALL record deliverable, tier, mode, stage and human decisions in
`.design-pipeline/state.json`, and SHALL treat a recorded artifact that no longer exists as stale.

## Requirement: ceremony tiers
Work SHALL run at a quick, standard or full tier. OpenSpec artifacts SHALL be required only at the
full tier and for changes to this repository.

## Requirement: two human decisions
Standard work SHALL ask the user to pick one of three concepts and to accept or reject a draft
that has passed all error gates; a rejection SHALL be recorded with its reason.

## Requirement: small front door
The entry skill SHALL stay under 5 KB and route to deliverable workflows and references loaded on
demand; every existing command SHALL remain available.
