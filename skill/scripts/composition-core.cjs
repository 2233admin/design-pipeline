"use strict";

// Static composition gate. Measures a rendered frame (any PNG: browser screenshot, film frame,
// Blender render) and, when available, the page's text elements, and reports composition
// failures with a concrete fix: blank or washed-out frames, unreadable text, off-balance weight,
// dead bands of empty canvas, competing focal points, clutter, palette sprawl, edge crowding,
// near-miss alignment and flat type hierarchy. Errors fail the gate; warnings are review prompts
// that intentional compositions can allow. It never grants creative acceptance.

const { assertEnum, fail } = require("./contract-utils.cjs");

const SCHEMA = "design-pipeline.composition-check.v1";
const SCOPE = "composition";
const PROFILES = {
  ui: { maxComponents: 90, dead: true, edge: true },
  poster: { maxComponents: 45, dead: true, edge: true },
  frame: { maxComponents: 45, dead: true, edge: false },
};
const INK_DISTANCE = 28;
const GRID_WIDTH = 240;

const FIX = {
  "blank-frame": "The frame has almost nothing on it. Check that the subject renders at this time (seek, opacity, data-start) or pick a frame inside the action.",
  "low-contrast": "The whole frame sits in a narrow luminance range. Deepen the darks or lift the lights so the subject separates from the background (aim for a 3:1 spread or more).",
  "weak-separation": "Main shapes are close in value to the background. Raise their lightness or saturation, add a light or rim edge, or darken the background so the subject reads first.",
  "off-balance": "Visual weight sits far from center. Move or scale the subject toward the center, or add a counterweight on the empty side; allow the code if the asymmetry is the idea.",
  "dead-band": "A third of the canvas is empty while the rest is busy. Enlarge the subject, reframe (camera push or crop), or place supporting content there; allow the code for deliberate negative space.",
  "no-focal-point": "Two regions compete with equal weight. Make one clearly dominant with size, contrast or saturation, and quiet the other.",
  "clutter": "Too many separate shapes compete. Group related items, remove decoration, or increase spacing so the frame reads as a few masses.",
  "palette-sprawl": "Too many saturated hues. Keep one accent hue plus neutrals; move other colors to tints of the accent.",
  "edge-crowding": "Content presses against the canvas edge. Add a margin of at least 4% of the short side, or make the bleed clearly intentional.",
  "text-contrast": "Text fails WCAG contrast against its background. Darken or lighten the text or its background until it reaches 4.5:1 (3:1 for large text).",
  "text-off-canvas": "Text extends outside the viewport. Move it inward or reduce its size.",
  "alignment-near-miss": "Edges almost align but miss by a few pixels. Snap these elements to the same left, center or right edge.",
  "flat-hierarchy": "Text sizes are too similar to show order. Make the headline at least 1.5x the body size, or change weight/color to separate levels.",
  "type-scale-sprawl": "Too many distinct text sizes. Reduce to a scale of 4-5 sizes.",
};

function luminance(r, g, b) {
  const channel = (value) => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrastRatio(a, b) {
  const [hi, lo] = [luminance(...a), luminance(...b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Box-average downsample to a fixed-width grid of RGB cells, compositing alpha over black.
function toGrid(image) {
  const scale = Math.max(1, image.width / GRID_WIDTH);
  const width = Math.max(1, Math.round(image.width / scale));
  const height = Math.max(1, Math.round(image.height / scale));
  const cells = new Float64Array(width * height * 3);
  const counts = new Float64Array(width * height);
  for (let y = 0; y < image.height; y += 1) {
    const gy = Math.min(height - 1, Math.floor(y / scale));
    for (let x = 0; x < image.width; x += 1) {
      const gx = Math.min(width - 1, Math.floor(x / scale));
      const i = (y * image.width + x) * 4;
      const a = image.data[i + 3] / 255;
      const cell = gy * width + gx;
      cells[cell * 3] += image.data[i] * a;
      cells[cell * 3 + 1] += image.data[i + 1] * a;
      cells[cell * 3 + 2] += image.data[i + 2] * a;
      counts[cell] += 1;
    }
  }
  for (let cell = 0; cell < counts.length; cell += 1) for (let c = 0; c < 3; c += 1) cells[cell * 3 + c] /= counts[cell] || 1;
  return { width, height, cells };
}

function background(grid) {
  const buckets = new Map();
  const { width, height, cells } = grid;
  const push = (x, y) => {
    const i = (y * width + x) * 3;
    const key = `${cells[i] >> 4},${cells[i + 1] >> 4},${cells[i + 2] >> 4}`;
    const entry = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    entry.n += 1; entry.r += cells[i]; entry.g += cells[i + 1]; entry.b += cells[i + 2];
    buckets.set(key, entry);
  };
  for (let x = 0; x < width; x += 1) { push(x, 0); push(x, height - 1); }
  for (let y = 1; y < height - 1; y += 1) { push(0, y); push(width - 1, y); }
  const best = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
  const border = 2 * (width + height) - 4;
  return { color: [best.r / best.n, best.g / best.n, best.b / best.n], borderShare: best.n / Math.max(1, border) };
}

function inkMean(cells, mask) {
  const sum = [0, 0, 0];
  let n = 0;
  for (let cell = 0; cell < mask.length; cell += 1) if (mask[cell]) { n += 1; for (let c = 0; c < 3; c += 1) sum[c] += cells[cell * 3 + c]; }
  return sum.map((value) => value / Math.max(1, n));
}

function hsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max / 255 };
}

function components(mask, width, height) {
  const labels = new Int32Array(width * height).fill(-1);
  const areas = [];
  const stack = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || labels[start] !== -1) continue;
    const id = areas.length;
    let area = 0;
    let sx = 0;
    let sy = 0;
    labels[start] = id;
    stack.push(start);
    while (stack.length) {
      const cell = stack.pop();
      area += 1;
      const x = cell % width;
      const y = (cell - x) / width;
      sx += x; sy += y;
      for (const next of [x > 0 ? cell - 1 : -1, x < width - 1 ? cell + 1 : -1, y > 0 ? cell - width : -1, y < height - 1 ? cell + width : -1]) {
        if (next >= 0 && mask[next] && labels[next] === -1) { labels[next] = id; stack.push(next); }
      }
    }
    areas.push({ area, cx: sx / area / width, cy: sy / area / height });
  }
  return areas.sort((a, b) => b.area - a.area);
}

function measure(image) {
  const grid = toGrid(image);
  const { width, height, cells } = grid;
  const bg = background(grid);
  const total = width * height;
  const mask = new Uint8Array(total);
  const lum = new Float64Array(total);
  let ink = 0;
  let wx = 0;
  let wy = 0;
  let weight = 0;
  const hueBins = new Float64Array(24);
  let saturated = 0;
  for (let cell = 0; cell < total; cell += 1) {
    const r = cells[cell * 3];
    const g = cells[cell * 3 + 1];
    const b = cells[cell * 3 + 2];
    lum[cell] = luminance(r, g, b);
    const d = Math.hypot(r - bg.color[0], g - bg.color[1], b - bg.color[2]);
    if (d > INK_DISTANCE) {
      mask[cell] = 1;
      ink += 1;
      const x = cell % width;
      const y = (cell - x) / width;
      wx += (x + 0.5) * d; wy += (y + 0.5) * d; weight += d;
      const color = hsv(r, g, b);
      if (color.s > 0.35 && color.v > 0.2) { hueBins[Math.floor(color.h / 15) % 24] += 1; saturated += 1; }
    }
  }
  // Percentiles on full-resolution pixels: thin text vanishes in the downsampled grid.
  const histogram = new Uint32Array(1024);
  const pixels = image.width * image.height;
  for (let i = 0; i < pixels; i += 1) {
    const a = image.data[i * 4 + 3] / 255;
    histogram[Math.min(1023, Math.floor(luminance(image.data[i * 4] * a, image.data[i * 4 + 1] * a, image.data[i * 4 + 2] * a) * 1023))] += 1;
  }
  const pick = (q) => {
    const target = q * pixels;
    let seen = 0;
    for (let bin = 0; bin < 1024; bin += 1) { seen += histogram[bin]; if (seen >= target) return bin / 1023; }
    return 1;
  };
  const band = (x0, x1, y0, y1) => {
    let n = 0;
    let hit = 0;
    for (let y = Math.floor(y0 * height); y < Math.ceil(y1 * height); y += 1) for (let x = Math.floor(x0 * width); x < Math.ceil(x1 * width); x += 1) { n += 1; hit += mask[y * width + x]; }
    return n ? hit / n : 0;
  };
  const margin = Math.max(1, Math.round(0.02 * Math.min(width, height)));
  let ring = 0;
  let ringInk = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (x < margin || y < margin || x >= width - margin || y >= height - margin) { ring += 1; ringInk += mask[y * width + x]; }
  }
  // A significant hue holds at least 4% of saturated ink; adjacent significant bins form one cluster.
  const significant = [...hueBins].map((count) => saturated > 0 && count / saturated >= 0.04);
  let hueClusters = 0;
  for (let i = 0; i < 24; i += 1) if (significant[i] && !significant[(i + 23) % 24]) hueClusters += 1;
  if (significant.every(Boolean)) hueClusters = 1;
  const blobs = components(mask, width, height).filter((blob) => blob.area >= Math.max(2, total * 0.0004));
  return {
    grid: { width, height },
    background: bg.color.map((value) => Math.round(value)),
    backgroundBorderShare: Number(bg.borderShare.toFixed(3)),
    inkShare: Number((ink / total).toFixed(4)),
    fullBleed: bg.borderShare < 0.35 || ink / total > 0.85,
    weightCenter: weight ? [Number((wx / weight / width).toFixed(3)), Number((wy / weight / height).toFixed(3))] : null,
    luminanceSpread: Number(((pick(0.999) + 0.05) / (pick(0.001) + 0.05)).toFixed(2)),
    subjectSeparation: ink ? Number(contrastRatio(bg.color, inkMean(cells, mask)).toFixed(2)) : null,
    rows: [band(0, 1, 0, 1 / 3), band(0, 1, 1 / 3, 2 / 3), band(0, 1, 2 / 3, 1)].map((v) => Number(v.toFixed(3))),
    columns: [band(0, 1 / 3, 0, 1), band(1 / 3, 2 / 3, 0, 1), band(2 / 3, 1, 0, 1)].map((v) => Number(v.toFixed(3))),
    edgeInk: Number((ring ? ringInk / ring : 0).toFixed(3)),
    hueClusters: saturated / Math.max(1, ink) > 0.05 ? hueClusters : 0,
    components: blobs.length,
    largestShares: blobs.slice(0, 2).map((blob) => Number((blob.area / Math.max(1, ink)).toFixed(3))),
  };
}

function parseColor(value) {
  if (Array.isArray(value) && value.length >= 3) return value.slice(0, 3).map(Number);
  fail(SCOPE, `color ${JSON.stringify(value)} must be an [r, g, b] array`);
}

function checkElements(elements, add) {
  if (!elements || typeof elements !== "object") fail(SCOPE, "elements must be an object with viewport and items");
  const { viewport, items } = elements;
  if (!viewport || !(viewport.width > 0) || !(viewport.height > 0)) fail(SCOPE, "elements.viewport must have positive width and height");
  if (!Array.isArray(items)) fail(SCOPE, "elements.items must be an array");
  const texts = items.filter((item) => item.kind === "text");
  for (const item of texts) {
    const box = item.box;
    if (!box) fail(SCOPE, `element ${item.id || item.text} has no box`);
    if (box.x < -1 || box.y < -1 || box.x + box.w > viewport.width + 1 || box.y + box.h > viewport.height + 1) add("text-off-canvas", `"${String(item.text).slice(0, 40)}" at ${Math.round(box.x)},${Math.round(box.y)} leaves the ${viewport.width}x${viewport.height} viewport`, "error", item.id);
    if (item.background && item.color) {
      const ratio = contrastRatio(parseColor(item.color), parseColor(item.background));
      const large = item.fontSize >= 24 || (item.fontSize >= 18.66 && item.fontWeight >= 700);
      const need = large ? 3 : 4.5;
      if (ratio < need) add("text-contrast", `"${String(item.text).slice(0, 40)}" is ${ratio.toFixed(2)}:1, needs ${need}:1`, "error", item.id);
    }
  }
  const blocks = items.filter((item) => item.box && item.box.w > 0 && item.box.h > 0);
  const nearMisses = [];
  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      const a = blocks[i].box;
      const b = blocks[j].box;
      // Text sits inside padded containers, so only like compares with like.
      if (blocks[i].kind !== blocks[j].kind) continue;
      const stacked = Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x) && Math.abs(a.y - b.y) > 2;
      if (!stacked) continue;
      for (const [edge, pa, pb] of [["left", a.x, b.x], ["right", a.x + a.w, b.x + b.w], ["center", a.x + a.w / 2, b.x + b.w / 2]]) {
        const delta = Math.abs(pa - pb);
        if (delta >= 1.5 && delta <= 6) nearMisses.push(`${blocks[i].id || blocks[i].text} / ${blocks[j].id || blocks[j].text} ${edge} edges differ by ${delta.toFixed(1)}px`);
      }
    }
  }
  if (nearMisses.length) add("alignment-near-miss", `${nearMisses.length} near-miss edges: ${nearMisses.slice(0, 4).join("; ")}`, "warn");
  // Spans on one line at one size are one text run for hierarchy purposes.
  const runs = new Map();
  for (const item of texts) runs.set(`${Math.round(item.box.y / 4)}:${Math.round(item.fontSize)}`, Number(item.fontSize));
  const sizes = [...runs.values()].filter((size) => size > 0).sort((a, b) => a - b);
  if (sizes.length >= 3) {
    const median = sizes[Math.floor(sizes.length / 2)];
    if (sizes[sizes.length - 1] / median < 1.4) add("flat-hierarchy", `largest text ${sizes[sizes.length - 1]}px is only ${(sizes[sizes.length - 1] / median).toFixed(2)}x the median ${median}px`, "warn");
    const distinct = new Set(sizes.map((size) => Math.round(size)));
    if (distinct.size > 6) add("type-scale-sprawl", `${distinct.size} distinct text sizes: ${[...distinct].join(", ")}px`, "warn");
  }
  return { texts: texts.length, blocks: blocks.length, nearMisses: nearMisses.length };
}

function checkComposition(image, options = {}) {
  if (!image || !(image.width > 0) || !Buffer.isBuffer(image.data)) fail(SCOPE, "image must be a decoded RGBA image");
  const profileName = options.profile || "ui";
  assertEnum(profileName, Object.keys(PROFILES), "profile", SCOPE);
  const profile = PROFILES[profileName];
  const allow = new Set(options.allow || []);
  for (const code of allow) if (!FIX[code]) fail(SCOPE, `cannot allow unknown code ${code}; allowed codes: ${Object.keys(FIX).join(", ")}`);
  const findings = [];
  const allowed = [];
  const add = (code, message, severity, target) => {
    const finding = { code, severity, message, fix: FIX[code], ...(target ? { target } : {}) };
    if (severity === "warn" && allow.has(code)) allowed.push(finding);
    else findings.push(finding);
  };

  const m = measure(image);
  if (m.inkShare < 0.005) add("blank-frame", `only ${(m.inkShare * 100).toFixed(2)}% of the frame differs from the background`, "error");
  if (m.luminanceSpread < 3) add("low-contrast", `luminance spread is ${m.luminanceSpread}:1 between the darkest and lightest 0.1% of pixels`, "error");
  if (m.inkShare >= 0.02 && m.subjectSeparation !== null && m.subjectSeparation < 1.6) add("weak-separation", `content averages ${m.subjectSeparation}:1 against the background`, "warn");
  if (m.inkShare >= 0.02 && m.weightCenter) {
    const [cx, cy] = m.weightCenter;
    if (Math.abs(cx - 0.5) > 0.22 || Math.abs(cy - 0.5) > 0.22) add("off-balance", `visual weight center is at ${(cx * 100).toFixed(0)}% x, ${(cy * 100).toFixed(0)}% y`, "warn");
  }
  if (profile.dead && !m.fullBleed && m.inkShare >= 0.03) {
    const names = { rows: ["top", "middle", "bottom"], columns: ["left", "center", "right"] };
    for (const axis of ["rows", "columns"]) {
      const busiest = Math.max(...m[axis]);
      m[axis].forEach((share, index) => {
        if (share < 0.01 && busiest > 0.05) add("dead-band", `${names[axis][index]} third is ${(share * 100).toFixed(1)}% occupied while the busiest ${axis === "rows" ? "row" : "column"} band is ${(busiest * 100).toFixed(0)}%`, "warn");
      });
    }
  }
  if (m.components >= 2 && m.largestShares.length === 2 && m.largestShares[0] < 0.4 && m.largestShares[1] / m.largestShares[0] > 0.85) add("no-focal-point", `the two largest masses hold ${(m.largestShares[0] * 100).toFixed(0)}% and ${(m.largestShares[1] * 100).toFixed(0)}% of the content`, "warn");
  if (m.components > profile.maxComponents) add("clutter", `${m.components} separate shapes (max ${profile.maxComponents} for ${profileName})`, "warn");
  if (m.hueClusters > 4) add("palette-sprawl", `${m.hueClusters} distinct saturated hue groups`, "warn");
  if (profile.edge && !m.fullBleed && m.edgeInk > 0.3) add("edge-crowding", `${(m.edgeInk * 100).toFixed(0)}% of the outer 2% margin is covered`, "warn");
  const elements = options.elements ? checkElements(options.elements, add) : null;

  const errors = findings.filter((finding) => finding.severity === "error").length;
  return {
    schema: SCHEMA,
    profile: profileName,
    status: errors ? "failed" : "passed",
    findings,
    allowed,
    metrics: { ...m, ...(elements ? { elements } : {}) },
    creativeAcceptance: "not-assessed",
  };
}

module.exports = { SCHEMA, FIX, PROFILES, checkComposition, contrastRatio, measure };
