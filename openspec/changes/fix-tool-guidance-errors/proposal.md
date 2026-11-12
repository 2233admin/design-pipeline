# Fix the certain mistakes in tool guidance

## Why

A read-only inventory of the commands and documents (2026-09-30) listed 142 commands, 159
reference files and several confusing places. Most of that is a question of how the pieces are
organised. That is a later step. This change takes only what is plainly wrong: a hint that
tells the reader to type a command that does not exist, a question that does not fit the task,
and text that says less or more than the tool does. Each one was run or read again before it
went into this change; `design.md` section 1 shows the command and what it printed.

Found and confirmed:

1. `film-edit` tells the author to run `designer-pipeline film edit auto|render|check`, and
   "run film edit analyze first". The real command is `film-edit` with a hyphen.
   `designer-pipeline film edit auto` fails with `UNKNOWN_ARGUMENT`. The error label
   `film edit:` is wrong in the same way.
2. The `ui` deliverable reuses the film intake. A person asking for a screen or a design system
   is asked "How long?", "Who watches it and where (site hero, social, launch event)?" and for
   "footage, screenshots, models, logos or music".
3. `film check --help` says it runs "storyboard, timeline and render gates". The command also
   checks the score grid (when `score-grid.json` exists), the audio (when the film has sound),
   the picture of each beat, and how well planned carries hold. `workflow-film.md` repeats the
   short list and then sends the author to run `composition capture` and `verify composition`
   with no word on what `film check` already covered. The guide step is not a repeat: it adds
   text checks that `film check` never runs (see `design.md` section 1, item 3).
4. Four smaller mistakes: a comment in `workflows/shared.cjs` that says the file serves only film
   and edit; the "Command Surface" list in `docs/cli-and-reference-providers.md`, which leaves
   out 26 commands the CLI lists; a pointer in `pipeline-reference.md` to a file that holds
   none of what it promises; and a tier table in `SKILL.md` that says every standard project has
   concepts and a draft review, which is false for `ui`.

## What changes

- Every command that `film-edit` tells the author to run is written as `film-edit <verb>`. The
  error label becomes `film-edit`.
- The `ui` intake asks four questions of its own about the thing being built. Same stage, same
  answer command, same finish rule; only the questions differ.
- `film check --help`, `workflow-film.md` (`## check`) and `composition-gate.md` say exactly what
  `film check` runs. The guide keeps the `composition capture` step and says it is optional and
  what it adds.
- The four smaller mistakes above are corrected.

The change adds no command, no option, no stage, no gate, no receipt and no schema. It changes
words that tell people what to do, plus one set of questions.

## Decisions taken

Reversible, and each is small. The reasons are in `design.md`.

- The `ui` fix stays inside `workflow-core.cjs`. It does not add a guide or a stage and does not
  edit `workflows/shared.cjs`, so film and edit questions do not change.
- The guide step `composition capture` then `verify composition` stays, because it does more than
  `film check`. The assignment said `film check` already runs it. That is true for the picture
  checks only; it is not true for the text checks.
- `film check` is not changed to also read text boxes. That would be new behaviour.

## Order of work

`add-web-treatment-and-section-briefs` is committed as `b631fcd`, so this change starts from it and
nothing waits. This change edits the `ui` intake and one test that the web change added. The web
change's sentence "The film, edit and `ui` prompts SHALL NOT change" and its changelog note "The
`ui` deliverable's intake still asks for a duration" are true until this change lands. Closing this
change updates the test and the changelog note (`tasks.md`, closure).

Two later changes touch the same front door and help text, so the edits here stay small:

- `skill/SKILL.md`: this change edits two lines only, the `standard` row of the tier table and the
  bullet "The user decides twice in standard work". It does not edit the front matter or the bullets
  under "Where the details are". The front matter and the web bullet belong to
  `add-web-capability-skills`.
- `add-capability-registry` comes after this change. It only reads the `film check` help line and
  the `## check` section of `workflow-film.md` as they land here. It also edits the `.claude` router.
  A router fix, where the intake bullets name `product-film-direction.md` and `film-edit.md` instead
  of the guides `workflow-film.md`, `workflow-edit.md` and `workflow-web.md`, is left to that change:
  it is a routing choice, not a plain mistake.

## Not in scope

- Merging or renaming the three routers (`next`/`decide`, `route`/`toolchain`/`execution`,
  `change`/`status`/`plan`/`run`), or any stage vocabulary.
- More stages, a guide or gates for `ui`, or making `next` name more commands.
- The 21 help-only commands, orphan documents, the duplicate script wrappers, and the four
  copies of `pipeline-reference.md`.
- Who writes `control.gates` for the `run` command. The inventory found only a reader in code
  (`control-runtime-core.cjs:158`); nothing was run end to end. Fixing it is a design decision.
- `decide --stage concept` against the stage id `concepts`.

## Builds on

`split-film-edit-workflows` (guides and `next`), `add-music-led-editing` (`film-edit`),
`add-composition-gate` and `add-audio-gate` (the gates named here), `redesign-user-workflow`
(`next`, tiers) and `add-web-treatment-and-section-briefs` (which listed the `ui` intake as a
known leftover).
