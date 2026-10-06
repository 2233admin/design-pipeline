# Pre-Delivery QC + Collect-Files Checklist

## Pre-delivery QC

### Format & frame
- [ ] Dimensions and aspect ratio correct for every target.
- [ ] Duration matches spec (including any hard broadcast slot).
- [ ] Frame rate correct and consistent; matches region for broadcast.
- [ ] First frame clean — no black flash, no held/garbage frame.
- [ ] Last frame clean — ends on intended frame, no abrupt cut to black.
- [ ] No dropped/duplicated frames; no render artifacts or stuck layers.

### Audio
- [ ] Audio present where required; absent where required (OOH/silent).
- [ ] Levels sane, no clipping/distortion.
- [ ] Broadcast: loudness target met (R128 -23 LUFS / A85 -24 LKFS).
- [ ] Music/SFX synced; no dialogue masked.
- [ ] Mix is stereo (or per spec); 48 kHz.

### Content & brand
- [ ] All on-screen text spell-checked (names, prices, URLs).
- [ ] Legal/super/disclaimer present and held long enough to read.
- [ ] Logo lockup correct; clear-space and animation rules honoured.
- [ ] Brand colours match; no placeholder/temp assets remaining.
- [ ] Correct version of copy/voiceover/product.

### Safe areas & captions
- [ ] Critical content inside safe area for each platform.
- [ ] Nothing important under platform UI (bottom/right on 9:16).
- [ ] Captions accurate, synced, inside caption-safe zone.
- [ ] Caption styling legible (contrast, weight, 1-2 lines).

### Technical export
- [ ] Codec + bitrate match the platform/broadcast spec.
- [ ] File size within platform limits.
- [ ] No upload re-compression surprises (spot-check on a test upload).
- [ ] File plays on a fresh machine / different player.
- [ ] Colour looks correct outside the editing app (gamma shift check).

### Naming & versioning
- [ ] File names follow the convention (below).
- [ ] Final version clearly flagged; old versions removed from delivery folder.

## File naming convention

```
[client]_[project]_[deliverable]_[ratio]_[duration]_v[NN]_[date].[ext]
e.g.  acme_launch_hero_16x9_30s_v03_20260710.mp4
      acme_launch_reel_9x16_15s_v03_20260710_CAPTIONED.mp4
```
Rules: lowercase, no spaces, ISO date (YYYYMMDD), zero-padded versions,
flag CAPTIONED / TEXTLESS / BROADCAST explicitly.

## Collect-Files / handover packaging

Deliver in a clean, dated folder:

```
/Delivery_[project]_[date]/
  /01_Final_Exports/        ← all approved deliverables, named per convention
  /02_Captioned/            ← burned-in versions + .srt/.vtt sidecars
  /03_Textless_Masters/     ← clean versions (if applicable)
  /04_Stills/               ← end-frames, thumbnails, poster frames
  /05_Source_(optional)/    ← project files if contracted to hand over
  /README.txt               ← deliverable list, specs, fonts/licences used
```

### Source-file collect (if handing over project files)
- [ ] Run the app's "collect files / archive" so all footage, images, audio, fonts are gathered.
- [ ] Include or list all third-party plugins used.
- [ ] Include font files (or note licences) and music/stock licences.
- [ ] Remove unused comps/layers; flatten the timeline structure.
- [ ] Test-open the collected project on another machine.

### Licences & rights note in README
- [ ] List every stock/music/font asset and its licence scope (usage, term, territory).
- [ ] State the agreed usage rights for the final deliverables.

---
Match each platform's specs and QC before handoff and delivery passes clean. Built by **[iart.ai](https://iart.ai/?utm_source=github&utm_medium=readme&utm_campaign=freelance-motion-skills&utm_content=skill_footer&utm_term=video-delivery-specs)** — the AI motion agent for editable, on-brand motion graphics.
