# Cut sheet (e-conte) for shot-level film storyboards

## Why

Relates to #192. The reference PV (99.9 s, 90 shots) was analysed with `reference analyze-video --shots`
and described by hand, shot by shot: framing, camera move, picture, on-screen text, subtitle, sound,
transition. `design-pipeline.film-storyboard.v1` has nowhere to hold that. Its `beats` are product-promo
units (one `productAction`, one `transformation`, handoff, hold share, cadence), so a 90-cut remake either
fails those rules or is squeezed into a dozen beats that hide every cut. The remake then cannot be compared
with the reference cut by cut, and the gates keep passing on versions the user rejects.

Japanese TV animation already has a working format for this: the cut sheet (e-conte / cut-wari). One row
per cut with cut number, picture, action, dialogue, sound and time in seconds plus frames, camera work in
fixed shorthand (FIX, PAN, TU, TB, FOLLOW) and transitions in fixed shorthand (CT, OL, FI, FO). Adopting its
vocabulary gives agents and reviewers a layout they already know.

## What Changes

- `film-storyboard.v1` accepts an optional `cuts` array beside `beats`. A beat stays the sequence unit;
  a cut is one continuous shot inside one beat. Cut fields: `no`, `startSec`, `endSec`, `size`, `camera`,
  `picture`, `action`, `dialogue`, `text`, `sound`, `transition`, optional `ref` (detected reference shot id)
  and `thumb`. `size`, `camera` and `transition` use closed vocabularies taken from the cut-sheet format.
- `film cut-sheet --project-root <dir>` renders `cuts` as a printable cut sheet in the Japanese column order
  CUT / 画 / アクション / セリフ・文字 / 音 / 秒+コマ, with a thumbnail column when `thumb` is set.
- `film cut-sheet --from-reference <analysis-dir> --project-root <dir>` seeds `cuts` from the detected shots of a
  `--shots` analysis: time range, motion class, sound events, thumbnail and `ref`. Descriptive fields stay empty.
- `film check` validates `cuts` (contiguous, inside their beat, closed vocabularies, described) and, when the board
  names a reference analysis, reports a separate reference-parity section: cut alignment, motion class and sound
  onset timing per cut, plus reference shots with no cut and cuts with no reference shot.

Cut validation extends the existing storyboard gate; parity extends the existing render gate. Neither grants
creative or visual acceptance, and parity is reported apart from structure findings.

## Capabilities

- `design-pipeline`: film storyboard and render gates (existing "film storyboard" requirements), reference
  video analysis output as input.

## Impact

- `skill/scripts/film-core.cjs` (`validateShape`, `checkStoryboard`, cut and parity checks),
  `skill/scripts/cli-core.cjs` (`film cut-sheet`,
  new flags in `KNOWN_OPTIONS`, help), a new `skill/scripts/film-cut-core.cjs` (cut checks, parity, render and seeding),
  `skill/references/film-*.md`, tests, `scripts/test-manifest.json`,
  `skill/references/package-resources.json`.
- Existing boards without `cuts` validate and check exactly as before. No migration.
