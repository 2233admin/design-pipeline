/*
 * Adapted normal/depth capture and refracted footprint area ratio from Drei:
 * https://github.com/pmndrs/drei/blob/bf6f4addf47467d3885de272d94ca5127f6ef68f/src/core/Caustics.tsx
 * Original author: N8Programs / N8python. This adaptation rasterizes actual receiver hits.
 * MIT License — Copyright (c) 2020 react-spring
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to the following
 * conditions: The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS
 * IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
 * ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

// ponytail: one refracting interface, directional light and planar receiver; no exit
// interface, obstruction, internal reflections or spectral transport. Use a closed-mesh
// ray tracer if those are required. This is white optical concentration, never noise.
export function createCaustics(THREE, renderer, { resolution = 128, intensity = .08 } = {}) {
  if (!Number.isInteger(resolution) || resolution < 8 || resolution > 512 || !Number.isFinite(intensity) || intensity < 0) {
    throw new Error('Caustics requires resolution 8–512 and a finite nonnegative intensity.');
  }
  if (!renderer.extensions.has('EXT_color_buffer_float')) throw new Error('Caustics requires floating-point render targets.');
  const normalTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: THREE.HalfFloatType,
    depthBuffer: true, stencilBuffer: false,
  });
  normalTarget.depthTexture = new THREE.DepthTexture(resolution, resolution, THREE.UnsignedIntType);
  const target = new THREE.WebGLRenderTarget(resolution, resolution, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.HalfFloatType,
    depthBuffer: false, stencilBuffer: false,
  });
  const lightCamera = new THREE.OrthographicCamera(-3, 3, 3, -3, .001, 100);
  const projectionMatrix = new THREE.Matrix4();
  const normalScene = new THREE.Scene(), fluxScene = new THREE.Scene();
  const viewToWorld = new THREE.Matrix3();
  const normalMaterial = new THREE.MeshNormalMaterial({ side: THREE.FrontSide, toneMapped: false });
  normalMaterial.onBeforeCompile = shader => {
    shader.uniforms.causticViewToWorld = { value: viewToWorld };
    shader.fragmentShader = 'uniform mat3 causticViewToWorld;\n' + shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      '#include <normal_fragment_maps>\nnormal = normalize(causticViewToWorld * normal);'
    );
  };
  normalMaterial.customProgramCacheKey = () => 'drei-caustics-world-normals-r180-v1';
  const proxy = new THREE.Mesh(new THREE.BufferGeometry(), normalMaterial);
  const emptyGeometry = proxy.geometry;
  proxy.matrixAutoUpdate = false; proxy.frustumCulled = false; normalScene.add(proxy);
  const uniforms = {
    normals: { value: normalTarget.texture }, depths: { value: normalTarget.depthTexture },
    cameraMatrixWorld: { value: lightCamera.matrixWorld }, cameraProjectionMatrixInv: { value: lightCamera.projectionMatrixInverse },
    receiverProjection: { value: projectionMatrix }, lightDir: { value: new THREE.Vector3() },
    planeNormal: { value: new THREE.Vector3(0, 0, 1) }, planeConstant: { value: 0 },
    texel: { value: 1 / resolution }, intensity: { value: intensity }, ior: { value: 1.5 },
  };
  const fluxMaterial = new THREE.ShaderMaterial({
    uniforms, toneMapped: false, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    transparent: true, blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform sampler2D normals, depths;
      uniform mat4 cameraMatrixWorld, cameraProjectionMatrixInv, receiverProjection;
      uniform vec3 lightDir, planeNormal;
      uniform float planeConstant, texel, intensity, ior;
      varying float flux, valid;
      vec3 WorldPosFromDepth(float depth, vec2 coord) {
        vec4 view = cameraProjectionMatrixInv * vec4(coord * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
        return (cameraMatrixWorld * (view / view.w)).xyz;
      }
      vec3 receiverHit(vec2 coord, out float ok) {
        float depth = texture2D(depths, coord).r;
        vec3 normal = normalize(texture2D(normals, coord).rgb * 2.0 - 1.0);
        vec3 pos = WorldPosFromDepth(depth, coord);
        vec3 ray = refract(lightDir, normal, 1.0 / ior);
        float denom = dot(ray, planeNormal);
        float distance = -(dot(pos, planeNormal) + planeConstant) / (abs(denom) < .00001 ? .00001 : denom);
        ok = depth < .999999 && abs(denom) > .00001 && distance >= 0.0 && dot(lightDir, normal) < 0.0 ? 1.0 : 0.0;
        return pos + ray * distance;
      }
      void main() {
        vec2 coord = uv * (1.0 - texel) + .5 * texel;
        vec2 a = coord + vec2(-.5, -.5) * texel, b = coord + vec2(-.5, .5) * texel;
        vec2 c = coord + vec2(.5, .5) * texel, d = coord + vec2(.5, -.5) * texel;
        float va, vb, vc, vd, centerValid;
        vec3 A = receiverHit(a, va), B = receiverHit(b, vb), C = receiverHit(c, vc), D = receiverHit(d, vd);
        vec3 oa = WorldPosFromDepth(0.0, a), ob = WorldPosFromDepth(0.0, b);
        vec3 oc = WorldPosFromDepth(0.0, c), od = WorldPosFromDepth(0.0, d);
        float lightPosArea = length(cross(ob - oa, oc - oa)) + length(cross(oc - oa, od - oa));
        float finalArea = length(cross(B - A, C - A)) + length(cross(C - A, D - A));
        // Remove the flat-surface baseline already present in the scene's direct lighting.
        float flatArea = lightPosArea / max(abs(dot(lightDir, planeNormal)), .00001);
        flux = intensity * clamp(flatArea / max(finalArea, .00000001) - 1.0, 0.0, 32.0);
        vec3 hit = receiverHit(coord, centerValid);
        valid = va * vb * vc * vd * centerValid;
        gl_Position = receiverProjection * vec4(hit, 1.0);
        // This target is a 2D light-space map. Receiver distance must not clip its rasterization.
        gl_Position.z = 0.0;
      }
    `,
    fragmentShader: `
      varying float flux, valid;
      void main() {
        if (valid < .999) discard;
        gl_FragColor = vec4(vec3(max(flux, 0.0)), 1.0);
      }
    `,
  });
  const fluxGeometry = new THREE.PlaneGeometry(2, 2, resolution - 1, resolution - 1);
  const fluxMesh = new THREE.Mesh(fluxGeometry, fluxMaterial);
  fluxMesh.frustumCulled = false; fluxScene.add(fluxMesh);
  const bounds = new THREE.Box3(), center = new THREE.Vector3(), direction = new THREE.Vector3();
  const corner = new THREE.Vector3(), clearColor = new THREE.Color(), viewport = new THREE.Vector4(), scissor = new THREE.Vector4();
  let updates = 0, disposed = false;
  const finiteVector = v => v?.isVector3 && [v.x, v.y, v.z].every(Number.isFinite);

  function update(coverMesh, lightPosition, receiverPoint, receiverNormal) {
    if (disposed) throw new Error('Caustics has been disposed.');
    if (!coverMesh?.isMesh || !coverMesh.geometry?.getAttribute('position') || !finiteVector(lightPosition) || !finiteVector(receiverPoint) || !finiteVector(receiverNormal) || receiverNormal.lengthSq() < 1e-12) {
      throw new Error('Caustics update requires a mesh and finite world-space light/receiver vectors.');
    }
    coverMesh.updateWorldMatrix(true, false);
    if (!coverMesh.geometry.boundingBox) coverMesh.geometry.computeBoundingBox();
    bounds.copy(coverMesh.geometry.boundingBox).applyMatrix4(coverMesh.matrixWorld);
    bounds.getCenter(center); direction.subVectors(center, lightPosition);
    if (direction.lengthSq() < 1e-12) throw new Error('Caustics light cannot coincide with the cover center.');
    direction.normalize();
    lightCamera.position.copy(lightPosition);
    lightCamera.up.set(Math.abs(direction.y) > .98 ? 1 : 0, Math.abs(direction.y) > .98 ? 0 : 1, 0);
    lightCamera.lookAt(center); lightCamera.updateMatrixWorld(true);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, far = .01;
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? bounds.max.x : bounds.min.x, i & 2 ? bounds.max.y : bounds.min.y, i & 4 ? bounds.max.z : bounds.min.z).applyMatrix4(lightCamera.matrixWorldInverse);
      minX = Math.min(minX, corner.x); maxX = Math.max(maxX, corner.x);
      minY = Math.min(minY, corner.y); maxY = Math.max(maxY, corner.y); far = Math.max(far, -corner.z);
    }
    const pad = Math.max(maxX - minX, maxY - minY, .01) * .12;
    lightCamera.left = minX - pad; lightCamera.right = maxX + pad;
    lightCamera.bottom = minY - pad; lightCamera.top = maxY + pad;
    lightCamera.near = .0001; lightCamera.far = far + pad + .01; lightCamera.updateProjectionMatrix();
    projectionMatrix.multiplyMatrices(lightCamera.projectionMatrix, lightCamera.matrixWorldInverse);
    viewToWorld.setFromMatrix4(lightCamera.matrixWorld);
    uniforms.lightDir.value.copy(direction);
    uniforms.planeNormal.value.copy(receiverNormal).normalize();
    uniforms.planeConstant.value = -uniforms.planeNormal.value.dot(receiverPoint);
    const material = Array.isArray(coverMesh.material) ? coverMesh.material[0] : coverMesh.material;
    uniforms.ior.value = Number.isFinite(material?.ior) && material.ior >= 1 ? material.ior : 1.5;
    proxy.geometry = coverMesh.geometry; proxy.matrix.copy(coverMesh.matrixWorld);
    const previous = {
      target: renderer.getRenderTarget(), face: renderer.getActiveCubeFace(), mip: renderer.getActiveMipmapLevel(),
      autoClear: renderer.autoClear, alpha: renderer.getClearAlpha(), scissorTest: renderer.getScissorTest(),
    };
    renderer.getClearColor(clearColor); renderer.getViewport(viewport); renderer.getScissor(scissor);
    try {
      renderer.autoClear = false; renderer.setScissorTest(false); renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(normalTarget); renderer.clear(); renderer.render(normalScene, lightCamera);
      renderer.setRenderTarget(target); renderer.clear(); renderer.render(fluxScene, lightCamera);
      updates++;
    } finally {
      renderer.setRenderTarget(previous.target, previous.face, previous.mip);
      renderer.setViewport(viewport); renderer.setScissor(scissor); renderer.setScissorTest(previous.scissorTest);
      renderer.setClearColor(clearColor, previous.alpha); renderer.autoClear = previous.autoClear;
    }
  }
  return {
    texture: target.texture, projectionMatrix, update,
    diagnostics: () => ({ method: 'Drei refraction footprint, receiver-hit rasterization', resolution, intensity, updates, ior: uniforms.ior.value,
      interfaces: 1, planarReceiver: true, whiteLight: true, occlusion: false, internalReflection: false, spectralCaustics: false }),
    dispose() {
      if (disposed) return; disposed = true;
      normalTarget.dispose(); target.dispose(); normalMaterial.dispose(); fluxMaterial.dispose(); fluxGeometry.dispose(); emptyGeometry.dispose();
      normalScene.remove(proxy); proxy.geometry = emptyGeometry;
    },
  };
}

// One no-GPU check: node path/to/lib/caustics.mjs. Browser imports never run this block.
if (typeof process !== 'undefined' && process.versions?.node && process.argv[1]) {
  const { pathToFileURL } = await import('node:url');
  if (pathToFileURL(process.argv[1]).href === import.meta.url) {
    const THREE = await import('../vendor/three/three.module.js');
    const { default: assert } = await import('node:assert/strict');
    const oldTarget = {}, color = new THREE.Color(0x123456), vp = new THREE.Vector4(3, 4, 50, 60), sc = new THREE.Vector4(5, 6, 70, 80);
    let currentTarget = oldTarget, alpha = .7, face = 2, mip = 3, scissorTest = true, fail = false;
    const renderer = {
      extensions: { has: () => true }, autoClear: true,
      getRenderTarget: () => currentTarget, getActiveCubeFace: () => face, getActiveMipmapLevel: () => mip,
      getClearAlpha: () => alpha, getClearColor: v => v.copy(color), getViewport: v => v.copy(vp), getScissor: v => v.copy(sc), getScissorTest: () => scissorTest,
      setRenderTarget: (t, f = 0, m = 0) => { currentTarget = t; face = f; mip = m; },
      setClearColor: (c, a) => { color.set(c); alpha = a; }, setViewport: v => vp.copy(v), setScissor: v => sc.copy(v), setScissorTest: v => { scissorTest = v; },
      clear() {}, render() { if (fail) throw new Error('forced render failure'); },
    };
    const originalColor = color.clone(), originalViewport = vp.clone(), originalScissor = sc.clone();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshPhysicalMaterial({ ior: 1.52 }));
    const parent = new THREE.Group(); parent.add(mesh); parent.position.set(2, 3, 0);
    const caustics = createCaustics(THREE, renderer);
    const args = [mesh, new THREE.Vector3(2, 3, 5), new THREE.Vector3(2, 3, -.5), new THREE.Vector3(0, 0, 1)];
    caustics.update(...args); assert.equal(caustics.diagnostics().updates, 1); assert.equal(caustics.diagnostics().ior, 1.52);
    assert.ok(caustics.projectionMatrix.elements.every(Number.isFinite)); assert.equal(mesh.parent, parent); assert.equal(mesh.visible, true);
    fail = true; assert.throws(() => caustics.update(...args), /forced render failure/);
    assert.equal(currentTarget, oldTarget); assert.equal(face, 2); assert.equal(mip, 3); assert.equal(alpha, .7); assert.equal(renderer.autoClear, true); assert.equal(scissorTest, true);
    assert.ok(color.equals(originalColor)); assert.ok(vp.equals(originalViewport)); assert.ok(sc.equals(originalScissor));
    caustics.dispose(); caustics.dispose(); assert.throws(() => caustics.update(...args), /disposed/);
    mesh.geometry.dispose(); mesh.material.dispose(); console.log('Caustics math/state check passed; GPU shader and visual checks remain required.');
  }
}
