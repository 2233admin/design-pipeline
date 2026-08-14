# Design Playground Blueprint

Use after direction selection for components, layouts, spacing, color, typography, responsive
behavior, and interaction tuning.

## Required Surface

- Controls grouped by genuine design decisions: structure, spacing, type, color/material, state,
  responsive behavior, and motion when applicable.
- Production-shaped preview using real content ranges and relevant states.
- Light/dark or contextual backgrounds when contrast and material perception depend on them.
- Three to five cohesive presets that express different balances inside the accepted direction.

## State And Output

Apply state through tokens, classes, or safe style properties; do not rebuild the preview from raw
HTML strings. Keep dimensions stable while controls change. The prompt is an implementation
direction that names the component/surface, intended feel and behavior, concrete values that
matter, responsive consequences, accessibility constraints, and what must remain unchanged.

## QA

Inspect minimum/typical/maximum content, mobile/desktop, keyboard focus, reduced motion, 200% zoom,
and every component state represented by the change contract.
