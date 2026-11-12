# Appendix: the first rows of the tool list

This file holds the exact first content of `scripts/tool-list.json`: the 142 command rows (Table A), the 11 standalone scripts that have no command (Table B), the 15 guides (Table C) and the 6 scripts that are started by other commands and never run by hand (Table D). The source is two read-only inventories made in the session and kept outside the repository (`inventory-commands.md`, `inventory-docs.md`). Every guide path, script path and stage below was checked against the working tree with a throwaway script; the tables were re-read by a second script that rebuilt every row from them (zero differences); the classification rules of `design.md` section 4 were run over them with no problem found; and a reviewer who did not write them re-checked 45 rows against the code (three false positives of the evidence letters and a few summaries stated too firmly were corrected). On 2026-09-30 the three prototypes in `prototypes/` (`convert-appendix.cjs`, `prove-checks.cjs`, `prove-table.cjs`) were run again at `b631fcd`: the tables convert to a valid tool list with the counts below, the checks report only the three `film edit` hints that step 1 removes, and the command table change of task T6, tried on a copy, gives exactly the 142 rows.

Once the list file exists, it is what the checks read, and this appendix is only a snapshot of where it started.

## How to read the tables

- **class** is one of the six classes an earlier design review asked for (it called them groups). Each maps to exactly one pair of `status` and `exposure` in the tool list:

  | class | means | status | exposure |
  | --- | --- | --- | --- |
  | `public` | public workflow action: `skill/SKILL.md`, the repo skill, a `next` action or a workflow guide sends the author to it | active | public |
  | `expert` | expert or manual tool: works and is listed in the map, but is not a workflow step | active | expert |
  | `internal` | internal dependency: maintainer, release, QA or plumbing work; left out of the author map | active | internal |
  | `alias` | another spelling of an active entry | alias | internal |
  | `deferred` | a stub that refuses to run | deferred | internal |
  | `removal` | a candidate for removal; a maintainer decides, and this change removes nothing | removal-candidate | internal |

- **kind**: `creative-guide`, `generator`, `checker`, `evidence-capture`, `evaluation`, `maintainer-release`, `vendored-upstream` (copied from an outside project).
- **audience**: who uses it: `author` (whoever builds the page or film), `reviewer` (a person who judges or approves), `maintainer`. The tool list also allows `internal`, but no row needs it.
- **deliverables**: `film`, `edit`, `web`, `ui`; `all` means the four; `-` means none (hidden entries only).
- **stages**: pairs written `deliverable:stage` with the workflow's own stage ids. Only `public` rows have them, because the checks can prove them. `-` means the tool is used on demand, at any stage.
- **guide**: the one document under `skill/` to read for it. It teaches the command or the job that uses it, and may name the command only in prose. It may end in `#` and a heading anchor (`references/workflow-film.md#check`); no row uses that yet. `-` means none. An `expert` row with `-` is one of the "no guide yet" rows and carries `noGuide: true`.
- **evidence** is an audit aid, found by a script that also counts prose mentions; it is not a proof (`skill/evals` is not scanned): `N` a `next` action names it; `G` a workflow guide (`workflow-film.md`, `workflow-edit.md`, `workflow-web.md`) names it; `J` `job-registry.json` names it; `D` a dedicated guide names it; `M` only the overlapping hub documents (`pipeline-reference.md`, `pipeline-method.md`, `stages.md`, `feature-routes.md`, `lifecycle.md`) name it; `-` no document under `skill/references` names its command form.
- **flag**: `no-guide` no document names it; `step1` depends on the final wording of step 1 (`fix-tool-guidance-errors`), re-check in task T0; `hide-or-teach` the owner decides whether authors should see it; `unverified` its behaviour past a blocked phase was not run; `which-first` the owner decides which of two versions is the default; `spelling` the guides teach another spelling than the command.
- **id** of a command row: the words joined by `-`, and `verify --gate x` becomes `verify-gate-x`. Scripts are `script-<file without .cjs>`. Guides are `doc-` and the path under `skill/` without a leading `references/`, without the ending `.md` or `/`, each other `/` turned into `-` (`references/workflow-film.md` is `doc-workflow-film`).

## Table A1: classification of the 142 command rows

| # | row | class | kind | audience | deliverables | stages | guide | evidence | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `surface validate` | expert | checker | author | ui | - | references/pipeline-reference.md | M | - |
| 2 | `intake start` | expert | generator | author | ui | - | references/pipeline-reference.md | M | - |
| 3 | `intake answer` | expert | generator | author | ui | - | references/pipeline-reference.md | M | - |
| 4 | `intake confirm` | expert | generator | reviewer | ui | - | references/pipeline-reference.md | M | - |
| 5 | `template inventory` | expert | checker | author | ui | - | references/pipeline-reference.md | M | - |
| 6 | `template search` | expert | generator | author | ui | - | references/pipeline-reference.md | M | - |
| 7 | `template select` | expert | generator | author | ui | - | references/pipeline-reference.md | M | - |
| 8 | `template adapt` | expert | generator | author | ui | - | references/pipeline-reference.md | M | - |
| 9 | `template review` | expert | generator | reviewer | ui | - | references/pipeline-reference.md | M | - |
| 10 | `template approve` | expert | generator | reviewer | ui | - | references/pipeline-reference.md | M | - |
| 11 | `doctor` | internal | maintainer-release | maintainer | - | - | references/qa-checklist.md | D | hide-or-teach |
| 12 | `status` | expert | checker | author | web,ui | - | references/agent-interface.md | D | - |
| 13 | `plan` | expert | generator | author | web,ui | - | references/pipeline-reference.md | M | - |
| 14 | `run` | expert | generator | author | web,ui | - | references/pipeline-reference.md | M | unverified |
| 15 | `resume` | expert | generator | author | web,ui | - | references/pipeline-reference.md | M | - |
| 16 | `explain-block` | expert | checker | author | web,ui | - | references/pipeline-reference.md | M | - |
| 17 | `package` | expert | maintainer-release | author,maintainer | web,ui | - | references/pipeline-reference.md | M | - |
| 18 | `route` | expert | creative-guide | author | film,web,ui | - | references/capability-routing.md | D | - |
| 19 | `change init` | expert | generator | author | web,ui | - | references/agent-interface.md | D | - |
| 20 | `change resume` | alias | checker | author | web,ui | - | - | - | - |
| 21 | `change advance` | expert | generator | author | web,ui | - | references/agent-interface.md | D | - |
| 22 | `change migrate` | internal | maintainer-release | maintainer | - | - | references/agent-interface.md | D | - |
| 23 | `change repair` | internal | maintainer-release | maintainer | - | - | references/agent-interface.md | D | - |
| 24 | `evidence check` | expert | checker | author | web,ui | - | - | - | no-guide |
| 25 | `evidence capture` | expert | evidence-capture | author | web,ui | - | references/pipeline-reference.md | J | - |
| 26 | `verify motion` | expert | checker | author | web,ui | - | references/motion-spec.md | D | - |
| 27 | `verify components` | expert | checker | author | web,ui | - | references/qa-checklist.md | D | - |
| 28 | `verify audio` | expert | checker | author | film,edit | - | references/audio-gate.md | D | - |
| 29 | `verify composition` | public | checker | author,reviewer | all | film:check | references/composition-gate.md | GD | step1 |
| 30 | `verify interaction` | public | checker | author | web | web:probe | references/workflow-web.md | NGD | - |
| 31 | `verify film-storyboard` | public | checker | author | film | film:plan | references/workflow-film.md | NGD | - |
| 32 | `verify film-timeline` | expert | checker | author | film | - | references/hyperframes.md | D | - |
| 33 | `verify film-render` | expert | checker | author | film | - | references/hyperframes.md | D | - |
| 34 | `verify --gate state-coverage` | expert | checker | author | ui | - | - | - | no-guide |
| 35 | `verify --gate interaction-states` | alias | checker | author | ui | - | - | - | - |
| 36 | `verify --gate artifact` | removal | checker | author | ui | - | - | - | - |
| 37 | `verify --gate plan` | removal | checker | author | ui | - | - | - | - |
| 38 | `patterns search` | expert | creative-guide | author | ui | - | - | - | no-guide |
| 39 | `patterns audit` | internal | checker | maintainer | ui | - | - | - | no-guide |
| 40 | `design-system options` | expert | vendored-upstream | author | ui | - | references/pipeline-reference.md | M | - |
| 41 | `design-system resolve-stack` | expert | generator | author | ui | - | references/pipeline-reference.md | M | - |
| 42 | `design-system profiles` | internal | vendored-upstream | maintainer | ui | - | references/pipeline-reference.md | M | - |
| 43 | `design-system normalize` | internal | vendored-upstream | maintainer | ui | - | references/pipeline-reference.md | M | - |
| 44 | `design-system acquire` | internal | evidence-capture | maintainer | ui | - | references/pipeline-reference.md | M | - |
| 45 | `design-system search` | expert | vendored-upstream | author | ui | - | references/pipeline-reference.md | JM | - |
| 46 | `design-system decompose` | expert | generator | author | ui | - | references/pipeline-reference.md | M | - |
| 47 | `design-system route` | expert | generator | author | ui | - | references/pipeline-reference.md | M | - |
| 48 | `design-system project-tokens` | expert | generator | author | ui | - | references/pipeline-reference.md | M | - |
| 49 | `design-system decide` | expert | generator | author | ui | - | references/pipeline-reference.md | M | - |
| 50 | `component decompose` | expert | generator | author | ui | - | references/component-capabilities.md | JD | - |
| 51 | `component providers` | expert | evidence-capture | author | ui | - | references/component-capabilities.md | D | - |
| 52 | `component inventory` | expert | evidence-capture | author | ui | - | references/component-capabilities.md | D | - |
| 53 | `component resolve` | expert | generator | author | ui | - | references/component-capabilities.md | D | - |
| 54 | `component verify` | expert | checker | author | ui | - | references/component-capabilities.md | D | - |
| 55 | `component bind` | expert | generator | author | ui | - | references/component-capabilities.md | D | - |
| 56 | `component lock` | expert | generator | author | ui | - | references/pipeline-reference.md | M | - |
| 57 | `component fit` | expert | generator | author | ui | - | references/pipeline-reference.md | M | - |
| 58 | `component validate-fit` | expert | checker | author | ui | - | references/pipeline-reference.md | M | - |
| 59 | `component decide` | expert | generator | author | ui | - | references/component-capabilities.md | D | - |
| 60 | `component-first check` | expert | checker | author | ui | - | references/pipeline-reference.md | M | - |
| 61 | `component-first stack` | expert | checker | author | ui | - | references/pipeline-reference.md | M | - |
| 62 | `component-first components` | expert | checker | author | ui | - | references/pipeline-reference.md | M | - |
| 63 | `component-first playground` | expert | checker | author | ui | - | references/pipeline-reference.md | M | - |
| 64 | `component-first page` | expert | checker | author | ui | - | references/pipeline-reference.md | M | - |
| 65 | `component-first-v2 check` | expert | checker | author | ui | - | references/pipeline-reference.md | M | which-first |
| 66 | `component-first-v2 migrate` | internal | maintainer-release | maintainer | ui | - | references/pipeline-reference.md | M | - |
| 67 | `component-first-v2 select` | expert | generator | reviewer | ui | - | references/pipeline-reference.md | M | - |
| 68 | `component-first-v2 promote` | expert | generator | reviewer | ui | - | references/pipeline-reference.md | M | - |
| 69 | `design-skill route` | expert | creative-guide | author | ui | - | references/pipeline-reference.md | M | - |
| 70 | `design-skill manifest` | expert | creative-guide | author | ui | - | references/pipeline-reference.md | M | - |
| 71 | `design-skill run` | expert | generator | author | ui | - | references/pipeline-reference.md | M | - |
| 72 | `design-skill select` | expert | generator | reviewer | ui | - | references/pipeline-reference.md | M | - |
| 73 | `design-skill promote` | expert | generator | reviewer | ui | - | references/pipeline-reference.md | M | - |
| 74 | `high-fidelity check` | alias | checker | author | ui | - | - | M | - |
| 75 | `mengto search` | expert | vendored-upstream | author | web,ui | - | references/mengto-skills.md | JD | - |
| 76 | `mengto verify` | internal | vendored-upstream | maintainer | web,ui | - | references/mengto-skills.md | D | - |
| 77 | `shadcnio search` | expert | vendored-upstream | author | ui | - | references/shadcnio-react-components.md | JD | - |
| 78 | `shadcnio verify` | internal | vendored-upstream | maintainer | ui | - | references/shadcnio-react-components.md | D | - |
| 79 | `prism search` | expert | vendored-upstream | author | ui | - | references/prism-system.md | D | - |
| 80 | `prism route` | expert | creative-guide | author | ui | - | references/prism-system.md | JD | - |
| 81 | `prism verify` | internal | vendored-upstream | maintainer | ui | - | references/prism-system.md | D | - |
| 82 | `holosticker inspect` | expert | vendored-upstream | author | web,ui | - | references/holosticker.md | JD | - |
| 83 | `holosticker verify` | internal | vendored-upstream | maintainer | web,ui | - | references/holosticker.md | D | - |
| 84 | `designmd sync` | expert | evidence-capture | author,maintainer | ui | - | references/design-md.md | JD | - |
| 85 | `designmd search` | expert | vendored-upstream | author | ui | - | references/design-md.md | D | - |
| 86 | `designmd inspect` | expert | vendored-upstream | author | ui | - | references/design-md.md | D | - |
| 87 | `designmd verify` | internal | vendored-upstream | maintainer | ui | - | references/design-md.md | D | - |
| 88 | `iart search` | expert | vendored-upstream | author | film,web | - | references/iart-motion-skills.md | D | - |
| 89 | `iart route` | expert | creative-guide | author | film,web | - | references/iart-motion-skills.md | JD | - |
| 90 | `iart verify` | internal | vendored-upstream | maintainer | film,web | - | references/iart-motion-skills.md | D | - |
| 91 | `toolchain resolve` | expert | generator | author | web,ui | - | references/pipeline-reference.md | JD | - |
| 92 | `toolchain probe` | expert | evidence-capture | author | web,ui | - | references/pipeline-reference.md | D | - |
| 93 | `toolchain receipt-check` | expert | checker | author | web,ui | - | - | - | no-guide |
| 94 | `execution route` | expert | generator | author | web,ui | - | references/pipeline-reference.md | M | - |
| 95 | `execution prepare` | expert | generator | author | web,ui | - | references/pipeline-reference.md | M | - |
| 96 | `execution finalize` | expert | checker | author | web,ui | - | - | - | no-guide |
| 97 | `adapter audit` | internal | maintainer-release | maintainer | - | - | references/graphics-runtime-routing.md | D | - |
| 98 | `adapter receipt-check` | expert | checker | author | ui | - | - | - | no-guide |
| 99 | `adapter intake` | internal | checker | maintainer | - | - | references/graphics-runtime-routing.md | D | - |
| 100 | `adaptation check` | internal | maintainer-release | maintainer | - | - | references/adaptation.md | D | - |
| 101 | `adaptation resolve` | internal | maintainer-release | maintainer | - | - | references/adaptation.md | D | - |
| 102 | `adaptation record` | internal | maintainer-release | maintainer | - | - | references/adaptation.md | D | - |
| 103 | `adaptation propose` | internal | maintainer-release | maintainer | - | - | references/adaptation.md | D | - |
| 104 | `adaptation evaluate` | internal | evaluation | maintainer | - | - | references/adaptation.md | D | - |
| 105 | `adaptation promote` | internal | maintainer-release | reviewer,maintainer | - | - | references/adaptation.md | D | - |
| 106 | `adaptation reject` | internal | maintainer-release | maintainer | - | - | references/adaptation.md | D | - |
| 107 | `adaptation rollback` | internal | maintainer-release | maintainer | - | - | references/adaptation.md | D | - |
| 108 | `adaptation forget` | internal | maintainer-release | maintainer | - | - | references/adaptation.md | D | - |
| 109 | `foundation check` | expert | checker | author | web,ui | - | references/design-synthesis.md | - | spelling |
| 110 | `direction check` | expert | checker | author | ui | - | references/direction-preview.md | D | - |
| 111 | `playground check` | expert | checker | author | ui | - | references/playground.md | D | - |
| 112 | `reconciliation check` | expert | checker | author | ui | - | references/reference-spec.md | D | - |
| 113 | `reference check` | expert | checker | author | ui | - | references/reference-spec.md | D | - |
| 114 | `reference resolve` | expert | evidence-capture | author | ui | - | references/reference-spec.md | JD | - |
| 115 | `reconstruction check` | expert | checker | author | ui | - | references/reconstruction-spec.md | D | - |
| 116 | `scene check` | expert | checker | author | web,ui | - | references/scene-runtime-spec.md | D | - |
| 117 | `tokens check` | expert | checker | author | ui | - | - | - | no-guide |
| 118 | `ui-ir check` | expert | checker | author | ui | - | - | - | no-guide |
| 119 | `design-code-map check` | expert | checker | author | ui | - | - | - | no-guide |
| 120 | `film scaffold` | public | generator | author | film | film:plan | references/workflow-film.md | NGD | - |
| 121 | `film capture-timeline` | expert | evidence-capture | author | film | - | - | - | no-guide |
| 122 | `film blender` | public | generator | author | film | film:build | references/film-blender.md | GD | - |
| 123 | `film score` | public | generator | author | film | film:build | references/film-score.md | GD | - |
| 124 | `film blocks` | public | vendored-upstream | author | film | film:build | references/hyperframes.md | GD | - |
| 125 | `film check` | public | checker | author | film | film:check | references/workflow-film.md | NGD | step1 |
| 126 | `audio master` | public | generator | author | film | film:build | references/audio-gate.md | GD | - |
| 127 | `composition capture` | public | evidence-capture | author | all | film:check | references/composition-gate.md | GD | step1 |
| 128 | `next` | public | creative-guide | author | all | - | SKILL.md | NGD | - |
| 129 | `decide` | public | creative-guide | author,reviewer | all | film:intake,film:reference,film:concepts,film:review,film:deliver,edit:intake,edit:style,edit:review,edit:deliver,web:intake,web:reference,web:concepts,web:review,web:deliver,ui:intake,ui:work | SKILL.md | NG | - |
| 130 | `film-edit analyze` | public | generator | author | edit | edit:analyze | references/workflow-edit.md | NGD | - |
| 131 | `film-edit auto` | public | generator | author | edit | edit:cut | references/workflow-edit.md | NGD | - |
| 132 | `film-edit render` | public | generator | author | edit | edit:render | references/workflow-edit.md | NGD | - |
| 133 | `film-edit check` | public | checker | author | edit | edit:check | references/workflow-edit.md | NGD | - |
| 134 | `film-eval measure` | internal | evaluation | maintainer | - | - | evals/film/README.md | - | - |
| 135 | `benchmark brief` | internal | evaluation | maintainer | - | - | evals/film/README.md | - | - |
| 136 | `benchmark evaluate` | internal | evaluation | maintainer | - | - | evals/film/README.md | - | - |
| 137 | `style-signals check` | internal | checker | maintainer | - | - | - | - | no-guide |
| 138 | `feedback record` | internal | maintainer-release | maintainer | - | - | references/feedback-loop.md | - | - |
| 139 | `feedback prepare` | internal | maintainer-release | maintainer | - | - | references/feedback-loop.md | - | - |
| 140 | `feedback reconcile` | internal | maintainer-release | maintainer | - | - | references/feedback-loop.md | - | - |
| 141 | `source audit` | internal | maintainer-release | maintainer | - | - | references/upstream-capability-sync.md | - | - |
| 142 | `source add` | deferred | maintainer-release | maintainer | - | - | - | - | - |

## Table A2: relations (only the rows that have one)

`aliasOf` is the id of the entry an alias repeats. `included in` lists `deliverable:id` pairs of the umbrella command that runs the same check as one of its steps when that step has its inputs (for example `film check` runs the audio check only when the film has sound); partial overlaps are not recorded. `other spellings` are standalone scripts that do the same job; they become the `aliases` of the row.

| row | aliasOf | included in | other spellings |
| --- | --- | --- | --- |
| `status` | - | - | node skill/scripts/check-pipeline-state.cjs |
| `change resume` | status | - | - |
| `change migrate` | - | - | node skill/scripts/migrate-pipeline-state.cjs |
| `evidence check` | - | - | node skill/scripts/check-evidence.cjs |
| `verify motion` | - | - | node skill/scripts/evaluate-motion-evidence.cjs |
| `verify components` | - | - | node skill/scripts/check-component-states.cjs |
| `verify audio` | - | film:film-check,edit:film-edit-check | - |
| `verify film-timeline` | - | film:film-check | - |
| `verify film-render` | - | film:film-check | - |
| `verify --gate interaction-states` | verify-gate-state-coverage | - | - |
| `patterns search` | - | - | node skill/scripts/search-ui-patterns.cjs |
| `patterns audit` | - | - | node skill/scripts/audit-ui-patterns.cjs |
| `component-first stack` | - | ui:component-first-check | - |
| `component-first components` | - | ui:component-first-check | - |
| `component-first playground` | - | ui:component-first-check | - |
| `component-first page` | - | ui:component-first-check | - |
| `high-fidelity check` | component-first-check | - | - |
| `adapter audit` | - | - | node skill/scripts/audit-adapters.cjs |
| `adapter receipt-check` | - | - | node skill/scripts/check-design-tool-receipt.cjs |
| `adapter intake` | - | - | node skill/scripts/evaluate-adapter-intake.cjs |
| `foundation check` | - | - | node skill/scripts/check-design-foundation.cjs,node skill/scripts/check-motion-foundation.cjs |
| `reconciliation check` | - | - | node skill/scripts/check-spec-reconciliation.cjs |
| `reference check` | - | - | node skill/scripts/check-reference-evidence.cjs |
| `reconstruction check` | - | - | node skill/scripts/check-reconstruction.cjs |
| `scene check` | - | - | node skill/scripts/check-scene-runtime.cjs |
| `tokens check` | - | - | node skill/scripts/check-design-tokens.cjs |
| `ui-ir check` | - | - | node skill/scripts/check-ui-ir.cjs |
| `design-code-map check` | - | - | node skill/scripts/check-design-code-map.cjs |
| `film capture-timeline` | - | film:film-check | - |
| `benchmark evaluate` | - | - | node skill/scripts/evaluate-benchmark.cjs |
| `style-signals check` | - | - | node skill/scripts/check-style-signals.cjs |
| `feedback record` | - | - | node skill/scripts/record-feedback.cjs |
| `feedback prepare` | - | - | node skill/scripts/prepare-publication.cjs |
| `feedback reconcile` | - | - | node skill/scripts/reconcile-publication.cjs |
| `source audit` | - | - | node skill/scripts/audit-capabilities.cjs |

## Table A3: group and words for each row

For `public` and `expert` rows the text is the `summary` shown in the map (plain words, at most 160 characters; checked against the code for the 16 public rows, the film check family and a sample of 45 rows). For the other classes it is the `reason` the row is hidden or retired. The group is a map heading, not one of the six classes.

| # | row | group | text |
| --- | --- | --- | --- |
| 1 | `surface validate` | Guided brief and templates | Checks a surface profile: the screens and platforms the work covers. |
| 2 | `intake start` | Guided brief and templates | Starts a guided design brief (a JSON file). Not the intake stage of `next`. |
| 3 | `intake answer` | Guided brief and templates | Records one answer in the guided design brief. |
| 4 | `intake confirm` | Guided brief and templates | Records the user's confirmation of the guided brief; `template select` needs it. |
| 5 | `template inventory` | Guided brief and templates | Checks a catalog of region templates. |
| 6 | `template search` | Guided brief and templates | Finds region templates that fit a surface and a request. |
| 7 | `template select` | Guided brief and templates | Records the chosen template; needs a confirmed brief and a checked direction preview. |
| 8 | `template adapt` | Guided brief and templates | Builds the plan that fits the chosen template to this project. |
| 9 | `template review` | Guided brief and templates | Records a person's review of the adaptation plan. |
| 10 | `template approve` | Guided brief and templates | Records a person's approval of the exact plan content. |
| 11 | `doctor` | Maintainers | Maintainer check of the package and Node version; authors rarely need it. |
| 12 | `status` | Change lifecycle | Shows where an OpenSpec change stands: phase, state checks and what blocks it. |
| 13 | `plan` | Change lifecycle | Turns a change manifest into the phase plan that `run` follows. |
| 14 | `run` | Change lifecycle | Runs a change plan up to a chosen phase and stops at any blocked check. |
| 15 | `resume` | Change lifecycle | Continues a change from its first unfinished phase. |
| 16 | `explain-block` | Change lifecycle | Explains why a change is blocked and what would unblock it. |
| 17 | `package` | Change lifecycle | Bundles a finished change together with the hashes of its evidence. |
| 18 | `route` | Tools and routing | Sends a plain-words request to the matching job and the tool to start with. |
| 19 | `change init` | Change lifecycle | Creates the state and event files for a new OpenSpec change. |
| 20 | `change resume` | Change lifecycle | Runs the same code as `status`; the name suggests it continues work, which the top-level `resume` does. |
| 21 | `change advance` | Change lifecycle | Moves a change to the phase you name if the phase list allows it and records the event with its files; needs the current file hash. |
| 22 | `change migrate` | Maintainers | Maintainer repair of older change state files. |
| 23 | `change repair` | Maintainers | Maintainer repair of a locked or legacy change state. |
| 24 | `evidence check` | Web pages | Checks the record that `evidence capture` writes. |
| 25 | `evidence capture` | Web pages | Opens a page in a browser through an adapter and records the evidence. |
| 26 | `verify motion` | Shared checks | Checks a motion evidence file against the motion rules. |
| 27 | `verify components` | Shared checks | Checks a component state matrix and its evidence files. |
| 28 | `verify audio` | Shared checks | Checks a finished audio file against the audio gate. |
| 29 | `verify composition` | Shared checks | Checks a captured frame and its text boxes (contrast, off-frame text, alignment, hierarchy, type sizes); an optional step after `film check`. |
| 30 | `verify interaction` | Web pages | Tests a page in a real browser with the moves in `interaction.json` and records the result. |
| 31 | `verify film-storyboard` | Film | Checks `storyboard.json` against the storyboard gate and records the result for `next`. |
| 32 | `verify film-timeline` | Film | Checks a captured timeline against the storyboard; `film check` runs this as a step too. |
| 33 | `verify film-render` | Film | Checks a rendered video against the storyboard; `film check` runs this as a step too. |
| 34 | `verify --gate state-coverage` | Change lifecycle | Checks that an interaction-state matrix covers the required states. |
| 35 | `verify --gate interaction-states` | Change lifecycle | Same check as `--gate state-coverage`. |
| 36 | `verify --gate artifact` | Change lifecycle | No test, guide, next action, job, spec requirement or QA step uses it, and the control runtime already runs the same check inside `run`; a maintainer decides. |
| 37 | `verify --gate plan` | Change lifecycle | No test, guide, next action, job, spec requirement or QA step uses it, and the control runtime already runs the same check inside `run`; a maintainer decides. |
| 38 | `patterns search` | Knowledge catalogs | Searches the UI pattern catalog. |
| 39 | `patterns audit` | Knowledge catalogs | No guide names it yet; audits the UI pattern catalog. |
| 40 | `design-system options` | Design systems | Lists the governed styling and UI-library choices. |
| 41 | `design-system resolve-stack` | Design systems | Records the frontend stack decision, tied to a file hash. |
| 42 | `design-system profiles` | Maintainers | Maintainer view of provider compatibility profiles. |
| 43 | `design-system normalize` | Maintainers | Maintainer step that turns a snapshot into the catalog. |
| 44 | `design-system acquire` | Maintainers | Maintainer step that runs a named local provider to fetch a snapshot. |
| 45 | `design-system search` | Design systems | Searches the bundled design-system catalog (Astryx). |
| 46 | `design-system decompose` | Design systems | Lists what a design-system component can do, from the catalog. |
| 47 | `design-system route` | Design systems | Picks a design-system provider for a request. |
| 48 | `design-system project-tokens` | Design systems | Turns design-system tokens into standard token files and reports what was lost. |
| 49 | `design-system decide` | Design systems | Records whether to reference, adopt, substitute or build custom. |
| 50 | `component decompose` | Components | Breaks a component request into named capabilities. |
| 51 | `component providers` | Components | Lists which component providers are installed in the project. |
| 52 | `component inventory` | Components | Lists the components the project already has. |
| 53 | `component resolve` | Components | Maps each needed capability to a provider. |
| 54 | `component verify` | Components | Checks behaviour evidence for a component. |
| 55 | `component bind` | Components | Plans how a chosen provider binds to the framework; writes no source code. |
| 56 | `component lock` | Components | Locks the chosen direction from an approved selection. |
| 57 | `component fit` | Components | Scores how well project, provider and catalog components fit each need. |
| 58 | `component validate-fit` | Components | Checks a fit matrix's own hash and its links to upstream files. |
| 59 | `component decide` | Components | Records, per capability, whether to reuse, adopt, substitute or build. |
| 60 | `component-first check` | Components | Runs the whole component conformance gate: stack, components, playground, page and evidence. |
| 61 | `component-first stack` | Components | Runs only the stack part of the component conformance gate. |
| 62 | `component-first components` | Components | Runs only the components part of the component conformance gate. |
| 63 | `component-first playground` | Components | Runs only the playground part of the component conformance gate. |
| 64 | `component-first page` | Components | Runs only the page part of the component conformance gate. |
| 65 | `component-first-v2 check` | Components | Component conformance gate tied to a snapshot and a policy (version 2). |
| 66 | `component-first-v2 migrate` | Maintainers | Maintainer step that migrates version 1 files to version 2. |
| 67 | `component-first-v2 select` | Components | Records a person's choice of prototype (version 2). |
| 68 | `component-first-v2 promote` | Components | Promotes a chosen prototype after explicit approval (version 2). |
| 69 | `design-skill route` | Components | Routes a request to a design-skill manifest. |
| 70 | `design-skill manifest` | Components | Prints a design-skill manifest. |
| 71 | `design-skill run` | Components | Runs one bounded prototype from a design skill. |
| 72 | `design-skill select` | Components | Records a person's choice of prototype. |
| 73 | `design-skill promote` | Components | Promotes a chosen prototype with a hand-off record. |
| 74 | `high-fidelity check` | Components | Calls `component-first check` and nothing else. |
| 75 | `mengto search` | Knowledge catalogs | Searches the bundled MengTo skills catalog. |
| 76 | `mengto verify` | Maintainers | Maintainer check of the bundled snapshot. |
| 77 | `shadcnio search` | Knowledge catalogs | Searches the bundled shadcn.io component catalog. |
| 78 | `shadcnio verify` | Maintainers | Maintainer check of the bundled snapshot. |
| 79 | `prism search` | Knowledge catalogs | Searches the bundled Prism skills catalog. |
| 80 | `prism route` | Knowledge catalogs | Routes a request to the best Prism skill. |
| 81 | `prism verify` | Maintainers | Maintainer check of the bundled snapshot. |
| 82 | `holosticker inspect` | Knowledge catalogs | Inspects the bundled holographic-sticker skill. |
| 83 | `holosticker verify` | Maintainers | Maintainer check of the bundled snapshot. |
| 84 | `designmd sync` | Knowledge catalogs | Crawls DESIGN.md hubs on the network into the project (needs the network). |
| 85 | `designmd search` | Knowledge catalogs | Searches DESIGN.md examples. |
| 86 | `designmd inspect` | Knowledge catalogs | Shows one DESIGN.md example. |
| 87 | `designmd verify` | Maintainers | Maintainer check of the bundled snapshot. |
| 88 | `iart search` | Knowledge catalogs | Searches the bundled iart motion skills. |
| 89 | `iart route` | Knowledge catalogs | Routes a motion request to the best iart skill. |
| 90 | `iart verify` | Maintainers | Maintainer check of the bundled snapshot. |
| 91 | `toolchain resolve` | Tools and routing | Resolves the tools a job needs into one plan. |
| 92 | `toolchain probe` | Tools and routing | Checks which planned tools exist on this machine. |
| 93 | `toolchain receipt-check` | Tools and routing | Checks a toolchain record file. |
| 94 | `execution route` | Tools and routing | Picks how a planned job is executed. |
| 95 | `execution prepare` | Tools and routing | Prepares the execution state for a routed job. |
| 96 | `execution finalize` | Tools and routing | Finalizes an execution into a record. |
| 97 | `adapter audit` | Maintainers | Maintainer audit of the adapter registry. |
| 98 | `adapter receipt-check` | Tools and routing | Checks a design-tool record file. |
| 99 | `adapter intake` | Maintainers | Maintainer decision on admitting a new adapter. |
| 100 | `adaptation check` | Maintainers | Maintainer loop for review-gated learning. |
| 101 | `adaptation resolve` | Maintainers | Maintainer loop for review-gated learning. |
| 102 | `adaptation record` | Maintainers | Maintainer loop for review-gated learning. |
| 103 | `adaptation propose` | Maintainers | Maintainer loop for review-gated learning. |
| 104 | `adaptation evaluate` | Maintainers | Maintainer loop for review-gated learning. |
| 105 | `adaptation promote` | Maintainers | Maintainer loop; needs explicit approval. |
| 106 | `adaptation reject` | Maintainers | Maintainer loop for review-gated learning. |
| 107 | `adaptation rollback` | Maintainers | Maintainer loop for review-gated learning. |
| 108 | `adaptation forget` | Maintainers | Maintainer loop for review-gated learning. |
| 109 | `foundation check` | Reference, reconstruction and scenes | Checks that DESIGN.md and MOTION.md are ready (`--kind design`, `motion` or `all`). |
| 110 | `direction check` | Reference, reconstruction and scenes | Checks the direction preview file (three visible directions). |
| 111 | `playground check` | Reference, reconstruction and scenes | Checks the playground file. |
| 112 | `reconciliation check` | Reference, reconstruction and scenes | Checks that a change's spec, design and result agree. |
| 113 | `reference check` | Reference, reconstruction and scenes | Checks reference evidence for a change, including the reconciliation result. |
| 114 | `reference resolve` | Reference, reconstruction and scenes | Turns a visual source path into reference evidence. |
| 115 | `reconstruction check` | Reference, reconstruction and scenes | Checks a reconstruction against its reference; exit 3 means limited fidelity. |
| 116 | `scene check` | Reference, reconstruction and scenes | Checks a 2D or 3D scene file. |
| 117 | `tokens check` | Interchange checks | Checks a design-tokens file. |
| 118 | `ui-ir check` | Interchange checks | Checks a UI intermediate-representation file against the pattern catalog. |
| 119 | `design-code-map check` | Interchange checks | Checks a design-to-code map. |
| 120 | `film scaffold` | Film | Starts a film project with a passing storyboard and a composition with one call per beat. |
| 121 | `film capture-timeline` | Film | Records a timeline from a composition or preview page; `film check` does this itself. |
| 122 | `film blender` | Film | Renders a 3D product shot in Blender; with no template it lists the templates. |
| 123 | `film score` | Film | Writes music as code and renders it to audio. |
| 124 | `film blocks` | Film | Searches the HyperFrames catalog for ready-made blocks and transitions. |
| 125 | `film check` | Film | Runs every film gate on the draft (storyboard, score grid, timeline, render, sound, frame layout, carry) and records the result for `next`. |
| 126 | `audio master` | Film | Masters audio to a loudness target with fades. |
| 127 | `composition capture` | Shared checks | Captures a page or frame with the boxes of its text so `verify composition` can check them; an optional step after `film check`. |
| 128 | `next` | Start and decide | Returns the one next step for the project. |
| 129 | `decide` | Start and decide | Records a user decision: intake answers, concept, reference, review verdict or delivery. |
| 130 | `film-edit analyze` | Edit | Finds the beat grid in the music and the shots in the footage. |
| 131 | `film-edit auto` | Edit | Cuts the shots to the beat grid into `edit.json`, in the `mad` or `pv` style. |
| 132 | `film-edit render` | Edit | Renders `edit.json` to `renders/edit.mp4`. |
| 133 | `film-edit check` | Edit | Checks the edit, then runs the render, audio and layout gates, and records the result for `next`. |
| 134 | `film-eval measure` | Maintainers | Maintainer benchmark step. |
| 135 | `benchmark brief` | Maintainers | Maintainer benchmark step. |
| 136 | `benchmark evaluate` | Maintainers | Maintainer benchmark step. |
| 137 | `style-signals check` | Maintainers | Run by `scripts/qa.cjs`; no guide names it. |
| 138 | `feedback record` | Maintainers | Maintainer feedback loop; the guide teaches the script form. |
| 139 | `feedback prepare` | Maintainers | Maintainer feedback loop; the guide teaches the script form. |
| 140 | `feedback reconcile` | Maintainers | Maintainer feedback loop; the guide teaches the script form. |
| 141 | `source audit` | Maintainers | Maintainer audit of upstream sources; the guide teaches the script form. |
| 142 | `source add` | Maintainers | Stub that always refuses (COMMAND_DEFERRED); not listed in help. |

## Table B: standalone scripts with no command

The official form is the script, run as `node skill/scripts/<file>`. The group is the map heading. The text is a summary for `expert` rows and a reason for `internal` rows.

| script | class | kind | audience | deliverables | guide | group | text |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `init-design-synthesis.cjs` | expert | generator | author | ui | references/design-synthesis.md | Design synthesis | Starts a requirements-driven DESIGN.md synthesis for a project. |
| `advance-design-synthesis.cjs` | expert | checker | author | ui | references/design-synthesis.md | Design synthesis | Moves the DESIGN.md synthesis on when a step is done (for example `grill-completed` or `design-generated`). |
| `init-website-clone.cjs` | expert | generator | author | ui | references/website-cloning.md | Website cloning | Starts a website-clone change with its manifest and its reconciliation and reconstruction checks. |
| `check-website-clone-foundations.cjs` | expert | checker | author | ui | references/website-cloning.md | Website cloning | Checks that DESIGN.md, MOTION.md and the palette are ready for a clone change. |
| `evaluate-website-clone.cjs` | expert | evaluation | author | ui | references/website-cloning.md | Website cloning | Judges a finished clone against its manifest; the only path that may mark a clone complete. |
| `check-palette-foundation.cjs` | internal | checker | author | ui | - | Maintainers | Used inside `check-website-clone-foundations`; no guide names it. |
| `evaluate-anti-slop.cjs` | expert | checker | reviewer | web,ui | references/anti-slop-review.md | Review | Runs the anti-slop review over an evidence file and fails on hard findings. |
| `vite-devtools-adapter.cjs` | expert | evidence-capture | author | web,ui | references/vite-devtools.md | Web pages | Probes, starts, stops or builds a Vite project and records DevTools evidence. |
| `check-deps.cjs` | internal | maintainer-release | maintainer | - | references/self-check.md | Maintainers | Maintainer self-check of companion skills and tools. |
| `github.cjs` | internal | maintainer-release | maintainer | - | references/pipeline-reference.md | Maintainers | Maintainer helper for pull-request snapshots, threads and CI failures; needs `gh`. |
| `validate-evals.cjs` | internal | evaluation | maintainer | - | - | Maintainers | Run by tests; validates the skill routing cases. |

## Table C: guides

The 13 documents that `skill/SKILL.md`, the repo skill or a `next` action name, plus the kit directory that `SKILL.md` names, plus the generated map itself. `SKILL.md` and the repo skill name the map once task T4 is done, so it is a `public` guide with no stage; the checks prove it only by that naming. Stages were read from the workflow guide sections and from the real `next` actions (an empty project and a project that already has every trigger file, all tiers, brief and replicate modes). `film-edit.md` carries no stage: the edit guide names it only in its opening line.

| document | kind | audience | deliverables | stages | group | text |
| --- | --- | --- | --- | --- | --- | --- |
| `references/workflow-film.md` | creative-guide | author | film | film:intake,film:reference,film:concepts,film:plan,film:build,film:check,film:review,film:deliver | Film | Stage-by-stage guide for a film: what to do, which command to run, what finishes each stage. |
| `references/workflow-edit.md` | creative-guide | author | edit | edit:intake,edit:analyze,edit:reference,edit:style,edit:cut,edit:render,edit:check,edit:review,edit:deliver | Edit | Stage-by-stage guide for a PV or MAD edit. |
| `references/workflow-web.md` | creative-guide | author | web | web:intake,web:reference,web:concepts,web:build,web:probe,web:review,web:deliver | Web pages | Stage-by-stage guide for a motion web page. |
| `references/product-film-direction.md` | creative-guide | author,reviewer | film | film:intake,film:plan,film:review | Film | How to direct a product film: treatment, storyboard, review rules R1 to R7 and the music-driven section. |
| `references/hyperframes.md` | generator | author | film | film:build | Film | How to build a film's plates with HyperFrames: compositions, blocks and the instrument kit. |
| `references/film-blender.md` | generator | author | film | film:build | Film | How to make 3D product shots with Blender templates. |
| `references/film-score.md` | generator | author | film | film:build | Film | How to write music as code and bind its hits to the film's beats. |
| `references/audio-gate.md` | checker | author | film | film:build | Film | The audio gate: what it checks and how to master audio. |
| `references/composition-gate.md` | checker | author | all | film:check | Shared checks | The composition gate: how to capture a frame and what the layout check finds. |
| `references/film-edit.md` | generator | author | edit | - | Edit | Command reference for beat-cut edits: analyze, auto, render, check. |
| `references/pipeline-reference.md` | creative-guide | author,reviewer,maintainer | web,ui | web:build,ui:work | UI and web | Full stage contracts for UI, web and full-tier work, with the route map and command reference. |
| `references/web-direction.md` | creative-guide | author,reviewer | web | web:concepts,web:build,web:probe,web:review | Web pages | Web treatment, section briefs and review rules W1 to W7. |
| `references/web-motion.md` | creative-guide | author | web | web:build | Web pages | Motion rules for web pages: spring-damper settings and stepped motion as a style. |
| `references/film-choreography/` | generator | author | film | film:plan,film:build | Film | The project-owned kit that `film scaffold` copies into a film: patterns, audio events, instrument chrome and the timeline probe. |
| `references/tool-map.md` | creative-guide | author,maintainer | all | - | Start and decide | This map: which tool or guide to use at which stage, generated from the tool list. |

## Table D: scripts started by other commands

These are the scripts under `skill/scripts` that have a first line starting with `#!`, are neither the official form of an entry nor a spelling in `aliases`, and are started by a command or are the command line itself. They go in the top-level `internalScripts` list, so that a new script cannot appear without someone saying what it is.

| script | reason |
| --- | --- |
| `designer-pipeline.cjs` | The command line itself; authors run it through the documented commands. |
| `capture-composition.cjs` | Started by `composition capture`; not run by hand. |
| `capture-film-timeline.cjs` | Started by `film capture-timeline` and `film check`; not run by hand. |
| `capture-interaction.cjs` | Started by `verify interaction`; not run by hand. |
| `capture-web-evidence.cjs` | Started by `evidence capture`; not run by hand. |
| `render-score.cjs` | Started by `film score`; not run by hand. |

## Counts

**The 142 command rows, by class:**

| class | rows |
| --- | --- |
| public workflow action | 16 |
| expert or manual tool | 87 (of which 10 have no guide yet) |
| internal dependency | 33 |
| alias | 3 |
| deferred stub | 1 |
| removal candidate | 2 |
| **total** | **142** |

**By status:** active 136, alias 3, deferred 1, removal-candidate 2. **By exposure:** public 16, expert 87, internal 39 (the 33 internal dependencies, the 3 aliases, the deferred stub and the 2 removal candidates).

**By kind:** checker 45, generator 39, maintainer-release 19, vendored-upstream 18, evidence-capture 9, creative-guide 8, evaluation 4. (The inventory counted 19 vendored-upstream and 7 creative-playbook rows; `patterns search` moved from the first to the second because its catalog is project-owned.)

**Audience mentions** (a row can have two): author 101, reviewer 10, maintainer 36. **Deliverable mentions:** ui 100, web 34, film 19, edit 9, none 23 (hidden maintainer rows).

**Command rows that no guide under `skill/references` names:** 25 rows have evidence `-`: 2 aliases (`change resume`, `verify --gate interaction-states`), 2 removal candidates (`verify --gate artifact`, `verify --gate plan`), 11 expert rows (`evidence check`, `verify --gate state-coverage`, `patterns search`, `toolchain receipt-check`, `execution finalize`, `adapter receipt-check`, `foundation check`, `tokens check`, `ui-ir check`, `design-code-map check`, `film capture-timeline`; ten of them have no guide at all and `foundation check` has a guide that teaches script forms), 9 internal rows (`patterns audit`, `film-eval measure`, `benchmark brief`, `benchmark evaluate`, `style-signals check`, `feedback record`, `feedback prepare`, `feedback reconcile`, `source audit`; the guides of `feedback` and `source audit` teach script forms and `skill/evals/film/README.md` names the benchmark rows) and the deferred `source add`. The inventory counted 21 because it treated `skill/evals` as a document and counted the classes differently.

**The whole first tool list:** 168 entries = 142 command rows + 11 scripts + 15 guides, plus 6 lines in `internalScripts`. By class: public 31 (16 rows and 15 guides), expert 94 (87 rows and 7 scripts), internal 37 (33 rows and 4 scripts), alias 3, deferred 1, removal candidate 2.

**Why two rows are removal candidates and the others are not.** A row belongs there only when nothing uses it (no test, guide, `next` action, job, spec requirement or QA step), another entry already does its job, and a maintainer agrees. `verify --gate artifact` and `verify --gate plan` meet the first two tests on evidence: a search of `tests/`, `scripts/qa.cjs`, `README.md`, the shipped guides and the base spec finds no use (`--gate` appears in no test at all); after step 1 the only mention outside the code is one line of the command list in `docs/cli-and-reference-providers.md`; `add-evidence-driven-design-runtime` names only the generic form `verify --gate <gate>` and requires only its interaction-state gate; and the same checks already run inside the control runtime (`control-runtime-core.cjs:28` runs `validatePlan` with `requireRunnable`; its lines 80, 153 and 279 run `validateArtifactMetadata`). The third test is a maintainer's, so they are candidates and not decisions. Every other row that only the help lists has some use: `verify --gate state-coverage` implements the interaction-state gate that the same spec requires (no test runs the command; `tests/design-control-runtime.test.cjs` calls the check function); `evidence check`, `patterns search`, `patterns audit`, `adapter receipt-check`, `tokens check`, `ui-ir check`, `design-code-map check` and `feedback` x3 are run by `tests/designer-pipeline-cli.test.cjs`, and the base spec requires design files to interoperate through public data contracts; `execution finalize`, `film capture-timeline`, `source audit` and `film-eval measure` each have a test; `toolchain receipt-check` appears in `README.md` (no test); `style-signals check`, `foundation check` and `doctor` are run by `scripts/qa.cjs`. The only other evidence-backed candidates are ten wrapper scripts that no file references and that repeat a command already in the table: `audit-ui-patterns`, `search-ui-patterns`, `check-design-code-map`, `check-design-tokens`, `check-ui-ir`, `check-evidence`, `check-pipeline-state`, `migrate-pipeline-state`, `check-scene-runtime`, `evaluate-benchmark` (all `.cjs` files in `skill/scripts`). They are scripts, not command rows, so they stay recorded as `aliases` of their command; removing them is a separate decision.

**The 33 internal dependencies, by reason:** adaptation loop (maintainers): 9; snapshot checks of bundled catalogs (`mengto`, `shadcnio`, `prism`, `holosticker`, `designmd`, `iart` `verify`): 6; design-system maintenance (`profiles`, `normalize`, `acquire`): 3; adapter checks (`adapter audit`, `adapter intake`): 2; feedback and source loop (`feedback` x3, `source audit`): 4; benchmarks (`film-eval measure`, `benchmark brief`, `benchmark evaluate`): 3; change repair (`change migrate`, `change repair`): 2; single rows: `doctor`, `component-first-v2 migrate`, `patterns audit`, `style-signals check`: 4.

## Watch list: rows that need an owner decision

| flag | rows | decision |
| --- | --- | --- |
| `removal` | `verify --gate artifact`, `verify --gate plan` | Remove them, or write a guide and a test. Default: keep them until a maintainer decides; this change removes nothing. |
| `no-guide` | `evidence check`, `verify --gate state-coverage`, `patterns search`, `toolchain receipt-check`, `execution finalize`, `adapter receipt-check`, `tokens check`, `ui-ir check`, `design-code-map check`, `film capture-timeline`; hidden: `patterns audit`, `style-signals check`, `script-check-palette-foundation`, `script-validate-evals` | Write a guide and drop `noGuide`, or hide the row as internal with a reason. Default: shown with "no guide yet". |
| `hide-or-teach` | `doctor` | Default hidden: it checks the package. Authors with a broken install may need it. |
| `spelling` | `foundation check` | The guides teach `node skill/scripts/check-design-foundation.cjs` and `check-motion-foundation.cjs`. Default: the command is official, the scripts are aliases, the guides are fixed later. |
| `which-first` | `component-first-v2 check` | Both `component-first check` (version 1) and this row stay expert; no guide says which an author runs first. |
| `unverified` | `run` | `run` cannot pass a phase whose gate has no writer (`control.gates`); this was read in code, not run. |
| `step1` | `verify composition`, `composition capture`, `film check` | Step 1 rewrites the film guide's `## check` section and the `film check` help line, and keeps the two composition rows there as an optional step that adds the text checks. They are `public` only while the guide still names them; if it stops, they become `expert` by a data edit. The `film check` summary must match the final wording. |

## Turning the tables into the list file

The tables are strict on purpose so a script can convert them (task T2). The prototype `prototypes/convert-appendix.cjs` does exactly this and validates the result: run it first (`node openspec/changes/add-capability-registry/prototypes/convert-appendix.cjs <out.json>`) and read its source before writing anything of your own.

1. Split each table row on ` | ` after removing the leading `|` and trailing `|`; strip backticks from the `row`, `script` and `document` cells. No cell contains a pipe.
2. Read `-` as empty. Read `all` in `deliverables` as `film,edit,web,ui`. Split list cells on `,`; in `included in` split each item on the first `:`.
3. Map `class` to `status` and `exposure` with the table above; map audience words as written.
4. `guide`: `-` on an `expert` row becomes `"noGuide": true`; on other rows it means no guide.
5. Take `group` and the text from A3 (rows), B and C. The text is `summary` for `public` and `expert` rows and `reason` for the others. The `summary` of a document is the text of Table C.
6. Build `official` from the row (`{"command": row}`), from the script (`{"script": file}`) or from the document (`{"doc": path}`), and `id` by the rule above. Take `aliasOf`, `includedIn` (an object `{"film": "film-check"}`) and `aliases` from A2; `aliasOf` is already an id.
7. Put the rows of Table D in the top-level `internalScripts` as `{ "script": file, "reason": text }`.
8. Order: Table A1 order for rows, then Table B, then Table C. Set the top-level `groups` to the 18 groups in the order of `design.md` section 4.3.
9. Run `node scripts/tool-list.cjs --check`. The only problems allowed at this point are the ones caused by the map not existing yet and by T4 not having landed: `OFFICIAL_MISSING` for `doc-tool-map`, `MAP_STALE`, and `GUIDE_UNNAMED` for the map and `SKILL_NAMES` for the three workflow guides that the repo skill does not name yet. T4 removes the `SKILL_NAMES` and `GUIDE_UNNAMED` problems; T3 removes the rest by running `--write`, which writes the map first and checks afterwards.

After that first conversion the appendix is not edited again.
