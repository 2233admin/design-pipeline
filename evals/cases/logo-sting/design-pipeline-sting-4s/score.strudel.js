// Logo sting at 120 BPM: one bar of approach (riser, two gate ticks on beats 3 and 4), then the landing hit and a ringing chord.
arrange(
  [1, stack(
    s("white").hpf(saw.range(300, 6000)).attack(1.8).release(0.1).gain(0.09),
    note("c2").s("sawtooth").lpf(saw.range(200, 1400)).attack(1.6).release(0.1).gain(0.12),
    note("~ ~ e6 b6").s("square").lpf(6000).decay(0.05).sustain(0).gain(0.2)
  )],
  [1, stack(
    note("c1").s("sine").decay(0.7).sustain(0).gain(0.55),
    note("[c3,g3,e4,b4]").s("sawtooth").lpf(2400).attack(0.004).decay(1.8).sustain(0.25).release(0.3).gain(0.2),
    note("[c2,g2]").s("triangle").attack(0.01).decay(1.9).sustain(0.3).gain(0.3),
    s("white").hpf(2500).decay(0.12).sustain(0).gain(0.18)
  )]
)
