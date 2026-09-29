# Design

## Findings

- `cue-unbound` (warn): a cue of kind `downbeat`, `accent`, `impact` or `riser` that no beat lists
  in `soundCues`. `entry`, `exit`, `voiceover` and `silence` are exempt: they mark the score's
  edges, speech and rests rather than hits the picture must answer. Applies to every sound mode.

- `cue-outside-beat` (warn): a bound cue whose `atSec` lies outside `[startSec, endSec]` of every
  storyboard beat that lists it, with the existing 0.05 s frame tolerance. A cue shared by several
  beats is fine when it lies inside any one of them. The finding names the first binding beat.

"Beat" in `cue-outside-beat` is the storyboard beat: a scene window, not a BPM beat. The check is
timeline consistency between the cue list and the storyboard; it does not forbid syncopation,
anticipation or lag against the music's grid, since a cue may lead or trail the grid and still sit
inside its scene.

Both use `withFix` hints. There is no schema change and no new gate; they are additional
storyboard findings.

## What is deliberately not gated

Alignment to the music's beat grid. It is aesthetics, not conformance: a visual-acceptance item
and an optional policy documented in `film-score.md` (tight grid alignment is already available
through `score-grid.json`: `cut-off-grid`, `cue-off-grid`). A cue after `durationSec` already
fails as `cue-outside-film`. The storyboard has no soundtrack-duration or section field, so no
further bound (`cue-outside-sound`) is checked without a schema change; none was added.

## Severity

The storyboard gate had no severity: any finding failed it. The timeline and render gates already
grade findings `error` (default) or `warn`, and fail only on a non-warn finding. The storyboard
status now uses the same expression. Existing storyboard findings carry no severity and stay
errors, so their behavior is unchanged; only the two new findings carry `severity: "warn"`.
`film-eval-core` already excluded warnings from the storyboard score.

Warnings, not errors, because a cue list often leads the storyboard while it is drafted and a hit
that is deliberately left to the audio alone is a creative choice the gate cannot judge.

## Song map and vocabulary

`sound.md` scaffolds a table: beat id, window (s), bars, music event, motion response. The
vocabulary lives in `references/film-score.md` and `references/product-film-direction.md`:
downbeat/impact -> hard cut or match-cut plus `flash`/`zoom-punch` (the existing edit fx);
riser -> shorten and accelerate; break/silence -> hold; accent -> a one-frame tick.
`workflow-film.md` cross-references it.

## Shipped examples

`storyboard.example.json` and `evals/film/slideshow.storyboard.json` already bind every cue inside
its beat window; a test pins that they raise no `cue-*` finding.
