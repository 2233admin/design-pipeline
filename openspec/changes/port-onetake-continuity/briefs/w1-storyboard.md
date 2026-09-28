# w1: storyboard carrier, cadence and rest

Read `_common.md` first.

## Goal

The storyboard gate (`checkStoryboard` in `skill/scripts/film-core.cjs`) learns three ideas:

1. A carried boundary names its carrier. For a beat whose `handoff` is `continuation`, `morph`,
   `camera-carry` or `match-cut`, a new beat field `carrier` (string) is required by the gate:
   what survives the boundary and what it becomes, for example "the prompt bar opens into the app
   window". Missing, empty or placeholder (reuse the existing `PLACEHOLDER` regex) gives the error
   finding `carrier-unnamed` with the beat id.
2. Rhythm: `uniform-cadence` (error) when the board has at least 4 beats and the longest beat
   length divided by the shortest is below 3. Report `cadenceRatio` (2 decimals) in `metrics`.
3. Rest: new optional beat field `holdSec` (number, greater than 0 and at most the beat's length;
   otherwise a contract failure like other field errors). `no-rest` (error) when
   `durationSec >= 8` and no beat has role `title-hold` or `brand-hold` and no beat has
   `holdSec >= 0.3`. Report `restSec` (sum of hold-role beat lengths plus all `holdSec`) in
   `metrics`.

Add both fields to the allowed-keys list in the beat validation.

## Must not break

- `skill/references/film-choreography/storyboard.example.json` and the storyboard written by
  `film scaffold` (`skill/scripts/film-project-core.cjs`) must pass the new rules: add carriers,
  a rest, and uneven beat lengths that still make sense for the example film.
- Edits: `skill/scripts/edit-project-core.cjs` derives a storyboard from an edit for the render,
  audio and composition gates. Check whether the new rules fire on derived storyboards. Edits have
  their own rhythm checks (`monotone-rhythm` and others), so the three new storyboard rules must
  not fail a film-edit check. If needed, add a `checkStoryboard` option (for example
  `{ filmRhythm: false }`) that the edit path passes, and test it.
- Existing tests that build storyboards (search `tests/` for `handoff`) may need fixture updates.
  Update fixtures; do not weaken assertions.

## Tests

In `tests/film-gates.test.cjs` (or a new manifest-listed file): one failing and one passing case
for each of `carrier-unnamed`, `uniform-cadence` and `no-rest`; `holdSec` out of range is
rejected; metrics `cadenceRatio` and `restSec` are reported; each new finding has a `fix`.

## Files

`skill/scripts/film-core.cjs` (storyboard section only), `skill/scripts/film-hints.cjs`
(storyboard hints only), `skill/references/film-choreography/storyboard.example.json`,
`skill/scripts/film-project-core.cjs` (scaffold storyboard only),
`skill/scripts/edit-project-core.cjs` (only if needed), tests, CHANGELOG.

Branch: `onetake-w1-storyboard`.
