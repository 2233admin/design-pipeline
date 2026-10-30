# Timeline deconstruction

Use this method when rebuilding a reference interaction (a live page, a recording or source code) so the rebuild matches it. Before writing any component code, capture what changes over time as data: a state machine for what the element can be, and a property timeline for how each state change plays out. The data then drives the rebuild, `MOTION.md` and the side-by-side frame comparison. Nothing is described by feel.

Source: Distilled from raphaelsalaja/skill `deconstruct` at 5e98985 (MIT); wording and selection are this repository's.

## Rules

1. **Open the real source first.** Read keyframes, transitions and spring configs from code, or step through a recording at reduced speed. A breakdown from one viewing at full speed is guesswork.
2. **Name every state and every event.** List the states the element can rest in and the events that move it between them (press, release, resolve, timeout, hover-out). "It shrinks, then spins" is not a state list.
3. **One track per property per element.** Scale, opacity, blur, width, color, icon swap and label swap each get their own row with from, to, delay, duration and easing. "About 300ms" is not a value.
4. **Keep the curve as authored.** A spring stays a spring (stiffness, damping, mass, or bounce and duration). Do not flatten it into a guessed bezier. A bezier keeps its four numbers.
5. **Mark what you could not read.** Use `unverified` for any value you could not take from code or measurement, and say how you would confirm it. Never fill a gap with an estimate that looks like a measurement.
6. **Include interruptions.** For every transition, say what happens if the trigger reverses or repeats mid-flight: retarget from the current value, restart, queue or ignore.
7. **Drive the rebuild from one clock.** Render the element as a pure function of time (or let transitions own the clock), so scrubbing, pausing and slow playback show the same frame for the same time.
8. **Hand back data, not prose.** Keep the filled timeline as a file in the task folder. The rebuild imports or mirrors those numbers, so the record and the shipped motion cannot drift.

## Step 1: capture sources

| Source | What to read | Evidence class |
| --- | --- | --- |
| Code | `transition`, `@keyframes`, animation library props, spring options | `measured` |
| Live page | Computed styles sampled while forcing each state; `getAnimations()` output | `instrumented` |
| Recording | Frame-stepped positions and opacities at a known fps | `measured` (with fps stated) |
| Memory or description | Anything else | `inferred`, with confidence |

Use the evidence classes already defined in `motion-foundation.md`.

## Step 2: state machine

| State | Entered on | Left on | Rest values |
| --- | --- | --- | --- |
| `idle` | mount, `release` | `press` | scale 1, label "Copy" |
| `pressed` | `press` | `release`, `cancel` | scale 0.96 |
| `copied` | `resolve` | `timeout` (1500ms) | icon check, label "Copied" |

Also list events that are ignored in a state (for example `press` while `copied`).

## Step 3: property timeline

One row per element, property and transition. Times are milliseconds from the event.

| Transition | Element | Property | From | To | Delay | Duration | Easing | Interrupt | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `idle` to `pressed` | button | scale | 1 | 0.96 | 0 | 120 | `cubic-bezier(.23,1,.32,1)` | retarget | measured |
| `pressed` to `copied` | copy icon | opacity | 1 | 0 | 0 | 150 | ease-out | retarget | measured |
| `pressed` to `copied` | check icon | scale | 0.25 | 1 | 40 | 300 | spring bounce 0 | restart | instrumented |
| `pressed` to `copied` | check icon | blur | 4px | 0 | 40 | 300 | spring bounce 0 | restart | unverified |

Two rows that share a delay and duration can be grouped, but never merged into one property.

## Output format (JSON)

Save as `timeline.json` beside the task's `motion.md` or reference notes.

```json
{
  "id": "copy-button",
  "source": { "kind": "code", "ref": "src/CopyButton.tsx@abc123", "fps": null },
  "states": [
    { "id": "idle", "enteredOn": ["mount", "release"], "leftOn": ["press"], "rest": { "scale": 1 } },
    { "id": "pressed", "enteredOn": ["press"], "leftOn": ["release", "cancel"], "rest": { "scale": 0.96 } }
  ],
  "transitions": [
    {
      "from": "idle", "to": "pressed", "event": "press", "interrupt": "retarget",
      "tracks": [
        { "element": "button", "property": "scale", "from": 1, "to": 0.96,
          "delayMs": 0, "durationMs": 120,
          "curve": { "type": "bezier", "value": [0.23, 1, 0.32, 1] },
          "evidence": "measured" }
      ]
    }
  ],
  "unverified": ["check icon blur values"]
}
```

For springs use `"curve": { "type": "spring", "stiffness": 400, "damping": 30, "mass": 1 }` or `{ "type": "spring", "bounce": 0, "durationMs": 300 }`, whichever the source used.

## Feeding the rest of the pipeline

- **MOTION.md.** Promote only what the product keeps. Reusable values (durations, curves, press scale) become tokens or named entries in the project `MOTION.md`; one-off values stay in the change's `motion.md` and cite the timeline. Values copied from a benchmark never become the product foundation on their own; adapt them to the product's tokens first.
- **Implementation.** Build each track from its row. If a row conflicts with project motion rules (duration over budget, scale from zero), record the deviation and the decision rather than silently fixing it.
- **Frame-pair checking.** Capture the original and the rebuild at the same timestamps: the event time plus fixed offsets taken from the timeline (start, each delay boundary, midpoints, end, and one frame after settling). Compare each pair side by side, slowed to about 10 to 25% speed in a recording. Report every pair that drifts, with the track it belongs to.
- **Gaps.** Each `unverified` entry stays open until a pair check or a code read closes it. Report open entries in the evidence; do not hide them.
- **Reports.** A finding names the track and the numbers (`check icon scale: expected 0.25 to 1 over 300ms, rebuild 0 to 1 over 200ms`), not a feeling.

## Checks before building

- Every state has a name and at least one entering and leaving event.
- Every animated property has its own row with all five values or an `unverified` mark.
- No spring was converted to a bezier.
- Interruption behavior is stated for each transition.
- The timeline file exists in the task folder and the rebuild reads from it or copies it exactly.
- Reduced-motion behavior is stated (what each track becomes), in line with the motion rules.
