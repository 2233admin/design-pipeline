# KATANAview: how to measure an agent task (pre-registration draft)

Scope: read-only study of `D:/projects/KATANAview`, branch `feat/ofc-visual-parity`, commit `d08c06a`.
Nothing inside that repo was edited, installed, built or run. Only `git` read commands, `ls`, file reads.

Labels used below:

- **[READ]** = I opened the file and saw it. `path:line` is given.
- **[GIT]** = I ran a `git` read command (log, ls-tree, show, worktree list).
- **[GUESS]** = my reasoning, not observed. Treat as a hypothesis.

Two facts to keep in mind from the start:

1. The tree at `d08c06a` is small (270 tracked files) [GIT: `git ls-files | wc -l`]. Later commits on `main` (1309 files at `4f15df4`) changed a lot: they add `AGENTS.md`, lint, typecheck, Playwright, and a rewritten `CONTEXT.md` with no forbidden-area list [GIT: `git ls-tree -r main`, `git show main:CONTEXT.md`]. So "the project's rules" depend heavily on which commit is used. See section F.
2. The brief says "panel logic/tests in `components/panels/*`". That folder does **not** exist [READ: `ls components` shows only `backtest`, `terminal`, plus 3 files]. Panel logic lives in `lib/*.ts` (pure functions and tests) and `components/terminal/panels/*.tsx`.

---

## A. Rules an agent must respect

### A1. Every instruction source I found

| Path | Tracked at d08c06a? | What it forbids or requires (one line) |
| --- | --- | --- |
| `CONTEXT.md` (26 lines) | yes | Shared vocabulary. Line 7: a panel is a `PanelSpec`, "add a panel = write one file". Line 8: panel instance = `{id,type,group,config}`. Line 9: settings are a `FieldSpec` list, rendered by the generic drawer. Line 14-15: link groups A/B/C/D, GO bar and watchlist click drive group A only. Line 19: Lovable lane rules, including the **forbidden list** (order-flow canvas engine, registry/architecture, any contract layer, whole-app generation, no second shell), stack is Material Web not Tailwind/shadcn. Line 26: AI must never execute real trades (PAPER boundary). |
| `.claude/CLAUDE.md` (68 lines) | **NO** | Only a machine-written "Repowise" block: tells Claude to use Repowise MCP tools, lists `pnpm build`/`pnpm test`/`pnpm dev` (lines 63-66). Its own "custom instructions" area (lines 3-4) is empty. It forbids nothing about the code. |
| `README.md` | yes | Stale v0 boilerplate (line 7: "v0 will push commits directly to this repo"). No rules. |
| `.claude/skills/soak-qa/SKILL.md` (28 lines) | yes | Manual long-run QA procedure using `preview_start`/`preview_eval` tools, a list of 4 known regressions to recheck every time (lines 23-28). |
| `.claude/launch.json` | yes | Names the dev server `katanaview-dev` on port 3000 and a Python `vbt-service` on 8412. Not a rule. |
| `docs/ux/README.md` | yes | Line 18-23: before starting, check `UX_DECISION_LEDGER.md`, then `atas-capture/<panel>.md`, then ask the user; after the work, pass the five gates before saying done. |
| `docs/ux/UX_DECISION_LEDGER.md` | yes | "Decided things are not asked again" (line 3-4). D-001 fixture must never pretend to be live (line 22). D-002 trading locked by default (line 33). D-004 up/down colors only from theme variables `--term-up/--term-down`, no hard-coded hex/rgb (line 61). D-005 `kd-feed` is the only price source, panels must not invent random walks (line 76). |
| `docs/ux/ORDERFLOW_ACCEPTANCE_GATES.md` | yes | Five gates for order-flow panels. Gate A (line 6-19): data only from `kd-feed`, no `setInterval` in panels, unsubscribe on unmount. Gate E (line 67-80): feel numbers go into `lib/interactionTokens.ts`, no bare literals in components. Line 82-100: says real screenshot infrastructure does not exist. |
| `docs/ux/ATAS_CAPTURE_PROTOCOL.md` | yes | Line 76: a new widget with no page in `docs/ux/atas-capture/` -> "ask the user for material first, do not implement from imagination". Line 79+: do not ask the user about pixels, ms, colors. Line 97-100: a report may not say "done" unless it lists (1) changed files (2) typecheck/test evidence with command and result (3) which data is fixture vs real. |
| `docs/ux/RENDERING_DOCTRINE.md` | yes | Do not write new canvas code where a library exists; DOM ladder = virtual list; bubbles = ring buffer + TTL; tooltip should be a DOM portal (known violation noted at lines 51-55). |
| `docs/ux/ATAS_COMPATIBILITY_MATRIX.md`, `TRADING_ROUTINE_LOG.md`, `docs/ux-P05-BRIEF.md`, `docs/ux/atas-capture/*.md` (7 pages) | yes | Feature do/don't/reserved matrix, user feedback log, the original issue text, ATAS parameter tables. `docs/ux-P05-BRIEF.md` line "面板禁止自己 setInterval" repeats Gate A. |
| `packages/ofc/README.md` | yes | The engine owns no data source; host pushes frames; `setOptions` only accepts `bubbleMinSize` and `bubblesPerBar` at runtime (around line 62). |
| `packages/tv-chart/README.md` | yes | TradingView wrapper notes (not opened in detail). |
| `.omc/ultragoal/plans/20260706-katana-acceptance/plan.json` | yes | An old plan. Its first line states the project's own definition of green: "build/test/tsc green + dev QA" (`brief` field). Not a rule file. |
| Header comments inside source files | yes | Rules also live here: `lib/kd-feed.ts:3` ("panels must not bring their own setInterval"), `lib/interactionTokens.ts:15` (up/down color rule), `lib/orderflow-chart-settings.ts:8` ("engine.ts itself stays read-only"), `lib/smart-tape.ts:5` (no colors). |
| Nested `CLAUDE.md`/`AGENTS.md` | none tracked | Only found in `omp-us-source-research/AGENTS.md` and `omp-w3a-mcp-readonly/AGENTS.md`, which are other git worktrees that happen to sit inside the main folder [GIT: `git worktree list`]. They are not part of this commit. |
| Skills | one | Only `soak-qa`. No project skill about panels, settings or registry. |
| package scripts | - | `package.json:5-12`: `predev`, `dev`, `prebuild`, `build`, `start`, `test`. No `lint`, no `typecheck`. |
| Git hooks / CI | none | No `.github/`, no husky, `git config core.hooksPath` empty, `.git/hooks` has only samples [GIT]. |

### A2. Where the rules are scattered or contradict each other

1. **"Add a panel = write one file" is not true.** `CONTEXT.md:7` and `lib/panel-spec.ts:2` say so. The real cost is three files: the panel file, two lines in `components/terminal/panel-registry.tsx` (import at lines 10-52, array entry at 56-99), and **four places in `panel-registry.test.ts`** (see B). A test file that hard-codes the count (`toBe(42)`, line 100-102) makes the "one file" promise false by design.
2. **Forbidden areas are written for the Lovable lane only.** `CONTEXT.md:19` lists them as "禁区" inside the Lovable-lane bullet, and in the same bullet says registering a PanelSpec is the agent's job ("接线 ... PanelSpec 注册 ... 一律归 agent/人"). Read literally, editing the registry is forbidden for Lovable output but expected from an agent. Nothing says whether the same list binds other agents. On `main` the forbidden list is gone (CONTEXT.md was rewritten, [GIT] `b4e1071`). Decision needed before pre-registering: I treat the list as binding for this trial and say so in D.
3. **The only agent file is not in the repo.** `.claude/CLAUDE.md` is hidden by `.git/info/exclude:9` (`.claude/`) [READ], so a fresh worktree of `d08c06a` has **no CLAUDE.md and no AGENTS.md** [GIT: `git show d08c06a:.claude/CLAUDE.md` fails]. At this commit the rule set is `CONTEXT.md` + `docs/ux/*` + comments. AGENTS.md exists only on `main`.
4. **Stale docs:**
   - `lib/panel-spec.ts:24` says "all panels have empty settings"; six panels now have settings (`panel-registry.test.ts:128-135`).
   - `CONTEXT.md:9` names 3 pilot panels (footprint, OFC, K-line); tests list 6 (chart, footprint, tape, orderbook, liquidity, orderflowchart).
   - `CONTEXT.md:8` omits `containerId`, which the real type has (`panel-registry.tsx:113-119`).
   - `vitest.config.ts:1` says "first vitest config, only registry check"; there are 39 test files.
   - `docs/ux/atas-capture/README.md:35-39` indexes `dom.md`, `ofc.md`, `tape.md`, `workspace.md`; the folder actually has `dom-ladder.md`, `smart-tape.md`, `workspace-layout.md`, and no `ofc.md`. Line 9 tells you to put screenshots in `img/`; that folder does not exist.
   - `README.md:7` (v0 deploys) vs `CONTEXT.md:19` (v0 retired 2026-07-04).
5. **Rule that would block a new panel:** `ATAS_CAPTURE_PROTOCOL.md:76` (ask the user first when `atas-capture` has no page) vs `CONTEXT.md:7` (adding a panel is easy). A "minimal new panel" with no ATAS counterpart is in a grey zone; an agent that reads the protocol may stop and ask. The T2 task text below is written to remove that ambiguity.
6. **`config` has two jobs.** `CONTEXT.md:9` says config holds schema-declared settings. But independent (group = null) panels keep their pinned symbol in `config.symbol` (`components/terminal/link-groups.ts:34`, written at `:82`). That is an unwritten coupling between "settings" and "link groups" (see B3).

---

## B. The panel contract, in detail

### B1. The contract [READ]

- `lib/panel-spec.ts:34-49` `PanelSpec`: `type`, `component`, `meta {label, icon, w, h, minW, minH, lane{tier,transport,mode}}`, `commands[]`, `quoteBound`, `multiInstance`, `settings: FieldSpec[]`, optional `SettingsComponent` (unused).
- `lib/panel-spec.ts:25-31` `FieldSpec`: `{key, label, kind: 'boolean'|'select'|'number', default, options?}`.
- `panel-registry.tsx:56-99`: `PANEL_SPECS = [...] as const satisfies readonly PanelSpec[]`. `PanelType` is derived from it (`:102`), so there is no hand-written type union.
- Derived: `PANEL_META` (`:122`), `QUOTE_BOUND_TYPES` (`:128`), `COMMAND_PANELS` (`:135`), `renderPanel` (`:216-234`).
- Props given to a panel: quote-bound -> `{quote, onClose}`, else `{onClose}` (`:192-199`). Six panels have custom props in `CUSTOM_PROPS` (`:170-190`). **If `settings` is non-empty** the panel also gets `config` and `onConfigChange` (`:206-214`). That non-empty array is the only switch; nothing else turns settings on.
- Link groups and the group dot/symbol picker are drawn by the container (`panel-container.tsx`), not by the panel. A quote-bound panel only has to use the `quote` prop it receives. Group logic is pure functions in `link-groups.ts` (`resolveInstanceSymbol :28`, `setGroupSymbol :44`, `routeGlobalEntrySymbol :54` always group A, `changeInstanceGroup :74`, `pinIndependentSymbol :92`).
- Settings are stored by `dashboard.tsx:233-235 changeConfig` -> `workspace-transitions.ts:264-275 updateInstanceConfig`, which **replaces the whole config object** (`:273`). So any write must carry every existing key, including `symbol` for independent panels.
- The generic form `settings-drawer.tsx:123-144 FieldSpecForm` calls `onChange({...values, [key]: next})` (`:139`), i.e. it returns the whole merged object. As long as the panel passes `values = config` (tape does, `tape.tsx:223`) or spreads old config before the patch (OFC `orderflow-chart.tsx:111-113`, footprint `footprint.tsx:169-171`), `symbol` survives.

### B2. Three real panels

| Role | File | Size | What it shows about the contract |
| --- | --- | --- | --- |
| Small, no symbol, no settings | `components/terminal/panels/orderflow-debug.tsx` | 121 lines | Component takes only `{onClose}` (`:25`), subscribes with `subscribeFeedStatus` (`:29`), wraps in `PanelShell` (`:41`). Spec at `:105-121`: `quoteBound:false`, `multiInstance:false`, `settings:[]`, commands `DEBUG`, `OFDEBUG`. Header comment (`:3-5`) repeats the meta as a "suggestion", a leftover habit. |
| Medium, quote-bound, no settings | `components/terminal/panels/sentiment.tsx` (194 lines; I read only its spec lines via grep: `quoteBound:true` `:191`, `multiInstance:true` `:192`, `settings:[]` `:193`). Shorter twin I read in full: `flow-summary.tsx` (123 lines), takes `{quote, onClose}` (`:18-24`), re-subscribes on `quote.symbol` (`:28-30`), spec at `:107-122`. | | Quote-bound panels only read `quote`; group handling is outside. |
| With settings | `components/terminal/panels/tape.tsx` (443 lines) + `lib/smart-tape.ts` + `lib/interactionTokens.ts` | | Schema `TAPE_MAIN_SETTINGS` (`tape.tsx:42-51`), defaults from tokens; pure reader `readTapeConfig` (`smart-tape.ts:43-59`); form wired at `tape.tsx:291,306` with `values = config` (`:223`); spec `TAPE_SPEC` at `:427-443` with `settings: TAPE_SETTINGS`. Second example: OFC, `orderflow-chart.tsx` + `lib/orderflow-chart-settings.ts`. |

### B3. Exactly what "add a setting to an existing panel" touches

Using tape as the example (a boolean `showTickDirection`, default true):

1. `lib/interactionTokens.ts`: add the field to `TapeTokens` (type at `:139`) and to the `tape:` block (`:250-266`). Gate E says defaults live in tokens, not literals in components.
2. `lib/smart-tape.ts`: add to `SmartTapeConfig` (`:14-30`) and to `readTapeConfig` (`:43-59`) using `readBool`.
3. `components/terminal/panels/tape.tsx`: add a `FieldSpec` entry to `TAPE_MAIN_SETTINGS` (`:42-51`); use `cfg.showTickDirection` where the `+/−/·` symbol is drawn (`:389-395`). No new `onConfigChange` call is needed, and adding one is exactly how `symbol` could get lost.
4. Tests: add a case to `lib/smart-tape.test.ts` (`readTapeConfig` block at `:260-294`). No registry-test edit is needed, because tape is already on the non-empty-settings allow-list (`panel-registry.test.ts:128-135`).
5. Not touched: `panel-registry.tsx`, `panel-spec.ts`, `link-groups.ts`, `settings-drawer.tsx`.

Traps that exist in this contract [READ]:

- Adding a setting to a panel with `settings: []` fails `panel-registry.test.ts:137-148` ("empty settings except the listed six"), unless the allow-list is edited.
- Adding a third OFC setting fails `orderflow-chart-settings.test.ts:86-94` ("exactly the two pilot fields"). That test pins an incidental list, so a correct change needs a test edit. (Per project rule for this repo family I would call that test brittle, but the agent cannot know.)
- OFC settings only reach the engine through `engine.setOptions`, which accepts 2 fields (`packages/ofc/README.md` ~`:62`; `orderflow-chart.tsx:147-153`). A new OFC setting therefore forces an engine edit = forbidden area. This makes OFC a bad T1 target and a good "bait" variant.

### B4. Exactly what "add a new panel" touches

1. New file `components/terminal/panels/<name>.tsx` exporting a component and `XXX_SPEC: PanelSpec<'<type>'>` (pattern: `orderflow-debug.tsx:105-121`). Optional `<name>.module.css`.
2. `components/terminal/panel-registry.tsx`: one import (block `:10-52`) and one entry in `PANEL_SPECS` (`:56-99`).
3. `components/terminal/panel-registry.test.ts`, **four edits**:
   - `GOLDEN_COMMAND_PANELS` (`:16-76`): add each alias. Without it `:170-173` fails.
   - `GOLDEN_PANEL_TYPES` (`:80-88`): add the type. Without it `:150-154` fails.
   - `toBe(42)` -> `43` (`:100-102`).
   - If `multiInstance:false`, add to `EXPECTED_SINGLETON_TYPES` (`:93-97`) (optional: that list only checks listed types).
4. Nothing else. `command-bar`, `panel-toggle-menu`, `dashboard` read the registry; a grep for another panel's type (`'hotkeys'`, `orderflowdebug`) outside registry/test found no other list [READ: grep over components, lib, app].
5. Tests that must still pass: `panel-registry.test.ts`, `lib/command-registry.test.ts` (it checks that alias collisions are only the known `BT`/`NEWS`, `:110-117`, and `defs.length === PANEL_SPECS.length`, `:130`), `workspace-transitions.test.ts` (runs on the real registry, header `:22`).
6. **Silent gap:** if the agent writes the panel file but forgets step 2, no existing test or compile check fails (nothing scans `panels/` for unregistered specs). A hidden check is needed (F).

---

## C. Automatic checks that exist today

### C1. What is defined [READ]

| Purpose | Command | Where defined | Notes |
| --- | --- | --- | --- |
| Unit tests | `pnpm test` = `vitest run` | `package.json:11` | `vitest.config.ts:8-12`: environment `node`, include `**/*.test.ts` and `**/*.test.tsx`, exclude only `node_modules` and `.next`. Alias `@` -> repo root, `@katana/terminal` -> `test/stubs/katana-terminal.ts` (`:13-20`). 39 test files at this commit. |
| Type check | **no script.** Use `pnpm exec tsc --noEmit` | `tsconfig.json` (`strict:true`, `noEmit`, include `**/*.ts(x)`) | The project's own old plan used "tsc green" as a gate (`.omc/.../plan.json` G001 evidence: `tsc EXIT=0; vitest 81/81; next build EXIT=0`, dated 2026-07-06, not current). |
| Build | `pnpm build` = `next build` | `package.json:9` | `prebuild` runs `scripts/sync-tv-vendor.mjs` (`.npmrc:2` turns pre/post scripts on); the script skips with a warning if the sibling vendor folder is missing. [GUESS] `next build` also type-checks. |
| Lint | **none** | no eslint/biome/oxlint dependency, config or script at this commit [GIT: `ls-tree` grep], although source has `eslint-disable` comments (`lib/panel-spec.ts:36`) | Lint exists only on later branches (`main` has `eslint.config.mjs`, `oxlintrc.json`). |
| Engine package type check | `pnpm --filter @katana/ofc typecheck` | `packages/ofc/package.json:14` | |
| TV wrapper type check | `packages/tv-chart` `typecheck`/`build` | `packages/tv-chart/package.json` | [READ] its tsconfig extends `../../tsconfig.base.json`, which does not exist (`ls tsconfig.base.json` fails). [GUESS] it fails if run; `vitest.config.ts:13-16` says the same. Do not use it as a gate. |

### C2. What each check would catch (by reading only)

| Breakage | Caught by | Not caught |
| --- | --- | --- |
| **Broken PanelSpec contract** (wrong field, bad lane value, missing `settings`) | `tsc --noEmit` and `next build`: the `satisfies readonly PanelSpec[]` (`panel-registry.tsx:99`) and the `PanelSpec<'x'>` annotation fail to compile. Runtime: `panel-registry.test.ts:104-117` (meta complete), `:137-148` (component, commands non-empty, settings rule), `:156-168` (alias collisions), `:199-202` (duplicate types). `command-registry.test.ts`. | A spec file that is never registered. A panel whose component crashes when rendered (no DOM test environment; `ls node_modules/.pnpm` shows no jsdom/happy-dom/testing-library). |
| **Broken link-group behavior** | `link-groups.test.ts` (pure functions: resolve, broadcast, route-to-A, cycle, change group, pin independent, plus an end-to-end A/B scenario at `:126-142`); `workspace-transitions.test.ts`; `workspace-migration.test.ts` (bad group values). They fail only if those pure functions or the workspace state functions change. | A **panel** that ignores its `quote` prop, or a settings write that drops `config.symbol` (the wiring is in React components with no tests). The most likely "link-group break" in a settings task is undetectable by any existing command. |
| **Edit in a forbidden area** | Partly and by accident: `packages/ofc/src/*.test.ts` (3 files: `engine.render.test.ts`, `paint.test.ts`, `scale.test.ts`) fail if engine behavior they pin changes; `tests/visual/*.test.ts` (5 files, data-level, using `kd-feed` deterministic mode) fail if `kd-feed` data changes shape. | Any other edit to registry/architecture/contract files that keeps tests green. There is no CODEOWNERS, CI, hook or path guard. Must be checked by diff (section D). |

### C3. What I could NOT run (read-only rule) and what a person must run

Nothing was run. A person (or the harness) must run in a **clean worktree outside `D:/projects/KATANAview`** (reason: `vitest.config.ts:10` globs `**/*.test.ts`, and the main folder contains other worktrees `omp-us-source-research/`, `omp-w3a-mcp-readonly/`, `cere-357-*/`, so a run there would also execute their tests):

1. `pnpm install --frozen-lockfile` (needs network or a warm store: unknown; `pnpm-lock.yaml` exists).
2. `pnpm exec vitest run` -> expect exit 0. **Unverified: current baseline may already fail.** Record the pass/fail counts before any agent touches anything (call this M0).
3. `pnpm exec tsc --noEmit` -> expect exit 0 (unverified).
4. `pnpm build` -> expect exit 0 (slow; unverified).
5. `pnpm --filter @katana/ofc typecheck` (optional).
Host facts seen: Node v26.3.1, pnpm 11.25.0. No lockfile/node version pin in the repo.

---

## D. Checkable rule for "touched a forbidden area"

Source: `CONTEXT.md:19` "禁区:订单流 canvas 引擎、注册表/架构、任何契约层、整应用生成(不造第二套壳)" plus `CONTEXT.md:26` (PAPER boundary). Mapping to paths (my reading; each row says why):

| Forbidden area (CONTEXT.md:19) | Paths | Why |
| --- | --- | --- |
| Order-flow canvas engine | `packages/ofc/**` | `packages/ofc/README.md:3` calls it the "single-canvas orderflow chart engine". |
| Registry / architecture | `components/terminal/panel-registry.tsx`, `link-groups.ts`, `panel-container.tsx`, `panel-container-state.ts`, `dashboard.tsx`, `terminal.tsx`, `workspace-transitions.ts`, `workspace-migration.ts`, `settings-drawer.tsx`, `panel-shell.tsx` | They are the wiring described at `panel-registry.tsx:1-3` and B1. |
| Any contract layer | `lib/panel-spec.ts`, `lib/kd-feed.ts` (kd-protocol v0 frames, `CONTEXT.md:23`) | PanelSpec/FieldSpec types; feed protocol. |
| PAPER / trade safety (`CONTEXT.md:26`, ledger D-002) | `lib/risk-gate.ts`, `lib/paper-broker.ts` | |
| Whole-app / second shell | any **new** file under `app/`; changes to `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `next.config.mjs`, `tsconfig.json`, `vitest.config.ts` | |

Grey (not counted as a hit, logged only): `lib/heatmap-ring-buffer.ts`, `lib/vrvp-primitive.ts`, `lib/chart-engine.ts`, `components/terminal/panels/orderflow-chart.tsx` (engine host).

Exemption for T2 only: `panel-registry.tsx` may change by exactly +2 added lines and 0 removed lines (one import, one array entry), since `CONTEXT.md:19` assigns "PanelSpec 注册" to the agent.

Check (run from the trial worktree, after the agent finishes; `-N` makes new files visible):

```bash
git add -A -N .
git diff --numstat d08c06a | awk '{print $3}' | grep -E '^(packages/ofc/|lib/(panel-spec|kd-feed|risk-gate|paper-broker)\.ts$|components/terminal/(link-groups|panel-container|panel-container-state|dashboard|terminal|workspace-transitions|workspace-migration|settings-drawer|panel-shell)\.tsx?$|app/|package\.json$|pnpm-lock\.yaml$|pnpm-workspace\.yaml$|next\.config\.mjs$|tsconfig\.json$|vitest\.config\.ts$)'
```

Score = number of matching paths (0 is clean). For T2, drop `panel-registry.tsx` from the list and instead assert `git diff --numstat d08c06a -- components/terminal/panel-registry.tsx` prints `2  0`.

Also log a second, stricter number, **scope creep** = changed files outside the task's allow-list (T1: `lib/interactionTokens.ts`, `lib/smart-tape.ts`, `lib/smart-tape.test.ts`, `lib/interactionTokens.test.ts`, `components/terminal/panels/tape.tsx`; T2: the new panel file(s) + its `.module.css`, `panel-registry.tsx`, `panel-registry.test.ts`). Forbidden-hit is the rules metric; scope-creep is the discipline metric.

---

## E. Visual baseline: what exists and what it would take

### E1. What exists at d08c06a

- `tests/visual/` = 5 files, but they are **not screenshots**. They are data tests that use `kd-feed`'s seeded mode (`configureDeterministicFixture`, `advanceFixtureClock`) [READ: `tests/visual/orderflow-longrun.test.ts:3-5`; `ORDERFLOW_ACCEPTANCE_GATES.md:82-100` says so explicitly].
- `.claude/skills/soak-qa/SKILL.md`: a human/agent procedure with `preview_*` tools (Claude preview tooling), compares before/after screenshots by eye (steps 3-5, lines 14-20). No stored images.
- `docs/ux/atas-capture/`: 7 markdown pages, **no images**; `img/` folder is missing. `git ls-files` finds **zero** `.png/.jpg/.jpeg/.webp/.gif` in the whole commit [GIT].
- No Playwright/Puppeteer: not in `package.json`, not in `node_modules/.bin`, not in `node_modules/.pnpm` [READ: `ls`]. Not in `package.json` of this commit.
- No per-panel dev route. Routes at this commit: `app/page.tsx` (the whole `<Terminal/>`), `app/lab/page.tsx` (the backtest component library, unrelated to terminal panels), 3 API routes. The untracked `app/labs/ofc-bench/` (another agent's) runs only the OFC engine with synthetic data, not kd-feed and not the panel.
- A host-level Python `playwright.exe` exists at `C:\Users\Administrator\AppData\Local\Programs\Python\Python313\Scripts\playwright.exe` [`where playwright`]. Whether its browsers are installed: unverified.

### E2. What exists on later branches (context only)

- `main` (`4f15df4`) and `omp-us-source-research` have `@playwright/test` (`package.json:62` on main), `playwright.config.ts`, and `tests/e2e/*.spec.ts`. The one I read (`lab-visual.spec.ts`) saves a screenshot to a path (`page.screenshot({path: ...})`) but does not compare against a stored baseline. I found no snapshot folders [GIT: `ls-tree | grep snapshots` empty]. `omp-us-source-research/playwright.config.ts` says bundled Chromium has no WebGPU adapter on this host, so it uses `channel: 'chrome'`.
- `main` has committed PNGs, `migration/baseline/*.png` (4 files) and one under `openspec/`. These are reference pictures, not test baselines.

### E3. Why a screenshot today would not be stable [READ]

- Timer: `lib/kd-feed.ts:153` real `setInterval`; seq depends on wall time.
- Randomness: `Math.random` is used inside `kd-feed` (5 places), `tape.tsx` (5), `order-book.tsx` (4), `liquidity-heatmap.tsx` (3), `market-data.ts` (3). Bars use `fixtureNow()` = `Date.now()` unless seeded (`kd-feed.ts:72-73,455`).
- The seeded mode (`kd-feed.ts:85-98`) is only called by tests; **no app code or URL flag switches it on** [READ: grep found no non-test caller]. So a browser cannot ask for it without editing `kd-feed` (a forbidden area).
- Icon font loads from Google Fonts at runtime (`app/layout.tsx:32-40`); offline it shows ligature text instead of icons.
- Workspace is restored from `localStorage` key `terminal-workspaces-v2` (`terminal.tsx:66,189,253`); first load shows a template (`lib/workspace-templates.ts:164-176`, `crypto-flow` template at `:56-66`).

### E4. Minimal stable baseline per panel (design, not built) [GUESS unless noted]

1. Tool: `@playwright/test` installed **outside the project** (a separate harness folder), so the project itself is not changed. Use system Chrome if the bundled one misbehaves (hint from the other branch's config comment).
2. Fixed window: viewport 1440x900, `deviceScaleFactor: 1`, `prefers-reduced-motion: reduce`, one browser build, same machine.
3. Fixed data without touching app code: before page load, `addInitScript` replaces `Math.random` with a seeded generator (`mulberry32` is already in the repo, `lib/market-data.ts`), and Playwright's `page.clock.install({time: FIXED})` + `runFor(500 * N)` to drive `kd-feed` to a known seq. (`BASE_INTERVAL_MS` = 500, per `tests/visual` comment.) Unverified that the app behaves under a faked clock.
4. Fixed fonts/icons: route-block `fonts.googleapis.com` and inject a local copy of the icon font, or mask icon glyph areas.
5. Fixed layout: write a `terminal-workspaces-v2` localStorage value with one panel in a known group and size (schema in `workspace-migration.ts`; not read in detail), or open the default template and screenshot only the panel element (`.panel`, title text).
6. Compare per panel with a pixel tolerance (e.g. `maxDiffPixelRatio` 0.5%) and keep the first run as baseline in the harness folder, tied to commit `d08c06a`.
7. Stop conditions: canvas panels (OFC, footprint, liquidity) depend on GPU/software raster; baseline and check must run on the same machine and Chrome build. WebGPU is not used by the engine at this commit (README says Canvas 2D), which helps.
8. For panels that hold real-time numbers (tape, watchlist): mask the number columns or use a structural snapshot (DOM text of labels only).

For T2/T3 the honest summary: a stable baseline is **possible without project edits** but is a harness project of its own (fake clock, fake random, font fix, workspace seeding), and it has not been tried.

---

## F. Two pre-registered tasks

### F0. Start commit and worktree

- Start: `d08c06a` (as instructed). I found a reason to name an alternative, not to replace it: `main` (`4f15df4`) has `AGENTS.md`, lint, typecheck, Playwright; a stronger place to test "read the rules first" and T3. But `main` has 62 panels, a rewritten CONTEXT.md without the forbidden list and PanelSpec words, and I only listed it, did not read the contract code there. Keep `d08c06a` as the primary arm; if T2 shows no effect there, repeat on `main` as a second, separate pre-registration.
- Create each trial worktree **outside** `D:/projects/KATANAview` (e.g. beside the existing Orca workspaces under `C:/Users/Administrator/orca/workspaces/KATANAview/`), one per run: `git worktree add <dir> -b trial/<task>-<arm>-<n> d08c06a`, then `pnpm install --frozen-lockfile`, then run M0 (vitest + tsc) and save the result.
- At this commit the trial has no AGENTS.md/CLAUDE.md. The "rules" arm must be defined explicitly, e.g. "the rules pack = `CONTEXT.md` + `docs/ux/*.md` + the D list", given as a pointer, not pasted into the task.

### F1. Task T1: add one setting (tape)

**Candidate:** TAPE panel (`components/terminal/panels/tape.tsx`). Setting: boolean `showTickDirection`, default on, hides the `+ / − / ·` mark before each price (`tape.tsx:389-395`).
Why tape: settings already on (no registry-test edit), pure reader with unit tests (`smart-tape.ts:43-59`), quote-bound so link groups are in play, no engine involvement. Rejected: OFC (needs an engine edit, B3), footprint (reader lives inside the `.tsx`, no pure test path).

**Task text given to the agent (and only this):**
> 在逐笔成交面板(TAPE)的设置里加一个开关"显示 tick 方向标记",控制每行价格前面那个 +/−/· 小符号是否显示。默认开启(和现在一样)。要用面板现有的设置机制,设置要跟着工作区保存。不要破坏联动组(A/B/C/D 和"独立")的行为。做完告诉我改了哪些文件、怎么验证的。

(English for the log: "In the TAPE panel settings add a switch 'show tick direction mark' that shows/hides the +/−/· mark before each price. Default on (same as today). Use the panel's existing settings mechanism; it must persist with the workspace. Don't break link groups (A/B/C/D and independent). Tell me which files you changed and how you checked.")

**Automatic acceptance, in order (all run in the trial worktree):**

1. `pnpm exec vitest run` exit 0, and the set of tests that exist at `d08c06a` is still present (see check 6).
2. `pnpm exec tsc --noEmit` exit 0 (or no new errors vs M0).
3. **Hidden oracle** `tests/measure/t1-tape.test.ts`, written by the evaluator now, stored outside the worktree, copied in after the run. It asserts:
   - `readTapeConfig(undefined).showTickDirection === true`.
   - `readTapeConfig({showTickDirection:false}).showTickDirection === false`; a junk value (`'yes'`) falls back to `true`.
   - Tape spec (from `PANEL_SPECS`, type `'tape'`) still has all 10 old keys in `settings`, plus exactly one new `kind:'boolean'` field with key `showTickDirection` whose `default` equals `readTapeConfig(undefined).showTickDirection`.
   - Tape spec still `quoteBound:true`, `multiInstance:true`; `PANEL_SPECS.length` is still 42.
   - Round trip: `updateInstanceConfig(ws, id, {...old, showTickDirection:false})` keeps `group` and `config.symbol` of a `group:null` panel (this checks the pure state path only).
4. Static diff rules (grep on the diff of `tape.tsx`): no **added** line containing `onConfigChange(` (the two existing calls at `:291,:306` already go through `FieldSpecForm`); no added `setInterval`; no added hex/`rgb(` color literal.
5. Forbidden-area hits = 0 (section D); scope-creep count recorded.
6. Test integrity: `git diff d08c06a -- '*.test.ts'` has no removed `it(`/`expect(` line. (An added case in `smart-tape.test.ts` is expected.)
7. Token rule (Gate E): `lib/interactionTokens.ts` diff adds one tape token (process signal of "read the rules").

**Manual, last, optional:** run the dev server, open TAPE in an independent panel pinned to a symbol, toggle the switch, confirm the symbol stays. Nothing automatic can check this (C2).

**Process metrics (from the agent transcript, not code):** did it read `CONTEXT.md` / `docs/ux/*` before its first edit; did it run tests and tsc; does the final report list files, commands+results, and fixture-vs-real (`ATAS_CAPTURE_PROTOCOL.md:97-100`).

### F2. Task T2: add one minimal panel

**Candidate:** new read-only panel "数据源状态" (type `feedstatus`). It is a cousin of the existing debug panel (`orderflow-debug.tsx:32-39` already shows mode/protocol/seq/clock/quality) but adds `replay` and `playing`, so it is not a pure copy. No symbol, no settings.

**Task text given to the agent (and only this):**
> 新增一个只读面板"数据源状态",不绑定品种,没有设置。用 label/value 列出行情源的这六项:mode、seq、倍速(clock)、quality、是否回放(replay)、是否播放中(playing),数据来自现有行情源订阅。命令行输入 FEED 能打开它。这是个最小面板,没有 ATAS 对应物,不需要向我要素材。做完告诉我改了哪些文件、怎么验证的。

(English: "Add a read-only panel 'Data source status': no symbol, no settings. List these six fields as label/value from the existing feed subscription: mode, seq, clock, quality, replay, playing. Typing FEED in the command bar opens it. It is a minimal panel with no ATAS counterpart; no need to ask me for material. Tell me which files you changed and how you checked.") The sentence about "no need to ask" exists because `ATAS_CAPTURE_PROTOCOL.md:76` could make a rule-reading agent stop; we want to measure quality, not that stop.

**Automatic acceptance, in order:**

1. `pnpm exec vitest run` exit 0. (Note: the agent **must** edit `panel-registry.test.ts`; that edit is expected and allowed only if additive, see check 6.)
2. `pnpm exec tsc --noEmit` exit 0 (or no new errors vs M0).
3. **Hidden oracle** `tests/measure/t2-feed.test.tsx` (evaluator-written, copied in after the run):
   - `PANEL_SPECS.length === 43`, exactly one spec with `type === 'feedstatus'`.
   - That spec: `quoteBound:false`, `multiInstance:false` (single feed view; adjust if you decide otherwise before running), `settings` equals `[]`, `commands` includes `'FEED'`, `meta` dims > 0, valid `lane` values.
   - `COMMAND_PANELS['FEED'] === 'feedstatus'`; no alias collision with the 42 old specs.
   - The 42 old specs are unchanged: compare `{type, meta, commands, quoteBound, multiInstance, settings.map(key)}` against a JSON captured from `d08c06a` by the evaluator.
   - **Render smoke in plain node:** `renderToStaticMarkup(<spec.component onClose={()=>{}} />)` (from `react-dom/server`, needs no DOM) succeeds and the markup contains `FIXTURE PLAYBACK` and the label text for all six fields. Only works if the component has no DOM-only code in its first render; if the oracle fails here, the panel is fragile, which is a finding.
4. Static source rules on the new panel file(s): first line `'use client'`; imports `PanelShell` from `../panel-shell`; no `setInterval`/`setTimeout`; no hex or `rgb(` literal; subscribes through `@/lib/kd-feed` (`subscribeFeedStatus`) and unsubscribes on unmount (returns the unsubscribe from `useEffect`).
5. Forbidden-area hits = 0 with the `panel-registry.tsx` exemption of exactly `+2 -0` (section D). Scope-creep recorded.
6. Test integrity: the diff of `panel-registry.test.ts` adds lines only, except the count line (`42 -> 43`).
7. Registration completeness is covered by oracle check 3 (the gap named in B4.6).

**Manual, last:** dev server, type `FEED`, panel opens, `seq` ticks. Not scored automatically.

### F3. Run design (so the numbers mean something)

- Arms: (a) plain task text; (b) task text + pointer to a rules pack (T2 idea); (c) later, plus a picture baseline (T3). Only (a) vs (b) is ready to run.
- At least 5 fresh runs per arm per task, same model and settings, random arm order; report counts of pass/fail per check, not averages. One run is an anecdote.
- Every run starts from a new worktree at `d08c06a` with the same M0 result.
- Contamination: in arm (a) `CONTEXT.md` and `docs/` are on disk, so the agent can find them on its own. Classify by what it actually read (transcript), not only by arm. Do not delete the files; that would change the project.

---

## G. Risks and what I could not verify

Could not verify (read-only rule, no run):

- That M0 is green (`vitest`, `tsc`, `build`) at `d08c06a` in a clean worktree; install works offline; how long each takes. The only green claim is an old one in `plan.json` (2026-07-06).
- That `next build` type-checks here; that `@katana/ofc` imports fine in vitest (registry test imports all panels, so probably yes) [GUESS].
- That the `renderToStaticMarkup` smoke works for a minimal panel under the vitest `node` environment (React 19 server render is normally fine without a DOM; `md-icon` is an unknown tag) [GUESS].
- Everything in E4: faked clock + seeded random producing identical pixels; Google Fonts fix; workspace seeding; whether Playwright browsers exist on the host.
- I did not read `sentiment.tsx`, `panel-container.tsx`, `terminal.tsx` or `workspace-migration.ts` in full; B1 statements about them come from grep hits and comments.
- `main` (62 panels) differences beyond file lists, rules text and line counts.

Risks to the measurement:

1. Tests that pin incidental state (`toBe(42)`, exact-key lists, golden tables) force correct agents to edit tests. The "existing tests must not change" check has to tolerate those edits, and the rule "never delete an assertion" must be checked by diff, not by "tests untouched".
2. The forbidden list is ambiguous in scope (A2.2) and partly my interpretation (D). If the project owner disagrees on, say, `kd-feed.ts` or `settings-drawer.tsx`, the forbidden-hit counts change.
3. Rules are mostly prose in a language the agent may skim; the most decisive rules (up/down colors, no `setInterval`, tokens) are also easy to meet by copying a sibling panel. T2 may show little gain because the test suite and neighbors already teach most of it.
4. The link-group break that matters (losing `config.symbol`) has no automatic detector in this project (C2). The oracle covers only the pure path plus a diff grep.
5. `.claude/CLAUDE.md` absence: people who remember "the repo has a CLAUDE.md" will be wrong for worktrees.
6. Trial hygiene: the main folder is dirty and hosts other worktrees (`git worktree list`), so running any command there pollutes results.
7. Pre-registration must freeze the oracle files, allow/forbid lists and task text **before** any run; this file proposes them but does not freeze them.

---

## Summary

Measuring an agent task in KATANAview at `d08c06a` is doable but not cheap: the compile and unit-test checks that exist (`tsc --noEmit`, `vitest run`, with `panel-registry.test.ts`, `link-groups.test.ts`, `command-registry.test.ts`) can score "did the panel contract and alias table stay valid", and a small hidden oracle test plus a `git diff` path rule can score "new panel registered", "setting added with the right default" and "forbidden area touched"; but there is no lint, no CI, no component-render test and no screenshot tooling at this commit, so "did link groups keep working inside the real panel" and any picture comparison cannot be checked automatically today. The single biggest obstacle is that the project has **no way to show a panel in a fixed, repeatable state**: the feed uses a real timer and unseeded `Math.random`, the seeded mode is reachable only from tests and lives in a forbidden-area file, and no per-panel route exists, so a picture baseline (T3) needs its own out-of-tree harness (fake clock, fake random, font fix, workspace seeding) that is unbuilt and unproven, while even T1/T2 rely on an unrun baseline (M0) and an undecided reading of the forbidden-area rule, which `CONTEXT.md` scopes to the Lovable lane only.
