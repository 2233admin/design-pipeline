"use strict";

const {
  LIFECYCLE_ADAPTER_SCHEMA,
  createLifecycleAdapter,
  validatePerformanceBudgets,
} = require("./motion-foundation-core.cjs");

const RESOURCE_KINDS = Object.freeze([
  "buffers",
  "textures",
  "programs",
  "framebuffers",
  "renderLoops",
  "observers",
  "listeners",
]);
const RESOURCE_BUCKETS = Object.freeze([...RESOURCE_KINDS, "objects", "particles"]);
const GL_DELETE_METHODS = Object.freeze({
  buffers: "deleteBuffer",
  textures: "deleteTexture",
  programs: "deleteProgram",
  framebuffers: "deleteFramebuffer",
});
const FRAME_METRIC_FIELDS = Object.freeze([
  "durationMs",
  "frameMs",
  "inputLatencyMs",
  "cpuMs",
  "objects",
  "particles",
  "textureCount",
  "textureBytes",
  "longFrames",
]);

function fail(message) {
  throw new Error(message);
}

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}

function nonEmpty(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) fail(`${label} must be a non-empty string`);
  return value;
}

function finite(value, label, min = 0) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) fail(`${label} must be finite and >= ${min}`);
  return value;
}

function integer(value, label, min = 0) {
  finite(value, label, min);
  if (!Number.isInteger(value)) fail(`${label} must be an integer`);
  return value;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function normalizeRoot(raw) {
  const value = nonEmpty(raw, "scene containment root").trim();
  return value.startsWith("#") ? value : `#${value}`;
}

function resourceRegistryFrom(scene, input) {
  const registry = scene.resourceRegistry || scene.resources || input.resourceRegistry || input.resources;
  plainObject(registry, "scene resource registry");
  for (const kind of RESOURCE_KINDS) {
    if (!Array.isArray(registry[kind])) fail(`scene resource registry.${kind} must be an array`);
  }
  for (const kind of ["objects", "particles"]) {
    if (registry[kind] !== undefined && !Array.isArray(registry[kind])) fail(`scene resource registry.${kind} must be an array`);
  }
  return registry;
}

function normalizeSceneContract(input) {
  plainObject(input, "scene lifecycle definition");
  const scene = input.scene || {};
  plainObject(scene, "scene contract");
  const camera = scene.camera || input.camera;
  plainObject(camera, "scene camera");
  const viewport = scene.viewport || input.viewport;
  plainObject(viewport, "scene viewport");
  integer(viewport.width, "scene viewport.width", 1);
  integer(viewport.height, "scene viewport.height", 1);
  const dpr = scene.dpr ?? input.dpr;
  finite(dpr, "scene dpr", 0.01);
  const registry = resourceRegistryFrom(scene, input);
  const root = normalizeRoot(input.root || input.containment?.root || scene.root);
  const boundary = nonEmpty(input.containment?.boundary || "scene-owned", "scene containment boundary");
  return {
    camera: clone(camera),
    dpr,
    viewport: { width: viewport.width, height: viewport.height },
    root,
    rootElementId: root.slice(1),
    containment: { root, boundary },
    resourceRegistry: registry,
  };
}

function resourceBytes(resource) {
  if (resource.bytes !== undefined) return finite(resource.bytes, `resource ${resource.id}.bytes`);
  if (resource.sizeBytes !== undefined) return finite(resource.sizeBytes, `resource ${resource.id}.sizeBytes`);
  if (resource.byteLength !== undefined) return finite(resource.byteLength, `resource ${resource.id}.byteLength`);
  return 0;
}

function normalizeResources(registry, owner) {
  const resources = [];
  const ids = new Set();
  for (const kind of RESOURCE_BUCKETS) {
    for (const [index, input] of (registry[kind] || []).entries()) {
      plainObject(input, `scene resource registry.${kind}[${index}]`);
      const id = nonEmpty(input.id, `scene resource registry.${kind}[${index}].id`);
      if (ids.has(id)) fail(`scene resource id is duplicated: ${id}`);
      ids.add(id);
      resources.push({
        ...input,
        id,
        kind: kind.endsWith("s") ? kind.slice(0, -1) : kind,
        registryKind: kind,
        owner: input.owner || owner,
        disposable: input.disposable !== false,
        bytes: resourceBytes({ ...input, id }),
        released: false,
        releaseError: null,
      });
    }
  }
  return resources;
}

function contextIsBlocked(input, gl) {
  if (input.fallback === true || input.fallbackStatus === true || input.status === "fallback" || input.contextStatus === "fallback") return "renderer fallback is blocked";
  if (input.status === "blocked" || input.contextStatus === "blocked") return "renderer context is blocked";
  if (gl && typeof gl.isContextLost === "function" && gl.isContextLost() === true) return "graphics context is lost";
  return null;
}

function ensureResourceBudget(resources, budgets) {
  const objects = resources.filter((resource) => resource.registryKind === "objects").length;
  const particles = resources.filter((resource) => resource.registryKind === "particles").length;
  const textures = resources.filter((resource) => resource.registryKind === "textures");
  const textureBytes = textures.reduce((sum, resource) => sum + resource.bytes, 0);
  if (budgets.object.applicable !== true && objects > 0) fail("scene object resources require an applicable object budget");
  if (budgets.particle.applicable !== true && particles > 0) fail("scene particle resources require an applicable particle budget");
  if (budgets.texture.applicable !== true && (textures.length > 0 || textureBytes > 0)) fail("scene texture resources require an applicable texture budget");
  if (budgets.object.applicable === true && objects > budgets.object.max) fail("scene object resources exceed performance budgets.object.max");
  if (budgets.particle.applicable === true && particles > budgets.particle.max) fail("scene particle resources exceed performance budgets.particle.max");
  if (budgets.texture.applicable === true && textures.length > budgets.texture.maxCount) fail("scene texture resources exceed performance budgets.texture.maxCount");
  if (budgets.texture.applicable === true && textureBytes > budgets.texture.maxBytes) fail("scene texture resources exceed performance budgets.texture.maxBytes");
}

function callRelease(resource, gl) {
  const release = resource.release || resource.cleanup || resource.dispose || resource.destroy || resource.unsubscribe || resource.cancel;
  if (typeof release === "function") {
    const result = release.call(resource.handle || resource);
    if (result === false) fail(`resource ${resource.id} refused release`);
    return;
  }
  const method = GL_DELETE_METHODS[resource.registryKind];
  if (method && gl && typeof gl[method] === "function" && resource.handle !== undefined) {
    gl[method](resource.handle);
    return;
  }
  if (resource.registryKind === "renderLoops" && gl && typeof gl.cancelAnimationFrame === "function" && resource.handle !== undefined) {
    gl.cancelAnimationFrame(resource.handle);
    return;
  }
  if (resource.registryKind === "observers" && resource.handle && typeof resource.handle.disconnect === "function") {
    resource.handle.disconnect();
    return;
  }
  if (resource.registryKind === "listeners" && resource.handle && typeof resource.handle.remove === "function") {
    resource.handle.remove();
    return;
  }
  if (resource.handle) {
    for (const methodName of ["cancel", "stop", "disconnect", "remove"]) {
      if (typeof resource.handle[methodName] === "function") {
        resource.handle[methodName]();
        return;
      }
    }
  }
  if (resource.target && typeof resource.target.removeEventListener === "function") {
    resource.target.removeEventListener(resource.type, resource.listener);
    return;
  }
  if (resource.handle !== undefined && (method || resource.registryKind === "renderLoops" || resource.registryKind === "observers" || resource.registryKind === "listeners")) fail(`resource ${resource.id} has no releaser`);
}

function checkFrameMetrics(metrics) {
  plainObject(metrics, "scene frame metrics");
  for (const key of Object.keys(metrics)) {
    if (!FRAME_METRIC_FIELDS.includes(key)) fail(`scene frame metrics.${key} is unsupported`);
    if (key !== "longFrames") finite(metrics[key], `scene frame metrics.${key}`);
  }
  if (metrics.longFrames !== undefined) integer(metrics.longFrames, "scene frame metrics.longFrames");
  return metrics;
}

function enforceFrameBudget(metrics, budgets, frameHistory) {
  checkFrameMetrics(metrics);
  const frame = budgets.frame;
  const durationMs = metrics.durationMs ?? metrics.frameMs;
  if (frame.applicable !== true && Object.keys(metrics).length > 0) fail("scene frame metrics require an applicable frame budget");
  if (frame.applicable !== true) return;
  if (durationMs !== undefined) {
    frameHistory.push(durationMs);
    const longFrames = frameHistory.filter((value) => value > frame.maxMs).length;
    if (longFrames > frame.maxLongFrames) fail("scene frame durations exceed performance budgets.frame");
  }
  if (metrics.inputLatencyMs !== undefined && metrics.inputLatencyMs > frame.maxInputLatencyMs) fail("scene input latency exceeds performance budgets.frame.maxInputLatencyMs");
  if (metrics.cpuMs !== undefined && metrics.cpuMs > frame.maxCpuMs) fail("scene CPU time exceeds performance budgets.frame.maxCpuMs");
  if (metrics.objects !== undefined && (budgets.object.applicable !== true || metrics.objects > budgets.object.max)) fail("scene frame objects exceed performance budgets.object.max");
  if (metrics.particles !== undefined && (budgets.particle.applicable !== true || metrics.particles > budgets.particle.max)) fail("scene frame particles exceed performance budgets.particle.max");
  if (metrics.textureCount !== undefined && (budgets.texture.applicable !== true || metrics.textureCount > budgets.texture.maxCount)) fail("scene frame textures exceed performance budgets.texture.maxCount");
  if (metrics.textureBytes !== undefined && (budgets.texture.applicable !== true || metrics.textureBytes > budgets.texture.maxBytes)) fail("scene frame texture bytes exceed performance budgets.texture.maxBytes");
  if (metrics.longFrames !== undefined && metrics.longFrames > frame.maxLongFrames) fail("scene long-frame count exceeds performance budgets.frame.maxLongFrames");
}

function createSceneLifecycleAdapter(input) {
  plainObject(input, "scene lifecycle definition");
  const renderer = input.renderer || input.kind;
  if (renderer !== "webgl" && renderer !== "3d") fail("scene renderer must be webgl or 3d");
  const id = nonEmpty(input.id, "scene lifecycle id");
  const scene = normalizeSceneContract(input);
  const budgets = clone(input.budgets);
  validatePerformanceBudgets(budgets);
  const gl = input.gl || input.context || null;
  if (gl !== null) plainObject(gl, "scene graphics context");
  const resources = normalizeResources(scene.resourceRegistry, id);
  ensureResourceBudget(resources, budgets);
  if (resources.length === 0) resources.push({ id: `${id}:scene-state`, kind: "scene-state", registryKind: "scene-state", owner: id, disposable: true, bytes: 0, released: false, releaseError: null });
  const frameHistory = [];
  let lastFrame = null;
  let lastMetrics = null;
  let disposed = false;
  let localBlockedReason = contextIsBlocked(input, gl);

  const handlers = input.handlers || {};
  const callback = (name, fallback) => typeof handlers[name] === "function" ? handlers[name] : (typeof input[`on${name[0].toUpperCase()}${name.slice(1)}`] === "function" ? input[`on${name[0].toUpperCase()}${name.slice(1)}`] : fallback);
  const releaseAll = () => {
    for (const resource of resources) {
      if (resource.released) continue;
      try {
        callRelease(resource, gl);
        resource.released = true;
      } catch (error) {
        resource.releaseError = error.message;
        localBlockedReason = localBlockedReason || `resource cleanup failed: ${resource.id}`;
      }
    }
  };
  const base = createLifecycleAdapter({
    schema: LIFECYCLE_ADAPTER_SCHEMA,
    id,
    renderer,
    handlers: {
      init: (payload) => {
        localBlockedReason = contextIsBlocked(input, gl) || localBlockedReason;
        if (localBlockedReason) return { status: "blocked", reason: localBlockedReason };
        return callback("init", () => undefined)(payload);
      },
      resize: (payload = {}) => {
        if (localBlockedReason) return { status: "blocked", reason: localBlockedReason };
        const next = { ...scene.viewport, dpr: scene.dpr, ...payload };
        integer(next.width, "scene viewport.width", 1);
        integer(next.height, "scene viewport.height", 1);
        finite(next.dpr, "scene dpr", 0.01);
        scene.viewport = { width: next.width, height: next.height };
        scene.dpr = next.dpr;
        if (gl && typeof gl.viewport === "function") gl.viewport(0, 0, Math.round(next.width * next.dpr), Math.round(next.height * next.dpr));
        return callback("resize", () => undefined)({ ...scene.viewport, dpr: scene.dpr });
      },
      update: (frame) => {
        localBlockedReason = contextIsBlocked(input, gl) || localBlockedReason;
        if (localBlockedReason) return { status: "blocked", reason: localBlockedReason };
        if (frame && frame.metrics) {
          lastMetrics = clone(frame.metrics);
          enforceFrameBudget(frame.metrics, budgets, frameHistory);
        }
        if (frame && typeof frame.authoredTimeMs === "number") lastFrame = clone(frame);
        else if (frame && typeof frame.timeMs === "number") lastFrame = clone(frame);
        return callback("update", () => undefined)(frame);
      },
      render: (frame) => {
        localBlockedReason = contextIsBlocked(input, gl) || localBlockedReason;
        if (localBlockedReason) return { status: "blocked", reason: localBlockedReason };
        if (frame && frame.metrics && !lastMetrics) {
          lastMetrics = clone(frame.metrics);
          enforceFrameBudget(frame.metrics, budgets, frameHistory);
        }
        return callback("render", () => undefined)(frame);
      },
      dispose: () => {
        if (!disposed) {
          releaseAll();
          callback("dispose", () => undefined)({ resources: resources.map((resource) => resource.id) });
          disposed = true;
        }
      },
    },
    ownership: {
      owner: id,
      resources: resources.map((resource) => ({ id: resource.id, kind: resource.kind, owner: resource.owner, disposable: resource.disposable })),
    },
    containment: scene.containment,
    cleanup: {
      observable: true,
      checks: ["release buffers", "release textures", "release programs", "release framebuffers", "stop render loops", "disconnect observers", "remove listeners"],
    },
  });

  const api = {
    ...base,
    scene,
    budgets,
    context: gl,
    releaseResource: (resourceId) => {
      if (disposed) fail("scene lifecycle adapter is disposed");
      const resource = resources.find((entry) => entry.id === resourceId);
      if (!resource) return base.releaseResource(resourceId);
      if (!resource.released) {
        try {
          callRelease(resource, gl);
          resource.released = true;
        } catch (error) {
          resource.releaseError = error.message;
          localBlockedReason = localBlockedReason || `resource cleanup failed: ${resource.id}`;
          return;
        }
      }
      base.releaseResource(resourceId);
    },
    recordFrameMetrics: (metrics) => {
      if (disposed) fail("scene lifecycle adapter is disposed");
      enforceFrameBudget(metrics, budgets, frameHistory);
      lastMetrics = clone(metrics);
      return clone(metrics);
    },
    observeFrame: (metrics) => api.recordFrameMetrics(metrics),
    metrics: () => ({ frameCount: frameHistory.length, lastFrameMs: frameHistory.at(-1) ?? 0, lastFrame: clone(lastFrame), ...(lastMetrics || {}) }),
    status: () => localBlockedReason ? { status: "blocked", reason: localBlockedReason } : { blocked: false },
    cleanupStatus: () => {
      const baseStatus = base.cleanupStatus();
      const leaked = resources.filter((resource) => !resource.released);
      const blockedReason = localBlockedReason || (baseStatus.disposed && leaked.length > 0 ? `unreleased resources: ${leaked.map((resource) => resource.id).join(", ")}` : null);
      return {
        ...baseStatus,
        ...(blockedReason ? { status: "blocked", reason: blockedReason } : { blocked: false }),
        resources: resources.map((resource) => ({ id: resource.id, released: resource.released })),
        scene: { root: scene.root, rootElementId: scene.rootElementId, viewport: { ...scene.viewport }, dpr: scene.dpr },
      };
    },
  };
  return api;
}

module.exports = {
  RESOURCE_KINDS,
  createSceneLifecycleAdapter,
  createRendererLifecycleAdapter: createSceneLifecycleAdapter,
  createWebglLifecycleAdapter: (input) => createSceneLifecycleAdapter({ ...input, renderer: "webgl" }),
  create3dLifecycleAdapter: (input) => createSceneLifecycleAdapter({ ...input, renderer: "3d" }),
};
