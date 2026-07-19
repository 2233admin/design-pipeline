# Proposal: add upstream capability sync and an authorized contribution bridge

## Why

The pipeline can now detect known companion gaps and prepare local Issue/PR drafts, but it still
depends on maintainers noticing upstream changes and manually translating a reviewed draft into a
remote contribution. That leaves three blind spots:

1. capability profiles can become stale without a recorded source revision or freshness policy;
2. downstream users cannot hand a finding to a host GitHub workflow through a stable,
   machine-readable contract;
3. the pipeline does not reconcile a published Issue or PR back into the local observation history.

These concerns must scale across Anime.js, GSAP, design skills, framework skills, workflow skills,
and future companion suites without adding one-off checker branches.

## What

- Add source identity and freshness metadata to capability profiles.
- Add a deterministic capability-audit command that accepts externally retrieved source evidence.
- Record stale or changed upstream evidence through the existing fail-closed feedback recorder.
- Add a machine-readable publication-request contract for authorized Issue or PR creation.
- Add publication reconciliation so remote URLs and states are linked back to local observations.
- Use the same audit and contribution lifecycle when developing the pipeline itself.

## Safety Boundary

The shipped skill remains local-first and network-optional. It SHALL NOT execute upstream content or
publish remotely. A host adapter may retrieve source metadata or create a GitHub Issue/PR only after
the user explicitly authorizes that remote action and the adapter validates the target, redaction,
tests, and idempotency key.
