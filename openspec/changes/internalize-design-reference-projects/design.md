## Gap matrix

Status checked against this repository on main, 2026-10-30.

| Source feature | Source file | Status here | Action |
| --- | --- | --- | --- |
| CJK typography rules | qiaomu `references/chinese-typography.md` | internalized (`references/cjk-typography.md`) | none |
| Visual direction preview | qiaomu, second reference project `references/directions.md` | internalized (`direction-preview.md`, `design-direction-library.md`) | none |
| Plain-language contracts | qiaomu | internalized (THIRD_PARTY_NOTICES) | none |
| Design direction library | second reference project `assets/`, `references/` | internalized (`skill/vendor/design-direction-library`) | none |
| Art Motion (adapted) | second reference project | internalized (THIRD_PARTY_NOTICES) | none |
| Experience, evolution, appearance ledger | second reference project `references/experience.md`, `evolution.md` | partly (`ledger`) | confirm coverage in tier 2 |
| Five-dimension expert review | second reference project `references/critique-guide.md` | internalized tier 1 (`references/design-review-dimensions.md`) | done |
| Craft loop | qiaomu `references/craft-loop.md` | internalized tier 1 (`references/craft-density-and-review-loop.md`) | done |
| Creative prompting | qiaomu `references/creative-prompting.md` | internalized tier 1 (`references/creative-prompting.md`) | done |
| Animation vocabulary | qiaomu `references/animation-vocabulary.md` (from Emil Kowalski) | already routed as companion capability `animation-vocabulary` (`capability-routing.md`); no new file | none; dropped from tier 1 |
| Tweaks system (live variants) | second reference project `references/tweaks-system.md` | no counterpart | tier 2 |
| Editable PPTX export | second reference project `references/editable-pptx.md`, `pptx-from-rendered-html.md` | no counterpart | tier 2 |
| Brand asset protocol | second reference project `references/brand-asset-protocol.md` | partly (`brand-facts.md`) | tier 2, merge |
| Style fitting room | qiaomu README (风格试衣间) | no counterpart | tier 3 |
| Multi-perspective parallel case | second reference project `references/multi-perspective-parallel-case-study.md` | no counterpart | tier 3, case study only |
| Sound-effect library | second reference project `references/sfx-library.md`, `assets/sfx` | no counterpart | deferred: audio licence unverified |
| Carbon components and data viz | qiaomu `references/carbon-*.md` | no counterpart | open: confirm Carbon licence before adoption |
| 58 design systems | qiaomu `references/design-systems/` | excluded (existing notice) | not internalized |
| Showcase images, avatars, QR codes, demo videos | both repositories | excluded | not internalized |

## Decisions

1. Tiers. Tier 1 feeds review and creation: craft loop, five-dimension review, creative prompting, animation
   vocabulary merge. Tier 2 adds tools: tweaks, editable PPTX, brand-asset merge. Tier 3 is optional.
2. Provenance. Every adopted feature records `source`, `licence: MIT`, `codeCopied`, and the adopted and
   rejected parts, as the existing `Motion references preserve clean-room provenance` requirement demands.
3. Attribution. A section per project goes into `THIRD_PARTY_NOTICES.md` when that project's first tier lands;
   the MIT text is kept verbatim.
4. Audio. Sound-effect and background-music files are not copied until their licence is verified.
5. Carbon. Carbon text or components are not adopted until the licence is checked against the current
   upstream licence file.

## Owner answers

- Tier 1 lands before tier 2. Tier 1 is method text with low risk; tier 2 changes tools.
- Carbon is not adopted. Its licence is unverified and qiaomu's `carbon-*` files are its own digest, not
  Carbon text. Revisit only as a separate change after the upstream licence is checked.
- Owner direction: bring over the reference projects' templates and features in layers.
