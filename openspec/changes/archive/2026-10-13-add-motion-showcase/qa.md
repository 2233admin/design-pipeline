# Showcase QA

- Foundation checks: DESIGN.md and MOTION.md both ready.
- Syntax: app.js and server.cjs pass Node syntax checks; git diff --check passes.
- Actual rendered inspection in the in-app Chromium browser: hero, type section, and expanded
  poster inspected. Desktop observed width 1386px; mobile viewport 390 × 844.
- Horizontal document overflow: false at desktop and 390px mobile widths.
- Browser observed nine running CSS animations (orbit/counter-rotation pairs, floating sphere,
  display asterisk, and two type ribbons). Orbit position visibly differs between captures.
- Scroll observer marked the poster visible; expanded layers were visible on desktop and mobile.
- Pause control changed every CSS animation to paused. Resuming restored the normal state.
- Emulated prefers-reduced-motion: reduce produced zero running animations. Emulation and viewport
  overrides were reset before delivery; the page was restored to its hero.
- Browser warning/error log was empty during initial inspection.
- Repair: counter-rotate satellites to compensate for the orbit-plane transform; this keeps the
  moving sprites circular instead of stretching them as their angular position changes.
- Evidence: screenshots and raw browser/CDP observations are in the task tool outputs. No durable
  screenshot bundle, temporal trace, screen-reader audit, or measured frame-rate claim is made.
- Preview: http://127.0.0.1:4173. No remote deployment or PR publication.

This change adds an experiment only. The earlier 674-test full QA result belongs to
harden-motion-verification; it is not presented as browser evidence for this showcase.
