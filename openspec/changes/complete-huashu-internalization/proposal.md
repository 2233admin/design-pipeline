Status and authorization: [README](README.md).

## Why

The current skill exposes only basic strokes/text/images as maintained Canvas tools. Its
Huashu index tells users to adapt most advanced modules, and omits style cards, sample scenes,
transitions and audio methods from the installed capability path. This does not meet the
user's request to internalize the whole source skill.

## What changes

- Preserve the complete reviewed upstream source and licenses with exact byte provenance.
- Provide isolated, caller-configured drawing/motion tools and optional style/grammar examples.
- Provide callable asset preparation and audio capability through existing or adapted helpers.
- Route the full method set through a short tools entry, with rendered examples and explicit
  compatibility/asset requirements. Reuse existing comparison, video analysis, render and QA.
- Test actual behavior and installed package reachability; report unresolved visual limits.

## Capabilities

### Modified capabilities

- `design-pipeline`: reusable drawing/animation tools and progressive source-method access.

## Impact

Changes stay in `skill/tools`, `skill/vendor`, focused references, maintenance scripts/tests
and this OpenSpec change. No parallel renderer policy, gate, receipt schema or global dependency
installation. The root visual `DESIGN.md` remains a visual-system document.
