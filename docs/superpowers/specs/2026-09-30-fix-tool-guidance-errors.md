# Fix the certain mistakes in tool guidance (spec, draft)

Status: draft, awaiting approval (2026-09-30). Nothing here is approved. The behaviour change ships
as the OpenSpec change `openspec/changes/fix-tool-guidance-errors/`. This document is the summary
and the place to answer the open questions; `design.md` of the change holds the proof for each
item.

## Problem

An inventory of the commands and documents found many places that are hard to follow. Most of them
are questions of how things are organised. That is step 2 and is not decided here. This is step 1:
the places that are plainly wrong, where the tool tells someone something that is not true or asks
something that does not fit.

## What was confirmed

Each item was run or read again, not taken from the inventory.

| # | Mistake | Proof | Fix |
| --- | --- | --- | --- |
| 1 | `film-edit` tells the author to run `film edit auto`, `film edit render`, `film edit check`, "run film edit analyze first". The command is `film-edit`. | `film edit auto` fails with `UNKNOWN_ARGUMENT`; after a real `film-edit analyze` the printed next step is `designer-pipeline film edit auto ...`. Seven hints in `edit-project-core.cjs`, plus the error label `film edit:`. | Write `film-edit` everywhere; label `film-edit`. |
| 2 | The `ui` intake asks "How long?", "Who watches it and where (site hero, social, launch event)?" and for "footage ... or music". | `next --deliverable ui --tier standard` prints those questions. | `ui` gets four questions of its own (product, audience, scope, assets). No new stage. |
| 3 | `film check --help` and `workflow-film.md` list three gates; `film check` reports six steps. The guide then sends the author to `composition capture` and `verify composition` as if `film check` had skipped composition. | A real run reported storyboard, timeline, render, audio, composition and the carry check. | State what runs. Keep the capture step, as an optional extra. |
| 4a | A comment in `workflows/shared.cjs` says only film and edit use it. | It is imported by web and by `workflow-core.cjs`. | Fix the comment. |
| 4b | The "Command Surface" list in `docs/cli-and-reference-providers.md` leaves out `next`, `decide`, `film`, `film-edit`, `film-eval`, `audio`, `composition`, `source audit` and most `verify` forms. | Compared with `--help`. | Add them. |
| 4c | `pipeline-reference.md` says `pipeline-method.md` holds the state and invalidation contract for `plan`, `run`, `resume` and more. | `pipeline-method.md` has none of it. The phases, gates, inputs, outputs and invalidations are in `pipeline-phases.json`. | Point there. |
| 4d | `SKILL.md` says standard projects have concepts and a draft review (two user decisions). | `ui` at standard has intake and work only. | Limit the sentence to film, edit and web; say what `ui` does. |

## One correction to the brief

The brief said `film check` already runs what the guide asks the author to run. That is half true.
`film check` does check the sound and the picture of each beat. It reads pixels only. The extra
step captures the text boxes as well and adds five text checks (text contrast, text leaving the
frame, near-miss alignment, flat hierarchy, too many text sizes). So the step is kept and
described, not removed.

## Approach

- Words and one set of questions change. No command, option, stage, gate, receipt or schema is
  added, and nothing that `film check` or `verify composition` reports changes.
- Tests: no new test file. Each test goes into the existing suite that covers its fix. A case in
  `tests/film-edit.test.cjs` sends every command that a `film-edit` message names through the real
  CLI. A case in `tests/film-project.test.cjs` (which already builds the render fixture and calls
  `checkFilmProject`) checks that the `film check` help names every gate the command reports.
  The `ui` cases go into `tests/workflow-next.test.cjs`. `scripts/test-manifest.json` does not
  change. No test reads guide prose.
- Order: `add-web-treatment-and-section-briefs` is committed as `b631fcd`, so nothing waits. Two
  later changes share files with this one. `add-web-capability-skills` owns the `skill/SKILL.md`
  front matter and the web bullet; this change edits only two `SKILL.md` lines (the `standard`
  tier row and the line "The user decides twice in standard work"). `add-capability-registry`
  comes after this change: it reads the `film check` help line and the `## check` guide section
  written here, and it owns the `.claude` router. A router bullet fix (intake bullets that name
  `product-film-direction.md` and `film-edit.md` instead of the workflow guides) is left to the
  registry change.

## Not included

The three routers and their stage words, a guide or more stages for `ui`, the 21 help-only
commands, orphan documents, duplicate script wrappers, the copies of `pipeline-reference.md`, and
`decide --stage concept` against `concepts`. Also not included: who writes `control.gates` for
`run` (code shows only a reader; not run end to end; a design decision).

## Open questions and defaults

1. Change the error label `film edit` to `film-edit` too? Default: yes. It is text only and no test
   uses it.
2. Should `film check` also read text boxes, so that the extra step is not needed? Default: no. It
   would change what the command reports.
3. Is the `ui` question wording (`design.md` section 1.2) right? Default: use it as written; it is
   guidance, not a gate.
4. Any ordering constraint left? Default: none for this change. Tasks T1 to T5 run in parallel and
   T6 (closure) follows. The web change's `ui` test and changelog note are edited here (T4, T6).
5. Should the note "The `ui` deliverable's intake still asks for a duration" stay in the web
   change's changelog entry? Default: replace it when the `ui` fix lands, so the changelog does not
   contradict itself.
6. The web change's requirement "The film, edit and `ui` prompts SHALL NOT change" becomes wrong
   for `ui`. Default: amend it when both changes are archived; this change does not use MODIFIED
   because that requirement is not yet in `openspec/specs/`.
