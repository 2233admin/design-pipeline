# Motion specification

Foundation: experiments/motion-showcase/MOTION.md.
SHA-256: e5419ab0ca446043d9dd1517406e6c8a1beb96b807d1324b8dd8893a5cf039a9.
Primitive: transform.orbit. Runtime: CSS; original authored implementation, no imported code.

| Scene | Channels | Timing | Trigger / purpose |
| --- | --- | --- | --- |
| Orbital sculpture | position, rotation, vertical float | 12s / 19s linear orbit, 7s ease-in-out float | Page visible; explain shared spatial relationships |
| Display asterisk | rotation | 18s linear | Page visible; tie typography to the sculpture |
| Type ribbon | horizontal position | 30s / 38s linear | Page visible; expose typographic rhythm |
| Poster sheets | translation, rotation | 900ms cubic-bezier(.22,1,.36,1) | 25% visible; unfold spatial hierarchy |
| Poster interior | two bounded rotation axes | 220ms ease-out, ±6 degrees | Mouse position; explore depth |

The show is an occasional demonstration, so continuous motion is intentional. Navigation and
body copy stay still. One pause button freezes loops; system reduced motion removes interpolation.
No JavaScript render loop or timer. Observers and handlers are released on terminal pagehide;
BFCache restores retain their bindings. Compositor properties only; the shadow blur is static.

QA: actual browser screenshots and DOM/CDP observations, described in qa.md. No frame-rate or
low-end-device performance claim is made.
