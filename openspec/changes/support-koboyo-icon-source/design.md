# Design: Koboyo Icon Source Routing

## Decision

`koboyo/icons` is a keyword-activated, reviewed asset source. It is separate from
`shadcn.iconLibraries`, whose values remain official shadcn preset options.

## Routing

Explicit Koboyo, hand-drawn, sketch, or equivalent Chinese icon wording adds
`hand-drawn-icons` and `icon-search` capabilities. The existing `routeTools` function then emits
the Koboyo entry. Requests without those signals do not emit it.

## Trust Boundary

The decision exposes public per-icon SVG and read-only MCP discovery interfaces. MCP search needs a
Koboyo key; header authentication is preferred and keys must not enter URLs or logs. Canvas writes
require separate explicit authority. No upstream runtime or icon corpus is bundled.

## License Boundary

Project use follows the current Koboyo Icons License. Substantial redistribution and competing
icon/canvas/diagram products are excluded. Bulk use requires a fresh license check because the
catalog and license page currently report different library sizes.
