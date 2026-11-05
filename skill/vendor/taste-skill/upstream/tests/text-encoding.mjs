#!/usr/bin/env node
// Text files stay UTF-8. An editor that reads UTF-8 as Latin-1 and saves it back turns every middle dot
// into an A-circumflex plus a dot and every dash into three stray characters across a whole file (it
// happened in a pull request to library/type.json); the JSON still parses, so nothing else catches it.
//   node tests/text-encoding.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEXT = new Set(['.md', '.json', '.js', '.mjs', '.cjs', '.css', '.html', '.yml', '.yaml', '.txt', '.sh', '.svg']);
const SKIP = new Set(['.git', 'node_modules']);
// UTF-8 bytes of common characters read as Latin-1 / Windows-1252, and the replacement character
const MOJIBAKE = /\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]|\u00E2\u20AC|\uFFFD/;
const bad = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name); const st = statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (!TEXT.has(extname(name).toLowerCase()) || st.size > 4e6) continue;
    const lines = readFileSync(p, 'utf8').split('\n');
    lines.forEach((l, i) => { const m = l.match(MOJIBAKE); if (m) bad.push(`${relative(ROOT, p).split('\\').join('/')}:${i + 1}: "${l.slice(Math.max(0, m.index - 20), m.index + 20).trim()}"`); });
  }
};
walk(ROOT);
if (bad.length) {
  console.error(`not ok - ${bad.length} line(s) look double-encoded (UTF-8 saved as Latin-1). Re-save the file as UTF-8:`);
  for (const b of bad.slice(0, 20)) console.error('  ' + b);
  process.exit(1);
}
console.log('ok - every text file reads as clean UTF-8');
