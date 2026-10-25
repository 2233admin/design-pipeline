/* Original game presentation studies. Gameplay authority is never advanced by seek. */
(((root, factory) => {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory([require('./game-spatial.js'), require('./game-material.js'), require('./game-impact.js')]);
  } else {
    var parts = root.MotionGameParts || {};
    root.MotionRecipeModules = root.MotionRecipeModules || {};
    root.MotionRecipeModules.game = factory([parts.spatial, parts.material, parts.impact]);
  }
})(typeof globalThis === 'undefined' ? this : globalThis, (parts) => {
  
  var NS = 'http://www.w3.org/2000/svg';
  var gold = '#f7c965', blue = '#76c9ef', green = '#8ee0af', red = '#f18b87';
  var specs = {
    'ammo-reload': { rounds: [8, 1, 16, true], loaded: [3, 0, 16, true] },
    'buff-timer': { remaining: [0.35, 0, 1], sectors: [8, 3, 16, true] },
    'coin-collect': { balance: [240, 0, 9999, true], grant: [5, 1, 100, true], arc: [85, 20, 130] },
    'compass-lock': { bearing: [65, -180, 180], startBearing: [-95, -180, 180], overshoot: [12, 0, 30] },
    'cooldown-ability': { remaining: [0.2, 0, 1], ready: [true, 'boolean'] },
    'hp-ghost-bar': { before: [92, 1, 100], current: [58, 0, 100], trailDelay: [0.22, 0.05, 0.6] },
    'minimap-ping': { x: [280, 130, 350], y: [135, 75, 205], radius: [55, 15, 75] },
    'objective-marker': { targetX: [330, 90, 390], targetY: [90, 60, 200], edgeMargin: [30, 15, 60] },
    'party-status': { members: [4, 2, 6, true], changed: [2, 0, 5, true], status: ['ready', ['ready', 'injured', 'offline']] },
    'resource-cap': { value: [110, 0, 200], capacity: [100, 1, 200] },
    'score-rollup': { before: [950, 0, 9999, true], current: [1280, 0, 9999, true], digits: [4, 2, 5, true] },
    'stamina-pulse': { stamina: [18, 0, 100], threshold: [25, 1, 50], accent: [0.35, 0.1, 0.5] },
    'combo-counter': { hits: [5, 2, 8, true], spacing: [0.12, 0.06, 0.14] },
    'critical-flash': { intensity: [0.45, 0.1, 0.5], rays: [8, 4, 16, true] },
    'damage-numbers': { amount: [128, 1, 999, true], count: [3, 1, 6, true], rise: [65, 20, 95] },
    'guard-break': { fragments: [6, 3, 10, true], spread: [55, 15, 85] },
    'hit-confirm': { gap: [24, 8, 40], contraction: [0.65, 0.1, 0.9] },
    'parry-window': { opens: [0.3, 0.1, 0.6], closes: [0.52, 0.2, 0.8] },
    'perfect-dodge': { distance: [140, 60, 200], ghostCount: [4, 2, 6, true] },
    'status-ailment': { stacks: [3, 1, 5, true], ailment: ['poison', ['poison', 'burn', 'slow']], remaining: [0.65, 0, 1] },
    'achievement': { badgeRadius: [46, 25, 65], lineWidth: [5, 2, 8] },
    'chest-open': { lidAngle: [-105, -130, -60], treasureCount: [5, 2, 8, true] },
    'currency-rain': { coins: [12, 4, 20, true], grant: [120, 1, 500, true], fallHeight: [130, 70, 160] },
    'daily-bonus': { day: [4, 1, 7, true], totalDays: [7, 3, 7, true] },
    'gacha-pull': { rarity: [4, 1, 5, true], shutterCount: [8, 4, 12, true] },
    'level-up': { before: [6, 1, 99, true], current: [7, 2, 100, true], rays: [12, 6, 20, true] },
    'loot-rarity': { rarity: [4, 1, 5, true], spokes: [10, 5, 20, true] },
    'new-record': { value: [8420, 1, 99999, true], stampAngle: [-12, -25, 25] },
    'reward-card': { width: [140, 100, 180], tilt: [14, 0, 25], rarity: [3, 1, 5, true] },
    'three-star': { earned: [3, 1, 3, true], stagger: [0.19, 0.1, 0.22] },
    'battle-pass': { tiers: [6, 3, 8, true], unlocked: [4, 1, 8, true] },
    'collection-complete': { slots: [9, 4, 12, true], lastSlot: [7, 0, 11, true] },
    'energy-refill': { before: [0.2, 0, 0.9], current: [0.85, 0.1, 1], cells: [8, 4, 12, true] },
    'login-streak': { days: [7, 3, 10, true], streak: [5, 1, 10, true] },
    'mission-step': { steps: [4, 2, 6, true], completed: [3, 1, 6, true] },
    'quest-banner': { inset: [55, 25, 90], holdEnd: [0.78, 0.6, 0.9] },
    'rank-up': { before: [2, 1, 9, true], current: [3, 2, 10, true], chevrons: [3, 2, 5, true] },
    'skill-unlock': { branches: [3, 2, 5, true], chosen: [1, 0, 4, true] },
    'xp-overflow': { before: [80, 0, 99], gain: [55, 1, 190], capacity: [100, 10, 200] },
    'boss-warning': { stripeWidth: [30, 15, 50], inset: [30, 10, 55] },
    'chapter-intro': { chapter: [3, 1, 20, true], lineWidth: [230, 100, 330] },
    'countdown-go': { count: [3, 2, 5, true], beatFraction: [0.22, 0.1, 0.24] },
    'defeat-dissolve': { columns: [16, 8, 24, true], scatter: [55, 20, 80] },
    'letterbox-focus': { barHeight: [45, 20, 65], zoom: [1.25, 1.05, 1.5] },
    'lucky-roulette': { sectors: [8, 4, 12, true], winner: [3, 0, 11, true], turns: [3, 1, 5, true] },
    'raid-start': { participants: [4, 2, 6, true], spacing: [0.09, 0.05, 0.12] },
    'victory-title': { holdStart: [0.35, 0.2, 0.6], tracking: [6, 0, 12] }
  };
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function phase(t, a, b) { return clamp((t - a) / (b - a)); }
  function out(x) { return 1 - (1 - clamp(x)) ** 3; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function attrs(n, a) { Object.keys(a).forEach((k) => { n.setAttribute(k, String(a[k])); }); return n; }
  function svg(parent, tag, a, value) { var n = parent.ownerDocument.createElementNS(NS, tag); attrs(n, a || {}); if (value !== undefined) n.textContent = value; parent.appendChild(n); return n; }
  function at(n, x, y, angle, scale) { n.setAttribute('transform', 'translate(' + x + ' ' + y + ') rotate(' + (angle || 0) + ') scale(' + (scale === undefined ? 1 : scale) + ')'); }
  function label(parent, x, y, value, size) { return svg(parent, 'text', { x: x, y: y, fill: '#eaf3ff', 'font-size': size || 20, 'text-anchor': 'middle', 'font-family': 'system-ui,sans-serif' }, value); }
  function starPath(r) { var s = ''; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r * 0.44 : r; s += (i ? 'L' : 'M') + Math.cos(a) * d + ',' + Math.sin(a) * d; } return s + 'Z'; }
  function ring(parent, x, y, r, color, width) { return svg(parent, 'circle', { cx: x, cy: y, r: r, fill: 'none', stroke: color, 'stroke-width': width || 5 }); }
  function rect(parent, x, y, w, h, fill) { return svg(parent, 'rect', { x: x, y: y, width: w, height: h, rx: 6, fill: fill }); }
  function seeded(seed) { var s = (Number.isFinite(seed) ? seed : 1) >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function validate(key, p) {
    var spec = specs[key];
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('game.' + key + ': parameters must be an object');
    var keys = Object.keys(spec);
    Object.keys(p).forEach((k) => { if (!Object.hasOwn(spec, k)) throw new Error('game.' + key + ': unsupported parameter ' + k); });
    keys.forEach((k) => { var rule = spec[k], v = p[k]; if (rule[1] === 'boolean') { if (typeof v !== 'boolean') throw new Error(key + ': ' + k + ' must be boolean'); } else if (Array.isArray(rule[1])) { if (rule[1].indexOf(v) < 0) throw new Error(key + ': unsupported ' + k); } else if (!Number.isFinite(v) || v < rule[1] || v > rule[2] || (rule[3] && !Number.isInteger(v))) throw new Error(key + ': invalid or missing ' + k); });
    [['loaded', 'rounds'], ['changed', 'members'], ['day', 'totalDays'], ['unlocked', 'tiers'], ['lastSlot', 'slots'], ['streak', 'days'], ['completed', 'steps'], ['chosen', 'branches'], ['winner', 'sectors']].forEach((pair) => { if (pair[0] in spec && (pair[0] === 'changed' || pair[0] === 'lastSlot' || pair[0] === 'chosen' || pair[0] === 'winner' ? p[pair[0]] >= p[pair[1]] : p[pair[0]] > p[pair[1]])) throw new Error(key + ': ' + pair[0] + ' exceeds ' + pair[1]); });
    if (key === 'parry-window' && p.closes <= p.opens) throw new Error(key + ': closes must follow opens');
    if (key === 'countdown-go' && p.count * p.beatFraction >= 1) throw new Error(key + ': countdown must leave a GO beat');
    if (key === 'hp-ghost-bar' && p.current > p.before) throw new Error(key + ': ghost damage study requires current <= before');
    if ((key === 'level-up' || key === 'rank-up' || key === 'energy-refill') && p.current <= p.before) throw new Error(key + ': current must exceed before');
    if (key === 'xp-overflow' && (p.before >= p.capacity || p.before + p.gain < p.capacity)) throw new Error(key + ': requires a genuine capacity crossing');
    return true;
  }
  function build(key, s, p, options) {
    var rnd = seeded(options.seed), text = options.text || '任务完成 / Complete';
    var nodes = [], i, n, base, body, title;
    function bar(y, fraction, color) { rect(s, 80, y, 320, 24, '#24354b'); return rect(s, 80, y, 320 * fraction, 24, color); }
    switch (key) {
    case 'hp-ghost-bar':
      base = bar(116, p.before / 100, gold); body = rect(s, 80, 116, 320 * p.current / 100, 24, green); title = label(s, 240, 100, 'HP ' + p.current + ' / 100');
      return (t) => { body.setAttribute('width', 320 * p.current / 100); title.textContent = 'HP ' + p.current + ' / 100'; base.setAttribute('width', 320 * mix(p.before, p.current, out(phase(t, p.trailDelay, 0.85))) / 100); };
    case 'ammo-reload':
      for (i = 0; i < p.rounds; i++) nodes.push(rect(s, 70 + i * 340 / p.rounds, 110, 280 / p.rounds, 50, gold));
      label(s, 240, 95, 'Ammo ready: ' + p.rounds);
      return (t) => { nodes.forEach((n, j) => { var q = phase(t, 0.2 + j * 0.5 / p.rounds, 0.32 + j * 0.5 / p.rounds); attrs(n, { opacity: j < p.loaded ? 1 : q, height: 50 * (j < p.loaded ? 1 : out(q)), y: 160 - 50 * (j < p.loaded ? 1 : out(q)) }); }); };
    case 'buff-timer':
      ring(s, 240, 132, 65, '#24354b', 12); base = ring(s, 240, 132, 65, green, 12); attrs(base, { 'stroke-dasharray': 408.407, transform: 'rotate(-90 240 132)' });
      label(s, 240, 140, 'BUFF active', 19);
      for (i = 0; i < p.sectors; i++) { var a = i * 2 * Math.PI / p.sectors; svg(s, 'line', { x1: 240 + Math.cos(a) * 78, y1: 132 + Math.sin(a) * 78, x2: 240 + Math.cos(a) * 85, y2: 132 + Math.sin(a) * 85, stroke: green, 'stroke-width': 3 }); }
      return (t) => { base.setAttribute('stroke-dashoffset', 408.407 * (1 - mix(1, p.remaining, t))); };
    case 'cooldown-ability':
      ring(s, 240, 132, 65, '#24354b', 12); base = ring(s, 240, 132, 65, blue, 12); attrs(base, { 'stroke-dasharray': 408.407, transform: 'rotate(-90 240 132)' });
      body = svg(s, 'path', { d: 'M218 132L234 148L266 113', fill: 'none', stroke: green, 'stroke-width': 6, 'stroke-dasharray': 68 });
      title = label(s, 240, 228, '', 19);
      return (t) => { var q = out(phase(t, 0.05, 0.65)); base.setAttribute('stroke-dashoffset', 408.407 * (p.ready ? q : 1 - mix(1, p.remaining, t))); body.setAttribute('stroke-dashoffset', p.ready ? 68 * (1 - out(phase(t, 0.4, 0.85))) : 68); title.textContent = p.ready ? 'READY — deadline passed' : 'Deadline active'; };
    case 'coin-collect':
      rect(s, 335, 105, 85, 65, '#24354b'); title = label(s, 377, 145, p.balance + p.grant, 20); body = svg(s, 'circle', { r: 15, fill: gold });
      return (t) => { var q = out(phase(t, 0.12, 0.78)); attrs(body, { cx: mix(100, 375, q), cy: mix(185, 135, q) - 4 * p.arc * q * (1 - q), opacity: t > 0.8 ? 0 : 1 }); title.textContent = p.balance + p.grant; };
    case 'compass-lock':
      ring(s, 240, 135, 77, '#456078', 2); ['N', 'E', 'S', 'W'].forEach((v, j) => { var a = j * Math.PI / 2 - Math.PI / 2; label(s, 240 + 92 * Math.cos(a), 140 + 92 * Math.sin(a), v, 15); });
      body = svg(s, 'path', { d: 'M0 -62L-10 18L0 7L10 18Z', fill: red });
      return (t) => { var q = out(phase(t, 0.05, 0.72)), delta = ((p.bearing - p.startBearing + 540) % 360) - 180; at(body, 240, 135, p.startBearing + delta * q + p.overshoot * Math.sin(q * Math.PI) * (1 - q)); };
    case 'minimap-ping':
      rect(s, 110, 55, 260, 165, '#24354b'); for (i = 0; i < 5; i++) svg(s, 'path', { d: 'M' + (130 + i * 48) + ' 55V220', stroke: '#344c65' });
      svg(s, 'circle', { cx: p.x, cy: p.y, r: 6, fill: gold }); base = ring(s, p.x, p.y, 6, gold, 3);
      return (t) => { var q = phase(t, 0.12, 0.8); attrs(base, { r: 6 + p.radius * out(q), opacity: 1 - q }); };
    case 'objective-marker':
      rect(s, 75, 45, 330, 180, '#24354b'); svg(s, 'line', { x1: 240, y1: 140, x2: p.targetX, y2: p.targetY, stroke: '#55768a', 'stroke-dasharray': '4 5' });
      body = svg(s, 'path', { d: 'M0 -12L12 0L0 12L-12 0Z', fill: gold }); title = label(s, 240, 250, 'Objective direction — not an availability cue', 14);
      return (t) => { var q = out(t), x = mix(240, p.targetX, q), y = mix(140, p.targetY, q); at(body, Math.max(75 + p.edgeMargin, Math.min(405 - p.edgeMargin, x)), Math.max(45 + p.edgeMargin, Math.min(225 - p.edgeMargin, y))); };
    case 'party-status':
      for (i = 0; i < p.members; i++) { var g = svg(s, 'g'); rect(g, 60, 55 + i * 32, 360, 26, '#24354b'); label(g, 160, 74 + i * 32, 'Member ' + (i + 1), 16); nodes.push(svg(g, 'circle', { cx: 360, cy: 68 + i * 32, r: 8, fill: i === p.changed ? p.status === 'ready' ? green : p.status === 'injured' ? red : '#8293a6' : green })); }
      return (t) => { nodes[p.changed].setAttribute('r', 8 + 5 * Math.sin(Math.PI * phase(t, 0.1, 0.7))); nodes[p.changed].setAttribute('fill', p.status === 'ready' ? green : p.status === 'injured' ? red : '#8293a6'); };
    case 'resource-cap':
      body = bar(115, Math.min(1, p.value / p.capacity), blue); base = svg(s, 'path', { d: 'M400 101V153', stroke: gold, 'stroke-width': 4 }); title = label(s, 240, 95, p.value + ' / ' + p.capacity + (p.value >= p.capacity ? '  CAP' : ''));
      return (t) => { base.setAttribute('stroke-width', p.value >= p.capacity ? 4 + 5 * Math.sin(Math.PI * phase(t, 0.1, 0.6)) : 4); };
    case 'score-rollup':
      title = label(s, 240, 145, p.before, 46); label(s, 240, 195, 'Committed score ' + p.current, 17);
      return (t) => { title.textContent = Math.round(mix(p.before, p.current, out(phase(t, 0.1, 0.85)))).toString().padStart(p.digits, '0'); };
    case 'stamina-pulse':
      body = bar(115, p.stamina / 100, p.stamina <= p.threshold ? gold : green); base = rect(s, 73, 108, 334, 38, 'none'); attrs(base, { stroke: gold, 'stroke-width': 3 }); label(s, 240, 95, 'Stamina ' + p.stamina + ' — threshold ' + p.threshold);
      return (t) => { base.setAttribute('opacity', p.stamina <= p.threshold ? 0.6 + p.accent * Math.sin(Math.PI * t) : 0); };
    case 'combo-counter':
      title = label(s, 240, 140, '', 54); for (i = 0; i < p.hits; i++) nodes.push(rect(s, 100 + i * 280 / p.hits, 180, 240 / p.hits, 10, gold));
      return (t) => { var h = Math.min(p.hits, Math.max(1, Math.floor(t / p.spacing) + 1)), local = clamp((t - (h - 1) * p.spacing) / p.spacing); title.textContent = h + ' HIT'; at(title, 0, 0, 0, 1); title.setAttribute('font-size', 48 + 12 * Math.sin(Math.PI * local)); nodes.forEach((n, j) => { n.setAttribute('opacity', j < h ? 1 : 0.2); }); };
    case 'critical-flash':
      base = svg(s, 'circle', { cx: 240, cy: 135, r: 80, fill: gold }); for (i = 0; i < p.rays; i++) { var a = i * 2 * Math.PI / p.rays; nodes.push(svg(s, 'line', { x1: 240 + 45 * Math.cos(a), y1: 135 + 45 * Math.sin(a), x2: 240 + 90 * Math.cos(a), y2: 135 + 90 * Math.sin(a), stroke: gold, 'stroke-width': 4 })); } label(s, 240, 142, 'CRITICAL', 27);
      return (t) => { var q = phase(t, 0.12, 0.6), strength = Math.sin(Math.PI * q); base.setAttribute('opacity', p.intensity * strength); nodes.forEach((n) => { n.setAttribute('opacity', 0.35 + 0.65 * strength); }); };
    case 'damage-numbers':
      for (i = 0; i < p.count; i++) nodes.push({ n: label(s, 0, 0, p.amount + i * 7, 28), x: 200 + rnd() * 80, y: 155 + rnd() * 20, drift: (rnd() - 0.5) * 75 });
      return (t) => { nodes.forEach((v, j) => { var q = phase(t, 0.08 + j * 0.1, 0.65 + j * 0.1); at(v.n, v.x + v.drift * q, v.y - p.rise * out(q)); v.n.setAttribute('opacity', q >= 0.8 ? (1 - q) * 5 : q > 0 ? 1 : 0); }); };
    case 'guard-break':
      for (i = 0; i < p.fragments; i++) { var a0 = i * 2 * Math.PI / p.fragments, a1 = (i + 1) * 2 * Math.PI / p.fragments; nodes.push({ n: svg(s, 'path', { d: 'M0 0L' + Math.cos(a0) * 55 + ' ' + Math.sin(a0) * 65 + 'L' + Math.cos(a1) * 55 + ' ' + Math.sin(a1) * 65 + 'Z', fill: blue, stroke: '#182a40', 'stroke-width': 2 }), a: (a0 + a1) / 2 }); }
      label(s, 240, 235, 'Guard already broken', 17);
      return (t) => { var q = out(phase(t, 0.22, 0.85)); nodes.forEach((v) => { at(v.n, 240 + Math.cos(v.a) * p.spread * q, 130 + Math.sin(v.a) * p.spread * q, q * 24); v.n.setAttribute('opacity', 1 - q * 0.6); }); };
    case 'hit-confirm':
      for (i = 0; i < 4; i++) { var g = svg(s, 'g'); svg(g, 'line', { x1: p.gap, y1: 0, x2: p.gap + 28, y2: 0, stroke: gold, 'stroke-width': 5 }); nodes.push(g); }
      return (t) => { var q = phase(t, 0.15, 0.7); nodes.forEach((n, j) => { at(n, 240, 135, 45 + j * 90, 1 - p.contraction * Math.sin(Math.PI * q)); n.setAttribute('opacity', 1 - q * 0.7); }); };
    case 'parry-window':
      ring(s, 240, 135, 65, '#456078', 5); base = ring(s, 240, 135, 65, green, 12); attrs(base, { 'stroke-dasharray': ((p.closes - p.opens) * 408.407) + ' 408.407', transform: 'rotate(' + (p.opens * 360 - 90) + ' 240 135)' }); body = svg(s, 'circle', { r: 7, fill: gold }); title = label(s, 240, 143, '', 20);
      return (t) => { var a = -Math.PI / 2 + t * 2 * Math.PI; attrs(body, { cx: 240 + Math.cos(a) * 65, cy: 135 + Math.sin(a) * 65 }); title.textContent = t >= p.opens && t <= p.closes ? 'STUDY WINDOW' : 'Outside window'; };
    case 'perfect-dodge':
      for (i = 0; i < p.ghostCount; i++) nodes.push(svg(s, 'path', { d: 'M-12 -32H12V15L23 35H-23L-12 15Z', fill: blue })); body = svg(s, 'path', { d: 'M-12 -32H12V15L23 35H-23L-12 15Z', fill: green });
      svg(s, 'path', { d: 'M90 120H390', stroke: red, 'stroke-width': 5 });
      return (t) => { var q = out(phase(t, 0.15, 0.7)); at(body, 160 + p.distance * q, 145 - 30 * Math.sin(q * Math.PI)); nodes.forEach((n, j) => { var past = out(phase(t - (j + 1) * 0.055, 0.15, 0.7)); at(n, 160 + p.distance * past, 145 - 30 * Math.sin(past * Math.PI)); n.setAttribute('opacity', t > 0.15 && t < 0.88 ? 0.27 / (j + 1) : 0); }); };
    case 'status-ailment':
      for (i = 0; i < p.stacks; i++) { var g = svg(s, 'g'); nodes.push({ group: g, ring: ring(g, 0, 0, 22, green, 5), glyph: label(g, 0, 7, '', 21) }); } title = label(s, 240, 210, '', 18);
      return (t) => { nodes.forEach((v, j) => { var q = out(phase(t, j * 0.09, 0.45 + j * 0.09)); at(v.group, 240 + (j - (p.stacks - 1) / 2) * 62, 125, 0, 0.65 + 0.35 * q); v.group.setAttribute('opacity', q); v.ring.setAttribute('stroke', p.ailment === 'burn' ? red : p.ailment === 'slow' ? blue : green); v.glyph.textContent = p.ailment === 'burn' ? '火' : p.ailment === 'slow' ? '氷' : '毒'; }); title.textContent = p.ailment + ' × ' + p.stacks + ' | remaining ' + Math.round(p.remaining * 100) + '%'; };
    case 'achievement':
      ring(s, 240, 130, p.badgeRadius, gold, p.lineWidth); body = svg(s, 'path', { d: 'M215 130L232 147L268 110', fill: 'none', stroke: green, 'stroke-width': p.lineWidth, 'stroke-linecap': 'round', 'stroke-dasharray': 75 }); label(s, 240, 225, text, 22);
      return (t) => { body.setAttribute('stroke-dashoffset', 75 * (1 - out(phase(t, 0.15, 0.65)))); };
    case 'chest-open':
      rect(s, 175, 140, 130, 62, '#916c38'); base = svg(s, 'g'); rect(base, 0, -48, 130, 48, gold); for (i = 0; i < p.treasureCount; i++) nodes.push(svg(s, 'circle', { r: 7, fill: i % 2 ? blue : gold }));
      return (t) => { var q = out(phase(t, 0.12, 0.6)); at(base, 175, 140, p.lidAngle * q); nodes.forEach((n, j) => { var k = out(phase(t, 0.35 + j * 0.03, 0.8)); attrs(n, { cx: 190 + j * 100 / p.treasureCount, cy: 160 - 85 * k, opacity: k }); }); };
    case 'currency-rain':
      rect(s, 170, 210, 140, 16, '#456078'); label(s, 240, 250, 'Granted once: +' + p.grant, 20); for (i = 0; i < p.coins; i++) nodes.push({ n: svg(s, 'circle', { r: 7, fill: gold }), x: 170 + rnd() * 140, delay: rnd() * 0.35 });
      return (t) => { nodes.forEach((v) => { var q = phase(t, v.delay, 0.65 + v.delay); attrs(v.n, { cx: v.x + 8 * Math.sin(q * Math.PI), cy: 210 - p.fallHeight + p.fallHeight * q * q, opacity: q > 0 && q < 1 ? 1 : 0 }); }); };
    case 'daily-bonus': case 'login-streak': {
      var total = key === 'daily-bonus' ? p.totalDays : p.days, marked = key === 'daily-bonus' ? p.day : p.streak;
      for (i = 0; i < total; i++) { var g = svg(s, 'g'); rect(g, -18, -25, 36, 50, '#24354b'); label(g, 0, 7, i + 1, 19); nodes.push({ n: g, seal: svg(g, 'path', { d: 'M-11 13L-3 21L12 5', fill: 'none', stroke: green, 'stroke-width': 3 }) }); at(g, 75 + i * 330 / Math.max(1, total - 1), 135); }
      return (t) => { nodes.forEach((v, j) => { var active = key === 'daily-bonus' ? j === marked - 1 : j < marked; v.seal.setAttribute('opacity', active ? out(phase(t, key === 'daily-bonus' ? 0.2 : j * 0.065, 0.65 + (key === 'daily-bonus' ? 0 : j * 0.03))) : 0); }); };}
    case 'gacha-pull':
      rect(s, 175, 65, 130, 140, '#4f416e'); label(s, 240, 140, '★'.repeat(p.rarity), 23); for (i = 0; i < p.shutterCount; i++) nodes.push(rect(s, 175 + i * 130 / p.shutterCount, 65, 130 / p.shutterCount + 0.5, 140, '#24354b'));
      return (t) => { nodes.forEach((n, j) => { var q = out(phase(t, 0.15 + j * 0.02, 0.65 + j * 0.02)); attrs(n, { height: 140 * (1 - q), y: 65 + (j % 2 ? 140 * q : 0) }); }); };
    case 'level-up':
      title = label(s, 240, 145, 'LV ' + p.current, 42); for (i = 0; i < p.rays; i++) nodes.push(svg(s, 'line', { stroke: gold, 'stroke-width': 3 })); label(s, 240, 220, 'Level committed: ' + p.before + ' → ' + p.current, 16);
      return (t) => { var q = phase(t, 0.18, 0.82); nodes.forEach((n, j) => { var a = j * Math.PI * 2 / p.rays, inner = 40 + 50 * q, outer = inner + 35 * Math.sin(Math.PI * q); attrs(n, { x1: 240 + Math.cos(a) * inner, y1: 130 + Math.sin(a) * inner, x2: 240 + Math.cos(a) * outer, y2: 130 + Math.sin(a) * outer, opacity: Math.sin(Math.PI * q) }); }); };
    case 'loot-rarity':
      body = svg(s, 'path', { d: 'M240 95L270 130L240 165L210 130Z', fill: [null, '#b9c4ce', green, blue, '#b991ef', gold][p.rarity] }); for (i = 0; i < p.spokes; i++) nodes.push(svg(s, 'path', { d: 'M-4 -60L0 -95L4 -60Z', fill: gold })); label(s, 240, 230, 'Rarity ' + p.rarity + ' / 5', 20);
      return (t) => { var q = out(phase(t, 0.12, 0.75)); nodes.forEach((n, j) => { at(n, 240, 130, j * 360 / p.spokes + 18 * q, 0.5 + 0.5 * q); n.setAttribute('opacity', q * p.rarity / 5); }); };
    case 'new-record': {
      title = label(s, 240, 105, p.value, 44); body = svg(s, 'g'); var r = rect(body, -120, -28, 240, 56, 'none'); attrs(r, { stroke: gold, 'stroke-width': 4 }); label(body, 0, 9, 'NEW RECORD', 24);
      return (t) => { var q = out(phase(t, 0.12, 0.5)); at(body, 240, 165, p.stampAngle, mix(1.7, 1, q)); body.setAttribute('opacity', q); };
    }
    case 'reward-card': {
      // A true two-sided DOM card uses perspective and backface culling, not a scale-X flip.
      var doc = s.ownerDocument, foreign = svg(s, 'foreignObject', { x: 120, y: 35, width: 240, height: 230 }), wrap = doc.createElement('div'), card = doc.createElement('div');
      wrap.style.cssText = 'height:210px;display:grid;place-items:center;perspective:650px'; card.style.cssText = 'position:relative;height:175px;transform-style:preserve-3d'; card.style.width = p.width + 'px';
      ['?', text + ' ★'.repeat(p.rarity)].forEach((v, j) => { var face = doc.createElement('div'); face.textContent = v; face.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;backface-visibility:hidden;border:2px solid #f7c965;border-radius:12px;background:' + (j ? '#4f416e' : '#24354b') + ';color:#eaf3ff;font:18px system-ui;text-align:center;transform:rotateY(' + (j ? 180 : 0) + 'deg)'; card.appendChild(face); }); wrap.appendChild(card); foreign.appendChild(wrap);
      return (t) => { card.style.transform = 'rotateY(' + (180 * out(phase(t, 0.15, 0.7))) + 'deg) rotateZ(' + (p.tilt * Math.sin(Math.PI * t)) + 'deg)'; };
    }
    case 'three-star':
      for (i = 0; i < 3; i++) { var g = svg(s, 'g'); at(g, 130 + i * 110, 135); nodes.push(svg(g, 'path', { d: starPath(42), fill: '#24354b', stroke: gold, 'stroke-width': 2 })); }
      return (t) => { nodes.forEach((n, j) => { var q = out(phase(t, j * p.stagger, j * p.stagger + 0.28)); n.setAttribute('fill', j < p.earned && q > 0.5 ? gold : '#24354b'); n.setAttribute('stroke-width', 2 + (j < p.earned ? 4 * Math.sin(Math.PI * q) : 0)); }); };
    case 'battle-pass':
      base = svg(s, 'line', { x1: 60, y1: 130, x2: 420, y2: 130, stroke: '#456078', 'stroke-width': 5 }); body = svg(s, 'line', { x1: 60, y1: 130, x2: 60, y2: 130, stroke: gold, 'stroke-width': 5 }); for (i = 0; i < p.tiers; i++) { var x = 60 + i * 360 / (p.tiers - 1); nodes.push(svg(s, 'circle', { cx: x, cy: 130, r: 15, fill: '#24354b', stroke: gold, 'stroke-width': 2 })); label(s, x, 176, i + 1, 17); }
      return (t) => { var q = out(phase(t, 0.1, 0.8)); body.setAttribute('x2', 60 + (p.unlocked - 1) * 360 / (p.tiers - 1) * q); nodes.forEach((n, j) => { n.setAttribute('fill', j < p.unlocked && q >= j / Math.max(1, p.unlocked - 1) ? gold : '#24354b'); }); };
    case 'collection-complete':
      for (i = 0; i < p.slots; i++) { var x = 160 + (i % 4) * 55, y = 55 + Math.floor(i / 4) * 55; nodes.push(rect(s, x, y, 42, 42, i === p.lastSlot ? '#24354b' : blue)); } base = rect(s, 145, 40, 235, Math.ceil(p.slots / 4) * 55 + 10, 'none'); attrs(base, { stroke: gold, 'stroke-width': 3 });
      return (t) => { nodes[p.lastSlot].setAttribute('fill', t >= 0.25 ? blue : '#24354b'); base.setAttribute('opacity', phase(t, 0.35, 0.75)); };
    case 'energy-refill':
      rect(s, 80, 95, 320, 65, '#24354b'); rect(s, 400, 113, 12, 28, '#456078'); for (i = 0; i < p.cells; i++) nodes.push(rect(s, 86 + i * 308 / p.cells, 103, 280 / p.cells, 49, green));
      return (t) => { var level = mix(p.before, p.current, out(phase(t, 0.1, 0.8))); nodes.forEach((n, j) => { n.setAttribute('width', 280 / p.cells * clamp(level * p.cells - j)); }); };
    case 'mission-step':
      for (i = 0; i < p.steps; i++) { var x = 90 + i * 300 / (p.steps - 1); if (i) nodes.push({ line: svg(s, 'line', { x1: x - 300 / (p.steps - 1) + 15, y1: 130, x2: x - 15, y2: 130, stroke: '#456078', 'stroke-width': 5 }), step: i }); ring(s, x, 130, 18, blue, 3); label(s, x, 137, i + 1, 18); }
      return (t) => { nodes.forEach((v) => { v.line.setAttribute('stroke', v.step < p.completed && t >= 0.1 + v.step * 0.13 ? green : '#456078'); }); };
    case 'quest-banner':
      body = svg(s, 'g'); svg(body, 'path', { d: 'M' + p.inset + ' 90H' + (480 - p.inset) + 'L' + (455 - p.inset) + ' 140L' + (480 - p.inset) + ' 190H' + p.inset + 'L' + (p.inset + 25) + ' 140Z', fill: '#345b78' }); label(body, 240, 149, text, 23);
      return (t) => { var q = t < 0.3 ? out(phase(t, 0.05, 0.3)) : t > p.holdEnd ? 1 - out(phase(t, p.holdEnd, 1)) : 1; at(body, -480 * (1 - q), 0); };
    case 'rank-up':
      label(s, 240, 95, 'Rank ' + p.before + ' → ' + p.current, 28); for (i = 0; i < p.chevrons; i++) nodes.push(svg(s, 'path', { d: 'M-55 15L0 -15L55 15', fill: 'none', stroke: gold, 'stroke-width': 9 }));
      return (t) => { nodes.forEach((n, j) => { var q = out(phase(t, 0.12 + j * 0.1, 0.5 + j * 0.1)); at(n, 240, 120 + j * 28 + 40 * (1 - q)); n.setAttribute('opacity', q); }); };
    case 'skill-unlock':
      svg(s, 'circle', { cx: 240, cy: 65, r: 14, fill: blue }); for (i = 0; i < p.branches; i++) { var x = 90 + i * 300 / (p.branches - 1); nodes.push({ line: svg(s, 'path', { d: 'M240 80L' + x + ' 160', fill: 'none', stroke: '#456078', 'stroke-width': 4, 'stroke-dasharray': 185 }), node: svg(s, 'circle', { cx: x, cy: 180, r: 22, fill: '#24354b', stroke: blue, 'stroke-width': 3 }) }); }
      return (t) => { nodes.forEach((v, j) => { v.line.setAttribute('stroke-dashoffset', j === p.chosen ? 185 * (1 - out(phase(t, 0.1, 0.65))) : 0); v.line.setAttribute('stroke', j === p.chosen ? gold : '#456078'); v.node.setAttribute('fill', j === p.chosen && t >= 0.65 ? gold : '#24354b'); }); };
    case 'xp-overflow':
      body = bar(115, p.before / p.capacity, blue); title = label(s, 240, 95, '', 22); label(s, 240, 185, 'Committed gain +' + p.gain + ' | carry ' + ((p.before + p.gain) % p.capacity), 18);
      return (t) => { var xp = p.before + p.gain * out(phase(t, 0.05, 0.85)), level = Math.floor(xp / p.capacity), fraction = xp >= p.before + p.gain ? ((p.before + p.gain) % p.capacity) / p.capacity : (xp % p.capacity) / p.capacity; body.setAttribute('width', 320 * fraction); title.textContent = 'Presentation level +' + level + '  XP ' + Math.floor(xp % p.capacity); };
    case 'boss-warning':
      body = svg(s, 'g'); rect(body, p.inset, 72, 480 - 2 * p.inset, 128, '#5c3139'); for (i = 0; i < Math.ceil(480 / p.stripeWidth); i++) nodes.push(svg(body, 'path', { d: 'M' + i * p.stripeWidth + ' 68l15 -20h' + p.stripeWidth / 2 + 'l-15 20Z M' + i * p.stripeWidth + ' 224l15 -20h' + p.stripeWidth / 2 + 'l-15 20Z', fill: gold })); label(body, 240, 145, 'BOSS — 警告', 30);
      return (t) => { var q = out(phase(t, 0.04, 0.38)); at(body, 0, 0, 0, q); };
    case 'chapter-intro':
      title = label(s, 240, 120, 'CHAPTER ' + p.chapter, 34); label(s, 240, 165, text, 20); base = svg(s, 'line', { x1: 240, y1: 185, x2: 240, y2: 185, stroke: gold, 'stroke-width': 2 });
      return (t) => { var q = out(phase(t, 0.1, 0.6)); attrs(base, { x1: 240 - p.lineWidth * q / 2, x2: 240 + p.lineWidth * q / 2 }); title.setAttribute('letter-spacing', 12 * (1 - q)); title.setAttribute('opacity', q); };
    case 'countdown-go':
      title = label(s, 240, 150, '', 72); base = ring(s, 240, 130, 90, gold, 4);
      return (t) => { var beat = Math.floor(t / p.beatFraction), q = (t % p.beatFraction) / p.beatFraction; title.textContent = beat >= p.count ? 'GO!' : p.count - beat; base.setAttribute('stroke-dasharray', 565.487); base.setAttribute('stroke-dashoffset', beat >= p.count ? 0 : 565.487 * q); title.setAttribute('font-size', beat >= p.count ? 60 : 58 + 14 * (1 - q)); };
    case 'defeat-dissolve':
      for (i = 0; i < p.columns; i++) nodes.push({ n: rect(s, 115 + i * 250 / p.columns, 95, 250 / p.columns + 0.3, 90, '#456078'), drift: (rnd() - 0.5) * p.scatter, delay: rnd() * 0.25 }); label(s, 240, 230, 'DEFEAT — Result remains available', 19);
      return (t) => { nodes.forEach((v) => { var q = phase(t, 0.15 + v.delay, 0.65 + v.delay); at(v.n, v.drift * q, p.scatter * q * q); v.n.setAttribute('opacity', 1 - q); }); };
    case 'letterbox-focus':
      body = svg(s, 'g'); rect(body, 80, 40, 320, 190, '#345b78'); ring(body, 240, 135, 30, gold, 3); title = label(body, 240, 145, 'Focus', 18); base = rect(s, 0, 0, 480, 0, '#091321'); n = rect(s, 0, 270, 480, 0, '#091321');
      return (t) => { var q = out(phase(t, 0.05, 0.7)), z = mix(1, p.zoom, q); body.setAttribute('transform', 'translate(240 135) scale(' + z + ') translate(-240 -135)'); attrs(base, { height: p.barHeight * q }); attrs(n, { y: 270 - p.barHeight * q, height: p.barHeight * q }); };
    case 'lucky-roulette':
      body = svg(s, 'g'); for (i = 0; i < p.sectors; i++) { var a0 = i * Math.PI * 2 / p.sectors, a1 = (i + 1) * Math.PI * 2 / p.sectors; svg(body, 'path', { d: 'M0 0L' + Math.cos(a0) * 80 + ' ' + Math.sin(a0) * 80 + 'A80 80 0 0 1 ' + Math.cos(a1) * 80 + ' ' + Math.sin(a1) * 80 + 'Z', fill: i % 2 ? '#345b78' : '#5c4779', stroke: gold }); label(body, Math.cos((a0 + a1) / 2) * 53, Math.sin((a0 + a1) / 2) * 53 + 5, i + 1, 16); } svg(s, 'path', { d: 'M225 35L255 35L240 57Z', fill: gold }); label(s, 240, 245, 'Winner committed: ' + (p.winner + 1), 18);
      return (t) => { var target = p.turns * 360 - 90 - (p.winner + 0.5) * 360 / p.sectors; at(body, 240, 140, target * out(phase(t, 0.05, 0.9))); };
    case 'raid-start':
      for (i = 0; i < p.participants; i++) { var g = svg(s, 'g'); rect(g, -25, -35, 50, 70, '#345b78'); label(g, 0, 7, i + 1, 25); nodes.push(g); } label(s, 240, 230, 'RAID READY', 27);
      return (t) => { nodes.forEach((n, j) => { var q = out(phase(t, j * p.spacing, 0.38 + j * p.spacing)); at(n, 80 + j * 320 / (p.participants - 1), 135 + 180 * (1 - q)); }); };
    case 'victory-title':
      title = label(s, 240, 142, text, 38); base = svg(s, 'path', { d: 'M70 175H410M130 190H350', stroke: gold, 'stroke-width': 3 });
      return (t) => { var q = out(phase(t, 0.02, p.holdStart)); title.setAttribute('letter-spacing', p.tracking * q); title.setAttribute('opacity', q); base.setAttribute('opacity', q); };
    default: throw new Error('Unknown game mechanism ' + key);
    }
  }
  function logicalText(key, p) {
    switch (key) {
    case 'hp-ghost-bar': return 'Current HP = ' + p.current + ' (trail cannot heal or damage)';
    case 'coin-collect': return 'Balance = ' + (p.balance + p.grant) + '; grant committed once';
    case 'currency-rain': return 'Grant = ' + p.grant + '; particle arrivals never grant';
    case 'cooldown-ability': return p.ready ? 'Ability ready from caller deadline' : 'Ability unavailable from caller deadline';
    case 'buff-timer': return 'Buff active; remaining fraction = ' + p.remaining;
    case 'ammo-reload': return 'Reload event committed; ammunition = ' + p.rounds;
    case 'score-rollup': return 'Authoritative score = ' + p.current;
    case 'lucky-roulette': return 'Preselected outcome = ' + (p.winner + 1) + '; seek never draws a prize';
    case 'countdown-go': return 'Presentation countdown only; start signal remains engine-owned';
    case 'parry-window': return 'Engine owns parry acceptance; study window [' + p.opens + ', ' + p.closes + ']';
    default: return 'Committed event / 当前状态由业务持有; timeline is presentation only';
    }
  }
  var recipes = {};
  Object.keys(specs).forEach((key) => {
    var id = 'game.' + key;
    recipes[id] = {
      title: key.replace(/-/g, ' ') + ' / 游戏状态反馈',
      validate: (p) => validate(key, p),
      create: (stage, p, options) => {
        validate(key, p); p = Object.assign({}, p); options = options || {};
        var doc = stage.ownerDocument, host = doc.createElement('section'), status = doc.createElement('p'), surface = svg(host, 'svg', { viewBox: '0 0 480 270', role: 'img', 'aria-label': key + ' original presentation study' });
        host.style.cssText = 'width:100%;max-width:680px;margin:auto;color:#eaf3ff'; surface.style.cssText = 'display:block;width:100%;background:#142239;border-radius:14px';
        status.textContent = logicalText(key, p); status.style.cssText = 'font:14px system-ui;line-height:1.5;color:#c2d5e8'; host.appendChild(status);
        var draw = build(key, surface, p, options), disposed = false;
        var control = doc.createElement('button'), inspected = false;
        control.type = 'button'; control.textContent = 'Inspect logical authority / 查看业务状态';
        control.style.cssText = 'padding:8px 12px;border:1px solid #55768a;border-radius:6px;background:#24354b;color:#eaf3ff;font:14px system-ui';
        function inspect() { inspected = !inspected; status.textContent = logicalText(key, p) + (inspected ? ' — Replay, reverse and cancellation do not recommit this event.' : ''); }
        var eventButton, commit;
        if (key === 'hp-ghost-bar' || key === 'cooldown-ability' || key === 'coin-collect') {
          eventButton = doc.createElement('button'); eventButton.type = 'button'; eventButton.style.cssText = control.style.cssText;
          eventButton.textContent = key === 'hp-ghost-bar' ? 'Damage −5 / 即时扣血' : key === 'cooldown-ability' ? 'Toggle caller deadline / 切换截止状态' : 'New grant / 新奖励事件';
          commit = function () {
            if (key === 'hp-ghost-bar') { p.before = p.current; p.current = Math.max(0, p.current - 5); }
            else if (key === 'cooldown-ability') p.ready = !p.ready;
            else p.balance += p.grant;
            status.textContent = logicalText(key, p);
            seek(0);
          };
          eventButton.addEventListener('click', commit); host.appendChild(eventButton);
        }
        var stateSelect, selectChange;
        if (key === 'party-status' || key === 'status-ailment') {
          var field = key === 'party-status' ? 'status' : 'ailment';
          var selectLabel = doc.createElement('label'); selectLabel.textContent = 'Current state / 当前状态 ';
          stateSelect = doc.createElement('select');
          specs[key][field][1].forEach(function (value) { var option = doc.createElement('option'); option.value = value; option.textContent = value; stateSelect.appendChild(option); });
          stateSelect.value = p[field]; selectLabel.appendChild(stateSelect); host.appendChild(selectLabel);
          selectChange = function () { p[field] = stateSelect.value; status.textContent = logicalText(key, p); seek(0); };
          stateSelect.addEventListener('change', selectChange);
        }
        control.addEventListener('click', inspect); host.appendChild(control); stage.appendChild(host); stage.dataset.recipe = id;
        function seek(progress) {
          if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new Error(id + ': progress must be finite [0,1]');
          if (disposed) return;
          // Reduced motion is one readable result, never a different gameplay value.
          draw(options.reducedMotion ? reducedFrame(key, p) : progress);
        }
        seek(0);
        return { seek: seek, dispose: () => { if (disposed) return; disposed = true; control.removeEventListener('click', inspect); if (eventButton) eventButton.removeEventListener('click', commit); if (stateSelect) stateSelect.removeEventListener('change', selectChange); host.remove(); if (stage.dataset.recipe === id) delete stage.dataset.recipe; } };
      }
    };
  });
  function reducedFrame(key, p) {
    if (key === 'parry-window') return (p.opens + p.closes) / 2;
    if (key === 'quest-banner') return 0.5;
    if (key === 'minimap-ping' || key === 'damage-numbers' || key === 'currency-rain' || key === 'defeat-dissolve' || key === 'level-up') return 0.5;
    return 1;
  }
  parts.forEach((part, index) => {
    if (!part || !part.recipes) throw new Error('Game helper missing: ' + ['spatial', 'material', 'impact'][index]);
    Object.keys(part.recipes).forEach((id) => { if (recipes[id]) throw new Error('Duplicate game descriptor ' + id); recipes[id] = part.recipes[id]; });
  });
  return { group: 'game', recipes: recipes };
}));
