# Proposal: add a feedback and contribution loop

## Why

The pipeline currently has two blind spots:

1. Most companion checks only prove a skill folder exists. Only Anime.js has a capability profile, so stale visual, motion, GSAP, Next.js, or workflow companions can still produce a false green result.
2. A discovered gap is written to `qa.md`, but there is no consistent way to deduplicate it, redact local evidence, prepare a contribution, or feed the result back into future pipeline runs.

Downstream users should be able to surface pipeline problems immediately, while maintainers need a self-hosting workflow that uses the pipeline to improve the pipeline.

## What

- Move companion groups, project surfaces, and capability profiles into a machine-readable registry.
- Add profiles for visual direction, motion review, GSAP production motion, Next.js design engineering, gstack-style feedback flow, and Anime.js v4.5.
- Add a local observation recorder with deterministic fingerprints, deduplication, redaction, and Issue/PR draft generation.
- Allow `check-deps.cjs --record-feedback` to capture warnings at detection time.
- Add an explicit maintainer loop from observation through learning and registry update.
- Add repository Issue/PR templates for evidence-backed contributions.

## Safety Boundary

Normal pipeline runs write local artifacts only. Remote publication is a separate, explicit step handled by an authorized GitHub or ship workflow after the draft and evidence are reviewed.
