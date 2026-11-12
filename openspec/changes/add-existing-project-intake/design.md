# Design

What and why: `proposal.md`. Tested behaviour: the spec.

## Shape

`skill/scripts/existing-project-core.cjs` (only reads; no `child_process`, no writes):

```text
inspectHost(root)                          -> null | { ruleFiles, docsOmitted, docsCut, checks, quotes, quotesOmitted }
hostWorkCommand(facts, tier, deliverCmd)   -> string   // multi-line `command` of the ui work action
```

`workflow-core.cjs` `codeStages(tier)`: the `work` action takes `(state, root)`; when `inspectHost(root)` is not null
it returns `hostWorkCommand(...)` and a host-first `why`, otherwise today's action unchanged. `nextAction` builds
`line` from the first line of `command` (every other command is one line, so their `line` is unchanged).

## Rules

- **Existing project** = root `package.json` exists. Simple, matches the trial project, and decides only which text
  is printed, so a wrong guess costs one prompt, not a gate.
- **Rule files**: root `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md` by exact name from the directory listing (a
  case-insensitive file system must not report a name the file does not have), then `docs/**/*.md` sorted by
  `/`-path in code-unit order (not `localeCompare`, not `readdir` order). Bounds: depth 4, 2,000 entries, 25 listed
  (a quote source is always listed). Dot folders, `node_modules`, symbolic links skipped. `.claude/` is not read in
  Phase 1.
- **Checks**: `test`, `typecheck` (`typecheck` | `type-check` | `tsc` script), `lint`, `build`. Package manager:
  `packageManager` field, else first lockfile of pnpm, yarn, bun, else npm. `tsconfig.json` without a script gives
  `tsc --noEmit`. Defined, never run.
- **Quote sources are separate from listing.** Only the root rule files and `docs/` files whose name marks them as
  authoritative are quoted, in groups: `LEDGER|DECISION`, then `ACCEPTANCE|GATES`, then
  `PROTOCOL|RULES|CONVENTION|DOCTRINE`. Research notes, briefs and capture pages are listed by path, never quoted:
  in the first cut, which quoted every listed doc in path order, research-doc lines ("was never built for one")
  used up the budget and the decision ledger was cut. Decisions come before gates so the per-file and total caps
  cut the least authoritative files first.
- **Quotes**: English `must not|mustn't|never|do not|don't|forbidden|prohibited|not allowed` (whole words,
  case-insensitive, `'` or `’`) and Chinese `禁止|禁区|严禁|不要|不得|不允许|切勿|不可`. Bare `禁` was dropped: on
  KATANAview it matched `禁用` ("disabled") in UI specs dozens of times. Fenced code skipped; BOM stripped; files over
  512 KiB skipped; 3 per file, 15 in all; text cut at 400 characters with a marker.
- **Wording** claims only what the tool did: "found on disk at this call (paths only; this tool has not read them
  for you and does not claim the list is complete)", "defined, not run", "a hint, not every rule".

## Calibration (KATANAview `d08c06a`, `git archive` copy)

1 root rule file (`CONTEXT.md`) and 17 docs listed; 4 of them are quote sources (`UX_DECISION_LEDGER.md`,
`ORDERFLOW_ACCEPTANCE_GATES.md`, `ATAS_CAPTURE_PROTOCOL.md`, `RENDERING_DOCTRINE.md`). Checks `test` and `build` from
scripts, `typecheck` via `pnpm exec tsc --noEmit`, `lint` missing. 12 quotes shown, 19 more not shown: `CONTEXT.md:19`
(禁区) and `:26` (不可), then ledger lines 4, 8 and 22 (`D-001`), gates, protocol, doctrine; no `docs/research` line.
Per-file cap 3 means the ledger's `D-004`/`D-005` headings are not shown; the file path is. The prompt is about 45
lines.

## Boundaries

- No persistence, digest, staleness or work folder (proposal: Later). Nothing reads the facts back.
- `decide --stage deliver` unchanged; `component inventory` not wired; `web` untouched.
- A new module rather than `shared.cjs`: lifecycle slices edit `shared.cjs` and `workflow-core.cjs`, and
  `scripts/qa.cjs` syntax-checks `skill/scripts/*.cjs`.
