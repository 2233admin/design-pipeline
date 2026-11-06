/* Procedural structure plates: abstract architecture drawn as ink on paper, on a canvas (the show-mode
   fill of an art slot, never a figure).
   No figures, no vehicles, no objects: only walls, frames, slabs, beams and cables, with
   screentone, ruled hatching and jittered pen lines. draw(canvas, opts) is deterministic per seed. */
(function (root) {
  "use strict";

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const lp = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
  const quadPt = (Q, u, v) => lp(lp(Q[0], Q[1], u), lp(Q[3], Q[2], u), v);
  const sub = (Q, u0, u1, v0, v1) => [quadPt(Q, u0, v0), quadPt(Q, u1, v0), quadPt(Q, u1, v1), quadPt(Q, u0, v1)];

  const INKS = {
    print: { paper: "#d2d7d8", ink: "#0a0b0b", tone: "#0a0b0b", scratch: "rgba(230,232,231,0.8)", light: "#ffffff" },
    night: { paper: "#7c8183", ink: "#050606", tone: "#050606", scratch: "rgba(200,214,214,0.5)", light: "#e8fbfb" },
  };

  // Screentone patterns: dots on a 45-degree screen, one per tone step.
  function tones(ctx, inks, pitch) {
    const out = [];
    for (let i = 0; i <= 8; i++) {
      const v = i / 8, c = document.createElement("canvas"), n = Math.round(pitch * 2);
      c.width = n; c.height = n;
      const g = c.getContext("2d");
      g.fillStyle = inks.paper; g.fillRect(0, 0, n, n);
      if (v > 0) {
        g.fillStyle = inks.tone;
        const r = Math.sqrt(v * pitch * pitch / Math.PI) * 0.98;
        for (const [x, y] of [[0, 0], [n, 0], [0, n], [n, n], [n / 2, n / 2]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
      }
      out.push(ctx.createPattern(c, "repeat"));
    }
    return out;
  }

  function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }

  // A pen line: short jittered segments with varying width (never a perfect vector stroke).
  function pen(ctx, a, b, w, R, j = 0.7) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / 26));
    const nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1);
    let p = a;
    for (let i = 1; i <= n; i++) {
      const t = i / n, o = i === n ? 0 : (R() - 0.5) * j;
      const q = [lerp(a[0], b[0], t) + nx * o, lerp(a[1], b[1], t) + ny * o];
      ctx.lineWidth = Math.max(0.35, w * (0.75 + R() * 0.5));
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      p = q;
    }
    if (R() < 0.08) { ctx.lineWidth = w * 0.6; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] + (b[0] - a[0]) / (len || 1) * 6, b[1] + (b[1] - a[1]) / (len || 1) * 6); ctx.stroke(); }
  }
  function penPoly(ctx, Q, w, R) { for (let i = 0; i < Q.length; i++) pen(ctx, Q[i], Q[(i + 1) % Q.length], w, R); }

  // Ruled hatch across a quad, lines running along u (along=true) or v.
  function hatch(ctx, Q, n, along, w, R, cross) {
    for (let i = 1; i < n; i++) {
      const t = (i + (R() - 0.5) * 0.5) / n;
      pen(ctx, along ? quadPt(Q, t, 0) : quadPt(Q, 0, t), along ? quadPt(Q, t, 1) : quadPt(Q, 1, t), w, R, 0.5);
    }
    if (cross) for (let i = 1; i < n; i += 2) {
      const t = (i + (R() - 0.5) * 0.5) / n;
      pen(ctx, along ? quadPt(Q, 0, t) : quadPt(Q, t, 0), along ? quadPt(Q, 1, t) : quadPt(Q, t, 1), w * 0.8, R, 0.5);
    }
  }

  // Fill a quad with screentone v (0..1) or solid ink (v >= 1).
  function fillTone(ctx, S, Q, v, inks) {
    if (v >= 0.995) ctx.fillStyle = inks.ink;
    else ctx.fillStyle = S[Math.max(0, Math.min(8, Math.round(v * 8)))];
    poly(ctx, Q); ctx.fill();
  }

  // One wall face subdivided into panels with ink treatments. light: 0 (lit) .. 1 (shadow face).
  function face(ctx, S, inks, Q, depth, light, lw, R) {
    const base = Math.min(1, 0.04 + light * 0.4 + Math.pow(depth, 1.25) * 0.9);
    fillTone(ctx, S, Q, base, inks);
    ctx.strokeStyle = inks.ink;
    const cols = 1 + Math.floor(R() * (2 + depth * 6)), rows = 1 + Math.floor(R() * (1 + depth * 3));
    const cuts = [0];
    for (let i = 1; i < cols; i++) cuts.push(Math.min(0.98, Math.max(0.02, i / cols + (R() - 0.5) * 0.7 / cols)));
    cuts.push(1);
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const cell = sub(Q, cuts[c], cuts[c + 1], r / rows, (r + 1) / rows);
      const p = R();
      if (p < 0.14) {
        fillTone(ctx, S, sub(cell, 0.06, 0.94, 0.1, 0.9), 1, inks);
        ctx.strokeStyle = inks.scratch; pen(ctx, quadPt(cell, 0.06, 0.1), quadPt(cell, 0.94, 0.1), lw * 0.4, R); ctx.strokeStyle = inks.ink;
      } else if (p < 0.36) {
        hatch(ctx, cell, 6 + Math.floor(R() * 22 * (1 - depth * 0.5)), R() < 0.5, lw * 0.32, R, R() < 0.25 + light * 0.6);
        penPoly(ctx, cell, lw * 0.6, R);
      } else if (p < 0.48) {
        const n = 3 + Math.floor(R() * 9);
        for (let i = 0; i < n; i++) {
          const b = sub(cell, (i + 0.18) / n, (i + 0.82) / n, 0.28 + R() * 0.15, 0.62 + R() * 0.25);
          if (R() < 0.45) fillTone(ctx, S, b, 1, inks); else penPoly(ctx, b, lw * 0.35, R);
        }
      } else if (p < 0.62) {
        fillTone(ctx, S, cell, Math.min(0.9, base + 0.25), inks);
        const n = 2 + Math.floor(R() * 3), u = 0.15 + R() * 0.6;
        for (let i = 0; i < n; i++) pen(ctx, quadPt(cell, u + i * 0.02, 0), quadPt(cell, u + i * 0.02, 1), lw * 0.5, R);
        penPoly(ctx, cell, lw * 0.45, R);
      } else {
        penPoly(ctx, cell, lw * 0.45, R);
      }
    }
    // drag marks: dry-brush streaks down the face
    const streaks = Math.floor(R() * 7 * (1 - depth));
    for (let i = 0; i < streaks; i++) {
      const s = quadPt(Q, R(), R() * 0.5), h = 10 + R() * 70 * (1 - depth);
      for (let k = 0; k < 3; k++) pen(ctx, [s[0] + k * 1.6, s[1]], [s[0] + k * 1.6 + (R() - 0.5) * 2, s[1] + h * (0.4 + R() * 0.6)], lw * 0.3, R);
    }
  }

  function cableBundle(ctx, inks, a, b, sag, n, lw, R) {
    ctx.strokeStyle = inks.ink;
    for (let i = 0; i < n; i++) {
      const o = (i - n / 2) * lw * (1.6 + R() * 1.6), s = sag * (0.8 + R() * 0.4);
      ctx.lineWidth = Math.max(0.4, lw * (0.5 + R() * 1.1));
      ctx.beginPath(); ctx.moveTo(a[0], a[1] + o);
      ctx.quadraticCurveTo((a[0] + b[0]) / 2 + (R() - 0.5) * 30, (a[1] + b[1]) / 2 + s + o, b[0], b[1] + o * 0.5);
      ctx.stroke();
    }
  }

  // Shaft: a deep rectangular well in one-point perspective, rolled and off-centre, with a
  // foreground slab crossing it, beams at depth, cables and one light slit far down.
  function shaft(ctx, W, H, R, inks, S, o) {
    const vp = [W * (o.vx ?? 0.43), H * (o.vy ?? 0.4)];
    const N = o.depth || 26, ratio = o.ratio || 0.86;
    const roll = (o.roll ?? -4) * Math.PI / 180;
    ctx.fillStyle = inks.ink; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(vp[0], vp[1]); ctx.rotate(roll); ctx.translate(-vp[0], -vp[1]);
    const F = [];
    let s = 1.35;
    for (let k = 0; k <= N; k++) {
      F.push([[vp[0] - vp[0] * s * 1.1, vp[1] - vp[1] * s], [vp[0] + (W - vp[0]) * s * 0.92, vp[1] - vp[1] * s], [vp[0] + (W - vp[0]) * s * 0.92, vp[1] + (H - vp[1]) * s], [vp[0] - vp[0] * s * 1.1, vp[1] + (H - vp[1]) * s]]);
      s *= ratio * (0.92 + R() * 0.14);
    }
    const lit = [0.15, 0.55, 0.95, 0.35];
    const ribs = Array.from({ length: o.ribs ?? 5 }, () => ({ f: Math.floor(R() * 4), u: 0.05 + R() * 0.85, w: 0.012 + R() * 0.035, from: Math.floor(R() * 3), to: 6 + Math.floor(R() * N * 0.6) })); // top, right, bottom, left faces: the right side is the shadow side
    const beams = new Set(o.beams || [5, 9, 15]);
    for (let k = N - 1; k >= 0; k--) {
      const A = F[k], B = F[k + 1], depth = Math.pow(k / N, 0.75), lw = Math.max(0.45, (o.lw || 3) * Math.pow(ratio, k * 0.55));
      const faces = [[A[0], A[1], B[1], B[0]], [A[1], A[2], B[2], B[1]], [A[2], A[3], B[3], B[2]], [A[3], A[0], B[0], B[3]]];
      faces.forEach((Q, i) => face(ctx, S, inks, Q, depth, lit[i], lw, R));
      for (const rb of ribs) if (k >= rb.from && k <= rb.to) {
        const Q = sub(faces[rb.f], rb.u, rb.u + rb.w, 0, 1);
        fillTone(ctx, S, Q, 1, inks);
        ctx.strokeStyle = inks.scratch; pen(ctx, Q[0], Q[3], lw * 0.45, R); ctx.strokeStyle = inks.ink;
        if (R() < 0.5) hatch(ctx, sub(faces[rb.f], rb.u + rb.w, rb.u + rb.w * 2.2, 0, 1), 4, true, lw * 0.3, R);
      }
      ctx.strokeStyle = inks.ink; if (k % 3 === 0) penPoly(ctx, B, lw * 1.1, R); else for (let e = 0; e < 4; e++) if (R() < 0.5) pen(ctx, B[e], lp(B[e], B[(e + 1) % 4], 0.3 + R() * 0.7), lw * 0.8, R);
      // long converging rules (structure seams running into depth)
      for (let i = 0; i < 6; i++) { const c = Math.floor(R() * 4), t = R(); pen(ctx, lp(A[c], A[(c + 1) % 4], t), lp(B[c], B[(c + 1) % 4], t), lw * (0.3 + R() * 0.5), R); }
      if (k === Math.floor(N * 0.8) && o.light !== false) {
        ctx.fillStyle = inks.light;
        const y = lerp(B[0][1], B[3][1], 0.58), x0 = lerp(B[0][0], B[1][0], 0.18);
        ctx.fillRect(x0, y, (B[1][0] - B[0][0]) * 0.55, Math.max(1.5, lw * 1.6));
      }
      if (beams.has(k)) {
        const t0 = 0.3 + R() * 0.45, th = 0.05 + R() * 0.05;
        const Q = [lp(A[0], A[3], t0), lp(A[1], A[2], t0), lp(A[1], A[2], t0 + th), lp(A[0], A[3], t0 + th)];
        const U = [Q[3], Q[2], lp(B[1], B[2], t0 + th), lp(B[0], B[3], t0 + th)];
        fillTone(ctx, S, U, 1, inks);
        fillTone(ctx, S, Q, 0.1 + depth * 0.5, inks);
        const segs = 10 + Math.floor(R() * 16);
        ctx.strokeStyle = inks.ink;
        for (let i = 1; i < segs; i++) pen(ctx, quadPt(Q, i / segs, 0), quadPt(Q, i / segs, 1), lw * 0.5, R);
        hatch(ctx, sub(Q, 0, 1, 0.55, 1), 4, false, lw * 0.35, R);
        penPoly(ctx, Q, lw * 1.2, R);
      }
      if (R() < 0.42) {
        const a = lp(A[3], A[0], 0.2 + R() * 0.6), b = lp(A[1], A[2], 0.1 + R() * 0.6);
        cableBundle(ctx, inks, a, b, Math.abs(b[0] - a[0]) * (0.05 + R() * 0.2), 1 + Math.floor(R() * 7), Math.max(0.45, lw * 0.7), R);
      }
    }
    ctx.restore();
    // foreground slab across the bottom: huge, close, black underside
    if (o.slab !== false && o.slab !== 0) {
      const y0 = H * (o.slabY ?? 0.8), y1 = y0 + H * 0.07;
      const top = [[-20, y0], [W + 20, y0 - H * 0.05], [W + 20, y1 - H * 0.05], [-20, y1]];
      fillTone(ctx, S, top, 0.12, inks);
      ctx.strokeStyle = inks.ink;
      const segs = 7 + Math.floor(R() * 5);
      for (let i = 1; i < segs; i++) pen(ctx, quadPt(top, i / segs + (R() - 0.5) * 0.04, 0), quadPt(top, i / segs, 1), 2.2, R);
      for (let i = 0; i < 26; i++) { const q = sub(top, R(), R() + 0.03, 0.2 + R() * 0.3, 0.6 + R() * 0.3); if (R() < 0.5) fillTone(ctx, S, q, 1, inks); else penPoly(ctx, q, 1, R); }
      hatch(ctx, sub(top, 0, 1, 0.7, 1), 3, false, 1, R);
      penPoly(ctx, top, 3.2, R);
      fillTone(ctx, S, [top[3], top[2], [W + 20, H + 20], [-20, H + 20]], 1, inks);
      ctx.strokeStyle = inks.scratch;
      for (let i = 0; i < 40; i++) { const x = R() * W, y = y1 + 6 + R() * (H - y1); pen(ctx, [x, y], [x + 30 + R() * 160, y + (R() - 0.5) * 4], 0.6, R); }
    }
  }

  function draw(canvas, opts = {}) {
    const W = canvas.width, H = canvas.height, ctx = canvas.getContext("2d");
    const R = rng(opts.seed || 7), inks = INKS[opts.ink || "print"];
    const S = tones(ctx, inks, opts.pitch || Math.max(2.6, W / 640));
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    shaft(ctx, W, H, R, inks, S, opts);
    ctx.restore();
  }

  root.StructurePlates = { draw, rng, INKS };
})(typeof window !== "undefined" ? window : globalThis);
