# The appearance ledger records a look signature, shown at direction choice as advice

## Why

Closes #247. The appearance ledger (`~/.design-pipeline/ledger.json`, change
`directions-from-three-sources`) remembers what delivered pages looked like, but in coarse terms: a
palette family (`dark:red`), font names and a layout skeleton string. When the owner picks a direction
they never see it; it only feeds blocking collision checks. A person recognises "the same look again"
by five things: the accent colour, the display and body fonts, light or dark, and how the hero is laid
out. The open-design-agent-kit's `workspace/designHistory.ts` (MIT, reviewed read-only) keeps exactly
that signature for recent designs and puts it in front of the next brief as "recent designs". We adopt
the idea, measured from the delivered page's computed styles rather than its source text.

## What Changes

- The ledger entry's `appearance` gains `signature`: `accent` (hex or null), `displayFont`,
  `bodyFont`, `theme` (`light|dark`) and `hero` (`centred|split|full-bleed-image|left|right|none`,
  or `unmeasured` without a browser). It is measured at delivery from the same `composition capture`
  elements.json the ledger already reads; with no browser it falls back to the CSS accent token and
  the existing source measurement.
- `composition capture`'s elements.json gains fields, not items: text items carry `align` and their own
  opaque `fill`; a top-level `media` list holds the boxes of images, video, canvas, svg, iframes and
  url() backgrounds. Existing consumers read `items` and are unaffected.
- The direction stage shows the last five signatures of other projects, newest first, as
  `recentLooks` ("you used these recently") on the `run` action that makes the directions and on the
  owner's ask, where each version also carries its own measured `look` and the parts it
  `repeatsRecent`. It is information only: no finding, no blocker, no reordering.

## Capabilities

- `design-pipeline`: the appearance ledger and the direction stage (existing; extended).

## Reuse

The existing ledger file, schema id, `readLedger`/`recordEntry`, delivery hooks, `composition capture`
and the shared directions workflow are extended in place. No new file, gate, receipt, command or flag.
