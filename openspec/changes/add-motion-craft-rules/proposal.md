# Add motion craft rules

The film gates check structure (actions, handoffs, timing, sound) but not the craft of the motion
itself. Several craft rules are objective enough to check: a property driven by two tweens at
once, travelling motion with linear easing, films that should settle or loop but do not, and
actions that start at full speed or stop dead.

Add these as timeline and render checks with fixes, plus storyboard declarations (`endState`,
`arc`) so the rules only apply where the film asks for them. Also harden HyperFrames capture,
which a cold-start run showed could fall back to a stale timeline and still pass.
