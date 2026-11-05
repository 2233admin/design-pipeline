"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { checkStoryboard, narrationFiles } = require("../skill/scripts/film-core.cjs");
const { HINTS } = require("../skill/scripts/film-hints.cjs");
const { alignNarration, measureSilences, speechSegments } = require("../skill/scripts/voiceover-core.cjs");

const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
const example = path.join(__dirname, "../skill/references/film-choreography/storyboard.example.json");
const tools = { ffmpeg: "ffmpeg", ffprobe: "ffprobe" };
const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { windowsHide: true }).status === 0 && spawnSync("ffprobe", ["-version"], { windowsHide: true }).status === 0;
const hasFlite = hasFfmpeg && /\bflite\b/.test(String(spawnSync("ffmpeg", ["-hide_banner", "-filters"], { encoding: "utf8", windowsHide: true }).stdout));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "film-voiceover-"));
const board = () => JSON.parse(fs.readFileSync(example, "utf8"));
const codes = (result) => result.findings.map((finding) => finding.code);
const cliJson = (args) => {
  const out = spawnSync(process.execPath, [cli, ...args, "--json"], { encoding: "utf8", windowsHide: true });
  return { status: out.status, body: JSON.parse(out.stdout || out.stderr) };
};

// Tone bursts at exact times stand in for spoken words: [startSec, endSec] pairs at 24 kHz mono.
function tones(file, spans, totalSec, extra = "") {
  const gate = spans.map(([start, end]) => `between(t,${start},${end})`).join("+");
  const graph = `aevalsrc='0.5*sin(2*PI*240*t)*(${gate})':s=24000:d=${totalSec}${extra}`;
  const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-filter_complex", graph, "-ac", "1", "-ar", "24000", file], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
}

function narratedProject(spans, totalSec) {
  const dir = tmp();
  const project = path.join(dir, "film");
  fs.mkdirSync(path.join(project, "assets"), { recursive: true });
  fs.writeFileSync(path.join(project, "storyboard.json"), `${JSON.stringify(board(), null, 2)}\n`);
  tones(path.join(project, "assets", "narration.wav"), spans, totalSec);
  return { dir, project };
}

test("phrases split on long pauses; short pauses inside a phrase are word boundaries", () => {
  const silences = [[0, 0.5], [1.2, 1.25], [1.6, 2.1], [2.5, 2.52], [3.0, 3.4]];
  assert.deepEqual(speechSegments(3.4, silences), [[0.5, 1.2], [1.25, 1.6], [2.1, 2.5], [2.52, 3.0]]);
  const { phrases } = alignNarration({ durationSec: 3.4, silences }, { startSec: 1 });
  assert.deepEqual(phrases.map(({ id, atSec, endSec }) => [id, atSec, endSec]), [["vo-01", 1.5, 2.6], ["vo-02", 3.1, 4]]);
  assert.deepEqual(phrases[0].wordBoundariesSec, [2.225]);
  // A 10 ms click inside a pause is not speech.
  const clicked = alignNarration({ durationSec: 3.4, silences: [[0, 0.5], [1.2, 1.5], [1.51, 2.1], [3.0, 3.4]] });
  assert.equal(clicked.phrases.length, 2);
});

test("a script picks its N-1 longest pauses as line breaks and flags a near tie", () => {
  const silences = [[0, 0.2], [1.0, 1.18], [2.0, 2.06], [3.0, 3.17], [4.0, 4.2]];
  const { phrases, ambiguity } = alignNarration({ durationSec: 4.2, silences }, { lines: ["one", "two", "three"] });
  assert.deepEqual(phrases.map((phrase) => [phrase.atSec, phrase.endSec, phrase.text]), [[0.2, 1, "one"], [1.18, 3, "two"], [3.17, 4, "three"]]);
  assert.equal(ambiguity, null, "0.17 s against 0.06 s is a clear break");
  const tie = alignNarration({ durationSec: 4.2, silences: [[0, 0.2], [1.0, 1.18], [2.0, 2.15], [3.0, 3.17], [4.0, 4.2]] }, { lines: ["one", "two", "three"] });
  assert.deepEqual(tie.ambiguity, { weakestBoundarySec: 0.17, longestInnerPauseSec: 0.15 });
  assert.throws(() => alignNarration({ durationSec: 4.2, silences }, { lines: ["a", "b", "c", "d", "e"] }), /PHRASES_UNMATCHED|only 4 stretch/);
});

test("measured phrase times match tone bursts placed at known times, also under a noise floor and at low level", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  const dir = tmp();
  const spans = [[0.5, 1.2], [1.27, 1.6], [2.1, 3.0], [3.5, 4.4]];
  const expected = [[0.5, 1.6], [2.1, 3.0], [3.5, 4.4]];
  const cases = { clean: "", noisy: "", quiet: ",volume=-24dB" };
  for (const [name, extra] of Object.entries(cases)) {
    const file = path.join(dir, `${name}.wav`);
    tones(file, spans, 5, extra);
    if (name === "noisy") {
      const mixed = path.join(dir, "noisy-mixed.wav");
      // Pink noise about 45 dB under the tones' peak fills every pause.
      const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-f", "lavfi", "-i", "anoisesrc=r=24000:a=0.003:c=pink:seed=7", "-filter_complex", "[0][1]amix=inputs=2:duration=first:normalize=0", "-ac", "1", mixed], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      fs.renameSync(mixed, file);
    }
    const { phrases } = alignNarration(measureSilences(file, tools));
    assert.equal(phrases.length, 3, name);
    for (const [index, [start, end]] of expected.entries()) {
      assert.ok(Math.abs(phrases[index].atSec - start) <= 0.02, `${name} phrase ${index + 1} starts at ${phrases[index].atSec}, expected ${start}`);
      assert.ok(Math.abs(phrases[index].endSec - end) <= 0.02, `${name} phrase ${index + 1} ends at ${phrases[index].endSec}, expected ${end}`);
    }
    assert.equal(phrases[0].wordBoundariesSec.length, 1, `${name}: the 70 ms gap is a word boundary`);
    assert.ok(Math.abs(phrases[0].wordBoundariesSec[0] - 1.235) <= 0.02, name);
  }
});

// Mix a bed under a take: a pink-noise or sine source at the given dB under the take's peak (-6 dBFS).
function underBed(file, source, dbUnderPeak) {
  const mixed = `${file}.bed.wav`;
  const graph = `[1]volume=${-6 - dbUnderPeak}dB[bed];[0][bed]amix=inputs=2:duration=first:normalize=0`;
  const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-f", "lavfi", "-i", source, "-filter_complex", graph, "-ac", "1", mixed], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  fs.renameSync(mixed, file);
}

test("a take with a music bed or noise in its pauses is refused as not dry, with the dry-stem fix", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  const dir = tmp();
  const spans = [[0.5, 1.8], [2.4, 4.0], [4.6, 7.4]];
  const refused = (file) => {
    const error = assert.throws(() => alignNarration(measureSilences(file, tools)), (thrown) => thrown.code === "NARRATION_NOT_DRY");
    return error;
  };
  // Pink noise 30 dB under the voice (unit-amplitude pink noise sits about 10 dB under full scale).
  const pink = path.join(dir, "pink-30.wav");
  tones(pink, spans, 8);
  underBed(pink, "anoisesrc=r=24000:a=1:c=pink:seed=3", 30 - 10);
  refused(pink);
  assert.throws(() => alignNarration(measureSilences(pink, tools)), /dry narration stem: the voice alone, before music/);
  // A sustained sine pad 20 dB under the voice fills every pause; even a script cannot place the breaks.
  const pad = path.join(dir, "pad-20.wav");
  tones(pad, spans, 8);
  underBed(pad, "sine=f=110:r=24000", 20 - 3);
  assert.throws(() => alignNarration(measureSilences(pad, tools), { lines: ["a", "b", "c"] }), (thrown) => thrown.code === "NARRATION_NOT_DRY" && /dry narration stem/.test(thrown.message));
  // The same take dry, and with the bed 50 dB down, still splits into its three phrases.
  const dry = path.join(dir, "dry.wav");
  tones(dry, spans, 8);
  assert.equal(alignNarration(measureSilences(dry, tools)).phrases.length, 3);
  const faint = path.join(dir, "pink-50.wav");
  tones(faint, spans, 8);
  underBed(faint, "anoisesrc=r=24000:a=1:c=pink:seed=3", 50 - 10);
  assert.equal(alignNarration(measureSilences(faint, tools)).phrases.length, 3);
  // A long take with no phrase pause is one phrase only when the script says so.
  const unbroken = { durationSec: 6, peakDb: -3, noiseDb: -38, floorDb: -90, silences: [[0, 0.2], [2, 2.06], [5.8, 6]] };
  assert.throws(() => alignNarration(unbroken), (thrown) => thrown.code === "NARRATION_NOT_DRY" && /pass --script with that single line/.test(thrown.message));
  assert.equal(alignNarration(unbroken, { lines: ["one long line"] }).phrases.length, 1);
});

test("a script line break that falls on a word gap is refused: the speaker ran the lines together", () => {
  const silences = [[0, 0.2], [1.0, 1.06], [2.0, 2.055], [3.0, 3.4]];
  assert.throws(() => alignNarration({ durationSec: 3.4, silences }, { lines: ["one", "two", "three"] }), (thrown) => thrown.code === "PHRASES_UNMATCHED" && /between script lines 1 and 2 would be a 0\.06s pause .* did not pause between those lines/.test(thrown.message));
  // --min-pause below 0.15 s lowers the bar.
  assert.equal(alignNarration({ durationSec: 3.4, silences }, { lines: ["one", "two", "three"], minPauseSec: 0.05 }).phrases.length, 3);
});

test("ffmpeg failures from film voiceover are reported as film voiceover", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  const dir = tmp();
  const junk = path.join(dir, "junk.wav");
  fs.writeFileSync(junk, "not audio");
  assert.throws(() => measureSilences(junk, tools), (thrown) => /^film voiceover: ffmpeg exited/.test(thrown.message) && thrown.code === "TOOL_FAILED");
  assert.throws(() => measureSilences(junk, { ffmpeg: path.join(dir, "no-ffmpeg"), ffprobe: "ffprobe" }), (thrown) => /^film voiceover: .*unavailable/.test(thrown.message) && thrown.code === "TOOL_MISSING");
});

test("bound beats must land on their phrase", () => {
  const film = board();
  film.sound.cues.push({ id: "vo-01", atSec: 1.7, endSec: 3.4, kind: "voiceover", note: "Drag a node to connect it." });
  film.sound.cues.push({ id: "vo-02", atSec: 4.0, endSec: 5.2, kind: "voiceover", note: "Watch it bloom." });
  film.beats[1].soundCues.push("vo-01");
  film.beats[2].soundCues.push("vo-02");
  assert.deepEqual(codes(checkStoryboard(film)).filter((code) => code.startsWith("voiceover")), [], "picture leads the words inside the beat");

  const late = structuredClone(film);
  late.beats[1].startSec = 2.0;
  late.beats[0].endSec = 2.0;
  const lateResult = checkStoryboard(late);
  assert.deepEqual(codes(lateResult).filter((code) => code.startsWith("voiceover")), ["voiceover-off-phrase"]);
  assert.match(lateResult.findings.find((f) => f.code === "voiceover-off-phrase").message, /starts 0\.3s before the beat/);
  assert.equal(lateResult.status, "failed");

  const wrong = structuredClone(film);
  wrong.beats[0].soundCues.push("vo-02");
  assert.ok(codes(checkStoryboard(wrong)).includes("voiceover-off-phrase"), "a phrase after the beat ends is off");

  const sliver = structuredClone(film);
  sliver.sound.cues.find((cue) => cue.id === "vo-02").atSec = 8.6;
  sliver.sound.cues.find((cue) => cue.id === "vo-02").endSec = 10.5;
  const sliverResult = checkStoryboard(sliver);
  assert.match(sliverResult.findings.find((f) => f.code === "voiceover-off-phrase").message, /shares only 0\.2s/);
  // Exactly at the 0.1 s lead tolerance, despite 0.136 - 0.036 being 0.10000000000000002 in floats.
  const edge = structuredClone(film);
  edge.sound.cues.push({ id: "vo-03", atSec: 0.036, endSec: 0.9, kind: "voiceover", note: "edge" });
  edge.beats[0].startSec = 0;
  const edgeBoard = structuredClone(edge);
  edgeBoard.beats[0].endSec = 0.136; edgeBoard.beats[1].startSec = 0.136;
  edgeBoard.beats[1].soundCues.push("vo-03");
  edgeBoard.beats[1].soundCues = edgeBoard.beats[1].soundCues.filter((id) => id !== "vo-01");
  assert.deepEqual(codes(checkStoryboard(edgeBoard)).filter((code) => code === "voiceover-off-phrase"), []);
  edgeBoard.beats[0].endSec = 0.137; edgeBoard.beats[1].startSec = 0.137;
  assert.deepEqual(codes(checkStoryboard(edgeBoard)).filter((code) => code === "voiceover-off-phrase"), ["voiceover-off-phrase"]);
  for (const code of ["voiceover-off-phrase", "voiceover-unbound", "voiceover-stale", "voiceover-narration-missing"]) assert.ok(HINTS.storyboard[code], code);
});

test("cue endSec is only for lasting cues and must stay in the film", () => {
  const film = board();
  film.sound.cues[1].endSec = 3;
  assert.throws(() => checkStoryboard(film), /endSec is only for voiceover and silence cues/);
  const backwards = board();
  backwards.sound.cues.push({ id: "vo-01", atSec: 2, endSec: 1.5, kind: "voiceover", note: "line" });
  assert.throws(() => checkStoryboard(backwards), /endSec must be a number after atSec/);
  const past = board();
  past.sound.cues.push({ id: "vo-01", atSec: 11, endSec: 13, kind: "voiceover", note: "line" });
  assert.match(checkStoryboard(past).findings.find((f) => f.code === "cue-outside-film").message, /lasts until 13s/);
});

test("film voiceover writes measured cues and the narration hash; the gate reopens when the take changes", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  const { dir, project } = narratedProject([[0.2, 1.1], [1.7, 3.2], [3.9, 7.5]], 8);
  const dry = cliJson(["film", "voiceover", "--root", dir, "--project-root", "film", "--audio", "film/assets/narration.wav", "--start", "1.5"]);
  assert.equal(dry.status, 0, JSON.stringify(dry.body));
  assert.equal(dry.body.written, false);
  assert.deepEqual(dry.body.cues.map((cue) => [cue.id, cue.atSec, cue.endSec]), [["vo-01", 1.7, 2.6], ["vo-02", 3.2, 4.7], ["vo-03", 5.4, 9]]);
  assert.equal(JSON.parse(fs.readFileSync(path.join(project, "storyboard.json"), "utf8")).sound.narration, undefined, "a dry run writes nothing");

  const wrote = cliJson(["film", "voiceover", "--root", dir, "--project-root", "film", "--audio", "film/assets/narration.wav", "--start", "1.5", "--write"]);
  assert.equal(wrote.body.written, true);
  assert.deepEqual(wrote.body.findings.map((f) => f.code), ["voiceover-unbound"]);
  const saved = JSON.parse(fs.readFileSync(path.join(project, "storyboard.json"), "utf8"));
  assert.deepEqual(saved.sound.narration, { file: "assets/narration.wav", sha256: wrote.body.narration.sha256, startSec: 1.5, minPauseSec: 0.25 });
  assert.equal(saved.sound.cues.filter((cue) => cue.kind === "voiceover").length, 3);
  assert.equal(saved.sound.cues.length, 8, "music cues stay");
  assert.deepEqual(narrationFiles(saved), ["assets/narration.wav"]);

  // Bind the beats to the phrases they show: connect-edge (1.6-3.8) on vo-01, image-bloom (3.8-8.8) on vo-03.
  saved.beats[1].soundCues.push("vo-01");
  saved.beats[2].soundCues.push("vo-03");
  fs.writeFileSync(path.join(project, "storyboard.json"), JSON.stringify(saved, null, 2));
  const verify = cliJson(["verify", "film-storyboard", "--root", dir, "--storyboard", "film/storyboard.json"]);
  assert.equal(verify.status, 0, JSON.stringify(verify.body.findings));

  // A new take whose last line comes late: the old cues are stale, and re-measuring shows the bound beat now misses it.
  tones(path.join(project, "assets", "narration.wav"), [[0.2, 1.1], [1.7, 3.2], [7.4, 7.9]], 8);
  const stale = cliJson(["verify", "film-storyboard", "--root", dir, "--storyboard", "film/storyboard.json"]);
  assert.equal(stale.status, 2);
  assert.ok(stale.body.findings.some((f) => f.code === "voiceover-stale" && f.fix), JSON.stringify(stale.body.findings));
  const remeasured = cliJson(["film", "voiceover", "--root", dir, "--project-root", "film", "--audio", "film/assets/narration.wav", "--start", "1.5", "--write"]);
  assert.equal(remeasured.status, 2);
  assert.equal(remeasured.body.written, true);
  assert.deepEqual(remeasured.body.findings.map((f) => [f.code, f.beatId]), [["voiceover-off-phrase", "image-bloom"]]);
  const offPhrase = cliJson(["verify", "film-storyboard", "--root", dir, "--storyboard", "film/storyboard.json"]);
  assert.equal(offPhrase.status, 2);
  assert.deepEqual(offPhrase.body.findings.filter((f) => f.code.startsWith("voiceover")).map((f) => f.code), ["voiceover-off-phrase"]);
  // Two lines run together: vo-03 disappears while image-bloom still binds it; nothing is written.
  tones(path.join(project, "assets", "narration.wav"), [[0.2, 1.1], [1.7, 3.2], [3.3, 7.5]], 8);
  const before = fs.readFileSync(path.join(project, "storyboard.json"), "utf8");
  const broken = cliJson(["film", "voiceover", "--root", dir, "--project-root", "film", "--audio", "film/assets/narration.wav", "--start", "1.5", "--write"]);
  assert.equal(broken.status, 2);
  assert.equal(broken.body.written, false);
  assert.ok(broken.body.findings.some((f) => f.code === "voiceover-binding-broken" && /vo-03/.test(f.message)));
  assert.equal(fs.readFileSync(path.join(project, "storyboard.json"), "utf8"), before);
});

test("film voiceover rejects a take outside the project, a silent take and a script with more lines than pauses", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  const { dir, project } = narratedProject([[0.2, 1.1], [1.7, 3.2]], 4);
  tones(path.join(dir, "outside.wav"), [[0.2, 1]], 2);
  const outside = cliJson(["film", "voiceover", "--root", dir, "--project-root", "film", "--audio", "outside.wav"]);
  assert.equal(outside.status, 1);
  assert.match(outside.body.error.message, /copy the narration take into the project/);
  const silent = path.join(project, "assets", "silent.wav");
  assert.equal(spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "2", silent]).status, 0);
  const quiet = cliJson(["film", "voiceover", "--root", dir, "--project-root", "film", "--audio", "film/assets/silent.wav"]);
  assert.equal(quiet.status, 1);
  assert.match(quiet.body.error.message, /no audible signal/);
  fs.writeFileSync(path.join(project, "lines.txt"), "one\ntwo\nthree\n");
  const unmatched = cliJson(["film", "voiceover", "--root", dir, "--project-root", "film", "--audio", "film/assets/narration.wav", "--script", "film/lines.txt"]);
  assert.equal(unmatched.status, 1);
  assert.match(unmatched.body.error.message, /3 lines but the narration has only 2/);
  const pastEnd = cliJson(["film", "voiceover", "--root", dir, "--project-root", "film", "--audio", "film/assets/narration.wav", "--start", "10"]);
  assert.equal(pastEnd.status, 2);
  assert.ok(pastEnd.body.findings.some((f) => f.code === "voiceover-past-end"));
});

test("speech synthesized by flite aligns line by line with its script", { skip: !hasFlite && "ffmpeg without the flite filter" }, () => {
  const dir = tmp();
  const lines = ["Meet the new canvas.", "Drag a node to connect your idea.", "The preview updates as you type.", "Ship it today."];
  const parts = [];
  for (const [index, line] of lines.entries()) {
    const file = path.join(dir, `line-${index}.wav`);
    assert.equal(spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", `flite=text='${line}':voice=slt`, "-ar", "24000", "-ac", "1", file]).status, 0);
    parts.push(file);
  }
  const gap = path.join(dir, "gap.wav");
  assert.equal(spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.45", gap]).status, 0);
  const list = path.join(dir, "list.txt");
  fs.writeFileSync(list, parts.flatMap((file, index) => [`file '${file}'`, ...(index < parts.length - 1 ? [`file '${gap}'`] : [])]).join("\n"));
  const narration = path.join(dir, "narration.wav");
  assert.equal(spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", narration]).status, 0);
  // Where each line's speech starts in the concatenation, measured on the line alone.
  let offset = 0;
  const expected = parts.map((file) => {
    const alone = alignNarration(measureSilences(file, tools), { minPauseSec: 10 }).phrases[0];
    const at = offset + alone.atSec;
    offset += measureSilences(file, tools).durationSec + 0.45;
    return at;
  });
  const { phrases } = alignNarration(measureSilences(narration, tools), { lines });
  assert.deepEqual(phrases.map((phrase) => phrase.text), lines);
  for (const [index, phrase] of phrases.entries()) assert.ok(Math.abs(phrase.atSec - expected[index]) <= 0.03, `line ${index + 1} at ${phrase.atSec}, alone it starts at ${expected[index]}`);
  // Without a script the 0.45 s sentence pauses are the phrase breaks too.
  assert.equal(alignNarration(measureSilences(narration, tools)).phrases.length, 4);
});
