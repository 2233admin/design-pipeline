// MAD at 160 BPM: one cycle is one 1.5 s bar, 60 bars = 90 s. TV-size form: intro 4, verse 8,
// pre-chorus 8, chorus 16, bridge 8, final chorus 12, outro 4. Chorus on the J-pop "royal road"
// progression (F G Em Am); the lead plays the lyric melody. Synth sounds only.
arrange(
  // Intro (bars 1-4): filtered chords, rising noise, snare roll into the reveal.
  [4, stack(
    note("<[f3,a3,c4] [g3,b3,d4] [e3,g3,b3] [a3,c4,e4]>").s("sawtooth").lpf(sine.range(500, 2200).slow(4)).attack(0.05).decay(1.4).sustain(0.3).gain(0.16),
    s("white").hpf(saw.range(400, 6000).slow(4)).attack(1.2).decay(0.3).sustain(0).gain(0.04),
    s("<~ ~ ~ [white*8]>").hpf(1500).decay(0.05).sustain(0).gain(0.14)
  )],
  // Verse (bars 5-12): four-on-the-floor, offbeat bass, sparse lead.
  [8, stack(
    note("c1*4").s("sine").decay(0.14).sustain(0).gain(0.22),
    s("white*8").hpf(8500).decay(0.02).sustain(0).gain(0.03),
    note("<a1 f1 c2 g1>").s("sawtooth").struct("~ x ~ x ~ x ~ x").lpf(650).decay(0.1).sustain(0).gain(0.08),
    note("<[a3,c4,e4] [f3,a3,c4] [c4,e4,g4] [g3,b3,d4]>").s("triangle").attack(0.05).decay(1.4).sustain(0.3).gain(0.07),
    note("<[e4 ~ e4 d4 c4 ~ a3 ~] [c4 ~ c4 d4 e4 ~ ~ ~] [g4 ~ e4 ~ d4 c4 ~ ~] [d4 ~ ~ ~ b3 ~ ~ ~]>").s("square").lpf(2400).decay(0.16).sustain(0.1).gain(0.1)
  )],
  // Pre-chorus (bars 13-20): opening filter, snare on 2 and 4; bar 20 drops out for the black-out.
  [8, stack(
    note("<c1*4 c1*4 c1*4 c1*4 c1*4 c1*4 c1*4 ~>").s("sine").decay(0.16).sustain(0).gain(0.36),
    s("<[~ white ~ white]!7 ~>").hpf(1200).decay(0.12).sustain(0).gain(0.16),
    note("<d2 e2 f2 g2 d2 e2 f2 ~>").s("sawtooth").struct("x x x x x x x x").lpf(sine.range(700, 2000).slow(8)).decay(0.1).sustain(0).gain(0.2),
    note("<[d3,f3,a3] [e3,g3,b3] [f3,a3,c4] [g3,b3,d4] [d3,f3,a3] [e3,g3,b3] [f3,a3,c4] [g3,b3,d4,f4]>").s("sawtooth").lpf(2000).attack(0.02).decay(1.3).sustain(0.2).gain(0.13),
    note("<[f4 ~ f4 ~ e4 ~ d4 ~] [g4 ~ g4 ~ f4 ~ e4 ~] [a4 ~ a4 ~ b4 ~ c5 ~] [d5 ~ ~ ~ ~ ~ ~ ~] [f4 ~ f4 ~ e4 ~ d4 ~] [g4 ~ g4 ~ f4 ~ e4 ~] [a4 ~ b4 ~ c5 ~ d5 ~] [e5@8]>").s("square").lpf(2600).decay(0.2).sustain(0.15).gain(0.13)
  )],
  // Chorus (bars 21-36): full kit, royal-road chords, the hook melody; a crash every 2 bars.
  [16, stack(
    note("c1*4").s("sine").decay(0.18).sustain(0).gain(0.36),
    s("~ white ~ white").hpf(1100).decay(0.14).sustain(0).gain(0.2),
    s("white*8").hpf(8000).decay(0.025).sustain(0).gain(0.08),
    s("<white ~>").hpf(3000).decay(0.6).sustain(0).gain(0.1),
    note("<f1 g1 e1 a1>").s("sawtooth").struct("x ~ x x ~ x x ~").lpf(1400).decay(0.14).sustain(0.2).gain(0.2),
    note("<[f3,a3,c4] [g3,b3,d4] [e3,g3,b3] [a3,c4,e4]>").s("sawtooth").lpf(2600).attack(0.02).decay(1.4).sustain(0.6).gain(0.16),
    note("<[f4,a4,c5] [g4,b4,d5] [e4,g4,b4] [a4,c5,e5]>").s("sawtooth").lpf(3600).attack(0.02).decay(1.4).sustain(0.5).gain(0.09),
    note("<[a4 ~ c5 ~ c5 d5 c5 ~] [b4 ~ g4 ~ d5 ~ b4 ~] [g4 ~ b4 ~ e5 d5 b4 ~] [c5 ~ ~ b4 a4 ~ ~ ~]>").s("square").lpf(3200).decay(0.18).sustain(0.2).gain(0.16)
  )],
  // Bridge (bars 37-44): break down to a pad and a soft pulse under the silhouette.
  [8, stack(
    note("<[f3,a3,c4] [g3,b3,d4] [e3,g3,b3] [a3,c4,e4]>").s("triangle").attack(0.3).decay(1.5).sustain(0.4).gain(0.08),
    note("<f2 g2 e2 a2>").s("sine").struct("x ~ ~ ~ x ~ ~ ~").decay(0.4).sustain(0).gain(0.12),
    note("<[c5 ~ a4 ~ ~ ~ ~ ~] ~ [b4 ~ g4 ~ ~ ~ ~ ~] ~>").s("sine").decay(0.5).sustain(0).gain(0.06)
  )],
  // Final chorus (bars 45-56): peak: sixteenth hats, octave lead, a crash every bar.
  [12, stack(
    note("c1*4").s("sine").decay(0.18).sustain(0).gain(0.38),
    s("~ white ~ white").hpf(1100).decay(0.14).sustain(0).gain(0.22),
    s("white*16").hpf(8500).decay(0.018).sustain(0).gain(0.08),
    s("white").hpf(3000).decay(0.5).sustain(0).gain(0.1),
    note("<f1 g1 e1 a1>").s("sawtooth").struct("x ~ x x ~ x x ~").lpf(1600).decay(0.14).sustain(0.25).gain(0.22),
    note("<[f3,a3,c4] [g3,b3,d4] [e3,g3,b3] [a3,c4,e4]>").s("sawtooth").lpf(3000).attack(0.02).decay(1.4).sustain(0.6).gain(0.15),
    note("<[f4,a4,c5] [g4,b4,d5] [e4,g4,b4] [a4,c5,e5]>").s("sawtooth").lpf(4000).attack(0.02).decay(1.4).sustain(0.5).gain(0.09),
    note("<[a4 ~ c5 ~ c5 d5 c5 ~] [b4 ~ g4 ~ d5 ~ b4 ~] [g4 ~ b4 ~ e5 d5 b4 ~] [c5 ~ ~ b4 a4 ~ ~ ~]>").add(12).s("square").lpf(4200).decay(0.16).sustain(0.1).gain(0.1),
    note("<[a4 ~ c5 ~ c5 d5 c5 ~] [b4 ~ g4 ~ d5 ~ b4 ~] [g4 ~ b4 ~ e5 d5 b4 ~] [c5 ~ ~ b4 a4 ~ ~ ~]>").s("sawtooth").lpf(2800).decay(0.18).sustain(0.12).gain(0.1)
  )],
  // Outro (bars 57-60): the last hit on bar 57, then the chord rings out under the end card.
  [4, stack(
    note("<c1 ~ ~ ~>").s("sine").decay(1.0).sustain(0).gain(0.45),
    s("<white ~ ~ ~>").hpf(1800).decay(0.8).sustain(0).gain(0.16),
    note("<[f3,a3,c4,e4]@2 [a3,c4,e4,g4]@2>").s("sawtooth").lpf(2400).attack(0.004).decay(2.6).sustain(0.35).gain(0.18),
    note("<[f2,c3]@2 [a2,e3]@2>").s("triangle").attack(0.05).decay(2.8).sustain(0.4).gain(0.2)
  )]
)
