"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, fail, isObject, resolveInside, sha256, sortValue } = require("./contract-utils.cjs");

const SCHEMA = "design-pipeline.designmd-catalog.v1";
const VERSION = "1";
const DEFAULT_SOURCE = "https://designmd.directory";
const KINDS = Object.freeze(["skill", "template", "example", "guide", "tool"]);
const HUB_PATHS = Object.freeze(["/skills", "/skills/install", "/templates", "/library", "/guides", "/tools", "/cli"]);
const DISCOVERY_PATHS = Object.freeze(["/sitemap.xml", "/llms.txt", "/llms-full.txt"]);
const MAX_PAGES = 500;
const MAX_CONCURRENCY = 8;
const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 20_000;
const MAX_RETRIES = 3;
const MAX_REDIRECTS = 5;
const ENTRY_STATUSES = Object.freeze(["reference-only", "review-required", "blocked", "invalid"]);
const ENVELOPE_STATUSES = Object.freeze(["ready", "partial", "blocked", "invalid", "recovered"]);
const SENSITIVE_QUERY = /token|password|secret|apikey|api[_-]?key|access[_-]?token|credential/i;
const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "metadata.google.com"]);
const EXEC_MARKERS = [
  /\bnpx\s+/i,
  /\bnpm\s+(?:install|i|exec)\b/i,
  /\bcurl\b[^\n]*\|\s*(?:sh|bash)/i,
  /\bpowershell\b/i,
  /\bchild_process\b/,
  /\beval\s*\(/,
  /\brm\s+-rf\b/,
];
const NEXT_ACTIONS = Object.freeze({
  ready: "none",
  partial: "review URL errors and re-sync",
  blocked: "fix the source URL or network and re-sync",
  recovered: "review failed URLs; last-known-good snapshot retained",
  invalid: "repair catalog paths or content hashes",
});

function invalid(message, code = "CONTRACT_INVALID") {
  fail("designmd", message, { code });
}

function plainObject(value, label) {
  if (!isObject(value)) invalid(`${label} must be an object`);
}

function exitCodeForStatus(status) {
  if (status === "ready") return 0;
  if (status === "invalid") return 1;
  return 2;
}

function isBlockedIp(hostname) {
  const lower = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (lower === "::1" || lower === "0.0.0.0" || lower === "::") return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const ip = mapped ? mapped[1] : lower;
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 127 || a === 10 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function assertPublicHttpUrl(raw, base) {
  let url;
  try { url = new URL(raw, base); } catch { return { ok: false, reason: "invalid-url" }; }
  if (!["http:", "https:"].includes(url.protocol)) return { ok: false, reason: "invalid-protocol" };
  if (url.username || url.password) return { ok: false, reason: "userinfo-rejected" };
  if ([...url.searchParams.keys()].some((key) => SENSITIVE_QUERY.test(key))) {
    return { ok: false, reason: "sensitive-query-rejected" };
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".localhost") || isBlockedIp(host)) {
    return { ok: false, reason: "private-target-rejected" };
  }
  url.hash = "";
  return { ok: true, url: url.toString().replace(/\/$/, "") || url.origin };
}

function normalizeUrl(raw, base = DEFAULT_SOURCE) {
  return assertPublicHttpUrl(raw, base).ok ? assertPublicHttpUrl(raw, base).url : null;
}

function sameOrigin(url, source) {
  try { return new URL(url).origin === new URL(source).origin; } catch { return false; }
}

function classifyUrl(raw, source = DEFAULT_SOURCE) {
  const url = normalizeUrl(raw, source);
  if (!url || !sameOrigin(url, source)) return null;
  const pathname = new URL(url).pathname.replace(/\/$/, "");
  if (pathname === "/skills/install") return null;
  if (pathname === "/tools" || pathname === "/cli") return "tool";
  if (/^\/skills\/[^/]+$/.test(pathname)) return "skill";
  if (/^\/t\/[^/]+$/.test(pathname)) return "template";
  if (/^\/p\/[^/]+$/.test(pathname)) return "example";
  if (/^\/guides\/[^/]+$/.test(pathname)) return "guide";
  if (/^\/(?:tools|cli)\/[^/]+$/.test(pathname)) return "tool";
  return null;
}

function slugFromUrl(url) {
  return new URL(url).pathname.split("/").filter(Boolean).at(-1) || "home";
}

function htmlText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/h[1-6]>|<\/li>|<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function firstMatch(source, expression) {
  return source.match(expression)?.[1]?.trim() || null;
}

function extractLinks(html, base) {
  const links = new Set();
  for (const match of String(html).matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    const url = normalizeUrl(match[1], base);
    if (url) links.add(url);
  }
  return [...links].sort();
}

function extractTextLinks(text, base) {
  const links = new Set();
  for (const match of String(text).matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const url = normalizeUrl(match[0].replace(/[),.;]+$/, ""), base);
    if (url) links.add(url);
  }
  for (const match of String(text).matchAll(/^\s*(\/[^\s#]+)/gm)) {
    const url = normalizeUrl(match[1], base);
    if (url) links.add(url);
  }
  return [...links].sort();
}

function extractSitemapLocs(xml, base) {
  const links = new Set();
  for (const match of String(xml).matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
    const url = normalizeUrl(match[1].trim(), base);
    if (url) links.add(url);
  }
  return [...links].sort();
}

function extractSources(html, base) {
  return extractLinks(html, base).filter((url) => {
    const host = new URL(url).hostname;
    return host === "github.com" || host === "gitlab.com" || host === "npmjs.com" || host === "www.npmjs.com";
  });
}

function extractLicense(text) {
  const match = text.match(/\b(MIT|Apache[- ]2\.0|Apache 2\.0|ISC|BSD[- ]?[234]?-Clause|MPL[- ]2\.0|GPL[- ]?[23](?:\.0)?|CC BY(?:[- ]SA)?|Proprietary)\b/i);
  return match ? match[1].replace(/ /g, "-") : "unknown";
}

function parseRobots(text) {
  const disallows = [];
  let applies = false;
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.replace(/#.*$/, "").trim();
    const ua = trimmed.match(/^user-agent:\s*(.*)$/i);
    if (ua) {
      applies = ua[1].trim() === "*";
      continue;
    }
    const dis = trimmed.match(/^disallow:\s*(.*)$/i);
    if (applies && dis) disallows.push(dis[1].trim());
  }
  return disallows;
}

function robotsAllows(disallows, url) {
  const pathname = new URL(url).pathname;
  return !disallows.some((rule) => rule !== "" && pathname.startsWith(rule));
}

function admissionFor(content) {
  return EXEC_MARKERS.some((rule) => rule.test(content)) ? "review-required" : "reference-only";
}

function fetchError(url, code, message, retries = 0) {
  return sortValue({
    url,
    code,
    message,
    retries,
    nextAction: NEXT_ACTIONS.partial,
  });
}

function extractEntry(url, html, source = DEFAULT_SOURCE, options = {}) {
  const kind = classifyUrl(url, source);
  if (!kind) return null;
  const text = htmlText(html);
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || slugFromUrl(url);
  const content = (text || title).slice(0, 100_000);
  const description = firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || content.slice(0, 240);
  const contentHash = sha256(content);
  const provenance = sortValue({
    sourceUrl: url,
    discovery: options.discovery || "html",
    ...(options.now ? { fetchedAt: options.now } : {}),
    revision: contentHash,
  });
  return sortValue({
    id: `designmd:${kind}:${slugFromUrl(url)}`,
    kind,
    slug: slugFromUrl(url),
    title: title.replace(/\s+/g, " "),
    description: description.replace(/\s+/g, " "),
    url,
    sourceUrls: extractSources(html, url),
    license: extractLicense(text),
    status: admissionFor(content),
    content,
    contentSha256: contentHash,
    provenance,
  });
}

function validateEntry(entry, index = 0) {
  plainObject(entry, `entries[${index}]`);
  for (const key of ["id", "kind", "slug", "title", "description", "url", "license", "status", "contentSha256"]) {
    if (typeof entry[key] !== "string" || !entry[key].trim()) invalid(`entries[${index}].${key} must be a non-empty string`);
  }
  if (!KINDS.includes(entry.kind)) invalid(`entries[${index}].kind is invalid`);
  if (!ENTRY_STATUSES.includes(entry.status)) invalid(`entries[${index}].status is invalid`);
  if (!/^https?:\/\//.test(entry.url)) invalid(`entries[${index}].url must be an http(s) URL`);
  if (!Array.isArray(entry.sourceUrls) || !entry.sourceUrls.every((value) => typeof value === "string")) {
    invalid(`entries[${index}].sourceUrls must be strings`);
  }
  if (!/^[a-f0-9]{64}$/.test(entry.contentSha256)) invalid(`entries[${index}].contentSha256 must be SHA-256`);
  plainObject(entry.provenance, `entries[${index}].provenance`);
  if (typeof entry.provenance.sourceUrl !== "string" || !entry.provenance.sourceUrl.trim()) {
    invalid(`entries[${index}].provenance.sourceUrl must be a non-empty string`);
  }
  if (entry.content !== undefined) {
    if (typeof entry.content !== "string" || !entry.content.trim()) invalid(`entries[${index}].content must be a non-empty string`);
    if (sha256(entry.content) !== entry.contentSha256) invalid(`entries[${index}].contentSha256 does not match content`);
  } else if (typeof entry.contentPath !== "string" || !entry.contentPath.trim() || path.isAbsolute(entry.contentPath)) {
    invalid(`entries[${index}].contentPath must be a project-relative path`);
  }
}

function validateCatalog(catalog) {
  plainObject(catalog, "catalog");
  if (catalog.schema !== SCHEMA || catalog.version !== VERSION) invalid("unsupported catalog schema or version");
  if (typeof catalog.source !== "string" || !/^https?:\/\//.test(catalog.source)) invalid("catalog.source must be an http(s) URL");
  if (!Array.isArray(catalog.entries)) invalid("catalog.entries must be an array");
  if (!Array.isArray(catalog.errors)) invalid("catalog.errors must be an array");
  const ids = new Set();
  for (const [index, entry] of catalog.entries.entries()) {
    validateEntry(entry, index);
    if (ids.has(entry.id)) invalid(`duplicate entry ${entry.id}`);
    ids.add(entry.id);
  }
  return catalog;
}

function snapshotIdentity(catalog) {
  return {
    source: catalog.source,
    entries: (catalog.entries || []).map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      url: entry.url,
      license: entry.license,
      status: entry.status,
      contentSha256: entry.contentSha256,
      provenance: entry.provenance || null,
    })).sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function snapshotHash(catalog) {
  return sha256(canonicalJson(snapshotIdentity(catalog)));
}

function diffCatalogs(previous, current) {
  const previousEntries = previous?.entries || [];
  const prevMap = new Map(previousEntries.map((entry) => [entry.id, entry]));
  const currMap = new Map((current.entries || []).map((entry) => [entry.id, entry]));
  const failedUrls = [...new Set((current.errors || []).map((entry) => entry.url))].sort();
  const failed = new Set(failedUrls);
  const added = [];
  const changed = [];
  const disappeared = [];
  const stale = [];
  for (const [id, entry] of currMap) {
    const prior = prevMap.get(id);
    if (!prior) {
      added.push(id);
      continue;
    }
    if (prior.contentSha256 !== entry.contentSha256 || prior.license !== entry.license || prior.url !== entry.url || prior.status !== entry.status) {
      changed.push(id);
    }
  }
  for (const [id, entry] of prevMap) {
    if (currMap.has(id)) continue;
    if (failed.has(entry.url)) stale.push(id);
    else disappeared.push(id);
  }
  return sortValue({
    previousSnapshotHash: previous ? snapshotHash(previous) : null,
    currentSnapshotHash: snapshotHash(current),
    added: added.sort(),
    changed: changed.sort(),
    disappeared: disappeared.sort(),
    failed: failedUrls,
    stale: stale.sort(),
  });
}

function catalogStatus(catalog, options = {}) {
  if (options.preserved) return "recovered";
  if (options.invalid) return "invalid";
  if (!(catalog.entries || []).length && (catalog.errors || []).length) return "blocked";
  if ((catalog.errors || []).length) return "partial";
  if (!(catalog.entries || []).length) return "blocked";
  return "ready";
}

function searchCatalog(catalog, options = {}) {
  validateCatalog(catalog);
  const query = String(options.query || "").trim().toLowerCase();
  const kind = options.kind || null;
  if (kind && !KINDS.includes(kind)) invalid(`unknown kind ${kind}`);
  const limit = options.limit === undefined ? 20 : Number(options.limit);
  if (!Number.isInteger(limit) || limit < 1) invalid("limit must be a positive integer");
  return catalog.entries.filter((entry) => {
    if (kind && entry.kind !== kind) return false;
    return !query || canonicalJson(entry).toLowerCase().includes(query);
  }).slice(0, limit);
}

async function fetchText(url, options = {}) {
  const timeoutMs = options.timeoutMs || TIMEOUT_MS;
  const source = options.source || url;
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const checked = assertPublicHttpUrl(current, source);
    if (!checked.ok) throw Object.assign(new Error(checked.reason), { code: checked.reason, retries: 0 });
    if (!sameOrigin(checked.url, source)) throw Object.assign(new Error("redirect-origin-mismatch"), { code: "redirect-origin-mismatch", retries: 0 });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
        const response = await fetch(checked.url, {
          redirect: "manual",
          signal: controller.signal,
          headers: { accept: "text/html,text/plain,application/xml;q=0.9" },
        });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("location");
          if (!location) throw Object.assign(new Error("redirect-missing-location"), { code: "redirect-missing-location", retries: attempt });
          current = location;
          break;
        }
        if (response.ok) {
          const bytes = Buffer.from(await response.arrayBuffer());
          if (bytes.length > MAX_BYTES) throw Object.assign(new Error("response-too-large"), { code: "response-too-large", retries: attempt });
          return bytes.toString("utf8");
        }
        if (response.status < 500 || attempt === MAX_RETRIES - 1) {
          throw Object.assign(new Error(`HTTP ${response.status}`), { code: "http-error", retries: attempt + 1 });
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw Object.assign(new Error("too-many-redirects"), { code: "too-many-redirects", retries: 0 });
}

function emptyCatalog(source, errors) {
  return sortValue({
    schema: SCHEMA,
    version: VERSION,
    source,
    fetchedPages: 0,
    errors,
    entries: [],
    status: catalogStatus({ entries: [], errors }),
  });
}

async function syncDesignMd(options = {}) {
  const checkedSource = assertPublicHttpUrl(options.source || DEFAULT_SOURCE);
  if (!checkedSource.ok) {
    return emptyCatalog(String(options.source || DEFAULT_SOURCE), [
      fetchError(String(options.source || DEFAULT_SOURCE), checkedSource.reason, checkedSource.reason),
    ]);
  }
  const source = checkedSource.url;
  const fetcher = options.fetcher || ((url) => fetchText(url, { source, timeoutMs: options.timeoutMs }));
  const maxPages = options.maxPages || MAX_PAGES;
  const concurrency = Math.min(Math.max(Number(options.concurrency || MAX_CONCURRENCY), 1), 16);
  const queue = new Set([source, ...HUB_PATHS.map((item) => normalizeUrl(item, source)).filter(Boolean), ...DISCOVERY_PATHS.map((item) => normalizeUrl(item, source)).filter(Boolean)]);
  const seen = new Set();
  const entries = [];
  const entryIds = new Map();
  const errors = [];
  const discoveryOf = new Map();
  let robotsDisallows = [];
  const robotsUrl = normalizeUrl("/robots.txt", source);
  if (robotsUrl) {
    try {
      const robots = await fetcher(robotsUrl);
      if (robots) robotsDisallows = parseRobots(robots);
    } catch (error) {
      errors.push(fetchError(robotsUrl, error.code || "robots-unavailable", error.message, error.retries || 0));
    }
  }

  async function read(url) {
    const body = await fetcher(url);
    if (typeof body === "string" && Buffer.byteLength(body) > MAX_BYTES) {
      throw Object.assign(new Error("response-too-large"), { code: "response-too-large", retries: 0 });
    }
    return body;
  }

  while (queue.size && seen.size < maxPages) {
    const batch = [];
    while (queue.size && batch.length < concurrency && seen.size + batch.length < maxPages) {
      const url = queue.values().next().value;
      queue.delete(url);
      if (!seen.has(url)) {
        seen.add(url);
        batch.push(url);
      }
    }
    const results = await Promise.all(batch.map(async (url) => {
      if (!robotsAllows(robotsDisallows, url)) {
        return { url, error: Object.assign(new Error("robots-disallowed"), { code: "robots-disallowed", retries: 0 }) };
      }
      try { return { url, html: await read(url) }; } catch (error) { return { url, error }; }
    }));
    for (const { url, html, error } of results) {
      if (error) {
        errors.push(fetchError(url, error.code || "http-error", error.message, error.retries || 0));
        continue;
      }
      const pathname = new URL(url).pathname;
      let discovery = discoveryOf.get(url) || "html";
      if (pathname.endsWith("/sitemap.xml") || /<urlset[\s>]|<loc>/i.test(html)) {
        discovery = "sitemap";
        for (const link of extractSitemapLocs(html, url)) {
          discoveryOf.set(link, "sitemap");
          if (sameOrigin(link, source) && (classifyUrl(link, source) || HUB_PATHS.includes(new URL(link).pathname.replace(/\/$/, "")))) queue.add(link);
        }
      }
      if (pathname.endsWith("/llms.txt") || pathname.endsWith("/llms-full.txt")) {
        discovery = pathname.endsWith("/llms-full.txt") ? "llms-full" : "llms";
      }
      const entry = extractEntry(url, html, source, { discovery, now: options.now });
      if (entry) {
        const existing = entryIds.get(entry.id);
        if (!existing) {
          entryIds.set(entry.id, entry.url);
          entries.push(entry);
        } else if (existing !== entry.url) {
          errors.push(fetchError(url, "id-collision", `duplicate id ${entry.id} for ${existing}`, 0));
        }
      }
      for (const link of [...extractLinks(html, url), ...extractTextLinks(html, url), ...extractSitemapLocs(html, url)]) {
        if (sameOrigin(link, source) && (classifyUrl(link, source) || HUB_PATHS.includes(new URL(link).pathname.replace(/\/$/, "")) || DISCOVERY_PATHS.includes(new URL(link).pathname))) {
          if (!discoveryOf.has(link)) discoveryOf.set(link, discovery);
          queue.add(link);
        }
      }
    }
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  const catalog = sortValue({
    schema: SCHEMA,
    version: VERSION,
    source,
    fetchedPages: seen.size,
    errors,
    entries,
  });
  catalog.status = catalogStatus(catalog);
  if (catalog.entries.length) validateCatalog(catalog);
  return catalog;
}

function persistableEntries(catalog, contentRoot) {
  return catalog.entries.map((entry) => {
    const directory = path.join(contentRoot, entry.kind);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, `${entry.slug}.md`), `${entry.content}\n`);
    const { content, ...rest } = entry;
    return { ...rest, contentPath: `content/${entry.kind}/${entry.slug}.md` };
  });
}

function writeCatalog(catalog, outputRoot) {
  if (catalog.entries.length) validateCatalog(catalog);
  const targetRoot = path.resolve(outputRoot);
  const parentRoot = path.dirname(targetRoot);
  const temporaryRoot = `${targetRoot}.tmp-${process.pid}`;
  const backupRoot = `${targetRoot}.backup-${process.pid}`;
  const existingCatalog = path.join(targetRoot, "designmd-catalog.json");
  let previous = null;
  if (fs.existsSync(existingCatalog)) {
    try { previous = readPersistedCatalog(existingCatalog); } catch { previous = null; }
  }
  const previousHash = previous ? snapshotHash(previous) : null;
  if (catalog.errors.length && previous) {
    return sortValue({
      status: "recovered",
      outputRoot: targetRoot,
      catalogPath: existingCatalog,
      entries: previous.entries.length,
      pages: catalog.fetchedPages,
      errors: catalog.errors,
      published: false,
      preserved: true,
      previousSnapshotHash: previousHash,
      snapshotHash: previousHash,
      diff: diffCatalogs(previous, catalog),
      nextAction: NEXT_ACTIONS.recovered,
    });
  }
  if (!catalog.entries.length) {
    return sortValue({
      status: "blocked",
      outputRoot: targetRoot,
      catalogPath: fs.existsSync(existingCatalog) ? existingCatalog : null,
      entries: 0,
      pages: catalog.fetchedPages,
      errors: catalog.errors,
      published: false,
      preserved: Boolean(previous),
      previousSnapshotHash: previousHash,
      snapshotHash: previousHash,
      diff: diffCatalogs(previous, catalog),
      nextAction: NEXT_ACTIONS.blocked,
    });
  }
  fs.mkdirSync(parentRoot, { recursive: true });
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const contentRoot = path.join(temporaryRoot, "content");
  const persistedEntries = persistableEntries(catalog, contentRoot);
  const persisted = sortValue({
    ...catalog,
    entries: persistedEntries,
    snapshotHash: snapshotHash({ ...catalog, entries: persistedEntries }),
    previousSnapshotHash: previousHash,
    diff: diffCatalogs(previous, { ...catalog, entries: persistedEntries }),
    status: catalogStatus({ ...catalog, entries: persistedEntries }),
  });
  fs.writeFileSync(path.join(temporaryRoot, "designmd-catalog.json"), canonicalJson(persisted));
  let backedUp = false;
  try {
    if (fs.existsSync(targetRoot)) {
      fs.rmSync(backupRoot, { recursive: true, force: true });
      fs.renameSync(targetRoot, backupRoot);
      backedUp = true;
    }
    fs.renameSync(temporaryRoot, targetRoot);
    if (backedUp) fs.rmSync(backupRoot, { recursive: true, force: true });
  } catch (error) {
    if (fs.existsSync(targetRoot)) fs.rmSync(targetRoot, { recursive: true, force: true });
    if (backedUp && fs.existsSync(backupRoot)) fs.renameSync(backupRoot, targetRoot);
    throw error;
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
    if (!backedUp) fs.rmSync(backupRoot, { recursive: true, force: true });
  }
  return sortValue({
    status: persisted.status,
    outputRoot: targetRoot,
    catalogPath: path.join(targetRoot, "designmd-catalog.json"),
    entries: persisted.entries.length,
    pages: persisted.fetchedPages,
    errors: persisted.errors,
    published: true,
    preserved: false,
    previousSnapshotHash: previousHash,
    snapshotHash: persisted.snapshotHash,
    diff: persisted.diff,
    nextAction: NEXT_ACTIONS[persisted.status],
  });
}

function readPersistedCatalog(file) {
  const catalog = JSON.parse(fs.readFileSync(file, "utf8"));
  const root = path.dirname(file);
  for (const [index, entry] of (catalog.entries || []).entries()) {
    if (entry.content !== undefined) continue;
    if (typeof entry.contentPath !== "string" || !entry.contentPath.trim() || path.isAbsolute(entry.contentPath)) {
      invalid(`entries[${index}].contentPath must be a project-relative path`);
    }
    const tentative = path.resolve(root, entry.contentPath);
    const relative = path.relative(root, tentative);
    if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`)) {
      invalid(`entries[${index}].contentPath escapes the catalog root`);
    }
    const contentPath = resolveInside(root, entry.contentPath, `entries[${index}].contentPath`, { scope: "designmd", mustExist: true });
    const stat = fs.lstatSync(contentPath);
    if (stat.isDirectory() || stat.isSocket?.() || stat.isFIFO?.()) {
      invalid(`entries[${index}].contentPath must be a regular file`);
    }
    if (!stat.isFile() && !stat.isSymbolicLink()) invalid(`entries[${index}].contentPath must be a regular file`);
    entry.content = fs.readFileSync(contentPath, "utf8").trimEnd();
  }
  return validateCatalog(catalog);
}

function verifyPersistedCatalog(file) {
  try {
    const catalog = readPersistedCatalog(file);
    const status = catalogStatus(catalog);
    return {
      status,
      catalog,
      source: catalog.source,
      entries: catalog.entries.length,
      pages: catalog.fetchedPages,
      errors: catalog.errors,
      snapshotHash: catalog.snapshotHash || snapshotHash(catalog),
      previousSnapshotHash: catalog.previousSnapshotHash || null,
      nextAction: NEXT_ACTIONS[status],
    };
  } catch (error) {
    return {
      status: "invalid",
      message: error.message,
      code: error.code || "CONTRACT_INVALID",
      nextAction: NEXT_ACTIONS.invalid,
    };
  }
}

function admitEntry(entry) {
  if (!entry || ["blocked", "invalid"].includes(entry.status)) return false;
  if (entry.status === "review-required") return false;
  return false;
}

module.exports = {
  DEFAULT_SOURCE,
  DISCOVERY_PATHS,
  ENVELOPE_STATUSES,
  ENTRY_STATUSES,
  KINDS,
  MAX_BYTES,
  MAX_PAGES,
  SCHEMA,
  admitEntry,
  assertPublicHttpUrl,
  catalogStatus,
  diffCatalogs,
  exitCodeForStatus,
  extractEntry,
  readPersistedCatalog,
  searchCatalog,
  snapshotHash,
  syncDesignMd,
  validateCatalog,
  verifyPersistedCatalog,
  writeCatalog,
};
