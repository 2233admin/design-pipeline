---
name: product-film
description: Make a showreel-grade product film (landing-page loop, launch video, promo, demo reel, social cut) in code with Remotion, built on the product's own design system, components and voice. Use when someone asks for a product video, landing video, promo, launch film, explainer or "motion design video" for their app, SaaS or codebase. It asks what to include, then covers design discovery, story, music sync, transitions, review loops and a verified final render.
---

# Product film

A film that looks like the product made it: its colors, type, components, logo and voice, cut to music. Built in Remotion inside (or beside) the product's codebase, so it reuses real components and stays editable.

## Non-negotiables

- **Their design wins.** Every rule comes from the product: its tokens, components, rules files, landing page and copy. Never carry another product's taste in, including anything in this skill that their design contradicts.
- **Ask, don't assume.** What the film shows and how it is made are the user's call. Interview them before writing the story ([reference/interview.md](reference/interview.md)). Offer options drawn from what you found in their code, never generic ones.
- **Every frame is a pure function of time.** No CSS transitions or keyframes, no timers, no `Date.now()`, no state carried between frames. A component that runs its own clock gets a frame-driven twin.
- **Measure, never guess.** Beats come from the audio, positions from the DOM (debug overlay), colors from decoded pixels of the final files.
- **Honest claims.** Show only what the product really does. Find its claims rules and approved lines before writing a word.
- **Ask first** before committing, pushing or publishing. Keep every rendered version (`out/<film>/v1`, `v2`, ...).

## Workflow

1. **Quick discovery.** Just enough to ask good questions: rules files, tokens, components, the logo (and any mascot or animated mark), the landing page, the main features. See [reference/discovery.md](reference/discovery.md).
2. **Interview.** Two rounds of AskUserQuestion: the brief, then the ingredients. A third round only if needed. See [reference/interview.md](reference/interview.md).
3. **Brand kit → `videos/BRAND.md`.** Finish discovery on what they chose and fill [templates/BRAND.md](templates/BRAND.md).
4. **Story → `videos/<film>-prompt.md`.** Read [reference/story.md](reference/story.md) and [reference/ingredients.md](reference/ingredients.md), then fill [templates/film-prompt.md](templates/film-prompt.md). Checkpoint with the user: beat sheet and 3 style frames.
5. **Music.** Skip if the film is silent. See [reference/music.md](reference/music.md): `scripts/beats.py`, the per-bar stem map, `scripts/audio-edit.py`, SFX on measured peaks.
6. **Engine and scenes.** Read [reference/engine.md](reference/engine.md).
   - Copy [templates/kit/](templates/kit/) into `videos/src/kit/`.
   - One folder per film: `cues.ts` (the beat sheet as data), `layout.ts`, `acts/`, the composition.
7. **Review loop.** See [reference/review.md](reference/review.md).
   - Stills at every handoff (`scripts/stills.ts`, `--debug` to measure).
   - Contact and handoff sheets, then a half-res draft.
   - Fix, repeat, and show the user frames as you go.
8. **Final render, verify, deliver.** See [reference/render.md](reference/render.md): `scripts/render.ts`, then `scripts/verify.py`, then send the files.

## Quality floor (always, whatever the ingredients)

- **Only the product's own surfaces, colors, borders and shades.** Never invent card backgrounds, outlines or tints it does not use.
- **Readable at the delivery size.** Fewer words beat smaller words. Cut labels that restate the picture.
- **Text is never covered** by a cursor, a chip or a texture. It never crosses other text in a move. A line never re-centers while it builds: keep every word's slot.
- **Loading states keep their width.** Use the product's own loading pattern.
- **Something happens on every beat.** A bar where nothing moves reads as slow.
- **Scene boundaries land on bars.** A loop's last frame equals its first. A landing loop must read muted.
- **No effects the product's language does not use:** glows, particles, click rings, bouncy easing, shaders.

## Traps that cost real time

- Remotion stills do not forward console logs. Print measurements into the frame (`templates/kit/debug.tsx`).
- `npx remotion still` re-bundles on every call. Use `scripts/stills.ts`: bundle once, render many frames.
- Remotion's bundled ffmpeg has no `tmix`, `select` or `tile`. Use a full ffmpeg (`uv run --with imageio-ffmpeg`).
- **Color range:** the Remotion master is limited range, BT.601, untagged. Blending it as full range lifts `#0a0a0a` to `#171717`, a gray box on a dark page. Decode frame 0 of every deliverable and check the numbers.
- `interpolateColors` cannot parse `color-mix()`. Any color that animates is a hex token.
- Async image components (Radix or base-ui avatars) can render empty in a frame. Twin them with Remotion `<Img>`.
- Springs that retarget: sum one closed-form step per key, with keys sorted by time.
- CSS dashed borders crawl while a box resizes. Draw dashes as SVG strokes at a fixed pitch.
- WebGL or shader effects on their own clock paint a different picture each run. Prefer textures painted per frame.
- In a monorepo:
  - pin every `remotion` and `@remotion/*` to one exact version
  - never let the video workspace re-resolve the app's Tailwind
  - alias the app's path imports in the webpack override
- Stop only the processes you started; other sessions may be waiting on the machine.
