# Rules for every worker on port-onetake-continuity

- Repository: design-pipeline. Read `AGENTS.md`, `openspec/project.md`, and this change's
  `proposal.md`, `design.md` and your brief before editing. `design.md` is the contract; if it is
  wrong or impossible, stop and say why instead of inventing a different behavior.
- Clean room: do NOT open, fetch, clone or search the onetake or motion-web repositories, and do not
  read `%TEMP%motion-web-research-*` or any `backup/*` branch. Work only from these briefs and this
  repository. Write all prose in your own words.
- Scope: only the files your brief names, plus test fixtures that break because of your change.
  Other workers edit `film-core.cjs`, `film-hints.cjs` and docs in parallel; keep your diff
  minimal so merges stay easy. Do not reformat untouched code.
- Every new finding code gets a one-line repair in `skill/scripts/film-hints.cjs` (existing style).
- New test files must be added to `scripts/test-manifest.json`.
- Verify with `node scripts/qa.cjs` (never bare `node --test`). It must exit 0. Record the exit code
  and pass/fail counts in the PR body.
- Commit on your branch with a conventional subject (`feat: ...`), push, and open a PR with
  `gh pr create --base improve-beta-motion`. Do NOT merge. Do not use `--no-verify`, force-push,
  `git reset --hard` or `git stash`.
- Add one CHANGELOG `[Unreleased]` bullet for your part under `### Added` or `### Changed`.
- When done, print a final report: branch, PR URL, files changed, QA exit code and counts, and
  anything you were unsure about.
