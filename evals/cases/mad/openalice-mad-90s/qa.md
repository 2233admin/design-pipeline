# QA

## Technical (film check)

Storyboard, score, timeline, render, audio and composition gates pass. Render: 90.000 s,
1920x1080, 24 fps, audio present. All three planned hard cuts (30, 54, 66 s) are found; 25 cuts
are detected in all, and 92% of them land on one of the 136 audio onsets. Motion per section
follows the density plan: verse 6.8% of the frame changed per step, bridge 5.1%, chorus 21.4%,
final chorus 34.8%. Audio: -14.1 LUFS, LRA 6 LU, -2.1 dBTP, no clipped samples. Eleven warnings
are reviewed in case.json (two linear tickers and nine composition warnings).

Render counter-examples: `blackout-over-silhouette` is caught by `blank-frame` and
`panel-off-on-boundary` by `carry-cut`.

## Fixes made during production (each became a rule or a gate change)

1. The first attempt was a set of wallpaper-style stills cut to music; the user rejected it for
   not studying the genre. The film was rebuilt from seven measured MVs (`study-references-first`).
2. On a yellow field Alice's blonde hair disappeared; the field is red (`three-colour-rule`).
3. The generated art's canvas edge cut a straight line through her hair; the images fade out at
   the sides and bottom (`soft-edges-on-generated-art`).
4. The ghost lyrics showed in the black intro; they are hidden until the reveal.
5. The ALICE logo landed on the hook slam at 30 s; the chorus opens on the slam alone
   (`no-colliding-type`).
6. The bridge's black layer hid her silhouette: the transformed camera layer is its own stacking
   context, under the root-level black. The field itself turns black (`silhouette-on-its-own-layer`).
7. The master was flat (the verse louder than the chorus): loudnorm fell back to dynamic mode on
   the kicks. The arrangement was rebalanced and `audio master` now limits transients before a
   linear gain (`sections-keep-their-loudness`; behaviour change in this case's OpenSpec change).
8. The master's true peak read -0.1 dBTP after resampling; `audio master` now measures its output
   and tightens the limiter until the peak is under the ceiling.
9. HyperFrames' AAC encode overshot the ceiling: the render either failed or was attenuated by
   1.7 dB, and film check then reported the loudness off target. `audio master` keeps 1.5 dB of
   codec headroom (`master-with-codec-headroom`).
10. One review looked at a stale out.mp4 because a render had failed silently; renders are now
    checked by exit code and log before review.
11. `carry-cut` at 84 s: the field colour and the strobing panel both changed exactly on the
    continuation boundary. The colour now turns across it and the panel fades half a beat early
    (`no-swap-on-a-carry`).
12. `blank-frame` in the intro: the first second was black with a small ring. A pulsing disc and
    larger rings fill it.
13. The rings rotated off the frame's centre: `transformOrigin` and `svgOrigin` were both set; SVG
    groups use `svgOrigin` alone (`svg-origin`).

## Creative review (director, frames at 2 fps and key frames at 960 px)

- Genre fit: held hero, face changes on the beat, lyric clusters, tategaki strips, hero-word slams,
  tickers, ghost lyrics, a split screen with a beat panel, a silhouette bridge, a duplication grid,
  an outro ring and end card: each traced to a reference in reference.md.
- Continuity: Alice holds through verse and pre-chorus; hard cuts only at the chorus, the bridge
  and the final chorus, each on a flash or a black; the outro is carried by the centre Alice.
- Rhythm: sections of 4, 8, 8, 16, 8, 12 and 4 bars; density rises and falls with the song.
- Product: the lyrics carry OpenAlice's claims (research, every trade on record, waiting for the
  user's nod, 24/7), and the beat panel shows its own terminal, Inbox and portfolio.
- Flashes: full-frame flashes are at least a third of a second apart; the final-chorus strobe is
  confined to the centre panel.
- Sound: accents measured on the grid and section loudness measured on the master; not heard by
  the director.

## User acceptance

Accepted by the user on 2026-09-29, as sent, with no changes requested. The watched file was the
CRF 23 preview (`openalice-mad-90s-preview.mp4`, sha256
1b795d0f07fe0613f340685d2a54d82a0bb9faf5c2b958e843650c62ebef4566).
