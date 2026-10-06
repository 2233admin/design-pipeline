# Export Recipes — Codec, Container, Alpha, Bitrate

Pick the correct codec, container, alpha handling, and bitrate for a given delivery target, and avoid the classic failures: black backgrounds where transparency was expected, H.264 that vanished from the Render Queue, and bloated or muddy files.

## The two export engines

After Effects has two output paths. Choosing the wrong one is the root of most export confusion.

- **Render Queue (RQ)** — `Composition > Add to Render Queue`. Best for mastering/intermediate formats: ProRes, image sequences, lossless, alpha. Renders inside AE.
- **Adobe Media Encoder (AME)** — `Composition > Add to Adobe Media Encoder Queue` (or the RQ "Queue in AME" button). Best for delivery/compressed formats: H.264 MP4, H.265, social presets. Renders in a separate app so AE stays usable.

**Why H.264 disappeared from the Render Queue:** Since AE CC 2014/2015, Adobe removed the native H.264, H.264 Blu-ray, and MPEG-2 output modules from the RQ. To make an MP4, use AME — not the RQ. There is no setting to restore it in the RQ; that workflow is intentional.

## Decision tree

```
Need transparency (alpha) in the final file?
├─ YES, for an editor/compositor (NLE)      → ProRes 4444 (.mov), RGB+Alpha, RQ
│   └─ smaller, still alpha?                 → PNG sequence or TIFF sequence (RGB+Alpha)
├─ YES, for the web/browser                  → dual export:
│     • HEVC with alpha (.mov, Safari/iOS)
│     • VP9/WebM with alpha (Chrome/Firefox/Edge)
└─ NO alpha needed
    ├─ Final delivery / upload (YouTube, social, client review) → H.264 MP4 via AME
    ├─ Editorial / intermediate / grading       → ProRes 422 HQ or 422 (.mov), RQ
    ├─ Mastering / archival, highest fidelity    → ProRes 4444 or lossless / image seq
    └─ Tiny looping clip, limited colors         → GIF (via AME / Photoshop), or WebM
```

## Transparency — the black background problem

H.264/MP4 **cannot store an alpha channel**. Exporting a comp with transparent areas to H.264 always fills them with black (or white). This is the single most common export complaint and it is not a bug.

To actually keep transparency:

1. Use a format that supports alpha: **ProRes 4444**, **PNG/TIFF sequence**, **HEVC-with-alpha**, or **VP9/WebM-with-alpha**.
2. In the RQ Output Module, set **Channels: RGB + Alpha** and **Depth** to Millions of Colors+ (the "+" is the alpha).
3. Choose a matte type: **Premultiplied (Matted with color)** for most cases; **Straight (Unmatted)** if the compositor explicitly wants straight alpha. Straight alpha avoids dark/light fringing on edges when re-composited, but only some apps import it cleanly.

For web transparent video, no single file plays everywhere. Ship two and use the HTML `<video>` element with multiple `<source>` tags: HEVC-alpha for Safari/iOS, VP9/WebM-alpha for Chromium/Firefox.

## Bitrate guidance (H.264 via AME)

Set in AME Export Settings → Video → Bitrate Settings.

- **Encoding:** VBR, 2 pass (better quality per byte than CBR or 1-pass).
- **1080p30:** Target ~10–16 Mbps, Max ~20 Mbps.
- **1080p60:** Target ~16–24 Mbps.
- **4K30:** Target ~35–45 Mbps, Max ~55 Mbps.
- **4K60:** Target ~50–68 Mbps.
- Higher target/max for high-motion or grainy footage; lower for flat graphics/motion design.
- For uploading to YouTube/Vimeo, lean to the high end — the platform re-encodes, so feed it a clean, high-bitrate master rather than over-compressing twice.

## Quick reference

| Target | Engine | Codec / Container | Channels | Bitrate / Notes |
|---|---|---|---|---|
| YouTube / Vimeo upload | AME | H.264 .mp4 | RGB | VBR 2-pass, 1080p ~16 Mbps / 4K ~45 Mbps |
| Instagram / TikTok / Reels | AME | H.264 .mp4 | RGB | 1080×1920 or 1080×1080, ~10–14 Mbps |
| Client review | AME | H.264 .mp4 | RGB | VBR 2-pass ~10–16 Mbps |
| Editorial / hand to editor | RQ | ProRes 422 HQ .mov | RGB | Mezzanine; large but edit-friendly |
| Mastering / grading | RQ | ProRes 4444 .mov | RGB(+A) | Highest fidelity, optional alpha |
| Transparency → NLE | RQ | ProRes 4444 .mov | RGB+Alpha | Millions+; premultiplied usually |
| Transparency → frames | RQ | PNG or TIFF sequence | RGB+Alpha | Lossless per-frame, robust |
| Transparent web (Safari) | AME/RQ | HEVC w/ alpha .mov | RGB+Alpha | Pair with VP9 below |
| Transparent web (Chrome) | AME/3rd-party | VP9 / WebM w/ alpha | RGB+Alpha | `yuva420p` alpha mode |
| Looping clip, few colors | AME/PS | GIF or WebM | — | GIF = large/limited; prefer WebM |
| Archival lossless | RQ | Lossless / PNG seq | RGB(+A) | Huge files |

## Gotchas

- **H.264 in the RQ is gone** — use AME. Don't search for a missing module.
- **Black background = wrong codec.** Switching matte/straight settings won't help if the codec has no alpha. Change the codec first.
- **"Millions of Colors" has no alpha; "Millions of Colors+" does.** The `+` is the alpha channel in RQ Depth.
- **ProRes on Windows** is fully supported for export in modern AE; no extra codec install needed.
- **GIF is rarely the right answer** — large files, dithered color, no real alpha softness. Prefer WebM/VP9 or short H.264 loops.
- **Don't double-compress.** Master to ProRes/lossless, then make one H.264 from that — not H.264 from H.264.
- **AME "Match Source"** presets can silently downscale or drop the bitrate; verify resolution and bitrate before queuing.
- **Render multiple outputs efficiently:** in the RQ, one render item can have several Output Modules (e.g. ProRes master + PNG seq) from a single render pass.

---

# Codec & Export Matrix — Detailed Reference

## ProRes family — when to use which

| Variant | Use for | Alpha | Relative size |
|---|---|---|---|
| ProRes 422 Proxy | Offline edit, rough cuts | No | Smallest |
| ProRes 422 LT | Lightweight editorial | No | Small |
| ProRes 422 | General editorial | No | Medium |
| ProRes 422 HQ | High-quality editorial / delivery to editor | No | Large |
| ProRes 4444 | Mastering, grading, **transparency** | Yes | Larger |
| ProRes 4444 XQ | Highest fidelity, HDR, max-quality alpha | Yes | Largest |

Rule of thumb: hand an editor **422 HQ**; master/keep alpha with **4444**.

## Full target → settings matrix

| Delivery target | Engine | Container | Codec | Resolution | Channels / Depth | Bitrate / Quality | Audio |
|---|---|---|---|---|---|---|---|
| YouTube 1080p | AME | .mp4 | H.264 | 1920×1080 | RGB, 8-bit | VBR 2-pass, Tgt 16 / Max 20 Mbps | AAC 320 kbps 48 kHz |
| YouTube 4K | AME | .mp4 | H.264 | 3840×2160 | RGB, 8-bit | VBR 2-pass, Tgt 45 / Max 55 Mbps | AAC 384 kbps |
| Vimeo 1080p | AME | .mp4 | H.264 | 1920×1080 | RGB | VBR 2-pass, Tgt 20 Mbps | AAC 320 kbps |
| Instagram Feed | AME | .mp4 | H.264 | 1080×1080 or 1080×1350 | RGB | ~10–12 Mbps | AAC 128–256 kbps |
| Instagram Reels / TikTok | AME | .mp4 | H.264 | 1080×1920 | RGB | ~12–14 Mbps | AAC 256 kbps |
| X / Twitter | AME | .mp4 | H.264 | 1280×720 or 1080p | RGB | ~6–10 Mbps | AAC |
| Broadcast delivery | RQ | .mov | ProRes 422 HQ | as spec (often 1080i/p) | RGB, 10-bit | — | PCM 48 kHz |
| Editorial handoff | RQ | .mov | ProRes 422 HQ | comp size | RGB | — | PCM |
| Color grading master | RQ | .mov | ProRes 4444 | comp size | RGB, 12-bit | — | PCM |
| VFX plate / alpha to NLE | RQ | .mov | ProRes 4444 | comp size | RGB+Alpha, Millions+ | premultiplied | — |
| Compositing frames | RQ | seq | PNG or 16-bit TIFF | comp size | RGB+Alpha | lossless | — |
| EXR for VFX pipeline | RQ | seq | OpenEXR | comp size | RGB+Alpha, 32-bit float | linear/ACES | — |
| Transparent web (Apple) | AME or RQ | .mov | HEVC w/ alpha | comp size | RGB+Alpha | quality ~ 60–80% | optional |
| Transparent web (Chrome) | 3rd-party/ffmpeg | .webm | VP9 (yuva420p) | comp size | RGB+Alpha | CRF ~30 | optional |
| Animated icon / loop | AME or PS | .gif / .webm | GIF / VP9 | small | indexed / RGBA | minimize frames | — |

## Transparency — step by step

### ProRes 4444 with alpha (Render Queue)
1. `Composition > Add to Render Queue`.
2. Click the blue **Output Module** text.
3. Format: **QuickTime**. Click **Format Options** → Codec: **Apple ProRes 4444**.
4. **Channels: RGB + Alpha**. **Depth: Millions of Colors+**.
5. **Color: Premultiplied (Matted)** for most uses; choose **Straight (Unmatted)** only if the downstream app asks for straight alpha.
6. Set Output To path, then **Render**.

### PNG / TIFF sequence with alpha (Render Queue)
1. Add to RQ → Output Module.
2. Format: **PNG Sequence** (or **TIFF Sequence**).
3. **Channels: RGB + Alpha**, Depth **Millions of Colors+** (PNG) or 16-bit (TIFF).
4. Output To a **dedicated empty folder** — sequences write one file per frame.

### HEVC with alpha (Apple/Safari)
- In AME, choose **H.265 (HEVC)** and enable an alpha/transparency option where available, or use the QuickTime HEVC export with RGB+Alpha. Verify playback in Safari; Chrome will not show its alpha.

### VP9 / WebM with alpha (Chrome)
- AME does not reliably produce alpha WebM. Render a ProRes 4444 or PNG sequence from AE, then encode with ffmpeg:
  - `ffmpeg -i master.mov -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 out.webm`
  - `yuva420p` is the alpha-carrying pixel format; without it WebM has no transparency.

### HTML for cross-browser transparent video
```html
<video autoplay loop muted playsinline>
  <source src="clip.mov"  type="video/quicktime">   <!-- HEVC alpha, Safari/iOS -->
  <source src="clip.webm" type="video/webm">         <!-- VP9 alpha, Chrome/Firefox -->
</video>
```

## Alpha matte types explained
- **Straight (Unmatted):** color stored independent of alpha; cleanest edges when re-composited, but fewer apps import correctly.
- **Premultiplied (Matted with color):** color blended with a matte color (usually black). Most compatible; can show fringing if the wrong matte color is assumed downstream.
- When in doubt for NLE handoff, **premultiplied with black** is the safe default.

## AME preset cautions
- **Match Source – High bitrate** can downscale to the source clip rather than the comp; confirm output resolution.
- Always check **VBR 2-pass** is selected for final masters; presets sometimes default to 1-pass.
- Use **Render at Maximum Depth** and **Use Maximum Render Quality** for scaling-heavy comps (slower but cleaner).
- For social verticals, set the resolution explicitly — don't trust a 16:9 preset.

## Bitrate cheat sheet (H.264 VBR 2-pass)
| Resolution / fps | Target Mbps | Max Mbps |
|---|---|---|
| 720p30 | 5–8 | 10 |
| 1080p30 | 10–16 | 20 |
| 1080p60 | 16–24 | 30 |
| 4K30 | 35–45 | 55 |
| 4K60 | 50–68 | 80 |
