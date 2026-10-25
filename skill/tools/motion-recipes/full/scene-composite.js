((root, factory) => {
  
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MotionSceneComposite = api;
})(typeof globalThis === 'object' ? globalThis : this, () => {
  

  // Original two-shot studies. The host owns time; no DOM is touched at module load.
  var recipes = {};
  var owners = new WeakMap();
  var TAU = Math.PI * 2;
  var EMPTY_DASH = [];
  var FONT = 'system-ui, "Segoe UI", sans-serif';
  var hasOwn = Object.prototype.hasOwnProperty;
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function mix(a, b, p) { return a + (b - a) * p; }
  function smooth(p) { p = clamp(p); return p * p * (3 - 2 * p); }
  function interval(p, a, b) { return clamp((p - a) / (b - a)); }
  function number(min, max, integer) { return { type: 'number', min: min, max: max, integer: !!integer }; }
  function choice(values) { return { type: 'choice', values: values }; }
  function seeded(seed) {
    var x = seed >>> 0;
    return () => {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      return x / 4294967296;
    };
  }
  function graphemes(text) {
    if (typeof Intl === 'object' && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (v) => v.segment);
    }
    return Array.from(text);
  }
  function validate(id, schema, extra, parameters) {
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
      throw new TypeError(id + ': parameters must be a complete object');
    }
    var proto = Object.getPrototypeOf(parameters);
    if (proto !== Object.prototype && proto !== null) throw new TypeError(id + ': parameters must be a plain object');
    Reflect.ownKeys(parameters).forEach((key) => {
      if (typeof key !== 'string' || !hasOwn.call(schema, key)) throw new TypeError(id + ': unsupported parameter ' + String(key));
    });
    Object.keys(schema).forEach((key) => {
      if (!hasOwn.call(parameters, key)) throw new TypeError(id + ': missing parameter ' + key);
      var rule = schema[key], value = parameters[key];
      if (rule.type === 'number') {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min || value > rule.max || (rule.integer && !Number.isInteger(value))) {
          throw new RangeError(id + ': ' + key + ' must be ' + (rule.integer ? 'an integer' : 'finite') + ' in [' + rule.min + ', ' + rule.max + ']');
        }
      } else if (rule.type === 'choice') {
        if (rule.values.indexOf(value) < 0) throw new TypeError(id + ': unsupported ' + key);
      } else if (rule.type === 'boolean') {
        if (typeof value !== 'boolean') throw new TypeError(id + ': ' + key + ' must be boolean');
      } else if (rule.type === 'color') {
        if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new TypeError(id + ': ' + key + ' requires a six-digit hex color');
      } else if (rule.type === 'glyph') {
        if (typeof value !== 'string' || !value.trim() || graphemes(value).length !== 1 || /\s/.test(value)) throw new TypeError(id + ': glyph must be one non-space grapheme');
      }
    });
    if (extra) extra(parameters);
  }
  function reset(c) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.filter = 'none';
    c.shadowColor = 'transparent';
    c.shadowBlur = 0;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 0;
    c.setLineDash(EMPTY_DASH);
  }
  function clear(c) { reset(c); c.clearRect(0, 0, c.canvas.width, c.canvas.height); }
  function canvas(s) {
    var value = s.doc.createElement('canvas');
    value.width = s.w; value.height = s.h;
    var context = value.getContext('2d');
    if (!context) throw new Error(s.id + ': Canvas2D is unavailable');
    s.buffers.push(value);
    return value;
  }
  function pathPolygon(c, cx, cy, radius, points, inner, rotation) {
    c.beginPath();
    var count = inner == null ? points : points * 2;
    for (var i = 0; i < count; i += 1) {
      var angle = rotation + i * TAU / count;
      var r = radius * (inner != null && i % 2 ? inner : 1);
      var x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.closePath();
  }
  function wrapText(c, text, maxWidth, maxLines) {
    var units = graphemes(text), lines = [], line = '';
    for (var i = 0; i < units.length; i += 1) {
      if (units[i] === '\n' || (line && c.measureText(line + units[i]).width > maxWidth)) {
        lines.push(line); line = '';
        if (lines.length === maxLines) { lines[maxLines - 1] += '…'; return lines; }
        if (units[i] === '\n') continue;
      }
      line += units[i];
    }
    if (line || !lines.length) lines.push(line);
    return lines;
  }
  function shot(s, target, incoming, motif) {
    var c = target.getContext('2d'), w = s.w, h = s.h;
    clear(c);
    c.fillStyle = incoming ? '#e7eee5' : '#172937'; c.fillRect(0, 0, w, h);
    c.fillStyle = incoming ? '#d1ded3' : '#233e4f';
    c.beginPath(); c.moveTo(w * 0.62, 0); c.lineTo(w, 0); c.lineTo(w, h); c.lineTo(w * 0.38, h); c.closePath(); c.fill();
    c.strokeStyle = incoming ? '#94afa1' : '#3c667a'; c.lineWidth = 1;
    for (var i = 0; i < 8; i += 1) {
      c.beginPath(); c.moveTo(w * i / 7, h * 0.23); c.lineTo(w * i / 7, h * 0.87); c.stroke();
    }
    c.fillStyle = incoming ? '#255147' : '#f0d39a';
    c.font = '700 ' + Math.round(h * 0.055) + 'px ' + FONT;
    c.fillText(incoming ? 'B / 结果 · NEXT' : 'A / 初始 · BEFORE', w * 0.065, h * 0.12);
    c.font = '600 ' + Math.round(h * 0.055) + 'px ' + FONT;
    var lines = wrapText(c, s.text, w * 0.35, 3);
    for (var j = 0; j < lines.length; j += 1) c.fillText(lines[j], w * 0.065, h * (0.43 + j * 0.085));
    var cx = motif ? motif.x * w : w * 0.68;
    var cy = motif ? motif.y * h : h * 0.54;
    var radius = (motif ? motif.radius : 0.19) * Math.min(w, h);
    c.fillStyle = incoming ? '#8cbbaa' : '#e6b96e';
    c.strokeStyle = incoming ? '#255147' : '#f7ddad'; c.lineWidth = Math.max(2, h * 0.011);
    if (motif && motif.shape === 'polygon') pathPolygon(c, cx, cy, radius, motif.points, null, -Math.PI / 4);
    else if (motif || !incoming) { c.beginPath(); c.arc(cx, cy, radius, 0, TAU); }
    else { c.beginPath(); c.rect(cx - radius * 0.8, cy - radius * 0.8, radius * 1.6, radius * 1.6); }
    c.fill(); c.stroke();
    c.strokeStyle = incoming ? '#497865' : '#8babba'; c.lineWidth = Math.max(2, h * 0.008);
    c.beginPath(); c.moveTo(w * 0.065, h * 0.83); c.lineTo(w * 0.935, h * 0.83); c.stroke();
    c.fillStyle = incoming ? '#255147' : '#f0d39a';
    c.font = Math.round(h * 0.037) + 'px ' + FONT;
    c.fillText(incoming ? '下一状态保持可读 / stable result' : '两幅原创画面 / original shots', w * 0.065, h * 0.93);
  }
  function mount(stage, id, title, options) {
    if (!stage || !stage.ownerDocument || typeof stage.appendChild !== 'function' || !stage.dataset) throw new TypeError(id + ': stage must be a DOM element');
    options = options == null ? {} : options;
    if (typeof options !== 'object' || Array.isArray(options)) throw new TypeError(id + ': options must be an object');
    if (options.reducedMotion != null && typeof options.reducedMotion !== 'boolean') throw new TypeError(id + ': reducedMotion must be boolean');
    if (options.text != null && typeof options.text !== 'string') throw new TypeError(id + ': text must be a string');
    if (options.seed != null && (!Number.isFinite(options.seed) || !Number.isInteger(options.seed))) throw new TypeError(id + ': seed must be a finite integer');
    var bounds = typeof stage.getBoundingClientRect === 'function' ? stage.getBoundingClientRect() : { width: 640 };
    if (!Number.isFinite(bounds.width) || bounds.width < 0) throw new RangeError(id + ': stage width must be finite and nonnegative');
    var w = Math.round(Math.max(320, Math.min(960, bounds.width || 640)));
    var s = { id: id, doc: stage.ownerDocument, stage: stage, w: w, h: Math.round(w * 9 / 16),
      text: options.text == null ? '下一幕 / Next scene' : options.text, reduced: !!options.reducedMotion,
      random: seeded(options.seed == null ? 1 : options.seed), buffers: [], data: {}, dead: false };
    try {
      s.root = s.doc.createElement('figure');
      s.root.style.cssText = 'margin:0;width:100%;height:100%;min-width:0;display:grid;grid-template-rows:minmax(0,1fr) auto;align-items:center;gap:8px;';
      s.surface = canvas(s); s.c = s.surface.getContext('2d');
      s.surface.style.cssText = 'display:block;width:100%;height:100%;max-height:100%;object-fit:contain;';
      s.surface.setAttribute('role', 'img'); s.surface.setAttribute('aria-label', title + '；两幅原创画面的合成教学，不含实际音频');
      s.caption = s.doc.createElement('figcaption');
      s.caption.style.cssText = 'font:12px/1.5 system-ui,sans-serif;color:inherit;padding:0 8px;overflow-wrap:anywhere;';
      s.caption.textContent = title + ' · ' + (s.reduced ? '减弱动效：静态结果。' : 'A → B；外部时间轴控制。') + ' ' + s.text;
      s.root.appendChild(s.surface); s.root.appendChild(s.caption);
      s.a = canvas(s); s.b = canvas(s); s.mask = canvas(s); s.work = canvas(s);
      s.mc = s.mask.getContext('2d'); s.wc = s.work.getContext('2d');
      shot(s, s.a, false); shot(s, s.b, true);
      stage.appendChild(s.root); stage.dataset.recipe = id; owners.set(stage, s);
      return s;
    } catch (error) { release(s); throw error; }
  }
  function release(s) {
    if (!s || s.dead) return;
    s.dead = true;
    if (s.root && s.root.parentNode) s.root.parentNode.removeChild(s.root);
    s.buffers.forEach((b) => { b.width = 0; b.height = 0; });
    s.buffers.length = 0; s.data = null;
    if (owners.get(s.stage) === s) { owners.delete(s.stage); delete s.stage.dataset.recipe; }
  }
  function masked(s, paint, source) {
    clear(s.mc); s.mc.fillStyle = '#fff'; paint(s.mc);
    reset(s.mc);
    s.mc.globalCompositeOperation = 'source-in';
    s.mc.drawImage(source || s.b, 0, 0);
    reset(s.mc); s.c.drawImage(s.mask, 0, 0);
  }
  function grid(s, columns, rows) {
    var result = [];
    for (var y = 0; y < rows; y += 1) {
      for (var x = 0; x < columns; x += 1) {
        var x0 = Math.round(x * s.w / columns), y0 = Math.round(y * s.h / rows);
        var x1 = Math.round((x + 1) * s.w / columns), y1 = Math.round((y + 1) * s.h / rows);
        result.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, key: s.random(), phase: s.random() * TAU });
      }
    }
    return result;
  }
  function farthest(s, x, y) { return Math.hypot(Math.max(x, s.w - x), Math.max(y, s.h - y)); }
  function scaled(c, source, scale, x, y, w, h) {
    c.drawImage(source, x * (1 - scale), y * (1 - scale), w * scale, h * scale);
  }
  function requireFilter(s) { if (!('filter' in s.c)) throw new Error(s.id + ': this study requires Canvas2D filter support'); }
  function definition(key, title, schema, prepare, render, extra, reduced) {
    var id = 'scene.' + key;
    recipes[id] = {
      title: title,
      validate: (parameters) => { validate(id, schema, extra, parameters); },
      create: (stage, parameters, options) => {
        validate(id, schema, extra, parameters);
        var p = Object.assign({}, parameters), s = mount(stage, id, title, options);
        try { if (prepare) prepare(s, p); }
        catch (error) { release(s); throw error; }
        function seek(progress) {
          if (s.dead) throw new Error(id + ': study is disposed');
          if (typeof progress !== 'number' || !Number.isFinite(progress) || progress < 0 || progress > 1) throw new RangeError(id + ': progress must be finite in [0, 1]');
          clear(s.c);
          if (s.reduced) { if (reduced) reduced(s, p); else s.c.drawImage(s.b, 0, 0); }
          else if (progress === 0 && !render.cueLane) s.c.drawImage(s.a, 0, 0);
          else if (progress === 1 && !render.cueLane) s.c.drawImage(s.b, 0, 0);
          else render(s, p, progress);
          reset(s.c);
          s.surface.dataset.progress = String(progress);
          s.surface.dataset.presentation = s.reduced ? 'static-result' : 'composite';
        }
        try { seek(0); } catch (error) { release(s); throw error; }
        return { seek: seek, dispose: () => { release(s); } };
      }
    };
  }
  function phaseRange(p) { if (p.end <= p.start) throw new RangeError('end must be greater than start'); }

  definition('linear-wipe', '斜线擦除 / Linear wipe', { angleDeg: number(-70, 70), featherPx: number(0, 48) }, null, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0);
    var angle = p.angleDeg * Math.PI / 180;
    var reach = (s.w * Math.abs(Math.cos(angle)) + s.h * Math.abs(Math.sin(angle))) / 2 + p.featherPx;
    var edge = mix(-reach, reach, smooth(t));
    masked(s, (c) => {
      c.translate(s.w / 2, s.h / 2); c.rotate(angle);
      c.fillRect(-reach * 3, -reach * 3, edge + reach * 3, reach * 6);
      if (p.featherPx > 0) {
        var g = c.createLinearGradient(edge, 0, edge + p.featherPx, 0);
        g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(edge, -reach * 3, p.featherPx, reach * 6);
      }
    });
  });
  definition('clock-wipe', '角度扇区 / Clock wipe', {
    startAngleDeg: number(-360, 360), clockwise: { type: 'boolean' }, centerX: number(0.1, 0.9), centerY: number(0.1, 0.9)
  }, null, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0);
    var x = s.w * p.centerX, y = s.h * p.centerY, start = p.startAngleDeg * Math.PI / 180;
    masked(s, (c) => {
      c.beginPath(); c.moveTo(x, y);
      c.arc(x, y, farthest(s, x, y) + 2, start, start + (p.clockwise ? 1 : -1) * TAU * smooth(t), !p.clockwise);
      c.closePath(); c.fill();
    });
  });
  definition('iris', '圆形光圈 / Iris', { centerX: number(0.1, 0.9), centerY: number(0.1, 0.9), exponent: number(1, 4) }, null, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0);
    var x = s.w * p.centerX, y = s.h * p.centerY;
    masked(s, (c) => { c.beginPath(); c.arc(x, y, (farthest(s, x, y) + 2) * t ** p.exponent, 0, TAU); c.fill(); });
  });
  definition('star-iris', '星形孔径 / Shaped iris', {
    points: number(4, 9, true), innerRatio: number(0.3, 0.7), centerX: number(0.1, 0.9), centerY: number(0.1, 0.9), rotationDeg: number(-180, 180)
  }, null, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0);
    var x = s.w * p.centerX, y = s.h * p.centerY;
    masked(s, (c) => {
      pathPolygon(c, x, y, (farthest(s, x, y) + 3) / p.innerRatio * t ** 2.2, p.points, p.innerRatio, p.rotationDeg * Math.PI / 180); c.fill();
    });
  });
  definition('inset-clip', '矩形窗口 / Inset clip', { centerX: number(0.15, 0.85), centerY: number(0.15, 0.85), aspect: number(0.7, 2.6) }, null, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0);
    var x = s.w * p.centerX, y = s.h * p.centerY;
    var width = Math.max(2 * Math.max(x, s.w - x), 2 * Math.max(y, s.h - y) * p.aspect) * smooth(t);
    masked(s, (c) => { c.fillRect(x - width / 2, y - width / p.aspect / 2, width, width / p.aspect); });
  });
  definition('brush-wipe', '粗笔蒙版 / Brush wipe', { strokes: number(3, 14, true), roughness: number(0.05, 0.4), tilt: number(-0.25, 0.25) }, (s, p) => {
    s.data.brush = [];
    for (var i = 0; i < p.strokes; i += 1) {
      var teeth = [];
      for (var j = 0; j < 17; j += 1) teeth.push(s.random());
      s.data.brush.push({ delay: i / p.strokes * 0.28, teeth: teeth });
    }
  }, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0);
    masked(s, (c) => {
      var height = s.h / p.strokes;
      s.data.brush.forEach((stroke, i) => {
        var q = smooth(interval(t, stroke.delay, stroke.delay + 0.68));
        if (q === 0) return;
        var edge = mix(-s.w * 0.2, s.w * 1.2, q), y = height * i;
        c.beginPath(); c.moveTo(-s.w * 0.3, y - height * 0.2);
        for (var j = 0; j < stroke.teeth.length; j += 1) {
          var yy = y - height * 0.2 + j / 16 * height * 1.4;
          c.lineTo(edge + (stroke.teeth[j] - 0.5) * height * p.roughness + p.tilt * (yy - s.h / 2), yy);
        }
        c.lineTo(-s.w * 0.3, y + height * 1.2); c.closePath(); c.fill();
      });
    });
  });
  definition('letter-clip', '字形通道 / Letterform aperture', { glyph: { type: 'glyph' }, initialScale: number(0.015, 0.12) }, (s, p) => {
    var stencil = canvas(s), c = stencil.getContext('2d');
    c.fillStyle = '#fff'; c.font = '900 ' + Math.round(s.h * 0.8) + 'px ' + FONT;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.glyph, s.w / 2, s.h / 2, s.w * 0.8);
    var pixels = c.getImageData(0, 0, s.w, s.h).data;
    var distance = new Float32Array(s.w * s.h), limit = s.w + s.h;
    var x, y, i;
    for (i = 0; i < distance.length; i += 1) distance[i] = pixels[i * 4 + 3] > 240 ? limit : 0;
    for (y = 0; y < s.h; y += 1) for (x = 0; x < s.w; x += 1) {
      i = y * s.w + x;
      if (distance[i]) distance[i] = Math.min(distance[i], x ? distance[i - 1] + 1 : 1, y ? distance[i - s.w] + 1 : 1);
    }
    var best = 0, bestIndex = 0;
    for (y = s.h - 1; y >= 0; y -= 1) for (x = s.w - 1; x >= 0; x -= 1) {
      i = y * s.w + x;
      if (distance[i]) distance[i] = Math.min(distance[i], x + 1 < s.w ? distance[i + 1] + 1 : 1, y + 1 < s.h ? distance[i + s.w] + 1 : 1);
      if (distance[i] > best) { best = distance[i]; bestIndex = i; }
    }
    if (best < 2) throw new Error(s.id + ': glyph has no usable opaque stroke; load an appropriate font');
    s.data.stencil = stencil; s.data.anchorX = bestIndex % s.w; s.data.anchorY = Math.floor(bestIndex / s.w);
    // An opaque stroke, rather than a counter, is the expansion anchor. Counters remain transparent.
    s.data.endScale = Math.hypot(s.w, s.h) / (best * 0.45);
  }, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0);
    var scale = p.initialScale * (s.data.endScale / p.initialScale) ** smooth(t);
    masked(s, (c) => {
      c.translate(s.w / 2, s.h / 2); c.scale(scale, scale);
      c.drawImage(s.data.stencil, -s.data.anchorX, -s.data.anchorY);
    });
  });
  definition('blinds', '百叶开合 / Slatted mask', { slats: number(3, 24, true), stagger: number(0, 0.4) }, null, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0);
    masked(s, (c) => {
      var width = s.w / p.slats;
      for (var i = 0; i < p.slats; i += 1) {
        var start = i / Math.max(1, p.slats - 1) * p.stagger;
        var q = smooth(interval(t, start, start + 1 - p.stagger));
        c.fillRect(i * width + width * (1 - q) / 2, 0, width * q + (q === 1 ? 1 : 0), s.h);
      }
    });
  });
  definition('block-reveal', '块阵铺开 / Staggered blocks', { columns: number(2, 12, true), rows: number(2, 8, true), spread: number(0.2, 0.8) }, (s, p) => {
    s.data.cells = grid(s, p.columns, p.rows);
    s.data.cells.forEach((cell) => { cell.key = (cell.x / s.w * 0.65 + cell.y / s.h * 0.35) * 0.8 + cell.key * 0.2; });
  }, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0);
    masked(s, (c) => {
      s.data.cells.forEach((cell) => {
        var q = smooth(interval(t, cell.key * p.spread, cell.key * p.spread + 1 - p.spread));
        if (q) c.fillRect(cell.x, cell.y + cell.h * (1 - q), cell.w + 0.5, cell.h * q + 0.5);
      });
    });
  });
  definition('pixel-dissolve', '像素阈值 / Pixel dissolve', { columns: number(8, 72, true), rows: number(5, 48, true), softness: number(0, 0.12) }, (s, p) => {
    s.data.cells = grid(s, p.columns, p.rows);
  }, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0);
    s.data.cells.forEach((cell) => {
      var alpha = p.softness === 0 ? (t >= cell.key ? 1 : 0) : interval(t, cell.key * (1 - p.softness), cell.key * (1 - p.softness) + p.softness);
      if (!alpha) return;
      s.c.globalAlpha = alpha;
      s.c.drawImage(s.b, cell.x, cell.y, cell.w, cell.h, cell.x, cell.y, cell.w, cell.h);
    });
    s.c.globalAlpha = 1;
  });
  definition('slice-reveal', '切片归位 / Slice assembly', { slices: number(3, 24, true), travelPx: number(40, 280), stagger: number(0.2, 0.7), skew: number(-0.3, 0.3) }, null, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0);
    var height = s.h / p.slices;
    for (var i = 0; i < p.slices; i += 1) {
      var q = smooth(interval(t, i / p.slices * p.stagger, i / p.slices * p.stagger + 1 - p.stagger));
      if (!q) continue;
      var x = (i % 2 ? -1 : 1) * p.travelPx * (1 - q), y = i * height;
      s.c.save(); s.c.beginPath(); s.c.rect(0, y, s.w, height + 0.5); s.c.clip();
      s.c.transform(1, 0, p.skew * (1 - q), 1, x - p.skew * (1 - q) * y, 0);
      s.c.drawImage(s.b, 0, y, s.w, Math.min(height + 1, s.h - y), 0, y, s.w, Math.min(height + 1, s.h - y));
      s.c.restore();
    }
  });
  definition('hard-cut', '硬切 / Hard cut', { cutAt: number(0.15, 0.85) }, null, (s, p, t) => { s.c.drawImage(t < p.cutAt ? s.a : s.b, 0, 0); });
  definition('dissolve', '双画叠化 / Dissolve', { start: number(0, 0.45), end: number(0.55, 1) }, null, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0); s.c.globalAlpha = interval(t, p.start, p.end); s.c.drawImage(s.b, 0, 0); s.c.globalAlpha = 1;
  }, phaseRange);
  definition('blur-dissolve', '失焦叠化 / Blur crossfade', { blurPx: number(2, 32), start: number(0, 0.4), end: number(0.6, 1) }, requireFilter, (s, p, t) => {
    var q = smooth(interval(t, p.start, p.end));
    var padding = 1 + 0.06 * Math.sin(Math.PI * q);
    s.c.filter = 'blur(' + p.blurPx * Math.sin(Math.PI * q) + 'px)';
    scaled(s.c, s.a, padding, s.w / 2, s.h / 2, s.w, s.h);
    s.c.globalAlpha = q; scaled(s.c, s.b, padding, s.w / 2, s.h / 2, s.w, s.h);
    reset(s.c);
  }, phaseRange);
  definition('match-cut', '同位图形切 / Match cut', { cutAt: number(0.15, 0.85), anchorX: number(0.3, 0.75), anchorY: number(0.35, 0.65), radius: number(0.09, 0.21) }, (s, p) => {
    var motif = { x: p.anchorX, y: p.anchorY, radius: p.radius };
    shot(s, s.a, false, motif); shot(s, s.b, true, motif);
  }, (s, p, t) => {
    s.c.drawImage(t < p.cutAt ? s.a : s.b, 0, 0);
    // The circle's position/extent is invariant across the cut; background, material and text change.
  });
  definition('shape-morph-bridge', '形状变形桥 / Geometric morph bridge', {
    corners: number(3, 8, true), bridgeScale: number(11, 18), morphStart: number(0.08, 0.4), morphEnd: number(0.6, 0.92)
  }, (s, p) => {
    s.data.contour = [];
    for (var i = 0; i < 96; i += 1) {
      var angle = i * TAU / 96 - Math.PI / 4;
      var sector = TAU / p.corners;
      var local = ((angle + Math.PI / 4) % sector + sector) % sector - sector / 2;
      s.data.contour.push({ angle: angle, polygonRadius: Math.cos(Math.PI / p.corners) / Math.cos(local) });
    }
    shot(s, s.a, false, { x: 0.5, y: 0.5, radius: 0.13 });
    shot(s, s.b, true, { x: 0.5, y: 0.5, radius: 0.13, shape: 'polygon', points: p.corners });
  }, (s, p, t) => {
    var q = smooth(interval(t, p.morphStart, p.morphEnd));
    s.c.drawImage(t < 0.5 ? s.a : s.b, 0, 0);
    var radius = Math.min(s.w, s.h) * 0.13 * (1 + (p.bridgeScale - 1) * Math.sin(Math.PI * t) ** 2);
    s.c.fillStyle = 'rgb(' + Math.round(mix(230, 140, q)) + ',' + Math.round(mix(185, 187, q)) + ',' + Math.round(mix(110, 170, q)) + ')';
    s.c.beginPath();
    s.data.contour.forEach((point, i) => {
      var r = radius * mix(1, point.polygonRadius, q);
      var x = s.w / 2 + Math.cos(point.angle) * r, y = s.h / 2 + Math.sin(point.angle) * r;
      if (i === 0) s.c.moveTo(x, y); else s.c.lineTo(x, y);
    });
    s.c.closePath(); s.c.fill();
    s.c.lineWidth = Math.max(2, s.h * 0.011);
    s.c.strokeStyle = 'rgb(' + Math.round(mix(247, 37, q)) + ',' + Math.round(mix(221, 81, q)) + ',' + Math.round(mix(173, 71, q)) + ')';
    s.c.stroke();
  }, function (p) {
    var minimum = Math.hypot(16 / 9, 1) / (0.26 * Math.cos(Math.PI / p.corners)) * 1.05;
    if (p.bridgeScale < minimum) throw new RangeError('bridgeScale must cover the frame at the background cut for this corner count');
  });
  definition('push-slide', '共边推屏 / Push slide', { direction: choice(['left', 'right']) }, null, (s, p, t) => {
    var q = smooth(t), sign = p.direction === 'left' ? -1 : 1;
    s.c.drawImage(s.a, sign * s.w * q, 0); s.c.drawImage(s.b, -sign * s.w * (1 - q), 0);
  });
  definition('gravity-drop', '重力落屏 / Gravity drop', { acceleration: number(1.5, 3), tiltDeg: number(-14, 14), hingeX: number(0.1, 0.9) }, null, (s, p, t) => {
    s.c.drawImage(s.b, 0, 0);
    var q = Math.min(1.3, p.acceleration * t * t), x = p.hingeX * s.w;
    s.c.save(); s.c.translate(x, s.h * q); s.c.rotate(p.tiltDeg * Math.PI / 180 * t * t);
    s.c.shadowColor = 'rgba(0,0,0,.32)'; s.c.shadowBlur = 20; s.c.shadowOffsetY = 12;
    s.c.drawImage(s.a, -x, 0); s.c.restore();
  });
  function projected(c, source, x, y, width, height, angle, perspective, strips, shade) {
    var cosine = Math.max(0, Math.cos(angle)), sine = Math.sin(angle);
    if (cosine < 0.001) return;
    var distance = width * perspective;
    for (var i = 0; i < strips; i += 1) {
      var u0 = i / strips - 0.5, u1 = (i + 1) / strips - 0.5;
      var d0 = distance / (distance + u0 * width * sine), d1 = distance / (distance + u1 * width * sine);
      var px0 = x + width / 2 + u0 * width * cosine * d0, px1 = x + width / 2 + u1 * width * cosine * d1;
      var scale = (d0 + d1) / 2;
      c.drawImage(source, x + i * width / strips, y, width / strips, height, px0, y + height * (1 - scale) / 2, Math.max(0.2, px1 - px0 + 0.5), height * scale);
    }
    if (shade > 0) {
      c.fillStyle = 'rgba(0,0,0,' + shade + ')';
      c.beginPath();
      var left = distance / (distance - width * sine / 2), right = distance / (distance + width * sine / 2);
      c.moveTo(x + width / 2 - width * cosine * left / 2, y + height * (1 - left) / 2);
      c.lineTo(x + width / 2 + width * cosine * right / 2, y + height * (1 - right) / 2);
      c.lineTo(x + width / 2 + width * cosine * right / 2, y + height * (1 + right) / 2);
      c.lineTo(x + width / 2 - width * cosine * left / 2, y + height * (1 + left) / 2); c.closePath(); c.fill();
    }
  }
  definition('perspective-flip', '透视翻页 / Projected card flip', { perspective: number(2, 7), strips: number(32, 96, true) }, null, (s, p, t) => {
    s.c.fillStyle = '#102330'; s.c.fillRect(0, 0, s.w, s.h);
    var theta = Math.PI * smooth(t), incoming = theta >= Math.PI / 2;
    var angle = incoming ? theta - Math.PI : theta;
    projected(s.c, incoming ? s.b : s.a, 0, 0, s.w, s.h, angle, p.perspective, p.strips, Math.sin(theta) * 0.32);
  });
  definition('mosaic-flip', '逐片翻面 / Mosaic flip', { columns: number(5, 20, true), rows: number(3, 12, true), spread: number(0.3, 0.8), perspective: number(2, 6) }, (s, p) => {
    s.data.cells = grid(s, p.columns, p.rows);
    s.data.cells.forEach((cell) => { cell.key = cell.x / s.w * 0.6 + cell.y / s.h * 0.25 + cell.key * 0.15; });
  }, (s, p, t) => {
    s.c.fillStyle = '#142934'; s.c.fillRect(0, 0, s.w, s.h);
    s.data.cells.forEach((cell) => {
      var q = smooth(interval(t, cell.key * p.spread, cell.key * p.spread + 1 - p.spread));
      var theta = q * Math.PI, incoming = q >= 0.5;
      s.c.save(); s.c.beginPath(); s.c.rect(cell.x, cell.y, cell.w, cell.h); s.c.clip();
      projected(s.c, incoming ? s.b : s.a, cell.x, cell.y, cell.w, cell.h, incoming ? theta - Math.PI : theta, p.perspective, 10, Math.sin(theta) * 0.4);
      s.c.restore();
    });
  });
  definition('colour-flood', '色液覆盖 / Colour flood', { color: { type: 'color' }, centerX: number(0.05, 0.95), centerY: number(0.05, 0.95) }, null, (s, p, t) => {
    var x = p.centerX * s.w, y = p.centerY * s.h, radius = farthest(s, x, y) + 3;
    s.c.drawImage(t < 0.5 ? s.a : s.b, 0, 0);
    s.c.fillStyle = p.color; s.c.beginPath();
    s.c.arc(x, y, radius * (t < 0.5 ? smooth(t * 2) : 1 - smooth((t - 0.5) * 2)), 0, TAU); s.c.fill();
  });
  definition('light-leak', '漏光遮切 / Light leak', { color: { type: 'color' }, width: number(0.45, 1.1), angleDeg: number(-35, 35) }, null, (s, p, t) => {
    s.c.drawImage(t < 0.5 ? s.a : s.b, 0, 0);
    var e = Math.sin(Math.PI * t) ** 2, width = s.w * p.width;
    s.c.save(); s.c.translate(s.w / 2, s.h / 2); s.c.rotate(p.angleDeg * Math.PI / 180);
    s.c.globalCompositeOperation = 'screen'; s.c.globalAlpha = e;
    var g = s.c.createLinearGradient(-width, 0, width, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, p.color); g.addColorStop(0.5, '#fff8dc'); g.addColorStop(0.65, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    s.c.fillStyle = g; s.c.fillRect(-width, -s.h * 2, width * 2, s.h * 4);
    // Broad exposure veil deliberately bridges the underlying cut, not a substitute for RGB image mixing.
    s.c.globalAlpha = e ** 4; s.c.fillStyle = '#fff4df'; s.c.fillRect(-s.w * 2, -s.h * 2, s.w * 4, s.h * 4);
    s.c.restore();
  });
  definition('light-streak', '光束鞭切 / Light-streak bridge', { streaks: number(3, 18, true), widthPx: number(20, 180), slope: number(-0.5, 0.5) }, (s, p) => {
    s.data.streaks = [];
    for (var i = 0; i < p.streaks; i += 1) s.data.streaks.push({ y: s.random() * s.h, width: mix(0.4, 1, s.random()), phase: s.random() * 0.22 });
  }, (s, p, t) => {
    var q = smooth(t), e = Math.sin(Math.PI * t);
    s.c.drawImage(t < 0.5 ? s.a : s.b, (t < 0.5 ? -1 : 1) * s.w * 0.2 * e, 0, s.w * (1 + 0.4 * e), s.h);
    s.c.save(); s.c.globalCompositeOperation = 'screen';
    s.data.streaks.forEach((line) => {
      var x = mix(-s.w * 1.6, s.w * 1.6, clamp(q + line.phase - 0.11));
      s.c.save(); s.c.translate(x, line.y); s.c.transform(1, p.slope, 0, 1, 0, 0);
      var g = s.c.createLinearGradient(-s.w * 0.7, 0, s.w * 0.7, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.4, '#80d7d4'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(0.6, '#ffcf88'); g.addColorStop(1, 'rgba(0,0,0,0)');
      s.c.globalAlpha = e * 0.86; s.c.fillStyle = g;
      s.c.fillRect(-s.w * 0.7, -p.widthPx * line.width / 2, s.w * 1.4, p.widthPx * line.width); s.c.restore();
    });
    s.c.restore();
  });
  definition('whip-pan', '横向运动模糊 / Whip pan', { travel: number(1.2, 3), blurPx: number(6, 36), cutAt: number(0.3, 0.7) }, requireFilter, (s, p, t) => {
    var incoming = t >= p.cutAt;
    var local = incoming ? (t - p.cutAt) / (1 - p.cutAt) : t / p.cutAt;
    var e = incoming ? (1 - local) ** 3 : local ** 3;
    var offset = (incoming ? 1 : -1) * s.w * p.travel * e;
    var source = incoming ? s.b : s.a;
    s.c.fillStyle = '#000'; s.c.fillRect(0, 0, s.w, s.h); s.c.globalCompositeOperation = 'lighter';
    s.c.filter = 'blur(' + p.blurPx * e + 'px)';
    for (var i = -3; i <= 3; i += 1) {
      s.c.globalAlpha = 1 / 7;
      // Wrapping a duplicated shot keeps the high-velocity frame filled without inventing a new scene.
      for (var j = -4; j <= 4; j += 1) s.c.drawImage(source, offset + j * s.w + i * p.blurPx * e * 2, 0);
    }
    reset(s.c);
  });
  definition('zoom-through', '穿孔推进 / Zoom through', { zoom: number(12, 22), settleZoom: number(1.1, 2.4), focusX: number(0.35, 0.65), focusY: number(0.35, 0.65) }, (s, p) => {
    shot(s, s.a, false, { x: p.focusX, y: p.focusY, radius: 0.12 });
    shot(s, s.b, true, { x: p.focusX, y: p.focusY, radius: 0.12 });
  }, (s, p, t) => {
    var x = p.focusX * s.w, y = p.focusY * s.h, q = smooth(t);
    scaled(s.c, s.b, mix(p.settleZoom, 1, smooth(interval(t, 0.35, 1))), x, y, s.w, s.h);
    clear(s.wc); var zoom = 1 + (p.zoom - 1) * q;
    scaled(s.wc, s.a, zoom, x, y, s.w, s.h);
    s.wc.globalCompositeOperation = 'destination-out'; s.wc.fillStyle = '#fff';
    s.wc.beginPath(); s.wc.arc(x, y, Math.min(s.w, s.h) * 0.12 * zoom * smooth(interval(t, 0.05, 0.55)), 0, TAU); s.wc.fill();
    reset(s.wc); s.c.drawImage(s.work, 0, 0);
  });

  definition('blur-zoom', '径向拖影 / Blur zoom', { blurPx: number(2, 26), zoom: number(1.15, 1.9), samples: number(3, 11, true) }, requireFilter, (s, p, t) => {
    var e = Math.sin(Math.PI * t), source = t < 0.5 ? s.a : s.b;
    s.c.fillStyle = '#000'; s.c.fillRect(0, 0, s.w, s.h); s.c.globalCompositeOperation = 'lighter';
    s.c.filter = 'blur(' + p.blurPx * e + 'px)';
    for (var i = 0; i < p.samples; i += 1) {
      s.c.globalAlpha = 1 / p.samples;
      var zoom = 1 + 0.04 * e + (p.zoom - 1) * e * i / (p.samples - 1);
      scaled(s.c, source, zoom, s.w / 2, s.h / 2, s.w, s.h);
    }
    reset(s.c);
  });
  definition('chromatic-split', 'RGB 通道分离 / Chromatic split', { splitPx: number(6, 60), cutAt: number(0.25, 0.75) }, (s) => {
    s.data.channels = [];
    [s.a, s.b].forEach((source) => {
      var image = source.getContext('2d').getImageData(0, 0, s.w, s.h), channels = [];
      for (var channel = 0; channel < 3; channel += 1) {
        var plane = canvas(s), c = plane.getContext('2d'), pixels = c.createImageData(s.w, s.h);
        for (var i = 0; i < pixels.data.length; i += 4) { pixels.data[i + channel] = image.data[i + channel]; pixels.data[i + 3] = 255; }
        c.putImageData(pixels, 0, 0); channels.push(plane);
      }
      s.data.channels.push(channels);
    });
  }, (s, p, t) => {
    s.c.fillStyle = '#000'; s.c.fillRect(0, 0, s.w, s.h); s.c.globalCompositeOperation = 'lighter';
    var e = Math.sin(Math.PI * t);
    for (var i = 0; i < 3; i += 1) {
      var incoming = t >= p.cutAt + (i - 1) * 0.045;
      s.c.drawImage(s.data.channels[incoming ? 1 : 0][i], (i - 1) * p.splitPx * e, (1 - i) * p.splitPx * 0.15 * e);
    }
    reset(s.c);
  });
  definition('displacement-wave', '条带位移波 / Displacement wave', {
    amplitudePx: number(6, 64), wavelengthPx: number(24, 180), cycles: number(0.5, 4), stripPx: number(2, 8, true), cutAt: number(0.25, 0.75)
  }, null, (s, p, t) => {
    var source = t < p.cutAt ? s.a : s.b, e = Math.sin(Math.PI * t);
    for (var y = 0; y < s.h; y += p.stripPx) {
      var h = Math.min(p.stripPx, s.h - y);
      var dx = Math.sin(y / p.wavelengthPx * TAU - t * p.cycles * TAU) * p.amplitudePx * e;
      for (var i = -1; i <= 1; i += 1) s.c.drawImage(source, 0, y, s.w, h, dx + i * s.w, y, s.w, h);
    }
  });
  definition('glitch-bands', '同步错带 / Glitch band cut', { bands: number(5, 36, true), shiftPx: number(12, 150), cutAt: number(0.2, 0.8), window: number(0.15, 0.8), steps: number(3, 24, true) }, (s, p) => {
    s.data.bands = [];
    for (var i = 0; i < p.bands; i += 1) s.data.bands.push({ shift: s.random() * 2 - 1, phase: s.random() * TAU, threshold: s.random() });
  }, (s, p, t) => {
    var q = interval(t, p.cutAt - p.window / 2, p.cutAt + p.window / 2);
    var e = Math.sin(Math.PI * q), step = Math.floor(q * p.steps), height = s.h / p.bands;
    for (var i = 0; i < p.bands; i += 1) {
      var band = s.data.bands[i], y = i * height, h = Math.min(height + 0.5, s.h - y);
      var incoming = q > 0 && q < 1 ? q >= band.threshold : t >= p.cutAt;
      var shift = band.shift * p.shiftPx * e * Math.sin(step * 2.17 + band.phase);
      for (var j = -1; j <= 1; j += 1) s.c.drawImage(incoming ? s.b : s.a, 0, y, s.w, h, shift + j * s.w, y, s.w, h);
      if (e > 0) { s.c.fillStyle = 'rgba(68,235,212,' + e * 0.14 + ')'; s.c.fillRect(0, y, s.w, Math.max(1, h * 0.06)); }
    }
  }, (p) => {
    if (p.cutAt - p.window / 2 < 0 || p.cutAt + p.window / 2 > 1) throw new RangeError('glitch window must lie within the timeline');
  });
  definition('liquid-morph', '液面拖拽 / Liquid deformation', { columns: number(48, 160, true), sagPx: number(12, 100), viscosity: number(0.2, 1.2) }, (s, p) => {
    s.data.columns = [];
    for (var i = 0; i < p.columns; i += 1) s.data.columns.push({ phase: s.random() * TAU, weight: mix(0.4, 1, s.random()) });
  }, (s, p, t) => {
    var e = Math.sin(Math.PI * t), q = smooth(t), width = s.w / p.columns;
    s.c.drawImage(s.b, 0, 0);
    for (var i = 0; i < p.columns; i += 1) {
      var column = s.data.columns[i], x = i * width;
      var sag = (0.5 + 0.5 * Math.sin(i * 0.13 + column.phase * 0.25 - t * TAU * p.viscosity)) * p.sagPx * e * column.weight;
      var edge = mix(-s.h * 0.2, s.h * 1.25, q) + Math.sin(i * 0.17 - t * 4) * p.sagPx * e;
      s.c.save(); s.c.beginPath(); s.c.rect(x, edge, width + 0.7, Math.max(0, s.h - edge)); s.c.clip();
      s.c.drawImage(s.a, x, 0, Math.min(width + 1, s.w - x), s.h, x, sag, Math.min(width + 1, s.w - x), s.h + sag * p.viscosity);
      s.c.restore();
      if (edge > 0 && edge < s.h) { s.c.fillStyle = 'rgba(223,248,232,.5)'; s.c.fillRect(x, edge, width + 0.5, 2.5); }
    }
  });
  definition('ink-reveal', '墨团渗开 / Ink matte reveal', { splats: number(4, 18, true), roughness: number(0.08, 0.4), centerX: number(0.2, 0.8), centerY: number(0.2, 0.8) }, (s, p) => {
    s.data.splats = [];
    for (var i = 0; i < p.splats; i += 1) {
      var x = clamp(p.centerX + (s.random() - 0.5) * 0.75) * s.w, y = clamp(p.centerY + (s.random() - 0.5) * 0.75) * s.h;
      var edges = [];
      for (var j = 0; j < 72; j += 1) edges.push(1 + (s.random() * 2 - 1) * p.roughness);
      s.data.splats.push({ x: x, y: y, delay: i / p.splats * 0.36, edges: edges, reach: farthest(s, x, y) / (1 - p.roughness) });
    }
  }, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0);
    masked(s, (c) => {
      s.data.splats.forEach((splat) => {
        var q = smooth(interval(t, splat.delay, splat.delay + 0.62));
        if (!q) return;
        c.beginPath();
        splat.edges.forEach((weight, i) => {
          var angle = TAU * i / splat.edges.length, radius = splat.reach * q * weight;
          var x = splat.x + Math.cos(angle) * radius, y = splat.y + Math.sin(angle) * radius;
          if (i) c.lineTo(x, y); else c.moveTo(x, y);
        });
        c.closePath(); c.fill();
      });
    });
  });
  definition('noise-resolve', '噪点解析 / Noise resolve', { columns: number(24, 120, true), rows: number(12, 72, true), contrast: number(0.25, 1) }, (s, p) => {
    s.data.cells = grid(s, p.columns, p.rows);
    var noise = canvas(s), c = noise.getContext('2d');
    s.data.cells.forEach((cell) => {
      var v = Math.round(127 + (s.random() - 0.5) * 255 * p.contrast);
      c.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; c.fillRect(cell.x, cell.y, cell.w, cell.h);
    });
    s.data.noise = noise;
  }, (s, p, t) => {
    s.c.drawImage(s.a, 0, 0);
    s.c.globalAlpha = Math.sin(Math.PI * t) * 0.95; s.c.drawImage(s.data.noise, 0, 0); s.c.globalAlpha = 1;
    s.data.cells.forEach((cell) => {
      if (t < cell.key) return;
      s.c.drawImage(s.b, cell.x, cell.y, cell.w, cell.h, cell.x, cell.y, cell.w, cell.h);
    });
  });
  definition('particle-burst', '图像碎粒 / Image particle burst', { columns: number(8, 28, true), rows: number(5, 16, true), spreadPx: number(80, 400), gravityPx: number(0, 220) }, (s, p) => {
    s.data.cells = grid(s, p.columns, p.rows);
    s.data.cells.forEach((cell) => {
      var dx = cell.x + cell.w / 2 - s.w / 2, dy = cell.y + cell.h / 2 - s.h / 2;
      var length = Math.max(1, Math.hypot(dx, dy));
      cell.vx = dx / length * p.spreadPx * (0.6 + cell.key * 0.6);
      cell.vy = dy / length * p.spreadPx * (0.6 + cell.key * 0.6);
    });
  }, (s, p, t) => {
    s.c.drawImage(s.b, 0, 0);
    var q = 1 - (1 - t) ** 2;
    s.data.cells.forEach((cell) => {
      var size = 1 - smooth(t), width = cell.w * size, height = cell.h * size;
      if (size <= 0) return;
      var x = cell.x + cell.w / 2 + cell.vx * q, y = cell.y + cell.h / 2 + cell.vy * q + p.gravityPx * t * t;
      s.c.globalAlpha = 1 - t ** 2;
      s.c.drawImage(s.a, cell.x, cell.y, cell.w, cell.h, x - width / 2, y - height / 2, width, height);
    });
    s.c.globalAlpha = 1;
  });
  definition('ripple-reveal', '径向采样涟漪 / Ripple reveal', { centerX: number(0.2, 0.8), centerY: number(0.2, 0.8), rings: number(2, 8, true), amplitudePx: number(4, 28), cellPx: number(6, 18, true) }, (s, p) => {
    var x = s.w * p.centerX, y = s.h * p.centerY;
    s.data.ripple = grid(s, Math.ceil(s.w / p.cellPx), Math.ceil(s.h / p.cellPx));
    s.data.ripple.forEach((cell) => {
      var dx = cell.x + cell.w / 2 - x, dy = cell.y + cell.h / 2 - y, length = Math.max(1, Math.hypot(dx, dy));
      cell.distance = length; cell.nx = dx / length; cell.ny = dy / length;
    });
    s.data.reach = farthest(s, x, y) + p.amplitudePx + p.cellPx;
  }, (s, p, t) => {
    var x = s.w * p.centerX, y = s.h * p.centerY, radius = smooth(t) * s.data.reach, e = Math.sin(Math.PI * t);
    s.data.ripple.forEach((cell) => {
      var displacement = Math.sin(cell.distance / s.data.reach * p.rings * TAU - t * TAU * 2) * p.amplitudePx * e;
      var sx = Math.max(0, Math.min(s.w - cell.w, cell.x + cell.nx * displacement));
      var sy = Math.max(0, Math.min(s.h - cell.h, cell.y + cell.ny * displacement));
      s.c.drawImage(s.a, sx, sy, cell.w, cell.h, cell.x, cell.y, cell.w, cell.h);
    });
    masked(s, (c) => { c.beginPath(); c.arc(x, y, radius, 0, TAU); c.fill(); });
    s.c.strokeStyle = 'rgba(212,247,236,' + e * 0.65 + ')'; s.c.lineWidth = 2;
    for (var i = 0; i < p.rings; i += 1) {
      var r = radius - i * s.data.reach / p.rings * 0.24;
      if (r <= 0) continue;
      s.c.beginPath(); s.c.arc(x, y, r, 0, TAU); s.c.stroke();
    }
  });

  function cueLanes(s, p, progress) {
    var c = s.c, w = s.w, h = s.h, imageHeight = h * 0.65;
    c.drawImage(progress < p.visualCutAt ? s.a : s.b, 0, 0, w, imageHeight);
    c.fillStyle = '#142632'; c.fillRect(0, imageHeight, w, h - imageHeight);
    var left = w * 0.24, right = w * 0.94, width = right - left;
    var ys = [h * 0.72, h * 0.81, h * 0.9], laneHeight = h * 0.05;
    var incomingAt = p.visualCutAt - p.lead, outgoingEnd = p.visualCutAt + p.lag;
    c.font = Math.max(10, Math.round(h * 0.03)) + 'px ' + FONT; c.textBaseline = 'middle';
    ['画面 Visual', '入声 B / J', '出声 A / L'].forEach((label, i) => { c.fillStyle = '#edf2e9'; c.fillText(label, w * 0.035, ys[i] + laneHeight / 2); });
    function bar(y, a, b, color) { c.fillStyle = color; c.fillRect(left + width * a, y, width * (b - a), laneHeight); }
    bar(ys[0], 0, p.visualCutAt, '#d9ad67'); bar(ys[0], p.visualCutAt, 1, '#88bca7');
    bar(ys[1], incomingAt, 1, '#88bca7'); bar(ys[2], 0, outgoingEnd, '#d9ad67');
    c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(left + width * p.visualCutAt, ys[0] - 3); c.lineTo(left + width * p.visualCutAt, ys[2] + laneHeight + 2); c.stroke(); c.setLineDash(EMPTY_DASH);
    c.strokeStyle = '#f5dfb8'; c.lineWidth = 2; c.beginPath(); c.moveTo(left + width * progress, ys[0] - 4); c.lineTo(left + width * progress, ys[2] + laneHeight + 4); c.stroke();
    var visual = progress < p.visualCutAt ? 'A' : 'B';
    var sound = (progress < outgoingEnd ? 'A' : '') + (progress >= incomingAt ? (progress < outgoingEnd ? '+B' : 'B') : '');
    s.caption.textContent = '声音时序示意（不播放、不渲染音频） · 画面 ' + visual + '；声音 cue ' + sound + '；J 提前 ' + p.lead.toFixed(2) + '，L 延后 ' + p.lag.toFixed(2) + '（归一化时间）。 ' + s.text;
    s.surface.dataset.visualShot = visual; s.surface.dataset.soundCue = sound;
  }
  cueLanes.cueLane = true;
  definition('sound-offset-cut', '声画错位剪辑 / J-cut and L-cut', { visualCutAt: number(0.3, 0.7), lead: number(0.05, 0.4), lag: number(0.05, 0.4) }, null, cueLanes, (p) => {
    if (p.lead >= p.visualCutAt || p.visualCutAt + p.lag >= 1) throw new RangeError('sound cue lead/lag must leave both boundaries inside the timeline');
  }, (s, p) => { cueLanes(s, p, 1); });

  return { recipes: recipes };
});
