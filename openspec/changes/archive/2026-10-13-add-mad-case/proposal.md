# Add the MAD golden case

## Why

This is the third round of step 6 of `redesign-user-workflow`, after the product PV, logo sting,
UI promo and explainer cases. On 2026-09-29 the user asked for a MAD of Alice, OpenAlice's
mascot, and made these choices:

- The feel is a Miku-style Vocaloid MV. The first attempt (generated key-visual stills cut to
  music) was rejected as "a good wallpaper, not a MAD": it was designed without studying real
  works of the genre.
- Material: OpenAlice's interface and its character; new character art may be drawn with ChatGPT
  image generation.
- 90 s, Japanese lyrics written for the film, synth-only music from Strudel, no vocals.
- A Live2D Alice is still being built; trying to build one is a later task.

## What changes

- `mad/openalice-mad-90s` is built from seven official Vocaloid MVs that were sampled and
  measured first (Vampire, KING, Hibana, God-ish, Rabbit Hole, Mesmerizer, Telepathy). Alice is a
  held illustration whose face changes on the beat, with lyric clusters, tategaki strips,
  hero-word slams, tickers, ghost lyrics, a split screen with OpenAlice's interface in the beat
  panel, a silhouette bridge, a chibi duplication grid and an outro text ring. The case has 17
  rules, 7 counter-examples (2 rendered) and 8 reviewed warnings.
- The case contract gains an optional `golden.generated` for art made by an image model. It records
  the generation script, the tool and the generated files. Image generation is not reproducible,
  so `verify.cjs --render` never runs the script itself; it stops with an instruction when files
  are missing. Generated files are git-ignored, and a test asserts that none are tracked.
- `audio master` changes in two ways, both found on this case:
  - It masters 1.5 dB under the target's true-peak ceiling. HyperFrames' AAC encode of a
    -1.4 dBTP master peaked at +0.2 dBFS; the renderer then attenuated the film by 1.7 dB, below
    the loudness target, or refused to render.
  - When the gain to the target would push a peaky mix over the ceiling, a lookahead limiter
    shaves the transients first (at most 10 dB, reported as `limiterDb`). Without it loudnorm fell
    back to dynamic mode and the verse, chorus and bridge came out at the same loudness. Each
    attempt is measured with the audio gate's meter, and the limiter tightens (up to three more
    passes) until the true peak is under the ceiling.

Not in scope:

- A Live2D Alice (a later task the user wants to try).
- Committing the generated art; it stays local until the user decides.
- Step 7.
