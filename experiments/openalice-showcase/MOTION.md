---
schema: design-pipeline.motion-foundation.v0.1
name: OpenAlice showcase motion language
posture: expressive
primitiveRegistry: design-pipeline.motion-primitives.v1
primitives:
  - reveal.trim-line
  - transform.orbit
proceduralMotion:
  policy: disabled
runtimePolicy:
  runtime: inline-svg+css
  dependencies: none
  rationale: >-
    A single self-contained HTML file must open from disk with no install step, so the showcase
    uses inline SVG plus CSS custom properties and transitions only. `reveal.trim-line` is a
    path-progress primitive whose governed render surfaces are svg and canvas, so the spine is an
    SVG path trimmed through stroke-dashoffset against pathLength=1. The routed Mengto door
    `web-design/scroll-progress-timeline` is admitted as inert reference: its geometry and
    semantics rules are adopted (progress normalized between the first and last point centre,
    ordered list with real headings, one active step, recompute after font and resize), while the
    registry's path-progress binding governs the rendered mechanism. GSAP and Anime.js remain
    unadopted; neither primitive here needs them.
  cleanup: >-
    One IntersectionObserver and one reduced-motion MediaQueryList listener, both disconnected on
    pagehide. No requestAnimationFrame loop runs while the page is idle.
reducedMotion:
  substitute: >-
    Under prefers-reduced-motion the spine renders fully drawn, every scene renders at its final
    state, and the agent constellation holds its resting phase.
    No content depends on a transition to become readable, and the approval gate remains operable.
sourceDecisions:
  - source: https://github.com/TraderAlice/OpenAlice
    license: AGPL-3.0
    adopted: >-
      Product truth only, read from the public README: feature names (Ask Alice, Workspaces,
      AutoQuant, Tracked, Issues, Inbox, Unified Trading Account, Trading as Git), the local-first
      posture, and the beta-execution caution.
    rejected: >-
      Source code, UI screenshots, brand assets, and docs imagery. Nothing from the repository is
      vendored or redistributed; the showcase is an original surface about the product.
    codeCopied: false
  - source: https://github.com/cilvia333/WebMotionTable
    license: MIT
    adopted: The trim-line reveal and orbit categories as a motion taxonomy.
    rejected: Its filter graph, animation implementation, and any runtime code.
    codeCopied: false
---

# OpenAlice Showcase Motion Foundation

## Motion Thesis

OpenAlice's product claim is that a market question becomes reviewed research and then a trade you
personally approved, with the whole trail kept in Git. The motion therefore has exactly one job:
make that trail visible as an accumulating, inspectable line — and make the human approval gate
read as a stop, not a flourish. Motion that does not advance or hold that line is cut.

## Motion Principles

- Every moving element reports progress along the research-to-decision trail, or a state change on
  it. Nothing moves to announce that the page is designed.
- The approval gate never animates itself open. Execution is beta and human-gated; a transition
  that implies automatic progression would misrepresent the product.
- Scene changes are driven by the reader's scroll position, never by a timer. The reader owns the
  pace because the subject is their money.
- Numbers that move are labelled illustrative. A promo surface must not imply live market data or
  a realized return.
- The spine is a single continuous path. Cutting it into per-section decorations would lose the
  one idea the motion exists to carry.

## Motion Vocabulary

- primitive: reveal.trim-line — the Git spine. `path.progress` is bound to scroll progress; commit
  nodes latch to a discrete reached state as the draw front passes them. Purpose: continuity and
  progress, not decoration.
- primitive: transform.orbit — the agent constellation in the opening scene. Three agent marks
  hold an explicit phase around the Alice core. Purpose: state — several independent agents attach
  to one local workspace. Direction and phase are authored, not random.

No other primitive is selected. Noise, displacement, and the procedural-path family are rejected
for this surface: they carry no product meaning here and would read as generic AI-page texture.

## Procedural Motion

Disabled. No generator runs, no seed is drawn, and no equation is evaluated at runtime.

## Runtime Policy

CSS transitions and custom properties carry all state changes. No animation library, no WebGL,
no canvas. The file must render from
`file://` with no network access.

## Reduced Motion

The substitute above is the authored path, not a degradation: the same information is present, the
spine is complete, and the approval gate is still the thing the reader must act on.

## Source Decisions

- Adopted: OpenAlice's own feature vocabulary and its local-first, human-gated posture as the
  subject of the motion.
- Rejected: any vendored asset, screenshot, or code from an AGPL-3.0 repository; decorative motion;
  simulated live quotes presented as real; auto-advancing scene timers.
