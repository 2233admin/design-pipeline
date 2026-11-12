'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { startPreviewServer, injectHostTokens, parseArgs } = require('../skill/scripts/preview-katana-console.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'katana-preview-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const files = {
    'project/components/Tape/preview.html': '<html><head></head><body style="color:var(--fg)">Tape fixture</body></html>',
    'project/components/Tape/README.md': '# Tape\nA source specification.',
    'project/components/Cover/preview.html': '<html><head></head><body>Cover</body></html>',
    'prototypes/chart-engine/tokens.css': ':root { --fg: #efede7; }',
    'prototypes/chart-engine/index.html': '<html><head><style>:root { --fg: pink; }</style></head><body>Own theme</body></html>',
    'project/README.md': '# Console',
  };
  for (const [relative, content] of Object.entries(files)) {
    const filename = path.join(root, 'source', relative);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, content);
  }
  fs.writeFileSync(path.join(root, 'source', 'secret.md'), 'unlisted');
  fs.writeFileSync(path.join(root, 'secret.md'), 'outside');
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({
    source: { repository: 'https://example.invalid/owned', commit: 'a'.repeat(40), path: 'design/katana-console' },
    license: 'LicenseRef-User-Authorized-Internal-Reuse',
    files: Object.keys(files).map((relative) => ({ path: relative })),
    components: [{ id: 'Tape', name: 'Tape', readmePath: 'project/components/Tape/README.md',
      previewPath: 'project/components/Tape/preview.html', sourceMaturity: 'specification-with-preview',
      verificationStatus: 'not-independently-verified' },
    { id: 'Cover', name: 'Cover', readmePath: null, previewPath: 'project/components/Cover/preview.html',
      sourceMaturity: 'preview-only', verificationStatus: 'not-independently-verified' }],
  }));
  return { root, files };
}

function request(url, requestPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const origin = new URL(url);
    const req = http.request({ hostname: origin.hostname, port: origin.port, path: requestPath, method }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('card receives missing host tokens without changing source; wrapper preserves provenance and maturity', async (t) => {
  const { root, files } = fixture(t);
  const preview = await startPreviewServer({ resourceRoot: root, port: 0 });
  t.after(() => new Promise((resolve) => preview.server.close(resolve)));
  assert.equal(preview.server.address().address, '127.0.0.1');
  const index = await request(preview.url, '/');
  assert.equal(index.status, 200);
  assert.match(index.body, /\/components\/Tape/);
  assert.match(index.body, /用户授权内部复用/);
  const wrapper = await request(preview.url, '/components/Tape');
  assert.equal(wrapper.status, 200);
  assert.match(wrapper.body, /静态预览/);
  assert.match(wrapper.body, /未独立验收/);
  assert.match(wrapper.body, /FIXTURE/);
  assert.match(wrapper.body, /project\/components\/Tape\/README\.md/);
  assert.match(wrapper.body, /a{40}/);
  const card = await request(preview.url, '/source/project/components/Tape/preview.html');
  assert.equal(card.status, 200);
  assert.match(card.body, /data-katana-host-tokens/);
  assert.match(card.body, /--fg: #efede7/);
  assert.equal(fs.readFileSync(path.join(root, 'source/project/components/Tape/preview.html'), 'utf8'), files['project/components/Tape/preview.html']);
  const prototype = await request(preview.url, '/source/prototypes/chart-engine/index.html');
  assert.equal(prototype.body, files['prototypes/chart-engine/index.html']);
  const readme = await request(preview.url, '/source/project/components/Tape/README.md');
  assert.equal(readme.body, files['project/components/Tape/README.md']);
  assert.match(readme.headers['content-type'], /text\/plain/);
  const cover = await request(preview.url, '/components/Cover');
  assert.equal(cover.status, 200);
  assert.match(cover.body, /缺少组件 README/);
  assert.match(cover.body, /来源预览/);
  assert.doesNotMatch(cover.body, /来源 README/);
});

test('server refuses unlisted, traversal, hidden and malformed paths and mutation methods', async (t) => {
  const { root } = fixture(t);
  const preview = await startPreviewServer({ resourceRoot: root, port: 0 });
  t.after(() => new Promise((resolve) => preview.server.close(resolve)));
  for (const route of ['/source/secret.md', '/manifest.json', '/source/../secret.md',
    '/source/%2e%2e/secret.md', '/source/%2e%2e%2fsecret.md', '/source/project/%5c..%5csecret.md',
    '/source/.env', '/source/project/%00README.md', '/source/%ZZ']) {
    const result = await request(preview.url, route);
    assert.ok(result.status >= 400, route);
    assert.doesNotMatch(result.body, /unlisted|outside/);
  }
  assert.equal((await request(preview.url, '/', 'POST')).status, 405);
  assert.equal((await request(preview.url, '/components/Tape', 'HEAD')).body, '');
});

test('a listed symlink outside source is refused', async (t) => {
  const { root } = fixture(t);
  const link = path.join(root, 'source/project/components/Tape/README.md');
  fs.rmSync(link);
  try {
    fs.symlinkSync(path.join(root, 'secret.md'), link, 'file');
  } catch (error) {
    if (error.code === 'EPERM') { t.skip('host does not permit file symlinks'); return; }
    throw error;
  }
  const preview = await startPreviewServer({ resourceRoot: root, port: 0 });
  t.after(() => new Promise((resolve) => preview.server.close(resolve)));
  assert.equal((await request(preview.url, '/source/project/components/Tape/README.md')).status, 403);
});

test('token adaptation preserves existing root declarations and CLI accepts only local port selection', () => {
  const own = '<style>:root, body { --fg: red; }</style>';
  assert.equal(injectHostTokens(own, ':root { --fg: blue; }'), own);
  assert.match(injectHostTokens('<body>card</body>', ':root { --fg: blue; }'), /^<style data-katana-host-tokens>/);
  assert.deepEqual(parseArgs([]), { port: 0, help: false });
  assert.equal(parseArgs(['--port', '4100']).port, 4100);
  assert.equal(parseArgs(['--port=4100']).port, 4100);
  for (const args of [['--host', '0.0.0.0'], ['--port', '-1'], ['--port', '65536'], ['--port'], ['--port', '1.5']]) {
    assert.throws(() => parseArgs(args));
  }
});
