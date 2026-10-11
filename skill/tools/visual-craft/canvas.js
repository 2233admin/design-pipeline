/*
 * Small caller-owned Canvas primitives adapted from MIT-licensed work by alchaincyf.
 * Source areas: engine/lib/kit.js (arc-length sampling), brush.js (pressure-shaped
 * continuous strokes), typo.js (measure/wrap/fit), and util.js (seeded randomness).
 * Notice: LICENSE.art-motion beside a scaffolded copy; ../art-motion/LICENSE in the skill.
 * This module removes upstream globals, fixed stage dimensions, caches and clock use.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.VisualCraft = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const MAX_POINTS = 4096;
  const MAX_SAMPLES = 20000;
  const MAX_TEXT = 20000;
  const MAX_TEXT_MEASUREMENTS = 50000;
  const MAX_MEASURED_TEXT_UNITS = 1000000;
  const MAX_DIMENSION = 100000;

  function finite(value, label, min = -Infinity, max = Infinity) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new TypeError(`${label} must be finite and in [${min}, ${max}]`);
    return value;
  }

  function integer(value, label, min, max) {
    finite(value, label, min, max);
    if (!Number.isInteger(value)) throw new TypeError(`${label} must be an integer`);
    return value;
  }

  function record(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
    return value;
  }

  function keysOnly(value, allowed, label) {
    const extras = Reflect.ownKeys(value).filter((key) => typeof key !== "string" || !allowed.includes(key));
    if (extras.length) throw new TypeError(`${label} has unsupported properties`);
  }

  function pointList(points) {
    if (!Array.isArray(points) || points.length < 2 || points.length > MAX_POINTS) throw new TypeError(`points must contain 2..${MAX_POINTS} coordinate pairs`);
    return Array.from(points, (point, index) => {
      if (!Array.isArray(point) || point.length !== 2) throw new TypeError(`points[${index}] must be [x, y]`);
      return [finite(point[0], `points[${index}].x`, -MAX_DIMENSION, MAX_DIMENSION), finite(point[1], `points[${index}].y`, -MAX_DIMENSION, MAX_DIMENSION)];
    });
  }

  function mulberry(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) | 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function strokeGeometry(points, options = {}) {
    record(options, "options");
    keysOnly(options, ["width", "spacing", "progress", "seed", "pressures", "jitter"], "options");
    const path = pointList(points);
    const width = finite(options.width, "width", 0.1, 512);
    const spacing = finite(options.spacing === undefined ? 3 : options.spacing, "spacing", 0.25, 256);
    const progress = finite(options.progress === undefined ? 1 : options.progress, "progress", 0, 1);
    const seed = integer(options.seed === undefined ? 1 : options.seed, "seed", 0, 0xFFFFFFFF);
    const jitter = finite(options.jitter === undefined ? 0.06 : options.jitter, "jitter", 0, 0.35);
    let pressures = options.pressures;
    if (pressures !== undefined) {
      if (!Array.isArray(pressures) || pressures.length !== path.length) throw new TypeError("pressures must have one value per point");
      pressures = Array.from(pressures, (value, index) => finite(value, `pressures[${index}]`, 0, 1));
      if (pressures.every((value) => value === 0)) throw new RangeError("pressures must include a positive value");
    }

    const segments = [];
    let length = 0;
    for (let index = 1; index < path.length; index += 1) {
      const a = path[index - 1], b = path[index];
      const span = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (span > 0) { segments.push({ a, b, start: length, span, from: index - 1, to: index }); length += span; }
    }
    if (!(length > 0) || !Number.isFinite(length)) throw new RangeError("points must describe a finite path with positive length");
    const visibleLength = length * progress;
    if (progress === 0) return { length, visibleLength, samples: [], outline: [] };
    const sampleCount = Math.ceil(visibleLength / spacing) + 1;
    if (sampleCount > MAX_SAMPLES) throw new RangeError(`stroke would exceed ${MAX_SAMPLES} arc-length samples`);
    const distances = [];
    for (let distance = 0; distance < visibleLength; distance += spacing) distances.push(distance);
    if (!distances.length || distances[distances.length - 1] !== visibleLength) distances.push(visibleLength);

    const samples = [];
    let segmentIndex = 0;
    for (const distance of distances) {
      while (segmentIndex < segments.length - 1 && distance > segments[segmentIndex].start + segments[segmentIndex].span) segmentIndex += 1;
      const segment = segments[segmentIndex];
      const q = Math.max(0, Math.min(1, (distance - segment.start) / segment.span));
      const ratio = distance / length;
      const pressure = pressures
        ? pressures[segment.from] + (pressures[segment.to] - pressures[segment.from]) * q
        : 0.16 + 0.84 * Math.sin(Math.PI * ratio);
      samples.push({
        x: segment.a[0] + (segment.b[0] - segment.a[0]) * q,
        y: segment.a[1] + (segment.b[1] - segment.a[1]) * q,
        pressure,
        distance,
      });
    }

    const random = mulberry(seed);
    const left = [], right = [];
    for (let index = 0; index < samples.length; index += 1) {
      const previous = samples[Math.max(0, index - 1)];
      const next = samples[Math.min(samples.length - 1, index + 1)];
      let dx = next.x - previous.x, dy = next.y - previous.y;
      let magnitude = Math.hypot(dx, dy);
      if (!magnitude) {
        const forward = samples[Math.min(samples.length - 1, index + 1)];
        dx = forward.x - samples[index].x; dy = forward.y - samples[index].y;
        magnitude = Math.hypot(dx, dy) || 1;
      }
      const normalX = -dy / magnitude, normalY = dx / magnitude;
      const variation = 1 + (random() - 0.5) * 2 * jitter;
      const radius = width * samples[index].pressure * variation / 2;
      left.push([samples[index].x + normalX * radius, samples[index].y + normalY * radius]);
      right.push([samples[index].x - normalX * radius, samples[index].y - normalY * radius]);
    }
    return { length, visibleLength, samples, outline: left.concat(right.reverse()) };
  }

  function drawBrush(context, points, options = {}) {
    if (!context || !["save", "restore", "fill"].every((method) => typeof context[method] === "function")) throw new TypeError("context must be a 2D Canvas context");
    record(options, "options");
    keysOnly(options, ["width", "spacing", "progress", "seed", "pressures", "jitter", "color", "alpha"], "options");
    const color = options.color === undefined ? "#201b18" : options.color;
    const alpha = finite(options.alpha === undefined ? 1 : options.alpha, "alpha", 0, 1);
    if (typeof color !== "string" || !color.trim() || color.length > 128) throw new TypeError("color must be a non-empty CSS color string");
    const geometryOptions = Object.fromEntries(["width", "spacing", "progress", "seed", "pressures", "jitter"].filter((key) => Object.hasOwn(options, key)).map((key) => [key, options[key]]));
    const geometry = strokeGeometry(points, geometryOptions);
    if (!geometry.outline.length || alpha === 0) return geometry;
    if (typeof Path2D !== "function") throw new TypeError("Path2D is required to draw a pressure stroke without changing the caller's current path");
    const path = new Path2D();
    path.moveTo(geometry.outline[0][0], geometry.outline[0][1]);
    for (let index = 1; index < geometry.outline.length; index += 1) path.lineTo(geometry.outline[index][0], geometry.outline[index][1]);
    path.closePath();
    context.save();
    try {
      context.globalAlpha *= alpha;
      context.fillStyle = color;
      context.fill(path);
    } finally { context.restore(); }
    return geometry;
  }

  function paperGrain(context, path, bounds, options = {}) {
    if (!context || !["save", "restore", "clip", "fillRect"].every((method) => typeof context[method] === "function")) throw new TypeError("context must be a 2D Canvas context");
    if (!path || typeof path !== "object") throw new TypeError("path must be a Canvas path");
    record(bounds, "bounds");
    keysOnly(bounds, ["x", "y", "width", "height"], "bounds");
    record(options, "options");
    keysOnly(options, ["seed", "count", "size", "alpha", "color"], "options");
    const x = finite(bounds.x, "bounds.x", -MAX_DIMENSION, MAX_DIMENSION);
    const y = finite(bounds.y, "bounds.y", -MAX_DIMENSION, MAX_DIMENSION);
    const width = finite(bounds.width, "bounds.width", 1, MAX_DIMENSION);
    const height = finite(bounds.height, "bounds.height", 1, MAX_DIMENSION);
    const seed = integer(options.seed === undefined ? 1 : options.seed, "seed", 0, 0xFFFFFFFF);
    const count = integer(options.count === undefined ? 240 : options.count, "count", 0, 20000);
    const size = finite(options.size === undefined ? 0.65 : options.size, "size", 0.1, 8);
    const alpha = finite(options.alpha === undefined ? 0.14 : options.alpha, "alpha", 0, 1);
    const color = options.color === undefined ? "#756957" : options.color;
    if (typeof color !== "string" || !color.trim() || color.length > 128) throw new TypeError("color must be a non-empty CSS color string");
    const random = mulberry(seed);
    context.save();
    try {
      context.clip(path);
      context.fillStyle = color;
      context.globalAlpha *= alpha;
      for (let index = 0; index < count; index += 1) context.fillRect(x + random() * width, y + random() * height, size, size);
    } finally { context.restore(); }
    return count;
  }

  function graphemes(text) {
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (part) => part.segment);
    return Array.from(text);
  }

  function tokenize(paragraph) {
    const tokens = [];
    let word = "";
    const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
    const flush = () => { if (word) tokens.push(word); word = ""; };
    for (const cluster of graphemes(paragraph)) {
      if (cjk.test(cluster)) { flush(); tokens.push(cluster); }
      else {
        word += cluster;
        if (/\s/u.test(cluster)) flush();
      }
    }
    flush();
    return tokens;
  }

  function measuredWidth(context, text, budget) {
    if (budget.calls >= MAX_TEXT_MEASUREMENTS) throw new RangeError(`text layout exceeded ${MAX_TEXT_MEASUREMENTS} Canvas measurements`);
    if (budget.chars + text.length > MAX_MEASURED_TEXT_UNITS) throw new RangeError(`text layout exceeded ${MAX_MEASURED_TEXT_UNITS} measured UTF-16 units`);
    budget.calls += 1;
    budget.chars += text.length;
    return context.measureText(text).width;
  }

  function wrapTextWithBudget(context, text, width, font, budget) {
    if (!context || typeof context.measureText !== "function" || typeof context.save !== "function" || typeof context.restore !== "function") throw new TypeError("context must support Canvas text measurement");
    if (typeof text !== "string" || text.length > MAX_TEXT) throw new TypeError(`text must be a string up to ${MAX_TEXT} UTF-16 units`);
    finite(width, "width", 1, MAX_DIMENSION);
    if (typeof font !== "string" || !font.trim() || font.length > 256) throw new TypeError("font must be a non-empty Canvas font string");
    context.save();
    try {
      context.font = font;
      const lines = [];
      for (const paragraph of text.split(/\r\n?|\n/u)) {
        let line = "";
        for (const token of tokenize(paragraph)) {
          const candidate = line + token;
          if (line && measuredWidth(context, candidate, budget) > width) {
            lines.push(line);
            line = token;
          } else line = candidate;
        }
        lines.push(line);
      }
      const widths = lines.map((line) => measuredWidth(context, line, budget));
      return { lines, widths, overflow: widths.some((lineWidth) => lineWidth > width) };
    } finally { context.restore(); }
  }

  function wrapText(context, text, width, font) {
    return wrapTextWithBudget(context, text, width, font, { calls: 0, chars: 0 });
  }

  function fitText(context, text, bounds, options = {}) {
    record(bounds, "bounds");
    keysOnly(bounds, ["width", "height"], "bounds");
    record(options, "options");
    keysOnly(options, ["fontFamily", "fontWeight", "size", "minFontSize", "lineHeight", "step"], "options");
    const width = finite(bounds.width, "bounds.width", 1, MAX_DIMENSION);
    const height = finite(bounds.height, "bounds.height", 1, MAX_DIMENSION);
    const fontFamily = options.fontFamily === undefined ? "system-ui, sans-serif" : options.fontFamily;
    const fontWeight = options.fontWeight === undefined ? "400" : options.fontWeight;
    if (typeof fontFamily !== "string" || !fontFamily.trim() || fontFamily.length > 128) throw new TypeError("fontFamily must be a non-empty string");
    if (!(typeof fontWeight === "string" || (typeof fontWeight === "number" && Number.isFinite(fontWeight)))) throw new TypeError("fontWeight must be a short CSS font weight");
    const weight = String(fontWeight);
    if (!/^(normal|bold|bolder|lighter|[1-9]00)$/u.test(weight)) throw new TypeError("fontWeight must be normal, bold, bolder, lighter, or a 100..900 weight");
    const requestedSize = finite(options.size === undefined ? 32 : options.size, "size", 1, 512);
    const minFontSize = finite(options.minFontSize === undefined ? 12 : options.minFontSize, "minFontSize", 1, requestedSize);
    const lineHeight = finite(options.lineHeight === undefined ? 1.25 : options.lineHeight, "lineHeight", 0.8, 4);
    const step = finite(options.step === undefined ? 1 : options.step, "step", 0.25, 32);
    const iterations = Math.ceil((requestedSize - minFontSize) / step) + 1;
    if (iterations > 2048) throw new RangeError("font fitting exceeds 2048 iterations");
    const budget = { calls: 0, chars: 0 };
    let size = requestedSize;
    let lastLayout, lastFont, lastSize;
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const font = `${weight} ${size}px ${fontFamily}`;
      const layout = wrapTextWithBudget(context, text, width, font, budget);
      lastLayout = layout;
      lastFont = font;
      lastSize = size;
      const heightOverflow = layout.lines.length * size * lineHeight > height;
      if (!layout.overflow && !heightOverflow) return { ...layout, ok: true, overflow: false, overflowReasons: [], font, size, lineHeightPx: size * lineHeight };
      if (size === minFontSize) break;
      size = Math.max(minFontSize, size - step);
    }
    const overflowReasons = [...(lastLayout.overflow ? ["width"] : []), ...(lastLayout.lines.length * lastSize * lineHeight > height ? ["height"] : [])];
    return { ...lastLayout, ok: false, overflow: true, overflowReasons, font: lastFont, size: lastSize, lineHeightPx: lastSize * lineHeight };
  }

  function imageRect(sourceWidth, sourceHeight, box, mode = "contain") {
    finite(sourceWidth, "sourceWidth", 1, MAX_DIMENSION);
    finite(sourceHeight, "sourceHeight", 1, MAX_DIMENSION);
    record(box, "box");
    keysOnly(box, ["x", "y", "width", "height"], "box");
    const x = finite(box.x, "box.x", -MAX_DIMENSION, MAX_DIMENSION);
    const y = finite(box.y, "box.y", -MAX_DIMENSION, MAX_DIMENSION);
    const width = finite(box.width, "box.width", 1, MAX_DIMENSION);
    const height = finite(box.height, "box.height", 1, MAX_DIMENSION);
    if (mode !== "contain" && mode !== "cover") throw new TypeError("mode must be contain or cover");
    const scale = mode === "contain" ? Math.min(width / sourceWidth, height / sourceHeight) : Math.max(width / sourceWidth, height / sourceHeight);
    if (mode === "contain") {
      const dw = sourceWidth * scale, dh = sourceHeight * scale;
      return { sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight, dx: x + (width - dw) / 2, dy: y + (height - dh) / 2, dw, dh };
    }
    const sw = width / scale, sh = height / scale;
    return { sx: (sourceWidth - sw) / 2, sy: (sourceHeight - sh) / 2, sw, sh, dx: x, dy: y, dw: width, dh: height };
  }

  function spriteFrame(time, frameCount, fps, { loop = false } = {}) {
    finite(time, "time", 0, MAX_DIMENSION);
    integer(frameCount, "frameCount", 1, 100000);
    finite(fps, "fps", 0.001, 1000);
    if (typeof loop !== "boolean") throw new TypeError("loop must be boolean");
    const frame = Math.floor(time * fps);
    if (!Number.isFinite(frame)) throw new RangeError("time and fps exceed the frame range");
    return loop ? frame % frameCount : Math.min(frameCount - 1, frame);
  }

  return { strokeGeometry, drawBrush, paperGrain, wrapText, fitText, imageRect, spriteFrame };
});
