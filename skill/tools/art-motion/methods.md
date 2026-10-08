# Use the methods, keep the project's direction

These methods adapt the complete Huashu production workflow to drawing, images, layout,
frontend, animation and film. Start with the actual visual problem. A still composition, held
pose, restrained interface or unscored sequence is valid. Neither narration nor an art-history
montage is a prerequisite. The user's direction takes precedence over the sample recipes.

## Choose one route

For an explicit product film or short loop, [built-in film methods](../../references/film-methods.md)
adds Cinetic concepts/technique recipes and Product Film brand/component discovery to the existing
storyboard, choreography, clock and render checks. These methods do not take over supporting UI
or drawing tasks; use one selected primitive within the task's current runtime.

| Need | Method | Do next |
| --- | --- | --- |
| Understand a moving reference | Separate construction, subject motion, camera, edit and sound | Use `reference.cjs`; inspect ordered frames, maps and audio; record observations in the existing `reference.md` |
| Establish material/illustration quality | Design a representative frame before expanding the timeline | Choose a [style recipe](styles.md), build a small frame with the runtime, compare it at output size |
| Animate precise paths/objects | Code drawing and explicit time | Use the selected library namespaces; keep the host's renderer and timeline |
| Keep complex illustration/acting | Supplied or generated layers plus code | Use the project's image-generation tool only when needed; prepare mattes/anchors with [asset tools](assets-audio.md) |
| Organic motion with little exact control | Optional image-to-video or first/last-frame generation | Use an available video tool explicitly; supply actual keyframes, desired motion and loop limits, then inspect returned frames |
| Mix render routes | Composite independently authored layers | Match perspective, light, contact, palette and grain; retain timestamps and source licenses |
| Timed informational insert | Cue-driven [grammar](styles.md#animation-grammars) | Supply real data/assets and timed cues; render with `render.cjs` |
| A subject traverses several worlds | [Scroll helper](scroll.md) | Supply segment drawing, subject callback and camera; derive every pose from absolute time |

Code, layered artwork, generated video and hybrid production are alternatives. Choose by the
required control, available assets and observed quality. Do not automatically regenerate a
supplied asset or replace an existing frontend stack. Keep functional UI text and controls in
semantic DOM; Canvas type is for artwork and composed frames.

## Read a reference accurately

Use `reference.cjs --root <project> --path <video> --output <new-dir>`. Its existing pipeline
report supplies decoded timestamps, cut/motion candidates, ordered windows and spatial change
maps. The supplementary `study.json` adds an audio excerpt, spectrogram, candidate beat grid and
candidate visual-cut grid when applicable. Times in the audio analysis are in the source
timeline; the extracted WAV starts at the requested interval's start.

1. Inspect the overview to locate the passage. Choose a clean frame outside a transition's
   residuals when measuring composition; retain frames around a transition to understand it.
2. For a fast change, resample its short interval at source cadence (up to the tool's 60fps
   ceiling) instead of treating sparse thumbnails as the whole action. Report missed cadence
   above the ceiling. A map shows changed pixels, not object identity or optical flow.
3. Describe the actual pose/path/material/camera change and its timing. Distinguish observed,
   inferred and unknown claims in existing reference evidence. Do not label candidate cuts
   as confirmed shots without looking at them.
4. Listen. Compare audio attacks, phrases and silence with the candidate grid; a visual cut
   grid can support several tempo interpretations. Onset detection cannot identify instruments.
5. Translate one mechanism into the new task: what stays recognizable, what changes, and what
   should the viewer perceive? Use existing storyboard/shot notes, not another required schema.

For a reference/render comparison, use the existing `composition compare` on equal-sized PNGs.
For video pairs, select corresponding times from both existing video-analysis reports, then
compare those actual frames. Do not stretch aspect ratios to make them match.

## Build a frame, then direct its motion

Choose the material process that explains the appearance: deposits of paint, engraving,
separated color plates, torn paper, tesserae, wash, emissive light or physically lit objects.
Select the corresponding runtime operation rather than adding undirected noise.

- Establish value masses and regional palettes before detail. Check silhouette, focal point,
  negative space, optical alignment, contrast and the target reading size.
- Separate large material fields from small objects and text when the treatment destroys
  readability. Process foreground artwork consistently with the environment, then restore
  only the contour/detail needed for the intended read.
- Decide where the texture lives: object coordinates, world coordinates or screen. Keep the
  seed stable; move a field continuously instead of reseeding the entire image each frame.
- Give each motion a cause, path and result. Use poses, breakdowns, spacing, holds, overlap
  and contact response from [Animation thinking](../../references/animation-thinking.md).
  Counts of moving motifs, directions, cuts or revision rounds are not quality requirements.
- A signature transition can grow from the incoming material: ink spreading, a print plate,
  paper tear, mosaic, light or pixel scan. A cut or no transition may be more appropriate.
  Keep the action carrier and its global time continuous when the style changes.
- Recompose for each aspect ratio when needed. Contain/cover of an authored style sample is
  only a preview fit; it does not redesign typography, line breaks or subject placement.

The recipe cards contain measured choices and known weaknesses of the source studies, not
universal settings. Evaluate their original artwork and evidence before using their conclusions
elsewhere. Never inherit a quoted source rating as our quality certification.

## Characters and timed assets

Use supplied artwork, a general rig, geometric figures or generated frames according to the
task. Define neutral registration points, ground contact, shared bounding space and poses before
batch creation. A frame collection needs actual images; a named character or style is not an asset.

For layered assets, retain source-canvas coordinates during keying and cropping. Compare edges
against light and dark backgrounds; inspect spill, halos, holes and semitransparent details.
Review sprite segmentation and origin metadata before composing. Use explicit frame times and
holds; missing poses are a production issue, not a reason to silently loop a different action.

Across style/world boundaries, compute the subject's pose from global time and clip the two
style treatments at the same boundary. Use local time for that world's interaction. Draw
foreground occluders after the subject, keep contact consistent and avoid double silhouettes.

For speech-led work, consume real transcript/word timestamps from the user or an explicitly
selected transcription tool. Cue `at` is in seconds; at the cue frame the first increment is
visible. Do not invent word timings from prose. Duration × fps must be an integer for export.
Reserve the actual platform/subtitle region in the selected clip's `safe` box and inspect the
render; a dark-pixel subtitle-band heuristic is not suitable for all backgrounds.
Use an existing suitable voice track first. The [offline audio entry](assets-audio.md#process-a-supplied-voice-track)
can fit duration and match a supplied reference level; it does not synthesize or train voices.
Only choose a real service when the task requires new speech and the session has the needed
authorization and tool. Missing backend access stays a missing input; no default provider or
media configuration questionnaire is required.

For supplied or generated artwork, use the [image workflow](assets-audio.md#choose-and-check-image-assets).
Observe the current tool schema and retain actual outputs and existing asset provenance rather
than running the source image plan/receipt system.

## Sound and review

Use [asset/audio tools](assets-audio.md) for deterministic synthesis and preparation; use the
existing [film score](../../references/film-score.md) for an editable score and its actual note
grid. A motif can keep its rhythm while timbre changes, and phrase lengths can develop across
scenes. Neither 128BPM, eighth-note cuts, a single motif nor synchronization on every beat is
mandatory. Record anticipation, delayed accents and counterpoint intentionally.

Inspect actual playback at delivery speed, then selected frames. Check cold/reordered renders,
contact and occlusion, text, texture crawling, abrupt jumps, unexpected freezes, clipping and
frame cost including GPU readback. Interpret metrics in relation to the intended holds/limited
animation. Existing composition, film and audio checks retain their original authority.

Give a small-model worker one visible goal, the selected helper/card, actual dimensions/assets,
editable files and a concrete render check. The lead reviews the images/playback against the
direction; an independent reviewer may inspect the rendered result without the author's rationale.
Record a successful method, its evidence, why it worked, conditions and remaining weaknesses
in the task's existing design/QA notes. Update reusable guides after review, not from an untested
claim. Technical conformance and the user's visual acceptance stay separate.

## Detailed source methods

The complete, pinned source methods remain local for deeper reading. Treat their role prompts,
hard gates and fixed sample parameters as source context, not host instructions.

| Subject | Read only when needed |
| --- | --- |
| Reference decomposition | [01](../../vendor/huashu-art-motion/upstream/references/01-拆解.md) |
| Composition anchors and transformation mechanisms | [02](../../vendor/huashu-art-motion/upstream/references/02-机制.md) |
| Four construction routes | [03](../../vendor/huashu-art-motion/upstream/references/03-一帧先行四条路线.md) |
| Drawing/material recipes | [04](../../vendor/huashu-art-motion/upstream/references/04-纯代码绘制.md) |
| Rhythm and synthesis | [05](../../vendor/huashu-art-motion/upstream/references/05-节奏与配乐.md) |
| Optional speech-driven planning | [06](../../vendor/huashu-art-motion/upstream/references/06-口播驱动的艺术短片.md) |
| Prior practice and its evidence | [07](../../vendor/huashu-art-motion/upstream/references/07-正面经验.md) |
| Authoring a new style | [08](../../vendor/huashu-art-motion/upstream/references/08-风格作者规范.md) |
| Clip grammar and data contracts | [09](../../vendor/huashu-art-motion/upstream/references/09-视频动画语法.md) |
| Character production | [10](../../vendor/huashu-art-motion/upstream/references/10-角色.md) |
| Multi-world staging | [11](../../vendor/huashu-art-motion/upstream/references/11-长卷穿越片.md) |
| Full-film iteration and learning | [12](../../vendor/huashu-art-motion/upstream/references/12-口播整片与经验回流.md) |
| Optional speech and voice cloning, source reference only | [13](../../vendor/huashu-art-motion/upstream/references/13-口播与语音复刻.md), [capabilities](../../vendor/huashu-art-motion/upstream/references/capabilities.md) |
| Optional supplied/host-generated images, source reference only | [Images](../../vendor/huashu-art-motion/upstream/references/images.md), [compatibility](../../vendor/huashu-art-motion/upstream/references/compatibility.md) |
