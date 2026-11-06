"use strict";

// Layer contract of a template (manifest `layers`) and the generation task sheets derived from it
// (#311). A template declares its image stack in paint order - bg, ground, ghost-type, mid, char,
// fx, fg, texture, type - with per-size frames, plate crops, sprite boxes, the character slot
// (foot point and height per size, frame-break edges), the boxes its type occupies, and the light,
// rim colour (a palette role) and shadow the character must match. One set of layers renders every
// declared size (materials composite); the task sheet tells an external image model what to draw so
// the result fits all of them. The type layer (titles, UI) is always last: it stays live text.

const CONTRACT_SCHEMA = "design-pipeline.layer-contract.v1";
const TASK_SCHEMA = "design-pipeline.generation-task.v1";
const ROLES = Object.freeze(["bg", "ground", "ghost-type", "mid", "char", "fx", "fg", "texture", "type"]);
const BEHIND = new Set(["bg", "ground", "ghost-type", "mid"]);
const FRONT = new Set(["fx", "fg"]);
const EDGES = Object.freeze(["top", "right", "bottom", "left"]);
const BLENDS = Object.freeze(["multiply", "dots"]);
const MIN_SOURCE_FACTOR = 2;

class ContractError extends Error {
  constructor(message, code = "TEMPLATE_INVALID") { super(message); this.code = code; }
}
const bad = (where, message) => { throw new ContractError(`${where}: ${message}`); };
const isBox = (v, n = 4) => Array.isArray(v) && v.length === n && v.every(Number.isFinite);
const isVec = (v) => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) && Math.hypot(v[0], v[1]) > 0;

function parseSizeKey(key) {
  const m = /^(\d{2,5})x(\d{2,5})$/.exec(String(key));
  return m ? [Number(m[1]), Number(m[2])] : null;
}

// Validate a manifest's layer contract against its palette. Returns the contract.
function validateContract(contract, { id = "template", palette = {} } = {}) {
  const where = `${id} layers`;
  if (!contract || typeof contract !== "object") bad(where, "must be an object");
  if (contract.schema !== CONTRACT_SCHEMA) bad(where, `schema must be ${CONTRACT_SCHEMA}`);
  if (!isBox(contract.design, 2) || contract.design.some((v) => v <= 0)) bad(where, "design must be [width, height] of the plate design space");
  if (!Array.isArray(contract.stack) || contract.stack.length < 2) bad(where, "stack must list the layers in paint order");
  const ids = new Set();
  let phase = 0; // 0 behind the character, 1 character seen, 2 type seen
  contract.stack.forEach((layer, index) => {
    const at = `${where} stack[${index}]`;
    if (!layer || typeof layer.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(layer.id)) bad(at, "needs an id of lowercase letters, digits and hyphens");
    if (ids.has(layer.id)) bad(at, `duplicate id ${layer.id}`);
    ids.add(layer.id);
    if (!ROLES.includes(layer.role)) bad(at, `role must be one of ${ROLES.join(", ")}`);
    if (phase === 2) bad(at, `${layer.id} comes after the type layer; titles and UI are always painted last`);
    if (layer.role === "type") phase = 2;
    else if (layer.role === "char") { if (phase >= 1) bad(at, "one char layer per contract"); phase = 1; }
    else if (BEHIND.has(layer.role) && phase >= 1) bad(at, `${layer.role} layer ${layer.id} is above the character; put it before the char layer`);
    else if (FRONT.has(layer.role) && phase < 1) bad(at, `${layer.role} layer ${layer.id} is below the character; put it after the char layer`);
    if (layer.plate !== undefined && (layer.plate !== true || !BEHIND.has(layer.role))) bad(at, "plate: true is for bg, ground, ghost-type and mid layers (full design-space plates)");
    if (layer.role === "texture" && !BLENDS.includes(layer.blend)) bad(at, `a texture layer needs blend ${BLENDS.join(" or ")}`);
    if (layer.generate !== undefined && typeof layer.generate !== "boolean") bad(at, "generate must be true or false");
  });
  const char = contract.stack.find((l) => l.role === "char");
  if (!char) bad(where, "needs one char layer");
  if (!contract.stack.some((l) => l.role === "type")) bad(where, "needs a type layer (titles and UI, last)");
  const c = contract.char;
  if (!c || typeof c !== "object") bad(where, "char must declare light, shadow and safe areas");
  if (!c.light || !isVec(c.light.key) || !isVec(c.light.rim)) bad(`${where} char.light`, "key and rim must be direction vectors [x, y] pointing from the light (screen axes, y down)");
  if (typeof c.light.rimColour !== "string" || !palette[c.light.rimColour]) bad(`${where} char.light`, `rimColour must be a palette role (${Object.keys(palette).join(", ")})`);
  if (c.shadow && (!isVec(c.shadow.castToward) || !(c.shadow.castLength > 0 && c.shadow.castLength < 1))) bad(`${where} char.shadow`, "castToward is a direction and castLength a share of the figure height (0-1)");
  if (!Array.isArray(c.safe) || c.safe.some((s) => !["face", "hands"].includes(s))) bad(`${where} char.safe`, "list face and/or hands");
  if (!contract.sizes || typeof contract.sizes !== "object" || !Object.keys(contract.sizes).length) bad(where, "sizes must declare at least one WxH");
  for (const [key, size] of Object.entries(contract.sizes)) {
    const at = `${where} sizes.${key}`;
    const wh = parseSizeKey(key);
    if (!wh) bad(at, "size keys are WxH");
    if (!size.frame || !isBox(size.frame.rect)) bad(at, "frame.rect must be [x, y, w, h] in output px");
    if (size.frame.clip !== undefined && (!Array.isArray(size.frame.clip) || size.frame.clip.length < 3 || size.frame.clip.some((p) => !isBox(p, 2)))) bad(at, "frame.clip is a polygon [[x, y], ...] relative to frame.rect");
    if (size.crop !== undefined && !isBox(size.crop)) bad(at, "crop must be [x, y, w, h] in design units");
    if (!size.char || !isBox(size.char.foot, 2) || !(size.char.height > 0)) bad(at, "char needs foot [x, y] and height in output px");
    if (size.char.frameBreak !== undefined && (!Array.isArray(size.char.frameBreak) || size.char.frameBreak.some((e) => !EDGES.includes(e)))) bad(at, `char.frameBreak lists edges (${EDGES.join(", ")})`);
    for (const [layerId, entry] of Object.entries(size.boxes || {})) {
      const layer = contract.stack.find((l) => l.id === layerId);
      if (!layer || layer.plate || ["char", "type", "texture"].includes(layer.role)) bad(at, `boxes.${layerId} is not a sprite layer of the stack`);
      if (!isBox(entry.box)) bad(at, `boxes.${layerId}.box must be [x, y, w, h]`);
    }
    for (const [name, box] of Object.entries(size.type || {})) if (!isBox(box)) bad(at, `type.${name} must be [x, y, w, h] (the block's box at this size)`);
    if (size.pxScale !== undefined && !(size.pxScale > 0)) bad(at, "pxScale must be positive");
  }
  return contract;
}

// Words for a light direction (vector from the light, screen axes).
function fromWords([x, y]) {
  const h = x < -0.35 ? "left" : x > 0.35 ? "right" : "";
  const v = y < -0.35 ? "upper" : y > 0.35 ? "lower" : "";
  if (h && v) return `the ${v} ${h}`;
  if (h) return `the ${h}`;
  return v === "upper" ? "above" : v === "lower" ? "below" : "the front";
}

// The figure's box at a size from its foot point and height (width taken as 0.5 x height).
function slotBox(size) {
  const [fx, fy] = size.char.foot, h = size.char.height, w = h * 0.5;
  return [fx - w / 2, fy - h, w, h];
}
function relative(box, slot) {
  const [x, y, w, h] = box, [sx, sy, sw, sh] = slot;
  const x0 = Math.max(x, sx), y0 = Math.max(y, sy), x1 = Math.min(x + w, sx + sw), y1 = Math.min(y + h, sy + sh);
  if (x1 <= x0 || y1 <= y0) return null;
  const r = (v) => Math.round(v * 100) / 100;
  return [r((x0 - sx) / sw), r((y0 - sy) / sh), r((x1 - sx) / sw), r((y1 - sy) / sh)];
}

// Plain backdrop colour for a generator that cannot write alpha: the candidate farthest (OKLab)
// from every palette colour, so the figure's own colours are never keyed out.
function backdropColour(palette, srgbToOklab) {
  const candidates = ["#00B140", "#0047BB", "#FF00FF", "#00FFFF", "#FF6A00"];
  const lab = (hex) => srgbToOklab(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255));
  const colours = Object.values(palette).map(lab);
  let best = candidates[0], bestD = -1;
  for (const c of candidates) {
    const l = lab(c), d = Math.min(...colours.map((p) => Math.hypot(l[0] - p[0], l[1] - p[1], l[2] - p[2])));
    if (d > bestD) { bestD = d; best = c; }
  }
  return { hex: best, minDistance: Math.round(bestD * 1000) / 1000 };
}

// Requests that name an existing work's character are refused: the sheet asks only for original
// characters "in the style of" a grammar. Heuristic on the subject text; the sheet's negative
// constraint and the owner's review remain the main guard.
const DERIVATIVE = [
  /\bfan[\s-]?art\b/i, /\bcos-?play\b/i, /同人/, /\bofficial character\b/i, /\b(as|of|from)\s+(the\s+)?(game|anime|manga|movie|film|series)\b/i,
  /\bin the (likeness|costume|outfit) of\b/i, /扮演|原作角色|官方角色|的同款/, /\bcharacter from\b/i, /\b(is|as)\s+[A-Z][a-z]+\s+from\b/,
];
function screenSubject(subject) {
  const hit = DERIVATIVE.find((re) => re.test(subject));
  return hit ? { refused: true, matched: String(subject.match(hit)?.[0] || hit) } : { refused: false };
}

// The task sheet for one layer of a template: what to ask an external image model for.
function taskSheet({ manifest, style, layerId, subject, tool, name, srgbToOklab }) {
  const contract = manifest.layers;
  const layer = layerId ? contract.stack.find((l) => l.id === layerId) : contract.stack.find((l) => l.role === "char");
  if (!layer) throw new ContractError(`${manifest.id} has no layer ${layerId}. Fix: use one of ${contract.stack.map((l) => l.id).join(", ")}`, "OPTION_VALUE_INVALID");
  if (["type", "texture"].includes(layer.role)) throw new ContractError(`${layer.id} is a ${layer.role} layer; type stays live text and textures come from materials generate`, "OPTION_VALUE_INVALID");
  if (layer.role !== "char" && layer.generate !== true) throw new ContractError(`${layer.id} is drawn by the template's plates, not generated. Fix: request the char layer, or mark the layer generate: true in the contract`, "OPTION_VALUE_INVALID");
  const palette = Object.fromEntries(Object.entries(manifest.palette).map(([role, spec]) => [role, spec.value]));
  const integration = style.integration || {};
  const figure = integration.figure || {};
  const mode = integration.mode || "sticker";
  const c = contract.char, rimHex = palette[c.light.rimColour];
  const sizes = Object.entries(contract.sizes).map(([key, size]) => {
    const slot = slotBox(size);
    const avoid = [];
    for (const [block, box] of Object.entries(size.type || {})) { const r = relative(box, slot); if (r) avoid.push({ by: `type:${block}`, figureBox: r }); }
    for (const [lid, entry] of Object.entries(size.boxes || {})) {
      const l = contract.stack.find((s) => s.id === lid);
      if (l?.role === "fg") { const r = relative(entry.box, slot); if (r) avoid.push({ by: `occluder:${lid}`, figureBox: r }); }
    }
    return { size: key, figureHeightPx: size.char.height, frameBreak: size.char.frameBreak || [], keepFaceAndHandsOutOf: avoid };
  });
  const maxH = Math.max(...sizes.map((s) => s.figureHeightPx));
  const minFigure = Math.ceil(maxH * MIN_SOURCE_FACTOR);
  const canvasH = Math.ceil(minFigure / 0.88 / 8) * 8, canvasW = Math.ceil((canvasH * 2) / 3 / 8) * 8;
  const backdrop = backdropColour(palette, srgbToOklab);
  const keyWords = fromWords(c.light.key), rimWords = fromWords(c.light.rim);
  const breaks = [...new Set(sizes.flatMap((s) => s.frameBreak))];
  const what = subject || "an original character";
  const ret = `materials/generated/${name}.png`;
  const negatives = [
    "Original characters only - never an existing work's character, and no recognisable likeness of a real person.",
    "No existing game, anime, film or brand characters, logos, wordmarks, mascots, slogans or city names.",
    "No text of any kind in the image: no letters, numbers, signatures or watermarks.",
    "No ground plane, cast shadow, contact shadow, vignette or background scenery: the figure only (shadows, light wrap and texture are added at compositing).",
  ];
  const sheet = {
    schema: TASK_SCHEMA,
    template: manifest.id,
    style: manifest.style,
    layer: layer.id,
    role: layer.role,
    purpose: layer.role === "char" ? `${c.use || "character figure"} for the ${layer.id} slot of ${manifest.id}` : `${layer.role} element ${layer.id} of ${manifest.id}`,
    subject: what,
    tool: tool || null,
    integration: mode,
    output: {
      format: "PNG",
      background: { preferred: "transparent (RGBA, clean alpha edge, no halo)", fallback: `flat solid ${backdrop.hex}, no gradient, no shadow on it`, fallbackColour: backdrop.hex },
      minFigureHeightPx: minFigure,
      suggestedCanvas: [canvasW, canvasH],
      rule: `figure height at least ${MIN_SOURCE_FACTOR}x the largest slot (${maxH} px), measured on the figure, not the canvas; full figure with margin on every side`,
    },
    sizes,
    frameBreak: breaks,
    light: { key: `from ${keyWords}`, keyTemperature: c.light.keyTemp || "neutral", rim: `thin rim light from ${rimWords}, near-white`, rimColour: { role: c.light.rimColour, hex: rimHex, note: mode === "painted" ? "the rim is tinted to this colour at compositing" : "kept near-white; the sticker edge separates the figure" } },
    facing: c.facing || null,
    palette,
    rendering: figure.rendering || null,
    references: figure.references || [],
    negatives,
    return: {
      file: ret,
      landmarks: "pixel coordinates in the returned image: foot [x, y] (between the feet on the ground line), headTop y, face [x0, y0, x1, y1], hands [[x0, y0, x1, y1], ...]",
      intake: `materials add --project-root <dir> --file ${ret} --kind generated --tool ${tool || "<tool>"} --prompt materials/requests/${name}.md --license "<the tool's output terms>" --by "<who ran it>" --landmarks '{"foot":[x,y],"headTop":y,"face":[x0,y0,x1,y1],"hands":[[x0,y0,x1,y1]]}'`,
    },
  };
  return sheet;
}

const pct = (v) => `${Math.round(v * 100)}%`;
function sheetMarkdown(sheet) {
  const regions = sheet.sizes.flatMap((s) => s.keepFaceAndHandsOutOf);
  const avoid = sheet.sizes.flatMap((s) => s.keepFaceAndHandsOutOf.map((a) => `${s.size} ${a.by}: x ${pct(a.figureBox[0])}-${pct(a.figureBox[2])}, y ${pct(a.figureBox[1])}-${pct(a.figureBox[3])} of the figure box`));
  const lines = [
    `# Generation task: ${sheet.layer} for ${sheet.template}`,
    "",
    `- Purpose: ${sheet.purpose}`,
    `- Subject: ${sheet.subject}`,
    `- Style pack: ${sheet.style} (integration: ${sheet.integration})`,
    `- Output: ${sheet.output.format}, ${sheet.output.background.preferred}; if the tool cannot write alpha, ${sheet.output.background.fallback}`,
    `- Size: ${sheet.output.rule}; suggested canvas ${sheet.output.suggestedCanvas.join(" x ")} px (figure at least ${sheet.output.minFigureHeightPx} px tall). If the tool's maximum is smaller, generate at its maximum and upscale with a dedicated upscaler before intake.`,
    `- Used at: ${sheet.sizes.map((s) => `${s.size} (figure ${s.figureHeightPx} px${s.frameBreak.length ? `, breaks the ${s.frameBreak.join("/")} edge` : ""})`).join("; ")}`,
    `- Light: key ${sheet.light.key}, ${sheet.light.keyTemperature}; ${sheet.light.rim} (${sheet.light.rimColour.hex} ${sheet.light.rimColour.role}: ${sheet.light.rimColour.note})`,
    ...(sheet.facing ? [`- Facing: ${sheet.facing}`] : []),
    `- Palette: ${Object.entries(sheet.palette).map(([role, hex]) => `${role} ${hex}`).join(", ")}`,
    ...(sheet.rendering ? [`- Rendering: ${sheet.rendering}`] : []),
    ...(sheet.references.length ? [`- References (names, not adjectives): ${sheet.references.join("; ")}`] : []),
    `- Keep the face and both hands out of: ${avoid.length ? avoid.join("; ") : "nothing declared"}`,
    `- **Original characters only - never an existing work's character.**`,
    `- Return: ${sheet.return.file}, with landmarks (${sheet.return.landmarks})`,
    `- Intake: \`${sheet.return.intake}\``,
    "",
    "## Prompt",
    "",
    "```text",
    `${sheet.subject}. ${sheet.purpose}.`,
    `Full figure, ${sheet.facing ? `${sheet.facing}, ` : ""}standing, with margin on every side; figure at least ${sheet.output.minFigureHeightPx} px tall.`,
    `Background: ${sheet.output.background.preferred}; if alpha is impossible, ${sheet.output.background.fallback}.`,
    ...(sheet.rendering ? [`Rendering: ${sheet.rendering}.`] : []),
    ...(sheet.references.length ? [`References: ${sheet.references.join("; ")}.`] : []),
    `Light: key light from ${sheet.light.key.replace(/^from /, "")}, ${sheet.light.keyTemperature}; ${sheet.light.rim}.`,
    `Colour: work within ${Object.values(sheet.palette).join(", ")}; keep the figure's main colours away from ${sheet.output.background.fallbackColour}.`,
    ...(regions.length ? [`Composition: keep the face and both hands out of ${regions.map((a) => `x ${pct(a.figureBox[0])}-${pct(a.figureBox[2])} / y ${pct(a.figureBox[1])}-${pct(a.figureBox[3])}`).join(", ")} of the figure's box (top of head = 0%, feet = 100%).`] : []),
    ...sheet.negatives,
    "```",
    "",
  ];
  return lines.join("\n");
}

module.exports = { BLENDS, CONTRACT_SCHEMA, ContractError, EDGES, MIN_SOURCE_FACTOR, ROLES, TASK_SCHEMA, backdropColour, fromWords, parseSizeKey, screenSubject, sheetMarkdown, slotBox, taskSheet, validateContract };
