/**
 * Spectral phase-grating equations adapted from Scott Sun's pure-TSL example:
 * https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills/blob/d1cb23dcce6ea8ee4a60f6159daeb79d4b511dba/skills/threejs-procedural-materials/examples/physical-diffraction-grating/physical-diffraction-grating.js
 * TSL -> GLSL: CIE approximation, blackbody weighting, Bessel efficiency,
 * normalized angular density, three orders, and 21-sample far-field strip.
 * Pattern adaptation: regular hexagonal cells with six fixed radial etch sectors;
 * geometry changes grating orientation/pitch and native film thickness. No painted hue, random cell
 * colors, image texture, shader clock, emitter tracking or new render loop.
 * One continuous object-local patterned sheet covers the three cut foil plates.
 * This is a 1-D reflective sinusoidal phase-grating approximation, not a full
 * wavefront solver. Native Three thin-film interference is a separate effect.
 * Far-field incident directions deliberately follow the upstream approximation;
 * gain/Fresnel/blaze are approximations, not a measured energy-conserving BSDF.
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

export const DIFFRACTION_SOURCE = Object.freeze({
  repository: 'https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills',
  revision: 'd1cb23dcce6ea8ee4a60f6159daeb79d4b511dba',
  sourceFile: 'skills/threejs-procedural-materials/examples/physical-diffraction-grating/physical-diffraction-grating.js',
  license: 'MIT', copyright: '2026 Scott Sun',
  adaptation: 'TSL optical core to GLSL; fixed sixfold hexagonal groove/pitch and film-thickness pattern',
  patternCoordinates: 'continuous global object-local patterned sheet',
  approximation: '1-D phase grating, orders 1–3, 21-point far-field strip emitter',
});

export function diffractionOrderWavelengthNm(pitchNm, qAcross, order) {
  return pitchNm * Math.abs(qAcross) / order;
}
export function diffractionEffectiveAzimuthSigma(lambdaNm, coherenceUm, azimuthSigma) {
  return Math.max(Math.hypot(azimuthSigma, 0.376 * lambdaNm / (Math.max(coherenceUm, 0.1) * 1000)), 0.0025);
}

const OPTICS = /* glsl */ `
varying vec3 diffractionPosition;
varying vec3 diffractionWorldPosition;
varying vec3 diffractionAxisX;
varying vec3 diffractionAxisY;
uniform float uHolo;
uniform float uDiffPitchNm;
uniform float uDiffReliefNm;
uniform float uDiffCoherenceUm;
uniform float uDiffAzimuthSigma;
uniform float uDiffPeriodicAngle;
uniform float uDiffGain;
uniform vec3 uDiffLightCenter;
uniform vec3 uDiffLightAxis;
uniform vec3 uDiffLightNormal;
uniform float uDiffLightHalfLength;
uniform float uDiffLightTemperatureK;
uniform float uDiffLightPower;

float diffractionCieBell(float lambdaNm, float mu, float leftTau, float rightTau) {
  float x=(lambdaNm<mu?leftTau:rightTau)*(lambdaNm-mu);
  return exp(-0.5*x*x);
}
vec3 diffractionSpectralColor(float l, float temperatureK) {
  float X=1.056*diffractionCieBell(l,599.8,.0264,.0323)
    +.362*diffractionCieBell(l,442.,.0624,.0374)-.065*diffractionCieBell(l,501.1,.0490,.0382);
  float Y=.821*diffractionCieBell(l,568.8,.0213,.0247)+.286*diffractionCieBell(l,530.9,.0613,.0322);
  float Z=1.217*diffractionCieBell(l,437.,.0845,.0278)+.681*diffractionCieBell(l,459.,.0385,.0725);
  vec3 xyz=max(vec3(X,Y,Z),vec3(0.));
  vec3 rgb=max(vec3(dot(xyz,vec3(3.2406,-1.5372,-.4986)),
    dot(xyz,vec3(-.9689,1.8758,.0415)),dot(xyz,vec3(.0557,-.2040,1.0570))),vec3(0.));
  float logB=-5.*log(l)-log(max(exp(1.4387769e7/(l*temperatureK))-1.,1e-6));
  float logBr=-5.*log(560.)-log(max(exp(1.4387769e7/(560.*temperatureK))-1.,1e-6));
  return rgb*exp(logB-logBr);
}
float diffractionBesselJ(int m, float x) {
  float mf=float(m), factorial=m==1?1.:(m==2?2.:6.);
  float term=pow(x*.5,mf)/factorial, sum=term;
  for(int k=0;k<8;k++) {
    float kp1=float(k)+1.;
    term*=(-.25*x*x)/(kp1*(mf+kp1)); sum+=term;
  }
  return sum;
}
vec3 diffractionGratingSpectrum(vec3 wi, vec3 wo, vec3 n, vec3 periodicDir, vec3 grooveDir, float pitchNm) {
  float ndl=max(dot(n,wi),0.), ndv=max(dot(n,wo),0.);
  vec3 rgb=vec3(0.);
  if(ndl<=0. || ndv<=0.) return rgb;
  vec3 q=wi+wo;
  float qAcross=dot(q,periodicDir), qAlong=dot(q,grooveDir);
  for(int m=1;m<=3;m++) {
    float mf=float(m), lambdaNm=pitchNm*abs(qAcross)/mf;
    if(lambdaNm>=380. && lambdaNm<=720.) {
      float sigmaCoherence=.376*lambdaNm/(max(uDiffCoherenceUm,.1)*1000.);
      float sigma=max(sqrt(uDiffAzimuthSigma*uDiffAzimuthSigma+sigmaCoherence*sigmaCoherence),.0025);
      float z=qAlong/sigma, density=exp(-.5*z*z)/(sigma*2.50662827463);
      float phaseDepth=uDiffReliefNm*(ndl+ndv)*6.28318530718/lambdaNm;
      float jm=diffractionBesselJ(m,phaseDepth);
      float fresnel=.84+.16*pow(1.-ndl,5.);
      float blaze=exp(-.95*(mf-1.)*(mf-1.));
      rgb+=diffractionSpectralColor(lambdaNm,uDiffLightTemperatureK)*jm*jm*density*fresnel*blaze*.165;
    }
  }
  return rgb;
}
// Adaptation: equal-size hex cells, fixed centers, six radial etched rays.
// The two fields returned are angle and pitch scale; neither is a hue or alpha.
vec2 diffractionHexGrooves(vec2 st) {
  vec2 grid=st*5.2, period=vec2(1.,1.73205080757);
  vec2 a=mod(grid,period)-period*.5;
  vec2 b=mod(grid-vec2(.5,.86602540378),period)-period*.5;
  vec2 p=dot(a,a)<dot(b,b)?a:b;
  float r=length(p), angle=atan(p.y,p.x);
  float sector=floor(angle/1.0471975512+.5)*1.0471975512;
  float rayDistance=abs(sin(angle-sector))*r;
  float ray=(1.-smoothstep(.018,.034,rayDistance))*smoothstep(.025,.08,r);
  // Radial groove direction has its periodic direction rotated through pi/2.
  float periodicAngle=uDiffPeriodicAngle+sector+ray*1.57079632679;
  float pitchScale=mix(1.,.94+.10*clamp(r/.58,0.,1.),ray);
  return vec2(periodicAngle,pitchScale);
}
vec3 diffractionRadiance(vec3 worldNormal) {
  vec3 n=normalize(worldNormal), wo=normalize(cameraPosition-diffractionWorldPosition);
  vec3 tx=diffractionAxisX-n*dot(diffractionAxisX,n);
  if(dot(tx,tx)<1e-6) tx=diffractionAxisY-n*dot(diffractionAxisY,n);
  tx=normalize(tx);
  vec3 ty=normalize(cross(n,tx));
  vec2 fields=diffractionHexGrooves(diffractionPosition.xy/1.43);
  vec3 periodicDir=normalize(tx*cos(fields.x)+ty*sin(fields.x));
  vec3 grooveDir=normalize(cross(n,periodicDir));
  vec3 sum=vec3(0.), lightAxis=normalize(uDiffLightAxis), lightNormal=normalize(uDiffLightNormal);
  float distance2=max(dot(uDiffLightCenter,uDiffLightCenter),.01);
  for(int i=0;i<21;i++) {
    float ss=((float(i)+.5)/21.)*2.-1.;
    vec3 anchor=uDiffLightCenter+lightAxis*uDiffLightHalfLength*ss;
    vec3 wi=normalize(anchor); // Explicit upstream far-field approximation.
    float geom=max(dot(n,wi),0.)*max(dot(lightNormal,-wi),0.)/distance2;
    if(geom>0.) sum+=diffractionGratingSpectrum(wi,wo,n,periodicDir,grooveDir,uDiffPitchNm*fields.y)*geom;
  }
  return max(sum*(2.*uDiffLightHalfLength/21.)*uDiffLightPower*uDiffGain,vec3(0.));
}
`;

/** Native PBR material, custom radiance added to directSpecular in linear space.
 * setOrigin(x,y) intentionally does nothing: disks are cuts of one patterned sheet.
 * setLight(worldPosition) changes the far-field strip anchor, not scene light state.
 * uHolo=0 gates diffraction only; caller also sets material.iridescence=0 and
 * needsUpdate when disabling Three's native thin film. No owned texture or loop.
 */
export function createDiffractionMaterial(THREE, { petalMask = '' } = {}) {
  if(typeof petalMask!=='string') throw new TypeError('petalMask must be GLSL source');
  const material=new THREE.MeshPhysicalMaterial({
    color:0x91999f, metalness:.85, roughness:.14, clearcoat:1, clearcoatRoughness:.07,
    iridescence:1, iridescenceIOR:1.3, iridescenceThicknessRange:[180,520],
  });
  const uniforms={
    uHolo:{value:1}, uGrain:{value:0}, uDiffPitchNm:{value:1180}, uDiffReliefNm:{value:86},
    uDiffCoherenceUm:{value:14.5}, uDiffAzimuthSigma:{value:.013},
    uDiffPeriodicAngle:{value:31*Math.PI/180}, uDiffGain:{value:5.1},
    uDiffLightCenter:{value:new THREE.Vector3(-1.95,3.75,5.35)},
    uDiffLightAxis:{value:new THREE.Vector3(.94,-.26,0).normalize()},
    uDiffLightNormal:{value:new THREE.Vector3(.20,-.54,-.82).normalize()},
    uDiffLightHalfLength:{value:4.9}, uDiffLightTemperatureK:{value:5250}, uDiffLightPower:{value:128},
  };
  material.uniforms=uniforms;
  material.userData.enamel={uniforms,compiled:false};
  material.userData.holofoil={source:DIFFRACTION_SOURCE,uniforms,
    setOrigin:()=>{},
    setLight:(position)=>{
      if(Array.isArray(position)) uniforms.uDiffLightCenter.value.set(position[0],position[1],position[2]);
      else uniforms.uDiffLightCenter.value.copy(position);
    },
  };
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      varying vec3 diffractionPosition;
      varying vec3 diffractionWorldPosition;
      varying vec3 diffractionAxisX;
      varying vec3 diffractionAxisY;`)
      .replace('#include <begin_vertex>','#include <begin_vertex>\ndiffractionPosition=position;')
      .replace('#include <project_vertex>',`#include <project_vertex>
        diffractionWorldPosition=(modelMatrix*vec4(transformed,1.)).xyz;
        diffractionAxisX=normalize(mat3(modelMatrix)*vec3(1.,0.,0.));
        diffractionAxisY=normalize(mat3(modelMatrix)*vec3(0.,1.,0.));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+OPTICS)
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec3 enamelPosition=diffractionPosition;
        ${petalMask}`)
      .replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
        #ifdef USE_IRIDESCENCE
          // Etched laminate thickness follows the fixed hex geometry, never RGB noise.
          vec2 sheet=diffractionPosition.xy/1.43*5.2, period=vec2(1.,1.73205080757);
          vec2 a=mod(sheet,period)-period*.5;
          vec2 b=mod(sheet-vec2(.5,.86602540378),period)-period*.5;
          vec2 cell=dot(a,a)<dot(b,b)?a:b;
          material.iridescenceThickness=mix(iridescenceThicknessMinimum,iridescenceThicknessMaximum,clamp(length(cell)/.58,0.,1.));
        #endif`)
      .replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
        if(uHolo>.0001) {
          vec3 opticalWorldNormal=inverseTransformDirection(normal,viewMatrix);
          reflectedLight.directSpecular+=diffractionRadiance(opticalWorldNormal)*uHolo;
        }`);
    material.userData.enamel.compiled=true;
  };
  material.customProgramCacheKey=()=> 'codex-sourced-phase-grating-hex-v1:'+petalMask;
  return material;
}

/** CPU equation checks only; this does not assert GPU compilation or visual fit. */
export function diffractionSelfCheck() {
  const checks=[
    diffractionOrderWavelengthNm(1180,.5,1)===590,
    diffractionOrderWavelengthNm(1180,-.5,1)===590,
    diffractionOrderWavelengthNm(1180,.5,2)===295,
    diffractionEffectiveAzimuthSigma(590,14.5,.013)>.013,
  ];
  const visible=[1,2,3].map(m=>diffractionOrderWavelengthNm(1180,.5,m)).filter(l=>l>=380&&l<=720);
  if(checks.some(v=>!v) || visible.length!==1 || visible[0]!==590) throw new Error('Diffraction equation self-check failed');
  return {passed:true,visibleOrdersForQAcrossHalf:visible, gpuCompiled:false};
}
