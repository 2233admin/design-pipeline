// UI promo at 120 BPM (one cycle = one 2 s bar). Keys and a pad under the typing (0-2 s), a building
// pulse under the research with a tick on the +9.1% (2-8 s), the drop on the cut to the Inbox with a
// hit on the cut to the portfolio (8-12 s), and a chord on the logo (12.5 s). Rendered for 15 s.
arrange(
  [1, stack(
    note("[c5 ~ e5 ~]*2").s("sine").decay(0.05).sustain(0).gain(0.12),
    note("[c3,g3,d4]").s("triangle").attack(0.3).decay(1.8).sustain(0.3).gain(0.18)
  )],
  [3, stack(
    note("c2*8").s("square").lpf(sine.range(500, 1500).slow(3)).decay(0.07).sustain(0).gain(0.24),
    s("white*16").hpf(9000).decay(0.015).sustain(0).gain(0.06),
    note("<[c3,g3,d4] [a2,e3,c4] [f2,c3,a3]>").s("triangle").attack(0.1).decay(1.9).sustain(0.2).gain(0.16),
    note("<~ ~ [~ [e6,b6] ~ ~]>").s("square").lpf(6000).decay(0.12).sustain(0).gain(0.35)
  )],
  [2, stack(
    note("<c1 ~>").s("sine").decay(1.2).sustain(0).gain(0.6),
    s("<white ~>").hpf(1500).decay(0.5).sustain(0).gain(0.16),
    note("c2*8").s("square").lpf(1800).decay(0.07).sustain(0).gain(0.26),
    note("<c3 a2>").add(12).s("sawtooth").struct("x ~ ~ x ~ ~ x ~").lpf(3000).decay(0.15).sustain(0).gain(0.17),
    note("c1").s("sine").struct("x ~ x ~").decay(0.25).sustain(0).gain(0.5),
    s("white*16").hpf(9000).decay(0.015).sustain(0).gain(0.09),
    note("<~ [~ ~ [g5,d6] ~]>").s("sawtooth").lpf(6000).decay(0.2).sustain(0).gain(0.45)
  )],
  [2, stack(
    note("[~ [c3,g3,e4,b4]@3]").s("sawtooth").lpf(2400).attack(0.004).decay(1.9).sustain(0.2).gain(0.2),
    note("[~ [c2,g2]@3]").s("triangle").attack(0.01).decay(1.9).sustain(0.3).gain(0.28),
    note("[~ c1@3]").s("sine").decay(1.0).sustain(0).gain(0.5)
  )]
)
