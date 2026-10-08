# Ingredients: how to make each one good

Use only what the interview chose. Each note below is a default that held up in real reviews; the product's own rules win.

## Opening

- Something moves in the first second. Cut slow music intros.
- **Logo:** it draws itself (`stroke-dashoffset` on its paths), then fills (a fade, a wipe, or the product's texture). A wordmark can land letter by letter or word by word on the beat.
- **Mascot or character** (only if the product has one and the user chose it): animate it the way the product already does, in its poses and its personality. Ask if unsure.
- **Product UI:** open on the hero screen already moving (a list filling, a count ticking, a chart drawing).

## Punchlines (big words between scenes)

- Nothing else on screen but the words (and the brand element, if one was chosen).
- At most 6 words, 2 lines at most. One word or word group per beat, eighth notes at the fastest.
- Each word blurs in from about 16 px, rises about 36 px and lands in 0.3 s on `cubic-bezier(0.22, 1, 0.36, 1)`. Exit is a quick blur.
- Every word keeps its slot before it lands (`templates/kit/punchlines.tsx`), so lines never re-center.
- Key words in the accent color. A brand or partner name brings its logo, inline.
- Size: 120 to 160 px at 1080p. Shrink a long card rather than wrapping to 3 lines.
- Over a texture, thin the texture in a band behind the words. Never add a panel.
- Write them from the product's approved lines and plain words. They carry the story, so scenes need no captions.

## Captions (instead of punchlines)

- One short line in a fixed band that never overlaps the UI. It sits above everything and blur-swaps between lines.
- A line holds at least 4 beats. Swap on a calm beat.

## Scenes

- Show, don't tell. The only text is the product's own UI text.
- Readable at 1080p: body 24 px and up, titles 34 px and up.
- Real components where they are pure; frame-driven twins where they run a clock (engine.md).
- Demo data from the landing page, so the film and the site agree.
- One idea per scene. If it needs a legend, cut it down.

## Transitions

**Magic moves.** One element that exists in both scenes travels there (position, size, color); the rest blur-swaps. Pick the shared element, or make one:

| From | To |
|---|---|
| Avatars in a diagram | Rows in a list |
| Cells in a list | Cells of a chart or icon |
| A clicked row's image and title | The detail view's header |
| A button | The active half of a toggle |
| A page or post title | A search result's title |
| Logos in a proof scene | Slots in the closing headline |

Rules for magic moves:
- The traveler and its destination share a line-height ratio, so the move only scales.
- Measure both ends with `--debug` stills.
- Travel on a spring (stiffness about 150, damping about 20).
- Text never flies across text: move images and marks, blur words out and back in.

**Camera moves.** Lay the scenes out on one big world canvas. Camera keys go on a heavy spring, with push-ins on key moments. Zoom in log space. Never `will-change` on the world layer.

**Cuts on the beat.** Hard cuts exactly on a beat or bar. Match the background and the accent across the cut.

## Cursors

- **The user's cursor:** the OS arrow. It glides on a slight arc and arrives exactly on the cue. A click is a short squash, then the target reacts (press, count, color).
- **The product's own cursor** (if the product automates actions): its real overlay look. The user's cursor sets things up and approves; the product's does the work.
- Never cover words being typed: click fields on their far side, rest just under the next button.

## Partner and integration logos

- Every partner name shows its logo inline, at about 0.82 of the text size. Use the product's brand icon set if it has one.
- In a closing headline, logos can fly in from the proof scenes and land as their words do.

## Proof moments

- A search result, an AI answer, a dashboard number, a quote. Each is its own scene: lo-fi but faithful, on the product's background, big enough to read.
- If punchlines were chosen, one follows each proof and names the outcome in a few words.
- Only true outcomes and the product's own demo numbers; no guarantees.

## Brand texture

- Only if the product has one (a pattern, a dither, a gradient, a grain). Paint it per frame in screen space.
- Calm behind UI (sparse, dim, slow), thinned behind words, never a panel.

## App surfaces

- **Desktop app:** window chrome (traffic lights), inner dividers for the top bar and sidebar, a dock, the product's card color as a slightly lifted surface.
- **Mobile app:** a device frame, the status bar, real gestures (taps, swipes, sheets).
- **Browser:** a toolbar with back, forward, reload and an address field. No extra labels.

## Ending and loop

- The tagline word by word, with logos flying into their slots, then the call to action or URL if one was chosen.
- For a loop, fold back to the first frame's state (the logo un-draws, the UI resets). Verify that the last frame equals frame 0.

## One brand element across the film (optional)

- If a logo mark or mascot carries the film, keep one instance for continuity.
- Give it a `placement(t)` with named spots and arcing leaps between them. It bridges scenes across punchlines, and elements can fly into or out of it.
- If it has cut-outs (eyes, holes), put a background-colored shape behind them wherever lines or UI pass behind.
- It stays on brand: never sad or hurt unless the brand does that.
