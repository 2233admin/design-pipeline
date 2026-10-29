## Why

Two MIT design skills are the reference projects for this pipeline: `joeseesun/qiaomu-design` and
`alchaincyf/huashu-design`. Part of each is already internalized: CJK typography, direction preview and
plain-language contracts from qiaomu; the design direction library, Art Motion and the vendored upstream from
huashu. Several parts have no counterpart in this repository: qiaomu's craft loop, creative prompting and
style fitting room; huashu's five-dimension expert review, tweaks system, editable PPTX export and
sound-effect library. Without a change record these features stay outside the pipeline and get re-derived
case by case.

## What Changes

- Record a gap matrix (design.md) that maps every feature of both projects to one of: already internalized
  (with its file), to be internalized (with its target tier), or deliberately not internalized (with reason).
- Internalize the gap items in tiers. Each item is adopted as concepts with `codeCopied: false`, unless the
  owner approves copying specific text under MIT with attribution in `THIRD_PARTY_NOTICES.md`.
- Not internalized: the 58-site design-system library and the showcase images (already excluded by the
  existing qiaomu notice; large binaries); audio under `assets/sfx` and `assets/bgm` (licence unverified);
  personal assets, avatars and QR codes.

## Capabilities

- `design-pipeline`: ADDED `Reference projects are internalized by a recorded gap matrix`, `Internalized
  reference features keep provenance`.

## Reuse

- The existing `direction`, `ledger`, `anti-slop-review`, `critique`, `reference` and `film` gates.
- `skill/vendor/` for source bundles and `THIRD_PARTY_NOTICES.md` for attribution.

## Impact

- Records the plan only; no behaviour change in this change. Each tier that changes behaviour gets its own
  implementation change, as AGENTS.md requires.
