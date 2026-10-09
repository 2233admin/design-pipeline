# Engine: the Remotion kit and how scenes are built

## Workspace

- **Where it lives.** Put the films in a `videos/` folder (its own workspace in a monorepo, or its own package) so they can import the product's components.
- **Versions.** Pin `remotion` and every `@remotion/*` to one exact version. Add `react` at the app's version. For fonts, use `@remotion/fonts` or local files copied into `public/fonts`.
- **Tailwind.**
  - If the product uses Tailwind v4, use `@remotion/tailwind-v4` (`enableTailwind`) and never declare `tailwindcss` yourself (it bundles its own; a loose range can re-resolve the whole monorepo).
  - In the video's CSS, `@import` the product's global CSS and `@source` every folder you import components from.
  - Dark mode is usually `className="dark"` on the composition root.
- **Webpack override.** Keep it in one file (`webpack-override.ts`) used by both `remotion.config.ts` and your scripts:
  - `enableTailwind`, if Tailwind
  - `resolve.alias` for the app's path aliases (for example `"@": path.resolve(process.cwd(), "../apps/web/src")`)
  - Use `process.cwd()`, not `import.meta.dirname`: the CLI loads the config as CommonJS.
- **Composition.** One `Composition` per film. `fps` comes from props through `calculateMetadata`: 60 in Studio and for stills, 240 for the final render (motion blur, see render.md). `durationInFrames = round(DURATION * fps)`.
- **Generated artifacts.** Keep `out/`, fonts copied from `node_modules` and licensed music out of git.

## The kit (copy `templates/kit/` into `videos/src/kit/`)

| File | What it gives |
|---|---|
| `time.ts` | `useTime()` (seconds), the beat grid `at(grid, bar, beat, fraction)`, `progress`, `clamp01` |
| `spring.ts` | `step(t, config)`: a closed-form spring step (0 to 1). `track(t, keys, config)`: a value that retargets, as a sum of one step per key |
| `move.ts` | `move(t, start, fromRect, toRect)` for magic moves, `swapIn` (blur swap in and out), `Rect` |
| `camera.ts` | Camera keys `[t, x, y, zoom]` on springs (zoom in log space), `project`, `worldTransform` |
| `cursor.tsx` | `cursorAt(t, keys, toScreen)`: curved glides that arrive exactly at `t`, click squash. `UserCursor` (macOS arrow). Add the product's own cursor next to it |
| `cursor-path.ts` | A smooth free-form path through timed stops (Hermite), plus sampled look-at keys, for when something on screen follows the cursor |
| `punchlines.tsx` | Word-by-word punchline cards with kept slots, accent words and inline logos (if punchlines were chosen) |
| `dither.ts` | The 4x4 Bayer matrix, `bayerPath` (a reveal front as an SVG path) and `bayerReveal` (a mask style) |
| `debug.tsx` | `TargetLog`: prints every `[data-target]` box into the frame (stills do not forward console logs) |

Add per product: `tokens.ts` (the product's colors, fonts, springs, all as hex), a rig for the logo or mascot if one animates, and twins of their components (a card, a search result, an AI answer...).

## Rules for scene code

- Read time once: `const t = useTime()`. Everything is a function of `t` and the cues. No hooks with state, no effects that change what is drawn. A `useLayoutEffect` that paints a canvas from `t` is fine.
- Timeline in `cues.ts` with `b(bar, beat, fraction)`. Layout in `layout.ts`, with measured numbers commented as measured.
- Each act returns `null` outside its window. Enter and leave with `swapIn` or a traveler.
- **Layers, bottom to top:**
  1. world scenes under the camera
  2. screen-space textures (a flood, a wallpaper)
  3. world scenes that must sit above the texture (an app window)
  4. the brand element (logo or mascot), if it moves across scenes
  5. the product's cursor
  6. punchlines and text
  7. the user's cursor
- Hex colors for anything that animates (`interpolateColors` cannot parse `color-mix()`).
- Use the individual transform properties (`translate`, `scale`, `rotate`). Never `will-change` on anything the camera scales, or text blurs.
- **Magic moves.** Travelers render in the destination's style and scale from the source size (`scale: s / destSize`, `transformOrigin: 0 0`).
  - Left-aligned destinations only; to go from a centered source, blend `translate: -50%` out as the move lands.
  - Keep the source hidden from the start of the move, and the destination hidden until it lands, or let the traveler stay as the element.

## Frame-driven twins

Re-create a component when it:
- runs its own clock: motion or animation libraries, `requestAnimationFrame`, `setInterval` (a spinner), CSS keyframes, video, shaders
- loads images asynchronously (Radix or base-ui `Avatar`: a frame may catch it empty; use Remotion `<Img>`, which the renderer waits for)

Copy the structure, class names and tokens; change only the clock. Write in the file which component it twins and why.

## An animated logo or mascot (only if chosen)

- **One component, driven by `t`:** `<Mark t script size appearance="filled|outline" draw={0..1} />`.
- **`script` holds keyed tracks,** each a sum of springs over time-sorted keys: states `[t, name]`, look `[t, x, y]`, turns `[t, yaw, pitch, roll]`, hops `[t, height]`.
- **Drawing on:** an outline with `stroke-dasharray` and a `stroke-dashoffset` driven by `draw`, then a fill reveal (fade, wipe, or `bayerPath` for a dithered rise).
- **One instance across the film:** give it a `placement(t)` with named spots and arcing leaps between them.
- **Cut-outs:** if it has cut-outs, put a background-colored shape behind them wherever lines or UI pass behind.

## Textures (dither)

- Paint per frame on a canvas at cell resolution with `imageRendering: pixelated`, in screen space, with integer cells.
- If the product has its own texture code (a speed field, a pattern), import its pure painter and feed it `floor(t / step)`.
- A density function per cell gives flood, thin band and calm wallpaper states from one painter.

## Measuring (never guess positions)

- Put `data-target="name"` on anything a cursor clicks or a traveler lands on.
- Render with `debug: true`: `bun scripts/stills.ts out/review/debug <frames> --debug`, then read the box numbers printed in the frame.
- Re-measure after any layout change upstream of a target (a removed line moves everything under it).
