"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, fail, isObject, sha256, sortValue } = require("./contract-utils.cjs");

const SCHEMA = "design-pipeline.designmd-catalog.v1";
const VERSION = "1";
const DEFAULT_SOURCE = "https://designmd.directory";
const KINDS = Object.freeze(["skill", "template", "example", "guide", "tool"]);
const HUB_PATHS = Object.freeze(["/skills", "/skills/install", "/templates", "/library", "/guides", "/tools", "/cli"]);
const DISCOVERY_PATHS = Object.freeze(["/sitemap.xml", "/llms.txt", "/llms-full.txt"]);

function invalid(message) {
  fail("designmd", message);
}

function plainObject(value, label) {
  if (!isObject(value)) invalid(`${label} must be an object`);
}

function normalizeUrl(raw, base = DEFAULT_SOURCE) {
  let url;
  try { url = new URL(raw, base); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  url.hash = "";
  return url.toString().replace(/\/$/, "") || url.origin;
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
  for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    const url = normalizeUrl(match[1], base);
    if (url) links.add(url);
  }
  return [...links].sort();
}

function extractTextLinks(text, base) {
  const links = new Set();
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const url = normalizeUrl(match[0].replace(/[),.;]+$/, ""), base);
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

function extractEntry(url, html, source = DEFAULT_SOURCE) {
  const kind = classifyUrl(url, source);
  if (!kind) return null;
  const text = htmlText(html);
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || slugFromUrl(url);
  const content = (text || title).slice(0, 100_000);
  const description = firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || content.slice(0, 240);
  const contentHash = sha256(content);
  return sortValue({
    id: `designmd:${kind}:${slugFromUrl(url)}`,
    kind,
    slug: slugFromUrl(url),
    title: title.replace(/\s+/g, " "),
    description: description.replace(/\s+/g, " "),
    url,
    sourceUrls: extractSources(html, url),
    license: extractLicense(text),
    status: "reference-only",
    content,
    contentSha256: contentHash,
  });
}

function validateEntry(entry, index = 0) {
  plainObject(entry, `entries[${index}]`);
  for (const key of ["id", "kind", "slug", "title", "description", "url", "license", "status", "content", "contentSha256"]) {
    if (typeof entry[key] !== "string" || !entry[key].trim()) invalid(`entries[${index}].${key} must be a non-empty string`);
  }
  if (!KINDS.includes(entry.kind)) invalid(`entries[${index}].kind is invalid`);
  if (!/^https?:\/\//.test(entry.url)) invalid(`entries[${index}].url must be an http(s) URL`);
  if (!Array.isArray(entry.sourceUrls) || !entry.sourceUrls.every((value) => typeof value === "string")) invalid(`entries[${index}].sourceUrls must be strings`);
  if (!/^[a-f0-9]{64}$/.test(entry.contentSha256)) invalid(`entries[${index}].contentSha256 must be SHA-256`);
  if (sha256(entry.content) !== entry.contentSha256) invalid(`entries[${index}].contentSha256 does not match content`);
}

function validateCatalog(catalog) {
  plainObject(catalog, "catalog");
  if (catalog.schema !== SCHEMA || catalog.version !== VERSION) invalid("unsupported catalog schema or version");
  if (typeof catalog.source !== "string" || !/^https?:\/\//.test(catalog.source)) invalid("catalog.source must be an http(s) URL");
  if (!Array.isArray(catalog.entries) || !catalog.entries.length) invalid("catalog.entries must not be empty");
  const ids = new Set();
  for (const [index, entry] of catalog.entries.entries()) {
    validateEntry(entry, index);
    if (ids.has(entry.id)) invalid(`duplicate entry ${entry.id}`);
    ids.add(entry.id);
  }
  return catalog;
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
  const timeoutMs = options.timeoutMs || 20_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(url, { signal: controller.signal, headers: { accept: "text/html,text/plain;q=0.9" } });
      if (response.ok) return await response.text();
      if (response.status < 500 || attempt === 2) throw new Error(`HTTP ${response.status}`);
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function syncDesignMd(options = {}) {
  const source = normalizeUrl(options.source || DEFAULT_SOURCE) || DEFAULT_SOURCE;
  const fetcher = options.fetcher || fetchText;
  const maxPages = options.maxPages || 500;
  const concurrency = Math.min(Math.max(Number(options.concurrency || 8), 1), 16);
  const queue = new Set([source, ...HUB_PATHS.map((item) => normalizeUrl(item, source)), ...DISCOVERY_PATHS.map((item) => normalizeUrl(item, source))]);
  const seen = new Set();
  const entries = [];
  const entryIds = new Set();
  const errors = [];
  while (queue.size && seen.size < maxPages) {
    const batch = [];
    while (queue.size && batch.length < concurrency && seen.size + batch.length < maxPages) {
      const url = queue.values().next().value;
      queue.delete(url);
      if (!seen.has(url)) { seen.add(url); batch.push(url); }
    }
    const results = await Promise.all(batch.map(async (url) => {
      try { return { url, html: await fetcher(url) }; }
      catch (error) { return { url, error }; }
    }));
    for (const { url, html, error } of results) {
      if (error) { errors.push({ url, message: error.message }); continue; }
      const entry = extractEntry(url, html, source);
      if (entry && !entryIds.has(entry.id)) { entryIds.add(entry.id); entries.push(entry); }
      for (const link of [...extractLinks(html, url), ...extractTextLinks(html, url)]) {
        if (sameOrigin(link, source) && (classifyUrl(link, source) || HUB_PATHS.includes(new URL(link).pathname.replace(/\/$/, "")))) queue.add(link);
      }
    }
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  const catalog = sortValue({ schema: SCHEMA, version: VERSION, source, fetchedPages: seen.size, errors, entries });
  return validateCatalog(catalog);
}

function writeCatalog(catalog, outputRoot) {
  validateCatalog(catalog);
  const targetRoot = path.resolve(outputRoot);
  const parentRoot = path.dirname(targetRoot);
  const temporaryRoot = `${targetRoot}.tmp-${process.pid}`;
  const backupRoot = `${targetRoot}.backup-${process.pid}`;
  const existingCatalog = path.join(targetRoot, "designmd-catalog.json");
  if (catalog.errors.length && fs.existsSync(existingCatalog)) {
    try {
      readPersistedCatalog(existingCatalog);
      return { outputRoot: targetRoot, catalogPath: existingCatalog, entries: catalog.entries.length, pages: catalog.fetchedPages, errors: catalog.errors.length, published: false, preserved: true };
    } catch {
      // Replace an invalid previous snapshot with the new atomic result.
    }
  }
  fs.mkdirSync(parentRoot, { recursive: true });
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const contentRoot = path.join(temporaryRoot, "content");
  for (const entry of catalog.entries) {
    const directory = path.join(contentRoot, entry.kind);
    fs.mkdirSync(directory, { recursive: true });
    const contentPath = path.join(directory, `${entry.slug}.md`);
    fs.writeFileSync(contentPath, `${entry.content}\n`);
  }
  const persisted = sortValue({ ...catalog, entries: catalog.entries.map(({ content, ...entry }) => ({ ...entry, contentPath: `content/${entry.kind}/${entry.slug}.md` })) });
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
  return { outputRoot: targetRoot, catalogPath: path.join(targetRoot, "designmd-catalog.json"), entries: catalog.entries.length, pages: catalog.fetchedPages, errors: catalog.errors.length, published: true, preserved: false };
}

function readPersistedCatalog(file) {
  const catalog = JSON.parse(fs.readFileSync(file, "utf8"));
  const root = path.dirname(file);
  for (const [index, entry] of (catalog.entries || []).entries()) {
    if (entry.content !== undefined) continue;
    if (typeof entry.contentPath !== "string" || !entry.contentPath.trim() || path.isAbsolute(entry.contentPath)) {
      invalid(`entries[${index}].contentPath must be a project-relative path`);
    }
    const contentPath = path.resolve(root, entry.contentPath);
    const relative = path.relative(root, contentPath);
    if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`)) {
      invalid(`entries[${index}].contentPath escapes the catalog root`);
    }
    entry.content = fs.readFileSync(contentPath, "utf8").trimEnd();
  }
  return validateCatalog(catalog);
}

module.exports = { DEFAULT_SOURCE, KINDS, SCHEMA, extractEntry, searchCatalog, syncDesignMd, validateCatalog, writeCatalog, readPersistedCatalog };
