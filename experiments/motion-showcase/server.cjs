"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assets = { "/": ["index.html", "text/html"], "/index.html": ["index.html", "text/html"], "/style.css": ["style.css", "text/css"], "/app.js": ["app.js", "text/javascript"] };
const server = http.createServer((req, res) => {
  const asset = assets[new URL(req.url, "http://localhost").pathname];
  if (!asset || !["GET", "HEAD"].includes(req.method)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": `${asset[1]}; charset=utf-8`, "Cache-Control": "no-store" });
  res.end(req.method === "HEAD" ? undefined : fs.readFileSync(path.join(__dirname, asset[0])));
});
server.listen(Number(process.env.PORT || 4173), "127.0.0.1", () => console.log("Motion Studies: http://127.0.0.1:4173"));
