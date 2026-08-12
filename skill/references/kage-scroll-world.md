# Kage Clean-Room Scroll-World Case Study

This case study internalizes transferable design and engineering observations from
[`MengTo/kage`](https://github.com/MengTo/kage), reviewed at commit
`4399487d2fb42bce39c7b032fbbb50d230bf4f0b` on 2026-08-12. It complements the bundled
`web-design/build-threejs-scroll-worlds` playbook; it is not another runtime or template.

## Source Boundary

The Kage repository states that no license is granted for reuse or redistribution of its original
code or artwork. Do not copy its `index.html`, generated images, foreground cut-outs, fonts, or
other project assets into this package or a target product. Use the public page as attributed
reference evidence and reimplement only the generalized behavior described here.

The separately bundled `MengTo/skills` snapshot has its own MIT provenance. Keep those two sources
distinct: a file present in the MIT snapshot remains governed by that snapshot; later Kage-repository
changes do not inherit that license merely because the experiences are related.

## Route

1. Run `designer-pipeline mengto search --query "scroll-controlled Three.js world" --json`.
2. Read the returned `web-design/build-threejs-scroll-worlds/SKILL.md` and only the ledgers or QA
   references needed for the task.
3. Use this case study for the current Kage source boundary and its later responsive lessons.
4. Record Kage as attributed inspiration unless the user explicitly assigns it another reference
   role. A reference role does not grant permission to copy source or artwork.

## Transferable Architecture

- Keep one persistent WebGL world behind semantic DOM chapters. Scroll changes composition rather
  than replacing the renderer or scene at section seams.
- Derive an exact reversible chapter value from native document scroll. Use that exact value for
  navigation, foreground ownership, URLs, and accessibility state; damp a separate value only for
  camera and visual interpolation.
- Author camera position, target, and FOV per chapter at desktop and tall mobile sizes before
  smoothing the path. Each stop must reveal a different spatial relationship, not merely new copy.
- Treat generated stills and transparent cut-outs as optional editorial depth layers. They support
  the live world but do not replace semantic content or become generic cards.
- Compose geometry, light, fog, material response, and DOM contrast before bloom, grain, vignette,
  blur, or other cinematic finish.
- Preserve native scrolling, a complete reduced-motion reading path, a designed WebGL fallback,
  keyboard-reachable navigation, and a reachable footer.

## Responsive Lessons From The Current Kage Revision

- Use the layout viewport as one source of truth. Renderer buffer and CSS size, camera aspect,
  pointer normalization, scroll-anchor measurement, fixed UI width, and visibility tests must all
  use the same measured width and height. On mobile, prefer `document.documentElement.clientWidth`
  and `clientHeight` over assuming `innerWidth` and `innerHeight` describe CSS layout.
- Audit containing blocks around fixed descendants. A transform or `backdrop-filter` on a fixed
  navigation parent can make a viewport menu resolve against the bar instead of the screen. Put the
  visual wash on a separate pseudo-element and remove hide transforms while the menu is open.
- Clip intentional horizontal overhang at the owning viewport-wide section with `overflow-x: clip`.
  Do not hide vertical bleed or turn decorative layers into accidental scroll containers.
- Retest selector specificity at every breakpoint. A layout-variant selector can outrank the plain
  mobile rule and silently preserve desktop columns.
- Choose camera and wordmark compensation from aspect ratio when the failure is caused by a tall
  frame. Width-only phone tests miss portrait tablets.

## Minimum Evidence

- Inspect representative chapter endpoints at 1440 x 900, 768 x 1024, and 390 x 844.
- Prove `scrollWidth` does not exceed the layout viewport at each size.
- Open and close mobile navigation while the page is at the top, stuck, hidden-on-scroll, and deep
  linked; the sheet must cover the viewport and the trigger must remain reachable.
- Exercise slow, fast, reverse, anchor, reload-at-depth, and resize-between-chapters paths.
- Verify reduced motion, forced WebGL failure, failed assets, clean console, hidden-tab pause,
  teardown, and measured frame/load budgets.

