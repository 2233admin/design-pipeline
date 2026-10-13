/* Tracking HUD flat pass: the agent's screen on Canvas 2D, filmed by the lens in the same frame.
 *
 * Port of the `flat` crate of mrsarac/ff-tracking at cc7f4e1 (MIT, Copyright (c) 2026 Mustafa
 * Saraç). White on black only: the lens maps brightness to each shot's palette, so the one colour
 * here is pure red (#ff0000), which marks a locked box and survives every palette. Drawn in the
 * tracks module's logical space at lens.flatScale (2x) so the lens can magnify it. The hero line
 * is drawn one glyph per cell, so tracker coordinates are exact.
 *
 *   const flat = FFTrackingFlat.create(T, canvas);   // T: FFTracking.create(config)
 *   flat.draw(frame, { omitGlyph: index })            // omitGlyph: alignment self-test only
 */
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FFTrackingFlat = api;
})(typeof self === "undefined" ? this : self, () => {
  const MONO = '"JetBrains Mono"';
  const WHITE = "#ffffff";
  const LOG_GRAY = "#5c5c5c";
  const UI_GRAY = "#3a3a3a";
  const RED = "#ff0000";
  const RT2 = Math.SQRT1_2;

  function group(n) {
    const s = String(n);
    let out = "";
    for (let i = 0; i < s.length; i += 1) {
      if (i > 0 && (s.length - i) % 3 === 0) out += ",";
      out += s[i];
    }
    return out;
  }

  function create(T, canvas) {
    const scale = T.lens.flatScale;
    canvas.width = Math.round(T.W * scale);
    canvas.height = Math.round(T.H * scale);
    // CPU raster (willReadFrequently): GPU-rasterized canvas text depends on the glyph-atlas state
    // left by earlier frames, so the same frame differed between seek orders and processes.
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    const rnd = T.rnd;
    const cfg = T.config;

    function rect(x, y, w, h, fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    }

    function circle(x, y, r) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }

    function text(str, x, y, font, fill) {
      ctx.font = font;
      ctx.fillStyle = fill;
      ctx.fillText(str, x, y);
    }

    // Window title and status bar: tiny, out of focus most of the time, but they give the tilted
    // camera something to blur at the edges. The token count and ms/frame are invented figures
    // (upstream's); a config without screen.tokens shows only the true frame and scene counters.
    function chrome(si, f) {
      const g = si * T.SHOT_FRAMES + f;
      const counters = `frame ${String(g + 1).padStart(3, "0")}/${T.TOTAL_FRAMES}  ·  scene ${String(si + 1).padStart(2, "0")}/${T.SHOTS}`;
      const invented = typeof cfg.screen.tokens === "number" ? `tokens ${group(cfg.screen.tokens + g * 9 + Math.floor(rnd(5, g) * 7))}  ·  ${String(10 + Math.floor(rnd(6, g) * 5)).padStart(2)} ms/frame  ·  ` : "";
      const status = invented + counters;
      const progress = (1720 * (g + 1)) / T.TOTAL_FRAMES;
      ctx.fillStyle = UI_GRAY;
      for (const cx of [104, 128, 152]) {
        circle(cx, 30, 7);
        ctx.fill();
      }
      text(cfg.screen.title, 190, 36, `400 18px ${MONO}`, LOG_GRAY);
      rect(100, 48, 1720, 1, UI_GRAY);
      rect(100, 1016, 1720, 1, UI_GRAY);
      rect(100, 1016, progress, 3, LOG_GRAY);
      text(status, 100, 1050, `400 18px ${MONO}`, LOG_GRAY);
    }

    function log(si) {
      for (const row of T.logRows(si)) text(row.text, row.x, row.y, `400 ${T.LOG_SIZE}px ${MONO}`, row.text.startsWith("›") ? "#7a7a7a" : LOG_GRAY);
      T.icons(si).forEach(([x, y, sz], k) => {
        ctx.beginPath();
        ctx.roundRect(x, y, sz, sz, 7);
        ctx.fillStyle = "#151515";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#4a4a4a";
        ctx.stroke();
        // Three kinds of gutter icon: dots, a page, a ring.
        if (k % 3 === 0) {
          ctx.fillStyle = "#8a8a8a";
          for (const dx of [9, 15, 21]) {
            circle(x + dx, y + 15, 2.6);
            ctx.fill();
          }
        } else if (k % 3 === 1) {
          ctx.strokeStyle = "#8a8a8a";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x + 9, y + 6, 12, 18, 1.5);
          ctx.moveTo(x + 12, y + 12);
          ctx.lineTo(x + 18, y + 12);
          ctx.moveTo(x + 12, y + 17);
          ctx.lineTo(x + 18, y + 17);
          ctx.stroke();
        } else {
          ctx.strokeStyle = "#8a8a8a";
          ctx.lineWidth = 2.4;
          circle(x + 15, y + 15, 7);
          ctx.stroke();
        }
      });
    }

    // The hero line, one glyph per cell so the tracker's coordinates are exact.
    function hero(si, f, omitGlyph) {
      const s = T.shots[si];
      const n = T.visible(si, f);
      ctx.font = `700 ${s.size}px ${MONO}`;
      for (let i = 0; i < n; i += 1) {
        if (i === omitGlyph) continue;
        // The newest glyph arrives overexposed and settles.
        const fresh = n - 1 - i < 2 && f <= T.TYPE_END && s.kind === "typing";
        ctx.fillStyle = fresh ? "#ffffff" : "#e9e9e9";
        ctx.fillText(s.chars[i], T.cell(si, i)[0], s.hero[1]);
      }
      const [cx, cy, cw, ch] = T.cell(si, s.kind === "cursor" ? 2 : n);
      if (f <= T.TYPE_END || Math.floor(f / 3) % 2 === 0) rect(cx + cw * 0.12, cy, cw * 0.62, ch, WHITE);
    }

    function done(f) {
      const [cx, cy, w, h] = T.donePill();
      const [ix, iy] = T.doneIcon();
      const [lx, ly] = T.doneLabel();
      const grow = T.easeOut(Math.min(f / 5, 1));
      const pw = 80 + (w - 80) * grow;
      const ph = 80 + (h - 80) * grow;
      ctx.beginPath();
      ctx.roundRect(cx - pw * 0.5, cy - ph * 0.5, pw, ph, ph * 0.5);
      ctx.fillStyle = "#1d1d1d";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = WHITE;
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(cx - pw * 0.5 - 14, cy - ph * 0.5 - 14, pw + 28, ph + 28, ph * 0.5 + 14);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#6a6a6a";
      ctx.stroke();
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0, (f - 2) / 3));
      circle(ix, iy, 30);
      ctx.fillStyle = "#f2f2f2";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ix - 14, iy + 1);
      ctx.lineTo(ix - 4, iy + 12);
      ctx.lineTo(ix + 16, iy - 12);
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111111";
      ctx.stroke();
      text(cfg.done?.label ?? "Done", lx, ly, `700 80px ${MONO}`, WHITE);
      ctx.restore();
    }

    // Diagonal stripes like the upstream SVG pattern: period 7 rotated 45 degrees, stripe width
    // `stripe`, anchored at the logical origin and clipped to the box.
    function hatch(b, stripe, fill, difference) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x, b.y, b.w, b.h);
      ctx.clip();
      if (difference) ctx.globalCompositeOperation = "difference";
      ctx.rotate(Math.PI / 4);
      const us = [];
      const vs = [];
      for (const [x, y] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]) {
        us.push((x + y) * RT2);
        vs.push((y - x) * RT2);
      }
      const v0 = Math.min(...vs) - 1;
      const v1 = Math.max(...vs) + 1;
      ctx.fillStyle = fill;
      for (let k = Math.floor(Math.min(...us) / 7) - 1; k * 7 <= Math.max(...us); k += 1) ctx.fillRect(k * 7, v0, stripe, v1 - v0);
      ctx.restore();
    }

    // The tracker's boxes, on the screen itself so they take the LED grid and the blur. Labels,
    // links and brackets belong to the camera and are drawn after the lens (overlay.js).
    function tracker(si, f) {
      for (const b of T.track(si, f).boxes) {
        // Hatch in difference mode: stripes turn dark where they cross a glyph.
        if (b.hatch) hatch(b, b.locked ? 3.2 : 2.6, b.locked ? RED : WHITE, !b.locked);
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = b.locked ? RED : WHITE;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      }
    }

    /** Draws video frame `frame`; omitGlyph leaves one hero glyph out (alignment self-test). */
    function draw(frame, options = {}) {
      const [si, f] = T.split(frame);
      const s = T.shots[si];
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      chrome(si, f);
      log(si);
      if (s.kind === "typing" || s.kind === "cursor") hero(si, f, options.omitGlyph);
      else if (s.kind === "done") done(f);
      tracker(si, f);
      return { shotIndex: si, shotFrame: f };
    }

    return { canvas, draw };
  }

  return { create, group };
});
