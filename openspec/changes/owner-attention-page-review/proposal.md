# Proposal: review on the page itself (owner-attention phase 3d)

## Why

The owner now sees numbered screenshots at desktop and phone width, before and after, and names each element in
chat ("hero-2 is too small"). The agent then transcribes those words into `decide --ref`. Two gaps remain, both
named in `design-owner-attention` (B, G):

- **Pointing.** Reading a number off a screenshot and typing it is slower and more error-prone than clicking the
  element on the page itself. Every visual-feedback tool works by clicking: Vercel's toolbar comments, Marker.io,
  BugHerd, and the tools that hand a picked element to a coding agent (Agentation, react-grab, Stagewise).
- **Provenance.** `--by owner` is a claim the agent makes. A verdict recorded from a block the owner submitted on
  the page, with their words and bound to the page version, keeps what they gave, not only the agent's summary.

The agent may run in a cloud sandbox the owner's browser cannot reach, so nothing can depend on a shared
`localhost`. The agent-oriented tools converge on the same answer: a dev-only overlay, a selector plus context,
and the clipboard as the universal channel, with a local server only as an optional upgrade
([Agentation](https://cdn.jsdelivr.net/gh/benjitaylor/agentation@main/README.md),
[react-grab](https://cdn.jsdelivr.net/gh/aidenybai/react-grab@main/README.md)).

## What Changes

- New `evidence review-page`: writes `evidence/review.html`, a copy of the built page with a comment overlay
  inlined. `index.html` is never changed. The copy carries the page digest, the ask it answers (a section or
  the final review) and the numbered references of the current captures.
- The overlay: a comment mode that outlines the numbered element under the pointer; clicking it adds a pending
  comment on that reference (`hero-2`, or `m:hero-2` at phone width); a pending list kept across reloads; and
  one submit, as a review, with **Request changes** or **Accept** and the owner's own words. Submit shows one
  block to copy, or downloads it as a file.
- `decide --page-review <file>` records that block: it checks the schema, the page version and the ask, then
  records the verdict exactly as `decide` would with `--by owner`, `--answer` and `--ref`, keeps the block under
  `evidence/page-review/<sha256>.json`, and marks the record as given on the page. A block from an earlier page
  or for another ask is refused, and nothing is recorded.
- Owner-facing section and final-review asks offer the review page beside the numbered screenshots.

Out of scope: a local receiver that skips the copy step, and screenshots cropped per comment (the numbered
captures already show each element).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-workflow`: the owner can review on the page itself and submit a verdict the pipeline records with its
  provenance.

## Impact

- New `skill/tools/page-review/overlay.js` (inlined by the build), `skill/scripts/workflows/page-review.cjs`
  (build and block validation); `cli-core.cjs` (`evidence review-page`, `--page-review`), `workflow-core.cjs`
  (decide from a block, the step in `nextAction`), `roles.cjs` (the record's `via`, shown in the statement).
- `skill/references/workflow-web.md`, CLI reference, CHANGELOG, `design-owner-attention` (3d).
- Tests: new `tests/page-review.test.cjs` (browser: the overlay produces a block) and `workflow-next` cases.
- No new gate or receipt schema: the block is input to the existing decide record, and `runtime-review` is
  unchanged.
