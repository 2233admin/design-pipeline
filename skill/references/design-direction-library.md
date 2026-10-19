# Design direction library

Read this when a task needs raw material for choosing or judging a visual direction: a style
library with rendered specimens, a three-direction method, a brand-asset protocol, a critique
guide, content rules against generic output, and an evolution protocol. It is reference material
imported from a pinned MIT-licensed project (attribution in `THIRD_PARTY_NOTICES.md`). It does not
change any stage, gate or `next` action in this skill, and its own workflow text does not override
the project's `DESIGN.md`, `MOTION.md`, owner decisions or the pipeline's gates. Most of the text
is Chinese; keep the user's language when you quote or adapt it.

Adoption into the workflow happens through separate changes: #155 (direction sources), #154
(appearance ledger), #156 (brand and facts) and #157 (critique). Until those land, read and borrow
from the library; do not treat it as a required step.

## Where it is

The bundle lives under `vendor/` in the package, in the folder whose `manifest.json` has
`"bundle": "design-direction-library"`. Do not construct the path; ask the doctor:

```bash
designer-pipeline doctor --json
```

`directionLibrary.shipped.root` is the tree that ships in the package (text, HTML, inert scripts).
`directionLibrary.fetched.root` is the cache directory for the binaries, which exists only after
the fetch below. Paths in this guide are relative to those two roots. `manifest.json`, beside the
shipped root, records every file with its Git blob id, size and SHA-256, and lists the 84
specimens (`specimens[]`: `id`, `family`, `title`, `path`, `preview`).

## Shipped with the package (relative to the shipped root)

| Path | What it is |
| --- | --- |
| `UPSTREAM-SKILL.md` | The source project's entry (its `SKILL.md`, renamed so the package has one `SKILL.md`). Read for its own routing; not our policy. |
| `references/design-styles.md` | The style library: web 20, slides 20, infographic 20, app 12, Chinese and East Asian 12. Each entry names the look, the type and palette, and its specimen. |
| `assets/style-specimens/<family>/NN-name.html` | The 84 single-file HTML specimens; `<family>` is `web`, `ppt`, `info`, `app` or `east`. |
| `references/directions.md` | How to make three directions that differ in structure, not only in skin. |
| `references/workflow.md`, `references/design-context.md` | Intake questions and the working order after a direction is chosen. |
| `references/critique-guide.md` | Scored critique: concept first, then execution. |
| `references/brand-asset-protocol.md` | Find and verify a brand's real logo, product images, colors and fonts before designing with them. |
| `references/content-guidelines.md` | Rules against generic generated looks, and scale rules. |
| `references/evolution.md`, `references/experience.md` | Keeping preferences, a ledger of past looks and verified lessons between projects. |
| `references/modules/` | Per-output handbooks: web, deck, infographic, motion. |
| `references/*.md` (the rest) | Slides, app prototypes, animation, video export, audio, typography, PPTX export notes. |
| `assets/*.jsx`, `assets/deck_stage.js`, `assets/deck_index.html` | Device-frame, stage and deck starters referenced by the handbooks. |
| `assets/showcases/INDEX.md`, `assets/director-notes-samples/` | Index of the sample set and sample director notes. |
| `scripts/**` | Upstream helper scripts kept as reference only. See below. |

## Fetched on demand (relative to the fetched root)

Specimen images (`assets/style-specimens/<family>/NN-name.jpg` and the five `sheet-*.jpg`
overviews), background music and sound effects, showcase and demo pages and images, and upstream
repository metadata are not in the package. Fetch them once:

```bash
designer-pipeline sources fetch --bundle design-direction-library
```

Every file is downloaded from the pinned commit and checked against its size, Git blob id and
SHA-256 before the cache entry is installed. `designer-pipeline doctor` lists the bundle under
`downloads` until then, and a missing download never blocks the doctor or the text above.

## Using it

- **Choosing a direction.** Read the style entries that fit the output form (page, deck,
  infographic, app), open the matching specimen, and take what suits the brief. The library is
  material for when there is no direction yet; if the user supplied content, a brand or a
  reference, start from that.
- **Previewing a specimen.** Specimens are static single-file pages (web fonts come from the
  network; offline they fall back). Render one with the existing capture tool or open it with the
  browser tools:

  ```bash
  designer-pipeline composition capture --composition <shipped root>/assets/style-specimens/web/01-editorial-brutalism.html --output <new-dir> --width 1440 --height 900
  ```

  Judge the screenshot, not the filename. A capture is evidence of what rendered, not of visual
  acceptance.
- **Borrowing.** Adopt a technique into project-owned code and cite the entry in the project's
  Source Decisions. Do not copy a specimen as the deliverable.
- **Scripts are inert.** `scripts/**` (lint, export, render, narration, hooks) is never run by this
  package: nothing wires it into a command, a gate or an install step, it does not run on fetch,
  and the manifest marks it `inertScripts`. Read it as design documentation. If a task needs the
  same capability, use the pipeline's own tools.
- **Nothing here is a gate.** Component Conformance and Visual Acceptance stay separate and keep
  their existing owners; the critique guide informs a review but does not produce either result.

## Provenance

Source: the pinned commit recorded in `manifest.json` (`source.repository`, `source.revision`,
`source.gitTree`). The shipped part plus the fetched part rebuild that Git tree exactly; the
snapshot is refreshed only by `scripts/import-design-direction-library.cjs` from a clean local
checkout at an explicitly reviewed revision.
