# w3: concept sentence, camera-follow choreography, guides

Read `_common.md` first.

## Goal

1. Concepts: in `skill/scripts/workflows/shared.cjs` (the CONCEPTS stage), change the run command
   text so each card starts with the central idea as one sentence about the picture (for example
   "one dot becomes every screen of the app"), followed by the existing fields. Say that the three
   cards must not be the same scenes retold. Update `tests/workflow-next.test.cjs` if it asserts
   the old text.
2. `camera-follow` choreography: add a seek-safe pattern to
   `skill/references/film-choreography/patterns.js` and register it in `registry.json`, following
   the existing entries exactly (read two existing patterns first). Behaviour: a camera wrapper
   leads its subject by a small offset, travels to where the next subject will land before it
   lands, and holds perfectly still for a given rest duration at the end. Parameters are explicit
   (subject selector, path points, lead, rest seconds). No infinite repeats; transforms only (no
   top, left, width or height); eases that accelerate and settle. If a test enumerates registry ids
   against patterns, keep it passing; otherwise add one assertion that `camera-follow` is
   registered and exported.
3. Guides, in our own words, short:
   - `skill/references/workflow-film.md`: in `## concepts`, the one-sentence picture idea. In
     `## plan`, a few lines on carry (every carried boundary names a `carrier`: what survives and
     what it becomes) and rhythm (beat lengths should differ a lot, at least 3x between the
     shortest and longest in films of four or more beats; a film of 8 s or more needs a rest: a
     hold beat or a beat with `holdSec`). Another worker adds the storyboard fields `carrier` and
     `holdSec`; document them as described here.
   - `skill/references/product-film-direction.md`: one short new section "Carry and rhythm"
     explaining why: scenes that replace each other read as a slideshow even with good timing; one
     continuous camera ties beats together; stillness makes moves land. Cite
     `reference-skill-onetake.md` as the source of the idea (ideas only, non-commercial source).
   - Keep `skill/SKILL.md` unchanged and under 5 KB.

## Files

`skill/scripts/workflows/shared.cjs`, `skill/references/film-choreography/patterns.js`,
`skill/references/film-choreography/registry.json`, `skill/references/workflow-film.md`,
`skill/references/product-film-direction.md`, tests, CHANGELOG.

Branch: `onetake-w3-direction`.
