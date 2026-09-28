# QA

## Technical (film check)

`node evals/cases/verify.cjs --render --case design-pipeline-promo-20s` on 2026-09-29: storyboard,
score, timeline, render, audio and composition gates pass. Render: 20.000 s, 1920x1080, 30 fps,
audio present; the planned cut at 6 s is found by the one-step pixel detector (34% of the frame
changes in one step, against 0.2% before it) and lands on an audio onset. The render
counter-example `jump-carry` is caught (carry-cut). Five composition warnings are reviewed in
case.json (`reviewedWarnings`).

## Fixes made during production

1. The docked log was placed with absolute coordinates where GSAP expects offsets, so the command
   sat inside the storyboard strip for 15 s (`hud-outside-the-subject`).
2. The cut at 6 s scored 0.248, then 0.155 on the scene detector although most of the frame
   changes. The render gate now also accepts the one-step pixel detector for planned cuts
   (gate change in this case's OpenSpec change).
3. The finding panel overlapped the close-up's cards; the close-up is 2.3x instead of 2.6x and
   the panel sits lower.
4. The draft greys out on the cut, so the red markers and the finding carry the focus.
5. The pass (14 s) and the lanes (15.5 s) were too quiet to register as accents; the breakdown
   gained a chime and a louder tick.

## Creative review (director, frames at 2 fps plus key frames at 960 px)

- Product comprehension: the viewer sees a command return one action, a draft get stopped by a
  named finding with a fix, the fix applied, and the check pass.
- Continuity: the green rule becomes the strip, the strip survives to the end as the middle lane
  and then the logo line; the only reset is the cut on the drop.
- Rhythm: 2/2/2/2/6/1.5/2/2.5 s; the six-second fix is the longest beat; holds after the pass
  and on the logo.
- Transformation: empty prompt to one action; line to frames; empty frames to draft; draft to
  red joins; cards to one subject through five frames; one strip to three lanes; lanes to logo.
- Identity: status colours carry their product meaning; monospace commands; the sting's lockup.
- Reference fit: no reference (see reference.md).
- Sound: accents measured on the grid; not heard by the director.

## User acceptance

Pending.
