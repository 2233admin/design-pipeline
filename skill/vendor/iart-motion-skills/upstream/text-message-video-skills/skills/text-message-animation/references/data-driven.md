# Data-Driven Chat Videos — Script → Messages → Batch

A chat video is a template × data. Author the conversation as data, and one composition renders an endless supply of videos: per-script, per-row of a CSV, per-record from a DB. This file covers the script formats, the CSV/JSON → `Message[]` mappers, data-dependent duration, and batch rendering many videos with `@remotion/renderer`.

## 1. The data contract

The composition's only meaningful prop is a `thread` of messages (the shape from `bubble-recipes.md`). Everything else — appear frames, typing windows, sounds, scroll, duration — is derived. So "make N videos" is just "supply N threads".

```ts
type Message = {
  from: "me" | "them";
  text: string;
  typingMs?: number;          // received-only typing length before the bubble
  delayMs?: number;           // read-gap after the previous bubble
  status?: "delivered" | "read";
};
type Thread = { contact: string; thread: Message[] };
```

## 2. Authoring threads — JSON

The most direct format. One file per video, or an array of threads for a batch.

```json
{
  "contact": "Mom",
  "thread": [
    { "from": "them", "text": "did you eat?", "typingMs": 700 },
    { "from": "me",   "text": "yes mom 😅", "delayMs": 500, "status": "read" },
    { "from": "them", "text": "what did you eat", "typingMs": 1200 }
  ]
}
```

## 3. Authoring threads — CSV

CSV is the friendliest format for non-coders and for generating threads in a spreadsheet or from an LLM. One row per message; a blank `contact`/new `thread_id` starts a new video.

```csv
thread_id,contact,from,text,typingMs,delayMs,status
1,Mom,them,did you eat?,700,,
1,Mom,me,yes mom 😅,,500,read
1,Mom,them,what did you eat,1200,,
2,Alex,them,you up?,900,,
2,Alex,me,no,,400,read
```

Map rows into threads — group by `thread_id`, coerce the numeric/optional fields:

```ts
import { parse } from "csv-parse/sync";

export function csvToThreads(csv: string): Thread[] {
  const rows = parse(csv, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  const byId = new Map<string, Thread>();
  for (const r of rows) {
    const t = byId.get(r.thread_id) ?? { contact: r.contact, thread: [] };
    t.thread.push({
      from: r.from === "me" ? "me" : "them",
      text: r.text,
      typingMs: r.typingMs ? Number(r.typingMs) : undefined,
      delayMs: r.delayMs ? Number(r.delayMs) : undefined,
      status: (r.status as Message["status"]) || undefined,
    });
    byId.set(r.thread_id, t);
  }
  return [...byId.values()];
}
```

## 4. Data-dependent duration

A longer script must make a longer video — never hand-set frames. Compute duration from the same timeline the renderer uses, in `calculateMetadata`:

```ts
calculateMetadata={({ props }) => {
  const { durationMs } = buildTimeline(props.thread);   // from bubble-recipes.md §4
  return { durationInFrames: Math.ceil((durationMs / 1000) * 30) };
}}
```

This runs per-render, so each batched thread gets its own correct length automatically.

## 5. Batch render with @remotion/renderer

Bundle the project ONCE, then render every thread — far faster than spawning the CLI per video. Each render reads the thread as `inputProps`; `calculateMetadata` sizes the duration per thread.

```ts
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { csvToThreads } from "./csvToThreads";
import fs from "node:fs";

const threads = csvToThreads(fs.readFileSync("threads.csv", "utf8"));
const serveUrl = await bundle({ entryPoint: "./src/index.ts" });   // bundle once

for (const [i, t] of threads.entries()) {
  const composition = await selectComposition({
    serveUrl, id: "Chat", inputProps: t,                            // calculateMetadata sets duration here
  });
  await renderMedia({
    composition, serveUrl, codec: "h264",
    inputProps: t,
    outputLocation: `out/chat-${String(i + 1).padStart(3, "0")}.mp4`,
  });
  console.log(`rendered ${t.contact} → out/chat-${i + 1}.mp4`);
}
```

Tips:
- **Verify one before all.** Render stills for ONE representative thread (see SKILL.md "Deliver & verify") before kicking off the whole batch — catch a layout/timing bug once, not N times.
- **Parallelism.** `renderMedia` already uses multiple Chrome tabs (`concurrency`); for hundreds of videos, render on Remotion Lambda (`@remotion/lambda`) and fan threads out across invocations.
- **Stable assets.** Keep `send.mp3` / `receive.mp3` / fonts in `public/` and load via `staticFile()` so every batched render finds them.
- **Per-thread variety.** Carry `app` ("imessage" | "whatsapp" | "sms"), `contact`, and avatar in each thread's props so one template covers every look without code changes.

## 6. From an LLM, end-to-end

Because the contract is just `Message[]`, an LLM can author the threads: prompt it for `[{from,text,typingMs,delayMs}]` JSON (or CSV rows), validate against the zod `schema`, then feed straight into the batch loop. Script in → finished vertical chat videos out, no manual timing.

---
The fake-text format lives or dies on rhythm and chrome — get the drip and the app details right and one template prints videos all day. Built by **[iart.ai](https://iart.ai/?utm_source=github&utm_medium=readme&utm_campaign=text-message-video-skills&utm_content=skill_footer&utm_term=text-message-animation)** — the AI motion agent for editable, on-brand motion graphics.
