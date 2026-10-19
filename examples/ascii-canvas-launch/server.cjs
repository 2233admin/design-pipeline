"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assets = {
  "/": ["index.html", "text/html"], "/index.html": ["index.html", "text/html"],
  "/style.css": ["style.css", "text/css"], "/film.js": ["film.js", "text/javascript"],
  "/vendor/gsap.min.js": ["vendor/gsap.min.js", "text/javascript"],
  "/assets/landscape.png": ["assets/landscape.png", "image/png"]
};
http.createServer((req, res) => {
  let pathname;
  try { pathname = new URL(req.url, "http://localhost").pathname; }
  catch { res.writeHead(400); res.end(); return; }
  const asset = assets[pathname];
  if (!asset || !["GET", "HEAD"].includes(req.method)) { res.writeHead(404); res.end(); return; }
  try {
    const bytes = fs.readFileSync(path.join(__dirname, asset[0]));
    res.writeHead(200, { "Content-Type": asset[1] + (asset[1].startsWith("text/") ? "; charset=utf-8" : ""), "Cache-Control": "no-store" });
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch { res.writeHead(500); res.end("Asset unavailable"); }
}).listen(4174, "127.0.0.1", () => console.log("SeedController film: http://127.0.0.1:4174"));
