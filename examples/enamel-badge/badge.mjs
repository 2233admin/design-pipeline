import * as THREE from 'three';
import { createEnamelMaterial } from './lib/enamel.mjs';
import { createCaustics } from './lib/caustics.mjs';
import { createDiffractionMaterial } from './lib/diffraction.mjs';
import { HDRLoader } from './lib/hdr-loader.mjs';
import { createLensMaterial } from './lib/lens.mjs';
import { EffectComposer } from './lib/postprocessing/EffectComposer.js';
import { RenderPass } from './lib/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './lib/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './lib/postprocessing/OutputPass.js';
import { SMAAPass } from './lib/postprocessing/SMAAPass.js';

const $ = id => document.getElementById(id);
const mode = new URLSearchParams(location.search);
const renderOnly = mode.get('render')==='1';
const inspectMode = mode.get('inspect')==='1'&&!renderOnly;
document.body.classList.toggle('render', renderOnly);
document.body.classList.toggle('inspect', inspectMode);
const stage = $('stage'), canvas = $('badge');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const params = { yaw:0, pitch:0, roll:0, explode:0, scale:1, light:0, time:0, playing:false, material:true, glass:true, thinFilm:true, diffraction:true, dispersion:true, caustics:true, glow:true, antialias:true };
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true}); }
catch (error) { $('error').hidden=false; $('error').textContent='当前浏览器无法启动 WebGL：'+error.message; throw error; }
renderer.setPixelRatio(2); // 2x spatial sampling also covers shader masks and refracted image edges.
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.98;
renderer.outputColorSpace=THREE.SRGBColorSpace;
// Solid presentation backdrop also prevents native transmission's white alpha fallback.
renderer.setClearColor(0x020407,1);
renderer.info.autoReset=false;
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-3.35,3.35,3.35,-3.35,.1,60);
camera.position.set(0,0,14); camera.lookAt(0,0,0);
const object = new THREE.Group(); scene.add(object);
const composer=new EffectComposer(renderer);
// Composer targets replace the antialiased default framebuffer; retain native MSAA.
composer.renderTarget1.samples=composer.renderTarget2.samples=Math.min(4,renderer.capabilities.maxSamples);
const scenePass=new RenderPass(scene,camera);
const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.2,.08,2);
const smaa=new SMAAPass(); // Official r180 pass filters post-refraction edges in linear space.
const outputPass=new OutputPass();
composer.addPass(scenePass);composer.addPass(bloom);composer.addPass(smaa);composer.addPass(outputPass);

// Real CC0 daylight radiance; retain bright sun values in Float32 before PMREM integration.
let hdr;
try { hdr=await new HDRLoader().setDataType(THREE.FloatType).loadAsync('./assets/kloofendal_48d_partly_cloudy_2k.hdr'); }
catch(error){$('error').hidden=false;$('error').textContent='自然光 HDR 加载失败：'+error.message;throw error;}
hdr.mapping=THREE.EquirectangularReflectionMapping;
let hdrPeak=0;
for(let i=0;i<hdr.image.data.length;i+=4)for(let c=0;c<3;c++)hdrPeak=Math.max(hdrPeak,hdr.image.data[i+c]);
const hdrMetadata={asset:'Poly Haven Kloofendal 48d Partly Cloudy',source:'https://polyhaven.com/a/kloofendal_48d_partly_cloudy',license:'CC0',width:hdr.image.width,height:hdr.image.height,linearRadiancePeak:hdrPeak,toneMapping:'ACESFilmic',exposure:renderer.toneMappingExposure};
const generator = new THREE.PMREMGenerator(renderer);
const environment = generator.fromEquirectangular(hdr);scene.environment=environment.texture;generator.dispose();hdr.dispose();hdr=null;
scene.environmentRotation.set(-.3,.4,0);
const key = new THREE.DirectionalLight(0xffffff,.65);key.position.set(-2,3,8);scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff,.03);fill.position.set(4,-3,4);scene.add(fill);

const petalMask=`
 vec2 p=enamelPosition.xy;
 float petal=0.0;
 petal+=step(length(p-vec2(-.18,.33)),.56);
 petal+=step(length(p-vec2(-.18,-.33)),.56);
 petal+=step(length(p-vec2(.38,0.0)),.56);
 if (petal>0.5) discard;
`;

const silver = new THREE.MeshPhysicalMaterial({color:0xe1e7ee,metalness:1,roughness:.07,clearcoat:.35,clearcoatRoughness:.04,envMapIntensity:1});
const back = new THREE.MeshStandardMaterial({color:0x7c8890,metalness:.88,roughness:.32});
const blue = createEnamelMaterial(THREE,{color:0x007cdc,roughness:.09,clearcoat:1,relief:.038,scale:2.4,seed:23});
blue.envMapIntensity=.8;
const foil = createDiffractionMaterial(THREE,{petalMask});
foil.uniforms.uDiffPeriodicAngle.value=Math.atan2(3,-2);
foil.transparent=false; // Cutout-only opaque foil belongs in the physical glass transmission buffer.
const flatBlue = new THREE.MeshBasicMaterial({color:0x047bcd});
const flatFoil = new THREE.MeshBasicMaterial({color:0xa7cbd7});
const flatSilver = new THREE.MeshBasicMaterial({color:0xb7c2cd});
const gray = new THREE.MeshStandardMaterial({color:0xc7cdd3,roughness:.63});
// Reuse r180's glTF physical transmission and dispersion, rather than alpha-painted glass.
// Reference-led RGB spread; this is a look calibration, not measured glass Abbe data.
const glassDispersion=1.5;
const coat = createLensMaterial(THREE,{bottomZ:-.045,ior:1.46,dispersion:glassDispersion,envMapIntensity:1});
coat.thickness=.265;
const mats = [silver,back,blue,foil,coat,flatBlue,flatFoil,flatSilver,gray];
const caustics = renderer.extensions.has('EXT_color_buffer_float') ? createCaustics(THREE,renderer,{resolution:128,intensity:key.intensity}) : null;
const opticalUniforms={causticMap:{value:caustics?.texture??null},causticProjection:{value:caustics?.projectionMatrix??new THREE.Matrix4()},causticEnabled:{value:0}};

const smallCenters = [[-.18,.33],[-.18,-.33],[.38,0]];
const largeCenters = [[-.72,0],[.36,.624],[.36,-.624]];
const smallRadius=.56, largeRadius=.715;
// Material ablation keeps the same paint mask; it must not change the visible circle topology.
flatFoil.onBeforeCompile=shader=>{
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 enamelPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nenamelPosition=position;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 enamelPosition;').replace('#include <color_fragment>','#include <color_fragment>\n'+petalMask);
};
flatFoil.customProgramCacheKey=()=> 'codex-enamel-flat-petal-mask-v1';
const originalBlue = blue.onBeforeCompile;
blue.onBeforeCompile = shader => {
 originalBlue(shader);
 // Existing object-locked relief shapes the pigment; the native physical BRDF shades it.
 shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.rgb *= mix(0.52,1.45,reliefColor);',`
  // One saturated enamel pigment. Variation comes from reflected light and relief.
  diffuseColor.rgb=vec3(0.001,0.075,0.42);
 `).replace('float h = enamelHeight(enamelUV * 0.35) * enamelRelief;',`
  float broad=enamelNoise(enamelPosition.xy*2.1+enamelNoise(enamelPosition.xy*1.3));
  float h=(broad*.65 + enamelNoise(enamelPosition.xy*5.0)*.35)*enamelRelief;
 `);
 if(caustics){
  Object.assign(shader.uniforms,opticalUniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 causticWorldPosition;').replace('#include <project_vertex>','#include <project_vertex>\ncausticWorldPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 causticWorldPosition;\nuniform sampler2D causticMap;\nuniform mat4 causticProjection;\nuniform float causticEnabled;').replace('#include <lights_fragment_end>',`
   #include <lights_fragment_end>
   vec4 causticClip=causticProjection*vec4(causticWorldPosition,1.0);
   vec2 causticUV=causticClip.xy/causticClip.w*.5+.5;
   if(causticEnabled>.5 && all(greaterThanEqual(causticUV,vec2(0.0))) && all(lessThanEqual(causticUV,vec2(1.0)))) {
    float concentratedLight=texture2D(causticMap,causticUV).r;
    reflectedLight.indirectDiffuse+=diffuseColor.rgb*concentratedLight*(1.0-metalnessFactor)*RECIPROCAL_PI;
   }
  `);
 }
};
blue.customProgramCacheKey=()=> 'codex-enamel-physical-relief-v2';

function hexShape(radius,corner=.13) {
 const v=Array.from({length:6},(_,i)=>new THREE.Vector2(Math.cos(Math.PI/2+i*Math.PI/3)*radius,Math.sin(Math.PI/2+i*Math.PI/3)*radius));
 const s=new THREE.Shape();
 for(let i=0;i<6;i++) {
  const a=v[i].clone().lerp(v[(i+5)%6],corner/radius),b=v[i].clone().lerp(v[(i+1)%6],corner/radius);
  if(i===0)s.moveTo(a.x,a.y);else s.lineTo(a.x,a.y);
  s.quadraticCurveTo(v[i].x,v[i].y,b.x,b.y);
 }
 s.closePath();return s;
}
function extrusion(shape,depth,bevel=.025) {
 return new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:4,curveSegments:36});
}
const layers=Array.from({length:5},()=>new THREE.Group());
layers.forEach(l=>object.add(l));
const baseZ=[.35,.30,.21,.03,-.12];
const tracked=[];
function mesh(parent,geometry,material,z=0,flat=flatSilver) {
 const m=new THREE.Mesh(geometry,material);m.position.z=z;parent.add(m);tracked.push({m,material,flat});return m;
}
function rim(parent,outer,inner,depth,z,bevel) {
 const shape=hexShape(outer);shape.holes.push(new THREE.Path(hexShape(inner).getPoints(48)));
 return mesh(parent,extrusion(shape,depth,bevel),silver,z);
}
function circleRing(parent,x,y,r,z,thickness=.021) {
 const ring=mesh(parent,new THREE.TorusGeometry(r,thickness,10,144),silver,z);ring.position.x=x;ring.position.y=y;return ring;
}
function rod(parent,x1,y1,x2,y2,z,r=.018) {
 const a=new THREE.Vector3(x1,y1,z),b=new THREE.Vector3(x2,y2,z);
 const m=mesh(parent,new THREE.CylinderGeometry(r,r,a.distanceTo(b),10),silver);
 m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return m;
}
mesh(layers[4],extrusion(hexShape(2.22),.095,.035),back,-.08);
rim(layers[4],2.23,2.14,.08,.00,.024);
const enamelMesh=mesh(layers[3],extrusion(hexShape(2.095),.105,.045),blue,-.07,flatBlue);
enamelMesh.geometry.computeBoundingBox();
// These are real thin foil plates over the enamel. The paint-mask opens the blue petal regions.
for(const [x,y] of largeCenters) {
 const shape=new THREE.Shape();shape.absarc(x,y,largeRadius,0,Math.PI*2,false);
 const disk=mesh(layers[2],extrusion(shape,.018,.009),foil,0,flatFoil);
}
const foilReceiver=tracked.find(item=>item.material===foil).m;
foilReceiver.geometry.computeBoundingBox();
rim(layers[1],2.19,2.105,.055,0,.026);
rim(layers[1],1.77,1.732,.025,.018,.008);
for(const [x,y] of largeCenters)circleRing(layers[1],x,y,largeRadius,.038,.024);
for(const [x,y] of smallCenters)circleRing(layers[1],x,y,smallRadius,.041,.021);
circleRing(layers[1],0,0,.09,.051,.013);
for(const angle of [0,2*Math.PI/3,4*Math.PI/3])rod(layers[1],0,0,1.515*Math.cos(angle),1.515*Math.sin(angle),.028,.017);
// Reuse the existing closed cap mesh, projected onto a spherical optical face.
function convexCap(shape,height) {
 const aperture=2.2,R=(aperture*aperture+height*height)/(2*height);
 const edge=Math.sqrt(R*R-aperture*aperture);
 const surface=(x,y)=>Math.sqrt(Math.max(0,R*R-x*x-y*y))-edge;
 const original=new THREE.ShapeGeometry(shape,32).toNonIndexed();
 const a=original.attributes.position, positions=[],normals=[];
 const point=(v)=>{
  const z=surface(v.x,v.y);
  positions.push(v.x,v.y,z);
  const n=new THREE.Vector3(v.x,v.y,z+edge).normalize();normals.push(n.x,n.y,n.z);
 };
 for(let i=0;i<a.count;i+=3){
  const A=new THREE.Vector3().fromBufferAttribute(a,i),B=new THREE.Vector3().fromBufferAttribute(a,i+1),C=new THREE.Vector3().fromBufferAttribute(a,i+2);
  const v=(u,w)=>A.clone().addScaledVector(B.clone().sub(A),u/8).addScaledVector(C.clone().sub(A),w/8);
  for(let u=0;u<8;u++)for(let w=0;w<8-u;w++){
   [v(u,w),v(u+1,w),v(u,w+1)].forEach(point);
   if(u+w<7)[v(u+1,w),v(u+1,w+1),v(u,w+1)].forEach(point);
  }
 }
 original.dispose();
 // Close the glass volume with the existing extruded outline. Do not layer a second
 // coincident glass plate under the cap: screen-space transmission would refract twice.
 const shell=extrusion(shape,.045,0), shellPositions=shell.attributes.position, shellNormals=shell.attributes.normal;
 for(let i=0;i<shellPositions.count;i+=3){
  if([0,1,2].every(j=>shellPositions.getZ(i+j)>.04))continue;
  for(let j=0;j<3;j++){
   const x=shellPositions.getX(i+j),y=shellPositions.getY(i+j),top=shellPositions.getZ(i+j)>.04;
   positions.push(x,y,top?surface(x,y):-.045);
   normals.push(shellNormals.getX(i+j),shellNormals.getY(i+j),shellNormals.getZ(i+j));
  }
 }
 shell.dispose();
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));return geo;
}
// ponytail: calibrated spherical front / planar back, not recovered source microgeometry.
const coverGeometry=convexCap(hexShape(2.15),.22);
const coverMesh=mesh(layers[0],coverGeometry,coat,.09,coat); // Rear face clears the highest metal bevel.
const metalBounds=new THREE.Box3().setFromObject(layers[1]);
const assembledGlassBackZ=baseZ[0]+coverMesh.position.z-.045;
const assembledMetalTopZ=baseZ[1]+metalBounds.max.z;
if(assembledGlassBackZ<=assembledMetalTopZ)throw new Error('Glass back intersects the metal layer');

const labelNames=['透明前盖','金属掐丝','虹彩嵌片','蓝色釉面','金属背板'];
const labels=layers.map((layer,i)=>{const e=document.createElement('div');e.className='layer-label';e.innerHTML=`0${i+1}<small>${labelNames[i]}</small>`;stage.append(e);return e;});
let width=1,height=1,raf=0,last=0,drag=null,visible=true;
const vector=new THREE.Vector3();
const receiverPoint=new THREE.Vector3(),receiverNormal=new THREE.Vector3(),receiverRotation=new THREE.Quaternion();
function syncUI() {
 $('explode').value=params.explode;$('yaw').value=params.yaw;$('light').value=params.light;
 $('explode-value').textContent=Math.round(params.explode*100)+'%';$('yaw-value').textContent=Math.round(params.yaw)+'°';$('light-value').textContent=Math.round(params.light)+'°';
 $('time').value=params.time;$('time-value').textContent=params.time.toFixed(2)+'s';
 $('play').textContent=params.playing?'暂停':'播放演示';$('play').setAttribute('aria-pressed',String(params.playing));
 $('demo-play').textContent=params.playing?'暂停':'播放';$('demo-play').setAttribute('aria-pressed',String(params.playing));
 $('view-label').textContent=params.explode>.12?'EXPLODED / 五层结构':Math.abs(params.yaw)>10?'OBLIQUE / 侧转反光':'ASSEMBLED / 合拢正面';
}
function render() {
 renderer.info.reset();
 object.rotation.set(THREE.MathUtils.degToRad(params.pitch),THREE.MathUtils.degToRad(params.yaw),THREE.MathUtils.degToRad(params.roll));
 object.scale.setScalar(params.scale);
 layers.forEach((layer,i)=>layer.position.z=baseZ[i]+(2-i)*params.explode*.84);
 coverMesh.visible=params.material&&params.glass;
 key.position.set(-2*Math.cos(params.light*Math.PI/180)+6*Math.sin(params.light*Math.PI/180),3,8*Math.cos(params.light*Math.PI/180));
 foil.userData.holofoil.setLight(key.position);
 object.updateMatrixWorld(true);
 receiverPoint.set(0,0,foilReceiver.geometry.boundingBox.max.z);foilReceiver.localToWorld(receiverPoint);
 coat.userData.lens.update(coverMesh,camera,receiverPoint);
 opticalUniforms.causticEnabled.value=caustics&&params.material&&params.glass&&params.caustics?1:0;
 if(opticalUniforms.causticEnabled.value){
  receiverPoint.set(0,0,enamelMesh.geometry.boundingBox.max.z);enamelMesh.localToWorld(receiverPoint);
  enamelMesh.getWorldQuaternion(receiverRotation);receiverNormal.set(0,0,1).applyQuaternion(receiverRotation);
  caustics.update(coverMesh,key.position,receiverPoint,receiverNormal);
 }
 bloom.enabled=params.material&&params.glow;
 smaa.enabled=params.antialias;
 composer.render(0); // Same clock; optical postprocessing contains no animation state.
 layers.forEach((layer,i)=>{
  vector.set(-1.6,2.12,0);layer.localToWorld(vector);vector.project(camera);
  labels[i].style.left=((vector.x*.5+.5)*width)+'px';labels[i].style.top=((-vector.y*.5+.5)*height)+'px';
  labels[i].style.opacity=params.explode>.3?'.85':'0';
 });
 syncUI();
}
function resize() {
 width=stage.clientWidth;height=stage.clientHeight;
 if(width===0||height===0)return;
 const ratio=width/height,halfHeight=3.35/Math.min(ratio,1);camera.left=-halfHeight*ratio;camera.right=halfHeight*ratio;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();renderer.setSize(width,height,false);composer.setSize(width,height);render();
}
const observer=new ResizeObserver(resize);observer.observe(stage);
const poses=await fetch('./demo-motion.json').then(r=>{if(!r.ok)throw new Error('姿态表读取失败');return r.json();});
const duration=31.158333;
function poseAt(t) {
 t=Math.max(0,Math.min(duration,t));let a=poses[0],b=poses[poses.length-1];
 for(let i=1;i<poses.length;i++){if(t<=poses[i][0]){a=poses[i-1];b=poses[i];break;}}
 const u=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0]))),s=u*u*(3-2*u);
 const p=a.map((n,i)=>i===0?t:THREE.MathUtils.lerp(n,b[i],s));
 params.time=t;params.pitch=p[1];params.yaw=p[2];params.roll=p[3];params.explode=p[4];params.scale=p[5];
}
function stop(){params.playing=false;last=0;cancelAnimationFrame(raf);raf=0;}
function tick(now) {
 raf=0;if(!params.playing||document.hidden||!visible)return;
 if(last)poseAt((params.time+Math.min((now-last)/1000,.1))%duration);
 last=now;render();raf=requestAnimationFrame(tick);
}
function resume(){if(params.playing&&!raf&&!document.hidden&&visible){last=0;raf=requestAnimationFrame(tick);}}
function setState(next) {stop();Object.assign(params,next);render();}
function setPreset(name) {
 const p=name==='layers'?{yaw:52,pitch:-12,roll:-8,explode:1,scale:.78}:name==='oblique'?{yaw:38,pitch:-9,roll:0,explode:0,scale:1}:{yaw:0,pitch:0,roll:0,explode:0,scale:1};
 setState(p);for(const id of ['front','oblique','layers'])$(id).setAttribute('aria-pressed',String(id===name));
}
for(const id of ['front','oblique','layers'])$(id).onclick=()=>setPreset(id);
for(const id of ['explode','yaw','light'])$(id).addEventListener('input',()=>setState({[id]:Number($(id).value)}));
function setMaterial(enabled) {
 params.material=enabled;
 for(const {m,material,flat} of tracked)m.material=enabled?material:flat;
 $('material').setAttribute('aria-pressed',String(enabled));$('material').textContent=enabled?'材质：开启':'材质：关闭';render();
}
function reset(){stop();Object.assign(params,{yaw:0,pitch:0,roll:0,explode:0,scale:1,light:0,time:0});setOptics({glass:true,thinFilm:true,diffraction:true,dispersion:true,caustics:true,glow:true,antialias:true});setMaterial(true);setPreset('front');}
$('reset').onclick=reset;$('material').onclick=()=>setMaterial(!params.material);
$('play').onclick=()=>{if(params.playing){stop();render();}else{params.playing=true;$('time-control').style.display='block';poseAt(params.time);resume();syncUI();}};
$('demo-play').onclick=()=>$('play').onclick();$('demo-reset').onclick=reset;
canvas.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();$('play').onclick();}else if(e.key.toLowerCase()==='r'){reset();}});
$('time').addEventListener('input',()=>{stop();poseAt(Number($('time').value));render();});
canvas.addEventListener('pointerdown',e=>{stop();syncUI();drag={x:e.clientX,y:e.clientY,yaw:params.yaw,pitch:params.pitch};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag)return;params.yaw=Math.max(-75,Math.min(75,drag.yaw+(e.clientX-drag.x)*.22));params.pitch=Math.max(-50,Math.min(50,drag.pitch+(e.clientY-drag.y)*.17));render();});
canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else resume();});
const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(raf);raf=0;last=0;}else resume();});intersection.observe(stage);
reduced.addEventListener('change',()=>{if(reduced.matches){stop();render();}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();$('error').hidden=false;$('error').textContent='图形上下文中断，请刷新此样件重新加载。';window.__ready=false;});
window.sampleTime=t=>{stop();poseAt(Number(t));render();};
// Developer ablation stays off the customer surface and uses the same renderer and clock.
function setOptics({glass=params.glass,thinFilm=params.thinFilm,diffraction=params.diffraction,dispersion=params.dispersion,caustics=params.caustics,glow=params.glow,antialias=params.antialias}={}) {
 stop();params.glass=Boolean(glass);params.thinFilm=Boolean(thinFilm);params.diffraction=Boolean(diffraction);params.dispersion=Boolean(dispersion);params.caustics=Boolean(caustics);params.glow=Boolean(glow);params.antialias=Boolean(antialias);
 foil.uniforms.uHolo.value=params.diffraction?1:0;foil.iridescence=params.thinFilm?1:0;foil.needsUpdate=true;
 coat.dispersion=params.dispersion?glassDispersion:0;coat.needsUpdate=true;render();
}
window.badgeStudy={setState,setPreset,setMaterial,setOptics,reset,render,get state(){return {...params};}};
window.getDiagnostics=()=>({author:'Codex current conversation',modelId:'not exposed by runtime',three:THREE.REVISION,hdr:hdrMetadata,glow:{source:'Three.js r180 UnrealBloomPass',enabled:bloom.enabled,strength:bloom.strength,radius:bloom.radius,threshold:bloom.threshold,linearHDR:true,outputConversion:'single OutputPass'},antialias:{source:"Three.js r180 SMAAPass",enabled:smaa.enabled,msaaSamples:composer.renderTarget1.samples,pixelRatio:renderer.getPixelRatio(),drawingBuffer:[canvas.width,canvas.height],transmissionSize:renderer.properties.get(coat).uniforms?.transmissionSamplerSize?.value.toArray(),lookupTexturesReady:smaa._areaTexture.image.complete&&smaa._searchTexture.image.complete},webgl2:renderer.capabilities.isWebGL2,layers:layers.length,meshes:tracked.length,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,enamelCompiled:blue.userData.enamel.compiled,foilCompiled:foil.userData.enamel.compiled,programs:renderer.info.programs.map(p=>({runnable:Boolean(renderer.getContext().getProgramParameter(p.program,renderer.getContext().LINK_STATUS))})),glass:{transmission:coat.transmission,thickness:coat.thickness,ior:coat.ior,dispersion:coat.dispersion,opacity:coat.opacity,closedGeometry:true,lens:{...coat.userData.lens.metadata,compiled:coat.userData.lens.compiled,updates:coat.userData.lens.passed,receiverPlaneZ:coat.userData.lens.uniforms.lensReceiverPlaneZ.value,sag:.22,assembledClearance:assembledGlassBackZ-assembledMetalTopZ}},holofoil:{source:foil.userData.holofoil.source,preset:'continuous hexagonal six-ray etched sheet',holoIntensity:foil.uniforms.uHolo.value,grain:foil.uniforms.uGrain.value,model:'sourced analytic phase grating plus native thin-film interference',wavelengthNm:'pitch * abs(qAcross) / order',orders:3,emitterSamples:21,filmIOR:foil.iridescenceIOR,filmThicknessNm:foil.iridescenceThicknessRange,measuredMaterial:false},caustics:caustics?{...caustics.diagnostics(),enabled:Boolean(opticalUniforms.causticEnabled.value)}:{status:'unavailable',reason:'EXT_color_buffer_float missing'},materialEnabled:params.material,visualAcceptance:'not-assessed',sourceMotion:'manually estimated demo poses; not recovered source motion',helper:'design-pipeline/enamel.mjs',shaderClockUniforms:false,frameTime:params.time});
window.disposeBadge=()=>{stop();observer.disconnect();intersection.disconnect();caustics?.dispose();object.traverse(o=>o.geometry?.dispose());mats.forEach(m=>m.dispose());environment.dispose();bloom.dispose();smaa.dispose();outputPass.dispose();composer.dispose();renderer.dispose();window.__ready=false;};
if(!renderOnly&&!inspectMode&&!reduced.matches){poseAt(0);params.playing=true;}
resize();render();window.__ready=true;resume();
