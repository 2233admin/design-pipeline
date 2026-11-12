# Design

This change adds two guides for people building or reviewing a web page (the **web guides**), an
evaluation guide for maintainers, and a way to test whether the guides help. It also rewrites the
description of the front door, registers the two web guides in the tool list, and adds a few
structure checks to tests that already exist. It adds no gate, finding code, receipt, schema, CLI
command, benchmark manifest or script.

Words are used as in the glossary at the top of
`docs/superpowers/specs/2026-09-30-web-capability-skills.md`. Facts were read at `b631fcd` (the commit
that landed `add-web-treatment-and-section-briefs`) on 2026-09-30, plus the uncommitted drafts of
`fix-tool-guidance-errors` and `add-capability-registry`. Each fact names its source and says whether
it was seen on this machine or only reported. This file is the single source for decisions, contracts
and numbers; the other files of the change point here. The open questions (Q1 to Q14) are answered in
the approval document; the sections below name the ones they depend on.

## 1. Order of changes and shared files

- **Order.** (1) `fix-tool-guidance-errors`, (2) `add-capability-registry`, (3) this change. Neither of
  the first two is committed yet. `add-web-treatment-and-section-briefs` is committed as `b631fcd`.
  This change lands last, so it starts from a tree that holds all three earlier changes, and task T0
  stops it if one is missing.
- **Why the registry matters here.** `add-capability-registry` adds one list of every command and
  guide (the tool list, `scripts/tool-list.json`: a repository file, not shipped), a readable map made
  from it (`skill/references/tool-map.md`: shipped, never edited by hand) and a repository script,
  `scripts/tool-list.cjs`, with a `--check` mode (never writes) and a `--write` mode (rewrites the map,
  then checks). Its test, `tests/tool-list.test.cjs`, runs inside `node scripts/qa.cjs` and fails when:
  - `skill/SKILL.md`, the repo router or a `next` action names a guide that has no entry in the list;
  - an entry says it belongs to a stage (for example `web:review`) and no `next` action at that stage
    and no `## review` section of `workflow-web.md` names it;
  - the map no longer matches the list.

  So every guide this change adds is registered in the same phase that adds it (D11). The rules a
  later change follows when it adds a guide are in the section "Rules for later changes" of
  `openspec/changes/add-capability-registry/tasks.md`; this change follows them and does not copy them.
- **Shared files.** Three changes edit `skill/SKILL.md`, and several other files are shared too.
  `tasks.md`, table "Shared files", names the owner of each file per change and per task. The last
  change to land (this one) measures `skill/SKILL.md`.
- This is not one of changes 2 to 4 of `docs/superpowers/specs/2026-09-29-web-creative-layer.md`. It
  takes over the evaluation protocol of change 3 and leaves the golden page, the section kit and the
  multi-viewport capture to their own changes. Fact F10 is the reason change 4 matters for review.
- `web-direction.md` stays the single source for the treatment fields, the section-brief mapping and
  the W1 to W7 table. The new guides point to it and never copy a table.
- Brainstorm ideas used (numbers are the order in `.memlog.md`): concept cards and parameter table
  (72-88); Style table, blacklist and must-deviate list (14, 17, 23, 48, 55, 58, 62, 63); W1-W7 as
  yes/no and the five-second test (24, 46, 112, 126); blind A/B and the evaluation protocol (27, 52,
  110, 111, 130-133). Left out on purpose: scroll-equals-time review (120, 121), review overlay and
  delete-element snapshots (104, 105), density line (108), golden page (50), cover-frame check (11),
  three-section first delivery (19), per-viewport briefs (21), film reuse (117-119), one-sentence page
  test (109), single-file 4 KB budget (122, 123), reference upload (124), a table of combinations
  known to look generic (87; none has been validated).

## 2. Facts

| # | Fact | Source | Status |
| --- | --- | --- | --- |
| F1 | `scripts/package.cjs` archives every file under `skill/` plus the generated `PACKAGE.json` and `scripts/install-local.cjs`. `required` in `package-resources.json` only makes packaging and `doctor` fail when a listed file is missing. `install-local.cjs` runs `doctor` on the staged copy, so a `required` file cannot be left out of an installed arm. | `scripts/package.cjs`, `scripts/install-local.cjs`, `inspectDoctor` in `cli-core.cjs` | seen (code) |
| F2 | `skill/SKILL.md` is 4,108 bytes and 76 lines (`wc -l`) at `b631fcd`; its `description` is 405 characters. No test or QA check enforces a size. The 5,120-byte limit is written in the previous change and in the drafts of the two changes before this one, but nothing checks it; the earlier progressive-disclosure spec caps the front door at 500 lines. The guidance-fix draft adds about 100 bytes and the registry draft about 80. | `skill/SKILL.md`; search of `tests/` and `scripts/`; the three drafts | seen |
| F3 | Agent Skills specification: `name` at most 64 characters and equal to the folder name; `description` at most 1,024; body under 500 lines; file references one level deep from `SKILL.md`. | agentskills.io/specification | seen (page) |
| F4 | Codex CLI 0.155.0 lists a nested `SKILL.md` as an independent skill when it sits up to six folders below the skills root (five below the installed skill folder); one folder deeper it does not. Probe: temporary `CODEX_HOME`, `skills/list` through `codex app-server`. On this machine it already lists eight vendored `interface-discipline` skills from this package next to `design-pipeline`; the 178 deeper vendored files (`mengto-skills`, `iart-motion-skills`, `prism-system`) are not listed. | local `codex app-server` | seen (this machine, this version) |
| F5 | omp discovers `<skills-root>/<name>/SKILL.md` only; nested files are not discovered. | `omp://skills.md` | seen (harness document) |
| F6 | Claude Code scans one level; a maintainer says folders inside a skill folder are not supported. | anthropics/claude-code issue 18192 | reported; not run here (no offline skill list) |
| F7 | `tests/helpers/skill-surface.cjs` builds "the front door" from `skill/SKILL.md` plus every backticked `references/*.md` it names; eight test files use it, all with positive assertions. `tests/claude-code-surface.test.cjs` pins the repo router `.claude/skills/design-pipeline/SKILL.md` (XML tags, no headings, under 500 lines). `skill/SKILL.md` is the only `SKILL.md` under `skill/` outside vendored `upstream/` folders (186 vendored). | tests; file search | seen |
| F8 | Benchmark v2 rejects: one system (`systems must contain at least 2`); a required dimension with no required scenario (so a manifest cannot be all optional); any scenario key other than `id, operation, dimension, required, threshold, evidenceType, prompt, privateExpectations, expectedComponents`. `dimension` is one of `responsive, accessibility, palette, motion, scene, component-state, evidence`. `benchmark brief` refuses a false fairness flag; `benchmark evaluate` reports `blocked`. An unmeasured `required:false` scenario is `status: unknown`, does not block and is left out of `aggregate`. | fixture run against `film-benchmark.json` | seen |
| F9 | Local capture: Node 26.3.1; Chrome 154 (system) and a HyperFrames `chrome-headless-shell` 152 in `~/.cache/hyperframes` (found automatically); ffmpeg. `puppeteer-core` is not resolvable from the repo. A copy exists at `D:/projects/design-pipeline/tern-snapshot-1/runtime/node_modules/puppeteer-core` (25.11.0). Without it `composition capture` exits 1 with `KERNEL_FAILED: film capture: puppeteer-core not found. Fix: ...` (the label says "film" for a web capture). With `--puppeteer-module <that path>` it captured 375x812, 768x1024 and 1440x900 and `verify composition` ran. `doctor` does not check browser tooling. | commands run | seen |
| F10 | `composition capture` writes a screenshot of the visible window only, plus an `elements.json` with every text box of the page in window coordinates. On a page taller than the window, `verify composition` exits 2 with `text-off-canvas` for each text below the fold (`"Section two" at 40,1020 leaves the 1440x900 viewport`). | fixture run | seen |
| F11 | Served from a local static server with `#<section-id>`, `composition capture --url` scrolls to the anchor: three sections gave three different screenshots (white, dark and yellow backgrounds). Not tried on scroll-driven or scroll-locked pages. | fixture run | seen (synthetic page only) |
| F13 | The front-door description is read by the host from one line of YAML. Codex 0.155.0 does not list a skill whose description contains a colon followed by a space: the loader reports `invalid YAML: mapping values are not allowed in this context` and the skill is missing from `skills/list`. The same text written with `NOT for` (no colon), in double quotes, or as a folded block is listed whole. Codex also rejects a description over 1,024 characters (`invalid description: exceeds maximum length of 1024 characters`, seen on another skill on this machine). Backticks and inner double quotes were fine. | temporary `CODEX_HOME`, four variants of one description | seen (Codex only; omp and Claude Code not run) |
| F14 | What the registry change requires of a new guide (final names told by its author; the drafts on disk are being rewritten to them; nothing is implemented): a guide entry has `official.doc` (a path under `skill/`), a `kind`, `audience`, `deliverables`, `exposure`, `status`, `group` and, when shown, a `summary` of at most 160 characters. A `public` entry lists `stages` written like `web:review`, and each stage must be named by a `next` action or by the matching `## <stage>` section of `workflow-web.md`. An `internal` entry has empty `deliverables` and `stages` and needs a `reason`. The id is computed from the path: the path under `skill/` without a leading `references/`, without `.md`, with `/` turned into `-` (`doc-web-treatment`, `doc-evals-web-README`), and must match. Every path that a `next` action, `skill/SKILL.md` or the repo router names must be an active guide entry, or `node scripts/qa.cjs` fails. | message of the registry author, 2026-09-30; `openspec/changes/add-capability-registry/` | told (drafts, not implemented) |

## 3. Decisions

Each is reversible and none changes a gate, contract or schema. The reasons cite the facts above.

### D1. Three documents, not four; the style bible joins the treatment guide

| Candidate | When it is read | By whom | Done means | Decision |
| --- | --- | --- | --- | --- |
| `web-treatment` | `concepts`, then after the pick | the page author | parameter table and treatment complete | keep: web guide |
| `web-style-bible` | the same moment; the treatment's seed is already a style field | the same author | Style table filled | merge into `web-treatment` as `## Style table` |
| `web-review` | after `probe`, at `review`, or "review this page" | a reviewer, or the agent preparing evidence | yes/no answers with evidence; Visual Acceptance pending or recorded | keep: web guide |
| `web-capability-eval` | a maintainer asks whether a change helped | the operator acting for the user; never the page author | run record with a verdict per model level | keep, but as the evaluation guide under `evals/` (D2) |

Two documents read at the same moment by the same person, with the seed defined in one and upgraded
in the other, would define the seed twice. Nobody asks for a style table apart from a page.

### D2. Plain guide files, never a nested `SKILL.md`; the evaluation guide sits next to its briefs

The two web guides are `skill/references/web-treatment.md` and `skill/references/web-review.md`. The
evaluation guide is `skill/evals/web/README.md`, next to `skill/evals/web/briefs.md`, the way film's is
`skill/evals/film/README.md` (and, like it, listed in `required`).

Hosts differ (F4 to F6). Codex would list a nested `SKILL.md` at startup with its description, which
would also show the evaluation protocol to every page author. omp and Claude Code would ignore it, so
its frontmatter would work on one host only. Plain guides behave the same everywhere, match what
`readSkillSurface` and the one-level rule expect (F3, F7) and cost no startup listing. Rejected:
`skill/skills/<name>/SKILL.md`; a `.claude-plugin/plugin.json` layout (one host).

The evaluation guide is kept out of `references/` on purpose. The front door and the `next` actions
never name it, so nothing in a page author's reading path leads there, and the front door stays small.
The eight Codex-visible vendored skills (F4) are a residual, section 13. Depends on Q2 and Q3.

### D3. Front door: one web bullet, and the description is rewritten once, here

The web bullet is replaced by one bullet that names the two web guides and `web-direction.md`
(section 5.1). Nothing in the front door names the evaluation guide.

The description is rewritten in this change, once. An audit of the current one found that it opens
with a slogan instead of what the skill does, has no "not for" part, and lacks words users actually
say (landing page, website, design system, component, website clone). The new text (section 5.2)
starts with what the skill builds, front-loads those words, and ends with what it is not for. It is
529 characters, well under the limit of 1,024 that Codex enforces (F13). It follows two rules that
Codex made necessary (F13): one line with no colon-space and no space-hash, and no more than 1,024
characters. Depends on Q14.

### D4. Arms are commits; the evaluation guide lands after the changed arm

Both comparisons of section 6.1 use the same changed arm: the last commit of Phase A of `tasks.md`.
The evaluation guide, the briefs, the router bullet and the tool-list entry for the guide land in
Phase B, after it. So no arm of either comparison holds any evaluation file, and the arms differ only
in what is under test. If Main commits both phases as one commit, the changed arm is built from a
worktree without the Phase B files, and the record says so.

- **Comparison A (default): the increment of this change.** Baseline arm: the commit just before the
  first Phase A commit, recorded by hash when Phase A starts (T0). The guidance-fix change and the
  registry change land before Phase A, so they are in both arms. Changed arm: the last Phase A commit.
- **Comparison B (optional): the whole web creative layer.** Baseline arm: `bbf7fa4`, the last commit
  before `add-web-treatment-and-section-briefs`. Same changed arm. It answers a different question,
  so it has its own pack, key, rounds, tally and verdicts, is reported separately and is never pooled
  with A. It may reuse the changed-arm pages of A (same commit, models, briefs and budget); the record
  says so. It runs only if the user asks (Q13).

Running only B would not separate this change from the earlier one, which is why A is the default.
Details and the rules for stray commits: section 6.1.

### D5. No benchmark manifest for this evaluation

Section 9 lists what benchmark v2 can and cannot carry (F8). It cannot express arms, generations,
pairs, viewports, reviewers or a win-rate threshold; it needs two systems and one required scenario;
its dimension list has no preference dimension. The briefs are therefore a markdown file,
`skill/evals/web/briefs.md`, and the six fairness names become conditions in the run record. Depends on
Q10.

### D6. A manual blind recipe first; one script file if the pilot shows it is run more than once

Shuffling, hiding and counting are mechanical, but a script adds code, an artifact format and a test.
The recipe of section 8 is deterministic from a recorded seed, so anyone can recompute the assignment
and audit it, and its code blocks sit in the evaluation guide. A full evaluation runs it at least three
times (pilot, round 1, round 2). If the pilot shows the recipe is run more than once by hand, or a
copy-paste error appears, the code blocks move into one file, `skill/evals/web/blind-pack.cjs`. It is
run with `node`, is not a CLI command, and keeps the same pack, key and verdict-sheet formats
(section 8.3). Depends on Q9.

### D7. The model's review is labelled and comes later

It is a secondary review, non-blind and not counted. It is made after the operator unblinds, and the
user reads it only after both counted rounds are recorded, so it cannot anchor either round (a model
opinion shown first would). The tally never reads it. Section 6.4.

### D8. Safety checks come from existing gate outputs, scoped to what works

By hand or by the operator's loop, from `verify composition` results, as question 7 of the earlier
approved spec (`2026-09-29-web-creative-layer.md`) decided. Because of F10 the responsive check counts
only `text-off-canvas` findings whose position lies inside the window height. Section 7. Depends on
Q11.

### D9. Numbers are provisional until a lock commit

The user asked for the numbers to be fixed before the first run. The defaults of section 7 are written
down now as provisional; the pilot may amend them once, in a recorded window, and a lock commit fixes
them before the held-out briefs are written. Depends on Q4 to Q6.

### D10. Tests: structure only

Four structure checks go into the existing `tests/claude-code-surface.test.cjs`: the front door is
under 5,120 bytes and 500 lines; every `references/...` path it names exists; no `SKILL.md` sits under
`skill/` outside vendored `upstream/` folders except the front door; the front-door `description` is
one line of 1 to 1,024 characters with no colon-space and no space-hash (F13). `tests/workflow-next.test.cjs`
gains link checks for the three new `next` pointers. No test reads the wording of the guides or of the
description.

### D11. Register the guides in the tool list, in the phase that adds them

Phase A adds `web-treatment.md` (stages `web:concepts`, `web:build`) and `web-review.md` (stage
`web:review`) as public entries in `scripts/tool-list.json` and regenerates the map
`skill/references/tool-map.md`. Phase B adds the evaluation guide as an internal entry with a reason.
The stage claims hold only because the `next` actions and `workflow-web.md` name the guides (T3), so
the registration task comes after T1 to T4. This change does not start until the registry has landed
(T0).

## 4. Guide contracts

Each document opens with a `## Contract` block with these keys, in this order: Use when; Inputs;
Produces; Reads; Writes; Before you say done; Never. The lists below give the content. Nothing in the
block is a list of trigger phrases: a host never reads a guide until the guide has been chosen. The
documents add no artifact; everything lands in files the web workflow already writes.

### 4.1 `web-treatment` (`skill/references/web-treatment.md`, about 9 KB)

Headings: `## Contract`, `## Concept cards`, `## Style table`, `## Before you say done`. The `concepts`
action points to `## Concept cards`; the `build` action points to `## Style table`.

- **Use when**: the page's concepts, treatment, section briefs or style are being written: at `next`
  stages `concepts` and `build` (standard and full), or when a user asks for a page design that must
  not look like a template.
- **Inputs**: `brief.md` (the intake answers), `reference.md` (may be `none`), the mode (`brief`,
  `replicate`, `freeform`), the tier, project `DESIGN.md` and `MOTION.md` when present.
- **Produces**: in `concepts.md`, a parameter table and three cards; after the pick, `## Treatment`
  (fields as in `web-direction.md`) with its Style table; section briefs in the artifacts
  `web-direction.md` names.
- **Reads / writes**: reads the four inputs. Writes `concepts.md`; `design.md` (Layout grid, Component
  inventory, Color tokens); `motion.md` (Interaction Inventory); `component-state-matrix.json`;
  `interaction.json`; and fills, without adding sections, project `DESIGN.md` (Colors, Typography,
  Layout, Do's and Don'ts) and `MOTION.md`.

**Concept parameter table.** One row per parameter, one column per card. Values come from these sets;
a value outside a set is allowed only with a one-line reason.

| Parameter | Values |
| --- | --- |
| dominant element | big number, product snippet, queue, timeline, map |
| driver | scroll, pointer, state, time |
| ground strategy | a new hue per chapter, alternating light and dark, one hue in tonal steps |
| density curve | rising, V shape, sawtooth, steady with one burst |
| motion verb | push, reveal, sweep, flip, snap |
| type voice | one family on a width axis, serif with mono, all mono |
| boundary language | hairlines, spacing only, heavy blocks |
| accent technique | one rebel component, one colour, one burst |

Rule: every pair of cards differs on at least four parameters, and on the dominant element or the
driver (the direction-preview rule, "every pair differs on at least four axes including luminance or
era", applied to page structure). The agent writes the pairwise count under the table. Nothing checks
it; a deterministic check would extend `direction check`, not add a gate.

**Style table.** Mandatory slots; every slot holds a concrete value, never "TBD" or blank.

| Slot | Content |
| --- | --- |
| `ground.<section-id>` | one row per section: hex and `dark` or `light` |
| `ink`, `accent`, `extra-colour` | hex; `accent` may be `none` with a reason; at most one `extra-colour`, tied to a product object (stock in orange) |
| `type-display`, `type-text`, `type-data` | family with weight or width; at most three voices in all (W7) |
| `type-scale` | four to six sizes |
| `space-unit`, `radius`, `stroke`, `shape-vocabulary` | one value each; the vocabulary is one phrase such as "sharp corners, 1 px rules, no shadow" |
| `motion-verbs` | at most three, from the table |
| `blacklist`, `exceptions` | see below |
| `must-deviate` | exactly three lines, each "reference element to departure" |

Default blacklist (the brainstorm's seed, uncalibrated; extend it from review findings): mono-spaced
eyebrow labels; three equal-width feature cards in a row; gradient text; a two-hue hero gradient;
fade-only entrances; a slogan-first hero (the first line is a tagline, not a product state or number);
pill buttons as the only shape; frosted-glass cards; a stock hero illustration; the same card grid
repeated in three or more sections. A pattern may stay only with a line in `exceptions` giving its
reason. The blacklist feeds project `DESIGN.md` Do's and Don'ts.

Mode rules: in `replicate` mode the Style table records the reference's values and `must-deviate`
does not apply. In `freeform` mode, with no reference, `must-deviate` is written against the default
template of the page type (for a landing page: hero, three cards, pricing, closing call to action).

- **Before you say done** (all can be seen without a tool): the table is filled and the pairwise
  counts are written and at least four; each section's dominant element is a noun from `brief.md`; the
  treatment has all five fields and the Style table has every slot filled; `blacklist` names all ten
  defaults or gives an exception for each; `must-deviate` has three lines (or is marked not
  applicable by mode); each section brief has a driver or says "no driver"; a section with a driver
  has an Interaction Inventory row and a probe; section ids agree across `concepts.md`, `design.md`,
  `motion.md` and `interaction.json` (list them side by side). Report "treatment complete against this
  checklist".
- **Never**: claim the page or the concepts are good, distinct or accepted; invent a product fact (a
  metric, a customer, a claim) without marking it as sample copy; leave a slot for later.

### 4.2 `web-review` (`skill/references/web-review.md`, about 7 KB)

Headings: `## Contract`, `## Capture`, `## First-viewport test`, `## Answering W1 to W7`, `## Report`,
`## Secondary review`, `## Before you say done`. The `review` ask points to it.

- **Use when**: a built page is being reviewed: at `next` stage `review`, or when a user asks to
  review or check a page, or to apply W1 to W7 or the first-viewport test.
- **Inputs**: the built `index.html`; the treatment in `concepts.md`; `design.md`, `motion.md` and the
  `interaction.json` results; the capture tools, if present.
- **Produces**: evidence under `evidence/web/<width>x<height>/`; the Visual Acceptance block and the
  Conformance block in `qa.md`.
- **Reads / writes**: reads the inputs and `web-direction.md` (the W1 to W7 table, its evidence and
  "Looks right" cells). Writes `evidence/web/**` and `qa.md` (rows of `qa-checklist.md`, section "Web
  Treatment And Section Review (Visual Acceptance)").

**Capture.** Step 0 is a preflight: run `composition capture` once at 375x812 on the page. If it
fails, copy the message, name the missing tool (for example `puppeteer-core`, with the
`--puppeteer-module` hint the command prints) and mark every evidence cell that needed a screenshot
`not-verified`; the review continues on the live page. Otherwise capture the first screen at 1440x900,
768x1024 and 375x812 into `evidence/web/<width>x<height>/` and run `verify composition --profile ui`
on each. Known limits (F10, F11): on a page taller than the window, ignore `text-off-canvas`
findings whose position lies outside the window (below zero, or at or beyond its height) and say so in
the report; the screenshots show the first screen only. For W2, W4 and W5 evidence, serve the page
from any static server and capture `--url http://127.0.0.1:<port>/index.html#<section-id>` per section
(seen on a synthetic page only), or scroll the live page.

**First-viewport test.** The agent prepares the 1440x900 and 375x812 first-screen images. The reviewer
looks at each for five seconds, self-timed, then answers two questions without seeing the brief: what
is the product; name one action the page invites. Each is yes or no against `brief.md`. Without the
reviewer the result is `pending`, not a guess.

**Answering W1 to W7.** Each rule is answered `yes`, `no` or `not-verified`, with the evidence path and
one sentence. A rule is `yes` only when every clause of its "Looks right" cell holds; a failing clause
is named in the sentence. No scores. W5 is answered after scrolling the live page at full speed, or is
`not-verified`. A separate line reports the blacklist: clean, or the patterns present, with or without
an exception.

**Report.** Order: (1) `Visual Acceptance: PENDING` unless the user has recorded a result, with the
reviewer's name if recorded; (2) the W1 to W7 table and the first-viewport result; (3) the Conformance
block (gate statuses and findings word for word, keeping their existing meaning and severity); (4) the
secondary review, if one was made. The words accepted, approved and "looks good" never appear as the
agent's verdict.

**Secondary review.** If the user wants a model's view, the agent may fill the same W table, after the
user has answered, under the heading `SECONDARY REVIEW - model, NON-BLIND, NOT COUNTED`. It never
replaces or edits the user's answers and never changes Visual Acceptance.

- **Before you say done**: the preflight ran and its result is recorded; each evidence path named
  exists; each of W1 to W7 has an answer and a path; the report order above holds; the tool gap, if
  any, is named.
- **Never**: record Visual Acceptance; average or score the rules; treat a gate warning as a verdict.

### 4.3 The evaluation guide (`skill/evals/web/README.md`, about 12 KB) and `skill/evals/web/briefs.md`

Headings: `## Contract`, `## Conditions`, `## Arms`, `## Numbers`, `## Briefs`, `## Procedure`,
`## Blind pack recipe`, `## Review rounds`, `## Verdicts and record`, `## Made-up steps`,
`## Not covered`.

- **Use when**: a maintainer wants to know whether a change made web pages better, to compare a
  baseline and a changed package, to run the web evaluation, or to prepare a blind pack. Never while
  building a page.
- **Inputs**: two commits; the model list; `skill/evals/web/briefs.md`; the capture tools; the user as
  the counted reviewer.
- **Produces**: the run record (`qa.md` of the change under test); the pack, the key and the verdict
  sheets, all outside the repository.
- **Reads / writes**: runs `package.cjs` and `install-local.cjs`; reads the briefs and the gate
  outputs; writes only the record and scratch folders outside the repository.
- **Before you say done**: every field of the record in section 6.7 is filled or marked `not-run` with
  the reason; the made-up-steps table is present; each model level has a verdict in `pass`, `fail`,
  `blocked` or `inconclusive`; Conformance and Visual Acceptance are separate blocks; a "not verified"
  list is present.
- **Never**: review as the counted reviewer; edit the skill during a confirmatory run; open the key
  before both counted rounds are recorded, or show the secondary review before then; combine model
  levels; claim more than the verdict states.

`briefs.md`: a table `id | set | page type | brief` and, per brief, the four intake facts (product,
audience, scope, assets). Set is `dev` or `heldout`. Briefs describe product, audience and goal; they
never name the dominant element, the driver or a layout (that would hand the changed arm's key
decision to both arms). The held-out page types are proposed as: a number-led dashboard narrative; a
playable product demo; a timeline or log narrative; a map or exploration page; a plans and pricing
page (the template-shaped control). The `dev` set has two briefs and is committed in Phase B; the
`heldout` set is committed after the lock (section 6.3, E5).

## 5. Routing and registration

### 5.1 Front-door bullet (Phase A)

Replace the single line

```text
- Web treatment, section briefs and review rules W1-W7: `references/web-direction.md`
```

with

```text
- Web pages: concept cards, treatment and style table `references/web-treatment.md`; review a built
  page (W1-W7, first-viewport test) `references/web-review.md`; templates and rules
  `references/web-direction.md`
```

The front door names nothing under `evals/`.

### 5.2 Description (Phase A, D3, Q14)

Replace the whole `description` line of `skill/SKILL.md` with one line (no line break, no colon-space,
no space-hash):

```text
Build promo films and HTML animations, PV/MAD beat edits, motion websites and landing pages, product UI and components, design systems and website clones, one checked step at a time (`next` loop, gates before anything is shown). Use for product promos, explainers, logo stings, 3D product shots, motion pages, UI screens, design-system work, design review of a built page, or "not a generic template", even if the user does not name this skill. NOT for code or PR review, API or module interface design, or UX research documents.
```

The text is a proposal for the user to read (Q14), not a tested wording. It differs from the
suggestion in the audit in three ways, each for a reason:

- `NOT:` became `NOT for`, because a colon followed by a space made Codex drop the skill (F13).
- The three skill names in brackets (`code-review`, `design-an-interface`, `bmad-ux`) are gone: they
  are skills on one machine, and a packaged description must not point to skills that a user may not
  have.
- "and components" was added: the audit found the word missing.

Length costs startup room: every host puts every description into every session, and Codex shortens
descriptions first when many skills are installed. That is why the trigger words come first and the
"not for" part comes last.

### 5.3 Size budget of `skill/SKILL.md`: baseline + N, limit 5,120 bytes

Baseline = the size of the file when Phase A starts (T0 measures it). This change adds:

| Edit | Bytes added | Measured on |
| --- | --- | --- |
| web bullet (5.1) | + 130 | `b631fcd` |
| description (5.2) | + 124 (405 to 529 characters) | `b631fcd` |
| both | + 254 (4,108 to 4,362 bytes; 76 to 78 lines by `wc -l`) | `b631fcd` |

The limit is 5,120 bytes for the whole file. The two earlier changes add about 100 bytes (guidance fix)
and about 80 (registry), so the file should end near 4,540 bytes, about 580 under the limit. T4
reports `wc -c` and `wc -l` at the end, and the structure test of D10 enforces both limits from then on.

### 5.4 Repo router (Phase B)

`.claude/skills/design-pipeline/SKILL.md` gets one `<intake>` bullet: "compare skill versions on web
pages, capability evaluation, blind packs → `skill/evals/web/README.md`", because a maintainer's request
reaches the router first. The router keeps its XML tags and has no headings. The registry change adds
its own line under `<reference_guides>`; the two edits do not overlap.

### 5.5 `next` pointers (Phase A)

One each, in `skill/scripts/workflows/web.cjs`; every other word of the actions stays:

- `concepts` run action: adds "Fill the parameter table first (references/web-treatment.md, Concept
  cards): every pair of cards differs on at least four parameters, including the dominant element or
  the driver."
- `build` action at standard and full: "First extend the chosen card ... (references/web-treatment.md;
  field templates in references/web-direction.md), fill its Style table and write the section briefs,
  before writing index.html." The quick tier is unchanged.
- `review` ask: the recommendation names `references/web-review.md` and keeps
  `references/web-direction.md` for the W table.

The tool list also states that `web-direction.md` belongs to `web:concepts`, `web:build`, `web:probe`
and `web:review`. Those claims are checked against the `next` actions and the `## concepts`, `## build`,
`## probe` and `## review` sections of `workflow-web.md`, so T3 keeps every existing mention of
`web-direction.md` in them.

### 5.6 Tool-list entries (D11)

Field names and rules are those of the registry change as it lands (F14; T0 reads them again). The
entries go into `scripts/tool-list.json`, next to `doc-web-direction`. The values are:

| | `web-treatment` (Phase A) | `web-review` (Phase A) | evaluation guide (Phase B) |
| --- | --- | --- | --- |
| official doc | `references/web-treatment.md` | `references/web-review.md` | `evals/web/README.md` |
| id | computed from the path (`doc-web-treatment`) | computed (`doc-web-review`) | computed (`doc-evals-web-README`) |
| kind | `creative-guide` | `creative-guide` | `evaluation` |
| audience | `author` | `author`, `reviewer` | `maintainer` |
| deliverables | `web` | `web` | none (empty) |
| stages | `web:concepts`, `web:build` | `web:review` | none (empty) |
| exposure / status | `public` / `active` | `public` / `active` | `internal` / `active` |
| group | Web pages | Web pages | Maintainers |
| summary (at most 160 characters) | "Concept cards that differ on eight parameters, then the Style table with a blacklist of template patterns and three deliberate departures from the reference." (157) | "Review a built page: capture check, five-second first-viewport test, W1 to W7 as yes or no with evidence, and a labelled model opinion." (135) | none (an internal entry has no summary) |
| reason | none | none | "Maintainers only: how to compare two versions of this skill on web pages. Page authors must never read it, so no `next` action and no front-door line names it." |

After adding the entries, `node scripts/tool-list.cjs --write` rewrites the map (it changes for the two
public entries; an internal entry does not appear in it) and then checks; `node scripts/tool-list.cjs
--check` must then exit 0. Nobody edits the map by hand. The router bullet of 5.4 names
`skill/evals/web/README.md`, and that path is a registered active entry, so the registry test passes.

### 5.7 Other edits (Phase A)

`workflow-web.md`: a pointer in each of `concepts`, `build` and `review`. `web-direction.md`: the
"Style-bible seed" row points to `## Style table`, so the seed has one definition; one line in the
review-rules intro names `web-review.md`. `qa-checklist.md`: rows for the first-viewport test and the
blacklist, and a line that a secondary review is labelled `SECONDARY REVIEW - model, NON-BLIND, NOT
COUNTED`. No `next` action points to the evaluation guide, so page authors are never sent to it.

## 6. Evaluation protocol

`skill/evals/web/README.md` states this procedure. Numbers are in section 7.

### 6.1 Arms and what counts as the change under test

Each comparison (D4) has a baseline arm and a changed arm, both git commits, each built with
`scripts/package.cjs` in its own `git worktree` with the same `PACKAGE_VERSION` and
`SOURCE_DATE_EPOCH`. The record names the comparison (A or B) and holds the sha256 of each
`design-pipeline-skill.tgz`, `git log --oneline <baseline>..<changed>` and
`git diff --stat <baseline>..<changed> -- skill/`. Every path in the diff is either part of the change
under test or declared as accepted, with the reason.

- **Comparison A.** The baseline is the commit just before the first Phase A commit. The guidance-fix
  and registry commits land before Phase A, so their files are in both arms and are not in the diff.
  The diff of `skill/` is the Phase A files: the two web guides, the `next` pointers in `web.cjs`,
  `workflow-web.md`, `web-direction.md`, `qa-checklist.md`, the front door (bullet and description)
  and the regenerated `tool-map.md`. The map counts as part of the change under test, because it is
  where an author would find the guides. The tool-list entries sit in `scripts/tool-list.json`, which
  the package does not ship, so they are not in the diff of `skill/`.
- **A stray commit between the two arms.** If a commit of another change (for example a registry fix)
  lands between the first and the last Phase A commit, its files show up in the diff. Either avoid it
  (keep the Phase A commits together and merge nothing else between them) or list each of its paths
  as accepted, with the reason that an agent building a page does not read that file. A path that is
  neither part of the change nor accepted is removed by building the changed arm from a branch
  without it.
- **Comparison B.** The baseline is `bbf7fa4`, so the diff also holds `b631fcd` (the earlier web
  change, part of the change under test in B) and the guidance-fix and registry files. Those last two
  are declared accepted, and the record says that the tool map is a difference an author can see in the
  changed arm, which makes B less clean than A.

The generation harness installs each package into its own skills root with `install-local.cjs` and is
pointed only at that root.

### 6.2 Conditions that must hold (the six fairness names, for two arms)

Each must hold and be recorded; one false makes every verdict `blocked`.

| Name | Holds when |
| --- | --- |
| samePrompts | both arms received the byte-identical brief (sha256 of `briefs.md` recorded) |
| sameEnvironmentClass | one machine; the same Node, Chrome and `puppeteer-core` versions for capture; the same harness and model versions for generation |
| evaluatorBlind | the counted reviewer worked from the blind pack and the blinding guess of 6.4 was recorded |
| expectedAnswersHidden | page authors never saw `evals/web/`; creative outcomes have no expected answer |
| freshContext | every generation started in a fresh session with memory features off |
| representativeDelivery | each page came from an unassisted run of `next`, with no operator edit |

### 6.3 Procedure

- **E0 Preflight.** Record `node --version`, the OS, the Chrome build and the `puppeteer-core` path and
  version. On a scratch page outside the repository run `composition capture --root <scratch>` at
  1440x900 with `--puppeteer-module <path>` and then `verify composition --profile ui`. Both must run.
  A failure is copied word for word into the record with the tool it names; capture becomes
  `unavailable` and the safety checks `not-run`, which makes the verdicts `blocked` (section 6.5).
  Nothing else starts before E0 passes or is recorded.
- **E1 Freeze the changed arm and package both arms** (6.1).
- **E2 Pilot generations** (N3): one model, the two `dev` briefs, both arms, N1 generations each (12 at
  the defaults).
- **E3 Pilot capture, pack and review** with the same recipe, round 1 only. It exercises the mechanics;
  no effect is claimed and the pilot briefs are then used up.
- **E4 Amendment window and lock.** The changed arm may change here (a new commit); the numbers of
  section 7 may be amended once, each amendment with its reason and the pilot evidence. Then commit the
  numbers as the lock commit. After it, changing a number voids the confirmatory run.
- **E5 Held-out briefs.** Written and committed after the lock, by a session that edits no skill file
  (Q8); N2 page types that differ; approved by the user.
- **E6 Confirmatory generations.** Weak, mid and strong model, each with the held-out briefs, both
  arms, N1 generations each (90 at the defaults). Rules per generation: a fresh session; memory
  features off; the model id and version pinned; the same sampling settings and the budget N13 for
  both arms; the arm's package installed in an isolated skills root; an empty project folder; the
  transcript saved; the workflow's questions answered by the operator from the brief's four facts, or
  "not applicable: this is a web page" for a question with no fact (the film duration question, which
  the baseline arm of comparison B still asks); the concept pick is the model's own recommended card,
  `reference` is `none`, the review is `accept` at the first draft. The page is `index.html` as it
  stands when `next` reaches `review` or the budget ends.
- **E7 Capture and gates for every page**: first screen at 1440x900, 768x1024 and 375x812 into
  `evidence/web/<width>x<height>/`, then `verify composition --profile ui` on each; keep the JSON.
- **E8 Blind pack, round 1** (section 8). The key stays sealed.
- **E9 Counted review, round 1**, by the user (6.4).
- **E10 Round 2** by the user, still blind, N17 after E9 (6.4). The key stays sealed until both rounds
  are recorded.
- **E11 Unblind and count** by hand into the record (8.2). Only now does the operator open the key.
- **E12 Secondary review** by the model, non-blind, after E11 (6.4).
- **E13 Verdicts and record** (6.5, 6.7).

Failed and void generations. A run that ends with no `index.html`, or a page that does not open, is a
loss for that arm in its pair and is never dropped. A run is void, re-run at most N12 times and
reported per arm, when the harness crashed or when it broke a rule: it read anything under
`evals/web/` (found by searching the saved transcript for that path), had memory features on, or used
the wrong package. A second void in the same cell is a loss.

### 6.4 Review rounds

- **Pass 1, comprehension, per page.** All packed pages, shuffled, each shown as its 1440x900 first
  screen for N14, self-timed. Two answers, yes or no: I can say what the product is (it matches the
  brief); I can name one action. A page counts as understood only when both are yes. Pass 1 comes
  before pass 2.
- **First-look note.** Before pass 2 the reviewer writes one sentence: can the two arms be told apart
  by surface cues (fonts, structure, wording), and how.
- **Pass 2, preference, per pair.** The two pages of a pair open from the pack, scrolled at full speed
  for at most N15 each. One question: which page makes you want to keep scrolling? Answer `A`, `B` or
  `tie`. Also: which one is the changed page? `A`, `B` or `unsure`. One optional line of reason. A
  sitting lasts at most N16; breaks are recorded.
- **Round 2 (E10).** The pairs drawn at random under N17 are shown again with a new seed (new
  orientation, new order, new ids, its own key). Only round 1 counts. Round 2 gives the consistency:
  exact agreement of the answer, a tie being its own answer; agreement leaving out ties is reported next
  to it.
- **Secondary review (E12).** After E11 the model fills the W table for every packed page, knowing the
  arms; the pass 1 questions need a human, so it does not answer them. It writes to a file headed
  `SECONDARY REVIEW - model, NON-BLIND, NOT COUNTED`. The tally never reads it, and the user reads it
  only after both counted rounds are recorded, so it cannot anchor either. Afterwards a table shows how
  often a `yes` on each W rule went with the page the user preferred: evidence for calibrating W1 to
  W7, exploratory, never acceptance.

### 6.5 Verdicts

Per model level (weak, mid, strong) and never combined:

- `pass`: every threshold of section 7 for that level holds.
- `fail`: a threshold was measured and missed.
- `blocked`: a required measurement did not run (capture unavailable, round 2 not held, a condition of
  6.2 false).
- `inconclusive`: the consistency is below its threshold, or the blinding guess is at or above its
  threshold.

A `pass` says the changed package beat the baseline for that model level by the reviewer's preference,
on these briefs, with the safety checks held. It says nothing about any single page's Visual
Acceptance.

### 6.6 Made-up steps

Each record declares every step as `real`, `synthetic` (made up, or set by rule) or `not-run`, with a
reason:

| Step | Default |
| --- | --- |
| S1 briefs written by an agent or a maintainer, not taken from real requests | synthetic |
| S2 product facts and assets invented for the briefs | synthetic |
| S3 the workflow's intake, reference, concept and review answers given by policy | synthetic |
| S4 generation by real models running the real packaged skill | real (models named) |
| S5 capture in real headless Chrome through `puppeteer-core` | real or not-run |
| S6 gate outputs from the real `verify composition` | real or not-run |
| S7 counted review by the user, blind | real |
| S8 secondary review by a model, non-blind | real, labelled |
| S9 pages reviewed live from `file://` in the reviewer's browser | real |
| S10 real visitors | not-run: the verdict is one reviewer's preference, not audience behaviour |

A record without this table is invalid.

### 6.7 Record fields

Date; operator; reviewer; comparison (A or B); arms (commits, sha256, `git log`, `git diff --stat`);
commits of the numbers, the briefs and the recipe; sha256 of `briefs.md`; tools (Node, OS, Chrome,
`puppeteer-core` path and version, harness names and versions, model ids and versions, sampling
settings, budget); the conditions table; the made-up-steps table; voids and losses per arm; pilot
summary; per model level: pairs, wins, ties, losses, win rate, per-brief counts, understood pages per
arm, the responsive and accessibility safety counts, round 2 consistency, blinding guess accuracy,
verdict; the place of the sealed secondary review; the reviewer's first-look note; the validity limits
of section 12; a "not verified" list. Conformance and Visual Acceptance are separate blocks.

## 7. Numbers written down before the run

All numbers in this table are provisional defaults and need the user's confirmation (Q4 to Q6). This
section is the only place the protocol's numbers are written; the evaluation guide copies them at the
lock commit, and the text elsewhere refers to them by id.

| Id | Item | Default | Note |
| --- | --- | --- | --- |
| N1 | Generations per arm, model and brief | 3 | the user's minimum |
| N2 | Held-out briefs, page types that differ | 5 | the user's minimum |
| N3 | Pilot | 1 model (default: the weak level), 2 `dev` briefs, 3 generations, both arms: 6 pairs | mechanics only |
| N4 | Pairing | generation k of the baseline arm with generation k of the changed arm in the same model and brief: 3 pairs per cell, 15 per model | arbitrary but fixed; generations are independent |
| N5 | Win rate | per model level, the changed page is preferred in at least 70 percent of pairs (11 of 15); a tie is not a win | a fair coin reaches 11 of 15 about 5.9 percent of the time, 12 of 15 about 1.8 percent; a screen, not proof |
| N6 | Brief majority | the changed arm wins at least 3 of the 5 briefs per model level; a brief is won when it wins at least 2 of its 3 pairs | stops one brief carrying the rate |
| N7 | Comprehension | per model level, the share of understood changed pages is not lower than the share for baseline pages | tolerance 0 |
| N8 | Responsive safety check | per model level, pages with at least one `text-off-canvas` error whose position is inside the window height (0 <= y < height) in a first-screen capture: changed not more than baseline | coarse; F10 |
| N9 | Accessibility safety check | per model level, pages with at least one `text-contrast` or `low-contrast` error in a first-screen capture at 1440x900 or 375x812: changed not more than baseline | |
| N10 | Consistency | round 2 exact agreement at least 80 percent, else `inconclusive` | |
| N11 | Blinding | guess accuracy (over pairs not answered `unsure`) below 80 percent, else `inconclusive` | |
| N12 | Void re-runs | at most one per cell | 6.3 |
| N13 | Generation budget | 60 minutes wall clock, the same for both arms | operational |
| N14 | First-screen view time (pass 1) | 5 seconds, self-timed | the user's protocol |
| N15 | Pair viewing cap (pass 2) | 60 seconds of scrolling per page | |
| N16 | Sitting cap | 45 minutes | |
| N17 | Round 2 | at least 24 hours after round 1; at least 30 percent of the pairs and never fewer than 12, drawn at random | |

Lock policy: from the first pilot generation the table is fixed, except for one amendment window
between the pilot and the lock commit. Each amendment lists what changed, why, and the pilot evidence.
The order is: changed-arm commit, lock commit, held-out briefs commit, first confirmatory generation.
Comparison B, if run, has no pilot of its own: it starts at E6 with the same locked numbers and briefs
and adds its own baseline generations, pack and rounds.

## 8. Blind pack

### 8.1 Recipe (manual, deterministic from a seed)

Inputs: `runs/<arm>/<model>/<brief>/g<k>/` page folders with `index.html`, and
`evidence/<width>x<height>/` gate outputs beside them. Everything below lives outside the repository.

1. Pair the cells present in both arms after re-runs; a cell one arm failed is a recorded loss and is
   not packed.
2. Draw the seed with `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"` and
   write it to a file, not to the terminal.
3. Orientation: within each model, order the pairs by `sha256(seed + "|orient|" + pairKey)` and give
   position A to the baseline page on the even ranks and to the changed page on the odd ranks, so the
   two orientations differ by at most one. Presentation order: all pairs sorted by
   `sha256(seed + "|order|" + pairKey)`, then numbered `p01`, `p02`, and so on. Page ids for pass 1 are
   drawn the same way. The hashing, sorting and HTML strip use a few lines of `node -e` given word for
   word in the evaluation guide and not rewritten per run; the T7 worker checks them on a fixture tree.
4. Copy each page into `pack/pNN/A` and `pack/pNN/B` without keeping timestamps. Remove:
   `.design-pipeline/`, `concepts.md`, `brief.md`, `reference.md`, `design.md`, `motion.md`, `qa.md`,
   `interaction.json`, `evidence/`, logs, `node_modules/`. In every HTML file remove comments and
   `<meta name="generator|author|application-name">`.
5. Leak scan: search every text file in the pack, ignoring case, for the arm labels, the model ids,
   `design-pipeline`, `designer-pipeline`, `treatment`, `section brief`. Look at each hit: a word that
   belongs to the page's own subject (a clinic's "treatment") stays; a hit that names the tool or an
   arm is removed, or the page is reported. Also look at what a scan cannot see: fonts, asset counts,
   page length, "built with" text. Note them in the first-look note.
6. Write the key (`KEY.md`: pair id, A arm, B arm, model, brief, generation, seed) outside the pack and
   the repository. The operator does not print or open it until E11.
7. Both arms' pages open from `file://` in the same browser at the same window size; pages that need a
   network asset are noted, not fixed.
8. `review-sheet.md` in the pack follows `plain-language.md`: one question per row, the consequence
   first, no arm words.

### 8.2 Tally (by hand, at E11)

From `KEY.md` and the verdict sheet: per model, count pairs, changed wins, baseline wins, ties, per-brief
counts, understood pages per arm, safety-check counts from the saved gate JSON, the guess accuracy,
and (after round 2) the agreement. Losses from failed generations are added as pairs the failing arm
lost.

### 8.3 If the recipe is run more than once (not built here; Q9)

The code blocks of 8.1 move into one file, `skill/evals/web/blind-pack.cjs`, run with
`node skill/evals/web/blind-pack.cjs <pack|tally> ...`. It is not a `designer-pipeline` command, not a
gate, and it writes the same pack, `KEY.md` and verdict sheet as the manual recipe, so no new artifact
format appears. Safety-check counts stay by hand (classifying findings would be a new analysis, F10).
Cost: the file, listed in `required`; a test file listed in `scripts/test-manifest.json` (`qa.cjs` runs
`node --check` only on `skill/scripts`, `skill/adapters` and `scripts`, so the test is what checks the
file; `skill/evals/film/music-driven/regenerate-grid.cjs` and `tests/film-timeline-eval.test.cjs` are the
precedent); and its own spec delta. The test covers: the same seed gives the same pack; the two
orientations differ by at most one per model; the order is a permutation; ids reveal nothing; the leak
scan fails on a planted token; the key sits outside the pack; the count with ties; an incomplete
verdict sheet is refused; Windows paths.

## 9. Benchmark v2: what it can and cannot carry

Seen (F8):

- It can carry a brief as a scenario: `id`, `operation: generate`, a `dimension` from the fixed list,
  `prompt`, `privateExpectations`, a `threshold` between 0 and 1. A `required:false` scenario with no
  measurement is `unknown`, does not block and stays out of the aggregate.
- It cannot carry arms, generations, pairs, viewports, reviewers, rounds, dev and held-out tags or a
  win-rate threshold (unknown keys are rejected); it needs at least two systems; every required
  dimension needs a required scenario, so a manifest cannot be all optional; `benchmark brief` needs all
  six fairness flags true before any run, which the record's conditions table replaces; and its
  dimension list has no preference dimension, so a preference verdict has no home.
- `film-benchmark.json` is not a home: `film-eval measure` would score a web run folder as a film and
  `benchmark brief` would hand the web prompt to film models.

If a cross-model web benchmark is ever wanted (which model builds better web pages with this skill,
not baseline against changed): a standalone `skill/evals/web/web-benchmark.json` with `systems` the
models, `scenarios` the briefs with `dimension: motion` and `required:false`, one required scenario for
a calibrated gate floor (for example `dimension: responsive`), measurements by hand from gate outputs
with the film penalty of 0.15 per error finding, and no preference verdict inside it. It is not part
of this change (Q10).

## 10. What can and cannot be automated

| Step | With existing commands | Cannot |
| --- | --- | --- |
| Tool check | `composition capture` and `verify composition` on a scratch page; needs `puppeteer-core` through `--puppeteer-module` | `doctor` does not check it |
| Arm packages | `scripts/package.cjs`, `install-local.cjs` in `git worktree`s | |
| Generation | none: model sessions in fresh contexts; the repository has no runner (the film benchmark collects runs by hand too) | automating it |
| First-screen capture, three window sizes | one `composition capture` per size, looped by the operator | one call for three |
| Per-section capture | static server plus `#<section-id>` (F11) | pages that scroll-lock or ignore anchors (untried) |
| Gates | `verify composition` (with F10), `verify interaction` for probes | judging a whole tall page |
| Pacing, motion feel, hover | none | any of it: screenshots show state, so a human scrolls the live page |
| Tool list and map | `node scripts/tool-list.cjs --write`, then `--check`; `tests/tool-list.test.cjs` runs in `qa.cjs` | whether a summary is true |
| Blind pack and count | manual recipe; one script file if needed (8.3) | |
| Counted review | none | only the user |
| Statistics | counts and shares by hand | anything beyond counts; small numbers, see section 12 |

## 11. What `node scripts/qa.cjs` proves, and what only a person can judge

| Deliverable | `qa.cjs` proves | Only a person can judge |
| --- | --- | --- |
| the two web guides | the files exist, are in `required`, are in the archive, install and pass `doctor`; the four structure checks of D10 hold | whether the parameter table gives cards that differ, whether the Style table gives pages that differ, whether the blacklist is right, whether the yes/no answers are correct |
| front-door description | it is one line of at most 1,024 characters with no colon-space or space-hash; the file is under 5,120 bytes and 500 lines | whether a host picks the skill for the right requests (the trigger table of T6 is run by the user) |
| tool-list entries | the registry test (`tests/tool-list.test.cjs`): entries valid, each claimed stage named by a `next` action or a workflow guide section, every path the front door, the router and the `next` texts name is a registered guide, the map is current | whether the summaries are plain and true |
| `next` pointers | each named path exists; the quick tier and the film, edit and ui output are unchanged (`tests/workflow-next.test.cjs`); no web action names `evals/` | whether the pointers make an agent read and use the guides (only the evaluation shows it) |
| evaluation guide, `briefs.md` | exist, registered, packaged | whether the protocol is sound, whether the briefs are fair and their page types differ, the numbers |
| Capture path | not run: `qa.cjs` has no `puppeteer-core` | the operator's smokes in T2, T6 and T7 |
| Codex listing | not run by `qa.cjs` | the smoke of T6: `skills/list` shows the skill with its whole description and no loader error |
| The evaluation | nothing | the verdict, the counts, the consistency |

The recipe code in the evaluation guide is checked once on a fixture tree by the T7 worker; that run is
recorded in `qa.md` as a smoke, not as a permanent test.

## 12. Risks and validity limits

| Risk | Handling |
| --- | --- |
| Small numbers: 15 pairs per model level cluster in 5 briefs; the 5.9 percent figure assumes independent pairs and no ties | N6 brief majority; counts reported with rates; N5 called a screen; no claim across model levels |
| The counted reviewer wrote or knows the change, and is the only judge | stated as a limit in every record; round 2 for consistency; blinding guess for leaks; the verdict is that one reviewer prefers the changed pages, not that visitors do |
| Arms differ in more than the change | 6.1 diff check; D4 commit order; a stray commit is avoided or declared |
| Held-out briefs | E5 after the lock, written by a session that edits no skill; N12 and the transcript search. A held-out set works once: after it is committed under `skill/evals/web/` it ships in later packages, so a later evaluation needs new briefs, or packages built without `evals/web/` (declared in the record) |
| Blinding leaks beyond tokens | 8.1 step 5 and the first-look note; N11 |
| Page authors read the evaluation guide | it is not named by the front door or any `next` action; void rule with a transcript search; neither arm holds it (D4) |
| Memory carried across arms (the harness family has long-term memory) | memory features off is a condition of 6.2; recorded per generation |
| Novelty wins ("want to keep scrolling") over quality | comprehension and the safety checks are separate conditions of a `pass` |
| Capture is coarse (F10) | N8 scoped; limits stated; multi-viewport capture is change 4 of the earlier spec |
| The new description changes which requests trigger the skill, for better or worse | only the user's trigger table (T6) and use show it; the structure test only guards against a description a host refuses (F13) |
| The description costs room in every session, and Codex shortens descriptions first when many skills are installed | trigger words first, "not for" last; 529 characters, +124 |
| The tool list or its rules change before this change lands | T0 reads the landed names and rules again; T5 follows them |
| Hot files edited by three changes | section 1 and the "Shared files" table of `tasks.md`; this change lands last and measures `skill/SKILL.md` |
| Cost: 12 pilot and 90 confirmatory generations for comparison A; about two hours of reviewer time per full round, about 35 minutes for round 2 (estimates, not measured). Comparison B adds 45 baseline generations (135 in all) if the changed-arm pages are reused, 90 (180) if not, and a second review round of the same size | the user may shrink the run by amending N1 to N3 before the lock; B runs only on request (Q13) |

## 13. Residual defects found, not changed here

- `verify composition` fails any page taller than the window with `text-off-canvas` (F10).
- `composition capture` fails with the label "film capture" and the hint `npm i hyperframes` for a web
  page (F9).
- The 5,120-byte front-door limit was never enforced, and the previous change's `tasks.md` says it
  was (F2). D10 adds the check.
- Codex lists eight vendored `interface-discipline` skills as independent skills from the installed
  package (F4). Moving those files deeper, or documenting the cost, is a separate change.
- The `ui` intake still asks "How long?" until `fix-tool-guidance-errors` lands.

## 14. Open questions

Answered in `docs/superpowers/specs/2026-09-30-web-capability-skills.md`. Dependencies: Q1 D1; Q2 D2;
Q3 D2, D4; Q4, Q5, Q6 D9 and section 7; Q7 E6; Q8 E5; Q9 D6 and 8.3; Q10 D5 and section 9; Q11 D8;
Q12 E0; Q13 D4 and 6.1; Q14 D3 and 5.2.

## 15. Not verified

- Claude Code's discovery was not run; F6 is a maintainer's statement. The description findings (F13)
  are Codex only; omp and Claude Code were not run against the new description.
- Codex behaviour is one version (0.155.0) on Windows.
- The per-section anchor capture was tried on a synthetic page, not on a scroll-driven one.
- The recipe code does not exist yet; its determinism and the 8.1 invariants are unproven until T7.
- The registry change is a draft: its author gave the final names (`scripts/tool-list.json`,
  `skill/references/tool-map.md`, `scripts/tool-list.cjs` with `--check` and `--write`,
  `tests/tool-list.test.cjs`) but nothing is implemented or committed. Its entry fields and rules may
  still change; T0 reads the landed versions and T5 follows them.
- The new description was not run against any host except for the colon and length findings; no trigger
  table has been run.
- No evaluation was run and no model was asked to follow the new guides; nothing is known about
  whether they change page quality.
- The reviewer-time and cost figures are estimates.
- `openspec validate add-web-capability-skills --strict` is run by the author at the end of this
  slice; `node scripts/qa.cjs` is not run (this slice edits no code).
- The commit that ends Phase A does not exist yet, and neither does the commit just before it, so the
  arms of comparison A are named, not hashed; T0 records the baseline and T6 the changed hash.
