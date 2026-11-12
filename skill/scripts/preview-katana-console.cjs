#!/usr/bin/env node
'use strict';

// Read-only preview of the fixed-reference export. Never evaluate or rewrite its files.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const DEFAULT_ROOT = path.resolve(__dirname, '../references/katana-console');
const TOKEN_PATH = 'prototypes/chart-engine/tokens.css';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.py': 'text/plain; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function safeRelative(value) {
  if (typeof value !== 'string' || !value || /[\\\0%]/.test(value)) return false;
  return value.split('/').every((segment) => segment && !segment.startsWith('.') && !/[\x00-\x1f\x7f]/.test(segment));
}

function sourceUrl(relative) {
  return '/source/' + relative.split('/').map(encodeURIComponent).join('/');
}

function contained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

function loadReference(resourceRoot) {
  const manifest = JSON.parse(fs.readFileSync(path.join(resourceRoot, 'manifest.json'), 'utf8'));
  if (!Array.isArray(manifest.files) || !Array.isArray(manifest.components)) {
    throw new Error('KATANA manifest must contain files and components arrays.');
  }
  const sourceRoot = fs.realpathSync(path.join(resourceRoot, 'source'));
  const files = new Set(manifest.files.map((entry) => entry.path).filter(safeRelative));
  if (!files.has(TOKEN_PATH)) throw new Error('KATANA manifest is missing the exported token CSS.');
  function resolveFile(relative) {
    if (!safeRelative(relative) || !files.has(relative)) return { status: 404 };
    if (!TYPES[path.extname(relative).toLowerCase()]) return { status: 403 };
    try {
      const resolved = fs.realpathSync(path.join(sourceRoot, ...relative.split('/')));
      if (!contained(sourceRoot, resolved)) return { status: 403 };
      if (!fs.statSync(resolved).isFile()) return { status: 404 };
      return { path: resolved };
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return { status: 404 };
      throw error;
    }
  }
  const tokenFile = resolveFile(TOKEN_PATH);
  if (!tokenFile.path) throw new Error('The exported token CSS is unavailable or outside the source directory.');
  const tokens = fs.readFileSync(tokenFile.path, 'utf8');
  const components = new Map();
  for (const component of manifest.components) {
    if (!component || !safeRelative(component.id) || component.id.includes('/') || components.has(component.id)) {
      throw new Error('KATANA manifest has an invalid or duplicate component id.');
    }
    if (component.readmePath && (!safeRelative(component.readmePath) || !files.has(component.readmePath))) {
      throw new Error('KATANA component README is absent from the manifest allowlist.');
    }
    if (component.previewPath && (!safeRelative(component.previewPath) || !files.has(component.previewPath))) {
      throw new Error('KATANA component preview is absent from the manifest allowlist.');
    }
    if (!component.readmePath && !component.previewPath) throw new Error('KATANA component has neither specification nor preview.');
    components.set(component.id, component);
  }
  return { manifest, files, components, tokens, resolveFile };
}

function injectHostTokens(html, tokens) {
  // Prototype themes take precedence. Cards without a host get the source's own CSS.
  if (/:root\s*(?:,[^{]*)?\{/i.test(html)) return html;
  const style = '<style data-katana-host-tokens>\n' + tokens + '\n</style>';
  return /<head(?:\s[^>]*)?>/i.test(html)
    ? html.replace(/<head(?:\s[^>]*)?>/i, (opening) => opening + '\n' + style)
    : style + '\n' + html;
}

function maturityLabel(component) {
  const labels = {
    'implemented-reported': '上游报告 IMPLEMENTED · 交互样机',
    'specification-with-preview': '规格 + 静态预览',
    'specification-only': '仅规格',
    'preview-only': '仅静态预览 · 缺少组件 README',
  };
  return labels[component.sourceMaturity] || component.sourceMaturity || '上游未声明成熟度';
}

function page(title, content, manifest) {
  const source = manifest.source || {};
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} — KATANA Console</title><style>
  *{box-sizing:border-box}body{margin:0;background:#141311;color:#e8e5dd;font:14px/1.55 system-ui,sans-serif}a{color:#e2bc61}header{padding:16px 24px;border-bottom:1px solid #40392e}h1{margin:0 0 4px;font-size:22px}p{margin:6px 0}.meta{color:#b3aea3;font-size:12px}main{padding:18px 24px}ul{padding-left:20px}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));list-style:none;padding:0;gap:10px}.cards li{border:1px solid #40392e;padding:12px}.cards a{font-weight:600}.cards small{display:block;color:#b3aea3;margin-top:4px}iframe{display:block;border:0;width:100%;height:calc(100vh - 205px);min-height:450px;background:#141311}code{overflow-wrap:anywhere}nav{margin-bottom:8px}
  </style></head><body><header><nav><a href="/">KATANA Console 参考库</a></nav><h1>${escapeHtml(title)}</h1><p class="meta">用户授权内部复用 · 源未声明开源许可 · 预览用于设计参考；交互样机为 FIXTURE，不代表真实账户或生产能力。</p><p class="meta">来源 <code>${escapeHtml(source.repository)}</code> · <code>${escapeHtml(source.commit || manifest.sourceCommit)}</code></p></header>${content}</body></html>`;
}

function indexPage(reference) {
  const cards = [...reference.components.values()].sort((a, b) => a.id.localeCompare(b.id)).map((component) =>
    `<li><a href="/components/${encodeURIComponent(component.id)}">${escapeHtml(component.name || component.id)}</a><small>${escapeHtml(maturityLabel(component))} · 未独立验收</small></li>`).join('');
  const prototypes = [...reference.files].filter((relative) => /^prototypes\/[^/]+\/index\.html$/.test(relative)).sort();
  const docs = [...reference.files].filter((relative) => /^project\/[^/]+\.md$/.test(relative)).sort();
  const links = (items) => items.map((relative) => `<li><a href="${sourceUrl(relative)}">${escapeHtml(relative)}</a></li>`).join('');
  return page('KATANA Console', `<main><p>${reference.components.size} 张组件卡。保留上游规格和成熟度声明，尚未独立验收。原预览可能使用外链字体；未下载字体或其他媒体，本地缺失时由字体栈回退。</p><h2>组件</h2><ul class="cards">${cards}</ul><h2>独立样机</h2><ul>${links(prototypes)}</ul><h2>设计规范</h2><ul>${links(docs)}</ul></main>`, reference.manifest);
}

function componentPage(component, reference) {
  const verification = component.verificationStatus === 'not-independently-verified'
    ? '未独立验收' : component.verificationStatus || '未独立验收';
  const preview = component.previewPath
    ? `<iframe title="${escapeHtml(component.name || component.id)} FIXTURE 预览" sandbox="allow-scripts allow-same-origin" src="${sourceUrl(component.previewPath)}"></iframe>`
    : '<p>该组件仅有规格，尚无导出的预览。</p>';
  const documentation = component.readmePath
    ? `<a href="${sourceUrl(component.readmePath)}">来源 README</a>`
    : `缺少组件 README · <a href="${sourceUrl(component.previewPath)}">来源预览</a>`;
  return page(component.name || component.id, `<main><p>${escapeHtml(maturityLabel(component))} · ${escapeHtml(verification)} · ${documentation}</p>${preview}</main>`, reference.manifest);
}

function send(response, method, status, content, contentType = 'text/plain; charset=utf-8') {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
  response.writeHead(status, {
    'Content-Type': contentType, 'Content-Length': bytes.length, 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  });
  response.end(method === 'HEAD' ? undefined : bytes);
}

function createPreviewServer({ resourceRoot = DEFAULT_ROOT } = {}) {
  const reference = loadReference(resourceRoot);
  return http.createServer((request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) return send(response, request.method, 405, 'Method not allowed.');
      // Do not normalize away traversal before checking the raw request path.
      const raw = request.url.split('?')[0];
      let route;
      try { route = decodeURIComponent(raw); } catch { return send(response, request.method, 400, 'Invalid path.'); }
      if (!route.startsWith('/') || /[\\\0%]/.test(route)
        || route.slice(1).split('/').some((segment) => segment.startsWith('.'))) {
        return send(response, request.method, 403, 'Forbidden path.');
      }
      if (route === '/') return send(response, request.method, 200, indexPage(reference), TYPES['.html']);
      if (route.startsWith('/components/')) {
        const component = reference.components.get(route.slice('/components/'.length));
        return component ? send(response, request.method, 200, componentPage(component, reference), TYPES['.html'])
          : send(response, request.method, 404, 'Not found.');
      }
      if (!route.startsWith('/source/')) return send(response, request.method, 404, 'Not found.');
      const relative = route.slice('/source/'.length);
      const file = reference.resolveFile(relative);
      if (!file.path) return send(response, request.method, file.status, 'Not found.');
      const extension = path.extname(relative).toLowerCase();
      const bytes = fs.readFileSync(file.path);
      const content = extension === '.html' ? injectHostTokens(bytes.toString('utf8'), reference.tokens) : bytes;
      return send(response, request.method, 200, content, TYPES[extension]);
    } catch {
      return send(response, request.method, 500, 'Preview unavailable.');
    }
  });
}

async function startPreviewServer({ resourceRoot = DEFAULT_ROOT, port = 0 } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer from 0 to 65535.');
  const server = createPreviewServer({ resourceRoot });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
  const selectedPort = server.address().port;
  return { server, port: selectedPort, url: `http://127.0.0.1:${selectedPort}/` };
}

function parseArgs(args) {
  let port = 0;
  let help = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') { help = true; continue; }
    let value;
    if (argument === '--port') value = args[++index];
    else if (argument.startsWith('--port=')) value = argument.slice('--port='.length);
    else throw new Error(`Unknown argument: ${argument}`);
    if (!/^\d+$/.test(value || '') || Number(value) > 65535) throw new Error('--port requires an integer from 0 to 65535.');
    port = Number(value);
  }
  return { port, help };
}

module.exports = { createPreviewServer, startPreviewServer, injectHostTokens, parseArgs };

if (require.main === module) {
  (async () => {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log('Usage: node skill/scripts/preview-katana-console.cjs [--port 4100]\nRead-only preview on 127.0.0.1; default port 0 selects an available port.');
      return;
    }
    const preview = await startPreviewServer(options);
    console.log(`KATANA Console preview: ${preview.url}`);
    console.log('用户授权内部复用 · FIXTURE / 规格预览 · 未独立验收');
    const close = () => preview.server.close(() => process.exit(0));
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
  })().catch((error) => { console.error(`KATANA preview: ${error.message}`); process.exitCode = 1; });
}
