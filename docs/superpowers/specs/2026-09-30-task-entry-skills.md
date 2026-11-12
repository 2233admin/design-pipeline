# Task-named entry skills (spec, draft)

Status: draft, awaiting approval (2026-09-30). Nothing here is approved. The behaviour change ships as the OpenSpec change `openspec/changes/add-task-entry-skills/`. This document is the summary and the place to answer the open questions; `design.md` of the change holds the proof for each item. Nothing is built: no entry file, installer edit, test, package-list line or changelog line was written. Nothing about real triggering is verified: no host or model was asked which entry loads for any sentence.

## In short

- The change adds five short skills, one for each thing a person wants to do: `dp-create` (make something new), `dp-reference` (take a reference apart), `dp-preview` (a few directions or a rough sample first), `dp-review` (check a finished piece) and `dp-resume` (continue a job). It also shrinks `skill/SKILL.md` into an index, named `design-pipeline`, that says where to start.
- The names are a draft. They are confirmed only after a person has run the sample sentences on the real hosts (T7).

| Earlier draft | Now | Task |
| --- | --- | --- |
| `dp-make` | `dp-create` | make something new (the `next` loop) |
| `dp-study` | `dp-reference` | take a reference apart |
| `dp-try` | `dp-preview` | a few directions or a rough sample first |
| `dp-review` | `dp-review` | check a finished piece (unchanged) |
| `dp-resume` | `dp-resume` | continue a job (unchanged) |
| `design-pipeline` | `design-pipeline` | the index (unchanged) |

- Why the plain names: they say what the user hands over or gets (a reference, a preview). "Study" also means exam study, and "try" matches "Try that command again". The cost: `create` and `preview` are common words in other skills' names (`create-pr`, `create-skill`, `preview-spec`), and `reference` is in three unrelated skill names, so the description, not the name, must carry the difference. A scan of this machine (823 distinct skill names in the Claude, agents and Codex skill folders and the plugin folders) found none that starts with `dp-` and none equal to `create`, `make`, `study`, `reference`, `try`, `preview` or `resume`. `review` does exist, which is why the `dp-` prefix stays. Run (directory scan). Renaming later is cheap: five folders, five `required` lines, one list in a test, the index table, the router text, a few README words and the NOT sentences.
- Order: nothing can start until `fix-tool-guidance-errors` and `add-web-capability-skills` (Phase A) are committed. None of them was committed when this was written. You may waive the order. The cost is either a reshaped `skill/SKILL.md` between the two packaged commits that `add-web-capability-skills` compares, or a second edit of the index later (`design.md` section 1).
- What each medium gets today. The entries say what is missing instead of hiding it.

| Medium | What the tools give | What is missing |
| --- | --- | --- |
| film | the full loop; `film check`; a `reference` stage | nothing lets an agent watch or measure a reference video |
| edit | the full loop; beat-grid analysis; `film-edit check` | the `reference` stage exists only in replicate mode |
| web page | the full loop; `verify interaction`; the W rules | the first-screen check comes with `add-web-composition-checks` |
| UI | an intake, then the work by `pipeline-reference.md` | no automatic check; no reference, concepts or review stage; a job cannot finish in `next` without delivery |
| 3D shot | `film blender` inside a film project (needs Blender) | no 3D-only job |
| music score | `film score` and `audio master` inside a film project; `verify audio` on any sound file | no music-only job; a score needs a storyboard |

## Words used

| Word | Meaning here |
| --- | --- |
| host | a program that runs an agent and shows it a list of skills: omp, Claude Code, Codex |
| skill | a folder with a `SKILL.md`. The host shows the model its name and description, and loads the body when the user's words match the description |
| listing | the list of skill names and descriptions a host puts in front of the model. On a machine with many skills a host cuts descriptions short or leaves some out |
| index skill | `skill/SKILL.md`, named `design-pipeline`. Today it is the only skill in the package. After this change it says where to start |
| front door | `skill/SKILL.md` plus the guides it names. The tests read it |
| entry skill | a thin skill named for one user task |
| hand over | an entry names an existing command or guide and stops there. It holds no rule of its own |
| locator sentence | the one sentence in an entry that tells the agent how to find the `design-pipeline` folder |
| tie-break | the rule for a sentence that names two tasks: the first action the user asks for wins |
| medium | what the work is: film (also 3D shots and a film score), edit (PV, MAD, beat montage), web page, UI. `next` calls it the deliverable |
| tier | how big the job is: quick, standard or full |
| mode | whether a reference is given: brief (none needed), replicate (reproduce it), freeform (no direction) |
| stage | one step of `next`, such as `intake`, `reference`, `concepts`, `plan`, `build`, `check`, `probe`, `review`, `deliver` |
| project state | `.design-pipeline/state.json`, which `next` writes in a user's project |
| change folder | an OpenSpec change folder that holds `state.json` and `events.jsonl`. A `full`-tier web or `ui` job has one, and so does a maintainer of this repository. `status`, `resume` and `explain-block` read it |
| gate | an automatic check that finds known failure shapes. It never grants creative acceptance. (The plan's "T0 gate" is a different thing: a first task that reads the tree and can stop the work, here called the stop check) |
| Visual Acceptance | a person looked and accepted. Agents never record it |
| entry command | one of the three commands that decide what happens next: `next` (with `decide`), `route` (with `toolchain` and `execution`), and the change commands `status`, `plan`, `run`. This change adds no fourth. The brief called them routers |
| fan-out | the installer copies each entry into its own folder next to the main skill |
| ownership marker | a small file, `.installed-by-design-pipeline.json`, that the installer writes into each folder it installs, so a later run knows the folder is its own |
| allow-list | a fixed list of the only files that may exist |
| near-miss | a sentence that looks like it fits an entry and must not load it |

A storyboard (`storyboard.json`) is a film's shot plan. A probe is a small test of how a page answers input. A concept card is one of the three ideas the `concepts` stage asks for.

## Problem

Today one skill drives one thing: the `next` loop. A user who wants to start by another task has nothing to say it to. Each claim below was read in the files or reproduced by a throwaway script or host probe that changed nothing in the repository.

- Nothing lets a user start by studying a reference, trying a few directions, reviewing a finished piece or resuming a job.
- `status` and `resume` look like the commands that continue a job. They are not. They work on change folders only; on a project that `next` started they answer `UNKNOWN_SCHEMA`. `resume` also needs `plan.json`, and it writes: it runs the plan to the first unfinished phase and records an event and the state file.
- The description of `skill/SKILL.md` has 405 characters and no "not for" part, so nothing tells a host what the skill must stay out of.
- On a crowded machine a new skill is easy to lose. This machine has 196 Claude Code skills and 147 Codex skills.

## The set on one page

Five entries and the index. "Missing" is what the entry cannot do because the tool does not exist. The entry says so.

| Entry | Task | Hands over to | Before it says done | Missing today |
| --- | --- | --- | --- | --- |
| `dp-create` | make something new | `next` and `decide`; the four workflow guides | `next` returned `done`; gate results and the user's accept or reject are reported apart. At quick, film, edit and web have no deliver stage, so it names the draft and the gate results | no music-only or 3D-only job; `ui` has no workflow guide and no automatic check |
| `dp-reference` (on trial until T7) | take a reference apart | the `reference` section of the film, edit and web guides; `reference-spec.md`; `composition capture`; `film-edit analyze` | `reference.md` has the sections that `reference-spec.md` lists under Required Sections (seven items), each item says how it was learned (command, viewing or the user's words); it says what could not be observed and what `next` will and will not see | nothing lets an agent watch or measure a reference video for film; no gate reads `reference.md`; web at quick, edit outside replicate and `ui` have no `reference` stage |
| `dp-preview` (on trial until T7) | a few directions or a rough sample first | `next` at standard until the pick, or at quick; `direction-preview.md`; `playground.md` | each result is labelled a sample; `deliver` was not called; the exit code of each check that ran; the sentence that `next` cannot see direction and playground files | direction and playground are checks on a change folder, built by hand; a `ui` job cannot finish in `next` without delivery, so the `ui` sample does not use `next`; a score sample needs a storyboard |
| `dp-review` | check or judge a finished piece | what the guide `references/workflow-<medium>.md` lists in its `check` (film, edit) or `probe` (web) section; `audio-gate.md` (`verify audio`); `composition-gate.md` (`composition capture`, `verify composition`); `qa-checklist.md` | two headed parts: "Checked by tools" (command, exit code, each finding with its `fix`) and "Needs a person's eye"; every check that did not run is listed; no Visual Acceptance. Exit codes: 0 passed, 2 a check failed or is blocked, 1 the command could not run | `ui` has no gate in `next`; a bare video file gets only the sound check and a picture check the agent must prepare |
| `dp-resume` | continue a film, edit, web or UI job, or say where it stands | `next` for a project folder; `status`, `explain-block`, then `resume` for a change folder | says which kind of state it found; changes nothing unless the user says continue | a `next` project has no `status` of its own beyond `next` |
| index `design-pipeline` | the fallback and the place to start | the entry table, the CLI line, the reference list | not applicable | none |

How the entries are kept apart and kept thin:

- **Tie-break in the text.** The rule "a sentence that names two tasks goes to the first action the user asks for" also sits in the descriptions. `dp-create` has the phrases "rebuild this page from the link" and "重做这个页面". `dp-reference` says NOT for "making or rebuilding the piece". `dp-review` says "If asked to check and fix, start here."
- **A pushy clause.** Every entry description has one sentence: "Use this whenever the user wants ..., even if they never say design-pipeline." A host otherwise tends to skip a skill for a short ask.
- **`dp-resume` is tied to the domain.** Its phrases name a film, an edit or a page ("continue the film project", "resume the promo", "pick the landing page back up", and two Chinese ones). Generic phrases such as "continue the project" would fire in any coding session, so they are dropped. The consequence is by design: a bare "what is the next step?" does not select `dp-resume`. The user types `/dp-resume`, or names the film, edit or page.
- **`dp-create` ends its NOT sentence with "small edits to code in an existing app".**
- **Entries point, they do not restate.** `dp-reference` points at the Required Sections of `reference-spec.md` instead of keeping its own list. `dp-review` points at the `check` or `probe` section of each workflow guide instead of copying the gate list, and keeps only the report shape and two honesty lines. `dp-preview` no longer scripts a `decide --stage reference` call: at the `reference` step it follows the guide and the user decides whether to skip.
- **The "Do not" list has reasons.** Every entry says: do not call `decide` unless `next` asked or offered it in a `then` line (an early decision skips the person's choice); do not record Visual Acceptance (only a person accepts); do not run `route` to pick a command (two ways to decide disagree); do not write a file the guide does not name; do not say a check passed when it did not run. `dp-preview` adds: do not call `deliver`. `dp-resume` adds: do not run `resume` on your own initiative, because it writes.

Considered and dropped: `dp-fix` (a small fix is `dp-create` at the quick tier); `dp-clone` (website cloning is a job of `route`, and `dp-create` in replicate mode covers "rebuild this page"; Q13); `dp-score` and `dp-3d` (no separate flow exists: `film score` refuses to run without `storyboard.json`); `dp-ship` and `dp-tools` (delivery is the last `next` stage, and the tool map answers "what exists").

The brief allowed up to six entry skills and one index. This design uses five entries. With the index that is six listed skills, and one entry slot stays unused on purpose. Each extra listed skill takes description space on every host.

## Packaging in one picture

The choice: sibling skills. The five entry files sit in a hidden folder, `skill/.entries/<name>/SKILL.md`, and the installer copies each one into its own folder next to the main skill. `scripts/package.cjs` is not edited.

| How the package was installed | omp | Claude Code | Codex |
| --- | --- | --- | --- |
| `install-local.cjs --root <that host's skills folder>` | index and five entries | index and five entries | index and five entries |
| unzip or copy `skill/` as `design-pipeline` | index; entries by the fallback path in the index | same | index; `.entries` is skipped, so the same |
| link `skill/` as `design-pipeline` (this machine's way) | same | same | same |
| copy or link each `.entries/<name>` by hand to `<root>/<name>` | entries listed | entries listed | entries listed |

A linked install cannot use the installer. It refuses a link as target, it refuses an existing folder without `--replace`, and it has no entries-only mode. On this machine `~/.agents/skills/design-pipeline` is a link, so the entries reach the hosts by hand. The README and the host run say so. Entries copied by hand carry no ownership marker, so a later installer run stops at them and names them: the user removes or renames them once, and the installer then installs marked ones (`design.md` 7.3 and 7.4).

Skills folders: Codex `~/.codex/skills` (it also reads `~/.agents/skills`); omp `~/.agents/skills`; Claude Code `~/.claude/skills`. Install into one folder per host, because Codex lists a skill twice if it sits in both of its folders.

| Option | What it is | Verdict |
| --- | --- | --- |
| A | entry files in `skill/.entries/`; the installer installs each beside the main skill | **chosen**. Codex skips dot folders, so the packaged copy is not listed twice |
| B | one skill with a task table, no new skills | the fallback, already in the index. It fails the request for task-named skills, and one description cannot hold five tasks in two languages |
| C | a visible folder such as `skill/entries/`, copied by the installer | rejected: Codex lists the packaged copy too and does not merge same-name skills, so each entry shows twice |
| D | entry files outside `skill/`, in a second package root | rejected: `package.cjs` needs a multi-root change and the archive root `design-pipeline/` changes |
| E | nested entries in `skill/entries/` and nothing else | rejected: Codex lists them, omp and Claude Code do not, so behaviour differs by host |

The smallest path has two levels.

**To have the entries at all:**

1. Five new files, `skill/.entries/<name>/SKILL.md`, one folder each and no other file in it.
2. `skill/SKILL.md` becomes the index: a scratch draft measures 47 lines and 2.8 KB (T2 measures the real file), against 77 lines and 4.3 KB.
3. `scripts/package.cjs` is not edited.
4. `skill/references/package-resources.json`: five lines in `required`, so `doctor` checks them in an installed tree too.
5. The planned "exactly one `SKILL.md`" check becomes a folder rule with no names: outside `upstream` folders, every `SKILL.md` other than `skill/SKILL.md` sits at `skill/.entries/<folder>/SKILL.md`. The exact five names live only in one constant list in `tests/entry-skills.test.cjs`. The front-door helper `tests/helpers/skill-surface.cjs` is not changed.
6. Two new test files, `tests/entry-skills.test.cjs` and `tests/entry-names.test.cjs`.
7. `README.md` gets an install section that tells a user to copy or link each `.entries/<name>` folder to the host's skills folder by hand (five folders per host), and says: a folder of yours with an entry's name is never replaced; the installer stops and names it; rename yours and run again. `CONTRIBUTING.md` gets one paragraph. `AGENTS.md` is not touched.

**To make typed names work with one command**, add the installer: `scripts/install-local.cjs` gains the copy-each-entry step and the ownership marker (about 45 to 60 lines; the prototype with the entry checks and the marker added 45, and the first prototype without the marker added 30), and `tests/install-local.test.cjs` gets new cases. It is the only code change and it can slip without breaking anything. It is in the default path because copying five folders per host by hand is easy to get wrong.

**The ownership marker.** This reverses the earlier draft, which had no marker and let the `dp-` prefix be the only guard.

- The installer writes `.installed-by-design-pipeline.json` into every folder it installs (the main folder and the five entries): the package name, the folder name and a version text. It writes it into the staged copy after `doctor` passes and before the swap, so it adds no rename. It never writes into the source tree, so the entry folders in `skill/.entries/` still hold only `SKILL.md`.
- With `--replace`, an existing path at an entry target is replaced only if it is a real folder (not a link, not a file) whose marker parses and names this package and this very skill. Anything else stops the installer before it copies or changes anything: exit 1, an error that names the folder, says design-pipeline did not install it, says `--replace` does not change that, and says to move or rename it or pick another `--root`. This check runs before the "target exists; pass --replace" message, so nobody is told to add `--replace` and then refused. A folder of the user's with an entry's name is never replaced.
- The main folder keeps today's rule: an existing folder needs `--replace` and is then replaced, marker or not, because no earlier release left a marker. It gets a marker after this install. The asymmetry has a reason: no earlier release installed entries, so every entry folder without a marker belongs to someone else, while the main folder of an old install is ours but unmarked.
- The version text comes from `PACKAGE.json` in the source when it is there (the packaged archive has one), else the `VERSION` file one level above `scripts/`, else `unknown`. It is informational and never compared. There is no new flag.
- The rename counts are unchanged: a fresh install 6, a replacement 12, an upgrade from an install without entries 7 (read from code, not run). An upgrade from an install without entries, with `--replace`, replaces the main folder and installs the entries as new folders.
- Evidence (design F24): a throwaway prototype outside the repository (Windows, fake `doctor`, a skeleton, not the real 175 MB `skill/`) passed 15 of 15 scenarios. Fresh install writes six markers and leaves the source clean. A second run without `--replace` is refused and changes nothing. An upgrade with `--replace` replaces marked folders and refreshes the markers. A user's own `dp-review` folder without a marker is refused with and without `--replace`, stays byte-identical, and nothing else is created. The refusal is all-or-nothing. A marker with the wrong package, the wrong skill, or not JSON is not trusted. A file named like an entry is refused. An old main folder without a marker is refused without `--replace` and replaced with it, then marked. A failure injected at each of the 12 renames of a replacement leaves every folder and marker as before, with no litter. `qa.cjs` and the existing installer test compare file contents only, not whole trees, so a marker file breaks neither (read). Not run: the real `install-local.cjs` with the real `skill/`, and the real `tests/install-local.test.cjs`.
- It still does not remove an entry folder that a later release drops or renames. The marker would let a later release do that; this one does not.

The repo-local router `.claude/skills/design-pipeline/SKILL.md` has the same name as the index. Which one a host shows depends on where it starts: Claude Code prefers a personal skill; omp prefers the router inside this repository; Codex reads `<repo>/.agents/skills`, not `.claude/skills`. The router keeps its name and gets three small edits, because two of its sentences would be wrong once the loop lives in `dp-create`: the `<objective>` sentence, `<quick_start>` step 2, and one line in `<reference_guides>`. Renaming it is Q8.

## What the investigation found

Each item says where it came from: seen (a file or document read), run (a script or probe I ran), or reported (someone else's statement, not run by me). The numbers below are this list's own. They match the fact numbers in `design.md` as follows: item 5 is F23 (where a loaded skill lives), item 7 is F25 (the name scan), item 18 is F18 and F24 (the installer prototypes), and items 19 and 20 are F19 (the validators).

1. **omp** finds `<skills-root>/<name>/SKILL.md` and nothing deeper, and offers `/skill:<name>`. For one name the first provider wins and a warning prints. Source: `omp://skills.md`. Seen.
2. **Claude Code** (2.1.267 installed) finds `<skills>/<name>/SKILL.md` and offers `/<name>`. It cuts the description at 1,536 characters. Over its listing budget it drops the descriptions of the least-used skills, so a new skill loses first and the older index likely keeps its description. A personal skill beats a project skill of one name. Nested folders: the page is silent, and another draft cites a maintainer saying they are not supported. Source: code.claude.com docs. Seen for the docs; nested folders reported, not run.
3. **Codex 0.155.0 probes** (through `codex app-server` and `codex debug prompt-input`, temporary `CODEX_HOME`, no model call). Run:
   - a nested `SKILL.md` is listed down to six folders below the skills root;
   - two skills with one name, one nested and one beside the main skill, are both listed;
   - a folder whose name starts with a dot is not searched (`.entries` was not listed; `_entries`, `entries`, `node_modules`, `upstream` were);
   - the prompt shows only the start of each description, shorter as skills grow: six skills gave 106 characters, forty gave 78 to 80, one hundred and twenty gave 44 to 46, and this machine's 147 gave 55 to 64.
4. **Codex frontmatter: the probe did NOT reproduce F13 of `add-web-capability-skills`.** Run. A colon and a space inside a description was listed whole. A space then `#` cut the description at the hash. A description that ended with a colon was dropped. A description of 1,025 characters was listed whole. That draft says a colon and a space drops the skill and more than 1,024 characters is rejected. I could not reproduce either, and the Codex build it used is not stated. The strict rules stay anyway, because they cost nothing and other parsers are stricter.
5. **Every host tells the agent where a skill lives.** Claude Code puts "Base directory for this skill: <path>" before a loaded skill's text (seen in local transcripts of Claude Code 2.1.250, 2.1.260, 2.1.266 and 2.1.275; its docs are silent). omp appends "[Skill directory: <baseDir>]" to a `/skill:<name>` message and says to resolve relative paths against it (seen in a local omp session log and the harness document). Codex shows the path of each `SKILL.md` in its list (seen in the probe). This replaces the earlier "not known" for Claude Code. Still not verified: nested or hidden folders inside a skill folder in Claude Code, and whether the line is always shown.
6. **The lists here are crowded.** `~/.claude/skills` holds 196 skills with 27,740 description characters (average 142, longest 737); Codex lists 147. Today's `design-pipeline` description has 405 characters. The six new description texts add up to 2,748, which is 2,343 more. Run.
7. **Neighbour names** (`review`, `code-review`, `design-review`, `qa`, `prototype`, `handoff` and others) exist here. The collision scan of 823 distinct names found none that starts with `dp-` and none equal to the plain entry words (see In short). A shipped description must not name neighbours, because a user may not have them. Seen and run.
8. **`skill/SKILL.md` today:** 77 lines, 4,293 bytes in the working tree; description 405 characters; it drives only the `next` loop. Seen.
9. **Eight front-door tests.** `tests/helpers/skill-surface.cjs` builds the front door from `skill/SKILL.md` plus the `references/*.md` files it names. Eight test files assert positive strings on it (`animation-opportunity-reference`, `deepclonewebsite-reference`, `direction-preview`, `interface-discipline`, `plain-language`, `skill-cli-handoff`, `skill-evals`, `victor-design-guidance`). `tests/hyperframes-routing.test.cjs` reads `skill/SKILL.md` directly, and `scripts/qa.cjs` needs the name `design-pipeline`. I scanned the nine simple assertions of the eight tests: none depends on the text that moves out of the index. The scan was simple; dynamic patterns were not evaluated. Seen and run.
10. **No current test forbids another `SKILL.md`.** Only the repo router is pinned. Hundreds of vendored `SKILL.md` files ship under `upstream/`, and `skill/SKILL.md` is the only one outside them. The check "exactly `skill/SKILL.md`" is planned by `add-web-capability-skills` T3 and has not landed, so it must become an allow-list. Seen.
11. **Packaging needs no code change.** `package.cjs` ships every entry under `skill/`, dot folders included: a skeleton run put a file under `.entries/` in the archive and `required` accepted it. `install-local.cjs` installs one folder, refuses a link as target and refuses an existing target without `--replace`. Run and seen.
12. **`next`** is read-only and answers the same twice when a state file exists. With no state and no `--deliverable` it asks "What are we making, and how big is it?". With a state file, `next --deliverable ...` fails with `OUTPUT_EXISTS` unless `--replace` is given, so an entry must call `next` without `--deliverable` when state exists. Run on a temporary project.
13. **`status` and `resume` fail on a `next` project.** Pointed at its `.design-pipeline` folder they answer `UNKNOWN_SCHEMA`. `status` and `explain-block` only read. `resume` needs `plan.json` in the change folder and writes an event and the state file. Run and read.
14. **Some checks write into project state.** `verify film-storyboard`, `verify interaction`, `film check` and `film-edit check` record their result in `.design-pipeline/state.json` when it exists, so `next` then counts the step done while the files stay unchanged. Read.
15. **`direction check` and `playground check` are checks only.** On an empty folder they answer `blocked`. Nothing generates the artifacts, and no `next` stage mentions either, so `next` cannot see them. Run and searched.
16. **A score needs a storyboard.** `film score` refuses to run without `storyboard.json`. `film blender` renders inside a film project and does not need one. There is no music-only flow and no 3D-only flow. Read.
17. **A `ui` job cannot finish in `next` without delivery.** `ui` has no gate and two stages at standard (`intake`, `work`). Its one stage `work` finishes only when `decide --stage deliver` is recorded. Film, edit and web at quick have no deliver stage. Read.
18. **The installer works on a skeleton, twice.** A throwaway copy with the copy step (155 to 185 lines) did a fresh install, refused without `--replace`, replaced three folders with a failure injected at each of the six renames, survived a failed `doctor`, refused a bad name, and Codex then listed each entry once. It looks at `.entries` before it copies anything, after its existing check that the source holds no links. A second prototype with the ownership marker passed 15 of 15 scenarios (above). Both ran on Windows with a fake `doctor`, not the real 175 MB `skill/`. Run.
19. **The six final descriptions pass four checks.** My structure rules (checks 2 to 5 below), `quick_validate.py` of skill-creator (run with Python UTF-8 mode on), `claude plugin validate`, and a Codex 0.155.0 listing from a scratch `CODEX_HOME` (all six listed, each description came back word for word). At this machine's crowd Codex shows about the first 55 to 64 characters, so the task words sit in the first 45 characters of every description. Run.
20. **What the validators do and do not check.** `quick_validate.py` crashes on the Chinese quotes if Python UTF-8 mode is off (this machine's locale is cp936) unless `PYTHONUTF8=1` or `-X utf8` is set. It does not check that the name equals the folder, colon-plus-space, the NOT clause or the 80-character first sentence. PyYAML rejects `a: b` inside a plain description, so the strict no-colon-space rule stays even though Codex 0.155.0 and `claude plugin validate` accepted it. Broken copies were rejected as expected for colon-space, angle brackets, 1,025 characters, an extra key (`argument-hint`) and a trailing colon; a copy with Windows line ends was accepted. `claude plugin validate` needs a folder of skills, not one skill; run alone it accepted the colon-space copy and rejected only a trailing colon. Neither validator is a repo gate (`AGENTS.md`: `node scripts/qa.cjs` only). Run.
21. **The omp skill line.** This omp session shows each skill as one short line, not its own text. For `design-pipeline` the line is "Use for promo films, PV/MAD edits, 3D shots, motion sites, UI/design systems." A skill whose description has a NOT clause keeps a "not for" part in its line (`maintaining-agent-skills` does); `design-pipeline` has none. Quoted trigger phrases are not shown. I compared two skills; the rewriting itself was not investigated. Seen.
22. **`skill/evals/evals.json`** (11 cases) checks which `route` job a prompt gets, not which skill a host loads, so it is not reused. Read.
23. **Web checks need a browser.** `composition capture` and `verify interaction` need Chrome and a browser driver (`puppeteer-core`); without the driver `composition capture` exits 1 with a clear message. `verify composition` on a page taller than the window reports `text-off-canvas` for text below the fold. `film-edit analyze` writes `edit/analysis.json` into the project folder it is given. Reported (a sibling draft's run) and read.

## Decisions

Each can be reversed. The reason is in `design.md` section 3.

| # | Decision | Reason in one line | Reversed by |
| --- | --- | --- | --- |
| D1 | Five entries and the index: six listed skills. The cap is six entries, the index not counted; one slot unused | each listed skill costs space on every host | Q13 |
| D2 | Sibling skills; the task table stays in the index as the fallback | the user asked for task-named entries; typed names work on all hosts | Q1 |
| D3 | Entry files in the hidden folder `skill/.entries/<name>/SKILL.md` | Codex skips dot folders, so the packaged copy is not listed twice | Q4 |
| D4 | The installer copies each entry; `package.cjs` unchanged; `required` lists five files | `package.cjs` already ships the folder | Q1, Q5 |
| D5 | An entry holds no rules: a fixed hand-over table, no keyword list, no call to `route` | that keeps this from being a fourth entry command | none |
| D6 | The medium is asked at most once per entry, and never when project state holds it | `next` stores it; an entry that creates no state cannot keep it | none |
| D7 | The index keeps its name, "Where the details are" and "Always"; loses the loop; gets a task table and a fallback sentence | `qa.cjs` and `hyperframes-routing.test.cjs` read names in it, and the eight front-door tests read the guides it names | none |
| D8 | A description opens with a sentence of at most 80 characters that names the task in its first 45, has one "Use this whenever ... even if they never say design-pipeline" sentence, lists quoted English and Chinese phrases, carries the tie-break, and ends with one "NOT for" sentence; strict character rules; at most 1,024 characters | a crowded host shows only the start of a description (Codex, 44 to 106 characters) or a one-line summary (this omp session, which keeps a "not for" part) | Q14 |
| D9 | Tests check structure only. What no test can check is read against a list at closure (9.5). The sample sentences are run by a person on each host | a test that reads its own table proves nothing; triggering is a model's choice | Q12 |
| D10 | The planned single-file check becomes an allow-list. The front-door test helper is not changed | the index keeps every name the eight tests read | none |
| D11 | The repo router keeps its name and gets three small edits | renaming changes a public name for no gain | Q8 |
| D12 | The tool list gets no new field; its `SKILL_NAMES` check also covers the commands named in the entry files; the map gets `## Ways to start` | one list, no parallel schema | Q9 |
| D13 | `dp-review` never calls `decide` unless `next` asks, lists checks that did not run, and keeps tool results and human decisions apart | `AGENTS.md`; checks write state; lifecycle S3 and S7 | none |
| D14 | `dp-resume` reads first and changes nothing unless the user says continue; for a change folder it runs `status` and `explain-block` before `resume` | `resume` writes | Q2 |
| D15 | Lands after `fix-tool-guidance-errors` and `add-web-capability-skills`, behind a stop check (T0) | the shared files in `design.md` section 1 | Q9 |
| D16 | The installer writes an ownership marker into each folder it installs. A folder of the user's with an entry's name is never replaced. The main folder keeps today's rule. No `--no-entries` flag | a prefix alone cannot tell our folder from a user's; no earlier release installed entries, so an unmarked entry folder is not ours | Q6 |
| D17 | The plain names `dp-create`, `dp-reference`, `dp-preview`, `dp-review`, `dp-resume`; confirmed only after the host table | they say what the user hands over or gets; "study" and "try" clash with everyday sentences | Q3 |

## The routing rule

1. An entry only hands over. It names an existing command or guide in a fixed table. It has no keyword list, no score, no rule that picks a command by reading the user's words, and it never calls `route`.
2. The host picks the entry from the description. That choice is the model's, not code's.
3. An entry may decide only a parameter it passes on: the medium, the tier and mode `next` already defines, "directions" or "sample". It never decides a stage: `next` does.
4. The medium is asked at most once per entry and never when project state holds it. After the first hand-over to `next` it lives in project state.
5. The three entry commands stay as they are. The tool list records them and never routes. This change adds no fourth: it adds descriptions and short tables that name existing things, and those names are checked.
6. A sentence that names two tasks goes to the first action the user asks for. "Check my cut and fix what is wrong" goes to `dp-review`, which reports and then hands the fixes to `next`. "Study this site and rebuild it" goes to `dp-reference`, and `dp-create` in replicate mode then continues with `reference.md` in place. "Rebuild this landing page from the link" goes to `dp-create`, because rebuilding is its first action.

## How the descriptions are written and checked

The rules: one line; a first sentence of at most 80 characters that names the task in its first 45; one "Use this whenever ... even if they never say design-pipeline" sentence; quoted trigger phrases in English and Chinese; one "NOT for" sentence. No colon followed by a space, no colon at the end, no space then `#`, no angle brackets, no backticks, at most 1,024 characters. Other skills are never named (a sibling entry of this package may be). Every entry has the same parts in order: frontmatter, a locator sentence, "Ask once", "Hand over" (a table), "Before you say done", "Do not". An entry is about 40 to 50 lines and at most 6,144 bytes; the index is at most 5,120 bytes. `dp-create` is about 80 lines because the loop moves into it: its moved `## Loop` and `## Talking to the user` sections sit after "Hand over" and before "Before you say done". A scratch draft of `dp-create` measured 5,984 bytes and 78 lines, so it has only about 160 bytes of room; if the real file passes 6,144, T2 shortens its new text and keeps the moved text whole. The other scratch drafts measured 4,416 bytes and 48 lines (`dp-review`), 4,308 and 43 (`dp-reference`), 4,110 and 42 (`dp-preview`), 3,446 and 42 (`dp-resume`), and 2,835 and 47 for the index.

The locator sentence is the same in every entry. It says: find the `design-pipeline` folder first; the folder your host printed for this skill is this skill's own and `design-pipeline` sits next to it; if you came through the index, the printed folder is `design-pipeline` itself; it holds `scripts/designer-pipeline.cjs` and `references/`, and every path below is inside it. The evidence is finding 5.

| Skill | Characters | First sentence (characters) |
| --- | --- | --- |
| `dp-create` | 618 | Create a new film, edit, web page or UI and check it before anyone sees it. (75) |
| `dp-reference` | 474 | Take a reference apart and write down what to borrow. (53) |
| `dp-preview` | 476 | Preview a few directions or a rough sample before the full job. (63) |
| `dp-review` | 460 | Check a finished film, edit, web page or UI and report the result. (66) |
| `dp-resume` | 420 | Continue a film, edit, web or UI job, or say where it stands. (61) |
| index `design-pipeline` | 300 | Start here for design-pipeline, a toolkit for film, edit, web and UI work. (74) |

The six add up to 2,748 characters, 2,343 more than today's 405; the earlier draft added 1,489. Every listing now carries those extra characters. The task word sits in the first 45 characters of every description, which is what a crowded host shows. If a host drops the descriptions, cut the "Use this whenever" clause after the host run (Q14). The counts were measured with a script on 2026-10-01.

The index description is the broadest of the six, not the narrowest: it covers "film, edit, web or UI design work". Only its words "and no dp- skill is listed" narrow it, and the model must check that itself. Claude Code drops the descriptions of the least-used skills first, so the older index likely keeps its description while new entries may show as names only. The first Claude Code row of the host run is "I need a promo film": record which skill loads.

Once T2 lands, the entry files are the source of the description text. The texts in the design are the first draft. A wording change after the host run is made in the entry file; design, plan and this summary are not re-edited, and T6 records the final texts in `qa.md`. The tests and the tool map read the files, not these documents.

The tests make eight structure checks. `tests/entry-skills.test.cjs` holds 1 to 6 and 8. `tests/entry-names.test.cjs` holds 7 alone, so slice T5 can delete it as a whole.

1. Files: the `SKILL.md` files under `skill/` outside `upstream` are exactly the index and the five entries, and each entry folder holds only `SKILL.md`. The walk includes dot folders. The five names are one constant list at the top of the test file, so a rename changes that list and the folders, nothing else in the test.
2. Frontmatter: keys are exactly `name` and `description`; `name` equals the folder name.
3. Characters: the rules above.
4. Shape: first sentence at most 80 characters; a sentence that starts with `NOT for`; at least three quoted phrases (the index two), at least one Chinese and one Latin.
5. No copied phrases: the quoted phrases are different across all six. This stops copy and paste. It does not show that the meanings do not overlap; that is the person's host run.
6. Size: each entry at most 6,144 bytes, the index at most 5,120 bytes, and every file fewer than 500 lines.
7. Command names: every `designer-pipeline <command> [<action>]` written in the index or an entry names a command the CLI help lists, and an action word that appears in a help line of that command. The parsing is loose on purpose, because the help packs several commands on one line. The tool list replaces this check.
8. Names and no `route`: the index table names each entry and the fallback path `.entries/`; every `references/...` path named exists; and neither the index nor any entry contains a `route` command shape, meaning `designer-pipeline route` or `designer-pipeline.cjs route` followed by an option, or a line inside a code fence that starts with `designer-pipeline route` or `node scripts/designer-pipeline.cjs route`. Plain prose such as "Run `route` to pick a command" passes, so an entry can say why it never does. The test has a self-test: a copy with a fenced `designer-pipeline route --query x` line must fail, and the prose sentence must pass. It stays after the tool list lands.

No test reads a phrase of prose or pins a wording. Whether a sentence loads the right entry is a model's choice, so `design.md` section 9 holds 30 sample sentences, 24 near-misses (N1 to N24, 7 of them Chinese), five "outside the tools" sentences and 7 boundary rows, as a document for a person to run on each host. Most sample rows avoid the words the descriptions quote, so they test meaning and not a copy. Three sample rows changed because of the domain-tied `dp-resume`: each now names a film or a landing page, for example "接着上次的做，把那支宣传片剪完。". One example each:

| Sentence | Should load |
| --- | --- |
| I need a 30-second promo for our new app. | `dp-create` |
| How is the pacing of this reference video built? I only want notes, nothing made yet. | `dp-reference` |
| I cannot decide how the pricing page should look. Can you sketch a few different looks first? | `dp-preview` |
| 这个成片有没有问题？帮我检查一下。 | `dp-review` |
| Pick up the film where we stopped last night. | `dp-resume` |
| What can design-pipeline do? | `design-pipeline` |

Near-misses with a shared word that must load no `dp-` skill: "Help me update my resume for a job application." (resume), "Help me study for the biology exam." (study), "Try that command again." (try), "Make a git commit with a good message." (make), "简历怎么写才能更吸引人？" (resume in Chinese). Four front-end near-misses were added: a spinner on a React settings page, navbar CSS that overflows, a hover flicker in Safari, and a class component converted to hooks. The "outside the tools" sentences (for example "Model this chair in Blender." or "Compose a two-minute piano piece.") should load no entry, or one entry that says plainly the tools do not do the job. None may start a `next` project. I read these rows against the new descriptions; no host has run them.

Section 9.5 of `design.md` lists six things that are read, not tested: the medium is asked at most once; each "Before you say done" holds what it should; no entry calls `decide` unasked, records Visual Acceptance or holds a keyword list; each hand-over row names something that exists and points at a guide section instead of restating its list; no file under `skill/scripts/` or schema file under `skill/references/` changed; and the task words sit in the first 45 characters of each description, where a reader looks at each first sentence. T6 reads each entry against the list and writes the result in `qa.md`.

## Links

**The tool list** (`add-capability-registry`). Nothing of that change is edited here. After it lands, slice T5 does three things.

- There is no new field and no new row: the entry files are found by their folder and are not stored in `tool-list.json`.
- The `SKILL_NAMES` check also covers the commands named in the five entry files: each must be an `active` entry. It does not check the guide paths of the entries against the list, because the entries name guides the list does not carry (`direction-preview.md`, `playground.md`, `reference-spec.md`, `qa-checklist.md`, `anti-slop-review.md`, `agent-interface.md`). Check 8 keeps checking that the paths exist.
- The generated map gets one section, `## Ways to start`, in `skill/references/tool-map.md`. It has one row per entry: name, first sentence of the description, and the commands and guide paths its text names (the paths as plain text). It is computed from the entry files, so it cannot drift.

T5 also deletes `tests/entry-names.test.cjs`, because the tool list then does that job. If the registry has not landed, check 7 carries the command names and T5 waits.

**The lifecycle** (`align-workflow-lifecycle`). Nothing of that change is edited here either. Its six steps map to the entries like this: `dp-create` uses all six; `dp-reference` step 2 (the reference part); `dp-preview` step 2 with a stop, or steps 3 and 4 at the quick tier; `dp-review` steps 4 and 5 run alone; `dp-resume` none, because it reads state. Three rules of that draft bind the entries. S3 (`decide` answers only what `next` asks) is why `dp-review` never calls `decide` on its own. S6 (a verdict is about the draft it judged) is why an entry never reuses an earlier accept. S7 (`done` separates what was checked from what was decided) is the shape of every report here. That draft's closing slice S10 edits the tier row and the decision line of `skill/SKILL.md`. Either order works: whoever lands second moves those lines to the file that holds them then. When its S2 adds `workflow-ui.md`, the `ui` rows of `dp-create` and `dp-reference` point there.

## Order and cost

This change lands after `fix-tool-guidance-errors` and `add-web-capability-skills`. It may land before or after `add-capability-registry` (T5 waits if it is not there) and either side of the lifecycle change. No file has two owners at the same time. Workers never run `node scripts/qa.cjs`; T6 runs it once on a quiet tree.

| Slice | Owns | Wave |
| --- | --- | --- |
| T0 stop check | nothing (reads); repeats the Codex probes of F3 (a to d) and F4, and reports if the F4 probe now agrees with F13 of `add-web-capability-skills`; saves the CLI help | first |
| T1 installer | `scripts/install-local.cjs` (copy step and marker), `tests/install-local.test.cjs`, `tests/helpers/fail-nth-rename.cjs` | 1 |
| T2 entry text | the five `skill/.entries/<name>/SKILL.md`, `skill/SKILL.md` | 1 |
| T3 docs | `README.md`, `CONTRIBUTING.md`, `.claude/skills/design-pipeline/SKILL.md` | 1 |
| T4 tests | `tests/entry-skills.test.cjs` (holds the one constant list of the five names), `tests/entry-names.test.cjs`, the one allow-list check in `tests/claude-code-surface.test.cjs` when it exists (a folder rule with no names) | 2, needs T2 |
| T5 tool-list link | `scripts/tool-list.cjs`, `tests/tool-list.test.cjs`, generated `skill/references/tool-map.md`; deletes `tests/entry-names.test.cjs` | 3, gated on the registry |
| T6 closure | `package-resources.json`, `scripts/test-manifest.json` (a line per new test file that exists), `CHANGELOG.md`, `qa.md`, the boxes of `tasks.md`; the spec file of this change only for a possible `MODIFIED` block of requirement 2; reads the entries against 9.5 and records the final description texts; reconciles the allow-list with the spec of `add-web-capability-skills`; runs `node scripts/qa.cjs` once and `openspec validate --strict` | last |
| T7 host run | nothing in the repository; a person; results go into `qa.md` through T6 | after T6 |

T1 tests, on a skeleton package with a stand-in `doctor`: the marker in all six folders with the right keys and the source clean; a user's own entry folder without a marker refused with and without `--replace`, byte-identical, nothing else created; a wrong-package, wrong-skill or not-JSON marker refused; marked folders replaced on upgrade with the marker refreshed; an old main folder without a marker replaced with `--replace` and then marked; a file or link named like an entry refused; and a failure injected at each rename (6, 12, 7) leaving folders and markers as before.

T1 can slip without breaking anything: with T2 alone the entries exist and the fallback sentence reaches them. T5 is last of the code slices, so closure does not wait on it when the registry has not landed. If the registry lands so late that T5 runs after T6, T5 becomes the first task of a follow-up.

What `node scripts/qa.cjs` proves: the package archive holds the five entry files and the index, and is the same bytes twice; the packaged installer installs the main skill and, through the installer test, the five entries beside it with an install marker in each, refuses a second install without `--replace`, and leaves a folder of the user's that has an entry's name untouched; the structure checks above; the front-door tests still pass; the test manifest lists the new test files; the repository status is unchanged after the run. What only a person can judge is in its own section below. Nothing here is a page or a film, so Visual Acceptance does not apply.

## Named follow-ups

These are not slices T0 to T7 and none is done by this change. Each keeps the audit's letter; the full text is in `tasks.md`.

- **L3 Trigger files.** One JSON file per skill in the change folder (not under `skill/`), a list of `{ "query", "should_trigger" }` in the format skill-creator's description tests read. Positives come from the sample table, negatives from the other skills' positives and the near-misses. Each positive is written realistically. Nothing in `node scripts/qa.cjs` reads them.
- **L4 Optional description runs.** skill-creator's `run_eval.py` and `improve_description.py` need PyYAML, a logged-in `claude` CLI and Linux, macOS or WSL. Here `claude` was logged out, and on Windows `select` on a pipe fails and every positive would count as a miss. Not a gate; structure checks rerun on anything it writes.
- **L5 Confuser table.** Sentences that fit both a `dp-` entry and a skill installed here (`design-review`, `prototype`, `design-shotgun`, `handoff`, `context-restore`, `review`, `code-review`, `qa`). A person decides the expected winner; the NOT sentences cannot name those skills.
- **L6 First host row.** The wording fix for the index is done. In T7 the first Claude Code row is "I need a promo film"; record which skill loads.
- **L7 `quick_validate.py` is not a repo gate.** By hand, set `PYTHONUTF8=1`; it does not check name equals folder, colon-plus-space, the NOT clause or the 80-character rule. The tests do.
- **L8 What `openspec validate` proves.** It checks the spec format, not behaviour. Behaviour is proved only by `node scripts/qa.cjs` and the person's host run.

## Open questions (defaults in bold)

You need to answer Q1, Q2, Q3, Q9, Q12 and Q13; the others are engineering details with defaults.

1. Sibling skills with an installer that copies each entry, or one skill with a task table? **Siblings; the table stays in the index as the fallback.** Or option B alone.
2. Keep `dp-resume`? **Keep, because of the `status` and `resume` name trap.** Or fold it into `dp-create` (four entries; `dp-create` gains three trigger phrases and a five-line "continue" part).
3. Names? **The plain names `dp-create`, `dp-reference`, `dp-preview`, `dp-review`, `dp-resume`, confirmed only after the host table.** Or the earlier draft `dp-make`, `dp-study`, `dp-try` (clearer against the near-misses, less clear about what you hand over or get), or longer names that say more when a host shows only the name (for example `dp-review-piece`).
4. Where do the entry files live? **The hidden folder `skill/.entries`.** Or a visible folder that the installer removes from the installed main folder; it needs a separate list in `package-resources.json`, because `doctor` checks `required` in the installed tree.
5. Where do entries install? **To the same `--root` as the main skill.** Or to a separate `--entries-root`.
6. A folder at an entry's name that the installer did not make? **Refuse without a marker: the installer stops, names the folder, and `--replace` does not change that.** Or the earlier rule: no marker, and the `dp-` prefix is the only guard (`--replace` then overwrites a user's folder).
7. Does the index description keep the words "no dp- skill is listed"? **Yes; it serves hosts that never list the entries.** Or drop them.
8. The repo router? **Keep its name and make three small edits.** Or rename it.
9. Is slice T5 part of this change? **Yes, last.** This change may land before the registry: then T5 waits, closing without it needs your yes, and T5 becomes the first pending task. Or make T5 a separate change.
10. Chinese words in the first sentence of each description, so a crowded Codex listing shows them? **No; models read the English sentence in either language.** Or add them.
11. Which hosts does the README show installs for? **Codex, omp and Claude Code, each with its skills folder.** Or Codex only, as today.
12. Who runs the sample table, and when? **You, once the entries exist, before the change is called finished.** Or someone else, or later.
13. A sixth entry (for example `dp-clone`)? **No.** Or add one; it needs real targets first.
14. Description length (2,343 more characters in every listing)? **Keep the "Use this whenever" clause; cut it after the host run if a host drops the descriptions.** Or cut it now.

## What only you can judge

1. Whether each sample sentence loads the right entry, and each near-miss loads none, on omp, Claude Code and Codex, with your real skill list. The procedure: install the entries into each host's real skills folder (by the installer, or by hand on a linked install), open a fresh session in an empty folder for each sentence, paste it, write down the skill the host loaded. A failing row is fixed in the description of the entry that lost it, then that row and all near-misses run again.
2. Whether the plain names are the right ones, whether the descriptions and the entry text read plainly, whether the names are understood when a host shows only the name, and whether the fallback path works for someone who copied `skill/` by hand.
3. Whether `dp-reference` and `dp-preview` are worth their place once you have used them. Both stay on trial until then.

## Not verified

- **Nothing about real triggering is verified.** No real trigger run of any kind was made. No host or model was asked which entry loads for any sentence, so the sample table, the tie-break and the tie to the domain in `dp-resume` are untested. A run in a clean folder would not show the crowded lists anyway. skill-creator's `run_eval.py` could not run here (a Windows `select` failure, and `claude` was logged out).
- Claude Code with folders inside a skill folder was not run (not needed, because entries install as siblings). That Claude Code always shows the skill folder line is seen in local transcripts, not guaranteed.
- Any Codex version other than 0.155.0; omp and Claude Code with the new descriptions; how a Claude Code listing over its budget treats these six. The hidden-folder trick holds only as far as it was tested. If a later Codex lists dot folders, each entry shows twice there and nothing breaks. The final text of the five other draft changes was not read: the design read their drafts, not code.
- The installer prototypes (the copy step, and the ownership marker with 15 of 15 scenarios) used a fake `doctor` and a skeleton, not the real 175 MB `skill/`. The real `install-local.cjs` and the existing `tests/install-local.test.cjs` were not run against them. The rename counts (six for a fresh install, twelve for a replacement, seven for an upgrade from an install without entries) were read from the code, not run.
- The scan of the eight front-door tests covered nine simple assertions; dynamic patterns were not evaluated.
- The collision scan covered this machine's skill folders only.
- `node scripts/qa.cjs` was not run (documents only). macOS and Linux installs, and the README steps for Claude Code and omp, were not tried. The rewriting of skill lines in this omp session was seen for two skills only.

## On approval

Answer the questions (or say "default"), most of all Q1, Q2, Q3, Q9, Q12 and Q13. Land the changes this one waits for: `fix-tool-guidance-errors` and `add-web-capability-skills` Phase A (or waive the order, knowing its cost). Run T0, the stop check. Then run T1, T2 and T3 in parallel, then T4. Run T5 only if the registry has landed. Then T6 runs `node scripts/qa.cjs` once, and then you run T7 on each host, confirm or change the names, and judge what only you can.
