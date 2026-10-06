(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArtMotionScroll = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function finite(value, label, min = -Infinity, max = Infinity) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new TypeError(`${label} must be finite and in [${min}, ${max}]`);
    return value;
  }
  function point(value, label) {
    if (!value || typeof value !== "object") throw new TypeError(`${label} must be a point`);
    return { x: finite(value.x, `${label}.x`), y: finite(value.y, `${label}.y`) };
  }
  function intersection(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }

  /**
   * Build a caller-owned, seekable horizontal world traversal. Coordinates and callbacks belong
   * to the caller. No actor, scene, camera, scale, direction, duration, renderer or assets are
   * supplied by this helper.
   */
  function createLongScroll(options = {}) {
    const { segments, viewport, start, speed, direction = 1, scale = 1, camera, actorBounds, earnedItemsAt } = options;
    if (!Array.isArray(segments) || segments.length < 1 || segments.length > 1000) throw new TypeError("segments must contain 1..1000 entries");
    if (!viewport || typeof viewport !== "object") throw new TypeError("viewport is required");
    const view = { width: finite(viewport.width, "viewport.width", 1, 100000), height: finite(viewport.height, "viewport.height", 1, 100000) };
    const initial = point(start, "start");
    finite(speed, "speed", Number.EPSILON, 100000);
    if (direction !== 1 && direction !== -1) throw new TypeError("direction must be 1 or -1");
    finite(scale, "scale", Number.EPSILON, 1000);
    if (typeof camera !== "function") throw new TypeError("camera must be a caller-supplied pure function");
    if (typeof actorBounds !== "function") throw new TypeError("actorBounds must be a caller-supplied function");
    if (earnedItemsAt !== undefined && typeof earnedItemsAt !== "function") throw new TypeError("earnedItemsAt must be a function");

    const ids = new Set();
    const laidOut = [];
    let cursor = initial.x;
    for (const [index, raw] of segments.entries()) {
      if (!raw || typeof raw !== "object") throw new TypeError(`segments[${index}] must be an object`);
      if (typeof raw.id !== "string" || !raw.id.trim() || ids.has(raw.id)) throw new TypeError(`segments[${index}].id must be unique and non-empty`);
      ids.add(raw.id);
      const width = finite(raw.width, `segments[${index}].width`, Number.EPSILON, 1e7);
      if (typeof raw.groundAt !== "function") throw new TypeError(`segments[${index}].groundAt must be a function`);
      for (const key of ["drawBackground", "drawActor", "drawForeground", "drawSeam"]) if (raw[key] !== undefined && typeof raw[key] !== "function") throw new TypeError(`segments[${index}].${key} must be a function`);
      if (raw.clip !== undefined && typeof raw.clip !== "function") throw new TypeError(`segments[${index}].clip must be a function`);
      if (raw.actorAt !== undefined && typeof raw.actorAt !== "function") throw new TypeError(`segments[${index}].actorAt must be a function`);
      const x0 = direction === 1 ? cursor : cursor - width;
      const x1 = direction === 1 ? cursor + width : cursor;
      const segment = { ...raw, width, x0, x1, index, direction, entryX: direction === 1 ? x0 : x1, exitX: direction === 1 ? x1 : x0 };
      laidOut.push(segment);
      cursor = direction === 1 ? x1 : x0;
    }

    const tolerance = finite(options.groundTolerance === undefined ? 0 : options.groundTolerance, "groundTolerance", 0, 10000);
    const groundAt = (segment, x) => finite(segment.groundAt(x, { segment, viewport: view }), `${segment.id}.groundAt(${x})`);
    for (let index = 1; index < laidOut.length; index += 1) {
      const previous = laidOut[index - 1], next = laidOut[index];
      const boundary = previous.exitX;
      const before = groundAt(previous, boundary), after = groundAt(next, boundary);
      if (Math.abs(before - after) > tolerance) throw new RangeError(`ground discontinuity at ${previous.id}/${next.id}: ${before} vs ${after} (tolerance ${tolerance})`);
    }
    if (initial.x !== laidOut[0].entryX) throw new RangeError("start.x must be the entry boundary of the first segment");

    const phases = [];
    let time = 0;
    for (const segment of laidOut) {
      if (segment.interactions !== undefined && !Array.isArray(segment.interactions)) throw new TypeError(`${segment.id}.interactions must be an array`);
      const interactions = (segment.interactions || []).map((interaction, index) => {
        if (!interaction || typeof interaction !== "object") throw new TypeError(`${segment.id}.interactions[${index}] must be an object`);
        const at = finite(interaction.at, `${segment.id}.interactions[${index}].at`, 0, segment.width);
        const duration = finite(interaction.duration, `${segment.id}.interactions[${index}].duration`, Number.EPSILON, 1e7);
        if (interaction.poseAt !== undefined && typeof interaction.poseAt !== "function") throw new TypeError(`${segment.id}.interactions[${index}].poseAt must be a function`);
        return { ...interaction, at, duration, index };
      }).sort((a, b) => a.at - b.at || a.index - b.index);
      let previousDistance = 0;
      for (const interaction of interactions) {
        if (interaction.at < previousDistance) throw new RangeError(`${segment.id} interactions are not ordered`);
        const walkDuration = (interaction.at - previousDistance) / speed;
        if (walkDuration > 0) {
          phases.push({ kind: "walk", segment, from: previousDistance, to: interaction.at, startSec: time, endSec: time + walkDuration });
          time += walkDuration;
        }
        phases.push({ kind: "interaction", segment, from: interaction.at, to: interaction.at, interaction, startSec: time, endSec: time + interaction.duration });
        time += interaction.duration;
        previousDistance = interaction.at;
      }
      const walkDuration = (segment.width - previousDistance) / speed;
      if (walkDuration > 0) {
        phases.push({ kind: "walk", segment, from: previousDistance, to: segment.width, startSec: time, endSec: time + walkDuration });
        time += walkDuration;
      }
    }
    const durationSec = time;
    if (!(durationSec > 0)) throw new RangeError("world duration must be positive");

    function positionAt(segment, distance, phase, atSec) {
      const x = segment.entryX + direction * distance;
      const progress = segment.width ? distance / segment.width : 1;
      const defaultPoint = { x, y: groundAt(segment, x) };
      const custom = segment.actorAt ? segment.actorAt({ distance, progress, x, time: atSec, phase, viewport: view, segment }) : null;
      return custom === null || custom === undefined ? defaultPoint : point(custom, `${segment.id}.actorAt`);
    }

    function stateAt(atSec) {
      finite(atSec, "time", 0, durationSec);
      let phase = phases.find((entry) => atSec >= entry.startSec && atSec < entry.endSec);
      if (!phase) phase = phases[phases.length - 1];
      let distance;
      if (phase.kind === "walk") {
        const progress = (atSec - phase.startSec) / (phase.endSec - phase.startSec);
        distance = phase.from + (phase.to - phase.from) * Math.max(0, Math.min(1, progress));
      } else distance = phase.from;
      const actor = positionAt(phase.segment, distance, phase, atSec);
      if (atSec === 0) actor.y = initial.y;
      const state = {
        time: atSec,
        durationSec,
        mode: atSec === durationSec ? "end" : phase.kind,
        segmentId: phase.segment.id,
        segmentIndex: phase.segment.index,
        distance,
        progress: distance / phase.segment.width,
        localTime: atSec - phase.startSec,
        interaction: phase.interaction ? {
          id: phase.interaction.id || null,
          index: phase.interaction.index,
          progress: Math.max(0, Math.min(1, (atSec - phase.startSec) / phase.interaction.duration)),
          duration: phase.interaction.duration,
          pose: phase.interaction.poseAt ? phase.interaction.poseAt(atSec - phase.startSec, atSec) : null,
        } : null,
        actor,
        segment: phase.segment,
      };
      state.earnedItems = earnedItemsAt ? earnedItemsAt(state, laidOut) : [];
      if (!Array.isArray(state.earnedItems)) throw new TypeError("earnedItemsAt must return an array");
      state.camera = point(camera(state, view), "camera result");
      return state;
    }

    function layout() {
      return {
        viewport: { ...view }, start: { ...initial }, speed, direction, scale, durationSec,
        segments: laidOut.map(({ id, width, x0, x1, entryX, exitX, index }) => ({ id, width, x0, x1, entryX, exitX, index })),
        phases: phases.map(({ kind, segment, from, to, interaction, startSec, endSec }) => ({ kind, segmentId: segment.id, from, to, interactionId: interaction?.id || null, startSec, endSec })),
      };
    }

    function draw(context, atSec) {
      if (!context || typeof context.save !== "function" || typeof context.restore !== "function" || typeof context.transform !== "function" || typeof context.beginPath !== "function" || typeof context.rect !== "function" || typeof context.clip !== "function") throw new TypeError("draw requires a 2D Canvas context");
      const state = stateAt(atSec);
      const frameFor = (segment) => ({ state, segment, viewport: view, scale, camera: state.camera, time: state.time, globalTime: state.time, localTime: state.localTime, mode: state.mode, interaction: state.interaction, earnedItems: state.earnedItems, actor: state.actor, world: layout() });
      const viewportWorld = { x: state.camera.x, y: state.camera.y, width: view.width / scale, height: view.height / scale };
      const worldBounds = laidOut.map((segment) => ({ x: segment.x0, y: viewportWorld.y, width: segment.width, height: viewportWorld.height, segment })).filter((bounds) => intersection(bounds, viewportWorld));

      context.save();
      try {
        context.transform(scale, 0, 0, scale, -state.camera.x * scale, -state.camera.y * scale);
        for (const bounds of worldBounds) {
          const segment = bounds.segment;
          if (!segment.drawBackground) continue;
          context.save();
          context.beginPath(); context.rect(bounds.x, bounds.y, bounds.width, bounds.height); context.clip();
          segment.drawBackground(context, frameFor(segment));
          context.restore();
        }
        const actorRect = actorBounds(state.actor, state, view);
        if (!actorRect || typeof actorRect !== "object") throw new TypeError("actorBounds must return a rectangle");
        const rect = { x: finite(actorRect.x, "actorBounds.x"), y: finite(actorRect.y, "actorBounds.y"), width: finite(actorRect.width, "actorBounds.width", Number.EPSILON), height: finite(actorRect.height, "actorBounds.height", Number.EPSILON) };
        for (const bounds of worldBounds) {
          const segment = bounds.segment;
          if (!segment.drawActor || !intersection(rect, bounds)) continue;
          context.save();
          context.beginPath();
          if (segment.clip) segment.clip(context, frameFor(segment), bounds);
          else context.rect(bounds.x, bounds.y, bounds.width, bounds.height);
          context.clip();
          segment.drawActor(context, frameFor(segment));
          context.restore();
        }
        for (const bounds of worldBounds) {
          const segment = bounds.segment;
          if (!segment.drawForeground) continue;
          context.save(); context.beginPath(); context.rect(bounds.x, bounds.y, bounds.width, bounds.height); context.clip();
          segment.drawForeground(context, frameFor(segment));
          context.restore();
        }
        for (let index = 1; index < laidOut.length; index += 1) {
          const segment = laidOut[index];
          if (!segment.drawSeam) continue;
          const boundary = direction === 1 ? segment.x0 : segment.x1;
          const seamRect = { x: boundary, y: viewportWorld.y, width: 1, height: viewportWorld.height };
          if (!intersection(seamRect, viewportWorld)) continue;
          segment.drawSeam(context, { ...frameFor(segment), boundary, previous: laidOut[index - 1] });
        }
      } finally { context.restore(); }
      return state;
    }

    return Object.freeze({ layout, stateAt, draw });
  }

  return { createLongScroll };
});
