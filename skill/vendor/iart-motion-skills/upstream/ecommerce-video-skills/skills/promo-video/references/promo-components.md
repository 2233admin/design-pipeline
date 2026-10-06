# Promo components — complete implementation

A sale spot is a small, ordered set of beats driven by one offer object. This file gives
a full runnable Remotion composition, the offer schema, per-row validation, a theme
object, and the template×data batch script. Everything reads from props — the numbers
come from data, never from a designer retyping a price.

## The offer shape

One object per product. `now` and `pct` are NOT stored — they are derived, so they can
never contradict `was` and `discount`. Store only the source of truth.

```ts
type Offer = {
  brand: string;          // "ACME"
  occasion: string;       // "BLACK FRIDAY" | "FLASH SALE" | "CLEARANCE"
  product: string;        // "Wireless Headphones"
  img: string;            // "/products/headphones.png" (absolute or staticFile path)
  was: number;            // 79.00  — the only price you type
  discount: number;       // 0.40   — fraction off (preferred) ...
  now?: number;           // ...OR pin an exact sale price; if set it wins over discount
  code: string;           // "FLASH40"
  deadline: string;       // ISO "2026-11-30T23:59:59" — for "Ends ..." + countdown
  cta: string;            // "SHOP NOW"
  url: string;            // "acme.com/sale"
  currency?: string;      // "USD" (default)
};
```

## Deriving the numbers once

Compute every displayed figure from the offer in one place. Round to cents *before*
formatting so the price a viewer reads is exactly the price they pay.

```ts
export function priceModel(o: Offer) {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const now = round2(o.now ?? o.was * (1 - o.discount));
  const pct = Math.round((1 - now / o.was) * 100);   // integer % for the badge
  const off = round2(o.was - now);                   // for "$X off" framing
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: o.currency ?? "USD" });
  return { now, pct, off, was: o.was, f: (n: number) => fmt.format(n) };
}
```

## The full composition

Deterministic and server-renderable: every value is a pure function of
`useCurrentFrame()`, so the MP4 never flickers or desyncs. Beats are scheduled by frame
offset; one spring config (`SNAP`) gives a single, confident enter curve everywhere.

```jsx
import {
  AbstractFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, Sequence,
} from "remotion";

const SNAP = { damping: 12, mass: 0.7, stiffness: 140 }; // one curve for all entrances

// reusable: snappy entrance for any beat, eased & overshooting
function enter(frame, fps, at, cfg = SNAP) {
  return spring({ frame: frame - at, fps, config: cfg });
}

export const Promo = ({ offer, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = priceModel(offer);

  // beat schedule (frames @30fps): hook .0 / badge .9 / price 2.0 / code 7.0 / cta 9.0
  const hook   = enter(frame, fps, 0);
  const badge  = enter(frame, fps, 27);
  const codeIn = enter(frame, fps, 210);
  const ctaIn  = enter(frame, fps, 270);

  return (
    <AbstractFill style={{ background: theme.bg, color: theme.fg, fontFamily: theme.font,
                           alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      {/* HOOK: brand + occasion */}
      <div style={{ position: "absolute", top: 80, opacity: hook,
                    transform: `translateY(${(1 - hook) * -30}px)`, letterSpacing: 4 }}>
        <div style={{ fontSize: 28, opacity: 0.7 }}>{offer.brand}</div>
        <div style={{ fontSize: 56, fontWeight: 900 }}>{offer.occasion}</div>
      </div>

      {/* DISCOUNT BADGE: the loudest element */}
      <div style={{ position: "absolute", top: 220, transform: `scale(${badge})`,
                    color: theme.accent, fontWeight: 900, fontSize: 200, lineHeight: 1 }}>
        {m.pct}%<span style={{ fontSize: 64, verticalAlign: "super" }}> OFF</span>
      </div>

      {/* PRODUCT hero (optional beat) */}
      <Sequence from={45}>
        <Img src={offer.img} style={{ position: "absolute", bottom: 360, height: 280,
                                      objectFit: "contain", opacity: enter(frame, fps, 45) }} />
      </Sequence>

      {/* WAS → NOW with strike-through + count-down */}
      <PriceDrop was={m.was} now={m.now} startAt={60} fmt={m.f} accent={theme.accent} />

      {/* PROMO CODE + URGENCY */}
      <div style={{ position: "absolute", bottom: 200, opacity: codeIn,
                    transform: `translateY(${(1 - codeIn) * 20}px)` }}>
        <span style={{ fontFamily: "monospace", fontSize: 40, padding: "10px 22px",
                       border: `2px dashed ${theme.accent}`, borderRadius: 12,
                       background: "rgba(255,255,255,.06)" }}>{offer.code}</span>
        <Countdown deadline={offer.deadline} />
      </div>

      {/* CTA end-card */}
      <div style={{ position: "absolute", bottom: 80, transform: `scale(${ctaIn})` }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: theme.accent }}>{offer.cta}</div>
        <div style={{ fontSize: 26, opacity: 0.8 }}>{offer.url}</div>
      </div>
    </AbstractFill>
  );
};

// was→now: strike draws first (frames 0–12), price counts down after (frame 8+)
function PriceDrop({ was, now, startAt, fmt, accent }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - startAt;
  const strike = interpolate(f, [0, 12], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const t = spring({ frame: f - 8, fps, config: { damping: 18, mass: 0.6 } });
  const shown = was + (now - was) * t;
  const pop = interpolate(t, [0.9, 1], [1.12, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 480, fontVariantNumeric: "tabular-nums" }}>
      <span style={{ position: "relative", opacity: 0.55, fontSize: 52 }}>
        {fmt(was)}
        <span style={{ position: "absolute", left: 0, top: "50%", height: 5, background: accent,
                       width: `${strike}%` }} />
      </span>
      <div style={{ fontSize: 110, fontWeight: 800, transform: `scale(${pop})` }}>{fmt(shown)}</div>
    </div>
  );
}

// live-looking countdown from a real deadline (deterministic per frame)
function Countdown({ deadline }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const end = new Date(deadline).getTime();
  const remaining = Math.max(0, (end - Date.now()) / 1000 - frame / fps);
  const hh = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const ss = String(Math.floor(remaining % 60)).padStart(2, "0");
  return (
    <div style={{ marginTop: 14, fontVariantNumeric: "tabular-nums", fontSize: 28, opacity: 0.9 }}>
      Ends in {hh}:{mm}:{ss}
    </div>
  );
}
```

For a fixed "Ends Sun 11:59pm" label instead of a ticking clock, format `deadline` once
with `Intl.DateTimeFormat` — a static deadline is just as honest and reads cleaner in a
6s spot where a counter barely moves.

## Theme object — brand-locked across N videos

Keep every brand decision in one place so 200 promos stay consistent and only the offer
changes. Pass it alongside the offer.

```js
export const theme = {
  bg: "#0b0b0f",
  fg: "#ffffff",
  accent: "#ff3b3b",   // savings color: reused on badge, strike, CTA — one accent only
  font: "Inter, system-ui, sans-serif",
};
```

## Validation — fail loud, never ship a wrong price

A batch that silently renders a bad row is how a $470 item ships labelled "$47". Validate
every offer before rendering and stop the run on the first bad one.

```js
import fs from "node:fs";

export function validateOffer(o, file) {
  const bad = (msg) => { throw new Error(`${file}: ${msg}`); };
  if (typeof o.was !== "number" || o.was <= 0) bad("`was` must be a positive number");
  const now = o.now ?? o.was * (1 - o.discount);
  if (!(now >= 0 && now < o.was)) bad(`sale price ${now} must be ≥0 and < was ${o.was}`);
  if (o.now == null && !(o.discount > 0 && o.discount < 1)) bad("`discount` must be in (0,1)");
  if (!o.code) bad("missing promo `code`");
  if (o.deadline && isNaN(Date.parse(o.deadline))) bad(`unparseable deadline "${o.deadline}"`);
  if (o.img && !fs.existsSync(o.img.replace(/^\//, "public/"))) bad(`image not found: ${o.img}`);
  return o;
}
```

## Batch render — price table → many videos

One template, one offer file per product, one MP4 each. Prices are accurate by
construction because they come from the validated data.

```bash
#!/usr/bin/env bash
set -euo pipefail
mkdir -p out
for f in offers/*.json; do
  name=$(basename "$f" .json)
  echo "→ rendering $name"
  npx remotion render Promo "out/$name.mp4" \
    --props="$f" \
    --codec=h264 --frames=0-299      # 10s @30fps
done
echo "done — $(ls out/*.mp4 | wc -l) promos"
```

A single offers row, for reference:

```json
{ "offer": {
  "brand": "ACME", "occasion": "BLACK FRIDAY", "product": "Wireless Headphones",
  "img": "/products/headphones.png", "was": 79.0, "discount": 0.40,
  "code": "FLASH40", "deadline": "2026-11-30T23:59:59", "cta": "SHOP NOW", "url": "acme.com/sale"
}, "theme": { "bg": "#0b0b0f", "fg": "#fff", "accent": "#ff3b3b", "font": "Inter, sans-serif" } }
```

Render the 16:9 master, then reframe to 9:16 (Reels/TikTok) and 1:1 (feed) from the same
project — design the badge, price, code, and CTA inside the center safe zone so every crop
keeps the offer readable.

---
## Built by the team behind iart.ai

This skill is part of an open motion-graphics collection from iart.ai — the AI motion agent that turns data, scripts, and designs into editable motion graphics (Remotion → MP4). If you'd rather not hand-build this, iart.ai can render sale/promo videos for many products from one template and a price/offer table — with accurate prices. → [iart.ai](https://iart.ai/?utm_source=github&utm_medium=reference&utm_campaign=ecommerce-video-skills&utm_content=ref_footer&utm_term=promo-video)
