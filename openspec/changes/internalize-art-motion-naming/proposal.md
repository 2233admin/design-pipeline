## Why

Art Motion — the Canvas runtime with 35 style studies, eight clip grammars and the transition
registry, plus long-scroll, asset, font, synthesis, voice, reference-study and render tools —
came from an external MIT-licensed reference project (`complete-art-motion-internalization`).
The repository still carries that project's identity: a 345-file mirror under
`skill/vendor/<former-bundle>/` with a pinned manifest and importer, and a generated runtime,
browser global, factory, namespace, build script, tests, npm scripts and a Python environment
variable named after it. Most mirror files have no consumer yet ship as required package
resources, and two tools keep their own command lines outside the pipeline CLI.

Authorization: Multica CERE-555 (the repository must not contain the reference project's name),
its scope correction (keep the capability, rename it to project-owned names) and the 2026-10-11
scope upgrade (internalize the capability the project's way and optimize it, not only rename).

## What changes

- Move the consumed engine source, fonts, examples and license out of `skill/vendor/` into
  `skill/tools/art-motion/`, and the method, style and grammar notes into
  `skill/references/art-motion/`, with ASCII English names. Art Motion becomes owned code.
- Regenerate the runtime from the owned engine as `runtime.js` (`ArtMotion`,
  `createArtMotionRuntime`) with a maintenance-only build in `scripts/`; drawing output stays.
- Route rendering and the reference study through `designer-pipeline` (`art-motion render`,
  `reference analyze-video --study`); remove the standalone command lines.
- Delete mirror material nothing consumes; keep one canonical license; rename tests, npm
  scripts and the font-subset Python variable (`FONTTOOLS_PYTHON`); neutralize history wording.
- Keep the MIT copyright and permission notice verbatim and attribute by copyright holder.

## Capabilities

### Modified capabilities

- `design-pipeline`: project-owned Art Motion tools, guides and CLI entry points.

## Impact

Changes stay in `skill/tools/art-motion`, `skill/references`, `skill/scripts/cli-core.cjs` plus
one render kernel, `skill/tools/visual-craft`, maintenance scripts, tests, CI, notices and
OpenSpec records. No new gate, receipt, schema, target resolver or policy digest. Public command
`composition scaffold --template art-motion` stays; its copied runtime and license files are
renamed. Render reports name the runtime by hash instead of an upstream commit.
