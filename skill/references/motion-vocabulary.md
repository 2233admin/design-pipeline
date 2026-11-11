---
sourceMeta:
  id: emilkowalski-animation-review
  kind: github
  url: https://github.com/emilkowalski/skills/blob/f1090bec277140d02ed202440185ad9d02ac1490/skills/animation-vocabulary/SKILL.md
  reviewedRevision: f1090bec277140d02ed202440185ad9d02ac1490
  reviewedContentHash: 40d2b27adfdfeb0570a9f20e7d0255109d9233c50603878bcd0dcd04c923fd94
  contentHashScope: single-source UTF-8 bytes at reviewedRevision
  reviewedAt: 2026-11-11T00:00:00.000Z
  freshnessDays: 365
  license: MIT
  useBoundary: reference-only; terms and definitions quoted verbatim with attribution; do not install or execute upstream content
---

# Motion Vocabulary

Turn a loose description of a motion effect ("the popover seems to grow out of the button") into its
exact term, tell close terms apart, and find what the package already has for that term. This guide
names effects; it does not design or build them. For that, continue with
[animation-opportunity-and-review.md](animation-opportunity-and-review.md) and
[motion-spec.md](motion-spec.md).

The data is [motion-vocabulary.json](motion-vocabulary.json): 91 terms in 12 categories, each with
its definition quoted from the upstream glossary, colloquial aliases in English and Chinese, close
terms with the difference, and links to packaged resources. Three named anti-patterns are this
repository's additions.

## Look up a term

Use the existing catalog search. There is no separate vocabulary command.

```bash
node scripts/designer-pipeline.cjs design-system search \
  --snapshot references/component-source-catalog.json --kind doc \
  --query "popover grows out of the button"
```

Run it from the skill root, or add `--root <skill root>`. The query can be a term, a description in
your own words, or Chinese (`--query "按钮按下去缩一下"`).

- Vocabulary records come first, best match first; motion recipes that contain the query follow in
  their usual order. `--category motion-vocabulary` returns terms only; `--limit 3` keeps the answer
  short.
- In a vocabulary record, `name` is the term, `description` is the definition, and
  `motionVocabulary` holds `closeTerms` (id, term, difference), `antiPatterns` and `local`.
- `motionVocabulary.kind` is `term` or `anti-pattern`. An anti-pattern record names the `replacement`
  term and a `fix`.
- Matching is lexical: shared words between the query and a term's name, aliases and definition,
  weighted by how rare the word is in the vocabulary. No model is called, so the same query always
  returns the same order. A term is listed when it covers at least half of the query's known words;
  the three best are listed from a quarter. Words the vocabulary does not know are ignored, and a
  query made only of such words returns no term.
- No vocabulary record in the result means no term matched. Rephrase with what is seen or felt
  (direction, speed, what it follows) before concluding there is no term.
- The search is a shortcut, not the authority. Word overlap misses a description that shares no
  word with a term's aliases (on 24 descriptions written after tuning, the right term was first for
  15 and in the first three for 19). When the listed definitions do not describe the effect, read
  the category it belongs to in [Categories](#categories) and the definitions of its terms in
  `motion-vocabulary.json`, then choose by definition.

## Answer a naming question

1. Read the description for what is seen or felt, not for keywords, then search.
2. Lead with the term, then its definition exactly as `description` gives it. Do not paraphrase a
   definition.

   ```text
   **Stagger** — Animate several items one after another with a small delay between each, creating a cascade.
   ```

3. When more than one term fits, give the best match first and at most two alternates, each with
   the one-line difference from `closeTerms`.
4. When no term fits exactly, name the closest one and say plainly that it is an approximation, or
   describe the effect with several terms ("a stagger of scale-in entrances"). Check the fit against
   the definition, not against the rank: a first result whose definition does not describe the
   effect is an approximation.
5. Stay inside the vocabulary. If the effect has no term here, say so; do not coin one.
6. A naming question wants a name. Add `local` links or anti-patterns only when the next step is to
   build or review the effect.

## Close terms that are often confused

| Pair | Difference |
| --- | --- |
| Pop in / Bounce | Pop in is an entrance with a slight overshoot. Bounce is the spring behaviour, overshoot and settle, on any motion. |
| Scale in / Pop in | Scale in stops exactly at full size. Pop in overshoots and settles back. |
| Clip-path / Mask | Clip-path cuts along a geometric shape with a hard edge. Mask hides with an image or gradient, so its edge can be soft and fade. |
| Shared element transition / Layout animation | A shared element transition links two elements in different places or views. A layout animation is one element reacting to its own change of size or position. |
| Layout animation / "shared layout animation" | Motion's "shared layout animation" (`layoutId`) connects two different elements; in this vocabulary it is a shared element transition, not a layout animation. |
| Morph / Crossfade | A morph changes the shape itself. A crossfade only blends the opacity of two elements in one spot. |
| Scroll reveal / Scroll-driven animation | A scroll reveal fires once at a threshold and plays on its own clock. A scroll-driven animation is scrubbed by the scroll position. |
| Rubber-banding / Bounce | Rubber-banding is resistance while dragging past a limit. Bounce is overshoot on arrival. |

Every term's own `closeTerms` list is in the data; this table is the short list.

## Anti-patterns

| Id | What it is | Use instead | Fix |
| --- | --- | --- | --- |
| `scale-from-zero` | An entrance that starts at `scale(0)`, so the element appears out of nothing. | `scale-in` | Start between `scale(0.9)` and `scale(0.97)` with `opacity: 0`; anchor a popover to its trigger. |
| `hover-flicker` | A hover animation that switches on and off: the element moves out from under the pointer, or a touch tap fires a hover. | `hover-effect` | Keep the hit area still (listen on a parent, move the child); gate hover motion behind `(hover: hover) and (pointer: fine)`. |
| `layered-entry` | Several entrance animations stacked on one arrival: container and children each animate on their own clocks. | `orchestration` | Give the arrival one owner: animate the container once, or stagger the children under one timeline. |

A search that matches an anti-pattern returns it beside the terms it concerns, for example
`--query "popover grows from scale 0"` returns `scale-from-zero` with `origin-aware-animation` and
`scale-in`. The three names are listed on the upstream author's page for this skill; the public
glossary does not define them, so the descriptions and fixes above are this repository's, based on
the rules cited in each record's `sources` (the bundled
[emil-design-eng snapshot](ui-craft-sources.md#emil-design-eng), [ui-transition-rules.md](ui-transition-rules.md),
[mobile-web.md](mobile-web.md)).

## Categories

- **Entrances & Exits** (how elements appear and disappear): `fade-in-fade-out`, `slide-in`, `scale-in`, `pop-in`, `reveal`, `enter-exit`.
- **Sequencing & Timing** (coordinating multiple elements or moments): `keyframes`, `interpolation-tween`, `stagger`, `orchestration`, `delay`, `duration`, `fill-mode`, `stepped-animation`.
- **Movement & Transforms** (changing an element's position, size, or angle): `translate`, `scale`, `rotate`, `skew`, `3d-tilt-flip`, `perspective`, `transform-origin`, `origin-aware-animation`.
- **Transitions Between States** (connecting one state, view, or element to another): `crossfade`, `continuity-transition`, `morph`, `shared-element-transition`, `layout-animation`, `accordion-collapse`, `direction-aware-transition`.
- **Scroll** (motion tied to scrolling or navigating between views): `scroll-reveal`, `scroll-driven-animation`, `parallax`, `page-transition`, `view-transition`.
- **Feedback & Interaction** (responding to the user's actions): `hover-effect`, `press-tap-feedback`, `hold-to-confirm`, `drag`, `drag-to-reorder`, `swipe-to-dismiss`, `rubber-banding`, `shake-wiggle`, `ripple`.
- **Easing** (how speed changes over an animation): `easing`, `ease-out`, `ease-in`, `ease-in-out`, `linear`, `cubic-bezier`, `asymmetric-easing`.
- **Spring Animations** (physics-based motion as an alternative to fixed-duration easing): `spring`, `stiffness-tension`, `damping`, `mass`, `bounce`, `perceptual-duration`, `momentum`, `velocity`, `interruptible-animation`.
- **Looping & Ambient Motion** (animations that run on their own): `marquee`, `loop`, `alternate-yoyo`, `orbit`, `pulse`, `float`, `idle-animation`.
- **Polish & Effects** (the small touches that separate good from great): `blur`, `clip-path`, `mask`, `before-after-slider`, `line-drawing`, `text-morph`, `skeleton-shimmer`, `number-ticker`, `tabular-numbers`, `typewriter`.
- **Performance** (what keeps motion smooth instead of stuttering): `frame-rate-fps`, `jank`, `dropped-frame`, `compositing`, `will-change`, `layout-thrashing`.
- **Principles to Know** (concepts that guide when and how to animate): `purposeful-animation`, `anticipation`, `follow-through`, `squash-and-stretch`, `perceived-performance`, `frequency-of-use`, `spatial-consistency`, `hardware-acceleration`, `reduced-motion`.

## From a term to packaged resources

`motionVocabulary.local` is what this package adds to the glossary: where to go once the effect has
a name.

- `primitives`: ids in [motion-primitives.json](motion-primitives.json). Use one as the row's
  `primitive: <registry-id>` when the project `MOTION.md` selects it.
- `recipes`: item ids in [motion-recipes/full-inventory.json](motion-recipes/full-inventory.json).
  Each is the catalog record `motion-reference/<id>`; search that id for its guide and offline
  study.
- `guides`: `<file>#<anchor>` under the skill root, such as a transition rule in
  [ui-transition-rules.md](ui-transition-rules.md) or a section of the bundled emil-design-eng
  snapshot.

A term may have no local resource; its `local` lists are then empty.

## Use the terms in motion.md

In the Interaction Inventory of [motion-spec.md](motion-spec.md), write the "Primitive / effect"
cell with the term id (`origin-aware-animation`, `press-tap-feedback`), and add the primitive id
when the project foundation selects one. Use the same id in review notes and handoff, so the spec,
the implementation and the review name one effect one way. Words such as "grow", "zoom" or "pop"
are descriptions to look up, not names to record. This is guidance; no gate reads the cell.

## Maintaining

- Edit `motion-vocabulary.json`, then run `node scripts/refresh-motion-vocabulary.cjs --catalog`
  from the repository root. The `motion-vocabulary/*` catalog records are generated; a hand edit
  fails `tests/motion-vocabulary.test.cjs`.
- After `npm run sources:update` moves `emilkowalski-animation-review`, the test fails if the
  upstream file changed. Run `node scripts/refresh-motion-vocabulary.cjs --checkout <clone>` to
  refresh the pinned term list, then bring the vocabulary in line: definitions verbatim, new terms
  with aliases in both languages, removed terms dropped.

## Provenance and license

Terms, category names and definitions are quoted verbatim from
`skills/animation-vocabulary/SKILL.md` in
[emilkowalski/skills](https://github.com/emilkowalski/skills/blob/f1090bec277140d02ed202440185ad9d02ac1490/skills/animation-vocabulary/SKILL.md)
(MIT, Copyright (c) Emil Kowalski; see `THIRD_PARTY_NOTICES.md`). Aliases, close-term differences,
local links, the anti-pattern records and this guide are project-owned. The upstream skill is not
installed or executed.
