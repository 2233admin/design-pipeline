# Safe-Area Maps

Keep titles and key action inside the safe zone. The danger zones are where the platform draws its own UI on top of the video.

## 9:16 — Reels / TikTok / Shorts / Story (1080×1920)

```
 0 ┌──────────────────────────┐  ← top ~250px: handle, close,
   │░░░░░ TOP UI DANGER ░░░░░░│     sound name (Story/Reels)
250├──────────────────────────┤
   │                          │
   │      SAFE / ACTION       │ ← keep message + logo here
   │      (centre ~1080×1080) │
   │                       ░░░│
   │                       ░░░│ ← TikTok right column
   │                       ░░░│   ~120px: like/comment/share
1520├─────────────────────────┤
   │░░░ BOTTOM UI DANGER ░░░░░│ ← bottom ~250-400px: caption,
1920└──────────────────────────┘     CTA, username, progress
```

Rules:
- Captions and key text: above the bottom band, not under it.
- Logos/CTAs: avoid the bottom 400px and (TikTok) the right 120px.
- Treat the centre 1080×1080 square as the always-safe core.

## 4:5 — IG Feed (1080×1350)

```
┌──────────────────┐
│   light top pad  │
│                  │
│   SAFE (most of  │ ← minimal UI overlay; small bottom
│   the frame)     │   caption/like row may sit just under
│                  │
│░░ slight bottom ░│
└──────────────────┘
```
Light side margins (~5%) keep text off the rounded crop.

## 1:1 — Square (1080×1080)

```
┌────────────────────┐
│  ~5% margin all     │
│ ┌────────────────┐  │
│ │   TITLE-SAFE   │  │
│ │                │  │
│ └────────────────┘  │
└────────────────────┘
```
Keep critical content inside a ~5% inset on all sides.

## 16:9 — Broadcast (1920×1080)

```
┌────────────────────────────────────┐  edge of frame
│  ┌──────────────────────────────┐  │  action-safe 93%
│  │  ┌────────────────────────┐  │  │
│  │  │     TITLE-SAFE 90%     │  │  │ ← all text inside here
│  │  │                        │  │  │
│  │  └────────────────────────┘  │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```
- Title-safe: inner 90% → ~96px L/R, ~54px T/B margins.
- Action-safe: inner 93%.
- Nothing legally required (supers, disclaimers) outside title-safe.

## OOH / signage

No fixed standard — use the vendor's pixel-exact template and bleed.
Assume distance viewing: oversize type, maximize contrast, avoid thin
strokes and edge-hugging elements.

## Quick pixel reference (margins)

| Ratio | Frame | Top danger | Bottom danger | Side danger |
|---|---|---|---|---|
| 9:16 | 1080×1920 | ~250px | ~250-400px | TikTok right ~120px |
| 16:9 broadcast | 1920×1080 | title-safe 54px | 54px | 96px |
| 1:1 | 1080×1080 | ~54px | ~54px | ~54px |
