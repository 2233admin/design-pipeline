## Why

`verify film-render` and `film check` pass when the film is structurally valid, even when it is far from
the reference it was meant to follow. On KATANA PV, versions the owner rejected all exited 0: the
segment order was wrong, the shot count was a third of the reference's, and animation did not line up with
the reference's sound events. No gate compares the output with the reference. For tributes and remakes,
"like the reference" is the acceptance subject, so a green gate lets the agent believe the work is done.
Tracked in 2233admin/design-pipeline#193; depends on the per-shot reference analysis (`reference
analyze-video --shots`, #196).

## What Changes

- Extend `verify film-render` (no new gate) with an optional reference comparison. A storyboard that
  declares `referenceAnalysis` (`{path, sha256}` pointing at the `--shots` analysis of the reference)
  turns the comparison on.
- The comparison reports three things, each as a finding with a `fix`:
  - cut alignment: rendered cuts paired with reference cuts, with offset in frames, plus missing and extra cuts;
  - per-shot motion: rendered and reference pixel change per shot, listing shots whose difference is largest;
  - sound-event sync: each reference sound event checked against a rendered visual change (brightness step,
    cut, or motion peak) within a tolerance window;
  - frame pairs: the rendered frame and the reference frame at the same time, side by side, on a fixed grid
    and at every frame around each paired cut, with a difference score per time and the worst times
    listed first. The scores rank where to look; they never pass or fail the gate.
- `--start`, `--end` and `--fps` narrow the frame pairs to one range at a finer step (for example one
  transition at the render frame rate) without changing the other three checks.
- The result states structural difference from the reference. It claims no creative or visual acceptance.
- Without `referenceAnalysis`, the gate behaves exactly as today.

Frame pairs follow the verification loop of lovisdotio/motion2code (MIT): agents cannot watch a video, so
every moment of a rebuild needs an image pair to look at. Concept only; no upstream script is vendored.

## Capabilities

- `design-pipeline`: ADDED `Film render is compared with a declared reference`, `Reference comparison
  reports structure without claiming acceptance`.

## Reuse

- `verify film-render`, its evidence directory and receipt lineage.
- The `--shots` analysis from `reference-video-core.cjs` (per-shot motion, sound events, cut times).
- `film check`'s storyboard validation for the new field.
- The reference source bound by the analysis report (`source.path`, `source.sha256`) for frame pairs; no
  second source field in the storyboard.
- `compareComposition` from `skill/tools/visual-diagnostics/diagnostics.cjs` for each pair's difference
  image and scores; FFmpeg decodes both videos at the same times.

## Impact

- New optional field in `storyboard.json`; existing storyboards are unaffected.
- A hash mismatch on `referenceAnalysis` fails the gate; it does not fall back to an unchecked comparison.
