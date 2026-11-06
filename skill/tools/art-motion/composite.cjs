"use strict";

// Layered compositing for generated (or stand-in) characters (#311): one set of layers, every size
// a template's layer contract declares. Per size: plates cropped into the frame, sprites in their
// boxes, the character placed by foot point and height, graded toward the scene in OKLab (black and
// white point, mean and variance, chroma, hue pull to a palette role, highlight shoulder), light
// wrap, rim light, haze, contact shadow / AO / cast shadow, sticker outline, fx, the foreground
// occluder and one shared texture over every image layer. Outputs a ground image (everything behind
// the character plus its shadows: the text ground), an upper image (character, outline, fx, fg),
// the character's alpha and the flattened result, with every parameter and measurement recorded.
// Ported from the prototype compose.py; deterministic.

const R = require("./raster.cjs");
const M = require("./matte.cjs");

const MODES = Object.freeze(["sticker", "painted"]);
const LIMITS = Object.freeze({ upscale: 1.5, blackPointDL: 0.03, meanDE: 25, meanvarWashout: 0.45, haloOutputPx: 1, occluderOnSafe: 0.05 });
const MODE_KEYS = ["grade", "wrap", "rim", "shadow", "occluder", "outline", "haze"];

function integrationError(message) { const e = new Error(message); e.code = "TEMPLATE_INVALID"; return e; }

// Style pack `integration`: { mode, hueRole?, figure: {rendering, references}, modes: {sticker, painted}, texture }.
function validateIntegration(integration, { id = "style", palette = {} } = {}) {
  const where = `style ${id} integration`;
  if (!integration || typeof integration !== "object") throw integrationError(`${where} must be an object`);
  if (!MODES.includes(integration.mode)) throw integrationError(`${where}.mode must be ${MODES.join(" or ")}`);
  if (integration.hueRole !== undefined && !palette[integration.hueRole]) throw integrationError(`${where}.hueRole must be a palette role`);
  for (const [name, m] of Object.entries(integration.modes || {})) {
    if (!MODES.includes(name)) throw integrationError(`${where}.modes.${name}: modes are ${MODES.join(", ")}`);
    for (const key of Object.keys(m)) if (!MODE_KEYS.includes(key)) throw integrationError(`${where}.modes.${name}.${key} is unknown; keys: ${MODE_KEYS.join(", ")}`);
    if (m.grade) for (const k of ["bw", "meanvar", "chroma", "huePull"]) if (m.grade[k] !== undefined && !(m.grade[k] >= 0 && m.grade[k] <= 1)) throw integrationError(`${where}.modes.${name}.grade.${k} must be 0-1`);
    if (m.outline?.plate && !palette[m.outline.plate]) throw integrationError(`${where}.modes.${name}.outline.plate must be a palette role`);
  }
  if (!integration.modes?.[integration.mode]) throw integrationError(`${where}.modes must define the default mode ${integration.mode}`);
  if (integration.figure && (typeof integration.figure.rendering !== "string" || !Array.isArray(integration.figure.references))) throw integrationError(`${where}.figure needs rendering (text) and references (names)`);
  return integration;
}

// ---- layer helpers (straight colour + alpha planes at canvas size) ----------------------------
function emptyLayer(W, H) { const n = W * H; return { R: new Float32Array(n), G: new Float32Array(n), B: new Float32Array(n), A: new Float32Array(n) }; }
function over(dst, src, mask = null) {
  for (let i = 0; i < dst.A.length; i += 1) {
    const sa = src.A[i] * (mask ? mask[i] : 1);
    if (sa <= 0) continue;
    const da = dst.A[i], oa = sa + da * (1 - sa);
    dst.R[i] = (src.R[i] * sa + dst.R[i] * da * (1 - sa)) / oa;
    dst.G[i] = (src.G[i] * sa + dst.G[i] * da * (1 - sa)) / oa;
    dst.B[i] = (src.B[i] * sa + dst.B[i] * da * (1 - sa)) / oa;
    dst.A[i] = oa;
  }
  return dst;
}
const copyLayer = (l) => ({ R: Float32Array.from(l.R), G: Float32Array.from(l.G), B: Float32Array.from(l.B), A: Float32Array.from(l.A) });

// Place src (planes) cropped to [cx, cy, cw, ch] (source px) into the box [x, y, w, h] of a W x H canvas.
function place(src, crop, box, W, H) {
  const [cx, cy, cw, ch] = crop.map(Math.round), [x, y] = [Math.round(box[0]), Math.round(box[1])];
  const w = Math.max(1, Math.round(box[2])), h = Math.max(1, Math.round(box[3]));
  const x0 = Math.max(0, cx), y0 = Math.max(0, cy), x1 = Math.min(src.width, cx + cw), y1 = Math.min(src.height, cy + ch);
  const out = emptyLayer(W, H);
  if (x1 <= x0 || y1 <= y0) return out;
  const pw = x1 - x0, ph = y1 - y0;
  const pm = (c) => { const o = new Float32Array(pw * ph); for (let yy = 0; yy < ph; yy += 1) for (let xx = 0; xx < pw; xx += 1) { const s = (y0 + yy) * src.width + x0 + xx; o[yy * pw + xx] = c ? c[s] * src.A[s] : src.A[s]; } return o; };
  // the crop may extend past the source: scale the clipped part into the matching part of the box
  const sx = w / cw, sy = h / ch, dx = x + (x0 - cx) * sx, dy = y + (y0 - cy) * sy;
  const dw = Math.max(1, Math.round(pw * sx)), dh = Math.max(1, Math.round(ph * sy));
  const a = R.resizePlane(pm(null), pw, ph, dw, dh), planes = [src.R, src.G, src.B].map((c) => R.resizePlane(pm(c), pw, ph, dw, dh));
  const ox = Math.round(dx), oy = Math.round(dy);
  for (let yy = 0; yy < dh; yy += 1) {
    const Y = oy + yy; if (Y < 0 || Y >= H) continue;
    for (let xx = 0; xx < dw; xx += 1) {
      const X = ox + xx; if (X < 0 || X >= W) continue;
      const s = yy * dw + xx, d = Y * W + X, al = Math.min(1, Math.max(0, a[s]));
      out.A[d] = al;
      if (al > 1e-6) { out.R[d] = Math.min(1, Math.max(0, planes[0][s] / a[s])); out.G[d] = Math.min(1, Math.max(0, planes[1][s] / a[s])); out.B[d] = Math.min(1, Math.max(0, planes[2][s] / a[s])); }
    }
  }
  return out;
}

// ---- statistics -------------------------------------------------------------------------------
function labStats(layer, mask) {
  const L = [], A = [], B = [];
  for (let i = 0; i < mask.length; i += 1) if (mask[i]) { const o = R.srgbToOklab(layer.R[i], layer.G[i], layer.B[i]); L.push(o[0]); A.push(o[1]); B.push(o[2]); }
  if (!L.length) return null;
  const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
  const mL = mean(L), mA = mean(A), mB = mean(B), sd = Math.sqrt(mean(L.map((v) => (v - mL) ** 2)));
  const C = A.map((a, i) => Math.hypot(a, B[i]));
  return { blackL: R.percentileOf(L, 1), whiteL: R.percentileOf(L, 99), meanL: mL, stdL: sd, meanA: mA, meanB: mB, meanC: mean(C), count: L.length };
}
const r4 = (v) => Math.round(v * 10000) / 10000;
const roundStats = (s) => (s ? Object.fromEntries(Object.entries(s).map(([k, v]) => [k, k === "count" ? v : r4(v)])) : null);
const meanDE = (a, b) => Math.round(100 * Math.hypot(a.meanL - b.meanL, a.meanA - b.meanA, a.meanB - b.meanB) * 100) / 100;

// OKLab grade of the character's pixels toward the scene's statistics.
function grade(char, mask, fs, ss, g, hueHex) {
  const tb = fs.blackL + g.bw * (ss.blackL - fs.blackL), tw = fs.whiteL + g.bw * (ss.whiteL - fs.whiteL);
  const span = Math.max(fs.whiteL - fs.blackL, 1e-3);
  const n = mask.length, idx = [];
  for (let i = 0; i < n; i += 1) if (char.A[i] > 0) idx.push(i);
  const lab = idx.map((i) => R.srgbToOklab(char.R[i], char.G[i], char.B[i]));
  for (const o of lab) o[0] = ((o[0] - fs.blackL) / span) * (tw - tb) + tb;
  // mean / variance over the opaque figure pixels
  let m = 0, cnt = 0;
  idx.forEach((i, k) => { if (mask[i]) { m += lab[k][0]; cnt += 1; } });
  m /= Math.max(cnt, 1);
  let v = 0; idx.forEach((i, k) => { if (mask[i]) v += (lab[k][0] - m) ** 2; });
  const sd = Math.sqrt(v / Math.max(cnt, 1));
  const k = 1 + g.meanvar * (ss.stdL / Math.max(sd, 1e-3) - 1), mt = m + g.meanvar * (ss.meanL - m);
  for (const o of lab) o[0] = (o[0] - m) * k + mt;
  // highlight shoulder: compress L above the knee toward the ceiling instead of clipping at 1
  const hl = { knee: 0.9, ceiling: 0.985, ...(g.highlight || {}) };
  let clipped = 0;
  for (const o of lab) {
    if (o[0] > 1) clipped += 1;
    if (o[0] > hl.knee) { const room = hl.ceiling - hl.knee; o[0] = hl.knee + room * (1 - Math.exp(-(o[0] - hl.knee) / room)); }
  }
  // chroma toward the scene's mean chroma, mean a/b toward the scene's
  let ma = 0, mb = 0; idx.forEach((i, kk) => { if (mask[i]) { ma += lab[kk][1]; mb += lab[kk][2]; } });
  ma /= Math.max(cnt, 1); mb /= Math.max(cnt, 1);
  const cs = Math.min(1.2, Math.max(0.3, 1 + g.chroma * (ss.meanC / Math.max(fs.meanC, 1e-3) - 1)));
  const acc = hueHex ? R.srgbToOklab(...R.hexRgb(hueHex)) : null, ha = acc ? Math.atan2(acc[2], acc[1]) : 0;
  for (const o of lab) {
    let a = (o[1] - ma) * cs + ma * (1 - g.chroma) + ss.meanA * g.chroma;
    let b = (o[2] - mb) * cs + mb * (1 - g.chroma) + ss.meanB * g.chroma;
    if (g.huePull && acc) {
      const h = Math.atan2(b, a), C = Math.hypot(a, b);
      let dh = ha - h; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      const h2 = h + g.huePull * dh * Math.min(1, C / 0.08);
      a = C * Math.cos(h2); b = C * Math.sin(h2);
    }
    o[1] = a; o[2] = b;
  }
  idx.forEach((i, kk) => { const [r, gg, b] = R.oklabToSrgb(...lab[kk]); char.R[i] = r; char.G[i] = gg; char.B[i] = b; });
  return { highlightOverOne: clipped, highlight: hl };
}

function boxArea(b) { return Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]); }
function boxOverlap(a, b) { // a, b as [x0, y0, x1, y1]; share of a covered by b
  const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  return w > 0 && h > 0 ? (w * h) / Math.max(boxArea(a), 1e-6) : 0;
}
function coverage(box, alpha, W, H) {
  const x0 = Math.max(0, Math.round(box[0])), y0 = Math.max(0, Math.round(box[1])), x1 = Math.min(W, Math.round(box[2])), y1 = Math.min(H, Math.round(box[3]));
  let on = 0, all = 0;
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) { all += 1; if (alpha[y * W + x] > 0.5) on += 1; }
  return all ? on / all : 0;
}

// Default landmarks from the alpha: foot at the bottom centre of the opaque pixels, head at the top.
function alphaLandmarks(planes) {
  let minY = Infinity, maxY = -1, sumX = 0, cnt = 0;
  for (let y = 0; y < planes.height; y += 1) for (let x = 0; x < planes.width; x += 1) if (planes.A[y * planes.width + x] > 0.5) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  for (let y = Math.max(0, maxY - Math.round((maxY - minY) * 0.03)); y <= maxY; y += 1) for (let x = 0; x < planes.width; x += 1) if (planes.A[y * planes.width + x] > 0.5) { sumX += x; cnt += 1; }
  return { foot: [cnt ? sumX / cnt : planes.width / 2, maxY + 1], headTop: minY };
}

// ---- one size ------------------------------------------------------------------------------------
function compositeSize({ contract, key, size, layers, char, landmarks, mode, modeSpec, texture, palette, hueHex, charEdge }) {
  const [W, H] = key.split("x").map(Number);
  const k = size.pxScale ?? Math.min(W, H) / 1080;
  const steps = [], findings = [];
  const [fx, fy, fw, fh] = size.frame.rect;
  const frame = size.frame.clip ? R.fillPolygon(size.frame.clip.map(([x, y]) => [fx + x, fy + y]), W, H) : (() => {
    const m = new Float32Array(W * H);
    for (let y = Math.max(0, Math.round(fy)); y < Math.min(H, Math.round(fy + fh)); y += 1) for (let x = Math.max(0, Math.round(fx)); x < Math.min(W, Math.round(fx + fw)); x += 1) m[y * W + x] = 1;
    return m;
  })();
  const scene = emptyLayer(W, H);
  const [dw, dh] = contract.design;
  const sprite = (id) => {
    const entry = size.boxes?.[id];
    if (!entry || !layers[id]) return null;
    return place(layers[id], [0, 0, layers[id].width, layers[id].height], entry.box, W, H);
  };
  const charIndex = contract.stack.findIndex((l) => l.role === "char");
  for (const layer of contract.stack.slice(0, charIndex)) {
    if (!layers[layer.id]) continue;
    if (layer.plate) {
      const src = layers[layer.id], s = src.width / dw, crop = size.crop || [0, 0, dw, dh];
      over(scene, place(src, crop.map((v) => v * s), [fx, fy, fw, fh], W, H), frame);
    } else {
      const placed = sprite(layer.id);
      if (placed) over(scene, placed, size.boxes[layer.id].clip === false ? null : frame);
    }
  }
  // character: foot point and head top map to the size's foot and height
  const sc = size.char.height / Math.max(1, landmarks.foot[1] - landmarks.headTop);
  const ox = size.char.foot[0] - landmarks.foot[0] * sc, oy = size.char.foot[1] - landmarks.foot[1] * sc;
  const C = place(char, [0, 0, char.width, char.height], [ox, oy, char.width * sc, char.height * sc], W, H);
  const breaks = size.char.frameBreak || [];
  const clip = new Float32Array(W * H);
  if (!breaks.length) clip.set(frame);
  else for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const inX = (x >= fx || breaks.includes("left")) && (x < fx + fw || breaks.includes("right")), inY = (y >= fy || breaks.includes("top")) && (y < fy + fh || breaks.includes("bottom"));
    clip[y * W + x] = frame[y * W + x] || (inX && inY) ? 1 : 0;
  }
  for (let i = 0; i < C.A.length; i += 1) C.A[i] *= clip[i];
  const toOut = (b) => [ox + b[0] * sc, oy + b[1] * sc, ox + b[2] * sc, oy + b[3] * sc].map((v) => Math.round(v * 10) / 10);
  const boxes = { ...(landmarks.face ? { face: toOut(landmarks.face) } : {}), ...(landmarks.hands ? { hands: landmarks.hands.map(toOut) } : {}) };
  const upscale = Math.round(sc * 10000) / 10000;
  steps.push({ step: "place", scaleSourceToOutput: upscale, foot: size.char.foot, height: size.char.height, frameBreak: breaks, landmarksFrom: landmarks.from, boxes });
  let cb = [W, H, -1, -1];
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (C.A[y * W + x] > 0.5) { if (x < cb[0]) cb[0] = x; if (y < cb[1]) cb[1] = y; if (x > cb[2]) cb[2] = x; if (y > cb[3]) cb[3] = y; }
  if (cb[2] < 0) throw integrationError(`size ${key}: the character lands outside the frame (foot ${size.char.foot}, height ${size.char.height})`);
  // scene statistics: the slot (figure box grown by 25%), opaque frame pixels only
  const gx = Math.round((cb[2] - cb[0]) * 0.25), gy = Math.round((cb[3] - cb[1]) * 0.25), sMask = new Uint8Array(W * H), fMask = new Uint8Array(W * H);
  for (let y = Math.max(0, cb[1] - gy); y < Math.min(H, cb[3] + gy); y += 1) for (let x = Math.max(0, cb[0] - gx); x < Math.min(W, cb[2] + gx); x += 1) { const i = y * W + x; if (frame[i] > 0.5 && scene.A[i] > 0.99) sMask[i] = 1; }
  for (let i = 0; i < fMask.length; i += 1) fMask[i] = C.A[i] > 0.9 ? 1 : 0;
  const ss = labStats(scene, sMask), fs = labStats(C, fMask);
  if (!ss || !fs) throw integrationError(`size ${key}: no opaque scene pixels around the character to grade against`);
  if (modeSpec.grade) {
    const g = { bw: 0, meanvar: 0, chroma: 0, huePull: 0, ...modeSpec.grade };
    const info = grade(C, fMask, fs, ss, g, hueHex);
    const fa = labStats(C, fMask);
    steps.push({ step: "grade (OKLab)", params: g, scene: roundStats(ss), figureBefore: roundStats(fs), figureAfter: roundStats(fa), blackPointDL: [r4(fs.blackL - ss.blackL), r4(fa.blackL - ss.blackL)], meanDE: [meanDE(fs, ss), meanDE(fa, ss)], ...info });
  } else {
    steps.push({ step: "grade (none)", scene: roundStats(ss), figure: roundStats(fs), blackPointDL: [r4(fs.blackL - ss.blackL), r4(fs.blackL - ss.blackL)], meanDE: [meanDE(fs, ss), meanDE(fs, ss)] });
  }
  if (modeSpec.wrap) {
    const r = modeSpec.wrap.radius * k, lin = [scene.R, scene.G, scene.B].map((c) => R.blur(c.map(R.toLinear), W, H, r)), soft = R.blur(C.A, W, H, r);
    let sum = 0, cnt = 0;
    for (let i = 0; i < C.A.length; i += 1) {
      if (C.A[i] <= 0.02) continue;
      const e = Math.min(1, Math.max(0, C.A[i] * (1 - soft[i]))) * modeSpec.wrap.strength;
      sum += e; cnt += 1;
      const ch = [C.R, C.G, C.B];
      for (let c = 0; c < 3; c += 1) { const v = R.toLinear(ch[c][i]); ch[c][i] = R.toSrgb(v + e * (lin[c][i] - v) * 0.7 + e * lin[c][i] * 0.3); }
    }
    steps.push({ step: "light wrap", radiusPx: Math.round(r * 10) / 10, strength: modeSpec.wrap.strength, meanEdgeWeight: r4(sum / Math.max(cnt, 1)) });
  }
  if (modeSpec.rim) {
    const d = contract.char.light.rim, len = Math.hypot(d[0], d[1]), w = modeSpec.rim.width * k;
    const shifted = R.warpAffine(C.A, W, H, [[1, 0, (-d[0] / len) * w], [0, 1, (-d[1] / len) * w]]);
    const edge = new Float32Array(C.A.length);
    for (let i = 0; i < edge.length; i += 1) edge[i] = Math.max(0, C.A[i] - shifted[i]);
    const rim = R.blur(edge, W, H, 0.8 * k), col = R.hexRgb(palette[contract.char.light.rimColour]);
    let px = 0;
    for (let i = 0; i < rim.length; i += 1) {
      const v = Math.min(1, rim[i]) * C.A[i] * modeSpec.rim.strength;
      if (v <= 0) continue;
      if (v > 0.1) px += 1;
      C.R[i] = 1 - (1 - C.R[i]) * (1 - v * col[0]); C.G[i] = 1 - (1 - C.G[i]) * (1 - v * col[1]); C.B[i] = 1 - (1 - C.B[i]) * (1 - v * col[2]);
    }
    steps.push({ step: "rim light", from: d, colour: palette[contract.char.light.rimColour], widthPx: Math.round(w * 10) / 10, rimPixels: px });
  }
  if (modeSpec.haze) {
    let hz = [0, 0, 0], cnt = 0;
    for (let i = 0; i < sMask.length; i += 1) if (sMask[i]) { hz[0] += scene.R[i]; hz[1] += scene.G[i]; hz[2] += scene.B[i]; cnt += 1; }
    hz = hz.map((v) => v / cnt);
    for (let i = 0; i < C.A.length; i += 1) if (C.A[i] > 0) { C.R[i] = C.R[i] * (1 - modeSpec.haze) + hz[0] * modeSpec.haze; C.G[i] = C.G[i] * (1 - modeSpec.haze) + hz[1] * modeSpec.haze; C.B[i] = C.B[i] * (1 - modeSpec.haze) + hz[2] * modeSpec.haze; }
    steps.push({ step: "haze", amount: modeSpec.haze, colour: `#${hz.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase()}` });
  }
  // contact shadow, AO and cast shadow darken the scene under the character
  const ground = copyLayer(scene);
  if (modeSpec.shadow) {
    const [fpx, fpy] = size.char.foot, feet = (cb[2] - cb[0]) * 0.75, shade = new Float32Array(W * H);
    const contact = R.blur(R.fillEllipse(W, H, fpx, fpy - 4 * k, feet * 0.55, Math.max(6, feet * 0.07)), W, H, 6 * k);
    const ao = R.blur(R.fillEllipse(W, H, fpx, fpy, feet * 0.9, Math.max(10, feet * 0.16)), W, H, 22 * k);
    for (let i = 0; i < shade.length; i += 1) shade[i] = Math.max(contact[i] * (modeSpec.shadow.contact || 0), ao[i] * (modeSpec.shadow.ao || 0));
    if (modeSpec.shadow.cast && contract.char.shadow) {
      const [cdx, cdy] = contract.char.shadow.castToward, L = contract.char.shadow.castLength, shx = cdx / (cdy + 0.4);
      const cast = R.blur(R.warpAffine(C.A, W, H, [[1, -shx * L, shx * L * fpy], [0, -L, fpy * (1 + L)]]), W, H, 5 * k);
      for (let i = 0; i < shade.length; i += 1) shade[i] = Math.max(shade[i], cast[i] * modeSpec.shadow.cast);
    }
    let max = 0;
    for (let i = 0; i < shade.length; i += 1) {
      const s = shade[i] * frame[i] * 0.85; if (s > max) max = s;
      ground.R[i] = ground.R[i] * (1 - s) + 0.05 * s; ground.G[i] = ground.G[i] * (1 - s) + 0.05 * s; ground.B[i] = ground.B[i] * (1 - s) + 0.07 * s;
    }
    steps.push({ step: `contact shadow + AO${modeSpec.shadow.cast ? " + cast" : ""}`, ...modeSpec.shadow, maxDarkening: Math.round(max * 1000) / 1000 });
  }
  const upper = emptyLayer(W, H);
  if (modeSpec.outline) {
    const o = modeSpec.outline;
    const masks = M.outlineMasks(C.A, W, H, { whitePx: o.white * k, blackPx: o.black * k, smoothPx: o.smooth * k, offset: (o.offset || [0, 0]).map((v) => v * k) });
    const ink = R.hexRgb(palette[o.plate || "ink"] || "#0B0B0B");
    const solid = (rgb, a) => ({ R: new Float32Array(W * H).fill(rgb[0]), G: new Float32Array(W * H).fill(rgb[1]), B: new Float32Array(W * H).fill(rgb[2]), A: a });
    over(upper, solid(ink, masks.plate)); over(upper, solid([0, 0, 0], masks.black)); over(upper, solid([1, 1, 1], masks.white));
    steps.push({ step: "sticker outline", whitePx: r4(o.white * k), blackPx: r4(o.black * k), smoothPx: r4(o.smooth * k), plateOffset: (o.offset || [0, 0]).map((v) => r4(v * k)) });
  }
  // dark or light ring: the outer soft edge against what it covers
  const preRing = over(copyLayer(ground), upper);
  over(upper, C);
  const flat = over(copyLayer(ground), upper);
  let ringSum = 0, ringN = 0;
  for (let i = 0; i < C.A.length; i += 1) if (C.A[i] > 0.03 && C.A[i] < 0.5) { ringSum += R.srgbToOklab(flat.R[i], flat.G[i], flat.B[i])[0] - R.srgbToOklab(preRing.R[i], preRing.G[i], preRing.B[i])[0]; ringN += 1; }
  steps.push({ step: "edge on target", outerSoftEdgePx: ringN, meanDLAgainstScene: r4(ringSum / Math.max(ringN, 1)) });
  const occ = new Float32Array(W * H);
  for (const layer of contract.stack.slice(charIndex + 1)) {
    if (!["fx", "fg"].includes(layer.role)) continue;
    if (layer.role === "fg" && modeSpec.occluder === false) continue;
    const placed = sprite(layer.id);
    if (!placed) continue;
    over(upper, placed, size.boxes[layer.id].clip === true ? frame : null);
    if (layer.role === "fg") for (let i = 0; i < occ.length; i += 1) occ[i] = Math.max(occ[i], placed.A[i]);
  }
  let covered = 0, charPx = 0;
  for (let i = 0; i < C.A.length; i += 1) if (C.A[i] > 0.5) { charPx += 1; if (occ[i] > 0.5) covered += 1; }
  steps.push({ step: "foreground occluder", figureFractionCovered: r4(covered / Math.max(charPx, 1)) });
  // shared texture over every image layer
  const textured = [];
  for (const layer of contract.stack.filter((l) => l.role === "texture")) {
    const src = layers[layer.id], t = texture?.[layer.blend];
    if (!src || !t) continue;
    const tile = Math.max(8, Math.round(t.tilePx * Math.min(W, H) / 1080));
    const plane = layer.blend === "multiply" ? src.R.map((r, i) => (r + src.G[i] + src.B[i]) / 3) : src.A;
    const small = R.resizePlane(plane, src.width, src.height, tile, tile);
    let norm = 1;
    if (layer.blend === "multiply") norm = R.percentileOf(small, 60) || 1;
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const v = small[(y % tile) * tile + (x % tile)], i = y * W + x;
      const f = layer.blend === "multiply" ? 1 - t.opacity * (1 - Math.min(1, v / norm)) : 1 - v * t.opacity;
      ground.R[i] *= f; ground.G[i] *= f; ground.B[i] *= f; upper.R[i] *= f; upper.G[i] *= f; upper.B[i] *= f;
    }
    textured.push({ layer: layer.id, blend: layer.blend, ...t, tileOutPx: tile });
  }
  if (textured.length) steps.push({ step: "texture", layers: textured });
  const final = over(copyLayer(ground), upper);
  // safe areas: face and hands against this size's type boxes and the occluder
  const safe = { type: {}, occluder: {} };
  const named = [...(boxes.face ? [["face", boxes.face]] : []), ...(boxes.hands || []).map((b, i) => [`hand ${i + 1}`, b])];
  for (const [part, box] of named) {
    const underType = Object.entries(size.type || {}).map(([block, [x, y, w, h]]) => [block, boxOverlap(box, [x, y, x + w, y + h])]).filter(([, v]) => v > 0);
    if (underType.length) safe.type[part] = Object.fromEntries(underType.map(([b, v]) => [b, r4(v)]));
    const occShare = coverage(box, occ, W, H);
    if (occShare > 0) safe.occluder[part] = r4(occShare);
    for (const [block, share] of underType) findings.push({ code: "safe-area-type", severity: "error", size: key, part, message: `${key}: the ${part} box is ${Math.round(share * 100)}% under the type block ${block}`, measured: { part, box, block, share: r4(share) }, fix: `Move ${block} in sizes.${key}.type off ${part} (${box.map(Math.round).join(",")}), or move the figure: sizes.${key}.char.foot / height` });
    if (occShare > LIMITS.occluderOnSafe) {
      const occLayer = contract.stack.find((l) => l.role === "fg" && size.boxes?.[l.id])?.id || "the occluder";
      findings.push({ code: "safe-area-occluder", severity: "error", size: key, part, message: `${key}: ${occLayer} covers ${Math.round(occShare * 100)}% of the ${part}`, measured: { part, box, share: r4(occShare) }, fix: `Move sizes.${key}.boxes.${occLayer}.box away from ${part} (${box.map(Math.round).join(",")}) or shrink it; occluders may cover legs and body, not the face or hands` });
    }
  }
  if (!named.length) findings.push({ code: "composite-landmarks-missing", severity: "warn", size: key, message: `${key}: no face or hand boxes, so the safe areas were not checked`, fix: "Record the task sheet's returned landmarks at intake (materials add --landmarks) or pass params.landmarks to materials composite" });
  const gradeStep = steps.find((s) => s.step.startsWith("grade"));
  const [bp0, bp1] = gradeStep.blackPointDL, [de0, de1] = gradeStep.meanDE;
  if (upscale > LIMITS.upscale) findings.push({ code: "composite-upscale", severity: "error", size: key, message: `${key}: the character is enlarged ${upscale}x (limit ${LIMITS.upscale}x)`, measured: { upscale }, fix: `Regenerate with the figure at least ${Math.ceil(size.char.height * 2)} px tall (2x this slot), or upscale the source with a dedicated upscaler and record it` });
  if (Math.abs(bp1) > LIMITS.blackPointDL) findings.push({ code: "composite-black-point", severity: "warn", size: key, message: `${key}: the character's black point is ${bp1 > 0 ? "lighter" : "darker"} than the scene's by ${Math.abs(bp1)} L (band ${LIMITS.blackPointDL})`, measured: { blackPointDL: bp1, before: bp0 }, fix: Math.sign(bp1) !== Math.sign(bp0) && bp0 !== 0 ? `The grade overshoots (before ${bp0}, after ${bp1}): lower grade.meanvar (it stretches the figure's contrast toward the scene's) to ${Math.max(0, (modeSpec.grade?.meanvar || 0) - 0.15).toFixed(2)} for this size or mode ${mode}` : `Raise grade.bw toward ${Math.min(1, ((modeSpec.grade?.bw || 0) + 0.2)).toFixed(1)} for mode ${mode}` });
  if (de1 > LIMITS.meanDE) findings.push({ code: "composite-colour-mismatch", severity: "warn", size: key, message: `${key}: mean colour difference to the scene is ${de1} (warn above ${LIMITS.meanDE}; a residual of 10-20 is expected on flat light grounds)`, measured: { meanDE: de1, before: de0 }, fix: `Raise grade.chroma or grade.huePull; do not push grade.meanvar past ${LIMITS.meanvarWashout} (the figure washes out), and prefer a source drawn in the style pack's rendering` });
  if ((modeSpec.grade?.meanvar || 0) > LIMITS.meanvarWashout) findings.push({ code: "composite-grade-washout", severity: "warn", size: key, message: `grade.meanvar ${modeSpec.grade.meanvar} pulls the figure toward the scene's mean hard enough to wash it out`, measured: { meanvar: modeSpec.grade.meanvar }, fix: `Lower grade.meanvar to 0.3 or less; match the black point (grade.bw) instead` });
  // the piece's halo at its use size: source px times the placement scale
  const haloOut = charEdge ? Math.round(charEdge.haloWidthPx * sc * 100) / 100 : null;
  if (haloOut !== null && haloOut > LIMITS.haloOutputPx) findings.push({ code: "matte-halo", severity: "warn", size: key, message: `${key}: the cut piece's backdrop-coloured edge is ${haloOut} px wide at this size (${charEdge.haloWidthPx} px in the source x ${upscale}; limit ${LIMITS.haloOutputPx})`, measured: { ...charEdge, outputPx: haloOut }, fix: "Cut again with --mode grabcut (defringe on) and a lower params.bgSigma, or ask the generator for a transparent PNG" });
  return {
    width: W, height: H, final, ground, upper, mask: C.A, frame,
    measurements: { upscale, blackPointDL: [bp0, bp1], meanDE: [de0, de1], edgeDL: steps.find((s) => s.step === "edge on target").meanDLAgainstScene, occluderOnFigure: steps.find((s) => s.step === "foreground occluder").figureFractionCovered, charBox: cb, safe, ...(charEdge ? { halo: { ...charEdge, outputPx: haloOut } } : {}) },
    boxes, steps, findings,
  };
}

module.exports = { LIMITS, MODES, MODE_KEYS, alphaLandmarks, compositeSize, over, place, validateIntegration };
