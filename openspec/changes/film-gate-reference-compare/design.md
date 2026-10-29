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

## Risks

- Motion and sound-event matching depends on analysis quality. A reference analysis that is `pending`
  or lacks sound events makes that part `unmeasured`, not passed.
- Frame-accurate cut pairing fails on frame-rate mismatch; the comparison resamples both to the render fps
  and records the conversion.
