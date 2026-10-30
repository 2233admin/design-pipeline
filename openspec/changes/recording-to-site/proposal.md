## Why

Relates to #215 (motion2code internalization, phase 3). Video models produce convincing screen recordings of
sites and apps, and owners bring them as references. Web and ui replicate mode already accept a video reference
with a full analysis, but nothing turns what the recording does into what the site must do: the fake cursor's
clicks, the auto-scroll and the scripted state changes are behaviours to rebuild as real controls, and today an
agent can deliver a page that looks like the recording, plays it back on load, and has no working control.
lovisdotio/motion2code (MIT, `0f00328`) separates the replay from the real site and maps each recorded behaviour
to a real control; this change does the same inside our existing reference and interaction-state gates.

## What Changes

- Web or ui replicate with a `video` reference: `reference.md` SHALL contain a `## Recorded behaviours` table, one
  row per observed behaviour: `id` (`rb-1`…), `time`, what changes on screen, the real control that produces it
  (role and element), and its keyboard path. The extract step blocks with `recorded-behaviours-missing` when the
  table is absent or empty; a row without a control or keyboard path is listed with its fix.
- The interaction-state coverage gate accepts the recorded ids: each matrix entry may name
  `recordedBehaviour: "rb-n"`; at delivery every id in the table must be named by an entry that passes coverage,
  else `RECORDED_BEHAVIOUR_UNCOVERED`. Ids no row declares are `RECORDED_BEHAVIOUR_UNKNOWN`.
- New `references/recording-to-site.md` (our words): recorded behaviour to real control (scroll reveal, pinned
  scrub, menu, toggle, slider, tabs, counter, card flip, ambient loop), simulated input is never shipped (no fake
  cursor, no autoplayed sequence), words come from the brief not the recording, reduced motion, phone and desktop.
- No new gate: one optional matrix field and one optional coverage input; projects without a video reference are
  unchanged.

## Capabilities

- `web-workflow`: ADDED `A recorded interface reference becomes real controls`.

## Reuse

- Replicate extract step and `reference-evidence` video analysis (`replicate.cjs`, `reference-evidence-core.cjs`).
- `checkInteractionStateCoverage` in `gate-core.cjs`; the ui flow (`ui-multi-screen-flow`) for multi-screen
  recordings.

## Impact

- `workflows/replicate.cjs` (table parse, blocker), `gate-core.cjs` (optional recorded ids), the delivery call
  sites that run coverage, `references/recording-to-site.md` (registered in `package-resources.json` and the tool
  index), `references/workflow-web.md`, CHANGELOG, `THIRD_PARTY_NOTICES.md`, tests in `scripts/test-manifest.json`.
