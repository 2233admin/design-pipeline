// Target-local renderer. No publishing, telemetry, or global installs.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = __dirname;
const output = path.join(root, 'output');
const sourcePath = path.join(root, 'index.html');
const sampleDuration = 7.5;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const mode = process.argv[2] || 'check';
if (!['lint','check','render'].includes(mode)) throw new Error('Use lint, check, or render');
const sample = process.argv.includes('--sample');
if (sample && mode !== 'render') throw new Error('--sample is supported only for render: HyperFrames lint and check accept only a project directory and expose no composition selector, so they cannot validate the root retimed HTML.');
fs.mkdirSync(output, { recursive: true });
const source = fs.readFileSync(sourcePath, 'utf8');
const durationMatch = source.match(/data-duration="([0-9.]+)"/);
if (!durationMatch) throw new Error('index.html must declare data-duration');
const duration = Number(durationMatch[1]);
if (sample && duration !== 20) throw new Error('The 7.5s sample must be derived from the canonical 20s index.html composition.');
const renderDuration = sample ? sampleDuration : duration;
const videoPath = sample ? 'output/sample-7.5s.mp4' : 'output/openalice.mp4';
const receiptName = sample ? `sample-${mode}` : mode;
const checkTimes = Array.from({ length: Math.ceil(renderDuration) }, (_, i) => i).concat(renderDuration - 1 / 30).join(',');
const env = { ...process.env, HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1', PRODUCER_FORCE_SCREENSHOT: 'true', PRODUCER_EXPERIMENTAL_FAST_CAPTURE: 'false', HF_STATIC_DEDUP: 'false', PRODUCER_ENABLE_BROWSER_POOL: 'false' };
if (!env.HYPERFRAMES_BROWSER_PATH) {
  const { chromium } = require('playwright');
  env.HYPERFRAMES_BROWSER_PATH = chromium.executablePath();
}
const commands = {
  lint: ['lint', '--json'],
  check: ['check', '--json', '--at', checkTimes],
  render: ['render', '--quality', 'high', '--workers', '1', '--output', videoPath],
};

let result, temporaryRetimePath, temporaryComposition, temporaryCreated = false, primaryError, cleanupError;
try {
  const args = [...commands[mode]];
  if (sample) {
    const retimed = source.replace(/data-duration="20"/, `data-duration="${sampleDuration}"`);
    if (retimed === source) throw new Error('The canonical source must retain data-duration="20" for deterministic sample retime.');
    temporaryComposition = `.openalice-sample-${process.pid}-${crypto.randomUUID()}.html`;
    temporaryRetimePath = path.join(root, temporaryComposition);
    const temporaryDescriptor = fs.openSync(temporaryRetimePath, 'wx');
    temporaryCreated = true;
    try { fs.writeFileSync(temporaryDescriptor, retimed); } finally { fs.closeSync(temporaryDescriptor); }
    args.push('--composition', temporaryComposition);
  }
  result = spawnSync(process.execPath, ['node_modules/hyperframes/dist/cli.js', ...args], { cwd: root, env, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(output, `${receiptName}.log`), (result.stdout || '') + (result.stderr || ''));
  if (mode === 'render') console.log(JSON.stringify({ mode, exitCode: result.status, log: `output/${receiptName}.log`, video: videoPath })); else {
    const start = result.stdout.indexOf('{\n');
    if (start >= 0) {
      let receipt;
      try { receipt = JSON.parse(result.stdout.slice(start)); }
      catch (error) { throw new Error(`HyperFrames returned invalid JSON; inspect output/${receiptName}.log`, { cause: error }); }
      fs.writeFileSync(path.join(output, `${receiptName}.json`), JSON.stringify(receipt, null, 2) + '\n');
      console.log(JSON.stringify({ mode, ok: receipt.ok, log: `output/${receiptName}.json`, exitCode: result.status }));
    } else console.log(result.stdout, result.stderr);
  }
} catch (error) {
  primaryError = error;
  throw error;
} finally {
  if (temporaryCreated) {
    try { fs.rmSync(temporaryRetimePath, { force: true }); }
    catch (error) { cleanupError = error; console.error(`Unable to remove owned sample retime composition: ${error.message}`); }
  }
  if (sample && mode === 'render') {
    const rendered = result?.status === 0 && fs.existsSync(path.join(root, videoPath));
    const lineage = { schema: 'openalice.sample-retime.v1', source: { path: 'index.html', sha256: sha(source), duration }, retime: { duration: sampleDuration, composition: temporaryComposition ?? null }, output: { path: videoPath, sha256: rendered ? sha(fs.readFileSync(path.join(root, videoPath))) : null }, temporary: { created: temporaryCreated, removed: !temporaryCreated || !fs.existsSync(temporaryRetimePath) }, result: { mode, exitCode: result?.status ?? null } };
    fs.writeFileSync(path.join(output, 'sample-retime.json'), JSON.stringify(lineage, null, 2) + '\n');
  }
  if (cleanupError && !primaryError && result?.status === 0) throw cleanupError;
}
if (result?.error) console.error(result.error.message);
process.exitCode = result?.status ?? 1;
