# Scene / Film 场景动效配方

Original offline studies for the 106 `scene` catalogue items: 18 camera, 3 depth3d, 12 effect, 25 transitions, 12 light, 10 look, 7 loops, 7 character, 8 particles and 4 sound entries. Search by **推镜 / dolly**, **视差 / parallax**, **遮罩转场 / wipe**, **粒子聚形 / coalesce**, **角色起跳 / jump**, **纸片停格 / cutout**, **音效偏移 / cue offset**. The [offline gallery](../../../tools/motion-recipes/full/index.html) selects an exact source ID with `#motion=<id>`; the catalogue remains the authoritative parameter configuration.

These are original mechanism studies, not upstream replicas or a new production renderer. A browser study **does not certify rendered film, spatial rendering, a soundtrack, measured spectrum, loudness, synchronization of an encoded file, or owner Visual Acceptance**. Titles and durations are factual catalogue observations; no upstream code, assets or descriptive prose is bundled. The source redistribution licence remains unverified. Source attribution: [Motion Reference](https://motion-reference.takayustudio.jp/).

## Choose the channel, not a new workflow

- **Ordinary web/UI:** keep existing DOM/CSS/SVG ownership, product state, accessibility and `DESIGN.md` / `MOTION.md`. The specimen's Canvas is an explicit teaching channel, not a reason to put product controls or reading text into artwork. Product motion tokens override all study values.
- **Film:** apply the existing [HyperFrames route](../../hyperframes.md), storyboard and motion plan. Register one fully constructed paused composition timeline. Convert local time to `progress = clamp((timeSec - startSec) / durationSec)`; let the renderer seek it. Re-author actual project properties rather than starting the gallery's playback loop inside a film. Media playback stays renderer-owned.
- **Edit:** use [film-edit](../../film-edit.md) for existing footage and cue timecodes. Its clip effects are currently `flash`, `freeze`, and `zoom-punch`; do not insert study descriptor IDs into `edit.json.fx`. Render a generated transition/shot through the existing film route and bring the clip into the edit when that effect is not supported by assembly.
- **Canvas/scene renderer:** [Art Motion](../../../tools/art-motion/README.md) already exposes `CAM`, `MO`, `RIG`, `PAINT` and material-aware transitions. Its 2D camera is not a physical lens. Transfer camera keys, layers, pose phases and material passes to the selected renderer; use a true perspective camera for lens/dolly relationships. Persistent scene work retains its existing [scene/runtime ownership](../../scene-runtime-spec.md), not a new study schema or public kind.

## Authored state and lifecycle

`scene.js` exports `{group:'scene', recipes}` in CommonJS and `MotionRecipeModules.scene` in the browser. Load classic `scene-camera.js` and `scene-composite.js` **before** `scene.js`; CommonJS requires both helpers. Nothing reads the DOM at require time. Each namespaced descriptor has `title`, `validate(parameters)` and `create(stage, parameters, {reducedMotion, text, seed})`; create returns `seek(progress)` and `dispose()`. Every mapped item has a full explicit parameter set. Missing, unknown and out-of-range keys are errors, never a generic fallback.

The gallery owns the clock. A seek is computed from progress and a fixed seed, not prior frame state, `Date.now()`, a running simulation, or accumulated trail pixels. Cold seek and descending seek must show the same state as forward seek at that time. Switching variants or cancelling a study calls `dispose()`; it removes owned nodes, clears its stage marker and releases canvas buffers. No study starts an autonomous timer, RAF, audio context or pointer listener. Rebuild at a real resize, font/material change, or reduced-motion preference change; do not reconstruct the DOM on every frame.

The visible scene is presentation authority only. A film's storyboard/edit/cue grid owns shot order and timing. A UI's actual state owns loading, completion, focus and announcements. No glow, particle cloud or character pose may delay a logical result. There are no pointer/scroll handlers here: if a UI needs scrubbing, map the already-owned scroll or input state to progress, clamp it, handle cancel/reset, and preserve keyboard/focus equivalents in semantic DOM.

## Trigger, phase timing and no-motion policy

Teaching durations are distinct from observed source action/loop durations and product budgets. Most non-loop studies use 2.4 s for inspectable phase timing; particles use 3.2 s and loops use 4 s. Sound studies derive time from `beats × 60000 / bpm`. Exact configured values are recorded per catalogue variant.

| Scenario | Trigger and phases | End/cancel and frequency | Reduced/no-motion substitute |
| --- | --- | --- | --- |
| Camera move | An authored shot begins; establish near/far composition, move camera or lens, settle | Cut/cancel commits the selected shot camera, not the last animated frame; no continuous camera wobble in ordinary reading UI | Fixed readable camera; eliminate shake, whip and parallax travel |
| Transition | A real shot/state change supplies both A and B; retain A until the cut/matte reveals B | Seek directly to selected state on cancel. One transition per genuine change, not an idle loop | Readable static B or a static temporal-cut diagram |
| Light/material | A bounded cue or surface reveal, not a fake loading signal | Stop glow emphasis once the event is understood. Neon ignition/radial accents are optional film effects, not critical UI feedback | Constant low-intensity material/contour with no flicker or flashing |
| Particles | One event burst, continuous environment, or assigned target formation | Bursts have finite lifetimes; environment playback is host-controlled, paused offscreen and removed on cancel | Static particle distribution; coalescence shows the final target geometry |
| Character | Pose/state change or explicitly authored gait/breath cycle | Jump: anticipation 0–20%, flight 20–78%, landing 78–100%. Tail response samples delayed impulses. Cancellation selects a valid grounded/key pose | Neutral grounded pose, open eyes, or final facial direction; no repetitive body travel |
| Look | A deliberate image treatment/exposure choice | Never keep adding grain/trails to previous frames; all samples come from authored time | Stable grain/scanlines/material, full brush path or pigment wash, one sharp exposure sample |
| Loop | Explicit ambient/decorative permission, not an implicit auto-repeat | Host may repeat only when appropriate; phase wraps at motif period. Stop and restore readable state offscreen/on cancel | Static ring, contour, tile or neutral object; no marquee or repetition |
| Audio relationship | Authored beat/onset/word/gain data with explicit timebase | Never infer live sound from a moving graphic. Real playback/mix belongs to the existing film/audio path | Static unequal-band or cue/gain timeline; semantics remain in caption |

For vestibular-sensitive or task-focused reading surfaces, no motion is often the correct adaptation. Do not use flicker, grain, scan sweeps, exposure smears or camera movement merely because a catalogue entry exists. Keep flashing accents optional and subject to the target project's accessibility requirements.

## Camera and depth / 机位、镜片与纵深

The 21 camera/depth source variants select 20 descriptors in `scene-camera.js`; only push-in and pull-out share `scene.camera-dolly`, with reversed distance endpoints. The remaining camera concepts are separate branches. In the table, descriptor suffixes are prefixed with `scene.`. **Lens** means required `sensorWidthMm`, `focalMm`; **pose** adds required `cameraDistance`. Those values describe an authored projection, not a new product token scale. Every listed extra key is required; the descriptor validates its numeric bounds and endpoint relationships.

| Source ID → descriptor suffix | Required parameters beyond lens/pose | Mechanism and visible inspection cue |
| --- | --- | --- |
| `cam-pan` → `camera-pan` | Pose; `yawStartDeg`, `yawEndDeg` | Position fixed, yaw changes; sightline diagram rotates without moving its origin |
| `cam-truck` → `camera-truck` | Pose; `xStart`, `xEnd` | Lateral translation with fixed orientation; near geometry travels more than far geometry |
| `cam-pedestal` → `camera-pedestal` | Pose; `heightStart`, `heightEnd` | Vertical translation without pitch compensation; camera height readout changes |
| `cam-crane` → `camera-crane-arc` | Pose; `boomLength`, `pivotHeight`, `armStartDeg`, `armEndDeg` | Fixed jib pivot couples Y/Z displacement while aiming at the subject; inspect arm and pivot diagram |
| `cam-pushin`, `cam-pullout` → `camera-dolly` | Lens; `distanceStart`, `distanceEnd` | Fixed lens changes world distance and near/far size ratios; the two variants reverse 11→6 and 6→11 world units |
| `cam-zoomvsdolly` → `camera-optical-zoom` | No lens/pose shortcut: `sensorWidthMm`, `cameraDistance`, `focalStartMm`, `focalEndMm` | Position fixed; all depth magnifications share the focal-length multiplier |
| `cam-vertigo` → `camera-dolly-zoom` | `sensorWidthMm`, `distanceStart`, `distanceEnd`, `referenceFocalMm` | Compensated focal length retains front-subject size while background scale changes |
| `cam-orbit` → `camera-orbit` | Lens; `radius`, `height`, `angleStartDeg`, `angleEndDeg` | Circular position plus subject aim reveals different rigid faces and occlusion |
| `cam-follow` → `camera-follow-lookahead` | Pose; `pathSpan`, `lookAhead`, `lagFraction` | Independent subject movement with analytical lag and forward aim; inspect subject/camera displacement separately |
| `cam-handheld` → `camera-handheld-drift` | Pose; `amplitudeWorld`, `angularAmplitudeDeg`, `cycles` | Bounded seed-phased pose harmonics, not fresh random offsets per seek |
| `cam-kenburns` → `camera-photo-crop` | `startZoom`, `endZoom`, `startCenterX`, `startCenterY`, `endCenterX`, `endCenterY` | A single original illustrated image plane; overview rectangle moves/shrinks inside its bounds, with no invented depth |
| `cam-parallax` → `camera-depth-parallax` | Pose; `depthGap`, `travel` | Three actual world-depth bands divide projected travel by distance |
| `cam-rack` → `camera-rack-focus` | Pose; `focusStart`, `focusEnd`, `apertureStrength`, `blurLimitPx` | Geometry remains fixed while distance-dependent defocus transfers between near/far planes |
| `cam-roll` → `camera-optical-roll` | Pose; `rollStartDeg`, `rollEndDeg` | Optical-axis basis rotation, not yaw or translated scenery |
| `cam-shake` → `camera-hit-shake` | Pose; `amplitudeWorld`, `angularAmplitudeDeg`, integer `oscillations`, `decay`, `hitAt` | One bounded damped hit; inspect before hit, shortly after hit and final rest, not endpoints alone |
| `cam-whip` → `camera-whip-exposure` | Pose; `yawStartDeg`, `yawEndDeg`, `holdFraction`, `shutterFraction` | Holds bracket rapid yaw; five finite shutter samples produce distinct projected exposure around midpoint |
| `cam-punch` → `camera-beat-lens-punch` | Pose; `strength`, `beatAt`, `attackFraction`, `decay` | One focal-length impulse; compare immediately before/after attack and settled end |
| `3d-coverflow` → `perspective-coverflow` | Pose; integer `count`, `spacing`, `tiltDeg`, `recede`, integer `selectionFrom`, integer `selectionTo`, `settleRate` | Separate planes rotate/recede around the selected index; inspect actual occlusion and card angles |
| `3d-cube` → `rigid-cube-projection` | Pose; `size`, `yawStartDeg`, `yawTurns`, `pitchDeg` | Six rigid faces, back-face rejection and perspective depth sorting; inspect intermediate face visibility |
| `3d-depth` → `perspective-depth-stack` | Pose; integer `count`, `spacingStart`, `spacingEnd`, `offsetX`, `viewAngleDeg` | Increasing Z separation viewed obliquely reveals independent layers |

This is a small Canvas perspective study: planar artwork, a six-face box, near-plane clipping and painter-order visibility. It is not a production 3D rasterizer, physically accurate depth of field, lens distortion, bokeh, collision solver, camera rig or skinned asset. Rack focus requires Canvas2D filter support in normal motion and reports an explicit error when unavailable. Reduced motion freezes a meaningful final pose; handheld, hit and punch use neutral camera poses, and rack focus keeps all depth labels sharp.

Transfer world-space camera/target keys to the existing renderer's real perspective camera. Keep sensor/focal conventions, axis directions, unit scale, near clipping and shot framing explicit. Optical zoom must change focal length; a dolly must move the camera. Coverflow's selected index belongs to the semantic UI, not to a drawing or an animation completion callback.

## Compositing and transitions / 双画面合成与遮切

The 37 effect/transition variants select 35 descriptors in `scene-composite.js`. All sample two original A/B image buffers. `pixel-dissolve` and `tr-pixel` share actual seeded cell sampling but use different grid/softness values; `glitch-in` and `tr-glitch` share actual displaced bands but use different phase windows/offsets. No source ID is treated as an implementation branch by its name alone.

| Source ID → descriptor suffix | Required parameters | Actual mechanism / pixel inspection cue |
| --- | --- | --- |
| `tr-wipe` → `linear-wipe` | `angleDeg`, `featherPx` | Rotated half-plane with independently feathered advancing edge |
| `tr-clock` → `clock-wipe` | `startAngleDeg`, boolean `clockwise`, `centerX`, `centerY` | Angular sector, not an increasing circular radius |
| `tr-iris` → `iris` | `centerX`, `centerY`, `exponent` | Radius reaches all frame corners; exponent controls growth |
| `tr-shapeiris` → `star-iris` | integer `points`, `innerRatio`, `centerX`, `centerY`, `rotationDeg` | Alternating-radius star aperture, including visible indentations |
| `tr-inset` → `inset-clip` | `centerX`, `centerY`, `aspect` | Expanding rectangular matte with explicit aspect |
| `tr-brush` → `brush-wipe` | integer `strokes`, `roughness`, `tilt` | Staggered overlapping bands with seeded rough edges |
| `tr-letter` → `letter-clip` | single-grapheme `glyph`, `initialScale` | Raster glyph matte expands around an opaque stroke; counters stay transparent |
| `tr-blinds` → `blinds` | integer `slats`, `stagger` | Individual slats widen from their centers |
| `tr-blocks` → `block-reveal` | integer `columns`, integer `rows`, `spread` | Diagonal cell ordering plus individual vertical growth |
| `tr-pixel`, `pixel-dissolve` → `pixel-dissolve` | integer `columns`, integer `rows`, `softness` | Seeded cropped-cell thresholds; hard 48×28 versus softer 30×18 variant |
| `slice-reveal` → `slice-reveal` | integer `slices`, `travelPx`, `stagger`, `skew` | Alternating clipped strips translate with decaying skew |
| `tr-cut` → `hard-cut` | `cutAt` | A/B identity switches only across the exact boundary |
| `tr-dissolve` → `dissolve` | `start`, `end` | Whole-shot mixing over an explicit interval |
| `tr-blur` → `blur-dissolve` | `blurPx`, `start`, `end` | Separate image blur plus crossfade, padded to hide edge sampling |
| `tr-match` → `match-cut` | `cutAt`, `anchorX`, `anchorY`, `radius` | Circle anchor/extent stay invariant across changed backgrounds |
| `tr-morph` → `shape-morph-bridge` | integer `corners`, `bridgeScale`, `morphStart`, `morphEnd` | Actual circle-to-polygon contour interpolation covers the background cut |
| `tr-push` → `push-slide` | `direction` = `left` or `right` | Two translating shots maintain a shared filling edge |
| `tr-drop` → `gravity-drop` | `acceleration`, `tiltDeg`, `hingeX` | Quadratic drop and hinge rotation expose stable B |
| `tr-flip` → `perspective-flip` | `perspective`, integer `strips` | Strip-projected card becomes edge-on before changing faces |
| `mosaic-flip` → `mosaic-flip` | integer `columns`, integer `rows`, `spread`, `perspective` | Many independently phased perspective cell flips |
| `tr-flood` → `colour-flood` | six-digit hex `color`, `centerX`, `centerY` | Opaque disk covers the cut, then contracts |
| `tr-leak` → `light-leak` | six-digit hex `color`, `width`, `angleDeg` | Screen-composited exposure gradient plus broad midpoint veil |
| `tr-streak` → `light-streak` | integer `streaks`, `widthPx`, `slope` | Separate seeded luminous strips sweep across shifting framing |
| `tr-whip` → `whip-pan` | `travel`, `blurPx`, `cutAt` | Rapid offsets, wrapped source copies and finite exposure samples |
| `tr-zoomthrough` → `zoom-through` | `zoom`, `settleZoom`, `focusX`, `focusY` | Scaled outgoing motif opens a destination-out aperture over settling B |
| `blur-zoom` → `blur-zoom` | `blurPx`, `zoom`, integer `samples` | Differently scaled subframes create radial exposure drag |
| `chromatic-split` → `chromatic-split` | `splitPx`, `cutAt` | Real R/G/B pixel planes offset and recombine additively |
| `displacement-wave` → `displacement-wave` | `amplitudePx`, `wavelengthPx`, `cycles`, integer `stripPx`, `cutAt` | Source strips resample with a phase-dependent displacement wave |
| `glitch-in`, `tr-glitch` → `glitch-bands` | integer `bands`, `shiftPx`, `cutAt`, `window`, integer `steps` | Seeded band thresholds and quantized offsets; earlier/wider versus later/narrower fault window |
| `liquid-morph` → `liquid-morph` | integer `columns`, `sagPx`, `viscosity` | Source columns stretch below an irregular moving front; no fluid solver claim |
| `ink-reveal` → `ink-reveal` | integer `splats`, `roughness`, `centerX`, `centerY` | Union of expanding seeded rough radial splats |
| `noise-reveal` → `noise-resolve` | integer `columns`, integer `rows`, `contrast` | Actual noise raster plus thresholded source-cell resolution |
| `particle-burst` → `particle-burst` | integer `columns`, integer `rows`, `spreadPx`, `gravityPx` | Cropped outgoing image fragments disperse, fall and shrink |
| `ripple-reveal` → `ripple-reveal` | `centerX`, `centerY`, integer `rings`, `amplitudePx`, integer `cellPx` | Radially displaced image samples plus expanding iris/front rings |
| `tr-jcut` → `sound-offset-cut` | `visualCutAt`, `lead`, `lag` | Incoming B cue precedes visual cut; outgoing A cue persists afterward; deliberately silent |

Masks use Canvas `source-in`; the scale-through aperture uses `destination-out`; color/exposure and RGB passes have separate screen/additive ownership. Perspective strips, image-cell resampling and column deformation are bounded teaching approximations, not physically correct renderers. Normal blur crossfade, whip and blur zoom require Canvas2D filter support and fail explicitly rather than pretending an unblurred fallback is equivalent. Letter aperture requires a locally available font with the configured glyph; an unusable opaque stroke is an explicit error, not a fake letter rectangle.

In production, bring actual licensed A/B footage or scene layers into the existing compositor. Preserve alpha, premultiplication, color space, safe sampling bounds and delivery frame rate. Re-author the matte and event timing, inspect encoded edges and occlusion, and release buffers/textures on interruption. J/L-cut bars are an authored timing diagram only: apply lead/lag to actual audio tracks through the existing score/edit route and verify the exported overlap audibly. Reduced motion shows stable B, except J/L-cut retains its static lane diagram.

## Branch inspection / 检查提示（不是已执行证据）

Load scripts in this exact relative order from the offline gallery: `scene-camera.js`, `scene-composite.js`, then `scene.js`. The helpers publish `MotionSceneCamera` and `MotionSceneComposite`; the final module publishes `MotionRecipeModules.scene`. CommonJS loads both helpers itself. The 106 variants map to 103 descriptors: 48 direct scene mechanisms, 20 camera/depth mechanisms and 35 compositing mechanisms.

For integration inspection, select the exact hash variant and assert `stage.dataset.recipe` separately from its visible result. Mount a fresh study at a cold intermediate progress, compare against forward then descending seeks at that same progress with the same seed/text, and inspect interior Canvas pixels or projected geometry—not only captions. Sample `0`, `0.25`, `0.5`, `0.75`, `1` plus event-specific boundaries. A hard/match cut needs frames on either side of `cutAt`; a lens punch needs the short attack; shake needs the hit and decay. A full cube revolution and seamless loops can have identical endpoints, so endpoint-only comparisons are insufficient. Glitch, neon ignition and grain require phase samples, not a single still.

The camera/compositing tables give branch-specific cues. For the remaining direct studies, inspect local geometry/luminance: coalescence target versus launch trails, alternating articulated legs versus eyelid aperture, separate rim/highlight/flare locations, brush-path extent versus nearest-neighbor raster cells, contour deformation versus tile seam, and unequal band/gain/cue lanes. The following sections describe each direct branch. Vary a consumed parameter within validated bounds where variants differ; changing a label is not behavior evidence.

Repeat with reduced motion: normal input progress may change diagnostics, but presentation must remain static, legible and free of travel/flicker/repetition. Dispose and switch variants; owned nodes/buffers must disappear without an autonomous RAF, timer or audio resource. These are instructions for the integration owner; the mapping handoff and this guide do not assert that browser playback or source-wide visual fidelity was verified.

## Light / 发光机制

Parameters: `strength` is screen-pass opacity in [0.1,1]; `width` is the actual ribbon/blur/beam/ray width in authored canvas units (branch-specific validated bounds); `cycles` is an integer phase count only where supported. These are teaching units, not a new token scale.

| IDs | Actual channel and mechanism |
| --- | --- |
| `aurora-glow` | Five wavelength-colored broad sine ribbons under screen compositing; width changes illuminated area |
| `bloom-reveal`, `glow-pulse`, `neon-flicker` | Emissive contour + finite blur radius, respectively accumulated reveal, periodic luminance envelope, and irregular bounded ignition that settles |
| `energy-charge` | Accumulating angular arc and inward radial marks; charge coverage is separate from brightness |
| `holographic-sheen`, `light-sweep` | Clipped moving spectral versus achromatic highlight bands across a face |
| `lens-flare-sweep` | Moving source plus several ghost disks on its center-axis relationship |
| `light-trail` | Analytically re-sampled past trajectory, never a stateful persistent framebuffer |
| `radial-flash` | Expanding ray segments with a bounded impact envelope, not a full-screen opacity flash |
| `rim-glow` | Directional glowing partial silhouette edge, not a filled-surface glow |
| `scan-line` | Narrow raster beam traveling down a clipped image surface |

Production adaptation: a CSS blur/screen pass is not HDR bloom, physical lens flare or a holographic BRDF. In the existing scene renderer, assign emission, lighting and post-processing to explicit owners; tune tone mapping/alpha/color management on the actual render. Keep critical labels outside the lighting pass. No upstream flare textures are included.

## Image look / 材质与曝光

`amount` is an authored strength in [0.1,1]. Supported extras are `rate` (frame or phase count as identified below), `spacing` (integer 5–20), `cell` (integer 6–28), and `samples` (integer 3–16). Do not pass extras to a branch that does not declare them.

| ID | Distinct mechanism and parameters |
| --- | --- |
| `lk-crt` | Fixed raster lines + moving scan band (`amount`, `rate` 1–4) |
| `lk-grain` | Seeded frame-quantized light/dark grain (`amount`, `rate` 1–24) |
| `lk-halftone` | Tonal field sampled as changing ink-dot radii (`amount`, `spacing`) |
| `lk-handwrite` | Authored brush centerline segment reveal and genuine stroke width (`amount`); not glyph/font-axis manipulation |
| `lk-mblur` | Multiple distinct subframe positions averaged over a shutter interval (`amount`, `samples`); reduced uses one sharp sample |
| `lk-papercut` | A polygon silhouette and hard offset paper shadow at quantized pose times (`amount`, `rate` 4–16) |
| `lk-pixel` | Downsample then nearest-neighbor expand (`amount`, `cell`); actual raster sampling, not a CSS blur |
| `lk-riso` | Separate pigment registration offsets with multiply overlap (`amount`) |
| `lk-vignette` | Radial darkening with a breathing inner aperture (`amount`, `rate` 1–3) |
| `lk-watercolor` | Seeded translucent pigment spread under multiply (`amount`), an explicit wash approximation, not fluid/paper simulation |

Adapt through `PAINT` or the selected compositor's real pixel/material passes; keep paper/grain seed and time quantization explicit. Resample actual licensed artwork, not this study's emblem. Brush write-on needs authored paths for the real marks; it is not automatic handwriting of arbitrary text. Exposure quality and frame rate require inspection of the rendered output.

## Continuous loops / 周期与接缝

| ID | Supported parameters and seam construction |
| --- | --- |
| `lp-boil` | `amplitude` 1–12, integer `steps` 3–8: interpolate seeded contour perturbations cyclically, including last-to-first |
| `lp-conic` | Integer `cycles` 1–4: angular hue phase advances by complete revolutions |
| `lp-float` | `amplitude` 5–45 and `cycles`: closed sine position and velocity |
| `lp-holdcycle` | `hold` 0.1–0.8 and `cycles`: rest fraction, then smooth complete orbit |
| `lp-marquee` | `cycles`: repeated equal-pitch text moves by exactly one pitch per cycle |
| `lp-seamless` | `cycles`: alternating two-tile motif translates one full motif period, not half a mismatched tile pair |
| `lp-wobble` | `amplitude` 2–20 and `cycles`: integer harmonic contour deformation with fixed center |

Loop controls belong to the host. A seam requires identical position, color/pattern and intended derivative at both endpoints, not merely a matching alpha value. Pause offscreen and when reduced motion is selected. Production marquee pitch must be measured from the real font/content and retain a static readable copy. Film loops are finite timelines with explicit delivery duration, not infinite GSAP repeats.

## Particles / 粒子轨迹

All eight particle branches declare integer `count` 12–96 and `travel` 30–160. `travel` changes actual trajectory extent; for stationary twinkle it changes the field extent. Seed controls identities, phases and initial positions. Counts are study limits, not a production particle budget.

- `pt-coalesce`: scattered identities converge on assigned ring targets; reduced shows the complete target.
- `pt-confetti`: lateral velocity, upward impulse, gravity and individual spin.
- `pt-embers`: upward lifetime advection, lateral turbulence and bounded glow.
- `pt-fireworks`: launch occupies the first 24%, then a radial burst with gravity and past-velocity trail samples.
- `pt-flow`: analytical position-dependent streamlines, not random per-frame jitter.
- `pt-snow`: wrapped falling lifetimes with per-particle wind phase and radius.
- `pt-swarm`: coupled phase-distributed elliptical/harmonic orbits.
- `pt-twinkle`: fixed star glyphs with independent smooth luminosity envelopes, not shared equal pulses.

Production simulations need fixed-step/cache/replay ownership if their state is not analytically seekable. Map these paths to the existing particle/Canvas/WebGL channel with explicit emitter/target coordinates; release geometry, textures and caches on cancel. A success event must still update its semantic state with particles disabled. Environmental particles are optional and must not obscure controls.

## Character pose / 角色动作

All seven character branches declare `amount` 0.2–1 (blink 0.3–1). Idle/walk also accept integer `cycles` 1–3/1–4. The original figure is joint-level 2D artwork, not a source asset or a claim of a production skinned 3D rig.

| ID | Pose relationship |
| --- | --- |
| `ch-blink` | Eye aperture closes/reopens; the whole figure is not scaled |
| `ch-idle` | Chest expansion coupled to a small head displacement, grounded feet |
| `ch-jump` | Anticipation compression, flight, arm lift and landing squash at explicit phases |
| `ch-tail` | Six appendage segments sample delayed decaying impulses; no dependency on previous frames |
| `ch-take` | Head recoil, eye widening, arm lift and chest contraction share a reaction envelope |
| `ch-turn` | Facial plane translation and eye-width yaw cues; reduced retains final gaze direction |
| `ch-walk` | Opposed upper/lower leg articulation with body rise rather than translating a flat sticker |

Transfer pose keys into existing `RIG`/scene bones with correct pivots, local/world spaces, ground contacts and occlusion. This study does not certify foot-lock, inverse kinematics, a complete walk-to-run blend tree or collisions. Author narrative poses and timing in the actual storyboard. On cancel, choose a valid key pose and discard secondary responses rather than leaving a character airborne.

## Sound synchronization concepts / 时间关系而非音频证明

Every sound study is deliberately **silent**. It displays authored control data and millisecond relations. It neither synthesizes nor analyzes audio. No equal-height bars are labelled as a spectrum or audio proof.

Common supported values: `bpm` 60–180, integer `beats` 4–12; `releaseMs` 80–600 only for bars/duck; signed `offsetMs` −200–200 only for cues/lyrics; `depth` 0.2–0.9 only for duck. Total teaching time is `beats × 60000 / bpm`, independent of source-displayed duration.

- `sd-bars`: sixteen unequal band responses have separate spectral weights, onset delays and exponential releases. Replace these authored envelopes with measured FFT/band data if production needs an actual spectrum, and document analysis window/timebase. This sample is not one.
- `sd-cues`: onset = `beatIndex × beatDurationMs + offsetMs`; the shared cursor, individual onset marks and bounded response show anticipation or delay. Signed offsets are not silently snapped to the beat.
- `sd-duck`: gain = `1 − depth × onsetEnvelope`; a sampled gain curve and current gain show attack/recovery. Production needs an actual mixer/compressor or an automation lane applied to real audio, not a visual change alone.
- `sd-lyric`: `Intl.Segmenter` preserves CJK/Latin word boundaries and graphemes; up to `min(8, beats)` words receive explicit onset timestamps. Full sample text remains in the accessible description. These timestamps are authored, not forced alignment/speech recognition.

Use the existing [film score](../../film-score.md) `score-grid.json` events or [film-edit](../../film-edit.md) analyzed beat grid as production timing authority. For score cues, inspect the promised note/sound event within the existing frame tolerance. For words, supply real onset/end timings from the licensed media/transcript. Convert all tracks to a common timebase before applying offsets, handle pre-roll explicitly, and inspect encoded output for drift and actual audible overlap. Preserve project audio licensing, loudness and creative review. A good-looking cue cursor is not evidence of an audible synchronized export.
