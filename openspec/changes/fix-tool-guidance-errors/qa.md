# QA record: fix-tool-guidance-errors

## What was checked (verified)

- `openspec validate fix-tool-guidance-errors --strict`: valid.
- Each task's own behaviour test was shown to fail on the old code and pass on the new:
  - `tests/film-edit.test.cjs`: two new tests; the hinted commands now go through the real CLI and
    none answers `UNKNOWN_COMMAND` or `UNKNOWN_ARGUMENT`; error labels start with `film-edit:`.
    Old code: both failed. New code: 8 of 8 pass.
  - `tests/workflow-next.test.cjs`: the `ui` intake asks product, audience, scope and assets, has no
    duration and no film wording, and keeps the shared record, question and why. On the old code the
    intake failed with `[product, audience, duration, assets]`. New code: 25 of 25 pass. Film and edit
    intake still ask for the duration.
  - `tests/film-project.test.cjs`: the `film check` help line must say, for each check, the condition
    the code really uses (score grid only with `score-grid.json`; timeline only with `index.html` or
    `timeline.json`; render only with a video; audio and the picture check after a render). Two
    cases. On the old help line (HEAD `cli-core.cjs` in a scratch copy) both fail; on the new one
    both pass. Found by the independent review, which caught that the first version marked only
    two checks as conditional.
- A scratch script compared the command names in `--help` with the command list in
  `docs/cli-and-reference-providers.md`: 42 checked, none missing.
- `skill/SKILL.md` is 4,293 bytes and 77 lines (limits 5,120 and 500).

## Full run

The whole-repository run (`node scripts/qa.cjs`, run directly) is recorded in the session summary
after the last edit to this change, not here, so this file never claims a run that has not
happened.

## Smoke (real CLI, empty temporary folders outside the repository)

- `film edit auto --root .` (the old wrong hint): `UNKNOWN_ARGUMENT`.
- `film-edit auto --root .` (the right form): `CONTRACT_INVALID`, `--project-root requires a path`.
  That is an ordinary usage error, so the command is known.
- `next --deliverable ui --tier standard`: questions `product`, `audience`, `scope`, `assets`.
- `next --deliverable film --tier standard`: questions `product`, `audience`, `duration`, `assets`
  (unchanged; "How long?" is still asked for film).
- `--help`: the `film check` line names each check with its condition, in ordinary words.

## Independent review (two separate lines, run after the first QA)

- Against the spec: confirmed the fixes by running the CLI and reading code; found one real miss
  (help line conditions), a guide that used a name the output does not (`carry` versus `check`), a
  command with literal dots, and frame wording narrower than the code. All fixed.
- Against the repository's own rules: no hard violation except one stale comment in `web.cjs`
  (fixed). Two blank lines added to `pipeline-reference.md` by the editor's formatter were left.

## Correction to an earlier claim

The proposal assumed `film check` already repeats the composition check, so authors need not run it
again. That was only half true: `film check` reads pixels only. The extra `composition capture`
step adds five text checks, so the guide keeps it and calls it optional.

## Not verified

- `film-edit` hints after a real `film-edit analyze` on footage (the ffmpeg test covers it only
  where ffmpeg exists).
- `film check` with a real browser capture (no `puppeteer-core` on the repo path).
- Whether readers find the new wording clearer: only a person can judge.
