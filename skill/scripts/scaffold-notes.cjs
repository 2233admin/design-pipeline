"use strict";

// The static note templates `film scaffold` writes (reference.md, sound.md, qa.md) and the check for
// an unfilled one. Kept dependency-free so generic workflow stages can use it without loading the
// film project core.

const SCAFFOLD_NOTES = {
  "reference.md": "# Reference\n\n- Primary moving reference (URL/title, role):\n- Observed time ranges (shot scale, motion, cuts, type, sound actually heard):\n- Transfer to this product / keep with the reference:\n- Geometry and material requirements (solid depth, bevel, glaze, relief, angle-dependent color):\n- Rendering route and material inspection angles (references/film-materials.md):\n- Asset inventory and missing shots:\n- Inspection limits:\n",
  "sound.md": "# Sound\n\n- Energy arc:\n- Music source and reuse basis (auditioned / pending):\n- Entry and exit points:\n- Accents bound to beats (match storyboard soundCues):\n- Intentional silence:\n",
  "qa.md": "# QA\n\n## Technical (film check)\n\n## Frame review (one frame per second, every frame at full size)\n\n## Creative review (watch uninterrupted at speed)\n\n- Product comprehension:\n- Continuity:\n- Rhythm:\n- Transformation:\n- Identity:\n- Reference fit:\n- Sound:\n\n## User acceptance\n\nPending.\n",
};

// True while a scaffolded note still holds the template's empty prompts. The source stage of a
// product promo scaffolds before the reference stage, so an unfilled reference.md is not a study.
function isUnfilledScaffoldNote(name, text) {
  return Object.hasOwn(SCAFFOLD_NOTES, name) && String(text).replace(/\r\n/g, "\n").trim() === SCAFFOLD_NOTES[name].trim();
}

module.exports = { SCAFFOLD_NOTES, isUnfilledScaffoldNote };
