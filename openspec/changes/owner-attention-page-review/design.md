# Design

## Context

- `evidence refs` writes current desktop and phone captures (`refs.json`, `refs-mobile.json`) with each
  reference's selector; `refsCurrent` says whether a capture still matches the page.
- `decide` takes `--stage`, `--choice`, `--verdict`, `--answer`, `--ref` and `--by`. `citedRefs` checks every
  reference against the current capture and, at a section, against that section. A web final acceptance needs
  the owner's words (`reason()`, no placeholder).
- `nextAction` appends `refsStep` and `compareStep` to an owner-facing section or final-review ask.
- `stampRecord` writes one `decisions.roles` entry per decide call; `renderStatement` prints them.

## Goals / Non-Goals

**Goals:** click to comment on the real page; one submit as a review; works when the agent cannot reach the
owner's machine; the recorded verdict is the owner's own submission, bound to the page version.

**Non-Goals:** a hosted backend or a local server; editing `index.html`; a new receipt schema or a change to
`runtime-review`; per-comment screenshots.

## Decisions

### 1. A review copy, never the shipped page

- `evidence review-page --root R --project-root R` writes `evidence/review.html`: `index.html` with
  `<base href="../">` as the first child of `<head>` (so the page's relative files load from the project) and the
  overlay script, inlined from `skill/tools/page-review/overlay.js` with its data, before `</body>`. The owner
  opens it where they open `index.html` (the project folder, or wherever the agent puts the page for them);
  inlining every file into one copy is left for later. Only the return channel had to work without a server.
- It needs a current desktop capture (the overlay maps clicks to references), and the next action to be the
  owner's section or final-review ask: `next` at `build` with `section` maps to `{stage: "section", choice}`,
  at `review` to `{stage: "review", choice: null}`. A delegated self-check (a run) and a section directed to
  the art director get none. Otherwise it exits 1 naming what to do first.
- The embedded data: `{schema: "design-pipeline.page-review.v1", page: pageDigest, captures: {desktop, mobile}
  (the screenshot hashes; mobile null without a current phone capture),
  ask, refs: {desktop: [{ref, selector}], mobile: [...]}}`. A section ask embeds only that section's references
  (decide refuses a reference outside the section), so a click elsewhere is a comment on the section. The phone
  list is used when the window is at most 600 px wide.
- The overlay's root is a custom element (`<dp-page-review>`) appended at the end of `<body>`, in a shadow root,
  so no reference selector (`:nth-of-type` paths) shifts.
- Same-page fragment links are scrolled in place, since the base would send them to `index.html`.
- **Alternative:** a browser extension or a proxy. Rejected: an install step for the owner and a moving part.

### 2. The overlay

- **Comment mode** (a toggle): the numbered element under the pointer is outlined; a click is prevented from
  reaching the page and opens a comment box on that element. The element is the nearest ancestor-or-self of the
  click target that one of the references resolves to; a click on nothing numbered is a comment on the ask
  without a reference.
- **Pending list**: each comment shows its reference and text and can be removed. It is kept in
  `localStorage` under the page digest, captures and ask (wrapped in try/catch), so a reload keeps it and another page version
  does not see it.
- **Submit**: the owner's overall words, then **Request changes** (at least two words across the words and
  comments, the count decide applies) or **Accept** (no pending comments; at least two words at the final
  review). A refusal is shown in the overlay, never as a browser dialog. Submit shows the block in a read-only text area with **Copy** and
  **Download** (`page-review-<digest8>.json`).
- **The block:** `{schema: "design-pipeline.page-review.v1", page, captures, ask, verdict: "accept"|"reject",
  words, comments: [{ref|null, text}], submittedAt}`; an acceptance carries no comments.
- Labels are short and bilingual (English / 中文); the agent speaks the owner's language around it.

### 3. `decide --page-review <file>`

- The file is the block as the owner gave it (the download, or the pasted block saved by the agent), inside the
  project and at most 256 KiB. A block mangled in chat fails to parse and is refused; the download is the safe
  route.
- **Checks, before anything is written:** valid JSON and schema; no `--stage`, `--choice`, `--verdict`,
  `--answer`, `--ref`, `--by` or `--tradeoff` beside it (the block decides them; `--promote`, `--scope` and
  `--evidence` may go beside it); `page` equals `pageDigest(root)` (else "this review was given on an earlier
  version of the page"); `captures` equal the current desktop and phone screenshot hashes, which also bind the
  files only the capture lineage covers (CSS `url()` targets); `ask` equals the ask `review-page` would embed now.
  A block answers only the current ask, so an earlier section is rejected through chat as before.
- **Mapping:** `stage` and `choice` from `ask`; `verdict`; `by: "owner"`; `ref` = the comments' references;
  `answer` = the words, then each comment as `<ref>: <text>` (or the text alone), joined with "; ". So one rule
  carries every comment with its element, as when the agent records a chat answer with several references.
- Then `decide` runs as usual: `citedRefs`, the words check, the section rules.
- **Provenance:** after every check, with the reviewed captures and before state, the block's bytes are copied to
  `evidence/page-review/<sha256>.json` (content-addressed); the role entry and the section or draft record get
  `via: "page-review:sha256:<hex>"`, and the statement shows "given on the page" for it.
- **Alternative:** one decide call per comment. Rejected: several rejection records and several rules for one
  review.

### 4. Offered in owner-facing asks

- When the desktop capture is current and the ask faces the owner, `refsStep` adds to `first` (prose, not a
  `record` command, which would get `--by` stamped): "or run `evidence review-page`, let the owner open
  `evidence/review.html` and record the block they send back with `decide --page-review <file>`". Delegated
  self-checks and art-director asks get nothing. The section instruction that said never to offer clicking now
  offers the review page.

## Risks / Trade-offs

- **[The owner must paste or send a file]** One step more than a hosted tool, and it works wherever the agent
  runs. A local receiver can come later.
- **[A pasted block could be edited]** The pipeline cannot prove a person clicked; it records the block as given,
  bound to the page version, and keeps it. `via` is evidence, not proof, as `--by` was.
- **[Pages that intercept clicks]** Comment mode captures clicks before the page's own handlers.

## Migration

- New files: `evidence/review.html`, `evidence/page-review/`. Role entries may gain `via`. Nothing else changes.
