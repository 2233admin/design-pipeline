'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { resolveChrome, resolvePuppeteer } = require('../skill/scripts/film-capture-core.cjs');

const ROOT = path.resolve(__dirname, '..');
const TOOL = path.join(ROOT, 'skill/tools/art-motion');
const RUNTIME = path.join(TOOL, 'runtime.js');
const EXAMPLES = path.join(TOOL, 'examples');
const PROOF = path.join(ROOT, '.design-pipeline/art-motion/browser-proof');
const FONT_DIR = path.join(TOOL, 'fonts');
// Proof families: every font an example clip declares, plus a CJK face for the caption check.
const PROOF_FAMILIES = ['PuHui-Medium', 'PuHui-Bold', 'PuHui-Heavy', 'PuHui-Black', 'LXGWWenKai-500'];
const CATALOG = JSON.parse(fs.readFileSync(path.join(FONT_DIR, 'catalog.json'), 'utf8')).faces;

test('Art Motion static runtime isolates instances and replays the complete Canvas catalog', { timeout: 240_000 }, async t => {
  const staticBundle = fs.readFileSync(RUNTIME, 'utf8');
  assert.doesNotMatch(staticBundle, /\beval\s*\(|new Function\s*\(|XMLHttpRequest/);
  fs.mkdirSync(PROOF, { recursive: true });
  const puppeteer = resolvePuppeteer(ROOT);
  const browser = await puppeteer.launch({ executablePath: resolveChrome(), headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 700 });
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.addScriptTag({ path: RUNTIME });
  // `fonts` selects render-kernel inputs (`art-motion render`); the runtime clipSpec takes the faces via createArtMotionRuntime instead.
  const exampleFiles = fs.readdirSync(EXAMPLES).filter(file => file.endsWith('.json')).sort().map(file => {
    const { fonts, ...clipSpec } = JSON.parse(fs.readFileSync(path.join(EXAMPLES, file), 'utf8'));
    assert.equal(fonts, 'bundled', `${file} selects the bundled fonts so it renders as shipped`);
    return clipSpec;
  });
  const fontFaces = PROOF_FAMILIES.map(family => {
    const face = CATALOG.find(entry => entry.family === family);
    assert.ok(face, `font catalog lacks proof family ${family}`);
    return {
      family, ...(face.weight ? { weight: face.weight } : {}),
      url: `data:font/woff;base64,${fs.readFileSync(path.join(FONT_DIR, face.file)).toString('base64')}`,
    };
  });
  const result = await page.evaluate(async ({ exampleFiles, fontFaces }) => {
    const moduleKeys = Object.keys(window.ArtMotion);
    if (moduleKeys.length !== 1 || moduleKeys[0] !== 'createArtMotionRuntime') throw new Error(`runtime module exposes ${moduleKeys.join(', ')}`);
    const { createArtMotionRuntime } = window.ArtMotion;
    const hostNamespaces = ['U', 'PAINT', 'CAM', 'CH', 'CL', 'DG', 'KIT', 'MO', 'RIG', 'TOON', 'TY', 'UI', 'SCENES', 'CLIPS', 'TRANSITIONS'];
    if (hostNamespaces.some(name => Object.prototype.hasOwnProperty.call(window, name))) throw new Error('runtime leaked upstream namespaces onto the host window');
    const makeRuntime = (width, height) => createArtMotionRuntime({
      width, height, fps: 30,
      createCanvas(w, h) { const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; return canvas; },
      capabilities: { Path2D, DOMMatrix, DOMPoint },
      assets: {}, fonts: fontFaces, seed: 23,
    });
    const landscape = makeRuntime(640, 360), portrait = makeRuntime(360, 640);
    const requiredFamilies = ['U', 'PAINT', 'CAM', 'CH', 'CL', 'DG', 'KIT', 'MO', 'RIG', 'TY', 'UI', 'FONT_FACES'];
    for (const family of requiredFamilies) if (!landscape.libraries[family]) throw new Error(`missing Art Motion library family ${family}`);
    if (landscape.libraries.TOON) throw new Error('optional character methods loaded without explicit selection');
    if (landscape.libraries.FONT_FACES.length !== fontFaces.length || landscape.libraries.FONT_FACES.some((face, i) => face.family !== fontFaces[i].family))
      throw new Error('caller font faces were not retained');
    await Promise.all(fontFaces.map(async face => {
      const loaded = await new FontFace(face.family, `url(${face.url})`, { weight: face.weight }).load();
      document.fonts.add(loaded);
    }));
    await document.fonts.ready;
    if (!document.fonts.check('48px "PuHui-Black"', 'AI 写代码')) throw new Error('CJK proof font was not registered for canvas text');
    await landscape.libraries.U.loadCmaps(fontFaces);
    const cjkCaption = 'AI 写代码：中文';
    for (const face of fontFaces) {
      if (!landscape.libraries.U.assertGlyphs(face.family, cjkCaption, 'Art Motion browser proof')) throw new Error(`font ${face.family} misses proof caption glyphs`);
    }
    const declaredClipFonts = [...new Set(Object.values(landscape.clips).flatMap(clip => clip.fonts || []))];
    if (declaredClipFonts.some(family => !fontFaces.some(face => face.family === family))) throw new Error('a clip would use an unregistered fallback font');
    let cmapNeedsFaces = false;
    try { await landscape.libraries.U.loadCmaps(); } catch (error) { cmapNeedsFaces = /explicit font-face array/.test(error.message); }
    if (!cmapNeedsFaces) throw new Error('font cmap loader did not require explicit caller faces');
    let cmapFailureSurfaces = false;
    try { await landscape.libraries.U.loadCmaps([{ family: 'invalid-proof-face', url: 'data:text/plain,not-a-font' }]); } catch { cmapFailureSurfaces = true; }
    if (!cmapFailureSurfaces) throw new Error('explicit font cmap read failure was silently swallowed');
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
    canvas.id = 'landscape-proof';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const stats = c => {
      const pixels = c.getImageData(0, 0, c.canvas.width, c.canvas.height).data;
      let visible = 0, colored = 0;
      for (let i = 0; i < pixels.length; i += 4) { if (pixels[i + 3]) visible++; if (pixels[i] || pixels[i + 1] || pixels[i + 2]) colored++; }
      return { visible, colored };
    };
    const scenes = [];
    for (const id of landscape.sceneIds) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.37;
      landscape.drawScene(id, ctx, 0.42);
      if (landscape.libraries.__time !== 0.42) throw new Error(`scene ${id} did not update runtime time before drawing`);
      if (ctx.globalAlpha !== 0.37) throw new Error(`scene ${id} leaked canvas state`);
      const value = stats(ctx);
      if (value.visible < 50) throw new Error(`scene ${id} rendered no meaningful pixels`);
      scenes.push({ id, ...value });
    }
    const scene = '12_bauhaus';
    const frame = time => { ctx.clearRect(0, 0, 640, 360); landscape.drawScene(scene, ctx, time); return Array.from(ctx.getImageData(0, 0, 640, 360).data); };
    const first = frame(1.375); frame(0.25); const reordered = frame(1.375);
    if (first.some((channel, i) => channel !== reordered[i])) throw new Error('scene frame changed when rendered after a later/earlier time');
    const pCanvas = document.createElement('canvas'); pCanvas.width = 360; pCanvas.height = 640;
    pCanvas.id = 'portrait-proof';
    const pCtx = pCanvas.getContext('2d'); portrait.drawScene(scene, pCtx, 1.375);
    const portraitStats = stats(pCtx);
    if (portraitStats.visible < 50) throw new Error('portrait scene composition did not render');
    if (landscape.libraries === portrait.libraries || landscape.libraries.U === portrait.libraries.U) throw new Error('runtime libraries were shared across instances');
    if (landscape.libraries.STAGE.W !== 640 || landscape.libraries.STAGE.H !== 360 || portrait.libraries.STAGE.W !== 360 || portrait.libraries.STAGE.H !== 640)
      throw new Error('stage dimensions leaked between runtime instances');
    try { landscape.libraries.U.setStage(360, 640); throw new Error('resize was unexpectedly accepted'); } catch (error) { if (!/dimensions are fixed/.test(error.message)) throw error; }

    const clips = [];
    for (const file of exampleFiles) {
      const spec = structuredClone(file);
      spec.width = 640; spec.height = 360;
      ctx.clearRect(0, 0, 640, 360);
      ctx.globalAlpha = 0.41;
      landscape.drawClip(spec.grammar, ctx, 0.4, spec);
      if (landscape.libraries.__time !== 0.4) throw new Error(`clip ${spec.grammar} did not update runtime time before drawing`);
      if (ctx.globalAlpha !== 0.41) throw new Error(`clip ${spec.grammar} leaked canvas state`);
      const value = stats(ctx);
      if (value.visible < 20) throw new Error(`clip ${spec.grammar} rendered no meaningful pixels`);
      clips.push({ id: spec.grammar, ...value });
    }
    const invalidCases = [
      ['unknown top-level key', { ...structuredClone(exampleFiles[0]), surprise: true }, /Unknown clipSpec key/],
      ['malformed safe object', { ...structuredClone(exampleFiles[0]), safe: 'bad' }, /safe must be a plain object/],
      ['nonpositive safe box', { ...structuredClone(exampleFiles[0]), safe: { left: 640 } }, /nonpositive content box/],
      ['cue at duration', { ...structuredClone(exampleFiles[0]), cues: [{ at: 10, kind: 'title' }] }, /at in \[0,duration\)/],
      ['nonpositive cue duration', { ...structuredClone(exampleFiles[0]), cues: [{ at: 1, kind: 'title', dur: 0 }] }, /dur must be > 0/],
      ['cue duration past clip end', { ...structuredClone(exampleFiles[0]), cues: [{ at: 9.5, kind: 'title', dur: 1 }] }, /end within clip duration/],
      ['unparseable safe fill', { ...structuredClone(exampleFiles[0]), safe: { top: 20, fill: 'not-a-color' } }, /safe\.fill must be a CSS color/],
      ['fully transparent safe fill', { ...structuredClone(exampleFiles[0]), safe: { top: 20, fill: 'transparent' } }, /safe\.fill is fully transparent/],
      ['zero-alpha safe fill', { ...structuredClone(exampleFiles[0]), safe: { top: 20, fill: 'rgba(255, 0, 255, 0)' } }, /safe\.fill is fully transparent/],
    ];
    for (const [name, raw, expected] of invalidCases) {
      const malformed = { ...raw, width: 640, height: 360 };
      let rejected = false;
      try { landscape.drawClip(malformed.grammar, ctx, 0.2, malformed); } catch (error) { rejected = expected.test(error.message); }
      if (!rejected) throw new Error(`clipSpec validation failed to reject ${name}`);
    }
    const noFontRuntime = createArtMotionRuntime({
      width: 640, height: 360, fps: 30,
      createCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; },
      capabilities: { Path2D, DOMMatrix, DOMPoint }, assets: {}, fonts: [], seed: 23,
    });
    let missingClipFontRejected = false;
    try { noFontRuntime.drawClip(exampleFiles[0].grammar, ctx, 0.4, { ...structuredClone(exampleFiles[0]), width: 640, height: 360 }); }
    catch (error) { missingClipFontRejected = /requires font family .*provide it in runtime fonts/.test(error.message); }
    noFontRuntime.dispose();
    if (!missingClipFontRejected) throw new Error('selected clip silently accepted a missing declared font family');

    const transitions = [], from = document.createElement('canvas'), to = document.createElement('canvas');
    const transitionCanvas = document.createElement('canvas'); transitionCanvas.width = 640; transitionCanvas.height = 360;
    const transitionCtx = transitionCanvas.getContext('2d');
    from.width = to.width = 640; from.height = to.height = 360;
    const a = from.getContext('2d'), b = to.getContext('2d');
    a.fillStyle = '#c31d45'; a.fillRect(0, 0, 640, 360); b.fillStyle = '#1a6bc3'; b.fillRect(0, 0, 640, 360);
    for (const id of landscape.transitionIds) {
      transitionCtx.clearRect(0, 0, 640, 360);
      const options = { id: `proof-${id}`, t: 2.4, lt: 0.5, cx: 320, cy: 180,
        lens: () => ({ x: 320, y: 180, r: 180 }),
        rect: { x: 220, y: 110, w: 200, h: 140 },
        focus: [320, 180], zoom: 3, maxZoom: 3, live: true,
        ease: landscape.libraries.MO.smooth, fill: '#1a6bc3', colors: ['#c31d45', '#1a6bc3'] };
      landscape.transition(id, transitionCtx, from, to, 0.5, options);
      const value = stats(transitionCtx);
      if (value.visible < 50) throw new Error(`transition ${id} rendered no meaningful pixels`);
      transitions.push({ id, ...value });
    }
    const fresh = makeRuntime(640, 360);
    if (fresh.libraries.TOON) throw new Error('demo character art loaded without selecting a sample');
    const storytime = structuredClone(exampleFiles.find(spec => spec.grammar === 'y4_storytime'));
    storytime.width = 640; storytime.height = 360;
    const freshCanvas = document.createElement('canvas'); freshCanvas.width = 640; freshCanvas.height = 360;
    fresh.drawClip('y4_storytime', freshCanvas.getContext('2d'), 0.4, storytime);
    if (!fresh.libraries.TOON) throw new Error('selected storytime clip did not load its optional character methods');
    const optIn = makeRuntime(640, 360);
    if (optIn.libraries.TOON) throw new Error('demo character art loaded before enableDemoArt');
    const demoArt = optIn.enableDemoArt();
    if (Object.keys(demoArt).join() !== 'TOON' || !demoArt.TOON || optIn.libraries.TOON !== demoArt.TOON) throw new Error('enableDemoArt did not return exactly the loaded TOON namespace');
    optIn.dispose();
    document.body.appendChild(pCanvas);
    fresh.dispose(); landscape.dispose(); portrait.dispose();
    return { moduleKeys, browser: navigator.userAgent, sceneCount: scenes.length, clipCount: clips.length,
      transitionCount: transitions.length, scenes, clips, transitions, portrait: portraitStats, reorderedFrameStable: true, explicitSampleSelection: true,
      noHostGlobalLeak: true, fontFacesExplicit: true, clipSpecStrict: true, contextsRestored: true, loadedFamilies: requiredFamilies,
      cjkCaption, registeredClipFonts: declaredClipFonts };
  }, { exampleFiles, fontFaces });

  assert.deepEqual(browserErrors, [], `unexpected browser errors: ${browserErrors.join('; ')}`);
  result.browserErrors = browserErrors;
  await (await page.$('#landscape-proof')).screenshot({ path: path.join(PROOF, 'art-motion-landscape.png') });
  await (await page.$('#portrait-proof')).screenshot({ path: path.join(PROOF, 'art-motion-portrait.png') });
  fs.writeFileSync(path.join(PROOF, 'browser-proof.json'), `${JSON.stringify(result, null, 2)}\n`);
  assert.deepEqual(result.moduleKeys, ['createArtMotionRuntime']);
  assert.equal(result.sceneCount, 35);
  assert.equal(result.clipCount, 8);
  assert.ok(result.transitionCount >= 40, `expected the complete transition registry, received ${result.transitionCount}`);
  assert.equal(result.reorderedFrameStable, true);
  assert.equal(result.explicitSampleSelection, true);
  assert.equal(result.noHostGlobalLeak, true);
  assert.equal(result.fontFacesExplicit, true);
  assert.equal(result.clipSpecStrict, true);
  assert.equal(result.contextsRestored, true);
  assert.equal(result.cjkCaption, 'AI 写代码：中文');
  await t.diagnostic(`Art Motion browser proof: ${result.sceneCount} scenes, ${result.clipCount} clips, ${result.transitionCount} transitions; portrait+landscape and independent instances passed.`);
});
