# HyperFrames Route

This is a project-owned summary of the official HyperFrames skill contract. It keeps the pipeline
route usable when the upstream skill tree is absent; the upstream source remains authoritative for
new workflow and runtime details.

- Source: https://github.com/heygen-com/hyperframes
- Reviewed revision: `0e4da52c8222b8d18a1211b34f2fb3bd0f7e79ee`
- License: Apache-2.0

## Select the route

Use HyperFrames for HTML-based video, reels, motion graphics, title cards, explainers, captions,
overlays, slideshows, voiceovers, or a Remotion port. Match the deliverable, not a passing mention
of motion or animation. Ordinary UI motion stays on the project's normal motion route.

For a fresh video request, route once:

1. Existing Remotion source: `remotion-to-hyperframes`.
2. Presentation or navigable deck: `slideshow`.
3. Captions on unchanged footage: `embedded-captions`.
4. Designed overlays on unchanged footage: `talking-head-recut`.
5. Beat-driven music video: `music-to-video`.
6. Short unnarrated motion-first unit: `motion-graphics`.
7. PR explanation: `pr-to-video`.
8. Product or website showcase: `product-launch-video`.
9. Topic or article explainer: `faceless-explainer`.
10. Otherwise: `general-video`.

Existing project state wins over fresh routing. An existing `BRIEF.md`, `hyperframes.json`, or
`STORYBOARD.md` resumes the recorded workflow. An explicit inspect, check, preview, render, publish,
or batch-render request performs only that operation.

## Composition contract

- HTML is the source of truth. Timing is declared in `data-*` attributes and media playback is
  owned by HyperFrames.
- A standalone root is directly in `<body>`; a sub-composition root is inside `<template>` and its
  host id, inner composition id, and timeline key must match exactly.
- The root carries a sized box, `data-start="0"`, dimensions, and `data-duration`.
- Register exactly one synchronous `gsap.timeline({ paused: true })` at
  `window.__timelines[compositionId]`. The renderer seeks this timeline frame by frame.
- Keep IDs unique across the assembled page. Put full-screen fills on a full-bleed child, not the
  composition root.

## Determinism and motion

- No `Date.now`, `performance.now`, render-time clocks, unseeded randomness, network dependence,
  input-state dependence, or infinite repeats.
- Do not tween `display`, raw `visibility`, or layout properties such as `top`, `left`, `width`,
  and `height`; use seek-safe transform aliases and the framework's clip lifecycle.
- Do not pair a CSS initial transform with a GSAP tween of the same property.
- Prefer GSAP for most choreography. Use another adapter only when the composition needs Lottie,
  Three.js, Anime.js, CSS keyframes, WAAPI, or TypeGPU, and preserve one render-loop owner.

## Production loop

Use the project-pinned CLI from the composition root:

```bash
npx hyperframes lint
npx hyperframes check
npx hyperframes preview
npx hyperframes render --quality high --output out.mp4
ffprobe -v error -show_format out.mp4
```

`check` is the final gate for lint, runtime errors, layout, motion assertions, and contrast. For
sub-compositions, snapshot visible midpoints and inspect each mounted scene. Preview is review, not
approval; render only after approval, then verify that the output exists, is non-empty, and has a
plausible duration.

Keep the CLI version pinned for reproducibility. A latest-version upgrade probe may be run before a
render-affecting command, but a dependency bump is a separate, explicit change and must be followed
by `npx hyperframes check`.
