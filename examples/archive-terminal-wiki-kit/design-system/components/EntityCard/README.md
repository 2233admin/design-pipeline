# EntityCard

The entity card: a portrait or arms art slot, a tri-colour mini strip, the 中文 name over a `// ENGLISH` line, a type glyph, rarity stars and tags, and a base line in the rarity colour.

## Provide

Name pair, rarity 1–6 (`data-rarity`), up to two tags, an optional UP or NEW flag, the art (or its task id) and a link.

## Use

Rosters, arms lists, recommendations and search grids.

## States

- Rarity sets `--rarity`: the 3px base line and the stars take `rarity-1` … `rarity-6`; the star count always states the rarity in words for assistive tech.
- Hover lifts 3px with `shadow-toast`; focus-visible shows the `focus-ring`.
- Flags: UP in `accent`, NEW in `inverse`.
- Showcase mode: the slot stays an empty frame with its size label; no character art ships with the kit.

## Don't

- Do not use rarity colour as the only cue: keep the stars.
- Do not crop faces in the slot: art is briefed with a safe area (see `art-tasks/`).
