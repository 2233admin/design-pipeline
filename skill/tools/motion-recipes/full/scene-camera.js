/* Original projected-world studies. No source code, assets or runtime dependencies are imported. */
(((root, factory) => {
  
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MotionSceneCamera = api;
})(typeof globalThis === 'undefined' ? this : globalThis, () => {
  

  var WIDTH = 960;
  var HEIGHT = 560;
  var VIEW = { x: 24, y: 20, width: 912, height: 340 };
  var NEAR_CLIP = 0.2;
  var DEG = Math.PI / 180;
  var recipes = {};
  var palette = { near: '#efb969', subject: '#72dcc1', far: '#9aaefa', ink: '#edf3f6' };
  var lens = { sensorWidthMm: number(24, 48), focalMm: number(18, 60) };
  var pose = Object.assign({}, lens, { cameraDistance: number(6, 12) });

  function number(min, max, integer) { return { min: min, max: max, integer: !!integer }; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function cubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; }
  function sine(t) { return (1 - Math.cos(Math.PI * t)) / 2; }
  function finiteProgress(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError('Camera study progress must be a finite number in [0, 1]');
    }
  }
  function different(a, b, label) {
    if (Math.abs(a - b) < 0.0001) throw new RangeError(label + ' requires distinct endpoints');
  }
  function validateConfig(id, schema, parameters, extra) {
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
      throw new TypeError(id + ': parameters must be an explicit object');
    }
    Object.keys(parameters).forEach((key) => {
      if (!Object.hasOwn(schema, key)) throw new TypeError(id + ': unsupported parameter ' + key);
    });
    Object.keys(schema).forEach((key) => {
      if (!Object.hasOwn(parameters, key)) throw new TypeError(id + ': missing parameter ' + key);
      var value = parameters[key];
      var rule = schema[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min || value > rule.max || (rule.integer && !Number.isInteger(value))) {
        throw new RangeError(id + ': ' + key + ' must be ' + (rule.integer ? 'an integer' : 'finite') + ' in [' + rule.min + ', ' + rule.max + ']');
      }
    });
    if (extra) extra(parameters);
  }
  function register(id, title, schema, branch, extra) {
    recipes[id] = {
      title: title,
      validate: (parameters) => { validateConfig(id, schema, parameters, extra); },
      create: (stage, parameters, options) => {
        validateConfig(id, schema, parameters, extra);
        if (!stage || !stage.ownerDocument || !stage.dataset) throw new TypeError(id + ': create requires a DOM stage');
        return branch === 'photo' ? createPhoto(stage, id, parameters, options || {}) : createProjected(stage, id, branch, parameters, options || {});
      }
    };
  }

  register('scene.camera-pan', '原点摇摄 / Yaw pan', Object.assign({}, pose, {
    yawStartDeg: number(-35, 35), yawEndDeg: number(-35, 35)
  }), 'pan', (p) => { different(p.yawStartDeg, p.yawEndDeg, 'Yaw pan'); });
  register('scene.camera-truck', '横向轨移 / Camera truck', Object.assign({}, pose, {
    xStart: number(-2.4, 2.4), xEnd: number(-2.4, 2.4)
  }), 'truck', (p) => { different(p.xStart, p.xEnd, 'Truck'); });
  register('scene.camera-pedestal', '垂直机位 / Pedestal', Object.assign({}, pose, {
    heightStart: number(0.7, 2.8), heightEnd: number(0.7, 2.8)
  }), 'pedestal', (p) => { different(p.heightStart, p.heightEnd, 'Pedestal'); });
  register('scene.camera-crane-arc', '吊臂弧升 / Jib arc', Object.assign({}, pose, {
    boomLength: number(2.5, 5.5), pivotHeight: number(0.2, 0.8), armStartDeg: number(8, 45), armEndDeg: number(8, 45)
  }), 'crane', (p) => { different(p.armStartDeg, p.armEndDeg, 'Jib arc'); });
  register('scene.camera-dolly', '定焦纵向轨移 / Constant-lens dolly', Object.assign({}, lens, {
    distanceStart: number(6, 12), distanceEnd: number(6, 12)
  }), 'dolly', (p) => { different(p.distanceStart, p.distanceEnd, 'Dolly'); });
  register('scene.camera-optical-zoom', '镜片焦距变化 / Optical zoom', {
    sensorWidthMm: number(24, 48), cameraDistance: number(6, 12), focalStartMm: number(18, 60), focalEndMm: number(18, 60)
  }, 'zoom', (p) => { different(p.focalStartMm, p.focalEndMm, 'Optical zoom'); });
  register('scene.camera-dolly-zoom', '主体定幅补偿 / Dolly zoom', {
    sensorWidthMm: number(24, 48), distanceStart: number(6, 12), distanceEnd: number(6, 12), referenceFocalMm: number(24, 55)
  }, 'vertigo', (p) => {
    different(p.distanceStart, p.distanceEnd, 'Dolly zoom');
    var endFocal = p.referenceFocalMm * p.distanceEnd / p.distanceStart;
    if (endFocal < 12 || endFocal > 90) throw new RangeError('Dolly zoom: compensated focal length must remain in [12, 90] mm');
  });
  register('scene.camera-orbit', '绕物取景 / Subject orbit', Object.assign({}, lens, {
    radius: number(6, 11), height: number(1.3, 2.8), angleStartDeg: number(-65, 65), angleEndDeg: number(-65, 65)
  }), 'orbit', (p) => { different(p.angleStartDeg, p.angleEndDeg, 'Orbit'); });
  register('scene.camera-follow-lookahead', '追随前望 / Analytic follow', Object.assign({}, pose, {
    pathSpan: number(3.5, 7), lookAhead: number(0.2, 1.5), lagFraction: number(0.05, 0.25)
  }), 'follow');
  register('scene.camera-handheld-drift', '低幅手持漂移 / Handheld drift', Object.assign({}, pose, {
    amplitudeWorld: number(0.025, 0.16), angularAmplitudeDeg: number(0.15, 1.5), cycles: number(0.6, 3)
  }), 'handheld');
  register('scene.camera-photo-crop', '静帧取景推进 / Ken Burns crop', {
    startZoom: number(1.1, 2), endZoom: number(1.1, 2), startCenterX: number(0, 1), startCenterY: number(0, 1), endCenterX: number(0, 1), endCenterY: number(0, 1)
  }, 'photo', (p) => {
    var fractionY = (1600 / 900) / (VIEW.width / VIEW.height);
    [[p.startZoom, p.startCenterX, p.startCenterY], [p.endZoom, p.endCenterX, p.endCenterY]].forEach((v) => {
      if (v[1] < 0.5 / v[0] || v[1] > 1 - 0.5 / v[0] || v[2] < fractionY / (2 * v[0]) || v[2] > 1 - fractionY / (2 * v[0])) {
        throw new RangeError('Ken Burns: authored crop must stay inside the original photograph plane');
      }
    });
    if (p.startZoom === p.endZoom && p.startCenterX === p.endCenterX && p.startCenterY === p.endCenterY) throw new RangeError('Ken Burns requires a changing crop');
  });
  register('scene.camera-depth-parallax', '三层透视视差 / Perspective parallax', Object.assign({}, pose, {
    depthGap: number(1.5, 3.6), travel: number(1.5, 3.8)
  }), 'parallax', (p) => {
    if (p.cameraDistance - p.depthGap < 2) throw new RangeError('Parallax: nearest authored layer must stay at least 2 world units from camera');
  });
  register('scene.camera-rack-focus', '分层焦点交接 / Depth-dependent rack focus', Object.assign({}, pose, {
    focusStart: number(3, 18), focusEnd: number(3, 18), apertureStrength: number(0.6, 4), blurLimitPx: number(4, 12)
  }), 'rack', (p) => { different(p.focusStart, p.focusEnd, 'Rack focus'); });
  register('scene.camera-optical-roll', '光轴倾转 / Optical-axis roll', Object.assign({}, pose, {
    rollStartDeg: number(-20, 20), rollEndDeg: number(-20, 20)
  }), 'roll', (p) => { different(p.rollStartDeg, p.rollEndDeg, 'Roll'); });
  register('scene.camera-hit-shake', '冲击机位衰减 / Damped hit shake', Object.assign({}, pose, {
    amplitudeWorld: number(0.03, 0.2), angularAmplitudeDeg: number(0.1, 2), oscillations: number(3, 9, true), decay: number(4, 12), hitAt: number(0.1, 0.35)
  }), 'shake');
  register('scene.camera-whip-exposure', '快速摇镜曝光 / Whip exposure', Object.assign({}, pose, {
    yawStartDeg: number(-32, 32), yawEndDeg: number(-32, 32), holdFraction: number(0.12, 0.3), shutterFraction: number(0.008, 0.05)
  }), 'whip', (p) => {
    if (Math.abs(p.yawEndDeg - p.yawStartDeg) < 24) throw new RangeError('Whip requires at least 24 degrees of yaw travel');
  });
  register('scene.camera-beat-lens-punch', '节拍焦距脉冲 / Beat lens punch', Object.assign({}, pose, {
    strength: number(0.08, 0.3), beatAt: number(0.15, 0.4), attackFraction: number(0.02, 0.07), decay: number(4, 12)
  }), 'punch');
  register('scene.perspective-coverflow', '透视选片扇列 / Perspective coverflow', Object.assign({}, pose, {
    count: number(3, 7, true), spacing: number(1.7, 2.5), tiltDeg: number(35, 65), recede: number(0.8, 1.8), selectionFrom: number(0, 6, true), selectionTo: number(0, 6, true), settleRate: number(4, 12)
  }), 'coverflow', (p) => {
    if (p.selectionFrom >= p.count || p.selectionTo >= p.count) throw new RangeError('Coverflow: selection indices must belong to count');
    different(p.selectionFrom, p.selectionTo, 'Coverflow');
  });
  register('scene.rigid-cube-projection', '六面刚体转动 / Rigid cube projection', Object.assign({}, pose, {
    size: number(1.5, 2.5), yawStartDeg: number(-60, 60), yawTurns: number(0.25, 2), pitchDeg: number(10, 32)
  }), 'cube');
  register('scene.perspective-depth-stack', '分离纵深层叠 / Perspective depth stack', Object.assign({}, pose, {
    count: number(3, 7, true), spacingStart: number(0.12, 0.5), spacingEnd: number(0.6, 1.2), offsetX: number(0.08, 0.25), viewAngleDeg: number(20, 42)
  }), 'depth');

  function mount(stage, id, channel, summary, text) {
    var doc = stage.ownerDocument;
    var figure = doc.createElement('figure');
    var canvas = doc.createElement('canvas');
    var caption = doc.createElement('figcaption');
    var readout = doc.createElement('div');
    figure.style.cssText = 'display:flex;flex-direction:column;gap:6px;width:100%;height:100%;min-height:0;margin:0;overflow:hidden';
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.cssText = 'display:block;flex:1 1 auto;min-height:0;min-width:0;width:100%;height:100%;object-fit:contain';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', summary);
    canvas.textContent = summary;
    caption.style.cssText = 'flex:0 0 auto;font:12px/1.5 system-ui,sans-serif;color:inherit';
    caption.textContent = summary + (typeof text === 'string' && text ? ' · ' + text : '');
    readout.style.cssText = 'font:11px/1.5 ui-monospace,monospace;overflow-wrap:anywhere';
    // Deliberately not a live region: playback must not flood assistive-technology announcements.
    caption.appendChild(readout);
    figure.appendChild(canvas);
    figure.appendChild(caption);
    figure.dataset.channel = channel;
    var context = canvas.getContext('2d');
    if (!context) throw new Error(id + ': Canvas 2D is required for this original study');
    stage.appendChild(figure);
    stage.dataset.recipe = id;
    return { doc: doc, root: figure, canvas: canvas, context: context, readout: readout };
  }

  function makePlane(label, color, width, height, cull) {
    return { label: label, color: color, width: width, height: height, cull: !!cull, vertices: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], center: [0, 0, 0], normal: [0, 0, -1] };
  }
  function setPlane(face, x, y, z, yaw) {
    var c = Math.cos(yaw), s = Math.sin(yaw);
    var corners = [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]];
    corners.forEach((corner, i) => {
      var localX = corner[0] * face.width;
      face.vertices[i][0] = x + localX * c;
      face.vertices[i][1] = y + corner[1] * face.height;
      face.vertices[i][2] = z - localX * s;
    });
    face.center[0] = x; face.center[1] = y; face.center[2] = z;
    face.normal[0] = -s; face.normal[1] = 0; face.normal[2] = -c;
  }
  function makeBox(width, height, depth, label) {
    var faces = [];
    var corners = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    var definitions = [
      { indices: [3, 2, 1, 0], normal: [0, 0, -1], color: '#72dcc1' },
      { indices: [2, 6, 5, 1], normal: [1, 0, 0], color: '#349e8c' },
      { indices: [7, 3, 0, 4], normal: [-1, 0, 0], color: '#9baaf8' },
      { indices: [6, 7, 4, 5], normal: [0, 0, 1], color: '#6977bf' },
      { indices: [7, 6, 2, 3], normal: [0, 1, 0], color: '#ecc37c' },
      { indices: [0, 1, 5, 4], normal: [0, -1, 0], color: '#85694d' }
    ];
    definitions.forEach((definition, i) => {
      var face = makePlane(label + (i ? ' ' + (i + 1) : ''), definition.color, width, height, true);
      face.local = definition.indices.map((index) => [corners[index][0] * width / 2, corners[index][1] * height / 2, corners[index][2] * depth / 2]);
      face.localNormal = definition.normal;
      faces.push(face);
    });
    return faces;
  }
  function rotatePoint(point, yaw, pitch) {
    var cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
    var py = point[1] * cp - point[2] * sp;
    var pz = point[1] * sp + point[2] * cp;
    return [point[0] * cy + pz * sy, py, -point[0] * sy + pz * cy];
  }
  function setBox(faces, x, y, z, yaw, pitch) {
    faces.forEach((face) => {
      face.local.forEach((vertex, i) => {
        var v = rotatePoint(vertex, yaw, pitch);
        face.vertices[i][0] = v[0] + x; face.vertices[i][1] = v[1] + y; face.vertices[i][2] = v[2] + z;
      });
      var n = rotatePoint(face.localNormal, yaw, pitch);
      face.normal[0] = n[0]; face.normal[1] = n[1]; face.normal[2] = n[2];
      face.center[0] = 0; face.center[1] = 0; face.center[2] = 0;
      face.vertices.forEach((v) => { face.center[0] += v[0] / 4; face.center[1] += v[1] / 4; face.center[2] += v[2] / 4; });
    });
  }
  function aimAt(camera, x, y, z) {
    var dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
    camera.yaw = Math.atan2(dx, dz);
    camera.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  }
  function basis(camera) {
    var sy = Math.sin(camera.yaw), cy = Math.cos(camera.yaw), sp = Math.sin(camera.pitch), cp = Math.cos(camera.pitch);
    return { right: [cy, 0, -sy], up: [-sy * sp, cp, -cy * sp], forward: [sy * cp, sp, cy * cp], cr: Math.cos(camera.roll), sr: Math.sin(camera.roll), focalPixels: VIEW.width * camera.focalMm / camera.sensorWidthMm };
  }
  function cameraPoint(point, camera, b) {
    var x = point[0] - camera.x, y = point[1] - camera.y, z = point[2] - camera.z;
    var rx = x * b.right[0] + y * b.right[1] + z * b.right[2];
    var uy = x * b.up[0] + y * b.up[1] + z * b.up[2];
    return [rx * b.cr + uy * b.sr, uy * b.cr - rx * b.sr, x * b.forward[0] + y * b.forward[1] + z * b.forward[2]];
  }
  function projectPoint(v, b) { return [VIEW.x + VIEW.width / 2 + b.focalPixels * v[0] / v[2], VIEW.y + VIEW.height / 2 - b.focalPixels * v[1] / v[2]]; }
  function clippedPolygon(vertices) {
    var output = [];
    for (var i = 0; i < vertices.length; i += 1) {
      var a = vertices[i], next = vertices[(i + 1) % vertices.length];
      var inA = a[2] >= NEAR_CLIP, inB = next[2] >= NEAR_CLIP;
      if (inA) output.push(a);
      if (inA !== inB) {
        var t = (NEAR_CLIP - a[2]) / (next[2] - a[2]);
        output.push([mix(a[0], next[0], t), mix(a[1], next[1], t), NEAR_CLIP]);
      }
    }
    return output;
  }
  function worldLine(context, a, next, camera, b, color) {
    var ca = cameraPoint(a, camera, b), cb = cameraPoint(next, camera, b);
    if (ca[2] < NEAR_CLIP && cb[2] < NEAR_CLIP) return;
    if (ca[2] < NEAR_CLIP || cb[2] < NEAR_CLIP) {
      var t = (NEAR_CLIP - ca[2]) / (cb[2] - ca[2]);
      var crossing = [mix(ca[0], cb[0], t), mix(ca[1], cb[1], t), NEAR_CLIP];
      if (ca[2] < NEAR_CLIP) ca = crossing; else cb = crossing;
    }
    var p1 = projectPoint(ca, b), p2 = projectPoint(cb, b);
    context.strokeStyle = color;
    context.beginPath(); context.moveTo(p1[0], p1[1]); context.lineTo(p2[0], p2[1]); context.stroke();
  }
  function defocus(distance, camera) {
    if (!camera.apertureStrength) return 0;
    return Math.min(camera.blurLimitPx, camera.apertureStrength * camera.focalMm * Math.abs(1 / Math.max(distance, NEAR_CLIP) - 1 / camera.focusDistance));
  }
  function paintFace(context, face, camera, b) {
    var toCamera = [camera.x - face.center[0], camera.y - face.center[1], camera.z - face.center[2]];
    if (face.cull && face.normal[0] * toCamera[0] + face.normal[1] * toCamera[1] + face.normal[2] * toCamera[2] <= 0) return;
    var points = clippedPolygon(face.vertices.map((v) => cameraPoint(v, camera, b)));
    if (points.length < 3) return;
    var projected = points.map((v) => projectPoint(v, b));
    var depth = cameraPoint(face.center, camera, b)[2];
    context.save();
    if (camera.apertureStrength) context.filter = 'blur(' + defocus(depth, camera).toFixed(2) + 'px)';
    context.fillStyle = face.color; context.strokeStyle = '#dfe9f699'; context.lineWidth = 1.3;
    context.beginPath();
    projected.forEach((p, i) => { if (i) context.lineTo(p[0], p[1]); else context.moveTo(p[0], p[1]); });
    context.closePath(); context.fill(); context.stroke();
    // Lines are projected in their own surface plane, not drawn as axis-aligned screen rectangles.
    var v0 = face.vertices[0], v1 = face.vertices[1], v3 = face.vertices[3];
    for (var stripe = 1; stripe <= 3; stripe += 1) {
      var fraction = stripe / 5;
      var left = [mix(v0[0], v3[0], fraction), mix(v0[1], v3[1], fraction), mix(v0[2], v3[2], fraction)];
      var right = [left[0] + (v1[0] - v0[0]) * 0.7, left[1] + (v1[1] - v0[1]) * 0.7, left[2] + (v1[2] - v0[2]) * 0.7];
      worldLine(context, left, right, camera, b, '#152b4099');
    }
    if (depth >= NEAR_CLIP) {
      var center = projectPoint(cameraPoint(face.center, camera, b), b);
      var fontSize = clamp(b.focalPixels / depth * 0.11, 9, 17);
      context.fillStyle = '#102433'; context.font = '600 ' + fontSize.toFixed(1) + 'px system-ui,sans-serif'; context.textAlign = 'center';
      context.fillText(face.label, center[0], center[1] + fontSize * 0.3);
    }
    context.restore();
  }
  function paintWorld(context, faces, camera) {
    var b = basis(camera);
    context.save();
    context.beginPath(); context.rect(VIEW.x, VIEW.y, VIEW.width, VIEW.height); context.clip();
    var gradient = context.createLinearGradient(0, VIEW.y, 0, VIEW.y + VIEW.height);
    gradient.addColorStop(0, '#162b43'); gradient.addColorStop(1, '#081724');
    context.fillStyle = gradient; context.fillRect(VIEW.x, VIEW.y, VIEW.width, VIEW.height);
    context.lineWidth = 0.8;
    for (var x = -14; x <= 14; x += 2) worldLine(context, [x, 0, -5], [x, 0, 20], camera, b, '#71889b44');
    for (var z = -4; z <= 20; z += 2) worldLine(context, [-14, 0, z], [14, 0, z], camera, b, '#71889b44');
    var sorted = faces.slice().sort((a, next) => cameraPoint(next.center, camera, b)[2] - cameraPoint(a.center, camera, b)[2]);
    sorted.forEach((face) => { paintFace(context, face, camera, b); });
    context.restore();
  }
  function paintText(context, text, x, y, color, size) {
    context.fillStyle = color || palette.ink; context.font = (size || 12) + 'px system-ui,sans-serif'; context.textAlign = 'left'; context.fillText(text, x, y);
  }
  function paintDiagram(context, camera, state, branch) {
    var box = { x: 24, y: 414, width: 400, height: 124 };
    context.fillStyle = '#152738'; context.fillRect(box.x, box.y, box.width, box.height);
    var side = branch === 'pedestal' || branch === 'crane';
    var project = (x, y, z) => side ? [box.x + 70 + (z + 10) * 12, box.y + 108 - y * 20] : [box.x + 200 + x * 15, box.y + 112 - (z + 12) * 5];
    paintText(context, side ? 'SIDE · camera Y / Z' : 'PLAN · camera X / Z', box.x + 10, box.y + 17, '#bacbd8', 11);
    state.markers.forEach((marker) => {
      var p = project(marker.point[0], marker.point[1], marker.point[2]);
      context.fillStyle = marker.color; context.fillRect(p[0] - 4, p[1] - 4, 8, 8); paintText(context, marker.label, p[0] + 7, p[1] + 4, marker.color, 11);
    });
    var cp = project(camera.x, camera.y, camera.z);
    var tip = project(camera.x + Math.sin(camera.yaw) * 3, camera.y + Math.sin(camera.pitch) * 3, camera.z + Math.cos(camera.yaw) * 3);
    context.strokeStyle = '#ffffff'; context.lineWidth = 1.5; context.beginPath(); context.moveTo(cp[0], cp[1]); context.lineTo(tip[0], tip[1]); context.stroke();
    if (!side) {
      var halfFov = Math.atan(camera.sensorWidthMm / (2 * camera.focalMm));
      [-halfFov, halfFov].forEach((offset) => {
        var end = project(camera.x + Math.sin(camera.yaw + offset) * 7, camera.y, camera.z + Math.cos(camera.yaw + offset) * 7);
        context.strokeStyle = '#edf3f655'; context.beginPath(); context.moveTo(cp[0], cp[1]); context.lineTo(end[0], end[1]); context.stroke();
      });
    }
    if (state.pivot) {
      var pivot = project(0, state.pivot[1], state.pivot[2]);
      context.strokeStyle = '#72dcc1'; context.lineWidth = 2.5; context.beginPath(); context.moveTo(pivot[0], pivot[1]); context.lineTo(cp[0], cp[1]); context.stroke();
      context.fillStyle = '#72dcc1'; context.fillRect(pivot[0] - 3, pivot[1] - 3, 6, 6);
    }
    context.fillStyle = '#ffffff'; context.beginPath(); context.arc(cp[0], cp[1], 4, 0, Math.PI * 2); context.fill();
    paintText(context, 'C', cp[0] + 7, cp[1] + 4, '#ffffff', 11);
  }
  function paintDiagnostics(context, camera, state, branch, reduced) {
    var b = basis(camera);
    var nearDistance = Math.max(NEAR_CLIP, cameraPoint(state.markers[0].point, camera, b)[2]);
    var subjectDistance = Math.max(NEAR_CLIP, cameraPoint(state.markers[1].point, camera, b)[2]);
    var farDistance = Math.max(NEAR_CLIP, cameraPoint(state.markers[2].point, camera, b)[2]);
    var markerNames = state.markers.map((marker) => marker.label).join(' / ');
    context.strokeStyle = '#7297ac'; context.lineWidth = 1; context.strokeRect(VIEW.x, VIEW.y, VIEW.width, VIEW.height);
    paintText(context, state.legend + '  |  world → camera → sensor', 24, 384, '#b7c9d9', 13);
    paintText(context, reduced ? 'REDUCED · static meaningful frame' : state.note, 24, 405, '#edf3f6', 12);
    paintDiagram(context, camera, state, branch);
    paintText(context, 'f = ' + camera.focalMm.toFixed(2) + ' mm  /  sensor = ' + camera.sensorWidthMm.toFixed(1) + ' mm', 448, 432, '#edf3f6', 13);
    paintText(context, 'Depth ' + markerNames + ': ' + nearDistance.toFixed(2) + ' / ' + subjectDistance.toFixed(2) + ' / ' + farDistance.toFixed(2), 448, 453, '#bacbd8', 12);
    paintText(context, 'px / world unit: ' + (b.focalPixels / nearDistance).toFixed(1) + ' / ' + (b.focalPixels / subjectDistance).toFixed(1) + ' / ' + (b.focalPixels / farDistance).toFixed(1), 448, 474, '#bacbd8', 12);
    if (branch === 'rack') {
      paintText(context, 'focus = ' + camera.focusDistance.toFixed(2) + '  blur N / S / F: ' + defocus(nearDistance, camera).toFixed(1) + ' / ' + defocus(subjectDistance, camera).toFixed(1) + ' / ' + defocus(farDistance, camera).toFixed(1) + ' px', 448, 495, '#bacbd8', 11);
    } else if (branch === 'vertigo') {
      paintText(context, 'Subject f / depth = ' + (camera.focalMm / subjectDistance).toFixed(3) + ' · compensated', 448, 495, palette.subject, 12);
    } else {
      paintText(context, 'Subjects and lens are independent authored variables.', 448, 495, '#bacbd8', 11);
    }
    paintText(context, 'x/y/z: ' + camera.x.toFixed(2) + ' / ' + camera.y.toFixed(2) + ' / ' + camera.z.toFixed(2) + '   yaw/pitch/roll: ' + (camera.yaw / DEG).toFixed(1) + ' / ' + (camera.pitch / DEG).toFixed(1) + ' / ' + (camera.roll / DEG).toFixed(1) + '°', 448, 519, '#bacbd8', 11);
    return 'C(' + camera.x.toFixed(2) + ',' + camera.y.toFixed(2) + ',' + camera.z.toFixed(2) + ') · focal ' + camera.focalMm.toFixed(2) + 'mm · ' + markerNames + ' depth ' + nearDistance.toFixed(2) + '/' + subjectDistance.toFixed(2) + '/' + farDistance.toFixed(2);
  }
  function whipYaw(q, p) {
    var t = clamp((q - p.holdFraction) / (1 - 2 * p.holdFraction), 0, 1);
    var e = t * t * t * (10 + t * (-15 + 6 * t));
    return mix(p.yawStartDeg, p.yawEndDeg, e) * DEG;
  }
  function frameAt(branch, p, q, seed, reduced, faces, subjectFaces) {
    var camera = { x: 0, y: 1.4, z: -(p.cameraDistance || p.distanceStart || p.radius), yaw: 0, pitch: 0, roll: 0, focalMm: p.focalMm || p.focalStartMm || p.referenceFocalMm, sensorWidthMm: p.sensorWidthMm, focusDistance: 8, apertureStrength: 0, blurLimitPx: 0 };
    var state = { nearZ: -2.6, farZ: 6, subjectX: 0, note: '', pivot: null };
    var e = cubic(q);
    if (branch === 'pan') {
      camera.yaw = mix(p.yawStartDeg, p.yawEndDeg, sine(q)) * DEG;
      state.note = 'PAN · camera position fixed; yaw changes the sightline.';
    } else if (branch === 'truck') {
      camera.x = mix(p.xStart, p.xEnd, sine(q));
      state.note = 'TRUCK · orientation and focal length fixed; near layers travel farther.';
    } else if (branch === 'pedestal') {
      camera.y = mix(p.heightStart, p.heightEnd, sine(q));
      state.note = 'PEDESTAL · vertical translation only; no pitch compensation.';
    } else if (branch === 'crane') {
      var arm = mix(p.armStartDeg, p.armEndDeg, e) * DEG;
      var pivotZ = -p.cameraDistance - p.boomLength * Math.cos(p.armStartDeg * DEG);
      camera.y = p.pivotHeight + p.boomLength * Math.sin(arm);
      camera.z = pivotZ + p.boomLength * Math.cos(arm);
      aimAt(camera, 0, 1.4, 0);
      state.pivot = [0, p.pivotHeight, pivotZ];
      state.note = 'CRANE · rigid jib pivot changes Y and Z together; aim remains on subject.';
    } else if (branch === 'dolly') {
      camera.z = -mix(p.distanceStart, p.distanceEnd, e);
      state.note = 'DOLLY · focal length fixed; near/far perspective ratios change.';
    } else if (branch === 'zoom') {
      camera.focalMm = mix(p.focalStartMm, p.focalEndMm, e);
      state.note = 'OPTICAL ZOOM · position fixed; all depth magnifications share one lens multiplier.';
    } else if (branch === 'vertigo') {
      var distance = mix(p.distanceStart, p.distanceEnd, e);
      camera.z = -distance;
      camera.focalMm = p.referenceFocalMm * distance / p.distanceStart;
      state.note = 'DOLLY ZOOM · front subject surface at Z=0 retains f / distance.';
    } else if (branch === 'orbit') {
      var angle = mix(p.angleStartDeg, p.angleEndDeg, q) * DEG;
      camera.x = Math.sin(angle) * p.radius; camera.z = 0.6 - Math.cos(angle) * p.radius; camera.y = p.height;
      aimAt(camera, 0, 1.4, 0.6);
      state.note = 'ORBIT · camera circles the rigid subject; visible faces and occlusion change.';
    } else if (branch === 'follow') {
      state.subjectX = -p.pathSpan / 2 + p.pathSpan * q;
      var tau = p.lagFraction;
      var response = Math.exp(-q / tau);
      camera.x = -p.pathSpan / 2 + p.pathSpan * (q - tau + tau * response) + p.lookAhead * (1 - response);
      state.note = 'FOLLOW · subject moves independently; analytic lag tracks its velocity + lookahead.';
    } else if (branch === 'handheld') {
      var phase = (Math.abs(seed) % 997) / 997 * Math.PI * 2;
      var t = q * p.cycles * Math.PI * 2;
      camera.x = p.amplitudeWorld * ((Math.sin(t + phase) - Math.sin(phase)) + 0.35 * (Math.sin(2.3 * t + 2 * phase) - Math.sin(2 * phase)));
      camera.y += p.amplitudeWorld * 0.55 * (Math.sin(1.7 * t + phase) - Math.sin(phase));
      camera.yaw = p.angularAmplitudeDeg * DEG * (Math.sin(0.7 * t + phase) - Math.sin(phase));
      state.note = 'HANDHELD · bounded continuous pose noise, derived from time and seed.';
    } else if (branch === 'parallax') {
      state.nearZ = -p.depthGap; state.farZ = 2 * p.depthGap;
      camera.x = mix(-p.travel / 2, p.travel / 2, q);
      state.note = 'PARALLAX · three world-depth bands; translation is divided by each actual depth.';
    } else if (branch === 'rack') {
      camera.focusDistance = mix(p.focusStart, p.focusEnd, smooth(q));
      camera.apertureStrength = reduced ? 0 : p.apertureStrength; camera.blurLimitPx = p.blurLimitPx;
      state.note = reduced ? 'RACK · all depth labels readable; static final focus information.' : 'RACK · pose and focal length fixed; each plane receives distance-dependent defocus.';
    } else if (branch === 'roll') {
      camera.roll = mix(p.rollStartDeg, p.rollEndDeg, 1 - (1 - q) ** 3) * DEG;
      state.note = 'ROLL · optical-axis rotation; no world translation or yaw.';
    } else if (branch === 'shake') {
      var hit = q <= p.hitAt ? 0 : (q - p.hitAt) / (1 - p.hitAt);
      var envelope = q === 1 ? 0 : Math.exp(-p.decay * hit);
      camera.x = p.amplitudeWorld * envelope * Math.sin(2 * Math.PI * p.oscillations * hit);
      camera.y += 0.6 * p.amplitudeWorld * envelope * Math.sin(2 * Math.PI * (p.oscillations + 2) * hit);
      camera.yaw = p.angularAmplitudeDeg * DEG * envelope * Math.sin(2 * Math.PI * (p.oscillations + 1) * hit);
      state.note = 'HIT · one bounded damped pose response; damage state is not owned here.';
    } else if (branch === 'whip') {
      camera.yaw = whipYaw(q, p);
      state.note = 'WHIP · rapid yaw plus finite shutter samples, not a uniform screen blur.';
    } else if (branch === 'punch') {
      var pulse = 0;
      if (q > p.beatAt && q <= p.beatAt + p.attackFraction) pulse = sine((q - p.beatAt) / p.attackFraction);
      else if (q > p.beatAt + p.attackFraction) {
        var tail = (q - p.beatAt - p.attackFraction) / (1 - p.beatAt - p.attackFraction);
        pulse = (Math.exp(-p.decay * tail) - Math.exp(-p.decay)) / (1 - Math.exp(-p.decay));
      }
      camera.focalMm = p.focalMm * (1 + p.strength * pulse);
      state.note = 'BEAT · one lens impulse with attack and finite decay; no repeating emphasis.';
    } else if (branch === 'coverflow') {
      var rate = p.settleRate;
      var responseEnd = 1 - (1 + rate) * Math.exp(-rate);
      var settle = (1 - (1 + rate * q) * Math.exp(-rate * q)) / responseEnd;
      var selection = mix(p.selectionFrom, p.selectionTo, settle);
      faces.forEach((face, i) => {
        var delta = i - selection;
        setPlane(face, delta * p.spacing, 1.4, Math.abs(delta) * p.recede, -clamp(delta, -1, 1) * p.tiltDeg * DEG);
      });
      state.note = 'COVERFLOW · separate rotated planes recede around selected index ' + selection.toFixed(2) + '.';
    } else if (branch === 'cube') {
      setBox(faces, 0, 1.4, 0, (p.yawStartDeg + q * p.yawTurns * 360) * DEG, p.pitchDeg * DEG);
      state.note = 'CUBE · six rigid faces; back-face rejection and perspective occlusion.';
    } else if (branch === 'depth') {
      var spacing = mix(p.spacingStart, p.spacingEnd, smooth(q));
      camera.x = -Math.sin(p.viewAngleDeg * DEG) * p.cameraDistance; camera.z = -Math.cos(p.viewAngleDeg * DEG) * p.cameraDistance;
      aimAt(camera, 0, 1.4, 1.2);
      faces.forEach((face, i) => { setPlane(face, i * p.offsetX, 1.4, i * spacing, 0); });
      state.farZ = (p.count - 1) * spacing;
      state.note = 'DEPTH STACK · authored Z separation = ' + spacing.toFixed(2) + '; oblique view reveals planes.';
    } else {
      throw new Error('Unsupported authored camera branch: ' + branch);
    }
    if (subjectFaces) setBox(subjectFaces, state.subjectX, 1.4, 0.6, 0, 0);
    if (branch === 'parallax') {
      faces.forEach((face) => {
        if (face.band === 'near') setPlane(face, face.worldX, face.worldY, state.nearZ, 0);
        else if (face.band === 'far') setPlane(face, face.worldX, face.worldY, state.farZ, 0);
      });
    }
    if (branch === 'coverflow' || branch === 'cube' || branch === 'depth') {
      var cameraBasis = basis(camera);
      var depthOrder = faces.slice().sort((a, next) => cameraPoint(a.center, camera, cameraBasis)[2] - cameraPoint(next.center, camera, cameraBasis)[2]);
      state.markers = [depthOrder[0], depthOrder[Math.floor(depthOrder.length / 2)], depthOrder[depthOrder.length - 1]].map((face, i) => ({
        point: face.center, label: ['N', 'M', 'F'][i], color: [palette.near, palette.subject, palette.far][i]
      }));
      state.legend = 'N 近面 · M 中面 · F 远面（实际表面中心）';
    } else {
      state.markers = [
        { point: [-1.75, 1.2, state.nearZ], label: 'N', color: palette.near },
        { point: [state.subjectX, 1.4, 0], label: 'S', color: palette.subject },
        { point: [2.8, 1.2, state.farZ], label: 'F', color: palette.far }
      ];
      state.legend = 'N 近景 · S 主体 · F 远景';
    }
    return { camera: camera, state: state };
  }

  function createProjected(stage, id, branch, p, options) {
    var reduced = options.reducedMotion === true;
    var seed = typeof options.seed === 'number' && Number.isFinite(options.seed) ? options.seed : 1;
    var ui = mount(stage, id, 'canvas-perspective', '原创透视研究：近景 N、主体 S、远景 F；镜头位置、方向与焦距分别建模。', options.text);
    if (branch === 'rack' && !reduced && !('filter' in ui.context)) {
      ui.root.remove();
      if (stage.dataset.recipe === id) delete stage.dataset.recipe;
      throw new Error(id + ': depth-dependent rack focus requires Canvas 2D filter support; it cannot be replaced by an unblurred no-op');
    }
    var faces = [], subjectFaces = null;
    if (branch === 'coverflow') {
      for (var c = 0; c < p.count; c += 1) faces.push(makePlane('片 ' + (c + 1), c % 2 ? '#9aaefa' : '#72dcc1', 1.6, 2.1, false));
    } else if (branch === 'cube') {
      faces = makeBox(p.size, p.size, p.size, '面');
    } else if (branch === 'depth') {
      for (var d = 0; d < p.count; d += 1) faces.push(makePlane('层 ' + (d + 1), ['#72dcc1', '#efb969', '#9aaefa'][d % 3], 1.9, 2.15, false));
    } else {
      subjectFaces = makeBox(1.7, 1.8, 1.2, 'S 主体');
      faces = faces.concat(subjectFaces);
      var near = makePlane('N 近景', palette.near, 1.4, 1.6, false); setPlane(near, -1.75, 1.2, -2.6, 0); faces.push(near);
      var far = makePlane('F 远景', palette.far, 1.4, 1.6, false); setPlane(far, 2.8, 1.2, 6, 0); faces.push(far);
      if (branch === 'parallax') {
        near.band = 'near'; near.worldX = -1.75; near.worldY = 1.2;
        far.band = 'far'; far.worldX = 2.8; far.worldY = 1.2;
        for (var band = 0; band < 3; band += 1) {
          for (var column = 0; column < 4; column += 1) {
            var face = makePlane(['N', 'S', 'F'][band], ['#bf965b', '#5aaf9d', '#788bc4'][band], 0.55, 0.7 + column * 0.16, false);
            face.worldX = -5.8 + column * 3.7 + band * 0.45; face.worldY = face.height / 2; face.band = ['near', 'middle', 'far'][band];
            setPlane(face, face.worldX, face.worldY, band === 0 ? -p.depthGap : band === 2 ? 2 * p.depthGap : 0, 0); faces.push(face);
          }
        }
      }
    }
    var exposureCanvas = null, exposureContext = null;
    if (branch === 'whip' && !reduced) {
      exposureCanvas = ui.doc.createElement('canvas'); exposureCanvas.width = WIDTH; exposureCanvas.height = HEIGHT; exposureContext = exposureCanvas.getContext('2d');
      if (!exposureContext) { ui.root.remove(); if (stage.dataset.recipe === id) delete stage.dataset.recipe; throw new Error(id + ': finite shutter exposure requires Canvas 2D'); }
    }
    var disposed = false;
    function seek(progress) {
      finiteProgress(progress);
      if (disposed) throw new Error(id + ': study has been disposed');
      // Reduced geometry never changes during playback. Transient camera impulses use the neutral pose.
      var q = reduced ? ((branch === 'shake' || branch === 'handheld' || branch === 'punch') ? 0 : 1) : progress;
      var frame = frameAt(branch, p, q, seed, reduced, faces, subjectFaces);
      var context = ui.context;
      context.clearRect(0, 0, WIDTH, HEIGHT); context.fillStyle = '#091521'; context.fillRect(0, 0, WIDTH, HEIGHT);
      if (exposureContext) {
        for (var sample = 0; sample < 5; sample += 1) {
          var sampledCamera = Object.assign({}, frame.camera, { yaw: whipYaw(clamp(q + (sample / 4 - 0.5) * p.shutterFraction, 0, 1), p) });
          exposureContext.clearRect(0, 0, WIDTH, HEIGHT); paintWorld(exposureContext, faces, sampledCamera);
          context.save(); context.globalAlpha = 1 / (sample + 1); context.drawImage(exposureCanvas, 0, 0); context.restore();
        }
      } else paintWorld(context, faces, frame.camera);
      ui.readout.textContent = paintDiagnostics(context, frame.camera, frame.state, branch, reduced);
    }
    seek(0);
    return {
      seek: seek,
      dispose: () => {
        if (disposed) return;
        disposed = true; ui.root.remove(); ui.canvas.width = 0; ui.canvas.height = 0;
        if (exposureCanvas) { exposureCanvas.width = 0; exposureCanvas.height = 0; exposureCanvas = null; exposureContext = null; }
        faces.length = 0;
        if (stage.dataset.recipe === id) delete stage.dataset.recipe;
      }
    };
  }

  function paintOriginalPhoto(context) {
    var gradient = context.createLinearGradient(0, 0, 0, 900);
    gradient.addColorStop(0, '#183657'); gradient.addColorStop(0.62, '#719eb0'); gradient.addColorStop(1, '#d9ba91');
    context.fillStyle = gradient; context.fillRect(0, 0, 1600, 900);
    context.fillStyle = '#edcc8b'; context.beginPath(); context.arc(1150, 245, 75, 0, Math.PI * 2); context.fill();
    [[0.36, '#55788e'], [0.61, '#344f65'], [0.9, '#183144']].forEach((layer, i) => {
      context.fillStyle = layer[1]; context.beginPath(); context.moveTo(0, 900);
      for (var x = 0; x <= 1600; x += 40) {
        var y = 900 * layer[0] + 55 * Math.sin(x / (170 + i * 45)) + 30 * Math.sin(x / (65 + i * 20));
        context.lineTo(x, y);
      }
      context.lineTo(1600, 900); context.closePath(); context.fill();
    });
    context.fillStyle = '#ecdbb1'; context.fillRect(780, 466, 28, 62); context.fillStyle = '#1e3442'; context.fillRect(794, 469, 4, 59);
    context.strokeStyle = '#a9d0cf'; context.lineWidth = 4;
    context.beginPath(); context.moveTo(730, 620); context.bezierCurveTo(950, 570, 790, 800, 1160, 900); context.stroke();
  }
  function createPhoto(stage, id, p, options) {
    var reduced = options.reducedMotion === true;
    var ui = mount(stage, id, 'canvas-image-crop', '原创静帧取景研究：移动单张画面的裁切窗口；不是改变三维机位。', options.text);
    var photo = ui.doc.createElement('canvas'); photo.width = 1600; photo.height = 900;
    var photoContext = photo.getContext('2d');
    if (!photoContext) { ui.root.remove(); if (stage.dataset.recipe === id) delete stage.dataset.recipe; throw new Error(id + ': Canvas 2D is required for the original photo plane'); }
    paintOriginalPhoto(photoContext);
    var disposed = false;
    function seek(progress) {
      finiteProgress(progress);
      if (disposed) throw new Error(id + ': study has been disposed');
      var q = reduced ? 1 : progress;
      var zoom = p.startZoom * (p.endZoom / p.startZoom) ** q;
      var centerX = mix(p.startCenterX, p.endCenterX, q), centerY = mix(p.startCenterY, p.endCenterY, q);
      var cropWidth = 1600 / zoom, cropHeight = cropWidth * VIEW.height / VIEW.width;
      var x = centerX * 1600 - cropWidth / 2, y = centerY * 900 - cropHeight / 2;
      var context = ui.context;
      context.clearRect(0, 0, WIDTH, HEIGHT); context.fillStyle = '#091521'; context.fillRect(0, 0, WIDTH, HEIGHT);
      context.drawImage(photo, x, y, cropWidth, cropHeight, VIEW.x, VIEW.y, VIEW.width, VIEW.height);
      context.strokeStyle = '#edf3f6'; context.lineWidth = 1; context.strokeRect(VIEW.x, VIEW.y, VIEW.width, VIEW.height);
      paintText(context, reduced ? 'REDUCED · final static crop' : 'KEN BURNS · authored pan + logarithmic crop zoom on one original image plane', 24, 389, '#edf3f6', 13);
      context.drawImage(photo, 24, 414, 224, 126);
      context.strokeStyle = '#ffffff'; context.lineWidth = 2; context.strokeRect(24 + x * 0.14, 414 + y * 0.14, cropWidth * 0.14, cropHeight * 0.14);
      paintText(context, 'Single plane · near/far perspective unchanged', 280, 435, '#bacbd8', 13);
      paintText(context, 'crop zoom: ' + zoom.toFixed(3) + '   center: ' + centerX.toFixed(3) + ' / ' + centerY.toFixed(3), 280, 459, '#bacbd8', 12);
      paintText(context, 'No invented 3D camera or hidden source-image fetch.', 280, 483, '#bacbd8', 12);
      ui.readout.textContent = 'Single image crop (' + x.toFixed(1) + ', ' + y.toFixed(1) + ', ' + cropWidth.toFixed(1) + ', ' + cropHeight.toFixed(1) + ') · zoom ' + zoom.toFixed(3);
    }
    seek(0);
    return {
      seek: seek,
      dispose: () => {
        if (disposed) return;
        disposed = true; ui.root.remove(); ui.canvas.width = 0; ui.canvas.height = 0; photo.width = 0; photo.height = 0;
        if (stage.dataset.recipe === id) delete stage.dataset.recipe;
      }
    };
  }

  return { recipes: recipes };
}));
