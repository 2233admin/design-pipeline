"use strict";

// The local editor behind `tunables panel` and the page host behind `tunables probe`. One loopback
// server serves the panel page, the project's own files (read-only) and a tunables.js built from
// an in-memory draft, so a changed value shows in the preview without touching the project. Only
// Save writes, and only tunables.json and tunables.js, through the same validation as `tunables set`.
// The panel has no accept, reject or render control: it is a preview, not a render, and acceptance
// stays the owner's recorded words.

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { fail } = require("./contract-utils.cjs");
const tunables = require("./tunables-core.cjs");

const PANEL_FILE = path.join(__dirname, "../tools/tunables-panel/panel.html");
const MAX_BODY = 64 * 1024;
const DEFAULT_IDLE_MINUTES = 30;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".cjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".map": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".mp4": "video/mp4", ".webm": "video/webm",
};
const PANEL_CSP = "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; frame-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'";
// The empty registry HyperFrames' runtime normally provides; a bare page registers its timeline into it.
const REGISTRY = "<script>window.__timelines=window.__timelines||{};</script>";

function status(res, code, body, headers = {}) {
  res.writeHead(code, { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers });
  res.end(body);
}

function json(res, code, value) {
  status(res, code, JSON.stringify(value), { "Content-Type": "application/json; charset=utf-8" });
}

function errorBody(error) {
  return { error: { code: error.code || "COMMAND_FAILED", message: error.message, ...(error.details?.id ? { id: error.details.id } : {}) } };
}

function insideRoot(realRoot, real) {
  const relative = path.relative(realRoot, real);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

// A page that names its files from the site root ("/tunables.js", url(/img/a.png)) works when served
// from "/" but would ask this server for a path outside the token. Point such references at the
// preview mount instead. Only HTML attributes and CSS are rewritten; a path built in a script
// (fetch, new URL) is left alone, and "//host" and "scheme:" references are never touched.
const ROOT_ATTRIBUTE = /(\b(?:src|href|poster|action|formaction|data)\s*=\s*)(["'])\/(?!\/)([^"']*)\2/gi;
const ROOT_CSS_URL = /url\(\s*(["']?)\/(?!\/)([^)"']*)\1\s*\)/gi;
const ROOT_CSS_IMPORT = /@import\s+(["'])\/(?!\/)([^"']*)\1/gi;

function rebaseCss(css, mount) {
  return css
    .replace(ROOT_CSS_URL, (_all, quote, rest) => `url(${quote}${mount}${rest}${quote})`)
    .replace(ROOT_CSS_IMPORT, (_all, quote, rest) => `@import ${quote}${mount}${rest}${quote}`);
}

function rebaseHtml(html, mount) {
  return html
    .replace(ROOT_ATTRIBUTE, (_all, name, quote, rest) => `${name}${quote}${mount}${rest}${quote}`)
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_all, open, css, close) => `${open}${rebaseCss(css, mount)}${close}`)
    .replace(/(\bstyle\s*=\s*)(["'])([\s\S]*?)\2/gi, (_all, name, quote, css) => `${name}${quote}${rebaseCss(css, mount)}${quote}`);
}

// The file a /preview/<rawRest> request names, or null. rawRest is the undecoded path: an encoded
// separator, a traversal segment, a drive or stream colon, a .git directory, an .env file or a
// symlink out of the root all answer "not found".
function previewFile(root, rawRest) {
  if (/%2f|%5c|%00|%2e%2e/i.test(rawRest)) return null;
  let decoded;
  try { decoded = decodeURIComponent(rawRest); } catch { return null; }
  const segments = decoded.split("/").filter((segment, index, all) => segment !== "" || index === all.length - 1);
  if (segments.some((segment) => segment === ".." || segment === "." || segment.includes("\\") || segment.includes(":") || segment === ".git" || segment.startsWith(".env"))) return null;
  const name = segments.filter(Boolean).join("/") || "index.html";
  let realRoot;
  let real;
  try {
    realRoot = fs.realpathSync.native(root);
    const candidate = path.resolve(root, name);
    if (!insideRoot(path.resolve(root), candidate)) return null;
    real = fs.realpathSync.native(candidate);
  } catch {
    return null;
  }
  if (!insideRoot(realRoot, real) || !fs.statSync(real).isFile()) return null;
  return { file: real, name };
}

function startPanel(root, options = {}) {
  const base = path.resolve(root);
  const token = crypto.randomBytes(16).toString("hex");
  const idleMs = options.idleMs ?? (options.idleMinutes ?? DEFAULT_IDLE_MINUTES) * 60000;
  const panelHtml = fs.readFileSync(PANEL_FILE);
  let draft = null;
  let idle = null;
  let resolveClosed;
  const closed = new Promise((resolve) => { resolveClosed = resolve; });

  const newestRender = () => {
    try { return require("./film-project-core.cjs").newestRender(base); } catch { return null; }
  };

  function currentState() {
    const loaded = tunables.readTunables(base);
    tunables.assertDocument(loaded.doc);
    const values = draft ?? loaded.doc.values;
    const shown = { ...loaded.doc, values };
    const stale = tunables.renderOlderThanValues(base, newestRender());
    return {
      revision: loaded.revision,
      params: loaded.doc.params,
      saved: loaded.doc.values,
      values,
      effective: tunables.effectiveValues(shown),
      dirty: draft !== null && JSON.stringify(Object.entries(draft).sort()) !== JSON.stringify(Object.entries(loaded.doc.values).sort()),
      stale,
    };
  }

  // Values from a request body, validated like `tunables set`, as a map of changes from default.
  function parseValues(doc, values) {
    if (values === null || typeof values !== "object" || Array.isArray(values)) fail("tunables", "values must be an object of id to value", { code: "VALUE_INVALID" });
    return tunables.applyValues({ ...doc, values: {} }, Object.entries(values)).values;
  }

  function previewScript() {
    const loaded = tunables.readTunables(base);
    tunables.assertDocument(loaded.doc);
    return tunables.generateScript({ ...loaded.doc, values: draft ?? loaded.doc.values });
  }

  function readBody(req, res) {
    return new Promise((resolve) => {
      const chunks = [];
      let size = 0;
      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY) {
          json(res, 413, { error: { code: "BODY_TOO_LARGE", message: `request body is over ${MAX_BODY} bytes` } });
          req.destroy();
          resolve(null);
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { json(res, 400, { error: { code: "BODY_INVALID", message: "request body must be JSON" } }); resolve(null); }
      });
      req.on("error", () => resolve(null));
    });
  }

  async function handle(req, res, port) {
    touch();
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!hosts.includes(String(req.headers.host || "").toLowerCase())) return status(res, 403, "forbidden host");
    if (!["GET", "PUT", "POST"].includes(req.method)) return status(res, 405, "method not allowed", { Allow: "GET, PUT, POST" });
    const origin = req.headers.origin;
    if (req.method !== "GET" && origin && !hosts.some((host) => origin.toLowerCase() === `http://${host}`)) return status(res, 403, "forbidden origin");
    const rawPath = (req.url || "/").split("?")[0].split("#")[0];
    const prefix = `/${token}/`;
    if (!rawPath.startsWith(prefix)) return status(res, 404, "not found");
    const rest = rawPath.slice(prefix.length);
    try {
      if (rest === "") {
        if (req.method !== "GET") return status(res, 405, "method not allowed", { Allow: "GET" });
        return status(res, 200, panelHtml, { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": PANEL_CSP });
      }
      if (rest === "api/state") {
        if (req.method !== "GET") return status(res, 405, "method not allowed", { Allow: "GET" });
        return json(res, 200, currentState());
      }
      if (rest === "api/draft") {
        if (req.method !== "PUT") return status(res, 405, "method not allowed", { Allow: "PUT" });
        const body = await readBody(req, res);
        if (body === null) return undefined;
        const loaded = tunables.readTunables(base);
        tunables.assertDocument(loaded.doc);
        draft = parseValues(loaded.doc, body.values);
        return json(res, 200, currentState());
      }
      if (rest === "api/save") {
        if (req.method !== "POST") return status(res, 405, "method not allowed", { Allow: "POST" });
        const body = await readBody(req, res);
        if (body === null) return undefined;
        const loaded = tunables.readTunables(base);
        tunables.assertDocument(loaded.doc);
        if (body.revision !== loaded.revision) {
          return json(res, 409, { error: { code: "REVISION_CONFLICT", message: `${tunables.FILE} changed after the panel loaded it; reload the current values, then apply your edits again` }, state: currentState() });
        }
        const values = parseValues(loaded.doc, body.values ?? draft ?? loaded.doc.values);
        const written = tunables.writeTunables(base, { ...loaded.doc, values });
        draft = null;
        return json(res, 200, { ok: true, wrote: written.wrote, state: currentState() });
      }
      if (rest === "preview" || rest.startsWith("preview/")) {
        if (req.method !== "GET") return status(res, 405, "method not allowed", { Allow: "GET" });
        const found = previewFile(base, rest.slice("preview/".length));
        if (!found) return status(res, 404, "not found");
        if (found.name === tunables.SCRIPT) return status(res, 200, previewScript(), { "Content-Type": TYPES[".js"] });
        const type = TYPES[path.extname(found.file).toLowerCase()] || "application/octet-stream";
        let body = fs.readFileSync(found.file);
        const mount = `${prefix}preview/`;
        if (type.startsWith("text/html")) {
          const html = rebaseHtml(body.toString("utf8"), mount);
          body = Buffer.from(/<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, (tag) => `${tag}${REGISTRY}`) : `${REGISTRY}${html}`);
        } else if (type.startsWith("text/css")) {
          body = Buffer.from(rebaseCss(body.toString("utf8"), mount));
        }
        return status(res, 200, body, { "Content-Type": type });
      }
      return status(res, 404, "not found");
    } catch (error) {
      const code = ["VALUE_INVALID", "VALUE_UNKNOWN"].includes(error.code) ? 400 : 500;
      return json(res, code, errorBody(error));
    }
  }

  const server = http.createServer((req, res) => {
    handle(req, res, server.address().port).catch((error) => json(res, 500, errorBody(error)));
  });

  function touch() {
    if (idle) clearTimeout(idle);
    idle = setTimeout(() => { close(); }, idleMs);
  }

  function close() {
    if (idle) clearTimeout(idle);
    return new Promise((resolve) => {
      server.close(() => { resolveClosed(); resolve(); });
      server.closeAllConnections?.();
    });
  }

  return new Promise((resolve, reject) => {
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        try { fail("tunables", `port ${options.port} is already in use. Fix: pass another --port, or omit it to take a free one`, { code: "PORT_IN_USE" }); } catch (inUse) { reject(inUse); }
      } else {
        reject(error);
      }
    });
    server.listen(options.port ?? 0, "127.0.0.1", () => {
      const { port } = server.address();
      touch();
      resolve({
        port,
        token,
        url: `http://127.0.0.1:${port}/${token}/`,
        previewUrl: `http://127.0.0.1:${port}/${token}/preview/`,
        close,
        closed,
        // In-process draft control for the probe, which varies a value without writing it.
        setDraft(values) {
          const loaded = tunables.readTunables(base);
          tunables.assertDocument(loaded.doc);
          draft = values === null ? null : parseValues(loaded.doc, values);
        },
      });
    });
  });
}

module.exports = { DEFAULT_IDLE_MINUTES, MAX_BODY, previewFile, rebaseCss, rebaseHtml, startPanel };
