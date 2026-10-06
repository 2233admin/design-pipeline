---
name: promo-video
description: This skill should be used when the user asks to "make a sale video", "create a promo video", "build a discount/percentage-off reveal", "animate a was→now price with a strike-through", "do a Black Friday / flash-sale / clearance video", "make a promo-code reveal with a countdown", or "batch a promo template across many products". Covers the offer-announcement arc — discount reveal, price strike-through, promo code, urgency, product shot, CTA — and product+offer data → many videos.
version: 0.1.0
---

# Sale Promo Video

Make a punchy 6–15s sale spot that announces ONE offer and makes a viewer act now: the discount lands, the price drops from was→now with a strike-through, the promo code and deadline read clean, the CTA closes. This is the offer announcement — not a feature ad, not a testimonial. Energy, accurate numbers, urgency.

## When to use

- Discount / percentage-off reveals ("40% OFF", "$20 off").
- was→now price drops with an animated strike-through.
- Black Friday / flash sale / clearance / launch-week / seasonal spots.
- Promo-code reveals with a deadline or countdown.
- One promo template rendered across many products/offers (price table → N videos).

For performance-ad variants use `ad-creative-video`; for customer quotes use `testimonial-video`. Stay on the offer.

## The arc

A sale spot is short and ordered. Each beat does one job; never stack two.

| Beat | Job | Budget (of 10s) |
|---|---|---|
| Hook | Brand + occasion ("BLACK FRIDAY") snaps in | 0–1.5s |
| Discount reveal | The big number lands ("40% OFF") | 1.5–4s |
| was→now | Old price strikes through, new price counts down | 4–7s |
| Product | One hero shot, the thing on offer | (under price, 4–8s) |
| Code + urgency | Promo code + deadline, held still | 7–9s |
| CTA | "SHOP NOW" + URL, clean hold | 9–10s |

Scale tighter for 6s (cut the product beat) or looser for 15s (let each beat breathe). Never lengthen the hook.

## Two non-negotiable rules

1. **The number is the message — keep it exact.** Prices and percentages must be computed, never typed twice. Derive `now` and the `% off` from `was` and the discount so they can't disagree. A promo video that shows the wrong price is worse than no video. Round currency to cents, format with `Intl.NumberFormat`, and use `tabular-nums` so digits don't jitter mid-count.
2. **One offer, one focus per frame.** A single discount, a single code, a single CTA. Competing offers kill the urgency. If there are two deals, make two videos.

## The signature move: was→now with a strike-through

Three things animate together and must stay in sync: the strike-through line draws across the old price, the new price counts down to its final value, and a micro-overshoot punctuates the landing. Drive all three from `useCurrentFrame()` — never a CSS transition or a JS timer — so a server render never desyncs.

```jsx
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const PriceDrop = ({ was = 79.0, now = 47.4, startAt = 30 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - startAt;

  // 1. strike-through line draws L→R over ~0.4s
  const strike = interpolate(f, [0, 12], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // 2. new price counts from `was` down to `now`, eased
  const t = spring({ frame: f - 8, fps, config: { damping: 18, mass: 0.6 } });
  const shown = was + (now - was) * t;
  // 3. landing pop on the final value
  const pop = interpolate(t, [0.9, 1], [1.12, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ fontVariantNumeric: "tabular-nums", textAlign: "center" }}>
      <span style={{ position: "relative", opacity: 0.55, fontSize: 48 }}>
        {usd.format(was)}
        <span style={{ position: "absolute", left: 0, top: "50%", height: 4, background: "#ff3b3b",
                       width: `${strike}%`, transformOrigin: "left" }} />
      </span>
      <div style={{ fontSize: 96, fontWeight: 800, transform: `scale(${pop})` }}>
        {usd.format(shown)}
      </div>
    </div>
  );
};
```

Order matters: strike the old price *first*, then drop the new one. Striking and counting at the same instant reads as a glitch. See `references/promo-components.md` for the full composition (discount badge, code reveal, countdown, CTA) wired to props.

## Discount reveal & promo code

The percentage is the loudest element on screen — bigger than the brand, bigger than the product. Compute it; don't type it.

```js
const pct = Math.round((1 - now / was) * 100);   // 79 → 47.4  ⇒  40
const off = was - now;                            // for "$X off" framing
```

Choose the framing by price: percentage for higher-priced items ("40% OFF" beats "$32 off"), a flat amount for low-priced items ("$5 off" beats "8% off"). Reveal the code as a tappable-looking chip (mono font, dashed border, light background) and hold it still — a moving code can't be read or screenshotted. Codes that encode urgency convert better: `FLASH40`, `TODAY20`, `LASTCHANCE`.

## Urgency that's honest

Urgency lifts conversion only when it's real. Show a concrete deadline ("Ends Sun 11:59pm") or a live-looking countdown — never a fake timer. Viewers need ~2s to read a time-sensitive offer, so hold the deadline beat; don't flash it. Keep the countdown on its own line near the code, not racing the price.

```js
// frame → mm:ss remaining, derived from a deadline prop (deterministic per frame)
const remaining = Math.max(0, deadlineSec - frame / fps);
const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
const ss = String(Math.floor(remaining % 60)).padStart(2, "0");
```

## Motion language: energetic, not chaotic

Sale spots earn their punch from snappy, consistent motion: fast spring entrances (`damping ~12`, overshoot), hard cuts on accents, one accent color for savings (a hot red/green) reused everywhere. Keep ONE enter curve across all beats so speed reads as confidence. Avoid drift/parallax that softens urgency. Land the discount reveal on the strongest audio beat if scored.

## Template × data — many products, one template

The payoff of code-driven promos: a price/offer table renders a video per product, with prices guaranteed accurate because they come from the data, not a designer retyping. Make the offer an input prop; hardcode nothing.

```jsx
// one composition, different offer → different video
export const Promo = ({ offer }) => { /* reads offer.was/now/code/deadline/img — no constants */ };
```
```bash
# render the promo for every offer row in /offers
for f in offers/*.json; do
  npx remotion render Promo "out/$(basename "$f" .json).mp4" --props="$f"
done
```

Validate each row before render (now < was, code present, image exists) so a bad row fails loud instead of shipping a wrong price. Keep colors/fonts/CTA in one theme object so 200 promos stay brand-locked and only the numbers change. See `references/promo-components.md` for the offer schema, validation, and batch script.

## Output checklist

- `now` and `% off` are computed from `was` — never typed twice; rounded and `Intl.NumberFormat`-formatted with `tabular-nums`.
- Strike draws first, new price drops second; both pure functions of `useCurrentFrame()`.
- One offer, one code, one CTA per video; discount is the loudest element.
- Urgency is a real deadline/countdown, held ≥2s, not a fake flashing timer.
- One enter curve and one savings accent color across all beats.
- Offer is an input prop; each data row is validated (now < was) before batch render.

## Deliver & verify (rendered stills → MP4)

> **Packaged helper** (`scripts/`): tile your stills with `scripts/contact-sheet.sh sheet.png f-hook.png f-mid.png f-end.png`, then assert the encode with `scripts/probe-mp4.sh out.mp4 [WxH] [fps]`. See `scripts/README.md`.

This is heavy-tier: the deliverable is an MP4, not a live page. A promo carries exact money — the verify pass is mostly *are the numbers right and is the product image actually there*.

**Output contract:**
- A Remotion project with the composition registered (`<Composition>` + zod `schema` + `defaultProps`); discount reveal, strike-through, count-down and CTA all pure functions of `useCurrentFrame()` (no CSS transitions, timers, `Date.now()`).
- Product image loaded via `staticFile()`, gated with `delayRender`/`continueRender` so the hero shot (and brand font) is present before the frame renders — `now`/`% off` computed from `was`, never typed twice.
- Deliverable = the rendered `out/*.mp4` plus the project (re-render per offer row).

**Verify loop — render stills → inspect → encode.** Cheap PNGs first, video only once the numbers and image are right.

```bash
# Frame-exact stills WITH THE OFFER PROPS YOU'LL SHIP, not defaultProps
npx remotion still Promo out/f-discount.png --frame=60  --props=offer.json   # "40% OFF" big number landed
npx remotion still Promo out/f-price.png    --frame=120 --props=offer.json   # was struck through, now settled
npx remotion still Promo out/f-cta.png      --frame=270 --props=offer.json   # code + deadline + CTA end-card
# end frame = durationInFrames - 1 (npx remotion compositions reads it)
```

Inspect each PNG for **fidelity** (exact `was`/`now`/`% off`; was→now strike-through drawn over the old price; promo code spelled right; product image is the right one) AND **artifacts** (image blank/not loaded, digits jittering or wrong, price overflow/off-canvas, strike on the wrong line, CTA/code outside the title-safe area, wrong aspect/letterboxing).

```bash
# Only after stills are clean:
npx remotion render Promo out/promo.mp4 --props=offer.json
npx remotion render Promo out/promo.gif --props=offer.json --codec=gif   # README first-screen proof
```

**Batch (one template, many products):** when rendering the price table → N videos, verify ONE representative offer's props via stills before batch-rendering the catalog — a wrong price or blank image caught once beats shipping it N times.

**Before you finish:**
1. Stills render cleanly at discount / price / CTA — no errors, product image actually loaded (not blank).
2. `was`/`now`/`% off` are exact (computed from `was`); strike-through over the old price, new price settled, code/deadline correct.
3. All motion frame-driven — no CSS transitions / timers / `Date.now()` / `Math.random()`.
4. The **shipped** offer props render correctly, not just `defaultProps`.
5. Full MP4 encoded and plays; (optional) GIF rendered for the README.

## Reference files

- `references/promo-components.md` — a complete runnable Remotion promo composition driven by an offer prop: discount badge, was→now strike-through + count-down, promo-code chip, live countdown, and CTA end-card — plus the offer schema, per-row validation, the theme object, and the template×data batch render script for N products.
