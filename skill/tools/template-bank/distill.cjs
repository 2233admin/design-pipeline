"use strict";

// Reference distillation: a reference board (a provenance list + local images, optional layout
// annotations) -> measured distributions -> a style pack draft (styles/<id>/style.json shape) with
// the reference distribution as its thresholds, layout archetypes matched to bank templates or a
// new skeleton, font roles from stroke measurements, and a one-page report of what the data
// supports and what is left to human judgement. Images are read, never copied: the draft and
// report carry ids, source URLs, hashes and numbers only.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const measure = require("./reference-measure.cjs");
const bank = require("./bank.cjs");

const DRAFT_SCHEMA = "design-pipeline.template-bank-distill.v1";
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MIN_SUPPORT = 8; // references behind a threshold before it counts as measured
const THIN_SUPPORT = 3;
const SKELETON_DISTANCE = 0.25; // archetype farther than this from every template gets a skeleton

class DistillError extends Error {
  constructor(message, code = "CONTRACT_INVALID") { super(message); this.code = code; }
}

// ---- board -------------------------------------------------------------------------------------

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === "\"" && text[i + 1] === "\"") { field += "\""; i += 1; }
      else if (c === "\"") quoted = false;
      else field += c;
    } else if (c === "\"") quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v !== "")) rows.push(row);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().replace(/^﻿/, ""));
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const num = (v) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

/** Annotations: the study's CSV (title box, figure x range, logo corner, orientation) or its
 * JSONL labels (text lines with box and size, figure box). Text strings are never kept. */
function readAnnotations(file) {
  if (!file) return new Map();
  const text = fs.readFileSync(file, "utf8");
  const out = new Map();
  if (/\.jsonl$/i.test(file)) {
    text.split(/\r?\n/).filter((l) => l.trim()).forEach((line, i) => {
      let rec;
      try { rec = JSON.parse(line); } catch { throw new DistillError(`${path.basename(file)} line ${i + 1} is not JSON. Fix: one JSON object per line ({"id", "text": [{"box": [x0,y0,x1,y1], "size"}], "fig": {"box"}})`); }
      if (!rec.id) throw new DistillError(`${path.basename(file)} line ${i + 1} has no id`);
      const lines = (rec.text || []).filter((t) => Array.isArray(t.box) && t.box.length === 4).map((t) => ({ box: t.box.map(Number), size: Number(t.size) || null, vert: Boolean(t.vert) }));
      const title = lines.length ? lines.reduce((a, b) => ((b.size || 0) > (a.size || 0) ? b : a)) : null;
      out.set(rec.id, { title: title ? title.box : null, titleSize: title?.size || null, titleVertical: title?.vert || false, text: lines, fig: rec.fig?.box ? [Number(rec.fig.box[0]), Number(rec.fig.box[2])] : null, category: rec.category || null });
    });
    return out;
  }
  for (const r of parseCsv(text)) {
    if (!r.id) continue;
    const box = ["title_x0", "title_y0", "title_x1", "title_y1"].map((k) => num(r[k]));
    const fig = [num(r.fig_x0), num(r.fig_x1)];
    out.set(r.id, {
      title: box.every((v) => v !== null) ? box : null, titleVertical: r.title_orient === "V", orient: r.title_orient || null,
      text: [], fig: fig.every((v) => v !== null) ? fig : null, logo: r.logo_corner || null, category: r.category || null,
    });
  }
  return out;
}

/** The provenance list the bank already asks for (id, source URL, size, category, date). */
/** A path as it may appear in outputs: relative to --root (or the working directory), never absolute. */
function relPath(file, root = null) {
  const rel = path.relative(path.resolve(root || process.cwd()), path.resolve(file));
  return (rel.startsWith("..") || path.isAbsolute(rel) ? path.basename(file) : rel) || ".";
}

function readBoard(boardFile, { images = null, annotations = null, categories = null, root = null } = {}) {
  if (!fs.existsSync(boardFile)) throw new DistillError(`board ${boardFile} does not exist`, "OPTION_VALUE_INVALID");
  const rows = parseCsv(fs.readFileSync(boardFile, "utf8"));
  if (!rows.length || !("id" in rows[0])) throw new DistillError(`${path.basename(boardFile)} needs an id column (the bank's provenance list: id, source URL, width, height, category). Fix: add a header row with id and image_url or source`);
  const imageDir = images || path.dirname(boardFile);
  const ann = readAnnotations(annotations);
  const wanted = categories && categories.length ? new Set(categories) : null;
  const entries = [], skipped = [];
  const seen = new Set();
  for (const r of rows) {
    if (!r.id) continue;
    if (seen.has(r.id)) throw new DistillError(`${path.basename(boardFile)} lists ${r.id} twice. Fix: one row per reference`);
    seen.add(r.id);
    const a = ann.get(r.id) || null;
    const category = r.category || r.category_by_eye || a?.category || null;
    if (wanted && !wanted.has(category)) continue;
    let source = r.image_url || r.source_url || r.source || r.url || null;
    if (source && !/^[a-z][a-z0-9+.-]*:\/\//i.test(source) && path.isAbsolute(source)) source = relPath(source, root);
    let file = null;
    if (r.file) file = path.resolve(imageDir, r.file);
    else for (const ext of IMAGE_EXTENSIONS) { const f = path.join(imageDir, `${r.id}${ext}`); if (fs.existsSync(f)) { file = f; break; } }
    if (!file || !fs.existsSync(file)) { skipped.push({ id: r.id, reason: "image not found", fix: `put ${r.id}.jpg|png|webp in ${relPath(imageDir, root)} or give a file column` }); continue; }
    if (root) {
      const rel = path.relative(fs.realpathSync(root), fs.realpathSync(file));
      if (rel.startsWith("..") || path.isAbsolute(rel)) { skipped.push({ id: r.id, reason: `image ${r.file} is outside --root`, fix: "move it under --root or pass a wider --root" }); continue; }
    }
    entries.push({ id: r.id, file, source, category, licence: r.license || r.licence || null, annotation: a });
  }
  if (!entries.length) throw new DistillError(`no reference image found for ${path.basename(boardFile)}${wanted ? ` in categories ${[...wanted].join(", ")}` : ""}. Fix: pass --images <dir> holding <id>.jpg|png|webp`, "OPTION_VALUE_INVALID");
  return { entries, skipped, annotated: entries.filter((e) => e.annotation).length };
}

// ---- measurement -------------------------------------------------------------------------------

function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

function measureEntry(entry, tools = {}) {
  const decoded = measure.decode(entry.file, { tools });
  const pixels = measure.measurePixels(decoded);
  const [W, H] = decoded.source;
  const boxes = measure.measureBoxes(entry.annotation);
  const type = [];
  const ann = entry.annotation;
  const crops = [];
  if (ann?.title) crops.push({ role: "title", box: ann.title, size: ann.titleSize, vertical: ann.titleVertical });
  for (const line of ann?.text || []) if (line.box !== ann.title) crops.push({ role: "text", box: line.box, size: line.size, vertical: line.vert });
  for (const crop of crops.slice(0, 6)) {
    const [x0, y0, x1, y1] = crop.box;
    const px = [Math.max(0, x0 * W), Math.max(0, y0 * H), Math.min(W, x1 * W), Math.min(H, y1 * H)];
    if (px[2] - px[0] < 8 || px[3] - px[1] < 8) continue;
    try {
      const img = measure.decode(entry.file, { longEdge: 0, crop: [px[0], px[1], px[2] - px[0], px[3] - px[1]], tools });
      const sizePx = crop.size ? crop.size * Math.max(W, H) * (img.scale || 1) : null; // in the decoded crop's pixels
      const s = measure.strokeStyle(img, { vertical: crop.vertical, sizePx: sizePx && sizePx >= 4 ? sizePx : null });
      const c = measure.classifyStroke(s);
      type.push({ role: crop.role, ...s, style: c.style, contrastClass: c.contrast, weightClass: c.weight, why: c.reason });
    } catch (error) {
      type.push({ role: crop.role, measurable: false, reason: error.message });
    }
  }
  const aspect = W / H;
  return {
    id: entry.id, category: entry.category, source: entry.source, sha256: sha256(entry.file), size: [W, H],
    aspect: aspect > 1.15 ? "landscape" : aspect < 0.87 ? "portrait" : "square",
    letterbox: pixels.letterbox, features: { ...pixels.features, ...boxes }, notes: pixels.notes, palette: pixels.palette, type,
  };
}

// ---- distributions -----------------------------------------------------------------------------

function distribution(values) {
  const v = values.filter((x) => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return { n: 0 };
  const q = (p) => measure.round(measure.quantile(v, p), 4);
  return { n: v.length, min: q(0), p25: q(0.25), median: q(0.5), p75: q(0.75), max: q(1) };
}

function support(n) { return n >= MIN_SUPPORT ? "measured" : n >= THIN_SUPPORT ? "thin" : "gap"; }

// Threshold rules: each measured feature bounds one check. kind max -> limit p75, min -> p25,
// band -> p25..p75. `rule` names the bank rule it informs (or "report" when no rule reads it yet).
const THRESHOLDS = [
  { feature: "accent_share", kind: "max", rule: "accent-budget", what: "pixels with OKLab chroma above 0.12 (strong colour)" },
  { feature: "ground_C", kind: "max", rule: "palette", what: "chroma of the largest colour cluster (how neutral the ground is)" },
  { feature: "ground_L", kind: "band", rule: "palette", what: "lightness of the largest colour cluster" },
  { feature: "hue_spread", kind: "max", rule: "palette", what: "circular std of the hue of coloured pixels, degrees (one theme hue = small)" },
  { feature: "main_share", kind: "min", rule: "palette", what: "pixel share of the largest colour cluster" },
  { feature: "neutral_share", kind: "min", rule: "palette", what: "pixels with OKLab chroma below 0.04" },
  { feature: "quiet_share", kind: "band", rule: "report", what: "share of 16x16 cells with low gradient (whitespace)" },
  { feature: "lr_symmetry", kind: "band", rule: "report", what: "left-right mirror similarity of lightness (1 = symmetric)" },
  { feature: "weight_cx", kind: "band", rule: "report", what: "horizontal centre of visual weight" },
  { feature: "spec_hf", kind: "max", rule: "report", what: "share of spectral power above 1/4 Nyquist (screentone, grain, texture)" },
  { feature: "margin_x", kind: "min", rule: "safe-zone", what: "smallest distance of annotated text to the left/right edge, fraction of the width" },
  { feature: "margin_y", kind: "min", rule: "safe-zone", what: "smallest distance of annotated text to the top/bottom edge, fraction of the height" },
  { feature: "type_ratio", kind: "band", rule: "type-size", what: "largest text size / median of the other text sizes" },
  { feature: "title_fig_overlap", kind: "max", rule: "figure-zone", what: "share of the title width over the figure's horizontal range" },
  { feature: "title_cx", kind: "band", rule: "report", what: "title centre x" },
  { feature: "title_cy", kind: "band", rule: "report", what: "title centre y" },
  { feature: "title_area", kind: "band", rule: "report", what: "title box area, fraction of the frame" },
  { feature: "fig_cx", kind: "band", rule: "report", what: "figure centre x" },
  { feature: "fig_w", kind: "band", rule: "report", what: "figure width, fraction of the width" },
];

function thresholds(measured) {
  const out = {};
  for (const t of THRESHOLDS) {
    const d = distribution(measured.map((m) => m.features[t.feature]));
    // A gap (fewer than THIN_SUPPORT references) has no limit: two values are not a distribution.
    const limit = support(d.n) !== "gap" ? (t.kind === "max" ? d.p75 : t.kind === "min" ? d.p25 : [d.p25, d.p75]) : null;
    const quart = t.kind === "max" ? "p75" : t.kind === "min" ? "p25" : "p25-p75";
    out[t.feature] = { rule: t.rule, kind: t.kind, what: t.what, limit, basis: !d.n ? "no reference carries it" : limit === null ? `only ${d.n} reference${d.n === 1 ? "" : "s"} carry it (${THIN_SUPPORT} needed)` : `${quart} of ${d.n} references`, support: support(d.n), distribution: d };
  }
  return out;
}

function shares(measured, key) {
  const counts = {};
  for (const m of measured) { const v = m.features[key]; if (v !== undefined && v !== null) counts[v] = (counts[v] || 0) + 1; }
  return counts;
}

// ---- palette -----------------------------------------------------------------------------------

/** Pooled palette: every reference's six clusters weighted by share, re-clustered (k = 6). */
function pooledPalette(measured) {
  const pts = [];
  for (const m of measured) for (const p of m.palette) { const lab = measure.hexToOklab(p.hex); const reps = Math.max(1, Math.round(p.share * 200)); for (let i = 0; i < reps; i += 1) pts.push(...lab); }
  const clusters = measure.kmeans(Float32Array.from(pts), Math.min(6, Math.max(1, pts.length / 3)), { step: 1, attempts: 3 });
  const swatches = clusters.filter((c) => c.share > 0).map((c) => ({ hex: measure.oklabToHex(c.lab), L: measure.round(c.lab[0], 3), C: measure.round(Math.hypot(c.lab[1], c.lab[2]), 3), share: measure.round(c.share, 3) }));
  // Roles: bg (the ground) = largest; ink = the neutral farthest in lightness from the ground; accent = the
  // most chromatic swatch with at least 1% of the pooled pixels; the rest are tones.
  const roles = {};
  const [ground, ...rest] = swatches;
  if (ground) roles.bg = { value: ground.hex, use: `largest pooled cluster (${Math.round(ground.share * 100)}% of reference pixels)`, measured: ground };
  const neutrals = rest.filter((s) => s.C < measure.CHROMA_COLOURED * 1.5);
  const ink = neutrals.sort((a, b) => Math.abs(b.L - ground.L) - Math.abs(a.L - ground.L))[0];
  if (ink) roles.ink = { value: ink.hex, use: `neutral farthest in lightness from the ground (${Math.round(ink.share * 100)}%)`, measured: ink };
  const accent = rest.filter((s) => s !== ink && s.share >= 0.01 && s.C >= measure.CHROMA_COLOURED).sort((a, b) => b.C - a.C)[0];
  if (accent) roles.accent = { value: accent.hex, use: `most chromatic pooled cluster (${Math.round(accent.share * 100)}%, C ${accent.C})`, measured: accent };
  let i = 1;
  for (const s of swatches) if (![roles.bg?.measured, roles.ink?.measured, roles.accent?.measured].includes(s)) roles[`tone${i++}`] = { value: s.hex, use: `pooled cluster (${Math.round(s.share * 100)}%)`, measured: s };
  return { swatches, roles };
}

// ---- archetypes and template matching ----------------------------------------------------------

function archetypeKey(m, medians) {
  const f = m.features;
  const parts = [m.aspect];
  if (f.title_side) {
    parts.push(`title-${f.title_side}-${f.title_band}`);
    if (f.fig_cx !== undefined) parts.push(`figure-${f.fig_cx < 0.45 ? "left" : f.fig_cx > 0.55 ? "right" : "centre"}`);
  } else {
    const symmetric = f.lr_symmetry >= (medians.lr_symmetry ?? 1) && Math.abs(f.weight_cx - 0.5) < 0.04;
    parts.push(symmetric ? "symmetric" : `offset-${f.weight_cx < 0.5 ? "left" : "right"}`);
  }
  parts.push(f.quiet_share >= (medians.quiet_share ?? 0) ? "airy" : "dense");
  return parts.join(" / ");
}

const VECTOR_KEYS = ["title_cx", "title_cy", "title_area", "fig_cx", "weight_cx", "quiet_share"];

/** Layout facts of a bank template from its default render's measured slots and zones. */
function templateFacts(id) {
  const manifest = bank.loadManifest(id);
  if (manifest.family === "motion") return null;
  const rendered = bank.render(id, {});
  const report = bank.check(rendered.svg);
  const [W, H] = report.canvas;
  const titleSlots = new Set(Object.entries(manifest.slots).filter(([, s]) => s.title).map(([name]) => name.replace(/\{i\}$/, "")));
  const text = report.measured.filter((m) => (m.kind === "text" || m.kind === "lettering") && m.extent && !manifest.slots[m.slot]?.decor);
  let titles = text.filter((m) => titleSlots.has(m.slot) || [...titleSlots].some((n) => m.slot.startsWith(n)));
  if (!titles.length && text.length) titles = [text.reduce((a, b) => ((b.sizePx || 0) > (a.sizePx || 0) ? b : a))];
  const facts = { id, style: manifest.style, family: manifest.family, aspect: W / H > 1.15 ? "landscape" : W / H < 0.87 ? "portrait" : "square" };
  if (titles.length) {
    const x0 = Math.min(...titles.map((m) => m.extent[0])), y0 = Math.min(...titles.map((m) => m.extent[1]));
    const x1 = Math.max(...titles.map((m) => m.extent[0] + m.extent[2])), y1 = Math.max(...titles.map((m) => m.extent[1] + m.extent[3]));
    facts.title_cx = (x0 + x1) / 2 / W; facts.title_cy = (y0 + y1) / 2 / H; facts.title_area = ((x1 - x0) * (y1 - y0)) / (W * H);
  }
  const meta = /<metadata id="template-check">([\s\S]*?)<\/metadata>/.exec(rendered.svg);
  if (meta) {
    try {
      const rules = JSON.parse(meta[1].replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
      const fig = (rules.zones || []).find((z) => z.kind === "figure");
      if (fig) facts.fig_cx = (fig.box[0] + fig.box[2] / 2) / W;
    } catch { /* a template without readable rules has no figure zone */ }
  }
  const area = text.reduce((s, m) => s + m.extent[2] * m.extent[3], 0);
  if (area) facts.weight_cx = text.reduce((s, m) => s + (m.extent[0] + m.extent[2] / 2) * m.extent[2] * m.extent[3], 0) / area / W;
  for (const k of Object.keys(facts)) if (typeof facts[k] === "number") facts[k] = measure.round(facts[k], 3);
  return facts;
}

function vectorDistance(a, b) {
  let s = 0, n = 0;
  for (const k of ["title_cx", "title_cy", "fig_cx"]) if (typeof a[k] === "number" && typeof b[k] === "number") { s += Math.abs(a[k] - b[k]); n += 1; }
  if (!n && typeof a.weight_cx === "number" && typeof b.weight_cx === "number") { s += Math.abs(a.weight_cx - b.weight_cx) * 2; n += 1; }
  if (!n) return Infinity;
  return s / n + (a.aspect === b.aspect ? 0 : 0.5);
}

function archetypes(measured, templates) {
  const medians = Object.fromEntries(["lr_symmetry", "quiet_share"].map((k) => [k, distribution(measured.map((m) => m.features[k])).median]));
  const groups = new Map();
  for (const m of measured) { const key = archetypeKey(m, medians); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m); }
  const out = [];
  for (const [key, members] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    const centre = { aspect: members[0].aspect };
    for (const k of [...VECTOR_KEYS, "fig_w", "margin_x", "margin_y", "type_ratio"]) { const d = distribution(members.map((m) => m.features[k])); if (d.n) centre[k] = d.median; }
    const ranked = templates.map((t) => ({ id: t.id, style: t.style, distance: measure.round(vectorDistance(centre, t), 3) })).filter((t) => Number.isFinite(t.distance)).sort((a, b) => a.distance - b.distance);
    const nearest = ranked[0] || null;
    const entry = { key, n: members.length, ids: members.map((m) => m.id), categories: shares(members.map((m) => ({ features: { c: m.category } })), "c"), centre, nearest: ranked.slice(0, 3) };
    if (!nearest || nearest.distance > SKELETON_DISTANCE) entry.skeleton = skeleton(centre, members);
    out.push(entry);
  }
  return out;
}

/** A new template skeleton: the archetype's median boxes as fractions, to write in a layouts file. */
function skeleton(centre, members) {
  const pick = (k) => distribution(members.map((m) => m.features[k]));
  const boxes = {};
  if (centre.title_cx !== undefined) {
    const area = centre.title_area || 0.04;
    const w = Math.min(0.9, Math.sqrt(area * 3)), h = Math.min(0.9, area / w);
    boxes.title = [centre.title_cx - w / 2, centre.title_cy - h / 2, centre.title_cx + w / 2, centre.title_cy + h / 2].map((v) => measure.round(Math.max(0, Math.min(1, v)), 3));
  }
  if (centre.fig_cx !== undefined) boxes.figureZone = [measure.round(centre.fig_cx - (centre.fig_w || 0.4) / 2, 3), 0, measure.round(centre.fig_cx + (centre.fig_w || 0.4) / 2, 3), 1];
  return {
    aspect: centre.aspect, boxes, margins: { x: pick("margin_x").p25 ?? null, y: pick("margin_y").p25 ?? null }, typeRatio: pick("type_ratio").median ?? null,
    next: "No bank template is close: write this layout in a layouts file (template-bank guide, 'Add a template distilled from a reference'), with these boxes as fractions of W and H.",
  };
}

// ---- fonts -------------------------------------------------------------------------------------

const DEFAULT_STACK = { mincho: { stack: ["Noto Serif CJK SC"], generic: "serif" }, gothic: { stack: ["Noto Sans CJK SC"], generic: "sans-serif" } };

// The open-font catalog (skill/scripts/font-catalog-core.cjs, issue #286 / PR #290) when the
// package has it: resolveCatalog({}) -> { catalog } and queryCatalog({ catalog, text, style,
// contrast, weight }) -> { candidates }. useFontCatalog(core) replaces the lookup (tests, or a
// catalog loaded elsewhere); null restores it.
let fontCatalog;
function useFontCatalog(core) { fontCatalog = core; }
function loadFontCatalog() {
  if (fontCatalog !== undefined && fontCatalog !== null) return fontCatalog;
  try { return require("../../scripts/font-catalog-core.cjs"); } catch { return null; }
}

/** Catalog candidates for a measured role, or the command to run once the catalog is installed. */
function catalogQuery(query, sample) {
  const core = loadFontCatalog();
  if (!core) return { status: "not-installed", note: "the open-font catalog is not in this package yet; once it is, run the command below" };
  try {
    // As the catalog's own CLI calls it: no explicit file, the vendor cache root for a refreshed copy.
    const { cacheRoot } = require("../../scripts/vendor-cache.cjs");
    const { catalog } = core.resolveCatalog({ catalog: null, cacheRoot });
    const result = core.queryCatalog({ catalog, text: sample, style: query.style || undefined, contrast: query.contrast || undefined, weight: query.weight || undefined });
    return { status: "queried", sample, candidates: result.candidates.slice(0, 5).map((c) => ({ family: c.family, styles: c.styles, contrast: c.contrast, weights: c.weights, license: c.license?.id || null })) };
  } catch (error) {
    return { status: "unavailable", note: String(error.message).split("\n")[0], fix: error.fix || "Run `designer-pipeline fonts refresh` to rebuild the catalog, or reinstall the skill; until then use the open defaults in the draft" };
  }
}

function fontRoles(measured, sample) {
  const roles = {};
  for (const role of ["title", "text"]) {
    const rows = measured.flatMap((m) => m.type.filter((t) => t.role === role).map((t) => ({ ...t, id: m.id })));
    if (!rows.length) continue;
    const ok = rows.filter((r) => r.measurable);
    const votes = {};
    for (const r of ok) votes[r.style || "unclassified"] = (votes[r.style || "unclassified"] || 0) + 1;
    const contrast = distribution(ok.map((r) => r.contrast));
    const weight = distribution(ok.map((r) => r.weight));
    const top = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    const style = top && top[0] !== "unclassified" && top[1] / ok.length >= 0.6 ? top[0] : null;
    const summary = measure.classifyStroke(contrast.n ? { measurable: true, contrast: contrast.median, weight: weight.median } : null);
    const query = { style, contrast: contrast.n ? (contrast.median >= measure.CONTRAST_HIGH ? "high" : "low") : null, weight: summary.weight };
    roles[role] = {
      measured: { crops: rows.length, measurable: ok.length, votes, contrast, weight, unmeasurable: rows.filter((r) => !r.measurable).slice(0, 5).map((r) => ({ id: r.id, reason: r.reason })) },
      support: support(ok.length), query,
      command: `designer-pipeline fonts query --text <your copy>${style ? ` --style ${style}` : ""}${query.contrast ? ` --contrast ${query.contrast}` : ""}${query.weight ? ` --weight ${query.weight}` : ""}`,
      catalog: catalogQuery(query, sample),
    };
  }
  return roles;
}

// ---- draft -------------------------------------------------------------------------------------

const pct = (v) => `${Math.round(v * 1000) / 10}%`;

/**
 * Grammar sentences written from the data, split by support: `rules` go into style.json and
 * need a measured feature (MIN_SUPPORT references); `tendencies` (thin data, 3-7 references) are
 * listed only in the report. Gaps produce no sentence.
 */
function grammarLines(measured, th, arch) {
  const rules = [], tendencies = [];
  const put = (n, line) => { const level = support(n); if (level === "measured") rules.push(line); else if (level === "thin") tendencies.push(`${line} [thin: ${n} references]`); };
  const n = measured.length;
  const sides = shares(measured, "title_side");
  const titled = Object.values(sides).reduce((a, b) => a + b, 0);
  if (titled) {
    const [side, count] = Object.entries(sides).sort((a, b) => b[1] - a[1])[0];
    const rule = count / titled >= 0.8 && support(titled) === "measured";
    put(titled, `Title ${side === "centre" ? "centred" : `on the ${side}`} in ${count}/${titled} annotated references${rule ? " (a rule)" : " (a tendency, not a rule)"}.`);
  }
  const ov = th.title_fig_overlap;
  if (ov.distribution.n) put(ov.distribution.n, `Title over the figure: median ${pct(ov.distribution.median)} of the title width, p75 ${pct(ov.distribution.p75)} (${ov.distribution.n} references).`);
  if (th.margin_x.limit !== null) put(th.margin_x.distribution.n, `Text keeps at least ${pct(th.margin_x.limit)} of the width from the side edges (p25 of ${th.margin_x.distribution.n}).`);
  const g = th.ground_C.distribution, hs = th.hue_spread.distribution, ac = th.accent_share.distribution;
  put(g.n, `Ground: largest colour cluster chroma median ${g.median} (OKLab; below 0.04 reads neutral), lightness median ${th.ground_L.distribution.median}; ${n} references.`);
  put(hs.n, `Colour: hue spread median ${hs.median} deg (p75 ${hs.p75}); strong colour (C > 0.12) median ${pct(ac.median)}, p75 ${pct(ac.p75)}.`);
  const sym = th.lr_symmetry.distribution, q = th.quiet_share.distribution;
  if (q.n) put(Math.min(sym.n, q.n), `Composition: mirror similarity median ${sym.median}, whitespace cells median ${pct(q.median)}; most common archetype ${arch[0] ? `"${arch[0].key}" (${arch[0].n}/${n})` : "none"}.`);
  return { rules, tendencies };
}

function draftStyle({ id, board, measured, th, palette, arch, fonts, categories, accessed, grammar }) {
  const roles = {};
  for (const [role, info] of Object.entries(fonts)) {
    const base = DEFAULT_STACK[info.query.style] || DEFAULT_STACK.gothic;
    const candidates = info.catalog.status === "queried" ? info.catalog.candidates.map((c) => c.family) : [];
    roles[role] = {
      stack: candidates.length ? candidates.slice(0, 3) : base.stack, generic: base.generic, weight: info.query.weight || 400,
      use: `${role === "title" ? "titles (the largest annotated text)" : "other annotated text"}; measured ${info.query.style || "unclassified"}, stem/bar ${info.measured.contrast.median ?? "n/a"} over ${info.measured.measurable} crops`,
      measured: { style: info.query.style, contrast: info.query.contrast, weight: info.query.weight, support: info.support },
      stackSource: candidates.length ? "open-font catalog candidates" : `open default for ${info.query.style || "an unclassified role"}; replace after: ${info.command}`,
    };
  }
  if (!Object.keys(roles).length) {
    roles.title = { stack: DEFAULT_STACK.gothic.stack, generic: "sans-serif", weight: 700, use: "placeholder: no annotated text, so no type was measured", measured: { style: null, support: "gap" }, stackSource: "placeholder" };
    roles.text = { stack: DEFAULT_STACK.gothic.stack, generic: "sans-serif", weight: 400, use: "placeholder: no annotated text", measured: { style: null, support: "gap" }, stackSource: "placeholder" };
  }
  const paletteRoles = Object.fromEntries(Object.entries(palette.roles).map(([role, r]) => [role, { value: r.value, use: r.use }]));
  const style = {
    schema: bank.STYLE_SCHEMA, id, draft: true,
    title: `Draft distilled from ${path.basename(board)} (${measured.length} references)`,
    summary: `Measured draft: thresholds are the reference distribution (median and quartiles), not judgement. Review the report before installing it under styles/${id}/.`,
    provenance: {
      board: path.basename(board), references: measured.length, categories, accessed,
      method: "template distill: OKLab palette, hue spread, accent and neutral shares, whitespace, symmetry and texture from pixels (art-study features, no model); title, figure and margins from the board's annotations; stroke contrast of annotated text.",
      ids: measured.map((m) => m.id),
    },
    palette: paletteRoles,
    fonts: { roles, faces: [], licence: "Open defaults (SIL OFL 1.1) until the catalog candidates are reviewed.", bundled: false, note: "Measured type roles; the stacks are open defaults or catalog candidates, not the references' fonts." },
    layout: { grammar: grammar.rules, archetypes: arch.slice(0, 6).map((a) => ({ key: a.key, n: a.n, nearest: a.nearest[0] || null, ...(a.skeleton ? { skeleton: a.skeleton } : {}) })) },
    materials: { procedural: [], collage: [], sources: "Not measured: materials (collage, paper, screentone pieces) are listed by hand.", budget: { textureHfMax: th.spec_hf.limit } },
    motion: null,
    motionNote: "Stills carry no motion: cut rhythm is not measured from a reference board.",
    checks: {
      static: ["text-overflow", "text-length", "type-size", "contrast", "figure-zone", "safe-zone", "accent-budget", "align-line"],
      browser: ["text-overlap", "off-canvas", "collage-cover", "contrast", "glyph-coverage"],
      browserOnRender: false,
      measured: Object.fromEntries(Object.entries(th).map(([k, t]) => [k, { rule: t.rule, kind: t.kind, limit: t.limit, basis: t.basis, support: t.support, median: t.distribution.median ?? null, p25: t.distribution.p25 ?? null, p75: t.distribution.p75 ?? null }])),
    },
  };
  bank.validateStyle(style, id);
  return style;
}

// ---- comparison with a hand-made pack ----------------------------------------------------------

function chroma(hex) { const lab = measure.hexToOklab(hex); return lab ? Math.hypot(lab[1], lab[2]) : null; }
function lightness(hex) { const lab = measure.hexToOklab(hex); return lab ? lab[0] : null; }
function deltaE(a, b) { const p = measure.hexToOklab(a), q = measure.hexToOklab(b); return p && q ? Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) : null; }
const median = (values) => distribution(values).median ?? null;

function magnitude(hand, draft) {
  if (hand === null || draft === null || hand === undefined || draft === undefined) return { ratio: null, same: null };
  if (Math.abs(hand) < 0.01 && Math.abs(draft) < 0.01) return { ratio: null, same: true };
  const ratio = hand === 0 ? Infinity : draft / hand;
  return { ratio: measure.round(ratio, 2), same: ratio >= 1 / 3 && ratio <= 3 };
}

const REASONS = {
  "accent-budget": "The hand value is each template's accent_max_share default, a budget for the accent role's paint only; the draft counts every strongly coloured pixel of the references, including the figure's own colours.",
  ground: "The hand value is the chroma of the templates' ground colour; the draft is the reference median of the largest colour cluster.",
  ground_L: "Light versus dark ground: the hand packs choose one ground per template; the draft median mixes the board's light and dark references.",
  margin: "The hand value is the templates' default side margin; the draft is the p25 of the annotated text's distance to the edge (title boxes estimated on thumbnails, about +-5% of the frame).",
  "figure-zone": "The hand rule allows 30% of a title over the figure zone; the draft p75 is the overlap the annotated references actually show.",
  title_cy: "Template default title centre against the annotated median.",
  fig_cx: "Template default figure centre against the annotated median.",
  palette: "Each hand palette colour against the nearest pooled draft colour (OKLab distance; 0.05 is close, 0.15 is a different colour).",
  hue_spread: "No check reads a hue spread yet: the hand number, when there is one, is a statement in the pack's provenance; the draft is the reference p75.",
};

function compareWithPack(styleId, draft, th) {
  const style = bank.loadStyle(styleId);
  const manifests = bank.templateIds().map((id) => bank.loadManifest(id)).filter((m) => m.style === styleId);
  const param = (name) => median(manifests.map((m) => m.params?.[name]?.default).filter((v) => typeof v === "number"));
  const bgs = manifests.map((m) => m.palette?.bg?.value || m.palette?.paper?.value || m.palette?.black?.value).filter(Boolean);
  const rows = [];
  const add = (rule, label, hand, handFrom, draftValue, draftFrom, reason) => rows.push({ rule, label, hand: hand === null ? null : measure.round(hand, 4), handFrom, draft: draftValue === null || draftValue === undefined ? null : measure.round(draftValue, 4), draftFrom, ...magnitude(hand, draftValue), reason });
  const accentBudget = median(manifests.map((m) => m.params?.accent_max_share?.default ?? m.accent?.maxShare).filter((v) => typeof v === "number"));
  add("accent-budget", "accent share max", accentBudget, "median accent budget (accent_max_share or accent.maxShare) of the pack's templates", th.accent_share.limit, th.accent_share.basis, REASONS["accent-budget"]);
  add("palette", "ground chroma", median(bgs.map(chroma)), "median OKLab chroma of the templates' ground colour", th.ground_C.distribution.median, `median of ${th.ground_C.distribution.n}`, REASONS.ground);
  add("palette", "ground lightness", median(bgs.map(lightness)), "median OKLab lightness of the templates' ground colour", th.ground_L.distribution.median, `median of ${th.ground_L.distribution.n}`, REASONS.ground_L);
  add("safe-zone", "side margin min", param("margin_x"), "median margin_x default", th.margin_x.limit, th.margin_x.basis, REASONS.margin);
  const zones = manifests.length ? 0.3 : null;
  add("figure-zone", "title over figure max", zones, "figure-zone maxOverlap of the pack's zones", th.title_fig_overlap.limit, th.title_fig_overlap.basis, REASONS["figure-zone"]);
  add("report", "title centre y", param("title_cy"), "median title_cy default", th.title_cy.distribution.median ?? null, `median of ${th.title_cy.distribution.n}`, REASONS.title_cy);
  add("report", "figure centre x", param("fig_cx"), "median fig_cx default", th.fig_cx.distribution.median ?? null, `median of ${th.fig_cx.distribution.n}`, REASONS.fig_cx);
  // Numbers a pack states in its provenance text (the shinbo pack measured its own final round).
  const stated = (pattern) => { for (const line of style.provenance?.measured || []) { const m = pattern.exec(line); if (m) return Number(m[1]); } return null; };
  const hue = stated(/hue spread[^.;]*?under (\d+(?:\.\d+)?) degrees/i);
  add("palette", "hue spread max", hue, hue === null ? "not a number in the pack" : "stated in the pack's provenance (measured on its final round)", th.hue_spread.limit, th.hue_spread.basis, REASONS.hue_spread);
  const main = stated(/main colours about (\d+(?:\.\d+)?)%/i);
  if (main !== null) add("palette", "main colour share", main / 100, "stated in the pack's provenance (all palette roles together)", th.main_share.distribution.median ?? null, `median of ${th.main_share.distribution.n} (largest cluster only)`, "The pack states the share of all its main colours together; the draft measures the largest colour cluster of each reference, so it can only be lower or equal.");
  // Hand colours: the style's palette, or (a pack with per-template palettes) each distinct
  // ground, ink and accent colour of its templates.
  let handPalette = style.palette || null;
  if (!handPalette) {
    handPalette = {};
    const seenHex = new Set();
    for (const m of manifests) for (const role of ["bg", "ink", ...(m.accent?.roles || ["accent"])]) {
      const value = m.palette?.[role]?.value;
      if (value && !seenHex.has(value.toUpperCase())) { seenHex.add(value.toUpperCase()); handPalette[`${m.id}.${role}`] = { value }; }
    }
  }
  const draftHexes = Object.values(draft.palette).map((r) => r.value);
  const colours = Object.entries(handPalette).map(([role, r]) => {
    const nearest = draftHexes.map((hex) => ({ hex, d: deltaE(r.value, hex) })).sort((a, b) => a.d - b.d)[0];
    return { role, hand: r.value, nearestDraft: nearest?.hex || null, distance: nearest ? measure.round(nearest.d, 3) : null, close: nearest ? nearest.d <= 0.08 : null };
  });
  const strongGround = (th.ground_C.distribution.max ?? 0) >= measure.CHROMA_ACCENT;
  const accentRow = rows.find((r) => r.rule === "accent-budget");
  if (accentRow && strongGround) accentRow.reason += " Some references have a strongly coloured ground (largest cluster chroma above 0.12, e.g. red title cards): their whole frame counts as strong colour, so the draft's p75 is a main-colour share there, not an accent budget.";
  const handOnly = [];
  if (style.materials?.budget) handOnly.push(`materials.budget (${Object.keys(style.materials.budget).join(", ")}): effect counts are not measurable from stills`);
  if (style.motion) handOnly.push("motion grammar: stills carry no cut rhythm");
  if ((style.layout?.grammar || []).length) handOnly.push(`${style.layout.grammar.length} grammar sentences written by hand; the draft writes its own from the data (compare them in the report)`);
  return { style: styleId, templates: manifests.length, rows, palette: colours, handOnly, reasons: REASONS };
}

// ---- report ------------------------------------------------------------------------------------

function fmt(v) { return v === null || v === undefined ? "–" : Array.isArray(v) ? v.map(fmt).join("–") : typeof v === "number" ? String(Math.round(v * 1000) / 1000) : String(v); }

function reportMarkdown(result) {
  const { draft, thresholds: th, archetypes: arch, fonts, comparison, ablation, board } = result;
  const L = [];
  L.push(`# Reference distillation: ${draft.id} (draft)`, "");
  L.push(`Board ${board.file}: ${board.measured} references measured${board.skipped.length ? `, ${board.skipped.length} skipped` : ""}, ${board.annotated} annotated. Images were read locally and are not copied; this report carries ids, hashes and numbers only.`, "");
  L.push("Thresholds are the reference distribution (median and quartiles), not taste. A passing render is technical conformance, not visual acceptance.", "");
  L.push("## Supported by data", "", "| Feature | Rule | Limit | Median | p25-p75 | n | Support |", "| --- | --- | --- | --- | --- | --- | --- |");
  for (const [k, t] of Object.entries(th)) if (t.support === "measured") L.push(`| ${k} | ${t.rule} | ${fmt(t.limit)} | ${fmt(t.distribution.median)} | ${fmt(t.distribution.p25)}-${fmt(t.distribution.p75)} | ${t.distribution.n} | ${t.support} |`);
  const thin = Object.entries(th).filter(([, t]) => t.support === "thin");
  if (thin.length || (result.tendencies || []).length) {
    L.push("", "## Tendencies (thin data)", "", `Fewer than ${MIN_SUPPORT} references: a direction to check by eye, not a rule. Kept out of style.json's grammar.`, "");
    for (const [k, t] of thin) L.push(`- ${k} (${t.rule}): limit ${fmt(t.limit)}, median ${fmt(t.distribution.median)}, ${t.distribution.n} references; ${t.what}.`);
    for (const line of result.tendencies || []) L.push(`- ${line}`);
  }
  L.push("", "## Layout archetypes", "", "| Archetype | n | Nearest template (distance) | Skeleton |", "| --- | --- | --- | --- |");
  for (const a of arch.slice(0, 8)) L.push(`| ${a.key} | ${a.n} | ${a.nearest[0] ? `${a.nearest[0].id} (${a.nearest[0].distance})` : "–"} | ${a.skeleton ? "new skeleton" : "–"} |`);
  L.push("", "## Font roles", "");
  if (!Object.keys(fonts).length) L.push("- No annotated text: type roles are a gap (annotate title and text boxes to measure them).");
  for (const [role, f] of Object.entries(fonts)) L.push(`- ${role}: ${f.query.style || "unclassified"} (votes ${JSON.stringify(f.measured.votes)}), stem/bar median ${fmt(f.measured.contrast.median)}, weight >= ${f.query.weight || "?"}, ${f.measured.measurable}/${f.measured.crops} crops measurable. Catalog: ${f.catalog.status}${f.catalog.candidates ? ` (${f.catalog.candidates.map((c) => c.family).join(", ")})` : ""}${f.catalog.status === "unavailable" ? ` (${f.catalog.note}; fix: ${f.catalog.fix})` : ""}. Next: \`${f.command}\`.`);
  L.push("", "## Gaps: needs human judgement", "");
  const gaps = Object.entries(th).filter(([, t]) => t.support === "gap").map(([k, t]) => `- ${k} (${t.rule}): ${t.basis}; ${t.what}.`);
  gaps.push("- Shared alignment lines, reading order, glyph and lettering quality, illustration quality and subject fit: no feature here measures them.");
  gaps.push("- Materials (collage pieces, paper, screentone shapes) and motion rhythm: not measurable from a board of stills.");
  gaps.push("- Brush (kai), rounded and display faces: stroke contrast separates mincho from gothic only.");
  gaps.push("- Typicality is not quality: a render far from the median may be the new thing the brief wants.");
  L.push(...gaps);
  if (comparison) {
    L.push("", `## Against the hand-made pack \`${comparison.style}\``, "", "| Check | Hand | Draft | Ratio | Same magnitude | Why they differ |", "| --- | --- | --- | --- | --- | --- |");
    for (const r of comparison.rows) L.push(`| ${r.label} | ${fmt(r.hand)} | ${fmt(r.draft)} | ${fmt(r.ratio)} | ${r.same === null ? "–" : r.same ? "yes" : "no"} | ${r.reason} |`);
    L.push("", "| Hand colour | Nearest draft colour | OKLab distance |", "| --- | --- | --- |");
    for (const c of comparison.palette) L.push(`| ${c.role} ${c.hand} | ${c.nearestDraft} | ${fmt(c.distance)}${c.close ? " (close)" : ""} |`);
    if (comparison.handOnly.length) L.push("", ...comparison.handOnly.map((h) => `- Hand only: ${h}`));
  }
  if (ablation) {
    L.push("", "## Ablation", "");
    if (ablation.status !== "measured") L.push(`- Not run: ${ablation.reason}`);
    else {
      L.push(`Distance = mean |sample median - reference median| / reference IQR over ${ablation.features.join(", ")}; ${ablation.samples} renders per variant.`, "", "| Variant | Rule removed | Distance | Change | On its axis |", "| --- | --- | --- | --- | --- |");
      for (const v of ablation.variants) L.push(`| ${v.variant} | ${v.rule || "–"} | ${fmt(v.distance)} | ${fmt(v.delta)} | ${v.axis ? `${v.axis.feature} ${fmt(v.axis.delta)}` : "–"} |`);
      if (ablation.baseline) L.push(`| blank page (draft ground only) | – | ${fmt(ablation.baseline.distance)} | ${fmt(ablation.baseline.distance - ablation.variants[0].distance)} | – |`);
      L.push("", "Read the change, not the distance: placeholders (hatched figure) keep every render far from real art. The blank-page row is the floor to beat: a template render that is not clearly closer than a flat page of the ground colour carries little signal on these colour axes, because templates paint few pixels besides the ground; only the paired change on a rule's own axis is evidence.");
    }
  }
  return `${L.join("\n")}\n`;
}

// ---- ablation helpers (rendering is done by the caller, which owns the browser) ----------------

const ABLATION_FEATURES = ["ground_L", "ground_C", "hue_spread", "accent_share", "neutral_share", "main_share", "quiet_share", "lr_symmetry", "spec_hf"];

function lab(hex) { return measure.hexToOklab(hex); }
function withLab([L, a, b]) { return measure.oklabToHex([Math.max(0, Math.min(1, L)), a, b]); }

/**
 * Template palette mapped onto the draft palette: the ground and its ink, the accent roles, other
 * chromatic roles take the draft accent's hue at their own lightness and chroma, other neutrals
 * keep their lightness offset from the ground (mirrored when the ground flips light/dark).
 * Options: ground (a ground colour instead of the draft's), hueSteps (every painted chromatic role
 * after the first moves k x 150 deg; with one painted chromatic role, a painted secondary neutral,
 * else the ink, is tinted instead), used (the roles the render paints; all when absent).
 */
function mapPalette(manifest, draftPalette, { ground = null, hueSteps = false, used = null } = {}) {
  const out = {};
  const entries = Object.entries(manifest.palette).filter(([, r]) => r?.value && lab(r.value));
  const tBg = manifest.palette.bg?.value || entries[0]?.[1].value;
  const tBgL = lab(tBg)?.[0] ?? 0.5;
  const dBg = ground || draftPalette.bg?.value || tBg;
  const dBgL = lab(dBg)[0];
  const flip = (tBgL > 0.5) !== (dBgL > 0.5);
  const accentRoles = new Set(manifest.accent?.roles || ["accent"]);
  const dAccent = lab(draftPalette.accent?.value || draftPalette.bg?.value || tBg);
  const dHue = Math.atan2(dAccent[2], dAccent[1]);
  const chromatic = [];
  for (const [role, r] of entries) {
    const [L, a, b] = lab(r.value);
    const C = Math.hypot(a, b);
    if (r.value === tBg) out[role] = dBg;
    else if (C >= 0.06 || accentRoles.has(role)) { chromatic.push(role); out[role] = accentRoles.has(role) && draftPalette.accent ? draftPalette.accent.value : withLab([L, Math.max(C, 0.06) * Math.cos(dHue), Math.max(C, 0.06) * Math.sin(dHue)]); }
    else {
      const offset = L - tBgL;
      out[role] = Math.abs(offset) > 0.4 && draftPalette.ink ? draftPalette.ink.value : withLab([dBgL + (flip ? -offset : offset), 0, 0]);
    }
  }
  if (hueSteps) {
    const painted = (role) => !used || used.has(role);
    const moved = chromatic.filter(painted).slice(1);
    if (!moved.length) {
      const roles = entries.map(([role]) => role).filter((role) => out[role] && out[role] !== dBg && painted(role) && !chromatic.includes(role));
      const secondary = roles.find((role) => out[role] !== draftPalette.ink?.value) || roles[0];
      if (secondary) moved.push(secondary);
    }
    moved.forEach((role, i) => {
      const [L, a, b] = lab(out[role]);
      const C = Math.max(Math.hypot(a, b), 0.12), h = dHue + ((i + 1) * 150 * Math.PI) / 180;
      out[role] = withLab([L, C * Math.cos(h), C * Math.sin(h)]);
    });
  }
  return out;
}

/** Variants: the full draft, and the draft with one rule removed. */
function ablationVariants(draft) {
  const p = draft.palette;
  const accentLab = lab(p.accent?.value || "#808080");
  const groundLab = lab(p.bg?.value || "#808080");
  const hue = Math.atan2(accentLab[2], accentLab[1]) + Math.PI;
  return [
    { variant: "draft", rule: null, palette: {} },
    { variant: "no-palette", rule: "measured palette (template defaults instead)", palette: null, axis: "ground_C" },
    { variant: "no-neutral-ground", rule: "neutral ground (ground tinted to chroma 0.12)", palette: { ground: withLab([groundLab[0], 0.12 * Math.cos(hue), 0.12 * Math.sin(hue)]) }, axis: "ground_C" },
    { variant: "no-single-hue", rule: "one theme hue (a second hue 150 deg away)", palette: { hueSteps: true }, axis: "hue_spread" },
  ];
}

/** Features of a flat page of one colour (the ablation's floor), measured like a reference. */
function blankFeatures(hex, [w, h] = [480, 270]) {
  const n = parseInt(hex.slice(1), 16);
  const rgb = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i += 1) { rgb[i * 3] = (n >> 16) & 255; rgb[i * 3 + 1] = (n >> 8) & 255; rgb[i * 3 + 2] = n & 255; }
  return measure.measurePixels({ width: w, height: h, source: [w, h], rgb }).features;
}

function distanceTo(featuresList, th) {
  const per = {};
  for (const k of ABLATION_FEATURES) {
    const d = th[k]?.distribution;
    if (!d?.n) continue;
    const sample = distribution(featuresList.map((f) => f[k]));
    const iqr = Math.max(d.p75 - d.p25, 0.02 * Math.max(1, Math.abs(d.median)), 1e-3);
    per[k] = measure.round(Math.abs(sample.median - d.median) / iqr, 3);
  }
  const values = Object.values(per);
  return { distance: values.length ? measure.round(values.reduce((a, b) => a + b, 0) / values.length, 3) : null, per };
}

// ---- entry -------------------------------------------------------------------------------------

function distill({ board, images, annotations, categories, id, compare, root = null, sample = "永和九年岁在癸丑 ABC abc 0123", tools = {}, accessed = new Date().toISOString().slice(0, 10), onProgress = null }) {
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(id)) throw new DistillError(`style id must be lowercase letters, digits and dashes (2-41), got ${JSON.stringify(id)}`, "OPTION_VALUE_INVALID");
  if (compare) bank.loadStyle(compare);
  const read = readBoard(board, { images, annotations, categories, root });
  const measured = [], failed = [];
  read.entries.forEach((entry, i) => {
    try { measured.push(measureEntry(entry, tools)); }
    catch (error) {
      if (error.code === "TOOL_MISSING") throw new DistillError(error.message, "TOOL_MISSING");
      failed.push({ id: entry.id, reason: error.message, fix: "convert it to a still png or jpg" });
    }
    if (onProgress) onProgress(i + 1, read.entries.length);
  });
  if (measured.length < 2) throw new DistillError(`only ${measured.length} reference could be measured; a distribution needs at least 2 (8 for a measured threshold)`, "OPTION_VALUE_INVALID");
  const th = thresholds(measured);
  const templates = bank.templateIds().map(templateFacts).filter(Boolean);
  const arch = archetypes(measured, templates);
  const palette = pooledPalette(measured);
  const fonts = fontRoles(measured, sample);
  const grammar = grammarLines(measured, th, arch);
  const style = draftStyle({ id, board, measured, th, palette, arch, fonts, grammar, categories: Object.keys(shares(measured.map((m) => ({ features: { c: m.category || "uncategorised" } })), "c")), accessed });
  const comparison = compare ? compareWithPack(compare, style, th) : null;
  return {
    schema: DRAFT_SCHEMA, id, accessed,
    board: { file: path.basename(board), measured: measured.length, annotated: measured.filter((m) => m.features.title_cx !== undefined || m.type.length).length, skipped: [...read.skipped, ...failed] },
    draft: style, thresholds: th, palette, archetypes: arch, fonts, comparison, tendencies: grammar.tendencies,
    references: measured.map((m) => ({ id: m.id, category: m.category, source: m.source, sha256: m.sha256, size: m.size, aspect: m.aspect, letterbox: m.letterbox, features: m.features, ...(m.notes.length ? { notes: m.notes } : {}), palette: m.palette, type: m.type.map(({ role, measurable, contrast, weight, style: s, reason, why }) => ({ role, measurable, contrast, weight, style: s ?? null, reason: reason || why })) })),
  };
}

module.exports = {
  ABLATION_FEATURES, DRAFT_SCHEMA, DistillError, MIN_SUPPORT, THRESHOLDS,
  ablationVariants, archetypes, blankFeatures, relPath, compareWithPack, distanceTo, distill, distribution, mapPalette, parseCsv, readAnnotations, readBoard, reportMarkdown, templateFacts, thresholds, useFontCatalog,
};
