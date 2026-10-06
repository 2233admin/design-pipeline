#!/usr/bin/env node
'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = __dirname;
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.md':'text/plain; charset=utf-8'};
function resolveFile(url) {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  if (pathname.includes('\0') || pathname.includes('\\')) throw new Error('Invalid path');
  const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  const relative = path.relative(root, file);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Path outside sample');
  return file;
}
async function selfCheck() {
  const assert = require('node:assert/strict');
  assert.equal(resolveFile('/'), path.join(root, 'index.html'));
  assert.equal(resolveFile('/badge.mjs?v=1'), path.join(root, 'badge.mjs'));
  for (const bad of ['/%2e%2e%2fsecret', '/%5c..%5csecret', '/%00', '/%zz']) assert.throws(() => resolveFile(bad));
  const files = (await fs.readdir(root, {recursive:true})).filter(f => /\.(m?js|html)$/.test(f));
  for (const name of files) {
    const source = await fs.readFile(path.join(root,name), 'utf8');
    assert.ok(!/node_modules|['"]\.\/(?:reference|evidence)\/|[A-Z]:[\\/]/.test(source), `Private path in ${name}`);
    for (const match of source.matchAll(/(?:^|\n)\s*(?:import|export)\s+[^;]*?\bfrom\s*['"]([^'"]+)['"]/g)) {
      const target = match[1] === 'three' ? path.join(root,'vendor/three/three.module.js') : path.resolve(root,path.dirname(name),match[1]);
      assert.ok(match[1] === 'three' || match[1].startsWith('.'), `Remote import in ${name}`);
      assert.ok((await fs.stat(target)).isFile(), `Missing import ${match[1]} from ${name}`);
    }
  }
  for (const name of ['assets/kloofendal_48d_partly_cloudy_2k.hdr','demo-motion.json','vendor/three/LICENSE','licenses/SMAA-v2.8.txt','LICENSE']) assert.ok((await fs.stat(path.join(root,name))).isFile());
  assert.ok((await fs.readFile(path.join(root,'vendor/three/three.core.js'),'utf8')).includes("REVISION = '180'"));
  console.log('PASS: static imports, local assets, licenses and path boundaries');
}
if (process.argv.includes('--check')) {
  selfCheck().catch(error => {console.error(error.message);process.exitCode=1;});
} else {
  const port = Number(process.env.PORT || 47832);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  const server = http.createServer(async (req,res) => {
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
    let file;
    try {file=resolveFile(req.url);} catch {res.writeHead(400);res.end('Invalid path');return;}
    try {
      const stat=await fs.stat(file);
      if (!stat.isFile()) {res.writeHead(404);res.end('Not found');return;}
      const body=await fs.readFile(file);
      res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Content-Length':body.length,'X-Content-Type-Options':'nosniff'});
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch(error) {res.writeHead(error.code==='ENOENT'?404:500);res.end('File unavailable');}
  });
  server.on('error', error => {console.error(error.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',() => console.log(`Enamel badge: http://127.0.0.1:${port}/`));
}
