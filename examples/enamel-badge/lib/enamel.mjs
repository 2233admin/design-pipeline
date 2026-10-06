// Three.js WebGL material. No render loop, clock, reference pixels or dependency ownership.
// ponytail: procedural glaze/foil approximation; measured BRDF and microgeometry if exact fit matters.
export function createEnamelMaterial(THREE, {
  color = 0x087bd3, roughness = 0.22, clearcoat = 1, iridescence = 0,
  relief = 0.012, flakes = 0, scale = 8, seed = 7,
} = {}) {
  const material = new THREE.MeshPhysicalMaterial({
    color, metalness: flakes ? 0.65 : 0, roughness, clearcoat,
    clearcoatRoughness: 0.09, ior: 1.52, iridescence,
    iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 520],
  });
  const uniforms = {
    enamelRelief: { value: relief }, enamelFlakes: { value: flakes },
    enamelScale: { value: scale }, enamelSeed: { value: seed },
  };
  material.userData.enamel = { uniforms, compiled: false };
  material.customProgramCacheKey = () => "design-pipeline-enamel-v1";
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 enamelPosition;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nenamelPosition = position;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `
      #include <common>
      varying vec3 enamelPosition;
      uniform float enamelRelief;
      uniform float enamelFlakes;
      uniform float enamelScale;
      uniform float enamelSeed;
      vec2 enamelHash(vec2 p) {
        return fract(sin(vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)))
          + enamelSeed) * 43758.5453);
      }
      float enamelNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p), u = f*f*(3.0-2.0*f);
        return mix(mix(enamelHash(i).x, enamelHash(i+vec2(1,0)).x, u.x),
          mix(enamelHash(i+vec2(0,1)).x, enamelHash(i+vec2(1,1)).x, u.x), u.y);
      }
      vec2 enamelCell(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        float nearest = 8.0, second = 8.0, id = 0.0;
        for (int y=-1; y<=1; y++) for (int x=-1; x<=1; x++) {
          vec2 g=vec2(float(x),float(y)), h=enamelHash(i+g);
          float d=length(g + 0.2 + 0.6*h - f);
          if (d<nearest) { second=nearest; nearest=d; id=h.x; }
          else if (d<second) second=d;
        }
        return vec2(second-nearest, id);
      }
      float enamelHeight(vec2 p) {
        float n=enamelNoise(p*3.0)*0.55 + enamelNoise(p*7.0)*0.3 + enamelNoise(p*17.0)*0.15;
        return n + sin(p.x*5.0+n*7.0)*sin(p.y*4.0-n*6.0)*0.2;
      }
    `).replace("#include <color_fragment>", `
      #include <color_fragment>
      vec2 enamelUV = enamelPosition.xy * enamelScale;
      vec2 cell = enamelCell(enamelUV);
      float reliefColor = enamelHeight(enamelUV * 0.35);
      // Cellular hue is object-locked. Physical iridescence below responds to view and light.
      vec3 foil = 0.38 + 0.25*cos(6.2831853*(cell.y+vec3(0.02,0.35,0.67)));
      float boundary = smoothstep(0.008,0.055,cell.x);
      diffuseColor.rgb *= mix(0.52,1.45,reliefColor);
      diffuseColor.rgb = mix(diffuseColor.rgb, foil*mix(0.65,1.0,boundary), enamelFlakes);
    `).replace("#include <normal_fragment_maps>", `
      #include <normal_fragment_maps>
      float h = enamelHeight(enamelUV * 0.35) * enamelRelief;
      vec3 qx = dFdx(vViewPosition), qy = dFdy(vViewPosition);
      vec3 rx = cross(qy,normal), ry = cross(normal,qx);
      float determinant = dot(qx,rx);
      normal = normalize(abs(determinant)*normal + sign(determinant)*(dFdx(h)*rx + dFdy(h)*ry));
    `);
    material.userData.enamel.compiled = true;
  };
  return material;
}
