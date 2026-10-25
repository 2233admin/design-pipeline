#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { createHash } = require('node:crypto');

const TOOL_ROOT = __dirname;
const VENDOR_ROOT = path.resolve(__dirname, '../../vendor/answer-me-with-html');
const COMPONENTS = new Set(['callout', 'kv', 'timeline', 'annot', 'tree', 'limits', 'sequence', 'flow', 'er', 'ask']);
const INLINE_COMPONENTS = new Set(['kv', 'timeline', 'tree', 'ask']);
const OPTIONS = { template: ['doc', 'sheet'], theme: ['paper', 'blueprint', 'shadcn'], mode: ['auto', 'light', 'dark'] };
const DEFAULTS = { template: 'doc', theme: 'paper', mode: 'auto', style: 'off' };
const USAGE = 'Usage: node build-explanation.cjs --input <draft.md> --output <new-directory> [--asset-root <directory>] [--template doc|sheet] [--theme paper|blueprint|shadcn] [--mode auto|light|dark]';

function exists(filename) {
  try { fs.lstatSync(filename); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
function inside(root, filename) {
  const rel = path.relative(root, filename);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}
function regular(filename, label) {
  let real;
  try { real = fs.realpathSync.native(filename); } catch (error) { throw new Error(`${label} not found or inaccessible: ${filename} (${error.code})`); }
  if (!fs.statSync(real).isFile()) throw new Error(`${label} must be a regular file: ${filename}`);
  return real;
}
function directory(filename, label) {
  let real;
  try { real = fs.realpathSync.native(filename); } catch (error) { throw new Error(`${label} must be an existing directory: ${filename} (${error.code})`); }
  if (!fs.statSync(real).isDirectory()) throw new Error(`${label} must be an existing directory: ${filename}`);
  return real;
}
function decodeUrl(value) {
  let text = String(value);
  for (let i = 0; i < 4; i++) {
    const next = text.replace(/&#(?:x([\da-f]+)|(\d+));?/gi, (_, hex, dec) => {
      const n = Number.parseInt(hex || dec, hex ? 16 : 10);
      return n <= 0x10ffff ? String.fromCodePoint(n) : '\ufffd';
    }).replace(/&(amp|colon|tab|newline|quot|apos|lt|gt);/gi, (_, name) => ({ amp: '&', colon: ':', tab: '\t', newline: '\n', quot: '"', apos: "'", lt: '<', gt: '>' })[name.toLowerCase()]);
    let decoded = next;
    try { decoded = decodeURIComponent(next); } catch { /* Invalid escapes are not treated as another scheme. */ }
    if (decoded === text) break;
    text = decoded;
  }
  return text;
}
function safeLink(value) {
  const normalized = decodeUrl(value).replace(/[\s\u0000-\u0020\u007f-\u009f]/g, '');
  if (/^(?:https?:\/\/|mailto:|#)/i.test(normalized) && !/^https?:\/\/[\\/]/i.test(normalized)) return;
  throw new Error(`Unsafe hyperlink "${value}": use HTTP(S), mailto: or a #fragment`);
}
function imagePath(value, baseDir) {
  let ref = String(value).replace(/&amp;/g, '&');
  try { ref = decodeURI(ref); } catch { /* Match upstream image reference decoding. */ }
  const normalized = decodeUrl(ref).replace(/[\s\u0000-\u0020\u007f-\u009f]/g, '');
  if (/^(?:[a-z][a-z0-9+.-]*:|[\\/]{2}|#|~[\\/])/i.test(normalized) && !/^[a-z]:[\\/]/i.test(normalized) && !/^file:/i.test(normalized)) {
    throw new Error(`Image "${value}" must be a local raster file, not a remote URL or data URI`);
  }
  if (/^file:/i.test(ref)) {
    try { return fileURLToPath(ref); } catch { throw new Error(`Invalid local image URL: ${value}`); }
  }
  return path.resolve(baseDir, ref);
}
function raster(filename, bytes) {
  const ext = path.extname(filename).toLowerCase();
  const valid = {
    '.png': bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    '.jpg': bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    '.jpeg': bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    '.gif': /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString('ascii')),
    '.webp': bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP',
    '.avif': bytes.subarray(4, 8).toString('ascii') === 'ftyp' && /(?:avif|avis)/.test(bytes.subarray(8, 32).toString('ascii')),
  };
  if (!valid[ext]) throw new Error(`Image must contain supported raster bytes (.png .jpg .jpeg .gif .webp .avif), not SVG: ${filename}`);
  if (bytes.length > 5 * 1024 * 1024) throw new Error(`Image exceeds the 5 MB renderer limit: ${filename}`);
}

function atDraftLine(line, inspect) {
  try { return inspect(); } catch (error) {
    // Include errors concern a fence/reference in the draft, not a line in its file.
    if (!error.line) error.line = line;
    throw error;
  }
}

// These are upstream policy primitives, not a second Markdown/fence/argument grammar.
// The maintained library must expose them and prefer vetted include maps to filesystem reads.
async function loadRenderer() {
  const filename = regular(path.join(TOOL_ROOT, 'renderer.mjs'), 'Packaged renderer');
  let renderer;
  try { renderer = await import(pathToFileURL(filename).href); } catch (error) { throw new Error(`Cannot load packaged renderer: ${error.message}`); }
  for (const name of ['renderDoc', 'parseDoc', 'parseCodeArgs', 'lexer', 'walkTokens', 'hasDelta', 'wrapSpacedImages', 'readSlice']) {
    if (typeof renderer[name] !== 'function') throw new Error(`Invalid packaged renderer: missing ${name}; reinstall the complete helper resources`);
  }
  if (renderer.version !== '0.5.2' || !renderer.runtimeAssets || ['RUNTIME_JS', 'RTL_JS', 'DELTA_JS'].some((name) => typeof renderer.runtimeAssets[name] !== 'string' || !renderer.runtimeAssets[name])) {
    throw new Error('Invalid packaged renderer runtime assets/version; reinstall the complete helper resources');
  }
  return renderer;
}

function preflight(source, renderer, baseDir, assetRoot) {
  const parsed = renderer.parseDoc(source, { defaults: DEFAULTS });
  const knownImages = new Map();
  const knownCode = new Map();
  const authorized = (filename, label) => {
    const requested = path.resolve(filename);
    const real = regular(requested, label);
    if (!inside(assetRoot, requested) || !inside(assetRoot, real)) throw new Error(`${label} escapes authorized asset root ${assetRoot}: ${filename}`);
    return { requested, real };
  };
  const inspectMarkdown = (text, line) => {
    const tokens = renderer.lexer(renderer.wrapSpacedImages(text));
    const check = (token) => {
      if (token.type === 'html') throw new Error(`Raw HTML/SVG is not allowed at draft line ${line}; show markup in a non-html code fence`);
      if (token.type === 'link') safeLink(token.href);
      if (token.type === 'image') {
        const { real } = authorized(imagePath(token.href, baseDir), 'Image include');
        const bytes = fs.readFileSync(real);
        // Extension and content must agree, including when the requested name is an alias.
        raster(imagePath(token.href, baseDir), bytes);
        raster(real, bytes);
        const mime = { '.png': 'png', '.jpg': 'jpeg', '.jpeg': 'jpeg', '.gif': 'gif', '.webp': 'webp', '.avif': 'avif' }[path.extname(real).toLowerCase()];
        let ref = String(token.href).replace(/&amp;/g, '&');
        try { ref = decodeURI(ref); } catch { /* Match upstream. */ }
        knownImages.set(ref, `data:image/${mime};base64,${bytes.toString('base64')}`);
      }
    };
    renderer.walkTokens(tokens, check);
    // Marked removes definitions from ordinary tokens; inspect even unused references.
    for (const ref of Object.values(tokens.links || {})) {
      const destination = decodeUrl(ref.href).replace(/[\s\u0000-\u0020\u007f-\u009f]/g, '');
      if (/^(?:[a-z][a-z0-9+.-]*:|[\\/]{2})/i.test(destination) && !/^[a-z]:[\\/]/i.test(destination)) safeLink(ref.href);
    }
  };
  for (const block of [...parsed.intro, ...parsed.panels.flatMap((panel) => panel.blocks)]) atDraftLine(block.line, () => {
    if (block.type === 'md') { inspectMarkdown(block.text, block.line); return; }
    if (block.lang === 'html' || block.lang === 'svg') throw new Error(`Raw ${block.lang} fence is not allowed at draft line ${block.line}; use a text code fence to show literal markup`);
    if (block.lang === 'callout') { inspectMarkdown(block.text, block.line + 1); return; }
    if (INLINE_COMPONENTS.has(block.lang)) {
      // Upstream fields are pipe-delimited and rendered inline, not block Markdown.
      // Prefixing each field avoids block-code indentation/list syntax hiding inline HTML.
      for (const [i, line] of block.text.split('\n').entries()) {
        for (const field of line.split('|')) inspectMarkdown(`label ${field.trim()}`, block.line + i + 1);
      }
      return;
    }
    if (COMPONENTS.has(block.lang)) return; // Diagram labels use upstream escaping, not Markdown.
    const opts = renderer.parseCodeArgs(block.args, block.lang === 'diff');
    if (!opts.src) return; // Pasted code is literal; upstream retains its own content checks.
    if (block.lang === 'diff') throw new Error('A diff fence does not support src=; paste the diff instead');
    const { requested, real } = authorized(path.resolve(baseDir, opts.src), 'Code include');
    let range;
    if (opts.lines) {
      const match = opts.lines.match(/^(\d+)(?:-(\d+))?$/);
      if (!match || Number(match[1]) < 1 || Number(match[2] || match[1]) < Number(match[1])) throw new Error(`Invalid code lines=${opts.lines}; use a positive ascending line range`);
      range = { from: Number(match[1]), to: Number(match[2] || match[1]) };
    }
    // readSlice applies the pinned upstream filename/directory/content/size/binary rules.
    // Check the alias and real destination: benign aliases must not disclose secret files.
    const volume = path.parse(real).root;
    renderer.readSlice(path.relative(path.parse(requested).root, requested), range, path.parse(requested).root);
    const slice = renderer.readSlice(path.relative(volume, real), range, volume);
    if (!slice) throw new Error(`Code include could not be read: ${opts.src}`);
    knownCode.set(`${opts.src}#${opts.lines || ''}`, slice);
  });
  return { knownImages, knownCode };
}

function offlineHtml(result, renderer) {
  const { RUNTIME_JS, RTL_JS, DELTA_JS } = renderer.runtimeAssets;
  const runtime = `\n${RUNTIME_JS}${result.language.dir === 'rtl' ? RTL_JS : ''}${renderer.hasDelta(result.html) ? DELTA_JS : ''}`;
  const scripts = [...result.html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  if (scripts.length !== 1 || scripts[0][1].trim() !== '' || scripts[0][2] !== runtime) throw new Error('Rendered page contains an unexpected script; refusing to authorize it');
  // Source textarea is escaped by upstream and deliberately retained unchanged.
  if (!/<textarea id="am-source" hidden readonly aria-hidden="true">[\s\S]*?<\/textarea>/.test(result.html)) throw new Error('Rendered page is missing its source-copy disclosure payload');
  const withoutScript = result.html.replace(scripts[0][0], '');
  if (/<(?:iframe|frame|object|embed|base|form|link|audio|video)\b/i.test(withoutScript)) throw new Error('Rendered page contains unsupported active content');
  for (const tag of withoutScript.matchAll(/<[a-z][^>]*>/gi)) {
    const attributes = [...tag[0].matchAll(/\s([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)];
    for (const [, name, double, single, bare] of attributes) {
      const value = double ?? single ?? bare;
      if (/^on/i.test(name)) throw new Error('Rendered page contains an unsupported event handler');
      if (name.toLowerCase() === 'href') safeLink(value || '');
      if (name.toLowerCase() === 'src' && !/^data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/=]+$/.test(value || '')) throw new Error('Rendered resource is not an embedded local raster');
      if (['srcset', 'poster', 'background', 'action', 'formaction'].includes(name.toLowerCase())) throw new Error(`Rendered page contains unsupported resource attribute ${name}`);
    }
  }
  const hash = createHash('sha256').update(runtime).digest('base64');
  const policy = `default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; media-src 'none'; worker-src 'none'; form-action 'none'; base-uri 'none'`;
  return result.html.replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="${policy}">`);
}

async function buildExplanation(options = {}) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) throw new Error('buildExplanation options must be an object');
  for (const key of Object.keys(options)) if (!['input', 'output', 'assetRoot', ...Object.keys(OPTIONS)].includes(key)) throw new Error(`Unknown buildExplanation option: ${key}`);
  for (const key of ['input', 'output']) if (typeof options[key] !== 'string' || !options[key].trim()) throw new Error(`--${key} <${key === 'input' ? 'draft.md' : 'new-directory'}> is required`);
  if (options.assetRoot !== undefined && (typeof options.assetRoot !== 'string' || !options.assetRoot.trim())) throw new Error('--asset-root <directory> must name an existing directory');
  const settings = { ...DEFAULTS };
  for (const [name, choices] of Object.entries(OPTIONS)) {
    if (options[name] !== undefined) {
      if (!choices.includes(options[name])) throw new Error(`Invalid --${name}: choose ${choices.join('|')}`);
      settings[name] = options[name];
    }
  }
  const input = regular(path.resolve(options.input), 'Input draft');
  const baseDir = path.dirname(input);
  const assetRoot = directory(options.assetRoot === undefined ? baseDir : path.resolve(options.assetRoot), 'Asset root');
  let output = path.resolve(options.output);
  if (exists(output)) throw new Error(`Output already exists: ${output}`);
  const parent = directory(path.dirname(output), 'Output parent');
  output = path.join(parent, path.basename(output));
  if (exists(output)) throw new Error(`Output already exists: ${output}`);
  for (const root of [fs.realpathSync.native(TOOL_ROOT), fs.realpathSync.native(VENDOR_ROOT)]) {
    if (inside(root, output) || inside(output, root)) throw new Error(`Explanation output must not overlap packaged helper/source: ${output}`);
  }
  const noticesPath = regular(path.join(VENDOR_ROOT, 'LICENSES.txt'), 'Required redistribution notices');
  const notices = fs.readFileSync(noticesPath);
  const provenancePath = regular(path.join(VENDOR_ROOT, 'manifest.json'), 'Required notices provenance');
  let provenance;
  try { provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8')); }
  catch (error) { throw new Error(`Required notices provenance is invalid: ${error.message}`); }
  if (provenance.schema !== 'design-pipeline.answer-me-with-html-source.v1' || provenance.aggregate?.path !== 'LICENSES.txt' || !/^[a-f0-9]{64}$/.test(provenance.aggregate?.sha256 || '') || createHash('sha256').update(notices).digest('hex') !== provenance.aggregate.sha256) throw new Error('Required redistribution notices differ from packaged provenance; reinstall complete resources');
  const source = fs.readFileSync(input, 'utf8');
  const renderer = await loadRenderer();
  const includes = preflight(source, renderer, baseDir, assetRoot);
  const rendered = renderer.renderDoc(source, settings, DEFAULTS, { baseDir, codeDir: baseDir, ...includes });
  const html = offlineHtml(rendered, renderer);
  const staging = fs.mkdtempSync(path.join(parent, '.answer-me-with-html-'));
  try {
    fs.writeFileSync(path.join(staging, 'index.html'), html);
    fs.writeFileSync(path.join(staging, 'LICENSES.txt'), notices);
    if (exists(output)) throw new Error(`Output already exists: ${output}`);
    fs.renameSync(staging, output);
  } finally { fs.rmSync(staging, { recursive: true, force: true }); }
  return {
    input, output, index: path.join(output, 'index.html'), licenses: path.join(output, 'LICENSES.txt'),
    template: rendered.meta.template, theme: rendered.meta.theme, mode: rendered.meta.mode,
    stats: rendered.stats, warnings: rendered.warnings, sourceEmbedded: true,
    disclosure: 'Sharing this page shares the original Markdown, included code/images and path provenance; it is not a redacted public report.',
    feedback: 'manual-copy-back', creativeAcceptance: 'not-assessed',
  };
}

function cliOptions(args) {
  const options = {};
  const names = { '--input': 'input', '--output': 'output', '--asset-root': 'assetRoot', '--template': 'template', '--theme': 'theme', '--mode': 'mode' };
  for (let i = 0; i < args.length; i += 2) {
    const key = names[args[i]];
    if (!key || options[key] !== undefined || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(USAGE);
    options[key] = args[i + 1];
  }
  return options;
}
if (require.main === module) {
  Promise.resolve().then(() => buildExplanation(cliOptions(process.argv.slice(2))))
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => { process.stderr.write(`${error.message}${error.line ? ` (draft line ${error.line})` : ''}\n`); process.exitCode = 1; });
}
module.exports = { buildExplanation };
