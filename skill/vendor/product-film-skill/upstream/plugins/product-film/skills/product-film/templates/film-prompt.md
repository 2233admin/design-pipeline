<context>
<Product> <does what, for whom, in one or two sentences>.
This film plays <where, from the interview>. It must read <with the sound off, if it plays muted>.
Read `videos/BRAND.md` first. It holds the brief, the look, the brand element, the components, the product owner's rulings and what we may claim. This prompt only adds the story.
</context>

<inputs>
Decided: <width>x<height>, 60 fps, <dark|light>, <N> bars at <BPM> BPM, <seconds> s. Music: <title, artist, license | silent>, in `public/audio/<film>/music/` (gitignored). Edit: song bars <a-b>, <c-d> (`edit.json`).
</inputs>

<direction>
<The feel in 3 short lines, in the product's own voice.>
Ingredients (from the interview): <brand element> · <how words appear> · <how scenes connect> · <extras>.
Only the product's own surfaces, colors, borders and effects.
Banned: <from BRAND.md, plus: anything the product's language does not use, words the product avoids, false claims>.
</direction>

<cast>
- The brand element: <the logo, a wordmark, a mascot the product has, or none>, and where it appears.
- Cursors: <the user's OS arrow, the product's own cursor, or none>.
- Demo world, from the landing page: <names, data, placeholders like (your product)>.
</cast>

<structure>
<BPM>, 4/4, <N> bars. One beat is <s> s. Something happens on every beat.

Bars 1 and 2, opening. <how the brand element or hero screen comes alive>.
Bar 3, <punchline or caption>: "<words>".
Bars .., <feature 1>. <what moves, beat by beat>.
Bars .., <the strongest moment, on the drop>.
Bars .., <proof, if chosen>.
Bars .., ending. "<tagline>" <call to action>.
Bars .., loop. <how it folds back into the first frame>.
</structure>

<build>
1. Remotion in `videos/`, set up as BRAND.md "Workspace" says. Kit in `src/kit/`, this film in `src/videos/<film>/`. fps from props: 60 in Studio, 240 for the final render.
2. Every style is a pure function of the frame. Components on their own clock get frame-driven twins.
3. `cues.ts` is the beat sheet as data; scene code never holds a literal frame number. A script writes the beat sheet table from it.
4. Springs are closed form; values that retarget sum one spring per key.
5. Transitions as chosen; magic moves use `kit/move.ts`, measured at both ends with `scripts/stills.ts --debug`.
6. Measure the song with `scripts/beats.py`; cut on bars with `scripts/audio-edit.py`; place sounds on measured peaks.
7. Final: `scripts/render.ts` (240 fps, motion blur), then `scripts/verify.py` (durations, decoded colors, loop seam). Report file sizes.
</build>

<gotchas>
Never put will-change on anything the camera scales. Text never travels across text. Keep a slot for every word before it lands. A texture under words stays thin there; behind UI it stays calm. If the film loops, the last frame equals frame 0. Draw dashes as SVG strokes. Judge the encoded file, and decode its pixels.
<Product claims: what needs a human approval step on screen, what the product never does.>
</gotchas>

<start>
Read `videos/BRAND.md`. Before any scene code, show the beat sheet on the measured grid and three style frames: the opening, one feature scene, the strongest moment. Wait for OK.
</start>
