const {chromium}=require('playwright');const path=require('path');const PAGE='file://'+path.resolve(__dirname,'kc_local.html');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1100,height:600},deviceScaleFactor:1});
const logs=[];p.on('console',m=>{if(m.type()==='error')logs.push('ERR: '+m.text())});p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message));
await p.goto(PAGE);await p.waitForTimeout(2000);
const run=c=>p.evaluate(c=>window.KChart.run(c),c);
// candles + indicators + cvd pane + compare pane
await run('style candles');await run('ind vwap');await run('ind ema');await run('pane cvd');await run('pane cmp');await p.waitForTimeout(600);
// place a trendline by clicks: tool trend, click two points
await run('tool trend');await p.mouse.click(400,300);await p.waitForTimeout(100);await p.mouse.click(700,200);await p.waitForTimeout(200);
await run('h 246.8 alert');await run('tool fib');await p.mouse.click(500,350);await p.mouse.click(820,180);await p.waitForTimeout(200);
await run('tool ruler');await p.mouse.click(300,330);await p.mouse.click(450,250);await p.waitForTimeout(200);
await run('tool avwap');await p.mouse.click(600,300);await p.waitForTimeout(400);
await p.mouse.move(650,260);await p.waitForTimeout(200);
await p.screenshot({path:'kc2.png'});
let st=await p.evaluate(()=>({n:window.KChart.drawings.length,types:window.KChart.drawings.map(d=>d.type),avwap:Object.keys(window.KChart.data.avwap)}));console.log('drawings',JSON.stringify(st));
// drag the trendline whole: find its midpoint
const mid=await p.evaluate(()=>{const d=window.KChart.drawings.find(x=>x.type==='trend');const s=window.KChart.surface;const x=(s.xOf(s.iOfT(d.a[0].t))+s.xOf(s.iOfT(d.a[1].t)))/2+s.pxPerBar()/2;const y=(s.priceToY(d.a[0].p)+s.priceToY(d.a[1].p))/2;return {x,y,p0:d.a[0].p}});
await p.mouse.move(mid.x,mid.y);await p.mouse.down();await p.mouse.move(mid.x+40,mid.y+30,{steps:5});await p.mouse.up();await p.waitForTimeout(200);
const after=await p.evaluate(()=>window.KChart.drawings.find(x=>x.type==='trend').a[0].p);console.log('trend moved p0',mid.p0,'->',after);
await run('undo');const undone=await p.evaluate(()=>window.KChart.drawings.find(x=>x.type==='trend').a[0].p);console.log('after undo',undone);
// non-time bars
await run('bars range 6');await p.waitForTimeout(800);let k=await p.evaluate(()=>({kind:window.KChart.data.kind,n:window.KChart.data.bars.length,drawings:window.KChart.drawings.length}));console.log('range bars',JSON.stringify(k));await run('style footprint');await p.waitForTimeout(300);await p.screenshot({path:'kc3.png'});
await run('bars time 1');await p.waitForTimeout(600);
// pagination: pan right (view left) a lot
await run('style candles');const before=await p.evaluate(()=>window.KChart.data.bars.length);
for(let r=0;r<3;r++){await p.mouse.move(300,300);await p.mouse.down();await p.mouse.move(1000,300,{steps:12});await p.mouse.up();await p.waitForTimeout(500)}
const aft=await p.evaluate(()=>({n:window.KChart.data.bars.length,x0:window.KChart.surface.visible().i0}));console.log('pagination',before,'->',JSON.stringify(aft));
await run('fit');await p.waitForTimeout(800);
// states
for(const s of ['stale','gap','resyncing','disconnected','unsupported','error']){await run('state '+s);await p.waitForTimeout(250);await p.screenshot({path:'kc_state_'+s+'.png',clip:{x:0,y:0,width:1100,height:120}})}
await run('state live');
// replay
await run('replay 30 6');await p.waitForTimeout(2500);const rp=await p.evaluate(()=>({state:window.KChart.state.state,mode:window.KChart.data.engineMode,n:window.KChart.data.bars.length}));console.log('replay',JSON.stringify(rp));await p.screenshot({path:'kc4.png'});
await run('stop');await p.waitForTimeout(600);
// order + agent + artifact
await run('order buy 246.3');await run('submit');await p.waitForTimeout(600);await run('agent');await p.waitForTimeout(1500);await p.screenshot({path:'kc5.png'});
const art=await p.evaluate(()=>window.KChart.artifact());console.log('artifact keys',Object.keys(art),art.timeframe,art.indicators.length,art.drawings.length,art.quality.mode);
await run('artifact');await p.waitForTimeout(300);await p.screenshot({path:'kc6.png'});
const perf=await p.evaluate(()=>document.querySelector('#ftPerf').textContent);console.log(perf);
console.log(logs.join('\n')||'no errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
