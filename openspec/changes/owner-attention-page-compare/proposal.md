# Proposal: element comparison and the page tier (owner-attention phase 3c)

## Why

A section the owner accepted stays accepted however the page changes afterwards: its verdict binds the
section's key (its brief line, the direction, the component decision), not what it looks like. Building the
next section often touches shared CSS, so an accepted heading can change size or colour without anyone
looking at it again; the owner only meets it again, mixed in with everything else, at the final review. And
when the owner is asked again, nothing tells them which elements changed: phase 3b shows two whole-page
pictures and leaves the spotting to them.

`design-owner-attention` decision B sets the rule: accepted parts stay accepted only while the pipeline can show
nothing else changed; the changed set comes from comparing the two rendered versions, never from the agent's
account of its edit; when the comparison cannot be made, the part returns to review. Its table C names this the
page tier.

Mature tools work the same way: Applitools stores the DOM and CSS with every baseline image and, for a visual
difference, lists the elements overlapping it with their text, bounding-box and style changes
([Root Cause Analysis](https://applitools.com/docs/eyes/concepts/reviewing-tests/root-cause-analysis)); it
tolerates moved content with floating regions. Chromatic and Percy compare against the last accepted snapshot.

## What Changes

- Each numbered capture also records, for every element and every `data-section` region, a fingerprint of the
  pixels inside its box (from a clean screenshot before the badges are drawn), and each section's box.
- A verdict that keeps its screenshots (3b) also keeps the capture's reference list, so a later capture can be
  compared element by element.
- New comparison of two captures: elements are paired within each section by tag and text in document order
  (the longest common subsequence, as a text diff pairs lines), so content that moved is still paired; a pair
  whose pixels differ is changed, an unpaired one is added or removed; a section whose pixels differ is changed
  even when no numbered element did (a background).
- **The page tier:** once every section is built and accepted, a section accepted by the owner or the art
  director with kept captures is reopened when the page changed since and the comparison finds it changed at
  any kept viewport, or when the comparison cannot be made (no current capture). The ask lists the changed
  elements. A section the comparison finds unchanged stays accepted.
- The final review asked again after an acceptance lists the elements changed since.

Out of scope (phase 3d): the click-to-comment overlay and confirmation through the page's own action.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-workflow`: captures carry pixel fingerprints; accepted sections are reopened by the page tier; repeated
  asks list changed elements.

## Impact

- `skill/scripts/page-refs-core.cjs` (section boxes, fingerprints), new `skill/scripts/workflows/page-compare.cjs`
  (pure comparison), `skill/scripts/workflows/web.cjs` (kept reference lists, the page tier in
  `sectionProgress`, the ask text), `skill/scripts/workflow-core.cjs` (final review changes).
- `skill/references/workflow-web.md`, CHANGELOG, `design-owner-attention` (3c split into 3c and 3d).
- Tests: `tests/page-refs.test.cjs`, `tests/workflow-next.test.cjs`, new `tests/page-compare.test.cjs`.
- No new gate, receipt schema or policy digest; the page-refs v1 document gains fields. **Breaking:** the 3b
  `captures` record value becomes `{png, refs}` per viewport (unreleased). Sections accepted with captures
  before this change have no kept reference list, so the page tier asks about them again (not comparable) after
  the page changes; a section whose page did not change needs nothing.
