#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SOURCE_ROOT = path.resolve(__dirname, '../../vendor/good-css/upstream');
const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const escapeHtml = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// ponytail: parse the pinned ATX/triple-backtick format only; extend this parser
// and its parity check after a reviewed source-format change. Fail on drift.
function readPractices(source) {
  const categories = [];
  let category;
  let entry;
  let fence;
  for (const line of source.replaceAll('\r\n', '\n').split('\n')) {
    if (fence) {
      if (line === '```') {
        if (!Object.hasOwn(entry.code, fence.lang)) throw new Error(`Unsupported code fence: ${fence.lang}`);
        entry.code[fence.lang].push(fence.lines.join('\n'));
        fence = null;
      } else fence.lines.push(line);
      entry.body.push(line);
      continue;
    }
    const heading = line.match(/^(#{2,3}) (.+)$/);
    if (heading?.[1] === '##') {
      category = { title: heading[2], slug: slugify(heading[2]), entries: [] };
      categories.push(category);
      entry = null;
    } else if (heading) {
      if (!category) throw new Error('Practice has no category');
      entry = { title: heading[2], slug: slugify(heading[2]), body: [], code: { css: [], html: [], js: [] } };
      category.entries.push(entry);
    } else if (entry) {
      entry.body.push(line);
      const opening = line.match(/^```(\w+)$/);
      if (opening) fence = { lang: opening[1], lines: [] };
      else if (line.startsWith('```')) throw new Error('Unsupported code-fence format');
    }
  }
  if (fence) throw new Error('Unclosed practice code fence');
  const active = categories.filter((item) => item.entries.length);
  const entries = active.flatMap((item) => item.entries);
  if (entries.length !== 47 || new Set(entries.map((item) => item.slug)).size !== entries.length || entries.some((item) => !item.code.css.length)) {
    throw new Error('Expected 47 unique good-css practices with CSS');
  }
  return { categories: active, entries };
}

function readFixture(html, slug) {
  const header = html.match(/<template data-specimen([^>]*)>([\s\S]*?)<\/template>/);
  if (!header) throw new Error(`Missing specimen template: ${slug}`);
  const attributes = Object.fromEntries([...header[1].matchAll(/data-([a-z]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]));
  if (!/^\d+$/.test(attributes.height) || Number(attributes.height) <= 0 || !header[2].trim()) {
    throw new Error(`Invalid specimen template: ${slug}`);
  }
  return { html, height: Number(attributes.height), viewport: attributes.viewport, check: header[2].trim() };
}

function specimenPage(entry, fixture, tokens, base) {
  const viewport = ['width=device-width', 'initial-scale=1', fixture.viewport].filter(Boolean).join(', ');
  let html = fixture.html.replaceAll('<!-- html -->', entry.code.html.join('\n'));
  // Upstream uses site-root example routes. The fixture click handlers still run;
  // these local destinations also work when an example link is opened separately.
  html = html.replace(/href="\/([^"?#]+)"/g, (_, route) => `href="css-destination.html#${slugify(route)}"`);
  if (entry.slug === 'cross-document-view-transitions') {
    html = html.replace(/href="\?page=([ab])"/g, 'href="cross-document-view-transitions.html?page=$1"');
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="${escapeHtml(viewport)}">
<title>${escapeHtml(entry.title.replaceAll('`', ''))}</title>
<script>
  if (new URLSearchParams(location.search).get("panel") === "light") document.documentElement.dataset.panel = "light";
</script>
<style>
${tokens.replaceAll('/fonts/', '../assets/fonts/')}
${base}
</style>
<style data-source="PRACTICES.md">
${entry.code.css.join('\n\n')}
</style>
</head>
<body>
${html}
<script type="module">
${entry.code.js.join('\n\n')}
</script>
</body>
</html>`;
}

function indexPage(practices, fixtures, tokens) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Good CSS — offline study</title>
<style>${tokens.replaceAll('/fonts/', 'assets/fonts/')}
body { max-inline-size: 72rem; margin: auto; padding: 1.5rem; font-family: var(--bp-font-sans); line-height: 1.5; }
a { color: inherit; } section { margin-block: 3rem; } li { margin-block: 1.5rem; } pre { white-space: pre-wrap; overflow-wrap: anywhere; font-family: var(--bp-font-mono); font-size: 0.875rem; }
:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
</style></head>
<body>
<h1>Good CSS — 47 offline specimens</h1>
<p>Build from the pinned upstream practices and fixtures. Resize each specimen's window and follow its check. Modern CSS support varies by browser; inspect the real result and retain the usable fallback described in the source.</p>
<p><a href="source/PRACTICES.md">Complete original practices</a> · <a href="source/LICENSE">MIT license</a> · <a href="assets/fonts/Inter-OFL.txt">Inter license</a> · <a href="assets/fonts/GeistMono-OFL.txt">Geist Mono license</a></p>
<p>Component Conformance requires project evidence. Visual Acceptance requires a separate visual review. These studies establish neither.</p>
${practices.categories.map((category, index) => `<section id="${category.slug}"><h2>${escapeHtml(category.title)}</h2><ol>
${category.entries.map((entry) => `<li id="${entry.slug}">
<a href="specimens/${entry.slug}.html${index % 2 ? '?panel=light' : ''}">${escapeHtml(entry.title.replaceAll('`', ''))}</a>
<p>${fixtures.get(entry.slug).check}</p>
<p>Upstream starting height: ${fixtures.get(entry.slug).height}px. <a href="specimens/${entry.slug}.html">Dark panel</a> · <a href="specimens/${entry.slug}.html?panel=light">Light panel</a></p>
<details><summary>Original code, conditions, support and credits</summary><pre>${escapeHtml(entry.body.join('\n').trim())}</pre></details>
</li>`).join('\n')}
</ol></section>`).join('\n')}
</body></html>`;
}

function destinationPage(entries) {
  const routes = [...new Set(entries.flatMap((entry) => [...entry.code.html.join('\n').matchAll(/href="\/([^"?#]+)"/g)].map(([, route]) => route)))];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CSS example destinations</title></head><body>
<h1>CSS example destinations</h1><p>The upstream routes illustrate link markup. The specimens handle their interactions locally; this page keeps separately opened example links offline.</p>
${routes.map((route) => `<section id="${slugify(route)}"><h2>/${escapeHtml(route)}</h2></section>`).join('\n')}
<p><a href="../index.html">Return to all 47 specimens</a></p></body></html>`;
}

function outputExists(output) {
  try { fs.lstatSync(output); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

function buildStudy({ output, sourceRoot = SOURCE_ROOT } = {}) {
  if (typeof output !== 'string' || !output.trim()) throw new Error('--output <new-directory> is required');
  output = path.resolve(output);
  if (outputExists(output)) throw new Error(`Output already exists: ${output}`);
  const parent = fs.realpathSync.native(path.dirname(output));
  output = path.join(parent, path.basename(output));
  sourceRoot = fs.realpathSync.native(sourceRoot);
  const relative = path.relative(sourceRoot, output);
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Study output must be outside the preserved source');
  }
  const read = (file) => fs.readFileSync(path.join(sourceRoot, file));
  const source = read('PRACTICES.md');
  const practices = readPractices(source.toString('utf8'));
  const tokens = read('harness/tokens.css').toString('utf8');
  const base = read('harness/demos/base.css').toString('utf8');
  const fixtures = new Map(practices.entries.map((entry) => [entry.slug, readFixture(read(`harness/demos/${entry.slug}.html`).toString('utf8'), entry.slug)]));
  const files = new Map([
    ['index.html', indexPage(practices, fixtures, tokens)],
    ['specimens/css-destination.html', destinationPage(practices.entries)],
    ['source/PRACTICES.md', source],
    ['source/LICENSE', read('LICENSE')],
    ...practices.entries.map((entry) => [`specimens/${entry.slug}.html`, specimenPage(entry, fixtures.get(entry.slug), tokens, base)]),
  ]);
  const publicRoot = path.join(sourceRoot, 'harness/public');
  for (const file of fs.readdirSync(publicRoot, { recursive: true, withFileTypes: true })) {
    if (file.isDirectory()) continue;
    if (!file.isFile()) throw new Error(`Unsupported source asset: ${file.name}`);
    const filename = path.join(file.parentPath, file.name);
    files.set(`assets/${path.relative(publicRoot, filename).split(path.sep).join('/')}`, fs.readFileSync(filename));
  }
  for (const required of ['Inter-Variable.woff2', 'GeistMono-Variable.woff2', 'Inter-OFL.txt', 'GeistMono-OFL.txt']) {
    if (!files.has(`assets/fonts/${required}`)) throw new Error(`Missing local font or license: ${required}`);
  }
  // Load and validate every source before writing; staging also keeps write errors
  // from leaving an incomplete caller-visible study directory.
  const staging = fs.mkdtempSync(path.join(parent, '.good-css-study-'));
  try {
    for (const [file, contents] of files) {
      const destination = path.join(staging, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, contents);
    }
    if (outputExists(output)) throw new Error(`Output already exists: ${output}`);
    fs.renameSync(staging, output);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
  return { output, index: path.join(output, 'index.html'), specimens: practices.entries.length, categories: practices.categories.length };
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2 || args[0] !== '--output') throw new Error('Usage: node build-study.cjs --output <new-directory> (parent directory must exist)');
    process.stdout.write(`${JSON.stringify(buildStudy({ output: args[1] }), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { buildStudy, readPractices, readFixture, specimenPage };
