// Verifies this target's actual autonomous preview and encoded MP4 in Chromium.
// Selectors belong to preview.html/index.html; update here if that interface changes.
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
  const r = spawnSync(bin, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 16*1024*1024 });
  assert.equal(r.status, 0, `${bin}: ${r.stderr || r.error || r.stdout}`);return r.stdout;
}
const server = http.createServer((req,res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
  const size = fs.statSync(file).size;
  const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  const headers = {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Accept-Ranges':'bytes'};
  if(range){const start=Number(range[1]),end=Math.min(size-1,range[2]?Number(range[2]):size-1);res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);}
  else {res.writeHead(200,{...headers,'Content-Length':size});fs.createReadStream(file).pipe(res);}
});
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const probe=JSON.parse(command('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,r_frame_rate,nb_frames,duration:format=duration,size','-of','json','output/openalice.mp4']));
 const video=probe.streams[0];assert.equal(video.width,1280);assert.equal(video.height,720);assert.equal(video.r_frame_rate,'30/1');assert.equal(Number(video.nb_frames),720);assert.equal(Number(video.duration),24);
 command('ffmpeg',['-v','error','-i','output/openalice.mp4','-f','null','-']);
 // Decode the delivered MP4, never substitute HTML screenshots for film review.
 const frameTimes=[0,2,4.3,6.5,9.3,11.5,14.3,16.5,18.3,21,23.966];
 for(let i=0;i<frameTimes.length;i++)command('ffmpeg',['-y','-v','error','-ss',String(frameTimes[i]),'-i','output/openalice.mp4','-frames:v','1',`output/frame-${String(i).padStart(2,'0')}.png`]);
 command('ffmpeg',['-y','-v','error','-framerate','1','-i','output/frame-%02d.png','-vf','scale=512:288,tile=3x4:padding=6:margin=6:color=0x202833','-frames:v','1','output/contact-sheet.png']);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});
 const errors=[],remote=[];
 const context=await browser.newContext({viewport:{width:1360,height:940},reducedMotion:'no-preference'});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>{if(!r.url().startsWith(origin))remote.push(r.url());});
 try{
  await page.goto(origin+'/preview.html');
  await page.waitForFunction(()=>document.querySelector('#film').contentWindow.film?.timeline.time()>0);
  const samples=[];
  for(const at of [2,6.5,11.5,16.5,21,24]){
   await page.waitForFunction(t=>document.querySelector('#film').contentWindow.film.timeline.time()>=t,at,{timeout:30000});
   samples.push(await page.evaluate(()=>{const w=document.querySelector('#film').contentWindow;return {time:w.film.timeline.time(),scene:w.film.sceneAt(w.film.timeline.time()),scrollY:w.scrollY,scrollHeight:w.document.documentElement.scrollHeight,viewportHeight:w.innerHeight,pending:w.document.querySelector('.pending').textContent};}));
  }
  assert.deepEqual(samples.map(s=>s.scene),[0,1,2,3,4,4]);assert(samples.every(s=>s.scrollY===0 && s.scrollHeight===s.viewportHeight && s.pending==='AWAITING APPROVAL'));
  await page.screenshot({path:path.join(out,'preview-end.png')});
  await page.locator('#replay').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#film').contentWindow.film.timeline.time()>0.2);
  await page.locator('#toggle').focus();await page.keyboard.press('Enter');
  const paused=await page.evaluate(()=>document.querySelector('#film').contentWindow.film.timeline.time());
  await page.evaluate(()=>new Promise(r=>setTimeout(r,300)));
  assert.equal(await page.evaluate(()=>document.querySelector('#film').contentWindow.film.timeline.time()),paused);
  await page.locator('#next').click();assert.equal(await page.evaluate(()=>document.querySelector('#film').contentWindow.film.sceneAt(document.querySelector('#film').contentWindow.film.timeline.time())),1);
  await page.locator('#previous').click();assert.equal(await page.evaluate(()=>document.querySelector('#film').contentWindow.film.sceneAt(document.querySelector('#film').contentWindow.film.timeline.time())),0);
  // Backward seeking must reproduce exactly the same original composition pixels.
  const composition=await context.newPage();await composition.goto(origin+'/index.html');
  await composition.evaluate(()=>{window.film.timeline.seek(11.5);});const before=sha(await composition.locator('#openalice').screenshot());
  await composition.evaluate(()=>{window.film.timeline.seek(21);window.film.timeline.seek(2);window.film.timeline.seek(11.5);});const after=sha(await composition.locator('#openalice').screenshot());assert.equal(before,after);
  const seamAndProgress=await composition.evaluate(()=>{
   const seams=[4,9,14,18].flatMap(start=>[0.1,0.22,0.3,0.5].map(offset=>{window.film.timeline.seek(start+offset);return {time:start+offset,visible:[...document.querySelectorAll('.scene')].filter(el=>Number(getComputedStyle(el).opacity)>0.01).length};}));
   const progress=[2,12,22].map(time=>{window.film.timeline.seek(time);return {time,offset:Number(document.querySelector('#progress').getAttribute('stroke-dashoffset'))};});return {seams,progress};
  });
  assert(seamAndProgress.seams.every(s=>s.visible<=1));assert(seamAndProgress.progress.every(s=>Math.abs(s.offset-(1-s.time/24))<0.0001));
  await composition.close();
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
  await page.waitForFunction(()=>document.querySelector('#film').contentWindow.film?.timeline.time()===23);
  assert(await page.evaluate(()=>document.querySelector('#film').contentWindow.film.timeline.paused()));
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,'preview-reduced-mobile.png')});
  await page.locator('#previous').click();assert.equal(await page.evaluate(()=>document.querySelector('#film').contentWindow.film.sceneAt(document.querySelector('#film').contentWindow.film.timeline.time())),3);
  // Actual encoded media autoplay: native media clock, not timeline seeking or scrolling.
  await page.setViewportSize({width:1280,height:720});await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(origin+'/watch.html');
  await page.evaluate(()=>{
   const v=document.querySelector('#encoded');window.mediaSamples=[];
   function sample(now,metadata){if(!window.mediaSamples.length||metadata.mediaTime-window.mediaSamples.at(-1).time>=2)window.mediaSamples.push({time:metadata.mediaTime,presentedFrames:metadata.presentedFrames});v.requestVideoFrameCallback(sample);}v.requestVideoFrameCallback(sample);
  });
  await page.waitForFunction(()=>document.querySelector('#encoded').currentTime>10,{},{timeout:20000});
  await page.screenshot({path:path.join(out,'encoded-playing.png')});
  await page.waitForFunction(()=>document.querySelector('#encoded').ended,{},{timeout:30000});
  const playback=await page.evaluate(()=>{const v=document.querySelector('#encoded');return {ended:v.ended,currentTime:v.currentTime,duration:v.duration,width:v.videoWidth,height:v.videoHeight,quality:v.getVideoPlaybackQuality().toJSON?.() || {totalVideoFrames:v.getVideoPlaybackQuality().totalVideoFrames,droppedVideoFrames:v.getVideoPlaybackQuality().droppedVideoFrames},samples:window.mediaSamples};});
  assert(playback.ended && playback.currentTime===24 && playback.samples.length>=10);assert(playback.samples.at(-1).presentedFrames>500);assert.equal(remote.length,0);assert.deepEqual(errors,[]);
  const files=['index.html','preview.html','watch.html','DESIGN.md','MOTION.md','STORYBOARD.md','job-plan.json','toolchain-request.json','toolchain-plan.json','package-lock.json','output/openalice.mp4'];
  const receipt={schema:'openalice.product-film-evidence.v1',recordedAt:new Date().toISOString(),status:'passed',probe,fullDecode:true,frameTimes,autonomousPreview:{inputEventsBeforeEnd:0,samples},keyboardPauseReplay:true,sceneStepping:true,deterministicSeek:{before,after},seamAndProgress,reducedMotion:true,mobileOverflow:false,encodedPlayback:playback,errors,remoteRequests:remote,hashes:Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(path.join(root,f)))]))};
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({status:'passed',video,previewScenes:samples.map(s=>s.scene),encodedPlayback:playback,receipt:'output/verification.json'}));
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e.stack);server.close();process.exitCode=1;});
