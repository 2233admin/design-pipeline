# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #165.
- [x] 1.2 `npm exec -- openspec validate streamline-install --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `.claude-plugin/marketplace.json`, the `.gitignore` exception, and the generated `.claude-plugin/plugin.json` in `scripts/package.cjs`.
- [x] 2.2 `install-local.cjs` default root `~/.agents/skills`; delete the `CODEX_HOME` / `CODEX_SKILLS_DIR` root.
- [x] 2.3 `check-deps.cjs` roots: running copy, `~/.claude/skills`, `~/.agents/skills`, project roots, legacy Codex last.
- [x] 2.4 `install-hints.cjs`, `doctor-report.cjs`, `doctor` text output and `--json` `environment`, Node 22.12.
- [x] 2.5 ffmpeg, ffprobe and Blender errors name the install command.
- [x] 2.6 `SKILL.md` `compatibility`.

## 3. Docs and tests

- [x] 3.1 `README.md`, `docs/install.md`, `skill/references/installation.md`, `self-check.md`, `docs/maintainers.md`, `AGENTS.md`, `CHANGELOG.md`.
- [x] 3.2 `tests/install-doctor.test.cjs` in `scripts/test-manifest.json`; update `install-local`, `check-deps` and `designer-pipeline-cli` expectations.
- [x] 3.3 `install-hints.cjs` and `doctor-report.cjs` in `skill/references/package-resources.json`.

## 4. Verification

- [x] 4.1 `claude plugin validate` on the marketplace and on the extracted Release package; a plugin install from the Release archive.
- [x] 4.2 `node --test` on `tests/install-doctor.test.cjs`, `install-local`, `check-deps`, `designer-pipeline-cli`, `package-release`.
- [x] 4.3 `npm run specs:check` and `node scripts/qa.cjs`, comparing failures with the environment baseline on main.
