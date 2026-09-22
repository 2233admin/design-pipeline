"""Original 96 BPM score for the 32-second Field Notes edit. Requires numpy."""
from pathlib import Path
import json
import wave
import numpy as np

RATE, SECONDS, BEAT = 44100, 32, 0.625
score = np.zeros((RATE * SECONDS, 2), dtype=np.float64)
rng = np.random.default_rng(4176)


def frequency(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def place(signal, at, gain=1, pan=0):
    start = round(at * RATE)
    count = min(len(signal), len(score) - start)
    if count <= 0:
        return
    stereo = signal[:count] if signal.ndim == 2 else np.column_stack([
        signal[:count] * np.sqrt((1 - pan) / 2),
        signal[:count] * np.sqrt((1 + pan) / 2),
    ])
    score[start:start + count] += gain * stereo


def piano(midi, at, gain=.10, pan=0, length=3.8):
    t = np.arange(round(length * RATE)) / RATE
    f = frequency(midi)
    note = np.zeros_like(t)
    for harmonic, weight in [(1, 1), (2, .31), (3, .13), (4, .066), (6, .017)]:
        detune = 1 + .000045 * harmonic * harmonic
        note += weight * np.sin(2 * np.pi * f * harmonic * detune * t) * np.exp(-t * (1.1 + harmonic * .17))
    note *= (1 - np.exp(-t * 370)) * np.minimum(1, (length - t) / .18)
    place(note, at, gain, pan)


def pad(chord, at, length=7.5, gain=.065):
    t = np.arange(round(length * RATE)) / RATE
    envelope = np.minimum(1, t / 1.3) * np.minimum(1, (length - t) / 2.8)
    channels = []
    for side in [-1, 1]:
        s = np.zeros_like(t)
        for index, midi in enumerate(chord):
            f = frequency(midi)
            for h, weight in [(1, 1), (2, .20), (3, .075)]:
                s += weight * np.sin(2 * np.pi * f * (1 + side * .0011) * h * t + index * .41)
        s *= envelope * (.90 + .10 * np.sin(2 * np.pi * .17 * t + side)) / len(chord)
        channels.append(s)
    place(np.column_stack(channels), at, gain)


def bass(midi, at, gain=.095, length=1.5):
    t = np.arange(round(length * RATE)) / RATE
    envelope = (1 - np.exp(-t * 90)) * np.exp(-t * 2.1) * np.minimum(1, (length - t) / .1)
    s = (np.sin(2 * np.pi * frequency(midi) * t) + .12 * np.sin(4 * np.pi * frequency(midi) * t)) * envelope
    place(s, at, gain)


def tick(at, gain=.006, pan=0):
    t = np.arange(round(.11 * RATE)) / RATE
    noise = rng.standard_normal(len(t))
    noise = np.diff(noise, prepend=0)
    place(noise * np.exp(-t * 72) * np.minimum(1, t * 2000), at, gain, pan)


def swell(at, length=1.2, gain=.014):
    t = np.arange(round(length * RATE)) / RATE
    noise = rng.standard_normal(len(t))
    smooth_noise = np.convolve(noise, np.ones(48) / 48, mode="same")
    envelope = np.sin(np.pi * t / length) ** 2
    stereo = np.column_stack([smooth_noise, np.roll(smooth_noise, 170)]) * envelope[:, None]
    place(stereo, at, gain)


chords = [
    [50, 57, 60, 64, 65], [46, 53, 57, 60, 62],
    [53, 60, 64, 67, 69], [48, 55, 58, 62, 64],
    [46, 53, 57, 60, 65], [50, 57, 60, 64, 69],
]
for i, chord in enumerate(chords):
    pad(chord, i * 5, length=7, gain=.17 if i in [2, 4] else .14)
pad([50, 57, 62, 64, 69], 27.5, length=4.5, gain=.12)

# A sparse opening becomes a repeating motif, then opens into a held ending.
melody = [69, 76, 74, 72, 69, 72, 76, 67, 65, 72, 69, 74]
for i, note in enumerate(melody):
    at = .625 + i * 1.25
    piano(note, at, gain=.125 if i % 3 == 0 else .082, pan=.24 * (-1) ** i)
for i in range(20):
    at = 15 + i * BEAT
    chord = chords[min(5, int(at // 5))]
    note = chord[[1, 3, 2, 4][i % 4]] + 12
    piano(note, at, gain=.072 if i % 4 else .10, pan=.35 * np.sin(i * 1.3), length=2.8)
for midi, at, gain in [(74, 27.5, .10), (69, 28.125, .085), (62, 28.75, .12), (76, 29.375, .065)]:
    piano(midi, at, gain, length=32-at)

for at in np.arange(7.5, 27.5, 1.25):
    bass(chords[min(5, int(at // 5))][0] - 12, at, .09 if at < 12 else .065)
    if at < 11.25 or at >= 16.25:
        tick(at + BEAT, .008, -.35)
        tick(at + BEAT * 1.5, .0038, .45)
for at in [4.05, 7.15, 10.9, 15.9, 23.4, 27.1]:
    swell(at, .7, .06)

# Fixed stereo delay taps form a dark room around the dry instruments.
dry = score.copy()
for delay, gain in [(.19, .16), (.31, .13), (.47, .12), (.73, .09), (1.09, .065), (1.47, .035)]:
    shift = round(delay * RATE)
    score[shift:] += dry[:-shift, ::-1] * gain
t = np.arange(len(score)) / RATE
score *= np.minimum(1, t / .18)[:, None]
score *= np.minimum(1, (SECONDS - t) / 1.7)[:, None]
score = np.tanh(score * 1.7)
score *= .86 / max(.001, float(np.max(np.abs(score))))
destination = Path(__file__).parent / "assets" / "field-notes-score.wav"
with wave.open(str(destination), "wb") as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes((score * 32767).astype("<i2").tobytes())
print(json.dumps({"path": str(destination), "seconds": SECONDS, "sampleRate": RATE,
                  "bpm": 96, "peakDbFS": round(20 * np.log10(np.max(np.abs(score))), 2),
                  "rmsDbFS": round(20 * np.log10(np.sqrt(np.mean(score ** 2))), 2),
                  "clippedSamples": int(np.sum(np.abs(score) >= 1))}))
