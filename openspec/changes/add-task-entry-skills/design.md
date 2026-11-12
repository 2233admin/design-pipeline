# Design

This change adds five short skills, one for each thing a person wants to do: make something new, take a reference apart, try a few directions or a rough sample, check a finished piece, continue a job. It also shrinks `skill/SKILL.md` into an index that says where to start. Nothing is built yet: no entry file, installer edit, test, package-list line or changelog line exists. The entry names are draft names: they are confirmed only after a person has run the sample sentences on the real hosts (D17). **Nothing about real triggering is verified:** no host and no model has been asked which entry loads for any sentence.

Follows `AGENTS.md` and `openspec/project.md`. Every decision below can be reversed, and each has its reason. Words are plain on purpose (`skill/references/plain-language.md`). Facts were read from the working tree at `b631fcd` plus the uncommitted edits of `fix-tool-guidance-errors`, or measured on 2026-09-30 and 2026-10-01 with throwaway scripts and host probes that ran outside the repository and changed nothing in it. Each fact names its source and says whether it was seen (read), run, or only reported. The letters A1 to A5 and L1 to L9 name the items of the skill-creator audit that this design follows (A1 to A5, L1, L2 and L9 are applied here; L3 to L8 are named follow-ups in `tasks.md`).

## 0. Words used

| Word | Meaning here |
| --- | --- |
| host | a program that runs an agent and shows it a list of skills: omp, Claude Code, Codex |
| skill | a folder with a `SKILL.md`. The host shows the model its name and description; it loads the body when the user's words match the description |
| listing | the list of skill names and descriptions that a host puts in front of the model. On a machine with many skills a host cuts descriptions short or leaves some out |
| index skill | `skill/SKILL.md`, named `design-pipeline`. It is the only skill the package has today; after this change it says where to start |
| front door | `skill/SKILL.md` plus the guides it names. The tests read it |
| entry skill | a thin skill named for one user task: `dp-create`, `dp-reference`, `dp-preview`, `dp-review`, `dp-resume` |
| hand over | an entry names an existing command or guide and stops there. It holds no rule of its own |
| locator sentence | the one sentence in an entry that tells the agent how to find the `design-pipeline` folder |
| medium | what the work is: film (also 3D shots and a film score), edit (PV, MAD, beat montage), web page, UI. `next` calls it the deliverable |
| tier | how big the job is: quick, standard or full (`skill/SKILL.md`) |
| mode | whether a reference is given: brief (none needed), replicate (reproduce it), freeform (no direction) |
| stage | one step of `next`, such as `intake`, `reference`, `concepts`, `style`, `plan`, `build`, `check`, `probe`, `review`, `deliver`; the workflow guides describe each |
| project state | `.design-pipeline/state.json`, which `next` writes in a user's project |
| change folder | an OpenSpec change folder that holds `state.json` and `events.jsonl`. Someone working at the `full` tier of web or `ui` has one (`next` tells them to open it), and so does a maintainer of this repository. `status`, `resume` and `explain-block` read it |
| gate | an automatic check that finds known failure shapes. It never grants creative acceptance. (The plan's "T0 gate" is a different thing: a first task that reads the tree and can stop the work.) |
| Visual Acceptance | a person looked and accepted. Agents never record it |
| entry command | one of the three commands that decide what happens next: `next` (with `decide`), `route` (with `toolchain` and `execution`), and the change commands `status`, `plan`, `run`. This change adds no fourth. The brief called them routers |
| fan-out | the installer copies each entry into its own folder next to the main skill |
| install marker | a small file, `.installed-by-design-pipeline.json`, that the installer writes into every folder it installs. It says that this package put the folder there; the installer replaces an entry folder only when it finds that marker (7.3) |
| allow-list | the rule for which `SKILL.md` files may exist under `skill/`: `skill/SKILL.md` and one file per folder under `skill/.entries/`. The entry test states it with the exact five names; the surface test states it as a folder rule with no names (7.5) |
| near-miss | a sentence that looks like it fits an entry and must not trigger it |
| trigger | the host loads a skill because the user's words match its description |

Terms of the tool that the tables below use without more words: a storyboard (`storyboard.json`) is a film's shot plan; a probe is a small test of how a page answers input; replicate mode reproduces a given reference; a concept card is one of the three ideas that the `concepts` stage asks for. The workflow guides define them.

## 1. Relation to other work and order

**Nothing can start until `fix-tool-guidance-errors` and `add-web-capability-skills` (Phase A) are committed.** None of them was committed when this was written, except `add-web-treatment-and-section-briefs`. Task T0 stops and reports if they are missing, and the user decides. The user may waive the order. The cost is either a reshaped `skill/SKILL.md` between the two packaged commits that `add-web-capability-skills` compares (it says a stray commit there must be avoided or declared, its D4), or a second edit of the index later.

Five other drafts are open and not approved: `fix-tool-guidance-errors`, `add-capability-registry`, `add-web-capability-skills`, `align-workflow-lifecycle` and `add-web-composition-checks`. This change edits none of their files. It reads them, and it names here the shared files and who edits them first.

- **Lands after** `fix-tool-guidance-errors` and `add-web-capability-skills`. Reason: `add-web-capability-skills` compares two packaged commits of the skill to test web guides. It also rewrites the front-door description once and adds four structure checks to `tests/claude-code-surface.test.cjs`; this change replaces that description and adjusts one of those checks.
- **May land before or after** `add-capability-registry`. If the registry is not there yet, slice T5 waits (Q9) and the rest goes on.
- **The lifecycle change** (`align-workflow-lifecycle`) edits the tier row and the decision line of `skill/SKILL.md` in its closing slice S10. Either order works: whoever lands second moves those lines to the file that holds them then (the tier and mode tables move to `dp-create`).
- **The registry change** (`add-capability-registry`) edits `skill/SKILL.md` (one bullet) and the repo router (three route bullets and one line). This change keeps that bullet in the index and edits the router after it.
- **Task T0** also repeats the Codex probes of F3 (a to d) and F4 with the Codex that is installed then, and stops when a hidden folder is now listed or a shared file differs from the table below. If the F4 probe now agrees with F13 of `add-web-capability-skills`, T0 reports it; the rules of 9.4 are already strict and stay.

| Shared file | Edited before this change by | What this change does to it |
| --- | --- | --- |
| `skill/SKILL.md` | `fix-tool-guidance-errors` (tier row, decision line), `add-capability-registry` (one bullet), `add-web-capability-skills` (description, web bullet), `align-workflow-lifecycle` S10 (tier row, decision line) | moves the loop, the first-call tables and "Talking to the user" to `dp-create`, replaces the description, adds the task table and the fallback sentence; keeps "Where the details are" and "Always" |
| `.claude/skills/design-pipeline/SKILL.md` (the repo router) | `add-capability-registry` (four lines), `add-web-capability-skills` Phase B (one bullet) | three small edits (7.6) |
| `tests/claude-code-surface.test.cjs` | `add-web-capability-skills` T3 (one test, four checks) | changes one check from "exactly `skill/SKILL.md`" to an allow-list |
| the spec of `add-web-capability-skills` (`specs/web-workflow`) | its own change | its rule "`skill/SKILL.md` alone" and this change's allow-list disagree once both are archived; T6 reconciles them (section 11) |
| `skill/references/package-resources.json` | every change that adds a load-bearing file | five lines in `required` |
| `scripts/tool-list.cjs`, `tests/tool-list.test.cjs`, `skill/references/tool-map.md` | `add-capability-registry` (creates them) | slice T5 only, after they exist |
| `CHANGELOG.md`, `README.md`, `CONTRIBUTING.md` | several | one entry, one section, one paragraph |

## 2. Facts

| # | Fact | Source | Status |
| --- | --- | --- | --- |
| F1 | omp discovers `<skills-root>/<name>/SKILL.md` and nothing deeper. It offers `/skill:<name>`. Two skills with one name: the first by provider order wins and a warning is printed. The `agents` provider reads `~/.agents/skills`. | `omp://skills.md` | seen (harness document) |
| F2 | Claude Code (2.1.267 installed) discovers `<skills>/<name>/SKILL.md` and invokes it as `/<name>`. It cuts the description plus `when_to_use` at 1,536 characters. When its listing is over its budget (1% of the model's context window) it drops the descriptions of the least-invoked skills, so a new skill is the first to lose its description. For one name, a personal skill beats a project skill. A skill folder that uses keys outside `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` cannot be uploaded to claude.ai. Folders inside a skill folder: the page is silent, and the draft `add-web-capability-skills` cites a maintainer saying they are not supported. | code.claude.com/docs/en/skills | seen (docs); nested folders reported, not run |
| F3 | Codex CLI 0.155.0, probed through `codex app-server` (`skills/list`) and `codex debug prompt-input` with a temporary `CODEX_HOME` and no model call. (a) A nested `SKILL.md` is listed down to six folders below the skills root. (b) Two skills with the same name, one nested and one beside the main skill, are both listed. (c) A folder whose name starts with a dot is not searched: `.entries` was not listed; `_entries`, `entries`, `node_modules` and `upstream` were. (d) The prompt shows only the start of each description, shorter as skills grow: six skills gave 106 characters, forty gave 78 to 80, one hundred and twenty gave 44 to 46, and this machine's 147 skills gave 55 to 64. | probes of 2026-09-30 (Appendix A) | run |
| F4 | Same probe, frontmatter. A colon followed by a space inside a description was listed whole (`a: b: c`, `NOT: x`). A space then `#` cut the description at the hash. A description that ended with a colon was dropped (`invalid YAML: mapping values are not allowed in this context`). A description of 1,025 characters was listed whole. `add-web-capability-skills` (its F13) says a colon-plus-space drops the skill and more than 1,024 characters is rejected. I could not reproduce that, and the Codex build used there is not stated. The strict rules below stay anyway: they cost nothing and other parsers are stricter. | probe of 2026-09-30 | run; differs from a sibling draft |
| F5 | This machine's lists are crowded. `~/.claude/skills` holds 196 skills with 27,740 description characters in total (average 142, longest 737). Codex lists 147. Today's `design-pipeline` description has 405 characters. The six description texts of this design (five entries and the index) add 2,748 characters, 2,343 more. | script over `~/.claude/skills`; Codex probe | run |
| F6 | Neighbours here (read-only): `review`, `code-review`, `design-review`, `plan-design-review`, `qa`, `prototype`, `design-shotgun`, `design-an-interface`, `context-restore`, `context-save`, `handoff`. No name starting with `dp-` exists in `~/.claude/skills`, `~/.agents/skills`, `~/.codex/skills` or the Claude plugin cache. `CONTRIBUTING.md` ("Naming Conflicts") already prefers a clear prefix. A shipped description must not name these skills; a user may not have them. | directory listings | seen |
| F7 | `skill/SKILL.md` today: 77 lines and 4,293 bytes in the working tree (76 and 4,108 at `HEAD`); description 405 characters with no "not for" part; it drives only the `next` loop. | file | seen |
| F8 | Tests tied to the front door: `tests/helpers/skill-surface.cjs` builds the front door from `skill/SKILL.md` plus every backticked `references/*.md` it names; eight test files assert positive strings on it (`animation-opportunity-reference`, `deepclonewebsite-reference`, `direction-preview`, `interface-discipline`, `plain-language`, `skill-cli-handoff`, `skill-evals`, `victor-design-guidance`). `tests/hyperframes-routing.test.cjs` reads `skill/SKILL.md` directly and needs `references/product-film-direction.md` in it. `scripts/qa.cjs` needs the name `design-pipeline` in its frontmatter. I scanned the nine simple `assert.match` and `includes` assertions of the eight tests: none depends on the loop, the first-call tables or "Talking to the user", the text that moves out of the index. | tests, `qa.cjs`; scan of 2026-09-30 | seen, run (the scan was simple: dynamic patterns were not evaluated) |
| F9 | No current test forbids another `SKILL.md`. `tests/claude-code-surface.test.cjs` pins only the repo router. Hundreds of vendored `SKILL.md` files ship under `skill/references/*/upstream/`; `skill/SKILL.md` is the only one outside them. The check "exactly `skill/SKILL.md`" is planned by `add-web-capability-skills` T3 and has not landed. | file search; tasks | seen |
| F10 | `scripts/package.cjs` ships every entry under `skill/`, dot folders included (run on a skeleton: `.entries/<name>/SKILL.md` reached the archive and `required` accepted it, with no code change). `required` in `package-resources.json` is enforced by `package.cjs`, `qa.cjs` and `doctor`. `scripts/install-local.cjs` installs one folder to `<root>/design-pipeline`: copy, run `doctor` on the copy, rename with a backup. It refuses a link as target and refuses an existing target without `--replace`. The archive root is `design-pipeline/`, and the archive gets a generated `PACKAGE.json` (name, version); `skill/` itself has none, and the repository root has a `VERSION` file. The README documents a Codex install only. | scripts; skeleton run | seen, run |
| F11 | `next` is read-only and gives the same answer twice when a state file exists. It returns `line` ("web/standard: intake (1/7) - ..."), `completed`, `remaining`, and, when they apply, `guide` (film, edit, web only) and `rules`. With no state and no `--deliverable` it asks "What are we making, and how big is it?". `next --deliverable ...` on a folder that already has state fails with `OUTPUT_EXISTS` unless `--replace` is given. | `workflow-core.cjs`; run on a temporary project | run |
| F12 | `status`, `resume` and `explain-block` take `--change-root`. Pointed at a `next` project's `.design-pipeline` folder they answer `UNKNOWN_SCHEMA` (`design-pipeline.workflow-state.v1`). `status` and `explain-block` only read. `resume` needs `plan.json` in the change folder, runs the plan to the first unfinished phase, and writes an event and the state file. | `cli-core.cjs`, `control-runtime-core.cjs`; run | run, read |
| F13 | `verify film-storyboard`, `verify interaction`, `film check` and `film-edit check` write their result into `.design-pipeline/state.json` when that file exists (`recordGate`), so `next` then counts the step as done while the files stay unchanged. | `cli-core.cjs` | read |
| F14 | `direction check --stage preview\|selection` and `playground check --stage build\|selection\|integration` are checks only, on any folder given as `--change-root`; on an empty folder they answer `blocked` (`direction-preview-missing`, `playground-receipt-missing`). Nothing generates the artifacts: the agent builds them by hand from `direction-preview.md` and `playground.md`. No `next` stage mentions either (searched `skill/scripts/workflows` and `workflow-core.cjs`). | run; search | run |
| F15 | `film score` refuses to run without `storyboard.json` ("the score is timed to it"). `film blender` renders inside a film project and does not need a storyboard. There is no music-only flow and no 3D-only flow. | `score-project-core.cjs`, `blender-project-core.cjs`, `film-blender.md` | read |
| F16 | Stage lists (`skill/scripts/workflows/*.cjs`, `workflow-core.cjs`). film: quick plan, build, check (replicate adds reference first); standard and full intake, reference, concepts, plan, build, check, review, deliver. edit: quick analyze, cut, render, check; standard and full intake, analyze, style, cut, render, check, review, deliver; replicate adds reference after analyze. web: quick build, probe; standard and full intake, reference, concepts, build, probe, review, deliver. ui: quick work; standard and full intake, work; no gate. The one `ui` stage `work` finishes only when `decide --stage deliver` is recorded, so a `ui` job cannot finish in `next` without delivery. Film, edit and web at quick have no deliver stage. | files | read |
| F17 | The repo router `.claude/skills/design-pipeline/SKILL.md` has the same name as the index. Claude Code: a personal skill beats a project skill. omp: the `claude` provider (priority 80) beats `agents` (70), so inside this repository omp shows the router and elsewhere the packaged skill. Codex reads `<repo>/.agents/skills`, not `.claude/skills`. On this machine the packaged skill is a link `~/.agents/skills/design-pipeline` to `D:\projects\design-pipeline\skill`; Claude Code has no such link. | `omp://skills.md`; docs; listings | seen |
| F18 | A throwaway copy of `install-local.cjs` with fan-out (outside the repository) is 30 lines longer (155 to 185). On a skeleton it did: fresh install; refusal without `--replace`; replacement of three folders with a failure injected at each of the six renames (previous folders intact, no leftovers); a failed `doctor` on the copy; a bad folder name; a name that does not match its folder. Codex then listed each entry once from the resulting root. It looked at the entry folders before it copied anything. | prototype run | run (Windows, fake `doctor`) |
| F19 | The six description texts (section 5) pass the rules of section 9.4. Checkers run on scratch copies of the final texts: skill-creator's `quick_validate.py` (run as `python -X utf8 ...`) says valid for all six; `claude plugin validate` on a folder of the six passes; a Codex 0.155.0 list from a scratch home shows all six, each description word for word. At this machine's crowd Codex shows about the first 55 to 64 characters of each. The task words sit in the first 45 characters of every one. What the checkers do not do: `quick_validate.py` crashes on the Chinese quotes when Python's UTF-8 mode is off (locale cp936) unless `PYTHONUTF8=1` or `-X utf8` is used, and it does not check that the name equals the folder, colon-plus-space, a NOT sentence or the 80-character rule (the tests of 9.4 do). `quick_validate.py` rejected each broken scratch copy (colon-space, angle brackets, 1,025 characters, an extra key `argument-hint`, a trailing colon) and accepted a copy with Windows line ends; `claude plugin validate` (run alone) rejected only the trailing colon. PyYAML rejects `a: b` inside a plain description, so the strict no-colon-space rule stays even though Codex and `claude plugin validate` accepted such a copy. It is not a repository gate (`node scripts/qa.cjs` is the only one). | probe runs of 2026-10-01 | run |
| F20 | The skill list shown to this omp session gives each skill one short line, not its own text: for `design-pipeline`, "Use for promo films, PV/MAD edits, 3D shots, motion sites, UI/design systems." A skill whose description has a NOT clause has a "not for" part in its line (`maintaining-agent-skills`: "not for AGENTS.md/CLAUDE.md or knowledge notes"); `design-pipeline` has none. Quoted trigger phrases are not shown. I compared two skills; the rewriting itself was not investigated. | this session's system prompt | seen |
| F21 | `skill/evals/evals.json` (11 cases) checks which `route` job a prompt gets, not which skill a host loads. It is not reused. | file | read |
| F22 | `composition capture` and `verify interaction` need Chrome and a browser driver (`puppeteer-core`); without the driver `composition capture` exits 1 with a clear message (`add-web-capability-skills`, its F9). `verify composition` on a page taller than the window reports `text-off-canvas` for text below the fold (its F10). `film-edit analyze` writes `edit/analysis.json` into the project folder it is given. | sibling design; `edit-project-core.cjs` | reported (sibling run), read |
| F23 | Where a loaded skill lives. Claude Code puts the line "Base directory for this skill: <path>" before the text of a loaded skill (local session transcripts of Claude Code 2.1.250, 2.1.260, 2.1.266 and 2.1.275; its docs are silent). omp appends "[Skill directory: <baseDir>]" to a `/skill:<name>` message and says to resolve relative paths against it (a local omp session log; `omp://skills.md`). Codex lists each skill with the path of its `SKILL.md` (probe of F3). For an entry the printed folder is the entry's own, not `design-pipeline`, which is why every entry carries the locator sentence (5.0). | transcripts; session log; probe | seen |
| F24 | A second throwaway copy of `install-local.cjs` with the entry checks and the install marker (155 to 200 lines), run on a skeleton source with a fake `doctor` on Windows: 15 of 15 scenarios held. A fresh install wrote six markers (package, skill, version) and left the source clean. A second run without `--replace` was refused and changed nothing. An upgrade with `--replace` replaced the marked folders and refreshed the markers. A user's own `dp-review` folder without a marker was refused with and without `--replace`, stayed byte for byte as it was, and nothing else was created; the refusal was all-or-nothing (the main folder and the other entries untouched). A marker with the wrong package, the wrong skill, or not JSON was not trusted. A file named like an entry was refused. An old main folder without a marker was refused without `--replace`, replaced with it, and then marked. A failure injected at each of the twelve renames of a replacement left every folder and marker as before with no litter, and a thirteenth rename never happened. With no `PACKAGE.json` in the source the version fell back (here to `unknown`). `qa.cjs` and the existing installer test check named files, not whole trees, so a marker breaks neither (read). | prototype run; `qa.cjs`, `tests/install-local.test.cjs` | run (Windows, fake `doctor`), read |
| F25 | Name scan over the `name:` line of every `SKILL.md` in `~/.claude/skills`, `~/.agents/skills`, `~/.codex/skills` and the Claude plugin cache and marketplace folders: 823 distinct names. None starts with `dp-`. None equals `create`, `make`, `study`, `reference`, `try`, `preview` or `resume`. `review` exists, which is why the prefix stays. Names that only contain such a word: `create-pr`, `create-skill`, `aw-create-plan`, `aw-create-walkthrough`, `create-game-vfx`, `make-pdf`, `make-plan`, `preview-spec`, `audit-reference-originality`, `claude-md-reference`, `generate-reference-inspired-brand-worlds`. | directory scan | run |

## 3. Decisions

| # | Decision | Reason in one line | Reversed by |
| --- | --- | --- | --- |
| D1 | Five entry skills and the index: six listed skills. The cap is six entries, the index not counted; one slot stays unused on purpose | each listed skill costs space on every host (F2, F3, F5); every entry below has a real target (section 4) | Q13 |
| D2 | Sibling skills, not one skill with a task table. The table stays inside the index as the fallback | the user asked for task-named entries; one description cannot hold five tasks in both languages; typed names (`/dp-review`) work on all hosts (F1, F2, F3) | Q1 |
| D3 | Entry files live in a hidden folder, `skill/.entries/<name>/SKILL.md` | Codex lists nested files and does not merge same-name skills, but skips dot folders (F3), so the packaged copy is not listed twice | Q4 |
| D4 | The installer fans out; `package.cjs` is unchanged; `required` lists the five files | `package.cjs` already ships the folder (F10); only the installer must know where a skill goes | Q1, Q5 |
| D5 | An entry holds no rules: a fixed hand-over table, no keyword list, no call to `route` | that is what keeps this from being a fourth entry command (section 6) | none |
| D6 | The medium is asked at most once per entry, and never when project state holds it | `next` stores it (F11); an entry that creates no state cannot keep it | none |
| D7 | The index keeps the name `design-pipeline`, keeps "Where the details are" and "Always", loses the loop and the first-call tables, and gets a task table and a fallback sentence | `qa.cjs` and `hyperframes-routing.test.cjs` read names in it, and the eight front-door tests read the guides it names (F8) | none |
| D8 | A description opens with a sentence of at most 80 characters that names the task in its first 45, says when to use the entry with one "Use this whenever ... even if they never say design-pipeline" sentence, lists quoted trigger phrases in English and Chinese, and has one "NOT for" sentence. Two-task sentences are settled inside these sentences (section 6, rule 6). No colon followed by a space, no colon at the end, no space then `#`, no angle brackets, no backticks, at most 1,024 characters | a crowded host shows only the start of a description (Codex, 44 to 106 characters) or a one-line summary (this omp session, which keeps a "not for" part); a description that only states the task tends to be used too rarely (skill-creator's advice, read); F3, F4, F19, F20 | Q14 |
| D9 | Tests check structure only. What no test can check is read against a list at closure (9.5). The sample sentences are a document that a person runs on each host | a test that reads its own table proves nothing; triggering is a model's choice | Q12 |
| D10 | The planned "exactly one `SKILL.md`" check becomes an allow-list. The front-door test helper is not changed | the index keeps every name the eight tests read (F8); a wider helper would be optional coupling | none |
| D11 | The repo router keeps its name and gets three small edits; the shadowing is documented, not removed | renaming it changes a public name for no gain here (F17) | Q8 |
| D12 | The tool list gets no new field. Its `SKILL_NAMES` check also covers the commands named in the entry files, and the generated map gets a `## Ways to start` section computed from them | one list, no parallel schema | Q9 |
| D13 | `dp-review` never calls `decide` unless `next` asks, lists which checks did not run, and reports tool results and human decisions apart | AGENTS.md; F13; the lifecycle draft's S3 and S7 | none |
| D14 | `dp-resume` reads first and changes nothing unless the user says continue; for a change folder it runs `status` and `explain-block` before `resume` | `resume` writes (F12) | Q2 |
| D15 | This change lands after `fix-tool-guidance-errors` and `add-web-capability-skills`, behind a T0 stop check | the shared files in section 1 | Q9 |
| D16 | The installer writes a small marker file into every folder it installs, and replaces an entry folder only if it carries that marker for that skill. The main folder keeps today's rule. No `--no-entries` flag | a `--replace` must never overwrite a folder the user made: the `dp-` prefix only makes a clash unlikely, it stops nothing. The marker costs one small file and no extra rename (F24) | Q6 |
| D17 | The entry names are `dp-create`, `dp-reference`, `dp-preview`, `dp-review` and `dp-resume`, confirmed only after the host run (T7). The first draft used `dp-make`, `dp-study` and `dp-try`. A rename is five folders, five `required` lines, one constant list in `tests/entry-skills.test.cjs`, the index table, the router text, README and CONTRIBUTING words, and the NOT sentences | the plain names say what the user hands over or gets (a reference, a preview); "study" also means exam study (N8, N20) and "try" matches "Try that command again" (N9). Cost: `create` and `preview` are common words in other skills' names, so the description, not the name, has to carry the difference. No clash with an installed name here (F25) | Q3 |

## 4. The entry set: keep, merge or drop

The brief allowed up to six entry skills and one index. This design uses five entries. With the index that is six listed skills, and one entry slot stays unused on purpose.

Rule for an entry: (a) every medium row it claims points at something that exists; (b) its trigger phrases differ from every other entry's; (c) its "done" check differs. Each extra listed skill takes description space on every host: the six description texts add 2,748 characters (2,343 more than today's single description) to a list that already holds 27,740 on this machine (F5).

| Candidate | Verdict | Why | Real targets today | What is missing |
| --- | --- | --- | --- | --- |
| index `design-pipeline` | keep, shrink | its name is fixed by `qa.cjs`, the README and other files; it is also the fallback | the entry table, the CLI line, the reference list | none |
| `dp-create` | keep | the `next` loop, for all four media | `next`, `decide`, `workflow-film.md`, `workflow-edit.md`, `workflow-web.md`, `pipeline-reference.md` | no music-only and no 3D-only job (F15); `ui` has no workflow guide and no automatic check |
| `dp-reference` | keep, on trial (decided after the host run, T7) | it has a job the others lack, and each row has a tool or a guide: the `reference` stage guides, `composition capture` (a page), `film-edit analyze` (footage and music), `reference-spec.md` | `workflow-film.md`, `workflow-edit.md`, `workflow-web.md` (section `reference`); `reference-spec.md`; `composition capture`; `film-edit analyze` | no gate reads `reference.md` (`next` counts the stage done when the file exists); nothing lets an agent watch or measure a reference video for film; `ui` has no `reference` stage in `next` (the lifecycle draft adds one); web at quick and edit outside replicate have no `reference` stage |
| `dp-preview` | keep, on trial (decided after the host run, T7) | a stop rule that `dp-create` lacks; every medium has something | quick tier of `next`; the `concepts` stage (film, web) and `style` (edit) with a stop after the pick; `direction-preview.md`; `playground.md` | direction preview and playground are checks on a change folder, built by hand and unseen by `next` (F14); `ui` has no concepts stage, and a `ui` job cannot finish in `next` without delivery (F16); a score sample needs a storyboard (F15) |
| `dp-review` | keep | every medium has a check; it is the only entry that runs checks without the flow | `film check`, `film-edit check`, `verify interaction`, `verify composition`, `verify audio`, `composition capture`, `qa-checklist.md`, `anti-slop-review.md`, the R and W rules | `ui` has no gate in `next`; a bare video file gets only the sound check and a picture check the agent must prepare |
| `dp-resume` | keep (the weakest; Q2) | `next` already resumes, but `status` and `resume` look like the resume commands and are not (F12); one of them writes | `next`; `status`, `explain-block`, `resume` with `--change-root`; `agent-interface.md` (Resume Protocol) | a `next` project has no `status` of its own beyond `next` |
| `dp-fix` (considered) | drop | a small fix to a piece made with the tool is `dp-create` at the quick tier; a small fix to an existing app's code is not this package's job (A3) | | |
| `dp-clone` (considered) | drop for now | website cloning is a job of `route` (`website-clone`); an entry would duplicate that entry command. `dp-create` in replicate mode covers "rebuild this page" | | Q13 |
| `dp-score`, `dp-3d` (considered) | drop | no separate flow exists (F15) | | |
| `dp-ship`, `dp-tools` (considered) | drop | delivery is the last `next` stage; the tool map answers "what exists" | | |

### 4.1 What each medium gets today, in one place

| Medium | What the tools give | What is missing |
| --- | --- | --- |
| film | the full loop; `film check`; a `reference` stage | nothing lets an agent watch or measure a reference video |
| edit | the full loop; beat-grid analysis; `film-edit check` | the `reference` stage exists only in replicate mode |
| web page | the full loop; `verify interaction`; the W rules | the first-screen check comes with `add-web-composition-checks` |
| UI | an intake, then the work by `pipeline-reference.md` | no automatic check; no reference, concepts or review stage; a job cannot finish in `next` without delivery |
| 3D shot | `film blender` inside a film project (needs Blender) | no 3D-only job |
| music score | `film score` and `audio master` inside a film project; `verify audio` on any sound file | no music-only job; a score needs a storyboard |

## 5. The entries

These texts are the first draft (L9). Once task T2 has written the entry files, the files are the source of every description and of every body. The tests (9.4) and the tool list (10.1) read the files, not this section. A wording change after the host run is made in the entry file; this design, the plan and the summary are not edited again, and T6 writes the final description texts into `qa.md`. The six descriptions passed my structure rules (9.4, checks 2 to 5), the `quick_validate.py` of skill-creator (run with Python in UTF-8 mode), `claude plugin validate`, and a Codex 0.155.0 listing in which each description came back word for word (F19). The bodies were drafted in scratch files outside the repository (sizes in 5.0); no entry file exists in it.

### 5.0 What every entry shares

- **Parts, in order.** Frontmatter with `name` and `description` only. Then: one locator sentence; "Ask once"; "Hand over" (a table); "Before you say done"; "Do not". The table has one row per medium, except `dp-resume`, whose rows are situations, and `dp-reference`, whose rows are kinds of reference. `dp-create` also holds the two sections that move into it (5.1).
- **Size.** An entry is about 40 to 50 lines and at most 6,144 bytes; the index has at most 5,120 bytes (the limit `add-web-capability-skills` plans). `dp-create` is longer, about 80 lines, because the loop moves into it. The text that moves measures 2,283 bytes. The scratch drafts measure: `dp-create` 5,984 bytes and 78 lines (only 160 bytes of room), `dp-review` 4,416 and 48, `dp-reference` 4,308 and 43, `dp-preview` 4,110 and 42, `dp-resume` 3,446 and 42, the index 2,835 and 47. The old deliverable table and the medium table are one table (5.1) to save space. If the real `dp-create` passes the limit, T2 shortens its new text, keeps the moved text whole, and reports the numbers.
- **Commands.** Every command is written with its `designer-pipeline` prefix, as the guides do, so that check 7 of 9.4 can find it. The tables below leave the prefix out to stay narrow.
- **The locator sentence** is the same in every entry: "Find the `design-pipeline` folder first. The folder your host printed for this skill ("Base directory for this skill" or "Skill directory") is this skill's own, and `design-pipeline` sits next to it. If you came through the index, the folder the host printed is `design-pipeline` itself. It holds `scripts/designer-pipeline.cjs` and `references/`; every path below is inside it, and `designer-pipeline` means `node scripts/designer-pipeline.cjs` run from there." It is needed because the paths in an entry (`references/...`, `scripts/...`) are inside `design-pipeline`, while a host prints the entry's own folder: Claude Code puts "Base directory for this skill: <path>" before a loaded skill's text, and omp appends "[Skill directory: <baseDir>]" (F23). The rule itself is a lookup of files, so it also works on a host that prints nothing.
- **Do not**, in every entry, each with its reason in the same bullet: (1) call `decide` unless `next` asked the question or offered the command in a `then` line (`next` does that for the skip of the `reference` step, which only the user may choose), because a recorded decision is what moves the job on and an early one skips the person's own choice; (2) record Visual Acceptance, because only a person can accept a piece and a passing check is not acceptance; (3) run `route` to pick a command, because it is a second way to decide what happens next and two ways disagree; (4) write a file the named guide does not name, because evidence kept elsewhere is not found later; (5) say a check passed when it did not run, because the reader relies on that word. `dp-preview` adds: do not call `deliver`, because a sample marked delivered cannot be told apart from the finished piece. `dp-resume` adds: do not run `resume` on your own initiative, because it writes an event and the state, so it changes a job the user only asked about. The ban on `route` is ordinary prose. Check 8 looks for a command that runs `route` (a command shape, 9.4), so no entry has to avoid the program name or bend a sentence around a test.
- **The medium is asked at most once per entry, and never when project state holds it.** If `.design-pipeline/state.json` exists, take `deliverable` from it, ask nothing, and call `next` without `--deliverable` (with a state file, `--deliverable` fails; F11). If not, and the user's words do not name it, ask one question: "Is this film (also 3D shots and a score), an edit, a web page or a UI?" `dp-create` and `dp-preview` then pass the answer to `next --deliverable`. `dp-reference` and `dp-review` use it to choose a row and create no project state, so a user who runs `dp-reference` and then `dp-create` is asked again.
- **Names.** Other people's skills are never named in a description; a user may not have them. A "NOT for" sentence uses plain words for what belongs elsewhere (code review, pull requests, hand-off notes, small edits to code in an existing app) and may point to a sibling entry of this package by name.
- **Each description says when to use the entry even if the user does not name the package (A2).** Every entry description has one sentence "Use this whenever the user wants ..., even if they never say design-pipeline." skill-creator advises descriptions that say when to use a skill without waiting for its name (read). The sentence costs about 100 characters and sits after the first sentence, so a crowded Codex listing (55 to 64 characters shown here) does not show it, but every host pays for it in list length (F5, Q14).
- **Two-task sentences are settled inside the descriptions, not only in this document (A1).** `dp-create` quotes "rebuild this page from the link" and "重做这个页面"; `dp-reference` says it is not for making or rebuilding the piece; `dp-review` says that a request to check and fix starts there. Section 6 rule 6 states the rule; the descriptions are the text a host shows.
- **Entries point at a guide section; they do not restate its list (A4).** The guides already define what a finished `reference.md` holds (`references/reference-spec.md`, Required Sections, seven items) and which gates `check` and `probe` run (`references/workflow-<medium>.md`). An entry that copied those lists would be a second definition that can drift (D5). So `dp-reference` says the file has the sections that `reference-spec.md` lists, and `dp-review` says to run what the `check` or `probe` section of the medium lists. Each keeps only the report shape and the honesty lines (what was not observed, what did not run).

### 5.1 `dp-create`: make something new

**Description (618 characters):** Create a new film, edit, web page or UI and check it before anyone sees it. Use this whenever the user wants a film, PV, landing page or UI made or rebuilt, even if they never say design-pipeline. Typical words are "make a promo film", "cut a PV to this song", "animate a 3D product shot", "build a landing page", "design this settings screen", "rebuild this page from the link", "做一支宣传片", "剪一条卡点视频", "做个落地页", "重做这个页面". NOT for checking a finished piece (dp-review), only taking a reference apart (dp-reference), only trying options (dp-preview), continuing a job (dp-resume) or small edits to code in an existing app.

**Why these words.** "rebuild this page from the link" and "重做这个页面" settle "rebuild" in favour of this entry (A1). The NOT sentence ends with "small edits to code in an existing app" (A3), because "build a landing page" and "design this settings screen" are also everyday coding requests (N21 to N24).

**Inputs.** The medium (5.0); the size of the job, from which the agent picks the tier and the user may override; whether the user gave a reference to reproduce (`--mode replicate`) or no direction (`--mode freeform`). `next` asks the rest.

| Medium | For | First call | Guide | Note |
| --- | --- | --- | --- | --- |
| film | generated promo, explainer, logo sting, feature demo, 3D product shot | `next --project-root <dir> --deliverable film --tier <t>` | `references/workflow-film.md` | a 3D shot needs Blender (`references/film-blender.md`); a score uses `references/film-score.md` and needs the storyboard, so there is no music-only job |
| edit | PV, MAD, beat montage cut from existing footage and music | `next ... --deliverable edit` | `references/workflow-edit.md`, `references/film-edit.md` | needs footage and music the user may use |
| web | motion-first websites and pages | `next ... --deliverable web` | `references/workflow-web.md`, `references/web-direction.md` | |
| ui | product UI, components, design systems, clones | `next ... --deliverable ui` | `references/pipeline-reference.md` | intake, then the work; no gate yet |

The loop, the tier table, the mode line and "Talking to the user" move here from `skill/SKILL.md` word for word (section 8). The "For" words of the old deliverable table move too, as the second column above. The two moved sections (`## Loop` and `## Talking to the user`) sit after "Hand over" and before "Before you say done".

**Before saying done.** `next` returned `done`, or the user stopped it. Quote the `done` answer: `evidence.delivered`, `evidence.gates`, `evidence.drafts`. At the quick tier, film, edit and web have no deliver stage, so there is no delivered file: name the draft render (or page) and the gate results instead. Say a gate passed only if its record says `passed`. Report the gate results and the user's accept or reject apart, and never call the agent's own liking acceptance. Where a file or address was delivered, name it and check that it exists.

### 5.2 `dp-reference`: take a reference apart

**Description (474 characters):** Take a reference apart and write down what to borrow. Use this whenever the user hands over a video, page, screenshot or song to learn from, even if they never say design-pipeline. Typical words are "analyze this reference", "how did they make this", "break down this edit", "what makes this site feel good", "拆解这个参考", "分析这支视频的节奏", "这个网页的动效怎么做的". NOT for making or rebuilding the piece (dp-create), checking a finished one (dp-review) or explaining how code or a tool works.

**Why these words.** "making or rebuilding the piece (dp-create)" is the tie-break for "study this site and rebuild it" (A1). "explaining how code or a tool works" keeps "how did they make this" away from ordinary questions about code (N14).

**Inputs.** The reference or references (files, addresses) and what kind each is; what the user wants to use it for; where `reference.md` goes (the project root by default). The rows are keyed by the kind of reference, because the tools are; the medium of the job (5.0) only says which guide section to read.

| The reference is | Hand over to | Measure with |
| --- | --- | --- |
| a web page or a screenshot of one | `references/workflow-web.md`, section `reference` | `composition capture --url <address> --output <dir>` (a picture and the text boxes; needs Chrome and a browser driver, and exits 1 without the driver) |
| footage and music (an edit) | `references/workflow-edit.md`, section `reference` | `film-edit analyze --project-root <dir> --audio <music>` (beat grid and shot splits; it writes `edit/analysis.json` into that folder, so use a sample folder if the project should stay clean) |
| a video for a film | `references/workflow-film.md`, section `reference` | nothing in this package lets an agent watch or measure a video. An agent that cannot view video says so, asks the user for the timings, and writes in `reference.md` how each item was learned |
| a UI or any design reference | `references/reference-spec.md` | `composition capture` for a screenshot of a page; `next` has no `reference` stage for `ui` yet |

The file has the sections that `references/reference-spec.md` lists under Required Sections (seven items); the guide section of the row says what to watch for.

**Before saying done.** `reference.md` has the sections that `references/reference-spec.md` lists under Required Sections, and each item in it says how it was learned: a command that ran, a viewing, or the user's words. Two honesty lines, which no guide owns: say what was not observed (a page that did not load, a video that could not be viewed); say what `next` will notice. Where a project has a `reference` stage for this job (film and web at standard and full; edit only in replicate mode), the file finishes it; where it has none (web at quick, edit outside replicate, `ui`), `next` records nothing about it.

### 5.3 `dp-preview`: a few directions or a rough sample

**Description (476 characters):** Preview a few directions or a rough sample before the full job. Use this whenever the user wants to see options or a rough version before deciding, even if they never say design-pipeline. Typical words are "show me three directions", "give me a quick sample", "try a few looks first", "mock up some options", "tune it with sliders", "先出几个方向", "先做个小样", "多试几种风格". NOT for the finished piece (dp-create), API or module design, previewing a deploy or a file, or a code experiment.

**Why these words.** "tune it with sliders" points at `references/playground.md`. The NOT sentence names a deploy or a file preview, because "preview" also means that.

**Inputs.** The medium (5.0); "directions" or "sample"; the folder. A sample goes in a folder of its own (for example `samples/<name>/`), because `next --tier quick` fixes the tier of the project state it creates, and a later `next --deliverable` in the same folder fails without `--replace` (F11). To continue a sample as the real job, keep working in its folder.

| Medium | A few directions (stop at the user's pick) | A rough sample |
| --- | --- | --- |
| film | `next` at the standard tier until `concepts` is picked (`decide --stage concept`; `references/workflow-film.md`, section `concepts`). Put the questions of `next` to the user in one round, with your recommendations. At the `reference` step follow the guide's section `reference`; the user decides whether to skip it | `next --tier quick` (plan, build, check) |
| edit | after `film-edit analyze`, the `style` question, mad or pv (`references/workflow-edit.md` section `style`) | `next --tier quick` (analyze, cut, render, check; cut as MAD) |
| web | the same as film, until `concepts` is picked (`references/workflow-web.md` section `concepts`); for a whole page with real content, `references/direction-preview.md` | `next --tier quick` (build, probe) |
| ui | `references/direction-preview.md` (three candidates, two gates); `references/playground.md` to tune an accepted direction | do the work as `references/pipeline-reference.md` says at the quick tier and stop. Do not use `next`: a `ui` job cannot finish in it without `deliver`, which a sample never calls (F16) |

**Before saying done.** Each result is labelled a sample, not a delivery, and `deliver` was not called. For directions: the candidates differ on the guide's own terms (concept cards with different central ideas; direction preview candidates that differ on four axes), and the user's pick is recorded with `decide --stage concept` in a project or quoted otherwise. For direction preview or playground: the exit code of `direction check` or `playground check` at the stage that ran, and the sentence that `next` cannot see these files. For a sample: the checks that ran and their exit codes.

### 5.4 `dp-review`: check or judge a finished piece

**Description (460 characters):** Check a finished film, edit, web page or UI and report the result. Use this whenever the user wants a finished piece checked, even if they never say design-pipeline. Typical words are "check this cut", "run the checks on this film", "check the sound of this video", "check the text and motion on my landing page", "检查这个成片", "检查这个页面的文字和动效", "帮我评审这段动效". If asked to check and fix, start here. NOT for code review, pull requests or making a new piece (dp-create).

**Why these words.** The phrases name what the tools measure (a cut, sound, text and motion on a page) and not a bare "review", because a general review skill is likely to be installed next to this one (named follow-up L5). "If asked to check and fix, start here" is the tie-break for "Check my cut and fix what is wrong" (A1).

**Inputs.** The medium (5.0); the piece: a project folder, a file, or an address; whether the project has state.

The entry runs what the guide section of the row lists. That section says which checks run only when their input exists and which steps are optional, so the entry does not copy the list (A4).

| Medium | Guide section to run | What it needs |
| --- | --- | --- |
| film (also 3D, score) | `references/workflow-film.md`, section `check`: `film check --project-root <dir>` runs its gates (some only when their input exists), and the section ends with an optional text step (`composition capture`, then `verify composition`, five more checks) | a film project with `storyboard.json`. For a bare video file: `verify audio --audio <file>` runs on it; the picture check `verify composition --image <frame.png> --profile frame` needs frames as PNG files, and no command of this package extracts them, so the agent uses its own tool and says so |
| edit | `references/workflow-edit.md`, section `check`: `film-edit check --project-root <dir>` | `edit.json`, `sources/licenses.json` |
| web | `references/workflow-web.md`, section `probe`: `verify interaction --probe interaction.json`; for the first screen, `references/composition-gate.md` (`composition capture --url <page> --output <dir>`, then `verify composition --image ... --elements ... --profile ui`) | a probe file, Chrome and a browser driver. On a page taller than the window the picture check reports text below the fold as off screen (F22), so use that pair for the first screen only |
| ui | `references/qa-checklist.md` (Browser / Visual Checks) and `references/composition-gate.md` | a screenshot or a page; `next` has no gate for `ui` |
| any sound | `references/audio-gate.md`: `verify audio --audio <file> [--target web\|podcast\|broadcast]` | a wav, mp3 or mp4 |

Reader's note, not copied into the entry: after `add-web-composition-checks` lands, `verify interaction` also checks the first screen at three sizes, and the second half of the web row becomes optional. T0 and T6 re-read that row when it lands.

What needs a person's eye comes from guides and not from the agent: `references/qa-checklist.md` (Browser / Visual Checks; Web Treatment And Section Review; Contextual Anti-Slop Review; Accessibility Checks), rules R1 to R7 for a music-led film (`references/product-film-direction.md`) and W1 to W7 for a page (`references/web-direction.md`).

**Before saying done.** The report has two headed parts. "Checked by tools": for each check, the command, its exit code (0 passed, 2 a check failed or is blocked, 1 the command could not run; `docs/cli-and-reference-providers.md`) and each finding with its `fix`. "Needs a person's eye": the rules above as questions, each with the evidence to read. It lists every check that did not run and why (no project; no `ffmpeg`; no Chrome; no browser driver) and never calls such a check passed. It says that a check run inside a project that has state records its result there (F13). It calls `decide` only when `next` asks. It records no Visual Acceptance. Fixing what a check found is the `check` stage of `next`; if the user says "and fix", hand over to `next` when a project exists. The legend leaves out exit code 3: it belongs to the fidelity commands, which `dp-review` does not run.

### 5.5 `dp-resume`: continue, or say where a job stands

**Description (420 characters):** Continue a film, edit, web or UI job, or say where it stands. Use this whenever the user wants to pick such a job back up or asks how far it got, even if they never say design-pipeline. Typical words are "continue the film project", "resume the promo", "pick the landing page back up", "接着做这支片子", "这支宣传片做到哪一步了". NOT for restoring chat history, writing hand-off notes, general code work or starting a new job (dp-create).

**Why these words.** The phrases name a film, an edit or a page (A3). "continue the project", "where were we" and "what is the next step" would fire in any coding session (N19), and the entry has no other way to know that the job is one of ours. The price: a bare "what is the next step?" does not select `dp-resume`; the user types `/dp-resume` or names the job (9.3).

**Inputs.** The folder: the current one by default. The agent looks at the files to tell a project folder (`.design-pipeline/state.json`) from a change folder (`state.json` and `events.jsonl`); it does not guess from words. It asks only when both exist or the folder is not clear. The rows are situations, not media.

| The folder holds | Run | Read |
| --- | --- | --- |
| `.design-pipeline/state.json` | `next --project-root <dir>` (reads, changes nothing) | the `guide` that `next` names (film, edit and web) |
| a change folder with `state.json` | `status --change-root <dir>`, then `explain-block --change-root <dir>`; `resume --change-root <dir>` only after the user says continue, and only if the folder holds `plan.json` | `references/agent-interface.md`, section Resume Protocol |
| both (a `full`-tier project with its change) | `next` first, then `status` on the change | both |
| neither | say so and offer `dp-create`; start nothing | |

**Before saying done.** It says which kind of state it found. For a project it quotes `line`, `completed`, `remaining` and, when present, `rules`, and the state file is unchanged. For a change folder it quotes `status` and `explain-block`; it ran `resume` only after "continue", only with a `plan.json`, and said that `resume` writes an event and the state. "Continue" means running the `dp-create` loop from the stage `next` names; without it nothing runs. `status` and `resume` do not work on a `next` project (F12); the entry says so.

### 5.6 The index `design-pipeline`

**Description (300 characters):** Start here for design-pipeline, a toolkit for film, edit, web and UI work. Use when the user names it, asks "what can design-pipeline do", "how do I start", "design-pipeline 怎么用", "从哪开始", or wants film, edit, web or UI design work and no dp- skill is listed. NOT for code review or application logic.

It is the broadest description, not the narrowest: it covers all four media, and only its last clause ("and no dp- skill is listed") narrows it, which the model has to check for itself. Claude Code drops the descriptions of the least-used skills first (F2), so the older index probably keeps its description while new entries may show as names only. That is why the first Claude Code row of the host table is "I need a promo film" (9.3). The index stays the way to the entries for hosts that do not list them. Its body is section 8.

## 6. The routing rule

1. An entry only hands over. It names an existing command or guide in a fixed table. It has no keyword list, no score, no rule that picks a command by reading the user's words, and it never runs `route`. Check 8 of 9.4 keeps a command that runs `route` out of every entry (a command shape, not a word), and it stays after the tool list replaces check 7.
2. The host picks the entry from the description. That choice is the model's, not code's.
3. What an entry may decide is a parameter it passes on: the medium, the tier and mode `next` already defines, "directions" or "sample". It never decides a stage: `next` does.
4. The medium is asked at most once per entry and never when project state holds it (5.0). After the first hand-over to `next` it lives in project state.
5. The three entry commands stay as they are (`next` with `decide`, `route`, and the change commands). The tool list records them and never routes (`add-capability-registry` D2). This change adds no fourth one. It adds descriptions and short tables that name existing things, and section 10 has them checked against the tool list.
6. **A sentence that names two tasks goes to the first action the user asks for.** "Check my cut and fix what is wrong" goes to `dp-review`, which reports and then hands the fixes to `next`. "Study this site and rebuild it" goes to `dp-reference`; `dp-create` in replicate mode then continues, and its `reference` step is already finished by the `reference.md` that `dp-reference` wrote. "Rebuild this landing page from the link" and "Reproduce this landing page" go to `dp-create`, because rebuilding is their first action. The rule is also written into the descriptions (A1): `dp-create` quotes "rebuild this page from the link", `dp-reference` says it is not for making or rebuilding the piece, and `dp-review` says that a request to check and fix starts there. The sample table in section 9 uses this rule, and so does anyone who edits a description.

## 7. Packaging

### 7.1 Options

| Option | What it is | Verdict |
| --- | --- | --- |
| A | Entry files in `skill/.entries/`; the installer installs each beside the main skill | **chosen** |
| B | One skill with a task table; no new skills | the fallback, already inside the index; fails the request for task-named skills, and one description would have to hold five tasks in two languages |
| C | Entry files in a visible folder such as `skill/entries/`, copied to siblings by the installer | rejected: Codex lists the packaged copy too, and it does not merge same-name skills (F3), so each entry shows twice |
| D | Entry files outside `skill/`, in a second package root | rejected: `package.cjs` needs a multi-root change, the archive root changes from `design-pipeline/`, and the README contract with it |
| E | Nested entries in `skill/entries/` and nothing else | rejected: Codex lists them, omp and Claude Code do not (F1, F2, F3), so behaviour differs by host |

### 7.2 The smallest path

**To have the entries at all** (steps 1, 2, 4, 5, 6, 7 without the installer cases, and 8): the entry files, the index, an allow-list check, `required`, the tests, and a README that tells a user to copy or link each `.entries/<name>` folder to the host's skills folder by hand (five folders per host). Hosts then list the entries, or reach them by the fallback path in the index.

**To make typed names work with one command** (add step 3): the installer fan-out. It is the only code change and it can slip without breaking anything (section 11). It is in the default path because hand-copying five folders per host is easy to get wrong.

1. Five new files: `skill/.entries/<name>/SKILL.md`. One folder each, no other file in it.
2. `skill/SKILL.md` becomes the index (section 8).
3. `scripts/install-local.cjs` gains the fan-out and the install marker of 7.3 (about 45 to 60 lines; the prototype with the entry checks and the marker added 45, and the first prototype without the marker added 30).
4. `scripts/package.cjs` is not edited (F10).
5. `skill/references/package-resources.json`: five lines in `required` (`.entries/dp-create/SKILL.md` and its four siblings). `doctor` then checks them in an installed tree too, because the installer keeps `.entries` in the main folder.
6. The planned "exactly one `SKILL.md`" check becomes an allow-list (7.5). The front-door helper `tests/helpers/skill-surface.cjs` is not changed (D10).
7. Two new test files: `tests/entry-skills.test.cjs` (checks 1 to 6 and 8 of 9.4) and `tests/entry-names.test.cjs` (check 7, which the tool list replaces and slice T5 deletes as a whole); and new cases in `tests/install-local.test.cjs`.
8. `README.md`: an install section for the entries. `CONTRIBUTING.md`: one paragraph. `AGENTS.md` is not touched: its context block is managed by `bmad-project-context` and replaced on refresh.

### 7.3 The installer

1. **Before it copies anything** (after its existing check that the source holds no links), it looks at `<source>/.entries/*/`. A source with no `.entries` folder (an old package, or a custom `--source`) installs the main skill only and returns `entries: []`.
2. **Each entry folder is checked.** Its name is lower-case letters and digits joined by `-`, at most 64 characters. It holds a `SKILL.md` whose `name` equals the folder name. Two skills may not install to one folder. Any other case is refused before anything changes.
3. **Where each entry goes.** To `<root>/<name>`, the same `--root` as the main skill, which is where hosts look. If `--target` is not `<root>/design-pipeline`, the main skill goes where `--target` says, as today, and the entries still go to `<root>/<name>`. Each target must stay below `--root`, must not be a link, and must not lie inside the source.
4. **Existing folders and the install marker.** Every folder the installer installs gets a small file, `.installed-by-design-pipeline.json`, such as `{ "package": "design-pipeline", "skill": "dp-review", "version": "0.12.0-beta.1" }`. It is written into the staged copy, after `doctor` has passed and before the swap, and never into the source. The version comes from `PACKAGE.json` in the source (the packaged archive has one), else from the `VERSION` file one level above `scripts/`, else it is `unknown`; it is for people, and no rule compares it. **An entry target that exists** is replaced (with `--replace`) only if it is a real folder (not a link, not a file) whose marker parses and names this package and this very skill. In every other case the installer stops before it copies or changes anything, exits 1, and says which folder, that design-pipeline did not install it (no marker), that `--replace` does not change that, and that the user should move or rename it or use another `--root`. This check comes before the "target exists; pass --replace" message, so nobody is told to add `--replace` and then refused. **The main target** keeps today's rule: an existing folder needs `--replace` and is then replaced, marker or not, because no earlier release wrote a marker; it gets one now. The two rules differ for a reason: no earlier release installed entries, so an entry folder without a marker is always someone else's, while an old main folder is ours but unmarked. An upgrade from an install that has no entries, with `--replace`, replaces the main folder and installs the entries as new folders (D16). A folder that a user copied by hand from `.entries/` (the manual way of 7.4) has no marker either, so the installer stops at it too: the user removes or renames it once, and the installer then installs a marked one. **The marker is not a receipt or a schema of the pipeline:** it has no schema id, only the installer reads it, and no `designer-pipeline` command, gate or `doctor` check does. `AGENTS.md` bans a parallel receipt schema; this is a three-key note about who installed a folder.
5. **The swap.** All copies are staged first; `doctor` runs on the main copy as today; the markers are then written into the staged copies. The swap renames each existing target to a backup, puts the copy in place, and on any failure puts every earlier change back (earlier targets from their backups; newly installed ones are removed). The markers add no rename. Across several folders this is best effort with backup and rollback, not a single atomic step, and the installer test proves the rollback path (F18, F24).
6. **The main copy keeps `.entries`**, so `doctor` and `required` stay true in an installed tree.
7. **The result** keeps the schema id `design-pipeline.install-result.v1` and adds `entries`, the list of names installed.
8. **What it does not do:** remove an entry that a later release drops or renames, so an old folder can stay behind (release notes say so; the marker would let a later release remove it, this one does not); take a `--no-entries` flag; use the version for any decision.

### 7.4 What a user gets

| How the package was installed | omp | Claude Code | Codex |
| --- | --- | --- | --- |
| `install-local.cjs --root <that host's skills folder>` | index and five entries | index and five entries | index and five entries |
| unzip or copy `skill/` as `design-pipeline` | index; the entries by the fallback path in the index | same | index; `.entries` is skipped, so the same |
| link `skill/` as `design-pipeline` (this machine's way) | same | same | same |
| copy or link each `.entries/<name>` by hand to `<root>/<name>` | entries listed | entries listed | entries listed |

The skills folder of each host: Codex `~/.codex/skills` (it also reads `~/.agents/skills`); omp `~/.agents/skills` (its canonical folder); Claude Code `~/.claude/skills`. Install into one folder per host: Codex reads both of its folders and lists a skill twice if it sits in both (F3). On this machine `~/.agents/skills` serves omp and Codex, and Claude Code needs `~/.claude/skills`.

**A linked install cannot use the installer.** It refuses a link as target and refuses an existing folder without `--replace` (F10), and there is no entries-only mode. On this machine, where `~/.agents/skills/design-pipeline` is a link, the entries reach the hosts by hand: copy or link each `.entries/<name>` to `<root>/<name>`. The README and the host run (T7) say so. A folder copied by hand has no marker, so a user who later switches to the installer removes or renames those folders once (7.3).

So the claim "users can start by task" holds after the installer or the manual step. Without either, the index still works and the entries are reached through the fallback sentence, which names `.entries/<name>/SKILL.md` inside the `design-pipeline` folder.

### 7.5 Tests and the planned single-file check

- **The front-door helper is not changed.** The index keeps every name the eight tests read. I scanned the nine simple assertions of those tests against the index without the moved sections and found none that depends on the moved text (F8); a wider helper would be optional coupling.
- **The planned check of `add-web-capability-skills` T3**, "the `SKILL.md` files under `skill/` outside `upstream` folders are exactly `skill/SKILL.md`", becomes a folder rule: outside `upstream` folders, every `SKILL.md` other than `skill/SKILL.md` sits at `skill/.entries/<folder>/SKILL.md`. That test holds no names. The exact five names live in one constant list in `tests/entry-skills.test.cjs` (check 1 of 9.4), so a rename (D17) changes one list. The walk must not skip dot folders. If T3 has not landed when this change lands, `tests/entry-skills.test.cjs` carries the allow-list alone and T3 is told the contract in the plan.
- **`tests/install-local.test.cjs`** gains cases that use a small test package with a pretend health check (a copy of the 175 MB `skill/` for each case would make the run slow): entries installed beside the main skill, each folder with a marker (right keys and values) and the source left clean; a second run refused; a replacement updates all and refreshes the markers; an upgrade from an install without entries; a folder of the user's with an entry's name and no marker refused with and without `--replace`, left byte for byte as it was, with nothing else created or changed; a marker with the wrong package, the wrong skill or not JSON not trusted; a file or link named like an entry refused; an old main folder without a marker replaced with `--replace` and then marked; a bad entry refused before any change; a source with no `.entries` installs the main skill only; a custom `--target`; and a failure injected in the Nth rename leaves the earlier tree and its markers, for every N (a fresh install of six folders makes six renames, a replacement twelve, and an upgrade from an install without entries seven; these counts were read from the code, and the twelve were confirmed by injection in the prototype, F24). The test starts the installer with `node --require tests/helpers/fail-nth-rename.cjs` and sets `FAIL_AT_RENAME`; the helper patches `fs.renameSync` to throw on that call. No `.tmp-`, `.backup-` or lock name is left. The existing case that installs the real `skill/` from a packaged copy also asserts that the five entry folders land beside the main skill. A marker file in the installed tree breaks neither `node scripts/qa.cjs` nor the existing installer test: both check named files, not whole trees (read).
- **`scripts/qa.cjs`** needs no edit: it packs `skill/`, extracts it, and runs the packaged installer into an isolated root, which now installs the entries too. The assertion that the five folders land is in the installer test, not in `qa.cjs`.

### 7.6 The repo-local router

`.claude/skills/design-pipeline/SKILL.md` keeps its name and its role. Which one a host shows for `design-pipeline` depends on where it is started and which folders it reads (F17): Claude Code prefers a personal skill to the project router, omp prefers the router in this repository, and Codex reads `.agents/skills`. This change does not rename it. It makes three small edits, because two of its sentences would otherwise be wrong once the loop lives in `dp-create`: the `<objective>` sentence that says the front door "drives user projects one `next` step at a time" says instead that user projects are started through the entry skills or the index; `<quick_start>` step 2, which says to read `skill/SKILL.md` and loop on `next`, says that a user deliverable goes through the entry skills (`skill/.entries/<name>/SKILL.md`) or `skill/SKILL.md`; and `<reference_guides>` gets one line naming the folder. The router keeps its XML tags, no headings and under 500 lines (`tests/claude-code-surface.test.cjs`). Renaming the router is Q8.

### 7.7 Residuals

- Hidden folders are skipped by Codex 0.155.0 only as far as tested. If a later Codex lists them, each entry shows twice there (it does not merge names); nothing breaks. T0 repeats the Codex probes of F3 and F4.
- On a machine with many skills, Claude Code drops the descriptions of the least-used skills first, and a new skill has no use yet (F2, F5). An entry may first be known by its name alone. Names carry the task where they can; `/dp-review` typed by the user always works; a user may raise `skillListingBudgetFraction` or list an entry as `name-only`. Q3.
- A user who copies `skill/` by hand and never installs entries gets the index only. The fallback sentence covers the task; the typed names do not exist.
- An entry dropped or renamed later leaves an old folder in the skills root. It carries our marker, so a later release could remove it; this one does not.

## 8. The index against today's `skill/SKILL.md`

| Today | After |
| --- | --- |
| frontmatter: description of 405 characters, no "not for" part | description of 300 characters (5.6), name unchanged |
| first paragraph: "Talk with the user; drive the work with one command. The CLI is ..." | one line: the CLI is `node scripts/designer-pipeline.cjs` in this folder |
| `## Loop` (the `next` loop, `rules`) | moves to `dp-create` unchanged |
| first-call tables (deliverable, tier) and the mode line | move to `dp-create` unchanged (the deliverable table is merged into the medium table there) |
| `## Talking to the user` | moves to `dp-create`; the first bullet (ask everything missing in one round, numbered, with recommendations; "default" accepts all) also stays as one line in `Always` because every entry asks that way |
| `## Where the details are` (film, edit, web guides and the other reference pointers) | stays unchanged: `hyperframes-routing.test.cjs` reads one path in it, the eight front-door tests read the guides it names, and the registry check needs the three workflow guides here |
| `## Always` (gates never grant acceptance; honest licences; OpenSpec rule) | stays, and gets one added line: the rule of the first bullet of "Talking to the user" |
| none | a table of the five entries: task, skill, what it hands over to |
| none | the fallback sentence: "If your host does not list the dp- skills, open `.entries/<name>/SKILL.md` in this folder and follow it." |

The scratch draft of the index measures 47 lines and 2,835 bytes (T2 measures the real file), against 77 lines and 4,293 bytes today. The limit stays 5,120 bytes (`add-web-capability-skills` plans that check). The index keeps the one bullet that `add-capability-registry` T4 adds.

## 9. Overlap tests

### 9.1 Sample sentences, each for exactly one entry

These are what the descriptions are meant to do. A person runs them on each host (9.4); no test reads this table. Most of the rows avoid the words the descriptions quote, so that they test meaning and not a copy. I read each row against the final descriptions of section 5 (A1 to A3); no host has run any of them. Rows 26 to 28 name a film, a page or a project on purpose: a sentence with no such word does not select `dp-resume` by design (A3), and the user can type `/dp-resume`.

| # | Sentence | Entry |
| --- | --- | --- |
| 1 | I need a 30-second promo for our new app. | `dp-create` |
| 2 | Turn these clips and this track into a music video. | `dp-create` |
| 3 | 帮我做一个带滚动动效的产品落地页。 | `dp-create` |
| 4 | 设计一个数据看板的界面，要有深色模式。 | `dp-create` |
| 5 | Make a four-second turntable shot of this phone in 3D. | `dp-create` |
| 6 | Reproduce this landing page as closely as you can (with an address). | `dp-create` (replicate) |
| 7 | 给这支宣传片配一段电子风的配乐。 | `dp-create` (score inside film) |
| 8 | How is the pacing of this reference video built? I only want notes, nothing made yet. | `dp-reference` |
| 9 | What is it about this site's scroll animation that works? Tell me what to borrow, do not copy it. | `dp-reference` |
| 10 | 拆解一下这首歌的鼓点和这支 MAD 的卡点方式。 | `dp-reference` |
| 11 | 分析这个网页的动效和版式，写成参考笔记。 | `dp-reference` |
| 12 | Why does this landing page hero feel so premium? Break it down for me. | `dp-reference` |
| 13 | I cannot decide how the pricing page should look. Can you sketch a few different looks first? | `dp-preview` |
| 14 | 先弄个粗糙的版本，我想看看这个想法行不行。 | `dp-preview` |
| 15 | Give me a rough version first, I only want to see if the idea works. | `dp-preview` |
| 16 | 配色和字体你多给我几套方案，我来挑。 | `dp-preview` |
| 17 | Give me two different colour-and-type looks for this dashboard so I can pick. | `dp-preview` |
| 18 | Give my finished promo a once-over for problems before it goes out. | `dp-review` |
| 19 | Does my landing page have any problems your tools can find? | `dp-review` |
| 20 | 这个成片有没有问题？帮我检查一下。 | `dp-review` |
| 21 | 看看这个页面的动效做得好不好。 | `dp-review` |
| 22 | Can I ship this animation, or is something off? Here is the file. | `dp-review` |
| 23 | Does this UI pass your design checks? | `dp-review` |
| 24 | Pick up the film where we stopped last night. | `dp-resume` |
| 25 | How far along is the promo? What is left? | `dp-resume` |
| 26 | 接着上次的做，把那支宣传片剪完。 | `dp-resume` |
| 27 | 这支片子现在做到哪一步了？ | `dp-resume` |
| 28 | So what is still to do on this landing page? | `dp-resume` |
| 29 | What can design-pipeline do? | `design-pipeline` |
| 30 | design-pipeline 怎么开始用？ | `design-pipeline` |

### 9.2 Near-misses: no `dp-` skill may load

| # | Sentence | Why it looks close |
| --- | --- | --- |
| N1 | Review this pull request for bugs. | "review" |
| N2 | Run the test suite and fix the failing tests. | "check", "fix" |
| N3 | Design the REST API for the orders service. | "design" |
| N4 | Prototype a state machine for checkout to see if the logic feels right. | "sample", "try" |
| N5 | Restore the context I saved yesterday. | "continue" |
| N6 | Write a hand-off note for the next agent. | "continue" |
| N7 | Help me update my resume for a job application. | the word "resume" |
| N8 | Help me study for the biology exam. | "learn from", the word "study" |
| N9 | Try that command again. | the word "try" |
| N10 | Make a git commit with a good message. | the word "make" |
| N11 | Check the grammar of this paragraph. | "check" |
| N12 | 帮我看看这段代码有没有 bug。 | check something for problems |
| N13 | 简历怎么写才能更吸引人？ | resume in Chinese |
| N14 | Explain how CSS grid works. | web words |
| N15 | Summarize this PDF report. | "analyze" |
| N16 | 帮我写一个 Python 脚本批量重命名文件。 | "做" |
| N17 | 把这篇文章翻译成英文，再润色一下。 | "make" |
| N18 | 总结一下今天会议的纪要。 | "分析" |
| N19 | 接着上次的对话，把那个函数改成异步的。 | "接着" |
| N20 | 我想复习一下考试，帮我做个复习计划。 | "learn", make a plan |
| N21 | Add a spinner to my React settings page while the data loads. | "settings screen", UI |
| N22 | Fix my navbar CSS, it overflows on small screens. | web page, "fix" |
| N23 | Fix the hover flicker on the pricing card in Safari. | animation, "fix" |
| N24 | Convert this class component to hooks and keep the same markup. | UI component |

N21 to N24 are ordinary front-end coding in an existing app (A3). The description of `dp-create` says it is not for small edits to code in an existing app; the first draft sent a sentence like N23 to the quick tier of `dp-make`. Outside the tools, in the user's own field: "Model this chair in Blender." (3D only), "Compose a two-minute piano piece." (music only), "Retouch the skin tones in this photo.", "Make a print poster for the concert.", "Edit this podcast to remove the ums." No `dp-` skill should load, or one entry may load and say plainly that the tools do not do this job (a pass). None may start a `next` project for it. Look-alike skills that a user may have installed (a design review skill, a prototype skill, a hand-off skill) are not in this table; named follow-up L5 adds them as a separate table.

### 9.3 Boundary cases and the rule that settles them (section 6, rule 6)

| Sentence | Entry | Reason |
| --- | --- | --- |
| Make me three options for the hero section. | `dp-preview` | the user wants to choose, not to receive a finished piece |
| Rebuild this landing page from the link. | `dp-create` (replicate) | rebuilding is the first action; the description of `dp-create` quotes it and the description of `dp-reference` says it is not for rebuilding |
| Give me a rough version of the card animation to see if it works. | `dp-preview` | a sample, not a delivery |
| Check my cut and fix what is wrong. | `dp-review` | the first action is to check (its description says "if asked to check and fix, start here"); it then hands the fixes to `next` |
| Study this site and rebuild it. | `dp-reference` | the first action is to study; `dp-create` in replicate mode continues with `reference.md` in place |
| Continue the promo film and show me a draft. | `dp-resume` | "continue" comes first, then the `dp-create` loop runs |
| I need a promo film. (on a host that lists the entries) | `dp-create` | the index says "and no dp- skill is listed", so it must not win here; this is the first Claude Code row of the host table |

Left out on purpose: a bare "what is the next step?" that names no film, edit or page. It does not select `dp-resume` (A3 dropped the generic phrases, because they fire in any coding session). The user types `/dp-resume` or names the job.

### 9.4 What a test may check (structure only) and what only a person can

`tests/entry-skills.test.cjs` holds checks 1 to 6 and 8, for the index and the five entries. `tests/entry-names.test.cjs` holds check 7 alone, so that slice T5 can delete it as a whole.

1. **Files.** The `SKILL.md` files under `skill/` outside `upstream` folders are exactly `skill/SKILL.md` and `skill/.entries/<name>/SKILL.md` for the five names; each entry folder holds only `SKILL.md`. The walk includes dot folders. The five names are one constant list at the top of the test file, so a rename (D17) changes that list and the folders, nothing else in the test.
2. **Frontmatter.** The first line is `---`; the keys are exactly `name` and `description`, each on one line; `name` equals the folder name (the index: `design-pipeline`) and is lower-case letters and digits joined by `-`, at most 64 characters.
3. **Characters.** The description has 1 to 1,024 characters and one line; no colon followed by a space; no colon at the end; no space then `#`; no `<` or `>`; no backtick.
4. **Shape.** The first sentence (the text up to the first period followed by a space, or to the end) has at most 80 characters; one sentence starts with `NOT for`; the description holds at least three double-quoted phrases (the index two), at least one with a Chinese character and at least one with Latin letters. The marker `NOT for` is the form that was asked for: the test checks that it is there and where, not what follows it.
5. **No copied phrases.** The double-quoted phrases, compared without regard to case, are different across the index and all five entries. This stops copy and paste between descriptions; it does not show that the meanings do not overlap. That is the person's host run.
6. **Size.** Each entry has at most 6,144 bytes and the index at most 5,120 bytes; each has fewer than 500 lines.
7. **Command names** (`tests/entry-names.test.cjs`). Every `designer-pipeline <command> [<action>]` written in the index or an entry names a command that the CLI help lists, and, when an action is written, that action word appears in a help line of that command. The parsing is loose on purpose, because the help packs several commands on one line: split each help line at `|` and at spaces, take the word after `designer-pipeline` as the command and the next word as the action unless it starts with `-` or `<`, and accept a command that starts a help line or follows a `|`. It catches misspelt or invented words such as `film edit`; the tool list's own check is exact and replaces it. The test runs the parser on the real help text and on a copy of an entry with `film edit` in it, so the parser is shown to accept the real help and to refuse the mistake.
8. **Names and `route`.** The index table names each entry and the fallback path `.entries/`; every `references/...` path named in the index or an entry exists; and neither the index nor any entry holds a command that runs `route`. A command that runs `route` has a shape: `designer-pipeline route` or `designer-pipeline.cjs route` followed by an option (a word that starts with `-`), or a line inside a code fence that starts with `designer-pipeline route` or `node scripts/designer-pipeline.cjs route`. A sentence in plain words that only names the command, such as "Run `route` to pick a command. It is a second way to decide...", passes, so no entry has to bend its prose around the test. The test runs the matcher on a copy of an entry that has a fenced `designer-pipeline route --query x` line (must fail) and on the plain sentence (must pass).

None of these reads a phrase of prose or pins a wording. Check 7 exists because a wrong command in a skill text was a real defect here (`fix-tool-guidance-errors`). After slice T5 the tool list's own check replaces it and `tests/entry-names.test.cjs` is deleted; check 8 stays, because the tool list does not stop an entry from running `route`, which is an active command.

**Not verifiable here**, and left to a person: whether each sentence of 9.1 loads the right entry and each near-miss loads none, on omp, Claude Code and Codex, with that person's real skill list. Reasons: the entries do not exist yet; a model's choice is not a fact a script can assert; a run against a clean folder would not show the crowded lists that decide the outcome (F5). The procedure, for `qa.md` and task T7: install the entries into each host's real skills folder (with the installer, or by hand on a linked install, 7.4); for each sentence open a fresh session in an empty folder, so an earlier answer cannot steer the next; paste the sentence; write down the skill the host loaded (omp: the `skill://` read or the `/skill` line; Claude Code: the first `Skill` call in the transcript; Codex: the `SKILL.md` it opens); a row passes when exactly the mapped entry loaded (for a near-miss: no `dp-` skill). Record host version, skill count and each row. On Claude Code run "I need a promo film" first and record whether the index or `dp-create` loaded. A failing row is fixed in the description of the entry that lost it (in the entry file, see 5), then the failing row and all near-misses run again. Headless variants (`claude -p ... --output-format stream-json`, `codex exec`) may work; they were not tried. Named follow-ups L3 to L5 prepare this run (trigger files, the optional description runs, a table of look-alike skills); none is done.

### 9.5 What is read, not tested

Some rules live in the entry text and no test can check them. T6 reads each entry against this list and writes the result in `qa.md`:

1. The medium is asked at most once per entry, and never when project state holds it; with state, `next` is called without `--deliverable` (5.0).
2. Each "Before you say done" holds what 5.1 to 5.5 say; `dp-review` reports in two parts and lists the checks that did not run; `dp-preview` calls no `deliver`; `dp-resume` runs `resume` only after "continue".
3. No entry calls `decide` unless `next` asked the question or offered the command in a `then` line, records Visual Acceptance, or holds a keyword list.
4. Each hand-over row names something that exists and points at a guide section instead of restating its list (A4), and each entry has the parts of 5.0 in order.
5. Contracts are unchanged: this change edits no file under `skill/scripts/` and no schema file under `skill/references/`; T6 lists the files the change touched and compares `designer-pipeline --help` with the copy T0 saved.
6. The task words sit in the first 45 characters of each description (F19): a reader looks at each first sentence.

## 10. Links

### 10.1 The tool list (`add-capability-registry`)

Nothing of that change is edited by this one; this describes what slice T5 does after it lands.

- **No new field, no new list, no new rows.** The entry files are found by their folder (`skill/.entries/*/SKILL.md`), not stored in `scripts/tool-list.json`.
- **The existing `SKILL_NAMES` check also covers the commands the entry files name.** `checkSkillFiles` already checks that `skill/SKILL.md` and the repo router name only `active` commands and guides. T5 adds the five entry files to its input for the commands: every `designer-pipeline` command an entry names must be an `active` entry. It does not check the guide paths of the entry files against the list: the entries name guides that the list does not carry (`direction-preview.md`, `playground.md`, `reference-spec.md`, `qa-checklist.md`, `anti-slop-review.md`, `agent-interface.md`), and the registry limits guide entries to documents that `SKILL.md`, the router or `next` name. Check 8 keeps checking that the paths exist.
- **The generated map gets one section, `## Ways to start`, in `skill/references/tool-map.md`.** One row per entry: its name, the first sentence of its description, and the commands and guide paths its text names, in the order it names them (the paths as plain text). It is computed from the entry files, so it cannot drift from them; a change to a description or a hand-over table makes `MAP_STALE` ask for `node scripts/tool-list.cjs --write`.
- **Why not authored twice.** The registry's rule that no test reads a guide's wording stands: the section reads names, and the first sentence only as text to copy.
- **If the registry has not landed** when everything else is ready, check 7 carries the command names and T5 waits; the change is then not closed until T5 lands or the user decides otherwise (Q9).

### 10.2 The lifecycle change (`align-workflow-lifecycle`)

| Entry | Steps of its six | Stage ids it uses |
| --- | --- | --- |
| `dp-create` | all six | all |
| `dp-reference` | 2 direction, the reference part | `reference` (film, web; edit only in replicate; `ui` after its S2) |
| `dp-preview` | 2 direction with a stop; or 3 and 4 at the quick tier | `concepts` (film, web), `style` (edit); quick: film `plan`, `build`, `check`; edit `analyze`, `cut`, `render`, `check`; web `build`, `probe`; `ui` `work` |
| `dp-review` | 4 verify and 5 review, run alone | `check` (film, edit), `probe` (web), `review` |
| `dp-resume` | none: it reads state | any |

Rules of that draft that bind the entries: S3 (`decide` answers only what `next` asks) is why `dp-review` never calls `decide` on its own; S6 (a verdict is about the draft it judged) is why an entry never reuses an earlier accept; S7 (`done` separates what was checked from what was decided) is the shape of every report here; S9 (step labels) is read by three things only, and entries do not read it. When its S2 adds `workflow-ui.md`, the `ui` rows of `dp-create` and `dp-reference` point there; until then they point at `pipeline-reference.md` and `reference-spec.md`. T0 re-reads this.

## 11. Slices and owners

`tasks.md` and `docs/superpowers/plans/2026-09-30-task-entry-skills.md` hold the steps. No file has two owners at the same time. Workers do not run `node scripts/qa.cjs`; T6 runs it once on a quiet tree. T5 deletes `tests/entry-names.test.cjs` only after T4 has landed, and T6 adds a manifest line for each test file that exists by then. If the registry lands so late that T5 runs after T6, T5 becomes the first task of a follow-up: it deletes the file, removes its manifest line and reruns `node scripts/qa.cjs` itself. Six items from the skill-creator audit (L3 to L8) are named follow-ups in `tasks.md`: they are not slices, nothing in `node scripts/qa.cjs` reads them, and none is done by this change.

| Slice | Owns | Wave |
| --- | --- | --- |
| T0 stop check | nothing (reads); repeats the Codex probes of F3 and F4; saves the CLI help | first |
| T1 installer | `scripts/install-local.cjs`, `tests/install-local.test.cjs`, `tests/helpers/fail-nth-rename.cjs` | 1 |
| T2 entry text | the five `skill/.entries/<name>/SKILL.md`, `skill/SKILL.md` | 1 |
| T3 docs | `README.md`, `CONTRIBUTING.md`, `.claude/skills/design-pipeline/SKILL.md` | 1 |
| T4 tests | `tests/entry-skills.test.cjs`, `tests/entry-names.test.cjs`, and the one allow-list check in `tests/claude-code-surface.test.cjs` when it exists | 2 (needs T2) |
| T5 tool-list link | `scripts/tool-list.cjs`, `tests/tool-list.test.cjs`, the generated `skill/references/tool-map.md`; deletes `tests/entry-names.test.cjs` | 3, gated on the registry having landed |
| T6 closure | `skill/references/package-resources.json`, `scripts/test-manifest.json` (one line for each new test file that exists), `CHANGELOG.md`, `openspec/changes/add-task-entry-skills/qa.md`, the boxes of `tasks.md`, and `specs/entry-skills/spec.md` of this change (only to write requirement 2 as a `MODIFIED` block, if `add-web-capability-skills` is archived by then); reads the entries against 9.5; reconciles the allow-list with the spec of that change | last, integrator |
| T7 host run | nothing in the repository; writes the results into `qa.md` (T6 owns that file; T7 hands its table to T6). The first row on Claude Code is "I need a promo film" (9.3) | after T6, by a person |

T1 can slip without breaking anything: with T2 alone the entries exist and the fallback sentence reaches them. T1's one assertion about the real `skill/` needs T2's files; T6 is the first run that has both. T5 comes last of the code slices so that closure does not wait on it when the registry has not landed (Q9).

**What `node scripts/qa.cjs` proves:** the package archive holds the five entry files and the index, and is the same bytes twice; the packaged installer installs the main skill and, through the installer test, the five entries beside it with an install marker in each, refuses a second install without `--replace`, and leaves a folder of the user's that has an entry's name untouched; the structure checks of 9.4; the front-door tests still pass; the test manifest lists the new test files; the repository status is unchanged after the run.

**What only a person can judge:** that each sentence of 9.1 and 9.2 loads the right entry (or none) on each host; that the descriptions and the entry text read plainly; that the names (D17) are understood when only the name is shown; that the fallback path works for someone who copied `skill/` by hand; that `dp-preview` and `dp-reference` are worth their place once used. Visual Acceptance does not apply: nothing here is a page or a film. **Nothing about real triggering is verified by this change or by this design:** no host and no model has been asked which entry loads for any sentence.

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Two entries claim one sentence, or none does | quoted phrases are not copied (check 5); the tie-break is written into the descriptions (A1, section 6 rule 6); a person runs 9.1 and 9.2 (T7) |
| Entry text drifts from the commands it names | check 7 now; the tool list after T5 |
| An entry starts to run `route`, or names a wrong path | check 8 (a command that runs `route`, or a path that does not exist), which stays after T5 |
| The hidden-folder trick stops working in a later Codex | T0 repeats the probes; the harm is a doubled listing, not breakage (7.7) |
| Rollback across several folders is not atomic on Windows | best effort with backup; the installer test injects a failure at each rename |
| A folder of the user's with an entry's name blocks the install | the installer stops before it changes anything, names the folder and says to rename it; it never replaces a folder that has no install marker (7.3); Q6 |
| Entries are the first to lose their description in Claude Code | names carry the task; typed names work; `name-only` and the budget setting are documented |
| The index and an entry both match one request | the index says "and no dp- skill is listed". It is the broadest description (it covers film, edit, web and UI work) and the model must check that clause itself, so the first Claude Code row of the host table is "I need a promo film" (9.3) |
| A sample started at quick leaves a quick-tier project state | a sample goes in its own folder (5.3) |
| The lifecycle or registry changes text that entries name | T0 re-reads; slice T5; the shared-file table in section 1 |
| `dp-preview` and `dp-reference` promise more than exists | their tables list what is missing, and their "done" check states only what exists and that `next` cannot see it; both are kept on trial until the host run |
| Six descriptions cost more listing space | they add 2,343 characters to a list that already holds 27,740 here (F5); the task word sits in the first 45 characters of each; Q14 |
| The plain names are not understood, or clash with a neighbour | D17: the scan of 823 names found no clash; the names are confirmed only after the host run; a rename is five folders and some text |

## 13. Open questions

Defaults are in bold in `docs/superpowers/specs/2026-09-30-task-entry-skills.md`. The user needs to answer Q1, Q2, Q3, Q9, Q12 and Q13; the others are engineering details with defaults.

1. Sibling skills with an installer fan-out, or one skill with a task table (option B)? Default: siblings; the table stays in the index as the fallback.
2. Keep `dp-resume`, or fold it into `dp-create` (four entries; `dp-create` gains three trigger phrases and a five-line "continue" part)? Default: keep, because of the `status`/`resume` name trap.
3. Which names? Default: `dp-create`, `dp-reference`, `dp-preview`, `dp-review`, `dp-resume`, confirmed only after the host run (D17). The first draft used `dp-make`, `dp-study`, `dp-try`. Longer names that say more when a host shows only the name (for example `dp-review-piece`) are the other option.
4. Hidden folder `skill/.entries`, or a visible folder that the installer removes from the installed main folder? Default: hidden. The visible folder needs a separate list in `package-resources.json` because `doctor` checks `required` in the installed tree.
5. Entries go to the same `--root` as the main skill, or to a separate `--entries-root`? Default: the same root.
6. Replace an entry folder that has no install marker of ours? Default: never; the installer stops and names the folder (7.3). The marker costs one small file per installed folder and no extra rename.
7. Does the index description keep the sentence "no dp- skill is listed"? Default: yes; it serves hosts that never list the entries.
8. Rename the repo router, or keep the same name with three small edits? Default: keep.
9. Is slice T5 part of this change? Default: yes, last. This change may land before the registry: then T5 waits, closing without it needs the user's yes, and T5 becomes the first pending task.
10. Add Chinese words to the first sentence of each description so a crowded Codex listing shows them? Default: no; models read the English sentence in either language.
11. Which hosts does the README show installs for? Default: Codex, omp and Claude Code, each with its skills folder.
12. Who runs the host table of 9.1 and 9.2, and when? Default: the user, once entries exist, before the change is called finished.
13. A sixth entry (for example `dp-clone`)? Default: no.
14. Keep the "Use this whenever ... even if they never say design-pipeline" sentence in every entry description (about 100 characters each)? Default: keep; shorten after the host run if a host drops the descriptions.

## 14. Not verified

- Which entry a host's model loads for any sentence. **No real trigger run of any kind was done:** no entry file exists, and no script, model or host was asked. A run in a clean folder would not show the crowded lists either. The tie-break and the near-miss answers in section 9 are my reading of the descriptions, not a host result.
- The optional description runs of skill-creator (`run_eval.py`, `improve_description.py`) could not run here: on Windows `select` on a pipe fails with `WinError 10093`, and the `claude` CLI was logged out. Named follow-up L4.
- Claude Code with folders inside a skill folder (not run; not needed, because entries are installed as siblings). Whether Claude Code always prints the "Base directory for this skill" line: seen in local transcripts of four versions, not stated in its docs.
- Any Codex version other than 0.155.0; omp and Claude Code behaviour with the new descriptions; how a Claude Code listing that is over its budget treats these six.
- The final text of the five draft changes: this design read their drafts, not code.
- The fan-out and the install marker were run as throwaway copies on Windows with a fake `doctor`; the real `install-local.cjs` with the real 175 MB `skill/` copy and the existing `tests/install-local.test.cjs` were not run. The rename counts (six, twelve, seven) were read from the code; the prototype confirmed twelve by injecting a failure at each rename.
- The scan of the eight front-door tests (F8) covered nine simple assertions; dynamic patterns were not evaluated.
- `node scripts/qa.cjs` was not run (documents only). `openspec validate add-task-entry-skills --strict` only checks the format of the spec; it is not behavioural verification (follow-up L8).
- macOS and Linux installs; the README steps for Claude Code and omp.
- The rewriting of skill lines in this omp session (F20): two skills were compared.

## Appendix A. How the host facts were gathered

All ran outside the repository, with a temporary `CODEX_HOME`, and changed nothing in it.

- Codex list: start `codex app-server`, send JSON-RPC `initialize`, then `initialized`, then `skills/list` with `{ "cwds": ["<dir>"], "forceReload": true }`; read `data[0].skills` and `data[0].errors`.
- Codex prompt: `codex debug prompt-input "hello"` with `CODEX_HOME` set; the skills section lists each skill as `- name: start of description (file: rN/...)`.
- Variants used: a nested folder and a sibling with one name; folders named `.entries`, `_entries`, `entries`, `node_modules`, `upstream`; descriptions with a colon and space, a trailing colon, a space and `#`, 1,024 and 1,025 characters; 6, 40 and 120 generated skills for the shortening.
- Claude Code: `claude plugin validate <skills folder>` on the six drafts.
- Listing size: a script over `~/.claude/skills/*/SKILL.md` summing description characters, capped at 1,536.
- Packaging: a skeleton with copies of `package.cjs`, `release-contract.cjs`, `install-local.cjs` and a tiny `skill/` with `.entries`, packaged with `PACKAGE_VERSION` and `SOURCE_DATE_EPOCH` set; the archive entries were listed.
- Installer: a throwaway copy with the fan-out, run on a skeleton with a fake `doctor`; a rename failure was injected with a preload script that patches `fs.renameSync`.
- CLI: `next` twice on a temporary web project; `status` and `resume` on its `.design-pipeline` folder; `direction check` and `playground check` on an empty change folder.
- Front-door tests: a script that reads the nine simple assertions of the eight tests and evaluates each against the index without its moved sections.
- Checkers (2026-10-01): `quick_validate.py` of skill-creator, run as `python -X utf8 quick_validate.py <skill folder>` on scratch copies of the six final texts (valid) and on broken copies (colon-space, angle brackets, 1,025 characters, an extra key, a trailing colon); `claude plugin validate <folder of skills>` on the six; a Codex list from a scratch home, checking that each description comes back word for word.
- Marker prototype: a throwaway copy of `install-local.cjs` (155 to 200 lines) run on a skeleton source with a fake `doctor`; the scenarios are in F24; the same preload script injected a failure at each of the twelve renames of a replacement.
- Name scan: a script over the `name:` line of every `SKILL.md` in `~/.claude/skills`, `~/.agents/skills`, `~/.codex/skills` and the Claude plugin cache and marketplace folders (823 distinct names).
- Base directory: a search of local Claude Code transcripts (`~/.claude/projects`) for the text "Base directory for this skill", and of one omp session log for "Skill directory".
