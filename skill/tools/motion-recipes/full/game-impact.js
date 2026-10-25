(((root, factory) => {
  
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.MotionGameParts = root.MotionGameParts || {};
    root.MotionGameParts.impact = factory();
  }
})(typeof globalThis === 'undefined' ? this : globalThis, () => {
  

  const NS = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;
  let instance = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  const phase = (time, start, end) => clamp((time - start) / (end - start));
  const out = value => 1 - (1 - clamp(value)) ** 3;
  const mix = (a, b, value) => a + (b - a) * value;
  const range = (min, max, integer) => ({ min, max, integer: integer === true });

  function random(seed, index) {
    let value = ((seed >>> 0) ^ Math.imul(index + 1, 2654435761)) >>> 0;
    value ^= value >>> 16;
    value = Math.imul(value, 2246822507);
    value ^= value >>> 13;
    value = Math.imul(value, 3266489909);
    value ^= value >>> 16;
    return (value >>> 0) / 4294967296;
  }

  function validate(parameters, schema, relation) {
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) throw new TypeError('Impact parameters must be an object');
    for (const key of Object.keys(parameters)) {
      if (!Object.hasOwn(schema, key)) throw new TypeError('Unknown impact parameter: ' + key);
    }
    for (const [key, rule] of Object.entries(schema)) {
      if (!Object.hasOwn(parameters, key)) throw new TypeError('Missing impact parameter: ' + key);
      const value = parameters[key];
      if (Array.isArray(rule)) {
        if (!rule.includes(value)) throw new TypeError('Unsupported impact ' + key + ': ' + value);
      } else if (typeof rule === 'function') {
        if (!rule(value)) throw new TypeError('Invalid impact parameter: ' + key);
      } else if (!Number.isFinite(value) || value < rule.min || value > rule.max || (rule.integer && !Number.isInteger(value))) {
        throw new RangeError('Impact parameter out of range: ' + key);
      }
    }
    if (relation) relation(parameters);
  }

  function html(parent, tag, content, style) {
    const element = parent.ownerDocument.createElement(tag);
    if (content !== undefined && content !== null) element.textContent = content;
    if (style) Object.assign(element.style, style);
    parent.appendChild(element);
    return element;
  }

  function svg(parent, tag, attributes) {
    const element = parent.ownerDocument.createElementNS(NS, tag);
    for (const [name, value] of Object.entries(attributes || {})) element.setAttribute(name, String(value));
    parent.appendChild(element);
    return element;
  }

  function attr(element, name, value) { element.setAttribute(name, String(value)); }
  function opacity(element, value) { attr(element, 'opacity', clamp(value)); }
  function points(vertices) { return vertices.map(point => point.x + ',' + point.y).join(' '); }
  function label(parent, text, x, y, size, color) {
    const element = svg(parent, 'text', { x, y, 'text-anchor': 'middle', 'font-size': size || 16, 'font-weight': 700, fill: color || '#eaf3ff' });
    element.textContent = text;
    return element;
  }

  // All poses are analytic samples of an authored action, not accumulated simulation.
  function poseAt(time, travel, dash) {
    const advance = dash ? out(phase(time, 0.04, 0.86)) : out(phase(time, 0.02, 0.43)) - 0.15 * phase(time, 0.62, 1);
    const moving = Math.sin(Math.PI * clamp(time));
    const stride = Math.sin(time * TAU * 3) * moving;
    const punch = Math.sin(Math.PI * phase(time, 0.24, 0.65));
    return {
      x: (dash ? 90 : 124) + travel * advance,
      y: 237 - moving * (dash ? 11 : 6),
      torso: (dash ? 17 : 9) * moving,
      head: -8 * moving,
      frontArm: -28 - punch * 65 + stride * 13,
      backArm: 22 + stride * 32,
      frontLeg: stride * 33,
      backLeg: -stride * 30
    };
  }

  function actor(parent, color) {
    const group = svg(parent, 'g', { 'data-channel': 'articulated-pose' });
    const backLeg = svg(group, 'g', { transform: 'translate(-6,-18)' });
    svg(backLeg, 'path', { d: 'M0 0 L-3 20 L-8 35 L4 35', fill: 'none', stroke: '#a9c3da', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const backArm = svg(group, 'g', { transform: 'translate(-9,-44)' });
    svg(backArm, 'path', { d: 'M0 0 L-9 15 L-4 28', fill: 'none', stroke: '#8eabc1', 'stroke-width': 7, 'stroke-linecap': 'round' });
    svg(group, 'path', { d: 'M-10 -50 L13 -49 L12 -17 L-11 -17 Z', fill: color || '#63c9ff', stroke: '#d7efff', 'stroke-width': 2 });
    svg(group, 'path', { d: 'M-7 -35 L10 -35 M-5 -28 L8 -28', stroke: '#17354d', 'stroke-width': 3 });
    const head = svg(group, 'g');
    svg(head, 'circle', { cx: 0, cy: -64, r: 12, fill: '#e9d5bc', stroke: '#f5eadd', 'stroke-width': 2 });
    svg(head, 'path', { d: 'M-12 -64 Q-9 -83 9 -74 L14 -65 L-1 -69 Z', fill: '#243e58' });
    svg(head, 'path', { d: 'M4 -65 L9 -65', stroke: '#172638', 'stroke-width': 2 });
    const frontLeg = svg(group, 'g', { transform: 'translate(7,-18)' });
    svg(frontLeg, 'path', { d: 'M0 0 L4 18 L8 35 L20 35', fill: 'none', stroke: '#d5e6f5', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const frontArm = svg(group, 'g', { transform: 'translate(10,-43)' });
    svg(frontArm, 'path', { d: 'M0 0 L10 14 L14 27', fill: 'none', stroke: '#e9d5bc', 'stroke-width': 8, 'stroke-linecap': 'round' });
    svg(frontArm, 'rect', { x: 8, y: 23, width: 13, height: 10, rx: 3, fill: color || '#63c9ff' });
    return {
      group,
      apply(pose) {
        attr(group, 'transform', 'translate(' + pose.x + ',' + pose.y + ') rotate(' + pose.torso + ')');
        attr(head, 'transform', 'rotate(' + pose.head + ',0,-64)');
        attr(frontArm, 'transform', 'translate(10,-43) rotate(' + pose.frontArm + ')');
        attr(backArm, 'transform', 'translate(-9,-44) rotate(' + pose.backArm + ')');
        attr(frontLeg, 'transform', 'translate(7,-18) rotate(' + pose.frontLeg + ')');
        attr(backLeg, 'transform', 'translate(-6,-18) rotate(' + pose.backLeg + ')');
      }
    };
  }

  function view(stage, id, title, options) {
    if (!stage || !stage.ownerDocument || !stage.dataset) throw new TypeError('Impact study requires a DOM stage');
    options = options || {};
    if (options.seed !== undefined && !Number.isFinite(options.seed)) throw new TypeError('Impact seed must be finite');
    const seed = options.seed === undefined ? 1 : options.seed >>> 0;
    const text = options.text === undefined ? '冲击 · IMPACT' : String(options.text);
    const root = html(stage, 'figure', null, { margin: '0', width: '100%', background: '#101b2b', color: '#eaf3ff', fontFamily: 'system-ui, "Microsoft YaHei", sans-serif', overflow: 'hidden' });
    const frame = html(root, 'div', null, { position: 'relative', width: '100%', overflow: 'hidden' });
    const image = svg(frame, 'svg', { viewBox: '0 0 640 300', width: '100%', 'aria-hidden': 'true' });
    image.style.display = 'block';
    const defs = svg(image, 'defs');
    const prefix = 'game-impact-' + (++instance) + '-';
    const worldClip = svg(defs, 'clipPath', { id: prefix + 'world' });
    svg(worldClip, 'rect', { x: 0, y: 48, width: 640, height: 228 });
    svg(image, 'rect', { width: 640, height: 300, fill: '#101b2b' });
    const viewport = svg(image, 'g', { 'clip-path': 'url(#' + prefix + 'world)' });
    const camera = svg(viewport, 'g', { 'data-layer': 'moving-world' });
    svg(camera, 'path', { d: 'M0 205 L90 153 L160 195 L233 128 L314 182 L405 139 L488 194 L565 147 L640 202 L640 300 L0 300 Z', fill: '#213650' });
    svg(camera, 'path', { d: 'M0 232 L640 232 L640 300 L0 300 Z', fill: '#172738' });
    for (let index = 0; index < 9; index += 1) svg(camera, 'path', { d: 'M' + (index * 80 - 40) + ' 300 L320 213', stroke: '#30485e', 'stroke-width': 1 });
    svg(camera, 'path', { d: 'M0 260 L640 260 M0 282 L640 282', stroke: '#30485e', 'stroke-width': 1 });
    const beacon = svg(camera, 'g');
    svg(beacon, 'circle', { cx: 0, cy: 0, r: 8, fill: '#f0c869' });
    svg(beacon, 'path', { d: 'M-14 0 L14 0 M0 -14 L0 14', stroke: '#f0c869', 'stroke-width': 1 });
    const past = svg(camera, 'g', { 'data-channel': 'past-pose-snapshots' });
    const hero = actor(camera);
    const target = svg(camera, 'g');
    svg(target, 'path', { d: 'M0 -47 L39 -31 L34 24 L0 47 L-34 24 L-39 -31 Z', fill: '#704558', stroke: '#f3ab9b', 'stroke-width': 3 });
    svg(target, 'path', { d: 'M-20 -12 L20 -12 M-14 7 L14 7', stroke: '#f5d1b8', 'stroke-width': 5 });
    const worldFx = svg(camera, 'g', { 'data-layer': 'world-effects' });
    const overlay = svg(viewport, 'g', { 'data-layer': 'presentation-overlay' });
    const hud = svg(image, 'g', { 'data-layer': 'fixed-hud' });
    svg(hud, 'rect', { x: 12, y: 9, width: 616, height: 34, rx: 6, fill: '#0b1422', stroke: '#57718b' });
    svg(hud, 'rect', { x: 24, y: 21, width: 120, height: 10, rx: 3, fill: '#2c3b4d' });
    svg(hud, 'rect', { x: 24, y: 21, width: 86.4, height: 10, rx: 3, fill: '#80dbb5' });
    label(hud, 'HP 72 / 100', 216, 31, 14, '#cceada');
    label(hud, 'FIXED AUTHORITY · PRESENTATION STUDY', 449, 30, 11, '#c5d6e7');
    const caption = html(root, 'figcaption', title, { padding: '12px 16px 0', fontWeight: '700', fontSize: '15px' });
    const status = html(root, 'output', '', { display: 'block', padding: '6px 16px 12px', fontSize: '13px', lineHeight: '1.5', color: '#c6d8e9', overflowWrap: 'anywhere' });
    status.setAttribute('aria-label', 'Presentation state, not gameplay state');
    caption.setAttribute('title', text);
    stage.dataset.recipe = id;
    const releases = [];
    let disposed = false;
    return {
      stage, root, frame, image, defs, prefix, camera, worldFx, overlay, hud, target, past, hero, seed, text,
      reduced: options.reducedMotion === true,
      setStatus(value) { status.textContent = value; },
      release(callback) { releases.push(callback); },
      drawScene(time, travel) {
        hero.apply(poseAt(time, travel === undefined ? 260 : travel, false));
        attr(target, 'transform', 'translate(440,190) rotate(' + Math.sin(time * Math.PI) * 3 + ')');
        attr(beacon, 'transform', 'translate(' + (323 + 29 * Math.sin(time * Math.PI)) + ',' + (83 + 8 * Math.cos(time * TAU)) + ')');
      },
      check(progress) {
        if (disposed) throw new Error('Impact study is disposed');
        if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new RangeError('Impact progress must be finite in [0,1]');
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        for (const release of releases) release();
        root.remove();
        if (stage.dataset.recipe === id) delete stage.dataset.recipe;
      }
    };
  }

  function lifecycle(v, draw) {
    function seek(progress) {
      v.check(progress);
      draw(progress, v.reduced);
    }
    seek(0);
    return { seek, dispose: () => v.dispose() };
  }

  function descriptor(id, title, schema, render, relation) {
    return {
      title,
      validate: parameters => validate(parameters, schema, relation),
      create(stage, parameters, options) {
        validate(parameters, schema, relation);
        const p = {};
        for (const key of Object.keys(parameters)) p[key] = Array.isArray(parameters[key]) ? parameters[key].slice() : parameters[key];
        const v = view(stage, id, title, options);
        try { return render(v, p); }
        catch (error) { v.dispose(); throw error; }
      }
    };
  }

  function holdClock(time, at, hold) { return (time - Math.max(0, Math.min(hold, time - at))) / (1 - hold); }
  function holdRelation(p) {
    if (p.impactAt + p.hold > 0.88) throw new RangeError('Impact hold must leave a recovery segment');
  }
  function burst(parent, x, y, radius, color) {
    const group = svg(parent, 'g', { transform: 'translate(' + x + ',' + y + ')' });
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * TAU;
      svg(group, 'path', { d: 'M' + Math.cos(angle) * radius * 0.45 + ' ' + Math.sin(angle) * radius * 0.45 + ' L' + Math.cos(angle) * radius + ' ' + Math.sin(angle) * radius, stroke: color || '#ffd48e', 'stroke-width': index % 2 ? 2 : 4, 'stroke-linecap': 'round' });
    }
    return group;
  }
  function heading(v, text, color) {
    return html(v.frame, 'div', text, { position: 'absolute', inset: '22% 8% 12%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontWeight: '850', fontSize: 'clamp(18px, 4vw, 44px)', lineHeight: '1.15', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', color: color || '#f4f7fc', textShadow: '0 2px 0 #0a1220', pointerEvents: 'none' });
  }

  // Clipping a rectangle against an actual moving cut plane, not a substitute fade.
  function cutPolygon(rectangle, nx, ny, threshold) {
    const result = [];
    for (let index = 0; index < rectangle.length; index += 1) {
      const a = rectangle[index];
      const b = rectangle[(index + 1) % rectangle.length];
      const da = a.x * nx + a.y * ny - threshold;
      const db = b.x * nx + b.y * ny - threshold;
      if (da <= 0) result.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
        const ratio = da / (da - db);
        result.push({ x: mix(a.x, b.x, ratio), y: mix(a.y, b.y, ratio) });
      }
    }
    return result;
  }
  function cutBounds(rectangle, nx, ny) {
    const values = rectangle.map(point => point.x * nx + point.y * ny);
    return [Math.min(...values), Math.max(...values)];
  }
  function cutLine(rectangle, nx, ny, threshold) {
    const intersections = [];
    for (let index = 0; index < rectangle.length; index += 1) {
      const a = rectangle[index];
      const b = rectangle[(index + 1) % rectangle.length];
      const da = a.x * nx + a.y * ny - threshold;
      const db = b.x * nx + b.y * ny - threshold;
      if ((da <= 0 && db > 0) || (da > 0 && db <= 0)) {
        const ratio = da / (da - db);
        intersections.push({ x: mix(a.x, b.x, ratio), y: mix(a.y, b.y, ratio) });
      }
    }
    return intersections.length === 2 ? 'M' + intersections[0].x + ' ' + intersections[0].y + ' L' + intersections[1].x + ' ' + intersections[1].y : 'M0 0';
  }
  const SCREEN = [{ x: 0, y: 48 }, { x: 640, y: 48 }, { x: 640, y: 276 }, { x: 0, y: 276 }];
  const recipes = {};

  recipes['game.hitstop-action-clock'] = descriptor('game.hitstop-action-clock', '接触帧停顿 / Hit-stop action clock', {
    impactAt: range(0.22, 0.43), hold: range(0.08, 0.3), frameSteps: range(24, 120, true), travel: range(230, 295)
  }, (v, p) => {
    const contact = burst(v.worldFx, 427, 174, 37);
    return lifecycle(v, (time, reduced) => {
      const clock = reduced ? p.impactAt / (1 - p.hold) : holdClock(time, p.impactAt, p.hold);
      const frame = Math.floor(clock * p.frameSteps + 1e-9);
      v.drawScene(frame / p.frameSteps, p.travel);
      opacity(contact, reduced ? 0.8 : (time >= p.impactAt && time <= p.impactAt + p.hold ? 0.8 : 0));
      v.setStatus(reduced ? '静态接触帧 · 停顿省略；HP 不受播放影响 / Static contact, authority unchanged' : 'Action frame ' + frame + '/' + p.frameSteps + ' · ' + (time >= p.impactAt && time <= p.impactAt + p.hold ? 'HELD' : 'advance') + ' · presentation only');
    });
  }, holdRelation);

  recipes['game.parry-action-time-slice'] = descriptor('game.parry-action-time-slice', '招架时间薄片 / Parry action-time slice', {
    sliceAt: range(0.22, 0.42), sliceLength: range(0.12, 0.3), slowRate: range(0.05, 0.35), slashSlant: range(0.3, 1.4)
  }, (v, p) => {
    const guard = svg(v.worldFx, 'g', { transform: 'translate(421,171)' });
    svg(guard, 'path', { d: 'M-19 -27 L22 29 M-22 28 L22 -26', stroke: '#a6f1ff', 'stroke-width': 5, 'stroke-linecap': 'round' });
    const slice = svg(v.overlay, 'path', { fill: '#72d4e9', opacity: 0 });
    const endClock = 1 - (1 - p.slowRate) * p.sliceLength;
    return lifecycle(v, (time, reduced) => {
      const integral = time - (1 - p.slowRate) * Math.max(0, Math.min(p.sliceLength, time - p.sliceAt));
      const clock = reduced ? p.sliceAt / endClock : integral / endClock;
      v.drawScene(clock, 270);
      const active = reduced ? 1 : phase(time, p.sliceAt - 0.025, p.sliceAt) * (1 - phase(time, p.sliceAt + p.sliceLength, p.sliceAt + p.sliceLength + 0.16));
      attr(slice, 'd', 'M' + (300 - p.slashSlant * 60) + ' 48 L' + (315 - p.slashSlant * 60) + ' 48 L' + (315 + p.slashSlant * 110) + ' 276 L' + (300 + p.slashSlant * 110) + ' 276 Z');
      opacity(slice, active * 0.23);
      opacity(guard, active);
      v.setStatus(reduced ? '静态招架标记 / Static parry marker; no slow-motion dependency' : 'Action clock ' + clock.toFixed(3) + ' · slice rate ' + p.slowRate + ' · gameplay time is not owned here');
    });
  }, p => { if (p.sliceAt + p.sliceLength > 0.82) throw new RangeError('Parry slice must leave recovery time'); });

  recipes['game.freeze-scene-color-drain'] = descriptor('game.freeze-scene-color-drain', '定格场景褪色 / Frozen-scene color drain', {
    impactAt: range(0.23, 0.43), hold: range(0.14, 0.32), drain: range(0.5, 1), restoreSpan: range(0.08, 0.2)
  }, (v, p) => {
    const bracket = svg(v.overlay, 'path', { d: 'M300 97 L300 80 L325 80 M473 80 L496 80 L496 97 M300 227 L300 248 L325 248 M473 248 L496 248 L496 227', stroke: '#d5e6f5', 'stroke-width': 2, fill: 'none' });
    return lifecycle(v, (time, reduced) => {
      const clock = reduced ? p.impactAt / (1 - p.hold) : holdClock(time, p.impactAt, p.hold);
      const drain = reduced ? p.drain : p.drain * phase(time, p.impactAt - 0.035, p.impactAt + 0.025) * (1 - phase(time, p.impactAt + p.hold, p.impactAt + p.hold + p.restoreSpan));
      v.drawScene(clock, 265);
      v.camera.style.filter = 'saturate(' + (1 - drain) + ')';
      opacity(bracket, reduced ? 0.7 : drain * 0.7);
      v.setStatus('Scene saturation ' + (1 - drain).toFixed(2) + ' · fixed HUD stays colored · ' + (reduced ? '静态定格 / static freeze' : 'held pose, independent color channel'));
    });
  }, p => { holdRelation(p); if (p.impactAt + p.hold + p.restoreSpan > 1) throw new RangeError('Color drain restoration must fit the study'); });

  recipes['game.camera-world-kick'] = descriptor('game.camera-world-kick', '世界镜头反冲 / Camera kick with fixed HUD', {
    kickAt: range(0.24, 0.5), amplitude: range(8, 28), axis: ['horizontal', 'vertical', 'diagonal'], settleSpan: range(0.12, 0.32), returnCycles: range(1, 3, true), roll: range(-3, 3)
  }, (v, p) => {
    const mark = burst(v.worldFx, 430, 174, 28, '#ffd9a5');
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 1 : time, 270);
      const local = (time - p.kickAt) / p.settleSpan;
      const impulse = reduced || local < 0 || local > 1 ? 0 : Math.cos(local * TAU * p.returnCycles) * Math.exp(-6 * local) * (1 - phase(local, 0.85, 1));
      const dx = p.axis === 'vertical' ? 0 : -p.amplitude * impulse;
      const dy = p.axis === 'horizontal' ? 0 : p.amplitude * 0.55 * impulse;
      attr(v.camera, 'transform', 'translate(' + dx + ',' + dy + ') rotate(' + p.roll * impulse + ',320,165)');
      opacity(mark, reduced ? 0.65 : (local >= 0 && local < 1 ? 0.8 * (1 - local) : 0));
      v.setStatus(reduced ? '镜头位移关闭；静态命中标记 / Camera kick omitted; fixed hit marker' : 'World camera offset ' + dx.toFixed(1) + ', ' + dy.toFixed(1) + ' · HUD transform never changes');
    });
  }, p => { if (p.kickAt + p.settleSpan > 0.9) throw new RangeError('Camera kick must finish before the study settles'); });

  recipes['game.critical-world-compression'] = descriptor('game.critical-world-compression', '临界镜头压缩 / Critical world compression', {
    compressAt: range(0.24, 0.48), squeeze: range(0.06, 0.25), releaseSpan: range(0.16, 0.36), letterbox: range(12, 42)
  }, (v, p) => {
    const top = svg(v.overlay, 'rect', { x: 0, y: 48, width: 640, height: 0, fill: '#070c16' });
    const bottom = svg(v.overlay, 'rect', { x: 0, y: 276, width: 640, height: 0, fill: '#070c16' });
    const mark = burst(v.overlay, 424, 171, 45, '#ffe4a6');
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 1 : time, 275);
      const attack = out(phase(time, p.compressAt - 0.055, p.compressAt));
      const pressure = reduced ? 0 : attack * (1 - out(phase(time, p.compressAt, p.compressAt + p.releaseSpan)));
      const height = reduced ? 8 : p.letterbox * pressure;
      attr(v.camera, 'transform', 'translate(420,174) scale(' + (1 - p.squeeze * pressure) + ',' + (1 + p.squeeze * pressure * 0.45) + ') translate(-420,-174)');
      attr(top, 'height', height);
      attr(bottom, 'y', 276 - height);
      attr(bottom, 'height', height);
      opacity(mark, reduced ? 0.65 : pressure);
      v.setStatus(reduced ? '压缩关闭；静态临界标记 / Critical marker without deformation' : 'World X compression ' + (p.squeeze * pressure * 100).toFixed(1) + '% · fixed HUD and semantic values excluded');
    });
  }, p => { if (p.compressAt + p.releaseSpan > 0.92) throw new RangeError('Compression must leave a settled interval'); });

  recipes['game.afterimage-pose-snapshots'] = descriptor('game.afterimage-pose-snapshots', '历史姿态残像 / Actual past-pose afterimages', {
    count: range(3, 9, true), spacing: range(0.035, 0.09), travel: range(280, 430), trailOpacity: range(0.18, 0.55)
  }, (v, p) => {
    const ghosts = [];
    for (let index = p.count - 1; index >= 0; index -= 1) ghosts[index] = actor(v.past, index % 2 ? '#8b79c8' : '#3c91b4');
    return lifecycle(v, (time, reduced) => {
      const clock = reduced ? 0.88 : time;
      v.drawScene(clock, 0);
      v.hero.apply(poseAt(clock, p.travel, true));
      for (let index = 0; index < ghosts.length; index += 1) {
        const age = p.spacing * (index + 1);
        const sample = clamp(clock - age);
        ghosts[index].apply(poseAt(sample, p.travel, true));
        const active = time >= age && time <= 0.97 ? Math.sin(Math.PI * clamp(time)) : 0;
        opacity(ghosts[index].group, reduced ? 0 : active * p.trailOpacity * (1 - index / p.count));
      }
      v.setStatus(reduced ? '单一静态姿态；残像省略 / One readable pose, no trailing travel' : p.count + ' articulated snapshots sampled from t − age, including earlier head/limb angles');
    });
  }, p => { if (p.count * p.spacing > 0.65) throw new RangeError('Afterimage ages must fit the authored dash'); });

  recipes['game.armor-fracture-network'] = descriptor('game.armor-fracture-network', '盔甲分支裂纹 / Seeded armor-fracture network', {
    roots: range(5, 12, true), depth: range(2, 4, true), radius: range(35, 59), revealAt: range(0.18, 0.4)
  }, (v, p) => {
    const network = svg(v.worldFx, 'g', { transform: 'translate(440,190)' });
    const paths = [];
    for (let root = 0; root < p.roots; root += 1) {
      const angle = root / p.roots * TAU + (random(v.seed, root) - 0.5) * 0.28;
      let previous = { x: 0, y: 0 };
      for (let depth = 0; depth < p.depth; depth += 1) {
        const radius = p.radius * (depth + 1) / p.depth;
        const bend = angle + (random(v.seed, 70 + root * 8 + depth) - 0.5) * 0.42;
        const next = { x: Math.cos(bend) * radius, y: Math.sin(bend) * radius };
        const path = svg(network, 'path', { d: 'M' + previous.x + ' ' + previous.y + ' L' + next.x + ' ' + next.y, fill: 'none', stroke: '#ffe4c4', 'stroke-width': depth === 0 ? 2.4 : 1.4, pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 });
        paths.push({ path, delay: p.revealAt + depth * 0.085 + root * 0.006 });
        if (depth > 0) {
          const twigAngle = bend + (root % 2 ? 0.8 : -0.8);
          const twig = svg(network, 'path', { d: 'M' + previous.x + ' ' + previous.y + ' L' + (previous.x + Math.cos(twigAngle) * p.radius * 0.22) + ' ' + (previous.y + Math.sin(twigAngle) * p.radius * 0.22), stroke: '#d7bfc2', 'stroke-width': 1, pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 });
          paths.push({ path: twig, delay: p.revealAt + depth * 0.085 + root * 0.006 + 0.06 });
        }
        previous = next;
      }
    }
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 0.6 : time, 265);
      for (const item of paths) attr(item.path, 'stroke-dashoffset', reduced ? 0 : 1 - phase(time, item.delay, item.delay + 0.16));
      v.setStatus('Armor network: ' + p.roots + ' roots × ' + p.depth + ' levels; parent segments precede twigs · ' + (reduced ? '静态破裂结果 / static fractured result' : 'seeded geometry, not regenerated'));
    });
  });

  recipes['game.phase-cell-shatter'] = descriptor('game.phase-cell-shatter', '阶段面片破碎 / Tessellated phase-cell shatter', {
    columns: range(3, 7, true), rows: range(2, 5, true), travel: range(35, 115), spin: range(12, 75), breakAt: range(0.2, 0.4)
  }, (v, p) => {
    v.target.style.visibility = 'hidden';
    const region = { x: 352, y: 82, width: 176, height: 176 };
    const under = svg(v.worldFx, 'g');
    svg(under, 'rect', { x: region.x, y: region.y, width: region.width, height: region.height, rx: 9, fill: '#322950' });
    svg(under, 'path', { d: 'M440 96 L500 158 L480 229 L400 229 L380 158 Z', fill: '#685ac4', stroke: '#c3b3fa', 'stroke-width': 4 });
    svg(under, 'path', { d: 'M401 163 L425 176 L439 158 L454 176 L479 163 M414 200 L466 200', stroke: '#efe3ff', 'stroke-width': 5, fill: 'none' });
    label(under, 'PHASE B', 440, 248, 14);
    const art = svg(v.defs, 'g', { id: v.prefix + 'phase-a' });
    svg(art, 'rect', { x: region.x, y: region.y, width: region.width, height: region.height, fill: '#533443' });
    svg(art, 'circle', { cx: 440, cy: 166, r: 58, fill: '#aa5e49', stroke: '#ffd097', 'stroke-width': 5 });
    svg(art, 'path', { d: 'M406 155 L431 159 M449 159 L474 155 M418 186 Q440 202 462 186', stroke: '#ffecd1', 'stroke-width': 6, fill: 'none' });
    label(art, 'PHASE A', 440, 245, 14, '#ffe1c1');
    const vertices = [];
    for (let row = 0; row <= p.rows; row += 1) {
      vertices[row] = [];
      for (let column = 0; column <= p.columns; column += 1) {
        const index = row * (p.columns + 1) + column;
        const dx = column === 0 || column === p.columns ? 0 : (random(v.seed, index) - 0.5) * region.width / p.columns * 0.38;
        const dy = row === 0 || row === p.rows ? 0 : (random(v.seed, index + 90) - 0.5) * region.height / p.rows * 0.38;
        vertices[row][column] = { x: region.x + column * region.width / p.columns + dx, y: region.y + row * region.height / p.rows + dy };
      }
    }
    const shards = [];
    for (let row = 0; row < p.rows; row += 1) {
      for (let column = 0; column < p.columns; column += 1) {
        const a = vertices[row][column], b = vertices[row][column + 1], c = vertices[row + 1][column + 1], d = vertices[row + 1][column];
        const triangles = (row + column) % 2 ? [[a, b, d], [b, c, d]] : [[a, b, c], [a, c, d]];
        for (const triangle of triangles) {
          const index = shards.length;
          const clip = svg(v.defs, 'clipPath', { id: v.prefix + 'cell-' + index });
          svg(clip, 'polygon', { points: points(triangle) });
          const moving = svg(v.worldFx, 'g');
          const clipped = svg(moving, 'g', { 'clip-path': 'url(#' + v.prefix + 'cell-' + index + ')' });
          svg(clipped, 'use', { href: '#' + v.prefix + 'phase-a' });
          const cx = triangle.reduce((sum, point) => sum + point.x, 0) / 3;
          const cy = triangle.reduce((sum, point) => sum + point.y, 0) / 3;
          const angle = Math.atan2(cy - 166, cx - 440);
          shards.push({ moving, cx, cy, dx: Math.cos(angle) * p.travel * (0.7 + random(v.seed, 300 + index) * 0.4), dy: Math.sin(angle) * p.travel, spin: (random(v.seed, 500 + index) - 0.5) * 2 * p.spin, delay: random(v.seed, 700 + index) * 0.08 });
        }
      }
    }
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 1 : time, 220);
      for (const shard of shards) {
        const local = reduced ? 1 : phase(time, p.breakAt + shard.delay, p.breakAt + 0.44 + shard.delay);
        const departure = out(local);
        attr(shard.moving, 'transform', reduced ? 'translate(0,0)' : 'translate(' + shard.dx * departure + ',' + (shard.dy * departure + local * local * 45) + ') rotate(' + shard.spin * departure + ',' + shard.cx + ',' + shard.cy + ')');
        opacity(shard.moving, reduced ? 0 : 1 - phase(local, 0.48, 1));
      }
      v.setStatus(shards.length + ' exact tessellating cells carry clipped Phase A artwork, revealing distinct Phase B · ' + (reduced ? '直接显示 B / B shown immediately' : 'no invented random rectangles'));
    });
  });

  recipes['game.directional-slash-mask'] = descriptor('game.directional-slash-mask', '方向斩切揭示 / Directional slash-mask reveal', {
    direction: ['left-to-right', 'right-to-left'], slant: range(0.25, 1.3), revealAt: range(0.15, 0.38), revealSpan: range(0.18, 0.42), edgeWidth: range(3, 10)
  }, (v, p) => {
    const clip = svg(v.defs, 'clipPath', { id: v.prefix + 'slash' });
    const mask = svg(clip, 'polygon', { points: '0,0' });
    const panel = svg(v.overlay, 'g', { 'clip-path': 'url(#' + v.prefix + 'slash)' });
    svg(panel, 'rect', { x: 0, y: 48, width: 640, height: 228, fill: '#1b4b65' });
    svg(panel, 'path', { d: 'M403 72 L483 80 L540 167 L491 252 L391 252 L347 165 Z', fill: '#287497', stroke: '#83ddf4', 'stroke-width': 4 });
    svg(panel, 'path', { d: 'M384 141 L443 157 L503 140 M407 204 L477 204', stroke: '#d6f8ff', 'stroke-width': 7 });
    const edge = svg(v.overlay, 'path', { stroke: '#defbff', 'stroke-width': p.edgeWidth, fill: 'none', 'stroke-linecap': 'round' });
    const title = heading(v, v.text, '#ecfaff');
    const nx = p.direction === 'left-to-right' ? 1 : -1;
    const bounds = cutBounds(SCREEN, nx, p.slant);
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 1 : time, 250);
      const amount = reduced ? 1 : phase(time, p.revealAt, p.revealAt + p.revealSpan);
      const threshold = mix(bounds[0] - 1, bounds[1] + 1, amount);
      const polygon = cutPolygon(SCREEN, nx, p.slant, threshold);
      attr(mask, 'points', polygon.length ? points(polygon) : '0,0');
      attr(edge, 'd', cutLine(SCREEN, nx, p.slant, threshold));
      opacity(edge, reduced || amount <= 0 || amount >= 1 ? 0 : 0.9);
      title.style.clipPath = 'polygon(' + (polygon.length ? polygon.map(point => point.x / 640 * 100 + '% ' + point.y / 300 * 100 + '%').join(',') : '0% 0%,0% 0%,0% 0%') + ')';
      title.style.opacity = String(reduced ? 1 : phase(amount, 0.6, 1));
      v.setStatus(reduced ? '静态已揭示面板 / Revealed panel, slash omitted' : 'A moving half-plane clips the second artwork; edge follows the real plane/viewport intersection');
    });
  }, p => { if (p.revealAt + p.revealSpan > 0.9) throw new RangeError('Slash reveal must leave a readable result'); });

  recipes['game.shield-arc-recharge'] = descriptor('game.shield-arc-recharge', '护盾弧线补充 / Shield arc-and-membrane recharge', {
    radius: range(43, 68), startAngle: range(-180, 180), chargeAt: range(0.1, 0.3), chargeSpan: range(0.35, 0.6), rimWidth: range(3, 8)
  }, (v, p) => {
    const cx = 440, cy = 190;
    const clip = svg(v.defs, 'clipPath', { id: v.prefix + 'shield-sector' });
    const sector = svg(clip, 'path');
    const membrane = svg(v.worldFx, 'circle', { cx, cy, r: p.radius, fill: '#68d9db', opacity: 0.25, 'clip-path': 'url(#' + v.prefix + 'shield-sector)' });
    svg(v.worldFx, 'circle', { cx, cy, r: p.radius, fill: 'none', stroke: '#4d788b', 'stroke-width': 2 });
    const circumference = TAU * p.radius;
    const rim = svg(v.worldFx, 'circle', { cx, cy, r: p.radius, fill: 'none', stroke: '#abf8ed', 'stroke-width': p.rimWidth, 'stroke-dasharray': circumference, 'stroke-dashoffset': circumference, transform: 'rotate(' + p.startAngle + ',' + cx + ',' + cy + ')' });
    const tip = svg(v.worldFx, 'circle', { r: p.rimWidth + 2, fill: '#e0fff8' });
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 1 : time, 220);
      const amount = reduced ? 1 : phase(time, p.chargeAt, p.chargeAt + p.chargeSpan);
      const a = p.startAngle / 180 * Math.PI;
      const b = a + amount * TAU;
      const sx = cx + Math.cos(a) * p.radius, sy = cy + Math.sin(a) * p.radius;
      const ex = cx + Math.cos(b) * p.radius, ey = cy + Math.sin(b) * p.radius;
      const d = amount >= 1 ? 'M' + (cx - p.radius) + ' ' + cy + ' a' + p.radius + ' ' + p.radius + ' 0 1 0 ' + (2 * p.radius) + ' 0 a' + p.radius + ' ' + p.radius + ' 0 1 0 ' + (-2 * p.radius) + ' 0' : amount <= 0 ? 'M' + cx + ' ' + cy : 'M' + cx + ' ' + cy + ' L' + sx + ' ' + sy + ' A' + p.radius + ' ' + p.radius + ' 0 ' + (amount > 0.5 ? 1 : 0) + ' 1 ' + ex + ' ' + ey + ' Z';
      attr(sector, 'd', d);
      attr(rim, 'stroke-dashoffset', circumference * (1 - amount));
      attr(tip, 'cx', ex); attr(tip, 'cy', ey);
      opacity(tip, reduced || amount <= 0 || amount >= 1 ? 0 : 0.8);
      opacity(membrane, 0.25);
      v.setStatus('Presentation shield sweep ' + Math.round(amount * 100) + '% · arc and filled sector agree · readiness must come from game state');
    });
  }, p => { if (p.chargeAt + p.chargeSpan > 0.92) throw new RangeError('Shield recharge must leave a completed interval'); });

  recipes['game.loot-volume-beam'] = descriptor('game.loot-volume-beam', '掉落体积光柱 / Loot volume-beam column', {
    width: range(24, 84), height: range(105, 185), particleCount: range(8, 26, true), riseFraction: range(0.35, 0.85)
  }, (v, p) => {
    const gradient = svg(v.defs, 'linearGradient', { id: v.prefix + 'beam-color', x1: 0, y1: 1, x2: 0, y2: 0 });
    svg(gradient, 'stop', { offset: '0%', 'stop-color': '#fae7ad', 'stop-opacity': 0.6 });
    svg(gradient, 'stop', { offset: '100%', 'stop-color': '#bd91f9', 'stop-opacity': 0.04 });
    const clip = svg(v.defs, 'clipPath', { id: v.prefix + 'beam-rise' });
    const window = svg(clip, 'rect', { x: 380, y: 240, width: 140, height: 0 });
    const volume = svg(v.worldFx, 'g', { 'clip-path': 'url(#' + v.prefix + 'beam-rise)' });
    svg(volume, 'path', { d: 'M' + (440 - p.width / 2) + ' 240 L' + (440 - p.width * 0.8) + ' ' + (240 - p.height) + ' L' + (440 + p.width * 0.8) + ' ' + (240 - p.height) + ' L' + (440 + p.width / 2) + ' 240 Z', fill: 'url(#' + v.prefix + 'beam-color)' });
    svg(volume, 'rect', { x: 437, y: 240 - p.height, width: 6, height: p.height, fill: '#fff4d4', opacity: 0.6 });
    const floor = svg(v.worldFx, 'ellipse', { cx: 440, cy: 239, rx: p.width * 0.72, ry: 10, fill: '#c99cec', opacity: 0.5 });
    const moteGroup = svg(v.worldFx, 'g');
    const motes = [];
    for (let index = 0; index < p.particleCount; index += 1) motes.push({ node: svg(moteGroup, 'circle', { r: 1.5 + random(v.seed, index) * 2.2, fill: '#ffefc8' }), x: 440 + (random(v.seed, index + 40) - 0.5) * p.width, delay: index / p.particleCount * 0.24, sway: (random(v.seed, index + 80) - 0.5) * 15 });
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 1 : time, 225);
      const height = p.height * (reduced ? 1 : out(phase(time, 0.12, 0.46)));
      attr(window, 'y', 240 - height); attr(window, 'height', height);
      opacity(floor, reduced ? 0.5 : 0.5 * phase(time, 0.06, 0.25));
      for (const mote of motes) {
        const life = reduced ? 0.25 + mote.delay * 2 : phase(time, 0.2 + mote.delay, 0.72 + mote.delay);
        attr(mote.node, 'cx', mote.x + (reduced ? 0 : Math.sin(life * Math.PI) * mote.sway));
        attr(mote.node, 'cy', 237 - p.height * p.riseFraction * life);
        opacity(mote.node, reduced ? 0.7 : Math.sin(Math.PI * life) * 0.8);
      }
      v.setStatus(reduced ? '静态掉落光柱及粒子 / Stable beam and motes; no reward is granted by seek' : 'Clipped volume rises from ground; bounded motes occupy the column, not a reward counter');
    });
  });

  recipes['game.damage-edge-vignette'] = descriptor('game.damage-edge-vignette', '屏幕边缘受击 / Screen-edge damage vignette', {
    depth: range(0.14, 0.32), strength: range(0.25, 0.65), hitAt: range(0.18, 0.46), fadeSpan: range(0.2, 0.45)
  }, (v, p) => {
    const gradient = svg(v.defs, 'radialGradient', { id: v.prefix + 'damage-edge', cx: '50%', cy: '50%', r: '70%' });
    svg(gradient, 'stop', { offset: (1 - p.depth) * 100 + '%', 'stop-color': '#a84555', 'stop-opacity': 0 });
    svg(gradient, 'stop', { offset: '100%', 'stop-color': '#bf5360', 'stop-opacity': 1 });
    const edge = svg(v.overlay, 'rect', { x: 0, y: 48, width: 640, height: 228, fill: 'url(#' + v.prefix + 'damage-edge)' });
    const corners = svg(v.overlay, 'path', { d: 'M12 87 L12 59 L41 59 M599 59 L628 59 L628 87 M12 237 L12 265 L41 265 M599 265 L628 265 L628 237', stroke: '#ffc2b5', 'stroke-width': 3, fill: 'none' });
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 1 : time, 260);
      const envelope = reduced ? 0.42 : phase(time, p.hitAt - 0.06, p.hitAt) * (1 - out(phase(time, p.hitAt, p.hitAt + p.fadeSpan)));
      opacity(edge, p.strength * envelope);
      opacity(corners, reduced ? 0.6 : envelope * 0.7);
      v.setStatus(reduced ? '静态受击边界；无脉冲 / Static damage boundary without a pulse' : 'One bounded edge-opacity envelope; center and fixed HUD remain unmasked · HP stays 72');
    });
  }, p => { if (p.hitAt + p.fadeSpan > 0.96) throw new RangeError('Damage edge must settle before study end'); });

  recipes['game.combo-thermal-envelope'] = descriptor('game.combo-thermal-envelope', '连段热量包络 / Combo thermal envelope', {
    hitTimes: value => Array.isArray(value) && value.length >= 3 && value.length <= 8 && value.every((time, index) => Number.isFinite(time) && time >= 0.12 && time <= 0.82 && (index === 0 || time > value[index - 1])),
    decay: range(0.12, 0.4), gain: range(0.12, 0.32), hazeHeight: range(28, 65)
  }, (v, p) => {
    const reservoir = svg(v.overlay, 'g');
    const base = svg(reservoir, 'path', { fill: '#d57446', opacity: 0.4 });
    const haze = [];
    for (let index = 0; index < 5; index += 1) haze.push(svg(reservoir, 'path', { fill: 'none', stroke: index % 2 ? '#ffc06e' : '#dd7060', 'stroke-width': 2.5, opacity: 0.4 }));
    const bars = [];
    for (let index = 0; index < 12; index += 1) bars.push(svg(v.overlay, 'rect', { x: 207 + index * 19, y: 251, width: 13, height: 11, rx: 2, fill: index < 4 ? '#e2bb6f' : index < 8 ? '#e59356' : '#ea7666' }));
    label(v.overlay, 'COMMITTED FIXTURE: ' + p.hitTimes.length + ' HITS', 320, 73, 13, '#e7b98b');
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 1 : time, 250);
      let heat = 0;
      if (reduced) heat = 0.82;
      else for (let index = 0; index < p.hitTimes.length; index += 1) if (time >= p.hitTimes[index]) heat += p.gain * (1 + index * 0.16) * Math.exp(-(time - p.hitTimes[index]) / p.decay);
      heat = clamp(heat);
      const height = heat * p.hazeHeight;
      attr(base, 'd', 'M182 240 Q222 ' + (240 - height) + ' 274 ' + (239 - height * 0.8) + ' Q326 ' + (220 - height) + ' 458 240 Z');
      for (let index = 0; index < haze.length; index += 1) {
        const x = 232 + index * 45;
        const bend = reduced ? 4 : Math.sin(time * TAU * 1.5 + index) * 8;
        attr(haze[index], 'd', 'M' + x + ' 233 Q' + (x + bend) + ' ' + (222 - height * 0.4) + ' ' + x + ' ' + (230 - height));
        opacity(haze[index], 0.45 * heat);
      }
      for (let index = 0; index < bars.length; index += 1) opacity(bars[index], heat > index / bars.length ? 0.85 : 0.12);
      v.setStatus('Presentation heat ' + Math.round(heat * 100) + '% from a prerecorded immutable event trace · ' + (reduced ? '静态热量标记 / static intensity' : 'not an authoritative combo counter'));
    });
  });

  recipes['game.elemental-geometry-burst'] = descriptor('game.elemental-geometry-burst', '三系亲和爆发 / Element-specific geometry burst', {
    elements: value => Array.isArray(value) && value.length === 3 && new Set(value).size === 3 && value.every(element => ['fire', 'ice', 'electric'].includes(element)),
    count: range(6, 14, true), spread: range(28, 62), stagger: range(0.07, 0.14), burstSpan: range(0.35, 0.48)
  }, (v, p) => {
    const channels = [];
    for (let slot = 0; slot < p.elements.length; slot += 1) {
      const kind = p.elements[slot];
      const cx = 204 + slot * 116, cy = 172;
      const group = svg(v.overlay, 'g');
      const nodes = [];
      label(group, kind === 'fire' ? 'FIRE / 火' : kind === 'ice' ? 'ICE / 冰' : 'ARC / 电', cx, 254, 12, '#d5e5f3');
      for (let index = 0; index < p.count; index += 1) {
        const angle = index / p.count * TAU;
        const size = 10 + random(v.seed, slot * 100 + index) * 12;
        if (kind === 'fire') {
          const x = cx + (index / Math.max(1, p.count - 1) - 0.5) * p.spread * 1.2;
          const node = svg(group, 'path', { d: 'M' + (x - 7) + ' ' + (cy + 23) + ' Q' + (x - 14) + ' ' + (cy - size) + ' ' + x + ' ' + (cy - size * 2) + ' Q' + (x + 3) + ' ' + (cy - 7) + ' ' + (x + 8) + ' ' + (cy + 23) + ' Z', fill: index % 2 ? '#ef9c57' : '#e87458' });
          nodes.push({ node, kind, x, angle, size });
        } else if (kind === 'ice') {
          const shard = svg(group, 'g');
          svg(shard, 'path', { d: 'M0 ' + (-size) + ' L7 0 L0 ' + size + ' L-7 0 Z', fill: '#99d9ef', stroke: '#d4f4ff', 'stroke-width': 1 });
          svg(shard, 'path', { d: 'M0 ' + (-size) + ' L0 ' + size + ' L-7 0 Z', fill: '#4d94b9' });
          nodes.push({ node: shard, kind, angle, size });
        } else {
          let d = 'M' + cx + ' ' + cy;
          for (let joint = 1; joint <= 4; joint += 1) {
            const radius = p.spread * joint / 4;
            const bend = angle + (random(v.seed, 450 + index * 9 + joint) - 0.5) * 0.6;
            d += ' L' + (cx + Math.cos(bend) * radius) + ' ' + (cy + Math.sin(bend) * radius);
          }
          const node = svg(group, 'path', { d, fill: 'none', stroke: '#d9ceff', 'stroke-width': index % 2 ? 1.5 : 2.5, pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 });
          nodes.push({ node, kind, angle, size });
        }
      }
      channels.push({ nodes, cx, cy, group, at: 0.18 + slot * p.stagger });
    }
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 1 : time, 190);
      for (const channel of channels) {
        const life = reduced ? 0.55 : phase(time, channel.at, channel.at + p.burstSpan);
        const envelope = reduced ? 0.8 : Math.sin(Math.PI * life);
        for (const particle of channel.nodes) {
          opacity(particle.node, envelope);
          if (particle.kind === 'fire') {
            const lift = reduced ? 0 : -out(life) * p.spread * 0.35;
            attr(particle.node, 'transform', 'translate(0,' + lift + ')');
          } else if (particle.kind === 'ice') {
            const radius = p.spread * (reduced ? 0.65 : out(life));
            attr(particle.node, 'transform', 'translate(' + (channel.cx + Math.cos(particle.angle) * radius) + ',' + (channel.cy + Math.sin(particle.angle) * radius) + ') rotate(' + (particle.angle * 180 / Math.PI + 90) + ')');
          } else {
            attr(particle.node, 'stroke-dashoffset', reduced ? 0 : 1 - out(phase(life, 0, 0.5)));
          }
        }
      }
      v.setStatus('Fire: curved tongues · Ice: faceted radial shards · Arc: rooted jagged paths; all three actual branches in one mapped study' + (reduced ? ' · 静态三系结果 / static triad' : ''));
    });
  }, p => { if (0.18 + 2 * p.stagger + p.burstSpan > 0.96) throw new RangeError('Element bursts must fit their staggered timeline'); });

  recipes['game.perspective-speedline-tunnel'] = descriptor('game.perspective-speedline-tunnel', '透视速度线隧道 / Perspective speedline tunnel', {
    count: range(18, 44, true), vanishingX: range(0.35, 0.65), speed: range(0.8, 3.2), trailDepth: range(0.08, 0.32)
  }, (v, p) => {
    const lines = [];
    for (let index = 0; index < p.count; index += 1) lines.push({ node: svg(v.overlay, 'path', { stroke: index % 3 ? '#81b4d4' : '#d9e5f5', 'stroke-width': index % 3 ? 1.5 : 3, 'stroke-linecap': 'round', fill: 'none' }), angle: (index + random(v.seed, index) * 0.65) / p.count * TAU, depth: random(v.seed, 70 + index) * 1.8 + 0.2 });
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 0.65 : time, 275);
      const clock = reduced ? 0.35 : time;
      const envelope = reduced ? 0.42 : phase(time, 0.04, 0.18) * (1 - phase(time, 0.82, 1));
      const cx = p.vanishingX * 640, cy = 156;
      for (const line of lines) {
        const depth = 0.22 + ((line.depth - clock * p.speed - 0.22) % 1.8 + 1.8) % 1.8;
        const near = 115 / depth, far = 115 / (depth + p.trailDepth);
        const dx = Math.cos(line.angle), dy = Math.sin(line.angle) * 0.58;
        attr(line.node, 'd', 'M' + (cx + dx * far) + ' ' + (cy + dy * far) + ' L' + (cx + dx * near) + ' ' + (cy + dy * near));
        opacity(line.node, envelope * phase(depth, 0.22, 0.38) * (1 - phase(depth, 1.72, 2.02)));
      }
      v.setStatus(reduced ? '静态透视线索；没有向心流动 / Static perspective cue, no tunnel travel' : 'Each line projects near/far z endpoints around a vanishing point; deterministic depth wrapping, no owned playback loop');
    });
  });

  recipes['game.typographic-shockwave'] = descriptor('game.typographic-shockwave', '文字冲击波 / Geometry-timed typographic shockwave', {
    radius: range(170, 300), band: range(28, 75), amplitude: range(8, 24), waveAt: range(0.12, 0.3), waveSpan: range(0.4, 0.62)
  }, (v, p) => {
    if (typeof Intl.Segmenter !== 'function') throw new Error('Typographic shockwave requires Intl.Segmenter for safe graphemes');
    const ring = svg(v.overlay, 'circle', { cx: 320, cy: 157, r: 0, fill: 'none', stroke: '#bfddf4', 'stroke-width': 3 });
    const box = html(v.frame, 'div', null, { position: 'absolute', inset: '16% 8% 10%', display: 'flex', flexWrap: 'wrap', alignContent: 'center', alignItems: 'center', justifyContent: 'center', gap: '0', fontSize: 'clamp(18px, 4.2vw, 42px)', fontWeight: '800', lineHeight: '1.5', color: '#f0f7ff', whiteSpace: 'pre-wrap', pointerEvents: 'none' });
    box.setAttribute('aria-label', v.text);
    const glyphs = Array.from(new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(v.text), entry => ({ node: html(box, 'span', entry.segment, { display: 'inline-block', position: 'relative', whiteSpace: 'pre-wrap', textShadow: '0 2px 0 #101b2b' }), distance: 0, sign: 1 }));
    function measure() {
      const width = box.clientWidth || 1, height = box.clientHeight || 1;
      for (const glyph of glyphs) {
        const x = (glyph.node.offsetLeft + glyph.node.offsetWidth / 2 - width / 2) / width * 537.6;
        const y = (glyph.node.offsetTop + glyph.node.offsetHeight / 2 - height / 2) / height * 222;
        glyph.distance = Math.hypot(x, y);
        glyph.sign = x < 0 ? -1 : 1;
      }
    }
    measure();
    const Resize = v.stage.ownerDocument.defaultView && v.stage.ownerDocument.defaultView.ResizeObserver;
    if (Resize) {
      const observer = new Resize(measure);
      observer.observe(box);
      v.release(() => observer.disconnect());
    }
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 1 : time, 180);
      const amount = reduced ? 0.78 : phase(time, p.waveAt, p.waveAt + p.waveSpan);
      const radius = p.radius * out(amount);
      attr(ring, 'r', radius);
      opacity(ring, reduced ? 0.22 : 0.65 * Math.sin(Math.PI * amount));
      for (const glyph of glyphs) {
        const passage = (radius - glyph.distance) / p.band;
        const pressure = reduced || passage < 0 || passage > 1 ? 0 : Math.sin(Math.PI * passage) * (1 - amount * 0.3);
        glyph.node.style.transform = 'translateY(' + (-pressure * p.amplitude) + 'px) rotate(' + pressure * glyph.sign * 4 + 'deg)';
        glyph.node.style.color = pressure > 0.4 ? '#c7ecff' : '#f0f7ff';
      }
      v.setStatus(reduced ? '完整静态文字；冲击变形省略 / Complete static text without deformation' : 'Wavefront reaches measured grapheme positions; each local pressure returns to rest, not a letter-index stagger');
    });
  }, p => { if (p.waveAt + p.waveSpan > 0.94) throw new RangeError('Shockwave must finish before the study settles'); });

  recipes['game.finisher-diagonal-title-cut'] = descriptor('game.finisher-diagonal-title-cut', '终结斜切标题 / Finisher diagonal shot-and-title cut', {
    cutAt: range(0.18, 0.4), cutSpan: range(0.07, 0.18), slant: range(0.3, 1.1), titleHold: range(0.22, 0.45)
  }, (v, p) => {
    const clip = svg(v.defs, 'clipPath', { id: v.prefix + 'finisher-cut' });
    const mask = svg(clip, 'polygon', { points: '0,0' });
    const shot = svg(v.overlay, 'g', { 'clip-path': 'url(#' + v.prefix + 'finisher-cut)' });
    svg(shot, 'rect', { x: 0, y: 48, width: 640, height: 228, fill: '#342339' });
    svg(shot, 'path', { d: 'M0 251 L170 48 L226 48 L59 276 L0 276 Z M413 48 L482 48 L640 220 L640 276 L596 276 Z', fill: '#6f4758' });
    svg(shot, 'path', { d: 'M198 265 L398 59 M231 269 L431 63', stroke: '#e7c7ad', 'stroke-width': 3 });
    const seam = svg(v.overlay, 'path', { fill: 'none', stroke: '#ffe5c4', 'stroke-width': 5 });
    const title = heading(v, v.text, '#ffecd6');
    const bounds = cutBounds(SCREEN, 1, p.slant);
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 0.58 : Math.min(time / (p.cutAt + p.cutSpan), 1) * 0.58, 275);
      const amount = reduced ? 1 : phase(time, p.cutAt, p.cutAt + p.cutSpan);
      const threshold = mix(bounds[0] - 1, bounds[1] + 1, amount);
      const polygon = cutPolygon(SCREEN, 1, p.slant, threshold);
      attr(mask, 'points', polygon.length ? points(polygon) : '0,0');
      attr(seam, 'd', cutLine(SCREEN, 1, p.slant, threshold));
      opacity(seam, reduced || amount <= 0 || amount >= 1 ? 0 : 0.9);
      const titleAt = p.cutAt + p.cutSpan;
      const read = reduced ? 1 : phase(time, titleAt, titleAt + 0.055);
      title.style.opacity = String(read);
      title.style.clipPath = reduced ? 'inset(0)' : 'inset(0 ' + ((1 - read) * 50) + '%)';
      v.setStatus(reduced ? '静态终结标题；斜切省略 / Static finisher title' : time < titleAt ? 'Diagonal plane cuts between two original shots' : time <= titleAt + p.titleHold ? 'READ HOLD · title and action pose remain fixed' : 'Settled title; hold duration is presentation, never a gameplay lock');
    });
  }, p => { if (p.cutAt + p.cutSpan + p.titleHold > 0.92) throw new RangeError('Finisher title hold must fit before the settled segment'); });

  recipes['game.mission-contact-stamp'] = descriptor('game.mission-contact-stamp', '任务接触印章 / Mission contact-and-imprint stamp', {
    contactAt: range(0.22, 0.45), approachScale: range(1.3, 2.3), tilt: range(-15, 15), dwell: range(0.08, 0.22)
  }, (v, p) => {
    const card = svg(v.overlay, 'g');
    svg(card, 'rect', { x: 180, y: 79, width: 280, height: 176, rx: 9, fill: '#d1d2bd', stroke: '#ebe8d6', 'stroke-width': 3 });
    svg(card, 'path', { d: 'M203 98 L437 98 M203 236 L437 236 M213 107 L213 224 M427 107 L427 224', stroke: '#8a9387', 'stroke-width': 1 });
    const ink = svg(card, 'g', { transform: 'translate(320,164) rotate(' + p.tilt + ')' });
    const tool = svg(v.overlay, 'g');
    function mark(parent, color) {
      svg(parent, 'circle', { r: 60, fill: 'none', stroke: color, 'stroke-width': 5 });
      svg(parent, 'circle', { r: 49, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-dasharray': '5 4' });
      svg(parent, 'path', { d: 'M-23 -4 L-7 14 L28 -22', fill: 'none', stroke: color, 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      label(parent, 'MISSION', 0, -29, 11, color);
      label(parent, 'CLEAR', 0, 36, 13, color);
    }
    mark(ink, '#2d6759'); mark(tool, '#b6e8d6');
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 1 : time, 180);
      const approach = out(phase(time, 0.03, p.contactAt));
      const rebound = phase(time, p.contactAt + p.dwell, p.contactAt + p.dwell + 0.18);
      const scale = reduced ? 1 : mix(p.approachScale, 1, approach) + rebound * 0.3;
      attr(tool, 'transform', 'translate(320,' + (164 - rebound * 35) + ') rotate(' + p.tilt + ') scale(' + scale + ')');
      opacity(tool, reduced ? 0 : (1 - rebound) * 0.75);
      opacity(ink, reduced || time >= p.contactAt ? 1 : 0);
      const compression = reduced ? 0 : 2 * Math.sin(Math.PI * phase(time, p.contactAt, p.contactAt + 0.12));
      attr(card, 'transform', 'translate(0,' + compression + ')');
      v.setStatus(reduced ? '已盖章静态结果 / Completed imprint, no approaching tool' : time < p.contactAt ? 'Tool approaches; paper has no ink yet' : 'Ink persists after contact while tool separates; completion authority is external');
    });
  }, p => { if (p.contactAt + p.dwell + 0.18 > 0.94) throw new RangeError('Stamp must leave a stable imprint interval'); });

  recipes['game.victory-pose-hold'] = descriptor('game.victory-pose-hold', '胜利姿态驻留 / Victory articulated-pose hold', {
    impactAt: range(0.23, 0.42), hold: range(0.2, 0.38), ringRadius: range(70, 130), matte: range(0.35, 0.65)
  }, (v, p) => {
    const matte = svg(v.overlay, 'rect', { x: 0, y: 48, width: 640, height: 228, fill: '#111626' });
    const ring = svg(v.overlay, 'circle', { cx: 320, cy: 163, r: 0, fill: 'none', stroke: '#efca8b', 'stroke-width': 3 });
    const title = heading(v, v.text, '#ffe5b4');
    return lifecycle(v, (time, reduced) => {
      const clock = reduced ? 1 : holdClock(time, p.impactAt, p.hold);
      v.drawScene(clock, 150);
      const pose = poseAt(clock, 150, false);
      const celebration = phase(clock, 0.18, 0.48);
      pose.frontArm = mix(pose.frontArm, -165, celebration);
      pose.backArm = mix(pose.backArm, 152, celebration);
      v.hero.apply(pose);
      const read = reduced ? 1 : phase(time, p.impactAt - 0.08, p.impactAt);
      opacity(matte, read * p.matte);
      const bloom = reduced ? 1 : out(phase(time, p.impactAt - 0.05, p.impactAt + 0.15));
      attr(ring, 'r', bloom * p.ringRadius);
      opacity(ring, reduced ? 0.36 : read * 0.55);
      title.style.opacity = String(read);
      title.style.clipPath = 'inset(' + ((1 - read) * 50) + '% 0)';
      v.setStatus(reduced ? '完整静态胜利标题及姿态 / Static victory result' : time >= p.impactAt && time <= p.impactAt + p.hold ? 'VICTORY HOLD · world action pose is frozen, title readable' : 'Authored victory presentation clock · no win-state or input-lock authority');
    });
  }, holdRelation);

  recipes['game.warning-stripe-impact'] = descriptor('game.warning-stripe-impact', '警示斜纹落定 / Warning stripe slam-and-settle', {
    stripePitch: range(18, 46), slamFrom: ['top', 'bottom'], overshoot: range(4, 18), slamAt: range(0.18, 0.42)
  }, (v, p) => {
    const pattern = svg(v.defs, 'pattern', { id: v.prefix + 'warning-stripe', width: p.stripePitch, height: p.stripePitch, patternUnits: 'userSpaceOnUse' });
    svg(pattern, 'rect', { width: p.stripePitch, height: p.stripePitch, fill: '#d8b96d' });
    svg(pattern, 'path', { d: 'M' + (-p.stripePitch / 2) + ' ' + p.stripePitch + ' L' + (p.stripePitch / 2) + ' 0 L' + p.stripePitch + ' 0 L0 ' + p.stripePitch + ' Z M' + (p.stripePitch / 2) + ' ' + p.stripePitch + ' L' + (p.stripePitch * 1.5) + ' 0 L' + (p.stripePitch * 2) + ' 0 L' + p.stripePitch + ' ' + p.stripePitch + ' Z', fill: '#17212b' });
    const banner = svg(v.overlay, 'g');
    svg(banner, 'rect', { x: 0, y: 111, width: 640, height: 16, fill: 'url(#' + v.prefix + 'warning-stripe)' });
    svg(banner, 'rect', { x: 0, y: 127, width: 640, height: 76, fill: '#141c2b' });
    svg(banner, 'rect', { x: 0, y: 203, width: 640, height: 16, fill: 'url(#' + v.prefix + 'warning-stripe)' });
    label(banner, 'WARNING / 警示', 320, 176, 28, '#ffe5aa');
    const crease = svg(banner, 'path', { d: 'M0 127 L640 127 M0 203 L640 203', stroke: '#fff1c5', 'stroke-width': 2 });
    return lifecycle(v, (time, reduced) => {
      v.drawScene(reduced ? 1 : time, 200);
      const direction = p.slamFrom === 'top' ? -1 : 1;
      const approach = out(phase(time, 0.02, p.slamAt));
      const local = phase(time, p.slamAt, p.slamAt + 0.25);
      const settle = time < p.slamAt ? 0 : Math.sin(local * TAU) * Math.exp(-4 * local) * p.overshoot;
      const offset = reduced ? 0 : direction * (1 - approach) * 245 - direction * settle;
      attr(banner, 'transform', 'translate(0,' + offset + ')');
      opacity(crease, reduced ? 0.45 : time >= p.slamAt ? 0.65 : 0.2);
      v.setStatus(reduced ? '静态斜纹警示；无撞击或重复闪烁 / Static patterned warning' : 'Clipped striped banner slams from ' + p.slamFrom + ', has one bounded settle, then remains readable; no automatic replay');
    });
  });

  return { recipes };
}));
