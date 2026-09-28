# Web Motion

A short guide to motion on interactive web pages: what makes a response feel physical, how to
build one without a library, and how `verify interaction` (a headless probe, built separately)
checks a page actually behaves the way its motion claims to.

## Motion as material

Treat motion as a property of the object, not a coat of paint over a static layout:

- **No opacity-only entrances.** If an element only fades in while its position, size and rotation
  stay fixed, nothing moved — the interface reported a state change without acting on it. A card
  that "enters" should travel, scale, or rotate into place; opacity may accompany that but must
  never carry it alone.
- **No linear easing for things that have mass.** A constant-velocity move looks like a slide
  projector, not an object responding to a force. Anything driven by a pointer, a state change, or
  a scroll position should accelerate and decelerate, because everything with mass does.

## Spring-damper basics

A spring-damper response is defined by three physical quantities:

- **stiffness** — how hard the spring pulls toward its rest value; higher means a faster, snappier
  approach.
- **damping ratio** — how quickly the oscillation loses energy, relative to critical damping for
  that stiffness and mass:
  - below 1: **underdamped** — overshoots the rest point, then settles through decaying oscillation;
  - exactly 1: **critically damped** — the fastest approach that never overshoots;
  - above 1: **overdamped** — approaches from one side, more sluggish the higher it goes.
- **mass** — how much the value resists acceleration; heavier mass makes the same stiffness feel
  slower and rounder.

A response also has a **rest value** and, for underdamped springs, an implicit **overshoot
limit** worth capping so a snappy interaction cannot fling an element far past its target.

### Typical UI ranges

Starting points to tune by eye, not physical constants:

| Feel | stiffness | dampingRatio | mass | reads as |
| --- | --- | --- | --- | --- |
| snappy | 300–500 | 0.6–0.8 | 0.5–1 | button press, toggle, small hover response |
| soft | 120–220 | 0.7–0.9 | 1–2 | card follow, panel open, drag release |
| heavy | 60–120 | 0.85–1.0 | 2–4 | large surface, page-level transition, hero element |

Snappy responses lean underdamped on purpose — a small overshoot reads as responsive; heavy ones
lean critical — a large element overshooting reads as an error.

## A minimal spring integrator

No animation library is required. Semi-implicit (symplectic) Euler with a fixed timestep is stable
enough for UI motion and fits in about twenty lines:

```js
function createSpring({ stiffness, dampingRatio, mass, restValue }) {
  let value = restValue;
  let velocity = 0;
  const dampingCoefficient = 2 * dampingRatio * Math.sqrt(stiffness * mass);

  return {
    setTarget(target, dt = 1 / 60) {
      // Update velocity first, then position, with the new velocity (semi-implicit): stable
      // while dt * sqrt(stiffness / mass) stays small, true for the ranges above.
      const springForce = -stiffness * (value - target);
      const dampingForce = -dampingCoefficient * velocity;
      const acceleration = (springForce + dampingForce) / mass;
      velocity += acceleration * dt;
      value += velocity * dt;
      return value;
    },
    get value() { return value; },
    get velocity() { return velocity; },
  };
}
```

This takes one fixed timestep per call; it is not itself a frame loop. Drive it from a
variable-rate `requestAnimationFrame` with a small time accumulator — step `setTarget` in fixed
`dt` increments until each frame's elapsed time is consumed, carrying the remainder forward,
rather than calling it once per frame with a hardcoded `dt`, which ties simulated speed to refresh rate.

## Stepped motion is a style, not an accident

Quantizing a spring's output — rounding `value` to a grid, or writing it to the DOM only every
Nth frame — produces a stuttering, low-frame-rate look. That is a legitimate choice for a
mechanical or retro feel, but it must be declared: a stepped response still needs to reach its
rest value and stop drifting, exactly like a smooth one; unintentional quantization is a bug.

## Self-contained pages

Runtime motion must not depend on the network being available or fast:

- no CDN-hosted script tags (bundle or inline any animation helper);
- no remote font loading at runtime (self-host or system-stack fonts);
- no runtime requests to any origin other than the page's own (or `file:`) during load or while an
  interaction is being driven — a stalled request can eat the exact frame a spring needed to update.

## How `verify interaction` checks this

`verify interaction` drives real input against a page (pointer sweeps, wheel, clicks) and samples
the target element every frame, then flags:

- `dead-interaction` — the input fired but the target's box and transform never changed;
- `no-settle` — the target is still moving more than the settle threshold after the declared
  settle window;
- `rest-drift` — the element claimed it would return to rest but the final position differs from
  the pre-input position;
- `linear-response` (warn) — a response declared as `spring` shows no overshoot and no
  acceleration/deceleration phase, i.e. it is linear in practice;
- `opacity-only` — opacity changed while the box and transform stayed fixed;
- `external-request` — any request during load or probing left the page's own origin.

Each finding operationalizes a rule above: `dead-interaction`/`no-settle` are "responses settle",
`rest-drift` is the rest-value guarantee, and the rest map to the material and self-contained-page rules.

## Provenance

The idea that interactive responses should have mass, damping and overshoot — rather than
settling linearly to a target — is adapted, in our own words, from the reference skill recorded at
`references/reference-skill-motion-web.md` (CC BY-NC 4.0, ideas only, no upstream code, text or assets used here); the integrator, ranges, and prose here are original.
