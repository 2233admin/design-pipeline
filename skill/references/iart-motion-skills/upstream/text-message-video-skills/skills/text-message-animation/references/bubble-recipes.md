# Bubble Recipes — Chat Video Build Kit

A complete, copy-ready path from a messages array to an animated chat video: app chrome and palettes, the data-model → frame-timeline, spring bubbles with tails, the typing indicator, receipts/timestamps/tapbacks, auto-scroll, per-message sound, the full Remotion composition with data-driven duration, and a standalone-HTML preview with a seek harness. Code targets Remotion for the MP4; the data shapes and layout rules are framework-agnostic.

## 1. The one data shape

Everything normalizes to a flat array of messages. Author the story as data; the renderer just plays it.

```ts
export type Sender = "me" | "them";       // me = sent (right/blue), them = received (left/gray)
export type Reaction = "❤️" | "👍" | "👎" | "😂" | "‼️" | "❓";

export type Message = {
  from: Sender;
  text: string;
  typingMs?: number;          // typing indicator shown this long before the bubble (received only)
  delayMs?: number;           // read-gap AFTER the previous bubble, before this one
  status?: "delivered" | "read";   // receipt under the last sent bubble
  reaction?: Reaction;        // tapback over the bubble's corner, ~400ms after it lands
  ts?: string;               // optional timestamp divider, e.g. "Today 9:41 PM"
};

// the timeline adds derived frame-timing fields the renderer reads
export type Timed = Message & {
  typingStartMs: number;
  typingLenMs: number;
  enterMs: number;
};
```

## 2. App chrome & palettes — pick ONE app, fully

The half-second "which app is this" read is what sells the format. Match one app's colors, bubble shape, tail, and receipts end-to-end. Do not mix iMessage bubbles with WhatsApp ticks.

| App | Sent bubble | Received bubble | Background | Receipt |
|---|---|---|---|---|
| iMessage (dark) | `#0A84FF` text `#fff` | `#3B3B3D` text `#fff` | `#000` | "Delivered" / "Read" gray text under last sent |
| iMessage (light) | `#0A84FF` text `#fff` | `#E9E9EB` text `#000` | `#fff` | same |
| SMS (green) | `#37C24A` text `#fff` | `#E9E9EB` text `#000` | `#fff` | "Delivered" |
| WhatsApp (dark) | `#005C4B` text `#fff` | `#202C33` text `#fff` | `#0B141A` wallpaper | double-check: gray sent → blue `#53BDEB` read |

Header bar (sells the app): centered contact name + small avatar, a back chevron left, video/info glyphs right. Pin it under the status bar; never scroll it.

```tsx
const Header: React.FC<{ name: string; avatar?: string }> = ({ name, avatar }) => (
  <div style={{ position: "absolute", top: 60, left: 0, right: 0, height: 150,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 8, background: "rgba(20,20,20,.92)", backdropFilter: "blur(20px)" }}>
    <div style={{ width: 72, height: 72, borderRadius: 36, background: "#555", overflow: "hidden" }}>
      {avatar && <img src={avatar} width={72} height={72} />}
    </div>
    <div style={{ color: "#fff", fontSize: 26, fontWeight: 600 }}>{name}</div>
  </div>
);
```

## 3. Bubble + tail

A bubble is a max-width pill aligned to its side. Only the **last** bubble of a consecutive same-sender run gets the pointed tail corner; mid-run bubbles stay fully rounded.

```tsx
const BUBBLE: React.CSSProperties = {
  maxWidth: "74%", padding: "14px 18px", borderRadius: 22,
  fontSize: 34, lineHeight: 1.25, wordBreak: "break-word",
};

function bubbleStyle(sent: boolean, tail: boolean): React.CSSProperties {
  return {
    ...BUBBLE,
    alignSelf: sent ? "flex-end" : "flex-start",
    background: sent ? "#0A84FF" : "#3B3B3D",
    color: "#fff",
    // tail: pinch the bottom corner on the sender's side, only on the run's last bubble
    borderBottomRightRadius: sent && tail ? 6 : 22,
    borderBottomLeftRadius: !sent && tail ? 6 : 22,
  };
}

// tail = last of a same-sender run
const isRunEnd = (msgs: Message[], i: number) =>
  i === msgs.length - 1 || msgs[i + 1].from !== msgs[i].from;
```

## 4. Message array → frame timeline

Walk the messages, accumulating a cursor in ms. This single source of truth feeds spring entrances, typing windows, sounds, and auto-scroll.

```ts
export function buildTimeline(thread: Message[]): { timed: Timed[]; durationMs: number } {
  let cursor = 0;
  const timed = thread.map((m): Timed => {
    cursor += m.delayMs ?? 500;                       // read-gap before this message
    const typingLenMs = m.from === "them" ? (m.typingMs ?? 800) : 0;
    const typingStartMs = cursor;
    cursor += typingLenMs;                            // typing plays during the gap
    const enterMs = cursor;                           // bubble pops the instant typing ends
    cursor += 250;                                    // settle before the next read-gap
    return { ...m, typingStartMs, typingLenMs, enterMs };
  });
  return { timed, durationMs: cursor + 1000 };        // tail pad so the last bubble is readable
}
```

Feel tuning: snappy threads use `delayMs` 300–500 and `typingMs` 500–900; suspenseful reveals stretch `typingMs` to 1500–2500 before the payoff line.

## 5. Spring bubble + three-dot typing indicator

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

const Bubble: React.FC<{ enterFrame: number; sent: boolean; tail: boolean; children: React.ReactNode }> =
({ enterFrame, sent, tail, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - enterFrame, fps, config: { damping: 14, mass: 0.7 } });
  return (
    <div style={{
      ...bubbleStyle(sent, tail),
      transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px) scale(${interpolate(p, [0, 1], [0.85, 1])})`,
      opacity: interpolate(p, [0, 1], [0, 1]),
      transformOrigin: sent ? "bottom right" : "bottom left",
    }}>{children}</div>
  );
};

// dots breathe on a sine — frame-driven, no CSS-animation timer
const Typing: React.FC = () => {
  const frame = useCurrentFrame();
  const dot = (i: number) => 0.4 + 0.6 * (0.5 + 0.5 * Math.sin((frame / 8) - i * 0.9));
  return (
    <div style={{ ...bubbleStyle(false, true), display: "flex", gap: 8, padding: "18px 20px" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 12, height: 12, borderRadius: 6, background: "#aaa", opacity: dot(i) }} />
      ))}
    </div>
  );
};
```

Only received messages type; a sent bubble just pops (you don't watch yourself type).

## 6. Read receipts, timestamps, tapbacks

```tsx
// receipt: small, right-aligned, under the LAST sent bubble; fades in ~300ms after it lands
const Receipt: React.FC<{ status: "delivered" | "read"; enterFrame: number }> = ({ status, enterFrame }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const o = interpolate(frame - enterFrame, [fps * 0.3, fps * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ alignSelf: "flex-end", fontSize: 20, color: "#8e8e93", marginTop: 4, opacity: o }}>
    {status === "read" ? "Read" : "Delivered"}</div>;
};

// tapback: scales in with overshoot over the target bubble's corner, anchored to enterMs + 400
const Tapback: React.FC<{ reaction: string; enterFrame: number }> = ({ reaction, enterFrame }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const p = spring({ frame: frame - (enterFrame + Math.round(fps * 0.4)), fps, config: { damping: 9, mass: 0.5 } });
  return <span style={{ position: "absolute", top: -18, left: -10, fontSize: 32,
    transform: `scale(${interpolate(p, [0, 1], [0, 1])})` }}>{reaction}</span>;
};

// timestamp divider: centered gray, above the first message of a new time block (not every bubble)
const Stamp: React.FC<{ label: string }> = ({ label }) =>
  <div style={{ alignSelf: "center", color: "#8e8e93", fontSize: 22, fontWeight: 600, margin: "16px 0" }}>{label}</div>;
```

## 7. Auto-scroll — keep the newest bubble in frame

Once the stack grows past the visible band, translate the whole thread up so the latest bubble sits in the lower third. Ease toward the new offset with a spring each time a message lands.

```tsx
// targetY = stack height above the viewport floor, recomputed as bubbles enter; prevY = previous offset
const scroll = spring({ frame: frame - lastEnterFrame, fps, config: { damping: 200 } });
const y = prevY + (targetY - prevY) * scroll;          // glide, don't jump
return <div style={{ transform: `translateY(${-y}px)` }}>{/* bubbles */}</div>;
```

Measure bubble heights once (e.g. with `measureElement` from `@remotion/layout-utils`, or estimate from text length × line-height) so `targetY` is exact and the newest bubble lands clear of the compose bar.

## 8. Per-message sound

One audio cue per message at its `enterMs`, in the same timebase as the visuals — locked by construction.

```tsx
import { Audio, staticFile, Sequence } from "remotion";

{timed.map((m, i) => (
  <Sequence key={`snd-${i}`} from={Math.round((m.enterMs / 1000) * fps)} durationInFrames={10}>
    <Audio src={staticFile(m.from === "me" ? "send.mp3" : "receive.mp3")} volume={0.8} />
  </Sequence>
))}
```

Keep cues short (<300ms) so they don't pile up on fast threads. Optionally lay a quiet keyboard-tick bed under each typing window. Never trigger sound from an event handler — schedule it on the frame timeline so it survives headless render.

## 9. The full composition (data-driven duration)

```tsx
import { Composition, AbsoluteFill, Sequence } from "remotion";
import { z } from "zod";

export const schema = z.object({
  thread: z.array(z.object({
    from: z.enum(["me", "them"]), text: z.string(),
    typingMs: z.number().optional(), delayMs: z.number().optional(),
    status: z.enum(["delivered", "read"]).optional(),
  })),
  contact: z.string().default("Unknown"),
});

const Chat: React.FC<z.infer<typeof schema>> = ({ thread, contact }) => {
  const { fps } = useVideoConfig();
  const { timed } = buildTimeline(thread);
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Header name={contact} />
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end",
        padding: "0 24px", paddingTop: 210, paddingBottom: 360 }}>
        {/* auto-scroll wrapper goes here; children are typing + bubbles per message */}
        {timed.map((m, i) => (
          <Sequence key={i} from={f(m.typingStartMs)}>
            {m.typingLenMs > 0 && (
              <Sequence durationInFrames={f(m.typingLenMs)}><Typing /></Sequence>
            )}
            <Sequence from={f(m.enterMs - m.typingStartMs)}>
              <Bubble enterFrame={0} sent={m.from === "me"} tail={isRunEnd(thread, i)}>{m.text}</Bubble>
            </Sequence>
          </Sequence>
        ))}
      </AbsoluteFill>
      {/* + the per-message <Audio> sequences from §8 */}
    </AbsoluteFill>
  );
};

export const Root = () => (
  <Composition
    id="Chat" component={Chat}
    width={1080} height={1920} fps={30}
    durationInFrames={300}            // overridden by calculateMetadata below
    schema={schema}
    defaultProps={{ contact: "Alex", thread: [
      { from: "them", text: "wait you're WHERE right now", typingMs: 900 },
      { from: "me", text: "outside your house 🙂", delayMs: 600, status: "read" },
      { from: "them", text: "...", typingMs: 1600 },
    ]}}
    calculateMetadata={({ props }) => {
      const { durationMs } = buildTimeline(props.thread);
      return { durationInFrames: Math.ceil((durationMs / 1000) * 30) };
    }}
  />
);
```

`calculateMetadata` makes a longer script render a longer video automatically — never hand-set the duration.

## 10. Standalone-HTML preview (light tier, optional)

For a quick no-build layout check before wiring Remotion, render the same bubbles/typing/scroll on a master timeline in one HTML file, with a seek harness so any moment freezes for a screenshot.

```html
<script>
  // build your bubble reveals on one timeline `tl` (CSS transitions or a tiny tween lib)
  const t = new URLSearchParams(location.search).get("t");
  if (t !== null) { tl.pause(); tl.seek(parseFloat(t)); }  // frozen at t seconds
  window.__ready = true;
  console.log("duration", tl.duration());
</script>
```

Open at `…/chat.html?t=0`, `?t=<dur/2>`, `?t=<dur>` and screenshot each frozen frame to check alignment, tails, typing, and scroll before committing to the heavy render.

## 11. Render

```bash
npx remotion render Chat out/chat.mp4 --props='{"contact":"Alex","thread": ... }'
```

For many videos from one template, bundle once and render each script in Node — see `data-driven.md`.
