# Easing curves, springs, and durations

A reference library of exact values. Copy directly.

## Named cubic-bezier library

These are battle-tested curves. The four numbers are `(x1, y1, x2, y2)` control points.

### Ease-out family (use for ENTER / appear / settle)

| Name | cubic-bezier | Feel |
|---|---|---|
| easeOutQuad | `0.5, 1, 0.89, 1` | gentle, subtle |
| easeOutCubic | `0.33, 1, 0.68, 1` | balanced, safe default |
| easeOutQuart | `0.25, 1, 0.5, 1` | snappy |
| easeOutQuint | `0.22, 1, 0.36, 1` | very snappy, decisive |
| easeOutExpo | `0.16, 1, 0.3, 1` | dramatic, "premium" arrival |
| easeOutCirc | `0, 0.55, 0.45, 1` | strong late deceleration |

### Ease-in family (use for EXIT / disappear / accelerate away)

| Name | cubic-bezier | Feel |
|---|---|---|
| easeInQuad | `0.11, 0, 0.5, 0` | gentle pull-away |
| easeInCubic | `0.32, 0, 0.67, 0` | balanced exit |
| easeInQuart | `0.5, 0, 0.75, 0` | sharp exit |
| easeInExpo | `0.7, 0, 0.84, 0` | dramatic, fast vanish |

### Ease-in-out family (use for MOVE / reposition while on screen)

| Name | cubic-bezier | Feel |
|---|---|---|
| easeInOutQuad | `0.45, 0, 0.55, 1` | smooth, neutral |
| easeInOutCubic | `0.65, 0, 0.35, 1` | balanced default |
| easeInOutQuart | `0.76, 0, 0.24, 1` | punchy in and out |
| easeInOutExpo | `0.87, 0, 0.13, 1` | very dramatic, long hold mid |

### Overshoot / back family (use for PLAYFUL / branded / "weighty")

| Name | cubic-bezier | Notes |
|---|---|---|
| easeOutBack | `0.34, 1.56, 0.64, 1` | overshoots past target then settles |
| easeInBack | `0.36, 0, 0.66, -0.56` | dips below before launching (anticipation) |
| easeInOutBack | `0.68, -0.6, 0.32, 1.6` | anticipate + overshoot |

The `y` value above 1 (e.g. `1.56`) or below 0 (e.g. `-0.56`) is what creates overshoot/anticipation. Bigger excursion = more bounce.

## Material Design standard curves (good for product UI)

| Token | cubic-bezier | Use |
|---|---|---|
| Standard | `0.2, 0, 0, 1` | most transitions |
| Decelerate (enter) | `0, 0, 0, 1` | elements entering screen |
| Accelerate (exit) | `0.3, 0, 1, 1` | elements leaving screen |
| Emphasized | `0.2, 0, 0, 1` (300-500ms) | hero moments |

## iOS / Apple feel

Apple favors springs, but the closest bezier is `0.25, 0.1, 0.25, 1` (the legacy `ease`) sharpened toward `0.33, 1, 0.68, 1`. For modal presentation Apple uses a spring close to `stiffness 280, damping 28`.

## Spring configurations

Springs are defined by stiffness (tension), damping (friction), and mass. Higher stiffness = faster; higher damping = less bounce; higher mass = more sluggish/heavy.

### Framer Motion (`type: "spring"`)

```js
// Snappy default — interactive UI
{ type: "spring", stiffness: 300, damping: 30, mass: 1 }

// Bouncy — playful, branded
{ type: "spring", stiffness: 400, damping: 17, mass: 1 }

// Gentle — large/heavy elements, modals
{ type: "spring", stiffness: 120, damping: 20, mass: 1 }

// Stiff/no bounce — precise, critically damped
{ type: "spring", stiffness: 500, damping: 50, mass: 1 }

// Alternative API: duration-based spring (Framer Motion v10+)
{ type: "spring", duration: 0.5, bounce: 0.25 } // bounce 0 = no overshoot, 0.5 = lively
```

### react-spring presets

```js
import { config } from '@react-spring/web'
config.default   // { tension: 170, friction: 26 }
config.gentle    // { tension: 120, friction: 14 }
config.wobbly    // { tension: 180, friction: 12 }  — visible bounce
config.stiff     // { tension: 210, friction: 20 }
config.slow      // { tension: 280, friction: 60 }  — heavy, no bounce
config.molasses  // { tension: 280, friction: 120 }
```

### SwiftUI / iOS

```swift
.spring(response: 0.4, dampingFraction: 0.8)   // response = approx duration, dampingFraction 1.0 = no bounce
.interactiveSpring()                            // for gesture-driven
```

## Duration guidance per element type

| Element / event | Duration | Easing |
|---|---|---|
| Hover state, tap highlight | 100-150ms | easeOutQuad |
| Toggle, checkbox, switch | 150-200ms | easeOutCubic |
| Tooltip, dropdown open | 150-250ms | easeOutCubic |
| Button press feedback | 80-120ms down / 200ms up | easeOut + back on release |
| Modal / dialog enter | 300-400ms | easeOutExpo or spring(gentle) |
| Modal / dialog exit | 200-250ms | easeInQuart |
| Page / route region transition | 300-500ms | easeInOutCubic |
| Card / list item reveal | 400-500ms each | easeOutExpo |
| Hero headline / full-screen | 500-800ms | easeOutExpo |
| Cinematic camera push/pan | 800-2000ms | easeInOutQuad |
| Loading spinner | continuous | linear |
| Number count-up | 600-1200ms | easeOutExpo |

## Distance-to-duration scaling

To keep perceived velocity natural, scale duration with travel distance:

```
duration_ms ≈ base_ms * (distance_px / base_distance_px) ^ 0.5
```

The `^0.5` (square root) prevents long moves from feeling tediously slow while still granting them more time than short moves. Example: base 300ms at 200px -> a 800px move ≈ 300 * sqrt(4) = 600ms.

## Stagger math

```
total = (count - 1) * offset + per_item_duration
```

Keep `total` under ~800ms for group reveals. If it exceeds that, reduce `offset` or use distance-based staggering (each item's delay proportional to its distance from a focal origin), which keeps a constant feel regardless of count.
