# Creative Prompting: Discover, Define, Deliver

Use this for open-ended design work: several visual directions, a direction that still reads as a
template, or final visual polish. It complements the three-stage flow and never replaces the functional
contract, owner preferences, the project's design system, engineering checks, or real browser acceptance.

Do not use it for pixel replication, strict adherence to an existing `DESIGN.md`, bug fixes, accessibility
remediation, factual retrieval, or any task with one correct answer. A functional page may borrow the brief
and review method, but a creative seed may only shape the presentation layer, never the user's mental model
or task flow.

## 1. Discover: widen, then narrow

### 1.1 Inject external variation

"Be bolder" is not a mechanism. When several directions are needed, give each direction its own long random
string as a private seed. Prefer a system entropy source; generate in the model only when no tool is available.
Never show the seed in the page, copy, or final design. Keep it in working notes so the run can be reproduced.

Map the seed to at least four decision axes, not to a surface metaphor:

- medium or era: printed catalogue, stage set, instrument panel, museum label, street signage, early digital device;
- composition: symmetric or asymmetric, centred or edge, continuous narrative or discrete modules, flat or spatial;
- material: paper, metal, textile, glass, ink, pixel, photography, 3D, or type only;
- type and rhythm: family roles, size ratio, whitespace pressure, density, the relation of figures to text;
- interaction and motion: one signature action, feedback frequency, physical or fully static.

Each direction also gets one mutually exclusive hard constraint, so that the direction can be explained and
reproduced. Discard any seed result that harms the functional contract, brand, legibility, accessibility or
performance.

### 1.2 Ambition statement instead of style adjectives

Name a non-software world to borrow the visual language from, and say how it changes the page:

> Make each section read like a museum label that can be read continuously, while the page still does the
> job of comparison, trust and conversion. Borrow the editorial rhythm, material and viewing distance; copy no
> existing brand or work.

A useful statement names the emotion sought, the borrowed world, the translation rule, the product task that
must still succeed, and the cliché most likely to ruin it.

### 1.3 Let reactions drive the direction

1. List 12–20 short direction names, one sentence each. Do not implement yet.
2. Pick the four most different and make real mini mockups.
3. Record the owner's natural reactions as "want / avoid / tension to keep".
4. Sharpen the direction from those reactions until the owner can say why it was chosen.
5. Only then compile a short build brief.

## 2. Define: turn the direction into an executable identity

### 2.1 Build brief

After the direction is confirmed, write a short brief in this structure. Not prose, not an implementation tutorial:

```text
Product and audience:
Functional contract: reason to exist / what must be known in 3 seconds / the action to complete
Target feeling: what the user should feel first, then understand
Inspiration translation: which world; which composition, material, type and interaction rules it becomes; what is not copied
Creative decisions: 3–5 decisions derived from the seed, plus mutually exclusive hard constraints
Signature action: one visual or interaction moment worth remembering
Anti-goals: 3–5 likely template or over-design outcomes
Asset strategy: real imagery / generated / 3D / video / type only; reason and fallback
Implementation boundary: existing components, performance, responsive, accessibility, content and brand constraints
Acceptance: observable, screenshot-checkable, operable pass conditions
```

### 2.2 Independent visual critique

When the user asks for an independent or parallel review, or the workflow allows one, the critic sees only the
current desktop and mobile screenshots, the target feeling, and an optional reference baseline. Do not give the
critic code, implementation effort, earlier reasoning, old scores, or the previous critique. A fresh context
reduces sunk-cost defence.

Use one fixed critique prompt, with the same wording in every round:

```text
Imagine the target feeling as the finished standard of a first-rate design studio. Judge only from the
screenshots; do not speculate about code. Check overall composition and detail craft together. Penalise
overuse, excess, and obviously template-like patterns. If references are given, treat them as a baseline for
quality and atmosphere, not as a target to copy.
Output: 1) the strongest point; 2) the three largest gaps, ranked by impact and tied to a region; 3) a
0–10 closeness score; 4) the three things to change next round. Be direct, specific, and take a position.
```

Calibrate polish against two to four professional references placed beside the current screenshot. Ranking
beside a baseline is more objective than asking whether the design is pretty. References calibrate taste;
they are never a copy target.

Stop after at most two rounds of screenshot, critique and fix. A score of 9 or above is a stop. If two rounds
do not reach it, report the remaining gap or change direction; do not loop indefinitely. A score does not
replace functional tests or human judgement.

## 3. Media assets: call them when they earn their place

Coding agents tend to substitute gradients, geometric shapes and CSS texture for real visual assets. When the
direction depends on people, objects, materials, space or narrative imagery, assess image generation or real
assets instead of drawing a few glowing circles.

- Images: define the composition role, material, light, where whitespace sits, colour relations and how UI sits
  on the image. Place the final asset in the project, record its source or generation method, and check crop,
  responsive behaviour, loading and text contrast.
- Video: consider it only for complex physical motion, loops, or interpolation between key states that clearly
  improves the experience. Define first and last keyframes, the loop point, transparency, a static poster, the
  compression budget and a reduced-motion fallback. Check seams, backgrounds, flicker and text occlusion frame by frame.
- Models and services change. Verify current capability, price and licence before use. Never write API keys
  into prompts, skills, code, logs or deliverables.

If a media asset adds no information, emotion or brand recognition, leave it out. Type-only directions can be
valid, but that must be a deliberate choice, not an agent avoiding work.

## 4. Deliver: a final pass of subtraction

After implementation, do not ask only what else can be added. Ask what would be lost by removing each element:

| Element | Keep only if |
| --- | --- |
| Label or caption | without it, the user misreads the information or the next step |
| Container or card | it expresses a real group, level or interaction boundary |
| Colour or highlight | it encodes state, priority, brand, or a clear focus |
| Motion | it explains cause, spatial relation, state change or immediate feedback |
| Custom control | it is clearer and more usable than the platform or project's own component |
| Whitespace | it sets rhythm, grouping or viewing distance, rather than emptiness |

Remove duplicate labels, duplicate calls to action, semantic-free containers, random colour, decorative glow,
system text that talks to itself, and custom controls that are worse than the native component.

After subtraction, re-capture and confirm: the functional contract is still complete, the visual focus is
clearer, and density was not reduced by deleting words to fake minimalism.

## Sources

The seeded-variation method is a concept from the String Seed of Thought research (Sakana AI, 2026-04,
https://pub.sakana.ai/ssot/). The discover, define and deliver structure and the public Techniques 1–6 are
adapted from Anshu Chimala, "How to turn your AI into a world-class designer" (Lenny's Newsletter, 2026-09-01,
public portion only). Techniques after the public portion were not read and are not described here.

These two sources are cited for concepts. This file is written in this repository's own wording, derived from
the MIT-licensed `qiaomu-design` reference (`references/creative-prompting.md`, reviewed at commit
`ccd9cecb5b1f1e994eebf7bd814f2f0c35fe3bea`). `codeCopied: false`.
