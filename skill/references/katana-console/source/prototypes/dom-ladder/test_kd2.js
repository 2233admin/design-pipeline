const {chromium}=require('playwright');const path=require('path');const PAGE='file://'+path.resolve(__dirname,'kd_local.html');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1100,height:560}});const logs=[];p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message));
await p.goto(PAGE);await p.waitForTimeout(2000);const run=c=>p.evaluate(c=>window.KDOM.run(c),c);const ev=f=>p.evaluate(f);const fails=[];const check=(n,ok,i='')=>{console.log((ok?'PASS':'FAIL')+' '+n+(i?' · '+i:''));if(!ok)fails.push(n)};
// spread
const sp=await ev(()=>window.KDOM.data.bbo.ask-window.KDOM.data.bbo.bid);check('价差 ≤ 2 tick',sp<=2,'spread '+sp);
// locked click → toast, no draft
const bidCell=await p.$('#rows .row.bb .c-bids');await bidCell.click();await p.waitForTimeout(200);let t=await ev(()=>({toast:document.querySelector('#toast').textContent,on:document.querySelector('#toast').classList.contains('on')}));check('锁定态点击只提示',t.on&&/交易已锁定/.test(t.toast),t.toast);
// unlock → click ask → sell draft
await run('lock');const askCell=await p.$('#rows .row.ba .c-asks');await askCell.click();await p.waitForTimeout(200);let hint=await ev(()=>document.querySelector('#cmdHint').textContent);check('点卖量 = 卖限价草稿',/草稿 卖 LIMIT/.test(hint),hint);
await p.keyboard.press('Escape');
// paper market buy → position, pnl lcd
await run('mkt buy 5');await p.waitForTimeout(400);let pos=await ev(()=>window.KDOM.data.account.pos);check('MKT 买 5 → 仓位 +5',pos===5,'pos '+pos);
const posLcd=await ev(()=>document.querySelector('#posLcd').textContent);check('仓位 LCD +5',posLcd==='+5',posLcd);
// limit order at best bid via command → own order shows
await run('order buy '+(await ev(()=>(window.KDOM.data.bbo.bid*window.KDOM.data.cfg.tick).toFixed(2)))+' 3');await run('submit');await p.waitForTimeout(400);let orders=await ev(()=>window.KDOM.data.account.orders.length);check('限价单已挂',orders>=1,'orders '+orders);
const ownCell=await ev(()=>!!document.querySelector('#rows .c-mybuy.own'));check('我的买单列显示挂单',ownCell);
await run('cancel all');await p.waitForTimeout(300);orders=await ev(()=>window.KDOM.data.account.orders.length);check('Cancel All 撤空',orders===0);
// flatten via command → confirm box → ok
await run('flatten');await p.waitForTimeout(100);await p.click('#note [data-a="ok"]');await p.waitForTimeout(400);pos=await ev(()=>window.KDOM.data.account.pos);check('Flatten → FLAT',pos===0,'pos '+pos);
// columns
await run('col hist');await run('col ladder');await p.waitForTimeout(200);let hasLadder=await ev(()=>!!document.querySelector('#rows .c-ladder'));check('Bid/Ask Ladder 单列',hasLadder);await run('col ladder');
await run('mode liq');await run('bids count');await run('chg stacking');await run('trades delta');await p.waitForTimeout(300);await p.screenshot({path:'kd2.png'});
// agg
await run('agg 5');await p.waitForTimeout(300);let agg=await ev(()=>window.KDOM.settings.agg);check('聚合 5 tick',agg===5);await run('agg 1');
// states: gap → resync → live
await run('state gap');let seen=new Set();for(let i=0;i<30;i++){await p.waitForTimeout(100);seen.add(await ev(()=>window.KDOM.state.state))}check('gap → resyncing → live',seen.has('gap')&&seen.has('resyncing')&&(await ev(()=>window.KDOM.state.state))==='live',[...seen].join(','));
// stale detection
await run('state stale');await p.waitForTimeout(2600);let s1=await ev(()=>window.KDOM.state.state);check('冻结序列 → 自动判 STALE',s1==='stale',s1);await run('state live');await p.waitForTimeout(600);s1=await ev(()=>window.KDOM.state.state);check('恢复 live',s1==='live',s1);
// disconnected detection
await run('state disconnected');await p.waitForTimeout(2000);s1=await ev(()=>window.KDOM.state.state);check('心跳丢失 → OFFLINE',s1==='disconnected',s1);await p.screenshot({path:'kd3.png',clip:{x:0,y:0,width:1100,height:300}});await run('state live');await p.waitForTimeout(600);
// unsupported
await run('state unsupported');await p.waitForTimeout(400);s1=await ev(()=>({s:window.KDOM.state.state,n:window.KDOM.data.levels.size}));check('L1-only → unsupported，不画假深度',s1.s==='unsupported'&&s1.n===0,JSON.stringify(s1));await run('state live');await p.waitForTimeout(500);
// replay
await run('replay 10 2');await p.waitForTimeout(800);s1=await ev(()=>({s:window.KDOM.state.state,dis:document.querySelector('#btnFlatten').disabled}));check('REPLAY 态且交易按钮禁用',s1.s==='replay'&&s1.dis,JSON.stringify(s1));await run('stop');await p.waitForTimeout(500);
// symbol switch
await run('sym IF2512');await p.waitForTimeout(600);s1=await ev(()=>({sym:window.KDOM.data.sym,tick:window.KDOM.data.cfg.tick,n:window.KDOM.data.levels.size}));check('切标的 IF2512（tick .2）',s1.sym==='IF2512'&&s1.tick===.2&&s1.n>0,JSON.stringify(s1));await run('sym 300750');await p.waitForTimeout(500);
// artifact
const art=await ev(()=>window.KDOM.artifact());check('DOMArtifact 结构',art.tool==='dom'&&Array.isArray(art.levels)&&art.levels.length>0&&art.quality.mode==='paper'&&typeof art.spread==='number');
// agent
await run('agent');await p.waitForTimeout(900);const note=await ev(()=>document.querySelector('#note').style.display==='block'&&document.querySelector('#note').textContent.slice(0,60));check('Agent 解读卡',!!note,note);await p.screenshot({path:'kd4.png'});
// Qodo #42 评审回归：Stop 触发 / 聚合最优标记 / 拖单改价 / 冻结态拒绝交易 / 确认框跨回放
await ev(()=>{if(window.KDOM.settings.locked)window.KDOM.run('lock')});const ak=await ev(()=>window.KDOM.data.bbo.ask);await run('order buy '+((ak+8)*0.01).toFixed(2)+' 2 stop');await run('submit');await p.waitForTimeout(300);let so=await ev(()=>({n:window.KDOM.data.account.orders.length,stop:window.KDOM.data.account.orders[0]&&window.KDOM.data.account.orders[0].stop,cell:!!document.querySelector('#rows .c-mybuy.own.stop')}));check('Stop 草稿提交为 Stop 单（虚线格，远离现价时挂着）',so.n===1&&so.stop===true&&so.cell,JSON.stringify(so));await run('cancel all');await p.waitForTimeout(200);
await run('order buy '+((await ev(()=>window.KDOM.data.bbo.ask))*0.01).toFixed(2)+' 2 stop');await run('submit');await p.waitForTimeout(1200);so=await ev(()=>({n:window.KDOM.data.account.orders.length,pos:window.KDOM.data.account.pos,hint:document.querySelector('#cmdHint').textContent}));check('Stop 触及 → 市价成交，不作限价挂着',so.n===0&&so.pos===2,JSON.stringify(so));
await run('agg 5');await p.waitForTimeout(300);let mk=await ev(()=>({bb:!!document.querySelector('#rows .row.bb'),ba:!!document.querySelector('#rows .row.ba')}));check('聚合 5 tick 仍标最优买 / 卖行',mk.bb&&mk.ba,JSON.stringify(mk));await run('agg 1');await p.waitForTimeout(200);
await run('order buy '+(await ev(()=>(window.KDOM.data.bbo.bid*window.KDOM.data.cfg.tick).toFixed(2)))+' 1');await run('submit');await p.waitForTimeout(300);const k0=await ev(()=>window.KDOM.data.account.orders[0].k);const oc=await p.$('#rows .c-mybuy.own');const ob=await oc.boundingBox();await p.mouse.move(ob.x+ob.width/2,ob.y+ob.height/2);await p.mouse.down();await p.mouse.move(ob.x+ob.width/2,ob.y+ob.height/2+66,{steps:5});await p.mouse.up();await p.waitForTimeout(300);const k1=await ev(()=>window.KDOM.data.account.orders[0]&&window.KDOM.data.account.orders[0].k);check('拖自己的单 3 行 → 改价 −3 tick',k1===k0-3,`k ${k0} → ${k1}`);await run('cancel all');
await run('state stale');await p.waitForTimeout(2600);let fz=await ev(()=>({st:window.KDOM.state.state,r:window.KDOM.run('mkt buy 1'),pos:window.KDOM.data.account.pos}));check('STALE 态：前端拒绝 mkt',fz.st==='stale'&&fz.r===false&&fz.pos===2,JSON.stringify(fz));
await ev(()=>window.KDOM.run('state live'));await p.waitForTimeout(500);
await run('flatten');await p.waitForTimeout(100);await run('replay 10 2');await p.waitForTimeout(600);const stAt=await ev(()=>window.KDOM.state.state);await p.click('#note [data-a="ok"]');await p.waitForTimeout(300);await run('stop');await p.waitForTimeout(600);let rp=await ev(()=>({st:window.KDOM.state.state,pos:window.KDOM.data.account.pos}));check('确认框跨入回放后再确认 → 不执行 Flatten（回放结束仓位仍 2）',stAt==='replay'&&rp.st==='live'&&rp.pos===2,JSON.stringify({stAt,...rp}));
await run('flatten');await p.waitForTimeout(100);await p.click('#note [data-a="ok"]');await p.waitForTimeout(400);check('回放结束后 Flatten 正常',(await ev(()=>window.KDOM.data.account.pos))===0);await ev(()=>{if(!window.KDOM.settings.locked)window.KDOM.run('lock')});
// perf
await p.waitForTimeout(1500);const perf=await ev(()=>document.querySelector('#ftPerf').textContent);console.log(perf);
console.log(logs.join('\n')||'no page errors');await b.close();process.exit(fails.length?1:0)})().catch(e=>{console.error(e);process.exit(1)});
