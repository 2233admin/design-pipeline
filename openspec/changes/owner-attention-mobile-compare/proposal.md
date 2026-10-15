# Proposal: a phone capture and before/after on repeated reviews (owner-attention phase 3b)

## Why

Phase 3a gave the owner a numbered screenshot of the built page, at desktop width only. Two gaps remain in the
review loop:

- **The phone.** Most landing-page visits are on phones, and the probe already audits the page at 390×844. The
  owner, though, only sees the desktop page. A layout that breaks on a phone reaches the final review unseen,
  and the owner cannot cite an element that only exists in the phone layout.
- **What changed.** After the owner rejects a section ("hero-2 is too small"), the agent revises it and asks
  again. The owner now has to remember what the section looked like and find the difference themselves.
  Visual review tools show the new snapshot beside the last one the reviewer saw: Chromatic's baseline is "the
  last known good state" per story and mode, updated only when a change is accepted
  ([Chromatic, branching and baselines](https://www.chromatic.com/docs/branching-and-baselines)); Percy and
  BackstopJS do the same per width. A Japanese revision sheet (修正指示) is checked against the proof that
  was marked up.

The owner agreed to split phase 3b: the phone capture and before/after first, since both reuse the 3a capture;
the click overlay, the per-element comparison and the page change tier follow, each after its own research.

## What Changes

- `evidence refs` also captures the page at 390×844, as a phone shows it (mobile and touch emulation, the
  probe audit's mobile size). It writes `evidence/refs-mobile.json` and `evidence/refs-mobile.png` in the 3a
  schema; phone references carry an `m:` prefix (`m:hero-2`, `m:3`), drawn on the badges, so they can never be
  confused with desktop ones. Each capture is kept while current and taken again on its own when stale.
  **BREAKING:** its result lists `captures` per viewport in place of the 3a top-level `refs`, `json` and `png`.
- `--ref` accepts phone references, checked against the current phone capture, with the same section rule.
- Owner-facing reviews show both numbered screenshots when they are current.
- When the owner (or the art director, for a section) records a section or final-review verdict, the current
  numbered screenshots are kept as content-addressed copies under `evidence/reviewed/`, and the record names
  their hashes.
- When the same section, or the final review, is asked again on a changed page, the action shows the copies
  from the latest recorded verdict there beside the new numbered screenshots and says when and how it was
  judged, so the owner compares the two pictures instead of remembering.

Out of scope (phase 3c and later): the click-to-comment overlay, the per-element comparison of two versions and
the page change tier. The before/after here is two whole-page pictures, not a diff.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-workflow`: numbered references gain a phone capture and `m:` references; a repeated review shows the
  screenshots from the latest verdict at that scope.

## Impact

- `skill/scripts/page-refs-core.cjs` (viewport profiles, prefixed references), `capture-refs.cjs`
  (`--viewport`), `cli-core.cjs` (`evidence refs` captures each stale viewport).
- `skill/scripts/workflows/web.cjs` (current check per viewport, `--ref` with `m:`, the archive and the
  comparison step), `workflow-core.cjs` (archive at the review verdict, the step in `nextAction`).
- `skill/references/workflow-web.md`, `docs/cli-and-reference-providers.md`, CHANGELOG,
  `design-owner-attention` (phase 3 split into 3a, 3b and 3c).
- Tests: `tests/page-refs.test.cjs`, `tests/workflow-next.test.cjs`.
- No new gate, receipt schema or policy digest; the phone capture uses the 3a schema. Existing projects keep
  their desktop capture; the next `evidence refs` adds the phone one. Records made before this change have no
  copies, so their next review shows no before picture.
