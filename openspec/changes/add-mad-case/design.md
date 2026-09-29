# Design

## Reference first

The user's objection to the first attempt was that it copied nothing. The rebuild started with a
research pass: seven official MVs, sampled every 2 s in headless Chromium, with visual events
counted per bar. The film's section densities, devices and palette come from those measurements
(`reference.md` in the case). The rule `study-references-first` is a review rule; no gate can yet
check that a reference was studied.

## Character art

`generate.cjs` calls ChatGPT image generation through the Codex CLI's JS entry (on Windows the npm
shim needs a shell, which split the prompt). The hero is drawn from OpenAlice's pixel mascot and a
first full-body cut-out; the six variants (blink, sing, wink, serious, point, face) are edits of
the hero, so the character stays one drawing when her face changes. `generated.json` records each
prompt, its references, the tool version and the file's sha256.

## Composition

- The frame is a stack: a kick-shake layer holds the field, ghost lyrics, halftone, grid and the
  camera; the camera holds Alice's face variants, the pointing shot and the silhouette. The black
  used in the bridge is the field itself, because the transformed camera layer forms its own
  stacking context and a root-level black layer hid the silhouette.
- Every hit is placed with `T(bar, beat)` on the score's exact grid (160 BPM, 1.5 s bars).
- Generated art fades out at its sides and bottom with a mask, so the canvas edge never shows.
- The rings rotate about `svgOrigin` only; also setting `transformOrigin` moved them off centre.

## Mastering

The limiter is `alimiter` with a 2 ms attack, 60 ms release, lookahead latency compensation and no
make-up gain, placed before a linear loudnorm. Its threshold starts at the shortfall between the
needed gain and the ceiling (plus 0.2 dB, 0.3 dB of margin under the ceiling). After each render
the output's true peak is measured with the audio gate's meter; if it is still over, the limiter
tightens by the excess plus 0.2 dB. `limit: false` keeps the old behaviour for comparison, and a
unit test shows that a peaky mix now keeps its quiet and loud sections apart.
