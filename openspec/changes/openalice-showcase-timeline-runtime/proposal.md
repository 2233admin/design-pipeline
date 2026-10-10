# Proposal: OpenAlice Showcase Timeline Runtime

## Why

The OpenAlice showcase needs a valid ordered-list structure and a runtime rail that stays aligned with scene points while preserving the human-gated motion contract. The previous markup placed a non-list element directly inside `ol.scenes`, and the implementation notes no longer described the governed SVG path mechanism.

## What Changes

- Wrap the rail and ordered list in a positioned `.timeline` container so every direct child of `ol.scenes` is an `li`.
- Measure rail geometry in the timeline coordinate basis and render `reveal.trim-line` with SVG stroke-dashoffset progress.
- Preserve passed-scene latching, keyboard approval/rejection, and the reduced-motion substitute.
- Re-record the 1440×900 smooth-scroll capture from a fresh no-preference browser state.

## Non-Goals

- No new dependency, component system, or parallel gate.
- No change to product copy or approval semantics.
