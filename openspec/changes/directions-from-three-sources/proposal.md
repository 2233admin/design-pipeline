# Directions come from three sources and the appearance ledger keeps them from repeating

## Why

Closes #155 and #154. The ui and web direction stage asked the model for two to four candidates of
its own. Left alone the model lands on the same look (warm cream background, serif headline,
terracotta accent), and every project it delivers looks like the last. The owner decided on
2026-10-19 to adopt the design direction library's "directions" method (vendored by #172) for ui and
web: six cards from three sources, a thumbnail board, three full versions, and a user-level ledger
that remembers what was delivered recently.

## What Changes

- ui standard and full open with a playback that restates the need, audience, scene, tone and what
  the owner did not say, and ends with "I'll make several real directions for you to see". Web's
  playback gains the same ending. Neither asks the owner to name a style.
- The ui and web (brief mode, standard and full) direction stage makes six cards in
  `direction-preview.json` `cards`: two best-designer, two same-medium real work captured with
  `composition capture` (or `seen: false` with a reason), and two style-roulette draws by the current
  second from the 84-style catalog (`S % sectionCount + 1` in the medium's section, `S % 12 + 1` in
  east), past the ledger's last three deliveries. `direction draw` prints the draws.
- It then builds `direction-previews/thumbs.html` (six cells, captured to PNG) and three full
  versions `dir-1..3.html` with recorded reasons for four criteria.
- `direction check` is extended, not paralleled: cards with fields and evidence, roulette arithmetic,
  thumbs and capture, exactly three versions and captures, four-axis distinctness, ledger collision,
  and text readability from each capture. Every finding carries a fix.
- The owner ask shows the three captures with card summaries and the thumbnail board; the other three
  are alternates. `decide --by owner` records the exact words, the chosen ids and a `--mix` as
  structured fields; `--taste` statements go to the existing rules, scoped as said.
- `~/.design-pipeline/ledger.json` (`DESIGN_PIPELINE_LEDGER`) records appearance and sources only,
  written at ui `deliver` and review accept and at web `deliver`, read at the direction stage.
- **BREAKING** The web `concepts.html` variants page, the packaged variant switcher
  (`skill/tools/variant-switcher/`), the `?variant=` pick and the `variant-switcher-shipped` build
  finding are deleted. The web pick is `a`, `b` or `c` of the three full versions.
- `quick`, replicate and the narrow-repair waiver keep their behaviour.

## Capabilities

- `design-pipeline`: ADDED playback, three-source directions, thumbnail board, versions, extended
  check, owner pick and appearance ledger requirements.
- `web-workflow`: MODIFIED the concepts requirement; REMOVED the switchable-variants and
  switcher-never-ships requirements.

## Boundaries

Extends `direction-preview.json` (same schema id), `direction check` and the owner ask; adds no gate,
receipt schema, resolver or digest. Capture, readability and ledger measurement reuse
`composition capture` and the Node browser tooling, no Python. The ledger holds no project content.
The gates never claim creative or visual acceptance; only the owner's words select a direction.
Depends on the vendored library at `skill/vendor/design-direction-library/` (#172).
