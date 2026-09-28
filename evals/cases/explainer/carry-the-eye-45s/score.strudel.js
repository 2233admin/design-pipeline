// Explainer at 96 BPM (one cycle = one 2.5 s bar). A flat pad under the slideshow with dull ticks on
// the gaze jumps (0-7.5 s); a pulse as the rule is named (7.5-10 s); a steady pulse and rising blips
// on each carry (10-25 s); a hit on the match cut (25 s); the full arrangement under the payoff
// (27.5-37.5 s); a thinner bed under the rule (37.5-42.5 s); a chord on the lockup (42.5 s).
arrange(
  [3, stack(
    note("<[c3,g3,e4] [c3,g3,e4] [a2,e3,c4]>").s("triangle").attack(0.4).decay(2.4).sustain(0.4).gain(0.2),
    note("<~ ~ [c3 ~ c3 ~]>").s("square").lpf(700).decay(0.06).sustain(0).gain(0.35)
  )],
  [1, stack(
    note("[f2,c3,a3]").s("triangle").attack(0.05).decay(2.4).sustain(0.3).gain(0.2),
    note("c2*4").s("square").lpf(800).decay(0.08).sustain(0).gain(0.22)
  )],
  [6, stack(
    note("c2*8").s("square").lpf(sine.range(700, 1500).slow(6)).decay(0.07).sustain(0).gain(0.22),
    note("<[c3,g3,e4] [a2,e3,c4] [f2,c3,a3] [g2,d3,b3] [c3,g3,e4] [a2,e3,c4]>").s("triangle").attack(0.1).decay(2.4).sustain(0.25).gain(0.16),
    note("<[c5 g5] ~ [e5 b5] ~ [g5 d6] ~>").s("sine").decay(0.18).sustain(0).gain(0.3),
    s("white*16").hpf(9000).decay(0.012).sustain(0).gain(0.05)
  )],
  [1, stack(
    note("c1").s("sine").decay(1.4).sustain(0).gain(0.65),
    s("white").hpf(1800).decay(0.45).sustain(0).gain(0.18),
    note("[c3,g3,e4,b4]").s("sawtooth").lpf(2200).attack(0.004).decay(2.2).sustain(0.15).gain(0.16)
  )],
  [4, stack(
    note("c2*8").s("square").lpf(1800).decay(0.07).sustain(0).gain(0.24),
    note("<c3 a2 f2 g2>").add(12).s("sawtooth").struct("x ~ ~ x ~ ~ x ~").lpf(3000).decay(0.15).sustain(0).gain(0.16),
    note("<c1 a0 f0 g0>").s("sine").struct("x ~ x ~").decay(0.3).sustain(0).gain(0.5),
    note("<[c3,g3,e4] [a2,e3,c4] [f2,c3,a3] [g2,d3,b3]>").s("triangle").attack(0.05).decay(2.4).sustain(0.25).gain(0.16),
    s("white*16").hpf(9000).decay(0.012).sustain(0).gain(0.08)
  )],
  [2, stack(
    note("<[c3,g3,e4] [f2,c3,a3]>").s("triangle").attack(0.2).decay(2.4).sustain(0.35).gain(0.2),
    note("c2*4").s("square").lpf(700).decay(0.08).sustain(0).gain(0.18)
  )],
  [1, stack(
    note("[c3,g3,e4,b4]").s("sawtooth").lpf(2400).attack(0.004).decay(2.4).sustain(0.2).gain(0.2),
    note("[c2,g2]").s("triangle").attack(0.01).decay(2.4).sustain(0.3).gain(0.28),
    note("c1").s("sine").decay(1.2).sustain(0).gain(0.5)
  )]
)
