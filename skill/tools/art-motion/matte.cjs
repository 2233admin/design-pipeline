"use strict";

// Matting for cut-outs on uneven backdrops (`materials cut --mode grabcut`) and the finishes that
// go with it: GrabCut (Rother et al. 2004: colour GMMs + graph cut, Boykov-Kolmogorov max-flow) at a
// reduced working size, a colour-guided filter (He et al.) to recover the full-size edge, defringe
// (un-mixing the local backdrop from soft edge pixels, a 1 px choke and an interior-colour rim), the
// edge measurements that say how much backdrop colour is left, and the sticker outline (die-cut
// white edge + black line + offset ink plate, smoothed). Ported from the #311 prototype
// (OpenCV/numpy) to dependency-free typed-array code; deterministic for a seed.

const R = require("./raster.cjs");

// ---- Boykov-Kolmogorov max-flow on an arc list --------------------------------------------------
const TERMINAL = -2, ORPHAN = -3, FREE = -1, INF_D = 1e9;

class Graph {
  constructor(nodes, arcs) {
    this.n = nodes;
    this.first = new Int32Array(nodes).fill(-1);
    this.head = new Int32Array(arcs * 2); this.next = new Int32Array(arcs * 2); this.cap = new Float64Array(arcs * 2);
    this.arcs = 0;
    this.tr = new Float64Array(nodes);
    this.flow = 0;
  }
  addTWeights(i, source, sink) {
    const delta = this.tr[i];
    if (delta > 0) source += delta; else sink -= delta;
    this.flow += Math.min(source, sink);
    this.tr[i] = source - sink;
  }
  addEdge(i, j, cap, rev) {
    const a = this.arcs, b = a + 1;
    this.head[a] = j; this.next[a] = this.first[i]; this.first[i] = a; this.cap[a] = cap;
    this.head[b] = i; this.next[b] = this.first[j]; this.first[j] = b; this.cap[b] = rev;
    this.arcs += 2;
  }
  maxflow() {
    const n = this.n, { head, next, cap, tr, first } = this;
    const parent = new Int32Array(n).fill(FREE), sink = new Uint8Array(n), ts = new Int32Array(n), dist = new Int32Array(n);
    const queued = new Uint8Array(n);
    let queue = new Int32Array(Math.max(16, n)), qh = 0, qt = 0;
    const push = (i) => {
      if (queued[i]) return;
      if (qt >= queue.length) { if (qh > 0) { queue.copyWithin(0, qh, qt); qt -= qh; qh = 0; } else { const q = new Int32Array(queue.length * 2); q.set(queue); queue = q; } }
      queue[qt++] = i; queued[i] = 1;
    };
    const pop = () => {
      while (qh < qt) { const i = queue[qh++]; queued[i] = 0; if (parent[i] !== FREE) return i; }
      qh = qt = 0; return -1;
    };
    for (let i = 0; i < n; i += 1) {
      if (tr[i] > 0) { parent[i] = TERMINAL; sink[i] = 0; ts[i] = 0; dist[i] = 1; push(i); }
      else if (tr[i] < 0) { parent[i] = TERMINAL; sink[i] = 1; ts[i] = 0; dist[i] = 1; push(i); }
    }
    const orphans = [];
    let time = 0, current = -1;
    for (;;) {
      let i = current;
      if (i >= 0 && parent[i] === FREE) i = -1;
      if (i < 0) { i = pop(); if (i < 0) break; }
      // grow
      let middle = -1;
      if (!sink[i]) {
        for (let a = first[i]; a >= 0; a = next[a]) {
          if (!(cap[a] > 0)) continue;
          const j = head[a];
          if (parent[j] === FREE) { sink[j] = 0; parent[j] = a ^ 1; ts[j] = ts[i]; dist[j] = dist[i] + 1; push(j); }
          else if (sink[j]) { middle = a; break; }
          else if (ts[j] <= ts[i] && dist[j] > dist[i]) { parent[j] = a ^ 1; ts[j] = ts[i]; dist[j] = dist[i] + 1; }
        }
      } else {
        for (let a = first[i]; a >= 0; a = next[a]) {
          if (!(cap[a ^ 1] > 0)) continue;
          const j = head[a];
          if (parent[j] === FREE) { sink[j] = 1; parent[j] = a ^ 1; ts[j] = ts[i]; dist[j] = dist[i] + 1; push(j); }
          else if (!sink[j]) { middle = a ^ 1; break; }
          else if (ts[j] <= ts[i] && dist[j] > dist[i]) { parent[j] = a ^ 1; ts[j] = ts[i]; dist[j] = dist[i] + 1; }
        }
      }
      time += 1;
      if (middle < 0) { current = -1; continue; }
      current = i;
      // augment along source path - middle - sink path
      let bottleneck = cap[middle];
      let s = head[middle ^ 1];
      for (;;) { const a = parent[s]; if (a === TERMINAL) break; if (bottleneck > cap[a ^ 1]) bottleneck = cap[a ^ 1]; s = head[a]; }
      if (bottleneck > tr[s]) bottleneck = tr[s];
      let t = head[middle];
      for (;;) { const a = parent[t]; if (a === TERMINAL) break; if (bottleneck > cap[a]) bottleneck = cap[a]; t = head[a]; }
      if (bottleneck > -tr[t]) bottleneck = -tr[t];
      cap[middle ^ 1] += bottleneck; cap[middle] -= bottleneck;
      s = head[middle ^ 1];
      for (;;) {
        const a = parent[s];
        if (a === TERMINAL) break;
        cap[a] += bottleneck; cap[a ^ 1] -= bottleneck;
        if (!(cap[a ^ 1] > 0)) { parent[s] = ORPHAN; orphans.push(s); }
        s = head[a];
      }
      tr[s] -= bottleneck;
      if (!(tr[s] > 0)) { parent[s] = ORPHAN; orphans.push(s); }
      t = head[middle];
      for (;;) {
        const a = parent[t];
        if (a === TERMINAL) break;
        cap[a ^ 1] += bottleneck; cap[a] -= bottleneck;
        if (!(cap[a] > 0)) { parent[t] = ORPHAN; orphans.push(t); }
        t = head[a];
      }
      tr[t] += bottleneck;
      if (!(tr[t] < 0)) { parent[t] = ORPHAN; orphans.push(t); }
      this.flow += bottleneck;
      // adopt orphans
      while (orphans.length) {
        const o = orphans.pop(), isSink = sink[o];
        let best = -1, dMin = INF_D;
        for (let a0 = first[o]; a0 >= 0; a0 = next[a0]) {
          if (!((isSink ? cap[a0] : cap[a0 ^ 1]) > 0)) continue;
          let j = head[a0];
          if (sink[j] !== isSink || parent[j] === FREE) continue;
          let d = 0;
          for (;;) {
            if (ts[j] === time) { d += dist[j]; break; }
            const a = parent[j]; d += 1;
            if (a === TERMINAL) { ts[j] = time; dist[j] = 1; break; }
            if (a === ORPHAN || a === FREE) { d = INF_D; break; }
            j = head[a];
          }
          if (d < INF_D) {
            if (d < dMin) { best = a0; dMin = d; }
            for (j = head[a0]; ts[j] !== time; j = head[parent[j]]) { ts[j] = time; dist[j] = d; d -= 1; }
          }
        }
        if (best >= 0) { parent[o] = best; ts[o] = time; dist[o] = dMin + 1; continue; }
        // no parent: free the node, its children become orphans, neighbours with capacity become active
        for (let a0 = first[o]; a0 >= 0; a0 = next[a0]) {
          const j = head[a0];
          if (sink[j] !== isSink || parent[j] === FREE) continue;
          if ((isSink ? cap[a0] : cap[a0 ^ 1]) > 0) push(j);
          const a = parent[j];
          if (a !== TERMINAL && a !== ORPHAN && head[a] === o) { parent[j] = ORPHAN; orphans.push(j); }
        }
        parent[o] = FREE;
      }
    }
    this.parent = parent; this.sinkTree = sink;
    return this.flow;
  }
  isSource(i) { return this.parent[i] !== FREE && !this.sinkTree[i]; }
}

// ---- Gaussian mixture models ---------------------------------------------------------------------
class GMM {
  constructor(k) { this.k = k; this.comp = []; }
  learn(Z, idx, assign) {
    const k = this.k, sums = Array.from({ length: k }, () => ({ n: 0, m: [0, 0, 0], p: [0, 0, 0, 0, 0, 0, 0, 0, 0] }));
    for (const i of idx) {
      const s = sums[assign[i]], r = Z[i * 3], g = Z[i * 3 + 1], b = Z[i * 3 + 2];
      s.n += 1; s.m[0] += r; s.m[1] += g; s.m[2] += b;
      const v = [r, g, b];
      for (let p = 0; p < 3; p += 1) for (let q = 0; q < 3; q += 1) s.p[p * 3 + q] += v[p] * v[q];
    }
    const total = idx.length || 1;
    this.comp = sums.map((s) => {
      if (!s.n) return { w: 0 };
      const m = s.m.map((v) => v / s.n), c = new Float64Array(9);
      for (let p = 0; p < 3; p += 1) for (let q = 0; q < 3; q += 1) c[p * 3 + q] = s.p[p * 3 + q] / s.n - m[p] * m[q];
      for (let p = 0; p < 3; p += 1) c[p * 4] += 0.01;
      let det = c[0] * (c[4] * c[8] - c[5] * c[7]) - c[1] * (c[3] * c[8] - c[5] * c[6]) + c[2] * (c[3] * c[7] - c[4] * c[6]);
      if (det <= 1e-9) { for (let p = 0; p < 3; p += 1) c[p * 4] += 0.01; det = c[0] * (c[4] * c[8] - c[5] * c[7]) - c[1] * (c[3] * c[8] - c[5] * c[6]) + c[2] * (c[3] * c[7] - c[4] * c[6]); }
      const inv = [
        (c[4] * c[8] - c[5] * c[7]) / det, (c[2] * c[7] - c[1] * c[8]) / det, (c[1] * c[5] - c[2] * c[4]) / det,
        (c[5] * c[6] - c[3] * c[8]) / det, (c[0] * c[8] - c[2] * c[6]) / det, (c[2] * c[3] - c[0] * c[5]) / det,
        (c[3] * c[7] - c[4] * c[6]) / det, (c[1] * c[6] - c[0] * c[7]) / det, (c[0] * c[4] - c[1] * c[3]) / det,
      ];
      return { w: s.n / total, m, inv, norm: 1 / Math.sqrt(Math.max(det, 1e-12)) };
    });
  }
  compProb(c, r, g, b) {
    if (!c.w) return 0;
    const d0 = r - c.m[0], d1 = g - c.m[1], d2 = b - c.m[2], iv = c.inv;
    const q = d0 * (iv[0] * d0 + iv[1] * d1 + iv[2] * d2) + d1 * (iv[3] * d0 + iv[4] * d1 + iv[5] * d2) + d2 * (iv[6] * d0 + iv[7] * d1 + iv[8] * d2);
    return c.norm * Math.exp(-0.5 * q);
  }
  prob(r, g, b) { let p = 0; for (const c of this.comp) p += c.w * this.compProb(c, r, g, b); return p; }
  best(r, g, b) { let bi = 0, bp = -1; this.comp.forEach((c, i) => { const p = this.compProb(c, r, g, b); if (p > bp) { bp = p; bi = i; } }); return bi; }
}

// Seeded k-means++ start, a few Lloyd rounds: the initial component of every sample.
function kmeans(Z, idx, k, random, rounds = 8) {
  const assign = new Uint8Array(Z.length / 3);
  if (!idx.length) return assign;
  const centres = [];
  const pick = (i) => [Z[i * 3], Z[i * 3 + 1], Z[i * 3 + 2]];
  centres.push(pick(idx[Math.floor(random() * idx.length)]));
  const d2 = new Float64Array(idx.length).fill(Infinity);
  while (centres.length < k) {
    const c = centres[centres.length - 1];
    let sum = 0;
    idx.forEach((i, n) => { const d = (Z[i * 3] - c[0]) ** 2 + (Z[i * 3 + 1] - c[1]) ** 2 + (Z[i * 3 + 2] - c[2]) ** 2; if (d < d2[n]) d2[n] = d; sum += d2[n]; });
    let target = random() * sum, chosen = idx[idx.length - 1];
    for (let n = 0; n < idx.length; n += 1) { target -= d2[n]; if (target <= 0) { chosen = idx[n]; break; } }
    centres.push(pick(chosen));
  }
  for (let round = 0; round < rounds; round += 1) {
    const acc = centres.map(() => [0, 0, 0, 0]);
    for (const i of idx) {
      let best = 0, bd = Infinity;
      centres.forEach((c, j) => { const d = (Z[i * 3] - c[0]) ** 2 + (Z[i * 3 + 1] - c[1]) ** 2 + (Z[i * 3 + 2] - c[2]) ** 2; if (d < bd) { bd = d; best = j; } });
      assign[i] = best; const a = acc[best]; a[0] += Z[i * 3]; a[1] += Z[i * 3 + 1]; a[2] += Z[i * 3 + 2]; a[3] += 1;
    }
    acc.forEach((a, j) => { if (a[3]) centres[j] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
  }
  return assign;
}

// ---- GrabCut ---------------------------------------------------------------------------------------
const BGD = 0, FGD = 1, PR_BGD = 2, PR_FGD = 3;
const GRABCUT_DEFAULTS = Object.freeze({ workPx: 640, iterations: 5, band: 0.03, rect: [0.12, 0.03, 0.88, 0.97], components: 5, keep: 1, guideRadius: 0, guideEps: 0.0004, tighten: [40, 215], seed: 1 });

// Binary foreground at the working size from the colours Z (0..255 floats, 3 per pixel).
function grabcutSmall(Z, w, h, p) {
  const n = w * h, mask = new Uint8Array(n).fill(PR_BGD);
  const [rx0, ry0, rx1, ry1] = p.rect;
  for (let y = Math.floor(ry0 * h); y < Math.ceil(ry1 * h); y += 1) for (let x = Math.floor(rx0 * w); x < Math.ceil(rx1 * w); x += 1) mask[y * w + x] = PR_FGD;
  const band = Math.max(4, Math.round(Math.min(w, h) * p.band));
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (x < band || y < band || x >= w - band || y >= h - band) mask[y * w + x] = BGD;
  // n-link weights: gamma * exp(-beta |zi - zj|^2) / dist over 8 neighbours (each pair once)
  const gamma = 50, lambda = 9 * gamma;
  const dirs = [[1, 0, 1], [0, 1, 1], [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2]];
  let total = 0, pairs = 0;
  const diff = (i, j) => (Z[i * 3] - Z[j * 3]) ** 2 + (Z[i * 3 + 1] - Z[j * 3 + 1]) ** 2 + (Z[i * 3 + 2] - Z[j * 3 + 2]) ** 2;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) for (const [dx, dy] of dirs) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < w && ny < h) { total += diff(y * w + x, ny * w + nx); pairs += 1; }
  }
  const beta = total > 0 ? 1 / (2 * (total / pairs)) : 0;
  const random = R.seeded(p.seed);
  const fgIdx = () => { const out = []; for (let i = 0; i < n; i += 1) if (mask[i] === FGD || mask[i] === PR_FGD) out.push(i); return out; };
  const bgIdx = () => { const out = []; for (let i = 0; i < n; i += 1) if (mask[i] === BGD || mask[i] === PR_BGD) out.push(i); return out; };
  let fi = fgIdx(), bi = bgIdx();
  let assign = kmeans(Z, fi, p.components, random);
  const bgAssign = kmeans(Z, bi, p.components, random);
  for (const i of bi) assign[i] = bgAssign[i];
  const fg = new GMM(p.components), bg = new GMM(p.components);
  fg.learn(Z, fi, assign); bg.learn(Z, bi, assign);
  for (let iter = 0; iter < p.iterations; iter += 1) {
    fi = fgIdx(); bi = bgIdx();
    for (const i of fi) assign[i] = fg.best(Z[i * 3], Z[i * 3 + 1], Z[i * 3 + 2]);
    for (const i of bi) assign[i] = bg.best(Z[i * 3], Z[i * 3 + 1], Z[i * 3 + 2]);
    fg.learn(Z, fi, assign); bg.learn(Z, bi, assign);
    const graph = new Graph(n, n * 4);
    for (let i = 0; i < n; i += 1) {
      const r = Z[i * 3], g = Z[i * 3 + 1], b = Z[i * 3 + 2];
      if (mask[i] === BGD) graph.addTWeights(i, 0, lambda);
      else if (mask[i] === FGD) graph.addTWeights(i, lambda, 0);
      else graph.addTWeights(i, -Math.log(Math.max(bg.prob(r, g, b), 1e-300)), -Math.log(Math.max(fg.prob(r, g, b), 1e-300)));
    }
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) for (const [dx, dy, d] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const i = y * w + x, j = ny * w + nx, wt = (gamma / d) * Math.exp(-beta * diff(i, j));
      graph.addEdge(i, j, wt, wt);
    }
    graph.maxflow();
    let changed = 0;
    for (let i = 0; i < n; i += 1) if (mask[i] === PR_BGD || mask[i] === PR_FGD) { const v = graph.isSource(i) ? PR_FGD : PR_BGD; if (v !== mask[i]) changed += 1; mask[i] = v; }
    if (!changed) break;
  }
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) out[i] = mask[i] === FGD || mask[i] === PR_FGD ? 1 : 0;
  return { mask: out, band };
}

// Colour-guided filter (fast variant: coefficients at 1/s resolution, upsampled).
function guidedFilter(I, p, width, height, r, eps, s = 1) {
  const sw = Math.max(1, Math.round(width / s)), sh = Math.max(1, Math.round(height / s)), rs = Math.max(1, Math.round(r / s));
  const down = (plane) => (s === 1 ? plane : R.resizePlane(plane, width, height, sw, sh));
  const Ir = down(I[0]), Ig = down(I[1]), Ib = down(I[2]), P = down(p), n = sw * sh;
  const mean = (plane) => R.boxMean(plane, sw, sh, rs);
  const prod = (a, b) => { const o = new Float32Array(n); for (let i = 0; i < n; i += 1) o[i] = a[i] * b[i]; return o; };
  const mR = mean(Ir), mG = mean(Ig), mB = mean(Ib), mP = mean(P);
  const cRP = mean(prod(Ir, P)), cGP = mean(prod(Ig, P)), cBP = mean(prod(Ib, P));
  const vRR = mean(prod(Ir, Ir)), vRG = mean(prod(Ir, Ig)), vRB = mean(prod(Ir, Ib)), vGG = mean(prod(Ig, Ig)), vGB = mean(prod(Ig, Ib)), vBB = mean(prod(Ib, Ib));
  const aR = new Float32Array(n), aG = new Float32Array(n), aB = new Float32Array(n), bb = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const rr = vRR[i] - mR[i] * mR[i] + eps, rg = vRG[i] - mR[i] * mG[i], rb = vRB[i] - mR[i] * mB[i];
    const gg = vGG[i] - mG[i] * mG[i] + eps, gb = vGB[i] - mG[i] * mB[i], b2 = vBB[i] - mB[i] * mB[i] + eps;
    const cr = cRP[i] - mR[i] * mP[i], cg = cGP[i] - mG[i] * mP[i], cb = cBP[i] - mB[i] * mP[i];
    const i00 = gg * b2 - gb * gb, i01 = gb * rb - rg * b2, i02 = rg * gb - gg * rb, i11 = rr * b2 - rb * rb, i12 = rb * rg - rr * gb, i22 = rr * gg - rg * rg;
    const det = rr * i00 + rg * i01 + rb * i02;
    aR[i] = (i00 * cr + i01 * cg + i02 * cb) / det; aG[i] = (i01 * cr + i11 * cg + i12 * cb) / det; aB[i] = (i02 * cr + i12 * cg + i22 * cb) / det;
    bb[i] = mP[i] - aR[i] * mR[i] - aG[i] * mG[i] - aB[i] * mB[i];
  }
  const up = (plane) => (s === 1 ? plane : R.resizePlane(plane, sw, sh, width, height));
  const mAR = up(mean(aR)), mAG = up(mean(aG)), mAB = up(mean(aB)), mBB = up(mean(bb)), out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i += 1) out[i] = mAR[i] * I[0][i] + mAG[i] * I[1][i] + mAB[i] * I[2][i] + mBB[i];
  return out;
}

// Full-size soft alpha: GrabCut at workPx on the longest side, largest component(s) with holes
// filled, upsampled and refined by the colour-guided filter, then the soft band tightened.
function grabcutAlpha(planes, options = {}) {
  const p = { ...GRABCUT_DEFAULTS, ...options };
  const { width, height } = planes, scale = Math.min(1, p.workPx / Math.max(width, height));
  const w = Math.max(8, Math.round(width * scale)), h = Math.max(8, Math.round(height * scale));
  const sr = R.resizePlane(planes.R, width, height, w, h), sg = R.resizePlane(planes.G, width, height, w, h), sb = R.resizePlane(planes.B, width, height, w, h);
  const Z = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i += 1) { Z[i * 3] = sr[i] * 255; Z[i * 3 + 1] = sg[i] * 255; Z[i * 3 + 2] = sb[i] * 255; }
  const { mask, band } = grabcutSmall(Z, w, h, p);
  const kept = R.keepLargest(mask, w, h, p.keep);
  const small = Float32Array.from(kept.mask);
  const big = R.resizePlane(small, w, h, width, height);
  // edge refinement radius: 0.36% of the long side (the prototype: 12 px at 3400 px)
  const radius = p.guideRadius || Math.max(2, Math.round(0.0036 * Math.max(width, height)));
  const refined = guidedFilter([planes.R, planes.G, planes.B], big, width, height, radius, p.guideEps, Math.max(1, Math.floor(radius / 4)));
  const [lo, hi] = p.tighten.map((v) => v / 255), alpha = new Float32Array(width * height);
  let fg = 0;
  for (let i = 0; i < alpha.length; i += 1) { alpha[i] = Math.min(1, Math.max(0, (refined[i] - lo) / (hi - lo))); if (alpha[i] > 0.5) fg += 1; }
  return {
    alpha,
    params: p,
    measurements: { method: "grabcut+guided-filter", workSize: [w, h], scale: Number(scale.toFixed(4)), borderBandPx: band, guideRadiusPx: radius, components: kept.components, foregroundFraction: Number((fg / alpha.length).toFixed(4)) },
  };
}

// ---- edge measurements and defringe -------------------------------------------------------------
// Local backdrop colour: masked blur of the pixels well outside the matte.
function backdropEstimate(planes, alpha, sigma) {
  const { width, height } = planes, outside = new Uint8Array(alpha.length);
  for (let i = 0; i < alpha.length; i += 1) outside[i] = alpha[i] > 0.02 ? 1 : 0;
  const grown = R.dilate(outside, width, height, 4), bgm = new Float32Array(alpha.length);
  for (let i = 0; i < bgm.length; i += 1) bgm[i] = grown[i] ? 0 : 1;
  return [planes.R, planes.G, planes.B].map((c) => R.maskedBlur(c, bgm, width, height, sigma).value);
}

// Halo: soft-edge and outer-rim pixels whose shown colour is nearer (OKLab) the local backdrop than
// the local interior colour, expressed as a width in pixels along the contour.
function edgeMetrics(colour, alpha, width, height, B) {
  const n = alpha.length, hard = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) hard[i] = alpha[i] > 0.5 ? 1 : 0;
  const inner = R.erode(hard, width, height, 1);
  let contour = 0;
  for (let i = 0; i < n; i += 1) if (hard[i] && !inner[i]) contour += 1;
  const din = R.insideDistance(hard, width, height), core = new Float32Array(n);
  for (let i = 0; i < n; i += 1) core[i] = alpha[i] >= 0.98 && din[i] > 5 ? 1 : 0;
  const Fi = colour.map((c) => R.maskedBlur(c, core, width, height, 8).value);
  let soft = 0, bandCount = 0, contaminated = 0;
  for (let i = 0; i < n; i += 1) {
    const isSoft = alpha[i] > 0.02 && alpha[i] < 0.98;
    if (isSoft) soft += 1;
    if (!(isSoft || (hard[i] && din[i] <= 3))) continue;
    bandCount += 1;
    const I = R.srgbToOklab(colour[0][i], colour[1][i], colour[2][i]), b = R.srgbToOklab(B[0][i], B[1][i], B[2][i]), f = R.srgbToOklab(Fi[0][i], Fi[1][i], Fi[2][i]);
    const dB = Math.hypot(I[0] - b[0], I[1] - b[1], I[2] - b[2]), dF = Math.hypot(I[0] - f[0], I[1] - f[1], I[2] - f[2]), dBF = Math.hypot(b[0] - f[0], b[1] - f[1], b[2] - f[2]);
    if (dB < dF && dBF > 0.05) contaminated += 1;
  }
  const c = Math.max(contour, 1);
  return { contourPx: contour, softBandWidthPx: Number((soft / c).toFixed(2)), haloWidthPx: Number((contaminated / c).toFixed(2)), contaminatedFractionOfBand: Number((contaminated / Math.max(bandCount, 1)).toFixed(3)) };
}

const DEFRINGE_DEFAULTS = Object.freeze({ bgSigma: 25, chokePx: 1, rimPx: 3 });
// Un-mix the backdrop from soft pixels (F = (I - (1 - a) B) / a), choke the alpha, and pull the
// outer rim's colour from the interior. Returns new colour planes and alpha plus before/after.
function defringe(planes, alpha, options = {}) {
  const p = { ...DEFRINGE_DEFAULTS, ...options }, { width, height } = planes, n = alpha.length;
  const B = backdropEstimate(planes, alpha, p.bgSigma), I = [planes.R, planes.G, planes.B];
  const before = edgeMetrics(I, alpha, width, height, B);
  const F = I.map((c) => Float32Array.from(c));
  for (let i = 0; i < n; i += 1) {
    if (!(alpha[i] > 0.02 && alpha[i] < 0.98)) continue;
    const a = Math.max(alpha[i], 0.02);
    for (let c = 0; c < 3; c += 1) F[c][i] = Math.min(1, Math.max(0, (I[c][i] - (1 - a) * B[c][i]) / a));
  }
  let a2 = alpha;
  if (p.chokePx > 0) { a2 = R.blur(R.minFilter(alpha, width, height, p.chokePx), width, height, 0.7); for (let i = 0; i < n; i += 1) a2[i] = Math.min(1, Math.max(0, a2[i])); }
  const hard = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) hard[i] = a2[i] > 0.5 ? 1 : 0;
  const din = R.insideDistance(hard, width, height), core = new Float32Array(n);
  for (let i = 0; i < n; i += 1) core[i] = din[i] > p.rimPx && a2[i] >= 0.98 ? 1 : 0;
  const inner = F.map((c) => R.maskedBlur(c, core, width, height, 3));
  for (let i = 0; i < n; i += 1) {
    if (!(a2[i] > 0.01 && din[i] <= p.rimPx && inner[0].den[i] > 0.05)) continue;
    const w = Math.min(1, Math.max(0, 1 - din[i] / p.rimPx));
    for (let c = 0; c < 3; c += 1) F[c][i] = F[c][i] * (1 - w) + inner[c].value[i] * w;
  }
  const after = edgeMetrics(F, a2, width, height, B);
  return { R: F[0], G: F[1], B: F[2], A: a2, params: p, before, after };
}

// ---- sticker outline ---------------------------------------------------------------------------------
// Die-cut white edge, black line and an offset ink plate from an alpha plane: masks in the same frame.
function outlineMasks(alpha, width, height, { whitePx, blackPx, smoothPx, offset = [0, 0] }) {
  const hard = new Uint8Array(alpha.length);
  for (let i = 0; i < hard.length; i += 1) hard[i] = alpha[i] > 0.5 ? 1 : 0;
  const shape = (r) => {
    const grown = Float32Array.from(R.dilate(hard, width, height, r)), smooth = R.blur(grown, width, height, smoothPx), out = new Float32Array(hard.length);
    for (let i = 0; i < out.length; i += 1) out[i] = smooth[i] > 0.5 ? 1 : 0;
    return R.blur(out, width, height, 0.6);
  };
  const white = shape(whitePx), black = shape(whitePx + blackPx);
  const plate = offset[0] || offset[1] ? R.warpAffine(black, width, height, [[1, 0, offset[0]], [0, 1, offset[1]]]) : new Float32Array(hard.length);
  return { white, black, plate };
}

// Outline finish on a cut piece (RGBA image): padded so the edge, line and plate fit.
const OUTLINE_DEFAULTS = Object.freeze({ white: 0.011, black: 0.0037, smooth: 0.0056, offset: [0.011, 0.011], ink: [11, 11, 11] });
function outlineImage(image, options = {}) {
  const p = { ...OUTLINE_DEFAULTS, ...options }, long = Math.max(image.width, image.height);
  const whitePx = Math.max(2, Math.round(p.white * long)), blackPx = Math.max(1, Math.round(p.black * long)), smoothPx = Math.max(1, p.smooth * long);
  const offset = p.offset.map((v) => Math.round(v * long));
  const pad = Math.ceil(whitePx + blackPx + smoothPx * 2 + Math.max(Math.abs(offset[0]), Math.abs(offset[1])) + 2);
  const width = image.width + pad * 2, height = image.height + pad * 2, src = R.planesOf(image), alpha = new Float32Array(width * height);
  for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) alpha[(y + pad) * width + x + pad] = src.A[y * image.width + x];
  const { white, black, plate } = outlineMasks(alpha, width, height, { whitePx, blackPx, smoothPx, offset });
  const ink = p.ink.map((v) => v / 255), out = { width, height, R: new Float32Array(width * height), G: new Float32Array(width * height), B: new Float32Array(width * height), A: new Float32Array(width * height) };
  const over = (i, r, g, b, a) => {
    const da = out.A[i], oa = a + da * (1 - a);
    if (oa <= 0) return;
    out.R[i] = (r * a + out.R[i] * da * (1 - a)) / oa; out.G[i] = (g * a + out.G[i] * da * (1 - a)) / oa; out.B[i] = (b * a + out.B[i] * da * (1 - a)) / oa; out.A[i] = oa;
  };
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const i = y * width + x;
    over(i, ink[0], ink[1], ink[2], plate[i]);
    over(i, 0, 0, 0, black[i]);
    over(i, 1, 1, 1, white[i]);
    const ix = x - pad, iy = y - pad;
    if (ix >= 0 && iy >= 0 && ix < image.width && iy < image.height) { const s = iy * image.width + ix; over(i, src.R[s], src.G[s], src.B[s], src.A[s]); }
  }
  return { image: R.imageOf(out), padPx: pad, whitePx, blackPx, smoothPx: Number(smoothPx.toFixed(1)), offset };
}

module.exports = { DEFRINGE_DEFAULTS, GRABCUT_DEFAULTS, GMM, Graph, OUTLINE_DEFAULTS, backdropEstimate, defringe, edgeMetrics, grabcutAlpha, guidedFilter, outlineImage, outlineMasks };
