'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SOURCE_COMMIT = '57d67608ab458f57d9b153b1a2831b921e22498b';
const VENDOR = path.resolve(__dirname, '../../vendor/huashu-art-motion');
const MANIFEST_PATH = path.join(VENDOR, 'manifest.json');
const OUTPUT = path.join(__dirname, 'huashu-runtime.js');

const sceneNames = [
  'cave', 'egypt', 'greek', 'roman', 'gothic', 'renaissance', 'impressionism', 'postimp',
  'nouveau', 'cubism', 'bauhaus', 'pop', '8bit', 'raytrace', '2026', 'ink', 'klimt',
  'munch', 'dunhuang', 'kusama', 'constructivism', 'dali', 'hopper', 'ghibli', 'vaporwave',
  'kirby', 'monet', 'seurat', 'matisse', 'haring', 'rembrandt', 'rubberhose', 'shadowpuppet',
  'shinkai', 'picasso_blue',
];
const LIBS = [
  'fonts.js', 'util.js', 'paint.js', 'brush.js', 'render.js', 'post.js', 'rig.js',
  'rig_huashu.js', 'kit.js', 'motion.js', 'camera.js', 'diagram.js', 'typo.js',
  'chart.js', 'ui.js', 'collage.js', 'toon.js',
];
const SCENES = Array.from({ length: 35 }, (_, i) => `${String(i + (i >= 6 ? 2 : 1)).padStart(2, '0')}_${sceneNames[i]}.js`);
const CLIPS = [
  't1_3b1b.js', 't2_keynote_ui.js', 't3_finance_chart.js', 'y1_kurzgesagt.js',
  'y2_vox.js', 'y3_whiteboard.js', 'y4_storytime.js', 'y5_kinetic_type.js',
];
const MODULE_ALIASES = [
  'U', 'PAINT', 'CAM', 'CH', 'CL', 'DG', 'KIT', 'MO', 'RIG', 'HUASHU', 'TOON', 'TY', 'UI',
  'SCENES', 'CLIPS', 'TRANSITIONS', 'ERAS', 'CLIP', 'TR_UTIL',
];

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sourceEntry(manifest, sourcePath) {
  const entry = manifest.files.find(file => file.sourcePath === sourcePath);
  if (!entry) throw new Error(`Huashu source manifest is missing ${sourcePath}`);
  const localPath = path.resolve(VENDOR, entry.localPath);
  if (!localPath.startsWith(`${VENDOR}${path.sep}`)) throw new Error(`Invalid vendor path for ${sourcePath}`);
  const source = fs.readFileSync(localPath, 'utf8');
  if (sha256(source) !== entry.sha256) throw new Error(`Huashu source hash mismatch: ${sourcePath}`);
  return source;
}

function rewriteKnown(source, sourcePath, before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one compatibility patch in ${sourcePath}, found ${count}`);
  return source.replace(before, after);
}

function sourceFor(manifest, sourcePath) {
  let source = sourceEntry(manifest, sourcePath);
  if (sourcePath === 'scripts/engine/lib/fonts.js') {
    return 'window.FONT_FACES = FONT_FACES; // caller-provided font-face map; upstream catalogue is opt-in only.\n';
  }
  if (sourcePath === 'scripts/engine/lib/util.js') {
    source = rewriteKnown(source, sourcePath, 'const CMAPS = {};', 'const CMAPS = window.__CMAPS;');
    source = rewriteKnown(source, sourcePath, 'U.loadCmaps = async (faces = window.FONT_FACES || []) => {', 'U.loadCmaps = async (faces) => {\n  if (!Array.isArray(faces)) throw new TypeError("loadCmaps requires an explicit font-face array");');
    source = rewriteKnown(source, sourcePath, '};\n\n// ---------- 字形检查 ----------', '};\nconst U = window.U;\n\n// ---------- 字形检查 ----------');
    source = rewriteKnown(source, 'scripts/engine/lib/util.js cmap error handling', 'await Promise.all(faces.map(async f => { try { CMAPS[f.family] = await readCmap(f.url); } catch (e) { console.error(`读不了字体 ${f.family} 的 cmap：${e}`); } }));', 'await Promise.all(faces.map(async f => { CMAPS[f.family] = await readCmap(f.url); }));');
  }
  const fixedStageFiles = [
    'scripts/engine/lib/paint.js', 'scripts/engine/lib/brush.js', 'scripts/engine/lib/kit.js',
    'scripts/engine/lib/post.js', 'scripts/engine/lib/toon.js', 'scripts/engine/lib/render.js',
  ];
  if (fixedStageFiles.includes(sourcePath)) {
    const match = source.match(/const W = 1920, H = 1080(?:, TAU = Math\.PI \* 2)?;/);
    if (!match) throw new Error(`Expected fixed stage constants in ${sourcePath}`);
    source = source.replace(match[0], match[0].replace('1920, H = 1080', 'WIDTH, H = HEIGHT'));
  }
  if (sourcePath === 'scripts/engine/lib/rig.js') {
    source = rewriteKnown(source, sourcePath, 'c.width = 1920; c.height = 1080;', 'c.width = WIDTH; c.height = HEIGHT;');
  }
  if (sourcePath === 'scripts/engine/transitions.js') {
    source = rewriteKnown(source, sourcePath, 'const W = 1920, H = 1080;', 'const W = WIDTH, H = HEIGHT;');
  }
  return source;
}

function moduleBlock(name, sourcePath, manifest) {
  const body = sourceFor(manifest, sourcePath);
  const aliases = MODULE_ALIASES.map(key => `const ${key} = namespace(${JSON.stringify(key)});`).join('\n');
  return `  function ${name}() {\n${aliases}\n    const document = hostDocument;\n    const Path2D = capabilities.Path2D;\n    const DOMMatrix = capabilities.DOMMatrix;\n    const DOMPoint = capabilities.DOMPoint;\n    const WIDTH = width, HEIGHT = height, FPS = defaultFps, IMG = assets;\n    const FONT_FACES = fonts;\n${body}\n  }\n`;
}

function build() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (manifest.sourceCommit !== SOURCE_COMMIT) throw new Error(`Expected Huashu ${SOURCE_COMMIT}, got ${manifest.sourceCommit}`);
  const license = sourceEntry(manifest, 'LICENSE').trim();
  const modules = [];
  for (const file of LIBS) modules.push(moduleBlock(`runLib_${file.replace(/\W/g, '_')}`, `scripts/engine/lib/${file}`, manifest));
  for (const file of SCENES) modules.push(moduleBlock(`runScene_${file.replace(/\W/g, '_')}`, `scripts/engine/scenes/${file}`, manifest));
  for (const file of CLIPS) modules.push(moduleBlock(`runClip_${file.replace(/\W/g, '_')}`, `scripts/engine/clips/${file}`, manifest));
  modules.push(moduleBlock('runTransitions', 'scripts/engine/transitions.js', manifest));

  const moduleNames = Object.fromEntries([
    ...LIBS.map(file => [file, `runLib_${file.replace(/\W/g, '_')}`]),
    ...SCENES.map(file => [file.replace(/\.js$/, ''), `runScene_${file.replace(/\W/g, '_')}`]),
    ...CLIPS.map(file => [file.replace(/\.js$/, ''), `runClip_${file.replace(/\W/g, '_')}`]),
  ]);
  const moduleFns = Object.entries(moduleNames).map(([key, fn]) => `${JSON.stringify(key)}: ${fn}`).join(',\n      ');
  const coreLibs = JSON.stringify(LIBS.filter(file => !['rig_huashu.js', 'toon.js'].includes(file)));
  const output = `/* Generated by build-huashu-runtime.cjs from Huashu ${SOURCE_COMMIT}. Do not edit by hand.
${license}
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HuashuArtMotion = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const SOURCE_COMMIT = ${JSON.stringify(SOURCE_COMMIT)};
  const BASE_WIDTH = 1920, BASE_HEIGHT = 1080;
  function createHuashuRuntime(options) {
    if (!options || !Number.isInteger(options.width) || !Number.isInteger(options.height) || options.width <= 0 || options.height <= 0)
      throw new TypeError('createHuashuRuntime requires positive integer width and height');
    if (typeof options.createCanvas !== 'function') throw new TypeError('createHuashuRuntime requires createCanvas(width,height)');
    const width = options.width, height = options.height;
    const defaultFps = options.fps == null ? 30 : options.fps;
    if (!(defaultFps > 0)) throw new TypeError('fps must be > 0');
    const seed = options.seed == null ? 1 : options.seed;
    if (!Number.isFinite(seed)) throw new TypeError('seed must be finite');
    const createCanvas = options.createCanvas;
    const capabilities = { ...(options.capabilities || {}) };
    if (!capabilities.Path2D || !capabilities.DOMMatrix || !capabilities.DOMPoint)
      throw new TypeError('capabilities.Path2D, DOMMatrix and DOMPoint are required');
    const assets = Object.freeze({ ...(options.assets || {}) });
    const fonts = Object.freeze([...(options.fonts || [])]);
    for (const face of fonts) if (!face || typeof face.family !== 'string' || !face.family || typeof face.url !== 'string' || !face.url)
      throw new TypeError('fonts must contain explicit {family,url} face mappings');
    const cmapCache = options.cmapCache || Object.create(null);
    if (!cmapCache || typeof cmapCache !== 'object' || Array.isArray(cmapCache)) throw new TypeError('cmapCache must be an object');
    const state = { FONT_FACES: fonts, __CMAPS: cmapCache, SCENES: Object.create(null), CLIPS: Object.create(null), TRANSITIONS: Object.create(null), CLIP: {} };
    const window = state;
    const namespace = key => new Proxy(Object.create(null), {
      get(_target, property) { return state[key] == null ? undefined : state[key][property]; },
      set(_target, property, value) { if (!state[key]) state[key] = Object.create(null); state[key][property] = value; return true; },
      has(_target, property) { return state[key] != null && property in state[key]; },
    });
    const hostDocument = { createElement(tag) { if (tag !== 'canvas') throw new Error('Huashu runtime only creates canvas elements'); return createCanvas(1, 1); } };
    let currentTime = 0, disposed = false, demoArtLoaded = false, transitionsLoaded = false, sceneRuntime = null;
    const sceneLoaded = new Set(), clipLoaded = new Set(), clipInitialized = new Map(), sceneInitialized = new Set();
    const assertActive = () => { if (disposed) throw new Error('Huashu runtime is disposed'); };
${modules.join('\n')}
    const moduleFns = {
      ${moduleFns}
    };
    for (const file of ${coreLibs}) moduleFns[file]();
    state.U.setStage(width, height);
    state.U.setStage = (w, h) => {
      if (w !== width || h !== height) throw new RangeError('Huashu runtime dimensions are fixed; create a new instance to resize');
    };
    return { SOURCE_COMMIT, width, height, fps: defaultFps, seed, assets, fonts,
      libraries: state,
      sceneIds: ${JSON.stringify(SCENES.map(s => s.replace(/\.js$/, '')))},
      clipIds: ${JSON.stringify(CLIPS.map(s => s.replace(/\.js$/, '')))},
      createCanvas,
      random(offset = 0) { assertActive(); if (!Number.isFinite(offset)) throw new TypeError('random seed offset must be finite'); return state.U.rng((seed + offset) >>> 0); },
      setTime(t) { assertActive(); return setRuntimeTime(t); },
      drawScene(id, ctx, localTime, drawOptions = {}) { assertActive(); setRuntimeTime(localTime); return drawScene(id, ctx, localTime, drawOptions); },
      drawClip(id, ctx, time, spec) { assertActive(); setRuntimeTime(time); return drawClip(id, ctx, time, spec); },
      transition(type, ctx, from, to, p, transitionOptions = {}) { assertActive(); return runTransition(type, ctx, from, to, p, transitionOptions); },
      get scenes() { assertActive(); return loadAllScenes(); },
      get clips() { assertActive(); return loadAllClips(); },
      get transitions() { assertActive(); return loadTransitions(); },
      get transitionIds() { assertActive(); return Object.keys(loadTransitions()); },
      enableDemoArt() { assertActive(); loadDemoArt(); return { HUASHU: state.HUASHU, TOON: state.TOON }; },
      dispose() { disposed = true; if (sceneRuntime) sceneRuntime.dispose(); sceneLoaded.clear(); clipLoaded.clear(); clipInitialized.clear(); sceneInitialized.clear(); },
    };
    function setRuntimeTime(t) { if (!Number.isFinite(t)) throw new TypeError('time must be finite'); currentTime = t; state.__time = t; return t; }
    function runLib(file) { moduleFns[file](); }
    function loadDemoArt() { if (demoArtLoaded) return; runLib('rig_huashu.js'); runLib('toon.js'); demoArtLoaded = true; }
    function loadScene(id) {
      const fn = moduleFns[id]; if (!fn) throw new RangeError('Unknown Huashu scene: ' + id);
      if (!sceneLoaded.has(id)) { fn(); sceneLoaded.add(id); }
      const entry = state.SCENES[id]; if (!entry || typeof entry.draw !== 'function') throw new Error('Scene failed to register draw(): ' + id);
      return entry;
    }
    function loadClip(id) {
      const fn = moduleFns[id]; if (!fn) throw new RangeError('Unknown Huashu clip: ' + id);
      if (!clipLoaded.has(id)) { fn(); clipLoaded.add(id); }
      const entry = state.CLIPS[id]; if (!entry || typeof entry.draw !== 'function') throw new Error('Clip failed to register draw(): ' + id);
      return entry;
    }
    function loadAllScenes() { return Object.fromEntries(${JSON.stringify(SCENES.map(s => s.replace(/\.js$/, '')))}.map(id => [id, loadScene(id)])); }
    function loadAllClips() { return Object.fromEntries(${JSON.stringify(CLIPS.map(s => s.replace(/\.js$/, '')))}.map(id => [id, loadClip(id)])); }
    function loadTransitions() { if (!transitionsLoaded) { runTransitions(); transitionsLoaded = true; } return state.TRANSITIONS; }
    function getContext(ctx) { if (!ctx || typeof ctx.save !== 'function' || !ctx.canvas) throw new TypeError('A 2D canvas context is required'); return ctx; }
    function drawScene(id, ctx, localTime, drawOptions) {
      getContext(ctx); if (!Number.isFinite(localTime)) throw new TypeError('scene time must be finite');
      if (ctx.canvas.width !== width || ctx.canvas.height !== height) throw new RangeError('scene context dimensions must match the runtime constructor');
      if (width !== BASE_WIDTH || height !== BASE_HEIGHT) {
        if (!sceneRuntime) sceneRuntime = createHuashuRuntime({ width: BASE_WIDTH, height: BASE_HEIGHT, fps: defaultFps, seed, createCanvas, assets, fonts, capabilities, cmapCache: state.__CMAPS });
        const source = createCanvas(BASE_WIDTH, BASE_HEIGHT), sourceContext = source.getContext('2d');
        sceneRuntime.drawScene(id, sourceContext, localTime, { ...drawOptions, fit: undefined });
        const fit = drawOptions.fit || 'contain'; if (!['contain', 'cover'].includes(fit)) throw new TypeError('scene fit must be contain or cover');
        const sx = width / BASE_WIDTH, sy = height / BASE_HEIGHT, scale = fit === 'contain' ? Math.min(sx, sy) : Math.max(sx, sy);
        const gx = (width - BASE_WIDTH * scale) / 2, gy = (height - BASE_HEIGHT * scale) / 2;
        const globalTime = drawOptions.globalTime == null ? localTime : drawOptions.globalTime;
        if (!Number.isFinite(globalTime)) throw new TypeError('globalTime must be finite');
        ctx.save(); try { ctx.drawImage(source, gx, gy, BASE_WIDTH * scale, BASE_HEIGHT * scale); } finally { ctx.restore(); }
        return;
      }
      const scene = loadScene(id); if (!sceneInitialized.has(id)) { if (scene.init) scene.init(assets); sceneInitialized.add(id); }
      const fit = drawOptions.fit || 'contain'; if (!['contain', 'cover'].includes(fit)) throw new TypeError('scene fit must be contain or cover');
      const sx = ctx.canvas.width / BASE_WIDTH, sy = ctx.canvas.height / BASE_HEIGHT, scale = fit === 'contain' ? Math.min(sx, sy) : Math.max(sx, sy);
      const gx = (ctx.canvas.width - BASE_WIDTH * scale) / 2, gy = (ctx.canvas.height - BASE_HEIGHT * scale) / 2;
      const globalTime = drawOptions.globalTime == null ? localTime : drawOptions.globalTime;
      if (!Number.isFinite(globalTime)) throw new TypeError('globalTime must be finite');
      ctx.save(); try { ctx.translate(gx, gy); ctx.scale(scale, scale); scene.draw(ctx, localTime, globalTime); } finally { ctx.restore(); }
    }
    function validateClipSpec(id, spec) {
      const allowed = new Set(['grammar', 'duration', 'fps', 'width', 'height', 'safe', 'theme', 'alpha', 'data', 'cues']);
      if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new TypeError('clipSpec must be an object');
      for (const key of Object.keys(spec)) if (!allowed.has(key)) throw new TypeError('Unknown clipSpec key: ' + key);
      if (spec.grammar !== id) throw new TypeError('clipSpec.grammar must match selected clip ' + id);
      if (!(Number.isFinite(spec.duration) && spec.duration > 0)) throw new TypeError('clipSpec.duration must be > 0');
      if (spec.width != null && spec.width !== width || spec.height != null && spec.height !== height) throw new RangeError('clipSpec dimensions must match the runtime constructor');
      const fps = spec.fps == null ? defaultFps : spec.fps; if (!(Number.isFinite(fps) && fps > 0)) throw new TypeError('clipSpec.fps must be > 0');
      if (spec.alpha != null && typeof spec.alpha !== 'boolean') throw new TypeError('clipSpec.alpha must be boolean');
      for (const key of ['data', 'theme']) if (spec[key] != null && (typeof spec[key] !== 'object' || Array.isArray(spec[key]))) throw new TypeError('clipSpec.' + key + ' must be an object');
      const safe = spec.safe == null ? {} : spec.safe;
      if (typeof safe !== 'object' || Array.isArray(safe) || ![Object.prototype, null].includes(Object.getPrototypeOf(safe)))
        throw new TypeError('clipSpec.safe must be a plain object');
      const safeKeys = new Set(['top', 'bottom', 'left', 'right', 'fill']);
      for (const key of Object.keys(safe)) { if (!safeKeys.has(key)) throw new TypeError('Unknown clipSpec.safe key: ' + key); if (key !== 'fill' && !(Number.isFinite(safe[key]) && safe[key] >= 0)) throw new TypeError('clipSpec.safe.' + key + ' must be >= 0'); }
      if (safe.fill != null && typeof safe.fill !== 'string') throw new TypeError('clipSpec.safe.fill must be a string');
      if (width - (safe.left || 0) - (safe.right || 0) <= 0 || height - (safe.top || 0) - (safe.bottom || 0) <= 0)
        throw new RangeError('clipSpec.safe leaves a nonpositive content box');
      if (!Array.isArray(spec.cues)) throw new TypeError('clipSpec.cues must be an array');
      const cueKeys = new Set(['at', 'kind', 'text', 'sub', 'data', 'image', 'dur']);
      for (const [index, cue] of spec.cues.entries()) {
        if (!cue || typeof cue !== 'object' || Array.isArray(cue)) throw new TypeError('clip cue ' + index + ' must be an object');
        for (const key of Object.keys(cue)) if (!cueKeys.has(key)) throw new TypeError('Unknown clip cue key: ' + key);
        if (!Number.isFinite(cue.at) || cue.at < 0 || cue.at >= spec.duration || typeof cue.kind !== 'string' || !cue.kind)
          throw new TypeError('clip cue needs at in [0,duration) and a non-empty kind');
        if (cue.data != null && (typeof cue.data !== 'object' || Array.isArray(cue.data))) throw new TypeError('clip cue data must be an object');
        if ((cue.text != null && typeof cue.text !== 'string') || (cue.sub != null && typeof cue.sub !== 'string') || (cue.image != null && typeof cue.image !== 'string'))
          throw new TypeError('clip cue text, sub and image values must be strings');
        if (cue.dur != null && (!(Number.isFinite(cue.dur) && cue.dur > 0) || cue.at + cue.dur > spec.duration))
          throw new RangeError('clip cue dur must be > 0 and end within clip duration');
      }
      return { fps, cues: spec.cues.map((cue, i) => ({ ...cue, i, at: Number(cue.at) })).sort((a, b) => a.at - b.at || a.i - b.i) };
    }
    function drawClip(id, ctx, time, spec) {
      getContext(ctx); if (!Number.isFinite(time)) throw new TypeError('clip time must be finite');
      if (ctx.canvas.width !== width || ctx.canvas.height !== height) throw new RangeError('clip context dimensions must match the runtime constructor');
      const valid = validateClipSpec(id, spec), clip = loadClip(id), cues = valid.cues;
      if (id === 'y1_kurzgesagt' || id === 'y4_storytime') loadDemoArt();
      for (const family of clip.fonts || []) {
        if (!fonts.some(face => face.family === family)) throw new Error('Clip ' + id + ' requires font family "' + family + '"; provide it in runtime fonts');
      }
      for (const cue of cues) if (cue.kind === 'number') { const caption = cue.text ?? cue.sub ?? (cue.data && cue.data.text); if (caption != null) { cue.text = caption; cue.sub = caption; } }
      const safe = { top: 0, bottom: 0, left: 0, right: 0, ...(spec.safe || {}) };
      const box = { x: safe.left, y: safe.top, w: width - safe.left - safe.right, h: height - safe.top - safe.bottom };
      const helper = state.CLIP || (state.CLIP = {});
      helper.lt = (t, at, fps) => t - at + 1 / fps;
      helper.p = (t, at, duration, fps) => state.U.clamp(helper.lt(t, at, fps) / duration);
      helper.fit = (iw, ih, bx, by, bw, bh) => { const scale = Math.min(bw / iw, bh / ih), w = iw * scale, h = ih * scale; return { x: bx + (bw - w) / 2, y: by + (bh - h) / 2, w, h, s: scale }; };
      helper.sub = (r, b) => ({ x: b.x + r[0] * b.w, y: b.y + r[1] * b.h, w: r[2] * b.w, h: r[3] * b.h });
      helper.text = (cue, ...fallback) => (cue && (cue.text ?? cue.data?.text)) ?? fallback.find(v => v != null) ?? '';
      const clipCtx = { spec, data: spec.data || {}, theme: spec.theme || {}, cues, W: width, H: height, FPS: valid.fps,
        u: Math.min(width, height) / 1080, portrait: height > width, alpha: !!spec.alpha, IMG: assets,
        dur: spec.duration, safe, box, of: (...kinds) => cues.filter(q => kinds.includes(q.kind)),
        lt: (t, at) => helper.lt(t, at, valid.fps), p: (t, at, duration) => helper.p(t, at, duration, valid.fps) };
      const specKey = JSON.stringify(spec);
      if (clipInitialized.get(id) !== specKey) { if (clip.init) clip.init(clipCtx); clipInitialized.set(id, specKey); }
      ctx.save(); try { clip.draw(ctx, time, clipCtx); } finally { ctx.restore(); }
      return clipCtx;
    }
    function runTransition(type, ctx, from, to, progress, supplied) {
      getContext(ctx); if (!(Number.isFinite(progress) && progress >= 0 && progress <= 1)) throw new TypeError('transition progress must be in [0,1]');
      if (ctx.canvas.width !== width || ctx.canvas.height !== height) throw new RangeError('transition context dimensions must match the runtime constructor');
      for (const canvas of [from, to]) if (!canvas || canvas.width !== width || canvas.height !== height) throw new RangeError('transition inputs must match runtime dimensions');
      const registry = loadTransitions(), transition = registry[type]; if (typeof transition !== 'function') throw new RangeError('Unknown Huashu transition: ' + type);
      const tmp = supplied.tmp || createCanvas(width, height);
      if (!tmp || tmp.width !== width || tmp.height !== height) throw new RangeError('transition tmp canvas must match runtime dimensions');
      const options = { ...supplied, W: width, H: height, tmp, IMG: assets,
        t: supplied.t == null ? currentTime : supplied.t, lt: supplied.lt == null ? currentTime : supplied.lt, id: supplied.id || type };
      ctx.save(); try { transition(ctx, from, to, progress, options); } finally { ctx.restore(); }
    }
  }
  return { SOURCE_COMMIT, createHuashuRuntime };
});
`;
  if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== output) fs.writeFileSync(OUTPUT, output);
  process.stdout.write(`Generated ${path.basename(OUTPUT)} from ${SOURCE_COMMIT}\n`);
}

if (require.main === module) {
  try { build(); } catch (error) { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; }
}

module.exports = { build, SOURCE_COMMIT };
