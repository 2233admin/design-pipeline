// canvas-instrument-24s: twelve bars at 120 BPM (cps 0.5, one bar is one cycle of 2 s), 24 s.
// Plain Strudel, built-in synth and noise sounds only. Sections, in bars (song map: sound.md):
//   1 intro   pad
//   2-5 groove   pad, kick (sine c1), clap (white, gain 0.25), hats (white*8, gain 0.12)
//   6-7 build   pad, snare roll (pink noise, 8ths then 16ths, last beat silent), rising square pulse
//   8-10 drop   pad, kick, clap, hats, bass (sawtooth c2 region, short steps)
//   11 break   bass swell (triangle c2, two pulses, then two silent beats), drums out
//   12 outro   one square stab
// Render with: designer-pipeline film score --bpm 120 (the file is one expression).
arrange(
  [1, note("<c3 a2 f2 g2>").s("sawtooth").lpf(1200).gain(0.35)],
  [4, stack(
    note("<c3 a2 f2 g2>").s("sawtooth").lpf(1800).gain(0.35),
    note("c1").s("sine").struct("x ~ x ~ x ~ x ~").decay(0.25).gain(0.7),
    s("white").struct("~ x ~ x").hpf(2500).decay(0.08).gain(0.25),
    s("white*8").hpf(8000).decay(0.03).gain(0.12)
  )],
  [1, stack(
    note("<c3 a2 f2 g2>").s("sawtooth").lpf(2200).gain(0.35),
    s("pink*8").hpf(2500).decay(0.08).gain(0.2),
    note("c4*4").s("square").decay(0.15).gain("0.12 0.16 0.2 0.24")
  )],
  [1, stack(
    note("<c3 a2 f2 g2>").s("sawtooth").lpf(2800).gain(0.35),
    s("pink*16").struct("x x x x x x x x x x x x ~ ~ ~ ~").hpf(2500).decay(0.05).gain(0.2),
    note("c4*4").s("square").decay(0.15).gain("0.28 0.32 0.36 ~")
  )],
  [3, stack(
    note("<c3 a2 f2 g2>").s("sawtooth").lpf(2200).gain(0.35),
    note("c1").s("sine").struct("x ~ x ~ x ~ x ~").decay(0.25).gain(0.7),
    s("white").struct("~ x ~ x").hpf(2500).decay(0.08).gain(0.25),
    s("white*8").hpf(8000).decay(0.03).gain(0.12),
    note("<c2 a1 f1 g1>").s("sawtooth").struct("x ~ x x ~ x ~ x").lpf(600).decay(0.12).gain(0.45)
  )],
  [1, note("c2*4").s("triangle").decay(0.4).gain("0.35 0.55 ~ ~")],
  [1, note("c4").s("square").decay(1.4).gain(0.3)]
)
