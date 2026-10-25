/* Original web mechanism studies. Native input authority is never advanced by seek.
 * Self-contained classic browser / CommonJS module; no remote code, assets or runtime.
 */
(function(root,factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.MotionRecipeModules = root.MotionRecipeModules || {}; root.MotionRecipeModules.web = factory(); }
})(typeof globalThis === 'undefined' ? this : globalThis,function() {
  'use strict';
function buildWebUtilities() {
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const phase = (t, a, b) => clamp((t - a) / (b - a));
  function validate(p, schema) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new TypeError('Web parameters must be an object');
    for (const key of Object.keys(p)) if (!Object.prototype.hasOwnProperty.call(schema, key)) throw new TypeError(`Unsupported web parameter: ${key}`);
    for (const [key, rule] of Object.entries(schema)) {
      if (!Object.prototype.hasOwnProperty.call(p, key)) throw new TypeError(`Missing web parameter: ${key}`);
      const numeric = rule.length === 2 && rule.every(x => typeof x === 'number');
      if (numeric ? !(typeof p[key] === 'number' && Number.isFinite(p[key]) && p[key] >= rule[0] && p[key] <= rule[1]) : !rule.includes(p[key])) throw new RangeError(`Unsupported web ${key}: ${String(p[key])}`);
    }
  }
  function mount(stage, id, options) {
    if (!stage || !stage.ownerDocument) throw new TypeError('A DOM stage is required');
    const doc = stage.ownerDocument;
    const reduced = !!(options && options.reducedMotion);
    stage.dataset.recipe = id;
    const root = doc.createElement('section');
    root.dataset.webStudy = id;
    root.style.cssText = 'position:relative;box-sizing:border-box;width:100%;min-height:300px;padding:20px;background:#102334;color:#e8f2ff;font:15px/1.5 system-ui,sans-serif;border-radius:16px;overflow:hidden;';
    stage.appendChild(root);
    const listeners = [], cleaners = [];
    let disposed = false;
    function el(tag, text, css, parent = root) {
      const node = doc.createElement(tag);
      if (text !== null && text !== undefined) node.textContent = text;
      if (css) node.style.cssText = css;
      if (tag === 'button') { node.type = 'button'; node.style.cursor = 'pointer'; }
      parent.appendChild(node);
      return node;
    }
    function svg(tag, attrs, parent = root) {
      const node = doc.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, String(value));
      parent.appendChild(node);
      return node;
    }
    function listen(target, type, fn, eventOptions) {
      target.addEventListener(type, fn, eventOptions);
      listeners.push(() => target.removeEventListener(type, fn, eventOptions));
    }
    function onDispose(fn) { cleaners.push(fn); }
    function finish(render) {
      function seek(t) {
        if (typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t > 1) throw new RangeError('Web progress must be finite in [0,1]');
        if (!disposed) render(t);
      }
      seek(0);
      return { seek, dispose() {
        if (disposed) return;
        disposed = true;
        for (const remove of listeners) remove();
        for (const cleanup of cleaners) cleanup();
        root.remove();
        if (stage.dataset.recipe === id) delete stage.dataset.recipe;
      } };
    }
    return { root, doc, reduced, el, svg, listen, onDispose, finish };
  }
  return { clamp, mix, ease, phase, validate, mount };
}

function buildWebOwn(W) {
  const recipes = {};
  const buttonCSS = 'position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;min-width:180px;padding:12px 24px;border:2px solid #66d6bd;border-radius:14px;background:#24465d;color:#f4fbff;font:600 16px system-ui;overflow:hidden;';
  function register(name, title, schema, create) {
    const id = 'web.' + name;
    function validate(p) {
      W.validate(p,typeof schema==='function'?schema(p):schema);
      for (const key of ['count','minLength']) if (Object.prototype.hasOwnProperty.call(p,key) && !Number.isInteger(p[key])) throw new RangeError(`Web ${key} must be an integer`);
    }
    recipes[id] = {title,validate,create(stage,p,o){ validate(p); return create(W.mount(stage,id,o),p,o||{}); }};
    return id;
  }
  const deformEffects = ['bounce','squash','push-depth','inner','wobble','error','heartbeat','elastic'];
  const deformation = register('button-deformation','按压形变 / Button deformation',p=>({effect:deformEffects,amount:[2,32],...(['bounce','wobble','error','heartbeat','elastic'].includes(p&&p.effect)?{cycles:[1,4]}:{})}),(m,p)=>{
    m.el('p','Study deformation / 形变回看；native activation stays independent.');
    const b=m.el('button','Activate / 激活',buttonCSS), state=m.el('p','Native activations: 0');
    let count=0, nativeOffset=0, held=false, origin=0, last=0, capture=null;
    m.listen(b,'click',()=>{count++;state.textContent='Native activations: '+count;});
    m.listen(b,'pointerdown',e=>{ if(p.effect!=='elastic'||e.button!==0)return;held=true;origin=e.clientX;capture=e.pointerId;try{b.setPointerCapture(capture);}catch(_){} });
    m.listen(b,'pointermove',e=>{if(!held)return;nativeOffset=W.clamp((e.clientX-origin)/3,-p.amount,p.amount);draw(last);});
    function release(e){held=false;nativeOffset=0;try{if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);}catch(_){}capture=null;draw(last);}
    m.listen(b,'pointerup',release);m.listen(b,'pointercancel',release);m.onDispose(()=>{held=false;if(capture!==null){try{if(b.hasPointerCapture(capture))b.releasePointerCapture(capture);}catch(_){}capture=null;}});
    function draw(t){
      last=t;const a=m.reduced?0:Math.sin(Math.PI*t)*p.amount, wave=Math.sin(t*Math.PI*2*(p.cycles||1)), settle=Math.sin(Math.PI*t);
      b.style.transform='none';b.style.boxShadow='none';b.style.borderRadius='14px';
      switch(p.effect){
        case 'bounce': b.style.transform=`translateY(${-a*(.4+.6*Math.abs(wave))}px) scale(${1-a/180})`;break;
        case 'squash': b.style.transform=`scale(${1+a/130},${1-a/100})`;b.style.borderRadius=(14+a)+'px';break;
        case 'push-depth': b.style.transform=`perspective(450px) rotateX(${a}deg) translateY(${a/3}px)`;b.style.boxShadow=`0 ${m.reduced?0:Math.max(0,10-a/3)}px 0 #07141f`;break;
        case 'inner': b.style.boxShadow=`inset 0 ${a/4}px ${2+a}px #07141f`;break;
        case 'wobble': b.style.transform=`rotate(${m.reduced?0:wave*settle*p.amount}deg)`;break;
        case 'error': b.style.transform=`translateX(${m.reduced?0:wave*settle*p.amount}px)`;b.style.borderColor='#fb8892';b.textContent='Retry / 重试';break;
        case 'heartbeat': b.style.transform=`scale(${1+(m.reduced?0:Math.pow(Math.max(0,wave),3)*settle*p.amount/100)})`;break;
        case 'elastic': b.style.transform=`translateX(${m.reduced?0:nativeOffset||wave*settle*p.amount}px) scaleX(${1+(m.reduced?0:Math.abs(nativeOffset||a)/160)})`;break;
      }
    }
    return m.finish(draw);
  });
  const surfaceEffects=['border','gradient','splash','sweep','glow','shine','ripple','confetti'];
  const surface=register('button-surface','表面与粒子 / Button surface',p=>({effect:surfaceEffects,...(['splash','ripple','confetti'].includes(p&&p.effect)?{extent:[40,240]}:{}),...(['gradient','glow'].includes(p&&p.effect)?{cycles:[1,3]}:{})}),(m,p)=>{
    m.el('p','Surface study / 表面回看。Tap uses actual local coordinates.');
    const b=m.el('button',null,buttonCSS+'isolation:isolate;'),layer=m.el('span',null,'position:absolute;inset:0;z-index:-1;background:#66d6bd;',b);
    const caption=m.el('span','Activate / 激活','position:relative;z-index:2;',b);
    const art=m.svg('svg',{viewBox:'0 0 180 56','aria-hidden':'true',style:'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;'},b);
    const border=m.svg('rect',{x:2,y:2,width:176,height:52,rx:12,fill:'none',stroke:'#e9ed88','stroke-width':3,pathLength:1},art);
    const pieces=Array.from({length:10},(_,i)=>m.svg('rect',{x:90,y:28,width:5,height:9,fill:i%2?'#ffe989':'#72d7fa'},art));
    let cx=90,cy=28,last=0,count=0;
    const status=m.el('p','Native activations: 0');
    m.listen(b,'pointerdown',e=>{const r=b.getBoundingClientRect();cx=(e.clientX-r.left)/r.width*180;cy=(e.clientY-r.top)/r.height*56;draw(last);});
    m.listen(b,'click',()=>{count++;status.textContent='Native activations: '+count;});
    function draw(t){last=t;const q=m.reduced?1:W.ease(t), pulse=m.reduced?0:Math.sin(t*Math.PI*(p.cycles||1));layer.style.cssText='position:absolute;inset:0;z-index:-1;background:#66d6bd;';layer.style.opacity='0';border.style.visibility='hidden';pieces.forEach(x=>x.style.visibility='hidden');b.style.boxShadow='none';
      switch(p.effect){
        case 'border':border.style.visibility='visible';border.setAttribute('stroke-dasharray',`${q} 1`);break;
        case 'gradient':layer.style.opacity='1';layer.style.background=`linear-gradient(${m.reduced?110:70+80*t}deg,#24465d,#3c907b ${40+20*pulse}%,#24465d)`;break;
        case 'splash':layer.style.opacity='1';layer.style.clipPath=`circle(${q*p.extent}% at ${cx/1.8}% ${cy/0.56}%)`;break;
        case 'sweep':layer.style.opacity='1';layer.style.clipPath=`inset(0 ${100-q*100}% 0 0)`;break;
        case 'glow':b.style.boxShadow=`0 0 ${m.reduced?0:18+20*pulse}px #66d6bd`;break;
        case 'shine':layer.style.opacity=m.reduced?'0':'1';layer.style.background='linear-gradient(110deg,transparent 30%,#ffffff88 50%,transparent 70%)';layer.style.transform=`translateX(${(q*2-1)*100}%)`;break;
        case 'ripple':layer.style.opacity=m.reduced?'0':String(1-q);layer.style.clipPath=`circle(${q*p.extent}% at ${cx/1.8}% ${cy/.56}%)`;break;
        case 'confetti':pieces.forEach((x,i)=>{x.style.visibility=m.reduced?'hidden':'visible';const a=i*Math.PI*2/10;x.setAttribute('transform',`translate(${Math.cos(a)*p.extent*q},${Math.sin(a)*p.extent*q+35*q*q}) rotate(${i*35+q*120} 90 28)`);x.style.opacity=String(1-q);});caption.textContent='Confirmed / 已确认';break;
      }
    }
    return m.finish(draw);
  });
  const activation=register('button-state-morph','按钮状态形态 / Button state morph',p=>({effect:['hold','icon','loading','send','shape'],...(p&&p.effect==='hold'?{holdMs:[500,3000]}:{})}),(m,p)=>{
    m.el('p','Timeline is a state study; native state below is not changed by seeking.');
    const b=m.el('button',null,buttonCSS),label=m.el('span','Activate / 激活','position:relative;',b);
    const bar=m.el('span',null,'position:absolute;left:0;bottom:0;height:5px;width:0;background:#ffe989;',b);
    const art=m.svg('svg',{viewBox:'0 0 60 60',width:44,height:44,'aria-hidden':'true'},b);
    const path=m.svg('path',{d:'M10 30 L50 30 M30 10 L30 50',fill:'none',stroke:'#f0f9ff','stroke-width':5,'stroke-linecap':'round',pathLength:1},art);
    const status=m.el('p','Native state: idle / 待操作');let state='idle',start=null,pointerId=null;
    function begin(e){if(p.effect!=='hold')return;if(e.type==='keydown'&&![' ','Enter'].includes(e.key))return;if(e.repeat)return;e.preventDefault();start=e.timeStamp;state='holding';status.textContent='Native state: holding / 按住后松开';bar.style.transition=m.reduced?'none':`width ${p.holdMs}ms linear`;bar.style.width='100%';if(e.pointerId!==undefined){pointerId=e.pointerId;try{b.setPointerCapture(pointerId);}catch(_){}}}
    function end(e){if(start===null)return;const confirmed=e.type!=='pointercancel'&&e.type!=='blur'&&e.timeStamp-start>=p.holdMs;start=null;state=confirmed?'confirmed':'cancelled';status.textContent='Native state: '+state;bar.style.transition='none';bar.style.width=confirmed?'100%':'0';if(pointerId!==null){try{if(b.hasPointerCapture(pointerId))b.releasePointerCapture(pointerId);}catch(_){}pointerId=null;}}
    m.listen(b,'pointerdown',begin);m.listen(b,'pointerup',end);m.listen(b,'pointercancel',end);m.listen(b,'keydown',begin);m.listen(b,'keyup',e=>{if([' ','Enter'].includes(e.key))end(e);});m.listen(b,'blur',end);
    m.listen(b,'click',()=>{if(p.effect==='hold')return;state=state==='confirmed'?'idle':'confirmed';status.textContent='Native state: '+state;});
    m.onDispose(()=>{start=null;if(pointerId!==null){try{if(b.hasPointerCapture(pointerId))b.releasePointerCapture(pointerId);}catch(_){}}});
    return m.finish(t=>{const q=m.reduced?1:W.ease(t);path.style.transform='none';path.style.opacity='1';path.setAttribute('stroke-dasharray','1 0');b.style.borderRadius='14px';b.style.minWidth='180px';label.textContent='Activate / 激活';
      switch(p.effect){
        case 'hold':label.textContent='Hold, then release / 按住松开';if(start===null)bar.style.width=(q*100)+'%';path.setAttribute('d','M14 31 L26 43 L48 18');path.setAttribute('stroke-dasharray',`${q} 1`);break;
        case 'icon':path.setAttribute('d',q<.5?'M10 30 L50 30 M30 10 L30 50':'M14 31 L26 43 L48 18');path.style.transform=`rotate(${m.reduced?0:q*180}deg)`;path.style.opacity=String(m.reduced?1:Math.abs(q-.5)*2);break;
        case 'loading':path.setAttribute('d',q<.65?'M45 15 A22 22 0 1 0 48 40':'M14 31 L26 43 L48 18');path.style.transform=q<.65&&!m.reduced?`rotate(${q*720}deg)`:'none';label.textContent=q<.65?'Working study / 处理中示意':'Success study / 成功示意';break;
        case 'send':path.setAttribute('d',q<.7?'M8 12 L52 30 L8 48 L19 30 Z':'M14 31 L26 43 L48 18');path.style.transform=m.reduced?'none':`translate(${q<.7?q*35:0}px,${q<.7?-q*16:0}px)`;label.textContent=q<.7?'Send study / 发送示意':'Sent study / 已送出示意';break;
        case 'shape':b.style.minWidth=(m.reduced?180:W.mix(56,180,q))+'px';b.style.borderRadius=W.mix(28,14,q)+'px';path.setAttribute('d',`M${W.mix(18,14,q)} 30 L26 ${W.mix(30,43,q)} L${W.mix(42,48,q)} ${W.mix(30,18,q)}`);label.style.opacity=String(q);break;
      }
    });
  });
  const trackEffects=['bubble','jump','blob','stretch','pill','underline','spring','tint'];
  const track=register('control-indicator','状态轨道与形变 / Control indicator',{effect:trackEffects,settleAt:[.5,1]},(m,p)=>{
    m.el('p','Native choice / 原生选择；the preview shows an independently seekable change.');
    const label=m.el('label','Enabled / 启用 ','display:block;margin-bottom:18px;'),input=m.el('input',null,null,label);input.type='checkbox';
    const status=m.el('output','Native value: off');
    m.listen(input,'change',()=>{status.textContent='Native value: '+(input.checked?'on':'off');});
    const box=m.el('div',null,'position:relative;width:min(280px,100%);height:100px;border-radius:24px;background:#264557;margin-top:24px;overflow:hidden;');
    const a=m.el('span','A','position:absolute;left:30px;top:38px;'),b=m.el('span','B','position:absolute;left:210px;top:38px;');box.append(a,b);
    const svg=m.svg('svg',{viewBox:'0 0 280 100',width:'100%',height:100,'aria-label':'Indicator study','role':'img'},box);
    const indicator=m.svg('path',{fill:'#66d6bd',d:'',stroke:'none'},svg);
    const circle=m.svg('circle',{cx:50,cy:50,r:18,fill:'#66d6bd'},svg);
    const rect=m.svg('rect',{x:24,y:72,width:48,height:5,rx:2,fill:'#ffe989'},svg);
    return m.finish(t=>{
      const q=m.reduced?1:W.ease(W.phase(t,0,p.settleAt)),spring=m.reduced?1:1-Math.exp(-7*q)*Math.cos(10*q),x=W.mix(50,230,q),bulge=Math.sin(q*Math.PI);
      circle.style.display='none';rect.style.display='none';indicator.style.display='none';box.style.background='#264557';
      switch(p.effect){
        case 'bubble':circle.style.display='';circle.setAttribute('cx',x);circle.setAttribute('r',18+14*bulge);break;
        case 'jump':circle.style.display='';circle.setAttribute('cx',x);circle.setAttribute('cy',m.reduced?50:50-32*4*q*(1-q));break;
        case 'spring':circle.style.display='';circle.setAttribute('cx',W.mix(50,230,W.clamp(spring,0,1.12)));circle.setAttribute('cy',50);break;
        case 'pill':rect.style.display='';rect.setAttribute('x',W.mix(24,204,q));rect.setAttribute('y',28);rect.setAttribute('height',44);rect.setAttribute('rx',22);break;
        case 'underline':rect.style.display='';rect.setAttribute('x',W.mix(24,204,q));rect.setAttribute('y',72);rect.setAttribute('height',5);rect.setAttribute('width',48+50*bulge);break;
        case 'stretch':indicator.style.display='';indicator.setAttribute('d',`M${x-18} 32 C${x-18-45*bulge} 32 ${x+18+45*bulge} 32 ${x+18} 50 C${x+18+45*bulge} 68 ${x-18-45*bulge} 68 ${x-18} 32Z`);break;
        case 'blob':indicator.style.display='';indicator.setAttribute('d',`M${x} 25 C${x+30+16*bulge} 10 ${x+38} 65 ${x+8} 75 C${x-38} 87 ${x-36-20*bulge} 35 ${x} 25Z`);break;
        case 'tint':box.style.background=`rgb(${Math.round(W.mix(38,38,q))},${Math.round(W.mix(69,139,q))},${Math.round(W.mix(87,113,q))})`;circle.style.display='';circle.setAttribute('cx',230);break;
      }
    });
  });
  const glyph=register('control-glyph','图形状态路径 / Control glyph',{effect:['check','day','heart','lock','mute','play'],settleAt:[.5,1]},(m,p)=>{
    const label=m.el('label','Native option / 原生选项 ','display:block;'),input=m.el('input',null,null,label);input.type='checkbox';
    const status=m.el('p','Native state: off');m.listen(input,'change',()=>{status.textContent='Native state: '+(input.checked?'on':'off');});
    const svg=m.svg('svg',{viewBox:'0 0 120 100',width:240,height:180,role:'img','aria-label':'Glyph state study'});
    const background=m.svg('rect',{x:5,y:5,width:110,height:90,rx:20,fill:'#24465d'},svg);
    const path=m.svg('path',{d:'',fill:'none',stroke:'#66d6bd','stroke-width':6,'stroke-linecap':'round','stroke-linejoin':'round',pathLength:1},svg);
    const extra=m.svg('path',{d:'',fill:'none',stroke:'#ffe989','stroke-width':5,'stroke-linecap':'round'},svg);
    const orb=m.svg('circle',{cx:60,cy:50,r:23,fill:'#ffe989'},svg),mask=m.svg('circle',{cx:125,cy:20,r:23,fill:'#24465d'},svg);
    return m.finish(t=>{const q=m.reduced?1:W.ease(W.phase(t,0,p.settleAt));path.setAttribute('fill','none');path.setAttribute('stroke-dasharray','1 0');path.style.transform='none';path.style.transformOrigin='60px 50px';extra.setAttribute('d','');orb.style.display='none';mask.style.display='none';
      switch(p.effect){
        case 'check':path.setAttribute('d','M24 52 L49 74 L95 25');path.setAttribute('stroke-dasharray',`${q} 1`);break;
        case 'day':orb.style.display='';mask.style.display='';mask.setAttribute('cx',W.mix(125,72,q));mask.setAttribute('cy',W.mix(20,36,q));background.setAttribute('fill','#24465d');path.setAttribute('d','');break;
        case 'heart':path.setAttribute('d','M60 78 C12 49 21 15 43 25 L60 38 L77 25 C99 15 108 49 60 78Z');path.setAttribute('fill',`rgba(251,136,146,${q})`);path.setAttribute('stroke','#fb8892');path.style.transform=`scale(${m.reduced?1:1+.15*Math.sin(q*Math.PI)})`;break;
        case 'lock':path.setAttribute('d',`M35 48 V${W.mix(39,25,q)} C35 ${W.mix(9,0,q)} 85 ${W.mix(9,0,q)} 85 ${W.mix(39,25,q)} V${W.mix(48,31,q)}`);extra.setAttribute('d','M30 48 H90 V83 H30 Z M60 60 V71');break;
        case 'mute':path.setAttribute('d','M24 40 H42 L62 23 V77 L42 60 H24Z');extra.setAttribute('d',q<.5?'M76 34 Q98 50 76 66':`M76 34 L100 66 M100 34 L76 66`);extra.style.opacity=String(m.reduced?1:Math.abs(q-.5)*2);break;
        case 'play':path.setAttribute('fill','#66d6bd');path.setAttribute('stroke','none');path.setAttribute('d',`M30 20 L${W.mix(60,46,q)} ${W.mix(35,20,q)} L${W.mix(60,46,q)} ${W.mix(65,80,q)} L30 80Z M${W.mix(60,72,q)} ${W.mix(35,20,q)} L${W.mix(90,88,q)} ${W.mix(50,20,q)} L${W.mix(60,88,q)} ${W.mix(65,80,q)} L${W.mix(60,72,q)} ${W.mix(65,80,q)}Z`);break;
      }
    });
  });
  const fields=register('form-field-state','输入字段状态 / Form field state',{effect:['label','validation','strength'],minLength:[3,12]},(m,p)=>{
    m.el('p','Enter a local sample / 输入本地示例。No values leave this page.');
    const wrapper=m.el('label',null,'position:relative;display:block;max-width:320px;padding-top:28px;');
    const label=m.el('span',p.effect==='strength'?'Sample secret / 示例口令':'Sample name / 示例名称','position:absolute;top:30px;left:12px;pointer-events:none;color:#aac7da;',wrapper);
    const input=m.el('input',null,'box-sizing:border-box;display:block;width:100%;min-height:48px;padding:12px;border:2px solid #66869a;border-radius:8px;background:#17354b;color:white;font:inherit;',wrapper);
    input.type=p.effect==='strength'?'password':'text';input.minLength=p.minLength;input.required=true;
    const native=m.el('output','Native: empty / 尚未输入'),preview=m.el('div','Study preview / 独立回看','margin-top:28px;padding:14px;background:#24465d;border-radius:10px;');
    const meter=m.el('div',null,'height:8px;max-width:320px;background:#3f596a;border-radius:5px;margin-top:8px;');
    const fill=m.el('span',null,'display:block;height:100%;width:0;background:#66d6bd;border-radius:5px;',meter);
    function score(value){return Number(value.length>=p.minLength)+Number(/[a-z]/i.test(value)&&/[0-9]/.test(value))+Number(/[^a-z0-9]/i.test(value));}
    function update(){const active=input.value.length>0||m.doc.activeElement===input;label.style.top=active?'0':'40px';label.style.fontSize=active?'12px':'15px';
      if(p.effect==='strength'){const n=score(input.value);native.textContent='Native sample checks: '+n+'/3 (not a security guarantee)';input.style.borderColor=n===3?'#66d6bd':'#ffe989';}
      else if(p.effect==='validation'){const valid=input.value.length>=p.minLength;native.textContent=input.value.length?(valid?'Native: valid local length / 长度符合':'Native: need '+p.minLength+' characters / 长度不足'):'Native: empty / 尚未输入';input.setAttribute('aria-invalid',String(input.value.length>0&&!valid));input.style.borderColor=valid?'#66d6bd':'#66869a';}
      else native.textContent='Native: '+(input.value.length?'populated / 已填':'empty / 空');
    }
    m.listen(input,'input',update);m.listen(input,'focus',update);m.listen(input,'blur',update);update();
    return m.finish(t=>{const q=m.reduced?1:W.ease(t);
      if(p.effect==='label'){preview.textContent='Label study / 标签回看';preview.style.paddingTop=(32-16*q)+'px';preview.style.fontSize=(16-4*q)+'px';fill.style.width='0';}
      else if(p.effect==='validation'){preview.textContent=q<.5?'Study: checking / 校验中':'Study: local rule passed / 规则符合';preview.style.border='2px solid '+(q<.5?'#ffe989':'#66d6bd');fill.style.width='0';}
      else {const n=Math.floor(q*3);preview.textContent='Study: '+n+'/3 sample checks; required sample length '+p.minLength;fill.style.width=(n/3*100)+'%';}
    });
  });
  const submit=register('form-submit-state','本地提交确认 / Local submit state',{completionAt:[.4,.9]},(m,p)=>{
    const form=m.el('form',null,'display:flex;flex-wrap:wrap;gap:12px;align-items:center;'),label=m.el('label','Local name / 本地名称 ',null,form),input=m.el('input',null,'min-height:44px;background:#24465d;color:white;border:2px solid #66d6bd;border-radius:8px;',label);
    input.required=true;input.minLength=3;
    const b=m.el('button','Confirm locally / 本地确认',buttonCSS,form);b.type='submit';
    const native=m.el('output','Native: not submitted. No network operation.'),svg=m.svg('svg',{viewBox:'0 0 100 100',width:110,height:110,role:'img','aria-label':'Submission state study'});
    const shape=m.svg('rect',{x:10,y:10,width:80,height:80,rx:12,fill:'#24465d',stroke:'#66d6bd','stroke-width':3},svg),check=m.svg('path',{d:'M23 50 L43 71 L78 30',fill:'none',stroke:'#66d6bd','stroke-width':7,pathLength:1},svg);
    m.listen(form,'submit',e=>{e.preventDefault();if(input.validity.valid)native.textContent='Native: local confirmation accepted / 本地确认成功';});
    return m.finish(t=>{const q=m.reduced?1:W.ease(W.phase(t,p.completionAt,1));shape.setAttribute('rx',W.mix(12,40,q));check.setAttribute('stroke-dasharray',`${q} 1`);});
  });
  const upload=register('upload-progress-state','文件选择与进度 / File selection and progress',{target:[10,100]},(m,p)=>{
    const label=m.el('label','Optional local file / 可选本地文件 ',null),input=m.el('input',null,'display:block;margin:12px 0;',label);input.type='file';
    const native=m.el('output','No file selected. No upload occurs.'),b=m.el('button','Advance local simulation / 推进本地模拟',buttonCSS);
    const nativeProgress=m.el('progress',null,'display:block;width:100%;max-width:360px;margin:14px 0;');nativeProgress.max=100;nativeProgress.value=0;
    let local=0;m.listen(input,'change',()=>{local=0;nativeProgress.value=0;native.textContent=input.files&&input.files.length?'Selected local file. Contents are not read.':'No file selected.';});
    m.listen(b,'click',()=>{local=Math.min(100,local+25);nativeProgress.value=local;native.textContent='Local simulation: '+local+'%; no upload occurs.';});
    const study=m.el('div',null,'height:16px;background:#28495d;border-radius:8px;overflow:hidden;'),fill=m.el('div',null,'height:100%;background:#66d6bd;',study),caption=m.el('p');
    return m.finish(t=>{const value=Math.round((m.reduced?1:W.ease(t))*p.target);fill.style.width=value+'%';caption.textContent='Independent progress study: '+value+' / 100';});
  });
  const skeleton=register('skeleton-content','骨架与内容替换 / Skeleton content',p=>({effect:['shimmer','resolve'],...(p&&p.effect==='resolve'?{revealAt:[.3,.8]}:{})}),(m,p)=>{
    m.el('p','Placeholder study / 占位示意。This specimen performs no data request.');
    const panel=m.el('div',null,'position:relative;width:min(360px,100%);height:130px;background:#24465d;border-radius:14px;overflow:hidden;');
    const lines=[0,1,2].map(i=>m.el('div',null,`position:absolute;left:18px;top:${20+i*32}px;width:${i===2?55:85}%;height:16px;border-radius:5px;background:#557487;`,panel));
    const shimmer=m.el('div',null,'position:absolute;inset:0;background:linear-gradient(110deg,transparent,#ffffff33,transparent);',panel),content=m.el('div','Trail report / 路线报告\\nDistance: 18 km · Elevation: 620 m','position:absolute;inset:0;padding:20px;white-space:pre-line;',panel);
    return m.finish(t=>{const q=m.reduced?1:p.effect==='resolve'?W.phase(t,p.revealAt,1):0,resolved=p.effect==='resolve'&&q>=.5;content.style.visibility=m.reduced||resolved?'visible':'hidden';lines.forEach(x=>x.style.visibility=m.reduced||resolved?'hidden':'visible');shimmer.style.visibility=m.reduced||resolved?'hidden':'visible';shimmer.style.transform=`translateX(${W.mix(-100,100,t)}%)`;});
  });
  const chart=register('value-chart','值与图形 / Values to geometry',p=>({effect:['line','bars','donut'],valueA:[1,100],valueB:[1,100],valueC:[1,100],...(p&&p.effect!=='line'?{stagger:[0,.2]}:{})}),(m,p)=>{
    const values=[p.valueA,p.valueB,p.valueC],sum=values.reduce((a,b)=>a+b,0);
    m.el('p',`A: ${p.valueA} · B: ${p.valueB} · C: ${p.valueC} · Total / 总量: ${sum}`);
    const svg=m.svg('svg',{viewBox:'0 0 360 220',width:'100%',height:230,role:'img','aria-label':`Chart A ${p.valueA}, B ${p.valueB}, C ${p.valueC}`});
    const bars=values.map((v,i)=>m.svg('rect',{x:50+i*100,y:190,width:54,height:0,fill:['#66d6bd','#72d7fa','#ffe989'][i]},svg));
    const line=m.svg('path',{d:values.map((v,i)=>(i?'L':'M')+(65+i*100)+' '+(190-v*1.5)).join(' '),fill:'none',stroke:'#66d6bd','stroke-width':5,pathLength:1},svg);
    const arcs=values.map((v,i)=>m.svg('circle',{cx:180,cy:110,r:70,fill:'none',stroke:['#66d6bd','#72d7fa','#ffe989'][i],'stroke-width':30,pathLength:1,transform:'rotate(-90 180 110)'},svg));
    values.forEach((v,i)=>m.svg('text',{x:65+i*100,y:215,fill:'#e8f2ff','text-anchor':'middle'},svg).textContent=String.fromCharCode(65+i)+' '+v);
    return m.finish(t=>{let start=0;
      bars.forEach((b,i)=>{const q=m.reduced?1:W.ease(W.phase(t,i*(p.stagger||0),1));b.style.visibility=p.effect==='bars'?'visible':'hidden';b.setAttribute('height',values[i]*1.5*q);b.setAttribute('y',190-values[i]*1.5*q);});
      line.style.visibility=p.effect==='line'?'visible':'hidden';line.setAttribute('stroke-dasharray',`${m.reduced?1:W.ease(t)} 1`);
      arcs.forEach((a,i)=>{a.style.visibility=p.effect==='donut'?'visible':'hidden';const ratio=values[i]/sum,q=m.reduced?1:W.ease(W.phase(t,i*(p.stagger||0),1));a.setAttribute('stroke-dasharray',`${ratio*q} ${1-ratio*q}`);a.setAttribute('stroke-dashoffset',-start);start+=ratio;});
    });
  });
  const progress=register('determinate-progress','确定进度 / Determinate progress',{effect:['track','circle'],target:[0,100]},(m,p)=>{
    m.el('p','Determinate study / 确定进度示意。Production progress must come from actual work.');
    const track=m.el('div',null,'height:18px;background:#29485c;border-radius:9px;overflow:hidden;width:min(360px,100%);'),fill=m.el('div',null,'height:100%;background:#66d6bd;',track);
    const svg=m.svg('svg',{viewBox:'0 0 180 180',width:180,height:180,role:'img','aria-label':'Determinate progress study'});
    m.svg('circle',{cx:90,cy:90,r:65,fill:'none',stroke:'#29485c','stroke-width':14},svg);
    const arc=m.svg('circle',{cx:90,cy:90,r:65,fill:'none',stroke:'#66d6bd','stroke-width':14,pathLength:1,transform:'rotate(-90 90 90)'},svg),caption=m.el('output');
    return m.finish(t=>{const value=(m.reduced?1:W.ease(t))*p.target;track.style.display=p.effect==='track'?'block':'none';svg.style.display=p.effect==='circle'?'block':'none';fill.style.width=value+'%';arc.setAttribute('stroke-dasharray',`${value/100} ${1-value/100}`);caption.textContent=Math.round(value)+' / 100';});
  });
  const number=register('numeric-interpolation','数值变化 / Numeric interpolation',{start:[0,10000],end:[0,10000]},(m,p)=>{
    const label=m.el('p',`Measured sample / 示例计量: ${p.start} → ${p.end}`),value=m.el('output',null,'display:block;font:700 54px system-ui;font-variant-numeric:tabular-nums;color:#66d6bd;');
    return m.finish(t=>{value.textContent=String(Math.round(W.mix(p.start,p.end,m.reduced?1:W.ease(t))));label.textContent=`Study only; actual final measurement / 实际终值: ${p.end}`;});
  });
  const pending=register('pending-cycle','未定加载周期 / Indeterminate pending cycle',{effect:['dots','arc'],cycles:[1,5]},(m,p)=>{
    m.el('p','Pending / 处理中 (no request is performed).');
    const box=m.el('div',null,'display:flex;gap:16px;align-items:center;min-height:100px;'),dots=[0,1,2].map(()=>m.el('span',null,'display:block;width:18px;height:18px;border-radius:50%;background:#66d6bd;',box));
    const svg=m.svg('svg',{viewBox:'0 0 100 100',width:100,height:100,'aria-hidden':'true'},box),arc=m.svg('path',{d:'M76 18 A40 40 0 1 0 82 74',fill:'none',stroke:'#66d6bd','stroke-width':8,'stroke-linecap':'round',pathLength:1},svg);
    return m.finish(t=>{dots.forEach((dot,i)=>{dot.style.display=p.effect==='dots'?'block':'none';dot.style.transform=`translateY(${m.reduced?0:-15*Math.max(0,Math.sin((t*p.cycles-i*.16)*Math.PI*2))}px)`;});svg.style.display=p.effect==='arc'?'block':'none';svg.style.transform=m.reduced?'none':`rotate(${t*p.cycles*360}deg)`;arc.setAttribute('stroke-dasharray',m.reduced?'1 0':`${.45+.3*Math.sin(t*Math.PI*2)} 1`);});
  });
  const optimistic=register('optimistic-transaction','乐观事务与回退 / Optimistic transaction',{base:[0,99],increment:[1,9]},(m,p)=>{
    let committed=p.base,pendingValue=null;const native=m.el('output'),add=m.el('button','Request local increment / 请求本地递增',buttonCSS),accept=m.el('button','Accept locally / 本地接受',buttonCSS),reject=m.el('button','Reject locally / 本地拒绝',buttonCSS);
    function update(){native.textContent=`Native: ${pendingValue===null?committed:pendingValue} (${pendingValue===null?'committed':'pending'})`;add.disabled=pendingValue!==null;accept.disabled=reject.disabled=pendingValue===null;}
    m.listen(add,'click',()=>{if(pendingValue!==null)return;pendingValue=committed+p.increment;update();});m.listen(accept,'click',()=>{if(pendingValue===null)return;committed=pendingValue;pendingValue=null;update();});m.listen(reject,'click',()=>{pendingValue=null;update();});update();
    const preview=m.el('p',null,'font:600 24px system-ui;color:#ffe989;');
    return m.finish(t=>{const q=m.reduced?1:t,phase=q<.25?'idle':q<.7?'pending':'rolled back',value=phase==='idle'||phase==='rolled back'?p.base:p.base+p.increment;preview.textContent=`Study transaction: ${value} · ${phase}`;});
  });
  const toast=register('toast-stack','通知堆叠 / Toast stack',{gap:[8,24],count:[1,3]},(m,p)=>{
    const count=p.count;
    m.el('p','Study stack / 通知堆叠回看；native slots can be dismissed independently.');
    const native=m.el('div',null,'display:flex;gap:8px;flex-wrap:wrap;'),active=[true,true,true];
    const nativeButtons=active.slice(0,count).map((_,i)=>{const b=m.el('button','Dismiss notice '+(i+1),'padding:12px;background:#24465d;color:white;border:1px solid #66d6bd;border-radius:8px;',native);m.listen(b,'click',()=>{active[i]=false;b.hidden=true;});return b;});
    const reset=m.el('button','Restore native notices / 恢复通知',buttonCSS);m.listen(reset,'click',()=>nativeButtons.forEach((b,i)=>{active[i]=true;b.hidden=false;}));
    const stack=m.el('div',null,'position:relative;min-height:190px;margin-top:20px;'),cards=Array.from({length:count},(_,i)=>m.el('div','Study notice / 示例通知 '+(i+1),`position:absolute;left:0;top:${i*(42+p.gap)}px;padding:12px 20px;background:#264e60;border:1px solid #66d6bd;border-radius:8px;`,stack));
    return m.finish(t=>cards.forEach((card,i)=>{const q=m.reduced?1:W.ease(W.phase(t,i*.15,1));card.style.transform=`translateY(${m.reduced?0:(1-q)*p.gap}px)`;card.style.clipPath=`inset(0 ${(1-q)*100}% 0 0)`;}));
  });
  return {recipes};
}

function buildWebLayout(W) {
  const recipes = {};
  let instance = 0;
  const ink = '#eef4fb';
  const quiet = '#aac0d7';
  const accent = '#8ce5ca';
  const panelCSS = 'position:relative;box-sizing:border-box;min-width:0;border:1px solid #3b526b;border-radius:12px;background:#152437;color:#eef4fb;padding:14px;';
  const buttonCSS = 'box-sizing:border-box;min-height:42px;padding:8px 12px;border:1px solid #617d99;border-radius:8px;background:#22364c;color:#eef4fb;font:inherit;cursor:pointer;';
  const headings = ['收集 · Intake', '处理 · Work', '完成 · Ready'];

  function integer(value, name) {
    if (!Number.isInteger(value)) throw new TypeError(name + ' must be an integer');
  }

  function branch(p, names) {
    if (!p || !names.includes(p.effect)) throw new TypeError('Unsupported layout effect: ' + String(p && p.effect));
    return p.effect;
  }

  function setup(stage, id, p, options) {
    recipes[id].validate(p);
    const m = W.mount(stage, id, options);
    m.root.id = 'motion-web-layout-' + (++instance);
    m.root.style.cssText = 'box-sizing:border-box;width:100%;max-width:700px;min-width:0;margin:auto;padding:12px;display:grid;gap:14px;color:' + ink + ';font:14px/1.45 system-ui,sans-serif;overflow:visible;';
    m.el('style', '#' + m.root.id + ' button:focus-visible,#' + m.root.id + ' input:focus-visible,#' + m.root.id + ' summary:focus-visible,#' + m.root.id + ' [tabindex]:focus-visible{outline:3px solid #f3ce7d;outline-offset:3px}#' + m.root.id + ' [hidden]{display:none!important}#' + m.root.id + ' button:disabled{cursor:default;opacity:.5}#' + m.root.id + ' dialog::backdrop{background:rgba(3,9,18,.72)}', '', m.root);
    const label = m.el('p', '确定性研究 / Fixed study — seeking does not change the live controls below.', 'margin:0;color:' + quiet + ';');
    const study = m.el('div', null, panelCSS + 'padding:0;overflow:hidden;min-height:180px;');
    study.setAttribute('aria-hidden', 'true');
    study.inert = true;
    const live = m.el('section', null, panelCSS);
    m.el('h3', '原生交互 / Native authority', 'margin:0 0 10px;font-size:15px;', live);
    const status = m.el('p', '', 'margin:10px 0 0;color:' + quiet + ';', live);
    return { m, study, live, status, label };
  }

  function button(m, text, parent, callback) {
    const el = m.el('button', text, buttonCSS, parent);
    el.type = 'button';
    if (callback) m.listen(el, 'click', callback);
    return el;
  }

  function row(m, parent) {
    return m.el('div', null, 'display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0;', parent);
  }

  function nativeMotion(m, duration) {
    const animations = new Set();
    let generation = 0;
    let disposed = false;
    function cancel() {
      generation += 1;
      animations.forEach(animation => {
        animation.onfinish = null;
        animation.cancel();
      });
      animations.clear();
    }
    function play(el, frames, done, timing) {
      if (disposed) return;
      if (m.reduced || typeof el.animate !== 'function') {
        if (done) done();
        return;
      }
      const owner = generation;
      const animation = el.animate(frames, Object.assign({ duration, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }, timing));
      animations.add(animation);
      animation.onfinish = () => {
        animations.delete(animation);
        animation.onfinish = null;
        animation.cancel();
        if (!disposed && owner === generation && done) done();
      };
    }
    m.onDispose(() => { disposed = true; cancel(); });
    return { cancel, play };
  }

  function pose(m, el) {
    const style = m.doc.defaultView.getComputedStyle(el);
    return { transform: style.transform, opacity: style.opacity, clipPath: style.clipPath };
  }

  function observeGeometry(m, elements, refresh, motion) {
    let disposed = false;
    let widths = [];
    function update(force) {
      if (disposed) return;
      const next = elements.map(el => el.getBoundingClientRect().width);
      const changed = next.some((width, i) => Math.abs(width - (widths[i] || 0)) > .25);
      if (force || changed) {
        widths = next;
        if (motion) motion.cancel();
        refresh();
      }
    }
    const view = m.doc.defaultView;
    const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(() => update(false)) : null;
    if (observer) elements.forEach(el => observer.observe(el));
    m.listen(view, 'resize', () => update(true));
    if (m.doc.fonts && typeof m.doc.fonts.addEventListener === 'function') m.listen(m.doc.fonts, 'loadingdone', () => update(true));
    m.onDispose(() => { disposed = true; if (observer) observer.disconnect(); });
    update(true);
    return () => update(true);
  }

  function relativeRect(el, parent) {
    const a = el.getBoundingClientRect();
    const b = parent.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
  }

  function interpolateBox(el, a, b, t) {
    el.style.left = W.mix(a.x, b.x, t) + 'px';
    el.style.top = W.mix(a.y, b.y, t) + 'px';
    el.style.width = W.mix(a.w, b.w, t) + 'px';
    el.style.height = W.mix(a.h, b.h, t) + 'px';
  }

  function setInactive(el, inactive) {
    el.inert = inactive;
    el.setAttribute('aria-hidden', String(inactive));
    el.querySelectorAll('button,input,select,textarea,a[href]').forEach(control => {
      if ('disabled' in control) control.disabled = inactive;
      else control.tabIndex = inactive ? -1 : 0;
    });
  }

  function connectedFocus(el) {
    if (el.isConnected) el.focus({ preventScroll: true });
  }

  recipes['web.measured-reflow'] = {
    title: '实测身份重排 / Measured identity reflow',
    validate(p) {
      W.validate(p, { effect: ['grid-reorder', 'masonry-filter'], count: [4, 8], columns: [2, 4], gapPx: [6, 24], durationMs: [80, 280] });
      integer(p.count, 'count'); integer(p.columns, 'columns');
      if (p.columns > p.count) throw new RangeError('columns cannot exceed count');
    },
    create(stage, p, options) {
      const { m, study, live, status } = setup(stage, 'web.measured-reflow', p, options);
      const motion = nativeMotion(m, p.durationMs);
      const controls = row(m, live);
      const host = m.el('div', null, 'position:relative;min-width:0;margin-top:12px;', live);
      const art = m.el('div', null, 'position:relative;width:100%;min-height:200px;', study);
      const probe = m.el('div', null, 'position:absolute;left:0;top:0;width:100%;visibility:hidden;pointer-events:none;', study);
      const copy = [
        '任务 A · Read the brief before drawing.',
        '任务 B · 保留同一个逻辑条目。文字会按可用宽度自然换行，不猜测行高。',
        '任务 C · Check contrast.',
        '任务 D · Resize the surface and measure again. Never animate from stale bounds.',
        '任务 E · 发布前确认当前请求，而不是旧的动画回调。',
        '任务 F · Keep keyboard focus on the moved item.',
        '任务 G · No duplicated accessible cards.',
        '任务 H · 相同身份，不同排列。'
      ];
      const records = [];
      const makeTile = (parent, index, semantic) => {
        const tile = m.el(semantic ? 'button' : 'div', copy[index], panelCSS + 'border-color:#5a819c;text-align:left;overflow-wrap:anywhere;min-height:68px;font:inherit;', parent);
        if (semantic) tile.type = 'button';
        tile.dataset.entityId = 'task-' + index;
        return tile;
      };
      for (let i = 0; i < p.count; i += 1) records.push({ id: i, live: makeTile(host, i, true), probe: makeTile(probe, i, false), art: makeTile(art, i, false) });
      let order = records.map(record => record.id);
      let filtered = false;
      let lastProgress = 0;
      let first = null;
      let last = null;
      let measured = false;
      const targetOrder = order.slice().reverse();
      const sourceOrder = order.slice();
      const isVisible = (id, filtering) => !filtering || id % 2 === 0;
      function layout(parent, key, ids, filtering) {
        const width = parent.getBoundingClientRect().width;
        const columns = Math.max(1, Math.min(p.columns, Math.floor((width + p.gapPx) / 145) || 1));
        ids.forEach(id => parent.appendChild(records[id][key]));
        records.forEach(record => { record[key].hidden = !isVisible(record.id, filtering); });
        if (p.effect === 'grid-reorder' || width <= 0) {
          parent.style.display = 'grid';
          parent.style.gridTemplateColumns = 'repeat(' + columns + ',minmax(0,1fr))';
          parent.style.gap = p.gapPx + 'px';
          parent.style.height = '';
          records.forEach(record => { const el = record[key]; el.style.position = ''; el.style.width = ''; el.style.left = ''; el.style.top = ''; });
        } else {
          parent.style.display = 'block';
          const itemWidth = (width - p.gapPx * (columns - 1)) / columns;
          records.forEach(record => {
            const el = record[key];
            el.style.position = 'absolute'; el.style.width = itemWidth + 'px';
          });
          // Width writes finish before intrinsic heights are read.
          const heights = records.map(record => record[key].hidden ? 0 : record[key].getBoundingClientRect().height);
          const floors = Array(columns).fill(0);
          ids.forEach(id => {
            if (!isVisible(id, filtering)) return;
            const column = floors.indexOf(Math.min.apply(null, floors));
            const el = records[id][key];
            el.style.left = column * (itemWidth + p.gapPx) + 'px';
            el.style.top = floors[column] + 'px';
            floors[column] += heights[id] + p.gapPx;
          });
          parent.style.height = Math.max(0, Math.max.apply(null, floors) - p.gapPx) + 'px';
        }
      }
      function bounds(parent, key) {
        return records.map(record => record[key].hidden ? null : relativeRect(record[key], parent));
      }
      function render(progress) {
        lastProgress = progress;
        const t = m.reduced ? 1 : W.ease(W.phase(progress, .12, .82));
        records.forEach(record => {
          const el = record.art;
          const a = first && first[record.id];
          const b = last && last[record.id];
          el.hidden = p.effect === 'masonry-filter' && !isVisible(record.id, true) && t === 1;
          if (!measured) {
            el.style.position = 'relative'; el.style.width = ''; el.style.height = ''; el.style.left = ''; el.style.top = ''; el.style.transform = 'none'; el.style.opacity = '1';
            el.style.order = p.effect === 'grid-reorder' ? p.count - record.id : record.id;
            return;
          }
          el.style.position = 'absolute';
          interpolateBox(el, a || b, b || a, t);
          el.style.opacity = b ? '1' : String(1 - t);
          el.style.transform = 'none';
        });
      }
      function refresh() {
        layout(host, 'live', order, filtered);
        layout(probe, 'probe', sourceOrder, false);
        first = bounds(probe, 'probe');
        layout(probe, 'probe', p.effect === 'grid-reorder' ? targetOrder : sourceOrder, p.effect === 'masonry-filter');
        last = bounds(probe, 'probe');
        measured = study.getBoundingClientRect().width > 0;
        art.style.display = measured ? 'block' : 'grid';
        art.style.gridTemplateColumns = 'repeat(' + p.columns + ',minmax(0,1fr))';
        const heights = (first || []).concat(last || []).filter(Boolean).map(rect => rect.y + rect.h);
        art.style.height = measured ? Math.max(180, ...heights) + 'px' : '';
        render(lastProgress);
      }
      function commit(ids, filtering, fallbackFocus) {
        const focus = m.doc.activeElement;
        const before = records.map(record => record.live.hidden ? null : record.live.getBoundingClientRect());
        motion.cancel();
        if (focus && records.some(record => record.live === focus && !isVisible(record.id, filtering))) connectedFocus(fallbackFocus);
        order = ids.slice(); filtered = filtering;
        layout(host, 'live', order, filtered);
        const after = records.map(record => record.live.hidden ? null : record.live.getBoundingClientRect());
        if (focus && records.some(record => record.live === focus && !record.live.hidden)) connectedFocus(focus);
        records.forEach((record, i) => {
          if (before[i] && after[i]) motion.play(record.live, [
            { transform: 'translate(' + (before[i].left - after[i].left) + 'px,' + (before[i].top - after[i].top) + 'px)' },
            { transform: 'none' }
          ]);
        });
        status.textContent = '真实顺序 / Live order: ' + order.filter(id => isVisible(id, filtered)).map(id => String.fromCharCode(65 + id)).join(' → ');
      }
      if (p.effect === 'grid-reorder') {
        const reverse = button(m, '反转顺序 / Reverse', controls, () => commit(order.slice().reverse(), false, reverse));
        m.el('p', 'Focused card: ↑/↓ moves that identity; Home/End moves it to an edge. Enter selects it.', 'margin:8px 0;color:' + quiet + ';', live);
      } else {
        const all = button(m, '全部 / All', controls, () => { all.setAttribute('aria-pressed', 'true'); even.setAttribute('aria-pressed', 'false'); commit(order, false, all); });
        const even = button(m, '研究 / Research A,C,E…', controls, () => { all.setAttribute('aria-pressed', 'false'); even.setAttribute('aria-pressed', 'true'); commit(order, true, even); });
        all.setAttribute('aria-pressed', 'true'); even.setAttribute('aria-pressed', 'false');
      }
      records.forEach(record => {
        m.listen(record.live, 'click', () => { status.textContent = '已选择 / Selected: ' + copy[record.id]; });
        m.listen(record.live, 'keydown', event => {
          if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const index = order.indexOf(record.id);
          if (p.effect === 'grid-reorder') {
            const next = order.slice(); next.splice(index, 1);
            const target = event.key === 'Home' ? 0 : event.key === 'End' ? next.length : W.clamp(index + (event.key === 'ArrowUp' ? -1 : 1), 0, next.length);
            next.splice(target, 0, record.id); commit(next, false, record.live);
          } else {
            const visible = order.filter(id => isVisible(id, filtered));
            const current = visible.indexOf(record.id);
            const target = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : W.clamp(current + (event.key === 'ArrowUp' ? -1 : 1), 0, visible.length - 1);
            connectedFocus(records[visible[target]].live);
          }
        });
      });
      status.textContent = 'Live order: ' + order.map(id => String.fromCharCode(65 + id)).join(' → ');
      observeGeometry(m, [study, host], refresh, motion);
      return m.finish(render);
    }
  };

  recipes['web.intrinsic-height'] = {
    title: '自然内容高度 / Intrinsic content height',
    validate(p) {
      W.validate(p, { paragraphs: [2, 5], durationMs: [80, 280] }); integer(p.paragraphs, 'paragraphs');
    },
    create(stage, p, options) {
      const { m, study, live, status } = setup(stage, 'web.intrinsic-height', p, options);
      const motion = nativeMotion(m, p.durationMs);
      const details = m.el('details', null, panelCSS, live);
      const summary = m.el('summary', '展开说明 / Expand notes', 'cursor:pointer;min-height:32px;font-weight:700;', details);
      const body = m.el('div', null, 'padding-top:8px;', details);
      const clip = m.el('div', null, 'overflow:hidden;margin:14px;border:1px solid #6e9b91;border-radius:8px;', study);
      const content = m.el('div', null, 'padding:12px;box-sizing:border-box;', clip);
      const text = options && options.text ? options.text : '同一段真实内容会随宽度、文字与字体自然换行。Measure intrinsic content, not a guessed pixel height.';
      for (let i = 0; i < p.paragraphs; i += 1) {
        m.el('p', (i + 1) + '. ' + text, 'margin:0 0 10px;', body);
        m.el('p', (i + 1) + '. ' + text, 'margin:0 0 10px;', content);
      }
      button(m, '收起 / Collapse', body, () => { connectedFocus(summary); details.open = false; });
      const caption = m.el('p', 'Fixed study: collapsed → measured natural content.', 'margin:0 14px 12px;color:' + quiet + ';', study);
      let height = 0;
      let lastProgress = 0;
      let beforeHeight = 0;
      function render(progress) {
        lastProgress = progress;
        const t = m.reduced ? 1 : W.ease(W.phase(progress, .1, .8));
        if (height > 0) clip.style.height = (height * t) + 'px';
        else clip.style.height = 'auto';
        caption.textContent = height > 0 ? 'Measured content: ' + Math.round(height) + ' px · study only' : 'Natural content · geometry awaits connected layout';
      }
      m.listen(summary, 'click', () => { beforeHeight = details.getBoundingClientRect().height; });
      m.listen(summary, 'keydown', event => { if (event.key === 'Enter' || event.key === ' ') beforeHeight = details.getBoundingClientRect().height; });
      m.listen(details, 'toggle', () => {
        motion.cancel();
        details.style.height = '';
        const after = details.getBoundingClientRect().height;
        details.style.overflow = 'hidden';
        status.textContent = details.open ? 'Native details.open = true' : 'Native details.open = false';
        if (beforeHeight > 0 && after > 0) motion.play(details, [{ height: beforeHeight + 'px' }, { height: after + 'px' }], () => { details.style.overflow = ''; });
        else details.style.overflow = '';
        beforeHeight = after;
      });
      observeGeometry(m, [study, details], () => {
        details.style.height = ''; details.style.overflow = '';
        height = content.getBoundingClientRect().height;
        beforeHeight = details.getBoundingClientRect().height;
        render(lastProgress);
      }, motion);
      status.textContent = 'Native details.open = false · Enter/Space on summary';
      return m.finish(render);
    }
  };

  recipes['web.shared-identity'] = {
    title: '同一实体的几何接续 / Shared logical identity',
    validate(p) {
      W.validate(p, { effect: ['shared-art', 'detail-row', 'hero-art', 'modal-shell'], targetRatio: [.55, .95], durationMs: [80, 280] });
    },
    create(stage, p, options) {
      const { m, study, live, status } = setup(stage, 'web.shared-identity', p, options);
      const modal = p.effect === 'modal-shell';
      const motion = nativeMotion(m, p.durationMs);
      const controls = row(m, live);
      const source = m.el('div', null, 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin-top:12px;', live);
      const origin = m.el('div', null, 'min-width:0;', source);
      m.el('div', '实体 B18 / Separate entity — never morph A17 into this card.', panelCSS, source);
      const target = m.el(modal ? 'dialog' : 'section', null, modal ? panelCSS + 'position:fixed;width:min(600px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;margin:auto;' : panelCSS + 'width:' + p.targetRatio * 100 + '%;margin:12px auto 0;', live);
      if (modal && typeof target.showModal !== 'function') { m.root.remove(); throw new Error('web.shared-identity modal-shell requires native Dialog API'); }
      if (!modal) target.hidden = true;
      const close = button(m, '返回列表 / Back to list', target);
      const entity = m.el('article', null, panelCSS + 'margin-top:10px;overflow:hidden;', origin);
      entity.dataset.entityId = 'atlas-A17';
      const art = m.el('div', 'A17', 'box-sizing:border-box;width:72px;height:66px;display:grid;place-items:center;background:#8ce5ca;color:#102231;border-radius:8px;font-weight:800;', entity);
      const title = m.el('h4', '同一张卡 / Atlas A17', 'margin:10px 0 6px;font-size:17px;', entity);
      title.tabIndex = -1;
      const description = m.el('p', '真实身份 A17 不变；文字不被缩放。', 'margin:0 0 10px;', entity);
      let saved = false;
      const save = button(m, '收藏 A17 / Save', entity, () => { saved = !saved; save.setAttribute('aria-pressed', String(saved)); save.textContent = saved ? '已收藏 A17 / Saved' : '收藏 A17 / Save'; });
      save.setAttribute('aria-pressed', 'false');
      let open = false;
      let disposed = false;
      const opener = button(m, '打开 A17 / Open same entity', controls);
      opener.setAttribute('aria-expanded', 'false');
      target.id = m.root.id + '-detail'; opener.setAttribute('aria-controls', target.id);
      function request(next) {
        if (disposed || next === open) return;
        const moving = p.effect === 'shared-art' || p.effect === 'hero-art' ? art : entity;
        const before = moving.getBoundingClientRect();
        motion.cancel(); open = next;
        if (next) {
          if (modal) target.showModal(); else target.hidden = false;
          target.appendChild(entity);
          art.style.width = p.effect === 'detail-row' ? '112px' : '100%';
          art.style.height = p.effect === 'hero-art' ? '190px' : '128px';
          description.textContent = 'A17 详情 / Detail. Saved state and this actual DOM identity are retained.';
          connectedFocus(title);
        } else {
          if (modal && target.open) target.close();
          connectedFocus(opener);
          origin.appendChild(entity);
          art.style.width = '72px'; art.style.height = '66px';
          description.textContent = '真实身份 A17 不变；文字不被缩放。';
          if (!modal) target.hidden = true;
        }
        opener.setAttribute('aria-expanded', String(open));
        status.textContent = 'Native entity atlas-A17 · ' + (open ? 'detail' : 'list') + ' · saved=' + saved;
        const after = moving.getBoundingClientRect();
        if (before.width > 0 && after.width > 0) motion.play(moving, [
          { transform: 'translate(' + (before.left - after.left) + 'px,' + (before.top - after.top) + 'px)', width: before.width + 'px', height: before.height + 'px' },
          { transform: 'none', width: after.width + 'px', height: after.height + 'px' }
        ]);
      }
      m.listen(opener, 'click', () => request(!open));
      m.listen(close, 'click', () => request(false));
      m.listen(target, 'keydown', event => { if (event.key === 'Escape' && open && !modal) { event.preventDefault(); request(false); } });
      if (modal) {
        m.listen(target, 'cancel', event => { event.preventDefault(); request(false); });
        m.listen(target, 'close', () => { if (!disposed && open) request(false); });
      }
      m.onDispose(() => { disposed = true; if (modal && target.open) target.close(); });
      const startProbe = m.el('div', null, panelCSS + 'position:absolute;left:14px;top:14px;width:34%;visibility:hidden;', study);
      const endProbe = m.el('div', null, panelCSS + 'position:absolute;right:14px;top:76px;width:' + p.targetRatio * 100 + '%;visibility:hidden;', study);
      const startArt = m.el('div', 'A17', 'width:72px;height:66px;', startProbe);
      const endArt = m.el('div', 'A17', 'width:' + (p.effect === 'detail-row' ? '112px' : '100%') + ';height:' + (p.effect === 'hero-art' ? '148px' : '108px') + ';', endProbe);
      m.el('p', 'A17 · same identity', 'margin:10px 0 0;', startProbe);
      m.el('p', 'A17 · same identity · detail', 'margin:10px 0 0;', endProbe);
      const proxy = m.el('div', 'A17', 'position:absolute;box-sizing:border-box;background:#8ce5ca;color:#102231;border:1px solid #c6ffef;border-radius:10px;display:grid;place-items:center;font-weight:800;overflow:hidden;', study);
      m.el('p', 'Fixed A17 → A17 geometry; not another interactive card.', 'position:absolute;left:14px;bottom:8px;margin:0;color:' + quiet + ';font-size:12px;', study);
      let a = null;
      let b = null;
      let lastProgress = 0;
      function render(progress) {
        lastProgress = progress;
        if (!a || !b) { proxy.style.cssText += ';position:relative;min-height:120px;margin:14px;'; return; }
        proxy.style.position = 'absolute'; proxy.style.margin = '0'; proxy.style.minHeight = '0';
        const t = m.reduced ? 1 : W.ease(W.phase(progress, .12, .84));
        interpolateBox(proxy, a, b, t);
        proxy.style.borderRadius = W.mix(10, p.effect === 'hero-art' ? 2 : 14, t) + 'px';
        proxy.style.boxShadow = p.effect === 'modal-shell' ? '0 10px 36px rgba(0,0,0,' + t * .5 + ')' : 'none';
      }
      observeGeometry(m, [study, source], () => {
        study.style.minHeight = p.effect === 'hero-art' ? '310px' : '270px';
        if (study.getBoundingClientRect().width <= 0) { a = null; b = null; }
        else {
          const shell = p.effect === 'detail-row' || p.effect === 'modal-shell';
          a = relativeRect(shell ? startProbe : startArt, study);
          b = relativeRect(shell ? endProbe : endArt, study);
        }
        render(lastProgress);
      }, motion);
      status.textContent = 'Native entity atlas-A17 · list · saved=false';
      return m.finish(render);
    }
  };

  recipes['web.native-top-layer'] = {
    title: '真实顶层与可寻址研究 / Native top-layer surfaces',
    validate(p) {
      const effect = branch(p, ['dialog', 'popover', 'command', 'modal', 'spring-sheet']);
      const schema = { effect: [effect], durationMs: [80, 280] };
      if (effect === 'popover') schema.offsetPx = [4, 24];
      if (effect === 'modal') schema.travelPx = [8, 48];
      if (effect === 'spring-sheet') schema.overshoot = [.02, .12];
      W.validate(p, schema);
    },
    create(stage, p, options) {
      const { m, study, live, status } = setup(stage, 'web.native-top-layer', p, options);
      const motion = nativeMotion(m, p.durationMs);
      const popover = p.effect === 'popover';
      const layer = m.el(popover ? 'div' : 'dialog', null, panelCSS + 'position:fixed;width:min(440px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;margin:auto;', live);
      layer.id = m.root.id + '-layer';
      if (popover) {
        layer.popover = 'auto';
        layer.style.margin = '0';
        if (typeof layer.showPopover !== 'function') { m.root.remove(); throw new Error('web.native-top-layer popover requires native Popover API'); }
      } else if (typeof layer.showModal !== 'function') {
        m.root.remove(); throw new Error('web.native-top-layer requires native Dialog API');
      }
      if (p.effect === 'spring-sheet') {
        layer.style.top = 'auto'; layer.style.bottom = '16px';
        layer.style.borderRadius = '18px 18px 6px 6px';
      }
      const title = m.el('h4', p.effect === 'command' ? '选择本地页面 / Local command palette' : p.effect === 'spring-sheet' ? '底部操作面板 / Bottom sheet' : '独立顶层 / Native top layer', 'margin:0 0 10px;font-size:18px;', layer);
      title.id = layer.id + '-title';
      layer.setAttribute('aria-labelledby', title.id);
      const opener = button(m, p.effect === 'command' ? '打开命令面板 / Open palette' : '打开顶层 / Open layer', live);
      opener.setAttribute('aria-haspopup', popover ? 'dialog' : 'dialog');
      opener.setAttribute('aria-controls', layer.id);
      opener.setAttribute('aria-expanded', 'false');
      let disposed = false;
      const actualOpen = () => popover ? layer.matches(':popover-open') : layer.open;
      const result = m.el('section', null, 'margin-top:12px;', live);
      const resultHeading = m.el('h4', '当前页面 / Overview', 'margin:0 0 6px;', result);
      resultHeading.tabIndex = -1;
      const resultText = m.el('p', 'The native surface owns modality, light-dismiss and focus. Timeline owns none of these.', 'margin:0;', result);
      let input = null;
      const choices = [];
      const commandNames = ['概览 / Overview', '设置 / Settings', '活动 / Activity'];
      function sync() {
        if (disposed) return;
        const open = actualOpen();
        opener.setAttribute('aria-expanded', String(open));
        status.textContent = popover ? 'Native :popover-open = ' + open : 'Native dialog.open = ' + open;
      }
      function close(restore) {
        if (disposed || !actualOpen()) return;
        motion.cancel();
        // Release top-layer and modality immediately; study exit is not a delayed native close.
        if (popover) layer.hidePopover(); else layer.close();
        sync();
        if (restore) connectedFocus(opener);
      }
      if (p.effect === 'command') {
        const inputLabel = m.el('label', '筛选本地页面 / Filter local pages', 'display:grid;gap:6px;', layer);
        input = m.el('input', null, 'box-sizing:border-box;width:100%;min-height:42px;padding:8px;border:1px solid #8eabc5;border-radius:7px;background:#102032;color:' + ink + ';font:inherit;', inputLabel);
        input.type = 'search';
        input.placeholder = 'Overview / 设置 / Activity';
        const list = m.el('div', null, 'display:grid;gap:6px;margin:10px 0;', layer);
        commandNames.forEach((name, index) => {
          const choice = button(m, name, list, () => {
            resultHeading.textContent = commandNames[index];
            resultText.textContent = index === 0 ? 'Overview: local project summary.' : index === 1 ? 'Settings: this study navigates to the actual local settings view.' : 'Activity: this study navigates to the actual local activity view.';
            close(false); connectedFocus(resultHeading);
          });
          choices.push(choice);
          m.listen(choice, 'keydown', event => {
            const visible = choices.filter(el => !el.hidden);
            const current = visible.indexOf(choice);
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              connectedFocus(visible[(current + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length]);
            } else if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault(); connectedFocus(visible[event.key === 'Home' ? 0 : visible.length - 1]);
            }
          });
        });
        const empty = m.el('p', '没有匹配页面 / No matching local page', 'margin:8px 0;color:' + quiet + ';', list);
        empty.hidden = true;
        function filter() {
          const query = input.value.trim().toLocaleLowerCase();
          choices.forEach((choice, index) => {
            choice.hidden = !commandNames[index].toLocaleLowerCase().includes(query);
            choice.disabled = choice.hidden;
          });
          empty.hidden = choices.some(choice => !choice.hidden);
        }
        m.listen(input, 'input', filter);
        m.listen(input, 'keydown', event => {
          const first = choices.find(choice => !choice.hidden);
          if ((event.key === 'ArrowDown' || event.key === 'Enter') && first) {
            event.preventDefault();
            if (event.key === 'Enter') first.click(); else connectedFocus(first);
          }
        });
      } else {
        m.el('p', popover ? '自动轻触关闭 / Native light-dismiss. This is nonmodal, not a focus trap.' : 'Tab stays inside this actual modal dialog. Escape releases it.', 'margin:0 0 12px;', layer);
        const label = m.el('label', '本地备注 / Local note ', 'display:grid;gap:6px;margin-bottom:12px;', layer);
        input = m.el('input', null, 'box-sizing:border-box;width:100%;min-height:42px;padding:8px;border:1px solid #8eabc5;border-radius:7px;background:#102032;color:' + ink + ';font:inherit;', label);
        input.type = 'text';
      }
      button(m, '关闭 / Close', layer, () => close(true));
      function placePopover() {
        if (!popover || !actualOpen()) return;
        const trigger = opener.getBoundingClientRect();
        const box = layer.getBoundingClientRect();
        const view = m.doc.defaultView;
        layer.style.left = W.clamp(trigger.left, 8, Math.max(8, view.innerWidth - box.width - 8)) + 'px';
        layer.style.top = W.clamp(trigger.bottom + p.offsetPx, 8, Math.max(8, view.innerHeight - box.height - 8)) + 'px';
      }
      function open() {
        if (disposed || actualOpen()) return;
        motion.cancel();
        if (popover) layer.showPopover(); else layer.showModal();
        layer.style.transform = 'none'; layer.style.clipPath = 'none'; layer.style.opacity = '1';
        placePopover(); sync();
        connectedFocus(input);
        let frames;
        if (p.effect === 'dialog') frames = [{ opacity: 0, clipPath: 'inset(42% 16% round 12px)' }, { opacity: 1, clipPath: 'inset(0% 0% round 12px)' }];
        else if (p.effect === 'popover') frames = [{ opacity: 0, clipPath: 'inset(0 0 100% 0)', transform: 'translateY(-6px)' }, { opacity: 1, clipPath: 'inset(0 0 0% 0)', transform: 'none' }];
        else if (p.effect === 'command') frames = [{ opacity: 0, transform: 'translateY(-14px)', clipPath: 'inset(0 0 25% 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0% 0)' }];
        else if (p.effect === 'modal') frames = [{ opacity: 0, transform: 'translateY(' + p.travelPx + 'px)' }, { opacity: 1, transform: 'none' }];
        else {
          const height = layer.getBoundingClientRect().height;
          frames = [{ transform: 'translateY(' + height + 'px)', offset: 0 }, { transform: 'translateY(' + (-height * p.overshoot) + 'px)', offset: .65 }, { transform: 'translateY(' + (height * p.overshoot * .22) + 'px)', offset: .84 }, { transform: 'none', offset: 1 }];
        }
        motion.play(layer, frames);
      }
      m.listen(opener, 'click', () => { if (actualOpen()) close(true); else open(); });
      if (popover) {
        m.listen(layer, 'toggle', sync);
        m.listen(layer, 'keydown', event => { if (event.key === 'Escape' && actualOpen()) { event.preventDefault(); close(true); } });
        m.listen(m.doc.defaultView, 'scroll', placePopover, true);
      } else {
        m.listen(layer, 'cancel', event => { event.preventDefault(); close(true); });
        m.listen(layer, 'close', sync);
      }
      if (p.effect === 'command') m.listen(m.root, 'keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (actualOpen()) close(true); else open(); } });
      m.onDispose(() => {
        disposed = true;
        if (actualOpen()) { if (popover) layer.hidePopover(); else layer.close(); }
      });
      const backdrop = m.el('div', null, 'position:absolute;inset:0;background:rgba(3,9,18,.65);', study);
      const visual = m.el('div', null, panelCSS + 'position:absolute;left:12%;top:20px;width:76%;max-height:190px;overflow:hidden;', study);
      m.el('strong', p.effect === 'command' ? 'Local page search' : p.effect === 'spring-sheet' ? 'Bottom sheet' : 'Top layer', 'display:block;margin-bottom:8px;', visual);
      m.el('p', 'Study panel — native modality and focus are exercised below.', 'margin:0 0 8px;', visual);
      if (p.effect === 'command') {
        m.el('div', 'Overview · Settings · Activity', 'padding:10px;border:1px solid #668099;border-radius:6px;', visual);
        m.el('div', 'Local navigation only', 'padding:8px 0;color:' + quiet + ';', visual);
      }
      const note = m.el('p', 'Fixed enter → hold → exit. Native close is immediate.', 'position:absolute;bottom:8px;left:12px;margin:0;color:' + quiet + ';font-size:12px;', study);
      let visualHeight = 120;
      let lastProgress = 0;
      function render(progress) {
        lastProgress = progress;
        const enter = W.ease(W.phase(progress, .05, .4));
        const exit = W.ease(W.phase(progress, .72, 1));
        const t = m.reduced ? 1 : enter * (1 - exit);
        backdrop.style.opacity = popover ? '0' : String(t);
        visual.style.opacity = String(t);
        visual.style.transform = 'none'; visual.style.clipPath = 'none';
        if (!m.reduced && p.effect === 'dialog') visual.style.clipPath = 'inset(' + (42 * (1 - t)) + '% ' + (16 * (1 - t)) + '% round 12px)';
        else if (!m.reduced && p.effect === 'popover') { visual.style.clipPath = 'inset(0 0 ' + (100 * (1 - t)) + '% 0)'; visual.style.transform = 'translateY(' + (-6 * (1 - t)) + 'px)'; }
        else if (!m.reduced && p.effect === 'command') { visual.style.transform = 'translateY(' + (-14 * (1 - t)) + 'px)'; visual.style.clipPath = 'inset(0 0 ' + (25 * (1 - t)) + '% 0)'; }
        else if (!m.reduced && p.effect === 'modal') visual.style.transform = 'translateY(' + (p.travelPx * (1 - t)) + 'px)';
        else if (!m.reduced && p.effect === 'spring-sheet') {
          const phase = W.phase(progress, .05, .48);
          const spring = phase === 1 ? 1 : 1 - Math.exp(-6 * phase) * (Math.cos(phase * Math.PI * 2) + .3 * Math.sin(phase * Math.PI * 2));
          const settle = Math.min(1 + p.overshoot, spring);
          visual.style.transform = 'translateY(' + (visualHeight * (1 - settle + exit)) + 'px)';
        }
        note.textContent = m.reduced ? 'Reduced: static readable open result; native state unchanged.' : 'Fixed enter → hold → exit. Native close is immediate.';
      }
      observeGeometry(m, [study], () => {
        visualHeight = visual.getBoundingClientRect().height || 120;
        study.style.minHeight = Math.max(230, visualHeight + 64) + 'px';
        visual.style.top = p.effect === 'spring-sheet' ? 'auto' : '20px';
        visual.style.bottom = p.effect === 'spring-sheet' ? '36px' : 'auto';
        placePopover(); render(lastProgress);
      }, motion);
      sync();
      return m.finish(render);
    }
  };

  recipes['web.discrete-presence'] = {
    title: '视觉寿命与离散隐藏 / Discrete visual lifetime',
    validate(p) { W.validate(p, { exitDistancePx: [4, 24], durationMs: [80, 220] }); },
    create(stage, p, options) {
      const { m, study, live, status } = setup(stage, 'web.discrete-presence', p, options);
      const motion = nativeMotion(m, p.durationMs);
      const controls = row(m, live);
      const panel = m.el('section', null, panelCSS + 'margin-top:12px;', live);
      panel.id = m.root.id + '-notice';
      m.el('p', '可操作通知 / Actionable notice — semantic availability changes immediately.', 'margin:0 0 10px;', panel);
      const action = button(m, '查看说明 / Read note', panel, () => { status.textContent = 'Native notice action selected'; });
      let open = true;
      const show = button(m, '显示 / Show', controls);
      const hide = button(m, '移除 / Dismiss', controls);
      show.setAttribute('aria-controls', panel.id);
      function request(next) {
        const from = panel.hidden ? { transform: 'none', opacity: '0' } : pose(m, panel);
        motion.cancel(); open = next;
        if (!open && panel.contains(m.doc.activeElement)) connectedFocus(show);
        setInactive(panel, !open);
        panel.hidden = false;
        show.setAttribute('aria-expanded', String(open));
        panel.style.opacity = open ? '1' : '0';
        panel.style.transform = open ? 'none' : 'translateY(' + (-p.exitDistancePx) + 'px)';
        status.textContent = open ? 'Native: available now' : 'Native: inert now; display removed at current exit completion';
        motion.play(panel, [from, { opacity: panel.style.opacity, transform: panel.style.transform }], () => {
          panel.hidden = !open;
          if (!open) status.textContent = 'Native: dismissed · hidden=true';
        });
      }
      m.listen(show, 'click', () => request(true));
      m.listen(hide, 'click', () => request(false));
      m.listen(panel, 'keydown', event => { if (event.key === 'Escape') { event.preventDefault(); request(false); } });
      show.setAttribute('aria-expanded', 'true');
      const art = m.el('div', 'A retained visual may exit after semantics have already closed.', panelCSS + 'margin:18px;', study);
      const result = m.el('p', '', 'margin:18px;color:' + quiet + ';', study);
      function render(progress) {
        const t = m.reduced ? 1 : W.ease(W.phase(progress, .15, .84));
        art.style.opacity = String(1 - t);
        art.style.transform = m.reduced ? 'none' : 'translateY(' + (-p.exitDistancePx * t) + 'px)';
        art.style.display = t === 1 ? 'none' : 'block';
        result.textContent = t === 1 ? 'Study result: dismissed · discrete display:none' : 'Study: painted exit; no study controls exist';
      }
      observeGeometry(m, [study], () => { panel.hidden = !open; }, motion);
      status.textContent = 'Native: available now · Escape or Dismiss closes';
      return m.finish(render);
    }
  };

  recipes['web.navigation-disclosure'] = {
    title: '图标菜单与侧栏 / Icon, menu and sidebar navigation',
    validate(p) {
      const effect = branch(p, ['menu-origin', 'sidebar', 'stagger-nav']);
      const schema = { effect: [effect], durationMs: [80, 280] };
      if (effect === 'sidebar') schema.widthRatio = [.24, .44];
      else schema.travelPx = [4, 28];
      if (effect === 'stagger-nav') schema.staggerMs = [12, 48];
      W.validate(p, schema);
      if (effect === 'stagger-nav' && p.staggerMs * 2 >= p.durationMs) throw new RangeError('stagger must leave time for the final item');
    },
    create(stage, p, options) {
      const { m, study, live, status } = setup(stage, 'web.navigation-disclosure', p, options);
      const motion = nativeMotion(m, p.durationMs);
      const toggle = button(m, '菜单 / Menu', live);
      const icon = m.el('span', null, 'display:inline-block;position:relative;width:22px;height:18px;margin-right:8px;vertical-align:middle;', toggle);
      icon.setAttribute('aria-hidden', 'true');
      const strokes = [0, 1, 2].map(index => m.el('span', null, 'position:absolute;left:0;top:8px;width:22px;height:2px;background:' + accent + ';transform:translateY(' + (index - 1) * 6 + 'px);', icon));
      const shell = m.el('div', null, 'position:relative;display:flex;gap:12px;margin-top:12px;min-width:0;', live);
      const nav = m.el('nav', null, panelCSS + (p.effect === 'sidebar' ? 'flex:0 0 ' + p.widthRatio * 100 + '%;' : 'position:absolute;z-index:2;left:0;top:0;width:min(280px,100%);'), shell);
      nav.id = m.root.id + '-navigation';
      nav.setAttribute('aria-label', 'Local study destinations');
      if (p.effect === 'menu-origin') nav.setAttribute('role', 'menu');
      toggle.setAttribute('aria-controls', nav.id);
      toggle.setAttribute('aria-expanded', 'false');
      if (p.effect === 'menu-origin') toggle.setAttribute('aria-haspopup', 'menu');
      const content = m.el('section', null, panelCSS + 'flex:1;min-height:168px;', shell);
      const heading = m.el('h4', headings[0], 'margin:0 0 8px;', content);
      heading.tabIndex = -1;
      const paragraph = m.el('p', 'Native local navigation: current destination is independent of the study.', 'margin:0;', content);
      let open = false;
      let selected = 0;
      let currentItem = 0;
      const destinations = [];
      function iconStates(value) {
        return [
          { transform: value ? 'rotate(45deg)' : 'translateY(-6px)', opacity: '1' },
          { transform: 'none', opacity: value ? '0' : '1' },
          { transform: value ? 'rotate(-45deg)' : 'translateY(6px)', opacity: '1' }
        ];
      }
      function setOpen(next, focusFirst) {
        const from = nav.hidden ? { transform: 'none', opacity: '0', clipPath: 'inset(0 0 100% 0)' } : pose(m, nav);
        const iconFrom = strokes.map(el => pose(m, el));
        motion.cancel(); open = next;
        if (!open && nav.contains(m.doc.activeElement)) connectedFocus(toggle);
        toggle.setAttribute('aria-expanded', String(open));
        setInactive(nav, !open);
        destinations.forEach((el, i) => { el.tabIndex = open ? (p.effect === 'menu-origin' ? (i === currentItem ? 0 : -1) : 0) : -1; });
        nav.hidden = false;
        nav.style.opacity = open ? '1' : '0';
        nav.style.transform = open ? 'none' : p.effect === 'sidebar' ? 'translateX(-12px)' : 'translateY(' + (-p.travelPx) + 'px)';
        nav.style.clipPath = open ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)';
        const targets = iconStates(open);
        strokes.forEach((el, i) => { Object.assign(el.style, targets[i]); motion.play(el, [iconFrom[i], targets[i]]); });
        if (p.effect === 'sidebar') {
          // Intrinsic content reflows in a real flex layout; the text is never scaled.
          nav.hidden = !open;
          if (open) motion.play(nav, [{ transform: 'translateX(-16px)', opacity: 0 }, { transform: 'none', opacity: 1 }]);
        } else {
          motion.play(nav, [from, { transform: nav.style.transform, opacity: nav.style.opacity, clipPath: nav.style.clipPath }], () => { nav.hidden = !open; });
          if (open && p.effect === 'stagger-nav') destinations.forEach((el, i) => {
            motion.play(el, [{ transform: 'translateY(' + p.travelPx + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], null, { delay: i * p.staggerMs, duration: p.durationMs - i * p.staggerMs });
          });
        }
        if (open && focusFirst) { currentItem = 0; destinations.forEach((el, i) => { if (p.effect === 'menu-origin') el.tabIndex = i === 0 ? 0 : -1; }); connectedFocus(destinations[0]); }
        status.textContent = 'Native menu=' + open + ' · destination=' + headings[selected];
      }
      headings.forEach((name, index) => {
        const destination = button(m, name, nav, () => {
          selected = index;
          heading.textContent = headings[selected];
          paragraph.textContent = selected === 0 ? 'Intake: inspect the actual brief.' : selected === 1 ? 'Work: retain authoritative progress and local selection.' : 'Ready: the current local page is available immediately.';
          setOpen(false, false); connectedFocus(heading);
        });
        destination.style.display = 'block'; destination.style.width = '100%'; destination.style.marginBottom = '6px';
        if (p.effect === 'menu-origin') destination.setAttribute('role', 'menuitem');
        destinations.push(destination);
        m.listen(destination, 'keydown', event => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          currentItem = event.key === 'Home' ? 0 : event.key === 'End' ? destinations.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + destinations.length) % destinations.length;
          destinations.forEach((el, i) => { if (p.effect === 'menu-origin') el.tabIndex = i === currentItem ? 0 : -1; });
          connectedFocus(destinations[currentItem]);
        });
      });
      m.listen(toggle, 'click', () => setOpen(!open, p.effect === 'menu-origin'));
      m.listen(toggle, 'keydown', event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true, true); } });
      m.listen(shell, 'keydown', event => { if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false, false); connectedFocus(toggle); } });
      nav.hidden = true; setInactive(nav, true);
      const artToggle = m.el('div', '☰ / × · one retained icon', 'position:absolute;left:14px;top:12px;color:' + accent + ';', study);
      const artBody = m.el('div', '当前内容 / Current content', panelCSS + 'position:absolute;top:50px;left:14px;right:14px;min-height:120px;', study);
      const artNav = m.el('div', null, panelCSS + 'position:absolute;left:14px;top:50px;width:42%;z-index:1;overflow:hidden;', study);
      const artDestinations = headings.map(name => m.el('div', name, 'padding:8px 0;border-bottom:1px solid #395a6b;', artNav));
      let width = 0;
      let lastProgress = 0;
      function render(progress) {
        lastProgress = progress;
        const t = m.reduced ? 1 : W.ease(W.phase(progress, .08, .78));
        artToggle.textContent = t < .5 ? '☰ · Closed study icon' : '× · Open study icon';
        artNav.style.opacity = String(t);
        artNav.style.transform = 'none'; artNav.style.clipPath = 'none';
        artBody.style.left = '14px';
        if (p.effect === 'sidebar') {
          artNav.style.width = Math.max(0, width * p.widthRatio * t) + 'px';
          artNav.style.clipPath = 'inset(0 0 0 ' + (100 * (1 - t)) + '%)';
          artBody.style.left = (14 + width * p.widthRatio * t + (t > 0 ? 12 : 0)) + 'px';
        } else {
          artNav.style.width = '42%';
          artNav.style.clipPath = 'inset(0 0 ' + (100 * (1 - t)) + '% 0)';
          artNav.style.transform = m.reduced ? 'none' : 'translateY(' + (-p.travelPx * (1 - t)) + 'px)';
        }
        artDestinations.forEach((el, index) => {
          const item = m.reduced ? 1 : p.effect === 'stagger-nav' ? W.ease(W.phase(progress, .1 + index * p.staggerMs / 1000, .63 + index * p.staggerMs / 1000)) : t;
          el.style.opacity = String(item);
          el.style.transform = !m.reduced && p.effect === 'stagger-nav' ? 'translateY(' + p.travelPx * (1 - item) + 'px)' : 'none';
        });
      }
      observeGeometry(m, [study, shell], () => { width = Math.max(0, study.getBoundingClientRect().width - 28); nav.hidden = !open; render(lastProgress); }, motion);
      status.textContent = 'Native menu=false · destination=' + headings[0];
      return m.finish(render);
    }
  };

  recipes['web.measured-tabs'] = {
    title: '真实页签与实测指示器 / Measured tab indicator',
    validate(p) {
      W.validate(p, { fromIndex: [0, 2], toIndex: [0, 2], durationMs: [80, 220] });
      integer(p.fromIndex, 'fromIndex'); integer(p.toIndex, 'toIndex');
      if (p.fromIndex === p.toIndex) throw new RangeError('tab study needs two distinct indices');
    },
    create(stage, p, options) {
      const { m, study, live, status } = setup(stage, 'web.measured-tabs', p, options);
      const motion = nativeMotion(m, p.durationMs);
      const names = ['概览 / Overview', '研究笔记 / Research', '已完成 / Ready'];
      const tablist = m.el('div', null, 'position:relative;display:flex;flex-wrap:wrap;gap:6px;padding-bottom:8px;', live);
      tablist.setAttribute('role', 'tablist'); tablist.setAttribute('aria-label', 'Local project tabs');
      const indicator = m.el('div', null, 'position:absolute;left:0;bottom:0;height:3px;background:' + accent + ';pointer-events:none;', tablist);
      indicator.setAttribute('aria-hidden', 'true');
      const tabs = [];
      const panels = [];
      let selected = p.fromIndex;
      names.forEach((name, index) => {
        const tab = button(m, name, tablist);
        tab.id = m.root.id + '-tab-' + index; tab.setAttribute('role', 'tab');
        const panel = m.el('section', null, panelCSS + 'margin-top:10px;', live);
        panel.id = m.root.id + '-tabpanel-' + index; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tab.id);
        panel.tabIndex = 0;
        m.el('h4', name, 'margin:0 0 8px;', panel);
        m.el('p', index === 0 ? 'Current overview is real readable content.' : index === 1 ? '研究笔记保持独立。时间线不会切换这个页签。' : 'The selected native tab owns the current content.', 'margin:0;', panel);
        tab.setAttribute('aria-controls', panel.id);
        tabs.push(tab); panels.push(panel);
      });
      function measureIndicator() {
        const rect = relativeRect(tabs[selected], tablist);
        indicator.style.left = rect.x + 'px'; indicator.style.top = (rect.y + rect.h + 3) + 'px';
        indicator.style.width = rect.w + 'px'; indicator.style.bottom = 'auto';
        return rect;
      }
      function select(index, focus) {
        const before = indicator.getBoundingClientRect();
        const beforeParent = tablist.getBoundingClientRect();
        motion.cancel(); selected = index;
        tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === selected)); tab.tabIndex = i === selected ? 0 : -1; panels[i].hidden = i !== selected; panels[i].inert = i !== selected; });
        const after = measureIndicator();
        if (before.width > 0) motion.play(indicator, [
          { left: (before.left - beforeParent.left) + 'px', top: (before.top - beforeParent.top) + 'px', width: before.width + 'px' },
          { left: after.x + 'px', top: (after.y + after.h + 3) + 'px', width: after.w + 'px' }
        ]);
        if (focus) connectedFocus(tabs[selected]);
        status.textContent = 'Native selected tab: ' + names[selected];
      }
      tabs.forEach((tab, index) => {
        m.listen(tab, 'click', () => select(index, false));
        m.listen(tab, 'keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
          select(next, true);
        });
      });
      const artList = m.el('div', null, 'position:relative;display:flex;flex-wrap:wrap;gap:6px;margin:16px;padding-bottom:8px;', study);
      const artTabs = names.map(name => m.el('div', name, buttonCSS + 'cursor:default;', artList));
      const artIndicator = m.el('div', null, 'position:absolute;height:3px;background:' + accent + ';', artList);
      m.el('p', 'Fixed underline geometry; native roving tabindex remains independent.', 'margin:16px;color:' + quiet + ';', study);
      let a = null;
      let b = null;
      let lastProgress = 0;
      function render(progress) {
        lastProgress = progress;
        if (!a || !b) { artIndicator.style.width = '0'; return; }
        const t = m.reduced ? 1 : W.ease(W.phase(progress, .12, .84));
        artIndicator.style.left = W.mix(a.x, b.x, t) + 'px';
        artIndicator.style.top = W.mix(a.y + a.h + 3, b.y + b.h + 3, t) + 'px';
        artIndicator.style.width = W.mix(a.w, b.w, t) + 'px';
        artTabs.forEach((tab, i) => { tab.style.borderColor = i === (t < .5 ? p.fromIndex : p.toIndex) ? accent : '#617d99'; });
      }
      tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === selected)); tab.tabIndex = i === selected ? 0 : -1; panels[i].hidden = i !== selected; panels[i].inert = i !== selected; });
      observeGeometry(m, [study, tablist], () => {
        measureIndicator();
        if (artList.getBoundingClientRect().width > 0) { a = relativeRect(artTabs[p.fromIndex], artList); b = relativeRect(artTabs[p.toIndex], artList); }
        else { a = null; b = null; }
        render(lastProgress);
      }, motion);
      status.textContent = 'Native selected tab: ' + names[selected];
      return m.finish(render);
    }
  };

  return { recipes };
}

function buildWebData(W) {
  'use strict';
  const recipes = {};
  const colors = ['#72dfce', '#ffcb75', '#a9a3ff', '#ff92ae', '#7abaff'];
  let controlSerial = 0;
  const controlCss = 'min-block-size:44px;padding:8px 12px;border:1px solid #728695;border-radius:8px;background:#172a38;color:#eff8ff;font:inherit;max-inline-size:100%;';
  const panelCss = 'padding:12px;border:1px solid #435c6e;border-radius:12px;background:#11222e;min-inline-size:0;';

  function add(key, title, schema, integers, setup) {
    const id = 'web.' + key;
    function validate(p) {
      W.validate(p, schema);
      integers.forEach(k => {
        if (!Number.isInteger(p[k])) throw new TypeError(id + ': ' + k + ' must be an integer');
      });
    }
    recipes[id] = {
      title, validate,
      create(stage, p, options) {
        validate(p);
        const m = W.mount(stage, id, options);
        m.root.style.cssText += ';display:grid;gap:12px;inline-size:100%;box-sizing:border-box;min-inline-size:0;color:#eff8ff;';
        const render = setup(m, p, Object.assign({ text:'研究 / Motion study', seed:1 }, options || {}));
        return m.finish(progress => {
          m.root.dataset.studyProgress = String(progress);
          render(progress);
        });
      }
    };
  }
  function note(m, text, parent) {
    return m.el('p', text, 'margin:0;font-size:13px;line-height:1.6;overflow-wrap:anywhere;color:#cfdeea;', parent);
  }
  function text(m, svg, x, y, value, color, size) {
    const el = m.svg('text', { x, y, fill:color || '#cfdeea', 'font-size':size || 12, 'font-family':'system-ui, sans-serif' }, svg);
    el.textContent = value;
    return el;
  }
  function plot(m, title, description) {
    const frame = m.el('section', null, panelCss);
    note(m, title + ' · fixed authored dataset / 固定样本', frame);
    const svg = m.svg('svg', { viewBox:'0 0 420 240', width:'100%', role:'img', 'aria-label':title }, frame);
    svg.style.cssText = 'display:block;inline-size:100%;max-inline-size:560px;block-size:auto;aspect-ratio:7 / 4;overflow:visible;margin-inline:auto;';
    note(m, description, frame);
    return svg;
  }
  function axes(m, svg, yTitle, xTitle) {
    m.svg('path', { d:'M46 28V200H396', fill:'none', stroke:'#8fa9bc', 'stroke-width':1.2 }, svg);
    text(m, svg, 8, 20, yTitle, '#cfdeea', 11);
    text(m, svg, 305, 226, xTitle, '#cfdeea', 11);
    text(m, svg, 26, 205, '0', '#cfdeea', 11);
  }
  function inspect(m, rows, activate) {
    const label = m.el('label', 'Inspect / 查看样本 ', 'display:grid;gap:6px;font-size:13px;');
    const select = m.el('select', null, controlCss, label);
    rows.forEach(row => m.el('option', row.label + ': ' + row.value, '', select));
    const output = m.el('p', '', 'margin:0;font-size:13px;line-height:1.6;overflow-wrap:anywhere;');
    output.setAttribute('role', 'status');
    output.setAttribute('aria-live', 'polite');
    let selected = 0;
    function commit() {
      output.textContent = rows[selected].label + ': ' + rows[selected].value;
      m.root.dataset.inspectIndex = String(selected);
      activate(selected);
    }
    m.listen(select, 'change', () => { selected = select.selectedIndex; commit(); });
    commit();
    return () => selected;
  }
  function polar(cx, cy, r, angle) {
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }
  function sector(cx, cy, r, start, end) {
    const a = polar(cx, cy, r, start), b = polar(cx, cy, r, end);
    return 'M' + cx + ' ' + cy + 'L' + a.join(' ') + 'A' + r + ' ' + r + ' 0 ' + (end - start > Math.PI ? 1 : 0) + ' 1 ' + b.join(' ') + 'Z';
  }
  function line(points) { return 'M' + points.map(point => point.join(' ')).join('L'); }
  function ribbon(x1, x2, y1, y2, width) {
    const half = width / 2, mid = (x1 + x2) / 2;
    return 'M' + x1 + ' ' + (y1 - half) + 'C' + mid + ' ' + (y1 - half) + ' ' + mid + ' ' + (y2 - half) + ' ' + x2 + ' ' + (y2 - half) + 'L' + x2 + ' ' + (y2 + half) + 'C' + mid + ' ' + (y2 + half) + ' ' + mid + ' ' + (y1 + half) + ' ' + x1 + ' ' + (y1 + half) + 'Z';
  }
  function normal(m, progress) { return m.reduced ? 1 : progress; }
  function digits(m, parent, count, width, height) {
    const wrap = m.el('div', null, 'display:flex;gap:3px;font:700 ' + Math.round(height * .72) + 'px/' + height + 'px ui-monospace,monospace;', parent);
    const reels = [];
    for (let i = 0; i < count; i++) {
      const slot = m.el('div', null, 'overflow:hidden;inline-size:' + width + 'px;block-size:' + height + 'px;border:1px solid #435c6e;border-radius:5px;', wrap);
      const reel = m.el('div', null, 'will-change:transform;', slot);
      for (let d = 0; d < 20; d++) m.el('div', String(d % 10), 'block-size:' + height + 'px;text-align:center;', reel);
      reels.push(reel);
    }
    wrap.setAttribute('aria-hidden', 'true');
    return (from, to, progress, stagger) => {
      const a = String(from).padStart(count, '0'), b = String(to).padStart(count, '0');
      reels.forEach((reel, i) => {
        const start = Number(a[i]), end = Number(b[i]);
        const travel = (end - start + 10) % 10;
        const t = W.ease(W.phase(progress, i * stagger, 1 - (count - i - 1) * stagger));
        reel.style.transform = 'translateY(' + (-height * (start + travel * t)) + 'px)';
      });
    };
  }
  function nativePanel(m, title) {
    const panel = m.el('section', null, panelCss);
    note(m, title + ' · local native state / 本地原生状态', panel);
    const status = m.el('p', '', 'margin:10px 0 0;font-size:14px;line-height:1.6;', panel);
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    return { panel, status };
  }
  function studyPanel(m, title) {
    const panel = m.el('section', null, panelCss);
    note(m, title + ' · seek-only study / 拖动时间轴只改示意', panel);
    const svg = m.svg('svg', { viewBox:'0 0 420 240', width:'100%', 'aria-hidden':'true' }, panel);
    svg.style.cssText = 'display:block;inline-size:100%;max-inline-size:560px;block-size:auto;aspect-ratio:7 / 4;margin-inline:auto;';
    const caption = note(m, '', panel);
    return { panel, svg, caption };
  }
  function loading(m, title) {
    const study = studyPanel(m, title);
    study.caption.textContent = 'Offline pending study; no request, download, audio or remote progress. / 离线等待示意，不连接任务。';
    return study;
  }

  add('data-budget-bloom', '径向预算 / Radial budget', { total:[40,400] }, [], (m, p) => {
    const shares = [.5,.3,.2], names = ['Build','Support','Research'];
    const svg = plot(m, 'Budget allocation', 'Build 50%, Support 30%, Research 20%; all slices sum to ' + p.total + ' units. Radius is a reveal, not another quantity.');
    const slices = shares.map((share, i) => m.svg('path', { fill:colors[i], stroke:'#11222e', 'stroke-width':2 }, svg));
    names.forEach((name, i) => text(m, svg, 244, 74 + i * 40, name + ': ' + (shares[i] * p.total).toFixed(1), colors[i], 13));
    inspect(m, names.map((name, i) => ({ label:name, value:(shares[i] * p.total).toFixed(1) + ' units (' + shares[i] * 100 + '%)' })), selected => slices.forEach((slice, i) => slice.setAttribute('stroke-width', i === selected ? 5 : 2)));
    return raw => {
      const r = Math.max(.01, 84 * W.ease(normal(m, raw)));
      let angle = -Math.PI / 2;
      slices.forEach((slice, i) => { const end = angle + Math.PI * 2 * shares[i]; slice.setAttribute('d', sector(133,120,r,angle,end)); angle = end; });
    };
  });

  add('data-calendar-density', '日历密度 / Calendar density', { peak:[4,24] }, ['peak'], (m, p) => {
    const values = Array.from({ length:28 }, (_, i) => Math.round(((i * 7 + Math.floor(i / 7) * 3) % 13) / 12 * p.peak));
    const svg = plot(m, 'Daily activity calendar', '28 days; intensity = count / ' + p.peak + '. Dates and counts remain readable when unrevealed.');
    const cells = values.map((value, i) => {
      const x = 28 + (i % 7) * 53, y = 35 + Math.floor(i / 7) * 43;
      const rect = m.svg('rect', { x,y,width:47,height:37,rx:4,fill:'#72dfce',stroke:'#8fa9bc','stroke-width':1 }, svg);
      text(m, svg, x + 4, y + 14, String(i + 1), '#06151b', 10);
      text(m, svg, x + 22, y + 29, String(value), '#06151b', 13);
      return rect;
    });
    text(m, svg, 28, 225, 'Mon → Sun · four authored weeks', '#cfdeea', 12);
    inspect(m, values.map((value, i) => ({ label:'Day ' + (i + 1), value:value + ' activities' })), selected => cells.forEach((cell,i) => cell.setAttribute('stroke', i === selected ? '#fff4ba' : '#8fa9bc')));
    return raw => {
      const t = normal(m,raw);
      cells.forEach((cell,i) => { const reveal = W.phase(t, i / 35, i / 35 + .2); cell.setAttribute('fill-opacity', .2 + .8 * (values[i] / p.peak) * reveal); });
    };
  });

  add('data-cluster-merge', '簇成员合并 / Cluster membership merge', { separation:[40,100] }, [], (m, p) => {
    const samples = [[-22,-20],[-12,13],[15,-7],[24,16],[-3,-27],[-28,28],[18,-29],[-20,0],[5,31],[28,-1],[-30,-14],[8,10]];
    const svg = plot(m, 'Two sample cohorts join', '12 records: A=6, B=6. Merge changes membership to AB=12 without duplicating or deleting points.');
    const hullA = m.svg('ellipse', { cy:115,rx:49,ry:58,fill:colors[0],'fill-opacity':.09,stroke:colors[0] }, svg);
    const hullB = m.svg('ellipse', { cy:115,rx:49,ry:58,fill:colors[2],'fill-opacity':.09,stroke:colors[2] }, svg);
    const merged = m.svg('ellipse', { cx:210,cy:115,rx:62,ry:68,fill:'#72dfce','fill-opacity':.08,stroke:'#fff4ba','stroke-dasharray':'4 3' }, svg);
    const points = samples.map((sample,i) => m.svg('circle', { r:5,fill:i < 6 ? colors[0] : colors[2],stroke:'#fff','stroke-width':1 }, svg));
    const membership = text(m,svg,135,219,'');
    inspect(m, samples.map((sample,i) => ({ label:'Record ' + (i+1), value:'origin ' + (i < 6 ? 'A' : 'B') + '; local coordinate ' + sample.join(', ') })), selected => points.forEach((point,i) => point.setAttribute('r', i === selected ? 8 : 5)));
    return raw => {
      const t = W.ease(normal(m,raw));
      hullA.setAttribute('cx', 210 - p.separation * (1-t)); hullB.setAttribute('cx', 210 + p.separation * (1-t));
      hullA.setAttribute('opacity',1-t); hullB.setAttribute('opacity',1-t); merged.setAttribute('opacity',t);
      points.forEach((point,i) => { point.setAttribute('cx',210 + (i < 6 ? -1 : 1) * p.separation * (1-t) + samples[i][0]); point.setAttribute('cy',115 + samples[i][1]); });
      membership.textContent = t < .99 ? 'A: 6 + B: 6 → combined cohort' : 'AB: 12 distinct records';
    };
  });

  add('data-confidence-band', '预测区间 / Forecast confidence band', { uncertainty:[8,26] }, [], (m,p) => {
    const forecast = [42,49,55,59,68,74], spread = forecast.map((_,i) => p.uncertainty * (i+1)/6);
    const svg = plot(m, 'Forecast and uncertainty', 'Midline is the forecast. Bounds widen with horizon; this illustrative interval has no statistical confidence claim.');
    axes(m,svg,'units','horizon');
    const band = m.svg('path', { fill:'#7abaff','fill-opacity':.2,stroke:'none' }, svg);
    const upper = m.svg('path', { fill:'none',stroke:'#7abaff','stroke-width':1,'stroke-dasharray':'4 3' }, svg);
    const lower = m.svg('path', { fill:'none',stroke:'#7abaff','stroke-width':1,'stroke-dasharray':'4 3' }, svg);
    const mid = m.svg('path', { fill:'none',stroke:'#72dfce','stroke-width':3 }, svg);
    const marker = m.svg('circle', { r:6,fill:'#fff4ba',stroke:'#11222e','stroke-width':2 }, svg);
    const xy = (value,i) => [52+i*66,200-value*1.65];
    inspect(m, forecast.map((value,i) => ({ label:'Horizon '+(i+1),value:value+' units; band '+(value-spread[i]).toFixed(1)+'–'+(value+spread[i]).toFixed(1) })), selected => { const point=xy(forecast[selected],selected); marker.setAttribute('cx',point[0]); marker.setAttribute('cy',point[1]); });
    mid.setAttribute('d',line(forecast.map(xy)));
    return raw => {
      const t = W.ease(normal(m,raw));
      const top = forecast.map((value,i)=>xy(value+spread[i]*t,i)), bottom=forecast.map((value,i)=>xy(value-spread[i]*t,i));
      upper.setAttribute('d',line(top)); lower.setAttribute('d',line(bottom)); band.setAttribute('d',line(top)+'L'+bottom.slice().reverse().map(point=>point.join(' ')).join('L')+'Z');
    };
  });

  add('data-delta-split', '对比分差 / Diverging comparison delta', { change:[8,35] }, [], (m,p) => {
    const baseline=[52,74,38], delta=[p.change,-p.change*.6,p.change*.4], names=['North','East','West'];
    const svg=plot(m,'Before / after comparison','Left shows actual baseline bars. Right is a separate zero-centred delta axis: positive right, negative left.');
    m.svg('path',{d:'M230 38V198',stroke:'#8fa9bc'},svg); text(m,svg,58,22,'Baseline',null,12); text(m,svg,250,22,'Change (units)',null,12);
    const bars=baseline.map((value,i)=>{ const y=48+i*51; m.svg('rect',{x:61,y,width:value*1.5,height:22,fill:colors[4]},svg); text(m,svg,10,y+16,names[i],null,11); text(m,svg,65,y+16,String(value),'#06151b',11); return m.svg('rect',{y,width:0,height:22,fill:delta[i]>0?colors[0]:colors[3]},svg); });
    const labels=delta.map((value,i)=>text(m,svg,305,64+i*51,''));
    inspect(m,names.map((name,i)=>({label:name,value:'baseline '+baseline[i]+', after '+(baseline[i]+delta[i]).toFixed(1)+', delta '+delta[i].toFixed(1)})),selected=>bars.forEach((bar,i)=>{bar.setAttribute('stroke',i===selected?'#fff4ba':'none');bar.setAttribute('stroke-width',3);}));
    return raw=>{const t=W.ease(normal(m,raw));bars.forEach((bar,i)=>{const amount=delta[i]*t*2;bar.setAttribute('x',230+Math.min(0,amount));bar.setAttribute('width',Math.abs(amount));labels[i].textContent=(delta[i]>=0?'+':'')+(delta[i]*t).toFixed(1);});};
  });

  add('data-event-domino', '事件前置链 / Prerequisite event sequence', { lag:[.1,.22] }, [], (m,p) => {
    const names=['Intake','Review','Approve','Ship'], units=[20,18,16,16];
    const svg=plot(m,'Ordered event ledger','The authored chain is Intake → Review → Approve → Ship; each later event waits for its predecessor in this study, not a proven causal model.');
    const connectors=names.slice(1).map((_,i)=>m.svg('path',{d:'M'+(94+i*96)+' 104H'+(118+i*96),stroke:'#8fa9bc','stroke-width':3,fill:'none'},svg));
    const cards=names.map((name,i)=>{const g=m.svg('g',{},svg);m.svg('rect',{x:28+i*96,y:72,width:67,height:64,rx:5,fill:'#203d4d',stroke:colors[i%5]},g);text(m,g,33+i*96,98,name,null,11);text(m,g,33+i*96,119,units[i]+' units',colors[i%5],11);return g;});
    inspect(m,names.map((name,i)=>({label:name,value:units[i]+' units; prerequisite '+(i?names[i-1]:'none')})),selected=>cards.forEach((card,i)=>card.setAttribute('opacity',i===selected?1:.78)));
    return raw=>{const t=normal(m,raw);cards.forEach((card,i)=>{const q=W.ease(W.phase(t,i*p.lag,i*p.lag+.24));card.setAttribute('transform','rotate('+(-16*(1-q))+' '+(28+i*96)+' 136)');});connectors.forEach((connector,i)=>connector.setAttribute('stroke',t>(i+1)*p.lag?colors[0]:'#8fa9bc'));};
  });

  add('data-goal-projection', '目标趋势投影 / Goal trend projection', { goal:[80,140] }, [], (m,p) => {
    const actual=[24,38,51,63], target=p.goal, forecast=[63,63+(target-63)*.42,target];
    const svg=plot(m,'Actual and projected goal','Solid observations end at period 4. Dashed curved projection reaches the authored target at period 6; not a prediction service.');
    axes(m,svg,'units','period 1 → 6');
    const y=value=>200-value*1.1;
    m.svg('path',{d:line(actual.map((value,i)=>[52+i*62,y(value)])),fill:'none',stroke:colors[0],'stroke-width':3},svg);
    const projection=m.svg('path',{d:'M238 '+y(63)+'Q300 '+y(target-5)+' 362 '+y(target),fill:'none',stroke:colors[1],'stroke-width':3,'stroke-dasharray':'6 4'},svg);
    m.svg('path',{d:'M46 '+y(target)+'H394',stroke:'#a9a3ff','stroke-dasharray':'3 4'},svg);text(m,svg,298,y(target)-8,'Goal '+target,colors[2],12);
    const dot=m.svg('circle',{r:5,fill:colors[1]},svg);
    inspect(m,actual.concat(forecast.slice(1)).map((value,i)=>({label:'Period '+(i+1),value:value.toFixed(1)+(i<4?' observed':' projected')})),selected=>{projection.setAttribute('stroke-width',selected>=4?5:3);});
    return raw=>{const t=W.ease(normal(m,raw));const x=(1-t)*(1-t)*238+2*(1-t)*t*300+t*t*362,cy=(1-t)*(1-t)*y(63)+2*(1-t)*t*y(target-5)+t*t*y(target);dot.setAttribute('cx',x);dot.setAttribute('cy',cy);projection.setAttribute('opacity',.25+.75*t);};
  });

  add('data-heatmap-focus', '热图邻域聚焦 / Heatmap neighbourhood focus', { gain:[.6,1.4] }, [], (m,p) => {
    const values=[2,4,6,3,1,2,6,9,7,3,1,3,8,6,2,0,2,4,3,1];
    const svg=plot(m,'Measured grid heatmap','5×4 fixed measurements. Fill encodes value×gain; expanding outline is a focus neighbourhood, never a change in measured values.');
    const cells=values.map((value,i)=>m.svg('rect',{x:61+(i%5)*58,y:28+Math.floor(i/5)*44,width:51,height:37,rx:3,fill:colors[0],'fill-opacity':W.clamp(value/9*p.gain,.08,1),stroke:'#435c6e'},svg));
    values.forEach((value,i)=>text(m,svg,82+(i%5)*58,52+Math.floor(i/5)*44,String(value),'#fff',12));
    const ring=m.svg('circle',{fill:'none',stroke:'#fff4ba','stroke-width':2},svg);
    let selected=7;
    const getSelected=inspect(m,values.map((value,i)=>({label:'Cell '+(i%5+1)+','+(Math.floor(i/5)+1),value:value+' measured units'})),index=>{selected=index;ring.setAttribute('cx',86.5+(index%5)*58);ring.setAttribute('cy',46.5+Math.floor(index/5)*44);cells.forEach((cell,i)=>cell.setAttribute('stroke',i===index?'#fff4ba':'#435c6e'));});
    return raw=>{const t=normal(m,raw);const focus=getSelected();ring.setAttribute('cx',86.5+(focus%5)*58);ring.setAttribute('cy',46.5+Math.floor(focus/5)*44);ring.setAttribute('r',m.reduced?22:W.mix(8,72,t));ring.setAttribute('opacity',m.reduced?1:1-.55*t);m.root.dataset.focusCell=String(selected);};
  });

  add('data-kpi-relay', '指标接力聚焦 / KPI spotlight relay', { target:[60,100] }, [], (m,p) => {
    const values=[62,81,74], names=['Quality','Delivery','Retention'];
    const svg=plot(m,'Three independent KPI cards','Values are fixed percentages. A spotlight relays across cards; it cannot change values or the native inspected card. Target='+p.target+'%.');
    const cards=values.map((value,i)=>{const group=m.svg('g',{},svg);m.svg('rect',{x:18+i*134,y:60,width:118,height:113,rx:8,fill:'#203d4d',stroke:'#435c6e'},group);text(m,group,29+i*134,82,names[i],null,12);text(m,group,29+i*134,117,value+'%',colors[i],24);m.svg('rect',{x:29+i*134,y:145,width:value*.95,height:9,rx:3,fill:colors[i]},group);m.svg('path',{d:'M'+(29+i*134+p.target*.95)+' 139V160',stroke:'#fff4ba'},group);return group;});
    const light=m.svg('rect',{y:53,width:126,height:127,rx:10,fill:'none',stroke:'#fff4ba','stroke-width':3},svg);
    inspect(m,names.map((name,i)=>({label:name,value:values[i]+'%; '+(values[i]>=p.target?'meets':'below')+' target'})),selected=>cards.forEach((card,i)=>card.setAttribute('opacity',i===selected?1:.8)));
    return raw=>{const t=normal(m,raw);const step=Math.min(2,Math.floor(t*3));light.setAttribute('x',14+step*134);};
  });

  add('data-milestone-gates', '里程碑跨门槛 / Milestone threshold crossing', { end:[70,100] }, [], (m,p) => {
    const gates=[25,50,75], svg=plot(m,'Completed progress and milestones','Fill is completed percentage. A milestone is reached only if the completed value is at or above its threshold. End='+p.end+'%.');
    m.svg('rect',{x:42,y:113,width:336,height:12,rx:6,fill:'#435c6e'},svg);
    const fill=m.svg('rect',{x:42,y:113,height:12,rx:6,fill:colors[0]},svg);
    const dots=gates.map((gate,i)=>{text(m,svg,31+gate*3.36,151,gate+'%',null,11);return m.svg('circle',{cx:42+gate*3.36,cy:119,r:9,stroke:'#fff4ba','stroke-width':2},svg);});
    const firefly=m.svg('circle',{r:6,fill:'#fff4ba'},svg), readout=text(m,svg,130,73,'',null,17);
    inspect(m,gates.map(gate=>({label:'Milestone '+gate+'%',value:p.end>=gate?'reached at final sample':'not reached at final sample'})),selected=>dots.forEach((dot,i)=>dot.setAttribute('stroke-width',i===selected?4:2)));
    return raw=>{const value=p.end*W.ease(normal(m,raw));fill.setAttribute('width',value*3.36);firefly.setAttribute('cx',42+value*3.36);firefly.setAttribute('cy',m.reduced?119:99-9*Math.sin(Math.PI*normal(m,raw)));dots.forEach((dot,i)=>dot.setAttribute('fill',value>=gates[i]?colors[0]:'#203d4d'));readout.textContent=value.toFixed(0)+'% completed in study';};
  });

  add('data-odometer-cascade', '多指标滚轮 / Metric odometer cascade', { increment:[10,90] }, ['increment'], (m,p) => {
    const starts=[124,258,376], ends=starts.map((value,i)=>value+p.increment*(i+1));
    const panel=m.el('section',null,panelCss), reels=[];
    note(m,'Three metric reels · fixed authored numeric update, not fetched counters.',panel);
    starts.forEach((value,i)=>{const row=m.el('div',null,'display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-block:10px;',panel);note(m,['Visits','Orders','Units'][i],row);reels.push(digits(m,row,3,25,34));});
    const accessible=note(m,'',panel);
    inspect(m,ends.map((value,i)=>({label:['Visits','Orders','Units'][i],value:starts[i]+' → '+value})),selected=>{panel.dataset.inspectedMetric=String(selected);});
    return raw=>{const t=normal(m,raw);reels.forEach((paint,i)=>paint(starts[i],ends[i],W.phase(t,i*.13,.72+i*.13),.08));accessible.textContent='Authored endpoints: Visits '+ends[0]+', Orders '+ends[1]+', Units '+ends[2]+'. Study '+Math.round(t*100)+'%.';};
  });

  add('data-queue-compression', 'FIFO队列压缩 / FIFO queue service', { served:[1,3] }, ['served'], (m,p) => {
    const jobs=['Q1','Q2','Q3','Q4','Q5','Q6'], svg=plot(m,'FIFO queue','Six jobs. The first '+p.served+' jobs move to the completed lane; remaining jobs compact in original FIFO order. Count is conserved.');
    text(m,svg,26,45,'Waiting lane',null,12);text(m,svg,26,156,'Completed lane',null,12);
    const cards=jobs.map((job,i)=>{const g=m.svg('g',{},svg);m.svg('rect',{x:0,y:0,width:46,height:42,rx:6,fill:i<p.served?colors[0]:colors[4]},g);text(m,g,9,26,job,'#06151b',13);return g;});
    const count=text(m,svg,250,214,'',null,12);
    inspect(m,jobs.map((job,i)=>({label:job,value:i<p.served?'served in authored sequence':'waiting, FIFO position '+(i-p.served+1)+' at endpoint'})),selected=>cards.forEach((card,i)=>{card.setAttribute('opacity',i===selected?1:.75);}));
    return raw=>{const t=W.ease(normal(m,raw));cards.forEach((card,i)=>{const start=28+i*61;const end=i<p.served?28+i*61:28+(i-p.served)*61;card.setAttribute('transform','translate('+W.mix(start,end,t)+' '+W.mix(65,i<p.served?164:65,t)+')');});count.textContent=t===1?'Waiting '+(6-p.served)+' + completed '+p.served+' = 6':'Six jobs retained during presentation';};
  });

  add('data-rank-ladder', '名次重排 / Value-driven rank reorder', { gain:[12,32] }, [], (m,p) => {
    const names=['A','B','C','D'], before=[80,67,59,48], after=[80,67,59+p.gain,48];
    const order=[0,1,2,3].sort((a,b)=>after[b]-after[a]||a-b), rank=names.map((_,i)=>order.indexOf(i));
    const svg=plot(m,'Ranked scores','C gains '+p.gain+' points. Endpoint vertical order is descending numeric value; stable index resolves ties. Bar lengths use the same score scale.');
    const cards=names.map((name,i)=>{const g=m.svg('g',{},svg);const bar=m.svg('rect',{x:72,y:0,height:26,rx:4,fill:colors[i]},g);const nameEl=text(m,g,28,18,name,null,12), valueEl=text(m,g,320,18,'',null,12);return {g,bar,nameEl,valueEl};});
    inspect(m,names.map((name,i)=>({label:'Team '+name,value:before[i]+' → '+after[i]+'; final rank '+(rank[i]+1)})),selected=>cards.forEach((card,i)=>card.g.setAttribute('opacity',i===selected?1:.78)));
    return raw=>{const t=W.ease(normal(m,raw));cards.forEach((card,i)=>{const score=W.mix(before[i],after[i],t);card.g.setAttribute('transform','translate(0 '+W.mix(40+i*42,40+rank[i]*42,t)+')');card.bar.setAttribute('width',score*2.4);card.valueEl.textContent=score.toFixed(1);});};
  });

  add('data-sankey-conservation', '守恒流量 / Conserved Sankey flow', { total:[40,120] }, [], (m,p) => {
    const scale=1.25, weights=[.4,.2,.1,.3].map(share=>share*p.total);
    const svg=plot(m,'Conserved allocation','Inputs A=60%, B=40%; outputs X=50%, Y=50%. Flows A→X=40%, A→Y=20%, B→X=10%, B→Y=30%; sums conserve '+p.total+' units.');
    const top=43, gap=25, a=p.total*.6*scale, b=p.total*.4*scale, out=p.total*.5*scale;
    m.svg('rect',{x:37,y:top,width:16,height:a,fill:colors[0]},svg);m.svg('rect',{x:37,y:top+a+gap,width:16,height:b,fill:colors[2]},svg);
    m.svg('rect',{x:367,y:top,width:16,height:out,fill:colors[4]},svg);m.svg('rect',{x:367,y:top+out+gap,width:16,height:out,fill:colors[1]},svg);
    text(m,svg,10,top-9,'A '+(p.total*.6).toFixed(0),null,11);text(m,svg,10,top+a+gap-7,'B '+(p.total*.4).toFixed(0),null,11);text(m,svg,330,top-9,'X '+(p.total*.5).toFixed(0),null,11);text(m,svg,330,top+out+gap-7,'Y '+(p.total*.5).toFixed(0),null,11);
    const widths=weights.map(value=>value*scale), left=[top+widths[0]/2,top+widths[0]+widths[1]/2,top+a+gap+widths[2]/2,top+a+gap+widths[2]+widths[3]/2];
    const right=[top+widths[0]/2,top+out+gap+widths[1]/2,top+widths[0]+widths[2]/2,top+out+gap+widths[1]+widths[3]/2];
    const flows=weights.map((_,i)=>m.svg('path',{d:ribbon(53,367,left[i],right[i],widths[i]),fill:colors[i<2?0:2],'fill-opacity':.52,stroke:'none'},svg));
    inspect(m,weights.map((value,i)=>({label:['A → X','A → Y','B → X','B → Y'][i],value:value.toFixed(1)+' units'})),selected=>flows.forEach((flow,i)=>flow.setAttribute('stroke',i===selected?'#fff4ba':'none')));
    return raw=>{const t=normal(m,raw);flows.forEach((flow,i)=>flow.setAttribute('fill-opacity',m.reduced?.65:.1+.55*W.phase(t,i*.12,i*.12+.55)));};
  });

  add('data-sentiment-spectrum', '情绪分布迁移 / Sentiment distribution shift', { shift:[5,20] }, [], (m,p) => {
    const before=[40,35,25], after=[40-p.shift,35,25+p.shift], names=['Negative','Neutral','Positive'];
    const svg=plot(m,'Sentiment share','Three shares always total 100%. '+p.shift+' percentage points transfer from negative to positive; neutral stays 35%.');
    const segments=names.map((_,i)=>m.svg('rect',{y:91,height:43,fill:[colors[3],colors[1],colors[0]][i]},svg));
    const labels=names.map((name,i)=>text(m,svg,24+i*132,184,name,colors[i],11));
    const values=names.map((_,i)=>text(m,svg,24+i*132,205,'',null,13));
    inspect(m,names.map((name,i)=>({label:name,value:before[i]+'% → '+after[i]+'%'})),selected=>segments.forEach((segment,i)=>segment.setAttribute('stroke',i===selected?'#fff4ba':'none')));
    return raw=>{const t=W.ease(normal(m,raw));let x=24;segments.forEach((segment,i)=>{const share=W.mix(before[i],after[i],t);segment.setAttribute('x',x);segment.setAttribute('width',share*3.72);x+=share*3.72;values[i].textContent=share.toFixed(1)+'%';labels[i].setAttribute('opacity',1);});};
  });

  add('data-signal-map', '信号位置与强度 / Signal map strength', { strength:[.6,1.4] }, [], (m,p) => {
    const nodes=[[84,94,12],[174,60,25],[240,146,18],[328,95,32]];
    const svg=plot(m,'Local sensor signals','Four authored locations; radius ∝ sqrt(signal×strength), so area encodes signal. Expanding rings indicate sampled events, not network packets.');
    m.svg('path',{d:'M28 61L90 25L145 55L236 31L354 56L390 143L332 193L228 174L139 203L58 167Z',fill:'#203d4d',stroke:'#435c6e'},svg);
    const rings=nodes.map(node=>m.svg('circle',{cx:node[0],cy:node[1],fill:'none',stroke:colors[0],'stroke-width':2},svg));
    const points=nodes.map((node,i)=>{text(m,svg,node[0]+12,node[1]+5,'S'+(i+1)+': '+node[2],null,11);return m.svg('circle',{cx:node[0],cy:node[1],r:Math.sqrt(node[2]*p.strength)*1.5,fill:colors[0],stroke:'#11222e','stroke-width':2},svg);});
    inspect(m,nodes.map((node,i)=>({label:'Sensor '+(i+1),value:node[2]+' signal units; coordinates '+node[0]+','+node[1]})),selected=>points.forEach((point,i)=>point.setAttribute('fill',i===selected?colors[1]:colors[0])));
    return raw=>{const t=normal(m,raw);rings.forEach((ring,i)=>{const q=W.phase(t,i*.1,.7+i*.1);ring.setAttribute('r',m.reduced?Math.sqrt(nodes[i][2]*p.strength)*1.5+3:8+q*26);ring.setAttribute('opacity',m.reduced?.6:1-q);});};
  });

  add('data-stacked-stream', '堆叠流图 / Conserved stream stack', { variation:[.5,1.5] }, [], (m,p) => {
    const baseline=[[14,22,18,30,25,34],[24,18,28,20,32,23],[18,26,22,31,20,27]];
    const svg=plot(m,'Three time-series stream layers','Each thickness is its series value. Shared boundaries prevent overlap/gaps. The changing sample uses a bounded multiplier, not unmeasured breathing decoration.');
    axes(m,svg,'stacked units','time 1 → 6');
    const areas=baseline.map((_,i)=>m.svg('path',{fill:colors[i],'fill-opacity':.72,stroke:'#11222e','stroke-width':1},svg));
    const total=text(m,svg,67,20,'',null,11);
    inspect(m,baseline.map((values,i)=>({label:'Series '+String.fromCharCode(65+i),value:'base samples '+values.join(', ')})),selected=>areas.forEach((area,i)=>area.setAttribute('fill-opacity',i===selected?.95:.65)));
    return raw=>{const t=normal(m,raw), mult=1+(p.variation-1)*W.ease(t), lower=[0,0,0,0,0,0];areas.forEach((area,i)=>{const upper=lower.map((value,j)=>value+baseline[i][j]*mult);const bottom=lower.map((value,j)=>[52+j*66,200-value*1.5]);const top=upper.map((value,j)=>[52+j*66,200-value*1.5]);area.setAttribute('d',line(top)+'L'+bottom.slice().reverse().map(point=>point.join(' ')).join('L')+'Z');upper.forEach((value,j)=>{lower[j]=value;});});total.textContent='Final time total: '+lower[5].toFixed(1)+' units';};
  });

  add('data-threshold-crossing', '阈值越界告警 / Threshold crossing', { threshold:[50,72] }, [], (m,p) => {
    const samples=[35,44,59,82,74,63], svg=plot(m,'Measured threshold events','Samples are fixed. Amber identifies values at/above '+p.threshold+'; the study cursor evaluates the sampled value, not an external alarm. No flashing.');
    axes(m,svg,'units','sample 1 → 6');
    const y=value=>200-value*1.8;
    m.svg('path',{d:line(samples.map((value,i)=>[52+i*66,y(value)])),fill:'none',stroke:colors[4],'stroke-width':2},svg);
    m.svg('path',{d:'M46 '+y(p.threshold)+'H396',stroke:colors[1],'stroke-dasharray':'5 4'},svg);text(m,svg,275,y(p.threshold)-8,'Threshold '+p.threshold,colors[1],11);
    const points=samples.map((value,i)=>m.svg('circle',{cx:52+i*66,cy:y(value),r:5,fill:value>=p.threshold?colors[1]:colors[0]},svg));
    const cursor=m.svg('path',{stroke:'#fff4ba','stroke-width':2,fill:'none'},svg), report=text(m,svg,54,22,'',null,12);
    inspect(m,samples.map((value,i)=>({label:'Sample '+(i+1),value:value+' units · '+(value>=p.threshold?'above threshold':'below threshold')})),selected=>points.forEach((point,i)=>point.setAttribute('r',i===selected?8:5)));
    return raw=>{const i=Math.min(5,Math.floor(normal(m,raw)*6));const x=52+i*66;cursor.setAttribute('d','M'+x+' 30V200');report.textContent='Study sample '+(i+1)+': '+samples[i]+' · '+(samples[i]>=p.threshold?'threshold exceeded':'within threshold');};
  });

  add('data-timeline-trail', '时间轴数据拖读 / Time-series scrub trail', { window:[2,5] }, ['window'], (m,p) => {
    const values=[12,18,14,28,32,24,36,40], svg=plot(m,'Scrubbable timeline','A native range selects a sample and its preceding '+p.window+'-sample trail. Gallery progress has a separate dashed study cursor and never writes the range.');
    axes(m,svg,'units','time 1 → 8');
    const coords=values.map((value,i)=>[52+i*47,200-value*3.6]);
    m.svg('path',{d:line(coords),fill:'none',stroke:'#435c6e','stroke-width':2},svg);
    const trail=m.svg('path',{fill:'none',stroke:colors[0],'stroke-width':4},svg), point=m.svg('circle',{r:6,fill:colors[1]},svg), study=m.svg('path',{stroke:'#fff4ba','stroke-dasharray':'4 4'},svg);
    const label=m.el('label','Native time sample / 原生样本 ', 'display:grid;gap:6px;');
    const range=m.el('input',null,'inline-size:100%;min-block-size:44px;accent-color:#72dfce;',label);range.type='range';range.min='0';range.max='7';range.step='1';range.value='0';
    const status=m.el('p','', 'margin:0;font-size:14px;');status.setAttribute('role','status');let selected=0;
    function selectSample(){selected=Number(range.value);const subset=coords.slice(Math.max(0,selected-p.window+1),selected+1);trail.setAttribute('d',line(subset));point.setAttribute('cx',coords[selected][0]);point.setAttribute('cy',coords[selected][1]);status.textContent='Native sample '+(selected+1)+': '+values[selected]+' units';m.root.dataset.nativeSample=String(selected);}
    m.listen(range,'input',selectSample);selectSample();
    return raw=>{const t=normal(m,raw), x=52+329*t;study.setAttribute('d','M'+x+' 30V200');};
  });

  add('data-network-topology', '显式邻接网络 / Explicit adjacency network', { radius:[65,92] }, [], (m,p) => {
    const names=['Hub','A','B','C','D','E'], links=[[0,1],[0,2],[0,3],[0,4],[0,5],[1,2],[2,3],[4,5]];
    const final=names.map((_,i)=>i===0?[210,119]:polar(210,119,p.radius,-Math.PI/2+(i-1)*Math.PI*2/5));
    const svg=plot(m,'Network topology','Six vertices and eight actual adjacency edges. Hub degree=5. Extra links A–B, B–C and D–E; lines are relationships, not decorative wires.');
    const edges=links.map(()=>m.svg('path',{fill:'none',stroke:'#728695','stroke-width':2},svg));
    const nodes=names.map((name,i)=>{const g=m.svg('g',{},svg);m.svg('circle',{r:i===0?14:10,fill:i===0?colors[1]:colors[0],stroke:'#11222e','stroke-width':2},g);text(m,g,16,5,name,null,12);return g;});
    const selected=inspect(m,names.map((name,i)=>({label:name,value:'degree '+links.filter(edge=>edge.includes(i)).length+'; neighbours '+links.filter(edge=>edge.includes(i)).map(edge=>names[edge[0]===i?edge[1]:edge[0]]).join(', ')})),index=>edges.forEach((edge,i)=>edge.setAttribute('stroke',links[i].includes(index)?'#fff4ba':'#728695')));
    return raw=>{const t=W.ease(normal(m,raw)), positions=final.map(point=>[W.mix(210,point[0],t),W.mix(119,point[1],t)]);nodes.forEach((node,i)=>node.setAttribute('transform','translate('+positions[i].join(' ')+')'));edges.forEach((edge,i)=>edge.setAttribute('d',line([positions[links[i][0]],positions[links[i][1]]])));m.root.dataset.networkVertex=String(selected());};
  });

  add('data-map-pins', '有坐标的地图点 / Coordinate map pins', { drop:[25,70] }, [], (m,p) => {
    const sites=[{name:'North',x:102,y:75,value:32},{name:'Centre',x:209,y:119,value:47},{name:'South',x:312,y:161,value:26}];
    const svg=plot(m,'Authored local map locations','Three fixed map positions with counts. Pins land on their exact coordinates; this is not a geographic map service or geolocation.');
    m.svg('path',{d:'M29 50L110 31L183 55L259 28L387 77L352 205L239 186L137 210L47 153Z',fill:'#203d4d',stroke:'#728695'},svg);
    const pins=sites.map((site,i)=>{m.svg('circle',{cx:site.x,cy:site.y,r:3,fill:'#fff4ba'},svg);const g=m.svg('g',{},svg);m.svg('path',{d:'M0 0C-24-23-17-42 0-42C17-42 24-23 0 0Z',fill:colors[i],stroke:'#11222e','stroke-width':2},g);text(m,g,-9,-22,String(site.value),'#06151b',11);return g;});
    inspect(m,sites.map(site=>({label:site.name,value:site.value+' records at ('+site.x+', '+site.y+')'})),selected=>pins.forEach((pin,i)=>pin.setAttribute('opacity',i===selected?1:.72)));
    return raw=>{const t=normal(m,raw);pins.forEach((pin,i)=>{const q=W.phase(t,i*.16,.65+i*.16);const bounce=m.reduced?0:p.drop*(1-q)-Math.sin(q*Math.PI*2)*8*(1-q);pin.setAttribute('transform','translate('+sites[i].x+' '+(sites[i].y-bounce)+')');});};
  });

  add('data-scatter-relation', '二维散点关系 / Bivariate scatter reveal', { slope:[.5,1.2] }, [], (m,p) => {
    const xs=[12,22,31,43,53,61,73,82,91], noise=[5,-7,2,8,-5,4,-4,6,-3], ys=xs.map((x,i)=>x*p.slope+noise[i]);
    const svg=plot(m,'Measured sample relation','x is input units; y = authored slope×x + fixed residual. Both axes are numeric; point reveal never invents extra observations.');
    axes(m,svg,'y units','x units 0 → 100');
    [25,50,75,100].forEach(value=>text(m,svg,40+value*3.4,216,String(value),null,10));
    const points=xs.map((x,i)=>m.svg('circle',{cx:46+x*3.4,cy:200-ys[i]*1.35,r:5,fill:colors[0],stroke:'#fff','stroke-width':1},svg));
    m.svg('path',{d:line([[46,200],[386,200-100*p.slope*1.35]]),fill:'none',stroke:colors[1],'stroke-dasharray':'4 4'},svg);
    inspect(m,xs.map((x,i)=>({label:'Record '+(i+1),value:'x='+x+', y='+ys[i].toFixed(1)+', residual='+noise[i]})),selected=>points.forEach((point,i)=>point.setAttribute('stroke-width',i===selected?4:1)));
    return raw=>{const t=normal(m,raw);points.forEach((point,i)=>{const q=W.ease(W.phase(t,i*.06,.48+i*.06));point.setAttribute('r',Math.max(.1,5*q));point.setAttribute('opacity',q);});};
  });

  add('data-stat-comparison', '统计卡差值 / Stat card numeric comparison', { value:[60,240] }, [], (m,p) => {
    const baseline=p.value*.8, panel=m.el('section',null,panelCss);
    note(m,'Stat card · fixed current value against explicit baseline',panel);
    const value=m.el('output','', 'font:700 44px/1.3 ui-monospace,monospace;display:block;color:#72dfce;',panel);
    const delta=note(m,'',panel);
    inspect(m,[{label:'Current',value:p.value.toFixed(1)+' units'},{label:'Baseline',value:baseline.toFixed(1)+' units'},{label:'Difference',value:(p.value-baseline).toFixed(1)+' units (+25% vs baseline)'}],selected=>{panel.dataset.statField=String(selected);});
    return raw=>{const t=W.ease(normal(m,raw)), shown=W.mix(baseline,p.value,t);value.textContent=shown.toFixed(1)+' units';delta.textContent='Baseline '+baseline.toFixed(1)+'; presented delta +'+(shown-baseline).toFixed(1)+' units. Actual endpoint '+p.value.toFixed(1)+'.';};
  });

  add('loading-bouncing-dots', '弹跳等待点 / Bouncing pending dots', { bounce:[12,38] }, [], (m,p) => {
    const {svg}=loading(m,'Bouncing dots'), dots=[0,1,2].map(i=>m.svg('circle',{cx:160+i*50,r:9,fill:colors[0]},svg));
    return raw=>{dots.forEach((dot,i)=>dot.setAttribute('cy',m.reduced?120:120-p.bounce*Math.pow(Math.max(0,Math.sin(raw*Math.PI*2-i*.8)),2)));};
  });

  add('loading-equalizer-bars', '高度节奏等待 / Pending equalizer bars', { height:[35,75] }, [], (m,p) => {
    const {svg}=loading(m,'Equalizer geometry (not audio)'), bars=Array.from({length:5},(_,i)=>m.svg('rect',{x:141+i*29,width:18,rx:4,fill:colors[i]},svg));
    return raw=>{bars.forEach((bar,i)=>{const height=m.reduced?32:p.height*(.25+.75*Math.pow(Math.sin(raw*Math.PI*2+i*.7),2));bar.setAttribute('height',height);bar.setAttribute('y',153-height);});};
  });

  add('loading-gradient-arc', '多段渐变弧 / Segmented gradient arc', { sweep:[180,320] }, [], (m,p) => {
    const {svg}=loading(m,'Gradient arc'), group=m.svg('g',{},svg);
    for(let i=0;i<12;i++){const start=(-90+p.sweep*i/12)*Math.PI/180,end=(-90+p.sweep*(i+1)/12)*Math.PI/180;const a=polar(210,120,44,start),b=polar(210,120,44,end);m.svg('path',{d:'M'+a.join(' ')+'A44 44 0 0 1 '+b.join(' '),fill:'none',stroke:colors[Math.min(4,Math.floor(i/3))],'stroke-width':8},group);}
    text(m,svg,185,124,'pending',null,11);
    return raw=>{group.setAttribute('transform','rotate('+(m.reduced?0:raw*360)+' 210 120)');};
  });

  add('loading-orbit-trail', '轨道尾迹等待 / Orbital pending trail', { radius:[28,64] }, [], (m,p) => {
    const {svg}=loading(m,'Orbital trail');m.svg('circle',{cx:210,cy:120,r:p.radius,fill:'none',stroke:'#435c6e'},svg);m.svg('circle',{cx:210,cy:120,r:7,fill:colors[1]},svg);
    const trail=Array.from({length:8},(_,i)=>m.svg('circle',{r:8-i*.65,fill:colors[0],'fill-opacity':1-i*.11},svg));
    return raw=>{trail.forEach((dot,i)=>{const angle=(m.reduced?0:raw*Math.PI*2)-i*.17;const xy=polar(210,120,p.radius,angle);dot.setAttribute('cx',xy[0]);dot.setAttribute('cy',xy[1]);});};
  });

  add('loading-progress-success', '进度收束成勾 / Authored progress-to-check', { completeAt:[.6,.85] }, [], (m,p) => {
    const {svg,caption}=loading(m,'Determinate progress → success study');
    const circle=m.svg('circle',{cx:210,cy:115,r:48,fill:'none',stroke:'#435c6e','stroke-width':8},svg);
    const arc=m.svg('circle',{cx:210,cy:115,r:48,fill:'none',stroke:colors[0],'stroke-width':8,transform:'rotate(-90 210 115)',pathLength:100,'stroke-dasharray':'100 100'},svg);
    const check=m.svg('path',{d:'M186 116L204 134L237 96',fill:'none',stroke:colors[0],'stroke-width':8,'stroke-linecap':'round','stroke-linejoin':'round',pathLength:100,'stroke-dasharray':'100 100'},svg);
    const percent=text(m,svg,194,120,'',null,14);
    svg.removeAttribute('aria-hidden');svg.setAttribute('role','progressbar');svg.setAttribute('aria-label','Authored study progress, not a real operation');svg.setAttribute('aria-valuemin','0');svg.setAttribute('aria-valuemax','100');
    return raw=>{const t=normal(m,raw), amount=W.phase(t,0,p.completeAt), q=W.phase(t,p.completeAt,1);arc.setAttribute('stroke-dashoffset',100-amount*100);arc.setAttribute('opacity',1-q);circle.setAttribute('opacity',1-q);percent.textContent=q>0?'':Math.floor(amount*100)+'%';check.setAttribute('stroke-dashoffset',100-100*W.ease(q));check.setAttribute('opacity',q>0?1:0);svg.setAttribute('aria-valuenow',String(Math.floor(amount*100)));caption.textContent=q===1?'Authored sequence complete; no work was executed. / 示意已完成，不代表任务完成。':'Study progress '+Math.floor(amount*100)+'%; no underlying operation.';};
  });

  add('loading-skeleton-shimmer', '结构占位换内容 / Skeleton shimmer to sample content', { rows:[3,5] }, ['rows'], (m,p,options) => {
    const panel=m.el('section',null,panelCss);note(m,'Skeleton geometry → authored sample, not downloaded content',panel);
    const card=m.el('div',null,'position:relative;overflow:hidden;padding:18px;border:1px solid #435c6e;border-radius:10px;min-block-size:140px;',panel);
    const skeleton=m.el('div',null,'display:grid;gap:12px;',card);
    m.el('div',null,'inline-size:48px;block-size:48px;background:#435c6e;border-radius:50%;',skeleton);
    for(let i=0;i<p.rows;i++)m.el('div',null,'block-size:13px;inline-size:'+(i===p.rows-1?'57%':'90%')+';background:#435c6e;border-radius:4px;',skeleton);
    const shimmer=m.el('div',null,'position:absolute;inset-block:0;inline-size:35%;pointer-events:none;background:linear-gradient(90deg,transparent,#c7e9ff55,transparent);',card);
    const content=m.el('div',null,'position:absolute;inset:18px;display:grid;align-content:start;gap:10px;',card);
    m.el('strong',options.text,'font-size:18px;overflow-wrap:anywhere;',content);note(m,'Sample profile · 3 notes · last updated locally',content);note(m,'All DOM is created once. Placeholder reserves the content geometry.',content);
    const caption=note(m,'',panel);
    return raw=>{const t=normal(m,raw), reveal=W.phase(t,.72,.96);skeleton.style.opacity=String(1-reveal);skeleton.setAttribute('aria-hidden',reveal===1?'true':'false');shimmer.style.insetInlineStart=(W.mix(-35,110,W.phase(t,0,.7)))+'%';shimmer.style.opacity=m.reduced?'0':String(1-reveal);content.style.opacity=String(reveal);content.setAttribute('aria-hidden',reveal===0?'true':'false');caption.textContent=reveal===1?'Static authored sample content; no fetch.':'Authored placeholder phase; unknown real loading state.';};
  });

  add('loading-typing-indicator', '输入状态省略号 / Typing status ellipsis', { beats:[1,4] }, ['beats'], (m,p) => {
    const {svg,caption}=loading(m,'Typing indicator');m.svg('rect',{x:139,y:82,width:142,height:78,rx:24,fill:'#203d4d',stroke:'#728695'},svg);
    const dots=[0,1,2].map(i=>m.svg('circle',{cx:179+i*31,cy:119,r:7,fill:colors[0]},svg));
    text(m,svg,149,187,'Composing sample…',null,12);
    return raw=>{dots.forEach((dot,i)=>dot.setAttribute('fill-opacity',m.reduced?.75:.25+.75*Math.pow(Math.max(0,Math.cos(raw*Math.PI*2*p.beats-i*.9)),2)));caption.textContent='Pending composing indicator only; it never sends a message.';};
  });

  add('loading-indeterminate-bar', '无百分比等待条 / Indeterminate travel bar', { segment:[.18,.4] }, [], (m,p) => {
    const {svg}=loading(m,'Indeterminate bar');m.svg('rect',{x:58,y:107,width:304,height:22,rx:8,fill:'#435c6e'},svg);
    const bar=m.svg('rect',{y:111,height:14,rx:5,fill:colors[0]},svg);
    return raw=>{const width=304*p.segment*(m.reduced?1:.65+.35*Math.sin(Math.PI*raw));bar.setAttribute('width',width);bar.setAttribute('x',m.reduced?58+(304-width)/2:58+(304-width)*W.ease(raw));};
  });

  add('loading-pulse-ring', '扩径等待圈 / Expanding pending ring', { radius:[30,72] }, [], (m,p) => {
    const {svg}=loading(m,'Pulse ring');const ring=m.svg('circle',{cx:210,cy:120,fill:'none',stroke:colors[0],'stroke-width':3},svg);m.svg('circle',{cx:210,cy:120,r:9,fill:colors[0]},svg);
    return raw=>{ring.setAttribute('r',m.reduced?p.radius*.65:10+(p.radius-10)*W.ease(raw));ring.setAttribute('opacity',m.reduced?.8:1-raw*.85);};
  });

  add('loading-square-morph', '方块角形变 / Morphing square corners', { size:[18,34] }, [], (m,p) => {
    const {svg}=loading(m,'Square morph');const blocks=Array.from({length:4},(_,i)=>m.svg('rect',{width:p.size,height:p.size,fill:colors[i]},svg));
    return raw=>{blocks.forEach((block,i)=>{const phase=m.reduced?0:Math.sin(raw*Math.PI*2+i*Math.PI/2),angle=m.reduced?0:raw*180;const x=210+(i%2?1:-1)*(28+8*phase),y=120+(i<2?-1:1)*(28-8*phase);block.setAttribute('x',x-p.size/2);block.setAttribute('y',y-p.size/2);block.setAttribute('rx',m.reduced?3:p.size*.45*(.5+.5*phase));block.setAttribute('transform','rotate('+angle+' '+x+' '+y+')');});};
  });

  add('feedback-clap-counter', '拍手提交计数 / Committed clap counter', { initial:[0,100], step:[1,5] }, ['initial','step'], (m,p) => {
    const native=nativePanel(m,'Clap count'), button=m.el('button','Clap +'+p.step,controlCss,native.panel);button.type='button';let count=p.initial;
    function report(){native.status.textContent='Local claps: '+count+'. Seeking never adds a clap.';m.root.dataset.nativeCount=String(count);}
    m.listen(button,'click',()=>{count+=p.step;report();});report();
    const {svg,caption}=studyPanel(m,'One illustrative clap'), rays=Array.from({length:8},()=>m.svg('path',{stroke:colors[1],'stroke-width':3},svg)), value=text(m,svg,174,130,'',colors[0],28);
    return raw=>{const t=normal(m,raw), q=W.phase(t,.15,.65);value.textContent=String(p.initial+(q>.5?p.step:0));rays.forEach((ray,i)=>{const a=polar(210,115,m.reduced?40:30+q*22,i*Math.PI/4),b=polar(210,115,m.reduced?47:40+q*22,i*Math.PI/4);ray.setAttribute('d',line([a,b]));ray.setAttribute('opacity',m.reduced?0:Math.sin(q*Math.PI));});caption.textContent='Study endpoint '+(p.initial+p.step)+'; native total remains '+count+'.';};
  });

  add('feedback-heart-burst', '喜欢切换与心形爆散 / Like toggle and heart burst', { initial:['off','on'], petals:[4,12] }, ['petals'], (m,p) => {
    const native=nativePanel(m,'Like state'), button=m.el('button','',controlCss,native.panel);button.type='button';let liked=p.initial==='on';
    function report(){button.textContent=liked?'Unlike / 取消喜欢':'Like / 喜欢';button.setAttribute('aria-pressed',String(liked));native.status.textContent=liked?'Local like committed.':'Local like is off.';m.root.dataset.nativeLiked=String(liked);}
    m.listen(button,'click',()=>{liked=!liked;report();});report();
    const {svg,caption}=studyPanel(m,'One decorative like burst');
    const heartPath='M0 8C-27-11-30-27-16-34C-5-40 0-30 0-26C0-30 5-40 16-34C30-27 27-11 0 8Z';
    m.svg('path',{d:heartPath,fill:colors[3],transform:'translate(210 131) scale(1.3)'},svg);
    const petals=Array.from({length:p.petals},()=>m.svg('path',{d:heartPath,fill:colors[3]},svg));
    return raw=>{const t=normal(m,raw), q=W.phase(t,.12,.9);petals.forEach((petal,i)=>{const angle=i*Math.PI*2/p.petals,xy=polar(210,120,22+q*67,angle);petal.setAttribute('transform','translate('+xy.join(' ')+') scale(.23) rotate('+(angle*180/Math.PI+90)+')');petal.setAttribute('opacity',m.reduced?0:Math.sin(q*Math.PI));});caption.textContent='Decorative study only; current native like '+(liked?'on':'off')+'.';};
  });

  add('feedback-emoji-choice', '表情选择提交 / Committed emoji choice', { choice:['calm','happy','surprised'] }, [], (m,p) => {
    const choices=['calm','happy','surprised'], marks=['○','☺','!'], native=nativePanel(m,'Reaction selection'), group=m.el('fieldset',null,'border:0;padding:0;display:flex;gap:8px;flex-wrap:wrap;',native.panel);
    m.el('legend','Choose a local reaction / 选择本地反应','font-size:13px;margin-block:8px;',group);const name='reaction-'+(++controlSerial);let chosen=null;
    choices.forEach((choice,i)=>{const label=m.el('label',null,controlCss+'display:flex;gap:8px;align-items:center;',group),input=m.el('input',null,'accent-color:#72dfce;',label);input.type='radio';input.name=name;input.value=choice;m.el('span',marks[i]+' '+choice,'',label);m.listen(input,'change',()=>{if(input.checked){chosen=choice;native.status.textContent='Local reaction: '+choice;m.root.dataset.nativeReaction=choice;}});});
    native.status.textContent='No local reaction selected.';
    const {svg,caption}=studyPanel(m,'Emoji bar spotlight'), target=choices.indexOf(p.choice);
    const cards=choices.map((choice,i)=>{const g=m.svg('g',{},svg);m.svg('rect',{x:-40,y:-39,width:80,height:78,rx:12,fill:'#203d4d',stroke:colors[i]},g);text(m,g,-12,5,marks[i],colors[i],30);text(m,g,-33,29,choice,null,10);return g;});
    return raw=>{const t=normal(m,raw), q=W.ease(W.phase(t,.1,.7));cards.forEach((card,i)=>card.setAttribute('transform','translate('+(90+i*120)+' 118) scale('+(i===target?1+q*.2:1-q*.06)+')'));caption.textContent='Authored spotlight '+p.choice+'; native selection '+(chosen||'none')+'.';};
  });

  add('feedback-number-ticker', '整数提交与滚轮 / Integer commit and digit ticker', { initial:[0,9000], increment:[1,99] }, ['initial','increment'], (m,p) => {
    const native=nativePanel(m,'Numeric value'), button=m.el('button','Add '+p.increment+' locally',controlCss,native.panel);button.type='button';let count=p.initial;
    const output=m.el('output','', 'display:block;font:700 30px/1.4 ui-monospace,monospace;color:#72dfce;',native.panel);
    function report(){output.textContent=String(count);native.status.textContent='Native value '+count+'; every deliberate press commits once.';m.root.dataset.nativeCount=String(count);}
    m.listen(button,'click',()=>{count+=p.increment;report();});report();
    const panel=m.el('section',null,panelCss);note(m,'Four digit columns · authored one-step tick / 示意滚轮',panel);const paint=digits(m,panel,4,30,42),caption=note(m,'',panel);
    return raw=>{paint(p.initial,p.initial+p.increment,normal(m,raw),.035);caption.textContent='Study '+p.initial+' → '+(p.initial+p.increment)+'; native '+count+'.';};
  });

  add('feedback-star-rating', '评分原生提交 / Native star rating', { initial:[0,5], rating:[1,5] }, ['initial','rating'], (m,p) => {
    const native=nativePanel(m,'Rating'), group=m.el('fieldset',null,'border:0;padding:0;display:flex;gap:7px;flex-wrap:wrap;',native.panel);m.el('legend','Rate 1–5 / 评分','font-size:13px;margin-block:8px;',group);const name='rating-'+(++controlSerial);let rating=p.initial;
    for(let i=1;i<=5;i++){const label=m.el('label',null,controlCss+'display:flex;gap:5px;align-items:center;',group),input=m.el('input',null,'accent-color:#ffcb75;',label);input.type='radio';input.name=name;input.value=String(i);input.checked=i===rating;m.el('span',i+' ★','',label);m.listen(input,'change',()=>{if(input.checked){rating=i;native.status.textContent='Local rating '+rating+' of 5.';m.root.dataset.nativeRating=String(rating);}});}
    native.status.textContent=rating?'Initial local rating '+rating+' of 5.':'No local rating yet.';m.root.dataset.nativeRating=String(rating);
    const {svg,caption}=studyPanel(m,'Star fill sequence');
    const stars=Array.from({length:5},(_,i)=>{const coords=Array.from({length:10},(_,j)=>polar(58+i*76,119,j%2?11:24,-Math.PI/2+j*Math.PI/5));return m.svg('path',{d:line(coords)+'Z',stroke:colors[1],'stroke-width':2},svg);});
    return raw=>{const t=normal(m,raw);stars.forEach((star,i)=>{const threshold=(i+1)/6;const lit=i<p.rating&&t>=threshold;star.setAttribute('fill',lit?colors[1]:'#203d4d');});caption.textContent='Authored target '+p.rating+' stars; native rating '+(rating||'none')+'.';};
  });

  add('feedback-confetti-rain', '本地确认与纸片雨 / Local acknowledgement and confetti', { pieces:[8,24], spread:[70,170] }, ['pieces'], (m,p,options) => {
    const native=nativePanel(m,'Completion acknowledgement'), button=m.el('button','Acknowledge locally / 本地确认',controlCss,native.panel);button.type='button';let acknowledgements=0;
    function report(){native.status.textContent='Local acknowledgements: '+acknowledgements+'. No purchase, reward or remote operation.';m.root.dataset.nativeAcknowledgements=String(acknowledgements);}
    m.listen(button,'click',()=>{acknowledgements+=1;report();});report();
    const {svg,caption}=studyPanel(m,'Single authored paper rain');
    const pieces=Array.from({length:p.pieces},(_,i)=>m.svg('rect',{width:6+i%3,height:10,fill:colors[i%5]},svg));
    const seed=Number.isFinite(options.seed)?options.seed:0;
    return raw=>{const t=normal(m,raw);pieces.forEach((piece,i)=>{const q=W.phase(t,(i%6)*.035,.8+(i%6)*.035);const phase=i*2.399+seed*.01,x=210+Math.sin(phase)*p.spread+Math.sin(q*Math.PI*2+phase)*8,y=-14+q*250;piece.setAttribute('transform','translate('+x+' '+y+') rotate('+(i*37+q*240)+')');piece.setAttribute('opacity',m.reduced?0:(q>0&&q<1?1:0));});caption.textContent=m.reduced?'Acknowledgement available above; decorative confetti omitted.':'Decorative seek study; acknowledgements remain '+acknowledgements+'.';};
  });

  add('feedback-island-expansion', '状态胶囊展开 / Native disclosure and status pill morph', { width:[130,220] }, [], (m,p) => {
    const native=nativePanel(m,'Status disclosure'), details=m.el('details',null,'margin-block:10px;padding:10px;border:1px solid #728695;border-radius:12px;',native.panel);
    const summary=m.el('summary','Local job details / 本地任务详情','min-block-size:44px;cursor:pointer;line-height:44px;',details);note(m,'Local illustrative job: draft prepared. No remote work is running.',details);
    native.status.textContent='Native details closed.';m.root.dataset.nativeExpanded='false';
    m.listen(details,'toggle',()=>{native.status.textContent=details.open?'Native details open.':'Native details closed.';m.root.dataset.nativeExpanded=String(details.open);});
    const {svg,caption}=studyPanel(m,'Compact pill → expanded island'), box=m.svg('rect',{fill:'#203d4d',stroke:colors[0],'stroke-width':2},svg), title=text(m,svg,164,115,'Local draft',null,13), detail=text(m,svg,137,149,'Prepared · offline study',null,12);
    return raw=>{const t=normal(m,raw),q=W.ease(W.phase(t,.15,.8)),width=W.mix(126,p.width,q),height=W.mix(44,102,q);box.setAttribute('x',(420-width)/2);box.setAttribute('y',120-height/2);box.setAttribute('width',width);box.setAttribute('height',height);box.setAttribute('rx',W.mix(22,18,q));title.setAttribute('y',W.mix(124,110,q));detail.setAttribute('opacity',q);caption.textContent='Study expands; native disclosure remains '+(details.open?'open':'closed')+'.';};
  });

  add('feedback-toast-notice', '通知显隐与确认 / Native local notice and toast', { travel:[20,70] }, [], (m,p,options) => {
    const native=nativePanel(m,'Local notice'), show=m.el('button','Show local notice / 显示通知',controlCss,native.panel);show.type='button';
    const banner=m.el('div',null,'margin-block:12px;padding:12px;border:1px solid #72dfce;border-radius:8px;background:#203d4d;',native.panel);banner.hidden=true;
    const message=m.el('p',options.text,'margin:0 0 8px;overflow-wrap:anywhere;',banner);message.setAttribute('role','status');
    const dismiss=m.el('button','Dismiss / 关闭',controlCss,banner);dismiss.type='button';let shown=false,acknowledged=0;
    function report(){native.status.textContent=shown?'Local notice visible.':'Local notice hidden; acknowledgements '+acknowledged+'.';m.root.dataset.nativeNotice=String(shown);}
    m.listen(show,'click',()=>{shown=true;banner.hidden=false;message.textContent=options.text;report();});
    m.listen(dismiss,'click',()=>{const returnFocus=m.doc.activeElement===dismiss;shown=false;acknowledged+=1;banner.hidden=true;report();if(returnFocus)show.focus();});report();
    const {svg,caption}=studyPanel(m,'Notice arrival / hold / departure'), toast=m.svg('g',{},svg);m.svg('rect',{x:61,y:0,width:298,height:56,rx:10,fill:'#203d4d',stroke:colors[0],'stroke-width':2},toast);text(m,toast,80,33,'Local notice · authored message',null,13);
    return raw=>{const t=normal(m,raw),enter=W.ease(W.phase(t,0,.25)),exit=W.ease(W.phase(t,.75,1));const y=m.reduced?93:93+p.travel*(1-enter)-p.travel*exit;toast.setAttribute('transform','translate(0 '+y+')');toast.setAttribute('opacity',m.reduced?1:enter*(1-exit));caption.textContent='Study notice only; native notice '+(shown?'visible':'hidden')+', acknowledgements '+acknowledged+'.';};
  });

  return { recipes };
}

function buildWebRoute(W) {
  const recipes = {};
  let serial = 0;
  const effects = ['slide','wipe','crossfade','circle','view-circle','stack','flip','parallax'];
  const buttonCSS = 'min-height:44px;padding:9px 14px;border:1px solid #8ce5ca;border-radius:8px;background:#24465d;color:#eff8ff;font:inherit;';
  const id = 'web.route-compositing';
  function validate(p) {
    if (!p || !effects.includes(p.effect)) throw new TypeError('Unsupported route compositing effect');
    const schema = {effect:[p.effect],durationMs:[120,400]};
    if (['slide','stack','parallax'].includes(p.effect)) schema.distance = [40,180];
    if (['circle','view-circle'].includes(p.effect)) { schema.originX=[0,100]; schema.originY=[0,100]; }
    if (p.effect === 'parallax') schema.backgroundRatio = [.15,.6];
    if (p.effect === 'flip') schema.perspective = [400,1200];
    W.validate(p,schema);
  }
  recipes[id] = {title:'路由合成与本地历史 / Route compositing and local history',validate,create(stage,p,options) {
    validate(p);
    const m = W.mount(stage,id,options), uid='motion-web-route-'+(++serial);
    const view=m.doc.defaultView;
    if (p.effect==='view-circle' && typeof m.doc.startViewTransition!=='function') { m.root.remove(); throw new Error('web.route-compositing view-circle requires native View Transition API'); }
    m.el('p','Fixed A → B study / 确定性预览；native local navigation is a separate channel.');
    function scene(parent,native) {
      const frame=m.el('div',null,'position:relative;height:224px;overflow:hidden;border:1px solid #667f95;border-radius:12px;isolation:isolate;perspective:'+(p.perspective||800)+'px;',parent);
      const pages=['A · 概览 / Overview','B · 研究 / Research'].map((name,index)=>{
        const page=m.el('section',null,'position:absolute;inset:0;padding:22px;box-sizing:border-box;background:'+(index?'#25354e':'#164b4e')+';color:#eff8ff;transform-origin:50% 50%;backface-visibility:hidden;',frame);
        const background=m.el('div',null,'position:absolute;inset:-20%;pointer-events:none;background:repeating-linear-gradient(35deg,transparent 0 45px,#8ce5ca22 45px 65px);',page);
        const content=m.el('div',null,'position:relative;z-index:1;',page);
        const heading=m.el('h3',name,'margin:0 0 12px;',content);
        if(native) heading.tabIndex=-1;
        m.el('p',index?'研究页保留独立的表单值。The route changes, not the source entity.':'概览页包含真实文字。Native route intent never comes from seek progress.','margin:0 0 14px;',content);
        if(native) {
          const label=m.el('label','Local note / 本地备注 ','display:block;',content);
          m.el('input',index?'':'','min-height:32px;max-width:100%;font:inherit;',label);
        } else m.el('p','Authored page snapshot · no interactive controls','margin:0;',content);
        return {page,background,heading};
      });
      return {frame,pages};
    }
    const study=scene(m.root,false);
    study.frame.setAttribute('aria-hidden','true'); study.frame.inert=true;
    m.el('h3','Native local routes / 原生本地路由');
    const controls=m.el('nav',null,'display:flex;flex-wrap:wrap;gap:8px;'); controls.setAttribute('aria-label','Local route study');
    const live=scene(m.root,true);
    live.frame.style.viewTransitionName=uid;
    const status=m.el('p','Native route A · local history length 1'); status.setAttribute('role','status');
    let selected=0, generation=0, disposed=false, currentTransition=null;
    const history=[0], animations=new Set();
    const buttons=[0,1].map(index=>m.el('button',index?'Open B / 研究':'Open A / 概览',buttonCSS,controls));
    const back=m.el('button','Local back / 本地返回',buttonCSS,controls);
    function cancel() {
      generation++;
      animations.forEach(animation=>{animation.onfinish=null;animation.cancel();}); animations.clear();
      if(currentTransition) {currentTransition.skipTransition();currentTransition=null;}
    }
    function finalNative() {
      live.pages.forEach((item,index)=>{
        item.page.hidden=index!==selected; item.page.inert=index!==selected;
        item.page.setAttribute('aria-hidden',String(index!==selected));
        item.page.style.transform='none';item.page.style.opacity='1';item.page.style.clipPath='none';item.background.style.transform='none';
      });
      buttons.forEach((button,index)=>button.setAttribute('aria-current',index===selected?'page':'false'));
      back.disabled=history.length<2;
      status.textContent='Native route '+(selected?'B':'A')+' · local history length '+history.length+' · preserved note inputs';
    }
    function addAnimation(el,frames,owner,settings) {
      const animation=el.animate(frames,Object.assign({duration:p.durationMs,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'},settings));
      animations.add(animation);
      animation.onfinish=()=>{animations.delete(animation);animation.onfinish=null;animation.cancel();if(!disposed && owner===generation && animations.size===0) finalNative();};
    }
    function request(next,fromBack) {
      if(disposed || next===selected) return;
      const old=selected;
      const before=live.pages.map(item=>{const style=view.getComputedStyle(item.page);return {transform:style.transform,opacity:style.opacity,clipPath:style.clipPath};});
      cancel();const owner=generation;selected=next;
      if(!fromBack) history.push(next);
      buttons.forEach((button,index)=>button.setAttribute('aria-current',index===selected?'page':'false'));
      status.textContent='Native route '+(selected?'B':'A')+' requested · local history length '+history.length;
      if(m.reduced || typeof live.frame.animate!=='function') {finalNative();live.pages[selected].heading.focus({preventScroll:true});return;}
      if(p.effect==='view-circle') {
        const transition=m.doc.startViewTransition(()=>{if(!disposed && owner===generation) finalNative();});
        currentTransition=transition;
        transition.ready.then(()=>{
          if(disposed || owner!==generation) return;
          const box=live.frame.getBoundingClientRect();
          const radius=Math.hypot(box.width,box.height);
          addAnimation(m.doc.documentElement,[{clipPath:'circle(0px at '+p.originX+'% '+p.originY+'%)'},{clipPath:'circle('+radius+'px at '+p.originX+'% '+p.originY+'%)'}],owner,{pseudoElement:'::view-transition-new('+uid+')'});
        }).catch(()=>{if(!disposed && owner===generation) finalNative();});
        transition.finished.then(()=>{if(!disposed && owner===generation) {currentTransition=null;live.pages[selected].heading.focus({preventScroll:true});}}).catch(()=>{});
        return;
      }
      const oldPage=live.pages[old],newPage=live.pages[next], direction=next>old?1:-1;
      live.pages.forEach(item=>{item.page.hidden=false;item.page.inert=true;item.page.setAttribute('aria-hidden','true');});
      newPage.page.inert=false;newPage.page.setAttribute('aria-hidden','false');newPage.page.style.zIndex='2';oldPage.page.style.zIndex='1';
      let oldEnd={opacity:1,transform:'none'},newStart={opacity:1,transform:'none'};
      if(p.effect==='slide') {oldEnd.transform='translateX('+(-direction*p.distance)+'px)';newStart.transform='translateX(calc('+(direction*100)+'% + '+(direction*p.distance)+'px))';}
      else if(p.effect==='stack') {oldEnd.transform='translateX('+(-direction*p.distance*.3)+'px) scale(.88)';newStart.transform='translateX(calc('+(direction*100)+'% + '+(direction*p.distance)+'px))';}
      else if(p.effect==='crossfade') {oldEnd.opacity=0;newStart.opacity=0;}
      else if(p.effect==='wipe') {newStart.clipPath='inset(0 100% 0 0)';}
      else if(p.effect==='circle') {newStart.clipPath='circle(0% at '+p.originX+'% '+p.originY+'%)';}
      else if(p.effect==='flip') {oldEnd.transform='rotateY('+(-direction*180)+'deg)';newStart.transform='rotateY('+(direction*180)+'deg)';}
      else if(p.effect==='parallax') {
        oldEnd.transform='translateX('+(-direction*p.distance)+'px)';newStart.transform='translateX(calc('+(direction*100)+'% + '+(direction*p.distance)+'px))';
        addAnimation(oldPage.background,[{transform:'none'},{transform:'translateX('+(direction*p.distance*p.backgroundRatio)+'px)'}],owner);
        addAnimation(newPage.background,[{transform:'translateX('+(-direction*p.distance*p.backgroundRatio)+'px)'},{transform:'none'}],owner);
      }
      addAnimation(oldPage.page,[before[old],oldEnd],owner);
      addAnimation(newPage.page,[newStart,{opacity:1,transform:'none',clipPath:p.effect==='circle'?'circle(150% at '+p.originX+'% '+p.originY+'%)':'inset(0 0 0 0)'}],owner);
      newPage.heading.focus({preventScroll:true});
    }
    buttons.forEach((button,index)=>m.listen(button,'click',()=>request(index,false)));
    m.listen(back,'click',()=>{if(history.length>1){history.pop();request(history[history.length-1],true);}});
    m.listen(live.frame,'keydown',event=>{if(event.altKey&&event.key==='ArrowLeft'){event.preventDefault();back.click();}});
    m.listen(view,'resize',()=>{cancel();finalNative();});
    m.el('style','::view-transition-old('+uid+'),::view-transition-new('+uid+'){animation:none;mix-blend-mode:normal}::view-transition-group('+uid+'){animation-duration:'+p.durationMs+'ms}');
    m.onDispose(()=>{disposed=true;cancel();});
    finalNative();
    return m.finish(progress=>{
      const t=m.reduced?1:W.ease(W.phase(progress,.08,.9));
      const a=study.pages[0],b=study.pages[1];
      for(const item of study.pages){item.page.hidden=false;item.page.style.transform='none';item.page.style.opacity='1';item.page.style.clipPath='none';item.background.style.transform='none';}
      a.page.style.zIndex='1';b.page.style.zIndex='2';
      if(m.reduced){a.page.hidden=true;return;}
      if(p.effect==='slide'){a.page.style.transform='translateX('+(-p.distance*t)+'px)';b.page.style.transform='translateX(calc('+(100*(1-t))+'% + '+(p.distance*(1-t))+'px))';}
      else if(p.effect==='stack'){a.page.style.transform='translateX('+(-p.distance*.3*t)+'px) scale('+(1-.12*t)+')';b.page.style.transform='translateX(calc('+(100*(1-t))+'% + '+(p.distance*(1-t))+'px))';}
      else if(p.effect==='crossfade'){a.page.style.opacity=String(1-t);b.page.style.opacity=String(t);}
      else if(p.effect==='wipe') b.page.style.clipPath='inset(0 '+(100*(1-t))+'% 0 0)';
      else if(p.effect==='circle'||p.effect==='view-circle') b.page.style.clipPath='circle('+(150*t)+'% at '+p.originX+'% '+p.originY+'%)';
      else if(p.effect==='flip'){a.page.style.transform='rotateY('+(-180*t)+'deg)';b.page.style.transform='rotateY('+(180*(1-t))+'deg)';}
      else if(p.effect==='parallax'){a.page.style.transform='translateX('+(-p.distance*t)+'px)';b.page.style.transform='translateX(calc('+(100*(1-t))+'% + '+(p.distance*(1-t))+'px))';a.background.style.transform='translateX('+(p.distance*p.backgroundRatio*t)+'px)';b.background.style.transform='translateX('+(-p.distance*p.backgroundRatio*(1-t))+'px)';}
    });
  }};
  return {recipes};
}

function buildWebScroll(W) {
  const recipes = {};
  const ink = '#e8f2ff';
  const muted = '#b9cadb';
  const accent = '#78e4c6';
  const gold = '#f7ce7b';
  const screenReaderText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:pre-wrap;border:0;';

  function register(id, title, schema, setup) {
    const validate = parameters => W.validate(parameters, schema);
    recipes[id] = {
      title,
      validate,
      create(stage, parameters, options) {
        validate(parameters);
        const m = W.mount(stage, id, options);
        try {
          const render = setup(m, parameters, options || {});
          return m.finish(render);
        } catch (error) {
          // Release the partially mounted study before propagating the real setup error.
          m.finish(() => {}).dispose();
          throw error;
        }
      }
    };
  }

  function panels(m, p, title) {
    m.el('h3', title, 'margin:0 0 6px;font-size:18px;');
    m.el('p', 'Native scroll / 原生滚动：focus the upper panel, then use wheel, touch or navigation keys. Gallery seek changes only the lower study.', 'margin:0 0 12px;color:' + muted + ';font-size:13px;');
    const port = m.el('div', null, 'position:relative;box-sizing:border-box;width:100%;height:' + p.viewportHeight + 'px;overflow:auto;scroll-behavior:auto;border:1px solid #526b80;border-radius:10px;background:#142b3b;outline:2px solid transparent;outline-offset:2px;');
    port.tabIndex = 0;
    port.dir = 'ltr';
    port.setAttribute('role', 'region');
    port.setAttribute('aria-label', title + ' — native scroll panel');
    m.listen(port, 'focus', () => { port.style.outlineColor = ink; });
    m.listen(port, 'blur', () => { port.style.outlineColor = 'transparent'; });
    const nativeContent = m.el('div', null, 'position:relative;min-width:0;', port);
    const nativeStatus = m.el('p', 'Native position: start.', 'margin:7px 0 14px;color:' + muted + ';font-size:12px;font-variant-numeric:tabular-nums;');
    m.el('h4', 'Authored seek study / 独立时间轴示意', 'margin:0 0 6px;font-size:14px;');
    const preview = m.el('div', null, 'position:relative;box-sizing:border-box;min-height:142px;padding:12px;overflow:hidden;border:1px solid #526b80;border-radius:10px;background:#193244;');
    preview.setAttribute('role', 'group');
    preview.setAttribute('aria-label', title + ' — authored seek study');
    const previewStatus = m.el('p', 'Study: start.', 'margin:7px 0 0;color:' + muted + ';font-size:12px;font-variant-numeric:tabular-nums;');
    return { port, nativeContent, nativeStatus, preview, previewStatus };
  }

  function visual(m, parent, height, sticky) {
    const node = m.el('div', null, 'position:' + (sticky && !m.reduced ? 'sticky' : 'relative') + ';top:0;z-index:1;box-sizing:border-box;min-width:0;height:' + height + 'px;padding:10px;overflow:hidden;background:#183747;border-bottom:1px solid #526b80;', parent);
    return node;
  }

  function narrative(m, parent, viewportHeight, topics) {
    for (let i = 0; i < topics.length; i++) {
      const article = m.el('article', null, 'box-sizing:border-box;min-height:' + Math.round(viewportHeight * .85) + 'px;padding:18px 14px;border-top:1px solid #425c70;', parent);
      m.el('h4', String(i + 1).padStart(2, '0') + ' / ' + topics[i][0], 'margin:0 0 8px;font-size:16px;', article);
      m.el('p', topics[i][1], 'margin:0;color:' + muted + ';max-width:48ch;', article);
    }
  }

  function positionInPort(node, port, axis) {
    const a = node.getBoundingClientRect();
    const b = port.getBoundingClientRect();
    return axis === 'x' ? a.left - b.left - port.clientLeft + port.scrollLeft : a.top - b.top - port.clientTop + port.scrollTop;
  }

  function observe(m, nodes, refresh) {
    let disposed = false;
    const view = m.doc.defaultView;
    const update = () => { if (!disposed) refresh(); };
    const observer = view && typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(update) : null;
    if (observer) for (const node of nodes) observer.observe(node);
    if (view) m.listen(view, 'resize', update);
    if (m.doc.fonts && typeof m.doc.fonts.addEventListener === 'function') m.listen(m.doc.fonts, 'loadingdone', update);
    m.onDispose(() => { disposed = true; if (observer) observer.disconnect(); });
    update();
  }

  function nativeDriver(m, port, axis, draw) {
    const state = { position: 0, range: 0, progress: 0, viewport: 0, velocity: 0 };
    let previousPosition = axis === 'x' ? port.scrollLeft : port.scrollTop;
    let previousTimestamp = null;
    function read(event) {
      state.viewport = axis === 'x' ? port.clientWidth : port.clientHeight;
      state.range = Math.max(0, (axis === 'x' ? port.scrollWidth : port.scrollHeight) - state.viewport);
      state.position = W.clamp(axis === 'x' ? port.scrollLeft : port.scrollTop, 0, state.range);
      state.progress = state.range > 0 ? state.position / state.range : 0;
      const timestamp = event && Number.isFinite(event.timeStamp) ? event.timeStamp : null;
      const elapsed = timestamp !== null && previousTimestamp !== null ? timestamp - previousTimestamp : 0;
      state.velocity = elapsed > 0 ? (state.position - previousPosition) * 1000 / elapsed : 0;
      previousPosition = state.position;
      previousTimestamp = timestamp;
      draw(state);
    }
    const refresh = () => read(null);
    m.listen(port, 'scroll', read, { passive: true });
    m.listen(port, 'scrollend', refresh);
    m.listen(port, 'blur', refresh);
    m.listen(port, 'pointercancel', refresh);
    m.listen(m.doc, 'visibilitychange', () => { if (m.doc.hidden) refresh(); });
    refresh();
    return { state, refresh };
  }

  function percentage(value) { return Math.round(W.clamp(value) * 100) + '%'; }

  function landscape(m, parent) {
    const svg = m.svg('svg', { viewBox: '0 0 420 170', 'aria-hidden': 'true', focusable: 'false', style: 'display:block;width:100%;height:100%;' }, parent);
    m.svg('rect', { width: 420, height: 170, fill: '#315767' }, svg);
    m.svg('circle', { cx: 330, cy: 38, r: 24, fill: gold }, svg);
    m.svg('path', { d: 'M0 122 L76 42 L126 98 L185 23 L265 113 L340 67 L420 128 V170 H0Z', fill: '#528f97' }, svg);
    m.svg('path', { d: 'M0 147 Q105 82 217 142 T420 117 V170 H0Z', fill: '#254f5a' }, svg);
    m.svg('path', { d: 'M120 170 Q190 142 219 150 Q273 162 285 137 Q299 120 340 126', fill: 'none', stroke: accent, 'stroke-width': 8, 'stroke-linecap': 'round' }, svg);
    return svg;
  }

  register('web.scroll-horizontal-track', 'Measured horizontal track / 测量式横向轨道', {
    viewportHeight: [180, 360], cardWidth: [130, 260], gap: [6, 32]
  }, (m, p) => {
    const s = panels(m, p, 'Measured horizontal track');
    const topics = [
      ['Observe', 'A vertical scroll range reveals the full horizontal set. Nothing automatically advances.'],
      ['Connect', 'The card rail measures its own overflow after layout; the native scrollport supplies position.'],
      ['Review', 'Every card remains available in reduced motion as a wrapping, readable set.']
    ];
    function rail(parent, sticky) {
      const clip = visual(m, parent, m.reduced ? 210 : 132, sticky);
      if (m.reduced) { clip.style.height = 'auto'; clip.style.minHeight = '132px'; }
      const track = m.el('div', null, 'display:flex;align-items:stretch;gap:' + p.gap + 'px;width:' + (m.reduced ? '100%' : 'max-content') + ';flex-wrap:' + (m.reduced ? 'wrap' : 'nowrap') + ';', clip);
      const labels = ['01 / Field', '02 / River', '03 / Ridge', '04 / Trail'];
      for (let i = 0; i < labels.length; i++) {
        const card = m.el('article', null, 'box-sizing:border-box;flex:' + (m.reduced ? '1 1 ' : '0 0 ') + p.cardWidth + 'px;min-width:0;padding:12px;border:1px solid #76a3b0;border-radius:8px;background:' + (i % 2 ? '#285366' : '#214754') + ';', track);
        m.el('h5', labels[i], 'margin:0 0 10px;font-size:15px;', card);
        m.el('div', '—  ○  —', 'color:' + accent + ';font:24px/1.4 monospace;', card);
      }
      return { clip, track, travel: 0 };
    }
    const native = rail(s.nativeContent, true);
    narrative(m, s.nativeContent, p.viewportHeight, topics);
    const preview = rail(s.preview, false);
    let last = 0;
    function draw(item, t) { item.track.style.transform = m.reduced ? 'none' : 'translateX(' + (-item.travel * t) + 'px)'; }
    const driver = nativeDriver(m, s.port, 'y', state => {
      draw(native, state.progress);
      s.nativeStatus.firstChild.data = 'Native: ' + percentage(state.progress) + ' of ' + Math.round(state.range) + 'px vertical range; measured rail overflow ' + Math.round(native.travel) + 'px.';
    });
    function render(t) { last = t; draw(preview, t); s.previewStatus.firstChild.data = 'Study: ' + percentage(t) + '; native scroll position is unchanged.'; }
    observe(m, [s.port, s.nativeContent, native.clip, native.track, preview.clip, preview.track], () => {
      native.travel = Math.max(0, native.track.scrollWidth - native.clip.clientWidth + 20);
      preview.travel = Math.max(0, preview.track.scrollWidth - preview.clip.clientWidth + 20);
      driver.refresh(); render(last);
    });
    return render;
  });

  register('web.scroll-image-clip', 'Scroll image aperture / 滚动图像开窗', {
    viewportHeight: [180, 360], edge: ['inline-start', 'center'], startAt: [0, .45], endAt: [.55, 1]
  }, (m, p) => {
    const s = panels(m, p, 'Scroll image aperture');
    function image(parent, sticky) {
      const box = visual(m, parent, 170, sticky);
      const imageBox = m.el('div', null, 'width:100%;height:100%;background:#315767;', box);
      landscape(m, imageBox);
      return imageBox;
    }
    const native = image(s.nativeContent, true);
    narrative(m, s.nativeContent, p.viewportHeight, [
      ['Closed aperture', 'The original SVG landscape is decorative; this description is never clipped or hidden.'],
      ['Open aperture', 'The crop edge follows measured native progress between the authored start and end fractions.'],
      ['Full image', 'Reverse scrolling closes the same aperture. Reduced motion displays the entire illustration.']
    ]);
    const preview = image(s.preview, false);
    let last = 0;
    function draw(node, t) {
      const q = m.reduced ? 1 : W.ease(W.phase(t, p.startAt, p.endAt));
      const inset = (1 - q) * (p.edge === 'center' ? 50 : 100);
      node.style.clipPath = m.reduced ? 'none' : p.edge === 'center' ? 'inset(0 ' + inset + '% 0 ' + inset + '%)' : 'inset(0 ' + inset + '% 0 0)';
    }
    const driver = nativeDriver(m, s.port, 'y', state => { draw(native, state.progress); s.nativeStatus.firstChild.data = 'Native aperture: ' + percentage(W.phase(state.progress, p.startAt, p.endAt)) + '; crop origin ' + p.edge + '.'; });
    function render(t) { last = t; draw(preview, t); s.previewStatus.firstChild.data = 'Study aperture range ' + percentage(p.startAt) + '–' + percentage(p.endAt) + '; ' + (m.reduced ? 'full image, no crop motion.' : percentage(t) + ' study position.'); }
    observe(m, [s.port, s.nativeContent, s.preview], () => { driver.refresh(); render(last); });
    return render;
  });

  register('web.scroll-parallax-layers', 'Measured layered parallax / 测量式分层视差', {
    viewportHeight: [180, 360], travel: [12, 70], nearRatio: [.9, 1.8]
  }, (m, p) => {
    const s = panels(m, p, 'Measured layered parallax');
    function scene(parent, sticky) {
      const box = visual(m, parent, 170, sticky);
      const layers = [];
      const shapes = [
        { d: 'M0 118 L72 34 L132 92 L214 25 L296 104 L358 57 L420 121 V240 H0Z', fill: '#67939d' },
        { d: 'M0 143 Q84 84 164 126 T320 111 T420 137 V240 H0Z', fill: '#3d7880' },
        { d: 'M0 158 Q103 130 212 158 T420 154 V240 H0Z', fill: '#25545d' }
      ];
      box.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < shapes.length; i++) {
        const svg = m.svg('svg', { viewBox: '0 0 420 170', focusable: 'false', style: 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;' }, box);
        if (i === 0) m.svg('circle', { cx: 329, cy: 42, r: 23, fill: gold }, svg);
        m.svg('path', shapes[i], svg);
        layers.push(svg);
      }
      return layers;
    }
    const native = scene(s.nativeContent, true);
    narrative(m, s.nativeContent, p.viewportHeight, [
      ['Far layer', 'The sun and ridge move at 0.2 of the authored travel; reading content stays in ordinary flow.'],
      ['Middle layer', 'The middle landscape moves at 0.65 of travel, preserving independent depth cues.'],
      ['Near layer', 'The foreground uses nearRatio. All three layers remain visible and static under reduced motion.']
    ]);
    const preview = scene(s.preview, false);
    const ratios = [.2, .65, p.nearRatio];
    let last = 0;
    function draw(layers, t) { for (let i = 0; i < layers.length; i++) layers[i].style.transform = m.reduced ? 'none' : 'translateY(' + (-p.travel * ratios[i] * t) + 'px)'; }
    const driver = nativeDriver(m, s.port, 'y', state => { draw(native, state.progress); s.nativeStatus.firstChild.data = 'Native: ' + percentage(state.progress) + '; layers use separate 0.2 / 0.65 / ' + p.nearRatio + ' depth rates.'; });
    function render(t) { last = t; draw(preview, t); s.previewStatus.firstChild.data = m.reduced ? 'Study: complete static landscape; no parallax.' : 'Study: ' + percentage(t) + ', maximum near travel ' + Math.round(p.travel * p.nearRatio) + 'px.'; }
    observe(m, [s.port, s.nativeContent, s.preview], () => { driver.refresh(); render(last); });
    return render;
  });

  register('web.scroll-pinned-story-steps', 'Native pinned story steps / 原生钉住叙事步骤', {
    viewportHeight: [220, 360], stepHeight: [180, 380], pinTop: [0, 24]
  }, (m, p) => {
    const s = panels(m, p, 'Native pinned story steps');
    const names = ['Observe / 观察', 'Connect / 联结', 'Decide / 判断'];
    const copy = ['Collect the landmarks before changing state.', 'Relate the river, ridge and route without losing orientation.', 'Read the conclusion while the diagram remains anchored.'];
    m.el('p', 'Enter the story. The diagram pins inside the grid while these three semantic chapters pass it.', 'box-sizing:border-box;min-height:110px;margin:0;padding:18px 14px;color:' + muted + ';', s.nativeContent);
    const host = m.el('div', null, 'display:' + (m.reduced ? 'block' : 'grid') + ';grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:12px;padding:12px;position:relative;', s.nativeContent);
    function diagram(parent, sticky) {
      const box = m.el('div', null, 'position:' + (sticky && !m.reduced ? 'sticky' : 'relative') + ';top:' + p.pinTop + 'px;align-self:start;box-sizing:border-box;min-width:0;padding:12px;border:1px solid #76a3b0;border-radius:8px;background:#214754;', parent);
      const svg = m.svg('svg', { viewBox: '0 0 240 64', 'aria-hidden': 'true', focusable: 'false', style: 'display:block;width:100%;height:64px;' }, box);
      m.svg('path', { d: 'M30 32 H210', stroke: '#76a3b0', 'stroke-width': 3 }, svg);
      const marks = [];
      for (let i = 0; i < names.length; i++) {
        marks.push(m.svg('circle', { cx: 30 + i * 90, cy: 32, r: 13, fill: '#183747', stroke: accent, 'stroke-width': 2 }, svg));
        m.svg('text', { x: 30 + i * 90, y: 37, 'text-anchor': 'middle', fill: ink, 'font-size': 14 }, svg).textContent = String(i + 1);
      }
      const text = m.el('p', names.join(' → '), 'margin:8px 0 0;font-size:13px;', box);
      return { box, marks, text };
    }
    const native = diagram(host, true);
    const chapters = m.el('div', null, 'min-width:0;', host);
    const steps = [];
    const tops = [0, 0, 0];
    for (let i = 0; i < names.length; i++) {
      const step = m.el('article', null, 'box-sizing:border-box;min-height:' + p.stepHeight + 'px;padding:12px 6px;border-top:2px solid #526b80;', chapters);
      m.el('h4', names[i], 'margin:0 0 8px;font-size:16px;', step);
      m.el('p', copy[i], 'margin:0;color:' + muted + ';', step);
      steps.push(step);
    }
    m.el('p', 'Leave the story. The grid ends, so the native sticky diagram is released by its containing block.', 'box-sizing:border-box;min-height:' + Math.round(p.viewportHeight * .85) + 'px;margin:0;padding:18px 14px;color:' + muted + ';', s.nativeContent);
    const preview = diagram(s.preview, false);
    const previewSteps = [];
    for (let i = 0; i < names.length; i++) previewSteps.push(m.el('p', names[i], 'margin:8px 0 0;padding:5px 8px;border-left:3px solid #526b80;', s.preview));
    let last = 0;
    function draw(item, index) {
      for (let i = 0; i < item.marks.length; i++) item.marks[i].setAttribute('fill', i === index ? '#2f967f' : '#183747');
      item.text.firstChild.data = m.reduced ? names.join(' → ') : names[index];
    }
    const driver = nativeDriver(m, s.port, 'y', state => {
      const line = state.position + state.viewport * .5;
      let index = 0;
      for (let i = 1; i < tops.length; i++) if (line >= tops[i]) index = i;
      draw(native, index);
      for (let i = 0; i < steps.length; i++) {
        steps[i].style.borderTopColor = i === index ? accent : '#526b80';
        if (i === index) steps[i].setAttribute('aria-current', 'step'); else steps[i].removeAttribute('aria-current');
      }
      s.nativeStatus.firstChild.data = 'Native measured active chapter: ' + names[index] + '. ' + (m.reduced ? 'Diagram in ordinary flow.' : 'Pinning belongs to CSS sticky, not seek.');
    });
    function render(t) {
      last = t;
      const index = Math.min(2, Math.floor(W.phase(t, .12, .88) * 3));
      draw(preview, index);
      for (let i = 0; i < previewSteps.length; i++) previewSteps[i].style.borderLeftColor = i === index ? accent : '#526b80';
      s.previewStatus.firstChild.data = 'Study chapter ' + (index + 1) + '; native chapter/focus/scroll are unchanged.';
    }
    observe(m, [s.port, s.nativeContent, host, chapters, native.box, s.preview], () => {
      for (let i = 0; i < steps.length; i++) tops[i] = positionInPort(steps[i], s.port, 'y');
      driver.refresh(); render(last);
    });
    return render;
  });

  register('web.scroll-depth-perspective', 'Scroll perspective depth / 滚动透视纵深', {
    viewportHeight: [180, 360], perspective: [500, 1200], depth: [80, 220]
  }, (m, p) => {
    const s = panels(m, p, 'Scroll perspective depth');
    function scene(parent, sticky) {
      const box = visual(m, parent, 172, sticky);
      box.style.perspective = p.perspective + 'px';
      box.setAttribute('aria-hidden', 'true');
      const world = m.el('div', null, 'position:relative;width:100%;height:100%;transform-style:preserve-3d;', box);
      const back = m.el('div', null, 'position:absolute;inset:3% 8%;border:1px solid #86b6bf;background:#315767;', world);
      landscape(m, back);
      const frame = m.el('div', null, 'position:absolute;inset:20% 18%;border:3px solid ' + accent + ';border-radius:10px;background:rgba(20,43,59,.48);', world);
      const subject = m.el('div', 'ROUTE / 旅程', 'position:absolute;inset:37% 28%;display:grid;place-items:center;min-width:0;border:1px solid ' + gold + ';border-radius:8px;background:#285366;color:' + ink + ';font-weight:700;font-size:16px;text-align:center;', world);
      return { back, frame, subject };
    }
    const native = scene(s.nativeContent, true);
    narrative(m, s.nativeContent, p.viewportHeight, [
      ['Perspective plane', 'The container supplies real CSS perspective; depth uses translateZ, not a renamed 2D scale.'],
      ['Independent layers', 'The landscape, frame and route card occupy separate Z planes and respond at separate rates.'],
      ['Static alternative', 'Reduced motion places all planes at zero depth while preserving the original illustration and text.']
    ]);
    const preview = scene(s.preview, false);
    let last = 0;
    function draw(item, t) {
      const q = W.ease(t);
      item.back.style.transform = m.reduced ? 'none' : 'translateZ(' + (-p.depth * .5 + q * p.depth * .16) + 'px)';
      item.frame.style.transform = m.reduced ? 'none' : 'translateZ(' + (-p.depth * .35 + q * p.depth * .55) + 'px)';
      item.subject.style.transform = m.reduced ? 'none' : 'translateZ(' + (-p.depth + q * p.depth * 1.45) + 'px)';
    }
    const driver = nativeDriver(m, s.port, 'y', state => { draw(native, state.progress); s.nativeStatus.firstChild.data = 'Native: ' + percentage(state.progress) + '; perspective ' + p.perspective + 'px, authored depth ' + p.depth + 'px.'; });
    function render(t) { last = t; draw(preview, t); s.previewStatus.firstChild.data = m.reduced ? 'Study: static zero-depth planes.' : 'Study: ' + percentage(t) + '; genuine CSS 3D planes, no native offset write.'; }
    observe(m, [s.port, s.nativeContent, s.preview], () => { driver.refresh(); render(last); });
    return render;
  });

  register('web.scroll-marquee-band', 'Scroll-coupled marquee / 滚动耦合字带', {
    viewportHeight: [180, 360], direction: ['left', 'right'], travelRatio: [.25, 1]
  }, (m, p, options) => {
    const s = panels(m, p, 'Scroll-coupled marquee');
    const text = typeof options.text === 'string' ? options.text : 'FOLLOW THE RIVER · 沿河而行 · ';
    function band(parent, sticky) {
      const box = visual(m, parent, 118, sticky);
      if (m.reduced) { box.style.height = 'auto'; box.style.minHeight = '90px'; }
      m.el('span', text, screenReaderText, box);
      const track = m.el('div', null, 'display:flex;gap:18px;width:max-content;align-items:center;font-size:30px;font-weight:750;line-height:1.8;white-space:nowrap;color:' + gold + ';', box);
      track.setAttribute('aria-hidden', 'true');
      const first = m.el('span', text, 'display:block;flex:none;', track);
      const second = m.el('span', text, 'display:block;flex:none;', track);
      if (m.reduced) {
        track.style.width = '100%'; track.style.whiteSpace = 'normal'; first.style.overflowWrap = 'anywhere'; second.hidden = true;
      }
      return { box, track, first, second, period: 0 };
    }
    const native = band(s.nativeContent, true);
    narrative(m, s.nativeContent, p.viewportHeight, [
      ['Start the band', 'This marquee follows the reading position. There is no autoplay clock or continuous loop.'],
      ['Measured repeat', 'Exactly two visual copies form one measured repeat. Assistive technology receives the phrase only once.'],
      ['Stop or reverse', 'Stopping native scrolling freezes position; reversing moves the same strip back. Reduced motion wraps one static copy.']
    ]);
    const preview = band(s.preview, false);
    let last = 0;
    function draw(item, t) {
      const q = p.direction === 'left' ? t : 1 - t;
      item.track.style.transform = m.reduced ? 'none' : 'translateX(' + (-item.period * p.travelRatio * q) + 'px)';
    }
    const driver = nativeDriver(m, s.port, 'y', state => { draw(native, state.progress); s.nativeStatus.firstChild.data = 'Native band: ' + percentage(state.progress) + '; measured repeat ' + Math.round(native.period) + 'px, ' + p.direction + ' direction.'; });
    function render(t) { last = t; draw(preview, t); s.previewStatus.firstChild.data = m.reduced ? 'Study: one static, wrapping phrase.' : 'Study: ' + percentage(t) + '; a bounded displacement, not an infinite marquee.'; }
    observe(m, [s.port, s.nativeContent, native.box, native.first, preview.box, preview.first], () => {
      if (!m.reduced) {
        native.first.style.minWidth = Math.max(0, native.box.clientWidth - 20) + 'px';
        native.second.style.minWidth = native.first.style.minWidth;
        preview.first.style.minWidth = Math.max(0, preview.box.clientWidth - 20) + 'px';
        preview.second.style.minWidth = preview.first.style.minWidth;
      }
      native.period = native.first.getBoundingClientRect().width + 18;
      preview.period = preview.first.getBoundingClientRect().width + 18;
      driver.refresh(); render(last);
    });
    return render;
  });

  register('web.scroll-reading-progress', 'Measured reading position / 测量式阅读进度', {
    viewportHeight: [180, 360], indicator: ['bar', 'ring']
  }, (m, p) => {
    const s = panels(m, p, 'Measured reading position');
    function indicator(parent, sticky, name) {
      const box = visual(m, parent, p.indicator === 'ring' ? 120 : 76, sticky);
      const meter = m.el('div', null, 'position:relative;min-height:34px;', box);
      meter.setAttribute('role', 'progressbar');
      meter.setAttribute('aria-label', name);
      meter.setAttribute('aria-valuemin', '0'); meter.setAttribute('aria-valuemax', '100');
      let fill;
      let circumference = 0;
      if (p.indicator === 'bar') {
        const track = m.el('div', null, 'height:12px;overflow:hidden;border-radius:8px;background:#425c70;', meter);
        fill = m.el('div', null, 'width:100%;height:100%;background:' + accent + ';transform-origin:left center;', track);
      } else {
        const svg = m.svg('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false', style: 'display:block;width:84px;height:84px;' }, meter);
        circumference = 2 * Math.PI * 36;
        m.svg('circle', { cx: 50, cy: 50, r: 36, fill: 'none', stroke: '#425c70', 'stroke-width': 8 }, svg);
        fill = m.svg('circle', { cx: 50, cy: 50, r: 36, fill: 'none', stroke: accent, 'stroke-width': 8, 'stroke-dasharray': circumference, transform: 'rotate(-90 50 50)' }, svg);
      }
      const label = m.el('span', '0%', 'display:block;margin-top:7px;font-variant-numeric:tabular-nums;', meter);
      return { meter, fill, label, circumference };
    }
    const native = indicator(s.nativeContent, true, 'Native scroll position, not reading completion');
    narrative(m, s.nativeContent, p.viewportHeight, [
      ['Beginning', 'The progress value is scroll offset divided by actual scrollable extent, not an assumed page length.'],
      ['Middle', 'Viewport, content and font changes refresh geometry without setting a new scroll position.'],
      ['End', 'One hundred percent means the bottom of this panel. It does not certify reading or completion of a task.']
    ]);
    const preview = indicator(s.preview, false, 'Authored study progress');
    let last = 0;
    function draw(item, t) {
      item.meter.setAttribute('aria-valuenow', String(Math.round(t * 100)));
      item.label.firstChild.data = percentage(t);
      if (p.indicator === 'bar') item.fill.style.transform = 'scaleX(' + t + ')';
      else item.fill.setAttribute('stroke-dashoffset', String(item.circumference * (1 - t)));
    }
    const driver = nativeDriver(m, s.port, 'y', state => { draw(native, state.progress); s.nativeStatus.firstChild.data = 'Native offset ' + Math.round(state.position) + ' / ' + Math.round(state.range) + 'px; ' + percentage(state.progress) + ' position.'; });
    function render(t) { last = t; draw(preview, t); s.previewStatus.firstChild.data = 'Study ' + percentage(t) + '; reduced motion retains accurate discrete position values.'; }
    observe(m, [s.port, s.nativeContent, s.preview], () => { driver.refresh(); render(last); });
    return render;
  });

  register('web.scroll-element-reveal', 'Measured element reveal / 测量式元素入场', {
    viewportHeight: [180, 360], threshold: [.5, 1], span: [.2, .65], travel: [0, 32]
  }, (m, p) => {
    const s = panels(m, p, 'Measured element reveal');
    const names = ['Source / 源头', 'Bend / 河湾', 'Ridge / 山脊', 'Arrival / 抵达'];
    function item(parent, index, native) {
      const box = m.el('article', null, 'box-sizing:border-box;min-width:0;min-height:' + (native ? Math.round(p.viewportHeight * .68) : 104) + 'px;padding:14px;border-top:1px solid #526b80;', parent);
      m.el('h4', names[index], 'margin:0 0 8px;font-size:15px;', box);
      const artwork = m.el('div', null, 'height:46px;border-radius:8px;background:#285366;', box);
      artwork.setAttribute('aria-hidden', 'true');
      const svg = m.svg('svg', { viewBox: '0 0 240 46', focusable: 'false', style: 'display:block;width:100%;height:46px;' }, artwork);
      m.svg('path', { d: 'M12 32 Q66 ' + (8 + index * 5) + ' 116 27 T228 15', fill: 'none', stroke: accent, 'stroke-width': 4 }, svg);
      m.el('p', 'The label remains readable before the decorative route is revealed.', 'margin:8px 0 0;font-size:12px;color:' + muted + ';', box);
      return { box, artwork, top: 0 };
    }
    m.el('p', 'Scroll toward each chapter; only its decorative illustration reveals.', 'box-sizing:border-box;min-height:85px;margin:0;padding:16px 14px;color:' + muted + ';', s.nativeContent);
    const native = [];
    for (let i = 0; i < names.length; i++) native.push(item(s.nativeContent, i, true));
    m.el('p', 'End of the route. Reverse scrolling reverses each measured reveal.', 'box-sizing:border-box;min-height:' + p.viewportHeight + 'px;margin:0;padding:16px 14px;color:' + muted + ';', s.nativeContent);
    const grid = m.el('div', null, 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;', s.preview);
    const preview = [];
    for (let i = 0; i < names.length; i++) preview.push(item(grid, i, false));
    let last = 0;
    function draw(item, q) { item.artwork.style.opacity = m.reduced ? '1' : String(q); item.artwork.style.transform = m.reduced ? 'none' : 'translateY(' + ((1 - q) * p.travel) + 'px)'; }
    const driver = nativeDriver(m, s.port, 'y', state => {
      let complete = 0;
      for (let i = 0; i < native.length; i++) {
        const q = W.clamp((state.viewport * p.threshold - (native[i].top - state.position)) / Math.max(1, state.viewport * p.span));
        draw(native[i], q); if (q === 1) complete++;
      }
      s.nativeStatus.firstChild.data = m.reduced ? 'Native: all four illustrations visible; semantic labels always present.' : 'Native: ' + complete + ' of 4 measured reveals complete; threshold ' + p.threshold + ' × viewport.';
    });
    function render(t) {
      last = t;
      for (let i = 0; i < preview.length; i++) {
        const start = (1 - p.threshold) * .35 + i * .12;
        draw(preview[i], W.ease(W.phase(t, start, start + p.span * .75)));
      }
      s.previewStatus.firstChild.data = 'Study: authored staggered reveals at ' + percentage(t) + '; native reveal positions are unchanged.';
    }
    const targets = [s.port, s.nativeContent, grid];
    for (const item of native) targets.push(item.box);
    observe(m, targets, () => { for (const item of native) item.top = positionInPort(item.box, s.port, 'y'); driver.refresh(); render(last); });
    return render;
  });

  register('web.scroll-native-section-snap', 'Native section snap / 原生分节吸附', {
    viewportHeight: [180, 360], axis: ['vertical', 'horizontal'], strictness: ['proximity', 'mandatory']
  }, (m, p) => {
    const s = panels(m, p, 'Native section snap');
    const horizontal = p.axis === 'horizontal';
    const axis = horizontal ? 'x' : 'y';
    s.port.style.scrollSnapType = m.reduced ? 'none' : axis + ' ' + p.strictness;
    s.port.style.scrollPadding = '0px';
    s.nativeContent.style.display = horizontal ? 'flex' : 'block';
    s.nativeContent.style.width = '100%';
    const names = ['01 / Source', '02 / River', '03 / Ridge', '04 / Arrival'];
    const nativeSections = [];
    const offsets = [0, 0, 0, 0];
    for (let i = 0; i < names.length; i++) {
      const section = m.el('section', null, 'box-sizing:border-box;flex:0 0 100%;min-width:0;min-height:' + p.viewportHeight + 'px;padding:24px 18px;scroll-snap-align:start;border-bottom:1px solid #76a3b0;background:' + (i % 2 ? '#285366' : '#214754') + ';', s.nativeContent);
      section.tabIndex = 0;
      m.el('h4', names[i], 'margin:0 0 14px;font-size:20px;', section);
      m.el('p', 'A real section in the native scrollport. Focus and browser scrolling remain native; the study cannot select or scroll this section.', 'margin:0;max-width:34ch;color:' + muted + ';', section);
      nativeSections.push(section);
    }
    if (horizontal) s.port.style.overflowY = 'auto';
    const clip = m.el('div', null, 'position:relative;height:138px;overflow:hidden;border-radius:8px;', s.preview);
    const track = m.el('div', null, 'position:relative;display:' + (horizontal ? 'flex' : 'block') + ';width:100%;', clip);
    const previewSections = [];
    for (let i = 0; i < names.length; i++) previewSections.push(m.el('div', names[i], 'box-sizing:border-box;flex:0 0 100%;min-width:0;height:138px;display:grid;place-items:center;border:1px solid #76a3b0;background:' + (i % 2 ? '#285366' : '#214754') + ';font-size:20px;', track));
    if (m.reduced) {
      clip.style.height = 'auto'; track.style.display = 'grid'; track.style.gridTemplateColumns = 'repeat(2,minmax(0,1fr))'; track.style.gap = '6px';
      for (const section of previewSections) { section.style.height = '80px'; section.style.fontSize = '15px'; }
    }
    let previewExtent = 0;
    let last = 0;
    const driver = nativeDriver(m, s.port, axis, state => {
      let index = 0;
      let distance = Math.abs(state.position - offsets[0]);
      for (let i = 1; i < offsets.length; i++) {
        const next = Math.abs(state.position - offsets[i]);
        if (next < distance) { distance = next; index = i; }
      }
      for (let i = 0; i < nativeSections.length; i++) if (i === index) nativeSections[i].setAttribute('aria-current', 'location'); else nativeSections[i].removeAttribute('aria-current');
      s.nativeStatus.firstChild.data = 'Native nearest section: ' + names[index] + '; CSS ' + axis + ' ' + (m.reduced ? 'snap disabled, free scrolling.' : p.strictness + ' snap.');
    });
    function render(t) {
      last = t;
      const index = Math.min(3, Math.floor(t * 4));
      track.style.transform = m.reduced ? 'none' : 'translate' + (horizontal ? 'X' : 'Y') + '(' + (-previewExtent * index / 3) + 'px)';
      for (let i = 0; i < previewSections.length; i++) previewSections[i].style.borderColor = i === index ? accent : '#76a3b0';
      s.previewStatus.firstChild.data = 'Study section ' + (index + 1) + '; this discrete schematic does not emulate browser snap inertia or alter focus.';
    }
    observe(m, [s.port, s.nativeContent, clip, track], () => {
      for (let i = 0; i < nativeSections.length; i++) offsets[i] = positionInPort(nativeSections[i], s.port, axis);
      previewExtent = horizontal ? Math.max(0, track.scrollWidth - clip.clientWidth) : Math.max(0, track.scrollHeight - clip.clientHeight);
      driver.refresh(); render(last);
    });
    return render;
  });

  register('web.scroll-native-sticky-pin', 'Native sticky pin / 原生粘性钉住', {
    viewportHeight: [180, 360], pinTop: [0, 24], holdScreens: [1.5, 4]
  }, (m, p) => {
    const s = panels(m, p, 'Native sticky pin');
    m.el('p', 'Approach / 接近：the anchored card has not reached its sticky inset yet.', 'box-sizing:border-box;min-height:120px;margin:0;padding:18px 14px;color:' + muted + ';', s.nativeContent);
    const host = m.el('section', null, 'position:relative;box-sizing:border-box;min-height:' + Math.round(p.holdScreens * p.viewportHeight) + 'px;background:#1c3b4a;', s.nativeContent);
    const sentinel = m.el('div', null, 'height:0;', host);
    sentinel.setAttribute('aria-hidden', 'true');
    function card(parent, native) {
      const node = m.el('div', null, 'position:' + (native && !m.reduced ? 'sticky' : native ? 'relative' : 'absolute') + ';top:' + p.pinTop + 'px;left:0;right:0;z-index:1;box-sizing:border-box;padding:14px;border:1px solid #76a3b0;border-radius:8px;background:#285366;', parent);
      m.el('strong', 'ANCHOR / 阅读锚点', 'display:block;margin-bottom:8px;font-size:16px;', node);
      const line = m.el('div', null, 'height:6px;border-radius:5px;background:' + accent + ';transform-origin:left center;', node);
      m.el('p', 'CSS owns pin and release.', 'margin:8px 0 0;font-size:12px;color:' + muted + ';', node);
      return { node, line };
    }
    const native = card(host, true);
    const paragraphs = [
      ['Pin / 钉住', 'The sticky card remains inside this section; it is not fixed to the document or reparented.'],
      ['Hold / 保持', 'The containing block supplies a real pin distance. These paragraphs remain selectable and readable.'],
      ['Release / 释放', 'The sticky card leaves with the bottom edge of its own containing block.']
    ];
    for (let i = 0; i < paragraphs.length; i++) {
      const section = m.el('article', null, 'box-sizing:border-box;min-height:' + Math.round(p.holdScreens * p.viewportHeight / 3) + 'px;padding:18px 14px;border-top:1px solid #526b80;', host);
      m.el('h4', paragraphs[i][0], 'margin:0 0 8px;font-size:16px;', section);
      m.el('p', paragraphs[i][1], 'margin:0;color:' + muted + ';', section);
    }
    m.el('p', 'After / 离开：the native card is released. This trailing content makes the release boundary reachable.', 'box-sizing:border-box;min-height:' + p.viewportHeight + 'px;margin:0;padding:18px 14px;color:' + muted + ';', s.nativeContent);
    const clip = m.el('div', null, 'position:relative;height:180px;overflow:hidden;background:linear-gradient(#315767,#193244);border-radius:8px;', s.preview);
    m.el('p', 'Approach → hold → release', 'position:absolute;left:10px;right:10px;bottom:8px;margin:0;font-size:12px;color:' + muted + ';', clip);
    const preview = card(clip, false);
    let start = 0;
    let end = 1;
    let origin = 0;
    let range = 1;
    let viewport = p.viewportHeight;
    let last = 0;
    function phaseName(position) { return position < start ? 'approach' : position <= end ? 'pinned' : 'released'; }
    const driver = nativeDriver(m, s.port, 'y', state => {
      const q = W.phase(state.position, start, end);
      native.line.style.transform = 'scaleX(' + q + ')';
      s.nativeStatus.firstChild.data = 'Native: ' + (m.reduced ? 'ordinary-flow card; ' : phaseName(state.position) + '; ') + 'measured pin range ' + Math.round(start) + '–' + Math.round(end) + 'px.';
    });
    function render(t) {
      last = t;
      const virtualPosition = range * t;
      const compensation = W.clamp(virtualPosition - start, 0, Math.max(0, end - start));
      const y = (origin - virtualPosition + compensation) * 180 / Math.max(1, viewport);
      preview.node.style.top = m.reduced ? '10px' : y + 'px';
      preview.line.style.transform = 'scaleX(' + W.phase(virtualPosition, start, end) + ')';
      s.previewStatus.firstChild.data = 'Study: ' + (m.reduced ? 'static anchored card' : phaseName(virtualPosition)) + ', computed from cached geometry; no native scrolling is commanded.';
    }
    observe(m, [s.port, s.nativeContent, host, native.node, clip], () => {
      viewport = s.port.clientHeight;
      origin = positionInPort(sentinel, s.port, 'y');
      start = origin - p.pinTop;
      end = Math.max(start + 1, positionInPort(host, s.port, 'y') + host.getBoundingClientRect().height - native.node.getBoundingClientRect().height - p.pinTop);
      range = Math.max(0, s.port.scrollHeight - viewport);
      driver.refresh(); render(last);
    });
    return render;
  });

  register('web.scroll-segmented-text', 'Scroll-resolved text units / 滚动逐单元释文', {
    viewportHeight: [180, 360], unit: ['grapheme', 'word'], spread: [.15, .85], travel: [0, 28]
  }, (m, p, options) => {
    const s = panels(m, p, 'Scroll-resolved text units');
    const text = typeof options.text === 'string' ? options.text : '沿河而行，读懂每一处转折。 Follow the river, find the route.';
    const IntlAPI = m.doc.defaultView && m.doc.defaultView.Intl;
    if (!IntlAPI || typeof IntlAPI.Segmenter !== 'function') throw new Error('Scroll text requires Intl.Segmenter for real grapheme/word boundaries');
    const segments = [];
    for (const item of new IntlAPI.Segmenter(undefined, { granularity: p.unit }).segment(text)) segments.push(item.segment);
    function paragraph(parent, sticky) {
      const box = m.el('div', null, 'position:' + (sticky && !m.reduced ? 'sticky' : 'relative') + ';top:0;z-index:1;box-sizing:border-box;padding:14px;background:#183747;border-bottom:1px solid #526b80;', parent);
      const semantic = m.el('p', null, 'position:relative;margin:0;font-size:22px;font-weight:650;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere;', box);
      m.el('span', text, screenReaderText, semantic);
      const visualText = m.el('span', null, null, semantic);
      visualText.setAttribute('aria-hidden', 'true');
      const units = [];
      for (const segment of segments) {
        const whitespace = /^\s+$/u.test(segment);
        const unit = m.el('span', segment, whitespace ? 'white-space:pre-wrap;' : 'display:inline-block;vertical-align:baseline;white-space:pre-wrap;', visualText);
        if (!whitespace) units.push(unit);
      }
      return { box, units };
    }
    const native = paragraph(s.nativeContent, true);
    narrative(m, s.nativeContent, p.viewportHeight, [
      ['Full semantic text', 'Assistive technology receives the original paragraph once; decorative segments are hidden from the accessibility tree.'],
      ['Real units', 'Intl.Segmenter preserves grapheme clusters or native-language word boundaries, including CJK and emoji.'],
      ['Resolve', 'Measured scroll position resolves each actual unit. Reduced motion presents the complete, fully opaque text without lift.']
    ]);
    const preview = paragraph(s.preview, false);
    let last = 0;
    function draw(item, t) {
      const denominator = Math.max(1, item.units.length - 1);
      for (let i = 0; i < item.units.length; i++) {
        const start = i / denominator * p.spread;
        const q = m.reduced ? 1 : W.ease(W.phase(t, start, start + 1 - p.spread));
        item.units[i].style.opacity = String(.2 + .8 * q);
        item.units[i].style.transform = m.reduced ? 'none' : 'translateY(' + ((1 - q) * p.travel) + 'px)';
      }
    }
    const driver = nativeDriver(m, s.port, 'y', state => { draw(native, state.progress); s.nativeStatus.firstChild.data = 'Native: ' + percentage(state.progress) + ', ' + native.units.length + ' real ' + p.unit + ' reveal units; semantic paragraph stays complete.'; });
    function render(t) { last = t; draw(preview, t); s.previewStatus.firstChild.data = 'Study: ' + percentage(t) + ', spread ' + p.spread + '; no native progress or text mutation.'; }
    observe(m, [s.port, s.nativeContent, native.box, preview.box], () => { driver.refresh(); render(last); });
    return render;
  });

  register('web.scroll-measured-velocity', 'Measured scroll velocity skew / 测量滚速倾斜', {
    viewportHeight: [180, 360], gain: [.002, .03], maxSkew: [1, 14], previewSpeed: [100, 1400]
  }, (m, p) => {
    const s = panels(m, p, 'Measured scroll velocity skew');
    function paper(parent, sticky) {
      const box = visual(m, parent, 152, sticky);
      const sheet = m.el('div', null, 'box-sizing:border-box;height:100%;padding:12px 18px;border:1px solid #76a3b0;border-radius:8px;background:#285366;transform-origin:center center;', box);
      sheet.setAttribute('aria-hidden', 'true');
      m.el('div', 'RIVER NOTES / 沿河记录', 'color:' + gold + ';font-size:18px;font-weight:700;', sheet);
      for (let i = 0; i < 3; i++) m.el('div', null, 'height:5px;width:' + (90 - i * 18) + '%;margin-top:12px;background:' + accent + ';border-radius:4px;', sheet);
      return sheet;
    }
    const native = paper(s.nativeContent, true);
    narrative(m, s.nativeContent, p.viewportHeight, [
      ['Measure', 'Native velocity uses consecutive real scroll offsets and the actual scroll-event timestamp difference, in pixels per second.'],
      ['Direction', 'Positive and negative scroll deltas produce opposite signed skews. Repeated or nonpositive timestamps do not invent a speed.'],
      ['Settle', 'Native scrollend, blur, pointercancel or document hiding resets skew. Reduced motion retains measured velocity text but removes deformation.']
    ]);
    const preview = paper(s.preview, false);
    let last = 0;
    function draw(node, velocity) { node.style.transform = m.reduced ? 'none' : 'skewY(' + W.clamp(velocity * p.gain, -p.maxSkew, p.maxSkew) + 'deg)'; }
    const driver = nativeDriver(m, s.port, 'y', state => {
      draw(native, state.velocity);
      s.nativeStatus.firstChild.data = 'Native measured velocity: ' + Math.round(state.velocity) + 'px/s; position ' + percentage(state.progress) + '. No preview derivative is used.';
    });
    function authoredVelocity(t) {
      if (t > .08 && t < .4) return p.previewSpeed * Math.sin(Math.PI * W.phase(t, .08, .4));
      if (t > .55 && t < .88) return -p.previewSpeed * Math.sin(Math.PI * W.phase(t, .55, .88));
      return 0;
    }
    function render(t) {
      last = t;
      const velocity = authoredVelocity(t);
      draw(preview, velocity);
      s.previewStatus.firstChild.data = 'Authored study velocity: ' + Math.round(velocity) + 'px/s; forward pulse .08–.40, reverse pulse .55–.88, otherwise neutral.';
    }
    observe(m, [s.port, s.nativeContent, s.preview], () => { driver.refresh(); render(last); });
    return render;
  });

  return { recipes };
}

function buildWebInput(W) {
  const recipes = {};
  let instance = 0;
  const buttonCSS = 'box-sizing:border-box;min-height:44px;padding:10px 16px;border:1px solid #8eb8cb;border-radius:10px;background:#24465d;color:#f4fbff;font:600 14px/1.4 system-ui;cursor:pointer;';
  const surfaceCSS = 'position:relative;box-sizing:border-box;width:100%;max-width:360px;min-width:0;height:190px;border:1px solid #66889e;border-radius:12px;background:#17374b;overflow:hidden;';
  const cardCSS = 'box-sizing:border-box;border:2px solid #66d6bd;border-radius:12px;background:#28556b;color:#f4fbff;font:600 14px/1.4 system-ui;';

  function register(name, title, schema, build, extraValidate) {
    const id = 'web.' + name;
    function validate(p) {
      W.validate(p, schema);
      if (extraValidate) extraValidate(p);
    }
    recipes[id] = { title, validate, create(stage, p, options) {
      validate(p);
      return build(setup(stage, id, options), p);
    } };
    return id;
  }
  function setup(stage, id, options) {
    const m = W.mount(stage, id, options);
    m.root.id = 'motion-web-input-' + (++instance);
    m.root.style.cssText = 'box-sizing:border-box;min-width:0;width:100%;padding:16px;display:grid;gap:14px;border-radius:14px;background:#102334;color:#e8f2ff;font:14px/1.5 system-ui,sans-serif;';
    m.el('style', '#' + m.root.id + ' :focus-visible{outline:3px solid #ffe989;outline-offset:3px}#' + m.root.id + ' button:active{border-color:#ffe989}#' + m.root.id + ' [hidden]{display:none!important}#' + m.root.id + ' button:disabled{opacity:.55;cursor:default}', null, m.root);
    m.el('p', '独立时间轴研究 / Independent timeline study — seeking never changes native input below.', 'margin:0;color:#bed7e8;');
    const study = m.el('div', null, 'position:relative;min-width:0;padding:12px;border:1px solid #55758b;border-radius:12px;', m.root);
    study.setAttribute('aria-hidden', 'true');
    study.inert = true;
    const live = m.el('section', null, 'min-width:0;padding:12px;border:1px solid #55758b;border-radius:12px;', m.root);
    live.dataset.nativeInput = id;
    m.el('h3', '原生交互 · 仅本地 / Native interaction · local only', 'margin:0 0 10px;font-size:15px;', live);
    const status = m.el('p', 'Local state: ready / 本地状态：待操作', 'margin:10px 0 0;color:#bed7e8;', live);
    status.setAttribute('role', 'status');
    return { m, study, live, status };
  }
  function button(m, text, parent, handler) {
    const b = m.el('button', text, buttonCSS, parent);
    if (handler) m.listen(b, 'click', handler);
    return b;
  }
  function controls(m, parent) {
    return m.el('div', null, 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-block-start:10px;', parent);
  }
  function surface(m, parent, height = 190) {
    return m.el('div', null, surfaceCSS + 'height:' + height + 'px;', parent);
  }
  function instruction(m, parent, text) {
    return m.el('p', text, 'margin:0 0 10px;color:#bed7e8;', parent);
  }
  function integral(p, key) {
    if (!Number.isInteger(p[key])) throw new RangeError('Web ' + key + ' must be an integer');
  }
  function relative(e, el, width = 1, height = 1) {
    const r = el.getBoundingClientRect();
    return { x: W.clamp((e.clientX - r.left) / Math.max(1, r.width)) * width,
      y: W.clamp((e.clientY - r.top) / Math.max(1, r.height)) * height };
  }
  function releaseCapture(el, id) {
    try { if (el.hasPointerCapture(id)) el.releasePointerCapture(id); } catch (_) { /* Pointer may already be released by the browser. */ }
  }
  function translate(el, x, y) { el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
  function visualOffset(m, el, axis) {
    const value = m.doc.defaultView.getComputedStyle(el).transform;
    const parts = value === 'none' ? [] : value.slice(value.indexOf('(') + 1, -1).split(',').map(Number);
    return parts.length === 16 ? parts[axis === 'x' ? 12 : 13] : parts.length === 6 ? parts[axis === 'x' ? 4 : 5] : 0;
  }
  function finiteMotion(m) {
    const active = new Map();
    function cancel(el) {
      const a = active.get(el);
      if (!a) return;
      active.delete(el);
      a.onfinish = null;
      a.cancel();
    }
    function play(el, frames, duration, easing = 'cubic-bezier(.2,.8,.2,1)') {
      cancel(el);
      if (m.reduced || duration <= 0 || typeof el.animate !== 'function') return null;
      const a = el.animate(frames, { duration, easing, iterations: 1, fill: 'none' });
      active.set(el, a);
      a.onfinish = () => { if (active.get(el) === a) { active.delete(el); a.onfinish = null; a.cancel(); } };
      return a;
    }
    function retarget(el, transform, duration) {
      const from = m.doc.defaultView.getComputedStyle(el).transform;
      el.style.transform = transform;
      return play(el, [{ transform: from }, { transform }], duration);
    }
    m.onDispose(() => { for (const el of Array.from(active.keys())) cancel(el); });
    return { play, cancel, retarget };
  }
  function drag(m, el, handlers) {
    let active = null;
    el.style.touchAction = 'none';
    function clear(e, cancelled) {
      if (!active) return;
      if (e && e.pointerId !== undefined && e.pointerId !== active.id) return;
      const session = active;
      active = null;
      releaseCapture(el, session.id);
      if (cancelled) handlers.cancel(session, e);
      else { if (e) handlers.move(session, e); handlers.end(session, e); }
    }
    m.listen(el, 'pointerdown', e => {
      if (active || e.button !== 0 || e.isPrimary === false) return;
      const session = { id: e.pointerId, x: e.clientX, y: e.clientY, time: e.timeStamp };
      if (handlers.start(session, e) === false) return;
      active = session;
      e.preventDefault();
      el.focus({ preventScroll: true });
      try { el.setPointerCapture(session.id); } catch (_) { /* Document listeners also cover release outside the target. */ }
    });
    m.listen(m.doc, 'pointermove', e => { if (active && e.pointerId === active.id) { e.preventDefault(); handlers.move(active, e); } }, { passive: false });
    m.listen(m.doc, 'pointerup', e => clear(e, false));
    m.listen(m.doc, 'pointercancel', e => clear(e, true));
    m.listen(el, 'lostpointercapture', e => clear(e, true));
    m.listen(el, 'blur', e => clear(e, true));
    m.listen(el, 'keydown', e => { if (e.key === 'Escape' && active) { e.preventDefault(); clear(e, true); } });
    m.listen(m.doc.defaultView, 'blur', e => clear(e, true));
    m.listen(m.doc, 'visibilitychange', e => { if (m.doc.hidden) clear(e, true); });
    m.onDispose(() => clear(null, true));
    return { cancel() { clear(null, true); }, isActive() { return active !== null; } };
  }
  function pointerField(m, hit, draw, activate) {
    let x = .5, y = .5, hovered = false, focused = false;
    function update() { draw(x, y, hovered || focused); }
    m.listen(hit, 'pointerenter', e => { if (e.pointerType !== 'touch') { hovered = true; const pt = relative(e, hit); x = pt.x; y = pt.y; update(); } });
    m.listen(hit, 'pointermove', e => { const pt = relative(e, hit); x = pt.x; y = pt.y; hovered = true; update(); });
    m.listen(hit, 'pointerleave', () => { hovered = false; x = .5; y = .5; update(); });
    m.listen(hit, 'pointercancel', () => { hovered = false; x = .5; y = .5; update(); });
    m.listen(hit, 'focus', () => { focused = true; x = .5; y = .5; update(); });
    m.listen(hit, 'blur', () => { focused = false; hovered = false; x = .5; y = .5; update(); });
    m.listen(hit, 'keydown', e => {
      const changes = { ArrowLeft: [-.1, 0], ArrowRight: [.1, 0], ArrowUp: [0, -.1], ArrowDown: [0, .1] };
      if (changes[e.key]) { e.preventDefault(); x = W.clamp(x + changes[e.key][0]); y = W.clamp(y + changes[e.key][1]); update(); }
      else if (e.key === 'Escape' || e.key === 'Home') { e.preventDefault(); x = .5; y = .5; update(); }
    });
    if (activate) m.listen(hit, 'click', activate);
    m.listen(m.doc.defaultView, 'blur', () => { hovered = focused = false; x = y = .5; update(); });
    update();
  }
  function graphic(m, parent, label, width = 360, height = 190) {
    const s = m.svg('svg', { viewBox: '0 0 ' + width + ' ' + height, width: '100%', height, 'aria-hidden': 'true' }, parent);
    if (label) m.svg('text', { x: 14, y: 24, fill: '#e8f2ff', 'font-size': 13 }, s).textContent = label;
    return s;
  }
  function dot(m, parent, size, color) {
    return m.el('span', null, 'position:absolute;inset-inline-start:0;inset-block-start:0;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + color + ';pointer-events:none;', parent);
  }

  const fill = register('hover-fill-clip', '悬停填充裁切 / Hover fill clip', { durationMs: [80, 300] }, ({ m, study, live, status }, p) => {
    instruction(m, live, 'Hover or focus; Enter/Space activates the local sample / 悬停或聚焦，回车或空格激活。');
    const preview = m.el('div', null, buttonCSS + 'position:relative;display:inline-grid;place-items:center;min-width:220px;overflow:hidden;', study);
    const pf = m.el('span', null, 'position:absolute;inset:0;background:#258472;', preview);
    m.el('span', 'Fill study / 填充研究', 'position:relative;color:#fff;text-shadow:0 1px 2px #102334;', preview);
    const native = button(m, '', live);
    native.style.cssText += 'position:relative;min-width:220px;overflow:hidden;';
    const nf = m.el('span', null, 'position:absolute;inset:0;background:#258472;clip-path:inset(0 100% 0 0);pointer-events:none;', native);
    m.el('span', 'Activate / 激活', 'position:relative;color:#fff;text-shadow:0 1px 2px #102334;', native);
    const motion = finiteMotion(m);
    let activations = 0, engaged = null;
    pointerField(m, native, (_x, _y, on) => {
      if (engaged === on) return;
      engaged = on;
      const from = m.doc.defaultView.getComputedStyle(nf).clipPath;
      const clipPath = on ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)';
      nf.style.clipPath = clipPath;
      motion.play(nf, [{ clipPath: from }, { clipPath }], p.durationMs);
    }, () => { status.textContent = 'Local activations / 本地激活：' + (++activations); });
    return m.finish(t => { const q = m.reduced ? 1 : W.ease(t); pf.style.clipPath = 'inset(0 ' + (100 * (1 - q)) + '% 0 0)'; });
  });

  const spotlight = register('pointer-radial-spotlight', '指针径向光场 / Pointer radial spotlight', { radius: [36, 180], strength: [.1, .7] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study), native = button(m, 'Pointer spotlight / 指针光场', live);
    native.style.cssText += 'display:block;width:100%;max-width:360px;height:190px;';
    m.el('p', 'Light field study / 光场研究', 'padding:24px;', preview);
    function paint(el, x, y, active) {
      el.style.background = active ? 'radial-gradient(circle ' + p.radius + 'px at ' + (x * 100) + '% ' + (y * 100) + '%,rgba(102,214,189,' + p.strength + '),transparent 100%),#17374b' : '#17374b';
    }
    let count = 0;
    pointerField(m, native, (x, y, active) => paint(native, m.reduced ? .5 : x, m.reduced ? .5 : y, active), () => { status.textContent = 'Local activations / 本地激活：' + (++count); });
    instruction(m, live, 'Move the pointer or use Arrow keys when focused; Home resets / 移动指针或聚焦后用方向键，Home 复位。');
    return m.finish(t => paint(preview, m.reduced ? .5 : W.mix(.15, .85, W.ease(t)), m.reduced ? .5 : .65 - .35 * Math.sin(Math.PI * t), true));
  });

  const ripple = register('tap-origin-ripple', '点击原点波纹 / Tap-origin ripple', { radius: [60, 260], durationMs: [120, 600] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study, 130), native = button(m, 'Ripple locally / 本地波纹', live);
    native.style.cssText += 'position:relative;display:block;width:100%;max-width:360px;height:130px;overflow:hidden;';
    const pr = dot(m, preview, p.radius * 2, '#66d6bd'), nr = dot(m, native, p.radius * 2, '#66d6bd');
    nr.style.opacity = '0';
    const motion = finiteMotion(m);
    let origin = null, count = 0;
    m.listen(native, 'pointerdown', e => { if (e.button === 0) origin = relative(e, native); });
    m.listen(native, 'pointercancel', () => { origin = null; motion.cancel(nr); nr.style.opacity = '0'; });
    m.listen(native, 'blur', () => { origin = null; motion.cancel(nr); nr.style.opacity = '0'; });
    m.listen(native, 'click', e => {
      const pt = e.detail === 0 || !origin ? { x: .5, y: .5 } : origin;
      origin = null;
      nr.style.left = (pt.x * 100) + '%'; nr.style.top = (pt.y * 100) + '%';
      nr.style.transform = 'translate(-50%,-50%) scale(1)'; nr.style.opacity = '0';
      if (!m.reduced) motion.play(nr, [{ transform: 'translate(-50%,-50%) scale(0)', opacity: .7 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }], p.durationMs);
      status.textContent = 'Local activation ' + (++count) + ' / 本地激活；origin ' + Math.round(pt.x * 100) + '%, ' + Math.round(pt.y * 100) + '%';
    });
    return m.finish(t => {
      pr.style.left = '32%'; pr.style.top = '60%';
      pr.style.transform = 'translate(-50%,-50%) scale(' + (m.reduced ? .7 : W.ease(t)) + ')';
      pr.style.opacity = String(m.reduced ? .3 : .7 * (1 - t));
    });
  });

  const follow = register('pointer-lag-follower', '指针迟滞跟随 / Pointer lag follower', { lagMs: [0, 240], cursorSize: [12, 36] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study), native = button(m, '', live);
    native.setAttribute('aria-label', 'Cursor follower: Arrow keys move the target; Home resets');
    native.style.cssText += 'position:relative;display:block;width:100%;max-width:360px;height:190px;overflow:hidden;';
    const pt = dot(m, preview, 8, '#ffe989'), pf = dot(m, preview, p.cursorSize, '#66d6bd');
    const nt = dot(m, native, 8, '#ffe989'), nf = dot(m, native, p.cursorSize, '#66d6bd');
    const motion = finiteMotion(m);
    function draw(x, y) {
      const r = native.getBoundingClientRect(), px = x * Math.max(0, r.width - p.cursorSize), py = y * Math.max(0, r.height - p.cursorSize);
      translate(nt, px + p.cursorSize / 2 - 4, py + p.cursorSize / 2 - 4);
      motion.retarget(nf, 'translate(' + px + 'px,' + py + 'px)', p.lagMs);
    }
    pointerField(m, native, draw, () => { draw(.5, .5); status.textContent = 'Local target reset / 本地目标已居中'; });
    instruction(m, live, 'Yellow is the target, green follows with finite retargetable lag / 黄色为目标，绿色有限迟滞跟随。');
    return m.finish(t => {
      const q = m.reduced ? 1 : W.ease(W.phase(t, 0, .75)), delayed = m.reduced ? 1 : W.ease(W.phase(t, p.lagMs / 1600, .75 + p.lagMs / 1600));
      pt.style.left = (15 + 70 * q) + '%'; pt.style.top = '46%';
      pf.style.left = (15 + 70 * delayed) + '%'; pf.style.top = '42%';
    });
  });

  const lift = register('hover-depth-lift', '悬停抬升层级 / Hover depth lift', { liftPx: [4, 24], durationMs: [80, 300] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study), native = button(m, 'Save sample / 保存示例', live);
    const pc = m.el('div', 'Depth study / 层级研究', cardCSS + 'width:75%;margin:45px auto;padding:24px;', preview);
    native.style.cssText += 'width:75%;min-height:90px;margin:25px 0;';
    const motion = finiteMotion(m);
    let saved = false, engaged = null;
    pointerField(m, native, (_x, _y, on) => {
      if (engaged === on) return;
      engaged = on;
      motion.retarget(native, 'translateY(' + (on && !m.reduced ? -p.liftPx : 0) + 'px)', p.durationMs);
      native.style.boxShadow = on ? '0 12px 24px rgba(0,0,0,.45)' : '0 2px 5px rgba(0,0,0,.25)';
    }, () => { saved = !saved; native.setAttribute('aria-pressed', String(saved)); status.textContent = saved ? 'Saved locally / 已本地保存' : 'Not saved / 未保存'; });
    native.setAttribute('aria-pressed', 'false');
    return m.finish(t => { const q = m.reduced ? 1 : W.ease(t); pc.style.transform = m.reduced ? 'none' : 'translateY(' + (-p.liftPx * q) + 'px)'; pc.style.boxShadow = '0 ' + (2 + 10 * q) + 'px ' + (5 + 19 * q) + 'px rgba(0,0,0,.45)'; });
  });

  const magnet = register('magnetic-pointer-offset', '磁吸指针偏移 / Magnetic pointer offset', { reachPx: [4, 28], durationMs: [60, 240] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study), hit = surface(m, live), pc = m.el('div', 'Magnet study / 磁吸研究', buttonCSS + 'position:absolute;inset-inline-start:calc(50% - 90px);inset-block-start:65px;width:180px;text-align:center;', preview);
    const native = button(m, 'Activate magnet / 激活磁吸', hit);
    native.style.cssText += 'position:absolute;inset-inline-start:calc(50% - 90px);inset-block-start:65px;width:180px;';
    const motion = finiteMotion(m);
    let count = 0, focused = false;
    function draw(x, y, on) { motion.retarget(native, 'translate(' + (m.reduced || !on ? 0 : (x - .5) * 2 * p.reachPx) + 'px,' + (m.reduced || !on ? 0 : (y - .5) * 2 * p.reachPx) + 'px)', p.durationMs); }
    m.listen(hit, 'pointermove', e => { const pt = relative(e, hit); draw(pt.x, pt.y, true); });
    m.listen(hit, 'pointerleave', () => draw(.5, .5, focused));
    m.listen(hit, 'pointercancel', () => draw(.5, .5, false));
    pointerField(m, native, (x, y, on) => { focused = on; draw(x, y, on); }, () => { status.textContent = 'Local activations / 本地激活：' + (++count); });
    instruction(m, live, 'Stable outer hit area measures pointer position; focus + arrows are equivalent / 固定外框测量坐标，聚焦后方向键等价操作。');
    return m.finish(t => { pc.style.transform = m.reduced ? 'none' : 'translate(' + (Math.sin(t * Math.PI) * p.reachPx) + 'px,' + (Math.sin(t * Math.PI * 2) * p.reachPx / 2) + 'px)'; });
  });

  const tilt = register('pointer-perspective-tilt', '指针透视倾斜 / Pointer perspective tilt', { angleDeg: [3, 22], perspectivePx: [220, 900] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study), hit = surface(m, live), pc = m.el('div', 'Tilt study / 倾斜研究', cardCSS + 'width:75%;height:110px;margin:35px auto;display:grid;place-items:center;', preview);
    const native = button(m, 'Inspect sample / 查看示例', hit);
    native.style.cssText += 'width:75%;height:110px;margin:35px 12.5%;';
    function pose(x, y) { return m.reduced ? 'none' : 'perspective(' + p.perspectivePx + 'px) rotateX(' + ((.5 - y) * 2 * p.angleDeg) + 'deg) rotateY(' + ((x - .5) * 2 * p.angleDeg) + 'deg)'; }
    m.listen(hit, 'pointermove', e => { const pt = relative(e, hit); native.style.transform = pose(pt.x, pt.y); });
    m.listen(hit, 'pointerleave', () => { native.style.transform = pose(.5, .5); });
    pointerField(m, native, (x, y) => { native.style.transform = pose(x, y); }, () => { status.textContent = 'Local inspection selected / 已本地查看；no navigation / 无跳转'; });
    instruction(m, live, 'Move pointer or focus + arrows; Home resets the normal / 移动指针或聚焦后方向键，Home 恢复法线。');
    return m.finish(t => { pc.style.transform = pose(W.mix(.15, .85, W.ease(t)), .5 - .3 * Math.sin(t * Math.PI)); });
  });

  function lineMorph(from, to, q) {
    return from.map((line, i) => 'M' + W.mix(line[0], to[i][0], q) + ' ' + W.mix(line[1], to[i][1], q) + ' L' + W.mix(line[2], to[i][2], q) + ' ' + W.mix(line[3], to[i][3], q)).join(' ');
  }
  const menuLines = [[14, 18, 50, 18], [14, 32, 50, 32], [14, 46, 50, 46]];
  const closeLines = [[18, 18, 46, 46], [32, 32, 32, 32], [18, 46, 46, 18]];
  function glyph(m, parent, width = 64) {
    const s = m.svg('svg', { viewBox: '0 0 64 64', width, height: width, 'aria-hidden': 'true' }, parent);
    return m.svg('path', { d: '', fill: 'none', stroke: '#f4fbff', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s);
  }
  function nativePath(m, motion, path, from, to, duration) {
    const computed = m.doc.defaultView.getComputedStyle(path).d;
    const previous = computed && computed !== 'none' ? computed : 'path("' + from + '")';
    path.setAttribute('d', to);
    if (!m.reduced) motion.play(path, [{ d: previous }, { d: 'path("' + to + '")' }], duration);
  }
  const icon = register('menu-close-path-morph', '菜单关闭路径形变 / Menu-close path morph', { durationMs: [100, 300] }, ({ m, study, live, status }, p) => {
    const pg = glyph(m, study, 90), b = button(m, '', live), ng = glyph(m, b);
    b.setAttribute('aria-label', 'Switch local icon between menu and close / 切换本地图标');
    b.setAttribute('aria-pressed', 'false');
    const motion = finiteMotion(m);
    let closedGlyph = false;
    ng.setAttribute('d', lineMorph(menuLines, closeLines, 0));
    m.listen(b, 'click', () => {
      const from = lineMorph(menuLines, closeLines, closedGlyph ? 1 : 0);
      closedGlyph = !closedGlyph;
      const to = lineMorph(menuLines, closeLines, closedGlyph ? 1 : 0);
      b.setAttribute('aria-pressed', String(closedGlyph));
      nativePath(m, motion, ng, from, to, p.durationMs);
      status.textContent = 'Local glyph / 本地图标：' + (closedGlyph ? 'close / 关闭形' : 'menu / 菜单形') + '; no menu is opened / 不打开菜单';
    });
    m.listen(b, 'blur', () => motion.cancel(ng));
    return m.finish(t => { pg.setAttribute('d', lineMorph(menuLines, closeLines, m.reduced ? 1 : W.ease(t))); });
  });

  const toggle = register('toggle-thumb-glyph-morph', '开关滑块字形形变 / Toggle thumb-glyph morph', { durationMs: [100, 300] }, ({ m, study, live, status }, p) => {
    const off = [[17, 21, 39, 43], [17, 43, 39, 21]], on = [[15, 32, 25, 42], [25, 42, 43, 22]];
    function make(parent) {
      const s = m.svg('svg', { viewBox: '0 0 120 64', width: 150, height: 80, 'aria-hidden': 'true' }, parent);
      const track = m.svg('rect', { x: 2, y: 4, width: 116, height: 56, rx: 28, fill: '#45687d' }, s);
      const group = m.svg('g', {}, s);
      m.svg('circle', { cx: 28, cy: 32, r: 24, fill: '#102334' }, group);
      const path = m.svg('path', { d: '', stroke: '#f4fbff', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, group);
      return { track, group, path };
    }
    const pg = make(study), label = m.el('label', 'Enable local sample / 启用本地示例 ', 'display:flex;align-items:center;flex-wrap:wrap;gap:12px;', live);
    const input = m.el('input', null, 'width:22px;height:22px;', label); input.type = 'checkbox';
    const ng = make(label), motion = finiteMotion(m);
    function paint(g, q) { g.group.style.transform = 'translateX(' + (q * 64) + 'px)'; g.track.setAttribute('fill', q >= .5 ? '#258472' : '#45687d'); g.path.setAttribute('d', lineMorph(off, on, q)); }
    paint(ng, 0);
    m.listen(input, 'change', () => {
      const q = input.checked ? 1 : 0, from = lineMorph(off, on, q ? 0 : 1), previous = m.doc.defaultView.getComputedStyle(ng.group).transform;
      paint(ng, q);
      motion.play(ng.group, [{ transform: previous }, { transform: ng.group.style.transform }], p.durationMs);
      nativePath(m, motion, ng.path, from, lineMorph(off, on, q), p.durationMs);
      status.textContent = input.checked ? 'Native checked: on / 原生选中：开' : 'Native checked: off / 原生选中：关';
    });
    m.listen(input, 'blur', () => { motion.cancel(ng.group); motion.cancel(ng.path); });
    return m.finish(t => paint(pg, m.reduced ? 1 : W.ease(t)));
  });

  function cubic(a, b, c, d, t) {
    const u = 1 - t;
    return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
      y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y };
  }
  function curvePath(a, b, c, d) { return 'M' + a.x + ' ' + a.y + ' C' + b.x + ' ' + b.y + ' ' + c.x + ' ' + c.y + ' ' + d.x + ' ' + d.y; }
  const arc = register('cursor-cubic-arc', '光标三次弧线 / Cursor cubic arc', { bendPx: [20, 110], durationMs: [80, 300] }, ({ m, study, live, status }, p) => {
    const ps = graphic(m, study, 'Cubic cursor path / 三次光标弧线'), hit = button(m, '', live);
    hit.style.cssText += 'display:block;width:100%;max-width:360px;height:190px;padding:0;';
    hit.setAttribute('aria-label', 'Arc cursor: point or use Arrow keys, Home resets');
    const ns = graphic(m, hit), pp = m.svg('path', { fill: 'none', stroke: '#66889e', 'stroke-width': 2 }, ps), np = m.svg('path', { fill: 'none', stroke: '#66889e', 'stroke-width': 2 }, ns);
    const pd = m.svg('circle', { r: 8, fill: '#66d6bd' }, ps), nd = m.svg('circle', { cx: 0, cy: 0, r: 8, fill: '#66d6bd' }, ns);
    const motion = finiteMotion(m);
    translate(nd, 180, 95);
    function native(x, y) {
      const current = { x: visualOffset(m, nd, 'x'), y: visualOffset(m, nd, 'y') };
      const dest = { x: 20 + x * 320, y: 25 + y * 140 }, dx = dest.x - current.x, dy = dest.y - current.y, length = Math.hypot(dx, dy);
      if (length < .01) return;
      const bend = Math.min(p.bendPx, length * .45), nx = -dy / length, ny = dx / length;
      const b = { x: W.clamp(current.x + dx / 3 + nx * bend, 12, 348), y: W.clamp(current.y + dy / 3 + ny * bend, 12, 178) };
      const c = { x: W.clamp(current.x + dx * 2 / 3 + nx * bend, 12, 348), y: W.clamp(current.y + dy * 2 / 3 + ny * bend, 12, 178) };
      np.setAttribute('d', curvePath(current, b, c, dest));
      nd.style.transform = 'translate(' + dest.x + 'px,' + dest.y + 'px)';
      const frames = Array.from({ length: 9 }, (_, i) => { const point = cubic(current, b, c, dest, i / 8); return { transform: 'translate(' + point.x + 'px,' + point.y + 'px)', offset: i / 8 }; });
      motion.play(nd, frames, p.durationMs, 'linear');
    }
    pointerField(m, hit, native, () => { native(.5, .5); status.textContent = 'Local cursor endpoint reset / 本地光标端点已复位'; });
    const a = { x: 30, y: 145 }, b = { x: 105, y: 145 - p.bendPx }, c = { x: 245, y: 125 - p.bendPx }, d = { x: 330, y: 125 };
    pp.setAttribute('d', curvePath(a, b, c, d));
    return m.finish(t => { const point = cubic(a, b, c, d, m.reduced ? 1 : W.ease(t)); pd.setAttribute('cx', point.x); pd.setAttribute('cy', point.y); });
  });

  const fan = register('shared-pivot-card-fan', '共享枢轴卡片扇形 / Shared-pivot card fan', { count: [3, 7], spreadDeg: [8, 24], durationMs: [80, 300] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study, 240), native = surface(m, live, 240), motion = finiteMotion(m);
    const pc = [], nc = [];
    for (let i = 0; i < p.count; i++) {
      const css = cardCSS + 'position:absolute;inset-inline-start:calc(50% - 36px);inset-block-end:40px;width:72px;height:110px;padding:10px 4px;transform-origin:50% 140px;';
      pc.push(m.el('div', 'Card ' + (i + 1), css, preview));
      const b = m.el('button', 'Card ' + (i + 1), css, native);
      b.dataset.cardIdentity = 'fan-card-' + i;
      nc.push(b);
      m.listen(b, 'click', () => { status.textContent = 'Local card selected / 本地卡片选中：' + (i + 1); });
      m.listen(b, 'focus', () => { b.style.zIndex = String(p.count + 1); });
      m.listen(b, 'blur', () => { b.style.zIndex = String(i); });
    }
    function pose(cards, q, animate) {
      cards.forEach((card, i) => {
        const transform = 'rotate(' + ((i - (p.count - 1) / 2) * p.spreadDeg * q) + 'deg)';
        card.style.zIndex = String(i);
        if (animate) motion.retarget(card, transform, p.durationMs); else card.style.transform = transform;
      });
    }
    let expanded = false;
    const row = controls(m, live), b = button(m, 'Spread cards / 展开卡片', row, () => {
      expanded = !expanded; b.setAttribute('aria-expanded', String(expanded)); b.textContent = expanded ? 'Fold cards / 合拢卡片' : 'Spread cards / 展开卡片';
      pose(nc, expanded ? 1 : 0, true); status.textContent = expanded ? 'Local deck expanded / 本地卡片已展开' : 'Local deck folded / 本地卡片已合拢';
    });
    b.setAttribute('aria-expanded', 'false');
    pose(nc, 0, false);
    return m.finish(t => pose(pc, m.reduced ? 1 : W.ease(t), false));
  }, p => { integral(p, 'count'); if ((p.count - 1) * p.spreadDeg / 2 > 55) throw new RangeError('Fan outer angle must not exceed 55 degrees'); });

  const tooltip = register('hover-focus-tooltip', '悬停聚焦提示 / Hover-focus tooltip', { offsetPx: [4, 20], durationMs: [100, 220] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study, 140), box = surface(m, live, 140);
    m.el('div', 'Help / 帮助', buttonCSS + 'position:absolute;inset-inline-start:24px;inset-block-end:15px;', preview);
    const pt = m.el('div', 'Study explanation / 研究说明', 'position:absolute;inset-inline-start:24px;inset-block-start:20px;padding:10px;border:1px solid #8eb8cb;border-radius:8px;background:#102334;', preview);
    const b = button(m, 'Help / 帮助', box); b.style.cssText += 'position:absolute;inset-inline-start:24px;inset-block-end:15px;';
    const tip = m.el('div', 'Local hint: no request or navigation / 本地提示：不发请求，不跳转。', 'position:absolute;inset-inline-start:12px;inset-inline-end:12px;inset-block-start:12px;padding:8px;border:1px solid #8eb8cb;border-radius:8px;background:#102334;font-size:12px;', box);
    tip.id = m.root.id + '-tooltip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
    const motion = finiteMotion(m);
    let hovered = false, focused = false, pinned = false, suppressed = false;
    function update() {
      const visible = !suppressed && (hovered || focused || pinned), was = !tip.hidden;
      tip.hidden = !visible;
      if (visible) {
        b.setAttribute('aria-describedby', tip.id);
        if (!was) motion.play(tip, [{ opacity: 0, transform: 'translateY(' + p.offsetPx + 'px)' }, { opacity: 1, transform: 'translateY(0)' }], p.durationMs);
      } else { b.removeAttribute('aria-describedby'); motion.cancel(tip); }
    }
    m.listen(b, 'pointerenter', e => { if (e.pointerType !== 'touch') { hovered = true; suppressed = false; update(); } });
    m.listen(box, 'pointerleave', () => { hovered = false; update(); });
    m.listen(tip, 'pointerenter', () => { hovered = true; update(); });
    m.listen(b, 'focus', () => { focused = true; suppressed = false; update(); });
    m.listen(b, 'blur', () => { focused = pinned = hovered = false; update(); });
    m.listen(b, 'click', () => { pinned = !pinned; suppressed = false; update(); status.textContent = pinned ? 'Hint pinned locally / 已本地固定提示' : 'Hint follows focus/hover / 提示跟随聚焦或悬停'; });
    m.listen(m.doc, 'keydown', e => { if (e.key === 'Escape' && !tip.hidden) { suppressed = true; pinned = false; update(); } });
    m.listen(b, 'pointercancel', () => { hovered = pinned = false; suppressed = true; update(); });
    m.listen(m.doc.defaultView, 'blur', () => { focused = pinned = hovered = false; update(); });
    return m.finish(t => { const q = m.reduced ? 1 : W.ease(W.phase(t, .15, .65)); pt.style.opacity = String(q); pt.style.transform = m.reduced ? 'none' : 'translateY(' + ((1 - q) * p.offsetPx) + 'px)'; });
  });

  const snap = register('drag-nearest-slot', '拖动最近槽位 / Drag nearest slot', { slots: [2, 7], durationMs: [100, 300] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study, 120), native = surface(m, live, 120), pc = m.el('div', 'Study', cardCSS + 'position:absolute;inset-block-start:35px;width:70px;height:50px;display:grid;place-items:center;', preview);
    const nc = button(m, 'Drag / 拖动', native); nc.style.cssText += 'position:absolute;inset-inline-start:0;inset-block-start:35px;width:70px;height:50px;padding:4px;';
    for (let i = 0; i < p.slots; i++) {
      const css = 'position:absolute;inset-block-end:8px;inset-inline-start:calc(' + (100 * i / (p.slots - 1)) + '% - ' + (70 * i / (p.slots - 1)) + 'px);width:70px;text-align:center;font-size:11px;';
      m.el('span', String(i + 1), css, preview); m.el('span', String(i + 1), css, native);
    }
    const motion = finiteMotion(m);
    let slot = 0, pos = 0, startSlot = 0, startX = 0, max = 0;
    function width() { return Math.max(0, native.clientWidth - 70); }
    function commit(next, animate = true) {
      slot = W.clamp(next, 0, p.slots - 1); pos = width() * slot / (p.slots - 1);
      if (animate) motion.retarget(nc, 'translateX(' + pos + 'px)', p.durationMs); else { motion.cancel(nc); translate(nc, pos, 0); }
      status.textContent = 'Local slot / 本地槽位：' + (slot + 1) + '/' + p.slots;
    }
    const binding = drag(m, nc, {
      start(s) { startSlot = slot; startX = visualOffset(m, nc, 'x'); motion.cancel(nc); max = width(); pos = startX; },
      move(s, e) { pos = W.clamp(startX + e.clientX - s.x, 0, max); translate(nc, pos, 0); },
      end() { commit(max ? Math.round(pos / max * (p.slots - 1)) : startSlot); },
      cancel() { commit(startSlot, false); }
    });
    m.listen(nc, 'keydown', e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); binding.cancel(); commit(e.key === 'Home' ? 0 : e.key === 'End' ? p.slots - 1 : slot + (e.key === 'ArrowLeft' ? -1 : 1)); } });
    const row = controls(m, live); button(m, 'Previous / 上一格', row, () => { binding.cancel(); commit(slot - 1); }); button(m, 'Next / 下一格', row, () => { binding.cancel(); commit(slot + 1); });
    commit(0, false);
    return m.finish(t => { const dragged = .68, target = Math.round(dragged * (p.slots - 1)) / (p.slots - 1), q = m.reduced ? target : t < .6 ? dragged * W.ease(W.phase(t, 0, .6)) : W.mix(dragged, target, W.ease(W.phase(t, .6, 1))); pc.style.left = 'calc(' + (q * 100) + '% - ' + (q * 70) + 'px)'; });
  }, p => integral(p, 'slots'));

  function ballistic(start, velocity, deceleration, low, high) {
    const speed = Math.abs(velocity), direction = Math.sign(velocity), naturalDistance = speed * speed / (2 * deceleration);
    const distance = Math.min(naturalDistance, direction >= 0 ? high - start : start - low);
    const end = W.clamp(start + direction * distance, low, high);
    const seconds = speed > 0 && distance > 0 ? (speed - Math.sqrt(Math.max(0, speed * speed - 2 * deceleration * distance))) / deceleration : 0;
    const coefficient = distance > 0 ? speed * seconds / distance : 1;
    return { start, end, speed, direction, deceleration, seconds, easing: 'cubic-bezier(.333333,' + (coefficient / 3) + ',.666667,' + ((coefficient + 1) / 3) + ')' };
  }
  const inertia = register('drag-measured-inertia', '实测速度拖动惯性 / Measured drag inertia', { deceleration: [350, 2600], maxVelocity: [200, 1600], studyVelocity: [100, 600] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study, 130), native = surface(m, live, 130), pc = m.el('div', 'Study', cardCSS + 'position:absolute;inset-block-start:40px;width:64px;height:48px;display:grid;place-items:center;', preview);
    const nc = button(m, 'Flick / 甩动', native); nc.style.cssText += 'position:absolute;inset-inline-start:0;inset-block-start:40px;width:64px;height:48px;padding:4px;';
    const motion = finiteMotion(m);
    let position = 0, origin = 0, rollback = 0, samples = [], flight = null;
    function max() { return Math.max(0, native.clientWidth - 64); }
    function interrupt() {
      if (flight && flight.animation && flight.animation.currentTime !== null) {
        const elapsed = W.clamp(Number(flight.animation.currentTime) / 1000, 0, flight.seconds);
        position = W.clamp(flight.start + flight.direction * (flight.speed * elapsed - .5 * flight.deceleration * elapsed * elapsed), 0, max());
      }
      flight = null; motion.cancel(nc); translate(nc, position, 0);
    }
    function sample(e, x) {
      samples.push({ time: e.timeStamp, x });
      while (samples.length > 2 && samples[0].time < e.timeStamp - 90) samples.shift();
    }
    function launch(velocity) {
      const f = ballistic(position, W.clamp(velocity, -p.maxVelocity, p.maxVelocity), p.deceleration, 0, max());
      position = f.end;
      translate(nc, f.end, 0);
      f.animation = motion.play(nc, [{ transform: 'translateX(' + f.start + 'px)' }, { transform: 'translateX(' + f.end + 'px)' }], f.seconds * 1000, f.easing);
      flight = f;
      status.textContent = 'Local measured velocity / 本地实测速度：' + Math.round(velocity) + ' px/s; deceleration ' + p.deceleration + ' px/s²; destination ' + Math.round(position) + ' px' + (!m.reduced && typeof nc.animate !== 'function' ? '; finite playback unavailable, computed endpoint applied / 无有限动画支持，已应用计算终点' : '');
    }
    const binding = drag(m, nc, {
      start(s, e) { interrupt(); rollback = origin = position; samples = []; sample(e, position); },
      move(s, e) { position = W.clamp(origin + e.clientX - s.x, 0, max()); translate(nc, position, 0); sample(e, position); },
      end(s, e) {
        position = W.clamp(origin + e.clientX - s.x, 0, max()); sample(e, position);
        const newest = samples[samples.length - 1], oldest = samples.find(v => v.time >= newest.time - 90) || newest, elapsed = newest.time - oldest.time;
        const velocity = elapsed > 0 ? (newest.x - oldest.x) * 1000 / elapsed : 0;
        samples = []; launch(velocity);
      },
      cancel() { samples = []; flight = null; motion.cancel(nc); position = rollback; translate(nc, position, 0); status.textContent = 'Local drag cancelled; no inertia committed / 本地拖动取消，未提交惯性'; }
    });
    m.listen(nc, 'keydown', e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(e.key)) { e.preventDefault(); binding.cancel(); interrupt(); if (e.key !== 'Escape') position = e.key === 'Home' ? 0 : e.key === 'End' ? max() : W.clamp(position + (e.key === 'ArrowLeft' ? -24 : 24), 0, max()); translate(nc, position, 0); status.textContent = 'Keyboard local position / 键盘本地位置：' + Math.round(position) + ' px; no invented release velocity / 不虚构释放速度'; } });
    const row = controls(m, live); button(m, 'Move left / 左移', row, () => { binding.cancel(); interrupt(); position = W.clamp(position - 24, 0, max()); translate(nc, position, 0); status.textContent = 'Local position / 本地位置：' + Math.round(position) + ' px'; }); button(m, 'Move right / 右移', row, () => { binding.cancel(); interrupt(); position = W.clamp(position + 24, 0, max()); translate(nc, position, 0); status.textContent = 'Local position / 本地位置：' + Math.round(position) + ' px'; });
    instruction(m, live, 'Release a moving drag to coast; a held-still release has zero velocity / 运动中松手产生惯性，停住后松手速度为零。');
    const f = ballistic(78, p.studyVelocity, p.deceleration, 0, 290);
    return m.finish(t => {
      const seconds = W.phase(t, .4, 1) * f.seconds;
      const x = m.reduced ? f.end : t < .4 ? W.mix(10, 78, W.phase(t, 0, .4)) : f.start + f.direction * (f.speed * seconds - .5 * f.deceleration * seconds * seconds);
      pc.style.left = (x / 290 * 100) + '%'; pc.style.transform = 'translateX(' + (-x / 290 * 64) + 'px)';
    });
  }, p => { if (p.studyVelocity > p.maxVelocity) throw new RangeError('studyVelocity must not exceed maxVelocity'); });

  const sheet = register('sheet-drag-detents', '底部面板拖动档位 / Sheet drag detents', { travelPx: [100, 160], durationMs: [120, 400] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study, 240), native = surface(m, live, 240);
    function panel(parent, interactive) {
      const box = m.el('div', null, 'position:absolute;inset-inline:0;inset-block-end:0;height:220px;background:#28556b;border:2px solid #66d6bd;border-radius:18px 18px 0 0;box-sizing:border-box;padding:12px;', parent);
      const handle = interactive ? button(m, 'Drag sheet / 拖动面板', box) : m.el('div', 'Sheet study / 面板研究', buttonCSS, box);
      m.el('p', 'Local, non-modal sample panel / 本地非模态示例面板', '', box);
      return { box, handle };
    }
    const ps = panel(preview, false), ns = panel(native, true), motion = finiteMotion(m), detents = [p.travelPx, p.travelPx / 2, 0];
    let detent = 0, offset = p.travelPx, start = 0, original = 0;
    function commit(index, animate = true) {
      detent = W.clamp(index, 0, 2); offset = detents[detent];
      ns.handle.setAttribute('aria-expanded', String(detent > 0));
      if (animate) motion.retarget(ns.box, 'translateY(' + offset + 'px)', p.durationMs); else { motion.cancel(ns.box); translate(ns.box, 0, offset); }
      status.textContent = 'Local sheet detent / 本地面板档位：' + ['peek / 收起', 'half / 半开', 'open / 展开'][detent];
    }
    const binding = drag(m, ns.handle, {
      start() { original = detent; start = visualOffset(m, ns.box, 'y'); motion.cancel(ns.box); offset = start; },
      move(s, e) { offset = W.clamp(start + e.clientY - s.y, 0, p.travelPx); translate(ns.box, 0, offset); },
      end() { commit(Math.round((p.travelPx - offset) / (p.travelPx / 2))); },
      cancel() { commit(original, false); }
    });
    m.listen(ns.handle, 'keydown', e => { if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) { e.preventDefault(); binding.cancel(); commit(e.key === 'Home' ? 0 : e.key === 'End' ? 2 : detent + (e.key === 'ArrowUp' ? 1 : -1)); } });
    const row = controls(m, live); button(m, 'Close / 收起', row, () => { binding.cancel(); commit(0); }); button(m, 'Half / 半开', row, () => { binding.cancel(); commit(1); }); button(m, 'Open / 展开', row, () => { binding.cancel(); commit(2); });
    commit(0, false);
    return m.finish(t => { const q = m.reduced ? 1 : t < .7 ? W.ease(W.phase(t, 0, .7)) * .84 : W.mix(.84, 1, W.ease(W.phase(t, .7, 1))); translate(ps.box, 0, p.travelPx * (1 - q)); });
  });

  const pickup = register('drag-pickup-depth', '拖动提起层级 / Drag pickup depth', { liftPx: [4, 24], scale: [1.01, 1.12] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study, 210), native = surface(m, live, 210), pc = m.el('div', 'Study card', cardCSS + 'position:absolute;inset-inline-start:0;inset-block-start:0;width:90px;height:70px;display:grid;place-items:center;', preview), nc = button(m, 'Pick / 提起', native);
    nc.style.cssText += 'position:absolute;inset-inline-start:0;inset-block-start:0;width:90px;height:70px;padding:6px;';
    let x = 16, y = 90, initial = { x, y }, held = false, keyboard = false;
    function draw(el, px, py, lifted) {
      el.style.transform = 'translate(' + px + 'px,' + (py - (lifted && !m.reduced ? p.liftPx : 0)) + 'px) scale(' + (lifted && !m.reduced ? p.scale : 1) + ')';
      el.style.boxShadow = lifted ? '0 12px 18px rgba(0,0,0,.5)' : '0 2px 4px rgba(0,0,0,.25)';
      el.style.borderColor = lifted ? '#ffe989' : '#66d6bd';
    }
    function cancel() { x = initial.x; y = initial.y; held = keyboard = false; draw(nc, x, y, false); status.textContent = 'Pickup cancelled / 已取消提起'; }
    const binding = drag(m, nc, {
      start() { if (keyboard) cancel(); initial = { x, y }; held = true; draw(nc, x, y, true); },
      move(s, e) { x = W.clamp(initial.x + e.clientX - s.x, 0, Math.max(0, native.clientWidth - 90)); y = W.clamp(initial.y + e.clientY - s.y, 0, native.clientHeight - 70); draw(nc, x, y, true); },
      end() { held = false; draw(nc, x, y, false); status.textContent = 'Dropped locally / 已本地放下：' + Math.round(x) + ', ' + Math.round(y); },
      cancel
    });
    m.listen(nc, 'keydown', e => {
      if ([' ', 'Enter'].includes(e.key) && !e.repeat) { e.preventDefault(); binding.cancel(); if (!keyboard) { initial = { x, y }; held = keyboard = true; } else { held = keyboard = false; status.textContent = 'Keyboard drop committed locally / 已提交本地键盘放下'; } draw(nc, x, y, held); }
      else if (keyboard && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); x = W.clamp(x + (e.key === 'ArrowLeft' ? -12 : e.key === 'ArrowRight' ? 12 : 0), 0, Math.max(0, native.clientWidth - 90)); y = W.clamp(y + (e.key === 'ArrowUp' ? -12 : e.key === 'ArrowDown' ? 12 : 0), 0, native.clientHeight - 70); draw(nc, x, y, true); }
      else if (e.key === 'Escape' && keyboard) { e.preventDefault(); cancel(); }
    });
    m.listen(nc, 'blur', () => { if (keyboard) cancel(); });
    m.listen(m.doc.defaultView, 'blur', () => { if (keyboard) cancel(); });
    m.listen(m.doc, 'visibilitychange', () => { if (m.doc.hidden && keyboard) cancel(); });
    m.onDispose(() => { held = keyboard = false; });
    instruction(m, live, 'Keyboard: Enter/Space picks up, arrows move, Enter/Space drops, Escape/blur cancels / 键盘：回车或空格提起，方向键移动，再按放下，Escape 或失焦取消。');
    draw(nc, x, y, false);
    return m.finish(t => { const q = m.reduced ? 1 : W.ease(W.phase(t, .2, .85)); draw(pc, W.mix(16, Math.max(0, preview.clientWidth - 106), q), W.mix(90, 65, q), !m.reduced && t >= .15 && t < .85); });
  });

  const hold = register('elapsed-hold-confirm', '实耗时长按确认 / Elapsed hold confirmation', { holdMs: [500, 3000], slopPx: [4, 30] }, ({ m, study, live, status }, p) => {
    const preview = m.el('div', null, buttonCSS + 'position:relative;min-height:64px;overflow:hidden;', study), pb = m.el('span', null, 'position:absolute;inset-inline-start:0;inset-block-end:0;height:7px;background:#66d6bd;', preview), pl = m.el('span', 'Hold study / 长按研究', '', preview);
    const b = button(m, 'Hold, then release / 按住后松开', live); b.style.cssText += 'position:relative;min-width:240px;overflow:hidden;touch-action:none;';
    const nb = m.el('span', null, 'position:absolute;inset-inline-start:0;inset-block-end:0;height:7px;width:0;background:#66d6bd;pointer-events:none;', b);
    let active = null, confirmations = 0;
    function begin(kind, e) {
      if (active) return;
      active = { kind, key: e.key, id: e.pointerId, x: e.clientX, y: e.clientY, time: e.timeStamp };
      nb.style.transition = 'none'; nb.style.width = '0%';
      if (!m.reduced) { nb.getBoundingClientRect(); nb.style.transition = 'width ' + p.holdMs + 'ms linear'; nb.style.width = '100%'; }
      status.textContent = 'Holding locally: release after ' + p.holdMs + ' ms / 本地按住：满时长后松开确认；not automatic / 不自动确认';
    }
    function end(e, cancelled) {
      if (!active) return;
      const old = active; active = null;
      if (old.kind === 'pointer') releaseCapture(b, old.id);
      const elapsed = e ? Math.max(0, e.timeStamp - old.time) : 0, accepted = !cancelled && elapsed >= p.holdMs;
      nb.style.transition = 'none'; nb.style.width = accepted ? '100%' : '0%';
      if (accepted) confirmations++;
      status.textContent = accepted ? 'Local confirmation ' + confirmations + '; measured ' + Math.round(elapsed) + ' ms / 已本地确认' : 'Local hold cancelled; no confirmation / 本地长按取消，未确认';
    }
    m.listen(b, 'pointerdown', e => { if (e.button !== 0 || e.isPrimary === false || active) return; e.preventDefault(); b.focus({ preventScroll: true }); begin('pointer', e); try { b.setPointerCapture(e.pointerId); } catch (_) { /* Document listeners keep ownership bounded. */ } });
    m.listen(m.doc, 'pointermove', e => { if (active && active.kind === 'pointer' && e.pointerId === active.id && Math.hypot(e.clientX - active.x, e.clientY - active.y) > p.slopPx) end(e, true); });
    m.listen(m.doc, 'pointerup', e => { if (active && active.kind === 'pointer' && active.id === e.pointerId) end(e, false); });
    m.listen(m.doc, 'pointercancel', e => { if (active && active.kind === 'pointer' && active.id === e.pointerId) end(e, true); });
    m.listen(b, 'lostpointercapture', e => { if (active && active.kind === 'pointer' && active.id === e.pointerId) end(e, true); });
    m.listen(b, 'keydown', e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); if (!e.repeat) begin('keyboard', e); } else if (e.key === 'Escape') { e.preventDefault(); end(e, true); } });
    m.listen(b, 'keyup', e => { if (active && active.kind === 'keyboard' && e.key === active.key) { e.preventDefault(); end(e, false); } });
    m.listen(b, 'click', e => e.preventDefault());
    m.listen(b, 'blur', e => end(e, true)); m.listen(m.doc.defaultView, 'blur', e => end(e, true));
    m.listen(m.doc, 'visibilitychange', e => { if (m.doc.hidden) end(e, true); });
    m.onDispose(() => end(null, true));
    instruction(m, live, 'Enter/Space supports the same elapsed hold; movement beyond slop, Escape, blur and pointer cancel reject / 回车或空格同样计时；移动超限、Escape、失焦或取消均拒绝。');
    return m.finish(t => { const q = m.reduced ? 1 : W.phase(t, .1, .8); pb.style.width = (q * 100) + '%'; pl.textContent = q >= 1 ? 'Study threshold reached / 研究已达阈值' : 'Study elapsed: ' + Math.round(q * p.holdMs) + ' / ' + p.holdMs + ' ms'; });
  });

  const pinch = register('two-pointer-distance-zoom', '双指距离缩放 / Two-pointer distance zoom', { minScale: [.5, 1], maxScale: [1.5, 4], studyScale: [1.2, 3] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study, 220), native = surface(m, live, 220);
    function map(parent) {
      const content = m.el('div', 'Local map / 本地地图', 'position:absolute;inset:0;display:grid;place-items:center;background:repeating-linear-gradient(0deg,transparent 0 39px,#55758b 40px 41px),repeating-linear-gradient(90deg,transparent 0 39px,#55758b 40px 41px),#1b4356;transform-origin:50% 50%;font-weight:700;', parent);
      m.el('span', 'A', 'position:absolute;inset-inline-start:25%;inset-block-start:30%;color:#ffe989;', content);
      m.el('span', 'B', 'position:absolute;inset-inline-end:20%;inset-block-end:25%;color:#66d6bd;', content);
      return content;
    }
    const pm = map(preview), nm = map(native), pa = dot(m, preview, 18, '#ffe989'), pb = dot(m, preview, 18, '#ffe989');
    native.tabIndex = 0; native.setAttribute('role', 'group'); native.setAttribute('aria-label', 'Local two-pointer zoom; plus/minus zoom, Home resets'); native.style.touchAction = 'none';
    const pointers = new Map();
    let model = { zoom: 1, x: 0, y: 0 }, rollback = null, base = null;
    function paint() { nm.style.transform = 'translate(' + model.x + 'px,' + model.y + 'px) scale(' + model.zoom + ')'; }
    function announce() { status.textContent = 'Local zoom / 本地缩放：' + model.zoom.toFixed(2) + '×; no page zoom or persistence / 不缩放页面，不持久化'; }
    function cancel() {
      const ids = Array.from(pointers.keys()); pointers.clear(); base = null;
      if (rollback) model = rollback;
      rollback = null;
      for (const id of ids) releaseCapture(native, id);
      paint(); announce();
    }
    function baseline() {
      const values = Array.from(pointers.values());
      if (values.length !== 2) { base = null; return; }
      const distance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
      if (distance < 1) { base = null; return; }
      const cx = (values[0].x + values[1].x) / 2, cy = (values[0].y + values[1].y) / 2;
      base = { distance, zoom: model.zoom, anchorX: (cx - native.clientWidth / 2 - model.x) / model.zoom, anchorY: (cy - native.clientHeight / 2 - model.y) / model.zoom };
    }
    function coordinate(e) { const r = native.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function move(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, coordinate(e));
      if (!base) { baseline(); return; }
      const values = Array.from(pointers.values()); if (values.length !== 2) return;
      const distance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y), cx = (values[0].x + values[1].x) / 2, cy = (values[0].y + values[1].y) / 2;
      model = { zoom: W.clamp(base.zoom * distance / base.distance, p.minScale, p.maxScale), x: 0, y: 0 };
      model.x = cx - native.clientWidth / 2 - base.anchorX * model.zoom; model.y = cy - native.clientHeight / 2 - base.anchorY * model.zoom;
      paint();
    }
    m.listen(native, 'pointerdown', e => {
      if (e.button !== 0 || pointers.size >= 2 || pointers.has(e.pointerId)) return;
      e.preventDefault(); native.focus({ preventScroll: true });
      if (pointers.size === 0) rollback = { ...model };
      pointers.set(e.pointerId, coordinate(e));
      try { native.setPointerCapture(e.pointerId); } catch (_) { /* Document listeners cover uncaptured pointers. */ }
      baseline();
    });
    m.listen(m.doc, 'pointermove', e => { if (pointers.has(e.pointerId)) { e.preventDefault(); move(e); } }, { passive: false });
    m.listen(m.doc, 'pointerup', e => { if (!pointers.has(e.pointerId)) return; move(e); pointers.delete(e.pointerId); releaseCapture(native, e.pointerId); base = null; if (pointers.size === 0) rollback = null; announce(); });
    m.listen(m.doc, 'pointercancel', e => { if (pointers.has(e.pointerId)) cancel(); });
    m.listen(native, 'lostpointercapture', e => { if (pointers.has(e.pointerId)) cancel(); });
    m.listen(native, 'blur', cancel); m.listen(m.doc.defaultView, 'blur', cancel); m.listen(m.doc, 'visibilitychange', () => { if (m.doc.hidden) cancel(); });
    function zoom(delta, reset) { if (pointers.size) cancel(); model = reset ? { zoom: 1, x: 0, y: 0 } : { ...model, zoom: W.clamp(model.zoom + delta, p.minScale, p.maxScale) }; paint(); announce(); }
    m.listen(native, 'keydown', e => { if (['+', '=', '-', '_', 'Home', 'Escape'].includes(e.key)) { e.preventDefault(); if (e.key === 'Escape') cancel(); else zoom(['-', '_'].includes(e.key) ? -.2 : .2, e.key === 'Home'); } });
    const row = controls(m, live); button(m, 'Zoom out / 缩小', row, () => zoom(-.2)); button(m, 'Zoom in / 放大', row, () => zoom(.2)); button(m, 'Reset / 复位', row, () => zoom(0, true));
    m.onDispose(cancel); paint(); announce();
    instruction(m, live, 'Two actual pointers set distance and midpoint; one pointer never emulates pinch / 两个真实指针决定距离与中心，单指不模拟捏合。');
    return m.finish(t => { const q = m.reduced ? p.studyScale : W.mix(1, p.studyScale, W.ease(t)); pm.style.transform = 'scale(' + q + ')'; pa.style.left = 'calc(50% - ' + (45 * q + 9) + 'px)'; pb.style.left = 'calc(50% + ' + (45 * q - 9) + 'px)'; pa.style.top = pb.style.top = '101px'; });
  }, p => { if (p.studyScale > p.maxScale) throw new RangeError('studyScale must not exceed maxScale'); });

  const refresh = register('pull-threshold-local-refresh', '下拉阈值本地刷新 / Pull-threshold local refresh', { thresholdPx: [40, 100], resistance: [.25, .7] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study, 210), native = surface(m, live, 210);
    native.tabIndex = 0; native.setAttribute('role', 'group'); native.setAttribute('aria-label', 'Local sample refresh area');
    const pi = m.el('div', 'Pull study / 下拉研究', 'position:absolute;inset-inline:0;inset-block-start:0;text-align:center;padding:8px;color:#ffe989;', preview), ni = m.el('div', 'Pull down / 向下拉', 'position:absolute;inset-inline:0;inset-block-start:0;text-align:center;padding:8px;color:#ffe989;', native);
    ni.setAttribute('aria-hidden', 'true');
    const pc = m.el('div', null, 'position:absolute;inset-inline:0;inset-block-start:0;background:#17374b;padding:10px;', preview), nc = m.el('div', null, 'position:absolute;inset-inline:0;inset-block-start:0;background:#17374b;padding:10px;', native);
    const rows = [], studyRows = [];
    for (let i = 0; i < 3; i++) { studyRows.push(m.el('p', 'Study row ' + (i + 1), 'padding:8px;border-block-end:1px solid #55758b;', pc)); rows.push(m.el('p', 'Local row ' + (i + 1) + ' · revision 0', 'padding:8px;border-block-end:1px solid #55758b;', nc)); }
    const motion = finiteMotion(m);
    let pull = 0, revision = 0;
    function commit() { revision++; rows.forEach((row, i) => { row.textContent = 'Local row ' + (i + 1) + ' · revision ' + revision; }); status.textContent = 'Local revision / 本地版本：' + revision + '; no fetch / 不发请求'; }
    function reset(animate) { pull = 0; ni.textContent = 'Pull down / 向下拉'; if (animate) motion.retarget(nc, 'translateY(0)', 180); else { motion.cancel(nc); translate(nc, 0, 0); } }
    const binding = drag(m, native, {
      start() { if (native.scrollTop > 0) return false; motion.cancel(nc); pull = 0; },
      move(s, e) { pull = W.clamp((e.clientY - s.y) * p.resistance, 0, p.thresholdPx * 1.3); translate(nc, 0, pull); ni.textContent = pull >= p.thresholdPx ? 'Release for local refresh / 松开本地刷新' : 'Pull ' + Math.round(pull / p.thresholdPx * 100) + '%'; },
      end() { if (pull >= p.thresholdPx) commit(); else status.textContent = 'Below threshold: unchanged / 未到阈值，不变'; reset(true); },
      cancel() { reset(false); status.textContent = 'Pull cancelled: revision unchanged / 下拉取消，版本不变'; }
    });
    const row = controls(m, live); button(m, 'Refresh local sample / 刷新本地示例', row, () => { binding.cancel(); commit(); });
    instruction(m, live, 'A completed threshold pull only changes these local rows; no network or loading claim / 达阈值的下拉只更新这些本地行，不模拟网络或加载。');
    return m.finish(t => {
      const completed = m.reduced || t >= .65, distance = m.reduced ? 0 : t < .65 ? W.ease(W.phase(t, 0, .65)) * p.thresholdPx * 1.15 : (1 - W.ease(W.phase(t, .65, 1))) * p.thresholdPx * 1.15;
      translate(pc, 0, distance);
      pi.textContent = completed ? 'Study local revision updated / 研究本地版本已更新' : 'Study pull ' + Math.round(distance / p.thresholdPx * 100) + '%';
      studyRows.forEach((row, i) => { row.textContent = 'Study row ' + (i + 1) + ' · revision ' + (completed ? 1 : 0); });
    });
  });

  const reorder = register('identity-preserving-reorder', '保留身份拖动排序 / Identity-preserving reorder', { count: [3, 6], rowHeightPx: [44, 64] }, ({ m, study, live, status }, p) => {
    const labels = ['Alpha / 甲', 'Beta / 乙', 'Gamma / 丙', 'Delta / 丁', 'Epsilon / 戊', 'Zeta / 己'], height = p.count * p.rowHeightPx;
    const preview = surface(m, study, height), list = m.el('ol', null, 'position:relative;box-sizing:border-box;width:100%;max-width:360px;margin:0;padding:0;list-style:none;', live);
    const pc = [], nodes = new Map(), bindings = [];
    let order = Array.from({ length: p.count }, (_, i) => 'row-' + i), active = null;
    function clearPreview() { for (const node of nodes.values()) { node.li.style.transform = 'none'; node.li.style.zIndex = ''; node.handle.style.borderColor = '#8eb8cb'; } }
    function commit(key, target) {
      const from = order.indexOf(key); order.splice(from, 1); order.splice(W.clamp(target, 0, p.count - 1), 0, key);
      order.forEach(id => list.appendChild(nodes.get(id).li));
      clearPreview();
      nodes.get(key).handle.focus({ preventScroll: true });
      status.textContent = 'Local order / 本地顺序：' + order.map(id => nodes.get(id).name).join(' → ') + '; moved identity ' + key;
    }
    function cancel() { active = null; clearPreview(); status.textContent = 'Reorder cancelled: original identities/order retained / 排序取消，原身份与顺序保留'; }
    for (let i = 0; i < p.count; i++) {
      const key = 'row-' + i, li = m.el('li', null, 'position:relative;box-sizing:border-box;height:' + p.rowHeightPx + 'px;padding-block:3px;', list), handle = button(m, labels[i], li);
      handle.style.cssText += 'display:block;width:100%;height:100%;padding:6px;'; handle.dataset.rowIdentity = key; li.dataset.rowIdentity = key;
      nodes.set(key, { li, handle, name: labels[i] });
      pc.push(m.el('div', labels[i], cardCSS + 'position:absolute;inset-inline:4px;inset-block-start:' + (i * p.rowHeightPx + 3) + 'px;height:' + (p.rowHeightPx - 6) + 'px;padding:8px;', preview));
      const binding = drag(m, handle, {
        start() { if (active) return false; active = { key, index: order.indexOf(key), target: order.indexOf(key), delta: 0 }; handle.style.borderColor = '#ffe989'; li.style.zIndex = '2'; },
        move(s, e) {
          if (!active || active.key !== key) return;
          active.delta = W.clamp(e.clientY - s.y, -active.index * p.rowHeightPx, (p.count - 1 - active.index) * p.rowHeightPx); active.target = W.clamp(Math.round(active.index + active.delta / p.rowHeightPx), 0, p.count - 1);
          order.forEach((id, index) => { const dy = id === key ? active.delta : active.target > active.index && index > active.index && index <= active.target ? -p.rowHeightPx : active.target < active.index && index >= active.target && index < active.index ? p.rowHeightPx : 0; translate(nodes.get(id).li, 0, dy); });
        },
        end() { if (!active || active.key !== key) return; const target = active.target; active = null; commit(key, target); },
        cancel
      });
      bindings.push(binding);
      m.listen(handle, 'keydown', e => {
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault(); bindings.forEach(b => b.cancel()); const index = order.indexOf(key);
        commit(key, e.key === 'Home' ? 0 : e.key === 'End' ? p.count - 1 : index + (e.key === 'ArrowUp' ? -1 : 1));
      });
    }
    instruction(m, live, 'Drag a row; focused row ArrowUp/Down or Home/End moves the same identity. Escape/blur cancels / 拖动行；聚焦行用上下或 Home/End 移动同一身份，Escape 或失焦取消。');
    return m.finish(t => {
      const q = m.reduced ? 1 : W.ease(W.phase(t, .1, .9));
      pc.forEach((row, i) => { const dy = i === 0 ? q * (p.count - 1) * p.rowHeightPx : -q * p.rowHeightPx; translate(row, 0, dy); row.style.zIndex = i === 0 ? '2' : '1'; row.style.borderColor = i === 0 ? '#ffe989' : '#66d6bd'; });
    });
  }, p => integral(p, 'count'));

  const actions = register('swipe-local-action-reveal', '滑动本地操作展开 / Swipe local action reveal', { revealPx: [100, 160], threshold: [.2, .8], durationMs: [100, 300] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study, 100), native = surface(m, live, 100), motion = finiteMotion(m);
    m.el('div', 'Archive · Mark / 归档 · 标记', 'position:absolute;inset-inline-end:0;inset-block:15px;width:' + p.revealPx + 'px;background:#377d6d;padding:12px 4px;box-sizing:border-box;', preview);
    const pc = m.el('div', 'Study item / 研究条目', cardCSS + 'position:absolute;inset:15px 0;padding:20px;', preview);
    const tray = m.el('div', null, 'position:absolute;inset-inline-end:0;inset-block:15px;width:' + p.revealPx + 'px;display:flex;gap:4px;', native);
    const archive = button(m, 'Archive / 归档', tray), mark = button(m, 'Mark / 标记', tray);
    archive.style.cssText += 'flex:1;min-width:44px;padding:4px;font-size:11px;'; mark.style.cssText += 'flex:1;min-width:44px;padding:4px;font-size:11px;';
    const nc = button(m, 'Swipe left / 左滑条目', native); nc.style.cssText += 'position:absolute;inset:15px 0;width:100%;z-index:1;';
    let opened = false, offset = 0, original = false, start = 0, moved = false, ignoreClick = false, archived = false, marked = false;
    function commit(next, animate = true) {
      opened = next; offset = opened ? -p.revealPx : 0; tray.inert = !opened; tray.setAttribute('aria-hidden', String(!opened));
      nc.setAttribute('aria-expanded', String(opened));
      if (animate) motion.retarget(nc, 'translateX(' + offset + 'px)', p.durationMs); else { motion.cancel(nc); translate(nc, offset, 0); }
      status.textContent = opened ? 'Local actions exposed / 本地操作已展开' : 'Local actions closed / 本地操作已收起';
    }
    const binding = drag(m, nc, {
      start() { original = opened; start = visualOffset(m, nc, 'x'); motion.cancel(nc); offset = start; moved = false; },
      move(s, e) { moved = moved || Math.abs(e.clientX - s.x) > 4; offset = W.clamp(start + e.clientX - s.x, -p.revealPx, 0); translate(nc, offset, 0); },
      end() { ignoreClick = moved; commit(-offset >= p.revealPx * p.threshold); },
      cancel() { ignoreClick = true; commit(original, false); }
    });
    m.listen(nc, 'click', e => { if (ignoreClick && e.detail !== 0) { ignoreClick = false; return; } ignoreClick = false; commit(!opened); });
    m.listen(nc, 'keydown', e => { if (['ArrowLeft', 'ArrowRight', 'Escape'].includes(e.key)) { e.preventDefault(); binding.cancel(); commit(e.key === 'ArrowLeft'); } });
    m.listen(archive, 'click', () => { archived = !archived; archive.setAttribute('aria-pressed', String(archived)); status.textContent = archived ? 'Archived locally; activate again to undo / 已本地归档，再按撤销' : 'Local archive undone / 本地归档已撤销'; });
    m.listen(mark, 'click', () => { marked = !marked; mark.setAttribute('aria-pressed', String(marked)); status.textContent = marked ? 'Marked locally / 已本地标记' : 'Local mark removed / 已取消本地标记'; });
    archive.setAttribute('aria-pressed', 'false'); mark.setAttribute('aria-pressed', 'false');
    const row = controls(m, live); button(m, 'Reveal / 展开', row, () => { binding.cancel(); commit(true); }); button(m, 'Close / 收起', row, () => { binding.cancel(); commit(false); });
    commit(false, false);
    instruction(m, live, 'Left swipe reveals real local buttons; Enter/Space or arrows also reveal. Actions do not call a service / 左滑露出真实本地按钮，回车、空格或方向键也可展开，操作不调用服务。');
    return m.finish(t => translate(pc, m.reduced ? -p.revealPx : -p.revealPx * W.ease(t), 0));
  });

  const dismiss = register('swipe-threshold-local-dismiss', '滑动阈值本地移除 / Swipe-threshold local dismiss', { distancePx: [60, 180], fadeStart: [.2, .7] }, ({ m, study, live, status }, p) => {
    const preview = surface(m, study, 120), native = surface(m, live, 120), pc = m.el('div', 'Study item / 研究条目', cardCSS + 'position:absolute;inset:25px 8px;padding:18px;', preview), nc = m.el('article', 'Local item / 本地条目 — swipe right / 向右滑', cardCSS + 'position:absolute;inset:25px 8px;padding:18px;cursor:grab;', native);
    nc.tabIndex = 0; nc.setAttribute('aria-label', 'Local item: swipe right to dismiss, Delete dismisses, Escape cancels');
    const row = controls(m, live); let gone = false, offset = 0;
    const remove = button(m, 'Dismiss local item / 移除本地条目', row, () => { binding.cancel(); commit(); }), undo = button(m, 'Undo / 撤销', row, () => { gone = false; nc.hidden = false; offset = 0; paint(); remove.disabled = false; undo.disabled = true; nc.focus({ preventScroll: true }); status.textContent = 'Same local item restored / 同一本地条目已恢复'; });
    undo.disabled = true;
    function paint() { translate(nc, offset, 0); nc.style.opacity = String(1 - .8 * W.phase(offset / p.distancePx, p.fadeStart, 1)); }
    function commit() { gone = true; offset = 0; nc.hidden = true; remove.disabled = true; undo.disabled = false; undo.focus({ preventScroll: true }); status.textContent = 'Local item dismissed; Undo retains its identity / 已移除本地条目，撤销保留其身份；no server deletion / 不删除服务器内容'; }
    const binding = drag(m, nc, {
      start() { if (gone) return false; offset = 0; paint(); },
      move(s, e) { offset = W.clamp(e.clientX - s.x, 0, p.distancePx * 1.5); paint(); },
      end() { if (offset >= p.distancePx) commit(); else { offset = 0; paint(); status.textContent = 'Below threshold: item retained / 未到阈值，条目保留'; } },
      cancel() { offset = 0; paint(); status.textContent = 'Swipe cancelled: item retained / 滑动取消，条目保留'; }
    });
    m.listen(nc, 'keydown', e => { if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); binding.cancel(); commit(); } else if (e.key === 'ArrowRight') { e.preventDefault(); binding.cancel(); offset = W.clamp(offset + 24, 0, p.distancePx); paint(); status.textContent = 'Keyboard offset / 键盘位移：' + Math.round(offset) + ' px; Delete or button confirms / Delete 或按钮确认'; } else if (e.key === 'Escape') { e.preventDefault(); binding.cancel(); offset = 0; paint(); } });
    instruction(m, live, 'Threshold release dismisses only this local item; explicit button/Delete and Undo offer non-gesture access / 达阈值释放只移除此本地条目；按钮或 Delete 与撤销提供非手势路径。');
    return m.finish(t => { const q = m.reduced ? 1 : W.ease(t); pc.style.transform = m.reduced ? 'none' : 'translateX(' + (q * p.distancePx * 1.5) + 'px)'; pc.style.opacity = m.reduced ? '1' : String(1 - W.phase(q, p.fadeStart, 1)); pc.textContent = m.reduced ? 'Study item dismissed — Undo available / 研究条目已移除，可撤销' : 'Study item / 研究条目'; });
  });

  return { recipes };
}

  const W = buildWebUtilities();
  const recipes = {};
  function merge(part) {
    for (const [id,descriptor] of Object.entries(part.recipes)) {
      if (Object.prototype.hasOwnProperty.call(recipes,id)) throw new Error('Duplicate web recipe: '+id);
      recipes[id] = descriptor;
    }
  }
  merge(buildWebOwn(W));
  merge(buildWebLayout(W));
  merge(buildWebData(W));
  merge(buildWebRoute(W));
  merge(buildWebScroll(W));
  merge(buildWebInput(W));
  return {group:'web',recipes};
});
