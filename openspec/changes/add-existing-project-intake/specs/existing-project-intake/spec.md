# Existing project intake delta (Phase 1: instant prompt)

## ADDED Requirements

### Requirement: A ui job in a folder with a root package.json is an existing project

The `ui` deliverable SHALL treat a project root that holds a `package.json` file as an existing project. The file
decides at each `next`; no flag, option or state field does. A root without `package.json` SHALL keep today's `work`
action byte for byte (`command`, `why` and `line`) at every tier.

#### Scenario: A new project keeps today's work text

- **WHEN** `next` reaches `work` for a `ui` job at `quick`, `standard` or `full` in a folder without `package.json`
- **THEN** `command`, `why` and `line` SHALL equal the output before this change.

#### Scenario: A package.json makes the work action host-first

- **WHEN** `next` reaches `work` for a `ui` job in a folder with `package.json`
- **THEN** the first line of `command` SHALL say that the project's own rule files and check commands govern the work and SHALL end with `designer-pipeline decide --project-root . --stage deliver --answer <evidence>`, and `line` SHALL hold only that first line.

### Requirement: The work action lists the host's rule files

In an existing project the `work` action SHALL list, one path per line, the root files named exactly `AGENTS.md`,
`CLAUDE.md` and `CONTEXT.md` that exist (in that order), then every `.md` file under the root `docs/` folder sorted by
its `/`-separated path in code-unit order. The `docs/` search SHALL skip dot folders, `node_modules` and symbolic
links, SHALL NOT go deeper than 4 levels (`docs/` is level 1) or past 2,000 entries, and SHALL say when either limit
cut it. At most 25 `docs/` files SHALL be listed, except that a quote source (below) SHALL always be listed; the
action SHALL give the number left out. The list SHALL be introduced as paths found on disk at this call, without a
claim that the tool read them or that the list is complete.

#### Scenario: Root rule files first, then docs in path order

- **WHEN** the root holds `AGENTS.md`, `CONTEXT.md`, `docs/a.md`, `docs/ux/b.md` and `docs/.drafts/hidden.md`
- **THEN** the listed paths SHALL be `AGENTS.md`, `CONTEXT.md`, `docs/a.md`, `docs/ux/b.md` in that order and `hidden.md` SHALL NOT appear.

#### Scenario: Many docs are capped and counted, quote sources are kept

- **WHEN** `docs/` holds `n00.md` to `n29.md` and `zz-RULES.md`
- **THEN** `n00.md` to `n23.md` and `zz-RULES.md` SHALL be listed and the action SHALL say that 6 more are not listed.

### Requirement: The work action lists the host's check commands and marks missing ones

In an existing project the `work` action SHALL list the checks `test`, `typecheck`, `lint` and `build`. A check
SHALL use the `package.json` script of the same name (for `typecheck`: `typecheck`, `type-check` or `tsc`, first
found), run through the package manager named by `packageManager`, else by the first lockfile found in the order
`pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`/`bun.lock`, else `npm`; the line SHALL show the script text. Without a
type-check script and with a root `tsconfig.json`, `typecheck` SHALL be `tsc --noEmit` (`npx` for npm, `<pm> exec`
otherwise), marked as not a package script. Any other check without a script SHALL be marked `missing`. The tool
SHALL NOT run any of them.

#### Scenario: Test and build scripts, a tsconfig and no lint

- **WHEN** `package.json` has `test: vitest run` and `build: next build`, no lint or type-check script, no lockfile, and `tsconfig.json` exists
- **THEN** the action SHALL list `test: npm run test`, `typecheck: npx tsc --noEmit`, `lint: missing` and `build: npm run build`.

#### Scenario: The checks are found again at every call

- **WHEN** after one `next` a `lint` and a `typecheck` script are added, `build` is removed and `pnpm-lock.yaml` is created
- **THEN** the next `next` SHALL list `lint: pnpm run lint`, `typecheck: pnpm run typecheck` and `build: missing`.

### Requirement: The work action quotes constraint lines from authoritative files only

Quote sources SHALL be, in this order: the listed root rule files; then listed `docs/` files whose file name contains
`LEDGER` or `DECISION`; then those whose file name contains `ACCEPTANCE` or `GATES`; then those whose file name
contains `PROTOCOL`, `RULES`, `CONVENTION` or `DOCTRINE` (case-insensitive; path order inside each group). Every
other `docs/` file SHALL be listed by path only and SHALL NOT be quoted. Source files and code comments SHALL NOT be
read.

In an existing project the `work` action SHALL quote, as `path:line: text`, lines of the quote sources that contain
one of: `must not`, `mustn't`, `never`, `do not`, `don't`, `forbidden`, `prohibited`, `not allowed` (English,
case-insensitive, whole words, straight or curly apostrophe) or `禁止`, `禁区`, `严禁`, `不要`, `不得`, `不允许`,
`切勿`, `不可`. Lines inside fenced code blocks SHALL be skipped; files larger than 512 KiB SHALL be skipped; a leading
byte order mark SHALL NOT shift line numbers. The text SHALL be the line with surrounding whitespace removed, cut at
400 characters with a marker. At most 3 lines per file and 15 in all SHALL be quoted, in quote-source order; the
action SHALL name the quote sources' rule, give the number left out and call the quotes a hint, not every rule.

#### Scenario: Rule, ledger and gate lines are quoted; a research doc is not

- **WHEN** line 2 of `CONTEXT.md` is `禁区：订单流 canvas 引擎、注册表/架构。` with a fenced block below holding `do not quote fenced code`, `docs/ux/UX_DECISION_LEDGER.md` line 2 holds `must not`, `docs/ux/ORDERFLOW_ACCEPTANCE_GATES.md` line 1 holds `不得`, `docs/research/survey.md` holds `never`, and `src/panel.ts` holds `// never read by the tool`
- **THEN** the quotes SHALL be `CONTEXT.md:2: 禁区：订单流 canvas 引擎、注册表/架构。`, then the ledger line, then the gates line, and the action SHALL NOT contain the fenced line, the research line or `src/panel.ts`, while `docs/research/survey.md` SHALL still be listed.

#### Scenario: Quotes per file are capped and counted

- **WHEN** `CONTEXT.md` has five lines containing `never` and `docs/zz-RULES.md` has one
- **THEN** `CONTEXT.md` lines 1 to 3 and `docs/zz-RULES.md:1` SHALL be quoted and the action SHALL say that 2 more matching lines are not shown.

### Requirement: The host facts are an instant prompt, not a record

The host facts SHALL be found again from the files at every `next` and SHALL only be printed in the `work` action.
Finding them SHALL NOT write `brief.md`, the state file or any other file, and no stage, gate or `decide` branch
SHALL read them. `decide --stage deliver` SHALL be unchanged.

#### Scenario: next writes nothing for the host facts

- **WHEN** `next` reaches `work` in an existing project
- **THEN** the state file SHALL be byte-identical before and after and no `brief.md` SHALL exist.

### Requirement: The work action of an existing project is host-first

In an existing project the `work` action SHALL NOT ask for `DESIGN.md` or `MOTION.md`, SHALL say not to run the
pipeline's route, foundation, toolchain or stack gates for the project, SHALL name `references/pipeline-reference.md`
only as optional background, and SHALL say that the checks do not show how the screen looks. At `full` the action
SHALL still start by asking for an OpenSpec change.

#### Scenario: Full tier keeps OpenSpec and lists the host facts

- **WHEN** `next` reaches `work` at `full` in a folder whose `package.json` has no scripts and which has no `tsconfig.json`
- **THEN** `command` SHALL start with `Open an OpenSpec change`, list `lint: missing` and `typecheck: missing`, and SHALL NOT contain `follow references/pipeline-reference.md` or `DESIGN.md/MOTION.md only at standard`.
