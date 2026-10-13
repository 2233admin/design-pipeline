# Tracking HUD film

A virtual camera films an agent's terminal while a tracker locks onto every glyph it types. This
project is the design-pipeline HyperFrames port of mrsarac/ff-tracking at `cc7f4e1` (MIT, Copyright
(c) 2026 Mustafa Saraç, see `LICENSE.ff-tracking`). The JetBrains Mono fonts in `assets/fonts/`
keep the SIL Open Font License in `assets/fonts/JetBrainsMono-OFL.txt`. The visual style credit
goes to Michael Nowak (@mnowakdesign); none of his footage is used, and none may be added. Guide:
`references/film-tracking-hud-template.md` in the design-pipeline skill.

`film.config.js` is the one file to edit: typed lines, palettes, shots and camera, timing, lens
strengths and lock-ping notes. `lib/tracks.js` derives every frame from it (boxes, focus, camera,
lock and key events), and the flat screen (`lib/flat.js`), the lens (`lib/lens.js`), the overlay
labels (`lib/overlay.js`), the storyboard and the sound (`sfx.cjs`) all read it. `index.html`,
`storyboard.json` and `tracks.json` are generated: rebuild instead of editing them.

1. `npm install` once (needs network): installs the pinned hyperframes and gsap. Afterwards run HyperFrames as `npx --no-install hyperframes ...`.
2. Edit film.config.js, then `node build.cjs`. It refuses a config whose typed line runs past the screen or whose tracked target leaves the safe frame, and otherwise rewrites storyboard.json, index.html, tracks.json and assets/sfx.wav (ffmpeg).
3. `designer-pipeline audio master --input assets/sfx.wav --output assets/sfx-mastered.wav --target web`; index.html plays the master.
4. `npx --no-install hyperframes render --output out.mp4 --browser-gpu` (`--no-browser-gpu` renders with SwiftShader where no GPU is available; add `--resolution landscape-4k` for 3840x2160).
5. `node probe.cjs --gpu hardware` in the same GPU mode (`--gpu software` for SwiftShader, `--dpr 2` for 4K). It must pass: identical pixels across reordered seeks and a second browser, labels equal to the projected box centres, markers and glyphs filmed where the labels say. Never claim a render it fails.
6. `designer-pipeline film check --project-root .` runs the storyboard, timeline, render, audio and composition gates; follow each finding's `fix`. The 0.5 s cut cadence is the template's; its uniform-cadence warning is a review prompt.
7. Review the draft frame by frame (`ffmpeg -i out.mp4 -vf fps=1 evidence/second-%03d.png`, every frame at full size: glyphs, labels, boxes, edges, empty frames), record the template revision, WebGL renderer, render command and probe numbers in qa.md, then ask the owner to accept or reject it. Gates never grant creative acceptance.
