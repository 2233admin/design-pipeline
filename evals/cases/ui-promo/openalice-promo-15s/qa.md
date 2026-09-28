# QA

## Technical (film check)

Storyboard, score, timeline, render, audio and composition gates pass. Render: 15.000 s,
1920x1080, 30 fps, audio present. All three planned match cuts (2, 8, 11 s) are found by the
one-step pixel detector; two land on audio onsets. Eight composition warnings are reviewed in
case.json. The render counter-example `whip-cuts` is caught (`planned-cuts-missing`).

Match-cut anchors, in capture css px: question start (678, 477) at 20 px in Ask Alice and
(671, 263) at 13 px in the terminal; red +9.1% at (815, 460) in the terminal and (1097, 879.5) at
16 px in the report table; "AAPL" at (924, 266.5) at 20 px in the report title and
(671.5, 1009.5) at 13 px in the positions table. Camera scales keep cap heights equal across the
first two cuts (1.8 x 20/13, 2.9 x 13/16).

The terminal session plays at 1.3x (from 4.15 s of the capture), so the agent's reads and the
+9.1% fit the 6 s beat.

## Fixes made during production (each became a rule or a gate change)

1. Capture: Chrome's screencast downsamples to css size, so captures are frame-stepped
   screenshots at 2x on the page's virtual clock. The replay timed itself from
   requestAnimationFrame's wall-clock stamp and ran about 4x fast until rAF was given the
   virtual `performance.now()`. Typing into the paused page stalled it, so typing is stop-motion.
2. Both video shots froze (0.00% motion per step) because of sparse keyframes; captures now have a
   keyframe every 0.5 s (`keyframes-for-seeking`).
3. The renderer drew video at its natural 3840 px width, so the camera framed the wrong region;
   videos are laid out at 3840 x 2160 inside a 0.5 scale wrapper.
4. The cuts at 8 s and 11 s were missed: the camera whipped into one and drifted out of the
   other. The camera now settles before each cut and holds after it (`match-cut-on-a-still-anchor`).
5. The 11 s cut (27% of the frame against 0.6% and 0.0% either side) was still rejected because
   camera moves filled its 2 s window. The render gate now accepts a step between two still
   neighbours (gate change in this case's OpenSpec change).
6. The name faded in over the still-shrinking portfolio (`brand-after-the-card-settles`).

## Creative review (director, frames at 2 fps and key frames at 960 px)

- Product comprehension: ask a question, the agent researches in its workspace, the finding lands
  in the Inbox, it bears on a position in the portfolio.
- Continuity: each cut is carried by the fact the viewer just read; the portfolio shrinks into the
  end card.
- Rhythm: 2/6/3/1.5/2.5 s; the research is the longest beat; the logo holds.
- Transformation: empty box to question; question to finding; finding to report; report to
  position; portfolio to card.
- Identity: OpenAlice's own interface, logo and tagline.
- Reference fit: no reference (see reference.md).
- Sound: accents measured on the grid; not heard by the director.

## User acceptance

Pending.
