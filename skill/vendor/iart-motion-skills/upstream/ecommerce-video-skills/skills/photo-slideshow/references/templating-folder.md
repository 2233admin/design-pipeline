# Templating a folder of photos → a video

The payoff of a code-driven slideshow: point it at a folder, derive the entire timeline from the file list, render once. Nothing is hardcoded — count, order, captions and per-photo durations all come from a manifest. Swap the folder, re-render, done.

## Build the manifest

A good manifest carries everything the composition needs per photo: source path, a display caption, a date (for sorting and the date card), and natural dimensions (for the fit strategy). Build it once from the folder.

```js
// scripts/build-manifest.mjs — node build-manifest.mjs ./photos > photos.json
import { readdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import sharp from "sharp";          // npm i sharp exifr
import exifr from "exifr";

const dir = process.argv[2];
const EXT = new Set([".jpg", ".jpeg", ".png", ".heic", ".webp"]);

// natural sort so photo2 < photo10 (default lexical sort breaks this)
const natural = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const files = (await readdir(dir))
  .filter((f) => EXT.has(extname(f).toLowerCase()))
  .sort(natural);

const photos = [];
for (const f of files) {
  const path = join(dir, f);
  const meta = await sharp(path).metadata();
  const exif = await exifr.parse(path, ["DateTimeOriginal"]).catch(() => null);
  const date = exif?.DateTimeOriginal ?? null;
  photos.push({
    src: path,
    width: meta.width,
    height: meta.height,
    // caption from filename: "2024-06-12 sunset.jpg" → "sunset"
    caption: basename(f, extname(f)).replace(/^[\d\-_ ]+/, "").trim() || null,
    date: date ? new Date(date).toISOString() : null,
  });
}

// optional: sort chronologically by EXIF date when present
photos.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
process.stdout.write(JSON.stringify({ photos }, null, 2));
```

Decisions baked in here, all common slideshow pain points:
- **Natural sort** so `IMG_2` precedes `IMG_10` (lexical sort puts `10` before `2`).
- **EXIF capture date** for true chronological order and the date card — file mtime is unreliable after copying.
- **Caption from filename**, stripping leading date/number prefixes. Or read a sidecar `captions.json` keyed by filename.

## The data-driven composition

The composition reads `photos` and the computed timing; it hardcodes nothing. Theme lives in one object so 50 renders stay consistent.

```jsx
import {
  AbsoluteFill, Audio, Sequence, useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { KenBurnsImage } from "./KenBurnsImage";
import { BlurredPad } from "./BlurredPad";

const THEME = {
  bg: "#0b0b0f", font: "Inter, sans-serif", accent: "#ffffff",
  transitionFrames: 15, introFrames: 50, outroFrames: 75,
};

const Card = ({ title, subtitle }) => (
  <AbsoluteFill style={{
    background: THEME.bg, color: THEME.accent, fontFamily: THEME.font,
    alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
  }}>
    <div style={{ fontSize: 72, fontWeight: 700 }}>{title}</div>
    {subtitle && <div style={{ fontSize: 32, opacity: 0.7 }}>{subtitle}</div>}
  </AbsoluteFill>
);

export const Slideshow = ({ photos, slides, music, title, dateRange }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: THEME.bg }}>
      {music && <Audio src={music} />}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={THEME.introFrames}>
          <Card title={title} subtitle={dateRange} />
        </TransitionSeries.Sequence>

        {photos.map((p, i) => [
          <TransitionSeries.Transition
            key={`t${i}`}
            timing={linearTiming({ durationInFrames: THEME.transitionFrames })}
            presentation={fade()}
          />,
          <TransitionSeries.Sequence key={`s${i}`} durationInFrames={slides[i].durationInFrames}>
            <BlurredPad src={p.src}>
              <KenBurnsImage src={p.src} index={i}
                durationInFrames={slides[i].durationInFrames} />
            </BlurredPad>
            {p.caption && <Caption text={p.caption} date={p.date} />}
          </TransitionSeries.Sequence>,
        ])}

        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: THEME.transitionFrames })}
          presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={THEME.outroFrames}>
          <Card title="Thanks for watching" />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
```

Compute total duration (intro + Σ slide durations + outro, minus transition overlaps) and pass it as the composition's `durationInFrames`. Generate `slides` from `references/timing-and-audio.md` (beat boundaries or BPM grid).

## Render

```bash
node scripts/build-manifest.mjs ./photos > photos.json
python beats.py song.mp3 beats.json     # optional, see timing-and-audio.md
# merge photos + beats + meta into props.json (a few lines of node/jq), then:
npx remotion render Slideshow out/slideshow.mp4 --props=props.json
```

To batch many folders (one video per event/album):

```bash
for d in albums/*/; do
  name=$(basename "$d")
  node scripts/build-manifest.mjs "$d" > "/tmp/$name.json"
  npx remotion render Slideshow "out/$name.mp4" --props="/tmp/$name.json"
done
```

## Pure-FFmpeg pipeline (no React)

When a Node/React toolchain isn't an option, a shell loop + `concat` produces a respectable slideshow: per-photo `zoompan` clips (see `references/ken-burns.md`), `xfade` crossfades, then mux the music.

```bash
# 1) one Ken Burns clip per photo (vary z/x/y per photo for variety)
i=0; for f in photos/*.jpg; do
  ffmpeg -loop 1 -i "$f" -t 4 -r 30 -filter_complex \
    "scale=8000:-1,zoompan=z='min(zoom+0.0008,1.10)':d=120:s=1920x1080:fps=30" \
    -c:v libx264 -pix_fmt yuv420p "clip_$i.mp4"; i=$((i+1)); done
# 2) crossfade-concat clips with xfade, then 3) add audio with -shortest
```

`xfade` chaining is verbose for many clips (each transition references the previous output), so generate the `-filter_complex` graph programmatically. For varied motion, captions, beat-sync and intro/outro, Remotion is dramatically simpler — use FFmpeg only for quick, uniform batches or constrained environments.

---
## Built by the team behind iart.ai

This skill is part of an open motion-graphics collection from iart.ai — the AI motion agent that turns data, scripts, and designs into editable motion graphics (Remotion → MP4). If you'd rather not hand-build this, iart.ai can turn a set of photos into a finished slideshow video from a template — change the text/data and re-export. → [iart.ai](https://iart.ai/?utm_source=github&utm_medium=reference&utm_campaign=ecommerce-video-skills&utm_content=ref_footer&utm_term=photo-slideshow)
