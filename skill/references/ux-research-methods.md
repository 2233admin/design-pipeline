---
sourceMeta:
  id: awesome-ux-research-methods
  kind: github
  url: https://github.com/tommyjepsen/awesome-ux-skills/blob/4e5d0925e1a0d34894734611b225205aa10e5a2f/ux-research-methods.md
  reviewedRevision: 4e5d0925e1a0d34894734611b225205aa10e5a2f
  reviewedContentHash: 396572fd3133134972196037484def6b553fa28a2b69a7aba2f3aceeaf1cf711
  contentHashScope: single-source UTF-8 bytes at reviewedRevision
  reviewedAt: 2026-08-26T00:00:00.000Z
  freshnessDays: 365
  license: unverified
  useBoundary: reference-only; distilled guidance; do not install or execute upstream content
---

# UX Research Method Selection

This is a pipeline-owned, reference-only method selector. It distills the method-selection
framework from `tommyjepsen/awesome-ux-skills` without importing or executing the upstream skill.
Do not install, import, copy, or execute upstream content.
Source: https://github.com/tommyjepsen/awesome-ux-skills/blob/4e5d0925e1a0d34894734611b225205aa10e5a2f/ux-research-methods.md

## Select by question, not by fashion

First classify the question on four axes:

| Axis | Choose | Typical methods |
| --- | --- | --- |
| What users say vs. do | attitudinal / behavioral | interviews, surveys / observation, analytics, A/B tests |
| Why vs. how much | qualitative / quantitative | interviews, usability tests / surveys, benchmarks |
| Product context | natural / scripted / abstracted / absent | field study / task test / card sort / concept test |
| Product phase | strategize / design / launch-assess | discovery / formative evaluation / summative measurement |

Do not use a qualitative sample to claim prevalence. Do not use a survey to explain a usability
failure. If the question spans axes, state the mixed-method sequence explicitly.

## Default recommendation matrix

### Strategize

Use interviews, contextual inquiry, field or diary studies, concept testing, and participatory
design to discover needs, constraints, and language. Add a survey only when scale or segmentation
is material to the decision.

### Design

Use moderated or unmoderated usability testing for task friction; card sorting or tree testing
for information architecture; desirability testing for visual or tone direction. Test the smallest
flow that can falsify the current design decision.

### Launch and assess

Use usability benchmarking, analytics, clickstream analysis, surveys, and A/B tests to measure
performance and compare variants. A stable target and a named success metric are prerequisites for
summative claims.

## Pipeline output contract

A research recommendation must record:

1. the decision or question to answer;
2. the selected axis values and product phase;
3. the primary method and one complementary method at most;
4. the participants, artifact, or behavioral data required;
5. the observable evidence that would change the design decision;
6. the limitation, especially sample size, proxy behavior, or self-report bias.

If participant access or behavioral data is unavailable, record the constraint and downgrade the
claim. Never fabricate research findings or imply that a design review is user research.

## Anti-patterns

- Running interviews when the decision requires prevalence.
- Treating stated preference as observed behavior.
- Benchmarking an unstable or incomplete flow.
- Collecting methods without a decision owner or falsifiable outcome.
- Adding research ceremony when an existing product signal already answers the question.
