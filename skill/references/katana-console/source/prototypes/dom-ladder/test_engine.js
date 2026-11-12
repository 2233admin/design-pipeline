/* 引擎（Worker 源）单元测试：在 Node vm 里跑 WORKER_SRC，不开浏览器。
   覆盖 Qodo #42 评审点：一笔成交的量在同档多单间共享 · Stop 触发 · 丢包的成交不入账 · gap 期间不撮合 · bbo 与档位同源 · FIFO / LIFO */
const vm=require('vm'),fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'kdom.js'),'utf8');const i=src.indexOf('String.raw`')+'String.raw`'.length;const j=src.indexOf('`;',i);const W=src.slice(i,j);
const out=[];const ctx={out,postMessage:m=>out.push(m),setInterval:()=>0,clearInterval:()=>0,setTimeout:(f)=>{ctx.__timers.push(f);return 0},__timers:[],Date,Math,Map,Set,JSON,console,Infinity};vm.createContext(ctx);vm.runInContext(W,ctx);
const fails=[];const check=(n,ok,i='')=>{console.log((ok?'PASS':'FAIL')+' '+n+(i?' · '+i:''));if(!ok)fails.push(n)};
const g=k=>vm.runInContext(k,ctx);
// 1 一笔成交在同档两单间共享
g("A.orders.length=0;A.pos=0;A.lots.length=0;A.avg=0;A.realized=0");
const kb=g('bestBid');g(`const o1=placeOrder('buy',bestBid,5,'DAY');const o2=placeOrder('buy',bestBid,5,'DAY');o1.ahead=0;o2.ahead=0`);
g(`matchTrade({k:bestBid,p:bestBid*S.tick,q:6,side:'sell',id:9001,t:Date.now()})`);
let r=g('({pos:A.pos,f1:A.orders[0]?A.orders[0].filled:5,n:A.orders.length,fills:A.fills.length})');check('一笔 6 手成交 → 两单共成交 6（5 + 1），不是 12',r.pos===6&&r.n===1&&r.f1===1,JSON.stringify(r));
// 2 排队量先吃
g("A.orders.length=0;A.pos=0;A.lots.length=0;A.avg=0;const o3=placeOrder('buy',bestBid,5,'DAY');o3.ahead=4");
g(`matchTrade({k:bestBid,p:bestBid*S.tick,q:6,side:'sell',id:9002,t:Date.now()})`);r=g('({pos:A.pos,ahead:A.orders[0]?A.orders[0].ahead:0,filled:A.orders[0]?A.orders[0].filled:5})');check('排队 4 先被吃，余 2 成交',r.pos===2&&r.ahead===0&&r.filled===2,JSON.stringify(r));
// 3 Stop 触发 → 市价
g("A.orders.length=0;A.pos=0;A.lots.length=0;A.avg=0;const s1=placeOrder('buy',bestAsk+2,3,'DAY',true)");r=g('({stop:A.orders[0].stop,ahead:A.orders[0].ahead})');check('Stop 单无排队估算',r.stop===true&&r.ahead===0);
g(`matchTrade({k:bestAsk+2,p:(bestAsk+2)*S.tick,q:50,side:'buy',id:9003,t:Date.now()})`);r=g('({pos:A.pos,n:A.orders.length})');check('Stop 单不参与限价撮合',r.pos===0&&r.n===1,JSON.stringify(r));
g(`checkStops({k:bestAsk+2,p:(bestAsk+2)*S.tick,q:1,side:'buy',id:9004,t:Date.now()})`);r=g('({pos:A.pos,n:A.orders.length,trig:out.some(m=>m.type==="stopTrig")})');check('触及 Stop 价 → 市价成交 3',r.pos===3&&r.n===0&&r.trig,JSON.stringify(r));
// 4 FIFO / LIFO
g("A.orders.length=0;A.pos=0;A.lots.length=0;A.avg=0;A.realized=0;CALC='FIFO'");
g("const mo=(side,q,p)=>{const o={id:'T',side,k:Math.round(p/S.tick),p,qty:q,filled:0,ahead:0,state:'accepted',t:0};A.orders.push(o);fill(o,q,p)};mo('buy',1,100);mo('buy',1,110);mo('sell',1,120)");
r=g('({realized:A.realized,avg:A.avg,pos:A.pos})');check('FIFO：先平 100 的 lot → 已实现 20，剩余均价 110',Math.abs(r.realized-20)<1e-9&&Math.abs(r.avg-110)<1e-9&&r.pos===1,JSON.stringify(r));
g("A.orders.length=0;A.pos=0;A.lots.length=0;A.avg=0;A.realized=0;CALC='LIFO';mo('buy',1,100);mo('buy',1,110);mo('sell',1,120)");
r=g('({realized:A.realized,avg:A.avg,pos:A.pos})');check('LIFO：先平 110 的 lot → 已实现 10，剩余均价 100',Math.abs(r.realized-10)<1e-9&&Math.abs(r.avg-100)<1e-9&&r.pos===1,JSON.stringify(r));
// 5 丢包：该包的成交不入账；gap 期间不撮合
g("A.orders.length=0;A.pos=0;A.lots.length=0;A.avg=0;A.realized=0;CALC='FIFO';out.length=0;TR.clear();status='ok';lastSeen=trades.length?trades[trades.length-1].id:0");
g('dropNext=1;frame()');let t1=g('tseq');r=g('({status,tr:TR.size,seen:lastSeen})');check('丢的包：成交随包丢失（TR 为空、lastSeen 推进），序列缺口在下一包才暴露',r.status==='ok'&&r.tr===0&&r.seen===t1,JSON.stringify(r));
g('frame()');r=g('({status,tr:TR.size})');check('下一包 prevSeq 不接 → gap，该包成交也不计',r.status==='gap'&&r.tr===0,JSON.stringify(r));
g("const o5=placeOrder('buy',bestBid,5,'DAY');o5.ahead=0");g('frame()');r=g('({status,pos:A.pos,tr:TR.size})');check('gap 期间：不撮合、不计当前成交',r.status==='gap'&&r.pos===0&&r.tr===0,JSON.stringify(r));
// 6 bbo 与档位同源：R 里的最优 = 帧里的 bbo
g("applySnapshot(snapshotMsg());status='ok';out.length=0;frame()");r=g('(()=>{const f=out.find(m=>m.type==="frame");const rb=bboR();return {fb:f.bbo.bid,fa:f.bbo.ask,rb:rb.bid,ra:rb.ask,lb:Math.max(...f.levels.filter(l=>l[1]>0).map(l=>l[0])),la:Math.min(...f.levels.filter(l=>l[2]>0).map(l=>l[0]))}})()');check('帧 bbo = reducer 最优 = levels 里的最优',r.fb===r.rb&&r.fa===r.ra&&r.fb===r.lb&&r.fa===r.la,JSON.stringify(r));
g("status='gap';out.length=0;frame()");r=g('(()=>{const f=out.find(m=>m.type==="frame");const rb=bboR();return {fb:f.bbo.bid,rb:rb.bid,src:bestBid}})()');check('gap 时帧 bbo 仍取 reducer（可能 ≠ 源簿），与冻结的档位一致',r.fb===r.rb,JSON.stringify(r));
// 7 交易闸：非 ok / 回放 / 离线拒绝
g("status='gap';out.length=0;onmessage({data:{type:'market',side:'buy',qty:1}})");r=g('out.find(m=>m.type==="reject")');check('gap 下 market 被拒（reason=gap）',r&&r.reason==='gap',JSON.stringify(r));
g("status='ok';mode='replay';out.length=0;onmessage({data:{type:'flatten'}})");r=g('out.find(m=>m.type==="reject")');check('回放下 flatten 被拒',r&&r.reason==='replay');
g("mode='live';offline=true;out.length=0;onmessage({data:{type:'order',side:'buy',k:bestBid,qty:1}})");r=g('out.find(m=>m.type==="reject")');check('离线下 order 被拒',r&&r.reason==='offline');g("offline=false");
console.log(fails.length?('FAILS: '+fails.join(' | ')):'engine ok');process.exit(fails.length?1:0);
