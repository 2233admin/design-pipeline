# Film motion contract

Foundation: experiments/ascii-canvas-launch/MOTION.md.
Foundation SHA-256: 30888d2eb62bb654f59f227fd2faf83fe528cc98c07c53f3a519ff9df2fb785c.
Primitives: transform.orbit and reveal.trim-line. CSS properties are driven by GSAP 3.13.0.
One root timeline, `window.__timelines['seed-film']`, has a finite 40-second duration.

## Opportunity and scenes
This is an occasional promotional film, so cinematic motion is the primary content. The aim is
to explain a creative workflow through six controlled scenes. UI controls remain outside the
composition and are immediately operable. Scene timing is in the experiment STORYBOARD.md.

## Timeline and ownership
- 0–7s: character torus rotates; title lines reveal over 1.35s with a 160ms stagger.
- 7–14s: camera pulls back over 7.2s, with four materials entering at 230ms intervals.
- 14–23s: nodes and paths enter in dependency order; image resolves, video still receives a push-in.
- 23–30s: palette becomes warm white; prompt types in 1.5s, plan thumbnails enter at 200ms intervals.
- 30–35.5s: ASCII gives way to a full-color landscape over 2.5s; camera gently settles.
- 35.5–40s: brand resolves; geometry freezes at 37s and final text completes by 37.4s.

ASCII is generated from a fixed torus projection and the image's sampled luminance. Torus time
is quantized to 24 samples/sec before evaluation. A GSAP-driven property setter also evaluates
during seeks with callbacks suppressed; no independent clock or JavaScript frame loop exists.

## Accessibility, degradation, cleanup
System reduced motion starts on a held end card; a preference change pauses. Explicit play is
available. The range supports keyboard seek; chapters hold representative frames. The static
transcript contains the claims and identifies the footage as a concept demonstration. No audio.
ResizeObserver controls only the outer scale. Pagehide releases listeners, observer, and timeline
except during BFCache preservation. Direct-file pixel-access restrictions use a deterministic
ASCII fallback. Local HTTP preview uses the actual image luminance.

## Evidence boundary
Browser scene captures, exact-time repeatability, image loading, controls, fullscreen, and mobile
overflow were checked. No MP4, audio mix, measured FPS, or HyperFrames CLI conformance is claimed.
