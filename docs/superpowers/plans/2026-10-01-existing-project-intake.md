# Existing Project Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For a `ui` job in a folder with source code, `next` gives three facts (rule files with fingerprints, checks runnable or missing, quoted limits), `decide --stage intake` writes them into `brief.md`, a change in a rule file or check reopens `intake`, and a search cut by a limit is never called confirmed. `decide --stage deliver` stays as today.

**Architecture:** One new read-only module (five functions, `design.md` section 2), four small calls in `workflow-core.cjs`, new cases in `tests/workflow-next.test.cjs`. No new command, option, stage, gate, receipt, schema or state field.

**Tech Stack:** Node.js CommonJS, Markdown, OpenSpec; the Node test runner, only through `node scripts/qa.cjs`.

**Spec:** `openspec/changes/add-existing-project-intake/` (the contract). Order against the lifecycle draft: its `proposal.md`.

## Global Constraints

- `ui` only. Do not edit `cli-core.cjs`, `workflows/shared.cjs`, `film.cjs`, `edit.cjs`, `web.cjs`, `skill/SKILL.md`, `pipeline-reference.md` or the `deliver` branch of `decide`. The module uses `fs` only: no `child_process`, no write.
- Prerequisite: `fix-tool-guidance-errors` is committed. Do not create `skill/references/workflow-ui.md` (lifecycle slice S2 does); T4 adds to it only if it exists.
- Tests read fields, codes, files and rows; text checks only for a path or command string (`CONTEXT.md`, `pnpm exec tsc --noEmit`, `openspec/changes/`, `Work folder:`). Do not edit an existing case.
- Plain words. Only T5 runs `node scripts/qa.cjs`, directly. Workers smoke with throwaway scripts outside the repository, on a `git archive` copy, never in the KATANAview folders; edit only your files, keep other drafts' edits, do not commit.

## Fixed interfaces

`scan(root, reply)` returns `facts` (the spec's `project`; 12-character fingerprints, capped lists), `allRules` (`path`, `scope`, 64-hex `hash`, `matches`), the full `digest` and `checks`, and `truncated`. `inspectProject(root, reply = keptReply(root))` is `scan(...)?.facts`. Numbers, skips, names, word lists and check rules: the spec's (regexes ignore case; `\bnever\b`, `\bregister`). Script names: `test`; `typecheck`, `type-check`, `check-types`; `lint`; `build`. ESLint configs: `eslint.config.js|mjs|cjs`, `.eslintrc`, `.eslintrc.json|js|cjs|yml|yaml`.

**Walk.** `folder` = the first line of `reply` matching `/^[ \t]*Work folder[ \t]*:[ \t]*(.+?)[ \t]*$/im`, cleaned (quotes and backticks off, `\` to `/`, leading `./` and trailing `/` off); usable when non-empty, relative, without `..`, inside the root (`pathInside`) and a folder that is not a link (`lstat`). `full = walk(root)`. If `full` is cut and `folder` is usable, `used = walk(root, folder)`: the root folder's files and only `docs`, `.claude`, each folder on the way to `folder`, and `folder` with all below it (the way and `folder` are level 0, levels below count from `folder`); else `used = full`. `truncated` = `used` was cut; `workFolder` = `folder` when the second walk ran.

**Hint.** In `used`: at most 400 source files, first 30 lines, under 262144 bytes; a comment line starts (after trimming) with `//`, `/*`, `*`, `#` or `<!--`; a file counts when one matches a limit word. Gives `count`, `scanned`, `capped`, 3 `examples`, `tracked: false`; nothing reaches the digest or the brief rows.

**Digest.** SHA-256 of the lines `<path><TAB><sha256(bytes)>` of every rule file in `used`, sorted, then `checks<TAB><checks>`, joined by LF. **`checks`:** SHA-256 of `JSON.stringify` of `[purpose, status, command or null, script text or null]` for the four entries.

**`freshness(root)`** returns `{ stale, unconfirmed }`. No `brief.md` or no `## Existing project`: `{ [], false }`. `s = scan(root, keptReply(root))`: null gives `{ [], false }`; `s.truncated` gives `{ [], true }`. Rows `^- (root|nested|docs|checks|digest)  (.+?)  ([0-9a-f]{64})$` (`m`; CRLF read as LF), compared in full; no `digest` row: `{ [], false }`. `stale`, in order: a rule row with a missing file (`vanished`) or another hash (`changed`); an unequal checks row (`package.json (check commands)`); a rule file with no row, `added` while fewer than 40 rule rows were recorded. Nothing named, digest unequal: `[{ path: "rule files beyond the listed rows", change: "changed" }]`. **`keptReply`:** the text between `# Brief` plus a blank line and the blank line before `## Existing project`, else `null`. **`briefSection`:** the spec's section.

**Actions.** `UI_INTAKE.finished` = `brief.md` exists, `stale` empty, not `unconfirmed`. `UI_INTAKE.action(state, root)`, when the brief has the section: `unconfirmed` gives `{ type: "run", command, why, project: facts, unconfirmed: true }`; a non-empty `stale` gives the same with `stale` instead; otherwise today's ask plus `project` (with `project.note` when cut). Stale `command`: each path and change, read them again, then `designer-pipeline decide --project-root . --stage intake`. Unconfirmed `command`: the spec's plain sentences, then `Work folder: <folder>` and `designer-pipeline decide --project-root . --stage intake --answer "<reply>"`. The `intake` branch of `decide` without `--answer` uses `keptReply` (existing project, section present) or fails as today; it rewrites `brief.md` and records no decision.

---

### Task 1: Tests

**Owner:** worker A. **Wave:** 1. **Files:** Modify `tests/workflow-next.test.cjs` (append at the end).

**Fixture** `katana(dir)`: `package.json` (scripts `dev`, `build`, `test` = `vitest run`; dependencies `next`, `react`; devDependencies `typescript`, `vitest`), `pnpm-lock.yaml`, `tsconfig.json`; `CONTEXT.md` (heading, blank, `- Adding a panel means registering it.`, blank, `- Forbidden areas: the chart engine. Do not add a second shell.`); `docs/ux/ACCEPTANCE.md` (heading, blank, `Panels must not start their own timers.`, `Report the changed files and the commands you ran.`, `Never hard-code colours.`); `components/panel.tsx` (`// Colour rule: never hard-code a colour.`, `export const Panel = () => null`); `lib/feed.ts` (one line, no rule word). Expected: rules `CONTEXT.md`, `ACCEPTANCE.md`; boundaries `CONTEXT.md:5` (forbidden), `:3` (extension point), `ACCEPTANCE.md:3`, `:5`; hint count 1; checks `pnpm run test`, `pnpm exec tsc --noEmit`, lint missing, `pnpm run build`; `installed` false.

- [ ] **Step 1: Write ten cases** ("existing project: …"; `initState`, `tmp()`, `touch()`), one per group of spec scenarios; the spec says what each shows, this says which folders and edits:
  1. No source: `index.html`; a repo-shaped folder (`AGENTS.md`, `CLAUDE.md`, `scripts/qa.cjs`, `tests/a.test.cjs`, `skill/SKILL.md`, `docs/a.md`, `openspec/project.md`).
  2. Detection: `next` + `react` in `package.json`; only `components/panel.tsx`.
  3. The fixture plus `docs/a.md` (no rule word; listed after `ACCEPTANCE.md`).
  4. Limits: `node_modules/pkg/AGENTS.md`, `dist/CONTEXT.md`, `.next/CLAUDE.md`, `other-worktree/AGENTS.md` + `.git`; 60 docs files; ten files of five limit lines.
  5. Quick: files and bytes before and after two calls; an edit between calls; `full`.
  6. Standard intake: the rows; none for `panel.tsx`; not the sentence `Report the changed files…`.
  7. Variants (small folders with `react`): `package-lock.json` + `vitest`; `yarn.lock` + `jest`; `bun.lock` + `lint` script; placeholder test script; `pnpm-lock.yaml` + `eslint.config.mjs` + `eslint`.
  8. Freshness (intake done; restore after each step; each also with every stage finished): append to `CONTEXT.md`; add `docs/ux/NEW.md`; delete `ACCEPTANCE.md`; change the `test` script. Byte-identical brief after three calls: no change; a `next` version bump; a code-line edit of `panel.tsx`; an edited rule comment; a new `lib/new.ts` with `// never do x`. Flip the last character of the `CONTEXT.md` row, then of the `digest` row. 40 rule files plus a 41st; 45 with the last-sorted edited. Refresh: the reply (also with CRLF) and the decisions stay; no section: today's `--answer is required`.
  9. Cut walk (fixture + `a/b/c/d/e/f/g/AGENTS.md`): the ask; the intake; another deep file; `decide` with an answer saying the rules are unchanged, and with no answer. Reply ending `Work folder: components`; then `components/AGENTS.md` added; the deep file edited. Replies naming `nope`, `.`, `../x`, `components/panel.tsx`, `a`. Recorded not cut, then a deep rule file added. 450 files in `src/`.
  10. Untouched: `film`, `edit`, `web` (quick) in the fixture; a bare `decide(dir, { stage: "deliver" })` for `ui` at `quick`; a standard job begun without source, then given `package.json` with `next` and `src/a.tsx`.
- [ ] **Step 2:** Confirm they fail on today's tree (throwaway script); only case 1's first half and case 10 may pass. Do not run `node scripts/qa.cjs`.

### Task 2: The module

**Owner:** worker B. **Wave:** 1. **Files:** Create `skill/scripts/existing-project-core.cjs`; Modify `skill/references/package-resources.json` (add `"scripts/existing-project-core.cjs"` to `required` beside `"scripts/workflow-core.cjs"`).

- [ ] **Step 1:** Write `scan` and the five functions as above and in the spec (`sha256`, `pathInside` from `contract-utils.cjs`; root `package.json` read in a `try`; `scan` is `null` without a UI package or a source folder with a source file).
- [ ] **Step 2: Smoke** on `git -C <trial worktree> archive HEAD | tar -x -C <temp>`: 18 rules, hint 21 files, `CONTEXT.md:19` a `forbidden` boundary, not cut; an empty folder and this repository's root give `null`; `freshness` as in `design.md` R4; a level-7 rule file is `unconfirmed`, a `Work folder:` line makes it confirmable. `node --check skill/scripts/existing-project-core.cjs`.

### Task 3: The calls in `workflow-core.cjs`

**Owner:** worker C. **Wave:** 1 (step 4 waits for T2). **Files:** Modify `skill/scripts/workflow-core.cjs` only.

- [ ] **Step 1:** `const existing = require("./existing-project-core.cjs");` and `exists` from `./workflows/shared.cjs`. `UI_INTAKE.finished`; `UI_INTAKE.action(state, root)`: the reopening actions when `brief.md` exists, else today's ask (same `questions`, `record`, `question`, `why`) plus `project` when `inspectProject(root)` is not null.
- [ ] **Step 2:** The `work` action takes `(state, root)`: `command` from `workText(facts, tier)` and `project: facts` when `inspectProject(root)` is not null; else today's action.
- [ ] **Step 3:** The `intake` branch of `decide` only: `answer = options.answer || undefined`; `facts = inspectProject(root, answer)` for a `ui` job; `reply = answer || (facts ? keptReply(root) : null)`; no reply: today's failure; write `# Brief\n\n<reply>\n` and, with `facts`, a blank line and `briefSection(root, reply)`. The `deliver` branch stays.
- [ ] **Step 4: Smoke** on a copy as in T5 step 2 (refresh, cut walk, work folder).

### Task 4: Guide and changelog

**Owner:** worker D or the integrator. **Wave:** 2. **Files:** `CHANGELOG.md`; `skill/references/workflow-ui.md` only if it exists.

- [ ] **Step 1:** Under `## [Unreleased]`, `### Added`, for `add-existing-project-intake`: what `next` lists for a `ui` job in a folder with source code, the reopening, that a search cut by a limit is never called confirmed (name a work folder), that comment-only rules are a hint, and that completion is unchanged.
- [ ] **Step 2:** If `workflow-ui.md` exists, append `## Existing project` in five plain sentences: the `project` field; the rule files win over this guide; comment-only rules are a hint, so open the top of each file you change; when `next` asks for the intake again, read the named files and run `decide --stage intake` with no answer (in a project too big to scan fully: end the reply with `Work folder: <folder>`); the checks say nothing about how the screen looks.

### Task 5: Closure

**Owner:** the integrator. **Wave:** last.

- [ ] **Step 1:** `git status` shows changes only in the files of T1 to T4, this plan, the approval page and the change folder. Run `node scripts/qa.cjs` directly (hand failures back) and `openspec validate add-existing-project-intake --strict`.
- [ ] **Step 2: Smoke on copies** (never in the trial worktree): `git -C "C:/Users/Administrator/orca/workspaces/KATANAview/trial-tape-tick-direction" archive HEAD | tar -x -C <temp>`; with `node <repo>/skill/scripts/designer-pipeline.cjs … --root .`: `next --deliverable ui --tier standard` (`project`, 18 rules); `decide --stage intake --answer "add a setting to the tape panel"`; `next` (`work`); append to `CONTEXT.md`; `next` (`intake`, `stale`); `decide --stage intake`; `next` (`work`); `decide --stage deliver --answer done` (as before). A `--tier quick` copy: `work`, `project`, no `brief.md`. A copy with a level-7 `AGENTS.md`: `unconfirmed` whatever is answered; `work` once the reply ends with `Work folder: components`. The trial worktree's `git status --short` shows only its earlier `.design-pipeline/`. Remove the copies.
- [ ] **Step 3:** Write `qa.md` (commands, results, what was not run: the real-model trial, other systems, the project's own commands); tick `tasks.md`.

**Proves:** the cases pass, the file is listed and syntax-checked, the package builds, the smoke works on a real project's files. **Does not prove:** that any text helps an agent, that the project's commands pass, Linux or macOS, how S2 and S3 look when built, completion, the `probe` page problem, or anything outside the limits or the named folder. If S2 lands first, the three `UI_INTAKE` and `work` calls go into `ui.cjs` and T1's full-tier walk passes `reference` and `concepts` before `work`.
