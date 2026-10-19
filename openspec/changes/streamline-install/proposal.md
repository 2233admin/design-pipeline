# One install command per agent, and a readable doctor

## Why

Closes #165. Three install paths contradict each other (README, `docs/install.md`,
`skill/references/installation.md`). `install-local.cjs` defaults to `~/.codex/skills`, which Codex
no longer scans (it scans `~/.agents/skills`). `check-deps.cjs` does not search `~/.claude/skills`,
so a Claude Code user's self-check is all FAIL. `npx skills add owner/repo` clones the whole
repository (about 250 MB, mostly `skill/vendor`) while the docs promise 50 MB. `doctor` prints only
JSON: it does not name the agent, the install location, the browser, ffmpeg or Blender.

## What Changes

- Claude Code installs through the plugin marketplace: `.claude-plugin/marketplace.json` lists one
  plugin whose source is the Release archive (`releases/latest/download/design-pipeline-skill.zip`).
  The package generates `.claude-plugin/plugin.json`, so its archive root (`design-pipeline/`) is a
  plugin root with `SKILL.md` as its one skill.
- Codex and other agents install with `npx skills add <release zip URL> --skill design-pipeline -a
  codex -g` (lands in `~/.agents/skills`). The package exceeds the Skills CLI default limits, so the
  documented command raises them.
- `install-local.cjs` defaults to `~/.agents/skills`; the `~/.codex/skills` default and the
  `CODEX_HOME` / `CODEX_SKILLS_DIR` install root are deleted.
- `check-deps.cjs` searches the running copy's directory first and adds `~/.claude/skills` and the
  project's `.claude/skills`; the running copy counts as the core skill wherever it lives.
- `doctor` prints a readable report by default (install path from the script's own location, agents
  found, required / recommended / optional tiers, one copyable command per missing item); `--json`
  keeps the machine result. Only a missing required item (Node 22.12+, package files) is blocking.
- The ffmpeg, ffprobe and Blender errors name the install command `doctor` prints; the browser error
  already does.
- `SKILL.md` frontmatter gains `compatibility`. Install documentation becomes one page.

## Reuse

`inspectDoctor` (required items, bundle downloads), `browser-locate.cjs` `locateBrowser`,
`blender-core.cjs` `findBlender`, `sources fetch`, and the existing exit-code convention (0 passed,
2 blocked) are reused. No new gate, receipt, resolver or policy digest is added.

## Impact

Affects `design-pipeline` (install, self-check and doctor requirements). Breaking for anyone relying
on the `~/.codex/skills` install default or `CODEX_SKILLS_DIR` for `install-local.cjs`; there is no
alias and no migration.
