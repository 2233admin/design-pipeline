# Add web guides and a capability evaluation

The change id is `add-web-capability-skills`. It keeps the word "skills" for stability: other changes
name this id (about fifteen lines in ten files of the two changes that land before this one, plus the
file name of the approval document), and renaming it would mean editing files owned elsewhere. In this
change the term is **web guide**: a document the agent reads at one step, not a host skill.

Words are used as in the glossary at the top of
`docs/superpowers/specs/2026-09-30-web-capability-skills.md`.

## Why

The web creative layer, `add-web-treatment-and-section-briefs` (committed as `b631fcd`), is one
reference document and three prompts. Nothing tells an agent, or the user, how to do three separate jobs
with it: give a chosen concept a distinct style and section briefs, review a built page, and check
whether all of this made pages better. And no evidence says it did. The user asked for the capability to
be usable and, first, for a way to confirm that it raised page quality.

What the investigation found (`design.md` section 2) decides the shape:

- Codex CLI 0.155.0 lists a nested `SKILL.md` as an independent skill (eight vendored
  `interface-discipline` skills from this package already show up that way on this machine); omp does
  not, and Claude Code is reported not to. A nested `SKILL.md` would behave differently per host and
  would show the evaluation protocol to every page author.
- The 5,120-byte limit on `skill/SKILL.md` is written in three documents and checked by nothing.
- The front-door description opens with a slogan, has no "not for" part and lacks words users say. And
  Codex drops a skill whose description holds a colon followed by a space, without telling the user,
  and rejects a description over 1,024 characters.
- Benchmark v2 cannot carry the evaluation: it has no place for arms, generations, pairs or a win-rate
  threshold, needs two systems, and cannot be all optional.
- `verify composition` fails any page taller than the window with `text-off-canvas` for the text below
  the fold, so an automatic safety check has to be scoped.
- `add-capability-registry`, which lands first, adds a check to `node scripts/qa.cjs` that fails when
  the front door, the repo router or a `next` action names a guide that has no entry in the tool list,
  when an entry claims a stage that nothing names, and when the generated tool map is out of date. So the
  guides this change adds must be registered, in the phase that adds them.

## What changes

1. `skill/references/web-treatment.md`, a web guide: concept cards that differ on a table of eight
   parameters (every pair differing on at least four), and the treatment's mandatory Style table with a
   default blacklist of template patterns and a three-line must-deviate list. It absorbs the candidate
   `web-style-bible`.
2. `skill/references/web-review.md`, a web guide: a capture check that names a missing tool, evidence at
   three window sizes, the first-viewport five-second test, W1 to W7 answered yes, no or not-verified
   with evidence, a report that opens with Visual Acceptance, and a labelled secondary review.
3. `skill/evals/web/README.md` and `skill/evals/web/briefs.md`, the evaluation guide, placed next to its
   briefs the way film's is (`skill/evals/film/README.md`). Arms are git commits. The default
   comparison A measures this change's increment: the baseline is the commit just before the first Phase A
   commit, the changed arm the last Phase A commit. An optional comparison B measures the whole web
   creative layer against `bbf7fa4`, is reported separately and is never combined with A. At least three
   independent generations per arm, model and brief; a one-model pilot, then weak, mid and strong models
   on held-out briefs of at least five page types; numbers written down and locked before the held-out
   briefs; a manual blind recipe; two counted rounds by the user; a verdict per model level; a mandatory
   declaration of made-up steps.
4. Front door: the web bullet is replaced by one bullet that names the two web guides, and the
   `description` is rewritten once, here (the text is in `design.md` 5.2). The front door names nothing
   under `evals/`.
5. Routing: one `<intake>` bullet in the repo router for the evaluation guide (Phase B); one pointer in
   each of the web `concepts`, `build` and `review` `next` actions; pointers in `workflow-web.md`,
   `web-direction.md` and `qa-checklist.md`.
6. Registration: the two web guides as public entries in `scripts/tool-list.json` and the map
   `skill/references/tool-map.md` rewritten with `node scripts/tool-list.cjs --write` (Phase A); the
   evaluation guide as an internal entry with a reason (Phase B).
7. Tests: four structure checks in `tests/claude-code-surface.test.cjs` (front door size, its links, no
   other `SKILL.md`, a description a host accepts) and link checks for the new pointers in
   `tests/workflow-next.test.cjs`. No wording is tested.
8. Registration of the new files in `package-resources.json` and a `CHANGELOG.md` entry.

The work lands in two phases so that the changed arm holds no evaluation file (`design.md` D4). Phase A
is items 1, 2, 4, 5 (without the router bullet), 6 (the two web guides), 7 and 8 (the two web guides).
Phase B is item 3, the router bullet, the internal entry and their registration.

## Decisions taken

By the author, reversible, each with its reason in `design.md` section 3: three documents, not four (D1);
plain guide files, never a nested `SKILL.md`, and the evaluation guide under `evals/` (D2); one web
bullet and a description rewritten once (D3); arms are commits, and evaluation files land after the
changed arm (D4); no benchmark manifest (D5); a manual blind recipe, one script file only if the pilot
shows it is run more than once (D6); a labelled secondary review made after unblinding (D7); safety
checks from existing gate outputs, scoped (D8); numbers provisional until a lock commit (D9); structure
tests only (D10); the guides registered in the tool list in the phase that adds them (D11).

## Awaiting the user

Fourteen open questions with defaults are in
`docs/superpowers/specs/2026-09-30-web-capability-skills.md`. The numbers of `design.md` section 7 are
provisional defaults until the user confirms them (Q4 to Q6). The new description is a proposal for the
user to read (Q14).

## Order

(1) `fix-tool-guidance-errors`, (2) `add-capability-registry`, (3) this change. Neither of the first two
is committed yet. The three changes edit `skill/SKILL.md` and some other files; `tasks.md` names the owner
of each shared file, and this change, landing last, measures `skill/SKILL.md`. Task T0 stops this change
if either earlier change is missing.

## What this change does not claim

It claims no visual improvement and no capability lift. No page was built or judged with the new guides,
no evaluation was run, and no host was tried on the new description except for the colon and length
findings. W1 to W7 stay uncalibrated. Visual Acceptance for this change stays pending until the user
records the result of the evaluation in `qa.md`. Agents never record it.

## Not in scope

- A new gate, finding code, receipt, analysis or result schema, workflow stage, CLI command, benchmark
  manifest, scoring code or blind-pack script (a script file's contract is written down in `design.md`
  8.3 and left for after the pilot).
- The golden page, the section kit and the multi-viewport capture (changes 2 to 4 of
  `docs/superpowers/specs/2026-09-29-web-creative-layer.md`).
- Fixing `verify composition` on tall pages, the "film capture" wording of the capture error, the eight
  Codex-visible vendored skills, or the `ui` intake question about duration (`design.md` section 13).
- An ablation of which part of the change helps, and any test with real visitors.

## Builds on

`add-web-treatment-and-section-briefs` (`b631fcd`), `fix-tool-guidance-errors` and
`add-capability-registry` (both land first), `add-music-driven-plate-kit` (the two-arm blind pairwise
pattern and its decision rule), `film-timeline-and-model-evals` (benchmark v2),
`optimize-skill-progressive-disclosure` (the front door), `add-composition-gate` (the findings W1 to W7
cite) and `port-motion-web-interaction` (the interaction probe).
