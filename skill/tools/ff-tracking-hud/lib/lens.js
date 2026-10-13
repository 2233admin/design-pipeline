/* Tracking HUD lens: a camera filming the flat screen on a physical LED panel, in WebGL2.
 *
 * Port of `lens/shaders/lens.sksl` of mrsarac/ff-tracking at cc7f4e1 (MIT, Copyright (c) 2026
 * Mustafa Saraç). Order: tear -> perspective -> depth of field (with chromatic aberration) ->
 * palette -> bloom -> LED grid -> exposure, vignette, flicker, grain. The flat canvas of the
 * same frame is uploaded as the texture, so picture and tracker never drift apart. The texture is
 * sampled bilinearly, as fframes samples the flat video for the SkSL shader (Skia image shader,
 * FilterMode::Linear, no mipmaps, clamped): with nearest texels, each channel's tap on a thin
 * stroke at an LED-cell edge was all or nothing, so aberration coloured whole box sides. Every
 * per-frame value comes from the tracks module's shot(); every random value is a hash of the frame
 * index and pixel position, so a frame renders the same pixels on every seek.
 *
 * Effects work in logical output pixels (1920 x 1080); a higher devicePixelRatio (HyperFrames
 * --resolution landscape-4k) renders the same picture with more pixels.
 *
 *   const lens = FFTrackingLens.create(T, canvas);    // throws LensUnavailable without WebGL2
 *   lens.draw(shot, flatCanvas, { stage: 4 })
 */
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FFTrackingLens = api;
})(typeof self === "undefined" ? this : self, () => {
  const fl = (v) => {
    const s = String(Number(v));
    return /[.eE]/.test(s) ? s : `${s}.0`;
  };

  /** Fragment shader source for a config's lens section (sample counts are compile-time). */
  function fragmentSource(T) {
    const L = T.lens;
    return `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D iChannel0;
uniform vec2 uFlatSize;
uniform vec2 uRes;
uniform float uPixelRatio;
uniform float iTime;
uniform float uFrame;
uniform vec2 uAim;
uniform float uZoom;
uniform vec3 uRot;
uniform vec2 uFocus;
uniform float uBlur;
uniform vec3 uP0;
uniform vec3 uP1;
uniform vec3 uP2;
uniform vec3 uP3;
uniform vec3 uP4;
uniform float uLock;
uniform float uCut;
uniform float uSeed;
// 0 perspective, 1 + depth of field, 2 + palette and aberration, 3 + bloom and LED, 4 all.
uniform float uStage;
// 1 samples LED cell centres (the film); 0 samples exact positions (alignment self-test).
uniform float uQuantize;
out vec4 outColor;

const float FLAT_SCALE = ${fl(L.flatScale)};
const float LW = ${fl(T.W)};
const float LH = ${fl(T.H)};
const float FOCAL = ${fl(T.FOCAL)};
const float CELL = ${fl(L.cell)};
const int TAPS = ${L.taps};
const int GLOW_TAPS = ${L.glowTaps};

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 pal(float x) {
  float t = clamp(x, 0.0, 1.0) * 4.0;
  if (t < 1.0) { return mix(uP0, uP1, t); }
  if (t < 2.0) { return mix(uP1, uP2, t - 1.0); }
  if (t < 3.0) { return mix(uP2, uP3, t - 2.0); }
  return mix(uP3, uP4, t - 3.0);
}

// Flat screen at a logical position, bilinear like fframes' Skia sampling; black outside the screen.
vec3 screenAt(vec2 q) {
  if (q.x < 0.0 || q.y < 0.0 || q.x > LW || q.y > LH) { return vec3(0.0); }
  return texture(iChannel0, q * FLAT_SCALE / uFlatSize).rgb;
}

mat3 rotation() {
  float cx = cos(uRot.x); float sx = sin(uRot.x);
  float cy = cos(uRot.y); float sy = sin(uRot.y);
  float cz = cos(uRot.z); float sz = sin(uRot.z);
  mat3 rx = mat3(1.0, 0.0, 0.0,  0.0, cx, sx,  0.0, -sx, cx);
  mat3 ry = mat3(cy, 0.0, -sy,  0.0, 1.0, 0.0,  sy, 0.0, cy);
  mat3 rz = mat3(cz, sz, 0.0,  -sz, cz, 0.0,  0.0, 0.0, 1.0);
  return rz * ry * rx;
}

void main() {
  vec2 res = uRes;
  // Top-left origin in logical output pixels, like the SkSL coord.
  vec2 coord = vec2(gl_FragCoord.x, res.y * uPixelRatio - gl_FragCoord.y) / uPixelRatio;
  vec2 frameSeed = vec2(uSeed, uFrame);

  // Tear: on a lock and right after a cut, a few rows slide sideways.
  vec2 px = coord;
  float shake = uLock + uCut;
  if (shake > 0.0 && uStage >= 4.0) {
    float band = floor(coord.y / 16.0);
    float hn = hash(vec2(band, frameSeed.x * 3.7 + frameSeed.y));
    float hit = step(0.93 - 0.18 * shake, hn);
    px.x += hit * (hash(vec2(band, frameSeed.y + 9.0)) - 0.5) * 220.0 * shake;
  }

  // Perspective: a ray per pixel hits the tilted screen plane.
  vec2 s = (px - 0.5 * res) / res.y;
  vec3 d = vec3(s.x, s.y, FOCAL);
  mat3 R = rotation();
  vec3 eu = R * vec3(1.0, 0.0, 0.0);
  vec3 ev = R * vec3(0.0, 1.0, 0.0);
  vec3 n = R * vec3(0.0, 0.0, 1.0);
  vec3 p0 = vec3(0.0, 0.0, 1.0);
  float dn = dot(d, n);
  if (dn <= 0.0001) { outColor = vec4(pal(0.0), 1.0); return; }
  vec3 hit3 = d * (dot(p0, n) / dn);
  vec2 local = vec2(dot(hit3 - p0, eu), dot(hit3 - p0, ev));
  float K = FOCAL * LH / uZoom;
  vec2 base = uAim + local * K;
  float z = hit3.z;

  // Depth of field: circle of confusion from the depth difference to the tracked target.
  vec2 fl = (uFocus - uAim) / K;
  float zf = (p0 + eu * fl.x + ev * fl.y).z;
  float coc = clamp(uBlur * ${fl(L.dof)} * abs(1.0 - zf / z), 0.0, ${fl(L.dofMax)});
  float logPerPx = LH / (uZoom * res.y) * z;
  float rLog = coc * logPerPx * step(1.0, uStage);

  // Chromatic aberration grows toward the edges and on a lock.
  vec2 ca = step(2.0, uStage) * s * (${fl(L.aberration[0])} + ${fl(L.aberration[1])} * uLock + ${fl(L.aberration[2])} * uCut) * (LH / uZoom);

  float spin = hash(coord * 0.37 + frameSeed) * 6.2831;
  vec3 accG = vec3(0.0);
  float accR = 0.0;
  float accB = 0.0;
  float wsum = 0.0;
  for (int i = 0; i < TAPS; i++) {
    float fi = float(i);
    float a = fi * 2.39996323 + spin;
    float r = sqrt((fi + 0.5) / float(TAPS)) * rLog;
    vec2 q = base + vec2(cos(a), sin(a)) * r;
    // LED pixels: every tap reads the centre of its cell.
    vec2 qs = uQuantize > 0.5 ? (floor(q / CELL) + 0.5) * CELL : q;
    vec3 g = screenAt(qs);
    float w = 1.0 + 7.0 * g.g * g.g * g.g;
    accG += g * w;
    accR += screenAt(qs + ca).g * w;
    accB += screenAt(qs - ca).g * w;
    wsum += w;
  }
  accG /= wsum;
  accR /= wsum;
  accB /= wsum;

  // Red marks a locked box on the flat screen; it stays red in every palette.
  float red = clamp((accG.r - accG.g) * 1.4, 0.0, 1.0);
  vec3 col = vec3(pal(accR).r, pal(accG.g).g, pal(accB).b);
  if (uStage < 2.0) { col = accG; }
  col = mix(col, vec3(1.0, 0.13, 0.10), red);

  // Bloom: a wide ring of taps lifts everything around bright glyphs.
  float glowR = ${fl(L.bloom[0])} * logPerPx + rLog * 0.6;
  float glow = 0.0;
  float glowRed = 0.0;
  for (int j = 0; j < GLOW_TAPS; j++) {
    float fj = float(j);
    float a = fj * 2.39996323 + spin * 0.5;
    float r = sqrt((fj + 0.5) / float(GLOW_TAPS)) * glowR;
    vec3 g = screenAt(base + vec2(cos(a), sin(a)) * r);
    glow += g.g;
    glowRed += clamp(g.r - g.g, 0.0, 1.0);
  }
  glow /= float(GLOW_TAPS);
  glowRed /= float(GLOW_TAPS);
  float glowOn = step(3.0, uStage);
  col += pal(min(1.0, glow * ${fl(L.bloom[1])})) * glow * ${fl(L.bloom[2])} * glowOn;
  col += vec3(1.0, 0.1, 0.05) * glowRed * 0.9 * glowOn;

  // LED grid on the screen surface; it fades out of focus and where cells get too small.
  // Equal-area RGB stripes per cell (no tint on average) inside rounded LED rows.
  vec2 cu = fract(base / CELL) - 0.5;
  float u = cu.x + 0.5;
  vec3 sub = 0.5 + 0.5 * cos(6.2831853 * (vec3(u) - vec3(0.1667, 0.5, 0.8333)));
  float rowm = 1.0 - smoothstep(0.28, 0.5, abs(cu.y));
  float colm = 1.0 - smoothstep(0.36, 0.5, abs(cu.x));
  vec3 led = rowm * colm * (0.4 + 1.0 * sub);
  float cellPx = CELL / logPerPx;
  float ledAmt = (1.0 - smoothstep(0.8, 3.5, rLog / CELL)) * smoothstep(2.2, 4.5, cellPx);
  col *= mix(vec3(1.0), led * 1.3, ledAmt * 0.9 * glowOn);

  // Exposure kick on a cut, vignette, rolling flicker, grain. Upstream's final fade to black is
  // not ported: the film ends on its last shot's picture.
  float post = step(4.0, uStage);
  col = col * (1.0 + uCut * 1.1 * post) + uCut * 0.06 * post;
  vec2 v = s * vec2(0.85, 1.15);
  col *= 1.0 - ${fl(L.vignette)} * dot(v, v) * post;
  col *= 1.0 - post * (${fl(L.flicker)} - ${fl(L.flicker)} * sin(coord.y * 0.9 - iTime * 55.0));
  col += (hash(coord + frameSeed * 1.31) - 0.5) * ${fl(L.grain)} * post;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
  }

  const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

  class LensUnavailable extends Error {
    constructor(reason) {
      super(`tracking-hud lens: WebGL2 is unavailable (${reason}); no film can be rendered`);
      this.name = "LensUnavailable";
    }
  }

  function create(T, canvas, options = {}) {
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    if (!gl) throw new LensUnavailable("canvas.getContext('webgl2') returned null");
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new LensUnavailable(`shader compile failed: ${gl.getShaderInfoLog(shader)}`);
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource(T)));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new LensUnavailable(`program link failed: ${gl.getProgramInfoLog(program)}`);
    gl.useProgram(program);
    gl.bindVertexArray(gl.createVertexArray());
    const loc = {};
    for (const name of ["iChannel0", "uFlatSize", "uRes", "uPixelRatio", "iTime", "uFrame", "uAim", "uZoom", "uRot", "uFocus", "uBlur", "uP0", "uP1", "uP2", "uP3", "uP4", "uLock", "uCut", "uSeed", "uStage", "uQuantize"]) loc[name] = gl.getUniformLocation(program, name);

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    for (const [key, value] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, key, value);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    let textureSize = null;

    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = {
      vendor: info ? gl.getParameter(info.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
    };

    let pixelRatio = 0;
    function resize() {
      const ratio = options.pixelRatio || (typeof devicePixelRatio === "number" && devicePixelRatio > 0 ? devicePixelRatio : 1);
      if (ratio === pixelRatio) return;
      pixelRatio = ratio;
      canvas.width = Math.round(T.W * ratio);
      canvas.height = Math.round(T.H * ratio);
    }

    /** Films one frame: flat canvas -> texture -> shader, synchronously. */
    function draw(shot, flatCanvas, opts = {}) {
      if (gl.isContextLost()) throw new LensUnavailable("the WebGL2 context was lost");
      resize();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (!textureSize || textureSize[0] !== flatCanvas.width || textureSize[1] !== flatCanvas.height) {
        textureSize = [flatCanvas.width, flatCanvas.height];
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, flatCanvas.width, flatCanvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, flatCanvas);
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, flatCanvas);
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1i(loc.iChannel0, 0);
      gl.uniform2f(loc.uFlatSize, flatCanvas.width, flatCanvas.height);
      gl.uniform2f(loc.uRes, T.W, T.H);
      gl.uniform1f(loc.uPixelRatio, pixelRatio);
      gl.uniform1f(loc.iTime, shot.time);
      gl.uniform1f(loc.uFrame, shot.frame);
      gl.uniform2f(loc.uAim, shot.aim[0], shot.aim[1]);
      gl.uniform1f(loc.uZoom, shot.zoom);
      gl.uniform3f(loc.uRot, shot.tiltX, shot.tiltY, shot.roll);
      gl.uniform2f(loc.uFocus, shot.focus[0], shot.focus[1]);
      gl.uniform1f(loc.uBlur, shot.blur);
      shot.stops.forEach((c, i) => gl.uniform3f(loc[`uP${i}`], c[0], c[1], c[2]));
      gl.uniform1f(loc.uLock, shot.lock ? 1 : 0);
      gl.uniform1f(loc.uCut, shot.cut);
      gl.uniform1f(loc.uSeed, shot.seed);
      gl.uniform1f(loc.uStage, opts.stage ?? 4);
      gl.uniform1f(loc.uQuantize, opts.quantize === false ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /** RGBA rows of the current picture, top row first (self-test only). */
    function read() {
      const w = canvas.width;
      const h = canvas.height;
      const raw = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, raw);
      const out = new Uint8Array(raw.length);
      for (let y = 0; y < h; y += 1) out.set(raw.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      return { width: w, height: h, data: out };
    }

    resize();
    return { canvas, gl, renderer, draw, read, get pixelRatio() { return pixelRatio; } };
  }

  return { create, fragmentSource, LensUnavailable };
});
