## Context

`film-core.cjs` validates `storyboard.json`; `sound.cues[]` already allows kind `voiceover`, and
beats bind cues through `soundCues`. Render evidence measures energy-flux onsets and silences, but
nothing produces voiceover cue times or checks beats against them. The reference method (narration
first, find the pauses with ffmpeg, cut picture to the words) is adopted as an idea only; no code is
copied.

## Decisions

1. **Measure with `silencedetect`, two passes.** `volumedetect` reads the take's peak; the silence
   threshold is the peak minus 35 dB, clamped to -70..-25 dBFS, so a hot take, a quiet take (-24 dB)
   and a take with a pink-noise floor about 45 dB down split alike (tested). A peak under -60 dBFS is
   `NARRATION_SILENT`. Minimum pause 0.05 s: the word gaps flite produces measured 0.05-0.07 s.
   Speech shorter than 0.06 s between pauses (a click, a breath) folds into the silence.
2. **Phrases from pauses, not a model.** Default: every pause of at least 0.25 s ends a phrase (read
   narration pauses 0.3 s or more between sentences). With `--script` (one spoken line per line) the
   N-1 longest pauses end phrases, ties to the earlier pause, and each phrase gets its line as the
   cue note; fewer pauses than lines is `PHRASES_UNMATCHED` with a re-record/join fix. When the
   weakest chosen break is under 1.5x the longest pause kept inside a line, a
   `voiceover-boundary-ambiguous` warning names both lengths. Flite sentence pauses are only
   0.14-0.19 s, which is why the script path exists rather than lowering the default.
3. **Word boundaries are honest.** The pauses inside a phrase are reported as
   `wordBoundariesSec`: where the speaker paused, not every word. True word timing needs a
   recognizer, which this change deliberately does not add. Beats bind phrases, not words.
4. **Extend the cue, do not add a schema.** Phrase cues are ordinary `voiceover` cues with an
   optional `endSec`; `endSec` is accepted only on `voiceover` and `silence` (kinds that last).
   Cue ids are `vo-01`...; a re-measure replaces only `voiceover` cues with the `vo-` prefix and keeps
   every other cue and every binding. If a bound `vo-` id disappears, nothing is written and the
   result fails `voiceover-binding-broken` naming it.
5. **Lineage.** `sound.narration = { file, sha256, startSec, minPauseSec | phrases }`. The take must
   live inside the project (`PATH_ESCAPE` otherwise) so its path is stable. `narrationFiles(board)`
   joins `filmEvidenceInputs`, so `verify film-storyboard` and `film check` record it as a gate input
   and a changed take reopens them; with a project root the storyboard gate also compares the hash and
   fails `voiceover-stale` / `voiceover-narration-missing`. The gate never runs ffmpeg itself.
6. **"Lands on its phrase".** The picture may lead the words anywhere inside the beat; the voice may
   lead the picture by at most 0.1 s (`VOICE_LEAD_SEC`, three frames at 30 fps, the render sync
   tolerance). A bound phrase starting earlier than that, or at/after the beat's end, fails. When the
   phrase has `endSec`, beat and phrase must share at least half of the shorter span, so a beat that
   only clips the first 0.2 s of a 1.9 s phrase fails. `voiceover-unbound` (no beat binds any phrase
   of a narrated film) is a review warning, like `sound-unbound`.
7. **Placement offset.** `--start` is the film time where the take begins; cue times are film times.
   A phrase ending after `durationSec` is `voiceover-past-end` in the command result and
   `cue-outside-film` in the gate.

## File ownership

- New: `skill/scripts/voiceover-core.cjs` (listed in `package-resources.json`),
  `tests/film-voiceover.test.cjs` (in `scripts/test-manifest.json`).
- Changed: `film-core.cjs` (shape, `voiceoverChecks`, `narrationFiles`), `film-hints.cjs`,
  `cli-core.cjs` (`film voiceover`, two flags, evidence inputs), `references/workflow-film.md`.
- Not changed: `audio-core.cjs` (open PR #234).

## Compatibility

Additive: storyboards without `endSec` or `narration` validate and score exactly as before. No
migration. The render gate is unchanged; it does not yet confirm the narration's placement in the
mixed render.
