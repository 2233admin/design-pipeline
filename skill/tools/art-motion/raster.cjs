"use strict";

// Float raster helpers for matting and compositing (dependency-free, deterministic): planes are
// Float32Array of width * height, colour in 0..1. Used by matte.cjs (GrabCut, guided filter,
// defringe, sticker outline) and composite.cjs (layer compositing and its measurements).

// ---- colour ---------------------------------------------------------------------------------
const LINEAR = Float32Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => { const v = Math.min(1, Math.max(0, c)); return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055; };

// OKLab of a linear-light RGB triple.
function linToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function oklabToLin(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
const srgbToOklab = (r, g, b) => linToOklab(toLinear(r), toLinear(g), toLinear(b));
function oklabToSrgb(L, a, b) { const [r, g, bb] = oklabToLin(L, a, b); return [toSrgb(r), toSrgb(g), toSrgb(bb)]; }
function hexRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex));
  if (!m) throw new Error(`not a #RRGGBB colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
}

// ---- images <-> planes ----------------------------------------------------------------------
// Straight (non-premultiplied) RGBA planes from an 8-bit RGBA image.
function planesOf(image) {
  const n = image.width * image.height, R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), A = new Float32Array(n);
  for (let i = 0; i < n; i += 1) { R[i] = image.data[i * 4] / 255; G[i] = image.data[i * 4 + 1] / 255; B[i] = image.data[i * 4 + 2] / 255; A[i] = image.data[i * 4 + 3] / 255; }
  return { width: image.width, height: image.height, R, G, B, A };
}
const byte = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255);
function imageOf(p) {
  const n = p.width * p.height, data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i += 1) { data[i * 4] = byte(p.R[i]); data[i * 4 + 1] = byte(p.G[i]); data[i * 4 + 2] = byte(p.B[i]); data[i * 4 + 3] = byte(p.A ? p.A[i] : 1); }
  return { width: p.width, height: p.height, data };
}
function greyImage(plane, width, height) {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < plane.length; i += 1) { const v = byte(plane[i]); data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255; }
  return { width, height, data };
}

// ---- filters --------------------------------------------------------------------------------
// Mean over a (2r+1)^2 window with the window clipped to the image (normalised by its pixel count).
function boxMean(plane, width, height, r) {
  if (r <= 0) return Float32Array.from(plane);
  const tmp = new Float32Array(plane.length), out = new Float32Array(plane.length);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    let acc = 0;
    for (let x = 0; x <= Math.min(r, width - 1); x += 1) acc += plane[row + x];
    for (let x = 0; x < width; x += 1) {
      const lo = Math.max(0, x - r), hi = Math.min(width - 1, x + r);
      tmp[row + x] = acc / (hi - lo + 1);
      if (x + r + 1 < width) acc += plane[row + x + r + 1];
      if (x - r >= 0) acc -= plane[row + x - r];
    }
  }
  for (let x = 0; x < width; x += 1) {
    let acc = 0;
    for (let y = 0; y <= Math.min(r, height - 1); y += 1) acc += tmp[y * width + x];
    for (let y = 0; y < height; y += 1) {
      const lo = Math.max(0, y - r), hi = Math.min(height - 1, y + r);
      out[y * width + x] = acc / (hi - lo + 1);
      if (y + r + 1 < height) acc += tmp[(y + r + 1) * width + x];
      if (y - r >= 0) acc -= tmp[(y - r) * width + x];
    }
  }
  return out;
}

// Gaussian blur, edge-clamped: an exact kernel for small sigma, three box passes above 2.5.
function blur(plane, width, height, sigma) {
  if (!(sigma > 0)) return Float32Array.from(plane);
  if (sigma > 2.5) {
    // box sizes for three passes (Kovesi): widths wl, wl+2 averaging to the requested sigma
    const ideal = Math.sqrt((12 * sigma * sigma) / 3 + 1);
    let wl = Math.floor(ideal); if (wl % 2 === 0) wl -= 1;
    const m = Math.round((12 * sigma * sigma - 3 * wl * wl - 12 * wl - 9) / (-4 * wl - 4));
    let out = plane;
    for (let i = 0; i < 3; i += 1) out = boxMean(out, width, height, ((i < m ? wl : wl + 2) - 1) / 2);
    return out;
  }
  const radius = Math.max(1, Math.ceil(sigma * 3)), kernel = new Float32Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i += 1) { kernel[i + radius] = Math.exp(-(i * i) / (2 * sigma * sigma)); sum += kernel[i + radius]; }
  for (let i = 0; i < kernel.length; i += 1) kernel[i] /= sum;
  const tmp = new Float32Array(plane.length), out = new Float32Array(plane.length);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let acc = 0;
    for (let k = -radius; k <= radius; k += 1) acc += plane[y * width + Math.min(width - 1, Math.max(0, x + k))] * kernel[k + radius];
    tmp[y * width + x] = acc;
  }
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let acc = 0;
    for (let k = -radius; k <= radius; k += 1) acc += tmp[Math.min(height - 1, Math.max(0, y + k)) * width + x] * kernel[k + radius];
    out[y * width + x] = acc;
  }
  return out;
}

// Normalised (masked) blur: the blur of plane * mask divided by the blur of mask; den is returned
// so callers can tell where the estimate has support.
function maskedBlur(plane, mask, width, height, sigma) {
  const prod = new Float32Array(plane.length);
  for (let i = 0; i < plane.length; i += 1) prod[i] = plane[i] * mask[i];
  const num = blur(prod, width, height, sigma), den = blur(mask, width, height, sigma), out = new Float32Array(plane.length);
  for (let i = 0; i < out.length; i += 1) out[i] = den[i] > 1e-4 ? num[i] / den[i] : 0;
  return { value: out, den };
}

// Exact squared Euclidean distance to the nearest set pixel (Felzenszwalb & Huttenlocher).
function distanceSquared(mask, width, height) {
  const INF = 1e20, out = new Float64Array(width * height), size = Math.max(width, height);
  const f = new Float64Array(size), d = new Float64Array(size), v = new Int32Array(size), z = new Float64Array(size + 1);
  const pass = (n) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < n; q += 1) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k -= 1; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k += 1; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q += 1) { while (z[k + 1] < q) k += 1; d[q] = (q - v[k]) ** 2 + f[v[k]]; }
  };
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) f[y] = mask[y * width + x] ? 0 : INF;
    pass(height);
    for (let y = 0; y < height; y += 1) out[y * width + x] = d[y];
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) f[x] = out[y * width + x];
    pass(width);
    for (let x = 0; x < width; x += 1) out[y * width + x] = d[x];
  }
  return out;
}
function dilate(mask, width, height, radius) {
  if (radius <= 0) return Uint8Array.from(mask);
  const dist = distanceSquared(mask, width, height), r2 = radius * radius, out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i += 1) out[i] = dist[i] <= r2 ? 1 : 0;
  return out;
}
function erode(mask, width, height, radius) {
  const inverse = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) inverse[i] = mask[i] ? 0 : 1;
  const grown = dilate(inverse, width, height, radius), out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i += 1) out[i] = grown[i] ? 0 : 1;
  return out;
}
// Distance from each set pixel to the nearest unset pixel (0 outside the mask).
function insideDistance(mask, width, height) {
  const inverse = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) inverse[i] = mask[i] ? 0 : 1;
  const d2 = distanceSquared(inverse, width, height), out = new Float32Array(mask.length);
  for (let i = 0; i < out.length; i += 1) out[i] = Math.sqrt(d2[i]);
  return out;
}
// Grey-level erosion of a float plane by a disk of radius r (r small: alpha choke).
function minFilter(plane, width, height, r) {
  const out = new Float32Array(plane.length), offsets = [];
  for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) if (dx * dx + dy * dy <= r * r + 0.5) offsets.push([dx, dy]);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let m = 1;
    for (const [dx, dy] of offsets) {
      const xx = Math.min(width - 1, Math.max(0, x + dx)), yy = Math.min(height - 1, Math.max(0, y + dy));
      const v = plane[yy * width + xx]; if (v < m) m = v;
    }
    out[y * width + x] = m;
  }
  return out;
}

// 8-connected components of a binary mask: { labels, sizes (index label - 1) }.
function components(mask, width, height) {
  const labels = new Int32Array(mask.length), queue = new Int32Array(mask.length), sizes = [];
  let next = 0;
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || labels[start]) continue;
    next += 1; labels[start] = next;
    let head = 0, tail = 0;
    queue[tail++] = start;
    while (head < tail) {
      const i = queue[head++], x = i % width, y = (i - x) / width;
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx, ny = y + dy;
        if ((dx || dy) && nx >= 0 && ny >= 0 && nx < width && ny < height) { const j = ny * width + nx; if (mask[j] && !labels[j]) { labels[j] = next; queue[tail++] = j; } }
      }
    }
    sizes.push(tail);
  }
  return { labels, sizes };
}
// Keep the `keep` largest components and fill the holes that do not touch the border.
function keepLargest(mask, width, height, keep = 1) {
  const { labels, sizes } = components(mask, width, height);
  const kept = new Set(sizes.map((size, i) => ({ size, label: i + 1 })).sort((a, b) => b.size - a.size).slice(0, keep).map((c) => c.label));
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i += 1) out[i] = kept.has(labels[i]) ? 1 : 0;
  const background = out.map((v) => (v ? 0 : 1)), holes = components(background, width, height), touches = new Set();
  for (let x = 0; x < width; x += 1) { touches.add(holes.labels[x]); touches.add(holes.labels[(height - 1) * width + x]); }
  for (let y = 0; y < height; y += 1) { touches.add(holes.labels[y * width]); touches.add(holes.labels[y * width + width - 1]); }
  for (let i = 0; i < out.length; i += 1) if (holes.labels[i] && !touches.has(holes.labels[i])) out[i] = 1;
  return { mask: out, components: sizes.length, sizes: sizes.slice().sort((a, b) => b - a) };
}

// ---- geometry -------------------------------------------------------------------------------
// Separable resampling of planes to dw x dh: box (area) weights when shrinking, linear when growing.
function resizePlane(plane, sw, sh, dw, dh) {
  const axis = (sn, dn) => {
    const scale = sn / dn, support = Math.max(1, scale), taps = [];
    for (let d = 0; d < dn; d += 1) {
      const centre = (d + 0.5) * scale - 0.5, lo = Math.floor(centre - support + 0.5), hi = Math.ceil(centre + support - 0.5), w = [];
      let sum = 0;
      for (let s = lo; s <= hi; s += 1) {
        const t = Math.abs(s - centre) / support, k = Math.max(0, 1 - t);
        if (k > 0) { w.push([Math.min(sn - 1, Math.max(0, s)), k]); sum += k; }
      }
      if (!w.length) w.push([Math.min(sn - 1, Math.max(0, Math.round(centre))), 1]), sum = 1;
      taps.push(w.map(([s, k]) => [s, k / sum]));
    }
    return taps;
  };
  const tx = axis(sw, dw), ty = axis(sh, dh), tmp = new Float32Array(dw * sh), out = new Float32Array(dw * dh);
  for (let y = 0; y < sh; y += 1) for (let x = 0; x < dw; x += 1) { let acc = 0; for (const [s, k] of tx[x]) acc += plane[y * sw + s] * k; tmp[y * dw + x] = acc; }
  for (let y = 0; y < dh; y += 1) for (let x = 0; x < dw; x += 1) { let acc = 0; for (const [s, k] of ty[y]) acc += tmp[s * dw + x] * k; out[y * dw + x] = acc; }
  return out;
}
function cropPlane(plane, width, x0, y0, w, h) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) out.set(plane.subarray((y0 + y) * width + x0, (y0 + y) * width + x0 + w), y * w);
  return out;
}

// Bilinear sample with zero outside.
function sample(plane, width, height, x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
  const at = (xx, yy) => (xx >= 0 && yy >= 0 && xx < width && yy < height ? plane[yy * width + xx] : 0);
  return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
}
// Forward affine map M = [[a, b, c], [d, e, f]] (source -> destination, like cv2.warpAffine).
function warpAffine(plane, width, height, M) {
  const [[a, b, c], [d, e, f]] = M, det = a * e - b * d, out = new Float32Array(plane.length);
  if (Math.abs(det) < 1e-12) return out;
  const ia = e / det, ib = -b / det, id = -d / det, ie = a / det;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const u = x - c, v = y - f;
    out[y * width + x] = sample(plane, width, height, ia * u + ib * v, id * u + ie * v);
  }
  return out;
}
function fillPolygon(points, width, height) {
  const mask = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const cy = y + 0.5, xs = [];
    for (let i = 0; i < points.length; i += 1) {
      const [x0, y0] = points[i], [x1, y1] = points[(i + 1) % points.length];
      if ((y0 <= cy && y1 > cy) || (y1 <= cy && y0 > cy)) xs.push(x0 + ((cy - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.max(0, Math.ceil(xs[i] - 0.5)); x < Math.min(width, Math.ceil(xs[i + 1] - 0.5)); x += 1) mask[y * width + x] = 1;
  }
  return mask;
}
function fillEllipse(width, height, cx, cy, rx, ry) {
  const out = new Float32Array(width * height);
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(height - 1, Math.ceil(cy + ry)); y += 1) for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(width - 1, Math.ceil(cx + rx)); x += 1) {
    if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) out[y * width + x] = 1;
  }
  return out;
}

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentileOf(values, p) {
  if (!values.length) return 0;
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))];
}

module.exports = {
  LINEAR, toLinear, toSrgb, linToOklab, oklabToLin, srgbToOklab, oklabToSrgb, hexRgb,
  planesOf, imageOf, greyImage, boxMean, blur, maskedBlur, distanceSquared, dilate, erode, insideDistance, minFilter,
  components, keepLargest, resizePlane, cropPlane, sample, warpAffine, fillPolygon, fillEllipse, seeded, percentileOf,
};
