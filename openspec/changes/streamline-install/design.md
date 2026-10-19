# Design

## File ownership

- `.claude-plugin/marketplace.json` (new, tracked through a `.gitignore` exception) owns the Claude
  Code catalog: name `design-pipeline`, one plugin `design-pipeline`, `archive` source.
- `scripts/package.cjs` generates `.claude-plugin/plugin.json` into the archive (listed under
  `generated` in `skill/references/package-resources.json`); `name`, `version` (the package
  version), metadata and `skills: "./"`.
- `skill/scripts/install-hints.cjs` (new) owns the one install command per tool and the `sources
  fetch` command; `doctor`, the ffmpeg/ffprobe errors (`audio-core.cjs`, `film-core.cjs`,
  `workflows/film.cjs`) and the Blender error (`blender-core.cjs`) read it.
- `skill/scripts/doctor-report.cjs` (new) owns install classification, agent detection, the tiers
  and the text rendering. `cli-core.cjs` `inspectDoctor` still decides what is required.
- `scripts/install-local.cjs`, `skill/scripts/check-deps.cjs`: default roots as described.

## Decisions

- Archive source, not `github` or `git-subdir`: Claude Code clones git sources whole, and this
  repository is about 250 MB. The archive is the 49 MB Release zip, whose root directory
  `design-pipeline/` is the plugin root ("the plugin root may be at the top of the zip or one
  directory down").
- Update strategy: the entry points at `releases/latest/download/design-pipeline-skill.zip` with no
  `sha256` pin, and `plugin.json` carries the package version. A user gets a new copy when the
  computed version differs, i.e. at the next release. A pinned URL plus digest would need the
  release workflow to commit `marketplace.json` after packaging (the digest exists only then); the
  trade is that the download is checked only by HTTPS and GitHub, which `checksums.txt` already
  covers for the offline path. A prerelease is not "latest" and is not offered.
- The marketplace is named `design-pipeline`, so the install id is `design-pipeline@design-pipeline`.
- The Skills CLI limits (10 MiB download, 25 MiB extracted, 1000 files) are lower than the package
  (49 MB, 48.6 MB extracted, about 1600 files). The documented command sets
  `SKILLS_DOWNLOAD_MAX_BYTES`, `SKILLS_EXTRACT_MAX_BYTES` and `SKILLS_EXTRACT_MAX_FILES`.
- The browser install command is `npx hyperframes browser ensure`, not `npx playwright install
  chromium`: the shared resolver finds the HyperFrames headless shell and system browsers but not a
  Playwright cache, so only that command makes the next run succeed.
- Node 22.12: the docs and `doctor` agree on one floor.

## Compatibility and migration

`install-local.cjs` no longer reads `CODEX_HOME` or `CODEX_SKILLS_DIR` and does not install to
`~/.codex/skills`. An existing `~/.codex/skills/design-pipeline` is left alone (check-deps still
searches it last); users remove it themselves after installing to the new place. Explicit roots
(`DESIGN_PIPELINE_SKILL_ROOTS`, `CODEX_SKILLS_DIR` for check-deps) stay exclusive.
`doctor --json` keeps every previous key and adds `environment`.

## What stays out

Nothing is installed automatically by `doctor` or by an error message. Browser, ffmpeg, Blender and
the large libraries are named when a task first needs them. No receipt, gate or policy digest
changes; `doctor` reports tool presence, not creative or visual acceptance.
