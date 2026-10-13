# Add UI promo and explainer golden cases

## Why

This is the second round of step 6 of `redesign-user-workflow`. The product PV and logo sting
cases came first. On 2026-09-29 the user asked for a UI promo and an explainer and made these
choices:

- The UI promo shows OpenAlice, through the user's fork of TraderAlice/OpenAlice, which ships a
  UI demo mode.
- The explainer's subject is a motion-craft rule.
- The explainer uses captions and music, with no voice-over.
- The durations are 15 s and 45 s.

## What changes

- `ui-promo/openalice-promo-15s` shows OpenAlice's real interface, captured from its demo mode.
  It is cut with three match cuts, and each cut is carried by one fact: the question, +9.1% and
  AAPL. The case has 11 rules, 5 counter-examples (1 rendered) and 8 reviewed warnings.
- `explainer/carry-the-eye-45s` teaches one rule: give every cut something that carries the eye
  across it. It makes the gaze visible with a marker, labels four kinds of carry, compares the same
  content before and after, and carries its own boundaries. The case has 9 rules, 5
  counter-examples (1 rendered) and 5 reviewed warnings.
- The case contract gains an optional `golden.captures` for a real product's interface. It records
  the capture script, the environment variable, the pinned source (repository, full commit and
  license) and the captured files. Captures are regenerated locally and git-ignored, and a test
  asserts that none are tracked.
- `evals/cases/capture-core.cjs` adds deterministic capture at 2x:
  - frames are stepped on the page's virtual clock, and requestAnimationFrame also runs on that
    clock;
  - input is captured as stop-motion;
  - stills are captured as screenshots;
  - video gets a keyframe every 0.5 s.
- The UI promo exposed a render gate calibration problem, which this change fixes. A step whose
  two neighbours are both under a tenth of it now counts as an instant replacement, even when
  camera moves fill its 2 s window. The UI promo's match cut at 11 s changed 27% of the frame, with
  0.6% and 0.0% on either side, yet the gate reported it missing.

Not in scope:

- The MAD case, which needs licensed footage; the user decides where it comes from.
- Step 7.
