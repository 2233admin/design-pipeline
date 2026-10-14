---
name: text-message-animation
description: This skill should be used when the user asks to "make a fake text message video", "animate an iMessage conversation", "create a text story video", "do a chat reply animation", "WhatsApp/SMS conversation video", "typing indicator animation", "render a chat thread to a video", or "batch text-message videos from a script/CSV". Covers sent/received bubble layout, staggered appear timing with typing indicators, read receipts/timestamps, per-message pop sound-sync, 9:16 safe-area, and data-driven render from a messages array.
version: 0.1.0
---

# Text Message Animation

Turn a chat script into a scroll-stopping conversation video: bubbles appear one at a time, a typing indicator pulses before each reply, sounds pop on send, and the thread auto-scrolls to keep the newest message in frame. This is one of the highest-retention faceless short-form formats — a story told in iMessage/WhatsApp/SMS bubbles that the viewer reads like they're peeking at someone's phone.

## When to use

- "Fake text" / chat-story videos for TikTok, Reels, and Shorts (9:16 vertical).
- Animating an iMessage, WhatsApp, or generic SMS conversation from a script.
- Reply/comment-reaction videos where a thread reveals a punchline message-by-message.
- Batch-producing many chat videos from one template + a messages array or CSV.

## Two non-negotiable rules

1. **One message reveals at a time, on a rhythm.** The retention comes from the drip: a beat of typing, then a bubble pops in, then a pause to read. Never dump the whole thread at frame 0 — pace it like a real conversation (a typing indicator before received replies, a short read-gap after each bubble).
2. **The chrome must read as the real app, instantly.** Sent = right, blue (iMessage) or green (SMS) / WhatsApp-green; received = left, gray. Tail on the last bubble of a run, rounded ~18–22px, correct status bar and header. If a viewer can't tell which app it is in the first half-second, the illusion breaks.

## The data model — script first, render second

Everything is one array of messages. Author the story as data; the renderer just plays it. This is what makes the format batchable: one template × N scripts → N videos.

```ts
type Message = {
  from: "me" | "them";        // me = sent (right/blue), them = received (left/gray)
  text: string;
  typingMs?: number;          // show typing indicator this long before the bubble (received only)
  delayMs?: number;           // read-gap AFTER the previous bubble, before this one
  status?: "delivered" | "read";  // receipt under the last sent bubble
  reaction?: "❤️" | "👍" | "😂" | "‼️" | "❓"; // tapback, lands ~400ms after the bubble
};

const thread: Message[] = [
  { from: "them", text: "wait you're WHERE right now", typingMs: 900 },
  { from: "me",   text: "outside your house 🙂", delayMs: 600, status: "read" },
  { from: "them", text: "...", typingMs: 1400, reaction: "❓" },
];
```

Derive every frame timestamp from this array — see "Timing" below. Keep `text`/`from` as the only required fields so a CSV (`from,text,typingMs,delayMs,status`) maps straight in.

## Bubble layout & alignment

A bubble is a max-width pill aligned to its side. Sent hugs the right rail; received hugs the left. Stack vertically in send order; the last bubble of a consecutive same-sender run gets the tail.

```tsx
const BUBBLE: React.CSSProperties = {
  maxWidth: "74%",                // never full-width — leaves the "this is a phone" gutter
  padding: "14px 18px",
  borderRadius: 22,
  fontSize: 34,                   // ~iMessage proportions at 1080px wide
  lineHeight: 1.25,
  wordBreak: "break-word",
};
const SENT: React.CSSProperties = {
  ...BUBBLE, alignSelf: "flex-end", background: "#0A84FF", color: "#fff",      // iMessage blue
};
const RECEIVED: React.CSSProperties = {
  ...BUBBLE, alignSelf: "flex-start", background: "#3B3B3D", color: "#fff",    // dark-mode gray
};
```

Palette cheat-sheet: iMessage sent `#0A84FF` (light bg `#1C1C1E`), received `#E9E9EB` text `#000` (light) / `#3B3B3D` (dark). SMS sent green `#37C24A`. WhatsApp sent `#005C4B`, received `#202C33` on a `#0B141A` chat wallpaper, with check-marks (gray = sent, blue `#53BDEB` = read). Match ONE app fully; don't mix iMessage chrome with WhatsApp ticks.

## Staggered appear + typing indicator

Each bubble springs up from slightly below with a small scale pop, anchored to its own entrance frame. Received messages are preceded by a three-dot typing bubble that pulses, then is replaced by the real bubble.

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";

const Bubble: React.FC<{ enterFrame: number; sent: boolean; children: React.ReactNode }> =
({ enterFrame, sent, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - enterFrame, fps, config: { damping: 14, mass: 0.7 } });
  return (
    <div style={{
      alignSelf: sent ? "flex-end" : "flex-start",
      transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px) scale(${interpolate(p, [0, 1], [0.85, 1])})`,
      opacity: interpolate(p, [0, 1], [0, 1]),
      transformOrigin: sent ? "bottom right" : "bottom left",
    }}>{children}</div>
  );
};

// three-dot typing indicator — dots breathe on a sine, frame-driven (no CSS animation timers)
const Typing: React.FC = () => {
  const frame = useCurrentFrame();
  const dot = (i: number) => 0.4 + 0.6 * (0.5 + 0.5 * Math.sin((frame / 8) - i * 0.9));
  return (
    <div style={{ ...RECEIVED, display: "flex", gap: 8, padding: "18px 20px" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 12, height: 12, borderRadius: 6, background: "#aaa", opacity: dot(i) }} />
      ))}
    </div>
  );
};
```

Place the typing indicator in a `<Sequence from={typingStart} durationInFrames={typingLen}>` immediately before the bubble's `<Sequence>` so it shows, then swaps to the real bubble. Only received messages type; sent messages just pop (you don't watch yourself type).

## Timing — turn the array into frames

Walk the messages, accumulating a cursor in ms. This is the single source of truth that the spring entrances, typing windows, sounds, and auto-scroll all read from.

```ts
const f = (ms: number) => Math.round((ms / 1000) * fps);
let cursor = 0;
const timeline = thread.map((m) => {
  cursor += m.delayMs ?? 500;                          // read-gap before this message
  const typingLen = m.from === "them" ? (m.typingMs ?? 800) : 0;
  const typingStart = cursor;
  cursor += typingLen;                                 // typing plays during the gap
  const enterMs = cursor;                              // bubble pops the instant typing ends
  cursor += 250;                                       // settle before the next read-gap
  return { ...m, typingStartMs: typingStart, typingLenMs: typingLen, enterMs };
});
const durationMs = cursor + 1000;                      // tail pad so the last bubble is readable
```

Tune the feel: snappy/punchy threads use `delayMs` 300–500 and `typingMs` 500–900; suspenseful reveals stretch `typingMs` to 1500–2500 before the payoff line. Compute `durationInFrames` from `durationMs` in `calculateMetadata` so a longer script makes a longer video automatically.

## Read receipts, timestamps & reactions

- **Receipt** ("Delivered" / "Read") renders small and right-aligned under the last *sent* bubble; fade it in ~300ms after the bubble lands. On WhatsApp this is the double-check turning blue instead.
- **Timestamp** ("Today 9:41 PM") is a centered gray divider above the first message of a new time block — don't stamp every bubble.
- **Reaction / tapback** scales-in over the corner of its target bubble ~400ms after the bubble appears, with a tiny overshoot. Anchor it to that bubble's `enterMs + 400`, not a global frame.

## Auto-scroll — keep the newest bubble in frame

Once the stack grows past the visible area, translate the whole thread up so the latest bubble sits in the lower third. Animate the scroll offset toward the target with a spring each time a message lands — it should glide, not jump.

```tsx
// targetY = total height of messages above the viewport floor, recomputed as bubbles enter
const scroll = spring({ frame: frame - lastEnterFrame, fps, config: { damping: 200 } });
const y = prevY + (targetY - prevY) * scroll;   // ease from old offset to new
return <div style={{ transform: `translateY(${-y}px)` }}>{/* bubbles */}</div>;
```

Keep the newest bubble clear of the bottom safe area (see below) so the receipt/typing dots underneath stay visible.

## Sound-sync (pop per message)

A crisp "swoosh/pop" on each send and a softer "ding" on each receive is half of why this format feels real. Place one audio cue per message at that message's `enterMs`, in the same timebase as the visuals.

```tsx
import { Audio, staticFile, Sequence } from "remotion";
{timeline.map((m, i) => (
  <Sequence key={i} from={f(m.enterMs)}>
    <Audio src={staticFile(m.from === "me" ? "send.mp3" : "receive.mp3")} />
  </Sequence>
))}
```

Optionally add a quiet keyboard-tick bed under each typing window. Keep cues short (<300ms) so they don't pile up on fast threads. Never trigger sound off a timer — schedule it on the frame timeline so it survives headless render.

## Safe-area for 9:16 (1080×1920)

| Zone | Keep clear | Why |
|---|---|---|
| Top status bar | ~120px | Your fake status bar / notch lives here; don't put bubbles under it |
| App header | ~150px (avatar + name) | The contact header sells the app — keep it pinned and unobstructed |
| Bottom input + UI | ~360px | Fake compose bar AND the platform's caption/CTA/audio UI both crowd the bottom |
| Side gutters | center ~88% width | Bubbles never touch the screen edge — the gutter is what reads as "a phone" |

Run the live conversation in the band between the header and the compose bar. Land each new bubble in the lower third of that band (above the input), then auto-scroll — that's where the eye expects the newest message.

## Output checklist

- One messages array drives everything; timestamps derived, not hand-placed.
- One message at a time: read-gap → typing (received only) → pop, on a tuned rhythm.
- Correct app chrome end-to-end (colors, tails, header, receipts) — no mixing apps.
- Sent right/blue-or-green, received left/gray; tail on the last of each run.
- Receipt under last sent bubble; timestamp divider per time-block; tapbacks overshoot in.
- Auto-scroll keeps the newest bubble in the lower third, clear of the safe areas.
- One pop/ding per message, scheduled on the frame timeline (not timers).
- Header pinned under the status bar; conversation inside the 9:16 safe band.

## Deliver & verify (rendered stills → MP4)

> **Packaged helper** (`scripts/`): tile your stills with `scripts/contact-sheet.sh sheet.png f-hook.png f-mid.png f-end.png`, then assert the encode with `scripts/probe-mp4.sh out.mp4 [WxH] [fps]`. See `scripts/README.md`.

Ships as a Remotion composition (`<Composition>` + zod `schema` + `defaultProps`) whose props are the messages array. Every bubble entrance, typing pulse, scroll offset, and sound cue is frame-driven off `useCurrentFrame()` — never `Date.now()` / `Math.random()` / CSS-animation timers — so any frame renders identically headless. Deliverable = `out/*.mp4` + the project (re-render with a new script). 9:16 vertical (1080×1920) is the default. Duration is data-dependent, so compute `durationInFrames` in `calculateMetadata` from the timeline cursor, never by hand.

**Verify loop — render stills → inspect → encode.** Reveal timing and scroll position are what break; check exact frames before you spend an encode.

```bash
# Stills WITH SHIPPED PROPS (the real thread) at: a typing beat / a mid pop / the last bubble
npx remotion still TextThread out/f-typing.png --frame=24  --props='{"threadSrc":"thread.json"}'
npx remotion still TextThread out/f-mid.png    --frame=90  --props='{"threadSrc":"thread.json"}'
npx remotion still TextThread out/f-end.png    --frame=N   --props='{"threadSrc":"thread.json"}'  # N = durationInFrames-1

# Inspect each PNG:
#  - frame 24 shows the three-dot typing indicator on the LEFT (received), no real bubble yet
#  - at the mid frame the just-landed bubble is on the correct side/color with its tail; receipt/reaction placed right
#  - thread is auto-scrolled so the newest bubble sits in the lower third, NOT hidden under the compose bar
#  - app chrome consistent (status bar, header) and inside the 9:16 safe band; nothing under the top notch

npx remotion render TextThread out/thread.mp4 --props='{"threadSrc":"thread.json"}'   # encode once stills are right
npx remotion render TextThread out/demo.gif --codec=gif                               # README proof clip
```

Use `npx remotion compositions` to read `durationInFrames`/`fps` and pick the typing/mid/end frames. For a quick no-build preview, the same layout renders as a standalone HTML page with a `?t=N` seek harness — see `references/bubble-recipes.md`.

**Before you finish:**
1. Stills render cleanly at a typing frame, a mid pop, and the last bubble — no missing fonts/audio.
2. At a typing frame the indicator (not the bubble) shows on the received side; the bubble pops only after.
3. Each bubble is on the correct side/color with the right tail; receipt/timestamp/reaction land where expected.
4. Auto-scroll keeps the newest bubble in the lower third and inside the 9:16 safe area at every checked frame.
5. Frame-driven only (no `Date.now()`/`Math.random()`/timers); shipped props render correctly; MP4 + optional GIF emitted.

## Reference files

- `references/bubble-recipes.md` — copy-ready build: iMessage/WhatsApp/SMS chrome and palettes, the message data model → frame timeline, spring bubble + tail, three-dot typing indicator, read receipts/timestamps/tapbacks, auto-scroll, per-message sound scheduling, the full Remotion composition with `calculateMetadata`, and a standalone-HTML preview with the `?t=N` seek harness.
- `references/data-driven.md` — the script→messages data shape, authoring threads as JSON/CSV, mapping a CSV into the `Message[]` type, and batch-rendering many videos from one template with `@remotion/renderer`.
