# Full Platform Spec Sheet

Specs drift over time and vary by app version; treat as a practical baseline and confirm against the platform's current creator docs for high-stakes delivery. Audio default: AAC, 48 kHz, stereo, 256-320 kbps.

## Instagram

| Placement | Ratio | Pixels | Max duration | Codec / container | File limit | Notes |
|---|---|---|---|---|---|---|
| Reels | 9:16 | 1080×1920 | ~90s (up to 3 min) | H.264, MP4/MOV | ~1 GB practical | UI on bottom + right; centre-safe |
| Feed video | 4:5 / 1:1 | 1080×1350 / 1080×1080 | 60s | H.264, MP4 | — | 4:5 = most screen |
| Story | 9:16 | 1080×1920 | 60s/card | H.264, MP4 | — | Top ~250 / bottom ~250 reserved |
| Bitrate | — | — | — | 8-12 Mbps (1080p) | — | Higher re-compressed on upload |

## TikTok

| Field | Value |
|---|---|
| Ratio | 9:16 |
| Pixels | 1080×1920 |
| Duration | 15s-10 min (sweet spot 15-60s) |
| Codec | H.264, MP4 or MOV |
| Bitrate | 8-12 Mbps (1080p) |
| Danger zones | Bottom caption/CTA band + right icon column (~120px) |

## YouTube

| Placement | Ratio | Pixels | Codec | Bitrate (rec. upload) |
|---|---|---|---|---|
| Standard | 16:9 | 1920×1080 / 3840×2160 | H.264 / H.265, MP4 | 1080p: 16-20 Mbps; 4K: 35-45 Mbps |
| Shorts | 9:16 | 1080×1920 | H.264, MP4 | 10-15 Mbps |
| Audio | — | — | AAC 384 kbps | 48 kHz stereo |

YouTube re-encodes; upload high (ProRes or high-bitrate H.264) for best result.

## Broadcast (deliver to the broadcaster's exact spec sheet)

| Field | Typical HD value |
|---|---|
| Ratio | 16:9 |
| Pixels | 1920×1080 |
| Frame rate | 25 (PAL) / 29.97 (NTSC) — match region |
| Codec | ProRes 422 HQ (common); some require XDCAM/IMX |
| Scan | Progressive or interlaced per spec |
| Loudness | EBU R128 (-23 LUFS) / ATSC A/85 (-24 LKFS) |
| Safe areas | Title-safe 90%, action-safe 93% |
| Extras | Slate, bars & tone, textless version often required |

Always request and follow the broadcaster's delivery spec PDF; never assume.

## OOH / Digital signage

| Field | Value |
|---|---|
| Ratio | Vendor-specific (often 9:16 portrait or custom) |
| Pixels | Exact to the screen — do not scale |
| Duration | Loop, commonly 8-15s |
| Codec | MP4 (H.264) or ProRes per vendor |
| Audio | Usually none (silent environment) |
| Design | Oversize type; high contrast; viewing distance matters; honour bleed |

## Web (hero / embed)

| Field | Value |
|---|---|
| Ratio | 16:9 or custom container |
| Formats | MP4 (H.264) + WebM (VP9) fallback |
| Bitrate | Compress hard: 2-6 Mbps for hero loops |
| Behaviour | Muted autoplay + loop; provide a poster/first-frame image |
| Accessibility | Provide controls or a pause affordance; respect reduced-motion |
| Size | Keep loops short and small (<5 MB ideal for hero) |

## Frame rate note

Match the master's frame rate to the destination (broadcast region especially). For social, 24/25/30 are all fine; deliver 30 or 60 for smooth fast motion. Never mix rates across a deliverable set without intent.
