## Gap matrix

Status checked against this repository on main, 2026-10-30.

| Source feature | Source file | Status here | Action |
| --- | --- | --- | --- |
| CJK typography rules | qiaomu `references/chinese-typography.md` | internalized (`references/cjk-typography.md`) | none |
| Visual direction preview | qiaomu, huashu `references/directions.md` | internalized (`direction-preview.md`, `design-direction-library.md`) | none |
| Plain-language contracts | qiaomu | internalized (THIRD_PARTY_NOTICES) | none |
| Design direction library | huashu `assets/`, `references/` | internalized (`skill/vendor/design-direction-library`) | none |
| Art Motion (adapted) | huashu | internalized (THIRD_PARTY_NOTICES) | none |
| Experience, evolution, appearance ledger | huashu `references/experience.md`, `evolution.md` | partly (`ledger`) | confirm coverage in tier 2 |
| Five-dimension expert review | huashu `references/critique-guide.md` | no counterpart | tier 1 |
| Craft loop | qiaomu `references/craft-loop.md` | no counterpart | tier 1 |
| Creative prompting | qiaomu `references/creative-prompting.md` | no counterpart | tier 1 |
| Animation vocabulary | qiaomu `references/animation-vocabulary.md` | partly (`animation-opportunity-and-review.md`) | tier 1, merge |
| Tweaks system (live variants) | huashu `references/tweaks-system.md` | no counterpart | tier 2 |
| Editable PPTX export | huashu `references/editable-pptx.md`, `pptx-from-rendered-html.md` | no counterpart | tier 2 |
| Brand asset protocol | huashu `references/brand-asset-protocol.md` | partly (`brand-facts.md`) | tier 2, merge |
| Style fitting room | qiaomu README (风格试衣间) | no counterpart | tier 3 |
| Multi-perspective parallel case | huashu `references/multi-perspective-parallel-case-study.md` | no counterpart | tier 3, case study only |
| Sound-effect library | huashu `references/sfx-library.md`, `assets/sfx` | no counterpart | deferred: audio licence unverified |
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

## Open questions for the owner

- Should tier 1 land before tier 2, or are the PPTX export and tweaks more urgent for current work?
- Adopt Carbon data-visualization guidance, or leave it out?
