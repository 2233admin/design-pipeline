# Design Review Dimensions

Use this when a rendered design needs a scored critique before delivery or revision. It complements
`anti-slop-review.md` (pattern screen) and `critique-structure`; it does not replace the functional
contract, the owner's acceptance, or the rendered-surface checks in `qa-checklist.md`.

Concept-led review: a score here is a judgement about the design, not proof of visual acceptance. Report
it next to the gate results and never as acceptance.

## Dimensions

Score each dimension 1–10 with one sentence of evidence from the render.

0. **Concept.** Can the design's idea be stated in one sentence? Does a visual motif come from the content
   rather than from a style list? Cover the text and logo: is the topic still recognisable?
   Swap the client or product name: if the design still works, it is a template and this dimension is at most 5.
1. **Philosophy alignment.** Do the colour, type, layout and detail follow the chosen direction's own rules?
   Is anything mixed in from another direction?
2. **Visual hierarchy.** Does the eye move in the intended order? Heading to body size ratio at least 2.5:1.
   Three or four distinct levels set by size, weight or colour. Squint: is the order still clear?
3. **Craft.** One spacing scale, consistent gaps between like elements, at most three or four colours,
   at most two type families, edges aligned to one axis.
4. **Function.** Remove any element: does the design get worse? Is the primary action in the most visible
   place? Is the information density right for the medium?
5. **Originality.** Free of common clichés; has a decision that is unexpected but justified by the concept.

Concept gate: when the concept scores 5 or below, the overall score is capped at 6. Fix the concept before
polishing execution.

## Scoring bands

| Overall | Reading |
| --- | --- |
| 8.0 and above | strong; remaining issues are polish |
| 6.0–7.9 | sound; fix the named weak points |
| 4.0–5.9 | needs rework of at least one dimension |
| below 4.0 | fails; restart from concept or direction |

## Medium weighting

The heaviest dimensions depend on the medium. Use these as the primary and secondary focus; the others still count.

| Medium | Primary | Secondary | Can relax |
| --- | --- | --- | --- |
| Single cover or social image | originality, hierarchy | philosophy | function |
| Infographic | function, hierarchy | craft | originality (accuracy first) |
| Slide deck | hierarchy, function | craft | originality (clarity first) |
| PDF or long document | craft, function | hierarchy | originality (professional first) |
| Landing page or site | function, hierarchy | originality | none (all required) |
| App UI | function, craft | hierarchy | philosophy (usability first) |

## Common failures

- Generic AI-tech imagery (gradient spheres, circuit boards, robot faces) used as the concept. Replace with an
  abstract metaphor that comes from the content.
- Heading-to-body ratio below 2.5:1. Raise the heading so the hierarchy reads at a glance.
- Five or more colours with no primary. Keep one main, one support and one accent, plus neutrals.
- Spacing that is not on a single scale. Pick one grid and use only its steps.
- Mixed alignment. Choose one and apply it everywhere.
- Decoration that outweighs content. If removing it costs nothing, remove it.
- Information density that does not suit the medium: one core point per slide, one focal point per cover.

## Report shape

```text
Overall: X.X/10 (cap 6 if concept <= 5)
Concept: X/10 — one-sentence idea
Philosophy: X/10 — one sentence
Hierarchy: X/10 — one sentence
Craft: X/10 — one sentence
Function: X/10 — one sentence
Originality: X/10 — one sentence

Keep: specific things that work, in the design's own language
Fix (most severe first):
1. <name> — blocker | important | refinement
   current / why / fix (with a value where possible)
Quick wins: the three highest-impact fixes
```

Each reviewer must name at least one weakness. "No issues" is not an accepted result.

## Provenance

The dimension names, the concept gate and the scoring bands are adapted concepts from `second reference project`
(`references/critique-guide.md`, MIT, reviewed at commit `4fc7bfdbd5ec3fa2d43ce7a6433de60976a5e4b1`).
Wording and tables here are this repository's own. `codeCopied: false`.
