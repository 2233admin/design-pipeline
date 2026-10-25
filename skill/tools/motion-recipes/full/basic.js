/* Original deterministic basic motion studies. Source metadata is inspiration only. */
((root, factory) => {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.MotionRecipeModules = root.MotionRecipeModules || {};
    root.MotionRecipeModules.basic = factory();
  }
})(typeof globalThis === 'undefined' ? this : globalThis, () => {
  

  const NS = 'http://www.w3.org/2000/svg';
  let sceneNumber = 0;
  const clamp = t => Math.max(0, Math.min(1, t));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const out = t => 1 - (1 - t) ** 3;
  const back = t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
  function bounce(t) {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
    return n * (t -= 2.625 / d) * t + .984375;
  }
  const elastic = t => t === 0 || t === 1 ? t : 1 + 2 ** (-10 * t) * Math.sin((10 * t - .75) * 2 * Math.PI / 3);
  function oscillator(seconds, stiffness, damping, mass, initialVelocity = 0) {
    if (seconds <= 0) return 0;
    const w = Math.sqrt(stiffness / mass), a = damping / (2 * mass), delta = a * a - w * w;
    if (Math.abs(delta) < 1e-8) return 1 + Math.exp(-a * seconds) * (-1 + (initialVelocity - a) * seconds);
    if (delta < 0) {
      const wd = Math.sqrt(-delta);
      return 1 + Math.exp(-a * seconds) * (-Math.cos(wd * seconds) + (initialVelocity - a) / wd * Math.sin(wd * seconds));
    }
    const r1 = -a + Math.sqrt(delta), r2 = -a - Math.sqrt(delta);
    const c1 = (initialVelocity + r2) / (r1 - r2), c2 = -1 - c1;
    return 1 + c1 * Math.exp(r1 * seconds) + c2 * Math.exp(r2 * seconds);
  }
  function attr(node, attrs) { for (const key of Object.keys(attrs)) node.setAttribute(key, String(attrs[key])); return node; }
  function svgNode(tag, attrs, parent) {
    const node = parent.ownerDocument.createElementNS(NS, tag);
    attr(node, attrs); parent.appendChild(node); return node;
  }
  function label(parent, x, y, text, size = 15) {
    const node = svgNode('text', {x, y, fill: '#e7eff5', 'font-size': size, 'font-family': 'system-ui, sans-serif'}, parent);
    node.textContent = text; return node;
  }
  const box = (parent, x, y, width = 42, height = 42, fill = '#65c7b0', radius = 10) => svgNode('rect', {x,y,width,height,fill,rx:radius}, parent);
  const pose = (node, x, y, angle = 0, sx = 1, sy = sx) => attr(node, {transform: `translate(${x} ${y}) rotate(${angle}) scale(${sx} ${sy})`});
  function strictParameters(id, schema, parameters) {
    if (!parameters || Object.getPrototypeOf(parameters) !== Object.prototype) throw new TypeError(`${id}: parameters must be a plain object`);
    for (const key of Object.keys(parameters)) if (!Object.hasOwn(schema, key)) throw new TypeError(`${id}: unknown parameter ${key}`);
    for (const key of Object.keys(schema)) {
      if (!Object.hasOwn(parameters, key)) throw new TypeError(`${id}: missing parameter ${key}`);
      const rule = schema[key], value = parameters[key];
      if (Array.isArray(rule)) {
        if (!rule.includes(value)) throw new RangeError(`${id}: unsupported ${key}=${value}`);
      } else if (rule === 'boolean') {
        if (typeof value !== 'boolean') throw new TypeError(`${id}: ${key} must be boolean`);
      } else if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min || value > rule.max || (rule.integer && !Number.isInteger(value))) {
        throw new RangeError(`${id}: ${key} must be ${rule.integer ? 'integer ' : ''}in [${rule.min},${rule.max}]`);
      }
    }
  }
  function descriptor(id, title, schema, make) {
    const validate = parameters => strictParameters(id, schema, parameters);
    return {title, validate, create(stage, parameters, options = {}) {
      validate(parameters);
      if (!stage || !stage.ownerDocument || !stage.dataset) throw new TypeError(`${id}: stage must be a DOM element`);
      const svg = stage.ownerDocument.createElementNS(NS, 'svg');
      attr(svg, {viewBox:'0 0 640 300',width:'100%',height:'100%',role:'img','aria-label':title});
      svg.style.cssText = 'display:block;min-height:240px;background:#142332;overflow:visible';
      stage.appendChild(svg);
      stage.dataset.recipe = id;
      const scene = {svg,root:svgNode('g',{},svg),label:label(svg,24,282,''),uid:`basic-${++sceneNumber}`};
      let result;
      try { result = make(scene, parameters, options); } catch (error) { svg.remove(); if (stage.dataset.recipe === id) delete stage.dataset.recipe; throw error; }
      const render = typeof result === 'function' ? result : result.render;
      let disposed = false;
      return {
        seek(progress) {
          if (disposed) throw new Error(`${id}: study has been disposed`);
          if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new RangeError(`${id}: seek must be finite in [0,1]`);
          render(options.reducedMotion ? 1 : progress);
        },
        dispose() {
          if (disposed) return;
          disposed = true;
          try { if (result && typeof result.dispose === 'function') result.dispose(); }
          finally { svg.remove(); if (stage.dataset.recipe === id) delete stage.dataset.recipe; }
        }
      };
    }};
  }


function buildCurvesRecipes() {
  const recipes = {};
  const travel = { min: 40, max: 110 };
  const springRules = {
    stiffness: { min: 20, max: 500 },
    damping: { min: 2, max: 150 },
    mass: { min: 0.2, max: 3 },
    initialVelocity: { min: -3, max: 3 },
    durationMs: { min: 800, max: 6000 },
    distancePx: { min: 40, max: 100 }
  };

  // All signal paths and nodes are mounted once. Seeking only changes attributes.
  function curvePlot(scene, signals, options) {
    const count = 320;
    let minimum = 0;
    let maximum = 1;
    for (const signal of signals) {
      minimum = Math.min(minimum, signal.finalValue);
      maximum = Math.max(maximum, signal.finalValue);
      for (let i = 0; i <= count; i += 1) {
        const value = signal.sample(i / count);
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
      }
    }
    const padding = Math.max(0.06, (maximum - minimum) * 0.07);
    minimum -= padding;
    maximum += padding;
    const x = t => 45 + 260 * t;
    const y = value => 220 - 155 * (value - minimum) / (maximum - minimum);
    svgNode('rect', { x: 45, y: 65, width: 260, height: 155, rx: 6, fill: '#132638' }, scene.root);
    for (const value of [0, 1]) {
      svgNode('line', { x1: 45, x2: 305, y1: y(value), y2: y(value), stroke: '#546578', 'stroke-dasharray': '4 5' }, scene.root);
    }
    label(scene.root, 5, 66, maximum.toFixed(2), 11);
    label(scene.root, 5, 222, minimum.toFixed(2), 11);
    label(scene.root, 45, 242, '0', 12);
    label(scene.root, 284, 242, '1', 12);
    label(scene.root, 104, 258, '时间 / progress', 12);
    const dots = [];
    const values = new Float64Array(signals.length);
    for (let index = 0; index < signals.length; index += 1) {
      const signal = signals[index];
      let path = '';
      if (signal.knots) {
        for (let i = 0; i < signal.knots.length; i += 1) {
          const knot = signal.knots[i];
          path += (i === 0 ? 'M' : 'L') + x(knot[0]) + ' ' + y(knot[1]);
        }
      } else {
        for (let i = 0; i <= count; i += 1) {
          const t = i / count;
          path += (i === 0 ? 'M' : 'L') + x(t) + ' ' + y(signal.sample(t));
        }
      }
      svgNode('path', { d: path, fill: 'none', stroke: signal.color, 'stroke-width': 2.5, 'stroke-dasharray': signal.dashed ? '5 4' : 'none' }, scene.root);
      label(scene.root, 45, 25 + index * 17, signal.name, 12);
      dots.push(svgNode('circle', { r: 5, fill: signal.color, stroke: '#f4f6fa', 'stroke-width': 1.5 }, scene.root));
    }
    const cursor = svgNode('line', { y1: 65, y2: 220, stroke: '#c4d3e2', opacity: 0.35 }, scene.root);
    return {
      x,
      y,
      render(t) {
        attr(cursor, { x1: x(t), x2: x(t) });
        for (let i = 0; i < signals.length; i += 1) {
          const value = options.reducedMotion ? signals[i].finalValue : signals[i].sample(t);
          values[i] = value;
          attr(dots[i], { cx: x(t), cy: y(value) });
        }
        return values;
      }
    };
  }

  function track(scene, distancePx, y, color) {
    svgNode('line', { x1: 400, x2: 400 + distancePx, y1: y, y2: y, stroke: '#657486', 'stroke-width': 2 }, scene.root);
    svgNode('rect', { x: 400 + distancePx - 18, y: y - 18, width: 36, height: 36, rx: 8, fill: 'none', stroke: color, 'stroke-dasharray': '4 4' }, scene.root);
    return box(scene.root, -18, -18, 36, 36, color, 8);
  }

  function ordinaryCurve(scene, parameters, options, sample, name, knots) {
    const plot = curvePlot(scene, [{ sample, finalValue: 1, color: '#65c7b0', name, knots }], options);
    const marker = track(scene, parameters.distancePx, 155, '#65c7b0');
    label(scene.root, 369, 90, '起点 → 目标 / target', 13);
    return t => {
      const value = plot.render(t)[0];
      pose(marker, 400 + parameters.distancePx * value, 155);
      scene.label.textContent = options.reducedMotion
        ? '目标静态呈现 / target shown without motion'
        : '位置 / position ' + value.toFixed(3) + ' · 时间 / progress ' + t.toFixed(3);
    };
  }

  function cubicBezier(parameters) {
    const coordinate = (u, a, b) => 3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u;
    return t => {
      if (t === 0 || t === 1) return t;
      let low = 0;
      let high = 1;
      for (let i = 0; i < 36; i += 1) {
        const u = (low + high) / 2;
        if (coordinate(u, parameters.x1, parameters.x2) < t) low = u;
        else high = u;
      }
      return coordinate((low + high) / 2, parameters.y1, parameters.y2);
    };
  }

  function backCurve(direction, coefficient) {
    const inward = t => (coefficient + 1) * t * t * t - coefficient * t * t;
    if (direction === 'in') return inward;
    if (direction === 'out') return t => 1 - inward(1 - t);
    return t => t < 0.5 ? inward(2 * t) / 2 : 1 - inward(2 - 2 * t) / 2;
  }

  // A fall followed by finite restitution-governed ballistic rebounds.
  function reboundCurve(restitution, rebounds) {
    const spans = [];
    let total = 1;
    let start = 1;
    for (let i = 1; i <= rebounds; i += 1) {
      const height = restitution ** (2 * i);
      const length = 2 * restitution ** i;
      spans.push({ start, length, height });
      start += length;
      total += length;
    }
    return {
      contacts: [1 / total, ...spans.map(span => (span.start + span.length) / total)],
      sample(t) {
        if (t === 1) return 1;
        const seconds = t * total;
        if (seconds <= 1) return seconds * seconds;
        for (const span of spans) {
          if (seconds <= span.start + span.length) {
            const u = (seconds - span.start) / span.length;
            return 1 - 4 * span.height * u * (1 - u);
          }
        }
        return 1;
      }
    };
  }

  recipes['basic.linear-curve'] = descriptor('basic.linear-curve', '匀速 / Linear spacing', {
    distancePx: travel
  }, (scene, p, options) => ordinaryCurve(scene, p, options, t => t, 'constant velocity'));

  recipes['basic.power-curve'] = descriptor('basic.power-curve', '幂次速度 / Power timing', {
    direction: ['out', 'in-out'], power: { min: 2, max: 6 }, distancePx: travel
  }, (scene, p, options) => {
    const sample = p.direction === 'out'
      ? t => 1 - (1 - t) ** p.power
      : t => t < 0.5 ? (2 * t) ** p.power / 2 : 1 - (2 - 2 * t) ** p.power / 2;
    return ordinaryCurve(scene, p, options, sample, 'power ' + p.power + ' · ' + p.direction);
  });

  recipes['basic.sine-curve'] = descriptor('basic.sine-curve', '正弦缓入缓出 / Sine in-out', {
    distancePx: travel
  }, (scene, p, options) => ordinaryCurve(scene, p, options, t => (1 - Math.cos(Math.PI * t)) / 2, 'sine in-out'));

  recipes['basic.exponential-curve'] = descriptor('basic.exponential-curve', '指数速度 / Exponential timing', {
    direction: ['in', 'out'], exponent: { min: 2, max: 16 }, distancePx: travel
  }, (scene, p, options) => {
    const denominator = 2 ** p.exponent - 1;
    const inward = t => (2 ** (p.exponent * t) - 1) / denominator;
    const sample = p.direction === 'in' ? inward : t => 1 - inward(1 - t);
    return ordinaryCurve(scene, p, options, sample, 'normalized exponential · ' + p.direction);
  });

  recipes['basic.circular-curve'] = descriptor('basic.circular-curve', '圆弧减速 / Circular out', {
    distancePx: travel
  }, (scene, p, options) => ordinaryCurve(scene, p, options, t => Math.sqrt(1 - (t - 1) * (t - 1)), 'circular out'));

  recipes['basic.back-curve'] = descriptor('basic.back-curve', '预备与越界 / Back timing', {
    direction: ['in', 'out', 'in-out'], coefficient: { min: 0, max: 3 }, distancePx: travel
  }, (scene, p, options) => ordinaryCurve(scene, p, options, backCurve(p.direction, p.coefficient), 'back · ' + p.direction));

  recipes['basic.bounce-curve'] = descriptor('basic.bounce-curve', '递减反弹 / Bounce out', {
    distancePx: travel
  }, (scene, p, options) => ordinaryCurve(scene, p, options, reboundCurve(0.5, 3).sample, 'parabolic rebounds · restitution 0.5'));

  recipes['basic.squash-bounce'] = descriptor('basic.squash-bounce', '接触压缩反弹 / Squash at impact', {
    strength: { min: 0.2, max: 0.8 }, rebounds: { min: 2, max: 5, integer: true },
    squash: { min: 0.05, max: 0.45 }, heightPx: { min: 80, max: 160 }
  }, (scene, p, options) => {
    const rebound = reboundCurve(p.strength, p.rebounds);
    const activeEnd = 0.86;
    const sample = t => rebound.sample(clamp(t / activeEnd));
    const plot = curvePlot(scene, [{ sample, finalValue: 1, color: '#65c7b0', name: 'height + impact deformation' }], options);
    svgNode('line', { x1: 380, x2: 605, y1: 244, y2: 244, stroke: '#b2c0cc', 'stroke-width': 2 }, scene.root);
    const shadow = svgNode('ellipse', { cy: 244, cx: 500, ry: 4, fill: '#152b3f' }, scene.root);
    const ball = svgNode('circle', { r: 20, fill: '#65c7b0' }, scene.root);
    label(scene.root, 363, 40, '压缩保持接触底缘 / contact', 13);
    return t => {
      const value = plot.render(t)[0];
      let impact = 0;
      if (!options.reducedMotion) {
        for (let i = 0; i < rebound.contacts.length; i += 1) {
          const distance = Math.abs(t - activeEnd * rebound.contacts[i]);
          const width = 0.018 + 0.008 * p.strength ** i;
          if (distance < width) {
            const u = distance / width;
            impact = Math.max(impact, (1 - u * u) ** 2 * p.strength ** i);
          }
        }
      }
      const sy = 1 - p.squash * impact;
      const sx = 1 / sy;
      const elevation = p.heightPx * (1 - value);
      pose(ball, 500, 244 - 20 * sy - elevation, 0, sx, sy);
      attr(shadow, { rx: 10 + 18 * value, opacity: 0.16 + 0.3 * value });
      scene.label.textContent = options.reducedMotion
        ? '球静止落地，轮廓恢复 / landed, shape restored'
        : '高度 / height ' + elevation.toFixed(1) + 'px · 面积保持 / area preserved';
    };
  });

  recipes['basic.elastic-curve'] = descriptor('basic.elastic-curve', '弹性时间曲线 / Elastic easing', {
    amplitude: { min: 1, max: 2 }, period: { min: 0.1, max: 0.8 }, distancePx: travel
  }, (scene, p, options) => {
    const phase = p.period * Math.asin(1 / p.amplitude) / (2 * Math.PI);
    const sample = t => t === 0 || t === 1 ? t : 1 + p.amplitude * 2 ** (-10 * t) * Math.sin((t - phase) * 2 * Math.PI / p.period);
    return ordinaryCurve(scene, p, options, sample, 'elastic easing · not a physical solver');
  });

  recipes['basic.cubic-bezier-curve'] = descriptor('basic.cubic-bezier-curve', '反解贝塞尔时间 / Inverse-x Bézier', {
    x1: { min: 0, max: 1 }, y1: { min: -0.5, max: 1.5 },
    x2: { min: 0, max: 1 }, y2: { min: -0.5, max: 1.5 }, distancePx: travel
  }, (scene, p, options) => ordinaryCurve(scene, p, options, cubicBezier(p), 'Bézier: solve x(u), then evaluate y(u)'));

  recipes['basic.stepped-curve'] = descriptor('basic.stepped-curve', '逐级时间 / End-step quantization', {
    steps: { min: 2, max: 24, integer: true }, distancePx: travel
  }, (scene, p, options) => {
    const sample = t => Math.floor(t * p.steps) / p.steps;
    const knots = [[0, 0]];
    for (let i = 1; i <= p.steps; i += 1) {
      knots.push([i / p.steps, (i - 1) / p.steps], [i / p.steps, i / p.steps]);
    }
    return ordinaryCurve(scene, p, options, sample, p.steps + ' steps · jumps at interval ends', knots);
  });

  recipes['basic.rough-curve'] = descriptor('basic.rough-curve', '固定噪声折线 / Seeded rough timing', {
    points: { min: 4, max: 64, integer: true }, strength: { min: 0.05, max: 1 }, distancePx: travel
  }, (scene, p, options) => {
    const seed = Number.isFinite(options.seed) ? options.seed | 0 : 1;
    const values = new Float64Array(p.points);
    const knots = [];
    for (let i = 0; i < p.points; i += 1) {
      const t = i / (p.points - 1);
      let hash = Math.imul(i + 1, 0x45d9f3b) ^ seed;
      hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
      hash ^= hash >>> 16;
      const noise = 2 * ((hash >>> 0) / 4294967295) - 1;
      const value = t + 0.22 * p.strength * 4 * t * (1 - t) * noise;
      values[i] = value;
      knots.push([t, value]);
    }
    const sample = t => {
      const index = Math.min(p.points - 2, Math.floor(t * (p.points - 1)));
      return mix(values[index], values[index + 1], t * (p.points - 1) - index);
    };
    return ordinaryCurve(scene, p, options, sample, 'fixed noisy knots · seed ' + seed, knots);
  });

  recipes['basic.slow-zone-curve'] = descriptor('basic.slow-zone-curve', '中段慢动作 / Slow middle zone', {
    zone: { min: 0.2, max: 0.8 }, power: { min: 0.1, max: 0.9 }, distancePx: travel
  }, (scene, p, options) => {
    const edge = (1 - p.zone) / 2;
    const fast = 1 + p.power;
    const slow = 1 - p.power;
    const edgeArea = edge * (fast + slow) / 2;
    const total = 2 * edgeArea + p.zone * slow;
    const integral = (u, from, to) => from * u + (to - from) * (u ** 3 / (edge * edge) - u ** 4 / (2 * edge * edge * edge));
    const sample = t => {
      if (t < edge) return integral(t, fast, slow) / total;
      if (t <= 1 - edge) return (edgeArea + (t - edge) * slow) / total;
      return (edgeArea + p.zone * slow + integral(t - (1 - edge), slow, fast)) / total;
    };
    return ordinaryCurve(scene, p, options, sample, 'integrated speed · quick / slow / quick');
  });

  recipes['basic.wiggle-displacement'] = descriptor('basic.wiggle-displacement', '逐渐停下的摆动 / Decaying wiggle', {
    cycles: { min: 1, max: 12, integer: true }, amplitudePx: { min: 6, max: 50 }, decay: { min: 1, max: 5 }
  }, (scene, p, options) => {
    const sample = t => Math.sin(2 * Math.PI * p.cycles * t) * (1 - t) ** p.decay;
    const plot = curvePlot(scene, [{ sample, finalValue: 0, color: '#a7b8ff', name: p.cycles + ' cycles · decaying displacement' }], options);
    svgNode('line', { x1: 450, x2: 550, y1: 155, y2: 155, stroke: '#657486' }, scene.root);
    svgNode('rect', { x: 482, y: 137, width: 36, height: 36, rx: 8, fill: 'none', stroke: '#a7b8ff', 'stroke-dasharray': '4 4' }, scene.root);
    const marker = box(scene.root, -18, -18, 36, 36, '#a7b8ff', 8);
    return t => {
      const value = plot.render(t)[0];
      pose(marker, 500 + p.amplitudePx * value, 155);
      scene.label.textContent = options.reducedMotion
        ? '静态归位，无摆动 / resting without wiggle'
        : '偏移 / displacement ' + (p.amplitudePx * value).toFixed(1) + 'px · finite oscillation';
    };
  });

  recipes['basic.logarithmic-scale'] = descriptor('basic.logarithmic-scale', '对数尺度变化 / Log-space scale', {
    fromScale: { min: 0.25, max: 1.75 }, toScale: { min: 2, max: 8 }
  }, (scene, p, options) => {
    const scaleAt = t => p.fromScale * Math.exp(Math.log(p.toScale / p.fromScale) * t);
    const sample = t => (scaleAt(t) - p.fromScale) / (p.toScale - p.fromScale);
    const plot = curvePlot(scene, [{ sample, finalValue: 1, color: '#65c7b0', name: 'equal time = equal scale ratio' }], options);
    svgNode('rect', { x: 490 - 7 * p.toScale, y: 150 - 7 * p.toScale, width: 14 * p.toScale, height: 14 * p.toScale, rx: 2, fill: 'none', stroke: '#65c7b0', 'stroke-dasharray': '4 4' }, scene.root);
    const marker = box(scene.root, -7, -7, 14, 14, '#65c7b0', 2);
    label(scene.root, 355, 45, '几何尺度 / geometric scale', 13);
    return t => {
      plot.render(t);
      const value = options.reducedMotion ? p.toScale : scaleAt(t);
      pose(marker, 490, 150, 0, value);
      scene.label.textContent = options.reducedMotion
        ? '最终尺度静态呈现 / final scale shown'
        : '尺度 / scale ' + value.toFixed(3) + ' · ratio-space interpolation';
    };
  });

  recipes['basic.physical-spring'] = descriptor('basic.physical-spring', '解析质量弹簧 / Analytic mass spring', springRules, (scene, p, options) => {
    const seconds = p.durationMs / 1000;
    const sample = t => oscillator(t * seconds, p.stiffness, p.damping, p.mass, p.initialVelocity);
    const ratio = p.damping / (2 * Math.sqrt(p.stiffness * p.mass));
    const frequency = Math.sqrt(p.stiffness / p.mass), decay = p.damping / (2 * p.mass);
    const delta = decay * decay - frequency * frequency;
    const regime = Math.abs(delta) < 1e-8 ? 'critical' : delta < 0 ? 'underdamped' : 'overdamped';
    const plot = curvePlot(scene, [{ sample, finalValue: 1, color: '#65c7b0', name: 'physical response · ' + regime }], options);
    const marker = track(scene, p.distancePx, 155, '#65c7b0');
    label(scene.root, 354, 45, 'm x″ + c x′ + k(x−1) = 0', 12);
    label(scene.root, 360, 230, 'ζ = ' + ratio.toFixed(3), 13);
    return t => {
      const value = plot.render(t)[0];
      pose(marker, 400 + p.distancePx * value, 155);
      scene.label.textContent = options.reducedMotion
        ? '目标静态呈现；无残余振动 / target at rest'
        : '物理位移 / x ' + value.toFixed(4) + ' · elapsed ' + (t * seconds).toFixed(3) + 's';
    };
  });

  recipes['basic.back-overshoot-budget'] = descriptor('basic.back-overshoot-budget', '越界预算 / Back overshoot budget', {
    overshootPercent: { min: 0, max: 20 }, distancePx: { min: 40, max: 110 }
  }, (scene, p, options) => {
    const budget = p.overshootPercent / 100;
    let low = 0;
    let high = 8;
    for (let i = 0; i < 48; i += 1) {
      const coefficient = (low + high) / 2;
      const peak = 4 * coefficient ** 3 / (27 * (coefficient + 1) ** 2);
      if (peak < budget) low = coefficient;
      else high = coefficient;
    }
    const coefficient = budget === 0 ? 0 : (low + high) / 2;
    const sample = backCurve('out', coefficient);
    const baseline = t => 1 - (1 - t) ** 3;
    const plot = curvePlot(scene, [
      { sample, finalValue: 1, color: '#65c7b0', name: 'budgeted back · ' + p.overshootPercent + '%' },
      { sample: baseline, finalValue: 1, color: '#a7b8ff', name: 'zero overshoot · cubic out', dashed: true }
    ], options);
    const marker = track(scene, p.distancePx, 128, '#65c7b0');
    const reference = track(scene, p.distancePx, 205, '#a7b8ff');
    const limit = 400 + p.distancePx * (1 + budget);
    svgNode('line', { x1: limit, x2: limit, y1: 95, y2: 160, stroke: '#f1bd7a', 'stroke-dasharray': '3 4' }, scene.root);
    label(scene.root, 350, 54, '预算控制峰值，不钳制轨迹 / peak', 12);
    return t => {
      const values = plot.render(t);
      pose(marker, 400 + p.distancePx * values[0], 128);
      pose(reference, 400 + p.distancePx * values[1], 205);
      scene.label.textContent = options.reducedMotion
        ? '两条路径静态到达同一目标 / common target shown'
        : 'back peak budget ' + p.overshootPercent + '% · actual x ' + values[0].toFixed(3);
    };
  });

  recipes['basic.split-edge-springs'] = descriptor('basic.split-edge-springs', '独立边缘弹簧 / Independent edge springs', {
    leadingStiffness: { min: 240, max: 420 }, leadingDamping: { min: 22, max: 48 },
    trailingStiffness: { min: 90, max: 180 }, trailingDamping: { min: 14, max: 32 },
    mass: { min: 0.8, max: 1.3 }, durationMs: { min: 800, max: 4000 }, travelPx: { min: 40, max: 80 }
  }, (scene, p, options) => {
    const seconds = p.durationMs / 1000;
    const leading = t => oscillator(t * seconds, p.leadingStiffness, p.leadingDamping, p.mass);
    const trailing = t => oscillator(t * seconds, p.trailingStiffness, p.trailingDamping, p.mass);
    const plot = curvePlot(scene, [
      { sample: leading, finalValue: 1, color: '#65c7b0', name: 'leading edge · independent solver' },
      { sample: trailing, finalValue: 1, color: '#a7b8ff', name: 'trailing edge · independent solver' }
    ], options);
    const band = svgNode('rect', { y: 135, height: 58, rx: 12, fill: '#65c7b0', opacity: 0.8 }, scene.root);
    const front = svgNode('line', { y1: 124, y2: 205, stroke: '#65c7b0', 'stroke-width': 3 }, scene.root);
    const rear = svgNode('line', { y1: 124, y2: 205, stroke: '#a7b8ff', 'stroke-width': 3 }, scene.root);
    svgNode('rect', { x: 350 + p.travelPx, y: 135, width: 180, height: 58, rx: 12, fill: 'none', stroke: '#b2c0cc', 'stroke-dasharray': '4 5' }, scene.root);
    label(scene.root, 354, 76, '边缘之差改变宽度 / width', 13);
    label(scene.root, 354, 237, '独立目标，不是串联链 / not a chain', 12);
    return t => {
      const values = plot.render(t);
      const left = 350 + p.travelPx * values[1];
      const right = 530 + p.travelPx * values[0];
      attr(band, { x: left, width: right - left });
      attr(front, { x1: right, x2: right });
      attr(rear, { x1: left, x2: left });
      scene.label.textContent = options.reducedMotion
        ? '完整宽度静态到达 / both edges at their targets'
        : '宽度 / width ' + (right - left).toFixed(2) + 'px · separate physical responses';
    };
  });

  recipes['basic.summed-spring-retarget'] = descriptor('basic.summed-spring-retarget', '叠加重定向弹簧 / Summed retarget responses', {
    stiffness: { min: 120, max: 320 }, damping: { min: 18, max: 45 }, mass: { min: 0.6, max: 1.4 },
    initialVelocity: { min: -2, max: 2 }, durationMs: { min: 1800, max: 5000 },
    retargetAt: { min: 0.12, max: 0.28 }, returnAt: { min: 0.32, max: 0.55 },
    targetA: { min: 0.65, max: 0.95 }, targetB: { min: 0.1, max: 0.4 }, targetFinal: { min: 0.7, max: 1 },
    distancePx: { min: 40, max: 90 }
  }, (scene, p, options) => {
    const seconds = p.durationMs / 1000;
    const firstChange = p.retargetAt * seconds;
    const secondChange = p.returnAt * seconds;
    const zeroVelocityStep = s => s <= 0 ? 0 : oscillator(s, p.stiffness, p.damping, p.mass);
    const sample = t => {
      const s = t * seconds;
      return p.targetA * oscillator(s, p.stiffness, p.damping, p.mass, p.initialVelocity / p.targetA)
        + (p.targetB - p.targetA) * zeroVelocityStep(s - firstChange)
        + (p.targetFinal - p.targetB) * zeroVelocityStep(s - secondChange);
    };
    const targetAt = t => t < p.retargetAt ? p.targetA : t < p.returnAt ? p.targetB : p.targetFinal;
    const targetKnots = [[0, p.targetA], [p.retargetAt, p.targetA], [p.retargetAt, p.targetB], [p.returnAt, p.targetB], [p.returnAt, p.targetFinal], [1, p.targetFinal]];
    const plot = curvePlot(scene, [
      { sample, finalValue: p.targetFinal, color: '#65c7b0', name: 'continuous displacement + velocity' },
      { sample: targetAt, finalValue: p.targetFinal, color: '#f1bd7a', name: 'logical targets · immediate changes', dashed: true, knots: targetKnots }
    ], options);
    for (const event of [p.retargetAt, p.returnAt]) {
      svgNode('line', { x1: plot.x(event), x2: plot.x(event), y1: 65, y2: 220, stroke: '#f1bd7a', opacity: 0.35, 'stroke-dasharray': '3 5' }, scene.root);
    }
    const marker = box(scene.root, -18, -18, 36, 36, '#65c7b0', 8);
    const target = svgNode('rect', { y: 137, width: 36, height: 36, rx: 8, fill: 'none', stroke: '#f1bd7a', 'stroke-width': 2 }, scene.root);
    label(scene.root, 353, 55, '目标可跳变，运动不重置 / retarget', 12);
    return t => {
      const values = plot.render(t);
      pose(marker, 410 + p.distancePx * values[0], 155);
      attr(target, { x: 410 + p.distancePx * values[1] - 18 });
      scene.label.textContent = options.reducedMotion
        ? '最终逻辑目标静态呈现 / final requested target shown'
        : '目标 / target ' + values[1].toFixed(2) + ' · 响应 / x ' + values[0].toFixed(4);
    };
  });

  recipes['basic.spring-tween-comparison'] = descriptor('basic.spring-tween-comparison', '物理弹簧与时长补间 / Spring versus tween', {
    stiffness: { min: 80, max: 400 }, damping: { min: 12, max: 50 }, mass: { min: 0.5, max: 2 },
    initialVelocity: { min: -2, max: 2 }, durationMs: { min: 1000, max: 5000 },
    tweenDurationMs: { min: 200, max: 800 },
    x1: { min: 0, max: 1 }, y1: { min: 0, max: 1 }, x2: { min: 0, max: 1 }, y2: { min: 0, max: 1 },
    distancePx: { min: 40, max: 100 }
  }, (scene, p, options) => {
    const timing = cubicBezier(p);
    const physical = t => oscillator(t * p.durationMs / 1000, p.stiffness, p.damping, p.mass, p.initialVelocity);
    const tween = t => timing(clamp(t * p.durationMs / p.tweenDurationMs));
    const plot = curvePlot(scene, [
      { sample: physical, finalValue: 1, color: '#65c7b0', name: 'spring · mass / stiffness / damping / velocity' },
      { sample: tween, finalValue: 1, color: '#a7b8ff', name: 'tween · prescribed duration + Bézier' }
    ], options);
    const springMarker = track(scene, p.distancePx, 123, '#65c7b0');
    const tweenMarker = track(scene, p.distancePx, 203, '#a7b8ff');
    label(scene.root, 350, 75, 'spring', 13);
    label(scene.root, 350, 186, 'tween', 13);
    return t => {
      const values = plot.render(t);
      pose(springMarker, 400 + p.distancePx * values[0], 123);
      pose(tweenMarker, 400 + p.distancePx * values[1], 203);
      scene.label.textContent = options.reducedMotion
        ? '两者静态到达，无振动 / both targets shown'
        : 'spring ' + values[0].toFixed(3) + ' · tween ' + values[1].toFixed(3) + ' · different clocks';
    };
  });

  recipes['basic.inertial-decay'] = descriptor('basic.inertial-decay', '无目标惯性衰减 / Free momentum decay', {
    velocityPxPerSecond: { min: 80, max: 220 }, timeConstantMs: { min: 180, max: 800 }, durationMs: { min: 1000, max: 4800 }
  }, (scene, p, options) => {
    const tau = p.timeConstantMs / 1000;
    const terminal = p.velocityPxPerSecond * tau;
    const sample = t => terminal * (1 - Math.exp(-t * p.durationMs / p.timeConstantMs));
    const plot = curvePlot(scene, [{ sample, finalValue: terminal, color: '#f1bd7a', name: 'inertia · displacement in px' }], options);
    const marker = box(scene.root, -16, -16, 32, 32, '#f1bd7a', 8);
    svgNode('line', { x1: 390, x2: 390 + terminal, y1: 155, y2: 155, stroke: '#657486' }, scene.root);
    svgNode('rect', { x: 390 + terminal - 16, y: 139, width: 32, height: 32, rx: 8, fill: 'none', stroke: '#f1bd7a', 'stroke-dasharray': '4 4' }, scene.root);
    label(scene.root, 350, 58, '释放速度决定停点 / release velocity', 12);
    return t => {
      const value = plot.render(t)[0];
      const velocity = options.reducedMotion ? 0 : p.velocityPxPerSecond * Math.exp(-t * p.durationMs / p.timeConstantMs);
      pose(marker, 390 + value, 155);
      scene.label.textContent = options.reducedMotion
        ? '惯性预测停点静态呈现 / projected resting position'
        : '位移 / x ' + value.toFixed(1) + 'px · 速度 / v ' + velocity.toFixed(1) + 'px/s';
    };
  });

  recipes['basic.ballistic-projectile'] = descriptor('basic.ballistic-projectile', '解析抛射轨迹 / Ballistic projectile', {
    gravity: { min: 200, max: 800 }, horizontalVelocity: { min: 90, max: 180 }, launchVelocity: { min: -260, max: -100 }
  }, (scene, p, options) => {
    const flightSeconds = -2 * p.launchVelocity / p.gravity;
    const positionX = t => 80 + p.horizontalVelocity * flightSeconds * t;
    const positionY = t => {
      const seconds = flightSeconds * t;
      return 230 + p.launchVelocity * seconds + p.gravity * seconds * seconds / 2;
    };
    let path = '';
    for (let i = 0; i <= 160; i += 1) {
      const t = i / 160;
      path += (i === 0 ? 'M' : 'L') + positionX(t) + ' ' + positionY(t);
    }
    svgNode('path', { d: path, fill: 'none', stroke: '#f1bd7a', 'stroke-width': 2, 'stroke-dasharray': '4 4' }, scene.root);
    svgNode('line', { x1: 55, x2: 602, y1: 244, y2: 244, stroke: '#b2c0cc', 'stroke-width': 2 }, scene.root);
    const finalX = positionX(1);
    svgNode('circle', { cx: finalX, cy: 230, r: 14, fill: 'none', stroke: '#65c7b0', 'stroke-dasharray': '4 4' }, scene.root);
    const shadow = svgNode('ellipse', { cy: 244, ry: 3, fill: '#20364b' }, scene.root);
    const ball = svgNode('circle', { r: 14, fill: '#f1bd7a' }, scene.root);
    const velocity = svgNode('line', { stroke: '#65c7b0', 'stroke-width': 3, 'stroke-linecap': 'round' }, scene.root);
    label(scene.root, 24, 30, '恒定水平速度 + 重力加速度 / constant acceleration', 14);
    label(scene.root, 58, 263, 'launch', 12);
    label(scene.root, Math.min(520, finalX - 18), 263, 'contact', 12);
    return t => {
      const progress = options.reducedMotion ? 1 : t;
      const x = positionX(progress);
      const y = positionY(progress);
      const elapsed = flightSeconds * progress;
      const vy = p.launchVelocity + p.gravity * elapsed;
      attr(ball, { cx: x, cy: y });
      attr(shadow, { cx: x, rx: 20 / (1 + (230 - y) / 80), opacity: 0.2 + 0.15 / (1 + (230 - y) / 80) });
      attr(velocity, { x1: x, y1: y, x2: x + p.horizontalVelocity * 0.1, y2: y + vy * 0.1, opacity: progress === 1 ? 0 : 1 });
      scene.label.textContent = options.reducedMotion || progress === 1
        ? '落地点呈现 / landing contact · physical flight ' + flightSeconds.toFixed(3) + 's'
        : 'elapsed ' + elapsed.toFixed(3) + 's · vy ' + vy.toFixed(1) + 'px/s · gravity ' + p.gravity;
    };
  });

  return recipes;
}


function buildStructureRecipes() {
  const recipes = {};
  const green = '#65c7b0', blue = '#76a9fa', amber = '#f1b866', ink = '#17262d', muted = '#84959e';
  const add = (id, title, schema, make) => { recipes[id] = descriptor(id, title, schema, make); };
  const number = (min, max) => ({ min, max });
  const integer = (min, max) => ({ min, max, integer: true });
  const phase = (t, start, duration) => clamp((t - start) / duration);
  const sine = (t) => (1 - Math.cos(Math.PI * clamp(t))) / 2;
  const cubic = (t) => { const q = clamp(t); return q < .5 ? 4 * q * q * q : 1 - (-2 * q + 2) ** 3 / 2; };
  const pulse = (t, start, duration) => Math.sin(Math.PI * phase(t, start, duration));
  const group = (parent) => svgNode('g', {}, parent);
  const circle = (parent, x, y, r, fill = green) => svgNode('circle', { cx: x, cy: y, r, fill }, parent);
  const line = (parent, x1, y1, x2, y2, stroke = muted, width = 2) => svgNode('line', { x1, y1, x2, y2, stroke, 'stroke-width': width, 'stroke-linecap': 'round' }, parent);
  const guide = (parent, x1, y1, x2, y2) => line(parent, x1, y1, x2, y2, '#41535d', 1);
  const hash = (seed, index) => { let v = Math.imul((seed | 0) ^ Math.imul(index + 1, 1597334677), 2246822519); v ^= v >>> 13; v = Math.imul(v, 3266489917); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
  const quartOut = (t) => 1 - (1 - clamp(t)) ** 4;
  const inOutBack = (t) => { const q = clamp(t), c = 1.70158 * 1.525; return q < .5 ? (2 * q) ** 2 * ((c + 1) * 2 * q - c) / 2 : ((2 * q - 2) ** 2 * ((c + 1) * (2 * q - 2) + c) + 2) / 2; };

  add('basic.anticipatory-jump', '反向准备与起跳 / Anticipatory jump', {
    travel: number(180, 300), windupFraction: number(.12, .3), windupDistance: number(12, 45), lift: number(25, 75)
  }, (scene, p) => {
    guide(scene.root, 100, 214, 540, 214);
    const shadow = svgNode('ellipse', { cx: 150, cy: 215, rx: 26, ry: 5, fill: '#41535d' }, scene.root);
    const actor = group(scene.root); circle(actor, 0, 0, 25); circle(actor, 8, -6, 3, ink);
    return (t) => {
      const prepare = phase(t, 0, p.windupFraction), act = phase(t, p.windupFraction, .8 - p.windupFraction);
      const squeeze = (1 - act) * Math.sin(Math.PI * prepare / 2), sy = 1 - .24 * squeeze;
      const x = t < p.windupFraction ? 150 - p.windupDistance * smooth(prepare) : mix(150 - p.windupDistance, 150 + p.travel, out(act));
      const height = p.lift * Math.sin(Math.PI * act), y = 214 - 25 * sy - height;
      pose(actor, x, y, 0, 1 / sy, sy);
      attr(shadow, { cx: x, rx: 26 - 9 * height / p.lift, opacity: .6 - .25 * height / p.lift });
      scene.label.textContent = t < p.windupFraction ? '准备 / opposite preparation' : act < 1 ? '释放 / prepared force released' : '到达 / landed at target';
    };
  });

  add('basic.appeal-toggle', '清晰轮廓与状态表情 / Appealing toggle', {
    width: number(140, 220), knobRadius: number(20, 28), transitionFraction: number(.15, .45)
  }, (scene, p) => {
    const track = box(scene.root, 320 - p.width / 2, 115, p.width, 64, '#41535d', 32);
    label(scene.root, 320 - p.width / 2, 208, '关闭 OFF', 15); label(scene.root, 320 + p.width / 2 - 66, 208, '开启 ON', 15);
    const knob = group(scene.root); circle(knob, 0, 0, p.knobRadius, '#f3f7f9');
    const eye1 = circle(knob, -7, -4, 2.5, ink), eye2 = circle(knob, 7, -4, 2.5, ink);
    const mouth = svgNode('path', { fill: 'none', stroke: ink, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, knob);
    const mark = svgNode('path', { fill: 'none', stroke: green, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, scene.root);
    return (t) => {
      const q = out(phase(t, .08, p.transitionFraction)), x = mix(320 - p.width / 2 + 32, 320 + p.width / 2 - 32, q);
      attr(track, { fill: q > .5 ? '#327b6b' : '#41535d' });
      pose(knob, x, 147, 0, 1 + .06 * Math.sin(Math.PI * q), 1 - .04 * Math.sin(Math.PI * q));
      attr(eye1, { cx: -7 + 2 * q }); attr(eye2, { cx: 7 + 2 * q });
      attr(mouth, { d: `M -8 8 Q 0 ${mix(8, 17, q)} 8 8` });
      attr(mark, { d: 'M 298 80 L 312 94 L 340 66', opacity: q });
      scene.label.textContent = q < 1 ? 'OFF → ON / state and silhouette' : 'ON / selected state readable without motion';
    };
  });

  add('basic.arc-trajectory', '轨迹与切线朝向 / Arc trajectory', {
    travel: number(220, 360), lift: number(55, 105), turnDegrees: number(15, 65)
  }, (scene, p) => {
    const start = 320 - p.travel / 2;
    for (let i = 0; i <= 12; i += 1) { const q = i / 12; circle(scene.root, start + q * p.travel, 200 - p.lift * Math.sin(Math.PI * q), 2.5, '#41535d'); }
    guide(scene.root, start, 200, start + p.travel, 200);
    const actor = group(scene.root); box(actor, -23, -15, 46, 30, green, 8); line(actor, 8, 0, 28, 0, ink, 3);
    return (t) => {
      const q = sine(phase(t, .05, .8)), tangent = Math.atan2(-p.lift * Math.PI * Math.cos(Math.PI * q), p.travel) * 180 / Math.PI;
      pose(actor, start + p.travel * q, 200 - p.lift * Math.sin(Math.PI * q), tangent * p.turnDegrees / 65);
      scene.label.textContent = q < 1 ? '弧线 / position and tangent turn together' : '到达 / curved travel completed';
    };
  });

  add('basic.causal-domino-chain', '接触传播因果链 / Causal contact chain', {
    count: integer(3, 6), gap: number(30, 44), fallDegrees: number(72, 88), fallFraction: number(.12, .22)
  }, (scene, p) => {
    guide(scene.root, 170, 219, 500, 219);
    const start = 320 - (p.count - 1) * p.gap / 2, tiles = [];
    const contactAngle = Math.asin((p.gap - 10) / 82) * 180 / Math.PI;
    const delay = p.fallFraction * Math.sqrt(contactAngle / p.fallDegrees);
    for (let i = 0; i < p.count; i += 1) { const g = group(scene.root); box(g, -5, -82, 10, 82, i % 2 ? blue : green, 3); tiles.push(g); }
    const initiator = circle(scene.root, start - 46, 146, 12, amber);
    return (t) => {
      const first = phase(t, .02, .1); attr(initiator, { cx: mix(start - 46, start - 17, out(first)) });
      let reached = 0;
      tiles.forEach((tile, i) => { const q = phase(t, .12 + i * delay, p.fallFraction); pose(tile, start + i * p.gap, 219, p.fallDegrees * q * q); if (q > 0) reached += 1; });
      scene.label.textContent = `${reached}/${p.count} 接触后响应 / next tile waits for contact`;
    };
  });

  add('basic.counterbalanced-motion', '主体与配重反向 / Counterbalanced motion', {
    travel: number(90, 180), counterRatio: number(.25, .65), tiltDegrees: number(8, 24)
  }, (scene, p) => {
    const rope = svgNode('path', { fill: 'none', stroke: muted, 'stroke-width': 3 }, scene.root);
    const actor = group(scene.root); box(actor, -28, -22, 56, 44, green, 10);
    const counterweight = group(scene.root); box(counterweight, -17, -17, 34, 34, amber, 5);
    circle(scene.root, 320, 68, 11, muted);
    return (t) => {
      const q = out(phase(t, .06, .74)), x = 205 + p.travel * q, counterX = 450 - p.travel * p.counterRatio * q;
      pose(actor, x, 174, p.tiltDegrees * Math.sin(Math.PI * q)); pose(counterweight, counterX, 121, -p.tiltDegrees * Math.sin(Math.PI * q));
      attr(rope, { d: `M ${x} 152 L 320 68 L ${counterX} 104` });
      scene.label.textContent = q < 1 ? '反向配重 / primary and counter element oppose' : '平衡 / opposed elements settled';
    };
  });

  add('basic.exaggerated-reaction', '基准与夸张反应 / Exaggerated reaction', {
    amplitude: number(22, 55), amplification: number(1.5, 3), stretch: number(.12, .3)
  }, (scene, p) => {
    label(scene.root, 120, 68, '基准 BASELINE', 15); label(scene.root, 345, 68, '夸张 AMPLIFIED', 15);
    const actors = [group(scene.root), group(scene.root)]; actors.forEach((g) => { circle(g, 0, 0, 25); circle(g, 8, -6, 3, ink); });
    guide(scene.root, 100, 214, 540, 214);
    return (t) => {
      const q = phase(t, .08, .7), response = q === 1 ? 0 : Math.sin(Math.PI * q) * Math.exp(-1.6 * q), kick = p.amplitude * response;
      actors.forEach((g, i) => { const gain = i ? p.amplification : 1, sy = 1 + p.stretch * response * gain / p.amplification; pose(g, i ? 425 : 205, 214 - 25 * sy - kick * gain, gain * 10 * response, 1 / sy, sy); });
      scene.label.textContent = q < 1 ? '同一反应，不同幅度 / gain changes lift and deformation' : '反应结束 / both retain the same grounded result';
    };
  });

  add('basic.follow-through-chain', '领先停下，尾部续动 / Follow-through chain', {
    travel: number(140, 260), lagFraction: number(.04, .1), rebound: number(12, 30)
  }, (scene, p) => {
    const links = [line(scene.root, 0, 0, 0, 0, muted, 4), line(scene.root, 0, 0, 0, 0, muted, 4)];
    const nodes = [group(scene.root), group(scene.root), group(scene.root)];
    nodes.forEach((g, i) => circle(g, 0, 0, 24 - i * 5, [green, blue, amber][i]));
    return (t) => {
      const positions = [];
      nodes.forEach((g, i) => {
        const q = phase(t, .05 + i * p.lagFraction, .46 + i * .09), after = phase(t, .51 + i * p.lagFraction, .28);
        const ring = i && after < 1 ? p.rebound * i / 2 * Math.sin(after * Math.PI * 3) * (1 - after) : 0;
        const x = 180 + p.travel * out(q) - i * 42 + ring, y = 150 + i * 15 + (i ? .5 * ring : 0);
        pose(g, x, y); positions.push([x, y]);
      });
      links.forEach((link, i) => attr(link, { x1: positions[i][0], y1: positions[i][1], x2: positions[i + 1][0], y2: positions[i + 1][1] }));
      scene.label.textContent = t < .51 ? '领先 / lead accelerates first' : t < .79 + 2 * p.lagFraction ? '续动 / tails continue after lead stops' : '整体安定 / lead and tails settled';
    };
  });

  add('basic.anti-twinning-variation', '错开同形节奏 / Anti-twinning variation', {
    count: integer(4, 8), seed: integer(1, 65535), delaySpread: number(.08, .24), tiltSpread: number(3, 12)
  }, (scene, p) => {
    const actors = [], variants = [];
    for (let i = 0; i < p.count; i += 1) { const g = group(scene.root); box(g, -18, -18, 36, 36, i % 2 ? blue : green); actors.push(g); variants.push([hash(p.seed, i), hash(p.seed + 37, i)]); }
    label(scene.root, 115, 66, '固定种子，不同延迟与姿态 / seeded variation', 15);
    return (t) => {
      actors.forEach((g, i) => { const v = variants[i], q = phase(t, .04 + v[0] * p.delaySpread, .4 + .12 * v[1]), swing = p.tiltSpread * (v[1] * 2 - 1) * Math.sin(Math.PI * q); pose(g, 320 + (i - (p.count - 1) / 2) * 58, mix(205, 150, out(q)), swing); attr(g, { opacity: mix(.15, 1, q) }); });
      scene.label.textContent = t < .82 ? '去同频 / individual onsets and orientation' : '完整集合 / all members settled, no ongoing jitter';
    };
  });

  add('basic.primary-secondary-ambient', '主体、响应与环境分层 / Three motion layers', {
    travel: number(110, 230), secondaryLag: number(.05, .18), ambientAmplitude: number(4, 12)
  }, (scene, p) => {
    const ambient = group(scene.root);
    for (let i = 0; i < 7; i += 1) circle(ambient, 125 + i * 65, 93 + (i % 2) * 23, 5, '#41535d');
    const secondary = group(scene.root); box(secondary, -28, -10, 56, 20, blue, 8);
    const primary = group(scene.root); box(primary, -34, -29, 68, 58, green, 12); label(primary, -17, 5, '主体', 14);
    return (t) => {
      const q = out(phase(t, .04, .48)), r = out(phase(t, .04 + p.secondaryLag, .58)), envelope = Math.sin(Math.PI * t);
      pose(ambient, 0, p.ambientAmplitude * Math.sin(t * Math.PI * 4) * envelope);
      pose(primary, 180 + p.travel * q, 165); pose(secondary, 180 + p.travel * r, 213 + 7 * Math.sin(Math.PI * r));
      scene.label.textContent = t < .85 ? '主次分离 / primary leads, secondary follows, ambient stays subtle' : '内容已到位 / all layers static at the endpoint';
    };
  });

  function makeRig(parent, color) {
    const root = group(parent), torso = box(root, -13, -39, 26, 36, color, 10), head = circle(root, 0, -55, 13, color);
    circle(root, 5, -57, 2.3, ink);
    const leftArm = line(root, -10, -33, -28, -10, color, 7), rightArm = line(root, 10, -33, 28, -10, color, 7);
    const leftLeg = line(root, -6, -4, -18, 24, color, 8), rightLeg = line(root, 6, -4, 18, 24, color, 8);
    return { root, torso, head, leftArm, rightArm, leftLeg, rightLeg };
  }
  function rigPose(rig, x, y, lean, arm, leg) {
    pose(rig.root, x, y, lean);
    attr(rig.leftArm, { x2: -10 - 25 * Math.cos(arm), y2: -33 + 25 * Math.sin(arm) });
    attr(rig.rightArm, { x2: 10 + 25 * Math.cos(arm), y2: -33 + 25 * Math.sin(arm) });
    attr(rig.leftLeg, { x2: -6 - 29 * Math.sin(leg), y2: -4 + 29 * Math.cos(leg) });
    attr(rig.rightLeg, { x2: 6 + 29 * Math.sin(leg), y2: -4 + 29 * Math.cos(leg) });
  }

  add('basic.keypose-forward-dynamics', '关键姿态与逐步动力 / Key poses vs forward dynamics', {
    travel: number(100, 190), launchVelocity: number(150, 230), gravity: number(360, 520), restitution: number(.15, .4)
  }, (scene, p) => {
    label(scene.root, 76, 38, '关键姿态 KEY POSES', 14); label(scene.root, 76, 164, '逐步动力 FORWARD STEPS', 14);
    guide(scene.root, 74, 130, 574, 130); guide(scene.root, 74, 254, 574, 254);
    const keyed = makeRig(scene.root, green), forward = makeRig(scene.root, blue);
    // Authored key poses are interpolated directly; the other lane is a fixed-step initial-value solution sampled once.
    const keys = [
      [0, 0, 0, -10, 1.1, .22], [.16, -.06, 0, -18, 1.6, .48], [.42, .43, -34, 15, -.4, .85], [.68, 1, 0, -6, .8, .25], [1, 1, 0, 0, 1.05, .22]
    ];
    const samples = [], step = 1 / 120, seconds = 1.6;
    let x = 0, y = 0, vx = p.travel / 1.02, vy = -p.launchVelocity, arm = 1.6, armVelocity = 0;
    for (let i = 0; i <= seconds / step; i += 1) {
      const elapsed = i * step;
      if (elapsed > .12) {
        vy += p.gravity * step; y += vy * step;
        if (y > 0) { y = 0; vy = Math.abs(vy) < 30 ? 0 : -vy * p.restitution; vx *= .96; }
        x = Math.min(p.travel, x + vx * step);
        const targetArm = y < -5 ? -.35 : 1.05;
        armVelocity += (65 * (targetArm - arm) - 11 * armVelocity) * step; arm += armVelocity * step;
      }
      samples.push({ x, y, arm, lean: Math.max(-18, Math.min(18, vx / 12 + vy / 45)), leg: .22 + Math.min(1, Math.abs(vy) / p.launchVelocity) * .7 });
    }
    return (t) => {
      const q = phase(t, .03, .88);
      let keyIndex = 0; while (keyIndex < keys.length - 2 && q > keys[keyIndex + 1][0]) keyIndex += 1;
      const a = keys[keyIndex], b = keys[keyIndex + 1], u = cubic((q - a[0]) / (b[0] - a[0]));
      rigPose(keyed, 200 + p.travel * mix(a[1], b[1], u), 105 + mix(a[2], b[2], u), mix(a[3], b[3], u), mix(a[4], b[4], u), mix(a[5], b[5], u));
      const index = Math.min(samples.length - 1, Math.floor(q * (samples.length - 1))), state = samples[index], settle = smooth(phase(q, .78, .22));
      rigPose(forward, 200 + mix(state.x, p.travel, settle), 229 + state.y * (1 - settle), state.lean * (1 - settle), mix(state.arm, 1.05, settle), mix(state.leg, .22, settle));
      scene.label.textContent = q < 1 ? '两种构造 / authored breakdowns vs gravity, contact and joint lag' : '同一结果 / both articulated figures stand at target';
    };
  });

  add('basic.secondary-gesture', '主要行走与次要挥手 / Secondary gesture', {
    travel: number(120, 250), gestureStart: number(.2, .4), gestureAmplitude: number(.55, 1.15)
  }, (scene, p) => {
    const rig = makeRig(scene.root, green), badge = circle(scene.root, 0, 0, 8, amber);
    guide(scene.root, 100, 235, 540, 235);
    return (t) => {
      const q = out(phase(t, .04, .66)), gesture = pulse(t, p.gestureStart, .4), x = 170 + p.travel * q;
      rigPose(rig, x, 210, 4 * Math.sin(Math.PI * q), 1.05, .22 + .25 * Math.sin(q * Math.PI * 4) * Math.sin(Math.PI * q));
      const arm = 1.05 - p.gestureAmplitude * gesture;
      attr(rig.rightArm, { x2: 10 + 25 * Math.cos(arm), y2: -33 + 25 * Math.sin(arm) });
      attr(badge, { cx: x + 10 + 34 * Math.cos(arm), cy: 177 + 34 * Math.sin(arm), opacity: .3 + .7 * gesture });
      scene.label.textContent = t < .8 ? '主动作仍清晰 / walking remains primary while one arm gestures' : '行走完成 / secondary gesture resolved, destination unchanged';
    };
  });

  add('basic.slow-spacing-comparison', '均匀与两端密集间距 / Slow-in slow-out spacing', {
    travel: number(240, 380), samples: integer(7, 13), activeFraction: number(.55, .85)
  }, (scene, p) => {
    const start = 320 - p.travel / 2;
    label(scene.root, 75, 48, '均匀 LINEAR', 14); label(scene.root, 75, 170, '慢入慢出 SLOW IN / OUT', 14);
    for (let i = 0; i < p.samples; i += 1) { const q = i / (p.samples - 1); circle(scene.root, start + p.travel * q, 90, 3, '#41535d'); circle(scene.root, start + p.travel * cubic(q), 211, 3, '#41535d'); }
    const a = circle(scene.root, start, 90, 16), b = circle(scene.root, start, 211, 16, blue);
    return (t) => { const q = phase(t, .04, p.activeFraction); attr(a, { cx: start + p.travel * q }); attr(b, { cx: start + p.travel * cubic(q) }); scene.label.textContent = q < 1 ? '同一时长 / endpoint spacing differs, travel does not' : '两条轨道到达 / both paths share their destination'; };
  });

  add('basic.projected-solid', '一致体积与深度 / Projected solid', {
    size: number(52, 86), turnDegrees: number(45, 120), perspective: number(360, 600)
  }, (scene, p) => {
    const shadow = svgNode('ellipse', { cx: 320, cy: 227, rx: 65, ry: 12, fill: '#41535d' }, scene.root);
    const faces = Array.from({ length: 6 }, () => svgNode('polygon', { stroke: ink, 'stroke-width': 1.5 }, scene.root));
    const h = p.size / 2, vertices = [[-h,-h,-h],[h,-h,-h],[h,h,-h],[-h,h,-h],[-h,-h,h],[h,-h,h],[h,h,h],[-h,h,h]];
    const indices = [[0,1,2,3],[4,5,6,7],[0,4,7,3],[1,5,6,2],[0,1,5,4],[3,2,6,7]], fills = ['#347e6c',green,'#559ddd',blue,'#a3d5c7','#2f6570'];
    return (t) => {
      const angle = mix(-25, p.turnDegrees - 25, cubic(phase(t, .05, .8))) * Math.PI / 180, tilt = -.28;
      const points = vertices.map(([x,y,z]) => { const rx = x * Math.cos(angle) + z * Math.sin(angle), rz = -x * Math.sin(angle) + z * Math.cos(angle), ry = y * Math.cos(tilt) - rz * Math.sin(tilt), depth = y * Math.sin(tilt) + rz * Math.cos(tilt), scale = p.perspective / (p.perspective + depth); return [320 + rx * scale, 145 + ry * scale, depth]; });
      const sorted = indices.map((ids, i) => ({ i, depth: ids.reduce((sum, n) => sum + points[n][2], 0) / 4 })).sort((a,b) => b.depth - a.depth);
      sorted.forEach((face, layer) => attr(faces[layer], { points: indices[face.i].map((i) => `${points[i][0]},${points[i][1]}`).join(' '), fill: fills[face.i] }));
      attr(shadow, { rx: p.size * (.68 + .15 * Math.abs(Math.sin(angle))) });
      scene.label.textContent = t < .85 ? '同一八顶点 / six faces keep shared edges while turning' : '实体停止 / volume and depth remain readable';
    };
  });

  add('basic.contact-squash', '触地压缩与空中拉伸 / Contact squash and stretch', {
    dropHeight: number(75, 135), compression: number(.18, .38), reboundHeight: number(20, 50)
  }, (scene, p) => {
    guide(scene.root, 130, 224, 510, 224);
    const shadow = svgNode('ellipse', { cx: 320, cy: 227, rx: 25, ry: 5, fill: '#41535d' }, scene.root);
    const actor = group(scene.root); circle(actor, 0, 0, 25); circle(actor, 8, -5, 3, ink);
    return (t) => {
      let height, sy;
      if (t < .36) { const q = phase(t, 0, .36); height = p.dropHeight * (1 - q * q); sy = 1 + .3 * q * q; }
      else if (t < .47) { const q = phase(t, .36, .11); height = 0; sy = 1 + .3 * (1 - q) - p.compression * Math.sin(Math.PI * q); }
      else if (t < .8) { const q = phase(t, .47, .33); height = p.reboundHeight * 4 * q * (1 - q); sy = 1 + .2 * Math.sin(Math.PI * q); }
      else { const q = phase(t, .8, .14); height = 0; sy = 1 - .45 * p.compression * Math.sin(Math.PI * q); }
      pose(actor, 320, 224 - 25 * sy - height, 0, 1 / sy, sy);
      attr(shadow, { rx: 25 - 9 * height / p.dropHeight, opacity: .7 - .35 * height / p.dropHeight });
      scene.label.textContent = t < .36 ? '下落拉伸 / increasing fall speed' : t < .47 ? '接触压缩 / bottom stays on the ground' : t < .94 ? '回弹与安定 / reciprocal scale preserves projected area' : '触地静止 / grounded circular result';
    };
  });

  add('basic.staged-focus-hierarchy', '降低竞争并留出主角 / Staged focus hierarchy', {
    focusScale: number(1.15, 1.45), dimOpacity: number(.16, .38), separation: number(16, 38)
  }, (scene, p) => {
    const cards = [], positions = [[190,95],[320,95],[450,95],[190,192],[320,192],[450,192]];
    positions.forEach((_, i) => { const g = group(scene.root); box(g,-48,-32,96,64,i === 4 ? green : blue,10); label(g,-31,5,i === 4 ? '主角' : `信息 ${i + 1}`,14); cards.push(g); });
    const frame = box(scene.root, -57, -41, 114, 82, 'none', 14); attr(frame, { stroke: amber, 'stroke-width': 3 });
    return (t) => {
      const q = out(phase(t,.05,.45));
      cards.forEach((g,i) => { const selected = i === 4, pos = positions[i], dx = selected ? 0 : Math.sign(pos[0] - 320) * p.separation * q, dy = selected ? 0 : -p.separation * q / 2; pose(g,pos[0] + dx,pos[1] + dy,0,selected ? mix(1,p.focusScale,q) : 1); attr(g,{opacity:selected ? 1 : mix(1,p.dimOpacity,q)}); });
      pose(frame,320,192,0,mix(1,p.focusScale,q)); attr(frame,{opacity:q});
      scene.label.textContent = q < 1 ? '舞台让位 / contrast, spacing and scale establish one focus' : '主角清晰 / subordinate cards remain visible, not removed';
    };
  });

  add('basic.timing-mass-contact', '轻重与接触反应 / Timing and weight', {
    dropHeight: number(85, 130), heavyDuration: number(.38, .55), durationRatio: number(1.4, 2.1), heavyCompression: number(.08, .2)
  }, (scene,p) => {
    label(scene.root,150,43,'轻 LIGHT',15); label(scene.root,405,43,'重 HEAVY',15);
    guide(scene.root,100,232,540,232);
    const actors = [group(scene.root),group(scene.root)], pads = [box(scene.root,155,232,90,8,'#41535d',3),box(scene.root,395,232,90,8,'#41535d',3)];
    circle(actors[0],0,0,21,blue); box(actors[1],-31,-31,62,62,green,8);
    return (t) => {
      actors.forEach((g,i) => {
        const duration = i ? p.heavyDuration : p.heavyDuration / p.durationRatio, q = phase(t,.04,duration), impact = phase(t,.04 + duration,.25), r = i ? 31 : 21;
        const height = q < 1 ? p.dropHeight * (1 - q*q) : i ? 0 : 24 * Math.sin(Math.PI * impact) * (1 - impact);
        const compression = q < 1 ? 0 : (i ? p.heavyCompression : .27) * Math.sin(Math.PI * impact), sy = 1-compression;
        pose(g,i ? 440 : 200,232-r*sy-height,0,1/sy,sy);
        attr(pads[i],{height:8 + (i ? 10 : 3)*Math.sin(Math.PI*impact),y:232,fill:i && impact > 0 && impact < 1 ? '#7a6250' : '#41535d'});
      });
      scene.label.textContent = t < .85 ? '不同重量 / longer heavy arrival, deeper support reaction, less rebound' : '均已接触 / weight is shown by timing and aftermath, not speed alone';
    };
  });

  add('basic.ambient-breathing-hold', '主角停住，环境轻动 / Ambient breathing hold', {
    arrivalFraction: number(.15,.35), amplitude: number(3,10), cycles: integer(1,3)
  }, (scene,p) => {
    const ambient = group(scene.root), rings=[];
    for(let i=0;i<3;i+=1) rings.push(svgNode('ellipse',{cx:320,cy:148,rx:78+i*32,ry:34+i*18,fill:'none',stroke:'#41535d','stroke-width':2},ambient));
    const actor = group(scene.root); box(actor,-37,-27,74,54,green,12); label(actor,-21,5,'内容',15);
    return(t)=>{
      const arrival=out(phase(t,0,p.arrivalFraction)), hold=phase(t,p.arrivalFraction,1-p.arrivalFraction), breathing=p.amplitude*Math.sin(hold*Math.PI*2*p.cycles)*Math.sin(Math.PI*hold);
      pose(actor,320,mix(194,148,arrival));
      rings.forEach((ring,i)=>attr(ring,{rx:78+i*32+breathing*(i+1)/3,ry:34+i*18+breathing*.35,opacity:.65+i*.1}));
      scene.label.textContent=arrival<1?'主体到位 / content arrives once':t<1?'停留仍有层次 / content holds while ambient breathes':'内容停留 / static hold; ambient movement is not required';
    };
  });

  add('basic.beat-grid', '拍点与衰减响应 / Beat grid', {
    beats:integer(3,8),bpm:number(60,180),decaySeconds:number(.12,.3)
  },(scene,p)=>{
    const markers=[],halos=[];
    for(let i=0;i<p.beats;i+=1){const x=320+(i-(p.beats-1)/2)*58; markers.push(circle(scene.root,x,153,16,'#41535d'));halos.push(svgNode('circle',{cx:x,cy:153,r:19,fill:'none',stroke:amber,'stroke-width':2},scene.root));label(scene.root,x-4,201,String(i+1),14);}
    label(scene.root,225,65,`${p.bpm} BPM · ${Math.round(60000/p.bpm)} ms / beat`,16);
    return(t)=>{
      const seconds=t*p.beats*60/p.bpm, beatSeconds=60/p.bpm;
      markers.forEach((node,i)=>{const elapsed=seconds-i*beatSeconds,active=elapsed>=0,response=active&&elapsed<p.decaySeconds?Math.exp(-7*elapsed/p.decaySeconds):0;attr(node,{fill:active?green:'#41535d',r:16+7*response});attr(halos[i],{r:20+16*response,opacity:response});});
      scene.label.textContent=t<1?'拍点已触发 / responses occur at exact beat intervals':`${p.beats} 拍已完成 / static beat ledger, no repeating pulse`;
    };
  });

  add('basic.distance-duration', '按距离分配时长 / Distance-scaled duration', {
    shortDistance:number(70,130),longDistance:number(220,350),baseFraction:number(.16,.28),distanceFraction:number(.001,.0014)
  },(scene,p)=>{
    const distances=[p.shortDistance,(p.shortDistance+p.longDistance)/2,p.longDistance],actors=[];
    distances.forEach((distance,i)=>{const y=84+i*70;guide(scene.root,110,y,110+distance,y);label(scene.root,475,y+5,`${Math.round(distance)} px`,14);actors.push(circle(scene.root,110,y,15,i%2?blue:green));});
    return(t)=>{distances.forEach((distance,i)=>{const duration=p.baseFraction+distance*p.distanceFraction,q=cubic(phase(t,.03,duration));attr(actors[i],{cx:110+distance*q});});scene.label.textContent=t<.85?'远程用更长预算 / distance adds to the base duration':'三个目标均到达 / no delayed logical state';};
  });

  add('basic.size-duration', '按尺寸分配时长 / Size-scaled duration', {
    smallSize:number(20,32),largeSize:number(54,72),baseFraction:number(.14,.24),sizeFraction:number(.003,.006)
  },(scene,p)=>{
    const sizes=[p.smallSize,(p.smallSize+p.largeSize)/2,p.largeSize],actors=[];
    sizes.forEach((size,i)=>{const g=group(scene.root);box(g,-size/2,-size/2,size,size,i%2?blue:green,Math.min(12,size/4));actors.push(g);label(scene.root,154+i*157,242,`${Math.round(size)} px`,14);});
    return(t)=>{sizes.forEach((size,i)=>{const q=out(phase(t,.03,p.baseFraction+size*p.sizeFraction));pose(actors[i],180+i*157,mix(186,125,q));attr(actors[i],{opacity:mix(.15,1,q)});});scene.label.textContent=t<.85?'大物件慢些安定 / larger geometry receives a longer interval':'不同尺寸均到位 / size budget is presentation only';};
  });

  add('basic.energy-arc', '积蓄、爆发与回落 / Energy arc', {
    buildFraction:number(.2,.4),burstFraction:number(.1,.18),peakLift:number(55,100),settleCycles:integer(1,3)
  },(scene,p)=>{
    const actor=group(scene.root);box(actor,-30,-30,60,60,green,12);
    const meter=box(scene.root,95,224,450,10,'#41535d',5),energy=box(scene.root,95,224,1,10,amber,5);
    label(scene.root,94,66,'积蓄 BUILD → 爆发 BURST → 回落 SETTLE',15);
    return(t)=>{
      let level,lift,angle;
      if(t<p.buildFraction){const q=phase(t,0,p.buildFraction);level=.35*q*q;lift=0;angle=-8*q;}
      else if(t<p.buildFraction+p.burstFraction){const q=phase(t,p.buildFraction,p.burstFraction);level=mix(.35,1,out(q));lift=p.peakLift*out(q);angle=mix(-8,18,out(q));}
      else{const q=phase(t,p.buildFraction+p.burstFraction,1-p.buildFraction-p.burstFraction);level=(1-q)*(1-q);lift=p.peakLift*(1-q)*(1-q)+12*Math.sin(q*Math.PI*2*p.settleCycles)*(1-q);angle=18*(1-q)*(1-q);}
      pose(actor,320,174-lift,angle,1+.08*level,1-.08*level);attr(energy,{width:Math.max(1,450*level)});attr(meter,{opacity:.7});
      scene.label.textContent=t<p.buildFraction?'积蓄 / slow energy build':t<p.buildFraction+p.burstFraction?'爆发 / short high-energy accent':t<1?'回落 / diminishing energy':'安定 / energy resolved to a static resting pose';
    };
  });

  add('basic.enter-exit-asymmetry', '进入较慢，退出更快 / Enter-exit asymmetry', {
    enterFraction:number(.22,.35),exitRatio:number(.45,.7),holdFraction:number(.18,.28),travel:number(60,120)
  },(scene,p)=>{
    const actor=group(scene.root);box(actor,-90,-34,180,68,green,12);label(actor,-60,6,'暂时提示 / NOTICE',15);
    const outcome=label(scene.root,205,227,'提示已关闭 / DISMISSED',16),enterBar=box(scene.root,115,68,1,8,blue,3),exitBar=box(scene.root,355,68,1,8,amber,3);
    const exitDuration=p.enterFraction*p.exitRatio,exitStart=.04+p.enterFraction+p.holdFraction;
    label(scene.root,115,53,'进入 ENTER',14);label(scene.root,355,53,'退出 EXIT',14);
    return(t)=>{
      const entering=phase(t,.04,p.enterFraction),exiting=phase(t,exitStart,exitDuration),enter=out(entering),exit=exiting*exiting*exiting;
      pose(actor,320,150+p.travel*(1-enter)-p.travel*exit);attr(actor,{opacity:enter*(1-exit)});attr(outcome,{opacity:exiting===1?1:0});
      attr(enterBar,{width:180*entering});attr(exitBar,{width:180*exiting*p.exitRatio});
      scene.label.textContent=entering<1?'进入 / notice arrives slowly':t<exitStart?'停留 / readable hold':exiting<1?'退出 / dismissal uses a shorter interval':'已关闭 / static semantic outcome remains readable';
    };
  });

  add('basic.overlap-comparison', '串行、半重叠与同时 / Overlap levels', {
    count:integer(3,5),itemFraction:number(.12,.18),travel:number(100,180)
  },(scene,p)=>{
    const lanes=[],levels=[1,.5,0],names=['串行 SERIAL','半重叠 HALF','同时 TOGETHER'];
    levels.forEach((_,row)=>{label(scene.root,60,64+row*76,names[row],14);const actors=[];for(let i=0;i<p.count;i+=1){const g=group(scene.root);box(g,-12,-12,24,24,[green,blue,amber][row],5);actors.push(g);}lanes.push(actors);});
    return(t)=>{lanes.forEach((actors,row)=>actors.forEach((g,i)=>{const q=out(phase(t,.02+i*p.itemFraction*levels[row],p.itemFraction));pose(g,200+i*53+p.travel*q,85+row*76);attr(g,{opacity:.2+.8*q});}));scene.label.textContent=t<1?'相同动作，不同接力 / each lane uses a different onset overlap':'全部到达 / serial, half and simultaneous lanes complete';};
  });

  add('basic.speed-ramp-hit', '速度递增并命中 / Speed ramp into contact', {
    approachFraction:number(.5,.7),power:number(2.5,5),travel:number(240,360),recoil:number(8,24)
  },(scene,p)=>{
    const start=140,target=start+p.travel,actor=group(scene.root);circle(actor,0,0,22);
    const obstacle=group(scene.root);box(obstacle,0,-50,20,100,amber,4);
    const streaks=[line(scene.root,0,0,0,0,blue,3),line(scene.root,0,0,0,0,blue,2)];
    guide(scene.root,105,226,555,226);
    return(t)=>{
      const q=phase(t,.03,p.approachFraction),contact=phase(t,.03+p.approachFraction,.22),progress=q ** p.power,reaction=p.recoil*Math.sin(Math.PI*contact)*(1-contact);
      const x=start+(p.travel-22)*progress-reaction*.35;pose(actor,x,174,0,1+.12*pulse(t,.03+p.approachFraction,.12),1-.12*pulse(t,.03+p.approachFraction,.12));pose(obstacle,target+reaction,174);
      const speed=q<1?q ** (p.power-1):0;streaks.forEach((node,i)=>attr(node,{x1:x-30-55*speed,y1:165+i*17,x2:x-30,y2:165+i*17,opacity:speed*.8}));
      scene.label.textContent=q<1?'递增间距 / power-law speed ramp':contact<1?'命中响应 / obstacle recoils only after contact':'命中结束 / static touching geometry, no lingering shake';
    };
  });

  add('basic.reading-hold', '到位后留出阅读 / Reading hold', {
    enterSeconds:number(.3,.8),charactersPerSecond:number(5,12),minimumHoldSeconds:number(.8,2)
  },(scene,p,options)=>{
    const text=options.text||'阅读结果 / Read the result',count=Array.from(text).length,holdSeconds=Math.max(p.minimumHoldSeconds,count/p.charactersPerSecond);
    const actor=group(scene.root);box(actor,-230,-44,460,88,green,12);label(actor,-208,6,text,18);
    const bar=box(scene.root,90,225,1,8,blue,4);label(scene.root,90,211,`${holdSeconds.toFixed(1)} s authored reading hold`,14);
    return(t)=>{const seconds=t*(p.enterSeconds+holdSeconds),q=out(clamp(seconds/p.enterSeconds)),hold=clamp((seconds-p.enterSeconds)/holdSeconds);pose(actor,320,mix(183,145,q));attr(actor,{opacity:q});attr(bar,{width:460*hold});scene.label.textContent=q<1?'进入 / content becomes readable':`阅读停留 / ${Math.round(hold*holdSeconds*10)/10} of ${holdSeconds.toFixed(1)} s · content stays present`;};
  });

  add('basic.snap-then-hold', '快速到位后停住 / Snap then hold', {
    snapFraction:number(.025,.12),travel:number(110,260),holdMarkerSize:number(18,32)
  },(scene,p)=>{
    const actor=group(scene.root);box(actor,-36,-26,72,52,green,10);label(actor,-21,5,'结果',15);
    const ticks=[];for(let i=0;i<5;i+=1)ticks.push(box(scene.root,220+i*43,218,p.holdMarkerSize,5,'#41535d',2));
    return(t)=>{const q=phase(t,0,p.snapFraction),snap=q===1?1:1-2 ** (-10*q);pose(actor,320-p.travel*(1-snap),150);ticks.forEach((tick,i)=>attr(tick,{fill:t>=p.snapFraction+(1-p.snapFraction)*i/5?blue:'#41535d'}));scene.label.textContent=q<1?'快速到位 / short exponential arrival':'结果停住 / geometry holds for the rest of the timeline';};
  });

  function makeStagger(scene,p,rankFor,grid) {
    const actors=[],ranks=[];
    for(let i=0;i<p.count;i+=1){const g=group(scene.root);box(g,-15,-15,30,30,green,7);label(g,-4,5,String(i+1),12);actors.push(g);ranks.push(rankFor(i));}
    return(t)=>{actors.forEach((g,i)=>{const q=out(phase(t,.04+ranks[i]*p.staggerFraction,p.itemFraction)),col=grid?i%5:i,row=grid?Math.floor(i/5):0,x=grid?220+col*p.gap:320+(i-(p.count-1)/2)*p.gap,y=grid?102+row*55:150;pose(g,x,y+p.travel*(1-q));attr(g,{opacity:q});});scene.label.textContent=t<1?'排名决定起点 / onset = rank × stagger, item identity retained':'全部呈现 / every rank completed and readable';};
  }
  add('basic.ranked-stagger', '明确排序的错峰 / Ranked stagger', {
    order:['sequential','center','edges','grid-diagonal'],count:integer(5,15),gap:number(32,38),staggerFraction:number(.014,.03),itemFraction:number(.16,.28),travel:number(24,64)
  },(scene,p)=>{
    const center=(p.count-1)/2;
    const rankFor=p.order==='sequential'?(i)=>i:p.order==='center'?(i)=>Math.abs(i-center):p.order==='edges'?(i)=>center-Math.abs(i-center):(i)=>(i%5)+Math.floor(i/5);
    return makeStagger(scene,p,rankFor,p.order==='grid-diagonal');
  });
  add('basic.seeded-stagger', '固定乱序错峰 / Seeded stagger', {
    seed:integer(1,65535),count:integer(5,12),gap:number(34,42),staggerFraction:number(.014,.035),itemFraction:number(.16,.28),travel:number(24,64)
  },(scene,p)=>{
    const permutation=Array.from({length:p.count},(_,i)=>i).sort((a,b)=>hash(p.seed,a)-hash(p.seed,b)||a-b),ranks=[];permutation.forEach((item,rank)=>{ranks[item]=rank;});
    return makeStagger(scene,p,(i)=>ranks[i],false);
  });

  add('basic.frame-quantization', '一拍一格、二格与三格 / Ones, twos and threes', {
    fps:integer(12,30),durationSeconds:number(1,2),travel:number(230,360),lift:number(25,55)
  },(scene,p)=>{
    const actors=[],frames=Math.floor(p.fps*p.durationSeconds);
    [1,2,3].forEach((step,i)=>{label(scene.root,65,58+i*76,`${step} 格 / ${step===1?'ONES':step===2?'TWOS':'THREES'}`,14);const g=group(scene.root);box(g,-16,-16,32,32,[green,blue,amber][i],8);actors.push(g);guide(scene.root,165,87+i*76,165+p.travel,87+i*76);});
    return(t)=>{actors.forEach((g,i)=>{const step=i+1,q=t===1?1:Math.floor(t*frames/step)*step/frames;pose(g,165+p.travel*q,87+i*76-p.lift*Math.sin(Math.PI*q),20*Math.sin(Math.PI*q));});scene.label.textContent=t<1?'采样保持 / same trajectory, different held frame intervals':'末格相同 / endpoint stays exact even when frame count is indivisible';};
  });

  function spiralRanks(rows,columns) {
    const order=[],seen=new Set();let row=Math.floor((rows-1)/2),col=Math.floor((columns-1)/2),length=1,direction=0;
    const directions=[[0,1],[1,0],[0,-1],[-1,0]];
    const visit=()=>{if(row>=0&&row<rows&&col>=0&&col<columns&&!seen.has(row*columns+col)){seen.add(row*columns+col);order.push(row*columns+col);}};
    visit();while(order.length<rows*columns){for(let repeat=0;repeat<2;repeat+=1){const d=directions[direction%4];for(let i=0;i<length;i+=1){row+=d[0];col+=d[1];visit();}direction+=1;}length+=1;}
    const ranks=[];order.forEach((index,rank)=>{ranks[index]=rank;});return ranks;
  }

  add('basic.ordered-grid-reveal', '二维排序与形变入场 / Ordered grid reveal', {
    order:['center','diagonal','row-sweep','spiral','wave'],rows:integer(3,5),columns:integer(3,7),gap:number(40,48),staggerFraction:number(.006,.013),itemFraction:number(.18,.28),travel:number(24,52)
  },(scene,p)=>{
    const cells=[],cx=(p.columns-1)/2,cy=(p.rows-1)/2,spiral=p.order==='spiral'?spiralRanks(p.rows,p.columns):null;
    for(let i=0;i<p.rows*p.columns;i+=1){const g=group(scene.root);box(g,-14,-14,28,28,i%2?blue:green,6);label(g,-4,4,String(i+1),10);cells.push(g);}
    return(t)=>{
      cells.forEach((cell,i)=>{
        const row=Math.floor(i/p.columns),col=i%p.columns,x=320+(col-cx)*p.gap,y=145+(row-cy)*p.gap;
        let rank,q,px=x,py=y,angle=0,scale=1;
        if(p.order==='center'){rank=Math.hypot(col-cx,row-cy);q=phase(t,.04+rank*p.staggerFraction*3,p.itemFraction);scale=back(q);px=x-(col-cx)*p.travel*(1-out(q))/3;py=y-(row-cy)*p.travel*(1-out(q))/3;}
        else if(p.order==='diagonal'){rank=row+col;q=phase(t,.04+rank*p.staggerFraction*2,p.itemFraction);py=y+p.travel*(1-quartOut(q));scale=mix(.85,1,quartOut(q));}
        else if(p.order==='row-sweep'){rank=row;q=phase(t,.04+rank*p.staggerFraction*5,p.itemFraction);px=x-p.travel*(1-cubic(q));}
        else if(p.order==='spiral'){rank=spiral[i];q=phase(t,.04+rank*p.staggerFraction,p.itemFraction);scale=back(q);angle=90*(1-out(q));px=x+p.travel*Math.cos(rank*Math.PI/2)*(1-out(q));py=y+p.travel*.35*Math.sin(rank*Math.PI/2)*(1-out(q));}
        else{rank=col;q=phase(t,.04+rank*p.staggerFraction*3,p.itemFraction);py=y-p.travel*Math.sin(Math.PI*q);scale=1+.18*Math.sin(Math.PI*q);}
        pose(cell,px,py,angle,scale);attr(cell,{opacity:q});
      });
      scene.label.textContent=t<1?`${p.order} / geometric rank drives onset and local pose`:`${p.rows} × ${p.columns} 网格完整 / identity and final cells preserved`;
    };
  });

  add('basic.seeded-grid-shuffle', '固定散位归整网格 / Seeded shuffle to grid', {
    rows:integer(3,5),columns:integer(3,7),seed:integer(1,65535),scatter:number(55,100),rotation:number(25,70),itemFraction:number(.45,.68)
  },(scene,p)=>{
    const cells=[],from=[],cx=(p.columns-1)/2,cy=(p.rows-1)/2;
    for(let i=0;i<p.rows*p.columns;i+=1){const g=group(scene.root);box(g,-14,-14,28,28,i%2?blue:green,6);label(g,-4,4,String(i+1),10);cells.push(g);from.push([2*hash(p.seed,i)-1,2*hash(p.seed+71,i)-1,2*hash(p.seed+139,i)-1]);}
    return(t)=>{cells.forEach((g,i)=>{const q=inOutBack(phase(t,.04+(i%3)*.03,p.itemFraction)),x=320+(i%p.columns-cx)*43,y=145+(Math.floor(i/p.columns)-cy)*43,v=from[i],startX=Math.max(36,Math.min(604,x+v[0]*p.scatter)),startY=Math.max(36,Math.min(248,y+v[1]*p.scatter));pose(g,mix(startX,x,q),mix(startY,y,q),v[2]*p.rotation*(1-q));attr(g,{opacity:1});});scene.label.textContent=t<1?'保留身份归位 / deterministic scattered positions converge to assigned cells':'网格已排序 / every numbered cell reaches its original target';};
  });

  add('basic.ordered-list-reveal', '列表接力与分向入场 / Ordered list reveal', {
    treatment:['stagger','cascade','alternate','stack'],count:integer(4,6),rowWidth:number(210,320),gap:number(32,38),staggerFraction:number(.035,.065),itemFraction:number(.25,.38),travel:number(30,65)
  },(scene,p)=>{
    const rows=[];
    for(let i=0;i<p.count;i+=1){const g=group(scene.root);box(g,-p.rowWidth/2,-13,p.rowWidth,26,i%2?blue:green,6);label(g,-p.rowWidth/2+12,5,`项目 ${i+1} / Item ${i+1}`,13);rows.push(g);}
    return(t)=>{
      rows.forEach((g,i)=>{const q=phase(t,.03+i*p.staggerFraction,p.itemFraction),e=p.treatment==='cascade'?quartOut(q):out(q),targetY=145+(i-(p.count-1)/2)*p.gap;let x=320,y=targetY,angle=0;
        if(p.treatment==='stagger')y+=p.travel*(1-e);
        else if(p.treatment==='cascade'){y+=p.travel*(1-e);angle=(i-(p.count-1)/2)*3*Math.sin(Math.PI*q);}
        else if(p.treatment==='alternate')x+=(i%2?1:-1)*p.travel*(1-e);
        else{y=mix(205-i*5,targetY,e);x-=p.travel*(1-e);}
        pose(g,x,y,angle);attr(g,{opacity:q});
      });
      scene.label.textContent=t<1?`${p.treatment} / row identity retained throughout entrance`:'列表完整 / row positions and text are settled';
    };
  });

  add('basic.row-height-expansion', '真实行高变化与后续位移 / Row height expansion', {
    count:integer(4,6),collapsedHeight:number(18,26),expandedHeight:number(31,34),gap:number(5,8),staggerFraction:number(.035,.065),itemFraction:number(.28,.4)
  },(scene,p)=>{
    const rows=[],texts=[];
    for(let i=0;i<p.count;i+=1){rows.push(box(scene.root,175,0,290,p.collapsedHeight,i%2?blue:green,6));texts.push(label(scene.root,188,0,`第 ${i+1} 行 / Row ${i+1}`,13));}
    return(t)=>{
      const heights=rows.map((_,i)=>{const q=phase(t,.03+i*p.staggerFraction,p.itemFraction);return mix(p.collapsedHeight,p.expandedHeight,back(q));}),total=heights.reduce((sum,h)=>sum+h,0)+(p.count-1)*p.gap;
      let top=135-total/2;rows.forEach((node,i)=>{attr(node,{y:top,height:heights[i]});attr(texts[i],{y:top+heights[i]/2+4});top+=heights[i]+p.gap;});
      scene.label.textContent=t<1?'重算行位置 / genuine rectangle height changes, text does not scale':'行已展开 / expanded geometry and unscaled labels remain readable';
    };
  });

  add('basic.trim-collapse-reflow', '边缘裁去与剩余重排 / Trim collapse and survivor reflow', {
    count:integer(5,7),trimCount:integer(1,2),rowHeight:number(23,27),gap:number(6,9),trimFraction:number(.28,.42),collapseFraction:number(.22,.36)
  },(scene,p)=>{
    const rows=[],texts=[];
    for(let i=0;i<p.count;i+=1){rows.push(box(scene.root,175,0,290,p.rowHeight,i%2?blue:green,5));texts.push(label(scene.root,188,0,`保留身份 ${i+1} / ID ${i+1}`,12));}
    const isTrimmed=(i)=>i<p.trimCount||i>=p.count-p.trimCount,remaining=p.count-p.trimCount*2;
    return(t)=>{
      const trim=quartOut(phase(t,.03,p.trimFraction)),collapse=out(phase(t,.03+p.trimFraction,p.collapseFraction));
      const fullHeight=p.count*(p.rowHeight+p.gap)-p.gap,finalHeight=remaining*(p.rowHeight+p.gap)-p.gap;
      rows.forEach((node,i)=>{
        const removed=isTrimmed(i),initialY=145-fullHeight/2+i*(p.rowHeight+p.gap),finalY=145-finalHeight/2+(i-p.trimCount)*(p.rowHeight+p.gap),y=removed?initialY:mix(initialY,finalY,collapse),width=removed?290*(1-trim):290;
        attr(node,{x:320-width/2,y,width,opacity:removed?1-trim:1});attr(texts[i],{x:188,y:y+p.rowHeight/2+4,opacity:removed?1-trim:1});
      });
      scene.label.textContent=trim<1?'裁去边缘 / end rows trim before layout closes':collapse<1?'剩余行归整 / only survivors reflow':`${remaining} 行保留 / survivor IDs remain readable in compact layout`;
    };
  });

  return recipes;
}


function buildPathsRecipes() {
  const recipes = {};
  const tau = Math.PI * 2;
  const ink = '#d9e8f0';
  const muted = '#526678';
  const mint = '#65c7b0';
  const coral = '#ffad92';

  function cubicAt(segment, u, result) {
    const v = 1 - u;
    const a = v * v * v;
    const b = 3 * v * v * u;
    const c = 3 * v * u * u;
    const d = u * u * u;
    result[0] = a * segment[0] + b * segment[2] + c * segment[4] + d * segment[6];
    result[1] = a * segment[1] + b * segment[3] + c * segment[5] + d * segment[7];
    const dx = 3 * v * v * (segment[2] - segment[0]) + 6 * v * u * (segment[4] - segment[2]) + 3 * u * u * (segment[6] - segment[4]);
    const dy = 3 * v * v * (segment[3] - segment[1]) + 6 * v * u * (segment[5] - segment[3]) + 3 * u * u * (segment[7] - segment[5]);
    result[2] = Math.atan2(dy, dx) * 180 / Math.PI;
  }

  function routePath(segments) {
    let d = 'M' + segments[0][0] + ' ' + segments[0][1];
    for (const segment of segments) d += ' C' + segment[2] + ' ' + segment[3] + ' ' + segment[4] + ' ' + segment[5] + ' ' + segment[6] + ' ' + segment[7];
    return d;
  }

  // Fixed sampling belongs to create, not seek; no native getTotalLength dependency.
  function routeSampler(segments) {
    const steps = 96;
    const count = segments.length * steps;
    const distances = new Float64Array(count + 1);
    const point = new Float64Array(3);
    cubicAt(segments[0], 0, point);
    let lastX = point[0];
    let lastY = point[1];
    for (let i = 1; i <= count; i++) {
      const segmentIndex = Math.floor((i - 1) / steps);
      cubicAt(segments[segmentIndex], (i - segmentIndex * steps) / steps, point);
      distances[i] = distances[i - 1] + Math.hypot(point[0] - lastX, point[1] - lastY);
      lastX = point[0];
      lastY = point[1];
    }
    const length = distances[count];
    return {
      length,
      sample(fraction, result) {
        if (fraction <= 0) return cubicAt(segments[0], 0, result);
        if (fraction >= 1) return cubicAt(segments[segments.length - 1], 1, result);
        const wanted = length * fraction;
        let low = 0;
        let high = count;
        while (high - low > 1) {
          const middle = (low + high) >>> 1;
          if (distances[middle] <= wanted) low = middle;
          else high = middle;
        }
        const position = (low + (wanted - distances[low]) / (distances[high] - distances[low])) / steps;
        const segmentIndex = Math.min(segments.length - 1, Math.floor(position));
        cubicAt(segments[segmentIndex], position - segmentIndex, result);
      }
    };
  }

  function resourceRenderer(render, defs) {
    return { render, dispose() { defs.remove(); } };
  }

  recipes['basic.noise-blob'] = descriptor('basic.noise-blob', '噪声轮廓 / Noise contour', {
    radius: { min: 50, max: 92 },
    amplitude: { min: 2, max: 22 },
    points: { min: 8, max: 24, integer: true },
    cycles: { min: 1, max: 3, integer: true }
  }, (scene, p, options) => {
    const outline = svgNode('path', { fill: mint, stroke: ink, 'stroke-width': 2 }, scene.root);
    const xs = new Float64Array(p.points);
    const ys = new Float64Array(p.points);
    const cosines = new Float64Array(p.points);
    const sines = new Float64Array(p.points);
    const knots = 8;
    const noise = new Float64Array(p.points * knots);
    const seed = Number(options.seed) >>> 0;
    function hash(index) {
      let value = (seed ^ Math.imul(index + 1, 2654435761)) >>> 0;
      value ^= value >>> 16;
      value = Math.imul(value, 2246822507);
      value ^= value >>> 13;
      value = Math.imul(value, 3266489909);
      value ^= value >>> 16;
      return (value >>> 0) / 4294967296 * 2 - 1;
    }
    for (let i = 0; i < p.points; i++) {
      cosines[i] = Math.cos(i / p.points * tau);
      sines[i] = Math.sin(i / p.points * tau);
      for (let k = 0; k < knots; k++) noise[i * knots + k] = hash(i * knots + k);
    }
    return t => {
      const phase = (t * p.cycles % 1) * knots;
      const index = Math.floor(phase);
      const blend = smooth(phase - index);
      for (let i = 0; i < p.points; i++) {
        const displacement = mix(noise[i * knots + index], noise[i * knots + (index + 1) % knots], blend);
        const radius = p.radius + displacement * p.amplitude;
        xs[i] = 320 + radius * cosines[i];
        ys[i] = 132 + radius * sines[i];
      }
      let d = 'M' + xs[0] + ' ' + ys[0];
      for (let i = 0; i < p.points; i++) {
        const previous = (i + p.points - 1) % p.points;
        const next = (i + 1) % p.points;
        const after = (i + 2) % p.points;
        d += ' C' + (xs[i] + (xs[next] - xs[previous]) / 6) + ' ' + (ys[i] + (ys[next] - ys[previous]) / 6);
        d += ' ' + (xs[next] - (xs[after] - xs[i]) / 6) + ' ' + (ys[next] - (ys[after] - ys[i]) / 6);
        d += ' ' + xs[next] + ' ' + ys[next];
      }
      attr(outline, { d: d + ' Z' });
      scene.label.textContent = t === 1 ? '轮廓定格 · Contour held' : '径向噪声改变边界 · Boundary changes, center stays fixed';
    };
  });

  recipes['basic.radial-burst'] = descriptor('basic.radial-burst', '放射线展开 / Radial burst', {
    rays: { min: 6, max: 24, integer: true },
    innerRadius: { min: 12, max: 28 },
    reach: { min: 40, max: 102 },
    strokeWidth: { min: 1, max: 6 }
  }, (scene, p) => {
    const rays = [];
    const directions = new Float64Array(p.rays * 2);
    svgNode('circle', { cx: 320, cy: 132, r: p.innerRadius - 5, fill: mint }, scene.root);
    for (let i = 0; i < p.rays; i++) {
      const angle = i / p.rays * tau - Math.PI / 2;
      directions[i * 2] = Math.cos(angle);
      directions[i * 2 + 1] = Math.sin(angle);
      rays.push(svgNode('line', { stroke: coral, 'stroke-width': p.strokeWidth, 'stroke-linecap': 'round' }, scene.root));
    }
    return t => {
      const head = p.innerRadius + p.reach * out(clamp(t / 0.7));
      const tail = p.innerRadius + p.reach * 0.28 * out(clamp((t - 0.18) / 0.7));
      for (let i = 0; i < p.rays; i++) attr(rays[i], {
        x1: 320 + directions[i * 2] * tail,
        y1: 132 + directions[i * 2 + 1] * tail,
        x2: 320 + directions[i * 2] * head,
        y2: 132 + directions[i * 2 + 1] * head,
        opacity: t === 0 ? 0 : 1
      });
      scene.label.textContent = t === 1 ? '确认标记展开完成 · Acknowledgement rays held' : '线段头尾分段向外展开 · Ray tips lead, tails follow';
    };
  });

  recipes['basic.marching-dashes'] = descriptor('basic.marching-dashes', '边界虚线行进 / Marching boundary dashes', {
    dashLength: { min: 10, max: 80 },
    gapLength: { min: 6, max: 45 },
    cycles: { min: 1, max: 4, integer: true },
    strokeWidth: { min: 2, max: 7 }
  }, (scene, p) => {
    const d = 'M184 62 H456 C478 62 492 76 492 98 V180 C492 202 478 216 456 216 H184 C162 216 148 202 148 180 V98 C148 76 162 62 184 62 Z';
    svgNode('path', { d, fill: 'none', stroke: muted, 'stroke-width': 1 }, scene.root);
    const boundary = svgNode('path', {
      d, fill: 'none', stroke: mint, 'stroke-width': p.strokeWidth,
      pathLength: 1000, 'stroke-dasharray': p.dashLength + ' ' + p.gapLength
    }, scene.root);
    label(scene.root, 222, 146, '选区 / Selection', 24);
    return t => {
      attr(boundary, { 'stroke-dashoffset': -(p.dashLength + p.gapLength) * p.cycles * t });
      scene.label.textContent = t === 1 ? '选区仍有效；边界静止 · Selection remains, boundary held' : '只移动虚线相位，不移动选区 · Dash phase moves, selection stays';
    };
  });

  recipes['basic.radial-repeater'] = descriptor('basic.radial-repeater', '径向复制展开 / Radial clone deployment', {
    count: { min: 6, max: 18, integer: true },
    radius: { min: 55, max: 98 },
    twistDegrees: { min: -90, max: 90 },
    stagger: { min: 0, max: 0.45 },
    bladeLength: { min: 14, max: 38 }
  }, (scene, p) => {
    const copies = [];
    svgNode('circle', { cx: 320, cy: 132, r: 18, fill: '#203545', stroke: ink, 'stroke-width': 2 }, scene.root);
    for (let i = 0; i < p.count; i++) {
      const copy = svgNode('g', {}, scene.root);
      box(copy, -p.bladeLength / 2, -5, p.bladeLength, 10, i % 2 ? coral : mint, 5);
      copies.push(copy);
    }
    return t => {
      for (let i = 0; i < p.count; i++) {
        const delay = i / (p.count - 1) * p.stagger;
        const q = smooth(clamp((t - delay) / (1 - p.stagger)));
        const angle = i / p.count * 360 - 90 + p.twistDegrees * (1 - q);
        const radians = angle * Math.PI / 180;
        pose(copies[i], 320 + p.radius * q * Math.cos(radians), 132 + p.radius * q * Math.sin(radians), angle);
        attr(copies[i], { opacity: q === 0 ? 0 : 1 });
      }
      scene.label.textContent = t === 1 ? p.count + ' 个复制件形成完整环 · Radial arrangement complete' : '各复制件错峰进入径向位置 · Copies deploy with authored phase offsets';
    };
  });

  recipes['basic.gooey-merge'] = descriptor('basic.gooey-merge', '液滴黏连 / Gooey alpha merge', {
    dropletRadius: { min: 18, max: 44 },
    separation: { min: 90, max: 180 },
    blurRadius: { min: 3, max: 12 },
    alphaThreshold: { min: 0.3, max: 0.65 }
  }, (scene, p) => {
    const defs = svgNode('defs', {}, scene.svg);
    const id = scene.uid + '-paths-goo';
    const filter = svgNode('filter', {
      id, filterUnits: 'userSpaceOnUse', x: 120, y: 20, width: 400, height: 230,
      'color-interpolation-filters': 'sRGB'
    }, defs);
    svgNode('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: p.blurRadius, result: 'soft' }, filter);
    svgNode('feColorMatrix', {
      in: 'soft', type: 'matrix', result: 'neck',
      values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 ' + (-18 * p.alphaThreshold)
    }, filter);
    svgNode('feComposite', { in: 'SourceGraphic', in2: 'neck', operator: 'over' }, filter);
    const droplets = svgNode('g', { filter: 'url(#' + id + ')' }, scene.root);
    const left = svgNode('circle', { cy: 132, r: p.dropletRadius, fill: mint }, droplets);
    const right = svgNode('circle', { cy: 132, r: p.dropletRadius, fill: mint }, droplets);
    return resourceRenderer(t => {
      const distance = p.separation * (1 - smooth(clamp(t / 0.82)));
      attr(left, { cx: 320 - distance / 2 });
      attr(right, { cx: 320 + distance / 2 });
      scene.label.textContent = t >= 0.82 ? '两滴合为一个稳定轮廓 · Merged silhouette held' : '模糊后的透明度阈值形成连接颈 · Alpha threshold builds a neck';
    }, defs);
  });

  recipes['basic.gradient-flow'] = descriptor('basic.gradient-flow', '渐变材质流动 / Repeating gradient flow', {
    periodWidth: { min: 65, max: 210 },
    angleDegrees: { min: -40, max: 40 },
    cycles: { min: 1, max: 4, integer: true }
  }, (scene, p) => {
    const defs = svgNode('defs', {}, scene.svg);
    const id = scene.uid + '-paths-flow';
    const gradient = svgNode('linearGradient', {
      id, gradientUnits: 'userSpaceOnUse', spreadMethod: 'repeat',
      x1: 0, y1: 0, x2: p.periodWidth, y2: 0
    }, defs);
    svgNode('stop', { offset: 0, 'stop-color': mint }, gradient);
    svgNode('stop', { offset: 0.35, 'stop-color': '#74a9ff' }, gradient);
    svgNode('stop', { offset: 0.7, 'stop-color': '#c79fe7' }, gradient);
    svgNode('stop', { offset: 1, 'stop-color': mint }, gradient);
    svgNode('path', {
      d: 'M143 99 C153 64 213 51 255 88 C293 122 326 132 378 98 C427 65 479 88 495 116 C516 155 465 205 424 181 C381 157 343 170 304 201 C260 235 186 202 166 163 C153 138 134 128 143 99 Z',
      fill: 'url(#' + id + ')', stroke: ink, 'stroke-width': 2
    }, scene.root);
    return resourceRenderer(t => {
      attr(gradient, { gradientTransform: 'rotate(' + p.angleDegrees + ' 320 132) translate(' + (-p.periodWidth * p.cycles * t) + ' 0)' });
      scene.label.textContent = t === 1 ? '材质定格；实体形状不变 · Material held, silhouette unchanged' : '渐变坐标平移，路径几何不变 · Gradient coordinates move inside fixed geometry';
    }, defs);
  });

  recipes['basic.mask-reveal'] = descriptor('basic.mask-reveal', '圆形蒙版揭示 / Radial alpha-mask reveal', {
    originX: { min: 100, max: 540 },
    originY: { min: 50, max: 210 },
    edgeSoftness: { min: 0, max: 0.3 },
    drawFraction: { min: 0.5, max: 0.95 }
  }, (scene, p) => {
    const defs = svgNode('defs', {}, scene.svg);
    const maskId = scene.uid + '-paths-reveal';
    const edgeId = scene.uid + '-paths-mask-edge';
    const edge = svgNode('radialGradient', { id: edgeId }, defs);
    svgNode('stop', { offset: 0, 'stop-color': '#ffffff', 'stop-opacity': 1 }, edge);
    svgNode('stop', { offset: 1 - p.edgeSoftness, 'stop-color': '#ffffff', 'stop-opacity': 1 }, edge);
    svgNode('stop', { offset: 1, 'stop-color': '#ffffff', 'stop-opacity': 0 }, edge);
    const mask = svgNode('mask', {
      id: maskId, maskUnits: 'userSpaceOnUse', maskContentUnits: 'userSpaceOnUse',
      x: 120, y: 55, width: 400, height: 170, 'mask-type': 'alpha'
    }, defs);
    const opening = svgNode('circle', { cx: p.originX, cy: p.originY, r: 0, fill: 'url(#' + edgeId + ')' }, mask);
    const content = svgNode('g', { mask: 'url(#' + maskId + ')' }, scene.root);
    box(content, 140, 70, 360, 140, '#d9e8f0', 16);
    box(content, 161, 93, 44, 44, mint, 10);
    svgNode('path', { d: 'M173 114 L181 122 L194 105', fill: 'none', stroke: '#173847', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, content);
    const heading = label(content, 222, 116, '已就绪 / Ready', 24);
    attr(heading, { fill: '#173847' });
    svgNode('path', { d: 'M163 181 L219 169 L274 184 L330 157 L389 167 L473 143', fill: 'none', stroke: '#37746c', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, content);
    const farX = Math.max(Math.abs(140 - p.originX), Math.abs(500 - p.originX));
    const farY = Math.max(Math.abs(70 - p.originY), Math.abs(210 - p.originY));
    const finalRadius = Math.hypot(farX, farY) * 1.01 / (1 - p.edgeSoftness);
    return resourceRenderer(t => {
      const q = smooth(clamp(t / p.drawFraction));
      attr(opening, { r: finalRadius * q, opacity: q === 0 ? 0 : 1 });
      scene.label.textContent = q === 1 ? '内容完整可见 · Full content visible' : '蒙版覆盖率 ' + Math.round(q * 100) + '% · Mask coverage expands';
    }, defs);
  });

  recipes['basic.cubic-path-follow'] = descriptor('basic.cubic-path-follow', '曲线路径跟随 / Distance-based cubic path following', {
    bend: { min: -95, max: 95 },
    markerSize: { min: 8, max: 22 }
  }, (scene, p) => {
    const segments = [[90, 180, 200, 155 - p.bend, 440, 155 + p.bend, 550, 95]];
    const sampler = routeSampler(segments);
    svgNode('path', { d: routePath(segments), fill: 'none', stroke: muted, 'stroke-width': 4, 'stroke-dasharray': '6 8' }, scene.root);
    svgNode('circle', { cx: 90, cy: 180, r: 7, fill: ink }, scene.root);
    svgNode('circle', { cx: 550, cy: 95, r: 27, fill: 'none', stroke: ink, 'stroke-width': 2 }, scene.root);
    const marker = svgNode('g', {}, scene.root);
    svgNode('path', { d: 'M' + p.markerSize + ' 0 L' + (-p.markerSize * 0.8) + ' ' + (-p.markerSize * 0.65) + ' L' + (-p.markerSize * 0.45) + ' 0 L' + (-p.markerSize * 0.8) + ' ' + (p.markerSize * 0.65) + ' Z', fill: mint, stroke: ink, 'stroke-width': 1.5 }, marker);
    const point = new Float64Array(3);
    return t => {
      sampler.sample(t, point);
      pose(marker, point[0], point[1], point[2]);
      scene.label.textContent = t === 1 ? '已抵达目标 · Marker at destination' : '路径距离 ' + Math.round(t * 100) + '% · Tangent sets heading';
    };
  });

  recipes['basic.control-point-morph'] = descriptor('basic.control-point-morph', '控制点形变 / Corresponding cubic control-point morph', {
    startRadius: { min: 55, max: 95 },
    outerRadius: { min: 75, max: 100 },
    innerRadius: { min: 25, max: 60 },
    roundness: { min: 0.1, max: 1 },
    morphFraction: { min: 0.5, max: 0.95 }
  }, (scene, p) => {
    const count = 8;
    const circle = new Float64Array(count * 6);
    const target = new Float64Array(count * 6);
    const targetX = new Float64Array(count);
    const targetY = new Float64Array(count);
    const handles = 4 / 3 * Math.tan(Math.PI / (count * 2)) * p.startRadius;
    for (let i = 0; i < count; i++) {
      const angle = i / count * tau - Math.PI / 2;
      const radius = i % 2 ? p.innerRadius : p.outerRadius;
      targetX[i] = radius * Math.cos(angle);
      targetY[i] = radius * Math.sin(angle);
      const nextAngle = (i + 1) / count * tau - Math.PI / 2;
      circle[i * 6] = p.startRadius * Math.cos(angle) - handles * Math.sin(angle);
      circle[i * 6 + 1] = p.startRadius * Math.sin(angle) + handles * Math.cos(angle);
      circle[i * 6 + 2] = p.startRadius * Math.cos(nextAngle) + handles * Math.sin(nextAngle);
      circle[i * 6 + 3] = p.startRadius * Math.sin(nextAngle) - handles * Math.cos(nextAngle);
      circle[i * 6 + 4] = p.startRadius * Math.cos(nextAngle);
      circle[i * 6 + 5] = p.startRadius * Math.sin(nextAngle);
    }
    for (let i = 0; i < count; i++) {
      const previous = (i + count - 1) % count;
      const next = (i + 1) % count;
      const after = (i + 2) % count;
      target[i * 6] = targetX[i] + (targetX[next] - targetX[previous]) * p.roundness / 6;
      target[i * 6 + 1] = targetY[i] + (targetY[next] - targetY[previous]) * p.roundness / 6;
      target[i * 6 + 2] = targetX[next] - (targetX[after] - targetX[i]) * p.roundness / 6;
      target[i * 6 + 3] = targetY[next] - (targetY[after] - targetY[i]) * p.roundness / 6;
      target[i * 6 + 4] = targetX[next];
      target[i * 6 + 5] = targetY[next];
    }
    const group = svgNode('g', { transform: 'translate(320 132)' }, scene.root);
    const shape = svgNode('path', { fill: mint, stroke: ink, 'stroke-width': 2, 'stroke-linejoin': 'round' }, group);
    return t => {
      const q = smooth(clamp(t / p.morphFraction));
      let d = 'M' + mix(0, targetX[0], q) + ' ' + mix(-p.startRadius, targetY[0], q);
      for (let i = 0; i < count; i++) {
        d += ' C';
        for (let k = 0; k < 6; k++) d += (k ? ' ' : '') + mix(circle[i * 6 + k], target[i * 6 + k], q);
      }
      attr(shape, { d: d + ' Z' });
      scene.label.textContent = q === 1 ? '四尖轮廓已形成 · Four-point contour held' : '锚点与曲线把手一同插值 · Anchors and cubic handles interpolate';
    };
  });

  recipes['basic.signature-strokes'] = descriptor('basic.signature-strokes', '多笔书写 / Multi-stroke signature reveal', {
    strokeWidth: { min: 2, max: 7 },
    slantDegrees: { min: -12, max: 12 },
    penLiftFraction: { min: 0.02, max: 0.12 },
    finishHold: { min: 0.05, max: 0.25 }
  }, (scene, p) => {
    // Original ornamental mark, not a personal signature or an authorization action.
    const routes = [
      [[-172, 30, -148, -48, -104, -68, -118, -8], [-118, -8, -140, 68, -94, 56, -75, 8], [-75, 8, -44, -45, -10, -24, -30, 24], [-30, 24, -51, 59, -9, 65, 24, 13], [24, 13, 54, -32, 73, -9, 64, 24]],
      [[70, 8, 98, -24, 134, -24, 116, 14], [116, 14, 99, 50, 150, 42, 168, -10]],
      [[-152, 74, -68, 49, 49, 70, 178, 45]]
    ];
    const group = svgNode('g', { transform: 'translate(320 132) skewX(' + p.slantDegrees + ')' }, scene.root);
    const paths = [];
    const samplers = routes.map(routeSampler);
    const totalLength = samplers.reduce((sum, sampler) => sum + sampler.length, 0);
    const starts = new Float64Array(routes.length);
    const ends = new Float64Array(routes.length);
    const drawingTime = 1 - p.finishHold - (routes.length - 1) * p.penLiftFraction;
    let clock = 0;
    for (let i = 0; i < routes.length; i++) {
      starts[i] = clock;
      ends[i] = clock + drawingTime * samplers[i].length / totalLength;
      clock = ends[i] + p.penLiftFraction;
      paths.push(svgNode('path', {
        d: routePath(routes[i]), fill: 'none', stroke: mint, 'stroke-width': p.strokeWidth,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1000,
        'stroke-dasharray': '1000 1000'
      }, group));
    }
    const pen = svgNode('circle', { r: 5, fill: coral }, group);
    const point = new Float64Array(3);
    return t => {
      point.fill(0);
      let active = -1;
      let completed = 0;
      for (let i = 0; i < routes.length; i++) {
        const q = smooth(clamp((t - starts[i]) / (ends[i] - starts[i])));
        attr(paths[i], { 'stroke-dashoffset': 1000 * (1 - q), opacity: q === 0 ? 0 : 1 });
        if (q === 1) completed++;
        if (t >= starts[i] && t < ends[i]) {
          active = i;
          samplers[i].sample(q, point);
        }
      }
      attr(pen, { cx: point[0], cy: point[1], opacity: active === -1 ? 0 : 1 });
      scene.label.textContent = completed === routes.length ? '三笔及收尾完成 · Three strokes complete' : active === -1 ? '抬笔，已完成 ' + completed + ' 笔 · Pen lifted' : '正在书写第 ' + (active + 1) + ' 笔 · Stroke ' + (active + 1) + ' of 3';
    };
  });

  recipes['basic.contour-stroke-draw'] = descriptor('basic.contour-stroke-draw', '单轮廓绘制 / Single-contour stroke drawing', {
    width: { min: 150, max: 350 },
    height: { min: 100, max: 180 },
    strokeWidth: { min: 2, max: 7 },
    drawFraction: { min: 0.5, max: 0.95 }
  }, (scene, p) => {
    const x0 = 320 - p.width / 2;
    const x1 = 320 + p.width / 2;
    const y0 = 132 - p.height / 2;
    const y1 = 132 + p.height / 2;
    const d = 'M320 ' + y0 + ' L' + (x1 - 24) + ' ' + y0 + ' Q' + x1 + ' ' + y0 + ' ' + x1 + ' ' + (y0 + 24) + ' L' + x1 + ' ' + (y1 - 40) + ' Q' + x1 + ' ' + (y1 - 24) + ' ' + (x1 - 18) + ' ' + (y1 - 15) + ' L320 ' + y1 + ' L' + (x0 + 18) + ' ' + (y1 - 15) + ' Q' + x0 + ' ' + (y1 - 24) + ' ' + x0 + ' ' + (y1 - 40) + ' L' + x0 + ' ' + (y0 + 24) + ' Q' + x0 + ' ' + y0 + ' ' + (x0 + 24) + ' ' + y0 + ' Z';
    svgNode('path', { d, fill: 'none', stroke: muted, 'stroke-width': 1 }, scene.root);
    const outline = svgNode('path', {
      d, fill: 'none', stroke: mint, 'stroke-width': p.strokeWidth,
      pathLength: 1000, 'stroke-dasharray': '1000 1000', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }, scene.root);
    return t => {
      const q = out(clamp(t / p.drawFraction));
      attr(outline, { 'stroke-dashoffset': 1000 * (1 - q), opacity: q === 0 ? 0 : 1 });
      scene.label.textContent = q === 1 ? '完整边界已绘制 · Contour complete' : '已绘制路径 ' + Math.round(q * 100) + '% · One continuous contour';
    };
  });

  recipes['basic.path-segment-trim'] = descriptor('basic.path-segment-trim', '路径区段裁切 / Moving path segment trim', {
    segmentFraction: { min: 0.08, max: 0.4 },
    curveDepth: { min: 45, max: 115 },
    strokeWidth: { min: 3, max: 8 }
  }, (scene, p) => {
    const segments = [
      [88, 162, 157, 132 - p.curveDepth, 295, 132 - p.curveDepth, 320, 132],
      [320, 132, 345, 132 + p.curveDepth, 483, 132 + p.curveDepth, 552, 102]
    ];
    const d = routePath(segments);
    const sampler = routeSampler(segments);
    svgNode('path', { d, fill: 'none', stroke: muted, 'stroke-width': 2 }, scene.root);
    const segment = svgNode('path', {
      d, fill: 'none', stroke: mint, 'stroke-width': p.strokeWidth,
      pathLength: 1000, 'stroke-dasharray': p.segmentFraction * 1000 + ' 2000', 'stroke-linecap': 'round'
    }, scene.root);
    const startMarker = svgNode('circle', { r: 4, fill: coral }, scene.root);
    const endMarker = svgNode('circle', { r: 4, fill: ink }, scene.root);
    const startPoint = new Float64Array(3);
    const endPoint = new Float64Array(3);
    return t => {
      const start = (1 - p.segmentFraction) * t;
      const end = start + p.segmentFraction;
      attr(segment, { 'stroke-dashoffset': -start * 1000 });
      sampler.sample(start, startPoint);
      sampler.sample(end, endPoint);
      attr(startMarker, { cx: startPoint[0], cy: startPoint[1] });
      attr(endMarker, { cx: endPoint[0], cy: endPoint[1] });
      scene.label.textContent = '可见区段 ' + Math.round(start * 100) + '–' + Math.round(end * 100) + '% · Only this path interval is selected';
    };
  });

  return recipes;
}


  function buildTransformRecipes() {
    const recipes = {};
    const add = (slug, title, schema, make) => recipes[`basic.${slug}`] = descriptor(`basic.${slug}`, title, schema, make);
    const range = (min,max) => ({min,max});
    const tile = (scene, text) => {
      const g = svgNode('g',{},scene.root); box(g,-43,-27,86,54); label(g,-32,5,text,14).setAttribute('fill','#142332'); return g;
    };
    const caption = (scene,text) => { scene.label.textContent = text; };
    function plane(scene,text) {
      const fo = svgNode('foreignObject',{x:220,y:54,width:200,height:172},scene.root);
      const outer = scene.svg.ownerDocument.createElement('div');
      outer.style.cssText='width:200px;height:172px;display:grid;place-items:center;perspective:420px;perspective-origin:center';
      const card = scene.svg.ownerDocument.createElement('div');
      card.style.cssText='position:relative;width:112px;height:84px;transform-style:preserve-3d;transform-origin:center';
      const faces=[];
      for (let i=0;i<2;i++) {
        const face=scene.svg.ownerDocument.createElement('div');
        face.style.cssText=`position:absolute;inset:0;display:grid;place-items:center;border:2px solid #e7eff5;border-radius:12px;background:${i?'#bd98ee':'#65c7b0'};color:#142332;font:600 16px system-ui;backface-visibility:hidden;transform:rotateY(${i*180}deg)`;
        face.textContent=i?'B · 已确认':text; card.appendChild(face); faces.push(face);
      }
      outer.appendChild(card);fo.appendChild(outer);return {card,outer,faces};
    }
    add('translation-profile','位移速度与制动 / Travel profiles',{profile:['linear','smooth','anticipate','heavy-stop','momentum','magnetic'],distance:range(100,360)},(s,p)=>{
      const mover=tile(s,'目标 / Goal');
      const dock=svgNode('circle',{cx:320+p.distance/2,cy:140,r:32,fill:'none',stroke:'#60778d','stroke-width':2},s.root);
      const braking=svgNode('line',{x1:0,y1:-38,x2:0,y2:-55,stroke:'#f3c66d','stroke-width':4},mover);
      return t=>{
        let q=t,tilt=0;
        switch(p.profile) {
          case 'linear':q=t;break;
          case 'smooth':q=smooth(t);break;
          case 'anticipate':q=t<.18?-.12*Math.sin(t/.18*Math.PI/2):mix(-.12,1,out((t-.18)/.82));break;
          case 'heavy-stop':q=t<.7?(t/.7)*1.1:mix(1.1,1,smooth((t-.7)/.3));tilt=14*Math.sin(Math.PI*t)* (t<.7?1:-1);break;
          case 'momentum':q=(1-Math.exp(-4*t))/(1-Math.exp(-4));break;
          case 'magnetic':q=t<.55?.42*t/.55:mix(.42,1,out((t-.55)/.45));break;
        }
        pose(mover,320+p.distance*(q-.5),140,tilt);attr(braking,{opacity:p.profile==='heavy-stop'?Math.sin(Math.PI*t):0});attr(dock,{stroke:t===1?'#65c7b0':'#60778d'});
        caption(s,t===1?'位置已到达；逻辑目标独立于视觉 / Destination reached':`${p.profile}: position ${Math.round(q*100)}%`);
      };
    });
    add('geometric-travel','几何路线 / Geometric travel',{path:['arc','bezier','waypoints','zigzag'],distance:range(100,340),height:range(24,100)},(s,p)=>{
      const mover=tile(s,'路径 / Path');
      let d;
      if(p.path==='arc') d=`M ${320-p.distance/2} 170 Q 320 ${170-2*p.height} ${320+p.distance/2} 170`;
      if(p.path==='bezier') d=`M ${320-p.distance/2} 170 C ${320-p.distance/3} ${170-2*p.height},${320+p.distance/3} ${170+2*p.height},${320+p.distance/2} 170`;
      if(p.path==='waypoints') d=`M ${320-p.distance/2} 170 L ${320-p.distance/6} ${170-p.height} L ${320+p.distance/6} ${170+p.height/2} L ${320+p.distance/2} 170`;
      if(p.path==='zigzag') d=`M ${320-p.distance/2} 170 L ${320-p.distance/4} ${170-p.height} L 320 ${170+p.height/2} L ${320+p.distance/4} ${170-p.height} L ${320+p.distance/2} 170`;
      const track=svgNode('path',{d,fill:'none',stroke:'#60778d','stroke-dasharray':'4 6'},s.root);s.root.insertBefore(track,mover);
      return t=>{
        let x=320+p.distance*(t-.5),y=170,dx=p.distance,dy=0;
        if(p.path==='arc'){y-=4*p.height*t*(1-t);dy=-4*p.height*(1-2*t);}
        if(p.path==='bezier'){const u=1-t;x=320+p.distance*(-.5*u*u*u-u*u*t+u*t*t+.5*t*t*t);y=170+6*p.height*u*t*(2*t-1);dx=p.distance*(.5+3*t-3*t*t);dy=6*p.height*(-6*t*t+6*t-1);}
        if(p.path==='waypoints'||p.path==='zigzag') {
          const ys=p.path==='waypoints'?[0,-p.height,p.height/2,0]:[0,-p.height,p.height/2,-p.height,0];
          const n=ys.length-1,i=Math.min(n-1,Math.floor(t*n)),u=out(t*n-i);
          x=320-p.distance/2+p.distance*(i+u)/n;y=170+mix(ys[i],ys[i+1],u);dy=ys[i+1]-ys[i];dx=p.distance/n;
        }
        pose(mover,x,y,t===1?0:Math.atan2(dy,dx)*180/Math.PI);caption(s,t===1?'路线完成 / Route complete':`${p.path} · ${Math.round(t*100)}%`);
      };
    });
    add('delayed-followers','错峰跟随 / Delayed followers',{count:{min:3,max:7,integer:true},lag:range(.04,.13),distance:range(100,320)},(s,p)=>{
      const nodes=[];for(let i=0;i<p.count;i++){const g=svgNode('g',{},s.root);box(g,-14,-14,28,28,i?'#bd98ee':'#65c7b0');nodes.push(g);}
      return t=>{for(let i=0;i<nodes.length;i++){const q=out(clamp((t-i*p.lag)/(1-(p.count-1)*p.lag)));pose(nodes[i],320+p.distance*(q-.5),100+i*21);}caption(s,t===1?'所有跟随者已到达 / Followers settled':'主物体先到，视觉尾随稍后 / Leader then followers');};
    });
    add('opacity-arrival','透明度与位移入场 / Opacity arrival',{profile:['fade-slide','soft-rise','snap'],distance:range(20,130)},(s,p)=>{
      const g=tile(s,'欢迎 / Welcome');
      return t=>{const q=p.profile==='soft-rise'?1-(1-t) ** 5:p.profile==='snap'?1-(1-t) ** 8:out(t);pose(g,320+(p.profile==='fade-slide'?-p.distance*(1-q):0),140+(p.profile==='fade-slide'?0:p.distance*(1-q)));attr(g,{opacity:p.profile==='snap'?clamp(t*5):smooth(t)});caption(s,t===1?'内容可见 / Content visible':'入场装饰不决定可用性 / Availability is not gated by arrival');};
    });
    add('geometric-reveal','几何裁切揭示 / Geometric reveal',{shape:['horizontal','diagonal','iris','split'],extent:range(80,200)},(s,p)=>{
      const defs=svgNode('defs',{},s.svg),clip=svgNode('clipPath',{id:s.uid+'-reveal',clipPathUnits:'userSpaceOnUse'},defs);
      const a=p.shape==='iris'?svgNode('circle',{cx:320,cy:140,r:0},clip):p.shape==='diagonal'?svgNode('polygon',{points:''},clip):svgNode('rect',{x:320-p.extent,y:65,width:0,height:150},clip);
      const b=p.shape==='split'?svgNode('rect',{x:320,y:65,width:0,height:150},clip):null;
      const g=svgNode('g',{'clip-path':`url(#${s.uid}-reveal)`},s.root);box(g,320-p.extent,70,p.extent*2,140,'#65c7b0');label(g,320-p.extent+18,149,'内容 / Meaningful content',18).setAttribute('fill','#142332');
      return t=>{const q=out(t);if(p.shape==='iris')attr(a,{r:Math.hypot(p.extent,75)*q});if(p.shape==='horizontal')attr(a,{width:p.extent*2*q});if(p.shape==='diagonal'){const x=320-p.extent+q*(2*p.extent+160);attr(a,{points:`${320-p.extent},65 ${x},65 ${x-150},215 ${320-p.extent},215`});}if(p.shape==='split'){attr(a,{x:320-p.extent*q,width:p.extent*q});attr(b,{width:p.extent*q});}caption(s,t===1?'裁切区域已完全打开 / Reveal complete':'SVG clip geometry; not opacity masquerading as a mask');};
    });
    add('scale-dismissal','缩放退出 / Scale dismissal',{profile:['collapse','shrink-fade'],remainingScale:range(0,.45)},(s,p)=>{
      const g=tile(s,'暂存 / Draft');
      return t=>{const q=p.profile==='collapse'?Math.min(1,Math.max(-.1,(t*t*(2.6*t-1.6)))):t*t*t;pose(g,320,140,0,mix(1,p.remainingScale,q),p.profile==='collapse'?Math.max(0,1-q):mix(1,p.remainingScale,q));attr(g,{opacity:1-clamp(q)});caption(s,t===1?'内容已关闭；焦点由宿主管理 / Dismissed; host owns focus':'退出展示 / Dismissal study');};
    });
    add('trail-dismissal','离场残影 / Trail dismissal',{distance:range(80,220),count:{min:3,max:6,integer:true}},(s,p)=>{
      const ghosts=[];for(let i=p.count-1;i>=0;i--){const g=tile(s,'离场 / Exit');ghosts.push({g,i});}
      return t=>{for(const {g,i}of ghosts){const q=clamp((t-i*.025)/(1-(p.count-1)*.025));pose(g,320+p.distance*q*q,140);attr(g,{opacity:(1-q)*(i? .25:1)});}caption(s,t===1?'离场结束，无残影保留 / Exit complete':'残影只展示一次 / Trails are bounded');};
    });
    add('perspective-plane','真实透视平面 / Perspective plane',{mode:['fold','flip','coin','gyroscope','zoom','pullback'],depth:range(60,180)},(s,p,o)=>{
      const a=plane(s,o.text||'A · 内容');
      if(p.mode==='coin'){a.card.style.borderRadius='50%';for(const face of a.faces)face.style.borderRadius='50%';}
      return t=>{
        const q=smooth(t);let x=0,y=0,z=0,depth=0;
        switch(p.mode){case'fold':x=-85*(1-out(t));break;case'flip':y=180*q;break;case'coin':y=720*out(t);break;case'gyroscope':x=70*Math.sin(Math.PI*t);y=360*q;z=45*Math.sin(2*Math.PI*t);break;case'zoom':depth=-p.depth*(1-q);break;case'pullback':depth=p.depth*(1-q);break;}
        a.outer.style.perspective=`${p.depth+260}px`;a.card.style.transform=`translateZ(${depth}px) rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
        a.card.style.opacity=p.mode==='fold'?String(out(t)):'1';caption(s,t===1?(p.mode==='flip'?'背面已确认 / Back face confirmed':'平面已稳定 / Plane settled'):'CSS perspective + real back/front face visibility');
      };
    });
    add('scale-envelope','缩放包络 / Scale envelope',{profile:['pop','elastic','punch','shrink'],amount:range(.15,.65)},(s,p)=>{
      const g=tile(s,'对象 / Object');
      return t=>{let scale=1;if(p.profile==='pop')scale=mix(1-p.amount,1,back(t));if(p.profile==='elastic')scale=mix(1-p.amount,1,elastic(t));if(p.profile==='punch')scale=1+p.amount*Math.sin(Math.PI*t)*Math.exp(-2*t);if(p.profile==='shrink')scale=mix(1,1-p.amount,t*t*t);pose(g,320,140,0,scale);caption(s,t===1?`稳定尺寸 / Settled scale ${scale.toFixed(2)}`:'改变视觉尺寸；布局测量由宿主管理 / Visual size, not layout');};
    });
    add('bounded-scale-pulse','有界呼吸与焦点 / Bounded scale pulse',{mode:['breathing','focus'],amount:range(.04,.3),cycles:{min:1,max:3,integer:true}},(s,p)=>{
      const g=tile(s,'焦点 / Focus');const ring=svgNode('rect',{x:266,y:100,width:108,height:80,rx:14,fill:'none',stroke:'#f3c66d','stroke-width':2},s.root);
      return t=>{const pulse=Math.sin(Math.PI*p.cycles*t)**2;pose(g,320,140,0,1+p.amount*pulse);attr(ring,{opacity:p.mode==='focus'?1:0,'stroke-width':2+4*pulse});caption(s,t===1?'重点仍可静态辨认 / Static focus remains':p.mode==='breathing'?'呼吸仅有限周期 / Breathing is bounded':'单次焦点强调 / Bounded focus cue');};
    });
    add('axis-deformation','轴向变形与回弹 / Axis deformation',{mode:['stretch','impact','jelly','rubber'],amount:range(.1,.5)},(s,p)=>{
      const g=tile(s,'弹性 / Elastic');const ground=svgNode('line',{x1:230,y1:198,x2:410,y2:198,stroke:'#60778d','stroke-width':2},s.root);
      return t=>{let sx=1,sy=1,y=140;const q=Math.sin(Math.PI*t);if(p.mode==='stretch'){sx=1+p.amount*q;sy=1/sx;}if(p.mode==='impact'){const contact=Math.sin(Math.PI*clamp((t-.32)/.68))*Math.exp(-4*clamp((t-.32)/.68));sx=1+p.amount*contact;sy=1/sx;y=t<.32?mix(60,170,out(t/.32)):170-25*Math.abs(Math.sin(3*Math.PI*(t-.32)/.68))*Math.exp(-5*(t-.32)/.68);if(t===1)y=170;}if(p.mode==='jelly'){const w=Math.sin(6*Math.PI*t)*(1-t);sx=1+p.amount*w;sy=1-p.amount*w;}if(p.mode==='rubber'){const w=Math.sin(4*Math.PI*t)*(1-t);sx=1+p.amount*w;sy=1/(1+p.amount*w);}pose(g,320,y,0,sx,sy);attr(ground,{opacity:p.mode==='impact'?1:0});caption(s,t===1?'形状已恢复 / Shape restored':'改变两轴真实几何；不是普通等比缩放 / Genuine two-axis deformation');};
    });
    add('width-geometry','宽度几何展开 / Width geometry',{width:range(100,300)},(s,p)=>{
      const rect=box(s.root,320-p.width/2,108,0,64);const txt=label(s.root,320-p.width/2+14,147,'展开 / Expanded');txt.setAttribute('fill','#142332');
      return t=>{attr(rect,{width:p.width*out(t)});attr(txt,{opacity:t>.6?out((t-.6)/.4):0});caption(s,t===1?'宽度展开完成 / Width complete':'真实宽度变化，不拉伸字形 / Width changes, glyphs do not stretch');};
    });
    add('angular-profile','角运动包络 / Angular profiles',{profile:['turn','spin-stop','pendulum','tilt','nod','reveal'],angle:range(15,720)},(s,p)=>{
      const g=tile(s,'朝向 / Facing');box(g,20,-33,12,12,'#f3c66d',2);
      return t=>{let a=0;if(p.profile==='turn')a=p.angle*t;if(p.profile==='spin-stop')a=p.angle*out(t);if(p.profile==='pendulum')a=p.angle*Math.sin(4*Math.PI*t)*Math.sin(Math.PI*t);if(p.profile==='tilt')a=p.angle*Math.sin(Math.PI*t);if(p.profile==='nod')a=p.angle*Math.sin(2*Math.PI*t)*(1-t);if(p.profile==='reveal')a=-p.angle*(1-out(t));pose(g,320,140,a);attr(g,{opacity:p.profile==='reveal'?out(t):1});caption(s,t===1?'朝向稳定 / Orientation settled':'观察角速度和轴心 / Inspect angular velocity and pivot');};
    });
    add('orbital-hierarchy','轨道与父子反旋 / Orbital hierarchy',{mode:['orbit','counter'],radius:range(45,100),turns:{min:1,max:3,integer:true}},(s,p)=>{
      svgNode('circle',{cx:320,cy:140,r:p.radius,fill:'none',stroke:'#60778d'},s.root);const pivot=svgNode('g',{},s.root),g=tile({root:pivot},'轨道 / Orbit');pose(g,p.radius,0);box(s.root,315,135,10,10,'#f3c66d',2);
      return t=>{const a=360*p.turns*t;pose(pivot,320,140,a);pose(g,p.radius,0,p.mode==='counter'?-a:0);caption(s,t===1?'轨道结束；姿态可比较 / Orbit complete':p.mode==='counter'?'子节点反旋维持世界朝向 / Child counter-rotation':'子节点继承父旋转 / Child inherits rotation');};
    });
    add('tumble-arrival','翻滚入场 / Tumble arrival',{distance:range(80,220),turns:{min:1,max:3,integer:true}},(s,p)=>{
      const g=tile(s,'到达 / Arrive');return t=>{const q=out(t);pose(g,320-p.distance*(1-q),140+40*Math.sin(Math.PI*t),360*p.turns*q,mix(.5,1,q));attr(g,{opacity:out(t)});caption(s,t===1?'翻滚入场结束 / Tumble complete':'平移、旋转和尺寸共同变化 / Translation, rotation, scale');};
    });
    add('decaying-displacement','阻尼反应与回位 / Damped displacement',{mode:['after-shake','error','recoil','overshoot','snap-back'],amount:range(12,70)},(s,p)=>{
      const g=tile(s,p.mode==='error'?'检查输入 / Check input':'反馈 / Feedback');
      const status=label(s.root,215,225,p.mode==='error'?'输入状态无效 / Input invalid':'状态已更新 / State updated',16);
      return t=>{let x=0;if(p.mode==='after-shake')x=p.amount*Math.sin(10*Math.PI*t)*(1-t)**2;if(p.mode==='error')x=p.amount*Math.sin(8*Math.PI*t)*Math.sin(Math.PI*t);if(p.mode==='recoil')x=-p.amount*Math.sin(Math.PI*Math.min(1,t/.18))*Math.exp(-3*t);if(p.mode==='overshoot')x=p.amount*(back(t)-1);if(p.mode==='snap-back')x=p.amount*(1-back(t));pose(g,320+x,140);attr(status,{opacity:1});caption(s,t===1?'反馈终止；状态文字保留 / Feedback ended; state remains':'状态先改变，视觉随后 / State first, decoration second');};
    });
    add('contact-response','落地接触响应 / Landing contact',{mode:['bounce','double','settle','attention'],height:range(35,115)},(s,p)=>{
      const g=tile(s,'落地 / Land');svgNode('line',{x1:230,y1:199,x2:410,y2:199,stroke:'#60778d'},s.root);
      return t=>{let y=170;if(p.mode==='bounce')y=170-p.height*(1-bounce(t));if(p.mode==='double')y=170-p.height*Math.abs(Math.sin(2*Math.PI*t))*(1-t);if(p.mode==='settle')y=mix(170-p.height,170,out(t));if(p.mode==='attention')y=170-p.height*Math.sin(Math.PI*t)**2;const squash=p.mode==='settle'?Math.sin(Math.PI*clamp((t-.65)/.35))*.14:0;pose(g,320,y,0,1+squash,1-squash);caption(s,t===1?'物体落地且静止 / Landed and still':'落地或单次提醒，无无限循环 / Landing or one bounded cue');};
    });
    add('resisted-drag','拖动阻力模型 / Resisted drag',{distance:range(70,220),resistance:range(.2,.8)},(s,p)=>{
      const target=svgNode('circle',{cx:0,cy:140,r:9,fill:'#f3c66d'},s.root),g=tile(s,'阻力 / Resistance');
      const link=svgNode('line',{x1:0,y1:140,x2:0,y2:140,stroke:'#f3c66d','stroke-dasharray':'4 4'},s.root);
      return t=>{const input=t<.6?p.distance*t/.6:p.distance*(1-out((t-.6)/.4));const display=input/(1+p.resistance*Math.abs(input)/70);attr(target,{cx:320+input});pose(g,320+display,140);attr(link,{x1:320+input,x2:320+display});caption(s,t===1?'释放后回到原位 / Released to origin':'黄点是输入，绿色是非线性阻力结果 / Input versus resisted position');};
    });
    add('appendage-followthrough','附属部件跟进 / Appendage follow-through',{distance:range(80,220),lag:range(.08,.3)},(s,p)=>{
      const g=tile(s,'主体 / Body'),stem=svgNode('path',{d:'',fill:'none',stroke:'#bd98ee','stroke-width':12,'stroke-linecap':'round'},s.root),tip=svgNode('circle',{cx:0,cy:0,r:12,fill:'#bd98ee'},s.root);
      return t=>{const x=320+p.distance*(out(t)-.5),tx=320+p.distance*(out(clamp((t-p.lag)/(1-p.lag)))-.5)-70;pose(g,x,140);attr(stem,{d:`M ${x-40} 140 Q ${(x+tx)/2} ${140+35*Math.sin(Math.PI*t)} ${tx} 140`});attr(tip,{cx:tx,cy:140});caption(s,t===1?'主体与附属部件均已停止 / Body and appendage settled':'主体先停，附属部件继续跟进 / Body stops before appendage');};
    });
    add('physical-target-follow','物理目标追随 / Physical target follow',{distance:range(70,220),stiffness:range(30,240),damping:range(4,40),mass:range(.5,3)},(s,p,o)=>{
      const g=tile(s,'追随 / Follow'),target=svgNode('circle',{cx:320+p.distance/2,cy:140,r:8,fill:'#f3c66d'},s.root);
      return t=>{const q=o.reducedMotion?1:oscillator(t*2.8,p.stiffness,p.damping,p.mass);pose(g,320+p.distance*(q-.5),140);attr(target,{opacity:1});caption(s,o.reducedMotion?'目标静态呈现 / Static target':t===1?'研究窗口结束；残差由物理参数决定 / Sample ends; physical residual retained':'真实阻尼振子响应 / Analytical damped oscillator');};
    });
    add('outline-chase','边框路径提示 / Outline chase',{laps:{min:1,max:3,integer:true},segment:range(25,100)},(s,p)=>{
      const g=tile(s,'提示 / Cue'),path=svgNode('rect',{x:254,y:95,width:132,height:90,rx:16,fill:'none',stroke:'#f3c66d','stroke-width':4,pathLength:100},s.root);
      return t=>{attr(path,{'stroke-dasharray':t===1?'none':`${p.segment} ${100-p.segment}`,'stroke-dashoffset':-100*p.laps*t});pose(g,320,140);caption(s,t===1?'静态边框保留 / Static outline remains':'边框短段沿真实轮廓移动 / Segment follows outline');};
    });
    add('static-emphasis-envelope','静态结果与强调包络 / Emphasis envelope',{mode:['color','halo','nudge','press'],amount:range(.08,.35)},(s,p)=>{
      const g=tile(s,'已选择 / Selected'),rect=g.firstChild,halo=svgNode('rect',{x:258,y:96,width:124,height:88,rx:18,fill:'none',stroke:'#f3c66d','stroke-width':3},s.root);
      return t=>{const pulse=Math.sin(Math.PI*t)**2;pose(g,320+(p.mode==='nudge'?p.amount*100*Math.sin(2*Math.PI*t)*(1-t):0),140,0,p.mode==='press'?1-p.amount*pulse:1);const c=p.mode==='color'?Math.round(101+70*p.amount*pulse):101;attr(rect,{fill:`rgb(${c},199,176)`});attr(halo,{opacity:p.mode==='halo'?1:0,'stroke-width':p.mode==='halo'?3+12*p.amount*pulse:3});caption(s,t===1?'已选择；静态状态不依赖动画 / Selected; static state is authoritative':'强调只执行一次 / Emphasis runs once');};
    });
    add('badge-notification','徽标新增提示 / Badge notification',{count:{min:1,max:99,integer:true},amount:range(.1,.5)},(s,p)=>{
      const g=tile(s,'消息 / Inbox'),badge=svgNode('g',{},s.root);svgNode('circle',{cx:0,cy:0,r:21,fill:'#f3c66d'},badge);const txt=label(badge,-9,5,String(p.count),14);txt.setAttribute('fill','#142332');
      return t=>{pose(g,320,150);pose(badge,366,111,0,mix(1-p.amount,1,back(t)));caption(s,`${p.count}条未读 / ${p.count} unread; count is present before cue`);};
    });
    add('highlight-band','高光扫过 / Highlight band',{width:range(20,90)},(s,p)=>{
      const defs=svgNode('defs',{},s.svg),clip=svgNode('clipPath',{id:s.uid+'-band'},defs);box(clip,237,99,166,82,'#fff',12);const g=tile(s,'重点 / Focus');
      const stripe=svgNode('polygon',{points:'',fill:'#fff',opacity:.28,'clip-path':`url(#${s.uid}-band)`},s.root);
      return t=>{pose(g,320,140);const x=mix(230-p.width,420+p.width,t);attr(stripe,{points:`${x},90 ${x+p.width},90 ${x+p.width-30},190 ${x-30},190`,opacity:t===1?0:.28});caption(s,t===1?'一次扫光结束 / One sweep complete':'高光裁切在内容边界内 / Highlight clipped to content');};
    });
    add('spotlight-mask','聚焦遮罩 / Spotlight mask',{radius:range(60,100)},(s,p)=>{
      const defs=svgNode('defs',{},s.svg),mask=svgNode('mask',{id:s.uid+'-spot',maskUnits:'userSpaceOnUse',x:0,y:0,width:640,height:260},defs);box(mask,0,0,640,260,'#fff',0);const hole=svgNode('circle',{cx:320,cy:140,r:0,fill:'#000'},mask);
      const g=tile(s,'重点 / Focus');const shade=box(s.root,80,36,480,210,'#030a12',12);attr(shade,{mask:`url(#${s.uid}-spot)`,opacity:.7});
      return t=>{pose(g,320,140);attr(hole,{r:p.radius*out(t)});caption(s,t===1?'重点静态可见 / Focus remains visible':'局部遮罩强调，不闪烁 / Local mask, no flashing');};
    });
    return recipes;
  }


  const recipes = Object.assign({}, buildCurvesRecipes(), buildStructureRecipes(), buildPathsRecipes(), buildTransformRecipes());
  return { group: 'basic', recipes };
});
