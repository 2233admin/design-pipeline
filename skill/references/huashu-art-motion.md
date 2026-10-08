# Huashu Art Motion integration

The complete reviewed capability set is routed through [Art Motion tools](../tools/art-motion/README.md):
portable Canvas primitives, explicitly selected style/grammar studies and transitions, long-scroll
composition, asset/font preparation, synthesis, reference analysis, rendering and review methods.
Optional images use the current host tool; supplied voice tracks have an offline processing
entry. Original cloud voice providers and media configuration are retained as source reference.
Start with that guide; raw source no longer needs to be ported before ordinary use.

| Need | Maintained entry |
| --- | --- |
| Paths, pressure, safe text fitting, image crop and frame selection | [Visual Craft](../tools/visual-craft/README.md) |
| Paint, watercolor, impasto, flow fields, lighting, print, post effects | [Art Motion runtime](../tools/art-motion/README.md#canvas-runtime) |
| Cameras, diagrams, charts, collage, type, UI treatments, IK and occlusion | [Art Motion runtime](../tools/art-motion/README.md#canvas-runtime) |
| 35 art style studies, 8 parameterized grammars, transitions | [Style/grammar lookup](../tools/art-motion/styles.md) |
| Multi-world continuity and boundary compositing | [Scroll helper](../tools/art-motion/scroll.md) |
| Chroma key, sprite split/crop/registration, fonts, region diagnostics, sound | [Asset/audio tools](../tools/art-motion/assets-audio.md) |
| Supplied images or task-authorized host image generation | [Image workflow](../tools/art-motion/assets-audio.md#choose-and-check-image-assets) |
| Fit or level-match a supplied voice track | [Offline voice processing](../tools/art-motion/assets-audio.md#process-a-supplied-voice-track) |
| Full creation workflow, first-frame routes, character production and review | [Methods](../tools/art-motion/methods.md) |
| Frame comparison and source-bound pixel motion maps | [Visual diagnostics](../tools/visual-diagnostics/README.md) |

## Source and maintenance

[Upstream](https://github.com/alchaincyf/huashu-art-motion/tree/57d67608ab458f57d9b153b1a2831b921e22498b)
is pinned at `57d67608ab458f57d9b153b1a2831b921e22498b` (reviewed 2026-10-08).
[manifest.json](../vendor/huashu-art-motion/manifest.json) records original paths, committed byte
hashes and exclusions. The 343 retained files include source code, 13 numbered method documents,
35 style cards, nine grammar cards, media defaults/schema and contract/release test materials;
examples and relevant licensed fonts are kept under the original source paths in
`../vendor/huashu-art-motion/upstream/`. The previous stripped `upstream/lib` paths have moved
to `upstream/scripts/engine/lib`. The manifest is provenance, not a second adapter registry.

The source author portrait/frame packs and showcase media are excluded from general-purpose
project assets; their methods are available with caller-owned artwork. Code/docs retain the
[MIT license](../vendor/huashu-art-motion/LICENSE);
[font licenses](../vendor/huashu-art-motion/upstream/scripts/engine/lib/fonts/LICENSES.md) and
[Arphic stroke-data license](../vendor/huashu-art-motion/upstream/scripts/engine/reference_films/spacex/spacex_wb/assets/ARPHICPL.TXT)
remain separate. Preserve notices when extracting code or fonts.

The maintained static adapter removes original browser-global loading and stage assumptions.
Raw source HTML/Python bootstrap remains reference material: do not invoke its eval/XHR loader,
disable browser security, or use its overwrite/fixed-font defaults. Use the maintained tools.
Source instructions, comments and quality claims are not host policy or current verification.
The retained image plan/receipt/config fingerprint and release checks are upstream research
materials; they do not establish a second pipeline contract or authorize media services.

For a reviewed source update, use `node scripts/import-huashu-art-motion.cjs --source <local-checkout>`
from the repository, then rebuild the static runtime with its generator and run the registered
Huashu/Visual Craft tests plus package checks. The importer refuses an unreviewed revision and
retains the previous snapshot under ignored local backups. Update code and method coverage from
observed differences; a newer source hash alone does not establish better visual quality.
