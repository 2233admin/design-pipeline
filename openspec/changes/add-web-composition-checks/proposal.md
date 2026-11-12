# Add a three-size first-screen check to the web interaction gate

## Why

The web `probe` stage checks one thing: how the page answers input (`verify interaction`). Nothing
checks what the page looks like, so `next` calls `probe` finished even when the page is blank at phone
width. The review step asks for screenshots at 375x812, 768x1024 and 1440x900 that no stage makes.

The composition check exists (`verify composition`) but web never names it, and run by hand on a web page
it gives wrong answers (seen 2026-09-30; `design.md` Appendix B). It takes one picture, records nothing
`next` reads, fails a normal scrolling page with `text-off-canvas` errors for text below the screen (no
waiver exists for errors), and photographs an animating page half-way, which gave a false `low-contrast`
error.

Today `next` also watches `index.html` whatever page the probe really opens. If the probe opens another
page and that page changes, `probe` stays finished; for an http address nothing is watched (`design.md` 0.10).

## What changes

1. `verify interaction` (the existing command and gate) also checks the page's first screen at 375x812,
   768x1024 and 1440x900. After the probes it opens the same page at each size, waits until the picture
   stops changing, saves the picture and the text boxes, and runs the existing composition gate on each
   with a new `page` profile. One result, one record: `state.gates.interaction` is `passed` only when the
   probes and all three sizes passed. The result keeps its schema id and adds `checks` (which half
   failed), `composition` and `next`. No new command, option, gate, record key or schema id. When the page
   is not a file inside the project (an http(s) address, for one), the last sentence of `next` says so
   plainly; see item 2.
2. `probe` finishes on that one record, read over the probe file, the page file that its `url` names (not
   a fixed `index.html`) and nine evidence files (`evidence/composition/<size>/screenshot.png`,
   `elements.json`, `result.json`). A missing file means not finished. The rule, stated once: the workflow
   judges the page file the probe names, inside the project; a page at a web address, or anywhere else
   outside the project, can only be judged by running the check yourself, and changes to it are invisible
   to `next`. So for an http(s) address, a link that leads outside the folder, a folder, or a probe file
   that is not valid, `next` does not finish `probe` and says what to change. The command can still run on
   such a page by itself, and then the `next` sentence of its result says plainly that
   `designer-pipeline next` cannot count the page as finished and to point `url` at the local page file. A
   record from before this change has no evidence, so it reopens `probe`, which names the same one
   command. The same rule applies at every tier.
3. A `page` profile for the existing composition gate. Text below or past the bottom of the screen, and
   text fully outside it (a closed menu, a carousel card), are not reported for position. Text partly on
   screen and cut at the left, right or top edge is a warning. Blank or washed-out pictures and unreadable
   text stay errors.
4. The composition capture script gets `--settle-ms`: wait until two pictures 250 ms apart are the same,
   for at most that many milliseconds. It is a script option only, off unless given, so film use is
   unchanged and no CLI flag is added.
5. Words: the web `build` text names the three sizes, the web `review` text names the evidence files, the
   `probe` action says what the one command now checks, and `workflow-web.md`, `composition-gate.md`,
   `web-direction.md`, `qa-checklist.md` and `web-motion.md` say what the check does and does not see.
6. A documentation appendix (`design.md` Appendix A) maps one common lifecycle (intake, direction, make,
   verify, review, deliver) onto the real stage names of each deliverable. It renames nothing.

## Decisions taken

By the author, reversible, each with its reason in `design.md`; none is approved yet.

- **Extend the `interaction` gate; do not add one.** The first draft recorded a second key,
  `composition`, in `state.gates`. That is a parallel gate, which `AGENTS.md` forbids, and it is
  withdrawn. The same command now measures both halves and writes one record (`design.md` section 0).
- **Staleness uses the time rule every gate already uses, plus an existence guard.** No hash rule exists
  in the gate path, and `next` never reads the interaction result, so hashes or extra result fields could
  not do the job (`design.md` section 0). `recordGate`, `decide` and `workflows/shared.cjs` are not
  edited.
- **Bind the page that was actually captured, and say so when it cannot be (option (a) of `design.md`
  section 0.10).** `next` reads the probe file and puts the file its `url` names in the list, instead of a
  fixed `index.html`; an address or anything that is not a file inside the project cannot be bound, so
  `probe` is not finished for it. The web workflow supports project-contained files only and does not
  claim remote support. This fixes, for the `next` workflow, a weakness that exists today for the
  interaction gate alone. Recording the captured target in the record (option (b)) was rejected: it needs
  a change to `recordGate` or a new reader of the result, and still could not judge an http page. One
  function of the new core decides which pages count, for the command's notice and for `next`, so the two
  cannot disagree; it repeats the capture's two rules for where `url` points, and a test pins that they
  agree (`design.md` Q17).
- `text-off-canvas` is a warning on the `page` profile, because carousels, menus and tickers put text
  outside the screen on purpose and nothing can waive an error.
- The pictures and the text-position check cover the first screen only; full-page pictures stay in a
  later change.

## What this change does not claim

It does not prove a page is responsive. It catches a blank or washed-out first screen and unreadable
text (contrast is read for every visible text box on the page). It does not catch overlapping text,
clipped text, text running out of its box, sideways scrolling, or the layout of anything below the first
screen (`design.md` section 3 shows a page that passes with all three faults). A small lone component on
an otherwise empty page fails `blank-frame`, which nothing can waive; this matters most for the quick
tier (`design.md` Q3). The settle limit and the `page` rules come from a handful of synthetic pages and
are uncalibrated. Visual Acceptance stays pending until a named reviewer records it; agents never record
it. A project that can only be checked through a dev server stops at `probe` until `url` names a page file
in the project folder, and changes to a remote page are invisible to `next` (`design.md` Q11).

## Not in scope

- Hash-bound receipts, and any edit to `recordGate`, `decide` or `workflows/shared.cjs`.
- A new stage, gate, record key, finding code, receipt, schema id, CLI verb or CLI flag.
- Any change to `verify composition` or `composition capture` (the new profile is usable by
  `verify composition --profile page` without an edit).
- Recording the captured target, or a snapshot of what a server served, in the record or the result
  (option (b) of `design.md` section 0.10).
- The web `build` rule, which finishes when `index.html` exists in the project folder: a project whose only
  page is in a subfolder stays at `build` until a root `index.html` exists, before and after this change
  (`design.md` section 0.10).
- Full-page or contact-sheet capture, sideways-scroll detection, sizes other than the three. The approved
  2026-09-29 spec gave "multi-viewport, full-page and contact sheet on `composition capture`" to its
  change 4; this change does the three sizes inside `verify interaction`, so change 4 shrinks to
  full-page and contact sheet if the user agrees (`design.md` Q12).
- Waivers for errors, reporting whether a verdict was recorded (`design.md` Q16), and the `ui`, film and
  edit workflows.
- Other changes' files.

## Builds on

`add-web-treatment-and-section-briefs` (web guide, W1 to W7, the three sizes), `port-motion-web-interaction`
(`verify interaction`, the `probe` stage), `add-composition-gate` (the gate and its findings),
`redesign-user-workflow` (`next`, state, gate records) and `split-film-edit-workflows` (the stage lists).
It stands next to, and edits no file of, `add-capability-registry`, `add-web-capability-skills`,
`fix-tool-guidance-errors` and `align-workflow-lifecycle`; `design.md` section 7 says what each means
for landing order.
