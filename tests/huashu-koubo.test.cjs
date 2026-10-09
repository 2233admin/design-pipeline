"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { after, test } = require("node:test");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "huashu-koubo-"));
after(() => fs.rmSync(root, { recursive: true, force: true }));
const tool = path.resolve(__dirname, "../skill/tools/art-motion/koubo.py");
const python = spawnSync("python", ["--version"], { encoding: "utf8", windowsHide: true });
const ffmpeg = spawnSync("ffmpeg", ["-version"], { encoding: "utf8", windowsHide: true });
const ffprobe = spawnSync("ffprobe", ["-version"], { encoding: "utf8", windowsHide: true });
const unavailable = [python, ffmpeg, ffprobe].some(result => result.error || result.status !== 0) ? "Python, FFmpeg and ffprobe are required for offline audio checks" : false;

function run(binary, args, options = {}) {
  const result = spawnSync(binary, args, { encoding: "utf8", windowsHide: true, ...options });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function source(directory) {
  fs.mkdirSync(directory);
  run("ffmpeg", ["-v", "error", "-n", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2", path.join(directory, "source.wav")]);
  return fs.readFileSync(path.join(directory, "source.wav"));
}

function moduleScript(script, directory) {
  return run("python", ["-B", "-c", `import importlib.util, pathlib, sys\nsys.path.insert(0, str(pathlib.Path(sys.argv[1]).parent))\nspec = importlib.util.spec_from_file_location('maintained_koubo', sys.argv[1])\nk = importlib.util.module_from_spec(spec)\nspec.loader.exec_module(k)\nroot = pathlib.Path(sys.argv[2])\n${script}`, tool, directory]);
}

test("audio temp files close Windows handles and clean success/failure in the output directory", { skip: unavailable }, () => {
  const directory = path.join(root, "lifecycle"); fs.mkdirSync(directory);
  moduleScript(`from unittest.mock import patch
original = k.tempfile.mkstemp
descriptors = []
def tracked(*args, **kwargs):
    fd, name = original(*args, **kwargs)
    descriptors.append(fd)
    return fd, name
with patch.object(k.tempfile, 'mkstemp', tracked):
    with k.temporary_audio(root / 'out.wav') as temp:
        assert temp.parent == root
        try: k.os.fstat(descriptors[-1])
        except OSError: pass
        else: raise AssertionError('mkstemp descriptor remains open')
        replacement = root / 'replacement.wav'
        replacement.write_bytes(b'closed-handle')
        temp.replace(replacement)
        assert replacement.read_bytes() != b'closed-handle'
        replacement.unlink()
    try:
        with k.temporary_audio(root / 'out.wav') as temp:
            temp.write_bytes(b'partial')
            raise RuntimeError('processing failed')
    except RuntimeError: pass
assert list(root.iterdir()) == []`, directory);
});

test("supplied WAV fit/match/PCM preparation produces measured output and preserves its source", { skip: unavailable }, () => {
  const directory = path.join(root, "fit-match"), original = source(directory);
  const result = JSON.parse(run("python", ["-B", tool, "--root", directory, "--input", "source.wav", "--output", "new.wav", "--prepare", "--fit-seconds", "1.87", "--match-db", "-35"]).stdout);
  assert.ok(Math.abs(result.durationSec - 1.87) <= 0.05);
  assert.ok(Math.abs(result.meanVolumeDb + 35) <= 0.5);
  assert.equal(result.preparedPcm, true);
  const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels", "-of", "json", path.join(directory, "new.wav")]).stdout).streams[0];
  assert.deepEqual(probe, { codec_name: "pcm_s16le", sample_rate: "24000", channels: 1 });
  assert.deepEqual(fs.readFileSync(path.join(directory, "source.wav")), original);
  assert.deepEqual(fs.readdirSync(directory).sort(), ["new.wav", "source.wav"]);
});

test("failed fit/encoding and concurrent publication clean temporary files and preserve existing data", { skip: unavailable }, () => {
  const directory = path.join(root, "failures"), original = source(directory);
  moduleScript(`from unittest.mock import patch
original_run = k.run
def failed(command):
    if '-y' in command:
        pathlib.Path(command[-1]).write_bytes(b'partial encoded audio')
        raise k.subprocess.CalledProcessError(1, command, stderr='forced encoder failure')
    return original_run(command)
for operation in ('fit', 'match', 'prepare'):
    try:
        with patch.object(k, 'run', failed):
            k.process_audio(root, 'source.wav', operation + '.wav', fit_seconds=1.87 if operation=='fit' else None, match_db=-35 if operation=='match' else None, prepare=operation=='prepare')
    except k.subprocess.CalledProcessError: pass
    else: raise AssertionError('failure was swallowed')
try: k.process_audio(root, 'source.wav', 'unfitted.wav', fit_seconds=1.0)
except ValueError: pass
else: raise AssertionError('outside adjustment limit was accepted')
link = k.os.link
def competing_writer(staged, output):
    output.write_bytes(b'other writer')
    link(staged, output)
try:
    with patch.object(k.os, 'link', competing_writer):
        k.process_audio(root, 'source.wav', 'raced.wav')
except FileExistsError: pass
else: raise AssertionError('existing output was replaced')
assert (root / 'raced.wav').read_bytes() == b'other writer'
(root / 'raced.wav').unlink()
assert sorted(p.name for p in root.iterdir()) == ['source.wav']`, directory);
  assert.deepEqual(fs.readFileSync(path.join(directory, "source.wav")), original);
});

test("existing output/sidecar and invalid project paths are refused before audio is changed", { skip: unavailable }, () => {
  const directory = path.join(root, "protected"), original = source(directory);
  fs.writeFileSync(path.join(directory, "existing.wav"), "prior audio");
  fs.writeFileSync(path.join(directory, "new.wav.json"), "prior provenance");
  for (const [output, extra, expected] of [["existing.wav", [], /already exists/], ["new.wav", [], /already exists/], ["../escape.wav", [], /path segments/], ["invalid.wav", ["--fit-seconds", "nan"], /finite/], ["invalid.wav", ["--match-db", "inf"], /finite/]]) {
    const result = spawnSync("python", ["-B", tool, "--root", directory, "--input", "source.wav", "--output", output, ...extra], { encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, expected);
  }
  assert.equal(fs.readFileSync(path.join(directory, "existing.wav"), "utf8"), "prior audio");
  assert.equal(fs.readFileSync(path.join(directory, "new.wav.json"), "utf8"), "prior provenance");
  assert.deepEqual(fs.readFileSync(path.join(directory, "source.wav")), original);
  assert.deepEqual(fs.readdirSync(directory).sort(), ["existing.wav", "new.wav.json", "source.wav"]);
});

test("OS temp selection is ignored when it would move the staged audio to another filesystem", { skip: unavailable }, () => {
  const directory = path.join(root, "temp-placement"); source(directory);
  moduleScript(`from unittest.mock import patch
with patch.object(k.tempfile, 'gettempdir', side_effect=AssertionError('OS temp must not be selected')):
    k.process_audio(root, 'source.wav', 'new.wav', fit_seconds=1.87, match_db=-35, prepare=True)
assert sorted(p.name for p in root.iterdir()) == ['new.wav', 'source.wav']`, directory);
});

test("output and dangling sidecar symbolic links are preserved", { skip: unavailable }, t => {
  const directory = path.join(root, "symbolic-links"); source(directory);
  try {
    fs.symlinkSync("source.wav", path.join(directory, "link.wav"));
    fs.symlinkSync("missing-provenance.json", path.join(directory, "new.wav.json"));
  } catch (error) {
    if (["EPERM", "EACCES", "ENOSYS"].includes(error.code)) { t.skip("symbolic links are unavailable to this user"); return; }
    throw error;
  }
  for (const output of ["link.wav", "new.wav"]) {
    const result = spawnSync("python", ["-B", tool, "--root", directory, "--input", "source.wav", "--output", output], { encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 1, result.stderr);
  }
  assert.equal(fs.lstatSync(path.join(directory, "link.wav")).isSymbolicLink(), true);
  assert.equal(fs.lstatSync(path.join(directory, "new.wav.json")).isSymbolicLink(), true);
  assert.equal(fs.existsSync(path.join(directory, "new.wav")), false);
  assert.equal(fs.existsSync(path.join(directory, "missing-provenance.json")), false);
});
