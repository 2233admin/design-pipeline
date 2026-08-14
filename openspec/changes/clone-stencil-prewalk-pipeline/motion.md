# Motion: Prewalk pipeline reconstruction

## Foundation

Project motion authority: `../../../MOTION.md`, SHA-256
`5a23e0fcdb7d4ebddea2f8f446b91edbdaba3812baf44a7066034b5b2d8e7302`.

The source is a long-form article whose meaning is static. No choreography, parallax, autoplay,
scroll interception, or motion runtime is required.

## State Transitions

- Anchor and button hover/focus: use the localized source CSS timing and easing; interruption is the
  browser's immediate pointer/focus state change.
- Copy activation: immediate clipboard side effect, with no geometry-changing visual transition.
- Hash navigation: browser-native jump to `#django-13279-ribbons`.
- Inline SVG and captured canvas figures: frozen explanatory states; no interaction depends on an
  animated frame.

## Performance

No animation library or render loop is added. CSS is the only transition mechanism. Captured canvas
frames avoid a client runtime and are decoded as ordinary local images.

## Reduced Motion

Under `prefers-reduced-motion: reduce`, set animation and transition duration to zero while retaining
all content, controls, focus visibility, hash navigation, and copy behavior. Static comparison also
disables animation after live hover/focus evidence has been recorded so both sides use a deterministic
frame.
