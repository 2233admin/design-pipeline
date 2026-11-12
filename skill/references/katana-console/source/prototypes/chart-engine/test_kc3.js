// 回归：PR #41 评审发现（lock 分页漂移、冻结后补柱、快速回放不丢柱、对照值不漂移、viz 子串命令）
const {chromium}=require('playwright');const path=require('path');const PAGE='file://'+path.resolve(__dirname,'kc_local.html');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1100,height:600}});const logs=[];p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message));
await p.goto(PAGE);await p.waitForTimeout(1800);const run=c=>p.evaluate(c=>window.KChart.run(c),c);const ev=f=>p.evaluate(f);
const fails=[];const check=(name,ok,info='')=>{console.log((ok?'PASS':'FAIL')+' '+name+(info?' · '+info:''));if(!ok)fails.push(name)};
// #8 viz 子串
await run('fp viz profile');check('fp viz profile 命中 Bid/Ask Profile',await ev(()=>window.KChart.settings.viz)===1);await run('fp viz full');
// #5 对照值不随 tick 漂移
const c0=await ev(()=>window.KChart.data.cmp.slice(5,15));await p.waitForTimeout(1200);const c1=await ev(()=>window.KChart.data.cmp.slice(5,15));check('对照历史值稳定',JSON.stringify(c0)===JSON.stringify(c1));
// #2 lock 随分页平移
await run('style candles');await p.mouse.click(700,300);const lt=await ev(()=>{const k=window.KChart;const a=k.artifact();return a.selection&&a.selection.from});check('锁定已设',!!lt);
await p.mouse.move(600,300);for(let i=0;i<10;i++){await p.mouse.wheel(0,200);await p.waitForTimeout(50)}await p.waitForTimeout(400);
for(let r=0;r<3;r++){await p.mouse.move(200,300);await p.mouse.down();await p.mouse.move(1000,300,{steps:10});await p.mouse.up();await p.waitForTimeout(600)}
const n=await ev(()=>window.KChart.data.bars.length);const lt2=await ev(()=>{const a=window.KChart.artifact();return a.selection&&a.selection.from});check('分页后锁定仍指向同一根',n>300&&lt2===lt,`bars ${n}`);
await run('fit');await p.waitForTimeout(600);
// #3 冻结 → live 补柱
await run('state stale');const nStale=await ev(()=>window.KChart.data.bars.length);const wait=60000-(Date.now()%60000)+1500;/* 时间柱按真实分钟闭合，跨过一个分钟边界 */await p.waitForTimeout(wait);const nStill=await ev(()=>window.KChart.data.bars.length);check('stale 期间冻结',nStill===nStale,`等待 ${Math.round(wait/1000)}s`);
await run('state live');await p.waitForTimeout(700);const nLive=await ev(()=>window.KChart.data.bars.length);const contig=await ev(()=>{const b=window.KChart.data.bars;for(let i=1;i<b.length;i++)if(b[i].t-b[i-1].t!==60000)return false;return true});check('回到 live 后补回缺失柱且连续',nLive>nStale&&contig,`${nStale}→${nLive}`);
// #4 快速回放不丢柱
await run('replay 60 60');await p.waitForTimeout(3500);const rc=await ev(()=>{const b=window.KChart.data.bars;let ok=true;for(let i=1;i<b.length;i++)if(b[i].t-b[i-1].t!==60000)ok=false;return {ok,n:b.length,mode:window.KChart.data.engineMode}});check('60 tick/帧 回放柱连续',rc.ok&&rc.mode==='replay',`n ${rc.n}`);await run('stop');await p.waitForTimeout(600);
console.log(logs.join('\n')||'no page errors');await b.close();process.exit(fails.length?1:0)})();
