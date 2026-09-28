# QA

## Technical (film check)

Storyboard, score, timeline, render, audio and composition gates pass. Render: 45.000 s,
1920x1080, 30 fps, audio present; the planned match cut at 25 s is found by the scene detector and
lands on an audio onset. Six composition warnings (five codes) are reviewed in case.json. The
render counter-example `swap-on-boundary` is caught (`carry-cut`).

## Fixes made during production (each became a rule)

1. The first render changed the shot behind the travelling dot exactly on the 15 s boundary, which
   the storyboard declares as continuation; the render gate reported `carry-cut@morph`. The
   change now happens a beat later (`cuts-inside-beats`).
2. The left marker's hunting wobble ended 0.01 s after its jump started (`property-conflict`); the
   wobble now starts 0.02 s earlier (`one-driver-per-property`).

## Creative review (director, frames at 1 fps)

- Comprehension: the slideshow, the hunting gaze and its red jumps, the named rule, four labelled
  carries, the side-by-side comparison, the rule with its storyboard field.
- Continuity: the triangle, the marker, the full stop, the dot, the square, the camera, the shrinking
  screen, the eye path and the underline carry every boundary; the only cut is the demonstrated
  match cut.
- Rhythm: 3.75/3.75/2.5/5/5/5/2.5/10/5/2.5 s; the comparison is the longest beat.
- Transformation: marker to full stop to dot to square; one screen to two; eye path to underline
  to the design-pipeline mark.
- Identity: design-pipeline's status colours, monospace, and the sting's lockup.
- Sound: accents measured on the grid; not heard by the director.

## User acceptance

Pending.
