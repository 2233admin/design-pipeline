"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");
const { sha256 } = require("../skill/scripts/contract-utils.cjs");
const { decodePng } = require("../skill/scripts/png-core.cjs");
const { analyzeVideo, checkVideoAnalysis, localMotionCandidates, probeVideoSource, resolveVideoObservation } = require("../skill/scripts/reference-video-core.cjs");

const available = ["ffmpeg", "ffprobe"].every(bin => spawnSync(bin, ["-version"], { windowsHide: true }).status === 0);

test("local prominence retains a later transition despite a sustained busy opening", () => {
  const motion = Array.from({ length: 144 }, (_, i) => ({ atSec: i / 12, share: i < 96 ? .9 : .03 }));
  motion[123].share = .35;
  const candidates = localMotionCandidates(motion, 0, 12);
  assert.ok(candidates.some(row => row.atSec === 10.25), "the lower later peak remains eligible against its local baseline");
  assert.ok(candidates.length <= 12, "candidate count is bounded per inspection window rather than by global top eight");
  assert.deepEqual(localMotionCandidates(motion.map(row => ({ ...row, share: .9 })), 0, 12), [], "a sustained flat change profile is not itself a local peak");
});

test("local eligibility does not rank a high-baseline strong change below a weaker quiet-background peak", () => {
  // Rounded measured Ado profile around the 12.1s transition. All three peaks are
  // locally prominent; sorting only by prominence selected 12.5 and 13.1 instead.
  const shares = [.5165, .3872, .4119, .4565, .4717, .4878, .7137, .4992, .4931, .2081, .5781, .5424, .0428, .2399, .2147, .4149, .6992, .6087, .4716, .3531, .4758, .5613];
  const motion = shares.map((share, i) => ({ atSec: (115 + i) / 10, share }));
  const candidates = localMotionCandidates(motion, 10, 14).filter(row => row.atSec >= 12);
  assert.deepEqual(candidates.map(row => row.atSec), [12.1, 13.1]);
  assert.equal(candidates.length, 2, "preserving the stronger change does not enlarge the per-window candidate budget");
});

test("video sampling uses decoded VFR timestamps and exposes ordered windows without claiming observation", { skip: !available }, t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reference-video-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const created = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=size=64x48:rate=10:duration=3", "-vf", "select='not(mod(n,3))+eq(n,1)'", "-fps_mode", "vfr", "-c:v", "ffv1", "-output_ts_offset", "2", path.join(root, "input.mkv")], { windowsHide: true, encoding: "utf8" });
  assert.equal(created.status, 0, created.stderr);
  const sampled = analyzeVideo(root, { path: "input.mkv", output: "analysis", sampleFps: 12 });
  const reportPath = path.join(root, sampled.descriptor.path);
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.ok(report.timeOriginSec > 0);
  assert.deepEqual(probeVideoSource(root, "input.mkv").source, report.source);
  assert.ok(report.frames.length > 2);
  assert.ok(report.frames.some((frame, i) => i > 0 && Math.abs(frame.atSec - report.frames[i - 1].atSec - .1) > .01));
  for (const frame of report.frames) {
    assert.ok(Math.abs(frame.atSec + report.timeOriginSec - frame.sourcePtsSec) < 1e-6);
    assert.equal(sha256(fs.readFileSync(path.join(root, frame.path))), frame.sha256);
  }
  assert.ok(report.segments.length >= 2);
  const viewer = fs.readFileSync(path.join(root, "analysis", "index.html"), "utf8");
  assert.match(viewer, /source pixels/);
  assert.match(viewer, /0\.000000s/);
  const empty = checkVideoAnalysis(root, sampled.descriptor, report.source);
  assert.equal(empty.status, "pending");
  assert.deepEqual(empty.unobservedSegments, report.segments.map(segment => segment.id));

  const observe = segment => ({ id: `obs-${segment.id}`, target: "subject", property: "motion.translation", startSec: segment.startSec, endSec: segment.endSec, startState: "First sampled state", endState: "Last sampled state", frameIds: segment.frameIds.slice(0, 2), basis: "unknown", description: "These samples are insufficient to identify the exact source motion.", uncertainties: ["Motion between these sampled frames remains unobserved."] });
  const save = () => { fs.writeFileSync(reportPath, JSON.stringify(report)); return { path: sampled.descriptor.path, sha256: sha256(fs.readFileSync(reportPath)) }; };
  report.observations = [observe(report.segments[0])];
  assert.equal(checkVideoAnalysis(root, save(), report.source).status, "pending", "one observed window cannot complete the full clip");
  report.observations = report.segments.map(observe);
  const descriptor = save();
  const reviewed = checkVideoAnalysis(root, descriptor, report.source);
  assert.equal(reviewed.status, "pending", "unknown motion is a recorded gap, not completed observation");
  assert.equal(reviewed.semanticAcceptance, "not-assessed");
  assert.ok(reviewed.unknownObservations.length > 0);
  assert.deepEqual(reviewed.unobservedSegments, report.segments.map(segment => segment.id));
  assert.equal(reviewed.nextActions[0].windowId, report.segments[0].id);
  assert.deepEqual(reviewed.nextActions[0].frameIds, report.segments[0].frameIds);
  assert.equal(reviewed.nextActions[0].resample.args.includes("input.mkv"), true);
  assert.deepEqual(reviewed.nextActions[0].targets, [{ target: "subject", property: "motion.translation", basis: "unknown" }]);

  report.observations = [{ ...observe(report.segments[0]), id: "whole-clip-motion", startSec: 0, endSec: report.durationSec, basis: "observed", frameIds: [report.frames[0].id, report.frames.at(-1).id], description: "The subject moves between the source endpoints.", uncertainties: [] }];
  assert.equal(checkVideoAnalysis(root, save(), report.source).status, "pending", "whole-clip endpoints cannot prove motion inside each window");
  report.observations = report.segments.map(segment => ({ ...observe(segment), basis: "inferred" }));
  assert.equal(checkVideoAnalysis(root, save(), report.source).status, "pending", "inference cannot substitute for local observed evidence");
  report.observations = report.segments.map(segment => ({ ...observe(segment), basis: "observed", description: "The subject changes position between these two local frames.", uncertainties: [] }));
  const locallyObserved = checkVideoAnalysis(root, save(), report.source);
  assert.equal(locallyObserved.status, "ready");
  assert.deepEqual(locallyObserved.nextActions, []);
  assert.equal(locallyObserved.semanticAcceptance, "not-assessed");
  assert.equal(checkVideoAnalysis(root, descriptor, { ...report.source, path: "some-other-video.mkv" }).status, "blocked");

  report.frames[0].sourcePtsSec += .05;
  report.frames[0].atSec += .05;
  assert.equal(checkVideoAnalysis(root, save(), report.source).status, "blocked", "a rehashed report cannot invent decoded PTS");
  report.frames[0].sourcePtsSec -= .05;
  report.frames[0].atSec -= .05;
  const validDescriptor = save();
  fs.appendFileSync(path.join(root, report.frames[0].path), "changed");
  assert.equal(checkVideoAnalysis(root, validDescriptor, report.source).status, "blocked");
});

test("local resampling reports partial coverage and budget-limited sampling stays pending", { skip: !available }, t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reference-video-local-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const created = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=size=32x24:rate=50:duration=3", "-c:v", "ffv1", path.join(root, "input.mkv")], { windowsHide: true, encoding: "utf8" });
  assert.equal(created.status, 0, created.stderr);
  const manyFrames = analyzeVideo(root, { path: "input.mkv", output: "many-frames", sampleFps: 40 });
  assert.ok(manyFrames.report.frames.length > 100, "large exact-index selections must not exceed the ffmpeg expression parser's depth");
  const sampled = analyzeVideo(root, { path: "input.mkv", output: "local", startSec: .5, endSec: 1.5, sampleFps: 12, maxFrames: 3 });
  const reportPath = path.join(root, sampled.descriptor.path), report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const originalReportBytes = fs.readFileSync(reportPath);
  assert.throws(() => analyzeVideo(root, { path: "input.mkv", output: "local" }), /new or empty directory/);
  assert.deepEqual(fs.readFileSync(reportPath), originalReportBytes, "prior analysis bytes are preserved");
  assert.equal(report.sampling.budgetLimited, true);
  assert.equal(report.frames.length, 3);
  assert.ok(report.frames.every(frame => frame.atSec >= .5 && frame.atSec <= 1.5));
  report.observations = report.segments.map(segment => ({ id: segment.id, target: "subject", property: "geometry.contour", startSec: segment.startSec, endSec: segment.endSec, startState: "First sampled shape", endState: "Last sampled shape", frameIds: segment.frameIds, basis: "observed", description: "The sampled outline changes.", uncertainties: [] }));
  fs.writeFileSync(reportPath, JSON.stringify(report));
  const checked = checkVideoAnalysis(root, { path: sampled.descriptor.path, sha256: sha256(fs.readFileSync(reportPath)) }, report.source);
  assert.equal(checked.status, "pending");
  assert.equal(checked.coverage.fullSource, false);
  assert.ok(checked.reasons.includes("sampling-budget-limited"));
  assert.ok(checked.nextActions.some(action => action.kind === "resample-budget" && action.resample.args.includes("--max-frames")), "budget failure needs a recovery action even after every window is observed");
  assert.ok(checked.nextActions.some(action => action.kind === "prepare-full-source"), "local evidence must identify the remaining full-source preparation");
  assert.throws(() => analyzeVideo(root, { path: "input.mkv", output: "../outside" }), /contained/);
  assert.throws(() => analyzeVideo(root, { path: "input.mkv", output: "local", startSec: 2, endSec: 1 }), /range/);
});

test("high-fps change candidates retain source/24fps context before filling the frame budget", { skip: !available }, t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reference-video-candidate-"));
  t.after(() => { assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir())); fs.rmSync(root, { recursive: true, force: true }); });
  const created = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=black:s=64x48:r=120:d=4", "-vf", "drawbox=x=0:y=0:w=iw:h=ih:color=white:t=fill:enable='between(t,1.3,1.45)'", "-c:v", "ffv1", path.join(root, "pulse.mkv")], { windowsHide: true, encoding: "utf8" });
  assert.equal(created.status, 0, created.stderr);
  const sampled = analyzeVideo(root, { path: "pulse.mkv", output: "analysis", sampleFps: 4, maxFrames: 20 });
  const report = sampled.report;
  assert.ok(report.candidateCutsSec.some(at => Math.abs(at - 1.3) < .01));
  const around = [1.1, 1.3 - 2 / 24, 1.3, 1.3 + 2 / 24, 1.5].map(at => report.frames.find(frame => Math.abs(frame.atSec - at) <= 1 / 120));
  assert.ok(around.every(Boolean), "the whole 0.4s candidate sequence survives the tight budget");
  assert.ok(around[4].atSec - around[0].atSec >= .39);
  assert.equal(around[0].sha256, around[4].sha256, "the before and after pixels are both black");
  assert.notEqual(around[0].sha256, around[2].sha256, "the middle source frame contains the white pulse");
  assert.equal(report.frames[0].sourceFrameIndex, 0);
  assert.equal(report.frames.at(-1).sourceFrameIndex, 479);
  assert.ok(report.segments.every(segment => new Set(segment.frameIds.map(id => report.frames.find(frame => frame.id === id).atSec)).size >= 2));
  assert.ok(report.frames.length <= 20);
  assert.ok(report.frames.some(frame => Math.abs(frame.atSec - (1.3 + 1 / 24)) <= 1 / 120), "context contains the 24fps intermediate state instead of only 0.1s samples");
  assert.equal(report.sampling.budgetLimited, true);
  const reduced = analyzeVideo(root, { path: "pulse.mkv", output: "reduced", sampleFps: 4, maxFrames: 4 }).report;
  assert.ok(reduced.sampling.limitations.some(message => /candidate/i.test(message) && /--start/.test(message) && /--end/.test(message) && /--fps 24/.test(message)), "a candidate omitted as a whole must have concrete local resampling parameters");
  assert.ok(reduced.segments.every(segment => new Set(segment.frameIds.map(id => reduced.frames.find(frame => frame.id === id).atSec)).size >= 2));
});

test("motion maps show local sampled pixel change, bind to window frames and invalidate when altered or missing", { skip: !available }, t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reference-video-motion-map-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const created = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=black:s=640x480:r=8:d=2", "-vf", "drawbox=x=40:y=120:w=120:h=120:color=white:t=fill:enable='lt(t,1)',drawbox=x=360:y=120:w=120:h=120:color=white:t=fill:enable='gte(t,1)'", "-c:v", "ffv1", path.join(root, "moving-square.mkv")], { windowsHide: true, encoding: "utf8" });
  assert.equal(created.status, 0, created.stderr);
  const sampled = analyzeVideo(root, { path: "moving-square.mkv", output: "analysis", sampleFps: 4 });
  const reportPath = path.join(root, sampled.descriptor.path), report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(report.motionMaps.length, report.segments.length);
  for (const map of report.motionMaps) {
    const segment = report.segments.find(row => row.id === map.segmentId);
    assert.deepEqual(map.frameIds, segment.frameIds, "maps must use only their own ordered segment samples");
    assert.equal(map.pairCount, map.frameIds.length - 1);
    assert.ok(map.width <= 320 && map.height <= 180);
    assert.match(map.limits, /Pixel changes only/);
  }
  const firstMap = report.motionMaps[0], mapPath = path.join(root, firstMap.path), mapBytes = fs.readFileSync(mapPath);
  assert.equal(firstMap.width, 240); assert.equal(firstMap.height, 180, "thumbnail preserves source aspect without enlarging it");
  const pixels = decodePng(mapBytes).data;
  let changed = 0, black = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] || pixels[i + 1] || pixels[i + 2]) changed++;
    else black++;
  }
  assert.ok(changed > 0, "moving source geometry should produce visible heatmap pixels");
  assert.ok(changed < black, "unchanged background remains black, keeping the change spatially localized");
  const windowHtml = fs.readFileSync(path.join(root, report.segments[0].viewerPath), "utf8");
  assert.match(windowHtml, /Sampled pixel-change map/);
  assert.match(windowHtml, /camera movement, cuts and texture flicker can contribute/);
  const descriptor = { path: sampled.descriptor.path, sha256: sha256(fs.readFileSync(reportPath)) };
  const checked = checkVideoAnalysis(root, descriptor, report.source);
  assert.notEqual(checked.status, "blocked");
  assert.equal(checked.nextActions[0].motionMap.path, firstMap.path);
  assert.equal(checked.nextActions[0].motionMap.mimeType, "image/png");

  const reordered = structuredClone(report);
  reordered.segments[0].frameIds.reverse(); reordered.motionMaps[0].frameIds.reverse();
  fs.writeFileSync(reportPath, JSON.stringify(reordered));
  assert.throws(() => checkVideoAnalysis(root, { path: descriptor.path, sha256: sha256(fs.readFileSync(reportPath)) }, report.source), /decoded source order/);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  descriptor.sha256 = sha256(fs.readFileSync(reportPath));

  fs.writeFileSync(mapPath, Buffer.concat([mapBytes, Buffer.from("changed")]));
  assert.equal(checkVideoAnalysis(root, descriptor, report.source).reasons[0], "video-motion-map-hash-mismatch");
  fs.writeFileSync(mapPath, mapBytes);
  fs.unlinkSync(mapPath);
  assert.equal(checkVideoAnalysis(root, descriptor, report.source).reasons[0], "video-motion-map-missing");

  delete report.motionMaps;
  fs.writeFileSync(reportPath, JSON.stringify(report));
  const legacy = checkVideoAnalysis(root, { path: sampled.descriptor.path, sha256: sha256(fs.readFileSync(reportPath)) }, report.source);
  assert.equal(legacy.status, "pending", "a v1 report written before motionMaps remains readable");
});

test("production inventory requires every declared shot property and resolves only matching observed evidence", { skip: !available }, t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reference-video-production-"));
  t.after(() => { assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir())); fs.rmSync(root, { recursive: true, force: true }); });
  const created = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=blue:s=32x24:r=24:d=2", "-threads", "1", "-c:v", "ffv1", path.join(root, "input.mkv")], { windowsHide: true, encoding: "utf8" });
  assert.equal(created.status, 0, created.stderr);
  const sampled = analyzeVideo(root, { path: "input.mkv", output: "analysis" }), report = sampled.report;
  const file = path.join(root, sampled.descriptor.path);
  const save = (value = report) => { fs.writeFileSync(file, JSON.stringify(value)); return { path: sampled.descriptor.path, sha256: sha256(fs.readFileSync(file)) }; };
  const own = (start, end) => report.frames.filter(frame => frame.atSec >= start && frame.atSec < end).map(frame => frame.id);
  const observation = (id, target, property, start, end, frameIds) => ({ id, target, property, startSec: start, endSec: end, frameIds, startState: "Visible first local state", endState: "Visible last local state", basis: "observed", description: "Authored local observation for evidence-contract testing, not automatic pixel recognition.", uncertainties: [] });
  const a = own(0, 1), b = own(1, 2);
  report.observations = [observation("logo-a", "logo", "geometry.contour", 0, 1, a.slice(0, 1)), observation("logo-b", "logo", "geometry.contour", 1, 2, b.slice(0, 1))];
  const legacy = save();
  assert.equal(checkVideoAnalysis(root, legacy, report.source).status, "ready", "historical inspection remains readable without shots");
  const needsInventory = checkVideoAnalysis(root, legacy, report.source, { requireProduction: true });
  assert.equal(needsInventory.status, "pending");
  assert.deepEqual(needsInventory.reasons, ["video-production-inventory-missing"]);
  assert.equal(needsInventory.nextActions[0].kind, "confirm-shots");
  assert.ok(needsInventory.nextActions[0].images.every(image => image.mimeType === "image/png"));
  report.shots = [
    { id: "shot-a", startSec: 0, endSec: 1, frameIds: a, targets: [{ target: "logo", properties: ["geometry.contour"] }, { target: "camera", properties: ["motion.translation"] }] },
    { id: "shot-b", startSec: 1, endSec: 2, frameIds: b, targets: [{ target: "logo", properties: ["geometry.contour"] }, { target: "camera", properties: ["motion.translation"] }] },
  ];
  const missing = checkVideoAnalysis(root, save(), report.source, { requireProduction: true });
  assert.equal(missing.status, "pending", "one observed logo does not complete the declared camera property");
  assert.deepEqual(missing.unobservedProperties, [
    { shotId: "shot-a", target: "camera", property: "motion.translation" },
    { shotId: "shot-b", target: "camera", property: "motion.translation" },
  ]);
  assert.equal(missing.nextActions[0].kind, "observe-shot-property");
  assert.deepEqual(missing.nextActions[0].images.map(frame => frame.id), a);
  report.observations.push(observation("camera-a", "camera", "motion.translation", 0, 1, a.slice(0, 2)), observation("camera-b", "camera", "motion.translation", 1, 2, b.slice(0, 2)));
  const valid = structuredClone(report);
  const ready = checkVideoAnalysis(root, save(), report.source, { requireProduction: true });
  assert.equal(ready.status, "ready"); assert.equal(ready.semanticAcceptance, "not-assessed");
  const binding = { report: sampled.descriptor.path, shotId: "shot-a", observationIds: ["logo-a"] }, cache = new Map();
  const resolved = resolveVideoObservation(root, binding, { target: "logo", property: "geometry.contour", cache });
  assert.deepEqual(resolved.shot, report.shots[0]);
  assert.deepEqual(resolved.observations.map(item => item.id), ["logo-a"]);
  assert.deepEqual(resolved.frames.map(item => item.id), [a[0]]);
  assert.deepEqual(resolved.source, report.source); assert.equal(cache.size, 1);
  assert.throws(() => resolveVideoObservation(root, binding, { target: "camera", property: "motion.translation", cache }), /target\/property/);
  assert.throws(() => resolveVideoObservation(root, { ...binding, shotId: "shot-b" }, { target: "logo", property: "geometry.contour", cache }), /inside shot-b/);
  assert.throws(() => resolveVideoObservation(root, { ...binding, observationIds: ["absent"] }, { target: "logo", property: "geometry.contour", cache }), /unknown observation/);
  assert.throws(() => resolveVideoObservation(root, { ...binding, observationIds: [] }, { target: "logo", property: "geometry.contour" }), /at least 1/);
  assert.throws(() => resolveVideoObservation(root, { ...binding, observationIds: ["logo-a", "logo-a"] }, { target: "logo", property: "geometry.contour" }), /unique/);
  assert.throws(() => resolveVideoObservation(root, { ...binding, report: "../outside.json" }, { target: "logo", property: "geometry.contour" }), /contained/);
  const changed = structuredClone(valid); changed.observations[0].description = "Updated observed contour context."; save(changed);
  assert.equal(resolveVideoObservation(root, binding, { target: "logo", property: "geometry.contour", cache }).observations[0].description, changed.observations[0].description, "a report edit cannot reuse the prior cached report hash");
  for (const mutate of [
    value => { value.shots[1].startSec = 1.1; },
    value => { value.shots[1].id = "shot-a"; },
    value => { value.shots[0].frameIds = [b.at(-1)]; },
    value => { value.shots[0].frameIds.reverse(); },
    value => { value.shots[0].targets[0].properties = ["geometry"]; },
    value => { value.shots[0].targets.push(value.shots[0].targets[0]); },
  ]) {
    const invalid = structuredClone(valid); mutate(invalid);
    assert.throws(() => checkVideoAnalysis(root, save(invalid), report.source, { requireProduction: true }), /shot|properties|target/i);
  }
  const inferred = structuredClone(valid); inferred.observations[2].basis = "inferred"; inferred.observations[2].uncertainties = ["Camera cause is uncertain."];
  assert.equal(checkVideoAnalysis(root, save(inferred), report.source, { requireProduction: true }).status, "pending");
  const reversedMotion = structuredClone(valid); reversedMotion.observations[2].frameIds.reverse();
  assert.equal(checkVideoAnalysis(root, save(reversedMotion), report.source, { requireProduction: true }).unobservedProperties.some(item => item.shotId === "shot-a" && item.target === "camera"), true, "motion evidence must preserve source frame order");
  const crossShot = structuredClone(valid); crossShot.observations[0].endSec = 1.5; crossShot.observations[0].frameIds = [b[0]];
  assert.equal(checkVideoAnalysis(root, save(crossShot), report.source, { requireProduction: true }).unobservedProperties.some(item => item.shotId === "shot-a" && item.target === "logo"), true, "frames from another shot cannot prove this shot's property");
  const staticGraphic = structuredClone(valid);
  staticGraphic.shots = [{ id: "static", startSec: 0, endSec: 2, frameIds: report.frames.map(frame => frame.id), targets: [{ target: "logo", properties: ["geometry.contour"] }] }];
  staticGraphic.observations = staticGraphic.observations.slice(0, 2);
  assert.equal(checkVideoAnalysis(root, save(staticGraphic), report.source, { requireProduction: true }).status, "ready", "static geometry does not invent other property categories");
  save(valid);
  fs.appendFileSync(path.join(root, report.source.path), "changed source");
  assert.throws(() => resolveVideoObservation(root, binding, { target: "logo", property: "geometry.contour", cache: new Map() }), /video-source-hash-mismatch/);
});
