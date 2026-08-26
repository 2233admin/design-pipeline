# Design: two pinned libraries, one overlay each

## Shape

```text
references/design-md.md                         DesignMD GitHub overlay
references/design-md/manifest.json              provenance + example catalog
references/design-md/upstream/**                exact dimabraven/design-md tree

references/iart-motion-skills.md                iart overlay and runtime boundary
references/iart-motion-skills/manifest.json     packs, skills, exclusions, hashes
references/iart-motion-skills/upstream/<pack>/**  exact licensed pack trees

scripts/import-design-md.cjs
scripts/import-iart-motion-skills.cjs
scripts/git-tree-snapshot.cjs                   shared Git-blob importer
scripts/design-md-source-core.cjs
scripts/iart-motion-skills-core.cjs
```

Upstream bytes stay untouched. Pipeline policy lives in the overlays, CLI, job registry, and QA.

## DesignMD dual mode

| Command | `--catalog` present | `--catalog` absent |
| --- | --- | --- |
| `sync` | n/a; always crawls the directory | same |
| `search` / `inspect` | directory snapshot | bundled GitHub examples |
| `verify` | directory snapshot | bundled GitHub snapshot |

`designmd-cli install` is not wrapped. Example files are inspiration-only inputs to DESIGN.md
synthesis.

## iart activation

- Automatic: `web-animation-skills`, `webgl-animation-skills`, `kinetic-typography-skills`, and
  craft entries in `motion-design-skills`.
- Explicit: video packs, `remotion-video`, `after-effects`, freelance ops, Manim.
- Excluded: `generative-illustration-skills` (no LICENSE).

HTML video still uses HyperFrames as the runtime. iart skills are craft playbooks, not a second
renderer.

## Integrity

Canonical hash is SHA-256 over sorted `relative-path + NUL + file-SHA-256 + newline`. Verification
blocks on missing files, byte drift, or a skill catalog that does not match discovered `SKILL.md`
files.
