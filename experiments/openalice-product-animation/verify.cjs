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

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({headless:true});
    const context = await browser.newContext({viewport:{width:1360,height:940},reducedMotion:'no-preference'});
    const errors = [], remote = [];
    context.on('page', page => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
    });
    context.on('request', request => {if (!request.url().startsWith(origin)) remote.push(request.url());});
    const composition = await context.newPage();
    await composition.goto(origin + '/index.html');
    await composition.waitForFunction(() => Boolean(window.film?.timeline));
    const contract = await composition.evaluate(() => {
      const element = document.querySelector('#openalice'), film = window.film;
      return {
        duration:film.duration, declaredDuration:Number(element.dataset.duration), timelineDuration:film.timeline.duration(),
        width:Number(element.dataset.width), height:Number(element.dataset.height), fps:Number(element.dataset.fps),
        starts:film.starts, paused:film.timeline.paused(), registry:Object.keys(window.__timelines),
        registeredTimeline:window.__timelines.openalice === film.timeline, legacyScenes:document.querySelectorAll('.scene').length
      };
    });
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
    await composition.close();
    const playerRecovery = await verifyPlayerRecovery(browser, origin);

    // Decode actual MP4 frames for visual review, rather than substituting DOM screenshots.
    const stageTimes = contract.starts.map((start, index) => start + ((contract.starts[index + 1] ?? contract.duration) - start) * .85);
    const lastFrame = (expectedFrames - 1) / contract.fps;
    const frameTimes = [...new Set([0, ...stageTimes, lastFrame])].sort((a, b) => a - b);
    for (let index = 0; index < frameTimes.length; index++) command('ffmpeg', ['-y','-v','error','-ss',String(frameTimes[index]),'-i','output/openalice.mp4','-frames:v','1',`output/frame-${String(index).padStart(2,'0')}.png`]);
    for (const file of fs.readdirSync(out)) {
      const frame = /^frame-(\d{2,})\.png$/.exec(file);
      if (frame && Number(frame[1]) >= frameTimes.length) fs.unlinkSync(path.join(out, file));
    }
    command('ffmpeg', ['-y','-v','error','-framerate','1','-i','output/frame-%02d.png','-vf',`scale=512:288,tile=3x${Math.ceil(frameTimes.length / 3)}:nb_frames=${frameTimes.length}:padding=6:margin=6:color=0x202833`,'-frames:v','1','output/contact-sheet.png']);
    const transitionFrames = [];
    // Directed review windows: source insertion, saved-version extraction, Inbox attachment.
    for (const [name, start, span] of [['source',contract.starts[1],2.3],['versions',contract.starts[2],1.25],['inbox',contract.starts[3],1.2]]) {
      const times = Array.from({length:7}, (_, index) => Number((start + span * index / 6).toFixed(6)));
      assert(times.at(-1) < contract.duration, 'Transition evidence must fit the actual composition');
      for (let index = 0; index < times.length; index++) command('ffmpeg', ['-y','-v','error','-ss',String(times[index]),'-i','output/openalice.mp4','-frames:v','1',`output/transition-${name}-${String(index).padStart(2,'0')}.png`]);
      const sheet = `output/transition-${name}-contact-sheet.png`;
      command('ffmpeg', ['-y','-v','error','-framerate','1','-i',`output/transition-${name}-%02d.png`,'-vf','scale=512:288,tile=3x3:nb_frames=7:padding=6:margin=6:color=0x202833','-frames:v','1',sheet]);
      transitionFrames.push({name,times,sheet});
    }

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

    // Play the delivered media from start to ended using the native media clock.
    await page.setViewportSize({width:1280,height:900});await page.emulateMedia({reducedMotion:'no-preference'});
    await page.goto(origin + '/watch.html');
    await page.evaluate(interval => {
      const video = document.querySelector('#encoded');window.mediaSamples = [];
      function sample(_now, metadata) {
        if (!window.mediaSamples.length || metadata.mediaTime - window.mediaSamples.at(-1).time >= interval) window.mediaSamples.push({time:metadata.mediaTime,presentedFrames:metadata.presentedFrames});
        if (!video.ended) video.requestVideoFrameCallback(sample);
      }
      video.requestVideoFrameCallback(sample);
    }, contract.duration / 12);
    await page.waitForFunction(() => document.querySelector('#encoded').currentTime >= document.querySelector('#encoded').duration / 2, null, {timeout:(contract.duration + 10) * 1000});
    await page.screenshot({path:path.join(out,'encoded-playing.png')});
    await page.waitForFunction(() => document.querySelector('#encoded').ended, null, {timeout:(contract.duration + 10) * 1000});
    const playback = await page.evaluate(() => {
      const video = document.querySelector('#encoded'), quality = video.getVideoPlaybackQuality();
      return {ended:video.ended,currentTime:video.currentTime,duration:video.duration,width:video.videoWidth,height:video.videoHeight,source:new URL(video.currentSrc).pathname,poster:video.getAttribute('poster'),quality:{totalVideoFrames:quality.totalVideoFrames,droppedVideoFrames:quality.droppedVideoFrames},samples:window.mediaSamples};
    });
    assert(playback.ended);assert.equal(playback.currentTime, playback.duration);
    assert(Math.abs(playback.duration - contract.duration) < 1 / contract.fps);
    assert.equal(playback.source, '/output/openalice.mp4');assert.equal(playback.poster, null);
    assert.equal(playback.width, contract.width);assert.equal(playback.height, contract.height);
    assert(playback.samples.length >= 10 && playback.samples.at(-1).time > contract.duration * .85);
    assert(playback.samples.at(-1).presentedFrames > expectedFrames * .7);
    assert(playback.samples.every((sample, index) => !index || sample.time > playback.samples[index - 1].time && sample.presentedFrames > playback.samples[index - 1].presentedFrames));

    await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
    await page.reload();
    await page.waitForFunction(() => {const video = document.querySelector('#encoded');return video.readyState >= 2 && !video.seeking && video.paused && video.currentTime === video.duration;});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const sampleProbe = JSON.parse(command('ffprobe', ['-v','error','-show_entries','format=duration','-of','json','output/sample-7.5s.mp4']));
    await page.goto(origin + '/watch.html?sample=1');
    await page.waitForFunction(() => {const video = document.querySelector('#encoded');return video.readyState >= 2 && !video.seeking;});
    const sampleSelection = await page.evaluate(() => {const video = document.querySelector('#encoded');return {source:new URL(video.currentSrc).pathname,duration:video.duration,paused:video.paused,download:new URL(document.querySelector('#download').href).pathname,poster:video.getAttribute('poster')};});
    assert.equal(sampleSelection.source, '/output/sample-7.5s.mp4');assert.equal(sampleSelection.download, sampleSelection.source);
    assert(Math.abs(sampleSelection.duration - Number(sampleProbe.format.duration)) < 1 / contract.fps);
    assert(sampleSelection.paused);assert.equal(sampleSelection.poster, null);
    assert.deepEqual(errors, []);assert.deepEqual(remote, []);

    const files = ['index.html','preview.html','watch.html','verify.cjs','DESIGN.md','MOTION.md','STORYBOARD.md','job-plan.json','toolchain-request.json','toolchain-plan.json','package-lock.json','output/openalice.mp4','output/sample-7.5s.mp4'];
    const receipt = {schema:'openalice.product-film-evidence.v1',recordedAt:new Date().toISOString(),status:'passed',contract,probe,expectedFrames,fullDecode:true,frameTimes,transitionFrames,provenance:{...provenance,firstVisible},snapshotFidelity,playerRecovery,autonomousPreview:{inputEventsBeforeEnd:0,samples},keyboardPauseReplay:true,stageStepping:true,reloadCleanup:true,pagehideCleanup:true,deterministicSeek,reducedMotion:true,mobileOverflow:false,encodedPlayback:playback,sampleSelection,errors,remoteRequests:remote,hashes:Object.fromEntries(files.map(file => [file,sha(fs.readFileSync(path.join(root,file)))]))};
    fs.writeFileSync(path.join(out,'verification.json'), JSON.stringify(receipt,null,2) + '\n');
    console.log(JSON.stringify({status:'passed',video,expectedFrames,firstVisible,previewStages:samples.map(sample => sample.stage),encodedPlayback:playback,sampleSelection,receipt:'output/verification.json'}));
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}
main().catch(error => {console.error(error.stack);server.close();process.exitCode = 1;});
