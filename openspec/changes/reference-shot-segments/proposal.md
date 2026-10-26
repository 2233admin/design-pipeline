# Reference video analysis segments by detected shot

## Why

Relates to #192. While remaking a 99.8 s reference PV shot for shot, `reference analyze-video --study`
found 93 candidate cuts but still split the source into 50 fixed 2 s windows and sampled 160 frames
(`budgetLimited: true`, 100 limitation lines). Most of the 90 real shots got fewer than two frames, a
window often mixed several shots, and the fixed 0.3 scene threshold missed soft cuts and flashes. The
audio study described the whole source, so "a scream lands 0.24 s into this shot" was not available.
The agent misread the reference structure for four rounds until the shots were cut and sound-timed by
hand; every gate still passed.

## What Changes

- `reference analyze-video --shots` segments the sampled interval by detected shots instead of 2 s
  windows. `--cut-threshold` (default 0.18 with `--shots`, 0.3 otherwise) and `--min-shot` (default
  0.25 s) tune the detection; cuts closer than the minimum merge into the earlier shot.
- Shot mode spends the frame budget per shot first: every shot gets its first, middle and last decoded
  frame, middles first when the budget is short. A shot that cannot get three distinct frames is named
  in `sampling.limitations`, with the rerun that would cover it.
- Each shot segment carries `reason: "detected-shot"`, its pixel-change summary (`motion.meanShare`,
  `motion.peakShare`) and, when the source has sound, the energy-flux onsets (`soundEvents` with a
  relative strength) and silences inside it.
- The overview page shows every shot's middle frame labelled with its id and time range, so the whole
  breakdown can be read at once; each shot keeps its own viewer and motion map.
- Without `--shots` the analyzer output is unchanged.

Detected shots stay inspection candidates. They do not fill `report.shots`, which remains the confirmed
production inventory, and they grant no semantic or creative acceptance.

## Capabilities

- `design-pipeline`: reference video analysis (existing requirements "Locally distributed video
  inspection candidates" and "Visual differences are observable evidence").

## Impact

- `skill/scripts/reference-video-core.cjs` (segmentation, budget, report fields and validation),
  `skill/scripts/film-core.cjs` (onset strength and silences from the existing onset decoder),
  `skill/scripts/cli-core.cjs` (flags and help), docs for the reference stage, tests.
- Report shape: optional `sampling.segmentation`, `sampling.cutThreshold`, `sampling.minShotSec`;
  `sampling.windowSec` is null in shot mode; optional segment fields `motion`, `soundEvents`,
  `silences`. Existing reports validate unchanged.
