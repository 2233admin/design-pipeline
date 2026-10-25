(((root, factory) => {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text-core.js'));
  else {
    root.MotionTextParts = root.MotionTextParts || {};
    root.MotionTextParts.glyph = factory(root.MotionTextCore);
  }
})(typeof globalThis === 'undefined' ? this : globalThis, core => {
  
  if (!core) throw new Error('MotionTextCore must be loaded before text-glyph.js');
  const recipes = {};
  const TAU = Math.PI * 2;
  const range = (min, max) => ({ min, max });
  const integer = (min, max) => value => Number.isInteger(value) && value >= min && value <= max;
  const spread = range(0, 0.85);
  const out = t => 1 - (1 - t) ** 3;
  const smooth = t => t * t * (3 - 2 * t);
  const pulse = t => Math.sin(Math.PI * t) ** 2;
  const pop = (t, amount) => t === 1 ? 1 : 1 - Math.exp(-7 * t) * Math.cos(TAU * amount * t);
  const add = (name, title, schema, render) => {
    recipes['text.glyph-' + name] = core.recipe('text.glyph-' + name, title, schema, render);
  };
  function rest(tokens) {
    for (const node of tokens.nodes) {
      node.style.transform = 'none'; node.style.opacity = '1';
      node.style.filter = 'none'; node.style.clipPath = 'none';
    }
  }
  function staticStudy(view) {
    const tokens = core.tokens(view, 'whole');
    return core.lifecycle(view, () => rest(tokens));
  }
  function freeze(tokens) {
    const bounds = tokens.box.getBoundingClientRect();
    const positions = tokens.nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { x:rect.left - bounds.left, y:rect.top - bounds.top, w:rect.width, h:rect.height };
    });
    Object.assign(tokens.box.style, { display:'block', position:'relative', width:bounds.width + 'px', height:bounds.height + 'px', flexWrap:'nowrap' });
    tokens.nodes.forEach((node, i) => Object.assign(node.style, { position:'absolute', left:positions[i].x + 'px', top:positions[i].y + 'px' }));
    return { positions, width:bounds.width, height:bounds.height };
  }
  function focus(tokens, ratio) {
    const indices = [];
    tokens.units.forEach((value, i) => { if (value.trim()) indices.push(i); });
    return indices.length ? indices[Math.round(ratio * (indices.length - 1))] : -1;
  }
  function springRemaining(time, stiffness, damping) {
    const discriminant = damping * damping - 4 * stiffness;
    if (Math.abs(discriminant) < 1e-8) return Math.exp(-damping * time / 2) * (1 + damping * time / 2);
    if (discriminant < 0) {
      const frequency = Math.sqrt(-discriminant) / 2;
      return Math.exp(-damping * time / 2) * (Math.cos(frequency * time) + damping / (2 * frequency) * Math.sin(frequency * time));
    }
    const root = Math.sqrt(discriminant), a = (-damping + root) / 2, b = (-damping - root) / 2;
    return (-b * Math.exp(a * time) + a * Math.exp(b * time)) / (a - b);
  }
  function sample(frames, t, index) {
    const frame = t * (frames.length - 1), low = Math.floor(frame), high = Math.min(frames.length - 1, low + 1);
    return frames[low][index] + (frames[high][index] - frames[low][index]) * (frame - low);
  }
  function ink(view, parent, path, color, width) {
    const svg = view.svg('svg', { viewBox:'0 0 100 50', preserveAspectRatio:'none', 'aria-hidden':'true' }, parent);
    Object.assign(svg.style, { position:'absolute', inset:'-20%', width:'140%', height:'140%', overflow:'visible', pointerEvents:'none' });
    const line = view.svg('path', { d:path, fill:'none', stroke:color, 'stroke-width':width, 'stroke-linecap':'round', 'stroke-linejoin':'round', pathLength:1 }, svg);
    line.style.strokeDasharray = '1';
    return line;
  }
  function raster(view) {
    const doc = view.root.ownerDocument;
    const computed = doc.defaultView.getComputedStyle(view.root);
    const width = Math.floor(view.root.getBoundingClientRect().width - 48);
    if (!(width > 0)) throw new Error('Raster text requires a visible measurable stage');
    const fontSize = Number.parseFloat(computed.fontSize);
    if (!(fontSize > 0)) throw new Error('Raster text requires resolved font metrics');
    const surface = doc.createElement('canvas');
    const measure = surface.getContext('2d');
    if (!measure) throw new Error('Canvas 2D is required for raster glyph studies');
    const font = (computed.fontWeight || '400') + ' ' + fontSize + 'px ' + computed.fontFamily;
    measure.font = font;
    const lines = []; let current = '';
    for (const unit of core.segments(view.text, 'char')) {
      if (unit === '\n' || unit === '\r\n' || unit === '\r') { lines.push(current); current = ''; continue; }
      if (current && measure.measureText(current + unit).width > width) { lines.push(current); current = unit; }
      else current += unit;
    }
    lines.push(current);
    const lineHeight = fontSize * 1.5;
    surface.width = width; surface.height = Math.max(1, Math.ceil(lines.length * lineHeight));
    const source = surface.getContext('2d');
    source.font = font; source.textBaseline = 'middle'; source.textAlign = 'center'; source.fillStyle = computed.color;
    lines.forEach((line, i) => source.fillText(line, width / 2, (i + 0.5) * lineHeight));
    const canvas = view.node('canvas', null, { display:'block', width:width + 'px', maxWidth:'100%', height:'auto' });
    canvas.setAttribute('aria-hidden', 'true'); canvas.width = surface.width; canvas.height = surface.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is required for raster glyph studies');
    return { surface, source, canvas, context, width:surface.width, height:surface.height, color:computed.color };
  }

  // Reveal: grouping, ordering, masking and deformation are different channels.
  add('rise', '逐字/逐词上升 · Token Rise', { unit:['char','word'], distance:range(8,100), spread }, (view, p) => {
    const tokens = core.tokens(view, p.unit);
    return core.lifecycle(view, (t, reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node, i) => {
        const q = out(core.phase(t, i, tokens.nodes.length, p.spread));
        node.style.opacity = String(q); node.style.transform = 'translateY(' + p.distance * (1 - q) + 'px)';
      });
    });
  });
  add('line-reveal', '逐行遮显 · Line Reveal', { direction:['up','alternate'], distance:range(12,160), spread }, (view, p) => {
    const tokens = core.tokens(view, 'line');
    tokens.nodes.forEach(node => { node.style.overflow = 'hidden'; });
    return core.lifecycle(view, (t, reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node, i) => {
        const q = smooth(core.phase(t, i, tokens.nodes.length, p.spread));
        node.style.opacity = String(q);
        node.style.transform = p.direction === 'up' ? 'translateY(' + p.distance * (1 - q) + 'px)' : 'translateX(' + (i % 2 ? 1 : -1) * p.distance * (1 - q) + 'px)';
        node.style.clipPath = p.direction === 'up' ? 'inset(0 0 ' + (1 - q) * 100 + '% 0)' : 'inset(0 ' + (i % 2 ? 0 : (1 - q) * 100) + '% 0 ' + (i % 2 ? (1 - q) * 100 : 0) + '%)';
      });
    });
  });
  add('ordered-reveal', '中心/乱序出现 · Ordered Reveal', { order:['center','random'], spread }, (view, p) => {
    const tokens = core.tokens(view, 'char');
    const indices = tokens.nodes.map((_, i) => i);
    indices.sort(p.order === 'center' ? (a,b) => Math.abs(a - (indices.length - 1) / 2) - Math.abs(b - (indices.length - 1) / 2) || a - b : (a,b) => core.random(view.seed,a) - core.random(view.seed,b) || a - b);
    const rank = []; indices.forEach((i, j) => { rank[i] = j; });
    return core.lifecycle(view, (t, reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node, i) => { node.style.opacity = String(out(core.phase(t, rank[i], rank.length, p.spread))); });
    });
  });
  add('elastic-pop', '字素弹性弹出 · Grapheme Pop', { oscillations:range(0.5,3), spread }, (view, p) => {
    const tokens = core.tokens(view, 'char');
    return core.lifecycle(view, (t, reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node, i) => {
        const q = core.phase(t, i, tokens.nodes.length, p.spread);
        node.style.transform = 'scale(' + pop(q,p.oscillations) + ')'; node.style.opacity = String(core.clamp(q * 7));
      });
    });
  });
  add('vertical-unfold', '纵向展开 · Vertical Unfold', { overshoot:range(0,0.4), spread }, (view, p) => {
    const tokens = core.tokens(view, 'char');
    return core.lifecycle(view, (t, reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node, i) => {
        const q = core.phase(t, i, tokens.nodes.length, p.spread);
        node.style.transform = 'scaleY(' + (out(q) + p.overshoot * Math.sin(Math.PI * q)) + ')';
      });
    });
  });
  add('gather', '扩散/散落组装 · Glyph Gather', { distribution:['spread','scatter'], distance:range(20,240), spread }, (view, p) => {
    if (view.reduced) return staticStudy(view);
    const tokens = core.tokens(view, 'char'), layout = freeze(tokens);
    const offsets = layout.positions.map((rect, i) => p.distribution === 'spread' ? { x:(rect.x + rect.w/2 - layout.width/2) / Math.max(1,layout.width/2) * p.distance, y:0, rotation:0 } : { x:(core.random(view.seed,i*3)-0.5)*p.distance*2, y:(core.random(view.seed,i*3+1)-0.5)*p.distance*2, rotation:(core.random(view.seed,i*3+2)-0.5)*120 });
    return core.lifecycle(view, t => {
      tokens.nodes.forEach((node, i) => {
        const q = 1 - smooth(core.phase(t,i,tokens.nodes.length,p.spread)), offset = offsets[i];
        node.style.transform = 'translate(' + offset.x*q + 'px,' + offset.y*q + 'px) rotate(' + offset.rotation*q + 'deg)';
      });
    });
  });
  add('random-pose-in', '随机倾斜缩放归位 · Random Pose', { rotation:range(5,100), initialScale:range(0.1,0.8), spread }, (view,p) => {
    const tokens = core.tokens(view,'char'), angles = tokens.nodes.map((_,i) => (core.random(view.seed,i)-0.5)*2*p.rotation);
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => {
        const q = out(core.phase(t,i,tokens.nodes.length,p.spread));
        node.style.transform = 'rotate(' + angles[i]*(1-q) + 'deg) scale(' + (p.initialScale+(1-p.initialScale)*q) + ')'; node.style.opacity = String(q);
      });
    });
  });
  add('soft-range-reveal', '柔边范围扫显 · Soft Range', { softness:range(0.5,8), lift:range(0,50) }, (view,p) => {
    const tokens = core.tokens(view,'char');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      const selector = t*(Math.max(0,tokens.nodes.length-1)+2*p.softness)-p.softness;
      tokens.nodes.forEach((node,i) => {
        const q = smooth(core.clamp((selector-i+p.softness)/(2*p.softness)));
        node.style.opacity = String(q); node.style.transform = 'translateY(' + p.lift*(1-q) + 'px)';
      });
    });
  });
  add('masked-descent', '字符下滑遮显 · Masked Descent', { distance:range(12,100), spread }, (view,p) => {
    const tokens = core.tokens(view,'char');
    const faces = tokens.nodes.map(node => {
      const text = node.textContent; node.textContent = ''; node.style.overflow = 'hidden';
      return view.node('span',text,{ display:'inline-block' },node);
    });
    return core.lifecycle(view,(t,reduced) => {
      faces.forEach((face,i) => { const q = reduced ? 1 : out(core.phase(t,i,faces.length,p.spread)); face.style.transform = 'translateY(' + -p.distance*(1-q) + 'px)'; });
    });
  });
  add('smear-in', '拉伸拖影入场 · Smear Entrance', { distance:range(20,160), stretch:range(1.2,5), spread }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens = core.tokens(view,'char');
    const trails = tokens.nodes.map(node => view.node('span',node.textContent,{ position:'absolute', left:'0', top:'0', color:'#9ce6ff', transformOrigin:'100% 50%', pointerEvents:'none' },node));
    return core.lifecycle(view,t => {
      tokens.nodes.forEach((node,i) => {
        const q = core.phase(t,i,tokens.nodes.length,p.spread), remaining = 1-out(q);
        node.style.transform = 'translateX(' + -p.distance*remaining + 'px)';
        node.style.opacity = String(core.clamp(q*5));
        trails[i].style.transform = 'translateX(' + -p.distance*remaining*0.2 + 'px) scaleX(' + (1+(p.stretch-1)*pulse(q)) + ') skewX(' + -18*pulse(q) + 'deg)';
        trails[i].style.opacity = String(0.45*pulse(q));
      });
    });
  });
  add('stretch-rise', '纵伸上升归位 · Stretch Rise', { distance:range(10,100), stretch:range(1.1,2.8), spread }, (view,p) => {
    const tokens = core.tokens(view,'char');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => {
        const q = core.phase(t,i,tokens.nodes.length,p.spread);
        node.style.transform = 'translateY(' + p.distance*(1-smooth(q)) + 'px) scaleY(' + (1+(p.stretch-1)*Math.sin(Math.PI*q)) + ')'; node.style.opacity = String(out(q));
      });
    });
  });
  add('tracking-expand', '紧字距展开 · Tracking Expand', { compression:range(0.1,0.8), spread }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens = core.tokens(view,'char'), layout = freeze(tokens);
    return core.lifecycle(view,t => {
      tokens.nodes.forEach((node,i) => {
        const q = out(core.phase(t,i,tokens.nodes.length,p.spread)), rect = layout.positions[i];
        node.style.transform = 'translateX(' + (layout.width/2-rect.x-rect.w/2)*(1-p.compression)*(1-q) + 'px)';
      });
    });
  });
  add('word-ghost', '词语幽影显现 · Word Ghost', { offset:range(4,36), spread }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens = core.tokens(view,'word');
    const ghosts = tokens.nodes.map(node => view.node('span',node.textContent,{ position:'absolute', inset:'0', color:'#94caff', pointerEvents:'none' },node));
    return core.lifecycle(view,t => {
      tokens.nodes.forEach((node,i) => {
        const q = core.phase(t,i,tokens.nodes.length,p.spread);
        node.style.opacity = String(out(q)); node.style.filter = 'blur(' + (1-out(q))*4 + 'px)';
        ghosts[i].style.transform = 'translate(' + p.offset*(1-q) + 'px,' + -p.offset*(1-q)/3 + 'px)'; ghosts[i].style.opacity = String(0.7*(1-q));
      });
    });
  });
  add('kinetic-word-lines', '选词速度线 · Kinetic Word Lines', { targetRatio:range(0,1), length:range(12,90) }, (view,p) => {
    const tokens = core.tokens(view,'word'), selected = focus(tokens,p.targetRatio), lines = [];
    if (selected >= 0) {
      const word = tokens.nodes[selected];
      for (let i=0; i<3; i++) lines.push(view.node('span',null,{ position:'absolute', right:'105%', top:(30+i*20)+'%', height:'2px', width:p.length+'px', background:'#ffd580', transformOrigin:'100% 50%' },word));
    }
    return core.lifecycle(view,(t,reduced) => {
      const q = reduced ? 1 : t;
      if (selected >= 0) tokens.nodes[selected].style.transform = reduced ? 'none' : 'translateX(' + 12*pulse(q) + 'px)';
      lines.forEach(line => { line.style.transform = 'scaleX(' + (reduced ? 1 : pulse(q)) + ')'; line.style.opacity = reduced ? '0.65' : String(pulse(q)); });
    });
  });

  // Depth: CSS preserves three-dimensional faces, axes and spatial layers.
  add('hinge-3d', '底边/侧边翻开 · 3D Hinge', { hinge:['bottom','left'], angle:range(60,110), spread }, (view,p) => {
    const tokens = core.tokens(view,'char'); tokens.box.style.transformStyle = 'preserve-3d';
    tokens.nodes.forEach(node => { node.style.transformOrigin = p.hinge === 'bottom' ? '50% 100%' : '0% 50%'; node.style.backfaceVisibility = 'hidden'; });
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => {
        const q = out(core.phase(t,i,tokens.nodes.length,p.spread));
        node.style.transform = (p.hinge === 'bottom' ? 'rotateX(' : 'rotateY(') + (p.hinge === 'bottom' ? -1 : 1)*p.angle*(1-q) + 'deg)';
      });
    });
  });
  add('tumble-3d', '三轴翻滚入场 · 3D Tumble', { distance:range(30,240), turns:integer(1,3), spread }, (view,p) => {
    const tokens = core.tokens(view,'char'); tokens.box.style.transformStyle = 'preserve-3d';
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => {
        const q = 1-smooth(core.phase(t,i,tokens.nodes.length,p.spread));
        node.style.transform = 'translate3d(0,' + -p.distance*q + 'px,' + -p.distance*q + 'px) rotateX(' + p.turns*360*q + 'deg) rotateY(' + p.turns*180*q + 'deg) rotateZ(' + (i%2 ? 1 : -1)*80*q + 'deg)';
      });
    });
  });
  add('depth-flight', '远深度飞入 · Depth Flight', { depth:range(100,900), spread }, (view,p) => {
    const tokens = core.tokens(view,'char'); tokens.box.style.transformStyle = 'preserve-3d';
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => {
        const q = pop(core.phase(t,i,tokens.nodes.length,p.spread),0.85);
        node.style.transform = 'translateZ(' + -p.depth*(1-q) + 'px)';
      });
    });
  });
  add('paper-fold', '分片纸面折开 · Paper Fold', { panels:integer(2,6), spread }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens = core.tokens(view,'line'), layout = freeze(tokens), panels = [];
    tokens.box.style.transformStyle = 'preserve-3d';
    tokens.nodes.forEach((node,i) => {
      const rect = layout.positions[i]; node.style.visibility = 'hidden';
      for (let j=0; j<p.panels; j++) {
        const panel = view.node('span',null,{ position:'absolute', left:rect.x+rect.w*j/p.panels+'px', top:rect.y+'px', width:rect.w/p.panels+'px', height:rect.h+'px', overflow:'hidden', transformOrigin:j%2 ? '100% 50%' : '0% 50%', transformStyle:'preserve-3d', backfaceVisibility:'hidden', background:'#17243a' },tokens.box);
        view.node('span',tokens.units[i],{ display:'block', width:rect.w+'px', height:rect.h+'px', whiteSpace:'pre-wrap', transform:'translateX(' + -rect.w*j/p.panels + 'px)' },panel);
        panels.push({ node:panel, line:i, part:j });
      }
    });
    return core.lifecycle(view,t => {
      panels.forEach(panel => {
        const q = out(core.phase(t,panel.line,tokens.nodes.length,p.spread));
        panel.node.style.transform = 'rotateY(' + (panel.part%2 ? -1 : 1)*88*(1-q) + 'deg)';
      });
    });
  });
  add('roll-cube', '双面立体滚翻 · Cube Roll', { depth:range(10,60), spread }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens = core.tokens(view,'char');
    tokens.box.style.transformStyle = 'preserve-3d';
    tokens.nodes.forEach(node => {
      const text = node.textContent; node.textContent = ''; node.style.transformStyle = 'preserve-3d';
      view.node('span',text,{ display:'block', backfaceVisibility:'hidden', transform:'translateZ(' + p.depth + 'px)' },node);
      view.node('span',text,{ position:'absolute', inset:'0', display:'block', backfaceVisibility:'hidden', transform:'rotateX(90deg) translateZ(' + p.depth + 'px)', color:'#9de1ff' },node);
    });
    return core.lifecycle(view,t => {
      tokens.nodes.forEach((node,i) => { node.style.transform = 'rotateX(' + -90*smooth(core.phase(t,i,tokens.nodes.length,p.spread)) + 'deg)'; });
    });
  });
  add('cylinder', '柱面排字旋转 · Cylinder Type', { radius:range(60,220), turns:integer(1,3) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens = core.tokens(view,'char');
    Object.assign(tokens.box.style,{ position:'relative', width:'100%', height:2*p.radius+'px', display:'block', transformStyle:'preserve-3d' });
    tokens.nodes.forEach((node,i) => Object.assign(node.style,{ position:'absolute', top:'40%', left:'50%', transformOrigin:'50% 50%', backfaceVisibility:'hidden', transform:'translateX(-50%) rotateY(' + i/Math.max(1,tokens.nodes.length)*360 + 'deg) translateZ(' + p.radius + 'px)' }));
    return core.lifecycle(view,t => { tokens.box.style.transform = 'rotateY(' + -t*p.turns*360 + 'deg)'; });
  });
  add('layered-depth', '多层字面纵深 · Layered Depth', { layers:integer(2,8), spacing:range(4,40), tilt:range(5,35) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const box = view.node('div',null,{ position:'relative', maxWidth:'100%', transformStyle:'preserve-3d' });
    const front = view.node('div',view.text,{ position:'relative' },box), layers = [];
    box.setAttribute('aria-hidden','true');
    for (let i=1;i<p.layers;i++) layers.push(view.node('div',view.text,{ position:'absolute', inset:'0', color:'#70a8c9', opacity:String(0.75-i/p.layers*0.5) },box));
    return core.lifecycle(view,t => {
      const q = pop(t,0.8); box.style.transform = 'rotateY(' + p.tilt*q + 'deg) rotateX(' + -p.tilt*q/3 + 'deg)';
      layers.forEach((layer,i) => { layer.style.transform = 'translateZ(' + -(i+1)*p.spacing*q + 'px)'; });
      front.style.transform = 'translateZ(0px)';
    });
  });
  add('depth-falloff', '深度衰减场扫描 · Depth Falloff', { radius:range(1,8), depth:range(20,160), angle:range(5,65) }, (view,p) => {
    const tokens = core.tokens(view,'char'); tokens.box.style.transformStyle = 'preserve-3d';
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      const center = -p.radius+t*(Math.max(0,tokens.nodes.length-1)+2*p.radius);
      tokens.nodes.forEach((node,i) => {
        const weight = smooth(core.clamp(1-Math.abs(i-center)/p.radius));
        node.style.transform = 'translateZ(' + p.depth*weight + 'px) rotateX(' + -p.angle*weight + 'deg)';
      });
    });
  });
  add('type-tunnel', '透视文字隧道 · Perspective Tunnel', { layers:integer(3,9), depth:range(250,1600), turns:integer(1,3) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const box = view.node('div',null,{ position:'relative', width:'100%', minHeight:'240px', transformStyle:'preserve-3d' }); box.setAttribute('aria-hidden','true');
    const layers = [];
    for (let i=0;i<p.layers;i++) layers.push(view.node('div',view.text,{ position:'absolute', left:'8%', right:'8%', top:'35%', textAlign:'center', border:'1px solid #70a8c9', padding:'0.3em', backfaceVisibility:'hidden', transformStyle:'preserve-3d' },box));
    return core.lifecycle(view,t => {
      layers.forEach((layer,i) => {
        const q = ((i/p.layers+t*p.turns)%1+1)%1;
        layer.style.transform = 'translateZ(' + -p.depth*q + 'px) rotateZ(' + -12*q + 'deg)'; layer.style.opacity = String(0.2+0.8*(1-q));
      });
    });
  });

  // Emphasis: ink is drawn separately from readable text and chosen semantic focus.
  add('marker', '底色标记扫过 · Marker Highlight', { coverage:range(0.25,0.75) }, (view,p) => {
    const tokens = core.tokens(view,'whole'), marks = tokens.nodes.map(node => {
      node.style.zIndex = '0';
      return view.node('span',null,{ position:'absolute', left:'0', bottom:'0.12em', height:p.coverage+'em', width:'100%', background:'#b1872a', zIndex:'-1', transformOrigin:'0 50%' },node);
    });
    return core.lifecycle(view,(t,reduced) => { marks.forEach(mark => { mark.style.transform = 'scaleX(' + (reduced ? 1 : smooth(t)) + ')'; }); });
  });
  add('underline', '路径下划线绘制 · Underline Draw', { thickness:range(1,6) }, (view,p) => {
    const tokens = core.tokens(view,'whole');
    const lines = tokens.nodes.map(node => {
      const line = ink(view,node,'M 2 44 C 25 42 65 46 98 43','#ffd580',p.thickness);
      Object.assign(line.parentNode.style,{ inset:'auto 0 -0.2em', width:'100%', height:'0.6em' }); return line;
    });
    return core.lifecycle(view,(t,reduced) => { lines.forEach(line => { line.style.strokeDashoffset = String(1-(reduced ? 1 : smooth(t))); }); });
  });
  add('scribble-circle', '选词手绘圈注 · Scribble Circle', { targetRatio:range(0,1), turns:integer(1,2) }, (view,p) => {
    const tokens = core.tokens(view,'word'), selected = focus(tokens,p.targetRatio), lines = [];
    if (selected >= 0) for (let i=0;i<p.turns;i++) lines.push(ink(view,tokens.nodes[selected],i ? 'M 4 26 C 6 -3 94 0 96 23 C 103 55 8 51 4 26' : 'M 6 27 C 0 -1 87 -5 96 20 C 110 48 7 56 6 27','#ffd580',1.8));
    return core.lifecycle(view,(t,reduced) => { lines.forEach((line,i) => { line.style.strokeDashoffset = String(1-(reduced ? 1 : out(core.phase(t,i,lines.length,0.35)))); }); });
  });
  add('pointer-box', '指针框选描边 · Pointer Box', { padding:range(2,12) }, (view,p) => {
    const tokens = core.tokens(view,'whole'), boxes = [], cursors = [];
    tokens.nodes.forEach(node => {
      const line = ink(view,node,'M 2 2 L 98 2 L 98 48 L 2 48 Z','#8edcff',1.2);
      Object.assign(line.parentNode.style,{ top:-p.padding+'px', left:-p.padding+'px', width:'calc(100% + '+2*p.padding+'px)', height:'calc(100% + '+2*p.padding+'px)' }); boxes.push(line);
      const cursor = view.svg('svg',{ viewBox:'0 0 16 20', width:16, height:20, 'aria-hidden':'true' },node);
      Object.assign(cursor.style,{ position:'absolute', overflow:'visible', pointerEvents:'none' });
      view.svg('path',{ d:'M 1 1 L 1 16 L 5 12 L 9 19 L 12 17 L 8 10 L 15 10 Z', fill:'#e9f2ff', stroke:'#101b2e', 'stroke-width':1 },cursor); cursors.push(cursor);
    });
    return core.lifecycle(view,(t,reduced) => {
      const q = reduced ? 1 : smooth(t), travel = q*4;
      boxes.forEach(line => { line.style.strokeDashoffset = String(1-q); });
      cursors.forEach(cursor => {
        cursor.style.display = reduced ? 'none' : 'block';
        cursor.style.left = (travel<1 ? travel*100 : travel<2 ? 100 : travel<3 ? (3-travel)*100 : 0)+'%';
        cursor.style.top = (travel<1 ? 0 : travel<2 ? (travel-1)*100 : travel<3 ? 100 : (4-travel)*100)+'%';
      });
    });
  });
  add('strike-correct', '划除与修订注记 · Strike Correct', { targetRatio:range(0,1), correction:value => typeof value === 'string' && value.trim().length > 0 && value.length <= 80 }, (view,p) => {
    const tokens = core.tokens(view,'word'), selected = focus(tokens,p.targetRatio); let line, annotation;
    if (selected >= 0) {
      const node = tokens.nodes[selected];
      line = view.node('span',null,{ position:'absolute', left:'0', right:'0', top:'53%', height:'2px', background:'#ffaca8', transformOrigin:'0 50%' },node);
      annotation = view.node('span',p.correction,{ position:'absolute', bottom:'95%', left:'0', whiteSpace:'pre-wrap', fontSize:'0.6em', color:'#a6efd3', transformOrigin:'50% 100%' },node);
      view.root.setAttribute('aria-label',view.text+'；修订：'+p.correction);
      tokens.box.style.paddingTop = '1em';
    }
    return core.lifecycle(view,(t,reduced) => {
      if (!line) return;
      line.style.transform = 'scaleX(' + (reduced ? 1 : out(core.clamp(t/0.45))) + ')';
      const q = reduced ? 1 : core.clamp((t-0.35)/0.65);
      annotation.style.opacity = String(q); annotation.style.transform = reduced ? 'none' : 'scale(' + pop(q,0.8) + ')';
    });
  });
  add('keyword-punch', '选词短促放大 · Keyword Punch', { targetRatio:range(0,1), scale:range(1.1,1.8) }, (view,p) => {
    const tokens = core.tokens(view,'word'), selected = focus(tokens,p.targetRatio);
    if (selected>=0) tokens.nodes[selected].style.color = '#ffd580';
    return core.lifecycle(view,(t,reduced) => {
      if (selected>=0) tokens.nodes[selected].style.transform = reduced ? 'none' : 'scale(' + (1+(p.scale-1)*pulse(t)) + ')';
    });
  });
  add('focus-explosion', '选词扩张推开邻词 · Focus Explosion', { targetRatio:range(0,1), distance:range(8,100), scale:range(1.1,1.6) }, (view,p) => {
    if (view.reduced) {
      const tokens = core.tokens(view,'word'), selected = focus(tokens,p.targetRatio);
      if (selected>=0) tokens.nodes[selected].style.color = '#ffd580';
      return core.lifecycle(view,() => rest(tokens));
    }
    const tokens = core.tokens(view,'word'), selected = focus(tokens,p.targetRatio), layout = freeze(tokens);
    if (selected>=0) tokens.nodes[selected].style.color = '#ffd580';
    return core.lifecycle(view,t => {
      const weight = pulse(t);
      tokens.nodes.forEach((node,i) => {
        if (selected<0) return;
        const relative = i-selected, attenuation = 1/(1+Math.abs(relative)*0.3);
        node.style.transform = i===selected ? 'scale(' + (1+(p.scale-1)*weight) + ')' : 'translate(' + Math.sign(relative)*p.distance*weight*attenuation + 'px,' + (layout.positions[i].y-layout.positions[selected].y)*weight*0.25 + 'px)';
      });
    });
  });
  add('bump-wave', '字符衰减鼓起波 · Bump Wave', { radius:range(1,7), height:range(8,50) }, (view,p) => {
    const tokens = core.tokens(view,'char');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      const center = -p.radius+t*(Math.max(0,tokens.nodes.length-1)+2*p.radius);
      tokens.nodes.forEach((node,i) => {
        const weight = core.clamp(1-Math.abs(i-center)/p.radius)**3;
        node.style.transform = 'translateY(' + -p.height*weight + 'px) scale(' + (1+0.2*weight) + ')';
      });
    });
  });
  add('attention-bounce', '选词两次抛跳 · Attention Bounce', { targetRatio:range(0,1), height:range(8,70), bounces:integer(1,3) }, (view,p) => {
    const tokens = core.tokens(view,'word'), selected = focus(tokens,p.targetRatio);
    if (selected>=0) tokens.nodes[selected].style.color = '#ffd580';
    return core.lifecycle(view,(t,reduced) => {
      if (selected<0) return;
      const cycle = t*p.bounces, index = Math.min(p.bounces-1,Math.floor(cycle)), local = t===1 ? 1 : cycle-index;
      tokens.nodes[selected].style.transform = reduced ? 'none' : 'translateY(' + -p.height*0.55**index*4*local*(1-local) + 'px)';
    });
  });
  add('comic-pop', '漫画冲击字与射线 · Comic Pop', { scale:range(1.1,1.8), tilt:range(2,15), rays:integer(6,16) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens = core.tokens(view,'whole'), rays = [];
    tokens.nodes.forEach(node => {
      node.style.fontWeight = '800'; node.style.textShadow = '2px 2px 0 #783b26';
      for (let i=0;i<p.rays;i++) rays.push(view.node('span',null,{ position:'absolute', left:'50%', top:'50%', width:'0.6em', height:'2px', background:'#ffd580', transformOrigin:'0 50%' },node));
    });
    return core.lifecycle(view,t => {
      const envelope = pulse(t), entry = out(core.clamp(t/0.35));
      tokens.nodes.forEach(node => { node.style.transform = 'scale(' + entry*(1+(p.scale-1)*envelope) + ') rotate(' + -p.tilt*envelope + 'deg)'; });
      rays.forEach((ray,i) => { ray.style.transform = 'rotate(' + i/p.rays*360 + 'deg) translateX(' + (1.3+envelope)*38 + 'px) scaleX(' + envelope + ')'; ray.style.opacity = String(envelope); });
    });
  });
  add('rubber-band', '逐字弹性形变 · Rubber Band', { stretch:range(0.1,0.6), spread }, (view,p) => {
    const tokens = core.tokens(view,'char');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => {
        const q = core.phase(t,i,tokens.nodes.length,p.spread), deformation = p.stretch*Math.sin(TAU*2*q)*Math.exp(-2*q)*Math.sin(Math.PI*q);
        node.style.transform = 'scale(' + (1+deformation) + ',' + 1/(1+deformation) + ') skewX(' + 8*deformation + 'deg)';
      });
    });
  });
  add('elastic-whole', '整句弹性形变 · Elastic Whole Type', { stretch:range(0.1,0.6) }, (view,p) => {
    const tokens = core.tokens(view,'whole');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      const deformation = p.stretch*Math.sin(TAU*2*t)*Math.exp(-2*t)*Math.sin(Math.PI*t);
      tokens.nodes.forEach(node => { node.style.transform = 'scale(' + (1+deformation) + ',' + 1/(1+deformation) + ') skewX(' + 8*deformation + 'deg)'; });
    });
  });
  add('slam', '纵深重击落字 · Type Slam', { depth:range(80,350), squash:range(0.05,0.3) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens = core.tokens(view,'whole'), ring = view.node('div',null,{ position:'absolute', width:'70%', height:'60%', border:'2px solid #ffd580', borderRadius:'50%', pointerEvents:'none' });
    ring.setAttribute('aria-hidden','true');
    return core.lifecycle(view,t => {
      const entry = core.clamp(t/0.35), contact = core.clamp((t-0.35)/0.65), deformation = p.squash*Math.cos(20*contact)*Math.exp(-7*contact)*(t>=0.35 ? 1 : 0);
      tokens.nodes.forEach(node => { node.style.transform = 'translateZ(' + p.depth*(1-entry)**2 + 'px) scale(' + (1+deformation) + ',' + (1-deformation) + ')'; node.style.opacity = String(out(entry)); });
      ring.style.transform = 'scale(' + (0.6+contact*0.8) + ')'; ring.style.opacity = t<0.35 ? '0' : String(0.75*(1-contact));
    });
  });
  add('jitter', '平滑种子抖动 · Seeded Jitter', { amplitude:range(0.5,8), frequency:integer(4,32) }, (view,p) => {
    const tokens = core.tokens(view,'char');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      const time = t*p.frequency, frame = Math.floor(time), blend = smooth(time-frame), envelope = Math.sin(Math.PI*t);
      tokens.nodes.forEach((node,i) => {
        const a = core.random(view.seed,i*997+frame), b = core.random(view.seed,i*997+frame+1);
        const c = core.random(view.seed,i*997+frame+101), d = core.random(view.seed,i*997+frame+102);
        node.style.transform = 'translate(' + (a+(b-a)*blend-0.5)*2*p.amplitude*envelope + 'px,' + (c+(d-c)*blend-0.5)*2*p.amplitude*envelope + 'px) rotate(' + (a+(b-a)*blend-0.5)*p.amplitude*envelope + 'deg)';
      });
    });
  });

  // Exits intentionally keep original text readable in reduced mode.
  add('direction-exit', '字符定向退场 · Directional Exit', { direction:['up','down'], distance:range(16,120), spread }, (view,p) => {
    const tokens = core.tokens(view,'char');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => {
        const q = core.phase(t,i,tokens.nodes.length,p.spread)**2;
        node.style.transform = 'translateY(' + (p.direction==='up' ? -1 : 1)*p.distance*q + 'px)'; node.style.opacity = String(1-q);
      });
    });
  });
  add('evaporate-exit', '逐词雾化退场 · Word Evaporation', { distance:range(8,80), blur:range(2,18), spread }, (view,p) => {
    const tokens = core.tokens(view,'word');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => {
        const q = out(core.phase(t,i,tokens.nodes.length,p.spread));
        node.style.transform = 'translateY(' + -p.distance*q + 'px) scale(' + (1+q*0.2) + ')'; node.style.filter = 'blur(' + p.blur*q + 'px)'; node.style.opacity = String(1-q);
      });
    });
  });
  add('center-collapse-exit', '收拢中心退场 · Center Collapse', { spread }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens = core.tokens(view,'char'), layout = freeze(tokens);
    return core.lifecycle(view,t => {
      tokens.nodes.forEach((node,i) => {
        const q = core.phase(t,i,tokens.nodes.length,p.spread)**3, rect = layout.positions[i];
        node.style.transform = 'translate(' + (layout.width/2-rect.x-rect.w/2)*q + 'px,' + (layout.height/2-rect.y-rect.h/2)*q + 'px) scale(' + (1-q) + ')'; node.style.opacity = String(1-q);
      });
    });
  });
  add('scatter-exit', '弹道散射退场 · Scatter Exit', { distance:range(50,300), spin:range(20,270), spread }, (view,p) => {
    const tokens = core.tokens(view,'char'), angles = tokens.nodes.map((_,i) => core.random(view.seed,i)*TAU);
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => {
        const q = core.phase(t,i,tokens.nodes.length,p.spread), speed = out(q);
        node.style.transform = 'translate(' + Math.cos(angles[i])*p.distance*speed + 'px,' + (Math.sin(angles[i])*p.distance*speed+45*q*q) + 'px) rotate(' + Math.sin(angles[i])*p.spin*q + 'deg)'; node.style.opacity = String(1-q*q);
      });
    });
  });
  add('gravity-exit', '重力落字退场 · Gravity Exit', { gravity:range(100,600), spin:range(0,180), spread }, (view,p) => {
    const tokens = core.tokens(view,'char');
    const velocity = tokens.nodes.map((_,i) => (core.random(view.seed,i)-0.5)*60);
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => {
        const q = core.phase(t,i,tokens.nodes.length,p.spread);
        node.style.transform = 'translate(' + velocity[i]*q + 'px,' + 0.5*p.gravity*q*q + 'px) rotate(' + Math.sign(velocity[i])*p.spin*q + 'deg)'; node.style.opacity = String(1-q**3);
      });
    });
  });
  add('noise-dissolve', '栅格噪声字形溶解 · Noise Dissolve', { cellSize:integer(2,18) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const image = raster(view), cells = []; let index=0;
    for (let y=0;y<image.height;y+=p.cellSize) for (let x=0;x<image.width;x+=p.cellSize) cells.push({ x,y,threshold:0.01+0.98*core.random(view.seed,index++) });
    return core.lifecycle(view,t => {
      image.context.clearRect(0,0,image.width,image.height); image.context.drawImage(image.surface,0,0);
      for (const cell of cells) if (t>=cell.threshold) image.context.clearRect(cell.x,cell.y,p.cellSize,p.cellSize);
    });
  });
  add('reverse-erase', '逆阅读序裁除 · Reverse Erase', { spread }, (view,p) => {
    const tokens = core.tokens(view,'char');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => { const q = out(core.phase(t,tokens.nodes.length-1-i,tokens.nodes.length,p.spread)); node.style.clipPath = 'inset(0 0 0 ' + q*100 + '%)'; });
    });
  });
  add('scale-vanish', '字符缩小消失 · Scale Vanish', { spread }, (view,p) => {
    const tokens = core.tokens(view,'char');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => { const q = core.phase(t,i,tokens.nodes.length,p.spread)**2; node.style.transform = 'scale(' + (1-q) + ')'; node.style.opacity = String(1-q); });
    });
  });

  // Loops are bounded seekable cycles; the caller owns scheduling and stopping.
  add('wave-loop', '逐字正弦波动 · Wave Loop', { amplitude:range(3,28), cycles:integer(1,4) }, (view,p) => {
    const tokens = core.tokens(view,'char');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => { node.style.transform = 'translateY(' + Math.sin(TAU*(p.cycles*t-i/Math.max(1,tokens.nodes.length)))*p.amplitude + 'px)'; });
    });
  });
  add('hanging-sway', '悬挂字牌摇摆 · Hanging Sway', { angle:range(2,16), length:range(20,90), cycles:integer(1,3) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const board = view.node('div',null,{ position:'relative', maxWidth:'90%', paddingTop:p.length+'px', transformOrigin:'50% 0%' }); board.setAttribute('aria-hidden','true');
    view.node('span',null,{ position:'absolute', top:'0', left:'25%', height:p.length+'px', width:'2px', background:'#87a6c5' },board);
    view.node('span',null,{ position:'absolute', top:'0', right:'25%', height:p.length+'px', width:'2px', background:'#87a6c5' },board);
    view.node('div',view.text,{ border:'1px solid #87a6c5', padding:'0.2em 0.5em', background:'#17243a' },board);
    return core.lifecycle(view,t => { board.style.transform = 'rotate(' + p.angle*Math.sin(TAU*p.cycles*t) + 'deg)'; });
  });
  add('marquee', '连续文字带 · Marquee', { cycles:integer(1,3), gap:range(20,100) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const viewport = view.node('div',null,{ width:'100%', overflow:'hidden' }), strip = view.node('div',null,{ display:'flex', width:'max-content', flexWrap:'nowrap', whiteSpace:'pre' },viewport);
    strip.setAttribute('aria-hidden','true');
    const first = view.node('span',view.text,{ paddingRight:p.gap+'px', flex:'none' },strip);
    const width = first.getBoundingClientRect().width;
    if (!(width>0)) throw new Error('Marquee requires a visible measurable stage');
    const copies = Math.ceil(viewport.getBoundingClientRect().width/width)+2;
    for (let i=1;i<copies;i++) view.node('span',view.text,{ paddingRight:p.gap+'px', flex:'none' },strip);
    return core.lifecycle(view,t => { strip.style.transform = 'translateX(' + -(t*p.cycles%1)*width + 'px)'; });
  });
  add('sequential-hop', '逐字接力跳跃 · Sequential Hop', { height:range(5,40), cycles:integer(1,4) }, (view,p) => {
    const tokens = core.tokens(view,'char');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      const center = (t*p.cycles%1)*(tokens.nodes.length+1)-0.5;
      tokens.nodes.forEach((node,i) => {
        const local = core.clamp(1-Math.abs(i-center)); node.style.transform = 'translateY(' + -p.height*local*(2-local) + 'px)';
      });
    });
  });
  add('loading-dots', '语义文字与加载点 · Loading Dots', { dots:integer(2,5), cycles:integer(1,4) }, (view,p) => {
    const tokens = core.tokens(view,'whole'), dots = [];
    const box = view.node('span',null,{ display:'inline-flex', gap:'0.2em', marginLeft:'0.3em' },tokens.box);
    box.setAttribute('aria-hidden','true');
    for (let i=0;i<p.dots;i++) dots.push(view.node('span','·',{ display:'inline-block' },box));
    return core.lifecycle(view,(t,reduced) => {
      box.style.display = reduced ? 'none' : 'inline-flex';
      dots.forEach((dot,i) => { const weight = (1+Math.sin(TAU*(p.cycles*t-i/p.dots)))/2; dot.style.transform = reduced ? 'none' : 'translateY(' + -8*weight + 'px)'; dot.style.opacity = reduced ? '1' : String(0.55+0.45*weight); });
    });
  });
  add('scale-breathe', '独立相位字符呼吸 · Scale Breathe', { amount:range(0.02,0.18), cycles:integer(1,4) }, (view,p) => {
    const tokens = core.tokens(view,'char'), phases = tokens.nodes.map((_,i) => core.random(view.seed,i));
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => { node.style.transform = 'scale(' + (1+p.amount*Math.sin(TAU*(p.cycles*t+phases[i]))) + ')'; });
    });
  });
  add('sparkles', '稳定正文旁的柔和星芒 · Text Sparkles', { count:integer(3,16), cycles:integer(1,3) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens = core.tokens(view,'whole'), stars = [];
    tokens.nodes.forEach(node => {
      for (let i=0;i<p.count;i++) {
        const star = view.svg('svg',{ viewBox:'0 0 20 20', width:14, height:14, 'aria-hidden':'true' },node);
        Object.assign(star.style,{ position:'absolute', left:core.random(view.seed,i*3)*100+'%', top:(core.random(view.seed,i*3+1)*140-20)+'%', pointerEvents:'none' });
        view.svg('path',{ d:'M 10 0 Q 11 9 20 10 Q 11 11 10 20 Q 9 11 0 10 Q 9 9 10 0', fill:'#ffd580' },star); stars.push(star);
      }
    });
    return core.lifecycle(view,t => { stars.forEach((star,i) => { const weight = (1+Math.sin(TAU*(p.cycles*t+core.random(view.seed,i*3+2))))/2; star.style.transform = 'scale(' + (0.6+0.4*weight) + ')'; star.style.opacity = String(0.35+0.55*weight); }); });
  });
  add('y-spin-loop', '逐字纵轴整圈旋转 · Y Spin', { turns:integer(1,3), spread }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens = core.tokens(view,'char'); tokens.box.style.transformStyle = 'preserve-3d';
    tokens.nodes.forEach(node => { node.style.backfaceVisibility = 'hidden'; });
    return core.lifecycle(view,t => { tokens.nodes.forEach((node,i) => { node.style.transform = 'rotateY(' + 360*(p.turns*t-i/Math.max(1,tokens.nodes.length)*p.spread) + 'deg)'; }); });
  });

  // Physics: analytic ballistic paths and bounded coupled state, not frame-order integration.
  function bounceHeight(t,height,restitution) {
    if (t<0.42) return -height*(1-(t/0.42)**2);
    let remaining = (t-0.42)/0.58, duration = (1-restitution)/(1-restitution**3);
    for (let i=0;i<3;i++) {
      if (remaining<=duration || i===2) {
        const local = core.clamp(remaining/duration);
        return -height*0.32*restitution**(2*(i+1))*4*local*(1-local);
      }
      remaining -= duration; duration *= restitution;
    }
    return 0;
  }
  add('floor-bounce', '落地抛跳与接触压扁 · Floor Bounce', { height:range(30,220), restitution:range(0.15,0.85), squash:range(0,0.4), spread }, (view,p) => {
    const tokens = core.tokens(view,'char');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => {
        const q = core.phase(t,i,tokens.nodes.length,p.spread), contact = Math.max(0,q-0.42);
        const deformation = q>=0.42 && q<1 ? p.squash*Math.exp(-10*contact)*Math.cos(35*contact) : 0;
        node.style.transform = 'translateY(' + bounceHeight(q,p.height,p.restitution) + 'px) scale(' + (1+deformation) + ',' + (1-deformation) + ')';
      });
    });
  });
  add('falling-pile', '词块重力碰撞堆积 · Falling Pile', { gravity:range(150,900), restitution:range(0.05,0.65), spin:range(0,35) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens = core.tokens(view,'word'), layout = freeze(tokens), bodies = layout.positions.map((rect,i) => ({ x:core.random(view.seed,i*3)*Math.max(0,layout.width-rect.w), y:-rect.h*(1+core.random(view.seed,i*3+1)*3)-i*8, vx:(core.random(view.seed,i*3+2)-0.5)*70, vy:0, w:rect.w, h:rect.h, angle:(core.random(view.seed,i*3+3)-0.5)*p.spin*2 }));
    const floor = Math.max(180,layout.height+100); tokens.box.style.height = floor+'px';
    const rule = view.node('div',null,{ position:'absolute', bottom:'0', left:'0', width:'100%', borderTop:'1px solid #496682' },tokens.box); rule.setAttribute('aria-hidden','true');
    const frames = [], dt=1/120;
    for (let frame=0;frame<=480;frame++) {
      const state = new Float32Array(bodies.length*3);
      bodies.forEach((body,i) => { state[i*3]=body.x; state[i*3+1]=body.y; state[i*3+2]=body.angle; }); frames.push(state);
      if (frame===480) break;
      for (const body of bodies) {
        body.vy += p.gravity*dt; body.x += body.vx*dt; body.y += body.vy*dt;
        body.angle *= Math.exp(-dt*0.6);
        if (body.x<0) { body.x=0; body.vx=Math.abs(body.vx)*p.restitution; }
        if (body.x+body.w>layout.width) { body.x=Math.max(0,layout.width-body.w); body.vx=-Math.abs(body.vx)*p.restitution; }
        if (body.y+body.h>floor) { body.y=floor-body.h; body.vy=-Math.abs(body.vy)*p.restitution; body.vx*=0.82; body.angle*=0.93; if (Math.abs(body.vy)<12) body.vy=0; }
      }
      for (let pass=0;pass<2;pass++) for (let i=0;i<bodies.length;i++) for (let j=i+1;j<bodies.length;j++) {
        const a=bodies[i], b=bodies[j], dx=(a.x+a.w/2)-(b.x+b.w/2), dy=(a.y+a.h/2)-(b.y+b.h/2);
        const overlapX=(a.w+b.w)/2-Math.abs(dx), overlapY=(a.h+b.h)/2-Math.abs(dy);
        if (overlapX<=0 || overlapY<=0 || !a.w || !b.w) continue;
        const vertical=overlapY<overlapX, normal=(vertical ? dy : dx)>=0 ? 1 : -1, overlap=vertical ? overlapY : overlapX;
        if (vertical) { a.y+=normal*overlap/2; b.y-=normal*overlap/2; }
        else { a.x+=normal*overlap/2; b.x-=normal*overlap/2; }
        const relative=(vertical ? a.vy-b.vy : a.vx-b.vx)*normal;
        if (relative<0) {
          const impulse=-(1+p.restitution)*relative/2;
          if (vertical) { a.vy+=impulse*normal; b.vy-=impulse*normal; a.vx*=0.96; b.vx*=0.96; }
          else { a.vx+=impulse*normal; b.vx-=impulse*normal; }
        }
      }
    }
    return core.lifecycle(view,t => {
      tokens.nodes.forEach((node,i) => { const rect=layout.positions[i]; node.style.transform='translate(' + (sample(frames,t,i*3)-rect.x) + 'px,' + (sample(frames,t,i*3+1)-rect.y) + 'px) rotate(' + sample(frames,t,i*3+2) + 'deg)'; });
    });
  });
  add('pair-collision', '双字动量碰撞 · Letter Collision', { approach:range(10,80), restitution:range(0.1,0.85) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens=core.tokens(view,'char'), layout=freeze(tokens), bodies=layout.positions.map((rect,i) => ({ x:rect.x+(i%2 ? p.approach : -p.approach), target:rect.x, vx:0, w:rect.w }));
    const frames=[], dt=1/120;
    for (let frame=0;frame<=360;frame++) {
      frames.push(Float32Array.from(bodies,body => body.x));
      if (frame===360) break;
      for (const body of bodies) { body.vx+=(45*(body.target-body.x)-5*body.vx)*dt; body.x+=body.vx*dt; }
      for (let i=0;i+1<bodies.length;i+=2) {
        const a=bodies[i],b=bodies[i+1];
        if (Math.abs(layout.positions[i].y-layout.positions[i+1].y)>2) continue;
        const overlap=a.x+a.w-b.x;
        if (overlap>0) {
          a.x-=overlap/2; b.x+=overlap/2;
          if (a.vx>b.vx) { const impulse=(1+p.restitution)*(a.vx-b.vx)/2; a.vx-=impulse; b.vx+=impulse; }
        }
      }
    }
    return core.lifecycle(view,t => { tokens.nodes.forEach((node,i) => { node.style.transform='translateX(' + (sample(frames,t,i)-layout.positions[i].x) + 'px)'; }); });
  });
  add('pendulum', '定长绳字摆 · Glyph Pendulum', { angle:range(8,55), length:range(25,110), damping:range(0.2,4), cycles:integer(1,4) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens=core.tokens(view,'char'), layout=freeze(tokens);
    tokens.box.style.height=layout.height+p.length+'px';
    const svg=view.svg('svg',{ width:layout.width, height:layout.height+p.length, 'aria-hidden':'true' },tokens.box);
    Object.assign(svg.style,{ position:'absolute', inset:'0', overflow:'visible', pointerEvents:'none' });
    const strings=layout.positions.map(rect => view.svg('line',{ x1:rect.x+rect.w/2, y1:rect.y, x2:rect.x+rect.w/2, y2:rect.y+p.length, stroke:'#7192ad', 'stroke-width':1 },svg));
    tokens.nodes.forEach((node,i) => { node.style.top=layout.positions[i].y+p.length+'px'; node.style.transformOrigin='50% 0%'; });
    return core.lifecycle(view,t => {
      tokens.nodes.forEach((node,i) => {
        const theta=p.angle*Math.PI/180*Math.cos(TAU*(p.cycles*t-i*0.04))*Math.exp(-p.damping*t), dx=p.length*Math.sin(theta), dy=p.length*(Math.cos(theta)-1), rect=layout.positions[i];
        node.style.transform='translate(' + dx + 'px,' + dy + 'px) rotate(' + -theta*180/Math.PI + 'deg)';
        strings[i].setAttribute('x2',rect.x+rect.w/2+dx); strings[i].setAttribute('y2',rect.y+p.length+dy);
      });
    });
  });
  add('spring-chain', '耦合弹簧字符链 · Spring Chain', { stiffness:range(30,180), damping:range(4,24), drive:range(10,70) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const tokens=core.tokens(view,'char'), length=tokens.nodes.length, y=new Float64Array(length), velocity=new Float64Array(length), frames=[], dt=1/180;
    for (let frame=0;frame<=540;frame++) {
      frames.push(Float32Array.from(y));
      if (frame===540) break;
      const time=frame*dt, lead=time<1.1 ? p.drive*Math.sin(TAU*1.5*time)*Math.sin(Math.PI*time/1.1)**2 : 0;
      for (let i=length-1;i>=0;i--) {
        const previous=i ? y[i-1] : lead;
        velocity[i]+=(p.stiffness*(previous-y[i])-p.damping*velocity[i]-p.stiffness*0.08*y[i])*dt;
      }
      for (let i=0;i<length;i++) y[i]+=velocity[i]*dt;
    }
    return core.lifecycle(view,t => {
      tokens.nodes.forEach((node,i) => { const current=sample(frames,t,i), previous=i ? sample(frames,t,i-1) : 0; node.style.transform='translateY(' + current + 'px) rotate(' + (current-previous)*0.8 + 'deg)'; });
    });
  });
  add('magnet-assembly', '弹簧磁吸组字 · Magnet Assembly', { radius:range(40,220), stiffness:range(40,260), damping:range(3,22) }, (view,p) => {
    const tokens=core.tokens(view,'char'), offsets=tokens.nodes.map((_,i) => ({ x:(core.random(view.seed,i*3)-0.5)*p.radius*2, y:(core.random(view.seed,i*3+1)-0.5)*p.radius*2, angle:(core.random(view.seed,i*3+2)-0.5)*100 }));
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      const remaining=t===1 ? 0 : springRemaining(t*2.5,p.stiffness,p.damping);
      tokens.nodes.forEach((node,i) => { const offset=offsets[i]; node.style.transform='translate(' + offset.x*remaining + 'px,' + offset.y*remaining + 'px) rotate(' + offset.angle*remaining + 'deg)'; });
    });
  });
  add('particle-assembly', '真实字形粒子组装 · Particle Type', { spacing:integer(2,8), scatter:range(30,260), size:range(0.7,3) }, (view,p) => {
    if (view.reduced) return staticStudy(view);
    const image=raster(view), pixels=image.source.getImageData(0,0,image.width,image.height).data, points=[]; let index=0;
    for (let y=0;y<image.height;y+=p.spacing) for (let x=0;x<image.width;x+=p.spacing) {
      const alpha=pixels[(y*image.width+x)*4+3];
      if (alpha>35) { points.push({ x,y,alpha:alpha/255, dx:(core.random(view.seed,index*2)-0.5)*p.scatter*2, dy:(core.random(view.seed,index*2+1)-0.5)*p.scatter*2 }); index++; }
    }
    return core.lifecycle(view,t => {
      const ctx=image.context; ctx.clearRect(0,0,image.width,image.height);
      if (t>=0.98) { ctx.globalAlpha=1; ctx.drawImage(image.surface,0,0); return; }
      const remaining=springRemaining(t*2.4,65,9); ctx.fillStyle=image.color;
      for (const point of points) { ctx.globalAlpha=point.alpha; ctx.beginPath(); ctx.arc(point.x+point.dx*remaining,point.y+point.dy*remaining,p.size,0,TAU); ctx.fill(); }
      ctx.globalAlpha=1;
    });
  });
  add('domino', '触碰传播倒字 · Domino Topple', { angle:range(65,88), hold:range(0,0.25) }, (view,p) => {
    const tokens=core.tokens(view,'char'), contact=tokens.nodes.map(node => {
      const rect=node.getBoundingClientRect(); return Math.min(p.angle,Math.acos(core.clamp(rect.width/Math.max(1,rect.height)))*180/Math.PI);
    }), onset=[];
    let total=0;
    contact.forEach((angle,i) => { onset[i]=total; total+=Math.sqrt(angle/p.angle); });
    const last=onset.length ? onset[onset.length-1] : 0, duration=(1-p.hold)/(1+last);
    tokens.nodes.forEach(node => { node.style.transformOrigin='100% 100%'; });
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => { const start=p.hold+onset[i]*duration, q=core.clamp((t-start)/duration); node.style.transform='rotate(' + p.angle*q*q + 'deg)'; });
    });
  });
  add('rain', '随机落点字符雨 · Character Rain', { height:range(40,240), spread }, (view,p) => {
    const tokens=core.tokens(view,'char'), order=tokens.nodes.map((_,i) => ({ i,value:core.random(view.seed,i) })).sort((a,b) => a.value-b.value), ranks=[];
    order.forEach((entry,i) => { ranks[entry.i]=i; });
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => {
        const q=core.phase(t,ranks[i],tokens.nodes.length,p.spread), drop=p.height*(0.6+core.random(view.seed,i+101)*0.4);
        node.style.transform='translate(' + (core.random(view.seed,i+201)-0.5)*20*(1-q) + 'px,' + -drop*(1-q*q) + 'px)';
      });
    });
  });
  add('zero-gravity', '无重力字符漂移 · Zero Gravity', { distance:range(5,65), turns:range(0.05,0.5) }, (view,p) => {
    const tokens=core.tokens(view,'char'), vectors=tokens.nodes.map((_,i) => ({ x:(core.random(view.seed,i*3)-0.5)*2, y:(core.random(view.seed,i*3+1)-0.5)*2, rotation:(core.random(view.seed,i*3+2)-0.5)*2 }));
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      const envelope=Math.sin(Math.PI*t);
      tokens.nodes.forEach((node,i) => { const vector=vectors[i]; node.style.transform='translate(' + vector.x*p.distance*envelope + 'px,' + vector.y*p.distance*envelope + 'px) rotate(' + vector.rotation*p.turns*360*envelope + 'deg)'; });
    });
  });
  add('inertia', '字符惯性衰减振荡 · Inertia Letters', { distance:range(10,100), damping:range(1,8), cycles:integer(1,4), spread }, (view,p) => {
    const tokens=core.tokens(view,'char');
    return core.lifecycle(view,(t,reduced) => {
      if (reduced) return rest(tokens);
      tokens.nodes.forEach((node,i) => {
        const q=core.phase(t,i,tokens.nodes.length,p.spread), displacement=q===1 ? 0 : p.distance*Math.exp(-p.damping*q)*Math.sin(TAU*p.cycles*q);
        node.style.transform='translateX(' + displacement + 'px) rotate(' + displacement*0.15 + 'deg)';
      });
    });
  });
  return { recipes };
}));
