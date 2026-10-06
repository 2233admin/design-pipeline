"use strict";

// Input-reference sampling and evidence validation. Pixel differences suggest inspection;
// they cannot identify objects, materials, actions or creative acceptance.
const fs = require("node:fs");
const path = require("node:path");
const { assertKeys, assertString, assertStringArray, fail, pngDimensions, readJson, resolveInside, sha256 } = require("./contract-utils.cjs");
const { run, probe, detectCuts, motionProfile } = require("./film-core.cjs");
const { encodePng } = require("./png-core.cjs");
const { sampleImage, motionMap } = require("../tools/visual-diagnostics/diagnostics.cjs");
const SCOPE = "video reference";
const HASH = /^[a-f0-9]{64}$/i;
const EPS = 1e-6;
const PROPERTY = /^(geometry|material|lighting|motion)(\.[a-zA-Z][a-zA-Z0-9_.-]*)?$/;
const ATOMIC_PROPERTY = /^(geometry|material|lighting|motion)\.[a-zA-Z][a-zA-Z0-9_.-]*$/;
const MOTION_LIMITS = "Pixel changes only; camera movement, cuts and texture flicker can contribute, while low sample cadence can miss motion. This map does not identify objects or establish motion, semantic or aesthetic acceptance.";

function relativePath(value, label) {
  assertString(value, label, SCOPE);
  if (path.isAbsolute(value) || /^[a-z]:/i.test(value) || value.includes("\\") || value.split("/").some(part => !part || part === "." || part === "..")) fail(SCOPE, `${label} must be a contained relative path`);
}

function digest(value, label) { if (typeof value !== "string" || !HASH.test(value)) fail(SCOPE, `${label} must be a SHA-256 digest`); }
function number(value, label, minimum = 0) { if (!Number.isFinite(value) || value < minimum) fail(SCOPE, `${label} must be a finite number >= ${minimum}`); }
function positive(value, label) { number(value, label); if (value === 0) fail(SCOPE, `${label} must be positive`); }
function relative(root, file) { return path.relative(root, file).split(path.sep).join("/"); }
function contained(root, file, label) { relativePath(file, label); return resolveInside(root, file, label, { scope: SCOPE }); }
function sourceBytes(root, file) { return require("./reference-evidence-core.cjs").resolveContainedReference(root, file, "video source"); }
function escape(value) { return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }

function decodedTimeline(file, tools) {
  const info = JSON.parse(run(tools.ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_frames", "-show_entries", "stream=width,height,duration:frame=best_effort_timestamp_time,pkt_duration_time", "-of", "json", file]).stdout);
  const stream = info.streams?.[0];
  if (!stream || !Number.isInteger(stream.width) || !Number.isInteger(stream.height)) fail(SCOPE, "source has no measurable video stream");
  const frames = (info.frames || []).map((frame, sourceFrameIndex) => ({ sourcePtsSec: Number(frame.best_effort_timestamp_time), durationSec: Number(frame.pkt_duration_time || 0), sourceFrameIndex }));
  if (!frames.length || frames.some(frame => !Number.isFinite(frame.sourcePtsSec))) fail(SCOPE, "source frames must have decoded presentation timestamps");
  if (frames.length > 1000000) fail(SCOPE, "source exceeds the 1,000,000-frame inspection budget; inspect a shorter source clip");
  if (frames.some((frame, i) => i > 0 && frame.sourcePtsSec < frames[i - 1].sourcePtsSec)) fail(SCOPE, "decoded presentation timestamps are out of order");
  const timeOriginSec = frames[0].sourcePtsSec;
  return { width: stream.width, height: stream.height, streamDurationSec: Number(stream.duration), timeOriginSec, frames: frames.map(frame => ({ ...frame, atSec: frame.sourcePtsSec - timeOriginSec })) };
}

function sourceDuration(timeline, media) {
  const last = timeline.frames[timeline.frames.length - 1];
  if (Number.isFinite(timeline.streamDurationSec) && timeline.streamDurationSec > last.atSec) return timeline.streamDurationSec;
  if (last.durationSec > 0) return last.atSec + last.durationSec;
  return Math.max(last.atSec, media.durationSec - Math.max(0, timeline.timeOriginSec));
}

function probeVideoSource(rootInput, file, options = {}) {
  const root = fs.realpathSync(rootInput);
  relativePath(file, "path");
  const resolved = sourceBytes(root, file), tools = { ffprobe: options.tools?.ffprobe || "ffprobe" };
  const media = probe(resolved.path, tools), timeline = decodedTimeline(resolved.path, tools);
  const durationSec = sourceDuration(timeline, media);
  positive(durationSec, "durationSec");
  return { source: { path: resolved.relativePath, kind: "video", width: timeline.width, height: timeline.height, sha256: resolved.sha256 }, durationSec, nominalFps: media.fps, timeOriginSec: timeline.timeOriginSec };
}

function nearest(frames, atSec) {
  let lo = 0, hi = frames.length - 1;
  while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (frames[mid].atSec < atSec) lo = mid + 1; else hi = mid; }
  if (lo > 0 && Math.abs(frames[lo - 1].atSec - atSec) <= Math.abs(frames[lo].atSec - atSec)) lo--;
  return frames[lo];
}

function evenly(items, count) {
  if (items.length <= count) return items;
  return Array.from({ length: count }, (_, index) => items[Math.round(index * (items.length - 1) / (count - 1))]);
}

function localMotionCandidates(motion, startSec, endSec) {
  // A busy opening must not set the threshold for the rest of the film. Compare each
  // peak with its half-second neighbourhood, then retain up to two separated peaks
  // in each 2s inspection window. These are pixel-change hints, never shot labels.
  let left = 0, right = 0;
  const peaks = motion.map((row, index) => {
    while (left < motion.length && motion[left].atSec < row.atSec - .5 - EPS) left++;
    while (right < motion.length && motion[right].atSec <= row.atSec + .5 + EPS) right++;
    const neighbours = motion.slice(left, right).filter(other => Math.abs(other.atSec - row.atSec) > .1);
    const shares = neighbours.map(other => other.share).sort((a, b) => a - b);
    const baseline = shares.length ? shares[Math.floor((shares.length - 1) / 4)] : 0;
    const prominence = row.share - baseline;
    const previous = motion[index - 1], next = motion[index + 1];
    return { row, prominence, eligible: row.share > .02 && prominence > Math.max(.01, baseline * .25)
      && (!previous || row.share >= previous.share) && (!next || row.share >= next.share) };
  }).filter(peak => peak.eligible);
  const selected = [], windows = new Map();
  for (const peak of peaks) {
    if (peak.row.atSec < startSec || peak.row.atSec > endSec) continue;
    const window = Math.floor((peak.row.atSec - startSec) / 2);
    if (!windows.has(window)) windows.set(window, []);
    windows.get(window).push(peak);
  }
  for (const own of windows.values()) {
    // Local prominence admits a peak; measured change ranks admitted peaks. Ranking
    // only by the baseline difference can discard a stronger transition on a busy
    // background in favour of a weaker one after the background has gone quiet.
    own.sort((a, b) => b.row.share - a.row.share || b.prominence - a.prominence || a.row.atSec - b.row.atSec);
    const local = [];
    for (const peak of own) {
      if (local.some(other => Math.abs(other.atSec - peak.row.atSec) <= .2 + EPS)) continue;
      local.push(peak.row);
      if (local.length === 2) break;
    }
    selected.push(...local);
  }
  return selected.sort((a, b) => a.atSec - b.atSec);
}

function frameSelection(frames) {
  if (frames.length === 1) return `eq(n,${frames[0].sourceFrameIndex})`;
  // FFmpeg rejects a long unparenthesized sum at its expression parser's depth limit.
  const middle = Math.floor(frames.length / 2);
  return `(${frameSelection(frames.slice(0, middle))})+(${frameSelection(frames.slice(middle))})`;
}

function viewer(root, file, title, frames, navigation = "", diagnostic) {
  const image = frame => {
    const src = escape(relative(path.dirname(file), path.join(root, frame.path)));
    return `<figure><a href="${src}" target="_blank"><img src="${src}" alt="${escape(frame.id)} at ${frame.atSec.toFixed(6)}s"></a><figcaption>${escape(frame.id)} · ${frame.atSec.toFixed(6)}s · source PTS ${frame.sourcePtsSec.toFixed(6)} · source frame ${frame.sourceFrameIndex}<br><a href="${src}" target="_blank">Open source pixels</a></figcaption></figure>`;
  };
  const mapView = diagnostic === undefined ? "" : diagnostic
    ? `<section><h2>Sampled pixel-change map</h2><p>${escape(diagnostic.limits)}</p><figure><a href="${escape(relative(path.dirname(file), path.join(root, diagnostic.path)))}" target="_blank"><img src="${escape(relative(path.dirname(file), path.join(root, diagnostic.path)))}" alt="Sampled pixel-change heatmap for ${escape(diagnostic.segmentId)}"></a><figcaption>${diagnostic.pairCount} adjacent sampled frame pairs · ${diagnostic.width}×${diagnostic.height} px</figcaption></figure></section>`
    : `<section><h2>Sampled pixel-change map unavailable</h2><p>This window has fewer than two distinct sampled frames. Resample this interval to compare pixels.</p></section>`;
  fs.writeFileSync(file, `<!doctype html><meta charset="utf-8"><title>${escape(title)}</title><style>body{font:15px system-ui;background:#17191d;color:#eee;margin:24px}a{color:#9dd8ff}.frames{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}figure{margin:0}img{width:100%;height:auto}figcaption{padding:8px 0;font-variant-numeric:tabular-nums}</style><h1>${escape(title)}</h1><p>These are sampled source frames, not a complete animation or verified interpretation. Read each ordered window, then record per-object geometry, material, lighting and motion; identify observations, inferences and unknowns separately. Click any image to inspect original dimensions.</p>${navigation}${mapView}<div class="frames">${frames.map(image).join("")}</div>`);
}

function analyzeVideo(rootInput, options = {}) {
  const root = fs.realpathSync(rootInput);
  relativePath(options.path, "path");
  const source = sourceBytes(root, options.path);
  const tools = { ffmpeg: options.tools?.ffmpeg || "ffmpeg", ffprobe: options.tools?.ffprobe || "ffprobe" };
  const media = probe(source.path, tools), timeline = decodedTimeline(source.path, tools);
  const durationSec = sourceDuration(timeline, media);
  positive(durationSec, "durationSec");
  const startSec = options.startSec === undefined ? 0 : Number(options.startSec);
  const endSec = options.endSec === undefined ? durationSec : Number(options.endSec);
  const sampleFps = options.sampleFps === undefined ? 4 : Number(options.sampleFps);
  const maxFrames = options.maxFrames === undefined ? 160 : Number(options.maxFrames);
  number(startSec, "startSec"); positive(endSec, "endSec"); positive(sampleFps, "sampleFps");
  if (sampleFps > 60 || !Number.isInteger(maxFrames) || maxFrames < 2 || maxFrames > 400) fail(SCOPE, "sampleFps must be <= 60 and maxFrames an integer from 2 to 400");
  if (startSec >= endSec || endSec > durationSec + EPS) fail(SCOPE, "sampling range must be inside source duration with start < end");
  const output = options.output || "video-analysis";
  const directory = contained(root, output, "output");
  if (directory === source.path || path.dirname(source.path) === path.join(directory, "frames")) fail(SCOPE, "output must not replace the source");
  if (fs.existsSync(directory) && (!fs.statSync(directory).isDirectory() || fs.readdirSync(directory).length)) fail(SCOPE, "output must be a new or empty directory; retain previous sampling versions");
  const inside = timeline.frames.filter(frame => frame.atSec >= startSec - EPS && frame.atSec <= endSec + EPS);
  if (!inside.length) fail(SCOPE, "sampling range contains no decoded frames");
  const requestedFrames = Math.ceil((endSec - startSec) * sampleFps) + 1;
  const selected = new Map();
  // ponytail: timestamp index is in memory; streaming the index is needed above this source-frame budget.
  const scheduleCount = Math.min(requestedFrames, maxFrames);
  const regular = new Map();
  for (let i = 0; i < scheduleCount; i++) { const frame = nearest(inside, startSec + i * (endSec - startSec) / (scheduleCount - 1)); regular.set(frame.atSec, frame); }
  const candidateCutsSec = detectCuts(source.path, tools, .3).filter(at => at >= startSec && at <= endSec);
  const motion = motionProfile(source.path, tools).filter(row => row.atSec >= startSec && row.atSec <= endSec);
  const motionCandidates = localMotionCandidates(motion, startSec, endSec);
  const contextFps = Math.min(24, media.fps);
  const minimum = new Map([[inside[0].atSec, inside[0]], [inside.at(-1).atSec, inside.at(-1)]]), windows = [];
  for (let begin = startSec; begin < endSec - EPS; begin += 2) {
    const end = Math.min(begin + 2, endSec);
    const own = inside.filter(frame => frame.atSec >= begin - EPS && (frame.atSec < end - EPS || end === endSec && frame.atSec <= end + EPS));
    windows.push({ startSec: begin, endSec: end, frames: own });
    if (own.length) { minimum.set(own[0].atSec, own[0]); minimum.set(own.at(-1).atSec, own.at(-1)); }
  }
  let budgetLimited = requestedFrames > maxFrames || minimum.size > maxFrames;
  const sequenceLimitations = [];
  for (const frame of evenly([...minimum.values()].sort((a, b) => a.sourceFrameIndex - b.sourceFrameIndex), maxFrames)) selected.set(frame.atSec, frame);
  // Cluster nearby hints for inspection while preserving every original cut/peak in the report.
  const candidateCenters = [];
  for (const at of [...candidateCutsSec, ...motionCandidates.map(row => row.atSec)].sort((a, b) => a - b)) if (!candidateCenters.some(center => Math.abs(center - at) <= .2 + EPS)) candidateCenters.push(at);
  for (const at of candidateCenters) {
    // Use source cadence up to 24fps inside a 0.4s neighbourhood. The nearest
    // decoded PTS is evidence; requested times are never interpolated frames.
    const group = new Map();
    const offsets = new Set([-.2, 0, .2]);
    for (let n = -Math.floor(.2 * contextFps); n <= Math.floor(.2 * contextFps); n++) offsets.add(n / contextFps);
    for (const offset of [...offsets].sort((a, b) => a - b)) { const frame = nearest(inside, Math.max(startSec, Math.min(endSec, at + offset))); group.set(frame.atSec, frame); }
    const additional = [...group.values()].filter(frame => !selected.has(frame.atSec));
    if (additional.length <= maxFrames - selected.size) for (const frame of additional) selected.set(frame.atSec, frame);
    else {
      budgetLimited = true;
      sequenceLimitations.push(`Candidate sequence around ${at.toFixed(6)}s was omitted as a whole because the remaining frame budget could not preserve it. Inspect --start ${Math.max(startSec, at - .2).toFixed(6)} --end ${Math.min(endSec, at + .2).toFixed(6)} --fps ${contextFps} --output <new-dir>.`);
    }
  }
  const remaining = [...regular.values()].filter(frame => !selected.has(frame.atSec)).sort((a, b) => a.sourceFrameIndex - b.sourceFrameIndex);
  const capacity = maxFrames - selected.size;
  if (remaining.length > capacity) budgetLimited = true;
  const fillers = capacity === 1 && remaining.length ? [remaining[Math.floor(remaining.length / 2)]] : capacity > 1 ? evenly(remaining, capacity) : [];
  for (const frame of fillers) selected.set(frame.atSec, frame);
  for (const window of windows) if (new Set(window.frames.filter(frame => selected.has(frame.atSec)).map(frame => frame.atSec)).size < 2) {
    budgetLimited = true;
    sequenceLimitations.push(`Window ${window.startSec.toFixed(6)}–${window.endSec.toFixed(6)}s lacks two distinct sampled source times. Inspect --start ${window.startSec.toFixed(6)} --end ${window.endSec.toFixed(6)} --fps 12 --output <new-dir>; the source cadence may itself provide insufficient distinct states.`);
  }
  const chosen = [...selected.values()].sort((a, b) => a.sourceFrameIndex - b.sourceFrameIndex);
  const frameDirectory = resolveInside(root, path.join(directory, "frames"), "frame output", { scope: SCOPE });
  const windowDirectory = resolveInside(root, path.join(directory, "windows"), "window output", { scope: SCOPE });
  fs.mkdirSync(frameDirectory, { recursive: true }); fs.mkdirSync(windowDirectory, { recursive: true });
  for (let i = 1; i <= chosen.length; i++) resolveInside(root, path.join(frameDirectory, `frame-${String(i).padStart(6, "0")}.png`), "sampled frame output", { scope: SCOPE });
  run(tools.ffmpeg, ["-v", "error", "-y", "-threads", "2", "-filter_threads", "1", "-i", source.path, "-map", "0:v:0", "-an", "-sn", "-vf", `select='${frameSelection(chosen)}'`, "-fps_mode", "passthrough", "-frames:v", String(chosen.length), "-start_number", "1", "-threads", "1", path.join(frameDirectory, "frame-%06d.png")]);
  const frames = chosen.map((frame, i) => {
    const file = resolveInside(root, path.join(frameDirectory, `frame-${String(i + 1).padStart(6, "0")}.png`), "sampled frame", { scope: SCOPE, mustExist: true });
    return { id: `frame-${String(i + 1).padStart(6, "0")}`, path: relative(root, file), sha256: sha256(fs.readFileSync(file)), atSec: frame.atSec, sourcePtsSec: frame.sourcePtsSec, sourceFrameIndex: frame.sourceFrameIndex };
  });
  // Resize the already selected PNG sequence in the existing native decoder. Scanning every
  // full-resolution pixel again in JS would multiply 4K input work by up to 400 frames.
  const firstSize = pngDimensions(fs.readFileSync(contained(root, frames[0].path, "first sampled frame")));
  if (!firstSize) fail(SCOPE, "sampled frame is not a PNG");
  const mapScale = Math.min(1, 320 / firstSize.width, 180 / firstSize.height);
  const mapWidth = Math.max(1, Math.round(firstSize.width * mapScale)), mapHeight = Math.max(1, Math.round(firstSize.height * mapScale));
  const mapFrameBytes = mapWidth * mapHeight * 4;
  const mapPixels = run(tools.ffmpeg, ["-v", "error", "-threads", "2", "-filter_threads", "1", "-framerate", "1", "-start_number", "1", "-i", path.join(frameDirectory, "frame-%06d.png"), "-frames:v", String(frames.length), "-vf", `scale=${mapWidth}:${mapHeight}:flags=area`, "-pix_fmt", "rgba", "-threads", "1", "-f", "rawvideo", "pipe:1"], { binary: true }).stdout;
  if (mapPixels.length !== mapFrameBytes * frames.length) fail(SCOPE, "motion thumbnails do not match the selected frame count");
  const mapFrameIndex = new Map(frames.map((frame, i) => [frame.id, i]));
  const segments = [], motionMaps = [], motionMapLimitations = [];
  for (let begin = startSec; begin < endSec - EPS; begin += 2) {
    const end = Math.min(begin + 2, endSec), id = `window-${String(segments.length + 1).padStart(3, "0")}`;
    const own = frames.filter(frame => frame.atSec >= begin - EPS && (frame.atSec < end - EPS || end === endSec && frame.atSec <= end + EPS));
    const file = resolveInside(root, path.join(windowDirectory, `${id}.html`), "window viewer output", { scope: SCOPE });
    const segment = { id, startSec: begin, endSec: end, reason: "ordered-window", frameIds: own.map(frame => frame.id), viewerPath: relative(root, file) };
    segments.push(segment);
    let diagnostic = null;
    if (new Set(own.map(frame => frame.atSec)).size >= 2) {
      // Only this window contributes, without boundary context. At most 400 * 320 * 180 RGBA
      // thumbnails (92.16 MB) are retained; JS processing is independent of source resolution.
      const sampledImages = own.map(frame => {
        const offset = mapFrameIndex.get(frame.id) * mapFrameBytes;
        return sampleImage({ width: mapWidth, height: mapHeight, data: mapPixels.subarray(offset, offset + mapFrameBytes) });
      });
      const result = motionMap(sampledImages);
      if (!Number.isInteger(result.pairCount) || result.pairCount < 1 || result.pairCount !== own.length - 1 || result.image.width > 320 || result.image.height > 180) fail(SCOPE, "motion map output exceeds its bounded frame or image contract");
      const mapFile = resolveInside(root, path.join(windowDirectory, `${id}-motion.png`), "motion map output", { scope: SCOPE });
      const mapBytes = encodePng(result.image);
      fs.writeFileSync(mapFile, mapBytes);
      diagnostic = { segmentId: id, path: relative(root, mapFile), sha256: sha256(mapBytes), frameIds: own.map(frame => frame.id), pairCount: result.pairCount, width: result.image.width, height: result.image.height, limits: MOTION_LIMITS };
      motionMaps.push(diagnostic);
    } else {
      motionMapLimitations.push(`Motion map unavailable for ${id}: fewer than two distinct sampled frames inside this window.`);
    }
    const firstIndex = own.length ? frames.indexOf(own[0]) : frames.findIndex(frame => frame.atSec >= begin);
    const context = frames.slice(Math.max(0, firstIndex - 1), Math.min(frames.length, Math.max(firstIndex, 0) + own.length + 1));
    viewer(root, file, `${id}: ${begin.toFixed(6)}–${end.toFixed(6)}s (with adjacent boundary context)`, context, `<p><a href="../index.html">Overview</a></p>`, diagnostic);
  }
  const viewerFile = resolveInside(root, path.join(directory, "index.html"), "overview output", { scope: SCOPE });
  viewer(root, viewerFile, "Video reference: ordered overview", evenly(frames, 16), `<ol>${segments.map(segment => `<li><a href="windows/${escape(segment.id)}.html">${escape(segment.id)}: ${segment.startSec.toFixed(6)}–${segment.endSec.toFixed(6)}s, ${segment.frameIds.length} ordered samples</a></li>`).join("")}</ol>`);
  fs.writeFileSync(resolveInside(root, path.join(directory, "frames.csv"), "timestamp output", { scope: SCOPE }), `id,atSec,sourcePtsSec,sourceFrameIndex,path,sha256\n${frames.map(frame => [frame.id, frame.atSec, frame.sourcePtsSec, frame.sourceFrameIndex, frame.path, frame.sha256].map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n")}\n`);
  const examplePath = resolveInside(root, path.join(directory, "observation-example.json"), "observation example output", { scope: SCOPE });
  fs.writeFileSync(examplePath, JSON.stringify({ instruction: "Template only. Replace every placeholder after inspecting the named window. Do not copy it as an observed fact. Cover each window per actual object; unknown or inferred entries require uncertainties. Motion needs at least two real frames. Geometry, material, lighting and motion are separate properties.", observation: { id: "replace-with-unique-id", target: "replace-with-visible-object", property: "motion.replace-with-one-property", startSec: segments[0].startSec, endSec: segments[0].endSec, startState: "replace-with-observed-start-state", endState: "replace-with-observed-end-state", frameIds: segments[0].frameIds.slice(0, 2), basis: "unknown", description: "replace-with-what-the-source-shows", uncertainties: ["replace-with-what-is-not-established"] } }, null, 2));
  const report = { source: { path: source.relativePath, kind: "video", width: timeline.width, height: timeline.height, sha256: source.sha256 }, durationSec, nominalFps: media.fps, timeOriginSec: timeline.timeOriginSec, sampling: { startSec, endSec, sampleFps, maxFrames, requestedFrames, emittedFrames: frames.length, budgetLimited, strategy: "pts-nearest-interval", windowSec: 2, limitations: ["Overview is a sparse index; ordered windows remain sampled, not every source frame.", "Cuts and locally prominent pixel-change peaks are inspection candidates, not verified action boundaries.", `Candidate neighborhoods use actual source frames at up to ${contextFps}fps spanning up to 0.4s, clipped to the source interval; source cadence can reduce distinct samples.`, "Object identity, geometry, material, lighting, motion and sound require actual observation.", ...sequenceLimitations, ...motionMapLimitations, ...(budgetLimited ? ["The requested cadence, minimum window coverage or candidate sequence exceeds the available frame budget; narrow the interval and resample."] : []), ...(startSec > 0 || endSec < durationSec - EPS ? ["Only the named interval is sampled; the rest of the source remains unanalyzed."] : [])] }, frames, segments, motionMaps, candidateCutsSec, motionCandidates, observations: [], viewerPath: relative(root, viewerFile) };
  if (sha256(fs.readFileSync(source.path)) !== source.sha256) fail(SCOPE, "source changed during analysis; discard this incomplete sampling and rerun in a new directory");
  const reportFile = resolveInside(root, path.join(directory, "report.json"), "analysis report output", { scope: SCOPE }), temporary = resolveInside(root, `${reportFile}.${process.pid}.${process.hrtime.bigint()}.tmp`, "temporary report output", { scope: SCOPE });
  fs.writeFileSync(temporary, JSON.stringify(report, null, 2)); fs.renameSync(temporary, reportFile);
  return { status: "prepared", report, descriptor: { path: relative(root, reportFile), sha256: sha256(fs.readFileSync(reportFile)) }, viewerPath: report.viewerPath, observationExamplePath: relative(root, examplePath), semanticAcceptance: "not-assessed" };
}

function validateShots(report, frames) {
  if (report.shots === undefined) return;
  if (!Array.isArray(report.shots)) fail(SCOPE, "shots must be an array");
  const ids = new Set();
  for (const [i, shot] of report.shots.entries()) {
    const label = `shots[${i}]`, keys = ["id", "startSec", "endSec", "frameIds", "targets"];
    assertKeys(shot, keys, keys, label, SCOPE); assertString(shot.id, `${label}.id`, SCOPE);
    number(shot.startSec, `${label}.startSec`); positive(shot.endSec, `${label}.endSec`);
    if (ids.has(shot.id) || shot.startSec >= shot.endSec || Math.abs(shot.startSec - (i === 0 ? report.sampling.startSec : report.shots[i - 1].endSec)) > EPS || shot.endSec > report.sampling.endSec + EPS) fail(SCOPE, "shots must have distinct ids and form ordered contiguous coverage inside the sampling range");
    assertStringArray(shot.frameIds, `${label}.frameIds`, SCOPE, { unique: true, min: 1 });
    for (const [n, id] of shot.frameIds.entries()) {
      const frame = frames.get(id);
      if (!frame || frame.atSec < shot.startSec - EPS || frame.atSec > shot.endSec + EPS) fail(SCOPE, `${label} references an absent or out-of-range frame`);
      if (n && frame.sourceFrameIndex <= frames.get(shot.frameIds[n - 1]).sourceFrameIndex) fail(SCOPE, "shot frames must follow decoded source order");
    }
    if (!Array.isArray(shot.targets) || !shot.targets.length) fail(SCOPE, `${label}.targets must be a non-empty inventory`);
    const targets = new Set();
    for (const [n, target] of shot.targets.entries()) {
      const targetLabel = `${label}.targets[${n}]`;
      assertKeys(target, ["target", "properties"], ["target", "properties"], targetLabel, SCOPE);
      assertString(target.target, `${targetLabel}.target`, SCOPE);
      if (targets.has(target.target)) fail(SCOPE, `${label} repeats target ${target.target}`);
      assertStringArray(target.properties, `${targetLabel}.properties`, SCOPE, { unique: true, min: 1 });
      if (target.properties.some(property => !ATOMIC_PROPERTY.test(property) || /(?:^|\.)all$/i.test(property))) fail(SCOPE, `${targetLabel}.properties must name atomic geometry, material, lighting or motion properties`);
      targets.add(target.target);
    }
    ids.add(shot.id);
  }
  if (report.shots.length && Math.abs(report.shots.at(-1).endSec - report.sampling.endSec) > EPS) fail(SCOPE, "shots must cover the whole sampling range");
}

function observationInShot(observation, shot, target, property, frames) {
  if (observation.basis !== "observed" || observation.target !== target || observation.property !== property
    || observation.startSec < shot.startSec - EPS || observation.endSec > shot.endSec + EPS) return false;
  if (!observation.frameIds.every(id => shot.frameIds.includes(id))) return false;
  if (observation.frameIds.some((id, i) => i > 0 && frames.get(id).sourceFrameIndex <= frames.get(observation.frameIds[i - 1]).sourceFrameIndex)) return false;
  return new Set(observation.frameIds.map(id => frames.get(id).atSec)).size >= (/^motion(?:\.|$)/.test(property) ? 2 : 1);
}

function validateReport(root, report) {
  const required = ["source", "durationSec", "nominalFps", "timeOriginSec", "sampling", "frames", "segments", "observations"];
  assertKeys(report, required, [...required, "candidateCutsSec", "motionCandidates", "viewerPath", "motionMaps", "shots"], "report", SCOPE);
  assertKeys(report.source, ["path", "kind", "width", "height", "sha256"], ["path", "kind", "width", "height", "sha256"], "report.source", SCOPE);
  contained(root, report.source.path, "report.source.path"); digest(report.source.sha256, "report.source.sha256");
  if (report.source.kind !== "video" || !Number.isInteger(report.source.width) || report.source.width <= 0 || !Number.isInteger(report.source.height) || report.source.height <= 0) fail(SCOPE, "report.source must identify a video with positive measured dimensions");
  positive(report.durationSec, "durationSec"); positive(report.nominalFps, "nominalFps");
  if (!Number.isFinite(report.timeOriginSec)) fail(SCOPE, "timeOriginSec must be finite");
  const sampleKeys = ["startSec", "endSec", "sampleFps", "maxFrames", "requestedFrames", "emittedFrames", "budgetLimited", "strategy", "windowSec", "limitations"];
  assertKeys(report.sampling, sampleKeys, sampleKeys, "sampling", SCOPE);
  const sampling = report.sampling;
  number(sampling.startSec, "sampling.startSec"); positive(sampling.endSec, "sampling.endSec"); positive(sampling.sampleFps, "sampling.sampleFps"); positive(sampling.windowSec, "sampling.windowSec");
  if (sampling.startSec >= sampling.endSec || sampling.endSec > report.durationSec + EPS || sampling.sampleFps > 60) fail(SCOPE, "sampling range/frequency is invalid");
  for (const key of ["maxFrames", "requestedFrames", "emittedFrames"]) if (!Number.isInteger(sampling[key]) || sampling[key] <= 0) fail(SCOPE, `sampling.${key} must be a positive integer`);
  if (typeof sampling.budgetLimited !== "boolean" || sampling.strategy !== "pts-nearest-interval" || sampling.maxFrames < 2 || sampling.maxFrames > 400 || sampling.emittedFrames > sampling.maxFrames) fail(SCOPE, "sampling budget/strategy is invalid");
  if (sampling.requestedFrames !== Math.ceil((sampling.endSec - sampling.startSec) * sampling.sampleFps) + 1 || sampling.requestedFrames > sampling.maxFrames && !sampling.budgetLimited) fail(SCOPE, "sampling requested-frame count and budget limitation must remain truthful");
  assertStringArray(sampling.limitations, "sampling.limitations", SCOPE, { min: 1 });
  if (!Array.isArray(report.frames) || !report.frames.length || report.frames.length !== sampling.emittedFrames) fail(SCOPE, "frames must match sampling.emittedFrames");
  const frames = new Map(), framePaths = new Set();
  for (const [i, frame] of report.frames.entries()) {
    const keys = ["id", "path", "sha256", "atSec", "sourcePtsSec", "sourceFrameIndex"];
    assertKeys(frame, keys, keys, `frames[${i}]`, SCOPE); assertString(frame.id, "frame.id", SCOPE); contained(root, frame.path, "frame.path"); digest(frame.sha256, "frame.sha256"); number(frame.atSec, "frame.atSec");
    if (!Number.isFinite(frame.sourcePtsSec) || !Number.isInteger(frame.sourceFrameIndex) || frame.sourceFrameIndex < 0 || frame.atSec < sampling.startSec - EPS || frame.atSec > sampling.endSec + EPS || Math.abs(frame.sourcePtsSec - report.timeOriginSec - frame.atSec) > EPS) fail(SCOPE, "frame timing/index is invalid");
    if (frames.has(frame.id) || framePaths.has(frame.path) || i > 0 && (frame.sourceFrameIndex <= report.frames[i - 1].sourceFrameIndex || frame.atSec < report.frames[i - 1].atSec)) fail(SCOPE, "frames must be unique and ordered by decoded source frame");
    frames.set(frame.id, frame); framePaths.add(frame.path);
  }
  if (!Array.isArray(report.segments) || !report.segments.length) fail(SCOPE, "segments must contain ordered windows");
  const segments = new Set(), segmentById = new Map();
  for (const [i, segment] of report.segments.entries()) {
    const keys = ["id", "startSec", "endSec", "reason", "frameIds"];
    assertKeys(segment, keys, [...keys, "viewerPath"], `segments[${i}]`, SCOPE); assertString(segment.id, "segment.id", SCOPE); assertString(segment.reason, "segment.reason", SCOPE);
    number(segment.startSec, "segment.startSec"); positive(segment.endSec, "segment.endSec"); assertStringArray(segment.frameIds, "segment.frameIds", SCOPE, { unique: true });
    if (segments.has(segment.id) || segment.startSec >= segment.endSec || Math.abs(segment.startSec - (i === 0 ? sampling.startSec : report.segments[i - 1].endSec)) > EPS || segment.endSec > sampling.endSec + EPS) fail(SCOPE, "segments must form contiguous windows inside sampling range");
    for (const id of segment.frameIds) { const frame = frames.get(id); if (!frame || frame.atSec < segment.startSec - EPS || frame.atSec > segment.endSec + EPS) fail(SCOPE, "segment references an absent or out-of-range frame"); }
    if (segment.viewerPath) contained(root, segment.viewerPath, "segment.viewerPath");
    segments.add(segment.id); segmentById.set(segment.id, segment);
  }
  if (Math.abs(report.segments[report.segments.length - 1].endSec - sampling.endSec) > EPS) fail(SCOPE, "segments must cover the whole sampling range");
  if (report.motionMaps !== undefined) {
    if (!Array.isArray(report.motionMaps)) fail(SCOPE, "motionMaps must be an array");
    const expected = report.segments.filter(segment => new Set(segment.frameIds.map(id => frames.get(id).atSec)).size >= 2);
    if (report.motionMaps.length !== expected.length) fail(SCOPE, "motionMaps must include exactly one map for each window with two distinct sampled frames");
    const mappedSegments = new Set(), mapPaths = new Set();
    for (const [i, map] of report.motionMaps.entries()) {
      const keys = ["segmentId", "path", "sha256", "frameIds", "pairCount", "width", "height", "limits"];
      assertKeys(map, keys, keys, `motionMaps[${i}]`, SCOPE);
      assertString(map.segmentId, "motionMap.segmentId", SCOPE); relativePath(map.path, "motionMap.path"); digest(map.sha256, "motionMap.sha256");
      const segment = segmentById.get(map.segmentId);
      if (!segment || mappedSegments.has(map.segmentId) || new Set(segment.frameIds.map(id => frames.get(id).atSec)).size < 2) fail(SCOPE, "motion map must belong to one eligible sampling window");
      assertStringArray(map.frameIds, "motionMap.frameIds", SCOPE, { unique: true, min: 2 });
      if (map.frameIds.length !== segment.frameIds.length || map.frameIds.some((id, n) => id !== segment.frameIds[n])) fail(SCOPE, "motion map frameIds must exactly match its window's sampled frames in order");
      if (!Number.isInteger(map.pairCount) || map.pairCount < 1 || map.pairCount !== map.frameIds.length - 1) fail(SCOPE, "motion map pairCount must match adjacent local frame pairs");
      if (!Number.isInteger(map.width) || map.width < 1 || map.width > 320 || !Number.isInteger(map.height) || map.height < 1 || map.height > 180) fail(SCOPE, "motion map dimensions exceed the 320x180 bound");
      assertString(map.limits, "motionMap.limits", SCOPE);
      if (map.frameIds.some((id, n) => n > 0 && frames.get(id).sourceFrameIndex <= frames.get(map.frameIds[n - 1]).sourceFrameIndex)) fail(SCOPE, "motion map frames must follow decoded source order");
      contained(root, map.path, "motionMap.path");
      if (mapPaths.has(map.path) || framePaths.has(map.path)) fail(SCOPE, "motion map paths must be unique and distinct from sampled frames");
      mappedSegments.add(map.segmentId); mapPaths.add(map.path);
    }
  }
  if (!Array.isArray(report.observations)) fail(SCOPE, "observations must be an array");
  const ids = new Set();
  for (const [i, observation] of report.observations.entries()) {
    const keys = ["id", "target", "property", "startSec", "endSec", "startState", "endState", "frameIds", "basis", "description", "uncertainties"];
    assertKeys(observation, keys, keys, `observations[${i}]`, SCOPE);
    for (const key of ["id", "target", "property", "startState", "endState", "description"]) assertString(observation[key], `observation.${key}`, SCOPE);
    if (ids.has(observation.id) || !PROPERTY.test(observation.property) || !["observed", "inferred", "unknown"].includes(observation.basis)) fail(SCOPE, "observation id/property/basis is invalid");
    number(observation.startSec, "observation.startSec"); positive(observation.endSec, "observation.endSec");
    if (observation.startSec >= observation.endSec || observation.startSec < sampling.startSec - EPS || observation.endSec > sampling.endSec + EPS) fail(SCOPE, "observation interval is invalid");
    assertStringArray(observation.frameIds, "observation.frameIds", SCOPE, { unique: true, min: /^motion(?:\.|$)/.test(observation.property) ? 2 : 1 });
    for (const id of observation.frameIds) { const frame = frames.get(id); if (!frame || frame.atSec < observation.startSec - EPS || frame.atSec > observation.endSec + EPS) fail(SCOPE, "observation references an absent or out-of-range frame"); }
    if (/^motion(?:\.|$)/.test(observation.property) && new Set(observation.frameIds.map(id => frames.get(id).atSec)).size < 2) fail(SCOPE, "motion observation must cite two distinct presentation times");
    assertStringArray(observation.uncertainties, "observation.uncertainties", SCOPE, { min: observation.basis === "observed" ? 0 : 1 }); ids.add(observation.id);
  }
  validateShots(report, frames);
  if (report.viewerPath) contained(root, report.viewerPath, "viewerPath");
  if (report.candidateCutsSec !== undefined && (!Array.isArray(report.candidateCutsSec) || report.candidateCutsSec.some(at => !Number.isFinite(at) || at < sampling.startSec || at > sampling.endSec))) fail(SCOPE, "candidateCutsSec must name in-range candidate times");
  if (report.motionCandidates !== undefined) {
    if (!Array.isArray(report.motionCandidates)) fail(SCOPE, "motionCandidates must be an array");
    for (const row of report.motionCandidates) { assertKeys(row, ["atSec", "share"], ["atSec", "share"], "motion candidate", SCOPE); if (!Number.isFinite(row.atSec) || row.atSec < sampling.startSec || row.atSec > sampling.endSec || !Number.isFinite(row.share) || row.share < 0 || row.share > 1) fail(SCOPE, "motion candidate must have a measured in-range time and pixel share"); }
  }
  return report;
}

function checkVideoAnalysis(rootInput, descriptor, source, options = {}) {
  const root = fs.realpathSync(rootInput);
  assertKeys(descriptor, ["path", "sha256"], ["path", "sha256"], "videoAnalysis", SCOPE); digest(descriptor.sha256, "videoAnalysis.sha256");
  const file = contained(root, descriptor.path, "videoAnalysis.path");
  const base = { semanticAcceptance: "not-assessed", unknownObservations: [], unobservedSegments: [], nextActions: [], reasons: [] };
  const blocked = (reason, extra = {}) => ({ ...base, status: "blocked", reasons: [reason], ...extra });
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return blocked("video-analysis-missing");
  if (sha256(fs.readFileSync(file)) !== descriptor.sha256) return blocked("video-analysis-hash-mismatch");
  const report = validateReport(root, readJson(file, SCOPE));
  const coverage = { startSec: report.sampling.startSec, endSec: report.sampling.endSec, fullSource: report.sampling.startSec === 0 && report.sampling.endSec >= report.durationSec - EPS };
  base.coverage = coverage;
  if (source?.kind === "video" && ["path", "width", "height", "sha256"].some(key => source[key] !== report.source[key])) return blocked("video-source-binding-mismatch");
  if (source?.kind === "image" && (!report.frames.some(frame => frame.path === source.path && frame.sha256 === source.sha256) || source.width !== report.source.width || source.height !== report.source.height)) return blocked("video-comparison-frame-binding-mismatch");
  const sourceFile = contained(root, report.source.path, "video source");
  if (!fs.existsSync(sourceFile) || !fs.statSync(sourceFile).isFile()) return blocked("video-source-missing");
  if (sha256(fs.readFileSync(sourceFile)) !== report.source.sha256) return blocked("video-source-hash-mismatch");
  const images = new Map();
  for (const frame of report.frames) {
    const frameFile = contained(root, frame.path, "sampled frame");
    if (!fs.existsSync(frameFile) || !fs.statSync(frameFile).isFile()) return blocked("video-frame-missing", { frameId: frame.id });
    const bytes = fs.readFileSync(frameFile);
    if (sha256(bytes) !== frame.sha256) return blocked("video-frame-hash-mismatch", { frameId: frame.id });
    const dimensions = pngDimensions(bytes);
    if (!dimensions) return blocked("video-frame-unreadable", { frameId: frame.id });
    images.set(frame.id, { ...frame, ...dimensions, mimeType: "image/png" });
  }
  for (const map of report.motionMaps || []) {
    const mapFile = contained(root, map.path, "motion map");
    if (!fs.existsSync(mapFile) || !fs.statSync(mapFile).isFile()) return blocked("video-motion-map-missing", { segmentId: map.segmentId });
    const bytes = fs.readFileSync(mapFile);
    if (sha256(bytes) !== map.sha256) return blocked("video-motion-map-hash-mismatch", { segmentId: map.segmentId });
    const dimensions = pngDimensions(bytes);
    if (!dimensions) return blocked("video-motion-map-unreadable", { segmentId: map.segmentId });
    if (dimensions.width !== map.width || dimensions.height !== map.height || dimensions.width > 320 || dimensions.height > 180) return blocked("video-motion-map-dimensions-mismatch", { segmentId: map.segmentId });
  }
  let actual, measured;
  try { const tools = { ffprobe: "ffprobe" }; actual = decodedTimeline(sourceFile, tools); measured = probe(sourceFile, tools); } catch (error) { return blocked("video-timing-unavailable", { detail: error.message }); }
  if (actual.width !== report.source.width || actual.height !== report.source.height || Math.abs(actual.timeOriginSec - report.timeOriginSec) > EPS || Math.abs(sourceDuration(actual, measured) - report.durationSec) > EPS || Math.abs(measured.fps - report.nominalFps) > EPS) return blocked("video-source-measurement-mismatch");
  for (const frame of report.frames) { const decoded = actual.frames[frame.sourceFrameIndex]; if (!decoded || Math.abs(decoded.sourcePtsSec - frame.sourcePtsSec) > EPS || Math.abs(decoded.atSec - frame.atSec) > EPS) return blocked("video-frame-time-mismatch", { frameId: frame.id }); }
  const missing = report.segments.filter(segment => !report.observations.some(observation => {
    if (observation.basis !== "observed" || observation.startSec >= segment.endSec || observation.endSec <= segment.startSec) return false;
    const localFrames = report.frames.filter(frame => segment.frameIds.includes(frame.id) && observation.frameIds.includes(frame.id));
    return new Set(localFrames.map(frame => frame.atSec)).size >= (/^motion(?:\.|$)/.test(observation.property) ? 2 : 1);
  }));
  const unobservedSegments = missing.map(segment => segment.id);
  const nextActions = missing.map(segment => ({
    kind: "observe-window", windowId: segment.id, reportPath: descriptor.path, startSec: segment.startSec, endSec: segment.endSec,
    frameIds: segment.frameIds, ...(segment.viewerPath ? { viewerPath: segment.viewerPath } : {}),
    images: segment.frameIds.map(id => images.get(id)), source: { ...report.source },
    ...(report.motionMaps?.some(map => map.segmentId === segment.id) ? { motionMap: { ...report.motionMaps.find(map => map.segmentId === segment.id), mimeType: "image/png" } } : {}),
    sourceRange: { startSec: 0, endSec: report.durationSec, timeOriginSec: report.timeOriginSec },
    targets: report.observations.filter(observation => observation.startSec < segment.endSec && observation.endSec > segment.startSec).map(({ target, property, basis }) => ({ target, property, basis })),
    instruction: "Use the host's image viewing tool to inspect the actual PNG inputs in their time order; reading a file path, JSON or the HTML viewer is not evidence of seeing those pixels. This 2s sampling window is not a confirmed source shot. Record one visible target and one property per observation, with local start/end evidence. Keep camera motion separate from object motion; describe visible material changes before inferring their cause. If the interval is unclear, resample it into a new directory.",
    resample: { command: "designer-pipeline", args: ["reference", "analyze-video", "--path", report.source.path, "--start", String(segment.startSec), "--end", String(segment.endSec), "--fps", String(Math.min(60, Math.max(12, report.sampling.sampleFps * 2))), "--output", "<new-evidence-dir>"] },
  }));
  const unobservedProperties = [];
  const inventoryMissing = options.requireProduction === true && !report.shots?.length;
  if (inventoryMissing) nextActions.push({
    kind: "confirm-shots", reportPath: descriptor.path, startSec: report.sampling.startSec, endSec: report.sampling.endSec,
    frameIds: report.frames.map(frame => frame.id), images: report.frames.map(frame => images.get(frame.id)), source: { ...report.source },
    ...(report.viewerPath ? { viewerPath: report.viewerPath } : {}),
    instruction: "Inspect the actual timed source pixels and author shots in this report with confirmed contiguous start/end bounds, local frameIds and targets [{target,properties}]. Sampling windows and pixel-change candidates are not confirmed shots. Inventory every visible production target and its applicable atomic properties; a static graphic need not invent material, lighting or motion. Record unknowns and missing assets in reference.md. Refresh the adopted report hash after editing. Structural completeness does not establish correct recognition or visual acceptance.",
  });
  if (options.requireProduction === true && report.shots?.length) {
    const byId = new Map(report.frames.map(frame => [frame.id, frame]));
    for (const shot of report.shots) for (const target of shot.targets) for (const property of target.properties) {
      if (report.observations.some(observation => observationInShot(observation, shot, target.target, property, byId))) continue;
      unobservedProperties.push({ shotId: shot.id, target: target.target, property });
      nextActions.push({
        kind: "observe-shot-property", shotId: shot.id, target: target.target, property, reportPath: descriptor.path,
        startSec: shot.startSec, endSec: shot.endSec, frameIds: shot.frameIds, images: shot.frameIds.map(id => images.get(id)), source: { ...report.source },
        instruction: `Use the host's image viewing tool to inspect the actual shot-local PNG inputs for ${target.target}'s ${property}. Add an observed record with this exact target/property, an interval inside ${shot.id}, and frames from this shot; motion needs two distinct times. Inference or an observation of another object/property cannot complete this requirement. Refresh videoAnalysis.sha256 and preserve uncertainties and actual findings in reference.md.`,
        resample: { command: "designer-pipeline", args: ["reference", "analyze-video", "--path", report.source.path, "--start", String(shot.startSec), "--end", String(shot.endSec), "--fps", String(Math.min(24, report.nominalFps)), "--output", "<new-evidence-dir>"] },
      });
    }
  }
  if (report.sampling.budgetLimited) nextActions.push({
    kind: "resample-budget", reportPath: descriptor.path, startSec: report.sampling.startSec, endSec: report.sampling.endSec,
    instruction: "This report is budget-limited even if its windows have observations. Reprepare this interval in a new directory with a larger bounded frame budget; inspect the retained limitations. If 400 frames still cannot cover the cadence and candidate sequences, reduce cadence or inspect shorter intervals. Preserve this report and refresh the adopted report binding after actual inspection.",
    limitations: report.sampling.limitations,
    resample: { command: "designer-pipeline", args: ["reference", "analyze-video", "--path", report.source.path, "--start", String(report.sampling.startSec), "--end", String(report.sampling.endSec), "--fps", String(report.sampling.sampleFps), "--max-frames", "400", "--output", "<new-evidence-dir>"] },
  });
  if (!coverage.fullSource) nextActions.push({
    kind: "prepare-full-source", reportPath: descriptor.path, startSec: 0, endSec: report.durationSec,
    instruction: "This report covers only a local interval. Prepare and observe the whole source before completing the reference workflow; retain this local report as detail evidence. A local ready status does not complete the whole-source requirement.",
    resample: { command: "designer-pipeline", args: ["reference", "analyze-video", "--path", report.source.path, "--max-frames", "400", "--output", "<new-evidence-dir>"] },
  });
  const reasons = [...(unobservedSegments.length ? ["video-observations-incomplete"] : []), ...(inventoryMissing ? ["video-production-inventory-missing"] : []), ...(unobservedProperties.length ? ["video-production-properties-incomplete"] : []), ...(report.sampling.budgetLimited ? ["sampling-budget-limited"] : [])];
  return { ...base, status: reasons.length ? "pending" : "ready", reasons, unobservedSegments, unobservedProperties, nextActions, unknownObservations: report.observations.filter(observation => observation.basis === "unknown").map(observation => observation.id), warnings: [...report.sampling.limitations, ...(!coverage.fullSource ? ["Only the declared sampling interval is checked; this is not analysis of the whole source."] : [])] };
}

function resolveVideoObservation(rootInput, binding, options = {}) {
  const root = fs.realpathSync(rootInput);
  assertKeys(binding, ["report", "shotId", "observationIds"], ["report", "shotId", "observationIds"], "sourceObservation", SCOPE);
  assertString(binding.shotId, "sourceObservation.shotId", SCOPE);
  assertStringArray(binding.observationIds, "sourceObservation.observationIds", SCOPE, { unique: true, min: 1 });
  assertString(options.target, "visual target", SCOPE); assertString(options.property, "visual property", SCOPE);
  const file = contained(root, binding.report, "sourceObservation.report");
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(SCOPE, "sourceObservation report is missing");
  const bytes = fs.readFileSync(file), hash = sha256(bytes), key = `${root}\0${binding.report}\0${hash}`;
  // Optional memoization belongs to one synchronous, mutation-free visualContext.
  // Callers must create a fresh Map for every next/decide; never retain it across work.
  const cache = options.cache instanceof Map ? options.cache : null;
  let verified = cache?.get(key);
  if (!verified) {
    const report = readJson(file, SCOPE);
    const checked = checkVideoAnalysis(root, { path: binding.report, sha256: hash }, report.source, { requireProduction: true });
    if (checked.status !== "ready") fail(SCOPE, `sourceObservation report is not production-ready: ${checked.reasons.join(", ")}`);
    verified = { report }; cache?.set(key, verified);
  }
  const report = verified.report, shot = report.shots.find(item => item.id === binding.shotId);
  if (!shot) fail(SCOPE, `sourceObservation names unknown shot ${binding.shotId}`);
  if (!shot.targets.some(item => item.target === options.target && item.properties.includes(options.property))) fail(SCOPE, `sourceObservation shot does not declare ${options.target}'s ${options.property}`);
  const frames = new Map(report.frames.map(frame => [frame.id, frame]));
  const observations = binding.observationIds.map(id => {
    const observation = report.observations.find(item => item.id === id);
    if (!observation) fail(SCOPE, `sourceObservation names unknown observation ${id}`);
    if (!observationInShot(observation, shot, options.target, options.property, frames)) fail(SCOPE, `sourceObservation ${id} must match the target/property and observed time/frame evidence inside ${shot.id}`);
    return observation;
  });
  const selected = new Set(observations.flatMap(observation => observation.frameIds));
  return { shot, observations, frames: report.frames.filter(frame => selected.has(frame.id)), source: report.source };
}

module.exports = { analyzeVideo, checkVideoAnalysis, localMotionCandidates, probeVideoSource, resolveVideoObservation };
