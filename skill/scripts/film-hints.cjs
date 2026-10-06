"use strict";

// One concrete repair per film-gate finding, keyed by gate and code. Findings carry the hint in
// `fix` so an agent can act on a gate result without reading the direction reference first.

const HINTS = {
  storyboard: {
    "material-route-incapable": "Use WebGL/Three.js with physical materials and GLSL, Blender, or licensed footage for these effects; keep the reference requirements instead of deleting them. See references/film-materials.md.",
    "material-angle-samples-missing": "Add rendering.samples at two distinct in-range times showing different reference angles; compare glaze highlights, relief and color in the actual renders. See references/film-materials.md.",
    "timeline-open-start": "Set the first beat's startSec to 0.",
    "timeline-gap": "Make each beat's startSec equal the previous beat's endSec; move time into a neighbouring beat instead of leaving a gap.",
    "timeline-open-end": "Set the last beat's endSec to durationSec, or change durationSec to match the planned beats.",
    "beat-empty": "Give the beat a positive duration (endSec > startSec) or delete it.",
    "handoff-first": "Set the first beat's handoff to \"open\".",
    "handoff-open-midfilm": "Replace \"open\" with how attention arrives from the previous beat: continuation, morph, camera-carry, match-cut or hard-cut.",
    "carrier-unnamed": "Name what survives this boundary and what it becomes in the beat's carrier field (\"the prompt bar opens into the app window\").",
    "no-product-action": "Add at least one beat with role \"action\" that shows the product doing its job.",
    "action-missing": "Write productAction as the visible thing the product does in this beat (\"cursor drags the edge to the image node\").",
    "transformation-missing": "Pick what visibly changes in the subject: state-change, morph, reveal-in-context, camera-move, match-cut, type-to-object, data-update or assembly.",
    "transformation-endpoints": "Fill transformation.from and transformation.to with the subject's state before and after the beat.",
    "surface-only-motion": "Replace fade/scale/slide with motion that changes the subject; start from a registered choreography such as continuous-morph, ui-demo or camera-push.",
    "choreography-unknown": "Use an id from references/film-choreography/registry.json, or remove the choreography field and describe the motion.",
    "block-unknown": "Use a block name from `designer-pipeline film blocks --query <action>` (the HyperFrames catalog), or remove the block field.",
    "hold-dominant": "Review the held images at playback speed: keep readable staging or deliberate tension, shorten empty waiting. Record the intention and observed effect in qa.md; 25% is a review trigger, not a quota.",
    "hold-chain": "Review whether successive held poses develop the idea or tension. Keep purposeful limited animation; merge redundant holds or add a motivated action.",
    "slideshow-handoffs": "Check whether resets/dissolves create a deliberate montage or disconnected panels. Strengthen the visual relationship where it is missing; do not force a continuous take on an authored edit.",
    "slideshow-pair": "Carry a subject across this boundary (morph or camera-carry), or cut on a shared silhouette (match-cut) instead of dissolving panels.",
    "cue-outside-film": "Move the cue's atSec inside the film or extend durationSec.",
    "sound-no-entry": "Add a sound cue with kind \"entry\" where the music starts, usually at 0.",
    "sound-unbound": "Review how the musical phrase relates to the actions. Bind cues where a specific accent is intended; record sustained or contrapuntal relationships in note or sound.md instead of adding accents to meet a quota.",
    "uniform-cadence": "Review the regular pulse against the reference and intended phrase. Keep deliberate repetition; redistribute time if every action has accidental equal weight. No beat-length ratio establishes quality.",
    "no-rest": "Review legibility and tension at speed. Add a held pose or holdSec where an idea needs to land, or retain deliberate uninterrupted momentum; do not add a rest just to satisfy a number.",
  },
  timeline: {
    "duration-mismatch": "Make the timeline's total length equal storyboard durationSec; extend the last tween or trim late tweens.",
    "layout-tween": "Tween x/y/xPercent/yPercent/scale instead of top/left/width/height; the renderer seeks transforms deterministically.",
    "infinite-repeat": "Replace repeat: -1 with a finite repeat that ends before the film ends.",
    "tween-past-end": "End the tween before the film's final frame, or extend the film.",
    "beat-static": "Animate the beat's subject during its time range; a registered choreography at the beat's startSec is the shortest fix.",
    "beat-fade-only": "Add motion that changes the subject (position, rotation, clipPath, morph) instead of only opacity/scale.",
    "handoff-not-carried": "Keep one element animating across this boundary: start the next beat's tween on the same element before the boundary, or let a tween span it.",
    "property-conflict": "Give each property one time source: end the first tween before the second starts, merge them into one tween with keyframes, or animate a parent wrapper for the second motion.",
    "linear-motion": "Inspect the spacing between key poses. Keep intentional constant speed or authored linear breakdowns; reshape spacing only if the movement lacks its intended weight, accent or trajectory.",
  },
  render: {
    "duration-mismatch": "Render the composition whose data-duration equals storyboard durationSec, then re-run film-render.",
    "planned-cuts-missing": "Make the planned hard-cut/match-cut boundaries visible cuts in the composition, or change those handoffs in the storyboard.",
    "audio-missing": "Add the score as an <audio data-start data-duration> element in the composition and re-render, or set sound.mode to silent with a reason.",
    "cuts-off-beat": "Listen and watch the phrase: retain intentional anticipations, delayed accents or counterpoint, and correct accidental sync errors. Detected audio onsets are evidence, not a mandatory cut grid.",
    "rest-drift": "End every animated element exactly where it started: add a final return tween to the rest values, and check for leftover offsets from stacked tweens.",
    "loop-seam-jump": "Make the last frame lead into the first: end each motion at its starting pose and velocity, or offset the loop point so both sides match.",
    "missing-anticipation": "Inspect the preparation promised by arc: anticipate-act-settle. Clarify its pose or spacing if unreadable; if an immediate action is intended, remove that optional arc diagnostic instead of adding a formulaic wind-up.",
    "missing-settle": "Inspect how the declared action resolves and whether its result reads. Adjust the final poses or spacing to match force and intent; overshoot is optional. Remove arc if anticipation/settle is not the intended structure.",
    "render-static-beat": "Nothing moves on screen during this action beat. Check that its block or tweens actually run in the render (seek, data-start, a procedural driver reading the timeline), or give the beat a visible action.",
    "carry-cut": "The render shows a cut (a scene change, or a panel swapped in one frame) where the storyboard planned continuation, morph or camera-carry. Keep one animated subject on screen through the boundary (see the timeline handoff-not-carried fix), or change the handoff to hard-cut/match-cut if a cut is intended.",
  },
  check: {
    "low-carry": "Too many planned carried boundaries (continuation, morph, camera-carry) are not surviving as continuity. Fix each flagged beat: add a carrier that spans the boundary in the composition (timeline handoff-not-carried) and remove any hard scene cut at that beat's startSec (render carry-cut).",
  },
};

function withFix(gate, finding) {
  const fix = HINTS[gate] && HINTS[gate][finding.code];
  return fix ? { ...finding, fix } : finding;
}

module.exports = { HINTS, withFix };
