/* Tracking HUD overlay: the camera's own tracker, drawn sharp over the filmed screen.
 *
 * Port of `camera_tracker` in the `lens` crate of mrsarac/ff-tracking at cc7f4e1 (MIT, Copyright
 * (c) 2026 Mustafa Saraç): links between the boxes, a dot running along each link, coordinate
 * labels and brackets on the target. Every position is projected with the tracks module's
 * project(), the CPU copy of the lens camera, so each label states the real output pixel of its
 * box centre in this frame. draw() returns what it wrote, for the alignment self-test.
 *
 *   const overlay = FFTrackingOverlay.create(T, canvas);
 *   const drawn = overlay.draw(shot);   // { labels: [{ text, x, y, center, locked, box }], ... }
 */
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FFTrackingOverlay = api;
})(typeof self === "undefined" ? this : self, () => {
  const MONO = '"JetBrains Mono"';
  const LOCK_RED = "#ff3b30";
  // Labels are 19 px JetBrains Mono: 0.6 em advance, about 0.8 em above the baseline, 0.25 below.
  const LABEL_PX = 19;

  /** The label text for a projected box centre (whole output pixels). */
  function labelText(center, locked) {
    const xy = `x: ${Math.round(center[0])} y: ${Math.round(center[1])}`;
    return locked ? `LOCK ${xy}` : xy;
  }

  /** What the overlay draws for one frame, in output pixels of a resW x resH frame. */
  function layout(T, shot, resW = T.W, resH = T.H) {
    const t = T.track(shot.shotIndex, shot.shotFrame);
    const f = shot.shotFrame;
    const ink = shot.palette === "paper" ? "#141414" : "#ffffff";
    const proj = (q) => T.project(shot, q, resW, resH);
    const centers = t.boxes.map((b) => proj(T.center(b)));
    const lines = [];
    const dots = [];
    const labels = [];
    const brackets = [];

    // Tails run off the frame: aim at a point on the screen plane, then extend on screen.
    for (const [a, b] of t.tails) {
      const mid = [a[0] + (b[0] - a[0]) * 0.12, a[1] + (b[1] - a[1]) * 0.12];
      const pa = proj(a);
      const pm = proj(mid);
      if (!pa || !pm) continue;
      const dx = pm[0] - pa[0];
      const dy = pm[1] - pa[1];
      const len = Math.max(Math.hypot(dx, dy), 1e-3);
      lines.push({ from: pa, to: [pa[0] + (dx / len) * 3000, pa[1] + (dy / len) * 3000], color: ink, width: 1.1, opacity: 0.7 });
    }

    for (let k = 1; k < centers.length; k += 1) {
      const a = centers[k - 1];
      const b = centers[k];
      if (!a || !b) continue;
      const p = (f * 0.17 + k * 0.31) % 1;
      lines.push({ from: a, to: b, color: ink, width: 1.3, opacity: 1 });
      dots.push({ at: [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p], r: 3, color: ink });
    }

    // Labels alternate above and below their boxes and skip a slot that is already taken.
    const taken = [];
    t.boxes.forEach((b, k) => {
      const below = k % 2 === 1 && !b.locked;
      const c = centers[k];
      const corner = proj(below ? [b.x, b.y + b.h] : [b.x, b.y]);
      if (!c || !corner) return;
      const y = below ? corner[1] + 24 : corner[1] - 9;
      const free = b.locked || taken.every(([tx, ty]) => Math.abs(tx - corner[0]) > 190 || Math.abs(ty - y) > 26);
      const color = b.locked ? LOCK_RED : ink;
      dots.push({ at: c, r: 3.2, color });
      if (!free) return;
      taken.push([corner[0], y]);
      labels.push({ text: labelText(c, b.locked), x: corner[0], y, center: c, locked: b.locked, box: k, color });
    });

    // Brackets around the target box, in screen space.
    const last = t.boxes[t.boxes.length - 1];
    if (last) {
      const pts = [[last.x, last.y], [last.x + last.w, last.y], [last.x + last.w, last.y + last.h], [last.x, last.y + last.h]].map(proj);
      if (pts.every(Boolean)) {
        const color = t.lock ? LOCK_RED : ink;
        const grow = t.lock ? 10 : 6;
        const cx = pts.reduce((sum, p) => sum + p[0], 0) / 4;
        const cy = pts.reduce((sum, p) => sum + p[1], 0) / 4;
        pts.forEach((p, i) => {
          const ox = p[0] - cx;
          const oy = p[1] - cy;
          const l = Math.max(Math.hypot(ox, oy), 1e-3);
          const q = [p[0] + (ox / l) * grow, p[1] + (oy / l) * grow];
          const arm = (nb) => {
            const dx = nb[0] - p[0];
            const dy = nb[1] - p[1];
            const ln = Math.max(Math.hypot(dx, dy), 1e-3);
            const a = Math.min(18, ln * 0.4);
            return [q[0] + (dx / ln) * a, q[1] + (dy / ln) * a];
          };
          brackets.push({ points: [arm(pts[(i + 3) % 4]), q, arm(pts[(i + 1) % 4])], color });
        });
      }
    }
    return { lines, dots, labels, brackets, opacity: 0.92, lock: t.lock };
  }

  /** A label's text box in output pixels: [x0, y0, x1, y1]. */
  function labelRect(label) {
    return [label.x, label.y - LABEL_PX * 0.8, label.x + label.text.length * LABEL_PX * 0.6, label.y + LABEL_PX * 0.25];
  }

  /** Whether the lock of typing shot si reads: on each lock frame the locked box and its LOCK label
   * must be whole in the frame and no other label may cover that label; legible when one lock frame
   * has all three. `frames` lists what failed on each lock frame. */
  function lockLegibility(T, si) {
    const span = (r) => `x ${Math.round(r[0])}..${Math.round(r[2])}, y ${Math.round(r[1])}..${Math.round(r[3])}`;
    const inFrame = (r) => r[0] >= 0 && r[1] >= 0 && r[2] <= T.W && r[3] <= T.H;
    const overlap = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    const frames = [];
    for (let f = T.LOCK_AT; f < T.LOCK_AT + T.LOCK_FRAMES; f += 1) {
      const frame = si * T.SHOT_FRAMES + f;
      const shot = T.shot(frame);
      const boxes = T.track(si, f).boxes;
      const target = boxes[boxes.length - 1];
      const bounds = T.filmedBounds(shot, [target.x, target.y, target.w, target.h]);
      const labels = layout(T, shot).labels;
      const lock = labels.find((label) => label.locked && label.box === boxes.length - 1);
      const issues = [];
      if (!bounds || !inFrame(bounds)) issues.push(`the locked box spans ${bounds ? span(bounds) : "behind the camera"}`);
      if (!lock) issues.push("no LOCK label is drawn");
      else {
        const rect = labelRect(lock);
        if (!inFrame(rect)) issues.push(`the LOCK label spans ${span(rect)}`);
        const covered = labels.filter((label) => label !== lock && overlap(rect, labelRect(label))).length;
        if (covered) issues.push(`${covered} other label${covered > 1 ? "s overlap" : " overlaps"} the LOCK label`);
      }
      frames.push({ frame, issues });
    }
    return { legible: frames.some((entry) => !entry.issues.length), frames };
  }

  function create(T, canvas, options = {}) {
    // CPU raster, as in flat.js: GPU canvas text is not the same pixels on every seek order.
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let pixelRatio = 0;
    function resize() {
      const ratio = options.pixelRatio || (typeof devicePixelRatio === "number" && devicePixelRatio > 0 ? devicePixelRatio : 1);
      if (ratio === pixelRatio) return;
      pixelRatio = ratio;
      canvas.width = Math.round(T.W * ratio);
      canvas.height = Math.round(T.H * ratio);
    }

    function clear() {
      resize();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    /** Draws the tracker for a shot; returns the layout it drew (output pixels at T.W x T.H). */
    function draw(shot) {
      clear();
      const drawn = layout(T, shot);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.globalAlpha = drawn.opacity;
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      for (const line of drawn.lines) {
        ctx.globalAlpha = drawn.opacity * line.opacity;
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.beginPath();
        ctx.moveTo(line.from[0], line.from[1]);
        ctx.lineTo(line.to[0], line.to[1]);
        ctx.stroke();
      }
      ctx.globalAlpha = drawn.opacity;
      for (const dot of drawn.dots) {
        ctx.fillStyle = dot.color;
        ctx.beginPath();
        ctx.arc(dot.at[0], dot.at[1], dot.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = `400 ${LABEL_PX}px ${MONO}`;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      for (const label of drawn.labels) {
        ctx.fillStyle = label.color;
        ctx.fillText(label.text, label.x, label.y);
      }
      ctx.lineWidth = 2.4;
      for (const bracket of drawn.brackets) {
        ctx.strokeStyle = bracket.color;
        ctx.beginPath();
        ctx.moveTo(bracket.points[0][0], bracket.points[0][1]);
        ctx.lineTo(bracket.points[1][0], bracket.points[1][1]);
        ctx.lineTo(bracket.points[2][0], bracket.points[2][1]);
        ctx.stroke();
      }
      return drawn;
    }

    /** Shows a named failure instead of a picture (WebGL2 missing). */
    function error(message) {
      clear();
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.fillStyle = "#200000";
      ctx.fillRect(0, 0, T.W, T.H);
      ctx.fillStyle = LOCK_RED;
      ctx.font = `700 40px ${MONO}`;
      ctx.fillText("tracking-hud: no film rendered", 120, 480);
      ctx.font = `400 26px ${MONO}`;
      ctx.fillText(String(message).slice(0, 110), 120, 540);
    }

    resize();
    return { canvas, draw, clear, error };
  }

  return { create, layout, labelRect, labelText, lockLegibility };
});
