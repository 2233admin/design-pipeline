# Motion Spec

Create `motion.md` from this template when a change includes non-trivial animation or interaction motion.

## Summary

- Change id:
- Surfaces:
- Motion owner:
- Implementation target: CSS / GSAP / Anime.js / React View Transitions / existing project library
- Motion risk: low / medium / high

## Motion Principles

State the motion posture for this surface.

- Purpose:
- Product feeling:
- What motion must never do:
- Reduced-motion principle:

Examples:

- Operational tools: motion confirms state and preserves orientation; it must not delay repeated work.
- Marketing/portfolio pages: motion can create reveal and rhythm; it must still keep content inspectable.
- Data-heavy dashboards: motion should clarify changes; it must not obscure comparison.

## Interaction Inventory

| Element / flow | Trigger | User intent | Motion response | Required? |
| --- | --- | --- | --- | --- |
|  | hover / focus / click / route / scroll / data update / load / error |  |  | yes/no |

Include empty, loading, error, disabled, hover, focus, active, success, and interrupted states when relevant.

## Timeline And Choreography

| Sequence | Starts when | Elements | Order | Duration | Delay / stagger | Can interrupt? |
| --- | --- | --- | --- | ---: | ---: | --- |
|  |  |  |  |  |  |  |

Rules:

- Specify duration in milliseconds.
- Specify stagger separately from delay.
- Describe what happens when the user repeats the action quickly.
- Avoid chaining motion that blocks reading, navigation, or input.

## Easing

| Motion type | Easing | Why |
| --- | --- | --- |
| Small UI feedback |  |  |
| Enter / reveal |  |  |
| Exit / dismiss |  |  |
| Route transition |  |  |
| Scroll-linked motion |  |  |

Use concrete easing names or cubic-bezier values when implementation needs them.

## Spatial Behavior

- Origin:
- Direction:
- Distance:
- Scale:
- Opacity:
- Blur/filter:
- Transform-only where possible:
- Layout-affecting animation allowed? yes/no, why:

## Accessibility

- `prefers-reduced-motion` behavior:
- Keyboard focus behavior:
- Screen reader impact:
- Animation pause/stop/skip:
- Touch target stability:
- No motion-only meaning:

## Performance Budget

- Max animation duration before user can interact:
- Target frame rate:
- Properties allowed:
- Properties avoided:
- ScrollTrigger / scroll observer refresh behavior:
- Heavy asset strategy:
- Mobile fallback:

Default posture:

- Prefer `transform` and `opacity`.
- Avoid animating layout properties unless the reason is explicit.
- Do not animate large blur/filter effects on low-end mobile without fallback.

## Library Decision

| Candidate | Use when | Rejected because |
| --- | --- | --- |
| CSS transitions/keyframes | Simple state changes |  |
| Anime.js | Lightweight scripted DOM/SVG motion |  |
| GSAP | Complex choreography, scroll, timelines, plugins, React integration |  |
| React View Transitions | Route/navigation continuity |  |
| Existing project library | Project already standardizes on it |  |

Selected:

- Library:
- Reason:
- Required companion skill:
- Dependency already present? yes/no:
- If new dependency, why CSS/existing library is insufficient:

## Implementation Notes

- Components/files:
- Tokens/classes:
- Hooks/utilities:
- Cleanup/unmount behavior:
- Server/client boundary:
- Testing hooks:

## QA Scenarios

| Scenario | Expected result | Evidence |
| --- | --- | --- |
| First load |  |  |
| Fast repeated click |  |  |
| Keyboard navigation |  |  |
| Reduced motion |  |  |
| Mobile viewport |  |  |
| Slow device/network |  |  |
| Route interruption |  |  |
| Scroll up/down repeatedly |  |  |

## Final Motion Score

Use 0-5.

| Dimension | Score | Notes |
| --- | ---: | --- |
| Purpose |  |  |
| Clarity |  |  |
| Responsiveness |  |  |
| Accessibility |  |  |
| Performance |  |  |
| Implementation fit |  |  |
