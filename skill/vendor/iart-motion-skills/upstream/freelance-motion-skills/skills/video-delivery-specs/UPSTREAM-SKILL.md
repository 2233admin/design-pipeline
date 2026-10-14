---
name: video-delivery-specs
description: This skill should be used when the user asks "what are the specs for Instagram Reels / TikTok / YouTube / broadcast", "export settings for social", "what aspect ratio and bitrate", "how do I repurpose 16:9 to 9:16", "safe area / title-safe for vertical", "pre-delivery checklist", or "collect files for handover". It outputs per-platform spec sheets, a cutdown matrix, captioning/accessibility notes, and a QC + collect-files checklist.
version: 0.1.0
---

# Video Delivery Specs

Deliver motion content correctly across platforms: produce per-platform spec sheets, repurpose one master into every aspect ratio safely, handle captions and accessibility, and run a pre-delivery QC and collect-files pass before handover.

## When to use

Use when exporting or delivering finished motion, when targeting multiple platforms from one master, when checking safe areas for UI-overlay platforms, when deciding caption strategy, or when packaging a project for handover/archive.

## Decision tree — master strategy and spec path

Two judgments: *what to build as the master so it survives every crop*, and *which delivery path each platform needs*. Decide the master before animating — re-cropping after the fact is where deliveries break.

```
How many ratios does the brief's distribution need?
├─ One ratio only → animate native to that ratio; no spine needed.
└─ Multiple ratios → build a 16:9 master with a centre 1:1 "title-safe
    spine"; expect to RE-LAYOUT (not just crop) for 9:16.

Per target, which path?
├─ Social (Reels/TikTok/Shorts/Story) → 9:16 1080×1920, H.264 8-12 Mbps,
│   burn in captions, keep action out of top/bottom/right UI zones.
├─ Feed → 4:5 (1080×1350) for most screen real estate.
├─ YouTube long-form → 16:9, upload high-bitrate / ProRes, .srt sidecar.
├─ Broadcast → follow the broadcaster's spec PDF EXACTLY: ProRes 422 HQ,
│   region frame rate, R128/A85 loudness, title-safe 90%, textless + slate.
├─ OOH/signage → pixel-exact to the screen, silent, oversize type.
└─ Web hero → MP4+WebM, muted autoplay loop, compress hard, poster frame.
```

Rule of thumb: if a platform overlays UI (all vertical social), the safe-area map governs layout *before* the spec governs export. Get the layout wrong and no bitrate fixes it.

## Workflow

1. **List target platforms** from the brief's distribution line (Reels, Feed, Story, TikTok, YouTube, Shorts, broadcast, OOH, web).
2. **Pull each platform's spec** (table below; full detail in references/platform-specs.md).
3. **Plan the master + cutdowns** using the repurposing matrix so the 16:9 master survives the crop to 9:16 and 1:1.
4. **Decide captions/accessibility** — burned-in vs uploaded, styling, safe placement.
5. **Run QC** against the checklist, then **collect files** for handover/archive.

## Per-platform spec sheet (essentials)

| Platform | Ratio | Pixels | Duration | Container/codec | Notes |
|---|---|---|---|---|---|
| IG Reels | 9:16 | 1080×1920 | ≤90s (up to 3min) | MP4/MOV, H.264 | UI overlays bottom + right; keep action centre |
| IG Feed | 4:5 or 1:1 | 1080×1350 / 1080×1080 | ≤60s | MP4, H.264 | 4:5 gives most feed real estate |
| IG Story | 9:16 | 1080×1920 | ≤60s/card | MP4, H.264 | Top + bottom ~250px reserved for UI |
| TikTok | 9:16 | 1080×1920 | 15s-10min | MP4/MOV, H.264 | Heavy right-side + bottom UI; caption-safe centre |
| YouTube (horiz) | 16:9 | 1920×1080 (4K 3840×2160) | flexible | MP4, H.264/H.265 | High bitrate; full frame usable |
| YouTube Shorts | 9:16 | 1080×1920 | ≤60s | MP4, H.264 | Bottom UI for title/controls |
| Broadcast (HD) | 16:9 | 1920×1080 | exact to spec | ProRes 422 (HQ) / per broadcaster | Title-safe 90%, action-safe 93%; legal/loudness |
| OOH / digital screen | varies (often 9:16 or custom) | per-site | loop, often 10-15s | MP4/ProRes per vendor | No sound; high legibility; supplied pixel-exact |
| Web (hero/embed) | 16:9 or custom | responsive | short loop | MP4 (H.264) + WebM; poster frame | Compress hard; muted autoplay; provide fallback |

Bitrate guidance (H.264): 1080p social 8-12 Mbps; 1080p high-quality 16-20 Mbps; 4K 35-45 Mbps. Audio AAC 320 kbps stereo, 48 kHz. For broadcast/archive use ProRes 422 HQ, not H.264. Full codec/bitrate detail in references/platform-specs.md.

## Safe areas and UI danger zones

Social platforms overlay UI on top of the video. Keep titles and key action out of these zones:

- **9:16 (Reels/TikTok/Shorts/Story)**: reserve top ~250px (handle/close) and bottom ~250-400px (caption, CTA, controls). On TikTok also reserve the right ~120px column (icons). Keep essential text within the centre ~1080×1080 region.
- **16:9 broadcast**: title-safe = inner 90%, action-safe = inner 93%. Nothing critical outside title-safe.
- **OOH**: follow the vendor's exact pixel map and bleed; assume viewing distance — oversize type.

A visual map of each zone is in references/safe-areas.md.

## Cutdown / repurposing matrix (one master → all ratios)

Design the 16:9 master so the centre survives cropping. Plan it before animating, not after.

| From → To | Method | Watch for |
|---|---|---|
| 16:9 → 1:1 | Crop sides to centre 1080 | Text near left/right edges gets cut |
| 16:9 → 9:16 | Crop hard to centre + re-stack elements vertically | Wide compositions break; reflow text/logos |
| 16:9 → 4:5 | Light side-crop | Usually safe if action is centred |
| Master → 6s/15s cutdown | Pick the hook + payoff; drop middle | Re-time, don't just trim; keep brand + CTA |

Best practice: build a **"title-safe 1:1 spine"** down the centre of the 16:9 master so every crop keeps the message. For 9:16, expect to re-layout rather than crop — budget time for it. Full matrix and a reflow recipe in references/repurposing-matrix.md.

## Captions and accessibility

- **Open (burned-in) captions**: baked into the video. Default for social — most users watch muted, and platform auto-captions are unreliable. Always burn captions for Reels/TikTok/Shorts.
- **Closed captions (.srt/.vtt sidecar)**: uploaded separately; user-toggleable. Required for YouTube long-form and broadcast accessibility compliance; good practice everywhere.
- **Styling for burned-in**: high contrast (white text, subtle shadow or box), legible weight, 1-2 lines max, placed inside the caption-safe zone (above the bottom UI band, not under it). Sync to speech; ~1-2s per line minimum.
- **Beyond captions**: avoid conveying meaning by colour alone; keep flashing under 3 flashes/sec (photosensitivity); provide a descriptive title/transcript for screen readers where the platform allows.

## Pre-delivery QC checklist (top items)

- Correct dimensions, ratio, and duration for each target.
- First and last frames clean (no black flash, no held render frame).
- Audio present, levels sane, no clipping; broadcast: correct loudness target.
- All text spell-checked; legal/super present and held long enough.
- Logo lockup correct; brand colours match; no placeholder assets.
- Safe areas respected; nothing critical under platform UI.
- Captions accurate and inside the caption-safe zone.
- Export matches codec/bitrate spec; file plays on a fresh machine.
- File names follow convention; versions not mixed up.

Full QC + collect-files checklist in references/qc-checklist.md.

## Worked examples

**GOOD — one master planned for every crop:**
> Brief needs 16:9 (web), 1:1 (feed), and 9:16 (Reels + TikTok). You animate a 16:9 master keeping all titles and the logo inside a centre 1:1 spine, then crop to 1:1 cleanly and *re-layout* (not crop) to 9:16 — restacking the headline above the product, captions burned in above the bottom UI band, action clear of TikTok's right column. Each export matches its platform's bitrate; captions sit inside the caption-safe zone.

**ANTI-PATTERN — "we'll just crop it later":**
> A wide 16:9 hero with the logo bottom-left and a tagline spanning the full width gets center-cropped to 9:16 for Reels. The logo is gone, half the tagline is cut, and the burned-in captions land under the platform's CTA bar where no one can read them.

Why it fails: the master wasn't designed for the crop, and the safe-area map was ignored. The fix is the master strategy above — centre spine, re-layout for vertical, captions above the UI band — decided *before* animation, not after delivery is due.

## Common mistakes

| Symptom | Why it happens | Fix |
|---|---|---|
| Text/logo cut off after crop | Composed wide, no centre spine | Build a centre 1:1 title-safe spine; re-layout for 9:16 |
| Captions hidden under platform UI | Placed at frame bottom, not caption-safe zone | Keep captions above the bottom UI band, inside caption-safe |
| Broadcast delivery rejected | Used H.264 / wrong loudness / no textless | Follow the broadcaster spec PDF: ProRes, R128/A85, slate, textless |
| Video looks soft after upload | Exported at low bitrate; platform re-compresses | Upload high-bitrate / ProRes; let the platform downscale |
| Black flash at start/end | Held render frame or stray black frame | QC first/last frames; trim to intended frames |
| Colour shifts outside the editor | Gamma/colour-management mismatch | Spot-check the export in a neutral player before handover |
| Wrong file delivered | Versions mixed in the folder | Enforce the naming convention; flag CAPTIONED/TEXTLESS/BROADCAST |
| Autoplay web hero won't play | Has audio / too large / no fallback | Muted MP4+WebM, compress hard, poster frame |

## Deliverable spec — what a good handover contains

The output is a packaged, dated delivery folder plus the QC pass behind it (full structure in references/qc-checklist.md). A good handover:
- Has every deliverable at the correct ratio, pixels, duration, codec, and bitrate for its target.
- Separates final exports, captioned versions (+ .srt/.vtt), textless masters, and stills.
- Includes a README listing deliverables, specs, and every font/music/stock licence with its usage scope.
- Uses the file-naming convention consistently, with the final version clearly flagged.
- Has passed the full pre-delivery QC checklist before it leaves.

### Before you finish — checklist
- [ ] Each target's dimensions, ratio, duration, codec, and bitrate verified.
- [ ] First/last frames clean; no dropped frames or artifacts.
- [ ] Audio correct (or correctly absent); broadcast loudness met.
- [ ] Text spell-checked; legal/super held long enough; logo lockup correct.
- [ ] Safe areas respected; nothing critical under platform UI.
- [ ] Captions accurate, synced, inside the caption-safe zone.
- [ ] Plays on a fresh machine; colour correct outside the editor.
- [ ] File names follow the convention; final version flagged; old versions removed.
- [ ] Handover folder structured; README + licence/rights notes included.

## Quick reference

| Need | Answer |
|---|---|
| Reels/TikTok/Shorts ratio | 9:16, 1080×1920 |
| Feed best ratio | 4:5 (1080×1350) |
| Social bitrate (1080p) | 8-12 Mbps H.264 |
| Broadcast codec | ProRes 422 HQ, not H.264 |
| Captions for social | Burn them in (open) |
| TikTok danger zones | Bottom + right column |
| Broadcast title-safe | Inner 90% |
| One master strategy | Centre 1:1 spine in the 16:9 |

## Reference files

- `references/platform-specs.md` — full per-platform spec sheet: exact pixels, durations, codecs, bitrates, audio, and file-size limits.
- `references/safe-areas.md` — ASCII safe-area maps per ratio with pixel measurements for UI danger zones.
- `references/repurposing-matrix.md` — full cutdown matrix and a step-by-step 16:9→9:16 reflow recipe.
- `references/qc-checklist.md` — complete pre-delivery QC checklist plus the Collect-Files / handover packaging list and naming convention.
