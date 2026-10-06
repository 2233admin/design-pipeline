/**
 * Two-interface Snell path adapted from Scott Sun's spectral glass:
 * https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills/blob/d1cb23dcce6ea8ee4a60f6159daeb79d4b511dba/skills/threejs-procedural-materials/examples/spectral-dispersive-glass/spectral-glass-material.js
 * Native integration: Three r180 ShaderChunk.transmission_pars_fragment, MIT:
 * https://github.com/mrdoob/three.js/blob/r180/src/renderers/shaders/ShaderChunk/transmission_pars_fragment.glsl.js
 * The dependency's original chunk is read at runtime and only one function is
 * replaced per material; the global ShaderChunk is never mutated.
 * This adaptation uses the actual visible entry normal and a known planar exit.
 * Native three-channel IOR spread/Fresnel/filtering remain; this is NOT Scott's
 * eight-wavelength Cauchy/CIE/TIR tracer. Background is one receiver plane.
 * Clear/no-absorption defaults avoid treating the air gap as absorbing glass
 * in the retained native attenuation calculation.
 *
 * MIT License
 * Copyright (c) 2026 Scott Sun
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export const LENS_SOURCE=Object.freeze({
  repository:'https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills',
  revision:'d1cb23dcce6ea8ee4a60f6159daeb79d4b511dba',license:'MIT',
  nativeIntegration:'Three r180 transmission_pars_fragment; per-material replacement',
  model:'curved entry + analytic planar exit, two Snell interfaces',
  background:'single receiver-plane approximation; native linear transmission buffer',
  dispersion:'native Three three-channel IOR spread, not 8-wavelength Cauchy/CIE',
  limits:'no side-wall intersection, internal bounce, exact exit Fresnel or multi-depth occlusion; invalid/TIR rays sample undisplaced background',
});
const RAY_BODY=/* glsl */ `{
  vec3 incident=normalize(lensCameraForward);
  vec3 inside=refract(incident,normalize(n),1.0/ior);
  if(dot(inside,inside)<1e-8) return vec3(0.);
  vec3 pLocal=(lensInverseModel*vec4(vWorldPosition,1.)).xyz;
  vec3 dLocal=(lensInverseModel*vec4(inside,0.)).xyz;
  if(dLocal.z>=-1e-6) return vec3(0.);
  float tExit=(lensBottomZ-pLocal.z)/dLocal.z;
  if(tExit<0.) return vec3(0.);
  vec3 exitLocal=pLocal+dLocal*tExit;
  // +Z points from the rear interface back into the glass, opposing inside ray.
  vec3 exitNormal=normalize(vec3(lensInverseModel[0][2],lensInverseModel[1][2],lensInverseModel[2][2]));
  vec3 outside=refract(normalize(inside),exitNormal,ior);
  if(dot(outside,outside)<1e-8) return vec3(0.); // TIR path intentionally unsupported.
  vec3 outLocal=(lensInverseModel*vec4(outside,0.)).xyz;
  if(outLocal.z>=-1e-6) return vec3(0.);
  float tReceiver=(lensReceiverPlaneZ-lensBottomZ)/outLocal.z;
  if(tReceiver<0.) return vec3(0.);
  vec3 hitLocal=exitLocal+outLocal*tReceiver;
  return (modelMatrix*vec4(hitLocal,1.)).xyz-vWorldPosition;
}`;
function patchTransmissionChunk(chunk) {
  const signature=/vec3 getVolumeTransmissionRay\s*\([^)]*\)\s*\{/;
  const match=signature.exec(chunk);
  if(!match || !match[0].includes('const in mat4 modelMatrix')) throw new Error('Lens: incompatible native transmission ray entry');
  const open=match.index+match[0].length-1;
  let depth=1,end=open+1;
  while(end<chunk.length&&depth) {if(chunk[end]==='{')depth++;if(chunk[end]==='}')depth--;end++;}
  if(depth) throw new Error('Lens: unterminated native transmission ray');
  return 'uniform mat4 lensInverseModel;\nuniform vec3 lensCameraForward;\nuniform float lensBottomZ;\nuniform float lensReceiverPlaneZ;\n'
    +chunk.slice(0,open)+RAY_BODY+chunk.slice(end);
}
/** update(mesh,camera,receiverWorldPoint) once before each main render.
 * Plane coordinates follow mesh.matrixWorld; receiverWorldPoint is a real world
 * point behind its planar bottom. Orthographic cameras only. No owned FBO/loop.
 */
export function createLensMaterial(THREE,{bottomZ=-.045,ior=1.46,dispersion=1,envMapIntensity=1}={}) {
  const chunk=THREE.ShaderChunk?.transmission_pars_fragment;
  if(typeof chunk!=='string') throw new Error('Lens: native transmission chunk unavailable');
  const patched=patchTransmissionChunk(chunk);
  const uniforms={lensInverseModel:{value:new THREE.Matrix4()},lensCameraForward:{value:new THREE.Vector3(0,0,-1)},
    lensBottomZ:{value:bottomZ},lensReceiverPlaneZ:{value:bottomZ-.1}};
  const material=new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:0,transmission:1,
    thickness:.12,ior,dispersion,attenuationColor:0xffffff,attenuationDistance:Infinity,
    opacity:1,transparent:false,side:THREE.FrontSide,envMapIntensity});
  const receiver=new THREE.Vector3();
  const state={metadata:LENS_SOURCE,uniforms,compiled:false,passed:0,
    update(mesh,camera,receiverWorldPoint) {
      if(!camera?.isOrthographicCamera) throw new Error('Lens: this adapter requires an orthographic camera');
      mesh.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);
      if(Math.abs(mesh.matrixWorld.determinant())<1e-10) throw new Error('Lens: singular mesh transform');
      uniforms.lensInverseModel.value.copy(mesh.matrixWorld).invert();
      camera.getWorldDirection(uniforms.lensCameraForward.value).normalize();
      receiver.copy(receiverWorldPoint).applyMatrix4(uniforms.lensInverseModel.value);
      if(!Number.isFinite(receiver.z)||receiver.z>=bottomZ) throw new Error('Lens: receiver must lie behind the glass bottom');
      uniforms.lensReceiverPlaneZ.value=receiver.z;state.passed++;
    },
  };
  material.userData.lens=state;
  material.onBeforeCompile=shader=>{
    const marker='#include <transmission_pars_fragment>';
    if(shader.fragmentShader.split(marker).length!==2) throw new Error('Lens: scoped transmission include not found exactly once');
    Object.assign(shader.uniforms,uniforms);
    shader.fragmentShader=shader.fragmentShader.replace(marker,patched);
    state.compiled=true;
  };
  material.customProgramCacheKey=()=> 'codex-snells-two-interface-plane-lens-r180-v1';
  return material;
}
/** CPU path checks; neither GPU compilation nor visual fidelity is asserted. */
export function lensSelfCheck(THREE) {
  const refract=(I,N,eta)=>{
    const dot=N.dot(I),k=1-eta*eta*(1-dot*dot);
    return k<0?new THREE.Vector3():I.clone().multiplyScalar(eta).addScaledVector(N,-eta*dot-Math.sqrt(k));
  };
  const trace=(x,angle)=>{
    const I=new THREE.Vector3(0,0,-1),N=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
    const T1=refract(I,N,1/1.46),T2=refract(T1,new THREE.Vector3(0,0,1),1.46);
    return x+T1.x*((-.045-.2)/T1.z)+T2.x*((-.3+.045)/T2.z);
  };
  const axis=trace(0,0),edge=trace(.5,.15);
  if(Math.abs(axis)>1e-12||!(edge>0&&edge<.5)) throw new Error('Lens Snell CPU self-check failed');
  return {passed:true,axisHitX:axis,edgeEntryX:.5,edgeHitX:edge,gpuCompiled:false};
}
