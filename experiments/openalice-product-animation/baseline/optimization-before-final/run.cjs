// Target-local renderer. No publishing, telemetry, or global installs.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = __dirname;
const output = path.join(root, 'output');
fs.mkdirSync(output, { recursive: true });
const mode = process.argv[2] || 'check';
const duration = Number(fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/data-duration="([0-9.]+)"/)[1]);
const sample = process.argv.includes('--sample');
if (sample && duration !== 7.5) throw new Error('The approved 7.5s sample is archived in output/sample-approved; do not overwrite it with the full film.');
const videoPath = sample ? 'output/sample-7.5s.mp4' : 'output/openalice.mp4';
const receiptName = sample ? `sample-${mode}` : mode;
const checkTimes = Array.from({ length: Math.ceil(duration) }, (_, i) => i).concat(duration - 1 / 30).join(',');
const env = { ...process.env, HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' };
if (!env.HYPERFRAMES_BROWSER_PATH) {
  const { chromium } = require('playwright');
  env.HYPERFRAMES_BROWSER_PATH = chromium.executablePath();
}
const commands = {
  lint: ['lint', '--json'],
  check: ['check', '--json', '--at', checkTimes],
  render: ['render', '--quality', 'high', '--output', videoPath],
};
if (!commands[mode]) throw new Error('Use lint, check, or render');
const result = spawnSync(process.execPath, ['node_modules/hyperframes/dist/cli.js', ...commands[mode]], { cwd: root, env, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
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
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
