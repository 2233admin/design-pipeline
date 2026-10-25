((root, factory) => {
  
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.MotionGameParts = root.MotionGameParts || {};
    root.MotionGameParts.material = api;
  }
})(typeof globalThis === 'undefined' ? this : globalThis, () => {
  

  // Original, bounded material illustrations. No solver, imported texture, or clock.
  var W = 480, H = 300, TAU = Math.PI * 2;
  var recipes = {};
  function clamp(n, lo, hi) { return Math.max(lo === undefined ? 0 : lo, Math.min(hi === undefined ? 1 : hi, n)); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t); return t * t * (3 - 2 * t); }
  function phase(t, a, b) { return clamp((t - a) / (b - a)); }
  function random(seed, i) {
    var x = ((seed >>> 0) ^ Math.imul(i + 1, 2654435761)) >>> 0;
    x ^= x >>> 16; x = Math.imul(x, 2246822507); x ^= x >>> 13;
    x = Math.imul(x, 3266489909); x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }
  function number(min, max) { return { min: min, max: max }; }
  function integer(min, max) { return { min: min, max: max, integer: true }; }
  function validate(p, schema, id) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new TypeError(id + ': parameters must be an object');
    Reflect.ownKeys(p).forEach((key) => {
      if (typeof key !== 'string' || !Object.hasOwn(schema, key)) throw new TypeError(id + ': unsupported parameter ' + String(key));
    });
    Object.keys(schema).forEach((key) => {
      if (!Object.hasOwn(p, key)) throw new TypeError(id + ': missing parameter ' + key);
      var rule = schema[key], value = p[key];
      if (Array.isArray(rule)) {
        if (rule.indexOf(value) === -1) throw new TypeError(id + ': unsupported ' + key + ' value');
      } else if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min || value > rule.max || (rule.integer && !Number.isInteger(value))) {
        throw new RangeError(id + ': ' + key + ' must be ' + (rule.integer ? 'an integer ' : 'finite ') + 'in [' + rule.min + ', ' + rule.max + ']');
      }
    });
  }
  function element(doc, parent, tag, text, style) {
    var el = doc.createElement(tag);
    if (text !== null && text !== undefined) el.textContent = text;
    if (style) Object.assign(el.style, style);
    if (parent) parent.appendChild(el);
    return el;
  }
  function canvas(doc, width, height) {
    var el = doc.createElement('canvas'); el.width = width; el.height = height;
    var ctx = el.getContext('2d');
    if (!ctx) throw new Error('Material studies require Canvas 2D');
    return { canvas: el, ctx: ctx };
  }
  function view(stage, id, title, options) {
    if (!stage || !stage.ownerDocument || !stage.dataset) throw new TypeError(id + ': a DOM stage is required');
    options = options || {};
    var doc = stage.ownerDocument;
    var surface = canvas(doc, W, H);
    var root = element(doc, stage, 'section', null, {
      width: '100%', maxWidth: '640px', boxSizing: 'border-box', padding: '14px', color: '#e7edf8',
      background: '#101827', borderRadius: '14px', fontFamily: 'system-ui, "Microsoft YaHei", sans-serif'
    });
    element(doc, root, 'h3', title, { margin: '0 0 7px', fontSize: '17px', lineHeight: '1.4' });
    element(doc, root, 'p', options.text === undefined ? '材质回应状态 · Material responds to state' : String(options.text), {
      margin: '0 0 9px', fontSize: '14px', lineHeight: '1.5', overflowWrap: 'anywhere'
    });
    root.appendChild(surface.canvas);
    Object.assign(surface.canvas.style, { width: '100%', maxWidth: W + 'px', height: 'auto', display: 'block', margin: '0 auto', borderRadius: '10px', touchAction: 'pan-y' });
    surface.canvas.setAttribute('role', 'img');
    surface.canvas.setAttribute('aria-label', title + ' — authored stylized illustration, not a physical simulation');
    var status = element(doc, root, 'output', '', { display: 'block', margin: '9px 0', fontSize: '13px', lineHeight: '1.5' });
    status.setAttribute('aria-live', 'off');
    var controls = element(doc, root, 'div', null, { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', fontSize: '13px' });
    element(doc, root, 'small', '风格化材质研究 / Stylized material study · no physical solver', { display: 'block', marginTop: '10px', opacity: '0.8' });
    var listeners = [], cleanups = [], disposed = false;
    stage.dataset.recipe = id;
    var v = {
      doc: doc, root: root, canvas: surface.canvas, ctx: surface.ctx, controls: controls, status: status,
      seed: Number(options.seed) >>> 0, reduced: options.reducedMotion === true, pointerId: null,
      preview: () => {}, resetPreview: () => {},
      listen: (target, event, callback) => {
        var guarded = (e) => { if (!disposed) callback(e); };
        target.addEventListener(event, guarded);
        listeners.push(() => { target.removeEventListener(event, guarded); });
      },
      cleanup: (fn) => { cleanups.push(fn); },
      releasePointer: () => {
        if (v.pointerId !== null && v.canvas.hasPointerCapture && v.canvas.hasPointerCapture(v.pointerId)) v.canvas.releasePointerCapture(v.pointerId);
        v.pointerId = null;
      },
      clear: () => {
        var ctx = v.ctx;
        ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0; ctx.lineWidth = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.fillStyle = '#101c30'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#213049'; ctx.beginPath();
        for (var x = 0; x <= W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
        for (var y = 0; y <= H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
        ctx.stroke();
      },
      dispose: () => {
        if (disposed) return;
        disposed = true; v.releasePointer();
        listeners.forEach((release) => { release(); });
        cleanups.forEach((release) => { release(); });
        surface.canvas.width = 0; surface.canvas.height = 0;
        root.remove();
        if (stage.dataset.recipe === id) delete stage.dataset.recipe;
      },
      assertAlive: () => { if (disposed) throw new Error(id + ': study already disposed'); }
    };
    return v;
  }
  function slider(v, label, min, max, step, initial, callback) {
    var wrapper = element(v.doc, v.controls, 'label', label + ' ', { display: 'inline-flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' });
    var input = element(v.doc, wrapper, 'input'); input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = initial;
    input.setAttribute('aria-label', label); input.style.width = '112px';
    v.listen(input, 'input', () => { callback(Number(input.value)); });
    return input;
  }
  function button(v, label, callback) {
    var el = element(v.doc, v.controls, 'button', label, { padding: '6px 10px', border: '1px solid #70859e', borderRadius: '7px', color: '#edf5ff', background: '#263851', cursor: 'pointer' });
    el.type = 'button'; v.listen(el, 'click', () => { callback(el); }); return el;
  }
  function pointer(v, projector, hover) {
    function point(e) {
      var rect = v.canvas.getBoundingClientRect();
      return { x: clamp((e.clientX - rect.left) / (rect.width || W), 0, 1) * W, y: clamp((e.clientY - rect.top) / (rect.height || H), 0, 1) * H };
    }
    v.listen(v.canvas, 'pointerdown', (e) => {
      if (e.button !== 0) return;
      v.pointerId = e.pointerId;
      if (v.canvas.setPointerCapture) v.canvas.setPointerCapture(e.pointerId);
      v.preview(projector(point(e)));
    });
    v.listen(v.canvas, 'pointermove', (e) => {
      if (hover || v.pointerId === e.pointerId) v.preview(projector(point(e)));
    });
    function end() { v.releasePointer(); v.resetPreview(); }
    v.listen(v.canvas, 'pointerup', end); v.listen(v.canvas, 'pointercancel', end);
    v.listen(v.canvas, 'lostpointercapture', () => { v.pointerId = null; });
    if (hover) v.listen(v.canvas, 'pointerleave', end);
  }
  function recipe(name, title, schema, setup) {
    var id = 'game.' + name;
    function check(p) { validate(p, schema, id); }
    recipes[id] = {
      title: title,
      validate: check,
      create: (stage, p, options) => {
        check(p); var v = view(stage, id, title, options), engine;
        try { engine = setup(v, p); } catch (error) { v.dispose(); throw error; }
        var current = 0;
        function draw(t, input) {
          v.clear();
          var message = engine.draw(t, input || null);
          v.status.textContent = (v.reduced ? '静态结果 / Reduced · ' : '') + message;
        }
        function canonical() {
          v.releasePointer();
          var t = v.reduced ? 1 : current;
          if (engine.sync) engine.sync(t);
          draw(t, null);
        }
        v.preview = (input) => { v.assertAlive(); draw(v.reduced ? 1 : current, input); };
        v.resetPreview = canonical;
        var controller = {
          seek: (progress) => {
            v.assertAlive();
            if (typeof progress !== 'number' || !Number.isFinite(progress) || progress < 0 || progress > 1) throw new RangeError(id + ': seek progress must be finite in [0,1]');
            current = progress; canonical();
          },
          dispose: v.dispose
        };
        controller.seek(0);
        return controller;
      }
    };
  }
  function disc(ctx, x, y, r, fill) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill();
  }
  function rounded(ctx, x, y, w, h, radius) {
    radius = Math.min(radius, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius); ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h); ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius); ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath();
  }
  function panel(ctx, x, y, w, h) {
    rounded(ctx, x, y, w, h, 15); ctx.fillStyle = '#1d3551'; ctx.fill();
    ctx.strokeStyle = '#6c8ead'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function materialGradient(ctx, x, y, radius, light, dark) {
    var g = ctx.createRadialGradient(x - radius * 0.28, y - radius * 0.35, 2, x, y, radius * 1.5);
    g.addColorStop(0, light); g.addColorStop(1, dark); return g;
  }
  function texture(v, width, height, withPixels) {
    var s = canvas(v.doc, width, height);
    v.cleanup(() => { s.canvas.width = 0; s.canvas.height = 0; });
    if (withPixels !== false) s.image = s.ctx.createImageData(width, height);
    return s;
  }
  function mesh(cols, rows) {
    var points = [];
    for (var j = 0; j <= rows; j++) for (var i = 0; i <= cols; i++) points.push({ u: i / cols, v: j / rows, x: 0, y: 0, z: 0, sx: 0, sy: 0 });
    return { cols: cols, rows: rows, points: points };
  }
  function triangle(ctx, a, b, c, base, lx, ly, lz) {
    var ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
    var vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    var norm = Math.hypot(nx, ny, nz) || 1;
    var light = 0.32 + 0.68 * clamp((nx * lx + ny * ly + nz * lz) / norm);
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.lineTo(c.sx, c.sy); ctx.closePath();
    ctx.fillStyle = 'rgb(' + Math.round(base[0] * light) + ',' + Math.round(base[1] * light) + ',' + Math.round(base[2] * light) + ')';
    ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.65; ctx.stroke();
  }
  function paintMesh(ctx, m, base, light, grid) {
    var stride = m.cols + 1;
    for (var j = 0; j < m.rows; j++) for (var i = 0; i < m.cols; i++) {
      var a = m.points[j * stride + i], b = m.points[j * stride + i + 1], c = m.points[(j + 1) * stride + i + 1], d = m.points[(j + 1) * stride + i];
      triangle(ctx, a, b, c, base, light[0], light[1], light[2]); triangle(ctx, a, c, d, base, light[0], light[1], light[2]);
    }
    if (!grid) return;
    ctx.strokeStyle = '#d7f9ff55'; ctx.lineWidth = 0.75; ctx.beginPath();
    for (j = 0; j <= m.rows; j++) for (i = 0; i <= m.cols; i++) {
      var p = m.points[j * stride + i]; if (i === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy);
    }
    for (i = 0; i <= m.cols; i++) for (j = 0; j <= m.rows; j++) {
      p = m.points[j * stride + i]; if (j === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();
  }

  recipe('metaball-bubble-merge', '势场气泡结群 / Metaball bubble merge', {
    radius: number(28, 54), separation: number(120, 190), cohesion: number(0.75, 1.3)
  }, (v, p) => {
    var field = texture(v, 240, 150);
    var control = slider(v, '合并量 / Merge', 0, 1, 0.01, 0, (q) => { v.preview({ amount: q }); });
    return {
      sync: (t) => { control.value = smooth(t); },
      draw: (t, input) => {
        var q = input ? input.amount : smooth(t), distance = mix(p.separation, p.radius * 0.72, q);
        control.value = q;
        var ax = 240 - distance / 2, bx = 240 + distance / 2, ay = 150 - 10 * Math.sin(Math.PI * q), by = 150 + 10 * Math.sin(Math.PI * q);
        var r2 = p.radius * p.radius, data = field.image.data, threshold = 1 / p.cohesion;
        for (var y = 0; y < 150; y++) for (var x = 0; x < 240; x++) {
          var xx = x * 2, yy = y * 2, da = (xx - ax) * (xx - ax) + (yy - ay) * (yy - ay) + 1;
          var db = (xx - bx) * (xx - bx) + (yy - by) * (yy - by) + 1;
          var value = r2 / da + r2 / db;
          var gx = -2 * r2 * ((xx - ax) / (da * da) + (xx - bx) / (db * db));
          var gy = -2 * r2 * ((yy - ay) / (da * da) + (yy - by) / (db * db));
          var lighting = clamp(0.52 + (gx * -0.7 + gy * -0.8) / (Math.hypot(gx, gy) + 0.02));
          var k = (y * 240 + x) * 4;
          data[k] = 52 + lighting * 120; data[k + 1] = 135 + lighting * 100; data[k + 2] = 194 + lighting * 60;
          data[k + 3] = 255 * clamp((value - threshold) * 16);
        }
        field.ctx.putImageData(field.image, 0, 0); v.ctx.drawImage(field.canvas, 0, 0, W, H);
        return '势场等值边界 / Scalar-field boundary · centers ' + distance.toFixed(1) + 'px apart';
      }
    };
  });

  recipe('chromatic-edge-composite', '棱边分色 / Chromatic edge composite', {
    dispersion: number(2, 14), edgeWidth: number(2, 10), bevel: number(8, 34)
  }, (v, p) => {
    var control = slider(v, '边光位置 / Edge light', 0, 1, 0.01, 0, (q) => { v.preview({ light: q }); });
    pointer(v, (pt) => ({ light: clamp(pt.x / W) }), true);
    return {
      sync: (t) => { control.value = t; },
      draw: (t, input) => {
        var q = input && !v.reduced ? input.light : t, ctx = v.ctx;
        control.value = q;
        panel(ctx, 89, 61, 302, 178);
        ctx.save(); rounded(ctx, 90, 62, 300, 176, p.bevel); ctx.clip();
        var wash = ctx.createLinearGradient(80 + q * 170, 70, 210 + q * 170, 230);
        wash.addColorStop(0, '#b1d6ef08'); wash.addColorStop(0.5, '#dff5ff50'); wash.addColorStop(1, '#b1d6ef08');
        ctx.fillStyle = wash; ctx.fillRect(80, 50, 320, 200);
        for (var i = 0; i < 7; i++) { ctx.strokeStyle = '#aed5f135'; ctx.beginPath(); ctx.moveTo(96, 90 + i * 20); ctx.lineTo(384, 90 + i * 20); ctx.stroke(); }
        ctx.restore(); ctx.save(); ctx.globalCompositeOperation = 'screen';
        var offsets = [-1, 0, 1], colors = ['#ff476b', '#73ffa3', '#718aff'];
        for (i = 0; i < 3; i++) {
          var offset = offsets[i] * p.dispersion * (0.4 + 0.6 * Math.sin(Math.PI * q));
          rounded(ctx, 90 + offset, 62 - offset * 0.35, 300, 176, p.bevel);
          ctx.strokeStyle = colors[i]; ctx.lineWidth = p.edgeWidth; ctx.globalAlpha = 0.7; ctx.stroke();
        }
        ctx.restore();
        return '三通道边缘合成 / Three offset rim channels · stylized dispersion, no refracted image';
      }
    };
  });

  recipe('chrome-height-ripple', '金属高度涟漪 / Chrome height ripple', {
    amplitude: number(3, 16), wavelength: number(24, 70), decay: number(1, 5)
  }, (v, p) => {
    var field = texture(v, 240, 150);
    function height(x, y, t) {
      var r = Math.hypot(x - 240, y - 150);
      return p.amplitude * Math.sin((r - t * 155) / p.wavelength * TAU) * Math.exp(-p.decay * r / 240) * Math.sin(Math.PI * t);
    }
    return { draw: (t) => {
      var data = field.image.data;
      for (var y = 0; y < 150; y++) for (var x = 0; x < 240; x++) {
        var xx = x * 2, yy = y * 2, k = (y * 240 + x) * 4;
        if (xx < 70 || xx > 410 || yy < 55 || yy > 245) { data[k + 3] = 0; continue; }
        var nx = -(height(xx + 1, yy, t) - height(xx - 1, yy, t)) / 2;
        var ny = -(height(xx, yy + 1, t) - height(xx, yy - 1, t)) / 2;
        var normal = Math.hypot(nx, ny, 1), reflected = (nx * 0.6 + ny * -0.4 + 0.7) / normal;
        var band = 0.5 + 0.5 * Math.sin(reflected * 10 + yy * 0.025);
        var value = 45 + 192 * band ** 1.4;
        data[k] = value * 0.9; data[k + 1] = value; data[k + 2] = Math.min(255, value + 18); data[k + 3] = 255;
      }
      field.ctx.putImageData(field.image, 0, 0); v.ctx.drawImage(field.canvas, 0, 0, W, H);
      v.ctx.strokeStyle = '#e3f5ff55'; v.ctx.lineWidth = 0.6; v.ctx.beginPath();
      for (var row = 75; row <= 225; row += 25) for (var col = 70; col <= 410; col += 5) {
        var z = height(col, row, t); if (col === 70) v.ctx.moveTo(col, row - z); else v.ctx.lineTo(col, row - z);
      }
      v.ctx.stroke();
      return '解析高度与法线 / Analytic height and normals · one damped radial wave, not a reflection solver';
    } };
  });

  recipe('clay-radial-morph', '黏土轮廓塑形 / Clay radial morph', {
    roundness: number(0.12, 0.65), lobes: integer(3, 6), bulge: number(0.08, 0.3)
  }, (v, p) => {
    var dots = [];
    for (var i = 0; i < 80; i++) dots.push({ angle: random(v.seed, i * 2) * TAU, radius: Math.sqrt(random(v.seed, i * 2 + 1)) * 65 });
    function outline(ctx, t, scale) {
      ctx.beginPath();
      for (var j = 0; j <= 160; j++) {
        var a = j / 160 * TAU, wave = Math.cos(a * p.lobes);
        var shaped = Math.sign(wave) * Math.abs(wave) ** (0.3 + p.roundness * 2.5);
        var r = 75 * (1 + p.bulge * shaped * t) * scale;
        var x = 240 + Math.cos(a) * r, y = 150 + Math.sin(a) * r;
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    return { draw: (t) => {
      var q = smooth(t), ctx = v.ctx;
      outline(ctx, q, 1); ctx.fillStyle = materialGradient(ctx, 225, 135, 82, '#f7cebb', '#a95958'); ctx.fill();
      ctx.strokeStyle = '#e7b5aa'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); outline(ctx, q, 0.92); ctx.clip();
      dots.forEach((dot) => { disc(ctx, 240 + Math.cos(dot.angle) * dot.radius, 150 + Math.sin(dot.angle) * dot.radius, 1.3, '#78485035'); });
      ctx.restore();
      return '对应顶点塑形 / Corresponding radial vertices · circle → ' + p.lobes + '-lobe clay silhouette';
    } };
  });

  recipe('pinned-cloth-mesh', '固定边布浪 / Pinned cloth mesh', {
    amplitude: number(8, 38), folds: integer(2, 6), pin: ['top', 'left']
  }, (v, p) => {
    var m = mesh(24, 16), light = [-0.35, -0.45, 0.82];
    var control = slider(v, '波幅 / Wave amount', 0, 1, 0.01, 0, (q) => { v.preview({ amount: q }); });
    pointer(v, (pt) => ({ amount: clamp(pt.y / H), origin: clamp(pt.x / W) }), false);
    return {
      sync: (t) => { control.value = Math.sin(Math.PI * t); },
      draw: (t, input) => {
        var amount = input && !v.reduced ? input.amount : Math.sin(Math.PI * t), origin = input && !v.reduced && input.origin !== undefined ? input.origin : 0;
        control.value = amount;
        for (var i = 0; i < m.points.length; i++) {
          var a = m.points[i], anchor = p.pin === 'top' ? a.v : a.u;
          a.z = p.amplitude * amount * anchor * Math.sin((a.u - origin) * Math.PI * p.folds - t * TAU + a.v * 1.6);
          a.x = 85 + a.u * 310 + a.z * 0.2 * anchor; a.y = 64 + a.v * 172;
          a.sx = a.x + a.z * 0.25; a.sy = a.y - a.z * 0.55;
        }
        paintMesh(v.ctx, m, [106, 195, 219], light, true);
        return '布网相对变形 / Relative cloth vertex deformation · pinned ' + p.pin + ' edge; authored wave, no cloth solver';
      }
    };
  });

  recipe('frost-radial-erasure', '冰晶热域融解 / Frost radial erasure', {
    crystals: integer(40, 180), branchLength: number(8, 26), meltSoftness: number(8, 32)
  }, (v, p) => {
    var frost = texture(v, W, H, false), frame = texture(v, W, H, false), c = frost.ctx;
    c.strokeStyle = '#d8f3ffc9'; c.lineWidth = 1.2;
    for (var i = 0; i < p.crystals; i++) {
      var x = 100 + random(v.seed, i * 3) * 280, y = 75 + random(v.seed, i * 3 + 1) * 150;
      var length = p.branchLength * (0.45 + 0.55 * random(v.seed, i * 3 + 2));
      c.beginPath();
      for (var j = 0; j < 6; j++) {
        var a = j / 6 * TAU, ex = x + Math.cos(a) * length, ey = y + Math.sin(a) * length;
        c.moveTo(x, y); c.lineTo(ex, ey);
        for (var side = -1; side <= 1; side += 2) {
          c.moveTo(x + Math.cos(a) * length * 0.6, y + Math.sin(a) * length * 0.6);
          c.lineTo(x + Math.cos(a) * length * 0.6 + Math.cos(a + side * 0.85) * length * 0.3, y + Math.sin(a) * length * 0.6 + Math.sin(a + side * 0.85) * length * 0.3);
        }
      }
      c.stroke();
    }
    return { draw: (t) => {
      var ctx = v.ctx, radius = 245 * smooth(t), f = frame.ctx;
      panel(ctx, 85, 60, 310, 180);
      disc(ctx, 240, 150, 29, '#80decc');
      ctx.strokeStyle = '#123a48'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(226, 151); ctx.lineTo(237, 162); ctx.lineTo(256, 139); ctx.stroke();
      f.clearRect(0, 0, W, H); f.globalCompositeOperation = 'source-over'; f.drawImage(frost.canvas, 0, 0);
      if (radius > 0) {
        var mask = f.createRadialGradient(240, 150, Math.max(0, radius - p.meltSoftness), 240, 150, Math.max(radius, 0.1));
        mask.addColorStop(0, '#000'); mask.addColorStop(1, '#0000'); f.globalCompositeOperation = 'destination-out'; f.fillStyle = mask; f.fillRect(0, 0, W, H);
      }
      f.globalCompositeOperation = 'source-over'; ctx.drawImage(frame.canvas, 0, 0);
      return '热域遮罩消除晶枝 / Thermal mask removes crystal branches · ' + (t >= 0.99 ? 'unlocked / 已解锁' : 'presentation only; unlock authority stays outside');
    } };
  });

  recipe('gel-neck-topology-split', '凝胶细颈分裂 / Gel neck topology split', {
    neckWidth: number(10, 38), separation: number(78, 140), splitAt: number(0.45, 0.75)
  }, (v, p) => ({ draw: (t) => {
      var ctx = v.ctx, r = 40, before = t < p.splitAt;
      var q = smooth(phase(t, 0, p.splitAt)), post = smooth(phase(t, p.splitAt, 1));
      var distance = mix(38, 84, q) + p.separation * post;
      var left = 240 - distance / 2, right = 240 + distance / 2;
      ctx.fillStyle = materialGradient(ctx, 240, 138, 115, '#d7a9fa', '#7142a3');
      if (before) {
        var neck = mix(p.neckWidth, 0.05, q), reach = Math.min(27, distance / 3);
        ctx.beginPath(); ctx.moveTo(left - r, 150);
        ctx.bezierCurveTo(left - r, 95, left + r * 0.5, 99, left + reach, 150 - neck);
        ctx.bezierCurveTo(left + reach + 12, 150 - neck, right - reach - 12, 150 - neck, right - reach, 150 - neck);
        ctx.bezierCurveTo(right - r * 0.5, 99, right + r, 95, right + r, 150);
        ctx.bezierCurveTo(right + r, 205, right - r * 0.5, 201, right - reach, 150 + neck);
        ctx.bezierCurveTo(right - reach - 12, 150 + neck, left + reach + 12, 150 + neck, left + reach, 150 + neck);
        ctx.bezierCurveTo(left + r * 0.5, 201, left - r, 205, left - r, 150); ctx.closePath(); ctx.fill();
      } else {
        // Actual connectivity change: independent closed regions only after splitAt.
        disc(ctx, left, 150, r, ctx.fillStyle); disc(ctx, right, 150, r, ctx.fillStyle);
      }
      return (before ? '一个连通区域 / One connected region' : '两个断开区域 / Two disconnected regions') + ' · pinch threshold ' + p.splitAt;
    } }));

  recipe('crack-graph-recovery', '裂纹枝图修复 / Crack graph recovery', {
    rays: integer(5, 12), branching: integer(1, 3), repairAt: number(0.5, 0.8)
  }, (v, p) => {
    var segments = [];
    for (var i = 0; i < p.rays; i++) {
      var angle = i / p.rays * TAU + (random(v.seed, i * 20) - 0.5) * 0.3, x = 240, y = 150;
      for (var j = 0; j < 4; j++) {
        var r = (j + 1) * 24, a = angle + (random(v.seed, i * 20 + j + 1) - 0.5) * 0.18;
        var nx = 240 + Math.cos(a) * r * 1.4, ny = 150 + Math.sin(a) * r * 0.83;
        segments.push({ ax: x, ay: y, bx: nx, by: ny, at: j / 4 });
        if (j > 0) for (var branch = 0; branch < p.branching; branch++) {
          var direction = a + (branch % 2 ? -1 : 1) * (0.55 + branch * 0.18);
          segments.push({ ax: nx, ay: ny, bx: nx + Math.cos(direction) * 16, by: ny + Math.sin(direction) * 16, at: (j + 0.4) / 4 });
        }
        x = nx; y = ny;
      }
    }
    return { draw: (t) => {
      panel(v.ctx, 78, 56, 324, 188);
      var amount = t <= p.repairAt ? smooth(phase(t, 0, 0.34)) : 1 - smooth(phase(t, p.repairAt, 1));
      v.ctx.strokeStyle = '#def4ff'; v.ctx.lineWidth = 1.8; v.ctx.beginPath();
      segments.forEach((s) => {
        var q = clamp((amount - s.at * 0.75) / 0.25);
        if (q === 0) return;
        v.ctx.moveTo(s.ax, s.ay); v.ctx.lineTo(mix(s.ax, s.bx, q), mix(s.ay, s.by, q));
      });
      v.ctx.stroke();
      return '有序裂纹图 / Ordered fracture graph · ' + (t < p.repairAt ? 'growth / 扩展' : 'tip-to-root repair / 由末端回补');
    } };
  });

  recipe('displaced-glass-sampling', '玻璃采样偏折 / Displaced glass sampling', {
    distortion: number(4, 28), lensRadius: number(56, 102), curvature: number(0.6, 2.4)
  }, (v, p) => {
    var source = texture(v, W, H, false), c = source.ctx;
    for (var y = 0; y < H; y += 24) for (var x = 0; x < W; x += 24) {
      c.fillStyle = (x / 24 + y / 24) % 2 ? '#2c5b76' : '#17394f'; c.fillRect(x, y, 24, 24);
    }
    c.strokeStyle = '#ffae74'; c.lineWidth = 7;
    for (var i = -3; i < 9; i++) { c.beginPath(); c.moveTo(i * 80, 0); c.lineTo(i * 80 + 160, H); c.stroke(); }
    c.strokeStyle = '#a6edff'; c.lineWidth = 2;
    for (i = 0; i < 7; i++) { c.beginPath(); c.moveTo(0, 40 + i * 35); c.lineTo(W, 40 + i * 35); c.stroke(); }
    var original = c.getImageData(0, 0, W, H), result = v.ctx.createImageData(W, H);
    var control = slider(v, '镜片位置 / Lens position', 0, 1, 0.01, 0, (q) => { v.preview({ x: mix(130, 350, q), y: 150 }); });
    pointer(v, (pt) => ({ x: clamp(pt.x, 105, 375), y: clamp(pt.y, 95, 205) }), true);
    return {
      sync: (t) => { control.value = (mix(175, 305, smooth(t)) - 130) / 220; },
      draw: (t, input) => {
        var cx = input && !v.reduced ? input.x : mix(175, 305, smooth(t)), cy = input && !v.reduced ? input.y : 150;
        control.value = clamp((cx - 130) / 220);
        var out = result.data, data = original.data, radius = p.lensRadius;
        out.set(data);
        var x0 = Math.max(0, Math.floor(cx - radius)), x1 = Math.min(W - 1, Math.ceil(cx + radius));
        var y0 = Math.max(0, Math.floor(cy - radius)), y1 = Math.min(H - 1, Math.ceil(cy + radius));
        for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
          var ux = (x - cx) / radius, uy = (y - cy) / radius, r2 = ux * ux + uy * uy;
          if (r2 >= 1) continue;
          var displacement = p.distortion * (1 - r2) ** p.curvature;
          var sx = clamp(x + ux * displacement, 0, W - 1.001), sy = clamp(y + uy * displacement, 0, H - 1.001);
          var ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy;
          var a = (iy * W + ix) * 4, b = a + 4, d = a + W * 4, e = d + 4, dest = (y * W + x) * 4;
          for (var channel = 0; channel < 3; channel++) out[dest + channel] = mix(mix(data[a + channel], data[b + channel], fx), mix(data[d + channel], data[e + channel], fx), fy);
        }
        v.ctx.putImageData(result, 0, 0); v.ctx.strokeStyle = '#e3fbffad'; v.ctx.lineWidth = 2;
        v.ctx.beginPath(); v.ctx.arc(cx, cy, radius, 0, TAU); v.ctx.stroke();
        return '真实偏移双线性采样 / Actual displaced bilinear samples · original background; stylized image warp, not physical optics';
      }
    };
  });

  recipe('ink-adhesive-ribbon', '墨液牵丝吸附 / Ink adhesive ribbon', {
    viscosity: number(0.2, 0.8), stretch: number(70, 170), droplets: integer(3, 12)
  }, (v, p) => ({ draw: (t) => {
      var ctx = v.ctx, q = smooth(t), ax = 116, ay = 150, tip = ax + p.stretch * q;
      ctx.fillStyle = '#bcc9db'; ctx.fillRect(90, 75, 12, 155); ctx.fillRect(ax + p.stretch + 25, 75, 12, 155);
      var width = 24 * (1 - q * 0.72), sag = 20 + p.viscosity * 42 * Math.sin(Math.PI * q);
      ctx.fillStyle = '#1e101c';
      if (t < 0.8) {
        ctx.beginPath(); ctx.moveTo(ax, ay - 27);
        ctx.bezierCurveTo(ax + 35, ay - 30, tip - 42, ay + sag - width, tip, ay - 24);
        ctx.bezierCurveTo(tip + 26, ay - 24, tip + 26, ay + 25, tip, ay + 25);
        ctx.bezierCurveTo(tip - 42, ay + sag + width, ax + 35, ay + 35, ax, ay + 28);
        ctx.quadraticCurveTo(ax - 28, ay, ax, ay - 27); ctx.closePath(); ctx.fill();
      } else {
        disc(ctx, ax, ay, 23 * (1 - phase(t, 0.8, 1) * 0.5), '#1e101c'); disc(ctx, tip, ay, 28, '#1e101c');
        for (var i = 0; i < p.droplets; i++) {
          var r = 2 + random(v.seed, i) * 4, u = (i + 1) / (p.droplets + 1);
          var fall = phase(t, 0.8, 1) * (15 + 40 * random(v.seed, i + 20));
          disc(ctx, mix(ax, tip, u), ay + sag * Math.sin(Math.PI * u) + fall, r, '#251827');
        }
      }
      return '锚点牵丝 → 断丝留滴 / Anchored ribbon → break with adhering drops · prescribed viscosity profile, no liquid solver';
    } }));

  recipe('liquid-tab-bezier-bridge', '液桥交接选中态 / Liquid tab Bézier bridge', {
    tabs: integer(3, 5), tension: number(0.3, 1.4), bridgeWidth: number(12, 30)
  }, (v, p) => {
    var buttons = [];
    for (var i = 0; i < p.tabs; i++) ((index) => {
      buttons.push(button(v, '标签 / Tab ' + (index + 1), () => {
        buttons.forEach((b, j) => { b.setAttribute('aria-pressed', String(j === index)); });
        v.preview({ destination: index, amount: 1 });
      }));
    })(i);
    return {
      sync: (t) => { buttons.forEach((b, j) => { b.setAttribute('aria-pressed', String(j === (t >= 0.5 ? p.tabs - 1 : 0))); }); },
      draw: (t, input) => {
        var ctx = v.ctx, destination = input ? input.destination : p.tabs - 1, q = input ? input.amount : smooth(t);
        var start = 105, end = 105 + destination * 270 / (p.tabs - 1), head = mix(start, end, q);
        var trail = mix(start, end, clamp(q - 0.3 * Math.sin(Math.PI * q))), radius = 23;
        buttons.forEach((b, j) => { b.setAttribute('aria-pressed', String(j === (q >= 0.5 ? destination : 0))); });
        for (var i = 0; i < p.tabs; i++) {
          panel(ctx, 78 + i * 270 / (p.tabs - 1), 102, 54, 56);
          disc(ctx, 105 + i * 270 / (p.tabs - 1), 129, 4, '#c8d6e6');
        }
        var span = head - trail;
        disc(ctx, trail, 188, radius, '#67d8d0'); disc(ctx, head, 188, radius, '#67d8d0');
        if (span > radius) {
          var throat = p.bridgeWidth * (1 - 0.55 * Math.sin(Math.PI * q));
          var pull = Math.min(span * 0.48, span * p.tension * 0.35);
          ctx.beginPath(); ctx.moveTo(trail, 188 - radius);
          ctx.bezierCurveTo(trail + pull, 188 - throat, head - pull, 188 - throat, head, 188 - radius);
          ctx.lineTo(head, 188 + radius);
          ctx.bezierCurveTo(head - pull, 188 + throat, trail + pull, 188 + throat, trail, 188 + radius);
          ctx.closePath(); ctx.fillStyle = '#67d8d0'; ctx.fill();
        }
        return '滞后球与前导球的连续液桥 / Continuous bridge between trailing and leading bulbs · selected tab ' + (q >= 0.5 ? destination + 1 : 1);
      }
    };
  });

  recipe('magnetic-polar-spikes', '磁域尖峰徽记 / Magnetic polar spikes', {
    spikes: integer(7, 18), fieldStrength: number(0.1, 0.65), influence: number(0.3, 1.1)
  }, (v, p) => {
    var control = slider(v, '场强 / Field amount', 0, 1, 0.01, 0, (q) => { v.preview({ amount: q, angle: -Math.PI / 2 }); });
    pointer(v, (pt) => ({ amount: 1, angle: Math.atan2(pt.y - 150, pt.x - 240) }), true);
    return {
      sync: (t) => { control.value = smooth(t); },
      draw: (t, input) => {
        var ctx = v.ctx, amount = input && !v.reduced ? input.amount : smooth(t), angle = input && !v.reduced ? input.angle : mix(-Math.PI, -0.5, t);
        control.value = amount;
        ctx.beginPath();
        for (var i = 0; i <= 240; i++) {
          var a = i / 240 * TAU, delta = Math.atan2(Math.sin(a - angle), Math.cos(a - angle));
          var field = Math.exp(-delta * delta / (p.influence * p.influence * 2));
          var r = 57 + 70 * p.fieldStrength * amount * field * Math.max(0, Math.cos(a * p.spikes)) ** 3;
          var x = 240 + Math.cos(a) * r, y = 150 + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fillStyle = materialGradient(ctx, 228, 130, 85, '#a2b6c7', '#16243b'); ctx.fill();
        ctx.strokeStyle = '#c5e1eb'; ctx.lineWidth = 1.5; ctx.stroke();
        return '方向场驱动极坐标尖峰 / Directional field drives radial spikes · illustrative ferrofluid, not magnetohydrodynamics';
      }
    };
  });

  recipe('elastic-membrane-mesh', '弹膜局部压陷 / Elastic membrane mesh', {
    depth: number(12, 54), falloff: number(35, 100), tension: number(0.4, 1.6)
  }, (v, p) => {
    var m = mesh(22, 16), control = button(v, '按下 / Press', (el) => {
      var active = el.getAttribute('aria-pressed') !== 'true'; el.setAttribute('aria-pressed', String(active));
      v.preview({ pressure: active ? 1 : 0, x: 240, y: 150 });
    });
    var pressure = slider(v, '压力 / Pressure', 0, 1, 0.01, 0, (q) => { v.preview({ pressure: q, x: 240, y: 150 }); });
    pointer(v, (pt) => ({ pressure: 1, x: clamp(pt.x, 85, 395), y: clamp(pt.y, 60, 240) }), false);
    function press(t) { return smooth(phase(t, 0.08, 0.35)) * (1 - smooth(phase(t, 0.6, 1))); }
    return {
      sync: (t) => { pressure.value = press(t); control.setAttribute('aria-pressed', String(press(t) >= 0.5)); },
      draw: (t, input) => {
        var amount = input ? input.pressure : press(t), cx = input && !v.reduced ? input.x : 240, cy = input && !v.reduced ? input.y : 150;
        pressure.value = amount; control.setAttribute('aria-pressed', String(amount >= 0.5));
        var radius = p.falloff / Math.sqrt(p.tension);
        for (var i = 0; i < m.points.length; i++) {
          var a = m.points[i]; a.x = 80 + a.u * 320; a.y = 55 + a.v * 190;
          var anchor = Math.sin(Math.PI * a.u) * Math.sin(Math.PI * a.v), distance = (a.x - cx) * (a.x - cx) + (a.y - cy) * (a.y - cy);
          a.z = -p.depth * amount * Math.exp(-distance / (radius * radius)) * anchor;
          a.sx = a.x + a.z * 0.18; a.sy = a.y - a.z * 0.65;
        }
        paintMesh(v.ctx, m, [152, 143, 231], [-0.4, -0.4, 0.83], true);
        return '边界固定、局部网点压陷 / Fixed boundary, local vertex depression · pressure ' + Math.round(amount * 100) + '%';
      }
    };
  });

  recipe('foil-facet-lighting', '褶面箔光 / Foil facet lighting', {
    creases: integer(8, 20), roughness: number(0.15, 0.8), lightSweep: number(30, 120)
  }, (v, p) => {
    var m = mesh(p.creases, Math.round(p.creases * 0.65));
    m.points.forEach((a, i) => {
      a.x = 85 + a.u * 310; a.y = 62 + a.v * 176;
      a.z = (random(v.seed, i) - 0.5) * 55 * p.roughness + Math.sin(a.u * Math.PI * p.creases) * 5;
      a.sx = a.x + a.z * 0.24; a.sy = a.y - a.z * 0.3;
    });
    var control = slider(v, '光源方位 / Light azimuth', 0, 1, 0.01, 0, (q) => { v.preview({ light: q }); });
    pointer(v, (pt) => ({ light: clamp(pt.x / W) }), true);
    return {
      sync: (t) => { control.value = t; },
      draw: (t, input) => {
        var q = input && !v.reduced ? input.light : t, angle = (-p.lightSweep / 2 + p.lightSweep * q) * Math.PI / 180;
        control.value = q;
        paintMesh(v.ctx, m, [255, 229, 160], [Math.sin(angle) * 0.85, -0.25, Math.cos(angle) * 0.85], false);
        return '稳定褶面法线响应光源 / Stable crease normals respond to light · stylized foil, no PBR environment reflection';
      }
    };
  });

  recipe('neon-arc-length-reveal', '霓管循长点亮 / Neon arc-length reveal', {
    bends: integer(2, 5), tubeWidth: number(3, 9), glow: number(8, 26)
  }, (v, p) => {
    var points = [], length = 0;
    for (var i = 0; i <= 220; i++) {
      var u = i / 220, x = 87 + u * 306, y = 150 + Math.sin(u * Math.PI * p.bends) * 53;
      if (i > 0) length += Math.hypot(x - points[i - 1].x, y - points[i - 1].y);
      points.push({ x: x, y: y, length: length });
    }
    function line(ctx, amount) {
      var target = length * amount; ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
      for (var j = 1; j < points.length; j++) {
        var a = points[j - 1], b = points[j];
        if (b.length > target) { var q = clamp((target - a.length) / (b.length - a.length)); ctx.lineTo(mix(a.x, b.x, q), mix(a.y, b.y, q)); break; }
        ctx.lineTo(b.x, b.y);
      }
    }
    return { draw: (t) => {
      var ctx = v.ctx;
      line(ctx, 1); ctx.strokeStyle = '#32415e'; ctx.lineWidth = p.tubeWidth + 4; ctx.stroke();
      if (t > 0) {
        line(ctx, t); ctx.strokeStyle = '#53e5e2'; ctx.lineWidth = p.tubeWidth; ctx.shadowColor = '#32d6e9'; ctx.shadowBlur = p.glow; ctx.stroke();
        ctx.shadowBlur = 0; ctx.strokeStyle = '#d6ffff'; ctx.lineWidth = p.tubeWidth * 0.35; ctx.stroke();
      }
      return '按弧长连续点亮 / Continuous arc-length activation · ' + Math.round(t * 100) + '%; sustained glow, no flicker';
    } };
  });

  recipe('oil-thin-film-field', '油膜相位流带 / Oil thin-film field', {
    bandScale: number(12, 40), flow: number(0.25, 1.4), saturation: number(0.4, 1)
  }, (v, p) => {
    var field = texture(v, 240, 150), seedPhase = random(v.seed, 1) * TAU;
    var control = slider(v, '膜流 / Film flow', 0, 1, 0.01, 0, (q) => { v.preview({ flow: q }); });
    pointer(v, (pt) => ({ flow: clamp(pt.x / W) }), true);
    return {
      sync: (t) => { control.value = t; },
      draw: (t, input) => {
        var q = input && !v.reduced ? input.flow : t, data = field.image.data;
        control.value = q;
        for (var y = 0; y < 150; y++) for (var x = 0; x < 240; x++) {
          var xx = (x - 120) * 2, yy = (y - 75) * 2, r = Math.hypot(xx / 1.5, yy);
          var angle = Math.atan2(yy, xx), boundary = 91 + 7 * Math.sin(angle * 3 + q * p.flow);
          var k = (y * 240 + x) * 4;
          if (r > boundary) { data[k + 3] = 0; continue; }
          var warped = r + 18 * Math.sin(angle * 3 + q * p.flow * 3 + seedPhase) + 9 * Math.sin(xx * 0.04 - yy * 0.025 + q * p.flow * 2);
          var thicknessPhase = warped / p.bandScale * TAU;
          data[k] = 145 + 105 * p.saturation * Math.cos(thicknessPhase);
          data[k + 1] = 145 + 105 * p.saturation * Math.cos(thicknessPhase + 2.1);
          data[k + 2] = 145 + 105 * p.saturation * Math.cos(thicknessPhase + 4.2);
          data[k + 3] = 255 * clamp((boundary - r) / 2);
        }
        field.ctx.putImageData(field.image, 0, 0); v.ctx.drawImage(field.canvas, 0, 0, W, H);
        return '变形厚度场的三相色带 / Three-phase color from a warped thickness field · stylized thin film, no spectral optics';
      }
    };
  });

  recipe('hinged-paper-projection', '铰接纸面展开 / Hinged paper projection', {
    panels: integer(2, 5), foldAngle: number(75, 155), axis: ['horizontal', 'vertical']
  }, (v, p) => {
    var panels = [], points = [];
    for (var i = 0; i < p.panels; i++) panels.push({ index: i, depth: 0, vertices: [{}, {}, {}, {}] });
    var depthOrder = panels.slice();
    for (i = 0; i <= p.panels; i++) points.push({ x: 0, z: 0 });
    function project(x, y, z, target) {
      var scale = 600 / (600 + z);
      if (p.axis === 'horizontal') { target.x = 240 + (x - 150) * scale; target.y = 150 + y * scale; }
      else { target.x = 240 + y * scale; target.y = 150 + (x - 150) * scale * 0.65; }
    }
    return { draw: (t) => {
      var angle = p.foldAngle * Math.PI / 180 * (1 - smooth(t)), width = 300 / p.panels;
      points[0].x = 0; points[0].z = 0;
      for (var i = 0; i < p.panels; i++) {
        var a = i % 2 ? -angle / 2 : angle / 2;
        points[i + 1].x = points[i].x + Math.cos(a) * width;
        points[i + 1].z = points[i].z + Math.sin(a) * width;
        var face = panels[i], left = points[i], right = points[i + 1];
        face.depth = (left.z + right.z) / 2;
        project(left.x, -65, left.z, face.vertices[0]); project(right.x, -65, right.z, face.vertices[1]);
        project(right.x, 65, right.z, face.vertices[2]); project(left.x, 65, left.z, face.vertices[3]);
      }
      var ctx = v.ctx; panel(ctx, 88, 82, 304, 136);
      disc(ctx, 240, 150, 25, '#6ad6bc');
      depthOrder.sort((a, b) => b.depth - a.depth || a.index - b.index);
      depthOrder.forEach((face) => {
        var verts = face.vertices, shade = face.index % 2 ? 0.73 + 0.27 * t : 1 - 0.12 * (1 - t);
        ctx.beginPath(); ctx.moveTo(verts[0].x, verts[0].y);
        for (var j = 1; j < 4; j++) ctx.lineTo(verts[j].x, verts[j].y);
        ctx.closePath(); ctx.fillStyle = 'rgb(' + Math.round(245 * shade) + ',' + Math.round(223 * shade) + ',' + Math.round(185 * shade) + ')'; ctx.fill();
        ctx.strokeStyle = '#8f795d'; ctx.lineWidth = 1.2; ctx.stroke();
      });
      return '逐铰接点投影纸片 / Paper facets projected from actual hinge coordinates · ' + p.panels + ' panels; prescribed folds, no paper mechanics';
    } };
  });

  recipe('seeded-sand-disintegration', '颗粒解体换态 / Seeded sand disintegration', {
    grains: integer(400, 1600), scatter: number(40, 130), gravity: number(20, 100)
  }, (v, p) => {
    var grains = [];
    for (var i = 0; i < p.grains; i++) grains.push({
      x: 120 + random(v.seed, i * 6) * 240, y: 88 + random(v.seed, i * 6 + 1) * 124,
      at: random(v.seed, i * 6 + 2) * 0.55, vx: (random(v.seed, i * 6 + 3) - 0.5) * p.scatter * 2,
      vy: -15 - random(v.seed, i * 6 + 4) * 38, radius: 0.8 + random(v.seed, i * 6 + 5) * 1.4
    });
    return { draw: (t) => {
      var ctx = v.ctx, released = 0;
      rounded(ctx, 114, 82, 252, 136, 12); ctx.strokeStyle = '#7290a9'; ctx.lineWidth = 1; ctx.stroke();
      grains.forEach((g) => {
        var q = phase(t, g.at, 1); if (q > 0) released++;
        if (t >= 1) return;
        var xx = g.x + g.vx * q, yy = g.y + g.vy * q + p.gravity * q * q;
        ctx.globalAlpha = 1 - smooth(phase(q, 0.55, 1));
        disc(ctx, xx, yy, g.radius, '#e8c789');
      });
      ctx.globalAlpha = 1;
      if (t >= 1) { disc(ctx, 240, 150, 15, '#6c8aa4'); }
      return '确定性粒子释放 / Deterministic grain releases · ' + released + '/' + p.grains + ' released; removed state is independent of particles';
    } };
  });

  recipe('soft-toggle-contour', '软体开关形变 / Soft toggle contour', {
    squash: number(0.15, 0.4), rebound: number(1, 4), travel: number(80, 164)
  }, (v, p) => {
    var label = element(v.doc, v.controls, 'label', null, { display: 'inline-flex', gap: '7px', alignItems: 'center' });
    var input = element(v.doc, label, 'input'); input.type = 'checkbox';
    element(v.doc, label, 'span', '启用 / Enabled');
    v.listen(input, 'change', () => { v.preview({ enabled: input.checked }); });
    return {
      sync: (t) => { input.checked = t >= 0.5; },
      draw: (t, interaction) => {
        var q = interaction ? (interaction.enabled ? 1 : 0) : smooth(t), ctx = v.ctx;
        var enabled = interaction ? interaction.enabled : t >= 0.5;
        input.checked = enabled;
        panel(ctx, 240 - p.travel / 2 - 49, 100, p.travel + 98, 100);
        var cx = mix(240 - p.travel / 2, 240 + p.travel / 2, q);
        var deformation = interaction ? 0 : Math.sin(Math.PI * t) * Math.exp(-p.rebound * phase(t, 0.5, 1));
        var rebound = interaction ? 0 : Math.sin(phase(t, 0.45, 1) * TAU * p.rebound) * Math.exp(-8 * phase(t, 0.45, 1)) * (1 - t);
        ctx.beginPath();
        for (var i = 0; i <= 128; i++) {
          var a = i / 128 * TAU, front = Math.max(0, Math.cos(a));
          var r = 39 * (1 + p.squash * deformation * Math.cos(a * 2) + p.squash * deformation * front * Math.sin(a * 3 - t * TAU) + p.squash * rebound * Math.cos(a * 3));
          var x = cx + Math.cos(a) * r, y = 150 + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fillStyle = materialGradient(ctx, cx - 10, 136, 48, enabled ? '#b6f6dc' : '#d6e1ed', enabled ? '#438777' : '#687c96'); ctx.fill();
        ctx.strokeStyle = '#dbefff'; ctx.lineWidth = 1.3; ctx.stroke();
        return (enabled ? '已启用 / Enabled' : '已停用 / Disabled') + ' · asymmetric sampled outline deformation, not an ellipse scale; study state only';
      }
    };
  });

  recipe('viscous-meniscus-progress', '黏流弯液面进度 / Viscous meniscus progress', {
    from: number(0.05, 0.4), to: number(0.65, 1), lag: number(0.12, 0.5), meniscus: number(6, 22)
  }, (v, p) => {
    var progress = element(v.doc, v.controls, 'progress'); progress.max = 1; progress.value = p.from;
    progress.setAttribute('aria-label', '实际完成度 / Authoritative progress'); progress.style.width = '160px';
    var control = slider(v, '实际完成度 / Logical progress', p.from, p.to, 0.01, p.from, (q) => { v.preview({ value: q }); });
    return {
      sync: (t) => { var value = mix(p.from, p.to, smooth(t)); control.value = value; progress.value = value; },
      draw: (t, input) => {
        var value = input ? input.value : mix(p.from, p.to, smooth(t)); progress.value = value;
        control.value = value;
        var presentation = input || v.reduced ? value : mix(p.from, p.to, smooth(clamp((t - p.lag * 0.22) / (1 - p.lag * 0.22))));
        var ctx = v.ctx, fillX = 80 + presentation * 320, bend = input || v.reduced ? 0 : p.meniscus * Math.sin(Math.PI * t);
        panel(ctx, 76, 116, 328, 70); ctx.save(); rounded(ctx, 80, 120, 320, 62, 13); ctx.clip();
        ctx.beginPath(); ctx.moveTo(80, 122); ctx.lineTo(fillX, 122);
        for (var y = 122; y <= 182; y += 2) {
          var local = (y - 152) / 30;
          var x = fillX + bend * Math.exp(-local * local * 2) - p.meniscus * 0.25 * Math.abs(local) ** 3;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(80, 182); ctx.closePath();
        var g = ctx.createLinearGradient(80, 122, 80, 182); g.addColorStop(0, '#a4ede3'); g.addColorStop(1, '#288c94'); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#dcfffacc'; ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore();
        return '实际 / Logical ' + Math.round(value * 100) + '% · 液面 / Meniscus ' + Math.round(presentation * 100) + '%; presentation never owns completion';
      }
    };
  });

  return { recipes: recipes };
});
