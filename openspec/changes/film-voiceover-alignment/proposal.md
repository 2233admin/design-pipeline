## Why

A narrated film is timed to its voice: the narration is recorded first and the picture is cut to
the words (the method distilled from baoyu-design's motion-director voice guide, MIT part, #246).
The storyboard already has a `voiceover` cue kind, but nothing measures where the spoken phrases
are, so voiceover cue times are guesses, and no check notices when a beat that should show what a
phrase says starts a second after the words or ends before them. When the take is re-recorded the
old guesses stay in the storyboard and nothing reopens.

## What Changes

- `film voiceover --project-root <dir> --audio <take> [--script lines.txt] [--start sec]
  [--min-pause 0.25] [--write]` measures the take's phrases with ffmpeg `silencedetect`
  (threshold relative to the take's own peak; deterministic, no speech model). Without a script,
  every pause of at least `--min-pause` ends a phrase; with a script of N lines, the N-1 longest
  pauses do and each phrase carries its line. Pauses inside a phrase are reported as candidate word
  boundaries. With `--write` the phrases become `vo-NN` `voiceover` cues (with `endSec`) and the
  take's path, SHA-256 and settings are recorded in `sound.narration`.
- The storyboard contract gains optional `sound.cues[].endSec` (only on `voiceover` and `silence`
  cues, after `atSec`) and optional `sound.narration`.
- The storyboard gate fails `voiceover-off-phrase` when a beat binds a voiceover cue whose phrase
  starts more than 0.1 s before the beat or after it ends, or shares less than half of the shorter
  of the two spans with the beat; fails `voiceover-stale` / `voiceover-narration-missing` when the
  recorded take changed or is gone; warns `voiceover-unbound` when a narrated film binds no phrase.
  `cue-outside-film` also covers a cue's `endSec`. Each finding carries a fix.
- The narration take is a checked gate input (like the product-source files), so changing it reopens
  the storyboard and film gates.

## Capabilities

- `product-film`: ADDED `narration phrase cues`; ADDED `beats land on their phrase`.

## Reuse

- `voiceover` cue kind, `beats[].soundCues`, `checkStoryboard`, `withFix` hints, `cue-outside-film`.
- `run`/ffmpeg invocation and `TOOL_MISSING` hint from `film-core.cjs`; `resolveInside`, `sha256`.
- `filmEvidenceInputs` and `workflow.recordGate` input hashing for invalidation (no new receipt).
- `film score`'s shape (measure, optionally `--write` into storyboard.json, report alignment).

## Impact

- Existing storyboards are unchanged and still valid. A storyboard that binds voiceover cues with
  hand-guessed times may now fail `voiceover-off-phrase`.
- New file `skill/scripts/voiceover-core.cjs`; flags `--min-pause`, `--script`.
- `audio-core.cjs` is not touched.
