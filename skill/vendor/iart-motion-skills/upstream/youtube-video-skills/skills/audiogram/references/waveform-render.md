# Waveform rendering — runnable components

Two looks (frequency bars, oscilloscope wave), the full audiogram composition, a parameter cheat sheet, and a dependency-free Web Audio + canvas variant. All Remotion code assumes `@remotion/media-utils` and Remotion 4.x.

## Mirrored frequency-bar equalizer

`visualizeAudio()` returns an array of length `numberOfSamples`, lows on the left → highs on the right, each value 0–1. For a centered equalizer, take the first half and mirror it so bass sits in the middle and the bars splay outward symmetrically.

```tsx
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { useCurrentFrame, useVideoConfig, staticFile } from "remotion";

const NUMBER_OF_SAMPLES = 32; // power of two

export const Bars: React.FC<{ src: string; color?: string }> = ({
  src,
  color = "#ffffff",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(staticFile(src));
  if (!audioData) return null; // still decoding

  const spectrum = visualizeAudio({
    audioData,
    frame,
    fps,
    numberOfSamples: NUMBER_OF_SAMPLES,
    smoothing: true, // blends ~3 frames so bars don't strobe
  });

  // Use the lower half (most energy lives there) and mirror it center-out.
  const half = spectrum.slice(0, NUMBER_OF_SAMPLES / 2);
  const mirrored = [...half.slice().reverse(), ...half];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 240,
      }}
    >
      {mirrored.map((v, i) => {
        // Boost + clamp: voice rarely fills the 0–1 range, so scale it up.
        const height = Math.max(6, Math.min(1, v * 4) * 240);
        return (
          <div
            key={i}
            style={{
              width: 10,
              height,
              borderRadius: 6,
              background: color,
            }}
          />
        );
      })}
    </div>
  );
};
```

Tuning notes:
- **`v * 4` boost** — speech energy is low; without a multiplier the bars barely twitch. Tune 2–6 to taste, always clamp to 1 before scaling to pixels.
- **`smoothing: true`** blends roughly three frames; leave it on for a calmer wave, turn it off for a punchy, reactive look.
- **`numberOfSamples`** must be a power of two. 16 = chunky/branded, 32 = balanced, 64+ = detailed spectrum.

## Smooth oscilloscope wave (voice / podcasts)

`visualizeAudioWaveform()` returns time-domain amplitude in −1…1 — the literal shape of the wave. Map it to a centered polyline. This reads calmer and more "spoken word" than bars.

```tsx
import {
  useAudioData,
  visualizeAudioWaveform,
} from "@remotion/media-utils";
import { useCurrentFrame, useVideoConfig, staticFile } from "remotion";

const SAMPLES = 64;
const W = 1080;
const H = 200;

export const Wave: React.FC<{ src: string; color?: string }> = ({
  src,
  color = "#ffffff",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(staticFile(src));
  if (!audioData) return null;

  const wave = visualizeAudioWaveform({
    audioData,
    frame,
    fps,
    numberOfSamples: SAMPLES,
    windowInSeconds: 1 / fps, // amplitude over a single frame's worth of audio
  });

  const step = W / (SAMPLES - 1);
  const points = wave
    .map((amp, i) => `${i * step},${H / 2 + amp * (H / 2)}`)
    .join(" ");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};
```

## Full audiogram composition

The five layers from SKILL.md wired together, with the real audio muxed in. Pass `captions` to a `<Captions>` component built with the caption-animation skill — kept as a slot here so this skill owns layout, not caption mechanics.

```tsx
import {
  AbsoluteFill,
  Audio,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Bars } from "./Bars";

export const Audiogram: React.FC<{
  audio: string;       // "episode.mp3" in /public
  cover: string;       // "cover.jpg"
  title: string;
  accent?: string;
}> = ({ audio, cover, title, accent = "#6C5CE7" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames; // 0 → 1, pure function of frame

  return (
    <AbsoluteFill style={{ background: "#0E0E13", fontFamily: "Inter" }}>
      {/* real audio — without this the MP4 is silent */}
      <Audio src={staticFile(audio)} />

      {/* cover art + title */}
      <div style={{ display: "flex", gap: 24, alignItems: "center", padding: 64 }}>
        <Img
          src={staticFile(cover)}
          style={{ width: 140, height: 140, borderRadius: 20 }}
        />
        <h1 style={{ color: "#fff", fontSize: 44, margin: 0, lineHeight: 1.1 }}>
          {title}
        </h1>
      </div>

      {/* hero waveform */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Bars src={audio} color={accent} />
      </AbsoluteFill>

      {/* caption slot — build with the caption-animation skill */}
      {/* <Captions src={captions} /> */}

      {/* progress bar pinned to the bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: `${progress * 100}%`,
          height: 6,
          background: accent,
        }}
      />
    </AbsoluteFill>
  );
};
```

Register it once per aspect ratio so one source file exports square and vertical:

```tsx
// Root.tsx
<Composition
  id="Audiogram-1x1"
  component={Audiogram}
  durationInFrames={Math.round(90 * 30)} // 90s clip @ 30fps — set from real audio length
  fps={30}
  width={1080}
  height={1080}
  defaultProps={{ audio: "episode.mp3", cover: "cover.jpg", title: "Ep. 42 — On Focus" }}
/>
<Composition id="Audiogram-9x16" /* same component */ width={1080} height={1920} /* … */ />
```

Set `durationInFrames` from the actual clip length: `Math.round(audioData.durationInSeconds * fps)`, or read it ahead of time with `getAudioDurationInSeconds()` and feed it via `calculateMetadata`.

```bash
# render both social aspects
npx remotion render Audiogram-1x1  out/clip-square.mp4
npx remotion render Audiogram-9x16 out/clip-vertical.mp4
```

## Parameter cheat sheet

| Param | Where | Rule |
|---|---|---|
| `numberOfSamples` | `visualizeAudio` / `visualizeAudioWaveform` | power of two only (16/32/64/128) |
| amplitude boost | your code | multiply (2–6×) then clamp to 1 — voice underfills 0–1 |
| `smoothing` | `visualizeAudio` | `true` blends ~3 frames (calm); `false` = punchy |
| `optimizeFor` | `visualizeAudio` | `"accuracy"` (default) or `"speed"` for faster renders |
| `windowInSeconds` | `visualizeAudioWaveform` | small (≈`1/fps`) tracks per-frame amplitude |
| memory | `useAudioData` vs `useWindowedAudioData` | windowed for long files (range requests) |

## Dependency-free Web Audio + canvas variant

No Remotion. Decode the file once to a per-frame amplitude array (RMS per frame), then a deterministic loop draws each frame — the same "value is a function of frame" discipline, so it works for offline/headless capture, not just live playback.

```js
// 1) Decode whole file → one RMS amplitude value per video frame.
async function decodeToFrames(url, fps) {
  const ctx = new OfflineAudioContext(1, 44100, 44100);
  const buf = await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
  const data = buf.getChannelData(0);                 // mono PCM, −1…1
  const samplesPerFrame = Math.floor(buf.sampleRate / fps);
  const frames = [];
  for (let i = 0; i < data.length; i += samplesPerFrame) {
    let sum = 0;
    for (let j = i; j < i + samplesPerFrame && j < data.length; j++) {
      sum += data[j] * data[j];
    }
    frames.push(Math.sqrt(sum / samplesPerFrame));    // RMS loudness, 0…~1
  }
  return frames;                                      // index by frame number
}

// 2) Draw one frame deterministically — mirrored bars from a short window.
function drawFrame(canvas, frames, frameIndex, bars = 24) {
  const c = canvas.getContext("2d");
  const { width: W, height: H } = canvas;
  c.clearRect(0, 0, W, H);
  c.fillStyle = "#fff";
  const barW = W / (bars * 2);
  for (let b = 0; b < bars; b++) {
    const amp = frames[frameIndex + b] ?? 0;          // tiny look-ahead per bar
    const h = Math.min(1, amp * 4) * H;               // boost + clamp
    const x = W / 2 + b * barW;                       // right half
    c.fillRect(x, (H - h) / 2, barW - 2, h);          // mirror to the left
    c.fillRect(W - x - (barW - 2), (H - h) / 2, barW - 2, h);
  }
}

// Usage:
//   const frames = await decodeToFrames("episode.mp3", 30);
//   drawFrame(canvas, frames, currentFrame);  // for export, loop 0..frames.length
//   For LIVE playback only, getByteFrequencyData() on an AnalyserNode is fine —
//   but never use it to drive a deterministic/offline render.
```

`getByteFrequencyData()` (0–255 per frequency bin) is the live-playback equivalent of `visualizeAudio`; `getByteTimeDomainData()` is the raw waveform. Both are real-time only — they read the playhead, so they belong in an interactive preview, never in a frame-accurate export.

---
## Built by the team behind iart.ai

This skill is part of an open motion-graphics collection from iart.ai — the AI motion agent that turns data, scripts, and designs into editable motion graphics (Remotion → MP4). If you'd rather not hand-build this, iart.ai can turn a podcast or audio clip into a captioned waveform video from a template — change the text/data and re-export. → [iart.ai](https://iart.ai/?utm_source=github&utm_medium=reference&utm_campaign=youtube-video-skills&utm_content=ref_footer&utm_term=audiogram)
