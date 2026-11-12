# Web composition checks (spec, draft)

Status: draft, awaiting approval (2026-09-30). Nothing here is approved. Behaviour changes ship as the
OpenSpec change `openspec/changes/add-web-composition-checks/`; this document is the summary and the
place to answer the open questions. `design.md` of that change is the single source for decisions,
contracts and numbers; where the two differ, `design.md` wins.

Revised the same day: the first draft recorded a second gate key, `composition`. That is a parallel gate,
which `AGENTS.md` forbids, so this version extends the existing `interaction` gate instead. A later round
fixed which page `next` watches: it now follows the page the probe opens instead of a fixed `index.html`.

## Glossary

- **Probe**: the web stage that checks the real page in a real browser. **`next`**: the command that gives
  one step at a time (intake, reference, concepts, build, probe, review, deliver). **Tier**: quick,
  standard or full, how much ceremony a project gets. A tier is not a model level.
- **Probe file**: `interaction.json` in the project root, the list of moves to try. **Result**:
  `evidence/interaction.json`, what the command writes. They share a name and are different files.
- **Gate**: an automatic check that fails on known bad shapes. **Gate record**: what `next` keeps after a
  gate runs, `{ status, at }` in `.design-pipeline/state.json`. A record is **current** when no file the
  stage lists for it is newer than it (with 50 ms of slack for clocks).
- **The interaction gate**: the command `verify interaction` and its one record, the key `interaction`.
  Before this change it checked only the probes; after it, it also checks the first screen.
- **First-screen check**: the composition gate run on the first screen of the page at three sizes: a
  phone (375x812), a tablet held upright (768x1024) and a laptop (1440x900). It fails on a blank or
  washed-out picture and on unreadable text, and warns about balance, empty bands, clutter and the like.
- **Profile**: the set of limits the composition gate applies. There are `ui`, `poster` and `frame`; this
  change adds `page`.
- **Capture script**: the small file a command starts to drive the browser (the code calls it a kernel).
  **Settle**: wait until the picture stops changing before taking it.
- **Component Conformance**: the gates pass. **Visual Acceptance**: a person looked and accepted. Agents
  never record it.
- **OpenSpec change**: how this repository changes behaviour: a folder of proposal, design, tasks and
  spec files.

## Problem

The web `probe` stage checks how the page answers input and nothing else. `next` calls it finished when
the page is blank at phone width. The review step shows the reviewer screenshots at three sizes that no
stage makes. The composition check exists but web never uses it, and run by hand on a web page it gives
wrong answers: a normal scrolling page fails at every size because of text below the screen, and a page
that animates on load is photographed half-way and fails on contrast. You asked for the web checks to
improve, with a common lifecycle written down for documentation only, and with no new gate, record shape
or schema unless it is the smallest extension of an existing command. The smallest extension is to let
the existing `verify interaction` also check the first screen, under its one record.

## What this adds

| What | Where | Job |
| --- | --- | --- |
| A first-screen check inside `verify interaction` | `skill/scripts/cli-core.cjs` (the handler of that command), new `skill/scripts/composition-page-core.cjs` | after the probes, open the same page at three sizes, settle, check each first screen, write nine evidence files, join both halves into one result, record `interaction` once; when the page is not a file inside the project, add one plain sentence to `next` of the result |
| One record for `probe` over the probe file, the page it names and nine files | `skill/scripts/workflows/web.cjs`, and one function of `composition-page-core.cjs` that says which page the probe names | `next` finds the page file the probe's `url` names. `probe` finishes only when that page is a regular file inside the project folder, all eleven files of the list exist (the probe file, that page, the nine evidence files) and the gate passed and is current over them; every tier. For an http(s) address, a link leading outside the folder, a folder or an invalid probe file it does not finish and says the rule and what to change |
| A `page` profile | `skill/scripts/composition-core.cjs` | text below the screen or outside it on purpose is not reported; text cut at an edge is a warning |
| `--settle-ms` | `skill/scripts/capture-composition.cjs` | take another picture every 250 ms until two in a row are the same, at most `ceil(n / 250)` more times; a script option that only `verify interaction` passes (fixed at 4000), no CLI flag |
| New result fields | the result document | `checks` (which half failed), `composition`, `next`; same schema id |
| Words | `build`, `review` and `probe` text, `workflow-web.md`, `composition-gate.md`, `web-direction.md`, `qa-checklist.md` | name the sizes and the evidence, say what the check does and does not see |
| Lifecycle table | Appendix below and `design.md` Appendix A | documentation only |

Not added: a stage, a gate, a record key, a finding code, a schema id, a CLI command, flag or option,
hash binding, or any edit to `recordGate`, `decide`, `workflows/shared.cjs`, `verify composition` or
`composition capture`.

## What the investigation found

Seen on this machine on 2026-09-30 with throwaway scripts outside the repository, not assumed. The
commands and their output are in `design.md` Appendix B.

1. **The first draft broke the repository rule.** A second record key is a parallel gate. It is withdrawn.
2. **There is no hash rule, and nothing reads the interaction result.** A gate record is `{ status, at }`
   and `next` compares file times. Hashes would mean changing `recordGate` and `gatePassed` for film,
   edit and web; extra fields in `evidence/interaction.json` alone would never reach `next`. What works is
   extending the command and the stage's input list.
3. **One record over several steps is how this repository already works.** `film check` and `film-edit
   check` run many steps, including a composition step, and record one key.
4. **The time rule has two holes.** A listed file that does not exist counts as fresh (closed here by an
   existence check). A file replaced with an older copy that keeps its old time counts as fresh (stated;
   same for every gate).
5. **A normal scrolling page fails `verify composition --profile ui` at all three sizes** with four
   `text-off-canvas` errors (the text below the screen). `--allow` does nothing for it: it waives warnings
   only.
6. **Pages with a closed menu, a carousel or a moving ticker get more false errors.** A heading that runs
   out of its box is not flagged at all, because the gate reads element boxes.
7. **A page that animates on load is captured half-way.** It failed with a false `low-contrast` error; with
   a wait for the picture to stop changing (2.25 s here) the same page passed.
8. **The check cannot see some real faults.** Overlapping headings, a clipped headline and a heading wider
   than the screen all passed. Gray on gray and a nearly empty page failed, as they should. Text contrast
   is read for every visible text item, so unreadable text below the first screen fails too.
9. **The whole design runs on a throwaway copy.** Against a fake browser and in real headless Chrome (four
   pages, 7 to 14 seconds each; one page served over http) the one command wrote one record, nine files
   and a result that names the failed half. The existing tests of the interaction CLI, the evaluator and
   the composition gate pass unchanged, and exactly four web tests that record the gate without evidence
   needed to write the nine files first.
10. **A small lone component fails `blank-frame`.** A centered square on an empty page needs about 40, 60
    and 74 px per side (at 375, 768 and 1440 wide) to pass; an 8 px card failed at all three sizes. Nothing
    can waive that error, so the quick tier, where a page can be one small component, is the place it
    matters (Q3).
11. **Capture works here** through a sibling `puppeteer-core` 25.11.0 (`--puppeteer-module`) and the
    HyperFrames `chrome-headless-shell` 152.0.7977.30: about 1.4 s per size. Without a browser tool the
    command fails with a clear message.
12. **Three other unfinished changes touch the same files** (`cli-core.cjs`, `web.cjs`,
    `composition-gate.md`, `workflow-core.cjs`, `shared.cjs`), and the lifecycle draft and the registry
    draft both describe web's `probe`; `design.md` section 7 says what each means for this change.
13. **`next` watches `index.html`, not the page the probe opens.** The probe's `url` may be an http(s)
    address or any relative file, and the capture opens exactly that. The stage listed `index.html`
    whatever the `url` said. Run on the repository's own code: with `url` set to `pages/demo/index.html`
    and a passed record, editing the captured page left `next` at finished (the old result stayed
    current), and editing the unrelated root `index.html` reopened `probe`; with an http address nothing
    on disk was bound. The weakness exists today for the interaction gate alone, and this change fixes it
    for the `next` workflow: the new pictures share the same list and would inherit the wrong binding.
    On the throwaway copy, with the list worked out from the probe file, pages in a subfolder and at the
    root are bound correctly; an http address, a folder and a link leading outside the folder stop `probe`
    with a clear text; the four existing tests that write a `{}` probe file needed a real probe document
    (the same four that needed the nine files).
14. **The rule, stated once (settled in review).** The workflow judges the page file the probe
    names, inside the project; a page at a web address, or anywhere else outside the project, can only be
    judged by running the check yourself, and changes to it are invisible to `next`. The command stays
    usable on such a page, but its result now says plainly that `designer-pipeline next` cannot count it,
    and `next` says the same and what to change, so nothing is silent. One function decides which pages
    count, for both, so they cannot disagree. Run on the throwaway copy: file page, no added sentence,
    `done`; http address, the added sentence, `probe` with the rule; http address with a failing probe,
    both sentences; a link leading outside, the same as an address.

## Decisions

Reversible; each with its reason in `design.md`: extend the `interaction` gate, not add one (section 0);
staleness uses the existing time rule plus an existence guard, not hashes (section 0); bind the page the
probe really opened, not a fixed `index.html`: `next` reads the probe file, and `probe` is not finished
for an http(s) address, a link leading outside the folder, a folder or an invalid probe file (section
0.10); the web workflow supports project-contained files only and does not claim remote support, and the
command says so plainly in its result (section 0.10); the same rule at every tier (Q3); one command
measures both halves and writes one record (sections 0 and 2); the capture script gets one option,
`--settle-ms`, and no CLI flag is added (section 4); the pictures and the text-position check cover the
first screen, with a `page` profile in which text cut at an edge is a warning (section 3); tests use an
injected capture, a fake browser module and fixtures, with two browser-gated tests (section 6); the
lifecycle table is documentation only (Appendix A).

## Open questions (defaults in bold)

1. **Staleness rule.** **The time rule every gate uses, plus an existence guard.** Or hash binding: a change
   to `recordGate` and `gatePassed`, for all three deliverables, in a later step.
2. **Where the first-screen check lives.** **Inside `verify interaction`: one gate, one record.** Or
   guidance only: drop it from `probe` and keep it as documentation; nothing is then checked or recorded.
3. **Tiers.** **The same rule at every tier (one command, one record).** Or quick exempt, which needs a new
   option or a command that reads the tier; small lone components then pass at quick.
4. **Text cut at an edge on `page`.** **A warning.** Or an error when partly on screen, which fails pages
   with a peeking carousel or a ticker and cannot be waived.
5. **Waivers.** **None for errors; `--allow` stays on `verify composition` only, because warnings never
   fail the gate.** Or add `--allow` to `verify interaction` (reporting only).
6. **Sizes.** **The three.** Or add 1920x1080, which `qa-checklist.md` also lists.
7. **Settle.** **Two equal pictures 250 ms apart, at most 4000 ms.** Or a fixed wait, or another limit. The
   numbers come from three synthetic pages.
8. **Check the first screen when a probe failed.** **Yes: one run shows every finding.** Or stop at the
   first failing half.
9. **Evidence folder.** **Fixed `evidence/composition/<size>/` next to the probe file; `--output` moves
   only the result.** Or put the pictures under `--output` (`next` would not find them).
10. **Files that reopen the check.** **The probe file, the page file that `url` names (inside the project
    folder) and the nine evidence files.** Or also every `.html`, `.css` and `.js` file in the project
    folder (for a page split over files), or also `index.html` whatever `url` names.
11. **A `url` that is an http(s) address (a dev server).** **The web workflow supports project-contained
    files only: the command runs, records and says in its result that `designer-pipeline next` cannot
    count the page; `next` does not finish `probe` and states the rule (option (a) of section 0.10).** Or
    record the captured target and a snapshot of what was served in the one record or result: that needs a
    change to `recordGate` or a reader of the result, and still cannot judge an http page. Or keep today's
    behaviour (nothing bound) and only document it. No login handling either way.
12. **Full-page pictures, contact sheet, sideways-scroll check, and change 4 of the approved spec.** **Not
    in this change; change 4 shrinks to full-page and contact sheet.** The approved 2026-09-29 spec gave
    "multi-viewport, full-page and contact sheet on `composition capture`" to its change 4; this change does
    the three sizes inside `verify interaction`. A sideways-scroll finding needs a new finding code and its
    own change.
13. **Lifecycle table.** **Documentation only, in this change.** Or also ship it as a section of a reference.
14. **Landing order against `add-capability-registry` and the lifecycle change.** **Whichever is ready
    first.** No tool list row should need to change. The lifecycle change's text already describes one
    gate and one list; wording there that names a constant `PROBE_INPUTS`, or a fixed `index.html` for web,
    is out of date, because this change has no such constant: the list is worked out by one function of the
    new core, which its `ui` probe can import. Its planned slice S0 needs a helper of its new test file to
    gain the nine evidence files and a real probe document (Task 3 does that when the file exists), and
    the existence check in `probe.finished` stays so that this change is correct without S0.
15. **Text contrast outside the first screen.** **Checked**: contrast is read for every visible text item,
    so low-contrast text below the fold, or in a menu moved off screen, fails (a real fault). Or only text
    on screen: fewer alarms from hidden states, but unreadable text further down passes.
16. **Say whether the verdict was recorded when the folder has no project state.** **Not in this change**:
    it is how `verify interaction` already behaves, and the lifecycle change plans the field for every
    gate. Or add a `recorded` field here.
17. **Where the rule for which file `url` names lives.** **One function, `boundPage`, in the new core,
    used by the command's notice, by `next` and offered to the `ui` probe; it repeats the capture's two
    rules (an address starting with `http://` or `https://` is an address; any other value is a path
    counted from the probe file's folder), with a command test that pins agreement with what the capture
    opened.** Or export the capture's own function `resolvePageUrl` (one line in
    `interaction-capture-core.cjs`) and call it from `boundPage`, so that one rule exists; that edits a
    file of the interaction gate, which this change otherwise leaves alone.

## Not verified

- The final code: none is written. The prototype ran the handler, the core (with the page rule), the
  profile, the script option, the `probe` rule, the command's notice and the `next` texts for a page that
  cannot be bound on a throwaway copy; it did not run the longer `probe` `why`, the build and review
  texts, the tool list's help-line check, or anything inside `node scripts/qa.cjs`.
- The fake browser module that the tests use exists only as a prototype outside the repository.
- Real pages beyond four synthetic ones and one page served over http; other browsers, Chrome versions and
  systems (Windows only); a page that never loads; the 60-second limit on each capture; pages behind a
  login.
- A real dev server, and a real symbolic link (a Windows folder junction was used). A page in a subfolder
  with a stylesheet next to it ran through real Chrome: the checks pass and `next` binds the page, but
  editing the stylesheet does not reopen `probe`, because the files a page loads are not watched (Q10).
  Also not run: the final wording of the notice and the two `next` texts inside the repository.
- Quick-tier component pages on real projects.
- That the registry's check accepts the appended help note (it has not landed).
- The `page` rule and the settle limit on any real page.

## What only a person can judge

Whether the warnings match what a designer would accept; whether three sizes are the right three; whether
7 to 14 seconds per run is acceptable; whether the quick tier should be exempt; whether a page with no
error is a good page. Visual Acceptance is pending and is never recorded by an agent.

## Left as they are

Hash-bound gate records; the sideways-scroll check; full-page and contact-sheet capture; the capture
message that still suggests `npm i hyperframes` for a web page; the film wording of the `blank-frame`
fix text; `verify composition` and `composition capture`; the `ui`, film and edit workflows; every other
change's files; recording the captured target in the record or result (option (b) of section 0.10); the
web `build` rule (it finishes when `index.html` exists in the project folder, so a page that lives only in
a subfolder stays at `build` until a root `index.html` exists, before and after this change).

## Appendix: lifecycle mapping (documentation only)

Copied from `design.md` Appendix A; if they differ, `design.md` wins. One common lifecycle read onto the
real stage names. Nothing is renamed, no stage is added and no router is added. Stages are as they run at
`standard` and `full` unless a tier is named.

| Lifecycle step | film | edit | web | ui |
| --- | --- | --- | --- | --- |
| Intake | `intake` | `intake`, `analyze` (reads the footage and music) | `intake` | `intake` |
| Direction | `reference`, `concepts` | `reference` (replicate mode only), `style` | `reference`, `concepts`; the treatment is written as the first step of `build` | none |
| Make | `plan` (writes `storyboard.json`, checked by `verify film-storyboard`), `build` | `cut`, `render` | `build` | `work` |
| Verify | `check` | `check` | `probe` (the probes and, from this change, the first-screen check, one gate) | inside `work` |
| Review | `review` | `review` | `review` | none |
| Deliver | `deliver` | `deliver` | `deliver` | the end of `work` (`decide --stage deliver`) |

Quick tier: film `plan`, `build`, `check` (with `reference` first in replicate mode); edit `analyze`,
(`reference`), `cut`, `render`, `check`; web `build`, `probe`; ui `work`. The quick tier has no `intake`,
`review` or `deliver` stage for film, edit and web; edit's `analyze` still runs.

This table reads today's code. A draft change, `align-workflow-lifecycle`, sets a target that differs, in
particular for `ui` (it gains reference, concepts, probe, review and deliver stages); that target is in its
own design, sections 3.2 and S2 (read in part on 2026-09-30). Where the two differ, that one is the plan
and this one is the present. The `plan` cell follows that design: `plan` writes `storyboard.json`, the
same kind of work as web's `build` holding the treatment and the briefs.

## On approval

Answer the questions (or "default"). Land T1 to T4 in parallel (T2 and T3 start once T1 has written
`composition-page-core.cjs`), then T5 (registration, changelog, one `node scripts/qa.cjs`, a real-browser
smoke, `qa.md`). Visual Acceptance of any page stays with you.
