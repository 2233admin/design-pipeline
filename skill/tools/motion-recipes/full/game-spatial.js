/* Original spatial UI studies. No upstream code, assets, runtime or audio. */
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.MotionGameParts = root.MotionGameParts || {};
    root.MotionGameParts.spatial = api;
  }
})(typeof globalThis === "undefined" ? this : globalThis, () => {
  

  const NS = "http://www.w3.org/2000/svg";
  const WIDTH = 760, HEIGHT = 400, CX = WIDTH / 2, CY = HEIGHT / 2;
  const DEG = Math.PI / 180;
  let instance = 0;
  const recipes = {};
  const colors = ["#366583", "#435f92", "#59778b", "#536987", "#426b70", "#765f8d"];
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (v) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
  const phase = (t, start, end) => smooth((t - start) / (end - start));
  const point = (x, y, z) => [x, y, z];
  const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  function number(value, name, min, max, integer) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      throw new TypeError(`${name} must be ${integer ? "an integer" : "finite"} in [${min}, ${max}]`);
    }
  }

  function validate(p, schema, extra) {
    if (!p || typeof p !== "object" || Array.isArray(p)) throw new TypeError("parameters must be an object");
    for (const key of Reflect.ownKeys(p)) {
      if (typeof key !== "string" || !Object.hasOwn(schema, key)) throw new TypeError(`Unsupported spatial parameter: ${String(key)}`);
    }
    for (const key of Object.keys(schema)) {
      if (!Object.hasOwn(p, key)) throw new TypeError(`Missing spatial parameter: ${key}`);
      const rule = schema[key];
      if (Array.isArray(rule)) number(p[key], key, rule[0], rule[1], rule[2]);
      else if (!rule.values.includes(p[key])) throw new TypeError(`${key} must be one of ${rule.values.join(", ")}`);
    }
    if (extra) extra(p);
  }

  function selection(p, count) {
    if (p.selection >= count) throw new RangeError(`selection must identify one of ${count} authored targets`);
  }

  function rotate(a, rx = 0, ry = 0, rz = 0) {
    const sx = Math.sin(rx * DEG), cx = Math.cos(rx * DEG);
    const sy = Math.sin(ry * DEG), cy = Math.cos(ry * DEG);
    const sz = Math.sin(rz * DEG), cz = Math.cos(rz * DEG);
    const y = a[1] * cx - a[2] * sx, z = a[1] * sx + a[2] * cx;
    const x = a[0] * cy + z * sy, zz = -a[0] * sy + z * cy;
    return [x * cz - y * sz, x * sz + y * cz, zz];
  }

  function translate(a, x, y, z) { return [a[0] + x, a[1] + y, a[2] + z]; }

  function plane(x, y, z, width, height, rx = 0, ry = 0, rz = 0) {
    return [[-width / 2, -height / 2, 0], [width / 2, -height / 2, 0], [width / 2, height / 2, 0], [-width / 2, height / 2, 0]]
      .map((a) => translate(rotate(a, rx, ry, rz), x, y, z));
  }

  function center(vertices) {
    const result = [0, 0, 0];
    for (const a of vertices) { result[0] += a[0]; result[1] += a[1]; result[2] += a[2]; }
    return result.map((v) => v / vertices.length);
  }

  function project(a, camera) {
    const distance = a[2] - camera.z;
    if (distance <= 1) throw new RangeError("Spatial geometry crossed the camera near plane");
    const scale = camera.f / distance;
    return [CX + (a[0] - camera.x) * scale, CY + (a[1] - camera.y) * scale, scale];
  }

  function camera(distance, x = 0, y = 0, dolly = 0) { return { x, y, z: -distance + dolly, f: 620 }; }

  // Perspective ray intersects the actual world plane, then its convex polygon.
  // Painter sorting and hit testing use the same vertices and camera, not DOM boxes.
  function rayHit(vertices, cam, screen, contains) {
    if (vertices.length < 3) return null;
    const eye = [cam.x, cam.y, cam.z];
    const dir = [(screen[0] - CX) / cam.f, (screen[1] - CY) / cam.f, 1];
    const normal = cross(subtract(vertices[1], vertices[0]), subtract(vertices[2], vertices[0]));
    const denominator = dot(normal, dir);
    if (Math.abs(denominator) < 1e-8) return null;
    const distance = dot(normal, subtract(vertices[0], eye)) / denominator;
    if (distance <= 0) return null;
    const hit = [eye[0] + dir[0] * distance, eye[1] + dir[1] * distance, eye[2] + distance];
    if (contains) {
      if (!contains(hit)) return null;
    } else {
      for (let i = 0; i < vertices.length; i += 1) {
        const a = vertices[i], b = vertices[(i + 1) % vertices.length];
        if (dot(cross(subtract(b, a), subtract(hit, a)), normal) < -1e-5) return null;
      }
    }
    return { distance, point: hit };
  }

  function clipHalfPlane(polygon, coefficient, cam) {
    const value = (a) => coefficient[0] * (a[0] - CX) / cam.f + coefficient[1] * (a[1] - CY) / cam.f + coefficient[2];
    const result = [];
    for (let i = 0; i < polygon.length; i += 1) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length], va = value(a), vb = value(b);
      const insideA = va > 1e-7, insideB = vb > 1e-7;
      if (insideA) result.push(a);
      if (insideA !== insideB) {
        const t = va / (va - vb);
        result.push([mix(a[0], b[0], t), mix(a[1], b[1], t)]);
      }
    }
    return result;
  }

  function polygonPath(polygon) {
    if (polygon.length < 3) return "";
    let area = 0;
    polygon.forEach((a, i) => { const b = polygon[(i + 1) % polygon.length]; area += a[0] * b[1] - b[0] * a[1]; });
    const ordered = area < 0 ? polygon.slice().reverse() : polygon;
    return `${ordered.map((a, i) => `${i ? "L" : "M"}${a[0].toFixed(3)},${a[1].toFixed(3)}`).join(" ")} Z`;
  }

  function svgElement(doc, tag, attributes, parent) {
    const node = doc.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes || {})) node.setAttribute(key, String(value));
    if (parent) parent.appendChild(node);
    return node;
  }

  function scene(study, parent) {
    const layer = svgElement(study.doc, "g", { "data-channel": "perspective-world" }, parent || study.world);
    const linesLayer = svgElement(study.doc, "g", {}, layer);
    const facesLayer = svgElement(study.doc, "g", {}, layer);
    const faces = [], lines = [];
    const result = { layer, faces, camera: camera(650), clip: null };
    result.face = (index, label, fill) => {
      const group = svgElement(study.doc, "g", { "data-target": index }, facesLayer);
      const shape = svgElement(study.doc, "polygon", { fill: fill || colors[Math.max(index, 0) % colors.length], stroke: "#b9d5e6", "stroke-width": 1.3, "vector-effect": "non-scaling-stroke" }, group);
      const text = svgElement(study.doc, "text", { fill: "#f4f8ff", "text-anchor": "middle", "dominant-baseline": "middle", "font-family": "system-ui, sans-serif", "pointer-events": "none" }, group);
      text.textContent = label || "";
      const maskId = `game-spatial-face-${++instance}`;
      const mask = svgElement(study.doc, "mask", { id: maskId, maskUnits: "userSpaceOnUse", maskContentUnits: "userSpaceOnUse", x: 0, y: 0, width: WIDTH, height: HEIGHT }, study.defs);
      svgElement(study.doc, "rect", { x: 0, y: 0, width: WIDTH, height: HEIGHT, fill: "white" }, mask);
      const occlusion = svgElement(study.doc, "path", { fill: "black", "fill-rule": "nonzero" }, mask);
      group.setAttribute("mask", `url(#${maskId})`);
      const surface = { group, shape, text, occlusion, index, vertices: [], projected: [], normal: [0, 0, 0], planeDistance: 0, anchor: null, contains: null, active: true, opacity: 1, baseSelected: false, depth: 0 };
      faces.push(surface);
      return surface;
    };
    result.line = (stroke = "#8395b3", width = 1.4) => {
      const node = svgElement(study.doc, "path", { fill: "none", stroke, "stroke-width": width, "vector-effect": "non-scaling-stroke" }, linesLayer);
      const line = { node, vertices: [], active: true };
      lines.push(line);
      return line;
    };
    result.draw = (cam) => {
      result.camera = cam;
      for (const line of lines) {
        line.node.setAttribute("visibility", line.active ? "visible" : "hidden");
        if (line.active && line.vertices.length) line.node.setAttribute("d", line.vertices.map((a, i) => { const xy = project(a, cam); return `${i ? "L" : "M"}${xy[0].toFixed(2)},${xy[1].toFixed(2)}`; }).join(" "));
        else line.node.removeAttribute("d");
      }
      for (const surface of faces) {
        surface.group.setAttribute("visibility", surface.active ? "visible" : "hidden");
        if (!surface.active || !surface.vertices.length) continue;
        const projected = surface.vertices.map((a) => project(a, cam));
        surface.projected = projected;
        const normal = cross(subtract(surface.vertices[1], surface.vertices[0]), subtract(surface.vertices[2], surface.vertices[0]));
        const planeDistance = dot(normal, subtract(surface.vertices[0], [cam.x, cam.y, cam.z]));
        const sign = planeDistance < 0 ? -1 : 1;
        surface.normal = normal.map((v) => v * sign);
        surface.planeDistance = planeDistance * sign;
        surface.shape.setAttribute("points", projected.map((a) => `${a[0].toFixed(2)},${a[1].toFixed(2)}`).join(" "));
        const xyz = surface.anchor || center(surface.vertices), xy = project(xyz, cam);
        surface.text.setAttribute("x", xy[0].toFixed(2));
        surface.text.setAttribute("y", xy[1].toFixed(2));
        surface.text.setAttribute("font-size", clamp(14 * xy[2], 10, 22).toFixed(2));
        surface.group.setAttribute("opacity", surface.opacity);
        surface.depth = center(surface.vertices)[2] - cam.z;
        surface.group.dataset.depth = surface.depth.toFixed(3);
        surface.group.dataset.worldZ = xyz[2].toFixed(3);
        surface.shape.setAttribute("stroke", surface.baseSelected ? "#edf7ff" : "#b9d5e6");
        surface.shape.setAttribute("stroke-width", surface.baseSelected ? 2.8 : 1.3);
      }
      // An average-Z painter alone fails where tilted faces overlap or intersect.
      // Each opaque nearer face cuts only the screen half-plane where its ray
      // distance is smaller: Ai * Nj.dot(ray) - Aj * Ni.dot(ray) > 0.
      // All masks are allocated once; this updates exact planar visibility only.
      for (const target of faces) {
        if (!target.active || !target.vertices.length) continue;
        const cuts = [];
        for (const other of faces) {
          if (other === target || !other.active || other.opacity !== 1 || !other.vertices.length) continue;
          const coefficient = target.normal.map((v, axis) => target.planeDistance * other.normal[axis] - other.planeDistance * v);
          const length = Math.hypot(...coefficient);
          if (length < 1e-8) continue;
          const nearRegion = clipHalfPlane(other.projected, coefficient.map((v) => v / length), cam);
          if (nearRegion.length >= 3) cuts.push(polygonPath(nearRegion));
        }
        target.occlusion.setAttribute("d", cuts.join(" "));
      }
      const ordered = faces.slice().sort((a, b) => b.depth - a.depth);
      ordered.forEach((surface, i) => {
        if (facesLayer.children[i] !== surface.group) facesLayer.insertBefore(surface.group, facesLayer.children[i] || null);
      });
    };
    result.hit = (screen) => {
      if (result.clip && !result.clip(screen)) return null;
      let nearest = null;
      for (const surface of faces) {
        if (!surface.active || surface.opacity === 0) continue;
        const hit = rayHit(surface.vertices, result.camera, screen, surface.contains);
        if (hit && (!nearest || hit.distance <= nearest.distance + 1e-7)) nearest = { ...hit, index: surface.index, scene: result };
      }
      return nearest && nearest.index >= 0 ? nearest : null;
    };
    study.scenes.push(result);
    return result;
  }

  function mount(stage, id, title, p, options, labels, canvasMode = false) {
    if (!stage || !stage.ownerDocument || !stage.appendChild) throw new TypeError("stage must be a DOM container");
    const doc = stage.ownerDocument, root = doc.createElement("div");
    root.dataset.mechanism = id;
    root.dataset.authoredSelection = String(p.selection);
    root.style.cssText = "display:grid;gap:0.65rem;inline-size:100%;min-inline-size:0";
    const heading = doc.createElement("p");
    heading.textContent = `${title}${typeof options.text === "string" && options.text ? ` · ${options.text}` : ""}`;
    heading.style.cssText = "margin:0;overflow-wrap:anywhere";
    root.appendChild(heading);
    const surface = canvasMode ? doc.createElement("canvas") : svgElement(doc, "svg", { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, role: "img", "aria-label": `${title}，原始几何研究 / authored geometry study`, preserveAspectRatio: "xMidYMid meet" });
    surface.style.cssText = "display:block;inline-size:100%;block-size:auto;aspect-ratio:19/10;background:var(--motion-study-surface,#142137);border-radius:0.5rem";
    if (canvasMode) { surface.width = WIDTH; surface.height = HEIGHT; surface.setAttribute("role", "img"); surface.setAttribute("aria-label", title); }
    root.appendChild(surface);
    const controls = doc.createElement("label"), selector = doc.createElement("select");
    controls.textContent = "检查目标 / Inspection target ";
    selector.style.cssText = "max-inline-size:100%;min-block-size:2.75rem;font:inherit";
    for (let i = 0; i < labels.length; i += 1) {
      const option = doc.createElement("option"); option.value = String(i); option.textContent = `${i + 1} · ${labels[i]}`; selector.appendChild(option);
    }
    selector.value = String(p.selection);
    controls.appendChild(selector); root.appendChild(controls);
    const output = doc.createElement("p");
    output.style.cssText = "margin:0;overflow-wrap:anywhere";
    output.setAttribute("aria-live", "off");
    root.appendChild(output); stage.appendChild(root); stage.dataset.recipe = id;
    const listeners = [], scenes = [];
    let disposed = false, progress = 0, update = null, extraInspect = null, selected = p.selection, pointer = null, message = "";
    const reduced = options.reducedMotion === true;
    const api = { doc, root, surface, selector, output, scenes, reduced, canvasMode, progress: 0, pointer: null, selected, customHit: null, inspectQuery: null };
    if (!canvasMode) {
      api.defs = svgElement(doc, "defs", {}, surface);
      api.world = svgElement(doc, "g", {}, surface);
      api.overlay = svgElement(doc, "g", { "data-channel": "inspection-only", "pointer-events": "none" }, surface);
      api.marker = svgElement(doc, "circle", { r: 6, fill: "none", stroke: "#ffd49a", "stroke-width": 2, visibility: "hidden" }, api.overlay);
    }
    api.listen = (node, name, listener) => { node.addEventListener(name, listener); listeners.push([node, name, listener]); };
    api.message = (text) => { message = text; };
    api.coordinates = (event) => {
      if (!canvasMode && surface.getScreenCTM) {
        const matrix = surface.getScreenCTM();
        if (matrix) {
          const pt = surface.createSVGPoint(); pt.x = event.clientX; pt.y = event.clientY;
          const local = pt.matrixTransform(matrix.inverse()); return [local.x, local.y];
        }
      }
      const bounds = surface.getBoundingClientRect();
      return [(event.clientX - bounds.left) * WIDTH / bounds.width, (event.clientY - bounds.top) * HEIGHT / bounds.height];
    };
    api.hit = (screen) => {
      if (api.customHit) return api.customHit(screen);
      // Later scene channels (a clipped portal/lens) visibly sit above earlier ones.
      for (let i = scenes.length - 1; i >= 0; i -= 1) {
        const layer = scenes[i], hit = layer.hit(screen);
        if (hit || (layer.clip && layer.clip(screen))) return hit;
      }
      return null;
    };
    api.inspect = () => {
      if (disposed) return;
      const hit = pointer ? api.hit(pointer) : null;
      const inspection = hit ? hit.index : selected;
      for (const layer of scenes) for (const face of layer.faces) {
        const match = api.inspectQuery ? face.text.textContent.toLowerCase().includes(api.inspectQuery) : face.index === inspection;
        face.group.dataset.inspected = match && face.index >= 0 ? "true" : "false";
        face.shape.setAttribute("stroke", match && face.index >= 0 ? "#ffd49a" : face.baseSelected ? "#edf7ff" : "#b9d5e6");
        face.shape.setAttribute("stroke-width", match && face.index >= 0 ? 3.2 : face.baseSelected ? 2.8 : 1.3);
      }
      if (api.marker) {
        api.marker.setAttribute("visibility", pointer ? "visible" : "hidden");
        if (pointer) { api.marker.setAttribute("cx", pointer[0]); api.marker.setAttribute("cy", pointer[1]); }
      }
      root.dataset.inspectionSelection = String(inspection);
      const hitText = hit ? `；交点 / hit (${hit.point.map((v) => v.toFixed(1)).join(", ")})` : pointer ? "；射线未命中 / no surface hit" : "";
      output.textContent = `${message} · ${reduced ? "静态减弱动效 / static reduced" : "绝对进度 / absolute seek"} · 检查 / inspection ${inspection + 1}${hitText}`;
      if (extraInspect) extraInspect(hit, inspection);
    };
    api.listen(selector, "change", () => { selected = Number(selector.value); api.selected = selected; api.inspect(); });
    api.listen(surface, "pointermove", (event) => { pointer = api.coordinates(event); api.pointer = pointer; api.inspect(); });
    api.listen(surface, "pointerleave", () => { pointer = null; api.pointer = null; api.inspect(); });
    api.listen(surface, "click", (event) => {
      const hit = api.hit(api.coordinates(event));
      if (hit) { selected = hit.index; selector.value = String(selected); api.selected = selected; }
      api.inspect();
    });
    api.bind = (render, inspect) => {
      update = render; extraInspect = inspect || null;
      api.seek = (value) => {
        number(value, "progress", 0, 1, false);
        if (disposed) throw new Error("Spatial study has been disposed");
        progress = value; api.progress = progress; root.dataset.progress = value.toFixed(6);
        update(progress); api.inspect();
      };
      api.dispose = () => {
        if (disposed) return;
        disposed = true;
        for (const [node, name, listener] of listeners) node.removeEventListener(name, listener);
        root.remove();
        if (stage.dataset.recipe === id) delete stage.dataset.recipe;
        scenes.length = 0; listeners.length = 0; update = null; extraInspect = null; api.customHit = null;
      };
      api.seek(0);
      return { seek: api.seek, dispose: api.dispose };
    };
    return api;
  }

  function register(name, title, schema, extra, create) {
    const id = `game.${name}`;
    const check = (p) => validate(p, schema, extra);
    recipes[id] = {
      title,
      validate: check,
      create(stage, p, options = {}) {
        check(p);
        return create(stage, p, options, id, title);
      }
    };
  }

  const distanceRule = [500, 1400];
  const selectionRule = [0, 63, true];
  const labels = (count, title) => Array.from({ length: count }, (_, i) => `${title} ${i + 1}`);
  const put = (surface, vertices, active, opacity = 1, anchor = null) => { surface.vertices = vertices; surface.baseSelected = !!active; surface.opacity = opacity; surface.anchor = anchor; };
  const ring = (radius, z, tilt = 0, start = 0, end = 360, x = 0, y = 0) => Array.from({ length: 65 }, (_, i) => translate(rotate([radius * Math.cos(mix(start, end, i / 64) * DEG), radius * Math.sin(mix(start, end, i / 64) * DEG), 0], tilt), x, y, z));

  register("perspective-calendar-fold", "铰链日历 / Hinged calendar", {
    cameraDistance: distanceRule, foldAngle: [35, 110], rows: [4, 6, true], columns: [5, 7, true], selection: selectionRule
  }, (p) => { selection(p, p.rows * p.columns); if (p.rows % 2) throw new RangeError("rows must be even for the calendar hinge"); }, (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.rows * p.columns, "日期 / Day"));
    const world = scene(study), tiles = Array.from({ length: p.rows * p.columns }, (_, i) => world.face(i, String(i + 1)));
    const seam = world.line("#ffd49a", 2.2);
    return study.bind((t) => {
      const angle = study.reduced ? 0 : p.foldAngle * phase(t, 0.12, 0.88);
      const cellW = 360 / p.columns, cellH = 250 / p.rows;
      tiles.forEach((tile, i) => {
        const row = Math.floor(i / p.columns), col = i % p.columns;
        const vertices = plane(-180 + cellW * (col + 0.5), -125 + cellH * (row + 0.5), 35, cellW - 4, cellH - 4);
        put(tile, row < p.rows / 2 ? vertices.map((a) => translate(rotate([a[0], a[1], a[2] - 35], angle), 0, 0, 35)) : vertices, i === p.selection);
      });
      seam.vertices = [point(-180, 0, 35), point(180, 0, 35)]; world.draw(camera(p.cameraDistance));
      study.message(`上半页绕横铰链旋转 / upper sheet hinge ${angle.toFixed(1)}°；日期 / day ${p.selection + 1}`);
    });
  });

  register("camera-dolly-ui", "镜头推进层级 / Camera dolly", {
    cameraDistance: distanceRule, dollyDistance: [60, 260], layers: [3, 6, true], selection: selectionRule
  }, (p) => { selection(p, p.layers); if (p.cameraDistance - p.dollyDistance < 260) throw new RangeError("dollyDistance must leave at least 260 world units before the near plane"); }, (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.layers, "深度面 / Depth plane"));
    const world = scene(study), cards = Array.from({ length: p.layers }, (_, i) => world.face(i, `Z ${i * 95}`));
    const rails = [world.line(), world.line()];
    return study.bind((t) => {
      const advance = p.dollyDistance * (study.reduced ? 1 : phase(t, 0.08, 0.92));
      cards.forEach((card, i) => put(card, plane((i % 3 - 1) * 145, (Math.floor(i / 3) - 0.5) * 145, i * 95, 112, 80, 0, i % 2 ? -12 : 12), i === p.selection));
      rails[0].vertices = [point(-250, 155, 0), point(-250, 155, 760)]; rails[1].vertices = [point(250, 155, 0), point(250, 155, 760)];
      world.draw(camera(p.cameraDistance, 0, 0, advance));
      study.message(`眼点 Z / eye Z ${(-p.cameraDistance + advance).toFixed(1)}；近远面按 f / distance 投影，不是整体缩放 / not a flat scale`);
    });
  });

  register("cursor-depth-pull", "光标深度吸引 / Cursor depth pull", {
    cameraDistance: distanceRule, layers: [3, 6, true], pullDepth: [30, 160], cursorX: [-180, 180], cursorY: [-95, 95], selection: selectionRule
  }, (p) => selection(p, p.layers), (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.layers, "吸引面 / Pull surface"));
    const world = scene(study), cards = Array.from({ length: p.layers }, (_, i) => world.face(i, `面 / Plane ${i + 1}`));
    const focus = svgElement(study.doc, "circle", { r: 10, fill: "none", stroke: "#91e2df", "stroke-width": 2 }, study.world);
    return study.bind((t) => {
      const s = study.reduced ? 1 : phase(t, 0.06, 0.9);
      const cursor = [mix(-180, p.cursorX, s), mix(-80, p.cursorY, s), 0], cam = camera(p.cameraDistance);
      cards.forEach((card, i) => {
        const x = (i % 3 - 1) * 140, y = (Math.floor(i / 3) - 0.5) * 120;
        const falloff = Math.max(0, 1 - Math.hypot(x - cursor[0], y - cursor[1]) / 240) ** 2;
        const z = 70 + (i % 2) * 55 - p.pullDepth * falloff;
        put(card, plane(x, y, z, 115, 80, 0, 8 * (x - cursor[0]) / 240), i === p.selection);
      });
      world.draw(cam); const xy = project(cursor, cam); focus.setAttribute("cx", xy[0]); focus.setAttribute("cy", xy[1]);
      study.message(`青色为参数驱动光标 / cyan authored cursor；距离平方衰减控制实际 Z / distance falloff controls world depth`);
    });
  });

  register("cursor-raycast", "射线选面 / Ray-plane selection", {
    cameraDistance: distanceRule, layers: [3, 5, true], tilt: [12, 50], rayX: [-180, 180], rayY: [-100, 100], selection: selectionRule
  }, (p) => selection(p, p.layers), (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.layers, "可命中面 / Ray target"));
    const world = scene(study), targets = Array.from({ length: p.layers }, (_, i) => world.face(i, `Target ${i + 1}`));
    const beam = world.line("#91e2df", 2), cursor = svgElement(study.doc, "circle", { r: 8, fill: "none", stroke: "#91e2df", "stroke-width": 2 }, study.world);
    return study.bind((t) => {
      const s = study.reduced ? 1 : phase(t, 0.1, 0.9), cam = camera(p.cameraDistance);
      targets.forEach((target, i) => put(target, plane((i - (p.layers - 1) / 2) * 66, (i % 2 ? 1 : -1) * 24, (p.layers - i - 1) * 65, 145, 120, i % 2 ? 9 : -9, (i % 2 ? 1 : -1) * p.tilt), false));
      world.draw(cam);
      const screen = [CX + mix(-210, p.rayX, s), CY + mix(-105, p.rayY, s)], hit = world.hit(screen);
      targets.forEach((target) => { target.baseSelected = hit ? target.index === hit.index : target.index === p.selection; });
      cursor.setAttribute("cx", screen[0]); cursor.setAttribute("cy", screen[1]);
      beam.vertices = hit ? [point(-220, 135, -80), hit.point] : []; world.draw(cam);
      study.message(hit ? `最近有效平面交点 / nearest intersection · Target ${hit.index + 1} · Z ${hit.point[2].toFixed(1)}；橙色为独立检查 / orange inspection` : "参数射线无命中 / authored ray misses all surfaces");
    });
  });

  register("depth-lens", "局部深度透镜 / Clipped depth lens", {
    cameraDistance: distanceRule, layers: [4, 6, true], lensRadius: [55, 110], lensDepth: [60, 200], lensX: [-130, 130], selection: selectionRule
  }, (p) => { selection(p, p.layers); if (p.cameraDistance - p.lensDepth < 280) throw new RangeError("lensDepth must preserve a 280-unit lens eye distance"); }, (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.layers, "透镜样本 / Lens sample"));
    const base = scene(study), lens = scene(study);
    const clipId = `game-depth-lens-${++instance}`, clip = svgElement(study.doc, "clipPath", { id: clipId, clipPathUnits: "userSpaceOnUse" }, study.defs);
    const aperture = svgElement(study.doc, "circle", { cx: CX, cy: CY, r: p.lensRadius }, clip);
    lens.layer.setAttribute("clip-path", `url(#${clipId})`);
    const shade = svgElement(study.doc, "rect", { width: WIDTH, height: HEIGHT, fill: "#15263e" }, lens.layer);
    lens.layer.insertBefore(shade, lens.layer.firstChild);
    const outline = svgElement(study.doc, "circle", { fill: "none", stroke: "#91e2df", "stroke-width": 3, r: p.lensRadius }, study.world);
    const a = Array.from({ length: p.layers }, (_, i) => base.face(i, `Z ${i * 75}`)), b = Array.from({ length: p.layers }, (_, i) => lens.face(i, `Z ${i * 75}`));
    let lensCenter = [CX, CY];
    lens.clip = (screen) => Math.hypot(screen[0] - lensCenter[0], screen[1] - lensCenter[1]) <= p.lensRadius;
    return study.bind((t) => {
      const s = study.reduced ? 1 : phase(t, 0.05, 0.95), x = mix(-130, p.lensX, s);
      a.forEach((face, i) => {
        const vertices = plane((i % 3 - 1) * 145, (Math.floor(i / 3) - 0.5) * 115, i * 75, 105, 74);
        put(face, vertices, i === p.selection); put(b[i], vertices, i === p.selection);
      });
      const cam = camera(p.cameraDistance), xy = project([x, 0, 0], cam);
      lensCenter = [xy[0], xy[1]];
      aperture.setAttribute("cx", xy[0]); aperture.setAttribute("cy", xy[1]); outline.setAttribute("cx", xy[0]); outline.setAttribute("cy", xy[1]);
      base.draw(cam);
      const local = camera(p.cameraDistance, x * p.lensDepth / p.cameraDistance, 0, p.lensDepth);
      lens.draw(local);
      study.message(`圆内使用另一真实眼点 / circle uses a second eye；深度差使近远面的放大率不同 / depth-dependent magnification`);
    });
  });

  register("depth-stack-reorder", "深度槽重排 / Depth slot exchange", {
    cameraDistance: distanceRule, layers: [3, 6, true], spacing: [35, 95], selection: [1, 5, true]
  }, (p) => selection(p, p.layers), (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.layers, "层 / Layer"));
    const world = scene(study), cards = Array.from({ length: p.layers }, (_, i) => world.face(i, `Layer ${i + 1}`));
    return study.bind((t) => {
      const s = study.reduced ? 1 : phase(t, 0.12, 0.88);
      cards.forEach((card, i) => {
        const rank = i === p.selection ? 0 : i < p.selection ? i + 1 : i;
        const z = mix(i, rank, s) * p.spacing;
        const detour = study.reduced ? 0 : Math.sin(Math.PI * s) * (i === p.selection ? 105 : -18);
        put(card, plane(-52 + i * 24 + detour, -48 + i * 19, z, 245, 130, 0, -8), i === p.selection);
      });
      world.draw(camera(p.cameraDistance));
      study.message(`Layer ${p.selection + 1} 从深槽交换到前槽 / exchanges into front Z slot；几何与绘制次序同步 / geometry and paint order agree`);
    });
  });

  register("focus-portal", "聚焦入口 / Perspective focus portal", {
    cameraDistance: distanceRule, layers: [3, 5, true], portalRadius: [90, 145], portalDepth: [90, 240], selection: selectionRule
  }, (p) => { selection(p, p.layers); if (p.cameraDistance - p.portalDepth < 250) throw new RangeError("portalDepth must leave at least 250 units before the portal eye"); }, (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.layers, "入口目的面 / Portal destination"));
    const outside = scene(study), inside = scene(study);
    const clipId = `game-focus-portal-${++instance}`, clip = svgElement(study.doc, "clipPath", { id: clipId, clipPathUnits: "userSpaceOnUse" }, study.defs);
    const aperture = svgElement(study.doc, "circle", { cx: CX, cy: CY }, clip); inside.layer.setAttribute("clip-path", `url(#${clipId})`);
    const shade = svgElement(study.doc, "rect", { width: WIDTH, height: HEIGHT, fill: "#20354b" }, inside.layer); inside.layer.insertBefore(shade, inside.layer.firstChild);
    const outline = svgElement(study.doc, "circle", { cx: CX, cy: CY, fill: "none", stroke: "#91e2df", "stroke-width": 3 }, study.world);
    const a = Array.from({ length: p.layers }, (_, i) => outside.face(i, `Overview ${i + 1}`));
    const b = Array.from({ length: p.layers }, (_, i) => inside.face(i, `Detail ${i + 1}`));
    const corridor = Array.from({ length: 4 }, () => inside.line("#a3c1d2", 1.5));
    let radius = 0;
    inside.clip = (screen) => Math.hypot(screen[0] - CX, screen[1] - CY) <= radius;
    return study.bind((t) => {
      const s = study.reduced ? 1 : phase(t, 0.05, 0.9);
      a.forEach((face, i) => put(face, plane((i - (p.layers - 1) / 2) * 100, i % 2 ? 80 : -80, 160 + i * 60, 84, 65), i === p.selection));
      b.forEach((face, i) => put(face, plane((i % 3 - 1) * 100, (Math.floor(i / 3) - 0.5) * 105, 90 + i * 110, 85, 62), i === p.selection));
      for (let i = 0; i < 4; i += 1) { const x = i % 2 ? 175 : -175, y = i < 2 ? -125 : 125; corridor[i].vertices = [point(x, y, 0), point(x, y, 850)]; }
      radius = mix(14, p.portalRadius, s); aperture.setAttribute("r", radius); outline.setAttribute("r", radius);
      outside.draw(camera(p.cameraDistance)); inside.draw(camera(p.cameraDistance, 0, 0, p.portalDepth * s));
      study.message("圆形窗口裁切第二个透视空间 / circular aperture clips a second perspective world；不是缩放截图 / not a scaled screenshot");
    });
  });

  register("infinite-canvas-jump", "画布目的地跳转 / Canvas destination pan", {
    targetX: [300, 900], targetY: [-360, 360], zoomOut: [0.45, 0.85], nodes: [4, 8, true], selection: selectionRule
  }, (p) => selection(p, p.nodes), (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.nodes, "画布节点 / Canvas node"), true);
    const ctx = study.surface.getContext("2d");
    if (!ctx) { study.root.remove(); delete stage.dataset.recipe; throw new Error("Canvas 2D is required for this canvas pan study"); }
    const nodes = Array.from({ length: p.nodes }, (_, i) => ({ x: p.targetX * i / (p.nodes - 1), y: p.targetY * i / (p.nodes - 1) + (i === 0 || i === p.nodes - 1 ? 0 : (i % 2 ? 90 : -90)) }));
    let view = { x: 0, y: 0, scale: 1 };
    const draw = (inspection) => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT); ctx.fillStyle = "#142137"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.save(); ctx.translate(CX, CY); ctx.scale(view.scale, view.scale); ctx.translate(-view.x, -view.y);
      const left = view.x - CX / view.scale, right = view.x + CX / view.scale, top = view.y - CY / view.scale, bottom = view.y + CY / view.scale;
      ctx.strokeStyle = "#35455e"; ctx.lineWidth = 1 / view.scale; ctx.beginPath();
      for (let x = Math.floor(left / 80) * 80; x <= right; x += 80) { ctx.moveTo(x, top); ctx.lineTo(x, bottom); }
      for (let y = Math.floor(top / 80) * 80; y <= bottom; y += 80) { ctx.moveTo(left, y); ctx.lineTo(right, y); }
      ctx.stroke(); ctx.strokeStyle = "#9bb8ca"; ctx.lineWidth = 2 / view.scale; ctx.beginPath();
      nodes.forEach((node, i) => { if (i) ctx.lineTo(node.x, node.y); else ctx.moveTo(node.x, node.y); }); ctx.stroke();
      nodes.forEach((node, i) => {
        ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(node.x - 58, node.y - 35, 116, 70);
        ctx.strokeStyle = i === inspection ? "#ffd49a" : i === p.selection ? "#f5f8ff" : "#adcadb";
        ctx.lineWidth = (i === inspection ? 3.2 : 1.3) / view.scale; ctx.strokeRect(node.x - 58, node.y - 35, 116, 70);
        ctx.fillStyle = "#f5f8ff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "15px system-ui, sans-serif"; ctx.fillText(`Node ${i + 1}`, node.x, node.y);
      });
      ctx.restore();
      if (study.pointer) { ctx.strokeStyle = "#ffd49a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(study.pointer[0], study.pointer[1], 6, 0, Math.PI * 2); ctx.stroke(); }
    };
    study.customHit = (screen) => {
      const x = view.x + (screen[0] - CX) / view.scale, y = view.y + (screen[1] - CY) / view.scale;
      for (let i = nodes.length - 1; i >= 0; i -= 1) if (Math.abs(x - nodes[i].x) <= 58 && Math.abs(y - nodes[i].y) <= 35) return { index: i, point: [x, y, 0], distance: 0 };
      return null;
    };
    return study.bind((t) => {
      const s = study.reduced ? 1 : phase(t, 0.08, 0.92), destination = nodes[p.selection];
      view = { x: destination.x * s, y: destination.y * s, scale: study.reduced ? 1 : 1 - (1 - p.zoomOut) * Math.sin(Math.PI * s) };
      study.root.dataset.viewX = view.x.toFixed(3); study.root.dataset.viewY = view.y.toFixed(3); study.root.dataset.viewScale = view.scale.toFixed(4);
      study.message(`视口中心 / viewport (${view.x.toFixed(1)}, ${view.y.toFixed(1)})；仅绘制可见网格 / visible grid only；有限节点，不宣称无限内容 / bounded authored content`);
      draw(study.selected);
    }, (_, inspection) => draw(inspection));
  });

  register("layer-peel", "曲面剥层 / Cylindrical layer peel", {
    cameraDistance: distanceRule, layers: [2, 4, true], peelAngle: [70, 150], layerSpacing: [20, 65], selection: selectionRule
  }, (p) => selection(p, p.layers), (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.layers, "剥离层 / Sheet"));
    const world = scene(study), strips = Array.from({ length: p.layers }, (_, i) => Array.from({ length: 8 }, (_, j) => world.face(i, j === 2 ? `Sheet ${i + 1}` : "")));
    return study.bind((t) => {
      const s = study.reduced ? 0 : phase(t, 0.1, 0.9), width = 360;
      strips.forEach((row, layer) => {
        const local = layer === p.layers - 1 ? 0 : clamp(s - layer * 0.07, 0, 1);
        const angle = p.peelAngle * DEG * local, bendLength = width * local, crease = width - bendLength;
        const bend = (x, y) => {
          if (angle < 1e-7 || x <= crease) return [x - width / 2, y + layer * 9, layer * p.layerSpacing];
          const r = bendLength / angle, theta = (x - crease) / r;
          return [crease + r * Math.sin(theta) - width / 2, y + layer * 9, layer * p.layerSpacing - r * (1 - Math.cos(theta))];
        };
        row.forEach((strip, j) => put(strip, [bend(j * width / 8, -85), bend((j + 1) * width / 8, -85), bend((j + 1) * width / 8, 85), bend(j * width / 8, 85)], layer === p.selection));
      });
      world.draw(camera(p.cameraDistance));
      study.message("等弧长圆柱弯曲与前进折线 / constant-arc cylindrical bend with moving crease；每层八个真实曲面片 / eight geometric facets per sheet");
    });
  });

  register("magnetic-constellation", "距离场星群 / Magnetic constellation", {
    cameraDistance: distanceRule, nodes: [6, 14, true], attractionRadius: [140, 270], strength: [0.1, 0.65], cursorX: [-120, 120], cursorY: [-90, 90], selection: selectionRule
  }, (p) => selection(p, p.nodes), (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.nodes, "节点 / Node"));
    const world = scene(study), nodes = Array.from({ length: p.nodes }, (_, i) => world.face(i, String(i + 1)));
    const links = Array.from({ length: p.nodes - 1 }, () => world.line("#7594a8"));
    const seed = Number.isFinite(options.seed) ? options.seed : 0;
    const originals = nodes.map((_, i) => { const angle = (i * 137.508 + seed % 30) * DEG, radius = 55 + 100 * Math.sqrt((i + 1) / p.nodes); return [radius * Math.cos(angle), radius * Math.sin(angle) * 0.72, (i % 3) * 55]; });
    return study.bind((t) => {
      const s = study.reduced ? 1 : phase(t, 0.08, 0.9), target = [mix(-140, p.cursorX, s), mix(-95, p.cursorY, s)];
      const positions = originals.map((a) => {
        const field = Math.max(0, 1 - Math.hypot(a[0] - target[0], a[1] - target[1]) / p.attractionRadius) ** 2 * p.strength;
        return [mix(a[0], target[0], field), mix(a[1], target[1], field), a[2] - field * 95];
      });
      nodes.forEach((node, i) => put(node, plane(...positions[i], 29, 29), i === p.selection));
      links.forEach((link, i) => { link.vertices = [positions[i], positions[i + 1]]; }); world.draw(camera(p.cameraDistance));
      study.message("每个节点按与焦点的距离场独立变形 / independent radial field attraction；连接线复用变形后的世界点 / links use deformed world points");
    });
  });

  register("orbit-context-menu", "倾斜轨道菜单 / Tilted context orbit", {
    cameraDistance: distanceRule, commands: [4, 7, true], radius: [95, 160], orbitDegrees: [35, 150], tilt: [25, 65], selection: selectionRule
  }, (p) => selection(p, p.commands), (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.commands, "命令 / Command"));
    const world = scene(study), target = world.face(-1, "Context", "#2c4059"), orbit = world.line("#91b7bd", 1.8);
    const commands = Array.from({ length: p.commands }, (_, i) => world.face(i, `Cmd ${i + 1}`));
    return study.bind((t) => {
      const s = study.reduced ? 1 : phase(t, 0.08, 0.95), radius = mix(30, p.radius, s), turn = study.reduced ? 0 : p.orbitDegrees * s;
      put(target, plane(0, 0, 130, 100, 60), false); orbit.vertices = ring(radius, 130, p.tilt);
      commands.forEach((command, i) => {
        const theta = (360 * i / p.commands + turn) * DEG, xyz = translate(rotate([radius * Math.cos(theta), radius * Math.sin(theta), 0], p.tilt), 0, 0, 130);
        put(command, plane(...xyz, 62, 38), i === p.selection);
      });
      world.draw(camera(p.cameraDistance)); study.message("命令绕倾斜的三维圆环运行 / commands occupy a tilted 3D orbit；前后位置改变透视尺寸 / near and far sizes follow depth");
    });
  });

  register("parallax-inspector", "分深度视差检查 / Depth parallax inspector", {
    cameraDistance: distanceRule, layers: [3, 5, true], depthSpacing: [60, 130], lookX: [60, 160], lookY: [20, 70], selection: selectionRule
  }, (p) => selection(p, p.layers), (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.layers, "检查层 / Inspector layer"));
    const world = scene(study), cards = Array.from({ length: p.layers }, (_, i) => world.face(i, `Z ${i * p.depthSpacing}`));
    return study.bind((t) => {
      cards.forEach((card, i) => put(card, plane((i - (p.layers - 1) / 2) * 58, (i - (p.layers - 1) / 2) * 25, i * p.depthSpacing, 170, 115), i === p.selection, 0.76));
      const x = study.reduced ? 0 : p.lookX * (2 * smooth(t) - 1), y = study.reduced ? 0 : p.lookY * Math.sin(Math.PI * t);
      world.draw(camera(p.cameraDistance, x, y));
      study.message(`侧移眼点 / translated eye (${x.toFixed(1)}, ${y.toFixed(1)})；相同世界位移在不同深度有不同投影量 / parallax depends on depth`);
    });
  });

  register("perspective-dock", "透视近邻托盘 / Perspective proximity dock", {
    cameraDistance: distanceRule, icons: [5, 8, true], tilt: [35, 65], lift: [35, 110], spacing: [42, 62], cursorX: [-160, 160], selection: selectionRule
  }, (p) => { selection(p, p.icons); if (p.icons * p.spacing > 480) throw new RangeError("icons × spacing must not exceed the 480-unit dock width"); }, (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.icons, "托盘项 / Dock item"));
    const world = scene(study), ground = world.face(-1, "", "#263e52"), cards = Array.from({ length: p.icons }, (_, i) => world.face(i, String(i + 1)));
    return study.bind((t) => {
      const cursor = mix(-160, p.cursorX, study.reduced ? 1 : phase(t, 0.1, 0.9));
      put(ground, plane(0, 62, 145, p.icons * p.spacing + 35, 150, p.tilt), false);
      cards.forEach((card, i) => {
        const x = (i - (p.icons - 1) / 2) * p.spacing, weight = Math.exp(-(((x - cursor) / 72) ** 2));
        put(card, plane(x, 5 - 22 * weight, 110 - p.lift * weight, 38 * (1 + 0.32 * weight), 62 * (1 + 0.32 * weight), p.tilt), i === p.selection);
      });
      world.draw(camera(p.cameraDistance));
      study.message("高斯近邻场抬升倾斜面并改变真实 Z / Gaussian proximity lifts tilted faces in world depth；不是二维图标统一缩放 / not uniform icon scale");
    });
  });

  register("radial-command-bloom", "分区径向展开 / Polar sector bloom", {
    cameraDistance: distanceRule, commands: [4, 8, true], radius: [95, 155], gapDegrees: [6, 20], depth: [20, 100], selection: selectionRule
  }, (p) => { selection(p, p.commands); if (p.gapDegrees >= 360 / p.commands - 12) throw new RangeError("gapDegrees leaves no readable command sector"); }, (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.commands, "扇区命令 / Sector command"));
    const world = scene(study), sectors = Array.from({ length: p.commands }, (_, i) => world.face(i, `Cmd ${i + 1}`));
    return study.bind((t) => {
      sectors.forEach((sector, i) => {
        const s = study.reduced ? 1 : phase(t, 0.05 + i * 0.025, 0.8 + i * 0.025), radius = mix(12, p.radius, s);
        const mid = 360 * i / p.commands - 90, half = (360 / p.commands - p.gapDegrees) / 2, z = p.depth * (1 - s) + i * 6;
        const vertices = [[0, 0, z]];
        for (let j = 0; j <= 12; j += 1) { const angle = mix(mid - half, mid + half, j / 12) * DEG; vertices.push([radius * Math.cos(angle), radius * Math.sin(angle), z]); }
        put(sector, vertices, i === p.selection, 1, [radius * 0.65 * Math.cos(mid * DEG), radius * 0.65 * Math.sin(mid * DEG), z]);
      });
      world.draw(camera(p.cameraDistance)); study.message("独立角区、角间隙与分段半径 / authored polar sectors, gaps and staged radii；射线按实际扇区命中 / hits follow sector geometry");
    });
  });

  register("spatial-audio-locator", "方位可视化，不发声 / Visual bearing, no audio", {
    cameraDistance: distanceRule, sources: [3, 5, true], azimuth: [-155, 155], elevation: [-40, 40], distance: [100, 200], selection: selectionRule
  }, (p) => selection(p, p.sources), (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.sources, "视觉方位点 / Visual source"));
    const world = scene(study), listener = world.face(-1, "Listener", "#2c4059"), sources = Array.from({ length: p.sources }, (_, i) => world.face(i, `Source ${i + 1}`));
    const heading = world.line("#91e2df", 2.5), azimuth = world.line("#b4c6dd", 1.5), elevation = world.line("#a5d7d2", 1.5);
    return study.bind((t) => {
      const s = study.reduced ? 1 : smooth(t), az = mix(-65, p.azimuth, s), el = mix(-18, p.elevation, s), origin = [0, 50, 210];
      put(listener, plane(...origin, 70, 40, -12), false);
      const positions = sources.map((_, i) => {
        const a = (az + (i - p.selection) * 65) * DEG, e = (i === p.selection ? el : (i % 2 ? 16 : -12)) * DEG;
        return [p.distance * Math.sin(a) * Math.cos(e), origin[1] - p.distance * Math.sin(e), origin[2] + p.distance * Math.cos(a) * Math.cos(e)];
      });
      sources.forEach((source, i) => put(source, plane(...positions[i], 45, 32), i === p.selection)); heading.vertices = [origin, positions[p.selection]];
      azimuth.vertices = Array.from({ length: 33 }, (_, i) => { const a = az * i / 32 * DEG; return [p.distance * Math.sin(a), origin[1], origin[2] + p.distance * Math.cos(a)]; });
      elevation.vertices = Array.from({ length: 33 }, (_, i) => { const a = az * DEG, e = el * i / 32 * DEG; return [p.distance * Math.sin(a) * Math.cos(e), origin[1] - p.distance * Math.sin(e), origin[2] + p.distance * Math.cos(a) * Math.cos(e)]; });
      world.draw(camera(p.cameraDistance));
      study.message(`视觉方位 / visual azimuth ${az.toFixed(1)}°，仰角 / elevation ${el.toFixed(1)}°；不生成音频，不验证听觉定位 / no audio or audible localization`);
    });
  });

  register("spatial-breadcrumb", "世界路径面包屑 / World-path breadcrumb", {
    cameraDistance: distanceRule, levels: [3, 7, true], stepDepth: [45, 100], turnAngle: [15, 65], selection: selectionRule
  }, (p) => selection(p, p.levels), (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.levels, "路径级 / Path level"));
    const world = scene(study), nodes = Array.from({ length: p.levels }, (_, i) => world.face(i, `Level ${i + 1}`));
    const route = world.line("#a4c4ce", 2.2), marker = world.face(-1, "", "#91e2df");
    const points = nodes.map((_, i) => [(i - (p.levels - 1) / 2) * 55, Math.sin(i * p.turnAngle * DEG) * 70 - 30, i * p.stepDepth]);
    return study.bind((t) => {
      const s = study.reduced ? 1 : smooth(t), index = s * p.selection, low = Math.floor(index), high = Math.min(p.levels - 1, low + 1), local = index - low;
      nodes.forEach((node, i) => put(node, plane(...points[i], 84, 42), i === p.selection)); route.vertices = points;
      const cursor = points[low].map((v, axis) => mix(v, points[high][axis], local)); put(marker, plane(cursor[0], cursor[1] - 33, cursor[2] - 2, 16, 12), false);
      const focus = points[p.selection]; world.draw(camera(p.cameraDistance, focus[0] * 0.25 * s, 0, focus[2] * 0.2 * s));
      study.message(`世界路径保留祖先与分深度连接 / preserves ancestors and 3D route；当前目标 / authored destination Level ${p.selection + 1}`);
    });
  });

  register("spatial-search-reveal", "检索结果分深度显露 / Spatial search reveal", {
    cameraDistance: distanceRule, columns: [3, 5, true], rows: [2, 3, true], revealDepth: [160, 380], query: { values: ["signal", "route"] }, selection: selectionRule
  }, (p) => selection(p, p.columns * p.rows), (stage, p, options, id, title) => {
    const count = p.columns * p.rows, names = Array.from({ length: count }, (_, i) => `${i % 2 ? "Route" : "Signal"} ${i + 1}`);
    const study = mount(stage, id, title, p, options, names), world = scene(study);
    const nodes = names.map((name, i) => world.face(i, name));
    const searchLabel = study.doc.createElement("label"), search = study.doc.createElement("input");
    searchLabel.textContent = "检查文本匹配 / Inspect label match "; search.type = "search"; search.value = p.query; search.style.cssText = "font:inherit;min-block-size:2.75rem;max-inline-size:100%";
    searchLabel.appendChild(search); study.root.insertBefore(searchLabel, study.output);
    study.inspectQuery = p.query;
    study.listen(search, "input", () => { study.inspectQuery = search.value.trim().toLowerCase() || null; study.inspect(); });
    return study.bind((t) => {
      const s = study.reduced ? 1 : phase(t, 0.06, 0.95);
      nodes.forEach((node, i) => {
        const match = names[i].toLowerCase().includes(p.query), targetX = (i % p.columns - (p.columns - 1) / 2) * 110, targetY = (Math.floor(i / p.columns) - (p.rows - 1) / 2) * 90;
        const local = match ? s : 1, z = match ? p.revealDepth * (1 - local) : p.revealDepth * 0.8;
        put(node, plane(match ? targetX * local : targetX, match ? targetY * local : targetY, z, 94, 58, 0, match ? 30 * (1 - local) : 0), i === p.selection, match ? 1 : 0.4);
      });
      world.draw(camera(p.cameraDistance));
      study.message(`作者查询 / authored query “${p.query}” 展开真实匹配面 / unfolds matching faces；输入框只检查标签，不改检索时间线 / input inspects, not timeline state`);
    });
  });

  register("tooltip-orbit", "空间锚点提示轨道 / Anchored tooltip orbit", {
    cameraDistance: distanceRule, anchors: [3, 5, true], radius: [60, 105], arcDegrees: [45, 170], tilt: [20, 60], selection: selectionRule
  }, (p) => selection(p, p.anchors), (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.anchors, "提示锚点 / Tooltip anchor"));
    const world = scene(study), anchors = Array.from({ length: p.anchors }, (_, i) => world.face(i, `Anchor ${i + 1}`));
    const tooltip = world.face(-1, "详情 / Detail", "#5b687e"), leader = world.line("#91e2df", 2);
    const points = anchors.map((_, i) => [(i - (p.anchors - 1) / 2) * 110, (i % 2 ? 1 : -1) * 45, (i % 3) * 80]);
    return study.bind((t) => {
      anchors.forEach((anchor, i) => put(anchor, plane(...points[i], 76, 52, 0, i % 2 ? 10 : -10), i === p.selection));
      const angle = (study.reduced ? -65 : -120 + p.arcDegrees * phase(t, 0.1, 0.9)) * DEG;
      const offset = rotate([p.radius * Math.cos(angle), p.radius * Math.sin(angle), 0], p.tilt), anchor = points[p.selection], xyz = translate(offset, ...anchor);
      put(tooltip, plane(...xyz, 126, 38), false); leader.vertices = [anchor, xyz]; world.draw(camera(p.cameraDistance));
      study.message("提示沿选定世界锚点的倾斜弧运动 / tooltip follows a tilted arc around its world anchor；连线与投影共用坐标 / leader shares projected coordinates");
    });
  });

  register("volumetric-menu", "六面体菜单 / Six-face volume menu", {
    cameraDistance: distanceRule, items: [3, 5, true], depth: [24, 70], width: [75, 120], rotation: [22, 60], selection: selectionRule
  }, (p) => selection(p, p.items), (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.items, "实体命令 / Solid command"));
    const world = scene(study), faceIndices = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [4, 5, 1, 0], [3, 2, 6, 7]];
    const boxes = Array.from({ length: p.items }, (_, i) => faceIndices.map((_, j) => world.face(i, j === 0 ? `Cmd ${i + 1}` : "", j === 0 ? colors[i % colors.length] : j < 4 ? "#344b66" : "#4d6479")));
    return study.bind((t) => {
      const s = study.reduced ? 1 : phase(t, 0.1, 0.9);
      boxes.forEach((box, i) => {
        const x = (i % 2 ? 1 : -1) * mix(30, 85, s), y = (i - (p.items - 1) / 2) * 61, z = (p.items - i - 1) * 35;
        const w = p.width / 2, h = 23, d = p.depth / 2;
        const vertices = [[-w, -h, -d], [w, -h, -d], [w, h, -d], [-w, h, -d], [-w, -h, d], [w, -h, d], [w, h, d], [-w, h, d]]
          .map((a) => translate(rotate(a, 9, (i % 2 ? -1 : 1) * p.rotation * (study.reduced ? 1 : s)), x, y, z));
        box.forEach((face, j) => put(face, faceIndices[j].map((index) => vertices[index]), i === p.selection));
      });
      world.draw(camera(p.cameraDistance)); study.message(`每项六个世界面 / six world faces per command；实体厚度 / solid depth ${p.depth}；射线命中最近实体面 / nearest face hit`);
    });
  });

  register("z-notification", "深度通知 / Z-depth notification", {
    cameraDistance: distanceRule, travelDepth: [200, 550], layers: [2, 4, true], selection: selectionRule
  }, (p) => selection(p, p.layers), (stage, p, options, id, title) => {
    const study = mount(stage, id, title, p, options, labels(p.layers, "通知 / Notification"));
    const world = scene(study), background = world.face(-1, "", "#243750"), messages = Array.from({ length: p.layers }, (_, i) => world.face(i, `通知 / Notice ${i + 1}`));
    return study.bind((t) => {
      const s = study.reduced ? 1 : phase(t, 0.05, 0.88);
      put(background, plane(0, 0, 240, 440, 275), false);
      messages.forEach((message, i) => {
        const z = i === p.selection ? mix(p.travelDepth, -70, s) : 80 + i * 45;
        put(message, plane((i - (p.layers - 1) / 2) * 18, (i - (p.layers - 1) / 2) * 67, z, 270, 49, 0, i === p.selection ? -8 * (1 - s) : 0), i === p.selection);
      });
      world.draw(camera(p.cameraDistance));
      study.message(`通知 ${p.selection + 1} 沿世界 Z 穿到前景 / notification crosses world depth；缩放由真实透视产生 / size comes from perspective`);
    });
  });

  return { recipes };
});
