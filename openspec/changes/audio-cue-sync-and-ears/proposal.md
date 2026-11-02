# Time hit cues in the delivered mix, and give agents ears

## Why

Closes #233. The audio gate measures delivery but never checks that a storyboard's `impact`,
`accent` and `downbeat` cues have a sound on their frame in the delivered mix: `film score`'s
`cue-off-grid` reads the score's own pattern, and `film check`'s `cuts-off-beat` covers cuts only.
A hit 60 ms late, or buried under the music, passes. Nothing tells an agent that it cannot hear,
and there is no route for effects in a code-made film or for a listening review.

[earshot](https://github.com/Leonxlnx/earshot) (MIT) already answers these on its side: sync per cue
as sound minus picture with a chance baseline, a bank of effects made in code rendered as a kit with
measured onsets, and a skill that forbids describing audio without a reading.

## What Changes

- `verify audio` (and `film check`, which runs it) times every `impact`, `accent` and `downbeat`
  cue against onsets measured in the file. New findings: `impact-unsounded` (error), `cue-unsounded`
  and `cue-off-frame` (warn), `sync-at-chance` (warn, three or more hit cues and chance >= 0.5).
  New metric `cueSync`: counts, chance, onsets, fps and one row per cue with its offset.
- earshot's `earshot` and `real-sound` skills become the optional "Listening and film sound"
  companion group, so `doctor` lists them with an install line and a fallback.
- `audio-gate.md` gains "Hit cues", "You cannot hear" and the earshot route; `workflow-film.md`,
  `companion-skills.md` and `SKILL.md` point to them.

## Capabilities

- `product-film`: MODIFIED the audio delivery gate; ADDED listening is evidence, not acceptance.

## Boundaries

No new gate, receipt schema, command or flag: the `design-pipeline.audio-check.v1` result gains
findings and a metric. earshot is not bundled, installed or run by the pipeline.
