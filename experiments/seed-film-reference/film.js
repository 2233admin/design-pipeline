(() => {
  "use strict";
  const W=1600,H=900,DURATION=32;
  const canvas=document.querySelector("#screen"),ctx=canvas.getContext("2d");
  const root=document.querySelector("#field-film"),score=document.querySelector("#score");
  const videos=Object.fromEntries(["city","night","moon"].map(id=>[id,document.getElementById(id)]));
  const playButton=document.querySelector("#play"),seek=document.querySelector("#seek"),startButton=document.querySelector("#start");
  const startLayer=document.querySelector("#start-layer"),message=document.querySelector("#load-message");
  const muteButton=document.querySelector("#mute"),volume=document.querySelector("#volume");
  const mono="Consolas, 'Courier New', monospace",sans="'Segoe UI', 'Microsoft YaHei', sans-serif";
  const white="#edf1f3",silver="#b8c6d1";
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  const listeners=new AbortController();
  let time=0,ready=false,starting=false,failed=false;
  const clamp=v=>Math.max(0,Math.min(1,v));
  const p=(t,a,b)=>clamp((t-a)/(b-a));
  const ease=(t,a,b)=>{const q=p(t,a,b);return q*q*(3-2*q);};
  const mix=(a,b,q)=>a+(b-a)*q;
  const windowAlpha=(t,a,b,c,d)=>ease(t,a,b)*(1-ease(t,c,d));

  function label(value,x,y,size=15,color=white,align="left",family=mono,weight=400){
    ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${family}`;ctx.textAlign=align;ctx.textBaseline="middle";
    ctx.fillText(value,x,y);
  }

  function line(points,progress=1,color=white,width=1){
    if(progress<=0)return;
    let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);
    let remaining=length*progress;ctx.save();ctx.lineWidth=width;ctx.strokeStyle=color;
    ctx.beginPath();ctx.moveTo(...points[0]);
    for(let i=1;i<points.length&&remaining>0;i++){
      const a=points[i-1],b=points[i],part=Math.hypot(b[0]-a[0],b[1]-a[1]),q=Math.min(1,remaining/part);
      ctx.lineTo(mix(a[0],b[0],q),mix(a[1],b[1],q));remaining-=part;
    }ctx.stroke();ctx.restore();
  }

  function frame(x,y,w,h,alpha=1,color=white){
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
    const n=13;for(const [cx,cy,sx,sy] of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]])
      line([[cx,cy+sy*n],[cx,cy],[cx+sx*n,cy]],1,color,2);
    ctx.restore();
  }

  function video(id,x,y,w,h,{zoom=1,cx=.5,cy=.5,alpha=1,grade=true}={}){
    const v=videos[id];if(v.readyState<2)return;
    const ratio=w/h;let sw=v.videoWidth,sh=sw/ratio;
    if(sh>v.videoHeight){sh=v.videoHeight;sw=sh*ratio;}
    sw/=zoom;sh/=zoom;
    const sx=Math.max(0,Math.min(v.videoWidth-sw,v.videoWidth*cx-sw/2));
    const sy=Math.max(0,Math.min(v.videoHeight-sh,v.videoHeight*cy-sh/2));
    ctx.save();ctx.globalAlpha*=alpha;
    if(grade)ctx.filter="saturate(.58) contrast(1.08) brightness(.94)";
    ctx.drawImage(v,sx,sy,sw,sh,x,y,w,h);ctx.restore();
  }

  function shade(top=.18,bottom=.62){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,`rgba(4,10,17,${top})`);g.addColorStop(.48,"rgba(4,10,17,0)");g.addColorStop(1,`rgba(4,10,17,${bottom})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }

  function furniture(t,index,light=false){
    const color=light?"#46535e":silver;
    ctx.save();ctx.globalAlpha=.82;
    label("SEEDCONTROLLER",80,63,13,color);
    label("FIELD NOTES / 2026",1520,63,12,color,"right");
    label(`[ ${index} ]`,80,843,13,color);
    label("IDEAS. FRAMES. CONNECTIONS.",1520,843,11,color,"right");
    ctx.restore();
  }

  function intro(t){
    video("city",0,0,W,H,{zoom:1.035});shade(.08,.57);
    const appear=ease(t,.3,1.8),exit=1-ease(t,3.9,4.375);
    ctx.save();ctx.globalAlpha=appear*exit;
    label("想象，正在发生。",98,700,67,white,"left",sans,500);
    label("EVERY FRAME BEGINS WITH A POSSIBILITY.",102,764,13,silver);
    ctx.restore();
    ctx.save();ctx.globalAlpha=windowAlpha(t,1.5,2.4,3.9,4.375)*.7;
    const x=940-25*Math.sin(t*.55),y=265;
    frame(x,y,235,142,.8);line([[x,y+142],[x-150,y+225],[x-290,y+225]],ease(t,2,3.4),silver);
    label("SPACE / 01",x-290,y+208,12,silver);ctx.restore();
    furniture(t,"01 / OBSERVE");
  }

  function detail(t){
    const q=ease(t,4.375,5.3);
    video("city",0,0,W,H,{zoom:1.5,cx:.46,cy:.46});shade(.1,.45);
    const x=mix(1240,1120,q),y=170,w=340,h=492;
    ctx.save();ctx.globalAlpha=q;
    ctx.fillStyle="#0b1118";ctx.fillRect(x-9,y-9,w+18,h+18);
    video("city",x,y,w,h,{zoom:1.7,cx:.53,cy:.43});frame(x,y,w,h,.85);
    const bx=700,by=240;
    frame(bx,by,210,290,.8);line([[bx+210,by+145],[1020,by+145],[x,y+210]],ease(t,4.8,5.8),silver);
    label("DETAIL / 02",x,y-29,12,silver);label("ONE FRAME. MANY POSSIBILITIES.",x,y+h+30,10,silver);
    label("每个细节，都可以继续。",99,744,36,white,"left",sans,400);
    ctx.restore();furniture(t,"02 / EXPLORE");
  }

  function nightShot(t){
    video("night",0,0,W,H,{zoom:1.04});shade(.08,.45);
    const q=windowAlpha(t,7.65,8.25,10.7,11.25);
    ctx.save();ctx.globalAlpha=q;
    const bx=710+35*Math.sin((t-7.5)*.8),by=440;
    frame(bx,by,270,187,.55);
    line([[bx+270,by+93],[1130,by+93],[1192,305]],ease(t,8,9),silver);
    ctx.save();ctx.beginPath();ctx.arc(1280,218,119,0,Math.PI*2);ctx.clip();
    video("night",1161,99,238,238,{zoom:1.25,cx:.58,cy:.62});ctx.restore();
    ctx.beginPath();ctx.arc(1280,218,123,-Math.PI/2,-Math.PI/2+Math.PI*2*ease(t,8,9.2));ctx.strokeStyle=silver;ctx.lineWidth=1;ctx.stroke();
    label("MOTION STUDY / 03",1158,68,11,silver);
    label("让想法，开始运动。",98,729,58,white,"left",sans,500);
    ctx.restore();furniture(t,"03 / MOVE");
  }

  function moonShot(t){
    video("moon",0,0,W,H,{zoom:1.06});shade(.03,.33);
    const q=windowAlpha(t,11.7,12.5,15.3,16.2);
    ctx.save();ctx.globalAlpha=q;
    frame(570,174,457,405,.45);
    line([[1027,390],[1120,390],[1160,447]],ease(t,12,13),silver);
    ctx.save();ctx.globalAlpha*=.85;
    video("moon",1160,447,300,188,{zoom:1.6,cx:.50,cy:.76});frame(1160,447,300,188,.7);ctx.restore();
    label("LIGHT / FORM",1160,665,11,silver);
    label("从一段灵感，到一个世界。",98,743,47,white,"left",sans,400);
    ctx.restore();furniture(t,"04 / IMAGINE");
  }

  function curve(a,b,progress,color="#53616c"){
    const points=[];for(let i=0;i<=60;i++){
      const u=i/60,v=1-u;
      const k=Math.max(90,Math.abs(b[0]-a[0])*.5);
      points.push([v*v*v*a[0]+3*v*v*u*(a[0]+k)+3*v*u*u*(b[0]-k)+u*u*u*b[0],
        v*v*v*a[1]+3*v*v*u*a[1]+3*v*u*u*b[1]+u*u*u*b[1]]);
    }line(points,progress,color,1.4);
    if(progress>0&&progress<1){const pt=points[Math.floor(progress*60)];ctx.fillStyle="#1f3544";ctx.beginPath();ctx.arc(pt[0],pt[1],4,0,Math.PI*2);ctx.fill();}
  }

  function canvasShot(t){
    const pull=ease(t,16.25,18.3),reveal=ease(t,17.2,18.8);
    ctx.fillStyle="#dce2e5";ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=pull*.3;ctx.fillStyle="#627481";
    for(let x=40;x<W;x+=40)for(let y=20;y<H;y+=40)ctx.fillRect(x,y,1,1);
    ctx.restore();

    const mx=mix(0,655,pull),my=mix(0,240,pull),mw=mix(W,640,pull),mh=mix(H,360,pull);
    // Other sources emerge while the same moon shot remains continuously visible.
    if(reveal>0){
      ctx.save();ctx.globalAlpha=reveal;
      curve([470,268],[655,420],ease(t,18.15,19.15));
      curve([460,516],[655,420],ease(t,18.65,19.75));
      line([[1295,420],[1402,420],[1402,595],[1190,595],[1190,641]],ease(t,19.3,20.4),"#657782",1.3);
      ctx.fillStyle="#eef1f2";ctx.fillRect(130,215,340,105);frame(130,215,340,105,1,"#8c9ca6");
      label("[ PROMPT ]",151,239,11,"#596c7a");label("夜色中的梦境，电影感。",151,279,20,"#263946","left",sans,500);
      const cityReveal=ease(t,17.8,18.8);
      ctx.save();ctx.beginPath();ctx.rect(120,415,340*cityReveal,191);ctx.clip();video("city",120,415,340,191);ctx.restore();
      frame(120,415,340,191,cityReveal,"#778a97");
      label("01 / 参考素材",120,634,15,"#374e5e","left",sans,500);
      label("CITY STUDY",460,634,10,"#6c808d","right");
      const nightReveal=ease(t,19.65,20.55);
      ctx.save();ctx.beginPath();ctx.rect(1020,641,340,191*nightReveal);ctx.clip();video("night",1020,641,340,191);ctx.restore();
      frame(1020,641,340,191,nightReveal,"#778a97");
      ctx.save();ctx.globalAlpha*=nightReveal;
      label("03 / 延展镜头",1020,614,15,"#374e5e","left",sans,500);ctx.restore();
      ctx.restore();
    }

    video("moon",mx,my,mw,mh,{zoom:mix(1.06,1,pull)});
    if(pull>0){ctx.save();ctx.globalAlpha=pull;frame(mx,my,mw,mh,.8,"#6e8494");
      label("02 / 作品画面",mx,my-28,16,"#374e5e","left",sans,500);
      label("OUTPUT / 16:9",mx+mw,my-28,11,"#6c808d","right");ctx.restore();}

    ctx.save();ctx.globalAlpha=ease(t,18.5,19.5);
    label("让创作，自由相连。",655,147,48,"#273d4c","left",sans,500);
    const agent=ease(t,20.5,21.4);
    ctx.globalAlpha=agent;
    ctx.fillStyle="#eaf0f3";ctx.fillRect(120,707,685,91);frame(120,707,685,91,1,"#9cabb5");
    label("✳",149,752,29,"#435c70");label("CANVAS AGENT",186,729,10,"#6b8190");
    label("把这段灵感，展开成一组镜头。",186,766,22,"#334d60","left",sans,500);
    ctx.restore();furniture(t,"05 / CONNECT",true);
  }

  function finalMontage(t){
    if(t<25){
      const expand=ease(t,23.75,24.2);
      if(expand<1)canvasShot(t);
      video("night",mix(1020,0,expand),mix(641,0,expand),mix(340,W,expand),mix(191,H,expand));
    }else if(t<26.25){video("city",0,0,W,H,{zoom:1.12,cx:.5,cy:.52});}
    else video("moon",0,0,W,H,{zoom:1.04});
    shade(.02,.26);
    ctx.save();ctx.globalAlpha=windowAlpha(t,24.2,24.4,27.1,27.5);
    label("下一种可能，由你连接。",800,754,40,white,"center",sans,500);
    ctx.restore();furniture(t,"06 / CREATE");
  }

  function endShot(t){
    video("moon",0,0,W,H,{zoom:1.04});
    const q=ease(t,27.5,29.2);ctx.fillStyle=`rgba(4,10,16,${mix(.22,.79,q)})`;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=q;
    label("[s]",800,295,52,silver,"center");
    label("SeedController",800,450,115,white,"center",sans,600);
    label("把想象，连接成作品。",800,566,34,"#c3d0da","center",sans,400);
    line([[735,647],[865,647]],ease(t,28.4,29.4),"#8098a9");
    label("A CANVAS FOR WHAT COMES NEXT",800,695,12,"#93a8b8","center");
    ctx.restore();furniture(t,"SEEDCONTROLLER");
  }

  function mediaAt(t){
    if(t<4.375)return {city:{at:.25+t*.99,rate:.99}};
    if(t<7.5)return {city:{at:1+(t-4.375),rate:1}};
    if(t<11.25)return {night:{at:.1+t-7.5,rate:1}};
    if(t<16.25)return {moon:{at:.5+t-11.25,rate:1}};
    if(t<23.75)return {
      moon:{at:5.5+(t-16.25)*.65,rate:.65},
      city:{at:.3+(Math.max(0,t-17.2)*.70)%4.55,rate:.70},
      night:{at:.15+Math.max(0,t-18.2)*.60,rate:.60},
    };
    if(t<25)return {night:{at:2.2+(t-23.75)*.9,rate:.9}};
    if(t<26.25)return {city:{at:3.3+t-25,rate:1}};
    if(t<27.5)return {moon:{at:6+t-26.25,rate:1}};
    return {moon:{at:7.25+(t-27.5)*.65,rate:.65}};
  }

  function updateMedia(t){
    if(!ready)return;
    const running=!timeline.paused()&&t<DURATION;
    const desired=mediaAt(t);
    for(const [id,v] of Object.entries(videos)){
      const target=desired[id];
      if(!target){if(!v.paused)v.pause();continue;}
      const at=Math.max(0,Math.min(v.duration-.05,target.at));
      v.playbackRate=target.rate;
      if(!v.seeking&&Math.abs(v.currentTime-at)>(running?.14:.018))v.currentTime=at;
      if(running&&v.paused)v.play().catch(()=>{});
      if(!running&&!v.paused)v.pause();
    }
    if(Math.abs(score.currentTime-t)>(running?.12:.018))score.currentTime=t;
    if(!running&&!score.paused)score.pause();
  }

  function paint(t){
    ctx.resetTransform();ctx.globalAlpha=1;ctx.filter="none";ctx.fillStyle="#080d12";ctx.fillRect(0,0,W,H);
    if(t<4.375)intro(t);else if(t<7.5)detail(t);else if(t<11.25)nightShot(t);
    else if(t<16.25)moonShot(t);else if(t<23.75)canvasShot(t);else if(t<27.5)finalMontage(t);else endShot(t);
  }

  function syncUI(){
    const playing=!timeline.paused()&&time<DURATION;
    playButton.textContent=playing?"暂停":"播放";playButton.setAttribute("aria-label",playing?"暂停影片":"播放影片");
    seek.value=String(time);document.querySelector("#time").textContent=`00:${String(Math.floor(time)).padStart(2,"0")}`;
    muteButton.textContent=score.muted?"声音 关":"声音 开";muteButton.setAttribute("aria-label",score.muted?"开启声音":"静音");muteButton.setAttribute("aria-pressed",String(score.muted));
  }

  function render(t){time=t;updateMedia(t);paint(t);syncUI();}
  const clock={get value(){return time;},set value(t){render(t);}};
  const timeline=gsap.timeline({paused:true});
  window.__timelines={"field-film":timeline};
  timeline.to(clock,{value:DURATION,duration:DURATION,ease:"none"},0);
  function listen(target,event,handler){target.addEventListener(event,handler,{signal:listeners.signal});}
  function pause(){timeline.pause();score.pause();for(const v of Object.values(videos))v.pause();syncUI();}
  async function play(){
    if(!ready||starting)return;
    starting=true;
    if(time>=DURATION){timeline.pause().time(0,false);}
    score.currentTime=time;
    try{await score.play();startLayer.classList.add("hidden");timeline.play();render(time);}
    catch{message.textContent="请点击播放按钮开启声音。";startLayer.classList.remove("hidden");}
    finally{starting=false;}
  }
  listen(startButton,"click",play);
  listen(playButton,"click",()=>timeline.paused()||time>=DURATION?play():pause());
  listen(document.querySelector("#restart"),"click",()=>{pause();timeline.time(0,false);play();});
  listen(seek,"input",()=>{const target=Number(seek.value);pause();timeline.time(target,false);startLayer.classList.add("hidden");render(time);});
  listen(muteButton,"click",()=>{score.muted=!score.muted;syncUI();});
  listen(volume,"input",()=>{score.volume=Number(volume.value);score.muted=score.volume===0;syncUI();});
  listen(document.querySelector("#fullscreen"),"click",async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}catch{document.querySelector("#fullscreen").title="请放大窗口观看影片";}});
  listen(document,"keydown",event=>{if(event.code==="Space"&&!event.target.closest("button,input,a,summary")){event.preventDefault();playButton.click();}if(event.key==="Escape")pause();});
  listen(document,"visibilitychange",()=>{if(document.hidden)pause();});
  listen(reduced,"change",()=>{if(reduced.matches)pause();});
  listen(window,"pagehide",event=>{if(!event.persisted){pause();timeline.kill();listeners.abort();}});
  for(const v of Object.values(videos))listen(v,"seeked",()=>{if(ready&&timeline.paused()){updateMedia(time);paint(time);}});
  function load(media){return new Promise((resolve,reject)=>{
    if(media.readyState>=2)return resolve();
    listen(media,"loadeddata",resolve);listen(media,"error",reject);
  });}
  score.volume=.8;
  Promise.all([...Object.values(videos),score].map(load)).then(()=>{
    ready=true;startButton.disabled=false;playButton.disabled=false;seek.disabled=false;document.querySelector("#restart").disabled=false;
    document.querySelector("#start-text").textContent="播放影片 · 开启声音";message.textContent="";render(0);
  }).catch(()=>{failed=true;message.textContent="素材载入失败，请刷新后重试。";document.querySelector("#start-text").textContent="影片暂时无法播放";});
  // Read-only diagnostic snapshot for the local preview's timing review.
  window.__filmDiagnostics=()=>({time,ready,failed,audioTime:score.currentTime,audioPaused:score.paused,audioMuted:score.muted,
    media:Object.fromEntries(Object.entries(videos).map(([id,v])=>[id,{time:v.currentTime,desired:mediaAt(time)[id]?.at,paused:v.paused,readyState:v.readyState,seeking:v.seeking}]))});
  render(0);
})();
