(() => {
  "use strict";
  const DURATION = 22, W = 1600, H = 900;
  const root = document.querySelector("#canvas-film");
  const canvas = document.querySelector("#screen");
  const ctx = canvas.getContext("2d");
  const play = document.querySelector("#play");
  const seek = document.querySelector("#seek");
  const timeLabel = document.querySelector("#time");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const source = new Image();
  const mono = "Consolas, 'Courier New', monospace";
  const sans = "'Segoe UI', 'Microsoft YaHei', sans-serif";
  const ink = "#f1f0ea";
  const ramp = " .,:;=+*#%@";
  const samples = [];
  const ascii = document.createElement("canvas");
  ascii.width = 960; ascii.height = 540;
  let currentTime = 0, imageReady = false;
  const clamp = value => Math.max(0, Math.min(1, value));
  const range = (t, start, end) => clamp((t - start) / (end - start));
  const smooth = value => value * value * (3 - 2 * value);
  const mix = (a, b, p) => a + (b - a) * p;
  const ease = (t, a, b) => smooth(range(t, a, b));

  function text(value, x, y, size = 20, color = ink, align = "left", family = mono, weight = 400) {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${family}`;
    ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillText(value, x, y);
  }

  function line(points, color, width = 1.5, progress = 1) {
    if (progress <= 0) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(...points[0]);
    let distance = 0;
    for (let i = 1; i < points.length; i++) distance += Math.hypot(points[i][0] - points[i-1][0], points[i][1] - points[i-1][1]);
    let remaining = distance * progress;
    for (let i = 1; i < points.length && remaining > 0; i++) {
      const prev = points[i-1], next = points[i], length = Math.hypot(next[0]-prev[0], next[1]-prev[1]);
      const p = Math.min(1, remaining / length);
      ctx.lineTo(mix(prev[0], next[0], p), mix(prev[1], next[1], p)); remaining -= length;
    }
    ctx.stroke(); ctx.restore();
  }

  function border(x, y, w, h, p, color = "#747a82") {
    line([[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]], color, 1.2, p);
  }

  function camera(t) {
    const keys = [
      [0,-915,-7,3], [1.1,-915,-7,3], [3.4,-720,0,1.65],
      [4.1,-680,0,1.6], [6.5,260,0,1.08], [8.1,350,0,1.12],
      [10.5,350,0,1.667], [12.8,350,0,1.667],
      [15.3,350,-90,.43], [17.3,350,-90,.43], [19.3,350,0,1], [22,350,0,1],
    ];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const a = keys[i-1], b = keys[i], p = ease(t,a[0],b[0]);
        return {x:mix(a[1],b[1],p), y:mix(a[2],b[2],p), z:mix(a[3],b[3],p)};
      }
    }
    return {x:350,y:0,z:1};
  }

  function buildImageField() {
    const sampler = document.createElement("canvas"); sampler.width = 112; sampler.height = 56;
    const sampleCtx = sampler.getContext("2d", {willReadFrequently:true});
    sampleCtx.drawImage(source,0,0,112,56);
    const pixels = sampleCtx.getImageData(0,0,112,56).data;
    const ac = ascii.getContext("2d"); ac.fillStyle = "#080a0c"; ac.fillRect(0,0,960,540);
    ac.font = `10px ${mono}`; ac.textBaseline = "middle";
    for (let y = 0; y < 56; y++) for (let x = 0; x < 112; x++) {
      const i = (y*112+x)*4;
      const luma = (.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2])/255;
      const glyph = ramp[Math.floor(luma*(ramp.length-1))];
      const shade = Math.round(70+luma*182);
      const sample = {x:x*960/112,y:(y+.5)*540/56,glyph,color:`rgb(${shade},${shade},${shade})`,delay:(x/112)*.36+(y/56)*.1};
      samples.push(sample); ac.fillStyle=sample.color; ac.fillText(glyph,sample.x,sample.y);
    }
    imageReady = true;
  }

  function grid(t) {
    ctx.save(); ctx.globalAlpha = ease(t,1.8,3.6)*(1-ease(t,17.4,18.6));
    ctx.fillStyle = "#30343a";
    for(let x=-2100;x<2900;x+=100) for(let y=-1200;y<1200;y+=100) ctx.fillRect(x,y,1.5,1.5);
    ctx.restore();
  }

  function prompt(t) {
    const raised = ease(t,12.8,15.3), closing = ease(t,17.2,18.6);
    ctx.save(); ctx.globalAlpha=1-closing; ctx.translate(raised*1070,-raised*690);
    const p = ease(t,1.1,2.8);
    ctx.fillStyle=`rgba(14,17,21,${p})`; ctx.fillRect(-970,-115,500,230);
    border(-970,-115,500,230,p);
    ctx.save(); ctx.globalAlpha=p;
    text(raised>.5?"[ AGENT ]":"[ PROMPT ]",-940,-82,12,"#969da7");
    text("01 / 一个想法",-940,81,11,"#737d87");
    ctx.restore();
    const sentence = raised>.5 ? "把这张图，展开成三个分镜。" : "把山海，变成一个故事。";
    const count = Math.floor(range(t,1.7,3.7)*sentence.length);
    const shown = sentence.slice(0,count);
    text(shown,-915,-7,25,ink,"left",sans,500);
    ctx.font=`500 25px ${sans}`;
    const cursorX=-915+ctx.measureText(shown).width+7;
    const move= ease(t,3.8,4.3);
    const px=mix(cursorX,-470,move), py=mix(-7,0,move);
    if(t<4.32) {
      text("*",px,py,mix(30,18,move),ink,"center");
      const collapse=1-ease(t,.4,1.55);
      for(let i=0;i<64;i++) {
        const angle=i/64*Math.PI*2+t*.8, r=collapse*(43+13*Math.sin(i*2.3));
        ctx.globalAlpha=collapse*(.25+.6*(Math.cos(angle)+1)/2);
        text(i%3===0?"+":".",-915+Math.cos(angle)*r,-7+Math.sin(angle)*r*.65,7,ink,"center");
      }
    }
    ctx.restore();
  }

  function connection(t) {
    const p=ease(t,4.1,5.8), closing=1-ease(t,17.1,18.6), raised=ease(t,12.8,15.3);
    ctx.save(); ctx.globalAlpha=closing;
    const points=[];
    for(let i=0;i<=80;i++) {
      const u=i/80;
      points.push([mix(-470+raised*1070,mix(-130,350,raised),u)+Math.sin(u*Math.PI)*raised*110,
        mix(-raised*690,-raised*270,smooth(u))-Math.sin(u*Math.PI)*70*(1-raised)]);
    }
    line(points,"#a5adb8",1.6,p);
    if(p>0 && p<1) {
      const at=points[Math.floor(p*80)];
      ctx.shadowBlur=18; ctx.shadowColor="#fff"; text("✳",at[0],at[1],22,ink,"center");
    }
    ctx.restore();
  }

  function imageNode(t) {
    const born=ease(t,5,5.8);
    if(!born) return;
    ctx.save();
    const fold=ease(t,17.5,19.2);
    ctx.translate(350,0);ctx.scale(mix(1,.06,fold),mix(1,.024,fold));ctx.translate(-350,0);
    border(-130,-270,960,540,born,"#c8cbd0");
    ctx.beginPath();ctx.rect(-130,-270,960,540);ctx.clip();
    ctx.translate(-130,-270);
    const assembly=range(t,5,8);
    if(assembly<1) {
      ctx.font=`10px ${mono}`; ctx.textBaseline="middle"; ctx.textAlign="left";
      for(const item of samples) {
        const p=smooth(clamp((assembly-item.delay)/.52));
        if(p<=0) continue;
        const spread=(1-p);
        ctx.globalAlpha=p;
        ctx.fillStyle=item.color;
        ctx.fillText(item.glyph,mix(-120,item.x,p),mix(270,item.y,p)+Math.sin(item.x*.021)*spread*100);
      }
      ctx.globalAlpha=1;
    } else ctx.drawImage(ascii,0,0);
    const color=ease(t,8.7,10.5);
    if(imageReady && color>0) {
      ctx.save();ctx.beginPath();
      ctx.moveTo(-150,-1);ctx.lineTo(-150+1320*color,-1);ctx.lineTo(-320+1320*color,541);ctx.lineTo(-150,541);ctx.closePath();ctx.clip();
      ctx.drawImage(source,0,0,960,540);ctx.restore();
      if(color<1) line([[-150+1320*color,0],[-320+1320*color,540]],"#fff",1.5);
    }
    ctx.restore();
  }

  function storyboard(t) {
    const spread=ease(t,12.8,15.3), fold=ease(t,17.5,19.2);
    if(spread<=0 || !imageReady) return;
    for(const side of [-1,1]) {
      const x=mix(350+side*1090*spread,350+side*23,fold), y=mix(0,side*24,fold);
      ctx.save();ctx.translate(x,y);
      ctx.scale(mix(spread,.06,fold),mix(spread,.024,fold));
      ctx.fillStyle="#101319";ctx.fillRect(-480,-270,960,540);
      const crop=side<0?.7:.48;
      const sx=side<0?0:source.width*(1-crop)*.87;
      const sy=side<0?0:source.height*(1-crop)*.9;
      ctx.drawImage(source,sx,sy,source.width*crop,source.height*crop,-480,-270,960,540);
      border(-480,-270,960,540,1,"#777f89");ctx.restore();
    }
    const show=ease(t,14.3,15.5)*(1-ease(t,17.25,18.1));
    ctx.save();ctx.globalAlpha=show;
    for(const [x,label] of [[-740,"01 / 走进山海"],[350,"02 / 看见全貌"],[1440,"03 / 发现细节"]]) {
      text(label,x-480,316,25,ink,"left",sans,500);
      text("FRAME / 16:9",x+480,316,15,"#8b949f","right");
    }
    for(const [a,b] of [[-260,-130],[830,960]]) {
      line([[a,0],[b,0]],"#a4acb8",2);
      ctx.fillStyle=ink;ctx.beginPath();ctx.arc(a,0,5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(b,0,5,0,Math.PI*2);ctx.fill();
    }
    text("一句话，展开创作。",350,470,67,ink,"center",sans,500);
    ctx.restore();
  }

  function brand(t) {
    const formed=ease(t,18.7,19.5);
    if(!formed) return;
    ctx.save();
    const cy=mix(450,337,ease(t,19.1,19.9));
    // Three picture strips settle into the same three-stroke seed at the center.
    ctx.fillStyle=`rgba(8,10,12,${formed})`;ctx.fillRect(695,260,210,245);
    ctx.globalAlpha=formed;
    line([[767,cy-44],[746,cy-44],[746,cy+44],[767,cy+44]],ink,3,formed);
    line([[833,cy-44],[854,cy-44],[854,cy+44],[833,cy+44]],ink,3,formed);
    line([[822,cy-24],[779,cy-24],[779,cy],[821,cy],[821,cy+24],[778,cy+24]],ink,6,formed);
    const words=ease(t,19.15,20.05);
    ctx.globalAlpha=words;
    text("SeedController",800,469+24*(1-words),94,ink,"center",sans,600);
    text("把想象，连接成作品。",800,574+12*(1-words),31,"#bec2c7","center",sans,400);
    text("YOUR NEXT IDEA STARTS HERE",800,713,12,"#8e97a2","center");
    ctx.restore();
  }

  function render(t) {
    currentTime=t;
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle="#080a0c";ctx.fillRect(0,0,W,H);
    const cam=camera(t);
    ctx.save();ctx.translate(W/2,H/2);ctx.scale(cam.z,cam.z);ctx.translate(-cam.x,-cam.y);
    grid(t);connection(t);prompt(t);storyboard(t);imageNode(t);
    ctx.restore();
    const titleAlpha=ease(t,.15,.6)*(1-ease(t,1.2,1.8));
    ctx.globalAlpha=titleAlpha;
    text("一个想法。",800,700,47,ink,"center",sans,500);
    text("EVERYTHING STARTS WITH A SEED",800,761,12,"#9199a4","center");
    ctx.globalAlpha=1;
    brand(t);
    seek.value=String(t);timeLabel.textContent=`00:${String(Math.floor(t)).padStart(2,"0")}`;
    play.textContent=timeline.paused()||t>=DURATION?"播放":"暂停";
    play.setAttribute("aria-label",timeline.paused()||t>=DURATION?"播放":"暂停");
  }

  const clock={get value(){return currentTime;},set value(t){render(t);}};
  const timeline=gsap.timeline({paused:true});
  window.__timelines={"canvas-film":timeline};
  timeline.to(clock,{value:DURATION,duration:DURATION,ease:"none"},0);
  const events=new AbortController();
  function listen(target,type,handler){target.addEventListener(type,handler,{signal:events.signal});}
  listen(play,"click",()=>{if(timeline.time()>=DURATION)timeline.restart();else timeline.paused(!timeline.paused());render(timeline.time());});
  listen(document.querySelector("#restart"),"click",()=>{timeline.restart();render(0);});
  listen(seek,"input",()=>{timeline.pause().time(Number(seek.value),false);render(timeline.time());});
  listen(document.querySelector("#fullscreen"),"click",async()=>{
    try { if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen(); }
    catch { document.querySelector("#fullscreen").title="当前浏览器未开启全屏，请放大窗口观看。"; }
  });
  listen(document,"keydown",event=>{
    if(event.code==="Space"&&!event.target.closest("button,input,a,summary")){event.preventDefault();play.click();}
    if(event.key==="Escape"){timeline.pause();render(timeline.time());}
  });
  listen(document,"visibilitychange",()=>{if(document.hidden){timeline.pause();render(timeline.time());}});
  listen(reduced,"change",()=>{if(reduced.matches){timeline.pause();render(timeline.time());}});
  listen(window,"pagehide",event=>{if(!event.persisted){timeline.kill();events.abort();}});
  source.onload=()=>{buildImageField();if(reduced.matches){timeline.pause().time(21,false);render(21);}else {render(0);timeline.play(0);}};
  source.onerror=()=>{timeline.pause();text("图像未能载入，请刷新后重试。",800,450,28,ink,"center",sans);};
  render(0);source.src="assets/landscape.png";
})();
