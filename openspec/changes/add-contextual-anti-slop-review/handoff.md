# Handoff

## Current state

Implementation, local installation, dual-site calibration, and verification are complete.

## Decisions

- Keep upstream prompt text out of global and packaged instruction surfaces.
- Curate concepts into hard, contextual, and preference rules.
- Require evidence and explicit contextual acceptance.
- Trial the evaluator against the Arknights and Endfield research evidence.

## Verification

- Targeted evaluator tests: 6 passed.
- Full Node suite: 73 passed.
- Repository QA and package checks: passed.
- Sentrux check and non-regression gate: passed.
- Installed skill self-check: passed with only the pre-existing optional Anime.js warning.

## Remaining boundary

The evaluator consumes structured evidence; it does not replace browser replay for interaction,
responsive, or reduced-motion verification. No remote publication was performed.
