---
sourceMeta:
  id: ibelick-ui-skills-rules
  kind: github
  url: https://github.com/ibelick/ui-skills/tree/73fb128d046d1f0d74c2909cd26eb616e3415567
  reviewedRevision: 73fb128d046d1f0d74c2909cd26eb616e3415567
  reviewedContentHash: d74377eed8c3234594d7236d216aeba4f7bb01dcbdd22139f2b69d094b5578bb
  contentHashScope: ordered UTF-8 sourceFiles with path-and-newline separators
  sourceFiles: skills/baseline-ui/SKILL.md, skills/fixing-metadata/SKILL.md, skills/fixing-motion-performance/SKILL.md
  reviewedAt: 2026-11-11T00:00:00.000Z
  freshnessDays: 365
  license: MIT
  useBoundary: reference-only; rules are held as this project's own audit codes, review rows and guides; do not install or execute the upstream skills
---

# ibelick/ui-skills rule lists (reference only)

Three rule lists from Julien Thibeaut's `ui-skills` are compared with this project's rules:
`baseline-ui` (a UI baseline against generic output), `fixing-metadata` (page titles, canonical
URLs, social cards, icons, structured data) and `fixing-motion-performance` (animation cost). The
fourth skill this project uses from that repository, `fixing-accessibility`, is bundled as a
snapshot and described in [ui-craft-sources.md](ui-craft-sources.md#fixing-accessibility).

- Source: [ibelick/ui-skills](https://github.com/ibelick/ui-skills/tree/73fb128d046d1f0d74c2909cd26eb616e3415567), MIT, `Copyright (c) 2026 Julien Thibeaut`.
- Not bundled: none of the three skill files ships. Do not install or execute them for this pipeline.

## Where the rules are

[`ui-rule-coverage.json`](ui-rule-coverage.json), source `ibelick-ui-skills-rules`, has one row per
rule with its local target.

- `baseline-ui`: most rules are already in the measured audit, the review checklist
  ([ui-craft-sources.md](ui-craft-sources.md); `UC-37` and `UC-38` were added from this list) or
  the motion gate. Its stack prescriptions are not adopted: Tailwind defaults, `motion/react`,
  `tw-animate-css`, `cn`, Base UI, the Tailwind shadow scale and `size-*` utilities. The pipeline
  works in the project's existing styling system and adds a design dependency only when the user
  asks or the repository already uses it. "Never modify letter-spacing" is not adopted either:
  tracking follows size in the bundled `better-typography` text and stays at `0` for CJK body text.
- `fixing-metadata`: the project has no metadata rules yet beyond `lang` and `theme-color`. The
  remaining rows are `pending` until the metadata check is added.
- `fixing-motion-performance`: the property tiers, `will-change`, inherited custom properties and
  blur limits are in [animation-opportunity-and-review.md](animation-opportunity-and-review.md#5-compositor-cost)
  and [ui-transition-rules.md](ui-transition-rules.md). Scroll-linked motion, off-screen pausing and
  FLIP are `pending` until the motion performance check is added.

## Keeping it current

`sources.lock.json` pins the revision (`ibelick-ui-skills-rules`, the same commit as the
`fixing-accessibility` bundle). `npm run sources:update` moves it and rewrites
`reviewedContentHash` above when one of the three files changed; the coverage test then fails until
the pinned rule list is regenerated and each changed rule has a row (see
[ui-craft-sources.md](ui-craft-sources.md#maintaining-the-snapshots)).
