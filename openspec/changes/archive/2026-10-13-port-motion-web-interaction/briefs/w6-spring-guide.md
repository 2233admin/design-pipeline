# w6: spring-settle primitive and web motion guide

Read `_common.md` first. The contract is `design.md`, section "Primitive and guide".

## Build

1. `skill/references/motion-primitives.json`: add a `spring-settle` entry (id
   `response.spring-settle`, family `response`), following the shape of the existing entries
   exactly (read `transform.orbit` and one more). Parameters: stiffness, dampingRatio, mass,
   restValue, overshootLimit. Drivers: pointer, state, scroll. `reducedMotion`: jump to the rest
   value or use a short critically damped move. `provenance`: kind `idea`, source
   `skill/references/reference-skill-motion-web.md`, license `CC-BY-NC-4.0`, `adopted` = the idea
   that responses have mass, damping and overshoot; `rejected` = all upstream code, text and
   solver implementations; `codeCopied: false`. If the registry schema or a test restricts
   `family` or `provenance.kind` values, extend the allowed list minimally and say so in the PR.
2. `skill/references/web-motion.md` (new, about 80-120 lines, our own words):
   - motion as material: every motion changes the object or its state; no opacity-only entrances,
     no linear easing for things that have mass;
   - spring-damper basics: stiffness, damping ratio (below 1 overshoots then settles, 1 is
     critical, above 1 is sluggish), mass; typical ranges for UI (give a small table you derive
     yourself: snappy, soft, heavy);
   - a minimal, original, framework-free spring integrator in about 20 lines of JavaScript
     (semi-implicit Euler with a fixed step), explained;
   - stepped motion (quantized, low frame-rate jitter) as a deliberate style, not an accident;
   - self-contained pages: no CDN scripts or remote fonts at runtime;
   - how `verify interaction` checks all this (`dead-interaction`, `no-settle`, `rest-drift`,
     `linear-response`, `opacity-only`, `external-request`); another worker builds that command.
   - Cite `reference-skill-motion-web.md` as the source of the ideas (ideas only, non-commercial
     source).
3. Add `references/web-motion.md` to `skill/references/package-resources.json`.

## Tests

Keep the motion primitive registry tests green; add one assertion that `response.spring-settle`
exists with `codeCopied: false` and a provenance source pointing at the motion-web record.

## Files

`motion-primitives.json`, `web-motion.md`, `package-resources.json`, tests (and the schema file only
if needed), CHANGELOG. Branch: `motion-web-w6-spring-guide`.
