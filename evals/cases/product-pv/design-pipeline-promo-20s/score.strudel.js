// Product film at 120 BPM (one cycle = one 2 s bar). Intro 0-6 s, drop 6-14 s on the cut to the finding,
// breakdown 14-18 s for the pass and the model lanes, outro 18-20 s under the logo.
arrange(
  [3, stack(
    note("c2*8").s("square").lpf(sine.range(500, 1200).slow(3)).decay(0.07).sustain(0).gain(0.24),
    s("white*16").hpf(9000).decay(0.015).sustain(0).gain(0.06),
    note("<[~ ~ ~ e6] [c5 ~ ~ ~] [g5 ~ ~ ~]>").s("sine").decay(0.12).sustain(0).gain(0.22)
  )],
  [4, stack(
    note("<c1 ~ ~ ~>").s("sine").decay(1.2).sustain(0).gain(0.6),
    s("<white ~ ~ ~>").hpf(1500).decay(0.5).sustain(0).gain(0.16),
    note("c2*8").s("square").lpf(1700).decay(0.07).sustain(0).gain(0.26),
    note("<c3 a2 f2 g2>").add(12).s("sawtooth").struct("x ~ ~ x ~ ~ x ~").lpf(3000).decay(0.15).sustain(0).gain(0.17),
    note("c1").s("sine").struct("x ~ x ~").decay(0.25).sustain(0).gain(0.5),
    s("white*16").hpf(9000).decay(0.015).sustain(0).gain(0.09),
    note("<~ [~ ~ g5 ~] [g5 ~ a5 ~] [b5 ~ ~ ~]>").s("square").lpf(5000).decay(0.08).sustain(0).gain(0.16)
  )],
  [2, stack(
    note("<[c3,g3,e4] [a2,e3,c4]>").s("triangle").attack(0.01).decay(1.9).sustain(0.2).gain(0.3),
    note("<[c6,g6] ~>").s("sine").decay(0.8).sustain(0).gain(0.3),
    note("c2*4").s("square").lpf(700).decay(0.08).sustain(0).gain(0.2),
    note("<[~ ~ ~ [g5,d6]] ~>").s("sawtooth").lpf(6000).decay(0.2).sustain(0).gain(0.5)
  )],
  [1, stack(
    note("c1").s("sine").decay(1.0).sustain(0).gain(0.6),
    note("[c3,g3,e4,b4]").s("sawtooth").lpf(2400).attack(0.004).decay(1.9).sustain(0.2).gain(0.2),
    note("[c2,g2]").s("triangle").attack(0.01).decay(1.9).sustain(0.3).gain(0.28),
    s("white").hpf(2500).decay(0.12).sustain(0).gain(0.16)
  )]
)
