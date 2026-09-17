// Local-only reproducible renderer. No publishing, telemetry, or global installs.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = __dirname;
const output = path.join(root, 'output');
fs.mkdirSync(output, { recursive: true });
const mode = process.argv[2] || 'check';
const env = { ...process.env, HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' };
if (!env.HYPERFRAMES_BROWSER_PATH) {
  const { chromium } = require('playwright');
  env.HYPERFRAMES_BROWSER_PATH = chromium.executablePath();
}
const commands = {
  lint: ['lint', '--json'],
  check: ['check', '--json', '--at', '0,2,4.3,6.5,9.3,11.5,14.3,16.5,18.3,21,23.96'],
  render: ['render', '--quality', 'high', '--output', 'output/openalice.mp4'],
};
if (!commands[mode]) throw new Error('Use lint, check, or render');
const result = spawnSync(process.execPath, ['node_modules/hyperframes/dist/cli.js', ...commands[mode]], { cwd: root, env, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
fs.writeFileSync(path.join(output, `${mode}.log`), (result.stdout || '') + (result.stderr || ''));
if (mode !== 'render') {
  const start = result.stdout.indexOf('{\n');
  if (start >= 0) {
    const receipt = JSON.parse(result.stdout.slice(start));
    fs.writeFileSync(path.join(output, `${mode}.json`), JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify({ mode, ok: receipt.ok, log: `output/${mode}.json`, exitCode: result.status }));
  } else console.log(result.stdout, result.stderr);
} else console.log(JSON.stringify({ mode, exitCode: result.status, log: 'output/render.log', video: 'output/openalice.mp4' }));
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
