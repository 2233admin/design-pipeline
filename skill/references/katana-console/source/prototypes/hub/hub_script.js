/* ======================================================================
   HUB · 像素基地（SVG）
   ====================================================================== */
const NS='http://www.w3.org/2000/svg';
const svg=document.getElementById('scene');
const el=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)if(attrs[k]!=null)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e};
const R=(p,x,y,w,h,fill,extra)=>el('rect',{x:x|0,y:y|0,width:w|0,height:h|0,fill,...(extra||{})},p);
const PC={bg:'#0b0b09',ground:'#141311',cell:'#171511',panel:'#1d1b18',raise:'#26231e',wall:'#3a3631',wall2:'#2a2722',ink:'#ece6d8',ink2:'#b9b2a3',ink3:'#7d776b',ink4:'#4a463f',
 or:'#ff6a1f',am:'#ffc03a',bl:'#4fa3ff',gr:'#5bd36b',rd:'#ff4d3d',glass:'#0e1a2a',moon:'#e9e3d2'};
/* ---- 点阵字：普通字体阈值化 → dataURL，SVG <image> 承载 ---- */
const gc=document.createElement('canvas'),gx=gc.getContext('2d'),gcache=new Map();
function glyph(str,size,col,bold){const k=str+'|'+size+'|'+col+'|'+(bold?1:0);if(gcache.has(k))return gcache.get(k);
 const font=`${bold?'bold ':''}${size}px "Noto Sans SC","Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif`;gx.font=font;const w=Math.ceil(gx.measureText(str).width)+2,h=size+4;gc.width=w;gc.height=h;gx.font=font;gx.textBaseline='top';gx.fillStyle='#fff';gx.fillText(str,1,1);
 const d=gx.getImageData(0,0,w,h),o=document.createElement('canvas');o.width=w;o.height=h;const oc=o.getContext('2d'),od=oc.createImageData(w,h);const r=parseInt(col.slice(1,3),16),g=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);
 for(let i=0;i<d.data.length;i+=4)if(d.data[i+3]>(size<=10?70:105)){od.data[i]=r;od.data[i+1]=g;od.data[i+2]=b;od.data[i+3]=255}oc.putImageData(od,0,0);const res={url:o.toDataURL(),w,h};gcache.set(k,res);return res}
function T(p,str,x,y,size=10,col=PC.ink,bold=false,align='l'){const g=glyph(String(str),size,col,bold);let X=x;if(align==='r')X=x-g.w+2;if(align==='c')X=x-(g.w>>1);return el('image',{href:g.url,x:X|0,y:y|0,width:g.w,height:g.h,class:'px'},p)}
function setT(img,str,size,col,bold){const g=glyph(String(str),size,col,bold);img.setAttribute('href',g.url);img.setAttribute('width',g.w);img.setAttribute('height',g.h);return g}
const bracket=(p,x,y,w,h,col,l=5)=>{const g=el('g',{class:'brk'},p);[[x,y,l,1],[x,y,1,l],[x+w-l,y,l,1],[x+w-1,y,1,l],[x,y+h-1,l,1],[x,y+h-l,1,l],[x+w-l,y+h-1,l,1],[x+w-1,y+h-l,1,l]].forEach(a=>R(g,...a,col));return g};
/* ---- 声音（壳层手感样机的三层：UI / 机器 / 事件） ---- */
let AC=null;function sfx(kind){try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime;const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);
 const P={key:[1800,.03,'square',.05],up:[2400,.02,'square',.03],latch:[160,.14,'sawtooth',.08],ok:[880,.08,'triangle',.07],no:[140,.18,'square',.07],lift:[90,.12,'sine',.08],tick:[2600,.012,'square',.02]}[kind]||[600,.05,'square',.05];
 o.type=P[2];o.frequency.setValueAtTime(P[0],t);if(kind==='ok')o.frequency.setValueAtTime(1320,t+.04);if(kind==='latch')o.frequency.setValueAtTime(110,t+.07);g.gain.setValueAtTime(P[3],t);g.gain.exponentialRampToValueAtTime(.0001,t+P[1]);o.start(t);o.stop(t+P[1]+.02)}catch(e){}}
/* ---- 弹簧（壳层样机同一积分器） ---- */
const springs=[];function spring(obj,key,to,preset,onUpdate){const P={snappy:{k:520,c:38,m:.8},gentle:{k:170,c:26,m:1},settle:{k:300,c:34,m:1}}[preset];let s=springs.find(x=>x.obj===obj&&x.key===key);if(!s){s={obj,key,v:0};springs.push(s)}Object.assign(s,{to,...P,onUpdate});}
function stepSprings(dt){for(let i=springs.length-1;i>=0;i--){const s=springs[i];const x=s.obj[s.key];const a=(-s.k*(x-s.to)-s.c*s.v)/s.m;s.v+=a*dt;s.obj[s.key]=x+s.v*dt;if(s.onUpdate)s.onUpdate();if(Math.abs(s.v)<.02&&Math.abs(s.obj[s.key]-s.to)<.02){s.obj[s.key]=s.to;if(s.onUpdate)s.onUpdate();springs.splice(i,1)}}}

/* ---- 世界 ---- */
const BX=130,RX=150,RW=376,FY0=36,FH=58,NF=5,SHX=130,SHW=18;const fy=i=>FY0+i*FH;
const FLOORS=[{id:'core',n:'4F',ws:'capital',name:'组合',code:'CAPITAL'},{id:'live',n:'3F',ws:'capital',name:'组合 · 实盘',code:'LIVE'},{id:'lab',n:'2F',ws:'lab',name:'研究',code:'LAB'},{id:'desk',n:'1F',ws:'desk',name:'盯盘',code:'DESK'},{id:'ops',n:'B1',ws:'ops',name:'调度 / 档案',code:'OPS'}];
const WSNAV=[['01','盯盘','DESK','desk',3],['02','组合','CAPITAL','capital',0],['03','研究','LAB','lab',2],['04','调度','OPS','ops',4],['05','档案','JOURNAL','arch',4]];
const ROOMS=[
 {id:'core',f:0,x:150,w:376,name:'中枢',code:'COCKPIT',col:PC.or,kind:'cockpit',ws:'capital',sub:'资本与决策',kv:[['净资产','2,265,380'],['今日','+18,408'],['总敞口','1.42×'],['决策','6 待']],acts:['进入','报告']},
 {id:'s1',f:1,x:150,w:187,name:'mom-core',code:'LIVE',col:PC.am,kind:'strat',pct:.31,ws:'capital',strat:'mom-core',sub:'账户 A B',kv:[['资本占用','31%'],['YTD','+14.2%'],['偏离','4.1%'],['门','5/5']],acts:['调仓','暂停']},
 {id:'s2',f:1,x:339,w:187,name:'liq-hedge',code:'LIVE',col:PC.am,kind:'strat',pct:.58,ws:'capital',strat:'liq-hedge',sub:'账户 F',kv:[['容量','58%'],['YTD','+3.1%'],['偏离','2.8%'],['Δ-eq','-1,840']],acts:['调仓','暂停']},
 {id:'s3',f:2,x:150,w:122,name:'momo-7',code:'PAPER',col:PC.bl,kind:'strat',pct:.63,ws:'lab',strat:'momo-7',sub:'第 38 / 60 日',kv:[['OOS Sharpe','0.94'],['偏离','6.2%'],['换手','910%'],['门','4/5']],acts:['推进','对照']},
 {id:'s4',f:2,x:274,w:122,name:'alice-rev',code:'PAPER',col:PC.bl,kind:'strat',pct:.2,dim:true,ws:'lab',sub:'已暂停 10:12',kv:[['偏离','19.4%'],['成交率','81%'],['信号一致','96%'],['门','4/5']],acts:['复核','退役']},
 {id:'lab',f:2,x:398,w:128,name:'研究所',code:'LAB',col:PC.bl,kind:'lab',ws:'lab',sub:'2 run 运行中',kv:[['运行中','2'],['排队','5'],['假设','38'],['GPU','91%']],acts:['新 run','队列']},
 {id:'desk',f:3,x:150,w:200,name:'交易台',code:'DESK',col:PC.or,kind:'desk',ws:'desk',sub:'300750 · 6ms',kv:[['在途','6 单'],['今日成交','7'],['滑点','-6.2bp'],['延迟','6ms']],acts:['进入','回放']},
 {id:'data',f:3,x:352,w:174,name:'数据塔',code:'PIT',col:PC.gr,kind:'data',ws:'desk',sub:'14 数据集',kv:[['在线源','11/12'],['有洞','2'],['过期','1'],['质量','0.31%']],acts:['目录','质量']},
 {id:'ops',f:4,x:150,w:187,name:'调度',code:'OPS',col:PC.gr,kind:'ops',ws:'ops',sub:'对账差异 3',kv:[['差异','3'],['最老','2d'],['会话','4'],['等人','1']],acts:['对账','会话']},
 {id:'arch',f:4,x:339,w:187,name:'档案',code:'JOURNAL',col:PC.ink3,kind:'arch',ws:'arch',sub:'决策 1,204 条',kv:[['本周','31'],['命中','58%'],['复盘待','4'],['报告','12']],acts:['翻阅','导出']},
];
const RM=Object.fromEntries(ROOMS.map(r=>[r.id,r]));
const AGDEF=[['Research',PC.bl,'lab','跑 run 2E52'],['Data',PC.gr,'data','修 AkShare 过期源'],['Quant',PC.bl,'s3','momo-7 换手复核'],['Portfolio',PC.am,'core','再平衡 RB-1410'],['Execution',PC.or,'s2','盯账户 B 日限'],['Ops',PC.gr,'ops','对账 #117']];
const QUEUE=[
 {id:'q1',verb:'停？',text:'账户 B 距日限 0.76%',sub:'OPS · 14:32',col:PC.rd,room:'s2',agent:'Execution',confirm:'停 liq-hedge · 账户 B 全部策略？',effect:()=>{RM.s2.dim=true;RM.s2.code='STOPPED';RM.s2.sub='已停 · 日限';RM.s2.alarm=false;rebuildRoom('s2')}},
 {id:'q2',verb:'批准',text:'再平衡 4 笔 · 成本 412',sub:'PORTFOLIO · RB-1410',col:PC.or,room:'core',agent:'Portfolio',confirm:'批准再平衡 4 笔？预计成本 412',effect:()=>{RM.s1.pct=.36;RM.s1.kv[0][1]='36%';RM.core.kv[3][1]='5 待';rebuildRoom('s1');rebuildRoom('core')}},
 {id:'q3',verb:'调整',text:'momo-7 换手 910%',sub:'QUANT · RUN 2E52',col:PC.am,room:'s3',agent:'Quant',confirm:'momo-7 进入复核，模拟盘暂停？',effect:()=>{RM.s3.dim=true;RM.s3.code='REVIEW';RM.s3.sub='复核中';rebuildRoom('s3')}},
 {id:'q4',verb:'查',text:'券商 F 差 1 手',sub:'BREAK #117',col:PC.ink3,room:'ops',agent:'Ops',confirm:'标记 #117 已核对？',effect:()=>{RM.ops.sub='对账差异 2';RM.ops.kv[0][1]='2';rebuildRoom('ops')}},
];
RM.s2.alarm=true; // 账户 B 临近日限 → 红闪 + 斜纹
let phase='盘中',focusRoom='core',hoverRoom=null,t=0,cabY=fy(0),cabTarget=0;
const S={mode:'hub'};

/* ---- 场景骨架 ---- */
const L={sky:el('g',{id:'sky'},svg),back:el('g',{},svg),build:el('g',{},svg),rooms:el('g',{},svg),agents:el('g',{},svg),fx:el('g',{},svg),hud:el('g',{id:'hud'},svg),nav:el('g',{},svg),side:el('g',{},svg),queue:el('g',{},svg),dlg:el('g',{},svg),tip:el('g',{},svg)};
/* 天空（按阶段换色，CSS 过渡） */
const sky=R(L.sky,0,0,640,360,'#07080c',{id:'skyrect'});
const stars=[];for(let i=0;i<70;i++){const s=R(L.sky,Math.random()*640|0,27+Math.random()*34|0,1,1,Math.random()>.8?PC.ink2:PC.ink4,{class:'star'});s.style.animationDelay=(Math.random()*4).toFixed(2)+'s';stars.push(s)}
const moon=el('g',{id:'moon'},L.sky);R(moon,600,34,6,6,PC.moon);R(moon,602,33,2,1,PC.moon);R(moon,598,36,1,2,PC.moon);
const sun=el('g',{id:'sun'},L.sky);R(sun,596,36,10,10,'#ffd27a');R(sun,598,34,6,1,'#ffd27a');R(sun,598,47,6,1,'#ffd27a');
/* 天际线 */
for(let i=0;i<14;i++){const bx=i*48-10,bh=10+((i*37)%30);R(L.back,bx,fy(NF)-bh,36,bh,'#0f100f');for(let j=0;j<4;j++)if((i*j+3)%3===0)R(L.back,bx+6+j*8,fy(NF)-bh+6,2,2,'#2a2a22',{class:'win'})}
/* 楼体 */
R(L.build,BX-4,FY0-8,RW+8+ (RX-BX)+4,NF*FH+10,PC.wall2);R(L.build,BX-2,FY0-6,RW+4+(RX-BX)+4,NF*FH+6,PC.ground);
R(L.build,BX+40,FY0-30,2,24,PC.ink3);R(L.build,BX+36,FY0-32,10,2,PC.ink3);const blink=R(L.build,BX+40,FY0-34,2,2,PC.rd,{class:'blink'});R(L.build,BX+300,FY0-18,24,12,PC.wall);R(L.build,BX+304,FY0-24,16,6,PC.ink4);
T(L.build,'KATANA · SEC 02',BX+120,FY0-20,8,PC.ink4);
/* 电梯井 */
R(L.build,SHX,FY0,SHW,NF*FH-6,'#0e0e0c');for(let i=0;i<NF;i++)R(L.build,SHX,fy(i)+FH-8,SHW,2,PC.wall2);
const cab=el('g',{},L.build);R(cab,SHX+2,0,SHW-4,18,PC.wall);R(cab,SHX+3,1,SHW-6,16,PC.raise);const cabLed=R(cab,SHX+4,2,2,2,PC.gr);
const inCab=el('g',{},L.build);
for(let i=0;i<NF;i++)T(L.build,FLOORS[i].n,RX+RW+3,fy(i)+2,7,PC.ink4);

/* ---- 房间 ---- */
const roomEls={},leds=[];
function rebuildRoom(id){const r=RM[id];if(roomEls[id])roomEls[id].remove();const y=fy(r.f),h=FH-6;const g=el('g',{class:'room'+(r.dim?' dim':'')+(r.alarm?' alarm':''),'data-id':id},L.rooms);roomEls[id]=g;
 for(let i=leds.length-1;i>=0;i--)if(leds[i].room===id)leds.splice(i,1);
 R(g,r.x,y,r.w,h,r.dim?'#151412':PC.cell,{class:'floorbg'});R(g,r.x,y+h-2,r.w,2,PC.wall);R(g,r.x,y+h-3,r.w,1,PC.wall2);if(r.x>RX)R(g,r.x-2,y,2,h,PC.wall);
 if(r.alarm){const hz=el('g',{class:'hz'},g);for(let i=0;i<r.w;i+=8)R(hz,r.x+i,y,4,2,PC.am)}
 R(g,r.x+4,y+4,3,3,r.col,{class:'lamp'});T(g,r.code,r.x+10,y+1,8,r.col,true);T(g,r.name,r.x+10,y+9,12,r.dim?PC.ink3:PC.ink,true);
 const fx=r.x+6,led=(x,yy,col,ph)=>{const e=R(g,x,yy,2,2,PC.ink4);leds.push({e,col,ph,room:id,dim:r.dim});return e};
 if(r.kind==='cockpit'){R(g,r.x+180,y+6,150,34,PC.wall);R(g,r.x+181,y+7,148,32,PC.glass);r.poly=el('polyline',{fill:'none',stroke:PC.or,'stroke-width':1,points:''},g);r.scan=R(g,r.x+181,y+7,148,1,'rgba(255,255,255,.08)',{class:'scan'});
  for(let i=0;i<3;i++){R(g,r.x+340,y+6+i*11,28,9,PC.wall);R(g,r.x+341,y+7+i*11,26,7,PC.glass);for(let k=0;k<8;k++)R(g,r.x+343+k*3,y+9+i*11+((k*7+i)%3),2,2,(k+i)%2?PC.gr:PC.rd)}
  R(g,r.x+100,y+30,60,10,PC.wall);R(g,r.x+101,y+31,58,8,PC.raise);for(let i=0;i<8;i++)led(r.x+110+i*6,y+22,i<5?PC.gr:PC.am,i);T(g,'A B F',r.x+100,y+14,8,PC.ink3)}
 if(r.kind==='strat'){R(g,fx+r.w-70,y+18,56,28,PC.wall);R(g,fx+r.w-69,y+19,54,26,PC.panel);for(let i=0;i<6;i++)for(let j=0;j<3;j++)led(fx+r.w-66+i*7,y+22+j*5,r.col,i*1.1+j*2.3);
  R(g,fx+r.w-66,y+40,46,3,PC.ink4);R(g,fx+r.w-66,y+40,46*r.pct|0,3,r.dim?PC.ink3:r.col,{class:'bar'});
  R(g,fx+8,y+30,40,3,PC.wall);R(g,fx+14,y+22,12,8,PC.wall);R(g,fx+15,y+23,10,6,PC.glass);R(g,fx+16,y+24,8,1,r.col);R(g,fx+34,y+33,2,8,PC.wall);R(g,fx+32,y+41,6,1,PC.wall)}
 if(r.kind==='lab'){for(let k=0;k<3;k++){const rx=fx+6+k*26;R(g,rx,y+22,20,26,PC.wall);R(g,rx+1,y+23,18,24,PC.panel);for(let j=0;j<5;j++)for(let i=0;i<3;i++)led(rx+4+i*5,y+26+j*4,PC.bl,j+k*3+i*.7)}R(g,fx+90,y+24,28,18,PC.wall);R(g,fx+91,y+25,26,16,PC.raise);R(g,fx+94,y+28,20,1,PC.ink3);R(g,fx+94,y+32,14,1,PC.ink3);R(g,fx+94,y+36,18,1,PC.bl)}
 if(r.kind==='desk'){for(let i=0;i<4;i++){const mx=fx+8+i*44;R(g,mx,y+22,38,16,PC.wall);R(g,mx+1,y+23,36,14,PC.glass);for(let k=0;k<11;k++){const up=Math.sin(i*3.1+k)>0;R(g,mx+3+k*3,y+26+((k*5+i)%6),2,3,up?PC.gr:PC.rd)}}R(g,fx+8,y+40,170,2,PC.wall);R(g,fx+40,y+43,40,2,PC.ink4);R(g,fx+100,y+43,40,2,PC.ink4)}
 if(r.kind==='data'){for(let k=0;k<4;k++){const rx=fx+8+k*32;R(g,rx,y+22,24,26,PC.wall);R(g,rx+1,y+23,22,24,PC.panel);for(let j=0;j<5;j++){R(g,rx+3,y+26+j*4,18,2,PC.wall2);const e=led(rx+19,y+26+j*4,j===3&&k===1?PC.rd:PC.gr,j*1.7+k);if(j===3&&k===1)e.setAttribute('fill',PC.rd)}}}
 if(r.kind==='ops'){R(g,fx+8,y+22,100,26,PC.wall);R(g,fx+9,y+23,98,24,PC.panel);for(let j=0;j<3;j++){R(g,fx+12,y+26+j*7,60,2,PC.ink4);R(g,fx+12,y+26+j*7,[44,30,52][j],2,PC.ink3);R(g,fx+78,y+26+j*7,2,2,j<parseInt(r.kv[0][1])?PC.rd:PC.gr);T(g,['2d','1d','4h'][j],fx+84,y+22+j*7,8,PC.ink3)}R(g,fx+124,y+24,30,14,PC.wall);R(g,fx+125,y+25,28,12,PC.glass);T(g,'14:32',fx+127,y+26,9,PC.am,true)}
 if(r.kind==='arch'){for(let k=0;k<2;k++){R(g,fx+8,y+32+k*10,160,1,PC.wall);for(let i=0;i<30;i++)R(g,fx+9+i*5+k*2,y+24+k*10,3,8,[PC.ink4,PC.wall,PC.ink3,'#5a4a3a'][(i*7+k)%4])}}
 r.brk=bracket(g,r.x+1,y+1,r.w-2,h-4,PC.or,5);r.brk.style.display='none';
 const hit=R(g,r.x,y,r.w,h,'transparent',{class:'hit'});
 hit.addEventListener('pointerenter',e=>{hoverRoom=id;sfx('tick');showTip(e,[[r.name,12,PC.ink,true],[r.code+' · '+r.sub,8,r.col]]);updateBrackets()});hit.addEventListener('pointermove',e=>moveTip(e));hit.addEventListener('pointerleave',()=>{hoverRoom=null;hideTip();updateBrackets()});
 hit.addEventListener('click',()=>{sfx('key');setFocus(id)});hit.addEventListener('dblclick',()=>enterWS(r.ws,{room:id}));
 hit.addEventListener('contextmenu',e=>{e.preventDefault();setFocus(id)});
 updateBrackets()}
ROOMS.forEach(r=>rebuildRoom(r.id));
function updateBrackets(){ROOMS.forEach(r=>{const on=r.id===focusRoom,hv=r.id===hoverRoom;r.brk.style.display=(on||hv)?'':'none';r.brk.querySelectorAll('rect').forEach(q=>q.setAttribute('fill',on?PC.or:PC.ink2))})}

/* ---- Agent 小人 ---- */
const agents=AGDEF.map((a,i)=>{const g=el('g',{class:'agent'},L.agents);R(g,1,0,4,4,a[1]);R(g,1,1,4,1,'#0b0b09');R(g,0,4,6,5,PC.ink2);const l1=R(g,1,9,1,2,PC.ink3),l2=R(g,4,9,1,2,PC.ink2);const eye=R(g,6,5,1,2,a[1]);const badge=el('g',{class:'badge'},g);R(badge,-1,-6,8,5,PC.bg);R(badge,0,-5,6,3,a[1]);
 const hit=R(g,-2,-8,10,20,'transparent',{class:'hit'});const ag={name:a[0],col:a[1],g,l1,l2,eye,badge,task:{room:a[2],label:a[3]},f:RM[a[2]].f,x:RX+40+i*50,tx:RX+40+i*50,dir:1,wait:1+Math.random()*2,ride:0,rf:RM[a[2]].f};
 hit.addEventListener('pointerenter',e=>{showTip(e,[[a[0],11,a[1],true],[ag.task?'正在：'+ag.task.label:'空闲',9,PC.ink2]]);g.classList.add('hl')});hit.addEventListener('pointermove',moveTip);hit.addEventListener('pointerleave',()=>{hideTip();g.classList.remove('hl')});
 hit.addEventListener('click',()=>{sfx('key');const q=QUEUE.find(q=>q.agent===ag.name&&!q.done);if(q)selectCard(q.id);else setFocus(ag.task?ag.task.room:'core')});return ag});
function stepAgents(dt){agents.forEach(a=>{if(a.ride){cabTarget=a.rf;if(Math.abs(cabY-fy(a.rf))<.5){a.ride=0;a.f=a.rf;a.x=SHX+SHW+2;a.tx=a.task?RM[a.task.room].x+RM[a.task.room].w/2:RX+30+Math.random()*(RW-60);a.dir=1}return}
 if(a.wait>0){a.wait-=dt;return}
 if(Math.abs(a.tx-a.x)<1){a.wait=2+Math.random()*4;const want=a.task?RM[a.task.room]:null;const wander=!want||Math.random()<.3;const targetF=want&&!wander?want.f:(Math.random()*NF|0);
  if(targetF!==a.f){a.rf=targetF;a.tx=SHX+SHW+2;a.goElev=true}else a.tx=want&&!wander?want.x+8+Math.random()*(want.w-16):RX+30+Math.random()*(RW-60);return}
 a.dir=a.tx>a.x?1:-1;a.x+=a.dir*dt*22;
 if(a.goElev&&Math.abs(a.tx-a.x)<1){a.goElev=false;if(Math.abs(cabY-fy(a.f))<1)a.ride=1;else{cabTarget=a.f;a.wait=1.5;a.tx=a.x}}});
 const want=fy(cabTarget);cabY+=Math.sign(want-cabY)*Math.min(Math.abs(want-cabY),dt*60);cab.setAttribute('transform',`translate(0,${(cabY+FH-6-20)|0})`);cabLed.setAttribute('fill',Math.abs(cabY-fy(cabTarget))<1?PC.gr:PC.am);
 inCab.innerHTML='';agents.forEach(a=>{const step=(t*8|0)%2;if(a.ride){a.g.style.display='none';R(inCab,SHX+6,(cabY+FH-6-11)|0,4,4,a.col);R(inCab,SHX+5,(cabY+FH-6-7)|0,6,6,PC.ink2);return}a.g.style.display='';a.g.setAttribute('transform',`translate(${a.x|0},${fy(a.f)+FH-6-11})`);a.l1.setAttribute('fill',step?PC.ink3:PC.ink2);a.l2.setAttribute('fill',step?PC.ink2:PC.ink3);a.eye.setAttribute('x',a.dir>0?6:-1);a.badge.style.display=a.task?'':'none'})}

/* ---- 提示 / 对象卡 ---- */
function showTip(e,lines){L.tip.innerHTML='';const g=el('g',{},L.tip);let w=0,h=4;const imgs=lines.map(l=>{const gl=glyph(l[0],l[1],l[2],l[3]);w=Math.max(w,gl.w);const img=el('image',{href:gl.url,x:5,y:h,width:gl.w,height:gl.h},g);h+=gl.h+1;return img});R(g,0,0,w+10,h+2,PC.panel,{stroke:PC.ink2,'stroke-width':1});g.insertBefore(g.lastChild,g.firstChild);L.tip._w=w+10;L.tip._h=h+2;moveTip(e)}
function moveTip(e){const p=toScene(e);const x=Math.min(p.x+8,640-L.tip._w-2),y=Math.max(2,p.y-L.tip._h-6);L.tip.setAttribute('transform',`translate(${x|0},${y|0})`)}
function hideTip(){L.tip.innerHTML=''}
function toScene(e){const r=svg.getBoundingClientRect();const vb=svg.viewBox.baseVal;return {x:vb.x+(e.clientX-r.left)/r.width*vb.width,y:vb.y+(e.clientY-r.top)/r.height*vb.height}}

/* ---- HUD：顶部资源条 ---- */
function buildTop(){L.hud.innerHTML='';const g=L.hud;R(g,0,0,640,26,PC.panel);R(g,0,26,640,1,PC.wall);R(g,8,10,5,5,PC.or);T(g,'KATANA',18,6,13,PC.ink,true);
 /* 阶段分段控件 */
 ['盘前','盘中','盘后'].forEach((p,i)=>{const x=86+i*34;const on=p===phase;R(g,x,6,32,14,on?PC.raise:PC.panel,{stroke:on?PC.ink3:PC.wall,'stroke-width':1,class:'btn','data-phase':p});T(g,p,x+16,8,10,on?PC.ink:PC.ink3,on,'c')});
 const chk=R(g,196,6,36,14,PC.panel,{stroke:PC.wall,'stroke-width':1,class:'btn',id:'btnCheck'});T(g,'自检',214,8,10,PC.ink3,false,'c');
 const items=[['净资产','2,265,380',PC.ink],['可用','486,900',PC.gr],['今日','+18,408',PC.gr],['风险预算','71%',PC.am],['代理','6 · 2 忙',PC.ink]];let x=640-50;
 g._clock=T(g,'00:00',632,7,11,PC.ink2,false,'r');
 for(let i=items.length-1;i>=0;i--){const it=items[i];const a=glyph(it[0],10,PC.ink3),b=glyph(it[1],11,it[2],true);const w=Math.max(a.w,b.w);T(g,it[0],x,1,10,PC.ink3,false,'r');const img=T(g,it[1],x,12,11,it[2],true,'r');if(i===2)g._pnl=img;x-=w+22;R(g,x+10,4,1,18,PC.wall)}
 g.querySelectorAll('[data-phase]').forEach(b=>b.addEventListener('click',()=>{sfx('key');setPhase(b.dataset.phase)}));chk.addEventListener('click',()=>{sfx('key');selfCheck()})}
function setPhase(p){phase=p;document.body.dataset.phase=p;buildTop();sfx('latch')}
/* ---- 左侧楼层入口 ---- */
function buildNav(){L.nav.innerHTML='';WSNAV.forEach((n,i)=>{const y=44+i*34;const g=el('g',{class:'navitem','data-ws':n[3]},L.nav);const bg=R(g,6,y,112,30,'transparent');const bar=R(g,6,y,2,30,'transparent');T(g,n[0],14,y+6,13,PC.ink4,true);T(g,n[1],42,y+2,13,PC.ink2,true);T(g,n[2],42,y+18,8,PC.ink3);if(n[3]==='capital')T(g,'3',108,y+8,10,PC.am,true,'r');if(n[3]==='lab')T(g,'2',108,y+8,10,PC.am,true,'r');
 g.addEventListener('pointerenter',()=>{bg.setAttribute('fill','#131210');hiFloor(n[4],true)});g.addEventListener('pointerleave',()=>{bg.setAttribute('fill','transparent');hiFloor(n[4],false)});g.addEventListener('click',()=>{sfx('key');enterWS(n[3],{})})})}
function hiFloor(i,on){ROOMS.filter(r=>r.f===i).forEach(r=>roomEls[r.id].classList.toggle('fl',on))}
/* ---- 右侧焦点牌 ---- */
function setFocus(id){focusRoom=id;updateBrackets();buildSide();hubLog(`focus = ${RM[id].name}`)}
function buildSide(){L.side.innerHTML='';const r=RM[focusRoom];const x=536,y=36,w=98,h=176;const g=el('g',{},L.side);R(g,x,y,w,h,PC.wall);R(g,x+1,y+1,w-2,h-2,PC.panel);R(g,x,y,w,1,r.col);
 T(g,r.name,x+6,y+5,13,PC.ink,true);T(g,r.sub,x+6,y+20,10,r.col);R(g,x+6,y+31,w-12,1,PC.wall);
 r.kv.forEach((k,i)=>{const yy=y+36+i*20;T(g,k[0],x+6,yy,10,PC.ink3);T(g,k[1],x+w-6,yy+6,11,PC.ink,true,'r')});
 let ax=x+6;agents.filter(a=>a.task&&a.task.room===focusRoom).forEach(a=>{R(g,ax,y+120,3,3,a.col);const gl=glyph(a.name,8,PC.ink2);T(g,a.name,ax+5,y+116,8,PC.ink2);ax+=gl.w+10});
 const b1=R(g,x+6,y+136,42,18,PC.ink,{class:'btn'});T(g,'进入',x+27,y+138,11,PC.bg,true,'c');const b2=R(g,x+50,y+136,42,18,PC.panel,{stroke:PC.wall,'stroke-width':1,class:'btn'});T(g,r.acts[1],x+71,y+138,11,PC.ink,false,'c');
 g.querySelectorAll('.btn')[0].addEventListener('click',()=>enterWS(r.ws,{room:r.id}));g.querySelectorAll('.btn')[1].addEventListener('click',()=>{sfx('no');hubLog(`「${r.acts[1]}」需要进入 ${r.ws} 工作区执行（样机不做）`)});
 T(g,'↵ 进入 · Esc 返回 · / 命令',x+w-2,y+h+4,8,PC.ink4,false,'r')}
/* ---- 底部待决队列 ---- */
let selCard=null;
function buildQueue(){L.queue.innerHTML='';R(L.queue,0,330,640,1,PC.wall);R(L.queue,0,331,640,29,PC.ground);let x=8;const live=QUEUE.filter(q=>!q.done);
 live.forEach(q=>{const w=142;const g=el('g',{class:'card'+(selCard===q.id?' on':''),'data-id':q.id},L.queue);R(g,x,334,w,24,PC.wall);R(g,x+1,335,w-2,22,selCard===q.id?PC.raise:PC.panel);R(g,x,334,2,24,q.col);
  const vb=R(g,x+4,337,28,18,'transparent',{class:'btn'});T(g,q.verb,x+6,338,12,q.col,true);T(g,q.text,x+38,335,10,PC.ink);T(g,q.sub,x+38,348,7,PC.ink3);
  g.addEventListener('click',()=>{sfx('key');selectCard(q.id)});vb.addEventListener('click',e=>{e.stopPropagation();sfx('key');openDialog(q)});x+=w+4});
 T(L.queue,'待决 '+live.length,632,336,10,PC.am,true,'r');T(L.queue,'已决 '+(9+QUEUE.filter(q=>q.done).length),632,347,8,PC.ink4,false,'r');
 if(!live.length)T(L.queue,'没有待决事项',320,340,11,PC.ink3,false,'c')}
function selectCard(id){selCard=id;const q=QUEUE.find(q=>q.id===id);buildQueue();setFocus(q.room);agents.forEach(a=>a.g.classList.toggle('hl',a.name===q.agent));hubLog(`提案 ${q.verb} ${q.text} → 房间 ${RM[q.room].name} · Agent ${q.agent}`)}
/* ---- 像素确认框 ---- */
function openDialog(q){L.dlg.innerHTML='';const g=el('g',{},L.dlg);R(g,0,0,640,360,'rgba(0,0,0,.55)');const x=200,y=130,w=240,h=90;R(g,x-2,y-2,w+4,h+4,PC.or);R(g,x,y,w,h,PC.panel);R(g,x,y,w,1,PC.or);
 T(g,q.verb+' · '+q.text,x+10,y+8,12,PC.ink,true);T(g,q.confirm,x+10,y+28,10,PC.ink2);T(g,'来自 '+q.agent+' · '+q.sub,x+10,y+44,8,PC.ink3);
 const ok=R(g,x+10,y+62,70,18,q.col===PC.rd?PC.rd:PC.ink,{class:'btn'});T(g,'确认',x+45,y+64,11,q.col===PC.rd?PC.ink:PC.bg,true,'c');const no=R(g,x+90,y+62,70,18,PC.panel,{stroke:PC.wall,'stroke-width':1,class:'btn'});T(g,'取消',x+125,y+64,11,PC.ink,false,'c');T(g,'Enter 确认 · Esc 取消',x+w-10,y+h-12,7,PC.ink4,false,'r');
 S.dialog=q;ok.addEventListener('click',()=>confirmDialog(true));no.addEventListener('click',()=>confirmDialog(false));sfx('lift')}
function confirmDialog(yes){const q=S.dialog;if(!q)return;L.dlg.innerHTML='';S.dialog=null;if(!yes){sfx('no');hubLog(`取消：${q.verb} ${q.text}`);return}
 q.done=true;q.effect();const a=agents.find(a=>a.name===q.agent);if(a){a.task=null;a.g.classList.remove('hl')}selCard=null;buildQueue();buildSide();sfx('ok');hubLog(`已决：${q.verb} ${q.text} → 楼里状态已更新`)}
/* ---- 开盘自检：逐层点亮 ---- */
function selfCheck(){sfx('latch');for(let i=NF-1;i>=0;i--){setTimeout(()=>{const ov=R(L.fx,RX,fy(i),RW,FH-6,'#ffffff',{opacity:.35,class:'boot'});sfx('tick');setTimeout(()=>ov.remove(),500)},(NF-1-i)*180)}setTimeout(()=>hubLog('自检完成 · 11/12 源在线 · 1 过期'),NF*180+200)}
/* ---- 日志（基地内） ---- */
const hubLogEl=document.getElementById('hublog');function hubLog(s){const d=document.createElement('div');d.textContent=s;hubLogEl.appendChild(d);while(hubLogEl.children.length>4)hubLogEl.removeChild(hubLogEl.firstChild)}

/* ---- 镜头：viewBox 弹簧 ---- */
const cam={x:0,y:0,w:640,h:360};function applyCam(){svg.setAttribute('viewBox',`${cam.x} ${cam.y} ${cam.w} ${cam.h}`)}
function camTo(x,y,w,h,preset='gentle'){spring(cam,'x',x,preset,applyCam);spring(cam,'y',y,preset,applyCam);spring(cam,'w',w,preset,applyCam);spring(cam,'h',h,preset,applyCam)}
/* ---- 进入 / 返回工作区 ---- */
const hub=document.getElementById('hub'),wsEl=document.getElementById('ws');
function enterWS(ws,carry){if(S.mode!=='hub')return;S.mode='enter';const room=carry.room?RM[carry.room]:null;const fi=room?room.f:(WSNAV.find(n=>n[3]===ws)||[0,0,0,0,3])[4];
 const cy=fy(fi)+FH/2-3,cx=room?room.x+room.w/2:RX+RW/2;const w=320,h=180;camTo(cx-w/2,cy-h/2,w,h,'gentle');sfx('latch');hideTip();
 hubLog(`进入 ${ws}${room?' · 带上下文 '+room.name:''}`);
 setTimeout(()=>{hub.classList.add('out');setTimeout(()=>{hub.hidden=true;hub.classList.remove('out');WS.enter(ws,{strategy:room&&room.strat,instrument:carry.instrument,roomName:room&&room.name});S.mode='ws'},220)},300)}
function backToHub(){if(S.mode!=='ws')return;S.mode='leave';wsEl.classList.add('out');setTimeout(()=>{WS.leave();wsEl.classList.remove('out');hub.hidden=false;camTo(0,0,640,360,'settle');sfx('lift');S.mode='hub'},200)}
/* ---- 命令行（键盘精灵） ---- */
const cmd=document.getElementById('cmd');
function openCmd(ch){cmd.hidden=false;cmd.value=ch||'';cmd.focus();sfx('key')}
cmd.addEventListener('keydown',e=>{if(e.key==='Escape'){cmd.hidden=true;cmd.blur();return}if(e.key!=='Enter')return;const v=cmd.value.trim();cmd.hidden=true;cmd.blur();if(!v)return;runCmd(v)});
function runCmd(v){const low=v.toLowerCase();const sym=Object.keys(WS.SYMS).find(k=>k.toLowerCase()===low||WS.SYMS[k].name===v);if(sym){hubLog(`命令 ${v} → 盯盘 · ${sym}`);enterWS('desk',{instrument:sym});return}
 const r=ROOMS.find(r=>r.name===v||r.id===low||(r.strat&&r.strat===low));if(r){setFocus(r.id);sfx('ok');return}
 const n=WSNAV.find(n=>n[1]===v||n[2].toLowerCase()===low||n[0]===v);if(n){enterWS(n[3],{});return}
 sfx('no');hubLog(`命令 ${v}：没有匹配`)}
/* ---- 键盘 ---- */
addEventListener('keydown',e=>{if(!cmd.hidden)return;if(S.dialog){if(e.key==='Enter')confirmDialog(true);if(e.key==='Escape')confirmDialog(false);return}
 if(S.mode==='ws'){if(e.key==='Escape'){backToHub()}return}
 if(S.mode!=='hub')return;
 if(e.key==='/'){e.preventDefault();openCmd('');return}
 if(/^[1-5]$/.test(e.key)){const n=WSNAV[+e.key-1];sfx('key');enterWS(n[3],{});return}
 if(e.key==='Enter'){enterWS(RM[focusRoom].ws,{room:focusRoom});return}
 if(/^[a-z0-9]$/i.test(e.key)){openCmd(e.key)}});
/* ---- 帧 ---- */
let last=performance.now();const eq=Array.from({length:60},(_,i)=>10+Math.sin(i/6)*4+i*.12);let pnl=18408;
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;stepSprings(dt);
 if(!hub.hidden){stepAgents(dt);
  const ph=(t*6|0);leds.forEach(l=>{const on=!l.dim&&Math.sin(t*1.6+l.ph)>-.2;l.e.setAttribute('fill',on?l.col:PC.ink4)});
  const c=RM.core;if(c.poly){const sx=c.x+184,y0=fy(0)+36;c.poly.setAttribute('points',Array.from({length:58},(_,i)=>`${sx+i*2.5|0},${y0-eq[(i+ph)%60]|0}`).join(' '));c.scan.setAttribute('y',fy(0)+7+(t*18%32|0))}
  if((t*2|0)%2===0&&Math.random()<.02){pnl+=Math.round((Math.random()-.45)*120);setT(L.hud._pnl,(pnl>=0?'+':'')+pnl.toLocaleString(),11,pnl>=0?PC.gr:PC.rd,true)}
  const d=new Date();setT(L.hud._clock,d.toTimeString().slice(0,5),11,PC.ink2,false)}
 requestAnimationFrame(frame)}
/* ---- 启动 ---- */
function fit(){const S_=Math.max(1,Math.floor(Math.min(innerWidth/640,(innerHeight-0)/360)));svg.style.width=640*S_+'px';svg.style.height=360*S_+'px'}addEventListener('resize',fit);fit();
document.body.dataset.phase=phase;buildTop();buildNav();buildSide();buildQueue();applyCam();requestAnimationFrame(frame);
hubLog('基地：单击房间 = 焦点 · 双击 / Enter = 进入工作区 · 1–5 楼层 · / 命令 · 底部动词 = 决策');
