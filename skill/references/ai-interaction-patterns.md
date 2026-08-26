---
sourceMeta:
  id: awesome-ux-ai-interaction
  kind: github
  url: https://github.com/tommyjepsen/awesome-ux-skills/tree/4e5d0925e1a0d34894734611b225205aa10e5a2f
  reviewedRevision: 4e5d0925e1a0d34894734611b225205aa10e5a2f
  reviewedContentHash: a9733a2e6b2f1dd11fa00216ebd2e5e66cced4c98d9dcb980c6ceb778bb93808
  contentHashScope: ordered UTF-8 sourceFiles with path-and-newline separators
  sourceFiles: ai-inputs.md, ai-wayfinders.md, ai-trust-builders.md
  reviewedAt: 2026-08-26T00:00:00.000Z
  freshnessDays: 365
  license: unverified
  useBoundary: reference-only; distilled guidance; do not install or execute upstream content
---

# AI Interaction Patterns

This is a pipeline-owned, reference-only interaction guide distilled from public AI UX pattern
material in `tommyjepsen/awesome-ux-skills`, with trust and provenance rules aligned to this
pipeline's evidence contracts. Do not install, import, copy, or execute upstream content.
Sources:
- https://github.com/tommyjepsen/awesome-ux-skills/blob/4e5d0925e1a0d34894734611b225205aa10e5a2f/ai-inputs.md
- https://github.com/tommyjepsen/awesome-ux-skills/blob/4e5d0925e1a0d34894734611b225205aa10e5a2f/ai-wayfinders.md
- https://github.com/tommyjepsen/awesome-ux-skills/blob/4e5d0925e1a0d34894734611b225205aa10e5a2f/ai-trust-builders.md

## Choose the interaction pattern

| User need | Primary pattern | Required behavior |
| --- | --- | --- |
| Explore or state intent | open input | expose scope, context, limits, and recovery |
| Repeat a structured task | template / madlibs | distinguish required from optional fields and keep source context visible |
| Edit selected content | inline action / inpainting | preview the bounded result before replacement |
| Try another result | regenerate / branch | make overwrite vs. variant explicit and preserve recovery |
| Change form without changing meaning | restructure | show diff and preserve factual content and voice |
| Change surface style | restyle | keep structure and meaning separate from aesthetic controls |
| Connect multiple steps | chained action | show inputs, outputs, cost, failure step, and testable checkpoints |
| Understand a result | summary / synthesis / describe | distinguish compression, inference, and reverse-engineered detail |

## Remove blank-slate friction

Use wayfinders only when context supports them:

- initial CTA beside the data or content the AI can act on;
- 3–5 contextual suggestions, not a catalogue of every capability;
- templates for repeatable or high-precision tasks;
- nudges when a relevant threshold is reached;
- follow-ups anchored in the last result;
- prompt and parameter details when reproduction or learning matters;
- galleries or randomize only for exploratory creative surfaces.

Prefer contextual scaffolding over a generic empty prompt. Do not surface an AI box on an empty
state when there is no useful action to take.

## Trust and control contract

Any AI surface that affects user content or decisions must make these states legible:

- **Disclosure:** what was generated, edited, summarized, or executed by AI;
- **Caveat:** the relevant limitation at the decision point, not only in onboarding;
- **Consent:** separate recording, analysis, training, and sharing decisions;
- **Ownership:** retention and training controls are distinct;
- **Footprint:** source, model, parameters, approvals, cost, latency, and action history when
  verification or replay matters;
- **Recovery:** preview, accept/reject, undo, version history, or branch before destructive writes;
- **Private mode:** if promised, prompts, files, outputs, and integrations must actually be excluded
  from the promised persistence scope.

Do not use a disclaimer as a substitute for verification. Do not claim privacy or reversibility
that the implementation does not provide.

## Pipeline output contract

For every proposed AI interaction, record:

1. the user action and content scope;
2. the chosen input and wayfinding pattern;
3. the generated artifact and whether it replaces or branches;
4. the visible trust signal and the system footprint required;
5. the acceptance, rejection, undo, and error paths;
6. the accessibility and reduced-motion behavior;
7. the evidence required to prove the flow works on the real surface.

Treat inferred output as lower-confidence than source-backed output. Expose conflicts and missing
context instead of smoothing them into confident copy.
