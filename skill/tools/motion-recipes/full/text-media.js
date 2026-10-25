(((root, factory) => {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text-core.js'));
  else {
    root.MotionTextParts = root.MotionTextParts || {};
    root.MotionTextParts.media = factory(root.MotionTextCore);
  }
})(typeof globalThis === 'undefined' ? this : globalThis, core => {
  
  if (!core) throw new Error('MotionTextCore is required by text-media');
  const recipes = {};
  const range = (min, max) => ({ min, max });
  const integer = (min, max) => value => Number.isInteger(value) && value >= min && value <= max;
  const schema = (unit, fields) => Object.assign({ unit:[unit] }, fields);
  const ease = value => 1 - (1 - value) ** 3;
  const TAU = Math.PI * 2;
  let resourceId = 0;
  const uid = () => 'motion-text-media-' + (++resourceId);
  function add(key, title, rules, render) {
    recipes['text.' + key] = core.recipe('text.' + key, title, rules, (view, p) => {
      view.root.dataset.mediaMechanism = key;
      view.root.style.lineBreak = 'strict';
      view.root.style.wordBreak = 'normal';
      view.root.style.overflowWrap = 'break-word';
      try { return render(view, p); }
      catch (error) { view.dispose(); throw error; }
    });
  }
  function life(view, draw, release) {
    const result = core.lifecycle(view, draw);
    let disposed = false;
    return { seek:result.seek, dispose() {
      if (disposed) return;
      disposed = true;
      if (release) release();
      result.dispose();
    } };
  }
  function text(view) {
    const node = view.node('div', view.text, { position:'relative', maxInlineSize:'100%', whiteSpace:'pre-wrap', textAlign:'center', isolation:'isolate' });
    node.setAttribute('aria-hidden', 'true');
    return node;
  }
  function caption(view) {
    const node = view.node('div', view.text, { fontSize:'16px', lineHeight:'1.6', marginBlockStart:'20px', maxInlineSize:'100%', textAlign:'center', color:'#e9f2ff' });
    node.setAttribute('aria-hidden', 'true');
    return node;
  }
  function clippedText(view) {
    const node = text(view);
    Object.assign(node.style, { backgroundClip:'text', WebkitBackgroundClip:'text', color:'transparent' });
    return node;
  }
  function duplicate(view, parent, content, style) {
    const node = view.node('span', content, Object.assign({ position:'absolute', inset:'0', whiteSpace:'inherit', pointerEvents:'none' }, style), parent);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }
  function wrappers(view, unit) {
    const parts = core.tokens(view, unit, 'zh');
    const inner = parts.nodes.map((node, i) => {
      node.textContent = '';
      Object.assign(node.style, { overflow:'clip', lineHeight:'1.5', willChange:'auto' });
      return view.node('span', parts.units[i], { display:'block', whiteSpace:'pre-wrap' }, node);
    });
    return Object.assign(parts, { inner });
  }
  function svgScene(view, width, height, semanticCaption) {
    const svg = view.svg('svg', { viewBox:`0 0 ${width} ${height}`, width:'100%', height });
    Object.assign(svg.style, { maxInlineSize:'100%', blockSize:'auto', overflow:'visible', flex:'none' });
    svg.setAttribute('aria-hidden', 'true');
    if (semanticCaption) caption(view);
    return svg;
  }
  function definitions(view) {
    const svg = view.svg('svg', { width:0, height:0, 'aria-hidden':'true' });
    Object.assign(svg.style, { position:'absolute', pointerEvents:'none' });
    return view.svg('defs', {}, svg);
  }
  function fontCanvas(view) {
    const canvas = view.root.ownerDocument.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently:true });
    if (!context) throw new Error('A Canvas 2D context is required for text-derived raster media');
    return { canvas, context };
  }
  // This is local system-font rasterisation, not imported font outlines or writing strokes.
  function layout(view, fontSize = 48, maxWidth = 900) {
    const { canvas, context } = fontCanvas(view);
    const family = view.root.style.fontFamily;
    context.font = `500 ${fontSize}px ${family}`;
    const units = core.segments(view.text, 'char', 'zh');
    const glyphs = [], lines = [];
    const pad = 12, lineHeight = fontSize * 1.6;
    let x = pad, y = pad + fontSize, line = '', widest = pad;
    function finishLine() { lines.push({ value:line, y }); widest = Math.max(widest, x); line = ''; x = pad; y += lineHeight; }
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      if (/^[\r\n]+$/.test(unit)) { finishLine(); continue; }
      const width = context.measureText(unit).width;
      if (x > pad && x + width > maxWidth - pad) finishLine();
      glyphs.push({ value:unit, x, y, width, index:i });
      x += width; line += unit;
    }
    finishLine();
    const width = Math.max(240, Math.ceil(widest + pad)), height = Math.max(96, Math.ceil(y - lineHeight + fontSize * .6));
    canvas.width = width; canvas.height = height;
    context.font = `500 ${fontSize}px ${family}`;
    context.fillStyle = '#e9f2ff';
    context.textBaseline = 'alphabetic';
    for (const row of lines) context.fillText(row.value, pad, row.y);
    return { canvas, context, glyphs, lines, width, height, fontSize, family, dispose() { canvas.width = 0; canvas.height = 0; } };
  }
  function raster(view, extraHeight = 0) {
    const source = layout(view);
    const canvas = view.node('canvas', null, { maxInlineSize:'100%', inlineSize:source.width + 'px', blockSize:'auto', flex:'none' });
    canvas.width = source.width; canvas.height = source.height + extraHeight;
    canvas.setAttribute('aria-hidden', 'true');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('A Canvas 2D output is required for text media');
    caption(view);
    return Object.assign(source, { output:canvas, draw:context, clear() { context.clearRect(0, 0, canvas.width, canvas.height); }, dispose() { source.canvas.width = 0; source.canvas.height = 0; canvas.width = 0; canvas.height = 0; } });
  }
  function coverage(source, size) {
    const pixels = source.context.getImageData(0, 0, source.width, source.height).data;
    const cells = [];
    for (let y = 0; y < source.height; y += size) for (let x = 0; x < source.width; x += size) {
      const width = Math.min(size, source.width - x), height = Math.min(size, source.height - y);
      let sum = 0;
      for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) sum += pixels[((y + dy) * source.width + x + dx) * 4 + 3];
      const alpha = sum / (255 * width * height);
      if (alpha > 0) cells.push({ x, y, width, height, alpha });
    }
    return cells;
  }
  function blurWords(view, p, kind) {
    const parts = core.tokens(view, p.unit, 'zh');
    const ranked = parts.nodes.map((_, i) => i).sort((a, b) => core.random(view.seed, a) - core.random(view.seed, b));
    const ranks = new Array(ranked.length);
    ranked.forEach((index, rank) => { ranks[index] = rank; });
    return life(view, (progress, reduced) => {
      parts.nodes.forEach((node, i) => {
        const q = reduced ? 1 : core.phase(progress, kind === 'random' ? ranks[i] : i, parts.nodes.length, p.spread);
        let focus = ease(q), opacity = focus;
        if (kind === 'three') {
          focus = q < .3 ? .15 * q / .3 : q < .68 ? .15 + .5 * (q - .3) / .38 : .65 + .35 * (q - .68) / .32;
          opacity = core.clamp(q / .3);
        }
        if (kind === 'generate') { focus = q * q * (3 - 2 * q); opacity = core.clamp(q * 1.5); }
        node.style.filter = `blur(${p.blurPx * (1 - focus)}px)`;
        node.style.opacity = String(opacity);
      });
    });
  }

  add('blur-in-3step', '三段词组聚焦 / Three-stage word focus', schema('word', { blurPx:range(1, 32), spread:range(0, .8) }), (view, p) => blurWords(view, p, 'three'));
  add('blur-in-chars', '逐字清晰 / Grapheme blur reveal', schema('char', { blurPx:range(1, 32), spread:range(0, .8) }), (view, p) => blurWords(view, p, 'ordered'));
  add('blur-random-in', '乱序清晰 / Seeded focus order', schema('char', { blurPx:range(1, 32), spread:range(0, .8) }), (view, p) => blurWords(view, p, 'random'));
  add('text-generate', '词组生成 / Word clarity build', schema('word', { blurPx:range(1, 32), spread:range(0, .8) }), (view, p) => blurWords(view, p, 'generate'));
  add('directional-blur-slide', '横向拖影聚焦 / Anisotropic blur slide', schema('whole', { blurPx:range(1, 32), distancePx:range(8, 120) }), (view, p) => {
    const node = text(view), id = uid();
    const filter = view.svg('filter', { id, x:'-60%', y:'-20%', width:'220%', height:'140%' }, definitions(view));
    const gaussian = view.svg('feGaussianBlur', { stdDeviation:'0 0' }, filter);
    node.style.filter = `url(#${id})`;
    return life(view, (progress, reduced) => {
      const q = reduced ? 1 : ease(progress);
      gaussian.setAttribute('stdDeviation', `${p.blurPx * (1 - q)} 0`);
      node.style.transform = `translateX(${-p.distancePx * (1 - q)}px)`;
      node.style.opacity = String(q);
    });
  });
  add('scale-blur-zoom', '变焦清晰 / Scale and optical blur', schema('whole', { blurPx:range(1, 32), startScale:range(.65, 1.4) }), (view, p) => {
    const node = text(view);
    return life(view, (progress, reduced) => {
      const q = reduced ? 1 : ease(progress);
      node.style.filter = `blur(${p.blurPx * (1 - q)}px)`;
      node.style.transform = `scale(${p.startScale + (1 - p.startScale) * q})`;
      node.style.opacity = String(q);
    });
  });
  add('tracking-blur-build', '字距收束聚焦 / Tracking and blur build', schema('char', { blurPx:range(1, 28), trackingEm:range(.05, .8), spread:range(0, .65) }), (view, p) => {
    const parts = core.tokens(view, 'char', 'zh');
    return life(view, (progress, reduced) => parts.nodes.forEach((node, i) => {
      const q = reduced ? 1 : ease(core.phase(progress, i, parts.nodes.length, p.spread));
      node.style.marginInlineEnd = (i === parts.nodes.length - 1 ? 0 : p.trackingEm * (1 - q)) + 'em';
      node.style.filter = `blur(${p.blurPx * (1 - q)}px)`;
      node.style.opacity = String(.25 + .75 * q);
    }));
  });
  add('rack-focus', '行间移焦 / Line-plane rack focus', schema('line', { blurPx:range(2, 22) }), (view, p) => {
    const parts = core.tokens(view, 'line', 'zh');
    if (parts.nodes.length === 1) parts.nodes.push(view.node('span', parts.units[0], { display:'block', marginBlockStart:'.45em' }, parts.box));
    return life(view, (progress, reduced) => {
      const focus = progress * (parts.nodes.length - 1);
      parts.nodes.forEach((node, i) => {
        const distance = reduced ? 0 : Math.min(1, Math.abs(i - focus));
        node.style.filter = `blur(${p.blurPx * distance}px)`;
        node.style.opacity = String(1 - distance * .2);
      });
    });
  });
  add('true-focus', '词组焦点框 / Word focus bracket', schema('word', { blurPx:range(2, 20), focusSpan:range(.15, .8) }), (view, p) => {
    const parts = core.tokens(view, 'word', 'zh');
    const meaningful = parts.nodes.map((node, i) => ({ node, value:parts.units[i] })).filter(entry => /\S/u.test(entry.value));
    meaningful.forEach(entry => Object.assign(entry.node.style, { border:'1px solid transparent', paddingInline:'.05em', borderRadius:'3px' }));
    return life(view, (progress, reduced) => {
      const focus = Math.min(meaningful.length - 1, Math.floor(progress / p.focusSpan * meaningful.length));
      const settle = core.clamp((progress - .85) / .15);
      meaningful.forEach((entry, i) => {
        entry.node.style.filter = `blur(${reduced || i === focus ? 0 : p.blurPx * (1 - settle)}px)`;
        entry.node.style.borderColor = !reduced && i === focus && progress < 1 ? '#85d7f7' : 'transparent';
      });
    });
  });

  add('aurora-text', '极光字面 / Layered aurora light', schema('whole', { turns:range(.2, 2), intensity:range(.3, 1) }), (view, p) => {
    const node = clippedText(view);
    node.style.backgroundColor = '#bfe9fb';
    node.style.backgroundImage = 'radial-gradient(ellipse at 25% 30%, #9f86f7 0, transparent 58%), radial-gradient(ellipse at 75% 70%, #52e8c6 0, transparent 65%), linear-gradient(110deg, #e9f2ff, #428ec1)';
    node.style.backgroundSize = '160% 180%, 180% 170%, 100% 100%';
    return life(view, (progress, reduced) => {
      const angle = (reduced ? .25 : progress) * TAU * p.turns;
      node.style.backgroundPosition = `${50 + 35 * Math.sin(angle)}% ${50 + 30 * Math.cos(angle)}%, ${50 - 35 * Math.sin(angle)}% ${50 - 30 * Math.cos(angle)}%, center`;
      node.style.filter = `saturate(${.7 + p.intensity})`;
    });
  });
  add('blend-overlap', '分色叠印 / Screen-blended glyph layers', schema('char', { shiftPx:range(2, 22), overlapEm:range(.02, .25) }), (view, p) => {
    const parts = core.tokens(view, 'char', 'zh');
    parts.box.style.isolation = 'isolate';
    const layers = parts.nodes.map((node, i) => [duplicate(view, node, parts.units[i], { color:'#ff5473', mixBlendMode:'screen' }), duplicate(view, node, parts.units[i], { color:'#48c9ef', mixBlendMode:'screen' })]);
    return life(view, (progress, reduced) => {
      const amount = reduced ? 0 : Math.sin(Math.PI * progress);
      parts.nodes.forEach((node, i) => {
        node.style.color = '#d9e9ee';
        node.style.marginInlineStart = (i === 0 ? 0 : -p.overlapEm * amount) + 'em';
        layers[i][0].style.transform = `translateX(${-p.shiftPx * amount}px)`;
        layers[i][1].style.transform = `translateX(${p.shiftPx * amount}px)`;
        layers[i].forEach(layer => { layer.style.opacity = String(amount); });
      });
    });
  });
  add('color-band-sweep', '逐字色带 / Moving glyph colour band', schema('char', { bandWidth:range(1, 8), hue:range(0, 360) }), (view, p) => {
    const parts = core.tokens(view, 'char', 'zh');
    return life(view, (progress, reduced) => {
      const centre = (progress * (parts.nodes.length + p.bandWidth * 2)) - p.bandWidth;
      parts.nodes.forEach((node, i) => {
        const amount = reduced ? 0 : core.clamp(1 - Math.abs(i - centre) / p.bandWidth);
        node.style.color = `hsl(${p.hue} ${amount * 85}% ${94 - amount * 25}%)`;
      });
    });
  });
  add('conic-spin', '锥形色盘 / Rotating conic fill', schema('whole', { turns:range(.2, 3) }), (view, p) => {
    const node = clippedText(view);
    return life(view, (progress, reduced) => { node.style.backgroundImage = `conic-gradient(from ${(reduced ? .15 : progress) * p.turns * 360}deg, #efb577, #b997f2, #6bdecd, #efb577)`; });
  });
  add('gradient-flow', '流动渐变 / Translating gradient fill', schema('whole', { travelPercent:range(40, 240) }), (view, p) => {
    const node = clippedText(view);
    node.style.backgroundImage = 'linear-gradient(90deg, #9bc8ff, #d7a2e9, #92efd7, #9bc8ff)';
    node.style.backgroundSize = '300% 100%';
    return life(view, (progress, reduced) => { node.style.backgroundPosition = `${reduced ? 50 : progress * p.travelPercent}% 50%`; });
  });
  add('glow-pulse', '柔光呼吸 / Bounded glow pulse', schema('whole', { glowPx:range(2, 36), pulses:integer(1, 3) }), (view, p) => {
    const node = text(view);
    return life(view, (progress, reduced) => {
      const amount = reduced ? .35 : .2 + .8 * Math.sin(progress * Math.PI * p.pulses) ** 2;
      node.style.textShadow = `0 0 ${p.glowPx * amount}px #71c8db, 0 0 ${p.glowPx * amount * .35}px #abddeb`;
    });
  });
  add('hue-cycle', '逐字色相 / Grapheme hue cycle', schema('char', { turns:range(.25, 2), hueSpread:range(20, 300) }), (view, p) => {
    const parts = core.tokens(view, 'char', 'zh');
    return life(view, (progress, reduced) => parts.nodes.forEach((node, i) => { node.style.color = reduced ? '#e9f2ff' : `hsl(${progress * p.turns * 360 + i / Math.max(1, parts.nodes.length - 1) * p.hueSpread} 72% 77%)`; }));
  });
  add('line-shadow', '线框投影 / Outlined text echoes', schema('whole', { offsetPx:range(2, 24), lineCount:integer(2, 8) }), (view, p) => {
    const node = text(view);
    const layers = Array.from({ length:p.lineCount }, (_, i) => duplicate(view, node, view.text, { color:'transparent', WebkitTextStroke:'1px #78a0bc', zIndex:String(-i - 1) }));
    return life(view, (progress, reduced) => layers.forEach((layer, i) => {
      const distance = reduced ? 0 : p.offsetPx * (i + 1) / p.lineCount;
      const angle = progress * TAU;
      layer.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
      layer.style.opacity = reduced ? '0' : String(.8 - i / p.lineCount * .5);
    }));
  });
  add('long-shadow-grow', '长影生长 / Extruded glyph shadow', schema('whole', { lengthPx:range(4, 56), directionDeg:range(10, 80) }), (view, p) => {
    const node = text(view), angle = p.directionDeg * Math.PI / 180;
    return life(view, (progress, reduced) => {
      const length = reduced ? Math.min(3, p.lengthPx) : ease(progress) * p.lengthPx;
      const shadows = [];
      for (let i = 1; i <= Math.ceil(length); i++) shadows.push(`${Math.cos(angle) * i}px ${Math.sin(angle) * i}px 0 #3c607b`);
      node.style.textShadow = shadows.length ? shadows.join(',') : 'none';
    });
  });
  add('neon-flicker', '霓虹通电 / Stepped neon ignition', schema('char', { glowPx:range(4, 32), flickers:integer(2, 6) }), (view, p) => {
    const parts = core.tokens(view, 'char', 'zh');
    return life(view, (progress, reduced) => parts.nodes.forEach((node, i) => {
      const frame = Math.min(p.flickers - 1, Math.floor(progress / .58 * p.flickers));
      const amount = reduced || progress >= .58 ? 1 : .3 + .7 * (core.random(view.seed, i * p.flickers + frame) > .42 ? 1 : .08);
      node.style.color = `hsl(185 72% ${45 + amount * 40}%)`;
      node.style.textShadow = `0 0 ${p.glowPx * amount}px #64d7e5, 0 0 ${p.glowPx * amount * .4}px #b7f5fa`;
    }));
  });
  add('random-color-pop', '离散换色 / Seeded glyph palette steps', schema('char', { steps:integer(2, 8), saturation:range(40, 85) }), (view, p) => {
    const parts = core.tokens(view, 'char', 'zh');
    return life(view, (progress, reduced) => {
      const frame = Math.min(p.steps - 1, Math.floor(progress * p.steps));
      parts.nodes.forEach((node, i) => { node.style.color = reduced ? '#e9f2ff' : `hsl(${core.random(view.seed, i * p.steps + frame) * 360} ${p.saturation}% 78%)`; });
    });
  });
  add('shiny-sweep', '窄带掠光 / Specular glyph sweep', schema('whole', { bandPercent:range(4, 30) }), (view, p) => {
    const node = clippedText(view);
    return life(view, (progress, reduced) => {
      const centre = reduced ? -p.bandPercent : progress * (100 + 2 * p.bandPercent) - p.bandPercent;
      node.style.backgroundImage = `linear-gradient(105deg, #8ab4ce ${centre - p.bandPercent}%, #ffffff ${centre}%, #8ab4ce ${centre + p.bandPercent}%)`;
    });
  });

  add('bar-wipe-reveal', '带头擦显 / Line wipe with leading bar', schema('line', { barPx:range(4, 24), spread:range(0, .7) }), (view, p) => {
    const parts = core.tokens(view, 'line', 'zh');
    const bars = parts.nodes.map(node => view.node('span', null, { position:'absolute', insetBlock:'0', inlineSize:p.barPx + 'px', background:'#83c7e6', pointerEvents:'none' }, node));
    return life(view, (progress, reduced) => parts.nodes.forEach((node, i) => {
      const q = reduced ? 1 : ease(core.phase(progress, i, parts.nodes.length, p.spread));
      node.style.clipPath = `inset(0 ${(1 - q) * 100}% 0 0)`;
      bars[i].style.insetInlineStart = `calc(${q * 100}% - ${p.barPx}px)`;
      bars[i].style.opacity = reduced || q >= 1 || q <= 0 ? '0' : '1';
    }));
  });
  add('blinds-reveal', '百叶展开 / Slatted text aperture', schema('whole', { slats:integer(3, 12) }), (view, p) => {
    const node = text(view); node.style.color = 'transparent';
    const layers = Array.from({ length:p.slats }, () => duplicate(view, node, view.text, { color:'#e9f2ff' }));
    return life(view, (progress, reduced) => layers.forEach((layer, i) => {
      const q = reduced ? 1 : ease(progress), centre = (i + .5) / p.slats * 100, half = q / p.slats * 50;
      layer.style.clipPath = `inset(${centre - half}% 0 ${100 - centre - half}% 0)`;
    }));
  });
  function maskedRise(view, p, horizontal) {
    const parts = wrappers(view, p.unit);
    return life(view, (progress, reduced) => parts.inner.forEach((node, i) => {
      const q = reduced ? 1 : ease(core.phase(progress, i, parts.inner.length, p.spread));
      node.style.transform = `${horizontal ? 'translateX' : 'translateY'}(${(horizontal ? -1 : 1) * p.distanceEm * (1 - q)}em)`;
    }));
  }
  add('char-mask-rise', '逐字窗内升起 / Clipped grapheme rise', schema('char', { distanceEm:range(.5, 2), spread:range(0, .8) }), (view, p) => maskedRise(view, p, false));
  add('line-mask-rise', '逐行窗内升起 / Clipped line rise', schema('line', { distanceEm:range(.5, 2), spread:range(0, .8) }), (view, p) => maskedRise(view, p, false));
  add('slide-x-mask', '逐字窗内横移 / Clipped grapheme slide', schema('char', { distanceEm:range(1, 3), spread:range(0, .8) }), (view, p) => maskedRise(view, p, true));
  add('diagonal-cut-reveal', '斜口逐词擦显 / Slanted word aperture', schema('word', { slopePercent:range(4, 28), spread:range(0, .75) }), (view, p) => {
    const parts = core.tokens(view, 'word', 'zh');
    return life(view, (progress, reduced) => parts.nodes.forEach((node, i) => {
      const q = reduced ? 1 : ease(core.phase(progress, i, parts.nodes.length, p.spread));
      const edge = q * (100 + p.slopePercent) - p.slopePercent;
      node.style.clipPath = q === 1 ? 'none' : `polygon(0 0, ${edge}% 0, ${edge + p.slopePercent}% 100%, 0 100%)`;
    }));
  });
  add('iris-reveal', '圆孔开显 / Expanding circular aperture', schema('whole', { originXPct:range(20, 80), originYPct:range(20, 80) }), (view, p) => {
    const node = text(view);
    return life(view, (progress, reduced) => { node.style.clipPath = reduced || progress === 1 ? 'none' : `circle(${ease(progress) * 150}% at ${p.originXPct}% ${p.originYPct}%)`; });
  });
  add('outline-fill-sweep', '线框灌色 / Outline with clipped fill', schema('whole', { strokePx:range(.6, 2) }), (view, p) => {
    const node = text(view);
    Object.assign(node.style, { color:'transparent', WebkitTextStroke:`${p.strokePx}px #abcde2` });
    const fill = duplicate(view, node, view.text, { color:'#e9f2ff', WebkitTextStroke:'0 transparent' });
    return life(view, (progress, reduced) => { fill.style.clipPath = `inset(0 ${(1 - (reduced ? 1 : ease(progress))) * 100}% 0 0)`; });
  });
  add('shape-mask-cut', '多边形开显 / Polygonal aperture cut', schema('whole', { corners:integer(3, 8) }), (view, p) => {
    const node = text(view);
    return life(view, (progress, reduced) => {
      if (reduced || progress === 1) { node.style.clipPath = 'none'; return; }
      const radius = progress ** 3 * 180, points = [];
      for (let i = 0; i < p.corners; i++) { const angle = -Math.PI / 2 + i / p.corners * TAU; points.push(`${50 + Math.cos(angle) * radius}% ${50 + Math.sin(angle) * radius}%`); }
      node.style.clipPath = `polygon(${points.join(',')})`;
    });
  });
  add('soft-mask-wipe', '羽化擦显 / Gradient alpha wipe', schema('whole', { featherPercent:range(8, 40) }), (view, p) => {
    const node = text(view);
    return life(view, (progress, reduced) => {
      const edge = ease(progress) * (100 + p.featherPercent * 2) - p.featherPercent;
      const mask = reduced || progress === 1 ? 'none' : progress === 0 ? 'linear-gradient(transparent, transparent)' : `linear-gradient(90deg, #000 ${edge - p.featherPercent}%, transparent ${edge}%)`;
      node.style.maskImage = mask; node.style.WebkitMaskImage = mask;
    });
  });
  add('split-halves', '上下错半归位 / Opposing clipped word halves', schema('word', { distanceEm:range(.3, 2), spread:range(0, .75) }), (view, p) => {
    const parts = core.tokens(view, 'word', 'zh');
    const layers = parts.nodes.map((node, i) => {
      node.style.color = 'transparent';
      return [duplicate(view, node, parts.units[i], { color:'#e9f2ff', clipPath:'inset(0 0 50% 0)' }), duplicate(view, node, parts.units[i], { color:'#e9f2ff', clipPath:'inset(50% 0 0 0)' })];
    });
    return life(view, (progress, reduced) => layers.forEach((halves, i) => {
      const q = reduced ? 1 : ease(core.phase(progress, i, layers.length, p.spread));
      halves[0].style.transform = `translateX(${-p.distanceEm * (1 - q)}em)`;
      halves[1].style.transform = `translateX(${p.distanceEm * (1 - q)}em)`;
    }));
  });
  add('texture-fill', '织纹字面 / Original woven texture fill', schema('whole', { texture:['woven'], travelPx:range(20, 120) }), (view, p) => {
    const node = clippedText(view);
    node.style.backgroundColor = '#9bc9df';
    node.style.backgroundImage = 'repeating-linear-gradient(0deg, transparent 0 3px, #5b879f 3px 5px, transparent 5px 9px), repeating-linear-gradient(90deg, #bedfeb 0 2px, transparent 2px 6px), radial-gradient(ellipse at center, #e7f3eb, #6697b1)';
    return life(view, (progress, reduced) => { const offset = reduced ? 0 : progress * p.travelPx; node.style.backgroundPosition = `${offset}px ${offset * .35}px, ${-offset * .45}px ${offset * .7}px, center`; });
  });

  add('ascii-render', '字面点阵转字符 / Glyph-derived ASCII rendering', schema('whole', { cellPx:integer(6, 16), resolveStart:range(.55, .85) }), (view, p) => {
    const image = raster(view), cells = coverage(image, p.cellPx), palette = ' .:-=+*#@';
    const ascii = cells.map(cell => Object.assign(cell, { symbol:palette[Math.min(palette.length - 1, Math.floor(Math.sqrt(cell.alpha) * (palette.length - 1)))] }));
    return life(view, (progress, reduced) => {
      image.clear();
      const resolve = reduced ? 1 : core.clamp((progress - p.resolveStart) / (1 - p.resolveStart));
      image.draw.globalAlpha = 1 - resolve;
      image.draw.font = `${p.cellPx}px monospace`;
      image.draw.textBaseline = 'top'; image.draw.fillStyle = '#b7e6ee';
      for (const cell of ascii) image.draw.fillText(cell.symbol, cell.x, cell.y);
      image.draw.globalAlpha = resolve; image.draw.drawImage(image.canvas, 0, 0); image.draw.globalAlpha = 1;
    }, image.dispose);
  });
  add('pixel-mosaic', '字面马赛克还原 / Raster-derived pixel reconstruction', schema('whole', { coarsePx:integer(18, 48), steps:integer(3, 8) }), (view, p) => {
    const image = raster(view);
    const levels = Array.from({ length:p.steps }, (_, i) => coverage(image, Math.max(2, Math.round(p.coarsePx * (1 - i / p.steps) ** 2))));
    return life(view, (progress, reduced) => {
      image.clear();
      if (reduced || progress === 1) { image.draw.drawImage(image.canvas, 0, 0); return; }
      const level = Math.min(p.steps - 1, Math.floor(progress * p.steps));
      image.draw.fillStyle = '#e9f2ff';
      for (const cell of levels[level]) { image.draw.globalAlpha = cell.alpha; image.draw.fillRect(cell.x, cell.y, cell.width, cell.height); }
      image.draw.globalAlpha = 1;
    }, image.dispose);
  });
  add('fuzzy-text', '细行毛边 / Text-derived row jitter', schema('whole', { jitterPx:range(1, 12), frames:integer(8, 40) }), (view, p) => {
    const image = raster(view);
    return life(view, (progress, reduced) => {
      image.clear();
      const frame = Math.min(p.frames - 1, Math.floor(progress * p.frames)), amount = reduced ? 0 : Math.sin(progress * Math.PI);
      for (let y = 0; y < image.height; y++) {
        const shift = (core.random(view.seed, frame * image.height + y) * 2 - 1) * p.jitterPx * amount;
        image.draw.drawImage(image.canvas, 0, y, image.width, 1, shift, y, image.width, 1);
      }
    }, image.dispose);
  });
  add('slice-glitch', '条带错位 / Raster slice displacement', schema('whole', { slices:integer(4, 14), shiftPx:range(4, 50), frames:integer(4, 16) }), (view, p) => {
    const image = raster(view);
    return life(view, (progress, reduced) => {
      image.clear();
      const frame = Math.min(p.frames - 1, Math.floor(progress * p.frames)), envelope = reduced ? 0 : Math.sin(progress * Math.PI);
      for (let i = 0; i < p.slices; i++) {
        const y = Math.floor(i / p.slices * image.height), end = Math.floor((i + 1) / p.slices * image.height);
        const dx = (core.random(view.seed, frame * p.slices + i) * 2 - 1) * p.shiftPx * envelope;
        image.draw.drawImage(image.canvas, 0, y, image.width, end - y, dx, y, image.width, end - y);
      }
    }, image.dispose);
  });
  add('rgb-split-glitch', '三色通道分离 / Additive RGB separation', schema('whole', { splitPx:range(2, 24), frames:integer(3, 12) }), (view, p) => {
    const image = raster(view);
    const channels = ['#ff0000', '#00ff00', '#0000ff'].map(color => {
      const result = fontCanvas(view); result.canvas.width = image.width; result.canvas.height = image.height;
      result.context.drawImage(image.canvas, 0, 0); result.context.globalCompositeOperation = 'source-in';
      result.context.fillStyle = color; result.context.fillRect(0, 0, image.width, image.height);
      return result.canvas;
    });
    return life(view, (progress, reduced) => {
      image.clear();
      if (reduced || progress === 0 || progress === 1) { image.draw.drawImage(image.canvas, 0, 0); return; }
      const frame = Math.min(p.frames - 1, Math.floor(progress * p.frames));
      const amount = p.splitPx * Math.sin(Math.PI * progress) * (.5 + core.random(view.seed, frame) * .5);
      image.draw.globalCompositeOperation = 'screen';
      image.draw.drawImage(channels[0], -amount, 0); image.draw.drawImage(channels[1], 0, 0); image.draw.drawImage(channels[2], amount, 1);
      image.draw.globalCompositeOperation = 'source-over';
    }, () => { image.dispose(); channels.forEach(channel => { channel.width = 0; channel.height = 0; }); });
  });
  add('vhs-scanline', '扫描线寻迹噪声 / VHS scanlines and tracking band', schema('whole', { spacingPx:integer(3, 8), trackingPx:range(3, 22) }), (view, p) => {
    const image = raster(view);
    return life(view, (progress, reduced) => {
      image.clear(); image.draw.drawImage(image.canvas, 0, 0);
      if (reduced) return;
      image.draw.fillStyle = 'rgba(16,27,46,.35)';
      for (let y = 0; y < image.height; y += p.spacingPx) image.draw.fillRect(0, y, image.width, 1);
      const y = Math.max(0, Math.min(image.height - 8, progress * image.height)), frame = Math.floor(progress * 30);
      image.draw.clearRect(0, y, image.width, 8);
      image.draw.drawImage(image.canvas, 0, y, image.width, 8, p.trackingPx * Math.sin(progress * TAU), y, image.width, 8);
      image.draw.fillStyle = 'rgba(193,220,238,.18)';
      for (let i = 0; i < 12; i++) image.draw.fillRect(core.random(view.seed, frame * 24 + i * 2) * image.width, y + core.random(view.seed, frame * 24 + i * 2 + 1) * 8, 8 + i * 2, 1);
    }, image.dispose);
  });
  add('turbulence-wobble', '噪场字面形变 / SVG turbulence displacement', schema('whole', { displacementPx:range(2, 18), frequency:range(.015, .09) }), (view, p) => {
    const node = text(view), id = uid();
    const filter = view.svg('filter', { id, x:'-20%', y:'-40%', width:'140%', height:'180%' }, definitions(view));
    const turbulence = view.svg('feTurbulence', { type:'fractalNoise', baseFrequency:p.frequency, numOctaves:2, seed:view.seed % 10000, result:'noise' }, filter);
    const displacement = view.svg('feDisplacementMap', { in:'SourceGraphic', in2:'noise', scale:0, xChannelSelector:'R', yChannelSelector:'G' }, filter);
    node.style.filter = `url(#${id})`;
    return life(view, (progress, reduced) => {
      turbulence.setAttribute('baseFrequency', String(p.frequency * (.8 + .4 * progress)));
      displacement.setAttribute('scale', String(reduced ? 0 : p.displacementPx * Math.sin(Math.PI * progress)));
    });
  });
  add('melt-drip', '字底熔滴 / Glyph-derived liquid drips', schema('char', { depthPx:range(24, 90), dripsPerGlyph:integer(2, 5) }), (view, p) => {
    const image = raster(view, Math.ceil(p.depthPx + 16)), pixels = image.context.getImageData(0, 0, image.width, image.height).data, drips = [];
    for (const glyph of image.glyphs) {
      if (!/\S/u.test(glyph.value)) continue;
      const left = Math.max(0, Math.floor(glyph.x)), right = Math.min(image.width - 1, Math.ceil(glyph.x + glyph.width));
      for (let i = 0; i < p.dripsPerGlyph; i++) {
        const x = Math.min(right, Math.round(left + (i + .5) / p.dripsPerGlyph * (right - left)));
        let bottom = -1;
        for (let y = Math.min(image.height - 1, Math.ceil(glyph.y + image.fontSize * .3)); y >= Math.max(0, Math.floor(glyph.y - image.fontSize)); y--) if (pixels[(y * image.width + x) * 4 + 3] > 100) { bottom = y; break; }
        if (bottom >= 0) drips.push({ x, y:bottom, width:2 + core.random(view.seed, glyph.index * 8 + i) * 4, factor:.4 + .6 * core.random(view.seed, glyph.index * 8 + i + 4) });
      }
    }
    return life(view, (progress, reduced) => {
      image.clear(); image.draw.drawImage(image.canvas, 0, 0);
      if (reduced) return;
      const melt = progress * progress;
      for (const drip of drips) {
        const length = p.depthPx * melt * drip.factor;
        if (length <= 0) continue;
        image.draw.drawImage(image.canvas, drip.x, Math.max(0, drip.y - 2), 1, 3, drip.x - drip.width / 2, drip.y - 2, drip.width, length + 3);
        image.draw.fillStyle = '#e9f2ff'; image.draw.beginPath();
        image.draw.ellipse(drip.x, drip.y + length, drip.width * .62, drip.width * .9, 0, 0, TAU); image.draw.fill();
      }
    }, image.dispose);
  });

  function pathText(view, svg, path, value, fontSize = 30, fitLength) {
    const id = path.getAttribute('id');
    const node = view.svg('text', { fill:'#e9f2ff', 'font-size':fontSize, 'font-weight':500, 'font-family':view.root.style.fontFamily, 'xml:space':'preserve' }, svg);
    if (fitLength) { node.setAttribute('textLength', fitLength); node.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    const textPath = view.svg('textPath', { href:'#' + id, startOffset:0 }, node);
    textPath.textContent = value;
    return textPath;
  }
  function pathSetup(view, d, value, width = 640, height = 340, semanticCaption = true) {
    const svg = svgScene(view, width, height, semanticCaption), id = uid();
    const path = view.svg('path', { id, d, fill:'none', stroke:'#345169', 'stroke-width':1 }, svg);
    const length = path.getTotalLength();
    const metrics = fontCanvas(view);
    metrics.context.font = `500 30px ${view.root.style.fontFamily}`;
    const fitLength = Math.min(length * .55, Math.max(1, metrics.context.measureText(value).width));
    metrics.canvas.width = 0; metrics.canvas.height = 0;
    const pair = [pathText(view, svg, path, value, 30, fitLength), pathText(view, svg, path, value, 30, fitLength)];
    return { svg, path, pair, length };
  }
  function loopOffsets(scene, offset) {
    const normalized = ((offset % scene.length) + scene.length) % scene.length;
    scene.pair[0].setAttribute('startOffset', normalized);
    scene.pair[1].setAttribute('startOffset', normalized - scene.length);
  }
  function reducePath(scene, reduced) { scene.svg.style.display = reduced ? 'none' : 'block'; }
  add('text-along-path', '曲线上行字 / Native SVG text along a curve', schema('char', { travelPercent:range(10, 65) }), (view, p) => {
    const scene = pathSetup(view, 'M 25 230 C 170 15 410 300 615 95', view.text);
    scene.pair[1].style.display = 'none';
    return life(view, (progress, reduced) => { reducePath(scene, reduced); scene.pair[0].setAttribute('startOffset', `${ease(progress) * p.travelPercent * .35}%`); });
  });
  add('circular-text-spin', '环形行字旋转 / Circular textPath rotation', schema('char', { radiusPx:range(80, 150), turns:range(.1, 2) }), (view, p) => {
    const r = p.radiusPx, scene = pathSetup(view, `M ${320 - r} 170 a ${r} ${r} 0 1 1 ${r * 2} 0 a ${r} ${r} 0 1 1 ${-r * 2} 0`, view.text);
    return life(view, (progress, reduced) => { reducePath(scene, reduced); loopOffsets(scene, progress * p.turns * scene.length); });
  });
  add('curved-loop-marquee', '曲线闭环跑马 / Closed curved-path marquee', schema('line', { cycles:integer(1, 3), amplitudePx:range(20, 70) }), (view, p) => {
    const lines = core.segments(view.text, 'line', 'zh'), scenes = [];
    for (const line of lines) {
      const a = p.amplitudePx;
      scenes.push(pathSetup(view, `M 30 120 C 165 ${120 - a} 470 ${120 + a} 610 120 C 610 235 30 235 30 120 Z`, line, 640, 280, false));
    }
    caption(view);
    return life(view, (progress, reduced) => scenes.forEach(scene => { reducePath(scene, reduced); loopOffsets(scene, progress * p.cycles * scene.length); }));
  });
  add('shape-contour-text', '心形轮廓行字 / Text on an original heart contour', schema('char', { contour:['heart'], travelTurns:range(.1, 2) }), (view, p) => {
    const scene = pathSetup(view, 'M 320 292 C 245 250 92 132 161 63 C 210 16 290 42 320 102 C 350 42 430 16 479 63 C 548 132 395 250 320 292 Z', view.text);
    return life(view, (progress, reduced) => { reducePath(scene, reduced); loopOffsets(scene, progress * p.travelTurns * scene.length); });
  });
  add('spiral-text', '螺旋行字 / Original arithmetic spiral textPath', schema('char', { turns:range(1.2, 3), startRadiusPx:range(24, 60), travelPercent:range(5, 40) }), (view, p) => {
    const points = [];
    for (let i = 0; i <= 180; i++) { const q = i / 180, angle = q * p.turns * TAU, r = p.startRadiusPx + q * 122; points.push(`${i ? 'L' : 'M'} ${320 + Math.cos(angle) * r} ${190 + Math.sin(angle) * r}`); }
    const scene = pathSetup(view, points.join(' '), view.text, 640, 400); scene.pair[1].style.display = 'none';
    return life(view, (progress, reduced) => { reducePath(scene, reduced); scene.pair[0].setAttribute('startOffset', `${progress * p.travelPercent}%`); });
  });
  add('morphing-path-ride', '曲线变形载字 / Morphing cubic textPath', schema('line', { bendPx:range(20, 90), travelPercent:range(5, 30) }), (view, p) => {
    const scenes = core.segments(view.text, 'line', 'zh').map(line => pathSetup(view, 'M 20 150 C 210 150 425 150 620 150', line, 640, 300, false));
    caption(view);
    scenes.forEach(scene => { scene.pair[1].style.display = 'none'; });
    return life(view, (progress, reduced) => scenes.forEach(scene => {
      reducePath(scene, reduced);
      const bend = Math.sin(progress * TAU) * p.bendPx;
      scene.path.setAttribute('d', `M 20 150 C 210 ${150 - bend} 425 ${150 + bend} 620 150`);
      scene.pair[0].setAttribute('startOffset', `${progress * p.travelPercent}%`);
    }));
  });
  add('path-inertia', '路径字距惯性 / Analytic damped path tracking', schema('char', { trackingEm:range(.1, .9), damping:range(3, 10), overshootPx:range(12, 80) }), (view, p) => {
    const image = layout(view, 36, 900), svg = svgScene(view, 640, 320, true);
    const path = view.svg('path', { d:'M 20 220 C 170 35 420 315 620 95', fill:'none', stroke:'#345169' }, svg), length = path.getTotalLength();
    const glyphs = core.segments(view.text, 'char', 'zh').filter(value => !/^[\r\n]+$/.test(value));
    const nodes = glyphs.map(value => { const node = view.svg('text', { fill:'#e9f2ff', 'font-size':28, 'font-weight':500, 'font-family':image.family, 'xml:space':'preserve', 'text-anchor':'middle' }, svg); node.textContent = value; return node; });
    const spacing = Math.min(28, length * .75 / Math.max(1, nodes.length));
    return life(view, (progress, reduced) => {
      svg.style.display = reduced ? 'none' : 'block';
      nodes.forEach((node, i) => {
        const q = core.phase(progress, i, nodes.length, .3);
        const spring = q === 1 ? 1 : 1 - Math.exp(-p.damping * q) * (Math.cos(q * 10) + p.damping / 10 * Math.sin(q * 10));
        const expanded = i * spacing + i / Math.max(1, nodes.length) * p.trackingEm * 28 * (1 - q);
        const distance = core.clamp((45 + expanded - p.overshootPx * (1 - spring)) / length) * length;
        const point = path.getPointAtLength(distance), ahead = path.getPointAtLength(Math.min(length, distance + 1)), behind = path.getPointAtLength(Math.max(0, distance - 1));
        const angle = Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180 / Math.PI;
        node.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle})`);
      });
    }, image.dispose);
  });

  // Extract oriented pixel-cell boundary loops, including holes and disconnected components.
  function rasterContour(view, value, fontSize, family) {
    const { canvas, context } = fontCanvas(view);
    context.font = `500 ${fontSize}px ${family}`;
    canvas.width = Math.max(8, Math.ceil(context.measureText(value).width) + 12); canvas.height = Math.ceil(fontSize * 1.6);
    context.font = `500 ${fontSize}px ${family}`; context.fillStyle = '#fff'; context.fillText(value, 6, fontSize + 6);
    const width = canvas.width, height = canvas.height, pixels = context.getImageData(0, 0, width, height).data;
    const filled = (x, y) => x >= 0 && y >= 0 && x < width && y < height && pixels[(y * width + x) * 4 + 3] > 96;
    const edges = new Map();
    const key = (x, y) => y * (width + 1) + x;
    function edge(x, y, ex, ey) { const start = key(x, y), list = edges.get(start) || []; list.push([ex, ey]); edges.set(start, list); }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (filled(x, y)) {
      if (!filled(x, y - 1)) edge(x, y, x + 1, y);
      if (!filled(x + 1, y)) edge(x + 1, y, x + 1, y + 1);
      if (!filled(x, y + 1)) edge(x + 1, y + 1, x, y + 1);
      if (!filled(x - 1, y)) edge(x, y + 1, x, y);
    }
    const paths = [];
    while (edges.size) {
      const start = edges.keys().next().value, sx = start % (width + 1), sy = Math.floor(start / (width + 1));
      let current = start, path = `M ${sx - 6} ${sy - fontSize - 6}`, count = 0;
      do {
        const list = edges.get(current);
        if (!list || !list.length) break;
        const [x, y] = list.pop(); if (!list.length) edges.delete(current);
        path += ` L ${x - 6} ${y - fontSize - 6}`; current = key(x, y); count++;
      } while (current !== start);
      if (count > 2) paths.push(path + (current === start ? ' Z' : ''));
    }
    canvas.width = 0; canvas.height = 0;
    return paths;
  }
  add('outline-draw', '字形边界描线 / Raster-derived glyph boundary write-on', schema('char', { spread:range(0, .75), strokePx:range(.6, 2) }), (view, p) => {
    const image = layout(view), svg = svgScene(view, image.width, image.height, true);
    const entries = image.glyphs.map(glyph => {
      const group = view.svg('g', { transform:`translate(${glyph.x} ${glyph.y})` }, svg);
      const paths = rasterContour(view, glyph.value, image.fontSize, image.family).map(d => view.svg('path', { d, fill:'none', stroke:'#abd8ed', 'stroke-width':p.strokePx, pathLength:1, 'stroke-dasharray':'1 1', 'stroke-dashoffset':1 }, group));
      const fill = view.svg('text', { fill:'#e9f2ff', 'font-size':image.fontSize, 'font-weight':500, 'font-family':image.family, opacity:0, 'xml:space':'preserve' }, group); fill.textContent = glyph.value;
      return { paths, fill };
    });
    return life(view, (progress, reduced) => {
      svg.style.display = reduced ? 'none' : 'block';
      entries.forEach((entry, i) => {
        const q = core.phase(progress, i, entries.length, p.spread);
        entry.paths.forEach(path => path.setAttribute('stroke-dashoffset', String(1 - q)));
        entry.fill.setAttribute('opacity', String(core.clamp((q - .84) / .16)));
      });
    }, image.dispose);
  });
  add('handwriting', '原创建笔擦写 / Authored pen-trajectory glyph reveal', schema('char', { spread:range(0, .75), penWidthPx:range(10, 40) }), (view, p) => {
    const image = layout(view), svg = svgScene(view, image.width, image.height, true), defs = view.svg('defs', {}, svg);
    const entries = image.glyphs.map(glyph => {
      const id = uid(), width = Math.max(8, glyph.width), x = glyph.x, top = glyph.y - image.fontSize;
      const mask = view.svg('mask', { id, maskUnits:'userSpaceOnUse', x:x - 8, y:top - 16, width:width + 16, height:image.fontSize * 1.5 }, defs);
      // An original serpentine pen trajectory covers the glyph; it is not linguistic stroke order.
      const d = `M ${x - 4} ${top + 4} C ${x + width * .5} ${top - 8} ${x + width + 4} ${top + 5} ${x + width + 4} ${top + 11} C ${x + width} ${top + 25} ${x - 4} ${top + 13} ${x - 4} ${top + 27} C ${x - 4} ${top + 39} ${x + width + 4} ${top + 27} ${x + width + 4} ${top + 43} C ${x + width} ${top + 58} ${x} ${top + 43} ${x - 4} ${top + 54}`;
      const pen = view.svg('path', { d, fill:'none', stroke:'#fff', 'stroke-width':p.penWidthPx, 'stroke-linecap':'round', 'stroke-linejoin':'round', pathLength:1, 'stroke-dasharray':'1 1', 'stroke-dashoffset':1 }, mask);
      const full = view.svg('rect', { x:x - 8, y:top - 16, width:width + 16, height:image.fontSize * 1.5, fill:'#fff', opacity:0 }, mask);
      const glyphNode = view.svg('text', { x, y:glyph.y, fill:'#e9f2ff', 'font-size':image.fontSize, 'font-weight':500, 'font-family':image.family, mask:`url(#${id})`, 'xml:space':'preserve' }, svg); glyphNode.textContent = glyph.value;
      const trace = view.svg('path', { d, fill:'none', stroke:'#7dc3da', 'stroke-width':1, opacity:.35, pathLength:1, 'stroke-dasharray':'1 1', 'stroke-dashoffset':1 }, svg);
      return { pen, full, trace };
    });
    return life(view, (progress, reduced) => {
      svg.style.display = reduced ? 'none' : 'block';
      entries.forEach((entry, i) => {
        const q = core.phase(progress, i, entries.length, p.spread);
        entry.pen.setAttribute('stroke-dashoffset', String(1 - q)); entry.trace.setAttribute('stroke-dashoffset', String(1 - q));
        entry.trace.setAttribute('opacity', String(q >= 1 ? 0 : .35));
        entry.full.setAttribute('opacity', String(core.clamp((q - .9) / .1)));
      });
    }, image.dispose);
  });
  return { recipes };
}));
