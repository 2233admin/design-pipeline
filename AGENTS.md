# design-pipeline

Design and film workflow (UI, motion web, product films, PV/MAD edits) shipped as a packaged agent skill. Runtime scripts use Node.js CommonJS; the root `package.json` is a private maintenance workspace for `evals/cases` and `tools/browser-automation`, separate from the packaged skill. Package entry is `skill/SKILL.md`; stage contracts live in `skill/references/stages.md`, with route guidance in `pipeline-reference.md`; behavior specs and changes live in `openspec/`.

## Policy

- Change behavior only through an OpenSpec change under `openspec/changes/<change-id>/`; read `openspec/config.yaml` and that change first.
- Extend existing v1 gates, contracts and receipt schemas; never add a parallel gate, receipt schema, target resolver or policy digest.
- Keep target, snapshot, policy digest and receipt lineage intact; when an upstream receipt changes, recompute or invalidate downstream evidence.
- Report Component Conformance and Visual Acceptance separately; gate results never claim creative or visual acceptance.
- Preserve unrelated working-tree changes; inspect `git status` before editing and never reset or discard work you did not make.

## Where things are

- CLI: `node skill/scripts/designer-pipeline.cjs <command>`; `next` reads `.design-pipeline/state.json` and returns one action, `decide` records user decisions; commands are the `COMMANDS` table in `skill/scripts/cli-core.cjs`.
- Release and versioning rules: `CONTRIBUTING.md`.

## Running and verifying

- Use Node.js 22.12+ and run `npm ci` at the repository root to install the private maintenance workspace. Run `npm test` for repository QA and browser-tool self-tests; never bare `node --test`, which discovers nested upstream fixtures.
- Use the workspace-pinned OpenSpec CLI with `npm exec -- openspec ...`; run `npm run specs:check` for strict repository validation.
- `npm test` reads ignored `.env.local` for `BLENDER_PATH` (an externally set environment value wins) and passes the shared Chrome resolver result to isolated QA. Keep machine-specific paths in `.env.local`, never in committed docs or source.
- Use `npm run browser:install` to prepare Playwright Chromium and the HyperFrames browser. Film render checks also need `ffmpeg` and `ffprobe` on PATH; Blender is discovered via `--blender`, `BLENDER_PATH`, PATH, then supported platform locations.
- Add each new test file to `scripts/test-manifest.json`, or QA never runs it.
- List each load-bearing new file under `skill/` in `required` of `skill/references/package-resources.json`; packaging ships all of `skill/`, and the list only makes packaging fail when a listed file goes missing.

## Conventions that differ from defaults

- Register every new CLI flag in `KNOWN_OPTIONS` or `BOOLEAN_OPTIONS` in `cli-core.cjs`; unlisted flags fail with `UNKNOWN_OPTION`.
- CLI exit codes: 0 passed, 2 gate failed, 1 contract or usage error.

## Repository documents

- Keep root Markdown limited to project/agent entry points, `DESIGN.md`, `MOTION.md`, and open-source/release documents; `scripts/qa.cjs` checks the allowed names. Put maintained guides in `docs/`, historical drafts in `docs/archive/`, change records in `openspec/changes/<change-id>/`, and local captures/logs/scratch output in ignored `.design-pipeline/`.
- Keep local agent installations, BMAD/output, skill-manager locks and root dotpaths out of Git. Shared dotpaths require an explicit `.gitignore` exception; `.github/`, `.gitignore` and `.gitattributes` are the current exceptions. QA rejects tracked ignored files. Preserve local copies when removing them from the index.
- Project `DESIGN.md` follows the [Google DESIGN.md format](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md): visual tokens and design rationale in the official section order. Treat Product Context and Source Decisions as local provenance extensions. Keep engineering process and QA reports in change documents, not in visual component guidance.
- Keep original source bundles in `skill/vendor/`, maintained callable helpers in `skill/tools/`, and task guides in `skill/references/`. Preserve upstream bytes and update consumers when moving a source bundle.

## Agent skills

### Issue tracker

Execution tasks use Multica under the canonical host project-tracking policy. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the canonical triage roles and workspace categories. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: reuse `docs/GLOSSARY.md` and existing OpenSpec decisions. See `docs/agents/domain.md`.
