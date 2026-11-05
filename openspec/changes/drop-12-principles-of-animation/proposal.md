# Drop the 12-principles-of-animation bundle

## Why

Upstream `raphaelsalaja/skill` deleted `skills/12-principles-of-animation` (moved to an archive in
`abe2788`, removed in `18f99b7`) with no successor; its new `motion` skill overlaps only timing,
easing and springs. `npm run sources:update` therefore cannot refresh the bundle, and
`sources.lock.json` held it at `dc9eef2` (#264). A frozen copy contradicts the track-latest policy,
and nine of its 14 rules are already covered by `emil-design-eng`, `make-interfaces-feel-better`,
the motion gate (`animation-opportunity-and-review.md`), `ui-transition-rules.md` and
`animation-thinking.md`; the other five are kept in our own words.

## What Changes

- Remove `skill/vendor/12-principles-of-animation/`, its importer record, lock entry (and its
  `held`), catalog doc entry, package resources, notice, `.gitattributes` and vendor index rows.
- `ui-craft-sources.md`: drop key `12P`, the checklist precedence level and its section; UC-02 and
  UC-03 cite existing coverage (UC-02 reworded to what `animation-thinking.md` says); the five
  uncovered rules become UC-25 to UC-29 (context-menu entrance, exponential decay, subtle
  deformation, and the layout rules dim background and z-index layering); the exit-easing and
  stagger conflict lines keep their outcome without the dropped source.
- Route docs (`feature-routes.md`, `pipeline-reference.md`, `capability-routing.md`,
  `docs/features.md`) stop naming it; motion-principle review points at `emil-design-eng` and the
  motion gate.
- The importer loses its frontmatter-only license path, which only this bundle used.

## Capabilities

### Modified Capabilities

- `design-pipeline`: Bundled UI craft sources lists five bundles.

## Impact

No CLI, gate, receipt or schema change. Five UI craft bundles remain; the held list shrinks to
HyperFrames runtime (#262) and Astryx (#263).
