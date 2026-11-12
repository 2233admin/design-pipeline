/* ===================================================================
   KATANA × Vela spike：Footprint 作为 Vela 插件（registerChartType + registerRendererLayer）
   壳、命令表、Agent 解读、手感是我们的；坐标系、K 线、绘图、回放、指标、设置对话框是 Vela 的。
   =================================================================== */
(function(){
const V=window.Vela;/* 全局包：exports 对象，图表类是 V.Vela */
if(!V||!V.Vela){const el=document.querySelector('#chart');if(el)el.innerHTML='<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8f887a;font:11px monospace;text-align:center;padding:24px">Vela 内核未加载（预览容器拦截了 CDN 脚本）。<br>打开独立样机「Footprint on Vela」查看实装。</div>';return}
const $=s=>document.querySelector(s);
const cs=getComputedStyle(document.body);const tok=(n,f)=>{let v=(cs.getPropertyValue(n)||'').trim();let g=0;while(/^\{[\w-]+\}$/.test(v)&&g++<4)v=(cs.getPropertyValue('--'+v.slice(1,-1))||'').trim();return v||f};
const C={bg:tok('--bg-100','#141311'),cell:tok('--bg-200','#171511'),panel:tok('--bg-300','#1d1b18'),ink:tok('--ink-100','#ece6d8'),ink2:tok('--ink-200','#b9b2a3'),ink3:tok('--ink-300','#7d776b'),ink4:tok('--ink-400','#4a463f'),bid:tok('--bid','#4fa3ff'),ask:tok('--ask','#ff6a1f'),bid1:tok('--bid-100','#15283f'),ask1:tok('--ask-100','#3a2213'),or:tok('--signal-orange','#ff6a1f'),am:tok('--signal-amber','#ffc03a'),bl:tok('--signal-blue','#4fa3ff'),gr:tok('--signal-green','#5bd36b'),rd:tok('--signal-red','#ff4d3d'),up:tok('--pnl-up','#ff4d3d'),dn:tok('--pnl-down','#5bd36b'),seq:['#2a1a0f','#5a2e12','#8f4315','#c45a18','#ff6a1f','#ff8a4a']};
const MONO=(tok('--font-mono','"DM Mono",monospace').split(',')[0]||'DM Mono').replace(/"/g,'');
let AC=null;function sfx(k){try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);const P={key:[1800,.03,'square',.04],tick:[2600,.012,'square',.02],latch:[160,.14,'sawtooth',.07],ok:[880,.08,'triangle',.06],no:[140,.18,'square',.06],lift:[90,.12,'sine',.07]}[k];o.type=P[2];o.frequency.setValueAtTime(P[0],t);if(k==='ok')o.frequency.setValueAtTime(1320,t+.04);if(k==='latch')o.frequency.setValueAtTime(110,t+.07);g.gain.setValueAtTime(P[3],t);g.gain.exponentialRampToValueAtTime(.0001,t+P[1]);o.start(t);o.stop(t+P[1]+.02)}catch(e){}}
/* ---------- 本机计算服务（Worker 代替后端引擎）：数据源给逐笔，本机聚合与分析，前端只画 ---------- */
const TICK=.1,DEC=1,ANCHOR=246.5;
const WORKER_SRC=`
const TICK=.1,DEC=1,ANCHOR=246.5;let seed=20261003;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
let S={imb:300,stacked:3};const bars=[],LV=new Map();let px=246.5,live=null,acc=0;
function lv(t){let m=LV.get(t);if(!m){m=new Map();LV.set(t,m)}return m}
function mk(t){return {time:t,open:px,high:px,low:px,close:px,volume:0,delta:0,trades:0}}
function trade(b,price,side,q){const m=lv(b.time),k=Math.round(price/TICK);let l=m.get(k);if(!l){l={bid:0,ask:0,trades:0};m.set(k,l)}if(side>0)l.ask+=q;else l.bid+=q;l.trades++;b.volume+=q;b.trades++;b.delta+=side>0?q:-q;b.high=Math.max(b.high,price);b.low=Math.min(b.low,price);b.close=price}
function step(){px=+(px+((rnd()-.5)+(ANCHOR-px)*.06)*TICK*1.6).toFixed(DEC);const side=rnd()<.5?1:-1;let q=Math.round(20+rnd()*120);if(rnd()<.06)q*=Math.round(4+rnd()*8);return [px,side,q]}
function analyze(t,vol){const m=LV.get(t)||new Map();const keys=[...m.keys()].sort((a,b)=>a-b);let poc=null,max=0;keys.forEach(k=>{const l=m.get(k);if(l.bid+l.ask>max){max=l.bid+l.ask;poc=k}});
 const imbA=[],imbB=[];keys.forEach(k=>{const l=m.get(k),d=m.get(k-1),u=m.get(k+1);if(d&&d.bid>0&&l.ask>=d.bid*S.imb/100)imbA.push(k);if(u&&u.ask>0&&l.bid>=u.ask*S.imb/100)imbB.push(k)});
 const stack=ks=>{const out=[];let run=[];ks.forEach(k=>{if(run.length&&k===run[run.length-1]+1)run.push(k);else{if(run.length>=S.stacked)out.push([run[0],run[run.length-1]]);run=[k]}});if(run.length>=S.stacked)out.push([run[0],run[run.length-1]]);return out};
 let va=[poc,poc];if(poc!=null){let a=m.get(poc).bid+m.get(poc).ask,lo=poc,hi=poc;while(a<vol*.7){const u=m.get(hi+1),d=m.get(lo-1),uv=u?u.bid+u.ask:-1,dv=d?d.bid+d.ask:-1;if(uv<0&&dv<0)break;if(uv>=dv){hi++;a+=uv}else{lo--;a+=dv}}va=[lo,hi]}
 return {levels:keys.map(k=>{const l=m.get(k);return [k,l.bid,l.ask,l.trades]}),poc,max,imbA,imbB,stackA:stack(imbA),stackB:stack(imbB),va}}
const t0=Math.floor(Date.now()/60000)*60000-240*60000;
for(let i=0;i<240;i++){const b=mk(t0+i*60000);const n=40+Math.floor(rnd()*40);for(let j=0;j<n;j++){const [p,s,q]=step();trade(b,p,s,q)}bars.push(b)}
live=mk(t0+240*60000);bars.push(live);
function snapshot(){const an={};bars.forEach(b=>an[b.time]=analyze(b.time,b.volume||1));return {type:'history',bars:bars.map(b=>({time:b.time,open:b.open,high:b.high,low:b.low,close:b.close,volume:b.volume,delta:b.delta,trades:b.trades})),an}}
postMessage(snapshot());
setInterval(()=>{const [p,s,q]=step();trade(live,p,s,q);acc++;let closed=null;if(acc>=36){acc=0;closed=live;live=mk(live.time+60000);bars.push(live)}
 const pack=b=>({time:b.time,open:b.open,high:b.high,low:b.low,close:b.close,volume:b.volume,delta:b.delta,trades:b.trades});
 postMessage({type:'tick',bar:pack(live),an:analyze(live.time,live.volume||1),closed:closed?{bar:pack(closed),an:analyze(closed.time,closed.volume||1)}:null})},250);
onmessage=e=>{if(e.data.type==='settings'){S={...S,...e.data.values};postMessage(snapshot())}};
`;
const worker=new Worker(URL.createObjectURL(new Blob([WORKER_SRC],{type:'text/javascript'})));
const bars=[];const AN=new Map();/* time → 后端算好的分析结果 */let live=null,onLiveBar=null,historyReady=null;
const historyP=new Promise(res=>historyReady=res);
worker.onmessage=e=>{const d=e.data;if(d.type==='history'){bars.length=0;d.bars.forEach(b=>bars.push(b));Object.keys(d.an).forEach(t=>AN.set(+t,d.an[t]));live=bars[bars.length-1];historyReady(bars);hostRef&&hostRef.pushData({an:AN});return}
 if(d.type==='tick'){if(d.closed){AN.set(d.closed.bar.time,d.closed.an);const i=bars.findIndex(b=>b.time===d.closed.bar.time);if(i>=0)bars[i]=d.closed.bar;onLiveBar&&onLiveBar(d.closed.bar);bars.push(d.bar)}else{bars[bars.length-1]=d.bar}
  AN.set(d.bar.time,d.an);live=d.bar;onLiveBar&&onLiveBar(d.bar);hostRef&&hostRef.pushData({an:AN});const lcd=$('#lcdDelta');if(lcd){lcd.textContent='Δ '+(live.delta>=0?'+':'')+fmt(live.delta);lcd.className='lcd '+(live.delta>=0?'up':'dn')}}};
const S={mode:6,viz:0,scheme:0,imb:300,stacked:3,poc:true,va:true,stats:['Delta','Volume','Trades'],statsOn:{Delta:true,Volume:true,Trades:false},auto:28,recent:[6,4,0]};
const MODES=['Volume','Trades','Volume and Trades','Volume and Delta','Delta','Centered Delta','Bid × Ask','Centered Bid × Ask','Bid/Ask','None'],VIZ=['Full Row','Bid/Ask Profile','Volume Profile','Delta Profile'],SCHEME=['Delta','Solid','Volume Proportion','Heatmap by Volume'];
function pushSettings(){worker.postMessage({type:'settings',values:{imb:S.imb,stacked:S.stacked}})}
const fmt=n=>Math.abs(n)>=10000?(n/1000).toFixed(1)+'k':String(Math.round(n));
/* ---------- Vela 插件：chart type + renderer layer ---------- */
let hostRef=null,lastArgs=null,layerCanvas=null,hoverK=null,hoverI=null,lock=null,lockAnim=0,agentMark=null,order=null;
V.registerChartType({id:'footprint',label:'Footprint (KATANA)',basePainting:'candles',
 settings:{title:'Footprint',rows:[
  {kind:'select',key:'mode',label:'内容模式',options:MODES,defval:MODES[6]},
  {kind:'select',key:'viz',label:'可视化',options:VIZ,defval:VIZ[0]},
  {kind:'select',key:'scheme',label:'配色',options:SCHEME,defval:SCHEME[0]},
  {kind:'row',label:'失衡',toggle:{key:'imbOn',defval:true},controls:[{kind:'number',key:'imb',label:'Rate %',defval:300,min:100,max:900,step:10},{kind:'number',key:'stacked',label:'堆叠 ≥',defval:3,min:2,max:8,step:1}]},
  {kind:'toggle',key:'poc',label:'POC',defval:true},{kind:'toggle',key:'va',label:'Value Area 70%',defval:true},
  {kind:'number',key:'auto',label:'Auto Transform 柱宽 px',defval:28,min:8,max:80,step:2}]},
 dataEngine:()=>({start(host){hostRef=host;host.pushData({an:AN})},onBars(){hostRef&&hostRef.pushData({an:AN})},onSettings(v){if(v.mode)S.mode=Math.max(0,MODES.indexOf(v.mode));if(v.viz)S.viz=Math.max(0,VIZ.indexOf(v.viz));if(v.scheme)S.scheme=Math.max(0,SCHEME.indexOf(v.scheme));let re=false;if(v.imb&&+v.imb!==S.imb){S.imb=+v.imb;re=true}if(v.stacked&&+v.stacked!==S.stacked){S.stacked=+v.stacked;re=true}if(v.poc!=null)S.poc=!!v.poc;if(v.va!=null)S.va=!!v.va;if(v.auto)S.auto=+v.auto;if(re)pushSettings();chips()},suspend(){},resume(){},stop(){hostRef=null}})});
V.registerRendererLayer({id:'footprint',placement:'above-data',repaintOnCursor:true,create:()=>({
 mount(canvas){layerCanvas=canvas},
 modulateBase(a){if(a.priceStyle!=='footprint')return null;const fp=a.coords.pxPerBar()>=S.auto;return fp?{candleBodyAlpha:0,candleBodyScale:.08,gridAlpha:.5}:null},
 animating:()=>lockAnim>.02||!!order&&order.state==='submitting',
 render(a){lastArgs=a;const g=layerCanvas.getContext('2d');const dpr=a.coords.dpr||1;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,a.coords.width,a.bounds.top+a.bounds.height+200);
  if(a.priceStyle!=='footprint')return;const data=a.data&&a.data.an;if(!data)return;
  const pxb=a.coords.pxPerBar(),fp=pxb>=S.auto;const vr=a.coords.visibleLogicalRange();const i0=Math.max(0,Math.floor(vr.from)),i1=Math.min(a.bars.length-1,Math.ceil(vr.to));
  const rowH=Math.abs(a.coords.priceToY(ANCHOR,a.scale,a.bounds)-a.coords.priceToY(ANCHOR+TICK,a.scale,a.bounds));const showText=fp&&rowH>=9&&pxb>=34;
  const bw=Math.max(2,pxb*.92);
  /* hover 行 */hoverI=null;hoverK=null;if(a.cursor&&fp){const li=Math.round(a.coords.xToLogical(a.cursor.x));if(a.bars[li]){const k=Math.round(a.coords.yToPrice(a.cursor.y,a.scale,a.bounds)/TICK);hoverI=li;hoverK=k;const y=a.coords.priceToY(k*TICK,a.scale,a.bounds);g.fillStyle='rgba(255,255,255,.035)';g.fillRect(0,y-rowH/2,a.coords.width,rowH)}}
  if(fp)for(let i=i0;i<=i1;i++){const b=a.bars[i],an=data.get(b.time);if(!an)continue;const x=a.coords.logicalToX(i)-bw/2,cw=bw,maxV=an.max||1;const imbA=new Set(an.imbA),imbB=new Set(an.imbB);
   if(S.va&&an.poc!=null){const yT=a.coords.priceToY(an.va[1]*TICK,a.scale,a.bounds)-rowH/2,yB=a.coords.priceToY(an.va[0]*TICK,a.scale,a.bounds)+rowH/2;g.fillStyle='rgba(255,255,255,.03)';g.fillRect(x,yT,cw,yB-yT)}
   an.levels.forEach(([k,bid,ask,trades])=>{const l={bid,ask,trades},y=a.coords.priceToY(k*TICK,a.scale,a.bounds),top=y-rowH/2,hh=Math.max(1,rowH-1),vol=bid+ask,d=ask-bid,share=vol/maxV;let bidCol,askCol,txt=share>.75?C.ink:C.ink2;
    if(S.scheme===0){const t=Math.min(1,Math.abs(d)/(maxV*.6));bidCol=d<0?`rgba(79,163,255,${.12+t*.5})`:C.cell;askCol=d>0?`rgba(255,106,31,${.12+t*.5})`:C.cell}else if(S.scheme===1){bidCol=C.bid1;askCol=C.ask1}else if(S.scheme===2){bidCol=`rgba(79,163,255,${.08+share*.55})`;askCol=`rgba(255,106,31,${.08+share*.55})`}else{bidCol=askCol=C.seq[Math.min(5,Math.floor(share*5.99))]}
    g.fillStyle=C.cell;g.fillRect(x,top,cw,hh);/* 不透明底，盖住底层 K 线影线 */
    if(S.viz===0){if(S.mode>=6&&S.mode<=8){g.fillStyle=bidCol;g.fillRect(x,top,cw/2-.5,hh);g.fillStyle=askCol;g.fillRect(x+cw/2+.5,top,cw/2-.5,hh)}else{g.fillStyle=S.scheme===3?bidCol:(d>=0?askCol:bidCol);g.fillRect(x,top,cw,hh)}}
    else if(S.viz===1){g.fillStyle=C.cell;g.fillRect(x,top,cw,hh);const wb=cw/2*(l.bid/maxV),wa=cw/2*(l.ask/maxV);g.fillStyle=C.bid;g.fillRect(x+cw/2-wb,top,wb,hh);g.fillStyle=C.ask;g.fillRect(x+cw/2,top,wa,hh)}
    else if(S.viz===2){g.fillStyle=C.cell;g.fillRect(x,top,cw,hh);g.fillStyle=S.scheme===3?bidCol:`rgba(236,230,216,${.15+share*.5})`;g.fillRect(x,top,cw*share,hh)}
    else{g.fillStyle=C.cell;g.fillRect(x,top,cw,hh);const w=cw/2*Math.min(1,Math.abs(d)/(maxV*.6));g.fillStyle=d>=0?C.ask:C.bid;g.fillRect(d>=0?x+cw/2:x+cw/2-w,top,w,hh)}
    if(showText){const two_=S.mode===2||S.mode===3||S.mode===6||S.mode===7;const fs=Math.max(7,Math.min(10,rowH-2,two_?(cw/2-4)/2.4:(cw-4)/2.6));g.font=`${fs}px ${MONO}`;g.textBaseline='middle';const cy=top+hh/2,m_=S.mode;const one=(s,col)=>{g.fillStyle=col||txt;g.textAlign='center';g.fillText(s,x+cw/2,cy)};const two=(sa,sb)=>{g.fillStyle=txt;g.textAlign='right';g.fillText(sa,x+cw/2-3,cy);g.textAlign='left';g.fillText(sb,x+cw/2+3,cy)};
     if(m_===0)one(fmt(vol));else if(m_===1)one(String(l.trades));else if(m_===2)two(fmt(vol),String(l.trades));else if(m_===3)two(fmt(vol),(d>=0?'+':'')+fmt(d));else if(m_===4)one((d>=0?'+':'')+fmt(d),d>=0?C.ask:C.bid);else if(m_===5){g.fillStyle=d>=0?C.ask:C.bid;g.textAlign=d>=0?'left':'right';g.fillText((d>=0?'+':'')+fmt(d),x+cw/2+(d>=0?3:-3),cy)}else if(m_===6||m_===7)two(fmt(l.bid),fmt(l.ask));else if(m_===8)one(fmt(l.bid)+'/'+fmt(l.ask))}
    if(imbA.has(k)){g.strokeStyle=C.ask;g.lineWidth=1;g.strokeRect(x+cw/2+1,top+.5,cw/2-2,hh-1)}if(imbB.has(k)){g.strokeStyle=C.bid;g.lineWidth=1;g.strokeRect(x+.5,top+.5,cw/2-2,hh-1)}
    if(S.poc&&k===an.poc){g.strokeStyle=C.or;g.strokeRect(x+.5,top+.5,cw-1,hh-1)}});
   g.lineWidth=2;an.stackA.forEach(([lo,hi])=>{const yT=a.coords.priceToY(hi*TICK,a.scale,a.bounds)-rowH/2,yB=a.coords.priceToY(lo*TICK,a.scale,a.bounds)+rowH/2;g.strokeStyle=C.ask;g.strokeRect(x+cw/2+1,yT+1,cw/2-2,yB-yT-2)});an.stackB.forEach(([lo,hi])=>{const yT=a.coords.priceToY(hi*TICK,a.scale,a.bounds)-rowH/2,yB=a.coords.priceToY(lo*TICK,a.scale,a.bounds)+rowH/2;g.strokeStyle=C.bid;g.strokeRect(x+1,yT+1,cw/2-2,yB-yT-2)});g.lineWidth=1;
   if(b===a.bars[a.bars.length-1]){g.strokeStyle='rgba(255,106,31,.45)';g.strokeRect(x-.5,a.coords.priceToY(b.high,a.scale,a.bounds)-rowH/2,cw+1,a.coords.priceToY(b.low,a.scale,a.bounds)-a.coords.priceToY(b.high,a.scale,a.bounds)+rowH)}}
  /* 统计行（pane 底部带；正式版做成 native indicator 子 pane） */const rows=S.stats.filter(s=>S.statsOn[s]);const STATH=14;const y0=a.bounds.top+a.bounds.height-rows.length*STATH-2;rows.forEach((name,ri)=>{const y=y0+ri*STATH;g.fillStyle='rgba(29,27,24,.92)';g.fillRect(0,y,a.coords.width,STATH-1);for(let i=i0;i<=i1;i++){const b=a.bars[i];const x=a.coords.logicalToX(i);let v,col=C.ink2;const src=bars.find(x=>x.time===b.time)||b;const d=src.delta||0;if(name==='Delta'){v=(d>=0?'+':'')+fmt(d);col=d>=0?C.up:C.dn}else if(name==='Volume')v=fmt(b.volume||0);else v=String(src.trades||0)
    if(pxb>=22){g.fillStyle=col;g.font=`9px ${MONO}`;g.textAlign='center';g.textBaseline='middle';g.fillText(v,x,y+STATH/2)}else{g.fillStyle=name==='Delta'?(d>=0?C.up:C.dn):C.ink4;g.fillRect(x-pxb/2+1,y+3,Math.max(1,pxb-2),STATH-6)}}
   g.fillStyle=C.ink3;g.font=`9px ${MONO}`;g.textAlign='right';g.textBaseline='middle';g.fillText(name.toUpperCase(),a.coords.width-4,y+STATH/2)});
  /* 订单草稿 / 已挂 */if(order){const y=Math.round(a.coords.priceToY(order.p,a.scale,a.bounds))+.5,col=order.state==='confirmed'?C.or:C.am;g.strokeStyle=col;g.setLineDash(order.state==='confirmed'?[]:[8,5]);g.lineWidth=order.state==='confirmed'?2:1;g.beginPath();g.moveTo(0,y);g.lineTo(a.coords.width,y);g.stroke();
   const sl=order.p-order.sl*TICK*(order.side>0?1:-1),tp=order.p+order.tp*TICK*(order.side>0?1:-1);[[sl,C.rd,'SL'],[tp,C.gr,'TP']].forEach(([p,c,lbl])=>{const yy=Math.round(a.coords.priceToY(p,a.scale,a.bounds))+.5;g.strokeStyle=c;g.setLineDash([3,3]);g.lineWidth=1;g.beginPath();g.moveTo(a.coords.width*.55,yy);g.lineTo(a.coords.width,yy);g.stroke();g.fillStyle=c;g.font=`9px ${MONO}`;g.textAlign='right';g.textBaseline='alphabetic';g.fillText(`${lbl} ${p.toFixed(DEC)}`,a.coords.width-4,yy-3)});g.setLineDash([]);g.lineWidth=1;
   const txt=`${order.side>0?'买':'卖'} LIMIT ${order.p.toFixed(DEC)} × ${order.qty} · ${{draft:'草稿 · 拖动改价 · ↵ 提交',submitting:'提交中…',confirmed:'已挂 · 括号 '+order.sl+'/'+order.tp}[order.state]}`;g.font=`10px ${MONO}`;const tw=g.measureText(txt).width+10;g.fillStyle=C.panel;g.fillRect(a.coords.width-tw-4,y-9,tw,16);g.strokeStyle=col;g.strokeRect(a.coords.width-tw-4+.5,y-9+.5,tw-1,15);g.fillStyle=col;g.textAlign='left';g.textBaseline='middle';g.fillText(txt,a.coords.width-tw+1,y)}
  /* 锁定括号 */if(lock!=null&&a.bars[lock]){const b=a.bars[lock],x=a.coords.logicalToX(lock)-bw/2,yT=a.coords.priceToY(b.high,a.scale,a.bounds)-rowH/2-3,yB=a.coords.priceToY(b.low,a.scale,a.bounds)+rowH/2+3,L=6+lockAnim*8;g.strokeStyle=C.or;g.lineWidth=1.5;[[x-L*.3,yT,1,1],[x+bw+L*.3,yT,-1,1],[x-L*.3,yB,1,-1],[x+bw+L*.3,yB,-1,-1]].forEach(([cx,cy,sx,sy])=>{g.beginPath();g.moveTo(cx+sx*L,cy);g.lineTo(cx,cy);g.lineTo(cx,cy+sy*L);g.stroke()});g.lineWidth=1;lockAnim*=.85}
  /* Agent 标注 */if(agentMark){const i=a.bars.findIndex(b=>b.time===agentMark.t);if(i>=0){const x=a.coords.logicalToX(i)-bw/2,y=a.coords.priceToY(agentMark.k*TICK,a.scale,a.bounds);g.strokeStyle=C.bl;g.lineWidth=1.5;g.setLineDash([4,3]);g.strokeRect(x-3,y-rowH/2-3,bw+6,rowH+6);g.setLineDash([]);g.lineWidth=1;g.fillStyle=C.bl;g.font=`10px ${MONO}`;g.textAlign='left';g.textBaseline='middle';g.fillText(agentMark.label,x+bw+8,y)}}
 }})});
/* ---------- 数据提供者（我们的适配器形态） ---------- */
const provider={info:()=>({name:'katana',displayName:'KATANA mock',capabilities:{enumerate:true,stream:true,symbolInfo:false}}),
 listSymbols:async()=>[{ticker:'300750',description:'宁德时代 · mock 逐笔',type:'stock',default:true}],
 getBars:async(ticker,tf,range)=>{const hist=await historyP;return hist.map(b=>({time:b.time,open:b.open,high:b.high,low:b.low,close:b.close,volume:b.volume}))},
 subscribe:(ticker,tf,onBar)=>{onLiveBar=b=>onBar({time:b.time,open:b.open,high:b.high,low:b.low,close:b.close,volume:b.volume});return ()=>{onLiveBar=null}}};
/* ---------- 图表 ---------- */
const THEME={background:C.bg,textColor:C.ink3,gridColor:tok('--bg-400','#242119'),borderColor:tok('--bg-400','#242119'),upColor:C.up,downColor:C.dn,fontFamily:MONO+', monospace'};
const chart=new V.Vela('#chart',{symbol:'300750',timeframe:'1',live:true,theme:THEME,upColor:C.up,downColor:C.dn,animations:{zoom:true,pan:true,scroll:true,autoscale:true,liveBar:false,intro:false}});
window.chart=chart;
chart.data.registerProvider('katana',provider);
chart.ready().then(()=>{chart.renderer.set('priceStyle','footprint');try{chart.drawings.showToolbar(true)}catch(e){}try{chart.indicators().forEach(h=>{if(h.nativeType==='volume')h.remove()})}catch(e){}
 const last=bars[bars.length-1].time;chart.setVisibleRange({from:last-19*60000,to:last+2*60000});$('#ftMode').innerHTML=`<b>数据流</b> Worker（代替本机引擎）产逐笔 → 聚合 / 失衡 / POC / VA 在那边算 → 前端只收结果 · <b>Vela</b> 只画坐标 / K 线 / 绘图 / 回放 / 设置 · <b>KATANA</b> 足迹层 / 命令 / 下单草稿 / Agent`});
chart.renderer.onClick(({time})=>{if(time==null)return;const i=bars.findIndex(b=>b.time===time);if(i>=0){lock=lock===i?null:i;lockAnim=1;sfx('tick')}});
/* 右键 = 下单草稿（用层画布的几何算价） */
$('#chart').addEventListener('contextmenu',e=>{if(!lastArgs||!layerCanvas)return;e.preventDefault();e.stopPropagation();const r=layerCanvas.getBoundingClientRect();const y=e.clientY-r.top;const p=+(Math.round(lastArgs.coords.yToPrice(y,lastArgs.scale,lastArgs.bounds)/TICK)*TICK).toFixed(DEC);order={p,side:p<=live.close?1:-1,qty:200,sl:12,tp:24,state:'draft'};sfx('lift')},true);
$('#chart').addEventListener('pointermove',e=>{if(!order||order.state!=='draft'||!e.buttons||!lastArgs)return;const r=layerCanvas.getBoundingClientRect();const y=e.clientY-r.top;if(Math.abs(lastArgs.coords.priceToY(order.p,lastArgs.scale,lastArgs.bounds)-y)<14){order.p=+(Math.round(lastArgs.coords.yToPrice(y,lastArgs.scale,lastArgs.bounds)/TICK)*TICK).toFixed(DEC);e.stopPropagation()}},true);
/* hover tooltip */const tip=$('#tip');$('#chart').addEventListener('pointermove',e=>{if(hoverI==null||hoverK==null){tip.style.display='none';return}const an=lastArgs&&lastArgs.bars[hoverI]&&AN.get(lastArgs.bars[hoverI].time);const row=an&&an.levels.find(r=>r[0]===hoverK);if(!row){tip.style.display='none';return}const l={bid:row[1],ask:row[2],trades:row[3]};const d=l.ask-l.bid;const r=$('#chart').getBoundingClientRect();tip.style.display='block';tip.style.left=Math.min(e.clientX-r.left+14,r.width-220)+'px';tip.style.top=Math.max(4,e.clientY-r.top-44)+'px';tip.innerHTML=`<b>${(hoverK*TICK).toFixed(DEC)}</b> · Bid <b>${fmt(l.bid)}</b> · Ask <b>${fmt(l.ask)}</b> · Δ <b>${d>=0?'+':''}${fmt(d)}</b> · ${l.trades} 笔`});
$('#chart').addEventListener('pointerleave',()=>tip.style.display='none');
function submitOrder(){order.state='submitting';sfx('key');setTimeout(()=>{if(order&&order.state==='submitting'){order.state='confirmed';sfx('latch')}},420)}
/* ---------- 工具条 chips / 命令表 ---------- */
function chips(){const el=$('#chips');el.innerHTML='';[...new Set([S.mode,...S.recent])].slice(0,4).forEach(m=>{const s=document.createElement('span');s.textContent=MODES[m];s.className=m===S.mode?'on':'';s.addEventListener('click',()=>setMode(m));el.appendChild(s)});$('#ftStat').innerHTML=`模式 <b>${MODES[S.mode]}</b> · 可视化 <b>${VIZ[S.viz]}</b> · 配色 <b>${SCHEME[S.scheme]}</b> · 失衡 <b>${S.imb}%</b>`}
function setMode(m){if(m===S.mode)return;S.recent=[S.mode,...S.recent.filter(x=>x!==S.mode&&x!==m)].slice(0,3);S.mode=m;sfx('key');chips()}chips();
const cmd=$('#cmd'),cmdIn=$('#cmdIn');function openCmd(v){cmd.hidden=false;cmdIn.value=v||'';cmdIn.focus();sfx('key')}
$('#btnCmd').addEventListener('click',()=>openCmd(''));cmdIn.addEventListener('keydown',e=>{if(e.key==='Escape'){cmd.hidden=true;cmdIn.blur()}if(e.key==='Enter'){const v=cmdIn.value.trim();cmd.hidden=true;cmdIn.blur();if(v)run(v)}});
const idx=(arr,s)=>arr.findIndex(x=>x.toLowerCase().replace(/[^a-z]/g,'').startsWith(s.toLowerCase().replace(/[^a-z]/g,'')));
function bad(v){sfx('no');$('#cmdHint').textContent=`无法识别：${v}`;setTimeout(()=>$('#cmdHint').textContent='Enter 执行 · Esc 关',1500)}
function run(v){const a=v.split(/\s+/),c=a[0].toLowerCase();
 if(c==='fp'){const sub=a[1],arg=a.slice(2).join(' ');if(sub==='mode'){const m=idx(MODES,arg);if(m<0)return bad(v);setMode(m)}else if(sub==='viz'){const m=idx(VIZ,arg);if(m<0)return bad(v);S.viz=m}else if(sub==='scheme'){const m=idx(SCHEME,arg);if(m<0)return bad(v);S.scheme=m}else if(sub==='imb'){S.imb=+arg||150;pushSettings()}else if(sub==='stack'){S.stacked=+arg||3;pushSettings()}else if(sub==='poc')S.poc=!S.poc;else if(sub==='va')S.va=!S.va;else if(sub==='auto')S.auto=+arg||28;else return bad(v);sfx('key');chips();return}
 if(c==='stat'){const n=S.stats.find(s=>s.toLowerCase().startsWith((a[1]||'').toLowerCase()));if(!n)return bad(v);S.statsOn[n]=!S.statsOn[n];sfx('key');return}
 if(c==='h'){const p=parseFloat(a[1]);if(isNaN(p))return bad(v);let d=null;try{d=chart.drawings.add('hline',{paneId:'price',anchors:[{time:live.time,price:p}]})}catch(e){}sfx(d?'ok':'no');$('#cmdHint').textContent=d?`Vela 绘图 hline ${p}`:'hline 未创建（看控制台）';return}
 if(c==='tool'){try{chart.drawings.setTool(a[1]||null);sfx('key')}catch(e){bad(v)}return}
 if(c==='ind'){try{chart.addNativeIndicator(a[1]||'sma',{inputs:a[2]?{length:+a[2]}:undefined});sfx('ok')}catch(e){bad(v)}return}
 if(c==='style'){try{chart.renderer.set('priceStyle',a[1]||'footprint');sfx('latch')}catch(e){bad(v)}return}
 if(c==='replay'){try{const from=bars[Math.max(0,bars.length-1-(+a[1]||60))].time;chart.replay.start({from}).then(()=>chart.replay.play(+a[2]||400));sfx('latch')}catch(e){bad(v)}return}
 if(c==='stop'){try{chart.replay.stop();sfx('tick')}catch(e){}return}
 if(c==='order'){const side=a[1]==='sell'?-1:1,p=parseFloat(a[2]);if(isNaN(p))return bad(v);order={p,side,qty:+(a[3]||200),sl:12,tp:24,state:'draft'};sfx('lift');return}
 if(c==='submit'){if(order&&order.state==='draft')submitOrder();return}
 if(c==='agent'){agentExplain();return}
 if(c==='clear'){order=null;agentMark=null;lock=null;$('#note').style.display='none';sfx('no');return}
 bad(v)}
addEventListener('keydown',e=>{if(e.target===cmdIn||e.target.tagName==='INPUT')return;const k=e.key.toLowerCase();if(k==='/'){e.preventDefault();openCmd('');return}if(k==='enter'&&order&&order.state==='draft'){submitOrder();return}if(k==='escape'){if(order&&order.state!=='confirmed'){order=null;sfx('no')}else if(agentMark){agentMark=null;$('#note').style.display='none'}else if(lock!=null){lock=null;sfx('tick')}}},true);
/* ---------- Agent 解读 ---------- */
function agentExplain(){let best=null;for(let i=Math.max(0,bars.length-31);i<bars.length-1;i++){const b=bars[i],an=AN.get(b.time);if(!an)continue;an.levels.forEach(([k,bid,ask,trades])=>{const sc=bid*(an.imbB.includes(k)?1.6:1)*(k===an.poc?1.3:1);if(!best||sc>best.sc)best={i,k,sc,l:{bid,ask,trades},b,an}})}if(!best)return;
 chart.setVisibleRange({from:best.b.time-14*60000,to:best.b.time+12*60000});sfx('lift');
 setTimeout(()=>{agentMark={t:best.b.time,k:best.k,label:`吸收 · Bid ${fmt(best.l.bid)}`};lock=best.i;lockAnim=1;sfx('tick');const p=(best.k*TICK).toFixed(DEC),t=new Date(best.b.time).toTimeString().slice(0,5);const n=$('#note');
  n.innerHTML=`<b>QUANT · ${t}</b><p>${p} 这一档被动买入 ${fmt(best.l.bid)}，是本根最大档${best.k===best.an.poc?'（POC）':''}${best.an.stackB.length?'，形成堆叠失衡':''}；价格没有跌破，卖压被吸收。之后 5 根里收在上方 ${bars.slice(best.i+1,best.i+6).filter(x=>x.close>+p).length} 根。</p><div class="acts"><span class="p" data-a="h">在 ${p} 画线（Vela）</span><span data-a="tape">看成交</span><span data-a="x">关</span></div>`;n.style.display='block';
  n.querySelectorAll('[data-a]').forEach(s=>s.addEventListener('click',()=>{const act=s.dataset.a;if(act==='h')run('h '+p);else if(act==='tape'){sfx('key');$('#cmdHint').textContent='→ SmartTape（样机未接）'}else sfx('tick');n.style.display='none';agentMark=null}))},500)}
$('#btnAgent').addEventListener('click',agentExplain);
window.KFootprint={run,settings:S,chart};
})();
