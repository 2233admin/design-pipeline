/* Original scene studies: analytical time, caller-owned playback, no source assets. */
((root, factory) => {
  const value = factory(typeof module === 'object' && module.exports ? require('./scene-camera.js') : root.MotionSceneCamera,
    typeof module === 'object' && module.exports ? require('./scene-composite.js') : root.MotionSceneComposite);
  if (typeof module === 'object' && module.exports) module.exports = value;
  else { root.MotionRecipeModules = root.MotionRecipeModules || {}; root.MotionRecipeModules.scene = value; }
})(typeof globalThis === 'undefined' ? this : globalThis, (camera, composite) => {
  
  if (!camera || !composite) throw new Error('Scene helpers must load before scene.js: scene-camera.js and scene-composite.js');
  const TAU = Math.PI * 2, W = 720, H = 400;
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
  const mod = v => ((v % 1) + 1) % 1;
  function hash(n, seed) { let x = (n ^ seed) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }
  function circle(c, x, y, r, color) { c.fillStyle = color; c.beginPath(); c.arc(x, y, Math.max(.01, r), 0, TAU); c.fill(); }
  function line(c, x, y, xx, yy, color, width) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.stroke(); }
  function text(c, value, x, y, size, color) { c.font = `${size}px system-ui, sans-serif`; c.fillStyle = color; c.fillText(value, x, y); }
  function backdrop(c) { c.fillStyle = '#101c30'; c.fillRect(0, 0, W, H); c.strokeStyle = '#24374d'; c.lineWidth = 1; for (let x = 0; x < W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } }
  function emblem(c, label) { c.fillStyle = '#183b50'; c.fillRect(190, 95, 340, 210); circle(c, 360, 174, 48, '#66dcca'); circle(c, 360, 174, 25, '#183b50'); text(c, label, 215, 267, 24, '#edf4f8'); }
  function star(c, x, y, r, color) { c.fillStyle = color; c.beginPath(); for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4, rr = j % 2 ? r * .24 : r; if (j) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + rr, y); } c.closePath(); c.fill(); }
  const defs = {
    'aurora-glow': ['light', '极光光幕 / Aurora ribbons', {strength:[.1,1],width:[10,80],cycles:[1,4]}],
    'bloom-reveal': ['light', '高亮泛光揭示 / Emissive bloom', {strength:[.1,1],width:[2,30]}],
    'energy-charge': ['light', '聚能环 / Charge accumulation', {strength:[.1,1],width:[2,20]}],
    'glow-pulse': ['light', '柔和光晕呼吸 / Glow envelope', {strength:[.1,1],width:[2,30],cycles:[1,3]}],
    'holographic-sheen': ['light', '全息色带 / Spectral sheen', {strength:[.1,1],width:[30,180]}],
    'lens-flare-sweep': ['light', '镜头眩光轴 / Flare ghosts', {strength:[.1,1],width:[10,80]}],
    'light-sweep': ['light', '材质高光扫描 / Clipped highlight', {strength:[.1,1],width:[20,150]}],
    'light-trail': ['light', '解析光迹 / Time-sampled trail', {strength:[.1,1],width:[2,12]}],
    'neon-flicker': ['light', '霓虹启辉 / Neon ignition', {strength:[.1,1],width:[2,20]}],
    'radial-flash': ['light', '放射冲击线 / Radial rays', {strength:[.1,1],width:[1,8]}],
    'rim-glow': ['light', '轮廓发光 / Silhouette rim', {strength:[.1,1],width:[2,25]}],
    'scan-line': ['light', '扫描束 / Raster beam', {strength:[.1,1],width:[2,30]}],
    'lk-crt': ['look', '扫描线显示 / CRT raster', {amount:[.1,1],rate:[1,4]}],
    'lk-grain': ['look', '胶片颗粒 / Seeded film grain', {amount:[.1,1],rate:[1,24]}],
    'lk-halftone': ['look', '网点成像 / Tonal halftone', {amount:[.1,1],spacing:[5,20]}],
    'lk-handwrite': ['look', '笔迹写入 / Brush path reveal', {amount:[.1,1]}],
    'lk-mblur': ['look', '子帧曝光 / Subframe exposure', {amount:[.1,1],samples:[3,16]}],
    'lk-papercut': ['look', '纸片停格 / Stepped cutout', {amount:[.1,1],rate:[4,16]}],
    'lk-pixel': ['look', '像素采样 / Nearest-neighbor pixels', {amount:[.1,1],cell:[6,28]}],
    'lk-riso': ['look', '双版错位 / Plate misregistration', {amount:[.1,1]}],
    'lk-vignette': ['look', '暗角呼吸 / Vignette aperture', {amount:[.1,1],rate:[1,3]}],
    'lk-watercolor': ['look', '水彩浸染 / Pigment wash', {amount:[.1,1]}],
    'lp-boil': ['loops', '线条沸腾 / Cyclic contour boil', {amplitude:[1,12],steps:[3,8]}],
    'lp-conic': ['loops', '旋转色环 / Angular hue ring', {cycles:[1,4]}],
    'lp-float': ['loops', '悬浮 / Periodic buoyancy', {amplitude:[5,45],cycles:[1,4]}],
    'lp-holdcycle': ['loops', '停留循环 / Hold then orbit', {hold:[.1,.8],cycles:[1,4]}],
    'lp-marquee': ['loops', '连续字带 / Repeated marquee', {cycles:[1,4]}],
    'lp-seamless': ['loops', '接缝平铺 / Tile wrap', {cycles:[1,4]}],
    'lp-wobble': ['loops', '形状摆动 / Harmonic deformation', {amplitude:[2,20],cycles:[1,4]}],
    'ch-blink': ['character', '眼睑闭合 / Eyelid closure', {amount:[.3,1]}],
    'ch-idle': ['character', '躯干呼吸 / Chest breathing', {amount:[.2,1],cycles:[1,3]}],
    'ch-jump': ['character', '预备起跳落地 / Anticipation and landing', {amount:[.2,1]}],
    'ch-tail': ['character', '尾巴滞后 / Segment follow-through', {amount:[.2,1]}],
    'ch-take': ['character', '惊讶反应 / Recoil pose', {amount:[.2,1]}],
    'ch-turn': ['character', '头部转向 / Facial plane turn', {amount:[.2,1]}],
    'ch-walk': ['character', '交替步态 / Articulated gait', {amount:[.2,1],cycles:[1,4]}],
    'pt-coalesce': ['particles', '散点聚形 / Target coalescence', {count:[12,96],travel:[30,160]}],
    'pt-confetti': ['particles', '彩纸弹道 / Ballistic confetti', {count:[12,96],travel:[30,160]}],
    'pt-embers': ['particles', '热流余烬 / Advected embers', {count:[12,96],travel:[30,160]}],
    'pt-fireworks': ['particles', '发射爆裂拖尾 / Launch burst trails', {count:[12,96],travel:[30,160]}],
    'pt-flow': ['particles', '解析流场 / Streamline motion', {count:[12,96],travel:[30,160]}],
    'pt-snow': ['particles', '风中落雪 / Wrapped falling snow', {count:[12,96],travel:[30,160]}],
    'pt-swarm': ['particles', '群集轨道 / Phase-distributed swarm', {count:[12,96],travel:[30,160]}],
    'pt-twinkle': ['particles', '星点包络 / Local sparkle envelope', {count:[12,96],travel:[30,160]}],
    'sd-bars': ['sound', '频带包络 / Authored band envelopes', {bpm:[60,180],beats:[4,12],releaseMs:[80,600]}],
    'sd-cues': ['sound', '音效时间偏移 / Cue grid offsets', {bpm:[60,180],beats:[4,12],offsetMs:[-200,200]}],
    'sd-duck': ['sound', '侧链压低 / Sidechain gain envelope', {bpm:[60,180],beats:[4,12],releaseMs:[80,600],depth:[.2,.9]}],
    'sd-lyric': ['sound', '词语时间锁定 / Word onset timeline', {bpm:[60,180],beats:[4,12],offsetMs:[-200,200]}]
  };
  const integerKeys = new Set(['count','cycles','steps','samples','beats','cell','spacing']);
  function validate(id, p) {
    const schema = defs[id][2];
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new TypeError(`scene.${id}: parameters must be an object`);
    for (const key of Object.keys(p)) if (!Object.hasOwn(schema, key)) throw new Error(`scene.${id}: unknown parameter ${key}`);
    for (const [key, range] of Object.entries(schema)) if (!Number.isFinite(p[key]) || p[key] < range[0] || p[key] > range[1] || (integerKeys.has(key) && !Number.isInteger(p[key]))) throw new RangeError(`scene.${id}: ${key} must be ${integerKeys.has(key) ? 'an integer ' : ''}in [${range}]`);
  }
  function particles(c, id, p, t, reduced, dots) {
    const q = reduced ? (id === 'pt-coalesce' ? 1 : .65) : t, palette = ['#77e4cf','#ffd18a','#dba2fb','#8db9ff'];
    if (id === 'pt-fireworks' && !reduced && q < .24) { const y = 342 - q / .24 * 210; line(c,360,y,360,y+36,'#ffc477',3); circle(c,360,y,4,'#ffffff'); return; }
    for (let i = 0; i < p.count; i++) {
      const d = dots[i], a = i / p.count * TAU, r = p.travel, life = mod(q + d.b), u = smooth(q);
      let x, y, alpha = 1;
      if (id === 'pt-coalesce') { const tx = 360 + Math.cos(a) * 88, ty = 195 + Math.sin(a) * 88; x = tx + (d.a-.5)*r*3*(1-u); y = ty + (d.b-.5)*r*2*(1-u); }
      else if (id === 'pt-confetti') { x = 360 + (d.a-.5)*r*3*q; y = 275 - (90+d.b*r)*q + 210*q*q; }
      else if (id === 'pt-embers') { x = 140+d.a*440 + Math.sin(life*8+d.b*8)*r*.15; y = 340-life*(160+r); alpha = Math.sin(life*Math.PI); }
      else if (id === 'pt-fireworks') { const f = clamp((q-.24)/.76); x = 360 + Math.cos(a)*r*1.3*f; y = 132+Math.sin(a)*r*1.3*f+55*f*f; alpha = 1-f*.7; if(!reduced) line(c,x,y,x-Math.cos(a)*r*.08,y-Math.sin(a)*r*.08,'#e3a882',2); }
      else if (id === 'pt-flow') { x = 80+mod(d.a+q*.7)*560; y = 195+Math.sin(x/95+d.b*TAU)*r*.55; }
      else if (id === 'pt-snow') { x = 70+d.a*580+Math.sin(life*TAU+d.a*8)*r*.12; y = 50+life*290; }
      else if (id === 'pt-swarm') { x = 360+Math.cos(a+q*TAU)*(55+d.a*r); y = 200+Math.sin(a*3+q*TAU)*(25+d.b*r*.5); }
      else if (id === 'pt-twinkle') { x = 360+(d.a-.5)*(240+r*2); y = 195+(d.b-.5)*(100+r); alpha = reduced ? .8 : .25+.75*((1+Math.sin(q*TAU+d.a*TAU))/2) ** 3; }
      c.globalAlpha = reduced ? .85 : alpha;
      if (id === 'pt-confetti') { c.save(); c.translate(x,y); c.rotate(reduced ? d.a*TAU : q*TAU*(1+d.a)); c.fillStyle=palette[i%4]; c.fillRect(-4,-2,8,4); c.restore(); }
      else if (id === 'pt-twinkle') star(c,x,y,3+alpha*7,palette[i%4]);
      else circle(c,x,y,id==='pt-snow'?2+d.a*3:3,palette[i%4]);
    }
    c.globalAlpha=1;
  }
  function loop(c,id,p,t,reduced,dots,label) {
    const q = reduced ? 0 : mod(t * (p.cycles || 1)), phase = q * TAU;
    if(id==='lp-conic') { for(let j=0;j<96;j++){ c.strokeStyle=`hsl(${j/96*360+phase*180/Math.PI} 75% 65%)`;c.lineWidth=24;c.beginPath();c.arc(360,190,86,j/96*TAU,(j+1.1)/96*TAU);c.stroke(); } }
    else if(id==='lp-marquee'||id==='lp-seamless') { c.save();c.beginPath();c.rect(80,120,560,150);c.clip(); const shift=q*(id==='lp-seamless'?360:180); for(let i=-2;i<6;i++){const x=80+i*180-shift;if(id==='lp-marquee')text(c,label.slice(0,7),x,205,24,'#77e4cf');else {c.fillStyle=i%2?'#375f83':'#1d4a60';c.fillRect(x,120,180,150);circle(c,x+90,195,32,'#7be6ce');}}c.restore(); }
    else if(id==='lp-boil') { const step=q*p.steps, lo=Math.floor(step), mix=smooth(step-lo);c.beginPath();for(let i=0;i<=64;i++){const a=i/64*TAU,k=i%64,seed=Math.floor(dots[k].a*2147483647);const j1=hash(k+lo*71,seed),j2=hash(k+((lo+1)%p.steps)*71,seed),r=85+p.amplitude*((1-mix)*j1+mix*j2-.5);if(i)c.lineTo(360+Math.cos(a)*r,190+Math.sin(a)*r);else c.moveTo(360+r,190);}c.closePath();c.strokeStyle='#86e4d0';c.lineWidth=4;c.stroke(); }
    else if(id==='lp-wobble') { c.beginPath();for(let i=0;i<=80;i++){const a=i/80*TAU,r=80+p.amplitude*(Math.sin(a*3+phase)*.6+Math.sin(a*5-phase*2)*.4);if(i)c.lineTo(360+Math.cos(a)*r,190+Math.sin(a)*r);else c.moveTo(360+r,190);}c.closePath();c.fillStyle='#72daca';c.fill(); }
    else { const orbit=id==='lp-holdcycle' ? smooth(clamp((q-p.hold)/(1-p.hold)))*TAU : phase; const x=id==='lp-holdcycle'?360+Math.sin(orbit)*110:360;const y=id==='lp-float'?195+Math.sin(phase)*p.amplitude:195-Math.cos(orbit)*55;circle(c,x,y,42,'#8ee6d3');line(c,x-12,y,x+12,y,'#1d435b',4); }
  }
  function character(c,id,p,t,reduced) {
    const q=reduced?(id==='ch-turn'?1:0):t, a=p.amount, cycle=q*(p.cycles||1)*TAU;
    let y=240, squash=1, gaze=0, arm=0, gait=0, blink=1, head=0;
    if(id==='ch-idle') { squash=1+Math.sin(cycle)*.07*a; head=Math.sin(cycle)*3*a; }
    if(id==='ch-blink') blink=1-a*Math.sin(Math.PI*clamp((q-.2)/.6)) ** 8;
    if(id==='ch-jump') { if(q<.2)squash=1-.22*a*Math.sin(q/.2*Math.PI/2);else if(q<.78){const u=(q-.2)/.58;y-=Math.sin(u*Math.PI)*110*a;squash=1+.15*a*Math.sin(u*Math.PI);}else squash=1-.2*a*Math.sin((q-.78)/.22*Math.PI);arm=(240-y)/110; }
    if(id==='ch-take'){const u=Math.sin(Math.PI*q);head=-u*22*a;arm=u*a;gaze=u*.4*a;squash=1-u*.12*a;}
    if(id==='ch-turn')gaze=(smooth(q)*2-1)*a;
    if(id==='ch-walk'){gait=Math.sin(cycle)*a;y-=Math.abs(Math.cos(cycle))*8*a;arm=-gait*.3;}
    line(c,150,310,570,310,'#536a80',2);
    c.save();c.translate(360,y); c.lineCap='round';
    // Articulated upper/lower legs retain planted ground contact in the neutral pose.
    for(let side=-1;side<=1;side+=2){const swing=gait*side;const kneeX=side*22+swing*22,kneeY=38-Math.max(0,swing)*8;line(c,side*18,12,kneeX,kneeY,'#6dc8b7',13);line(c,kneeX,kneeY,side*26-swing*30,70-Math.max(0,swing)*18,'#74d9c5',12);}
    // Tail segment rotations sample delayed owner impulse analytically, not previous frames.
    let tx=36,ty=-10;for(let j=0;j<6;j++){const lag=j*.045,u=Math.max(0,q-lag),w=id==='ch-tail'?a*(Math.sin(u*10)*Math.exp(-u*2.7)+Math.sin(q*Math.PI)*.45):.15;const angle=.2+j*.16+w*(1+j*.2);const nx=tx+Math.cos(angle)*18,ny=ty-Math.sin(angle)*18;line(c,tx,ty,nx,ny,'#e8b57e',10-j);tx=nx;ty=ny;}
    c.fillStyle='#75d8c4';c.beginPath();c.ellipse(0,-12,43,57*squash,0,0,TAU);c.fill();
    for(let side=-1;side<=1;side+=2){line(c,side*34,-38,side*(52+arm*14),-8-arm*54,'#a2ebd8',12);}
    c.save();c.translate(gaze*7,-85+head);circle(c,-33,-10,13,'#86e2cd');circle(c,33,-10,13,'#86e2cd');circle(c,0,0,42,'#b5ecdc');
    for(let side=-1;side<=1;side+=2){c.fillStyle='#102e43';c.beginPath();c.ellipse(side*15+gaze*13,-1,4*(1-Math.abs(gaze)*.25),Math.max(.8,7*blink+(id==='ch-take'?arm*5:0)),0,0,TAU);c.fill();}
    line(c,-8+gaze*10,17,8+gaze*10,17,'#245766',3);c.restore();c.restore();
  }
  function light(c,id,p,t,reduced,source) {
    const q=reduced?(id==='bloom-reveal'||id==='energy-charge'?1:.65):t, s=p.strength, bw=p.width, u=smooth(q), pulse=(1+Math.sin(q*TAU*(p.cycles||1)))/2;
    c.drawImage(source,0,0);
    c.save();c.globalCompositeOperation='screen';c.globalAlpha=s;
    if(id==='aurora-glow') { for(let k=0;k<5;k++){c.strokeStyle=`hsla(${145+k*22} 85% 65% / .3)`;c.lineWidth=bw;c.beginPath();for(let x=50;x<=670;x+=10){const y=130+Math.sin(x/110+q*TAU*p.cycles+k*.5)*45+k*18;if(x===50)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();} }
    else if(id==='bloom-reveal'||id==='glow-pulse'||id==='neon-flicker'){let e=id==='bloom-reveal'?u:id==='glow-pulse'?.2+.8*pulse:.3+.7*u;if(id==='neon-flicker'&&!reduced){const flick=q<.32?.35+.3*Math.sin(q*52)*Math.sin(q*91):1;e*=flick;}c.globalAlpha=s*e;c.shadowColor='#80fff0';c.shadowBlur=bw*2;c.strokeStyle='#8af3db';c.lineWidth=4;c.beginPath();c.arc(360,174,48,0,TAU);c.stroke();}
    else if(id==='energy-charge') { c.strokeStyle='#c1ffed';c.lineWidth=bw;c.beginPath();c.arc(360,174,67,-Math.PI/2,-Math.PI/2+u*TAU);c.stroke();for(let k=0;k<10;k++){const a=k/10*TAU,r=120-45*u;line(c,360+Math.cos(a)*r,174+Math.sin(a)*r,360+Math.cos(a)*(r+12),174+Math.sin(a)*(r+12),'#80e8ed',2);} }
    else if(id==='holographic-sheen'||id==='light-sweep'){c.beginPath();c.rect(190,95,340,210);c.clip();const x=120+q*480;const g=c.createLinearGradient(x-bw,0,x+bw,0);g.addColorStop(0,'#000000');g.addColorStop(.5,id==='light-sweep'?'#fff7ca':'#dd72ff');g.addColorStop(.7,id==='light-sweep'?'#4a513f':'#57ffcc');g.addColorStop(1,'#000000');c.fillStyle=g;c.transform(1,0,-.3,1,55,0);c.fillRect(x-bw,80,bw*2,230);}
    else if(id==='lens-flare-sweep'){const x=100+q*520,y=105+q*90;for(let k=0;k<5;k++){const xx=x+(360-x)*k*.5,yy=y+(200-y)*k*.5;c.globalAlpha=s*(.6-k*.09);circle(c,xx,yy,bw*(1-k*.12),'#c7dfcc');}line(c,x-90,y,x+90,y,'#fff5d5',3);}
    else if(id==='light-trail'){for(let k=24;k>=0;k--){const past=Math.max(0,q-k*.012),x=100+past*520,y=195+Math.sin(past*TAU)*80;c.globalAlpha=s*(1-k/25)*.6;circle(c,x,y,bw,'#86fff2');}}
    else if(id==='radial-flash'){const e=reduced?.5:Math.sin(Math.PI*q);for(let k=0;k<20;k++){const a=k/20*TAU,r=60+q*100;line(c,360+Math.cos(a)*r,174+Math.sin(a)*r,360+Math.cos(a)*(r+35*e),174+Math.sin(a)*(r+35*e),'#fff0cb',bw);} }
    else if(id==='rim-glow'){c.shadowColor='#a0fff1';c.shadowBlur=bw;c.strokeStyle='#87ffe3';c.lineWidth=bw*.4;c.beginPath();c.arc(360,174,49,-Math.PI/2+q*Math.PI,-Math.PI/2+q*Math.PI+Math.PI*.8);c.stroke();}
    else if(id==='scan-line'){const y=95+q*210;c.beginPath();c.rect(190,95,340,210);c.clip();const g=c.createLinearGradient(0,y-bw,0,y+bw);g.addColorStop(0,'#000000');g.addColorStop(.5,'#9fffde');g.addColorStop(1,'#000000');c.fillStyle=g;c.fillRect(190,y-bw,340,bw*2);}
    c.restore();
  }
  function look(c,id,p,t,reduced,source,dots,scratch,label) {
    const q=reduced?(id==='lk-handwrite'||id==='lk-watercolor'?1:.6):t,a=p.amount,g=scratch.getContext('2d');c.drawImage(source,0,0);
    if(id==='lk-crt'){c.fillStyle=`rgba(0,0,0,${a*.55})`;for(let y=0;y<H;y+=4)c.fillRect(0,y,W,1);if(!reduced){c.fillStyle=`rgba(144,255,223,${a*.09})`;c.fillRect(0,mod(q*p.rate)*H,W,14);} }
    else if(id==='lk-grain'){const frame=reduced?0:Math.floor(q*p.rate);for(let i=0;i<900;i++){const seed=Math.floor(dots[i%120].a*2147483647),h=hash(i+frame*997,seed);c.fillStyle=`rgba(${h>.5?'250,239,216':'0,0,0'},${a*.18})`;c.fillRect(hash(i*3,seed+frame+4)*W,hash(i*3+1,seed+frame+4)*H,2,2);} }
    else if(id==='lk-halftone'){c.fillStyle='#ebe7db';c.fillRect(190,95,340,210);for(let y=100;y<305;y+=p.spacing)for(let x=195;x<530;x+=p.spacing){const tonal=(1+Math.sin(x/55)*Math.cos(y/45))/2;circle(c,x,y,p.spacing*(.12+tonal*.32)*a*(reduced?1:.25+.75*smooth(q)),'#1b4c61');} }
    else if(id==='lk-handwrite'){c.fillStyle='#f0e5cc';c.fillRect(165,90,390,225);c.strokeStyle='#153e50';c.lineWidth=4+12*a;c.lineCap='round';c.beginPath();const n=Math.floor(smooth(q)*100);for(let j=0;j<=n;j++){const x=210+j*3,y=210+Math.sin(j*.15)*36+Math.cos(j*.04)*16;if(j)c.lineTo(x,y);else c.moveTo(x,y);}c.stroke();}
    else if(id==='lk-mblur'){c.fillStyle='#101c30';c.fillRect(190,80,340,245);const samples=reduced?1:p.samples;for(let k=0;k<samples;k++){const past=q-k/(Math.max(1,p.samples-1))*.08*a,x=180+past*350;c.globalAlpha=1/samples;circle(c,x,195,38,'#8bf0d6');}c.globalAlpha=1;}
    else if(id==='lk-papercut'){const u=reduced?.5:Math.floor(q*p.rate)/p.rate;c.fillStyle='#e9dcc0';c.fillRect(150,65,420,275);c.save();c.translate(280+u*150,190);c.rotate(Math.sin(u*TAU)*a*.2);c.shadowColor='#66543d';c.shadowBlur=0;c.shadowOffsetX=5;c.shadowOffsetY=7;c.fillStyle='#569e96';c.beginPath();c.moveTo(-48,50);c.lineTo(-35,-52);c.lineTo(55,-38);c.lineTo(39,43);c.closePath();c.fill();c.restore();}
    else if(id==='lk-pixel'){const cell=Math.max(2,Math.round(p.cell*(.3+a*(1-q))));const sw=Math.max(1,Math.floor(W/cell)),sh=Math.max(1,Math.floor(H/cell));g.clearRect(0,0,W,H);g.drawImage(source,0,0,W,H,0,0,sw,sh);c.imageSmoothingEnabled=false;c.drawImage(scratch,0,0,sw,sh,0,0,W,H);c.imageSmoothingEnabled=true;}
    else if(id==='lk-riso'){c.fillStyle='#e8dfcf';c.fillRect(150,65,420,275);c.globalCompositeOperation='multiply';circle(c,345-a*14*(1+q),185,69,'#ea6578');circle(c,360+a*18*(1-q),190,69,'#60bec5');c.globalCompositeOperation='source-over';}
    else if(id==='lk-vignette'){const inner=80+(reduced?.5:(1+Math.sin(q*TAU*p.rate))/2)*70;const v=c.createRadialGradient(360,195,inner,360,195,360);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(0,0,0,${a})`);c.fillStyle=v;c.fillRect(0,0,W,H);}
    else if(id==='lk-watercolor'){c.fillStyle='#efe5cf';c.fillRect(150,65,420,275);c.save();c.globalCompositeOperation='multiply';for(let i=0;i<120;i++){const d=dots[i],r=(8+d.a*30)*(.3+.7*smooth(q));c.globalAlpha=a*.05;circle(c,210+d.a*300,125+d.b*130,r,i%2?'#67a98f':'#678dba');}c.restore();}
    text(c,label,180,358,16,'#d3e4e9');
  }
  function sound(c,id,p,t,reduced,words,caption) {
    const beatMs=60000/p.bpm,total=p.beats*beatMs,time=t*total;
    function env(at, offset, release){const d=at-offset;return d<0?0:Math.exp(-d/release);}
    const x0=90,x1=630,y=280;
    line(c,x0,y,x1,y,'#657c90',2);
    for(let i=0;i<=p.beats;i++){const x=x0+i/p.beats*(x1-x0);line(c,x,y-8,x,y+8,'#8298ac',1);text(c,String(i),x-4,y+28,13,'#c5d3df');}
    line(c,x0+t*(x1-x0),80,x0+t*(x1-x0),y+12,'#ffda8b',2);
    if(id==='sd-bars'){for(let band=0;band<16;band++){let e=0;for(let beat=0;beat<p.beats;beat++){const delay=beat*beatMs+band*7;const gain=.3+.7*(1+Math.sin(band*1.9+beat*2.3))/2;e+=gain*env(time,delay,p.releaseMs*(.6+band/20));}const level=reduced?.25+.55*(1+Math.sin(band*1.9))/2:Math.min(1,e);c.fillStyle=band%3?'#77d9c6':'#f0c986';c.fillRect(100+band*32,245-level*135,21,level*135);}caption.textContent=`Authored frequency-band envelopes, not measured audio. ${Math.round(time)} ms; ${p.bpm} BPM; release ${p.releaseMs} ms.`;}
    else if(id==='sd-cues'){for(let beat=0;beat<p.beats;beat++){const onset=beat*beatMs+p.offsetMs,x=x0+onset/total*(x1-x0);line(c,x,145,x,245,'#79dfc8',3);text(c,`S${beat+1}`,x-8,132,12,'#d9efe8');circle(c,x,190,reduced?5:5+12*env(time,onset,110),'#79dfc8');}caption.textContent=`Cue onset = beat × ${Math.round(beatMs)} ms + ${p.offsetMs} ms. Cursor ${Math.round(time)} ms; schematic, silent.`;}
    else if(id==='sd-duck'){c.strokeStyle='#80e3d0';c.lineWidth=3;c.beginPath();let gain=1;for(let j=0;j<=300;j++){const at=j/300*total;let envelope=0;for(let b=0;b<p.beats;b++)envelope=Math.max(envelope,env(at,b*beatMs,p.releaseMs));const value=1-p.depth*envelope;const x=x0+j/300*(x1-x0),yy=225-value*110;if(j)c.lineTo(x,yy);else c.moveTo(x,yy);}c.stroke();const latest=Math.min(p.beats-1,Math.floor(time/beatMs))*beatMs;gain=1-p.depth*env(time,latest,p.releaseMs);text(c,`gain ${gain.toFixed(2)}`,110,65,20,'#dcf4ec');caption.textContent=`Sidechain: gain = 1 − ${p.depth} × onset envelope, recovery ${p.releaseMs} ms. Silent gain curve; no compressor/audio rendered.`;}
    else {const count=Math.min(words.length,8,p.beats),slot=(x1-x0)/Math.max(1,count);for(let i=0;i<count;i++){const onset=i/p.beats*total+p.offsetMs,active=time>=onset;const x=x0+i*slot;text(c,words[i],x,185,20,active?'#89edcf':'#8297ab');line(c,x0+onset/total*(x1-x0),215,x0+onset/total*(x1-x0),260,'#66b3c1',2);}caption.textContent=`Words locked to authored onset timestamps (offset ${p.offsetMs} ms), not speech recognition. Cursor ${Math.round(time)} ms. Full sample remains in the accessible image description.`;}
    text(c,`${p.bpm} BPM • ${p.beats} beats • ${Math.round(total)} ms`,90,350,17,'#cde2e7');
  }
  const recipes = Object.assign({}, camera.recipes, composite.recipes);
  for (const [id, def] of Object.entries(defs)) {
    const key=`scene.${id}`;
    recipes[key]={title:def[1],validate:p=>validate(id,p),create(stage,p,options){
      validate(id,p);if(!stage || !stage.ownerDocument)throw new TypeError(`${key}: DOM stage required`);
      const doc=stage.ownerDocument, opts=options||{},seed=Number.isFinite(opts.seed)?Math.trunc(opts.seed):31,reduced=opts.reducedMotion===true;
      const label=typeof opts.text==='string'&&opts.text.trim()?opts.text:'光与时间 Motion';
      let words=[];
      if(id==='sd-lyric'){
        if(typeof Intl.Segmenter!=='function')throw new Error(`${key}: Intl.Segmenter required for word/grapheme preservation`);
        words=Array.from(new Intl.Segmenter(undefined,{granularity:'word'}).segment(label)).filter(x=>x.isWordLike).map(x=>x.segment);
        if(words.length===0)words=Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(label),x=>x.segment).filter(x=>x.trim());
      }
      const wrap=doc.createElement('div'),canvas=doc.createElement('canvas'),caption=doc.createElement('p');
      wrap.style.cssText='width:100%;max-width:900px;margin:auto;';canvas.width=W;canvas.height=H;canvas.style.cssText='width:100%;height:auto;display:block;';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${def[1]} · ${label}`);caption.style.cssText='margin:8px 14px;font:14px/1.5 system-ui,sans-serif;color:inherit;';caption.textContent=`${def[1]} — original seekable study${reduced?' · reduced static presentation':''}`;
      wrap.append(canvas,caption);stage.append(wrap);stage.dataset.recipe=key;
      const c=canvas.getContext('2d');if(!c){wrap.remove();delete stage.dataset.recipe;throw new Error(`${key}: Canvas 2D unavailable`);}
      const source=doc.createElement('canvas'),scratch=doc.createElement('canvas');source.width=scratch.width=W;source.height=scratch.height=H;const sc=source.getContext('2d');if(!sc){wrap.remove();delete stage.dataset.recipe;throw new Error(`${key}: offscreen Canvas 2D unavailable`);}backdrop(sc);emblem(sc,label.slice(0,16));
      const dots=Array.from({length:120},(_,i)=>({a:hash(i*2,seed),b:hash(i*2+1,seed)}));let disposed=false;
      function seek(progress){if(disposed)throw new Error(`${key}: disposed`);if(!Number.isFinite(progress)||progress<0||progress>1)throw new RangeError(`${key}: progress must be finite in [0,1]`);const t=reduced?(def[0]==='loops'||def[0]==='character'?0:.65):progress;c.clearRect(0,0,W,H);backdrop(c);
        if(def[0]==='particles')particles(c,id,p,t,reduced,dots);
        else if(def[0]==='loops')loop(c,id,p,t,reduced,dots,label);
        else if(def[0]==='character')character(c,id,p,t,reduced);
        else if(def[0]==='light')light(c,id,p,t,reduced,source);
        else if(def[0]==='look')look(c,id,p,t,reduced,source,dots,scratch,label);
        else sound(c,id,p,t,reduced,words,caption);
        canvas.dataset.progress=String(progress);canvas.dataset.presentationProgress=String(t);
      }
      seek(0);return {seek,dispose(){if(disposed)return;disposed=true;wrap.remove();source.width=source.height=scratch.width=scratch.height=canvas.width=canvas.height=0;if(stage.dataset.recipe===key)delete stage.dataset.recipe;}};
    }};
  }
  return {group:'scene',recipes};
});
