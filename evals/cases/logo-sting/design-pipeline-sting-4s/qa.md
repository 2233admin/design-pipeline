# QA

## Technical (film check)

`node evals/cases/verify.cjs --render --case design-pipeline-sting-4s` on 2026-09-29: storyboard,
score, timeline, render, audio and composition gates pass with no warnings. Render: 4.000 s,
1920x1080, 30 fps, audio present; the three accents at 1.0, 1.5 and 2.0 s have onsets within one
frame. Both render counter-examples are caught (`jump-reveal`: carry-cut; `small-in-frame`:
blank-frame).

## Fixes made during production (each became a rule in case.json)

1. First render: the mark was a thin line in an empty frame (composition blank-frame and
   low-contrast at 1.0 s and 2.25 s). The camera now starts 1.9x close and pulls back with the
   name (`fill-the-frame-early`).
2. The name rendered in Courier New: the `font` shorthand hid the family from HyperFrames' font
   embedding (`name-the-font-family`).
3. The landing ring was visible from frame 0: `fromTo` rendered its from-state at build time
   (`no-early-from-state`).
4. The name's reveal ran ahead of the pull-back and was cropped at the right edge around 2.75 s;
   camera, lockup shift and reveal now share one span and one ease (`reveal-inside-the-frame`).
5. The mix measured -18.7 LUFS in the render; the source was rebalanced (less peak on the
   impact, a sustained chord) and now passes the web target.

## Creative review (director, frame by frame at 4 fps and 10 fps)

- Product comprehension: work travels, stops at a check, the check turns green, the work arrives.
- Continuity: one element (the line head) runs from the first frame to the dot; the camera
  pull-back and the name's reveal are one move.
- Rhythm: move, stop, move, stop, accelerate, hit; the lockup then holds for 0.7 s.
- Transformation: grey gates become green; the line head becomes the dot; the mark becomes a
  lockup.
- Identity: status green from DESIGN.md, monospace name, near-black stage.
- Reference fit: no reference (see reference.md).
- Sound: accents measured on the grid; not heard by the director.

## User acceptance

Accepted by the user on 2026-09-29, both films as sent, with no changes requested.
