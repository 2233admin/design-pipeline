"use strict";

// The two largest upstream bundles (MengTo skills, iart motion skills) are not packaged: their
// manifests are, and `designer-pipeline sources fetch` downloads every file at the pinned revision
// from raw.githubusercontent.com, checks it against the manifest's Git blob id and size, and moves
// the complete tree into a per-user cache. Pattern: Playwright browsers and the HyperFrames headless
// shell (download once into a user cache, overridable by an environment variable). Node built-ins
// and global fetch only. See openspec/changes/archive/2026-10-15-fetch-vendor-on-demand.
//
// A partial bundle (the design direction library) ships its text in the package and fetches only the
// binaries listed in `manifest.fetched`, with the same download, size, blob id and SHA-256 checks.
// Its fetch id is `manifest.bundle`; it is found by manifest schema, so this file names no upstream.

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { storedPath } = require("./upstream-path.cjs");

const VENDOR = path.resolve(__dirname, "../vendor");
const RAW = "https://raw.githubusercontent.com";
const GITHUB_REPOSITORY = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/;

function repoOf(repository) {
  const match = GITHUB_REPOSITORY.exec(String(repository));
  if (!match) throw new Error(`unsupported repository ${repository}`);
  return `${match[1]}/${match[2]}`;
}

const PARTIAL_SCHEMA = "design-pipeline.direction-library-source.v1";

// Bundle -> every manifest object with the repository, revision and in-repository path it comes from.
// `directory` is the folder under skill/vendor; `partial` bundles ship their text and fetch `manifest.fetched`.
const FETCHABLE = {
  "mengto-skills": {
    directory: "mengto-skills",
    items: (manifest) => manifest.snapshot.objects.map((object) => ({ object, repo: repoOf(manifest.source.repository), revision: manifest.source.revision, file: object.path })),
  },
  "iart-motion-skills": {
    directory: "iart-motion-skills",
    items: (manifest) => {
      const packs = new Map(manifest.packs.map((pack) => [pack.id, pack]));
      return manifest.snapshot.objects.map((object) => {
        const [id, ...rest] = object.path.split("/");
        const pack = packs.get(id);
        if (!pack || !rest.length) throw new Error(`object ${object.path} belongs to no recorded pack`);
        return { object, repo: repoOf(pack.repository), revision: pack.revision, file: rest.join("/") };
      });
    },
  },
};

// Partial bundles under a vendor directory: any folder whose manifest.json starts with the partial schema.
function partialBundles(vendorDirectory = VENDOR) {
  if (!fs.existsSync(vendorDirectory)) return [];
  const found = [];
  for (const entry of fs.readdirSync(vendorDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestFile = path.join(vendorDirectory, entry.name, "manifest.json");
    if (!fs.existsSync(manifestFile)) continue;
    const descriptor = fs.openSync(manifestFile, "r");
    const head = Buffer.alloc(256);
    const read = fs.readSync(descriptor, head, 0, head.length, 0);
    fs.closeSync(descriptor);
    if (!head.subarray(0, read).toString("utf8").includes(PARTIAL_SCHEMA)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    if (!/^[a-z][a-z0-9-]*$/.test(manifest.bundle || "")) throw new Error(`${manifestFile} needs a lowercase bundle id`);
    found.push({ bundle: manifest.bundle, directory: entry.name, manifestFile });
  }
  return found;
}
for (const { bundle, directory } of partialBundles()) {
  FETCHABLE[bundle] = {
    directory,
    partial: true,
    items: (manifest) => manifest.fetched.objects.map((object) => ({ object, repo: repoOf(manifest.source.repository), revision: manifest.source.revision, file: object.path })),
  };
}
const BUNDLES = Object.keys(FETCHABLE);
// Bundles whose whole upstream tree is absent from the package.
const WHOLE_BUNDLES = BUNDLES.filter((bundle) => !FETCHABLE[bundle].partial);

function cacheRoot({ env = process.env, platform = process.platform, home = os.homedir() } = {}) {
  if (env.DESIGN_PIPELINE_CACHE) return path.resolve(env.DESIGN_PIPELINE_CACHE);
  if (platform === "win32") return path.join(env.LOCALAPPDATA || path.join(home, "AppData", "Local"), "design-pipeline", "Cache");
  if (platform === "darwin") return path.join(home, "Library", "Caches", "design-pipeline");
  return path.join(env.XDG_CACHE_HOME || path.join(home, ".cache"), "design-pipeline");
}

const fetchCommand = (bundle) => `designer-pipeline sources fetch --bundle ${bundle}`;

// Where a bundle's upstream tree lives: beside its manifest when present (the repository), else for
// a fetchable bundle the cache entry keyed by the manifest's tree hash, so a manifest update needs
// a new fetch. `source` is "bundled" or "cache"; `fetch` names the command for a missing cache entry.
function upstreamRoot(manifestFile, manifest, options = {}) {
  if (manifest.fetched) {
    // Partial bundle: the shipped text sits beside the manifest; the fetched part only lives in the cache.
    const bundle = manifest.bundle;
    return { root: path.join(cacheRoot(options), "vendor", bundle, manifest.fetched.treeSha256, manifest.fetched.root), source: "cache", bundle, fetch: fetchCommand(bundle) };
  }
  const beside = path.join(path.dirname(path.resolve(manifestFile)), manifest.snapshot.root);
  const bundle = path.basename(path.dirname(path.resolve(manifestFile)));
  if (fs.existsSync(beside) || !FETCHABLE[bundle]) return { root: beside, source: "bundled", bundle };
  return { root: path.join(cacheRoot(options), "vendor", bundle, manifest.snapshot.treeSha256, manifest.snapshot.root), source: "cache", bundle, fetch: fetchCommand(bundle) };
}

const gitBlobId = (content) => crypto.createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");

// Downloads one bundle into the cache. Every file must match the manifest before anything is moved
// into place; a failure removes the partial directory. Returns where the tree is.
async function fetchBundle(bundle, { manifestFile = path.join(VENDOR, FETCHABLE[bundle]?.directory ?? bundle, "manifest.json"), fetch = globalThis.fetch, concurrency = 8, ...options } = {}) {
  if (!FETCHABLE[bundle]) throw Object.assign(new Error(`${bundle} is not downloaded on demand; fetchable bundles: ${BUNDLES.join(", ")}`), { code: "UNKNOWN_BUNDLE" });
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const where = upstreamRoot(manifestFile, manifest, options);
  const tree = manifest.fetched || manifest.snapshot;
  if (fs.existsSync(where.root)) return { bundle, status: "present", source: where.source, root: where.root, files: tree.fileCount };
  const entry = path.dirname(where.root);
  fs.mkdirSync(path.dirname(entry), { recursive: true });
  const partial = fs.mkdtempSync(path.join(path.dirname(entry), ".partial-"));
  try {
    const items = FETCHABLE[bundle].items(manifest);
    // The first failure stops every worker; cleanup waits until all of them have returned, so no
    // in-flight download writes into the partial directory after it is removed.
    let next = 0;
    let failure = null;
    const worker = async () => {
      while (!failure && next < items.length) {
        const { object, repo, revision, file } = items[next++];
        const url = `${RAW}/${repo}/${revision}/${file.split("/").map(encodeURIComponent).join("/")}`;
        const response = await fetch(url);
        if (!response.ok) throw Object.assign(new Error(`download failed (${response.status}): ${url}`), { code: "FETCH_FAILED" });
        const content = Buffer.from(await response.arrayBuffer());
        if (content.length !== object.size || gitBlobId(content) !== object.oid) {
          throw Object.assign(new Error(`downloaded ${object.path} does not match the manifest (size or Git blob id)`), { code: "SOURCE_CHANGED" });
        }
        if (object.sha256 && crypto.createHash("sha256").update(content).digest("hex") !== object.sha256) {
          throw Object.assign(new Error(`downloaded ${object.path} does not match the manifest (SHA-256)`), { code: "SOURCE_CHANGED" });
        }
        const target = path.join(partial, tree.root, ...storedPath(object.path).split("/"));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content, { mode: object.mode === "100755" ? 0o755 : 0o644 });
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker().catch((error) => { failure ||= error; })));
    if (failure) throw failure;
    try { fs.renameSync(partial, entry); }
    catch (error) {
      // Another fetch finished first: keep its complete copy.
      if (!fs.existsSync(where.root)) throw error;
      fs.rmSync(partial, { recursive: true, force: true });
    }
    return { bundle, status: "fetched", source: "cache", root: where.root, files: items.length };
  } catch (error) {
    fs.rmSync(partial, { recursive: true, force: true });
    throw error;
  }
}

module.exports = { BUNDLES, WHOLE_BUNDLES, cacheRoot, fetchBundle, fetchCommand, partialBundles, upstreamRoot };
