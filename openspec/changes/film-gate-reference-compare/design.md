## Context

`reference analyze-video --shots` writes per-shot frames, motion and sound events (reference-shot-segments,
#196). `verify film-render` checks the rendered MP4 against its storyboard. The storyboard `reference`
field is a free-text description and is not machine-checked.

## Decisions

1. Add `referenceAnalysis: {path, sha256}` to the storyboard. The path is project-relative and must point
   at the analysis JSON; the sha256 binds it, so a changed analysis invalidates the comparison.
2. Compare in `verify film-render`, using the same output directory. The comparison writes its own
   section of the evidence report, separate from the existing structural checks.
3. Tolerances are explicit constants in the spec: cut pairing within 1 frame at the render fps; sound-event
   window ±2 frames; per-shot motion reported when the ratio differs by more than 2x. Changing a tolerance
   is an OpenSpec change.
4. Output is structural: `alignment`, `motion`, `sync` findings. The report states "structural difference
   from reference; not a creative or visual acceptance" in every run.

5. Frame pairs use the reference source named in the analysis report and recheck its sha256. Both videos are
   decoded with FFmpeg at the same presentation times and scaled to the render's size; when the aspect
   ratios differ, frame pairs are `unmeasured` with the two sizes, and the other checks still run.
6. Default times: every 0.5 s across the render, plus every render frame from 2 frames before to 2 frames
   after each paired cut. `--start/--end/--fps` replace the grid for one range. A run is capped at 600
   pairs; over the cap the report names the skipped range and the narrower command that covers it.
7. Each pair writes `pairs/t<seconds>.png` (reference left, render right) and a difference image via
   `compareComposition`; `pairs/index.html` shows all pairs in time order with the five largest mean
   differences first. Scores are evidence for ranking only: a correct beat two frames late scores high and
   a shifted shape can score low, so no score threshold exists and frame pairs never change the exit code.

## Risks

- Motion and sound-event matching depends on analysis quality. A reference analysis that is `pending`
  or lacks sound events makes that part `unmeasured`, not passed.
- Generated or photographic references carry blur and noise that a vector rebuild does not, so scores stay
  above zero on correct frames; the report says to open the pairs, not to minimise the number.
- Frame-accurate cut pairing fails on frame-rate mismatch; the comparison resamples both to the render fps
  and records the conversion.
