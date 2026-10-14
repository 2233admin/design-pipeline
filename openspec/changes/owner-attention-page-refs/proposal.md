# Proposal: numbered element references on the built page (owner-attention phase 3a)

## Why

When the owner reviews a built section or the final page, they have to describe each element in words ("the
second button under the photo"). That is the most common complaint in web revision work: the designer cannot
tell which part a comment means (STUDIO's 2024 survey of 464 designers and directors). And the owner's final
acceptance needs no words of theirs at all: the command `next` returns already carries `--by owner`, so the
agent can record it without the owner having said anything.

The owner chose numbers over a click-to-comment overlay as the first step (design-owner-attention, phase 3).
Precedents: numbered annotations on Japanese revision sheets (修正指示), Apple Voice Control's "Show numbers",
and numbered marks on screenshots for browser agents (set-of-mark prompting).

## What Changes

- New `evidence refs` action: opens the built `index.html` in the browser the probe already uses, numbers the
  meaningful elements of each `data-section` in DOM order (`hero-1`, `hero-2`, ...), and writes
  `evidence/refs.json` (number, selector, tag, text, box) and `evidence/refs.png` (full-page screenshot with a
  number badge on each element). The badges are drawn in the browser only; `index.html` is never changed.
  `refs.json` records the page digest it was taken from.
- Section reviews and the final review that face the owner tell the agent to run it and show `refs.png`, so the
  owner can comment by number ("hero-2 is too small") or still name an element in words.
- New repeatable `--ref <number>` on `decide` for section and final-review rejections. Each number must be in
  the current `refs.json` (taken from the current page). The rule keeps the number with its selector and text,
  so its meaning survives a later renumbering.
- **BREAKING:** final acceptance by the owner requires `--answer` with the owner's words from the conversation.
  The returned command carries a placeholder for those words, not a ready-made acceptance. A page that changed
  after the owner accepted it says "the owner accepted an earlier version" and asks again.
- The diligence statement shows each cited number, and the page version of the owner's acceptance.

Out of scope (phase 3b): the click-to-comment overlay, before/after per comment, per-element comparison of two
page versions and the page change tier.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-workflow`: section comments may cite element numbers. New requirements for numbered references, for
  `--ref` feedback, and for a quoted final acceptance bound to the reviewed version.

## Impact

- `skill/scripts/interaction-capture-core.cjs` / `capture-interaction.cjs`: a refs mode in the existing browser
  kernel (same browser lookup, `puppeteer-core` from the project, `file://` load).
- `skill/scripts/cli-core.cjs`: `evidence refs`, `--ref` in `KNOWN_OPTIONS` and passed to decide.
- `skill/scripts/workflows/web.cjs`, `shared.cjs`, `workflow-core.cjs`, `rules.cjs`, `roles.cjs`: action text,
  `--ref` validation, rule objects, acceptance words, statement lines.
- `skill/references/workflow-web.md`, CHANGELOG, `design-owner-attention` (phase 3 split into 3a and 3b).
- Tests: `tests/workflow-next.test.cjs`, a new refs capture test registered in `scripts/test-manifest.json`.
- No new gate, receipt schema or runtime-review change. Existing projects: owner accepts recorded before this
  change stay valid; a new acceptance needs the owner's words.
