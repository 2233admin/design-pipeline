# Existing project intake delta

## ADDED Requirements

### Requirement: A ui job in a folder that holds source code is recognised by its files

The `ui` deliverable SHALL treat a folder as an existing project when the root `package.json` lists `react`,
`next`, `vue`, `nuxt`, `svelte`, `@sveltejs/kit`, `@angular/core`, `solid-js`, `preact`, `astro` or `lit` in
`dependencies`, `devDependencies`, `peerDependencies` or `optionalDependencies` ("a dependency"), or when a
folder `src`, `app`, `components` or `pages` directly under the root holds, at any depth, a `.ts`, `.tsx`,
`.js`, `.jsx`, `.mjs`, `.cjs`, `.vue`, `.svelte`, `.astro`, `.css`, `.scss` or `.html` file. The files decide at
each call; no flag, option or state field does.

The search for rule files (the "walk") SHALL skip folders named `node_modules`, `dist`, `build`, `out` or
`coverage`, dot folders (except `.claude`) and any folder below the root with its own `.git`; SHALL NOT follow
symbolic links; SHALL NOT enter a folder more than 5 levels below the root (the root is level 0); and SHALL
stop after 4,000 entries. A cut by either limit SHALL set `project.truncated`. The scan only reads.

#### Scenario: A folder without source code is not an existing project

- **WHEN** `next` runs for a `ui` job in a folder with only `index.html`, or in one shaped like this repository (rule files, `scripts/`, `tests/`, no UI package, no `src`, `app`, `components` or `pages`)
- **THEN** the action SHALL have no `project` and no brief SHALL get an `## Existing project` section.

#### Scenario: A UI package or a source folder is enough

- **WHEN** `package.json` lists `next` and `react`, or there is no `package.json` and `components/panel.tsx` exists
- **THEN** `project.existing` SHALL be true and `project.detectedBy` SHALL name the package or folder.

#### Scenario: Vendor folders, hidden folders and other repositories are not read

- **WHEN** `node_modules/pkg/AGENTS.md`, `dist/CONTEXT.md`, `.next/CLAUDE.md` and `other/AGENTS.md` beside `other/.git` exist
- **THEN** none of them SHALL be in `project.rules`.

### Requirement: next gives the rule files of an existing project, with fingerprints

At `intake` of `standard` and `full` (the questions, or the refresh or narrow action below) and at `work` of
every tier, the `next` action of a `ui` job in an existing project SHALL carry `project` with `existing`
(true), `detectedBy`, `truncated`, `workFolder`, `rules`, `rulesOmitted`, `commentRules`, `commands`,
`checksFingerprint`, `digest`, `installed` and `boundaries`. Fingerprints in `project` are the first 12
hexadecimal characters of a SHA-256; the brief keeps all 64.

`rules` SHALL list the rule files: files named `AGENTS.md`, `CLAUDE.md` or `CONTEXT.md` (any case, any depth
the walk reaches) and every `.md` under the root `docs/`. Each has `path` (relative, `/`), `scope` (`root`;
`docs` under `docs/`; else `nested`), `fingerprint` (of the bytes), `lines` and `matches` (lines with a limit or
extension-point word). Order: `root`, `nested`, `docs`; the first two by path, `docs` by `matches` (most
first). At most 40 are listed and `rulesOmitted` holds the rest: only the display is capped.

`commentRules` is a hint for rules that exist only in code comments (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`,
`.cjs`, `.vue`, `.svelte`, `.astro`): `tracked: false`, `machineReadable: false` (the tool cannot tell which
rule applies to which change), `count` (files whose comment lines among the first 30 lines hold a limit word),
`scanned`, `capped` (more than 400 such files were found; files over 256 KB are skipped) and up to 3 `examples`
(`path`, `line`, `text`). It SHALL NOT take part in `digest`, in the rows of the brief, or in any stale or
unconfirmed decision.

#### Scenario: Rule files are listed by scope, with fingerprints, capped

- **WHEN** `CONTEXT.md` (root) and `docs/ux/ACCEPTANCE.md` exist and `next` runs at `work`, and in another project 60 Markdown files are under `docs/`
- **THEN** `project.rules` SHALL list `CONTEXT.md` (`root`) before `docs/ux/ACCEPTANCE.md` (`docs`), each `fingerprint` SHALL be the first 12 characters of that file's SHA-256, and the `command` SHALL name `CONTEXT.md`; the other project SHALL list 40 entries with `project.rulesOmitted` 20.

#### Scenario: Rules that live only in comments are a hint

- **WHEN** the first 30 lines of a source file hold a comment with a limit word
- **THEN** `commentRules.count` SHALL be at least 1, `tracked` and `machineReadable` SHALL be false, and an example SHALL give its path.

### Requirement: next marks each check as runnable or missing

`project.commands` SHALL hold four entries in this order, named by `purpose`: `test`, `typecheck`, `lint`,
`build`, each `runnable` (with `command` and `source`) or `missing` (with `reason`). The runner is `pnpm` for
`pnpm-lock.yaml`, else `yarn` for `yarn.lock`, else `bun` for `bun.lock` or `bun.lockb`, else `npm`; a package
script runs as `<runner> run <script>` (script names: the plan); the npm placeholder test script counts as
missing. Without a script: `test` is `<exec> vitest run`, else `<exec> jest`, whichever is a dependency;
`typecheck` is `<exec> tsc --noEmit` with `tsconfig.json` and `typescript`; `lint` is `<exec> eslint .` with an
ESLint config file and `eslint`; `build` has none. `<exec>` is `pnpm exec`, `npx`, `yarn` or `bunx`. `runnable`
means the project defines the command, not that it passes. `project.installed` SHALL be false without
`node_modules`.

#### Scenario: The checks of a project with no lint script

- **WHEN** `pnpm-lock.yaml`, `tsconfig.json`, `typescript` and `vitest` (dependencies) exist, with scripts `test` and `build` only; and in another project `package-lock.json` and `vitest` exist with no `test` script
- **THEN** `test` SHALL be `pnpm run test`, `typecheck` `pnpm exec tsc --noEmit`, `build` `pnpm run build`, and `lint` `missing` with a `reason`; in the other project `test` SHALL be `npx vitest run`.

### Requirement: Limits and extension points are quoted from the rules, never invented

`project.boundaries` SHALL hold up to 12 lines quoted from the files of `project.rules`, at most 2 per file, in
their order. Matching ignores case ("never" only as a whole word, "register" only at the start of a word). A
line with a limit word ("forbidden", "must not", "must never", "never", "do not", "don't", "read-only", "禁区",
"禁止", "严禁", "不得", "不许", "铁律") has `kind` `forbidden`; one with an extension-point word ("extension
point", "register", "registry", "contract", "注册", "契约") and no limit word has `kind` `extension point`. Each
entry SHALL carry `path`, `line` (from 1), `kind` and `text`, part of the line at `path:line` (trimmed, at most
140 characters cut around the first matched word, `…` at a cut end).

#### Scenario: A forbidden-list line is quoted with its place, at most two per file

- **WHEN** `CONTEXT.md` line 19 reads "禁区:订单流 canvas 引擎、注册表/架构、任何契约层" inside a longer line, and in another project ten rule files each hold five qualifying lines
- **THEN** `project.boundaries` SHALL hold `path` `CONTEXT.md`, `line` 19, `kind` `forbidden`, and a `text` that contains "禁区" and is part of that line; the other project SHALL get 12 entries, at most 2 per file.

### Requirement: The quick tier gets the same facts and writes nothing

`next` for a `ui` job at `quick` in an existing project SHALL return `project` and a `command` built from it at
`work` (`quick` has no `intake`), SHALL work the facts out at every call, and SHALL write nothing in the project
besides the state file it writes today (no `brief.md`). The `command` SHALL name the first rule files, the
runnable checks and the missing one, the file and line of the first quoted limits, how many files hold
comment-only rules (a hint), that the checks do not show how the screen looks (a person decides that) and, when
`truncated`, that the lists may be incomplete. It SHALL end with today's `decide --stage deliver --answer
<evidence>` and SHALL NOT tell the agent to create `DESIGN.md` or `MOTION.md`. At `full` it SHALL still tell the
agent to open an OpenSpec change under `openspec/changes/`; at `quick` and `standard` it SHALL NOT name that
folder.

#### Scenario: Quick shows the facts, writes nothing and sees an edit at once

- **WHEN** `next` runs twice for a `ui` job at `quick` in a KATANAview-shaped project, with a rule file edited between the calls
- **THEN** every file and its bytes, `.design-pipeline/state.json` included, SHALL be the same before and after the first pair of calls, `project` SHALL be present, the `command` SHALL name each runnable check's command, and the second call SHALL show the new fingerprint at stage `work`.

#### Scenario: The full tier keeps its OpenSpec sentence

- **WHEN** `next` runs at `work` in an existing project
- **THEN** at `full` the `command` SHALL tell the agent to open an OpenSpec change and name `openspec/changes/`; at `quick` and `standard` it SHALL NOT.

### Requirement: The intake keeps the reply first and the facts after, as pointers

`decide --stage intake` for a `ui` job in an existing project SHALL write `brief.md` with the heading and the
user's reply unchanged, then a section `## Existing project`: a line `Scan:` (complete, complete inside the work
folder, or cut); with full 64-character SHA-256 values, a row `- <scope>  <path>  <hash>` (two spaces between
parts) per listed rule file, `- checks  package.json  <hash>` and `- digest  all  <hash>`; the four checks; each
quoted limit as `path:line`, `kind` and `text`; and one fixed sentence: rules that exist only in code comments
are shown by `next` as a hint and are not tracked. It SHALL NOT copy the text of a rule file beyond the quoted
limits or list comment-rule files. A folder without source code SHALL get the `brief.md` it gets today.

#### Scenario: The brief holds the reply, then pointers with full fingerprints

- **WHEN** `decide --stage intake --answer "add a setting to the tape panel"` runs in a KATANAview-shaped project
- **THEN** `brief.md` SHALL start with `# Brief` and the reply, hold `- root  CONTEXT.md  <64 hex characters of its SHA-256>`, a `checks` row and a `digest` row whose first 12 characters equal `project.checksFingerprint` and `project.digest`, hold no row for a comment-rule file, and hold no sentence of a rule file that is not a quoted limit.

### Requirement: Any change in the rules or the checks reopens the intake until it is refreshed

`project.digest` SHALL be a SHA-256 over the complete, sorted list of `path<TAB>SHA-256 of its bytes` of every
rule file the walk found (not only the listed part) and the checks fingerprint; `project.checksFingerprint`
over the four check entries (`purpose`, `status`, `command`) and the text of each package script they came
from. The brief keeps the full values and every comparison uses them. Comment rules are in neither.

A `ui` job at `standard` or `full` whose `brief.md` holds `## Existing project` SHALL count `intake` as
finished only while the walk is not cut (next requirement) and every recorded row equals the value worked out
at the call. The comparison SHALL run at every `next` and, through the `next` it returns, every `decide`;
nothing is stored for it. Without source code in the folder, nothing is stale.

While a row is stale, `intake` SHALL be the first unfinished stage, even if all others are finished, and `next`
SHALL return for it a `run` action with `project` and `stale`: a list of `{ path, change }` (`changed`,
`added`, `vanished`) naming a recorded rule file that changed or is gone, the checks row as `package.json (check
commands)`, and a new rule file while fewer than 40 rows were recorded; if the digest differs and none is
found, one entry says rule files beyond the listed rows changed. Its `command` SHALL tell the agent to read the
named files again and to refresh with `decide --stage intake` and no `--answer`. That call SHALL rewrite
`brief.md` (reply unchanged, new section) and add or change no decision; without `--answer` and without a
section it SHALL fail as it does today.

#### Scenario: An edited rule file reopens the intake

- **WHEN** a `standard` `ui` job has finished its intake (or every stage) and then `CONTEXT.md` is edited
- **THEN** `next` SHALL return stage `intake`, not `work` or `done`, as a `run` action whose `stale` is `[{ "path": "CONTEXT.md", "change": "changed" }]`; after `decide --stage intake` with no `--answer`, `brief.md` SHALL hold the new value and the same reply, the decisions SHALL be the same, and `next` SHALL return `work`.

#### Scenario: Other changes reopen the intake

- **WHEN** `docs/ux/NEW.md` is added, `docs/ux/ACCEPTANCE.md` is deleted, or the text of the `test` script changes
- **THEN** `next` SHALL name the new file `added`, the deleted file `vanished`, or `package.json (check commands)` `changed`; a dependency version change alone SHALL make nothing stale.

#### Scenario: The digest covers every rule file, and every character of it is compared

- **WHEN** a project with 40 rule files gets a 41st, or a project with 45 rule files (40 listed) has one of the five unlisted edited, or a row of the brief differs from the current value only after its first 12 characters
- **THEN** `next` SHALL return the stage `intake` as stale, with one entry saying that rule files beyond the listed rows changed where no listed file is to blame.

#### Scenario: Nothing changed, or only a comment, means no noise

- **WHEN** nothing changes after the intake, or a rule word in the top comment of a source file is edited, or a new source file gets a comment with a limit word
- **THEN** `next` SHALL return the stage `work` and `brief.md` SHALL stay byte for byte the same after any number of calls; `commentRules.count` SHALL follow the comment change.

### Requirement: A project the walk cannot cover is never called confirmed

When the walk is cut (`project.truncated` is true) the tool cannot see every rule file, so it SHALL NOT count
`intake` as finished: not when every recorded value equals the current one, and not after any `decide` call,
with or without `--answer`, whatever the answer says. `next` SHALL return `intake` as the first unfinished stage
with a `run` action that carries `project` and `unconfirmed: true`. Its `command` SHALL say plainly that the
project is too big to scan fully, that the tool cannot confirm the project rules have not changed, and how to
narrow the scan (below), and that a folder already named may be missing, outside the project or also too big;
it SHALL NOT say the facts are current. The questions at `intake` SHALL carry the same advice in
`project.note`, present only when the walk is cut.

The reply MAY end with a line `Work folder: <folder>`: a folder inside the project (relative, `/`, not the
root, no `..`, not a link). When the walk is cut and the reply (the `--answer` being recorded, or the one kept
in `brief.md`) holds a usable line, the tool SHALL walk again, reading the rule files in the root folder, in
each folder on the way to the work folder, in the work folder and below it (levels counted from the work
folder), and under the root `docs/` and `.claude/`. `project.workFolder` SHALL name that folder and
`project.truncated` SHALL describe that second walk. An unusable line changes nothing. When the second walk is
not cut, the rules above finish the intake; a later change of a rule file it read makes the intake stale. No
option, state field or other step ends the wait: the tool SHALL NOT accept a declaration instead. What lies
beyond the limits or outside the work folder is not seen.

#### Scenario: A cut walk stays unconfirmed, whatever is answered

- **WHEN** the intake is answered in a project with a rule file deeper than 5 levels, and then another file is added beyond the cut, `decide --stage intake` runs with an answer that says the rules are unchanged, and once more with no answer
- **THEN** before and after each step `next` SHALL return the stage `intake` as a `run` action with `unconfirmed` true whose `command` says it cannot confirm the rules have not changed and names `Work folder:`, and SHALL NOT return `work`; the same SHALL hold when the brief was recorded with `truncated` false and a rule file deeper than 5 levels appears later.

#### Scenario: Naming a work folder makes it confirmable

- **WHEN** the reply ends with `Work folder: components` and the second walk is not cut
- **THEN** `project.workFolder` SHALL be `components`, `project.truncated` false and `next` SHALL return `work`; a rule file added inside `components` SHALL make the intake stale; a change of the deep file outside the second walk SHALL NOT.

#### Scenario: A folder that cannot be used, or is also too big, changes nothing

- **WHEN** the reply names a folder that does not exist, is outside the project or is the root, or a folder whose own walk is cut
- **THEN** `next` SHALL still return the stage `intake` with `unconfirmed` true.

#### Scenario: The hint scan never makes it unconfirmed

- **WHEN** a project has 450 source files in `src/` and a walk that is not cut
- **THEN** `commentRules.capped` SHALL be true, `project.truncated` false, and `next` SHALL return `work` after the intake.

### Requirement: This capability adds nothing else and does not touch delivery

The capability SHALL add no command, option, stage, gate, finding code, receipt, schema file or
workflow-state field (the state schema id stays `design-pipeline.workflow-state.v1`). The `next` output of
`film`, `edit` and `web`, the `ui` intake question ids (`product`, `audience`, `scope`, `assets`) and the
`record`, `question` and `why` of the `ui` intake SHALL stay as they are. `decide --stage deliver` SHALL behave
as without this capability; what counts as completion of a `ui` job is not decided here. What the checks report
is Component Conformance (what they found); the texts SHALL NOT claim that a screen looks right, and Visual
Acceptance (a person looked and accepted) SHALL stay a person's decision.

#### Scenario: Film, edit, web and the ui questions do not change

- **WHEN** `next` runs for a `film`, an `edit` and a `web` job in a KATANAview-shaped folder, and at `intake` for a `ui` job there
- **THEN** the first three actions SHALL have no `project` and SHALL equal those they give in a folder without source code; the `ui` question ids SHALL be `product`, `audience`, `scope`, `assets`, and its `record`, `question` and `why` SHALL equal the shared intake's.

#### Scenario: Delivery is unchanged

- **WHEN** `decide --stage deliver` runs with a bare answer for a `ui` job in a KATANAview-shaped project
- **THEN** the answer SHALL be recorded as it is without this capability.
