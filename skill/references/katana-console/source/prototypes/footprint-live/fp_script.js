/* ===================================================================
   Footprint 实装 · PriceChart flow 层（ChartSurface 接口）· KATANA Console
   能力：10 内容模式 · 4 可视化 · 4 配色 · 失衡(可调) · 堆叠失衡 · POC · VA · Cluster Statistics 行 · Auto Transform
   操作：命令表（/）· 右键下单草稿(ExitStrategy 括号) · H 水平线 · 锁定括号 · Agent 解读
   手感：弹簧缩放/平移 · 橡皮筋 · 按键声 · LCD · LED
   =================================================================== */
(function(){
const $=s=>document.querySelector(s);
const cs=getComputedStyle(document.body);const tok=(n,f)=>{let v=(cs.getPropertyValue(n)||'').trim();let guard=0;while(/^\{[\w-]+\}$/.test(v)&&guard++<4)v=(cs.getPropertyValue('--'+v.slice(1,-1))||'').trim();return v||f};
const C={bg:tok('--bg-100','#141311'),cell:tok('--bg-200','#171511'),panel:tok('--bg-300','#1d1b18'),raise:tok('--bg-400','#26231e'),ink:tok('--ink-100','#ece6d8'),ink2:tok('--ink-200','#b9b2a3'),ink3:tok('--ink-300','#7d776b'),ink4:tok('--ink-400','#4a463f'),line:tok('--line-100','#2b2823'),grid:tok('--chart-grid','#1f1d19'),axis:tok('--chart-axis','#7d776b'),
 bid:tok('--bid','#4fa3ff'),ask:tok('--ask','#ff6a1f'),bid1:tok('--bid-100','#15283f'),ask1:tok('--ask-100','#3a2213'),or:tok('--signal-orange','#ff6a1f'),am:tok('--signal-amber','#ffc03a'),bl:tok('--signal-blue','#4fa3ff'),gr:tok('--signal-green','#5bd36b'),rd:tok('--signal-red','#ff4d3d'),up:tok('--pnl-up','#ff4d3d'),dn:tok('--pnl-down','#5bd36b'),seq:['#2a1a0f','#5a2e12','#8f4315','#c45a18','#ff6a1f','#ff8a4a']};
const MONO=tok('--font-mono','"DM Mono",monospace').split(',')[0].replace(/"/g,'')||'DM Mono';
/* ---------- 声音 ---------- */
let AC=null;function sfx(k){try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);const P={key:[1800,.03,'square',.04],tick:[2600,.012,'square',.02],latch:[160,.14,'sawtooth',.07],ok:[880,.08,'triangle',.06],no:[140,.18,'square',.06],lift:[90,.12,'sine',.07]}[k];o.type=P[2];o.frequency.setValueAtTime(P[0],t);if(k==='ok')o.frequency.setValueAtTime(1320,t+.04);if(k==='latch')o.frequency.setValueAtTime(110,t+.07);g.gain.setValueAtTime(P[3],t);g.gain.exponentialRampToValueAtTime(.0001,t+P[1]);o.start(t);o.stop(t+P[1]+.02)}catch(e){}}
/* ---------- 弹簧 ---------- */
const springs=[];function spring(obj,key,to,preset,cb){const P={snappy:{k:520,c:38,m:.8},gentle:{k:170,c:26,m:1},settle:{k:300,c:34,m:1}}[preset];let s=springs.find(x=>x.obj===obj&&x.key===key);if(!s){s={obj,key,v:0};springs.push(s)}Object.assign(s,{to,...P,cb})}
function stepSprings(dt){for(let i=springs.length-1;i>=0;i--){const s=springs[i],x=s.obj[s.key];const a=(-s.k*(x-s.to)-s.c*s.v)/s.m;s.v+=a*dt;s.obj[s.key]=x+s.v*dt;if(Math.abs(s.v)<.01&&Math.abs(s.obj[s.key]-s.to)<.01){s.obj[s.key]=s.to;springs.splice(i,1)}if(s.cb)s.cb()}}
/* ---------- 数据：逐笔 → 1m 柱，每档 bid/ask/trades ---------- */
const TICK=.1,DEC=1;let seed=20261003;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const bars=[];let px=246.5;
function newBar(t){return {t,o:px,h:px,l:px,c:px,lv:new Map(),vol:0,trades:0,delta:0}}
function addTrade(b,price,side,q){const k=Math.round(price/TICK);let l=b.lv.get(k);if(!l){l={bid:0,ask:0,trades:0};b.lv.set(k,l)}if(side>0)l.ask+=q;else l.bid+=q;l.trades++;b.vol+=q;b.trades++;b.delta+=side>0?q:-q;b.h=Math.max(b.h,price);b.l=Math.min(b.l,price);b.c=price}
const ANCHOR=246.5;function genBar(t,n){const b=newBar(t);const drift=(rnd()-.5)*.5;for(let i=0;i<n;i++){px=+(px+((rnd()-.5)+drift*.1+(ANCHOR-px)*.06)*TICK*1.6).toFixed(DEC);const side=rnd()<.5+drift*.3?1:-1;let q=Math.round(20+rnd()*120);if(rnd()<.06)q*=Math.round(4+rnd()*8);addTrade(b,px,side,q)}return b}
let t0=Date.now()-120*60000;for(let i=0;i<120;i++)bars.push(genBar(t0+i*60000,40+Math.floor(rnd()*40)));
let live=newBar(t0+120*60000);bars.push(live);
/* ---------- 设置（面板级，命令可改） ---------- */
const MODES=['Volume','Trades','Volume and Trades','Volume and Delta','Delta','Centered Delta','Bid × Ask','Centered Bid × Ask','Bid/Ask','None'];
const VIZ=['Full Row','Bid/Ask Profile','Volume Profile','Delta Profile'];
const SCHEME=['Delta','Solid','Volume Proportion','Heatmap by Volume'];
const S={mode:6,viz:0,scheme:0,imb:150,stacked:3,poc:true,va:true,stats:['Delta','Volume','Trades','Max Δ','Min Δ'],statsOn:{Delta:true,Volume:true,Trades:false,'Max Δ':false,'Min Δ':false},autoTransform:28,recent:[6,4,0]};
/* ---------- ChartSurface ---------- */
const cv=$('#c'),g=cv.getContext('2d');let W=0,H=0,DPR=1;
const view={x0:bars.length-22,bw:46,pLo:0,pHi:1,auto:true};const AXW=56,STATH=14;
let hover=null,lock=null,drag=null,vx=0,lastMove=0;
const surface={priceToY:p=>{const r=rect();return r.y+(view.pHi-p)/(view.pHi-view.pLo)*r.h},yToPrice:y=>{const r=rect();return view.pHi-(y-r.y)/r.h*(view.pHi-view.pLo)},xOf:i=>(i-view.x0)*view.bw,iOf:x=>view.x0+x/view.bw,hitTest:(x,y)=>{const i=Math.floor(surface.iOf(x));const b=bars[i];if(!b)return null;const p=Math.round(surface.yToPrice(y)/TICK);return {i,b,k:p}}};
function statRows(){return S.stats.filter(s=>S.statsOn[s])}
function rect(){const n=statRows().length;return {x:0,y:6,w:W-AXW,h:H-16-6-n*STATH-4}}
/* ---------- 布局 ---------- */
function fit(){const r=cv.parentElement.getBoundingClientRect();DPR=Math.min(2,devicePixelRatio||1);W=r.width;H=r.height;cv.width=W*DPR;cv.height=H*DPR;g.setTransform(DPR,0,0,DPR,0,0)}
new ResizeObserver(fit).observe(cv.parentElement);fit();
function autoPrice(){if(!view.auto)return;const i0=Math.max(0,Math.floor(view.x0)),i1=Math.min(bars.length-1,Math.ceil(view.x0+(W-AXW)/view.bw));let lo=1e9,hi=-1e9;for(let i=i0;i<=i1;i++){lo=Math.min(lo,bars[i].l);hi=Math.max(hi,bars[i].h)}if(hi<lo)return;const pad=(hi-lo)*.08+TICK*2;const tl=lo-pad,th=hi+pad;view.pLo+=(tl-view.pLo)*.12;view.pHi+=(th-view.pHi)*.12}
/* ---------- 失衡 / POC / VA ---------- */
function analyze(b){const ck=b.vol+'|'+S.imb+'|'+S.stacked;if(b._a&&b._a.ck===ck)return b._a;const keys=[...b.lv.keys()].sort((a,c)=>a-c);let poc=null,max=0;keys.forEach(k=>{const l=b.lv.get(k);if(l.bid+l.ask>max){max=l.bid+l.ask;poc=k}});
 const imbA=new Set(),imbB=new Set();keys.forEach(k=>{const l=b.lv.get(k),below=b.lv.get(k-1),above=b.lv.get(k+1);if(below&&l.ask>0&&l.ask>=below.bid*S.imb/100&&below.bid>0)imbA.add(k);if(above&&l.bid>0&&l.bid>=above.ask*S.imb/100&&above.ask>0)imbB.add(k)});
 const stack=(set)=>{const out=[];const ks=[...set].sort((a,c)=>a-c);let run=[];ks.forEach(k=>{if(run.length&&k===run[run.length-1]+1)run.push(k);else{if(run.length>=S.stacked)out.push([run[0],run[run.length-1]]);run=[k]}});if(run.length>=S.stacked)out.push([run[0],run[run.length-1]]);return out};
 /* VA 70% */let va=[poc,poc];if(poc!=null){let acc=b.lv.get(poc).bid+b.lv.get(poc).ask;let lo=poc,hi=poc;while(acc<b.vol*.7){const u=b.lv.get(hi+1),d=b.lv.get(lo-1);const uv=u?u.bid+u.ask:-1,dv=d?d.bid+d.ask:-1;if(uv<0&&dv<0)break;if(uv>=dv){hi++;acc+=uv}else{lo--;acc+=dv}}va=[lo,hi]}
 let maxD=0,minD=0,run=0;keys.forEach(k=>{const l=b.lv.get(k);run+=l.ask-l.bid;maxD=Math.max(maxD,run);minD=Math.min(minD,run)});
 b._a={ck,keys,poc,max,imbA,imbB,stackA:stack(imbA),stackB:stack(imbB),va,maxD,minD};return b._a}
/* ---------- 绘制 ---------- */
const fmt=n=>n>=10000?(n/1000).toFixed(1)+'k':String(Math.round(n));
function draw(){g.clearRect(0,0,W,H);const r=rect();const rowH=r.h/((view.pHi-view.pLo)/TICK);const i0=Math.max(0,Math.floor(view.x0)),i1=Math.min(bars.length-1,Math.ceil(view.x0+r.w/view.bw));
 g.fillStyle=C.bg;g.fillRect(0,0,W,H);
 /* 网格 */g.strokeStyle=C.grid;g.lineWidth=1;const step=Math.max(1,Math.round((view.pHi-view.pLo)/TICK/8))*TICK;for(let p=Math.ceil(view.pLo/step)*step;p<view.pHi;p+=step){const y=Math.round(surface.priceToY(p))+.5;g.beginPath();g.moveTo(0,y);g.lineTo(r.w,y);g.stroke();g.fillStyle=C.axis;g.font=`10px ${MONO}`;g.textAlign='left';g.fillText(p.toFixed(DEC),r.w+6,y+3)}
 const fp=view.bw>=S.autoTransform&&S.mode!==9||(S.mode===9&&view.bw>=S.autoTransform);const showText=fp&&rowH>=9&&view.bw>=S.autoTransform;
 /* hover 行 */if(hover&&fp){const y=surface.priceToY(hover.k*TICK+TICK/2);g.fillStyle='rgba(255,255,255,.035)';g.fillRect(0,y-rowH/2,r.w,rowH)}
 g.save();g.beginPath();g.rect(0,0,r.w,H);g.clip();
 for(let i=i0;i<=i1;i++){const b=bars[i],x=surface.xOf(i),isLive=b===live;const a=analyze(b);
  if(!fp){/* K 线 */const up=b.c>=b.o;g.strokeStyle=g.fillStyle=up?C.up:C.dn;const cx=x+view.bw/2;g.beginPath();g.moveTo(cx,surface.priceToY(b.h));g.lineTo(cx,surface.priceToY(b.l));g.stroke();const y1=surface.priceToY(Math.max(b.o,b.c)),y2=surface.priceToY(Math.min(b.o,b.c));g.fillRect(x+view.bw*.25,y1,Math.max(1,view.bw*.5),Math.max(1,y2-y1));continue}
  /* 足迹 */const cw=view.bw-2;const maxV=a.max||1;
  if(S.va&&a.poc!=null){const yT=surface.priceToY(a.va[1]*TICK+TICK/2),yB=surface.priceToY(a.va[0]*TICK-TICK/2);g.fillStyle='rgba(255,255,255,.03)';g.fillRect(x,yT,cw,yB-yT)}
  a.keys.forEach(k=>{const l=b.lv.get(k),p=k*TICK;const y=surface.priceToY(p+TICK/2);const top=y-rowH/2,hh=Math.max(1,rowH-1);const vol=l.bid+l.ask,d=l.ask-l.bid;
   /* 配色 */let bidCol=C.bid1,askCol=C.ask1,txtB=C.ink2,txtA=C.ink2;const share=vol/maxV;
   if(S.scheme===0){const t=Math.min(1,Math.abs(d)/(maxV*.6));bidCol=d<0?`rgba(79,163,255,${.12+t*.5})`:C.cell;askCol=d>0?`rgba(255,106,31,${.12+t*.5})`:C.cell}
   else if(S.scheme===1){bidCol=C.bid1;askCol=C.ask1}
   else if(S.scheme===2){bidCol=`rgba(79,163,255,${.08+share*.55})`;askCol=`rgba(255,106,31,${.08+share*.55})`}
   else{const c=C.seq[Math.min(5,Math.floor(share*5.99))];bidCol=askCol=c}
   if(share>.75){txtB=txtA=C.ink}
   /* 可视化 */
   if(S.viz===0){/* Full Row */
    if(S.mode===6||S.mode===7||S.mode===8){g.fillStyle=bidCol;g.fillRect(x,top,cw/2-.5,hh);g.fillStyle=askCol;g.fillRect(x+cw/2+.5,top,cw/2-.5,hh)}
    else{g.fillStyle=S.scheme===3?bidCol:(d>=0?askCol:bidCol);g.fillRect(x,top,cw,hh)}}
   else if(S.viz===1){/* Bid/Ask Profile */g.fillStyle=C.cell;g.fillRect(x,top,cw,hh);const wb=cw/2*(l.bid/maxV),wa=cw/2*(l.ask/maxV);g.fillStyle=C.bid;g.fillRect(x+cw/2-wb,top,wb,hh);g.fillStyle=C.ask;g.fillRect(x+cw/2,top,wa,hh)}
   else if(S.viz===2){/* Volume Profile */g.fillStyle=C.cell;g.fillRect(x,top,cw,hh);g.fillStyle=S.scheme===3?bidCol:`rgba(236,230,216,${.15+share*.5})`;g.fillRect(x,top,cw*share,hh)}
   else{/* Delta Profile */g.fillStyle=C.cell;g.fillRect(x,top,cw,hh);const w=cw/2*Math.min(1,Math.abs(d)/(maxV*.6));g.fillStyle=d>=0?C.ask:C.bid;if(d>=0)g.fillRect(x+cw/2,top,w,hh);else g.fillRect(x+cw/2-w,top,w,hh)}
   /* 文字 */
   if(showText){g.font=`${Math.min(10,rowH-2)}px ${MONO}`;g.textBaseline='middle';const m=S.mode;const cy=top+hh/2;
    const one=(s,col)=>{g.fillStyle=col||txtA;g.textAlign='center';g.fillText(s,x+cw/2,cy)};
    const two=(sa,sb)=>{g.fillStyle=txtB;g.textAlign='right';g.fillText(sa,x+cw/2-3,cy);g.fillStyle=txtA;g.textAlign='left';g.fillText(sb,x+cw/2+3,cy)};
    if(m===0)one(fmt(vol));else if(m===1)one(String(l.trades));else if(m===2)two(fmt(vol),String(l.trades));else if(m===3)two(fmt(vol),(d>=0?'+':'')+fmt(d));
    else if(m===4)one((d>=0?'+':'')+fmt(d),d>=0?C.ask:C.bid);else if(m===5){g.fillStyle=d>=0?C.ask:C.bid;g.textAlign=d>=0?'left':'right';g.fillText((d>=0?'+':'')+fmt(d),x+cw/2+(d>=0?3:-3),cy)}
    else if(m===6)two(fmt(l.bid),fmt(l.ask));else if(m===7){g.fillStyle=txtB;g.textAlign='right';g.fillText(fmt(l.bid),x+cw/2-3,cy);g.fillStyle=txtA;g.textAlign='left';g.fillText(fmt(l.ask),x+cw/2+3,cy)}
    else if(m===8)one(fmt(l.bid)+'/'+fmt(l.ask))}
   /* 失衡 */if(a.imbA.has(k)&&(S.mode>=6||S.mode<=3)){g.strokeStyle=C.ask;g.lineWidth=1;g.strokeRect(x+cw/2+1,top+.5,cw/2-2,hh-1)}if(a.imbB.has(k)&&(S.mode>=6||S.mode<=3)){g.strokeStyle=C.bid;g.lineWidth=1;g.strokeRect(x+.5,top+.5,cw/2-2,hh-1)}
   /* POC */if(S.poc&&k===a.poc){g.strokeStyle=C.or;g.lineWidth=1;g.strokeRect(x+.5,top+.5,cw-1,hh-1)}
  });
  /* 堆叠失衡 */g.lineWidth=2;a.stackA.forEach(([lo,hi])=>{const yT=surface.priceToY(hi*TICK+TICK/2)-rowH/2,yB=surface.priceToY(lo*TICK+TICK/2)+rowH/2;g.strokeStyle=C.ask;g.strokeRect(x+cw/2+1,yT+1,cw/2-2,yB-yT-2)});a.stackB.forEach(([lo,hi])=>{const yT=surface.priceToY(hi*TICK+TICK/2)-rowH/2,yB=surface.priceToY(lo*TICK+TICK/2)+rowH/2;g.strokeStyle=C.bid;g.strokeRect(x+1,yT+1,cw/2-2,yB-yT-2)});g.lineWidth=1;
  /* 实时柱外框 */if(isLive){g.strokeStyle='rgba(255,106,31,.45)';g.strokeRect(x-.5,surface.priceToY(b.h)-rowH/2,cw+1,surface.priceToY(b.l)-surface.priceToY(b.h)+rowH)}
 }
 /* 统计行 */const rows=statRows();rows.forEach((name,ri)=>{const y=r.y+r.h+4+ri*STATH;g.fillStyle=C.panel;g.fillRect(0,y,r.w,STATH-1);
  for(let i=i0;i<=i1;i++){const b=bars[i],a=analyze(b),x=surface.xOf(i);let v,col=C.ink2;if(name==='Delta'){v=(b.delta>=0?'+':'')+fmt(b.delta);col=b.delta>=0?C.up:C.dn}else if(name==='Volume')v=fmt(b.vol);else if(name==='Trades')v=String(b.trades);else if(name==='Max Δ'){v='+'+fmt(a.maxD);col=C.up}else{v=fmt(a.minD);col=C.dn}
   if(view.bw>=22){g.fillStyle=col;g.font=`9px ${MONO}`;g.textAlign='center';g.textBaseline='middle';g.fillText(v,x+view.bw/2,y+STATH/2)}else{g.fillStyle=name==='Delta'?(b.delta>=0?C.up:C.dn):C.ink4;g.fillRect(x+1,y+3,Math.max(1,view.bw-2),STATH-6)}}});
 g.restore();
 rows.forEach((name,ri)=>{const y=r.y+r.h+4+ri*STATH;g.fillStyle=C.panel;g.fillRect(r.w,y,AXW,STATH-1);g.fillStyle=C.ink3;g.font=`9px ${MONO}`;g.textAlign='left';g.textBaseline='middle';g.fillText(name.toUpperCase(),r.w+6,y+STATH/2)});
 /* 时间轴 */g.fillStyle=C.axis;g.font=`9px ${MONO}`;g.textAlign='center';g.textBaseline='alphabetic';for(let i=i0;i<=i1;i++){if(i%10)continue;const d=new Date(bars[i].t);g.fillText(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,surface.xOf(i)+view.bw/2,H-4)}
 /* 轴分隔 */g.fillStyle=C.line;g.fillRect(r.w,0,1,H);
 g.save();g.beginPath();g.rect(0,r.y-6,r.w+AXW,r.h+8);g.clip();
 /* 绘图：水平线 */lines.forEach(L=>{const y=Math.round(surface.priceToY(L.p))+.5;g.strokeStyle=L.alert?C.am:C.ink2;g.setLineDash(L.alert?[]:[6,4]);g.beginPath();g.moveTo(0,y);g.lineTo(r.w,y);g.stroke();g.setLineDash([]);g.fillStyle=L.alert?C.am:C.ink2;g.font=`9px ${MONO}`;g.textAlign='left';g.fillText(`H ${L.p.toFixed(DEC)}${L.alert?' · 告警':''}${L.global?' · 全局':''}`,6,y-4)});
 /* 订单草稿 / 已提交 */if(order){const y=Math.round(surface.priceToY(order.p))+.5;const col=order.state==='confirmed'?C.or:C.am;g.strokeStyle=col;g.setLineDash(order.state==='confirmed'?[]:[8,5]);g.lineWidth=order.state==='confirmed'?2:1;g.beginPath();g.moveTo(0,y);g.lineTo(r.w,y);g.stroke();
  const sl=order.p-order.sl*TICK*(order.side>0?1:-1),tp=order.p+order.tp*TICK*(order.side>0?1:-1);[[sl,C.rd,'SL'],[tp,C.gr,'TP']].forEach(([p,c,lbl])=>{const yy=Math.round(surface.priceToY(p))+.5;g.strokeStyle=c;g.setLineDash([3,3]);g.lineWidth=1;g.beginPath();g.moveTo(r.w*.55,yy);g.lineTo(r.w,yy);g.stroke();g.fillStyle=c;g.font=`9px ${MONO}`;g.textAlign='right';g.fillText(`${lbl} ${p.toFixed(DEC)}`,r.w-4,yy-3)});g.setLineDash([]);g.lineWidth=1;
  g.fillStyle=C.panel;g.fillRect(r.w-178,y-9,174,16);g.strokeStyle=col;g.strokeRect(r.w-178+.5,y-9+.5,173,15);g.fillStyle=col;g.font=`10px ${MONO}`;g.textAlign='left';g.fillText(`${order.side>0?'买':'卖'} LIMIT ${order.p.toFixed(DEC)} × ${order.qty} · ${{draft:'草稿 · 拖动改价 · ↵ 提交',submitting:'提交中…',confirmed:'已挂 · 括号 '+order.sl+'/'+order.tp}[order.state]}`,r.w-174,y+3)}
 g.restore();
 /* 锁定括号 */if(lock!=null&&bars[lock]){const b=bars[lock],x=surface.xOf(lock),yT=surface.priceToY(b.h)-rowH/2-3,yB=surface.priceToY(b.l)+rowH/2+3;const w=view.bw-2;const L=6+lockAnim*8;g.strokeStyle=C.or;g.lineWidth=1.5;[[x-L*.3,yT,1,1],[x+w+L*.3,yT,-1,1],[x-L*.3,yB,1,-1],[x+w+L*.3,yB,-1,-1]].forEach(([cx,cy,sx,sy])=>{g.beginPath();g.moveTo(cx+sx*L,cy);g.lineTo(cx,cy);g.lineTo(cx,cy+sy*L);g.stroke()});g.lineWidth=1}
 /* Agent 高亮 */if(agentMark){const {i,k,label}=agentMark;const x=surface.xOf(i),y=surface.priceToY(k*TICK+TICK/2);g.strokeStyle=C.bl;g.lineWidth=1.5;g.setLineDash([4,3]);g.strokeRect(x-3,y-rowH/2-3,view.bw+4,rowH+6);g.setLineDash([]);g.lineWidth=1;g.fillStyle=C.bl;g.font=`10px ${MONO}`;g.textAlign='left';g.fillText(label,x+view.bw+8,y+3)}
 /* 当前价 */{const y=Math.round(surface.priceToY(live.c))+.5;g.fillStyle=C.panel;g.fillRect(r.w,y-7,AXW,14);g.fillStyle=live.c>=live.o?C.up:C.dn;g.font=`10px ${MONO}`;g.textAlign='left';g.textBaseline='middle';g.fillText(live.c.toFixed(DEC),r.w+6,y)}
 /* 页脚信息 */$('#ftMode').innerHTML=`模式 <b>${MODES[S.mode]}</b> · 可视化 <b>${VIZ[S.viz]}</b> · 配色 <b>${SCHEME[S.scheme]}</b> · 失衡 <b>${S.imb}%</b> · 堆叠 ≥ <b>${S.stacked}</b>${fp?'':' · <b>Auto Transform → K 线</b>'}`;$('#ftStat').innerHTML=`统计行 <b>${rows.join(' · ')||'无'}</b>`;
 const lcd=$('#lcdDelta');lcd.textContent='Δ '+(live.delta>=0?'+':'')+fmt(live.delta);lcd.className='lcd '+(live.delta>=0?'up':'dn')}
/* ---------- 绘图对象 / 订单 / Agent 状态 ---------- */
const lines=[];let order=null,agentMark=null,lockAnim=0,pendingH=false;
/* ---------- 工具条 chips ---------- */
function chips(){const el=$('#chips');el.innerHTML='';[...new Set([S.mode,...S.recent])].slice(0,4).forEach(m=>{const s=document.createElement('span');s.textContent=MODES[m];s.className=m===S.mode?'on':'';s.addEventListener('click',()=>setMode(m));el.appendChild(s)})}
function setMode(m){if(m===S.mode)return;S.recent=[S.mode,...S.recent.filter(x=>x!==S.mode&&x!==m)].slice(0,3);S.mode=m;sfx('key');chips()}
chips();
/* ---------- 输入 ---------- */
const tip=$('#tip');
cv.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
 if(drag){const dx=x-drag.x;let nx=drag.x0-dx/view.bw;const minX=-5,maxX=bars.length-3;if(nx<minX)nx=minX-(minX-nx)*.3;if(nx>maxX)nx=maxX+(nx-maxX)*.3;view.x0=nx;vx=(x-drag.lx)/Math.max(1,performance.now()-drag.lt);drag.lx=x;drag.lt=performance.now();return}
 if(order&&order.dragging){order.p=+(Math.round(surface.yToPrice(y)/TICK)*TICK).toFixed(DEC);return}
 const h=surface.hitTest(x,y);hover=h;if(h&&h.b.lv.get(h.k)){const l=h.b.lv.get(h.k),d=l.ask-l.bid;tip.style.display='block';tip.style.left=Math.min(x+14,W-200)+'px';tip.style.top=Math.max(4,y-44)+'px';tip.innerHTML=`<b>${(h.k*TICK).toFixed(DEC)}</b> · Bid <b>${fmt(l.bid)}</b> · Ask <b>${fmt(l.ask)}</b> · Δ <b>${d>=0?'+':''}${fmt(d)}</b> · ${l.trades} 笔<br>${new Date(h.b.t).toTimeString().slice(0,5)} · 本根 Vol ${fmt(h.b.vol)} · Δ ${h.b.delta>=0?'+':''}${fmt(h.b.delta)}`}else tip.style.display='none';
 cv.style.cursor=order&&Math.abs(surface.priceToY(order.p)-y)<6?'ns-resize':'crosshair'});
cv.addEventListener('pointerleave',()=>{hover=null;tip.style.display='none'});
cv.addEventListener('pointerdown',e=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(e.button===2)return;
 if(pendingH){pendingH=false;lines.push({p:+(Math.round(surface.yToPrice(y)/TICK)*TICK).toFixed(DEC),alert:false,global:true});sfx('ok');return}
 if(order&&Math.abs(surface.priceToY(order.p)-y)<6){order.dragging=true;if(order.state==='confirmed'){order.state='draft';sfx('lift')}return}
 drag={x,x0:view.x0,lx:x,lt:performance.now(),moved:false};vx=0;cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointerup',e=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left;if(order&&order.dragging){order.dragging=false;return}
 if(drag){const moved=Math.abs(x-drag.x)>3;if(!moved){const i=Math.floor(surface.iOf(x));if(bars[i]){lock=lock===i?null:i;lockAnim=1;spring({v:0},'v',0,'snappy');sfx('tick')}}
  else{/* 动量 + 橡皮筋回弹 */const target=view.x0-vx*60/view.bw*8;const minX=-5,maxX=bars.length-3;spring(view,'x0',Math.max(minX,Math.min(maxX,target)),'settle')}
  drag=null}});
cv.addEventListener('wheel',e=>{e.preventDefault();const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
 if(e.shiftKey){view.auto=false;const f=e.deltaY>0?1.12:.9;const p=surface.yToPrice(y);view.pLo=p-(p-view.pLo)*f;view.pHi=p+(view.pHi-p)*f;return}
 const f=e.deltaY>0?.86:1.16;const nb=Math.max(4,Math.min(90,view.bw*f));const i=surface.iOf(x);const nx0=i-x/nb;const crossed=(view.bw<S.autoTransform)!==(nb<S.autoTransform);spring(view,'bw',nb,'snappy');spring(view,'x0',nx0,'snappy');if(crossed)sfx('latch');else sfx('tick')},{passive:false});
cv.addEventListener('contextmenu',e=>{e.preventDefault();const r=cv.getBoundingClientRect(),y=e.clientY-r.top;const p=+(Math.round(surface.yToPrice(y)/TICK)*TICK).toFixed(DEC);order={p,side:p<=live.c?1:-1,qty:200,sl:12,tp:24,state:'draft',dragging:false};sfx('lift')});
cv.addEventListener('dblclick',()=>{view.auto=true;sfx('key')});
addEventListener('keydown',e=>{if(e.target===$('#cmdIn'))return;const k=e.key.toLowerCase();
 if(k==='/'){e.preventDefault();openCmd();return}
 if(k==='h'){pendingH=true;sfx('key');return}
 if(k==='a'&&lines.length){lines[lines.length-1].alert=!lines[lines.length-1].alert;sfx('ok');return}
 if(k==='enter'&&order&&order.state==='draft'){submitOrder();return}
 if(k==='escape'){if(order&&order.state!=='confirmed'){order=null;sfx('no')}else if(agentMark){agentMark=null;$('#note').style.display='none'}else if(lock!=null){lock=null;sfx('tick')}return}
 if(k==='d'){order&&order.state==='confirmed'&&(order=null,sfx('no'))}});
function submitOrder(){order.state='submitting';sfx('key');setTimeout(()=>{if(order&&order.state==='submitting'){order.state='confirmed';sfx('latch')}},420)}
/* ---------- 命令表 ---------- */
const cmd=$('#cmd'),cmdIn=$('#cmdIn');
function openCmd(v){cmd.hidden=false;cmdIn.value=v||'';cmdIn.focus();sfx('key')}
$('#btnCmd').addEventListener('click',()=>openCmd(''));
cmdIn.addEventListener('keydown',e=>{if(e.key==='Escape'){cmd.hidden=true;cmdIn.blur()}if(e.key==='Enter'){const v=cmdIn.value.trim();cmd.hidden=true;cmdIn.blur();if(v)run(v)}});
const idx=(arr,s)=>{const q=(s||'').toLowerCase().replace(/[^a-z]/g,'');const norm=x=>x.toLowerCase().replace(/[^a-z]/g,'');let i=arr.findIndex(x=>norm(x).startsWith(q));if(i<0)i=arr.findIndex(x=>norm(x).includes(q));return i};
function run(v){const a=v.split(/\s+/);const c=a[0].toLowerCase();
 if(c==='fp'){const sub=a[1];const arg=a.slice(2).join(' ');if(sub==='mode'){const m=idx(MODES,arg);if(m>=0)setMode(m);else return bad(v)}else if(sub==='viz'){const m=idx(VIZ,arg);if(m>=0){S.viz=m;sfx('key')}else return bad(v)}else if(sub==='scheme'){const m=idx(SCHEME,arg);if(m>=0){S.scheme=m;sfx('key')}else return bad(v)}else if(sub==='imb'){S.imb=+arg||150;sfx('key')}else if(sub==='stack'){S.stacked=+arg||3;sfx('key')}else if(sub==='poc'){S.poc=!S.poc;sfx('key')}else if(sub==='va'){S.va=!S.va;sfx('key')}else if(sub==='auto'){S.autoTransform=+arg||28;sfx('key')}else return bad(v);return}
 if(c==='stat'){const n=S.stats.find(s=>s.toLowerCase().replace(/[^a-z]/g,'').startsWith((a[1]||'').toLowerCase().replace(/[^a-z]/g,'')));if(n){S.statsOn[n]=!S.statsOn[n];sfx('key')}else return bad(v);return}
 if(c==='h'){const p=parseFloat(a[1]);if(isNaN(p))return bad(v);lines.push({p,alert:a[2]==='alert',global:true});sfx('ok');return}
 if(c==='order'){const side=a[1]==='sell'?-1:1;const p=parseFloat(a[2]);if(isNaN(p))return bad(v);order={p,side,qty:+(a[3]||200),sl:12,tp:24,state:'draft',dragging:false};sfx('lift');return}
 if(c==='submit'){if(order&&order.state==='draft')submitOrder();return}
 if(c==='agent'){agentExplain();return}
 if(c==='lock'){const i=parseInt(a[1]);if(bars[i]){lock=i;lockAnim=1;sfx('tick')}return}
 if(c==='clear'){lines.length=0;order=null;agentMark=null;lock=null;$('#note').style.display='none';sfx('no');return}
 bad(v)}
function bad(v){sfx('no');$('#cmdHint').textContent=`无法识别：${v}`;setTimeout(()=>$('#cmdHint').textContent='Enter 执行 · Esc 关',1500)}
/* ---------- Agent 解读：同一张命令表，用来"表达" ---------- */
function agentExplain(){/* 找最近 30 根里吸收最强的格：bid 大且价格没跌 */let best=null;for(let i=Math.max(0,bars.length-30);i<bars.length-1;i++){const b=bars[i],a=analyze(b);a.keys.forEach(k=>{const l=b.lv.get(k);const score=l.bid*(a.imbB.has(k)?1.6:1)*(k===a.poc?1.3:1);if(!best||score>best.score)best={i,k,score,l,b}})}if(!best)return;
 const nx0=best.i-(W-AXW)/Math.max(view.bw,30)*.55;spring(view,'bw',Math.max(view.bw,34),'gentle');spring(view,'x0',nx0,'gentle');sfx('lift');
 setTimeout(()=>{agentMark={i:best.i,k:best.k,label:`吸收 · Bid ${fmt(best.l.bid)}`};lock=best.i;lockAnim=1;sfx('tick');
  const n=$('#note');const p=(best.k*TICK).toFixed(DEC);const t=new Date(best.b.t).toTimeString().slice(0,5);const stack=analyze(best.b).stackB.length?'，形成堆叠失衡':'';
  n.innerHTML=`<b>QUANT · ${t}</b><p>${p} 这一档被动买入 ${fmt(best.l.bid)}，是本根最大档${best.k===analyze(best.b).poc?'（POC）':''}${stack}；价格没有跌破，卖压被吸收。之后 ${Math.min(5,bars.length-1-best.i)} 根里收在上方 ${bars.slice(best.i+1,best.i+6).filter(x=>x.c>p).length} 根。</p><div class="acts"><span class="p" data-a="alert">在 ${p} 加告警</span><span data-a="h">画线</span><span data-a="tape">看成交</span><span data-a="x">关</span></div>`;n.style.display='block';
  n.querySelectorAll('[data-a]').forEach(s=>s.addEventListener('click',()=>{const act=s.dataset.a;if(act==='alert'){lines.push({p:+p,alert:true,global:true});sfx('ok')}else if(act==='h'){lines.push({p:+p,alert:false,global:true});sfx('ok')}else if(act==='tape'){sfx('key');$('#cmdHint').textContent='→ SmartTape（样机未接）'}else{sfx('tick')}n.style.display='none';agentMark=null}))},600)}
$('#btnAgent').addEventListener('click',agentExplain);
/* ---------- 实时流 ---------- */
let acc=0;setInterval(()=>{const side=rnd()<.5?1:-1;px=+(px+((rnd()-.5)+(ANCHOR-px)*.06)*TICK*1.6).toFixed(DEC);let q=Math.round(20+rnd()*120);if(rnd()<.05)q*=6;addTrade(live,px,side,q);acc++;
 if(acc>=36){acc=0;live=newBar(live.t+60000);bars.push(live);if(view.x0+(W-AXW)/view.bw>bars.length-2)view.x0+=1}},250);
/* ---------- 帧 ---------- */
let last=performance.now();function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;stepSprings(dt);lockAnim+=(0-lockAnim)*.2;autoPrice();draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);
/* 对外：命令面（Agent / 测试调用） */window.KFootprint={run,settings:S,surface};
})();
