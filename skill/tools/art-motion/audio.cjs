"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { assertKeys, fail, resolveInside } = require("../../scripts/contract-utils.cjs");

const SCOPE = "art-motion audio";
const MAX_DURATION_SEC = 60;
const MAX_EVENTS = 128;

function finite(value, label, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) fail(SCOPE, `${label} must be between ${min} and ${max}`);
}

function rngFrom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function validateEvents(events, sampleRate) {
  if (!Array.isArray(events) || events.length < 1 || events.length > MAX_EVENTS) fail(SCOPE, `events must contain 1..${MAX_EVENTS} sound cues`);
  const ids = new Set();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index], label = `events[${index}]`;
    const allowed = ["id", "atSec", "durationSec", "type", "frequencyHz", "gain", "pan", "attackSec", "releaseSec", "partials", "modRatio", "modIndex", "feedback", "cutoffHz", "cutoffEndHz", "echoDelaySec", "echoFeedback", "echoes", "alignment"];
    assertKeys(event, ["id", "atSec", "durationSec", "type"], allowed, label, SCOPE);
    if (typeof event.id !== "string" || !event.id.trim() || ids.has(event.id)) fail(SCOPE, `${label}.id must be unique and non-empty`);
    ids.add(event.id);
    finite(event.atSec, `${label}.atSec`, 0, MAX_DURATION_SEC);
    finite(event.durationSec, `${label}.durationSec`, 0.005, 20);
    if (!["tone", "fm", "pluck", "metal", "noise-sweep"].includes(event.type)) fail(SCOPE, `${label}.type must be tone, fm, pluck, metal or noise-sweep`);
    finite(event.gain ?? 0.2, `${label}.gain`, 0, 1);
    finite(event.pan ?? 0, `${label}.pan`, -1, 1);
    finite(event.attackSec ?? 0.005, `${label}.attackSec`, 0, 10);
    finite(event.releaseSec ?? Math.min(0.15, event.durationSec * 0.4), `${label}.releaseSec`, 0, 10);
    if ((event.attackSec ?? 0.005) + (event.releaseSec ?? Math.min(0.15, event.durationSec * 0.4)) > event.durationSec) fail(SCOPE, `${label} attackSec + releaseSec may not exceed durationSec`);
    if (["tone", "fm", "pluck", "metal"].includes(event.type)) {
      finite(event.frequencyHz, `${label}.frequencyHz`, 20, Math.min(12000, sampleRate / 2 - 1));
    }
    if (["tone", "metal"].includes(event.type) && event.frequencyHz !== undefined) {
      const defaultRatios = event.type === "metal" ? [1, 2.76, 5.4] : [1, 2, 3];
      const maxRatio = event.partials ? Math.max(...event.partials.map((partial) => partial.ratio)) : Math.max(...defaultRatios);
      if (event.frequencyHz * maxRatio >= sampleRate / 2) fail(SCOPE, `${label} partials exceed Nyquist for ${sampleRate} Hz; lower the fundamental or partial ratios`);
    }
    if (event.type === "fm") { finite(event.modRatio ?? 2, `${label}.modRatio`, 0.1, 16); finite(event.modIndex ?? 2, `${label}.modIndex`, 0, 24); }
    if (event.type === "fm" && event.frequencyHz * (1 + (event.modIndex ?? 2) * (event.modRatio ?? 2)) >= sampleRate / 2) fail(SCOPE, `${label} FM sidebands exceed the conservative Nyquist bound for ${sampleRate} Hz; reduce frequency, modRatio or modIndex`);
    if (event.type === "pluck") finite(event.feedback ?? 0.994, `${label}.feedback`, 0.7, 0.9999);
    if (["tone", "metal"].includes(event.type) && event.partials !== undefined) {
      if (!Array.isArray(event.partials) || !event.partials.length || event.partials.length > 32) fail(SCOPE, `${label}.partials must contain 1..32 partials`);
      event.partials.forEach((partial, partIndex) => {
        assertKeys(partial, ["ratio", "gain"], ["ratio", "gain", "decaySec"], `${label}.partials[${partIndex}]`, SCOPE);
        finite(partial.ratio, `${label}.partials[${partIndex}].ratio`, 0.1, 32); finite(partial.gain, `${label}.partials[${partIndex}].gain`, 0, 2);
        if (event.frequencyHz * partial.ratio >= sampleRate / 2) fail(SCOPE, `${label}.partials[${partIndex}] exceeds Nyquist; remove or lower that partial`);
        if (partial.decaySec !== undefined) finite(partial.decaySec, `${label}.partials[${partIndex}].decaySec`, 0.005, 60);
      });
    }
    if (event.type === "noise-sweep") {
      finite(event.cutoffHz, `${label}.cutoffHz`, 30, Math.min(20000, sampleRate / 2 - 1)); finite(event.cutoffEndHz ?? event.cutoffHz, `${label}.cutoffEndHz`, 30, Math.min(20000, sampleRate / 2 - 1));
    }
    if (event.cutoffHz !== undefined && event.type !== "noise-sweep") finite(event.cutoffHz, `${label}.cutoffHz`, 30, Math.min(20000, sampleRate / 2 - 1));
    if (event.echoDelaySec !== undefined || event.echoFeedback !== undefined || event.echoes !== undefined) {
      finite(event.echoDelaySec, `${label}.echoDelaySec`, 0.005, 10); finite(event.echoFeedback, `${label}.echoFeedback`, 0, 0.9); finite(event.echoes, `${label}.echoes`, 1, 8);
      if (!Number.isInteger(event.echoes)) fail(SCOPE, `${label}.echoes must be an integer`);
    }
    if (event.alignment !== undefined) {
      assertKeys(event.alignment, ["basis", "requestedAtSec", "scheduledAtSec", "deltaSec", "aligned"], ["basis", "requestedAtSec", "scheduledAtSec", "deltaSec", "aligned"], `${label}.alignment`, SCOPE);
      if (!["beat", "event"].includes(event.alignment.basis) || typeof event.alignment.aligned !== "boolean") fail(SCOPE, `${label}.alignment is invalid`);
      for (const key of ["requestedAtSec", "scheduledAtSec", "deltaSec"]) finite(event.alignment[key], `${label}.alignment.${key}`, -MAX_DURATION_SEC, MAX_DURATION_SEC);
    }
  }
}

function alignCuesToGrid(events, grid, options) {
  assertKeys(options, ["basis", "toleranceSec", "onExceed"], ["basis", "toleranceSec", "onExceed"], "options", SCOPE);
  if (!grid || grid.schema !== "design-pipeline.score-grid.v1" || !Array.isArray(grid.beats) || !Array.isArray(grid.events)) fail(SCOPE, "grid must be an existing design-pipeline.score-grid.v1 score-grid.json");
  if (!["beat", "event"].includes(options.basis)) fail(SCOPE, "basis must be beat or event");
  finite(options.toleranceSec, "toleranceSec", 0, 10);
  if (!["reject", "leave-unsnapped"].includes(options.onExceed)) fail(SCOPE, "onExceed must be reject or leave-unsnapped");
  const points = options.basis === "beat" ? grid.beats : grid.events.map((event) => event.atSec);
  if (!points.length || points.some((point) => !Number.isFinite(point) || point < 0)) fail(SCOPE, `score grid has no valid ${options.basis} positions`);
  return events.map((event) => {
    const target = points.reduce((best, point) => Math.abs(point - event.atSec) < Math.abs(best - event.atSec) ? point : best, points[0]);
    const deltaSec = target - event.atSec;
    if (Math.abs(deltaSec) > options.toleranceSec) {
      if (options.onExceed === "reject") fail(SCOPE, `cue ${event.id} is ${Math.abs(deltaSec).toFixed(4)}s from its nearest ${options.basis}; tolerance is ${options.toleranceSec}s`);
      return { ...event, alignment: { basis: options.basis, requestedAtSec: event.atSec, scheduledAtSec: event.atSec, deltaSec: 0, aligned: false } };
    }
    return { ...event, atSec: target, alignment: { basis: options.basis, requestedAtSec: event.atSec, scheduledAtSec: target, deltaSec: Number(deltaSec.toFixed(6)), aligned: true } };
  });
}

function envelope(t, duration, attack, release) {
  if (attack > 0 && t < attack) return t / attack;
  if (release > 0 && t > duration - release) return Math.max(0, (duration - t) / release);
  return 1;
}

function renderEvent(event, sampleRate, random) {
  const count = Math.max(1, Math.round(event.durationSec * sampleRate));
  const samples = new Float32Array(count), attack = event.attackSec ?? 0.005;
  const release = event.releaseSec ?? Math.min(0.15, event.durationSec * 0.4);
  const gain = event.gain ?? 0.2, frequency = event.frequencyHz;
  const partials = event.partials ?? (event.type === "metal" ? [{ ratio: 1, gain: 1, decaySec: event.durationSec * 0.55 }, { ratio: 2.76, gain: 0.55, decaySec: event.durationSec * 0.24 }, { ratio: 5.4, gain: 0.28, decaySec: event.durationSec * 0.14 }] : [{ ratio: 1, gain: 1 }, { ratio: 2, gain: 0.28 }, { ratio: 3, gain: 0.12 }]);
  if (event.type === "pluck") {
    const delay = Math.max(2, Math.min(4096, Math.round(sampleRate / frequency))), ring = Float32Array.from({ length: delay }, () => random() * 2 - 1), feedback = event.feedback ?? 0.994;
    let cursor = 0;
    for (let i = 0; i < count; i += 1) {
      const current = ring[cursor], next = ring[(cursor + 1) % delay];
      ring[cursor] = (current + next) * 0.5 * feedback;
      samples[i] = current * envelope(i / sampleRate, event.durationSec, attack, release) * gain;
      cursor = (cursor + 1) % delay;
    }
  } else if (event.type === "noise-sweep") {
    let filtered = 0;
    const start = event.cutoffHz, end = event.cutoffEndHz ?? start;
    for (let i = 0; i < count; i += 1) {
      const t = i / sampleRate, progress = t / event.durationSec, cutoff = start * (end / start) ** progress;
      const coefficient = 1 - Math.exp(-2 * Math.PI * cutoff / sampleRate);
      filtered += coefficient * (random() * 2 - 1 - filtered);
      samples[i] = filtered * envelope(t, event.durationSec, attack, release) * gain;
    }
  } else {
    const cutoff = event.cutoffHz;
    for (let i = 0; i < count; i += 1) {
      const t = i / sampleRate, env = envelope(t, event.durationSec, attack, release);
      let sample = 0;
      if (event.type === "fm") {
        const modulatorPhase = 2 * Math.PI * frequency * (event.modRatio ?? 2) * t;
        sample = Math.sin(2 * Math.PI * frequency * t + (event.modIndex ?? 2) * env * Math.sin(modulatorPhase));
      } else {
        for (const partial of partials) {
          const decay = partial.decaySec === undefined ? 1 : Math.exp(-t / partial.decaySec);
          sample += partial.gain * decay * Math.sin(2 * Math.PI * frequency * partial.ratio * t);
        }
        sample /= Math.max(1, partials.reduce((sum, item) => sum + item.gain, 0));
      }
      samples[i] = sample * env * gain;
    }
  }
  if (event.type === "pluck" && event.cutoffHz !== undefined) {
    const coefficient = 1 - Math.exp(-2 * Math.PI * event.cutoffHz / sampleRate);
    let filtered = 0;
    for (let i = 0; i < samples.length; i += 1) { filtered += coefficient * (samples[i] - filtered); samples[i] = filtered; }
  } else if (["tone", "fm", "metal"].includes(event.type) && event.cutoffHz !== undefined) {
    const coefficient = 1 - Math.exp(-2 * Math.PI * event.cutoffHz / sampleRate);
    let filtered = 0;
    for (let i = 0; i < samples.length; i += 1) { filtered += coefficient * (samples[i] - filtered); samples[i] = filtered; }
  }
  return samples;
}

function renderCues(options) {
  assertKeys(options, ["durationSec", "events"], ["durationSec", "events", "sampleRate", "seed"], "options", SCOPE);
  finite(options.durationSec, "durationSec", 0.01, MAX_DURATION_SEC);
  const sampleRate = options.sampleRate ?? 48000, seed = options.seed ?? 1;
  finite(sampleRate, "sampleRate", 8000, 96000); finite(seed, "seed", 0, 0xffffffff);
  if (!Number.isInteger(sampleRate) || !Number.isInteger(seed)) fail(SCOPE, "sampleRate and seed must be integers");
  validateEvents(options.events, sampleRate);
  if (options.events.some((event) => event.atSec >= options.durationSec)) fail(SCOPE, "every cue must start before the requested output duration");
  const frameCount = Math.ceil(options.durationSec * sampleRate);
  if (frameCount > 5_760_000) fail(SCOPE, "render exceeds 5,760,000 frames; shorten duration or reduce sample rate");
  const left = new Float32Array(frameCount), right = new Float32Array(frameCount), random = rngFrom(seed);
  const events = [...options.events].sort((a, b) => a.atSec - b.atSec || a.id.localeCompare(b.id));
  for (const event of events) {
    const start = Math.round(event.atSec * sampleRate), dry = renderEvent(event, sampleRate, random);
    const panPosition = event.pan ?? 0, pan = (panPosition + 1) * Math.PI / 4;
    const leftGain = panPosition === 1 ? 0 : Math.cos(pan), rightGain = panPosition === -1 ? 0 : Math.sin(pan);
    const delay = event.echoDelaySec === undefined ? 0 : Math.round(event.echoDelaySec * sampleRate), echoes = event.echoes ?? 0, feedback = event.echoFeedback ?? 0;
    for (let repeat = 0; repeat <= echoes; repeat += 1) {
      const offset = start + repeat * delay;
      if (offset >= frameCount) break;
      const level = repeat === 0 ? 1 : feedback ** repeat;
      const length = Math.min(dry.length, frameCount - offset);
      for (let i = 0; i < length; i += 1) { left[offset + i] += dry[i] * level * leftGain; right[offset + i] += dry[i] * level * rightGain; }
    }
  }
  let peak = 0;
  for (let i = 0; i < frameCount; i += 1) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  if (peak > 0.999) fail(SCOPE, `mix peak ${peak.toFixed(4)} would clip; lower cue gains or change the arrangement`);
  return { sampleRate, channels: 2, frameCount, durationSec: frameCount / sampleRate, peak, events, left, right };
}

function encodeWav24(audio) {
  if (!audio || !(audio.left instanceof Float32Array) || !(audio.right instanceof Float32Array)) fail(SCOPE, "internal PCM channels are required");
  const dataBytes = audio.left.length * 6, header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + dataBytes, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
  header.writeUInt32LE(audio.sampleRate, 24); header.writeUInt32LE(audio.sampleRate * 6, 28); header.writeUInt16LE(6, 32); header.writeUInt16LE(24, 34);
  header.write("data", 36); header.writeUInt32LE(dataBytes, 40);
  const body = Buffer.alloc(dataBytes);
  let offset = 0;
  for (let i = 0; i < audio.left.length; i += 1) for (const channel of [audio.left[i], audio.right[i]]) {
    let value = Math.round(Math.max(-1, Math.min(1, channel)) * 8388607);
    if (value < 0) value += 0x1000000;
    body[offset++] = value & 0xff; body[offset++] = (value >>> 8) & 0xff; body[offset++] = (value >>> 16) & 0xff;
  }
  return Buffer.concat([header, body]);
}

function writeCueWav(rootInput, outputRelative, options) {
  const root = fs.realpathSync(rootInput), output = resolveInside(root, outputRelative, "output", { scope: SCOPE });
  if (fs.existsSync(output)) fail(SCOPE, `output already exists: ${outputRelative}`);
  const rendered = renderCues(options), wav = encodeWav24(rendered);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, wav, { flag: "wx" });
  return { path: path.relative(root, output).split(path.sep).join("/"), bytes: wav.length, sampleRate: rendered.sampleRate, channels: 2, durationSec: rendered.durationSec, peak: rendered.peak, cueIds: rendered.events.map((event) => event.id) };
}

module.exports = { alignCuesToGrid, encodeWav24, renderCues, writeCueWav };
