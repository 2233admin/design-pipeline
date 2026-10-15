# Design

## Context

See proposal.md for why. Current code (checked, after `owner-attention-page-refs`):

- **Capture.**
  - `captureRefs` (`page-refs-core.cjs`) loads `index.html` at `VIEWPORT` (1440×900, scale 1), settles in
    `VIEWPORT.height` steps, numbers, draws badges and screenshots. One browser per capture.
  - The kernel `capture-refs.cjs` returns `{capture, png, loaded}`.
  - `evidenceRefsCommand` (`cli-core.cjs`) keeps a current capture, binds lineage, png and `refsDigest`, and
    writes `evidence/refs.png` and then `evidence/refs.json`.
- **Current check.** `refsCurrent(root, doc)` (`web.cjs`) reads the fixed paths `evidence/refs.json` and
  `evidence/refs.png`.
- **Citing.** `citedRefs(root, refs, section)` looks each reference up in `refs.json`.
- **Asking.** `nextAction` (`workflow-core.cjs`) appends `refsStep(root, who)` to a web review ask (final
  review, or a section ask at build). The agent's own self-checks are runs by then and get nothing.
- **Records.**
  - Section verdicts are `state.decisions.sections` entries `{section, verdict, reason, pageSha256, at, ...}`
    (`recordSection`, `web.cjs`).
  - Final-review verdicts are `state.decisions.drafts` entries `{verdict, reason, at, inputHashes, ...}` (the
    review branch of `decide`, `workflow-core.cjs`).
- **The probe** audits the page at `{1280×800, 390×844}` at scale 1 (`workflow-web.md#probe`). The website
  clone also uses 390×844.

## Goals / Non-Goals

**Goals:**
- The owner sees and can cite the phone layout, with the same guarantees as the desktop capture.
- A review asked again shows the pictures the reviewer last judged at that scope next to the new ones.

**Non-Goals:**
- **A diff.** No pixel or element comparison, and no "what changed" list. Two pictures side by side; phase 3c
  brings the per-element comparison.
- **More devices.** One phone profile. Tablets and other sizes stay with the probe's audit.
- **Changing the probe.** It keeps measuring width only; the capture emulates a phone because it is what the
  owner looks at.

## Decisions

### 1. Two viewport profiles in one module

- `page-refs-core.cjs` gets `PROFILES`:
  - `desktop`: `{width: 1440, height: 900}`, scale 1; prefix none; files `refs.json`/`refs.png`.
  - `mobile`: `{width: 390, height: 844}`, scale 1, `isMobile: true`, `hasTouch: true`; prefix `m:`; files
    `refs-mobile.json`/`refs-mobile.png`.
- **Why 390×844.** It is the probe audit's and the website clone's phone size, and the width of current
  iPhones (Playwright's `iPhone 13`/`14` descriptors are 390 wide). Scale 1 keeps the boxes in CSS pixels, as
  the desktop capture does.
- **Why mobile and touch emulation.** Without it the page renders as a narrow desktop window: a page missing
  `<meta name="viewport">` looks fine instead of zoomed out, and `(pointer: coarse)` rules do
  not apply (headless desktop Chromium already reports `hover: none`). The owner should see what a phone shows.
- **Checked in Chromium (this sandbox):** a page without the meta lays out 980 wide and the screenshot is 980
  wide; content wider than 390 widens the screenshot to it; boxes stay in CSS pixels at scale 1 in both, so
  badges sit on their elements; a 20000 px tall page captures whole at both widths.
- **The probe differs on purpose.** It measures width only; the capture shows the emulated phone. The action
  text names the capture as an emulated phone, not a device check.
- `settle` steps by the profile's height. `captureRefs(root, {profile})` uses the profile; everything else
  (lineage, deadline, frozen motion, badges, the root refusal) is shared.
- **References.** The in-page numbering is unchanged. Node prefixes each `ref` with the profile's prefix before
  the badges are drawn, so the picture shows exactly what is cited. `:` is outside `SECTION_ID`, so `m:hero-2`
  can never be a desktop reference.
- **Schema.** `refs-mobile.json` is a `design-pipeline.page-refs.v1` document like `refs.json`, with its own
  `viewport` (`{width, height, mobile: true}`), lineage, png hash and `refsDigest`.
- **Alternative:** one `refs.json` with a `captures` list. Rejected: a new schema shape for no gain, and the
  two captures go stale independently (a replaced png).

### 2. `evidence refs` takes each stale capture

- The kernel takes `--viewport desktop|mobile` (default desktop) and captures one profile.
- The CLI checks each profile with `refsCurrent`. A current one is kept untouched, as in 3a. Each stale one is
  captured in its own kernel run and written (png, then json) as soon as it succeeds, with the 3a checks
  (digest moved, lineage moved).
- If any capture fails, the command exits 1 naming the viewport and the cause, after writing the ones that
  succeeded; the failed one writes nothing.
- **Result shape (breaking, per the project's no-compatibility rule):** `{status, captures: [{viewport, status,
  refs, json, png}]}`, where `status` is `current` only when every capture was kept. The 3a top-level `refs`,
  `json` and `png` fields go; their tests and docs are updated.
- **Alternative:** all-or-nothing. Rejected: a page whose phone layout cannot be badged (a transformed root
  only under `(pointer: coarse)`) would lose its desktop capture too.

### 3. Current check and citing per viewport

- `refsCurrent(root, doc, viewport = "desktop")` checks the profile's own files; `refsCapture(root, viewport)`
  reads them.
- `citedRefs`: each reference is trimmed and lowercased (section ids and prefixes are lowercase, so `M:Hero-2`
  is `m:hero-2`); one starting `m:` is looked up in the phone capture, any other in the desktop one. Each
  file's missing/stale refusal is unchanged and names the right file. The section rule is unchanged (the phone
  record carries the same `section`).
- The rule's `refs` entries keep the prefixed `ref`, so a rule says it was about the phone layout.

### 4. Reviews show both pictures

- `refsStep(root, who)`:
  - both current: show both pngs; ask for references from either (`hero-2`, or `m:hero-2` on the phone);
  - otherwise: run `evidence refs` and `next` again; when one capture fails, show the other and ask in words
    for the rest.
- Delegated self-checks still get nothing.

### 5. Verdicts keep the pictures they judged

- **When.** A section verdict (`recordSection`) or a final-review verdict (the review branch of `decide`) recorded
  `--by owner`, or a section verdict recorded `--by agent` while `state.director` is set (sections are a
  directed checkpoint, so that verdict is the art director's, stamped `agent: <director>`). A section verdict
  `--by agent` without a director is the agent's own self-check and keeps nothing. Review is locked to the
  owner.
- **What.** The record gets `captures: {desktop?: "sha256:…", mobile?: "sha256:…"}` for each capture current at
  that moment (with none, no `captures`, as before). This is the latest capture at the verdict: `next` writes no
  state, so which picture was shown is not recorded, and an agent that recaptured after showing would keep the
  newer one. The wording says "the numbered page when <who> <verdict>", not "what they saw".
- **When the copies are written.** The record functions only name the hashes. `decide` copies each named png to
  `evidence/reviewed/<hex>.png` (`<hex>` its sha256: the same picture is stored once, and its name proves its
  bytes; temp file and rename) after every check, just before it writes state. A failed copy fails the call
  with nothing recorded. A copy left by a crash between copy and state write is harmless: nothing names it.
- **Alternative:** copy only on accept (Chromatic's baseline). Rejected: the common loop is reject, revise, ask
  again, and the picture the owner marked up is what they compare against, as a revision sheet is checked
  against its marked proof.

### 6. A repeated review shows before and after

- `compareStep(state, root, scope)` in `web.cjs`, where `scope` is a section id or `review`:
  - takes the latest record at that scope with `captures` (only person verdicts carry them: the latest
    `sections` entry for that id, or the latest `drafts` entry), and names its `by` (owner, or the art director);
  - for each viewport, uses the copy only when the current capture is current, its png hash differs from the
    recorded one (the page changed since), and the copy still hashes to its name;
  - returns `first`: "Show evidence/reviewed/<a>.png (then) beside evidence/refs.png (now): the earlier picture
    is the numbered page when <who> <accepted it / asked for changes> at <at>. Both are the whole page; at a
    section, look at that section. Let them compare before they answer." and the copies in `show`.
- At the final review this covers both a rejected draft that was repaired and an accepted page that changed
  afterwards (with the 3a "earlier version" line before it).
- `nextAction` appends it after `refsStep`, with the same scope and who. It adds nothing when there is no earlier
  record with copies, no current capture, or an unchanged picture.
- **Alternative:** one composed side-by-side image. Rejected: needs image composition the skill does not
  otherwise have, and two files serve the same purpose in any viewer.

## Risks / Trade-offs

- **[Two captures double the time]** A phone capture on a typical page is a few seconds; `evidence refs` runs
  only when a capture is stale.
- **[`evidence/reviewed/` grows]** One png per distinct picture at a person's verdict and viewport: a few MB
  each, so tens of MB for a project with many rejection loops. No pruning in this change; the folder can be
  deleted by hand and only the before pictures are lost. `evidence/` is the downstream project's folder, and
  whether it is committed is that project's choice.
- **[A whole-page before for a section]** Later sections built since the earlier verdict also differ. The text
  points the owner at the section; cropping waits for the per-element comparison.
- **[A phone layout that cannot be badged]** The desktop capture still works and the ask falls back to words for
  the phone.
- **[An emulated phone is not a real one]** Chromium emulation, not Safari. Stated in the action text; real
  devices stay the owner's own check.

## Migration

- New files under `evidence/`; new optional `captures` on section and draft records.
- An existing `refs.json` stays valid and current; the next `evidence refs` adds the phone capture.
- **Rollback:** reverting ignores the new files and fields.
