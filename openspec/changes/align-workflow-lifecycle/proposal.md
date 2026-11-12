# Make the four workflows one lifecycle

## Why

The user has asked several times to "optimise the workflow". On 2026-09-30 we read the stage code and
ran the real functions (`design.md` sections 1 and 2). The four deliverables (`film`, `edit`, `web`,
`ui`) follow different shapes. And `next` can call a job finished when the proof is missing or out of
date. The plainest findings, each with its proof in `design.md` section 7:

1. A person's review can be skipped. `decide` accepts any stage at any time: with the review and
   delivery answered first, `next` reached `done` without ever asking the person.
2. An accepted review outlives the draft. After a different draft passed its gate, `next` said
   `done` again; nobody had seen the new draft.
3. Delivery is a claim. `decide --stage deliver` accepts a file that does not exist, and `ui` quick
   finishes on a bare `deliver`.
4. A passed check is judged by file time, not by what is in the files. Different bytes with an old file
   time still pass; a deleted probe file still counts; `next` watches one render while `film check`
   checks another.
5. `ui` has almost no flow: one or two stages, no gate, no concepts, no review, no guide, and none of the
   "two human decisions" that the 2026-09-28 design gives every standard job.
6. `full` means nothing for film and edit: same stages and same text as `standard`, although the front
   door promises an OpenSpec change. `replicate` is ignored by web quick and by `ui`. `freeform` is
   accepted and does nothing.

Fifteen defects in all, and nine differences that are on purpose and stay.

## What changes

This change is a design, a spec and a plan. Writing it edits no code, test or registration file. It
sets down:

- **Six common steps** (intake, direction, make, verify, review, deliver) and where every stage of
  every deliverable sits among them. No stage is renamed and no new entry command is added. Each
  deliverable's tier and mode lists become ordered subsets of one master list.
- **One rule for ceremony per tier**, including that `full` opens an OpenSpec change before the first
  make stage for all four deliverables, and one table of the human decisions per tier.
- **One rule for "finished"**: evidence that exists now. A passed check counts only while the files it
  read are unchanged (each file is checked by a short code worked out from its contents). A person's
  verdict counts only for the draft that person saw. Delivery names something that exists. `decide`
  answers only the question being asked.
- **One table of legal skips** (quick tier, replicate, freeform, declined references).
- **Eleven ordered slices, S0 to S10** (`design.md` section 8, `tasks.md`, and the plan
  `docs/superpowers/plans/2026-09-30-workflow-lifecycle.md`). Slice 0 is a small central fix: a missing
  input file is never fresh (it lands before the web checks). Slice 1 is another change's. Slice 2 is the
  `ui` flow. The rest follow mostly in a chain, because most slices touch the same files; slices 3 and 4
  can run side by side.

## Decisions taken

Each is open to change and has its reason in `design.md`:

- Steps are labels on existing stages, read by the `next` output, one test and the art-director rule;
  they never choose the next stage (3.1, S9).
- Film and edit at `full` match web and `ui`; the ceremony is an instruction with a structured
  `openspec: "required"` field, not a code check (4.2, Q2, Q3).
- Passed checks get an `inputs` field and verdicts a `subject` field. That extends the record `next`
  already keeps (its schema id stays `design-pipeline.workflow-state.v1`); it adds no file, schema or
  receipt (a receipt is a saved record that a check ran; 5.3, Q4).
- Old records and verdicts without those fields never count, so a project in flight repeats each gate
  and its review once (5.4).
- `ui` gets its own `probe` and `review` stages on the existing `interaction` gate, so the web checks and
  the `ui` flow do not both edit `web.cjs`; it has its own concepts prompt and guide (S2, Q13).
- A missing input file is never fresh, for every gate, as one central change (S0) before the web checks;
  content fingerprints stay a later, separate step (5.7, Q4).
- `freeform` finishes the `reference` stage with no study and keeps it in the list (section 6, Q5).

## Order of work

`fix-tool-guidance-errors` is not committed yet and edits `workflow-core.cjs`, `workflows/shared.cjs` (its
top comment), the workflow test and `skill/SKILL.md`; it lands first, then slice 0, then slice 1
(`add-web-composition-checks`, another
worker), then slice 2. `add-capability-registry` keeps its rule that the standard, replicate list holds
every stage, which every slice here keeps; whichever of the two changes lands second updates the other's
tool-list rows for the `ui` stages. Details: `design.md` section 9.

## Not in scope

- Merging `next`/`decide`, `route`/`toolchain`/`execution` and `change`/`status`/`plan`/`run` (the three
  commands that each tell you what to do next), adding another such command, or renaming any stage id or
  `decide` value.
- A new gate, finding code, receipt or schema. `ui` is not wired to `component-first`, `verify
  components` or `verify motion`. `film check` does not start reading text boxes. Who writes
  `control.gates` is not decided here.
- Checking by code that an OpenSpec change exists.
- The web page checks (slice 1), evaluations of `next` for edit, web and `ui`, and the reorganisation of
  `pipeline-reference.md` and the other reference files.

## Awaiting the user

Thirteen open questions with defaults are in `design.md` section 11 and in
`docs/superpowers/specs/2026-09-30-workflow-lifecycle.md`. The status of that document is draft,
awaiting approval. Nothing here is approved.

## What this change does not claim

It does not say the new flow gives better films, pages or screens. Gates find failure shapes; a
person accepts. It was not built, and `node scripts/qa.cjs` was not run. The facts come from reading
code and from throwaway runs that changed nothing in the repository (`design.md` section 13 lists
what was not verified). Visual Acceptance does not apply: nothing here is a page or a film.

## Builds on

`redesign-user-workflow` (tiers, `next`, two human decisions), `split-film-edit-workflows` (guides,
fresh gate results, replicate), `add-web-treatment-and-section-briefs` (web prompts and review),
`fix-tool-guidance-errors` (the `ui` intake and tier text), `add-capability-registry` (the tool list and
the master-list rule), `add-web-capability-skills` (the freeform content rule) and
`add-web-composition-checks` (slice 1).
