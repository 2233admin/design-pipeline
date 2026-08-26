# Background Recipes — Drop-in Implementations

Fuller, production-ready versions of each technique. All are self-contained (Three.js is the only external dependency, and only for the shader recipe).

## 1. Rich CSS mesh gradient (blurred blobs)

Animated blobs behind a blur layer give a soft "mesh gradient" look without WebGL. Uses absolutely-positioned radial blobs and `filter: blur`.

```html
<div class="mesh">
  <span class="blob b1"></span>
  <span class="blob b2"></span>
  <span class="blob b3"></span>
</div>
```

```css
.mesh{ position:fixed; inset:0; z-index:-1; overflow:hidden; background:#0b0e1a; }
.mesh .blob{
  position:absolute; width:50vmax; height:50vmax; border-radius:50%;
  filter:blur(80px); opacity:.55; mix-blend-mode:screen;
}
.b1{ background:#5b8cff; top:-10%; left:-5%;  animation:drift1 26s ease-in-out infinite; }
.b2{ background:#b05bff; top:30%;  left:55%;  animation:drift2 30s ease-in-out infinite; }
.b3{ background:#2de1c2; top:60%;  left:10%;  animation:drift3 22s ease-in-out infinite; }

@keyframes drift1{ 0%,100%{transform:translate(0,0)} 50%{transform:translate(20vmax,10vmax)} }
@keyframes drift2{ 0%,100%{transform:translate(0,0)} 50%{transform:translate(-18vmax,12vmax)} }
@keyframes drift3{ 0%,100%{transform:translate(0,0)} 50%{transform:translate(12vmax,-14vmax)} }

@media (prefers-reduced-motion: reduce){ .mesh .blob{ animation:none } }
```

`mix-blend-mode: screen` blends overlapping blobs into bright color fields; `blur` smooths them into a continuous mesh. Identical 0%/100% keyframes guarantee a seamless loop.

## 2. Three.js aurora shader — full, with parallax and seamless loop

```js
import * as THREE from 'three';

export function createAurora(canvas){
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);

  const PERIOD = 18.0; // seconds for a full seamless loop
  const u = {
    uPhase:  {value:0},                 // 0..2π, wraps each PERIOD
    uRes:    {value:new THREE.Vector2()},
    uMouse:  {value:new THREE.Vector2(0.5,0.5)},
    uColorA: {value:new THREE.Color('#0b1d4d')},
    uColorB: {value:new THREE.Color('#5b8cff')},
    uColorC: {value:new THREE.Color('#b05bff')},
  };

  const material = new THREE.ShaderMaterial({
    uniforms:u,
    vertexShader:`void main(){ gl_Position=vec4(position,1.0); }`,
    fragmentShader:`
      precision highp float;
      uniform float uPhase; uniform vec2 uRes, uMouse;
      uniform vec3 uColorA, uColorB, uColorC;

      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
        vec2 w=f*f*(3.0-2.0*f);
        return mix(mix(a,b,w.x), mix(c,d,w.x), w.y);
      }
      float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<6;i++){v+=a*noise(p);p*=2.;a*=.5;} return v; }

      void main(){
        vec2 uv = gl_FragCoord.xy/uRes.xy;
        uv += (uMouse-0.5)*0.06;                  // subtle parallax
        // loop the flow by moving along a circle in noise space:
        vec2 flow = vec2(cos(uPhase), sin(uPhase))*0.6;
        float n = fbm(uv*3.0 + flow);
        float bands = sin((uv.y*4.0 + n*2.0)) * 0.5 + 0.5;
        vec3 col = mix(uColorA, uColorB, smoothstep(0.2,0.7,n));
        col = mix(col, uColorC, smoothstep(0.5,1.0,bands)*0.6);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2), material);
  scene.add(quad);

  function resize(){
    renderer.setSize(innerWidth, innerHeight);
    u.uRes.value.set(innerWidth, innerHeight);
  }
  addEventListener('resize', resize); resize();
  addEventListener('pointermove', e => {
    u.uMouse.value.set(e.clientX/innerWidth, 1 - e.clientY/innerHeight);
  });

  const start = performance.now();
  let running = true;
  function loop(){
    if (running){
      const t = (performance.now() - start)/1000;
      u.uPhase.value = (t % PERIOD)/PERIOD * Math.PI * 2; // wraps → seamless
      renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
  }
  loop();
  return {
    set running(v){ running = v; if (v) loop(); },
    renderOnce(){ renderer.render(scene, camera); },
  };
}
```

The seamless loop trick: drive the noise offset with `vec2(cos(uPhase), sin(uPhase))`, a closed circle in noise space — at `uPhase = 2π` the field is identical to `uPhase = 0`.

## 3. Constellation field — grid-optimized + mouse repulsion

```js
export function createConstellation(canvas, {count=120, link=130, repel=140} = {}){
  const ctx = canvas.getContext('2d');
  let W,H,pts; const mouse = {x:-9999, y:-9999};

  function init(){
    W = canvas.width = innerWidth; H = canvas.height = innerHeight;
    pts = Array.from({length:count}, () => ({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-0.5)*0.25, vy:(Math.random()-0.5)*0.25,
    }));
  }
  addEventListener('resize', init); init();
  addEventListener('pointermove', e => { mouse.x=e.clientX; mouse.y=e.clientY; });
  addEventListener('pointerleave', () => { mouse.x=mouse.y=-9999; });

  // spatial hash to avoid O(n^2)
  const cell = link;
  function key(x,y){ return ((x/cell)|0)+','+((y/cell)|0); }

  let running = true;
  function frame(){
    if (!running){ requestAnimationFrame(frame); return; }
    ctx.clearRect(0,0,W,H);
    const grid = new Map();
    for (const p of pts){
      p.x+=p.vx; p.y+=p.vy;
      if (p.x<0||p.x>W) p.vx*=-1;
      if (p.y<0||p.y>H) p.vy*=-1;
      // mouse repulsion
      const dx=p.x-mouse.x, dy=p.y-mouse.y, d=Math.hypot(dx,dy);
      if (d<repel){ p.x+=dx/d*1.5; p.y+=dy/d*1.5; }
      const k=key(p.x,p.y); (grid.get(k)||grid.set(k,[]).get(k)).push(p);
      ctx.fillStyle='#9db4ff'; ctx.fillRect(p.x,p.y,2,2);
    }
    // link only within neighboring cells
    for (const p of pts){
      const cx=(p.x/cell)|0, cy=(p.y/cell)|0;
      for (let gx=cx-1;gx<=cx+1;gx++) for (let gy=cy-1;gy<=cy+1;gy++){
        const bucket = grid.get(gx+','+gy); if (!bucket) continue;
        for (const q of bucket){
          if (q===p) continue;
          const dx=p.x-q.x, dy=p.y-q.y, d=Math.hypot(dx,dy);
          if (d<link){
            ctx.strokeStyle=`rgba(157,180,255,${(1-d/link)*0.6})`;
            ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke();
          }
        }
      }
    }
    requestAnimationFrame(frame);
  }
  frame();
  return { set running(v){ running=v; } };
}
```

Spatial hashing keeps the link test near O(n) and scales to several hundred points.

## 4. Perfectly looping noise flow (canvas)

To loop drifting noise, sample it at a position that travels a closed path:

```js
const PERIOD = 10;                       // seconds
const phase = (t % PERIOD)/PERIOD * Math.PI*2;
const sx = Math.cos(phase)*R;            // closed circle → returns to start
const sy = Math.sin(phase)*R;
// feed (baseX + sx, baseY + sy) into your noise function
```

Because `(sx,sy)` returns exactly to its start at `t = PERIOD`, the whole field repeats with no jump. For 1-D scroll loops instead, advance by an *integer* number of noise cells per period (`scroll = floor(cells) * (t % PERIOD)/PERIOD`) so the tile aligns.

## 5. Reduced-motion + lifecycle manager

A single controller that wraps any of the above (anything exposing a `running` setter and a one-frame render).

```js
export function attachLifecycle(canvas, controller){
  const mq = matchMedia('(prefers-reduced-motion: reduce)');

  function apply(){
    const reduced = mq.matches;
    if (reduced){
      controller.running = false;
      controller.renderOnce?.();           // one static frame
      return;
    }
    controller.running = !document.hidden && visible;
  }

  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; apply(); });
  io.observe(canvas);
  document.addEventListener('visibilitychange', apply);
  mq.addEventListener?.('change', apply);
  apply();

  return () => { io.disconnect(); document.removeEventListener('visibilitychange', apply); };
}
```

Usage:

```js
const aurora = createAurora(document.querySelector('#bg'));
attachLifecycle(document.querySelector('#bg'), aurora);
```

This guarantees: a static frame for reduced-motion users, no CPU/GPU work when the tab is hidden or the canvas is scrolled out of view, and automatic resume when conditions change.

---
Keep the loop seamless and the cost low and a background lives behind content. Built by **[iart.ai](https://iart.ai/?utm_source=github&utm_medium=readme&utm_campaign=motion-design-skills&utm_content=skill_footer&utm_term=motion-background)** — the AI motion agent for editable, on-brand motion graphics.
