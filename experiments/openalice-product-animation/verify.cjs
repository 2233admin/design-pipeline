// Target-only evidence: the composition contract, persistent research, and delivered MP4.
// Normal-speed semantic/visual acceptance remains a separate human review.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = __dirname, out = path.join(root, 'output');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const mime = { '.html':'text/html', '.js':'text/javascript', '.mp4':'video/mp4', '.png':'image/png' };
function command(bin, args) {
  const result = spawnSync(bin, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, `${bin}: ${result.stderr || result.error || result.stdout}`);
  return result.stdout;
}
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
  const size = fs.statSync(file).size;
  const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  const headers = {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Accept-Ranges':'bytes'};
  if (range) {
    const start = Number(range[1]), end = Math.min(size - 1, range[2] ? Number(range[2]) : size - 1);
    if (start > end) {res.writeHead(416, {'Content-Range':`bytes */${size}`});res.end();return;}
    res.writeHead(206, {...headers, 'Content-Range':`bytes ${start}-${end}/${size}`, 'Content-Length':end - start + 1});
    fs.createReadStream(file, {start, end}).pipe(res);
  } else {
    res.writeHead(200, {...headers, 'Content-Length':size});fs.createReadStream(file).pipe(res);
  }
});
async function verifySnapshots(page) {
  const inspect = () => page.evaluate(() => {
    const normalize = element => element?.innerText.replace(/\s+/g, ' ').trim() ?? null;
    function visible(element) {
      if (!element) return false;
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) return false;
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (Number(style.opacity) < .99 || style.visibility !== 'visible' || style.display === 'none') return false;
      }
      return [.2,.5,.8].some(x => [.2,.5,.8].some(y => {
        const painted = document.elementsFromPoint(box.left + box.width * x, box.top + box.height * y).find(hit => {
          let opacity = 1;for(let ancestor = hit; ancestor; ancestor = ancestor.parentElement)opacity *= Number(getComputedStyle(ancestor).opacity);
          return opacity > .01;
        });
        return element.contains(painted);
      }));
    }
    function content(root, findingSelector, citationSelector) {
      const heading = root?.querySelector('h1'), question = root?.querySelector('.question');
      const finding = root?.querySelector(findingSelector), citation = root?.querySelector(citationSelector);
      return {exists:!!root, visible:visible(root), heading:{text:normalize(heading),visible:visible(heading)},
        question:{text:normalize(question),visible:visible(question)}, finding:{text:normalize(finding),visible:visible(finding)},
        citation:{text:normalize(citation),visible:visible(citation),source:citation?.querySelector('[data-source]')?.dataset.source ?? null}};
    }
    return {time:window.film.timeline.time(), original:content(document.querySelector('#research'),'#finding','#citation'),
      v01:content(document.querySelector('#version-original .snapshot'),'.finding-copy','.citation-copy'),
      v02:content(document.querySelector('#version-saved .snapshot'),'.finding-copy','.citation-copy'),
      inbox:content(document.querySelector('.attachment-preview .snapshot'),'.finding-copy','.citation-copy')};
  });
  function check(evidence) {
    for (const name of ['v01','v02','inbox']) {
      const snapshot = evidence[name];
      assert(snapshot.exists && snapshot.visible, name + ' snapshot must be visible');
      for (const field of ['heading','question']) {
        assert(snapshot[field].visible, name + ' must show its research ' + field);
        assert.equal(snapshot[field].text, evidence.original[field].text, name + ' must reference the same research');
      }
    }
    assert.equal(evidence.v01.finding.text, null, 'v01 must retain the pre-finding research question');
    assert.equal(evidence.v01.citation.text, null, 'v01 must not contain the later citation');
    for (const name of ['v02','inbox']) {
      const snapshot = evidence[name];
      assert(snapshot.finding.visible, name + ' snapshot must show its finding');
      assert.equal(snapshot.finding.text, evidence.original.finding.text, name + ' finding must match the retained research');
      assert(snapshot.citation.visible, name + ' snapshot must show its source');
      assert.equal(snapshot.citation.text, evidence.original.citation.text);
      assert.equal(snapshot.citation.source, evidence.original.citation.source);
    }
  }
  const baseline = await inspect();check(baseline);
  const mutations = [];
  for (const [selector, expected] of [['#version-saved .evidence-copy','v02 snapshot must show its finding'],['.attachment-preview .snapshot','inbox snapshot must be visible']]) {
    const removed = await page.evaluateHandle(selector => {
      const node = document.querySelector(selector);
      if (!node) throw new Error('Missing mutation target: ' + selector);
      const position = {node,parent:node.parentNode,next:node.nextSibling};node.remove();return position;
    }, selector);
    try {
      let failure = '';
      try {check(await inspect());} catch(error) {failure = error.message;}
      assert(failure.includes(expected), 'Consumer assertion must reject removed ' + selector);
      mutations.push({selector,rejected:true,failure});
    } finally {
      await removed.evaluate(({node,parent,next}) => {parent.insertBefore(node,next);});await removed.dispose();
    }
    check(await inspect());
  }
  return {baseline,mutations};
}
async function verifyPlayerRecovery(browser, origin) {
  const context = await browser.newContext({reducedMotion:'no-preference'});
  try {
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/index.html', route => route.fulfill({status:404,contentType:'text/html',body:'Composition not found'}));
    await page.goto(origin + '/preview.html');
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Timeline unavailable.');
    const missing = await page.locator('#motion-note').textContent();assert.match(missing,/composition did not initialize/i);
    assert(await page.locator('nav button').evaluateAll(buttons => buttons.every(button => button.disabled)));
    await page.unroute('**/index.html');
    await page.evaluate(() => {document.querySelector('#film').contentWindow.location.reload();});
    await page.waitForFunction(() => document.querySelector('#film').contentWindow.film?.timeline.time() > 0);
    const crossOrigin = new URL(origin);crossOrigin.hostname = 'localhost';
    const inaccessible = crossOrigin.origin + '/inaccessible.html';
    await page.route(inaccessible, route => route.fulfill({contentType:'text/html',body:'Separate origin'}));
    await page.evaluate(url => {document.querySelector('#film').src = url;}, inaccessible);
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Timeline unavailable.');
    const inaccessibleNote = await page.locator('#motion-note').textContent();assert.match(inaccessibleNote,/same HTTP origin/);
    assert(await page.locator('nav button').evaluateAll(buttons => buttons.every(button => button.disabled)));
    await page.evaluate(() => {document.querySelector('#film').src = 'index.html';});
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Step '));
    await page.evaluate(() => {window.retainedFilm = document.querySelector('#film').contentWindow.film;window.retainedFilm.timeline.pause(0);document.activeElement.blur();});
    const tabStops = [];
    for (let index = 0; index < 10; index++) {
      await page.keyboard.press('Tab');
      const stop = await page.evaluate(() => ({tag:document.activeElement.tagName,id:document.activeElement.id}));
      assert.notEqual(stop.tag,'IFRAME');tabStops.push(stop);
    }
    const source = 'https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2025';
    await context.route(source, route => route.fulfill({contentType:'text/html',body:'Local interception of source navigation'}));
    await page.locator('summary').click();
    const popupPromise = page.waitForEvent('popup');await page.locator('a[href="' + source + '"]').click();
    const popup = await popupPromise;await popup.waitForLoadState();assert.equal(popup.url(),source);await popup.close();
    assert(await page.evaluate(() => document.querySelector('#film').contentWindow.film === window.retainedFilm));
    assert.equal(page.url(),origin + '/preview.html');
    await page.goto(require('node:url').pathToFileURL(path.join(root,'preview.html')).href);
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Timeline unavailable.');
    const fileNote = await page.locator('#motion-note').textContent();assert.match(fileNote,/Serve this directory over HTTP/);
    assert(await page.locator('nav button').evaluateAll(buttons => buttons.every(button => button.disabled)));
    assert.deepEqual(errors,[]);

    await page.route('**/output/openalice.mp4', route => route.fulfill({status:404,body:'Not found'}));
    await page.goto(origin + '/watch.html');
    await page.waitForFunction(() => Boolean(document.querySelector('#encoded').error));
    const mediaError = await page.locator('#playback-note').textContent();assert.match(mediaError,/unavailable/);
    for (const reducedMotion of ['reduce','no-preference','reduce']) {
      await page.emulateMedia({reducedMotion});await page.waitForTimeout(50);
      assert.equal(await page.locator('#playback-note').textContent(),mediaError);
    }
    await page.unroute('**/output/openalice.mp4');await page.evaluate(() => {document.querySelector('#encoded').load();});
    await page.waitForFunction(() => {const video = document.querySelector('#encoded');return !video.error && video.readyState >= 3 && !video.seeking && video.currentTime === video.duration;});
    const recovered = await page.locator('#playback-note').textContent();assert.match(recovered,/paused ending/);assert.doesNotMatch(recovered,/unavailable/);
    await page.evaluate(() => {document.querySelector('#encoded').currentTime = 1;});
    await page.waitForFunction(() => !document.querySelector('#encoded').seeking);await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => document.querySelector('#encoded').currentTime),1,'Manual seeking must not reset to the ending on canplay');
    // Isolate unavailable seek-range facts without relying on browser cache/server heuristics.
    await page.evaluate(() => {
      const video = document.querySelector('#encoded');
      Object.defineProperty(video, 'seekable', {configurable:true,value:{length:1,start:() => 0,end:() => 0}});
      video.currentTime = 0;
    });
    await page.waitForFunction(() => !document.querySelector('#encoded').seeking);
    const noRange = await page.evaluate(() => {const video = document.querySelector('#encoded');return {readyState:video.readyState,duration:video.duration,time:video.currentTime,paused:video.paused,seekable:[video.seekable.start(0),video.seekable.end(0)],note:document.querySelector('#playback-note').textContent};});
    assert(noRange.readyState >= 3 && noRange.duration > 0 && noRange.paused && noRange.time === 0);
    assert.deepEqual(noRange.seekable,[0,0]);assert.match(noRange.note,/server does not support seeking/);assert.match(noRange.note,/Download the MP4 and open it locally/);
    await page.waitForTimeout(200);assert.equal(await page.evaluate(() => document.querySelector('#encoded').currentTime),0);
    await page.evaluate(() => {const video = document.querySelector('#encoded');delete video.seekable;video.currentTime = video.duration;});
    await page.waitForFunction(() => {const video = document.querySelector('#encoded');return !video.seeking && video.currentTime === video.duration;});
    assert.doesNotMatch(await page.locator('#playback-note').textContent(),/server does not support seeking/);
    await page.close();

    const blocked = await context.newPage();await blocked.emulateMedia({reducedMotion:'no-preference'});
    await blocked.addInitScript(() => {
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function(){HTMLMediaElement.prototype.play = play;return Promise.reject(new DOMException('Autoplay blocked for verification','NotAllowedError'));};
    });
    await blocked.goto(origin + '/watch.html');
    await blocked.waitForFunction(() => document.querySelector('#playback-note').textContent.includes('Use Play to start'));
    const blockedNote = await blocked.locator('#playback-note').textContent();
    await blocked.evaluate(async() => {await document.querySelector('#encoded').play();});
    await blocked.waitForFunction(() => document.querySelector('#encoded').currentTime > .1 && !document.querySelector('#encoded').paused);
    const playingNote = await blocked.locator('#playback-note').textContent();assert.doesNotMatch(playingNote,/Use Play to start/);
    return {missing,inaccessibleNote,fileNote,tabStops,sourcePopupPreservesComposition:true,mediaError,errorSurvivesPreferenceChanges:true,recovered,manualSeekRetained:true,noRange,blockedNote,playingNote};
  } finally {await context.close();}
}
async function seekPresentedTerminalFrame(page, fps) {
  return page.evaluate(fps => new Promise((resolve, reject) => {
    const video = document.querySelector('#encoded');
    if (typeof video.requestVideoFrameCallback !== 'function') {reject(new Error('Terminal capture requires requestVideoFrameCallback.'));return;}
    if (!Number.isFinite(video.duration)) {reject(new Error('Terminal capture requires a finite duration.'));return;}
    const targetTime = Math.max(0, video.duration - .25), minimumMediaTime = Math.max(0, video.duration - 1 / fps - .001);
    let callbackId, timeout, seeked = false;
    const cleanup = () => {clearTimeout(timeout);video.removeEventListener('seeked', onSeeked);if (callbackId !== undefined && typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(callbackId);};
    const fail = message => {cleanup();reject(new Error(message));};
    const onFrame = (_now, metadata) => {
      if (seeked && metadata.mediaTime >= minimumMediaTime) {
        video.pause();cleanup();resolve({seeked,targetTime,minimumMediaTime,mediaTime:metadata.mediaTime,presentedFrames:metadata.presentedFrames,currentTime:video.currentTime,paused:video.paused});
      } else callbackId = video.requestVideoFrameCallback(onFrame);
    };
    const onSeeked = () => {seeked = true;callbackId = video.requestVideoFrameCallback(onFrame);video.play().catch(error => fail('Unable to present a terminal video frame: ' + error.message));};
    video.pause();video.addEventListener('seeked', onSeeked, {once:true});
    timeout = setTimeout(() => fail(`Timed out waiting for a terminal video frame at ${targetTime}s.`), 3000);
    video.currentTime = targetTime;
  }), fps);
}

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({headless:true, ...(process.env.HYPERFRAMES_BROWSER_PATH ? { executablePath: process.env.HYPERFRAMES_BROWSER_PATH } : {})});
    const context = await browser.newContext({viewport:{width:1360,height:940},reducedMotion:'no-preference'});
    const errors = [], remote = [];
    context.on('page', page => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
    });
    context.on('request', request => {if (!request.url().startsWith(origin)) remote.push(request.url());});
    const publicPage = await context.newPage();
    await publicPage.goto(origin + '/index.html');
    await publicPage.waitForFunction(() => Boolean(window.film?.timeline));
    const publicSurface = await publicPage.evaluate(() => {
      const film = window.film;
      return { motionGraph: '__motionGraph' in window, testHook: '__openaliceTestHook' in window,
        film: { keys: Object.keys(film).sort(), duration: film.duration, starts: film.starts, sameTimeline: film.timeline === window.__timelines.openalice },
        timelines: { keys: Object.keys(window.__timelines).sort() } };
    });
    assert.equal(publicSurface.motionGraph, false, 'window.__motionGraph must not be a public API');
    assert.equal(publicSurface.testHook, false, 'The test hook must not exist in an ordinary page');
    assert.deepEqual(publicSurface.film.keys, ['duration','sceneAt','starts','timeline']);
    assert.deepEqual(publicSurface.timelines.keys, ['openalice']);
    assert(publicSurface.film.sameTimeline);
    await publicPage.close();
    const composition = await context.newPage();
    await composition.addInitScript(() => Object.defineProperty(window, '__openaliceVerifier', { value: true, enumerable: false, configurable: false }));
    await composition.goto(origin + '/index.html');
    await composition.waitForFunction(() => Boolean(window.film?.timeline));
    const contract = await composition.evaluate(() => {
      const element = document.querySelector('#openalice'), film = window.film, hookDescriptor = Object.getOwnPropertyDescriptor(window, '__openaliceTestHook'), hook = window.__openaliceTestHook, graph = hook?.motionGraph;
      const beatBoundaries = graph?.beats?.map((beat, index) => {
        const before = index ? Math.max(0, beat.start - 1 / Number(element.dataset.fps)) : null;
        if (before !== null) film.timeline.seek(before);
        const beforeScene = before === null ? null : film.sceneAt(film.timeline.time());
        const after = Math.min(film.duration, beat.start + 1 / Number(element.dataset.fps));
        film.timeline.seek(after);
        return { id: beat.id, start: beat.start, end: beat.end, before, beforeScene, after, afterScene: film.sceneAt(film.timeline.time()) };
      }) ?? [];
      const springTracks = graph?.tracks?.filter(track => track.response?.primitive === 'response.spring-settle') ?? [];
      const springs = springTracks.map(track => {
        film.timeline.seek(track.start + track.duration);
        const target = document.querySelector(track.target);
        const settled = Object.fromEntries(Object.keys(track.to).map(key => [key, Number.parseFloat(gsap.getProperty(target, key))]));
        return { id: track.id, response: track.response, startProgress: hook.springProgress(0, track.response), endProgress: hook.springProgress(1, track.response), target: track.to, settled };
      });
      film.timeline.seek(0);
      return {
        duration:film.duration, declaredDuration:Number(element.dataset.duration), timelineDuration:film.timeline.duration(),
        width:Number(element.dataset.width), height:Number(element.dataset.height), fps:Number(element.dataset.fps),
        starts:film.starts, paused:film.timeline.paused(), registry:Object.keys(window.__timelines),
        registeredTimeline:window.__timelines.openalice === film.timeline, legacyScenes:document.querySelectorAll('.scene').length,
        testHook:{exists:!!hookDescriptor, enumerable:hookDescriptor?.enumerable ?? null, keys:hook ? Object.keys(hook).sort() : [], frozen:hook ? Object.isFrozen(hook) : false},
        graph:{schema:graph?.schema, composition:graph?.composition, starts:graph?.starts, beats:graph?.beats?.map(({id,start,end}) => ({id,start,end})), beatIds:graph?.beats?.map(beat => beat.id), trackIds:graph?.tracks?.map(track => track.id), springTrackIds:springTracks.map(track => track.id), sharedAnchorTrackIds:graph?.tracks?.filter(track => track.target === '#evidence-trace' && track.from && track.to).map(track => track.id)},
        beatBoundaries, springs
      };
    });
    assert(contract.testHook.exists && !contract.testHook.enumerable && contract.testHook.frozen, 'The verifier hook must be non-enumerable and test-only');
    assert.deepEqual(contract.testHook.keys, ['motionGraph','springProgress']);
    assert.equal(contract.graph.schema, 'design-pipeline.motion-graph.v1');
    assert.equal(contract.graph.composition, 'evidence-lineage-map');
    assert.deepEqual(contract.graph.starts, contract.starts);
    assert.deepEqual(contract.graph.beatIds, ['orient','extract','retain','reference','inspect','review']);
    assert(contract.graph.trackIds.includes('trace-to-retain') && contract.graph.trackIds.includes('trace-to-reference'));
    assert.deepEqual(contract.graph.sharedAnchorTrackIds, ['trace-to-retain','trace-to-reference']);
    assert(contract.graph.springTrackIds.includes('trace-to-retain') && contract.graph.springTrackIds.includes('trace-to-reference'));
    assert.equal(contract.graph.beats[0].start, 0);
    assert.equal(contract.graph.beats.at(-1).end, contract.duration);
    assert(contract.graph.beats.every((beat, index, beats) => beat.start < beat.end && (!index || beats[index - 1].end === beat.start)), 'Beat boundaries must be contiguous, ordered, and non-overlapping');
    for (const [index, beat] of contract.beatBoundaries.entries()) {
      assert.equal(beat.afterScene, index, `Beat ${beat.id} must be active immediately after its boundary`);
      if (index) assert.equal(beat.beforeScene, index - 1, `The prior beat must remain active immediately before ${beat.id}`);
    }
    for (const spring of contract.springs) {
      const { response } = spring;
      assert(response.stiffness >= 20 && response.stiffness <= 30 && response.damping >= 7 && response.damping <= 8 && response.initialVelocity === 0 && response.settleThreshold > 0 && response.settleThreshold <= .01 && response.segments >= 12 && response.segments <= 24, `Unbounded spring parameters for ${spring.id}`);
      assert(Math.abs(spring.startProgress) < 1e-6 && Math.abs(spring.endProgress - 1) < 1e-6, `Spring endpoint must settle exactly for ${spring.id}`);
      for (const [key, target] of Object.entries(spring.target)) assert(Math.abs(spring.settled[key] - target) < 1e-6, `Spring target ${spring.id}.${key} must settle exactly`);
    }
    assert(contract.duration > 0 && contract.fps > 0);
    assert.equal(contract.duration, contract.declaredDuration);
    assert.equal(contract.timelineDuration, contract.duration);
    assert(contract.paused && contract.registeredTimeline);
    assert.deepEqual(contract.registry, ['openalice']);
    assert.equal(contract.legacyScenes, 0);
    assert.equal(contract.starts[0], 0);
    assert(contract.starts.every((start, index) => start < contract.duration && (!index || start > contract.starts[index - 1])));

    // Compare the declared composition with the actual delivered file; no sample fallback.
    const probe = JSON.parse(command('ffprobe', ['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,r_frame_rate,nb_frames,duration:format=duration,size','-of','json','output/openalice.mp4']));
    const video = probe.streams[0];
    const [numerator, denominator] = video.r_frame_rate.split('/').map(Number);
    const expectedFrames = Math.round(contract.duration * contract.fps);
    assert.equal(video.width, contract.width);assert.equal(video.height, contract.height);
    assert.equal(numerator / denominator, contract.fps);
    assert.equal(Number(video.nb_frames), expectedFrames);
    assert(Math.abs(Number(video.duration) - contract.duration) < 1 / contract.fps);
    assert(Math.abs(Number(probe.format.duration) - contract.duration) < 1 / contract.fps);
    command('ffmpeg', ['-v','error','-i','output/openalice.mp4','-f','null','-']);

    // Sample every encoded-frame time so transition visibility is not inferred from stage labels.
    const provenance = await composition.evaluate(({expectedFrames, fps, duration}) => {
      const ids = ['workspace','research','session-research','finding','citation','version-original','version-saved','inbox-report','review-boundary'];
      const originals = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
      if (ids.some(id => !originals[id])) throw new Error('Missing persistent research object');
      const root = document.querySelector('#openalice');
      function observe(element) {
        const surface = element.querySelector(':scope > .snapshot') || element;
        const box = surface.getBoundingClientRect(), viewport = root.getBoundingClientRect();
        let opacity = 1, displayed = true;
        for (let ancestor = surface; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          opacity *= Number(style.opacity);
          if (style.display === 'none' || style.visibility !== 'visible') displayed = false;
        }
        const width = Math.max(0, Math.min(box.right, viewport.right) - Math.max(box.left, viewport.left));
        const height = Math.max(0, Math.min(box.bottom, viewport.bottom) - Math.max(box.top, viewport.top));
        const fraction = box.width * box.height ? width * height / (box.width * box.height) : 0;
        const exposed = [.15,.5,.85].some(x => [.15,.5,.85].some(y => {
          const px = box.left + box.width * x, py = box.top + box.height * y;
          const painted = document.elementsFromPoint(px, py).find(hit => {
            let opacity = 1;for(let ancestor = hit; ancestor; ancestor = ancestor.parentElement)opacity *= Number(getComputedStyle(ancestor).opacity);
            return opacity > .01;
          });
          return px >= viewport.left && px < viewport.right && py >= viewport.top && py < viewport.bottom && surface.contains(painted);
        }));
        return {visible:displayed && opacity > .99 && fraction > .1 && exposed, opacity, visibleFraction:fraction, exposed};
      }
      const samples = [];
      for (let frame = 0; frame <= expectedFrames; frame++) {
        const time = Math.min(duration, frame / fps);
        window.film.timeline.seek(time);
        samples.push({time, sameObjects:ids.every(id => originals[id] === document.getElementById(id) && document.querySelectorAll(`#${id}`).length === 1),
          inWorkspace:['research','session-research','version-original','version-saved'].every(id => originals.workspace.contains(originals[id])),
          inResearch:originals.research.contains(originals.finding) && originals.research.contains(originals.citation),
          objects:Object.fromEntries(ids.map(id => [id, observe(originals[id])]))});
      }
      const citation = originals.citation.querySelector('[data-source]');
      const report = originals['inbox-report'];
      return {
        samples,
        researchText:originals.research.textContent.replace(/\s+/g, ' ').trim(),
        findingText:originals.finding.textContent.replace(/\s+/g, ' ').trim(),
        citation:{text:citation?.textContent.trim(), source:citation?.dataset.source},
        reportReferencesResearch:report.querySelector('[data-reference="research"]')?.dataset.reference === originals.research.id,
        reportReferencesSession:report.querySelector('[data-reference="session-research"]')?.dataset.reference === originals['session-research'].id,
        interactiveElements:root.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])').length,
        boundary:[...originals['review-boundary'].children].map(element => element.textContent.trim()),
        originalVersion:originals['version-original'].textContent.trim(), savedVersion:originals['version-saved'].textContent.trim()
      };
    }, {expectedFrames, fps:contract.fps, duration:contract.duration});
    assert(provenance.samples.every(sample => sample.sameObjects && sample.inWorkspace && sample.inResearch && sample.objects.research.visible), 'The original research must stay visible with its evidence, Session and versions retained in its Workspace');
    assert.match(provenance.researchText, /NVIDIA/);assert.match(provenance.researchText, /Data.center revenue/i);
    assert.match(provenance.findingText, /FY2025/);assert.match(provenance.findingText, /\$115\.2B/);assert.match(provenance.findingText, /\+142%/);
    assert.equal(provenance.citation.source, 'https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2025');
    assert.match(provenance.citation.text, /26 Feb 2025/);
    const firstVisible = {};
    for (const id of ['finding','citation','version-original','version-saved','inbox-report']) {
      const index = provenance.samples.findIndex(sample => sample.objects[id].visible);
      assert(index >= 0, `${id} must become visible`);
      firstVisible[id] = provenance.samples[index].time;
      assert(provenance.samples.slice(index).every(sample => sample.objects[id].visible), `${id} must remain visible after it appears`);
    }
    assert(!provenance.samples[0].objects['version-saved'].visible && !provenance.samples[0].objects['inbox-report'].visible);
    assert(firstVisible.citation <= firstVisible.finding);
    assert(firstVisible.finding < firstVisible['version-saved']);
    assert(firstVisible['version-original'] <= firstVisible['version-saved']);
    assert(firstVisible['version-saved'] < firstVisible['inbox-report']);
    assert(provenance.reportReferencesResearch && provenance.reportReferencesSession, 'Inbox must reference the original research and Session');
    assert(provenance.samples.at(-1).objects['review-boundary'].visible, 'Full film must end at the review boundary');
    assert.deepEqual(provenance.boundary, ['Ready for your review','No trade placed']);
    assert.equal(provenance.interactiveElements, 0, 'Artwork must not contain interactive navigation');

    // Direct final/backward/forward seeks must restore both pre-action and post-action pixels.
    const seekTimes = [...new Set([0, firstVisible.finding, firstVisible['version-saved'], firstVisible['inbox-report'], contract.duration])];
    const deterministicSeek = [];
    for (const time of seekTimes) {
      await composition.evaluate(at => {window.film.timeline.seek(at);}, time);
      const before = sha(await composition.locator('#openalice').screenshot());
      await composition.evaluate(({duration, at}) => {window.film.timeline.seek(duration);window.film.timeline.seek(0);window.film.timeline.seek(at);}, {duration:contract.duration, at:time});
      const after = sha(await composition.locator('#openalice').screenshot());
      assert.equal(before, after, `Non-deterministic seek at ${time}s`);
      deterministicSeek.push({time,before,after});
    }
    const snapshotFidelity = await verifySnapshots(composition);
    const reviewSafety = await composition.evaluate(() => {
      const root = document.querySelector('#openalice'), footer = document.querySelector('#review-boundary');
      window.film.timeline.seek(window.film.duration);
      const rootBox = root.getBoundingClientRect(), footerBox = footer.getBoundingClientRect(), reservedTop = rootBox.bottom - 210;
      const strings = [...footer.children].map(node => { const box = node.getBoundingClientRect(); return { text:node.textContent.trim(), left:box.left, top:box.top, right:box.right, bottom:box.bottom }; });
      const protectedNodes = ['#research','#version-original','#version-saved','#inbox'].map(selector => ({selector,node:document.querySelector(selector)})).concat([...document.querySelectorAll('.version-name')].map((node, index) => ({selector:'.version-name[' + index + ']',node})));
      const intersects = (left, right) => left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
      return { reservedPixels:210, root:{left:rootBox.left,top:rootBox.top,right:rootBox.right,bottom:rootBox.bottom}, reservedTop, footer:{left:footerBox.left,top:footerBox.top,right:footerBox.right,bottom:footerBox.bottom}, strings, overlaps:protectedNodes.filter(({node}) => node && intersects(footerBox, node.getBoundingClientRect())).map(({selector}) => selector) };
    });
    assert.deepEqual(reviewSafety.strings.map(item => item.text), ['Ready for your review','No trade placed']);
    assert(reviewSafety.strings.every(item => item.bottom <= reviewSafety.reservedTop + 1e-4), 'Terminal review text must remain above the 210 authored-pixel controls region.');
    assert.deepEqual(reviewSafety.overlaps, [], 'The review footer must not cover research, retained versions, or Inbox content.');
    const endingLayoutPath = 'output/polish-ending-layout.png';
    await composition.locator('#openalice').screenshot({path:path.join(root, endingLayoutPath)});
    reviewSafety.capture = { path:endingLayoutPath, sha256:sha(fs.readFileSync(path.join(root, endingLayoutPath))) };
    await composition.close();
    const playerRecovery = await verifyPlayerRecovery(browser, origin);

    // Canonical preview stepping remains a 20-second user control; sample frame proof is separate.
    const stageTimes = contract.starts.map((start, index) => start + ((contract.starts[index + 1] ?? contract.duration) - start) * .85);
    const samplePath = 'output/sample-7.5s.mp4', sampleLineagePath = path.join(out, 'sample-retime.json');
    assert(fs.existsSync(sampleLineagePath), 'Render the current target-local sample before verification.');
    const sampleLineage = JSON.parse(fs.readFileSync(sampleLineagePath, 'utf8'));
    const currentSourceHash = sha(fs.readFileSync(path.join(root, 'index.html')));
    assert.equal(sampleLineage.source?.path, 'index.html');
    assert.equal(sampleLineage.source?.sha256, currentSourceHash, 'Sample lineage must bind the current canonical source.');
    assert.equal(sampleLineage.retime?.duration, 7.5);assert.equal(sampleLineage.result?.exitCode, 0);
    assert.equal(sampleLineage.temporary?.removed, true, 'The temporary retime composition must be removed.');
    const sampleProbe = JSON.parse(command('ffprobe', ['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,r_frame_rate,nb_frames,duration:format=duration,size','-of','json',samplePath]));
    const sampleVideo = sampleProbe.streams[0], [sampleNumerator, sampleDenominator] = sampleVideo.r_frame_rate.split('/').map(Number), sampleDuration = Number(sampleProbe.format.duration), expectedSampleFrames = Math.round(sampleDuration * contract.fps);
    assert.equal(sampleVideo.width, contract.width);assert.equal(sampleVideo.height, contract.height);assert.equal(sampleNumerator / sampleDenominator, contract.fps);
    assert.equal(Number(sampleVideo.nb_frames), expectedSampleFrames);assert(Math.abs(sampleDuration - 7.5) < 1 / contract.fps);
    assert.equal(sampleLineage.output?.sha256, sha(fs.readFileSync(path.join(root, samplePath))), 'Sample lineage hash must bind the MP4 being decoded.');
    const retimeScale = sampleDuration / contract.duration;
    const sampleBeat = id => {
      const beat = contract.graph.beats.find(candidate => candidate.id === id);
      assert(beat, 'Missing sample beat ' + id);
      return { start: beat.start * retimeScale, end: beat.end * retimeScale };
    };
    const evidencePlan = [
      { label:'source', beat:'orient', time:(sampleBeat('orient').start + sampleBeat('orient').end) / 2 },
      { label:'extract', beat:'extract', time:(sampleBeat('extract').start + sampleBeat('extract').end) / 2 },
      { label:'retain', beat:'retain', time:(sampleBeat('retain').start + sampleBeat('retain').end) / 2 },
      { label:'reference', beat:'reference', time:(sampleBeat('reference').start + sampleBeat('reference').end) / 2 },
      { label:'inbox', beat:'reference', time:sampleBeat('reference').start + (sampleBeat('reference').end - sampleBeat('reference').start) * .8 },
      { label:'inspect', beat:'inspect', time:(sampleBeat('inspect').start + sampleBeat('inspect').end) / 2 },
      { label:'review', beat:'review', time:(sampleBeat('review').start + sampleBeat('review').end) / 2 },
      { label:'ending', beat:'review', time:(expectedSampleFrames - 1) / contract.fps },
    ];
    const decodeDirectory = path.join(out, '.polish-sequential-decode');
    fs.rmSync(decodeDirectory, { recursive:true, force:true });fs.mkdirSync(decodeDirectory, { recursive:true });
    let decodedFrames;
    try {
      command('ffmpeg', ['-y','-v','error','-i',samplePath,path.join(decodeDirectory, 'frame-%03d.png')]);
      const decoded = fs.readdirSync(decodeDirectory).filter(name => /^frame-\d+\.png$/.test(name)).sort((left, right) => Number(left.match(/\d+/)[0]) - Number(right.match(/\d+/)[0]));
      assert.equal(decoded.length, expectedSampleFrames, 'Sequential decode must expose every encoded sample frame.');
      decodedFrames = evidencePlan.map(({label, beat, time}) => {
        const frame = Math.min(expectedSampleFrames - 1, Math.max(0, Math.round(time * contract.fps)));
        const outputPath = 'output/polish-' + label + '-frame-' + String(frame).padStart(3, '0') + '.png';
        fs.copyFileSync(path.join(decodeDirectory, decoded[frame]), path.join(root, outputPath));
        return { label, beat, frame, time:Number((frame / contract.fps).toFixed(6)), path:outputPath, sha256:sha(fs.readFileSync(path.join(root, outputPath))) };
      });
      assert(decodedFrames.every((frame, index) => !index || frame.frame > decodedFrames[index - 1].frame), 'Evidence frame references must remain decode-ordered.');
      assert.deepEqual(decodedFrames.map(frame => frame.label), ['source','extract','retain','reference','inbox','inspect','review','ending']);
    } finally { fs.rmSync(decodeDirectory, { recursive:true, force:true }); }

    const page = await context.newPage();
    await page.goto(origin + '/preview.html');
    await page.waitForFunction(() => document.querySelector('#film').contentWindow.film?.timeline.time() > 0);
    const samples = [];
    for (const at of [...stageTimes, contract.duration]) {
      await page.waitForFunction(time => document.querySelector('#film').contentWindow.film.timeline.time() >= time, at, {timeout:(contract.duration + 10) * 1000});
      samples.push(await page.evaluate(() => {
        const win = document.querySelector('#film').contentWindow, film = win.film;
        return {time:film.timeline.time(), stage:film.sceneAt(film.timeline.time()), scrollY:win.scrollY, scrollHeight:win.document.documentElement.scrollHeight, viewportHeight:win.innerHeight};
      }));
    }
    assert.deepEqual(samples.map(sample => sample.stage), [...contract.starts.map((_, index) => index), contract.starts.length - 1]);
    assert(samples.every(sample => sample.scrollY === 0 && sample.scrollHeight === sample.viewportHeight));
    await page.screenshot({path:path.join(out,'preview-end.png')});
    await page.locator('#replay').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#film').contentWindow.film.timeline.time() > .2);
    await page.locator('#toggle').focus();await page.keyboard.press('Enter');
    const paused = await page.evaluate(() => document.querySelector('#film').contentWindow.film.timeline.time());
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.querySelector('#film').contentWindow.film.timeline.time()), paused);
    async function currentStage() {return page.evaluate(() => {const film = document.querySelector('#film').contentWindow.film;return film.sceneAt(film.timeline.time());});}
    for (let index = 1; index < contract.starts.length; index++) {
      await page.locator('#next').focus();await page.keyboard.press('Enter');assert.equal(await currentStage(), index);
    }
    assert(await page.locator('#next').isDisabled());
    for (let index = contract.starts.length - 2; index >= 0; index--) {
      await page.locator('#previous').focus();await page.keyboard.press('Enter');assert.equal(await currentStage(), index);
    }
    assert(await page.locator('#previous').isDisabled());

    // Reloading the composition detaches callbacks from the old clock.
    await page.evaluate(() => {window.previousFilm = document.querySelector('#film').contentWindow.film;document.querySelector('#film').contentWindow.location.reload();});
    await page.waitForFunction(() => document.querySelector('#film').contentWindow.film !== window.previousFilm && document.querySelector('#film').contentWindow.film?.timeline.time() > 0);
    assert(await page.evaluate(() => window.previousFilm.timeline.paused() && !window.previousFilm.timeline.eventCallback('onUpdate') && !window.previousFilm.timeline.eventCallback('onComplete')));
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(() => {const film = document.querySelector('#film').contentWindow.film;return film.timeline.paused() && film.timeline.time() === film.duration;});
    await page.reload();
    await page.waitForFunction(() => {const film = document.querySelector('#film').contentWindow.film;return film?.timeline.paused() && film.timeline.time() === film.duration;});
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.querySelector('#film').contentWindow.film.timeline.time()), contract.duration);
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:path.join(out,'preview-reduced-mobile.png')});
    await page.locator('#previous').click();assert.equal(await currentStage(), contract.starts.length - 2);
    assert(await page.evaluate(() => document.querySelector('#film').contentWindow.film.timeline.paused()));
    await page.locator('#next').click();assert.equal(await currentStage(), contract.starts.length - 1);
    await page.locator('#toggle').click();
    await page.waitForFunction(() => {const film = document.querySelector('#film').contentWindow.film;return !film.timeline.paused() && film.timeline.time() > 0 && film.timeline.time() < film.duration;});
    await page.locator('#toggle').click();
    await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide')));
    assert(await page.evaluate(() => {const timeline = document.querySelector('#film').contentWindow.film.timeline;return timeline.paused() && !timeline.eventCallback('onUpdate') && !timeline.eventCallback('onComplete');}));

    // Play the delivered full film from start to native ended at normal speed.
    await page.setViewportSize({width:1280,height:900});await page.emulateMedia({reducedMotion:'no-preference'});
    await page.goto(origin + '/watch.html');
    await page.waitForFunction(() => document.querySelector('#encoded').readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
    await page.evaluate(interval => {
      const video = document.querySelector('#encoded');window.mediaSamples = [];window.nativeEnded = false;
      video.pause();video.currentTime = 0;video.playbackRate = 1;
      function sample(_now, metadata) {
        if (!window.mediaSamples.length || metadata.mediaTime - window.mediaSamples.at(-1).time >= interval) window.mediaSamples.push({time:metadata.mediaTime,presentedFrames:metadata.presentedFrames,wallClockMs:performance.now()});
        if (!video.ended) video.requestVideoFrameCallback(sample);
      }
      video.addEventListener('ended', () => {window.nativeEnded = true;}, {once:true});video.requestVideoFrameCallback(sample);return video.play();
    }, contract.duration / 12);
    await page.waitForFunction(() => document.querySelector('#encoded').currentTime >= document.querySelector('#encoded').duration / 2, null, {timeout:(contract.duration + 10) * 1000});
    await page.screenshot({path:path.join(out,'encoded-playing.png')});
    await page.waitForFunction(() => window.nativeEnded, null, {timeout:(contract.duration + 10) * 1000});
    const playback = await page.evaluate(() => {
      const video = document.querySelector('#encoded'), quality = video.getVideoPlaybackQuality();
      return {ended:video.ended,nativeEnded:window.nativeEnded,currentTime:video.currentTime,duration:video.duration,playbackRate:video.playbackRate,width:video.videoWidth,height:video.videoHeight,source:new URL(video.currentSrc).pathname,poster:video.getAttribute('poster'),quality:{totalVideoFrames:quality.totalVideoFrames,droppedVideoFrames:quality.droppedVideoFrames},samples:window.mediaSamples};
    });
    assert(playback.ended && playback.nativeEnded);assert.equal(playback.currentTime, playback.duration);assert.equal(playback.playbackRate, 1);
    assert(Math.abs(playback.duration - contract.duration) < 1 / contract.fps);assert.equal(playback.source, '/output/openalice.mp4');assert.equal(playback.poster, null);
    assert.equal(playback.width, contract.width);assert.equal(playback.height, contract.height);assert(playback.samples.length >= 10 && playback.samples.at(-1).time > contract.duration * .85);
    assert(playback.samples.at(-1).presentedFrames > expectedFrames * .7);
    assert(playback.samples.every((sample, index) => !index || sample.time > playback.samples[index - 1].time && sample.presentedFrames > playback.samples[index - 1].presentedFrames && sample.wallClockMs > playback.samples[index - 1].wallClockMs));

    async function captureReviewSurface(config) {
      await page.setViewportSize(config.viewport);await page.emulateMedia({reducedMotion:config.reducedMotion ? 'reduce' : 'no-preference'});
      await page.goto(origin + '/watch.html');
      await page.waitForFunction(() => document.querySelector('#encoded').readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !document.querySelector('#encoded').seeking);
      const terminalFrame = await seekPresentedTerminalFrame(page, contract.fps);
      if (config.nativeControls) {
        const box = await page.locator('#encoded').boundingBox();assert(box, 'Native-controls capture requires a video bounds.');
        await page.mouse.move(box.x + box.width / 2, box.y + box.height - 8);await page.waitForTimeout(250);
      }
      const entry = await page.evaluate(({review, config, terminalFrame}) => {
        const video = document.querySelector('#encoded'), box = video.getBoundingClientRect();
        const sourceWidth = review.root.right - review.root.left, sourceHeight = review.root.bottom - review.root.top, scaleX = box.width / sourceWidth, scaleY = box.height / sourceHeight;
        const reservedTop = box.top + (sourceHeight - review.reservedPixels) * scaleY;
        const strings = review.strings.map(string => ({text:string.text,left:box.left + (string.left - review.root.left) * scaleX,top:box.top + (string.top - review.root.top) * scaleY,right:box.left + (string.right - review.root.left) * scaleX,bottom:box.top + (string.bottom - review.root.top) * scaleY}));
        return {name:config.name,viewport:{width:innerWidth,height:innerHeight},state:{reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,paused:video.paused,currentTime:video.currentTime,duration:video.duration,controls:video.controls,nativeControlsRequested:config.nativeControls,terminalFrame},video:{left:box.left,top:box.top,right:box.right,bottom:box.bottom,width:box.width,height:box.height},safety:{reservedAuthoredPixels:review.reservedPixels,reservedTop,strings,clear:Math.abs(box.width / box.height - sourceWidth / sourceHeight) < .001 && strings.every(string => string.bottom <= reservedTop + .001)}};
      }, {review:reviewSafety,config,terminalFrame});
      assert(entry.state.controls && entry.safety.clear, config.name + ' must retain the 210-pixel controls-safe boundary.');
      assert(entry.state.terminalFrame.seeked && entry.state.terminalFrame.paused && entry.state.terminalFrame.mediaTime >= entry.state.terminalFrame.minimumMediaTime, config.name + ' must capture a seek-complete presented terminal frame.');
      assert.deepEqual(entry.safety.strings.map(string => string.text), ['Ready for your review','No trade placed']);
      const capturePath = 'output/polish-controls-' + config.name + '.png';
      await page.screenshot({path:path.join(root,capturePath)});entry.path = capturePath;entry.sha256 = sha(fs.readFileSync(path.join(root,capturePath)));
      return entry;
    }
    const reviewSurfaces = [];
    for (const config of [
      {name:'desktop',viewport:{width:1280,height:900},reducedMotion:false,nativeControls:false},
      {name:'mobile',viewport:{width:390,height:844},reducedMotion:false,nativeControls:false},
      {name:'reduced-motion',viewport:{width:1280,height:900},reducedMotion:true,nativeControls:false},
      {name:'native-controls',viewport:{width:1280,height:900},reducedMotion:false,nativeControls:true},
    ]) reviewSurfaces.push(await captureReviewSurface(config));
    assert.deepEqual(reviewSurfaces.map(surface => surface.name), ['desktop','mobile','reduced-motion','native-controls']);

    // Play the current 7.5-second derivative at normal speed and bind native playback to its sequential frame evidence.
    await page.setViewportSize({width:1280,height:900});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(origin + '/watch.html?sample=1');
    await page.waitForFunction(() => document.querySelector('#encoded').readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !document.querySelector('#encoded').seeking);
    await page.evaluate(interval => {
      const video = document.querySelector('#encoded');window.sampleMediaSamples = [];window.sampleNativeEnded = false;
      video.pause();video.currentTime = 0;video.playbackRate = 1;
      function sample(_now, metadata) {
        if (!window.sampleMediaSamples.length || metadata.mediaTime - window.sampleMediaSamples.at(-1).time >= interval) window.sampleMediaSamples.push({time:metadata.mediaTime,presentedFrames:metadata.presentedFrames,wallClockMs:performance.now()});
        if (!video.ended) video.requestVideoFrameCallback(sample);
      }
      video.addEventListener('ended', () => {window.sampleNativeEnded = true;}, {once:true});video.requestVideoFrameCallback(sample);return video.play();
    }, sampleDuration / 8);
    await page.waitForFunction(() => window.sampleNativeEnded, null, {timeout:(sampleDuration + 10) * 1000});
    const samplePlayback = await page.evaluate(() => {const video = document.querySelector('#encoded'), quality = video.getVideoPlaybackQuality();return {ended:video.ended,nativeEnded:window.sampleNativeEnded,currentTime:video.currentTime,duration:video.duration,playbackRate:video.playbackRate,source:new URL(video.currentSrc).pathname,download:new URL(document.querySelector('#download').href).pathname,poster:video.getAttribute('poster'),quality:{totalVideoFrames:quality.totalVideoFrames,droppedVideoFrames:quality.droppedVideoFrames},samples:window.sampleMediaSamples};});
    assert(samplePlayback.ended && samplePlayback.nativeEnded);assert.equal(samplePlayback.playbackRate, 1);assert.equal(samplePlayback.source, '/output/sample-7.5s.mp4');assert.equal(samplePlayback.download, samplePlayback.source);assert.equal(samplePlayback.poster, null);
    assert(Math.abs(samplePlayback.duration - sampleDuration) < 1 / contract.fps);assert(samplePlayback.samples.length >= 6 && samplePlayback.samples.at(-1).time > sampleDuration * .85);
    assert(samplePlayback.samples.every((sample, index) => !index || sample.time > samplePlayback.samples[index - 1].time && sample.presentedFrames > samplePlayback.samples[index - 1].presentedFrames && sample.wallClockMs > samplePlayback.samples[index - 1].wallClockMs));
    assert.deepEqual(errors, []);assert.deepEqual(remote, []);

    const files = ['index.html','preview.html','watch.html','verify.cjs','DESIGN.md','MOTION.md','STORYBOARD.md','job-plan.json','toolchain-request.json','toolchain-plan.json','package-lock.json','output/openalice.mp4','output/sample-7.5s.mp4','output/sample-retime.json',endingLayoutPath,...reviewSurfaces.map(surface => surface.path),...decodedFrames.map(frame => frame.path)];
    const receipt = {schema:'openalice.product-film-evidence.v1',recordedAt:new Date().toISOString(),status:'passed',verifier:{status:'passed'},componentConformance:true,visualAcceptance:'pending',contract,publicSurface,probe,expectedFrames,fullDecode:true,provenance:{...provenance,firstVisible},snapshotFidelity,reviewSafety,controlsReview:{surfaces:reviewSurfaces},playerRecovery,autonomousPreview:{inputEventsBeforeEnd:0,samples},keyboardPauseReplay:true,stageStepping:true,reloadCleanup:true,pagehideCleanup:true,deterministicSeek,reducedMotion:true,mobileOverflow:false,encodedPlayback:playback,sample:{sha256:sha(fs.readFileSync(path.join(root,samplePath))),lineage:sampleLineage,probe:sampleProbe,expectedFrames:expectedSampleFrames,sequentialDecode:{method:'ffmpeg sequential decode without -ss',frames:decodedFrames}},samplePlayback,errors,remoteRequests:remote,hashes:Object.fromEntries(files.map(file => [file,sha(fs.readFileSync(path.join(root,file)))]))};
    fs.writeFileSync(path.join(out,'verification.json'), JSON.stringify(receipt,null,2) + '\n');
    console.log(JSON.stringify({status:'passed',video,expectedFrames,firstVisible,previewStages:samples.map(sample => sample.stage),encodedPlayback:playback,samplePlayback,controls:reviewSurfaces.map(surface => surface.name),receipt:'output/verification.json'}));
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}
main().catch(error => {console.error(error.stack);server.close();process.exitCode = 1;});
