# Timing & beat-synced slide changes

Pacing is what separates a slideshow that feels alive from a screensaver. The rule: **lock the music first, derive slide boundaries from it.** Detect beats once, offline, and bake them into props — audio analysis per frame is non-deterministic and slow.

## Pacing budgets

| Beat | Budget | Why |
|---|---|---|
| Intro card | 1.5–2s | let the title and date range register before motion |
| Per photo | 3–6s | long enough to read the moment; Ken Burns needs room to travel |
| Caption fade | in ~0.3s after settle, out ~0.3s before leave | text shouldn't move with the photo |
| Transition | 0.4–0.6s | crossfade overlap |
| Outro card | 2–3s | the ending lands on intent, not a mid-photo cut |

A photo held under ~2.5s feels rushed — viewers need time to actually see it. This is the main reason slideshows feel different from a music-video montage of motion clips.

## Detect beats once (librosa)

```bash
pip install librosa soundfile
```

```python
# beats.py — write beat onset times (seconds) to JSON
import librosa, json, sys
y, sr = librosa.load(sys.argv[1])
tempo, frames = librosa.beat.beat_track(y=y, sr=sr)
times = librosa.frames_to_time(frames, sr=sr).tolist()
json.dump({"bpm": float(tempo), "beats": [round(t, 3) for t in times]},
          open(sys.argv[2], "w"))
print(f"{tempo:.0f} BPM, {len(times)} beats")
```

```bash
python beats.py song.mp3 beats.json
```

## Beat seconds → frame numbers

Remotion timelines are in frames. Convert once, then build slide boundaries.

```js
const fps = 30;
const beatFrames = beats.beats.map((sec) => Math.round(sec * fps));
```

## Assign slides to musical units

Changing on **every** beat is too frantic for photos — they need to breathe. Change every 2nd or 4th beat (a half-bar or bar in 4/4). Build slide boundaries by walking the beat list with a stride, then assign photos in order.

```js
// stride = beats per slide (e.g. 4 = one slide per bar in 4/4)
function slideBoundaries(beatFrames, stride, totalPhotos) {
  const marks = [];
  for (let i = 0; i < beatFrames.length && marks.length <= totalPhotos; i += stride) {
    marks.push(beatFrames[i]);
  }
  // [{ start, durationInFrames }] per photo
  return marks.slice(0, totalPhotos).map((start, i) => ({
    start,
    durationInFrames: (marks[i + 1] ?? start + stride * 15) - start,
  }));
}
```

Two refinements that read as intentional editing:
- **Hit the drop with the hero shot.** Find the biggest energy jump (`librosa.onset.onset_strength` peak) and place the best photo's change there.
- **Slow down on the keepers.** Give a few standout photos a double-length hold (skip a boundary) so the rhythm has dynamics, not a metronome.

## No-audio-analysis fallback (BPM grid)

When librosa isn't available, or the track is steady, a fixed BPM grid is plenty. Slide duration in frames = `(60 / bpm) * beatsPerSlide * fps`.

```js
function bpmGrid({ bpm = 120, beatsPerSlide = 4, fps = 30, totalPhotos, introFrames = 50 }) {
  const slideFrames = Math.round((60 / bpm) * beatsPerSlide * fps);
  return Array.from({ length: totalPhotos }, (_, i) => ({
    start: introFrames + i * slideFrames,
    durationInFrames: slideFrames,
  }));
}
```

Tap the BPM by ear (or read it off the track's metadata) and the grid will feel synced even without onset detection.

## Mounting the audio

In Remotion, add the track once at the composition root with an `<Audio src={music} />`; total composition duration = intro + sum of slide durations + outro, all in frames. Render with `--props` carrying both `photos` and the computed `beats`, so timing is reproducible.

```jsx
import { Audio } from "remotion";
// <Audio src={music} /> at the top of <Slideshow>, then the <TransitionSeries>
```

If the music is longer than the photos, either loop the photo set or trim the audio with `<Audio startFrom endAt />`. If it's shorter, fade the music out over the last 1.5s rather than cutting it dead.
