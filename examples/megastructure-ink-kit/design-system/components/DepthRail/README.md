# DepthRail

A 72px ruler fixed to the right edge: an 8px minor tick, a 64px major tick and one entry per section with its depth.

## Provide

The same nav list as the top bar; the current section id (kept in sync by `kit.js`).

## Use

On long one-page sites only, next to the top bar; hidden under 760px.

## States

- Hover: the label turns `text`.
- Current: depth and label in `signal` with a 6px `signal` triangle pointing in.
- Focus-visible: the ring around the entry.

## Don't

- Do not put more than eight entries on it.
- Do not colour the ticks: they are `rule` and `rule-strong`.
