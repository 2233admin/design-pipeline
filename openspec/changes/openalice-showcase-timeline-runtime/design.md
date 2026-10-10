# Design

## Structure

`.timeline` is `position: relative` and owns two siblings: the absolutely positioned `.rail` and `.scenes`. The ordered list contains scene `li` elements only. The rail's top and height are measured relative to `.timeline`, while each point offset remains relative to its scene.

## Motion and Accessibility

The selected `reveal.trim-line` primitive binds normalized progress to an inline SVG path through `stroke-dashoffset` with `pathLength=1`. Scroll progress is normalized between the first and last point centres. Passed scenes latch once reached and remain visible during back-scroll. With `prefers-reduced-motion: reduce`, the rail is complete, scenes are settled, smooth scrolling is disabled, and the approval gate remains operable.

## Evidence

Runtime evidence covers a fresh 1440×900 no-preference load at scroll top, smooth scroll to the document end, back-scroll latching, keyboard approve/reject, reduced motion, empty console/page-error capture, direct ordered-list children, and readable WebM output.
