# Web guides and a capability evaluation (spec, draft)

Status: draft, awaiting approval (2026-09-30). Nothing here is approved. Behaviour changes ship as the
OpenSpec change `openspec/changes/add-web-capability-skills/`; this document is the summary and the
place to answer the open questions. `design.md` of that change is the single source for decisions,
contracts and numbers. The file name keeps the word "skills" because other changes refer to it; the
term used inside is **web guide**.

Amended the same day after an audit: the two web guides are registered in the tool list, the front-door
description is rewritten, the evaluation guide moved out of `references/`, and the wording is plainer.

## Glossary

- **Web guide**: a document the agent reads at one step of building or reviewing a web page:
  `web-treatment.md` and `web-review.md`. It is not a host "skill": there is still one `SKILL.md`.
- **Evaluation guide**: `skill/evals/web/README.md`, for maintainers only. It says how to compare two
  versions of this skill on web pages.
- **Front door**: `skill/SKILL.md`, the one file a host reads first. **Router**:
  `.claude/skills/design-pipeline/SKILL.md`, the same for people working on this repository.
- **`next`**: the command that gives one step at a time (intake, reference, concepts, build, probe,
  review, deliver). **Tier**: quick, standard or full, how much ceremony a project gets. A tier is not a
  model level.
- **Tool list, tool map**: from `add-capability-registry`, which lands first. The tool list
  (`scripts/tool-list.json`) names every command and guide; the tool map (`skill/references/tool-map.md`)
  is made from it. A check inside `node scripts/qa.cjs` fails when the front door, the router or a `next`
  action names a guide that is not on the list.
- **Gate**: an automatic check that fails on known bad shapes. **Component Conformance**: the gates
  pass. **Visual Acceptance**: a person looked and accepted. Agents never record it.
- **Treatment, Style table, W1 to W7, first-viewport test**: the treatment is a page's plan. The Style
  table is its fixed list of colours, type, shape and motion words, plus banned template patterns. W1 to
  W7 are seven yes/no review questions. The first-viewport test is looking at the first screen for five
  seconds and saying what the product is and one thing to do there.
- **Arm, baseline, changed, comparison**: an arm is one side of a comparison, a packaged copy of this
  skill built from one commit. The baseline arm is the older one; the changed arm holds the change.
  Comparison A (default) tests this change against the commit just before it. Comparison B (optional)
  tests the whole web creative layer against `bbf7fa4`.
- **Brief, held-out brief**: a brief is the short description of a page to build (product, audience,
  scope, assets). A held-out brief is written after the numbers are locked, so nothing was tuned on it.
- **Generation**: one page built by one model from one brief in a fresh session. **Model level**: weak,
  mid or strong.
- **Pilot**: a small first run that tests the mechanics only.
- **Blind pack, key**: the pages shown as A and B with names hidden, in shuffled order. The key says
  which is which and stays closed until both rounds are done.
- **Counted review, secondary review**: yours counts. The model's is labelled and never counts.
- **Round 1, round 2**: round 1 counts. Round 2 repeats some pairs later to see whether you agree with
  yourself.
- **Safety check** (guardrail): a number from an existing checker that must not get worse. It can stop a
  pass; it never grants one.
- **Verdict**: `pass`, `fail`, `blocked` (something required did not run) or `inconclusive` (too noisy,
  or the blind is broken).
- **Lock commit**: the commit after which the numbers cannot change. **Made-up step** (synthetic): a step
  done by rule or with invented content, not in real use.
- **OpenSpec change**: how this repository changes behaviour: a folder of proposal, design, tasks and
  spec files.

## Problem

The web work already has a treatment template, section briefs, seven review questions and web prompts
without film wording (`b631fcd`). It does not yet tell an agent, or you, how to do three separate jobs
with them: give a chosen concept a distinct style and section briefs, review a built page, and check
whether all of this made pages better. You asked for the way to confirm the gain first, then guides you
can use directly: inside the package, routed from `skill/SKILL.md`, with no new CLI, gate, receipt or
analyzer, you as the only counted Visual Acceptance reviewer, and a labelled non-blind secondary review
by the model.

## What this adds

| What | Where | Job |
| --- | --- | --- |
| Web guide `web-treatment.md` | `skill/references/` | concept cards that differ on an eight-parameter table (every pair differs on at least four), then the treatment's mandatory Style table with a default blacklist and three must-deviate lines; it absorbs the candidate `web-style-bible` |
| Web guide `web-review.md` | `skill/references/` | a capture check that names a missing tool, three-size evidence, the five-second first-viewport test, W1 to W7 as yes, no or not-verified with evidence, a report that opens with Visual Acceptance, a labelled secondary review |
| Evaluation guide and `briefs.md` | `skill/evals/web/` | baseline against changed, blind, with numbers written down first, in two counted rounds by you |
| Front door | `skill/SKILL.md` | one bullet for the two web guides; the description rewritten once (+254 bytes in all) |
| Tool list entries | `scripts/tool-list.json`, `skill/references/tool-map.md` | two public entries for the web guides, one internal entry for the evaluation guide |
| Checks | existing tests | four structure checks (front door size, links, no other `SKILL.md`, a description a host accepts) and link checks for the new `next` pointers; no wording is tested |

The `next` actions for `concepts`, `build` and `review` each gain one pointer to a guide. No `next`
action and no front-door line names the evaluation guide, so page authors are never sent to it; the
router has one bullet for maintainers. `web-direction.md` stays the single source of the treatment
template, the brief mapping and the W1 to W7 table; the new guides point to it and copy nothing.

Not added: a gate, finding code, receipt, schema, CLI command, benchmark manifest, scoring code or
script. Conformance and Visual Acceptance stay separate; agents never record acceptance.

## What the investigation found

Seen on this machine on 2026-09-30, not assumed:

1. **A nested `SKILL.md` is not portable.** Codex CLI 0.155.0 lists a nested `SKILL.md` as an
   independent skill, up to six folders below the skills root, and already lists eight vendored
   `interface-discipline` skills from this package next to `design-pipeline`. omp does not discover
   nested files (its own document). Claude Code is reported not to (a maintainer's statement; not run
   here). So the guides are plain documents, and a test guards that no other `SKILL.md` appears.
2. **The 5,120-byte front-door limit is checked nowhere**, although the previous change's `tasks.md` says
   it is. The change adds the check.
3. **The front-door description has two hard limits.** Codex drops a skill whose description contains a
   colon followed by a space, without any message to you (the suggested text had `NOT:`), and rejects a
   description over 1,024 characters. The new description avoids both and a test keeps it so.
4. **Benchmark v2 cannot carry this evaluation.** No place for arms, generations, pairs or a win-rate
   threshold; it needs two systems; a manifest cannot be all optional; no preference dimension. The briefs
   are a markdown file and the six fairness names become conditions in the record.
5. **`verify composition` fails any page taller than the window** with `text-off-canvas` for the text below
   the fold. The responsive safety check counts only errors inside the window height.
6. **Capture works here** through a sibling `puppeteer-core` (25.11.0) with `--puppeteer-module`: 375x812,
   768x1024 and 1440x900 captured and gated. Without it the command fails with a clear message.
   Per-section capture works from a local server with `#<section-id>` (a synthetic page only).
7. **The registry's check would fail this change** if a guide were named by the front door, the router or a
   `next` action without an entry in the tool list, so registration is part of each phase.

## Decisions

Reversible, each with its reason in `design.md` section 3: three documents, not four (D1); plain files,
no nested `SKILL.md`, the evaluation guide under `evals/` (D2); one web bullet and a description
rewritten once (D3); arms are git commits, and the evaluation files land in a later commit than the
changed arm, so neither arm contains them (D4); no benchmark manifest (D5); a manual, seed-deterministic
blind recipe, and one script file only if the pilot shows it is needed (D6); the model's review is made
after unblinding and read by you only after both counted rounds (D7); safety checks from existing gate
outputs, scoped (D8); numbers provisional until a lock commit (D9); structure tests only (D10); the
guides registered in the tool list, in the phase that adds them (D11).

## The evaluation on one page

- **Arms:** two git commits per comparison, packaged with `scripts/package.cjs`, hashes and diff stat
  recorded. **Comparison A (default)** tests this change's increment: baseline = the commit just before
  the first Phase A commit, changed = the last Phase A commit. So the guidance-fix and registry commits,
  which land first, are in both arms; a stray commit landing between the arms is avoided or declared.
  **Comparison B (optional, Q13)** tests the whole web creative layer against `bbf7fa4`; it is reported
  separately and never combined with A.
- **Generations:** at least three independent generations per arm, model and brief; fresh session, memory
  off, pinned models, equal budget; the workflow's questions answered from the brief; a failed generation
  is a loss, not a drop.
- **Order:** pilot (one model, two `dev` briefs, mechanics only, no effect claimed), then an amendment
  window, then the lock commit, then the held-out briefs (at least five page types that differ; the briefs
  never name the dominant element or the driver), then the weak, mid and strong models.
- **Blind pack:** seeded, balanced orientation, opaque ids, tool traces stripped, leak scan, key kept
  outside the pack and unread until both rounds are done.
- **Your rounds:** pass 1, five seconds on each first screen: can you name the product and one action.
  Pass 2, per pair: which page makes you want to keep scrolling, plus a guess of which is the changed one.
  Round 2 later on a random subset, for consistency. Only round 1 counts.
- **Verdict per model level, never combined:** `pass`, `fail`, `blocked`, `inconclusive`. A `pass` says
  the changed package beat the baseline for that level by your preference on these briefs with the safety
  checks held; it says nothing about any page's Visual Acceptance.
- **Every record declares** which steps are made up, the six conditions, the validity limits and what was
  not verified.

Cost at the defaults (estimates, not measured): comparison A takes 12 pilot and 90 confirmatory
generations, about two hours of your time for a full round and about 35 minutes for round 2. Comparison
B, if you ask for it, adds 45 generations (135 in all) if the changed-arm pages are reused, 90 (180) if
not, and a second round of the same size.

## Order of landing

`fix-tool-guidance-errors` first, then `add-capability-registry`, then this change, so this change
starts from a tree that holds both. Three changes edit `skill/SKILL.md` (different lines); this one lands
last and measures it. `tasks.md` has the table of who edits which shared file. Phase A (T0 to T6) ends
with the changed-arm commit; Phase B (T7, T8) adds the evaluation guide; the evaluation itself is yours
to run.

## Open questions (defaults in bold)

1. **Granularity.** **Two web guides; the style bible is a section of `web-treatment`.** Or four
   documents: the style bible gets its own file and `web-direction.md` points there.
2. **Nested `SKILL.md`.** **No.** Otherwise Codex lists each one at startup, the evaluation protocol
   reaches every page author, and the frontmatter works on one host only.
3. **Where the evaluation guide lives.** **`skill/evals/web/README.md` next to `briefs.md`, like film's.
   The front door does not name it; the router has one bullet; the tool list has an internal entry; it
   lands in Phase B, after the changed-arm commit.** Or `skill/references/web-capability-eval.md` with a
   maintainers-only bullet in the front door (about +140 bytes, and it sits in every author's reading
   path). Or one commit for both phases (the changed arm is then built from a worktree without the
   Phase B files).
4. **The numbers of design section 7 (N1 to N17).** **Confirm the defaults:** 3 generations; 5 held-out
   briefs; per model level the changed page preferred in at least 70 percent of pairs (11 of 15, a tie is
   not a win; a fair coin gets there about 5.9 percent of the time, so it is a screen, not proof); the
   changed arm wins at least 3 of 5 briefs; comprehension not lower; failing pages for the responsive and
   accessibility safety checks not more than baseline; round 2 at least 24 hours later on at least 30
   percent of the pairs and at least 12, exact agreement at least 80 percent; blinding guess below 80
   percent; one void re-run per cell; 60-minute budget; 5 seconds a look; 60 seconds a page; 45-minute
   sittings. Needed before the lock commit, not before the documents are written.
5. **Threshold for the strong model level.** **70 percent like the others.** Or 50 percent (not worse than
   baseline), because a strong baseline has less room.
6. **May the pilot amend the numbers?** **Yes, once, in a recorded window before the lock commit.** Or no:
   the numbers are fixed now.
7. **Models and harnesses.** **You name the weak, mid and strong model ids and the harness for each
   before the pilot; the pilot uses the weak level.** Codex 0.155.0, Claude Code 2.1.267 and omp are
   installed here. I cannot pick them for you; the record needs id, version and sampling settings.
8. **Held-out briefs.** **A session that edits no skill file drafts five (number-led dashboard, playable
   demo, timeline or log, map or exploration, plans and pricing); you approve; committed after the lock.**
   Or you write them.
9. **Blind pack.** **A manual recipe, deterministic from a seed, with its code blocks in the evaluation
   guide; no script.** If the pilot shows the recipe is run more than once by hand (a full evaluation runs
   it at least three times: pilot, round 1, round 2) or breaks, the code blocks move into one file,
   `skill/evals/web/blind-pack.cjs`: run with `node`, not a CLI command, the same pack, key and
   verdict-sheet formats. Then the cost is the file, a test, a `required` entry and its own spec delta.
   Or write that file now.
10. **Benchmark manifest.** **None; the briefs are `skill/evals/web/briefs.md`.** Or a v2
    `web-benchmark.json` with two systems, one required control scenario and optional briefs; it can hold
    briefs and fairness flags only.
11. **Safety checks.** **By hand or by the operator's loop from `verify composition` output; the
    responsive one counts only `text-off-canvas` inside the window height; the accessibility one counts
    `text-contrast` and `low-contrast`.** Or drop the automated responsive check and have you check 375 px
    on the live page.
12. **Capture tools.** **The sibling `puppeteer-core` at
    `D:/projects/design-pipeline/tern-snapshot-1/runtime/node_modules/puppeteer-core` through
    `--puppeteer-module`, as question 8 of the 2026-09-29 spec said; path and version recorded.** Or
    install `puppeteer-core` in a scratch folder.
13. **Which comparison.** **A only: baseline = the commit just before the first Phase A commit, changed =
    the last Phase A commit; it measures this change's increment.** With A only, the earlier web change's
    effect on its own is not measured. Or also B: baseline = `bbf7fa4`, which measures the whole web
    creative layer; B is reported separately and never combined with A. Cost: B needs its own baseline
    generations and review rounds, 45 more generations (135 in all) if the changed-arm pages are reused, 90
    more (180) if not, and a second round of the same size.
14. **The front-door description.** **Rewrite it once, here, with the text in `design.md` 5.2:** it starts
    with what the skill builds, uses the words users say (landing page, website, design system, component,
    website clone), lists the cases it is for, and ends with what it is not for. It is one line of 529
    characters (the current one is 405, opens with a slogan and has no not-for part). It differs from the
    audit's suggestion in three ways: `NOT for` instead of `NOT:` (the colon made Codex drop the skill); no
    skill names in brackets (`code-review`, `design-an-interface` and `bmad-ux` exist on one machine, and a
    package must not point to skills a user may not have); and "components" added. Or keep the current
    description. A trigger table of twelve sample requests is written into `qa.md` for you to run against
    your host; no agent runs it.

## Left as they are

`verify composition` on tall pages (finding 5); the capture error says "film capture" and suggests
`npm i hyperframes` for a web page; the eight Codex-visible vendored `interface-discipline` skills; the
`ui` intake still asks "How long?" until the guidance fix lands.

## Not verified

Claude Code's discovery (reported only); omp and Claude Code against the new description; Codex on one
version; per-section capture on a scroll-driven page; the recipe code (it does not exist yet); the trigger
table (nobody has run it); the registry change's final rules (a draft, nothing implemented); the
reviewer-time and cost figures; the whole evaluation, which has not been run. No model has been asked to
follow the new guides, so nothing is known about whether they change page quality. Visual Acceptance is
pending.

## On approval

Answer the questions (or "default"). Land `fix-tool-guidance-errors`, then `add-capability-registry`. Run
T0; then T1, T2, T3 and T4 in parallel; then T5; then T6; commit (Phase A). Run T7, then T8; commit
(Phase B). The evaluation is then yours to run, with the operator following
`skill/evals/web/README.md`.
