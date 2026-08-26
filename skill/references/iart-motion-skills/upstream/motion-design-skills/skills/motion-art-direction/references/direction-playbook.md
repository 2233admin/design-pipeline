# Motion Direction Playbook

Depth behind the SKILL.md frameworks: a brief template, filled motion-language specs for five tone cells, brand→motion translation, a direction-notes template with worked entries, an easing cheat sheet, and a pre-render checklist.

## Creative brief template

Fill before any other decision. One line per row — if a row can't be answered, the piece isn't ready to direct.

```
PIECE:        <name / working title>
AUDIENCE:     <who, and what they already know>
ONE MESSAGE:  <the single thing they remember after watching>
PLATFORM:     <YouTube / Reels / in-app / landing hero — sets aspect, sound, duration>
DURATION:     <seconds; shorter = fewer ideas, not faster ideas>
MOOD:         <exactly 3 adjectives, e.g. "confident, precise, warm">
BRAND CUES:   <colors, type, logo motion rules, any existing motion system>
CONSTRAINTS:  <must-include / must-avoid; legal supers; localization>
REFERENCE:    <1–3 links + one line on WHAT to borrow from each>
```

The 3 adjectives are load-bearing: they resolve every later judgment call. "Confident, precise, warm" rules out bouncy overshoot (not precise) and cold linear snaps (not warm) on its own.

## Filled motion-language specs (five tone cells)

Each is internally consistent — copy the closest one and adjust. Easings are CSS `cubic-bezier`; the same curves map to GSAP eases and Lottie keyframe handles.

### Calm + Soft — luxury / wellness / editorial
| Property | Choice |
|---|---|
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)` in/out, long tails |
| Base unit | 0.6s (micro 0.3s, hero 1.2s) |
| Transition | Slow crossfade + gentle scale; no hard cuts |
| Stagger | 120ms, generous |
| Intensity | Travel ≤ 16px, scale 0.98→1.0, zero overshoot |
| Hold | ≥ 0.6s stillness; let frames breathe |

### Calm + Sharp — premium tech / fintech
| Property | Choice |
|---|---|
| Easing | `cubic-bezier(0.22, 1, 0.36, 1)` decel; exits `cubic-bezier(0.4, 0, 1, 1)` |
| Base unit | 0.4s |
| Transition | Match-cut + crossfade only |
| Stagger | 60ms cascade |
| Intensity | Travel ≤ 24px, scale 0.96→1.0, overshoot ≤ 2% |
| Hold | ≥ 0.3s |

### Kinetic + Sharp — sports / hype / gaming / launch
| Property | Choice |
|---|---|
| Easing | `cubic-bezier(0.16, 1, 0.3, 1)` hard-out; snaps near-instant |
| Base unit | 0.25s (micro 0.12s) |
| Transition | Hard cuts on beats; speed-ramp into drops |
| Stagger | 40ms, tight machine-gun |
| Intensity | Big travel, scale 1.18→1.0 overshoot on impact |
| Hold | ≥ 0.2s, brief — energy over rest |

### Kinetic + Soft — playful / lifestyle / kids
| Property | Choice |
|---|---|
| Easing | Spring / `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoot |
| Base unit | 0.4s, loose |
| Transition | Bouncy pushes, squash-and-stretch wipes |
| Stagger | 80ms, irregular feels human |
| Intensity | Generous bounce, secondary follow-through |
| Hold | ≥ 0.3s |

### Neutral data-story — explainer / dashboard / report
| Property | Choice |
|---|---|
| Easing | `cubic-bezier(0.25, 0.1, 0.25, 1)` calm in/out |
| Base unit | 0.5s; count-ups 0.8–1.2s |
| Transition | Cross-dissolve between data states; never wipe a chart |
| Stagger | 80ms per series/bar |
| Intensity | Number eases to value; axes static; no overshoot on quantities |
| Hold | ≥ 0.5s on each datapoint so it can be read |

## Brand → motion translation

Brands describe themselves in adjectives; direction converts those to motion parameters.

| Brand word | Easing | Timing | Intensity | What to avoid |
|---|---|---|---|---|
| Premium / luxury | Long, soft decel | Slow, generous holds | Minimal travel, no overshoot | Bounce, fast cuts, spins |
| Trustworthy / precise | Clean decel, symmetric | On-grid, multiples of base | Small, controlled | Wobble, irregular stagger |
| Energetic / bold | Hard-out, snappy | Fast, syncopated | Big scale, overshoot on beats | Slow fades, dead air |
| Friendly / human | Slight overshoot/spring | Loose, slightly irregular | Soft bounce, follow-through | Robotic linear, perfect symmetry |
| Innovative / techy | Decel with subtle anticipation | Tight, layered staggers | Crisp, geometric | Skeuomorphic squash, grunge |

Map only the 2–3 strongest brand words. Trying to honor every adjective produces mush.

## Direction-notes template (per shot)

Direct *intent*, not keyframes — let the technique skill choose exact values within the spec.

```
SHOT <n>  [t = 0.0–0.0s]
PURPOSE:   <why this shot exists — what the viewer should feel/learn>
HERO:      <the one element; how it enters and lands>
SUPPORT:   <secondary elements; how they yield to the hero>
TEXTURE:   <ambient/background behaviour, if any>
TRANSITION IN/OUT: <from the locked transition family only>
BEAT:      <audio mark the key move lands on, if scored>
NOTE:      <any deliberate break from the spec + the reason>
```

### Worked example (Calm + Sharp, premium tech)

```
SHOT 3  [t = 6.0–9.5s]
PURPOSE:   Reveal the dashboard as effortless and accurate.
HERO:      Dashboard card scales 0.96→1.0 over 0.8s on the decel ease, soft landing.
SUPPORT:   Three metric chips cascade in, 60ms stagger, 0.4s each, eased out so the
           eye finishes on the card, not the chips.
TEXTURE:   Grid lines drift 2px over 8s, 8% opacity — subliminal only.
TRANSITION IN/OUT: Match-cut from the prior logo mark / crossfade to shot 4.
BEAT:      Card lands on the downbeat at 6.4s.
NOTE:      No overshoot anywhere — this is financial data; overshoot reads as imprecise.
```

### Worked example (Neutral data-story, count-up)

```
SHOT 5  [t = 12.0–15.0s]
PURPOSE:   Land the headline number ($1.4M) so it's read and believed.
HERO:      Number eases from 0 to 1,400,000 over 1.1s; decelerates so the final
           digits settle slowly and feel exact.
SUPPORT:   Caption fades in after the count completes (not during) — don't make
           the viewer read while a number is still moving.
TEXTURE:   None. The frame holds still for 0.7s after — stillness sells accuracy.
TRANSITION IN/OUT: Cross-dissolve from the bar chart; cross-dissolve out.
NOTE:      Hold the final value on screen ≥ 0.5s before any exit.
```

## Easing vocabulary cheat sheet

| Curve | `cubic-bezier` | Feel | Use for |
|---|---|---|---|
| Decelerate (ease-out) | `0, 0, 0.2, 1` | Arrives, settles softly | Entrances, landings — the workhorse |
| Accelerate (ease-in) | `0.4, 0, 1, 1` | Leaves with intent | Exits, things flying off |
| Standard (in-out) | `0.4, 0, 0.2, 1` | Smooth both ends | On-screen repositioning |
| Emphasized decel | `0.22, 1, 0.36, 1` | Confident, premium landing | Hero reveals (calm-sharp) |
| Hard out | `0.16, 1, 0.3, 1` | Snappy, energetic | Kinetic pieces, hype |
| Overshoot | `0.34, 1.56, 0.64, 1` | Springy, playful, alive | Friendly/kinetic-soft only |

Rules of thumb: entrances ease *out* (decelerate in), exits ease *in* (accelerate away). Avoid `linear` except for continuous loops (rotation, marquees, ambient drift). Never ship default `ease` — it's the un-decided curve and reads as unconsidered.

## Pacing map

Sketch energy across the timeline before timing any single move. A typical 30s arc:

```
energy
  ^            ____ peak (the one "wow")
  |          /     \
  |    build/       \ settle
  |   /              \____ end card hold
  |__/                       
  +----------------------------------> time
   open   build      peak    resolve
```

Vary deliberately: a hold after a fast sequence makes the next move hit harder. Density of cuts is a dial — turn it up for tension, down for gravity. Match key landings to audio beats where scored.

## Pre-render direction checklist

- [ ] Brief complete; one message and exactly 3 mood adjectives written down.
- [ ] Tone placed in a single cell of the energy matrix — not straddling two.
- [ ] Motion-language spec filled, every row a single choice.
- [ ] ≤ 2 primary easing curves used across the whole piece.
- [ ] All durations are multiples of the base unit.
- [ ] Only the chosen transition family appears between shots.
- [ ] Stagger rhythm identical across all grouped reveals.
- [ ] Every frame has exactly one hero; support never competes.
- [ ] Restraint pass done — listed what stays static and why.
- [ ] Hold discipline respected; no two moves stacked without rest.
- [ ] Exactly one "wow" moment.
- [ ] Numbers/quantities ease to value, hold ≥ 0.5s, and don't overshoot.
- [ ] Pacing map drawn; key moments land on beats (if scored).
- [ ] Brand cues honored; nothing animated that the brand wouldn't.

---
## Built by the team behind iart.ai

This skill is part of an open motion-graphics collection from iart.ai — the AI motion agent that turns data, scripts, and designs into editable motion graphics (Remotion → MP4). If you'd rather not hand-build this, iart.ai can act as the motion director — apply one consistent motion language and your brand across every shot, then render the piece. → [iart.ai](https://iart.ai/?utm_source=github&utm_medium=reference&utm_campaign=motion-design-skills&utm_content=ref_footer&utm_term=motion-art-direction)
