---
version: "1.0"
name: OpenAlice Showcase
description: Single-file product showcase for a local-first AI trading orchestrator
---

# OpenAlice Showcase

## Product Context

This target is a promotional product surface **about** OpenAlice, not part of OpenAlice. OpenAlice
is a local-first AI orchestrator for trading: it connects agents the operator already uses
(Claude Code, Codex, Pi, OpenCode) to market data, Git-backed research Workspaces, scheduled
Issues, and broker accounts, with execution gated behind human approval.

- **Subject**: the path from a market question to a trade the operator personally approved.
- **Audience**: a solo trader or quant who already drives coding agents daily, is comfortable in a
  terminal and in Git, and is skeptical of anything that promises returns.
- **Operating pressure**: real money, and execution is beta. A surface that oversells will lose
  this reader in one screen.
- **Single user job**: decide within one scroll whether this tool can be trusted with a decision
  they will have to defend to themselves.

## Overview

Calm, dense, and inspectable — the posture of a tool that runs on the reader's own machine during
market hours, not of a landing page selling a dream. The product-specific signature is a
**continuous Git spine**: one progress line down the page on which research accumulates as commits
and the trade sits as a commit awaiting review. The spine exists because "Trading as Git" is the
product's actual claim; it is not a decorative rail.

Two devices are deliberately refused. There is no hero gradient and no glow, because a trading
operator reads those as marketing. And nothing on the page auto-advances the approval step.

## Colors

Dark base, because the reader's other windows are dark at 09:30.

| Token | Value | Role | Contrast on `--bg` |
| --- | --- | --- | --- |
| `--bg` | `#0a0d12` | page base | — |
| `--bg-raise` / `--bg-sunk` | `#111721` / `#070a0e` | panel, inset | — |
| `--ink` | `#eef2f8` | body and headings | 15.9:1 |
| `--ink-mute` | `#9aa8bd` | secondary prose | 6.4:1 |
| `--ink-faint` | `#6c7a90` | eyebrow, meta | 3.6:1 — large or non-essential only |
| `--spine` / `--spine-live` | `#3d5a80` / `#7aa2d8` | spine track, draw front | — |
| `--gain` / `--loss` | `#4ec98b` / `#e0655f` | direction | — |
| `--gate` | `#e8b64c` | human approval gate | — |

Direction is never carried by colour alone: every gain or loss value ships a sign in the text.
`--gate` amber appears exactly once, on the approval boundary, so its meaning stays unambiguous.

## Typography

- One sans stack (system UI + Noto Sans SC) and one mono stack. No display face: a bespoke
  identity font would read as a marketing site rather than an operator tool.
- Headings: `clamp()` from 34px to 60px at `h1`, tight tracking (`-.02em`); body 16px/1.6.
- Every number that could change is `.num`: mono plus `font-variant-numeric: tabular-nums`.
  A jittering price column is the fastest way to make a trading surface feel untrustworthy.
- Measure is capped at 60–68ch so Chinese and English copy both stay readable.

## Layout

- Max width 1120px with a 24px gutter; the spine occupies the left gutter at `>=1180px` and is
  hidden below that rather than being crammed into the reading column.
- Scenes are full sections separated by a single hairline, at 104px vertical rhythm. Four scenes,
  in narrative order: attach agents → research accumulates → work recurs → decision gate.
- Two- and three-column panel grids collapse to one column at 860px. Reading order is preserved;
  no alternation is kept at the cost of order.
- Verified widths: 390, 1440. Remaining declared widths (768, 1024) and 200% zoom are unverified.

## Components

- **Panel** — titled surface with a mono status bar. Every product concept in the page is shown
  inside one, because in the real product each of these is an inspectable artifact.
- **Commit log** — ordered rows with a connector anchored to the row box, so the trail stays
  continuous when a message wraps. Nodes latch to a reached state as the spine front passes.
- **Illustrative market row** — symbol, price, change, sparkbars. Always labelled 示意; it must
  never imply live quotes or a realized return.
- **Approval gate** — the one interactive component. Two real buttons, a `role="status"` line, and
  a locked terminal state after approval. Minimum 44px target height (WCAG 2.5.8 AAA).

## Do's and Don'ts

### Do

- Use OpenAlice's own feature vocabulary verbatim: Ask Alice, Workspaces, AutoQuant,
  Auto Prediction, Tracked, Issues, Inbox, Unified Trading Account, Trading as Git.
- Keep the beta-execution caution visible on the same screen as the approval gate.
- Label every number that is not real.
- Keep the whole page readable and operable with motion disabled.

### Don't

- Don't animate the approval gate open, or imply an agent can execute unreviewed.
- Don't show a portfolio curve, a return figure, or a win rate. Not even as illustration.
- Don't vendor OpenAlice's screenshots, brand assets, or source. It is AGPL-3.0; this surface is
  original work about the product.
- Don't use emoji or arbitrary glyphs as an icon system; this page uses type and geometry only.
- Don't add a build step. The delivery form is one file the reader can open.

## Source Decisions

### Adopted

- OpenAlice's public README as the sole content source: feature names, the local-first posture
  (`~/.openalice`), the human-gated execution model, and the beta caution.
- The routed knowledge door `mengto/web-design/scroll-progress-timeline` for the progress-line
  contract: ordered semantic structure first, progress measured between the first and last point
  centres, SVG path progress via stroke-dashoffset, and a reduced-motion substitute.
- Governed toolchain resolution: framework `agnostic`, styling `none`, UI library `none`
  (project-owned), recorded in `toolchain-request.json`.

### Rejected

- Any vendored asset, screenshot, or code from an AGPL-3.0 repository.
- Tailwind, SCSS, and PostCSS: all require a build step the single-file delivery form forbids.
- A hero gradient, glass blur, neon glow, and decorative noise — refused as generic AI-page
  grammar with no product-specific cause here.
- Simulated live quotes, and any metric that could be read as performance.
