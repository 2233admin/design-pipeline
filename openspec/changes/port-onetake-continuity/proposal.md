# Port onetake continuity ideas

## Why

Step 5 of `redesign-user-workflow` ports ideas from the reference skill onetake
(`skill/references/reference-skill-onetake.md`, PolyForm Noncommercial 1.0.0, ideas only). Its
central idea is that a film is one continuous take: at every beat boundary something on screen
survives and becomes the next beat, rhythm comes from very uneven shot lengths and real stillness,
and continuity is measured before a human watches.

Our film gates already cover part of this (declared handoffs, the slideshow detector, timeline
carry per boundary). Four gaps remain:

1. The storyboard does not say *what* survives a carried boundary, so "morph" can be claimed
   without a carrier.
2. Nothing checks rhythm: beats of near-equal length and a film with no rest both pass.
3. Continuity is not measured on the rendered film: a planned carry that renders as a hard scene
   change passes, and there is no single continuity number to compare drafts or models.
4. Concepts can be three stories told with the same cards; nothing asks for one idea about the
   picture.

## What changes

- Storyboard gate: carried handoffs name a `carrier`; new `uniform-cadence` and `no-rest`
  findings; optional beat field `holdSec` declares stillness at the end of a beat.
- Render and check: `carry-cut` when a render shows a scene cut on a carried boundary; `film check`
  reports `carryScore` (0-1) and fails below 0.6 (`low-carry`); render reports `stillShare`.
- Direction: concept cards lead with one sentence about the picture; a `camera-follow`
  choreography pattern; the film guide and direction reference explain carry and rhythm in our own
  words.

No upstream code, text, data or assets are used. Work is implemented from the idea descriptions in
`briefs/` only; nobody working on this change opens the onetake repository.
