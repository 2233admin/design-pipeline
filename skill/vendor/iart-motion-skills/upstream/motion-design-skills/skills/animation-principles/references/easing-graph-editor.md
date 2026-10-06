# Easing in the After Effects Graph Editor

Tool-specific craft for turning the abstract easing principles into hand-shaped After Effects keyframes. The concepts here (slow-in/slow-out, asymmetric easing, overshoot, bounce) apply everywhere; the controls are AE's Graph Editor.

## The principle: slow-in / slow-out

Natural motion accelerates from rest and decelerates to rest — "slow-in, slow-out". Constant-speed (linear) motion reads as robotic because nothing physical starts and stops instantly. Easing means shaping how fast a property changes over time, not just its start and end values.

## Graph Editor basics

Open with the **Graph Editor** button (the curve icon) in the Timeline (or Shift+F3). It replaces the keyframe strip with curves.

Two graph modes, switched via the **graph type menu** at the bottom of the Graph Editor:

- **Value Graph** — plots the property's value over time (e.g., X position in pixels). The line's height = the value; its slope = the speed.
- **Speed Graph** — plots the rate of change (speed) over time. The line's height = speed; a hump = fast, a valley near zero = slow/stopped.

**How to tell which is shown:** Open the graph type menu → "Edit Value Graph" / "Edit Speed Graph" shows the current choice (the active one is checked). Quick tell: for a single moving property, the **Speed Graph** reads as a hill (accelerate up, decelerate down); the **Value Graph** reads as an S-curve climbing from start value to end value. Spatial properties (Position) usually default to the Speed Graph; single-dimension properties to the Value Graph.

For shaping ease feel, the **Speed Graph** is the most intuitive: flatten the ends toward zero (slow start/stop), let the middle rise (fast).

### Display tips
- Enable "Show Reference Graph" to see the other graph faintly behind the editable one.
- "Snap" and "Fit selection to view" make handle work easier.

## Why Easy Ease is rarely enough

`F9` (Easy Ease) applies a symmetric ease with ~33% influence on both sides. It's a starting point, not a finished move. Two reasons it falls flat:

1. **Symmetry.** Most compelling motion is asymmetric — e.g., snappy UI eases *out* hard (fast start, long glide to stop) far more than it eases in.
2. **Low influence.** 33% is gentle. Strong, modern motion-design easing pushes influence to **80–90%** on the deceleration side, producing a sharp launch and a smooth settle.

So: start with `F9`, then open the Graph Editor and **drag the bezier handles** to make it asymmetric and increase influence.

## Handle techniques

In the Graph Editor each keyframe has bezier handles:

- **Pull a handle horizontally (longer)** → more influence → the ease extends further in time → smoother, slower approach.
- **Pull a handle down toward zero speed** → the property comes more fully to rest at that keyframe.
- **Ease out 80–90%:** select the final keyframe, drag its incoming handle nearly flat and long so speed glides to near-zero over most of the move. This is the core "snappy" feel.
- **Overshoot:** let the value go past the target, then settle back. In the Value Graph, push the curve above the end value briefly, then return. Or add a small keyframe past the target and ease back.
- **Bounce:** repeated decaying overshoots — the value hits, overshoots less each time, settling. Build with successive keyframes of decreasing amplitude, each eased.

## Influence and velocity numbers

Right-click a keyframe → **Keyframe Velocity** to set exact values:

- **Incoming/Outgoing Velocity** — the speed at the keyframe (units/sec). Zero = full stop.
- **Influence %** — how far the ease extends toward the neighboring keyframe. Higher = smoother, longer ease.

Targets:
- Snappy UI move: outgoing influence ~15–25% (quick launch), **incoming influence 80–90%** (long settle).
- Smooth symmetric float: both sides ~50–65%.
- Anticipation: a small reverse move before the main action (pull back, then go).

## Recipe table

| Feel | Speed Graph shape | Outgoing inf. | Incoming inf. | Notes |
|---|---|---|---|---|
| Snappy UI | sharp rise, long tail to 0 | 10–25% | 80–90% | The default "good" motion-design ease |
| Smooth float | gentle symmetric hill | 50–65% | 50–65% | Calm, even, no snap |
| Anticipation | dip below 0 then rise | add pre-keyframe | 70–85% | Tiny reverse move first |
| Overshoot | rise, overshoot value, settle | 20–40% | 85–95% | 1 extra keyframe past target |
| Bounce | repeated decaying humps | per-bounce | per-bounce | Decreasing amplitude keyframes |

## Quick reference

| Action | How |
|---|---|
| Open Graph Editor | Curve icon in Timeline (or Shift+F3) |
| Apply Easy Ease | `F9` (Ease In `Shift+F9`, Ease Out `Ctrl/Cmd+Shift+F9`) |
| Switch Value/Speed graph | Graph type menu (bottom of Graph Editor) |
| Set exact velocity | Right-click keyframe → Keyframe Velocity |
| Convert to bezier handles | Easy Ease, then drag handles |
| Strong settle | Incoming influence 80–90% on last keyframe |

## Step-by-step recipes

### Snappy UI ease (the workhorse)
1. Set two Position (or Scale) keyframes for the move.
2. Select both, press `F9` (Easy Ease).
3. Open Graph Editor → Speed Graph.
4. Select the **first** keyframe; shorten its outgoing handle (low influence, ~15–25%) so it launches fast.
5. Select the **last** keyframe; pull its incoming handle long and nearly flat to the time axis — influence **80–90%** — so it glides to a stop.
6. Result: fast start, long smooth settle. This is the standard "premium" motion-design feel.

Exact via Keyframe Velocity (right-click keyframe):
- First keyframe: Outgoing influence 18%, velocity 0.
- Last keyframe: Incoming influence 85%, velocity 0.

### Overshoot
Goal: element flies in, slightly passes its target, settles back.
1. Animate from start to target value (2 keyframes), ease.
2. Add a **third keyframe ~6–10 frames before** the final, set its value **past** the target (e.g., target 100% → set 112%).
3. Final keyframe returns to target (100%).
4. Ease all keyframes; give the settle keyframes high incoming influence (85–95%).
5. Tune overshoot amount (how far past) and settle time for snappiness.

Value Graph view: the curve rises above the target line, then dips back down to it.

### Anticipation
Goal: a small reverse move before the main action (wind-up).
1. Before the main motion's first keyframe, add a keyframe that moves **slightly opposite** the main direction (e.g., a jump-up preceded by a small crouch-down).
2. Ease the wind-up gently, then the main move fast (low outgoing influence).
3. Optionally combine with overshoot on the landing for a full squash-stretch feel.

### Bounce (hand-keyed)
1. First keyframe: rest/start.
2. Impact keyframe: the object hits the floor value.
3. Bounce keyframes: each successive peak is **lower** than the last (decaying amplitude), spaced **closer** in time (decreasing period).
4. At each floor contact, set incoming/outgoing velocity sharp (near-instant direction change); at each peak, ease to near-zero speed (apex).
5. 3–4 decaying bounces usually read as natural.

Amplitude example for a drop settling to 0: 0 → -200 (rise) → 0 → -90 → 0 → -35 → 0 → -12 → 0, with shrinking time gaps.

### Bounce (expression)
Apply to a property (e.g., Position) after a single ease-in keyframe to auto-generate decaying bounce:
```javascript
amp = 0.12;       // bounce strength
freq = 2.5;       // bounces per second
decay = 5.0;      // how fast it settles
n = 0;
if (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) n--; }
if (n > 0) {
  t = time - key(n).time;
  v = velocityAtTime(key(n).time - thisComp.frameDuration/10);
  value + v*(amp*Math.sin(freq*t*2*Math.PI)/Math.exp(decay*t));
} else { value; }
```
- `amp` raises the overshoot height; `freq` the number of wobbles; `decay` how quickly it stops.
- Place a single eased keyframe (or two) where the motion arrives; the expression adds the bounce after.

## Velocity / influence cheat sheet

| Feel | Out influence | In influence | Velocity at stops |
|---|---|---|---|
| Snappy UI | 15–25% | 80–90% | 0 |
| Smooth float | 50–65% | 50–65% | 0 |
| Mechanical/linear | 0% | 0% | constant |
| Overshoot settle | 20–40% | 85–95% | 0 at final |
| Bounce apex | high | high | 0 at apex |
| Bounce impact | low | low | sharp/non-zero |

## Gotchas

- **Easy Ease ≠ finished.** It's a 33% symmetric starting point; almost always refine in the Graph Editor.
- **Know your graph.** Editing a Value Graph thinking it's a Speed Graph produces confusing results — confirm in the graph type menu.
- **Influence is per-side.** Asymmetric influence (low out, high in) is what makes UI motion feel snappy.
- **Spatial vs temporal.** Position has both a motion path (spatial bezier in the Composition viewer) and speed easing (Graph Editor). A floaty arc may be a spatial handle issue, not temporal. Right-click a Position keyframe for **Rove Across Time** and spatial interpolation (Linear/Auto/Continuous Bezier).
- **Auto-Bezier roving keyframes** can smooth speed across multiple keyframes but remove precise per-keyframe timing — use deliberately.
- **Overshoot needs room past the target** — clamp/limits or layout edges can hide it.
- **Bounce by hand is tedious;** expression-driven bounce (decaying sine) is common, but hand-keyed gives the most control.
