(((root,factory)=> {
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./text-core.js'));
  else {root.MotionTextParts=root.MotionTextParts||{};root.MotionTextParts.interactive=factory(root.MotionTextCore);}
})(typeof globalThis==='undefined'?this:globalThis,(C)=> {
  const recipes={};
  function add(name,title,schema,draw){
    const id='text.'+name;
    if(typeof schema==='function'){
      const validate=p=>{if(!p||typeof p!=='object')throw new TypeError('Text parameters must be an object');C.validate(p,schema(p));};
      recipes[id]={title,validate,create(stage,p,o){validate(p);return draw(C.scene(stage,id,o),p);}};
    }else recipes[id]=C.recipe(id,title,schema,draw);
  }
  function finish(view,draw){return C.lifecycle(view,draw);}
  function textBox(view,text){return view.node('div',text,{textAlign:'center',maxWidth:'100%',overflowWrap:'anywhere'});}
  add('typing','字素输入 / Grapheme typing',p=>({mode:['plain','caret','human','terminal','loop','placeholder'],...(p.mode==='placeholder'?{placeholder:v=>typeof v==='string'}:{}),pace:{min:0.2,max:3}}),(v,p)=>{
    const chars=C.segments(v.text,'char');const box=textBox(v,'');const caret=v.node('span','▌',{color:'#82d6ff'});const prompt=v.node('small',p.mode==='terminal'?'> input / 输入':'',{fontSize:'14px',color:'#9cabc0'});
    let elapsed=0;const cumulative=chars.map((char,i)=>{elapsed+=p.mode==='human'?(0.5+C.random(v.seed,i)*1.1+(/[，。！？,.!?]/u.test(char)?2:0)):1;return elapsed;});const total=elapsed||1;
    return finish(v,(t,reduced)=>{let phase=t;if(p.mode==='loop'&&!reduced)phase=t<0.45?t/0.45:t<0.7?1:1-(t-0.7)/0.3;const count=reduced?chars.length:cumulative.filter(x=>x/total<=(t===1&&p.mode!=='loop'?1:Math.min(1,phase*p.pace))).length;box.textContent=p.mode==='placeholder'&&count===0?p.placeholder:chars.slice(0,count).join('');box.style.color=p.mode==='placeholder'&&count===0?'#92a3bc':'#e9f2ff';caret.style.visibility=!reduced&&p.mode!=='plain'&&Math.floor(t*12)%2===0?'visible':'hidden';prompt.style.opacity=p.mode==='terminal'?'1':'0';});
  });
  add('decode','确定性解码 / Seeded decode',p=>({mode:['scramble','code','flicker','center','slot','terminal'],...(p.mode==='flicker'?{}:{alphabet:v=>typeof v==='string'&&C.segments(v,'char').length>1}),spread:{min:0.1,max:0.8}}),(v,p)=>{
    const tok=C.tokens(v,'char'),alphabet=p.mode==='flicker'?[]:C.segments(p.alphabet,'char');
    const consoleState=p.mode==='terminal'?v.node('small','> decode / 解码',{fontSize:'14px',color:'#7decab'}):null;
    return finish(v,(t,reduced)=>{const frame=Math.floor(t*28);if(consoleState)consoleState.textContent=reduced||t===1?'> ready / 已就绪':'> decode '+Math.floor(t*100)+'% ▌';tok.nodes.forEach((n,i)=>{const rank=p.mode==='center'?Math.abs(i-(tok.nodes.length-1)/2)*2:i;const q=C.phase(t,rank,tok.nodes.length,p.spread);const locked=reduced||q>=0.95;n.textContent=locked||p.mode==='flicker'?tok.units[i]:alphabet[Math.floor(C.random(v.seed,frame*71+i)*alphabet.length)];n.style.opacity=p.mode==='flicker'&&!locked?(C.random(v.seed,frame*137+i)>0.35?'1':'0.12'):'1';n.style.color=!locked&&p.mode==='terminal'?'#7decab':'#e9f2ff';n.style.transform=p.mode==='slot'&&!locked?'translateY('+((frame%3)-1)*6+'px)':'none';if(p.mode==='code'&&!locked)n.textContent=alphabet[(frame+i)%alphabet.length];});});
  });
  add('text-swap','文字状态替换 / Text state replacement',{mode:['crossblur','cube','wordflip','diff','cascade','spring','skew','flap','roll','glyphslot','letterflip','goo'],target:v=>typeof v==='string'&&v.length>0,spread:{min:0,max:0.75}},(v,p)=>{
    const source=C.segments(v.text,p.mode==='wordflip'||p.mode==='roll'?'word':'char');const target=C.segments(p.target,p.mode==='wordflip'||p.mode==='roll'?'word':'char');
    const box=v.node('div',null,{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:'0.02em',filter:p.mode==='goo'?'url(#text-goo-filter)':'none'});box.setAttribute('aria-hidden','true');
    if(p.mode==='goo'){const s=v.svg('svg',{width:0,height:0});const defs=v.svg('defs',{},s);const f=v.svg('filter',{id:'text-goo-filter'},defs);v.svg('feGaussianBlur',{in:'SourceGraphic',stdDeviation:3,result:'b'},f);v.svg('feColorMatrix',{in:'b',type:'matrix',values:'1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 14 -6'},f);}
    const cells=Array.from({length:Math.max(source.length,target.length)},(_,i)=>{const cell=v.node('span',null,{display:'inline-grid',position:'relative',overflow:'hidden',minWidth:'0.4em',height:'1.5em',perspective:'400px'},box);const a=v.node('span',source[i]||'',{gridArea:'1/1',backfaceVisibility:'hidden'},cell);const b=v.node('span',target[i]||'',{gridArea:'1/1',backfaceVisibility:'hidden'},cell);
      const upper=p.mode==='flap'?v.node('span',source[i]||'',{position:'absolute',inset:'0',clipPath:'inset(0 0 50% 0)',backfaceVisibility:'hidden',transformOrigin:'50% 50%',borderBottom:'1px solid #456'},cell):null;
      const lower=p.mode==='flap'?v.node('span',target[i]||'',{position:'absolute',inset:'0',clipPath:'inset(50% 0 0 0)',backfaceVisibility:'hidden',transformOrigin:'50% 50%'},cell):null;
      const reel=p.mode==='glyphslot'?v.node('span','',{position:'absolute',inset:'0',background:'#101b2e'},cell):null;
      return{cell,a,b,upper,lower,reel,same:source[i]===target[i]};});
    return finish(v,(t,reduced)=>{v.root.setAttribute('aria-label',t<0.5&&!reduced?v.text:p.target);cells.forEach(({cell,a,b,upper,lower,reel,same},i)=>{let q=reduced?1:C.phase(t,i,cells.length,p.spread);if(p.mode==='diff'&&same)q=0;const incoming=q>=0.5;
      a.style.opacity=String(1-q);b.style.opacity=String(q);a.style.transform='none';b.style.transform='none';a.style.filter='none';b.style.filter='none';cell.style.clipPath='none';
      if(p.mode==='crossblur'||p.mode==='wordflip'){a.style.filter='blur('+(q*10)+'px)';b.style.filter='blur('+((1-q)*10)+'px)';}
      if(p.mode==='cube'){a.style.opacity=q<0.5?'1':'0';b.style.opacity=q>=0.5?'1':'0';a.style.transform='rotateX('+(-q*90)+'deg) translateZ(18px)';b.style.transform='rotateX('+((1-q)*90)+'deg) translateZ(18px)';}
      if(p.mode==='wordflip'||p.mode==='letterflip'){a.style.transform='rotateY('+(q*180)+'deg)';b.style.transform='rotateY('+((q-1)*180)+'deg)';}
      if(p.mode==='flap'){a.style.opacity='1';b.style.opacity='1';a.style.clipPath='inset(50% 0 0 0)';b.style.clipPath='inset(0 0 50% 0)';upper.style.transform='rotateX('+Math.min(180,q*360)+'deg)';lower.style.transform='rotateX('+Math.min(0,(q-1)*360)+'deg)';upper.style.visibility=reduced?'hidden':'visible';lower.style.visibility=reduced?'hidden':'visible';if(reduced)b.style.clipPath='none';}
      if(p.mode==='roll'||p.mode==='glyphslot'||p.mode==='cascade'){a.style.transform='translateY('+(-q*150)+'%)';b.style.transform='translateY('+((1-q)*150)+'%)';}
      if(reel){const frame=Math.floor(q*14);reel.textContent=q===0?(source[i]||''):q===1?(target[i]||''):String.fromCodePoint(0x41+Math.floor(C.random(v.seed,frame*101+i)*26));reel.style.transform=q===0||q===1?'none':'translateY('+((q*14)%1-0.5)*30+'px)';}
      if(p.mode==='spring'){const s=(1-q)*Math.cos(q*15)*Math.exp(-q*3);a.style.transform='rotate('+q*180+'deg)';b.style.transform='rotate('+s*100+'deg)';}
      if(p.mode==='skew'){a.style.transform='translateX('+(-q*100)+'%) skewX('+q*25+'deg)';b.style.transform='translateX('+((1-q)*100)+'%) skewX('+(-(1-q)*25)+'deg)';}
      if(p.mode==='diff'){a.style.visibility=incoming&&!same?'hidden':'visible';b.style.visibility=incoming&&!same?'visible':'hidden';a.style.opacity='1';b.style.opacity='1';}
      if(p.mode==='goo'){a.style.transform='translateX('+q*12+'px)';b.style.transform='translateX('+((1-q)*-12)+'px)';}
      if(reduced){a.style.visibility='hidden';b.style.visibility='visible';a.style.opacity='0';b.style.opacity='1';b.style.transform='none';b.style.filter='none';box.style.filter='none';}
    });});
  });
  add('text-layout','文字布局与重排 / Typographic layout',p=>({mode:['counterweight','reflow','anagram','balance','truncate','fit','camera','insert','leading','justify'],...(p.mode==='insert'?{target:v=>typeof v==='string'&&v.length>0}:{}),extent:{min:0.1,max:1}}),(v,p)=>{
    const tok=C.tokens(v,p.mode==='anagram'?'char':p.mode==='justify'||p.mode==='leading'?'line':'word');const box=tok.box;box.style.alignContent='center';box.style.minHeight='110px';const marker=v.node('div','布局 / layout',{fontSize:'12px',color:'#86a7ca'});const chars=C.segments(v.text,'char');const clipped=textBox(v,'');clipped.style.display=p.mode==='truncate'?'block':'none';let width=0;
    const measuredFont=v.root.ownerDocument.defaultView.getComputedStyle(v.root);const measureCanvas=v.root.ownerDocument.createElement('canvas');const measureContext=measureCanvas.getContext('2d');measureContext.font=measuredFont.font||measuredFont.fontSize+' '+measuredFont.fontFamily;const measuredTextWidth=Math.max(1,measureContext.measureText(v.text).width);const baseSize=Number.parseFloat(measuredFont.fontSize)||32;
    if(p.mode==='balance'){box.style.display='block';box.style.textWrap='balance';box.style.textAlign='center';tok.nodes.forEach(n=>{n.style.display='inline';});}
    const order=tok.nodes.map((_,i)=>i).sort((a,b)=>C.random(v.seed,a)-C.random(v.seed,b));
    const inserted=v.node('span',p.target,{display:'none',color:'#ffcc82'},box);
    return finish(v,(t,reduced)=>{width=v.root.clientWidth||600;const q=reduced?1:t ** (1/p.extent);box.style.transform='none';box.style.width='100%';box.style.lineHeight='1.5';box.style.overflow='visible';box.style.maxHeight='none';box.style.fontSize='inherit';inserted.style.display='none';tok.nodes.forEach(n=>{n.style.transform='none';n.style.order='0';n.style.margin='0';});
      if(p.mode==='reflow'||p.mode==='balance'){box.style.width=(100-q*p.extent*55)+'%';box.style.justifyContent=p.mode==='balance'?'center':'flex-start';}
      if(p.mode==='anagram'){tok.nodes.forEach((n,i)=>{n.style.order=String(q<0.5?order.indexOf(i):i);n.style.transform=reduced?'none':'rotateY('+(Math.sin(q*Math.PI)*180)+'deg)';});}
      if(p.mode==='truncate'){box.style.display='none';clipped.textContent=q<0.5?chars.slice(0,Math.max(1,Math.floor(chars.length*0.5))).join('')+'…':v.text;}
      if(p.mode==='fit'){box.style.fontSize=Math.max(18,Math.min(48,(width-50)/measuredTextWidth*baseSize))+'px';box.style.letterSpacing=(q*p.extent*0.06)+'em';marker.textContent='真实字号适配 / measured font-size fitting; minimum 18px';}
      if(p.mode==='camera'){box.style.transform=reduced?'none':'translate('+(-q*40*p.extent)+'px,'+(q*12)+'px) scale('+(1+q*p.extent*0.35)+')';}
      if(p.mode==='insert'){inserted.style.display='inline-block';inserted.style.width=(q*p.target.length*0.65)+'em';inserted.style.overflow='hidden';}
      if(p.mode==='leading'){box.style.display='block';tok.nodes.forEach((n,i)=>{n.style.display='block';n.style.marginTop=i?(1-q)*p.extent*26+'px':'0';});}
      if(p.mode==='justify'){box.style.display='block';box.style.width=(70+q*30)+'%';tok.nodes.forEach(n=>{n.style.display='block';n.style.width='100%';n.style.textAlign='justify';n.style.textAlignLast='justify';n.style.letterSpacing=(q*p.extent*0.09)+'em';});}
      if(p.mode==='counterweight'){tok.nodes.forEach((n,i)=>{n.style.transform=reduced?'none':'translateY('+Math.sin(q*Math.PI)*(i%2?1:-1)*p.extent*35+'px)';n.style.fontSize=(i%2?0.9:1.2)+'em';});}
    });
  });
  add('pointer-text','指针字形场 / Pointer text field',{mode:['cloneroll','trail','lift','lens','magnet','reveal','repel','scramble','spotlight'],radius:{min:30,max:240},strength:{min:5,max:80}},(v,p)=>{
    const tok=C.tokens(v,p.mode==='lift'?'word':'char');const plate=v.node('div',v.text,{position:'absolute',inset:'24px',display:p.mode==='reveal'?'flex':'none',alignItems:'center',justifyContent:'center',background:'#243959'});const glow=v.node('div','',{position:'absolute',width:'130px',height:'130px',borderRadius:'50%',background:'radial-gradient(circle,#76ceff44,transparent)',pointerEvents:'none'});const trails=Array.from({length:p.mode==='trail'?5:0},()=>v.node('span',v.text,{position:'absolute',pointerEvents:'none',fontSize:'16px',opacity:'0.4'}));let time=0;
    function draw(t,x,y,reduced){const rect=v.root.getBoundingClientRect();glow.style.display=reduced?'none':'block';glow.style.width=glow.style.height=p.radius+'px';glow.style.opacity=String(p.strength/80);glow.style.left=(x-p.radius/2)+'px';glow.style.top=(y-p.radius/2)+'px';plate.style.clipPath=reduced?'none':'circle('+(p.radius*p.strength/40)+'px at '+x+'px '+y+'px)';trails.forEach((n,i)=>{n.style.display=reduced?'none':'block';n.style.left=(x-i*p.strength/3)+'px';n.style.top=(y+i*p.radius/10)+'px';n.style.opacity=String((5-i)/10);});tok.nodes.forEach((n,i)=>{n.style.transform='none';n.textContent=tok.units[i];});tok.nodes.forEach((n,i)=>{const r=n.getBoundingClientRect();const nx=r.left-rect.left+r.width/2,ny=r.top-rect.top+r.height/2;const dx=x-nx,dy=y-ny,d=Math.hypot(dx,dy),influence=reduced?0:C.clamp((1-d/p.radius)*p.strength/40);n.style.color='#e9f2ff';n.style.webkitTextStroke='0px';
      if(p.mode==='lift')n.style.transform='translateY('+(-influence*p.strength)+'px)';
      if(p.mode==='magnet'||p.mode==='repel'){const sign=p.mode==='magnet'?1:-1;n.style.transform='translate('+(dx*influence*0.3*sign)+'px,'+(dy*influence*0.3*sign)+'px)';}
      if(p.mode==='lens')n.style.transform='scale('+(1+influence*p.strength/80)+')';
      if(p.mode==='cloneroll'){n.style.transform='translateY('+(-influence*18)+'px)';n.style.textShadow=reduced?'none':'0 1.5em #7acbff';tok.box.style.overflow='hidden';}
      if(p.mode==='scramble'&&influence>0.15&&!/\s/u.test(tok.units[i]))n.textContent=String.fromCodePoint(0x41+Math.floor(C.random(v.seed,Math.floor(t*24)*97+i)*26));
      if(p.mode==='spotlight'){n.style.color=reduced?'#e9f2ff':'rgba(233,242,255,'+(0.15+0.85*influence)+')';n.style.webkitTextStroke=reduced?'0px':'0.6px #80a4cc';}
    });}
    v.listen(v.root,'pointermove',event=>{if(v.reduced)return;const r=v.root.getBoundingClientRect();draw(time,event.clientX-r.left,event.clientY-r.top,false);});v.listen(v.root,'pointerleave',()=>draw(time,(v.root.clientWidth||600)*time,110,v.reduced));
    return finish(v,(t,reduced)=>{time=t;draw(t,(v.root.clientWidth||600)*(0.15+0.7*t),(v.root.clientHeight||220)*0.5,reduced);});
  });
  add('scroll-text','滚动文字驱动 / Scroll-driven text',p=>({mode:['chapter','columns','drop','parallax','echo','blurtilt','clip','skew','velocity','highlight','shrink','window','view'],...(['columns','drop','parallax','echo','blurtilt','skew','velocity'].includes(p.mode)?{distance:{min:20,max:240}}:{}),...(['drop','highlight','view'].includes(p.mode)?{spread:{min:0.1,max:0.75}}:{})}),(v,p)=>{
    const viewport=v.node('div',null,{position:'relative',width:'100%',height:'180px',overflowY:'auto',border:'1px solid #36516d'});const world=v.node('div',null,{height:'540px',position:'relative'},viewport);const tok=C.tokens(v,p.mode==='drop'?'char':p.mode==='highlight'||p.mode==='view'?'word':'line');world.appendChild(tok.box);tok.box.style.position='sticky';tok.box.style.top='30px';
    const second=p.mode==='columns'?v.node('div',v.text,{position:'absolute',top:'30px',right:'0',width:'45%',writingMode:'vertical-rl',maxHeight:'150px'},world):null;
    if(second){tok.box.style.width='45%';tok.box.style.writingMode='vertical-rl';tok.box.style.maxHeight='150px';}
    const ghost=p.mode==='echo'?v.node('div',v.text,{color:'#78beee',opacity:'0.4'},world):null;const chapter=p.mode==='chapter'?v.node('div','1 · 2 · 3 · 4',{position:'sticky',top:'130px',fontSize:'16px'},world):null;let owned=false;let expectedScrollTop=-1;
    function draw(t,reduced){tok.box.style.transform='none';tok.box.style.clipPath='none';tok.nodes.forEach((n,i)=>{const q=reduced?1:C.phase(t,i,tok.nodes.length,p.spread||0);n.style.transform='none';n.style.filter='none';n.style.opacity='1';n.style.color='#e9f2ff';n.style.background='transparent';
      if(p.mode==='columns'){n.style.transform=reduced?'none':'translateY('+Math.sin(t*Math.PI*2+i)*p.distance/2+'px)';second.style.transform=reduced?'none':'translateY('+Math.sin(t*Math.PI*2)*-p.distance/2+'px)';}
      if(p.mode==='drop')n.style.transform=reduced?'none':'translateY('+((1-q)*-p.distance)+'px)';
      if(p.mode==='parallax')n.style.transform=reduced?'none':'translateY('+((t-0.5)*p.distance*(i+1)/tok.nodes.length)+'px)';
      if(p.mode==='blurtilt'){n.style.filter=reduced?'none':'blur('+Math.sin(t*Math.PI)*p.distance/25+'px)';n.style.transform=reduced?'none':'rotate('+Math.sin(t*Math.PI)*-p.distance/12+'deg)';}
      if(p.mode==='skew')n.style.transform=reduced?'none':'skewY('+Math.sin(t*Math.PI*2)*p.distance/10+'deg)';
      if(p.mode==='highlight'){n.style.color=q>0.5||reduced?'#fff0a5':'#6f819b';n.style.background=q>0.5||reduced?'#65552c':'transparent';}
      if(p.mode==='view')n.style.opacity=String(reduced?1:q);
    });
    if(p.mode==='velocity')tok.box.style.transform=reduced?'none':'translateX('+(-p.distance*(t+0.16*Math.sin(t*Math.PI*2)))+'px)';
    if(p.mode==='clip')tok.box.style.clipPath=reduced?'none':'inset(0 '+((1-t)*100)+'% 0 0)';
    if(p.mode==='shrink')tok.box.style.transform=reduced?'none':'scale('+(1-t*0.45)+')';
    if(p.mode==='window'){tok.box.style.clipPath=reduced?'none':'inset('+(35*(1-t))+'%)';tok.box.style.transform=reduced?'none':'scale('+(1+0.8*(1-t))+')';}
    if(ghost){ghost.style.display=reduced?'none':'block';ghost.style.transform='translate('+Math.sin(t*Math.PI)*p.distance/6+'px,'+t*p.distance/2+'px)';}
    if(chapter){const active=Math.min(4,Math.floor(t*4)+1);chapter.textContent='章节 / chapter '+active+' · '+['开场 / Intro','背景 / Context','行动 / Action','完成 / End'][active-1];}
    }
    v.listen(viewport,'scroll',()=>{if(!owned&&Math.abs(viewport.scrollTop-expectedScrollTop)>0.5){expectedScrollTop=-1;draw(C.clamp(viewport.scrollTop/Math.max(1,viewport.scrollHeight-viewport.clientHeight)),v.reduced);}});
    if(p.mode==='velocity')v.listen(viewport,'wheel',event=>{if(!v.reduced){const position=C.clamp(viewport.scrollTop/Math.max(1,viewport.scrollHeight-viewport.clientHeight));draw(position,false);tok.box.style.transform='translateX('+(-p.distance*position-Math.max(-120,Math.min(120,event.deltaY))*0.25)+'px)';}},{passive:true});
    return finish(v,(t,reduced)=>{owned=true;viewport.scrollTop=t*Math.max(0,viewport.scrollHeight-viewport.clientHeight);expectedScrollTop=viewport.scrollTop;owned=false;draw(t,reduced);});
  });
  add('variable-axis','真实可变字体轴 / Real variable font axes',{mode:['pulse','slant','pressure','thinbold','proximity','breathe','wave','velocity','width'],axis:['wght','wdth','slnt','wdth-slnt'],low:{min:-10,max:1000},high:{min:-10,max:1000}},(v,p)=>{
    const ranges={wght:[100,1000],wdth:[25,151],slnt:[-10,0],'wdth-slnt':[25,151]};const range=ranges[p.axis];if(p.low<range[0]||p.high>range[1]||p.low>p.high)throw new RangeError('Unsupported '+p.axis+' font axis range');
    v.node('style','@font-face{font-family:MotionTextRobotoFlex;src:url("text-roboto-flex.ttf") format("truetype");font-weight:100 1000;font-stretch:25% 151%;font-style:normal;font-display:swap;}');
    const tok=C.tokens(v,'char');const capability=textBox(v,'Motion · Axis');capability.style.fontFamily='MotionTextRobotoFlex, sans-serif';tok.box.style.fontFamily='MotionTextRobotoFlex, system-ui, "Microsoft YaHei", sans-serif';tok.box.style.fontSynthesis='none';capability.style.fontSynthesis='none';
    const note=v.node('small','Roboto Flex: Latin wght 100–1000 · wdth 25–151 · slnt −10–0; 中文保持系统字体，不冒充可变轴。',{fontSize:'12px',color:'#9bb2cd'});let last=0;
    if(v.root.ownerDocument.fonts){v.root.dataset.fontState='loading';v.root.ownerDocument.fonts.load('32px MotionTextRobotoFlex','Motion').then(loaded=>{if(!v.root.isConnected)return;v.root.dataset.fontState=loaded.length?'ready':'error';if(!loaded.length)note.textContent='ERROR: local Roboto Flex failed to load; axis capability unavailable.';},()=>{if(v.root.isConnected){v.root.dataset.fontState='error';note.textContent='ERROR: local Roboto Flex failed to load; axis capability unavailable.';}});}
    function settings(q){const value=p.low+(p.high-p.low)*C.clamp(q);return p.axis==='wdth-slnt'?'"wdth" '+value+', "slnt" '+(-10*C.clamp(q)):'"'+p.axis+'" '+value;}
    const centers=new Float64Array(tok.nodes.length);
    function draw(t,reduced,x,pressure,direct){
      tok.nodes.forEach(n=>{n.style.fontVariationSettings=settings(0.5);});
      const origin=v.root.getBoundingClientRect().left;
      tok.nodes.forEach((n,i)=>{const r=n.getBoundingClientRect();centers[i]=r.left-origin+r.width/2;});
      tok.nodes.forEach((n,i)=>{let q=t;
        if(p.mode==='pulse')q=t<0.2?t/0.2:Math.max(0,(1-t)/0.8);
        if(p.mode==='breathe'||p.mode==='slant')q=(1-Math.cos(t*Math.PI*2))/2;
        if(p.mode==='wave')q=(1+Math.sin(t*Math.PI*2-i*0.65))/2;
        if(p.mode==='thinbold'||p.mode==='width')q=C.phase(t,i,tok.nodes.length,0.55);
        if(p.mode==='pressure'||p.mode==='proximity'){const proximity=C.clamp(1-Math.abs(centers[i]-x)/120);q=p.mode==='pressure'?proximity*proximity*(pressure===undefined?0.25+0.75*t:pressure):proximity;}
        if(p.mode==='velocity')q=direct?t:Math.abs(Math.sin(t*Math.PI*2));
        if(reduced)q=0.6;n.style.fontVariationSettings=settings(q);
      });capability.style.fontVariationSettings=settings(reduced?0.6:t);
    }
    if(p.mode==='pressure'||p.mode==='proximity')v.listen(v.root,'pointermove',event=>{if(!v.reduced)draw(last,false,event.clientX-v.root.getBoundingClientRect().left,event.pressure>0?event.pressure:0.6);});
    if(p.mode==='velocity')v.listen(v.root,'wheel',event=>{if(!v.reduced)draw(C.clamp(Math.abs(event.deltaY)/160),false,0,undefined,true);},{passive:true});
    return finish(v,(t,reduced)=>{last=t;draw(t,reduced,(v.root.clientWidth||600)*t);});
  });
  // Font ranges are validated before create, including Node catalogue validation.
  const axisRecipe=recipes['text.variable-axis'];const axisBaseValidate=axisRecipe.validate;
  axisRecipe.validate=(p)=> {axisBaseValidate(p);const r={wght:[100,1000],wdth:[25,151],slnt:[-10,0],'wdth-slnt':[25,151]}[p.axis];if(p.low<r[0]||p.high>r[1]||p.low>p.high)throw new RangeError('Invalid '+p.axis+' axis range');const expected={pulse:'wght',slant:'slnt',pressure:'wght',thinbold:'wght',proximity:'wght',breathe:'wght',wave:'wght',velocity:'wdth-slnt',width:'wdth'}[p.mode];if(p.axis!==expected)throw new TypeError('Inapplicable axis for '+p.mode);};
  const axisBaseCreate=axisRecipe.create;axisRecipe.create=(stage,p,o)=> {axisRecipe.validate(p);return axisBaseCreate(stage,p,o);};
  return {recipes};
}));
