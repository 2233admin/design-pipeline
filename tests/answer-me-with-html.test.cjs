'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const test = require('node:test');
const { buildExplanation } = require('../skill/tools/answer-me-with-html/build-explanation.cjs');

const REPO = path.resolve(__dirname, '..');
const HELPER = path.join(REPO, 'skill/tools/answer-me-with-html/build-explanation.cjs');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=', 'base64');
function sandbox(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'explanation-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function draft(root, text, name = 'draft.md') { const input = path.join(root, name); fs.writeFileSync(input, text); return input; }
function fence(lang, text, args = '') { return `\`\`\`${lang}${args ? ` ${args}` : ''}\n${text}\n\`\`\``; }
function decodeSource(html) {
  const match = html.match(/<textarea id="am-source"[^>]*>([\s\S]*?)<\/textarea>/);
  assert.ok(match, 'page must retain copyable source');
  return match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}
function cli(helper, root, args, env = {}) {
  return spawnSync(process.execPath, [helper, ...args], { cwd: root, encoding: 'utf8', timeout: 30000, env: { ...process.env, ...env } });
}
function packageCopy(root) {
  const skill = path.join(root, 'installed/skill');
  const tools = path.join(skill, 'tools/answer-me-with-html');
  const vendor = path.join(skill, 'vendor/answer-me-with-html');
  fs.mkdirSync(tools, { recursive: true });
  fs.mkdirSync(vendor, { recursive: true });
  for (const filename of ['build-explanation.cjs', 'renderer.mjs']) fs.copyFileSync(path.join(REPO, 'skill/tools/answer-me-with-html', filename), path.join(tools, filename));
  for (const filename of ['LICENSES.txt', 'manifest.json']) fs.copyFileSync(path.join(REPO, 'skill/vendor/answer-me-with-html', filename), path.join(vendor, filename));
  return { skill, helper: path.join(skill, 'tools/answer-me-with-html/build-explanation.cjs') };
}
async function rejected(t, text, pattern, setup) {
  const root = sandbox(t);
  if (setup) setup(root);
  const input = draft(root, text);
  const output = path.join(root, 'output');
  await assert.rejects(buildExplanation({ input, output }), pattern);
  assert.equal(fs.existsSync(output), false, 'failed generation must not publish output');
  assert.deepEqual(fs.readdirSync(root).filter((name) => name.startsWith('.answer-me-with-html-')), [], 'failed generation must clean staging');
}

test('Chinese explanation renders table, flow, ask, literal code, authorized image/code and complete notices', async (t) => {
  const root = sandbox(t);
  fs.writeFileSync(path.join(root, 'sample.ts'), 'export const answer = 42;\nexport const label = "中文";\n');
  fs.writeFileSync(path.join(root, 'small image.png'), PNG);
  const source = '# 中文说明\n\n## A 数据流\n\n| 项目 | 状态 |\n| --- | --- |\n| 说明 | ok 完成 |\n\n' +
    fence('flow', '开始 -> 检查 -> 完成') + '\n\n' + fence('ask', '选择哪一种？\n* 推荐方案 | 保持简单\n- 另一方案 | 更多选项') + '\n\n' +
    fence('js', '<script>alert("literal")</script>\nconst remote = "https://example.com/a.png";') + '\n\n' +
    fence('ts', '', 'src=sample.ts lines=2 hl=2') + '\n\n![一像素](small image.png)\n';
  const input = draft(root, source);
  const result = await buildExplanation({ input, output: path.join(root, 'output') });
  const html = fs.readFileSync(result.index, 'utf8');
  assert.equal(result.template, 'doc'); assert.equal(result.theme, 'paper'); assert.equal(result.mode, 'auto');
  assert.equal(result.stats.panels, 1); assert.equal(result.stats.components.flow, 1); assert.equal(result.stats.components.ask, 1);
  assert.equal(result.sourceEmbedded, true); assert.equal(result.feedback, 'manual-copy-back'); assert.equal(result.creativeAcceptance, 'not-assessed');
  assert.match(result.disclosure, /original Markdown.*included code\/images.*not a redacted/);
  assert.deepEqual(fs.readdirSync(result.output).sort(), ['LICENSES.txt', 'index.html']);
  assert.equal(decodeSource(html), source);
  assert.match(html, /am-table-wrap/); assert.match(html, /am-diagram/); assert.match(html, /am-ask/);
  assert.match(html, /&lt;script&gt;alert\(&quot;literal&quot;\)&lt;\/script&gt;/);
  assert.match(html, /export const label/); assert.match(html, /data:image\/png;base64,/);
  assert.equal(fs.readFileSync(result.licenses, 'utf8'), fs.readFileSync(path.join(REPO, 'skill/vendor/answer-me-with-html/LICENSES.txt'), 'utf8'));
  const runtime = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(runtime.length, 1, 'no extra attacker script may be authorized');
  const hash = createHash('sha256').update(runtime[0][1]).digest('base64');
  const policy = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1];
  assert.ok(policy, 'offline CSP must be present');
  const directives = policy.split(';').map((part) => part.trim());
  assert.equal(directives.find((part) => part.startsWith('script-src ')), `script-src 'sha256-${hash}'`);
  for (const directive of ["default-src 'none'", 'img-src data:', 'font-src data:', "connect-src 'none'", "frame-src 'none'", "object-src 'none'", "media-src 'none'", "worker-src 'none'", "form-action 'none'", "base-uri 'none'"]) assert.ok(directives.includes(directive), directive);
  assert.doesNotMatch(html, /<(?:script|link|iframe|object|embed|audio|video)\b[^>]*\s(?:src|href|data)="(?:https?:|\/\/)/i);
  assert.doesNotMatch(html, /<img\b[^>]*\ssrc="(?!data:image\/)/i);
});

test('local defaults override frontmatter; explicit layout/theme/mode are the reported actual settings', async (t) => {
  const root = sandbox(t);
  const input = draft(root, '---\ntemplate: sheet\ntheme: blueprint\nmode: dark\nstyle: strict\n---\n# 中文\n\n## A 说明\n无需受控英语审校。');
  const normal = await buildExplanation({ input, output: path.join(root, 'normal') });
  assert.equal(normal.template, 'doc'); assert.equal(normal.theme, 'paper'); assert.equal(normal.mode, 'auto');
  assert.deepEqual(normal.warnings, []);
  assert.match(fs.readFileSync(normal.index, 'utf8'), /<html[^>]*data-theme="paper" data-mode="auto" data-style="off"/);
  const explicit = await buildExplanation({ input, output: path.join(root, 'explicit'), template: 'sheet', theme: 'blueprint', mode: 'dark' });
  assert.equal(explicit.template, 'sheet'); assert.equal(explicit.theme, 'blueprint'); assert.equal(explicit.mode, 'dark');
  assert.match(fs.readFileSync(explicit.index, 'utf8'), /<main class="am-sheet/);
  assert.match(fs.readFileSync(explicit.index, 'utf8'), /<html[^>]*data-theme="blueprint" data-mode="dark" data-style="off"/);
});

test('ordinary safe navigation remains available without authorizing automatic remote resources', async (t) => {
  const root = sandbox(t);
  const input = draft(root, '# Navigation\n\n## A Links\n[Web](https://example.com/?a=1&b=2) [Mail](mailto:user@example.com) [Here](#A)');
  const result = await buildExplanation({ input, output: path.join(root, 'output') });
  const html = fs.readFileSync(result.index, 'utf8');
  assert.match(html, /href="https:\/\/example.com/); assert.match(html, /href="mailto:user@example.com"/); assert.match(html, /href="#A"/);
});

const attacks = [
  ['raw HTML prose', '<script>alert(1)</script>', /Raw HTML\/SVG/],
  ['raw SVG prose', '<svg><image href="https://example.com/a.png" /></svg>', /Raw HTML\/SVG/],
  ['raw HTML fence', fence('html', '<b>unsafe</b>'), /Raw html fence/],
  ['raw SVG fence', fence('svg', '<svg />'), /Raw svg fence/],
  ['unsafe hyperlink', '[click](javascript:alert%281%29)', /Unsafe hyperlink/],
  ['entity-obfuscated hyperlink', '[click](jav&#x61;script:alert%281%29)', /Unsafe hyperlink/],
  ['percent-obfuscated hyperlink', '[click](%6a%61vascript:alert%281%29)', /Unsafe hyperlink/],
  ['protocol-relative hyperlink', '[click](//example.com)', /Unsafe hyperlink/],
  ['remote image', '![image](https://example.com/a.png)', /local raster/],
  ['reference remote image', '![image][asset]\n\n[asset]: https://example.com/a.png', /local raster/],
  ['unused unsafe reference', '[asset]: javascript:alert%281%29\n\ntext', /Unsafe hyperlink/],
  ['data image', '![image](data:image/svg+xml;base64,PHN2Zy8+)', /local raster/],
  ['outside image', '![image](../outside.png)', /(?:escapes authorized|not found)/],
  ['outside code', fence('js', '', 'src=../outside.js'), /(?:escapes authorized|not found)/],
  ['missing image', '![image](missing.png)', /not found/],
  ['missing code', fence('js', '', 'src=missing.js'), /not found/],
  ['code argument drift', fence('js', 'const a=1', 'surprise=bad'), /unknown code block setting/],
  ['ask unsafe Markdown', fence('ask', 'Question?\n* [click](javascript:alert%281%29)\n- Safe'), /Unsafe hyperlink/],
  ['tree unsafe indented Markdown', fence('tree', 'Root\n    Child <img src="https://example.com/a.png">'), /Raw HTML\/SVG/],
  ['callout remote image', fence('callout', '![image](https://example.com/a.png)'), /local raster/],
];
for (const [name, text, error] of attacks) test(`refuses ${name} without publishing`, async (t) => rejected(t, `# Draft\n\n## A Content\n${text}`, error));

test('non-html fences and inline code retain literal attack examples including event attributes', async (t) => {
  const root = sandbox(t);
  const literal = '<img src="https://example.com/a.png" onerror="alert(1)">\n[click](javascript:alert(1))\n```html\n<script>literal</script>\n```';
  const source = '# Examples\n\n## A Literal\n`<svg onload="alert(1)">`\n\n````text\n' + literal + '\n````';
  const input = draft(root, source);
  const result = await buildExplanation({ input, output: path.join(root, 'output') });
  const html = fs.readFileSync(result.index, 'utf8');
  assert.equal(decodeSource(html), source);
  const code = html.match(/<pre class="am-code[^"]*"><code[^>]*>([\s\S]*?)<\/code><\/pre>/)?.[1];
  assert.ok(code, 'literal examples must actually render as code');
  assert.match(code, /&lt;img src=&quot;https:\/\/example.com\/a.png&quot; onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(code, /javascript:alert\(1\)/);
  assert.match(code, /&lt;script&gt;literal&lt;\/script&gt;/);
  assert.match(html, /<code>&lt;svg onload=&quot;alert\(1\)&quot;&gt;<\/code>/);
});

test('included files must be regular raster/code files and retain upstream secret restrictions', async (t) => {
  for (const [name, bytes, text, expected] of [
    ['picture.svg', '<svg/>', '![picture](picture.svg)', /raster.*not SVG/],
    ['pretend.png', '<svg/>', '![picture](pretend.png)', /raster.*not SVG/],
    ['.env', 'HELLO=world', fence('text', '', 'src=.env'), /keys or passwords/],
    ['credentials.txt', 'ordinary text', fence('text', '', 'src=credentials.txt'), /keys or passwords/],
    ['code.js', 'const password = "aVeryLongSecretValue";', fence('js', '', 'src=code.js'), /key or a token/],
    ['binary.js', Buffer.from([0, 1, 2]), fence('js', '', 'src=binary.js'), /binary file/],
    ['slice.js', 'const safe = true;\nconst password = "aVeryLongSecretValue";', fence('js', '', 'src=slice.js lines=1'), /key or a token/],
  ]) {
    await t.test(name, async (t) => rejected(t, '# Test\n\n## A Test\n' + text, expected, (root) => fs.writeFileSync(path.join(root, name), bytes)));
  }
  await t.test('directory include', async (t) => rejected(t, '# Test\n\n## A Test\n' + fence('js', '', 'src=directory.js'), /regular file/, (root) => fs.mkdirSync(path.join(root, 'directory.js'))));
});

test('explicit asset root permits authorized code/image outside input parent, retaining original source', async (t) => {
  const root = sandbox(t); const inputs = path.join(root, 'drafts'); const assets = path.join(root, 'assets');
  fs.mkdirSync(inputs); fs.mkdirSync(assets);
  fs.writeFileSync(path.join(assets, 'photo.png'), PNG); fs.writeFileSync(path.join(assets, 'sample.js'), 'const authorized = true;\n');
  const source = '# Explicit assets\n\n## A Included\n![picture](../assets/photo.png)\n\n' + fence('js', '', 'src=../assets/sample.js');
  const input = draft(inputs, source); const result = await buildExplanation({ input, assetRoot: assets, output: path.join(root, 'output') });
  const html = fs.readFileSync(result.index, 'utf8'); assert.match(html, /const authorized/); assert.match(html, /data:image\/png;base64,/); assert.equal(decodeSource(html), source);
});

test('symlink escapes and secret-name aliases fail; symlinks to authorized ordinary files work', async (t) => {
  const root = sandbox(t); const assets = path.join(root, 'assets'); const outside = path.join(root, 'outside'); fs.mkdirSync(assets); fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'outside.js'), 'const external = true;'); fs.writeFileSync(path.join(outside, 'outside.png'), PNG);
  fs.writeFileSync(path.join(assets, '.env'), 'HELLO=world'); fs.writeFileSync(path.join(assets, 'safe.js'), 'const safe = true;');
  try {
    fs.symlinkSync(path.join(outside, 'outside.js'), path.join(assets, 'escape.js'), 'file');
    fs.symlinkSync(path.join(outside, 'outside.png'), path.join(assets, 'escape.png'), 'file');
    fs.symlinkSync(path.join(assets, '.env'), path.join(assets, 'innocent.js'), 'file');
    fs.symlinkSync(path.join(assets, 'safe.js'), path.join(assets, 'alias.js'), 'file');
  } catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip(`File symlinks unavailable: ${error.code}`); return; } throw error; }
  for (const [name, text, pattern] of [['code', fence('js', '', 'src=escape.js'), /escapes authorized/], ['image', '![picture](escape.png)', /escapes authorized/], ['secret', fence('js', '', 'src=innocent.js'), /keys or passwords/]]) {
    const input = draft(assets, '# Draft\n\n## A Test\n' + text); const output = path.join(root, name);
    await assert.rejects(buildExplanation({ input, output }), pattern); assert.equal(fs.existsSync(output), false);
  }
  const input = draft(assets, '# Draft\n\n## A Test\n' + fence('js', '', 'src=alias.js'));
  const result = await buildExplanation({ input, output: path.join(root, 'safe') }); assert.match(fs.readFileSync(result.index, 'utf8'), /const safe/);
});

test('existing file, directory, dangling symlink and absent output parent are never modified', async (t) => {
  const root = sandbox(t); const input = draft(root, '# Draft\n\n## A Test\nHello');
  const file = path.join(root, 'file'); fs.writeFileSync(file, 'keep'); await assert.rejects(buildExplanation({ input, output: file }), /already exists/); assert.equal(fs.readFileSync(file, 'utf8'), 'keep');
  const dir = path.join(root, 'directory'); fs.mkdirSync(dir); fs.writeFileSync(path.join(dir, 'keep'), 'unchanged'); await assert.rejects(buildExplanation({ input, output: dir }), /already exists/); assert.equal(fs.readFileSync(path.join(dir, 'keep'), 'utf8'), 'unchanged');
  const link = path.join(root, 'dangling');
  try { fs.symlinkSync(path.join(root, 'missing-target'), link, 'junction'); await assert.rejects(buildExplanation({ input, output: link }), /already exists/); assert.ok(fs.lstatSync(link).isSymbolicLink()); }
  catch (error) { if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error; t.diagnostic(`Dangling symlink case unavailable: ${error.code}`); }
  await assert.rejects(buildExplanation({ input, output: path.join(root, 'absent/output') }), /Output parent.*existing directory/);
  await assert.rejects(buildExplanation({ input: root, output: path.join(root, 'output') }), /regular file/);
});

test('packaged invocation needs no npm, ignores ambient config and writes only caller output', (t) => {
  const root = sandbox(t); const packaged = packageCopy(root); const home = path.join(root, 'home'); fs.mkdirSync(home);
  fs.mkdirSync(path.join(home, '.config/answer-me-with-html'), { recursive: true }); fs.writeFileSync(path.join(home, '.config/answer-me-with-html/config.json'), '{"theme":"missing-theme","template":"video","style":"strict"}');
  const before = fs.readdirSync(home, { recursive: true }).sort();
  const config = path.join(home, '.config/answer-me-with-html/config.json');
  const configBytes = fs.readFileSync(config);
  const state = path.join(root, '.design-pipeline/state.json');
  fs.mkdirSync(path.dirname(state), { recursive: true });
  const stateBytes = Buffer.from('{"sentinel":"pipeline state must remain unchanged"}\n');
  fs.writeFileSync(state, stateBytes);
  const input = draft(root, '# 中文\n\n## A 说明\n这是离线说明。'); const output = path.join(root, 'output');
  const result = cli(packaged.helper, root, ['--input', input, '--output', output], { HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config') });
  assert.equal(result.status, 0, result.stderr); const json = JSON.parse(result.stdout); assert.equal(json.theme, 'paper'); assert.equal(json.sourceEmbedded, true);
  assert.deepEqual(fs.readdirSync(home, { recursive: true }).sort(), before);
  assert.deepEqual(fs.readFileSync(config), configBytes);
  assert.deepEqual(fs.readFileSync(state), stateBytes);
  assert.deepEqual(fs.readdirSync(path.dirname(state)), ['state.json']);
  const invalid = cli(packaged.helper, root, ['--input', input, '--output', path.join(root, 'bad'), '--video']); assert.equal(invalid.status, 1); assert.match(invalid.stderr, /Usage/); assert.equal(fs.existsSync(path.join(root, 'bad')), false);
  const overlapping = cli(packaged.helper, root, ['--input', input, '--output', path.join(packaged.skill, 'tools/answer-me-with-html/output')]); assert.equal(overlapping.status, 1); assert.match(overlapping.stderr, /overlap packaged/);
});

test('missing or corrupt renderer/notices fail without successful output', async (t) => {
  for (const [resource, corrupt] of [['renderer.mjs', false], ['renderer.mjs', true], ['LICENSES.txt', false], ['LICENSES.txt', true], ['manifest.json', false], ['manifest.json', true]]) {
    await t.test(`${resource} ${corrupt ? 'corrupt' : 'missing'}`, (t) => {
      const root = sandbox(t); const packaged = packageCopy(root);
      const target = resource === 'renderer.mjs' ? path.join(packaged.skill, 'tools/answer-me-with-html', resource) : path.join(packaged.skill, 'vendor/answer-me-with-html', resource);
      if (corrupt) fs.writeFileSync(target, resource === 'renderer.mjs' ? 'not valid JavaScript syntax @@@' : 'incomplete license'); else fs.unlinkSync(target);
      const input = draft(root, '# Draft\n\n## A Test\nHello'); const output = path.join(root, 'output');
      const result = cli(packaged.helper, root, ['--input', input, '--output', output]); assert.equal(result.status, 1); assert.match(result.stderr, /(?:renderer|notices)/i); assert.equal(fs.existsSync(output), false);
      assert.deepEqual(fs.readdirSync(root).filter((name) => name.startsWith('.answer-me-with-html-')), []);
    });
  }
});


test('existing outside-root files cannot be embedded by either include mechanism', async (t) => {
  const root = sandbox(t);
  const assets = path.join(root, 'assets');
  fs.mkdirSync(assets);
  fs.writeFileSync(path.join(root, 'outside.js'), 'const outside = true;');
  fs.writeFileSync(path.join(root, 'outside.png'), PNG);
  for (const [name, content] of [['code', fence('js', '', 'src=../outside.js')], ['image', '![outside](../outside.png)']]) {
    const input = draft(assets, '# Outside\n\n## A Includes\n' + content);
    const output = path.join(root, name);
    await assert.rejects(buildExplanation({ input, output }), /escapes authorized asset root/);
    assert.equal(fs.existsSync(output), false);
  }
});

test('an outside-root directory alias is refused even when its real target is authorized', async (t) => {
  const root = sandbox(t);
  const assets = path.join(root, 'assets');
  const alias = path.join(root, 'outside-alias');
  fs.mkdirSync(assets);
  fs.writeFileSync(path.join(assets, 'safe.js'), 'const safe = true;');
  fs.writeFileSync(path.join(assets, 'safe.png'), PNG);
  try { fs.symlinkSync(assets, alias, 'junction'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip(`Directory symlinks unavailable: ${error.code}`); return; } throw error; }
  for (const [name, content] of [['code', fence('js', '', 'src=../outside-alias/safe.js')], ['image', '![alias](../outside-alias/safe.png)']]) {
    const input = draft(assets, '# Alias\n\n## A Includes\n' + content);
    const output = path.join(root, name);
    await assert.rejects(buildExplanation({ input, output, assetRoot: assets }), /escapes authorized asset root/);
    assert.equal(fs.existsSync(output), false);
  }
});

test('secret directory aliases retain restrictions on both requested and real paths', async (t) => {
  const root = sandbox(t);
  const ordinary = path.join(root, 'ordinary');
  const secret = path.join(root, '.ssh');
  fs.mkdirSync(ordinary); fs.mkdirSync(secret);
  fs.writeFileSync(path.join(ordinary, 'safe.js'), 'const safe = true;');
  fs.writeFileSync(path.join(secret, 'ordinary.js'), 'const secretFolder = true;');
  try {
    fs.symlinkSync(secret, path.join(root, 'innocent'), 'junction');
    fs.symlinkSync(ordinary, path.join(root, '.aws'), 'junction');
  } catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip(`Directory symlinks unavailable: ${error.code}`); return; } throw error; }
  for (const [i, ref] of ['innocent/ordinary.js', '.aws/safe.js'].entries()) {
    const input = draft(root, '# Secrets\n\n## A Includes\n' + fence('js', '', `src=${ref}`));
    const output = path.join(root, `output-${i}`);
    await assert.rejects(buildExplanation({ input, output }), /keys or passwords/);
    assert.equal(fs.existsSync(output), false);
  }
});

test('input aliases use the real input parent for default authorization and relative includes', async (t) => {
  const root = sandbox(t);
  const real = path.join(root, 'real');
  const aliases = path.join(root, 'aliases');
  fs.mkdirSync(real); fs.mkdirSync(aliases);
  fs.writeFileSync(path.join(real, 'safe.js'), 'const realParent = true;');
  const source = '# Real input\n\n## A Include\n' + fence('js', '', 'src=safe.js');
  const original = draft(real, source);
  const input = path.join(aliases, 'draft.md');
  try { fs.symlinkSync(original, input, 'file'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip(`File symlinks unavailable: ${error.code}`); return; } throw error; }
  const result = await buildExplanation({ input, output: path.join(root, 'output') });
  assert.equal(result.input, fs.realpathSync.native(original));
  assert.match(fs.readFileSync(result.index, 'utf8'), /const realParent/);
});

test('existing output directory-link and its target stay intact', async (t) => {
  const root = sandbox(t);
  const target = path.join(root, 'target');
  const output = path.join(root, 'linked-output');
  fs.mkdirSync(target); fs.writeFileSync(path.join(target, 'keep'), 'unchanged');
  try { fs.symlinkSync(target, output, 'junction'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip(`Directory symlinks unavailable: ${error.code}`); return; } throw error; }
  const input = draft(root, '# Draft\n\n## A Test\nHello');
  const linkTarget = fs.readlinkSync(output);
  await assert.rejects(buildExplanation({ input, output }), /already exists/);
  assert.equal(fs.readlinkSync(output), linkTarget);
  assert.deepEqual(fs.readdirSync(target), ['keep']);
  assert.equal(fs.readFileSync(path.join(target, 'keep'), 'utf8'), 'unchanged');
});

test('public export validates required options and reports include errors at the draft construct', async (t) => {
  const root = sandbox(t);
  const input = draft(root, '# Draft\n\n## A Test\n\n' + fence('js', '', 'src=missing.js'));
  const output = path.join(root, 'output');
  for (const value of [null, [], 'draft']) await assert.rejects(buildExplanation(value), /options must be an object/);
  await assert.rejects(buildExplanation({}), /--input.*required/);
  await assert.rejects(buildExplanation({ input }), /--output.*required/);
  await assert.rejects(buildExplanation({ input, output, surprise: true }), /Unknown buildExplanation option: surprise/);
  for (const assetRoot of [null, 42, '', ' ']) await assert.rejects(buildExplanation({ input, output, assetRoot }), /--asset-root.*existing directory/);
  for (const assetRoot of [input, path.join(root, 'absent-assets')]) await assert.rejects(buildExplanation({ input, output, assetRoot }), /Asset root must be an existing directory/);
  for (const [key, invalid] of [['template', 'video'], ['theme', 'missing-theme'], ['mode', 'night']]) await assert.rejects(buildExplanation({ input, output, [key]: invalid }), new RegExp(`Invalid --${key}`));
  await assert.rejects(buildExplanation({ input, output }), (error) => {
    assert.match(error.message, /Code include not found or inaccessible/);
    assert.equal(error.line, 5, 'line describes the draft fence, not included code');
    return true;
  });
  await assert.rejects(buildExplanation({ input: path.join(root, 'absent.md'), output }), /Input draft not found or inaccessible/);
  assert.equal(fs.existsSync(output), false);
});

test('CLI rejects malformed flags and prints actionable draft context without partial publication', (t) => {
  const root = sandbox(t);
  const input = draft(root, '# Draft\n\n## A Test\n\n' + fence('js', '', 'src=missing.js'));
  const output = path.join(root, 'output');
  for (const args of [[], ['--input'], ['--input', input, '--input', input], ['--input', input, '--output', output, '--unknown', 'value']]) {
    const result = cli(HELPER, root, args);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /(?:required|Usage)/);
    assert.equal(result.stdout, '');
  }
  const include = cli(HELPER, root, ['--input', input, '--output', output]);
  assert.equal(include.status, 1, include.stderr);
  assert.match(include.stderr, /Code include.*missing.js.*draft line 5/);
  assert.equal(include.stdout, '');
  assert.equal(fs.existsSync(output), false);
  assert.deepEqual(fs.readdirSync(root).filter((name) => name.startsWith('.answer-me-with-html-')), []);
});

test('invalid included line ranges fail before publication without losing upstream diagnostics', async (t) => {
  for (const [range, pattern] of [['0', /positive ascending/], ['2-1', /positive ascending/], ['x', /positive ascending/], ['1-9', /goes past the end/]]) {
    await t.test(range, async (t) => rejected(t, '# Draft\n\n## A Test\n' + fence('js', '', `src=sample.js lines=${range}`), pattern, (root) => fs.writeFileSync(path.join(root, 'sample.js'), 'const a = 1;\n')));
  }
});

test('minimal installed resources render local includes and real MathML from another directory', (t) => {
  const root = sandbox(t);
  const packaged = packageCopy(root);
  const cwd = path.join(root, 'caller');
  const assets = path.join(root, 'drafts');
  const home = path.join(root, 'home');
  fs.mkdirSync(cwd); fs.mkdirSync(assets); fs.mkdirSync(home);
  fs.writeFileSync(path.join(assets, 'sample.js'), 'const offline = true;\n');
  fs.writeFileSync(path.join(assets, 'image.png'), PNG);
  const source = '# 数学与离线资源\n\n## A 公式\n$E=mc^2$\n\n![图](image.png)\n\n' + fence('js', '', 'src=sample.js');
  const input = draft(assets, source);
  const output = path.join(cwd, 'output');
  const completed = cli(packaged.helper, cwd, ['--input', input, '--output', output], { HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: home });
  assert.equal(completed.status, 0, completed.stderr);
  const result = JSON.parse(completed.stdout);
  const html = fs.readFileSync(result.index, 'utf8');
  assert.match(html, /<math\b[^>]*>[\s\S]*?<mi\b[^>]*>E<\/mi>/);
  assert.match(html, /<msup\b/);
  assert.deepEqual(result.stats.mathWarnings, []);
  assert.match(html, /const offline/);
  assert.ok(html.includes(`data:image/png;base64,${PNG.toString('base64')}`));
  assert.equal(decodeSource(html), source);
  assert.equal(result.sourceEmbedded, true);
  assert.deepEqual(fs.readdirSync(output).sort(), ['LICENSES.txt', 'index.html']);
  assert.deepEqual(fs.readdirSync(home), []);
  assert.deepEqual(fs.readdirSync(cwd), ['output']);
  assert.equal(fs.existsSync(path.join(packaged.skill, 'node_modules')), false);
});
