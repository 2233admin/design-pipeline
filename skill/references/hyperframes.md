# HyperFrames Route

This is a project-owned summary of the official HyperFrames skill contract. It keeps the pipeline
route usable when the upstream skill tree is absent; the upstream source remains authoritative for
new workflow and runtime details.

- Source: https://github.com/heygen-com/hyperframes
- Reviewed release: `hyperframes@0.8.137` at revision `d09e003b17610177b71e340ec0bac95c9dde3e64`
- License: Apache-2.0
- Reviewed browser toolchain: Node.js 22.12+ (including Puppeteer's runtime requirement).

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
6. Product or website promotional film/animation: `product-launch-video`.
7. Other short unnarrated motion-first unit: `motion-graphics`.
8. PR explanation: `pr-to-video`.
9. Topic or article explainer: `faceless-explainer`.
10. Otherwise: `general-video`.

For product promotion, apply `references/product-film-direction.md` before choosing a template or
authoring a storyboard, including when the user asks only for an HTML preview. Its reference and
asset study plus sound direction precede film construction. This project-owned
creative contract complements the upstream runtime contract below. Technical checks and creative
review are separate outcomes; ordinary promotional wording is sufficient to activate both.

Optional [Cinetic/Product Film methods](film-methods.md) reuse this HTML route: explicit technique
recipes, actual product component/twin provenance and configurable motion primitives feed the
existing paused timeline. Their upstream Remotion/default-fps choices do not reroute HTML video.

Existing project state wins over fresh routing. An existing `BRIEF.md`, `hyperframes.json`, or
`STORYBOARD.md` resumes the recorded workflow. An explicit inspect, check, preview, render, publish,
or batch-render request performs only that operation. When the user requests a creative revision,
reassess the recorded storyboard against the product-film contract rather than preserving a failed
structure solely because it already exists.

## Composition contract

- HTML is the source of truth. Timing is declared in `data-*` attributes and media playback is
  owned by HyperFrames.
- A standalone root is directly in `<body>`; a sub-composition root is inside `<template>` and its
  host id, inner composition id, and timeline key must match exactly.
- The root carries a sized box, `data-start="0"`, dimensions, and `data-duration`.
- Register exactly one fully built `gsap.timeline({ paused: true })` at
  `window.__timelines[compositionId]`. The renderer seeks this timeline frame by frame. Async
  construction such as waiting for `document.fonts.ready` is supported; register only after the
  timeline build finishes.
- Keep IDs unique across the assembled page. Put full-screen fills on a full-bleed child, not the
  composition root.

## Determinism and motion

- No `Date.now`, `performance.now`, render-time clocks, unseeded randomness, network dependence,
  input-state dependence, or infinite repeats.
- Do not tween `display`, raw `visibility`, or layout properties such as `top`, `left`, `width`,
  and `height`; use seek-safe transform aliases and the framework's clip lifecycle. HyperFrames
  owns `.clip` visibility, so do not animate `autoAlpha` or `visibility` on the clip itself.
- Do not pair a CSS initial transform with a GSAP tween of the same property.
- Prefer GSAP for most choreography. Use another adapter only when the composition needs Lottie,
  Three.js, Anime.js, CSS keyframes, WAAPI, or TypeGPU, and preserve one render-loop owner.

## Production loop

Use the project-pinned CLI from the composition root. `film scaffold` writes a `package.json`
that pins `hyperframes` 0.8.137 and `gsap` 3.15.0 and loads GSAP from
`node_modules/gsap/dist/gsap.min.js`; run `npm install` once (network), then call the CLI with
`--no-install` so `npx` never fetches a newer release and lint, check and render run offline:

```bash
npm install
npx --no-install hyperframes lint
npx --no-install hyperframes check
npx --no-install hyperframes preview
npx --no-install hyperframes render --quality high --output out.mp4
ffprobe -v error -show_format out.mp4
```

`check` is the final gate for lint, runtime errors, layout, motion assertions, and contrast. For
sub-compositions, snapshot visible midpoints and inspect each mounted scene. Preview is review, not
approval; render only after approval, then verify that the output exists, is non-empty, and has a
plausible duration.

Keep the CLI version pinned for reproducibility. A latest-version upgrade probe may be run before a
render-affecting command, but a dependency bump is a separate, explicit change and must be followed
by `npx --no-install hyperframes check`.
