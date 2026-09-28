"use strict";

// One concrete repair per film-gate finding, keyed by gate and code. Findings carry the hint in
// `fix` so an agent can act on a gate result without reading the direction reference first.

const HINTS = {
  storyboard: {
    "timeline-open-start": "Set the first beat's startSec to 0.",
    "timeline-gap": "Make each beat's startSec equal the previous beat's endSec; move time into a neighbouring beat instead of leaving a gap.",
    "timeline-open-end": "Set the last beat's endSec to durationSec, or change durationSec to match the planned beats.",
    "beat-empty": "Give the beat a positive duration (endSec > startSec) or delete it.",
    "handoff-first": "Set the first beat's handoff to \"open\".",
    "handoff-open-midfilm": "Replace \"open\" with how attention arrives from the previous beat: continuation, morph, camera-carry, match-cut or hard-cut.",
    "no-product-action": "Add at least one beat with role \"action\" that shows the product doing its job.",
    "action-missing": "Write productAction as the visible thing the product does in this beat (\"cursor drags the edge to the image node\").",
    "transformation-missing": "Pick what visibly changes in the subject: state-change, morph, reveal-in-context, camera-move, match-cut, type-to-object, data-update or assembly.",
    "transformation-endpoints": "Fill transformation.from and transformation.to with the subject's state before and after the beat.",
    "surface-only-motion": "Replace fade/scale/slide with motion that changes the subject; start from a registered choreography such as continuous-morph, ui-demo or camera-push.",
    "choreography-unknown": "Use an id from references/film-choreography/registry.json, or remove the choreography field and describe the motion.",
    "block-unknown": "Use a block name from `designer-pipeline film blocks --query <action>` (the HyperFrames catalog), or remove the block field.",
    "hold-dominant": "Shorten title/brand holds to under 25% of the runtime and give that time to action beats.",
    "hold-chain": "Merge consecutive holds into one, or put an action beat between them.",
    "slideshow-handoffs": "Change most reset/dissolve handoffs to continuation, morph or camera-carry so one subject carries attention between beats.",
    "slideshow-pair": "Carry a subject across this boundary (morph or camera-carry), or cut on a shared silhouette (match-cut) instead of dissolving panels.",
    "cue-outside-film": "Move the cue's atSec inside the film or extend durationSec.",
    "sound-no-entry": "Add a sound cue with kind \"entry\" where the music starts, usually at 0.",
    "sound-unbound": "Bind a cue id in soundCues on at least half of the action beats, on the moment the action lands.",
  },
  timeline: {
    "duration-mismatch": "Make the timeline's total length equal storyboard durationSec; extend the last tween or trim late tweens.",
    "layout-tween": "Tween x/y/xPercent/yPercent/scale instead of top/left/width/height; the renderer seeks transforms deterministically.",
    "infinite-repeat": "Replace repeat: -1 with a finite repeat that ends before the film ends.",
    "tween-past-end": "End the tween before the film's final frame, or extend the film.",
    "beat-static": "Animate the beat's subject during its time range; a registered choreography at the beat's startSec is the shortest fix.",
    "beat-fade-only": "Add motion that changes the subject (position, rotation, clipPath, morph) instead of only opacity/scale.",
    "handoff-not-carried": "Keep one element animating across this boundary: start the next beat's tween on the same element before the boundary, or let a tween span it.",
  },
  render: {
    "duration-mismatch": "Render the composition whose data-duration equals storyboard durationSec, then re-run film-render.",
    "planned-cuts-missing": "Make the planned hard-cut/match-cut boundaries visible cuts in the composition, or change those handoffs in the storyboard.",
    "audio-missing": "Add the score as an <audio data-start data-duration> element in the composition and re-render, or set sound.mode to silent with a reason.",
    "cuts-off-beat": "Move cut times onto the music's accents (npx hyperframes beats), or move the accents onto the cuts.",
    "render-static-beat": "Nothing moves on screen during this action beat. Check that its block or tweens actually run in the render (seek, data-start, a procedural driver reading the timeline), or give the beat a visible action.",
  },
};

function withFix(gate, finding) {
  const fix = HINTS[gate] && HINTS[gate][finding.code];
  return fix ? { ...finding, fix } : finding;
}

module.exports = { HINTS, withFix };
