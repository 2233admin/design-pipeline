# Story: the shape, the beat plan and the checkpoint

Build the story from the interview's answers. Each part below is optional unless the brief needs it; ingredients.md says how to make each one good.

## A shape that works (30 to 60 s)

1. **Opening (1 to 2 bars).** The brand element comes alive: the logo draws, the wordmark lands, the mascot wakes, or the hero screen is already moving. Something moves in the first second.
2. **Who and what (1 bar).** A punchline or a caption. "Meet X." or the one-line promise.
3. **Features (3 to 6).** For each, an optional one-line punchline that frames it, then a 2 to 4 bar scene of the product's real UI moving. Consecutive scenes connect with the chosen transition.
4. **The strong moment on the song's drop.** The automation turning on, the result appearing, the before and after.
5. **Proof (optional).** The outcome as the viewer knows it: a search result, an AI answer, a metric, a quote. Each gets its own scene.
6. **Ending.** The product's own tagline, a call to action or URL if chosen, the logo lockup.
7. **Loop (if it loops).** Fold back into the first frame's state.

Keep each scene to one idea. Cut anything that needs explaining.

## Words

- Write from the product's approved lines and its copy rules (casing, dashes, reading level, banned words).
- Punchlines: at most 6 words. Captions: one short line. Scenes: only the UI's own text.
- Brand and partner names come with their logos.
- Never promise an outcome the product cannot guarantee.

## The beat plan (`cues.ts`)

- Measure the song first (music.md). Plan in bars and beats; at 150 BPM a beat is 0.4 s and a bar 1.6 s. For a silent film, pick a tempo anyway (120 BPM) and plan on it.
- Every moment is `b(bar, beat, fraction)` on the grid. Scene code never holds a literal frame number.
- Rough budget: opening 1 to 2 bars, punchline 1 to 1.5, feature scene 2 to 4, proof 1.5 to 2.5, ending 2.
- Something happens on every beat: clicks, words, counters on eighths or sixteenths, pings. If a scene idles for a bar, give it beat-synced life or cut the bar.
- Generate a beat sheet table from `cues.ts` (a small script) and keep it current. It is the doc the product owner reads.

## Checkpoint before building everything

Show the user:
- the beat sheet
- 3 style frames: the opening, one feature scene, the strongest moment (or a punchline)
- a pose sheet, if a logo or mascot animates

People react fastest to pictures. Expect notes on pacing, words, shades and borders, and fold every note into BRAND.md or the prompt.
