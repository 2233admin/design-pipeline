# Design

## Context

See proposal.md for why. Current code (after `owner-attention-mobile-compare`):

- `captureRefs` measures the numbered elements (`measureRefs`: ref, section, selector, tag, text, box), draws
  badges and takes one badged full-page screenshot per viewport.
- A person's section or final-review verdict names `captures: {desktop?, mobile?}` (png hashes) and `decide`
  copies the pngs to `evidence/reviewed/<hex>.png` (`storeReviewed`).
- `sectionProgress` (`web.cjs`) walks the approved sections; a section is accepted while its latest verdict is
  an accept whose `key` equals `sectionKey(...)` (line, direction, components, epoch). The page bytes are not
  part of the key, so a later page edit never reopens it.
- The final review asked again after an accept says "accepted an earlier version" and shows the kept pictures.

## Goals / Non-Goals

**Goals:**
- Know, from the rendered pages, which elements and sections changed between a verdict and now.
- Keep an accepted section accepted only while that comparison shows it unchanged.
- Tell the person exactly what changed.

**Non-Goals:**
- **A pixel diff image.** The fingerprint says whether a box looks different, not where inside it.
- **Computed-style comparison.** Pixels already show any style change that is visible; an invisible one does
  not matter to the owner.
- **Tolerances.** Any pixel change counts. A false "changed" costs one look; a missed change costs trust.
- **Overlay, confirmation through the page** (phase 3d).

## Decisions

### 1. Fingerprints from one clean screenshot

- After measuring, the capture takes a clean full-page screenshot (no badges), opens a blank page in the same
  browser, decodes it and, for each element box and each section box, hashes the box's size and RGBA bytes
  (two 32-bit FNV-1a variants: a change detector, not a security hash). Boxes are read in slices of 2048 rows,
  so a box taller than the browser's largest canvas is read whole.
- Records: each reference gains `pixels: "<w>x<h>:<16 hex>"` (null for a box outside the picture); the
  document gains `sections: [{id, box, pixels, palette}]` for each `data-section` region with a valid id, in
  document order (a repeated id is listed each time and compared in order; an element belongs to its closest
  section, as for references). `palette` is the set of colours (4 bits a channel) covering at least 1% of
  the box, each with its share in 5% steps, so a region that keeps its colours but changes how much of the
  box they cover is still seen.
- **Moved sections.** Checked: when content above pushes a section down by a fractional amount, each element
  inside keeps its fingerprint (each is read at its own rounded box) but the section's crop does not, since
  its contents round to whole pixels independently. So a section whose box moved is the same when its size and
  palette match (its numbered elements are still compared one by one); one that did not move is compared by
  fingerprint. A background colour or image change in a moved section changes its palette; a change that keeps
  every colour's share and touches no numbered element is the accepted blind spot.
- **Why boxes, not coordinates:** a box is hashed where the element is now, so content pushed down by a new
  paragraph above keeps its fingerprint (checked: the sections fixture with two paragraphs added to `hero`
  keeps every `proof` fingerprint and the `proof` section's).
- **Why in the browser:** the skill has no PNG decoder; the browser that took the screenshot decodes it.
- **Determinism:** checked in this sandbox: two captures of the same page give identical fingerprints for every
  element and section (motion frozen, media loaded, as 3a requires).
- **Schema:** the page-refs v1 document gains optional fields. `refsDigest` binds `{refs, sections}` when
  `sections` is present, so an edited section fingerprint makes the capture stale as an edited reference
  does; a capture from before binds `refs` alone and stays current.
- **Alternative:** per-element `page.screenshot({clip})` and hashing PNG bytes. Rejected: one call per element,
  and PNG encoding is not guaranteed stable.

### 2. Verdicts keep the reference list

- `captures` becomes `{desktop?: {png, refs}, mobile?: {png, refs}}`: `refs` is the sha256 of the capture's
  json bytes, copied to `evidence/reviewed/<hex>.json` beside the png, by `storeReviewed`, all or nothing as
  in 3b. `compareStep` reads `.png`.
- A kept json is used only when it hashes to its name and its `png` field equals the kept png hash.

### 3. The comparison (`workflows/page-compare.cjs`, pure)

- `compareCaptures(before, after, scope)` where `scope` is a section id, or null for the whole page. Returns
  `{comparable, sectionChanged, changes: [{change, section, before, after}]}`, each side `{ref, tag, text}`.
- **Not comparable** when either side lacks `pixels` (a capture from before this change).
- **Pairing** within each group (one section id, or outside sections):
  1. the common start and end are paired as they are (as `diff` trims them);
  2. in between, the longest common subsequence of `tag|text` keys pairs unchanged-content elements in order;
  3. between two anchors, leftover elements of the same tag pair in order (a text edit);
  4. the rest are `added` or `removed`.
  - Above 2000 elements left in a group after trimming, the group is not paired and the comparison is not
    comparable (the quadratic table would be too large).
  - Repeated identical items pair in order: an item inserted in the middle of a run of identical cards is
    reported at the end of the run; the set of changed sections is still right.
- A pair is `changed` when its `pixels` differ (size is part of the fingerprint) or its text differs.
- **Section:** changed when its `pixels` differ, or it exists on one side only. A changed section with no
  changed element is still changed (the change is in its background or an unnumbered part).
- Viewports are compared separately; references keep their prefix (`m:`), so the list says which viewport.
- **Alternative:** pair by selector. Rejected: `:nth-of-type` paths shift when a sibling is inserted (checked:
  inserting two paragraphs mispaired three `hero` elements).

### 4. The page tier in `sectionProgress`

- **When:** after the key walk finds every approved section built and accepted, so a page edit made while a
  later section is being built does not reopen earlier ones (and ask for a capture) on every edit. Sections are
  then checked in order, and the first one the tier reopens is the current section.
- For each approved section whose latest verdict is an accept with the current key, and which kept `captures`:
  - page unchanged since (`pageSha256` equals `pageDigest(root)` and every file in the kept captures'
    `lineage` still has its bytes, since a font or image named only in CSS is outside the digest): accepted.
    A kept capture whose reference list is missing (deleted, or a 3b record) cannot show this, so it goes to
    the comparison, which then cannot be made;
  - otherwise, for each viewport it kept: the kept json and a current capture of that viewport must exist and be
    comparable; if any is missing, the section is reopened as **unknown**; if any viewport shows the section
    changed, it is reopened as **changed** with the changes; if every viewport shows it unchanged, it stays
    accepted.
- A section accepted without captures (a self-check, no browser, before 3b) keeps today's key rule.
- **Viewports:** every viewport the accept kept is compared; a kept viewport without a current capture now
  makes the comparison unknown. A re-accept keeps only the viewports current at that moment, so coverage can
  narrow, and an accept made while no capture is current keeps none and falls back to the key rule. Both are
  accepted: the owner looked at the section and accepted it.
- **Who is asked:** the tier only decides that the section is open again; the ask goes to whoever the
  delegation map and the art director give the section now, as for any section ask. A self-check re-accept
  keeps no captures and leaves the tier.
- **Not acceptance:** the tier never accepts anything. It keeps a person's acceptance standing while the
  rendered section is unchanged (a technical comparison, like Component Conformance), and otherwise returns the
  section to that person; Visual Acceptance stays theirs.
- **Timing:** `sectionProgress` reads the captures each time it runs; a capture taken between an ask and its
  record can settle a reopened section, after which `decide --verdict accept` on it fails cleanly with
  "next is at …".
- **Ping-pong:** fixing one reopened section can change another (shared CSS); each is asked in turn, and every
  answer is the person's, so the loop ends when they accept.
- **The reopened ask** is the normal section ask (owner, director or self-check by the delegation map), with
  `first`:
  - changed: "Section X was accepted at <at>; the page changed since and the comparison found these changed:
    <list>. Show them before and after and ask again.";
  - unknown: "Section X was accepted at <at> on an earlier page, and it cannot be compared with this one until
    the page is captured: once it is, a section the comparison finds unchanged keeps its acceptance. If the
    capture cannot be taken, ask:" (the capture command itself comes from the 3a step that follows).
  - A changed section with no changed numbered element is listed as "section X (changed, outside its numbered
    elements)".
  - The action carries `pageChanges` (structured list) for the agent.
- Re-accepting records a new accept with new captures, which stands.
- **Why reopen on unknown:** decision B says the part returns to review when the comparison cannot be made. The
  `next` after a successful capture lifts it when nothing changed, so the cost is one capture.

### 5. The final review lists changes

- When the latest draft is an accept that kept captures and the page changed: compare the whole page per kept
  viewport with the current captures; when comparable, the `first` lists the changed elements and sections
  (at most 12, then "and N more"). Not comparable: the 3b text only.

## Risks / Trade-offs

- **[Every page edit asks for a capture while a person-reviewed section is accepted]** One `evidence refs` run
  (seconds) per edit; skipped entirely for self-checked sections.
- **[Any pixel change reopens]** Including an image that renders differently between runs: 3a already requires
  loaded, decoded media and frozen motion; anything left is a real difference worth a look.
- **[Fingerprint collision]** 64 bits; a missed change needs a collision on the same box size.
- **[Fractional moves]** Handled for sections by the palette; an element whose own rendering changes with
  its sub-pixel offset (a hairline border) is reported changed — a false "changed" costs one look.

## Migration

- Captures taken before this change have no fingerprints: their comparisons are not comparable, so a section
  accepted on one is asked again (unknown) after the page changes, and accepted again with new captures. A
  section whose page did not change needs no capture.
- 3b records with `captures: {viewport: "sha256:…"}` are read as having no kept json: the section is asked
  again once (not comparable), even when the page did not change, and its kept screenshot is still shown.
