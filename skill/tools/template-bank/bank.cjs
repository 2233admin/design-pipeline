"use strict";

// Template bank: parameterised SVG layout templates rendered by id with knobs and audited on
// render. Each template is templates/<id>/manifest.json (slots, parameters with ranges, palette
// roles, sizes, provenance) plus a layout function in layouts.cjs. template.svg beside the
// manifest is the default render, kept in step by tests.

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const lettering = require("./lettering.cjs");
const measure = require("./measure.cjs");
const coverage = require("./coverage.cjs");
const layerContract = require("./layers.cjs");
const compositor = require("../art-motion/composite.cjs");
const LAYOUTS = Object.assign({}, ...["layouts.cjs", "layouts-shinbo.cjs", "layouts-citypop.cjs", "layouts-xerox.cjs", "layouts-litho.cjs", "layouts-pixel.cjs", "layouts-hud.cjs", "layouts-cyanotype.cjs", "layouts-street.cjs", "layouts-survey.cjs", "layouts-lattice.cjs", "layouts-ops.cjs"]
  .filter((file) => fs.existsSync(path.join(__dirname, file))).map((file) => require(`./${file}`).LAYOUTS));

const TEMPLATES_ROOT = path.join(__dirname, "templates");
const STYLES_ROOT = path.join(__dirname, "styles");
const MANIFEST_SCHEMA = "design-pipeline.template-bank-template.v1";
const STYLE_SCHEMA = "design-pipeline.template-bank-style.v1";
const CHECK_SCHEMA = "design-pipeline.template-check.v1";
const PARAM_CLASSES = ["proportion", "rhythm", "decoration"];
const RULES = Object.freeze({ minTypePx: 12, minCapPx: 9, contrastNormal: 4.5, contrastLarge: 3, largePx: 24, largeBoldPx: 18.66, alignTolerance: 0.005 });

class BankError extends Error {
  constructor(message, code = "TEMPLATE_INVALID") {
    super(message);
    this.code = code;
  }
}

function templateIds() {
  return fs.readdirSync(TEMPLATES_ROOT, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

// A style pack groups templates: font roles, layout grammar, materials, motion grammar and the
// check rules its renders must pass (styles/<id>/style.json). Templates name their style.
function styleIds() {
  return fs.readdirSync(STYLES_ROOT, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

const styleCache = new Map();
function loadStyle(id) {
  if (typeof id !== "string" || !styleIds().includes(id)) throw new BankError(`unknown style ${JSON.stringify(id)}. Fix: use one of ${styleIds().join(", ")} (template list)`, "OPTION_VALUE_INVALID");
  if (!styleCache.has(id)) {
    const style = JSON.parse(fs.readFileSync(path.join(STYLES_ROOT, id, "style.json"), "utf8"));
    validateStyle(style, id);
    styleCache.set(id, style);
  }
  return styleCache.get(id);
}

// The style pack shape, for installed packs and for drafts written by `template distill`.
// checks.measured (optional) holds the reference distribution each threshold came from.
function validateStyle(style, id) {
  if (style?.schema !== STYLE_SCHEMA || style.id !== id) throw new BankError(`styles/${id}/style.json must have schema ${STYLE_SCHEMA} and id ${id}`);
  for (const key of ["fonts", "layout", "materials", "checks"]) if (!style[key]) throw new BankError(`styles/${id}/style.json lacks ${key}`);
  for (const [role, spec] of Object.entries(style.fonts.roles || {})) if (!Array.isArray(spec.stack) || !spec.stack.length) throw new BankError(`style ${id} font role ${role} needs a stack`);
  for (const [feature, t] of Object.entries(style.checks.measured || {})) {
    if (!["max", "min", "band"].includes(t?.kind) || !["measured", "thin", "gap"].includes(t.support) || typeof t.basis !== "string") throw new BankError(`style ${id} checks.measured.${feature} needs kind (max|min|band), support (measured|thin|gap) and basis`);
  }
  // integration: how a generated character joins this style's scenes (sticker or painted), #311
  if (style.integration !== undefined) {
    const palette = Object.fromEntries(Object.entries(style.palette || {}).map(([role, spec]) => [role, spec.value]));
    try { compositor.validateIntegration(style.integration, { id, palette }); } catch (error) { throw new BankError(error.message); }
  }
  return style;
}

function loadManifest(id) {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9.-]*$/.test(id) || !templateIds().includes(id)) {
    throw new BankError(`unknown template ${JSON.stringify(id)}. Fix: pick one of ${templateIds().join(", ")} (template list)`, "TEMPLATE_NOT_FOUND");
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(TEMPLATES_ROOT, id, "manifest.json"), "utf8"));
  if (manifest.schema !== MANIFEST_SCHEMA || manifest.id !== id) throw new BankError(`templates/${id}/manifest.json must have schema ${MANIFEST_SCHEMA} and id ${id}`);
  if (!LAYOUTS[id]) throw new BankError(`template ${id} has no layout`);
  const style = loadStyle(manifest.style);
  if (!manifest.palette) manifest.palette = style.palette;
  if (!manifest.palette) throw new BankError(`template ${id} has no palette and its style ${manifest.style} declares none`);
  if (manifest.layers !== undefined) {
    const palette = Object.fromEntries(Object.entries(manifest.palette).map(([role, spec]) => [role, spec.value]));
    try { layerContract.validateContract(manifest.layers, { id, palette }); } catch (error) { throw new BankError(error.message); }
    for (const [slot, spec] of Object.entries(manifest.slots)) if (spec.layer !== undefined && (spec.kind !== "image" || !layerContract.ROLES.includes(spec.layer))) throw new BankError(`${id} slot ${slot}: layer is for image slots and names a contract role (${layerContract.ROLES.join(", ")})`);
  }
  return manifest;
}

function styleSummary(style, templates) {
  return {
    id: style.id, title: style.title, summary: style.summary,
    fontRoles: Object.fromEntries(Object.entries(style.fonts.roles).map(([role, spec]) => [role, spec.stack.join(" > ")])),
    grammar: style.layout.grammar,
    materials: { procedural: style.materials.procedural || [], collage: style.materials.collage || [], sources: style.materials.sources, budget: style.materials.budget || null },
    motion: style.motion || style.motionNote || null,
    checks: style.checks,
    templates: templates.filter((m) => m.style === style.id).map((m) => m.id),
  };
}

function listTemplates({ family, style } = {}) {
  const all = templateIds().map(loadManifest);
  const families = [...new Set(all.map((m) => m.family))].sort();
  if (family && !families.includes(family)) throw new BankError(`unknown family ${JSON.stringify(family)}. Fix: use one of ${families.join(", ")}`, "OPTION_VALUE_INVALID");
  if (style) loadStyle(style);
  const templates = all.filter((m) => (!family || m.family === family) && (!style || m.style === style)).map((m) => ({
    id: m.id, family: m.family, style: m.style, title: m.title, use: m.use, sizes: m.sizes,
    slots: Object.entries(m.slots).map(([name, slot]) => `${name}:${slot.kind}${slot.maxChars ? `<=${slot.maxChars}` : ""}`),
    knobs: Object.entries(m.params).filter(([, p]) => p.class === "rhythm").map(([name]) => name),
  }));
  const styles = (style ? [style] : styleIds()).map((id) => (style ? styleSummary(loadStyle(id), all) : { id, title: loadStyle(id).title, templates: all.filter((m) => m.style === id).length }));
  return { status: "templates", families, styles, templates, next: "Render one with: template render <id> --set slot=value --param k=v --size WxH -o out.svg; template list --style <id> shows a style pack's font roles, grammar, materials, motion and checks" };
}

// ---- slots and parameters ---------------------------------------------------------------------
function slotSpec(manifest, name) {
  if (Object.hasOwn(manifest.slots, name)) return { key: name, spec: manifest.slots[name], index: [] };
  for (const [key, spec] of Object.entries(manifest.slots)) {
    if (!key.includes("{")) continue;
    const pattern = new RegExp(`^${key.replace(/[.]/g, "\\.").replace(/\{[a-z]\}/g, "(\\d+)")}$`);
    const match = pattern.exec(name);
    if (match) return { key, spec, index: match.slice(1).map(Number) };
  }
  return null;
}

function slotNames(manifest) {
  return Object.keys(manifest.slots).join(", ");
}

function parseSize(manifest, raw) {
  const [W0, H0] = [manifest.canvas.width, manifest.canvas.height];
  if (!raw) return { W: W0, H: H0 };
  const match = /^(\d{2,5})x(\d{2,5})$/i.exec(String(raw));
  if (!match) throw new BankError(`--size must be WxH, got ${raw}. Fix: use one of ${manifest.sizes.join(", ")}`, "OPTION_VALUE_INVALID");
  const W = Number(match[1]);
  const H = Number(match[2]);
  if (Math.abs(W / H - W0 / H0) > 0.005 * (W0 / H0)) {
    throw new BankError(`--size ${raw} changes the aspect of ${manifest.id} (${manifest.aspect}). Fix: use one of ${manifest.sizes.join(", ")} or another ${manifest.aspect} size; for another ratio pick a template of that ratio`, "OPTION_VALUE_INVALID");
  }
  return { W, H };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function coerceParam(name, spec, raw) {
  const type = spec.type || "number";
  if (type === "boolean") {
    if (raw === true || raw === "true" || raw === "1" || raw === "on") return true;
    if (raw === false || raw === "false" || raw === "0" || raw === "off") return false;
    throw new BankError(`--param ${name} must be true or false, got ${raw}`, "OPTION_VALUE_INVALID");
  }
  if (type === "enum") {
    if (!spec.values.includes(raw)) throw new BankError(`--param ${name} must be one of ${spec.values.join(", ")}, got ${raw}`, "OPTION_VALUE_INVALID");
    return raw;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < spec.min || value > spec.max || (type === "integer" && !Number.isInteger(value))) {
    throw new BankError(`--param ${name} must be ${type === "integer" ? "an integer" : "a number"} in [${spec.min}, ${spec.max}], got ${raw}. Fix: stay inside the measured range or pick another template`, "OPTION_VALUE_INVALID");
  }
  return value;
}

function resolveParams(manifest, overrides = {}, seed = null) {
  const params = {};
  const palette = Object.fromEntries(Object.entries(manifest.palette).map(([role, spec]) => [role, spec.value]));
  const random = seed === null || seed === undefined ? null : mulberry32(Number(seed));
  const varied = [];
  for (const [name, spec] of Object.entries(manifest.params)) {
    params[name] = spec.default;
    if (random && spec.class === "rhythm" && (spec.type || "number") !== "boolean" && spec.type !== "enum" && !Object.hasOwn(overrides, name)) {
      const raw = spec.min + random() * (spec.max - spec.min);
      params[name] = spec.type === "integer" ? Math.round(raw) : Number(raw.toFixed(4));
      varied.push(name);
    }
  }
  for (const [name, raw] of Object.entries(overrides)) {
    if (name.startsWith("palette.")) {
      const role = name.slice(8);
      if (!Object.hasOwn(palette, role)) throw new BankError(`unknown palette role ${role} in ${manifest.id}. Fix: use one of ${Object.keys(palette).join(", ")}`, "OPTION_VALUE_INVALID");
      if (!/^#[0-9a-fA-F]{6}$/.test(String(raw))) throw new BankError(`--param ${name} must be a #RRGGBB colour, got ${raw}`, "OPTION_VALUE_INVALID");
      palette[role] = String(raw).toUpperCase();
      continue;
    }
    if (!Object.hasOwn(manifest.params, name)) throw new BankError(`unknown parameter ${name} in ${manifest.id}. Fix: use one of ${Object.keys(manifest.params).join(", ")} or palette.<role>`, "OPTION_VALUE_INVALID");
    params[name] = coerceParam(name, manifest.params[name], raw);
  }
  return { params, palette, varied };
}

// ---- document builder used by layouts.cjs ---------------------------------------------------
const esc = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f1 = (value) => value.toFixed(1);

class Doc {
  constructor(manifest, W, H, params, palette, values, faces = []) {
    this.m = manifest;
    this.W = W;
    this.H = H;
    this.p = params;
    this.pal = palette;
    this.values = values;
    this.k = H / manifest.canvas.height; // scale for the few fixed-pixel constants
    this.pad = 2 * this.k; // box padding, scaled with the canvas
    this.body = [];
    this.guides = [];
    this.zones = [];
    this.alignLines = [];
    this.used = new Set();
    this.hatches = new Set();
    this.defs = [];
    this.fontSwitches = [];
    this.faces = faces;
    this.style = loadStyle(manifest.style);
    this.roles = this.style.fonts.roles;
    this.families = Object.fromEntries(Object.entries(this.roles).map(([role, spec]) => [role, this.stackCss(spec.stack, spec.generic)]));
    this.edl = null;
    this.rhythm = null;
  }

  stackCss(stack, generic) { return stack.map((f) => `'${f}'`).concat(generic || "serif").join(","); }

  def(markup) { this.defs.push(markup); }

  // Whole-string font choice: the first family of the role's stack that covers every character.
  // Coverage comes from --font-dir files or a registered provider (font catalog); unknown stays as named.
  familyFor(roleName, text, weight) {
    const spec = this.roles[roleName];
    if (!spec) throw new BankError(`layout ${this.m.id} uses font role ${roleName}, which style ${this.m.style} does not declare`);
    // The preferred font must be known to lack a glyph before anything switches: when its coverage
    // is unknown (not in --font-dir, no provider), the stack stays as written.
    const first = coverage.missingGlyphs(spec.stack[0], text, { weight, faces: this.faces });
    if (!first.known || !first.missing) return { css: this.families[roleName] };
    const choice = coverage.chooseFamily(spec.stack, text, { weight, faces: this.faces });
    const known = choice.tried.filter((t) => t.known);
    if (!choice.family) {
      this.fontSwitches.push({ role: roleName, text, missing: known[0].missing, to: null });
      return { css: this.families[roleName], missing: known[0].missing };
    }
    if (choice.family === spec.stack[0]) return { css: this.families[roleName] };
    const from = spec.stack[0];
    this.fontSwitches.push({ role: roleName, text, missing: choice.tried[0].missing, from, to: choice.family });
    return { css: this.stackCss(spec.stack.slice(spec.stack.indexOf(choice.family)), spec.generic), switched: `${from}>${choice.family}` };
  }

  // A layout that sizes text from one family's metrics pins the role to that family: the stack starts
  // there, so the browser cannot pick a different (preferred but absent) face of another size.
  pinFamily(roleName, family) {
    const spec = this.roles[roleName];
    const at = spec.stack.indexOf(family);
    if (at < 0) throw new BankError(`layout ${this.m.id} pins font role ${roleName} to ${family}, which its stack (${spec.stack.join(" > ")}) does not name`);
    if (at === 0) return { css: this.families[roleName] };
    const embedded = this.faces.some((face) => face.family === family);
    this.fontSwitches.push({ role: roleName, text: "", missing: "", from: spec.stack[0], to: family, reason: `${spec.stack[0]} is not in --font-dir; sized from ${family}${embedded ? "" : `, which is not in --font-dir either and renders as sized only where it is installed (Fix: give --font-dir the role's fonts to embed them)`}` });
    return { css: this.stackCss(spec.stack.slice(at), spec.generic), switched: `${spec.stack[0]}>${family}` };
  }

  value(name) {
    const found = slotSpec(this.m, name);
    if (!found) throw new BankError(`layout ${this.m.id} draws slot ${name}, which the manifest does not declare`);
    this.used.add(name);
    if (Object.hasOwn(this.values, name)) return { spec: found.spec, text: this.values[name] };
    const fallback = found.spec.default;
    const text = Array.isArray(fallback) ? fallback[found.index[0] % fallback.length] : fallback;
    return { spec: found.spec, text: text ?? "" };
  }

  slotAttrs(name, spec, extra = {}) {
    const parts = [`data-slot="${esc(name)}"`, `data-kind="${extra.kind || spec.kind}"`];
    if (spec.maxChars) parts.push(`data-max-chars="${spec.maxChars}"`);
    if (spec.lines && spec.lines > 1) parts.push(`data-lines="${spec.lines}"`);
    if (spec.title) parts.push("data-title=\"1\"");
    if (spec.decor) parts.push("data-decor=\"1\"");
    if (spec.bleed) parts.push("data-bleed=\"1\"");
    if (spec.sizeParam) parts.push(`data-size-param="${esc(spec.sizeParam)}"`);
    if (extra.box) parts.push(`data-box="${extra.box.map((v) => f1(v)).join(",")}"`);
    return parts.join(" ");
  }

  clipBox([x, y, w, h]) {
    const x0 = Math.max(0, x); const y0 = Math.max(0, y);
    const x1 = Math.min(this.W, x + w); const y1 = Math.min(this.H, y + h);
    return [x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0)];
  }

  rect(x, y, w, h, role, extra = "") {
    this.body.push(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${this.pal[role]}" data-role="${role}"${extra ? ` ${extra}` : ""}/>`);
  }

  poly(pts, role, extra = "") {
    this.body.push(`<polygon points="${pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ")}" fill="${this.pal[role]}" data-role="${role}"${extra ? ` ${extra}` : ""}/>`);
  }

  line(x1, y1, x2, y2, role, w = 2, extra = "") {
    this.body.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${this.pal[role]}" stroke-width="${f1(w * this.k)}" data-role="${role}"${extra ? ` ${extra}` : ""}/>`);
  }

  raw(markup) { this.body.push(markup); }

  image(name, x, y, w, h, note = "", o = {}) {
    const { spec, text } = this.value(name);
    const ground = this.pal[spec.ground || "bg"] || spec.groundColor || "#808080";
    const hasImage = typeof text === "string" && text.startsWith("data:image/");
    // Collage slots: drawn only when filled, at the image's own aspect (width w), rotated about the centre.
    if (spec.collage) {
      if (!hasImage) return;
      const aspect = imageAspect(text) || 1;
      const ih = w * aspect;
      const turn = o.rotate ? ` transform="rotate(${f1(o.rotate)} ${f1(x + w / 2)} ${f1(y + ih / 2)})"` : "";
      this.body.push(`<g ${this.slotAttrs(name, spec, { box: [x, y, w, ih] })} data-collage="${esc(name)}"${turn}><image href="${esc(text)}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(ih)}" preserveAspectRatio="xMidYMid meet"${o.filter ? ` filter="url(#${o.filter})"` : ""}/></g>`);
      return;
    }
    const box = [x, y, w, h];
    // A slot declared as a contract layer says so in the render: a ground layer is the text's
    // ground (sampled for contrast, never collage over the copy); other layers stay collage.
    const open = `<g ${this.slotAttrs(name, spec, { box })} data-ground="${ground}"${spec.layer ? ` data-layer="${esc(spec.layer)}"` : ""}>`;
    if (hasImage) {
      this.body.push(`${open}<image href="${esc(text)}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" preserveAspectRatio="${spec.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice"}"/></g>`);
      return;
    }
    // Placeholder: hatched in the slot's declared ground tone, so the picture shows what contrast is checked against.
    const label = `${name.toUpperCase()}${note ? ` · ${note}` : ""}`;
    const pattern = `hatch-${ground.slice(1).toLowerCase()}`;
    this.hatches.add(ground);
    const groundRgb = measure.parseColor(ground);
    const dark = measure.luminance(groundRgb) < 0.25;
    // The label is text on the page, so it must read on its hatch (the browser check measures it):
    // the grey by default, black or white when the grey falls under 4.5:1 on this ground.
    let labelColor = dark ? "#B0B0B0" : "#6A6A6A";
    const hatch = measure.mix(groundRgb, dark ? [255, 255, 255] : [0, 0, 0], 0.08);
    const worst = (c) => Math.min(measure.contrastRatio(measure.parseColor(c), groundRgb), measure.contrastRatio(measure.parseColor(c), hatch));
    if (worst(labelColor) < RULES.contrastNormal) labelColor = worst("#FFFFFF") >= worst("#000000") ? "#FFFFFF" : "#000000";
    this.body.push(`${open}<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="url(#${pattern})" stroke="${dark ? "#9A9A9A" : "#8A8A8A"}" stroke-dasharray="8 6"/>`
      + `<text x="${f1(x + w * (o.labelAt?.[0] ?? 0.5))}" y="${f1(y + h * (o.labelAt?.[1] ?? 0.5))}" text-anchor="middle" font-family="monospace" font-size="${Math.max(8, Math.min(Math.min(w, h) * 0.035, (w * 0.6) / (label.length * 0.62))).toFixed(0)}" fill="${labelColor}">${esc(label)}</text></g>`);
  }

  // Default box: the declared character budget at this size, placed by anchor, clipped to the canvas.
  autoBox(x, y, size, spec, { anchor = "start", vertical = false, lineHeight = 1.3, lettering: isLettering = false, advance = size } = {}) {
    const chars = spec.maxChars || 8;
    if (vertical) return this.clipBox([x - size * 0.6, y - size * 0.1, size * 1.2, chars * advance + size * 0.2]);
    const width = chars * advance;
    const x0 = anchor === "start" ? x : anchor === "middle" ? x - width / 2 : x - width;
    if (isLettering) return this.clipBox([x0 - size * 0.05, y - size * 0.12, width + size * 0.1, size * 1.24]);
    const lines = spec.lines || 1;
    return this.clipBox([x0, y - size, width, size * (1.25 + (lines - 1) * lineHeight)]);
  }

  // Text slot. (x, y) is the baseline start (or centre/end by anchor), as in SVG.
  // o.content: text the layout derives (a summary, a legend); such slots are declared derived.
  text(name, x, y, size, o = {}) {
    const { spec, text: given } = this.value(name);
    const text = o.content !== undefined ? o.content : given;
    const role = o.role || "ink";
    const anchor = o.anchor || "start";
    const roleName = o.family || spec.font || "sans";
    if (!this.families[roleName]) throw new BankError(`layout ${this.m.id} uses font role ${roleName}, which style ${this.m.style} does not declare`);
    const weight = o.weight || this.roles[roleName].weight || 700;
    const chosen = o.resolved ? this.pinFamily(roleName, o.resolved) : this.familyFor(roleName, String(text), weight);
    const family = chosen.css;
    const tracking = o.tracking || 0;
    const spacing = (tracking / 1000) * size;
    const lineHeight = o.lineHeight || 1.3;
    const box = o.box ? this.clipBox(o.box) : this.autoBox(x, y, size, spec, { anchor, vertical: o.vertical, lineHeight });
    const attrs = [
      this.slotAttrs(name, spec, { box }), `x="${f1(x)}"`, `y="${f1(y)}"`, `font-family="${esc(family)}"`, `font-weight="${weight}"`,
      `font-size="${f1(size)}"`, `fill="${this.pal[role]}"`, `data-role="${role}"`, `text-anchor="${anchor}"`, `data-font-role="${esc(roleName)}"`,
    ];
    if (chosen.switched) attrs.push(`data-font-switch="${esc(chosen.switched)}"`);
    if (chosen.missing) attrs.push(`data-font-missing="${esc(chosen.missing)}"`);
    if (o.vertical) attrs.push("writing-mode=\"vertical-rl\"", "text-orientation=\"upright\"");
    if (o.italic) attrs.push("font-style=\"italic\"");
    if (o.filter) attrs.push(`filter="url(#${esc(o.filter)})"`); // e.g. an offset shadow plate defined with d.def()
    if (spacing) attrs.push(`letter-spacing="${f1(spacing)}"`);
    const font = { serif: roleName === "serif", weight };
    const lines = spec.lines > 1 ? measure.wrapText(text, size, box[2], spacing, font) : [String(text)];
    const content = lines.length > 1
      ? lines.map((line, index) => `<tspan x="${f1(x)}" dy="${index === 0 ? "0" : f1(size * lineHeight)}">${esc(line)}</tspan>`).join("")
      : esc(lines[0]);
    const markup = `<text ${attrs.join(" ")}>${content}</text>`;
    this.body.push(o.transform ? `<g transform="${o.transform}">${markup}</g>` : markup);
    return { width: measure.textWidth(lines[0], size, spacing, font), lines: lines.length };
  }

  // Lettering slot drawn with the code-drawn glyphs; (x, y) is the top of the cap box.
  // Text the glyph set cannot draw (CJK) falls back to the manifest's open CJK font.
  lettering(name, x, y, h, o = {}) {
    const { spec, text } = this.value(name);
    const role = o.role || "ink";
    const anchor = o.anchor || "start";
    const params = {};
    for (const key of Object.keys(lettering.DEFAULTS)) if (o[key] !== undefined) params[key] = o[key];
    const P = lettering.resolveParams(params);
    const glyphAdvance = h * (Math.max(P.width, P.stroke * 1.8) + 2 * P.sidebearing) + (P.tracking / 1000) * h;
    const box = o.box ? this.clipBox(o.box) : this.autoBox(x, y, h, spec, { anchor, lettering: true, advance: glyphAdvance });
    const wrap = o.transform ? ` transform="${o.transform}"` : "";
    const chars = [...String(text)];
    const drawable = chars.every((ch) => ch === " " || lettering.hasGlyph(ch));
    if (!drawable) {
      const size = h * 1.15;
      const family = this.families[spec.fallbackFont || "sans"];
      const baseline = y + h / 2 + 0.38 * size;
      this.body.push(`<g ${this.slotAttrs(name, spec, { box })} data-role="${role}" data-fallback="cjk-font"${wrap}><text x="${f1(x)}" y="${f1(baseline)}" font-family="${esc(family)}" font-weight="900" font-size="${f1(size)}" fill="${this.pal[role]}" text-anchor="${anchor}">${esc(text)}</text></g>`);
      return { width: measure.textWidth(text, size, 0, { serif: spec.fallbackFont === "serif", weight: 900 }), fallback: true };
    }
    const set = lettering.setText(text, x, y, h, { fill: this.pal[role], anchor, trimStart: o.trim !== false, ...P });
    // An offset shadow plate (o.shadow: { dx, dy, role }) belongs to the lettering: it is hidden with
    // it when its contrast is measured, and it is never taken as the ground under it.
    const shadow = o.shadow
      ? lettering.setText(text, x + o.shadow.dx, y + o.shadow.dy, h, { fill: this.pal[o.shadow.role], anchor, trimStart: o.trim !== false, ...P }).svg.replace("class=\"lettering\"", "class=\"lettering-shadow\"")
      : "";
    this.body.push(`<g ${this.slotAttrs(name, spec, { box })} data-role="${role}" data-cap="${f1(h)}"${wrap}>${shadow}${set.svg}</g>`);
    return { width: set.visibleWidth, left: set.left };
  }

  shape(name, markup) { this.body.push(markup.replace(/^<(\w+)/, `<$1 data-slot="${esc(name)}" data-kind="shape"`)); }

  guideRect(x, y, w, h, label, color = "#00A0FF") {
    this.guides.push(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="10 6"/><text x="${f1(x + 6)}" y="${f1(y + 18)}" font-family="monospace" font-size="14" fill="${color}">${esc(label)}</text>`);
  }

  guideLine(x1, y1, x2, y2, label = "", color = "#FF3EA5") {
    this.guides.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${color}" stroke-width="1.5" stroke-dasharray="4 4"/>${label ? `<text x="${f1(x1 + 4)}" y="${f1(y1 - 4)}" font-family="monospace" font-size="13" fill="${color}">${esc(label)}</text>` : ""}`);
  }

  // Keep-out zone for titles (kind figure) or a crop/safe zone whose listed slots must stay inside.
  zone(id, kind, box, options = {}) {
    this.zones.push({ id, kind, box: box.map((v) => Number(v.toFixed(1))), ...options });
    this.guideRect(...box, `${id}${kind === "figure" ? " (keep titles out)" : " (keep listed slots inside)"}`, kind === "figure" ? "#FF8A00" : "#00C080");
  }

  align(id, edge, x, slots, tolerance = RULES.alignTolerance) {
    this.alignLines.push({ id, edge, x: Number(x.toFixed(1)), tolerance: Number((tolerance * this.W).toFixed(1)), slots });
    this.guideLine(x, 0, x, this.H, `${id}: shared ${edge} line`);
  }

  svg(meta) {
    const accentRoles = this.m.accent.roles;
    const rules = {
      schema: CHECK_SCHEMA, template: this.m.id, canvas: [this.W, this.H],
      minTypePx: RULES.minTypePx, minCapPx: RULES.minCapPx,
      contrast: { normal: RULES.contrastNormal, large: RULES.contrastLarge, largePx: RULES.largePx, largeBoldPx: RULES.largeBoldPx },
      accent: { roles: accentRoles, colors: [...new Set(accentRoles.map((role) => this.pal[role]))], maxShare: this.p.accent_max_share ?? this.m.accent.maxShare, textInkFactor: measure.TEXT_INK_FACTOR },
      zones: this.zones, alignLines: this.alignLines,
      ...(this.rhythm ? { rhythm: this.rhythm } : {}),
    };
    const showGuides = this.p.guides === true;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.W}" height="${this.H}" viewBox="0 0 ${this.W} ${this.H}" data-template="${this.m.id}">`
      + `<metadata id="template-params">${esc(JSON.stringify(meta))}</metadata>`
      + `<metadata id="template-check">${esc(JSON.stringify(rules))}</metadata>`
      + "<defs>"
      // A font collection (.ttc) cannot be addressed by @font-face (no face index); it is a system
      // font and the stack's family name selects its face (the SC face for 'Noto Serif CJK SC').
      + (this.faces.some((face) => !/\.ttc$/i.test(face.file)) ? `<style>${this.faces.filter((face) => !/\.ttc$/i.test(face.file)).map((face) => `@font-face{font-family:'${face.family}';font-weight:${face.weight || 400};src:url("${esc(pathToFileURL(face.file).href)}")}`).join("")}</style>` : "")
      + this.defs.join("")
      + [...this.hatches].map((ground) => {
        const rgb = measure.parseColor(ground);
        const line = measure.hex(measure.mix(rgb, measure.luminance(rgb) < 0.25 ? [255, 255, 255] : [0, 0, 0], 0.08));
        return `<pattern id="hatch-${ground.slice(1).toLowerCase()}" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="16" height="16" fill="${ground}"/><line x1="0" y1="0" x2="0" y2="16" stroke="${line}" stroke-width="6"/></pattern>`;
      }).join("")
      + "<linearGradient id=\"scrimB\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#000\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#000\" stop-opacity=\"0.72\"/></linearGradient>"
      + "<linearGradient id=\"fadeW\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\"1\"/></linearGradient>"
      + "</defs>"
      + this.body.join("")
      + `<g id="guides"${showGuides ? "" : " display=\"none\""}>${this.guides.join("")}</g></svg>\n`;
  }
}

// Width-to-height of an embedded PNG, JPEG or WebP (collage slots keep their aspect).
function imageAspect(dataUrl) {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const b = Buffer.from(dataUrl.slice(comma + 1, comma + 1 + 65536), "base64");
  try {
    if (b.toString("latin1", 1, 4) === "PNG") return b.readUInt32BE(20) / b.readUInt32BE(16);
    if (b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") {
      const kind = b.toString("latin1", 12, 16);
      if (kind === "VP8X") return (1 + b.readUIntLE(27, 3)) / (1 + b.readUIntLE(24, 3));
      if (kind === "VP8L") { const bits = b.readUInt32LE(21); return (((bits >> 14) & 0x3fff) + 1) / ((bits & 0x3fff) + 1); }
      if (kind === "VP8 ") return (b.readUInt16LE(28) & 0x3fff) / (b.readUInt16LE(26) & 0x3fff);
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      for (let i = 2; i < b.length - 9;) {
        if (b[i] !== 0xff) { i += 1; continue; }
        const marker = b[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return b.readUInt16BE(i + 5) / b.readUInt16BE(i + 7);
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch { return null; }
  return null;
}

// Font files for a style's faces found under a directory (matched by file name, any extension
// the coverage reader takes).
function fontFacesIn(dir, style) {
  if (!dir) return [];
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new BankError(`--font-dir ${dir} is not a directory`, "OPTION_VALUE_INVALID");
  const byStem = new Map();
  for (const face of style.fonts.faces || []) byStem.set(face.file.replace(/\.[^.]+$/, "").toLowerCase(), face);
  const found = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (!/\.(ttf|otf|ttc|woff)$/i.test(entry.name)) continue;
      const face = byStem.get(entry.name.replace(/\.[^.]+$/, "").toLowerCase());
      if (face) found.push({ family: face.family, weight: face.weight, file: full, index: /\.ttc$/i.test(entry.name) ? face.index || 0 : 0 });
    }
  }
  return found;
}

// ---- render --------------------------------------------------------------------------------
function render(id, { set = {}, params: overrides = {}, size = null, seed = null, fontDir = null, layerSources = null } = {}) {
  const manifest = loadManifest(id);
  const { W, H } = parseSize(manifest, size);
  for (const [name, value] of Object.entries(set)) {
    const found = slotSpec(manifest, name);
    if (!found) throw new BankError(`unknown slot ${name} in ${id}. Fix: use one of ${slotNames(manifest)}`, "OPTION_VALUE_INVALID");
    if (found.spec.derived) throw new BankError(`slot ${name} is derived by the layout and cannot be set. Fix: set the slots it is derived from`, "OPTION_VALUE_INVALID");
    if (found.spec.kind === "image" && !String(value).startsWith("data:image/")) throw new BankError(`slot ${name} is an image slot; pass a png, jpg, webp or svg file path`, "OPTION_VALUE_INVALID");
    if (found.spec.kind !== "image" && /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new BankError(`slot ${name} contains control characters`, "OPTION_VALUE_INVALID");
  }
  const { params, palette, varied } = resolveParams(manifest, overrides, seed);
  const faces = fontFacesIn(fontDir, loadStyle(manifest.style));
  const doc = new Doc(manifest, W, H, params, palette, set, faces);
  try {
    LAYOUTS[id](doc);
  } catch (error) {
    if (error instanceof BankError) throw error;
    throw new BankError(error.message, error.code || "TEMPLATE_INVALID");
  }
  const unknownSet = Object.keys(set).filter((name) => !doc.used.has(name));
  if (unknownSet.length) throw new BankError(`slot ${unknownSet.join(", ")} is not drawn with the current parameters (for example a count parameter is lower). Fix: raise the count or drop the --set`, "OPTION_VALUE_INVALID");
  const values = Object.fromEntries(Object.entries(set).map(([name, value]) => [name, String(value).startsWith("data:") ? `${String(value).slice(0, 32)}…` : value]));
  const meta = { template: id, style: manifest.style, canvas: [W, H], params, palette, slots: values, ...(seed === null || seed === undefined ? {} : { seed: Number(seed), varied }), ...(doc.fontSwitches.length ? { fontSwitches: doc.fontSwitches } : {}), ...(faces.length ? { fontFaces: faces.map((f) => path.basename(f.file)) } : {}), provenance: manifest.provenance.summary };
  // composite receipts behind image slots (materials composite): the browser check reads their
  // measurements and the character's face and hand boxes from there
  if (layerSources && Object.keys(layerSources).length) meta.layerSources = layerSources;
  return { svg: doc.svg(meta), template: id, style: manifest.style, size: `${W}x${H}`, params, palette, varied, fontSwitches: doc.fontSwitches, fontFaces: faces, ...(doc.edl ? { edl: doc.edl } : {}) };
}

// ---- check ---------------------------------------------------------------------------------
function readRules(tree) {
  const node = [...measure.walk(tree)].find((n) => n.name === "metadata" && n.attrs.id === "template-check");
  if (!node) throw new BankError("not a template-bank render: <metadata id=\"template-check\"> is missing. Fix: render it with template render <id>", "CONTRACT_INVALID");
  try {
    const rules = JSON.parse(measure.textContent(node));
    if (rules.schema !== CHECK_SCHEMA) throw new Error(`schema ${rules.schema}`);
    return rules;
  } catch (error) {
    throw new BankError(`template-check metadata is not valid ${CHECK_SCHEMA} JSON (${error.message})`, "CONTRACT_INVALID");
  }
}

function validateTones(tree, tones) {
  const imageSlots = new Set([...measure.walk(tree)].filter((n) => n.attrs["data-kind"] === "image").map((n) => n.attrs["data-slot"]));
  const out = {};
  for (const [slot, value] of Object.entries(tones)) {
    if (!imageSlots.has(slot)) throw new BankError(`--tone ${slot}: not an image slot of this render. Fix: use one of ${[...imageSlots].join(", ")}`, "OPTION_VALUE_INVALID");
    if (!/^#[0-9a-fA-F]{6}$/.test(String(value))) throw new BankError(`--tone ${slot} must be a #RRGGBB colour, got ${value}`, "OPTION_VALUE_INVALID");
    out[slot] = String(value).toUpperCase();
  }
  return out;
}

// Points to sample in a browser: every text slot that sits on a real image with no declared tone.
function pixelRequests(svgText, options = {}) {
  const tree = measure.parseXml(svgText);
  const rules = readRules(tree);
  const tones = validateTones(tree, options.tones || {});
  const [W, H] = rules.canvas;
  const layers = measure.paints(tree);
  const grads = measure.gradients(tree);
  const points = {};
  for (const slot of measure.readSlots(tree).filter((s) => (s.kind === "text" || s.kind === "lettering") && s.extent && !s.decor && s.fill)) {
    const order = slot.textNode.order ?? slot.node.order;
    const inside = measure.samplePoints(slot.extent).filter(([x, y]) => x >= 0 && y >= 0 && x <= W && y <= H);
    if (inside.some((point) => measure.groundAt(point, layers, grads, order, slot.slot, tones).realImages.length)) points[slot.slot] = inside;
  }
  return { width: W, height: H, points };
}

function roleOf(node) {
  for (let current = node; current && current.attrs; current = current.parent) if (current.attrs["data-role"]) return current.attrs["data-role"];
  return null;
}

// Size advice stays inside the parameter's measured range; past it, shortening is the only fix.
function sizeFix(slot, factor, context) {
  const target = Math.floor(slot.size * factor * 10) / 10;
  if (!slot.sizeParam) return `, or reduce the slot's size to ${target}px in the layout`;
  const spec = context.manifest?.params?.[slot.sizeParam];
  const current = context.params?.[slot.sizeParam];
  if (spec && typeof current === "number") {
    const value = Math.floor(current * factor * 10000) / 10000;
    if (value < spec.min) return `; lowering --param ${slot.sizeParam} would need ${value}, below its measured minimum ${spec.min}, so shorten the copy`;
    return `, or set --param ${slot.sizeParam}=${value} (size ${target}px)`;
  }
  return `, or scale --param ${slot.sizeParam} by ${factor.toFixed(2)} (size ${target}px)`;
}

function renderContext(tree, rules) {
  const node = [...measure.walk(tree)].find((n) => n.name === "metadata" && n.attrs.id === "template-params");
  let params = null;
  try { params = node ? JSON.parse(measure.textContent(node)).params : null; } catch { params = null; }
  let manifest = null;
  try { manifest = templateIds().includes(rules.template) ? loadManifest(rules.template) : null; } catch { manifest = null; }
  return { params, manifest };
}

function fitChars(slot, available) {
  const chars = [...slot.text];
  if (!chars.length) return 0;
  const perChar = slot.extent[slot.vertical ? 3 : 2] / Math.max(1, chars.length / Math.max(1, slot.lines?.length || 1));
  return Math.max(0, Math.floor(available / perChar));
}

// Rhythm of a title-card cut, as written in the render's check metadata: [{ kind: black|hold|flash,
// frames, shot, ground, variant, group, luminance? }]. A short black between two flashes is a black
// flash inside the group (2-6 frames), not a separator. The flash rate is a cut-list approximation:
// one mean relative luminance per card (the segment's luminance when given, else its ground tone);
// a flash is a pair of opposing changes of at least 0.1 with the darker side below 0.8. The
// encoded film's photosensitive check (verify film-render) is the authoritative measurement.
function checkRhythm(rhythm) {
  const findings = [];
  const { fps, limits, grounds } = rhythm;
  const flashMax = limits.flashFrames[1];
  const edl = rhythm.edl.map((seg) => ({ ...seg }));
  for (let i = 1; i < edl.length - 1; i += 1) {
    if (edl[i].kind === "black" && edl[i].frames <= flashMax && edl[i - 1].kind === "flash" && edl[i + 1].kind === "flash") edl[i] = { ...edl[i], kind: "flash", blackFlash: true };
  }
  const range = { black: limits.blackFrames, hold: limits.holdFrames, flash: limits.flashFrames };
  edl.forEach((seg, index) => {
    const [lo, hi] = range[seg.kind] || [1, Infinity];
    if (seg.frames < lo || seg.frames > hi) {
      const label = seg.blackFlash ? "black flash" : seg.kind;
      findings.push({ rule: "rhythm", slot: seg.shot || seg.kind, measured: { segment: index, kind: label, frames: seg.frames }, limit: { frames: [lo, hi] },
        message: `segment ${index} (${label}${seg.shot ? ` ${seg.shot}` : ""}) lasts ${seg.frames} frames; ${label} cuts last ${lo}-${hi}`,
        fix: seg.kind === "black" && seg.frames < lo
          ? `Lengthen the black at segment ${index} to ${lo} frames, or put flashes on both sides of it so it is a black flash (2-${flashMax} frames).`
          : `Set segment ${index} to ${Math.min(hi, Math.max(lo, seg.frames))} frames (--param ${seg.kind === "flash" ? "flash_frames" : seg.kind === "hold" ? "hold_frames" : "black_frames"} inside ${lo}-${hi}).` });
    }
  });
  const groups = [];
  for (let i = 0; i < edl.length; i += 1) {
    if (edl[i].kind !== "flash") continue;
    const start = i;
    while (i + 1 < edl.length && edl[i + 1].kind === "flash") i += 1;
    groups.push({ start, end: i, segs: edl.slice(start, i + 1) });
  }
  const [gmin, gmax] = limits.flashGroup;
  for (const g of groups) {
    const n = g.segs.length;
    if (n < gmin || n > gmax) findings.push({ rule: "rhythm", slot: `flash group at ${g.start}`, measured: { flashes: n }, limit: { flashes: [gmin, gmax] },
      message: `flash group at segment ${g.start} has ${n} flash${n === 1 ? "" : "es"}; groups hold ${gmin}-${gmax}`,
      fix: `${n < gmin ? "Add" : "Remove"} ${n < gmin ? gmin - n : n - gmax} flash(es) (--param group_size inside ${gmin}-${gmax}), and keep a hold or black on each side.` });
    const tones = [...new Set(g.segs.map((seg) => seg.ground))];
    if (tones.length > 1) findings.push({ rule: "rhythm", slot: `flash group at ${g.start}`, measured: { grounds: tones }, limit: { grounds: 1 },
      message: `flash group at segment ${g.start} mixes grounds ${tones.join(", ")}`,
      fix: `Use cards of one ground in a flash group (${tones[0]}); vary them by text, crop or push-in, and change the ground at a hold or black.` });
    let run = 1;
    for (let k = 1; k < g.segs.length; k += 1) {
      run = g.segs[k].shot === g.segs[k - 1].shot ? run + 1 : 1;
      if (run > limits.repeats[1]) findings.push({ rule: "rhythm", slot: g.segs[k].shot, measured: { repeats: run }, limit: { repeats: limits.repeats },
        message: `${g.segs[k].shot} repeats ${run} times in a row; the grammar repeats a frame ${limits.repeats[0]}-${limits.repeats[1]} times`,
        fix: `Cut the repeat to ${limits.repeats[1]} (--param repeat) or cut to another card of the same ground.` });
    }
  }
  const frames = edl.reduce((sum, seg) => sum + seg.frames, 0);
  const seconds = frames / fps;
  const [dmin, dmax] = limits.durationSec;
  if (seconds < dmin - 1e-9 || seconds > dmax + 1e-9) findings.push({ rule: "rhythm", slot: "duration", measured: { seconds: measure.round(seconds, 2), frames }, limit: { seconds: [dmin, dmax] },
    message: `the cut runs ${measure.round(seconds, 2)} s; the grammar is ${dmin}-${dmax} s`,
    fix: `${seconds < dmin ? `Add ${Math.ceil((dmin - seconds) * fps)} frames (raise --param hold_frames or --param groups)` : `Remove ${Math.ceil((seconds - dmax) * fps)} frames (lower --param hold_frames or --param groups)`}.` });
  // flash rate on per-card mean luminance
  const tone = Object.fromEntries(Object.entries(grounds).map(([k, v]) => [k, measure.luminance(measure.parseColor(v))]));
  const timeline = [];
  for (const seg of edl) for (let f = 0; f < seg.frames; f += 1) timeline.push(typeof seg.luminance === "number" ? seg.luminance : tone[seg.ground]);
  const changes = [];
  for (let f = 1; f < timeline.length; f += 1) {
    const a = timeline[f - 1]; const b = timeline[f];
    if (a === undefined || b === undefined) continue;
    if (Math.abs(a - b) >= limits.flashLimit.minLuminanceChange && Math.min(a, b) < limits.flashLimit.darkerBelow) changes.push({ frame: f, up: b > a });
  }
  let worst = null;
  for (let i = 0; i < changes.length; i += 1) {
    let last = null; let count = 0;
    for (let j = i; j < changes.length && changes[j].frame < changes[i].frame + fps; j += 1) {
      if (last === null || changes[j].up !== last) { count += 1; last = changes[j].up; }
    }
    const pairs = Math.floor(count / 2);
    if (!worst || pairs > worst.flashes) worst = { flashes: pairs, at: changes[i].frame };
  }
  const source = edl.some((seg) => typeof seg.luminance === "number") ? "per-card mean luminance" : "ground tones";
  if (worst && worst.flashes > limits.flashLimit.perSecond) findings.push({ rule: "rhythm", slot: "flash-rate", measured: { flashesInOneSecond: worst.flashes, fromFrame: worst.at, atSeconds: measure.round(worst.at / fps, 2), method: `cut-list approximation (${source})` }, limit: { perSecond: limits.flashLimit.perSecond },
    message: `the cut list suggests ${worst.flashes} luminance flashes within one second from ${measure.round(worst.at / fps, 2)} s (approximation from ${source}; the limit used is ${limits.flashLimit.perSecond} a second). This is not a photosensitivity verdict: the encoded-film check is authoritative`,
    fix: "Keep one ground per flash group, change grounds only across a hold or a black of at least 12 frames, avoid alternating a bright card with black every few frames; then check the encoded film with verify film-render." });
  return findings;
}

// options.tones: { <image slot>: "#RRGGBB" } declared tone of a real image under text.
// options.pixels: { <text slot>: [[r, g, b], ...] } rendered ground pixels at measure.samplePoints of the
// slot's extent, from pixelRequests() run through a browser.
function check(svgText, options = {}) {
  let tree;
  try { tree = measure.parseXml(svgText); } catch (error) { throw new BankError(error.message, "CONTRACT_INVALID"); }
  const rules = readRules(tree);
  const tones = validateTones(tree, options.tones || {});
  const pixels = options.pixels || {};
  const context = renderContext(tree, rules);
  const [W, H] = rules.canvas;
  const canvasBox = [0, 0, W, H];
  const slots = measure.readSlots(tree);
  const layers = measure.paints(tree);
  const grads = measure.gradients(tree);
  const findings = [];
  const notes = [];
  const measured = [];
  const add = (finding) => findings.push(finding);
  const textSlots = slots.filter((s) => (s.kind === "text" || s.kind === "lettering") && s.extent);

  for (const slot of textSlots) {
    const [ex, ey, ew, eh] = slot.extent;
    const row = { slot: slot.slot, kind: slot.fallback ? "lettering(cjk-font)" : slot.kind, text: slot.text, extent: measure.roundBox(slot.extent), box: slot.box ? measure.roundBox(slot.box) : null, sizePx: measure.round(slot.size) };
    // 1. fit: the measured extent stays inside the slot box (bleeding decoration is exempt).
    if (slot.box && !slot.bleed) {
      const [bx, by, bw, bh] = slot.box;
      const over = { left: bx - ex, right: ex + ew - (bx + bw), top: by - ey, bottom: ey + eh - (by + bh) };
      const worst = Object.entries(over).filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]);
      const lineOverflow = slot.lines && slot.lines.length > (slot.maxLines || 1);
      if (worst.length || lineOverflow) {
        const along = slot.vertical ? bh : bw;
        const length = slot.vertical ? eh : ew;
        const factor = Math.min(1, along / Math.max(length, 1));
        const keep = Math.min(fitChars(slot, slot.vertical ? bh : bw * (slot.maxLines || 1)), slot.maxChars || Infinity);
        add({
          rule: "text-overflow", slot: slot.slot,
          measured: { extent: measure.roundBox(slot.extent), lines: slot.lines?.length || 1, overflowPx: Object.fromEntries(worst.map(([k, v]) => [k, measure.round(v)])) },
          limit: { box: measure.roundBox(slot.box), lines: slot.maxLines || 1 },
          message: `${slot.slot} overflows its box by ${worst.map(([k, v]) => `${measure.round(v)}px ${k}`).join(", ") || `${slot.lines.length - slot.maxLines} line(s)`}`,
          fix: `Shorten ${slot.slot} to about ${keep} characters (now ${[...slot.text].length})${sizeFix(slot, factor, context)}; if the copy cannot change, pick a template whose slot holds it.`,
        });
      }
    }
    if (slot.maxChars && [...slot.text].length > slot.maxChars) {
      add({
        rule: "text-length", slot: slot.slot, measured: { chars: [...slot.text].length }, limit: { maxChars: slot.maxChars },
        message: `${slot.slot} has ${[...slot.text].length} characters; the template budgets ${slot.maxChars}`,
        fix: `Cut ${slot.slot} to ${slot.maxChars} characters or fewer; move the rest to a body or caption slot.`,
      });
    }
    // 2. minimum type size (decoration exempt).
    if (!slot.decor) {
      const isCap = slot.kind === "lettering" && !slot.fallback;
      const limit = isCap ? rules.minCapPx : rules.minTypePx;
      if (slot.size + 1e-6 < limit) {
        const factor = limit / slot.size;
        add({
          rule: "type-size", slot: slot.slot, measured: { [isCap ? "capHeightPx" : "fontSizePx"]: measure.round(slot.size) }, limit: { min: limit },
          message: `${slot.slot} is ${measure.round(slot.size)}px ${isCap ? "cap height" : "font size"}, below the ${limit}px minimum`,
          fix: `Render at a larger --size (x${factor.toFixed(2)} or more)${slot.sizeParam ? ` or raise --param ${slot.sizeParam} by x${factor.toFixed(2)}` : ""}.`,
        });
      }
    }
    // 3. contrast of the text against its ground, judged at 27 points over the measured extent.
    if (!slot.decor && slot.fill) {
      const fg = measure.parseColor(slot.fill);
      const order = slot.textNode.order ?? slot.node.order;
      const inside = measure.samplePoints(slot.extent).filter(([x, y]) => x >= 0 && y >= 0 && x <= W && y <= H);
      const grounds = inside.map((point) => ({ point, ground: measure.groundAt(point, layers, grads, order, slot.slot, tones) }));
      const realImages = [...new Set(grounds.flatMap((item) => item.ground.realImages))];
      const sampled = realImages.length ? pixels[slot.slot] : null;
      let worst = null;
      if (realImages.length && sampled && sampled.length === inside.length) {
        sampled.forEach((rgb, index) => {
          const ratio = measure.contrastRatio(fg, rgb);
          if (!worst || ratio < worst.ratio) worst = { ratio, color: rgb, point: inside[index], source: "pixels" };
        });
        notes.push(`${slot.slot}: contrast judged on ${sampled.length} rendered pixels of image slot ${realImages.join(", ")} under the text`);
      } else if (realImages.length) {
        add({
          rule: "contrast-unverified", slot: slot.slot, measured: { imageSlots: realImages }, limit: { needs: "rendered pixels or a declared tone" },
          message: `${slot.slot} sits on the real image in ${realImages.join(", ")}, and its pixels were not sampled`,
          fix: `Run the check where headless Chrome and puppeteer-core are available (template render and template check then sample the rendered pixels under the text), or declare the image's tone under the text with --tone ${realImages[0]}=#RRGGBB.`,
        });
      } else {
        for (const { point, ground } of grounds) {
          const ratio = measure.contrastRatio(fg, ground.color);
          if (!worst || ratio < worst.ratio) worst = { ratio, color: ground.color, point, assumed: ground.assumed, source: "geometry" };
        }
      }
      if (worst && fg) {
        const isLarge = slot.kind === "lettering" && !slot.fallback ? slot.size / 0.72 >= rules.contrast.largePx : slot.size >= rules.contrast.largePx || (slot.size >= rules.contrast.largeBoldPx && slot.weight >= 700);
        const need = isLarge ? rules.contrast.large : rules.contrast.normal;
        row.contrast = measure.round(worst.ratio, 2);
        row.ground = measure.hex(worst.color);
        row.groundFrom = worst.source;
        if (worst.assumed) {
          notes.push(Object.hasOwn(tones, worst.assumed)
            ? `${slot.slot}: ground under the text is the tone declared with --tone for image slot ${worst.assumed}`
            : `${slot.slot}: ground under the text is image slot ${worst.assumed}'s declared tone ${row.ground} (no image in the slot yet)`);
        }
        if (worst.ratio + 1e-9 < need) {
          add({
            rule: "contrast", slot: slot.slot, measured: { ratio: measure.round(worst.ratio, 2), text: measure.hex(fg), ground: measure.hex(worst.color), at: worst.point.map((v) => measure.round(v)), from: worst.source },
            limit: { min: need, large: isLarge },
            message: `${slot.slot} contrast ${measure.round(worst.ratio, 2)}:1 against ${measure.hex(worst.color)} is below ${need}:1`,
            fix: `Darken or lighten the text colour (palette role ${slot.node.attrs["data-role"] || slot.textNode.attrs["data-role"] || "of the slot"}) via --param palette.<role>=#RRGGBB until it reaches ${need}:1, or put a plate or scrim under it${worst.source === "pixels" ? `; the ground is the image in ${realImages.join(", ")}, so a darker crop or a scrim also works` : worst.assumed ? `; the ground is image slot ${worst.assumed}` : ""}.`,
          });
        }
      }
    }
    // 4. lettering keeps its style: characters the glyph set cannot draw make the slot fall back.
    if (slot.kind === "lettering") {
      const missing = [...new Set([...slot.text].filter((ch) => ch !== " " && !lettering.hasGlyph(ch)))];
      if (missing.length) {
        add({
          rule: "lettering-fallback", slot: slot.slot, measured: { characters: missing }, limit: { glyphs: lettering.GLYPHS.join("") },
          message: `${slot.slot} has characters the code-drawn lettering cannot draw (${missing.join(" ")}), so the slot was set in the fallback font and its style changed`,
          fix: `Use only A-Z, 0-9, space and ${lettering.GLYPHS.filter((ch) => !/[A-Z0-9 ]/.test(ch)).join(" ")} in ${slot.slot}, or move this copy to a text slot.`,
        });
      } else if (/[a-z]/.test(slot.text)) {
        notes.push(`${slot.slot}: lowercase is drawn as capitals by the lettering`);
      }
    }
    // 4b. glyph coverage known at render time: no font of the role covers the whole string.
    const missing = slot.node.attrs["data-font-missing"] || slot.textNode?.attrs?.["data-font-missing"];
    if (missing) {
      add({
        rule: "glyph-coverage", slot: slot.slot, measured: { role: slot.node.attrs["data-font-role"] || null, missing }, limit: { missing: "" },
        message: `no font of ${slot.slot}'s role covers ${missing}; the string would be set glyph by glyph in mixed fonts`,
        fix: `Rewrite ${slot.slot} without ${missing}, or give --font-dir a font of the role that covers it (the font catalog lists candidates); the whole string switches, never single glyphs.`,
      });
    }
    measured.push(row);
  }

  // 5. titles stay out of declared figure zones (horizontal overlap share while rows intersect).
  for (const zone of rules.zones.filter((z) => z.kind === "figure")) {
    const [zx, zy, zw, zh] = zone.box;
    for (const slot of textSlots.filter((s) => s.title)) {
      const [ex, ey, ew, eh] = slot.extent;
      if (ey + eh <= zy || ey >= zy + zh) continue;
      const overlap = Math.max(0, Math.min(ex + ew, zx + zw) - Math.max(ex, zx));
      const share = overlap / Math.max(ew, 1);
      if (share > zone.maxOverlap + 1e-9) {
        const allowed = zone.maxOverlap * ew;
        const shift = overlap - allowed;
        add({
          rule: "figure-zone", slot: slot.slot, zone: zone.id, measured: { overlapShare: measure.round(share, 3), overlapPx: measure.round(overlap) }, limit: { maxOverlapShare: zone.maxOverlap, zone: measure.roundBox(zone.box) },
          message: `${slot.slot} covers ${Math.round(share * 100)}% of its width over the figure zone ${zone.id} (allowed ${Math.round(zone.maxOverlap * 100)}%)`,
          fix: `Move ${slot.slot} ${ex + ew / 2 < zx + zw / 2 ? "left" : "right"} by at least ${Math.ceil(shift)}px${zone.param ? ` (--param ${zone.param})` : ""}${zone.figureParam ? `, or move the figure ${ex + ew / 2 < zx + zw / 2 ? "right" : "left"} by as much (--param ${zone.figureParam})` : ""}, or shorten it by ${Math.ceil(shift)}px; keep the title column clear of the figure.`,
        });
      }
    }
  }
  // 6. crop/safe zones keep their listed slots whole.
  for (const zone of rules.zones.filter((z) => z.kind === "safe")) {
    const [zx, zy, zw, zh] = zone.box;
    for (const name of zone.slots || []) {
      for (const slot of slots.filter((s) => s.slot === name && s.extent)) {
        const [ex, ey, ew, eh] = slot.extent;
        const out = { left: zx - ex, right: ex + ew - (zx + zw), top: zy - ey, bottom: ey + eh - (zy + zh) };
        const worst = Object.entries(out).filter(([, v]) => v > 0.5);
        if (worst.length) {
          add({
            rule: "safe-zone", slot: name, zone: zone.id, measured: { outsidePx: Object.fromEntries(worst.map(([k, v]) => [k, measure.round(v)])) }, limit: { zone: measure.roundBox(zone.box) },
            message: `${name} leaves the ${zone.id} zone by ${worst.map(([k, v]) => `${measure.round(v)}px ${k}`).join(", ")}`,
            fix: `Move ${name} inside ${zone.id} (${measure.roundBox(zone.box).join(",")}); ${zone.note || "the crop would cut it"}.`,
          });
        }
      }
    }
  }
  // 7. accent-colour budget: area of accent-role or accent-coloured paint over the canvas.
  const accentColors = new Set(rules.accent.colors.map((c) => c.toUpperCase()));
  const isAccent = (fill, role) => rules.accent.roles.includes(role) || (fill && accentColors.has(String(fill).toUpperCase()));
  const contributions = new Map();
  for (const layer of layers) {
    if (layer.image) continue;
    const role = roleOf(layer.node);
    if (!isAccent(layer.fill, role)) continue;
    const area = measure.paintArea(layer, canvasBox) * layer.opacity;
    const key = layer.slot || `${layer.node.name}:${role || layer.fill}`;
    contributions.set(key, (contributions.get(key) || 0) + area);
  }
  for (const slot of textSlots.filter((s) => s.kind === "text" || s.fallback)) {
    const role = roleOf(slot.textNode);
    if (!isAccent(slot.fill, role)) continue;
    const clipped = measure.clipToBox([[slot.extent[0], slot.extent[1]], [slot.extent[0] + slot.extent[2], slot.extent[1]], [slot.extent[0] + slot.extent[2], slot.extent[1] + slot.extent[3]], [slot.extent[0], slot.extent[1] + slot.extent[3]]], canvasBox);
    contributions.set(slot.slot, (contributions.get(slot.slot) || 0) + measure.polygonArea(clipped) * rules.accent.textInkFactor);
  }
  const accentArea = [...contributions.values()].reduce((s, v) => s + v, 0);
  const accentShare = accentArea / (W * H);
  if (accentShare > rules.accent.maxShare + 1e-9) {
    const top = [...contributions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const excess = accentArea - rules.accent.maxShare * W * H;
    add({
      rule: "accent-budget", measured: { share: measure.round(accentShare, 4), largest: top.map(([k, v]) => ({ element: k, share: measure.round(v / (W * H), 4) })) }, limit: { maxShare: rules.accent.maxShare },
      message: `accent colour covers ${(accentShare * 100).toFixed(2)}% of the canvas; the budget is ${(rules.accent.maxShare * 100).toFixed(2)}%`,
      fix: `Remove about ${Math.ceil(excess)}px² of accent (${((excess / (W * H)) * 100).toFixed(2)}% of the canvas): shrink or recolour ${top.map(([k]) => k).join(", ")}; keep the accent for one mark, the tagline bar or actionable elements.`,
    });
  }
  // 8. shared alignment lines.
  for (const line of rules.alignLines) {
    for (const name of line.slots) {
      const slot = slots.find((s) => s.slot === name && s.extent);
      if (!slot) continue;
      const edge = line.edge === "left" ? slot.extent[0] : slot.extent[0] + slot.extent[2];
      const off = edge - line.x;
      if (Math.abs(off) > line.tolerance + 1e-9) {
        add({
          rule: "align-line", slot: name, line: line.id, measured: { edgeX: measure.round(edge), offsetPx: measure.round(off) }, limit: { x: line.x, tolerancePx: line.tolerance },
          message: `${name} ${line.edge} edge is at x=${measure.round(edge)}, ${measure.round(Math.abs(off))}px ${off > 0 ? "right" : "left"} of the shared ${line.edge} line x=${line.x}`,
          fix: `Move ${name} ${off > 0 ? "left" : "right"} by ${measure.round(Math.abs(off))}px so its ${line.edge} edge sits on x=${line.x}${line.param ? ` (or set --param ${line.param} to match the other elements)` : ""}.`,
        });
      }
    }
  }
  // 9. geometry the measurement does not model is a failure, never a silent pass.
  for (const item of measure.unsupportedGeometry(tree)) {
    add({
      rule: "unsupported-geometry", slot: item.element.startsWith("slot ") ? item.element.slice(5) : undefined, measured: { element: item.element, found: item.what }, limit: { supported: "rect, polygon, path, circle, line, text with dy-only tspans; transform attributes with matrix, translate, scale, rotate" },
      message: `${item.element} contains ${item.what}, which the check cannot measure`,
      fix: item.fix || "Flatten it: no <use>, nested <svg>, <foreignObject> or CSS transforms; put moves in the transform attribute (translate, rotate, scale, matrix) and give tspans only dy; or render again with template render and change the layout through --set and --param.",
    });
  }
  // 10. cutting rhythm (motion templates): segment lengths, flash groups, duration and flash rate.
  if (rules.rhythm) for (const finding of checkRhythm(rules.rhythm)) add(finding);
  if (!rules.alignLines.length) notes.push("this template declares no shared alignment line");
  if (!rules.zones.some((z) => z.kind === "figure")) notes.push("this template declares no figure keep-out zone (titles may sit over the art; contrast still applies)");
  return {
    status: findings.length ? "failed" : "passed",
    template: rules.template, canvas: rules.canvas,
    summary: { textSlots: measured.length, findings: findings.length, accentShare: measure.round(accentShare, 4), accentBudget: rules.accent.maxShare },
    findings, notes: [...new Set(notes)], measured,
    scope: "Technical conformance only: fit, size, contrast, zones, accent area and alignment measured on the rendered SVG. It does not grant visual or creative acceptance.",
  };
}

module.exports = { BankError, MANIFEST_SCHEMA, STYLE_SCHEMA, CHECK_SCHEMA, PARAM_CLASSES, RULES, TEMPLATES_ROOT, STYLES_ROOT, check, checkRhythm, imageAspect, listTemplates, loadManifest, loadStyle, parseSize, render, resolveParams, slotSpec, styleIds, templateIds, pixelRequests, validateStyle };
