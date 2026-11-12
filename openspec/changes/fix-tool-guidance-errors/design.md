# Design

This change fixes words and one set of questions. It adds no command, option, stage, gate,
receipt or schema. Facts below were read or run on 2026-09-30, first at `bbf7fa4` while the web
change `add-web-treatment-and-section-briefs` was still uncommitted; it is now committed as `b631fcd`
and the file and line references were checked again there. A "gate" here means a check that must pass.

## 1. What was checked

Each item gives the check, what it showed, the fix, and the test that would prove the fix.
The commands ran from the repository root; `T` is an empty temporary directory and the CLI is
`node skill/scripts/designer-pipeline.cjs`.

### 1.1 `film-edit` names a command that does not exist

Check: `film edit auto --root T` printed
`{"ok":false,"error":{"code":"UNKNOWN_ARGUMENT","message":"cli: unexpected positional arguments: auto"}}`
(exit 1). `film edit --root T` printed `UNKNOWN_COMMAND: film edit`. `film-edit auto --root T
--project-root T` printed `film edit: no edit/analysis.json. Fix: run film edit analyze first`. After
a real `film-edit analyze` on generated footage and music, the result's `next[0]` was
`designer-pipeline film edit auto --project-root . --style mad|pv [--duration <sec>]`.

Where: `skill/scripts/edit-project-core.cjs` lines 56, 64, 66, 71, 78, 85 and 108 (seven hints), and
the error label `film edit` (lines 24, 26, 37, 39, 64, 66, 85; header comment line 3) and
`SCOPE` in `skill/scripts/edit-core.cjs:14`. No test matches on the label; the only other
`film edit` in the repository is a test title (`tests/film-edit.test.cjs:109`). A scan of every
`designer-pipeline <command> <verb>` written in `skill/`, `README.md` and the command doc found no
other pair that the CLI rejects, and `skill/references/film-edit.md` and `workflow-edit.md`
already write `film-edit`.

Fix: write `film-edit <verb>` in all seven hints and use `film-edit` as the label. The label
follows the command's name, as `film check` and `film score` do.

Test: a new case in `tests/film-edit.test.cjs`, the existing suite for `film-edit`. It collects
every `film edit` or `film-edit` command named in the errors and `next` steps of the four
`film-edit` functions and sends each through the CLI (`spawnSync`, as `tests/film-project.test.cjs`
does). It fails while `film edit auto` still comes back `UNKNOWN_ARGUMENT`, and it checks that each
error message starts with `film-edit:`. No ffmpeg is needed for six of the seven hints (a
hand-made analysis and an injected render reach them); the hint after `analyze` needs ffmpeg and
skips without it, like the other cases in that file.

### 1.2 The `ui` intake asks film questions

Check: `next --deliverable ui --tier standard` on an empty project returned four questions:
`product` ("the one thing the viewer should understand"), `audience` ("Who watches it and where
(site hero, social, launch event)?"), `duration` ("How long?", recommended "15-30 s for a promo,
30-60 s for an edit.") and `assets` ("footage, screenshots, models, logos or music"). After
`decide --stage intake` the next stage is `work`, which sends the author to
`references/pipeline-reference.md`.

Where: `skill/scripts/workflow-core.cjs`, function `codeStages`, which returns `[INTAKE, work]`
using the shared intake from `workflows/shared.cjs`. Film and edit use the same object, and for
them the questions fit.

Fix: `workflow-core.cjs` defines `UI_INTAKE` by spreading the shared `INTAKE` and replacing the
action's `questions`. Stage id, finish rule (`brief.md` exists), `record`, `question` and `why`
are inherited, so `decide`, the guide anchors and the stage counts stay as they are. The four
questions have the ids `product`, `audience`, `scope` and `assets`, the same ids the web intake
uses. The wording is fixed here so that the plan and the test agree:

| id | ask | recommended |
| --- | --- | --- |
| `product` | What are we building (a screen, a set of components or a design system), and what should a person be able to do with it? | Take it from the conversation so far. |
| `audience` | Who uses it, and on which devices? | People using a browser on desktop and phone. |
| `scope` | Which screens, components or states are in scope, and what does a person do first? | The smallest set that lets one person finish the first task. |
| `assets` | Which existing code, design system, brand rules, copy or images can be used, and are they licensed for this use? | Only what you own or may use; reuse what the project already has first. |

Test: in `tests/workflow-next.test.cjs`: a standard `ui` intake has these ids, no `duration`, and
no match for the banned words; `record`, `question` and `why` equal the shared ones; film and edit
intake still carry `duration`; `ui` stage ids and order are unchanged. It fails on today's tree
because the ids are `product`, `audience`, `duration`, `assets`.

### 1.3 `film check` is described as smaller than it is

Check: on a scaffolded project with a flat 12-second render that has sound, `film check` reported
the steps `storyboard, timeline, render, audio, composition, check`. The help line reads
"runs storyboard, timeline and render gates". `workflow-film.md` (`## check`) says "runs the
storyboard, timeline and render gates", then "Frame layout: `composition capture` then `verify
composition`".

What the code does (`skill/scripts/film-project-core.cjs` `checkFilmProject`): storyboard; score
grid alignment when `score-grid.json` exists; timeline plus a scan of the page source; render
(needs a render file); audio, only when the storyboard's sound is not `silent` or the render has
audio; composition of each beat's frame; then the carry check on planned carried handoffs.

The premise was that the guide step repeats a check. It does not. `film check` calls
`checkComposition(frame, { profile: "frame" })` with no element list. Without `--elements` the
gate reads pixels only. `composition capture` writes `elements.json` (text with box, size and
colour), and `verify composition --elements` then also runs `text-off-canvas`, `text-contrast`,
`alignment-near-miss`, `flat-hierarchy` and `type-scale-sprawl` (`composition-core.cjs`
`checkElements`). So the guide is wrong in what it says `film check` runs, and it is silent on why
the extra step exists, but the extra step is real.

Fix, in words only:

- Help line: "runs storyboard, score grid (when score-grid.json exists), timeline, render, audio
  (when the film has sound), beat-frame composition and carry gates; each finding carries a fix".
- `workflow-film.md` `## check`: list those gates; say the composition check looks at pixels only;
  make `composition capture` then `verify composition --elements` an optional step that adds the
  text checks.
- `composition-gate.md` line 23: the `film check` step "reads pixels only".

Not done: making `film check` pass the element list. That would change what the command
reports and is a design change.

Test: a new case in `tests/film-project.test.cjs`, next to "film check reviews each beat frame's
composition after render", which already builds the fixture (a scaffolded project and a flat
render with sound). The new case runs `checkFilmProject` on that fixture and checks that every
gate id in `steps` appears in the `film check` line of `designer-pipeline --help` (`check` maps to
the word `carry`). It fails against today's help line, which lacks audio, composition and the carry
check. It skips without ffmpeg, like its neighbour. The score-grid gate needs `score-grid.json`;
if the small fixture cannot reach it the test says so and only the help wording covers it. The
guide is checked by reading it against the code, because a test on guide text would pin wording.
The other existing help test (`tests/guided-multi-surface-cli.test.cjs`, "help distinguishes every
guided multi-surface command") compares exact help strings; the new case does not copy that
style, and the file is not used.

### 1.4 Smaller mistakes

| # | Where | Check | Fix |
| --- | --- | --- | --- |
| a | `skill/scripts/workflows/shared.cjs:3` | The comment says "(film, edit)". `web.cjs` imports the file, and `workflow-core.cjs` imports `INTAKE` from it. | Name film, edit, web and `ui` as its users. |
| b | `docs/cli-and-reference-providers.md` "Command Surface" | Compared with `--help`, the list has no `next`, `decide`, `film` (scaffold, capture-timeline, blender, score, blocks, check), `film-edit`, `film-eval`, `audio master`, `composition capture`, `source audit`, or `verify audio\|composition\|interaction\|film-storyboard\|film-timeline\|film-render\|--gate`. | Add those lines in the list's style. `source add` stays described as deferred. |
| c | `skill/references/pipeline-reference.md:558` | It says to read `pipeline-method.md` "for the state, artifact, and invalidation contract". `grep -i "invalidat\|control\|--manifest" pipeline-method.md` prints nothing. The phases, gates, inputs, outputs and invalidations of the control plan are in `references/pipeline-phases.json` (`design-pipeline.control.v1`). | Replace the last sentence with a pointer to `pipeline-phases.json` and to `explain-block`. |
| d | `skill/SKILL.md` lines 34 and 45 | "standard: brief, concepts, draft review (two user decisions)" and "The user decides twice in standard work". `ui` at standard has the stages intake and work only (section 1.2 output). | Limit both to `film`, `edit` and `web`; say `ui` asks for the brief and then goes to the work. About 100 bytes; the file is 4108 bytes now and the limit is 5120. |

Items c and d edit `pipeline-reference.md` and `SKILL.md`, which `b631fcd` changed. Both are now
committed, so nothing waits on that change. Line numbers in this document were checked again at
`b631fcd`: `pipeline-reference.md:558`, `SKILL.md` lines 34 and 45, `cli-core.cjs:406`.

`SKILL.md` has more than one owner over the next changes, so the edit here is kept to two lines: the
`standard` row of the tier table (line 34) and the first sentence of the bullet "The user decides
twice in standard work" (line 45). It does not touch the front matter (`name`, `description`), and it
does not touch the bullets under "Where the details are". Those belong to the changes named in
section 3.

## 2. Decisions

1. `film-edit` label: change it. It appears in error text only. The alternative, leaving the
   label and fixing the seven command hints, would keep an error line that reads like a command
   that does not exist. Default: change it.
2. `ui` intake: own questions, no guide and no new stage. A `ui` guide, stages for concepts and
   review, or a router entry are structure and belong to a later step.
3. The `ui` intake is defined in `workflow-core.cjs`, not in a new module, because that file
   already owns the `ui` stages and a new file would need a guide entry (the `guide` field is
   added for every deliverable listed in `SUB_WORKFLOWS`).
4. The shared `INTAKE` is spread, not copied, so its `question`, `record` and `why` stay in one
   place.
5. Help and guide for `film check` describe existing behaviour. They do not change it.
6. No test reads guide or reference prose. Tests use command output, function results and the
   help text as a list of gate names. The document fixes (1.3 guide, 1.4 b, c, d) are proved by
   reading, and item b by one throwaway comparison of `--help` with the list (T3).
7. No new test file, so `scripts/test-manifest.json` does not change. The `film-edit` case goes
   into `tests/film-edit.test.cjs` (T1), the `film check` help case into
   `tests/film-project.test.cjs` (T2), and the `ui` cases into `tests/workflow-next.test.cjs`
   (T4). Each file has one owner, and each test sits with the fix it proves.

## 3. Interaction with other changes

`add-web-treatment-and-section-briefs` is committed as `b631fcd`, so this change starts from it
and nothing waits. Three of its statements stop being true when the `ui` fix lands:

- its test "film, edit and ui prompts at intake and concepts equal the shared ones"
  (`tests/workflow-next.test.cjs`, line 307) compares `ui` intake with the shared intake;
- its spec sentence "The film, edit and `ui` prompts SHALL NOT change";
- its changelog line "The `ui` deliverable's intake still asks for a duration" (`CHANGELOG.md`
  line 14), and the same leftover noted in its `proposal.md` (Not in scope) and `design.md`
  section 6.

This change edits the test so that `ui` compares with the new intake (film and edit still compare
with the shared one), and edits the changelog line. The proposal and design notes of the other
change stay as history; they described the tree of their day. When both are archived, the
requirement text about `ui` in the web capability is amended in that archive step. `openspec
validate` cannot check this now because that requirement is not in `openspec/specs/` yet, so this
change adds its own requirement and does not use MODIFIED.

Order of the three changes that touch the same front door and help text:

1. `add-web-treatment-and-section-briefs`: committed (`b631fcd`).
2. `fix-tool-guidance-errors` (this change): edits the `film check` help line in `cli-core.cjs`
   (T2, that line only), two lines of `skill/SKILL.md` (T5), and one sentence of
   `pipeline-reference.md` (T5).
3. `add-capability-registry` comes after this change. It only reads the `film check` help line and
   the `## check` section of `workflow-film.md` as they land here. It edits the `.claude` router
   and adds one bullet to `SKILL.md`. The `SKILL.md` front matter and the web bullet belong to
   `add-web-capability-skills`, not to this change.

A router bullet fix is left to the registry change: the `.claude/skills/design-pipeline/SKILL.md`
intake bullets name `product-film-direction.md` for film and `film-edit.md` for edit instead of the
guides `workflow-film.md`, `workflow-edit.md` and `workflow-web.md`. That is a routing choice, not a
plain mistake, and this change does not edit the file.

Each of these changes adds bytes to `skill/SKILL.md`, and the limit is 5120. This change adds about
100. Whoever lands last measures the file (`wc -c`) before closing.

## 4. Left out on purpose

Each was checked or read, and each is a choice about structure, not a plain mistake.

- Three routers and their stage words (`next`/`decide`, `route`/`toolchain`/`execution`,
  `change`/`status`/`plan`/`run`), and `stages.md` numbering.
- `ui` as one `work` stage, with no guide, no concepts, no review.
- 21 commands that appear only in help, 4 documents no other file names, 10 standalone scripts
  with no inbound reference, and the wrappers that repeat CLI commands.
- The four copies of `pipeline-reference.md` (68 to 98 percent of their lines).
- `decide --stage concept` against the stage id `concepts`.
- `film check` does not record the `storyboard` gate that `plan` waits for. `plan` comes first, so
  the order works.
- `control.gates`: `run --to` needs `control.gates[gate] == "passed"` for a phase that lists gates
  (`control-runtime-core.cjs:158`). The only other mention is a copy forward (`:227`). No code
  in `skill/scripts` writes it. This was read, not run. Who should write it is a design decision.
- `.claude` router names `film-edit.md` and `product-film-direction.md` instead of the guides.

## 5. Risks

- The label change alters error text that another tool could match. Nothing in the repository
  does; a caller outside it is possible and not checked.
- The `ui` questions are new wording for a real task. They are guidance, not a gate, and carry no
  claim that they improve results.
- The `ui` test edit (T4) changes a case that the web change added. If that case has been
  edited since `b631fcd`, T4 reads the current text first and keeps film and edit comparing with
  the shared intake.
