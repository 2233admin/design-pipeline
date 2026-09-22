"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assets = {
  "/": ["index.html", "text/html"], "/index.html": ["index.html", "text/html"],
  "/style.css": ["style.css", "text/css"], "/film.js": ["film.js", "text/javascript"],
  "/vendor/gsap.min.js": ["vendor/gsap.min.js", "text/javascript"],
  "/assets/city-ruins.mp4": ["assets/city-ruins.mp4", "video/mp4"],
  "/assets/night-ride.mp4": ["assets/night-ride.mp4", "video/mp4"],
  "/assets/moon-piano.mp4": ["assets/moon-piano.mp4", "video/mp4"],
  "/assets/field-notes-score.wav": ["assets/field-notes-score.wav", "audio/wav"],
};
http.createServer((req, res) => {
  let pathname;
  try { pathname = new URL(req.url, "http://localhost").pathname; }
  catch { res.writeHead(400); res.end(); return; }
  const asset = assets[pathname];
  if (!asset || !["GET", "HEAD"].includes(req.method)) { res.writeHead(404); res.end(); return; }
  const file = path.join(__dirname, asset[0]);
  try {
    const size = fs.statSync(file).size;
    const headers = { "Content-Type": asset[1] + (asset[1].startsWith("text/") ? "; charset=utf-8" : ""), "Cache-Control": "no-store", "Accept-Ranges": "bytes" };
    const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || "");
    const start = match ? Number(match[1]) : 0;
    const end = match && match[2] ? Math.min(Number(match[2]), size-1) : size-1;
    if (start >= size || end < start) { res.writeHead(416, {"Content-Range": `bytes */${size}`}); res.end(); return; }
    if (match) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    headers["Content-Length"] = end-start+1;
    res.writeHead(match ? 206 : 200, headers);
    if(req.method === "HEAD")res.end();else fs.createReadStream(file,{start,end}).pipe(res);
  } catch { res.writeHead(500); res.end("Asset unavailable"); }
}).listen(4176,"127.0.0.1",()=>console.log("Field Notes film: http://127.0.0.1:4176"));
